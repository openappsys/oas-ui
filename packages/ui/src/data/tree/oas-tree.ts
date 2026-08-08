import { OASElement } from '@oas-ui/core'
// 注册 oas-virtual-list（OASVirtualList 仅作类型用，需裸 import 保住注册副作用）
import '../virtual-list/index.js'
import type { OASVirtualList } from '../virtual-list/index.js'

export interface TreeNode {
  key: string
  label: string
  children?: TreeNode[]
  disabled?: boolean
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
.row {
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
.check {
  accent-color: var(--oas-color-primary);
  margin: 0;
  flex-shrink: 0;
}
.label {
  user-select: none;
}
/* 虚拟化：行渲染进 oas-virtual-list 的 item part 内，样式经 ::part 镜像 */
oas-virtual-list::part(item) .row {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  height: 100%;
  box-sizing: border-box;
  padding: 0 var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  cursor: default;
}
oas-virtual-list::part(item) .row:hover {
  background: var(--oas-color-bg-hover);
}
oas-virtual-list::part(item) .row[data-selected='true'] {
  background: var(--oas-color-primary-soft, rgba(24, 144, 255, 0.1));
  color: var(--oas-color-primary-active);
}
oas-virtual-list::part(item) .row[data-disabled='true'] {
  pointer-events: none;
}
oas-virtual-list::part(item) .row[data-disabled='true'] .label {
  color: var(--oas-color-text-secondary);
}
oas-virtual-list::part(item) .toggle {
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
oas-virtual-list::part(item) .toggle.leaf {
  visibility: hidden;
}
oas-virtual-list::part(item) .toggle.open {
  transform: rotate(90deg);
}
oas-virtual-list::part(item) .check {
  accent-color: var(--oas-color-primary);
  margin: 0;
  flex-shrink: 0;
}
oas-virtual-list::part(item) .label {
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
    return ['data', 'selected', 'checked', 'checkable', 'expanded', 'height', 'row-height']
  }

  private flat: FlatRow[] = []
  private vlist: OASVirtualList | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="tree" part="tree" role="tree"></div>
      <oas-virtual-list part="virtual" hidden></oas-virtual-list>
    `
    this.vlist = this.shadow.querySelector<OASVirtualList>('oas-virtual-list')
    this.vlist?.addEventListener('oas-item', ((
      e: CustomEvent<{ index: number; item: FlatRow; element: HTMLElement }>,
    ) => {
      const detail = e.detail
      if (detail && detail.item && detail.element) {
        this.renderRow(detail.item, detail.element)
      }
    }) as EventListener)
    this.update()
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
    if (node.children?.length) {
      const toggle = document.createElement('button')
      toggle.className = `toggle${expanded.has(node.key) ? ' open' : ''}`
      toggle.setAttribute('part', 'toggle')
      toggle.setAttribute('aria-label', this.t('tree.expand'))
      toggle.setAttribute('aria-expanded', String(expanded.has(node.key)))
      toggle.textContent = '›'
      toggle.addEventListener('click', (e) => {
        e.stopPropagation()
        const exp = new Set(this.getAttr('expanded', '').split(',').filter(Boolean))
        if (exp.has(node.key)) exp.delete(node.key)
        else exp.add(node.key)
        this.setAttribute('expanded', [...exp].join(','))
        this.update()
      })
      row.appendChild(toggle)
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
    container.appendChild(row)
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
    const walk = (nodes: TreeNode[], depth: number, parent?: string): void => {
      for (const node of nodes) {
        this.flat.push({ node, depth, parent })
        if (node.children?.length) walk(node.children, depth + 1, node.key)
      }
    }
    walk(data, 0)
  }
}
