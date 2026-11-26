/**
 * 视口翻转谓词（浮层向上翻转判据）——纯函数，零 DOM 依赖。
 *
 * 原先 filter `syncPanelFlip` 与 invoice `placePicker` 各持一份同构判据：
 * 「下方空间 < 面板高 && 上方 > 下方 → 翻上去」，属性名与锚元素各异但判据相同。
 * 三处（含 overlay/floating 引擎内判据）独立演化会让翻转 bug 修一处漏两处，
 * 判据收敛为单一真源；data 属性名 / 锚元素 / 开合联动仍留组件（语义各异）。
 *
 * 退化守卫：视口高 / 面板高 / 锚坐标拿不到（SSR、happy-dom、未布局）时一律
 * 不翻转——无几何依据的翻转会让浮层跑到不可预期位置。
 *
 * 体积账（gz 实测）：213 B（`dist/shared/flip-up.js`，gzipSync 默认档；比盘点估算 0.1 KB 高，
 * 差值来自退化守卫与 ESM 导出包装）。
 */

/** 翻转判据需要的锚元素几何（DOMRect 子集，便于纯函数单测） */
export interface FlipAnchorRect {
  top: number
  bottom: number
}

/**
 * 浮层是否应向上翻转。
 *
 * @param anchor 锚元素矩形（浮层默认在其下方展开）
 * @param panelHeight 浮层实测高度
 * @param viewportHeight 视口高度
 * @returns true = 下方放不下且上方更宽裕（翻到锚上方）
 */
export function shouldFlipUp(anchor: FlipAnchorRect, panelHeight: number, viewportHeight: number): boolean {
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) return false
  if (!Number.isFinite(panelHeight) || panelHeight <= 0) return false
  if (!Number.isFinite(anchor.top) || !Number.isFinite(anchor.bottom)) return false
  const below = viewportHeight - anchor.bottom
  const above = anchor.top
  return below < panelHeight && above > below
}
