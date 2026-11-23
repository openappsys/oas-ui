/**
 * 受限表达式轨（`reactions[].when`）——手写词法 + 递归下降 + Pratt，零第三方依赖。
 *
 * 语法（设计稿冻结，排除项一律编译期报错）：
 * - 值：`{path}` 占位（点号 + `[i]`，数组通配 `[]`）/ 字符串 / 数字 / `true` / `false` / `null` /
 *   `$self`（本字段，编译期解析为源字段路径）。
 * - 比较：`==` `!=` `>` `>=` `<` `<=`——两侧同为数字按数值比，其余按字符串比（写死）。
 * - 逻辑：`&&` `||` `!` + 括号；算术：`+` `-` `*` `/` `%`（仅数值，非数值操作数得 NaN）；
 *   成员：`in` / `contains()`。
 * - 函数库冻结 20 个：`iif(cond, a, b)` / `empty(x)` / `len(x)` / `sum(arr)` / `min(...nums)` /
 *   `max(...nums)` / `lower(s)` / `upper(s)` / `concat(...strings)` / `contains(c, x)` /
 *   `join(arr, sep)` / `split(s, sep)` / `substring(s, start, end?)` / `replace(s, from, to)` /
 *   `trim(s)` / `round(n, digits?)` / `abs(n)` / `floor(n)` / `ceil(n)` /
 *   `formatDate(ts, fmt?)` / `dateAdd(ts, n, unit)`——`contains` 为成员运算的函数形态；
 *   宿主注册同名函数时**宿主优先** + devWarn（不再静默被内置遮蔽）。
 * - 排除（编译期报错）：赋值 / 语句 / 循环 / 箭头函数 / 模板串 / 正则字面量 / 属性访问链 / 其余日期函数。
 *
 * 本文件即公开子路径入口 `@oas-ui/ui/form/schema-form/expr` 的实现（单文件链，便于独立计量）；
 * 组件内部经 `compiler/expr.ts` 转发同一份实现。
 *
 * 体积纪律：parser + evaluator 独立预算档（`form/schema-form/expr` 链，实测值见 docs/perf-baseline.md §4）。
 * 为守住预算：解析期直接产出闭包（无 AST 节点分派层）；路径占位校验在本地实现（与
 * `parseDslPath` 同判据，由 `expr.test.ts` 语料对照测试守口径），不引 `path.js` 增链。
 *
 * 求值：路径按表单数据根读取；含通配的路径返回匹配值数组（`sum({items[].price})`）。
 * 编译结果含静态依赖（`deps`）——宿主注册的函数无静态依赖面，按 `dynamic` 全量重算。
 */
import { devWarn } from '../../../shared/dev-warn.js'

export interface ExprCompileResult {
  /** 编译产物：`(context) => value` 闭包（未编译成功为 null） */
  program: ExprProgram | null
  /** 静态依赖路径（规范键，含 `[]` 通配；`$self` 已解析为源字段路径） */
  deps: string[]
  /** 使用了宿主注册函数：依赖面不可静态提取，按全量重算 */
  dynamic: boolean
  error: string | null
}

export interface ExprCompileOptions {
  /** `$self` 对应的源字段规范路径（缺省 = 不可用，编译期报错） */
  self?: string
  /** 路径存在性校验（数据 schema 面）；缺省不校验 */
  exists?: (path: string) => boolean
}

export interface ExprEvalContext {
  values: Record<string, unknown>
  /** `$self` 的当前值 */
  self?: unknown
}

export type ExprProgram = (context: ExprEvalContext) => unknown
export type ExprFunction = (...args: unknown[]) => unknown

const HOST = new Map<string, ExprFunction>()
/** 已告警过的名字（宿主遮蔽内置 / 未知日期 token）：一次性告警，避免每帧刷屏 */
const WARNED = new Set<string>()

function warnOnce(key: string, message: string): void {
  if (WARNED.has(key)) return
  WARNED.add(key)
  devWarn(message)
}

/**
 * 注册宿主函数（schema 里只出现函数名）。返回注销函数。
 * 需在设置 schema 之前注册——表达式在编译期校验函数名，未知名按语法错处理（devWarn 降级）。
 * **宿主优先**：与内置同名时宿主函数生效并 devWarn 一次（V2 修正，此前内置静默遮蔽宿主）。
 */
export function registerExprFunction(name: string, fn: ExprFunction): () => void {
  if (!/^[A-Za-z_$][\w$]*$/.test(name)) throw new Error(`registerExprFunction 函数名非法 "${name}"`)
  HOST.set(name, fn)
  if (FNS[name]) warnShadow(name)
  return () => {
    if (HOST.get(name) === fn) HOST.delete(name)
  }
}

