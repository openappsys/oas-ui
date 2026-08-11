import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

export interface SpeedDialAction {
  label: string
  icon?: string
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  position: fixed;
  bottom: var(--oas-space-6);
  right: var(--oas-space-6);
  z-index: var(--oas-z-fixed, 1030);
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
.fab .icon {
  transition: transform var(--oas-transition-base) var(--oas-ease-out);
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
`

/**
 * oas-speed-dial —— 悬浮主按钮 + 展开子动作。
 *
 * 属性（kebab-case）：
 * - `actions`：JSON `[{ label, icon? }]`
 * - `direction`：`up`/`down`/`left`/`right`（默认 up）
 * - `open`：展开态（受控）
 *
 * 事件（bubbles + composed）：
 * - `oas-select`：`{ index, label }`，选择子动作后自动收起
 * - `oas-open`：`{ open }`
 *
 * 边界：点击外部/Esc 收起；文档级监听仅在展开时挂载，断开连接清理，无孤儿浮层。
 */
export class OASSpeedDial extends OASElement {
  static override get observedAttributes(): string[] {
    return ['actions', 'direction', 'open']
  }

  private actionsList: SpeedDialAction[] = []
  private dial: HTMLElement | null = null
  private fab: HTMLButtonElement | null = null
  private actionsEl: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="dial" data-dir="up">
        <div class="actions" part="actions" role="group"></div>
        <button class="fab" part="fab" type="button" aria-expanded="false">
          <span class="icon" aria-hidden="true">＋</span>
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
    this.onCleanup(() => {
      document.removeEventListener('click', this.handleOutsideClick)
      document.removeEventListener('keydown', this.handleDocKeydown)
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
      btn.type = 'button'
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
    const dir = this.getAttr('direction', 'up')
    const valid = ['up', 'down', 'left', 'right'].includes(dir) ? dir : 'up'
    this.dial?.setAttribute('data-dir', valid)
  }

  private syncOpen(): void {
    const open = this.hasAttr('open')
    this.dial?.classList.toggle('open', open)
    this.fab?.setAttribute('aria-expanded', String(open))
    this.fab?.setAttribute('aria-label', this.t('speedDial.actions'))
    if (open) {
      // 展开时挂载文档级监听（收起/断开时移除，无孤儿监听）
      document.addEventListener('click', this.handleOutsideClick)
      document.addEventListener('keydown', this.handleDocKeydown)
      // 键盘可达：展开自动聚焦第一个子动作
      this.actionsEl?.querySelector<HTMLButtonElement>('.action')?.focus()
    } else {
      document.removeEventListener('click', this.handleOutsideClick)
      document.removeEventListener('keydown', this.handleDocKeydown)
    }
  }

  private toggle(): void {
    if (this.hasAttr('open')) this.close()
    else this.open()
  }

  private open(): void {
    this.setAttribute('open', '')
    this.emit('open', { open: true })
  }

  private close(): void {
    if (!this.hasAttr('open')) return
    this.removeAttribute('open')
    this.emit('open', { open: false })
  }

  private select(index: number, action: SpeedDialAction): void {
    this.emit('select', { index, label: action.label })
    this.close()
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    if (!this.hasAttr('open')) return
    if (e.composedPath().includes(this)) return
    this.close()
  }

  private handleDocKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return
    if (!this.hasAttr('open')) return
    this.close()
    this.fab?.focus()
  }
}
