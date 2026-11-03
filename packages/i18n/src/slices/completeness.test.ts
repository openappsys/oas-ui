/**
 * 家族切片完备性测试 —— 与 scripts/i18n/gen-slices.mjs **独立实现**的校验（防双假绿）。
 *
 * 五道防线：
 * 1. 生成物漂移：子进程跑生成器 --check（重新生成 ↔ 入库文件逐字节一致）；
 * 2. 防丢键：9 个切片的 key 并集 === zh-CN 全集（值也逐一相等）；
 * 3. 消费面：ui 源码里出现的每个 key 字面量（含模板点分前缀展开），都在其所在家族的切片里；
 * 4. 跨家族/死键：跨家族 key 在每个消费族切片里都存在；死键清单固定且只归 framework；
 * 5. 定点键 + 运行时：三个空串陷阱键在对应切片里；整包入口下 442 键全部可解析。
 */
import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { t } from '../index.js'
import { zhCN } from '../locales/zh-CN.js'
import { basicMessages } from './basic.js'
import { conversationMessages } from './conversation.js'
import { dataMessages } from './data.js'
import { feedbackMessages } from './feedback.js'
import { formMessages } from './form.js'
import { frameworkMessages } from './framework.js'
import { layoutMessages } from './layout.js'
import { navigationMessages } from './navigation.js'
import { workbenchMessages } from './workbench.js'

const HERE = dirname(fileURLToPath(import.meta.url))
// HERE = <root>/packages/i18n/src/slices → 上跳 4 级为仓根，上跳 3 级为 packages/
const REPO_ROOT = resolve(HERE, '../../../..')
const UI_SRC = resolve(HERE, '../../../ui/src')
const GEN_SCRIPT = join(REPO_ROOT, 'scripts', 'i18n', 'gen-slices.mjs')