/** 宿主遮蔽内置的告警（一次性；注册时与求值编译时都可能命中） */
function warnShadow(name: string): void {
  warnOnce(`shadow:${name}`, `[oas-schema-form] 宿主函数 "${name}" 与内置函数同名，按宿主优先（内置实现被替换）`)
}

// ---------- 词法 ----------

/** token 种类：0 数字 / 1 字符串 / 2 路径 / 3 标识符 / 4 算符 / 5 结束 */
type Token = [kind: number, value: string, num?: number]

const FORBIDDEN = ['__proto__', 'prototype', 'constructor']
const ESCAPE: Record<string, string> = { n: '\n', t: '\t', r: '\r' }
/** 单遍粘性词法：路径 / 字符串 / 数字 / 标识符 / 算符（长算符优先） */
const TOKEN =
  /\s*(?:\{((?:[^{}]|\{index\})*)\}|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\d+(?:\.\d+)?)|([A-Za-z_$][\w$]*)|(==|!=|>=|<=|&&|\|\||[()<>+\-*/%!,]))/y

/** 路径占位校验：与编译层 `parseDslPath` 同判据（`{index}` 与 `[]` 归一、保留键段拒绝） */
function pathSegments(raw: string): string[] | null {
  if (raw.trim() === '$self') return null
  const segments = raw
    .replace(/\{index\}/g, '.[]')
    .replace(/\[(\d+)\]/g, '.$1')
    .replace(/\[\s*\]/g, '.[]')
    .split('.')
    .map((segment) => segment.trim())
    .filter((segment) => segment !== '')
  return segments.length === 0 || segments.some((segment) => FORBIDDEN.includes(segment)) ? null : segments
}

/** 词法不认识的字符：按排除项给出可操作提示 */
function reject(rest: string): never {
  const c = rest.trimStart()[0]!
  if (c === '{') throw '路径占位未闭合'
  if (c === ']' || c === '[' || c === '.') throw '不支持属性访问链（用 {path}）'
  if (c === '=') throw '不支持赋值（比较请用 "=="）'
  if (c === '&' || c === '|') throw `不支持位运算（逻辑请用 "${c}${c}"）`
  if (c === '`') throw '不支持模板串'
  if (c === ';') throw '不支持语句分隔符 ";"'
  if (c === '?' || c === ':') throw '不支持三元/可选链（用 iif()）'
  if (c === '"' || c === "'") throw '字符串未闭合'
  throw `非法字符 "${c}"`
}

function unquote(raw: string): string {
  return raw.slice(1, -1).replace(/\\(.)/g, (_, ch: string) => ESCAPE[ch] ?? ch)
}

function lex(source: string): Token[] {
  const out: Token[] = []
  let at = 0
  while (at < source.length) {
    TOKEN.lastIndex = at
    const match = TOKEN.exec(source)
    if (!match) reject(source.slice(at))
    if (match[1] !== undefined) {
      const raw = match[1].trim()
      const segments = raw.replace(/\{index\}/g, '').includes('{') ? null : pathSegments(raw)
      if (segments === null) throw `路径占位非法："${raw}"`
      out.push([2, segments.join('\u0000')])
    } else if (match[2] !== undefined) out.push([1, unquote(match[2])])
    else if (match[3] !== undefined) out.push([0, match[3], Number(match[3])])
    else if (match[4] !== undefined) out.push([3, match[4]])
    else out.push([4, match[5]!])
    at = TOKEN.lastIndex
  }
  out.push([5, ''])
  return out
}

// ---------- 语法（Pratt）与解析期闭包构造 ----------

const PREC: Record<string, number> = {
  '||': 1,
  '&&': 2,
  '==': 3,
  '!=': 3,
  in: 3,
  '>': 4,
  '>=': 4,
  '<': 4,
  '<=': 4,
  '+': 5,
  '-': 5,
  '*': 6,
  '/': 6,
  '%': 6,
}

const ARITH = '+-*/%'

/** 编译表达式：语法错 / 未知字段 / 未知函数 → `error`（调用方 devWarn 并降级该条 reaction） */
export function compileExpression(source: string, options: ExprCompileOptions = {}): ExprCompileResult {
  const result: ExprCompileResult = { program: null, deps: [], dynamic: false, error: null }
  try {
    if (typeof source !== 'string' || source.trim() === '') throw '表达式为空'
    const parser = new Parser(lex(source), options)
    return { ...result, program: parser.parse(), deps: [...parser.deps], dynamic: parser.dynamic }
  } catch (error) {
    return { ...result, error: typeof error === 'string' ? error : String(error) }
  }
}

