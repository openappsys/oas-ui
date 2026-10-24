#!/usr/bin/env node
/**
 * 体积基准（vision §5.8 性能领先落地的一部分）。
 *
 * 测量对象（全部基于 `pnpm build` 之后的发布产物 dist）：
 *   - 各包发布体积：@oas-ui/ui（dist 总大小 / 浏览器可加载 JS / 全量入口链 / dist/cdn.js）、
 *     @oas-ui/theme（index.css）、@oas-ui/ssr、@oas-ui/i18n、@oas-ui/core、@oas-ui/icons
 *   - 单组件按需引入链：`import '@oas-ui/ui/basic/button'` 等目录入口的"入口 + 依赖"实际加载文件集合
 *     （静态 import 图遍历：入口 index.js → 相对依赖 + @oas-ui/* 包 exports 解析到各自 dist）
 *     —— 验证 tree-shaking / 按需引入叙事成立（单组件链远小于全量入口）。
 *
 * 压缩口径：
 *   - gzip：zlib.gzipSync 默认档；brotli：zlib.brotliCompressSync q11（CDN/HTTP 常见档）
 *   - 单组件链 = 逐文件 gzip 求和（浏览器原生 ESM 逐文件加载的上界估计；
 *     若经打包器合并，单文件 gzip 会更低，见 docs/perf-baseline.md）
 *
 * 预算断言：超预算打印 FAIL 并以非零退出（CI 已在 .github/workflows/ci.yml 接线 `pnpm perf:size`）。
 * 预算定档依据：2026-08-12 首测值上浮 ~15%（量纲取整），注释写明各条实测与余量。
 *
 * 结构门禁（同样非零退出）：
 *   - 裸导入：发布产物只允许相对导入 + `@oas-ui/*` 工作区包；其余裸导入必须列进
 *     EXTERNAL_IMPORT_ALLOW（当前仅 `@oas-ui/ssr` 的 happy-dom）——否则图遍历会静默跳过、
 *     体积少算而不报红。改动例外须同步 docs/engineering.md「零第三方」口径。
 *   - 可选层零泄漏：theme 可选层文件 / 图标全量注册表不得进任何基础链闭包。
 *   - `table/core` 自 v2.6.4 起为 deprecated 别名，不再单独计量（v2.6.5 移除）。
 *
 * 自测（不依赖已构建 dist，覆盖上述判定函数的红绿两侧）：
 *   `node scripts/perf/size.mjs --self-test`
 *
 * 产物：docs/perf-baseline.json 的 `size` section（与 render-bench.mjs 各自 merge，互不覆盖）。
 *   ⚠️ 该基线是**入库文件**，本工具默认「只测不写」：gzip 字节跨 zlib 版本/平台存在差异，
 *   若每次运行都写入，会污染工作树（本地跑一次就脏一个 tracked 文件），并让读这份基线的
 *   `stats:check` 在 CI 里误报（perf:size 与 stats:check 同 job 时尤其明显）。
 *
 * 用法：先 `pnpm build`，再 `pnpm perf:size`；确需更新入库基线时显式加 `--update-baseline`。
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, realpathSync } from 'node:fs'
import { dirname, join, resolve, relative } from 'node:path'
import { gzipSync, brotliCompressSync, constants } from 'node:zlib'
import { ROOT, writeSection, fmtKB, fmtBytes, today } from './lib/baseline.mjs'

const UI_DIST = join(ROOT, 'packages/ui/dist')

// ---------- 压缩工具 ----------
function gzip(buf) {
  return gzipSync(buf).length
}
function brotli(buf) {
  return brotliCompressSync(buf, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
  }).length
}

// ---------- 模块图遍历（按发布产物静态解析 import） ----------
const FROM_RE = /from\s*["']([^"']+)["']/g
// 语句边界（行首 / ; { } 之后的 import），避免把注释/字符串里的示例 import 当真导入
const SIDE_IMPORT_RE = /(?:^|[;{}])\s*import\s*["']([^"']+)["']/gm
const DYNAMIC_IMPORT_RE = /import\(\s*["']([^"']+)["']\s*\)/g

function extractSpecs(code) {
  const out = new Set()
  // 只跟静态导入——动态 import() 是运行时按需下载的懒 chunk（如 i18n 语言包按需加载），
  // 不属于「初始负载」，计入会虚增闭包体积（RTL 批实测：方向助手引 i18n 后每浮层组件虚增 ~40KB gzip）
  for (const re of [FROM_RE, SIDE_IMPORT_RE]) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(code))) out.add(m[1])
  }
  return out
}

/**
 * 解析 import 说明符为绝对路径。
 * - 相对路径：相对当前文件目录，仅认 .js（发布产物无 .css 导入，样式全内联为模板字符串）
 * - @oas-ui/*：按 node_modules 逐级向上查找包（pnpm workspace 依赖链在
 *   packages/<pkg>/node_modules），再按 package.json 的 `exports`（含 `./*` 通配）解析到 dist
 * - 非本库裸导入（外部依赖）返回 null——本库发布产物零第三方运行时依赖，正常不会出现
 */
