/**
 * Release 同 SHA 质量门禁的自测（node:test，无第三方依赖）。
 *
 * 证明的不是「读一遍真仓库恰好一致」，而是判定行为本身：
 * - `release-gate.mjs` 纯函数：同 SHA 完整 CI 绿放行；其他 SHA / pending / failure /
 *   cancelled / 空结果 / 非 CI workflow / 异仓库 head 一律 fail closed；
 * - `release-check.mjs` CLI（可控 fixture git 仓库 + 子进程跑真实脚本）：
 *   CI 严格模式（`--require-tag-head`）下 lightweight/annotated tag 均正确解引用、
 *   tag 验证后移动阻断、HEAD ≠ GITHUB_SHA 阻断、tag 缺失阻断；
 *   本地模式保持原 warning 兼容（tag ≠ HEAD 不拦截）；版本 / CHANGELOG / 非 semver 阻断；
 *   `--verify-ci` 以假 gh 可执行文件（PATH 注入）做集成 mock：成功 JSON 放行、
 *   workflow_runs 形状异常 fail closed、gh 缺失 fail closed；
 * - `.github/workflows/release.yml` 静态断言：verify-quality → publish 依赖、
 *   checkout 固定验证 SHA + 完整历史、严格 release:check 先于 build/api:check/发布、
 *   两 job 权限各自最小（verify 不给 publish 额外权限）。
 *
 * 运行：`node --test scripts/release-check.test.mjs`（已接入 `pnpm release:check:test`）。
 */
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, test } from 'node:test'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SCRIPT = join(ROOT, 'scripts', 'release-check.mjs')
const RELEASE_YML = join(ROOT, '.github', 'workflows', 'release.yml')

// ---------- fixture：可控 git 仓库（临时目录，after 统一清理） ----------

const FIXTURE_VERSION = '2.6.5'
const MAIN_PACKAGES = ['core', 'icons', 'theme', 'i18n', 'ssr', 'ui']
const createdDirs = []

function git(dir, ...args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8' })
}

const revParse = (dir, ref) => git(dir, 'rev-parse', ref).trim()

function writeRepoFiles(dir, { version = FIXTURE_VERSION, changelog = true } = {}) {
  for (const p of [...MAIN_PACKAGES, 'next', 'nuxt']) {
    mkdirSync(join(dir, 'packages', p), { recursive: true })
    writeFileSync(join(dir, 'packages', p, 'package.json'), JSON.stringify({ name: `@oas-ui/${p}`, version }))
  }
  writeFileSync(
    join(dir, 'CHANGELOG.md'),
    changelog ? `# Changelog\n\n## [${FIXTURE_VERSION}] - 2026-10-28\n\n### 修复\n\n- x\n` : '# Changelog\n',
  )
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'oas-ui', private: true }))
}

function initRepo(opts = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'release-check-fixture-'))
  createdDirs.push(dir)
  git(dir, 'init', '-q', '-b', 'main')
  git(dir, 'config', 'user.email', 'fixture@example.com')
  git(dir, 'config', 'user.name', 'fixture')
  writeRepoFiles(dir, opts)
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'a')
  return dir
}

