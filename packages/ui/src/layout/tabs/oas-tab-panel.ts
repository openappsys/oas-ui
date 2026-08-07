import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
`

export class OASTabPanel extends OASElement {
  static override get observedAttributes(): string[] {
    return ['label', 'value', 'hidden']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <slot></slot>
    `
  }
}
