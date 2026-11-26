/**
 * goods-list 服务端分页协议（commerce helper 能力子路径，headless cursor 状态机）：
 *
 * `oas-goods-list` 触底加载的服务端分页编排——cursor 状态机（首页无 cursor →
 * 后续携带上一页尾 cursor）+ `loadPage()` 编排。与本体的对接契约：**paged 不改
 * 本体**，宿主侧胶水把三段接起来——
 *
 * ```js
 * import { createPagedSource } from '@oas-ui/ui/commerce/goods-list/paged'
 *
 * const source = createPagedSource({
 *   load: ({ cursor, page }) => fetch(`/api/goods?cursor=${cursor ?? ''}&page=${page}`).then((r) => r.json()),
 *   getItems: (res) => res.data.list,       // 缺省读 res.items
 *   getCursor: (res) => res.data.nextCursor, // 缺省读 res.cursor
 * })
 * list.addEventListener('oas-load-more', async () => {
 *   if (source.done) { list.setAttribute('no-more', ''); return }
 *   if (source.pending) return                       // 防重（本体待应答 + 在途双保险）
 *   list.setAttribute('loading', '')                 // 应答触底（本体解除待应答 + spinner）
 *   try {
 *     await source.loadPage()                        // 携带 cursor 取下一页
 *     list.items = source.items                      // 追加渲染
 *   } catch {
 *     // 失败呈现归宿主（toast 等）；cursor 状态未推进，可直接重试
 *   } finally {
 *     list.removeAttribute('loading')
 *     if (source.done) list.setAttribute('no-more', '')
 *   }
 * })
 * ```
 *
 * 本体触底协议（`oas-load-more` → 宿主置 `loading` 或 items 变化解除待应答 →
 * `no-more` 到底不再触发）与状态机的 `pending` / `done` 一一对应；`reset()` 覆盖
 * 切筛选条件的重置场景（清累计 + 代际守卫丢弃旧在途页，陈旧响应不污染新列表）。
 *
 * **形态决策（helper 型，不进 L1/CDN）**：状态机状态全在闭包内（cursor / page /
 * done / pending），无生命周期钩子、无 DOM 依赖、不读组件内部（对接全走本体公开
 * 协议）；先例同 `layout/scroll-area/infinite` 的 headless 控制器——宿主驱动、
 * 零 UI、SSR 安全（无 window / document 引用）。注册型无意义：本体无批量 UI 类
 * 触发面可挂，分页的可见面（loading / no-more）本体已有。
 *
 * 按需引入：`@oas-ui/ui/commerce/goods-list/paged`；运行闭包不含 oas-goods-list
 * 本体 / core / i18n（类型仅 `import type`，构建期擦除）。helper 型能力：无
 * HTML/属性触发面，宿主显式 import 调用导出函数；不进 L1 / CDN 族包。
 */

/** load 回调的入参上下文：首页 cursor=null、page=0，此后逐页递增 */
export interface PagedLoadContext {
  /** 上一页尾 cursor；首页为 null */
  cursor: string | null
  /** 已完成页数（首页请求 = 0，第 N 页请求 = N-1） */
  page: number
}

export interface PagedSourceOptions<TItem, TPage = { items?: TItem[]; cursor?: string | null }> {
  /** 取页请求（宿主接自己的服务端；paged 只编排不取数） */
  load: (ctx: PagedLoadContext) => Promise<TPage>
  /** 从页响应提取条目数组（缺省读 `page.items`；非数组视为空页） */
  getItems?: (page: TPage) => TItem[] | undefined | null
  /** 从页响应提取下一页 cursor（缺省读 `page.cursor`；null / undefined = 没有更多） */
  getCursor?: (page: TPage) => string | null | undefined
}

/** cursor 分页状态机（只读状态 + reset / loadPage 两个动作） */
export interface PagedSource<TItem, TPage = unknown> {
  /**
   * 重置并加载首页：清 items / cursor / page / done / error，发起首页请求
   * （cursor=null）。代际守卫——reset 前的在途页 resolve 后结果被丢弃，
   * 陈旧响应不污染新列表（切筛选条件场景）。
   */
  reset(): Promise<PagedSource<TItem, TPage>>
  /**
   * 加载下一页（首页 cursor=null 天然成立）：携带当前 cursor 调 load，
   * 成功后累计 items、推进 cursor / page；响应无 cursor → done。
   * 在途时重复调用返回同一 Promise（防重）；done 时零请求直接 resolve；
   * 失败时 cursor / page 不动（重试 = 再调 loadPage），error 落盘供宿主提示。
   */
  loadPage(): Promise<void>
  /** 下一页 cursor（null = 尚未加载过；done 后停在尾页值） */
  readonly cursor: string | null
  /** 已完成页数 */
  readonly page: number
  /** 已到底（最近一页无 cursor；reset 复位） */
  readonly done: boolean
  /** 最近一次请求在途（loadPage / reset 共用） */
  readonly pending: boolean
  /** 累计条目（宿主直接赋 `list.items`） */
  readonly items: TItem[]
  /** 最近一次失败的错误（重试成功后清 null；宿主读取做失败呈现） */
  readonly error: unknown
}

