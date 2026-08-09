import { OASElement } from '@oas-ui/core'

export interface ToggleItem {
  label: string
  value: string
  disabled?: boolean
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.group {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--oas-space-2);
}
.item {
  appearance: none;
  box-sizing: border-box;
  min-height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-4);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  cursor: pointer;
  transition: background var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out),
    color var(--oas-transition-fast) var(--oas-ease-out);
}
.item:hover {
  border-color: var(--oas-color-primary);
}
.item:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.item[aria-checked='true'] {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
.item[aria-disabled='true'] {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
  border-color: var(--oas-color-border);
}
`

/**
 * oas-toggle-group —— 切换组（单选/多选互斥按钮组）。
 *
 * 属性（kebab-case）：
 * - `items`：JSON `[{ label, value, disabled? }]`
 * - `value`：单选为字符串；`multiple` 时为 JSON 数组字符串
 * - `multiple`：多选模式（checkbox 语义）
 *
 * 事件（bubbles + composed）：
 * - `oas-change`：`{ value: string }`（单选）或 `{ value: string[] }`（多选）
 *
 * 语义：单选 `role="radiogroup"` + `radio`；多选 `role="group"` + `checkbox`；
 * 键盘方向键移动（单选即选中、多选移动焦点 + Space 切换），roving tabindex。
 */
export class OASToggleGroup extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'multiple', 'items']
  }

  private itemsList: ToggleItem[] = []
  private buttons: HTMLButtonElement[] = []
  private group: HTMLElement | null = null
  private lastItemsRaw = ''
  private lastMultiple = false
  /** 多选模式 roving tabindex 的焦点项下标 */
  private focusIndex = 0

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="group" part="group"></div>
    `
    this.group = this.shadow.querySelector('.group')
    this.group?.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
    this.update()
  }

  protected override update(): void {
    const itemsRaw = this.getAttribute('items') ?? ''
    const itemsChanged = itemsRaw !== this.lastItemsRaw
    this.lastItemsRaw = itemsRaw
    this.parseItems()
    const multiple = this.hasAttr('multiple')
    const multipleChanged = multiple !== this.lastMultiple
    this.lastMultiple = multiple
    if (itemsChanged || multipleChanged) {
      this.renderItems()
    } else {
      this.syncState()
    }
  }

  private parseItems(): void {
    try {
      const parsed = JSON.parse(this.getAttr('items', '[]'))
      this.itemsList = Array.isArray(parsed)
        ? parsed.filter(
            (o): o is ToggleItem =>
              !!o &&
              typeof o === 'object' &&
              typeof (o as ToggleItem).value === 'string' &&
              typeof (o as ToggleItem).label === 'string',
          )
        : []
    } catch {
      this.itemsList = []
    }
  }

  private selectedValues(): string[] {
    if (!this.hasAttr('multiple')) {
      const v = this.getAttr('value', '')
      return v ? [v] : []
    }
    try {
      const parsed = JSON.parse(this.getAttr('value', '[]'))
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
    } catch {
      return []
    }
  }

  private renderItems(): void {
    const group = this.group
    if (!group) return
    group.innerHTML = ''
    this.buttons = []
    const selected = this.selectedValues()
    this.focusIndex = this.resolveInitialFocus(selected)
    for (const item of this.itemsList) {
      const btn = document.createElement('button')
      btn.className = 'item'
      btn.setAttribute('part', 'item')
      btn.type = 'button'
      btn.textContent = item.label
      btn.addEventListener('click', () => this.selectItem(item))
      this.buttons.push(btn)
      group.appendChild(btn)
    }
    this.syncState()
  }

  private resolveInitialFocus(selected: string[]): number {
    const idx = this.itemsList.findIndex((it) => it.value === selected[0])
    return idx >= 0 ? idx : 0
  }

  private syncState(): void {
    const group = this.group
    if (!group) return
    const multiple = this.hasAttr('multiple')
    group.setAttribute('role', multiple ? 'group' : 'radiogroup')
    group.setAttribute('aria-label', this.t('toggleGroup.group'))
    const selected = this.selectedValues()
    this.buttons.forEach((btn, i) => {
      const item = this.itemsList[i]
      if (!item) return
      btn.setAttribute('role', multiple ? 'checkbox' : 'radio')
      btn.setAttribute('aria-checked', String(selected.includes(item.value)))
      btn.setAttribute('aria-disabled', String(item.disabled ?? false))
      if (item.disabled) btn.tabIndex = -1
      else if (multiple) btn.tabIndex = i === this.focusIndex ? 0 : -1
      else btn.tabIndex = item.value === selected[0] ? 0 : -1
    })
  }

  private selectItem(item: ToggleItem): void {
    if (item.disabled) return
    if (this.hasAttr('multiple')) {
      const set = new Set(this.selectedValues())
      if (set.has(item.value)) set.delete(item.value)
      else set.add(item.value)
      const next = [...set]
      this.setAttribute('value', JSON.stringify(next))
      this.emit('change', { value: next })
    } else {
      if (this.getAttr('value') === item.value) return
      this.setAttribute('value', item.value)
      this.emit('change', { value: item.value })
    }
    this.focusIndex = this.buttons.findIndex((_b, i) => this.itemsList[i] === item)
    this.update()
  }

  private currentRadioIndex(): number {
    const selected = this.selectedValues()
    const idx = this.itemsList.findIndex((it) => it.value === selected[0])
    return idx >= 0 ? idx : 0
  }

  private handleKey(e: KeyboardEvent): void {
    const items = this.itemsList
    if (items.length === 0) return
    const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0)
    if (enabled.length === 0) return
    const multiple = this.hasAttr('multiple')

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      this.move(1, enabled)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      this.move(-1, enabled)
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      const idx = multiple ? this.focusIndex : this.currentRadioIndex()
      const item = items[idx]
      if (item) this.selectItem(item)
    }
  }

  private move(dir: 1 | -1, enabled: number[]): void {
    const multiple = this.hasAttr('multiple')
    const curIdx = multiple ? this.focusIndex : this.currentRadioIndex()
    const cur = enabled.indexOf(curIdx)
    const next = enabled[(cur + dir + enabled.length) % enabled.length]
    if (next === undefined) return
    const item = this.itemsList[next]
    if (!item) return
    if (multiple) {
      this.focusIndex = next
      this.syncState()
      this.buttons[next]?.focus()
    } else {
      this.selectItem(item)
      this.buttons[next]?.focus()
    }
  }
}
