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

/**
 * 响应式断点常量（移动优先 min-width）。
 * @media 不支持 CSS 变量，故断点宽度为字面量 px。
 */
const BREAKPOINTS: Record<string, string> = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
}

const warnedBreakpoints = new Set<string>()

/** 非法断点名：dev 下 console.warn 一次（同值去重） */
function warnBreakpoint(name: string): void {
  if (warnedBreakpoints.has(name)) return
  warnedBreakpoints.add(name)
  console.warn(
    `[oas-space] 非法断点名 "${name}"，已忽略；合法断点：sm=640px / md=768px / lg=1024px / xl=1280px`,
  )
}

const warnedDirectionValues = new Set<string>()

/** 非法断点 direction 值：dev 下 console.warn 一次（同值去重） */
function warnDirectionValue(value: string): void {
  if (warnedDirectionValues.has(value)) return
  warnedDirectionValues.add(value)
  console.warn(
    `[oas-space] 断点 direction 值 "${value}" 非法，已回落基础方向；合法值：horizontal/vertical`,
  )
}

/**
 * 断点简写解析：`"column md:row"`（空格分隔：基础值 + 若干 `断点:值`）。
 * - 无空格或无冒号视为纯基础值，返回 null（调用方走原内联直写路径，行为不变）；
 * - 首个 token 不含冒号视为基础值，缺省时回落（方向 horizontal / 间距 medium）；
 * - 非法断点名丢弃该规则 + dev 告警（同值去重），合法断点值不做值校验（由调用方归一化）。
 */
function parseBreakpointShorthand(
  raw: string,
): { base: string; rules: Array<{ name: string; value: string }> } | null {
  if (!raw.includes(' ')) return null
  const tokens = raw.trim().split(/\s+/)
  if (!tokens.some((t) => t.includes(':'))) return null
  let base = ''
  if (!tokens[0]!.includes(':')) {
    base = tokens.shift()!
  }
  const rules: Array<{ name: string; value: string }> = []
  for (const token of tokens) {
    const idx = token.indexOf(':')
    const name = token.slice(0, idx)
    const value = token.slice(idx + 1)
    if (!BREAKPOINTS[name]) {
      warnBreakpoint(name)
      continue
    }
    rules.push({ name, value })
  }
  return { base, rules }
}

/**
 * direction 值 → flex 方向。支持两种词表：属性值（horizontal/vertical）与
 * flex 值（row/column，断点简写示例 `"column md:row"` 即用此词表）。
 * 其余视为非法返回空串。
 */
function directionToFlex(value: string): string {
  if (value === 'vertical' || value === 'column') return 'column'
  if (value === 'horizontal' || value === 'row') return 'row'
  return ''
}

/**
 * direction 断点值归一化：水平/垂直（或 row/column）→ flex 方向（reverse 叠加）；
 * 非法值回落基础方向 + dev 告警（同值去重）。
 */
function resolveDirectionValue(value: string, base: string, reverse: boolean): string {
  const dir = directionToFlex(value)
  if (!dir) {
    warnDirectionValue(value)
    return reverse ? `${base}-reverse` : base
  }
  return reverse ? `${dir}-reverse` : dir
}

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
/* 宿主 display 走 :host 规则而非内联——宿主想行内嵌入时一行 style="display:inline-flex"
   即可覆盖（宿主内联 > :host 规则），不被 update 冲掉 */
:host {
  display: flex;
}
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
      <style data-oas-space-breakpoints></style>
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

    // display 走 shadow :host 规则（见 SEPARATOR_STYLE 注释），update 不碰——
    // 宿主可一行 style="display:inline-flex" 覆盖为行内嵌入


    // direction：断点简写 → 宿主 var() 兜底基础值 + shadow @media 规则；纯基础值保持原内联直写
    const dirShorthand = parseBreakpointShorthand(direction)
    const dirBase =
      directionToFlex(dirShorthand ? dirShorthand.base || 'horizontal' : direction) || 'row'
    let directionCss = ''
    if (dirShorthand) {
      this.style.flexDirection = `var(--oas-space-direction, ${reverse ? `${dirBase}-reverse` : dirBase})`
      directionCss = dirShorthand.rules
        .map((r) => {
          const v = resolveDirectionValue(r.value, dirBase, reverse)
          return `@media (min-width: ${BREAKPOINTS[r.name]}) { :host { --oas-space-direction: ${v} } }`
        })
        .join('\n')
    } else {
      this.style.flexDirection = reverse ? `${dirBase}-reverse` : dirBase
    }

    // size：断点简写 → var() 兜底 + @media 规则；纯基础值保持原内联直写（含逗号 pair）
    const sizeShorthand = parseBreakpointShorthand(size)
    let sizeCss = ''
    if (sizeShorthand) {
      const [gapX, gapY] = normalizeSpaceSizePair(sizeShorthand.base || 'medium')
      this.style.columnGap = `var(--oas-space-column-gap, ${gapX})`
      this.style.rowGap = `var(--oas-space-row-gap, ${gapY})`
      sizeCss = sizeShorthand.rules
        .map((r) => {
          const [x, y] = normalizeSpaceSizePair(r.value)
          return `@media (min-width: ${BREAKPOINTS[r.name]}) { :host { --oas-space-column-gap: ${x}; --oas-space-row-gap: ${y} } }`
        })
        .join('\n')
    } else {
      const [gapX, gapY] = normalizeSpaceSizePair(size)
      this.style.columnGap = gapX
      this.style.rowGap = gapY
    }

    this.style.flexWrap = wrap ? 'wrap' : 'nowrap'
    this.style.alignItems = align ? (ALIGN_MAP[align] ?? align) : ''
    this.style.justifyContent = justify ? (JUSTIFY_MAP[justify] ?? justify) : ''

    this.syncBreakpointStyle(directionCss, sizeCss)
    this.syncSeparators()
    this.syncFill()
  }

  /**
   * 断点 @media 规则写入 shadow 专用 <style>（SSR 快照经 renderToString 触发 update 后
   * 序列化 shadowRoot.innerHTML 同步产出，两段路径一致）。无断点时清空。
   */
  private syncBreakpointStyle(directionCss: string, sizeCss: string): void {
    const styleEl = this.shadow.querySelector<HTMLStyleElement>(
      'style[data-oas-space-breakpoints]',
    )
    if (!styleEl) return
    styleEl.textContent = [directionCss, sizeCss].filter(Boolean).join('\n')
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
