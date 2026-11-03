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
 *   - 已移除入口零残留：`data/table/core` 别名已删除（DEP-EXPORT-0001），dist 不得残留。
 *   - L3 分层登记（lib/l3-registry.mjs 单一登记表）：注册型 L3 必须含于 L1 与所属 CDN
 *     族包（族包 sourcemap 构建输入 = 真实静态图）、纯函数/宿主 helper 型 L3 不得混入
 *     L1/族包、默认 table 链零 L3（含 edit）、登记为 measured 的 L3（table 家族 +
 *     layout/scroll-area/infinite）独立计量且各有独立预算档。
 *   - 性能档案一致性（lib/baseline-docs.mjs）：perf-baseline.md 生成块 ↔ JSON、JSON ↔
 *     渲染阈值库、JSON env ↔ 实装 happy-dom 版本、JSON 预算 pass 自洽——只报红不自动刷新，
 *     刷新走 `perf:size/bench --update-baseline` + `pnpm perf:docs`；`perf:size
 *     --update-baseline` 会顺带把 render.env.happyDom 独立同步为实装版本（不动渲染耗时数据）。
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
import { pathToFileURL } from 'node:url'
import { gzipSync, brotliCompressSync, constants } from 'node:zlib'
import {
  ROOT,
  BASELINE_PATH,
  loadBaseline,
  saveBaseline,
  writeSection,
  fmtKB,
  fmtBytes,
  today,
} from './lib/baseline.mjs'
import {
  L3_REGISTRY,
  l1InclusionViolations,
  familyInclusionViolations,
  proLeakViolations,
  budgetCoverageViolations,
  registryFamilies,
} from './lib/l3-registry.mjs'
import { checkPerfDocs } from './lib/baseline-docs.mjs'
import { happyDomLabel } from './lib/render-budgets.mjs'

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

/**
 * 只把 `render.env.happyDom` 刷新为实装版本，其余 render 数据（generatedAt/scenarios/
 * budgets/耗时）一律不动——happy-dom 升版后 `perf:size --update-baseline` 可独立消除
 * env 漂移，不必为了一个版本号跑 perf:bench 重写全部耗时测量（避免测量噪声进基线）。
 * 返回是否发生了修改；无 render 节（从未跑过 perf:bench）时不创建、返回 false。
 */