function resolveSpec(spec, fromFile) {
  if (spec.startsWith('.')) {
    const p = resolve(dirname(fromFile), spec)
    return p.endsWith('.js') && existsSync(p) ? p : null
  }
  const m = /^(@oas-ui)\/([^/]+)(\/.*)?$/.exec(spec)
  if (!m) return null
  const sub = m[3] ?? ''
  let pkgDir = null
  let dir = dirname(fromFile)
  for (;;) {
    const cand = join(dir, 'node_modules', m[1], m[2])
    if (existsSync(cand)) {
      pkgDir = realpathSync(cand)
      break
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  if (!pkgDir) return null
  const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'))
  for (const [key, val] of Object.entries(pkg.exports)) {
    const norm = key.startsWith('.') ? key.slice(1) : key
    const target = typeof val === 'string' ? val : val.default
    if (norm.includes('*')) {
      const [prefix, suffix] = norm.split('*')
      if (sub.startsWith(prefix) && sub.endsWith(suffix)) {
        const star = sub.slice(prefix.length, sub.length - suffix.length)
        return join(pkgDir, target.replace('*', star))
      }
    } else if (norm === sub) {
      return join(pkgDir, target)
    }
  }
  return null
}

/** 收集入口的静态 import 可达闭包（去重），返回文件绝对路径数组 */
function collectGraph(entry) {
  const visited = new Set()
  const order = []
  const stack = [entry]
  while (stack.length) {
    const file = stack.pop()
    if (visited.has(file)) continue
    visited.add(file)
    order.push(file)
    const code = readFileSync(file, 'utf8')
    for (const spec of extractSpecs(code)) {
      const abs = resolveSpec(spec, file)
      if (abs) stack.push(abs)
    }
  }
  return order
}

/** 测量一组文件：数量 + raw/gzip/brotli 字节（逐文件求和） */
function measureFiles(files) {
  let raw = 0
  let gz = 0
  let br = 0
  for (const f of files) {
    const buf = readFileSync(f)
    raw += buf.length
    gz += gzip(buf)
    br += brotli(buf)
  }
  return { files: files.length, rawBytes: raw, gzipBytes: gz, brotliBytes: br }
}

/** 遍历目录收集 .js 文件（含子目录，排除 .map/.d.ts）；exts 可放宽，供裸导入扫描覆盖 .mjs/.cjs */
function collectJs(dir, exts = ['.js']) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      out.push(...collectJs(full, exts))
    } else if (exts.some((ext) => full.endsWith(ext))) {
      out.push(full)
    }
  }
  return out
}

// ---------- 门禁核心函数（纯函数，`--self-test` 覆盖） ----------
// 模块说明符合法字符集：不含空白/引号/括号/逗号——`from` 出现在字符串或属性名里
// （如 `setAttribute("data-from", …)`）时，正则捕获到的不是模块说明符，靠这道形状检查挡掉。
const MODULE_SPECIFIER_RE = /^[A-Za-z0-9@_.~:/+-]+$/
// `from` 紧贴这些字符时不是模块导入（`"from"` 属性名 / `data-from` / `obj.from`）
const INVALID_BEFORE_FROM = new Set(['"', "'", '-', '.', '`'])

/**
 * 已声明的外部依赖例外（唯一权威；改动必须同步 docs/engineering.md 的「零第三方」口径）。
 * 约束：按「包 + 说明符」精确匹配，不做包名前缀放宽。
 */
const EXTERNAL_IMPORT_ALLOW = [
  {
    pkg: 'ssr',
    spec: 'happy-dom',
    reason: '服务端 DOM shim：仅 @oas-ui/ssr 在 Node 端渲染时安装全局 DOM，不进浏览器产物',
  },
  {
    pkg: 'next',
    spec: 'react',
    reason: 'Next.js 适配器 peer 依赖：构建/服务端渲染时由宿主提供',
  },
  {
    pkg: 'next',
    spec: 'react-dom/server',
    reason: 'Next.js 适配器 peer 依赖：服务端静态渲染入口，由宿主提供',
  },
  {
    pkg: 'nuxt',
    spec: '@nuxt/kit',
    reason: 'Nuxt 模块适配器 peer 依赖：构建期由 Nuxt 提供',
  },
]
/** 允许使用 `node:` 内建模块的包（Node 端运行时包） */
const NODE_BUILTIN_PKGS = new Set(['ssr'])

