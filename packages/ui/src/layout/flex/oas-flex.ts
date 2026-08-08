import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
.wrap {
  display: flex;
  height: 100%;
}
`

export class OASFlex extends OASElement {
  static override get observedAttributes(): string[] {
    return ['direction', 'justify', 'align', 'gap', 'wrap']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="wrap" part="wrap"><slot></slot></div>
    `
    this.update()
  }

  protected override update(): void {
    const wrap = this.shadow.querySelector<HTMLElement>('[part="wrap"]')
    if (!wrap) return
    wrap.style.flexDirection = this.getAttr('direction', 'row') === 'vertical' ? 'column' : 'row'
    wrap.style.justifyContent = this.getAttr('justify', 'flex-start')
    wrap.style.alignItems = this.getAttr('align', 'stretch')
    wrap.style.gap = this.getAttr('gap', '')
    wrap.style.flexWrap = this.getAttr('wrap', 'nowrap')
    wrap.style.display = 'flex'
    wrap.style.height = '100%'
  }
}
