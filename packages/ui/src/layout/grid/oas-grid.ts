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
    return ['gap', 'cols']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <slot></slot>
    `
    this.update()
  }

  protected override update(): void {
    const cols = Number(this.getAttr('cols', '24')) || 24
    this.style.display = 'grid'
    this.style.gridTemplateColumns = `repeat(${cols}, 1fr)`
    this.style.gap = this.getAttr('gap', '0')
  }
}
