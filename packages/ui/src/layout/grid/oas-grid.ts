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
/* collapsed-rows 折叠行尾格（展开/收起入口）：占满所在行的剩余列（JS 写 grid-column） */
.collapse-tail {
  display: flex;
  align-items: stretch;
}
.collapse-tail[hidden] {
  display: none;
}
.collapse-tail-btn {
  appearance: none;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-1, 4px);
  width: 100%;
  min-height: var(--oas-control-height-sm, 24px);
  padding: var(--oas-space-1, 4px) var(--oas-space-2, 8px);
  border: 1px dashed var(--oas-color-border-strong, var(--oas-color-border));
  border-radius: var(--oas-radius-sm, 4px);
  background: transparent;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-xs, 12px);
  font-family: inherit;
  cursor: pointer;
  transition:
    color var(--oas-transition-fast, 120ms) var(--oas-ease-out, ease-out),
    border-color var(--oas-transition-fast, 120ms) var(--oas-ease-out, ease-out),
    background var(--oas-transition-fast, 120ms) var(--oas-ease-out, ease-out);
}
.collapse-tail-btn:hover {
  color: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.collapse-tail-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
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
  console.warn(`[oas-grid] 非法断点名 "${name}"，已忽略；合法断点：sm=640px / md=768px / lg=1024px / xl=1280px`)
}

const warnedColumnValues = new Set<string>()

/** 非法断点 columns 值：dev 下 console.warn 一次（同值去重），丢弃该断点规则 */
function warnColumnValue(value: string): void {
  if (warnedColumnValues.has(value)) return
  warnedColumnValues.add(value)
  console.warn(`[oas-grid] 断点 columns 值 "${value}" 非法，已丢弃该断点规则；合法值：正整数`)
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
  console.warn(`[oas-grid] min-child-width 应为单个长度值（如 200px 或 180），非法值 "${value}" 已忽略（回落默认列数）`)
}

/**
 * 断点简写解析：`"3 md:2 sm:1"`（空格分隔：基础值 + 若干 `断点:值`）。
 * 与 space / oas-grid-item 的断点协议严格一致：
 * - 无空格或无冒号视为纯基础值，返回 null（调用方走原内联直写路径，行为不变）；
 * - 首个 token 不含冒号视为基础值，缺省时回落 1 列；
 * - 非法断点名丢弃该规则 + dev 告警（同值去重），合法断点值由调用方归一化。
 */
function parseBreakpointShorthand(raw: string): { base: string; rules: Array<{ name: string; value: string }> } | null {
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
  console.warn(`[oas-grid] 非法 justify "${value}"，已回落 stretch；合法值：start/center/end/stretch`)
}

const warnedAlign = new Set<string>()

/** 非法 align：dev 下 console.warn 一次（同值去重），回落默认 stretch */
function warnAlignValue(value: string): void {
  if (warnedAlign.has(value)) return
  warnedAlign.add(value)
  console.warn(`[oas-grid] 非法 align "${value}"，已回落 stretch；合法值：start/center/end/stretch/baseline`)
}

