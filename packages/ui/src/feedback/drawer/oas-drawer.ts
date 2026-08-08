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
  z-index: var(--oas-z-overlay, 1040);
}
.panel {
  position: fixed;
  top: 0;
  bottom: 0;
  width: 320px;
  max-width: 90vw;
  background: var(--oas-color-bg);
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.12);
  z-index: calc(var(--oas-z-overlay, 1040) + 1);
  display: flex;
  flex-direction: column;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
.panel[data-placement='left'] {
  left: 0;
}
.panel[data-placement='right'] {
  right: 0;
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
  flex: 1;
  overflow-y: auto;
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
`

export class OASDrawer extends OASElement {
  static override get observedAttributes(): string[] {
    return ['visible', 'title', 'placement', 'no-footer']
  }

  private previousFocus: HTMLElement | null = null
  private wasVisible = false

  protected override render(): void {
    const placement = this.getAttr('placement', 'right')
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="mask" part="mask"></div>
      <div class="panel" part="panel" role="dialog" aria-modal="true" data-placement="${placement}">
        <div class="header">
          <span class="title" part="title"></span>
          <button class="close-btn" part="close" aria-label="">✕</button>
        </div>
        <div class="body" part="body"><slot></slot></div>
        ${this.hasAttr('no-footer') ? '' : `
        <div class="footer" part="footer">
          <button class="btn" part="cancel" type="button"></button>
          <button class="btn" part="ok" type="button"></button>
        </div>`}
      </div>
    `
    this.update()
    this.bindEvents()
  }

  private bindEvents(): void {
    const panel = this.shadow.querySelector('.panel')
    panel?.addEventListener('click', (e) => e.stopPropagation())
    this.shadow.querySelector('.mask')?.addEventListener('click', () => {
      if (this.hasAttr('no-mask-close')) return
      this.close('close')
    })
    this.shadow.querySelector('[part="cancel"]')?.addEventListener('click', () => this.close('close'))
    this.shadow.querySelector('[part="close"]')?.addEventListener('click', () => this.close('close'))
    this.shadow.querySelector('[part="ok"]')?.addEventListener('click', () => this.close('ok'))

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') this.close('close')
    }
    document.addEventListener('keydown', onKey)
    this.onCleanup(() => document.removeEventListener('keydown', onKey))
  }

  /** 关闭/确认：属性驱动约定——组件自管状态属性，同时派发事件供宿主响应 */
  private close(action: 'ok' | 'close'): void {
    this.removeAttribute('visible')
    this.emit(action)
  }

  protected override update(): void {
    const panel = this.shadow.querySelector('.panel')
    if (!panel) return
    const visible = this.hasAttr('visible')
    panel.setAttribute('aria-hidden', String(!visible))
    this.shadow.querySelector<HTMLElement>('.title')!.textContent = this.getAttr('title', '')
    this.shadow.querySelector<HTMLElement>('.panel')!.setAttribute('data-placement', this.getAttr('placement', 'right'))
    // 内置文案走 locale registry（zh-CN 默认，setLocale 切换自动刷新）
    this.shadow.querySelector<HTMLElement>('[part="close"]')?.setAttribute('aria-label', this.t('drawer.close'))
    const okBtn = this.shadow.querySelector<HTMLElement>('[part="ok"]')
    const cancelBtn = this.shadow.querySelector<HTMLElement>('[part="cancel"]')
    if (okBtn) {
      okBtn.setAttribute('aria-label', this.t('drawer.ok'))
      okBtn.textContent = this.t('drawer.ok')
    }
    if (cancelBtn) {
      cancelBtn.setAttribute('aria-label', this.t('drawer.cancel'))
      cancelBtn.textContent = this.t('drawer.cancel')
    }

    // 焦点管理：仅在「隐藏 → 可见」转变时记录来源焦点并移入面板；
    // 关闭后归还焦点并清空，避免标题/文案变化时误覆盖来源记录。
    if (visible && !this.wasVisible) {
      this.wasVisible = true
      this.previousFocus = document.activeElement as HTMLElement
      this.shadow.querySelector<HTMLElement>('.close-btn')?.focus()
    } else if (!visible) {
      if (this.wasVisible) {
        this.previousFocus?.focus()
        this.previousFocus = null
      }
      this.wasVisible = false
    }
  }
}
