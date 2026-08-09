import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
.box {
  position: fixed;
  left: 50%;
  transform: translate(-50%, 0);
  z-index: var(--oas-z-message, 1060);
  display: flex;
  align-items: center;
  gap: var(--oas-space-3);
  padding: var(--oas-space-2) var(--oas-space-4);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-elevated);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
  transition:
    transform var(--oas-transition-base) var(--oas-ease-out),
    opacity var(--oas-transition-base) var(--oas-ease-out);
  pointer-events: auto;
}
:host([direction='bottom']) .box {
  bottom: var(--snackbar-offset, 24px);
}
:host([direction='top']) .box {
  top: var(--snackbar-offset, 24px);
}
/* 关闭态：平移出场并不可交互 */
:host(:not([open])) .box {
  opacity: 0;
  pointer-events: none;
}
:host([direction='bottom']:not([open])) .box {
  transform: translate(-50%, 24px);
}
:host([direction='top']:not([open])) .box {
  transform: translate(-50%, -24px);
}
.message {
  flex: 1;
  min-width: 0;
  line-height: 1.5;
}
.action-btn {
  flex-shrink: 0;
  border: none;
  background: none;
  padding: var(--oas-space-1) var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-sm);
  font-weight: 600;
  color: var(--oas-color-primary);
  cursor: pointer;
  font-family: inherit;
}
.action-btn:hover {
  background: var(--oas-color-bg-hover);
}
`

/** 堆叠上限：最多同时 3 条在屏，超出时最老的一条收到 oas-close */
const OPEN_MAX = 3
const openList: OASSnackbar[] = []

function trackOpen(el: OASSnackbar): void {
  if (openList.includes(el)) return
  openList.push(el)
  while (openList.length > OPEN_MAX) {
    const oldest = openList.shift()
    oldest?.requestDismiss()
  }
}

function untrackOpen(el: OASSnackbar): void {
  const i = openList.indexOf(el)
  if (i >= 0) openList.splice(i, 1)
}

export class OASSnackbar extends OASElement {
  static override get observedAttributes(): string[] {
    return ['open', 'message', 'action-text', 'duration', 'direction', 'offset']
  }

  private timer: ReturnType<typeof setTimeout> | null = null
  private opened = false

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="box" part="box" role="status" aria-hidden="true">
        <span class="message" part="message" id="oas-snackbar-message"></span>
        <button class="action-btn" part="action" type="button" hidden></button>
      </div>
    `
    this.shadow
      .querySelector<HTMLButtonElement>('[part="action"]')
      ?.addEventListener('click', () => this.emit('action'))
    this.onCleanup(() => {
      this.clearTimer()
      if (this.opened) {
        this.opened = false
        untrackOpen(this)
      }
    })
  }

  /** 堆叠超限时最老的一条被挤下（受控模式：仅派发 oas-close，由外部负责移除 open） */
  requestDismiss(): void {
    this.clearTimer()
    untrackOpen(this)
    this.emit('close')
  }

  protected override update(): void {
    const box = this.shadow.querySelector<HTMLElement>('[part="box"]')
    if (!box) return
    const open = this.hasAttr('open')
    const hasAction = this.getAttr('action-text', '') !== ''

    // ARIA：无 action → status；有 action → alertdialog + assertive
    box.setAttribute('role', hasAction ? 'alertdialog' : 'status')
    if (hasAction) box.setAttribute('aria-live', 'assertive')
    else box.removeAttribute('aria-live')
    box.setAttribute('aria-hidden', String(!open))
    if (hasAction) box.setAttribute('aria-labelledby', 'oas-snackbar-message')
    else box.removeAttribute('aria-labelledby')

    this.shadow.querySelector<HTMLElement>('[part="message"]')!.textContent = this.getAttr(
      'message',
      '',
    )
    const actionBtn = this.shadow.querySelector<HTMLElement>('[part="action"]')
    if (actionBtn) {
      actionBtn.hidden = !hasAction
      actionBtn.textContent = this.getAttr('action-text', '')
    }

    // offset：写 CSS 变量，由 .box 消费
    const offset = this.getAttr('offset', '24')
    this.style.setProperty('--snackbar-offset', `${offset}px`)

    // open 状态迁移（受控：组件不自改 open，只发事件供外部驱动）
    if (open && !this.opened) {
      this.opened = true
      trackOpen(this)
      this.startTimer()
      this.emit('open')
    } else if (!open && this.opened) {
      this.opened = false
      untrackOpen(this)
      this.clearTimer()
    }
  }

  private startTimer(): void {
    this.clearTimer()
    const duration = Number(this.getAttr('duration', '4000'))
    if (duration <= 0) return
    this.timer = setTimeout(() => {
      this.clearTimer()
      if (!this.opened) return
      this.opened = false
      untrackOpen(this)
      this.emit('close')
    }, duration)
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }
}
