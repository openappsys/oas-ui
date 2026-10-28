import type { TableColumn } from '../oas-table.js'

/** 公式结果：数字 / 字符串 / 布尔 / 空 */
export type FormulaValue = number | string | boolean | null | undefined
type FormulaRow = Record<string, unknown>
type FormulaNode = (row: FormulaRow) => FormulaValue

export interface FormulaColumnOptions {
  key: string
  title: string
  /** 公式表达式；字段直接写列名，如 `price * qty` */
  expression: string
  /** 结果格式化，默认 String(value)，null/undefined 显示空串 */
  format?: (value: FormulaValue) => string
  align?: TableColumn['align']
  width?: string
  fixed?: TableColumn['fixed']
}

type TokenType = 'number' | 'string' | 'ident' | 'op' | 'eof'
interface Token {
  type: TokenType
  value: string
}

const OPERATORS = ['>=', '<=', '==', '!=', '&&', '||', '+', '-', '*', '/', '%', '^', '>', '<', '!', '(', ')', ',']

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < source.length) {
    const ch = source[i]!
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (/\d/.test(ch) || (ch === '.' && /\d/.test(source[i + 1] ?? ''))) {
      let end = i
      while (end < source.length && /[\d.]/.test(source[end]!)) end++
      const raw = source.slice(i, end)
      if (!/^\d+(\.\d+)?$|^\.\d+$/.test(raw)) throw new SyntaxError(`非法数字：${raw}`)
      tokens.push({ type: 'number', value: raw })
      i = end
      continue
    }
    if (ch === '"' || ch === "'") {
      let value = ''
      let end = i + 1
      let closed = false
      while (end < source.length) {
        const current = source[end]!
        if (current === '\\') {
          const next = source[end + 1]
          if (next == null) throw new SyntaxError('字符串未闭合')
          value += next === 'n' ? '\n' : next === 't' ? '\t' : next
          end += 2
          continue
        }
        if (current === ch) {
          closed = true
          end++
          break
        }
        value += current
        end++
      }
      if (!closed) throw new SyntaxError('字符串未闭合')
      tokens.push({ type: 'string', value })
      i = end
      continue
    }
    if (/[A-Za-z_$]/.test(ch)) {
      let end = i
      while (end < source.length && /[A-Za-z0-9_$.]/.test(source[end]!)) end++
      tokens.push({ type: 'ident', value: source.slice(i, end) })
      i = end
      continue
    }
    const op = OPERATORS.find((candidate) => source.startsWith(candidate, i))
    if (!op) throw new SyntaxError(`非法字符：${ch}`)
    tokens.push({ type: 'op', value: op })
    i += op.length
  }
  tokens.push({ type: 'eof', value: '' })
  return tokens
}

function toNumber(value: FormulaValue): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'boolean') return value ? 1 : 0
  if (value == null || value === '') return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function text(value: FormulaValue): string {
  return value == null ? '' : String(value)
}

function truthy(value: FormulaValue): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0 && Number.isFinite(value)
  if (value == null) return false
  return value !== '' && value !== '0' && value !== 'false'
}

/**
 * 安全表达式编译：只暴露字面量、行字段与白名单函数，不执行任意 JS。
 * 解析器为模块级函数 + 显式状态（token 流 + 游标）——不用 class：
 * 产物工具不压缩类方法名/属性名，模块函数名可被安全 mangle（包体收口实测差异见
 * perf-baseline.md advanced 档），算法与递归下降结构与原 class 实现一一对应。
 */
interface ParserState {
  tokens: Token[]
  index: number
}

function peek(state: ParserState): Token {
  return state.tokens[state.index]!
}

function next(state: ParserState): Token {
  return state.tokens[state.index++]!
}

function matchOp(state: ParserState, ...ops: string[]): string | null {
  const token = peek(state)
  if (token.type === 'op' && ops.includes(token.value)) {
    state.index++
    return token.value
  }
  return null
}

function expectOp(state: ParserState, op: string): void {
  if (!matchOp(state, op)) throw new SyntaxError(`缺少「${op}」`)
}