function isDeclaredExternal(pkg, spec) {
  if (NODE_BUILTIN_PKGS.has(pkg) && spec.startsWith('node:')) return true
  return EXTERNAL_IMPORT_ALLOW.some((allow) => allow.pkg === pkg && allow.spec === spec)
}

/** 提取静态 import 说明符及其位置（区分 from 子句与副作用导入，供裸导入判定使用） */
function extractSpecifiers(code) {
  const out = []
  for (const [re, anchored] of [
    [FROM_RE, false],
    [SIDE_IMPORT_RE, true],
  ]) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(code))) out.push({ spec: m[1], index: m.index, anchored })
  }
  return out
}

/**
 * 判定一段发布产物代码里的「未解析裸导入」。
 * 返回违规说明符数组（去重）；相对导入与 @oas-ui/* 工作区包不算外部依赖。
 */
function staticImportViolations(code, pkg) {
  const out = []
  const seen = new Set()
  for (const { spec, index, anchored } of extractSpecifiers(code)) {
    if (!spec || spec.startsWith('.') || spec.startsWith('@oas-ui/')) continue
    if (!anchored && INVALID_BEFORE_FROM.has(code[index - 1])) continue
    if (!MODULE_SPECIFIER_RE.test(spec)) continue
    if (isDeclaredExternal(pkg, spec)) continue
    if (seen.has(spec)) continue
    seen.add(spec)
    out.push(spec)
  }
  return out
}

/** 自测：`node scripts/perf/size.mjs --self-test`（不跑体积测量；`pnpm perf:size` 会先跑它，判定函数红绿两侧因此进 CI） */
function runSelfTest() {
  const results = []
  const check = (name, actual, expected) => {
    const ok = actual === expected
    results.push({ name, ok })
    console.log(`${ok ? 'PASS' : 'FAIL'} [self-test] ${name}${ok ? '' : `：期望 ${expected}，实得 ${actual}`}`)
  }
  // 任务 A：裸导入门禁
  check('相对导入放行', staticImportViolations("import './dep.js'", 'ui').length, 0)
  check('@oas-ui 工作区包放行', staticImportViolations("import { x } from '@oas-ui/core'", 'ui').length, 0)
  check('未声明裸导入报错', staticImportViolations("import pad from 'left-pad'", 'ui').join(','), 'left-pad')
  check('副作用裸导入报错', staticImportViolations("import 'polyfill-x'", 'ui').join(','), 'polyfill-x')
  check(
    'happy-dom 在 ui 包报错',
    staticImportViolations("import { Window } from 'happy-dom'", 'ui').join(','),
    'happy-dom',
  )
  check(
    'happy-dom 在 ssr 包放行（已声明例外）',
    staticImportViolations("import { Window } from 'happy-dom'", 'ssr').length,
    0,
  )
  check('node: 内建在 ssr 包放行', staticImportViolations("import { readFileSync } from 'node:fs'", 'ssr').length, 0)
  check(
    'node: 内建在浏览器包报错',
    staticImportViolations("import { readFileSync } from 'node:fs'", 'ui').join(','),
    'node:fs',
  )
  check(
    '字符串/属性名中的 from 不误报',
    staticImportViolations('n.setAttribute("data-from", t.task.id)\nconst v = el.getAttribute("from")', 'ui').length,
    0,
  )

  const failed = results.filter((r) => !r.ok)
  if (failed.length) {
    console.error(`[perf:size] self-test 失败 ${failed.length}/${results.length} 项`)
    process.exit(1)
  }
  console.log(`[perf:size] self-test 通过 ${results.length}/${results.length} 项`)
  process.exit(0)
}

if (process.argv.includes('--self-test')) runSelfTest()

// ---------- 预检：dist 必须先构建 ----------
if (!existsSync(join(UI_DIST, 'index.js'))) {
  console.error('[perf:size] packages/ui/dist 未构建，请先运行 `pnpm build` 再测体积。')
  process.exit(1)
}

// ---------- 1. 各包发布体积 ----------
console.log('=== 各包发布体积 ===')

/** dist 全部文件原始字节（发布物含 map/d.ts，体积口径之一） */
function dirTotalRaw(dir) {
  let total = 0
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) total += dirTotalRaw(full)
    else total += statSync(full).size
  }
  return total
}

/** 包内全部浏览器可加载 JS（不含 .map/.d.ts）的 raw/gzip 求和 */
function packageJsMeasure(pkgDir) {
  const files = collectJs(join(ROOT, 'packages', pkgDir, 'dist'))
  return measureFiles(files)
}