function patchRenderHappyDom(baseline, label) {
  const env = baseline.render?.env
  if (!env || env.happyDom === label) return false
  baseline.render.env = { ...env, happyDom: label }
  return true
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

  // 任务 B：L3 分层登记判定（红绿两侧；判定函数来自 lib/l3-registry.mjs，live dist 断言见主流程 3.2/3.3）
  {
    const TREG = [
      { id: 'tE', entry: 'data/table/edit', kind: 'capability', measured: true },
      { id: 'tA', entry: 'data/table/advanced', kind: 'helper', measured: true },
    ]
    const reasons = (violations) => violations.map((v) => `${v.item.id}:${v.reason}`).join(',')
    check('L1 包含：capability 在链内放行', l1InclusionViolations(TREG, ['p/ui/dist/data/table/edit/x.js']).length, 0)
    check('L1 包含：capability 缺席报 missing', reasons(l1InclusionViolations(TREG, [])), 'tE:missing')
    check(
      'L1 包含：helper 混入 union 报 leaked（capability 缺席一并报）',
      reasons(l1InclusionViolations(TREG, ['p/ui/dist/data/table/advanced/x.js'])),
      'tE:missing,tA:leaked',
    )
    check(
      'L1 包含：Windows 反斜杠路径归一后判定',
      l1InclusionViolations(TREG, ['p\\ui\\dist\\data\\table\\edit\\x.js']).length,
      0,
    )
    check(
      'L2 零泄漏：默认链含 edit 报 leaked',
      reasons(proLeakViolations(TREG, ['p/ui/dist/data/table/edit/index.js'])),
      'tE:leaked',
    )
    check('L2 零泄漏：默认链干净放行', proLeakViolations(TREG, ['p/ui/dist/data/table/index.js']).length, 0)
    check(
      '独立预算：measured 未测量/未预算报双违规',
      reasons(budgetCoverageViolations(TREG, ['tA'], ['tA'])),
      'tE:unmeasured,tE:no-budget',
    )
    check('独立预算：已测量已预算放行', budgetCoverageViolations(TREG, ['tE', 'tA'], ['tE', 'tA']).length, 0)
    // CDN 族包包含关系（真实静态图 = 族包 sourcemap 的构建输入 sources）
    {
      const TREG_FAM = [
        { id: 'tE', entry: 'data/table/edit', family: 'data', kind: 'capability', measured: true },
        { id: 'tA', entry: 'data/table/advanced', family: 'data', kind: 'helper', measured: true },
      ]
      const FAM_OK = { data: ['../../src/data/table/edit/index.ts', '../../src/data/table/index.ts'] }
      const famReasons = (violations) => violations.map((v) => `${v.item.id}@${v.family}:${v.reason}`).join(',')
      check('族包包含：capability 在族包构建输入放行', familyInclusionViolations(TREG_FAM, FAM_OK).length, 0)
      check(
        '族包包含：capability 缺席族包报 missing',
        famReasons(familyInclusionViolations(TREG_FAM, { data: ['../../src/data/table/index.ts'] })),
        'tE@data:missing',
      )
      check(
        '族包包含：helper 混入族包报 leaked',
        famReasons(
          familyInclusionViolations(TREG_FAM, { data: [...FAM_OK.data, '../../src/data/table/advanced/pivot.ts'] }),
        ),
        'tA@data:leaked',
      )
      check(
        '族包包含：sourcemap 不可解析（键存在但非数组）报 no-map',
        famReasons(familyInclusionViolations(TREG_FAM, { data: null })),
        'tE@data:no-map,tA@data:no-map',
      )
      check(
        '族包包含：Windows 反斜杠 sources 归一后判定',
        // 拼接构造盘符路径（约定守卫禁硬编码绝对路径字面量）
        familyInclusionViolations(TREG_FAM, { data: ['D:' + '\\repo\\packages\\ui\\src\\data\\table\\edit\\index.ts'] })
          .length,
        0,
      )
      check(
        '族包包含：条目缺 family 报 missing-family（不静默跳过）',
        famReasons(
          familyInclusionViolations([{ id: 'tN', entry: 'data/table/view', kind: 'helper', measured: false }], FAM_OK),
        ),
        'tN@null:missing-family',
      )
      check(
        '族包包含：未知 family 报 unknown-family（收集清单与登记表脱节）',
        famReasons(familyInclusionViolations(TREG_FAM, { other: [] })),
        'tE@data:unknown-family,tA@data:unknown-family',
      )
      check(
        '族包清单：registryFamilies 派生去重保序（缺 family 不产生族）',
        registryFamilies([{ family: 'b' }, { family: 'a' }, { family: 'b' }, { id: 'x' }]).join(','),
        'b,a',
      )
    }
    // render.env.happyDom 独立刷新（perf:size --update-baseline 不重写渲染测量数据）
    {
      const baseline = {
        render: {
          generatedAt: '2026-10-28',
          env: { runtime: 'node v26', happyDom: 'happy-dom@20.x', iterations: 100 },
          scenarios: { 'select-options-update': { medianMs: 4.9, p95Ms: 59.8 } },
          budgets: [{ id: 'select-options-update', budgetMs: 160 }],
        },
      }
      check('env 刷新：旧版本被更新', patchRenderHappyDom(baseline, 'happy-dom@21.0.3'), true)
      check('env 刷新：happyDom 已更新', baseline.render.env.happyDom, 'happy-dom@21.0.3')
      check('env 刷新：scenarios 原值未动', baseline.render.scenarios['select-options-update'].p95Ms, 59.8)
      check(
        'env 刷新：budgets/generatedAt 未动',
        `${baseline.render.generatedAt}/${baseline.render.budgets[0].budgetMs}`,
        '2026-10-28/160',
      )
      const same = { render: { env: { happyDom: 'happy-dom@21.0.3' }, scenarios: {} } }
      check('env 刷新：已一致时不动并返回 false', patchRenderHappyDom(same, 'happy-dom@21.0.3'), false)
      const noRender = { size: {} }
      check('env 刷新：无 render 节时不创建', patchRenderHappyDom(noRender, 'happy-dom@21.0.3'), false)
      check('env 刷新：无 render 节时基线未被改动', noRender.render, undefined)
    }
  }

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

// ---------- 1.6 CDN 默认文案完整性（回归锁，2026-10-31） ----------
// 旧 i18n 入口只有 re-export 语句：裸 `import '@oas-ui/i18n'` 在打包时整模块被摇掉，
// CDN 消费者拿到空 defaultMessages（全部 raw key）——现改为「值导入 + registerDefaultMessages」。
// 本断言锁定 dist/cdn.js 里确实带每个家族切片的文案（防未来再动 sideEffects / CDN alias 时复发）。
{
  const CDN_SLICE_FAMILIES = [
    'basic',
    'conversation',
    'data',
    'feedback',
    'form',
    'framework',
    'layout',
    'navigation',
    'workbench',
  ]
  const cdnText = cdnBuf.toString('utf8')
  const missing = []
  for (const family of CDN_SLICE_FAMILIES) {
    try {
      const mod = await import(pathToFileURL(join(ROOT, 'packages/i18n/dist/slices', `${family}.js`)).href)
      const messages = mod[`${family}Messages`] ?? {}
      const [key, value] = Object.entries(messages)[0] ?? []
      if (!key) missing.push(`${family}：切片为空或未导出 ${family}Messages`)
      else if (typeof value !== 'string' || !cdnText.includes(value)) {
        missing.push(`${family}：${key} 的文案不在 dist/cdn.js`)
      }
    } catch (error) {
      missing.push(`${family}：无法读取 i18n 切片 dist（${String(error?.message ?? error).slice(0, 120)}）`)
    }
  }
  if (missing.length) {
    fail = true
    console.error(`FAIL [CDN 默认文案] ${missing.join('；')}`)
  } else {
    console.log('PASS [CDN 默认文案] 9 个家族切片的文案均在 dist/cdn.js')
  }
}

// ---------- 1.7 i18n 公共入口的注册调用（防「只副作用 import → 打包后文案全丢」） ----------
// 入口必须形成「值导入 + 显式 registerDefaultMessages 调用」的产物；纯副作用 import 会被
// 打包器按 sideEffects 摇掉（2026-10-31 实测：公共入口因此整体丢文案、渲染 raw key）。
{
  const idx = readFileSync(join(ROOT, 'packages/i18n/dist/index.js'), 'utf8')
  const calls = (idx.match(/registerDefaultMessages\(/g) ?? []).length
  if (calls < 9) {
    fail = true
    console.error(
      `FAIL [i18n 主入口] dist/index.js 只有 ${calls} 次 registerDefaultMessages 调用（应 ≥ 9）——公共入口默认文案会丢`,
    )
  } else {
    console.log(`PASS [i18n 主入口] dist/index.js 含 ${calls} 次显式注册调用（值导入，不依赖副作用）`)
  }
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
  // table/edit：注册型 L3（import 即注册编辑能力）；v2.6.4 起默认 table 不含 edit，
  // L1/CDN 显式包含——独立计量是「默认不含 edit/Pro」叙事的量化前提（L3 登记表驱动）
  { id: 'tableEdit', entry: 'data/table/edit', spec: '@oas-ui/ui/data/table/edit' },
  {
    id: 'tableStructuralRender',
    entry: 'data/table/structural-render',
    spec: '@oas-ui/ui/data/table/structural-render',
  },
  { id: 'tableAdvanced', entry: 'data/table/advanced', spec: '@oas-ui/ui/data/table/advanced' },
  { id: 'tableFormat', entry: 'data/table/format', spec: '@oas-ui/ui/data/table/format' },
  { id: 'tableView', entry: 'data/table/view', spec: '@oas-ui/ui/data/table/view' },
  { id: 'tableRange', entry: 'data/table/range', spec: '@oas-ui/ui/data/table/range' },
  { id: 'tableHistory', entry: 'data/table/history', spec: '@oas-ui/ui/data/table/history' },
  { id: 'tableDetail', entry: 'data/table/detail', spec: '@oas-ui/ui/data/table/detail' },
  // table 数据加工 helper 型 L3（细分职责拆包）：透视 / 值格式化 / 查询纯函数子路径
  { id: 'tablePivot', entry: 'data/table/pivot', spec: '@oas-ui/ui/data/table/pivot' },
  { id: 'tableValueFormat', entry: 'data/table/value-format', spec: '@oas-ui/ui/data/table/value-format' },
  { id: 'tableQuery', entry: 'data/table/query', spec: '@oas-ui/ui/data/table/query' },
  // layout 家族 helper 型 L3：无限滚动 headless 控制器（不进 L1/layout 族包）
  {
    id: 'infiniteScroll',
    entry: 'layout/scroll-area/infinite',
    spec: '@oas-ui/ui/layout/scroll-area/infinite',
  },
  // data 家族 helper 型 L3：gantt / resource 纯函数子路径（不进 L1/data 族包，显式 import 按需函数）
  { id: 'ganttExport', entry: 'data/gantt/export', spec: '@oas-ui/ui/data/gantt/export' },
  { id: 'ganttEvm', entry: 'data/gantt/evm', spec: '@oas-ui/ui/data/gantt/evm' },
  { id: 'ganttAlap', entry: 'data/gantt/alap', spec: '@oas-ui/ui/data/gantt/alap' },
  { id: 'ganttRecurring', entry: 'data/gantt/recurring', spec: '@oas-ui/ui/data/gantt/recurring' },
  { id: 'resourceCost', entry: 'data/resource/cost', spec: '@oas-ui/ui/data/resource/cost' },
  { id: 'resourcePool', entry: 'data/resource/pool', spec: '@oas-ui/ui/data/resource/pool' },
  { id: 'resourceLoad', entry: 'data/resource/load', spec: '@oas-ui/ui/data/resource/load' },
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
    // kind 参与生成文档与 JSON 自洽校验（ceiling=天花板制 / absolute=绝对值制）。
    name: 'dist/cdn.js gzip',
    kind: 'ceiling',
    get: () => cdn.gzipBytes,
    limit: 770 * 1024, // 770 KB 天花板（2026-10-08 重定档：workbench 批并入后实测 665.4 KB 触前档 90%）
    basis:
      '天花板制：实测 gzip 665.4 KB（并入 workbench 构件族后；含 gantt/barcode/chart 扩展/glass/图标 opt-in），上浮约 15% 定档 770 KB；前档 730 KB 定档于 2026-10-07（628.7 KB 实测），再前档 700 KB 定档于 2026-10-05（608.5 KB 实测）',
  },
  {
    name: '@oas-ui/ui 全量入口链 gzip',
    kind: 'ceiling',
    get: () => fullEntry.gzipBytes,
    limit: 1140 * 1024, // 1140 KB（≈1.11 MB）天花板（2026-10-08 重定档：workbench 批并入后实测 984.6 KB 触前档 90%）
    basis:
      '天花板制：实测 gzip 984.6 KB（并入 workbench 构件族后），上浮约 15% 定档 1140 KB；前档 1080 KB 定档于 2026-10-07（917.7 KB 实测），再前档 1024 KB 定档于 2026-10-05（890.9 KB 实测）；2026-11-03 core 子路径导入批后实测 1015.4 KB（逐文件上界口径随子路径拆分的文件数微涨 +0.7 KB 属求和特性；真实 bundler 打包下非表单链普遍 -5.9~-6.7 KB）',
  },
  {
    name: '@oas-ui/ui/basic/button 链 gzip',
    kind: 'absolute',
    componentId: 'button',
    get: () => componentMeasures.button.gzipBytes,
    limit: 30 * 1024, // 30 KB（2026-10-12 重定档：dev-warn 统一告警通道入链，实测 26.7 KB）
    basis:
      '实测 gzip 26.7 KB（2026-10-12：dev-warn 统一告警通道（101 处 console.warn 迁移，含模块本体）+ 当批行为修复增量；此前 25.0 KB 为图标库 opt-in 后口径），上浮约 12% 定档 30 KB；前档 29 KB 定档于 2026-10-08（25.0 KB 实测），再前档 39 KB 定档于 2026-10-05（33.5 KB 实测，含全量图标注册表）；2026-11-03 core 子路径导入批后实测 19.5 KB（内部源码改走 core 模块子路径绕开 barrel，button 值链只携带 oas-element/escape/config-context）',
  },
  {
    name: '@oas-ui/ui/data/table 链 gzip',
    kind: 'absolute',
    componentId: 'table',
    get: () => componentMeasures.table.gzipBytes,
    limit: 74 * 1024, // 74 KB（2026-10-25：默认入口不含 edit，实测 65.0 KB）
    basis:
      '实测 gzip 66.2 KB（v2.6.4 默认入口 = 基础表格，不含 edit；链含 core 骨架 + virtual-list + i18n + pagination + 列设置/导出/移动降级与展示集快照，不含编辑器族），上浮约 12% 定档 74 KB；前档 108 KB 为默认入口含 edit 口径；2026-11-03 core 子路径导入批后实测 60.7 KB（绕开 barrel 不再连带 form-element+escape 虚重，回落至预警线以下）',
  },
  {
    // table/edit：注册型 L3（L1/CDN 含、默认 table 不含）。2026-10-28 首次独立定档：
    // 此前 edit 混在「默认入口含 edit」的旧 table 档里，默认入口去 edit 后没有独立档，
    // L3 登记表（lib/l3-registry.mjs）要求 measured L3 必须有独立预算档。
    name: '@oas-ui/ui/data/table/edit 链 gzip',
    kind: 'absolute',
    componentId: 'tableEdit',
    get: () => componentMeasures.tableEdit.gzipBytes,
    limit: 104 * 1024, // 104 KB（2026-10-28 首次独立定档：实测 89.7 KB 上浮约 16% 取整）
    basis:
      '实测 gzip 89.7 KB / 43 文件（首次独立计量：链含 edit 控制器 + 编辑器族 + select/switch 浮层编辑通道 + i18n；edit 链大于默认 table 链是「编辑器族依赖浮层组件」的合理结果，也正是默认入口不含 edit 的原因）；上浮约 16% 定档 104 KB（89.7×1.16≈104，取整）',
  },
  {
    // table/structural-render：注册型 L3（L1/CDN data 族含、默认 table 不含）。轻量委托能力——
    // 只引能力注册表不引 table 本体（host 由注册表工厂注入），链 ≈ 注册表 + 委托模块。
    name: '@oas-ui/ui/data/table/structural-render 链 gzip',
    kind: 'absolute',
    componentId: 'tableStructuralRender',
    get: () => componentMeasures.tableStructuralRender.gzipBytes,
    limit: 1.2 * 1024,
    basis:
      '注册型 L3（结构级渲染四槽委托：headerRow/headerCell/bodyRow/bodyCell），按需引入；首档 2026-11-04：实测 gzip 649 B / 2 文件（能力注册表 + 委托控制器，零生命周期、零组件依赖——table 本体由消费方自带），上浮约 40% 取整定档 1.2 KB',
  },
  {
    name: '@oas-ui/ui/form/form 链 gzip',
    kind: 'absolute',
    componentId: 'form',
    get: () => componentMeasures.form.gzipBytes,
    limit: 29 * 1024, // 29 KB（2026-10-07 重定档；2026-10-29 动态 label observer 后实测 29692 B / 上限 29696 B，余量 4 B——全库最危险预算）
    basis:
      '实测 gzip 29692 B / 预算 29696 B（余量仅 4 B，全库最危险档；链含 core + i18n；四批合并后 25.6 KB 上浮约 15% 定档 29 KB，前档 28 KB 定档于 2026-10-05 24.8 KB 实测）。预算上限不抬高：2026-10-29 新增外部 label 动态 observer 后已饱和，后续 form 链任何扩展前必须先评估/瘦身或按流程重新定档，禁止把余量当常量；2026-11-03 core 子路径导入批后实测 16.8 KB（绕开 barrel，余量恢复充裕，但预算上限仍按上述纪律不自行抬高）',
  },
  {
    name: '@oas-ui/ui/data/gantt 链 gzip',
    kind: 'absolute',
    componentId: 'gantt',
    get: () => componentMeasures.gantt.gzipBytes,
    limit: 80 * 1024, // 80 KB（2026-11-03 再定档：pool 超配检测 + 资源负荷视图两个 opt-in 特性增量）
    basis:
      'v2.6.2 定档 70 KB → 2026-11-03 定档 75 KB（P2 审计无冗余）→ 2026-11-03 定档 80 KB：其后增量全部已归因真实特性——pool 超配检测 +2.2 KB（静态引 resourcePool + 检测/事件/tooltip）、show-resource-load 负荷面板 +2.9 KB（shared 实现本体 1.74 + 渲染/CSS 1 + i18n 3 键 0.15，@oas-ui/ui/data/resource/load helper 档独立计量 1.8 KB）；2026-11-02 P2 式归因审计结论继续有效（无冗余）；2026-11-03 core 子路径导入批后实测 62.3 KB——此前「core barrel 上界口径产物真实可摇除」已由「内部源码直走 core 模块子路径绕开 barrel」取代，非表单链实测普遍 -5.9~-6.7 KB。预警线 72 KB；下次扩展仍须先归因评估',
  },
  {
    name: '@oas-ui/ui/data/json-viewer 链 gzip',
    kind: 'absolute',
    componentId: 'jsonViewer',
    get: () => componentMeasures.jsonViewer.gzipBytes,
    limit: 35 * 1024, // 35 KB：实测 gzip 31.5 KB（core + i18n + 组件，无第三方运行时），上浮约 10%
    basis:
      '实测 gzip 31.5 KB（链含 core + i18n + 树模型/虚拟窗口/工具栏/搜索/复制/复制浮层；无第三方运行时、无图标全量注册），上浮约 10% 定档 35 KB；PRD 目标 ≤32 KB；2026-11-03 core 子路径导入批后实测 22.8 KB（绕开 barrel）',
  },
  {
    name: '@oas-ui/ui/data/diff-viewer 链 gzip',
    kind: 'absolute',
    componentId: 'diffViewer',
    get: () => componentMeasures.diffViewer.gzipBytes,
    limit: 34 * 1024, // 34 KB：实测 gzip 29.9 KB（core + i18n + 自研 Myers/折叠/并排），上浮约 14%
    basis:
      '实测 gzip 30.6 KB（链含 core + i18n + 自研 Myers 行级差异/词级高亮/折叠/并排/虚拟窗口；无第三方 diff 依赖、无图标全量注册），上浮约 11% 定档 34 KB；PRD 目标 ≤32 KB；2026-11-03 core 子路径导入批后实测 21.3 KB（绕开 barrel）',
  },
  {
    name: '@oas-ui/theme index.css gzip',
    kind: 'absolute',
    get: () => theme.gzipBytes,
    limit: 4 * 1024, // 4 KB（2026-10-05 重定档：skins.css 皮肤层变量 + 阴影精修，实测 3.52 KB）
    basis:
      '实测 gzip 3.52 KB（skins 皮肤层变量族 + 阴影双层精修后），上浮约 15%；前档 3.5 KB 定档于 2026-09-15（3.0 KB 实测）',
  },
  {
    name: '@oas-ui/theme glass-fluid.js gzip',
    kind: 'absolute',
    get: () => fluidJs.gzipBytes,
    limit: 9.5 * 1024, // 9.5 KB（2026-10-31 复核重定档：逐文件复读无冗余可清，实测 8278 B，利用率 85.1%）
    basis:
      '实测 gzip 8.0 KB（B 档 + 修复批：注册表 + 注入样式表并入运行时——ui 包相应减少同量玻璃规则体；高光层改「surface 背景之上、文字之下」，补 .box 基态/命中成对、isolation:isolate、z-index:-1、禁用守卫（含链接形态 aria-disabled，且同时 background/box-shadow:none）、实心按钮 hover 高光 + 按压边缘内描边（:where 归零特异性）、全根观察 + 帧内 prune 防泄漏）。2026-10-31 复核：把派生式生成器烘焙成静态字面量实测只省 108 B（不值得牺牲「派生防漂移」），无操作三元 7 B、HIT_SELECTORS 函数包装 0 B —— 无冗余可清；前档 8.5 KB 时利用率 95.1%、×1.10 档会让实测距预警线只差 16 B，故按实测上浮 17.5% 重定档 9.5 KB（利用率 85.1%，预警线恢复有效）。再次加功能前先做包体评估。前档 4.5 / 4 KB 首次定档于 2026-10-07（3.6 / 2.97 KB 实测）（指针镜面高光运行时：监听/命中/坐标/rAF/守卫/清理）',
  },
  {
    name: '@oas-ui/theme glass.css gzip',
    kind: 'absolute',
    get: () => glassCss.gzipBytes,
    limit: 6 * 1024, // 6 KB（可选玻璃静态层，首次定档 2026-10-08；本次实测 3516 B）
    basis:
      '本次实测 gzip 3516 B（2026-10-29；玻璃静态层新增 switch 轨道加深 token 后复核：surface 半透明 token + 折光边 + 阴影 + switch mix；独立可选，不进 union），保留 6 KB 上限',
  },
  {
    name: '@oas-ui/theme skins.css gzip',
    kind: 'absolute',
    get: () => skinsCss.gzipBytes,
    limit: 2 * 1024, // 2 KB（可选皮肤层，首次定档 2026-10-08；实测约 0.91 KB）
    basis: '实测 gzip 约 0.91 KB（皮肤层变量族：预设色板皮肤档；独立可选，不进 union），上浮定档 2 KB',
  },
  {
    name: '@oas-ui/ui/data/table/advanced 链 gzip',
    kind: 'absolute',
    componentId: 'tableAdvanced',
    get: () => componentMeasures.tableAdvanced.gzipBytes,
    limit: 9 * 1024,
    basis:
      '首档 2026-10-25：实测 7.0 KB 上浮约 14% 定档 8 KB。2026-10-28 收口：视觉适配器协议批使链增至 8146 B（余量仅 46 B 触顶）；无行为变化瘦身（公式解析器 class → 模块函数，消除产物方法名税）后实测 8011 B。2026-10-31 复核重定档：逐文件复读 8 个模块（formula 2317 / windowed 1996 / pivot 1097 / query 851 / conditional 565 / history 490 / clipboard 363 / index 332），无可无行为变化清除的冗余（最大可清项 evaluateFormula 仅 19 B 且属公开导出，geometrySummary 的 try/catch 25 B 属已声明防御路径）；2.2% 余量已无预警意义，按实测上浮 15% 重定档 9 KB（利用率 86.9%）。再次扩展前必须先做包体评估或瘦身',
  },
  {
    name: '@oas-ui/ui/data/table/format 链 gzip',
    kind: 'absolute',
    componentId: 'tableFormat',
    get: () => componentMeasures.tableFormat.gzipBytes,
    limit: 6 * 1024, // 6 KB（2026-10-25 首次定档：实测 4.7 KB）
    basis: '实测 gzip 4.7 KB（条件格式 capability + 规则引擎，无表单控件；不进入 table 默认链），上浮约 27% 定档 6 KB',
  },
  {
    name: '@oas-ui/ui/data/table/view 链 gzip',
    kind: 'absolute',
    componentId: 'tableView',
    get: () => componentMeasures.tableView.gzipBytes,
    limit: 1.5 * 1024, // 1.5 KB（2026-10-25 首次定档：实测 0.6 KB）
    basis: '实测 gzip 1.0 KB（完整视图快照 + 可配置 key 的持久化适配器，无 table 运行时依赖），上浮定档 1.5 KB',
  },
  {
    name: '@oas-ui/ui/data/table/range 链 gzip',
    kind: 'absolute',
    componentId: 'tableRange',
    get: () => componentMeasures.tableRange.gzipBytes,
    limit: 13.5 * 1024,
    basis:
      '实测 gzip 12181 B（range/index 9715 = 选区控制器本体，未内联 table 运行时；window-data 840 / interactive 626 / clipboard 363 / capability 340 / row-key 297），其中 662 B 为本链未使用的导出（window-data 534 / clipboard 128），真实消费者构建经 tree-shaking 不携带，故真实量级约 11.5 KB。2026-10-31 复核：唯一可去重项是 findRowPath 与 indexRowPaths 的双实现（69 B），低于瘦身阈值；旧宿主视图签名回退（30 B）无测试覆盖但属 getDisplaySnapshot? 兼容契约，保留。按实测上浮 13.5% 重定档 13.5 KB（利用率 88.1%）',
  },
  {
    name: '@oas-ui/ui/data/table/history 链 gzip',
    kind: 'absolute',
    componentId: 'tableHistory',
    get: () => componentMeasures.tableHistory.gzipBytes,
    limit: 4 * 1024,
    basis:
      '实测 gzip 3.4 KB（撤销/重做栈 + 受控记录/事务 + oas-edit 行键/原类型回写 + 树形子行递归 + 交互宿主穿透），上浮约 18% 定档 4 KB',
  },
  {
    name: '@oas-ui/ui/data/table/detail 链 gzip',
    kind: 'absolute',
    componentId: 'tableDetail',
    get: () => componentMeasures.tableDetail.gzipBytes,
    limit: 4.5 * 1024,
    basis:
      '实测 gzip 3805 B（detail/index 2882 / interactive 626 / row-key 297，无未用导出虚高）。2026-10-31 复核：唯一重复实现是 isInputTarget 与 isInteractiveEvent（排除清单已含 input/select/textarea/[contenteditable]），实测仅 60 B；其余（内联 findIndex / activeEscapeClose 冗余状态）合计 ≤25 B。无冗余可清，按实测上浮 18% 重定档 4.5 KB（利用率 82.6%）',
  },
  // —— table 数据加工 helper 型 L3（细分职责拆包）：透视 / 值格式化 / 查询 ——
  {
    name: '@oas-ui/ui/data/table/pivot 链 gzip',
    kind: 'absolute',
    componentId: 'tablePivot',
    get: () => componentMeasures.tablePivot.gzipBytes,
    limit: 1.75 * 1024,
    basis:
      'helper 纯函数子路径，按需引入；首档 2026-11-03：实测 gzip 1276 B / 1 文件（二维透视矩阵：行列分组 + 5 种聚合 + 多值指标展列 + 可选合计行/列/全表，单文件零依赖），上浮约 40% 取整定档 1.75 KB',
  },
  {
    name: '@oas-ui/ui/data/table/value-format 链 gzip',
    kind: 'absolute',
    componentId: 'tableValueFormat',
    get: () => componentMeasures.tableValueFormat.gzipBytes,
    limit: 2.5 * 1024,
    basis:
      'helper 纯函数子路径，按需引入；首档 2026-11-03：实测 gzip 1899 B / 2 文件（格式化器本体 1651 + 统一 dev-warn 248；数值/日期/文本/自定义四类 spec + 本地时区 ISO 子集 token + 非法 spec 告警回落），上浮约 35% 取整定档 2.5 KB',
  },
  {
    name: '@oas-ui/ui/data/table/query 链 gzip',
    kind: 'absolute',
    componentId: 'tableQuery',
    get: () => componentMeasures.tableQuery.gzipBytes,
    limit: 2.5 * 1024,
    basis:
      'helper 纯函数子路径，按需引入；首档 2026-11-03：实测 gzip 1818 B / 1 文件（查询状态 + 过滤树 13 种算子 + 稳定排序 + 分页，纯函数零依赖），上浮约 41% 取整定档 2.5 KB',
  },
  {
    // layout 家族 helper 型 L3（不进 L1/layout 族包）：无限滚动 headless 控制器。
    // 独立档的意义：证明「消费 scroll-area 但不把控制器塞进组件/族包」的按需叙事。
    name: '@oas-ui/ui/layout/scroll-area/infinite 链 gzip',
    kind: 'absolute',
    componentId: 'infiniteScroll',
    get: () => componentMeasures.infiniteScroll.gzipBytes,
    limit: 5 * 1024, // 5 KB（2026-10-29 首次定档：实测 3916 B / 3.8 KB，上浮约 31% 取整）
    basis:
      '实测 gzip 3916 B / 3.8 KB / 3 文件（2026-10-29 首次独立定档；headless 控制器：滚动/尺寸/资源监听、双边缘状态机、prepend 锚定与 keyed 重查、ResizeObserver 资源补偿；仅 dev-warn 一个共享依赖，无滚动引擎/无自定义元素），上浮约 31% 定档 5 KB 绝对值',
  },
  // —— data 家族 helper 型 L3：gantt / resource 纯函数子路径（独立预算档；不进 L1/data 族包） ——
  // helper 纯函数子路径，按需引入；首档 2026-11-01：构建后实测上浮 ~30% 取整。
  {
    name: '@oas-ui/ui/data/gantt/export 链 gzip',
    kind: 'absolute',
    componentId: 'ganttExport',
    get: () => componentMeasures.ganttExport.gzipBytes,
    limit: 1.5 * 1024, // 1.5 KB（2026-11-01 首档：实测 1110 B 上浮 ~30% 取整）
    basis:
      'helper 纯函数子路径，按需引入；首档 2026-11-01：实测 gzip 1110 B / 2 文件（csv 本体 1056 + 入口转发 54，链含拍平/类型推导/CSV 转义，无组件运行时/无 core/i18n），上浮约 30% 取整定档 1.5 KB',
  },
  {
    name: '@oas-ui/ui/data/gantt/evm 链 gzip',
    kind: 'absolute',
    componentId: 'ganttEvm',
    get: () => componentMeasures.ganttEvm.gzipBytes,
    limit: 1.5 * 1024, // 1.5 KB（2026-11-01 首档：实测 1097 B 上浮 ~30% 取整）
    basis:
      'helper 纯函数子路径，按需引入；首档 2026-11-01：实测 gzip 1097 B / 1 文件（EVM 预算/PV/EV/AC/指标 + 拍平 + DST 安全日索引，单文件零依赖），上浮约 30% 取整定档 1.5 KB',
  },
  {
    name: '@oas-ui/ui/data/gantt/alap 链 gzip',
    kind: 'absolute',
    componentId: 'ganttAlap',
    get: () => componentMeasures.ganttAlap.gzipBytes,
    limit: 2 * 1024, // 2 KB（2026-11-01 首档：实测 1423 B 上浮 ~30% 取整）
    basis:
      'helper 纯函数子路径，按需引入；首档 2026-11-01：实测 gzip 1423 B / 1 文件（后向 CPM 反推最晚日期：Kahn 拓扑 + 四类依赖 lag 公式 + 环 best-effort + hour 成分保留，单文件零依赖），上浮约 30% 取整定档 2 KB',
  },
  {
    name: '@oas-ui/ui/data/gantt/recurring 链 gzip',
    kind: 'absolute',
    componentId: 'ganttRecurring',
    get: () => componentMeasures.ganttRecurring.gzipBytes,
    limit: 2 * 1024, // 2 KB（2026-11-01 首档：实测 1380 B 上浮 ~30% 取整）
    basis:
      'helper 纯函数子路径，按需引入；首档 2026-11-01：实测 gzip 1380 B / 1 文件（daily/weekly/monthly 周期展开 + count/until/窗口终止 + 短月跳过 + hour 成分保留，单文件零依赖），上浮约 30% 取整定档 2 KB',
  },
  {
    name: '@oas-ui/ui/data/resource/cost 链 gzip',
    kind: 'absolute',
    componentId: 'resourceCost',
    get: () => componentMeasures.resourceCost.gzipBytes,
    limit: 1.25 * 1024, // 1.25 KB（2026-11-01 首档：实测 828 B 上浮 ~30% 取整）
    basis:
      'helper 纯函数子路径，按需引入；首档 2026-11-01：实测 gzip 828 B / 1 文件（任务成本核算：taskCost 优先 + 资源时薪推导 + resourceIds 限定 + perResource 均摊，单文件零依赖），上浮约 30% 取整定档 1.25 KB',
  },
  {
    name: '@oas-ui/ui/data/resource/pool 链 gzip',
    kind: 'absolute',
    componentId: 'resourcePool',
    get: () => componentMeasures.resourcePool.gzipBytes,
    limit: 0.75 * 1024, // 0.75 KB（2026-11-01 首档：实测 490 B 上浮 ~30% 取整）
    basis:
      '运行时依赖（gantt pool 静态引入）+ 可独立按需 import；实测 gzip 490 B / 1 文件（ResourcePool id 去重登记表 + version 变更计数 + globalThis Symbol.for 共享单例，单文件零依赖），上浮约 30% 取整定档 0.75 KB',
  },
  {
    name: '@oas-ui/ui/data/resource/load 链 gzip',
    kind: 'absolute',
    componentId: 'resourceLoad',
    get: () => componentMeasures.resourceLoad.gzipBytes,
    limit: 2.5 * 1024, // 2.5 KB（2026-11-03 首档：实测 1822 B 上浮 ~37% 取整）
    basis:
      'helper 纯函数子路径，按需引入；首档 2026-11-03：实测 gzip 1822 B / 2 文件（shared/resource-load 实现本体 1740（day/week/month 三粒度 + 周锚定/部分桶/超配累计 + gantt 清洗最小子集；本体与 gantt show-resource-load 属性共用，随组件链进 L1/族包，helper 入口路径不进）+ 入口转发 82），上浮约 37% 取整定档 2.5 KB',
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
    kind: b.kind,
    componentId: b.componentId,
    actualBytes: actual,
    limitBytes: b.limit,
    warnAtBytes,
    pass: ok,
    warn,
    basis: b.basis,
  })
}

