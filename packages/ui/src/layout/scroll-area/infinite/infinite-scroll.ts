import { devWarn } from '../../../shared/dev-warn.js'

/** 触发方向：`bottom` 滚到底加载更多、`top` 滚到顶加载更早、`both` 双边缘独立加载 */
export type InfiniteScrollDirection = 'bottom' | 'top' | 'both'

/** 单边缘标识 */
export type InfiniteScrollEdge = 'top' | 'bottom'

/** 单边缘状态：idle 可加载 / loading 在途 / error 待 retry / complete 已到底 */
export type InfiniteScrollStatus = 'idle' | 'loading' | 'error' | 'complete'

/** 加载结果：`complete:true` 或 `hasMore:false`（`load` 直接返回 false 亦等价）标记该边缘已到底 */
export interface InfiniteScrollLoadResult {
  /** 该方向已没有更多数据 */
  complete?: boolean
  /** 反向语义：false 等价 complete，便于直接透传接口的 hasMore 字段 */
  hasMore?: boolean
}

/** 单次加载上下文（load 回调入参） */
export interface InfiniteScrollLoadContext {
  /** 本次触发的边缘 */
  edge: InfiniteScrollEdge
  /** 生效方向（reverse 时为 top） */
  direction: InfiniteScrollDirection
  /** 销毁/重置/complete 时中止；宿主应把它透传给 fetch 等可取消任务 */
  signal: AbortSignal
  /** 是否由 retry() 发起的重试 */
  retry: boolean
}

/** 边缘状态快照 */
export interface InfiniteScrollEdgeState {
  status: InfiniteScrollStatus
  /** 最近一次失败原因；非 error 状态为 null */
  error: unknown
  /** 成功完成的加载次数（reset 归零） */
  loads: number
}

/** 双边缘状态快照 */
export interface InfiniteScrollState {
  top: InfiniteScrollEdgeState
  bottom: InfiniteScrollEdgeState
}

/** 加载结束事件（onLoadEnd 第一参数） */
export type InfiniteScrollLoadEndEvent = InfiniteScrollLoadContext

/** 加载失败事件 */
export interface InfiniteScrollErrorEvent extends InfiniteScrollLoadContext {
  error: unknown
}

/** 状态变化事件 */
export interface InfiniteScrollStateChangeEvent {
  edge: InfiniteScrollEdge
  state: InfiniteScrollEdgeState
}

/** 滚动根：元素、惰性 getter 或 null（无 DOM / SSR 安全降级） */
export type InfiniteScrollRoot = Element | null | (() => Element | null)

/** 内容容器 getter（默认：滚动根自身；ScrollArea 宿主即 slotted 内容容器） */
export type InfiniteScrollContent = Element | null | (() => Element | null)

export interface InfiniteScrollOptions {
  /** 滚动根；可传 `oas-scroll-area` 宿主（自动解析 shadow viewport）或任意滚动元素 */
  root?: InfiniteScrollRoot
  /** 内容容器；默认取 root 自身（适用于 slotted 内容）。可在自定义 shadow 结构下显式指定 */
  content?: InfiniteScrollContent
  /** 触发方向，默认 bottom；非法值回退 bottom */
  direction?: InfiniteScrollDirection
  /** 距边缘阈值（px），默认 0（必须到达边缘）；负数/非法回退 0 */
  threshold?: number
  /** `top` + 初始滚到底（聊天/倒序列表）；优先于 direction */
  reverse?: boolean
  /** 锚点稳定键属性，默认 `data-key`；空字符串关闭属性键，回落 id */
  keyAttribute?: string
  /** 加载回调；返回 false / `{ complete: true }` / `{ hasMore: false }` 表示该边缘已到底 */
  load: (
    context: InfiniteScrollLoadContext,
  ) => InfiniteScrollLoadResult | boolean | void | Promise<InfiniteScrollLoadResult | boolean | void>
  onLoadStart?: (context: InfiniteScrollLoadContext) => void
  onLoadEnd?: (event: InfiniteScrollLoadEndEvent, result: InfiniteScrollLoadResult) => void
  onError?: (event: InfiniteScrollErrorEvent) => void
  onStateChange?: (event: InfiniteScrollStateChangeEvent) => void
  onComplete?: (event: { edge: InfiniteScrollEdge }) => void
}

