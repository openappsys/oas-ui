import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

export interface SpeedDialAction {
  label: string
  icon?: string
}

/** oas-open 收起/展开的来源标记：toggle=主钮点击 / outside=外部点击 / escape=Esc / select=选择子动作 / hover=悬停触发 */
export type SpeedDialOpenReason = 'toggle' | 'outside' | 'escape' | 'select' | 'hover'

/** hover 触发的离开宽限期（ms）：指针离开后短暂滞留防误收 */
const HOVER_LEAVE_GRACE = 120

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
  transition: opacity var(--oas-transition-base) var(--oas-ease-out);
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
/* 展开态级联：每个子动作 delay = index × 30ms 按序浮现（--cascade-i 渲染时内联写入）；
   收起时回落基础规则 delay 0（同步消失）——delay 只作用于「展开」方向的过渡 */
.dial.open .action {
  opacity: 1;
  transition-delay: calc(var(--cascade-i, 0) * 30ms);
}
/* 减少动效偏好：级联 delay 归零、子动作过渡停用（一次性出现，对齐可访问性） */
@media (prefers-reduced-motion: reduce) {
  .action {
    transition: none;
    transition-delay: 0ms;
  }
}
`

/**
 * oas-speed-dial —— 悬浮主按钮 + 展开子动作。
 *
 * 属性（kebab-case）：
 * - `actions`：JSON `[{ label, icon? }]`
 * - `direction`：`up`/`down`/`left`/`right`（默认 up）
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
    return ['actions', 'direction', 'open', 'trigger']
  }

  private actionsList: SpeedDialAction[] = []
  private dial: HTMLElement | null = null
  private fab: HTMLButtonElement | null = null
  private actionsEl: HTMLElement | null = null
  /** hover 离开宽限期计时器 */
  private hoverHideTimer: ReturnType<typeof setTimeout> | null = null
  /** hover 触发展开时置位：syncOpen 跳过「自动聚焦首项」，不抢焦点 */
  private skipFocusOnOpen = false

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
