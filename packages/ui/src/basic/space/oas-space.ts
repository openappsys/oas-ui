import { OASElement } from '@oas-ui/core'

export type SpaceDirection = 'horizontal' | 'vertical'
export type SpaceSize = 'small' | 'medium' | 'large' | number
export type SpaceAlign = 'start' | 'center' | 'end' | 'baseline' | 'stretch'

const SIZE_MAP: Record<string, string> = {
  small: '8px',
  medium: '12px',
  large: '24px',
}

const ALIGN_MAP: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  baseline: 'baseline',
  stretch: 'stretch',
}

export class OASSpace extends OASElement {
  static override get observedAttributes(): string[] {
    return ['direction', 'size', 'wrap', 'align']
  }

  protected override render(): void {
    this.shadow.innerHTML = '<slot></slot>'
    this.update()
  }

  protected override update(): void {
    const direction = this.getAttr('direction', 'horizontal') as SpaceDirection
    const size = this.getAttr('size', 'medium')
    const wrap = this.hasAttr('wrap')
    const align = this.getAttr('align', '')

    this.style.display = 'flex'
    this.style.flexDirection = direction === 'vertical' ? 'column' : 'row'
    this.style.gap =
      SIZE_MAP[size] ?? (Number.isNaN(Number(size)) ? SIZE_MAP.medium! : `${Number(size)}px`)
    this.style.flexWrap = wrap ? 'wrap' : 'nowrap'
    this.style.alignItems = align ? (ALIGN_MAP[align] ?? align) : ''
  }
}