interface EdgeRuntime {
  status: InfiniteScrollStatus
  error: unknown
  loads: number
  /** 自动触发武装：同一位置只自动请求一次，离开边缘/内容增长/重置后重新武装 */
  armed: boolean
  /** top 加载增长但锚点未补偿：停在边缘期间禁止自动续载，离开边缘/reset/显式 load 才解除 */
  blocked: boolean
  abort: AbortController | null
  /** 请求代际：reset/complete/destroy 后旧结果一律丢弃 */
  generation: number
  /** 触发时快照：用于判断本次加载是否带来内容增长（增长才允许自动续载） */
  startHeight: number
  startTop: number
}

interface Anchor {
  el: Element
  /** 稳定键值（keyAttribute 优先，无属性时回落 id） */
  key: string | null
  /** 键来源属性；null 表示按 id 查找 */
  keyAttr: string | null
  /** 补偿目标：锚点在视口坐标系中的 y */
  viewportY: number
}

const EDGE_ORDER: readonly InfiniteScrollEdge[] = ['top', 'bottom']

function makeEdge(): EdgeRuntime {
  return {
    status: 'idle',
    error: null,
    loads: 0,
    armed: true,
    blocked: false,
    abort: null,
    generation: 0,
    startHeight: 0,
    startTop: 0,
  }
}

function normalizeResult(raw: InfiniteScrollLoadResult | boolean | void): InfiniteScrollLoadResult {
  if (raw === false) return { complete: true }
  if (raw === true || raw == null) return {}
  const result = raw
  const complete = result.complete === true || result.hasMore === false
  return complete ? { ...result, complete: true } : { ...result }
}

function resolveViewport(root: Element | null): HTMLElement | null {
  if (!root || root.nodeType !== 1) return null
  const el = root as HTMLElement
  const shadow = el.shadowRoot
  if (shadow) {
    const shadowViewport =
      shadow.querySelector<HTMLElement>('[part~="viewport"]') ?? shadow.querySelector<HTMLElement>('.viewport')
    if (shadowViewport) return shadowViewport
  }
  return el
}

function resolveElement(target: InfiniteScrollContent | InfiniteScrollRoot): Element | null {
  if (typeof target === 'function') {
    try {
      return target()
    } catch {
      return null
    }
  }
  return target
}

/**
 * 无限滚动 headless 控制器。
 *
 * 不渲染任何 DOM，只消费既有滚动根（`oas-scroll-area` / 任意滚动元素）：
 * - 方向 `top` / `bottom` / `both`，双边缘各自维护 loading / error / complete；
 * - 同一边缘在途去重，不同边缘可并发；到底后不再自动加载；`bottom` 判定含 1px
 *   亚像素容差（小数 scrollTop / 亚像素取整几何），`top` 保持 `scrollTop <= threshold`；
 * - `load()` 省略 edge 时：`direction=top` / `reverse` 取 top，否则（含 `both`）取 bottom；
 *   已进入 error 的边缘必须显式 `retry(edge)`（或 `retry()` 重试全部 error 边缘）；
 * - `load()` / `retry()` / `complete()` / `reset()` / `destroy()` 全命令面；
 * - `top` 加载前记录锚点，结果落地后按锚点视口位移补偿 scrollTop（keyed 替换可重查），
 *   ResizeObserver / 资源 load 捕获继续处理异步撑高，直到读者真实滚动接管；
 * - 无 DOM / SSR 下 attach 失败、update no-op，手动 load 仍可用。
 */
export class InfiniteScrollController {
  private readonly options: InfiniteScrollOptions
  private readonly directionValue: InfiniteScrollDirection
  private readonly thresholdValue: number
  private readonly keyAttr: string | null
  private readonly edges: Record<InfiniteScrollEdge, EdgeRuntime> = {
    top: makeEdge(),
    bottom: makeEdge(),
  }

  private rootOption: InfiniteScrollRoot
  private root: Element | null = null
  private vp: HTMLElement | null = null
  private content: Element | null = null
  private ro: ResizeObserver | null = null
  private mo: MutationObserver | null = null
  private observedAnchor: Element | null = null
  private anchor: Anchor | null = null
  /** 本次 top 锚定是否已产生实际 scrollTop 位移（MutationObserver 先于结果落地补偿也算） */
  private anchorMoved = false
  private attached = false
  private disposed = false
  private updating = false
  private framePending = false
  private frameID = 0
  private expectedScrollTop: number | null = null
  private lastHeight = -1
  private userScrolled = false
  /** detach 收尾守卫：清环境后 emitState 期间宿主调 update/attach 不得重新起请求 */
  private detaching = false
  /** root 为惰性 getter 时 update 才需要重解析（静态元素 attach 时解析一次即可） */
  private rootIsDynamic = false
  /** 仅在锚点活跃期间观察的异步资源（图片/视频）；releaseAnchor 时全部解除，防跨加载泄漏 */
  private readonly observedResources = new Set<Element>()

