import { OASElement } from '@oas-ui/core'

export type SpaceDirection = 'horizontal' | 'vertical'
export type SpaceSize = 'xs' | 'small' | 'medium' | 'large' | 'xl' | number
export type SpaceAlign = 'start' | 'center' | 'end' | 'baseline' | 'stretch'
export type SpaceJustify =
  | 'start'
  | 'center'
  | 'end'
  | 'space-between'
  | 'space-around'
  | 'space-evenly'

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
    console.warn(
      `[oas-space] 非法 size "${raw}"，已回落 medium；合法值：xs/small/medium/large/xl 或数字 px`,
    )
  }
  return SIZE_MAP.medium!
}

/** size 数组归一化（逗号分隔）：返回 [横向, 纵向]；单值两轴同值 */
function normalizeSpaceSizePair(raw: string): [string, string] {
  const parts = raw.split(',').map((s) => s.trim())
  const main = normalizeSpaceSize(parts[0] ?? '')
  const cross = parts.length > 1 ? normalizeSpaceSize(parts[1]!) : main
  return [main, cross]
}

const ALIGN_MAP: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  baseline: 'baseline',
  stretch: 'stretch',
}

const JUSTIFY_MAP: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  'space-between': 'space-between',
  'space-around': 'space-around',
  'space-evenly': 'space-evenly',
}

/** 分隔符样式：分隔元素（字符串注入 span / 自定义 slot 元素）语义色次要、不参与缩放 */
const SEPARATOR_STYLE = `
::slotted(.oas-space-separator) {
  display: inline-flex;
  align-items: center;
  flex: none;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-md);
}
`

export class OASSpace extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'direction',
      'size',
      'wrap',
      'align',
      'separator',
      'justify',
      'reverse',
      'fill',
      'fill-ratio',
    ]
  }

  /**
   * 纯函数：SSR 快照与客户端渲染共用同一份模板。
   * - 默认 slot 透传子项；宿主内联布局样式由 update 增量写（SSR 渲染器同步落定）。
   * - 命名 slot="separator" 仅声明插槽 API（自定义分隔元素由 update 剥离 slot 标记后
   *   留在原位参与布局，避免投影到单一槽位破坏「子项间」位置）。
   */
  private template(): string {
    return `
      <style>${SEPARATOR_STYLE}</style>
      <slot name="separator" hidden></slot>
      <slot></slot>
    `
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
  }

  /** 真水合：slot 骨架存在即接管（无事件绑定，update 写宿主内联样式） */
  protected override hydrate(): boolean {
    return this.shadow.querySelector('slot') !== null
  }

  protected override update(): void {
    const direction = this.getAttr('direction', 'horizontal') as SpaceDirection
    const size = this.getAttr('size', 'medium')
    const wrap = this.hasAttr('wrap')
    const align = this.getAttr('align', '')
    const reverse = this.hasAttr('reverse')
    const justify = this.getAttr('justify', '')

    this.style.display = 'flex'
    const base = direction === 'vertical' ? 'column' : 'row'
    this.style.flexDirection = reverse ? `${base}-reverse` : base
    const [gapX, gapY] = normalizeSpaceSizePair(size)
    this.style.columnGap = gapX
    this.style.rowGap = gapY
    this.style.flexWrap = wrap ? 'wrap' : 'nowrap'
    this.style.alignItems = align ? (ALIGN_MAP[align] ?? align) : ''
    this.style.justifyContent = justify ? (JUSTIFY_MAP[justify] ?? justify) : ''

    this.syncSeparators()
    this.syncFill()
  }

  /**
   * 分隔符同步（幂等）：
   * - 先清理上次注入的字符串分隔 span；
   * - 自定义分隔（slot="separator" 子项，SSR 快照/首次渲染可能已剥离 slot 标记，按类识别）
   *   去 slot 标记 + 加类后留在原位参与布局；
   * - 无自定义且 separator 非空时，在相邻子项间注入字符串 span（间隔数 = 项数 - 1）。
   */
  private syncSeparators(): void {
    for (const s of this.querySelectorAll<HTMLElement>(':scope > [data-oas-space-sep]')) {
      s.remove()
    }

    const customSeps: Element[] = []
    for (const el of Array.from(this.children)) {
      if (el.getAttribute('slot') === 'separator') {
        el.removeAttribute('slot')
        el.classList.add('oas-space-separator')
        customSeps.push(el)
      } else if (
        el.classList.contains('oas-space-separator') &&
        !el.hasAttribute('data-oas-space-sep')
      ) {
        customSeps.push(el)
      }
    }

    const separator = this.getAttr('separator', '')
    if (separator === '' || customSeps.length > 0) return

    const items = Array.from(this.children).filter(
      (el) => !el.classList.contains('oas-space-separator'),
    )
    for (let i = 0; i < items.length - 1; i++) {
      const span = document.createElement('span')
      span.className = 'oas-space-separator'
      span.setAttribute('data-oas-space-sep', '')
      span.setAttribute('aria-hidden', 'true')
      span.textContent = separator
      items[i]!.after(span)
    }
  }

  /**
   * fill 子项填满：给每个非分隔子项写 flex-grow（1 份 = fill-ratio 100），
   * 容器级 fill-ratio 作为缺省比例、子项自身 fill-ratio 优先；fill 移除时清空。
   */
  private syncFill(): void {
    const fill = this.hasAttr('fill')
    const defaultRatio = this.getAttr('fill-ratio', '')
    for (const el of Array.from(this.children)) {
      if (el.classList.contains('oas-space-separator')) continue
      const item = el as HTMLElement
      if (fill) {
        const raw = el.getAttribute('fill-ratio') ?? defaultRatio
        const n = Number(raw)
        const grow = Number.isFinite(n) && n > 0 ? n / 100 : 1
        item.style.flex = `${grow} 1 0%`
      } else {
        item.style.flex = ''
      }
    }
  }
}
