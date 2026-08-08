import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  color: var(--oas-color-text-primary);
}
.card.hoverable {
  transition: box-shadow var(--oas-transition-base) var(--oas-ease-out);
}
.card.hoverable:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
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
.extra {
  display: flex;
}
.body {
  padding: var(--oas-space-4);
  font-size: var(--oas-font-size-md);
  line-height: 1.6;
}
`

export class OASCard extends OASElement {
  static override get observedAttributes(): string[] {
    return ['title', 'hoverable']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="card" part="card">
        <div class="header" part="header">
          <span class="title" part="title"></span>
          <div class="extra"><slot name="extra"></slot></div>
        </div>
        <div class="body" part="body"><slot></slot></div>
      </div>
    `
    this.update()
  }

  protected override update(): void {
    const card = this.shadow.querySelector('[part="card"]')
    if (!card) return
    card.classList.toggle('hoverable', this.hasAttr('hoverable'))
    this.shadow.querySelector<HTMLElement>('[part="title"]')!.textContent = this.getAttr(
      'title',
      '',
    )
  }
}
