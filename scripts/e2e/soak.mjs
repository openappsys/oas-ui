#!/usr/bin/env node
/**
 * e2e 长稳 soak：同一批用例重复跑 N 轮，抓单次 e2e 抓不到的间歇性 flake
 * （时序竞态 / 负载抖动 / 动画与浮层收放）。
 *
 * 用法：
 *   node scripts/e2e/soak.mjs                      # 默认 spec 集 × 3 轮（chromium）
 *   node scripts/e2e/soak.mjs --times 5            # 5 轮
 *   node scripts/e2e/soak.mjs --specs packages/ui/qa-regression/popover.spec.ts
 *   node scripts/e2e/soak.mjs --project=firefox --retries 1
 *   node scripts/e2e/soak.mjs --dry                # 干跑：只打印将执行的命令
 *
 * 设计要点：
 *   1. 每轮独立 playwright 进程 + 独立 preview 端口（E2E_PORT）+ 独立 --output 目录，
 *      轮间零共享状态（也固定 E2E_REUSE=0，避免复用上一轮 server）。
 *   2. 单轮超时隔离：--round-timeout 到期后 kill 整棵进程树，记该轮失败、留日志、跑下一轮。
 *   3. 默认 --retries 0：重试会把 flake 洗成「通过」，soak 要看真实抖动。
 *   4. docs dist 复用：dist 已存在则各轮 E2E_SKIP_BUILD=1（--build 或 dist 缺失时先构建一次，
 *      避免每轮重复 build 又慢又互相踩 dist）。
 *   5. 结果采集：运行时在本次产物目录生成一个临时 reporter（JSONL），不依赖
 *      playwright 的 PLAYWRIGHT_JSON_OUTPUT_NAME（1.64 起已移除）。
 */
import { spawn, spawnSync } from 'node:child_process'
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const IS_WIN = process.platform === 'win32'
// 直接调 playwright CLI，绕开 `pnpm exec`（依赖状态校验会平白触发 install，见 shards.mjs）
const PLAYWRIGHT_CLI = join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js')
const DIST_INDEX = join(ROOT, 'packages', 'docs', 'docs', '.vitepress', 'dist', 'index.html')
const OUT_ROOT = join(ROOT, 'test-results', 'soak')

// 默认 spec 集：qa-regression 里 flake 高发类——交互浮层 / 虚拟滚动 / 动画时序
const DEFAULT_SPECS = [
  'packages/ui/qa-regression/popover.spec.ts',
  'packages/ui/qa-regression/tooltip.spec.ts',
  'packages/ui/qa-regression/dropdown.spec.ts',
  'packages/ui/qa-regression/hover-card.spec.ts',
  'packages/ui/qa-regression/virtual-list.spec.ts',
  'packages/ui/qa-regression/infinite-scroll.spec.ts',
  'packages/ui/qa-regression/carousel.spec.ts',
  'packages/ui/qa-regression/collapsible.spec.ts',
]

const HELP = `长稳 soak：同一批 e2e 用例重复跑 N 轮，抓间歇性 flake（时序竞态 / 负载抖动）。

用法：
  node scripts/e2e/soak.mjs [选项]

选项：
  --times <N>            重复轮数（默认 3，≥1）
  --specs <路径,...>     覆盖默认 spec 集（相对仓库根，逗号分隔，可重复指定）
  --project <名称>       playwright project（默认 chromium）
  --retries <N>          每轮重试次数（默认 0：让 flake 直接暴露，不被重试洗成通过）
  --round-timeout <秒>   单轮超时（默认 1800）；超时终止该轮、记失败、继续下一轮
  --build                先重建 docs dist（一次），再跑各轮
  --dry                  干跑：只打印将执行的命令与环境，不执行、不落盘
  -h, --help             显示本帮助

默认 spec 集（flake 高发：交互浮层 / 虚拟滚动 / 动画时序）：
${DEFAULT_SPECS.map((s) => `  - ${s}`).join('\n')}

产物（gitignore 内，可能被后续 playwright 全量运行清掉）：
  test-results/soak/soak-<时间戳>.md          汇总报告（轮次×用例矩阵 + flaky + 失败去重）
  test-results/soak/<时间戳>/round-N.log      该轮 playwright 原始输出
  test-results/soak/<时间戳>/round-N.jsonl    该轮逐用例结果（脚本生成 reporter 写入）
  test-results/soak/<时间戳>/artifacts/round-N/  该轮 --output（trace/截图等）

退出码：
  0  全部轮次通过且无 flaky
  1  任一轮失败、中断，或出现 flaky（轮内重试通过 / 轮间结果不一致）
  2  参数或环境错误（spec 不存在、playwright 未安装等）`

