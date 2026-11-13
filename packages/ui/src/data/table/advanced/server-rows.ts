/**
 * server 行模型（row-model="server"）宿主侧取数 helper：监听 `oas-rows-request`，
 * 调宿主 fetchRows 取当前页并回填 data / total；失败经 `reportRowsError` 桥接组件
 * 内建失败通道（`oas-rows-error` 事件 + 错误条 + loading 收敛）。
 *
 * 用法心智：宿主 fetcher 只管取数——协议监听、requestId 校验、abort、失败上报
 * 全由本 helper 内置；fetcher 收到 `signal` 时应尽早在取数实现里响应中止
 * （helper 侧晚到丢弃是兜底，不是取消的唯一手段）。
 *
 * 接管惯例（对齐 createWindowedSource）：`setAttribute('row-model','server')` 自动
 * 激活 server 行模型；options.total 在场即挂载前写入 `total`（生效前提——server
 * 生效要求 total 属性在场，未提供且宿主未自设时组件按 client 行为执行并一次性 devWarn）。
 *
 * 缓存 TTL 位（预留，v1 未实现）：未来在 options 预留 cache / ttl 选项，
 * 缓存键 = 完整查询（页码 + 页大小 + 排序组 + 过滤组，对齐组件请求签名口径）；
 * 当前接口不暴露任何缓存选项，v1 仅当前请求。
 */
import type { RowsRequestReason } from '../row-model.js'

export interface ServerRowsRequest {
  /** 组件内单调递增请求序号（与 `oas-rows-request` detail.requestId 同源，宿主可透传给服务端做 trace 关联） */
  requestId: number
  /** 当前页期望区间起点（含）= (current-1)*pageSize */
  start: number
  /** 当前页期望区间终点（不含）= current*pageSize */
  end: number
  /** 排序模型（沿用 sort-key/sort-order 词汇；multi-sort 在场时按序组装多键） */
  sortModel: Array<{ key: string; order: string }>
  /** 过滤值（filter-values 属性对象形状原样） */
  filterValues: Record<string, string | number>
  /** 请求原因：init=首载 / paginate=翻页或页大小变更 / sort=排序变更 / filter=过滤变更 / refresh=refreshRows 强刷 */
  reason: RowsRequestReason
  /** 中止通道：同表新请求派发或 destroy 时上一笔在途被 abort——fetcher 应尽早响应（只给 fetcher 用，不进事件 detail） */
  signal: AbortSignal
}

export interface ServerSourceOptions {
  /** 拉取当前页；返回行数组或 { rows, total }；fetch 返回 total 时 helper 自动同步 total 属性 */
  fetchRows(request: ServerRowsRequest): Promise<unknown[] | { rows: unknown[]; total?: number }>
  /** 挂载前写入 total（可省略）——server 行模型生效前提（组件 total 属性在场判定） */
  total?: number
}

export interface ServerSource {
  /** 强刷当前页 → table.refreshRows() */
  refresh(): void
  /** 解绑监听 + abort 在途 */
  destroy(): void
}

/** helper 回写通道只依赖三个宿主面：属性写（HTMLElement 原生）、refreshRows 强刷与 reportRowsError 失败桥接 */
type ServerRowsHost = HTMLElement & {
  refreshRows(options?: { purge?: boolean }): void
  reportRowsError(detail: { requestId: number; reason?: string; error?: unknown }): void
}

/**
 * server 表格数据源胶水（纯宿主侧 helper，不进入 table 运行时，不新增组件 API）：
 * 每次请求先中止上一笔在途，再以新 AbortController 取数；响应仅当其 requestId 仍是
 * 组件最新在途序号时回写（组件 requestId 单调性保证比对可靠，晚到旧响应静默丢弃）；
 * 失败同序号校验后经 `reportRowsError` 上报（组件侧幂等收敛）。
 */
export function createServerSource(table: HTMLElement, options: ServerSourceOptions): ServerSource {
  if (!table.shadowRoot) {
    throw new Error('[oas-table] createServerSource 需要已升级的 oas-table 元素（请先 import 表格入口）')
  }
  let destroyed = false
  /** 组件最新在途请求序号（事件 detail 权威记录；-1 = 尚未见过任何请求） */
  let latestRequestId = -1
  /** 当前在途取数的 abort 通道（新请求派发 / destroy 时中止上一笔） */
  let controller: AbortController | null = null

  const onRequest = (event: Event): void => {
    if (destroyed) return
    const detail = (event as CustomEvent).detail as
      | Partial<{
          requestId: number
          start: number
          end: number
          sortModel: Array<{ key: string; order: string }>
          filterValues: Record<string, string | number>
          reason: RowsRequestReason
        }>
      | undefined
    if (!detail || typeof detail.requestId !== 'number') return
    latestRequestId = detail.requestId
    const { requestId } = detail
    const start = typeof detail.start === 'number' ? detail.start : 0
    const end = typeof detail.end === 'number' ? detail.end : start
    const sortModel = Array.isArray(detail.sortModel) ? detail.sortModel : []
    const filterValues = detail.filterValues ?? {}
    const reason = detail.reason ?? 'init'
    // 先中止上一笔在途再取数：fetcher 收到的 signal 是真正的取消通知；
    // 晚到兜底由 requestId 守卫承担（fetcher 不响应 signal 时响应照样被丢弃）
    controller?.abort()
    controller = new AbortController()
    const signal = controller.signal
    void (async () => {
      try {
        const result = await options.fetchRows({ requestId, start, end, sortModel, filterValues, reason, signal })
        // requestId 校验：仅当该序号仍是组件最新在途序号才回写（晚到旧响应静默丢弃）
        if (destroyed || signal.aborted || requestId !== latestRequestId) return
        const rows = Array.isArray(result) ? result : result.rows
        table.setAttribute('data', JSON.stringify(rows))
        if (!Array.isArray(result) && result.total != null && table.getAttribute('total') !== String(result.total)) {
          table.setAttribute('total', String(result.total))
        }
      } catch (error) {
        // 失败同序号校验后才上报（晚到旧失败静默丢弃，组件侧幂等收敛不再叠加噪音）
        if (destroyed || signal.aborted || requestId !== latestRequestId) return
        ;(table as ServerRowsHost).reportRowsError({ requestId, reason, error })
      }
    })()
  }

  // 监听先挂：setAttribute 触发的同步 init 请求能被接住（组件先记后派，同 windowed 先例）
  table.addEventListener('oas-rows-request', onRequest)
  // total 先落位再激活 server 模式：生效前提在 row-model 写入前已在场，
  // 组件的前提延后复核（queueMicrotask）静默，不落「缺 total」误报告警
  if (options.total != null) table.setAttribute('total', String(options.total))
  table.setAttribute('row-model', 'server')

  return {
    refresh() {
      // 强刷走组件公开通道：reason='refresh' 绕过同值去重，经 onRequest 走同一取数循环
      if (destroyed) return
      ;(table as ServerRowsHost).refreshRows()
    },
    destroy() {
      destroyed = true
      controller?.abort()
      controller = null
      table.removeEventListener('oas-rows-request', onRequest)
      // 不动宿主属性：row-model / total 归宿主管辖，destroy 只摘除 helper 自身接线
    },
  }
}
