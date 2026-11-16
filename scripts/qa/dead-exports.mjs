#!/usr/bin/env node
/**
 * 未引用内部导出报告（报告型，不阻断）。
 *
 * 问题：包内实现文件普遍带 `export`，其中一部分既不可从公共入口（包内全部
 * `index.ts` / `ssr.ts` 与 package.json#exports 的导出闭包，含递归 `export *`
 * 与别名导出）到达，也在仓库源码里零引用。这类导出是「内部写了 export 但没人要」，
 * 可作为后续清理候选。
 *
 * 本脚本只报告，不判死：
 *   1. 公共 API 不能按「仓库内零引用」判死——外部消费者可能直接引用；
 *   2. 因此只有「非公共入口可达」+「仓库内零引用」两个条件同时成立才进候选，
 *      且候选仍需人工确认（见 docs/engineering.md §4）。
 *
 * 统计口径：
 * - 候选来源：非入口实现文件的顶层导出声明
 *   （const / let / var / function / class / interface / type / enum）；单测 / e2e /
 *   fixture / `.d.ts` 里的 export 不作为候选（不是发布实现）。
 * - 公共入口：仓库内所有 `index.ts` / `ssr.ts`，加上各包 `package.json#exports`
 *   指向的源文件（dist 产物路径反推 src）；沿相对模块递归收集导出名，含
 *   `export *` 与别名导出。
 * - 引用口径：全仓 TS（含测试 / docs / fixtures）+ 构建脚本 JS（`.mjs/.cjs/.js`），
 *   排除 `node_modules` / `dist` / `.opencode` / 生成物缓存等目录；声明文件
 *   自身不计引用；注释与字符串内容不算引用。
 *
 * 用法：
 *   pnpm qa:dead-exports                 文本报告（总数 / kind 分布 / 逐条）
 *   pnpm qa:dead-exports --json          结构化数组（stdout 只输出 JSON）
 *   pnpm qa:dead-exports --only-runtime  只看运行时导出（排除 type / interface）
 *   node scripts/qa/dead-exports.mjs --root <目录>  指定扫描根（测试用）
 *
 * 只读：不写文件、不访问网络、不调用 git。
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const DEFAULT_ROOT = resolve(SCRIPT_DIR, '../..')

/** 扫描时整目录跳过的名字（与产物 / 缓存 / 外部账号目录无关） */
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.opencode',
  'test-results',
  'playwright-report',
  'coverage',
  '.next',
  '.nuxt',
  '.output',
  '.turbo',
])

const TS_FILE_RE = /\.(?:ts|tsx|mts|cts)$/
const REFERENCE_FILE_RE = /\.(?:ts|tsx|mts|cts|js|mjs|cjs)$/
const TEST_FILE_RE = /\.(?:test|spec)\.(?:ts|tsx|mts|cts)$/
const ENTRY_FILE_RE = /(?:^|[\\/])(?:index|ssr)\.ts$/
const IDENT_RE = /[A-Za-z_$][\w$]*/g

/** 测试 / fixture 目录：可被引用扫描，但其中的 export 不作为候选（不是发布实现） */
const NON_SOURCE_DIRS = new Set(['qa-regression', '__tests__', 'fixtures'])

const DECL_RE =
  /^export\s+(?:declare\s+)?(?:async\s+)?(?:abstract\s+)?(const|let|var|function|class|interface|type|enum)\s+\*?\s*([A-Za-z_$][\w$]*)/gm
const BLOCK_RE = /^export\s+(type\s+)?\{([^}]*)\}/gm
const STAR_RE = /^export\s+(?:type\s+)?\*\s*(?:as\s+([A-Za-z_$][\w$]*)\s+)?from\s*['"]([^'"]+)['"]/gm

/** `/` 前一个 token 是这些关键字时，`/` 开启正则而不是除号 */
const REGEX_PREFIX_KEYWORDS = new Set([
  'return',
  'typeof',
  'instanceof',
  'case',
  'in',
  'of',
  'delete',
  'void',
  'throw',
  'new',
  'yield',
  'await',
  'else',
  'do',
])

/**
 * 把源码切成两份等长文本：
 * - `code`：注释与字符串 / 模板 / 正则内容全部抹成空格（换行保留）——
 *   用于提取标识符与行号，保证「注释 / 字符串里的同名」不算引用。
 * - `kept`：只抹注释，字符串原样保留——用于解析 `export * from './x.js'`
 *   的模块说明符（`code` 里说明符已被抹掉）。
 *
 * 手写扫描器只覆盖仓库实际写法，不追求完整 TS 语法；无法识别的边界
 * （如正则字面量误判）最多影响报告准确度，不会抛错。
 */
