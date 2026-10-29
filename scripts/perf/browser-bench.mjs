#!/usr/bin/env node
/**
 * 真实浏览器性能基线（Task 11C，只观测、不阻断发布）。
 *
 * 测量对象：`pnpm build` 后的生产 dist（@oas-ui/ui 全量入口注册 + 固定 12 个组件首屏）。
 *   - CSR：5 次 warmup + 3 轮 × 30 次（客户端注册后写入 light DOM，测注册 + 首屏渲染）
 *   - DSD：2 次 warmup + 3 轮 × 15 次（服务端 DSD 快照 + 客户端注册/水合）
 * 固定 Chromium、workers=1；每次样本一个新 page（同一 context，HTTP 缓存随 warmup 变热）。
 *
 * 记录：LCP / FCP / DCL / load / 首批渲染耗时（firstRenderMs）/ DOM 节点数 / 传输体积；
 * 保存原始样本与每轮 min / median / p95（离散度），环境元数据（Node/pnpm/OS/CPU/Chromium）。
 *
 * 失败口径（**只有测量无效才非零退出**）：
 *   - dist 未构建 / Vite 构建失败 / 选择器缺失 / 样本数不足 / pageerror / console error；
 *   - 任一指标非有限（含 LCP 未采集：样本写 null，不写 0）/ count ≠ rounds×perRound；
 *   - `--update-baseline` 写盘前走与 `:check` 相同的完整校验，任何不符都拒绝写入并非零退出；
 *   - 性能数值回归只打印 WARN，永远不阻断。
 *
 * 用法：
 *   pnpm perf:browser                     # 测量并与入库基线对比（默认不写盘）
 *   pnpm perf:browser --update-baseline   # 刷新 docs/perf-browser-baseline.json
 *   pnpm perf:browser:check               # 仅校验基线 JSON 可解析、样本数、环境元数据
 *   pnpm perf:browser:selftest            # 校验器自测（非法样本必须非零退出）
 */
import { spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createReadStream } from 'node:fs'
import { join, extname, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import { chromium } from '@playwright/test'
import { build as viteBuild } from 'vite'
import { HOSTS, ROOT, lightMarkup } from './lib/bench-fixture.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const BASELINE_PATH = join(ROOT, 'docs/perf-browser-baseline.json')
const WORK_ROOT = join(ROOT, 'node_modules/.cache/oas-perf-browser')
const OUT_DIR = join(WORK_ROOT, 'dist')
const ENTRY_DIR = join(WORK_ROOT, 'entries')

const CSR_WARMUP = 5
const CSR_ROUNDS = 3
const CSR_PER_ROUND = 30
const DSD_WARMUP = 2
const DSD_ROUNDS = 3
const DSD_PER_ROUND = 15

const METRICS = ['lcp', 'fcp', 'dcl', 'load', 'firstRender', 'domNodes', 'transferBytes']
const REGRESSION_RATIO = 1.25
const UPDATE = process.argv.includes('--update-baseline')

function fail(message) {
  console.error(`FAIL [perf:browser] ${message}`)
  process.exitCode = 1
}

function fmt(ms) {
  return `${ms.toFixed(2)} ms`
}

/** 分位数（线性插值，与常见 p95 口径一致） */
function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b)
  const index = (sorted.length - 1) * p
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

/**
 * 统计值：**不吞 NaN/缺失**。空样本或任一非有限值直接抛错——
 * 调用方（measureScenario / :check / --update-baseline）据此非零退出。
 */
function stats(values, label) {
  if (!values.length) throw new Error(`${label} 样本为空，无法计算统计量`)
  const invalid = values.findIndex((value) => !Number.isFinite(value))
  if (invalid >= 0) {
    throw new Error(
      `${label} 第 ${invalid} 个样本不是有限数字：${String(values[invalid])}（LCP 未采集时应写 null 并失败）`,
    )
  }
  const sum = values.reduce((acc, value) => acc + value, 0)
  return {
    count: values.length,
    min: percentile(values, 0),
    median: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    max: values.reduce((acc, value) => Math.max(acc, value), -Infinity),
    mean: sum / values.length,
  }
}

