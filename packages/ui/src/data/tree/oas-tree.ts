import { OASElement } from '@oas-ui/core'

export interface TreeNode {
  key: string
  label: string
  children?: TreeNode[]
  disabled?: boolean
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
`

export class OASTree extends OASElement {
  static override get observedAttributes(): string[] {
    return ['data', 'selected', 'checked', 'checkable', 'expanded']
  }

  private flat: Array<{ node: TreeNode; depth: number; parent?: string }> = []

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="tree" part="tree" role="tree"></div>
    `
    this.update()
  }

  protected override update(): void {
    const wrap = this.shadow.querySelector('.tree')
    if (!wrap) return
    this.buildFlat()
    wrap.innerHTML = ''
    const selected = this.getAttr('selected', '')
    const checked = new Set(this.getAttr('checked', '').split(',').filter(Boolean))
    const expanded = new Set(this.getAttr('expanded', '').split(',').filter(Boolean))
    for (const { node, depth, parent } of this.flat) {
      const expandedRow = parent === undefined || expanded.has(parent)
      if (depth > 0 && !expandedRow) continue
      const row = document.createElement('div')
      row.className = 'row'
      row.setAttribute('part', 'row')
      row.setAttribute('role', 'treeitem')
      row.setAttribute('data-disabled', String(!!node.disabled))
      row.setAttribute('data-selected', String(node.key === selected))
      if (node.children?.length) {
        const toggle = document.createElement('button')
        toggle.className = `toggle${expanded.has(node.key) ? ' open' : ''}`
        toggle.setAttribute('part', 'toggle')
        toggle.setAttribute('aria-label', this.t('tree.expand'))
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
        row.appendChild(toggle)
      }
      if (this.hasAttr('checkable')) {
        const box = document.createElement('input')
        box.type = 'checkbox'
        box.className = 'check'
        box.setAttribute('aria-label', this.t('tree.select', { label: node.label }))
        box.checked = checked.has(node.key)
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
      wrap.appendChild(row)
    }
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
