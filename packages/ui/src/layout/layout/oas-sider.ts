import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  width: 200px;
  background: var(--oas-color-bg-hover);
  padding: var(--oas-space-4);
  flex-shrink: 0;
}
:host([collapsed]) {
  width: 64px;
}
`

export class OASSider extends OASElement {
  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <aside part="sider" aria-label="侧边栏"><slot></slot></aside>
    `
  }
}
