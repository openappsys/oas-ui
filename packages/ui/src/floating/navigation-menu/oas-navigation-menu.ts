import { OASElement } from '@oas-ui/core'
import type { MenuItem } from '../menu/index.js'

export interface NavItem extends MenuItem {
  /** 链接地址（可选）；带 href 的叶子项渲染为 <a> */
  href?: string
  /** 链接打开方式（可选） */
  target?: string
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
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding: var(--oas-space-1);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
}
.top-wrap {
  position: relative;
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
.submenu {
  display: none;
  list-style: none;
  margin: 0;
  padding: var(--oas-space-1);
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 160px;
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  z-index: var(--oas-z-dropdown, 1000);
}
.submenu.open {
  display: block;
}
/* 级联子菜单：向右浮出 */
.submenu .submenu {
  top: calc(-1 * var(--oas-space-1));
  left: 100%;
}
.subitem {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  font-size: var(--oas-font-size-md);
  white-space: nowrap;
}
.subitem .label {
  flex: 1;
  min-width: 0;
  text-align: left;
}
.subitem:hover,
.subitem.active {
  background: var(--oas-color-bg-hover);
}
.subitem[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
.subitem a.link {
  color: inherit;
  text-decoration: none;
  flex: 1;
  display: flex;
  align-items: center;
}
.arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: var(--oas-space-3);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  flex-shrink: 0;
}
.arrow svg {
  display: block;
  width: 1em;
  height: 1em;
}
.group {
  list-style: none;
  margin-top: var(--oas-space-2);
  padding: var(--oas-space-1) var(--oas-space-3);
  cursor: default;
}
.group:first-child {
  margin-top: 0;
}
.group-label {
  display: block;
  font-size: var(--oas-font-size-sm);
  font-weight: 500;
  color: var(--oas-color-text-secondary);
  white-space: nowrap;
}
.divider {
  list-style: none;
  height: 1px;
  margin: var(--oas-space-1) 0;
  background: var(--oas-color-border);
  cursor: default;
}
`

export class OASNavigationMenu extends OASElement {
  static override get observedAttributes(): string[] {
    return ['items']
  }

  private itemsList: NavItem[] = []
  private navEl: HTMLElement | null = null
  /** 键盘导航当前层级的祖先 value 链（空 = 顶级导航行） */
  private activeStack: string[] = []
  private activeIndex = 0
  private expanded = new Set<string>()
  private keyboardMode = false

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="nav" part="nav" role="navigation"></div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.navEl = this.shadow.querySelector('.nav')
    this.navEl?.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
    this.navEl?.addEventListener('mouseleave', () => {
      if (this.expanded.size === 0) return
      this.activeStack = []
      this.expanded.clear()
      this.syncOpen()
      this.syncActive()
    })
    document.addEventListener('keydown', this.handleDocumentKey)
    this.onCleanup(() => document.removeEventListener('keydown', this.handleDocumentKey))
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
    this.renderNav()
    this.syncOpen()
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
    for (const v of [...this.expanded]) {
      if (!valid.has(v)) this.expanded.delete(v)
    }
    this.activeStack = this.activeStack.filter((v) => valid.has(v))
    const n = this.itemsList.length
    if (n === 0) {
      this.activeIndex = 0
      return
    }
    if (this.activeIndex >= n) this.activeIndex = 0
  }

  private currentItems(): MenuItem[] {
    let items: MenuItem[] = this.itemsList
    for (const v of this.activeStack) {
      const parent = items.find((i) => i.value === v)
      if (!parent || !parent.children) return []
      items = parent.children
    }
    return this.flattenLevel(items)
  }

  private flattenLevel(items: MenuItem[]): MenuItem[] {
    const flat: MenuItem[] = []
    const walk = (list: MenuItem[]): void => {
      for (const i of list) {
        if (i.type === 'divider') continue
        if (i.type === 'group') {
          if (i.children) walk(i.children)
          continue
        }
        flat.push(i)
      }
    }
    walk(items)
    return flat
  }

  private chainOf(value: string): string[] {
    const chain: string[] = []
    const walk = (items: MenuItem[], trail: string[]): boolean => {
      for (const item of items) {
        if (item.value === value) {
          chain.push(...trail, value)
          return true
        }
        if (item.children) {
          const nextTrail = item.value != null ? [...trail, item.value] : trail
          if (walk(item.children, nextTrail)) return true
        }
      }
      return false
    }
    walk(this.itemsList, [])
    return chain
  }

  private findItem(value: string): MenuItem | undefined {
    let found: MenuItem | undefined
    const walk = (items: MenuItem[]): void => {
      for (const item of items) {
        if (item.value === value) found = item
        else if (item.children) walk(item.children)
      }
    }
    walk(this.itemsList)
    return found
  }

  private parentTopIndex(): number {
    const first = this.activeStack[0]
    if (first == null) return -1
    return this.itemsList.findIndex((i) => i.value === first)
  }

  private renderNav(): void {
    const navEl = this.navEl
    if (!navEl) return
    navEl.innerHTML = ''
    this.itemsList.forEach((item, idx) => {
      const wrap = document.createElement('div')
      wrap.className = 'top-wrap'
      const hasChildren = !!item.children && item.children.length > 0
      // 顶级叶子带 href 渲染为链接，否则按钮
      const el = hasChildren || !item.href ? document.createElement('button') : document.createElement('a')
      el.className = 'top-item'
      el.setAttribute('part', 'top-item')
      if (hasChildren || !item.href) {
        el.setAttribute('type', 'button')
      } else {
        el.setAttribute('href', item.href)
        if (item.target) el.setAttribute('target', item.target)
      }
      el.setAttribute('role', 'menuitem')
      el.setAttribute('aria-haspopup', 'menu')
      el.setAttribute('aria-expanded', 'false')
      el.setAttribute('tabindex', '-1')
      el.setAttribute('aria-disabled', String(item.disabled ?? false))
      if (item.value != null) el.dataset.value = item.value
      if (item.label) el.setAttribute('aria-label', item.label)
      el.textContent = item.label ?? ''
      el.addEventListener('focus', () => {
        this.activeIndex = idx
        this.syncActive()
      })
      el.addEventListener('click', (e: Event) => {
        this.keyboardMode = false
        if (item.disabled) {
          e.preventDefault()
          return
        }
        if (hasChildren) this.toggleExpand(item.value ?? '')
        else if (item.href) this.select(item) // 链接叶子：导航 + 事件
      })
      el.addEventListener('mouseenter', () => {
        this.keyboardMode = false
        if (item.disabled) return
        this.hoverExpand(item.value ?? '')
      })
      wrap.appendChild(el)
      if (hasChildren) {
        const ul = document.createElement('ul')
        ul.className = 'submenu'
        ul.setAttribute('part', 'submenu')
        ul.setAttribute('role', 'menu')
        ul.dataset.parent = item.value ?? ''
        this.renderSubLevel(ul, item.children!)
        wrap.appendChild(ul)
      }
      navEl.appendChild(wrap)
    })
  }

  private renderSubLevel(container: HTMLElement, items: MenuItem[]): void {
    for (const item of items) {
      if (item.type === 'divider') {
        const li = document.createElement('li')
        li.className = 'divider'
        li.setAttribute('part', 'divider')
        li.setAttribute('role', 'separator')
        li.setAttribute('aria-hidden', 'true')
        container.appendChild(li)
        continue
      }
      if (item.type === 'group') {
        const li = document.createElement('li')
        li.className = 'group'
        li.setAttribute('role', 'none')
        const label = document.createElement('span')
        label.className = 'group-label'
        label.textContent = item.label ?? ''
        li.appendChild(label)
        container.appendChild(li)
        if (item.children) this.renderSubLevel(container, item.children)
        continue
      }
      const hasChildren = !!item.children && item.children.length > 0
      const navItem = item as NavItem
      const li = document.createElement('li')
      li.className = 'subitem'
      li.setAttribute('part', 'item')
      li.setAttribute('role', 'menuitem')
      li.setAttribute('tabindex', '-1')
      if (item.value != null) li.dataset.value = item.value
      li.setAttribute('aria-disabled', String(item.disabled ?? false))
      if (item.label) li.setAttribute('aria-label', item.label)
      const label = document.createElement('span')
      label.className = 'label'
      label.textContent = item.label ?? ''
      if (!hasChildren && navItem.href) {
        // 链接叶子项：<a href> 包裹标签，点击触发选中
        const a = document.createElement('a')
        a.className = 'link'
        a.setAttribute('href', navItem.href)
        if (navItem.target) a.setAttribute('target', navItem.target)
        a.appendChild(label)
        a.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation()
          if (item.disabled) {
            e.preventDefault()
            return
          }
          this.select(item)
        })
        li.appendChild(a)
      } else {
        li.appendChild(label)
      }
      if (hasChildren) {
        li.setAttribute('aria-haspopup', 'menu')
        li.setAttribute('aria-expanded', 'false')
        li.append(this.createChevron())
      }
      li.addEventListener('click', () => {
        if (item.disabled) return
        if (hasChildren) this.toggleExpand(item.value ?? '')
        else this.select(item) // 链接项点击 <a> 时已 stopPropagation，此处覆盖 li 空白处点击
      })
      li.addEventListener('mouseenter', () => {
        this.keyboardMode = false
        if (item.disabled) return
        this.hoverExpand(item.value ?? '')
      })
      if (hasChildren) {
        const sub = document.createElement('ul')
        sub.className = 'submenu'
        sub.setAttribute('part', 'submenu')
        sub.setAttribute('role', 'menu')
        sub.dataset.parent = item.value ?? ''
        this.renderSubLevel(sub, item.children!)
        li.appendChild(sub)
      }
      container.appendChild(li)
    }
  }

  private createChevron(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'arrow'
    span.setAttribute('aria-hidden', 'true')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('width', '1em')
    svg.setAttribute('height', '1em')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    svg.innerHTML =
      '<path d="M6 4 L10 8 L6 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
    span.appendChild(svg)
    return span
  }

  private syncOpen(): void {
    if (!this.shadow) return
    for (const btn of this.shadow.querySelectorAll<HTMLElement>('[part="top-item"]')) {
      btn.setAttribute('aria-expanded', String(this.expanded.has(btn.dataset.value ?? '')))
    }
    for (const ul of this.shadow.querySelectorAll<HTMLElement>('[part="submenu"]')) {
      ul.classList.toggle('open', this.expanded.has(ul.dataset.parent ?? ''))
    }
  }

  private syncActive(): void {
    if (!this.shadow) return
    for (const el of this.shadow.querySelectorAll('.active')) el.classList.remove('active')
    const item = this.currentItems()[this.activeIndex]
    if (!item || item.value == null) return
    const selector =
      this.activeStack.length === 0 ? '[part="top-item"]' : '[part="item"]'
    this.shadow
      .querySelector<HTMLElement>(`${selector}[data-value="${item.value}"]`)
      ?.classList.add('active')
  }

  private syncRoving(): void {
    if (!this.shadow) return
    for (const el of this.shadow.querySelectorAll<HTMLElement>('[part="top-item"]')) {
      el.setAttribute('tabindex', '-1')
    }
    for (const li of this.shadow.querySelectorAll<HTMLElement>('[part="item"]')) {
      li.setAttribute('tabindex', '-1')
    }
    const topIdx = this.activeStack.length === 0 ? this.activeIndex : this.parentTopIndex()
    const top = this.itemsList[topIdx]
    if (top?.value != null) {
      this.shadow
        .querySelector<HTMLElement>(`[part="top-item"][data-value="${top.value}"]`)
        ?.setAttribute('tabindex', '0')
    }
  }

  private focusCurrent(): void {
    if (!this.keyboardMode) return
    if (this.activeStack.length === 0) {
      const top = this.itemsList[this.activeIndex]
      if (top?.value == null) return
      this.shadow
        .querySelector<HTMLElement>(`[part="top-item"][data-value="${top.value}"]`)
        ?.focus()
      return
    }
    const item = this.currentItems()[this.activeIndex]
    if (!item || item.value == null) return
    this.shadow
      .querySelector<HTMLElement>(`[part="item"][data-value="${item.value}"]`)
      ?.focus()
  }

  private hoverExpand(value: string): void {
    if (!value) return
    const chain = this.chainOf(value)
    if (chain.length === 0) return
    const item = this.findItem(value)
    const open = item?.children?.length ? chain : chain.slice(0, -1)
    const next = new Set(open)
    if (next.size === this.expanded.size && [...next].every((v) => this.expanded.has(v))) return
    this.expanded = next
    this.activeStack = chain.slice(0, -1)
    const levelItems = this.currentItems()
    const idx = levelItems.findIndex((i) => i.value === value)
    if (idx >= 0) this.activeIndex = idx
    this.syncOpen()
    this.syncActive()
  }

  private toggleExpand(value: string): void {
    if (this.expanded.has(value)) {
      this.expanded = new Set(this.chainOf(value).slice(0, -1))
      this.activeStack = [...this.expanded]
    } else {
      const chain = this.chainOf(value)
      this.expanded = new Set(chain)
      this.activeStack = chain.slice(0, -1)
      const levelItems = this.currentItems()
      const idx = levelItems.findIndex((i) => i.value === value)
      if (idx >= 0) this.activeIndex = idx
    }
    this.syncOpen()
    this.syncActive()
    this.syncRoving()
  }

  private select(item: MenuItem): void {
    this.emit('select', { value: item.value })
    this.collapseAndFocusTop()
  }

  private collapseAndFocusTop(): void {
    const parentIdx = this.parentTopIndex()
    this.activeStack = []
    this.expanded.clear()
    if (parentIdx >= 0) this.activeIndex = parentIdx
    this.syncOpen()
    this.syncActive()
    this.syncRoving()
    this.focusCurrent()
  }

  private enterSubmenu(item: MenuItem, focusLast = false): void {
    if (!item.children?.length) return
    this.activeStack.push(item.value ?? '')
    this.expanded = new Set(this.activeStack)
    const children = this.currentItems()
    const enabled = children.map((c, i) => (c.disabled ? -1 : i)).filter((i) => i >= 0)
    this.activeIndex = focusLast ? enabled[enabled.length - 1]! : enabled[0]!
  }

  private leaveSubmenu(): void {
    const value = this.activeStack.pop()
    this.expanded = new Set(this.activeStack)
    const parentLevel = this.currentItems()
    this.activeIndex = parentLevel.findIndex((i) => i.value === value)
    if (this.activeIndex < 0) this.activeIndex = 0
  }

  private collapseToTop(): void {
    this.activeStack = []
    this.expanded.clear()
  }

  private moveActive(enabled: number[], dir: 1 | -1): void {
    const len = enabled.length
    if (len === 0) return
    if (this.activeIndex < 0) {
      this.activeIndex = dir === 1 ? enabled[0]! : enabled[len - 1]!
      return
    }
    const cur = enabled.indexOf(this.activeIndex)
    this.activeIndex = enabled[(cur + dir + len) % len]!
  }

  private handleKey(e: KeyboardEvent): void {
    const items = this.currentItems()
    const enabled = items.map((i, idx) => (i.disabled ? -1 : idx)).filter((i) => i >= 0)
    if (enabled.length === 0) return
    this.keyboardMode = true
    const atTop = this.activeStack.length === 0
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      if (atTop) {
        this.collapseToTop()
        this.moveActive(enabled, -1)
      } else if (this.activeStack.length > 1) {
        this.leaveSubmenu()
      } else {
        this.collapseAndFocusTop()
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      const active = items[this.activeIndex]
      if (atTop) {
        this.collapseToTop()
        this.moveActive(enabled, 1)
      } else if (active && !active.disabled && active.children?.length) {
        this.enterSubmenu(active)
      }
      // 叶子项：保持焦点不动（多级导航留在当前层级）
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const active = items[this.activeIndex]
      if (atTop && active && !active.disabled && active.children?.length) {
        this.enterSubmenu(active)
      } else if (!atTop) {
        this.moveActive(enabled, 1)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const active = items[this.activeIndex]
      if (atTop && active && !active.disabled && active.children?.length) {
        this.enterSubmenu(active, true)
      } else if (!atTop) {
        this.moveActive(enabled, -1)
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const active = items[this.activeIndex]
      if (!active || active.disabled) return
      if (active.children?.length) this.enterSubmenu(active)
      else this.select(active)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      this.collapseAndFocusTop()
    } else if (e.key === 'Home') {
      e.preventDefault()
      this.activeIndex = enabled[0]!
    } else if (e.key === 'End') {
      e.preventDefault()
      this.activeIndex = enabled[enabled.length - 1]!
    } else {
      return
    }
    this.syncOpen()
    this.syncActive()
    this.syncRoving()
    this.focusCurrent()
  }

  /** 文档级键盘：子菜单打开时 Tab 焦点陷阱 */
  private handleDocumentKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab' || this.expanded.size === 0) return
    const focusable = this.openSubmenuItems()
    if (focusable.length === 0) return
    e.preventDefault()
    const current = focusable.indexOf(this.shadow.activeElement as HTMLElement)
    const next = e.shiftKey
      ? (current - 1 + focusable.length) % focusable.length
      : (current + 1) % focusable.length
    focusable[next]?.focus()
  }

  private openSubmenuItems(): HTMLElement[] {
    if (!this.shadow) return []
    const open = [...this.shadow.querySelectorAll<HTMLElement>('.submenu.open')]
    const deepest = open.filter((ul) => !ul.querySelector('.submenu.open'))
    const ul = deepest[deepest.length - 1] ?? open[open.length - 1]
    if (!ul) return []
    return [...ul.querySelectorAll<HTMLElement>('[part="item"]')].filter(
      (li) => li.getAttribute('aria-disabled') !== 'true',
    )
  }
}
