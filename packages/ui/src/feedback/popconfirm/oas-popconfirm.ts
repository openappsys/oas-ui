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
          <button class="btn" part="cancel" type="button"></button>
          <button class="btn" part="ok" type="button"></button>
        </div>
      </div>
    `
    this.popoverEl = this.shadow.querySelector('.popover')
    this.addEventListener('click', (e: Event) => {
      // 用 composedPath 取原始 target：element.click()/键盘激活派发的合成 click 事件
      // composed=false，跨出 shadow boundary 时会被 retarget 成 host 自身，
      // 若读 e.target 会把「点按钮关闭」误判成「点外部切换」，导致 open 反复翻转。
      const origin = e.composedPath()[0] as Node | undefined
      if (origin && !this.shadow.contains(origin)) this.toggle()
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
    // 内置文案走 locale registry（zh-CN 默认，setLocale 切换自动刷新）
    this.shadow.querySelector<HTMLElement>('[part="ok"]')!.textContent = this.t('popconfirm.ok')
    this.shadow.querySelector<HTMLElement>('[part="cancel"]')!.textContent = this.t('popconfirm.cancel')
    if (open) document.addEventListener('click', this.handleOutside)
    else document.removeEventListener('click', this.handleOutside)
  }
}
