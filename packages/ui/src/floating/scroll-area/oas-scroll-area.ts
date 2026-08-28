import { OASElement } from '@oas-ui/core'

const MIN_THUMB = 24
const HIDE_DELAY = 800
/** 贴底容差（px）：剩余滚动距离小于等于该值判定用户停靠在底部 */
const STICK_THRESHOLD = 8

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
}
.scroll-area {
  position: relative;
  width: 100%;
  height: 100%;
}
.viewport {
  width: 100%;
  height: 100%;
  overflow: auto;
  scrollbar-width: none; /* Firefox：隐藏原生滚动条 */
}
.viewport::-webkit-scrollbar {
  display: none; /* Chromium/Safari：隐藏原生滚动条 */
}
/* 自定义滚动条：细条 + hover 变粗；auto-hide 时仅在滚动/悬停显示 */
.track {
  position: absolute;
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg-hover);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--oas-transition-base) var(--oas-ease-out),
    width var(--oas-transition-fast) var(--oas-ease-out),
    height var(--oas-transition-fast) var(--oas-ease-out);
}
.track.peek {
  opacity: 1;
  pointer-events: auto;
}
.track-v {
  top: 2px;
  right: 2px;
  bottom: 2px;
  width: 6px;
}
.track-h {
  left: 2px;
  right: 2px;
  bottom: 2px;
  height: 6px;
}
.thumb {
  position: absolute;
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-border-strong);
  cursor: pointer;
  /* 触摸拖拽：阻止浏览器把 thumb 上的手势转成滚动/缩放 */
  touch-action: none;
  transition: background var(--oas-transition-fast) var(--oas-ease-out);
}
.track-v .thumb {
  left: 0;
  right: 0;
  top: 0;
}
.track-h .thumb {
  top: 0;
  bottom: 0;
  left: 0;
}
.track:hover .thumb {
  background: var(--oas-color-text-disabled);
}
/* hover 变粗：纵向轨道加宽、横向轨道变高（thumb 随轨道尺寸变化） */
.track-v:hover {
  width: 10px;
}
.track-h:hover {
  height: 10px;
}
.track-v:focus-visible,
.track-h:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* scroll-shadow：滚动边缘阴影（CSS-only，同 modal .body 实现）——
   上下 bg 覆盖层随内容滚动（local）、到边缘时遮住径向阴影；径向阴影固定在视口边缘（scroll） */
