/**
 * 组件入口 i18n 注册完备性（静态分析）——设计 v3 §4 的「第二道完备性防线」。
 *
 * 与 scripts/i18n/gen-slices.mjs **独立实现**（不 import 其内部函数，防双假绿）：
 * 生成器从「全部 ui 源码 → key → 家族切片」正向生成；本测试从「每个组件入口的
 * 源码 import 闭包」反向验证——闭包内出现 key 引用（字符串字面量恰好等于某个
 * zh-CN key，或模板字面量首段按点分前缀命中）的入口，必须「值导入 + 显式
 * `registerDefaultMessages(<family>Messages)`」注册**本入口家族**的切片；
 * 闭包不需要文案的入口不得注册任何切片（防误补打爆 helper 预算）。
 *
 * 例外清单来源（与 PRD/设计评审结论一一对应，改动须同步注释理由）：
 * - helper 白名单（零注册，7 个）：data/table/view、data/table/format、
 *   data/table/advanced、data/table/history、data/table/detail、
 *   layout/scroll-area/infinite、framework/config-provider——均为被主入口
 *   （data/table、layout/scroll-area）或宿主组件代注册覆盖的内部 helper/能力包，
 *   闭包无 key 字面量；独立消费路径不存在，注册反而制造重复注册与包体膨胀；
 * - 唯一注册豁免：data/table/range——闭包恰好只命中 `table.rangeSelection` 一键，
 *   设计明确本批不处理该能力的读屏文案（见 ui-spec 表格能力节），豁免登记于此，
 *   防其被当作「缺失注册」误报；若闭包命中的 key 集合发生变化须回到设计评审。
 *
 * 根入口 `src/index.ts` 是全家族聚合入口：其闭包覆盖全库（哨兵断言保证分析未
 * 静默失效），注册职责由闭包内的各组件子入口承担（子入口同样在本测试的枚举与
 * 断言范围内），因此对根入口只断言「零注册」。
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { basicMessages } from '@oas-ui/i18n/slices/basic'
import { conversationMessages } from '@oas-ui/i18n/slices/conversation'
import { dataMessages } from '@oas-ui/i18n/slices/data'
import { feedbackMessages } from '@oas-ui/i18n/slices/feedback'
import { formMessages } from '@oas-ui/i18n/slices/form'
import { frameworkMessages } from '@oas-ui/i18n/slices/framework'
import { layoutMessages } from '@oas-ui/i18n/slices/layout'
import { navigationMessages } from '@oas-ui/i18n/slices/navigation'
import { workbenchMessages } from '@oas-ui/i18n/slices/workbench'

const UI_SRC = dirname(fileURLToPath(import.meta.url)) // packages/ui/src

const FAMILIES = [
  'basic',
  'conversation',
  'data',
  'feedback',
  'form',
  'framework',
  'layout',
  'navigation',
  'workbench',
] as const
type Family = (typeof FAMILIES)[number]

const SLICES: Record<Family, Record<string, string>> = {
  basic: basicMessages,
  conversation: conversationMessages,
  data: dataMessages,
  feedback: feedbackMessages,
  form: formMessages,
  framework: frameworkMessages,
  layout: layoutMessages,
  navigation: navigationMessages,
  workbench: workbenchMessages,
}

/** 全量 key 全集（9 个切片并集；completeness 测试已保证并集 === zh-CN 全集） */
const ALL_KEYS: ReadonlySet<string> = new Set(FAMILIES.flatMap((family) => Object.keys(SLICES[family])))

/** helper 白名单：零注册（路径相对 UI_SRC，不含 index.ts） */
const HELPER_NO_REGISTER: readonly string[] = [
  'data/table/view',
  'data/table/format',
  'data/table/advanced',
  'data/table/history',
  'data/table/detail',
  'layout/scroll-area/infinite',
  'framework/config-provider',
]

/** 唯一注册豁免：闭包只命中 table.rangeSelection，设计明确本批不处理 */
const REGISTER_EXEMPT: readonly string[] = ['data/table/range']

// ---------------------------------------------------------------------------
// 静态分析：单文件词法扫描（字符串字面量 + 模板首段 + 剥注释文本），带缓存
// ---------------------------------------------------------------------------

