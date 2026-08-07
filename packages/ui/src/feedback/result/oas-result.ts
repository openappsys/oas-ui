import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  text-align: center;
  padding: var(--oas-space-6);
  color: var(--oas-color-text-primary);
}
.icon {
  width: 72px;
  height: 72px;
  margin: 0 auto var(--oas-space-4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  line-height: 1;
}
.icon[data-status='success'] { color: var(--oas-color-success); }
.icon[data-status='error'] { color: var(--oas-color-danger); }
.icon[data-status='warning'] { color: var(--oas-color-warning); }
.icon[data-status='info'] { color: var(--oas-color-primary); }
.title {
  font-size: var(--oas-font-size-xl);
  font-weight: 600;
}
.description {
  margin-top: var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
::slotted([slot='extra']) {
  margin-top: var(--oas-space-4);
  display: inline-block;
}
`

const ICONS: Record<string, string> = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i',
}

export class OASResult extends OASElement {
  static override get observedAttributes(): string[] {
    return ['status', 'title', 'description']
  }

  protected override render(): void {
    const status = this.getAttr('status', 'success')
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="icon" part="icon" data-status="${status}" role="status" aria-label="${status}">${ICONS[status] ?? '✓'}</div>
      <div class="title" part="title"></div>
      <div class="description" part="description"></div>
      <slot name="extra"></slot>
    `
    this.update()
  }

  protected override update(): void {
    const icon = this.shadow.querySelector('[part="icon"]')
    icon?.setAttribute('data-status', this.getAttr('status', 'success'))
    this.shadow.querySelector<HTMLElement>('[part="title"]')!.textContent = this.getAttr('title', '')
    this.shadow.querySelector<HTMLElement>('[part="description"]')!.textContent = this.getAttr('description', '')
  }
}
