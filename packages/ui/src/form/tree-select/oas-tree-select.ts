import { OASElement } from '@oas-ui/core'
// 注册 oas-virtual-list（OASVirtualList 仅作类型用，需裸 import 保住注册副作用）
import '../../data/virtual-list/index.js'
import type { OASVirtualList } from '../../data/virtual-list/index.js'

interface TreeOption {
  label: string
  value: string
  children?: TreeOption[]
  disabled?: boolean
}

/** 勾选策略：all=父级+子级全进值；parent=只保留父级（子级全选时以父级为代表）；child=只保留叶子 */
type CheckStrategy = 'all' | 'parent' | 'child'

/**
 * 节点行样式（非虚拟渲染在 tree-select 自身 shadow；虚拟模式需注入 vlist shadow，两处共用）。
 * 颜色/间距一律走 CSS 变量 token（light+dark 由主题切换自动适配）。
 */
const NODE_STYLE = `
.node {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding: var(--oas-space-1) var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
}
.node:hover {
  background: var(--oas-color-bg-hover);
}
.node.active {
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
}
.node[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
.toggle {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0;
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-xs);
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
  flex: none;
}
.toggle.open {
  transform: rotate(90deg);
}
.toggle.leaf {
  visibility: hidden;
}
.check {
  width: 16px;
  height: 16px;
  border: 1px solid var(--oas-color-border);
  border-radius: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  color: var(--oas-color-text-on-primary);
  font-size: var(--oas-font-size-xs);
}
.check.checked {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
}
.check.half {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  opacity: 0.6;
}
.label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
`

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  width: 240px;
}
.wrapper {
  position: relative;
}
.trigger {
  appearance: none;
  box-sizing: border-box;
  width: 100%;
  min-height: var(--oas-control-height-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2);
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  cursor: pointer;
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    box-shadow var(--oas-transition-fast) var(--oas-ease-out);
}
.trigger:hover {
  border-color: var(--oas-color-primary);
}
.trigger:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.trigger[aria-expanded='true'] {
  border-color: var(--oas-color-primary);
}
:host([aria-invalid='true']) .trigger {
  border-color: var(--oas-color-danger);
}
:host([aria-invalid='true']) .trigger[aria-expanded='true'],
:host([aria-invalid='true']) .trigger:focus-visible {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
.trigger[disabled] {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
.placeholder {
  color: var(--oas-color-text-secondary);
}
.chevron {
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
}
.trigger[aria-expanded='true'] .chevron {
  transform: rotate(180deg);
}
.dropdown {
  position: absolute;
  z-index: calc(var(--oas-z-index-base, 0) + 10);
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  padding: var(--oas-space-1);
  display: none;
}
.dropdown.open {
  display: block;
}
.tree {
  max-height: 288px;
  overflow-y: auto;
}
.empty {
  padding: var(--oas-space-3);
  text-align: center;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
${NODE_STYLE}
`

/**
 * 虚拟模式注入 oas-virtual-list 的 shadow：节点行占满 item、整行可高亮；
 * 行内元素样式（node/toggle/check/label）需整体复制——vlist shadow 内够不到 tree-select 自身样式。
 */
const VIRTUAL_ROW_STYLE = `
[part="item"] {
  display: flex;
  align-items: center;
}
[part="item"] .node {
  flex: 1;
  height: 100%;
  box-sizing: border-box;
}
${NODE_STYLE}
`

interface FlatNode {
  option: TreeOption
  depth: number
  parent?: TreeOption
}

export class OASTreeSelect extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'placeholder',
      'options',
      'disabled',
      'multiple',
      'expanded',
      'check-strategy',
      'virtual',
      'height',
      'item-height',
    ]
  }

  private triggerEl: HTMLButtonElement | null = null
  private dropdown: HTMLElement | null = null
  private treeWrap: HTMLElement | null = null
  private vlist: OASVirtualList | null = null
  private _options: TreeOption[] = []
  private optionsAttr = ''
  /** 键盘导航高亮：visibleFlat() 的索引 */
  private activeIndex = 0

  /** Vue/React 会把 options 识别为实例属性走 property 赋值；setter 反射到 attribute 统一解析链路 */
  get options(): TreeOption[] {
    return this._options
  }
  set options(value: TreeOption[] | string) {
    this.setAttribute('options', typeof value === 'string' ? value : JSON.stringify(value))
  }

  override connectedCallback(): void {
    super.connectedCallback()
    // 升级前被赋过 options（SSR/onMounted 与模块加载的时序竞争），自有属性遮蔽原型
    // setter → parseOptions 读 attribute 为空 → 不渲染。回收到 setter 通道。
    if (Object.prototype.hasOwnProperty.call(this, 'options') && Array.isArray(this.options)) {
      const own = this.options
      delete (this as unknown as Record<string, unknown>).options
      this.options = own
    }
  }

  private openState = false
  private flat: FlatNode[] = []
  /** value → TreeOption 映射（buildFlat 时重建），勾选闭包/未知值判定用 O(1) 查找 */
  private valueMap = new Map<string, TreeOption>()

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="wrapper" part="wrapper">
        <button class="trigger" part="trigger" type="button" role="combobox"
          aria-haspopup="tree" aria-expanded="false">
          <span class="value" part="value"></span>
          <svg class="chevron" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M4 6 L8 10 L12 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="dropdown" part="dropdown">
          <div class="tree" part="tree" role="tree"></div>
          <oas-virtual-list class="vlist" part="virtual-list" hidden></oas-virtual-list>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定触发器/虚拟列表事件 + 注入虚拟行样式（render 与水合路径共用） */
  private bind(): void {
    this.triggerEl = this.shadow.querySelector('.trigger')
    this.dropdown = this.shadow.querySelector('.dropdown')
    this.treeWrap = this.shadow.querySelector('.tree')
    this.vlist = this.shadow.querySelector<OASVirtualList>('oas-virtual-list')

    this.triggerEl?.addEventListener('click', () => this.toggle())
    this.triggerEl?.addEventListener('keydown', (e: KeyboardEvent) => this.handleTriggerKey(e))
    // 虚拟滚动：复用 oas-virtual-list 的窗口计算，把每个可见项渲染为节点行
    this.vlist?.addEventListener('oas-item', ((
      e: CustomEvent<{ index: number; item: FlatNode; element: HTMLElement }>,
    ) => {
      const detail = e.detail
      if (detail && detail.item && detail.element) {
        this.createNodeRow(detail.item, detail.index, detail.element)
      }
    }) as EventListener)
    this.onCleanup(() => document.removeEventListener('click', this.handleOutsideClick, true))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（trigger/dropdown/tree/virtual-list 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.trigger')) return false
    if (!this.shadow.querySelector('.dropdown')) return false
    if (!this.shadow.querySelector('.tree')) return false
    if (!this.shadow.querySelector('oas-virtual-list')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.parseOptions()
    this.flat = []
    this.valueMap.clear()
    this.buildFlat(this._options, undefined, 0)
    this.syncTrigger()
    // 下拉展开时同步刷新节点（勾选态/展开态/虚拟窗口）
    if (this.openState) this.renderTree()
  }

  private parseOptions(): void {
    const raw = this.getAttr('options', '[]')
    if (raw === this.optionsAttr) return
    this.optionsAttr = raw
    try {
      const parsed = JSON.parse(raw)
      this._options = Array.isArray(parsed)
        ? parsed.filter((o): o is TreeOption => o && typeof o.value === 'string')
        : []
    } catch {
      this._options = []
    }
  }

  private buildFlat(list: TreeOption[], parent: TreeOption | undefined, depth: number): void {
    for (const option of list) {
      this.flat.push({ option, depth, parent })
      this.valueMap.set(option.value, option)
      if (option.children?.length) {
        this.buildFlat(option.children, option, depth + 1)
      }
    }
  }

  private toggle(): void {
    if (this.hasAttr('disabled')) return
    this.openState = !this.openState
    this.renderTree()
    this.syncDropdown()
  }

  private syncDropdown(): void {
    if (!this.dropdown || !this.triggerEl) return
    this.dropdown.classList.toggle('open', this.openState)
    this.triggerEl.setAttribute('aria-expanded', String(this.openState))
    if (this.openState) {
      document.addEventListener('click', this.handleOutsideClick, true)
      const vis = this.visibleFlat()
      const values = this.currentValues()
      let idx = 0
      if (values.length) {
        const found = vis.findIndex((v) => values.includes(v.option.value))
        if (found >= 0) idx = found
      }
      this.activeIndex = Math.min(idx, Math.max(0, vis.length - 1))
      this.scrollActiveIntoView()
      this.syncActive()
    } else {
      document.removeEventListener('click', this.handleOutsideClick, true)
      this.syncAriaActiveDescendant()
    }
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.openState = false
    }
    this.syncDropdown()
  }

  /** trigger 键盘：Esc 关闭；关闭态 Enter/Space/↑/↓ 展开；展开态 ↑/↓ 移动、Enter/Space 选中、→/← 展开/收起 */
  private handleTriggerKey(e: KeyboardEvent): void {
    if (this.hasAttr('disabled')) return
    if (e.key === 'Escape') {
      this.openState = false
      this.syncDropdown()
      return
    }
    if (!this.openState) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        this.openState = true
        this.syncDropdown()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.moveActive(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.moveActive(-1)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      this.selectActive()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      this.expandActive()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      this.collapseActive()
    }
  }

  /** 当前下拉可见节点（根节点 + 展开节点的直接子节点） */
  private visibleFlat(): FlatNode[] {
    const expanded = new Set(this.getExpandedNodes())
    return this.flat.filter((item) => item.depth === 0 || expanded.has(item.parent?.value ?? ''))
  }

  private moveActive(dir: 1 | -1): void {
    const n = this.visibleFlat().length
    if (n === 0) return
    this.activeIndex = (this.activeIndex + dir + n) % n
    this.scrollActiveIntoView()
    this.syncActive()
  }

  private selectActive(): void {
    const item = this.visibleFlat()[this.activeIndex]
    if (!item || item.option.disabled) return
    if (this.hasAttr('multiple')) {
      this.toggleCheck(item.option)
    } else {
      this.commit([item.option.value])
    }
  }

  private expandActive(): void {
    const item = this.visibleFlat()[this.activeIndex]
    if (!item || !item.option.children?.length) return
    const set = this.getExpandedNodes()
    if (set.has(item.option.value)) return
    set.add(item.option.value)
    this.setExpandedNodes(set)
    this.renderTree()
  }

  private collapseActive(): void {
    const item = this.visibleFlat()[this.activeIndex]
    if (!item) return
    const set = this.getExpandedNodes()
    if (!set.has(item.option.value)) return
    set.delete(item.option.value)
    this.setExpandedNodes(set)
    this.renderTree()
  }

  private currentValues(): string[] {
    if (!this.hasAttr('multiple')) {
      const raw = this.getAttr('value', '')
      return raw === '' ? [] : [raw]
    }
    try {
      const parsed = JSON.parse(this.getAttr('value', '[]'))
      return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []
    } catch {
      return []
    }
  }

  private checkStrategy(): CheckStrategy {
    const s = this.getAttr('check-strategy', 'all')
    return s === 'parent' || s === 'child' ? s : 'all'
  }

  // ---------- 勾选模型（父级级联） ----------

  /** 某个节点的全部后代（含 disabled，供勾选态判断） */
  private descendants(option: TreeOption): TreeOption[] {
    const out: TreeOption[] = []
    const walk = (list?: TreeOption[]): void => {
      for (const o of list ?? []) {
        out.push(o)
        walk(o.children)
      }
    }
    walk(option.children)
    return out
  }

  /** 某个节点的可勾选后代（排除 disabled） */
  private selectableDescendants(option: TreeOption): TreeOption[] {
    const out: TreeOption[] = []
    const walk = (list?: TreeOption[]): void => {
      for (const o of list ?? []) {
        if (!o.disabled) out.push(o)
        walk(o.children)
      }
    }
    walk(option.children)
    return out
  }

  private findNode(value: string): TreeOption | undefined {
    return this.valueMap.get(value)
  }

  /**
   * 内部完整勾选集合（策略无关，驱动复选框展示）：从受控 value 出发做级联闭包——
   * 1) value 含父节点 → 其全部可勾选后代视为勾选；
   * 2) 自底向上：非 disabled 子节点全部勾选时父节点自动勾选，否则（半选/未选）移出集合。
   * flat 为 DFS 先序（父在前），倒序扫描即子先于父，一轮收敛。
   */
  private internalChecked(): Set<string> {
    const checked = new Set<string>()
    for (const v of this.currentValues()) {
      const node = this.findNode(v)
      if (!node) {
        checked.add(v)
        continue
      }
      checked.add(v)
      for (const d of this.selectableDescendants(node)) checked.add(d.value)
    }
    this.normalizeChecked(checked)
    return checked
  }

  /** 自底向上归一化：全选父级加入集合，非全选（半选/未选）移出集合 */
  private normalizeChecked(checked: Set<string>): void {
    for (let i = this.flat.length - 1; i >= 0; i--) {
      const option = this.flat[i]!.option
      if (option.disabled) continue
      const kids = (option.children ?? []).filter((c) => !c.disabled)
      if (!kids.length) continue
      if (kids.every((k) => checked.has(k.value))) checked.add(option.value)
      else checked.delete(option.value)
    }
  }

  /** 勾选集合 → 按 check-strategy 派生对外 value */
  private applyStrategy(checked: Set<string>): string[] {
    const strategy = this.checkStrategy()
    const out: string[] = []
    for (const item of this.flat) {
      const v = item.option.value
      if (!checked.has(v)) continue
      if (strategy === 'child') {
        if (item.option.children?.length) continue
        out.push(v)
      } else if (strategy === 'parent') {
        // 父级已勾选时其子节点（含中间父级）被父级代表，不再单独入值
        if (item.parent && checked.has(item.parent.value)) continue
        out.push(v)
      } else {
        out.push(v)
      }
    }
    // 树外未知 value 原样保留（宿主传了但当前树无此节点）
    const outSet = new Set(out)
    for (const v of this.currentValues()) {
      if (!outSet.has(v) && !this.valueMap.has(v)) out.push(v)
    }
    return out
  }

  /** 切换某节点勾选：节点 + 全部后代翻转，随后自底向上归一化 */
  private toggleCheck(option: TreeOption): void {
    const checked = this.internalChecked()
    if (checked.has(option.value)) {
      checked.delete(option.value)
      for (const d of this.selectableDescendants(option)) checked.delete(d.value)
    } else {
      checked.add(option.value)
      for (const d of this.selectableDescendants(option)) checked.add(d.value)
    }
    this.normalizeChecked(checked)
    this.commitChecked(checked)
  }

  private commitChecked(checked: Set<string>): void {
    const values = this.applyStrategy(checked)
    this.setAttribute('value', JSON.stringify(values))
    this.emit('change', { value: values })
    this.syncTrigger()
    this.renderTree()
  }

  // ---------- 渲染 ----------

  private renderTree(): void {
    const dropdown = this.dropdown
    const treeWrap = this.treeWrap
    if (!dropdown || !treeWrap) return
    // 移除上次空态残留（空态追加在 dropdown 下）
    dropdown.querySelector('.empty')?.remove()

    const vis = this.visibleFlat()
    this.activeIndex = Math.min(this.activeIndex, Math.max(0, vis.length - 1))

    if (vis.length === 0) {
      if (this.vlist) this.vlist.hidden = true
      treeWrap.hidden = true
      treeWrap.innerHTML = ''
      const empty = document.createElement('div')
      empty.className = 'empty'
      empty.textContent = this.t('treeSelect.empty')
      dropdown.appendChild(empty)
      this.syncAriaActiveDescendant()
      return
    }

    // 虚拟滚动：大数据量时复用 oas-virtual-list 仅渲染可见窗口（键盘/ARIA 保持在 vlist 之上）
    if (this.hasAttr('virtual') && this.vlist) {
      treeWrap.hidden = true
      this.setupVirtualList(vis)
      return
    }

    if (this.vlist) this.vlist.hidden = true
    treeWrap.hidden = false
    treeWrap.innerHTML = ''
    const checked = this.internalChecked()
    const expanded = new Set(this.getExpandedNodes())
    if (this.hasAttr('multiple')) {
      treeWrap.setAttribute('aria-multiselectable', 'true')
    } else {
      treeWrap.removeAttribute('aria-multiselectable')
    }
    for (let i = 0; i < vis.length; i++) {
      this.createNodeRow(vis[i]!, i, treeWrap, { checked, expanded })
    }
    this.syncActive()
  }

  /** 虚拟模式：切到 vlist 渲染（窗口化）并喂入可见节点 */
  private setupVirtualList(vis: FlatNode[]): void {
    const vlist = this.vlist
    if (!vlist) return
    vlist.hidden = false
    // 行样式注入 vlist shadow（虚拟行在 vlist shadow 内，tree-select 自身样式够不到）
    const vlistRoot = vlist.shadowRoot
    if (vlistRoot && !vlistRoot.querySelector('style[data-oas-tree-select-rows]')) {
      const style = document.createElement('style')
      style.setAttribute('data-oas-tree-select-rows', '')
      style.textContent = VIRTUAL_ROW_STYLE
      vlistRoot.appendChild(style)
    }
    // 视口键盘可达性由 trigger 的 combobox 键盘流负责，去掉 vlist 内层 tabindex 避免多余 Tab 停靠点
    vlistRoot?.querySelector<HTMLElement>('.viewport')?.removeAttribute('tabindex')
    vlist.setAttribute('items-role', 'tree')
    vlist.setAttribute('item-role', 'presentation')
    vlist.setAttribute('height', this.getAttr('height', '288'))
    vlist.setAttribute('item-height', this.getAttr('item-height', '36'))
    vlist.items = vis
    this.syncActive()
  }

  private virtualItemHeight(): number {
    const n = Number.parseInt(this.getAttr('item-height', '36'), 10)
    return Number.isNaN(n) || n <= 0 ? 36 : n
  }

  /** 构建一个节点行（展开按钮 + 可选复选框 + 标签），非虚拟与虚拟（vlist oas-item）两路共用 */
  private createNodeRow(
    item: FlatNode,
    index: number,
    container: HTMLElement,
    ctx?: { checked: Set<string>; expanded: Set<string> },
  ): void {
    const { option, depth } = item
    const hasChildren = !!option.children?.length
    const expanded = ctx?.expanded ?? new Set(this.getExpandedNodes())
    const row = document.createElement('div')
    row.className = 'node'
    row.setAttribute('part', 'node')
    row.setAttribute('role', 'treeitem')
    row.setAttribute('aria-level', String(depth + 1))
    row.setAttribute('aria-disabled', String(option.disabled ?? false))
    row.setAttribute('data-index', String(index))
    row.id = `tree-opt-${index}` // aria-activedescendant 锚点（shadow 内 id 作用域隔离，无宿主冲突）
    row.style.paddingLeft = `${8 + depth * 18}px`
    if (index === this.activeIndex) row.classList.add('active')
    if (this.hasAttr('multiple')) {
      const checked = ctx?.checked ?? this.internalChecked()
      row.setAttribute('aria-selected', String(checked.has(option.value)))
    } else {
      row.setAttribute('aria-selected', String(this.currentValues().includes(option.value)))
    }

    // 展开按钮：可展开节点为可点 button（tabindex=-1 保持焦点在 trigger，键盘流走 combobox）
    const toggle = document.createElement('button')
    toggle.className = `toggle${hasChildren ? '' : ' leaf'}${expanded.has(option.value) ? ' open' : ''}`
    toggle.setAttribute('part', 'toggle')
    if (hasChildren) {
      toggle.setAttribute('aria-label', this.t('tree.expand'))
      toggle.setAttribute('aria-expanded', String(expanded.has(option.value)))
      toggle.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation()
        const set = this.getExpandedNodes()
        if (set.has(option.value)) set.delete(option.value)
        else set.add(option.value)
        this.setExpandedNodes(set)
        this.renderTree()
      })
    } else {
      toggle.setAttribute('aria-hidden', 'true')
      toggle.setAttribute('tabindex', '-1')
    }
    toggle.textContent = '›'
    row.appendChild(toggle)

    if (this.hasAttr('multiple')) {
      const check = document.createElement('span')
      check.className = 'check'
      const checked = ctx?.checked ?? this.internalChecked()
      const isChecked = checked.has(option.value)
      const isHalf = !isChecked && this.hasCheckedDescendant(option, checked)
      check.classList.toggle('checked', isChecked)
      check.classList.toggle('half', isHalf)
      check.textContent = isChecked ? '✓' : isHalf ? '—' : ''
      check.setAttribute('aria-hidden', 'true')
      row.appendChild(check)
      row.addEventListener('click', () => {
        if (option.disabled) return
        this.toggleCheck(option)
      })
    } else {
      row.addEventListener('click', () => {
        if (option.disabled) return
        this.commit([option.value])
      })
    }

    const label = document.createElement('span')
    label.className = 'label'
    label.textContent = option.label
    row.appendChild(label)
    container.appendChild(row)
  }

  private hasCheckedDescendant(option: TreeOption, checked: Set<string>): boolean {
    for (const d of this.descendants(option)) {
      if (checked.has(d.value)) return true
    }
    return false
  }

  private getExpandedNodes(): Set<string> {
    const raw = this.getAttr('expanded', '[]')
    try {
      const parsed = JSON.parse(raw)
      return new Set(Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [])
    } catch {
      return new Set()
    }
  }

  private setExpandedNodes(set: Set<string>): void {
    this.setAttribute('expanded', JSON.stringify([...set]))
  }

  private commit(values: string[]): void {
    if (this.hasAttr('multiple')) {
      this.setAttribute('value', JSON.stringify(values))
      this.emit('change', { value: values })
    } else {
      this.setAttribute('value', values[0] ?? '')
      this.emit('change', { value: values[0] ?? '' })
      this.openState = false
      this.syncDropdown()
    }
    this.syncTrigger()
    this.renderTree()
  }

  private syncTrigger(): void {
    if (!this.triggerEl) return
    const placeholder = this.getAttr('placeholder', this.t('treeSelect.placeholder'))
    const valueEl = this.triggerEl.querySelector<HTMLElement>('.value')!
    const values = this.currentValues()
    this.triggerEl.disabled = this.hasAttr('disabled')

    if (values.length === 0) {
      valueEl.innerHTML = ''
      const ph = document.createElement('span')
      ph.className = 'placeholder'
      ph.textContent = placeholder
      valueEl.appendChild(ph)
      // aria-label 随展示文案变化：空值 = placeholder，有值 = 当前选中标签（AT 可读名称 + 当前值）
      this.triggerEl.setAttribute('aria-label', placeholder)
      return
    }
    const shown = values.slice(0, 3)
    const labels = shown.map((v) => this.findLabel(v))
    const text = this.hasAttr('multiple')
      ? labels.join(this.t('treeSelect.join')) +
        (values.length > 3 ? ` ${this.t('treeSelect.andMore', { count: values.length })}` : '')
      : (labels[0] ?? values[0] ?? '')
    valueEl.textContent = text
    this.triggerEl.setAttribute('aria-label', text)
  }

  private findLabel(value: string): string {
    for (const item of this.flat) {
      if (item.option.value === value) return item.option.label
    }
    return value
  }

  // ---------- 键盘高亮增量同步（不重建 DOM） ----------

  /** 虚拟滚动：让 activeIndex 所在项进入视口（设置 scrollTop，vlist 随 scroll 重算窗口）；非虚拟滚 tree 容器 */
  private scrollActiveIntoView(): void {
    const vis = this.visibleFlat()
    if (this.activeIndex < 0 || this.activeIndex >= vis.length) return
    if (this.hasAttr('virtual') && this.vlist && !this.vlist.hidden) {
      const vp = this.vlist.shadowRoot?.querySelector<HTMLElement>('.viewport')
      if (!vp) return
      const ih = this.virtualItemHeight()
      const vh = Number(this.getAttr('height', '288')) || 288
      const top = this.activeIndex * ih
      const cur = vp.scrollTop
      if (top < cur) vp.scrollTop = Math.max(0, top)
      else if (top + ih > cur + vh) vp.scrollTop = Math.max(0, top + ih - vh)
      return
    }
    const wrap = this.treeWrap
    if (!wrap) return
    const row = wrap.querySelector<HTMLElement>(`[data-index="${this.activeIndex}"]`)
    if (!row) return
    const vh = wrap.clientHeight || 288
    const top = row.offsetTop
    if (top < wrap.scrollTop) wrap.scrollTop = top
    else if (top + row.offsetHeight > wrap.scrollTop + vh) {
      wrap.scrollTop = top + row.offsetHeight - vh
    }
  }

  /** 高亮 class + aria-activedescendant 增量同步（虚拟滚动下窗口随 scroll 重算后行内 class 由 createNodeRow 落定） */
  private syncActive(): void {
    const idx = this.activeIndex
    for (const row of this.renderedRows()) {
      const i = Number(row.getAttribute('data-index'))
      row.classList.toggle('active', i === idx)
    }
    this.syncAriaActiveDescendant()
  }

  /** 已渲染的节点行：非虚拟在 tree 容器、虚拟在 vlist shadow（open shadow 可跨根查询） */
  private renderedRows(): HTMLElement[] {
    const out: HTMLElement[] = []
    const wrap = this.shadow.querySelector('.tree')
    if (wrap) out.push(...wrap.querySelectorAll<HTMLElement>('.node[data-index]'))
    const vroot = this.vlist?.shadowRoot
    if (vroot) out.push(...vroot.querySelectorAll<HTMLElement>('.node[data-index]'))
    return out
  }

  /** combobox 的 aria-activedescendant 指向高亮行（仅展开时） */
  private syncAriaActiveDescendant(): void {
    if (!this.triggerEl) return
    if (!this.openState || this.visibleFlat().length === 0) {
      this.triggerEl.removeAttribute('aria-activedescendant')
      return
    }
    this.triggerEl.setAttribute('aria-activedescendant', `tree-opt-${this.activeIndex}`)
  }

  /** label 点击聚焦委托：把焦点交给 shadow 内 trigger（配合 oas-form-item 的 label 点击代理） */
  override focus(options?: FocusOptions): void {
    this.shadow.querySelector<HTMLButtonElement>('.trigger')?.focus(options)
  }
}