interface FileFacts {
  /** 全部完整字符串字面量内容（'…' / "…" / 无插值 `…`），已解码转义 */
  strings: string[]
  /** 有插值模板字面量的首个静态段（${ 之前文本），已解码转义 */
  templateHeads: string[]
  /** 剥离注释后的源码（字符串/模板/正则原样保留），供 import 解析 */
  stripped: string
}

function decodeEscapes(raw: string): string {
  if (!raw.includes('\\')) return raw
  let out = ''
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] !== '\\') {
      out += raw[i]
      continue
    }
    const next = raw[++i]
    switch (next) {
      case 'n':
        out += '\n'
        break
      case 't':
        out += '\t'
        break
      case 'r':
        out += '\r'
        break
      default:
        out += next ?? ''
    }
  }
  return out
}

const REGEX_KEYWORDS = new Set([
  'return',
  'typeof',
  'instanceof',
  'in',
  'of',
  'new',
  'delete',
  'void',
  'case',
  'do',
  'else',
  'yield',
  'await',
  'throw',
])

/**
 * 单趟状态机扫描：帧栈处理嵌套（模板 ${} 回 code 帧、正则字面量、注释只在
 * code 帧生效不误伤字符串里的 //），同时产出字面量与剥注释文本。
 */
function scanFile(src: string): FileFacts {
  const strings: string[] = []
  const templateHeads: string[] = []
  let stripped = ''
  type Frame =
    | { kind: 'code'; brace: number | null }
    | { kind: 'sq' | 'dq'; cur: string }
    | { kind: 'tpl'; head: string; hadSub: boolean }
    | { kind: 'regex'; inClass: boolean }
  const frames: Frame[] = [{ kind: 'code', brace: null }]
  const top = (): Frame => frames[frames.length - 1] as Frame // 栈底哨兵帧恒在
  let lastSig = ''
  let lastWord = ''
  let i = 0
  const n = src.length
  const isIdent = (c: string): boolean => /[A-Za-z0-9_$]/.test(c)
  const regexAllowed = (): boolean => '([{,;=:!&|?+-*%~^<>'.includes(lastSig) || REGEX_KEYWORDS.has(lastWord)
  const settle = (): void => {
    lastSig = 'x'
    lastWord = ''
  }
  while (i < n) {
    const frame = top()
    const c = src[i] as string // 循环不变式 i < n 保证存在
    switch (frame.kind) {
      case 'tpl': {
        if (c === '\\') {
          frame.head += src.slice(i, i + 2)
          stripped += src.slice(i, i + 2)
          i += 2
          continue
        }
        if (c === '`') {
          frames.pop()
          if (frame.hadSub) templateHeads.push(decodeEscapes(frame.head))
          else strings.push(decodeEscapes(frame.head))
          settle()
          i++
          continue
        }
        if (c === '$' && src[i + 1] === '{') {
          frame.hadSub = true
          frames.push({ kind: 'code', brace: 0 })
          stripped += '${'
          i += 2
          continue
        }
        frame.head += c
        stripped += c
        i++
        continue
      }
      case 'sq':
      case 'dq': {
        if (c === '\\') {
          frame.cur += src.slice(i, i + 2)
          stripped += src.slice(i, i + 2)
          i += 2
          continue
        }
        if (c === '\n') {
          // 字符串不允许裸换行：容错终止，避免吞掉后续代码
          frames.pop()
          strings.push(decodeEscapes(frame.cur))
          settle()
          continue
        }
        if (c === (frame.kind === 'sq' ? "'" : '"')) {
          frames.pop()
          strings.push(decodeEscapes(frame.cur))
          settle()
          stripped += c
          i++
          continue
        }
        frame.cur += c
        stripped += c
        i++
        continue
      }
      case 'regex': {
        if (c === '\\') {
          stripped += src.slice(i, i + 2)
          i += 2
          continue
        }
        if (c === '[') frame.inClass = true
        else if (c === ']') frame.inClass = false
        else if (c === '/' && !frame.inClass) {
          stripped += c
          i++
          while (i < n && /[a-z]/.test(src[i] ?? '')) {
            stripped += src[i]
            i++
          }
          frames.pop()
          settle()
          continue
        }
        stripped += c
        i++
        continue
      }
      default:
        break
    }
    // code 帧
    if (c === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i)
      stripped += ' '
      i = nl < 0 ? n : nl
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2)
      stripped += ' '
      i = end < 0 ? n : end + 2
      continue
    }
    if (c === '/') {
      if (regexAllowed()) {
        frames.push({ kind: 'regex', inClass: false })
        stripped += c
        i++
      } else {
        stripped += c
        lastSig = '/'
        lastWord = ''
        i++
      }
      continue
    }
    if (c === "'" || c === '"') {
      frames.push({ kind: c === "'" ? 'sq' : 'dq', cur: '' })
      stripped += c
      i++
      continue
    }
    if (c === '`') {
      frames.push({ kind: 'tpl', head: '', hadSub: false })
      stripped += c
      i++
      continue
    }
    if (c === '{') {
      if (frame.kind === 'code' && frame.brace !== null) frame.brace++
      stripped += c
      lastSig = '{'
      lastWord = ''
      i++
      continue
    }
    if (c === '}') {
      if (frame.kind === 'code' && frame.brace !== null) {
        if (frame.brace === 0) {
          // ${ } 表达式结束 → 回到外层模板静态段
          frames.pop()
          stripped += c
          i++
          continue
        }
        frame.brace--
      }
      stripped += c
      lastSig = '}'
      lastWord = ''
      i++
      continue
    }
    if (/\s/.test(c)) {
      stripped += c
      i++
      continue
    }
    if (isIdent(c)) lastWord = isIdent(src[i - 1] ?? '') ? lastWord + c : c
    else lastWord = ''
    stripped += c
    lastSig = c
    i++
  }
  return { strings, templateHeads, stripped }
}

