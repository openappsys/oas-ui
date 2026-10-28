/**
 * 发布门禁的纯判定函数：无副作用、不触网、不碰 git，供 `scripts/release-check.mjs`
 * 的 CI 路径消费；`scripts/release-check.test.mjs` 用 fixture 直接验证判定矩阵。
 *
 * fail-closed 原则：任何「无法证明绿」的情形（空结果、pending/queued、failure、
 * 非 CI workflow、异仓库 head、非法输入）一律不放行——判定函数只认账面上的证据，
 * 不做等待与重试，也没有任何跳过通道。
 */

/** CI workflow 文件路径：verify-quality 只认这份 workflow 的 run（其他 workflow 不算「完整 CI」） */
export const CI_WORKFLOW_PATH = '.github/workflows/ci.yml'

/**
 * 发布版本解析：接受 'v2.6.5' / '2.6.5'，非 x.y.z（含 prerelease、短版本、任意文本）
 * 一律返回 null（非 semver tag 直接失败，不提供跳过后门）。
 */
export function parseReleaseVersion(ref) {
  if (typeof ref !== 'string') return null
  const m = ref.match(/^v?(\d+\.\d+\.\d+)$/)
  return m ? m[1] : null
}

/**
 * verify-quality 的唯一放行条件：同仓库、目标 SHA、CI workflow 的 completed+success
 * run 至少一条。返回 `{ ok: true, run }` 或 `{ ok: false, reasons: [...] }`。
 *
 * 逐层过滤并在每层缺口给出可操作原因：空结果 → 非 CI workflow → 其他 SHA →
 * 异仓库 head → 未到 completed+success。任一层为空即 fail closed。
 */
export function evaluateCiRuns({ runs, sha, repo, workflowPath = CI_WORKFLOW_PATH }) {
  const reasons = []
  if (typeof sha !== 'string' || !/^[0-9a-f]{40}$/i.test(sha)) {
    reasons.push(`目标 SHA 非法或缺失：${String(sha)}`)
    return { ok: false, reasons }
  }
  if (typeof repo !== 'string' || !repo) {
    reasons.push(`目标仓库非法或缺失：${String(repo)}`)
    return { ok: false, reasons }
  }
  if (!Array.isArray(runs) || runs.length === 0) {
    reasons.push('CI run 查询结果为空——该提交没有任何 workflow 运行记录，拒绝放行')
    return { ok: false, reasons }
  }
  const ciRuns = runs.filter((r) => r && r.path === workflowPath)
  if (ciRuns.length === 0) {
    reasons.push(
      `没有任何 ${workflowPath} 的 run（仅 ${runs.length} 条其他 workflow 记录）——完整 CI 未在该提交上运行，拒绝放行`,
    )
    return { ok: false, reasons }
  }
  const sameSha = ciRuns.filter((r) => r.head_sha === sha)
  if (sameSha.length === 0) {
    const shas = [...new Set(ciRuns.map((r) => String(r.head_sha).slice(0, 8)))].join(', ')
    reasons.push(`CI run 存在但 head_sha 均非目标 SHA（${shas} ≠ ${sha.slice(0, 8)}）——拒绝放行`)
    return { ok: false, reasons }
  }
  const sameRepo = sameSha.filter((r) => r.head_repository && r.head_repository.full_name === repo)
  if (sameRepo.length === 0) {
    reasons.push(`同 SHA 的 CI run 不属于本仓库（${repo}）——拒绝放行`)
    return { ok: false, reasons }
  }
  const green = sameRepo.find((r) => r.status === 'completed' && r.conclusion === 'success')
  if (green) return { ok: true, run: green }
  const detail = sameRepo
    .map((r) => `status=${r.status}${r.conclusion ? ` conclusion=${r.conclusion}` : ''}`)
    .join('；')
  reasons.push(`CI run 未到达 completed+success（${detail}）——pending/queued/failure 一律不放行`)
  return { ok: false, reasons }
}