const uiDistTotal = dirTotalRaw(UI_DIST)
const uiJs = packageJsMeasure('ui')
const core = packageJsMeasure('core')
const i18n = packageJsMeasure('i18n')
const ssr = packageJsMeasure('ssr')
const icons = packageJsMeasure('icons')

const themeCss = readFileSync(join(ROOT, 'packages/theme/index.css'))
const theme = {
  rawBytes: themeCss.length,
  gzipBytes: gzip(themeCss),
  brotliBytes: brotli(themeCss),
}
// 动态流动感运行时（theme 包的可选 JS 层，独立预算档）
const glassFluid = readFileSync(join(ROOT, 'packages/theme/glass-fluid.js'))
const fluidJs = {
  rawBytes: glassFluid.length,
  gzipBytes: gzip(glassFluid),
  brotliBytes: brotli(glassFluid),
}
// 玻璃静态层 / 皮肤层（theme 包的可选 CSS 层，独立预算档）
const readCss = (name) => {
  const buf = readFileSync(join(ROOT, `packages/theme/${name}`))
  return { rawBytes: buf.length, gzipBytes: gzip(buf), brotliBytes: brotli(buf) }
}
const glassCss = readCss('glass.css')
const skinsCss = readCss('skins.css')
/** 可选层文件（不得泄漏进任何基础链闭包；见文末「可选层零泄漏」断言） */
const OPTIONAL_LAYER_FILES = ['packages/theme/glass-fluid.js', 'packages/theme/glass.css', 'packages/theme/skins.css']

// ui 全量入口链：`import '@oas-ui/ui'`（dist/index.js）的实际加载集合
const fullEntryGraph = collectGraph(join(UI_DIST, 'index.js'))
const fullEntry = {
  ...measureFiles(fullEntryGraph),
  fileList: fullEntryGraph.map((f) => relative(ROOT, f).replaceAll('\\', '/')),
}

// dist/cdn.js 单文件 IIFE bundle
const cdnBuf = readFileSync(join(UI_DIST, 'cdn.js'))
const cdn = {
  files: 1,
  rawBytes: cdnBuf.length,
  gzipBytes: gzip(cdnBuf),
  brotliBytes: brotli(cdnBuf),
}

// ---------- 1.5 裸导入门禁（发布产物不得引入未声明的外部依赖） ----------
// 为什么必须显式报错：resolveSpec 只解析相对路径与 @oas-ui/*，外部裸导入一律返回 null，
// 图遍历会**静默跳过**——若 ui 链混入外部包，体积断言少算而不报红（门禁形同虚设）。
// 口径：允许相对导入、@oas-ui/* 工作区包、EXTERNAL_IMPORT_ALLOW 精确声明的例外；
// 其余裸导入 = FAIL，并列出说明符 + 文件。
// 覆盖边界：只查静态 import/export（与体积口径一致）；动态 import() 属运行时按需下载，不计入初始负载，
// 也不在本门禁范围。
function packageOfFile(file) {
  const rel = relative(join(ROOT, 'packages'), file).replaceAll('\\', '/')
  return rel.split('/')[0]
}

const publishedJs = [
  ...new Set([
    ...['ui', 'core', 'i18n', 'icons', 'ssr', 'next', 'nuxt'].flatMap((pkg) =>
      collectJs(join(ROOT, 'packages', pkg, 'dist'), ['.js', '.mjs', '.cjs']),
    ),
    join(ROOT, 'packages/theme/glass-fluid.js'),
  ]),
]

let fail = false
console.log('\n=== 裸导入门禁（发布产物：相对导入 + @oas-ui/* + 已声明例外） ===')
const importViolations = []
for (const file of publishedJs) {
  const pkg = packageOfFile(file)
  for (const spec of staticImportViolations(readFileSync(file, 'utf8'), pkg)) {
    importViolations.push({ file: relative(ROOT, file).replaceAll('\\', '/'), pkg, spec })
  }
}
if (importViolations.length) {
  fail = true
  for (const v of importViolations) {
    console.error(`FAIL [裸导入] ${v.file}：'${v.spec}'（所在包 @oas-ui/${v.pkg}）不是已声明外部依赖`)
  }
  console.error(
    '  未解析的依赖不会被计入体积（会少算而不报红）：改成相对/工作区导入，或在 EXTERNAL_IMPORT_ALLOW 声明并同步 docs/engineering.md',
  )
} else {
  console.log(`PASS 扫描 ${publishedJs.length} 个发布 JS 文件：无未声明外部依赖`)
}

