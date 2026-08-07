import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  padding: var(--oas-space-4) var(--oas-space-5);
  color: var(--oas-color-text-primary);
}
.row {
  display: flex;
  align-items: center;
  gap: var(--oas-space-3);
}
.back {
  border: none;
  background: none;
  font-size: var(--oas-font-size-lg);
  cursor: pointer;
  color: var(--oas-color-text-primary);
  padding: 0;
}
.title {
  font-size: var(--oas-font-size-xl);
  font-weight: 600;
  flex: 1;
}
.extra {
  display: flex;
  gap: var(--oas-space-2);
}
`

export class OASPageHeader extends OASElement {
  static override get observedAttributes(): string[] {
    return ['title', 'back', 'subtitle']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="row" part="row">
        ${this.hasAttr('back') ? '<button class="back" part="back" aria-label="返回">‹</button>' : ''}
        <div>
          <div class="title" part="title"></div>
          <div class="subtitle" part="subtitle"></div>
        </div>
        <div class="extra"><slot name="extra"></slot></div>
      </div>
    `
    this.shadow.querySelector('[part="back"]')?.addEventListener('click', () => this.emit('back'))
    this.update()
  }

  protected override update(): void {
    this.shadow.querySelector<HTMLElement>('[part="title"]')!.textContent = this.getAttr('title', '')
    this.shadow.querySelector<HTMLElement>('[part="subtitle"]')!.textContent = this.getAttr('subtitle', '')
  }
}
