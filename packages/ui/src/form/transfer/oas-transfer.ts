// 注册 oas-virtual-list（OASVirtualList 仅作类型用，需裸 import 保住注册副作用）
import '../../data/virtual-list/index.js'
import type { OASVirtualList } from '../../data/virtual-list/index.js'
import { OASElement } from '@oas-ui/core'

export interface TransferItem {
  key: string
  label: string
  disabled?: boolean
}

/** 选项行样式（非虚拟模式渲染在 transfer 自身 shadow；虚拟模式需注入到 vlist shadow，两处共用） */
const OPTION_STYLE = `
.option {
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  font-size: var(--oas-font-size-md);
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
.option[aria-selected='true'][aria-disabled='true'] {
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
`

/** 虚拟模式注入 oas-virtual-list 的 shadow：选项行占满 item、整行可点 */
const VIRTUAL_ROW_STYLE = `
[part="item"] {
  display: flex;
  align-items: center;
}
[part="item"] .option {
  flex: 1;
  height: 100%;
  box-sizing: border-box;
}
${OPTION_STYLE}
`

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
.panel-head .select-all[hidden] {
  display: none;
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
.listbox[hidden] {
  display: none;
}
.oas-vlist {
  flex: 1;
  min-height: 0;
}
${OPTION_STYLE}
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
.actions button[hidden] {
  display: none;
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
    return [
      'value',
      'data',
      'titles',
      'source-title',
      'target-title',
      'searchable',
      'case-sensitive',
      'one-way',
      'virtual',
      'item-height',
    ]
  }

  private _data: TransferItem[] = []
  private leftSelected = new Set<string>()
  private rightSelected = new Set<string>()
  private activeSide: 'left' | 'right' = 'left'
  private leftListbox: HTMLElement | null = null
  private rightListbox: HTMLElement | null = null
  private virtualLeft: OASVirtualList | null = null
  private virtualRight: OASVirtualList | null = null
  /** 最近一次数据签名：数据变化时清空两侧选中态（与既有 setter 行为一致） */
  private lastDataKey = ''
  /** 各面板最近一次过滤词：过滤词变化时虚拟滚动回到顶部 */
  private lastQuery: Record<'left' | 'right', string> = { left: '', right: '' }

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
        <oas-virtual-list class="vlist vlist-left" part="virtual-list" hidden></oas-virtual-list>
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
        <oas-virtual-list class="vlist vlist-right" part="virtual-list" hidden></oas-virtual-list>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定穿梭/全选/搜索/虚拟列表/键盘事件（render 与水合路径共用） */
  private bind(): void {
    this.leftListbox = this.shadow.querySelector('.listbox.left')
    this.rightListbox = this.shadow.querySelector('.listbox.right')
    this.virtualLeft = this.shadow.querySelector<OASVirtualList>('.vlist-left')
    this.virtualRight = this.shadow.querySelector<OASVirtualList>('.vlist-right')

    this.shadow
      .querySelector('.to-right')
      ?.addEventListener('click', () => this.move('left', 'right'))
    this.shadow
      .querySelector('.to-left')
      ?.addEventListener('click', () => this.move('right', 'left'))

    this.shadow
      .querySelector<HTMLInputElement>('.check-left')
      ?.addEventListener('change', (e) =>
        this.toggleSelectAll('left', (e.target as HTMLInputElement).checked),
      )
    this.shadow
      .querySelector<HTMLInputElement>('.check-right')
      ?.addEventListener('change', (e) =>
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

    // 虚拟滚动：复用 oas-virtual-list 的窗口计算，把每个可见项渲染为选项行
    this.virtualLeft?.addEventListener(
      'oas-item',
      ((e: CustomEvent<{ index: number; item: TransferItem; element: HTMLElement }>) => {
        const d = e.detail
        if (d && d.item && d.element) this.createVirtualRow(d.item, d.element, 'left')
      }) as EventListener,
    )
    this.virtualRight?.addEventListener(
      'oas-item',
      ((e: CustomEvent<{ index: number; item: TransferItem; element: HTMLElement }>) => {
        const d = e.detail
        if (d && d.item && d.element) this.createVirtualRow(d.item, d.element, 'right')
      }) as EventListener,
    )
    // 键盘导航绑定在 vlist 视口（shadow 内），合成 keydown（composed=false）也能直达
    this.attachVirtualKey(this.virtualLeft, 'left')
    this.attachVirtualKey(this.virtualRight, 'right')
  }

  /** 虚拟列表键盘绑定：优先绑视口，视口缺失（理论不发生）回退绑 vlist 宿主 */
  private attachVirtualKey(vlist: OASVirtualList | null, side: 'left' | 'right'): void {
    if (!vlist) return
    const vp = vlist.shadowRoot?.querySelector<HTMLElement>('.viewport')
    const target = vp ?? vlist
    target.addEventListener('keydown', (e: KeyboardEvent) => this.handleKey(e, side))
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
      this._data = Array.isArray(parsed) ? parsed.filter((i) => i && typeof i.key === 'string') : []
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

  /**
   * 面板数据：
   * - 默认：value 中的 key 只出现在右侧，左侧为其余项
   * - one-way：左侧展示全部数据，已穿梭项标记 disabled（不可再选），右侧为已穿梭项（只读）
   */
  private sideItems(side: 'left' | 'right'): TransferItem[] {
    const value = this.currentValue()
    if (this.hasAttr('one-way')) {
      return side === 'left'
        ? this._data.map((i) =>
            value.includes(i.key) ? { ...i, disabled: true } : { ...i },
          )
        : this._data.filter((i) => value.includes(i.key))
    }
    return side === 'left'
      ? this._data.filter((i) => !value.includes(i.key))
      : this._data.filter((i) => value.includes(i.key))
  }

  /** 当前过滤词（case-sensitive 关闭时统一转小写） */
  private queryFor(side: 'left' | 'right'): string {
    const raw = this.shadow.querySelector<HTMLInputElement>(`.search-${side}`)?.value ?? ''
    return this.hasAttr('case-sensitive') ? raw : raw.toLowerCase()
  }

  /** 过滤后可见项（搜索 + 面板数据） */
  private visibleItems(side: 'left' | 'right'): TransferItem[] {
    const items = this.sideItems(side)
    const query = this.queryFor(side)
    if (query === '') return items
    const cs = this.hasAttr('case-sensitive')
    return items.filter((i) => {
      const label = cs ? i.label : i.label.toLowerCase()
      return label.includes(query)
    })
  }

  /** 虚拟滚动定高：默认 36（与 oas-virtual-list 默认一致，匹配选项行视觉高度） */
  private virtualItemHeight(): number {
    const raw = this.getAttr('item-height', '36')
    const n = Number.parseInt(raw, 10)
    return Number.isNaN(n) ? 36 : n
  }

  private renderPanels(): void {
    this.renderPanel('left')
    this.renderPanel('right')
  }

  private renderPanel(side: 'left' | 'right'): void {
    const listbox = side === 'left' ? this.leftListbox : this.rightListbox
    const query = this.queryFor(side)
    // 过滤词变化时虚拟滚动回到顶部，避免停留在旧列表的滚动位置
    if (query !== this.lastQuery[side]) {
      this.lastQuery[side] = query
      const vlist = side === 'left' ? this.virtualLeft : this.virtualRight
      const vp = vlist?.shadowRoot?.querySelector<HTMLElement>('.viewport')
      if (vp) vp.scrollTop = 0
    }
    const visible = this.visibleItems(side)

    // 虚拟滚动：大数据窗口化渲染；空态（含搜索无匹配）回落静态 listbox 显示空态文案
    if (this.hasAttr('virtual') && visible.length > 0 && this.renderVirtual(side, visible)) {
      return
    }
    this.setVirtualHidden(side)
    this.renderStatic(side, visible, listbox)
  }

  /** 切回非虚拟渲染：隐藏 vlist、显示 listbox */
  private setVirtualHidden(side: 'left' | 'right'): void {
    const vlist = side === 'left' ? this.virtualLeft : this.virtualRight
    if (vlist) vlist.hidden = true
    const listbox = side === 'left' ? this.leftListbox : this.rightListbox
    if (listbox) listbox.hidden = false
  }

  /**
   * 虚拟渲染：喂入可见项给 oas-virtual-list（窗口由 vlist 计算），
   * 每行经 oas-item 事件按 createVirtualRow 落定（选中/禁用/点击与静态模式一致）。
   */
  private renderVirtual(side: 'left' | 'right', visible: TransferItem[]): boolean {
    const vlist = side === 'left' ? this.virtualLeft : this.virtualRight
    if (!vlist) return false
    const listbox = side === 'left' ? this.leftListbox : this.rightListbox
    if (listbox) listbox.hidden = true
    vlist.hidden = false
    vlist.setAttribute('items-role', 'listbox')
    vlist.setAttribute('item-role', 'presentation')
    vlist.setAttribute('height', '220')
    vlist.setAttribute('item-height', String(this.virtualItemHeight()))
    this.injectVirtualStyle(vlist)
    vlist.items = visible
    this.syncPanelHead(side, visible)
    return true
  }

  /** 行样式注入 vlist shadow（虚拟行在 vlist shadow 内，transfer 自身样式够不到） */
  private injectVirtualStyle(vlist: OASVirtualList): void {
    const root = vlist.shadowRoot
    if (root && !root.querySelector('style[data-oas-transfer-rows]')) {
      const style = document.createElement('style')
      style.setAttribute('data-oas-transfer-rows', '')
      style.textContent = VIRTUAL_ROW_STYLE
      root.appendChild(style)
    }
  }

  /** 静态（非虚拟）面板渲染：选项行 + 空态 */
  private renderStatic(
    side: 'left' | 'right',
    visible: TransferItem[],
    listbox: HTMLElement | null,
  ): void {
    if (!listbox) return
    listbox.innerHTML = ''
    const query = this.queryFor(side)
    if (visible.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'empty'
      empty.textContent = query ? this.t('transfer.noMatch') : this.t('transfer.empty')
      listbox.appendChild(empty)
      this.syncPanelHead(side, visible)
      return
    }
    for (const item of visible) {
      const row = document.createElement('div')
      row.className = 'option'
      row.setAttribute('part', 'option')
      row.setAttribute('role', 'option')
      row.setAttribute('data-key', item.key)
      row.setAttribute('aria-selected', String(this.itemSelected(side, item)))
      row.setAttribute('aria-disabled', String(item.disabled ?? false))
      row.textContent = item.label
      row.addEventListener('click', () => this.toggleItem(side, item))
      listbox.appendChild(row)
    }
    this.syncPanelHead(side, visible)
  }

  /** 虚拟列表单行渲染：与静态模式同一套选中/禁用/点击语义 */
  private createVirtualRow(item: TransferItem, container: HTMLElement, side: 'left' | 'right'): void {
    const row = document.createElement('div')
    row.className = 'option'
    row.setAttribute('part', 'option')
    row.setAttribute('role', 'option')
    row.setAttribute('data-key', item.key)
    row.setAttribute('data-index', String(container.getAttribute('data-index') ?? ''))
    row.setAttribute('aria-selected', String(this.itemSelected(side, item)))
    row.setAttribute('aria-disabled', String(item.disabled ?? false))
    row.textContent = item.label
    row.addEventListener('click', () => this.toggleItem(side, item))
    container.appendChild(row)
  }

  /** 行选中语义：one-way 下左侧已穿梭项视为已选中（展示层） */
  private itemSelected(side: 'left' | 'right', item: TransferItem): boolean {
    const selected = side === 'left' ? this.leftSelected : this.rightSelected
    if (selected.has(item.key)) return true
    if (this.hasAttr('one-way') && side === 'left' && this.currentValue().includes(item.key)) {
      return true
    }
    return false
  }

  /**
   * 面板头同步（标题/全选 checkbox/搜索框/穿梭按钮）：
   * - one-way 右侧只读：隐藏全选、禁止选择
   * - 全选态只看「可见项中可选」项，保证过滤与全选语义一致
   */
  private syncPanelHead(side: 'left' | 'right', visible: TransferItem[]): void {
    // 标题
    const title = this.shadow.querySelector<HTMLElement>(
      `.title.${side === 'left' ? 'source' : 'target'}`,
    )
    if (title) title.textContent = this.titleFor(side)

    // 全选 checkbox
    const check = this.shadow.querySelector<HTMLInputElement>(`.check-${side}`)
    const readOnly = this.hasAttr('one-way') && side === 'right'
    const selectAllLabel = check?.closest<HTMLElement>('.select-all')
    if (selectAllLabel) selectAllLabel.hidden = readOnly
    if (check) {
      const selectable = visible.filter((i) => !i.disabled)
      check.checked = selectable.length > 0 && selectable.every((i) => this.itemSelected(side, i))
      check.disabled = readOnly || selectable.length === 0
      const span = this.shadow.querySelector<HTMLElement>(`.check-${side} + span`)
      if (span) span.textContent = this.t('transfer.selectAll')
    }

    // 搜索框
    const search = this.shadow.querySelector<HTMLInputElement>(`.search-${side}`)
    if (search) {
      search.hidden = !this.hasAttr('searchable')
      search.setAttribute('aria-label', this.t('transfer.search'))
    }

    // 穿梭按钮 aria-label / disabled（one-way 隐藏向左按钮）
    const toRight = this.shadow.querySelector<HTMLButtonElement>('.to-right')
    const toLeft = this.shadow.querySelector<HTMLButtonElement>('.to-left')
    if (toRight) {
      toRight.setAttribute('aria-label', this.t('transfer.toRight'))
      toRight.disabled = this.leftSelected.size === 0
    }
    if (toLeft) {
      toLeft.hidden = this.hasAttr('one-way')
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
    if (this.hasAttr('one-way') && side === 'right') return
    const selected = side === 'left' ? this.leftSelected : this.rightSelected
    selected.clear()
    if (checked) {
      for (const item of this.visibleItems(side)) {
        if (!item.disabled) selected.add(item.key)
      }
    }
    this.renderPanel(side)
  }

  /** 行点击切换选中（one-way 右侧只读、disabled 项不可点） */
  private toggleItem(side: 'left' | 'right', item: TransferItem): void {
    if (item.disabled) return
    if (this.hasAttr('one-way') && side === 'right') return
    const selected = side === 'left' ? this.leftSelected : this.rightSelected
    if (selected.has(item.key)) selected.delete(item.key)
    else selected.add(item.key)
    this.renderPanel(side)
  }

  private move(from: 'left' | 'right', to: 'left' | 'right'): void {
    if (this.hasAttr('one-way') && to === 'left') return
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
    if (this.hasAttr('one-way') && side === 'right') return
    const items = this.visibleItems(side).filter((i) => !i.disabled)
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
    this.scrollActiveIntoView(side)
  }

  /** 让当前选中项进入滚动可视区：虚拟模式改 vlist 视口 scrollTop，静态模式 scrollIntoView */
  private scrollActiveIntoView(side: 'left' | 'right'): void {
    const selected = side === 'left' ? this.leftSelected : this.rightSelected
    const activeKey = [...selected][0]
    if (!activeKey) return
    const items = this.visibleItems(side)
    const idx = items.findIndex((i) => i.key === activeKey)
    if (idx < 0) return

    const vlist = side === 'left' ? this.virtualLeft : this.virtualRight
    const vp = vlist?.shadowRoot?.querySelector<HTMLElement>('.viewport')
    if (vp && !vlist?.hidden) {
      const ih = this.virtualItemHeight()
      const top = idx * ih
      const vh = vp.clientHeight || 220
      const cur = vp.scrollTop
      if (top < cur) vp.scrollTop = Math.max(0, top)
      else if (top + ih > cur + vh) vp.scrollTop = Math.max(0, top + ih - vh)
      vp.dispatchEvent(new Event('scroll'))
      return
    }
    const listbox = side === 'left' ? this.leftListbox : this.rightListbox
    const rows = listbox?.querySelectorAll<HTMLElement>('.option[data-key]')
    const row = [...(rows ?? [])].find((r) => r.getAttribute('data-key') === activeKey)
    row?.scrollIntoView?.({ block: 'nearest' })
  }
}