/** 缺省条目提取：读 page.items，非数组视为空页（响应形状异常不污染累计） */
function defaultGetItems<TItem>(page: unknown): TItem[] {
  const items = (page as { items?: unknown }).items
  return Array.isArray(items) ? (items as TItem[]) : []
}

/** 缺省 cursor 提取：读 page.cursor（null / undefined / 非串 = 没有下一页） */
function defaultGetCursor(page: unknown): string | null {
  const cursor = (page as { cursor?: unknown }).cursor
  return typeof cursor === 'string' && cursor !== '' ? cursor : null
}

/**
 * 创建 cursor 分页状态机（headless、零 DOM 依赖、SSR 安全）。
 *
 * @param options.load       取页请求（宿主接服务端）
 * @param options.getItems   页响应 → 条目数组（缺省读 `items` 字段）
 * @param options.getCursor  页响应 → 下一页 cursor（缺省读 `cursor` 字段）
 */
export function createPagedSource<TItem, TPage = { items?: TItem[]; cursor?: string | null }>(
  options: PagedSourceOptions<TItem, TPage>,
): PagedSource<TItem, TPage> {
  const load = options.load
  const getItems = options.getItems ?? ((page: TPage) => defaultGetItems<TItem>(page))
  const getCursor = options.getCursor ?? ((page: TPage) => defaultGetCursor(page))

  // —— 状态机状态（全部闭包内，helper 型判定依据）——
  let cursor: string | null = null
  let page = 0
  let done = false
  let pending = false
  let error: unknown = null
  let items: TItem[] = []
  /** 代际计数：reset 递增；旧代际在途请求的结果一律丢弃 */
  let epoch = 0
  /** 在途请求（loadPage / reset 共用防重通道；只判在途与否，具体类型不敏感） */
  let inflight: Promise<unknown> | null = null

  function run(ctx: PagedLoadContext, myEpoch: number): Promise<void> {
    pending = true
    error = null
    return (async () => {
      try {
        // load 可能同步抛错（不经 Promise）——await 同样收敛进 catch，维持 Promise 契约
        const res = await load(ctx)
        if (myEpoch !== epoch) return // 代际已切换：陈旧响应丢弃，状态不动
        const pageItems = getItems(res)
        items = [...items, ...(Array.isArray(pageItems) ? pageItems : [])]
        const next = getCursor(res)
        cursor = next ?? cursor
        if (next === null || next === undefined) done = true
        page = ctx.page + 1
      } catch (reason) {
        if (myEpoch !== epoch) return
        error = reason
        throw reason // 透传给宿主（呈现归宿主；状态未推进，可直接重试）
      } finally {
        if (myEpoch === epoch) pending = false
      }
    })()
  }

  const source: PagedSource<TItem, TPage> = {
    reset(): Promise<PagedSource<TItem, TPage>> {
      epoch += 1 // 旧在途请求作废
      cursor = null
      page = 0
      done = false
      error = null
      items = []
      const settle = run({ cursor: null, page: 0 }, epoch)
      const chained = settle.then(
        () => source,
        () => source, // reset 的失败不吞：error 已落盘，返回值仍回链（宿主可读 error）
      )
      // inflight 占位 = chained（防重口径与 loadPage 一致）；完成后按引用清自己的占位。
      // 清理必须**单跳**挂在 settle 上——与调用方 await 同队列且注册更早（先于宿主
      // resume 执行）；挂两跳（吞异常 then 之后再清理）会晚于宿主 resume，防重窗口漏放行
      const release = (): void => {
        if (inflight === chained) inflight = null
      }
      inflight = chained
      settle.then(release, release)
      return chained
    },
    loadPage(): Promise<void> {
      if (inflight) return inflight as Promise<void> // 防重（含 reset 在途；签名收敛）
      if (done) return Promise.resolve()
      const settle = run({ cursor, page }, epoch)
      const release = (): void => {
        if (inflight === settle) inflight = null
      }
      inflight = settle
      settle.then(release, release) // 单跳：先于调用方 await 的 resume 清占位（见 reset 注释）
      return settle
    },
    get cursor() {
      return cursor
    },
    get page() {
      return page
    },
    get done() {
      return done
    },
    get pending() {
      return pending
    },
    get items() {
      return items
    },
    get error() {
      return error
    },
  }
  return source
}
