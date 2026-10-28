/**
 * 渲染基准阈值（`pnpm perf:bench` 量级防退化预算）——**单一真源**。
 *
 * 背景（2026-10-28 table 批收口）：阈值此前以 `render-bench.mjs` 内联数组为准，
 * `docs/perf-baseline.md` 手抄同组数字，两处漂移（select 选项更新在脚本已放宽到
 * 160 ms、文档仍写 50 ms）而无人发现。现阈值只在此登记：
 * - `render-bench.mjs` 消费本表执行断言；
 * - `docs/perf-baseline.md` 的渲染预算段为生成块（`gen-baseline-docs.mjs` 写入），
 *   `perf:size` 校验生成块与本表一致；
 * - `docs/perf-baseline.json` 的 `render.budgets` 由 perf:bench 从本表写出，
 *   `perf:size` 校验 JSON 与本表一致（防 JSON 停留在旧阈值）。
 *
 * 阈值依据：2026-08-12 多轮实测 p95 约 3~5 倍取整（happy-dom 下耗时跨轮次波动明显，
 * 如 table 数据更新 p95 曾见 7.6~43 ms）；select 选项更新于 2026-10-19 放宽到 160 ms
 * （Windows + happy-dom 下 p95 受 GC 尾延迟支配：median ~5 ms，p95 58–148 ms），
 * 预算只防数量级退化。渲染基准不进 CI，本地/发布前核对用。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
export const RENDER_BUDGETS = [
  { id: 'button-first-render', label: 'button 首渲染', budgetMs: 5 },
  { id: 'input-first-render', label: 'input 首渲染', budgetMs: 15 },
  { id: 'table-100rows-first-render', label: 'table 100 行首渲染', budgetMs: 50 },
  { id: 'select-100opt-first-render', label: 'select 100 选项首渲染', budgetMs: 50 },
  { id: 'tabs-10panel-first-render', label: 'tabs 10 面板', budgetMs: 15 },
  { id: 'form-10field-first-render', label: 'form 10 字段', budgetMs: 40 },
  { id: 'table-data-update', label: 'table 数据更新', budgetMs: 50 },
  { id: 'select-options-update', label: 'select 选项更新', budgetMs: 160 },
]

/**
 * 真实安装的 happy-dom 版本号（读 node_modules 包描述文件，不再手写 `20.x`）。
 * perf:bench 写入 JSON env、perf:size 校验 JSON env 与之一致——happy-dom 升级后
 * 若未重新生成基线，perf:size 会红，提示重跑 perf:bench --update-baseline。
 */
export function installedHappyDomVersion(root) {
  const pkgPath = join(root, 'node_modules/happy-dom/package.json')
  let raw
  try {
    raw = readFileSync(pkgPath, 'utf8')
  } catch (error) {
    throw new Error(
      `[perf] 读取不到 happy-dom 包描述文件（${pkgPath}）：请先在仓库根目录执行 pnpm install（原始错误：${error?.code ?? error?.message ?? error}）`,
    )
  }
  const pkg = JSON.parse(raw)
  if (typeof pkg.version !== 'string' || !pkg.version) {
    throw new Error(`[perf] ${pkgPath} 缺少 version 字段，happy-dom 安装异常：请重试 pnpm install`)
  }
  return pkg.version
}

export function happyDomLabel(root) {
  return `happy-dom@${installedHappyDomVersion(root)}`
}
