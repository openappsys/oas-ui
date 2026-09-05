import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: grid;
  grid-template-columns: repeat(24, 1fr);
  font-family: inherit;
  gap: 0;
}
:host([hidden]) {
  display: none;
}
`

// justify（justify-items）合法值：start / center / end / stretch
const JUSTIFY_ITEMS = new Set(['start', 'center', 'end', 'stretch'])
// align（align-items）合法值：start / center / end / stretch / baseline
const ALIGN_ITEMS = new Set(['start', 'center', 'end', 'stretch', 'baseline'])

/**
 * 响应式断点常量（移动优先 min-width）。
 * @media 不支持 CSS 变量，故断点宽度为字面量 px。
 * 与 space / oas-grid-item 的断点协议严格一致。
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
    `[oas-grid] 非法断点名 "${name}"，已忽略；合法断点：sm=640px / md=768px / lg=1024px / xl=1280px`,
  )
}

const warnedColumnValues = new Set<string>()

/** 非法断点 columns 值：dev 下 console.warn 一次（同值去重），丢弃该断点规则 */
function warnColumnValue(value: string): void {
  if (warnedColumnValues.has(value)) return
  warnedColumnValues.add(value)
  console.warn(
    `[oas-grid] 断点 columns 值 "${value}" 非法，已丢弃该断点规则；合法值：正整数`,
  )
}

const warnedColumnBases = new Set<string>()

/** 非法 columns 基础值：dev 下 console.warn 一次（同值去重），回落 1 列 */
function warnColumnBase(value: string): void {
  if (warnedColumnBases.has(value)) return
  warnedColumnBases.add(value)
  console.warn(`[oas-grid] columns 基础值 "${value}" 非法，已回落 1 列；合法值：正整数`)
}

const warnedMinChildWidths = new Set<string>()

/** 非法 min-child-width：dev 下 console.warn 一次（同值去重），回落默认列数 */
function warnMinChildWidth(value: string): void {
  if (warnedMinChildWidths.has(value)) return
  warnedMinChildWidths.add(value)
  console.warn(
    `[oas-grid] min-child-width 应为单个长度值（如 200px 或 180），非法值 "${value}" 已忽略（回落默认列数）`,
  )
}

/**
 * 断点简写解析：`"3 md:2 sm:1"`（空格分隔：基础值 + 若干 `断点:值`）。
 * 与 space / oas-grid-item 的断点协议严格一致：
 * - 无空格或无冒号视为纯基础值，返回 null（调用方走原内联直写路径，行为不变）；
 * - 首个 token 不含冒号视为基础值，缺省时回落 1 列；
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

/** columns token 归一化：正整数 → 原样字符串；空串/NaN/≤0/小数返回 null */
function resolveColumnCount(value: string): string | null {
  const v = value.trim()
  if (v === '') return null
  if (!/^\d+$/.test(v)) return null
  const n = Number(v)
  return n >= 1 ? String(n) : null
}

/** min-child-width 归一化：纯数字补 px；含空格/冒号（误用断点协议）判非法返回 null */
function resolveMinChildWidth(raw: string): string | null {
  const v = raw.trim()
  if (v === '') return null
  if (/^\d+(\.\d+)?$/.test(v)) return `${v}px`
  // 断点协议（空格/冒号）或明显非单长度 → 判非法（不硬猜）
  if (/\s/.test(v) || v.includes(':')) return null
  return v
}

const warnedJustify = new Set<string>()

/** 非法 justify：dev 下 console.warn 一次（同值去重），回落默认 stretch */
function warnJustifyValue(value: string): void {
  if (warnedJustify.has(value)) return
  warnedJustify.add(value)
  console.warn(
    `[oas-grid] 非法 justify "${value}"，已回落 stretch；合法值：start/center/end/stretch`,
  )
}

const warnedAlign = new Set<string>()

/** 非法 align：dev 下 console.warn 一次（同值去重），回落默认 stretch */
function warnAlignValue(value: string): void {
  if (warnedAlign.has(value)) return
  warnedAlign.add(value)
  console.warn(
    `[oas-grid] 非法 align "${value}"，已回落 stretch；合法值：start/center/end/stretch/baseline`,
  )
}

export class OASGrid extends OASElement {
  static override get observedAttributes(): string[] {
    return ['gap', 'cols', 'columns', 'min-child-width', 'justify', 'align']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <style data-oas-grid-breakpoints></style>
      <slot></slot>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；grid 无事件绑定） */
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
   * gap 归一化：
   * - 单值：保持 `gap` 简写直写（两轴同值，零回归），清理 rowGap/columnGap 残留；
   * - 两值（空格分隔「行 列」，如 `8 16`）：row-gap/column-gap 分开设置，清理 gap 简写；
   * - 0 个或 ≥3 个值：非法，静默忽略回落默认 0。
   * 纯数字值补 px（浏览器丢弃无单位 CSS 长度——happy-dom 不校验故单测漏检，
   * 与 menu max-height 的 `/^\d+$/ → px` 惯例同款）
   */
  private applyGap(): void {
    const raw = this.getAttr('gap', '0')
    const parts = raw
      .trim()
      .split(/\s+/)
      .filter((s) => s !== '')
    const toLen = (v: string): string => (/^\d+$/.test(v) ? `${v}px` : v)
    if (parts.length === 2) {
      this.style.gap = ''
      this.style.rowGap = toLen(parts[0]!)
      this.style.columnGap = toLen(parts[1]!)
    } else if (parts.length === 1) {
      // 顺序敏感：先清长hand再写简写——反过来「gap=X → rowGap/columnGap=''」会把
      // 刚写入的简写经长hand清空（真实浏览器 CSSOM 行为；happy-dom 不展开简写故单测漏检，
      // 实证：CSR/DSD 两路径 computed column-gap 均掉 0）
      this.style.rowGap = ''
      this.style.columnGap = ''
      this.style.gap = toLen(parts[0]!)
    } else {
      this.style.rowGap = ''
      this.style.columnGap = ''
      this.style.gap = '0'
    }
  }

  /**
   * justify/align 容器对齐（grid 上下文）：
   * 缺省不设（保持 CSS 默认 stretch 行为）；合法值直写；非法回落 stretch + dev 告警（同值去重）。
   */
  private applyAlignment(): void {
    const justify = this.getAttr('justify', '')
    if (justify !== '') {
      if (JUSTIFY_ITEMS.has(justify)) {
        this.style.justifyItems = justify
      } else {
        warnJustifyValue(justify)
        this.style.justifyItems = 'stretch'
      }
    } else {
      this.style.justifyItems = ''
    }

    const align = this.getAttr('align', '')
    if (align !== '') {
      if (ALIGN_ITEMS.has(align)) {
        this.style.alignItems = align
      } else {
        warnAlignValue(align)
        this.style.alignItems = 'stretch'
      }
    } else {
      this.style.alignItems = ''
    }
  }

  /**
   * columns 断点 @media 规则写入 shadow 专用 <style>（SSR 快照经 renderToString 触发 update 后
   * 序列化 shadowRoot.innerHTML 同步产出，两段路径一致）。无断点时清空。
   */
  private syncBreakpointStyle(css: string): void {
    const styleEl = this.shadow.querySelector<HTMLStyleElement>(
      'style[data-oas-grid-breakpoints]',
    )
    if (!styleEl) return
    styleEl.textContent = css
  }

  /**
   * columns 列数解析（simple-grid）：
   * - 纯单值：原内联直写 `repeat(n, 1fr)`（零回归）；
   * - 断点简写（如 `"3 md:2 sm:1"`）：宿主 var() 兜底基础列数 + shadow @media 规则覆盖。
   * 返回 @media CSS（无断点时为空串）。
   */
  private applyColumns(columns: string): string {
    const shorthand = parseBreakpointShorthand(columns)
    if (!shorthand) {
      const n = Math.max(1, Number(columns) || 1)
      this.style.gridTemplateColumns = `repeat(${n}, 1fr)`
      return ''
    }

    // 基础列数：缺省/非法回落 1 列
    const rawBase = shorthand.base
    const base = resolveColumnCount(rawBase)
    if (base === null && rawBase !== '') warnColumnBase(rawBase)

    // 断点规则：值非法丢弃 + dev 告警；按 min-width 升序输出（覆盖顺序与断点宽一致，
    // 避免乱序使宽断点被窄断点同匹配覆盖）
    const rules = shorthand.rules
      .filter((r) => {
        if (resolveColumnCount(r.value) !== null) return true
        warnColumnValue(r.value)
        return false
      })
      .sort((a, b) => BREAKPOINT_ORDER.indexOf(a.name) - BREAKPOINT_ORDER.indexOf(b.name))
      .map(
        (r) =>
          `@media (min-width: ${BREAKPOINTS[r.name]}) { :host { --oas-grid-columns: repeat(${r.value}, 1fr) } }`,
      )

    if (rules.length > 0) {
      this.style.gridTemplateColumns = `var(--oas-grid-columns, repeat(${base ?? 1}, 1fr))`
    } else {
      // 全部断点规则被丢弃（非法）→ 退化为纯基础列数直写，不留空 var() 壳
      this.style.gridTemplateColumns = `repeat(${base ?? 1}, 1fr)`
    }
    return rules.join('\n')
  }

  protected override update(): void {
    const columns = this.getAttr('columns', '')
    const minChildWidth = this.getAttr('min-child-width', '')
    const cols = Number(this.getAttr('cols', '24')) || 24
    this.style.display = 'grid'
    this.applyGap()
    this.applyAlignment()

    let breakpointCss = ''
    if (columns !== '') {
      // simple-grid：columns 优先（与 min-child-width 并存时 columns 胜出）
      breakpointCss = this.applyColumns(columns)
    } else if (minChildWidth !== '') {
      // min-child-width 自适应宫格：auto-fit + minmax，列数随可用宽度流式自算
      const len = resolveMinChildWidth(minChildWidth)
      if (len !== null) {
        this.style.gridTemplateColumns = `repeat(auto-fit, minmax(${len}, 1fr))`
      } else {
        warnMinChildWidth(minChildWidth)
        this.style.gridTemplateColumns = `repeat(${cols}, 1fr)`
      }
    } else {
      this.style.gridTemplateColumns = `repeat(${cols}, 1fr)`
    }
    this.syncBreakpointStyle(breakpointCss)
  }
}