const FAMILY_LIST = [
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
type Family = (typeof FAMILY_LIST)[number]

const slices: Record<Family, Record<string, string>> = {
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

const zhKeys = Object.keys(zhCN) as string[]
const zhTable = zhCN as unknown as Record<string, string>

// ---------------------------------------------------------------------------
// 独立实现的轻量词法扫描（递归下降处理模板 ${} 嵌套；与生成器的帧栈实现互为对照）
// ---------------------------------------------------------------------------

interface ScanResult {
  /** 完整字符串字面量（'…' / "…" / 无插值模板） */
  literals: string[]
  /** 有插值模板的全部静态段拼接（${ 外的文本） */
  heads: string[]
}

const REGEX_BEFORE = new Set([
  '(',
  ',',
  '=',
  ':',
  '[',
  '!',
  '&',
  '|',
  '?',
  '{',
  '}',
  ';',
  '+',
  '-',
  '*',
  '%',
  '~',
  '^',
  '<',
  '>',
])
const REGEX_WORDS = new Set([
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
const IDENT = /[A-Za-z0-9_$]/

function scanSource(src: string): ScanResult {
  const literals: string[] = []
  const heads: string[] = []
  const len = src.length
  let i = 0
  let prevSig = '' // 最近一个有意义字符（字面量结束后重置为「类标识符」→ 后续 / 按除号处理）
  let prevWord = '' // 最近一个完整标识符词

  const track = (c: string): void => {
    if (IDENT.test(c)) prevWord = i > 0 && IDENT.test(src[i - 1]!) && prevWord !== '' ? prevWord + c : c
    else prevWord = ''
    prevSig = c
  }
  const afterLiteral = (): void => {
    prevSig = 'x'
    prevWord = ''
  }
  const unesc = (): string => {
    i++ // 跳过 '\'
    const c = src[i]
    i++
    if (c === 'n') return '\n'
    if (c === 't') return '\t'
    if (c === 'r') return '\r'
    return c ?? ''
  }
  const readQuoted = (quote: string): string => {
    let out = ''
    while (i < len && src[i] !== quote) {
      if (src[i] === '\\') {
        out += unesc()
        continue
      }
      if (src[i] === '\n') break // 容错：字符串不容裸换行
      out += src[i]
      i++
    }
    i++ // 收尾引号
    return out
  }
  const readRegex = (): void => {
    let inClass = false
    while (i < len) {
      const c = src[i]
      if (c === '\\') {
        i += 2
        continue
      }
      if (c === '[') {
        inClass = true
        i++
        continue
      }
      if (c === ']') {
        inClass = false
        i++
        continue
      }
      if (c === '/' && !inClass) {
        i++
        while (i < len && /[a-z]/.test(src[i]!)) i++ // flags
        return
      }
      i++
    }
  }
  const readTemplate = (): { head: string; hasSub: boolean } => {
    let head = ''
    let hasSub = false
    while (i < len) {
      const c = src[i]
      if (c === '\\') {
        head += unesc()
        continue
      }
      if (c === '`') {
        i++
        break
      }
      if (c === '$' && src[i + 1] === '{') {
        hasSub = true
        i += 2
        readExpr()
        continue
      }
      head += c
      i++
    }
    return { head, hasSub }
  }
  /** 读 ${ } 表达式体：递归处理内层字符串/模板/注释/正则（花括号配平），字面量同样收集 */
  const readExpr = (): void => {
    let depth = 1
    while (i < len && depth > 0) {
      const c = src[i]!
      if (c === '{') {
        depth++
        i++
        track(c)
        continue
      }
      if (c === '}') {
        depth--
        i++
        track(c)
        continue
      }
      if (c === '/' && src[i + 1] === '/') {
        const nl = src.indexOf('\n', i)
        i = nl < 0 ? len : nl + 1
        continue
      }
      if (c === '/' && src[i + 1] === '*') {
        const e = src.indexOf('*/', i + 2)
        i = e < 0 ? len : e + 2
        continue
      }
      if (c === "'") {
        i++
        literals.push(readQuoted("'"))
        afterLiteral()
        continue
      }
      if (c === '"') {
        i++
        literals.push(readQuoted('"'))
        afterLiteral()
        continue
      }
      if (c === '`') {
        i++
        const inner = readTemplate()
        if (inner.hasSub) heads.push(inner.head)
        else literals.push(inner.head)
        afterLiteral()
        continue
      }
      if (c === '/' && (REGEX_BEFORE.has(prevSig) || REGEX_WORDS.has(prevWord))) {
        i++
        readRegex()
        afterLiteral()
        continue
      }
      if (!/\s/.test(c)) track(c)
      i++
    }
  }

  while (i < len) {
    const c = src[i]!
    if (c === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i)
      i = nl < 0 ? len : nl + 1
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2)
      i = e < 0 ? len : e + 2
      continue
    }
    if (c === "'") {
      i++
      literals.push(readQuoted("'"))
      afterLiteral()
      continue
    }
    if (c === '"') {
      i++
      literals.push(readQuoted('"'))
      afterLiteral()
      continue
    }
    if (c === '`') {
      i++
      const { head, hasSub } = readTemplate()
      if (hasSub) heads.push(head)
      else literals.push(head)
      afterLiteral()
      continue
    }
    if (c === '/' && (REGEX_BEFORE.has(prevSig) || REGEX_WORDS.has(prevWord))) {
      i++
      readRegex()
      afterLiteral()
      continue
    }
    if (!/\s/.test(c)) track(c)
    i++
  }
  return { literals, heads }
}

// ---------------------------------------------------------------------------
// 独立推导 ui 源码的 key 消费族
// ---------------------------------------------------------------------------

/** 模板首段 → 点分前缀下的 key 集（'messageRow.status.' → 'messageRow' 全族；碎片头不是合法前缀） */
function keysForHead(head: string): string[] {
  const prefix = head.includes('.') ? head.slice(0, head.indexOf('.')) : head
  if (prefix === '') return []
  return zhKeys.filter((k) => k === prefix || k.startsWith(`${prefix}.`))
}

function collectUiFiles(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...collectUiFiles(p))
    else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.test.ts')) out.push(p)
  }
  return out
}

/** key → 消费族集合（独立扫描推导） */
const usage = new Map<string, Set<Family>>(zhKeys.map((k) => [k, new Set<Family>()]))
const outsideHits: string[] = []
for (const file of collectUiFiles(UI_SRC)) {
  const rel = relative(UI_SRC, file)
  const top = rel.split('\\')[0]?.split('/')[0] ?? ''
  const family = (FAMILY_LIST as readonly string[]).includes(top) ? (top as Family) : null
  const { literals, heads } = scanSource(readFileSync(file, 'utf8'))
  for (const s of literals) {
    if (!zhKeys.includes(s)) continue
    if (!family) {
      outsideHits.push(`${rel} → ${s}`)
      continue
    }
    usage.get(s)?.add(family)
  }
  for (const h of heads) {
    for (const k of keysForHead(h)) {
      if (!family) {
        outsideHits.push(`${rel} → ${k}（模板前缀）`)
        continue
      }
      usage.get(k)?.add(family)
    }
  }
}

const crossKeys = zhKeys.filter((k) => (usage.get(k)?.size ?? 0) >= 2)
const deadKeys = zhKeys.filter((k) => (usage.get(k)?.size ?? 0) === 0)

