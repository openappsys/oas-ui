/**
 * server 行模型（row-model="server"）请求协议纯函数。
 *
 * 核内接线在 oas-table.ts（syncServerRows / dispatchRowsRequest）；本文件只放
 * 可独立单测的判定与序列化：请求原因推导（含页码重置规则）与同值去重签名。
 *
 * 事件契约（与 oas-window-request 同族风格，bubbles + composed）：
 * - `oas-rows-request`：detail 见 RowsRequestDetail——requestId 为组件内单调递增
 *   （请求序号守卫：宿主据此丢弃晚到旧响应的回写）；
 * - 失败通道见 oas-table.ts 的 reportRowsError（requestId === 在途序号才生效）。
 */

/** 请求原因：init=挂载首载 / paginate=翻页或页大小变更 / sort=排序变更 / filter=过滤变更 / refresh=refreshRows 强刷 */
export type RowsRequestReason = 'init' | 'paginate' | 'sort' | 'filter' | 'refresh'

/** `oas-rows-request` detail */
export interface RowsRequestDetail {
  /** 组件内单调递增请求序号（请求序号守卫的权威依据） */
  requestId: number
  /** 当前页期望区间起点（含）= (current-1)*pageSize */
  start: number
  /** 当前页期望区间终点（不含）= current*pageSize */
  end: number
  /** 排序模型（沿用 sort-key/sort-order 词汇；multi-sort 在场时按序组装多键） */
  sortModel: Array<{ key: string; order: string }>
  /** 过滤值（filter-values 属性对象形状原样） */
  filterValues: Record<string, string | number>
  reason: RowsRequestReason
  /** 总数已知性声明（v1 恒 true：server 生效前提即 total 在场；未知总数场景预留） */
  totalKnown: boolean
}

/** 请求状态快照（同值去重键与原因推导的输入） */
export interface RowsRequestState {
  current: number
  pageSize: number
  sortModel: Array<{ key: string; order: string }>
  filterValues: Record<string, string | number>
}

/** 排序组签名（数组序敏感：multi-sort 语义按序依次排序） */
const sortSig = (sortModel: Array<{ key: string; order: string }>): string =>
  sortModel.map((s) => `${s.key}:${s.order}`).join(',')

/** 过滤组签名（键排序后签名：宿主以不同键序写 filter-values 属语义同值——框架序列化
 *  顺序不定，按对象键序签名会误判变化重发请求且页码跳回 1） */
const filterSig = (filterValues: Record<string, string | number>): string =>
  Object.keys(filterValues)
    .sort()
    .map((k) => `${k}=${filterValues[k]}`)
    .join(',')

/** 请求签名（同值去重键）：current+pageSize+排序组+过滤组 */
export function rowsRequestSignature(s: RowsRequestState): string {
  return [String(s.current), String(s.pageSize), sortSig(s.sortModel), filterSig(s.filterValues)].join('\u0003')
}

export interface RowsRequestPlan {
  /** null = 状态与上次请求完全同值（不派发） */
  reason: RowsRequestReason | null
  /**
   * 页码重置规则：排序/过滤/页大小变更时 current 须先置 1（用户看到新口径首页，
   * 而非「新排序的第 N 页」）；纯翻页（仅 current 变化）不重置。
   */
  resetPage: boolean
}

/**
 * 请求原因推导：与上次请求状态逐组比较。
 * 优先级 sort > filter > paginate（页码重置随 sort/filter 发生时，原因取驱动源）；
 * 页大小变更归入 paginate 且须重置页码（新口径首页）；仅 current 变化为纯翻页不重置。
 */
export function rowsRequestPlan(last: RowsRequestState | null, next: RowsRequestState): RowsRequestPlan {
  if (!last) return { reason: 'init', resetPage: false }
  if (rowsRequestSignature(last) === rowsRequestSignature(next)) return { reason: null, resetPage: false }
  if (sortSig(last.sortModel) !== sortSig(next.sortModel)) return { reason: 'sort', resetPage: true }
  if (filterSig(last.filterValues) !== filterSig(next.filterValues)) return { reason: 'filter', resetPage: true }
  // 走到这里只剩分页组变化：页大小变化重置页码，纯翻页不重置
  return { reason: 'paginate', resetPage: last.pageSize !== next.pageSize }
}
