import { OASElement } from '@oas-ui/core'
import { closePath } from '@oas-ui/icons/icons/close'
import { isRtl } from '../../shared/direction.js'
import { devWarn } from '../../shared/dev-warn.js'
import { pushEscapeLayer, promoteEscapeLayer, type OverlayEscapeLayer } from '../../shared/overlay-stack.js'
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
/** 激活来源（open 边沿只更新叠放顺序，不派发 activate） */
export type FloatingPanelActivateSource = 'pointer' | 'api'

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

/** 未命中 boundary 告警台账上限（防宿主拼字符串撑爆静态 Set） */
const MAX_WARNED_BOUNDARIES = 32

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
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  flex: 0 0 auto;
  min-height: var(--oas-floating-panel-titlebar-height, 36px);
  padding-inline: var(--oas-space-2);
  border-block-end: 1px solid var(--oas-floating-panel-titlebar-border-color, var(--oas-color-border));
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
  top: var(--oas-floating-panel-titlebar-height, 36px);
  bottom: var(--oas-floating-panel-handle-size, 8px);
  width: var(--oas-floating-panel-handle-size, 8px);
}
.handle[data-edge='n'] {
  top: var(--oas-floating-panel-titlebar-height, 36px);
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
  top: var(--oas-floating-panel-titlebar-height, 36px);
  right: 0;
  cursor: nesw-resize;
}
.handle[data-edge='nw'] {
  top: var(--oas-floating-panel-titlebar-height, 36px);
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
    /* 标题栏与关闭钮同高，顶部手柄从标题栏下沿起算才不侵占拖拽/关闭热区 */
    --oas-floating-panel-titlebar-height: var(--oas-touch-target-min, 44px);
  }
}
@media (forced-colors: active) {
  /* 强制色下 box-shadow 被系统禁用：只留 outline: none 会让焦点环完全消失（WCAG 2.4.7）。
     回退实线 outline；关闭钮内缩，避免被框体 overflow 裁切 */
  .frame:focus-visible {
    outline: 2px solid;
    outline-offset: 2px;
  }
  .close:focus-visible {
    outline: 2px solid;
    outline-offset: -2px;
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
 * - `open`：布尔 presence（存在即打开，`open="false"` 仍为打开）；唯一状态源（外部写属性静默吸收，
 *   内部交互/方法写属性并派发 open-change）
 * - `rect`：`x,y,width,height`（相对宿主锚点的像素坐标；缺省 48,48,420,300）；property 同时接受
 *   对象与同格式字符串（字符串原样走 attribute 通道）
 * - `panel-title`：标题文本（`title` 插槽覆盖）；避开原生 `title` 属性
 * - `movable`：标题栏拖动 + 框体聚焦时方向键移动
 * - `resizable`：八向手柄（四边 + 四角）+ Shift+方向键缩放
 * - `boundary`：`viewport`（默认）或 CSS 选择器（先在自身根树解析，未命中回退 `document`）；只约束拖动/缩放/键盘交互
 * - `boundary-padding`：边界内缩像素（非负；非法回落 0）
 * - `min` / `max`：`宽,高`（min 缺省 160,96；max 缺省不限制；min > max 以 min 为准）
 * - `initial-focus`：打开时聚焦的选择器（light DOM 或 shadow 内；找不到回退框体）
 *
 * 方法：`show()` / `close(): boolean` / `bringToFront()`（置前同时把 Esc 层提到栈顶）。
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
  private escapeLayer: OverlayEscapeLayer | null = null
  private stackUnregister: (() => void) | null = null

  /** 内部动作的待派发状态（外部写属性不设置 → 静默吸收） */
  private pendingOpenChange: FloatingPanelOpenChangeDetail | null = null

  private interaction: InteractionState | null = null
  private rafId = 0

  /** 标题栏实测观察器（富标题撑高时把实测 px 写回 host token；断开释放、重连重挂） */
  private titlebarObserver: ResizeObserver | null = null

  /** 首帧即打开（属性在连接时已存在）：不抢焦点（SSR/DSD 与文档页多实例场景避免载入即滚焦） */
  private initiallyOpen = false

  /** 首帧即打开不建立焦点归还基线：断开重连也不补 previousFocus */
  private skipFocusBaseline = false

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
    this.titlebarObserver?.disconnect()
    this.titlebarObserver = null
    this.releaseEscapeLayer?.()
    this.releaseEscapeLayer = null
    this.escapeLayer = null
    this.stackUnregister?.()
    this.stackUnregister = null
    // 打开态与位置保存在宿主属性：断开不清状态，重连由 onReconnect 重挂交互
    super.disconnectedCallback()
  }

  /** 断开重连：重新登记叠放并恢复 Esc 层（不抢焦点、不重建 shadow） */
  protected override onReconnect(): void {
    if (isSsrRuntime()) return
    this.observeTitlebar()
    this.stackUnregister ??= this.stack.register(this.stackMember)
    if (!this.hasAttr('open')) return
    // 断开期间改 open 的边沿副作用被 isConnected 守卫跳过，这里补齐 Esc 层 / 叠放 / 焦点基线
    // 首帧即打开从未抢过焦点，不建立归还基线（否则关闭会把焦点送回重连时抓到的任意元素）
    if (!this.skipFocusBaseline) this.previousFocus ??= deepActiveElement()
    this.attachEscapeLayer()
    this.stack.activate(this.stackMember)
    this.stackMember.applyFront(this.stack.isFront(this.stackMember))
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

    this.observeTitlebar()
    // 静态交互绑定：同一 handler/target 重复 add 规范去重（重连幂等）
    this.frameEl?.addEventListener('pointerdown', this.onFramePointerDown)
    this.frameEl?.addEventListener('keydown', this.onFrameKeydown)
    this.titlebarEl?.addEventListener('pointerdown', this.onTitlebarPointerDown)
    for (const handle of this.handleEls) handle.addEventListener('pointerdown', this.onHandlePointerDown)
  }

  /**
   * 观察标题栏实测高度：富标题插槽撑高 > 默认 token 时，整段上侧/上角手柄会被标题栏（z-index: 2）
   * 盖住，顶部与两个上角缩放失效。客户端把实测内容高写回 host 的
   * `--oas-floating-panel-titlebar-height`（px），n/ne/nw 手柄随之下移。
   *
   * SSR 快照仍用默认 token（服务端不测量，无差异帧）；断开释放观察器，重连重挂。
   */
  private observeTitlebar(): void {
    if (isSsrRuntime() || typeof ResizeObserver === 'undefined') return
    const bar = this.titlebarEl
    if (!bar) return
    this.titlebarObserver ??= new ResizeObserver(() => this.syncTitlebarHeight())
    this.titlebarObserver.observe(bar)
    // 首连/重连立即补测一次：RO 首次回调在下一帧，水合后不必等一帧
    this.syncTitlebarHeight()
  }

  private syncTitlebarHeight(): void {
    const bar = this.titlebarEl
    if (!bar || !this.isConnected) return
    // clientHeight 排除 1px 下边框：token 是 content-box 的 min-height，
    // 写「整高（含边框）」会让标题栏每帧再长 1px，形成 RO 无限循环
    const height = bar.clientHeight
    // 关闭态 display:none 实测 0：不覆盖默认 token（打开后 RO 会再回调）
    if (height <= 0) return
    const next = `${height}px`
    // 同值不重写（防 RO 自激循环）；同时覆盖宿主在断开期间移除/改写内联 token 的情况
    if (this.style.getPropertyValue('--oas-floating-panel-titlebar-height') === next) return
    this.style.setProperty('--oas-floating-panel-titlebar-height', next)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验框体/标题栏/标题/关闭钮/内容槽/八个手柄后接管，不重建 shadow */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="frame"]')) return false
    if (!this.shadow.querySelector('[part="titlebar"]')) return false
    if (!this.shadow.querySelector('[part="title"]')) return false
    if (!this.shadow.querySelector('[part="close"]')) return false
    if (!this.shadow.querySelector('[part="content"]')) return false
    if (!this.shadow.querySelector('slot[name="title"]')) return false
    if (this.shadow.querySelectorAll('[part="handle"]').length !== EDGES.length) return false
    const title = this.shadow.querySelector<HTMLElement>('[part="title"]')
    this.titleId = title?.id || `oas-floating-panel-title-${++titleUid}`
    // 快照标题缺 id：补写回 DOM，否则 aria-labelledby 指向不存在的 IDREF
    if (title && !title.id) title.id = this.titleId
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
    this.syncFrontLayer()
  }

  /**
   * 首帧补写叠放层级：`connectedCallback` 先登记再渲染，登记时 `frameEl` 尚不存在，
   * `applyFront(true)` 无处落笔——render/update 之后必须按叠放态补一次（首帧打开的单面板要 +1）。
   */
  private syncFrontLayer(): void {
    this.stackMember.applyFront(this.stack.isFront(this.stackMember))
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
    this.skipFocusBaseline = skipFocus
    // 断开期间改属性只同步内部状态与属性；Esc 层 / 叠放 / 焦点副作用留给 onReconnect 补齐，
    // 否则会挂上脱离文档也被 document 捕获的「幽灵 Esc 层」，还会把焦点抢到未连接元素
    if (!isSsrRuntime() && this.isConnected) {
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
    this.escapeLayer = null
    if (!isSsrRuntime() && this.isConnected) {
      this.stack.refresh()
      this.restoreFocus()
    } else {
      // 未连接时归还焦点会把焦点移到脱离文档的元素上；关闭已成事实，基线一并丢弃
      this.previousFocus = null
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

  /** 当前打开态（与 `open` 属性同源；attribute 通道是 presence 语义，`open="false"` 仍为打开） */
  get open(): boolean {
    return this.hasAttr('open')
  }

  /** 对齐族内 presence 约定：空串（静态 `<oas-floating-panel open>` 经框架 property 通道）为真，
   *  仅 false / 'false' / null 收起。公开类型保持 boolean（attribute 通道本就不看具体值） */
  set open(value: boolean) {
    const raw = value as unknown
    const on = raw !== false && raw !== 'false' && raw != null
    this.toggleAttribute('open', on)
  }

  /** 当前 rect（属性 → 归一化；拖动中的视觉矩形在提交后才进入属性） */
  get rect(): PanelRect {
    return this.currentRect()
  }

  /** 写 rect：对象走格式化归一化；字符串原样走 attribute 通道（Vue 静态模板的 property 赋值同义，
   *  公开类型保持 PanelRect——attribute 通道本就只接受字符串） */
  set rect(value: PanelRect) {
    const raw = value as unknown
    if (typeof raw === 'string') {
      this.setAttribute('rect', raw)
      return
    }
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
   * 返回是否已关闭：本来已关闭直接 true（不派发任何事件），被否决返回 false。
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

  /** 置前（族内恒定 overlay 档 + 0/1，并把本面板 Esc 层提到栈顶；已是最前不重复派发 activate） */
  bringToFront(): void {
    if (!this.hasAttr('open')) return
    if (this.stack.activate(this.stackMember)) {
      this.raiseEscapeLayer()
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
    const layer: OverlayEscapeLayer = {
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
    }
    this.escapeLayer = layer
    this.releaseEscapeLayer = pushEscapeLayer(layer)
  }

  /** 置前时把本面板 Esc 层提到栈顶：一次 Esc 应关视觉最前，而不是后打开的那个 */
  private raiseEscapeLayer(): void {
    if (this.escapeLayer) promoteEscapeLayer(this.escapeLayer)
  }

  // ===== 指针：移动 / 缩放 =====

  private onFramePointerDown = (e: PointerEvent): void => {
    if (!this.hasAttr('open')) return
    if (e.button !== 0 || e.isPrimary === false) return
    if (this.stack.activate(this.stackMember)) {
      this.raiseEscapeLayer()
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
      if (typeof window === 'undefined' || typeof document === 'undefined') return null
      const hostRect = this.getBoundingClientRect()
      const root = document.documentElement
      return {
        x: -hostRect.left,
        y: -hostRect.top,
        // clientWidth/Height 排除滚动条（innerWidth 会把纵向滚动条算进横向可用宽度，右侧永远差一条）
        width: root?.clientWidth || window.innerWidth,
        height: root?.clientHeight || window.innerHeight,
      }
    }
    // 选择器限定在自身根树：面板嵌在 shadow DOM 里时，ownerDocument 查不到同树的边界元素；
    // 根树优先（同 id 优先绑定同一棵树里的元素），未命中再回退 document（面板在 shadow、边界在页面上）
    const root = this.getRootNode() as ParentNode | null
    let boundaryHost: Element | null = null
    try {
      boundaryHost = root?.querySelector?.(name) ?? null
      if (!boundaryHost && typeof document !== 'undefined') boundaryHost = document.querySelector(name)
    } catch {
      boundaryHost = null
    }
    if (!boundaryHost) {
      if (!OASFloatingPanel.warnedBoundaries.has(name)) {
        // 告警台账有界：宿主把用户输入直接拼进 boundary 时不得让 Set 无限增长
        if (OASFloatingPanel.warnedBoundaries.size >= MAX_WARNED_BOUNDARIES) {
          OASFloatingPanel.warnedBoundaries.clear()
        }
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