class UsageError extends Error {}

function relPosix(abs) {
  return relative(ROOT, abs).split(sep).join('/')
}

function timestamp(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(
    date.getMinutes(),
  )}${p(date.getSeconds())}`
}

function humanTime(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(
    date.getMinutes(),
  )}:${p(date.getSeconds())}`
}

function formatDuration(ms) {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return m > 0 ? `${m}m${String(s).padStart(2, '0')}s` : `${s}s`
}

function intValue(flag, raw, min) {
  const n = Number(raw)
  if (!Number.isInteger(n) || n < min) throw new UsageError(`${flag} 需要 ≥${min} 的整数，收到：${raw}`)
  return n
}

function parseArgs(argv) {
  const opts = {
    times: 3,
    specs: null,
    project: 'chromium',
    retries: 0,
    roundTimeout: 1800,
    build: false,
    dry: false,
    help: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const eq = arg.startsWith('--') ? arg.indexOf('=') : -1
    const flag = eq > 0 ? arg.slice(0, eq) : arg
    const inline = eq > 0 ? arg.slice(eq + 1) : undefined
    const value = () => {
      if (inline !== undefined) {
        if (inline === '') throw new UsageError(`${flag} 缺少取值`)
        return inline
      }
      const next = argv[++i]
      if (next === undefined || next.startsWith('--')) throw new UsageError(`${flag} 缺少取值`)
      return next
    }

    switch (flag) {
      case '--help':
      case '-h':
        opts.help = true
        break
      case '--dry':
        opts.dry = true
        break
      case '--build':
        opts.build = true
        break
      case '--times':
        opts.times = intValue(flag, value(), 1)
        break
      case '--retries':
        opts.retries = intValue(flag, value(), 0)
        break
      case '--round-timeout':
        opts.roundTimeout = intValue(flag, value(), 1)
        break
      case '--project':
        opts.project = value()
        if (!/^[\w*.-]+$/.test(opts.project)) throw new UsageError(`--project 取值非法：${opts.project}`)
        break
      case '--specs': {
        const items = value()
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        if (!items.length) throw new UsageError('--specs 至少需要一个 spec 路径')
        opts.specs ??= []
        opts.specs.push(...items)
        break
      }
      default:
        if (arg.startsWith('-')) throw new UsageError(`未知参数：${arg}`)
        throw new UsageError(`多余的位置参数：${arg}（spec 请用 --specs 指定）`)
    }
  }

  return opts
}

function resolveSpecs(list) {
  const out = []
  for (const raw of list) {
    const abs = resolve(ROOT, raw)
    if (!existsSync(abs)) throw new UsageError(`spec 不存在：${raw}`)
    const rel = relPosix(abs)
    if (!out.includes(rel)) out.push(rel)
  }
  return out
}

function freePort() {
  return new Promise((res, rej) => {
    const srv = createServer()
    srv.unref()
    srv.on('error', rej)
    srv.listen(0, () => {
      const { port } = srv.address()
      srv.close(() => res(port))
    })
  })
}

function killTree(pid) {
  if (!pid) return
  if (IS_WIN) {
    spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' })
    return
  }
  try {
    process.kill(-pid, 'SIGKILL')
  } catch {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {
      /* 进程已退出 */
    }
  }
}

