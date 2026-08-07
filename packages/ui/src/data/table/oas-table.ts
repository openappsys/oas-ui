import { OASElement } from '@oas-ui/core'

export interface TableColumn {
  key: string
  title: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (row: Record<string, unknown>) => string
}

export type SortOrder = '' | 'asc' | 'desc'

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
table {
  width: 100%;
  border-collapse: collapse;
}
th {
  text-align: left;
  padding: var(--oas-space-3) var(--oas-space-4);
  background: var(--oas-color-bg-hover);
  font-weight: 500;
  border-bottom: 1px solid var(--oas-color-border);
  white-space: nowrap;
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
tr.row[data-selected='true'] td {
  background: var(--oas-color-primary-soft, rgba(24, 144, 255, 0.08));
}
.empty {
  padding: var(--oas-space-6);
  text-align: center;
  color: var(--oas-color-text-secondary);
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

export class OASTable extends OASElement {
  static override get observedAttributes(): string[] {
    return ['columns', 'data', 'sort-key', 'sort-order', 'row-key', 'checkable']
  }

  private columns: TableColumn[] = []
  private data: Array<Record<string, unknown>> = []

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <table part="table">
        <thead part="head"></thead>
        <tbody part="body"></tbody>
      </table>
    `
    this.shadow.querySelector('thead')?.addEventListener('click', (e) => {
      const th = (e.target as HTMLElement).closest('th.sortable')
      if (th) this.sortBy((th as HTMLElement).getAttribute('data-key') ?? '')
    })
    this.update()
  }

  protected override update(): void {
    this.parse()
    const head = this.shadow.querySelector('thead')
    const body = this.shadow.querySelector('tbody')
    if (!head || !body) return
    head.innerHTML = ''
    body.innerHTML = ''

    const sortKey = this.getAttr('sort-key', '')
    const sortOrder = this.getAttr('sort-order', '') as SortOrder
    const rowKey = this.getAttr('row-key', 'key')
    const selected = this.getAttr('selected', '').split(',').filter(Boolean)

    let sorted = [...this.data]
    if (sortKey && (sortOrder === 'asc' || sortOrder === 'desc')) {
      sorted.sort((a, b) => {
        const av = a[sortKey]
        const bv = b[sortKey]
        if (typeof av === 'number' && typeof bv === 'number') return sortOrder === 'asc' ? av - bv : bv - av
        return sortOrder === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av))
      })
    }

    const tr = document.createElement('tr')
    if (this.hasAttr('checkable')) {
      const th = document.createElement('th')
      th.className = 'check-cell'
      th.style.width = '40px'
      const selectAll = document.createElement('input')
      selectAll.type = 'checkbox'
      selectAll.setAttribute('aria-label', '全选')
      selectAll.checked = sorted.length > 0 && sorted.every((r) => selected.includes(String(r[rowKey] ?? JSON.stringify(r))))
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

    if (sorted.length === 0) {
      const emptyTr = document.createElement('tr')
      const emptyTd = document.createElement('td')
      emptyTd.colSpan = this.columns.length
      emptyTd.className = 'empty'
      emptyTd.textContent = this.getAttr('empty-text', '暂无数据')
      emptyTr.appendChild(emptyTd)
      body.appendChild(emptyTr)
      return
    }

    for (const row of sorted) {
      const tr = document.createElement('tr')
      tr.className = 'row'
      tr.setAttribute('part', 'row')
      const key = String(row[rowKey] ?? JSON.stringify(row))
      tr.setAttribute('data-selected', String(selected.includes(key)))
      if (this.hasAttr('checkable')) {
        const td = document.createElement('td')
        td.className = 'check-cell'
        const box = document.createElement('input')
        box.type = 'checkbox'
        box.setAttribute('aria-label', `选择行 ${key}`)
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
        if (col.align) td.className = `align-${col.align}`
        const raw = row[col.key]
        const cell = col.render ? col.render(row) : String(raw ?? '')
        td.textContent = cell
        tr.appendChild(td)
      }
      body.appendChild(tr)
    }
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
