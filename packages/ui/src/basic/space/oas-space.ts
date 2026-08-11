import { OASElement } from '@oas-ui/core'

export type SpaceDirection = 'horizontal' | 'vertical'
export type SpaceSize = 'xs' | 'small' | 'medium' | 'large' | 'xl' | number
export type SpaceAlign = 'start' | 'center' | 'end' | 'baseline' | 'stretch'

const SIZE_MAP: Record<string, string> = {
  xs: 'var(--oas-space-1)',
  small: 'var(--oas-space-2)',
  medium: 'var(--oas-space-3)',
  large: 'var(--oas-space-5)',
  xl: 'var(--oas-space-6)',
}

const VALID_SPACE_SIZES = new Set(['xs', 'small', 'medium', 'large', 'xl'])
const warnedSizes = new Set<string>()

/** 非法 size 归一化：回落 medium 并在 dev 下 console.warn 一次（同值去重；数字/数字字符串原样转 px） */
function normalizeSpaceSize(raw: string): string {
  if (SIZE_MAP[raw] != null) return SIZE_MAP[raw]!
  const num = Number(raw)
  if (!Number.isNaN(num)) return `${num}px`
  if (!warnedSizes.has(raw)) {
    warnedSizes.add(raw)
    console.warn(`[oas-space] 非法 size "${raw}"，已回落 medium；合法值：xs/small/medium/large/xl 或数字 px`)
  }
  return SIZE_MAP.medium!
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
    this.style.gap = normalizeSpaceSize(size)
    this.style.flexWrap = wrap ? 'wrap' : 'nowrap'
    this.style.alignItems = align ? (ALIGN_MAP[align] ?? align) : ''
  }
}