// ---------- 3.2 L2 默认链零 L3（登记表驱动：含 edit——v2.6.4「默认不含 edit」此前漏断言） ----------
for (const { item, files } of proLeakViolations(L3_REGISTRY, componentMeasures.table.fileList)) {
  fail = true
  console.error(`FAIL [Pro 零泄漏] table 默认链包含 ${item.id}（${item.entry}）：${files.join(', ')}`)
}
for (const item of L3_REGISTRY) {
  if (!item.entry.startsWith('data/table/')) continue
  console.log(`PASS [Pro 零泄漏] table 默认链不含 ${item.id}`)
}

// ---------- 3.3 L1 包含关系与独立预算覆盖（登记表 = lib/l3-registry.mjs，规则见该模块头注释） ----------
// 关系不变量（docs/architecture.md §3.1）：注册型 L3 必须含于 L1（CDN 一把梭消费者可用）；
// 纯函数/宿主侧 helper 型 L3 不得混入 L1（无触发面，进 union 即死重）；table 家族 L3 独立计量 + 独立预算档。
for (const { item, reason } of l1InclusionViolations(L3_REGISTRY, fullEntry.fileList)) {
  fail = true
  if (reason === 'missing') {
    console.error(
      `FAIL [L1 包含关系] 注册型 L3 ${item.id}（${item.entry}）不在全量入口链：CDN/L1 消费者声明对应属性时能力静默失效`,
    )
  } else {
    console.error(
      `FAIL [L1 包含关系] helper 型 L3 ${item.id}（${item.entry}）混入全量入口链：无宿主调用面，进 union 即死重`,
    )
  }
}
for (const item of L3_REGISTRY) {
  console.log(
    `PASS [L1 包含关系] ${item.kind === 'capability' ? '注册型（须在 L1）' : 'helper 型（须不在 L1）'} ${item.id}`,
  )
}
{
  const violations = budgetCoverageViolations(
    L3_REGISTRY,
    Object.keys(componentMeasures),
    BUDGETS.map((b) => b.componentId).filter(Boolean),
  )
  for (const { item, reason } of violations) {
    fail = true
    console.error(
      reason === 'unmeasured'
        ? `FAIL [独立预算] 登记为独立计量的 L3 ${item.id} 缺少按需链测量（COMPONENT_ENTRIES 无 '${item.id}'）`
        : `FAIL [独立预算] L3 ${item.id} 缺少独立预算档（BUDGETS 无 componentId='${item.id}' 条目）`,
    )
  }
  if (!violations.length)
    console.log(
      `PASS [独立预算] ${L3_REGISTRY.filter((i) => i.measured).length} 个 measured L3 均独立计量且各有独立预算档`,
    )
}

