import { OASElement } from '@oas-ui/core'
import { closePath } from '@oas-ui/icons/icons/close'
import { isRtl } from '../../shared/direction.js'
import { devWarn } from '../../shared/dev-warn.js'
import { pushEscapeLayer } from '../../shared/overlay-stack.js'
import { isSsrRuntime } from '../../shared/ssr-runtime.js'
import {
  DEFAULT_RECT,
  formatRect,
  keyboardMove,
  keyboardResize,
  keyboardResizeEdge,
  moveBy,
  normalizeRect,
  parseRect,
  rectEquals,
  resizeBy,
  resolveLimits,
  type BoundaryRect,
  type KeyboardDirection,
  type KeyboardOptions,
  type PanelRect,
  type ResizeEdge,
  type SizeLimits,
} from './geometry.js'
import { floatingPanelStack, type PanelStack, type PanelStackMember } from './panel-stack.js'

/** 关闭来源（before-close / open-change 的 detail.reason） */
export type FloatingPanelCloseReason = 'show' | 'close-button' | 'esc' | 'method'
/** 动作发起方：组件内部交互（user）或公开方法（api） */
export type FloatingPanelActionSource = 'user' | 'api'
/** 移动/缩放来源 */
export type FloatingPanelTransformSource = 'pointer' | 'keyboard'
/** 激活来源 */
export type FloatingPanelActivateSource = 'pointer' | 'api' | 'open'

export interface FloatingPanelBeforeCloseDetail {
  reason: FloatingPanelCloseReason
  source: FloatingPanelActionSource
}

export interface FloatingPanelOpenChangeDetail {
  open: boolean
  reason: FloatingPanelCloseReason
  source: FloatingPanelActionSource
}

export interface FloatingPanelMoveDetail {
  rect: PanelRect
  source: FloatingPanelTransformSource
}

export interface FloatingPanelResizeDetail extends FloatingPanelMoveDetail {
  edge: ResizeEdge
}

export interface FloatingPanelActivateDetail {
  rect: PanelRect
  source: FloatingPanelActivateSource
}

/** 族内基准档：overlay 档（同 modal 之下、dropdown 之上），最前 +1 */
const BASE_Z = 'calc(var(--oas-z-index-base, 0) + var(--oas-z-overlay, 1040))'
const FRONT_Z = 'calc(var(--oas-z-index-base, 0) + var(--oas-z-overlay, 1040) + 1)'

const EDGES: readonly ResizeEdge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

/** 标题 id 序号（同页多实例唯一；SSR 快照保留服务端 id） */
let titleUid = 0

