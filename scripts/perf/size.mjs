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
 * 产物：docs/perf-baseline.json 的 `size` section（与 render-bench.mjs 各自 merge，互不覆盖）。
 *
 * 用法：先 `pnpm build`，再 `pnpm perf:size`。
 */
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  existsSync,
  realpathSync,
} from 'node:fs'
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
const SIDE_IMPORT_RE = /^\s*import\s*["']([^"']+)["']/gm
const DYNAMIC_IMPORT_RE = /import\(\s*["']([^"']+)["']\s*\)/g

function extractSpecs(code) {
  const out = new Set()
  for (const re of [FROM_RE, SIDE_IMPORT_RE, DYNAMIC_IMPORT_RE]) {
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

/** 遍历目录收集 .js 文件（含子目录，排除 .map/.d.ts） */
function collectJs(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      out.push(...collectJs(full))
    } else if (full.endsWith('.js')) {
      out.push(full)
    }
  }
  return out
}

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

// ui 全量入口链：`import '@oas-ui/ui'`（dist/index.js）的实际加载集合
const fullEntry = measureFiles(collectGraph(join(UI_DIST, 'index.js')))

// dist/cdn.js 单文件 IIFE bundle
const cdnBuf = readFileSync(join(UI_DIST, 'cdn.js'))
const cdn = {
  files: 1,
  rawBytes: cdnBuf.length,
  gzipBytes: gzip(cdnBuf),
  brotliBytes: brotli(cdnBuf),
}

const packageRows = [
  ['@oas-ui/ui (dist 总大小)', `${fmtBytes(uiDistTotal)}`, '', ''],
  [
    '@oas-ui/ui (浏览器可加载 JS)',
    `${uiJs.files} 文件`,
    fmtKB(uiJs.rawBytes),
    fmtKB(uiJs.gzipBytes),
  ],
  [
    '@oas-ui/ui (全量入口链)',
    `${fullEntry.files} 文件`,
    fmtKB(fullEntry.rawBytes),
    fmtKB(fullEntry.gzipBytes),
  ],
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
  { id: 'form', entry: 'form/form', spec: '@oas-ui/ui/form/form' },
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
// 量纲：字节。超预算 → FAIL 非零退出，CI 拦截。
const BUDGETS = [
  {
    name: 'dist/cdn.js gzip',
    get: () => cdn.gzipBytes,
    limit: 225 * 1024, // 225 KB（2026-08-14 用户定夺：同类[原生 WC 组件库全量]公开区间 150~300KB 的均值）
    basis:
      '同类（原生 WC 组件库全量单文件）公开区间约 150~300KB 的均值 225KB；v2.0 补齐后实测 gzip 153.2 KB',
  },
  {
    name: '@oas-ui/ui 全量入口链 gzip',
    get: () => fullEntry.gzipBytes,
    limit: 395 * 1024, // 395 KB。实测 334,182 B（v2.1 组件增强后），按原条目系数上浮约 18%
    basis: '实测 gzip 334,182 B（逐文件求和上界，v2.1 组件增强后），按原系数上浮约 18% 取整 395 KB',
  },
  {
    name: '@oas-ui/ui/basic/button 链 gzip',
    get: () => componentMeasures.button.gzipBytes,
    limit: 22 * 1024, // 22 KB。实测 17,906 B，上浮约 23%（链内含 icon 注册表，随图标库增长余量略大）
    basis: '实测 gzip 17,906 B（含 core + 全量 icon 注册表），上浮约 23%',
  },
  {
    name: '@oas-ui/ui/data/table 链 gzip',
    get: () => componentMeasures.table.gzipBytes,
    limit: 22 * 1024, // 22 KB。实测 17,921 B，上浮约 23%
    basis: '实测 gzip 17,921 B（含 core + virtual-list + i18n），上浮约 23%',
  },
  {
    name: '@oas-ui/ui/form/form 链 gzip',
    get: () => componentMeasures.form.gzipBytes,
    limit: 14 * 1024, // 14 KB。实测 11,873 B，上浮约 21%
    basis: '实测 gzip 11,873 B（含 core + i18n），上浮约 21%',
  },
  {
    name: '@oas-ui/theme index.css gzip',
    get: () => theme.gzipBytes,
    limit: 2 * 1024, // 2 KB。实测 1,467 B，上浮约 40%（token 集平缓增长）
    basis: '实测 gzip 1,467 B，上浮约 40%',
  },
]

console.log('\n=== 体积预算断言 ===')
let fail = false
const budgetResults = []
for (const b of BUDGETS) {
  const actual = b.get()
  const ok = actual <= b.limit
  if (!ok) fail = true
  const status = ok ? 'PASS' : 'FAIL'
  console.log(
    `${status} ${b.name.padEnd(42)} ${fmtBytes(actual).padStart(10)} / 预算 ${fmtBytes(b.limit)}（依据：${b.basis}）`,
  )
  budgetResults.push({
    name: b.name,
    actualBytes: actual,
    limitBytes: b.limit,
    pass: ok,
    basis: b.basis,
  })
}

// ---------- 4. 写入基线 ----------
writeSection('size', {
  generatedAt: today(),
  method:
    'gzip = zlib gzipSync；brotli = zlib brotliCompressSync q11；单组件链 = 静态 import 图遍历 + 逐文件压缩求和（上界估计）',
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
if (fail) {
  console.error('[perf:size] 存在超预算项，性能门槛未通过。')
  process.exit(1)
}