class Parser {
  private i = 0
  readonly deps = new Set<string>()
  dynamic = false

  constructor(
    private readonly tokens: Token[],
    private readonly options: ExprCompileOptions,
  ) {}

  parse(): ExprProgram {
    const program = this.binary(0)
    const rest = this.tokens[this.i]!
    if (rest[0] !== 5) throw `表达式末尾有多余内容 "${rest[1]}"`
    return program
  }

  private at(kind: number, value?: string): boolean {
    const token = this.tokens[this.i]!
    return token[0] === kind && (value === undefined || token[1] === value)
  }

  private binary(min: number): ExprProgram {
    let left = this.unary()
    for (;;) {
      const token = this.tokens[this.i]!
      const op = token[0] === 4 ? token[1] : token[0] === 3 && token[1] === 'in' ? 'in' : ''
      const prec = PREC[op]
      if (prec === undefined || prec <= min) break
      this.i += 1
      left = combine(op, left, this.binary(prec))
    }
    return left
  }

  private unary(): ExprProgram {
    if (this.at(4, '!')) {
      this.i += 1
      return negate(this.unary())
    }
    if (this.at(4, '-')) {
      this.i += 1
      const arg = this.unary()
      return (context) => -toNumber(arg(context))
    }
    return this.primary()
  }

  private primary(): ExprProgram {
    const token = this.tokens[this.i++]!
    if (token[0] === 0) return () => token[2]
    if (token[0] === 1) return () => token[1]
    if (token[0] === 2) {
      const segments = token[1].split('\u0000')
      this.addDependency(segments.join('.'))
      return (context) => readPath(context.values, segments)
    }
    if (token[0] === 5) throw '表达式不完整'
    if (token[0] === 4) {
      if (token[1] !== '(') throw `意外的符号 "${token[1]}"`
      const program = this.binary(0)
      this.expect(')')
      return program
    }
    if (token[0] !== 3) throw `意外的符号 "${token[1]}"`
    const name = token[1]
    if (name === 'true' || name === 'false') return () => name === 'true'
    if (name === 'null') return () => null
    if (name === '$self') {
      if (!this.options.self) throw '$self 在当前上下文不可用'
      this.deps.add(this.options.self)
      return (context) => context.self
    }
    if (!this.at(4, '(')) throw `未知标识符 "${name}"（字段用 {path}）`
    this.i += 1
    const args: ExprProgram[] = []
    if (!this.at(4, ')')) {
      for (;;) {
        args.push(this.binary(0))
        if (!this.at(4, ',')) break
        this.i += 1
      }
    }
    this.expect(')')
    const builtin = FNS[name]
    const host = HOST.get(name)
    if (host) {
      // 宿主优先：同名内置被宿主替换（V2 修正——此前内置优先、宿主被静默遮蔽）
      this.dynamic = true
      if (builtin) warnShadow(name)
    } else if (builtin) {
      if (args.length < builtin[0] || args.length > builtin[1]) throw `参数个数不对：${name}`
    } else {
      throw `未知函数 "${name}"`
    }
    if (!host && name === 'iif') {
      const [condition, whenTrue, whenFalse] = args
      return (context) => (truthy(condition!(context)) ? whenTrue!(context) : whenFalse!(context))
    }
    const fn = host ?? builtin![2]
    return (context) => fn(...args.map((arg) => arg(context)))
  }

  private expect(value: string): void {
    if (!this.at(4, value)) throw `缺少 "${value}"`
    this.i += 1
  }

  private addDependency(path: string): void {
    if (this.options.exists && !this.options.exists(path)) throw `未知字段 "${path}"`
    this.deps.add(path)
  }
}

/** 二元算符 → 闭包（解析期一次成型，求值期无节点分派） */
function combine(op: string, left: ExprProgram, right: ExprProgram): ExprProgram {
  if (op === '&&') return (context) => truthy(left(context)) && truthy(right(context))
  if (op === '||') return (context) => truthy(left(context)) || truthy(right(context))
  if (op === 'in') return (context) => membership(left(context), right(context))
  if (ARITH.includes(op)) {
    return (context) => {
      const a = toNumber(left(context))
      const b = toNumber(right(context))
      if (op === '+') return a + b
      if (op === '-') return a - b
      if (op === '*') return a * b
      return op === '/' ? a / b : a % b
    }
  }
  return (context) => compare(op, left(context), right(context))
}

