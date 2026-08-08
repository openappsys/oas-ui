import { OASElement } from '@oas-ui/core'
import { iconRegistry, type IconName } from '@oas-ui/icons'

export type MenuItemType = 'item' | 'group' | 'divider'

export interface MenuItem {
  label?: string
  value?: string
  disabled?: boolean
  icon?: string
  /** 菜单项类型：普通项（默认）/ 分组 / 分隔线 */
  type?: MenuItemType
  /** 子菜单项，支持多级嵌套（任意层级）；group 的 children 平铺展示在同一层 */
  children?: MenuItem[]
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  padding: var(--oas-space-1);
  min-width: 160px;
  color: var(--oas-color-text-primary);
}
.menu {
  margin: 0;
  padding: 0;
  list-style: none;
}
.item {
  position: relative;
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  font-size: var(--oas-font-size-md);
  display: flex;
  align-items: center;
  white-space: nowrap; /* 禁止中文菜单项逐字换行竖排 */
}
/* 标签占据中间剩余空间并左对齐，贴住左侧图标；右侧 arrow/check 靠右 */
.item .label {
  flex: 1;
  min-width: 0;
  text-align: left;
}
.item:hover,
.item.active {
  background: var(--oas-color-bg-hover);
}
.item[aria-checked='true'] {
  color: var(--oas-color-primary);
  font-weight: 500;
}
.item[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
  margin-right: var(--oas-space-2);
  flex-shrink: 0;
  color: inherit;
}
.icon svg {
  display: block;
  width: 1em;
  height: 1em;
}
.check {
  opacity: 0;
}
.item[aria-checked='true'] .check {
  opacity: 1;
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
/* 分组标题：小字次要色，不可点 */
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
/* 分隔线：细分隔线，不可点 */
.divider {
  list-style: none;
  height: 1px;
  margin: var(--oas-space-1) 0;
  background: var(--oas-color-border);
  cursor: default;
}
/* 级联浮出子菜单：默认隐藏，父项 .open 时显示；独立浮层定位在父项右侧 */
.submenu {
  display: none;
  list-style: none;
  margin: 0;
  padding: var(--oas-space-1);
  position: absolute;
  left: 100%;
  top: calc(-1 * var(--oas-space-1));
  min-width: 140px;
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  z-index: 10;
}
.item.open > .submenu {
  display: block;
}
/* 水平模式：顶部导航条样式，菜单项横排 */
:host([mode='horizontal']) {
  display: inline-block;
  min-width: 0;
  padding: 0;
  border-radius: var(--oas-radius-lg);
}
:host([mode='horizontal']) .menu {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: var(--oas-space-1);
}
/* 水平模式一级子菜单向下浮出；二级及以上仍向右 */
:host([mode='horizontal']) .submenu-1 {
  top: 100%;
  left: 0;
  margin-top: var(--oas-space-1);
}
/* 收起态（仅 vertical）：菜单收窄只显示图标 */
:host(:not([mode='horizontal'])[collapsed]) {
  min-width: 0;
}
:host(:not([mode='horizontal'])[collapsed]) .item {
  justify-content: center;
  padding: var(--oas-space-2);
}
:host(:not([mode='horizontal'])[collapsed]) > .menu > .item > .label,
:host(:not([mode='horizontal'])[collapsed]) > .menu > .item > .arrow,
:host(:not([mode='horizontal'])[collapsed]) > .menu > .item > .check,
:host(:not([mode='horizontal'])[collapsed]) .group-label {
  display: none;
}
:host(:not([mode='horizontal'])[collapsed]) .item > .icon {
  margin-right: 0;
}
`

export class OASMenu extends OASElement {
  static override get observedAttributes(): string[] {
    return ['items', 'value', 'mode', 'collapsed', 'theme']
  }

  private itemsList: MenuItem[] = []
  /** 当前键盘导航所在层级的祖先 value 链（空数组 = 顶层） */
  private activeStack: string[] = []
  private activeIndex = -1
  /** 已展开的子菜单 value 集合（单条展开路径） */
  private expanded = new Set<string>()
  private menuEl: HTMLElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <ul class="menu" part="menu" role="menu" tabindex="0"></ul>
    `
    const menuEl = this.shadow.querySelector<HTMLElement>('.menu')!
    this.menuEl = menuEl
    menuEl.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
    // 鼠标移出整个菜单时收起所有浮层
    menuEl.addEventListener('mouseleave', () => {
      if (this.expanded.size > 0) {
        this.expanded.clear()
        this.syncOpen()
      }
    })
    this.update()
  }

  protected override update(): void {
    this.parseItems()
    this.syncTheme()
    this.renderItems()
  }

  private parseItems(): void {
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      this.itemsList = Array.isArray(parsed)
        ? parsed.filter((i: MenuItem): i is MenuItem => {
            if (!i || typeof i !== 'object') return false
            if (i.type === 'divider') return true
            if (i.type === 'group') return Array.isArray(i.children)
            return typeof i.value === 'string'
          })
        : []
    } catch {
      this.itemsList = []
    }
    this.pruneState()
  }

  /** theme="dark" 时局部注入暗色 token（data-theme 到自身，子树继承），独立于全局主题 */
  private syncTheme(): void {
    if (this.getAttr('theme') === 'dark') {
      this.dataset.theme = 'dark'
    } else {
      delete this.dataset.theme
    }
  }

  /** 数据变化后清理失效的展开/导航状态 */
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
    const items = this.currentItems()
    if (this.activeIndex >= items.length) this.activeIndex = items.length > 0 ? 0 : -1
  }

  /** 当前键盘导航层级的可导航项：group 内联展开、divider/组标题跳过 */
  private currentItems(): MenuItem[] {
    let items = this.itemsList
    for (const v of this.activeStack) {
      const parent = items.find((i) => i.value === v)
      if (!parent || !parent.children) return []
      items = parent.children
    }
    return this.flattenLevel(items)
  }

  /** 把一层菜单拍平成可导航项序列（group 子项就地展开，divider/组标题剔除） */
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

  /** 从根到 value 的祖先链（含 value 自身）；无 value 的 group/divider 不进入链 */
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

  /** 全量渲染一次（含所有子菜单），显隐/激活由 class 控制，不随 hover 重建 */
  private renderItems(): void {
    const menuEl = this.menuEl
    if (!menuEl) return
    menuEl.innerHTML = ''
    const selected = this.getAttr('value', '')
    this.renderLevel(menuEl, this.itemsList, selected, 0)
    this.syncOpen()
    this.syncActive()
  }

  private renderLevel(
    container: HTMLElement,
    items: MenuItem[],
    selected: string,
    depth: number,
  ): void {
    const horizontal = this.getAttr('mode') === 'horizontal'
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
        li.setAttribute('part', 'group')
        li.setAttribute('role', 'none')
        const label = document.createElement('span')
        label.className = 'group-label'
        label.textContent = item.label ?? ''
        li.appendChild(label)
        container.appendChild(li)
        // 组内子项平铺在同一个列表层级
        if (item.children) this.renderLevel(container, item.children, selected, depth)
        continue
      }
      const li = document.createElement('li')
      li.className = 'item'
      li.setAttribute('part', 'item')
      if (item.value != null) li.dataset.value = item.value
      li.setAttribute('aria-disabled', String(item.disabled ?? false))
      // 收起态（collapsed）下 label 隐藏，需以 aria-label 兜底可访问名称
      if (item.label) li.setAttribute('aria-label', item.label)
      const hasChildren = !!item.children && item.children.length > 0
      if (item.icon) {
        const ic = this.createIcon(item.icon)
        if (ic) li.appendChild(ic)
      }
      const label = document.createElement('span')
      label.className = 'label'
      label.textContent = item.label ?? ''
      if (hasChildren) {
        li.setAttribute('role', 'menuitem')
        li.setAttribute('aria-haspopup', 'menu')
        li.setAttribute('aria-expanded', 'false')
        // 箭头用 SVG chevron（光学居中，避免文本字形偏下）
        const arrowName = horizontal && depth === 0 ? 'chevron-down' : 'chevron-right'
        const arrow = this.createIcon(arrowName, 'arrow')
        li.appendChild(label)
        if (arrow) li.appendChild(arrow)
        li.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation()
          if (item.disabled) return
          this.toggleExpand(item.value ?? '')
        })
        li.addEventListener('mouseenter', () => {
          if (item.disabled) return
          this.hoverExpand(item.value ?? '')
        })
        // 子菜单始终渲染，显隐由 .open class 控制（hover 不重建 DOM）
        const sub = document.createElement('ul')
        sub.className = depth === 0 ? 'submenu submenu-1' : 'submenu'
        sub.setAttribute('part', 'submenu')
        sub.setAttribute('role', 'menu')
        this.renderLevel(sub, item.children!, selected, depth + 1)
        li.appendChild(sub)
      } else {
        li.setAttribute('role', 'menuitemradio')
        li.setAttribute('aria-checked', String(item.value === selected))
        const check = document.createElement('span')
        check.className = 'check'
        check.textContent = '✓'
        li.append(label, check)
        li.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation()
          if (item.disabled) return
          this.select(item)
        })
        li.addEventListener('mouseenter', () => {
          if (item.disabled) return
          this.hoverExpand(item.value ?? '')
        })
      }
      container.appendChild(li)
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

  /** 展开状态 → .open class（不重建 DOM） */
  private syncOpen(): void {
    if (!this.menuEl) return
    for (const li of this.menuEl.querySelectorAll<HTMLElement>('[part="item"][data-value]')) {
      const open = this.expanded.has(li.dataset.value ?? '')
      li.classList.toggle('open', open)
      if (open) li.setAttribute('aria-expanded', 'true')
      else if (li.hasAttribute('aria-haspopup')) li.setAttribute('aria-expanded', 'false')
    }
  }

  /** 键盘激活态 → .active class（不重建 DOM） */
  private syncActive(): void {
    if (!this.menuEl) return
    for (const li of this.menuEl.querySelectorAll<HTMLElement>('.item.active')) {
      li.classList.remove('active')
    }
    const current = this.currentItems()[this.activeIndex]
    if (!current || current.value == null) return
    const el = this.menuEl.querySelector<HTMLElement>(
      `[part="item"][data-value="${current.value}"]`,
    )
    el?.classList.add('active')
  }

  private select(item: MenuItem): void {
    this.setAttribute('value', item.value ?? '')
    this.emit('select', { value: item.value })
    // 级联浮出菜单惯例：选中叶子项后收回所有展开的子菜单（展开态是临时的）
    if (this.expanded.size > 0) {
      this.expanded.clear()
      this.syncOpen()
    }
  }

  /** hover：级联展开到该项所在的单条路径（同级互斥），只切 class 不重建 */
  private hoverExpand(value: string): void {
    if (!value) return
    const chain = this.chainOf(value)
    if (chain.length === 0) return
    const item = this.findItem(value)
    const open = item?.children?.length ? chain : chain.slice(0, -1)
    const next = new Set(open)
    if (next.size === this.expanded.size && [...next].every((v) => this.expanded.has(v))) return
    this.expanded = next
    this.syncOpen()
  }

  /** 点击：展开/收起子菜单 */
  private toggleExpand(value: string): void {
    if (this.expanded.has(value)) {
      this.expanded = new Set(this.chainOf(value).slice(0, -1))
    } else {
      this.expanded = new Set(this.chainOf(value))
    }
    this.syncOpen()
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

  /** 键盘进入子菜单：展开并高亮第一个可用子项 */
  private enterSubmenu(item: MenuItem): void {
    this.activeStack.push(item.value ?? '')
    this.expanded = new Set(this.activeStack)
    const children = this.currentItems()
    const firstEnabled = children.findIndex((c) => !c.disabled)
    this.activeIndex = firstEnabled >= 0 ? firstEnabled : 0
  }

  /** 键盘返回父级：收起子菜单并高亮父级项 */
  private leaveSubmenu(): void {
    const value = this.activeStack.pop()
    this.expanded = new Set(this.activeStack)
    const parentLevel = this.currentItems()
    this.activeIndex = parentLevel.findIndex((i) => i.value === value)
  }

  private moveActive(enabled: number[], dir: 1 | -1): void {
    const len = enabled.length
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
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.moveActive(enabled, 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.moveActive(enabled, -1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      const active = items[this.activeIndex]
      if (active && !active.disabled && active.children?.length) {
        this.enterSubmenu(active)
      } else {
        this.moveActive(enabled, 1)
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      if (this.activeStack.length > 0) {
        this.leaveSubmenu()
      } else {
        this.moveActive(enabled, -1)
      }
    } else if (e.key === 'Enter') {
      const active = items[this.activeIndex]
      if (!active) return
      e.preventDefault()
      if (active.disabled) return
      if (active.children?.length) {
        this.enterSubmenu(active)
      } else {
        this.select(active)
      }
    } else if (e.key === 'Home') {
      this.activeIndex = enabled[0]!
    } else if (e.key === 'End') {
      this.activeIndex = enabled[enabled.length - 1]!
    } else {
      return
    }
    this.syncOpen()
    this.syncActive()
  }
}
