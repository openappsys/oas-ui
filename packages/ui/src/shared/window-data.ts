/**
 * 服务端行窗口协议（windowed 模式）——共享类型与纯工具。
 *
 * 适用：数据密集型组件（table / gantt / resource / kanban / scheduler）在宿主「只喂可视窗口」
 * 时与宿主交换行区间的统一契约，避免各组件自造事件名与载荷。
 *
 * 约定：
 * - 属性 `windowed`（布尔，默认关）+ `total`（全量行数）+ `window-start`（`data[0]` 在全量中的行下标）；
 *   `data` 仅承载 `[window-start, window-start + data.length)` 区间。
 * - 组件按行高算出可视行窗口，前后各留 `WINDOW_MARGIN` 行缓冲，得到「期望区间」；
 *   若期望区间未被已装载区间覆盖，派发 `oas-window-request`（detail `{ start, end, reason }`，
 *   半开区间、绝对行下标），同一期望区间不重复派发。
 * - 非 windowed 模式行为不变（组件持有全量数据本地切窗）。
 */

/** 期望区间未覆盖时派发的原因 */
export type WindowRequestReason = 'init' | 'scroll' | 'resize' | 'data'

export interface WindowRequestDetail {
  /** 期望起始行下标（含，相对全量） */
  start: number
  /** 期望结束行下标（不含，相对全量） */
  end: number
  /** 触发原因 */
  reason: WindowRequestReason
}

/** 行窗口事件名（各组件统一） */
export const ROW_WINDOW_EVENT = 'oas-window-request'

/** 期望区间相对可视窗口的前后缓冲行数 */
export const WINDOW_MARGIN = 8

const int = (v: number, fallback = 0): number => (Number.isFinite(v) ? Math.trunc(v) : fallback)

/** 已装载区间：`windowStart` + `data` 长度 */
export function loadedRange(windowStart: number, dataLength: number): { start: number; end: number } {
  const start = Math.max(0, int(windowStart))
  return { start, end: start + Math.max(0, int(dataLength)) }
}

/** 把可视窗口 `[start, end)` 前后扩 `margin` 行并夹到 `[0, total)` */
export function expandWindow(
  start: number,
  end: number,
  total: number,
  margin: number = WINDOW_MARGIN,
): { start: number; end: number } {
  const n = Math.max(0, int(total))
  const s = Math.min(Math.max(0, int(start)), n)
  const e = Math.min(Math.max(s, int(end)), n)
  const m = Math.max(0, int(margin))
  return { start: Math.max(0, s - m), end: Math.min(n, e + m) }
}

/** 期望区间是否已被已装载区间覆盖 */
export function windowCovered(need: { start: number; end: number }, loaded: { start: number; end: number }): boolean {
  return need.start >= loaded.start && need.end <= loaded.end
}

/** 同一期望区间（用于去重派发） */
export function sameWindow(
  a: { start: number; end: number } | null,
  b: { start: number; end: number } | null,
): boolean {
  if (a === null || b === null) return a === b
  return a.start === b.start && a.end === b.end
}

/**
 * windowed 模式的统一取值：返回 { windowed, total, windowStart, loaded }；
 * `windowed` 仅在 `windowed` 属性在场且 `total` 为合法正数时生效。
 */
export function readWindowedMode(
  hasWindowed: boolean,
  total: number,
  windowStart: number,
  dataLength: number,
): { windowed: boolean; total: number; windowStart: number; loaded: { start: number; end: number } } {
  const n = Math.max(0, int(total))
  const ws = Math.max(0, int(windowStart))
  const loaded = loadedRange(ws, dataLength)
  return { windowed: hasWindowed && n > 0, total: n, windowStart: ws, loaded }
}