const packageRows = [
  ['@oas-ui/ui (dist 总大小)', `${fmtBytes(uiDistTotal)}`, '', ''],
  ['@oas-ui/ui (浏览器可加载 JS)', `${uiJs.files} 文件`, fmtKB(uiJs.rawBytes), fmtKB(uiJs.gzipBytes)],
  ['@oas-ui/ui (全量入口链)', `${fullEntry.files} 文件`, fmtKB(fullEntry.rawBytes), fmtKB(fullEntry.gzipBytes)],
  ['@oas-ui/ui (dist/cdn.js)', '1 文件', fmtKB(cdn.rawBytes), fmtKB(cdn.gzipBytes)],
  ['@oas-ui/theme (index.css)', '1 文件', fmtKB(theme.rawBytes), fmtKB(theme.gzipBytes)],
  ['@oas-ui/core', `${core.files} 文件`, fmtKB(core.rawBytes), fmtKB(core.gzipBytes)],
  ['@oas-ui/i18n', `${i18n.files} 文件`, fmtKB(i18n.rawBytes), fmtKB(i18n.gzipBytes)],
  ['@oas-ui/icons', `${icons.files} 文件`, fmtKB(icons.rawBytes), fmtKB(icons.gzipBytes)],
  ['@oas-ui/ssr (Node 端)', `${ssr.files} 文件`, fmtKB(ssr.rawBytes), fmtKB(ssr.gzipBytes)],
]
console.log(`${'包'.padEnd(30)}${'文件'.padEnd(12)}${'raw'.padEnd(10)}gzip`)
for (const [name, files, raw, gz] of packageRows) {
  console.log(`${name.padEnd(30)}${files.padEnd(12)}${raw.padEnd(10)}${gz}`)
}

// ---------- 2. 单组件按需引入链 ----------
console.log('\n=== 单组件按需引入链（入口 + 依赖静态 import 闭包） ===')
const COMPONENT_ENTRIES = [
  { id: 'button', entry: 'basic/button', spec: '@oas-ui/ui/basic/button' },
  { id: 'table', entry: 'data/table', spec: '@oas-ui/ui/data/table' },
  { id: 'tableAdvanced', entry: 'data/table/advanced', spec: '@oas-ui/ui/data/table/advanced' },
  { id: 'tableFormat', entry: 'data/table/format', spec: '@oas-ui/ui/data/table/format' },
  { id: 'tableView', entry: 'data/table/view', spec: '@oas-ui/ui/data/table/view' },
  { id: 'tableRange', entry: 'data/table/range', spec: '@oas-ui/ui/data/table/range' },
  { id: 'tableHistory', entry: 'data/table/history', spec: '@oas-ui/ui/data/table/history' },
  { id: 'tableDetail', entry: 'data/table/detail', spec: '@oas-ui/ui/data/table/detail' },
  { id: 'form', entry: 'form/form', spec: '@oas-ui/ui/form/form' },
  { id: 'gantt', entry: 'data/gantt', spec: '@oas-ui/ui/data/gantt' },
  { id: 'jsonViewer', entry: 'data/json-viewer', spec: '@oas-ui/ui/data/json-viewer' },
  { id: 'diffViewer', entry: 'data/diff-viewer', spec: '@oas-ui/ui/data/diff-viewer' },
]
const componentMeasures = {}
for (const { id, entry } of COMPONENT_ENTRIES) {
  const files = collectGraph(join(UI_DIST, entry, 'index.js'))
  const m = measureFiles(files)
  componentMeasures[id] = {
    entry,
    spec: `@oas-ui/ui/${entry}`,
    ...m,
    fileList: files.map((f) => relative(ROOT, f).replaceAll('\\', '/')),
  }
  console.log(
    `${id.padEnd(8)} ${fmtKB(m.rawBytes)} raw / ${fmtKB(m.gzipBytes)} gzip / ${fmtKB(m.brotliBytes)} brotli（${m.files} 文件）`,
  )
}

