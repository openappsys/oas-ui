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
/* ellipsis 单行省略：容器不换行、整体超宽截断，链接文本各自省略 */
nav.ellipsis {
  flex-wrap: nowrap;
  overflow: hidden;
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
  z-index: var(--oas-z-dropdown);
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
    this.onCleanup(() => document.removeEventListener('click', this.handleOutsideClick))
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
    // 导航 aria-label locale 驱动（setLocale 切换自动重刷）
    nav.setAttribute('aria-label', this.t('breadcrumb.nav'))
    // ellipsis：单行省略模式（nav 容器不换行 + 链接文本各自省略）
    nav.classList.toggle('ellipsis', this.hasAttr('ellipsis'))
    this.syncSize(nav)
    this.syncColor(nav)
    this.syncVariant(nav)
    nav.innerHTML = ''
    const items = this.parseItems()
    const separator = this.getAttr('separator', '/')
    const maxItemWidth = this.widthValue(this.getAttr('max-item-width', ''))

    // 折叠：collapsed 且 items 数超过 max-items（默认 4）时，
    // 保留 items-before-collapse（默认 1）+ 末 items-after-collapse（默认 max-items-2）项，
    // 中间项收进 … 下拉
    const maxItems = this.maxItemsValue()
    const collapsed = this.hasAttr('collapsed') && items.length > maxItems
    const before = this.countValue(this.getAttr('items-before-collapse', ''), 1)
    const after = this.countValue(this.getAttr('items-after-collapse', ''), Math.max(0, maxItems - 2))
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
        nav.appendChild(this.buildSeparator(slot === 'ellipsis' ? separator : (slot.item.separator ?? separator)))
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
      const n = typeof item.maxWidth === 'number' ? item.maxWidth : Number.parseFloat(String(item.maxWidth))
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

  /** 分隔符：值匹配图标名 → 渲染 svg，否则文本 */
  private buildSeparator(value: string): HTMLElement {
    const sep = document.createElement('span')
    sep.className = 'sep'
    sep.setAttribute('part', 'separator')
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
      this.toggleDropdown('ellipsis')
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
    }
    if (this.openDropdowns.size > 0) {
      document.addEventListener('click', this.handleOutsideClick)
    } else {
      document.removeEventListener('click', this.handleOutsideClick)
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
    const focusables = [...nav.querySelectorAll<HTMLElement>(
      'a[part="link"], button.ellipsis-btn, button.dropdown-trigger',
    )].filter((el) => el.parentElement?.classList.contains('item'))
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

  // ===== C 档：结构化数据（schema.org BreadcrumbList JSON-LD） =====

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
