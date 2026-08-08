import { OASElement } from '@oas-ui/core'

export interface TransferItem {
  key: string
  label: string
  disabled?: boolean
}

const STYLE = `
:host {
  display: inline-flex;
  font-family: inherit;
  gap: var(--oas-space-3);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
}
.panel {
  display: flex;
  flex-direction: column;
  width: 180px;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  overflow: hidden;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2);
  padding: var(--oas-space-2) var(--oas-space-3);
  background: var(--oas-color-bg-hover);
  border-bottom: 1px solid var(--oas-color-border);
  font-weight: 600;
}
.panel-head .select-all {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  font-size: var(--oas-font-size-xs);
  font-weight: 400;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  user-select: none;
}
.panel-head .select-all input {
  accent-color: var(--oas-color-primary);
  margin: 0;
}
.search-input {
  box-sizing: border-box;
  width: 100%;
  height: var(--oas-control-height-md);
  border: none;
  border-bottom: 1px solid var(--oas-color-border);
  padding: 0 var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
}
.search-input:focus {
  outline: none;
  box-shadow: inset 0 0 0 1px var(--oas-color-primary);
}
.listbox {
  max-height: 220px;
  overflow-y: auto;
  padding: var(--oas-space-1);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.option {
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
}
.option:hover {
  background: var(--oas-color-bg-hover);
}
.option[aria-selected='true'] {
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
.option[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
.empty {
  padding: var(--oas-space-3);
  text-align: center;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--oas-space-2);
}
.actions button {
  appearance: none;
  box-sizing: border-box;
  width: 34px;
  height: var(--oas-control-height-md);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  cursor: pointer;
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    color var(--oas-transition-fast) var(--oas-ease-out);
}
.actions button:hover:not(:disabled) {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
.actions button:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.actions button:disabled {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
  background: var(--oas-color-bg-disabled);
}
`

