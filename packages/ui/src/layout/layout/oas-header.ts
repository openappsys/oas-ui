import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  padding: 0 var(--oas-space-5);
  height: 64px;
  display: flex;
  align-items: center;
  background: var(--oas-color-bg);
  border-bottom: 1px solid var(--oas-color-border);
}
`

export class OASHeader extends OASElement {
  protected override render(): void {
    this.shadow.innerHTML = `<style>${STYLE}</style><header part="header"><slot></slot></header>`
  }
}