const STYLE = `
:host {
  display: block;
  position: relative;
  width: 0;
  height: 0;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host(:not([open])) {
  display: none;
}
:host([hidden]) {
  display: none;
}
:host([data-interacting]) {
  user-select: none;
}
.frame {
  position: absolute;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--oas-floating-panel-bg, var(--oas-color-bg-elevated));
  border: 1px solid var(--oas-floating-panel-border-color, var(--oas-color-border));
  border-radius: var(--oas-floating-panel-radius, var(--oas-radius-md));
  box-shadow: var(--oas-floating-panel-shadow, var(--oas-shadow-lg));
  overflow: hidden;
  outline: none;
}
.frame:focus-visible {
  outline: none;
  box-shadow: var(--oas-floating-panel-shadow, var(--oas-shadow-lg)), var(--oas-focus-ring);
}
.titlebar {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  flex: 0 0 auto;
  min-height: var(--oas-floating-panel-titlebar-height, 36px);
  padding-inline: var(--oas-space-2);
  border-block-end: 1px solid var(--oas-color-border);
}
:host([movable]) .titlebar {
  cursor: move;
  touch-action: none;
}
.title {
  flex: 1 1 auto;
  min-width: 0;
  font-size: var(--oas-font-size-sm);
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.close {
  appearance: none;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: var(--oas-floating-panel-close-size, var(--oas-control-height-sm, 24px));
  height: var(--oas-floating-panel-close-size, var(--oas-control-height-sm, 24px));
  padding: 0;
  border: none;
  border-radius: var(--oas-radius-sm);
  background: transparent;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  transition:
    background-color var(--oas-transition-fast, 120ms) var(--oas-ease-out, cubic-bezier(0.2, 0, 0.2, 1)),
    color var(--oas-transition-fast, 120ms) var(--oas-ease-out, cubic-bezier(0.2, 0, 0.2, 1));
}
.close:hover {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
.close:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.close svg {
  display: block;
  width: 12px;
  height: 12px;
}
.content {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: var(--oas-space-3);
}
.handle {
  position: absolute;
  z-index: 1;
  touch-action: none;
}
:host(:not([resizable])) .handle {
  display: none;
}
.handle[data-edge='n'],
.handle[data-edge='s'] {
  left: var(--oas-floating-panel-handle-size, 8px);
  right: var(--oas-floating-panel-handle-size, 8px);
  height: var(--oas-floating-panel-handle-size, 8px);
}
.handle[data-edge='e'],
.handle[data-edge='w'] {
  top: var(--oas-floating-panel-handle-size, 8px);
  bottom: var(--oas-floating-panel-handle-size, 8px);
  width: var(--oas-floating-panel-handle-size, 8px);
}
.handle[data-edge='n'] {
  top: 0;
  cursor: ns-resize;
}
.handle[data-edge='s'] {
  bottom: 0;
  cursor: ns-resize;
}
.handle[data-edge='e'] {
  right: 0;
  cursor: ew-resize;
}
.handle[data-edge='w'] {
  left: 0;
  cursor: ew-resize;
}
.handle[data-edge='ne'],
.handle[data-edge='nw'],
.handle[data-edge='se'],
.handle[data-edge='sw'] {
  width: var(--oas-floating-panel-handle-size, 8px);
  height: var(--oas-floating-panel-handle-size, 8px);
}
.handle[data-edge='ne'] {
  top: 0;
  right: 0;
  cursor: nesw-resize;
}
.handle[data-edge='nw'] {
  top: 0;
  left: 0;
  cursor: nwse-resize;
}
.handle[data-edge='se'] {
  bottom: 0;
  right: 0;
  cursor: nwse-resize;
}
.handle[data-edge='sw'] {
  bottom: 0;
  left: 0;
  cursor: nesw-resize;
}
@media (pointer: coarse) {
  :host {
    --oas-floating-panel-handle-size: 44px;
    --oas-floating-panel-close-size: var(--oas-touch-target-min, 44px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .close {
    transition-duration: 0.01ms;
  }
}
`

interface InteractionState {
  kind: 'move' | 'resize'
  edge: ResizeEdge | null
  pointerId: number
  startX: number
  startY: number
  startRect: PanelRect
  limits: SizeLimits
  boundary: BoundaryRect | null
  padding: number
  latest: PanelRect
  captureTarget: Element | null
  /** 手势起始时的 rect 属性原文（外部改写检测） */
  rawAtStart: string | null
}

/** 穿透 shadow 的当前焦点 */
function deepActiveElement(): HTMLElement | null {
  let active: Element | null = typeof document !== 'undefined' ? document.activeElement : null
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
  return active as HTMLElement | null
}

