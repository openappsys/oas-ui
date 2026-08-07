import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  padding: var(--oas-space-5);
  flex: 1;
}
`

export class OASContent extends OASElement {
  protected override render(): void {
    this.shadow.innerHTML = `<style>${STYLE}</style><main part="content"><slot></slot></main>`
  }
}
