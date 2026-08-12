import { OASElement } from '@oas-ui/core'
// 注册 oas-virtual-list（OASVirtualList 仅作类型用，需裸 import 保住注册副作用）
import '../virtual-list/index.js'
import type { OASVirtualList } from '../virtual-list/index.js'

export interface TreeNode {
  key: string
  label: string
  children?: TreeNode[]
  disabled?: boolean
  /** 懒加载：显式叶子（无可加载子节点，不显示展开箭头） */
  isLeaf?: boolean
  /** 懒加载：已加载完成标记（children 已就绪或确认无子节点） */
  loaded?: boolean
}

interface FlatRow {
  node: TreeNode
  depth: number
  parent?: string
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
}
.tree.drop-inner {
  outline: 2px dashed var(--oas-color-primary);
  outline-offset: -2px;
  border-radius: var(--oas-radius-md);
}
.row {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding: var(--oas-space-1) var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  cursor: default;
}
.row:hover {
  background: var(--oas-color-bg-hover);
}
.row[data-selected='true'] {
  background: var(--oas-color-primary-soft, rgba(24, 144, 255, 0.1));
  color: var(--oas-color-primary-active);
}
.row[data-disabled='true'] {
  pointer-events: none;
}
.row[data-disabled='true'] .label {
  color: var(--oas-color-text-secondary);
}
.row.dragging {
  opacity: 0.5;
}
.row.drop-inner {
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
}
.row.drop-before::before,
.row.drop-after::after {
  content: '';
  position: absolute;
  left: var(--oas-space-1);
  right: var(--oas-space-1);
  height: 2px;
  background: var(--oas-color-primary);
}
.row.drop-before::before {
  top: 0;
}
.row.drop-after::after {
  bottom: 0;
}
.toggle {
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  padding: 0;
  flex-shrink: 0;
}
.toggle.leaf {
  visibility: hidden;
}
.toggle.open {
  transform: rotate(90deg);
}
.toggle-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
.toggle-spinner::before {
  content: '';
  width: 12px;
  height: 12px;
  border: 2px solid var(--oas-color-border);
  border-top-color: var(--oas-color-primary);
  border-radius: 50%;
  animation: oas-tree-spin 0.8s linear infinite;
}
@keyframes oas-tree-spin {
  to {
    transform: rotate(360deg);
  }
}
.check {
  accent-color: var(--oas-color-primary);
  margin: 0;
  flex-shrink: 0;
}
.label {
  user-select: none;
}
`

/**
 * 虚拟路径行样式：行渲染在 oas-virtual-list 的 shadow 内，tree 自身样式够不到；
 * ::part() 后不支持链后代选择器（浏览器静默丢规则），故注入 vlist 的 shadow root。
 */
const VIRTUAL_ROW_STYLE = `
.row {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  height: 100%;
  box-sizing: border-box;
  padding: 0 var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  cursor: default;
}
.row:hover {
  background: var(--oas-color-bg-hover);
}
.row[data-selected='true'] {
  background: var(--oas-color-primary-soft, rgba(24, 144, 255, 0.1));
  color: var(--oas-color-primary-active);
}
.row[data-disabled='true'] {
  pointer-events: none;
}
.row[data-disabled='true'] .label {
  color: var(--oas-color-text-secondary);
}
.row.dragging {
  opacity: 0.5;
}
.row.drop-inner {
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
}
.row.drop-before::before,
.row.drop-after::after {
  content: '';
  position: absolute;
  left: var(--oas-space-1);
  right: var(--oas-space-1);
  height: 2px;
  background: var(--oas-color-primary);
}
.row.drop-before::before {
  top: 0;
}
.row.drop-after::after {
  bottom: 0;
}
.toggle {
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  padding: 0;
  flex-shrink: 0;
}
.toggle.leaf {
  visibility: hidden;
}
.toggle.open {
  transform: rotate(90deg);
}
.toggle-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
.toggle-spinner::before {
  content: '';
  width: 12px;
  height: 12px;
  border: 2px solid var(--oas-color-border);
  border-top-color: var(--oas-color-primary);
  border-radius: 50%;
  animation: oas-tree-spin 0.8s linear infinite;
}
@keyframes oas-tree-spin {
  to {
    transform: rotate(360deg);
  }
}
.check {
  accent-color: var(--oas-color-primary);
  margin: 0;
  flex-shrink: 0;
}
.label {
  user-select: none;
}
`

/**
 * oas-tree —— 树形控件，支持大数据量虚拟化。
 *
 * 虚拟化（可选）：设置 `height`（视口高度 px）后，树通过内嵌 oas-virtual-list
 * 仅渲染可见窗口内的行；展开状态保存在 `expanded` 属性中，滚动/重渲染不丢失。
 * 未设置 `height` 时保持原有全量渲染行为。
 */
export class OASTree extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'data',
      'selected',
      'checked',
      'checkable',
      'expanded',
      'height',
      'row-height',
      'lazy',
      'draggable',
    ]
  }

  /** 懒加载回调：展开未加载节点时触发 `{ key }`，宿主回填子节点后重设 data 属性 */
  load?: (payload: { key: string }) => void

  private _data: TreeNode[] = []
  private flat: FlatRow[] = []
  private vlist: OASVirtualList | null = null
  /** 正在懒加载的节点 key 集合 */
  private loading = new Set<string>()
  /** 当前正在拖拽的节点 key */
  private dragKey: string | null = null

  /**
   * data 同时支持 attribute 与 property 赋值：
   * Vue/React 模板渲染时 `data` 命中实例属性（accessor），宿主框架会走 property 赋值而非
   * setAttribute；setter 统一反射到 attribute，经 attributeChangedCallback 走既有
   * parse/update 链路，保持单一数据源（attribute 为唯一权威，无回写循环）。
   */
  get data(): TreeNode[] {
    return this._data
  }
  set data(value: TreeNode[] | string) {
    this.setAttribute('data', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="tree" part="tree" role="tree"></div>
      <oas-virtual-list part="virtual" hidden></oas-virtual-list>
    `
  }

  /** 缓存节点引用 + 绑定虚拟列表/拖放事件 + 注入虚拟行样式（render 与水合路径共用） */
  private bind(): void {
    this.vlist = this.shadow.querySelector<OASVirtualList>('oas-virtual-list')
    // 行样式注入 vlist 的 shadow（其 render 已在 innerHTML 插入时同步完成，后追加不会被覆盖）
    const vlistRoot = this.vlist?.shadowRoot
    if (vlistRoot && !vlistRoot.querySelector('style[data-oas-tree-rows]')) {
      const style = document.createElement('style')
      style.setAttribute('data-oas-tree-rows', '')
      style.textContent = VIRTUAL_ROW_STYLE
      vlistRoot.appendChild(style)
    }
    this.vlist?.addEventListener('oas-item', ((
      e: CustomEvent<{ index: number; item: FlatRow; element: HTMLElement }>,
    ) => {
      const detail = e.detail
      if (detail && detail.item && detail.element) {
        this.renderRow(detail.item, detail.element)
      }
    }) as EventListener)
    // 根容器拖放：拖到空白处视为移入根（dropKey 为空字符串、position 'inner'）
    const wrap = this.shadow.querySelector<HTMLElement>('.tree')
    if (wrap) {
      wrap.addEventListener('dragover', (e: Event) => {
        if (!this.dragKey) return
        const target = e.target as HTMLElement
        if (target.closest('[part="row"]')) return
        e.preventDefault()
        const dt = (e as DragEvent).dataTransfer
        if (dt) dt.dropEffect = 'move'
        wrap.classList.add('drop-inner')
      })
      wrap.addEventListener('dragleave', () => wrap.classList.remove('drop-inner'))
      wrap.addEventListener('drop', (e: Event) => {
        const target = e.target as HTMLElement
        if (target.closest('[part="row"]')) return
        e.preventDefault()
        wrap.classList.remove('drop-inner')
        if (this.dragKey) {
          this.emit('node-drop', { dragKey: this.dragKey, dropKey: '', position: 'inner' })
          this.dragKey = null
        }
      })
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（tree 容器与虚拟列表存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.tree')) return false
    if (!this.shadow.querySelector('oas-virtual-list')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const wrap = this.shadow.querySelector<HTMLElement>('.tree')
    if (!wrap) return
    this.buildFlat()
    const virtual = this.getAttr('height', '') !== ''
    wrap.hidden = virtual
    if (this.vlist) {
      this.vlist.hidden = !virtual
      if (virtual) {
        // 虚拟模式：.items 容器 role="tree"、item 容器 role="presentation"（透明包装），
        // 行自身保留 role="treeitem"——层级 tree > presentation > treeitem，aria 属性落在 treeitem 上
        this.vlist.setAttribute('items-role', 'tree')
        this.vlist.setAttribute('item-role', 'presentation')
        this.vlist.setAttribute('aria-label', this.t('tree.select'))
        this.vlist.setAttribute('height', this.getAttr('height', '360'))
        this.vlist.setAttribute('item-height', this.getAttr('row-height', '32'))
        this.vlist.items = this.visibleFlat()
        return
      }
      this.vlist.removeAttribute('items-role')
      this.vlist.removeAttribute('item-role')
      this.vlist.removeAttribute('aria-label')
    }
    wrap.innerHTML = ''
    for (const flat of this.visibleFlat()) {
      this.renderRow(flat, wrap)
    }
  }

  /** 仅保留可见行（根节点 + 展开节点的直接子节点），虚拟/非虚拟共用 */
  private visibleFlat(): FlatRow[] {
    const expanded = new Set(this.getAttr('expanded', '').split(',').filter(Boolean))
    return this.flat.filter(({ parent }) => parent === undefined || expanded.has(parent))
  }

  /** 构建一行（展开按钮 + 可选复选框 + 标签），供虚拟/非虚拟两路复用 */
  private renderRow(flat: FlatRow, container: HTMLElement): void {
    const { node, depth } = flat
    const selected = this.getAttr('selected', '')
    const checked = new Set(this.getAttr('checked', '').split(',').filter(Boolean))
    const expanded = new Set(this.getAttr('expanded', '').split(',').filter(Boolean))
    const row = document.createElement('div')
    row.className = 'row'
    row.setAttribute('part', 'row')
    row.setAttribute('role', 'treeitem')
    row.setAttribute('aria-level', String(depth + 1))
    row.setAttribute('data-disabled', String(!!node.disabled))
    row.setAttribute('data-selected', String(node.key === selected))
    if (this.isExpandable(node)) {
      if (this.loading.has(node.key)) {
        const spinner = document.createElement('span')
        spinner.className = 'toggle-spinner'
        spinner.setAttribute('part', 'spinner')
        spinner.setAttribute('aria-label', this.t('tree.loading'))
        row.appendChild(spinner)
      } else {
        const toggle = document.createElement('button')
        toggle.className = `toggle${expanded.has(node.key) ? ' open' : ''}`
        toggle.setAttribute('part', 'toggle')
        toggle.setAttribute('aria-label', this.t('tree.expand'))
        toggle.setAttribute('aria-expanded', String(expanded.has(node.key)))
        toggle.textContent = '›'
        toggle.addEventListener('click', (e) => {
          e.stopPropagation()
          const exp = new Set(this.getAttr('expanded', '').split(',').filter(Boolean))
          if (exp.has(node.key)) {
            exp.delete(node.key)
          } else {
            exp.add(node.key)
            // 懒加载：展开未加载节点时触发加载（children 尚未回填、非显式叶子、未标记已加载）
            if (
              this.hasAttr('lazy') &&
              !node.children?.length &&
              !node.isLeaf &&
              node.loaded !== true &&
              !this.loading.has(node.key)
            ) {
              this.loading.add(node.key)
              this.emit('load', { key: node.key })
              this.load?.({ key: node.key })
            }
          }
          this.setAttribute('expanded', [...exp].join(','))
          this.update()
        })
        row.appendChild(toggle)
      }
    } else {
      const toggle = document.createElement('button')
      toggle.className = 'toggle leaf'
      toggle.setAttribute('aria-hidden', 'true')
      toggle.setAttribute('tabindex', '-1')
      row.appendChild(toggle)
    }
    if (this.hasAttr('checkable')) {
      const box = document.createElement('input')
      box.type = 'checkbox'
      box.className = 'check'
      box.setAttribute('aria-label', this.t('tree.select', { label: node.label }))
      box.checked = checked.has(node.key)
      // 阻止复选框点击冒泡到行：既避免误触发行选中，也避免行内 update()
      // 重建 DOM 打断浏览器对复选框的原生激活（toggle + change），
      // 否则 change 事件不会触发、勾选状态无法写回 checked 属性。
      box.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation()
      })
      box.addEventListener('change', () => {
        const next = new Set(this.getAttr('checked', '').split(',').filter(Boolean))
        if (box.checked) next.add(node.key)
        else next.delete(node.key)
        this.setAttribute('checked', [...next].join(','))
        this.emit('check', { key: node.key, checked: box.checked })
      })
      row.appendChild(box)
    }
    const label = document.createElement('span')
    label.className = 'label'
    label.textContent = node.label
    row.appendChild(label)
    row.style.paddingLeft = `${depth * 24 + 8}px`
    row.addEventListener('click', () => {
      if (!node.disabled) {
        this.setAttribute('selected', node.key)
        this.emit('select', { key: node.key, selected: true })
        this.update()
      }
    })
    if (this.hasAttr('draggable')) this.bindDrag(row, node)
    container.appendChild(row)
  }

  /**
   * 是否可展开。常规模式仅 children 非空；懒加载模式下未加载节点
   * （无 children、非 isLeaf、未标记 loaded）也可展开，点击触发加载。
   */
  private isExpandable(node: TreeNode): boolean {
    if (node.children?.length) return true
    if (!this.hasAttr('lazy')) return false
    if (node.isLeaf || node.loaded === true) return false
    if (node.children !== undefined) return false // children: [] → 已加载为空
    return true
  }

  /** 拖拽行：dragstart 记录 key，dragover/drop 计算插入位置并派发 oas-node-drop */
  private bindDrag(row: HTMLElement, node: TreeNode): void {
    if (node.disabled) return
    row.draggable = true
    row.addEventListener('dragstart', ((e: DragEvent) => {
      this.dragKey = node.key
      row.classList.add('dragging')
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', node.key)
      }
    }) as EventListener)
    row.addEventListener('dragend', (() => {
      this.dragKey = null
      row.classList.remove('dragging')
      this.clearDropMarkers()
    }) as EventListener)
    row.addEventListener('dragover', ((e: DragEvent) => {
      if (!this.dragKey || this.dragKey === node.key || node.disabled) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
      const pos = this.dropPosition(row, e, node)
      this.clearDropMarkers()
      row.classList.add(
        pos === 'before' ? 'drop-before' : pos === 'after' ? 'drop-after' : 'drop-inner',
      )
    }) as EventListener)
    row.addEventListener('dragleave', (() => {
      row.classList.remove('drop-before', 'drop-after', 'drop-inner')
    }) as EventListener)
    row.addEventListener('drop', ((e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      this.clearDropMarkers()
      if (this.dragKey && this.dragKey !== node.key && !node.disabled) {
        this.emit('node-drop', {
          dragKey: this.dragKey,
          dropKey: node.key,
          position: this.dropPosition(row, e, node),
        })
      }
    }) as EventListener)
  }

  /** 按鼠标在行内的纵向比例判定插入位置：上 1/4 before、下 1/4 after、中部 inner（目标可展开时） */
  private dropPosition(
    row: HTMLElement,
    e: DragEvent,
    node: TreeNode,
  ): 'before' | 'after' | 'inner' {
    const rect = row.getBoundingClientRect()
    const ratio = rect.height ? (e.clientY - rect.top) / rect.height : 0.5
    if (ratio < 0.25) return 'before'
    if (ratio > 0.75) return 'after'
    if (this.isExpandable(node)) return 'inner'
    return ratio < 0.5 ? 'before' : 'after'
  }

  /** 清空所有行与根容器的拖拽落点反馈 */
  private clearDropMarkers(): void {
    this.shadow.querySelector<HTMLElement>('.tree')?.classList.remove('drop-inner')
    for (const el of this.allRows()) el.classList.remove('drop-before', 'drop-after', 'drop-inner')
  }

  /** 收集树 shadow 与虚拟列表 shadow 内的所有行（虚拟/非虚拟共用） */
  private allRows(): HTMLElement[] {
    const out: HTMLElement[] = [...this.shadow.querySelectorAll<HTMLElement>('[part="row"]')]
    const root = this.vlist?.shadowRoot
    if (root) out.push(...root.querySelectorAll<HTMLElement>('[part="row"]'))
    return out
  }

  private buildFlat(): void {
    this.flat = []
    let data: TreeNode[] = []
    try {
      const parsed = JSON.parse(this.getAttr('data', '[]'))
      data = Array.isArray(parsed) ? parsed : []
    } catch {
      data = []
    }
    this._data = data
    const walk = (nodes: TreeNode[], depth: number, parent?: string): void => {
      for (const node of nodes) {
        this.flat.push({ node, depth, parent })
        // 宿主回填子节点（children 就绪 / isLeaf / loaded）后结束加载态，占位符随之消失
        if (
          this.loading.has(node.key) &&
          (node.children !== undefined || node.isLeaf || node.loaded === true)
        ) {
          this.loading.delete(node.key)
        }
        if (node.children?.length) walk(node.children, depth + 1, node.key)
      }
    }
    walk(data, 0)
  }
}
