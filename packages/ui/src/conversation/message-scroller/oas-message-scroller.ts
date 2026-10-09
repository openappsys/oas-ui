import { OASElement } from '@oas-ui/core'

/**
 * 打开位置：start=顶部；end=底部（缺省；非法回退 end）；
 * last-anchor=最后一个轮次锚点消息（宿主标 `anchor` 属性）顶部——AI 场景「回到最后提问位置」，无锚点回退 end
 */
export type ScrollerDefaultPosition = 'start' | 'end' | 'last-anchor'

/** oas-scroll-state 事件 detail（边缘可滚状态） */
export interface MessageScrollerState {
  atBottom: boolean
  atTop: boolean
  canScrollStart: boolean
  canScrollEnd: boolean
}

/** oas-visible-change 事件 detail（可见性通道：视口内消息 + 当前轮次锚点） */
export interface MessageScrollerVisibility {
  /** 当前视口内（部分或全部可见）的消息 id，按 DOM 顺序；未声明 message-id 的行不计入 */
  visibleMessageIds: string[]
  /** 当前轮次锚点 id：最后一个视口顶附近（top ≤ edge-threshold）的 anchor 标记消息；无则 null */
  currentAnchorId: string | null
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  --oas-message-gap: var(--oas-space-4);
}
:host([hidden]) {
  display: none !important;
}
.scroller {
  position: relative;
  height: 100%;
}
.viewport {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  box-sizing: border-box;
}
/* 键盘可达：Tab 聚焦视口后方向键滚动；焦点环走 token */
.viewport:focus-visible {
  outline: var(--oas-focus-ring);
  outline-offset: -2px;
}
/* 首屏防跳：初始定位（end / last-anchor）应用前隐藏 viewport——visibility 保留布局供定位测量，
   定位与移除在同一帧完成，读者看不到「未定位帧」（闪现顶部再跳底） */
:host([data-pending-scroll]) .viewport {
  visibility: hidden;
}
.content {
  display: flex;
  flex-direction: column;
  gap: var(--oas-message-gap);
}
.content ::slotted(*) {
  scroll-margin: var(--oas-space-2);
}
/* 性能注记：长会话降耗（离屏行跳过渲染）不在本批——实测 slotted 元素上
   content-visibility:auto 会卡在 contain-intrinsic-size 占位高度不展开（引擎行为，
   scrollHeight 失真），错误换性能不值；降耗随虚拟化一起做 */