export function maskSource(text) {
  const code = []
  const kept = []
  const n = text.length
  let i = 0
  let mode = 'code'
  /** 模板字符串 `${ ... }` 插值栈：记录进入插值前的花括号深度 */
  const interpStack = []
  let braceDepth = 0

  const blank = (ch) => (ch === '\n' ? '\n' : ' ')
  const push = (codeChar, keptChar) => {
    code.push(codeChar)
    kept.push(keptChar)
  }
  const pushBlank = (ch) => push(blank(ch), blank(ch))

  const isRegexStart = (index) => {
    let j = index - 1
    while (j >= 0 && (text[j] === ' ' || text[j] === '\t' || text[j] === '\n' || text[j] === '\r')) j--
    if (j < 0) return true
    const prev = text[j]
    if ('=(,:[!&|?{};+-*%<>~^'.includes(prev)) return true
    if (/[\w$]/.test(prev)) {
      let start = j
      while (start > 0 && /[\w$]/.test(text[start - 1])) start--
      return REGEX_PREFIX_KEYWORDS.has(text.slice(start, j + 1))
    }
    return false
  }

  while (i < n) {
    const ch = text[i]
    const next = text[i + 1]

    if (mode === 'template') {
      if (ch === '\\') {
        pushBlank(ch)
        if (i + 1 < n) pushBlank(text[i + 1])
        i += 2
        continue
      }
      if (ch === '`') {
        push('`', '`')
        i += 1
        mode = 'code'
        continue
      }
      if (ch === '$' && next === '{') {
        push('$', '$')
        push('{', '{')
        i += 2
        interpStack.push({ braceDepth })
        braceDepth = 0
        mode = 'code'
        continue
      }
      pushBlank(ch)
      i += 1
      continue
    }

    // ---- code 模式 ----
    if (ch === '/' && next === '/') {
      while (i < n && text[i] !== '\n') {
        pushBlank(text[i])
        i += 1
      }
      continue
    }
    if (ch === '/' && next === '*') {
      pushBlank(ch)
      pushBlank(next)
      i += 2
      while (i < n && !(text[i] === '*' && text[i + 1] === '/')) {
        pushBlank(text[i])
        i += 1
      }
      if (i < n) {
        pushBlank('*')
        pushBlank('/')
        i += 2
      }
      continue
    }
    if (ch === '"' || ch === "'") {
      push(ch, ch)
      i += 1
      while (i < n) {
        const cur = text[i]
        if (cur === '\\') {
          pushBlank(cur)
          if (i + 1 < n) push(blank(text[i + 1]), text[i + 1])
          i += 2
          continue
        }
        if (cur === ch) {
          push(cur, cur)
          i += 1
          break
        }
        push(blank(cur), cur)
        i += 1
      }
      continue
    }
    if (ch === '`') {
      push('`', '`')
      i += 1
      mode = 'template'
      continue
    }
    if (ch === '/' && next !== '=' && isRegexStart(i)) {
      pushBlank(ch)
      i += 1
      let inClass = false
      while (i < n) {
        const cur = text[i]
        if (cur === '\\') {
          pushBlank(cur)
          if (i + 1 < n) pushBlank(text[i + 1])
          i += 2
          continue
        }
        if (cur === '[') inClass = true
        else if (cur === ']') inClass = false
        else if (cur === '/' && !inClass) {
          pushBlank(cur)
          i += 1
          break
        } else if (cur === '\n') {
          break
        }
        pushBlank(cur)
        i += 1
      }
      while (i < n && /[A-Za-z]/.test(text[i])) {
        pushBlank(text[i])
        i += 1
      }
      continue
    }
    if (ch === '{') {
      braceDepth += 1
      push(ch, ch)
      i += 1
      continue
    }
    if (ch === '}') {
      if (braceDepth === 0 && interpStack.length > 0) {
        const frame = interpStack.pop()
        braceDepth = frame.braceDepth
        push('}', '}')
        i += 1
        mode = 'template'
        continue
      }
      if (braceDepth > 0) braceDepth -= 1
      push('}', '}')
      i += 1
      continue
    }
    push(ch, ch)
    i += 1
  }

  return { code: code.join(''), kept: kept.join('') }
}