// ---------- 3. 预算断言 ----------
// 预算依据：2026-08-12 首测值上浮 ~15%（再取整，留出组件/图标增长的合理余量）。
// 2026-09-09 重定档：能力增强批次全量落地后实测值上浮 ~15%（天花板制：防灾难性膨胀，
// 随版本能力增长重定档是既定机制——预算注释的设计即此）。
// 量纲：字节。超预算 → FAIL 非零退出，CI 拦截。
const BUDGETS = [
  {
    // 全量类预算 = 天花板制（2026-08-23 定夺）：组件能力持续增强，体积随之增长属预期内行为，
    // 天花板只为防灾难性膨胀；达 90% 预警线提前亮黄，触发时启动瘦身评估或再定档。
    // 增长纪律由单组件链预算（绝对值制）与按需叙事守住。
    name: 'dist/cdn.js gzip',
    get: () => cdn.gzipBytes,
    limit: 770 * 1024, // 770 KB 天花板（2026-10-08 重定档：workbench 批并入后实测 665.4 KB 触前档 90%）
    basis:
      '天花板制：实测 gzip 665.4 KB（并入 workbench 构件族后；含 gantt/barcode/chart 扩展/glass/图标 opt-in），上浮约 15% 定档 770 KB；前档 730 KB 定档于 2026-10-07（628.7 KB 实测），再前档 700 KB 定档于 2026-10-05（608.5 KB 实测）',
  },
  {
    name: '@oas-ui/ui 全量入口链 gzip',
    get: () => fullEntry.gzipBytes,
    limit: 1140 * 1024, // 1140 KB（≈1.11 MB）天花板（2026-10-08 重定档：workbench 批并入后实测 984.6 KB 触前档 90%）
    basis:
      '天花板制：实测 gzip 984.6 KB（并入 workbench 构件族后），上浮约 15% 定档 1140 KB；前档 1080 KB 定档于 2026-10-07（917.7 KB 实测），再前档 1024 KB 定档于 2026-10-05（890.9 KB 实测）',
  },
  {
    name: '@oas-ui/ui/basic/button 链 gzip',
    get: () => componentMeasures.button.gzipBytes,
    limit: 30 * 1024, // 30 KB（2026-10-12 重定档：dev-warn 统一告警通道入链，实测 26.7 KB）
    basis:
      '实测 gzip 26.7 KB（2026-10-12：dev-warn 统一告警通道（101 处 console.warn 迁移，含模块本体）+ 当批行为修复增量；此前 25.0 KB 为图标库 opt-in 后口径），上浮约 12% 定档 30 KB；前档 29 KB 定档于 2026-10-08（25.0 KB 实测），再前档 39 KB 定档于 2026-10-05（33.5 KB 实测，含全量图标注册表）',
  },
  {
    name: '@oas-ui/ui/data/table 链 gzip',
    get: () => componentMeasures.table.gzipBytes,
    limit: 74 * 1024, // 74 KB（2026-10-25：默认入口不含 edit，实测 65.0 KB）
    basis:
      '实测 gzip 65.0 KB（v2.6.4 默认入口 = 基础表格，不含 edit；链含 core 骨架 + virtual-list + i18n + pagination + 列设置/导出/移动降级，不含编辑器族），上浮约 14% 定档 74 KB；前档 108 KB 为默认入口含 edit 口径',
  },
  {
    name: '@oas-ui/ui/form/form 链 gzip',
    get: () => componentMeasures.form.gzipBytes,
    limit: 29 * 1024, // 29 KB（2026-10-07 重定档：四批后实测 25.6 KB 触前档 90%）
    basis:
      '实测 gzip 25.6 KB（四批合并后；含 core + i18n），上浮约 15% 定档 29 KB；前档 28 KB 定档于 2026-10-05（24.8 KB 实测）',
  },
  {
    name: '@oas-ui/ui/data/gantt 链 gzip',
    get: () => componentMeasures.gantt.gzipBytes,
    limit: 70 * 1024, // 70 KB（v2.6.2 重定档：任务管理/约束/日历/列虚拟化等能力增量）
    basis:
      'v2.6.2 重定档：实测 gzip 61.1 KB（gantt 任务管理/依赖编辑/约束/工作日日历/列虚拟化/多选等能力增量，链含 core + i18n + virtual-list）；上浮约 15% 定档 70 KB。前一档 46 KB 定档于 2026-10-07（实测 39.6 KB）',
  },
  {
    name: '@oas-ui/ui/data/json-viewer 链 gzip',
    get: () => componentMeasures.jsonViewer.gzipBytes,
    limit: 35 * 1024, // 35 KB：实测 gzip 31.5 KB（core + i18n + 组件，无第三方运行时），上浮约 10%
    basis:
      '实测 gzip 31.5 KB（链含 core + i18n + 树模型/虚拟窗口/工具栏/搜索/复制/复制浮层；无第三方运行时、无图标全量注册），上浮约 10% 定档 35 KB；PRD 目标 ≤32 KB。',
  },
  {
    name: '@oas-ui/ui/data/diff-viewer 链 gzip',
    get: () => componentMeasures.diffViewer.gzipBytes,
    limit: 34 * 1024, // 34 KB：实测 gzip 29.9 KB（core + i18n + 自研 Myers/折叠/并排），上浮约 14%
    basis:
      '实测 gzip 30.6 KB（链含 core + i18n + 自研 Myers 行级差异/词级高亮/折叠/并排/虚拟窗口；无第三方 diff 依赖、无图标全量注册），上浮约 11% 定档 34 KB；PRD 目标 ≤32 KB。',
  },
  {
    name: '@oas-ui/theme index.css gzip',
    get: () => theme.gzipBytes,
    limit: 4 * 1024, // 4 KB（2026-10-05 重定档：skins.css 皮肤层变量 + 阴影精修，实测 3.52 KB）
    basis:
      '实测 gzip 3.52 KB（skins 皮肤层变量族 + 阴影双层精修后），上浮约 15%；前档 3.5 KB 定档于 2026-09-15（3.0 KB 实测）',
  },
  {
    name: '@oas-ui/theme glass-fluid.js gzip',
    get: () => fluidJs.gzipBytes,
    limit: 8.5 * 1024, // 8.5 KB（2026-10-07 重定档：B 档 + 修复批后实测 7.81 KB）
    basis:
      '实测 gzip 8.0 KB（B 档 + 修复批：注册表 + 注入样式表并入运行时——ui 包相应减少同量玻璃规则体；高光层改「surface 背景之上、文字之下」，补 .box 基态/命中成对、isolation:isolate、z-index:-1、禁用守卫（含链接形态 aria-disabled，且同时 background/box-shadow:none）、实心按钮 hover 高光 + 按压边缘内描边（:where 归零特异性）、全根观察 + 帧内 prune 防泄漏）。已达 WARN 预警线：评估后**暂不瘦身 / 不重定档**（增幅为上述合理增量的正常结果，无冗余可清）；再次加功能前先瘦身。前档 4.5 / 4 KB 首次定档于 2026-10-07（3.6 / 2.97 KB 实测）（指针镜面高光运行时：监听/命中/坐标/rAF/守卫/清理）',
  },
  {
    name: '@oas-ui/theme glass.css gzip',
    get: () => glassCss.gzipBytes,
    limit: 6 * 1024, // 6 KB（可选玻璃静态层，首次定档 2026-10-08；实测约 4.42 KB）
    basis:
      '实测 gzip 约 3.04 KB（玻璃静态层：surface 半透明 token + 折光边 + 阴影；独立可选，不进 union），保留 6 KB 上限',
  },
  {
    name: '@oas-ui/theme skins.css gzip',
    get: () => skinsCss.gzipBytes,
    limit: 2 * 1024, // 2 KB（可选皮肤层，首次定档 2026-10-08；实测约 0.91 KB）
    basis: '实测 gzip 约 0.91 KB（皮肤层变量族：预设色板皮肤档；独立可选，不进 union），上浮定档 2 KB',
  },
  {
    name: '@oas-ui/ui/data/table/advanced 链 gzip',
    get: () => componentMeasures.tableAdvanced.gzipBytes,
    limit: 8 * 1024,
    basis:
      '实测 gzip 6.9 KB（透视 / 公式 / 查询 / 条件格式 / TSV / 历史栈 / windowed 数据源纯函数，无表单控件与 table 运行时依赖），上浮约 16% 定档 8 KB',
  },
  {
    name: '@oas-ui/ui/data/table/format 链 gzip',
    get: () => componentMeasures.tableFormat.gzipBytes,
    limit: 6 * 1024, // 6 KB（2026-10-25 首次定档：实测 4.7 KB）
    basis: '实测 gzip 4.7 KB（条件格式 capability + 规则引擎，无表单控件；不进入 table 默认链），上浮约 27% 定档 6 KB',
  },
  {
    name: '@oas-ui/ui/data/table/view 链 gzip',
    get: () => componentMeasures.tableView.gzipBytes,
    limit: 1.5 * 1024, // 1.5 KB（2026-10-25 首次定档：实测 0.6 KB）
    basis: '实测 gzip 0.6 KB（视图状态捕获/应用纯函数，无 table 运行时依赖），上浮定档 1.5 KB',
  },
  {
    name: '@oas-ui/ui/data/table/range 链 gzip',
    get: () => componentMeasures.tableRange.gzipBytes,
    limit: 6 * 1024,
    basis:
      '实测 gzip 5.2 KB（区域选择 capability + 键锚定 + roving tabindex + 交互宿主穿透 + TSV 复制/粘贴），上浮约 16% 定档 6 KB',
  },
  {
    name: '@oas-ui/ui/data/table/history 链 gzip',
    get: () => componentMeasures.tableHistory.gzipBytes,
    limit: 3.5 * 1024,
    basis:
      '实测 gzip 2.9 KB（撤销/重做栈 + oas-edit 行键/原类型回写 + 树形子行递归 + 交互宿主穿透），上浮约 21% 定档 3.5 KB',
  },
  {
    name: '@oas-ui/ui/data/table/detail 链 gzip',
    get: () => componentMeasures.tableDetail.gzipBytes,
    limit: 3.5 * 1024,
    basis:
      '实测 gzip 2.9 KB（主从详情宿主侧 helper + 树形行定位 / 焦点兜底 / 交互宿主穿透，无 table 运行时依赖），上浮约 21% 定档 3.5 KB',
  },
]

