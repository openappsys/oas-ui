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
 * 首屏时序：创建时会主动发起一次刷新取首屏——静态 HTML 标签（先于脚本在场）升级瞬间
 * init 请求已派发、helper 监听未就绪会丢，创建时 refreshRows 兜底保证取数；init 已被
 * 接住（动态 createElement + append 后创建）时不重复刷新；元素已预填 data（宿主 SSR/
 * 预填场景）时不主动刷，首屏数据由宿主负责，后续翻页/排序/过滤仍由 helper 接管。
 * 另外要求元素已连接（已挂载）：请先 append 再创建。
 *
 * 实例守卫：每元素一个 source 实例——同一元素重复创建会双监听双取数，每次重复创建
 * 各 devWarn 一次（不阻断宿主，照常返回新实例）；请先 destroy() 再重建（destroy 解除
 * 登记，重建无告警）。
 *
 * 组合守卫：元素 `infinite` 属性在场时创建即 devWarn 一次（整页 data 覆盖与 appendRows
 * 追加语义冲突，不阻断、不 throw——devWarn 惯例）；infinite 形态请宿主自管
 * `oas-rows-request` 监听取数。
 *
 * 数据层缓存（批 C，层在 helper 内、不影响组件协议）：默认启用（TTL 5 分钟、不启用
 * 后台刷新；`cache: false` 完全关闭——关闭档与既有行为逐值一致）。缓存键 = 完整查询
 * 签名（start / end / sortModel / filterValues / groupBy / cursor，与 reason 无关——init /
 * sort / filter / paginate / group 同属查询态，翻页往返命中同一条目）。命中（未过期）直接
 * 回填不调 fetchRows；命中（已过期）默认重新取数，`staleWhileRevalidate: true` 时先
 * 回填陈旧值再后台重取（成功后回填更新，两阶段可见）；同键请求在途时复用同一 Promise
 * （不重复 fetch）。`refresh()` 无 purge：绕过缓存强制重取并更新缓存；
 * `refresh({ purge: true })` 清空全部缓存后强制重取，并递增实例 epoch——purge 时刻在途的
 * 取数（含 SWR 背景）settle 时被 epoch 拦截，不污染 purge 后的缓存。写缓存守卫分两层：
 * 缓存写按 epoch（发起时快照，不校验 requestId——SWR 后台结果无论用户翻到哪页都修好
 * 缓存）；回填（写 data / total）仍校验 requestId 最新（后台结果顶不掉用户当前页展示）。
 * fetchRows 失败 / reject 或被 abort 不写缓存（abort 的同键在途登记即时移除——被中止的
 * 在途不可复用）；destroy() 递增 epoch、清缓存与在途登记并中止全部取数（含 SWR 背景
 * 在途）。缓存命中回填与成功路径同一通道（data / total 属性写），requestId 校验语义
 * 保持（命中回填仍按当前 requestId）。
 */
import { devWarn } from '../../../shared/dev-warn.js'
import type { RowsRequestReason } from '../row-model.js'
import {
  createServerRowsCache,
  serverCacheKey,
  type ServerCacheValue,
  type ServerRowsCache,
} from './server-rows-cache.js'

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
  /** 请求原因：init=首载 / paginate=翻页或页大小变更 / sort=排序变更 / filter=过滤变更 / group=分组键变更 / refresh=refreshRows 强刷 */
  reason: RowsRequestReason
  /** 分组键（服务端分组形态：detail.groupBy 原样透传；无 group-by 的请求不携带此键） */
  groupBy?: string
  /** 无限滚动游标（detail.cursor 原样透传；仅携带 cursor 的请求有此键——缓存键同维度） */
  cursor?: string
  /** 中止通道：同表新请求派发或 destroy 时上一笔在途被 abort——fetcher 应尽早响应（只给 fetcher 用，不进事件 detail） */
  signal: AbortSignal
}