/**
 * oas-floating-panel —— 工作台悬浮面板（非模态工具窗）。
 *
 * 与 modal/drawer 的分工：不遮挡页面、无焦点陷阱、不 portal；面板是工作区里的一块可移动工具面，
 * 开合/位置都由宿主属性驱动（`open` / `rect`），指针与键盘等价可操作。
 *
 * 属性（kebab-case）：
 * - `open`：布尔，打开态（唯一状态源；外部写属性静默吸收，内部交互/方法写属性并派发 open-change）
 * - `rect`：`x,y,width,height`（相对宿主锚点的像素坐标；缺省 48,48,420,300）
 * - `panel-title`：标题文本（`title` 插槽覆盖）；避开原生 `title` 属性
 * - `movable`：标题栏拖动 + 框体聚焦时方向键移动
 * - `resizable`：八向手柄（四边 + 四角）+ Shift+方向键缩放
 * - `boundary`：`viewport`（默认）或 CSS 选择器；只约束拖动/缩放/键盘交互
 * - `boundary-padding`：边界内缩像素（非负；非法回落 0）
 * - `min` / `max`：`宽,高`（min 缺省 160,96；max 缺省不限制；min > max 以 min 为准）
 * - `initial-focus`：打开时聚焦的选择器（light DOM 或 shadow 内；找不到回退框体）
 *
 * 方法：`show()` / `close(): boolean` / `bringToFront()`。
 *
 * 事件：`oas-before-close`（可取消）/ `oas-open-change` / `oas-move` / `oas-resize` / `oas-activate`。
 *
 * 插槽：默认（内容）、`title`（富标题）。
 *
 * a11y：`role="dialog"` + `aria-modal="false"` + `aria-labelledby`（无标题回落 i18n aria-label）；
 * 关闭钮有 i18n 名称；手柄 aria-hidden（键盘等价路径：框体聚焦后 Shift+方向键）。
 */