function commitMore(dir) {
  writeFileSync(join(dir, 'extra.txt'), 'b\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'b')
}

/** 子进程跑真实脚本，捕获退出码与输出（绝不改真实仓库：cwd 恒为 fixture；spawnSync 同时拿 stdout/stderr）。
 * 默认剥离 GITHUB_SHA / GITHUB_REPOSITORY：GitHub Actions 会向所有步骤注入它们，
 * 泄漏进 fixture 子进程会让「移动前应放行」等用例在 CI 必红（显式传值的用例经 env 叠加不受影响）。 */
function runScript(args, { dir, env = {} } = {}) {
  const inherited = { ...process.env }
  delete inherited.GITHUB_SHA
  delete inherited.GITHUB_REPOSITORY
  const r = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: dir ?? ROOT,
    env: { ...inherited, ...env },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return { status: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' }
}

after(() => {
  for (const d of createdDirs) rmSync(d, { recursive: true, force: true })
})

// ---------- release-gate.mjs：CI run 判定矩阵（纯函数，fixture 注入） ----------

const REPO = 'oas-ui/oas-ui'
const WORKFLOW = '.github/workflows/ci.yml'
const SHA = 'a'.repeat(40)
const SHA_OTHER = 'b'.repeat(40)

/** 一条「同仓库 + 目标 SHA + ci.yml + completed+success」的标准绿 run */
const greenRun = (over = {}) => ({
  id: 7,
  name: 'CI',
  event: 'push',
  path: WORKFLOW,
  head_sha: SHA,
  head_repository: { full_name: REPO },
  status: 'completed',
  conclusion: 'success',
  run_number: 3,
  html_url: `https://github.com/${REPO}/actions/runs/7`,
  ...over,
})

const loadGate = () => import('./release-gate.mjs')

test('同仓库同 SHA 的 ci.yml completed+success run → 放行并给出 run 引用', async () => {
  const { evaluateCiRuns } = await loadGate()
  const r = evaluateCiRuns({ runs: [greenRun()], sha: SHA, repo: REPO })
  assert.equal(r.ok, true)
  assert.equal(r.run.id, 7)
})

test('pending / in_progress / queued（未 completed）→ fail closed', async () => {
  const { evaluateCiRuns } = await loadGate()
  for (const status of ['pending', 'in_progress', 'queued', 'requested', 'waiting']) {
    const r = evaluateCiRuns({ runs: [greenRun({ status, conclusion: null })], sha: SHA, repo: REPO })
    assert.equal(r.ok, false, `status=${status} 不应放行`)
    assert.ok(r.reasons.join('\n').includes('completed+success'), `status=${status} 的原因应说明未 completed`)
  }
})

test('completed 但 failure / cancelled / timed_out → fail closed', async () => {
  const { evaluateCiRuns } = await loadGate()
  for (const conclusion of ['failure', 'cancelled', 'timed_out']) {
    const r = evaluateCiRuns({ runs: [greenRun({ conclusion })], sha: SHA, repo: REPO })
    assert.equal(r.ok, false, `conclusion=${conclusion} 不应放行`)
    assert.ok(r.reasons.join('\n').includes(conclusion))
  }
})

test('空结果 / 非数组 → fail closed（查不到证据不放行）', async () => {
  const { evaluateCiRuns } = await loadGate()
  for (const runs of [[], undefined, null, 'nope']) {
    const r = evaluateCiRuns({ runs, sha: SHA, repo: REPO })
    assert.equal(r.ok, false)
    assert.ok(r.reasons.join('\n').includes('空'))
  }
})

test('其他 workflow（release.yml / deploy）的成功 run 不算完整 CI → fail closed', async () => {
  const { evaluateCiRuns } = await loadGate()
  const r = evaluateCiRuns({
    runs: [greenRun({ path: '.github/workflows/release.yml' }), greenRun({ path: '.github/workflows/deploy.yml' })],
    sha: SHA,
    repo: REPO,
  })
  assert.equal(r.ok, false)
  assert.ok(r.reasons.join('\n').includes(WORKFLOW))
})

test('其他 SHA 的成功 run（tag 验证后指向了没跑过 CI 的提交）→ fail closed', async () => {
  const { evaluateCiRuns } = await loadGate()
  const r = evaluateCiRuns({ runs: [greenRun({ head_sha: SHA_OTHER })], sha: SHA, repo: REPO })
  assert.equal(r.ok, false)
  assert.ok(r.reasons.join('\n').includes(SHA_OTHER.slice(0, 8)))
})

test('异仓库 head（fork 的 run）→ fail closed', async () => {
  const { evaluateCiRuns } = await loadGate()
  const r = evaluateCiRuns({
    runs: [greenRun({ head_repository: { full_name: 'forker/oas-ui' } })],
    sha: SHA,
    repo: REPO,
  })
  assert.equal(r.ok, false)
})

test('release:check 的版本解析：v 前缀可带可不带；非 x.y.z（含 prerelease/短版本/文本）一律拒绝', async () => {
  const { parseReleaseVersion } = await loadGate()
  assert.equal(parseReleaseVersion('v2.6.5'), '2.6.5')
  assert.equal(parseReleaseVersion('2.6.5'), '2.6.5')
  for (const bad of ['2.6', 'abc', '2.6.5-beta.1', 'v', '', 'v2.6.5.1', null, undefined]) {
    assert.equal(parseReleaseVersion(bad), null, `${String(bad)} 应拒绝`)
  }
})

// ---------- release-check.mjs CLI：严格 tag=HEAD 模式与本地兼容（fixture 仓库 + 子进程） ----------

test('CI 严格模式：lightweight tag 指向验证 SHA（GITHUB_SHA）→ 放行', () => {
  const dir = initRepo()
  commitMore(dir)
  const head = revParse(dir, 'HEAD')
  git(dir, 'tag', `v${FIXTURE_VERSION}`)
  const r = runScript([FIXTURE_VERSION, '--require-tag-head'], { dir, env: { GITHUB_SHA: head } })
  assert.equal(r.status, 0, `应放行：\n${r.stderr}`)
  assert.match(r.stdout, /通过/)
  assert.match(r.stdout, /指向验证/)
})

test('CI 严格模式：annotated tag 正确解引用到同一提交 → 放行', () => {
  const dir = initRepo()
  commitMore(dir)
  const head = revParse(dir, 'HEAD')
  git(dir, 'tag', '-a', `v${FIXTURE_VERSION}`, '-m', `v${FIXTURE_VERSION}`)
  const r = runScript([FIXTURE_VERSION, '--require-tag-head'], { dir, env: { GITHUB_SHA: head } })
  assert.equal(r.status, 0, `annotated tag 应解引用放行：\n${r.stderr}`)
  assert.match(r.stdout, /通过/)
})

test('CI 严格模式：tag 验证后移动到其他提交 → 阻断；本地模式保持原 warning 兼容', () => {
  const dir = initRepo()
  commitMore(dir)
  git(dir, 'tag', `v${FIXTURE_VERSION}`)
  assert.equal(runScript([FIXTURE_VERSION, '--require-tag-head'], { dir }).status, 0, '移动前应放行')
  // 验证后把 tag 移到第一个提交（旧提交，未跑过该 release 的任何验证）
  const first = revParse(dir, 'HEAD~1')
  git(dir, 'tag', '-f', `v${FIXTURE_VERSION}`, first)
  const strict = runScript([FIXTURE_VERSION, '--require-tag-head'], { dir })
  assert.notEqual(strict.status, 0, '严格模式必须阻断被移动过的 tag')
  assert.match(strict.stderr, /tag v2\.6\.5/)
  assert.match(strict.stderr, /HEAD/)
  // 本地模式（无 flag）兼容原行为：仅警告、不拦截
  const local = runScript([FIXTURE_VERSION], { dir })
  assert.equal(local.status, 0, '本地模式不应被 tag≠HEAD 阻断（原 warning 语义）')
  assert.match(local.stderr, /⚠/)
  assert.match(local.stderr, /非 HEAD/)
})

test('CI 严格模式：HEAD ≠ GITHUB_SHA（checkout 未固定在验证 SHA）→ 阻断', () => {
  const dir = initRepo()
  commitMore(dir)
  git(dir, 'tag', `v${FIXTURE_VERSION}`)
  const r = runScript([FIXTURE_VERSION, '--require-tag-head'], { dir, env: { GITHUB_SHA: SHA_OTHER } })
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /GITHUB_SHA/)
})

test('CI 严格模式：tag 不存在 → fail closed；本地打 tag 前流程不受影响', () => {
  const dir = initRepo()
  const strict = runScript([FIXTURE_VERSION, '--require-tag-head'], { dir })
  assert.notEqual(strict.status, 0, 'CI 严格模式下 tag 必须已存在')
  assert.match(strict.stderr, /不存在/)
  const local = runScript([FIXTURE_VERSION], { dir })
  assert.equal(local.status, 0, '本地「打 tag 前跑 release:check」的旧流程必须继续可用')
})

test('发布包版本与目标不一致 → 阻断（两种模式一致）', () => {
  const dir = initRepo()
  for (const args of [[FIXTURE_VERSION], [FIXTURE_VERSION, '--require-tag-head']]) {
    const r = runScript(['2.6.4', ...args.slice(1)], { dir })
    assert.notEqual(r.status, 0, `目标 2.6.4 ≠ 包版本 ${FIXTURE_VERSION} 应阻断`)
    assert.match(r.stderr, /≠ 目标/)
  }
})

test('CHANGELOG 缺目标段 → 阻断', () => {
  const dir = initRepo({ changelog: false })
  const r = runScript([FIXTURE_VERSION], { dir })
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /CHANGELOG/)
})