function metricsStats(samples, label) {
  const out = {}
  for (const metric of METRICS) {
    out[metric] = stats(
      samples.map((sample) => sample?.[metric]),
      `${label}.${metric}`,
    )
  }
  return out
}

function pnpmVersion() {
  // 通过 pnpm 脚本运行时直接读 user agent，避免 shell spawn（Windows .cmd + shell 会触发弃用告警）
  const agent = process.env.npm_config_user_agent ?? ''
  const match = /pnpm\/(\d+\.\d+\.\d+[^\s]*)/.exec(agent)
  if (match) return match[1]
  const result = spawnSync('pnpm', ['-v'], { encoding: 'utf8', shell: true })
  return (result.stdout ?? '').trim() || 'unknown'
}

function playwrightVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'node_modules/@playwright/test/package.json'), 'utf8'))
    return pkg.version
  } catch {
    return 'unknown'
  }
}

/** 运行 git 并返回 trim 后的 stdout；失败返回 ''（不阻断测量）。 */
function gitOutput(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' })
  return result.status === 0 ? result.stdout.trim() : ''
}

/** 基线来源标记：gitSha 用于判断「同 SHA 噪声」，dirty 表示测量时工作树有未提交改动。 */
function gitMetadata() {
  return {
    gitSha: gitOutput(['rev-parse', 'HEAD']) || 'unknown',
    gitDirty: gitOutput(['status', '--porcelain']) !== '',
  }
}

/** 全部发布包的版本（基线可比性：包版本不同则数值差异包含发布内容变化）。 */
function packageVersions() {
  const versions = {}
  for (const name of ['core', 'i18n', 'icons', 'ssr', 'theme', 'ui', 'next', 'nuxt']) {
    try {
      versions[`@oas-ui/${name}`] = JSON.parse(
        readFileSync(join(ROOT, 'packages', name, 'package.json'), 'utf8'),
      ).version
    } catch {
      versions[`@oas-ui/${name}`] = 'unknown'
    }
  }
  return versions
}

function envMetadata(chromiumVersion) {
  const cpus = os.cpus()
  return {
    node: process.version,
    pnpm: pnpmVersion(),
    os: `${os.platform()} ${os.release()} (${os.arch()})`,
    cpu: cpus[0]?.model?.trim() ?? 'unknown',
    cpuCores: cpus.length,
    memoryGB: Math.round(os.totalmem() / 1024 ** 3),
    chromium: chromiumVersion,
    playwright: playwrightVersion(),
    workers: 1,
  }
}