function parse(state: ParserState): FormulaNode {
  const node = parseOr(state)
  if (peek(state).type !== 'eof') throw new SyntaxError(`多余的内容：${peek(state).value}`)
  return node
}

function parseOr(state: ParserState): FormulaNode {
  let left = parseAnd(state)
  while (matchOp(state, '||')) {
    const right = parseAnd(state)
    const prev = left
    left = (row) => (truthy(prev(row)) ? true : truthy(right(row)))
  }
  return left
}

function parseAnd(state: ParserState): FormulaNode {
  let left = parseEquality(state)
  while (matchOp(state, '&&')) {
    const right = parseEquality(state)
    const prev = left
    left = (row) => (truthy(prev(row)) ? truthy(right(row)) : false)
  }
  return left
}

function parseEquality(state: ParserState): FormulaNode {
  let left = parseComparison(state)
  for (;;) {
    const op = matchOp(state, '==', '!=')
    if (!op) return left
    const right = parseComparison(state)
    const prev = left
    left = (row) => {
      const a = prev(row)
      const b = right(row)
      const equal = typeof a === 'number' && typeof b === 'number' ? a === b : text(a) === text(b)
      return op === '==' ? equal : !equal
    }
  }
}

function parseComparison(state: ParserState): FormulaNode {
  let left = parseAdditive(state)
  for (;;) {
    const op = matchOp(state, '>', '>=', '<', '<=')
    if (!op) return left
    const right = parseAdditive(state)
    const prev = left
    left = (row) => {
      const a = prev(row)
      const b = right(row)
      const numeric = typeof a === 'number' || typeof b === 'number'
      const av = numeric ? toNumber(a) : text(a)
      const bv = numeric ? toNumber(b) : text(b)
      if (op === '>') return av > bv
      if (op === '>=') return av >= bv
      if (op === '<') return av < bv
      return av <= bv
    }
  }
}

function parseAdditive(state: ParserState): FormulaNode {
  let left = parseMultiplicative(state)
  for (;;) {
    const op = matchOp(state, '+', '-')
    if (!op) return left
    const right = parseMultiplicative(state)
    const prev = left
    left = (row) => {
      const a = prev(row)
      const b = right(row)
      if (op === '+') {
        if (typeof a === 'string' || typeof b === 'string') return text(a) + text(b)
        return toNumber(a) + toNumber(b)
      }
      return toNumber(a) - toNumber(b)
    }
  }
}

function parseMultiplicative(state: ParserState): FormulaNode {
  let left = parseUnary(state)
  for (;;) {
    const op = matchOp(state, '*', '/', '%')
    if (!op) return left
    const right = parseUnary(state)
    const prev = left
    left = (row) => {
      const a = toNumber(prev(row))
      const b = toNumber(right(row))
      if (op === '*') return a * b
      if (op === '/') return b === 0 ? null : a / b
      return b === 0 ? null : a % b
    }
  }
}

function parseUnary(state: ParserState): FormulaNode {
  if (matchOp(state, '!')) {
    const node = parseUnary(state)
    return (row) => !truthy(node(row))
  }
  if (matchOp(state, '-')) {
    const node = parseUnary(state)
    return (row) => -toNumber(node(row))
  }
  if (matchOp(state, '+')) return parseUnary(state)
  return parsePower(state)
}

function parsePower(state: ParserState): FormulaNode {
  const base = parsePrimary(state)
  if (matchOp(state, '^')) {
    const exponent = parseUnary(state)
    return (row) => toNumber(base(row)) ** toNumber(exponent(row))
  }
  return base
}

