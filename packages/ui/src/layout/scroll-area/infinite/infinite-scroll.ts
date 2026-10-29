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
 * - 同一边缘在途去重，不同边缘可并发；到底后不再自动加载；
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
  private attached = false
  private disposed = false
  private updating = false
  private framePending = false
  private frameID = 0
  private expectedScrollTop: number | null = null
  private lastHeight = -1
  private userScrolled = false

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
    if (this.disposed) return false
    if (root !== undefined) this.rootOption = root
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
      this.content = this.resolveContent(nextRoot, nextViewport)
    }
    this.attached = true
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

  /** 解绑滚动根并中止在途请求；保留 complete/error 状态（可重新 attach） */
  detach(): void {
    if (this.disposed) return
    for (const edge of EDGE_ORDER) {
      const rt = this.edges[edge]
      this.abortEdge(edge)
      if (rt.status === 'loading') {
        rt.status = 'idle'
        this.emitState(edge)
      }
    }
    this.releaseAnchor()
    this.unbind()
    this.attached = false
    this.root = null
    this.vp = null
    this.content = null
    this.expectedScrollTop = null
    this.lastHeight = -1
  }

  /**
   * 按当前滚动几何评估双边缘；滚动/尺寸/内容变化由内部监听自动调用，
   * 宿主也可在数据或布局变化后主动调用（幂等）。
   */
  update(): void {
    if (this.disposed || this.updating) return
    if (this.attached) this.retarget()
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
        if (!atEdge) rt.armed = true
        if (atEdge && rt.armed) void this.startLoad(edge, false, false)
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

  /** 指定边缘当前是否处于阈值内（无 viewport 时 false） */
  isAtEdge(edge: InfiniteScrollEdge): boolean {
    const vp = this.vp
    if (!vp) return false
    if (edge === 'top') return vp.scrollTop <= this.thresholdValue
    return vp.scrollHeight - vp.scrollTop - vp.clientHeight <= this.thresholdValue
  }

  // ---------- 加载状态机 ----------

  private async startLoad(edge: InfiniteScrollEdge, retry: boolean, explicit: boolean): Promise<boolean> {
    if (this.disposed) return false
    const rt = this.edges[edge]
    if (rt.status === 'loading' || rt.status === 'complete') return false
    if (rt.status === 'error' && !retry) return false
    if (!explicit) {
      if (!this.enabled(edge) || !rt.armed || !this.isAtEdge(edge)) return false
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
      if (edge === 'top') this.releaseAnchor()
      this.emitState(edge)
      if (this.disposed || rt.generation !== generation) return false
      this.safe(() => this.options.onError?.({ ...context, error }))
      return false
    }

    // destroy/reset/complete 已推进代际：迟到结果不写状态、不回调
    if (this.disposed || rt.generation !== generation) return false

    const result = normalizeResult(raw)
    const grew = this.vp ? this.vp.scrollHeight > rt.startHeight + 0.5 : false
    rt.loads += 1
    rt.abort = null
    if (result.complete === true) {
      rt.status = 'complete'
      rt.error = null
      rt.armed = false
    } else {
      rt.status = 'idle'
      rt.error = null
      // 有内容增长才允许自动续载（阈值内继续填）；无增长时保持解除武装，避免空结果死循环
      rt.armed = grew
    }
    this.emitState(edge)
    if (this.disposed || rt.generation !== generation) return true
    this.safe(() => this.options.onLoadEnd?.(context, result))
    // onLoadEnd 内 destroy/reset：不再写锚点、不再发 complete、不再排下一轮
    if (this.disposed || rt.generation !== generation) return true

    if (edge === 'top') this.applyAnchor()
    if (result.complete === true) {
      this.safe(() => this.options.onComplete?.({ edge }))
    } else if (grew) {
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
      this.content = this.resolveContent(root, viewport)
      return
    }
    this.detach()
    this.root = root
    this.vp = viewport
    this.content = this.resolveContent(root, viewport)
    this.bind()
    this.attached = true
  }

  private bind(): void {
    const vp = this.vp
    if (!vp) return
    vp.addEventListener('scroll', this.handleScroll, { passive: true })
    // 资源 load/error 不冒泡：必须 capture 才能从滚动根捕获内部图片/视频撑高
    vp.addEventListener('load', this.handleResource, true)
    vp.addEventListener('error', this.handleResource, true)
    if (this.content && this.content !== vp) {
      this.content.addEventListener('load', this.handleResource, true)
      this.content.addEventListener('error', this.handleResource, true)
    }
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(this.handleResize)
      this.ro.observe(vp)
      if (this.content && this.content !== vp) this.ro.observe(this.content)
      if (this.anchor) {
        this.ro.observe(this.anchor.el)
        this.observedAnchor = this.anchor.el
      }
    }
    if (typeof MutationObserver !== 'undefined' && this.content) {
      this.mo = new MutationObserver(this.handleMutation)
      this.mo.observe(this.content, { childList: true })
    }
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
    if (target && this.ro && target.nodeType === 1) {
      // 异步资源（图片/视频）尺寸变化：锚点活跃时纳入观察，资源撑高后由 RO 继续补偿
      try {
        this.ro.observe(target as Element)
      } catch {
        /* 已销毁或不可观察：忽略 */
      }
    }
    if (this.anchor) this.applyAnchor()
    this.update()
  }

  private noteGeometry(): void {
    const vp = this.vp
    if (!vp) return
    const height = vp.scrollHeight
    if (this.lastHeight >= 0 && height > this.lastHeight + 0.5) {
      // 内容增长（含异步撑高）：已从边缘离开后重新武装，允许下一次进入阈值时报一次
      for (const edge of EDGE_ORDER) {
        if (this.edges[edge].status === 'idle') this.edges[edge].armed = true
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
    if (this.observedAnchor && this.ro && this.observedAnchor !== anchorEl) {
      try {
        this.ro.unobserve(this.observedAnchor)
      } catch {
        /* 忽略 */
      }
    }
    this.anchor = anchor
    if (this.ro) {
      try {
        this.ro.observe(anchorEl)
        this.observedAnchor = anchorEl
      } catch {
        /* 忽略 */
      }
    }
  }

  /** 顶部结果落地后按锚点视口位移补偿 scrollTop（keyed 替换后按 key 重查） */
  private applyAnchor(): void {
    const vp = this.vp
    const anchor = this.anchor
    if (!vp || !anchor) return
    const el = this.findAnchor(anchor)
    if (!el || !el.isConnected) {
      this.releaseAnchor()
      return
    }
    anchor.el = el
    const drift = el.getBoundingClientRect().top - vp.getBoundingClientRect().top - anchor.viewportY
    // 0.5px 死区：亚像素读数不反复写 scrollTop
    if (Math.abs(drift) > 0.5) this.writeScrollTop(vp, vp.scrollTop + drift)
  }

  private findAnchor(anchor: Anchor): Element | null {
    const content = this.content
    if (content && anchor.key !== null) {
      const attr = anchor.keyAttr
      // 不用属性选择器拼串：自定义 keyAttribute 不需要转义，避免非法属性名让 querySelector 抛错
      for (const node of content.querySelectorAll('*')) {
        const value = attr ? node.getAttribute(attr) : node.id
        if (value === anchor.key) return node
      }
    }
    return anchor.el.isConnected ? anchor.el : null
  }

  private releaseAnchor(): void {
    if (this.observedAnchor && this.ro) {
      try {
        this.ro.unobserve(this.observedAnchor)
      } catch {
        /* 忽略 */
      }
    }
    this.observedAnchor = null
    this.anchor = null
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
