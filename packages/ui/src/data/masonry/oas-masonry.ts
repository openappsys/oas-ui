import { OASElement } from '@oas-ui/core'

const DEFAULT_COLUMNS = 4
const DEFAULT_GAP = 8

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.masonry {
  column-count: 1;
  column-gap: var(--oas-space-2);
}
/* 子项不断列（break-inside: avoid）；inline-block + 100% 是列式布局下让 break-inside 生效的通用兜底 */
/* margin-bottom 走 CSS 变量开口：gap 两值语法（行距）经 --oas-masonry-item-gap 覆盖，默认回落 --oas-space-2 */
.masonry ::slotted(*) {
  display: inline-block;
  width: 100%;
  break-inside: avoid;
  margin-bottom: var(--oas-masonry-item-gap, var(--oas-space-2));
}
`

/**
 * 响应式断点常量（移动优先 min-width）。
 * 与 space/flex/grid 的断点协议严格一致：@media 不支持 CSS 变量，故断点宽度为字面量 px。
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
    `[oas-masonry] 非法断点名 "${name}"，已忽略；合法断点：sm=640px / md=768px / lg=1024px / xl=1280px`,
  )
}

const warnedBreakpointColumnValues = new Set<string>()

/** 非法断点列数值：dev 下 console.warn 一次（同值去重），回落基础列数 */
function warnBreakpointColumnValue(value: string): void {
  if (warnedBreakpointColumnValues.has(value)) return
  warnedBreakpointColumnValues.add(value)
  console.warn(
    `[oas-masonry] 断点列数值 "${value}" 非法，已回落基础列数；合法值：正整数`,
  )
}

const warnedColumnValues = new Set<string>()

/** 非法 column 指定列值：dev 下 console.warn 一次（同值去重），忽略该子项（不重排） */
function warnColumnValue(value: string): void {
  if (warnedColumnValues.has(value)) return
  warnedColumnValues.add(value)
  console.warn(
    `[oas-masonry] 子项 column 值 "${value}" 非法，已忽略；合法值：1 ~ 当前列数的整数`,
  )
}

/**
 * 断点简写解析：`"1 md:2 lg:4"`（空格分隔：基础值 + 若干 `断点:值`）。
 * 与 space/flex/grid 的断点协议严格一致：
 * - 无空格或无冒号视为纯基础值，返回 null（调用方走原内联直写路径，行为不变）；
 * - 首个 token 不含冒号视为基础值，缺省时回落默认列数；
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

/** 列数 token 归一：正整数才合法；空串/NaN/小数/0/负数返回 null */
function resolveColumnsValue(value: string): number | null {
  const v = value.trim()
  if (v === '') return null
  const n = Number(v)
  return Number.isInteger(n) && n >= 1 ? n : null
}

/** 间距值归一：Number 可解析的非负有限值 → `${n}px`；其余（含带单位/负数/NaN）返回 null */
function resolveGapValue(value: string): string | null {
  const v = value.trim()
  if (v === '') return null
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return null
  return `${n}px`
}

/** 基础列数：断点简写缺省基础值回落默认列数；非法（非正整数）静默回落 1 */
function resolveBaseColumns(
  shorthand: ReturnType<typeof parseBreakpointShorthand>,
  raw: string,
): number {
  return (
    resolveColumnsValue(shorthand ? shorthand.base || String(DEFAULT_COLUMNS) : raw) ?? 1
  )
}

/**
 * oas-masonry —— 瀑布流容器（CSS columns 实现）。
 *
 * 属性（kebab-case）：
 * - `columns`：列数（默认 4）；支持断点简写（如 `1 md:2 lg:4`，断点表同 space/flex/grid）；
 *   非正整数/非数字回退 1
 * - `gap`：间距（px，默认 8）。单值=列距；两值「行 列」（如 `8 16`）行距走子项
 *   margin-bottom、列距走 column-gap；纯数字补 px；非法值回退默认
 * - `fresh`：持续监听子项尺寸变化（ResizeObserver），变化时触发一次 update 提供重算机会。
 *   CSS columns 下尺寸变化浏览器本就自动重排，fresh 是语义对齐 + 未来切换 JS 实现的钩子
 *
 * 子元素属性：
 * - `column`：指定子项所属列（1-based，超出当前列数/非整数忽略 + dev 告警）。
 *   实现为按列重排 DOM（把指定项物理移动到目标列头部区域使其落入目标列），
 *   断点列数变化时按当前视口生效列数重算。
 *
 * 子项经默认 slot 投影，`break-inside: avoid` 保证单个子项不被列拆分。
 */
export class OASMasonry extends OASElement {
  static override get observedAttributes(): string[] {
    return ['columns', 'gap', 'fresh']
  }

  private rootEl: HTMLElement | null = null
  /** fresh 开启时的 ResizeObserver（监听子项尺寸变化触发 update） */
  private freshObserver: ResizeObserver | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <style data-oas-masonry-breakpoints></style>
      <div class="masonry" part="masonry"><slot></slot></div>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；masonry 无事件，仅缓存根节点） */
  private bind(): void {
    this.rootEl = this.shadow.querySelector('.masonry')
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（masonry 容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.masonry')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    if (!this.rootEl) return
    this.applyColumns()
    this.applyGap()
    this.applyPinnedColumns()
    this.syncFresh()
  }

  /**
   * 断点 @media 规则写入 shadow 专用 <style>（SSR 快照经 renderToString 触发 update 后
   * 序列化 shadowRoot.innerHTML 同步产出，两段路径一致）。无断点时清空。
   */
  private syncBreakpointStyle(css: string): void {
    const styleEl = this.shadow.querySelector<HTMLStyleElement>(
      'style[data-oas-masonry-breakpoints]',
    )
    if (!styleEl) return
    styleEl.textContent = css
  }

  /** matchMedia 探测（Node/SSR 或缺失 matchMedia 时回落 false，保证确定性与 Node 安全） */
  private mqMatches(query: string): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    try {
      return window.matchMedia(query).matches
    } catch {
      return false
    }
  }

  /**
   * 列数同步：
   * - 无断点简写：内联直写基础列数（零回归）；
   * - 断点简写：宿主 var() 兜底基础值 + shadow @media 规则注入（space/flex/grid 断点协议同款路径）。
   */
  private applyColumns(): void {
    const raw = this.getAttr('columns', String(DEFAULT_COLUMNS))
    const shorthand = parseBreakpointShorthand(raw)
    const base = resolveBaseColumns(shorthand, raw)
    if (!shorthand) {
      this.rootEl!.style.columnCount = String(base)
      this.syncBreakpointStyle('')
      return
    }
    this.rootEl!.style.columnCount = `var(--oas-masonry-columns, ${base})`
    const css = [...shorthand.rules]
      .sort((a, b) => BREAKPOINT_ORDER.indexOf(a.name) - BREAKPOINT_ORDER.indexOf(b.name))
      .map((r) => {
        const v = resolveColumnsValue(r.value)
        if (v === null) {
          warnBreakpointColumnValue(r.value)
          return `@media (min-width: ${BREAKPOINTS[r.name]}) { :host { --oas-masonry-columns: ${base} } }`
        }
        return `@media (min-width: ${BREAKPOINTS[r.name]}) { :host { --oas-masonry-columns: ${v} } }`
      })
      .join('\n')
    this.syncBreakpointStyle(css)
  }

  /**
   * 间距同步：
   * - 单值：仅列距 column-gap（零回归），行距变量清空回落默认；
   * - 两值「行 列」（如 `8 16`）：行距经 --oas-masonry-item-gap 落到子项 margin-bottom，
   *   列距写 column-gap；
   * - 0 个 / ≥3 个 token 非法：回落默认（静默，兼容既有 normalizeGap 行为）。
   * 纯数字补 px（浏览器丢弃无单位 CSS 长度，与 grid applyGap 同款修复）。
   */
  private applyGap(): void {
    const raw = this.getAttr('gap', String(DEFAULT_GAP))
    const parts = raw.trim().split(/\s+/).filter((s) => s !== '')
    if (parts.length === 2) {
      this.rootEl!.style.columnGap = resolveGapValue(parts[1]!) ?? `${DEFAULT_GAP}px`
      this.rootEl!.style.setProperty(
        '--oas-masonry-item-gap',
        resolveGapValue(parts[0]!) ?? `${DEFAULT_GAP}px`,
      )
    } else if (parts.length === 1) {
      this.rootEl!.style.columnGap = resolveGapValue(parts[0]!) ?? `${DEFAULT_GAP}px`
      this.rootEl!.style.removeProperty('--oas-masonry-item-gap')
    } else {
      this.rootEl!.style.columnGap = `${DEFAULT_GAP}px`
      this.rootEl!.style.removeProperty('--oas-masonry-item-gap')
    }
  }

  /**
   * 当前视口实际生效的列数：断点简写时按 min-width 命中取最大命中断点值
   * （min-width 级联语义：后命中断点覆盖前命中，与 CSS @media 级联一致），无命中回落基础列数。
   */
  private effectiveColumns(raw: string, base: number): number {
    const shorthand = parseBreakpointShorthand(raw)
    if (!shorthand) return base
    let current = base
    for (const name of BREAKPOINT_ORDER) {
      if (!this.mqMatches(`(min-width: ${BREAKPOINTS[name]})`)) continue
      const rule = shorthand.rules.find((r) => r.name === name)
      if (rule) current = resolveColumnsValue(rule.value) ?? base
    }
    return current
  }

  /**
   * column 指定列：子元素带 `column`（1-based）时按列重排 DOM——CSS columns 按流序填列，
   * 把指定项物理移动到目标列头部区域即落入目标列。
   *
   * 简化实现（与断点共存）：每次 update 按「当前视口生效列数」重算，目标列区域均分流序
   * （每列 ceil(总项数/列数) 个槽位，对应 CSS columns 均衡填充）；非法值
   * （非整数/≤0/超出列数）忽略 + dev 告警（同值去重）。重排幂等：同一输入产出同一顺序。
   */
  private applyPinnedColumns(): void {
    const children = Array.from(this.children)
    if (!children.some((c) => c.hasAttribute('column'))) return

    const raw = this.getAttr('columns', String(DEFAULT_COLUMNS))
    const shorthand = parseBreakpointShorthand(raw)
    const base = resolveBaseColumns(shorthand, raw)
    const current = this.effectiveColumns(raw, base)

    const total = children.length
    const perColumn = Math.max(1, Math.ceil(total / current))
    const slots: Array<Element | null> = new Array(total).fill(null)
    // 合法固定列的子元素集合（非法值归入填充池，保持流序，不因重排被挤到末尾）
    const pinnedSet = new Set<Element>()

    // 1) 带 column 的子元素放到目标列头部区域（同列多项按原相对顺序占位）
    for (const el of children) {
      if (!el.hasAttribute('column')) continue
      const rawCol = el.getAttribute('column')!
      const col = Number(rawCol)
      if (!Number.isInteger(col) || col < 1 || col > current) {
        warnColumnValue(rawCol)
        continue
      }
      pinnedSet.add(el)
      const start = (col - 1) * perColumn
      const end = Math.min(col * perColumn, total)
      let placed = false
      for (let p = start; p < end; p++) {
        if (!slots[p]) {
          slots[p] = el
          placed = true
          break
        }
      }
      if (!placed) {
        // 目标列区满（同列多项多于每列容量）：顺延到其后第一个空位
        for (let p = end; p < total; p++) {
          if (!slots[p]) {
            slots[p] = el
            placed = true
            break
          }
        }
      }
      if (!placed) slots.push(el)
    }

    // 2) 其余子元素（含 column 非法值者）按原顺序填剩余空位
    const unpinned = children.filter((c) => !pinnedSet.has(c))
    let u = 0
    for (let p = 0; p < slots.length; p++) {
      if (!slots[p]) slots[p] = unpinned[u++]!
    }
    while (u < unpinned.length) slots.push(unpinned[u++]!)

    // 3) 按新顺序移动 DOM（appendChild 移动既有子节点，幂等稳定）
    const fragment = document.createDocumentFragment()
    for (const el of slots) {
      if (el) fragment.appendChild(el)
    }
    this.appendChild(fragment)
  }

  /**
   * fresh 语义：存在该属性时用 ResizeObserver 持续监听子项尺寸变化
   * （图片晚到高度变化等），尺寸变化时触发一次 update 提供「重算机会」。
   * CSS columns 实现下尺寸变化浏览器本就自动重排，故 update 内无额外 JS 重排逻辑——
   * fresh 是语义对齐 + 未来切换 JS 实现的钩子。断开连接时自动清理观察器。
   */
  private syncFresh(): void {
    const want = this.hasAttr('fresh')
    if (!want) {
      this.freshObserver?.disconnect()
      this.freshObserver = null
      return
    }
    if (!this.freshObserver) {
      if (typeof ResizeObserver === 'undefined') return
      this.freshObserver = new ResizeObserver(() => this.update())
      this.onCleanup(() => {
        this.freshObserver?.disconnect()
        this.freshObserver = null
      })
    }
    // 每次 update 重建观察目标（覆盖新增/移除子项；observe 已观察元素幂等无害）
    this.freshObserver.disconnect()
    for (const child of Array.from(this.children)) {
      this.freshObserver.observe(child)
    }
  }
}
