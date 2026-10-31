#!/usr/bin/env node
/**
 * 发布 rehearsal：本地完整重放 CI 门禁（打 tag 前必跑），证据按层落盘供 pre-push 核验。
 *
 * 步骤清单**直接解析 .github/workflows/ci.yml**——CI 步骤变更时本脚本自动跟随，
 * 清单永不失同步（v2.6.5 事故：发布前漏跑 qa:audit:check，阈值超量在 CI 才暴露）。
 *
 * 层映射（证据文件里三层与 CI 的对应关系）：
 * - testJob ← ci.yml `test` job 全部 `- run:` 步骤（单一真源，由 ci-steps.mjs 解析）
 *   + 本地加严两项（trace --all、lint:md）
 * - e2e     ← `pnpm test:e2e`（= ci.yml `e2e` + `e2e-webkit` 两个 job 合并本地跑；
 *   CI 分 6 片 + webkit 单 job，本地合并一次跑完）
 * - ssrE2e  ← ci.yml `ssr-fixtures` job 的复刻：去重根 install/build（testJob 层已跑）、
 *   跳过 `playwright install --with-deps`（环境相关；浏览器需本机已安装 `playwright install`，
 *   缺失时由 playwright 自身报错）；保留 fixture 的 install/build/typecheck（带 cwd）与
 *   Next/Nuxt 两轮 e2e（SSR_FIXTURE 经 spawnSync env 注入，不用 `VAR=x cmd` 前缀——Windows cmd 下无效）。
 *   注意 `playwright.ssr.config.ts` 的 webServer 只启动已构建产物、不做 install/build，
 *   所以 fixture 步骤必须先跑，否则干净环境必然失败。
 *
 * 用法：
 *   node scripts/release/rehearse.mjs                            # test job 全步骤 + 本地加严
 *   node scripts/release/rehearse.mjs --with-e2e                 # 追加 e2e 层
 *   node scripts/release/rehearse.mjs --with-ssr-e2e             # 追加 ssrE2e 层
 *   node scripts/release/rehearse.mjs --with-e2e --with-ssr-e2e  # e2e 两层一起跑
 *   node scripts/release/rehearse.mjs --list                     # 只打印步骤清单（不校验私有文件）
 *   node scripts/release/rehearse.mjs --quiet                    # 成功步不刷屏（失败步原样吐输出）
 *
 * 行为约定（fail closed）：
 * - 前置校验：工作树必须干净（无绕过开关）；记录起始 HEAD sha（40 hex）。
 * - 逐条 spawnSync 执行，任何一步失败即停（不续跑剩余步骤），exit 1；
 *   --quiet 下失败步的 stdout/stderr 原样打出（草稿版在此吞输出，看不到失败原因）。
 * - 按层写证据到 <git-dir>/oas-release-rehearsal.json（testJob / e2e / ssrE2e）：
 *   同 SHA 内按层累积（--with-e2e / --with-ssr-e2e 可事后补跑，不覆盖已跑层）；
 *   整层全绿才写 ok:true，失败层写 ok:false（覆盖同 SHA 的旧全绿证据，防止陈旧证据放行）；
 *   执行期间 HEAD 漂移则整份不写（有新提交，结果不作数）。
 * - 推 v* tag 时 pre-push 钩子经 scripts/release/verify-rehearsal.mjs 核对本 SHA 证据。
 * - 本仓库禁止 `pnpm <script> -- --arg` 写法（pnpm 12 会把 `--` 传给脚本）：
 *   步骤命令全部来自 ci.yml（CI 已禁该写法）与本文件写死的本地加严项，无此形态。
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync, spawnSync } from 'node:child_process'
import { parseJobRunSteps } from './ci-steps.mjs'
import { STATE_FILENAME, writeLayer } from './rehearsal-state.mjs'

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const LABEL = '[rehearse]'

const argv = process.argv.slice(2)
const withE2e = argv.includes('--with-e2e')
const withSsrE2e = argv.includes('--with-ssr-e2e')
const listOnly = argv.includes('--list')
const quiet = argv.includes('--quiet')

function gitOut(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

/** 步骤统一展示（--list / 执行进度 / 失败总结共用）：来源 + 目录 + 环境变量 + 命令 */
const formatStep = (s) =>
  `[${s.source}]` +
  (s.cwd ? ` @${s.cwd}` : '') +
  (s.env
    ? ` ${Object.entries(s.env)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ')}`
    : '') +
  ` ${s.cmd}`

// ---------- 1. 构造步骤清单（ci.yml 为单一真源 + 本地加严 + 可选 e2e 层） ----------