export class OASFloatingPanel extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'open',
      'rect',
      'panel-title',
      'movable',
      'resizable',
      'boundary',
      'boundary-padding',
      'min',
      'max',
      'initial-focus',
      'dir',
    ]
  }

  /** 族内叠放（默认共享单例；测试可整体 clear） */
  private readonly stack: PanelStack = floatingPanelStack

  private frameEl: HTMLElement | null = null
  private titlebarEl: HTMLElement | null = null
  private titleEl: HTMLElement | null = null
  private titleTextEl: HTMLElement | null = null
  private titleSlotEl: HTMLSlotElement | null = null
  private closeBtnEl: HTMLButtonElement | null = null
  private contentEl: HTMLElement | null = null
  private handleEls: HTMLElement[] = []

  private titleId = ''
  private isOpen = false
  private previousFocus: HTMLElement | null = null
  private releaseEscapeLayer: (() => void) | null = null
  private stackUnregister: (() => void) | null = null

  /** 内部动作的待派发状态（外部写属性不设置 → 静默吸收） */
  private pendingOpenChange: FloatingPanelOpenChangeDetail | null = null

  private interaction: InteractionState | null = null
  private rafId = 0

  /** 首帧即打开（属性在连接时已存在）：不抢焦点（SSR/DSD 与文档页多实例场景避免载入即滚焦） */
  private initiallyOpen = false

  private static warnedBoundaries = new Set<string>()

  private readonly stackMember: PanelStackMember = {
    isOpen: () => this.hasAttr('open'),
    applyFront: (front: boolean) => {
      if (this.frameEl) this.frameEl.style.zIndex = front ? FRONT_Z : BASE_Z
    },
  }

  // ===== 生命周期 =====

  override connectedCallback(): void {
    // 首帧即打开（服务端快照 / 首屏受控状态）：不抢焦点，避免载入滚动与 SSR 差异帧
    if (!this.hasRendered) this.initiallyOpen = this.hasAttr('open')
    // 先登记再渲染：首帧打开边沿的 activate 才能生效
    if (!isSsrRuntime()) this.stackUnregister ??= this.stack.register(this.stackMember)
    super.connectedCallback()
  }

  override disconnectedCallback(): void {
    this.cancelInteraction()
    this.releaseEscapeLayer?.()
    this.releaseEscapeLayer = null
    this.stackUnregister?.()
    this.stackUnregister = null
    // 打开态与位置保存在宿主属性：断开不清状态，重连由 onReconnect 重挂交互
    super.disconnectedCallback()
  }

  /** 断开重连：重新登记叠放并恢复 Esc 层（不抢焦点、不重建 shadow） */
  protected override onReconnect(): void {
    if (isSsrRuntime()) return
    this.stackUnregister ??= this.stack.register(this.stackMember)
    if (this.hasAttr('open')) {
      this.attachEscapeLayer()
      this.stack.activate(this.stackMember)
    }
  }

  // ===== 渲染 / 水合 =====

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板（位置只依赖属性，服务端不测量） */
  private template(): string {
    const rect = this.currentRect()
    this.titleId = `oas-floating-panel-title-${++titleUid}`
    const handles = EDGES.map(
      (edge) => `<span class="handle" part="handle" data-edge="${edge}" aria-hidden="true"></span>`,
    ).join('')
    return `
      <style>${STYLE}</style>
      <div class="frame" part="frame" role="dialog" aria-modal="false" tabindex="0"
        style="left:${rect.x}px;top:${rect.y}px;width:${rect.width}px;height:${rect.height}px;z-index:${BASE_Z}">
        <div class="titlebar" part="titlebar">
          <span class="title" part="title" id="${this.titleId}"><slot name="title"><span class="title-text"></span></slot></span>
          <button class="close" part="close" type="button">
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${closePath}</svg>
          </button>
        </div>
        <div class="content" part="content"><slot></slot></div>
        ${handles}
      </div>
    `
  }

  /** 缓存节点引用 + 绑定交互（render 与水合路径共用） */
  private bind(): void {
    this.frameEl = this.shadow.querySelector('[part="frame"]')
    this.titlebarEl = this.shadow.querySelector('[part="titlebar"]')
    this.titleEl = this.shadow.querySelector('[part="title"]')
    this.titleTextEl = this.shadow.querySelector('.title-text')
    this.titleSlotEl = this.shadow.querySelector<HTMLSlotElement>('slot[name="title"]')
    this.closeBtnEl = this.shadow.querySelector<HTMLButtonElement>('[part="close"]')
    this.contentEl = this.shadow.querySelector('[part="content"]')
    this.handleEls = [...this.shadow.querySelectorAll<HTMLElement>('[part="handle"]')]

    this.closeBtnEl?.addEventListener('click', this.onCloseClick)
    // 标题插槽内容增减影响 aria-labelledby 与兜底名称
    this.titleSlotEl?.addEventListener('slotchange', this.onSlotChange)

    if (isSsrRuntime()) return

    // 静态交互绑定：同一 handler/target 重复 add 规范去重（重连幂等）
    this.frameEl?.addEventListener('pointerdown', this.onFramePointerDown)
    this.frameEl?.addEventListener('keydown', this.onFrameKeydown)
    this.titlebarEl?.addEventListener('pointerdown', this.onTitlebarPointerDown)
    for (const handle of this.handleEls) handle.addEventListener('pointerdown', this.onHandlePointerDown)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验框体/标题/内容槽/八个手柄后接管，不重建 shadow */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="frame"]')) return false
    if (!this.shadow.querySelector('[part="title"]')) return false
    if (!this.shadow.querySelector('[part="content"]')) return false
    if (!this.shadow.querySelector('slot[name="title"]')) return false
    if (this.shadow.querySelectorAll('[part="handle"]').length !== EDGES.length) return false
    const title = this.shadow.querySelector<HTMLElement>('[part="title"]')
    this.titleId = title?.id || `oas-floating-panel-title-${++titleUid}`
    this.bind()
    return true
  }

  // ===== 属性同步 =====

  protected override update(): void {
    const frame = this.frameEl
    if (!frame) return
    this.toggleAttribute('data-rtl', isRtl(this))
    const limits = this.limits()
    const raw = this.getAttribute('rect')
    const next = normalizeRect(parseRect(raw, DEFAULT_RECT), limits)
    // 手势进行中外部改写 rect：取消手势（零事件），以宿主写入为准
    if (this.interaction && raw !== this.interaction.rawAtStart) this.cancelInteraction()
    if (!this.interaction) this.applyRect(next)

    this.syncTitle()
    this.syncCloseButton()
    this.syncOpenState()
  }

  private limits(): SizeLimits {
    return resolveLimits(this.getAttribute('min'), this.getAttribute('max'))
  }

  private boundaryPaddingPx(): number {
    const value = Number(this.getAttr('boundary-padding', '0'))
    return Number.isFinite(value) && value > 0 ? value : 0
  }

  /** 当前生效 rect（属性 → 归一化；不含边界夹取） */
  private currentRect(): PanelRect {
    return normalizeRect(parseRect(this.getAttribute('rect'), DEFAULT_RECT), this.limits())
  }

  /** 一次性写入位置与尺寸（原子写；SSR 快照同值） */
  private applyRect(rect: PanelRect): void {
    const frame = this.frameEl
    if (!frame) return
    frame.style.left = `${rect.x}px`
    frame.style.top = `${rect.y}px`
    frame.style.width = `${rect.width}px`
    frame.style.height = `${rect.height}px`
  }

  private syncTitle(): void {
    const title = this.getAttr('panel-title')
    if (this.titleTextEl) this.titleTextEl.textContent = title
    const hasSlotTitle = this.titleSlotEl ? this.hasSlotContent(this.titleSlotEl) : false
    const hasTitle = hasSlotTitle || title.trim() !== ''
    const frame = this.frameEl
    if (!frame) return
    if (hasTitle) {
      frame.setAttribute('aria-labelledby', this.titleId)
      frame.removeAttribute('aria-label')
    } else {
      frame.removeAttribute('aria-labelledby')
      frame.setAttribute('aria-label', this.t('floatingPanel.label'))
    }
  }

  private syncCloseButton(): void {
    this.closeBtnEl?.setAttribute('aria-label', this.t('floatingPanel.close'))
  }

  private syncOpenState(): void {
    const open = this.hasAttr('open')
    if (open === this.isOpen) return
    this.isOpen = open
    if (open) this.onOpenEdge()
    else this.onCloseEdge()
  }

  private onOpenEdge(): void {
    this.frameEl?.setAttribute('data-open', '')
    const skipFocus = this.initiallyOpen
    this.initiallyOpen = false
    if (!isSsrRuntime()) {
      this.attachEscapeLayer()
      this.stack.activate(this.stackMember)
      if (!skipFocus) {
        this.previousFocus = deepActiveElement()
        this.focusInitial()
      }
    }
    this.flushPendingOpenChange(true)
  }

  private onCloseEdge(): void {
    this.frameEl?.removeAttribute('data-open')
    this.cancelInteraction()
    this.releaseEscapeLayer?.()
    this.releaseEscapeLayer = null
    if (!isSsrRuntime()) {
      this.stack.refresh()
      this.restoreFocus()
    }
    this.flushPendingOpenChange(false)
  }

  private flushPendingOpenChange(open: boolean): void {
    const pending = this.pendingOpenChange
    this.pendingOpenChange = null
    if (!pending || pending.open !== open) return
    this.emit('open-change', { open, reason: pending.reason, source: pending.source })
  }

  // ===== 开合 API =====

  /** 当前打开态（与 `open` 属性同源） */
  get open(): boolean {
    return this.hasAttr('open')
  }

  set open(value: boolean) {
    this.toggleAttribute('open', value === true)
  }

  /** 当前 rect（属性 → 归一化；拖动中的视觉矩形在提交后才进入属性） */
  get rect(): PanelRect {
    return this.currentRect()
  }

  set rect(value: PanelRect) {
    this.setAttribute('rect', formatRect(normalizeRect(value, this.limits())))
  }

  /** 打开（已打开时仅置前，不重复派发 open-change） */
  show(): void {
    if (this.hasAttr('open')) {
      this.bringToFront()
      return
    }
    this.pendingOpenChange = { open: true, reason: 'show', source: 'api' }
    this.setAttribute('open', '')
  }

  /**
   * 关闭请求：先派发可取消 `oas-before-close`，被 preventDefault 时保持打开（零属性写入、零 open-change）。
   * 返回是否已处于关闭态（已关闭也返回 true）。
   */
  close(): boolean {
    return this.requestClose('method', 'api')
  }

  private requestClose(reason: FloatingPanelCloseReason, source: FloatingPanelActionSource): boolean {
    if (!this.hasAttr('open')) return true
    if (!this.emit('before-close', { reason, source }, { cancelable: true })) return false
    this.cancelInteraction()
    this.pendingOpenChange = { open: false, reason, source }
    this.removeAttribute('open')
    return true
  }

  /** 置前（族内恒定 overlay 档 + 0/1；已是最前不重复派发 activate） */
  bringToFront(): void {
    if (!this.hasAttr('open')) return
    if (this.stack.activate(this.stackMember)) {
      this.emit('activate', { rect: this.currentRect(), source: 'api' satisfies FloatingPanelActivateSource })
    }
  }

  private onCloseClick = (): void => {
    this.requestClose('close-button', 'user')
  }

  private onSlotChange = (): void => {
    this.update()
  }

  // ===== Esc 层 =====

  private attachEscapeLayer(): void {
    if (this.releaseEscapeLayer) return
    this.releaseEscapeLayer = pushEscapeLayer({
      name: 'floating-panel',
      active: () => this.hasAttr('open'),
      handle: () => {
        // 手势中 Esc 只取消手势（面板保持打开）；其余情况走关闭链（含 before-close 否决）
        if (this.interaction) {
          this.cancelInteraction()
          return true
        }
        this.requestClose('esc', 'user')
        return true
      },
    })
  }

  // ===== 指针：移动 / 缩放 =====

  private onFramePointerDown = (): void => {
    if (!this.hasAttr('open')) return
    if (this.stack.activate(this.stackMember)) {
      this.emit('activate', { rect: this.currentRect(), source: 'pointer' satisfies FloatingPanelActivateSource })
    }
  }

  private onTitlebarPointerDown = (e: PointerEvent): void => {
    if (!this.hasAttr('movable') || this.interaction) return
    if (e.button !== 0 || e.isPrimary === false) return
    if ((e.target as Element | null)?.closest('[part="close"]')) return
    e.preventDefault()
    this.startInteraction('move', null, e)
  }

  private onHandlePointerDown = (e: PointerEvent): void => {
    if (!this.hasAttr('resizable') || this.interaction) return
    if (e.button !== 0 || e.isPrimary === false) return
    const edge = (e.currentTarget as HTMLElement | null)?.dataset.edge as ResizeEdge | undefined
    if (!edge || !EDGES.includes(edge)) return
    e.preventDefault()
    this.startInteraction('resize', edge, e)
  }

  private startInteraction(kind: 'move' | 'resize', edge: ResizeEdge | null, e: PointerEvent): void {
    const startRect = this.currentRect()
    const captureTarget = e.currentTarget as Element | null
    this.interaction = {
      kind,
      edge,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startRect,
      limits: this.limits(),
      boundary: this.resolveBoundary(),
      padding: this.boundaryPaddingPx(),
      latest: startRect,
      captureTarget,
      rawAtStart: this.getAttribute('rect'),
    }
    this.setAttribute('data-interacting', kind)
    try {
      captureTarget?.setPointerCapture?.(e.pointerId)
    } catch {
      // 捕获失败：document 级监听是主路径，交互继续
    }
    document.addEventListener('pointermove', this.onInteractionMove)
    document.addEventListener('pointerup', this.onInteractionEnd)
    document.addEventListener('pointercancel', this.onInteractionCancel)
    captureTarget?.addEventListener('lostpointercapture', this.onLostPointerCapture)
    window.addEventListener('blur', this.onWindowBlur)
  }

  private onInteractionMove = (e: PointerEvent): void => {
    const interaction = this.interaction
    if (!interaction || e.pointerId !== interaction.pointerId) return
    const dx = e.clientX - interaction.startX
    const dy = e.clientY - interaction.startY
    const next =
      interaction.kind === 'move'
        ? moveBy(interaction.startRect, dx, dy, interaction.boundary, interaction.padding)
        : resizeBy(
            interaction.startRect,
            interaction.edge!,
            dx,
            dy,
            interaction.limits,
            interaction.boundary,
            interaction.padding,
          )
    interaction.latest = next
    this.scheduleVisual(next)
  }

  /** rAF 合并视觉更新（高频 pointermove 不逐事件写样式）；断开/结束取消 */
  private scheduleVisual(rect: PanelRect): void {
    if (typeof requestAnimationFrame !== 'function') {
      this.applyRect(rect)
      return
    }
    if (this.rafId) return
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0
      if (this.interaction) this.applyRect(this.interaction.latest)
    })
  }

  private flushVisual(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
    if (this.interaction) this.applyRect(this.interaction.latest)
  }

  private onInteractionEnd = (e: PointerEvent): void => {
    if (!this.interaction || e.pointerId !== this.interaction.pointerId) return
    this.commitInteraction()
  }

  private onInteractionCancel = (e: PointerEvent): void => {
    if (!this.interaction || e.pointerId !== this.interaction.pointerId) return
    this.cancelInteraction()
  }

  private onLostPointerCapture = (e: Event): void => {
    const pe = e as PointerEvent
    if (!this.interaction || pe.pointerId !== this.interaction.pointerId) return
    this.commitInteraction()
  }

  private onWindowBlur = (): void => {
    this.cancelInteraction()
  }

  /** 提交手势：写入 rect 属性 + 单次 move/resize（零位移零事件） */
  private commitInteraction(): void {
    const interaction = this.interaction
    if (!interaction) return
    this.flushVisual()
    const { latest, startRect, kind, edge } = interaction
    this.teardownInteraction()
    if (rectEquals(latest, startRect)) return
    this.setAttribute('rect', formatRect(latest))
    const rect = this.currentRect()
    if (kind === 'move') this.emit('move', { rect, source: 'pointer' satisfies FloatingPanelTransformSource })
    else this.emit('resize', { rect, source: 'pointer', edge: edge! } satisfies FloatingPanelResizeDetail)
  }

  /** 取消手势：回到起始 rect、零事件（pointercancel / blur / Esc / 断开 / 外部改写） */
  private cancelInteraction(): void {
    const interaction = this.interaction
    if (!interaction) return
    const start = interaction.startRect
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
    this.teardownInteraction()
    this.applyRect(start)
  }

  private teardownInteraction(): void {
    const interaction = this.interaction
    if (!interaction) return
    this.interaction = null
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
    document.removeEventListener('pointermove', this.onInteractionMove)
    document.removeEventListener('pointerup', this.onInteractionEnd)
    document.removeEventListener('pointercancel', this.onInteractionCancel)
    window.removeEventListener('blur', this.onWindowBlur)
    interaction.captureTarget?.removeEventListener('lostpointercapture', this.onLostPointerCapture)
    try {
      interaction.captureTarget?.releasePointerCapture?.(interaction.pointerId)
    } catch {
      // 未真正捕获 / 已释放：无操作
    }
    this.removeAttribute('data-interacting')
  }

  // ===== 键盘：等价移动 / 缩放 =====

  private onFrameKeydown = (e: KeyboardEvent): void => {
    if (!this.hasAttr('open') || this.interaction) return
    if (e.altKey || e.ctrlKey || e.metaKey) return
    // 只在框体自身聚焦时接管（不劫持插槽内容的键盘语义，也天然避开输入控件）
    if (deepActiveElement() !== this.frameEl) return
    const direction: KeyboardDirection = isRtl(this) ? 'rtl' : 'ltr'
    const options: KeyboardOptions = {
      direction,
      limits: this.limits(),
      boundary: this.resolveBoundary(),
      padding: this.boundaryPaddingPx(),
    }
    if (e.shiftKey) {
      if (!this.hasAttr('resizable')) return
      const edge = keyboardResizeEdge(e.key, direction)
      const next = keyboardResize(this.currentRect(), e.key, options)
      if (!next || !edge) return
      e.preventDefault()
      this.commitKeyboardRect(next, 'resize', edge)
    } else {
      if (!this.hasAttr('movable')) return
      const next = keyboardMove(this.currentRect(), e.key, options)
      if (!next) return
      e.preventDefault()
      this.commitKeyboardRect(next, 'move')
    }
  }

  private commitKeyboardRect(next: PanelRect, kind: 'move' | 'resize', edge?: ResizeEdge): void {
    if (rectEquals(this.currentRect(), next)) return
    this.setAttribute('rect', formatRect(next))
    const rect = this.currentRect()
    if (kind === 'move') this.emit('move', { rect, source: 'keyboard' satisfies FloatingPanelTransformSource })
    else this.emit('resize', { rect, source: 'keyboard', edge: edge! } satisfies FloatingPanelResizeDetail)
  }

  // ===== 边界 =====

  /** 边界矩形（宿主锚点坐标系）；SSR / 缺失 / 零尺寸 → null（不夹取） */
  private resolveBoundary(): BoundaryRect | null {
    if (isSsrRuntime()) return null
    const raw = this.getAttr('boundary', 'viewport').trim()
    const name = raw === '' ? 'viewport' : raw
    if (name.toLowerCase() === 'viewport') {
      if (typeof window === 'undefined') return null
      const hostRect = this.getBoundingClientRect()
      return {
        x: -hostRect.left,
        y: -hostRect.top,
        width: window.innerWidth,
        height: window.innerHeight,
      }
    }
    let boundaryHost: Element | null = null
    try {
      boundaryHost = this.ownerDocument?.querySelector(name) ?? null
    } catch {
      boundaryHost = null
    }
    if (!boundaryHost) {
      if (!OASFloatingPanel.warnedBoundaries.has(name)) {
        OASFloatingPanel.warnedBoundaries.add(name)
        devWarn(`[oas-floating-panel] boundary 选择器未命中「${name}」，本次不夹取边界`)
      }
      return null
    }
    const hostRect = this.getBoundingClientRect()
    const rect = boundaryHost.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return null
    return { x: rect.left - hostRect.left, y: rect.top - hostRect.top, width: rect.width, height: rect.height }
  }

  // ===== 焦点 =====

  private focusInitial(): void {
    const selector = this.getAttr('initial-focus').trim()
    let target: HTMLElement | null = null
    if (selector) {
      try {
        target = this.querySelector<HTMLElement>(selector) ?? this.shadow.querySelector<HTMLElement>(selector)
      } catch {
        target = null
      }
    }
    ;(target ?? this.frameEl)?.focus()
  }

  /** 关闭归还焦点：只在焦点仍在面板内时归还，避免抢走用户新焦点 */
  private restoreFocus(): void {
    const previous = this.previousFocus
    this.previousFocus = null
    if (!previous || !previous.isConnected) return
    const active = deepActiveElement()
    const focusInside =
      active === this || (active != null && (this.contains(active) || active.getRootNode() === this.shadow))
    if (!focusInside) return
    try {
      previous.focus()
    } catch {
      // 元素已不可聚焦：静默
    }
  }

  /** 插槽是否有真实内容：注释节点与纯空白文本不算（对齐库内判据） */
  private hasSlotContent(slot: HTMLSlotElement): boolean {
    const nodes = slot.assignedNodes({ flatten: true })
    return nodes.length > 0 && nodes.some((node) => this.isRealNode(node))
  }

  private isRealNode(node: Node): boolean {
    if (node.nodeType === Node.COMMENT_NODE) return false
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? '').trim() !== ''
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      if (el.tagName.includes('-')) return true
      return el.childNodes.length === 0 || [...el.childNodes].some((c) => this.isRealNode(c))
    }
    return true
  }
}