  constructor(options: InfiniteScrollOptions) {
    if (typeof options?.load !== 'function') {
      throw new TypeError('[oas-ui] createInfiniteScroll 需要 load 回调')
    }
    this.options = options
    const requested = options.direction
    this.directionValue = options.reverse ? 'top' : requested === 'top' || requested === 'both' ? requested : 'bottom'
    const threshold = Number(options.threshold)
    this.thresholdValue = Number.isFinite(threshold) && threshold > 0 ? threshold : 0
    this.keyAttr = options.keyAttribute === '' ? null : (options.keyAttribute ?? 'data-key')
    this.rootOption = options.root ?? null
    this.rootIsDynamic = typeof this.rootOption === 'function'
  }

  /** 生效方向（reverse 时恒为 top） */
  get direction(): InfiniteScrollDirection {
    return this.directionValue
  }

  /** 当前双边缘状态快照（值拷贝，可安全留档比较） */
  get state(): InfiniteScrollState {
    return {
      top: this.snapshot('top'),
      bottom: this.snapshot('bottom'),
    }
  }

  /** 已解析的滚动视口（ScrollArea 为 shadow 内 viewport；未 attach 为 null） */
  get viewport(): HTMLElement | null {
    return this.vp
  }

  /** 是否已销毁（destroy 后所有命令 no-op） */
  get destroyed(): boolean {
    return this.disposed
  }

  /**
   * 绑定/重绑滚动根。传 `null` 等价 detach；省略时沿用构造参数（含惰性 getter）。
   * 返回是否解析到可用滚动视口。
   */
  attach(root?: InfiniteScrollRoot): boolean {
    if (this.disposed || this.detaching) return false
    if (root !== undefined) {
      this.rootOption = root
      this.rootIsDynamic = typeof root === 'function'
    }
    const nextRoot = this.currentRoot()
    const nextViewport = resolveViewport(nextRoot)
    if (!nextViewport) {
      // 等价 detach：中止在途请求并解绑，防止旧视口结果写回
      if (this.attached) this.detach()
      this.root = null
      this.content = null
      return false
    }
    const switching = nextViewport !== this.vp
    const firstAttach = !this.attached || switching
    if (switching) {
      // 换视口视为一次重挂：中止旧视口在途请求，避免锚点/结果跨视口串写
      if (this.attached) this.detach()
      else this.unbind()
      this.root = nextRoot
      this.vp = nextViewport
      this.content = this.resolveContent(nextRoot, nextViewport)
      this.bind()
    } else {
      this.root = nextRoot
    }
    this.attached = true
    if (!switching) {
      // 同一 viewport 重挂：content getter 仍可能指向宿主替换的新容器。
      // 直接赋值会让 refreshContent 因「引用未变」提前返回、旧容器的监听/观察残留，
      // 这里统一走 refreshContent 重绑内容侧 load/error、ResizeObserver 与 MutationObserver。
      this.refreshContent()
    }
    if (firstAttach) {
      this.userScrolled = false
      if (this.options.reverse) {
        this.pinToBottom()
        this.scheduleFrame(() => {
          if (!this.userScrolled && !this.disposed && this.attached) this.pinToBottom()
        })
      }
    }
    this.update()
    return true
  }

  /**
   * 解绑滚动根并中止在途请求；保留 complete/error 状态（可重新 attach）。
   *
   * 语义注记：`top` 未补偿封锁（blocked）**不跨 detach 保持**——detach 是一次环境重置
   * （视口/内容/锚点/预期 scrollTop 全部清空），若保留封锁，重挂后停在顶部会一直无法
   * 自动续载，只能靠离开边缘或显式 `load()` 恢复。重挂后仍由 `armed=false` 阻止立刻发起
   * 请求，封锁只在本次加载周期内生效。
   */
  detach(): void {
    if (this.disposed || this.detaching) return
    // 先拆环境再 abort/emitState：onStateChange(idle) 内宿主调 update/attach 时
    // 已无 viewport 且 detaching 守卫生效，不能在本方法内部新起请求。
    this.detaching = true
    try {
      this.releaseAnchor()
      this.unbind()
      this.attached = false
      this.root = null
      this.vp = null
      this.content = null
      this.expectedScrollTop = null
      this.lastHeight = -1
      for (const edge of EDGE_ORDER) {
        const rt = this.edges[edge]
        this.abortEdge(edge)
        // blocked 属于「本次加载周期内同几何位置的防循环」，不跨 detach 保持（见 JSDoc）
        rt.blocked = false
        if (rt.status === 'loading') {
          rt.status = 'idle'
          // 被 detach 中止的加载不算「同一位置已请求过」：重新 attach 后必须能再次自动加载
          // （error/complete 语义不受影响，仍保持不复活——只有 loading 被复位）
          rt.armed = true
          this.emitState(edge)
        }
      }
    } finally {
      this.detaching = false
    }
  }

