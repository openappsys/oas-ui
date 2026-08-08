import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: grid;
  grid-template-columns: repeat(24, 1fr);
  font-family: inherit;
  gap: 0;
}
`

export class OASGrid extends OASElement {
  static override get observedAttributes(): string[] {
    return ['gap', 'cols', 'columns']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <slot></slot>
    `
    this.update()
  }

  protected override update(): void {
    const columns = this.getAttr('columns', '')
    const cols = Number(this.getAttr('cols', '24')) || 24
    this.style.display = 'grid'
    this.style.gap = this.getAttr('gap', '0')
    if (columns !== '') {
      // simple-grid：按 columns 自动等分，子项忽略 span（由 GridItem 侧配合）
      const n = Math.max(1, Number(columns) || 1)
      this.style.gridTemplateColumns = `repeat(${n}, 1fr)`
    } else {
      this.style.gridTemplateColumns = `repeat(${cols}, 1fr)`
    }
  }
}
