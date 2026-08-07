import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  min-height: 100%;
  font-family: inherit;
  background: var(--oas-color-bg);
}
.struct {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
.struct.has-sider {
  flex-direction: row;
}
.struct.has-sider .main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.sider-part {
  flex-shrink: 0;
}
.content-part {
  flex: 1;
}
`

export class OASLayout extends OASElement {
  protected override render(): void {
    const hasSider = this.querySelector('oas-sider') !== null
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="struct" part="root" data-has-sider="${hasSider}">
        <slot name="header"></slot>
        <div class="main">
          <div class="sider-part" part="sider"><slot name="sider"></slot></div>
          <div class="content-part" part="content"><slot name="content"></slot></div>
          <slot name="footer"></slot>
        </div>
      </div>
    `
  }
}