test('非 semver 版本直接失败（含 prerelease / 短版本 / 任意文本），并给出明确原因', () => {
  const dir = initRepo()
  for (const bad of ['2.6', 'abc', '2.6.5-beta.1', 'v2.6.5-extra']) {
    const r = runScript([bad], { dir })
    assert.notEqual(r.status, 0, `非 x.y.z 目标「${bad}」应直接失败`)
    assert.match(r.stderr, /不是合法的 x\.y\.z 目标版本/, `「${bad}」应有明确拒绝原因，而非只打印用法`)
  }
})

// ---------- release-check.mjs CLI：--verify-ci 环境契约（fail closed） ----------

test('--verify-ci：缺 GITHUB_REPOSITORY / GITHUB_SHA → fail closed', () => {
  const dir = initRepo()
  const r = runScript(['--verify-ci'], { dir, env: { GITHUB_REPOSITORY: '', GITHUB_SHA: '' } })
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /GITHUB_REPOSITORY/)
})

test('--verify-ci：gh 不可用 → fail closed（查不到证据不放行）', () => {
  const dir = initRepo()
  const r = runScript(['--verify-ci'], {
    dir,
    env: { GITHUB_REPOSITORY: REPO, GITHUB_SHA: SHA, PATH: '' },
  })
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /gh/)
})

