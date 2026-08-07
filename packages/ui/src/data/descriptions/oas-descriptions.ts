import { OASElement } from '@oas-ui/core'
import type { OASDescriptionsItem } from './oas-descriptions-item.js'

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
.item {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  font-size: var(--oas-font-size-md);
}
.label {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.content {
  color: var(--oas-color-text-primary);
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
      <div class="items" part="items"></div>
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
    itemsEl.innerHTML = ''
    for (const item of this.querySelectorAll('oas-descriptions-item') as NodeListOf<OASDescriptionsItem>) {
      const cell = document.createElement('div')
      cell.className = 'item'
      cell.setAttribute('part', 'item')
      const label = document.createElement('div')
      label.className = 'label'
      label.textContent = item.getAttribute('label') ?? ''
      const content = document.createElement('div')
      content.className = 'content'
      content.append(item.cloneNode(true))
      cell.append(label, content)
      itemsEl.appendChild(cell)
    }
  }
}
