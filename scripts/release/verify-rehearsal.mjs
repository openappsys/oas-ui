#!/usr/bin/env node
/**
 * rehearse 证据核验：tag 推送前确认「该提交上三层门禁本地全绿」有账可查。
 *
 * 用法：node scripts/release/verify-rehearsal.mjs <版本 x.y.z> <committish>
 *   committish 可以是：提交 sha / 轻量 tag / annotated tag（脚本内部用
 *   `git rev-parse "<arg>^{commit}"` 统一解引用到提交——pre-push stdin 的
 *   <local sha> 对 annotated tag 是 tag 对象 sha 而非提交 sha，必须解引用，
 *   否则与证据里的提交 sha 永远不匹配，合法发版会被误拦）。
 *
 * - 版本号只做形状校验（用于报错信息与输出可读）；判定核心是「解引用后的提交 sha」
 *   + 三层：<git-dir>/oas-release-rehearsal.json 里 sha 完全一致，且 testJob / e2e /
 *   ssrE2e 三层全部 ok:true（判定逻辑见 rehearsal-state.mjs evaluateState）。
 * - git-dir 用 `git rev-parse --git-dir` 定位（支持 worktree；钩子调用时 cwd 即仓库根）。
 * - fail closed：committish 无法解析 / 证据不存在 / JSON 坏 / sha 不符 / 任一层未全绿
 *   → 逐条打印原因，exit 1。
 *
 * 调用方：.opencode/hooks/pre-push（推 v* tag 且版本 == 磁盘版本时，release-check 通过后
 * 紧接着跑本脚本）；也可人工随时核验。
 */
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { parseReleaseVersion } from '../release-gate.mjs'
import { evaluateState, readState } from './rehearsal-state.mjs'

const LABEL = '[verify-rehearsal]'
const [versionArg, refArg] = process.argv.slice(2)

/** committish 形状白名单：ref 名 / 40 位 hex / 日期引用等常见形态；拒绝空格与 shell 元字符（虽走 args 数组无注入面，仍收紧） */
const isCommittishShape = (s) => typeof s === 'string' && /^[\w./:^~-]{1,80}$/.test(s)

const GIT_OPTS = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }

if (!versionArg || !refArg) {
  console.error(
    `用法：node scripts/release/verify-rehearsal.mjs <版本 x.y.z> <committish：tag 名 / tag 对象 sha / 提交 sha>`,
  )
  process.exit(1)
}
const version = parseReleaseVersion(versionArg)
if (!version) {
  console.error(`✗ ${LABEL}「${versionArg}」不是合法的 x.y.z 版本——只做形状校验，但 prerelease / 短版本一律拒绝`)
  process.exit(1)
}
if (!isCommittishShape(refArg)) {
  console.error(`✗ ${LABEL}committish 形状非法：${String(refArg)}`)
  process.exit(1)
}

let gitDir
try {
  // 相对返回（主仓 `.git`）基于 cwd resolve；worktree 返回绝对路径原样保留
  gitDir = resolve(execFileSync('git', ['rev-parse', '--git-dir'], GIT_OPTS).trim())
} catch {
  console.error(`✗ ${LABEL}无法定位 git 目录（当前目录不是 git 仓库？）——fail closed`)
  process.exit(1)
}

// committish → 提交 sha（annotated tag 解引用 tag 对象；轻量 tag / 提交 sha 幂等）
let commitSha
try {
  commitSha = execFileSync('git', ['rev-parse', `${refArg}^{commit}`], GIT_OPTS).trim()
} catch {
  console.error(`✗ ${LABEL}无法把「${refArg}」解析为提交（git rev-parse "${refArg}^{commit}" 失败）——fail closed`)
  process.exit(1)
}
if (!/^[0-9a-f]{40}$/i.test(commitSha)) {
  console.error(`✗ ${LABEL}「${refArg}」解引用结果非 40 位 hex：${commitSha}——fail closed`)
  process.exit(1)
}

const state = readState(gitDir)
const result = evaluateState(state, commitSha)
if (!result.ok) {
  console.error(`✗ ${LABEL}v${version}（${refArg} → 提交 ${commitSha.slice(0, 8)}）的 rehearse 证据不满足：`)
  for (const reason of result.reasons) console.error(`  - ${reason}`)
  process.exit(1)
}
console.log(
  `${LABEL} ✓ v${version}（${refArg} → 提交 ${commitSha.slice(0, 8)}）的三层 rehearse 证据齐全（testJob + e2e + ssrE2e 全绿），放行`,
)
