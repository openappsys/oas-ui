/**
 * rehearsal-state.mjs 的自测（node:test，无第三方依赖）：
 * - readState 的 fail-closed 形状校验：无文件 / 坏 JSON / 形状不对（schemaVersion、sha、非对象）→ null 不抛；
 * - writeLayer：同 sha 内按层累积（跑 testJob 不清掉 e2e）；换 sha 整份重置；
 * - evaluateState 逐条护栏：sha 不符 / 缺 testJob / 缺 e2e / 缺 ssrE2e / 层未全绿各自单独失败，
 *   不可被其他层掩盖；三层全绿 + sha 一致才放行。
 *
 * 运行：`node --test scripts/release/rehearsal-state.test.mjs`（已接入 `pnpm release:check:test`）。
 */
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { STATE_FILENAME, evaluateState, readState, writeLayer } from './rehearsal-state.mjs'

const SHA = 'a'.repeat(40)
const SHA_OTHER = 'b'.repeat(40)
const createdDirs = []

after(() => {
  for (const d of createdDirs) rmSync(d, { recursive: true, force: true })
})

/** 独立临时 gitDir（不建真 git 仓库——readState/writeLayer 只做文件操作，路径即语义） */
function tmpGitDir() {
  const dir = mkdtempSync(join(tmpdir(), 'rehearsal-state-'))
  createdDirs.push(dir)
  return dir
}

const greenRecord = (over = {}) => ({ ok: true, durationMs: 1, finishedAt: '2026-10-31T00:00:00.000Z', ...over })

// ---------- readState：fail-closed 形状校验 ----------

test('无证据文件 → readState 返回 null（不抛）', () => {
  assert.equal(readState(tmpGitDir()), null)
})

test('坏 JSON → null', () => {
  const dir = tmpGitDir()
  writeFileSync(join(dir, STATE_FILENAME), '{oops')
  assert.equal(readState(dir), null)
})

test('形状不对（schemaVersion ≠ 1 / sha 非法 / 非对象 / 数组）→ null', () => {
  for (const [label, bad] of [
    ['schemaVersion 错', { schemaVersion: 2, sha: SHA }],
    ['缺 schemaVersion', { sha: SHA }],
    ['sha 非 40 hex', { schemaVersion: 1, sha: 'abc' }],
    ['缺 sha', { schemaVersion: 1 }],
    ['null', null],
    ['数组', [1]],
  ]) {
    const dir = tmpGitDir()
    writeFileSync(join(dir, STATE_FILENAME), JSON.stringify(bad))
    assert.equal(readState(dir), null, `「${label}」应返回 null`)
  }
})

// ---------- writeLayer：同 sha 累积 / 换 sha 重置 ----------

test('同 sha：先写 testJob 再写 e2e，testJob 记录保留（按层累积）', () => {
  const dir = tmpGitDir()
  writeLayer(dir, SHA, 'testJob', { ok: true, steps: ['pnpm format:check'], durationMs: 5, finishedAt: 't1' })
  writeLayer(dir, SHA, 'e2e', { ok: true, command: 'pnpm test:e2e', durationMs: 9, finishedAt: 't2' })
  const state = readState(dir)
  assert.equal(state.sha, SHA)
  assert.equal(state.testJob.ok, true, '同 sha 内 testJob 不应被 e2e 覆盖')
  assert.equal(state.testJob.steps.join(','), 'pnpm format:check')
  assert.equal(state.e2e.ok, true)
})

test('换 sha：整份重置（旧树的证据对当前树无效）', () => {
  const dir = tmpGitDir()
  writeLayer(dir, SHA, 'testJob', { ok: true, steps: [], durationMs: 0, finishedAt: 't1' })
  writeLayer(dir, SHA, 'e2e', greenRecord())
  writeLayer(dir, SHA_OTHER, 'ssrE2e', greenRecord())
  const state = readState(dir)
  assert.equal(state.sha, SHA_OTHER)
  assert.equal(state.testJob, undefined, '旧 sha 的 testJob 不应保留')
  assert.equal(state.e2e, undefined, '旧 sha 的 e2e 不应保留')
  assert.equal(state.ssrE2e.ok, true)
})

test('未知层 / 非法 sha / 非法 record → 抛错（防拼写错误静默写歪）', () => {
  const dir = tmpGitDir()
  assert.throws(() => writeLayer(dir, SHA, 'unit', greenRecord()), /未知层/)
  assert.throws(() => writeLayer(dir, 'abc', 'e2e', greenRecord()), /sha 非法/)
  assert.throws(() => writeLayer(dir, SHA, 'e2e', 'nope'), /record/)
})

// ---------- evaluateState：逐条护栏，缺一层就拦，不可被其他层掩盖 ----------