/** 递归收集目录下的文件（不跟随 node_modules / 产物目录 / vite 缓存） */
function walkFiles(root, matcher) {
  const out = []
  const walk = (dir) => {
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        // Vite / VitePress 依赖缓存：构建产物，非仓库源码
        if (entry.name === 'cache' && full.split(/[\\/]/).includes('.vitepress')) continue
        walk(full)
      } else if (matcher.test(entry.name)) {
        out.push(full)
      }
    }
  }
  walk(root)
  return out
}

/** 仓库源码里的 TS 文件（候选与入口都从这里来） */
export function collectTsFiles(root) {
  return walkFiles(root, TS_FILE_RE)
}

/** 引用扫描口径：TS + 构建脚本 JS（避免把 .mjs 构建脚本在用的实现判成零引用） */
function collectReferenceFiles(root) {
  return walkFiles(root, REFERENCE_FILE_RE)
}

/** 解析单个模块的导出声明 / 导出列表 / 星号再导出 */
export function parseModule(source) {
  const { code, kept } = maskSource(source)
  const declarations = []
  const exportBlocks = []
  const starExports = []

  for (const match of code.matchAll(DECL_RE)) {
    const lineStart = code.lastIndexOf('\n', match.index) + 1
    const line = code.slice(0, lineStart).split('\n').length
    declarations.push({ name: match[2], kind: match[1], line })
  }

  for (const match of code.matchAll(BLOCK_RE)) {
    const typeOnly = Boolean(match[1])
    const names = []
    for (const part of match[2].split(',')) {
      const cleaned = part.trim().replace(/^type\s+/, '')
      if (!cleaned) continue
      const alias = cleaned.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/)
      const single = cleaned.match(/^([A-Za-z_$][\w$]*)$/)
      if (alias) names.push(alias[2])
      else if (single) names.push(single[1])
    }
    exportBlocks.push({ typeOnly, names })
  }

  for (const match of kept.matchAll(STAR_RE)) {
    starExports.push({ namespace: match[1] ?? null, specifier: match[2] })
  }

  return { code, declarations, exportBlocks, starExports }
}

/** 候选来源口径：非入口的发布实现文件（排除单测 / e2e / fixture / 类型声明） */
export function isCandidateSource(file) {
  if (!TS_FILE_RE.test(file)) return false
  if (/\.d\.ts$/.test(file)) return false
  if (TEST_FILE_RE.test(file)) return false
  return !file.split(/[\\/]/).some((segment) => NON_SOURCE_DIRS.has(segment))
}

/** 递归收集 package.json#exports 里的全部字符串目标（含条件导出嵌套） */
function collectExportTargets(value) {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(collectExportTargets)
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(collectExportTargets)
  }
  return []
}

