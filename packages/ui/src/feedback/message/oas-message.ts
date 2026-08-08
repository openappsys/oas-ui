import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  pointer-events: auto;
  max-width: 360px;
  margin-bottom: var(--oas-space-2);
}
.box {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-2) var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
}
.box[type='success'] {
  border-color: var(--oas-color-success);
  color: var(--oas-color-success);
}
.box[type='error'] {
  border-color: var(--oas-color-danger);
  color: var(--oas-color-danger);
}
.box[type='warning'] {
  border-color: var(--oas-color-warning);
  color: var(--oas-color-warning);
}
.text {
  flex: 1;
}
.close {
  cursor: pointer;
  opacity: 0.6;
  border: none;
  background: none;
  padding: 0 var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  color: inherit;
}
`

export type MessageType = 'info' | 'success' | 'warning' | 'error'

export class OASMessage extends OASElement {
  static override get observedAttributes(): string[] {
    return ['type']
  }

  private timer: ReturnType<typeof setTimeout> | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="box" part="box" role="${this.getAttr('type', 'info') === 'error' ? 'alert' : 'status'}">
        <span class="text" part="text"></span>
        <button class="close" part="close" aria-label="">✕</button>
      </div>
    `
    const text = this.shadow.querySelector('.text')!
    text.textContent = this.textContent
    this.shadow.querySelector<HTMLButtonElement>('.close')?.addEventListener('click', () => this.remove())
    const duration = Number(this.getAttr('duration', '3000'))
    if (duration > 0) {
      this.timer = setTimeout(() => this.remove(), duration)
    }
  }

  protected override update(): void {
    // 内置文案走 locale registry（zh-CN 默认，setLocale 切换自动刷新）
    this.shadow.querySelector<HTMLElement>('[part="close"]')?.setAttribute('aria-label', this.t('message.close'))
  }
}
