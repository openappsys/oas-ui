import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
.list {
  border-radius: var(--oas-radius-md);
  overflow: hidden;
}
.list[data-bordered='true'] {
  border: 1px solid var(--oas-color-border);
}
.list[data-split='true'] ::slotted(oas-list-item) {
  border-bottom: 1px solid var(--oas-color-border);
}
.list[data-split='true'] ::slotted(oas-list-item:last-child) {
  border-bottom: none;
}
`

export class OASList extends OASElement {
  static override get observedAttributes(): string[] {
    return ['bordered', 'split']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="list" part="list"><slot></slot></div>
    `
    this.update()
  }

  protected override update(): void {
    const list = this.shadow.querySelector('[part="list"]')
    if (!list) return
    list.setAttribute('data-bordered', String(this.hasAttr('bordered')))
    list.setAttribute('data-split', String(this.hasAttr('split') || !this.hasAttr('bordered')))
  }
}
