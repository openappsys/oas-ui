import { OASElement } from '@oas-ui/core/oas-element'
import { pushEscapeLayer } from '../../shared/overlay-stack.js'

/**
 * oas-bottom-sheet —— 移动端底部抽屉容器（浮层组件移动形态的统一承载件）。
 *
 * 职责：底部升起面板 + drag handle（下滑关闭）+ backdrop 点击关闭 + Esc 关闭 +
 * safe-area-inset 刘海屏手势区适配 + 焦点陷阱。浮层组件（select/date-picker/
 * cascader/tree-select 等）在移动形态下把 panel 内容放进默认 slot，由本组件
 * 统一承载容器/手势/安全区；关闭时派发 `oas-close`，宿主据此同步自身 openState。
 *
 * Esc 处理走 overlay-stack 共享层栈（文档级监听）：不依赖焦点路由——用户点面板空白
 * 焦点落 body 后按 Esc 也能关闭；多层浮层同开时后开者先关。每实例 open 才压栈、
 * 关闭/断开即退栈（active 守卫防幽灵层）。
 *
 * 属性（kebab-case）：
 * - `open`：受控显隐（在场=展开、移除=收起；宿主手势只派发 oas-close，由宿主决定开合）
 * - `max-height`：面板最大高度（vh 数值或 px，默认 85vh）
 * - `passive`：被动透传模式（浮层组件 PC 形态的结构占位，无容器行为；移动端移除后
 *   变为底部抽屉容器——浮层组件模板恒包 bottom-sheet 保 SSR/客户端结构一致）
 *
 * 事件（bubbles + composed）：
 * - `oas-close`：请求关闭（下滑手势超阈值 / 点 backdrop / Esc），detail `{ reason }`
 *   （reason: 'drag' | 'backdrop' | 'esc'）；宿主监听后移除 open 属性关闭
 */

const STYLE = `
:host {
  display: contents;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
/* passive 被动透传模式：浮层组件 PC 形态下，bottom-sheet 仅作结构占位（SSR/客户端
   结构严格一致防水合不一致），无任何容器行为——backdrop/handle 隐藏、sheet 静态透明，
   slot 内容（组件面板）按组件自身定位呈现（PC 下拉）。移动端移除 passive 后本组件
   变为底部抽屉容器。 */
:host([passive]) {
  display: contents;
}
:host([passive]) .backdrop,
:host([passive]) .handle {
  display: none;
}
:host([passive]) .sheet {
  position: static;
  transform: none;
  max-height: none;
  background: transparent;
  box-shadow: none;
  border-radius: 0;
  padding-bottom: 0;
  z-index: auto;
}
:host([passive]) .content {
  overflow: visible;
  padding: 0;
}
.backdrop {
  position: fixed;
  inset: 0;
  background: var(--oas-color-overlay);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--oas-transition-base) var(--oas-ease-out);
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-modal, 1300));
}
:host([open]) .backdrop {
  opacity: 1;
  pointer-events: auto;
}
.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-modal, 1300) + 1);
  background: var(--oas-color-bg);
  /* 磨砂玻璃接线（容器级 surface）：变量缺省时零影响 */
  -webkit-backdrop-filter: var(--oas-glass-blur, none);
  backdrop-filter: var(--oas-glass-blur, none);
  outline: 1px solid var(--oas-glass-ring, transparent);
  outline-offset: -1px;
  border-radius: var(--oas-radius-lg) var(--oas-radius-lg) 0 0;
  box-shadow: 0 -4px 24px color-mix(in srgb, var(--oas-color-overlay) 24%, transparent);
  transform: translateY(100%);
  transition: transform var(--oas-transition-base) var(--oas-ease-out);
  display: flex;
  flex-direction: column;
  max-height: var(--oas-bottom-sheet-max-height, 85vh);
  /* 刘海屏底部手势区：safe-area-inset-bottom 留足 */
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
:host([open]) .sheet {
  transform: translateY(0);
}
/* 焦点兜底容器（tabindex=-1 程序化聚焦）：outline 声明与基础态一致——
 * 不闪 UA 焦点环，也不破坏 glass-ring 接线 */
.sheet:focus {
  outline: 1px solid var(--oas-glass-ring, transparent);
}
.sheet.dragging {
  transition: none;
}
.handle {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--oas-space-3) 0 var(--oas-space-2);
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.handle:active {
  cursor: grabbing;
}
.handle::before {
  content: '';
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--oas-color-border);
}
.content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding: 0 var(--oas-space-3) var(--oas-space-3);
}
`

export class OASBottomSheet extends OASElement {
  static override get observedAttributes(): string[] {
    return ['open', 'max-height', 'passive']
  }