export class OASGrid extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'gap',
      'cols',
      'columns',
      'min-child-width',
      'justify',
      'align',
      'row-gap',
      'column-gap',
      'collapsed-rows',
      'collapsed',
    ]
  }

  /** 折叠行受控旗标：默认折叠语义已 bootstrap（collapsed 属性由组件写入一次）后不再自动改写 */
  private collapseBootstrapped = false
  private observer: MutationObserver | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <style data-oas-grid-breakpoints></style>
      <slot></slot>
      <div class="collapse-tail" part="collapse-tail" hidden>
        <button type="button" class="collapse-tail-btn" part="collapse-tail-btn"></button>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定尾格点击 + 子项增删/span 变化观察（render 与水合路径共用） */
  private bind(): void {
    this.shadow.querySelector('.collapse-tail-btn')?.addEventListener('click', () => this.onTailClick())
    // 子项增删（childList）与 span/offset 属性变化（attributes 过滤）→ 重算折叠行布局；
    // 组件自身写回的 hidden/collapsed 不在过滤集内，无回环
    this.observer = new MutationObserver(() => this.syncCollapse())
    this.observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['span', 'offset'],
    })
    this.onCleanup(() => {
      this.observer?.disconnect()
      this.observer = null
    })
  }

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
   * - 两值（空格或逗号分隔「行 列」，如 `8 16` / `8,16`）：row-gap/column-gap 分开设置，清理 gap 简写；
   * - 0 个或 ≥3 个值：非法，静默忽略回落默认 0。
   * 纯数字值补 px（浏览器丢弃无单位 CSS 长度——happy-dom 不校验故单测漏检，
   * 与 menu max-height 的 `/^\d+$/ → px` 惯例同款）
   */
  private applyGap(): void {
    const raw = this.getAttr('gap', '0')
    const parts = raw
      .trim()
      .split(/[\s,]+/)
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
   * 行列分离属性（PRD P2）：`row-gap` / `column-gap` 显式覆盖 `gap` 对应轴（独立生效，
   * 未设置的轴保持 gap 解析结果）；纯数字补 px。
   */
  private applyAxisGaps(): void {
    const toLen = (v: string): string => (/^\d+$/.test(v.trim()) ? `${v.trim()}px` : v.trim())
    const row = this.getAttr('row-gap', '').trim()
    const col = this.getAttr('column-gap', '').trim()
    if (row !== '') this.style.rowGap = toLen(row)
    if (col !== '') this.style.columnGap = toLen(col)
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
    const styleEl = this.shadow.querySelector<HTMLStyleElement>('style[data-oas-grid-breakpoints]')
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
        (r) => `@media (min-width: ${BREAKPOINTS[r.name]}) { :host { --oas-grid-columns: repeat(${r.value}, 1fr) } }`,
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
    // 不写内联 display——:host{display:grid} 与 :host([hidden]) 兜底已由样式表覆盖；
    // 内联 display 特异性压过 :host([hidden])，且 hidden 不在 observedAttributes 时
    // 动态加 hidden 会依旧可见（review 实抓）
    this.applyGap()
    this.applyAxisGaps()
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
    this.syncCollapse()
  }

  // ===== collapsed-rows 折叠行（PRD P2） =====

  /** 折叠行参与子项：元素子项（排除 style/script/template） */
  private collapseChildren(): HTMLElement[] {
    return Array.from(this.children).filter(
      (el) => el.tagName !== 'STYLE' && el.tagName !== 'SCRIPT' && el.tagName !== 'TEMPLATE',
    ) as HTMLElement[]
  }

  /** 折叠是否启用：collapsed-rows 有值，且非 columns/min-child-width 自动布局（行模型依赖 span/offset 语义） */
  private collapseEnabled(): boolean {
    if (this.getAttr('collapsed-rows', '').trim() === '') return false
    return this.getAttr('columns', '').trim() === '' && this.getAttr('min-child-width', '').trim() === ''
  }

  /** 单个子项占用的列数：grid-item 按 span/offset（auto 视作整行），普通元素按自动放置 1 格 */
  private childColumns(child: HTMLElement): number {
    if (child.tagName !== 'OAS-GRID-ITEM') return 1
    const raw = (child.getAttribute('span') ?? '').trim()
    const span = raw === '' || raw === 'auto' ? 24 : Math.min(24, Math.max(1, Math.trunc(Number(raw)) || 24))
    const offset = Math.min(24, Math.max(0, Math.trunc(Number(child.getAttribute('offset')) || 0)))
    return Math.min(24, span + offset)
  }

  /** 折叠显示的最大行数（非法回落 1，下限 1） */
  private collapsedRows(): number {
    const n = Math.trunc(Number(this.getAttr('collapsed-rows', '1')))
    return Number.isFinite(n) && n >= 1 ? n : 1
  }

  /**
   * 折叠行布局同步：
   * - 行模型：按 DOM 序累计列位（自动放置的确定性近似），超出 24 列换行；
   * - 受控语义：折叠态写回 `collapsed` 属性——首帧缺省为折叠（写入 collapsed），
   *   之后属性交由宿主/尾格切换，组件不再自动改写（collapseBootstrapped 门闩）；
   * - 尾格：折叠且存在被折叠行时显示「展开」，展开后显示「收起」（可折回）；
   *   grid-column 占所在收支行/末行的剩余列（剩余为 0 时独占整行）。
   */
  private syncCollapse(): void {
    const tail = this.shadow.querySelector<HTMLElement>('.collapse-tail')
    const btn = this.shadow.querySelector<HTMLElement>('.collapse-tail-btn')
    if (!tail || !btn) return
    const children = this.collapseChildren()

    if (!this.collapseEnabled()) {
      // 未启用：全部可见 + 尾格隐藏（解除启用时清理 hidden 残留）
      for (const child of children) {
        if (child.hasAttribute('hidden')) child.removeAttribute('hidden')
      }
      tail.hidden = true
      this.collapseBootstrapped = false
      return
    }

    // 首帧缺省折叠：写入 collapsed 属性（受控契约的初始落点，此后不再自动改写）
    if (!this.collapseBootstrapped) {
      this.collapseBootstrapped = true
      if (!this.hasAttribute('collapsed')) this.setAttribute('collapsed', '')
    }

    // 行模型：逐项累计列位
    const maxRows = this.collapsedRows()
    const rows: number[] = []
    let row = 1
    let pos = 0
    for (const child of children) {
      const need = this.childColumns(child)
      if (pos > 0 && pos + need > 24) {
        row++
        pos = 0
      }
      rows.push(row)
      pos += need
    }
    const totalRows = children.length > 0 ? row : 0
    const collapsed = this.hasAttribute('collapsed')

    // 可见行上限：折叠取 maxRows，展开取全部
    const limit = collapsed ? maxRows : totalRows
    let changed = false
    let endPos = 0
    children.forEach((child, i) => {
      const visible = (rows[i] ?? 1) <= limit
      if (visible && rows[i] === limit) endPos += this.childColumns(child)
      if (visible === child.hasAttribute('hidden')) {
        // 写回带变更守卫：重复写同一状态不触发任何观察者（防 MutationObserver 回环）
        if (visible) child.removeAttribute('hidden')
        else child.setAttribute('hidden', '')
        changed = true
      }
    })

    // 尾格显隐：折叠且有内容被折叠（或展开过需要折回入口）时可见
    const tailVisible = collapsed ? totalRows > maxRows : this.collapseEverExpanded
    if (this.collapseEverExpanded && !collapsed && totalRows <= maxRows) {
      // 全量展开本来就是完整形态：无需收起入口（自然态）
      this.collapseEverExpanded = false
    }
    tail.hidden = !tailVisible
    if (tailVisible) {
      // 尾格占末可见行剩余列；剩余为 0（整行排满）时独占整行
      const remaining = 24 - (endPos % 24)
      tail.style.gridColumn = `span ${remaining > 0 ? remaining : 24}`
      btn.textContent = collapsed ? this.t('ellipsis.expand') : this.t('ellipsis.collapse')
      btn.setAttribute('aria-expanded', String(!collapsed))
    }
    void changed
  }

  /** 用户经尾格展开过（期间需要「收起」折回入口的依据） */
  private collapseEverExpanded = false

  /** 尾格点击：折叠 ↔ 展开切换（受控写回 collapsed 属性 + oas-collapse 事件） */
  private onTailClick(): void {
    if (!this.collapseEnabled()) return
    const collapsed = this.hasAttribute('collapsed')
    if (collapsed) {
      // 旗标先于 attribute 写入：setAttribute 同步触发 update → syncCollapse，
      // 依赖该旗标决定「收起」入口显隐
      this.collapseEverExpanded = true
      this.removeAttribute('collapsed')
    } else {
      this.setAttribute('collapsed', '')
    }
    this.emit('collapse', { collapsed: !collapsed })
  }
}
