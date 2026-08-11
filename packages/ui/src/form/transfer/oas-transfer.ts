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
    return ['value', 'data', 'titles', 'source-title', 'target-title', 'searchable']
  }

  private _data: TransferItem[] = []
  private leftSelected = new Set<string>()
  private rightSelected = new Set<string>()
  private activeSide: 'left' | 'right' = 'left'
  private leftListbox: HTMLElement | null = null
  private rightListbox: HTMLElement | null = null
  /** 最近一次数据签名：数据变化时清空两侧选中态（与既有 setter 行为一致） */
  private lastDataKey = ''

  /**
   * data 同时支持 attribute 与 property 赋值（JSON attribute 声明式通道，参照 table/select 约定）：
   * Vue/React 模板渲染时 `data` 命中实例属性走 property 赋值，setter 单向反射到 attribute，
   * 经 attributeChangedCallback 走既有 parse/update 链路，attribute 为唯一权威数据源。
   */
  get data(): TransferItem[] {
    return [...this._data]
  }

  set data(value: TransferItem[] | string) {
    this.setAttribute('data', typeof value === 'string' ? value : JSON.stringify(value))
  }

  override connectedCallback(): void {
    super.connectedCallback()
    // 兼容 SSR/水合时序：元素升级前若 data 被赋成自有属性，会遮蔽原型 setter。
    // 回收自有属性进 attribute 通道（JSON），删除自有属性，保证 setter/update 统一解析。
    if (Object.prototype.hasOwnProperty.call(this, 'data') && Array.isArray(this.data)) {
      const own = this.data as TransferItem[]
      delete (this as Record<string, unknown>).data
      this.setAttribute('data', JSON.stringify(own))
    }
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
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
  }

  /** 缓存节点引用 + 绑定穿梭/全选/搜索/键盘事件（render 与水合路径共用） */
  private bind(): void {
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
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（两侧 listbox 与穿梭按钮存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.listbox.left')) return false
    if (!this.shadow.querySelector('.listbox.right')) return false
    if (!this.shadow.querySelector('.to-right')) return false
    if (!this.shadow.querySelector('.to-left')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.parseData()
    this.renderPanels()
  }

  /** 解析 data 数据通道（JSON attribute）：非法 JSON 容错为空数据，数据签名变化时清空选中态 */
  private parseData(): void {
    const raw = this.getAttribute('data')
    try {
      const parsed = raw == null ? null : JSON.parse(raw)
      this._data = Array.isArray(parsed)
        ? parsed.filter((i) => i && typeof i.key === 'string')
        : []
    } catch {
      this._data = []
    }
    const key = JSON.stringify(this._data)
    if (key !== this.lastDataKey) {
      this.lastDataKey = key
      this.leftSelected.clear()
      this.rightSelected.clear()
    }
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
