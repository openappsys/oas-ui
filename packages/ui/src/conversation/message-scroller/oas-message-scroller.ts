import { OASElement } from '@oas-ui/core'

/** 打开位置：start=顶部；end=底部（缺省；非法回退 end）。last-anchor 随 B 批锚定提供 */
export type ScrollerDefaultPosition = 'start' | 'end'

/** oas-scroll-state 事件 detail（边缘可滚状态） */
export interface MessageScrollerState {
  atBottom: boolean
  atTop: boolean
  canScrollStart: boolean
  canScrollEnd: boolean
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
   scrollHeight 失真），错误换性能不值；降耗随 B 批虚拟化一起做 */
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

/**
 * oas-message-scroller —— 会话滚动容器（滚动意图模型，不拥有消息）。
 *
 * 单组件属性分模式（本批 = A：钉底/跳底/near-bottom 检测/prepend 保位基础；
 * 轮次锚定/可见性追踪/首屏防跳留 B 批）：
 * - 默认 AI 式：`auto-scroll` 在场时仅当读者在底部（near-bottom ≤ `edge-threshold`）才跟随新内容；
 * - IM 式：`pin-to-bottom` 在场则始终钉底（上翻也被拉回——典型客服/IM 持续接收场景）。
 *
 * 属性：
 * - `auto-scroll`：布尔在场——底部跟随流式增长（默认关：不扰读者）
 * - `pin-to-bottom`：布尔在场——始终钉底
 * - `default-position`：`start` | `end`（默认 `end`；非法回退 end）
 * - `edge-threshold`：底部判定阈值 px（默认 8）
 * - `preserve-scroll-on-prepend`：布尔在场（默认关即 true？否——**缺省即开启**，
 *   显式 `="false"` 关闭；顶部插入历史时补偿 scrollTop，阅读位置不跳）
 * - `label`：viewport 可读名称覆盖（缺省走 locale「消息列表」；读入后从宿主移除——原生全局属性吸收惯例）
 *
 * 方法：`scrollToEnd(opts?)` / `scrollToStart(opts?)`（opts.behavior 透传 scrollIntoView 行为）
 *
 * 事件：`oas-scroll-state`（detail `{ atBottom, atTop, canScrollStart, canScrollEnd }`；
 * 首帧（初始定位后）广播一次初始态——宿主监听晚于 upgrade 也能收到；此后跨过判定线时派发）
 *
 * 状态反射：`data-scrollable`（`"start"` / `"end"` / `"start end"` 空格分隔，无可滚为空）
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
    return ['auto-scroll', 'pin-to-bottom', 'default-position', 'edge-threshold', 'label', 'preserve-scroll-on-prepend']
  }

  /** 上次对外广播的滚动状态（变化才派发 oas-scroll-state） */
  private lastState: MessageScrollerState | null = null
  /** 事件广播开关：首连静默期（render/update 同步段）不派发——宿主监听晚于 upgrade 会丢；
   *  初始态由首帧 rAF（applyInitialPosition 末尾）开闸统一广播一次 */
  private broadcastEnabled = false
  /** 读者意图：底部跟随态（auto-scroll 模式下由 scroll 位置驱动） */
  private following = true
  /** 内容变化合批帧句柄 */
  private contentRaf = 0
  /** slotchange 时刻的几何快照（prepend 保位基准） */
  private pendingChange: {
    oldHeight: number
    oldTop: number
    firstNodeChanged: boolean
    /** slotchange 前是否已有首节点（区分「首次内容装载」与「后续顶部插入历史」） */
    hadPrevFirst: boolean
    prevFirst: Node | null
  } | null = null
  /** 首帧默认定位是否已应用（只应用一次） */
  private initialPositioned = false
  /** 读者是否已真实滚动过（首帧初始定位的让位守卫） */
  private userScrolled = false
  /** 内容/视口尺寸观察（流式文本增长无 slotchange 信号时仍能跟随；视口 resize 刷新边缘态） */
  private ro: ResizeObserver | null = null

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
    const slot = this.shadow.querySelector('slot')
    slot?.addEventListener('slotchange', this.handleSlotChange)
    this.observeResize()
  }

  private get viewport(): HTMLElement | null {
    return this.shadow.querySelector<HTMLElement>('.viewport')
  }

  private get content(): HTMLElement | null {
    return this.shadow.querySelector<HTMLElement>('[part="content"]')
  }

  /**
   * 尺寸观察：content（内容增长——流式文本无 slotchange 信号）+ viewport（视口 resize——
   * 窗口缩放/外层容器变高变矮会改变可滚状态与跳底按钮显隐，content 高度不变时不触发
   * content 观察，必须单独观察 viewport）。observe 幂等（同目标重复 observe 无害）。
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
    // lastState 为空时下一次 syncScrollState 会补发一次初始态
    this.broadcastEnabled = true
    this.syncScrollState()
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
    this.syncScrollState()
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

  /** 读取当前状态并同步对外可见面：data-scrollable / 跳底按钮 / oas-scroll-state（变化才发） */
  private syncScrollState(): void {
    const m = this.metrics()
    const state: MessageScrollerState = {
      atBottom: m.atBottom,
      atTop: m.atTop,
      canScrollStart: m.canScrollStart,
      canScrollEnd: m.canScrollEnd,
    }
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
    // auto-scroll 模式：读者主动滚到底 → 恢复跟随；离底 → 释放跟随（意图优先）
    if (this.hasAttr('auto-scroll')) this.following = state.atBottom
    const dirs: string[] = []
    if (state.canScrollStart) dirs.push('start')
    if (state.canScrollEnd) dirs.push('end')
    this.setAttribute('data-scrollable', dirs.join(' '))
    const jump = this.shadow.querySelector<HTMLElement>('[part="button"]')
    if (jump) {
      jump.hidden = !(state.canScrollEnd && !state.atBottom)
      jump.setAttribute('aria-label', this.t('messageScroller.scrollToBottom'))
    }
    // 稳态高度记账：下一次 slotchange 的 prepend 保位以此为旧值基准
    // （slotchange 触发时 DOM 已插入、scrollHeight 已是新值，现场读不到旧值）
    this.lastHeight = this.viewport?.scrollHeight ?? 0
  }

  private handleScroll = (): void => {
    // 读者意图守卫：任何真实滚动（含惯性）都视为「读者已接管」——首帧初始定位让位
    this.userScrolled = true
    this.syncScrollState()
  }

  private handleJumpClick = (): void => {
    // 跳底按钮走瞬时（IM 跳底通行手势）；宿主可用 scrollToEnd({behavior:'smooth'}) 自定义
    this.scrollToEnd()
  }

  // ---------- 内容变化（新增 / prepend） ----------

  private handleSlotChange = (): void => {
    const slot = this.shadow.querySelector<HTMLSlotElement>('slot')
    const first = slot?.assignedNodes()[0] ?? null
    const vp = this.viewport
    this.pendingChange = {
      // 旧高度用稳态记账（slotchange 时 DOM 已插入，现场 scrollHeight 已是新值）
      oldHeight: this.lastHeight,
      oldTop: vp?.scrollTop ?? 0,
      firstNodeChanged: first !== this.prevFirstNode,
      hadPrevFirst: this.prevFirstNode !== null,
      prevFirst: first,
    }
    this.prevFirstNode = first
    this.scheduleContentChange(true)
  }

  /** 上一次 slot 首节点（prepend 判定基准） */
  private prevFirstNode: Node | null = null
  /** 上一次稳态 scrollHeight（prepend 保位的旧值基准） */
  private lastHeight = 0

  /** rAF 合批：等一拍（DOM 就位 + 布局更新）后再裁决跟随/保位 */
  private scheduleContentChange(fromSlot: boolean): void {
    if (this.contentRaf) return
    this.contentRaf = requestAnimationFrame(() => {
      this.contentRaf = 0
      if (!this.isConnected) return
      this.applyContentChange(fromSlot)
    })
  }

  private applyContentChange(_fromSlot: boolean): void {
    const vp = this.viewport
    if (!vp) return
    const pending = this.pendingChange
    this.pendingChange = null

    // 1) prepend 保位基础：顶部插入历史（首节点变化）时按高度差补偿 scrollTop。
    //    判别用 hadPrevFirst 而非 oldTop>0——首次内容装载（prevFirstNode 为空）不补偿（否则
    //    会把 scrollTop 顶到整段高度跳到底）；而「已装载后滚到顶再插入历史」虽 scrollTop=0
    //    也必须补偿，否则阅读位置被新内容顶走，违背「阅读位置不跳」契约。
    if (pending && pending.firstNodeChanged && pending.hadPrevFirst && this.preserveOnPrepend()) {
      const delta = vp.scrollHeight - pending.oldHeight
      if (delta > 0) vp.scrollTop = pending.oldTop + delta
    }

    // 2) 钉底裁决（后发覆盖保位）：IM 始终钉底 > AI 底部跟随。
    //    目标值写 scrollHeight-clientHeight（浏览器 clamp 等价；happy-dom 不 clamp，写显式值跨环境一致）
    const bottom = Math.max(0, vp.scrollHeight - vp.clientHeight)
    if (this.hasAttr('pin-to-bottom')) {
      vp.scrollTop = bottom
    } else if (this.hasAttr('auto-scroll') && this.following) {
      vp.scrollTop = bottom
    }
    this.lastHeight = vp.scrollHeight
    this.syncScrollState()
  }

  /** preserve-scroll-on-prepend：缺省开启（保位是安全默认）；显式 "false" 关闭 */
  private preserveOnPrepend(): boolean {
    return this.getAttr('preserve-scroll-on-prepend') !== 'false'
  }

  // ---------- 首帧定位与命令式 API ----------

  /** 首帧默认定位：连接后等一拍（子元素就位 + 布局完成）应用 default-position；
   *  应用前读者已滚动（userScrolled）则放弃滚动——「绝不逆着读者意图移动」；
   *  无论是否滚动，rAF 末尾统一广播一次初始态（宿主监听此时已挂上——upgrade 期间
   *  同步派发 oas-scroll-state 会早于宿主 addEventListener 而丢失） */
  private applyInitialPosition(): void {
    if (this.initialPositioned) return
    this.initialPositioned = true
    requestAnimationFrame(() => {
      if (!this.isConnected) return
      if (!this.userScrolled) {
        const pos = this.getAttr('default-position')
        if (pos === 'start') this.scrollToStart({ behavior: 'instant' })
        else this.scrollToEnd({ behavior: 'instant' }) // 非法值回退 end
      }
      // 开闸广播：此刻宿主监听已挂上（upgrade 同步段早于宏任务/帧回调），
      // lastState 仍为空 → 首帧必广播一次「定位后」的初始态
      this.broadcastEnabled = true
      this.syncScrollState()
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

  /** 命令式滚动内核：smooth 走 scrollTo 动画；瞬时走 scrollTop 直接赋值（测试/降级确定性） */
  private scrollVertically(edge: 'start' | 'end', opts?: { behavior?: ScrollBehavior }): void {
    const vp = this.viewport
    if (!vp) return
    const top = edge === 'end' ? Math.max(0, vp.scrollHeight - vp.clientHeight) : 0
    if (opts?.behavior === 'smooth' && typeof vp.scrollTo === 'function') {
      vp.scrollTo({ top, behavior: 'smooth' })
    } else {
      vp.scrollTop = top
    }
    this.syncScrollState()
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