export class OASTransfer extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'titles', 'source-title', 'target-title', 'searchable']
  }

  private _data: TransferItem[] = []
  private leftSelected = new Set<string>()
  private rightSelected = new Set<string>()
  private activeSide: 'left' | 'right' = 'left'
  private leftListbox: HTMLElement | null = null
  private rightListbox: HTMLElement | null = null

  /** data 走 property（对象数组无法用 JSON 属性表达），设置后立即重渲 */
  get data(): TransferItem[] {
    return [...this._data]
  }

  set data(items: TransferItem[]) {
    this._data = Array.isArray(items)
      ? items.filter((i) => i && typeof i.key === 'string')
      : []
    this.leftSelected.clear()
    this.rightSelected.clear()
    this.renderPanels()
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="panel" part="panel">
        <div class="panel-head">
          <span class="title source"></span>
          <label class="select-all">
            <input type="checkbox" class="check-left" />
            <span></span>
          </label>
        </div>
        <input class="search-input search-left" type="text" hidden />
        <div class="listbox left" role="listbox" tabindex="0"></div>
      </div>
      <div class="actions" part="actions">
        <button type="button" class="to-right" aria-label=""></button>
        <button type="button" class="to-left" aria-label=""></button>
      </div>
      <div class="panel" part="panel">
        <div class="panel-head">
          <span class="title target"></span>
          <label class="select-all">
            <input type="checkbox" class="check-right" />
            <span></span>
          </label>
        </div>
        <input class="search-input search-right" type="text" hidden />
        <div class="listbox right" role="listbox" tabindex="0"></div>
      </div>
    `
    this.leftListbox = this.shadow.querySelector('.listbox.left')
    this.rightListbox = this.shadow.querySelector('.listbox.right')

    this.shadow.querySelector('.to-right')?.addEventListener('click', () => this.move('left', 'right'))
    this.shadow.querySelector('.to-left')?.addEventListener('click', () => this.move('right', 'left'))

    this.shadow.querySelector<HTMLInputElement>('.check-left')?.addEventListener('change', (e) =>
      this.toggleSelectAll('left', (e.target as HTMLInputElement).checked),
    )
    this.shadow.querySelector<HTMLInputElement>('.check-right')?.addEventListener('change', (e) =>
      this.toggleSelectAll('right', (e.target as HTMLInputElement).checked),
    )

    this.shadow
      .querySelector<HTMLInputElement>('.search-left')
      ?.addEventListener('input', () => this.renderPanel('left'))
    this.shadow
      .querySelector<HTMLInputElement>('.search-right')
      ?.addEventListener('input', () => this.renderPanel('right'))

    this.leftListbox?.addEventListener('keydown', (e: KeyboardEvent) => this.handleKey(e, 'left'))
    this.rightListbox?.addEventListener('keydown', (e: KeyboardEvent) => this.handleKey(e, 'right'))

    this.update()
  }

  protected override update(): void {
    this.renderPanels()
  }

  private currentValue(): string[] {
    try {
      const parsed = JSON.parse(this.getAttr('value', '[]'))
      return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []
    } catch {
      return []
    }
  }

  private sideItems(side: 'left' | 'right'): TransferItem[] {
    const value = this.currentValue()
    return side === 'left'
      ? this._data.filter((i) => !value.includes(i.key))
      : this._data.filter((i) => value.includes(i.key))
  }

  private renderPanels(): void {
    this.renderPanel('left')
    this.renderPanel('right')
  }

  private renderPanel(side: 'left' | 'right'): void {
    const listbox = side === 'left' ? this.leftListbox : this.rightListbox
    if (!listbox) return
    const items = this.sideItems(side)
    const selected = side === 'left' ? this.leftSelected : this.rightSelected
    const query = (
      this.shadow.querySelector<HTMLInputElement>(`.search-${side}`)?.value ?? ''
    ).toLowerCase()

    const visible = query ? items.filter((i) => i.label.toLowerCase().includes(query)) : items

    listbox.innerHTML = ''
    if (visible.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'empty'
      empty.textContent = this.t('transfer.empty')
      listbox.appendChild(empty)
    } else {
      for (const item of visible) {
        const row = document.createElement('div')
        row.className = 'option'
        row.setAttribute('part', 'option')
        row.setAttribute('role', 'option')
        row.setAttribute('aria-selected', String(selected.has(item.key)))
        row.setAttribute('aria-disabled', String(item.disabled ?? false))
        row.textContent = item.label
        row.addEventListener('click', () => {
          if (item.disabled) return
          if (selected.has(item.key)) selected.delete(item.key)
          else selected.add(item.key)
          this.renderPanel(side)
        })
        listbox.appendChild(row)
      }
    }

    // 标题
    const title = this.shadow.querySelector<HTMLElement>(`.title.${side === 'left' ? 'source' : 'target'}`)
    if (title) title.textContent = this.titleFor(side)

    // 全选 checkbox 状态：全部可见项已选中时为 true，全不选时为 false
    const check = this.shadow.querySelector<HTMLInputElement>(`.check-${side}`)
    if (check) {
      const selectable = visible.filter((i) => !i.disabled)
      check.checked = selectable.length > 0 && selectable.every((i) => selected.has(i.key))
      check.disabled = selectable.length === 0
      this.shadow.querySelector<HTMLElement>(`.check-${side} + span`)!.textContent = this.t(
        'transfer.selectAll',
      )
    }

    // 搜索框
    const search = this.shadow.querySelector<HTMLInputElement>(`.search-${side}`)
    if (search) {
      search.hidden = !this.hasAttr('searchable')
      search.setAttribute('aria-label', this.t('transfer.search'))
    }

    // 穿梭按钮 aria-label / disabled
    const toRight = this.shadow.querySelector<HTMLButtonElement>('.to-right')
    const toLeft = this.shadow.querySelector<HTMLButtonElement>('.to-left')
    if (toRight) {
      toRight.setAttribute('aria-label', this.t('transfer.toRight'))
      toRight.disabled = this.leftSelected.size === 0
    }
    if (toLeft) {
      toLeft.setAttribute('aria-label', this.t('transfer.toLeft'))
      toLeft.disabled = this.rightSelected.size === 0
    }
  }

  private titleFor(side: 'left' | 'right'): string {
    const key = side === 'left' ? 'source-title' : 'target-title'
    const own = this.getAttr(key, '')
    if (own) return own
    try {
      const titles = JSON.parse(this.getAttr('titles', ''))
      if (Array.isArray(titles) && titles.length === 2 && typeof titles[0] === 'string') {
        return side === 'left' ? titles[0] : titles[1]
      }
    } catch {
      // fallthrough
    }
    return this.t(side === 'left' ? 'transfer.source' : 'transfer.target')
  }

  private toggleSelectAll(side: 'left' | 'right', checked: boolean): void {
    const selected = side === 'left' ? this.leftSelected : this.rightSelected
    selected.clear()
    if (checked) {
      for (const item of this.sideItems(side)) {
        if (!item.disabled) selected.add(item.key)
      }
    }
    this.renderPanel(side)
  }

  private move(from: 'left' | 'right', to: 'left' | 'right'): void {
    const fromSel = from === 'left' ? this.leftSelected : this.rightSelected
    if (fromSel.size === 0) return
    const value = this.currentValue()
    const next = from === 'left' ? [...value] : value.filter((k) => !fromSel.has(k))
    if (from === 'left') {
      for (const item of this.sideItems('left')) {
        if (fromSel.has(item.key) && !next.includes(item.key)) next.push(item.key)
      }
    }
    fromSel.clear()
    this.setAttribute('value', JSON.stringify(next))
    this.emit('change', { value: next })
    this.renderPanels()
  }

  private handleKey(e: KeyboardEvent, side: 'left' | 'right'): void {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') return
    const items = this.sideItems(side).filter((i) => !i.disabled)
    if (items.length === 0) return
    e.preventDefault()
    const selected = side === 'left' ? this.leftSelected : this.rightSelected
    const activeKey = [...selected][0] ?? ''
    let idx = items.findIndex((i) => i.key === activeKey)
    if (e.key === 'ArrowDown') idx = Math.min(items.length - 1, idx + 1)
    else if (e.key === 'ArrowUp') idx = Math.max(0, idx - 1)
    const item = items[idx]
    if (!item) return
    if (e.key === 'Enter') {
      selected.clear()
      selected.add(item.key)
      this.move(side, side === 'left' ? 'right' : 'left')
      return
    }
    selected.clear()
    selected.add(item.key)
    this.renderPanel(side)
  }
}