// ---------- 3.4 CDN 族包包含关系（真实静态图 = 族包 sourcemap 的构建输入 sources） ----------
// 族包产物（dist/cdn/<family>.js）是自包含 IIFE bundle，无静态 import 可遍历；
// 其 .map 的 sources 数组是 bundler 实际解析的输入模块清单，即精确的构建输入图。
// 族包收集清单由登记表 family 集合派生（registryFamilies），不另手工维护第二份清单；
// 登记缺 family / 未知 family / map 缺失一律显式违规（fail closed），不静默跳过。
{
  const FAMILY_BUNDLES = registryFamilies(L3_REGISTRY)
  const familySources = {}
  const brokenMaps = []
  for (const family of FAMILY_BUNDLES) {
    const mapPath = join(UI_DIST, 'cdn', `${family}.js.map`)
    try {
      familySources[family] = JSON.parse(readFileSync(mapPath, 'utf8')).sources
      if (!Array.isArray(familySources[family])) throw new Error('sources 不是数组')
    } catch (error) {
      familySources[family] = null
      brokenMaps.push({ family, error: String(error?.message ?? error) })
    }
  }
  const violations = familyInclusionViolations(L3_REGISTRY, familySources)
  const printed = new Set()
  for (const { item, family, reason } of violations) {
    fail = true
    const detail = {
      'missing-family': `登记条目 ${item.id} 缺少 family 字段：无法核对 CDN 族包包含关系（登记表不完整）`,
      'unknown-family': `登记条目 ${item.id} 的 family '${family}' 不在族包收集清单：登记表与族包收集脱节（清单应由 L3_REGISTRY 的 family 集合派生）`,
      'no-map': `${family} 族包 sourcemap 不可解析（${brokenMaps.find((b) => b.family === family)?.error ?? '未知原因'}）：无法核对 ${item.id}（${item.entry}）的族包包含关系，请 pnpm build 重建 dist（勿禁用族包 sourcemap）`,
      missing: `注册型 L3 ${item.id}（${item.entry}）不在 ${family} 族包构建输入：CDN 一把梭消费者声明对应属性时能力静默失效`,
      leaked: `helper 型 L3 ${item.id}（${item.entry}）混入 ${family} 族包构建输入：无 HTML/属性触发面，进族包即死重`,
    }[reason]
    const message = `FAIL [族包包含关系] ${detail}`
    if (!printed.has(message)) {
      printed.add(message)
      console.error(message)
    }
  }
  if (!violations.length) {
    console.log(
      `PASS [族包包含关系] ${FAMILY_BUNDLES.length} 个族包 × 登记表 ${L3_REGISTRY.length} 个 L3（注册型在族包、helper 不在，全部条目有 family 且族包可核对）`,
    )
  }
}

