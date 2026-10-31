/**
 * 发布 rehearsal 证据文件（「本地重放三层门禁」的账本）读写与判定。
 *
 * 证据文件路径：`<git-dir>/oas-release-rehearsal.json`（用 `git rev-parse --git-dir`
 * 定位，天然支持 worktree 隔离——每个工作树有自己的 git dir 与证据）。
 *
 * 结构（schemaVersion 1）：
 * {
 *   "schemaVersion": 1,
 *   "sha": "<40 hex HEAD>",            // 证据绑定的提交树
 *   "updatedAt": "<ISO>",
 *   "testJob": { "ok": true, "steps": [...], "durationMs": 0, "finishedAt": "<ISO>" },
 *   "e2e":     { "ok": true, "command": "pnpm test:e2e", "durationMs": 0, "finishedAt": "<ISO>" },
 *   "ssrE2e":  { "ok": true, "command": "pnpm test:e2e:ssr", "durationMs": 0, "finishedAt": "<ISO>" }
 * }
 *
 * fail-closed 原则：readState 对「不存在 / JSON 坏 / 形状不对」一律返回 null（调用方
 * 拒绝放行）；evaluateState 要求 sha 完全一致 + 三层全部 ok:true，缺任何一条都给出
 * 可操作的中文原因。旧树的证据对当前树无效（writeLayer 在 sha 变化时整份重置）。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const STATE_FILENAME = 'oas-release-rehearsal.json'
export const SCHEMA_VERSION = 1
/** 三层门禁：ci.yml test job 本地重放 / 全量 e2e / SSR fixture e2e */
export const LAYERS = ['testJob', 'e2e', 'ssrE2e']

/** 每层的补跑建议命令（写进缺失原因，可直接复制执行） */
const LAYER_COMMANDS = {
  testJob: 'pnpm release:rehearse',
  e2e: 'pnpm release:rehearse --with-e2e',
  ssrE2e: 'pnpm release:rehearse --with-ssr-e2e',
}

const statePath = (gitDir) => join(gitDir, STATE_FILENAME)

const isSha = (s) => typeof s === 'string' && /^[0-9a-f]{40}$/i.test(s)

/**
 * 读证据文件。不存在 / JSON 坏 / 形状不对（schemaVersion ≠ 1、sha 非法、非对象）→
 * 返回 null（调用方 fail closed），不抛。
 * @param {string} gitDir git 目录（`git rev-parse --git-dir` 的结果，可绝对可相对）
 */
export function readState(gitDir) {
  let raw
  try {
    raw = readFileSync(statePath(gitDir), 'utf8')
  } catch {
    return null
  }
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  if (parsed.schemaVersion !== SCHEMA_VERSION) return null
  if (!isSha(parsed.sha)) return null
  return parsed
}

/**
 * 写一层证据。同一 sha 内按层累积（跑 testJob 不清掉之前同 sha 的 e2e 记录）；
 * sha 变化 → 整份重置（旧树的证据对当前树无效）。
 * @param {'testJob'|'e2e'|'ssrE2e'} layer 层名（未知层抛错，防拼写错误静默写歪）
 * @param {object} record 该层记录（至少含 ok 布尔；其余如 steps / durationMs / finishedAt 自由）
 */
export function writeLayer(gitDir, sha, layer, record) {
  if (!LAYERS.includes(layer)) {
    throw new Error(`[rehearsal-state] 未知层「${String(layer)}」——只能是 ${LAYERS.join(' / ')}`)
  }
  if (!isSha(sha)) {
    throw new Error(`[rehearsal-state] sha 非法（须 40 位 hex）：${String(sha)}`)
  }
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error('[rehearsal-state] record 必须是对象')
  }
  const prev = readState(gitDir)
  const state = prev && prev.sha === sha ? { ...prev } : { schemaVersion: SCHEMA_VERSION, sha }
  state[layer] = { ...record }
  state.updatedAt = new Date().toISOString()
  mkdirSync(gitDir, { recursive: true })
  writeFileSync(statePath(gitDir), `${JSON.stringify(state, null, 2)}\n`)
  return state
}

/**
 * 判定证据是否放行：sha 完全一致 + testJob / e2e / ssrE2e 三层全部 ok:true。
 * 每条不满足给出独立、可操作的中文原因（含缺失层的补跑命令），不可被其他层掩盖。
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function evaluateState(state, sha) {
  if (!state || typeof state !== 'object') {
    return {
      ok: false,
      reasons: [
        '无有效的 rehearse 证据（文件不存在 / JSON 损坏 / 形状不符）——查不到证据不放行；请跑 pnpm release:rehearse 三层补齐',
      ],
    }
  }
  if (!isSha(sha)) {
    return { ok: false, reasons: [`目标 SHA 非法或缺失：${String(sha)}`] }
  }
  const reasons = []
  if (state.sha !== sha) {
    reasons.push(
      `证据属于提交 ${String(state.sha).slice(0, 8)}，≠ 目标 ${sha.slice(0, 8)}——` +
        '旧树的证据对当前树无效，请在当前提交上重跑 pnpm release:rehearse',
    )
  }
  for (const layer of LAYERS) {
    const rec = state[layer]
    if (!rec || typeof rec !== 'object') {
      reasons.push(`缺 ${layer} 层记录——请补跑：${LAYER_COMMANDS[layer]}（同 SHA 内按层累积，不覆盖已跑层）`)
    } else if (rec.ok !== true) {
      reasons.push(
        `${layer} 层未全绿（ok !== true）——修复后重跑：${LAYER_COMMANDS[layer]}（tag 树必须与「全绿树」完全一致）`,
      )
    } else if (layer === 'testJob' && (!Array.isArray(rec.steps) || rec.steps.length === 0)) {
      // ok:true 但 steps 空/缺失 = 证据被截断或写坏，不得按绿放行
      reasons.push(`testJob 记录缺非空 steps 数组（证据可能被截断/写坏）——请重跑：${LAYER_COMMANDS.testJob}`)
    }
  }
  return { ok: reasons.length === 0, reasons }
}
