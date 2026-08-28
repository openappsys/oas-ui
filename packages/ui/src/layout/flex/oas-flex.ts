import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.wrap {
  display: flex;
  height: 100%;
}
`

type Justify =
  | 'flex-start'
  | 'center'
  | 'flex-end'
  | 'space-between'
  | 'space-around'
  | 'space-evenly'
type Align = 'stretch' | 'flex-start' | 'center' | 'flex-end' | 'baseline'

// justify 简写（start/end/between/around/evenly）与旧枚举（flex-* / space-*）双向兼容
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
  evenly: 'space-evenly',
  'space-evenly': 'space-evenly',
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

/**
 * 响应式断点常量（移动优先 min-width，与 oas-space 同一协议）。
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
    `[oas-flex] 非法断点名 "${name}"，已忽略；合法断点：sm=640px / md=768px / lg=1024px / xl=1280px`,
  )
}

const warnedDirectionValues = new Set<string>()

/** 非法断点 direction 值：dev 下 console.warn 一次（同值去重） */
function warnDirectionValue(value: string): void {
  if (warnedDirectionValues.has(value)) return
  warnedDirectionValues.add(value)
  console.warn(
    `[oas-flex] 断点 direction 值 "${value}" 非法，已回落基础方向；合法值：row/column 或 horizontal/vertical`,
  )
}

/**
 * 断点简写解析（与 oas-space 同一协议）：`"column md:row"`（空格分隔：基础值 + 若干 `断点:值`）。
 * - 无空格或无冒号视为纯基础值，返回 null（调用方走原内联直写路径，行为不变）；
 * - 首个 token 不含冒号视为基础值，缺省时回落（方向 row / 间距 normal=0）；
 * - 非法断点名丢弃该规则 + dev 告警（同值去重）。
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

/** direction 断点值归一化：非法值回落基础方向 + dev 告警（同值去重） */
function resolveDirectionValue(value: string, base: string): string {
  const dir = directionToFlex(value)
  if (!dir) {
    warnDirectionValue(value)
    return base
  }
  return dir
}

export class OASFlex extends OASElement {
  static override get observedAttributes(): string[] {
    return ['direction', 'justify', 'align', 'gap', 'wrap', 'vertical', 'fill', 'fill-ratio']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <style data-oas-flex-breakpoints></style>
      <div class="wrap" part="wrap"><slot></slot></div>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；flex 无事件绑定） */
  private bind(): void {}

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（wrap 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="wrap"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const wrap = this.shadow.querySelector<HTMLElement>('[part="wrap"]')
    if (!wrap) return

    // vertical 简写 = 全宽 column，优先于 direction（含断点简写）
    const vertical = this.hasAttr('vertical')
    const direction = this.getAttr('direction', 'row')
    const dirShorthand = vertical ? null : parseBreakpointShorthand(direction)
    const dirBase =
      directionToFlex(
        vertical ? 'column' : dirShorthand ? dirShorthand.base || 'row' : direction,
      ) || 'row'

    // direction：断点简写 → var() 兜底基础值 + shadow @media 规则；纯基础值保持原内联直写
    let directionCss = ''
    if (dirShorthand) {
      wrap.style.flexDirection = `var(--oas-flex-direction, ${dirBase})`
      directionCss = dirShorthand.rules
        .map((r) => {
          const v = resolveDirectionValue(r.value, dirBase)
          return `@media (min-width: ${BREAKPOINTS[r.name]}) { :host { --oas-flex-direction: ${v} } }`
        })
        .join('\n')
    } else {
      wrap.style.flexDirection = dirBase
    }

    // gap：断点简写 → var() 兜底（缺省基础值回落 normal=0）+ @media 规则
    // 纯数字值补 px（浏览器丢弃无单位 CSS 长度，与 grid applyGap 同款修复）
    const toLen = (v: string): string => (/^\d+$/.test(v) ? `${v}px` : v)
    const gap = this.getAttr('gap', '')
    const gapShorthand = parseBreakpointShorthand(gap)
    let gapCss = ''
    if (gapShorthand) {
      wrap.style.gap = `var(--oas-flex-gap, ${toLen(gapShorthand.base) || 'normal'})`
      gapCss = gapShorthand.rules
        .map(
          (r) =>
            `@media (min-width: ${BREAKPOINTS[r.name]}) { :host { --oas-flex-gap: ${toLen(r.value)} } }`,
        )
        .join('\n')
    } else {
      wrap.style.gap = toLen(gap)
    }

    wrap.style.justifyContent = JUSTIFY_MAP[this.getAttr('justify', 'start')] ?? 'flex-start'
    wrap.style.alignItems = ALIGN_MAP[this.getAttr('align', 'stretch')] ?? 'stretch'
    wrap.style.flexWrap = this.hasAttr('wrap') ? 'wrap' : 'nowrap'
    wrap.style.display = 'flex'
    wrap.style.height = '100%'

    this.syncBreakpointStyle(directionCss, gapCss)
    this.syncFill()
  }

  /**
   * 断点 @media 规则写入 shadow 专用 <style>（SSR 快照经 renderToString 触发 update 后
   * 序列化 shadowRoot.innerHTML 同步产出，两段路径一致）。无断点时清空。
   */
  private syncBreakpointStyle(directionCss: string, gapCss: string): void {
    const styleEl = this.shadow.querySelector<HTMLStyleElement>(
      'style[data-oas-flex-breakpoints]',
    )
    if (!styleEl) return
    styleEl.textContent = [directionCss, gapCss].filter(Boolean).join('\n')
  }

  /**
   * fill 子项填满：给每个子项写 flex-grow（1 份 = fill-ratio 100），
   * 容器级 fill-ratio 作为缺省比例、子项自身 fill-ratio 优先；fill 移除时清空。
   */
  private syncFill(): void {
    const fill = this.hasAttr('fill')
    const defaultRatio = this.getAttr('fill-ratio', '')
    for (const el of Array.from(this.children)) {
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