// ---------- 3.5 性能档案一致性（脚本/JSON/Markdown 单一真源；只报红不自动刷新，见 lib/baseline-docs.mjs） ----------
{
  const problems = checkPerfDocs(ROOT)
  if (problems.length) {
    fail = true
    for (const problem of problems) console.error(`FAIL [性能档案一致性] ${problem}`)
  } else {
    console.log('PASS [性能档案一致性] perf-baseline.md 生成块 / JSON / 渲染阈值库 / 实装 happy-dom 版本一致')
  }
}

// ---------- 3.x 已移除入口零残留 ----------
// `@oas-ui/ui/data/table/core` 兼容别名已删除（v2.6.5，用户批准的 minor 单点例外，
// 见 docs/deprecations.json DEP-EXPORT-0001）：package exports 的 `./*` 通配会把任何
// dist 残留重新变成可 import 入口，因此删除后必须保证 dist / dist/types 零残留。
// （原先「core 严格小于 table」的预算断言随双入口语义一并退役。）
for (const residue of ['data/table/core', join('types', 'data/table/core')]) {
  const residueDir = join(UI_DIST, residue)
  if (existsSync(residueDir)) {
    fail = true
    console.error(
      `FAIL [已移除入口零残留] ${relative(ROOT, residueDir)} 不应存在：` +
        'data/table/core 已于 v2.6.5 移除（DEP-EXPORT-0001），请 pnpm build 重建 dist 或检查源码回流',
    )
  } else {
    console.log(`PASS [已移除入口零残留] ${relative(ROOT, residueDir)} 不存在`)
  }
}

// ---------- 4. 写入基线（默认只测不写：基线是入库文件，见头部说明） ----------
if (process.argv.includes('--update-baseline')) {
  writeSection('size', {
    generatedAt: today(),
    method:
      'gzip = zlib gzipSync；brotli = zlib.brotliCompressSync q11；单组件链 = 静态 import 图遍历 + 逐文件压缩求和（上界估计；2026-11-03 起 core 内部消费走模块子路径，barrel 不再连带入链——非表单链因此普遍 -5.9~-6.7 KB，而子路径拆分使逐文件求和口径微涨属正常）',
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

  // render.env.happyDom 独立同步：happy-dom 升版后无需为版本号跑 perf:bench 重写全部
  // 耗时测量（避免测量噪声进基线）；scenarios/budgets/generatedAt 一律不动。
  const baseline = loadBaseline()
  if (patchRenderHappyDom(baseline, happyDomLabel(ROOT))) {
    saveBaseline(baseline)
    console.log(
      `[perf:size] render.env.happyDom 已同步为 ${baseline.render.env.happyDom}（渲染耗时数据未动；需要刷新耗时请跑 pnpm perf:bench --update-baseline）`,
    )
  }
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
