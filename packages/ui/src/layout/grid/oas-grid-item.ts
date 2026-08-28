import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  min-width: 0;
}
:host([hidden]) {
  display: none;
}
`

/**
 * 响应式断点常量（移动优先 min-width）。
 * 与 space 的断点协议严格一致：@media 不支持 CSS 变量，故断点宽度为字面量 px。
 */
const BREAKPOINTS: Record<string, string> = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
}

const BREAKPOINT_ORDER = ['sm', 'md', 'lg', 'xl']

const warnedBreakpoints = new Set<string>()

/** 非法断点名：dev 下 console.warn 一次（同值去重） */
function warnBreakpoint(name: string): void {
  if (warnedBreakpoints.has(name)) return
  warnedBreakpoints.add(name)
  console.warn(
    `[oas-grid-item] 非法断点名 "${name}"，已忽略；合法断点：sm=640px / md=768px / lg=1024px / xl=1280px`,
  )
}

const warnedSpanValues = new Set<string>()

/** 非法断点 span 值：dev 下 console.warn 一次（同值去重），回落基础 span */
function warnSpanValue(value: string): void {
  if (warnedSpanValues.has(value)) return
  warnedSpanValues.add(value)
  console.warn(
    `[oas-grid-item] 断点 span 值 "${value}" 非法，已回落基础 span；合法值：正整数或 auto`,
  )
}

const warnedOffsetValues = new Set<string>()

/** 非法断点 offset 值：dev 下 console.warn 一次（同值去重），回落基础 offset */
function warnOffsetValue(value: string): void {
  if (warnedOffsetValues.has(value)) return
  warnedOffsetValues.add(value)
  console.warn(`[oas-grid-item] 断点 offset 值 "${value}" 非法，已回落基础 offset；合法值：数字`)
}

/**
 * 断点简写解析：`"24 md:12 lg:8"`（空格分隔：基础值 + 若干 `断点:值`）。
 * 与 space 的断点协议严格一致：
 * - 无空格或无冒号视为纯基础值，返回 null（调用方走原内联直写路径，行为不变）；
 * - 首个 token 不含冒号视为基础值，缺省时回落（span 24 / offset 0）；
 * - 非法断点名丢弃该规则 + dev 告警（同值去重），合法断点值由调用方归一化。
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
 * span token 归一化：`auto` 或正数 → 原样（含小数，兼容旧行为）；空串/NaN/≤0 返回 null
 * （基础值回落 24 静默，断点值回落基础值并告警）。
 */
function resolveSpanValue(value: string): string | null {
  const v = value.trim()
  if (v === '') return null
  if (v === 'auto') return 'auto'
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? String(n) : null
}

/**
 * offset token 归一化：有限数字 → 原样（兼容旧行为）；空串/NaN 返回 null
 * （基础值回落 0 静默，断点值回落基础值并告警）。
 */
function resolveOffsetValue(value: string): number | null {
  const v = value.trim()
  if (v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * span + offset → grid-column 字符串：
 * - span=auto：`auto`（内容自然宽，不展 span）；与 offset 组合按 grid 规范为 `offset+1 / auto`；
 * - 其余：无 offset 为 `span X`；有 offset（>0）为 `offset+1 / span X`。
 */
function columnFrom(span: string, offset: number): string {
  if (span === 'auto') {
    return offset > 0 ? `${offset + 1} / auto` : 'auto'
  }
  return offset > 0 ? `${offset + 1} / span ${span}` : `span ${span}`
}

export class OASGridItem extends OASElement {
  static override get observedAttributes(): string[] {
    return ['span', 'offset', 'order']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <style data-oas-grid-item-breakpoints></style>
      <slot></slot>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；grid-item 无事件绑定） */
  private bind(): void {}

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（默认 slot 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('slot')) return false
    this.bind()
    return true
  }

  /**
   * 断点 @media 规则写入 shadow 专用 <style>（SSR 快照经 renderToString 触发 update 后
   * 序列化 shadowRoot.innerHTML 同步产出，两段路径一致）。无断点时清空。
   */
  private syncBreakpointStyle(css: string): void {
    const styleEl = this.shadow.querySelector<HTMLStyleElement>(
      'style[data-oas-grid-item-breakpoints]',
    )
    if (!styleEl) return
    styleEl.textContent = css
  }

  protected override update(): void {
    // simple-grid（父级 oas-grid 有 columns 且 >0）时自动布局，忽略 span/offset/断点
    const grid = this.closest('oas-grid')
    const columns = grid?.getAttribute('columns') ?? ''
    const simpleGrid = columns !== '' && (Number(columns) || 0) > 0

    // order 排序：数字直写，非法/缺省回落 0
    const order = Number(this.getAttr('order', '0'))
    this.style.order = Number.isFinite(order) ? String(order) : '0'

    if (simpleGrid) {
      this.style.gridColumn = ''
      this.syncBreakpointStyle('')
      return
    }

    const spanRaw = this.getAttr('span', '24')
    const offsetRaw = this.getAttr('offset', '0')
    const spanShorthand = parseBreakpointShorthand(spanRaw)
    const offsetShorthand = parseBreakpointShorthand(offsetRaw)

    // 基础值：断点简写缺基础时回落默认（span 24 / offset 0）
    const baseSpan = resolveSpanValue(
      spanShorthand ? spanShorthand.base || '24' : spanRaw,
    ) ?? '24'
    const baseOffset = resolveOffsetValue(
      offsetShorthand ? offsetShorthand.base || '0' : offsetRaw,
    ) ?? 0

    // 并集断点集：span 规则先入（offset 回落基础），offset 规则补齐/覆盖（span 回落基础）
    const perBreakpoint = new Map<string, { span: string; offset: number }>()
    for (const r of spanShorthand?.rules ?? []) {
      const v = resolveSpanValue(r.value)
      if (v === null) {
        warnSpanValue(r.value)
        perBreakpoint.set(r.name, { span: baseSpan, offset: baseOffset })
      } else {
        perBreakpoint.set(r.name, { span: v, offset: baseOffset })
      }
    }
    for (const r of offsetShorthand?.rules ?? []) {
      const v = resolveOffsetValue(r.value)
      const prev = perBreakpoint.get(r.name)
      if (v === null) {
        warnOffsetValue(r.value)
        perBreakpoint.set(r.name, {
          span: prev?.span ?? baseSpan,
          offset: baseOffset,
        })
      } else {
        perBreakpoint.set(r.name, { span: prev?.span ?? baseSpan, offset: v })
      }
    }

    const baseColumn = columnFrom(baseSpan, baseOffset)
    if (spanShorthand || offsetShorthand) {
      // 宿主 var() 兜底基础值 + shadow @media 规则覆盖（space 断点协议的同款实现路径）
      this.style.gridColumn = `var(--oas-grid-item-column, ${baseColumn})`
      const css = [...perBreakpoint.entries()]
        .sort(
          (a, b) => BREAKPOINT_ORDER.indexOf(a[0]) - BREAKPOINT_ORDER.indexOf(b[0]),
        )
        .map(
          ([name, { span, offset }]) =>
            `@media (min-width: ${BREAKPOINTS[name]}) { :host { --oas-grid-item-column: ${columnFrom(span, offset)} } }`,
        )
        .join('\n')
      this.syncBreakpointStyle(css)
    } else {
      // 纯基础值：原内联直写（零回归）
      this.style.gridColumn = baseColumn
      this.syncBreakpointStyle('')
    }
  }
}
