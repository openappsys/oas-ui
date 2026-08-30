import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

export interface SpeedDialAction {
  label: string
  icon?: string
  /** 只渲染 icon 的圆形小钮形态；label 视觉隐藏，hover/focus 时作为气泡浮现（需配合 icon 使用） */
  'hide-label'?: boolean
}

/** oas-open 收起/展开的来源标记：toggle=主钮点击 / outside=外部点击 / escape=Esc / select=选择子动作 / hover=悬停触发 */
export type SpeedDialOpenReason = 'toggle' | 'outside' | 'escape' | 'select' | 'hover'

/** hover 触发的离开宽限期（ms）：指针离开后短暂滞留防误收 */
const HOVER_LEAVE_GRACE = 120

/** 展开几何：linear（默认，链式排布）/ circle（整圆）/ semi-circle（半圆）/ quarter-circle（四分之一圆） */
const VALID_GEOMETRY = ['linear', 'circle', 'semi-circle', 'quarter-circle'] as const
type Geometry = (typeof VALID_GEOMETRY)[number]

/** 圆弧半径默认值（px） */
const DEFAULT_RADIUS = 96

/** direction → 主方向数学角度（°）：0=正右，90=正上，-90=正下，180=正左（y 轴向上的极坐标） */
const DIR_ANGLE: Record<string, number> = { up: 90, right: 0, down: -90, left: 180 }

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  position: fixed;
  bottom: var(--oas-space-6);
  right: var(--oas-space-6);
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-fixed, 1030));
}
:host([hidden]) {
  display: none;
}
.dial {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.fab {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
  font-size: var(--oas-font-size-xl);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  font-family: inherit;
  z-index: 2;
}
.fab:hover {
  background: var(--oas-color-primary-hover);
}
.fab:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 主钮图标容器（默认 ＋ 或自定义 slot 内容共用）：展开时旋转 45°，两种内容一致 */
.fab .icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--oas-transition-base) var(--oas-ease-out);
}
/* 自定义图标（默认插槽内容）：约束为 1em，避免撑破圆形主钮 */
.fab .icon ::slotted(svg) {
  display: block;
  width: 1em;
  height: 1em;
}
.dial.open .fab .icon {
  transform: rotate(45deg);
}
.actions {
  position: absolute;
  display: flex;
  gap: var(--oas-space-2);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity var(--oas-transition-base) var(--oas-ease-out),
    transform var(--oas-transition-base) var(--oas-ease-out),
    visibility var(--oas-transition-base);
  z-index: 1;
}
.dial.open .actions {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}
.action {
  appearance: none;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-2);
  min-height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  /* 级联浮现：收起态 delay 0（同步消失）；展开态由 .dial.open .action 按 --cascade-i 递增 */
  opacity: 0;
  transition: opacity var(--oas-transition-base) var(--oas-ease-out),
    transform var(--oas-transition-base) var(--oas-ease-out);
  transition-delay: 0ms;
}
.action:hover {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
.action:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.action .icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
}
.action .icon svg {
  display: block;
  width: 1em;
  height: 1em;
}
/* hide-label（icon-only）：圆形小钮，仅显示图标；label 常驻 DOM 但视觉隐藏，
   hover/focus-visible 时切换为绝对定位气泡浮现（纯 CSS 转场，无 JS 浮层） */
.action.icon-only {
  position: relative;
  width: var(--oas-control-height-md);
  height: var(--oas-control-height-md);
  padding: 0;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
  font-size: var(--oas-font-size-md);
}
.action.icon-only .label {
  position: absolute;
  padding: var(--oas-space-1) var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-tooltip-bg, var(--oas-color-text-primary));
  color: var(--oas-tooltip-color, var(--oas-color-bg));
  font-size: var(--oas-font-size-sm);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity var(--oas-transition-base) var(--oas-ease-out),
    visibility var(--oas-transition-base);
  z-index: 5;
}
/* 气泡浮现：hover（指针）与 focus-visible（键盘/触屏聚焦）都可见；仅展开态作用 */
.dial.open .action.icon-only:hover .label,
.dial.open .action.icon-only:focus-visible .label {
  opacity: 1;
  visibility: visible;
}
/* 气泡定位随展开方向自适应（定位于动作外侧，不遮挡相邻动作）：
   up 展开 → 动作左侧；down 展开 → 动作右侧；left/right 展开 → 动作上方 */
