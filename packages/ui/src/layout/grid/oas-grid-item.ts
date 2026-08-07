import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  min-width: 0;
}
`

export class OASGridItem extends OASElement {
  static override get observedAttributes(): string[] {
    return ['span', 'offset']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <slot></slot>
    `
    this.update()
  }

  protected override update(): void {
    const span = Number(this.getAttr('span', '24')) || 24
    const offset = Number(this.getAttr('offset', '0')) || 0
    if (offset > 0) {
      this.style.gridColumn = `${offset + 1} / span ${span}`
    } else {
      this.style.gridColumn = `span ${span}`
    }
  }
}