console.log('\n=== 体积预算断言（全量类=天花板制；单组件链/theme=绝对值制；90% 预警线） ===')
const WARN_RATIO = 0.9
const budgetResults = []
for (const b of BUDGETS) {
  const actual = b.get()
  const ok = actual <= b.limit
  const warnAtBytes = Math.round(b.limit * WARN_RATIO)
  const warn = ok && actual >= warnAtBytes
  if (!ok) fail = true
  const status = ok ? (warn ? 'WARN' : 'PASS') : 'FAIL'
  console.log(
    `${status} ${b.name.padEnd(42)} ${fmtBytes(actual).padStart(10)} / 预算 ${fmtBytes(b.limit)}（预警线 ${fmtBytes(warnAtBytes)}）（依据：${b.basis}）`,
  )
  budgetResults.push({
    name: b.name,
    actualBytes: actual,
    limitBytes: b.limit,
    warnAtBytes,
    pass: ok,
    warn,
    basis: b.basis,
  })
}

// ---------- 3.1 /core 链 ----------
// 自 v2.6.4 起 table/core 是默认入口的 deprecated 别名（v2.6.5 移除），不再单独计量；
// 原先「core 严格小于 table」的断言随双入口语义一并退役，避免别名与主入口等量时误报。

// ---------- 3.2 Pro 子路径零泄漏：默认 table 链不得包含 advanced/format/view/range/history/detail ----------
for (const [id, segment] of [
  ['tableAdvanced', 'advanced'],
  ['tableFormat', 'format'],
  ['tableView', 'view'],
  ['tableRange', 'range'],
  ['tableHistory', 'history'],
  ['tableDetail', 'detail'],
]) {
  const leaked = componentMeasures.table.fileList.filter((file) => file.includes(`data/table/${segment}/`))
  if (leaked.length > 0) {
    fail = true
    console.error(`FAIL [Pro 零泄漏] table 默认链包含 ${id}：${leaked.join(', ')}`)
  } else {
    console.log(`PASS [Pro 零泄漏] table 默认链不含 ${id}`)
  }
}

