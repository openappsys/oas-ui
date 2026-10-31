#!/usr/bin/env node
/**
 * 生成 @oas-ui/i18n 的家族默认文案切片：packages/i18n/src/slices/<family>.ts（9 个）。
 *
 * 单一事实源：packages/i18n/src/locales/zh-CN.ts（只读，不改）。
 * 消费侧事实源：packages/ui/src 下的全部 .ts（排除 .test.ts）。
 *
 * 规则（设计 v3 §3.1）：
 * - 先剥注释（状态机，不误伤字符串里的 `//`），再逐 token 扫描字符串字面量；
 * - 字面量内容恰好等于某个 zh-CN key 才算命中（任意上下文，不限 t(）；
 * - 有插值的模板字面量取首个静态段，按其点分前缀（`messageRow.status.${x}` → `messageRow`、
 *   `barcode.invalid${x}` → `barcode`）展开；该前缀必须是 key 的合法点分前缀，否则忽略；
 * - 家族 = 文件相对 packages/ui/src 的首段目录（9 个家族目录之一）；
 * - 跨家族 key（≥2 个家族引用）重复写入每个消费族的切片；
 * - 未被任何家族引用的 key（死键）全部归 framework，并在报告里列出，禁止静默丢键；
 * - 非 9 家族目录（shared/overlay/families/根文件）出现 key 引用 → 报错退出（需人工决策归属）。
 *
 * 用法：
 *   node scripts/i18n/gen-slices.mjs            # 生成 / 覆盖切片（输出摘要报告）
 *   node scripts/i18n/gen-slices.mjs --check    # 漂移检查：重新生成与磁盘逐字节比较，漂移退出 1
 *   node scripts/i18n/gen-slices.mjs --report   # 输出 key → 消费族明细 + 死键清单
 *
 * 生成物必须过 biome（本脚本内部经 biome stdin 格式化后再落盘）。
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const ZH_CN_PATH = path.join(REPO_ROOT, 'packages', 'i18n', 'src', 'locales', 'zh-CN.ts')
const UI_SRC = path.join(REPO_ROOT, 'packages', 'ui', 'src')
const SLICES_DIR = path.join(REPO_ROOT, 'packages', 'i18n', 'src', 'slices')
const BIOME_BIN = path.join(REPO_ROOT, 'node_modules', '@biomejs', 'biome', 'bin', 'biome')

/** 9 个家族目录（overlay/shared 无 families/*.ts 且零 key，不生成切片） */
const FAMILIES = ['basic', 'conversation', 'data', 'feedback', 'form', 'framework', 'layout', 'navigation', 'workbench']
const FAMILY_SET = new Set(FAMILIES)
/** 死键归属家族 */
const DEAD_KEY_FAMILY = 'framework'

// ---------------------------------------------------------------------------
// 1. 解析 zh-CN.ts（单一事实源）→ 有序 [{ key, value }]
// ---------------------------------------------------------------------------

/** 解析单引号字符串里的转义（zh-CN 值当前无转义，仍防御性解码） */
function decodeEscapes(raw) {
  let out = ''
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]
    if (c !== '\\') {
      out += c
      continue
    }
    const next = raw[i + 1]
    i++
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
      case 'b':
        out += '\b'
        break
      case 'f':
        out += '\f'
        break
      case 'v':
        out += '\v'
        break
      case '0':
        out += '\0'
        break
      case '\n':
      case '\r':
        break
      default:
        out += next ?? ''
    }
  }
  return out
}

