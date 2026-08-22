import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'
import type { MenuItem } from '../menu/index.js'

export interface NavItem extends MenuItem {
  /** 链接地址（可选）；带 href 的叶子项渲染为 <a> */
  href?: string
  /** 链接打开方式（可选） */
  target?: string
  /** 链接卡描述（大面板形态下渲染在标题下方） */
  description?: string
  /** 当前页标记：链接渲染 aria-current="page"（顶级与面板链接均生效） */
  active?: boolean
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.nav {
  position: relative;
}
.bar {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding: var(--oas-space-1);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  position: relative;
}
.bar.vertical {
  flex-direction: column;
  align-items: stretch;
}
.top-item {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--oas-color-text-primary);
  text-decoration: none;
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  white-space: nowrap;
  box-sizing: border-box;
}
.top-item:hover,
.top-item.active,
.top-item[aria-expanded='true'] {
  background: var(--oas-color-bg-hover);
}
.top-item:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.top-item[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
.chevron {
  display: inline-flex;
  align-items: center;
  color: var(--oas-color-text-secondary);
  transition: transform 0.2s ease;
}
.chevron svg {
  display: block;
  width: 1em;
  height: 1em;
}
.top-item[aria-expanded='true'] .chevron {
  transform: rotate(180deg);
}
.bar.vertical .chevron {
  transform: rotate(-90deg);
}
.bar.vertical .top-item[aria-expanded='true'] .chevron {
  transform: rotate(90deg);
}
/* 活动触发器指示条：位置/宽度由 --ind-x/--ind-w（或纵向 --ind-y/--ind-h）驱动 */
.indicator {
  position: absolute;
  bottom: -2px;
  left: 0;
  width: var(--ind-w, 0);
  height: 2px;
  background: var(--oas-color-primary);
  border-radius: var(--oas-radius-full, 999px);
  transform: translateX(var(--ind-x, 0));
  opacity: 0;
  pointer-events: none;
  transition: transform 0.2s ease, width 0.2s ease, opacity 0.15s ease;
}
.indicator[data-state='open'] {
  opacity: 1;
}
.bar.vertical .indicator {
  left: auto;
  right: -2px;
  width: 2px;
  height: var(--ind-h, 0);
  transform: translateY(var(--ind-y, 0));
}
/* 统一视口容器：所有顶级项的面板渲染进同一容器 */
.viewport {
  position: absolute;
  top: calc(100% + var(--oas-space-1));
  left: 0;
  min-width: 200px;
  width: var(--vp-w, auto);
  height: var(--vp-h, auto);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--oas-color-overlay) 24%, transparent);
  z-index: var(--oas-z-dropdown, 1000);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: width 0.2s ease, height 0.2s ease, opacity 0.15s ease;
}
.viewport.open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}
.viewport.vertical {
  top: 0;
  left: calc(100% + var(--oas-space-1));
}
/* 超大面板滚动：max-height 由 CSS 变量兜底，宿主可覆盖 --oas-nav-panel-max-height */
.panel {
  padding: var(--oas-space-2);
  max-height: var(--oas-nav-panel-max-height, 60vh);
  overflow: auto;
}
.grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(var(--nav-columns, 2), minmax(0, 1fr));
  gap: var(--oas-space-1);
}
.card {
  padding: 0;
}
.card-link {
  display: flex;
  gap: var(--oas-space-2);
  align-items: flex-start;
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  color: var(--oas-color-text-primary);
  text-decoration: none;
  cursor: pointer;
}
.card-link:hover {
  background: var(--oas-color-bg-hover);
}
.card-link:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.card-link[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
.icon {
  color: var(--oas-color-primary);
  display: inline-flex;
  flex-shrink: 0;
  margin-top: 2px;
}
.icon svg {
  display: block;
  width: 1em;
  height: 1em;
}
.card-title {
  display: block;
  font-weight: 500;
}
.card-desc {
  display: block;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.section {
  padding: var(--oas-space-1);
}
.section-title {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-md);
  font-weight: 500;
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  width: 100%;
  text-align: left;
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
}
.section-title:hover {
  background: var(--oas-color-bg-hover);
}
.section-title:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.section-links {
  list-style: none;
  margin: 0;
  padding: var(--oas-space-1) 0 0 var(--oas-space-2);
}
.section-links a {
  display: block;
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  color: var(--oas-color-text-primary);
  text-decoration: none;
  cursor: pointer;
}
.section-links a:hover {
  background: var(--oas-color-bg-hover);
}
.section-links a:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.section-links a[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
/* 弹出层箭头（指向触发器的视觉箭头） */
.arrow {
  position: absolute;
  top: -5px;
  left: var(--arrow-x, 24px);
  width: 8px;
  height: 8px;
  background: var(--oas-color-bg);
  border-left: 1px solid var(--oas-color-border);
  border-top: 1px solid var(--oas-color-border);
  transform: rotate(45deg);
}
.viewport.vertical .arrow {
  top: var(--arrow-y, 24px);
  left: -5px;
  transform: rotate(135deg);
}
/* 遮罩（可选 backdrop 属性时打开） */
.backdrop {
  position: fixed;
  inset: 0;
  background: var(--oas-color-overlay);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease;
  z-index: calc(var(--oas-z-dropdown, 1000) - 1);
}
.backdrop.open {
  opacity: 1;
  visibility: visible;
}
/* data-motion 方向位移动画 */
.panel[data-motion='from-start'] {
  animation: nav-motion-start 0.25s ease;
}
.panel[data-motion='from-end'] {
  animation: nav-motion-end 0.25s ease;
}
@keyframes nav-motion-start {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes nav-motion-end {
  from {
    opacity: 0;
    transform: translateX(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
`

let viewportSeq = 0

export class OASNavigationMenu extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'items',
      'value',
      'delay-duration',
      'skip-delay-duration',
      'orientation',
      'columns',
      'backdrop',
      'keep-mounted',
      'arrow',
    ]
  }

  private itemsList: NavItem[] = []
  private navEl: HTMLElement | null = null
  private barEl: HTMLElement | null = null
  private viewportEl: HTMLElement | null = null
  private panelEl: HTMLElement | null = null
  private indicatorEl: HTMLElement | null = null
  private arrowEl: HTMLElement | null = null
  private backdropEl: HTMLElement | null = null
  private viewportId = `oas-nav-panel-${viewportSeq++}`

  /** 内部打开项（非受控模式；受控模式以 value 属性为准） */
  private openValue: string | null = null
  /** 上一个打开项（计算 data-motion 方向） */
  private prevOpenValue: string | null = null
  /** 面板内 inline 二级子导航当前展开的 section（常开一项） */
  private openSection: string | null = null
  /** 键盘导航当前层级焦点索引（顶级 activeIndex / 面板 panelIndex） */
  private activeIndex = 0
  private panelIndex = 0
  private keyboardMode = false
  /** 延迟开合计时器 */
  private openTimer: ReturnType<typeof setTimeout> | null = null
  private closeTimer: ReturnType<typeof setTimeout> | null = null
  /** 上次关闭时刻（skip-delay-duration 跳过打开延迟） */
  private lastCloseAt = 0

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="nav" part="nav" role="navigation">
        <div class="bar" part="bar">
          <span class="indicator" part="indicator" data-state="closed" aria-hidden="true"></span>
        </div>
        <div class="viewport" part="viewport">
          <span class="arrow" part="arrow" aria-hidden="true"></span>
          <div class="panel" part="panel"></div>
        </div>
        <div class="backdrop" part="backdrop" aria-hidden="true"></div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.navEl = this.shadow.querySelector('.nav')
    this.barEl = this.shadow.querySelector('.bar')
    this.viewportEl = this.shadow.querySelector('.viewport')
    this.panelEl = this.shadow.querySelector('.panel')
    this.indicatorEl = this.shadow.querySelector('.indicator')
    this.arrowEl = this.shadow.querySelector('.arrow')
    this.backdropEl = this.shadow.querySelector('.backdrop')
    this.viewportEl?.setAttribute('id', this.viewportId)
    this.navEl?.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
    this.navEl?.addEventListener('mouseleave', () => this.scheduleClose())
    // 指针进入面板区域不关闭（悬停区域 = bar + 面板）
    this.viewportEl?.addEventListener('mouseenter', () => {
      if (this.closeTimer) {
        clearTimeout(this.closeTimer)
        this.closeTimer = null
      }
    })
    this.viewportEl?.addEventListener('mouseleave', () => this.scheduleClose())
    this.backdropEl?.addEventListener('click', () => this.close())
    document.addEventListener('pointerdown', this.handleDocPointer)
    document.addEventListener('keydown', this.handleDocumentKey)
    this.onCleanup(() => {
      document.removeEventListener('pointerdown', this.handleDocPointer)
      document.removeEventListener('keydown', this.handleDocumentKey)
      if (this.openTimer) clearTimeout(this.openTimer)
      if (this.closeTimer) clearTimeout(this.closeTimer)
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（nav 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.nav')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.parseItems()
    this.pruneState()
    this.navEl?.setAttribute('aria-label', this.t('navigationMenu.label'))
    this.renderBar()
    const open = this.effectiveOpen()
    if (open && this.findItem(open)?.children?.length) {
      if (this.prevOpenValue !== open) this.setMotion(open)
      this.renderPanel()
    } else if (!this.hasAttr('keep-mounted')) {
      if (this.panelEl) this.panelEl.innerHTML = ''
    }
    this.syncOpen()
    this.syncIndicator()
    this.syncActive()
    this.syncRoving()
  }

  private parseItems(): void {
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      this.itemsList = Array.isArray(parsed)
        ? parsed.filter((i): i is NavItem => {
            if (!i || typeof i !== 'object') return false
            if (i.type === 'divider') return true
            if (i.type === 'group') return Array.isArray(i.children)
            return typeof i.value === 'string'
          })
        : []
    } catch {
      this.itemsList = []
    }
  }

  private pruneState(): void {
    const valid = new Set<string>()
    const collect = (items: MenuItem[]): void => {
      for (const i of items) {
        if (i.value != null) valid.add(i.value)
        if (i.children) collect(i.children)
      }
    }
    collect(this.itemsList)
    if (this.openValue && !valid.has(this.openValue)) this.openValue = null
    if (this.openSection && !valid.has(this.openSection)) this.openSection = null
    if (this.prevOpenValue && !valid.has(this.prevOpenValue)) this.prevOpenValue = null
    const n = this.itemsList.length
    if (this.activeIndex >= n) this.activeIndex = Math.max(0, n - 1)
  }

  /** 有效打开项：受控（value 属性存在）以属性为准，否则内部状态 */
  private effectiveOpen(): string {
    return this.hasAttr('value') ? this.getAttr('value', '') : (this.openValue ?? '')
  }

  private isVertical(): boolean {
    return this.getAttr('orientation', 'horizontal') === 'vertical'
  }

  private delayDuration(): number {
    const n = Number.parseInt(this.getAttr('delay-duration', '200'), 10)
    return Number.isFinite(n) && n >= 0 ? n : 200
  }

  private skipDelay(): number {
    const n = Number.parseInt(this.getAttr('skip-delay-duration', '300'), 10)
    return Number.isFinite(n) && n >= 0 ? n : 300
  }

  private columns(): number {
    const n = Number.parseInt(this.getAttr('columns', '2'), 10)
    return Number.isFinite(n) && n >= 1 ? n : 2
  }

  private findItem(value: string): NavItem | undefined {
    let found: NavItem | undefined
    const walk = (items: MenuItem[]): void => {
      for (const item of items) {
        if (item.value === value) found = item as NavItem
        else if (item.children) walk(item.children)
      }
    }
    walk(this.itemsList)
    return found
  }

  private indexOfTop(value: string): number {
    return this.itemsList.findIndex((i) => i.value === value)
  }

  // ================= 顶级触发器行 =================

  private renderBar(): void {
    const barEl = this.barEl
    if (!barEl) return
    for (const t of [...barEl.querySelectorAll<HTMLElement>('[part="top-item"]')]) t.remove()
    this.itemsList.forEach((item, idx) => {
      const hasChildren = !!item.children?.length
      const el = hasChildren || !item.href ? document.createElement('button') : document.createElement('a')
      el.className = 'top-item'
      el.setAttribute('part', 'top-item')
      if (item.value != null) el.dataset.value = item.value
      el.textContent = item.label ?? ''
      if (item.label) el.setAttribute('aria-label', item.label)
      if (hasChildren || !item.href) {
        el.setAttribute('type', 'button')
        el.setAttribute('aria-expanded', 'false')
        el.setAttribute('aria-controls', this.viewportId)
      } else {
        el.setAttribute('href', item.href)
        if (item.target) el.setAttribute('target', item.target)
        if (item.active) el.setAttribute('aria-current', 'page')
      }
      el.setAttribute('tabindex', idx === this.activeIndex ? '0' : '-1')
      if (item.disabled) el.setAttribute('aria-disabled', 'true')
      el.addEventListener('focus', () => {
        this.activeIndex = idx
        this.syncActive()
      })
      el.addEventListener('click', () => {
        this.keyboardMode = false
        if (item.disabled) return
        if (hasChildren) {
          if (this.effectiveOpen() === item.value) this.close()
          else this.open(item.value ?? '')
        } else {
          this.select(item)
        }
      })
      el.addEventListener('mouseenter', () => {
        this.keyboardMode = false
        if (item.disabled) return
        if (hasChildren) this.scheduleOpen(item.value ?? '')
      })
      el.addEventListener('mouseleave', () => {
        if (hasChildren) this.scheduleClose()
      })
      barEl.appendChild(el)
      if (hasChildren) {
        el.appendChild(this.createChevron())
      }
    })
  }

  private createChevron(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'chevron'
    span.setAttribute('part', 'chevron')
    span.setAttribute('aria-hidden', 'true')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('width', '1em')
    svg.setAttribute('height', '1em')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    svg.innerHTML =
      '<path d="M4 6 L8 10 L12 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
    span.appendChild(svg)
    return span
  }

  // ================= 面板渲染（大面板 + inline 二级子导航） =================

  private renderPanel(): void {
    const p = this.panelEl
    if (!p) return
    const value = this.effectiveOpen()
    const item = this.findItem(value)
    if (!item?.children?.length) {
      p.innerHTML = ''
      return
    }
    // 常开一项：默认展开第一个 inline 二级子导航 section
    const firstSection = item.children.find((c) => c.children?.length)
    if (!this.openSection && firstSection?.value) this.openSection = firstSection.value
    const grid = document.createElement('ul')
    grid.className = 'grid'
    grid.setAttribute('part', 'grid')
    grid.style.setProperty('--nav-columns', String(this.columns()))
    for (const child of item.children) {
      if (child.type === 'divider') continue
      if (child.type === 'group') {
        if (child.children) {
          for (const g of child.children) this.appendPanelCell(grid, g)
        }
        continue
      }
      this.appendPanelCell(grid, child)
    }
    p.innerHTML = ''
    p.appendChild(grid)
  }

  private appendPanelCell(grid: HTMLElement, item: MenuItem): void {
    if (item.children?.length) {
      grid.appendChild(this.buildSection(item as NavItem))
    } else {
      grid.appendChild(this.buildCard(item as NavItem))
    }
  }

  private buildCard(item: NavItem): HTMLElement {
    const li = document.createElement('li')
    li.className = 'card'
    li.setAttribute('part', 'item')
    if (item.value != null) li.dataset.value = item.value
    const a = document.createElement('a')
    a.className = 'card-link'
    a.setAttribute('part', 'card-link')
    a.setAttribute('href', item.href ?? '#')
    if (item.target) a.setAttribute('target', item.target)
    if (item.active) a.setAttribute('aria-current', 'page')
    if (item.disabled) a.setAttribute('aria-disabled', 'true')
    if (item.icon) {
      const ic = this.createIcon(item.icon)
      if (ic) a.appendChild(ic)
    }
    const text = document.createElement('span')
    text.className = 'card-text'
    const title = document.createElement('span')
    title.className = 'card-title'
    title.textContent = item.label ?? ''
    text.appendChild(title)
    if (item.description) {
      const desc = document.createElement('span')
      desc.className = 'card-desc'
      desc.textContent = item.description
      text.appendChild(desc)
    }
    a.appendChild(text)
    a.addEventListener('click', (e: Event) => {
      e.stopPropagation()
      if (item.disabled) {
        e.preventDefault()
        return
      }
      this.select(item)
    })
    li.appendChild(a)
    // li 空白处点击同样选中（demo-coverage 用 li DOM click 避免 <a> 跳转）
    li.addEventListener('click', () => {
      if (item.disabled) return
      this.select(item)
    })
    return li
  }

  private buildSection(item: NavItem): HTMLElement {
    const li = document.createElement('li')
    li.className = 'section'
    li.setAttribute('part', 'section')
    if (item.value != null) li.dataset.value = item.value
    const open = this.openSection === item.value
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'section-title'
    btn.setAttribute('part', 'section-title')
    if (item.value != null) btn.dataset.value = item.value
    btn.setAttribute('aria-expanded', String(open))
    btn.textContent = item.label ?? ''
    const ul = document.createElement('ul')
    ul.className = 'section-links'
    ul.setAttribute('part', 'section-links')
    if (!open) ul.hidden = true
    for (const child of item.children ?? []) {
      const li2 = document.createElement('li')
      const a2 = document.createElement('a')
      a2.setAttribute('href', (child as NavItem).href ?? '#')
      if ((child as NavItem).target) a2.setAttribute('target', (child as NavItem).target!)
      if ((child as NavItem).active) a2.setAttribute('aria-current', 'page')
      if (child.disabled) a2.setAttribute('aria-disabled', 'true')
      a2.textContent = child.label ?? ''
      if (child.value != null) a2.dataset.value = child.value
      a2.addEventListener('click', (e: Event) => {
        e.stopPropagation()
        if (child.disabled) {
          e.preventDefault()
          return
        }
        this.select(child)
      })
      li2.appendChild(a2)
      ul.appendChild(li2)
    }
    btn.addEventListener('click', () => {
      this.keyboardMode = false
      if (item.value != null) this.toggleSection(item.value)
    })
    li.appendChild(btn)
    li.appendChild(ul)
    return li
  }

  /** inline 二级子导航：常开一项（点击已展开项保持展开，点击其他项切换） */
  private toggleSection(value: string): void {
    if (this.openSection === value) return
    this.openSection = value
    const p = this.panelEl
    if (!p) return
    for (const sec of p.querySelectorAll<HTMLElement>('[part="section"]')) {
      const isOpen = sec.dataset.value === value
      const title = sec.querySelector<HTMLElement>('[part="section-title"]')
      title?.setAttribute('aria-expanded', String(isOpen))
      const links = sec.querySelector<HTMLElement>('[part="section-links"]')
      if (links) links.hidden = !isOpen
    }
  }

  /** 用 iconRegistry 渲染图标（内联 SVG，跟随 currentColor） */
  private createIcon(icon: string, className = 'icon'): HTMLElement | null {
    const content = iconRegistry[icon as IconName]
    if (!content) return null
    const span = document.createElement('span')
    span.className = className
    span.setAttribute('aria-hidden', 'true')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('width', '1em')
    svg.setAttribute('height', '1em')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    svg.innerHTML = content
    span.appendChild(svg)
    return span
  }

  // ================= 打开/关闭（受控 + 延迟 + 事件） =================

  /** 立即打开（点击/键盘路径，不走延迟） */
  private open(value: string): void {
    if (this.openTimer) {
      clearTimeout(this.openTimer)
      this.openTimer = null
    }
    if (this.closeTimer) {
      clearTimeout(this.closeTimer)
      this.closeTimer = null
    }
    this.setOpenValue(value)
  }

  /** 立即关闭（点击/外部点击/Esc 路径） */
  private close(): void {
    if (this.openTimer) {
      clearTimeout(this.openTimer)
      this.openTimer = null
    }
    if (this.closeTimer) {
      clearTimeout(this.closeTimer)
      this.closeTimer = null
    }
    this.setOpenValue('')
  }

  private setOpenValue(value: string): void {
    const prev = this.effectiveOpen()
    if (prev === value) return
    if (prev && !value) this.lastCloseAt = Date.now()
    if (!this.hasAttr('value')) this.openValue = value || null
    this.emit('change', { value })
    const open = this.effectiveOpen()
    if (open && this.findItem(open)?.children?.length) {
      if (this.prevOpenValue !== open) this.setMotion(open)
      this.renderPanel()
    } else if (!this.hasAttr('keep-mounted')) {
      if (this.panelEl) this.panelEl.innerHTML = ''
    }
    this.syncOpen()
    this.syncIndicator()
    this.syncActive()
    this.syncRoving()
  }

  private setMotion(value: string): void {
    const prevIdx = this.prevOpenValue ? this.indexOfTop(this.prevOpenValue) : -1
    const idx = this.indexOfTop(value)
    // 首次打开（无上一项）或向左 → from-start；向右 → from-end
    const motion = prevIdx < 0 ? 'from-start' : idx < prevIdx ? 'from-start' : 'from-end'
    this.panelEl?.setAttribute('data-motion', motion)
    this.prevOpenValue = value
  }

  /** hover 打开：延迟 delay-duration；命中 skip-delay 时立即打开 */
  private scheduleOpen(value: string): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer)
      this.closeTimer = null
    }
    if (this.effectiveOpen() === value) return
    if (this.openTimer) {
      clearTimeout(this.openTimer)
      this.openTimer = null
    }
    const skip = this.skipDelay() > 0 && this.lastCloseAt > 0 && Date.now() - this.lastCloseAt < this.skipDelay()
    const delay = skip ? 0 : this.delayDuration()
    if (delay <= 0) {
      this.open(value)
      return
    }
    this.openTimer = setTimeout(() => {
      this.openTimer = null
      this.open(value)
    }, delay)
  }

  /** hover 关闭：延迟 delay-duration */
  private scheduleClose(): void {
    if (!this.effectiveOpen()) return
    if (this.openTimer) {
      clearTimeout(this.openTimer)
      this.openTimer = null
    }
    if (this.closeTimer) {
      clearTimeout(this.closeTimer)
      this.closeTimer = null
    }
    this.closeTimer = setTimeout(() => {
      this.closeTimer = null
      this.close()
    }, this.delayDuration())
  }

  private select(item: MenuItem): void {
    this.emit('select', { value: item.value })
    this.close()
    if (this.keyboardMode) {
      const parentIdx = item.value != null ? this.indexOfTop(item.value) : -1
      if (parentIdx >= 0) this.activeIndex = parentIdx
      this.syncActive()
      this.syncRoving()
      this.focusCurrent()
    }
  }

  // ================= 外部点击关闭 =================

  private handleDocPointer = (e: PointerEvent): void => {
    if (!this.effectiveOpen()) return
    const t = e.target as Node | null
    if (t && (t === this || this.contains(t))) return
    this.keyboardMode = false
    this.close()
  }

  // ================= 状态同步 =================

  private syncOpen(): void {
    if (!this.shadow) return
    const open = this.effectiveOpen()
    this.viewportEl?.classList.toggle('open', !!open)
    this.viewportEl?.setAttribute('data-value', open)
    this.viewportEl?.classList.toggle('vertical', this.isVertical())
    this.barEl?.setAttribute('data-orientation', this.isVertical() ? 'vertical' : 'horizontal')
    this.barEl?.classList.toggle('vertical', this.isVertical())
    for (const btn of this.shadow.querySelectorAll<HTMLElement>('[part="top-item"]')) {
      const v = btn.dataset.value ?? ''
      if (btn.hasAttribute('aria-expanded')) {
        btn.setAttribute('aria-expanded', String(!!open && open === v))
      }
    }
    if (this.indicatorEl) {
      this.indicatorEl.setAttribute('data-state', open ? 'open' : 'closed')
    }
    if (this.arrowEl) {
      this.arrowEl.hidden = this.getAttr('arrow', 'true') === 'false'
    }
    if (this.backdropEl) {
      this.backdropEl.classList.toggle('open', !!open && this.hasAttr('backdrop'))
    }
  }

  private syncIndicator(): void {
    const ind = this.indicatorEl
    const barEl = this.barEl
    if (!ind || !barEl) return
    const open = this.effectiveOpen()
    if (!open) return
    const trigger = this.shadow.querySelector<HTMLElement>(`[part="top-item"][data-value="${open}"]`)
    if (!trigger) return
    if (this.isVertical()) {
      const y = trigger.offsetTop
      const h = trigger.offsetHeight
      if (h > 0) {
        ind.style.setProperty('--ind-y', `${y}px`)
        ind.style.setProperty('--ind-h', `${h}px`)
      }
    } else {
      const x = trigger.offsetLeft
      const w = trigger.offsetWidth
      if (w > 0) {
        ind.style.setProperty('--ind-x', `${x}px`)
        ind.style.setProperty('--ind-w', `${w}px`)
      }
    }
    // viewport 尺寸过渡：测量面板内容
    const vp = this.viewportEl
    const p = this.panelEl
    if (vp && p) {
      const w = p.scrollWidth
      const h = p.scrollHeight
      if (w > 0) vp.style.setProperty('--vp-w', `${w}px`)
      if (h > 0) vp.style.setProperty('--vp-h', `${h}px`)
    }
  }

  private syncActive(): void {
    if (!this.shadow) return
    for (const el of this.shadow.querySelectorAll('.active')) el.classList.remove('active')
    const item = this.itemsList[this.activeIndex]
    if (!item || item.value == null) return
    this.shadow
      .querySelector<HTMLElement>(`[part="top-item"][data-value="${item.value}"]`)
      ?.classList.add('active')
  }

  private syncRoving(): void {
    if (!this.shadow) return
    const open = this.effectiveOpen()
    const target = open || this.itemsList[this.activeIndex]?.value || ''
    for (const el of this.shadow.querySelectorAll<HTMLElement>('[part="top-item"]')) {
      const v = el.dataset.value ?? ''
      el.setAttribute('tabindex', v === target ? '0' : '-1')
    }
  }

  private focusCurrent(): void {
    if (!this.keyboardMode) return
    const open = this.effectiveOpen()
    if (open && this.shadow.activeElement && this.panelEl?.contains(this.shadow.activeElement as Node)) {
      return
    }
    if (!open) {
      const item = this.itemsList[this.activeIndex]
      if (item?.value == null) return
      this.shadow.querySelector<HTMLElement>(`[part="top-item"][data-value="${item.value}"]`)?.focus()
    }
  }

  // ================= 键盘导航 =================

  private handleKey(e: KeyboardEvent): void {
    const open = this.effectiveOpen()
    const inPanel = !!open && !!this.panelEl?.contains(this.shadow.activeElement as Node)
    if (inPanel) {
      this.handlePanelKey(e)
      return
    }
    this.handleTopKey(e)
  }

  private handleTopKey(e: KeyboardEvent): void {
    const items = this.itemsList
    const enabled = items.map((i, idx) => (i.disabled ? -1 : idx)).filter((i) => i >= 0)
    if (enabled.length === 0) return
    this.keyboardMode = true
    const vertical = this.isVertical()
    const prevKey = vertical ? 'ArrowUp' : 'ArrowLeft'
    const nextKey = vertical ? 'ArrowDown' : 'ArrowRight'
    const openKey = vertical ? 'ArrowRight' : 'ArrowDown'
    const active = items[this.activeIndex]
    if (e.key === prevKey) {
      e.preventDefault()
      this.moveActive(enabled, -1)
    } else if (e.key === nextKey) {
      e.preventDefault()
      this.moveActive(enabled, 1)
    } else if (e.key === openKey) {
      e.preventDefault()
      if (active && !active.disabled && active.children?.length) {
        this.open(active.value ?? '')
        this.panelIndex = this.firstEnabledPanelIndex()
        this.syncRoving()
        this.focusPanel()
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!active || active.disabled) return
      if (active.children?.length) {
        if (this.effectiveOpen() === active.value) {
          this.close()
          this.syncRoving()
          this.focusCurrent()
        } else {
          this.open(active.value ?? '')
          this.panelIndex = this.firstEnabledPanelIndex()
          this.syncRoving()
          this.focusPanel()
        }
      } else {
        this.select(active)
      }
    } else if (e.key === 'Escape') {
      if (this.effectiveOpen()) {
        e.preventDefault()
        this.close()
        this.syncRoving()
        this.focusCurrent()
      }
    } else if (e.key === 'Home') {
      e.preventDefault()
      this.activeIndex = enabled[0]!
      this.syncActive()
      this.syncRoving()
      this.focusCurrent()
    } else if (e.key === 'End') {
      e.preventDefault()
      this.activeIndex = enabled[enabled.length - 1]!
      this.syncActive()
      this.syncRoving()
      this.focusCurrent()
    } else {
      return
    }
    this.syncActive()
    this.syncRoving()
    if (!(e.key === 'Enter' && active?.children?.length && this.effectiveOpen() === active.value)) {
      this.focusCurrent()
    }
  }

  private handlePanelKey(e: KeyboardEvent): void {
    const focusables = this.panelFocusables()
    const enabled = focusables.map((el, i) => (el.getAttribute('aria-disabled') === 'true' ? -1 : i)).filter((i) => i >= 0)
    if (enabled.length === 0) return
    this.keyboardMode = true
    const cur = this.shadow.activeElement as HTMLElement | null
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      this.movePanel(enabled, e.key === 'ArrowDown' ? 1 : -1)
    } else if (e.key === 'ArrowRight') {
      if (cur?.getAttribute('part') === 'section-title') {
        e.preventDefault()
        const val = cur.dataset.value ?? ''
        if (this.openSection !== val) this.toggleSection(val)
        const sec = cur.closest('[part="section"]')
        const first = sec?.querySelector<HTMLElement>('[part="section-links"] a')
        ;(first as HTMLElement | null)?.focus()
      }
    } else if (e.key === 'ArrowLeft') {
      const inSection = cur?.closest('[part="section-links"]')
      if (inSection) {
        e.preventDefault()
        const title = inSection.closest('[part="section"]')?.querySelector<HTMLElement>('[part="section-title"]')
        ;(title as HTMLElement | null)?.focus()
      } else {
        // 面板第一项 ← 收起并回顶级
        e.preventDefault()
        this.close()
        this.syncRoving()
        this.focusCurrent()
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!cur) return
      if (cur.getAttribute('part') === 'section-title') {
        const val = cur.dataset.value ?? ''
        this.toggleSection(val)
      } else {
        cur.click()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      this.close()
      this.syncRoving()
      this.focusCurrent()
    } else if (e.key === 'Home') {
      e.preventDefault()
      this.panelIndex = enabled[0]!
      this.focusPanel()
    } else if (e.key === 'End') {
      e.preventDefault()
      this.panelIndex = enabled[enabled.length - 1]!
      this.focusPanel()
    } else {
      return
    }
    this.syncActive()
  }

  private panelFocusables(): HTMLElement[] {
    const p = this.panelEl
    if (!p) return []
    return [
      ...p.querySelectorAll<HTMLElement>(
        '[part="card-link"], [part="section-title"], [part="section-links"] a',
      ),
    ]
  }

  private firstEnabledPanelIndex(): number {
    const list = this.panelFocusables()
    return list.findIndex((el) => el.getAttribute('aria-disabled') !== 'true')
  }

  private moveActive(enabled: number[], dir: 1 | -1): void {
    const len = enabled.length
    if (len === 0) return
    const cur = enabled.indexOf(this.activeIndex)
    this.activeIndex = enabled[(cur + dir + len) % len]!
  }

  private movePanel(enabled: number[], dir: 1 | -1): void {
    const len = enabled.length
    if (len === 0) return
    let cur = enabled.indexOf(this.panelIndex)
    if (cur < 0) cur = dir === 1 ? -1 : len
    this.panelIndex = enabled[(cur + dir + len) % len]!
    this.focusPanel()
  }

  private focusPanel(): void {
    const list = this.panelFocusables()
    const el = list[this.panelIndex]
    if (el) el.focus()
  }

  /** 文档级键盘：面板打开时 Tab 焦点陷阱 */
  private handleDocumentKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab' || !this.effectiveOpen()) return
    const focusables = this.panelFocusables()
    if (focusables.length === 0) return
    if (!this.panelEl?.contains(this.shadow.activeElement as Node)) return
    e.preventDefault()
    const current = focusables.indexOf(this.shadow.activeElement as HTMLElement)
    const next = e.shiftKey
      ? (current - 1 + focusables.length) % focusables.length
      : (current + 1) % focusables.length
    focusables[next]?.focus()
  }
}