.dial[data-dir='up'] .action.icon-only .label {
  right: calc(100% + var(--oas-space-2));
  top: 50%;
  transform: translateY(-50%);
}
.dial[data-dir='down'] .action.icon-only .label {
  left: calc(100% + var(--oas-space-2));
  top: 50%;
  transform: translateY(-50%);
}
.dial[data-dir='left'] .action.icon-only .label {
  bottom: calc(100% + var(--oas-space-2));
  left: 50%;
  transform: translateX(-50%);
}
.dial[data-dir='right'] .action.icon-only .label {
  bottom: calc(100% + var(--oas-space-2));
  left: 50%;
  transform: translateX(-50%);
}
/* 方向布局：首个子动作始终最靠近主按钮 */
.dial[data-dir='up'] .actions {
  bottom: calc(100% + var(--oas-space-2));
  flex-direction: column-reverse;
  transform: translateY(8px);
}
.dial[data-dir='down'] .actions {
  top: calc(100% + var(--oas-space-2));
  flex-direction: column;
  transform: translateY(-8px);
}
.dial[data-dir='left'] .actions {
  right: calc(100% + var(--oas-space-2));
  flex-direction: row-reverse;
  transform: translateX(8px);
}
.dial[data-dir='right'] .actions {
  left: calc(100% + var(--oas-space-2));
  flex-direction: row;
  transform: translateX(-8px);
}
.dial.open .actions {
  transform: translate(0, 0);
}
/* 圆弧几何展开（.arc 由 JS 按 geometry !== linear 挂在宿主）：
   容器铺满主按钮区域作圆心（覆盖线性 data-dir 的偏移定位），子动作绝对定位堆叠圆心，
   展开时沿各自圆周偏移（--t-x/--t-y 由 JS 按 geometry/radius/direction/index 计算） */
:host(.arc) .dial[data-dir] .actions {
  inset: 0;
  transform: none;
}
:host(.arc) .dial .action {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  /* 圆弧模式下动作只沿圆周偏移，不参与 flex 链式排布 */
  flex-shrink: 0;
}
:host(.arc) .dial.open .action {
  transform: translate(calc(var(--t-x, 0px) - 50%), calc(var(--t-y, 0px) - 50%));
}
/* 展开态级联：每个子动作 delay = index × 30ms 按序浮现（--cascade-i 渲染时内联写入）；
   收起时回落基础规则 delay 0（同步消失）——delay 只作用于「展开」方向的过渡 */
