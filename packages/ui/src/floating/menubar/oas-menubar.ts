import { OASElement } from '@oas-ui/core'
import type { MenuItem } from '../menu/index.js'

export interface MenubarItem extends MenuItem {
  /** Alt 访问键（可选，单字符）；缺省时取 label 首个 ASCII 字母 */
  accessKey?: string
}

function firstAscii(label?: string): string | undefined {
  const m = label?.match(/[a-zA-Z0-9]/)
  return m?.[0]
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
.bar {
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
/* 视口边界翻转（JS 检测后切类）：级联子菜单右侧不足向左展开；一级下拉右缘不足右对齐；底部不足向上 */
.submenu .submenu.flip-left {
  left: auto;
  right: 100%;
}
.submenu.flip-right {
  left: auto;
  right: 0;
}
.submenu.flip-up {
  top: auto;
  bottom: 100%;
}
.submenu .submenu.flip-up {
  top: auto;
  bottom: calc(-1 * var(--oas-space-1));
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
.subitem[aria-checked='true'] {
  color: var(--oas-color-primary);
  font-weight: 500;
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
.check {
  opacity: 0;
}
.subitem[aria-checked='true'] .check {
  opacity: 1;
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

export class OASMenubar extends OASElement {
  static override get observedAttributes(): string[] {
    return ['items', 'value']
  }

  private itemsList: MenubarItem[] = []
  private barEl: HTMLElement | null = null
  /** 上次解析的 items 属性原文，未变化时跳过全量重建（value 变化只增量同步勾选） */
  private lastItemsAttr: string | null = null
  /** 键盘导航当前层级的祖先 value 链（空 = 顶级菜单行） */
  private activeStack: string[] = []
  private activeIndex = 0
  private expanded = new Set<string>()
  private keyboardMode = false

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="bar" part="bar" role="menubar"></div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.barEl = this.shadow.querySelector('.bar')
    this.barEl?.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
    // 鼠标移出整个菜单栏时收起所有浮层
    this.barEl?.addEventListener('mouseleave', () => {
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

  /** 真水合：校验 SSR 快照结构（bar 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.bar')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // items 变化才全量重建；value 等属性变化走下方增量同步（勾选/展开/激活/roving）
    const itemsAttr = this.getAttr('items', '[]')
    if (itemsAttr !== this.lastItemsAttr) {
      this.lastItemsAttr = itemsAttr
      this.parseItems()
      this.pruneState()
      this.renderMenubar()
    }
    this.barEl?.setAttribute('aria-label', this.t('menubar.label'))
    this.syncSelection()
    this.syncOpen()
    this.syncActive()
    this.syncRoving()
  }

  private parseItems(): void {
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      this.itemsList = Array.isArray(parsed)
        ? parsed.filter((i): i is MenubarItem => {
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
    const n = this.topItems().length
    if (n === 0) {
      this.activeIndex = 0
      return
    }
    if (this.activeIndex >= n) this.activeIndex = 0
  }

  /** 顶级菜单项（当前解析后的数据） */
  private topItems(): MenubarItem[] {
    return this.itemsList
  }

  /** 当前键盘导航层级的可导航项（group 内联展开，divider/组标题跳过） */
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

  /** 当前激活子菜单所在顶级项的索引（键盘上下文） */
  private parentTopIndex(): number {
    const first = this.activeStack[0]
    if (first == null) return -1
    return this.topItems().findIndex((i) => i.value === first)
  }

  /** 全量渲染一次（含所有子菜单），显隐由 .open class 控制，不随 hover 重建 */
  private renderMenubar(): void {
    const barEl = this.barEl
    if (!barEl) return
    barEl.innerHTML = ''
    const selected = this.getAttr('value', '')
    this.itemsList.forEach((item, idx) => {
      const wrap = document.createElement('div')
      wrap.className = 'top-wrap'
      const btn = document.createElement('button')
      btn.className = 'top-item'
      btn.setAttribute('part', 'top-item')
      btn.setAttribute('type', 'button')
      btn.setAttribute('role', 'menuitem')
      btn.setAttribute('aria-haspopup', 'menu')
      btn.setAttribute('aria-expanded', 'false')
      btn.setAttribute('tabindex', '-1')
      btn.setAttribute('aria-disabled', String(item.disabled ?? false))
      if (item.value != null) btn.dataset.value = item.value
      if (item.label) btn.setAttribute('aria-label', item.label)
      btn.textContent = item.label ?? ''
      btn.addEventListener('focus', () => {
        this.activeIndex = idx
        this.syncActive()
      })
      btn.addEventListener('click', () => {
        this.keyboardMode = false
        if (item.disabled) return
        if (item.children?.length) this.toggleExpand(item.value ?? '')
        else this.select(item)
      })
      btn.addEventListener('mouseenter', () => {
        this.keyboardMode = false
        if (item.disabled) return
        this.hoverExpand(item.value ?? '')
      })
      wrap.appendChild(btn)
      if (item.children?.length) {
        const ul = document.createElement('ul')
        ul.className = 'submenu'
        ul.setAttribute('part', 'submenu')
        ul.setAttribute('role', 'menu')
        ul.dataset.parent = item.value ?? ''
        this.renderSubLevel(ul, item.children, selected)
        wrap.appendChild(ul)
      }
      barEl.appendChild(wrap)
    })
  }

  private renderSubLevel(container: HTMLElement, items: MenuItem[], selected: string): void {
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
        if (item.children) this.renderSubLevel(container, item.children, selected)
        continue
      }
      const hasChildren = !!item.children && item.children.length > 0
      const li = document.createElement('li')
      li.className = 'subitem'
      li.setAttribute('part', 'item')
      li.setAttribute('role', hasChildren ? 'menuitem' : 'menuitemradio')
      li.setAttribute('tabindex', '-1')
      if (item.value != null) li.dataset.value = item.value
      li.setAttribute('aria-disabled', String(item.disabled ?? false))
      if (item.label) li.setAttribute('aria-label', item.label)
      const label = document.createElement('span')
      label.className = 'label'
      label.textContent = item.label ?? ''
      li.appendChild(label)
      if (hasChildren) {
        li.setAttribute('aria-haspopup', 'menu')
        li.setAttribute('aria-expanded', 'false')
        li.append(this.createChevron())
      } else {
        li.setAttribute('aria-checked', String(item.value === selected))
        const check = document.createElement('span')
        check.className = 'check'
        check.textContent = '✓'
        li.appendChild(check)
      }
      li.addEventListener('click', () => {
        this.keyboardMode = false
        if (item.disabled) return
        if (hasChildren) this.toggleExpand(item.value ?? '')
        else this.select(item)
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
        this.renderSubLevel(sub, item.children!, selected)
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

  /** value 变化 → 轻量同步叶子项勾选态（aria-checked，不重建 DOM） */
  private syncSelection(): void {
    if (!this.shadow) return
    const selected = this.getAttr('value', '')
    for (const li of this.shadow.querySelectorAll<HTMLElement>('[part="item"]')) {
      // 带子菜单的项是父节点，无勾选态
      if (li.getAttribute('aria-haspopup') === 'menu') continue
      li.setAttribute('aria-checked', String(li.dataset.value === selected))
    }
  }

  /** 展开状态 → .open class + aria-expanded（不重建 DOM） */
  private syncOpen(): void {
    if (!this.shadow) return
    for (const btn of this.shadow.querySelectorAll<HTMLElement>('[part="top-item"]')) {
      const open = this.expanded.has(btn.dataset.value ?? '')
      btn.setAttribute('aria-expanded', String(open))
    }
    for (const ul of this.shadow.querySelectorAll<HTMLElement>('[part="submenu"]')) {
      ul.classList.toggle('open', this.expanded.has(ul.dataset.parent ?? ''))
    }
    this.syncSubmenuPositions()
  }

  /**
   * 子菜单视口边界翻转：级联子菜单父项右侧剩余空间不足时向左展开（flip-left）、
   * 一级下拉右缘不足时右对齐（flip-right）、底部不足时向上展开（flip-up）。
   * 与 oas-menu 同一方案：翻转由样式表类表达，本方法只做测量与切类；
   * 多级嵌套逐级检测（DOM 序外层先于内层，内层 rect 反映外层翻转后的真实布局）。
   */
  private syncSubmenuPositions(): void {
    const margin = 8
    const vw = window.innerWidth
    const vh = window.innerHeight
    for (const sub of this.shadow.querySelectorAll<HTMLElement>('[part="submenu"].open')) {
      // 级联子菜单的父项是 li；一级下拉的容器是 div（wrap），closest('li') 为 null 时回退直接父元素
      const parentItem = (sub.closest('li') ?? sub.parentElement) as HTMLElement | null
      if (!parentItem) continue
      const itemRect = parentItem.getBoundingClientRect()
      const subRect = sub.getBoundingClientRect()
      // 级联子菜单（父项本身在某个 submenu 里）左右翻转；一级下拉只 clamp 到右对齐
      const isNested = !!parentItem.parentElement?.closest('[part="submenu"]')
      if (isNested) {
        sub.classList.toggle('flip-left', itemRect.right + subRect.width > vw - margin)
        sub.classList.remove('flip-right')
      } else {
        sub.classList.toggle('flip-right', itemRect.left + subRect.width > vw - margin)
        sub.classList.remove('flip-left')
      }
      const subRectV = sub.getBoundingClientRect()
      sub.classList.toggle('flip-up', subRectV.bottom > vh - margin)
    }
  }

  /** 键盘激活态 → .active class（不重建 DOM） */
  private syncActive(): void {
    if (!this.shadow) return
    for (const el of this.shadow.querySelectorAll('.active')) el.classList.remove('active')
    const item = this.currentItems()[this.activeIndex]
    if (!item || item.value == null) return
    const selector = this.activeStack.length === 0 ? '[part="top-item"]' : '[part="item"]'
    this.shadow
      .querySelector<HTMLElement>(`${selector}[data-value="${item.value}"]`)
      ?.classList.add('active')
  }

  /** roving tabindex：仅当前顶级项可 Tab 到达 */
  private syncRoving(): void {
    if (!this.shadow) return
    for (const btn of this.shadow.querySelectorAll<HTMLElement>('[part="top-item"]')) {
      btn.setAttribute('tabindex', '-1')
    }
    for (const li of this.shadow.querySelectorAll<HTMLElement>('[part="item"]')) {
      li.setAttribute('tabindex', '-1')
    }
    const topIdx = this.activeStack.length === 0 ? this.activeIndex : this.parentTopIndex()
    const top = this.topItems()[topIdx]
    if (top?.value != null) {
      this.shadow
        .querySelector<HTMLElement>(`[part="top-item"][data-value="${top.value}"]`)
        ?.setAttribute('tabindex', '0')
    }
  }

  /** 把焦点移到当前层级激活项（仅键盘模式；hover/点击不移动焦点） */
  private focusCurrent(): void {
    if (!this.keyboardMode) return
    if (this.activeStack.length === 0) {
      const top = this.topItems()[this.activeIndex]
      if (top?.value == null) return
      this.shadow
        .querySelector<HTMLElement>(`[part="top-item"][data-value="${top.value}"]`)
        ?.focus()
      return
    }
    const item = this.currentItems()[this.activeIndex]
    if (!item || item.value == null) return
    this.shadow.querySelector<HTMLElement>(`[part="item"][data-value="${item.value}"]`)?.focus()
  }

  /** hover：级联展开到该项所在路径（同级互斥），同步导航上下文但不移动焦点 */
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

  /** 点击：展开/收起子菜单 */
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
    // 非受控通道：内部选中直接写回 value（受控模式由宿主监听 oas-select 接管，
    // 外部 setAttribute('value') 同样即时生效——value 在 observedAttributes 中）
    this.setAttribute('value', item.value ?? '')
    this.emit('select', { value: item.value })
    this.collapseAndFocusTop()
  }

  /** 收起全部浮层并聚焦回打开子菜单的顶级项（菜单栏行为） */
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

  /** 键盘进入子菜单：展开并聚焦第一个/最后一个可用子项 */
  private enterSubmenu(item: MenuItem, focusLast = false): void {
    if (!item.children?.length) return
    this.activeStack.push(item.value ?? '')
    this.expanded = new Set(this.activeStack)
    const children = this.currentItems()
    const enabled = children.map((c, i) => (c.disabled ? -1 : i)).filter((i) => i >= 0)
    this.activeIndex = focusLast ? enabled[enabled.length - 1]! : enabled[0]!
  }

  /** 键盘返回父级：收起子菜单并聚焦父级项 */
  private leaveSubmenu(): void {
    const value = this.activeStack.pop()
    this.expanded = new Set(this.activeStack)
    const parentLevel = this.currentItems()
    this.activeIndex = parentLevel.findIndex((i) => i.value === value)
    if (this.activeIndex < 0) this.activeIndex = 0
  }

  /** 一级子菜单返回顶级：关闭并聚焦回父级顶级项（ARIA menubar） */
  private leaveOrCloseSubmenu(): void {
    if (this.activeStack.length > 1) {
      this.leaveSubmenu()
    } else {
      this.collapseAndFocusTop()
    }
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

  private moveTopTo(total: number, target: number): void {
    if (total === 0) return
    this.activeIndex = ((target % total) + total) % total
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
      } else {
        this.leaveOrCloseSubmenu()
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      const active = items[this.activeIndex]
      if (atTop) {
        this.collapseToTop()
        this.moveActive(enabled, 1)
      } else if (active && !active.disabled && active.children?.length) {
        this.enterSubmenu(active)
      } else {
        // 叶子项：关闭子菜单并移到下一个顶级项（ARIA menubar）
        const parentIdx = this.parentTopIndex()
        this.collapseToTop()
        this.moveTopTo(this.topItems().length, parentIdx + 1)
      }
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

  /** 文档级键盘：Alt 访问键 + Alt 聚焦 + 子菜单 Tab 焦点陷阱 */
  private handleDocumentKey = (e: KeyboardEvent): void => {
    // Alt 单独按下：聚焦菜单栏第一个可用顶级项
    if (e.key === 'Alt' && !e.ctrlKey && !e.metaKey) {
      const first = this.topItems().findIndex((i) => !i.disabled)
      if (first < 0) return
      e.preventDefault()
      this.keyboardMode = true
      this.collapseToTop()
      this.activeIndex = first
      this.syncOpen()
      this.syncActive()
      this.syncRoving()
      this.focusCurrent()
      return
    }
    // Alt + 访问键：打开对应顶级菜单并聚焦首子项
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.key.length === 1) {
      const idx = this.topItems().findIndex((it) => {
        if (it.disabled) return false
        const ak = it.accessKey ?? firstAscii(it.label)
        return ak != null && ak.toLowerCase() === e.key.toLowerCase()
      })
      if (idx >= 0) {
        e.preventDefault()
        this.keyboardMode = true
        this.collapseToTop()
        this.activeIndex = idx
        const item = this.topItems()[idx]
        if (item?.children?.length) this.enterSubmenu(item)
        this.syncOpen()
        this.syncActive()
        this.syncRoving()
        this.focusCurrent()
      }
      return
    }
    // 焦点陷阱：子菜单打开时 Tab 在打开的子项间循环
    if (e.key === 'Tab' && this.expanded.size > 0) {
      const focusable = this.openSubmenuItems()
      if (focusable.length === 0) return
      e.preventDefault()
      const current = focusable.indexOf(this.shadow.activeElement as HTMLElement)
      const next = e.shiftKey
        ? (current - 1 + focusable.length) % focusable.length
        : (current + 1) % focusable.length
      focusable[next]?.focus()
    }
  }

  /** 当前最深层打开子菜单的可用子项（Tab 陷阱范围） */
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
