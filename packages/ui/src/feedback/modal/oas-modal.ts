import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: none;
}
:host([visible]) {
  display: block;
}
.mask {
  position: fixed;
  inset: 0;
  background: var(--oas-color-overlay);
  z-index: var(--oas-z-modal, 1050);
}
.dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 360px;
  max-width: 90vw;
  background: var(--oas-color-bg);
  border-radius: var(--oas-radius-lg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: calc(var(--oas-z-modal, 1050) + 1);
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--oas-space-4);
  border-bottom: 1px solid var(--oas-color-border);
}
.title {
  font-weight: 600;
  font-size: var(--oas-font-size-lg);
}
.close-btn {
  cursor: pointer;
  border: none;
  background: none;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-secondary);
}
.body {
  padding: var(--oas-space-4);
  font-size: var(--oas-font-size-md);
  line-height: 1.6;
}
.footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--oas-space-2);
  padding: var(--oas-space-4);
  border-top: 1px solid var(--oas-color-border);
}
.btn {
  min-width: 64px;
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  font-size: var(--oas-font-size-md);
  cursor: pointer;
  font-family: inherit;
}
.btn[part='ok'] {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: #fff;
}
`

export class OASModal extends OASElement {
  static override get observedAttributes(): string[] {
    return ['visible', 'title', 'no-footer']
  }

  private previousFocus: HTMLElement | null = null
  private cleanupKeydown: (() => void) | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="mask" part="mask"></div>
      <div class="dialog" part="dialog" role="dialog" aria-modal="true" aria-labelledby="oas-modal-title">
        <div class="header">
          <span class="title" id="oas-modal-title" part="title"></span>
          <button class="close-btn" part="close" aria-label="关闭">✕</button>
        </div>
        <div class="body" part="body"><slot></slot></div>
        ${this.hasAttr('no-footer') ? '' : `
        <div class="footer" part="footer">
          <button class="btn" part="cancel" type="button">取消</button>
          <button class="btn" part="ok" type="button">确定</button>
        </div>`}
      </div>
    `
    this.update()
    this.bindEvents()
  }

  private bindEvents(): void {
    const dialog = this.shadow.querySelector('.dialog')!
    this.shadow.querySelector('.mask')?.addEventListener('click', () => {
      if (this.hasAttr('no-mask-close')) return
      this.emit('cancel')
    })
    this.shadow.querySelector('[part="cancel"]')?.addEventListener('click', () => this.emit('cancel'))
    this.shadow.querySelector('[part="ok"]')?.addEventListener('click', () => this.emit('ok'))
    this.shadow.querySelector('[part="close"]')?.addEventListener('click', () => this.emit('cancel'))
    dialog.addEventListener('click', (e: MouseEvent) => e.stopPropagation())

    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      this.emit('cancel')
    }
    document.addEventListener('keydown', onKey)
    this.cleanupKeydown = () => document.removeEventListener('keydown', onKey)
    this.onCleanup(() => this.cleanupKeydown?.())
  }

  protected override update(): void {
    const dialog = this.shadow.querySelector('.dialog')
    if (!dialog) return
    const visible = this.hasAttr('visible')
    dialog.setAttribute('aria-hidden', String(!visible))
    this.shadow.querySelector<HTMLElement>('.title')!.textContent = this.getAttr('title', '')
    const footer = this.shadow.querySelector<HTMLElement>('.footer')
    if (footer) footer.style.display = this.hasAttr('no-footer') ? 'none' : ''

    if (visible && this.cleanupKeydown) {
      this.previousFocus = document.activeElement as HTMLElement
      this.shadow.querySelector<HTMLElement>('[part="cancel"]')?.focus()
    } else if (!visible && this.previousFocus) {
      this.previousFocus.focus()
    }
  }
}
