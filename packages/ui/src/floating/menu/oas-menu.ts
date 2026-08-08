import { OASElement } from '@oas-ui/core'

export interface MenuItem {
  label: string
  value: string
  disabled?: boolean
  /** 子菜单项，支持多级嵌套（任意层级） */
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
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  font-size: var(--oas-font-size-md);
  display: flex;
  justify-content: space-between;
  align-items: center;
  white-space: nowrap; /* 禁止中文菜单项逐字换行竖排 */
  flex-wrap: wrap; /* 允许子菜单 ul 换行独占一行 */
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
.check {
  opacity: 0;
}
.item[aria-checked='true'] .check {
  opacity: 1;
}
.arrow {
  margin-left: var(--oas-space-3);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  transition: transform var(--oas-transition-base, 0.18s) ease;
}
.item[aria-expanded='true'] > .arrow {
  transform: rotate(90deg);
}
.submenu {
  list-style: none;
  margin: 0;
  padding: var(--oas-space-1) 0 0 var(--oas-space-4);
  border-left: 1px solid var(--oas-color-border);
  flex-basis: 100%; /* 子菜单独占一行，避免被父级 flex 压缩成窄列 */
  min-width: 120px; /* 子菜单最小宽度，确保正常横排显示 */
}
`

export class OASMenu extends OASElement {
  static override get observedAttributes(): string[] {
    return ['items', 'value']
  }

  private itemsList: MenuItem[] = []
  /** 当前键盘导航所在层级的祖先 value 链（空数组 = 顶层） */
  private activeStack: string[] = []
  private activeIndex = -1
  /** 已展开的子菜单 value 集合 */
  private expanded = new Set<string>()
  private menuEl: HTMLElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <ul class="menu" part="menu" role="menu" tabindex="0"></ul>
    `
    this.menuEl = this.shadow.querySelector('.menu')
    this.menuEl?.addEventListener('keydown', (e: KeyboardEvent) => this.handleKey(e))
    this.update()
  }

  protected override update(): void {
    this.parseItems()
    this.renderItems()
  }

  private parseItems(): void {
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      this.itemsList = Array.isArray(parsed)
        ? parsed.filter((i): i is MenuItem => i && typeof i.value === 'string')
        : []
    } catch {
      this.itemsList = []
    }
    this.pruneState()
  }

  /** 数据变化后清理失效的展开/导航状态 */
  private pruneState(): void {
    const valid = new Set<string>()
    const collect = (items: MenuItem[]): void => {
      for (const i of items) {
        valid.add(i.value)
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

  /** 当前键盘导航层级的菜单项（顶层或某个子菜单） */
  private currentItems(): MenuItem[] {
    let items = this.itemsList
    for (const v of this.activeStack) {
      const parent = items.find((i) => i.value === v)
      if (!parent || !parent.children) return []
      items = parent.children
    }
    return items
  }

  private renderItems(): void {
    const menuEl = this.menuEl
    if (!menuEl) return
    menuEl.innerHTML = ''
    const selected = this.getAttr('value', '')
    this.renderLevel(menuEl, this.itemsList, selected, 0)
  }

  private renderLevel(container: HTMLElement, items: MenuItem[], selected: string, depth: number): void {
    const isCurrentLevel = depth === this.activeStack.length
    for (const [idx, item] of items.entries()) {
      const li = document.createElement('li')
      li.className = 'item'
      li.setAttribute('part', 'item')
      li.setAttribute('aria-disabled', String(item.disabled ?? false))
      if (isCurrentLevel && idx === this.activeIndex) li.classList.add('active')
      const hasChildren = !!item.children && item.children.length > 0
      if (hasChildren) {
        const expanded = this.expanded.has(item.value)
        li.setAttribute('role', 'menuitem')
        li.setAttribute('aria-haspopup', 'menu')
        li.setAttribute('aria-expanded', String(expanded))
        const label = document.createElement('span')
        label.textContent = item.label
        const arrow = document.createElement('span')
        arrow.className = 'arrow'
        arrow.textContent = '›'
        li.append(label, arrow)
        li.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation()
          if (item.disabled) return
          this.toggleExpand(item.value)
        })
        li.addEventListener('mouseenter', () => {
          if (item.disabled) return
          this.expand(item.value)
        })
        if (expanded) {
          const sub = document.createElement('ul')
          sub.className = 'submenu'
          sub.setAttribute('part', 'submenu')
          this.renderLevel(sub, item.children!, selected, depth + 1)
          li.appendChild(sub)
        }
      } else {
        li.setAttribute('role', 'menuitemradio')
        li.setAttribute('aria-checked', String(item.value === selected))
        const label = document.createElement('span')
        label.textContent = item.label
        const check = document.createElement('span')
        check.className = 'check'
        check.textContent = '✓'
        li.append(label, check)
        li.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation()
          if (item.disabled) return
          this.select(item, items, depth)
        })
      }
      container.appendChild(li)
    }
  }

  private select(item: MenuItem, levelItems: MenuItem[], depth: number): void {
    this.setAttribute('value', item.value)
    this.activeStack.length = depth
    this.activeIndex = levelItems.indexOf(item)
    this.emit('select', { value: item.value })
    this.renderItems()
  }

  /** 点击：展开/收起子菜单 */
  private toggleExpand(value: string): void {
    if (this.expanded.has(value)) {
      this.expanded.delete(value)
      const i = this.activeStack.indexOf(value)
      if (i >= 0) this.activeStack.length = i
    } else {
      this.expanded.add(value)
    }
    this.renderItems()
  }

  /** hover：仅展开，不收起 */
  private expand(value: string): void {
    if (this.expanded.has(value)) return
    this.expanded.add(value)
    this.renderItems()
  }

  /** 键盘进入子菜单：展开并高亮第一个可用子项 */
  private enterSubmenu(item: MenuItem): void {
    this.expanded.add(item.value)
    this.activeStack.push(item.value)
    const children = item.children ?? []
    const firstEnabled = children.findIndex((c) => !c.disabled)
    this.activeIndex = firstEnabled >= 0 ? firstEnabled : 0
  }

  /** 键盘返回父级：收起子菜单并高亮父级项 */
  private leaveSubmenu(): void {
    const value = this.activeStack.pop()
    if (value) this.expanded.delete(value)
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
        // 与扁平菜单行为一致：无子级时向右循环下移
        this.moveActive(enabled, 1)
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      if (this.activeStack.length > 0) {
        this.leaveSubmenu()
      } else {
        // 与扁平菜单行为一致：顶层向左循环上移
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
        this.select(active, items, this.activeStack.length)
      }
    } else if (e.key === 'Home') {
      this.activeIndex = enabled[0]!
    } else if (e.key === 'End') {
      this.activeIndex = enabled[enabled.length - 1]!
    } else {
      return
    }
    this.renderItems()
  }
}