export interface ServerSourceOptions {
  /** 拉取当前页；返回行数组或 { rows, total }；fetch 返回 total 时 helper 自动同步 total 属性 */
  fetchRows(request: ServerRowsRequest): Promise<unknown[] | { rows: unknown[]; total?: number }>
  /** 挂载前写入 total（可省略）——server 行模型生效前提（组件 total 属性在场判定） */
  total?: number
  /**
   * 缓存配置；缺省启用默认缓存（TTL 5 分钟、条目上界 200、不启用后台刷新）；`false` 完全
   * 关闭（关闭档行为与无缓存实现逐值一致）。缓存键 = 完整查询签名（区间 / 排序 / 过滤 /
   * 分组 / 游标，与 reason 无关）；`ttlMs` 毫秒级（默认 300000，`0` = 不缓存，负数 / NaN
   * 提示一次并回退默认）；`maxEntries` 条目上界（默认 200，LRU：命中重排、超界淘汰最旧）；
   * `staleWhileRevalidate` 开启后过期命中先回填陈旧值再后台重取。
   */
  cache?: false | { ttlMs?: number; staleWhileRevalidate?: boolean; maxEntries?: number }
}

export interface ServerSource {
  /**
   * 强刷当前页 → table.refreshRows()。无参：绕过缓存强制重取（结果更新缓存）；
   * `{ purge: true }`：清空全部缓存后强制重取（各键往返全重取）。
   */
  refresh(options?: { purge?: boolean }): void
  /** 解绑监听 + abort 在途（含 SWR 背景在途）+ 清缓存与在途登记 */
  destroy(): void
}

/** helper 回写通道只依赖三个宿主面：属性写（HTMLElement 原生）、refreshRows 强刷与 reportRowsError 失败桥接 */
type ServerRowsHost = HTMLElement & {
  refreshRows(options?: { purge?: boolean }): void
  reportRowsError(detail: { requestId: number; reason?: string; error?: unknown }): void
}

/**
 * 每元素一个 source 实例的登记表（元素 → 在册）：
 * 二次创建 = 双监听双取数（两个 source 各自响应同一批请求，各写一次 data），每次重复创建
 * 各 dev 提醒一次、提醒但不阻断——组件库不炸宿主，照常返回新实例；destroy 时解除登记
 * （先毁后建无告警）。
 * 仅 devWarn 通道，生产仅告警静默（WeakMap 登记操作仍在，随元素回收，不产生泄漏面）。
 */
const serverSourceRegistry = new WeakMap<HTMLElement, true>()

/** 缓存配置归一：false → null（关闭档）；缺省/对象 → SWR 标志 + 缓存实例（TTL / 上界在 store 内取默认） */
const normalizeCache = (cache: ServerSourceOptions['cache']): { swr: boolean; store: ServerRowsCache } | null => {
  if (cache === false) return null
  const settings = cache != null && typeof cache === 'object' ? cache : undefined
  const swr = settings?.staleWhileRevalidate === true
  return { swr, store: createServerRowsCache({ ttlMs: settings?.ttlMs, maxEntries: settings?.maxEntries }) }
}

/**
 * server 表格数据源胶水（纯宿主侧 helper，不进入 table 运行时，不新增组件 API）：
 * 每次请求先中止上一笔在途，再以新 AbortController 取数；响应仅当其 requestId 仍是
 * 组件最新在途序号时回写（组件 requestId 单调性保证比对可靠，晚到旧响应静默丢弃）；
 * 失败同序号校验后经 `reportRowsError` 上报（组件侧幂等收敛）。
 *
 * 缓存开启时请求先过缓存面：fresh 命中直接回填（不调 fetchRows）；陈旧命中按 SWR
 * 配置回填陈旧值 + 后台重取或退化为重新取数；同键在途复用。reason='refresh' 绕过
 * 读（缓存与在途合并），取数结果照常更新缓存。
 */