let ciSteps
try {
  ciSteps = parseJobRunSteps(readFileSync(join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8'), 'test')
} catch (err) {
  console.error(`${LABEL} ✗ ${err.message}`)
  process.exit(1)
}

// ssrE2e 层：复刻 ci.yml `ssr-fixtures` job（去重根 install/build、跳过 playwright install --with-deps）。
// fixture 的 install/build/typecheck 在各 fixture 目录跑；e2e 的 SSR_FIXTURE 走 spawnSync env 注入。
const SSR_FIXTURES = ['next', 'nuxt']
const ssrSteps = [
  ...SSR_FIXTURES.flatMap((f) => [
    { cmd: 'pnpm install --frozen-lockfile', cwd: `packages/ssr/fixtures/${f}` },
    { cmd: 'pnpm build', cwd: `packages/ssr/fixtures/${f}` },
  ]),
  ...SSR_FIXTURES.map((f) => ({ cmd: 'pnpm typecheck', cwd: `packages/ssr/fixtures/${f}` })),
  ...SSR_FIXTURES.map((f) => ({ cmd: `pnpm test:e2e:ssr --project=${f}`, env: { SSR_FIXTURE: f } })),
].map((s) => ({ ...s, source: 'ssr-fixtures job', layer: 'ssrE2e' }))

const plan = [
  ...ciSteps.map((cmd) => ({ cmd, source: 'ci.yml test job', layer: 'testJob' })),
  { cmd: 'node .opencode/check-trace.mjs --all', source: '本地加严', layer: 'testJob' },
  { cmd: 'pnpm lint:md', source: '本地加严', layer: 'testJob' },
  ...(withE2e ? [{ cmd: 'pnpm test:e2e', source: 'e2e', layer: 'e2e' }] : []),
  ...(withSsrE2e ? ssrSteps : []),
]

if (listOnly) {
  console.log(`${LABEL} 将执行 ${plan.length} 步：`)
  for (const [i, s] of plan.entries()) {
    console.log(`  ${i + 1}. ${formatStep(s)}`)
  }
  const layers = ['testJob', withE2e && 'e2e', withSsrE2e && 'ssrE2e'].filter(Boolean)
  console.log(
    `${LABEL} 层归属：${layers.join(' + ')}（映射：testJob ← ci.yml test job；e2e ← e2e + e2e-webkit 合并本地跑；ssrE2e ← ssr-fixtures job 去重根 install/build、跳过 playwright install --with-deps）`,
  )
  if (!withE2e || !withSsrE2e) {
    console.log(`${LABEL} 提示：--with-e2e / --with-ssr-e2e 可独立或同时给；同 SHA 内按层累积，不覆盖已跑层。`)
  }
  process.exit(0)
}

// ---------- 2. 执行前校验（fail closed）：私有门禁文件 + 工作树干净 + 固定起始 SHA + git-dir ----------

if (!existsSync(join(ROOT, '.opencode', 'check-trace.mjs'))) {
  console.error(`${LABEL} ✗ 缺 .opencode/check-trace.mjs——本地加严步骤无法执行，fail closed（私有门禁文件未就绪）`)
  process.exit(1)
}

let dirty
try {
  dirty = gitOut('status', '--porcelain')
} catch (err) {
  console.error(`${LABEL} ✗ 无法读取 git status（当前目录不是 git 仓库？）：${String(err.message).split('\n')[0]}`)
  process.exit(1)
}
if (dirty !== '') {
  const dirtyLines = dirty.split('\n')
  console.error(`${LABEL} ✗ 工作树不干净——rehearse 证据必须绑定一个干净的提交树，先提交或 stash（无绕过开关）：`)
  for (const line of dirtyLines.slice(0, 10)) console.error(`  ${line}`)
  if (dirtyLines.length > 10) console.error('  …')
  process.exit(1)
}

let headSha
try {
  headSha = gitOut('rev-parse', 'HEAD')
} catch {
  console.error(`${LABEL} ✗ 无法解析 HEAD——fail closed`)
  process.exit(1)
}
if (!/^[0-9a-f]{40}$/i.test(headSha)) {
  console.error(`${LABEL} ✗ HEAD sha 形状非法（须 40 位 hex）：${headSha}——fail closed`)
  process.exit(1)
}

let gitDir
try {
  // git rev-parse --git-dir 可能返回相对路径（主仓 `.git`）或绝对路径（worktree），统一 resolve
  gitDir = resolve(ROOT, gitOut('rev-parse', '--git-dir'))
} catch {
  console.error(`${LABEL} ✗ 无法定位 git 目录——fail closed`)
  process.exit(1)
}

// ---------- 3. 逐条执行（失败即停） ----------

const layerSteps = { testJob: [], e2e: [], ssrE2e: [] }
const layerMs = { testJob: 0, e2e: 0, ssrE2e: 0 }
/** 按实际执行顺序出现过的层（决定证据写入顺序与范围） */
const layerOrder = []
let currentLayer = null
let failed = null
const startedAt = Date.now()

console.log(
  `${LABEL} 起始 SHA ${headSha.slice(0, 9)}；共 ${plan.length} 步（层：` +
    `${['testJob', withE2e && 'e2e', withSsrE2e && 'ssrE2e'].filter(Boolean).join(' + ')}）`,
)

for (const [i, step] of plan.entries()) {
  if (step.layer !== currentLayer) {
    currentLayer = step.layer
    layerOrder.push(step.layer)
  }
  const t0 = Date.now()
  if (quiet) {
    process.stdout.write(`\r${LABEL} [${i + 1}/${plan.length}] ${formatStep(step)} \u001b[K`)
  } else {
    console.log(`${LABEL} (${i + 1}/${plan.length}) ${formatStep(step)}`)
  }
  const r = spawnSync(step.cmd, {
    shell: true,
    cwd: step.cwd ? join(ROOT, step.cwd) : ROOT,
    env: step.env ? { ...process.env, ...step.env } : process.env,
    encoding: 'utf8',
    stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  })
  const ms = Date.now() - t0
  if (r.status !== 0) {
    if (quiet) {
      // 失败步必须把该步 stdout/stderr 原样打出来（--quiet 只静音成功步）
      process.stdout.write('\n')
      if (r.stdout) process.stdout.write(r.stdout)
      if (r.stderr) process.stderr.write(r.stderr)
    }
    failed = { ...step, stepNo: i + 1, exitCode: r.status ?? -1 }
    break
  }
  layerSteps[step.layer].push(step.cmd)
  layerMs[step.layer] += ms
  if (quiet) process.stdout.write('✓\n')
}

// ---------- 4. 收尾：SHA 漂移检查 + 按层写证据 ----------

let headAfter = null
try {
  headAfter = gitOut('rev-parse', 'HEAD')
} catch {
  // 保持 null：与起始 sha 必不相等，走漂移失败
}
if (headAfter !== headSha) {
  console.error('')
  console.error(
    `${LABEL} ✗ 执行期间 HEAD 从 ${headSha.slice(0, 9)} 变为 ${(headAfter ?? '无法解析').slice(0, 9)}` +
      '——执行期间有新提交，本次结果不作数，证据不写入（tag 树必须与已验证树完全一致）',
  )
  process.exit(1)
}

const finishedAt = new Date().toISOString()
for (const layer of layerOrder) {
  if (failed && failed.layer === layer) {
    // 失败层写 ok:false：覆盖同 SHA 旧的全绿证据，防止陈旧证据放行（fail closed）
    writeLayer(gitDir, headSha, layer, {
      ok: false,
      failedStep: failed.cmd,
      exitCode: failed.exitCode,
      finishedAt,
    })
  } else {
    writeLayer(gitDir, headSha, layer, {
      ok: true,
      steps: layerSteps[layer],
      durationMs: layerMs[layer],
      finishedAt,
    })
  }
}

// ---------- 5. 结论 ----------

console.log('')
if (failed) {
  console.error(`${LABEL} ✗ 第 ${failed.stepNo}/${plan.length} 步失败（exit ${failed.exitCode}）${formatStep(failed)}`)
  console.error(
    `${LABEL} 证据已更新（层：${layerOrder.join('、')}，失败层记 ok:false）；` +
      '修复后从头重跑——tag 树必须与「全绿树」完全一致，不允许断点续跑',
  )
  process.exit(1)
}

const wallMin = Math.round((Date.now() - startedAt) / 60000)
console.log(
  `${LABEL} ✓ 全部 ${plan.length} 步通过（约 ${wallMin} 分钟）；证据已写入 ${join(gitDir, STATE_FILENAME)}（层：${layerOrder.join('、')}）`,
)

const missingLayers = [!withE2e && 'e2e', !withSsrE2e && 'ssrE2e'].filter(Boolean)
if (missingLayers.length > 0) {
  console.log(
    `${LABEL} 还缺 ${missingLayers.join(' / ')} 层证据：补跑 pnpm release:rehearse --with-e2e --with-ssr-e2e` +
      '（同 SHA 内按层累积，不覆盖已跑层）',
  )
}
console.log(
  `${LABEL} 三层齐全后：git tag v<版本> → git push origin main → CI 该 SHA 全绿 → git push origin v<版本>（pre-push 将核对本 SHA 证据）`,
)