/** dist 产物路径反推源码路径（`./dist/format-byte.js` → `<pkg>/src/format-byte.ts`） */
function mapExportTargetToSource(pkgDir, target) {
  if (target.includes('*') || target.includes('?')) return null
  if (!/\.(?:d\.ts|js|mjs|cjs)$/.test(target)) return null
  let rel = target.replace(/^\.\//, '')
  if (rel.startsWith('dist/types/')) rel = rel.slice('dist/types/'.length)
  else if (rel.startsWith('dist/')) rel = rel.slice('dist/'.length)
  else return null
  rel = rel
    .replace(/\.d\.ts$/, '.ts')
    .replace(/\.mjs$/, '.mts')
    .replace(/\.cjs$/, '.cts')
    .replace(/\.js$/, '.ts')
  return join(pkgDir, 'src', rel)
}

/**
 * package.json#exports 指向的源码文件也是公共入口（如 `@oas-ui/core/format-byte`、
 * `@oas-ui/ssr/polyfill`）。通配子路径无法静态枚举，跳过。
 */
function collectPackageEntryFiles(root, tsFileSet) {
  const out = new Set()
  let entries
  try {
    entries = readdirSync(join(root, 'packages'), { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const pkgDir = join(root, 'packages', entry.name)
    let pkg
    try {
      pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'))
    } catch {
      continue
    }
    for (const target of collectExportTargets(pkg.exports)) {
      const source = mapExportTargetToSource(pkgDir, target)
      if (source && tsFileSet.has(source)) out.add(source)
    }
  }
  return out
}

/** 相对说明符 → 实际文件候选（`.js` ↔ `.ts`、目录 index） */
function resolveRelativeModule(fromFile, specifier, filesByPath) {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) return null
  const base = resolve(dirname(fromFile), specifier)
  const candidates = []
  if (/\.(?:js|mjs|cjs|ts|tsx|mts|cts)$/.test(base)) {
    candidates.push(base)
    candidates.push(base.replace(/\.js$/, '.ts'))
    candidates.push(base.replace(/\.mjs$/, '.mts'))
    candidates.push(base.replace(/\.cjs$/, '.cts'))
  } else {
    for (const ext of ['.ts', '.tsx', '.mts', '.cts']) candidates.push(`${base}${ext}`)
    for (const ext of ['.ts', '.tsx', '.mts', '.cts']) candidates.push(join(base, `index${ext}`))
  }
  for (const candidate of candidates) {
    if (filesByPath.has(candidate)) return candidate
  }
  return null
}

/**
 * 某文件的导出名集合（含 `export *` 递归；循环引用安全终止）。
 * 缺失 / 非相对模块安全跳过，不抛错。
 */
export function moduleExportNames(file, ctx) {
  if (ctx.cache.has(file)) return ctx.cache.get(file)
  if (ctx.visiting.has(file)) return new Set()
  const source = ctx.sourceByPath.get(file)
  if (source == null) return new Set()

  ctx.visiting.add(file)
  const names = new Set()
  const mod = parseModule(source)
  for (const decl of mod.declarations) names.add(decl.name)
  for (const block of mod.exportBlocks) {
    for (const name of block.names) names.add(name)
  }
  for (const star of mod.starExports) {
    if (star.namespace) {
      names.add(star.namespace)
      continue
    }
    const target = resolveRelativeModule(file, star.specifier, ctx.filesByPath)
    if (!target) continue
    for (const name of moduleExportNames(target, ctx)) {
      if (name !== 'default') names.add(name)
    }
  }
  ctx.visiting.delete(file)
  ctx.cache.set(file, names)
  return names
}

function byKindCounts(candidates) {
  const counts = new Map()
  for (const candidate of candidates) {
    counts.set(candidate.kind, (counts.get(candidate.kind) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([kind, count]) => ({ kind, count }))
}

/**
 * 主分析入口（纯函数式：给定 root 返回报告数据，便于测试）。
 * @returns {{ root: string, fileCount: number, referenceFileCount: number, entryCount: number, candidates: Array<{file:string,line:number,name:string,kind:string}> }}
 */
export function analyzeDeadExports(root, options = {}) {
  const absoluteRoot = resolve(root)
  const tsFiles = collectTsFiles(absoluteRoot)
  const referenceFiles = collectReferenceFiles(absoluteRoot)
  const tsFileSet = new Set(tsFiles)
  const filesByPath = new Set(referenceFiles)
  const sourceByPath = new Map()
  for (const file of referenceFiles) {
    try {
      sourceByPath.set(file, readFileSync(file, 'utf8'))
    } catch {
      // 读不到的文件当作不存在，安全跳过
    }
  }

  const ctx = { filesByPath, sourceByPath, cache: new Map(), visiting: new Set() }
  const entryFiles = new Set(tsFiles.filter((file) => ENTRY_FILE_RE.test(file) && isCandidateSource(file)))
  for (const file of collectPackageEntryFiles(absoluteRoot, tsFileSet)) entryFiles.add(file)
  const publicNames = new Set()
  for (const entry of entryFiles) {
    for (const name of moduleExportNames(entry, ctx)) publicNames.add(name)
  }

  const rawCandidates = []
  const codeByPath = new Map()
  referenceFiles.forEach((file, index) => {
    const source = sourceByPath.get(file)
    if (source == null) return
    const mod = parseModule(source)
    codeByPath.set(file, mod.code)
    if (!tsFileSet.has(file)) return
    if (ENTRY_FILE_RE.test(file) || !isCandidateSource(file)) return
    for (const decl of mod.declarations) {
      if (publicNames.has(decl.name)) continue
      rawCandidates.push({
        index,
        file: relative(absoluteRoot, file).split('\\').join('/'),
        line: decl.line,
        name: decl.name,
        kind: decl.kind,
      })
    }
  })

  const filtered = options.onlyRuntime
    ? rawCandidates.filter((c) => c.kind !== 'type' && c.kind !== 'interface')
    : rawCandidates

  // 只为候选名建一次反向索引：一遍扫描所有文件，避免每个候选全仓重扫
  const candidateNames = new Set(filtered.map((candidate) => candidate.name))
  const refFiles = new Map()
  referenceFiles.forEach((file, index) => {
    const code = codeByPath.get(file)
    if (code == null) return
    IDENT_RE.lastIndex = 0
    let match = IDENT_RE.exec(code)
    while (match) {
      if (candidateNames.has(match[0])) {
        let set = refFiles.get(match[0])
        if (!set) {
          set = new Set()
          refFiles.set(match[0], set)
        }
        set.add(index)
      }
      match = IDENT_RE.exec(code)
    }
  })

  const candidates = []
  for (const candidate of filtered) {
    const refs = refFiles.get(candidate.name)
    const referenced = refs ? [...refs].some((index) => index !== candidate.index) : false
    if (!referenced) {
      const { index: _index, ...rest } = candidate
      candidates.push(rest)
    }
  }

  candidates.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.name.localeCompare(b.name))

  return {
    root: relative(process.cwd(), absoluteRoot).split('\\').join('/') || '.',
    fileCount: tsFiles.length,
    referenceFileCount: referenceFiles.length,
    entryCount: entryFiles.size,
    candidates,
    byKind: byKindCounts(candidates),
  }
}

function parseArgs(argv) {
  const options = { root: DEFAULT_ROOT, json: false, onlyRuntime: false, help: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--json') options.json = true
    else if (arg === '--only-runtime') options.onlyRuntime = true
    else if (arg === '--help' || arg === '-h') options.help = true
    else if (arg === '--root') {
      const value = argv[i + 1]
      if (!value) throw new Error('--root 需要一个目录参数')
      options.root = isAbsolute(value) ? value : resolve(process.cwd(), value)
      i += 1
    } else if (arg.startsWith('--root=')) {
      const value = arg.slice('--root='.length)
      if (!value) throw new Error('--root 需要一个目录参数')
      options.root = isAbsolute(value) ? value : resolve(process.cwd(), value)
    } else {
      throw new Error(`未知参数：${arg}（支持 --json / --only-runtime / --root <目录>）`)
    }
  }
  return options
}

export function formatReport(report) {
  const lines = []
  lines.push(
    `[qa:dead-exports] 扫描 ${report.fileCount} 个 TS 文件 / ${report.entryCount} 个公共入口（index.ts / ssr.ts / package.json#exports）`,
  )
  lines.push(`引用扫描 ${report.referenceFileCount} 个源码文件（TS + 构建脚本 JS；注释 / 字符串不计）`)
  lines.push(`候选 ${report.candidates.length} 个（非公共入口可达 + 全仓零引用）`)
  if (report.byKind.length > 0) {
    lines.push(`kind 分布：${report.byKind.map((item) => `${item.kind} ${item.count}`).join(' / ')}`)
  }
  if (report.candidates.length > 0) {
    lines.push('')
    for (const candidate of report.candidates) {
      lines.push(`${candidate.file}:${candidate.line} ${candidate.name} (${candidate.kind})`)
    }
  }
  lines.push('')
  lines.push(
    '说明：报告型输出，不阻断。公共 API 不能因「仓库内零引用」判死（外部消费者可能直接引用）；候选清理前需人工确认。',
  )
  return `${lines.join('\n')}\n`
}

function main() {
  let options
  try {
    options = parseArgs(process.argv.slice(2))
  } catch (error) {
    process.stderr.write(`[qa:dead-exports] ${error.message}\n`)
    process.exitCode = 2
    return
  }
  if (options.help) {
    process.stdout.write(
      [
        '用法：node scripts/qa/dead-exports.mjs [--json] [--only-runtime] [--root <目录>]',
        '',
        '  --json          输出结构化数组（stdout 只有 JSON）',
        '  --only-runtime  排除 type / interface 候选',
        '  --root <目录>   指定扫描根（默认仓库根）',
        '',
      ].join('\n'),
    )
    return
  }

  const report = analyzeDeadExports(options.root, { onlyRuntime: options.onlyRuntime })
  if (options.json) {
    process.stdout.write(`${JSON.stringify(report.candidates, null, 2)}\n`)
    return
  }
  process.stdout.write(formatReport(report))
}

const invokedDirectly = process.argv[1] != null && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedDirectly) main()