  /**
   * 按当前滚动几何评估双边缘；滚动/尺寸/内容变化由内部监听自动调用，
   * 宿主也可在数据或布局变化后主动调用（幂等）。
   */
  update(): void {
    if (this.disposed || this.updating || this.detaching) return
    if (this.attached) {
      // 静态 root 只需刷新 content getter（列表容器可能被宿主替换）；惰性 root 仍需整体重定向
      if (this.rootIsDynamic) this.retarget()
      else this.refreshContent()
    }
    const vp = this.vp
    if (!vp) return
    this.updating = true
    try {
      if (this.anchor) this.applyAnchor()
      this.noteGeometry()
      for (const edge of EDGE_ORDER) {
        if (!this.enabled(edge)) continue
        const rt = this.edges[edge]
        const atEdge = this.isAtEdge(edge)
        if (!atEdge) {
          rt.armed = true
          rt.blocked = false
        }
        if (atEdge && !rt.blocked && rt.armed) void this.startLoad(edge, false, false)
      }
    } finally {
      this.updating = false
    }
  }

  /**
   * 显式加载指定边缘（忽略武装/距边缘判定，但仍遵守 loading/error/complete 锁）。
   * 返回是否实际发起并成功完成；被锁跳过或失败均为 false（失败另发 onError）。
   */
  load(edge: InfiniteScrollEdge = this.directionValue === 'top' ? 'top' : 'bottom'): Promise<boolean> {
    return this.startLoad(edge, false, true)
  }

  /**
   * 重试 error 边缘；省略 edge 时重试所有 error 边缘。
   * 无 error 或全部重试失败为 false；任一成功为 true。
   */
  async retry(edge?: InfiniteScrollEdge): Promise<boolean> {
    const targets = (edge ? [edge] : EDGE_ORDER).filter((target) => this.edges[target].status === 'error')
    if (targets.length === 0) return false
    const results = await Promise.all(targets.map((target) => this.startLoad(target, true, true)))
    return results.some(Boolean)
  }

  /** 标记边缘已到底（省略 edge 时双边缘）；重复调用幂等，中止在途请求 */
  complete(edge?: InfiniteScrollEdge): void {
    if (this.disposed) return
    for (const target of edge ? [edge] : EDGE_ORDER) {
      const rt = this.edges[target]
      if (rt.status === 'complete') continue
      this.abortEdge(target)
      rt.status = 'complete'
      rt.error = null
      rt.armed = false
      if (target === 'top') this.releaseAnchor()
      this.emitState(target)
      // onStateChange 内 reset/destroy 已改写状态：不再补发 complete
      if (this.disposed || rt.status !== 'complete') continue
      this.safe(() => this.options.onComplete?.({ edge: target }))
    }
  }

  /** 清空双边缘状态并重新武装（不自动发起加载；下一次 update/滚动再评估） */
  reset(): void {
    if (this.disposed) return
    for (const edge of EDGE_ORDER) {
      this.abortEdge(edge)
      const rt = this.edges[edge]
      rt.status = 'idle'
      rt.error = null
      rt.loads = 0
      rt.armed = true
      rt.blocked = false
      rt.startHeight = 0
      rt.startTop = 0
    }
    this.releaseAnchor()
    this.expectedScrollTop = null
    this.lastHeight = -1
    this.userScrolled = false
    for (const edge of EDGE_ORDER) this.emitState(edge)
  }

