import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  position: relative;
}
.popover {
  position: absolute;
  z-index: var(--oas-z-dropdown, 1000);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: var(--oas-space-3);
  min-width: 180px;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
}
.popover[data-position='top'] { bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); }
.popover[data-position='bottom'] { top: calc(100% + 8px); left: 50%; transform: translateX(-50%); }
.popover[data-position='left'] { right: calc(100% + 8px); top: 50%; transform: translateY(-50%); }
.popover[data-position='right'] { left: calc(100% + 8px); top: 50%; transform: translateY(-50%); }
.popover[aria-hidden='true'] { display: none; }
.title {
  margin-bottom: var(--oas-space-3);
  line-height: 1.5;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--oas-space-2);
}
.btn {
  min-width: 56px;
  height: var(--oas-control-height-sm);
  padding: 0 var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
  font-family: inherit;
}
.btn[part='ok'] {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: #fff;
}
`

export class OASPopconfirm extends OASElement {
  static override get observedAttributes(): string[] {
    return ['open', 'title', 'position']
  }

  private popoverEl: HTMLElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <slot></slot>
      <div class="popover" part="popover" role="dialog" data-position="${this.getAttr('position', 'top')}">
        <div class="title" part="title"></div>
        <div class="actions" part="actions">
          <button class="btn" part="cancel" type="button">取消</button>
          <button class="btn" part="ok" type="button">确定</button>
        </div>
      </div>
    `
    this.popoverEl = this.shadow.querySelector('.popover')
    this.addEventListener('click', (e: Event) => {
      const target = e.target as Node
      if (target && !this.shadow.contains(target)) this.toggle()
    })
    this.shadow.querySelector('[part="ok"]')?.addEventListener('click', () => {
      this.emit('ok')
      this.removeAttribute('open')
    })
    this.shadow.querySelector('[part="cancel"]')?.addEventListener('click', () => {
      this.emit('cancel')
      this.removeAttribute('open')
    })
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') this.removeAttribute('open')
    }
    document.addEventListener('keydown', onKey)
    this.onCleanup(() => document.removeEventListener('keydown', onKey))
    this.onCleanup(() => document.removeEventListener('click', this.handleOutside))
    this.update()
  }

  private toggle(): void {
    if (this.hasAttr('open')) this.removeAttribute('open')
    else this.setAttribute('open', '')
  }

  private handleOutside = (e: MouseEvent): void => {
    if (!this.hasAttr('open')) return
    const path = e.composedPath()
    if (!path.includes(this)) this.removeAttribute('open')
  }

  protected override update(): void {
    if (!this.popoverEl) return
    const open = this.hasAttr('open')
    this.popoverEl.setAttribute('aria-hidden', String(!open))
    this.popoverEl.setAttribute('data-position', this.getAttr('position', 'top'))
    this.shadow.querySelector<HTMLElement>('.title')!.textContent = this.getAttr('title', '')
    if (open) document.addEventListener('click', this.handleOutside)
    else document.removeEventListener('click', this.handleOutside)
  }
}