function parsePrimary(state: ParserState): FormulaNode {
  const token = next(state)
  if (token.type === 'number') {
    const value = Number(token.value)
    return () => value
  }
  if (token.type === 'string') {
    const value = token.value
    return () => value
  }
  if (token.type === 'ident') {
    if (matchOp(state, '(')) {
      const args: FormulaNode[] = []
      if (!matchOp(state, ')')) {
        do {
          args.push(parseOr(state))
        } while (matchOp(state, ','))
        expectOp(state, ')')
      }
      return callFunction(token.value.toUpperCase(), args)
    }
    const field = token.value
    if (field.split('.').some((part) => !part)) throw new SyntaxError(`非法字段路径：${field}`)
    return (row) =>
      field.split('.').reduce<FormulaValue>(
        (current, key) => {
          if (current == null || typeof current !== 'object') return undefined
          if (!Object.hasOwn(current, key)) return undefined
          return (current as Record<string, unknown>)[key] as FormulaValue
        },
        row as unknown as FormulaValue,
      )
  }
  if (token.type === 'op' && token.value === '(') {
    const node = parseOr(state)
    expectOp(state, ')')
    return node
  }
  throw new SyntaxError(`意外的记号：${token.value || '结束'}`)
}

function callFunction(name: string, args: FormulaNode[]): FormulaNode {
  const arg = (index: number): FormulaNode => args[index] ?? (() => null)
  if (name === 'IF') {
    const [condition, whenTrue, whenFalse] = [arg(0), arg(1), arg(2)]
    return (row) => (truthy(condition(row)) ? whenTrue(row) : whenFalse(row))
  }
  if (name === 'ROUND') {
    const [value, digits] = [arg(0), arg(1)]
    return (row) => {
      const factor = 10 ** Math.max(0, Math.min(10, Math.trunc(toNumber(digits(row)) || 0)))
      return Math.round(toNumber(value(row)) * factor) / factor
    }
  }
  if (name === 'ABS') {
    const value = arg(0)
    return (row) => Math.abs(toNumber(value(row)))
  }
  if (name === 'MIN' || name === 'MAX' || name === 'SUM') {
    return (row) => {
      const values = args.map((node) => toNumber(node(row)))
      if (!values.length) return 0
      if (name === 'MIN') return Math.min(...values)
      if (name === 'MAX') return Math.max(...values)
      return values.reduce((sum, value) => sum + value, 0)
    }
  }
  if (name === 'CONCAT') {
    return (row) => args.map((node) => text(node(row))).join('')
  }
  if (name === 'COALESCE') {
    return (row) => {
      for (const node of args) {
        const value = node(row)
        if (value != null && value !== '') return value
      }
      return null
    }
  }
  if (name === 'LEN') {
    const value = arg(0)
    return (row) => text(value(row)).length
  }
  if (name === 'UPPER') {
    const value = arg(0)
    return (row) => text(value(row)).toUpperCase()
  }
  if (name === 'LOWER') {
    const value = arg(0)
    return (row) => text(value(row)).toLowerCase()
  }
  throw new SyntaxError(`未知函数：${name}`)
}

/** 编译公式为求值函数；语法错误抛 SyntaxError */
export function compileFormula(expression: string): (row: FormulaRow) => FormulaValue {
  const source = expression.trim()
  if (!source) throw new SyntaxError('公式不能为空')
  return parse({ tokens: tokenize(source), index: 0 })
}

/** 对单行求值（编译一次后复用 compileFormula 更高效） */
export function evaluateFormula(expression: string, row: FormulaRow): FormulaValue {
  return compileFormula(expression)(row)
}

/** 生成 `oas-table` 计算公式列；render 返回格式化后的字符串 */
export function formulaColumn(options: FormulaColumnOptions): TableColumn {
  const evaluate = compileFormula(options.expression)
  const format = options.format ?? ((value: FormulaValue) => (value == null ? '' : String(value)))
  return {
    key: options.key,
    title: options.title,
    align: options.align,
    width: options.width,
    fixed: options.fixed,
    render: (row: Record<string, unknown>) => {
      const value = evaluate(row)
      // NaN / Infinity 不进入单元格（除零已返回 null；这里兜底指数/数学函数）
      const safe = typeof value === 'number' && !Number.isFinite(value) ? null : value
      return safe == null ? '' : format(safe)
    },
  }
}