const fullGreen = (sha = SHA) => ({
  schemaVersion: 1,
  sha,
  updatedAt: '2026-10-31T00:00:00.000Z',
  testJob: { ok: true, steps: ['pnpm llms:check'], durationMs: 1, finishedAt: 't' },
  e2e: { ok: true, command: 'pnpm test:e2e', durationMs: 1, finishedAt: 't' },
  ssrE2e: { ok: true, command: 'pnpm test:e2e:ssr', durationMs: 1, finishedAt: 't' },
})

test('三层全绿 + sha 一致 → ok；无证据（null）→ 单条原因且 fail closed', () => {
  assert.deepEqual(evaluateState(fullGreen(), SHA), { ok: true, reasons: [] })
  const r = evaluateState(null, SHA)
  assert.equal(r.ok, false)
  assert.equal(r.reasons.length, 1)
  assert.match(r.reasons[0], /无有效的 rehearse 证据/)
})

test('sha 不符 → 失败（即使三层全绿）；非法目标 sha 也拦', () => {
  const r = evaluateState(fullGreen(SHA), SHA_OTHER)
  assert.equal(r.ok, false)
  assert.equal(r.reasons.length, 1, 'sha 不符时三层都绿也不该叠加层缺失原因')
  assert.match(r.reasons[0], /旧树的证据对当前树无效/)
  assert.ok(r.reasons[0].includes(SHA.slice(0, 8)), '原因应指出证据所属 sha')
  const bad = evaluateState(fullGreen(), 'nope')
  assert.equal(bad.ok, false)
  assert.match(bad.reasons[0], /目标 SHA 非法/)
})

test('缺 testJob 单独失败（e2e / ssrE2e 绿不能掩盖）', () => {
  const state = fullGreen()
  delete state.testJob
  const r = evaluateState(state, SHA)
  assert.equal(r.ok, false)
  assert.equal(r.reasons.length, 1)
  assert.match(r.reasons[0], /缺 testJob 层记录/)
  assert.match(r.reasons[0], /pnpm release:rehearse\b/)
})

test('缺 e2e 单独失败，建议命令指向 --with-e2e', () => {
  const state = fullGreen()
  delete state.e2e
  const r = evaluateState(state, SHA)
  assert.equal(r.ok, false)
  assert.equal(r.reasons.length, 1)
  assert.match(r.reasons[0], /缺 e2e 层记录/)
  assert.match(r.reasons[0], /--with-e2e/)
})

test('缺 ssrE2e 单独失败，建议命令指向 --with-ssr-e2e', () => {
  const state = fullGreen()
  delete state.ssrE2e
  const r = evaluateState(state, SHA)
  assert.equal(r.ok, false)
  assert.equal(r.reasons.length, 1)
  assert.match(r.reasons[0], /缺 ssrE2e 层记录/)
  assert.match(r.reasons[0], /--with-ssr-e2e/)
})

test('层存在但 ok:false → 失败（历史失败记录不放行）；多缺口逐条并列', () => {
  const state = fullGreen()
  state.e2e = { ok: false, command: 'pnpm test:e2e', exitCode: 1, finishedAt: 't' }
  const r = evaluateState(state, SHA)
  assert.equal(r.ok, false)
  assert.ok(
    r.reasons.some((s) => s.includes('e2e 层未全绿')),
    `应有「e2e 层未全绿」原因：${r.reasons.join(' | ')}`,
  )
  // 多缺口：sha 不符 + 缺 ssrE2e 同时列出
  const state2 = fullGreen(SHA_OTHER)
  delete state2.ssrE2e
  const r2 = evaluateState(state2, SHA)
  assert.equal(r2.ok, false)
  assert.equal(r2.reasons.length, 2, `sha 与缺层应并列列出：${r2.reasons.join(' | ')}`)
})

test('I1：testJob ok:true 但 steps 缺失/为空 → 失败（防截断/写坏的证据按绿放行）', () => {
  for (const [label, steps] of [
    ['steps 缺失', undefined],
    ['steps 为空数组', []],
    ['steps 非数组', 'pnpm llms:check'],
  ]) {
    const state = fullGreen()
    if (steps === undefined) delete state.testJob.steps
    else state.testJob.steps = steps
    const r = evaluateState(state, SHA)
    assert.equal(r.ok, false, `「${label}」不应放行`)
    assert.ok(
      r.reasons.some((s) => s.includes('steps 数组')),
      `「${label}」应有 steps 缺失原因：${r.reasons.join(' | ')}`,
    )
  }
  // e2e / ssrE2e 层不受 steps 校验影响（它们的记录只有 command）
  const state = fullGreen()
  delete state.e2e.command
  assert.equal(evaluateState(state, SHA).ok, true)
})