  private sheet: HTMLElement | null = null
  private backdrop: HTMLElement | null = null
  private dragStartY = 0
  private dragDeltaY = 0
  private dragging = false
  /** 共享 Esc 层释放句柄（open 时压栈、关闭/passive/断开退栈；幂等） */
  private releaseEscapeLayer: (() => void) | null = null
  /** 聚焦兜底重试的 rAF 句柄（null = 未排程） */
  private focusRetryFrame: number | null = null

  // 事件监听用稳定引用：断开重连时 bind() 重入，addEventListener 同引用自动去重
  private onBackdropClick = (): void => {
    if (this.hasAttr('open')) this.requestClose('backdrop')
  }
  private onHandlePointerDown = (e: PointerEvent): void => this.startDrag(e)
  private onHostKeydown = (e: Event): void => this.onKey(e as KeyboardEvent)

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="backdrop" part="backdrop" aria-hidden="true"></div>
      <div class="sheet" part="sheet" role="dialog" aria-modal="true" tabindex="-1">
        <div class="handle" part="handle" aria-hidden="true"></div>
        <div class="content" part="content"><slot></slot></div>
      </div>
    `
  }

  private bind(): void {
    this.backdrop = this.shadow.querySelector<HTMLElement>('.backdrop')
    this.sheet = this.shadow.querySelector<HTMLElement>('.sheet')
    const handle = this.shadow.querySelector<HTMLElement>('.handle')
    this.backdrop?.addEventListener('click', this.onBackdropClick)
    handle?.addEventListener('pointerdown', this.onHandlePointerDown)
    // 键盘监听挂宿主而非 shadowRoot：面板控件是 light DOM slot 内容，其 keydown 冒泡
    // 路径不经过本组件 shadowRoot——挂 shadowRoot 会漏掉全部真实焦点场景（与 Esc 焦点
    // 路由缺陷同源）。Esc 已移交 overlay-stack 文档级层栈，这里只承载 Tab 焦点陷阱。
    this.addEventListener('keydown', this.onHostKeydown)
    // 断开连接必须退 Esc 层 + 弃挂起的聚焦重试（否则残留幽灵层吞掉后续 Esc）；
    // 重连走 onReconnect() → bind() 重新注册，打开态由 update() 重新压栈
    this.onCleanup(() => {
      this.cancelFocusRetry()
      this.releaseOverlay()
    })
    this.onCleanup(() => this.endDrag())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 断开重连：重绑交互 + 重新注册断开清理（disconnectedCallback 已清空 cleanup 列表） */
  protected override onReconnect(): void {
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（backdrop/sheet/content 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.backdrop')) return false
    if (!this.shadow.querySelector('.sheet')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const sheet = this.sheet
    if (!sheet) return
    // passive 被动透传：不做任何容器行为（max-height/聚焦/Esc 层均跳过）
    if (this.hasAttr('passive')) {
      this.releaseOverlay()
      this.cancelFocusRetry()
      return
    }
    // max-height：vh 数值（如 "85"）或带单位值（如 "600px"）
    const raw = this.getAttr('max-height', '')
    if (raw) {
      const v = /^\d+$/.test(raw) ? `${raw}vh` : raw
      sheet.style.maxHeight = v
    } else {
      sheet.style.maxHeight = ''
    }
    if (this.hasAttr('open')) {
      // open 才压 Esc 层（文档级监听，不依赖焦点路由）；关闭即退栈防幽灵层
      this.acquireOverlay()
      // 展开时聚焦面板首个可聚焦元素（焦点陷阱的可达性基础）；
      // 首帧尝试失败（WebKit 焦点时序）走 rAF 兜底重试，仍失败聚焦面板容器
      this.focusInitial()
    } else {
      this.releaseOverlay()
      this.cancelFocusRetry()
    }
  }

  /** 请求关闭：宿主监听 oas-close 后移除 open 属性（受控通道，组件不擅自改 open） */
  private requestClose(reason: 'drag' | 'backdrop' | 'esc'): void {
    this.emit('close', { reason })
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.hasAttr('open')) return
    // Esc 不在这里处理：移交 overlay-stack 文档级层栈（焦点落在任何位置都能关；
    // 多层浮层同开时后开者先关）。原 shadowRoot 监听依赖焦点路由，WebKit 下焦点
    // 掉 body 时按 Esc 关不掉弹层（用户可感知缺陷，已修）。
    if (e.key === 'Tab') this.trapFocus(e)
  }

  // ---- Esc 层栈（overlay-stack 协议，对齐 modal/coupon 先例） ----

  /** 压入共享 Esc 层（幂等）：文档级监听承接 Esc，焦点无论在哪都能触发关闭请求 */
  private acquireOverlay(): void {
    if (this.releaseEscapeLayer) return
    this.releaseEscapeLayer = pushEscapeLayer({
      name: 'bottom-sheet',
      // open 态守卫：已关闭/断开/passive 时跳过本层，不吞后续 Esc（防幽灵层）
      active: () => this.isConnected && this.hasAttr('open') && !this.hasAttr('passive'),
      handle: () => {
        this.requestClose('esc')
        return true
      },
    })
  }

  /** 退 Esc 层（幂等）：关闭、passive、断开连接都走这里 */
  private releaseOverlay(): void {
    this.releaseEscapeLayer?.()
    this.releaseEscapeLayer = null
  }

  // ---- 打开态聚焦（首帧同步尝试 + rAF 兜底重试，WebKit 焦点时序修复） ----

  /** 打开态聚焦：先试首个可聚焦控件；焦点未落面板则 rAF 兜底重试一次，仍失败聚焦面板容器（tabindex=-1） */
  private focusInitial(): void {
    const first = this.getFocusables()[0]
    if (first instanceof HTMLElement) first.focus()
    if (this.isFocusInPanel()) {
      this.cancelFocusRetry()
      return
    }
    this.scheduleFocusRetry()
  }

  /** 焦点是否已落在面板内（轻 DOM slot 控件 / 面板容器；shadow 内聚焦时 document.activeElement retarget 到 host） */
  private isFocusInPanel(): boolean {
    const root = this.getRootNode()
    const active = root instanceof ShadowRoot ? root.activeElement : document.activeElement
    if (!active) return false
    return active === this.sheet || (this.sheet?.contains(active) ?? false) || this.contains(active)
  }

  /** rAF 兜底重试（幂等排程）：首帧 focus 被浏览器焦点时序吞掉时二次尝试；仍失败则聚焦面板容器 */
  private scheduleFocusRetry(): void {
    if (this.focusRetryFrame != null) return
    this.focusRetryFrame = requestAnimationFrame(() => {
      this.focusRetryFrame = null
      // 排程期间已关闭/断开/passive：直接弃单，不得在关闭后还抢焦点
      if (!this.isConnected || !this.hasAttr('open') || this.hasAttr('passive')) return
      if (this.isFocusInPanel()) return
      const first = this.getFocusables()[0]
      if (first instanceof HTMLElement) first.focus()
      if (this.isFocusInPanel()) return
      this.sheet?.focus()
    })
  }

  private cancelFocusRetry(): void {
    if (this.focusRetryFrame == null) return
    cancelAnimationFrame(this.focusRetryFrame)
    this.focusRetryFrame = null
  }

  // ---- 下滑手势：pointerdown 起步，move 跟手，up 判定（超阈值关 / 未超回弹） ----

  private startDrag(e: PointerEvent): void {
    if (!this.hasAttr('open')) return
    if (e.button !== 0 && e.pointerType !== 'touch') return
    e.preventDefault()
    this.dragging = true
    this.dragStartY = e.clientY
    this.dragDeltaY = 0
    this.sheet?.classList.add('dragging')
    document.addEventListener('pointermove', this.onDragMove, { passive: false })
    document.addEventListener('pointerup', this.endDragGesture, { once: true })
    document.addEventListener('pointercancel', this.endDragGesture, { once: true })
  }

  private onDragMove = (e: PointerEvent): void => {
    if (!this.dragging || !this.sheet) return
    e.preventDefault()
    const delta = Math.max(0, e.clientY - this.dragStartY) // 只跟下滑（不跟上升）
    this.dragDeltaY = delta
    this.sheet.style.transform = `translateY(${delta}px)`
  }

  private endDragGesture = (): void => {
    if (!this.dragging) return
    this.dragging = false
    this.sheet?.classList.remove('dragging')
    document.removeEventListener('pointermove', this.onDragMove)
    const threshold = 80 // 下滑超 80px 判定关闭，否则回弹归位
    if (this.dragDeltaY > threshold) {
      if (this.sheet) this.sheet.style.transform = ''
      this.requestClose('drag')
    } else if (this.sheet) {
      this.sheet.style.transform = ''
    }
    this.dragDeltaY = 0
  }

  private endDrag(): void {
    document.removeEventListener('pointermove', this.onDragMove)
  }

  // ---- 焦点陷阱（Tab 圈内循环，参照 drawer 先例） ----

  private getFocusables(): HTMLElement[] {
    const sel =
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    const out: HTMLElement[] = []
    for (const el of this.querySelectorAll<HTMLElement>(sel)) out.push(el)
    return out
  }

  private trapFocus(e: KeyboardEvent): void {
    const focusables = this.getFocusables()
    if (focusables.length === 0) return
    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!
    const active =
      this.getRootNode() instanceof ShadowRoot
        ? (this.getRootNode() as ShadowRoot).activeElement
        : document.activeElement
    if (e.shiftKey && active === first) {
      e.preventDefault()
      last.focus()
      return
    }
    if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }
}