.dial.open .action {
  opacity: 1;
  transition-delay: calc(var(--cascade-i, 0) * 30ms);
}
/* 减少动效偏好：级联 delay 归零、子动作与气泡过渡停用（一次性出现，对齐可访问性） */
@media (prefers-reduced-motion: reduce) {
  .action {
    transition: none;
    transition-delay: 0ms;
  }
  .action.icon-only .label {
    transition: none;
  }
}
`

/**
 * oas-speed-dial —— 悬浮主按钮 + 展开子动作。
 *
 * 属性（kebab-case）：
 * - `actions`：JSON `[{ label, icon?, 'hide-label'? }]`——`hide-label: true` 时子动作
 *   只渲染 icon 为圆形小钮，label 视觉隐藏并在 hover/focus-visible 时作为气泡浮现；
 *   无 icon 的 hide-label 动作回落显示 label（渲染降级，console.warn 告警一次）
 * - `direction`：`up`/`down`/`left`/`right`（默认 up）
 * - `geometry`：展开几何 `linear`（默认，链式排布）/ `circle`（整圆，从正上均分）/
 *   `semi-circle`（半圆，以 `direction` 为轴 180° 张开）/ `quarter-circle`
 *   （90° 起始象限随 direction：up=左上、down=右下、left=左下、right=右上）；非法值回落 linear
 * - `radius`：圆弧半径（px，默认 96，非法值回落 96；仅 geometry 非 linear 时生效）
 * - `open`：展开态（受控）
 * - `trigger`：`click`（默认）| `hover`——hover 派 mouseenter 展开、mouseleave 收起（120ms 离开宽限期），触屏自动回落 click
 *
 * 事件（bubbles + composed）：
 * - `oas-select`：`{ index, label }`，选择子动作后自动收起
 * - `oas-open`：`{ open, reason }`，reason = toggle/outside/escape/select/hover
 *
 * 插槽：
 * - 默认插槽：主钮自定义图标，有内容时替代默认 ＋（展开旋转 45° 保持）
 *
 * 键盘：
 * - Esc 收起回焦主钮；actions 容器 role="menu"（子动作 role="menuitem"），
 *   方向键导航：纵向（up/down）ArrowUp/ArrowDown、横向（left/right）ArrowLeft/ArrowRight，循环 + Home/End
 *
 * 动效（内建，无属性）：展开时子动作按序级联浮现（每项 delay = index × 30ms），收起时同步消失；
 * `prefers-reduced-motion` 下级联 delay 归零、过渡停用。
 *
 * 边界：点击外部/Esc 收起；文档级监听仅在展开时挂载，断开连接清理，无孤儿浮层。
 */
export class OASSpeedDial extends OASElement {
  static override get observedAttributes(): string[] {
    return ['actions', 'direction', 'open', 'trigger', 'geometry', 'radius']
  }

  private actionsList: SpeedDialAction[] = []
  private dial: HTMLElement | null = null
  private fab: HTMLButtonElement | null = null
  private actionsEl: HTMLElement | null = null
  /** 展开几何（合法化后的值，linear 默认） */
  private geometry: Geometry = 'linear'
  /** 圆弧半径（px，合法化后，非法回落 96） */
  private radius: number = DEFAULT_RADIUS
  /** hover 离开宽限期计时器 */
  private hoverHideTimer: ReturnType<typeof setTimeout> | null = null
  /** hover 触发展开时置位：syncOpen 跳过「自动聚焦首项」，不抢焦点 */
  private skipFocusOnOpen = false
  /** hide-label 但无可渲染 icon 的降级告警：只告警一次 */
  private hideLabelFallbackWarned = false

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="dial" data-dir="up">
        <div class="actions" part="actions" role="menu"></div>
        <button class="fab" part="fab" type="button" aria-expanded="false">
          <span class="icon" aria-hidden="true"><slot>＋</slot></span>
        </button>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.dial = this.shadow.querySelector('.dial')
    this.fab = this.shadow.querySelector('.fab')
    this.actionsEl = this.shadow.querySelector('.actions')
    this.fab?.addEventListener('click', () => this.toggle())
    // hover 触发：悬停宿主（含主钮）开、移出宿主/面板关；面板入/出也监听，
    // 使悬停区域 = 宿主 + 面板（跨 gap 移动不闪关，宽限期内回入不收起）
    this.addEventListener('mouseenter', this.onHoverEnter)
    this.addEventListener('mouseleave', this.onHoverLeave)
    this.actionsEl?.addEventListener('mouseenter', this.onPanelEnter)
    this.actionsEl?.addEventListener('mouseleave', this.onPanelLeave)
    // 方向键导航：焦点在子动作上时 keydown 冒泡到 actions 容器
    this.actionsEl?.addEventListener('keydown', this.handleActionsKeydown)
    this.onCleanup(() => {
      document.removeEventListener('click', this.handleOutsideClick, true)
      document.removeEventListener('keydown', this.handleDocKeydown)
      if (this.hoverHideTimer) {
        clearTimeout(this.hoverHideTimer)
        this.hoverHideTimer = null
      }
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（fab 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.fab')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.parseActions()
    this.syncDirection()
    this.syncGeometry()
    this.syncOpen()
  }

  private parseActions(): void {
    try {
      const parsed = JSON.parse(this.getAttr('actions', '[]'))
      this.actionsList = Array.isArray(parsed)
        ? parsed.filter((a): a is SpeedDialAction => !!a && typeof a.label === 'string')
        : []
    } catch {
      this.actionsList = []
    }
    this.renderActions()
  }

  private renderActions(): void {
    const actionsEl = this.actionsEl
    if (!actionsEl) return
    actionsEl.innerHTML = ''
    this.actionsList.forEach((action, index) => {
      const btn = document.createElement('button')
      btn.className = 'action'
      btn.setAttribute('part', 'action')
      btn.setAttribute('role', 'menuitem')
      btn.type = 'button'
      // 级联动画步进：展开时 delay = index × 30ms（CSS 侧 calc(var(--cascade-i) * 30ms) 消费）
      btn.style.setProperty('--cascade-i', String(index))
      btn.addEventListener('click', () => this.select(index, action))
      // hide-label（icon-only）：仅当 icon 真实可渲染才有意义；否则回落显示 label（降级告警一次）
      const iconOnly = action['hide-label'] === true
      const hasRenderableIcon = !!action.icon && !!iconRegistry[action.icon as IconName]
      if (iconOnly && hasRenderableIcon) {
        btn.classList.add('icon-only')
        // 可访问名 = label 文本（label 视觉隐藏但读屏可达）
        btn.setAttribute('aria-label', action.label)
      } else if (iconOnly) {
        this.warnHideLabelFallback()
      }
      if (action.icon) {
        const ic = this.createIcon(action.icon)
        if (ic) btn.appendChild(ic)
      }
      const label = document.createElement('span')
      label.className = 'label'
      label.textContent = action.label
      btn.appendChild(label)
      actionsEl.appendChild(btn)
    })
  }

  /** hide-label 但无可渲染 icon 的渲染降级：回落显示 label，console.warn 告警一次 */
  private warnHideLabelFallback(): void {
    if (this.hideLabelFallbackWarned) return
    this.hideLabelFallbackWarned = true
    console.warn(
      '[oas-speed-dial] 子动作设置了 hide-label 但缺少可渲染的 icon，已回落为显示 label（icon-only 形态需要 icon）',
    )
  }

  /** 用 iconRegistry 渲染图标（内联 SVG，跟随 currentColor） */
  private createIcon(icon: string): HTMLElement | null {
    const content = iconRegistry[icon as IconName]
    if (!content) return null
    const span = document.createElement('span')
    span.className = 'icon'
    span.setAttribute('aria-hidden', 'true')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('width', '1em')
    svg.setAttribute('height', '1em')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    svg.innerHTML = content
    span.appendChild(svg)
    return span
  }

  private syncDirection(): void {
    this.dial?.setAttribute('data-dir', this.validDirection())
  }

  /** direction 合法化：非法值回退 up */
  private validDirection(): string {
    const dir = this.getAttr('direction', 'up')
    return ['up', 'down', 'left', 'right'].includes(dir) ? dir : 'up'
  }

  // —— 圆弧几何展开 ——

  /** geometry 合法化：非法值回落 linear（零回归） */
  private validGeometry(): Geometry {
    const g = this.getAttr('geometry', 'linear')
    return (VALID_GEOMETRY as readonly string[]).includes(g) ? (g as Geometry) : 'linear'
  }

  /** radius 合法化：非数字/负数回落默认 96 */
  private validRadius(): number {
    const raw = parseFloat(this.getAttr('radius', String(DEFAULT_RADIUS)))
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_RADIUS
  }

  /** 同步几何态：宿主 data-geometry / arc 类 + 每个动作的圆弧偏移（--t-x/--t-y） */
  private syncGeometry(): void {
    this.geometry = this.validGeometry()
    this.radius = this.validRadius()
    this.dial?.setAttribute('data-geometry', this.geometry)
    // 宿主 arc 类驱动圆弧 CSS（linear 时移除，零回归）
    this.classList.toggle('arc', this.geometry !== 'linear')
    const btns = this.actionButtons()
    btns.forEach((btn, i) => {
      const [tx, ty] = this.arcOffset(i, btns.length)
      btn.style.setProperty('--t-x', `${tx}px`)
      btn.style.setProperty('--t-y', `${ty}px`)
    })
  }

  /**
   * 第 index 个动作的圆弧偏移（translate px）。linear 恒为 [0,0]。
   *
   * 角度规则（数学极坐标，0°=正右、90°=正上，顺时针均分；CSS 转换 y 取反）：
   * - circle：从正上（90°）开始，360°/N 均分；
   * - semi-circle：以 direction 主方向为轴心的 180° 半圆，从「主方向-90°」扫到「主方向+90°」
   *   （up=上半圆 / down=下半圆 / left=左半圆 / right=右半圆）；
   * - quarter-circle：90° 起始象限随 direction——up=左上、down=右下、left=左下、right=右上
   *   （即半圆的后半段，首项在主方向、末项在相邻轴）。
   */
  private arcOffset(index: number, count: number): [number, number] {
    if (this.geometry === 'linear' || count === 0) return [0, 0]
    const rad = (deg: number): number => (deg * Math.PI) / 180
    const base = DIR_ANGLE[this.validDirection()] ?? 90
    let angle: number
    if (this.geometry === 'circle') {
      angle = 90 - (index * 360) / count
    } else if (this.geometry === 'semi-circle') {
      angle = count === 1 ? base : base - 90 + (index * 180) / (count - 1)
    } else {
      // quarter-circle
      angle = count === 1 ? base : base + (index * 90) / (count - 1)
    }
    const a = rad(angle)
    return [Math.round(this.radius * Math.cos(a)), Math.round(-this.radius * Math.sin(a))]
  }

  /** trigger 是否启用 hover 行为：trigger="hover" 且非触屏（coarse 回落 click） */
  private isHoverTrigger(): boolean {
    if (this.getAttr('trigger', 'click') !== 'hover') return false
    if (this.isCoarsePointer()) return false
    return true
  }

  /** 触屏检测（pointer: coarse）：触屏下 hover 行为不可靠，自动回落 click */
  private isCoarsePointer(): boolean {
    if (typeof window.matchMedia !== 'function') return false
    return window.matchMedia('(pointer: coarse)').matches
  }

  /** 指针/焦点移到的目标是否仍在「宿主 + 面板」区域内（跨 shadow 时 relatedTarget 已 retarget 到 shadow host） */
  private hoverTargetInside(rel: EventTarget | null): boolean {
    return !!rel && rel instanceof Node && (this.contains(rel) || this.shadow.contains(rel))
  }

  private syncOpen(): void {
    const open = this.hasAttr('open')
    this.dial?.classList.toggle('open', open)
    this.fab?.setAttribute('aria-expanded', String(open))
    this.fab?.setAttribute('aria-label', this.t('speedDial.actions'))
    if (open) {
      // 展开时挂载文档级监听（收起/断开时移除，无孤儿监听）
      document.addEventListener('click', this.handleOutsideClick, true)
      document.addEventListener('keydown', this.handleDocKeydown)
      // 键盘可达：展开自动聚焦第一个子动作（hover 触发展开不抢焦点）
      if (!this.skipFocusOnOpen) {
        this.actionsEl?.querySelector<HTMLButtonElement>('.action')?.focus()
      }
    } else {
      document.removeEventListener('click', this.handleOutsideClick, true)
      document.removeEventListener('keydown', this.handleDocKeydown)
    }
    this.skipFocusOnOpen = false
  }

  private toggle(): void {
    if (this.hasAttr('open')) this.close('toggle')
    else this.open('toggle')
  }

  private open(reason: SpeedDialOpenReason): void {
    if (this.hasAttr('open')) return
    this.skipFocusOnOpen = reason === 'hover'
    this.setAttribute('open', '')
    this.emit('open', { open: true, reason })
  }

  private close(reason: SpeedDialOpenReason): void {
    if (!this.hasAttr('open')) return
    this.removeAttribute('open')
    this.emit('open', { open: false, reason })
  }

  private select(index: number, action: SpeedDialAction): void {
    this.emit('select', { index, label: action.label })
    this.close('select')
  }

  // —— hover 触发 ——

  private onHoverEnter = (): void => {
    if (!this.isHoverTrigger()) return
    this.clearHoverHide()
    this.open('hover')
  }

  private onHoverLeave = (e: MouseEvent): void => {
    if (!this.isHoverTrigger()) return
    // 移到面板（shadow 内）不算离开：悬停区域 = 宿主 + 面板
    if (this.hoverTargetInside(e.relatedTarget)) return
    this.clearHoverHide()
    this.hoverHideTimer = setTimeout(() => this.close('hover'), HOVER_LEAVE_GRACE)
  }

  private onPanelEnter = (): void => {
    if (!this.isHoverTrigger()) return
    this.clearHoverHide()
  }

  private onPanelLeave = (e: MouseEvent): void => {
    if (!this.isHoverTrigger()) return
    if (this.hoverTargetInside(e.relatedTarget)) return
    this.clearHoverHide()
    this.hoverHideTimer = setTimeout(() => this.close('hover'), HOVER_LEAVE_GRACE)
  }

  private clearHoverHide(): void {
    if (this.hoverHideTimer) {
      clearTimeout(this.hoverHideTimer)
      this.hoverHideTimer = null
    }
  }

  // —— 方向键导航 ——

  private actionButtons(): HTMLButtonElement[] {
    if (!this.actionsEl) return []
    return [...this.actionsEl.querySelectorAll<HTMLButtonElement>('.action')]
  }

  private handleActionsKeydown = (e: KeyboardEvent): void => {
    if (!this.hasAttr('open')) return
    const btns = this.actionButtons()
    if (btns.length === 0) return
    // 方向键轴与展开方向对齐：纵向用 ArrowUp/Down，横向用 ArrowLeft/Right
    const vertical = this.validDirection() === 'up' || this.validDirection() === 'down'
    const nextKey = vertical ? 'ArrowDown' : 'ArrowRight'
    const prevKey = vertical ? 'ArrowUp' : 'ArrowLeft'
    let idx = btns.indexOf(this.shadow.activeElement as HTMLButtonElement)
    if (e.key === nextKey) {
      e.preventDefault()
      idx = (idx + 1) % btns.length
    } else if (e.key === prevKey) {
      e.preventDefault()
      idx = (idx - 1 + btns.length) % btns.length
    } else if (e.key === 'Home') {
      e.preventDefault()
      idx = 0
    } else if (e.key === 'End') {
      e.preventDefault()
      idx = btns.length - 1
    } else {
      return
    }
    btns[idx]?.focus()
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    if (!this.hasAttr('open')) return
    if (e.composedPath().includes(this)) return
    this.close('outside')
  }

  private handleDocKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return
    if (!this.hasAttr('open')) return
    this.close('escape')
    this.fab?.focus()
  }
}
