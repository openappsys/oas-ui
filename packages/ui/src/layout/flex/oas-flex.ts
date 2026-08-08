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

type Justify = 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around'
type Align = 'stretch' | 'flex-start' | 'center' | 'flex-end' | 'baseline'

// justify 简写（start/end/between/around）与旧枚举（flex-* / space-*）双向兼容
const JUSTIFY_MAP: Record<string, Justify> = {
  start: 'flex-start',
  'flex-start': 'flex-start',
  center: 'center',
  end: 'flex-end',
  'flex-end': 'flex-end',
  between: 'space-between',
  'space-between': 'space-between',
  around: 'space-around',
  'space-around': 'space-around',
}

// align 简写（start/end）与旧枚举（flex-*）双向兼容
const ALIGN_MAP: Record<string, Align> = {
  start: 'flex-start',
  'flex-start': 'flex-start',
  center: 'center',
  end: 'flex-end',
  'flex-end': 'flex-end',
  baseline: 'baseline',
  stretch: 'stretch',
}

export class OASFlex extends OASElement {
  static override get observedAttributes(): string[] {
    return ['direction', 'justify', 'align', 'gap', 'wrap', 'vertical']
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
    const direction = this.getAttr('direction', 'row')
    // vertical 简写 = direction:column
    wrap.style.flexDirection = this.hasAttr('vertical') || direction === 'vertical' ? 'column' : 'row'
    wrap.style.justifyContent = JUSTIFY_MAP[this.getAttr('justify', 'start')] ?? 'flex-start'
    wrap.style.alignItems = ALIGN_MAP[this.getAttr('align', 'stretch')] ?? 'stretch'
    wrap.style.gap = this.getAttr('gap', '')
    wrap.style.flexWrap = this.hasAttr('wrap') ? 'wrap' : 'nowrap'
    wrap.style.display = 'flex'
    wrap.style.height = '100%'
  }
}