async function prepareAssets() {
  if (!existsSync(join(ROOT, 'packages/ui/dist/index.js'))) {
    fail('packages/ui/dist 不存在：请先运行 `pnpm build`')
    return false
  }
  if (!existsSync(join(ROOT, 'packages/ssr/dist/index.js'))) {
    fail('packages/ssr/dist 不存在：请先运行 `pnpm build`')
    return false
  }
  rmSync(WORK_ROOT, { recursive: true, force: true })
  mkdirSync(ENTRY_DIR, { recursive: true })

  writeFileSync(
    join(ENTRY_DIR, 'csr-entry.js'),
    `import '@oas-ui/ui'\n\nconst root = document.getElementById('root')\nroot.innerHTML = ${JSON.stringify(lightMarkup())}\nrequestAnimationFrame(() => requestAnimationFrame(() => {\n  window.__benchDone = performance.now()\n}))\n`,
    'utf8',
  )
  writeFileSync(
    join(ENTRY_DIR, 'dsd-entry.js'),
    `import '@oas-ui/ui'\n\nrequestAnimationFrame(() => requestAnimationFrame(() => {\n  window.__benchDone = performance.now()\n}))\n`,
    'utf8',
  )

  try {
    await viteBuild({
      configFile: false,
      root: ROOT,
      logLevel: 'warn',
      build: {
        outDir: OUT_DIR,
        emptyOutDir: true,
        target: 'es2022',
        minify: 'oxc',
        rollupOptions: {
          input: {
            csr: join(ENTRY_DIR, 'csr-entry.js'),
            dsd: join(ENTRY_DIR, 'dsd-entry.js'),
          },
          output: {
            entryFileNames: '[name].js',
            chunkFileNames: 'chunks/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash][extname]',
          },
        },
      },
    })
  } catch (error) {
    fail(`Vite 构建失败：${error?.message ?? error}`)
    return false
  }

  // DSD 页在独立进程生成（happy-dom shim 不污染本进程）
  const dsdRender = spawnSync(
    process.execPath,
    [join(HERE, 'lib/render-dsd-bench.mjs'), join(OUT_DIR, 'dsd.html'), ROOT],
    { encoding: 'utf8' },
  )
  if (dsdRender.status !== 0) {
    fail(`DSD 页生成失败：${(dsdRender.stderr || dsdRender.stdout || '').trim()}`)
    return false
  }

  const themeCss = readFileSync(join(ROOT, 'packages/theme/index.css'), 'utf8')
  writeFileSync(
    join(OUT_DIR, 'csr.html'),
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OAS-UI CSR performance fixture</title>
<style>${themeCss}</style>
<style>
  body { margin: 0; padding: 24px; background: var(--oas-color-bg-hover); color: var(--oas-color-text-primary); font-family: system-ui, sans-serif; }
  #root { display: flex; flex-direction: column; gap: 12px; max-width: 860px; margin: 0 auto; }
</style>
</head>
<body>
<div id="root"></div>
<script type="module" src="/csr.js"></script>
</body>
</html>`,
    'utf8',
  )
  return true
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

function startServer() {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    const pathname = decodeURIComponent(url.pathname === '/' ? '/csr.html' : url.pathname)
    const file = resolve(OUT_DIR, `.${pathname}`)
    if (!file.startsWith(OUT_DIR) || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404, { 'content-type': 'text/plain' })
      response.end('not found')
      return
    }
    response.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
    createReadStream(file).pipe(response)
  })
  return new Promise((resolvePort, rejectPort) => {
    server.once('error', rejectPort)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolvePort({ server, port: typeof address === 'object' && address ? address.port : 0 })
    })
  })
}

/** 每个样本一个全新 page；init script 在导航前挂 LCP observer */
async function runSample(context, url) {
  const page = await context.newPage()
  const problems = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      problems.push(`console.${message.type()}: ${message.text()}`)
    }
  })
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
  await page.addInitScript(() => {
    // null 表示「未采集到」：绝不用 0 冒充有效 LCP（0 会被当成极快样本污染基线）。
    window.__lcp = null
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const last = entries[entries.length - 1]
        if (last) window.__lcp = last.startTime
      }).observe({ type: 'largest-contentful-paint', buffered: true })
    } catch {
      // 浏览器不支持 LCP：保持 null，样本校验会失败而非静默写 0
    }
  })
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30_000 })
    await page.waitForFunction(() => Number.isFinite(window.__benchDone), undefined, { timeout: 30_000 })
    // 留 60ms 让 LCP 完成候选提交（不引入 1s 级固定等待）
    await page.waitForTimeout(60)
    const sample = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0]
      const paint = performance.getEntriesByType('paint')
      const fcp = paint.find((entry) => entry.name === 'first-contentful-paint')?.startTime ?? null
      const resources = performance.getEntriesByType('resource')
      const transferBytes =
        resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0) + (navigation?.transferSize || 0)
      return {
        lcp: typeof window.__lcp === 'number' && Number.isFinite(window.__lcp) ? window.__lcp : null,
        fcp,
        dcl: navigation?.domContentLoadedEventEnd ?? null,
        load: navigation?.loadEventEnd ?? null,
        firstRender: Number.isFinite(window.__benchDone) ? window.__benchDone : null,
        domNodes: document.querySelectorAll('*').length,
        transferBytes,
      }
    })
    if (problems.length) throw new Error(`页面告警/异常：\n${problems.join('\n')}`)
    return sample
  } finally {
    await page.close()
  }
}

async function measureScenario(name, context, baseUrl, path, { warmup, rounds, perRound }, requireSelector) {
  const samples = []
  const roundStats = []
  const url = `${baseUrl}${path}`
  for (let index = 0; index < warmup; index++) await runSample(context, url)
  for (let round = 0; round < rounds; round++) {
    const roundSamples = []
    for (let index = 0; index < perRound; index++) {
      const sample = await runSample(context, url)
      roundSamples.push(sample)
      samples.push(sample)
    }
    roundStats.push(metricsStats(roundSamples, `${name} round ${round + 1}`))
  }

  // 样本完整性：数量必须精确等于 rounds×perRound；任一指标非有限直接失败。
  const expected = rounds * perRound
  if (samples.length !== expected) {
    throw new Error(`${name} 样本数 ${samples.length} ≠ rounds×perRound ${expected}`)
  }
  const aggregate = metricsStats(samples, name)
  for (const metric of METRICS) {
    if (aggregate[metric].count !== expected) {
      throw new Error(`${name}.${metric} count ${aggregate[metric].count} ≠ ${expected}`)
    }
  }

  // 结构有效性：选择器必须存在且已有 shadow/子节点（防止空白页被当成有效样本）
  const checkPage = await context.newPage()
  const problems = []
  checkPage.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      problems.push(`console.${message.type()}: ${message.text()}`)
    }
  })
  checkPage.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
  try {
    await checkPage.goto(url, { waitUntil: 'load' })
    await checkPage.waitForFunction(() => Number.isFinite(window.__benchDone))
    const structure = await checkPage.evaluate((selector) => {
      const host = document.querySelector(selector)
      if (!host) return { found: false, shadowed: 0, nodes: 0 }
      const elements = [...host.querySelectorAll('*')].filter((element) => element.localName.startsWith('oas-'))
      return {
        found: true,
        nodes: elements.length,
        shadowed: elements.filter((element) => !!element.shadowRoot).length,
      }
    }, requireSelector)
    if (!structure.found) throw new Error(`选择器缺失：${requireSelector}`)
    if (structure.nodes < HOSTS.length) throw new Error(`组件宿主数量不足：${structure.nodes}/${HOSTS.length}`)
    if (structure.shadowed < HOSTS.length)
      throw new Error(`shadow root 数量不足：${structure.shadowed}/${HOSTS.length}`)
    if (problems.length) throw new Error(`结构校验页告警/异常：\n${problems.join('\n')}`)
  } finally {
    await checkPage.close()
  }

  return { samples, roundStats, aggregate }
}

function readBaseline() {
  if (!existsSync(BASELINE_PATH)) return null
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
  } catch {
    return null
  }
}

/** 跨 OS/CPU 对比只提示不阻断（数值回归判定仍按阈值）。 */
function warnEnvironment(baseline, current) {
  if (!baseline) return
  const previous = baseline.env ?? {}
  const missing = ['os', 'cpu'].filter((key) => !previous[key])
  if (missing.length) {
    console.warn(
      `WARN [perf:browser] 基线缺少环境元数据 env.${missing.join('/env.')}（旧格式）：跨机器对比噪声可能较大，数值仍按 ×${REGRESSION_RATIO} 提示`,
    )
    return
  }
  for (const key of ['os', 'cpu']) {
    if (previous[key] !== current.env[key]) {
      console.warn(
        `WARN [perf:browser] 跨 ${key.toUpperCase()} 对比：基线「${previous[key]}」≠ 当前「${current.env[key]}」；绝对耗时不可直接比较，回归判定仅作提示`,
      )
    }
  }
}

/**
 * 「同 SHA 噪声」：与入库基线 gitSha 相同时，记录本次复测相对上次的中位数/p95 比值。
 * 同 SHA 的差异只能来自机器噪声；跨 SHA 或首次生成标记 compared:false。
 */
function computeSameShaNoise(previous, current) {
  if (!previous) return { compared: false, reason: '首次生成基线，无同 SHA 参照' }
  if (typeof previous.gitSha !== 'string' || !previous.gitSha) {
    return { compared: false, reason: '旧基线缺少 gitSha，无法判断同 SHA' }
  }
  if (previous.gitSha !== current.gitSha) {
    return {
      compared: false,
      baselineSha: previous.gitSha,
      currentSha: current.gitSha,
      reason: 'git SHA 不同：差异包含代码变化，不属同 SHA 噪声',
    }
  }
  const metrics = {}
  for (const scenario of ['csr', 'dsd']) {
    for (const metric of ['lcp', 'fcp', 'firstRender', 'transferBytes']) {
      const before = previous.scenarios?.[scenario]?.aggregate?.[metric]
      const now = current.scenarios?.[scenario]?.aggregate?.[metric]
      if (!Number.isFinite(before?.median) || !Number.isFinite(now?.median) || before.median <= 0) continue
      metrics[`${scenario}.${metric}`] = {
        medianRatio: Number((now.median / before.median).toFixed(4)),
        p95Ratio:
          Number.isFinite(before.p95) && before.p95 > 0 && Number.isFinite(now.p95)
            ? Number((now.p95 / before.p95).toFixed(4))
            : null,
      }
    }
  }
  return {
    compared: true,
    gitSha: current.gitSha,
    metrics,
    note: '同 SHA 复测差异属机器噪声，不代表性能退化；回归 WARN 仍按 ×1.25 提示',
  }
}

/**
 * 基线完整性校验（`--check` 与 `--update-baseline` 写盘前共用）。
 * 返回 true 表示可写入/可用；失败通过 `fail()` 累积到 process.exitCode。
 */
function validateBaselinePayload(payload, label = '基线') {
  if (!payload || typeof payload !== 'object') {
    fail(`${label}不是对象`)
    return false
  }
  if (typeof payload.gitSha !== 'string' || !/^[0-9a-f]{7,40}$/i.test(payload.gitSha)) {
    fail(`${label} gitSha 缺失或无效：${payload.gitSha}`)
  }
  if (typeof payload.gitDirty !== 'boolean') fail(`${label} gitDirty 必须为布尔值`)
  if (!payload.versions || typeof payload.versions !== 'object') {
    fail(`${label} versions 缺失`)
  } else {
    for (const pkg of ['@oas-ui/ui', '@oas-ui/ssr']) {
      if (!payload.versions[pkg] || typeof payload.versions[pkg] !== 'string') {
        fail(`${label} versions.${pkg} 缺失`)
      }
    }
  }
  if (!payload.sameShaNoise || typeof payload.sameShaNoise.compared !== 'boolean') {
    fail(`${label} sameShaNoise 缺失或格式错误`)
  }
  const expect = {
    csr: { warmup: CSR_WARMUP, rounds: CSR_ROUNDS, perRound: CSR_PER_ROUND },
    dsd: { warmup: DSD_WARMUP, rounds: DSD_ROUNDS, perRound: DSD_PER_ROUND },
  }
  const env = payload.env ?? {}
  for (const key of ['node', 'pnpm', 'os', 'cpu', 'chromium', 'playwright']) {
    if (!env[key] || typeof env[key] !== 'string') fail(`环境元数据缺失：env.${key}`)
    else if (env[key] === 'unknown') fail(`环境元数据无效：env.${key} = unknown`)
  }
  if (env.workers !== 1) fail(`env.workers 必须为 1，实得 ${env.workers}`)
  for (const [scenario, settings] of Object.entries(expect)) {
    const entry = payload.scenarios?.[scenario]
    if (!entry) {
      fail(`场景缺失：${scenario}`)
      continue
    }
    if (entry.warmup !== settings.warmup) fail(`${scenario}.warmup 应为 ${settings.warmup}，实得 ${entry.warmup}`)
    if (entry.rounds !== settings.rounds) fail(`${scenario}.rounds 应为 ${settings.rounds}，实得 ${entry.rounds}`)
    if (entry.samplesPerRound !== settings.perRound) {
      fail(`${scenario}.samplesPerRound 应为 ${settings.perRound}，实得 ${entry.samplesPerRound}`)
    }
    const expectedSamples = settings.rounds * settings.perRound
    if (!Array.isArray(entry.raw) || entry.raw.length !== expectedSamples) {
      fail(`${scenario}.raw 样本数应为 ${expectedSamples}，实得 ${entry.raw?.length ?? 0}`)
    }
    for (const [index, sample] of (entry.raw ?? []).entries()) {
      for (const metric of METRICS) {
        if (!Number.isFinite(sample?.[metric])) fail(`${scenario}.raw[${index}].${metric} 不是有效数字`)
      }
    }
    if (!Array.isArray(entry.roundStats) || entry.roundStats.length !== settings.rounds) {
      fail(`${scenario}.roundStats 应有 ${settings.rounds} 轮，实得 ${entry.roundStats?.length ?? 0}`)
    }
    for (const [index, round] of (entry.roundStats ?? []).entries()) {
      for (const metric of METRICS) {
        for (const field of ['min', 'median', 'p95']) {
          if (!Number.isFinite(round?.[metric]?.[field]))
            fail(`${scenario}.roundStats[${index}].${metric}.${field} 无效`)
        }
      }
    }
    for (const metric of METRICS) {
      for (const field of ['count', 'min', 'median', 'p95']) {
        if (!Number.isFinite(entry.aggregate?.[metric]?.[field])) fail(`${scenario}.aggregate.${metric}.${field} 无效`)
      }
      if (entry.aggregate?.[metric]?.count !== expectedSamples) {
        fail(`${scenario}.aggregate.${metric}.count 应为 ${expectedSamples}，实得 ${entry.aggregate?.[metric]?.count}`)
      }
    }
  }
  return !process.exitCode
}

function compareWithBaseline(scenario, current, baseline) {
  const previous = baseline?.scenarios?.[scenario]?.aggregate
  if (!previous) return
  for (const metric of ['lcp', 'fcp', 'firstRender', 'transferBytes']) {
    const before = previous[metric]?.median
    const now = current.aggregate[metric]?.median
    if (!Number.isFinite(before) || !Number.isFinite(now) || before <= 0) continue
    const ratio = now / before
    if (ratio <= REGRESSION_RATIO) continue
    console.warn(
      `WARN [perf:browser] ${scenario}.${metric} 中位数 ${now.toFixed(2)} 高于基线 ${before.toFixed(2)}（×${ratio.toFixed(2)}）；仅提示，不阻断`,
    )
  }
}

/** `perf:browser:check`：只校验入库基线完整性（不启动浏览器） */
function checkBaseline(path = process.env.PERF_BROWSER_BASELINE || BASELINE_PATH) {
  if (!existsSync(path)) {
    fail(`基线文件不存在：${path}`)
    return
  }
  let baseline
  try {
    baseline = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    fail(`基线不可解析：${error?.message ?? error}`)
    return
  }
  if (validateBaselinePayload(baseline, `基线 ${path} `) && !process.exitCode) {
    console.log(`PASS [perf:browser] 基线完整：${path}`)
  }
}

/**
 * `--self-test`：在临时目录构造合法 / 缺样本 / NaN / null LCP 四类基线，
 * 通过子进程跑 `--check`，断言红绿两侧的退出码（不启动浏览器）。
 */
function runSelfTest() {
  const dir = mkdtempSync(join(os.tmpdir(), 'oas-perf-browser-selftest-'))
  const settings = {
    csr: { warmup: CSR_WARMUP, rounds: CSR_ROUNDS, perRound: CSR_PER_ROUND },
    dsd: { warmup: DSD_WARMUP, rounds: DSD_ROUNDS, perRound: DSD_PER_ROUND },
  }
  const makeSample = (value) => Object.fromEntries(METRICS.map((metric) => [metric, value]))
  const makeStats = (value, count) => ({ count, min: value, median: value, p95: value, max: value, mean: value })
  const makeMetrics = (value, count) => Object.fromEntries(METRICS.map((metric) => [metric, makeStats(value, count)]))
  const build = () => {
    const scenarios = {}
    for (const [name, config] of Object.entries(settings)) {
      const total = config.rounds * config.perRound
      scenarios[name] = {
        warmup: config.warmup,
        rounds: config.rounds,
        samplesPerRound: config.perRound,
        raw: Array.from({ length: total }, (_, index) => makeSample(100 + (index % 10))),
        roundStats: Array.from({ length: config.rounds }, () => makeMetrics(100, config.perRound)),
        aggregate: makeMetrics(100, total),
      }
    }
    return {
      generatedAt: '2026-10-30',
      method: 'self-test',
      gitSha: '0123456789abcdef0123456789abcdef01234567',
      gitDirty: false,
      versions: { '@oas-ui/ui': '2.6.4', '@oas-ui/ssr': '2.6.4' },
      env: {
        node: process.version,
        pnpm: 'self-test',
        os: 'self-test',
        cpu: 'self-test',
        cpuCores: 1,
        memoryGB: 1,
        chromium: 'self-test',
        playwright: 'self-test',
        workers: 1,
      },
      settings: { viewport: { width: 1280, height: 800 }, regressionWarnRatio: REGRESSION_RATIO },
      sameShaNoise: { compared: false, reason: 'self-test' },
      scenarios,
    }
  }
  const cases = [
    { name: '合法基线', mutate: () => {}, expectPass: true },
    {
      name: '缺样本',
      mutate: (payload) => payload.scenarios.csr.raw.pop(),
      expectPass: false,
    },
    {
      name: 'NaN 指标',
      mutate: (payload) => {
        payload.scenarios.dsd.raw[0].fcp = 'NaN'
      },
      expectPass: false,
    },
    {
      name: 'LCP 未采集（null）',
      mutate: (payload) => {
        payload.scenarios.csr.raw[2].lcp = null
      },
      expectPass: false,
    },
  ]
  let failed = 0
  try {
    for (const item of cases) {
      const payload = build()
      item.mutate(payload)
      const path = join(dir, `${item.name}.json`)
      writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
      const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--check'], {
        encoding: 'utf8',
        env: { ...process.env, PERF_BROWSER_BASELINE: path },
      })
      const passed = result.status === 0
      if (passed !== item.expectPass) {
        failed++
        console.error(
          `FAIL [perf:browser] 自测「${item.name}」退出码 ${result.status}（期望${item.expectPass ? ' 0' : '非 0'}）`,
        )
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  if (failed) {
    fail(`自测失败 ${failed} 项`)
    return
  }
  console.log('PASS [perf:browser] 自测：合法基线通过，缺样本 / NaN / null LCP 均非零退出')
}

async function main() {
  if (process.argv.includes('--self-test')) {
    runSelfTest()
    return
  }
  if (process.argv.includes('--check')) {
    checkBaseline()
    return
  }

  const prepared = await prepareAssets()
  if (!prepared) return

  const { server, port } = await startServer()
  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })
    const baseUrl = `http://127.0.0.1:${port}`
    const csr = await measureScenario(
      'csr',
      context,
      baseUrl,
      '/csr.html',
      { warmup: CSR_WARMUP, rounds: CSR_ROUNDS, perRound: CSR_PER_ROUND },
      '#root',
    )
    const dsd = await measureScenario(
      'dsd',
      context,
      baseUrl,
      '/dsd.html',
      { warmup: DSD_WARMUP, rounds: DSD_ROUNDS, perRound: DSD_PER_ROUND },
      '[data-bench="dsd"]',
    )

    const previousBaseline = readBaseline()
    const git = gitMetadata()
    const payload = {
      generatedAt: new Date().toISOString().slice(0, 10),
      // gitSha / gitDirty：判断同 SHA 噪声与「测量时工作树是否干净」
      ...git,
      versions: packageVersions(),
      method:
        'Vite 生产构建（oxc minify）+ Chromium headless；每次样本新建 page（同 context 暖缓存）；' +
        'firstRender = 客户端注册/渲染完成后的双 rAF 时间戳；传输体积 = resource transferSize 之和 + navigation transferSize；' +
        'console 过滤口径 = 每个样本页与结构校验页的 console error/warning + pageerror（任一命中即测量无效）',
      env: envMetadata(browser.version()),
      settings: {
        viewport: { width: 1280, height: 800 },
        regressionWarnRatio: REGRESSION_RATIO,
      },
      scenarios: {
        csr: {
          warmup: CSR_WARMUP,
          rounds: CSR_ROUNDS,
          samplesPerRound: CSR_PER_ROUND,
          raw: csr.samples,
          roundStats: csr.roundStats,
          aggregate: csr.aggregate,
        },
        dsd: {
          warmup: DSD_WARMUP,
          rounds: DSD_ROUNDS,
          samplesPerRound: DSD_PER_ROUND,
          raw: dsd.samples,
          roundStats: dsd.roundStats,
          aggregate: dsd.aggregate,
        },
      },
    }

    payload.sameShaNoise = computeSameShaNoise(previousBaseline, payload)

    console.log('\n=== 真实浏览器基线（workers=1，Chromium） ===')
    for (const [name, scenario] of [
      ['CSR', csr],
      ['DSD', dsd],
    ]) {
      const a = scenario.aggregate
      console.log(
        `${name.padEnd(4)} n=${a.lcp.count}  LCP ${fmt(a.lcp.median)} (p95 ${fmt(a.lcp.p95)})  ` +
          `FCP ${fmt(a.fcp.median)}  DCL ${fmt(a.dcl.median)}  load ${fmt(a.load.median)}  ` +
          `firstRender ${fmt(a.firstRender.median)}  nodes ${Math.round(a.domNodes.median)}  ` +
          `transfer ${(a.transferBytes.median / 1024).toFixed(1)} KB`,
      )
    }

    warnEnvironment(previousBaseline, payload)
    compareWithBaseline('csr', csr, previousBaseline)
    compareWithBaseline('dsd', dsd, previousBaseline)

    if (UPDATE) {
      // 写盘前走与 :check 完全相同的校验：非法样本一律拒绝写入并非零退出
      if (validateBaselinePayload(payload, '待写入基线')) {
        writeFileSync(BASELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
        console.log(`\n[perf:browser] 基线已写入 ${BASELINE_PATH}`)
      } else {
        console.error('[perf:browser] 样本校验未通过：拒绝写入基线')
      }
    } else {
      console.log('\n[perf:browser] 仅测量，未写入基线（确需刷新请加 --update-baseline）')
    }
  } catch (error) {
    fail(error?.message ?? String(error))
  } finally {
    await browser.close().catch(() => {})
    await new Promise((resolveClose) => server.close(resolveClose))
  }
}

await main()