export function createServerSource(table: HTMLElement, options: ServerSourceOptions): ServerSource {
  if (!table.shadowRoot) {
    throw new Error('[oas-table] createServerSource 需要已升级的 oas-table 元素（请先 import 表格入口）')
  }
  if (table.isConnected === false) {
    throw new Error('[oas-table] createServerSource 需要已连接（已挂载）的 oas-table 元素（请先 append 再创建）')
  }
  // 每元素一个实例守卫：重复创建双监听双取数，每次重复创建各提醒一次、照常返回新实例（生产静默不阻断）
  if (serverSourceRegistry.has(table)) {
    devWarn('[oas-table] 该元素已存在 createServerSource 实例——重复创建会双监听双取数，请先 destroy() 再重建')
  }
  serverSourceRegistry.set(table, true)
  // 组合守卫（文档口径落地实现侧）：helper 的整页 data 覆盖回填与 infinite 的 appendRows
  // 追加语义冲突（同开时 infinite 优先，helper 回写会重置已装载缓冲）——创建时提醒一次，
  // 不阻断不 throw（devWarn 惯例）；infinite 形态请宿主自管 oas-rows-request 监听取数
  if (table.hasAttribute('infinite')) {
    devWarn(
      '[oas-table] createServerSource 仅服务服务端分页/分组形态，与 infinite 组合不适用（整页 data 覆盖与 appendRows 追加语义冲突）——请移除 infinite 或改由宿主自管 oas-rows-request 监听取数',
    )
  }
  let destroyed = false
  /** 组件最新在途请求序号（事件 detail 权威记录；-1 = 尚未见过任何请求） */
  let latestRequestId = -1
  /**
   * 缓存代际（purge / destroy 递增）：写缓存的守卫维度。发起取数时快照，settle 时
   * `epoch === fetchEpoch` 才写缓存——SWR 后台结果不校验 requestId（无论用户翻到哪页
   * 都该修好缓存），但 purge / destroy 之后在途结果不得污染新一代缓存。
   */
  let epoch = 0
  /** 当前在途取数的 abort 通道（新请求派发 / destroy 时中止上一笔）；key 记录该笔的缓存键（abort 时同步解除在途登记） */
  let controller: { ac: AbortController; key: string | null } | null = null
  /** SWR 背景重取的中止通道（不占 controller 槽——翻页不中止它，destroy 统一中止；settle 后即除名防泄漏） */
  const backgroundControllers = new Set<AbortController>()
  const cache = normalizeCache(options.cache)

  /** 回填通道（与成功路径同一实现）：裸数组归一 → data / total 属性写；requestId 守卫（晚到丢弃） */
  const apply = (requestId: number, result: unknown): void => {
    if (destroyed || requestId !== latestRequestId) return
    // fetchRows 契约保证返回形状（行数组或 { rows, total }）——归一后类型断言收窄
    const value = (Array.isArray(result) ? { rows: result } : result) as ServerCacheValue
    table.setAttribute('data', JSON.stringify(value.rows))
    if (value.total != null && table.getAttribute('total') !== String(value.total)) {
      table.setAttribute('total', String(value.total))
    }
  }

  /**
   * 缓存命中回填（同步路径专用）：推迟到微任务写属性。缓存命中发生在 onRequest 同步栈内，
   * 而 onRequest 由组件 update 管线中途派发（setAttribute('current') 的同步调用栈）——此刻
   * 同步写 `data` 会重入 attributeChangedCallback（渲染管线重入 → DOM 落后一帧，见「回填
   * 时序注意」；正常取数路径 await fetchRows 天然异步免疫，命中路径必须同样异步化）。
   * requestId 守卫在 apply 内，微任务执行时若 latest 已变则安全丢弃。
   */
  const applyAsync = (requestId: number, result: unknown): void => {
    queueMicrotask(() => apply(requestId, result))
  }

  /** 中止上一笔在途：controller 槽（正常取数）+ 同步解除其键的在途登记（被中止的在途不可复用） */
  const abortPrevious = (): void => {
    if (!controller) return
    controller.ac.abort()
    if (cache && controller.key) cache.store.untrack(controller.key)
    controller = null
  }

  /** 失败上报（与成功路径同一 requestId 守卫；背景重取失败不上报——前台已陈旧回填兜住展示） */
  const fail = (requestId: number, reason: RowsRequestReason, error: unknown, background: boolean): void => {
    if (background) return
    if (destroyed || requestId !== latestRequestId) return
    ;(table as ServerRowsHost).reportRowsError({ requestId, reason, error })
  }

  /**
   * 统一取数执行：fetchRows 同步 throw 与 Promise rejection 走同一失败路径；
   * settle 后写缓存与回填分层校验——缓存写按 epoch（不校验 requestId：SWR 后台结果
   * 无论用户翻到哪页都修好缓存；signal 已中止 / purge·destroy 换代则不写）；回填仍按
   * requestId 最新（晚到旧响应不顶掉用户当前页展示）。`background`（SWR 后台重取）
   * 成功只写缓存 + requestId 仍最新时回填；失败静默。
   *
   * 时序纪律：回填链保持与「await fetchRows 后同步回填」同深（1 级微任务）——在途登记
   * 直接 track 原始 promise（复用者拿到未归一结果，apply 内归一），不在回填链上额外
   * 挂归一化 then（多一级微任务会把回填推迟到消费方 await 恢复之后，破坏既有时序假设）。
   */
  const startFetch = (
    key: string | null,
    requestId: number,
    q: {
      start: number
      end: number
      sortModel: Array<{ key: string; order: string }>
      filterValues: Record<string, string | number>
      reason: RowsRequestReason
      groupBy?: string
      cursor?: string
    },
    ac: AbortController,
    background: boolean,
  ): void => {
    const signal = ac.signal
    const fetchEpoch = epoch
    let promise: Promise<unknown>
    try {
      promise = Promise.resolve(options.fetchRows({ requestId, ...q, signal }))
    } catch (error) {
      // 同步 throw 与 Promise rejection 走同一失败路径（归一为 rejected promise）
      promise = Promise.reject(error)
    }
    if (cache && key) cache.store.track(key, promise)
    void (async () => {
      try {
        const result = await promise
        // 缓存写按 epoch：翻页（requestId 变陈旧）不拦截后台结果修缓存；abort 的取数
        // 不写（结果可能不完整）；purge / destroy 换代后不写（不污染新一代缓存）
        if (destroyed || signal.aborted || epoch !== fetchEpoch) return
        if (cache && key) cache.store.set(key, (Array.isArray(result) ? { rows: result } : result) as ServerCacheValue)
        // 回填按 requestId（apply 内守卫）：晚到旧响应不顶掉用户当前页展示
        apply(requestId, result)
      } catch (error) {
        fail(requestId, q.reason, error, background)
      } finally {
        // 背景控制器用毕即除名（防 Set 泄漏；前台 controller 槽随 abortPrevious 轮换，无此问题）
        if (background) backgroundControllers.delete(ac)
      }
    })()
  }

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
          groupBy?: string
          cursor?: string
        }>
      | undefined
    if (!detail || typeof detail.requestId !== 'number') return
    latestRequestId = detail.requestId
    const requestId = detail.requestId
    const start = typeof detail.start === 'number' ? detail.start : 0
    const end = typeof detail.end === 'number' ? detail.end : start
    const sortModel = Array.isArray(detail.sortModel) ? detail.sortModel : []
    const filterValues = detail.filterValues ?? {}
    const reason = detail.reason ?? 'init'
    const cursor = typeof detail.cursor === 'string' ? detail.cursor : undefined
    const groupBy = typeof detail.groupBy === 'string' ? detail.groupBy : undefined
    // fetcher 入参 = detail 查询态原样（batch B/A 契约补齐：groupBy / cursor 原样透传；
    // 缺省不带键——「无分组 / 无游标」与「值为 undefined」在 fetcher 侧形状一致）
    const q: {
      start: number
      end: number
      sortModel: Array<{ key: string; order: string }>
      filterValues: Record<string, string | number>
      reason: RowsRequestReason
      groupBy?: string
      cursor?: string
    } = { start, end, sortModel, filterValues, reason }
    if (groupBy !== undefined) q.groupBy = groupBy
    if (cursor !== undefined) q.cursor = cursor
    // 缓存键 = 完整查询签名（与 reason 无关）；refresh 强刷绕过读（缓存与在途合并）
    const key = cache ? serverCacheKey({ start, end, sortModel, filterValues, groupBy, cursor }) : null
    const bypass = reason === 'refresh'

    if (cache && key && !bypass) {
      // 陈旧读取先于 fresh get：get 命中过期即删条目（条目上界卫生），SWR 陈旧回填必须在
      // 删除前取到——顺序颠倒会让 SWR 永远拿不到陈旧值
      const stale = cache.store.peek(key)
      // fresh 命中：直接回填（微任务异步化），不调 fetchRows（中止上一笔在途——本回填不依赖它）
      const fresh = cache.store.get(key)
      if (fresh) {
        abortPrevious()
        applyAsync(requestId, fresh)
        return
      }
      const pending = cache.store.inflight(key)
      // 陈旧命中 + SWR：先回填陈旧值（微任务异步化），后台重取（同键在途则不再发起——复用既有一笔）
      if (stale && cache.swr) {
        abortPrevious()
        applyAsync(requestId, stale)
        if (!pending) {
          const ac = new AbortController()
          backgroundControllers.add(ac)
          startFetch(key, requestId, q, ac, true)
        } else {
          // 同键后台在途：本次请求的回填更新挂靠在途 settle（requestId 守卫兜底竞态——
          // 后台发起时的 requestId 可能已被本次之前的翻页顶掉，settle 时靠本守卫回填）
          void pending.then(
            (value) => apply(requestId, value),
            (error) => fail(requestId, reason, error, false),
          )
        }
        return
      }
      // 同键在途（fresh 未命中 + 有在途登记）：复用同一 Promise，不重复 fetch。
      // 不中止上一笔——复用对象可能正是 controller 槽内那笔（abort 等于自杀）。
      if (pending) {
        void pending.then(
          (value) => apply(requestId, value),
          (error) => fail(requestId, reason, error, false),
        )
        return
      }
    }
    // 未命中 / 关闭缓存 / refresh 绕过：正常取数（先中止上一笔在途再以新通道取数；
    // fetcher 收到的 signal 是真正的取消通知，晚到兜底由 requestId / epoch 守卫承担）
    abortPrevious()
    const ac = new AbortController()
    controller = { ac, key }
    startFetch(key, requestId, q, ac, false)
  }

  // 监听先挂：setAttribute 触发的同步 init 请求能被接住（组件先记后派，同 windowed 先例）
  table.addEventListener('oas-rows-request', onRequest)
  // total 先落位再激活 server 模式：生效前提在 row-model 写入前已在场，
  // 组件的前提延后复核（queueMicrotask）静默，不落「缺 total」误报告警
  if (options.total != null) table.setAttribute('total', String(options.total))
  table.setAttribute('row-model', 'server')
  // 首载兜底：静态 HTML 标签场景（<oas-table row-model="server" ...> 先于脚本在场）元素升级
  // 瞬间 init 请求已同步派发、helper 监听尚未挂上 → 事件丢失；此后 helper 的 row-model/total
  // 同值写入不再触发组件请求（attributeChangedCallback 同值静默）——不兜底则 fetchRows 永不
  // 执行、data 永空。兜底走 refreshRows（reason=refresh 绕过同值去重签名）保证取数。
  // 两个前提收窄触发面：
  // - latestRequestId 仍为 -1（init 未被上方监听接住）：动态路径（createElement + append 后创建）
  //   的 init 已被接住，不重复刷新（避免同一首屏双请求、第一笔被 abort 的浪费）；
  // - 无预填 data：宿主 SSR/预填场景首屏数据已就位，尊重预填不覆盖（此时首屏取数由宿主负责，
  //   后续翻页/排序/过滤仍由 helper 接管）。
  if (latestRequestId === -1 && !table.hasAttribute('data')) {
    ;(table as ServerRowsHost).refreshRows()
  }

  return {
    refresh(refreshOptions) {
      // 强刷走组件公开通道：reason='refresh' 绕过同值去重，经 onRequest 走同一取数循环；
      // purge 语义在 helper：清空全部缓存后强制重取，并递增实例 epoch——purge 时刻在途的
      // 取数（含 SWR 背景）settle 时被 epoch 拦截，不把 purge 前的旧值写回新一代缓存
      // （组件侧 purge 参数收下不分支，透传保持契约）
      if (destroyed) return
      if (refreshOptions?.purge) {
        epoch++
        cache?.store.clear()
      }
      ;(table as ServerRowsHost).refreshRows(refreshOptions)
    },
    destroy() {
      destroyed = true
      // epoch 递增：destroy 后迟到 settle 一并被代际守卫拦下（destroyed 主守卫的双保险）
      epoch++
      abortPrevious()
      for (const ac of backgroundControllers) ac.abort()
      backgroundControllers.clear()
      cache?.store.clear()
      table.removeEventListener('oas-rows-request', onRequest)
      // 解除登记：destroy 后可重建同一元素的 source（重建不再触发重复创建告警）
      serverSourceRegistry.delete(table)
      // 不动宿主属性：row-model / total 归宿主管辖，destroy 只摘除 helper 自身接线
    },
  }
}
