import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  padding: var(--oas-space-4) var(--oas-space-5);
  border-top: 1px solid var(--oas-color-border);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
`

export class OASFooter extends OASElement {
  protected override render(): void {
    this.shadow.innerHTML = `<style>${STYLE}</style><footer part="footer"><slot></slot></footer>`
  }
}
