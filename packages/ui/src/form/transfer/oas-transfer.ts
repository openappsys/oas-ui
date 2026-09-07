// 注册 oas-virtual-list（OASVirtualList 仅作类型用，需裸 import 保住注册副作用）
import '../../data/virtual-list/index.js'
import type { OASVirtualList } from '../../data/virtual-list/index.js'
import { OASElement } from '@oas-ui/core'
// 注册 oas-icon（穿梭按钮内嵌 oas-icon 组件，复用图标集/自定义注册/currentColor 着色）
import '../../basic/icon/index.js'

export interface TransferItem {
  key: string
  label: string
  disabled?: boolean
}

export type TargetSortMode = 'original' | 'push' | 'unshift'

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
/* 目标侧拖拽排序：拖拽光标与落点指示线 */
.option[draggable='true'] {
  cursor: grab;
}
.option.drop-before {
  box-shadow: inset 0 2px 0 0 var(--oas-color-primary);
}
.option.drop-after {
  box-shadow: inset 0 -2px 0 0 var(--oas-color-primary);
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
:host([data-disabled]) {
  opacity: 0.6;
}
:host([data-disabled]) .panel {
  cursor: not-allowed;
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
.panel-head .head-extra {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-2);
}
.panel-head .count {
  font-size: var(--oas-font-size-xs);
  font-weight: 400;
  color: var(--oas-color-text-secondary);
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
.actions[hidden] {
  display: none;
}
.actions button {
  appearance: none;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
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
      'disabled',
      'disabled-skip',
      'target-sort',
      'simple',
      'target-draggable',
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
  /** 各面板最近一次活跃项（方向键导航/选中建立）：Space 切换在取消选中后仍可找回活跃项 */
  private lastActiveKey: Record<'left' | 'right', string> = { left: '', right: '' }
  /** 目标侧拖拽中的 key（HTML5 DnD；drop 时按 key 定位重排，不受虚拟窗口影响） */
  private dragKey: string | null = null

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
          <span class="head-extra">
            <span class="count count-left"></span>
            <label class="select-all">
              <input type="checkbox" class="check-left" />
              <span></span>
            </label>
          </span>
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
          <span class="head-extra">
            <span class="count count-right"></span>
            <label class="select-all">
              <input type="checkbox" class="check-right" />
              <span></span>
            </label>
          </span>
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
      ?.addEventListener('input', (e) => {
        this.renderPanel('left')
        this.emit('search', { side: 'left', query: (e.target as HTMLInputElement).value })
      })
    this.shadow
      .querySelector<HTMLInputElement>('.search-right')
      ?.addEventListener('input', (e) => {
        this.renderPanel('right')
        this.emit('search', { side: 'right', query: (e.target as HTMLInputElement).value })
      })

    this.leftListbox?.addEventListener('keydown', (e: KeyboardEvent) => this.handleKey(e, 'left'))
    this.rightListbox?.addEventListener('keydown', (e: KeyboardEvent) => this.handleKey(e, 'right'))

    // 虚拟滚动：复用 oas-virtual-list 的窗口计算，把每个可见项渲染为选项行
    this.virtualLeft?.addEventListener('oas-item', ((
      e: CustomEvent<{ index: number; item: TransferItem; element: HTMLElement }>,
    ) => {
      const d = e.detail
      if (d && d.item && d.element) this.createVirtualRow(d.item, d.element, 'left')
    }) as EventListener)
    this.virtualRight?.addEventListener('oas-item', ((
      e: CustomEvent<{ index: number; item: TransferItem; element: HTMLElement }>,
    ) => {
      const d = e.detail
      if (d && d.item && d.element) this.createVirtualRow(d.item, d.element, 'right')
    }) as EventListener)
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
    // 禁用态镜像宿主 data-disabled（覆盖注入场景，供 :host([data-disabled]) 样式消费）
    this.toggleAttribute('data-disabled', this.injectDisabled())
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

  /** 目标顺序策略：original（默认，按数据源序）/ push（追加尾部）/ unshift（插入头部） */
  private targetSortMode(): TargetSortMode {
    const v = this.getAttr('target-sort', 'original')
    return v === 'push' || v === 'unshift' ? v : 'original'
  }

  /**
   * 面板数据：
   * - 默认：value 中的 key 只出现在右侧，左侧为其余项
   * - one-way：左侧展示全部数据，已穿梭项标记 disabled（不可再选），右侧为已穿梭项（只读）
   * - 右侧顺序：original 按数据源序；push/unshift 按 value 数组序（新增项位置由策略决定）
   */
  private sideItems(side: 'left' | 'right'): TransferItem[] {
    const value = this.currentValue()
    if (this.hasAttr('one-way')) {
      return side === 'left'
        ? this._data.map((i) => (value.includes(i.key) ? { ...i, disabled: true } : { ...i }))
        : this.rightItemsBySort(value)
    }
    return side === 'left'
      ? this._data.filter((i) => !value.includes(i.key))
      : this.rightItemsBySort(value)
  }

  private rightItemsBySort(value: string[]): TransferItem[] {
    if (this.targetSortMode() === 'original') {
      return this._data.filter((i) => value.includes(i.key))
    }
    const map = new Map(this._data.map((i) => [i.key, i] as const))
    const out: TransferItem[] = []
    for (const k of value) {
      const it = map.get(k)
      if (it) out.push(it)
    }
    return out
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

  /** 行内容：template[slot="item"] 克隆（[data-item-label] 绑定选项文本），缺省回落纯文本 */
  private fillRowContent(row: HTMLElement, item: TransferItem): void {
    const tpl = this.querySelector('template[slot="item"]')
    if (tpl instanceof HTMLTemplateElement) {
      row.appendChild(tpl.content.cloneNode(true))
      const binder = row.querySelector('[data-item-label]')
      if (binder) binder.textContent = item.label
    } else {
      row.textContent = item.label
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
      const tpl = this.querySelector('template[slot="empty"]')
      if (tpl instanceof HTMLTemplateElement) {
        // 空态插槽（真空态与无匹配态共用，双侧共用）
        empty.appendChild(tpl.content.cloneNode(true))
      } else {
        empty.textContent = query ? this.t('transfer.noMatch') : this.t('transfer.empty')
      }
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
      row.setAttribute('aria-disabled', String(item.disabled === true || this.injectDisabled()))
      this.fillRowContent(row, item)
      row.addEventListener('click', () => this.toggleItem(side, item))
      this.attachDrag(row, side, item)
      listbox.appendChild(row)
    }
    this.syncPanelHead(side, visible)
  }

  /** 虚拟列表单行渲染：与静态模式同一套选中/禁用/点击语义 */
  private createVirtualRow(
    item: TransferItem,
    container: HTMLElement,
    side: 'left' | 'right',
  ): void {
    const row = document.createElement('div')
    row.className = 'option'
    row.setAttribute('part', 'option')
    row.setAttribute('role', 'option')
    row.setAttribute('data-key', item.key)
    row.setAttribute('data-index', String(container.getAttribute('data-index') ?? ''))
    row.setAttribute('aria-selected', String(this.itemSelected(side, item)))
    row.setAttribute('aria-disabled', String(item.disabled === true || this.injectDisabled()))
    this.fillRowContent(row, item)
    row.addEventListener('click', () => this.toggleItem(side, item))
    this.attachDrag(row, side, item)
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
   * 面板头同步（标题/计数/全选 checkbox/搜索框/穿梭按钮）：
   * - one-way 右侧只读：隐藏全选与计数、禁止选择
   * - simple 模式：隐藏中央穿梭按钮（点选即穿梭）
   * - 全选态只看「可见项中可选」项，保证过滤与全选语义一致
   */
  private syncPanelHead(side: 'left' | 'right', visible: TransferItem[]): void {
    const disabled = this.injectDisabled()
    const readOnly = this.hasAttr('one-way') && side === 'right'

    // 标题
    const title = this.shadow.querySelector<HTMLElement>(
      `.title.${side === 'left' ? 'source' : 'target'}`,
    )
    if (title) title.textContent = this.titleFor(side)

    // 计数（已选/可见 N/M，i18n 模板；只读面板隐藏）
    const count = this.shadow.querySelector<HTMLElement>(`.count-${side}`)
    if (count) {
      count.hidden = readOnly
      const selectedCount = visible.filter((i) => this.itemSelected(side, i)).length
      count.textContent = this.countText(selectedCount, visible.length)
    }

    // 全选 checkbox
    const check = this.shadow.querySelector<HTMLInputElement>(`.check-${side}`)
    const selectAllLabel = check?.closest<HTMLElement>('.select-all')
    if (selectAllLabel) selectAllLabel.hidden = readOnly
    if (check) {
      const selectable = visible.filter((i) => !i.disabled)
      check.checked = selectable.length > 0 && selectable.every((i) => this.itemSelected(side, i))
      check.disabled = readOnly || disabled || selectable.length === 0
      const span = this.shadow.querySelector<HTMLElement>(`.check-${side} + span`)
      if (span) span.textContent = this.t('transfer.selectAll')
    }

    // 搜索框
    const search = this.shadow.querySelector<HTMLInputElement>(`.search-${side}`)
    if (search) {
      search.hidden = !this.hasAttr('searchable')
      search.disabled = disabled
      search.setAttribute('aria-label', this.t('transfer.search'))
    }

    // 穿梭按钮 aria-label / disabled（one-way 隐藏向左按钮；simple 隐藏整组按钮）
    const actions = this.shadow.querySelector<HTMLElement>('.actions')
    if (actions) actions.hidden = this.hasAttr('simple')
    const toRight = this.shadow.querySelector<HTMLButtonElement>('.to-right')
    const toLeft = this.shadow.querySelector<HTMLButtonElement>('.to-left')
    if (toRight) {
      toRight.setAttribute('aria-label', this.t('transfer.toRight'))
      toRight.disabled = disabled || this.leftSelected.size === 0
      toRight.innerHTML = '<oas-icon name="arrow-right"></oas-icon>'
    }
    if (toLeft) {
      toLeft.hidden = this.hasAttr('one-way')
      toLeft.setAttribute('aria-label', this.t('transfer.toLeft'))
      toLeft.disabled = disabled || this.rightSelected.size === 0
      toLeft.innerHTML = '<oas-icon name="arrow-left"></oas-icon>'
    }
  }

  /** 面板头计数文案：i18n 模板（key 落地前数字格式兜底，落地后由模板接管） */
  private countText(selected: number, total: number): string {
    const text = this.t('transfer.count', { selected, total })
    return text === 'transfer.count' ? `${selected}/${total}` : text
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

  private emitSelectChange(side: 'left' | 'right'): void {
    const selected = side === 'left' ? this.leftSelected : this.rightSelected
    this.emit('select-change', { side, selected: [...selected] })
  }

  private toggleSelectAll(side: 'left' | 'right', checked: boolean): void {
    if (this.injectDisabled()) return
    if (this.hasAttr('one-way') && side === 'right') return
    const selected = side === 'left' ? this.leftSelected : this.rightSelected
    selected.clear()
    if (checked) {
      for (const item of this.visibleItems(side)) {
        if (!item.disabled) selected.add(item.key)
      }
    }
    this.renderPanel(side)
    this.emitSelectChange(side)
  }

  /** 行点击切换选中（one-way 右侧只读、disabled 项不可点）；simple 模式点选即穿梭 */
  private toggleItem(side: 'left' | 'right', item: TransferItem): void {
    if (this.injectDisabled()) return
    if (item.disabled) return
    if (this.hasAttr('one-way') && side === 'right') return
    if (this.hasAttr('simple')) {
      const value = this.currentValue()
      const next =
        side === 'left'
          ? this.mergeIntoTarget(value, [item.key])
          : value.filter((k) => k !== item.key)
      this.setAttribute('value', JSON.stringify(next))
      this.emit('change', { value: next })
      this.renderPanels()
      return
    }
    const selected = side === 'left' ? this.leftSelected : this.rightSelected
    if (selected.has(item.key)) selected.delete(item.key)
    else {
      selected.add(item.key)
      this.lastActiveKey[side] = item.key
    }
    this.renderPanel(side)
    this.emitSelectChange(side)
  }

  /** 左→右并入目标：original 按 data 序取并集；push 追加尾部；unshift 依次插头部 */
  private mergeIntoTarget(value: string[], moved: string[]): string[] {
    const mode = this.targetSortMode()
    const existing = value.filter((k) => !moved.includes(k))
    if (mode === 'push') return [...existing, ...moved]
    if (mode === 'unshift') return [...[...moved].reverse(), ...existing]
    const union = new Set([...value, ...moved])
    return this._data.filter((i) => union.has(i.key)).map((i) => i.key)
  }

  private move(from: 'left' | 'right', to: 'left' | 'right'): void {
    if (this.injectDisabled()) return
    if (this.hasAttr('one-way') && to === 'left') return
    const fromSel = from === 'left' ? this.leftSelected : this.rightSelected
    if (fromSel.size === 0) return
    const value = this.currentValue()
    let next: string[]
    if (from === 'left') {
      // moved 按 data 序收集（可见项内的选中集）
      const moved: string[] = []
      for (const item of this.sideItems('left')) {
        if (fromSel.has(item.key) && !value.includes(item.key)) moved.push(item.key)
      }
      next = this.mergeIntoTarget(value, moved)
    } else {
      next = value.filter((k) => !fromSel.has(k))
    }
    fromSel.clear()
    this.setAttribute('value', JSON.stringify(next))
    this.emit('change', { value: next })
    this.renderPanels()
  }

  /** 目标侧拖拽排序是否可用：需 target-draggable 且非禁用/单向只读，且顺序策略允许自定义排序 */
  private dragEnabled(): boolean {
    return (
      this.hasAttr('target-draggable') &&
      !this.injectDisabled() &&
      !this.hasAttr('one-way') &&
      this.targetSortMode() !== 'original'
    )
  }

  /** 目标侧行拖拽排序（data-key 定位，虚拟窗口平移不影响 key 语义） */
  private attachDrag(row: HTMLElement, side: 'left' | 'right', item: TransferItem): void {
    if (side !== 'right' || !this.dragEnabled()) return
    row.setAttribute('draggable', 'true')
    row.addEventListener('dragstart', (e: DragEvent) => {
      if (!this.dragEnabled()) {
        e.preventDefault()
        return
      }
      this.dragKey = item.key
      e.dataTransfer?.setData('text/plain', item.key)
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
    })
    row.addEventListener('dragover', (e: DragEvent) => {
      if (!this.dragEnabled() || !this.dragKey || this.dragKey === item.key) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
      const rect = row.getBoundingClientRect()
      const before = e.clientY < rect.top + rect.height / 2
      row.classList.toggle('drop-before', before)
      row.classList.toggle('drop-after', !before)
    })
    row.addEventListener('dragleave', () => {
      row.classList.remove('drop-before', 'drop-after')
    })
    row.addEventListener('drop', (e: DragEvent) => {
      row.classList.remove('drop-before', 'drop-after')
      if (!this.dragEnabled() || !this.dragKey) return
      e.preventDefault()
      const key = e.dataTransfer?.getData('text/plain') || this.dragKey
      this.dragKey = null
      if (!key || key === item.key) return
      const rect = row.getBoundingClientRect()
      const before = e.clientY < rect.top + rect.height / 2
      this.dropReorder(key, item.key, before)
    })
    row.addEventListener('dragend', () => {
      this.dragKey = null
      row.classList.remove('drop-before', 'drop-after')
    })
  }

  /** 重排 value：把 fromKey 移到 targetKey 之前/之后，派发 oas-change */
  private dropReorder(fromKey: string, targetKey: string, before: boolean): void {
    const value = this.currentValue()
    if (!value.includes(fromKey) || !value.includes(targetKey)) return
    const next = value.filter((k) => k !== fromKey)
    const ti = next.indexOf(targetKey)
    next.splice(before ? ti : ti + 1, 0, fromKey)
    this.setAttribute('value', JSON.stringify(next))
    this.emit('change', { value: next })
    this.renderPanels()
  }

  /** 键盘排序（拖拽的无障碍替代）：Alt+↑/↓ 移动右侧当前选中项 */
  private sortActive(delta: 1 | -1): void {
    const activeKey = [...this.rightSelected][0]
    if (!activeKey) return
    const value = this.currentValue()
    const idx = value.indexOf(activeKey)
    if (idx < 0) return
    const to = idx + delta
    if (to < 0 || to >= value.length) return
    const next = [...value]
    next.splice(idx, 1)
    next.splice(to, 0, activeKey)
    this.setAttribute('value', JSON.stringify(next))
    this.emit('change', { value: next })
    this.renderPanels()
  }

  private handleKey(e: KeyboardEvent, side: 'left' | 'right'): void {
    if (this.injectDisabled()) return
    // Alt+↑/↓：目标侧排序的键盘替代（不占用普通方向键的选中导航）
    if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      if (side === 'right' && this.dragEnabled()) {
        e.preventDefault()
        this.sortActive(e.key === 'ArrowDown' ? 1 : -1)
      }
      return
    }
    if (this.hasAttr('one-way') && side === 'right') return
    // ctrl+A / cmd+A：全选/全清当前面板可见可选项
    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
      const items = this.visibleItems(side).filter((i) => !i.disabled)
      if (items.length === 0) return
      e.preventDefault()
      const selected = side === 'left' ? this.leftSelected : this.rightSelected
      const all = items.every((i) => selected.has(i.key))
      selected.clear()
      if (!all) for (const i of items) selected.add(i.key)
      this.renderPanel(side)
      this.emitSelectChange(side)
      return
    }
    // Space：切换当前选中项（对齐 checkbox 直觉；取消后仍可凭最近活跃项再选回）
    if (e.key === ' ') {
      const selected = side === 'left' ? this.leftSelected : this.rightSelected
      const activeKey = [...selected][0] ?? this.lastActiveKey[side]
      if (!activeKey) return
      const item = this.visibleItems(side).find((i) => i.key === activeKey && !i.disabled)
      if (!item) return
      e.preventDefault()
      this.toggleItem(side, item)
      return
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') return
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
    this.lastActiveKey[side] = item.key
    this.renderPanel(side)
    this.emitSelectChange(side)
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