// ---------- 4. 写入基线（默认只测不写：基线是入库文件，见头部说明） ----------
if (process.argv.includes('--update-baseline')) {
  writeSection('size', {
    generatedAt: today(),
    method:
      'gzip = zlib gzipSync；brotli = zlib.brotliCompressSync q11；单组件链 = 静态 import 图遍历 + 逐文件压缩求和（上界估计）',
    packages: {
      '@oas-ui/ui': {
        distTotalBytes: uiDistTotal,
        browserJs: uiJs,
        fullEntry,
        cdn,
      },
      '@oas-ui/theme': { indexCss: theme },
      '@oas-ui/core': core,
      '@oas-ui/i18n': i18n,
      '@oas-ui/icons': icons,
      '@oas-ui/ssr': ssr,
    },
    components: componentMeasures,
    budgets: budgetResults,
  })

  console.log(`\n基线已写入 docs/perf-baseline.json`)
} else {
  console.log(`\n[perf:size] 仅测量，未改写入库基线（确需更新请加 --update-baseline）`)
}
// ---------- 可选层零泄漏断言（结构断言：可选层文件不得出现在任何基础链闭包） ----------
const baseChainFiles = {
  全量入口链: fullEntry.fileList,
  ...Object.fromEntries(Object.entries(componentMeasures).map(([id, m]) => [`${id} 链`, m.fileList])),
}
let leaked = false
for (const [chain, list] of Object.entries(baseChainFiles)) {
  const hit = OPTIONAL_LAYER_FILES.filter((f) => list.includes(f))
  if (hit.length) {
    leaked = true
    console.error(`FAIL [可选层泄漏] ${chain} 含可选层文件：${hit.join(', ')}`)
  }
  // 图标全量注册表不得进入**按需组件链**（opt-in 图标库：组件链只应走 runtime/lookupIcon 或精确 path；
  // 全量入口链内含有属预期——它经 `@oas-ui/icons/register` 注册全量集以开箱即用）
  if (chain !== '全量入口链' && list.includes('packages/icons/dist/registry.js')) {
    leaked = true
    console.error(`FAIL [图标税] ${chain} 含图标全量注册表 registry.js（应走 runtime + 精确 path）`)
  }
}
if (leaked) fail = true

if (fail) {
  console.error('[perf:size] 存在超预算项，性能门槛未通过。')
  process.exit(1)
}
