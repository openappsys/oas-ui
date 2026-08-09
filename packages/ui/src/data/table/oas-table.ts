import { OASElement } from '@oas-ui/core'
import { computeVirtualWindow } from '../virtual-list/oas-virtual-list.js'

export interface TableColumn {
  key: string
  title: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  /** 固定列：'left' | 'right'（配合 sticky 定位实现横向滚动时固定） */
  fixed?: 'left' | 'right'
  render?: (row: Record<string, unknown>) => string
  /** 合计：'sum' | 'avg' | 'count'（列级简单配置；复杂配置走表格级 summary 属性） */
  summary?: 'sum' | 'avg' | 'count'
}

export type SortOrder = '' | 'asc' | 'desc'

/** 合计类型：求和 / 平均 / 计数 */
export type SummaryType = 'sum' | 'avg' | 'count'

export interface SummaryConfig {
  key: string
  type: SummaryType
  /** 合计行首列展示的标签（不配置时用默认文案） */
  label?: string
}

interface ColumnOffset {
  fixed: 'left' | 'right'
  left?: number
  right?: number
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  overflow: hidden;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
}
.table-scroll {
  overflow: auto;
}
table {
  width: 100%;
  /* sticky 定位要求 border-collapse: separate */
  border-collapse: separate;
  border-spacing: 0;
}
th {
  text-align: left;
  padding: var(--oas-space-3) var(--oas-space-4);
  background: var(--oas-color-bg-hover);
  font-weight: 500;
  border-bottom: 1px solid var(--oas-color-border);
  white-space: nowrap;
  /* 表头吸顶 */
  position: sticky;
  top: 0;
  z-index: 2;
}
th.sortable {
  cursor: pointer;
  user-select: none;
}
th.sortable:hover {
  color: var(--oas-color-primary);
}
.sort-icon {
  display: inline-block;
  margin-left: var(--oas-space-1);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
th[data-order='asc'] .sort-icon { color: var(--oas-color-primary); }
th[data-order='desc'] .sort-icon { color: var(--oas-color-primary); }
/* 固定列：sticky 横向定位（left/right 由 JS 按列宽累加写入） */
th[data-fixed='left'], td[data-fixed='left'] {
  position: sticky;
  z-index: 1;
  background: var(--oas-color-bg);
}
th[data-fixed='left'], th[data-fixed='right'] {
  z-index: 3;
  background: var(--oas-color-bg-hover);
}
th[data-fixed='right'], td[data-fixed='right'] {
  position: sticky;
  z-index: 1;
  background: var(--oas-color-bg);
}
/* 斑马纹：奇数行浅底（hover/selected 规则在其后声明，自动覆盖） */
tr.row[data-stripe='odd'] td {
  background: var(--oas-color-bg-hover);
}
tr.row[data-stripe='odd'] td[data-fixed='left'],
tr.row[data-stripe='odd'] td[data-fixed='right'] {
  background: var(--oas-color-bg-hover);
}
tr.row[data-selected='true'] td[data-fixed='left'],
tr.row[data-selected='true'] td[data-fixed='right'] {
  background: var(--oas-color-primary-soft, rgba(24, 144, 255, 0.08));
}
td {
  padding: var(--oas-space-3) var(--oas-space-4);
  border-bottom: 1px solid var(--oas-color-border);
}
tr:last-child td {
  border-bottom: none;
}
/* 完整边框：单元格右/下描边成网格，四边由 :host 外框兜底 */
:host([bordered]) th,
:host([bordered]) td {
  border-right: 1px solid var(--oas-color-border);
  border-bottom: 1px solid var(--oas-color-border);
}
:host([bordered]) th:last-child,
:host([bordered]) td:last-child {
  border-right: none;
}
tr.row:hover td {
  background: var(--oas-color-bg-hover);
}
tr.row:hover td[data-fixed='left'],
tr.row:hover td[data-fixed='right'] {
  background: var(--oas-color-bg-hover);
}
tr.row[data-selected='true'] td {
  background: var(--oas-color-primary-soft, rgba(24, 144, 255, 0.08));
}
/* 虚拟滚动：占位行与定高行 */
.table-scroll[data-virtual='true'] td {
  padding-top: 0;
  padding-bottom: 0;
}
tr.spacer td {
  padding: 0;
  border-bottom: none;
}
.empty {
  padding: var(--oas-space-6);
  text-align: center;
  color: var(--oas-color-text-secondary);
}
.loading {
  padding: var(--oas-space-6);
  text-align: center;
  color: var(--oas-color-text-secondary);
}
.loading .spin {
  display: inline-block;
  width: var(--oas-control-height-sm);
  height: var(--oas-control-height-sm);
  margin-right: var(--oas-space-2);
  vertical-align: middle;
  border: 2px solid var(--oas-color-border);
  border-top-color: var(--oas-color-primary);
  border-radius: 50%;
  animation: oas-table-spin 0.8s linear infinite;
}
@keyframes oas-table-spin {
  to { transform: rotate(360deg); }
}
.check {
  accent-color: var(--oas-color-primary);
}
.check-cell {
  width: 40px;
  text-align: center;
}
.check-cell input {
  accent-color: var(--oas-color-primary);
}
td.align-center { text-align: center; }
td.align-right { text-align: right; }
/* 展开/收起按钮（树形 + 可展开行共用） */
.toggle {
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  padding: 0;
  line-height: 1;
  vertical-align: middle;
}
.toggle.open {
  transform: rotate(90deg);
}
td.expand-toggle-cell,
th.expand-toggle-cell {
  width: 40px;
  text-align: center;
}
/* 可展开行的内容行 */
tr.expand-row td {
  background: var(--oas-color-bg);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
/* 合计行（表尾） */
tr.summary td {
  background: var(--oas-color-bg-hover);
  font-weight: 600;
  border-top: 1px solid var(--oas-color-border);
}
tr.summary td[data-fixed='left'],
tr.summary td[data-fixed='right'] {
  background: var(--oas-color-bg-hover);
}
`

const CHECK_CELL_WIDTH = 40
const EXPAND_CELL_WIDTH = 40

export class OASTable extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'columns',
      'data',
      'sort-key',
      'sort-order',
      'row-key',
      'checkable',
      'loading',
      'height',
      'row-height',
      'stripe',
      'bordered',
      'expanded',
      'summary',
    ]
  }

  private _columns: TableColumn[] = []
  private _data: Array<Record<string, unknown>> = []
  private scrollRaf = 0
  /** 恢复 scrollTop 触发的下一次 scroll 事件需忽略，防止重入死循环 */
  private ignoreNextScroll = false
  private wrap: HTMLElement | null = null
  /** 是否可展开行（任一数据行存在非空 expand 字段） */
  private _expandable = false

  /**
   * data/columns 同时支持 attribute 与 property 赋值：
   * Vue/React 模板渲染时 `data`/`columns` 命中实例属性（class 字段），宿主框架会走 property
   * 赋值而非 setAttribute（此前 SPA 导航下表格无数据的根因）。setter 统一反射到 attribute，
   * 经 attributeChangedCallback 走既有 parse/update 链路，保持单一数据源。
   */
  get columns(): TableColumn[] {
    return this._columns
  }
  set columns(value: TableColumn[] | string) {
    this.setAttribute('columns', typeof value === 'string' ? value : JSON.stringify(value))
  }
  get data(): Array<Record<string, unknown>> {
    return this._data
  }
  set data(value: Array<Record<string, unknown>> | string) {
    this.setAttribute('data', typeof value === 'string' ? value : JSON.stringify(value))
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="table-scroll" part="scroll" tabindex="0">
        <table part="table">
          <thead part="head"></thead>
          <tbody part="body"></tbody>
        </table>
      </div>
    `
    this.wrap = this.shadow.querySelector('.table-scroll')
    this.shadow.querySelector('thead')?.addEventListener('click', (e) => {
      const th = (e.target as HTMLElement).closest('th.sortable')
      if (th) this.sortBy((th as HTMLElement).getAttribute('data-key') ?? '')
    })
    this.wrap?.addEventListener('scroll', this.handleScroll, { passive: true })
    this.onCleanup(() => {
      this.wrap?.removeEventListener('scroll', this.handleScroll)
      if (this.scrollRaf) cancelAnimationFrame(this.scrollRaf)
      this.scrollRaf = 0
    })
    this.update()
  }

  protected override update(): void {
    this.parse()
    const head = this.shadow.querySelector('thead')
    const body = this.shadow.querySelector('tbody')
    if (!head || !body) return

    const sortKey = this.getAttr('sort-key', '')
    const sortOrder = this.getAttr('sort-order', '') as SortOrder
    const rowKey = this.getAttr('row-key', 'key')
    const selected = this.getAttr('selected', '').split(',').filter(Boolean)
    const expanded = new Set(this.getAttr('expanded', '').split(',').filter(Boolean))

    const flat = this.buildFlat(sortKey, sortOrder, rowKey)
    const display = this.visibleFlat(flat, expanded, rowKey)
    const summaryConfigs = this.buildSummaryConfigs()

    const layout = this.computeLayout()
    const virtual = this.isVirtual()
    if (virtual) {
      this.wrap!.setAttribute('data-virtual', 'true')
      this.wrap!.style.maxHeight = `${this.tableHeight()}px`
    } else {
      this.wrap!.removeAttribute('data-virtual')
      this.wrap!.style.maxHeight = ''
    }

    const st = this.wrap ? this.wrap.scrollTop : 0
    head.innerHTML = ''
    body.innerHTML = ''

    const tr = document.createElement('tr')
    if (this.hasAttr('checkable')) {
      const th = document.createElement('th')
      th.className = 'check-cell'
      th.style.width = '40px'
      if (layout.hasFixed) {
        th.setAttribute('data-fixed', 'left')
        th.style.left = '0px'
      }
      const selectAll = document.createElement('input')
      selectAll.type = 'checkbox'
      selectAll.setAttribute('aria-label', this.t('table.selectAll'))
      selectAll.checked =
        flat.length > 0 && flat.every((f) => selected.includes(String(f.row[rowKey] ?? JSON.stringify(f.row))))
      selectAll.addEventListener('change', () => {
        const keys = flat.map((f) => String(f.row[rowKey] ?? JSON.stringify(f.row)))
        this.setAttribute('selected', selectAll.checked ? keys.join(',') : '')
        this.emit('check', { keys: selectAll.checked ? keys : [] })
        this.update()
      })
      th.appendChild(selectAll)
      tr.appendChild(th)
    }
    for (const col of this._columns) {
      const th = document.createElement('th')
      th.setAttribute('part', 'header')
      th.setAttribute('data-key', col.key)
      this.applyColumnOffset(th, col, layout)
      if (col.sortable) {
        th.className = 'sortable'
        th.setAttribute('data-order', col.key === sortKey ? sortOrder : '')
        th.innerHTML = `${col.title}<span class="sort-icon">${col.key === sortKey ? (sortOrder === 'asc' ? '↑' : sortOrder === 'desc' ? '↓' : '↕') : '↕'}</span>`
      } else {
        th.textContent = col.title
      }
      if (col.width) th.style.width = col.width
      tr.appendChild(th)
    }
    if (this._expandable) {
      const th = document.createElement('th')
      th.className = 'expand-toggle-cell'
      tr.appendChild(th)
    }
    head.appendChild(tr)

    if (this.hasAttr('loading')) {
      const loadingTr = document.createElement('tr')
      loadingTr.setAttribute('part', 'loading-row')
      const loadingTd = document.createElement('td')
      loadingTd.colSpan = this.columnCount()
      loadingTd.className = 'loading'
      const spin = document.createElement('span')
      spin.className = 'spin'
      loadingTd.append(spin, document.createTextNode(this.t('table.loading')))
      loadingTr.appendChild(loadingTd)
      body.appendChild(loadingTr)
      return
    }

    if (display.length === 0) {
      const emptyTr = document.createElement('tr')
      const emptyTd = document.createElement('td')
      emptyTd.colSpan = this.columnCount()
      emptyTd.className = 'empty'
      emptyTd.textContent = this.getAttr('empty-text', this.t('table.empty'))
      emptyTr.appendChild(emptyTd)
      body.appendChild(emptyTr)
      return
    }

    if (virtual) {
      this.renderVirtualBody(body, display, rowKey, selected, expanded, layout, st)
    } else {
      for (let i = 0; i < display.length; i++) {
        const f = display[i]!
        body.appendChild(
          f.kind === 'expand'
            ? this.buildExpandRow(f)
            : this.buildRow(f, i, rowKey, selected, expanded, layout),
        )
      }
    }

    if (summaryConfigs.length > 0 && flat.length > 0) {
      body.appendChild(this.buildSummaryRow(summaryConfigs, flat, layout))
    }
    // innerHTML 清空曾触发浏览器把 scrollTop 钳回 0；内容（含占位）已铺满后恢复原滚动位置
    if (this.wrap && this.wrap.scrollTop !== st) {
      this.ignoreNextScroll = true
      this.wrap.scrollTop = st
    }
  }

  /** 渲染一行数据（非虚拟模式逐行调用；虚拟模式仅窗口内行调用） */
  private buildRow(
    flat: FlatRow,
    index: number,
    rowKey: string,
    selected: string[],
    expanded: Set<string>,
    layout: { offsets: Map<string, ColumnOffset>; hasFixed: boolean },
  ): HTMLTableRowElement {
    const row = flat.row
    const tr = document.createElement('tr')
    tr.className = 'row'
    tr.setAttribute('part', 'row')
    const key = String(row[rowKey] ?? JSON.stringify(row))
    tr.setAttribute('data-selected', String(selected.includes(key)))
    if (this.hasAttr('stripe')) {
      tr.setAttribute('data-stripe', index % 2 === 1 ? 'odd' : 'even')
    }
    if (this.hasAttr('checkable')) {
      const td = document.createElement('td')
      td.className = 'check-cell'
      if (layout.hasFixed) {
        td.setAttribute('data-fixed', 'left')
        td.style.left = '0px'
      }
      const box = document.createElement('input')
      box.type = 'checkbox'
      box.setAttribute('aria-label', this.t('table.selectRow', { key }))
      box.checked = selected.includes(key)
      box.addEventListener('change', (e) => {
        e.stopPropagation()
        const next = new Set(selected)
        if (box.checked) next.add(key)
        else next.delete(key)
        this.setAttribute('selected', [...next].join(','))
        this.emit('check', { keys: [...next] })
        this.update()
      })
      td.appendChild(box)
      tr.appendChild(td)
    }
    tr.addEventListener('click', () => {
      if (this.hasAttr('checkable')) return
      const next = new Set(selected)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      this.setAttribute('selected', [...next].join(','))
      this.emit('row-click', { row, key })
      this.update()
    })
    const children = row.children
    const hasChildren = Array.isArray(children) && children.length > 0
    for (let i = 0; i < this._columns.length; i++) {
      const col = this._columns[i]!
      const td = document.createElement('td')
      this.applyColumnOffset(td, col, layout)
      if (col.align) td.className = `align-${col.align}`
      if (i === 0) {
        // 树形：按层级缩进
        if (hasChildren || flat.depth > 0) {
          td.style.paddingLeft = `${16 + flat.depth * 24}px`
        }
        // 树形：父行展开/收起按钮
        if (hasChildren) {
          const btn = document.createElement('button')
          btn.className = `toggle${expanded.has(key) ? ' open' : ''}`
          btn.setAttribute('aria-label', this.t('table.expand'))
          btn.setAttribute('aria-expanded', String(expanded.has(key)))
          btn.textContent = '›'
          btn.addEventListener('click', (e) => {
            e.stopPropagation()
            this.toggleExpand(key, !expanded.has(key))
          })
          td.appendChild(btn)
        }
      }
      const raw = row[col.key]
      const cell = col.render ? col.render(row) : String(raw ?? '')
      td.appendChild(document.createTextNode(cell))
      tr.appendChild(td)
    }
    if (this._expandable) {
      // 可展开行：行尾展开/收起按钮
      const td = document.createElement('td')
      td.className = 'expand-toggle-cell'
      if (typeof row.expand === 'string' && row.expand.length > 0) {
        const btn = document.createElement('button')
        btn.className = `toggle${expanded.has(key) ? ' open' : ''}`
        btn.setAttribute('aria-label', this.t('table.expand'))
        btn.setAttribute('aria-expanded', String(expanded.has(key)))
        btn.textContent = '›'
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          this.toggleExpand(key, !expanded.has(key))
        })
        td.appendChild(btn)
      }
      tr.appendChild(td)
    }
    return tr
  }

  /** 渲染可展开行的内容行（整行 colspan 展示自定义内容） */
  private buildExpandRow(flat: FlatRow): HTMLTableRowElement {
    const tr = document.createElement('tr')
    tr.className = 'expand-row'
    tr.setAttribute('part', 'expand-row')
    const td = document.createElement('td')
    td.colSpan = this.columnCount()
    td.innerHTML = flat.expandContent ?? ''
    tr.appendChild(td)
    return tr
  }

  /** 虚拟滚动：占位行 + 可见窗口行 */
  private renderVirtualBody(
    body: HTMLElement,
    display: FlatRow[],
    rowKey: string,
    selected: string[],
    expanded: Set<string>,
    layout: { offsets: Map<string, ColumnOffset>; hasFixed: boolean },
    scrollTop = this.wrap ? this.wrap.scrollTop : 0,
  ): void {
    const win = computeVirtualWindow(scrollTop, this.tableHeight(), this.rowHeight(), display.length)
    const colSpan = this.columnCount()

    const topSpacer = document.createElement('tr')
    topSpacer.className = 'spacer'
    const topTd = document.createElement('td')
    topTd.colSpan = colSpan
    topTd.style.height = `${win.start * this.rowHeight()}px`
    topSpacer.appendChild(topTd)
    body.appendChild(topSpacer)

    for (let i = win.start; i < win.end; i++) {
      const f = display[i]!
      const tr =
        f.kind === 'expand'
          ? this.buildExpandRow(f)
          : this.buildRow(f, i, rowKey, selected, expanded, layout)
      tr.style.height = `${this.rowHeight()}px`
      body.appendChild(tr)
    }

    const bottomSpacer = document.createElement('tr')
    bottomSpacer.className = 'spacer'
    const bottomTd = document.createElement('td')
    bottomTd.colSpan = colSpan
    bottomTd.style.height = `${(display.length - win.end) * this.rowHeight()}px`
    bottomSpacer.appendChild(bottomTd)
    body.appendChild(bottomSpacer)
  }

  /** 为 th/td 写入固定列 sticky 偏移（left/right） */
  private applyColumnOffset(
    cell: HTMLElement,
    col: TableColumn,
    layout: { offsets: Map<string, ColumnOffset>; hasFixed: boolean },
  ): void {
    const off = layout.offsets.get(col.key)
    if (!off) return
    cell.setAttribute('data-fixed', off.fixed)
    if (off.fixed === 'left') cell.style.left = `${off.left ?? 0}px`
    else cell.style.right = `${off.right ?? 0}px`
  }

  /** 计算各列 sticky 偏移（左侧从左累加、右侧从右累加） */
  private computeLayout(): { offsets: Map<string, ColumnOffset>; hasFixed: boolean } {
    const offsets = new Map<string, ColumnOffset>()
    const hasFixed = this._columns.some((c) => c.fixed)
    let leftAccum = 0
    if (hasFixed && this.hasAttr('checkable')) leftAccum = CHECK_CELL_WIDTH
    for (const col of this._columns) {
      if (col.fixed === 'left') {
        offsets.set(col.key, { fixed: 'left', left: leftAccum })
        leftAccum += columnWidth(col)
      }
    }
    let rightAccum = this._expandable ? EXPAND_CELL_WIDTH : 0
    for (let i = this._columns.length - 1; i >= 0; i--) {
      const col = this._columns[i]!
      if (col.fixed === 'right') {
        offsets.set(col.key, { fixed: 'right', right: rightAccum })
        rightAccum += columnWidth(col)
      }
    }
    return { offsets, hasFixed }
  }

  /** 排序比较器：数字按数值、其余按字符串 localeCompare（与既有 sortData 一致） */
  private compareRows(
    a: Record<string, unknown>,
    b: Record<string, unknown>,
    sortKey: string,
    sortOrder: SortOrder,
  ): number {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (typeof av === 'number' && typeof bv === 'number')
      return sortOrder === 'asc' ? av - bv : bv - av
    return sortOrder === 'asc'
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av))
  }

  /**
   * 构建扁平行列表（含树形 children 递归）。排序在各层级兄弟间独立进行，不破坏父子结构；
   * 返回的 flat 是完整列表（树形含隐藏子行），visibleFlat 再做可见性过滤。
   */
  private buildFlat(
    sortKey: string,
    sortOrder: SortOrder,
    rowKey: string,
  ): FlatRow[] {
    const flat: FlatRow[] = []
    const walk = (nodes: Array<Record<string, unknown>>, depth: number, parent?: string): void => {
      const list = [...nodes]
      if (sortKey && (sortOrder === 'asc' || sortOrder === 'desc')) {
        list.sort((a, b) => this.compareRows(a, b, sortKey, sortOrder))
      }
      for (const row of list) {
        flat.push({ row, depth, parent, kind: 'data' })
        const children = row.children
        if (Array.isArray(children) && children.length > 0) {
          walk(children, depth + 1, String(row[rowKey] ?? JSON.stringify(row)))
        }
      }
    }
    walk(this._data, 0)
    return flat
  }

  /**
   * 可见行列表：树形数据按 expanded（父行 key）过滤；可展开行的内容行紧随数据行。
   * 父行有 children 时优先展示子树（不叠加 expand 内容行）。
   */
  private visibleFlat(flat: FlatRow[], expanded: Set<string>, rowKey: string): FlatRow[] {
    const out: FlatRow[] = []
    for (const f of flat) {
      if (f.parent !== undefined && !expanded.has(f.parent)) continue
      out.push(f)
      const row = f.row
      const children = row.children
      const hasChildren = Array.isArray(children) && children.length > 0
      const key = String(row[rowKey] ?? JSON.stringify(row))
      if (
        !hasChildren &&
        expanded.has(key) &&
        typeof row.expand === 'string' &&
        row.expand.length > 0
      ) {
        out.push({ row, depth: f.depth, parent: f.parent, kind: 'expand', expandContent: row.expand })
      }
    }
    return out
  }

  /** 展开/收起某行（树形子行或可展开内容行共用），派发 oas-expand */
  private toggleExpand(key: string, expanded: boolean): void {
    const set = new Set(this.getAttr('expanded', '').split(',').filter(Boolean))
    if (expanded) set.add(key)
    else set.delete(key)
    this.setAttribute('expanded', [...set].join(','))
    this.emit('expand', { key, expanded })
    this.update()
  }

  /** 总列数（勾选列 + 数据列 + 可展开行尾列） */
  private columnCount(): number {
    return this._columns.length + (this.hasAttr('checkable') ? 1 : 0) + (this._expandable ? 1 : 0)
  }

  /** 汇总合计配置：表格级 summary 属性（JSON 数组）+ 列级 summary 字段 */
  private buildSummaryConfigs(): SummaryConfig[] {
    const configs: SummaryConfig[] = []
    const raw = this.getAttr('summary', '')
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && typeof item.key === 'string' && isSummaryType(item.type)) {
              configs.push({
                key: item.key,
                type: item.type,
                label: typeof item.label === 'string' && item.label ? item.label : undefined,
              })
            }
          }
        }
      } catch {
        /* 非法 JSON 忽略，回退列级配置 */
      }
    }
    for (const col of this._columns) {
      if (isSummaryType(col.summary) && !configs.some((c) => c.key === col.key)) {
        configs.push({ key: col.key, type: col.summary })
      }
    }
    return configs
  }

  /** 按类型计算各列聚合值（对完整扁平行计算，树形含隐藏子行，结果不随展开状态漂移） */
  private computeSummary(configs: SummaryConfig[], flat: FlatRow[]): Map<string, string> {
    const values = new Map<string, string>()
    for (const cfg of configs) {
      let sum = 0
      let cnt = 0
      for (const f of flat) {
        const v = f.row[cfg.key]
        if (cfg.type === 'count') {
          if (v !== undefined && v !== null && v !== '') cnt++
          continue
        }
        const n = typeof v === 'number' ? v : Number(v)
        if (Number.isFinite(n)) {
          sum += n
          cnt++
        }
      }
      if (cfg.type === 'sum') values.set(cfg.key, String(sum))
      else if (cfg.type === 'avg') values.set(cfg.key, String(cnt ? Math.round((sum / cnt) * 100) / 100 : 0))
      else values.set(cfg.key, String(cnt))
    }
    return values
  }

  /** 渲染合计行（表尾，紧随全部数据行之后） */
  private buildSummaryRow(
    configs: SummaryConfig[],
    flat: FlatRow[],
    layout: { offsets: Map<string, ColumnOffset>; hasFixed: boolean },
  ): HTMLTableRowElement {
    const tr = document.createElement('tr')
    tr.className = 'summary'
    tr.setAttribute('part', 'summary-row')
    const values = this.computeSummary(configs, flat)
    const label = configs.find((c) => c.label)?.label ?? this.t('table.summary')
    let labelPlaced = false
    if (this.hasAttr('checkable')) {
      const td = document.createElement('td')
      td.className = 'check-cell'
      tr.appendChild(td)
    }
    for (const col of this._columns) {
      const td = document.createElement('td')
      this.applyColumnOffset(td, col, layout)
      if (col.align) td.className = `align-${col.align}`
      const cfg = configs.find((c) => c.key === col.key)
      if (cfg) {
        td.textContent = values.get(cfg.key) ?? ''
      } else if (!labelPlaced) {
        // 首列（无聚合配置的列）放标签，其余空格
        td.textContent = label
        labelPlaced = true
      }
      tr.appendChild(td)
    }
    if (this._expandable) {
      const td = document.createElement('td')
      td.className = 'expand-toggle-cell'
      tr.appendChild(td)
    }
    return tr
  }

  private isVirtual(): boolean {
    return this.getAttr('height', '') !== ''
  }

  private tableHeight(): number {
    return Number(this.getAttr('height', '320')) || 320
  }

  private rowHeight(): number {
    return Number(this.getAttr('row-height', '40')) || 40
  }

  private sortBy(key: string): void {
    const currentKey = this.getAttr('sort-key', '')
    const currentOrder = this.getAttr('sort-order', '') as SortOrder
    let nextOrder: SortOrder = 'asc'
    if (currentKey === key) {
      nextOrder = currentOrder === 'asc' ? 'desc' : currentOrder === 'desc' ? '' : 'asc'
    }
    this.setAttribute('sort-key', nextOrder ? key : '')
    this.setAttribute('sort-order', nextOrder)
    this.emit('sort-change', { key, order: nextOrder })
    this.update()
  }

  private handleScroll = (): void => {
    if (this.ignoreNextScroll) {
      this.ignoreNextScroll = false
      return
    }
    if (!this.isVirtual() || !this.wrap) return
    if (this.scrollRaf) return
    this.scrollRaf = requestAnimationFrame(() => {
      this.scrollRaf = 0
      const body = this.shadow.querySelector('tbody')
      const head = this.shadow.querySelector('thead')
      if (!body || !head) return
      const st = this.wrap!.scrollTop
      const sortKey = this.getAttr('sort-key', '')
      const sortOrder = this.getAttr('sort-order', '') as SortOrder
      const rowKey = this.getAttr('row-key', 'key')
      const selected = this.getAttr('selected', '').split(',').filter(Boolean)
      const expanded = new Set(this.getAttr('expanded', '').split(',').filter(Boolean))
      const flat = this.buildFlat(sortKey, sortOrder, rowKey)
      const display = this.visibleFlat(flat, expanded, rowKey)
      body.innerHTML = ''
      this.renderVirtualBody(body, display, rowKey, selected, expanded, this.computeLayout(), st)
      // 清空曾把 scrollTop 钳回 0，内容铺满后恢复（窗口按 st 算，视觉不跳）
      if (this.wrap!.scrollTop !== st) {
        this.ignoreNextScroll = true
        this.wrap!.scrollTop = st
      }
      const win = computeVirtualWindow(st, this.tableHeight(), this.rowHeight(), display.length)
      this.emit('scroll', { scrollTop: st, start: win.start, end: win.end })
    })
  }

  private parse(): void {
    try {
      const cols = JSON.parse(this.getAttr('columns', '[]'))
      this._columns = Array.isArray(cols) ? cols.filter((c) => c && typeof c.key === 'string') : []
    } catch {
      this._columns = []
    }
    try {
      const rows = JSON.parse(this.getAttr('data', '[]'))
      this._data = Array.isArray(rows) ? rows.filter((r) => r && typeof r === 'object') : []
    } catch {
      this._data = []
    }
    // 任一（含嵌套 children）数据行存在非空 expand 字段 → 展示行尾展开列
    this._expandable = this._data.some((r) => rowHasExpand(r))
  }
}

/** 解析列宽（px 数字）；固定列未声明宽度时按 100px 兜底 */
function columnWidth(col: TableColumn): number {
  if (col.width) {
    const n = parseFloat(col.width)
    if (Number.isFinite(n)) return n
  }
  return 100
}

/** 行（含嵌套 children）是否存在非空 expand 内容 */
function rowHasExpand(row: Record<string, unknown>): boolean {
  if (typeof row.expand === 'string' && row.expand.length > 0) return true
  const children = row.children
  if (Array.isArray(children)) {
    return children.some(
      (c) => c && typeof c === 'object' && rowHasExpand(c as Record<string, unknown>),
    )
  }
  return false
}

/** 是否为合法合计类型 */
function isSummaryType(v: unknown): v is SummaryType {
  return v === 'sum' || v === 'avg' || v === 'count'
}

/** 扁平行：树形/可展开行统一渲染单位 */
interface FlatRow {
  row: Record<string, unknown>
  depth: number
  parent?: string
  kind: 'data' | 'expand'
  /** expand 类型行的自定义内容（来自 row.expand 字段） */
  expandContent?: string
}
