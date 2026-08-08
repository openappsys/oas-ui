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
    // simple-grid（父级 oas-grid 有 columns 且 >0）时自动布局，忽略 span/offset
    const grid = this.closest('oas-grid')
    const columns = grid?.getAttribute('columns') ?? ''
    const simpleGrid = columns !== '' && (Number(columns) || 0) > 0
    if (simpleGrid) {
      this.style.gridColumn = ''
      return
    }
    const span = Number(this.getAttr('span', '24')) || 24
    const offset = Number(this.getAttr('offset', '0')) || 0
    if (offset > 0) {
      this.style.gridColumn = `${offset + 1} / span ${span}`
    } else {
      this.style.gridColumn = `span ${span}`
    }
  }
}