function parseZhCN() {
  const src = fs.readFileSync(ZH_CN_PATH, 'utf8')
  const entries = []
  const entryRe = /^\s*'((?:[^'\\]|\\.)+)':\s*'((?:[^'\\]|\\.)*)',\s*$/
  let inObject = false
  for (const line of src.split('\n')) {
    const trimmed = line.trim()
    if (!inObject) {
      if (trimmed.startsWith('export const zhCN')) inObject = true
      continue
    }
    if (trimmed.startsWith('}')) break
    if (trimmed === '' || trimmed.startsWith('//')) continue
    const m = entryRe.exec(line)
    if (!m) {
      throw new Error(
        `[gen-slices] zh-CN.ts 出现无法解析的行（请保持 "'key': 'value'," 格式）：${trimmed.slice(0, 80)}`,
      )
    }
    entries.push({ key: decodeEscapes(m[1]), value: decodeEscapes(m[2]) })
  }
  if (entries.length === 0) throw new Error('[gen-slices] zh-CN.ts 未解析到任何 key')
  const seen = new Set()
  for (const { key } of entries) {
    if (seen.has(key)) throw new Error(`[gen-slices] zh-CN.ts 重复 key：${key}`)
    seen.add(key)
  }
  return entries
}

// ---------------------------------------------------------------------------
// 2. 词法扫描（状态机）：提取字符串字面量 + 模板字面量首个静态段
// ---------------------------------------------------------------------------

/**
 * 扫描一份 TS 源码，返回：
 * - strings：所有完整字符串字面量（'…' / "…" / 无插值 `…`），已解码转义；
 * - templateHeads：有插值模板的首个静态段（${ 之前的文本），已解码转义。
 *
 * 实现要点：
 * - 帧栈处理嵌套：模板字面量 ${expr} 回到 code 帧并计数花括号，expr 内可再含字符串/模板；
 * - 注释只在 code 帧生效（不误伤字符串/正则里的 `//`）；
 * - 正则字面量按「前一个有意义 token」启发式识别（含引号的正则如 /['"]/ 不再被当成字符串起点）。
 */
function extractLiterals(src) {
  const strings = []
  const templateHeads = []
  const n = src.length
  /** 帧类型：code（顶层或模板表达式，brace 为 null 表示顶层不计数）| tpl | sq | dq | regex */
  const frames = [{ type: 'code', brace: null }]
  const top = () => frames[frames.length - 1]

  const REGEX_PRECEDERS = new Set([
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
  const isIdentChar = (c) => /[A-Za-z0-9_$]/.test(c)
  /** code 帧里 `/` 是否为正则起点 */
  const regexAllowed = () => REGEX_PRECEDERS.has(lastSig) || REGEX_KEYWORDS.has(lastWord)
  /** 除号/正则之后的 lastSig 基线：取「类标识符」值使后续 `/` 默认按除号处理 */
  const resetSigToWord = () => {
    lastSig = 'x'
    lastWord = ''
  }

  let lastSig = '' // 最后一个有意义（非空白、非注释）字符
  let lastWord = '' // 最后一个连续标识符词（遇非标识符字符清空）
  let i = 0

  while (i < n) {
    const frame = top()
    const c = src[i]

    switch (frame.type) {
      case 'tpl': {
        if (c === '\\') {
          frame.cur += decodeEscapes(src.slice(i, i + 2))
          i += 2
          continue
        }
        if (c === '`') {
          frames.pop()
          if (frame.hadSub) templateHeads.push(frame.cur)
          else strings.push(frame.cur)
          resetSigToWord()
          i++
          continue
        }
        if (c === '$' && src[i + 1] === '{') {
          frame.hadSub = true
          frames.push({ type: 'code', brace: 0 })
          i += 2
          continue
        }
        frame.cur += c
        i++
        continue
      }
      case 'sq':
      case 'dq': {
        if (c === '\\') {
          frame.cur += decodeEscapes(src.slice(i, i + 2))
          i += 2
          continue
        }
        if (c === '\n') {
          // 字符串字面量不允许裸换行：容错终止，避免吞掉后续代码
          frames.pop()
          strings.push(frame.cur)
          resetSigToWord()
          continue
        }
        const close = frame.type === 'sq' ? "'" : '"'
        if (c === close) {
          frames.pop()
          strings.push(frame.cur)
          resetSigToWord()
          i++
          continue
        }
        frame.cur += c
        i++
        continue
      }
      case 'regex': {
        if (c === '\\') {
          i += 2
          continue
        }
        if (c === '[') {
          frame.inClass = true
          i++
          continue
        }
        if (c === ']') {
          frame.inClass = false
          i++
          continue
        }
        if (c === '/' && !frame.inClass) {
          // 吃掉 flags（gimsuyvd 等）
          i++
          while (i < n && /[a-z]/.test(src[i])) i++
          frames.pop()
          resetSigToWord()
          continue
        }
        i++
        continue
      }
      default:
        break
    }

    // code 帧
    if (c === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i)
      i = nl < 0 ? n : nl
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2)
      i = end < 0 ? n : end + 2
      continue
    }
    if (c === '/') {
      if (regexAllowed()) {
        frames.push({ type: 'regex', inClass: false })
        i++
      } else {
        lastSig = '/'
        lastWord = ''
        i++
      }
      continue
    }
    if (c === "'") {
      frames.push({ type: 'sq', cur: '' })
      i++
      continue
    }
    if (c === '"') {
      frames.push({ type: 'dq', cur: '' })
      i++
      continue
    }
    if (c === '`') {
      frames.push({ type: 'tpl', cur: '', hadSub: false })
      i++
      continue
    }
    if (c === '{') {
      if (frame.brace !== null) frame.brace++
      lastSig = '{'
      lastWord = ''
      i++
      continue
    }
    if (c === '}') {
      if (frame.brace !== null) {
        if (frame.brace === 0) {
          // ${ } 表达式结束 → 回到外层模板静态段（'}' 本身不属于静态段）
          frames.pop()
          i++
          continue
        }
        frame.brace--
      }
      lastSig = '}'
      lastWord = ''
      i++
      continue
    }
    if (/\s/.test(c)) {
      i++
      continue
    }
    if (isIdentChar(c)) {
      lastWord = isIdentChar(src[i - 1]) ? lastWord + c : c
    } else {
      lastWord = ''
    }
    lastSig = c
    i++
  }
  return { strings, templateHeads }
}

// ---------------------------------------------------------------------------
// 3. 扫描 ui 源码 → key 消费族
// ---------------------------------------------------------------------------

/** 递归收集 ui src 下的 .ts 文件（排除 *.test.ts） */
function collectTsFiles(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...collectTsFiles(p))
    else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.test.ts')) out.push(p)
  }
  return out
}