function quoteArg(arg) {
  return /[\s"]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg
}

function commandLine(argv) {
  return [process.execPath, ...argv].map(quoteArg).join(' ')
}

function buildDocsDist() {
  console.log('▶ 构建 docs dist（一次，供全部轮次复用）…')
  const r = spawnSync('pnpm', ['--filter', '@oas-ui/docs', 'run', 'build'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: IS_WIN,
    env: { ...process.env, OAS_DOCS_ANALYTICS: '0' },
  })
  if (r.status !== 0) {
    console.error('✖ docs build 失败，终止 soak')
    return false
  }
  return true
}

/** 运行时生成的 reporter：把每轮逐用例结果写成 JSONL，供汇总报告解析。 */
const REPORTER_SOURCE = `import { appendFileSync } from 'node:fs'

export default class SoakReporter {
  onTestEnd(test, result) {
    const record = {
      titles: test.titlePath(),
      file: test.location.file,
      title: test.title,
      status: result.status,
      retry: result.retry,
      duration: result.duration,
      errors: (result.errors || []).map((e) => String(e && e.message ? e.message : e).split('\\n')[0]),
    }
    appendFileSync(process.env.SOAK_ROUND_REPORT, JSON.stringify(record) + '\\n')
  }

  onEnd(result) {
    appendFileSync(
      process.env.SOAK_ROUND_REPORT,
      JSON.stringify({ summary: result.status, duration: result.duration }) + '\\n',
    )
  }
}
`

function playwrightArgs({ specs, project, retries, reporterRel, outputRel }) {
  return [
    PLAYWRIGHT_CLI,
    'test',
    `--project=${project}`,
    `--retries=${retries}`,
    `--output=${outputRel}`,
    `--reporter=list,${reporterRel}`,
    ...specs,
  ]
}

/**
 * 跑一轮：独立进程 + 独立端口 + 独立 output 目录；超时 kill 进程树。
 * 返回 { code, signal, timedOut, spawnError, durationMs }，不抛错（失败交给上层记录）。
 */
function runRound({ index, times, argv, env, logPath, timeoutMs }) {
  return new Promise((resolvePromise) => {
    const started = Date.now()
    const prefix = `[R${index}/${times}] `
    const out = createWriteStream(logPath, { flags: 'w' })
    // 日志写盘失败不该让整个 soak 崩溃（playwright 结果仍会落到 JSONL）
    out.on('error', () => {})
    const child = spawn(process.execPath, argv, {
      cwd: ROOT,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      // POSIX 下独立进程组，超时可按组 kill；Windows 用 taskkill /T
      detached: !IS_WIN,
    })
    currentChild = child

    let timedOut = false
    let settled = false
    let timer = null
    const finish = (info) => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      currentChild = null
      out.end(() => resolvePromise({ ...info, timedOut, durationMs: Date.now() - started }))
    }

    const tee = (stream) => {
      let buf = ''
      stream.setEncoding('utf8')
      stream.on('error', () => {})
      stream.on('data', (chunk) => {
        out.write(chunk)
        buf += chunk
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) process.stdout.write(`${prefix}${line}\n`)
      })
      stream.on('end', () => {
        if (buf) process.stdout.write(`${prefix}${buf}\n`)
      })
    }
    tee(child.stdout)
    tee(child.stderr)

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true
        console.error(`⏱ ${prefix}超过 ${Math.round(timeoutMs / 1000)}s，终止本轮进程树`)
        killTree(child.pid)
      }, timeoutMs)
    }

    child.on('error', (err) => finish({ code: null, signal: null, spawnError: String(err) }))
    child.on('close', (code, signal) => finish({ code, signal, spawnError: null }))
  })
}