:host([scroll-shadow]) .viewport {
  background-color: var(--oas-color-bg);
  background-image:
    linear-gradient(var(--oas-color-bg) 30%, transparent),
    linear-gradient(transparent, var(--oas-color-bg) 70%),
    radial-gradient(farthest-side at 50% 0, rgba(0, 0, 0, 0.12), transparent),
    radial-gradient(farthest-side at 50% 100%, rgba(0, 0, 0, 0.12), transparent);
  background-repeat: no-repeat;
  background-size:
    100% 24px,
    100% 24px,
    100% 12px,
    100% 12px;
  background-attachment: local, local, scroll, scroll;
}
`

/**
 * oas-scroll-area —— 自定义滚动条容器。
 *
 * 属性（kebab-case）：
 * - `height`/`width`：视口固定尺寸（px），不设置时随内容自然撑开
 * - `auto-hide`：滚动条仅在滚动/悬停时显示，超时自动隐藏
 * - `scroll-shadow`：滚动边缘阴影（CSS-only，同 modal），滚动到边缘时阴影渐隐提示
 * - `stick-to-bottom`：新内容追加时若当前停靠在底部（距底 ≤8px）自动滚到底，上翻阅读不打断
 * - `end-distance`：`oas-end-reached` 触发距离（px，默认 0）——距底/右边缘 N px 内即算到底
 *
 * 事件（bubbles + composed）：
 * - `oas-scroll`：`{ scrollTop, scrollLeft }`，rAF 节流
 * - `oas-end-reached`：`{ direction: 'bottom' | 'right' }`，滚动到容器底部/横向右边缘时派发；
 *   去抖：离开边缘后再次回到边缘才可重复触发
 *
 * 方法（编程滚动，委托视口）：
 * - `scrollTo(options | x, y)`：滚动到指定位置
 * - `scrollToTop(options?)` / `scrollToBottom(options?)`：滚到顶/底（默认平滑）
 * - `scrollIntoView(selectorOrEl, options?)`：容器内元素滚进视口（透传 block/inline）
 *
 * 交互：thumb 可鼠标/触摸拖拽（pointerdown→move 按比例滚动）；仅横向可滚时
 * 纵向滚轮自动转译为横向滚动（原生浏览器不认纵向滚轮的横向溢出）。
 * RTL：`dir="rtl"` 宿主下横向 `scrollLeft` 为负值区间 `[-max, 0]`，
 * 滚轮转译/thumb 拖拽/thumb 位置均按该语义适配。
 */
export class OASScrollArea extends OASElement {
  static override get observedAttributes(): string[] {
    return ['height', 'width', 'auto-hide', 'scroll-shadow', 'stick-to-bottom', 'end-distance']
  }

  private viewport: HTMLElement | null = null
  private vTrack: HTMLElement | null = null
  private vThumb: HTMLElement | null = null
  private hTrack: HTMLElement | null = null
  private hThumb: HTMLElement | null = null
  private raf = 0
  private hideTimer = 0
  private resizeObserver: ResizeObserver | null = null
  /** 水合首帧的布局写入是否已延迟登记（抑制直至 rAF 校正完成，含 RO 首回调等同期写入） */
  private layoutRafScheduled = false
  private hydratedFirstFrameApplied = false
  /** thumb 拖拽状态：pointerdown 起点指针坐标 + 起始滚动值，null 表示未在拖拽 */
  private dragState: { axis: 'v' | 'h'; startPointer: number; startScroll: number } | null = null
  private prevUserSelect = ''
  /** 贴底状态：用户是否停靠在底部（滚动事件实时维护，追加内容时据此决定是否自动滚到底） */
  private stickToBottom = true
  /** 内容变化观察器（stick-to-bottom 追加自动贴底） */
  private stickObserver: MutationObserver | null = null
  /** end-reached 是否已派发（去抖：需先离开底部区域才可再次触发） */
  private endReachedFired = false

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="scroll-area">
        <div class="viewport" part="viewport" tabindex="0">
          <slot></slot>
        </div>
        <div class="track track-v" part="track-v" aria-hidden="true">
          <div class="thumb" part="thumb-v"></div>
        </div>
        <div class="track track-h" part="track-h" aria-hidden="true">
          <div class="thumb" part="thumb-h"></div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定滚动/悬停监听 + 尺寸观察（render 与水合路径共用） */
  private bind(): void {
    this.viewport = this.shadow.querySelector('.viewport')
    this.vTrack = this.shadow.querySelector('.track-v')
    this.vThumb = this.shadow.querySelector('[part="thumb-v"]')
    this.hTrack = this.shadow.querySelector('.track-h')
    this.hThumb = this.shadow.querySelector('[part="thumb-h"]')
    const wrap = this.shadow.querySelector('.scroll-area')
    this.viewport?.addEventListener('scroll', this.handleScrollEvt, { passive: true })
    // 滚轮接管：仅横向可滚时把纵向滚轮增量转译到横向（见 handleWheelEvt）
    this.viewport?.addEventListener('wheel', this.handleWheelEvt, { passive: false })
    wrap?.addEventListener('pointerenter', this.peek)
    wrap?.addEventListener('pointerleave', this.scheduleHide)
    this.vThumb?.addEventListener('pointerdown', (e: PointerEvent) => this.startThumbDrag('v', e))
    this.hThumb?.addEventListener('pointerdown', (e: PointerEvent) => this.startThumbDrag('h', e))
    this.onCleanup(() => {
      if (this.raf) cancelAnimationFrame(this.raf)
      this.raf = 0
      if (this.hideTimer) window.clearTimeout(this.hideTimer)
      this.hideTimer = 0
      this.resizeObserver?.disconnect()
      this.resizeObserver = null
      // 断开时若仍处于拖拽，移除全局监听并还原文本选择
      window.removeEventListener('pointermove', this.handleDragMove)
      window.removeEventListener('pointerup', this.endThumbDrag)
      window.removeEventListener('pointercancel', this.endThumbDrag)
      document.body.style.userSelect = this.prevUserSelect
      this.dragState = null
    })
    // 内容/容器尺寸变化时重算滚动条（内容增删后即时生效）；走 update() 统一入口，
    // 水合首帧时 RO 首回调同样被延迟抑制（避免第一帧提前写滚动条）
    if (typeof ResizeObserver !== 'undefined' && wrap) {
      this.resizeObserver = new ResizeObserver(() => this.update())
      this.resizeObserver.observe(wrap)
    }
    // stick-to-bottom：观察宿主 light DOM 内容变化（追加/删除/文本变更），
    // 贴底时自动滚到新底部；是否贴底由滚动事件实时维护（见 handleScrollEvt）
    if (typeof MutationObserver !== 'undefined') {
      this.stickObserver = new MutationObserver(this.handleContentMutation)
      this.stickObserver.observe(this, { childList: true, subtree: true, characterData: true })
      this.onCleanup(() => {
        this.stickObserver?.disconnect()
        this.stickObserver = null
      })
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（viewport 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.viewport')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // DSD 水合首帧：滚动条可见性/尺寸写入延迟到首帧后（快照首帧与 hydrate 后一致，第二帧校正）。
    // 纯 CSR 或水合后的后续 update 一律同步写入（行为不变）。
    if (this.wasHydrated() && !this.hydratedFirstFrameApplied) {
      this.scheduleHydratedSync()
      return
    }
    this.syncSize()
    this.syncThumbs()
    // 贴底初始态：内容已就绪且贴底时滚到底（首次连接/属性变更；追加场景由 MutationObserver 接管）
    this.syncStick()
  }

  /** 水合首帧：滚动条写入统一延迟到 rAF 校正；期间（含 rAF 前其他 update/RO 回调）一律抑制 */
  private scheduleHydratedSync(): void {
    if (this.layoutRafScheduled) return
    this.layoutRafScheduled = true
    const raf = requestAnimationFrame(() => {
      this.hydratedFirstFrameApplied = true
      this.syncSize()
      this.syncThumbs()
      this.syncStick()
    })
    this.onCleanup(() => cancelAnimationFrame(raf))
  }

  private autoHide(): boolean {
    return this.hasAttr('auto-hide')
  }

  private px(attr: string): string {
    const raw = this.getAttr(attr, '').trim()
    if (!raw) return ''
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? `${n}px` : ''
  }

  private syncSize(): void {
    const vp = this.viewport
    if (!vp) return
    vp.style.height = this.px('height')
    vp.style.width = this.px('width')
  }

  private syncThumbs(): void {
    const vp = this.viewport
    if (!vp) return
    const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } = vp

    const vOverflow = scrollHeight > clientHeight
    this.vTrack?.classList.toggle('visible', vOverflow)
    if (vOverflow && this.vThumb) {
      const thumbH = Math.max(MIN_THUMB, clientHeight * (clientHeight / scrollHeight))
      const maxScroll = scrollHeight - clientHeight
      const maxTop = clientHeight - thumbH
      const top = maxScroll > 0 ? maxTop * (scrollTop / maxScroll) : 0
      this.vThumb.style.height = `${thumbH}px`
      this.vThumb.style.transform = `translateY(${top}px)`
    }

    const hOverflow = scrollWidth > clientWidth
    this.hTrack?.classList.toggle('visible', hOverflow)
    if (hOverflow && this.hThumb) {
      const thumbW = Math.max(MIN_THUMB, clientWidth * (clientWidth / scrollWidth))
      const maxScroll = scrollWidth - clientWidth
      const maxLeft = clientWidth - thumbW
      // RTL（Chromium/Firefox）：scrollLeft 为负值区间 [-maxScroll, 0]，按绝对值换算位置
      const left = maxScroll > 0 ? maxLeft * (Math.abs(scrollLeft) / maxScroll) : 0
      this.hThumb.style.width = `${thumbW}px`
      this.hThumb.style.transform = `translateX(${left}px)`
    }

    // 非 auto-hide：溢出时滚动条常显（内容收缩回未溢出时清理）
    if (!this.autoHide()) {
      this.vTrack?.classList.toggle('peek', vOverflow)
      this.hTrack?.classList.toggle('peek', hOverflow)
    }
  }

  private peek = (): void => {
    if (!this.autoHide()) return
    this.vTrack?.classList.add('peek')
    this.hTrack?.classList.add('peek')
    this.scheduleHide()
  }

  private scheduleHide = (): void => {
    if (!this.autoHide()) return
    if (this.dragState) return
    if (this.hideTimer) window.clearTimeout(this.hideTimer)
    this.hideTimer = window.setTimeout(() => {
      this.hideTimer = 0
      this.vTrack?.classList.remove('peek')
      this.hTrack?.classList.remove('peek')
    }, HIDE_DELAY)
  }

  private handleScrollEvt = (): void => {
    // 贴底状态实时维护（滚动事件触发时立即读取，不等待 rAF）
    if (this.hasAttr('stick-to-bottom')) this.stickToBottom = this.isStuck()
    if (this.raf) return
    this.raf = requestAnimationFrame(() => {
      this.raf = 0
      this.syncThumbs()
      this.peek()
      this.checkEndReached()
      const vp = this.viewport
      this.emit('scroll', {
        scrollTop: vp ? vp.scrollTop : 0,
        scrollLeft: vp ? vp.scrollLeft : 0,
      })
    })
  }

  /**
   * 滚轮接管：仅当「纵向不可滚、横向可滚」时，把纵向滚轮增量转译到横向——
   * 原生浏览器对纵向滚轮只会滚动纵向轴，横向仅溢出时用户滚轮"滚不动"。
   * 纵向可滚/双向可滚/已在滚动边缘时一律不拦截，交给原生或链式传给页面。
   * RTL：横向 scrollLeft 为负值区间 [-max, 0]，前进方向与 LTR 相反（delta 取反）。
   */
  private handleWheelEvt = (e: WheelEvent): void => {
    const vp = this.viewport
    if (!vp) return
    const { scrollHeight, scrollWidth, clientHeight, clientWidth } = vp
    const maxX = scrollWidth - clientWidth
    const maxY = scrollHeight - clientHeight
    if (maxY > 0 || maxX <= 0) return
    const total = e.deltaX + e.deltaY
    if (total === 0) return
    const rtl = this.isRtl()
    const min = rtl ? -maxX : 0
    const max = rtl ? 0 : maxX
    const delta = rtl ? -total : total
    const canMove = delta > 0 ? vp.scrollLeft < max : vp.scrollLeft > min
    if (!canMove) return
    e.preventDefault()
    vp.scrollLeft = Math.max(min, Math.min(max, vp.scrollLeft + delta))
  }

  /** 开始拖拽 thumb：记录起点指针坐标与起始滚动值，全局监听 move/up，期间禁文本选择 */
  private startThumbDrag = (axis: 'v' | 'h', e: PointerEvent): void => {
    if (e.button !== 0) return
    const vp = this.viewport
    const track = axis === 'v' ? this.vTrack : this.hTrack
    const thumb = axis === 'v' ? this.vThumb : this.hThumb
    if (!vp || !track || !thumb) return
    e.preventDefault()
    this.dragState = {
      axis,
      startPointer: axis === 'v' ? e.clientY : e.clientX,
      startScroll: axis === 'v' ? vp.scrollTop : vp.scrollLeft,
    }
    this.prevUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', this.handleDragMove)
    window.addEventListener('pointerup', this.endThumbDrag)
    window.addEventListener('pointercancel', this.endThumbDrag)
  }

  /** 拖拽移动：指针位移按「轨道余量 / 滚动余量」比例换算成 scrollTop/scrollLeft 增量 */
  private handleDragMove = (e: PointerEvent): void => {
    const d = this.dragState
    const vp = this.viewport
    if (!d || !vp) return
    const track = d.axis === 'v' ? this.vTrack : this.hTrack
    const thumb = d.axis === 'v' ? this.vThumb : this.hThumb
    if (!track || !thumb) return
    const trackSize = d.axis === 'v' ? track.clientHeight : track.clientWidth
    const thumbSize = d.axis === 'v' ? thumb.clientHeight : thumb.clientWidth
    const travel = trackSize - thumbSize
    if (travel <= 0) return
    const maxScroll =
      d.axis === 'v' ? vp.scrollHeight - vp.clientHeight : vp.scrollWidth - vp.clientWidth
    if (maxScroll <= 0) return
    const pointer = d.axis === 'v' ? e.clientY : e.clientX
    const delta = ((pointer - d.startPointer) / travel) * maxScroll
    const target = d.startScroll + (d.axis === 'h' && this.isRtl() ? -delta : delta)
    if (d.axis === 'v') {
      vp.scrollTop = Math.max(0, Math.min(maxScroll, target))
    } else {
      // RTL：滚动区间为 [-maxScroll, 0]
      const min = this.isRtl() ? -maxScroll : 0
      const max = this.isRtl() ? 0 : maxScroll
      vp.scrollLeft = Math.max(min, Math.min(max, target))
    }
  }

  /** 结束拖拽：移除全局监听并还原文本选择 */
  private endThumbDrag = (): void => {
    this.dragState = null
    document.body.style.userSelect = this.prevUserSelect
    window.removeEventListener('pointermove', this.handleDragMove)
    window.removeEventListener('pointerup', this.endThumbDrag)
    window.removeEventListener('pointercancel', this.endThumbDrag)
  }

  // ---------- 编程滚动方法 ----------

  /**
   * 滚动到指定位置，委托 viewport.scrollTo（与原生 Element.scrollTo 兼容：
   * 支持 `scrollTo({ top, left, behavior })` 与 `scrollTo(x, y)` 两种形式）。
   */
  public override scrollTo(x?: ScrollToOptions | number, y?: number): void {
    const vp = this.viewport
    if (!vp) return
    if (typeof x === 'number') vp.scrollTo(x, y ?? 0)
    else if (x) vp.scrollTo(x)
  }

  /** 平滑/即时滚到顶部（保留横向位置；默认平滑滚动） */
  scrollToTop(options?: { behavior?: ScrollBehavior }): void {
    const vp = this.viewport
    if (!vp) return
    vp.scrollTo({ top: 0, left: vp.scrollLeft, behavior: options?.behavior ?? 'smooth' })
  }

  /** 平滑/即时滚到底部（保留横向位置；默认平滑滚动） */
  scrollToBottom(options?: { behavior?: ScrollBehavior }): void {
    const vp = this.viewport
    if (!vp) return
    vp.scrollTo({ top: vp.scrollHeight, left: vp.scrollLeft, behavior: options?.behavior ?? 'smooth' })
  }

  /**
   * 让容器内元素滚进视口，委托目标元素的原生 scrollIntoView（`options` 的
   * block/inline 透传）。`target` 为选择器或元素；不传（或传原生 boolean/options）
   * 时回退委托视口自身滚动（保持原生 `el.scrollIntoView()` 语义）。宿主自身作为
   * 目标时同样回退视口，避免递归。
   */
  public override scrollIntoView(
    target?: string | Element | ScrollIntoViewOptions | boolean,
    options?: ScrollIntoViewOptions,
  ): void {
    const vp = this.viewport
    if (!vp) return
    const opt =
      options ??
      (typeof target === 'object' && target !== null && !(target instanceof Element)
        ? (target as ScrollIntoViewOptions)
        : undefined)
    let el: Element | null = null
    if (typeof target === 'string') {
      el = this.querySelector(target) ?? vp.querySelector(target)
    } else if (target instanceof Element && target !== this) {
      el = target
    }
    if (el) el.scrollIntoView(opt)
    else vp.scrollIntoView(opt)
  }

  // ---------- RTL / stick-to-bottom / end-reached ----------

  /** 宿主是否为 RTL（优先显式 dir 属性，逐级向祖先与 documentElement 回退；
   *  祖先未显式设置时回落 config-provider 注入的 direction 值；最后兜底 computed style） */
  private isRtl(): boolean {
    const dir = this.getAttribute('dir')
    if (dir === 'rtl' || dir === 'ltr') return dir === 'rtl'
    let cur: Element | null = this.parentElement
    while (cur) {
      const d = cur.getAttribute('dir')
      if (d === 'rtl' || d === 'ltr') return d === 'rtl'
      cur = cur.parentElement
    }
    // config-provider direction 注入：自身/祖先均未显式设置时回落注入值
    // （provider 会把自己的 direction 写成 dir 属性，此路径为显式兜底消费）
    const injected = this.injectValue('direction', '')
    if (injected === 'rtl' || injected === 'ltr') return injected === 'rtl'
    if (this.ownerDocument?.documentElement.getAttribute('dir') === 'rtl') return true
    return getComputedStyle(this).direction === 'rtl'
  }

  /** 是否停靠在底部（剩余滚动距离 ≤ 贴底容差） */
  private isStuck(): boolean {
    const vp = this.viewport
    if (!vp) return true
    return vp.scrollHeight - vp.scrollTop - vp.clientHeight <= STICK_THRESHOLD
  }

  /** 贴底同步：开启 stick-to-bottom 且当前贴底时滚到新底部（追加后 scrollHeight 已增长） */
  private syncStick(): void {
    if (!this.hasAttr('stick-to-bottom') || !this.stickToBottom) return
    const vp = this.viewport
    if (!vp || vp.scrollHeight <= 0) return
    vp.scrollTop = vp.scrollHeight
  }

  /** 内容变化（stick-to-bottom 场景）：贴底时自动滚到底，上翻阅读时不打断 */
  private handleContentMutation = (): void => {
    this.syncStick()
  }

  /** end-reached 触发距离（px，默认 0）；非法值回退 0 */
  private endDistance(): number {
    const n = Number(this.getAttr('end-distance', '0'))
    return Number.isFinite(n) && n > 0 ? n : 0
  }

  /** 纵向是否到达底部（距底 ≤ end-distance） */
  private atEndVertical(): boolean {
    const vp = this.viewport
    if (!vp) return false
    if (vp.scrollHeight <= vp.clientHeight) return false
    return vp.scrollHeight - vp.scrollTop - vp.clientHeight <= this.endDistance()
  }

  /** 横向是否到达右边缘（距右边缘 ≤ end-distance；RTL 下为左边缘，负值区间） */
  private atEndHorizontal(): boolean {
    const vp = this.viewport
    if (!vp) return false
    const maxX = vp.scrollWidth - vp.clientWidth
    if (maxX <= 0) return false
    const dist = this.endDistance()
    if (this.isRtl()) return vp.scrollLeft <= -maxX + dist
    return vp.scrollLeft >= maxX - dist
  }

  /**
   * end-reached 检测：到达底部（方向 bottom）或横向右边缘（方向 right）时派发；
   * 去抖——派发后需先离开边缘区域才可再次触发。
   */
  private checkEndReached(): void {
    const atBottom = this.atEndVertical()
    const atRight = this.atEndHorizontal()
    if (!atBottom && !atRight) {
      this.endReachedFired = false
      return
    }
    if (this.endReachedFired) return
    this.endReachedFired = true
    this.emit('end-reached', { direction: atBottom ? 'bottom' : 'right' })
  }
}