// ---------- release-check.mjs CLI：--verify-ci 假 gh 集成 mock（PATH 注入，覆盖 CLI 胶水） ----------

/**
 * 在临时目录写一个假 gh（Windows 走 gh.cmd——无 shell 的 spawn 在 Windows 只找 gh.exe，
 * 生产实现经 shell 解析 gh 以兼容 gh.cmd shim；POSIX 走带执行位的 sh 脚本）。
 * 假 gh 把收到的参数原样写入 gh-args.txt（供断言 URL 胶水），再输出 fixture.json。
 */
function writeFakeGh(binDir, fixtureObj) {
  writeFileSync(join(binDir, 'fixture.json'), JSON.stringify(fixtureObj))
  writeFileSync(
    join(binDir, 'gh.cmd'),
    ['@echo off', '(echo %*)>"%~dp0gh-args.txt"', 'type "%~dp0fixture.json"', ''].join('\r\n'),
  )
  const sh = [
    '#!/bin/sh',
    'printf \'%s\\n\' "$*" > "$(dirname "$0")/gh-args.txt"',
    'cat "$(dirname "$0")/fixture.json"',
    '',
  ].join('\n')
  writeFileSync(join(binDir, 'gh'), sh, { mode: 0o755 })
}

test('--verify-ci 集成：假 gh 返回同 SHA 完整 CI 绿 JSON → 放行，且查询 URL 带对 repo 与 SHA', () => {
  const dir = initRepo()
  const bin = mkdtempSync(join(tmpdir(), 'fake-gh-'))
  createdDirs.push(bin)
  writeFakeGh(bin, { workflow_runs: [greenRun()] })
  const r = runScript(['--verify-ci'], {
    dir,
    env: {
      GITHUB_REPOSITORY: REPO,
      GITHUB_SHA: SHA,
      PATH: `${bin}${delimiter}${process.env.PATH ?? ''}`,
    },
  })
  assert.equal(r.status, 0, `假 gh 的成功 JSON 应放行：\nstdout=${r.stdout}\nstderr=${r.stderr}`)
  assert.match(r.stdout, /已跑绿/)
  assert.match(r.stdout, /放行/)
  const args = readFileSync(join(bin, 'gh-args.txt'), 'utf8')
  assert.ok(args.includes(`repos/${REPO}/actions/runs`), `URL 应指向本仓库：${args}`)
  assert.ok(args.includes(`head_sha=${SHA}`), `URL 应按目标 SHA 过滤：${args}`)
})

