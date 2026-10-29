import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { computeSameShaNoise } from './browser-bench.mjs'

/**
 * `perf:browser:check` 的样本完整性契约（红绿两侧）：
 * - 合法基线 → 退出 0；
 * - 缺样本 / 指标非有限（NaN 或缺失）→ 退出非零。
 *
 * 通过 `PERF_BROWSER_BASELINE` 指向临时文件，避免覆盖入库基线。
 * `--update-baseline` 与 `:check` 共用同一套 `validateBaselinePayload`，
 * 因此这里的校验即写盘前校验。
 */
const SCRIPT = fileURLToPath(new URL('./browser-bench.mjs', import.meta.url))
const METRICS = ['lcp', 'fcp', 'dcl', 'load', 'firstRender', 'domNodes', 'transferBytes']
const SETTINGS = {
  csr: { warmup: 5, rounds: 3, perRound: 30 },
  dsd: { warmup: 2, rounds: 3, perRound: 15 },
}

let dir

before(() => {
  dir = mkdtempSync(join(tmpdir(), 'oas-perf-browser-'))
})

after(() => {
  rmSync(dir, { recursive: true, force: true })
})

function sample(value) {
  return Object.fromEntries(METRICS.map((metric) => [metric, value]))
}

function stats(value, count) {
  return { count, min: value, median: value, p95: value, max: value, mean: value }
}

function metrics(value, count) {
  return Object.fromEntries(METRICS.map((metric) => [metric, stats(value, count)]))
}

function buildPayload() {
  const scenarios = {}
  for (const [name, settings] of Object.entries(SETTINGS)) {
    const total = settings.rounds * settings.perRound
    scenarios[name] = {
      warmup: settings.warmup,
      rounds: settings.rounds,
      samplesPerRound: settings.perRound,
      raw: Array.from({ length: total }, (_, index) => sample(100 + (index % 10))),
      roundStats: Array.from({ length: settings.rounds }, () => metrics(100, settings.perRound)),
      aggregate: metrics(100, total),
    }
  }
  return {
    generatedAt: '2026-10-30',
    method: 'self-test fixture',
    gitSha: '0123456789abcdef0123456789abcdef01234567',
    gitDirty: false,
    versions: { '@oas-ui/ui': '2.6.4', '@oas-ui/ssr': '2.6.4' },
    env: {
      node: 'v22.18.0',
      pnpm: '12.5.1',
      os: 'linux 6.0 (x64)',
      cpu: 'Self Test CPU',
      cpuCores: 8,
      memoryGB: 32,
      chromium: '156.0.0.0',
      playwright: '1.64.1',
      workers: 1,
    },
    settings: { viewport: { width: 1280, height: 800 }, regressionWarnRatio: 1.25 },
    sameShaNoise: { compared: false, reason: 'self-test' },
    scenarios,
  }
}

function writePayload(name, payload) {
  const path = join(dir, `${name}.json`)
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  return path
}

function runCheck(path) {
  return spawnSync(process.execPath, [SCRIPT, '--check'], {
    encoding: 'utf8',
    env: { ...process.env, PERF_BROWSER_BASELINE: path },
  })
}

describe('perf:browser:check 样本校验', () => {
  it('合法基线退出 0', () => {
    const result = runCheck(writePayload('valid', buildPayload()))
    assert.equal(result.status, 0, result.stderr || result.stdout)
    assert.match(result.stdout, /PASS/)
  })

  it('缺样本（raw 少一条）非零退出', () => {
    const payload = buildPayload()
    payload.scenarios.csr.raw.pop()
    const result = runCheck(writePayload('missing-sample', payload))
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /csr\.raw 样本数/)
  })

  it('指标为 NaN 非零退出', () => {
    const payload = buildPayload()
    payload.scenarios.dsd.raw[0].lcp = 'NaN'
    const result = runCheck(writePayload('nan-metric', payload))
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /dsd\.raw\[0\]\.lcp/)
  })

  it('指标缺失（undefined → JSON 省略）非零退出', () => {
    const payload = buildPayload()
    delete payload.scenarios.csr.aggregate.lcp
    const result = runCheck(writePayload('missing-aggregate', payload))
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /csr\.aggregate\.lcp/)
  })

  it('LCP 未采集写 null 非零退出（不得静默写 0）', () => {
    const payload = buildPayload()
    payload.scenarios.csr.raw[3].lcp = null
    const result = runCheck(writePayload('null-lcp', payload))
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /csr\.raw\[3\]\.lcp/)
  })

  it('roundStats[].count 与 samplesPerRound 不一致非零退出', () => {
    const payload = buildPayload()
    payload.scenarios.dsd.roundStats[1].lcp.count = SETTINGS.dsd.perRound - 1
    const result = runCheck(writePayload('round-count-mismatch', payload))
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /dsd\.roundStats\[1\]\.lcp\.count/)
  })

  it('gitDirty 参照只 WARN、不阻断校验（脏工作树基线仍可解析）', () => {
    const payload = buildPayload()
    payload.gitDirty = true
    const result = runCheck(writePayload('dirty-baseline', payload))
    assert.equal(result.status, 0, result.stderr || result.stdout)
    assert.match(`${result.stdout}${result.stderr}`, /WARN/)
    assert.match(`${result.stdout}${result.stderr}`, /gitDirty=true/)
  })

  it('同 SHA 噪声：工作树脏（参照或本次）不比较，返回 compared:false + 原因', () => {
    const sha = '0123456789abcdef0123456789abcdef01234567'
    const scenario = { aggregate: { lcp: { median: 100, p95: 120 } } }
    const previous = { gitSha: sha, gitDirty: false, scenarios: { csr: scenario, dsd: scenario } }
    const current = { gitSha: sha, gitDirty: false, scenarios: { csr: scenario, dsd: scenario } }
    // 干净 + 同 SHA：正常比较
    assert.equal(computeSameShaNoise(previous, current).compared, true)

    const dirtyBaseline = computeSameShaNoise({ ...previous, gitDirty: true }, current)
    assert.equal(dirtyBaseline.compared, false)
    assert.match(dirtyBaseline.reason, /gitDirty|工作树/)

    const dirtyCurrent = computeSameShaNoise(previous, { ...current, gitDirty: true })
    assert.equal(dirtyCurrent.compared, false)
    assert.match(dirtyCurrent.reason, /gitDirty|工作树/)
  })

  it('--self-test 退出 0（内部再验证上述红绿两侧）', () => {
    const result = spawnSync(process.execPath, [SCRIPT, '--self-test'], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr || result.stdout)
    assert.match(result.stdout, /PASS/)
  })
})