function analyze(entries) {
  const keys = entries.map((e) => e.key)
  const keySet = new Set(keys)
  const values = new Map(entries.map((e) => [e.key, e.value]))
  /** 模板首段 → 首段点分前缀下的全部 key（合法前缀才计入；'s'/'toggle' 这类碎片头不是合法前缀） */
  const keysForHead = (head) => {
    const prefix = head.includes('.') ? head.slice(0, head.indexOf('.')) : head
    if (prefix === '') return []
    return keys.filter((k) => k === prefix || k.startsWith(`${prefix}.`))
  }

  /** key → Set<family>（引用关系） */
  const owners = new Map(keys.map((k) => [k, new Set()]))
  /** 非 9 家族目录的 key 引用（应恒为空，出现即报错） */
  const outsideRefs = new Map()

  for (const file of collectTsFiles(UI_SRC)) {
    const rel = path.relative(UI_SRC, file)
    const segs = rel.split(path.sep)
    const family = FAMILY_SET.has(segs[0]) ? segs[0] : null
    const { strings, templateHeads } = extractLiterals(fs.readFileSync(file, 'utf8'))

    const hit = (key) => {
      if (!family) {
        if (!outsideRefs.has(key)) outsideRefs.set(key, [])
        outsideRefs.get(key).push(segs.join('/'))
        return
      }
      owners.get(key).add(family)
    }
    for (const s of strings) if (keySet.has(s)) hit(s)
    for (const head of templateHeads) {
      if (head === '') continue
      for (const k of keysForHead(head)) hit(k)
    }
  }

  const deadKeys = keys.filter((k) => owners.get(k).size === 0)
  const crossKeys = keys.filter((k) => owners.get(k).size >= 2)
  /** 最终切片内容：key → Set<family>（含死键归 framework） */
  const sliceOwners = new Map()
  for (const k of keys) {
    const fams = new Set(owners.get(k))
    if (fams.size === 0) fams.add(DEAD_KEY_FAMILY)
    sliceOwners.set(k, fams)
  }
  return { keys, values, owners, sliceOwners, deadKeys, crossKeys, outsideRefs }
}

// ---------------------------------------------------------------------------
// 4. 生成切片文件（biome stdin 格式化后落盘）
// ---------------------------------------------------------------------------