test('--verify-ci 集成：workflow_runs 缺字段 / 形状异常 / 条目缺字段 → fail closed', () => {
  const dir = initRepo()
  const bin = mkdtempSync(join(tmpdir(), 'fake-gh-'))
  createdDirs.push(bin)
  for (const [label, bad] of [
    ['缺 workflow_runs 字段', {}],
    ['workflow_runs 非数组', { workflow_runs: 'ci-green' }],
    ['run 条目缺字段', { workflow_runs: [{}] }],
  ]) {
    writeFakeGh(bin, bad)
    const r = runScript(['--verify-ci'], {
      dir,
      env: {
        GITHUB_REPOSITORY: REPO,
        GITHUB_SHA: SHA,
        PATH: `${bin}${delimiter}${process.env.PATH ?? ''}`,
      },
    })
    assert.notEqual(r.status, 0, `「${label}」不应放行`)
    assert.match(
      r.stderr,
      /空|没有任何/,
      `「${label}」应给出判定原因，而非只报 gh 调用失败（stderr=${r.stderr.slice(0, 120)}）`,
    )
  }
})

// ---------- .github/workflows/release.yml：静态行为断言 ----------

/** 取 2 空格缩进 job 的 body（到下一个同级 job 或文件尾） */
function jobBlock(text, name) {
  const lines = text.split(/\r?\n/)
  const start = lines.findIndex((l) => l === `  ${name}:`)
  assert.ok(start !== -1, `release.yml 缺 job「${name}」`)
  const body = []
  for (let i = start + 1; i < lines.length; i++) {
    if (/^  \S/.test(lines[i])) break
    body.push(lines[i])
  }
  return body.join('\n')
}

test('release.yml：publish 依赖 verify-quality（先行 CI 证据门禁）', () => {
  const yml = readReleaseYml()
  assert.match(jobBlock(yml, 'publish'), /^ {4}needs: verify-quality$/m)
  assert.match(jobBlock(yml, 'verify-quality'), /--verify-ci/)
})

test('release.yml：publish checkout 固定验证 SHA 且完整历史（供 tag 解引用）', () => {
  const publish = jobBlock(readReleaseYml(), 'publish')
  assert.ok(publish.includes('ref: ${{ github.sha }}'), 'checkout 必须固定在验证通过的 SHA，而不是 tag ref')
  assert.ok(publish.includes('fetch-depth: 0'), '必须完整 checkout：tag 解引用需要全部历史')
})

test('release.yml：严格 release:check 在 build / api:check / 发布之前', () => {
  const publish = jobBlock(readReleaseYml(), 'publish')
  const idx = (s) => publish.indexOf(s)
  const strict = idx('--require-tag-head')
  assert.ok(strict !== -1, 'publish 必须以 --require-tag-head 跑 release:check')
  assert.ok(idx('pnpm release:check') !== -1 || idx('release-check.mjs') !== -1, '必须经 release:check 门禁')
  assert.ok(strict < idx('pnpm build'), '严格 release:check 必须先于 build')
  assert.ok(strict < idx('pnpm api:check'), '严格 release:check 必须先于 api:check')
  assert.ok(strict < idx('publish-skip-existing'), '严格 release:check 必须先于发布步骤')
})

test('release.yml：权限最小——verify 只有读权限；publish 无 actions 读权限（不因 verify 扩权）', () => {
  const yml = readReleaseYml()
  const verify = jobBlock(yml, 'verify-quality')
  const publish = jobBlock(yml, 'publish')
  assert.match(verify, /actions: read/, 'verify 查询 CI run 需要 actions: read')
  assert.match(verify, /contents: read/, 'verify checkout 只需 contents: read')
  assert.doesNotMatch(verify, /contents: write/, 'verify 不得有写权限')
  assert.doesNotMatch(verify, /id-token/, 'verify 不得有 OIDC 权限')
  assert.match(publish, /contents: write/, 'publish 创建 Release 需要 contents: write')
  assert.match(publish, /id-token: write/, 'publish 走 OIDC Trusted Publishing')
  assert.doesNotMatch(publish, /actions:/, 'publish 不得因 verify 获得 actions 权限')
  const top = yml.slice(0, yml.indexOf('jobs:'))
  assert.match(top, /^permissions: \{\}/m, '顶层默认零权限，各 job 自行声明')
})

function readReleaseYml() {
  return readFileSync(RELEASE_YML, 'utf8')
}