const negate =
  (program: ExprProgram): ExprProgram =>
  (context) =>
    !truthy(program(context))

// ---------- 求值原语 ----------

const truthy = (value: unknown): boolean => !!value && value !== ''
const toNumber = (value: unknown): number => (typeof value === 'number' ? value : Number.NaN)
const asString = (value: unknown): string => (value === null || value === undefined ? '' : String(value))

const isBlank = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  value === '' ||
  (Array.isArray(value) || typeof value === 'object' ? Object.keys(value as object).length === 0 : false)

const lengthOf = (value: unknown): number =>
  Array.isArray(value) || typeof value === 'string'
    ? value.length
    : value !== null && typeof value === 'object'
      ? Object.keys(value as object).length
      : value === null || value === undefined
        ? 0
        : asString(value).length

const numbers = (args: unknown[]): number[] =>
  args.filter((value): value is number => typeof value === 'number' && !Number.isNaN(value))

/** min / max 共用：只收数字，空集返回 null */
const extreme = (args: unknown[], pick: (...values: number[]) => number): number | null => {
  const list = numbers(args)
  return list.length === 0 ? null : pick(...list)
}

/** 冻结函数库（名称 → [最少参数, 最多参数, 实现]） */
const FNS: Record<string, [number, number, ExprFunction]> = {
  iif: [3, 3, () => null],
  empty: [1, 1, (x) => isBlank(x)],
  len: [1, 1, (x) => lengthOf(x)],
  sum: [
    1,
    1,
    (x) => (Array.isArray(x) ? x : [x]).reduce<number>((total, item) => total + (numbers([item])[0] ?? 0), 0),
  ],
  min: [1, Infinity, (...args) => extreme(args, Math.min)],
  max: [1, Infinity, (...args) => extreme(args, Math.max)],
  lower: [1, 1, (s) => asString(s).toLowerCase()],
  upper: [1, 1, (s) => asString(s).toUpperCase()],
  // 字符串拼接走函数形态（`+` 只做数值加法，避免二义）：非字符串参数按字符串宽容转换
  concat: [1, Infinity, (...args) => args.map(asString).join('')],
  contains: [2, 2, (container, item) => membership(item, container)],
  // ---- V2 扩充（文本）----
  join: [2, 2, (arr, sep) => (Array.isArray(arr) ? arr.map(asString).join(asString(sep)) : asString(arr))],
  split: [
    2,
    2,
    (s, sep) => {
      const text = asString(s)
      return text === '' ? [] : text.split(asString(sep))
    },
  ],
  substring: [
    2,
    3,
    (s, start, end) => {
      const text = asString(s)
      const from = indexArg(start, 0)
      const to = end === undefined ? text.length : indexArg(end, text.length)
      return text.substring(from, to)
    },
  ],
  replace: [
    3,
    3,
    (s, from, to) => {
      const text = asString(s)
      const needle = asString(from)
      // 空匹配串无意义（split('') 会逐字符拆开），按无操作返回
      return needle === '' ? text : text.split(needle).join(asString(to))
    },
  ],
  trim: [1, 1, (s) => asString(s).trim()],
  // ---- V2 扩充（数学）----
  round: [
    1,
    2,
    (n, digits) => {
      const value = toNumber(n)
      const places = Math.min(10, Math.max(0, Math.trunc(toNumberOr(digits, 0))))
      const factor = 10 ** places
      return Number.isNaN(value) ? value : Math.round(value * factor) / factor
    },
  ],
  abs: [1, 1, (n) => Math.abs(toNumber(n))],
  floor: [1, 1, (n) => Math.floor(toNumber(n))],
  ceil: [1, 1, (n) => Math.ceil(toNumber(n))],
  // ---- V2 扩充（日期：仅 formatDate / dateAdd，本地时区）----
  formatDate: [1, 2, (ts, fmt) => formatDate(ts, fmt === undefined ? 'yyyy-MM-dd' : asString(fmt))],
  dateAdd: [3, 3, (ts, amount, unit) => dateAdd(ts, toNumber(amount), asString(unit))],
}

/** 下标参数（非数值 / 缺省按回落值；负数按 0 截断，与 substring 语义一致） */
function indexArg(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.max(0, Math.trunc(value))
}

/** 数值参数（非数值用回落值；用于可选的 digits 之类「有合理默认」的位置） */
function toNumberOr(value: unknown, fallback: number): number {
  if (value === undefined) return fallback
  return typeof value === 'number' ? value : Number.NaN
}

