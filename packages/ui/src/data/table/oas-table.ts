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
}

export type SortOrder = '' | 'asc' | 'desc'

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
`

const CHECK_CELL_WIDTH = 40

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
    ]
  }

  private columns: TableColumn[] = []
  private data: Array<Record<string, unknown>> = []
  private scrollRaf = 0
  private wrap: HTMLElement | null = null

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

    const sorted = this.sortData(sortKey, sortOrder)

    const layout = this.computeLayout()
    const virtual = this.isVirtual()
    if (virtual) {
      this.wrap!.setAttribute('data-virtual', 'true')
      this.wrap!.style.maxHeight = `${this.height()}px`
    } else {
      this.wrap!.removeAttribute('data-virtual')
      this.wrap!.style.maxHeight = ''
    }

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
        sorted.length > 0 &&
        sorted.every((r) => selected.includes(String(r[rowKey] ?? JSON.stringify(r))))
      selectAll.addEventListener('change', () => {
        const keys = sorted.map((r) => String(r[rowKey] ?? JSON.stringify(r)))
        this.setAttribute('selected', selectAll.checked ? keys.join(',') : '')
        this.emit('check', { keys: selectAll.checked ? keys : [] })
        this.update()
      })
      th.appendChild(selectAll)
      tr.appendChild(th)
    }
    for (const col of this.columns) {
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
    head.appendChild(tr)

    if (this.hasAttr('loading')) {
      const loadingTr = document.createElement('tr')
      loadingTr.setAttribute('part', 'loading-row')
      const loadingTd = document.createElement('td')
      loadingTd.colSpan = this.columns.length + (this.hasAttr('checkable') ? 1 : 0)
      loadingTd.className = 'loading'
      const spin = document.createElement('span')
      spin.className = 'spin'
      loadingTd.append(spin, document.createTextNode(this.t('table.loading')))
      loadingTr.appendChild(loadingTd)
      body.appendChild(loadingTr)
      return
    }

    if (sorted.length === 0) {
      const emptyTr = document.createElement('tr')
      const emptyTd = document.createElement('td')
      emptyTd.colSpan = this.columns.length + (this.hasAttr('checkable') ? 1 : 0)
      emptyTd.className = 'empty'
      emptyTd.textContent = this.getAttr('empty-text', this.t('table.empty'))
      emptyTr.appendChild(emptyTd)
      body.appendChild(emptyTr)
      return
    }

    if (virtual) {
      this.renderVirtualBody(body, sorted, rowKey, selected, layout)
    } else {
      for (const row of sorted) {
        body.appendChild(this.buildRow(row, rowKey, selected, layout))
      }
    }
  }

  /** 渲染一行数据（非虚拟模式逐行调用；虚拟模式仅窗口内行调用） */
  private buildRow(
    row: Record<string, unknown>,
    rowKey: string,
    selected: string[],
    layout: { offsets: Map<string, ColumnOffset>; hasFixed: boolean },
  ): HTMLTableRowElement {
    const tr = document.createElement('tr')
    tr.className = 'row'
    tr.setAttribute('part', 'row')
    const key = String(row[rowKey] ?? JSON.stringify(row))
    tr.setAttribute('data-selected', String(selected.includes(key)))
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
    for (const col of this.columns) {
      const td = document.createElement('td')
      this.applyColumnOffset(td, col, layout)
      if (col.align) td.className = `align-${col.align}`
      const raw = row[col.key]
      const cell = col.render ? col.render(row) : String(raw ?? '')
      td.textContent = cell
      tr.appendChild(td)
    }
    return tr
  }

  /** 虚拟滚动：占位行 + 可见窗口行 */
  private renderVirtualBody(
    body: HTMLElement,
    sorted: Array<Record<string, unknown>>,
    rowKey: string,
    selected: string[],
    layout: { offsets: Map<string, ColumnOffset>; hasFixed: boolean },
  ): void {
    const scrollTop = this.wrap ? this.wrap.scrollTop : 0
    const win = computeVirtualWindow(scrollTop, this.height(), this.rowHeight(), sorted.length)
    const colSpan = this.columns.length + (this.hasAttr('checkable') ? 1 : 0)

    const topSpacer = document.createElement('tr')
    topSpacer.className = 'spacer'
    const topTd = document.createElement('td')
    topTd.colSpan = colSpan
    topTd.style.height = `${win.start * this.rowHeight()}px`
    topSpacer.appendChild(topTd)
    body.appendChild(topSpacer)

    for (let i = win.start; i < win.end; i++) {
      const row = sorted[i]!
      const tr = this.buildRow(row, rowKey, selected, layout)
      tr.style.height = `${this.rowHeight()}px`
      body.appendChild(tr)
    }

    const bottomSpacer = document.createElement('tr')
    bottomSpacer.className = 'spacer'
    const bottomTd = document.createElement('td')
    bottomTd.colSpan = colSpan
    bottomTd.style.height = `${(sorted.length - win.end) * this.rowHeight()}px`
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
    const hasFixed = this.columns.some((c) => c.fixed)
    let leftAccum = 0
    if (hasFixed && this.hasAttr('checkable')) leftAccum = CHECK_CELL_WIDTH
    for (const col of this.columns) {
      if (col.fixed === 'left') {
        offsets.set(col.key, { fixed: 'left', left: leftAccum })
        leftAccum += columnWidth(col)
      }
    }
    let rightAccum = 0
    for (let i = this.columns.length - 1; i >= 0; i--) {
      const col = this.columns[i]!
      if (col.fixed === 'right') {
        offsets.set(col.key, { fixed: 'right', right: rightAccum })
        rightAccum += columnWidth(col)
      }
    }
    return { offsets, hasFixed }
  }

  private sortData(sortKey: string, sortOrder: SortOrder): Array<Record<string, unknown>> {
    const sorted = [...this.data]
    if (sortKey && (sortOrder === 'asc' || sortOrder === 'desc')) {
      sorted.sort((a, b) => {
        const av = a[sortKey]
        const bv = b[sortKey]
        if (typeof av === 'number' && typeof bv === 'number')
          return sortOrder === 'asc' ? av - bv : bv - av
        return sortOrder === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av))
      })
    }
    return sorted
  }

  private isVirtual(): boolean {
    return this.getAttr('height', '') !== ''
  }

  private height(): number {
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
    if (!this.isVirtual() || !this.wrap) return
    if (this.scrollRaf) return
    this.scrollRaf = requestAnimationFrame(() => {
      this.scrollRaf = 0
      const body = this.shadow.querySelector('tbody')
      const head = this.shadow.querySelector('thead')
      if (!body || !head) return
      const sortKey = this.getAttr('sort-key', '')
      const sortOrder = this.getAttr('sort-order', '') as SortOrder
      const rowKey = this.getAttr('row-key', 'key')
      const selected = this.getAttr('selected', '').split(',').filter(Boolean)
      const sorted = this.sortData(sortKey, sortOrder)
      body.innerHTML = ''
      this.renderVirtualBody(body, sorted, rowKey, selected, this.computeLayout())
      const win = computeVirtualWindow(
        this.wrap!.scrollTop,
        this.height(),
        this.rowHeight(),
        sorted.length,
      )
      this.emit('scroll', { scrollTop: this.wrap!.scrollTop, start: win.start, end: win.end })
    })
  }

  private parse(): void {
    try {
      const cols = JSON.parse(this.getAttr('columns', '[]'))
      this.columns = Array.isArray(cols) ? cols.filter((c) => c && typeof c.key === 'string') : []
    } catch {
      this.columns = []
    }
    try {
      const rows = JSON.parse(this.getAttr('data', '[]'))
      this.data = Array.isArray(rows) ? rows.filter((r) => r && typeof r === 'object') : []
    } catch {
      this.data = []
    }
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
