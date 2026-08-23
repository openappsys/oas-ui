import { OASElement } from '@oas-ui/core'

/**
 * 缓动函数表：滚动动画的缓动曲线（t ∈ [0,1]）。
 * 默认 `quart-out`（先快后慢，通用默认回顶手感）。
 */
const EASINGS: Record<string, (t: number) => number> = {
  linear: (t) => t,
  ease: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  'ease-in': (t) => t * t,
  'ease-out': (t) => 1 - (1 - t) * (1 - t),
  'ease-in-out': (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  'quad-in': (t) => t * t,
  'quad-out': (t) => 1 - (1 - t) * (1 - t),
  'quad-in-out': (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  'cubic-in': (t) => t * t * t,
  'cubic-out': (t) => 1 - Math.pow(1 - t, 3),
  'cubic-in-out': (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  'quart-in': (t) => t * t * t * t,
  'quart-out': (t) => 1 - Math.pow(1 - t, 4),
  'quart-in-out': (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  'quint-in': (t) => t * t * t * t * t,
  'quint-out': (t) => 1 - Math.pow(1 - t, 5),
  'quint-in-out': (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2),
  'expo-in': (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  'expo-out': (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  'expo-in-out': (t) =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  'circ-in': (t) => 1 - Math.sqrt(1 - Math.pow(t, 2)),
  'circ-out': (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
  'circ-in-out': (t) =>
    t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
  'back-in': (t) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return c3 * t * t * t - c1 * t * t
  },
  'back-out': (t) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
  'back-in-out': (t) => {
    const c1 = 1.70158
    const c2 = c1 * 1.525
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2
  },
}

/** prefers-reduced-motion 探测（happy-dom 等环境可能缺失 matchMedia） */
function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  } catch {
    return false
  }
}

/** 8 方位枚举 → 宿主定位（expand 模式下被忽略） */
const POSITIONS: Record<string, { top?: string; bottom?: string; left?: string; right?: string; centerX?: boolean; centerY?: boolean }> = {
  'top-left': { top: '0', left: '0' },
  'top-center': { top: '0', centerX: true },
  'top-right': { top: '0', right: '0' },
  'middle-left': { centerY: true, left: '0' },
  'middle-right': { centerY: true, right: '0' },
  'bottom-left': { bottom: '0', left: '0' },
  'bottom-center': { bottom: '0', centerX: true },
  'bottom-right': { bottom: '0', right: '0' },
}

/** 进度环几何：viewBox 40×40、r=18 */
const RING_RADIUS = 18
const RING_C = 2 * Math.PI * RING_RADIUS

/** 拖拽位移阈值（px）：在此范围内视为点击（执行回顶），超过视为拖拽（不触发点击） */
const DRAG_THRESHOLD = 4
/** 拖拽位置持久化 key（宿主可清理 localStorage 重置位置） */
const DRAG_POS_KEY = 'oas-back-top-pos'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  position: fixed;
  z-index: var(--oas-z-fixed, 1030);
  --oas-back-top-size: var(--oas-control-height-lg);
}
:host([hidden]) {
  display: none;
}
:host([data-size='small']) {
  --oas-back-top-size: var(--oas-control-height-md);
}
:host([data-size='medium']) {
  --oas-back-top-size: var(--oas-control-height-lg);
}
:host([data-size='large']) {
  --oas-back-top-size: var(--oas-control-height-xl);
}
:host([data-pos^='top-']) .btn .tooltip {
  top: calc(100% + var(--oas-space-2));
  bottom: auto;
}
:host([data-pos='top-center']) .btn .tooltip,
:host([data-pos='bottom-center']) .btn .tooltip {
  left: 50%;
  right: auto;
  transform: translateX(-50%);
}
:host(.expand) {
  left: 0;
  right: 0;
  bottom: 0;
}
.btn {
  position: relative;
  box-sizing: border-box;
  width: var(--oas-back-top-size);
  height: var(--oas-back-top-size);
  border-radius: 50%;
  border: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-lg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  font-family: inherit;
  padding: 0;
  visibility: hidden;
  opacity: 0;
  transition:
    opacity var(--oas-transition-base) var(--oas-ease-out),
    visibility 0s linear var(--oas-transition-base);
}
.btn.show {
  visibility: visible;
  opacity: 1;
  transition:
    opacity var(--oas-transition-base) var(--oas-ease-out),
    visibility 0s linear 0s;
}
:host([data-shape='square']) .btn {
  border-radius: var(--oas-radius-md);
}
:host([data-transition='scale']) .btn {
  transform: scale(0.6);
  transition:
    opacity var(--oas-transition-base) var(--oas-ease-out),
    transform var(--oas-transition-base) var(--oas-ease-out),
    visibility 0s linear var(--oas-transition-base);
}
:host([data-transition='scale']) .btn.show {
  transform: scale(1);
  transition:
    opacity var(--oas-transition-base) var(--oas-ease-out),
    transform var(--oas-transition-base) var(--oas-ease-out),
    visibility 0s linear 0s;
}
:host([data-transition='none']) .btn,
:host([data-transition='none']) .btn.show,
.btn.no-anim {
  transition: none !important;
}
.btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring), 0 4px 12px rgba(0, 0, 0, 0.12);
}
.btn:hover {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
.btn:active {
  background: var(--oas-color-bg-hover);
}
/* draggable 拖拽定位：拖拽态指针反馈（grab/grabbing）+ 禁止选中文本（拖拽不选中按钮内容） */
:host(.draggable) .btn {
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}
:host(.draggable.dragging) .btn {
  cursor: grabbing;
}
:host([data-theme='primary']) .btn {
  border-color: transparent;
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
:host([data-theme='primary']) .btn:hover {
  background: var(--oas-color-primary-hover);
}
:host([data-theme='primary']) .btn:active {
  background: var(--oas-color-primary-active);
}
:host([data-theme='dark']) .btn {
  border-color: transparent;
  background: var(--oas-color-text-primary);
  color: var(--oas-color-bg);
}
:host([data-theme='dark']) .btn:hover {
  background: var(--oas-color-text-secondary);
  color: var(--oas-color-bg);
}
:host([data-theme='dark']) .btn:active {
  background: var(--oas-color-text-primary);
  color: var(--oas-color-bg);
}
.btn.expand {
  width: 100%;
  height: auto;
  min-height: var(--oas-control-height-md);
  border-radius: 0;
  padding: var(--oas-space-2) var(--oas-space-4);
}
.btn.expand .ring {
  display: none;
}
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.icon.hidden {
  display: none;
}
.content {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.ring {
  position: absolute;
  inset: -3px;
  width: calc(100% + 6px);
  height: calc(100% + 6px);
  pointer-events: none;
}
.ring-track,
.ring-bar {
  fill: none;
  stroke-width: 3;
}
.ring-track {
  stroke: var(--oas-color-border);
}
.ring-bar {
  stroke: var(--oas-color-primary);
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  transition: stroke-dashoffset var(--oas-transition-base) var(--oas-ease-out);
}
.tooltip {
  position: absolute;
  bottom: calc(100% + var(--oas-space-2));
  right: 0;
  z-index: 1;
  padding: var(--oas-space-1) var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-text-primary);
  color: var(--oas-color-bg);
  font-size: var(--oas-font-size-xs);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity var(--oas-transition-base) var(--oas-ease-out),
    visibility 0s linear var(--oas-transition-base);
}
.btn:hover .tooltip,
.btn:focus-visible .tooltip {
  opacity: 1;
  visibility: visible;
  transition:
    opacity var(--oas-transition-base) var(--oas-ease-out),
    visibility 0s linear 0s;
}
.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  z-index: 1;
  min-width: var(--oas-control-height-xs);
  height: var(--oas-control-height-xs);
  border-radius: var(--oas-radius-full, 999px);
  background: var(--oas-color-danger);
  color: var(--oas-color-text-on-danger);
  font-size: var(--oas-font-size-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--oas-space-1);
  line-height: 1;
}
@media (prefers-reduced-motion: reduce) {
  .btn,
  .btn.show,
  .btn.no-anim,
  .tooltip,
  .ring-bar {
    transition: none !important;
  }
}
`

export class OASBackTop extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'visible',
      'bottom',
      'right',
      'visibility-height',
      'target',
      'duration',
      'easing',
      'shape',
      'size',
      'theme',
      'transition',
      'show-progress',
      'reverse',
      'expand',
      'position',
      'append-to',
      'tooltip',
      'badge',
      'draggable',
    ]
  }

  private btn: HTMLElement | null = null
  private icon: HTMLElement | null = null
  private slotEl: HTMLSlotElement | null = null
  private ring: HTMLElement | null = null
  private ringBar: SVGElement | null = null
  private tooltipEl: HTMLElement | null = null
  private badgeEl: HTMLElement | null = null

  /** 当前生效显隐（用于变更检测与 oas-visibility-change 派发） */
  private effectiveShown = false
  /** 首次同步只落 DOM 不派发（避免挂载即发噪音事件） */
  private visibilityInit = false
  /** 首次应用显隐时禁用过渡（防首帧闪动） */
  private firstApply = true

  private scrollTarget: Element | Window = window
  private scrollListenerBound = false
  private scrollRaf = 0
  /** target 缺省时自动探测到的最近可滚祖先（缓存，断开重连不清） */
  private detectedScrollParent: Element | Window | null = null

  /** 拖拽持久化的自由定位坐标（left/top，相对视口） */
  private dragPos: { left: number; top: number } | null = null
  /** 是否已尝试读取 localStorage（幂等：draggable 移除再恢复时沿用已读结果） */
  private dragPosLoaded = false
  /** 进行中的拖拽会话 */
  private dragState:
    | { pointerId: number; startX: number; startY: number; startLeft: number; startTop: number; moved: boolean }
    | null = null
  /** 拖拽超阈值后抑制随之合成的一次 click（区分拖拽与点击） */
  private suppressClick = false

  constructor() {
    super()
    // 宿主级点击兜底：真实点击（按钮在 shadow 内冒泡到宿主）与 demo 探针的 DOM click
    // 兜底路径（隐藏态 0 命中区 → el.click()）都走这里，且随元素生命周期天然存活
    this.addEventListener('click', this.handleClick)
    // draggable 属性会开启浏览器原生拖拽，拦截 dragstart 让位给自研 pointer 拖拽
    this.addEventListener('dragstart', (e) => e.preventDefault())
    // 拖拽会话（pointer 捕获 + 移动定位 + 释放持久化）——监听宿主自身，不随断开丢失
    this.addEventListener('pointerdown', this.handlePointerDown)
    this.addEventListener('pointermove', this.handlePointerMove)
    this.addEventListener('pointerup', this.handlePointerUp)
    this.addEventListener('pointercancel', this.handlePointerCancel)
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <button class="btn" part="btn" type="button" aria-hidden="true">
        <span class="icon" part="icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" focusable="false">
            <path d="M8 13 V3 M4 7 L8 3 L12 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <span class="content" part="content"><slot></slot></span>
        <svg class="ring" part="ring" viewBox="0 0 40 40" aria-hidden="true" hidden>
          <circle class="ring-track" part="ring-track" cx="20" cy="20" r="${RING_RADIUS}" fill="none" stroke-dasharray="${RING_C}"></circle>
          <circle class="ring-bar" part="ring-bar" cx="20" cy="20" r="${RING_RADIUS}" fill="none" stroke-dasharray="${RING_C}" stroke-dashoffset="${RING_C}"></circle>
        </svg>
        <span class="tooltip" part="tooltip" role="tooltip" id="tip" aria-hidden="true" hidden></span>
        <span class="badge" part="badge" aria-hidden="true" hidden></span>
      </button>
    `
  }

  /** 缓存节点引用 + 绑定插槽监听 + 滚动监听（render 与水合路径共用） */
  private bind(): void {
    this.btn = this.shadow.querySelector<HTMLElement>('[part="btn"]')
    this.icon = this.shadow.querySelector<HTMLElement>('[part="icon"]')
    this.slotEl = this.shadow.querySelector<HTMLSlotElement>('slot')
    this.ring = this.shadow.querySelector<HTMLElement>('[part="ring"]')
    this.ringBar = this.shadow.querySelector<SVGElement>('[part="ring-bar"]')
    this.tooltipEl = this.shadow.querySelector<HTMLElement>('[part="tooltip"]')
    this.badgeEl = this.shadow.querySelector<HTMLElement>('[part="badge"]')
    // 插槽内容变化时同步箭头图标显隐
    this.slotEl?.addEventListener('slotchange', () => this.syncSlot())
    this.updateScrollTarget()
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（按钮存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.btn')) return false
    this.bind()
    return true
  }

  override connectedCallback(): void {
    super.connectedCallback()
    // teleport 挂载点：连接后把宿主迁移到目标容器下（默认 body）。
    // 时机见 scheduleTeleport：必须避开宿主框架的 SSR 水合窗口
    this.scheduleTeleport()
  }

  /** 是否已安排 teleport（防重入：重连时 load 监听与标志一起复位） */
  private teleportPending = false

  /**
   * append-to teleport 的执行时机：文档 load 完成后（文档已 loaded 则连接即迁移）。
   *
   * 为什么不能在 connectedCallback 里即时移动宿主：SSR 水合框架（Vue/React）按结构
   * 对比快照与水合 DOM，宿主在升级阶段（chunk 求值）就被移走，会让水合在 SSR 原位置
   * 找不到节点、目标容器多出节点 → 「Hydration completed but contains mismatches.」。
   * 而组件 chunk（customElements.define）与水合 chunk 的到达顺序是网络竞态，不能假设
   * 升级必然晚于水合。
   *
   * 本延迟是库级加固：对「插件期先注册组件、水合在挂载期完成」的宿主（水合通常先于
   * load）足以让迁移落在水合之后。注意 modulepreload 预取的 chunk 不延迟 load 事件，
   * 该场景下 load 可能早于水合——宿主集成方必须自行保证组件注册晚于水合（文档站的
   * theme 在 onMounted 后才 import 组件库，即为此约定）。
   *
   * 迁移延后无视觉差异：fixed 定位元素视觉与父节点无关。
   */
  private scheduleTeleport(): void {
    const to = this.getAttr('append-to', '')
    if (!to || this.teleportPending) return
    this.teleportPending = true
    const move = (): void => {
      this.teleportPending = false
      if (!this.isConnected) return
      try {
        const target = document.querySelector(to) ?? document.body
        if (target && target !== this.parentNode) target.appendChild(this)
      } catch {
        // 选择器非法 / DOM 层级异常：静默保持原位
      }
    }
    if (document.readyState === 'complete') {
      move()
      return
    }
    const onLoad = (): void => {
      window.removeEventListener('load', onLoad)
      move()
    }
    window.addEventListener('load', onLoad)
    this.onCleanup(() => {
      window.removeEventListener('load', onLoad)
      this.teleportPending = false
    })
  }

  private handleClick = (e: Event): void => {
    void e
    // 拖拽超阈值后浏览器会在捕获目标（宿主）上合成一次 click → 消费并复位
    if (this.suppressClick) {
      this.suppressClick = false
      return
    }
    if (!this.btn?.classList.contains('show')) return
    this.emit('click')
    this.scrollToEdge()
  }

  private handleScroll = (): void => {
    this.updateProgress()
    if (!this.hasAttr('visible')) this.syncScrollVisibility()
  }

  /**
   * 判定一个元素是否为可滚容器：computed overflow 为 auto/scroll/overlay
   * 且内容确实溢出（scrollHeight/scrollWidth > clientHeight/clientWidth）。
   * 两轴都查（overflow 简写在部分环境下不回写 overflowX/Y，兜底读简写本身）。
   */
  private isScrollContainer(el: Element): boolean {
    const cs = getComputedStyle(el)
    const h = el as HTMLElement
    const overflowY = cs.overflowY || cs.overflow
    const overflowX = cs.overflowX || cs.overflow
    if ((overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') && h.scrollHeight > h.clientHeight) {
      return true
    }
    if ((overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay') && h.scrollWidth > h.clientWidth) {
      return true
    }
    return false
  }

  /** 自宿主向上遍历，找最近可滚祖先；找不到回落 window */
  private detectScrollParent(): Element | Window {
    let el = this.parentElement
    while (el) {
      if (this.isScrollContainer(el)) return el
      el = el.parentElement
    }
    return window
  }

  private resolveScrollTarget(): Element | Window {
    const t = this.getAttr('target', '')
    if (t) {
      try {
        const el = document.querySelector(t)
        if (el) return el
      } catch {
        // 非法选择器：回落自动探测
      }
    }
    // target 缺省：自动探测最近可滚祖先，结果缓存（断开重连不清，避免重复遍历）
    if (this.detectedScrollParent == null) {
      this.detectedScrollParent = this.detectScrollParent()
    }
    return this.detectedScrollParent
  }

  /** 幂等绑定/切换滚动监听（target 属性变化时自动重挂；断开重连由 update 恢复） */
  private updateScrollTarget(): void {
    const next = this.resolveScrollTarget()
    if (next === this.scrollTarget && this.scrollListenerBound) return
    this.detachScrollListener()
    this.scrollTarget = next
    next.addEventListener('scroll', this.handleScroll, { passive: true })
    this.scrollListenerBound = true
    this.onCleanup(() => this.detachScrollListener())
  }

  private detachScrollListener(): void {
    if (!this.scrollListenerBound) return
    this.scrollTarget.removeEventListener('scroll', this.handleScroll)
    this.scrollListenerBound = false
  }

  private getScrollPos(): number {
    const t = this.scrollTarget
    if (t === window) {
      return Math.round(window.scrollY ?? document.documentElement.scrollTop ?? 0)
    }
    return Math.round((t as HTMLElement).scrollTop)
  }

  private getMaxScroll(): number {
    const t = this.scrollTarget
    if (t === window) {
      const doc = document.documentElement
      return Math.max(0, (doc.scrollHeight ?? 0) - (window.innerHeight ?? 0))
    }
    const el = t as HTMLElement
    return Math.max(0, el.scrollHeight - el.clientHeight)
  }

  private setScroll(top: number): void {
    const t = this.scrollTarget
    if (t === window) {
      window.scrollTo?.({ top, behavior: 'auto' })
      return
    }
    ;(t as HTMLElement).scrollTop = top
  }

  /** 受控（visible 属性存在）与否都不影响进度环与监听；显隐策略见 syncVisibility */
  private computeScrollShown(): boolean {
    // visibility-height=0 是合法的「滚动即显示」，不能用 || 兜底（会把 0 当缺失值）
    const raw = Number(this.getAttr('visibility-height', '400'))
    const threshold = Number.isFinite(raw) && raw >= 0 ? raw : 400
    const pos = this.getScrollPos()
    const max = this.getMaxScroll()
    if (this.hasAttr('reverse')) {
      // 反向模式：靠近容器底部时隐藏，否则显示（点击滚到底）
      return max > 0 && pos < max - threshold
    }
    return pos > threshold
  }

  private syncScrollVisibility(): void {
    this.setShownState(this.computeScrollShown())
  }

  private syncVisibility(): void {
    if (this.hasAttr('visible')) {
      this.setShownState(true)
      return
    }
    this.syncScrollVisibility()
  }

  /** 显隐状态统一入口：首次只落 DOM；后续变化落 DOM 并派发 oas-visibility-change */
  private setShownState(shown: boolean): void {
    if (!this.visibilityInit) {
      this.visibilityInit = true
      this.effectiveShown = shown
      this.applyShown(shown)
      return
    }
    if (shown === this.effectiveShown) {
      this.applyShown(shown)
      return
    }
    this.effectiveShown = shown
    this.applyShown(shown)
    this.emit('visibility-change', { visible: shown })
  }

  private applyShown(shown: boolean): void {
    const btn = this.btn
    if (!btn) return
    btn.setAttribute('aria-hidden', String(!shown))
    if (this.firstApply) {
      btn.classList.add('no-anim')
      const el = btn
      requestAnimationFrame(() => el.classList.remove('no-anim'))
      this.firstApply = false
    }
    btn.classList.toggle('show', shown)
    // 隐藏时宿主固定盒不拦截底层点击
    this.style.pointerEvents = shown ? '' : 'none'
  }

  private syncSlot(): void {
    if (!this.icon) return
    // 有 light DOM 子节点（插槽内容）时隐藏内置箭头
    this.icon.classList.toggle('hidden', this.childNodes.length > 0)
  }

  private scrollToEdge(): void {
    // duration=0 是合法的直接跳转（注意 Number('0')||400 会把 0 当缺失值）
    const raw = Number(this.getAttr('duration', '400'))
    const duration = Number.isFinite(raw) && raw >= 0 ? raw : 400
    const reduced = prefersReducedMotion()
    const max = this.getMaxScroll()
    const end = this.hasAttr('reverse') ? max : 0
    if (reduced || duration === 0) {
      this.setScroll(end)
      return
    }
    const start = this.getScrollPos()
    const range = end - start
    if (range === 0) return
    const easingName = this.getAttr('easing', 'quart-out')
    const easing = EASINGS[easingName] ?? EASINGS['quart-out']!
    const t0 = performance.now()
    cancelAnimationFrame(this.scrollRaf)
    const step = (now: number): void => {
      const p = Math.min(1, (now - t0) / duration)
      this.setScroll(start + range * easing(p))
      if (p < 1) {
        this.scrollRaf = requestAnimationFrame(step)
      }
    }
    this.scrollRaf = requestAnimationFrame(step)
    this.onCleanup(() => cancelAnimationFrame(this.scrollRaf))
  }

  private getProgressRatio(): number {
    const max = this.getMaxScroll()
    if (max <= 0) return 0
    const pos = this.getScrollPos()
    const ratio = Math.min(1, Math.max(0, pos / max))
    return this.hasAttr('reverse') ? 1 - ratio : ratio
  }

  private updateProgress(): void {
    const ring = this.ring
    if (!ring) return
    const show = this.hasAttr('show-progress')
    // SVG 元素的 hidden 属性在部分宿主上不反射，用属性开关显式控制
    ring.toggleAttribute('hidden', !show)
    if (!show) return
    if (this.ringBar) {
      this.ringBar.setAttribute('stroke-dashoffset', String(RING_C * (1 - this.getProgressRatio())))
    }
  }

  /** position 方位枚举 → 宿主定位；无 position 时走 bottom/right 数值定位 */
  private applyPosition(): void {
    const expand = this.hasAttr('expand')
    this.classList.toggle('expand', expand)
    // 清空旧定位残留
    this.style.top = ''
    this.style.bottom = ''
    this.style.left = ''
    this.style.right = ''
    this.style.margin = ''
    if (expand) {
      this.setAttribute('data-pos', 'bottom-center')
      this.style.left = '0'
      this.style.right = '0'
      this.style.bottom = '0'
      return
    }
    // draggable：有已持久化的自由坐标时用 left/top 记录的实际位置（忽略 bottom/right 预设）
    if (this.hasAttr('draggable') && this.dragPos) {
      this.setAttribute('data-pos', 'free')
      this.style.left = `${this.dragPos.left}px`
      this.style.top = `${this.dragPos.top}px`
      return
    }
    const pos = this.getAttr('position', '')
    const p = POSITIONS[pos]
    if (p) {
      this.setAttribute('data-pos', pos)
      if (p.top !== undefined) this.style.top = p.top
      if (p.bottom !== undefined) this.style.bottom = p.bottom
      if (p.left !== undefined) this.style.left = p.left
      if (p.right !== undefined) this.style.right = p.right
      if (p.centerX) {
        this.style.left = '0'
        this.style.right = '0'
        this.style.margin = '0 auto'
      }
      if (p.centerY) {
        this.style.top = '50%'
        this.style.marginTop = 'calc(var(--oas-back-top-size) / -2)'
      }
      return
    }
    this.setAttribute('data-pos', 'bottom-right')
    this.style.bottom = this.getAttr('bottom', '32px')
    this.style.right = this.getAttr('right', '32px')
  }

  // ---------- draggable 拖拽定位（pointer 捕获 + 自由定位 + 持久化） ----------

  /** 读取持久化位置（幂等；存储不可用/数据损坏时静默走默认定位） */
  private maybeRestoreDragPos(): void {
    if (this.dragPosLoaded || !this.hasAttr('draggable')) return
    this.dragPosLoaded = true
    try {
      const raw = window.localStorage.getItem(DRAG_POS_KEY)
      if (!raw) return
      const p = JSON.parse(raw) as { left?: unknown; top?: unknown }
      if (p && typeof p === 'object' && Number.isFinite(p.left) && Number.isFinite(p.top)) {
        this.dragPos = { left: p.left as number, top: p.top as number }
      }
    } catch {
      // 存储不可用 / 数据损坏：忽略，走默认定位
    }
  }

  private handlePointerDown = (e: PointerEvent): void => {
    if (!this.hasAttr('draggable')) return
    if (e.button !== 0) return
    // 新会话先复位抑制标记（上一次拖拽若被 pointercancel 中断可能残留）
    this.suppressClick = false
    const rect = this.getBoundingClientRect()
    this.dragState = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      moved: false,
    }
    this.classList.add('dragging')
    try {
      this.setPointerCapture(e.pointerId)
    } catch {
      // 环境不支持指针捕获：退化为移动/释放监听跟踪（无捕获也能完成拖拽）
    }
  }

  private handlePointerMove = (e: PointerEvent): void => {
    const d = this.dragState
    if (!d || e.pointerId !== d.pointerId) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    // 阈值内视为点击（不移动）；超过阈值进入拖拽
    if (!d.moved && Math.abs(dx) <= DRAG_THRESHOLD && Math.abs(dy) <= DRAG_THRESHOLD) return
    d.moved = true
    // 惯性边界夹取：left/top 夹在视口内（固定定位相对视口，拖出视口回夹）
    const maxX = Math.max(0, window.innerWidth - this.offsetWidth)
    const maxY = Math.max(0, window.innerHeight - this.offsetHeight)
    const left = Math.min(Math.max(0, d.startLeft + dx), maxX)
    const top = Math.min(Math.max(0, d.startTop + dy), maxY)
    this.dragPos = { left, top }
    this.style.left = `${left}px`
    this.style.top = `${top}px`
    this.style.bottom = ''
    this.style.right = ''
  }

  private endDrag(pointerId: number): void {
    if (!this.dragState || this.dragState.pointerId !== pointerId) return
    try {
      this.releasePointerCapture(pointerId)
    } catch {
      // 指针已失效：忽略释放失败
    }
    this.dragState = null
    this.classList.remove('dragging')
  }

  private handlePointerUp = (e: PointerEvent): void => {
    const d = this.dragState
    if (!d || e.pointerId !== d.pointerId) return
    if (d.moved) {
      // 超阈值是拖拽：抑制随后的合成 click，并持久化位置
      this.suppressClick = true
      this.persistDragPos()
    }
    this.endDrag(e.pointerId)
  }

  private handlePointerCancel = (e: PointerEvent): void => {
    const d = this.dragState
    if (!d || e.pointerId !== d.pointerId) return
    if (d.moved) this.persistDragPos()
    this.endDrag(e.pointerId)
  }

  private persistDragPos(): void {
    if (!this.dragPos) return
    try {
      window.localStorage.setItem(DRAG_POS_KEY, JSON.stringify(this.dragPos))
    } catch {
      // 存储不可用（隐私模式等）：位置仅本次会话生效
    }
  }

  protected override update(): void {
    const btn = this.btn
    if (!btn) return
    this.updateScrollTarget()
    // 按钮 aria-label locale 驱动（setLocale 切换自动重刷）
    btn.setAttribute('aria-label', this.t('backTop.backToTop'))
    // 变体属性
    this.setAttribute('data-shape', this.getAttr('shape', 'circle'))
    this.setAttribute('data-size', this.getAttr('size', 'medium'))
    this.setAttribute('data-theme', this.getAttr('theme', 'light'))
    this.setAttribute('data-transition', this.getAttr('transition', 'fade'))
    const expand = this.hasAttr('expand')
    btn.classList.toggle('expand', expand)
    // tooltip / badge
    const tipText = this.getAttr('tooltip', '')
    if (this.tooltipEl) {
      this.tooltipEl.hidden = !tipText
      if (tipText) this.tooltipEl.textContent = tipText
      // 读屏可达：tooltip 开启时 aria-describedby 关联按钮（SR 可读提示文本）；
      // 关闭时移除关联并恢复 aria-hidden（配合 hidden 双保险）
      this.tooltipEl.setAttribute('aria-hidden', tipText ? 'false' : 'true')
      if (tipText) btn.setAttribute('aria-describedby', this.tooltipEl.id)
      else btn.removeAttribute('aria-describedby')
    }
    const badgeText = this.getAttr('badge', '')
    if (this.badgeEl) {
      this.badgeEl.hidden = !badgeText
      if (badgeText) this.badgeEl.textContent = badgeText
    }
    // 插槽内容 → 箭头图标显隐
    this.syncSlot()
    // draggable：持久化位置恢复 + 拖拽态钩子 + touch-action:none（拖拽时禁止手势滚动）
    this.classList.toggle('draggable', this.hasAttr('draggable'))
    this.style.touchAction = this.hasAttr('draggable') ? 'none' : ''
    this.maybeRestoreDragPos()
    // 定位
    this.applyPosition()
    // 显隐（受控 / 非受控双模式）
    this.syncVisibility()
    // 进度环
    this.updateProgress()
  }
}