/** 时间戳归一：数字（毫秒）/ 可解析字符串 / Date → 本地时间 Date；非法返回 null */
function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

const pad2 = (value: number): string => (value < 10 ? `0${value}` : String(value))

/** 冻结 token 表（其余字母 token 原样输出 + devWarn 一次；本地时区，不做 UTC 参数） */
const DATE_TOKENS: Array<[string, (date: Date) => string]> = [
  ['yyyy', (date) => String(date.getFullYear())],
  ['MM', (date) => pad2(date.getMonth() + 1)],
  ['dd', (date) => pad2(date.getDate())],
  ['HH', (date) => pad2(date.getHours())],
  ['mm', (date) => pad2(date.getMinutes())],
  ['ss', (date) => pad2(date.getSeconds())],
]

function formatDate(value: unknown, format: string): string | null {
  const date = toDate(value)
  if (!date) return null
  let out = ''
  let index = 0
  while (index < format.length) {
    const token = DATE_TOKENS.find(([key]) => format.startsWith(key, index))
    if (token) {
      out += token[1](date)
      index += token[0].length
      continue
    }
    const char = format[index]!
    if (/[A-Za-z]/.test(char))
      warnOnce(`token:${char}`, `[oas-schema-form] formatDate 未知 token "${char}"，按原样输出`)
    out += char
    index += 1
  }
  return out
}

/** 日期加减（单位冻结 day / hour / minute；未知单位 devWarn 并返回原时间戳） */
function dateAdd(value: unknown, amount: number, unit: string): number | null {
  const date = toDate(value)
  if (!date) return null
  if (Number.isNaN(amount)) return date.getTime()
  const unitMs = unit === 'day' ? 86_400_000 : unit === 'hour' ? 3_600_000 : unit === 'minute' ? 60_000 : null
  if (unitMs === null) {
    warnOnce(`unit:${unit}`, `[oas-schema-form] dateAdd 单位 "${unit}" 不受支持（day / hour / minute），已按原值返回`)
    return date.getTime()
  }
  return date.getTime() + amount * unitMs
}

/** 比较：两侧同为数字按数值，其余按字符串（写死，避开 "9" > "100" 陷阱） */
function compare(op: string, left: unknown, right: unknown): boolean {
  const numeric = typeof left === 'number' && typeof right === 'number'
  const a: number | string = numeric ? (left as number) : asString(left)
  const b: number | string = numeric ? (right as number) : asString(right)
  if (op === '==') return a === b
  if (op === '!=') return a !== b
  if (op === '>') return a > b
  if (op === '>=') return a >= b
  if (op === '<') return a < b
  return a <= b
}

/** 成员判断（`x in y` / `contains(y, x)`）：数组按元素、字符串按子串、对象按键 */
function membership(item: unknown, container: unknown): boolean {
  if (Array.isArray(container)) return container.some((entry) => compare('==', item, entry))
  if (typeof container === 'string') return container.includes(asString(item))
  return container !== null && typeof container === 'object' && Object.hasOwn(container, asString(item))
}

/** 路径读取：通配段展开为数组（多级通配拍平）；标量路径返回单值，缺失返回 undefined */
function readPath(root: unknown, segments: string[]): unknown {
  if (!segments.includes('[]')) {
    let cursor: unknown = root
    for (const segment of segments) {
      if (cursor === null || typeof cursor !== 'object' || !Object.hasOwn(cursor, segment)) return undefined
      cursor = (cursor as Record<string, unknown>)[segment]
    }
    return cursor
  }
  let candidates: unknown[] = [root]
  for (const segment of segments) {
    const next: unknown[] = []
    for (const candidate of candidates) {
      if (segment === '[]') {
        if (Array.isArray(candidate)) next.push(...candidate)
      } else if (candidate !== null && typeof candidate === 'object' && Object.hasOwn(candidate, segment)) {
        next.push((candidate as Record<string, unknown>)[segment])
      }
    }
    candidates = next
  }
  return candidates
}

/** 编译产物求值（等价于 `program(context)`；保留入口便于宿主与 engine 统一调用） */
export function evaluateExpression(program: ExprProgram, context: ExprEvalContext): unknown {
  return program(context)
}

/** 条件求值（表达式轨布尔口径：真值同 JS，空串 / 缺失为假） */
export function evaluateCondition(program: ExprProgram, context: ExprEvalContext): boolean {
  return truthy(program(context))
}