// 当前源码现实（与生成器 --report 一致；ui 源码变化后随之更新）
const EXPECTED_CROSS: Record<string, string[]> = {
  'modal.ok': ['feedback', 'form'],
  'modal.cancel': ['feedback', 'form'],
  'empty.noData': ['feedback', 'form'],
  'select.search': ['form', 'navigation'],
  'select.noMatch': ['data', 'form', 'navigation'],
  'treeSelect.empty': ['data', 'form'],
  'form.validationFailed': ['feedback', 'form'],
  'pagination.prev': ['form', 'navigation'],
  'pagination.next': ['form', 'navigation'],
  'tree.expand': ['data', 'form'],
  'tree.loading': ['data', 'form'],
  'loading.loading': ['data', 'feedback', 'form', 'navigation'],
  'ellipsis.expand': ['data', 'feedback', 'layout'],
  'ellipsis.collapse': ['data', 'feedback', 'layout'],
  'image.preview.zoomIn': ['data', 'form'],
  'image.preview.zoomOut': ['data', 'form'],
  'command.recent': ['form', 'navigation'],
  'dynamicInput.moveUp': ['data', 'form'],
  'dynamicInput.moveDown': ['data', 'form'],
}
const EXPECTED_DEAD = [
  'confirm.ok',
  'confirm.cancel',
  'treeSelect.andMore',
  'upload.upload',
  'upload.maxCount',
  'themeEditor.export',
  'timePicker.now',
  'datePicker.shortcutThisQuarter',
]

// ---------------------------------------------------------------------------

describe('i18n 家族切片完备性', () => {
  it('生成物无漂移（重新生成与磁盘逐字节一致）', { timeout: 120_000 }, () => {
    const res = spawnSync(process.execPath, [GEN_SCRIPT, '--check'], { encoding: 'utf8', timeout: 60_000 })
    expect(res.status, `--check 应退出 0；输出：${res.stdout}\n${res.stderr}`).toBe(0)
  })

  it('防丢键：9 个切片的 key 并集 === zh-CN 全集，且值与 zh-CN 逐一相等', () => {
    const union = new Set<string>()
    for (const family of FAMILY_LIST) {
      // 跨家族 key 会出现在多个切片（设计如此）；仅禁止同一切片内重复
      const seenInFamily = new Set<string>()
      for (const [k, v] of Object.entries(slices[family])) {
        expect(seenInFamily.has(k), `${k} 在 ${family} 切片内重复出现`).toBe(false)
        seenInFamily.add(k)
        union.add(k)
        expect(v, `${family}.${k} 的值应与 zh-CN 基准一致`).toBe(zhTable[k])
      }
    }
    expect(zhKeys.length, 'zh-CN 全集键数应大于 0').toBeGreaterThan(0)
    expect(
      [...union].filter((k) => !zhKeys.includes(k)),
      '切片不应含有 zh-CN 之外的 key',
    ).toEqual([])
    expect(
      zhKeys.filter((k) => !union.has(k)),
      '以下 zh-CN key 未落入任何切片（防丢键）',
    ).toEqual([])
  })

  it('消费面：ui 源码引用的每个 key 都在其所在家族切片里', () => {
    expect(outsideHits, '非 9 家族目录不应引用 key').toEqual([])
    for (const key of zhKeys) {
      for (const family of usage.get(key) ?? []) {
        expect(slices[family][key], `${key} 应出现在消费族 ${family} 的切片里`).toBe(zhTable[key])
      }
    }
  })

  it('跨家族 key 在每个消费族切片里都存在（当前 19 个）', () => {
    const got = Object.fromEntries(crossKeys.map((k) => [k, [...usage.get(k)!].sort()]))
    expect(got).toEqual(EXPECTED_CROSS)
    for (const [key, families] of Object.entries(EXPECTED_CROSS)) {
      for (const family of families) {
        expect(slices[family as Family][key], `跨家族 key ${key} 应在消费族 ${family} 的切片里`).toBe(zhTable[key])
      }
    }
  })

  it('死键清单固定且只归 framework（当前 8 个）', () => {
    expect(deadKeys.slice().sort()).toEqual([...EXPECTED_DEAD].sort())
    for (const key of EXPECTED_DEAD) {
      expect(slices.framework[key], `死键 ${key} 应归 framework 切片`).toBe(zhTable[key])
      for (const family of FAMILY_LIST) {
        if (family === 'framework') continue
        expect(slices[family][key], `死键 ${key} 不应出现在 ${family} 切片`).toBeUndefined()
      }
    }
  })

  it('定点键（空串打偏引号配对的三个陷阱键）在对应家族切片里', () => {
    expect(slices.workbench['statusbar.label']).toBe('状态栏')
    expect(slices.workbench['inspector.label']).toBe('属性面板')
    expect(slices.conversation['promptInput.placeholder']).toBe('输入消息…')
  })

  it('运行时：整包入口下 447 键全部可解析（t() 不回退 raw key）', () => {
    expect(zhKeys.length).toBe(447)
    for (const key of zhKeys) {
      expect(t(key as never), `整包入口下 ${key} 应解析为中文`).not.toBe(key)
    }
  })
})