  /** 销毁：中止在途请求、解绑监听、静默回到 idle；此后所有命令 no-op */
  destroy(): void {
    if (this.disposed) return
    // 先置销毁位：abort 同步派发宿主 listener 时，任何重入命令都立即 no-op
    this.disposed = true
    for (const edge of EDGE_ORDER) {
      this.abortEdge(edge)
      const rt = this.edges[edge]
      rt.status = 'idle'
      rt.error = null
      rt.loads = 0
      rt.armed = false
      rt.blocked = false
      rt.startHeight = 0
      rt.startTop = 0
    }
    this.releaseAnchor()
    this.unbind()
    if (this.frameID) {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.frameID)
      this.frameID = 0
    }
    this.framePending = false
    this.attached = false
    this.root = null
    this.vp = null
    this.content = null
    this.expectedScrollTop = null
  }

  /**
   * 指定边缘当前是否处于阈值内（无 viewport 时 false）。
   *
   * 底部额外留 1px 容差：浏览器在亚像素/取整几何（小数 scrollTop 等）下，
   * 「已滚到底」的实测值常残留 0.1~0.9px，精确 `<= 0` 会让用户永远到不了底。
   * 顶部保持 `scrollTop <= threshold` 语义不变（顶部 0 是精确可表达的边界）。
   */
  isAtEdge(edge: InfiniteScrollEdge): boolean {
    const vp = this.vp
    if (!vp) return false
    if (edge === 'top') return vp.scrollTop <= this.thresholdValue
    return vp.scrollHeight - vp.scrollTop - vp.clientHeight <= this.thresholdValue + 1
  }

  // ---------- 加载状态机 ----------

  private async startLoad(edge: InfiniteScrollEdge, retry: boolean, explicit: boolean): Promise<boolean> {
    if (this.disposed || this.detaching) return false
    const rt = this.edges[edge]
    if (rt.status === 'loading' || rt.status === 'complete') return false
    if (rt.status === 'error' && !retry) return false
    if (!explicit) {
      if (!this.enabled(edge) || rt.blocked || !rt.armed || !this.isAtEdge(edge)) return false
    } else {
      // 显式 load/retry 代表宿主主动意图：解除「未补偿待离开边缘」的自动续载封锁
      rt.blocked = false
    }

    this.abortEdge(edge)
    rt.generation += 1
    // 代际必须在任何同步回调前捕获：回调内 reset/complete 会推进代际，事后捕获会误判为仍有效
    const generation = rt.generation
    rt.status = 'loading'
    rt.error = null
    rt.armed = false
    rt.startHeight = this.vp?.scrollHeight ?? 0
    rt.startTop = this.vp?.scrollTop ?? 0

    const controller = new AbortController()
    rt.abort = controller
    const context: InfiniteScrollLoadContext = {
      edge,
      direction: this.directionValue,
      signal: controller.signal,
      retry,
    }
    if (edge === 'top') this.captureAnchor()

    this.emitState(edge)
    // onStateChange 内可能 destroy/reset/complete
    if (this.disposed || rt.generation !== generation) return false
    this.safe(() => this.options.onLoadStart?.(context))
    // onLoadStart 内可能 destroy/reset/complete：绝不发起已失效请求
    if (this.disposed || rt.generation !== generation) return false
    let raw: InfiniteScrollLoadResult | boolean | void
    try {
      raw = await this.options.load(context)
    } catch (error) {
      if (this.disposed || rt.generation !== generation) return false
      rt.status = 'error'
      rt.error = error
      rt.armed = false
      rt.abort = null
      if (edge === 'top') {
        // 失败前若内容已落地位移（宿主部分渲染后抛错），先补偿再释放，避免读者被上移的内容顶走
        this.applyAnchor()
        this.releaseAnchor()
      }
      this.emitState(edge)
      if (this.disposed || rt.generation !== generation) return false
      this.safe(() => this.options.onError?.({ ...context, error }))
      return false
    }

    // destroy/reset/complete 已推进代际：迟到结果不写状态、不回调
    if (this.disposed || rt.generation !== generation) return false

    const result = normalizeResult(raw)
    const grew = this.vp ? this.vp.scrollHeight > rt.startHeight + 0.5 : false
    // top 结果落地先补偿锚点，再落状态：onStateChange/onLoadEnd 内宿主调 update 时
    // armed/blocked 已是最终值，不能先放行自动续载。
    const anchorFound = edge === 'top' ? this.applyAnchor() : false
    // 纵深防御：top 增长但锚点没产生实际位移（容器替换/节点丢失）时停止自动续载，
    // 避免 scrollTop 仍停在 0 时 frame/mutation 反复触发同一位置加载。
    // anchorMoved 覆盖「MutationObserver 已先于 load 结果补偿」的路径。
    const topCompensated = anchorFound && this.anchorMoved
    const autoContinue = grew && (edge !== 'top' || topCompensated)
    rt.loads += 1
    rt.abort = null
    if (result.complete === true) {
      rt.status = 'complete'
      rt.error = null
      rt.armed = false
      if (edge === 'top') rt.blocked = false
    } else {
      rt.status = 'idle'
      rt.error = null
      // 有内容增长且（bottom 或 top 已补偿）才允许自动续载；空结果/未补偿不循环
      rt.armed = autoContinue
      if (edge === 'top') rt.blocked = grew && !topCompensated
    }
    this.emitState(edge)
    if (this.disposed || rt.generation !== generation) return true
    this.safe(() => this.options.onLoadEnd?.(context, result))
    // onLoadEnd 内 destroy/reset：不再发 complete、不再排下一轮
    if (this.disposed || rt.generation !== generation) return true

    if (result.complete === true) {
      this.safe(() => this.options.onComplete?.({ edge }))
    } else if (autoContinue) {
      this.scheduleFrame(() => this.update())
    }
    return true
  }

  private abortEdge(edge: InfiniteScrollEdge): void {
    const rt = this.edges[edge]
    rt.generation += 1
    if (rt.abort) {
      try {
        rt.abort.abort()
      } catch {
        /* 宿主自定义 AbortController 实现可能抛错：忽略 */
      }
      rt.abort = null
    }
  }

  private emitState(edge: InfiniteScrollEdge): void {
    if (this.disposed) return
    const state = this.snapshot(edge)
    this.safe(() => this.options.onStateChange?.({ edge, state }))
  }

  private snapshot(edge: InfiniteScrollEdge): InfiniteScrollEdgeState {
    const rt = this.edges[edge]
    return { status: rt.status, error: rt.error, loads: rt.loads }
  }

  private enabled(edge: InfiniteScrollEdge): boolean {
    return this.directionValue === 'both' || this.directionValue === edge
  }

  // ---------- 滚动根 / 内容容器 ----------

  private currentRoot(): Element | null {
    return resolveElement(this.rootOption)
  }

  private resolveContent(root: Element | null, viewport: HTMLElement): Element | null {
    const custom = resolveElement(this.options.content ?? null)
    if (custom) return custom
    if (root && root !== viewport) return root
    return viewport
  }

  /** attach 后 root getter 可能换元素（升级/重挂）：视口变化时重新绑定 */
  private retarget(): void {
    const root = this.currentRoot()
    const viewport = resolveViewport(root)
    if (!viewport) {
      this.detach()
      return
    }
    if (viewport === this.vp) {
      this.root = root
      // 同一 viewport 下 content getter 仍可能返回被宿主替换的新容器：必须重绑内容监听
      this.refreshContent()
      return
    }
    this.detach()
    this.root = root
    this.vp = viewport
    this.content = this.resolveContent(root, viewport)
    this.bind()
    this.attached = true
  }

  /**
   * 刷新 content 容器（静态 root 也适用）。
   *
   * 宿主可能用「同一滚动根 + 重新创建的列表容器」重渲染：root 不变但
   * `content: () => listEl` 已指向新节点。只换 content 并重绑内容侧监听，
   * 保留 anchor 记录，供 applyAnchor 在新容器里按 key 重查后继续补偿。
   */
  private refreshContent(): void {
    const vp = this.vp
    if (!this.attached || !vp) return
    const next = this.resolveContent(this.root, vp)
    if (next === this.content) return
    const prev = this.content
    if (prev && prev !== vp) {
      prev.removeEventListener('load', this.handleResource, true)
      prev.removeEventListener('error', this.handleResource, true)
      if (this.ro) {
        try {
          this.ro.unobserve(prev)
        } catch {
          /* 忽略 */
        }
      }
    }
    this.mo?.disconnect()
    this.mo = null
    // 旧容器的锚点/资源观察随容器替换失效；anchor 记录保留，稍后按 key 在新容器重查
    this.clearObservations()
    this.content = next
    this.bindContent()
    if (this.anchor && next?.contains(this.anchor.el)) this.observeWithAnchor(this.anchor.el)
  }

  /** 只绑定内容侧监听/观察（viewport 滚动监听由 bind 负责，refreshContent 不重复添加） */
  private bindContent(): void {
    const vp = this.vp
    const content = this.content
    if (!vp || !content) return
    if (content !== vp) {
      content.addEventListener('load', this.handleResource, true)
      content.addEventListener('error', this.handleResource, true)
      if (this.ro) {
        try {
          this.ro.observe(content)
        } catch {
          /* 忽略 */
        }
      }
    }
    if (typeof MutationObserver !== 'undefined') {
      this.mo?.disconnect()
      this.mo = new MutationObserver(this.handleMutation)
      this.mo.observe(content, { childList: true })
      // content 可能是嵌套 wrapper：同时观察 root 的直接子节点变化，容器被整体替换时也能刷新
      if (this.root && this.root !== content) this.mo.observe(this.root, { childList: true })
    }
  }

  private bind(): void {
    const vp = this.vp
    if (!vp) return
    vp.addEventListener('scroll', this.handleScroll, { passive: true })
    // 资源 load/error 不冒泡：必须 capture 才能从滚动根捕获内部图片/视频撑高
    vp.addEventListener('load', this.handleResource, true)
    vp.addEventListener('error', this.handleResource, true)
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(this.handleResize)
      this.ro.observe(vp)
    }
    this.bindContent()
    if (this.anchor) this.observeWithAnchor(this.anchor.el)
  }

  private unbind(): void {
    const vp = this.vp
    if (vp) {
      vp.removeEventListener('scroll', this.handleScroll)
      vp.removeEventListener('load', this.handleResource, true)
      vp.removeEventListener('error', this.handleResource, true)
    }
    if (this.content && this.content !== vp) {
      this.content.removeEventListener('load', this.handleResource, true)
      this.content.removeEventListener('error', this.handleResource, true)
    }
    this.ro?.disconnect()
    this.ro = null
    this.mo?.disconnect()
    this.mo = null
    this.observedAnchor = null
    this.observedResources.clear()
  }

  /** 仅解除锚点/资源观察，保留 anchor 记录（容器替换后仍可按 key 重查） */
  private clearObservations(): void {
    if (this.ro) {
      for (const el of this.observedResources) {
        try {
          this.ro.unobserve(el)
        } catch {
          /* 忽略 */
        }
      }
    }
    this.observedResources.clear()
    this.observedAnchor = null
  }

  /** 观察锚点/锚点侧的异步资源；统一记账，releaseAnchor 时一次性解除 */
  private observeWithAnchor(el: Element): void {
    if (!this.ro) return
    try {
      this.ro.observe(el)
      this.observedResources.add(el)
    } catch {
      /* 不可观察：忽略 */
    }
  }

  // ---------- 滚动 / 尺寸 / 变化通道 ----------

  private handleScroll = (): void => {
    const vp = this.vp
    if (this.disposed || !vp) return
    const top = vp.scrollTop
    // 程序补偿 scrollTop 的异步 scroll 回声不是读者意图：不释放保位锚
    if (this.expectedScrollTop !== null && Math.abs(top - this.expectedScrollTop) <= 1) {
      this.expectedScrollTop = null
    } else {
      this.expectedScrollTop = null
      this.userScrolled = true
      this.releaseAnchor()
    }
    this.update()
  }

  private handleResize = (): void => {
    if (this.disposed) return
    if (this.anchor) this.applyAnchor()
    this.update()
  }

  private handleMutation = (): void => {
    if (this.disposed) return
    if (this.anchor) this.applyAnchor()
    this.update()
  }

  private handleResource = (event: Event): void => {
    if (this.disposed) return
    const target = event.target as Node | null
    // 异步资源（图片/视频）尺寸变化只在锚点活跃时纳入观察：无锚点时观察没有消费者，
    // 且资源集合会跨加载累积（releaseAnchor 统一解除，见 observedResources）
    if (target && this.anchor && target.nodeType === 1) {
      this.observeWithAnchor(target as Element)
    }
    if (this.anchor) this.applyAnchor()
    this.update()
  }

  private noteGeometry(): void {
    const vp = this.vp
    if (!vp) return
    const height = vp.scrollHeight
    if (this.lastHeight >= 0 && height > this.lastHeight + 0.5) {
      // 内容增长（含异步撑高）：已从边缘离开后重新武装，允许下一次进入阈值时报一次；
      // 但 top 未补偿封锁必须保持，否则容器替换后 scrollTop=0 会被增长反复解除武装而循环
      for (const edge of EDGE_ORDER) {
        const rt = this.edges[edge]
        if (rt.status === 'idle' && !rt.blocked) rt.armed = true
      }
    }
    this.lastHeight = height
  }

  private pinToBottom(): void {
    const vp = this.vp
    if (!vp) return
    this.writeScrollTop(vp, vp.scrollHeight)
  }

  private writeScrollTop(vp: HTMLElement, top: number): void {
    const max = Math.max(0, vp.scrollHeight - vp.clientHeight)
    const next = Math.max(0, Math.min(max, top))
    if (Math.abs(vp.scrollTop - next) < 0.5) return
    vp.scrollTop = next
    this.expectedScrollTop = vp.scrollTop
  }

  // ---------- prepend 锚定 ----------

  /**
   * 顶部加载前捕获首个可见内容项的视口位置作为保位锚。
   * key 属性优先（宿主重渲染替换节点后仍能找回同一行），无 key 回落 id / 元素引用。
   */
  private captureAnchor(): void {
    // 每次顶部加载都重新选锚：先解除上一轮观察并按最新 content getter 重绑容器
    this.releaseAnchor()
    this.refreshContent()
    const vp = this.vp
    const content = this.content
    if (!vp || !content) return
    const vpTop = vp.getBoundingClientRect().top
    const children = Array.from(content.children)
    const anchorEl = children.find((child) => child.getBoundingClientRect().bottom > vpTop + 0.5) ?? children[0] ?? null
    if (!anchorEl) {
      this.releaseAnchor()
      return
    }
    const attr = this.keyAttr
    const rawKey = attr ? anchorEl.getAttribute(attr) : null
    const keyFromAttr = rawKey !== null && rawKey !== ''
    const id = anchorEl.id || null
    const anchor: Anchor = {
      el: anchorEl,
      key: keyFromAttr ? rawKey : id,
      keyAttr: keyFromAttr ? attr : null,
      viewportY: anchorEl.getBoundingClientRect().top - vpTop,
    }
    this.anchor = anchor
    this.anchorMoved = false
    this.observedAnchor = anchorEl
    this.observeWithAnchor(anchorEl)
  }

  /**
   * 顶部结果落地后按锚点视口位移补偿 scrollTop（keyed 替换后按 key 重查）。
   * 返回锚点是否在当前容器内找到；实际位移累计到 `anchorMoved`（供续载防御判定）。
   */
  private applyAnchor(): boolean {
    // 结果落地与 update 时都先按最新 content getter 刷新容器（静态 root 同样适用）
    this.refreshContent()
    const vp = this.vp
    const anchor = this.anchor
    if (!vp || !anchor) return false
    const el = this.findAnchor(anchor)
    if (!el || !el.isConnected) {
      this.releaseAnchor()
      return false
    }
    if (el !== anchor.el) {
      // keyed 重查命中新节点：观察目标同步迁移，旧节点在 releaseAnchor 前不再持有观察
      if (this.ro) {
        try {
          this.ro.unobserve(anchor.el)
        } catch {
          /* 忽略 */
        }
      }
      this.observedResources.delete(anchor.el)
      anchor.el = el
      this.observeWithAnchor(el)
    }
    const before = vp.scrollTop
    const drift = el.getBoundingClientRect().top - vp.getBoundingClientRect().top - anchor.viewportY
    // 0.5px 死区：亚像素读数不反复写 scrollTop
    if (Math.abs(drift) > 0.5) this.writeScrollTop(vp, vp.scrollTop + drift)
    if (Math.abs(vp.scrollTop - before) > 0.5) this.anchorMoved = true
    return true
  }

  private findAnchor(anchor: Anchor): Element | null {
    const content = this.content
    const inContent = (el: Element): boolean => !content || content.contains(el)
    // 快路径：原节点仍在当前容器且 key 未变（未重渲染的常见情况）直接复用，避免全量扫描
    if (anchor.el.isConnected && inContent(anchor.el)) {
      const attr = anchor.keyAttr
      const value = attr ? anchor.el.getAttribute(attr) : anchor.el.id
      if (anchor.key === null || value === anchor.key) return anchor.el
    }
    if (content && anchor.key !== null) {
      const attr = anchor.keyAttr
      // 不用属性选择器拼串：自定义 keyAttribute 不需要转义，避免非法属性名让 querySelector 抛错
      for (const node of content.querySelectorAll('*')) {
        const value = attr ? node.getAttribute(attr) : node.id
        if (value === anchor.key) return node
      }
    }
    return anchor.el.isConnected && inContent(anchor.el) ? anchor.el : null
  }

  /** 释放保位锚：一并解除锚点与资源观察（资源集合仅属于当前这次锚定，不能跨加载残留） */
  private releaseAnchor(): void {
    this.clearObservations()
    this.anchor = null
    this.anchorMoved = false
  }

  // ---------- 调度 / 回调隔离 ----------

  private scheduleFrame(run: () => void): void {
    if (this.framePending || this.disposed) return
    this.framePending = true
    const execute = (): void => {
      this.framePending = false
      this.frameID = 0
      if (!this.disposed) run()
    }
    if (typeof requestAnimationFrame === 'function') {
      this.frameID = requestAnimationFrame(execute)
    } else {
      queueMicrotask(execute)
    }
  }

  private safe(run: (() => void) | undefined): void {
    if (!run) return
    try {
      run()
    } catch (error) {
      devWarn('[oas-ui] infinite scroll 回调抛错（已隔离，状态机继续）', error)
    }
  }
}

/** 便捷工厂（与类构造等价） */
export function createInfiniteScroll(options: InfiniteScrollOptions): InfiniteScrollController {
  return new InfiniteScrollController(options)
}
