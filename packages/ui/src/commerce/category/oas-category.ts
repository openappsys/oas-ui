import { OASElement } from '@oas-ui/core/oas-element'
import { parseJsonArray } from '../../shared/json-array.js'
import { devWarn } from '../../shared/dev-warn.js'

/** 类目节点（宿主注入契约，可递归多级）：children 为子类目，items 为叶子商品位 */
export interface CategoryNode {
  key?: string
  id?: string
  label?: string
  name?: string
  children?: CategoryNode[]
  items?: CategoryItem[]
}

/** 商品位（叶子类目下的商品入口） */
export interface CategoryItem {
  key?: string
  id?: string
  label?: string
  name?: string
  meta?: string
}

interface FlatNode {
  key: string
  label: string
  node: CategoryNode
  parent: string | null
  path: string[]
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  --oas-category-side-width: 9rem;
  --oas-category-height: 24rem;
}
:host([hidden]) {
  display: none;
}
.layout {
  display: grid;
  grid-template-columns: minmax(0, var(--oas-category-side-width)) minmax(0, 1fr);
  gap: var(--oas-space-3);
  width: 100%;
  box-sizing: border-box;
}
.side {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-height: var(--oas-category-height);
  overflow: auto;
  padding: var(--oas-space-1);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  box-sizing: border-box;
}
.tree {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  margin: 0;
  padding: 0;
}
/* 子级分组（role=group）：与 .tree 同列同间隙，视觉与扁平结构一致、a11y 树语义正确 */
.node-group {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
}
.node {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  box-sizing: border-box;
  width: 100%;
  min-height: var(--oas-control-height-sm);
  padding-inline: var(--oas-space-2);
  border: 0;
  border-radius: var(--oas-radius-sm);
  background: transparent;
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  line-height: 1.5;
  text-align: start;
  cursor: pointer;
}
.node:hover {
  background: var(--oas-color-bg-hover);
}
.node[aria-selected='true'] {
  background: color-mix(in srgb, var(--oas-color-primary) 10%, var(--oas-color-bg));
  color: var(--oas-color-primary);
  font-weight: 600;
}
.node:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.node[data-level='2'] {
  padding-inline-start: var(--oas-space-4);
}
.node[data-level='3'] {
  padding-inline-start: var(--oas-space-6);
}
.node[data-level='4'] {
  padding-inline-start: var(--oas-space-8);
}
.chevron {
  display: inline-flex;
  flex-shrink: 0;
  width: 1em;
  height: 1em;
  align-items: center;
  justify-content: center;
  color: var(--oas-color-text-secondary);
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
}
.node[aria-expanded='true'] .chevron {
  transform: rotate(90deg);
}
.node[aria-expanded='false'] .chevron {
  transform: rotate(0deg);
}
/* RTL：折叠态收起方向镜像（'›' 转 180° 指向左侧）；展开态（向下）与语言方向无关 */
:host(:dir(rtl)) .node[aria-expanded='false'] .chevron {
  transform: rotate(180deg);
}
.node-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.panel {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
  min-width: 0;
  box-sizing: border-box;
  padding: var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
}
.panel-head {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  flex-wrap: wrap;
}
.back {
  box-sizing: border-box;
  min-height: var(--oas-control-height-sm);
  padding-inline: var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-secondary);
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
}
.back:hover {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
.back:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.crumb {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  overflow-wrap: anywhere;
}
.panel-title {
  font-size: var(--oas-font-size-md);
  font-weight: 600;
}
.section {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.section-title {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(6rem, 1fr));
  gap: var(--oas-space-2);
}
.tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--oas-space-1);
  box-sizing: border-box;
  padding: var(--oas-space-2) var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-family: inherit;
  text-align: start;
  cursor: pointer;
}
.tile:hover {
  border-color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.tile:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.tile-label {
  font-size: var(--oas-font-size-sm);
  line-height: 1.3;
}
.tile-meta {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.empty {
  padding: var(--oas-space-4);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  text-align: center;
}
@media (max-width: 480px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .side {
    max-height: var(--oas-category-side-height, 12rem);
  }
}
`

export class OASCategory extends OASElement {
  static override get observedAttributes(): string[] {
    return ['categories', 'active-key']
  }

  private tree: HTMLElement | null = null
  private panel: HTMLElement | null = null
  private roots: CategoryNode[] = []
  private categoriesSignature = ''
  private flat = new Map<string, FlatNode>()
  private expanded = new Set<string>()
  private focusKey = ''
  private treeSignature = ''
  private appliedActive = ''

  /** 类目树（property 通道读端）：与 categories attribute 同源，返回已解析并过滤的节点数组 */
  get categories(): CategoryNode[] {
    return this.roots
  }
  /** 类目树（property 通道写端）：数组直接序列化、字符串原样写入 attribute（本库数据属性双通道约定） */
  set categories(value: CategoryNode[] | string) {
    this.setAttribute('categories', typeof value === 'string' ? value : JSON.stringify(value))
  }

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="layout" part="layout">
        <div class="side" part="side">
          <div class="tree" part="tree" role="tree"></div>
        </div>
        <div class="panel" part="panel"></div>
      </div>
    `
  }

  private bind(): void {
    this.tree = this.shadow.querySelector('.tree')
    this.panel = this.shadow.querySelector('.panel')
    this.tree?.addEventListener('click', (e) => {
      const node = (e.target as Element | null)?.closest<HTMLElement>('.node')
      if (node) this.activate(node.dataset.key ?? '', true)
    })
    this.tree?.addEventListener('keydown', (e) => this.onTreeKey(e as KeyboardEvent))
    this.panel?.addEventListener('click', (e) => {
      const back = (e.target as Element | null)?.closest<HTMLElement>('.back')
      if (back) {
        const parent = this.flat.get(this.resolveActiveKey())?.parent
        if (parent) this.activate(parent, false)
        return
      }
      const tile = (e.target as Element | null)?.closest<HTMLElement>('.tile')
      if (tile) this.pickTile(tile.dataset.key ?? '')
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override update(): void {
    if (!this.tree) return
    this.tree.setAttribute('role', 'tree')
    this.tree.setAttribute('aria-label', this.t('category.label'))
    this.parseCategories()
    const active = this.resolveActiveKey()

    // 外部 active-key 变化时展开其路径（首次或宿主改写）；内部点击由 activate 自己维护
    if (active !== this.appliedActive) {
      this.appliedActive = active
      for (const key of this.flat.get(active)?.path ?? []) this.expanded.add(key)
      this.focusKey = active
    }

    this.renderTree()
    this.renderPanel(active)
  }

  private parseCategories(): void {
    const raw = this.getAttr('categories', '')
    if (raw === this.categoriesSignature) return
    this.categoriesSignature = raw
    this.roots = parseJsonArray<CategoryNode>(raw, () =>
      devWarn('[oas-category] categories 不是合法 JSON 数组，已按空类目渲染'),
    ).filter((n) => n && this.labelOf(n) !== '')
    this.flat.clear()
    this.indexNodes(this.roots, null, [])
    this.expanded.clear()
    this.appliedActive = ''
  }

  private indexNodes(nodes: CategoryNode[], parent: string | null, parentPath: string[]): void {
    for (const node of nodes) {
      const key = this.keyOf(node)
      if (key === '') continue
      const path = [...parentPath, key]
      this.flat.set(key, { key, label: this.labelOf(node), node, parent, path })
      if (node.children?.length) this.indexNodes(node.children, key, path)
    }
  }

  private keyOf(node: CategoryNode): string {
    return String(node.key ?? node.id ?? node.label ?? node.name ?? '')
  }

  private labelOf(node: CategoryNode): string {
    return String(node.label ?? node.name ?? node.key ?? node.id ?? '')
  }

  /**
   * 当前激活类目 key（attribute 通道读端，兼作内部解析）。
   * 命名刻意避开 `activeKey`：`active-key` 的 camelCase 一旦与实例方法同名，宿主框架按
   * 「key in el」写入 property 会遮蔽方法，update() 调用直接 TypeError（撞名守卫覆盖）。
   */
  private resolveActiveKey(): string {
    const own = this.getAttr('active-key', '')
    if (own !== '' && this.flat.has(own)) return own
    const first = this.roots[0]
    return first ? this.keyOf(first) : ''
  }

  private childrenOf(node: CategoryNode | undefined): CategoryNode[] {
    return (node?.children ?? []).filter((c) => this.flat.has(this.keyOf(c)))
  }

  private itemsOf(node: CategoryNode | undefined): CategoryItem[] {
    return node?.items ?? []
  }

  private renderTree(): void {
    if (!this.tree) return
    const active = this.resolveActiveKey()
    const focus = this.flat.has(this.focusKey) ? this.focusKey : active
    const signature = `${this.categoriesSignature}|${active}|${focus}|${[...this.expanded].sort().join(',')}`
    if (signature === this.treeSignature) return
    this.treeSignature = signature

    // 重建前的树内焦点（键盘导航/点击后 active 变化会重建树，焦点不能丢到 body）
    const focusedNode = this.shadow.activeElement
    const focusedKey =
      focusedNode instanceof HTMLElement && focusedNode.classList.contains('node')
        ? (focusedNode.dataset.key ?? '')
        : ''

    this.tree.replaceChildren()
    const walk = (nodes: CategoryNode[], level: number, parent: HTMLElement): void => {
      for (const node of nodes) {
        const key = this.keyOf(node)
        if (!this.flat.has(key)) continue
        const hasChildren = this.childrenOf(node).length > 0
        const isExpanded = this.expanded.has(key)
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'node'
        btn.setAttribute('part', 'node')
        btn.setAttribute('role', 'treeitem')
        btn.dataset.key = key
        btn.setAttribute('aria-level', String(level))
        btn.setAttribute('aria-selected', String(key === active))
        if (hasChildren) btn.setAttribute('aria-expanded', String(isExpanded))
        btn.dataset.level = String(Math.min(level, 4))
        btn.tabIndex = key === focus ? 0 : -1

        const chevron = document.createElement('span')
        chevron.className = 'chevron'
        chevron.setAttribute('aria-hidden', 'true')
        chevron.textContent = hasChildren ? '›' : ''
        btn.appendChild(chevron)
        const label = document.createElement('span')
        label.className = 'node-label'
        label.textContent = this.labelOf(node)
        btn.appendChild(label)
        parent.appendChild(btn)

        if (hasChildren && isExpanded) {
          // 子级挂 role=group：treeitem 的子项应归属分组（ARIA tree 模式），扁平追加会被读屏当成同级
          const group = document.createElement('div')
          group.className = 'node-group'
          group.setAttribute('role', 'group')
          walk(this.childrenOf(node), level + 1, group)
          parent.appendChild(group)
        }
      }
    }
    walk(this.roots, 1, this.tree)

    if (focusedKey) this.tree.querySelector<HTMLElement>(`.node[data-key="${cssEscape(focusedKey)}"]`)?.focus()
  }

  private renderPanel(active: string): void {
    if (!this.panel) return
    const entry = this.flat.get(active)
    // 面板每次 update 都会重建（内容随激活类目变化），先记下焦点归属再重建
    const focusHint = this.capturePanelFocus()
    this.panel.replaceChildren()
    if (!entry) {
      const empty = document.createElement('p')
      empty.className = 'empty'
      empty.setAttribute('part', 'empty')
      empty.textContent = this.t('category.empty')
      this.panel.appendChild(empty)
      this.restorePanelFocus(focusHint, active)
      return
    }

    const head = document.createElement('div')
    head.className = 'panel-head'
    if (entry.parent) {
      const back = document.createElement('button')
      back.type = 'button'
      back.className = 'back'
      back.setAttribute('part', 'back')
      back.textContent = this.t('category.back')
      back.dataset.key = entry.parent
      head.appendChild(back)
    }
    const title = document.createElement('span')
    title.className = 'panel-title'
    title.textContent = entry.label
    head.appendChild(title)
    if (entry.path.length > 1) {
      const crumb = document.createElement('span')
      crumb.className = 'crumb'
      crumb.textContent = entry.path.map((k) => this.flat.get(k)?.label ?? '').join(' / ')
      head.appendChild(crumb)
    }
    this.panel.appendChild(head)

    const children = this.childrenOf(entry.node)
    if (children.length > 0)
      this.appendGrid(
        this.t('category.subcategories'),
        children.map((c) => ({
          key: this.keyOf(c),
          label: this.labelOf(c),
          meta: '',
        })),
      )
    const items = this.itemsOf(entry.node)
    if (items.length > 0)
      this.appendGrid(
        this.t('category.products'),
        items.map((item) => ({
          key: String(item.key ?? item.id ?? item.label ?? item.name ?? ''),
          label: String(item.label ?? item.name ?? item.key ?? item.id ?? ''),
          meta: item.meta ?? '',
        })),
      )
    if (children.length === 0 && items.length === 0) {
      const empty = document.createElement('p')
      empty.className = 'empty'
      empty.setAttribute('part', 'empty')
      empty.textContent = this.t('category.empty')
      this.panel.appendChild(empty)
    }
    this.restorePanelFocus(focusHint, active)
  }

  /** 重建前的面板焦点归属：返回钮 / 宫格项（key 记下来，重建后按同 key 找回） */
  private capturePanelFocus(): string {
    const activeEl = this.shadow.activeElement
    if (!(activeEl instanceof HTMLElement) || !this.panel?.contains(activeEl)) return ''
    if (activeEl.classList.contains('back')) return 'back'
    if (activeEl.classList.contains('tile')) return `tile:${activeEl.dataset.key ?? ''}`
    return ''
  }

  /**
   * 重建后还原焦点：返回钮还在就还给返回钮；上级无返回钮（根层）时聚焦左侧树当前项。
   * 宫格项：同 key 项还在就还给它，否则（进入子类）落到返回钮，再退到首项/树节点。
   */
  private restorePanelFocus(hint: string, active: string): void {
    if (hint === '') return
    if (hint === 'back') {
      const back = this.panel?.querySelector<HTMLElement>('.back')
      if (back) {
        back.focus()
        return
      }
      this.tree?.querySelector<HTMLElement>(`.node[data-key="${cssEscape(active)}"]`)?.focus()
      return
    }
    if (!hint.startsWith('tile:')) return
    const key = hint.slice('tile:'.length)
    const tile = this.panel?.querySelector<HTMLElement>(`.tile[data-key="${cssEscape(key)}"]`)
    const back = this.panel?.querySelector<HTMLElement>('.back')
    const next = tile ?? back ?? this.panel?.querySelector<HTMLElement>('.tile')
    next?.focus()
  }

  private appendGrid(titleText: string, rows: Array<{ key: string; label: string; meta: string }>): void {
    if (!this.panel) return
    const section = document.createElement('div')
    section.className = 'section'
    const title = document.createElement('span')
    title.className = 'section-title'
    title.textContent = titleText
    section.appendChild(title)
    const grid = document.createElement('div')
    grid.className = 'grid'
    grid.setAttribute('part', 'grid')
    for (const row of rows) {
      const tile = document.createElement('button')
      tile.type = 'button'
      tile.className = 'tile'
      tile.setAttribute('part', 'tile')
      tile.dataset.key = row.key
      const label = document.createElement('span')
      label.className = 'tile-label'
      label.textContent = row.label
      tile.appendChild(label)
      if (row.meta) {
        const meta = document.createElement('span')
        meta.className = 'tile-meta'
        meta.textContent = row.meta
        tile.appendChild(meta)
      }
      grid.appendChild(tile)
    }
    section.appendChild(grid)
    this.panel.appendChild(section)
  }

  /** 右侧点按：子类目 → 激活并展开；商品位 → 派发 oas-select */
  private pickTile(key: string): void {
    const entry = this.flat.get(key)
    if (entry) {
      this.activate(key, false)
      return
    }
    const activeEntry = this.flat.get(this.resolveActiveKey())
    const item = this.itemsOf(activeEntry?.node).find((i) => String(i.key ?? i.id ?? i.label ?? i.name ?? '') === key)
    if (!item) return
    this.emit('select', { key, item, path: activeEntry?.path ?? [] })
  }

  private activate(key: string, toggle: boolean): void {
    const entry = this.flat.get(key)
    if (!entry) return
    this.focusKey = key
    if (toggle) {
      if (this.expanded.has(key)) this.expanded.delete(key)
      else if (this.childrenOf(entry.node).length > 0) this.expanded.add(key)
    } else {
      for (const k of entry.path) this.expanded.add(k)
    }
    if (this.getAttr('active-key', '') !== key) {
      this.setAttribute('active-key', key)
      this.appliedActive = key
      this.emit('change', { key, path: entry.path, node: entry.node })
    }
    this.appliedActive = key
    this.update()
  }

  private visibleNodes(): FlatNode[] {
    const out: FlatNode[] = []
    const walk = (nodes: CategoryNode[]): void => {
      for (const node of nodes) {
        const key = this.keyOf(node)
        const entry = this.flat.get(key)
        if (!entry) continue
        out.push(entry)
        if (this.expanded.has(key)) walk(this.childrenOf(node))
      }
    }
    walk(this.roots)
    return out
  }

  private onTreeKey(e: KeyboardEvent): void {
    const target = (e.target as Element | null)?.closest<HTMLElement>('.node')
    if (!target) return
    const key = target.dataset.key ?? ''
    const entry = this.flat.get(key)
    if (!entry) return
    const visible = this.visibleNodes()
    const index = visible.findIndex((n) => n.key === key)
    const hasChildren = this.childrenOf(entry.node).length > 0

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        this.focusNode(visible[index + 1]?.key ?? key)
        break
      case 'ArrowUp':
        e.preventDefault()
        this.focusNode(visible[index - 1]?.key ?? key)
        break
      case 'ArrowRight':
        e.preventDefault()
        if (hasChildren && !this.expanded.has(key)) {
          this.expanded.add(key)
          this.focusNode(key)
        } else if (hasChildren) {
          this.focusNode(this.childrenOf(entry.node)[0] ? this.keyOf(this.childrenOf(entry.node)[0]!) : key)
        }
        break
      case 'ArrowLeft':
        e.preventDefault()
        if (hasChildren && this.expanded.has(key)) {
          this.expanded.delete(key)
          this.focusNode(key)
        } else if (entry.parent) {
          this.focusNode(entry.parent)
        }
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        this.activate(key, true)
        break
      default:
        break
    }
  }

  private focusNode(key: string): void {
    this.focusKey = key
    this.update()
    this.tree?.querySelector<HTMLElement>(`.node[data-key="${cssEscape(key)}"]`)?.focus()
  }
}

/** 属性选择器转义（key 由宿主提供，可能含引号/空格等字符） */
function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value)
  return value.replace(/["\\]/g, '\\$&')
}
