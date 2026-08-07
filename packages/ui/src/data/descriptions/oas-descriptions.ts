import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
.items {
  display: grid;
  grid-template-columns: repeat(var(--oas-desc-columns, 3), 1fr);
  row-gap: var(--oas-space-4);
  column-gap: var(--oas-space-4);
}
.title {
  font-weight: 600;
  margin-bottom: var(--oas-space-4);
}
`

export class OASDescriptions extends OASElement {
  static override get observedAttributes(): string[] {
    return ['column', 'title']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="title" part="title"></div>
      <div class="items" part="items"><slot></slot></div>
    `
    this.update()
  }

  protected override update(): void {
    this.shadow.querySelector<HTMLElement>('[part="title"]')!.textContent = this.getAttr('title', '')
    const itemsEl = this.shadow.querySelector<HTMLElement>('[part="items"]')
    if (!itemsEl) return
    const column = this.getAttr('column', '3')
    itemsEl.setAttribute('data-column', column)
    itemsEl.style.setProperty('--oas-desc-columns', column)
  }
}