/* 跳底按钮：悬浮右下，离开底部且可向下滚时出现 */
.jump {
  position: absolute;
  inset-inline-end: var(--oas-space-3);
  bottom: var(--oas-space-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--oas-color-border);
  border-radius: 50%;
  background: var(--oas-color-bg);
  color: var(--oas-color-text-secondary);
  box-shadow: var(--oas-shadow-sm);
  cursor: pointer;
  transition: background var(--oas-transition-fast) var(--oas-ease-out), color var(--oas-transition-fast) var(--oas-ease-out);
}
.jump:hover {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
.jump:focus-visible {
  outline: var(--oas-focus-ring);
  outline-offset: 1px;
}
.jump[hidden] {
  display: none;
}
`

interface ScrollMetrics {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
  atBottom: boolean
  atTop: boolean
  canScrollStart: boolean
  canScrollEnd: boolean
}

/** prepend 异步保位锚：锁定「插入前首节点」补偿后的视口位置，异步资源撑高上方内容时按位移补偿 */
interface PrependAnchor {
  /** 锚元素（插入前首节点引用） */
  el: Element
  /** stable message-id（宿主声明；锚行被替换后按 id 重查优先） */
  id: string | null
  /** 补偿结算时刻锚元素在视口坐标系中的 y（保位目标） */
  viewportY: number
}

/** 轮次锚定跟随模式锁：following 保持期间一次性定型，避免「贴底跟随中锚点穿越顶部窗口」误切 */
type TurnMode = 'anchor' | 'bottom'

/**
 * oas-message-scroller —— 会话滚动容器（滚动意图模型，不拥有消息）。
 *
 * 单组件属性分模式：
 * - 默认 AI 式：`auto-scroll` 在场时仅当读者在底部（near-bottom ≤ `edge-threshold`）才跟随新内容；
 * - IM 式：`pin-to-bottom` 在场则始终钉底（上翻也被拉回——典型客服/IM 持续接收场景）；
 * - 轮次锚定：`turn-anchor` 在场把「一次提问+回答」作为锚定单元——跟随态把最后 `anchor`
 *   标记的轮次锚点钉在视口顶（`prev-peek` px 露出上一条语境），回答在锚下方流入；
 *   读者在底部则延续贴底跟随，上翻历史即静止（接管优先）。
 *
 * 属性：
 * - `auto-scroll`：布尔在场——底部跟随流式增长（默认关：不扰读者）
 * - `pin-to-bottom`：布尔在场——始终钉底
 * - `default-position`：`start` | `end`（默认）| `last-anchor`（非法回退 end；last-anchor 无锚点回退 end）
 * - `edge-threshold`：底部判定阈值 px（默认 8）
 * - `preserve-scroll-on-prepend`：缺省开启，显式 `="false"` 关闭；顶部插入历史时精确补偿
 *   scrollTop（按插入前首节点的内容坐标位移结算——同帧 append+prepend 混合时只结算顶部
 *   插入量，底部追加不参与），且补偿后锁定保位锚：历史内图片等异步资源随后撑高上方内容时
 *   （ResizeObserver 通道）按锚点视口位移持续补偿（stable `message-id` 优先重查）
 * - `turn-anchor`：布尔在场——轮次锚定（锚点标记 = slotted 元素的 `anchor` 属性）
 * - `prev-peek`：轮次锚定对齐时锚顶上方露出的语境 px（默认 64）
 * - `track-visible`：布尔在场——开启可见性通道（`oas-visible-change` 事件 + `visibleMessageIds` /
 *   `currentAnchorId` getter）；未开启零计算（pay-for-use，长会话不付逐行 rect 代价）
 * - `label`：viewport 可读名称覆盖（缺省走 locale「消息列表」；读入后从宿主移除——原生全局属性吸收惯例）
 *
 * 协作标记（宿主写在 slotted 行上，scroller 只读）：
 * - `anchor`：轮次锚点消息（一次提问+回答的边界起点）
 * - `message-id`：stable 消息 id（保位重查 / scrollToMessage 定位）
 *
 * 方法：`scrollToEnd(opts?)` / `scrollToStart(opts?)` / `scrollToMessage(id, opts?)`（返回是否命中）
 *
 * 事件：`oas-scroll-state`（detail `{ atBottom, atTop, canScrollStart, canScrollEnd }`；
 * 首帧（初始定位后）广播一次初始态——宿主监听晚于 upgrade 也能收到；此后跨过判定线时派发）；
 * `oas-visible-change`（`track-visible` 开启时；detail `{ visibleMessageIds, currentAnchorId }`，
 * 可见集变化才派发；供大纲/搜索定位等使用）
 *
 * 可见性 getter：`visibleMessageIds: string[]`、`currentAnchorId: string | null`（按需计算，不要求
 * `track-visible`；未声明 message-id 的行不计入可见集）
 *
 * 状态反射：`data-scrollable`（`"start"` / `"end"` / `"start end"` 空格分隔，无可滚为空）；
 * `data-pending-scroll`（首屏防跳——初始定位应用前在场，viewport visibility:hidden 保布局，
 * 定位/读者让位后移除；仅 `end`/`last-anchor` 需要，`start` 天然定位不设）
 *
 * 插槽：默认（消息行）；`button`（自定义跳底按钮内容——替换内置箭头图形，显隐仍由组件裁决，
 * 点击走内置 scrollToEnd；宿主要完全接管时监听该按钮即可）
 *
 * 部件：`scroller` / `viewport` / `content` / `button`
 *
 * ARIA：viewport `role=region` + 可读名称 + tabIndex=0（键盘可滚）；content `role=log`
 * + `aria-relevant=additions`（只播报新增行，流式逐 token 不播报）。
 */
export class OASMessageScroller extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'auto-scroll',
      'pin-to-bottom',
      'default-position',
      'edge-threshold',
      'label',
      'preserve-scroll-on-prepend',
      'turn-anchor',
      'prev-peek',
      'track-visible',
    ]
  }

  /** 上次对外广播的滚动状态（变化才派发 oas-scroll-state） */
  private lastState: MessageScrollerState | null = null
  /** 事件广播开关：首连静默期（render/update 同步段）不派发——宿主监听晚于 upgrade 会丢；
   *  初始态由首帧 rAF（applyInitialPosition 末尾）开闸统一广播一次 */
  private broadcastEnabled = false
  /** 读者意图：底部跟随态（auto-scroll / turn-anchor 模式下由滚动位置驱动） */
  private following = true
  /** following 上一拍快照（false→true 转换时重置轮次模式锁——重新定型） */
  private prevFollowing = false
  /** 轮次锚定跟随模式锁（null=未定型） */
  private turnMode: TurnMode | null = null
  /** 内容变化合批帧句柄 */
  private contentRaf = 0
  /** slotchange 时刻的几何快照（prepend 保位基准） */
  private pendingChange: {
    oldHeight: number
    oldTop: number
    firstNodeChanged: boolean
    /** slotchange 前是否已有首节点（区分「首次内容装载」与「后续顶部插入历史」） */
    hadPrevFirst: boolean
  } | null = null
  /** 本合批帧内是否发生过 slotchange（结构性插入）——slotchange/RO 双通道合并判定 */
  private pendingFromSlot = false
  /** 本合批帧内是否发生过 RO 回调（尺寸变化）——RO 通道不被 rAF 去重吞掉 */
  private pendingFromRo = false
  /** 上一次 slot 首元素（firstNodeChanged 判定基准；空白文本节点不算首） */
  private prevFirstNode: Element | null = null
  /** 稳态首元素记账（混合插入结算的位移基准：slotchange 时 DOM 已插入，插入前首元素只能靠稳态记账） */
  private lastFirstEl: Element | null = null
  /** 稳态首元素的内容坐标 y（contentYOf——滚动不变量，scroll 事件无需刷新） */
  private lastFirstY = 0
  /** 上一次稳态 scrollHeight（保位记账） */
  private lastHeight = 0
  /** prepend 异步保位锚（null=无锚） */
  private prependAnchor: PrependAnchor | null = null
  /** 程序滚动回声抑制：程序写 scrollTop 后的首次 scroll 事件是回声，不得视为读者意图 */
  private echoPending = false
  private expectedScrollTop = 0
  /** 上次 scroll 事件见过的 scrollTop（位移 delta 计算；-1=尚未见过任何事件） */
  private lastSeenScrollTop = -1
  /** 首帧默认定位是否已应用（只应用一次） */
  private initialPositioned = false
  /** 读者是否已真实滚动过（首帧初始定位的让位守卫） */
  private userScrolled = false
  /** 内容/视口尺寸观察（流式文本增长无 slotchange 信号时仍能跟随；视口 resize 刷新边缘态；
   *  也承担异步保位锚的重对齐通道） */
  private ro: ResizeObserver | null = null
  /** 默认 slot（slotted 行查询缓存） */
  private slotNode: HTMLSlotElement | null = null
  /** 上次对外广播的可见性快照（变化才派发 oas-visible-change） */
  private lastVisible: MessageScrollerVisibility | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="scroller" part="scroller">
        <div class="viewport" part="viewport" role="region" tabindex="0">
          <div class="content" part="content" role="log" aria-relevant="additions"><slot></slot></div>
        </div>
        <button type="button" class="jump" part="button" hidden><slot name="button"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none"><path d="M8 3 V13 M4 9 L8 13 L12 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></slot></button>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用；幂等可重入） */
  private bind(): void {
    const vp = this.viewport
    vp?.addEventListener('scroll', this.handleScroll, { passive: true })
    vp?.addEventListener('scrollend', this.handleScroll)
    const jump = this.shadow.querySelector<HTMLButtonElement>('[part="button"]')
    jump?.addEventListener('click', this.handleJumpClick)
    this.slotNode = this.shadow.querySelector('slot')
    this.slotNode?.addEventListener('slotchange', this.handleSlotChange)
    this.observeResize()
  }

  private get viewport(): HTMLElement | null {
    return this.shadow.querySelector<HTMLElement>('.viewport')
  }

  private get content(): HTMLElement | null {
    return this.shadow.querySelector<HTMLElement>('[part="content"]')
  }

  /**
   * 尺寸观察：content（内容增长——流式文本无 slotchange 信号时仍能跟随 + 异步资源撑高重对齐）+
   * viewport（视口 resize——窗口缩放/外层容器变高变矮会改变可滚状态与跳底按钮显隐）。
   * observe 幂等（同目标重复 observe 无害）。
   */
  private observeResize(): void {
    const content = this.content
    const vp = this.viewport
    if (!content || !vp || typeof ResizeObserver === 'undefined') return
    if (!this.ro) {
      this.ro = new ResizeObserver(() => this.scheduleContentChange(false))
      // 断开连接统一清理（observer 级监听不随 shadow 回收，须显式 disconnect）
      this.onCleanup(() => {
        this.ro?.disconnect()
        this.ro = null
      })
    }
    this.ro.observe(content)
    this.ro.observe(vp)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（viewport 骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.viewport) return false
    this.bind()
    return true
  }

  protected override onReconnect(): void {
    // 断开重连：ResizeObserver 若被 cleanup 断开则重挂（observe 幂等）。
    // 兜底开闸：若断开发生在首帧 rAF 之前（静默期未广播），重连后补开——
    // lastState 为空时下一次 syncScrollState 会补发一次初始态；
    // 同时清理可能残留的首屏防跳（断开早于定位 rAF 时 pending 属性会滞留）
    this.broadcastEnabled = true
    this.removeAttribute('data-pending-scroll')
    this.syncScrollState()
    this.syncVisibility()
    this.observeResize()
  }

  override disconnectedCallback(): void {
    if (this.contentRaf) {
      cancelAnimationFrame(this.contentRaf)
      this.contentRaf = 0
    }
    super.disconnectedCallback()
  }

  protected override update(): void {
    // label 原生全局属性吸收：读入渲染进 viewport 后从宿主移除（幂等：缺席=缓存驱动）
    if (this.hasAttr('label')) {
      const label = this.getAttr('label')
      this.removeAttribute('label')
      const vp = this.viewport
      if (vp && label) vp.setAttribute('aria-label', label)
    }
    const vp = this.viewport
    if (vp && !vp.getAttribute('aria-label')) {
      vp.setAttribute('aria-label', this.t('messageScroller.label'))
    }
    // turn-anchor 撤除时模式锁一并作废（再开启重新定型）
    if (!this.hasAttr('turn-anchor')) this.turnMode = null
    this.syncScrollState()
    // 可见性通道：开则计算广播，关则清快照（再开时首拍必广播一次）
    if (this.hasAttr('track-visible')) this.syncVisibility()
    else this.lastVisible = null
  }

  // ---------- 几何与状态 ----------

  private metrics(): ScrollMetrics {
    const vp = this.viewport
    const threshold = this.edgeThreshold()
    const scrollTop = vp?.scrollTop ?? 0
    const scrollHeight = vp?.scrollHeight ?? 0
    const clientHeight = vp?.clientHeight ?? 0
    const atBottom = scrollHeight - clientHeight - scrollTop <= threshold
    const atTop = scrollTop <= threshold
    return {
      scrollTop,
      scrollHeight,
      clientHeight,
      atBottom,
      atTop,
      canScrollStart: scrollTop > threshold,
      canScrollEnd: scrollTop + clientHeight < scrollHeight - threshold,
    }
  }

  private edgeThreshold(): number {
    const raw = this.getAttr('edge-threshold').trim()
    if (raw === '') return 8
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : 8
  }

  /** prev-peek：轮次锚定对齐时锚顶上方露出的语境 px（默认 64；非法/负值回退 64） */
  private prevPeek(): number {
    const raw = this.getAttr('prev-peek').trim()
    if (raw === '') return 64
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : 64
  }

  // ---------- slotted 行查询（协作标记 anchor / message-id） ----------

  /** 当前 slot 分配的元素（忽略空白文本节点） */
  private slottedElements(): Element[] {
    const slot = this.slotNode
    if (!slot) return []
    return slot.assignedNodes().filter((n): n is Element => n.nodeType === Node.ELEMENT_NODE)
  }

  /** 最后一个轮次锚点（宿主标 `anchor` 属性的 slotted 行）；无则 null */
  private findLastAnchor(): Element | null {
    const els = this.slottedElements()
    for (let i = els.length - 1; i >= 0; i--) {
      const el = els[i]
      if (el?.hasAttribute('anchor')) return el
    }
    return null
  }

  /** 按 stable message-id 查行 */
  private findMessageById(id: string): Element | null {
    return this.slottedElements().find((el) => el.getAttribute('message-id') === id) ?? null
  }

  // ---------- 可见性通道（track-visible 开启时的 pay-for-use 计算） ----------

  /**
   * 计算当前可见消息与当前锚点。
   * 可见 = 行盒与视口纵向区间相交（`bottom > 0 && top < clientHeight`）。
   * 当前锚点 = 最后一个 `top ≤ edge-threshold` 的 anchor 标记行（读者阅读位置所在的轮次）。
   */
  private computeVisible(): MessageScrollerVisibility {
    const vp = this.viewport
    if (!vp) return { visibleMessageIds: [], currentAnchorId: null }
    const vpTop = vp.getBoundingClientRect().top
    const vpHeight = vp.clientHeight
    const threshold = this.edgeThreshold()
    const visibleMessageIds: string[] = []
    let currentAnchorId: string | null = null
    for (const el of this.slottedElements()) {
      const id = el.getAttribute('message-id')
      const rect = el.getBoundingClientRect()
      const top = rect.top - vpTop
      const height = rect.height || (el as HTMLElement).offsetHeight || 0
      if (id && top + height > 0 && top < vpHeight) visibleMessageIds.push(id)
      if (el.hasAttribute('anchor') && top <= threshold) currentAnchorId = id ?? currentAnchorId
    }
    return { visibleMessageIds, currentAnchorId }
  }

  /** 当前视口内消息 id 清单（原地计算，不依赖 track-visible；未声明 message-id 的行不计入） */
  get visibleMessageIds(): string[] {
    return this.computeVisible().visibleMessageIds
  }

  /** 当前轮次锚点 id（视口顶附近最后一个 anchor 标记行）；无则 null */
  get currentAnchorId(): string | null {
    return this.computeVisible().currentAnchorId
  }

  /**
   * 同步可见性通道：仅 `track-visible` 在场时计算并（变化时）派发 `oas-visible-change`。
   * 未开启时不计算、不派发（pay-for-use——长会话不付每帧逐行 rect 的代价）。
   */
  private syncVisibility(): void {
    if (!this.hasAttr('track-visible')) return
    const next = this.computeVisible()
    const prev = this.lastVisible
    const changed =
      !prev ||
      prev.currentAnchorId !== next.currentAnchorId ||
      prev.visibleMessageIds.length !== next.visibleMessageIds.length ||
      prev.visibleMessageIds.some((id, i) => id !== next.visibleMessageIds[i])
    this.lastVisible = next
    if (changed && this.broadcastEnabled) this.emit('visible-change', next)
  }

  /**
   * 元素在滚动内容坐标系中的 y（滚动不变量：rect 随滚动同步平移，差值恒定）。
   * 用于「滚到某元素顶」与「prepend 位移结算」。
   */
  private contentYOf(el: Element): number {
    const content = this.content
    if (!content) return 0
    return el.getBoundingClientRect().top - content.getBoundingClientRect().top
  }

  /** 元素在视口坐标系中的 y（随滚动变化；保位锚的「视口位置」与轮次锚定的「贴顶判定」都用它） */
  private viewportYOf(el: Element): number {
    const vp = this.viewport
    if (!vp) return 0
    return el.getBoundingClientRect().top - vp.getBoundingClientRect().top
  }

  // ---------- 程序滚动（回声抑制） ----------

  /**
   * 程序化写 scrollTop：登记期望值——后续首个 scroll 事件若与期望一致即程序滚动回声
   * （浏览器对 scrollTop 赋值异步派发 scroll），不得视为读者意图（不让位初始定位、
   * 不释放保位锚、不重判跟随态）。
   */
  private writeScrollTop(vp: HTMLElement, top: number): void {
    vp.scrollTop = Math.max(0, top)
    if (vp.scrollTop !== this.expectedScrollTop) {
      this.expectedScrollTop = vp.scrollTop
      this.echoPending = true
    }
    // 位移基准同步到写入值（回声事件的 delta=0；真实用户事件按与写入值的差计算位移）
    this.lastSeenScrollTop = vp.scrollTop
  }

  /** 读取当前状态并同步对外可见面：data-scrollable / 跳底按钮 / oas-scroll-state（变化才发）。
   *  scrollDelta：本次触发对应的滚动位移（仅 handleScroll 与显式命令滚动传入）——跟随意图
   *  只在真实位移时重判，内容增长路径（slotchange/RO 结算）不改变读者的跟随状态 */
  private syncScrollState(scrollDelta?: number): void {
    const m = this.metrics()
    const state: MessageScrollerState = {
      atBottom: m.atBottom,
      atTop: m.atTop,
      canScrollStart: m.canScrollStart,
      canScrollEnd: m.canScrollEnd,
    }
    // 跟随意图判定：仅在有真实滚动位移时重判（内容结算/零位移事件/回声不改变读者的跟随
    // 状态——原生 scroll 事件异步到达时几何可能已被「滚动之后追加的内容」更新，属过期快照）。
    // auto-scroll / turn-anchor：在底部=跟随；轮次锚定额外认「锚贴顶或处于 peek 对齐窗口」
    // （锚顶跟随中锚不在底）。读者离开两处即接管（following=false）。
    if (scrollDelta !== undefined && scrollDelta !== 0) {
      let keep = state.atBottom
      if (!keep && this.hasAttr('turn-anchor')) {
        const anchorEl = this.findLastAnchor()
        if (anchorEl) {
          const y = this.viewportYOf(anchorEl)
          const peek = this.prevPeek()
          const th = this.edgeThreshold()
          keep = Math.abs(y) <= th || Math.abs(y - peek) <= th
          // 读者手动滚进锚定窗口：跟随延续，但模式锁作废——下次裁决按当前位置重新定型
          // （否则先前的 'bottom' 锁会把读者在锚顶窗口的跟随误压成钉底）
          if (keep) this.turnMode = null
        }
      }
      this.following = keep
    }
    // following 恢复（false→true）时轮次模式锁作废——按当前位置重新定型
    if (this.following && !this.prevFollowing) this.turnMode = null
    this.prevFollowing = this.following
    // 首连静默期：只同步 DOM 反射与内部视图，不广播、不记 lastState（让首帧必广播一次）
    if (!this.broadcastEnabled) {
      this.applyScrollState(state)
      return
    }
    const changed =
      !this.lastState ||
      this.lastState.atBottom !== state.atBottom ||
      this.lastState.atTop !== state.atTop ||
      this.lastState.canScrollStart !== state.canScrollStart ||
      this.lastState.canScrollEnd !== state.canScrollEnd
    if (!changed) return
    this.lastState = state
    this.applyScrollState(state)
    this.emit('scroll-state', state)
  }

  /** 滚动状态的 DOM 反射面：跟随意图 / data-scrollable / 跳底按钮 / 保位高度记账 */
  private applyScrollState(state: MessageScrollerState): void {
    const dirs: string[] = []
    if (state.canScrollStart) dirs.push('start')
    if (state.canScrollEnd) dirs.push('end')
    this.setAttribute('data-scrollable', dirs.join(' '))
    const jump = this.shadow.querySelector<HTMLElement>('[part="button"]')
    if (jump) {
      jump.hidden = !(state.canScrollEnd && !state.atBottom)
      jump.setAttribute('aria-label', this.t('messageScroller.scrollToBottom'))
    }
    // 稳态高度记账：下一次 slotchange 的保位结算以此为旧值基准
    // （slotchange 触发时 DOM 已插入、scrollHeight 已是新值，现场读不到旧值）
    this.lastHeight = this.viewport?.scrollHeight ?? 0
  }

  private handleScroll = (): void => {
    const vp = this.viewport
    const top = vp?.scrollTop ?? 0
    // 位移追踪：原生 scroll 事件异步到达，到达时的几何可能已被「滚动之后追加的内容」更新
    // （回底后立即来新消息：事件读到离底 → 过期快照会错误释放跟随）。只有真实位移（delta≠0）
    // 才允许重判跟随意图——内容增长与零位移事件不改变读者的跟随状态
    const delta = this.lastSeenScrollTop < 0 ? 0 : top - this.lastSeenScrollTop
    this.lastSeenScrollTop = top
    // 程序滚动回声：与最近一次程序写入一致的首个 scroll 事件是赋值的异步回声，非读者意图。
    // 仍要幂等重算状态反射（值=程序写入值，重算无副作用）
    if (vp && this.echoPending && Math.abs(top - this.expectedScrollTop) <= 1) {
      this.echoPending = false
      this.syncScrollState()
      this.syncVisibility()
      return
    }
    this.echoPending = false
    // 读者意图守卫：任何真实滚动（含惯性）都视为「读者已接管」——首帧初始定位让位、
    // 释放异步保位锚（读者位置优先，不再补偿）
    this.userScrolled = true
    this.prependAnchor = null
    this.syncScrollState(delta)
    this.syncVisibility()
  }

  private handleJumpClick = (): void => {
    // 跳底按钮走瞬时（IM 跳底通行手势）；宿主可用 scrollToEnd({behavior:'smooth'}) 自定义
    this.scrollToEnd()
  }

  // ---------- 内容变化（新增 / prepend / 异步撑高） ----------

  private handleSlotChange = (): void => {
    const first = this.slottedElements()[0] ?? null
    const vp = this.viewport
    if (this.pendingChange) {
      // 同帧多次 slotchange 合批（如同帧 prepend+append 两次变异）：几何基准以首记为准
      // （oldHeight/oldTop 是插入前快照；hadPrevFirst 首记 false=首次装载不可被翻转），
      // firstNodeChanged 取或——本帧内发生过首元素变化即结算
      this.pendingChange.firstNodeChanged = this.pendingChange.firstNodeChanged || first !== this.prevFirstNode
    } else {
      this.pendingChange = {
        // 旧高度用稳态记账（slotchange 时 DOM 已插入，现场 scrollHeight 已是新值）
        oldHeight: this.lastHeight,
        oldTop: vp?.scrollTop ?? 0,
        firstNodeChanged: first !== this.prevFirstNode,
        hadPrevFirst: this.prevFirstNode !== null,
      }
    }
    this.prevFirstNode = first
    this.scheduleContentChange(true)
  }

  /** rAF 合批：等一拍（DOM 就位 + 布局更新）后再裁决跟随/保位；slotchange/RO 双通道合并 */
  private scheduleContentChange(fromSlot: boolean): void {
    if (fromSlot) this.pendingFromSlot = true
    else this.pendingFromRo = true
    if (this.contentRaf) return
    this.contentRaf = requestAnimationFrame(() => {
      this.contentRaf = 0
      if (!this.isConnected) return
      const fromSlot = this.pendingFromSlot
      const fromRo = this.pendingFromRo
      this.pendingFromSlot = false
      this.pendingFromRo = false
      this.applyContentChange(fromSlot, fromRo)
    })
  }

  private applyContentChange(fromSlot: boolean, fromRo: boolean): void {
    const vp = this.viewport
    if (!vp) return
    const pending = this.pendingChange
    this.pendingChange = null

    // 1) prepend 精确保位：顶部插入量 = 「插入前首节点」的内容坐标位移（结算基准取稳态记账
    //    lastFirstEl——slotchange 时 DOM 已插入，插入前首元素只能靠记账）。相比按 scrollHeight
    //    总差补偿，位移结算在同帧 append+prepend 混合时只结算顶部插入量（底部追加不参与补偿，
    //    不会多补把阅读位置推过头）。判别用 hadPrevFirst 而非 oldTop>0——首次内容装载不补偿
    //    （否则把 scrollTop 顶到整段高度跳底）；「已装载后滚到顶再插历史」虽 scrollTop=0 也必须补偿。
    if (pending && pending.firstNodeChanged && pending.hadPrevFirst && this.preserveOnPrepend()) {
      const prev = this.lastFirstEl
      if (prev && prev.isConnected) {
        const delta = this.contentYOf(prev) - this.lastFirstY
        if (delta > 0) {
          this.writeScrollTop(vp, pending.oldTop + delta)
          // 异步保位锚：锁定插入前首节点补偿后的视口位置。历史内图片等异步资源随后撑高
          // 上方内容时（ResizeObserver 通道，无 slotchange 信号）按锚点视口位移持续补偿
          // ——阅读位置在资源加载完成前不跳。stable message-id 优先（锚行被替换后按 id 重查）。
          this.prependAnchor = {
            el: prev,
            id: prev.getAttribute('message-id'),
            viewportY: this.viewportYOf(prev),
          }
        }
      }
    }

    // 2) RO 通道（无 slotchange 信号的尺寸变化——异步资源撑高/流式文本增长）：
    //    保位锚活跃时按锚点视口位移补偿（0.5px 死区防亚像素读数循环抖动）
    if (fromRo && this.prependAnchor) {
      const anchor = this.prependAnchor
      // 锚点重查：stable message-id 优先（宿主重建行后按 id 找回），无 id 用元素引用
      let el: Element | null = anchor.el
      if (anchor.id != null) {
        el = this.findMessageById(anchor.id) ?? (anchor.el.isConnected ? anchor.el : null)
      } else if (!anchor.el.isConnected) {
        el = null
      }
      if (!el) {
        this.prependAnchor = null
      } else {
        const drift = this.viewportYOf(el) - anchor.viewportY
        if (Math.abs(drift) > 0.5) {
          this.writeScrollTop(vp, vp.scrollTop + drift)
        }
      }
    }

    // 3) 钉底/跟随裁决（后发覆盖保位）：IM 始终钉底 > 轮次锚定 > AI 底部跟随。
    //    目标值写 scrollHeight-clientHeight（浏览器 clamp 等价；happy-dom 不 clamp，写显式值跨环境一致）
    const bottom = Math.max(0, vp.scrollHeight - vp.clientHeight)
    if (this.hasAttr('pin-to-bottom')) {
      this.writeScrollTop(vp, bottom)
      this.turnMode = null
    } else if (this.hasAttr('turn-anchor') && this.following) {
      const anchorEl = this.findLastAnchor()
      if (!anchorEl) {
        // 无锚点：回退钉底（跟随态由 following 把关；无 auto-scroll 时 following 恒真=IM 式钉底）
        this.writeScrollTop(vp, bottom)
      } else {
        // 模式锁一次性定型：锚贴顶（或已在 peek 对齐窗口）=锚顶跟随；否则贴底跟随。
        // 定型后 following 保持期间不切——贴底跟随中锚点穿越顶部窗口不会误拉回顶部。
        if (this.turnMode == null) {
          const y = this.viewportYOf(anchorEl)
          const peek = this.prevPeek()
          const th = this.edgeThreshold()
          this.turnMode = Math.abs(y) <= th || Math.abs(y - peek) <= th ? 'anchor' : 'bottom'
        }
        if (this.turnMode === 'anchor') {
          // 锚顶跟随：锚钉在视口顶 prev-peek 处（露出上一条尾部作语境），回答在锚下方流入
          this.writeScrollTop(vp, this.contentYOf(anchorEl) - this.prevPeek())
        } else {
          this.writeScrollTop(vp, bottom)
        }
      }
    } else if (this.hasAttr('auto-scroll') && this.following) {
      this.writeScrollTop(vp, bottom)
    }

    // 4) 稳态记账（下一次 slotchange / 混合结算的基准）
    const first = this.slottedElements()[0] ?? null
    this.lastFirstEl = first
    this.lastFirstY = first ? this.contentYOf(first) : 0
    this.lastHeight = vp.scrollHeight
    this.syncScrollState()
    this.syncVisibility()
  }

  /** preserve-scroll-on-prepend：缺省开启（保位是安全默认）；显式 "false" 关闭 */
  private preserveOnPrepend(): boolean {
    return this.getAttr('preserve-scroll-on-prepend') !== 'false'
  }

  // ---------- 首帧定位与命令式 API ----------

  /** 首帧默认定位：连接后等一拍（子元素就位 + 布局完成）应用 default-position；
   *  应用前读者已滚动（userScrolled）则放弃滚动——「绝不逆着读者意图移动」；
   *  无论是否滚动，rAF 末尾统一广播一次初始态（宿主监听此时已挂上——upgrade 期间
   *  同步派发 oas-scroll-state 会早于宿主 addEventListener 而丢失）。
   *  首屏防跳：end / last-anchor 需要真实定位——连接时即在宿主反射 data-pending-scroll
   *  （viewport visibility:hidden 保布局供定位测量），定位与移除同帧完成，未定位帧不闪现顶部；
   *  start 天然定位（scrollTop=0 是初始值）不设。 */
  private applyInitialPosition(): void {
    if (this.initialPositioned) return
    this.initialPositioned = true
    // 同步段读一次定「是否需要防跳」（必须连接即隐藏才有意义）；rAF 内重读定行为（保持弹性）
    if (this.getAttr('default-position') !== 'start') {
      this.setAttribute('data-pending-scroll', '')
    }
    requestAnimationFrame(() => {
      // 断开早于首帧：pending 兜底移除（防宿主残留隐藏态）
      this.removeAttribute('data-pending-scroll')
      if (!this.isConnected) return
      if (!this.userScrolled) {
        const pos = this.getAttr('default-position')
        if (pos === 'start') {
          this.scrollToStart({ behavior: 'instant' })
        } else if (pos === 'last-anchor') {
          // 无锚点回退 end
          if (!this.scrollToLastAnchor({ behavior: 'instant' })) {
            this.scrollToEnd({ behavior: 'instant' })
          }
        } else {
          this.scrollToEnd({ behavior: 'instant' }) // 非法值回退 end
        }
      }
      // 开闸广播：此刻宿主监听已挂上（upgrade 同步段早于宏任务/帧回调），
      // lastState 仍为空 → 首帧必广播一次「定位后」的初始态
      this.broadcastEnabled = true
      this.syncScrollState()
      this.syncVisibility()
    })
  }

  /**
   * 滚到底部。behavior：'auto'（默认，瞬时）/ 'instant'（瞬时）/ 'smooth'（平滑）。
   * 命令式滚动后重新同步状态（跟随态/按钮/事件）。
   */
  scrollToEnd(opts?: { behavior?: ScrollBehavior }): void {
    this.scrollVertically('end', opts)
  }

  /** 滚到顶部（参数同 scrollToEnd） */
  scrollToStart(opts?: { behavior?: ScrollBehavior }): void {
    this.scrollVertically('start', opts)
  }

  /**
   * 滚到指定 message-id 的消息行顶部。命中返回 true；id 不存在返回 false 且不滚动
   * （已挂载后缺失不重试——避免死循环）。
   */
  scrollToMessage(id: string, opts?: { behavior?: ScrollBehavior }): boolean {
    const el = this.findMessageById(id)
    if (!el) return false
    this.scrollToElementTop(el, opts)
    return true
  }

  /** 滚到最后一个轮次锚点（`anchor` 标记行）顶部；无锚点返回 false */
  private scrollToLastAnchor(opts?: { behavior?: ScrollBehavior }): boolean {
    const el = this.findLastAnchor()
    if (!el) return false
    this.scrollToElementTop(el, opts)
    return true
  }

  /** 元素顶对齐滚动内核：smooth 走 scrollTo 动画；瞬时走 scrollTop 直接赋值（测试/降级确定性） */
  private scrollToElementTop(el: Element, opts?: { behavior?: ScrollBehavior }): void {
    const vp = this.viewport
    if (!vp) return
    const top = this.contentYOf(el)
    const delta = top - vp.scrollTop
    if (opts?.behavior === 'smooth' && typeof vp.scrollTo === 'function') {
      vp.scrollTo({ top, behavior: 'smooth' })
    } else {
      this.writeScrollTop(vp, top)
    }
    this.syncScrollState(delta)
  }

  /** 命令式滚动内核：smooth 走 scrollTo 动画；瞬时走 scrollTop 直接赋值（测试/降级确定性） */
  private scrollVertically(edge: 'start' | 'end', opts?: { behavior?: ScrollBehavior }): void {
    const vp = this.viewport
    if (!vp) return
    const top = edge === 'end' ? Math.max(0, vp.scrollHeight - vp.clientHeight) : 0
    const delta = top - vp.scrollTop
    if (opts?.behavior === 'smooth' && typeof vp.scrollTo === 'function') {
      vp.scrollTo({ top, behavior: 'smooth' })
    } else {
      this.writeScrollTop(vp, top)
    }
    this.syncScrollState(delta)
  }

  override connectedCallback(): void {
    // 基类 hasRendered：首连（render 或 hydrate 之前）为 false。
    // 首连不在此同步派发 oas-scroll-state（upgrade 期间宿主监听尚未挂上会丢）——
    // 初始态广播由 applyInitialPosition 的首帧 rAF 统一发出（定位后、监听就位后）
    const firstConnect = !this.hasRendered
    super.connectedCallback()
    if (firstConnect) {
      this.applyInitialPosition()
    }
  }
}