const quoteValue = (v) => `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

function renderSlice(family, entries, sliceOwners) {
  const lines = []
  lines.push('/**')
  lines.push(` * ${family} 家族默认文案切片 —— 生成物，勿手改。`)
  lines.push(' * 重新生成：node scripts/i18n/gen-slices.mjs')
  lines.push(' *')
  lines.push(' * 事实源：packages/i18n/src/locales/zh-CN.ts（key 顺序与其保持一致）。')
  lines.push(' * 只含该家族组件源码引用的 key；跨家族 key 会同时写入每个消费族切片。')
  lines.push(' * 纯数据模块（无副作用）：消费方显式 `registerDefaultMessages(' + family + 'Messages)` 注册。')
  lines.push(' */')
  lines.push("import type { LocaleMessages } from '../types.js'")
  lines.push('')
  lines.push(`export const ${family}Messages: Partial<LocaleMessages> = {`)
  for (const { key, value } of entries) {
    if (!sliceOwners.get(key).has(family)) continue
    lines.push(`  ${quoteValue(key)}: ${quoteValue(value)},`)
  }
  lines.push('}')
  lines.push('')
  return lines.join('\n')
}

/** 经 biome stdin 格式化（与仓库 biome.json 一致），失败即抛 */
function biomeFormat(content, fileName) {
  const res = spawnSync(process.execPath, [BIOME_BIN, 'format', `--stdin-file-path=${fileName}`], {
    input: content,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  })
  if (res.status !== 0 || typeof res.stdout !== 'string') {
    throw new Error(`[gen-slices] biome 格式化失败（${fileName}）：${res.stderr || res.status}`)
  }
  return res.stdout
}

// ---------------------------------------------------------------------------
// 5. 主流程
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2)
  const check = args.includes('--check')
  const report = args.includes('--report')

  const entries = parseZhCN()
  const { keys, values, owners, sliceOwners, deadKeys, crossKeys, outsideRefs } = analyze(entries)

  if (outsideRefs.size > 0) {
    console.error('== 错误：非 9 家族目录（shared/overlay/families/根文件）出现了 key 引用，需人工决策归属 ==')
    for (const [k, files] of outsideRefs) console.error(`  ${k} ← ${[...new Set(files)].join(', ')}`)
    process.exitCode = 1
    return
  }

  const perFamily = new Map(FAMILIES.map((f) => [f, keys.filter((k) => sliceOwners.get(k).has(f)).length]))

  // 生成 / 漂移检查
  const drifts = []
  fs.mkdirSync(SLICES_DIR, { recursive: true })
  for (const family of FAMILIES) {
    const fileName = `${family}.ts`
    const content = biomeFormat(renderSlice(family, entries, sliceOwners), fileName)
    const target = path.join(SLICES_DIR, fileName)
    const disk = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null
    if (disk !== content) drifts.push(fileName)
    if (!check) fs.writeFileSync(target, content)
  }

  // 报告
  console.log(`zh-CN keys: ${keys.length}`)
  console.log(`切片家族: ${FAMILIES.length} 个（${FAMILIES.join(' ')}）`)
  console.log(`跨家族 key: ${crossKeys.length} 个`)
  console.log(`死键: ${deadKeys.length} 个（全部归 ${DEAD_KEY_FAMILY}）`)
  console.log(`每族 key 数: ${FAMILIES.map((f) => `${f}=${perFamily.get(f)}`).join(' ')}`)
  console.log(`切片文件合计: ${keys.reduce((acc, k) => acc + sliceOwners.get(k).size, 0)} 条（含跨族重复）`)

  if (deadKeys.length > 0) {
    console.log(`\n== 死键清单（未被任何家族源码引用 → ${DEAD_KEY_FAMILY}）==`)
    for (const k of deadKeys) console.log(`  ${k}`)
  }
  if (report && crossKeys.length > 0) {
    console.log('\n== key → 消费族（跨家族明细）==')
    for (const k of crossKeys) console.log(`  ${k} → ${[...owners.get(k)].sort().join(' / ')}`)
  }
  if (report) {
    console.log('\n== key → 消费族（全量）==')
    for (const k of keys) {
      const fams = [...sliceOwners.get(k)].sort()
      console.log(`  ${k} → ${fams.join(' / ')}`)
    }
  }

  if (check) {
    if (drifts.length > 0) {
      console.error(
        `\n--check 漂移：${drifts.length} 个切片文件与磁盘不一致（先跑 node scripts/i18n/gen-slices.mjs 重新生成）：`,
      )
      for (const f of drifts) console.error(`  ${f}`)
      process.exitCode = 1
    } else {
      console.log('\n--check：0 漂移（重新生成与磁盘逐字节一致）')
    }
  } else if (drifts.length > 0) {
    console.log(`\n已写入 ${drifts.length} 个切片文件：${drifts.join(' ')}`)
  } else {
    console.log('\n切片文件无变化（磁盘已是最新）')
  }
}

// 供探针/调试复用（completeness 测试刻意独立实现，不 import 本文件）
export { parseZhCN, extractLiterals, analyze }

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
