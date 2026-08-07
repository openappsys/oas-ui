import { OASElement } from '@oas-ui/core'

interface TreeOption {
  label: string
  value: string
  children?: TreeOption[]
  disabled?: boolean
}

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
  z-index: 10;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  padding: var(--oas-space-1);
  display: none;
  max-height: 300px;
  overflow-y: auto;
}
.dropdown.open {
  display: block;
}
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
.node[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
.toggle {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--oas-color-text-secondary);
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
  color: #fff;
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
  white-space: nowrap;
}
.children {
  margin-left: var(--oas-space-3);
  display: none;
}
.children.open {
  display: block;
}
.empty {
  padding: var(--oas-space-3);
  text-align: center;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
`

interface FlatNode {
  option: TreeOption
  depth: number
  parent?: TreeOption
}

export class OASTreeSelect extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'placeholder', 'options', 'disabled', 'multiple']
  }

  private triggerEl: HTMLButtonElement | null = null
  private dropdown: HTMLElement | null = null
  private options: TreeOption[] = []
  private openState = false
  private flat: FlatNode[] = []

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="wrapper" part="wrapper">
        <button class="trigger" part="trigger" type="button" role="combobox" aria-haspopup="true" aria-expanded="false">
          <span class="value" part="value"></span>
          <svg class="chevron" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M4 6 L8 10 L12 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="dropdown" part="dropdown"></div>
      </div>
    `
    this.triggerEl = this.shadow.querySelector('.trigger')
    this.dropdown = this.shadow.querySelector('.dropdown')
    this.triggerEl?.addEventListener('click', () => this.toggle())
    this.triggerEl?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.openState = false
        this.syncDropdown()
      }
    })
    this.onCleanup(() => document.removeEventListener('click', this.handleOutsideClick))
    this.update()
  }

  protected override update(): void {
    this.parseOptions()
    this.flat = []
    this.buildFlat(this.options, undefined, 0)
    this.syncTrigger()
  }

  private parseOptions(): void {
    try {
      const parsed = JSON.parse(this.getAttr('options', '[]'))
      this.options = Array.isArray(parsed)
        ? parsed.filter((o): o is TreeOption => o && typeof o.value === 'string')
        : []
    } catch {
      this.options = []
    }
  }

  private buildFlat(list: TreeOption[], parent: TreeOption | undefined, depth: number): void {
    for (const option of list) {
      this.flat.push({ option, depth, parent })
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
    if (this.openState) document.addEventListener('click', this.handleOutsideClick)
    else document.removeEventListener('click', this.handleOutsideClick)
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.openState = false
    }
    this.syncDropdown()
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

  private renderTree(): void {
    const dropdown = this.dropdown
    if (!dropdown) return
    dropdown.innerHTML = ''
    if (this.flat.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'empty'
      empty.textContent = '暂无数据'
      dropdown.appendChild(empty)
      return
    }
    const values = this.currentValues()
    const expanded = new Set(this.getExpandedNodes())
    for (const item of this.flat) {
      const hasChildren = !!item.option.children?.length
      const visible = item.depth === 0 || expanded.has(item.parent?.value ?? '')
      if (!visible) continue
      const row = document.createElement('div')
      row.className = 'node'
      row.setAttribute('part', 'node')
      row.setAttribute('role', 'treeitem')
      row.style.paddingLeft = `${8 + item.depth * 18}px`
      row.setAttribute('aria-disabled', String(item.option.disabled ?? false))

      const toggle = document.createElement('span')
      toggle.className = `toggle${hasChildren ? '' : ' leaf'}${expanded.has(item.option.value) ? ' open' : ''}`
      toggle.textContent = '›'
      toggle.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation()
        const set = this.getExpandedNodes()
        if (set.has(item.option.value)) set.delete(item.option.value)
        else set.add(item.option.value)
        this.setExpandedNodes(set)
        this.renderTree()
      })
      row.appendChild(toggle)

      if (this.hasAttr('multiple')) {
        const check = document.createElement('span')
        check.className = 'check'
        const descendants = this.descendants(item.option)
        const checkedDesc = descendants.filter((d) => values.includes(d.value)).length
        const isChecked = values.includes(item.option.value) || checkedDesc === descendants.length
        const isHalf = !isChecked && checkedDesc > 0
        check.classList.toggle('checked', isChecked)
        check.classList.toggle('half', isHalf)
        check.textContent = isChecked ? '✓' : isHalf ? '—' : ''
        row.appendChild(check)
        row.addEventListener('click', () => {
          if (item.option.disabled) return
          const next = new Set(values)
          const all = [item.option, ...this.descendants(item.option)]
          const anyChecked = all.some((d) => next.has(d.value))
          if (anyChecked) for (const d of all) next.delete(d.value)
          else for (const d of all) next.add(d.value)
          this.commit([...next])
        })
      } else {
        row.addEventListener('click', () => {
          if (item.option.disabled) return
          this.commit([item.option.value])
        })
      }

      const label = document.createElement('span')
      label.className = 'label'
      label.textContent = item.option.label
      row.appendChild(label)
      dropdown.appendChild(row)
    }
  }

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
    const placeholder = this.getAttr('placeholder', '请选择')
    const valueEl = this.triggerEl.querySelector<HTMLElement>('.value')!
    const values = this.currentValues()
    this.triggerEl.disabled = this.hasAttr('disabled')

    if (values.length === 0) {
      valueEl.innerHTML = ''
      const ph = document.createElement('span')
      ph.className = 'placeholder'
      ph.textContent = placeholder
      valueEl.appendChild(ph)
      return
    }
    const labels = values.map((v) => this.findLabel(v))
    valueEl.textContent = this.hasAttr('multiple')
      ? labels.slice(0, 3).join('、') + (labels.length > 3 ? ` 等${labels.length}项` : '')
      : (labels[0] ?? values[0] ?? '')
  }

  private findLabel(value: string): string {
    for (const item of this.flat) {
      if (item.option.value === value) return item.option.label
    }
    return value
  }
}