function parseRound(jsonlPath, project) {
  if (!existsSync(jsonlPath)) {
    return { tests: new Map(), summary: null, parseError: '本轮未产出结果文件（playwright 可能未跑起来）' }
  }

  const tests = new Map()
  let summary = null
  let parseError = null

  for (const line of readFileSync(jsonlPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    let rec
    try {
      rec = JSON.parse(trimmed)
    } catch {
      parseError = '结果文件含无法解析的行'
      continue
    }
    if (rec.summary) {
      summary = rec
      continue
    }

    const file = relPosix(rec.file ?? '')
    const fileName = file.split('/').pop()
    // titlePath 结构随 playwright 版本/配置略有差异：稳妥做法是剔除 project 名与 spec 路径，
    // 只留 describe / test 标题（不依赖固定下标，避免不同 project 配置下 key 不一致）。
    const tail = (rec.titles ?? []).filter((t) => Boolean(t) && t !== project && t !== file && t !== fileName)
    const label = tail.length ? tail.join(' › ') : (rec.title ?? '(未命名用例)')
    const key = `${file} › ${label}`

    let entry = tests.get(key)
    if (!entry) {
      entry = { key, file, label, results: [] }
      tests.set(key, entry)
    }
    entry.results.push(rec)
  }

  for (const entry of tests.values()) {
    const last = entry.results.at(-1)
    const statuses = entry.results.map((r) => r.status)
    const hadFail = statuses.some((s) => s !== 'passed' && s !== 'skipped')

    let status = last?.status ?? 'unknown'
    if (status === 'passed') status = hadFail ? 'flaky' : 'passed'
    else if (status === 'skipped') status = 'skipped'
    else status = 'failed'

    entry.status = status
    entry.retries = Math.max(0, ...entry.results.map((r) => r.retry ?? 0))
    const failRec = entry.results.find((r) => r.status !== 'passed' && r.status !== 'skipped')
    entry.error = (failRec?.errors ?? []).find(Boolean) ?? ''
  }

  return { tests, summary, parseError }
}

function mdCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function statusIcon(status) {
  switch (status) {
    case 'passed':
      return '✅'
    case 'flaky':
      return '⚠️'
    case 'failed':
      return '❌'
    case 'skipped':
      return '⏭'
    case '?':
      return '?'
    default:
      return '—'
  }
}

function statusText(status) {
  switch (status) {
    case 'passed':
      return '通过'
    case 'flaky':
      return 'flaky'
    case 'failed':
      return '失败'
    case 'skipped':
      return '跳过'
    default:
      return '未知'
  }
}

function buildReport({ opts, specs, runDir, reportPath, startedAt, rounds, aborted, needBuild }) {
  const keys = [...new Set(rounds.flatMap((r) => [...r.tests.keys()]))].sort()

  const statusOf = (round, key) => {
    const entry = round.tests.get(key)
    if (entry) return entry.status
    return round.parseError ? '?' : '—'
  }

  const flakyKeys = keys.filter((key) => {
    const statuses = rounds.map((r) => statusOf(r, key)).filter((s) => s !== 'skipped' && s !== '—' && s !== '?')
    if (statuses.includes('flaky')) return true
    return new Set(statuses).size > 1
  })

  const failedKeys = keys.filter((key) => rounds.some((r) => statusOf(r, key) === 'failed'))
  const roundFailures = rounds.filter((r) => !r.ok)
  // 轮次级异常：超时 / 启动失败 / 无结果 / 0 用例，或退出码非零但用例层面查不到失败记录
  const structuralFailures = rounds.filter(
    (r) =>
      !r.ok &&
      (r.timedOut ||
        r.spawnError ||
        r.parseError ||
        r.tests.size === 0 ||
        ![...r.tests.values()].some((e) => e.status === 'failed')),
  )
  const totalMs = rounds.reduce((sum, r) => sum + r.durationMs, 0)

  const conclusion = aborted
    ? '⏹ 中断（未跑完）'
    : roundFailures.length || failedKeys.length
      ? '❌ 失败'
      : flakyKeys.length
        ? '⚠️ 存在 flaky'
        : '✅ 稳定'

  const lines = []
  lines.push('# e2e soak 报告')
  lines.push('')
  lines.push(`- 开始时间：${humanTime(startedAt)}`)
  lines.push(`- 生成时间：${humanTime()}`)
  lines.push(`- project：\`${opts.project}\``)
  lines.push(`- 轮次：${opts.times} 计划 / ${rounds.length} 实际完成${aborted ? '（中断）' : ''}`)
  lines.push(`- 每轮 retries：${opts.retries}`)
  lines.push(`- 单轮超时：${opts.roundTimeout}s`)
  lines.push(`- 总耗时：${formatDuration(totalMs)}`)
  lines.push(`- docs dist：${needBuild ? '本轮开始前构建一次' : '复用已存在的 dist'}`)
  lines.push(`- 结论：${conclusion}`)
  lines.push('')
  lines.push(`## spec 集（${specs.length}）`)
  lines.push('')
  for (const spec of specs) lines.push(`- \`${spec}\``)
  lines.push('')
  lines.push('## 轮次概览')
  lines.push('')
  lines.push('| 轮次 | 结果 | 通过 | 失败 | flaky | 跳过 | 耗时 | 日志 |')
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |')

  for (const round of rounds) {
    const counts = { passed: 0, failed: 0, flaky: 0, skipped: 0 }
    for (const entry of round.tests.values()) if (entry.status in counts) counts[entry.status]++
    const result = round.ok ? '✅ PASS' : '❌ FAIL'
    const reason = round.timedOut
      ? '（超时）'
      : round.spawnError
        ? '（启动失败）'
        : round.code !== 0
          ? `（exit ${round.code ?? '-'}）`
          : round.parseError
            ? '（无结果）'
            : round.tests.size === 0
              ? '（0 用例）'
              : ''
    lines.push(
      `| R${round.index} | ${result}${reason} | ${counts.passed} | ${counts.failed} | ${counts.flaky} | ${counts.skipped} | ${formatDuration(round.durationMs)} | [round-${round.index}.log](${relPosix(round.logPath)}) |`,
    )
  }
  if (aborted && rounds.length < opts.times) {
    lines.push(`| R${rounds.length + 1}…R${opts.times} | ⏹ 未执行 | — | — | — | — | — | — |`)
  }
  lines.push('')

  if (structuralFailures.length) {
    lines.push('## 轮次级异常')
    lines.push('')
    for (const round of structuralFailures) {
      const reason = round.timedOut
        ? `超时（>${opts.roundTimeout}s）被终止`
        : round.spawnError
          ? `启动失败：${round.spawnError}`
          : round.code !== 0
            ? `playwright 退出码 ${round.code ?? round.signal ?? '-'}`
            : round.parseError
              ? round.parseError
              : '未收集到任何用例（spec 过滤有误？）'
      lines.push(`- R${round.index}：${reason}；日志 \`${relPosix(round.logPath)}\``)
    }
    lines.push('')
  }

  lines.push('## 用例 × 轮次矩阵')
  lines.push('')
  if (!keys.length) {
    lines.push('_没有可汇总的用例。_')
  } else {
    lines.push(`| 用例 | ${rounds.map((r) => `R${r.index}`).join(' | ')} |`)
    lines.push(`| --- | ${rounds.map(() => '---').join(' | ')} |`)
    for (const key of keys) {
      const cells = rounds.map((r) => statusIcon(statusOf(r, key)))
      lines.push(`| ${mdCell(key)} | ${cells.join(' | ')} |`)
    }
  }
  lines.push('')

  lines.push('## ⚠️ flaky（结果不稳定）')
  lines.push('')
  if (!flakyKeys.length) {
    lines.push('无：各轮结果一致。')
  } else {
    for (const key of flakyKeys) {
      const detail = rounds
        .map((r) => {
          const entry = r.tests.get(key)
          if (!entry) return `R${r.index} ${statusIcon(statusOf(r, key))}`
          const retryNote = entry.status === 'flaky' ? `（重试 ${entry.retries} 次后通过）` : ''
          return `R${r.index} ${statusText(entry.status)}${retryNote}`
        })
        .join(' / ')
      lines.push(`- \`${key}\` → ${detail}`)
    }
  }
  lines.push('')

  lines.push('## ❌ 失败用例（去重）')
  lines.push('')
  if (!failedKeys.length) {
    lines.push('无。')
  } else {
    for (const key of failedKeys) {
      const failedRounds = rounds.filter((r) => statusOf(r, key) === 'failed')
      const firstError =
        failedRounds.map((r) => r.tests.get(key)?.error).find((e) => e && e.trim()) ?? '（无错误摘要，见日志）'
      const logs = failedRounds.map((r) => `R${r.index}: \`${relPosix(r.logPath)}\``).join('；')
      lines.push(`- \`${key}\``)
      lines.push(`  - 失败轮次：${failedRounds.map((r) => `R${r.index}`).join('、')}；日志 ${logs}`)
      lines.push(`  - 错误摘要：${mdCell(firstError)}`)
    }
  }
  lines.push('')

  lines.push('## 复现命令（第 1 轮）')
  lines.push('')
  lines.push('```')
  lines.push(rounds[0]?.command ?? '（无）')
  lines.push('```')
  lines.push('')
  lines.push(
    `_报告生成于 ${relPosix(reportPath)}；test-results/ 为 gitignore 目录，后续 playwright 全量运行可能清掉它。_`,
  )

  return {
    markdown: `${lines.join('\n')}\n`,
    keys,
    flakyKeys,
    failedKeys,
    roundFailures,
    structuralFailures,
    conclusion,
    totalMs,
  }
}

let currentChild = null
let aborted = false

async function main() {
  let opts
  let specs
  try {
    opts = parseArgs(process.argv.slice(2))
    if (opts.help) {
      console.log(HELP)
      return
    }
    specs = resolveSpecs(opts.specs ?? DEFAULT_SPECS)
  } catch (err) {
    if (err instanceof UsageError) {
      console.error(`✖ ${err.message}\n`)
      console.error('用 --help 查看用法')
      process.exit(2)
    }
    throw err
  }

  if (!existsSync(PLAYWRIGHT_CLI)) {
    console.error(`✖ 找不到 playwright CLI：${relPosix(PLAYWRIGHT_CLI)}（先安装依赖）`)
    process.exit(2)
  }

  const distReady = existsSync(DIST_INDEX)
  const needBuild = opts.build || !distReady
  const startedAt = new Date()
  const stamp = timestamp(startedAt)

  // 产物目录：同名时间戳已存在时加序号，避免覆盖上一轮 soak 的报告
  let runDir = join(OUT_ROOT, stamp)
  for (let n = 2; existsSync(runDir); n++) runDir = join(OUT_ROOT, `${stamp}-${n}`)
  if (!opts.dry) mkdirSync(runDir, { recursive: true })
  const reportPath = join(OUT_ROOT, `soak-${relPosix(runDir).split('/').pop()}.md`)
  const reporterPath = join(runDir, 'reporter.mjs')
  const reporterRel = `./${relPosix(reporterPath)}`

  console.log(`▶ soak：${opts.times} 轮 × ${specs.length} 个 spec（project=${opts.project}，retries=${opts.retries}）`)
  console.log(`▶ 单轮超时 ${opts.roundTimeout}s；每轮独立端口 + 独立 --output，轮间无共享状态`)
  console.log(
    `▶ docs dist：${needBuild ? '先构建一次再跑各轮' : '已存在 → 各轮 E2E_SKIP_BUILD=1（--build 可强制重建）'}`,
  )
  console.log(`▶ 报告：${relPosix(reportPath)}`)

  if (opts.dry) {
    console.log('\n—— 干跑（--dry）：以下命令不会执行 ——')
    if (needBuild) {
      console.log('  构建：OAS_DOCS_ANALYTICS=0 pnpm --filter @oas-ui/docs run build')
    }
    for (let n = 1; n <= opts.times; n++) {
      const outputRel = `${relPosix(runDir)}/artifacts/round-${n}`
      const argv = playwrightArgs({ specs, project: opts.project, retries: opts.retries, reporterRel, outputRel })
      console.log(`\n  R${n}/${opts.times}:`)
      console.log(
        `    E2E_PORT=<空闲端口> E2E_SKIP_BUILD=1 E2E_REUSE=0 SOAK_ROUND_REPORT=${relPosix(
          join(runDir, `round-${n}.jsonl`),
        )} \\`,
      )
      console.log(`      ${commandLine(argv)}`)
      console.log(`    日志：${relPosix(join(runDir, `round-${n}.log`))}`)
    }
    console.log(`\n  reporter（运行时生成）：${reporterRel}`)
    console.log('—— 干跑结束，未执行任何 playwright 命令 ——')
    return
  }

  writeFileSync(reporterPath, REPORTER_SOURCE)

  if (needBuild && !buildDocsDist()) process.exit(1)

  const rounds = []
  for (let n = 1; n <= opts.times; n++) {
    if (aborted) break

    let port
    try {
      port = await freePort()
    } catch (err) {
      console.error(`✖ 取空闲端口失败：${String(err)}`)
      process.exit(1)
    }

    const logPath = join(runDir, `round-${n}.log`)
    const jsonlPath = join(runDir, `round-${n}.jsonl`)
    const outputRel = `${relPosix(runDir)}/artifacts/round-${n}`
    const argv = playwrightArgs({ specs, project: opts.project, retries: opts.retries, reporterRel, outputRel })

    const env = {
      ...process.env,
      E2E_PORT: String(port),
      E2E_SKIP_BUILD: '1',
      // 固定不复用 server：复用会跨轮共享状态，掩盖/制造抖动
      E2E_REUSE: '0',
      SOAK_ROUND_REPORT: jsonlPath,
    }

    console.log(`\n▶ R${n}/${opts.times} 启动（端口 ${port}）…`)
    const run = await runRound({
      index: n,
      times: opts.times,
      argv,
      env,
      logPath,
      timeoutMs: opts.roundTimeout * 1000,
    })
    const parsed = parseRound(jsonlPath, opts.project)

    const ok =
      !run.timedOut &&
      !run.spawnError &&
      run.code === 0 &&
      !parsed.parseError &&
      parsed.tests.size > 0 &&
      parsed.summary?.status !== 'failed' &&
      parsed.summary?.status !== 'timedout' &&
      parsed.summary?.status !== 'interrupted'

    const counts = { passed: 0, failed: 0, flaky: 0, skipped: 0 }
    for (const entry of parsed.tests.values()) if (entry.status in counts) counts[entry.status]++

    rounds.push({
      index: n,
      ok,
      code: run.code,
      signal: run.signal,
      timedOut: run.timedOut,
      spawnError: run.spawnError,
      durationMs: run.durationMs,
      logPath,
      command: `E2E_PORT=${port} E2E_SKIP_BUILD=1 E2E_REUSE=0 SOAK_ROUND_REPORT=${relPosix(jsonlPath)} \\\n  ${commandLine(argv)}`,
      tests: parsed.tests,
      summary: parsed.summary,
      parseError: parsed.parseError,
    })

    const verdict = ok ? 'PASS' : 'FAIL'
    console.log(
      `  R${n} ${verdict}：通过 ${counts.passed} / 失败 ${counts.failed} / flaky ${counts.flaky} / 跳过 ${counts.skipped}，${formatDuration(
        run.durationMs,
      )}（日志 ${relPosix(logPath)}）`,
    )
    if (aborted) break
  }

  const report = buildReport({ opts, specs, runDir, reportPath, startedAt, rounds, aborted, needBuild })
  writeFileSync(reportPath, report.markdown)

  console.log('\n──────── soak 汇总 ────────')
  for (const round of rounds) {
    const counts = { passed: 0, failed: 0, flaky: 0, skipped: 0 }
    for (const entry of round.tests.values()) if (entry.status in counts) counts[entry.status]++
    console.log(
      `  R${round.index} ${round.ok ? 'PASS' : 'FAIL'}：通过 ${counts.passed} / 失败 ${counts.failed} / flaky ${counts.flaky} / 跳过 ${counts.skipped}（${formatDuration(
        round.durationMs,
      )}）`,
    )
  }

  if (report.flakyKeys.length) {
    console.log(`\n⚠️ flaky（${report.flakyKeys.length} 个用例结果不稳定）：`)
    for (const key of report.flakyKeys) {
      const detail = rounds
        .map((r) => {
          const entry = r.tests.get(key)
          return `R${r.index} ${entry ? statusText(entry.status) : statusIcon('—')}`
        })
        .join(' / ')
      console.log(`  - ${key} → ${detail}`)
    }
  }

  if (report.failedKeys.length) {
    console.log(`\n❌ 失败用例（${report.failedKeys.length} 个去重）：`)
    for (const key of report.failedKeys) {
      const failedRounds = rounds.filter((r) => r.tests.get(key)?.status === 'failed')
      console.log(`  - ${key}（${failedRounds.map((r) => `R${r.index}`).join('、')}）`)
    }
  }

  if (report.structuralFailures.length) {
    console.log(`\n❌ 轮次级异常：${report.structuralFailures.map((r) => `R${r.index}`).join('、')}（详见报告）`)
  }

  const totalMs = report.totalMs
  console.log(`\n结论：${report.conclusion}；总耗时 ${formatDuration(totalMs)}`)
  console.log(`报告：${relPosix(reportPath)}`)
  console.log(`产物目录：${relPosix(runDir)}`)

  process.exit(report.conclusion.startsWith('✅') ? 0 : 1)
}

process.on('SIGINT', () => {
  if (aborted) {
    process.exit(130)
  }
  aborted = true
  console.error('\n⏹ 收到 SIGINT：终止当前轮，输出已完成轮次的汇总…')
  if (currentChild?.pid) killTree(currentChild.pid)
})

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