// ---------------------------------------------------------------------------
// 静态分析：源码 import 闭包（值导入；type-only 语句/specifier 不展开）
// ---------------------------------------------------------------------------

/** import 子句（from 之前）是否携带值导入（默认/命名空间/非全 type 命名） */
function importClauseHasValue(clause: string): boolean {
  const c = clause.trim()
  if (/^[\w$]+/.test(c)) return true // 默认导入
  if (/\*\s*as\s+[\w$]+/.test(c)) return true // 命名空间导入
  const brace = /\{([^}]*)\}/.exec(c)
  if (brace) {
    const specs = (brace[1] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '')
    return specs.length > 0 && !specs.every((s) => s === 'type' || s.startsWith('type '))
  }
  return c !== '' // 保守：无法识别的子句按值导入处理
}

/** spec → 相对 .ts 路径（仓库约定 .js 后缀映射 .ts）；非相对导入返回 null */
function toRelativeTs(spec: string): string | null {
  if (!spec.startsWith('./') && !spec.startsWith('../')) return null // 外部依赖不展开
  return spec.endsWith('.js') ? `${spec.slice(0, -3)}.ts` : `${spec}.ts`
}

/** 从剥注释源码提取全部「值导入」的相对 .ts 说明符 */
function valueRelativeImports(stripped: string): string[] {
  let text = stripped
  // 整句移除 type-only 语句（先于通用匹配，避免通用正则把 type 语句当值导入）
  text = text.replace(/(^|[;\r\n])\s*import\s+type\s[^'"]*?from\s*['"][^'"]*['"]/g, '$1')
  text = text.replace(/(^|[;\r\n])\s*export\s+type\s[^'"]*?from\s*['"][^'"]*['"]/g, '$1')
  const out: string[] = []
  const push = (spec: string): void => {
    const rel = toRelativeTs(spec)
    if (rel) out.push(rel)
  }
  // 副作用导入：import './x.js'
  for (const m of text.matchAll(/(^|[;\r\n])\s*import\s+['"]([^'"]+)['"]/g)) push(m[2] ?? '')
  // 动态导入：import('./x.js')
  for (const m of text.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]/g)) push(m[1] ?? '')
  // 通用 import … from '…'（子句逐条判定 type-only）
  for (const m of text.matchAll(/(^|[;\r\n])\s*import\s+([^'";]*?)from\s*['"]([^'"]+)['"]/g)) {
    if (!importClauseHasValue(m[2] ?? '')) continue
    push(m[3] ?? '')
  }
  // export * / export * as ns from '…'
  for (const m of text.matchAll(/(^|[;\r\n])\s*export\s*\*(?:\s*as\s+[\w$]+)?\s*from\s*['"]([^'"]+)['"]/g)) {
    push(m[2] ?? '')
  }
  // export { … } from '…'（全 type 命名列表除外）
  for (const m of text.matchAll(/(^|[;\r\n])\s*export\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    const body = m[2] ?? ''
    const specs = body
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '')
    if (specs.length > 0 && specs.every((s) => s === 'type' || s.startsWith('type '))) continue
    push(m[3] ?? '')
  }
  return out
}

const fileCache = new Map<string, string | null>()
const factsCache = new Map<string, FileFacts>()
const closureCache = new Map<string, string[]>()

function readSource(path: string): string | null {
  if (!fileCache.has(path)) {
    try {
      fileCache.set(path, readFileSync(path, 'utf8'))
    } catch {
      fileCache.set(path, null)
    }
  }
  return fileCache.get(path) ?? null
}

function factsOf(path: string): FileFacts {
  if (!factsCache.has(path)) {
    const src = readSource(path)
    factsCache.set(path, src === null ? { strings: [], templateHeads: [], stripped: '' } : scanFile(src))
  }
  return factsCache.get(path) as FileFacts
}

/** 入口（或任意 .ts 文件）的源码 import 闭包（BFS，模块去重；外部依赖不展开） */
function closureOf(entryPath: string): string[] {
  if (!closureCache.has(entryPath)) {
    const seen = new Set<string>()
    const queue = [entryPath]
    while (queue.length > 0) {
      const p = queue.pop() as string
      if (seen.has(p)) continue
      seen.add(p)
      const src = readSource(p)
      if (src === null) continue
      for (const rel of valueRelativeImports(factsOf(p).stripped)) {
        const next = resolve(dirname(p), rel)
        if (!seen.has(next)) queue.push(next)
      }
    }
    closureCache.set(entryPath, [...seen].sort())
  }
  return closureCache.get(entryPath) as string[]
}

// ---------------------------------------------------------------------------
// 静态分析：key 命中（字面量恰等 / 模板首段点分前缀展开）
// ---------------------------------------------------------------------------

/** key → 命中它的文件集合（相对 UI_SRC 的 posix 路径） */
type HitMap = Map<string, Set<string>>

const hitsCache = new Map<string, HitMap>()

function hitsOf(entryPath: string): HitMap {
  if (!hitsCache.has(entryPath)) {
    const hits: HitMap = new Map()
    const add = (key: string, file: string): void => {
      if (!hits.has(key)) hits.set(key, new Set())
      hits.get(key)?.add(file)
    }
    for (const p of closureOf(entryPath)) {
      if (p.endsWith('.test.ts')) continue
      const relFile = relative(UI_SRC, p).split('\\').join('/')
      const { strings, templateHeads } = factsOf(p)
      for (const s of strings) if (ALL_KEYS.has(s)) add(s, relFile)
      for (const head of templateHeads) {
        if (head === '') continue
        const prefix = head.includes('.') ? head.slice(0, head.indexOf('.')) : head
        if (prefix === '') continue
        for (const key of ALL_KEYS) {
          if (key === prefix || key.startsWith(`${prefix}.`)) add(key, relFile)
        }
      }
    }
    hitsCache.set(entryPath, hits)
  }
  return hitsCache.get(entryPath) as HitMap
}

// ---------------------------------------------------------------------------
// 静态分析：入口注册语句解析
// ---------------------------------------------------------------------------

interface Registration {
  /** @oas-ui/i18n/slices/<family> 导入的家族集合 */
  sliceFamilies: Set<string>
  /** 切片导入绑定名（registerDefaultMessages 实参必须出自这里，防假注册） */
  sliceBindings: Set<string>
  /** registerDefaultMessages 调用实参列表 */
  callArgs: string[]
}

const registrationCache = new Map<string, Registration>()

function registrationOf(entryPath: string): Registration {
  if (!registrationCache.has(entryPath)) {
    const src = factsOf(entryPath).stripped
    const sliceFamilies = new Set<string>()
    const sliceBindings = new Set<string>()
    for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]@oas-ui\/i18n\/slices\/([\w-]+)['"]/g)) {
      const body = m[1] ?? ''
      const family = m[2] ?? ''
      sliceFamilies.add(family)
      for (const spec of body.split(',')) {
        const name = spec.trim().replace(/^type\s+/, '')
        if (name !== '') sliceBindings.add(name)
      }
    }
    const callArgs = [...src.matchAll(/registerDefaultMessages\s*\(\s*([A-Za-z_$][\w$.]*)\s*\)/g)].map(
      (m) => m[1] ?? '',
    )
    registrationCache.set(entryPath, { sliceFamilies, sliceBindings, callArgs })
  }
  return registrationCache.get(entryPath) as Registration
}

// ---------------------------------------------------------------------------
// 枚举入口
// ---------------------------------------------------------------------------

function collectEntryFiles(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...collectEntryFiles(p))
    else if (e.isFile() && e.name === 'index.ts') out.push(p) // *.test.ts 天然不在内
  }
  return out.sort()
}

const ENTRY_FILES = collectEntryFiles(UI_SRC)
const relOf = (p: string): string => relative(UI_SRC, p).split('\\').join('/')
/** 入口相对 src 的首段目录（根入口 index.ts 无 → null） */
const familyOf = (p: string): Family | null => {
  const seg = relOf(p).split('/')[0]
  return FAMILIES.includes(seg as Family) ? (seg as Family) : null
}
const ROOT_ENTRY = join(UI_SRC, 'index.ts')
const helperSet = new Set(HELPER_NO_REGISTER)
const exemptSet = new Set(REGISTER_EXEMPT)

function sampleKeys(hits: HitMap, limit = 5): string {
  const keys = [...hits.keys()].sort()
  return keys.slice(0, limit).join(', ') + (keys.length > limit ? ` …（共 ${keys.length} 个）` : '')
}

// ---------------------------------------------------------------------------
// 断言
// ---------------------------------------------------------------------------

describe('i18n 入口注册完备性（静态：入口 import 闭包 × 切片 key 全集）', () => {
  it('哨兵：入口枚举、闭包与注册解析均未静默失效', { timeout: 60_000 }, () => {
    // 防假绿哨兵：解析器若静默失效（枚举为空 / 闭包全空 / 注册全空）以下断言会红
    expect(ENTRY_FILES.length, `应枚举到 >100 个组件入口，实际 ${ENTRY_FILES.length}`).toBeGreaterThan(100)
    expect(hitsOf(ROOT_ENTRY).size, '根入口（全量聚合）闭包应命中大量 key，否则闭包解析已失效').toBeGreaterThan(100)
    const registeredCount = ENTRY_FILES.filter((p) => registrationOf(p).callArgs.length > 0).length
    expect(registeredCount, `应有 >100 个入口已注册切片，实际 ${registeredCount}`).toBeGreaterThan(100)
    expect(ALL_KEYS.size, '9 个切片 key 全集不应为空').toBeGreaterThan(100)
  })

  it('需要文案的入口：值导入 + 显式 registerDefaultMessages(<本族>Messages)，不允许缺注册 / 跨族 / 假注册', {
    timeout: 60_000,
  }, () => {
    const violations: string[] = []
    for (const entry of ENTRY_FILES) {
      const rel = relOf(entry)
      const family = familyOf(entry)
      if (entry === ROOT_ENTRY || family === null) continue // 根入口另测
      if (helperSet.has(rel.replace(/\/index\.ts$/, '')) || exemptSet.has(rel.replace(/\/index\.ts$/, ''))) continue
      const hits = hitsOf(entry)
      if (hits.size === 0) continue // 不需要文案 → 另测
      const reg = registrationOf(entry)
      const expected = `${family}Messages`
      if (reg.callArgs.length === 0) {
        violations.push(
          `  ${rel}: 闭包命中 ${hits.size} 个 key（${sampleKeys(hits)}）但未调用 registerDefaultMessages（应导入 { ${expected} }（模块 @oas-ui/i18n/slices/${family}）并调用 registerDefaultMessages(${expected})）`,
        )
        continue
      }
      if (reg.sliceFamilies.size !== 1 || !reg.sliceFamilies.has(family)) {
        violations.push(
          `  ${rel}: 导入切片家族应为 {${family}}，实际 {${[...reg.sliceFamilies].sort().join(', ') || '空'}}（不允许跨族注册；命中 key: ${sampleKeys(hits)}）`,
        )
      }
      for (const arg of reg.callArgs) {
        if (!reg.sliceBindings.has(arg)) {
          violations.push(
            `  ${rel}: registerDefaultMessages(${arg}) 实参不是切片导入绑定名（假注册；绑定: ${[...reg.sliceBindings].sort().join(', ') || '无'}）`,
          )
        }
      }
    }
    expect(
      violations,
      `\n以下入口闭包需要文案但注册缺失/跨族/假注册（共 ${violations.length} 处）：\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('不需要文案的入口：不得注册任何切片（防误补打爆 helper 预算）', { timeout: 60_000 }, () => {
    const violations: string[] = []
    for (const entry of ENTRY_FILES) {
      const rel = relOf(entry)
      const family = familyOf(entry)
      if (entry === ROOT_ENTRY || family === null) continue // 根入口另测
      const relDir = rel.replace(/\/index\.ts$/, '')
      if (helperSet.has(relDir) || exemptSet.has(relDir)) continue // 另测
      if (hitsOf(entry).size > 0) continue // 需要文案 → 另测
      const reg = registrationOf(entry)
      if (reg.callArgs.length > 0 || reg.sliceFamilies.size > 0) {
        violations.push(
          `  ${rel}: 闭包无任何 key 命中却注册了 {${[...reg.sliceFamilies].sort().join(', ')}}——应删除注册（helper 预算）`,
        )
      }
    }
    expect(
      violations,
      `\n以下入口不需要文案却被注册（共 ${violations.length} 处）：\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('helper 白名单零注册（table 五 helper / scroll-area infinite / config-provider）', { timeout: 60_000 }, () => {
    const violations: string[] = []
    for (const relDir of HELPER_NO_REGISTER) {
      const entry = join(UI_SRC, ...relDir.split('/'), 'index.ts')
      expect(ENTRY_FILES.includes(entry), `白名单入口不存在：${relDir}`).toBe(true)
      const reg = registrationOf(entry)
      if (reg.callArgs.length > 0 || reg.sliceFamilies.size > 0) {
        violations.push(
          `  ${relDir}: 白名单要求零注册，实际调用 registerDefaultMessages(${reg.callArgs.join(', ')}) 并导入 {${[...reg.sliceFamilies].sort().join(', ')}}`,
        )
      }
    }
    expect(violations, `\nhelper 白名单出现注册（共 ${violations.length} 处）：\n${violations.join('\n')}`).toEqual([])
  })

  it('唯一注册豁免 data/table/range：零注册，且闭包恰好只命中 table.rangeSelection（变化须回设计评审）', {
    timeout: 60_000,
  }, () => {
    const entry = join(UI_SRC, 'data', 'table', 'range', 'index.ts')
    expect(ENTRY_FILES.includes(entry), '豁免入口不存在：data/table/range').toBe(true)
    const reg = registrationOf(entry)
    expect(
      reg.callArgs.length === 0 && reg.sliceFamilies.size === 0,
      `data/table/range 应零注册，实际调用 registerDefaultMessages(${reg.callArgs.join(', ')}) 并导入 {${[...reg.sliceFamilies].sort().join(', ')}}`,
    ).toBe(true)
    const hits = hitsOf(entry)
    expect(
      [...hits.keys()].sort(),
      'data/table/range 闭包命中的 key 集合已变化——豁免前提不再成立，须回设计评审更新例外清单',
    ).toEqual(['table.rangeSelection'])
  })

  it('根入口 src/index.ts（全家族聚合）：零注册——注册职责由其闭包内的各组件子入口承担', { timeout: 60_000 }, () => {
    const reg = registrationOf(ROOT_ENTRY)
    expect(
      reg.callArgs.length === 0 && reg.sliceFamilies.size === 0,
      `根入口是全家族聚合入口，不应注册任何单一族切片；实际调用 registerDefaultMessages(${reg.callArgs.join(', ')}) 并导入 {${[...reg.sliceFamilies].sort().join(', ')}}`,
    ).toBe(true)
  })
})
