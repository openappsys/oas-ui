/**
 * verify-rehearsal.mjs 的子进程集成自测（node:test + 临时 fixture git 仓库）：
 * 核心是 C1 语义——`git push` pre-push stdin 的 <local sha> 对 **annotated tag** 是
 * tag 对象自身 sha 而非提交 sha，脚本必须经 `git rev-parse "<arg>^{commit}"` 解引用，
 * 否则与证据里的提交 sha 永远不匹配 → 合法发版被误拦。
 *
 * 覆盖：annotated tag 对象 sha / 提交 sha / tag 名三种输入都放行（证据齐全 + sha 一致）；
 * sha 不符 / 缺层 / ref 不存在 / committish 形状非法 / 版本非法 → exit 1 且原因清晰。
 *
 * 运行：`node --test scripts/release/verify-rehearsal.test.mjs`（已接入 `pnpm release:check:test`）。
 */
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, test } from 'node:test'
import { STATE_FILENAME } from './rehearsal-state.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SCRIPT = join(ROOT, 'scripts', 'release', 'verify-rehearsal.mjs')
const VERSION = '2.6.5'

const createdDirs = []
after(() => {
  for (const d of createdDirs) rmSync(d, { recursive: true, force: true })
})

function git(dir, ...args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8' })
}

/** 建 fixture 仓库：两个提交 + 打在 HEAD 的 annotated tag + 可选证据文件 */
function initRepo({ withEvidence = true, evidenceSha = null, layers = ['testJob', 'e2e', 'ssrE2e'] } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'verify-rehearsal-fixture-'))
  createdDirs.push(dir)
  git(dir, 'init', '-q', '-b', 'main')
  git(dir, 'config', 'user.email', 'fixture@example.com')
  git(dir, 'config', 'user.name', 'fixture')
  writeFileSync(join(dir, 'a.txt'), 'a\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'a')
  writeFileSync(join(dir, 'b.txt'), 'b\n')
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'b')
  const commit = git(dir, 'rev-parse', 'HEAD').trim()
  // annotated tag：rev-parse <tag> 返回 tag 对象 sha（≠ 提交 sha），^{commit} 才是提交
  git(dir, 'tag', '-a', `v${VERSION}`, '-m', `v${VERSION}`)
  const tagObject = git(dir, 'rev-parse', `v${VERSION}`).trim()
  const derefCommit = git(dir, 'rev-parse', `v${VERSION}^{commit}`).trim()
  assert.notEqual(tagObject, derefCommit, 'fixture 必须真的是 annotated tag（对象 sha ≠ 提交 sha）')
  assert.equal(derefCommit, commit)
  if (withEvidence) {
    const gitDir = git(dir, 'rev-parse', '--git-dir').trim()
    const state = {
      schemaVersion: 1,
      sha: evidenceSha ?? commit,
      updatedAt: '2026-10-31T00:00:00.000Z',
      testJob: { ok: true, steps: ['pnpm llms:check'], durationMs: 1, finishedAt: 't' },
      e2e: { ok: true, command: 'pnpm test:e2e', durationMs: 1, finishedAt: 't' },
      ssrE2e: { ok: true, command: 'pnpm test:e2e:ssr', durationMs: 1, finishedAt: 't' },
    }
    for (const key of ['testJob', 'e2e', 'ssrE2e']) {
      if (!layers.includes(key)) delete state[key]
    }
    writeFileSync(join(dir, gitDir, STATE_FILENAME), JSON.stringify(state))
  }
  return { dir, commit, tagObject }
}

function runScript(args, cwd) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return { status: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' }
}

test('C1 关键用例：annotated tag 的 tag 对象 sha 输入 → 解引用到提交 → 放行', () => {
  const { dir, tagObject, commit } = initRepo()
  const r = runScript([VERSION, tagObject], dir)
  assert.equal(r.status, 0, `tag 对象 sha 应解引用放行：\n${r.stderr}`)
  assert.match(r.stdout, /放行/)
  assert.ok(r.stdout.includes(tagObject.slice(0, 8)), '输出应带传入值的短 sha')
  assert.ok(r.stdout.includes(commit.slice(0, 8)), '输出应带解引用提交的短 sha')
})

test('C1：提交 sha 直接输入 → 放行；tag 名（committish）输入 → 放行', () => {
  const { dir, commit } = initRepo()
  const bySha = runScript([VERSION, commit], dir)
  assert.equal(bySha.status, 0, `提交 sha 应放行：\n${bySha.stderr}`)
  const byName = runScript([VERSION, `v${VERSION}`], dir)
  assert.equal(byName.status, 0, `tag 名应放行：\n${byName.stderr}`)
})

test('C1：证据是另一提交（sha 不符）→ exit 1，原因指出新旧树无效', () => {
  const { dir, commit } = initRepo({ evidenceSha: 'c'.repeat(40) })
  const r = runScript([VERSION, commit], dir)
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /旧树的证据对当前树无效/)
})

test('C1：缺层（无 e2e 记录）→ exit 1，原因给补跑命令', () => {
  const { dir } = initRepo({ layers: ['testJob', 'ssrE2e'] })
  const r = runScript([VERSION, 'HEAD'], dir)
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /缺 e2e 层记录/)
})

test('ref 不存在 / committish 形状非法 / 版本非法 → fail closed exit 1', () => {
  const { dir } = initRepo()
  assert.notEqual(runScript([VERSION, 'no-such-ref'], dir).status, 0, '不存在的 ref 应拒')
  const weird = runScript([VERSION, 'bad sha with space'], dir)
  assert.notEqual(weird.status, 0, '含空格的 committish 应被形状白名单拒')
  assert.match(weird.stderr, /形状非法/)
  const badVer = runScript(['2.6', 'HEAD'], dir)
  assert.notEqual(badVer.status, 0)
  assert.match(badVer.stderr, /不是合法的 x\.y\.z/)
})
