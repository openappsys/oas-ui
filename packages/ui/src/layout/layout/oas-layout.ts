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
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.struct.has-sider .main {
  flex-direction: row;
}
.sider-part {
  flex-shrink: 0;
}
.content-part {
  flex: 1;
  min-width: 0;
}
`

export class OASLayout extends OASElement {
  private observer: MutationObserver | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="struct" part="root" data-has-sider="false">
        <slot name="header"></slot>
        <div class="main">
          <div class="sider-part" part="sider"><slot name="sider"></slot></div>
          <div class="content-part" part="content"><slot name="content"></slot></div>
        </div>
        <slot name="footer"></slot>
      </div>
    `
    this.observer = new MutationObserver(() => this.update())
    this.observer.observe(this, { childList: true, subtree: false })
    this.onCleanup(() => this.observer?.disconnect())
    this.update()
  }

  protected override update(): void {
    const struct = this.shadow.querySelector<HTMLElement>('.struct')
    if (!struct) return
    const hasSider = this.querySelector('oas-sider') !== null
    struct.classList.toggle('has-sider', hasSider)
    struct.setAttribute('data-has-sider', String(hasSider))
  }
}
