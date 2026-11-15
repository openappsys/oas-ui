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

/** 请求原因：init=挂载首载 / paginate=翻页或页大小变更 / sort=排序变更 / filter=过滤变更 / group=分组键变更（server 分组协议）/ refresh=refreshRows 强刷 / load-more=infinite 触底追加下一块 */
export type RowsRequestReason = 'init' | 'paginate' | 'sort' | 'filter' | 'group' | 'refresh' | 'load-more'

/** `oas-rows-request` detail */
export interface RowsRequestDetail {
  /** 组件内单调递增请求序号（请求序号守卫的权威依据） */
  requestId: number
  /** 当前页期望区间起点（含）= (current-1)*pageSize；infinite 形态为累计已装载行数（区间语义不适用，见 cursor；批 G 起淘汰只缩缓冲不减计数——start 不受上界影响） */
  start: number
  /** 当前页期望区间终点（不含）= current*pageSize；infinite 形态与 start 同值（无固定终点） */
  end: number
  /** 排序模型（沿用 sort-key/sort-order 词汇；multi-sort 在场时按序组装多键） */
  sortModel: Array<{ key: string; order: string }>
  /** 过滤值（filter-values 属性对象形状原样） */
  filterValues: Record<string, string | number>
  reason: RowsRequestReason
  /** 总数已知性声明：server 生效形态恒 true（生效前提即 total 在场）；infinite 形态随 total 属性在场性（未知总数场景 false） */
  totalKnown: boolean
  /** 无限滚动游标：上次 appendRows(options.cursor) 记录的值原样回传（首次进入/排序过滤重置后 = undefined）——cursor 分页取下一块的定位依据 */
  cursor?: string
  /** server 分组协议：当前分组键（group-by 属性值）——仅 row-model="server" 形态且 group-by 在场时携带；宿主据此返回分组行 */
  groupBy?: string
}

/** 请求状态快照（同值去重键与原因推导的输入） */
export interface RowsRequestState {
  current: number
  pageSize: number
  sortModel: Array<{ key: string; order: string }>
  filterValues: Record<string, string | number>
  /** server 分组键（server 形态 + group-by 在场时非空；infinite/windowed/client 缺省空串） */
  groupBy?: string
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

/** 请求签名（同值去重键）：current+pageSize+排序组+过滤组+分组键 */
export function rowsRequestSignature(s: RowsRequestState): string {
  return [String(s.current), String(s.pageSize), sortSig(s.sortModel), filterSig(s.filterValues), s.groupBy ?? ''].join(
    '\u0003',
  )
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
 * 优先级 sort > filter > group > paginate（页码重置随 sort/filter/group 发生时，原因取驱动源）；
 * 页大小变更归入 paginate 且须重置页码（新口径首页）；仅 current 变化为纯翻页不重置。
 */
export function rowsRequestPlan(last: RowsRequestState | null, next: RowsRequestState): RowsRequestPlan {
  if (!last) return { reason: 'init', resetPage: false }
  if (rowsRequestSignature(last) === rowsRequestSignature(next)) return { reason: null, resetPage: false }
  if (sortSig(last.sortModel) !== sortSig(next.sortModel)) return { reason: 'sort', resetPage: true }
  if (filterSig(last.filterValues) !== filterSig(next.filterValues)) return { reason: 'filter', resetPage: true }
  if ((last.groupBy ?? '') !== (next.groupBy ?? '')) return { reason: 'group', resetPage: true }
  // 走到这里只剩分页组变化：页大小变化重置页码，纯翻页不重置
  return { reason: 'paginate', resetPage: last.pageSize !== next.pageSize }
}

// ==================== infinite（无限滚动 + cursor 分页）纯判定 ====================
//
// 组件接线在 oas-table.ts（syncInfiniteRows / appendRows / 滚动触底触发）；本节只放
// 可独立单测的判定：触底阈值、append 去重（同 requestId 幂等）与到底（hasMore）判定。

/** 触底探针：滚动基础设施（wrap 元素）可得的三个量 */
export interface InfiniteScrollProbe {
  scrollTop: number
  clientHeight: number
  scrollHeight: number
}

/**
 * 触底判定（infinite 滚动触发阈值）：距底部不足 max(200px, 可视区高度 × 1.5) 即视为「接近底部」。
 * 两个判据取更宽松者——小视口（clientHeight 小）时 200px 绝对值更早触发预取；
 * 大视口（长列表虚拟高度）时 1.5 倍提前量保证追加块在滚到底之前就在途。
 * 边界含等号（距底恰好等于阈值仍触发——快照时点的滞后宁可多请求一次，不可漏触发）。
 */
export function infiniteNearBottom(probe: InfiniteScrollProbe): boolean {
  const distance = probe.scrollHeight - probe.scrollTop - probe.clientHeight
  return distance <= Math.max(200, probe.clientHeight * 1.5)
}

/**
 * append 去重（同 requestId 重复 append 幂等）：requestId 已被消费且属真实请求序号（>= 1）。
 * requestId >= 1 的下界豁免「从未派发过请求」的预填/手动通道（rowsRequestId 初始 0）——
 * 该通道无请求身份，宿主连续多批 append 属合法用法，不误伤；双监听把同一响应回填两次的
 * 场景（真实请求序号已消费后再次 append）才判重复。
 */
export function isDuplicateAppend(consumedRequestId: number, requestId: number): boolean {
  return requestId >= 1 && consumedRequestId === requestId
}

/** infinite 到底（hasMore）判定的输入 */
export interface InfiniteHasMoreInput {
  /** 宿主「到底」信号：appendRows 回传空数组（rows.length === 0）置位 */
  hostEnded: boolean
  /** total 属性在场（已知总数） */
  totalKnown: boolean
  /** 已知总数（totalKnown=false 时不参与判定） */
  total: number
  /** 已装载行数 */
  loaded: number
}

/**
 * 到底（hasMore）判定：宿主空块信号优先（权威——total 已知但服务端提前截流时以信号为准）；
 * totalKnown 时已装载满 total 亦到底（装满即无下一块）；total 未知且无信号 → 有更多
 * （继续在滚动触底时请求，直到宿主回写空块）。
 */
export function infiniteHasMore(a: InfiniteHasMoreInput): boolean {
  if (a.hostEnded) return false
  if (a.totalKnown && a.loaded >= a.total) return false
  return true
}

/**
 * 解析 max-loaded-rows 属性值（批 G：infinite 缓冲上界）：
 * 合法正整数（整数、≥1，容忍首尾空白）→ 上界行数；其余（空串 / 非数 / 小数 /
 * 零 / 负数 / Infinity / NaN）→ null（无上界——缺省行为，现状）。
 * 属性在场但解析为 null 时组件壳层一次性 devWarn（可诊断），解析本函数保持纯。
 */
export function parseMaxLoadedRows(raw: string): number | null {
  const n = Number(raw.trim())
  return Number.isFinite(n) && Number.isInteger(n) && n >= 1 ? n : null
}
