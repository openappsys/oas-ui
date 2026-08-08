import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  pointer-events: auto;
  width: 320px;
  margin-bottom: var(--oas-space-3);
}
.box {
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: var(--oas-space-4);
}
.title-row {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
}
.title {
  flex: 1;
  font-weight: 600;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
}
.close {
  cursor: pointer;
  opacity: 0.6;
  border: none;
  background: none;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.description {
  margin-top: var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  line-height: 1.6;
}
.icon {
  font-size: var(--oas-font-size-lg);
  line-height: 1;
}
.icon[type='success'] { color: var(--oas-color-success); }
.icon[type='error'] { color: var(--oas-color-danger); }
.icon[type='warning'] { color: var(--oas-color-warning); }
`

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

const ICONS: Record<NotificationType, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✕',
}

export class OASNotification extends OASElement {
  static override get observedAttributes(): string[] {
    return ['type']
  }

  private timer: ReturnType<typeof setTimeout> | null = null

  protected override render(): void {
    const type = (this.getAttr('type', 'info') || 'info') as NotificationType
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="box" part="box" role="region" aria-label="">
        <div class="title-row">
          <span class="icon" part="icon" type="${type}" aria-hidden="true">${ICONS[type]}</span>
          <span class="title" part="title"></span>
          <button class="close" part="close" aria-label="">✕</button>
        </div>
        <div class="description" part="description"></div>
      </div>
    `
    const title = this.shadow.querySelector('.title')!
    const desc = this.shadow.querySelector('.description')!
    title.textContent = this.getAttr('title', '')
    desc.textContent = this.getAttr('description', '')
    this.shadow.querySelector<HTMLButtonElement>('.close')?.addEventListener('click', () => this.remove())
    const duration = Number(this.getAttr('duration', '4500'))
    if (duration > 0) {
      this.timer = setTimeout(() => this.remove(), duration)
    }
  }

  protected override update(): void {
    // 内置文案走 locale registry（zh-CN 默认，setLocale 切换自动刷新）
    this.shadow.querySelector<HTMLElement>('[part="box"]')?.setAttribute('aria-label', this.t('notification.region'))
    this.shadow.querySelector<HTMLElement>('[part="close"]')?.setAttribute('aria-label', this.t('notification.close'))
  }
}
