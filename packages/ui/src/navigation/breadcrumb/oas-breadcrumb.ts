import { OASElement } from '@oas-ui/core'
import { iconRegistry, iconNames, type IconName } from '@oas-ui/icons'

export interface BreadcrumbItem {
  label: string
  href?: string
  /** 前置图标（@oas-ui/icons 注册表图标名） */
  icon?: string
  /** 禁用项：渲染为非交互文本（aria-disabled） */
  disabled?: boolean
  /** 链接 target（_blank 时自动补 noopener noreferrer） */
  target?: string
  /** 项级分隔符：覆盖全局 separator（支持图标名） */
  separator?: string
  /** 项带下拉菜单：点击触发器展开子项列表 */
  dropdown?: BreadcrumbItem[]
  /** 单项最大宽度（px）：超出省略号截断 + title 提示 */
  maxWidth?: number
  /** 显式标记当前项（aria-current="page"），默认取末项 */
  active?: boolean
}

/** 图标名集合（O(1) 判断 separator / icon 是否图标名） */
const ICON_NAMES = new Set<string>(iconNames)

/** 子元素通道内部扩展：任意节点分隔符（JSON 通道无法表达），不透出公共 BreadcrumbItem */
interface BreadcrumbItemInternal extends BreadcrumbItem {
  separatorNode?: Node
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  /* 面包屑是导航文本（非容器控件），跟随外层字号；定制开口：--oas-breadcrumb-font */
  font-size: var(--oas-breadcrumb-font, inherit);
  color: var(--oas-color-text-secondary);
}
:host([hidden]) {
  display: none;
}
nav {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
/* ellipsis 单行省略：容器不换行、整体超宽截断，链接文本各自省略。
   用 overflow-x: clip + overflow-y: visible 而非 overflow: hidden——hidden 双轴裁剪，
   会把项下拉面板（.menu-panel 在 nav 内绝对定位向下浮出）一并裁掉；clip 只裁横轴、纵轴放行 */
nav.ellipsis {
  flex-wrap: nowrap;
  overflow-x: clip;
  overflow-y: visible;
}
nav.ellipsis .item {
  min-width: 0;
}
nav.ellipsis .sep,
nav.ellipsis .ellipsis-btn,
nav.ellipsis .dropdown-trigger,
nav.ellipsis .item-icon,
nav.ellipsis .chevron {
  flex-shrink: 0;
}
nav.ellipsis [part='item'],
nav.ellipsis [part='link'],
nav.ellipsis [part='current'],
nav.ellipsis [part='disabled'] {
  min-width: 0;
}
nav.ellipsis .item-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.item {
  display: inline-flex;
  align-items: center;
  position: relative;
}
.sep {
  margin: 0 var(--oas-space-2);
  color: var(--oas-color-border);
  user-select: none;
  display: inline-flex;
  align-items: center;
}
.sep svg {
  display: block;
  width: 1em;
  height: 1em;
}
[part='link'] {
  color: var(--oas-color-text-secondary);
  text-decoration: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  min-width: 0;
}
[part='link']:hover {
  color: var(--oas-color-primary);
}
/* active-last 场景：当前页（末项）渲染为可点链接，但保留「当前」视觉（加粗 + 主文本色） */
[part='link'][aria-current='page'] {
  color: var(--oas-color-text-primary);
  font-weight: 500;
}
[part='link'][aria-current='page']:hover {
  color: var(--oas-color-primary);
}
[part='link'].plain {
  cursor: default;
}
[part='link'].plain:hover {
  color: var(--oas-color-text-secondary);
}
[part='current'] {
  color: var(--oas-color-text-primary);
  font-weight: 500;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  min-width: 0;
}
[part='disabled'] {
  color: var(--oas-color-text-disabled);
  cursor: default;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
}
[part='icon'],
.item-icon {
  display: block;
  width: 1em;
  height: 1em;
  flex-shrink: 0;
}
.chevron {
  display: block;
  width: 1em;
  height: 1em;
  flex-shrink: 0;
}
.item-text {
  display: inline-block;
  min-width: 0;
  vertical-align: bottom;
}
.item-text.truncated {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
/* 折叠/下拉共用面板：锚定 .item（position:relative），top 100% 落在项下方 */
.menu-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-dropdown, 1000));
  min-width: 140px;
  max-width: 260px;
  padding: var(--oas-space-1);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  display: none;
}
.menu-panel.open {
  display: block;
}
/* 下拉水平翻转：面板右缘超出视口（窄视口长链接）时 right:0 对齐回折进视口（JS 检测后切类） */
.menu-panel.flip-right {
  left: auto;
  right: 0;
}
/* 折叠省略按钮：锚定下拉面板 */
.ellipsis-btn {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0 var(--oas-space-1);
  font-family: inherit;
  font-size: inherit;
  line-height: 1.6;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  border-radius: var(--oas-radius-sm);
  transition: background var(--oas-transition-fast) var(--oas-ease-out),
    color var(--oas-transition-fast) var(--oas-ease-out);
}
.ellipsis-btn:hover,
.ellipsis-btn[aria-expanded='true'] {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
.ellipsis-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 项下拉触发器（item.dropdown）：文本 + 尾随 chevron */
.dropdown-trigger {
  appearance: none;
  border: none;
  background: transparent;
  margin: 0;
  padding: 1px var(--oas-space-1);
  font-family: inherit;
  font-size: inherit;
  line-height: 1.6;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  border-radius: var(--oas-radius-sm);
  transition: background var(--oas-transition-fast) var(--oas-ease-out),
    color var(--oas-transition-fast) var(--oas-ease-out);
}
.dropdown-trigger:hover,
.dropdown-trigger[aria-expanded='true'] {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
.dropdown-trigger:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.ellipsis-item {
  padding: var(--oas-space-1) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  font-size: inherit;
  color: var(--oas-color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ellipsis-item:hover {
  background: var(--oas-color-bg-hover);
}
.ellipsis-item a {
  display: block;
  color: var(--oas-color-text-secondary);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ellipsis-item a:hover {
  color: var(--oas-color-primary);
}
.ellipsis-item[aria-disabled='true'] {
  color: var(--oas-color-text-disabled);
  cursor: default;
}
.ellipsis-item[aria-disabled='true']:hover {
  background: transparent;
}
/* size 档位 */
nav.size-small {
  font-size: var(--oas-font-size-sm);
}
nav.size-small .sep {
  margin: 0 var(--oas-space-1);
}
nav.size-small .ellipsis-btn,
nav.size-small .dropdown-trigger {
  line-height: 1.4;
}
nav.size-large {
  font-size: var(--oas-font-size-lg);
}
nav.size-large .sep {
  margin: 0 var(--oas-space-3);
}
nav.size-large [part='link'],
nav.size-large [part='current'],
nav.size-large .ellipsis-btn,
nav.size-large .dropdown-trigger {
  padding: var(--oas-space-1) var(--oas-space-1);
}
/* color 变体：当前项 + 链接 hover 用指定语义色（走 token，含 dark 变体） */
nav.color-primary [part='current'] {
  color: var(--oas-color-primary);
}
nav.color-primary [part='link']:hover {
  color: var(--oas-color-primary);
}
nav.color-success [part='current'] {
  color: var(--oas-color-success);
}
nav.color-success [part='link']:hover {
  color: var(--oas-color-success);
}
nav.color-warning [part='current'] {
  color: var(--oas-color-warning);
}
nav.color-warning [part='link']:hover {
  color: var(--oas-color-warning);
}
nav.color-danger [part='current'] {
  color: var(--oas-color-danger);
}
nav.color-danger [part='link']:hover {
  color: var(--oas-color-danger);
}
nav.color-info [part='current'] {
  color: var(--oas-color-info-text);
}
nav.color-info [part='link']:hover {
  color: var(--oas-color-info-text);
}
/* variant=underline：链接与当前项常驻下划线 */
nav.variant-underline [part='link'],
nav.variant-underline [part='current'] {
  text-decoration: underline;
  text-underline-offset: 3px;
}
nav.variant-underline [part='link'] {
  text-decoration-color: var(--oas-color-border);
}
nav.variant-underline [part='link']:hover {
  text-decoration-color: var(--oas-color-primary);
}
`

export class OASBreadcrumb extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'items',
      'separator',
      'collapsed',
      'max-items',
      'ellipsis',
      'items-before-collapse',
      'items-after-collapse',
      'collapse-text',
      'size',
      'max-item-width',
      'color',
      'variant',
      'active-last',
    ]
  }

  /** 折叠/下拉展开状态（key：'ellipsis' 或 'dd-<序列序号>'，跨 update 重建保留；互斥展开） */
  private openDropdowns = new Set<string>()

  /** 子元素通道观察器：light DOM 里 oas-breadcrumb-item/separator 增删或属性/文本变化 → 重渲染 */
  private childObserver: MutationObserver | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <nav part="nav"></nav>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用；面包屑项事件在 update 重建时绑定） */
  private bind(): void {
    // 组件断开时清理下拉的 document 点击监听（连接期间打开/关闭反复 add/remove，此处兜底移除）
    this.onCleanup(() => document.removeEventListener('click', this.handleOutsideClick, true))
    // 键盘方向键导航：焦点在可聚焦项上时 ArrowLeft/Right/Home/End 循环移动
    this.shadow.querySelector('nav')?.addEventListener('keydown', this.handleNavKeydown)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（nav 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('nav')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const nav = this.shadow.querySelector('nav')
    if (!nav) return
    // 子元素通道：items 属性未显式设置时监听 light DOM 子元素变化（重连后重建观察器）
    this.ensureChildObserver()
    // 导航 aria-label locale 驱动（setLocale 切换自动重刷）
    nav.setAttribute('aria-label', this.t('breadcrumb.nav'))
    // ellipsis：单行省略模式（nav 容器不换行 + 链接文本各自省略）
    nav.classList.toggle('ellipsis', this.hasAttr('ellipsis'))
    this.syncSize(nav)
    this.syncColor(nav)
    this.syncVariant(nav)
    nav.innerHTML = ''
    // 双通道：items 属性显式设置时数据驱动优先；否则解析子元素收敛到同一 items 模型渲染
    const items = this.hasAttribute('items') ? this.parseItems() : this.parseChildItems()
    const separator = this.getAttr('separator', '/')
    const maxItemWidth = this.widthValue(this.getAttr('max-item-width', ''))

    // 折叠：collapsed 且 items 数超过 max-items（默认 4）时，
    // 保留 items-before-collapse（默认 1）+ 末 items-after-collapse（默认 max-items-2）项，
    // 中间项收进 … 下拉
    const maxItems = this.maxItemsValue()
    const collapsed = this.hasAttr('collapsed') && items.length > maxItems
    const before = this.countValue(this.getAttr('items-before-collapse', ''), 1)
    const after = this.countValue(
      this.getAttr('items-after-collapse', ''),
      Math.max(0, maxItems - 2),
    )
    let hiddenItems: BreadcrumbItem[] = []
    // seq 携带原始 items 下标：当前项判定 / 下拉 data-key / 项级分隔符都按原始下标定位
    let seq: Array<{ item: BreadcrumbItem; idx: number } | 'ellipsis'> = items.map((item, idx) => ({
      item,
      idx,
    }))
    if (collapsed) {
      const start = Math.min(before, items.length)
      const end = Math.max(0, items.length - after)
      const hidden = items.slice(start, end)
      if (hidden.length > 0) {
        hiddenItems = hidden
        seq = [
          ...items.slice(0, start).map((item, i) => ({ item, idx: i })),
          'ellipsis',
          ...items.slice(end).map((item, i) => ({ item, idx: end + i })),
        ]
      }
    }
    const currentIdx = this.currentIndex(items)

    seq.forEach((slot, seqIdx) => {
      const isLast = seqIdx === seq.length - 1
      const span = document.createElement('span')
      span.className = 'item'
      span.setAttribute('part', 'item')
      if (slot === 'ellipsis') {
        span.classList.add('ellipsis-wrap')
        span.appendChild(this.buildEllipsisControl(hiddenItems))
      } else {
        this.appendItemContent(span, slot.item, slot.idx, currentIdx, maxItemWidth)
      }
      nav.appendChild(span)
      if (!isLast) {
        // 项级分隔符优先级：任意节点（子元素通道）> separator 文本/图标名 > 全局
        let sepValue: string | Node = separator
        if (slot !== 'ellipsis') {
          const item = slot.item as BreadcrumbItemInternal
          sepValue = item.separatorNode ?? (item.separator as string | undefined) ?? separator
        }
        nav.appendChild(this.buildSeparator(sepValue))
      }
    })
    this.syncStructuredData(items)
    this.syncDropdowns()
  }

  // ===== 属性归一化 =====

  private parseItems(): BreadcrumbItem[] {
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      return Array.isArray(parsed)
        ? parsed.filter((i): i is BreadcrumbItem => i && typeof i.label === 'string')
        : []
    } catch {
      return []
    }
  }

  // ===== 子元素声明式通道 =====

  /**
   * 子元素通道解析层：把 light DOM 的 `<oas-breadcrumb-item>` / `<oas-breadcrumb-separator>`
   * 收敛为内部 items 模型（单一渲染路径）。独立 separator 元素归属前一项之后的分隔位置；
   * 项级 separator 支持属性（文本/图标名）或 slot="separator" 任意节点。
   */
  private parseChildItems(): BreadcrumbItemInternal[] {
    const items: BreadcrumbItemInternal[] = []
    for (const child of Array.from(this.children)) {
      if (child.tagName === 'OAS-BREADCRUMB-ITEM') {
        const item = this.childToItem(child)
        items.push(item)
      } else if (child.tagName === 'OAS-BREADCRUMB-SEPARATOR' && items.length > 0) {
        items[items.length - 1]!.separatorNode = this.separatorContent(child)
      }
    }
    return items
  }

  /** 单个子元素 → 内部 item（默认插槽文本为 label，属性对齐 items 字段） */
  private childToItem(el: Element): BreadcrumbItemInternal {
    const item: BreadcrumbItemInternal = {
      label: this.childLabel(el),
      disabled: el.hasAttribute('disabled'),
      active: el.hasAttribute('active'),
    }
    const href = el.getAttribute('href')
    if (href) item.href = href
    const target = el.getAttribute('target')
    if (target) item.target = target
    const icon = el.getAttribute('icon')
    if (icon) item.icon = icon
    const sepAttr = el.getAttribute('separator')
    if (sepAttr) item.separator = sepAttr
    const sepNode = this.slottedSeparator(el)
    if (sepNode) item.separatorNode = sepNode
    const maxW = el.getAttribute('max-width')
    if (maxW) {
      const n = Number.parseFloat(maxW)
      if (Number.isFinite(n) && n > 0) item.maxWidth = n
    }
    const dd = el.getAttribute('dropdown')
    if (dd) item.dropdown = this.parseDropdown(dd)
    return item
  }

  /** 默认插槽 label 文本：排除 slot="separator" 子元素（separator 内容不混入标签） */
  private childLabel(el: Element): string {
    let text = ''
    for (const node of el.childNodes) {
      if (node instanceof Element && node.getAttribute('slot') === 'separator') continue
      text += node.textContent ?? ''
    }
    return text
  }

  /** 项级 separator 内联节点：slot="separator" 子元素的内容（任意节点） */
  private slottedSeparator(el: Element): Node | null {
    const slotted = Array.from(el.children).find((c) => c.getAttribute('slot') === 'separator')
    return slotted ? this.separatorContent(slotted) : null
  }

  /**
   * 取分隔符内容节点：oas-breadcrumb-separator 元素仅作容器（自身 display:none），
   * 克隆其内容避免载体样式传染；其他任意节点原样克隆（保留自身样式）。
   */
  private separatorContent(el: Element): Node {
    if (el.tagName === 'OAS-BREADCRUMB-SEPARATOR') {
      const frag = document.createDocumentFragment()
      for (const node of el.childNodes) frag.appendChild(document.importNode(node, true))
      return frag
    }
    return document.importNode(el, true)
  }

  /** dropdown 属性 JSON 归一化（非法/非数组回退空数组） */
  private parseDropdown(raw: string): BreadcrumbItem[] | undefined {
    try {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return undefined
      const rows = parsed.filter((i): i is BreadcrumbItem => i && typeof i.label === 'string')
      return rows.length > 0 ? rows : undefined
    } catch {
      return undefined
    }
  }

  /** 子元素通道观察器：只监听 light DOM 子元素；结构化数据注入的 script 增删是自身动作，忽略防循环 */
  private ensureChildObserver(): void {
    if (this.childObserver) return
    const observer = new MutationObserver((mutations) => {
      const isSelfScript = mutations.every(
        (m) =>
          m.type === 'childList' &&
          m.target === this &&
          [...m.addedNodes, ...m.removedNodes].every(
            (n) => n.nodeType === Node.ELEMENT_NODE && (n as Element).tagName === 'SCRIPT',
          ),
      )
      if (isSelfScript) return
      this.update()
    })
    observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeFilter: [
        'href',
        'target',
        'icon',
        'disabled',
        'max-width',
        'separator',
        'dropdown',
        'active',
        'slot',
      ],
    })
    this.childObserver = observer
    this.onCleanup(() => {
      observer.disconnect()
      this.childObserver = null
    })
  }

  /** max-items 归一化：非法值回退默认 4 */
  private maxItemsValue(): number {
    const n = Number.parseInt(this.getAttr('max-items', '4'), 10)
    return Number.isNaN(n) || n < 1 ? 4 : n
  }

  /** 非负整数属性：显式缺省时用 fallback，非法值回退 fallback */
  private countValue(raw: string, fallback: number): number {
    if (raw === '') return fallback
    const n = Number.parseInt(raw, 10)
    return Number.isFinite(n) && n >= 0 ? n : fallback
  }

  /** 宽度值（px）：非法/空 → NaN（表示不截断） */
  private widthValue(raw: string): number {
    if (raw === '') return NaN
    const n = Number.parseFloat(raw)
    return Number.isFinite(n) && n > 0 ? n : NaN
  }

  /** 当前项（aria-current="page"）：显式 active 字段优先，否则末项 */
  private currentIndex(items: BreadcrumbItem[]): number {
    if (items.length === 0) return -1
    const explicit = items.findIndex((i) => i.active === true)
    return explicit !== -1 ? explicit : items.length - 1
  }

  private syncSize(nav: HTMLElement): void {
    const size = this.getAttr('size', 'medium')
    nav.classList.toggle('size-small', size === 'small')
    nav.classList.toggle('size-large', size === 'large')
  }

  private syncColor(nav: HTMLElement): void {
    const colors = ['primary', 'success', 'warning', 'danger', 'info'] as const
    for (const c of colors) nav.classList.remove(`color-${c}`)
    const color = this.getAttr('color', '')
    if ((colors as readonly string[]).includes(color)) nav.classList.add(`color-${color}`)
  }

  private syncVariant(nav: HTMLElement): void {
    nav.classList.toggle('variant-underline', this.getAttr('variant', '') === 'underline')
  }

  // ===== 项渲染 =====

  /** 渲染单个面包屑项（链接 / 当前 / 禁用 / 纯文本 / 下拉触发器） */
  private appendItemContent(
    span: HTMLElement,
    item: BreadcrumbItem,
    idx: number,
    currentIdx: number,
    maxItemWidth: number,
  ): void {
    const isCurrent = idx === currentIdx && idx >= 0
    const activeLast = this.hasAttr('active-last') && !!item.href
    if (item.disabled) {
      span.appendChild(this.disabledContent(item, maxItemWidth))
      return
    }
    if (isCurrent && !activeLast) {
      span.appendChild(this.currentContent(item, maxItemWidth))
      return
    }
    if (item.dropdown && item.dropdown.length > 0) {
      span.appendChild(this.buildDropdownControl(item, idx, maxItemWidth))
      return
    }
    if (item.href) {
      span.appendChild(this.linkContent(item, maxItemWidth, isCurrent))
      return
    }
    span.appendChild(this.plainContent(item, maxItemWidth))
  }

  /** 前置图标 svg（复用 @oas-ui/icons 注册表，与 oas-icon 同源） */
  private iconSvg(name?: string): SVGElement | null {
    if (!name) return null
    const path = iconRegistry[name as IconName]
    if (!path) return null
    const wrap = document.createElement('div')
    wrap.innerHTML = `<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">${path}</svg>`
    return (wrap.firstElementChild as SVGElement) ?? null
  }

  /** 文本容器：单项宽度截断时挂 truncated class + 内联 max-width */
  private labelSpan(item: BreadcrumbItem, maxItemWidth: number): HTMLElement {
    const text = document.createElement('span')
    text.className = 'item-text'
    text.textContent = item.label
    const w = this.itemMaxWidth(item, maxItemWidth)
    if (Number.isFinite(w) && w > 0) {
      text.classList.add('truncated')
      text.style.maxWidth = `${w}px`
    }
    return text
  }

  /** 单项宽度：item.maxWidth 覆盖全局 max-item-width */
  private itemMaxWidth(item: BreadcrumbItem, global: number): number {
    if (item.maxWidth !== undefined) {
      const n =
        typeof item.maxWidth === 'number' ? item.maxWidth : Number.parseFloat(String(item.maxWidth))
      if (Number.isFinite(n) && n > 0) return n
    }
    return global
  }

  private prependIcon(container: HTMLElement, item: BreadcrumbItem): void {
    const icon = this.iconSvg(item.icon)
    if (!icon) return
    icon.setAttribute('part', 'icon')
    icon.classList.add('item-icon')
    container.appendChild(icon)
  }

  private linkContent(item: BreadcrumbItem, maxItemWidth: number, isCurrent: boolean): HTMLElement {
    const a = document.createElement('a')
    a.setAttribute('part', 'link')
    a.href = item.href ?? ''
    a.title = item.label
    if (item.target) {
      a.target = item.target
      if (item.target === '_blank') a.setAttribute('rel', 'noopener noreferrer')
    }
    if (isCurrent) a.setAttribute('aria-current', 'page')
    this.prependIcon(a, item)
    a.appendChild(this.labelSpan(item, maxItemWidth))
    a.addEventListener('click', (e: MouseEvent) => {
      this.emit('select', { value: item.href })
      // 真实链接：不阻止默认行为（原生跳转），宿主可自行拦截做路由；
      // 仅空 href / '#' 作为动作链接时阻止默认跳转（避免页面滚回顶部）
      const href = a.getAttribute('href') ?? ''
      if (href === '' || href === '#') e.preventDefault()
    })
    return a
  }

  private currentContent(item: BreadcrumbItem, maxItemWidth: number): HTMLElement {
    const cur = document.createElement('span')
    cur.setAttribute('part', 'current')
    cur.setAttribute('aria-current', 'page')
    cur.title = item.label
    this.prependIcon(cur, item)
    cur.appendChild(this.labelSpan(item, maxItemWidth))
    return cur
  }

  private disabledContent(item: BreadcrumbItem, maxItemWidth: number): HTMLElement {
    const d = document.createElement('span')
    d.setAttribute('part', 'disabled')
    d.setAttribute('aria-disabled', 'true')
    d.title = item.label
    this.prependIcon(d, item)
    d.appendChild(this.labelSpan(item, maxItemWidth))
    return d
  }

  /** 无 href 且非当前的中间项：纯文本（不可交互） */
  private plainContent(item: BreadcrumbItem, maxItemWidth: number): HTMLElement {
    const plain = document.createElement('span')
    plain.setAttribute('part', 'link')
    plain.classList.add('plain')
    plain.title = item.label
    this.prependIcon(plain, item)
    plain.appendChild(this.labelSpan(item, maxItemWidth))
    return plain
  }

  /** 分隔符：任意节点（子元素通道）原样克隆 → 图标名 → 文本 */
  private buildSeparator(value: string | Node): HTMLElement {
    const sep = document.createElement('span')
    sep.className = 'sep'
    sep.setAttribute('part', 'separator')
    if (value instanceof Node) {
      // 任意节点分隔符：装饰性内容，对读屏隐藏
      sep.setAttribute('aria-hidden', 'true')
      sep.appendChild(document.importNode(value, true))
      return sep
    }
    if (ICON_NAMES.has(value as IconName)) {
      const svg = this.iconSvg(value)
      if (svg) {
        svg.setAttribute('aria-hidden', 'true')
        sep.appendChild(svg)
        return sep
      }
    }
    sep.textContent = value
    return sep
  }

  // ===== 折叠省略 + 项下拉（共用菜单面板构建） =====

  /**
   * 构建 … 按钮 + 下拉面板（面板默认隐藏，内容为全部被折叠项）。
   * 节点在 update 重建时创建并绑定事件，无重复绑定；断开连接由 onCleanup 统一清理 document 监听。
   */
  private buildEllipsisControl(hiddenItems: BreadcrumbItem[]): HTMLElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'ellipsis-btn'
    btn.setAttribute('part', 'ellipsis')
    btn.setAttribute('aria-haspopup', 'menu')
    btn.setAttribute('aria-expanded', 'false')
    btn.setAttribute('aria-label', this.t('breadcrumb.expand'))
    btn.textContent = this.getAttr('collapse-text', '…')
    btn.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation()
      // 展开下拉时派发折叠事件（detail 带被折叠项原始数组），宿主可自定义折叠面板
      const opening = !this.openDropdowns.has('ellipsis')
      this.toggleDropdown('ellipsis')
      if (opening) this.emit('collapse-click', { collapsedItems: hiddenItems })
    })
    btn.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.toggleDropdown('ellipsis', false)
    })

    const dropdown = document.createElement('div')
    dropdown.className = 'ellipsis-dropdown menu-panel'
    dropdown.setAttribute('part', 'ellipsis-menu')
    dropdown.setAttribute('role', 'menu')
    dropdown.setAttribute('aria-label', this.t('breadcrumb.expand'))
    dropdown.appendChild(this.buildMenuItems(hiddenItems, 'ellipsis'))

    const wrap = document.createElement('span')
    wrap.appendChild(btn)
    wrap.appendChild(dropdown)
    return wrap
  }

  /** 项下拉触发器 + 面板（item.dropdown）：点击展开，互斥收起 */
  private buildDropdownControl(
    item: BreadcrumbItem,
    idx: number,
    maxItemWidth: number,
  ): HTMLElement {
    const key = `dd-${idx}`
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'dropdown-trigger'
    btn.setAttribute('part', 'dropdown')
    btn.setAttribute('data-key', key)
    btn.setAttribute('aria-haspopup', 'menu')
    btn.setAttribute('aria-expanded', 'false')
    btn.title = item.label
    this.prependIcon(btn, item)
    btn.appendChild(this.labelSpan(item, maxItemWidth))
    const chevron = this.iconSvg('chevron-down')
    if (chevron) {
      chevron.classList.add('chevron')
      chevron.setAttribute('aria-hidden', 'true')
      btn.appendChild(chevron)
    }
    btn.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation()
      this.toggleDropdown(key)
    })
    btn.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.toggleDropdown(key, false)
    })

    const panel = document.createElement('div')
    panel.className = 'item-dropdown menu-panel'
    panel.setAttribute('part', 'dropdown-menu')
    panel.setAttribute('role', 'menu')
    panel.setAttribute('data-key', key)
    panel.appendChild(this.buildMenuItems(item.dropdown ?? [], key))

    const wrap = document.createElement('span')
    wrap.appendChild(btn)
    wrap.appendChild(panel)
    return wrap
  }

  /** 面板内菜单项：href 项渲染链接（点击派发 oas-select 并收起），否则 aria-disabled 纯文本 */
  private buildMenuItems(rows: BreadcrumbItem[], closeKey: string): DocumentFragment {
    const frag = document.createDocumentFragment()
    for (const item of rows) {
      const row = document.createElement('div')
      row.className = 'ellipsis-item'
      row.setAttribute('role', 'menuitem')
      if (item.disabled || !item.href) {
        row.textContent = item.label
        row.setAttribute('aria-disabled', 'true')
        frag.appendChild(row)
        continue
      }
      const a = document.createElement('a')
      a.setAttribute('part', 'link')
      a.href = item.href
      a.textContent = item.label
      a.title = item.label
      if (item.target) {
        a.target = item.target
        if (item.target === '_blank') a.setAttribute('rel', 'noopener noreferrer')
      }
      a.addEventListener('click', (e: MouseEvent) => {
        this.emit('select', { value: item.href })
        // 不阻止真实链接默认行为（原生跳转）；仅空 href / '#' 动作链接阻止（避免滚回顶部）
        const href = a.getAttribute('href') ?? ''
        if (href === '' || href === '#') e.preventDefault()
        this.openDropdowns.delete(closeKey)
        this.syncDropdowns()
      })
      row.appendChild(a)
      frag.appendChild(row)
    }
    return frag
  }

  // ===== 下拉显隐 =====

  /** 互斥展开：开新关旧；open 参数显式指定时强制开/关 */
  private toggleDropdown(key: string, open?: boolean): void {
    const next = open ?? !this.openDropdowns.has(key)
    this.openDropdowns.clear()
    if (next) this.openDropdowns.add(key)
    this.syncDropdowns()
  }

  /** 全部下拉（折叠省略 + 项下拉）的显隐 + aria-expanded 增量同步；打开时挂 document 点击监听 */
  private syncDropdowns(): void {
    const root = this.shadow
    if (!root) return
    const controls: Array<{ key: string; panel: HTMLElement; btn: HTMLElement }> = []
    const ellipsisBtn = root.querySelector<HTMLElement>('.ellipsis-btn')
    const ellipsisPanel = root.querySelector<HTMLElement>('.ellipsis-dropdown')
    if (ellipsisBtn && ellipsisPanel) {
      controls.push({ key: 'ellipsis', panel: ellipsisPanel, btn: ellipsisBtn })
    }
    for (const panel of root.querySelectorAll<HTMLElement>('.item-dropdown')) {
      const key = panel.getAttribute('data-key')
      if (!key) continue
      const btn = root.querySelector<HTMLElement>(`.dropdown-trigger[data-key="${key}"]`)
      if (btn) controls.push({ key, panel, btn })
    }
    // 清理失效 key（面板被折叠/移除后复位状态，避免残留打开标记）
    const valid = new Set(controls.map((c) => c.key))
    for (const k of [...this.openDropdowns]) {
      if (!valid.has(k)) this.openDropdowns.delete(k)
    }
    for (const c of controls) {
      const open = this.openDropdowns.has(c.key)
      c.panel.classList.toggle('open', open)
      c.btn.setAttribute('aria-expanded', String(open))
      if (open) this.placePanel(c.panel, c.btn)
    }
    if (this.openDropdowns.size > 0) {
      document.addEventListener('click', this.handleOutsideClick, true)
    } else {
      document.removeEventListener('click', this.handleOutsideClick, true)
    }
  }

  /** 下拉水平翻转：面板右缘超出视口（offsetWidth 布局尺寸判定）→ right:0 对齐回折进视口 */
  private placePanel(panel: HTMLElement, btn: HTMLElement): void {
    const rect = btn.getBoundingClientRect()
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0
    const panelWidth = panel.offsetWidth
    if (viewportWidth > 0 && panelWidth > 0 && rect.right + panelWidth > viewportWidth - 8) {
      panel.classList.add('flip-right')
    } else {
      panel.classList.remove('flip-right')
    }
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    // composedPath 含宿主（shadow 内任意点击）则视为组件内部，不关闭
    if (!e.composedPath().includes(this)) {
      this.openDropdowns.clear()
      this.syncDropdowns()
    }
  }

  // ===== 键盘方向键导航 =====

  /** 方向键循环移动焦点（方向键循环语义）：只响应可聚焦的顶层项 */
  private handleNavKeydown = (e: KeyboardEvent): void => {
    const key = e.key
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) return
    const nav = this.shadow.querySelector('nav')
    if (!nav) return
    const focusables = [
      ...nav.querySelectorAll<HTMLElement>(
        'a[part="link"], button.ellipsis-btn, button.dropdown-trigger',
      ),
    ].filter((el) => el.parentElement?.classList.contains('item'))
    if (focusables.length === 0) return
    const idx = focusables.indexOf(e.target as HTMLElement)
    if (idx === -1) return
    e.preventDefault()
    let next: number
    if (key === 'ArrowRight' || key === 'ArrowDown') next = (idx + 1) % focusables.length
    else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      next = (idx - 1 + focusables.length) % focusables.length
    } else if (key === 'Home') next = 0
    else next = focusables.length - 1
    focusables[next]!.focus()
  }

  // ===== 结构化数据（schema.org BreadcrumbList JSON-LD） =====

  /**
   * 向宿主 light DOM 注入 BreadcrumbList JSON-LD（SEO 结构化数据）。
   * 仅含带 href 的项（当前页不属于面包屑链接清单）；更新时先移除旧 script 再注入（去重）。
   * SSR 路径：renderToString 会把 light DOM（含 script）一并序列化到宿主内。
   */
  private syncStructuredData(items: BreadcrumbItem[]): void {
    this.querySelector('script[data-oas-breadcrumb-ld]')?.remove()
    const links = items.filter((i) => i.href)
    if (links.length === 0) return
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: links.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.label,
        item: item.href,
      })),
    }
    const s = document.createElement('script')
    s.type = 'application/ld+json'
    s.setAttribute('data-oas-breadcrumb-ld', '')
    s.textContent = JSON.stringify(ld)
    this.appendChild(s)
  }
}
