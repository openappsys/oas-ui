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
  /** 行内编辑：该列可编辑（配合表格级 `editable` 属性开关） */
  editable?: boolean
  /** 编辑器类型：input（默认）/ select（配 editOptions） */
  editor?: 'input' | 'select'
  /** select 编辑器的选项 */
  editOptions?: EditOption[]
  /** 操作列：渲染 编辑/保存/取消 按钮（依赖表格级 `editable` 属性） */
  actions?: boolean
}

/** 行内编辑 select 选项 */
export interface EditOption {
  label: string
  value: string | number
}

export type SortOrder = '' | 'asc' | 'desc'

/** 密度档位：与控件 size 体系同词（small/medium/large），默认 medium */
export type TableSize = 'small' | 'medium' | 'large'

const VALID_TABLE_SIZES: readonly TableSize[] = ['small', 'medium', 'large']

const warnedSizes = new Set<string>()

/** 非法 size 归一化：回落 medium 并在 dev 下 console.warn 一次（同值去重，同控件惯例） */
function normalizeTableSize(raw: string): TableSize {
  if ((VALID_TABLE_SIZES as readonly string[]).includes(raw)) return raw as TableSize
  if (!warnedSizes.has(raw)) {
    warnedSizes.add(raw)
    console.warn(`[oas-table] 非法 size "${raw}"，已回落 medium；合法值：small/medium/large`)
  }
  return 'medium'
}

/** 合计类型：求和 / 平均 / 计数 */
export type SummaryType = 'sum' | 'avg' | 'count'

export interface SummaryConfig {
  key: string
  type: SummaryType
  /** 合计行首列展示的标签（不配置时用默认文案） */
  label?: string
}

/** 行内编辑进行中的单元格状态 */
interface EditState {
  /** 可见行索引（事件 rowIndex，排序/过滤后的展示顺序） */
  displayIndex: number
  /** 行唯一键 */
  key: string
  /** 列 key */
  colKey: string
  /** 行数据引用（非受控提交时回写） */
  row: Record<string, unknown>
  /** 编辑单元格 */
  td: HTMLTableCellElement
  /** 编辑前原值（字符串形态） */
  oldValue: string
  /** 编辑器类型 */
  editor: 'input' | 'select'
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
  /* 密度档位 medium（默认）：size 属性只改这组内部变量的 fallback，
     宿主可直接用 --oas-table-* 变量覆盖（优先级高于档位） */
  font-size: var(--oas-table-font-size, var(--oas-font-size-md));
  --_cell-py: var(--oas-table-cell-padding-block, var(--oas-space-3));
  --_cell-px: var(--oas-table-cell-padding-inline, var(--oas-space-4));
  overflow: hidden;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
}
/* 紧凑档：padding 降一档、字号 sm */
:host([size='small']) {
  font-size: var(--oas-table-font-size, var(--oas-font-size-sm));
  --_cell-py: var(--oas-table-cell-padding-block, var(--oas-space-2));
  --_cell-px: var(--oas-table-cell-padding-inline, var(--oas-space-3));
}
/* 宽松档：padding 升一档、字号 lg */
:host([size='large']) {
  font-size: var(--oas-table-font-size, var(--oas-font-size-lg));
  --_cell-py: var(--oas-table-cell-padding-block, var(--oas-space-4));
  --_cell-px: var(--oas-table-cell-padding-inline, var(--oas-space-5));
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
  padding: var(--_cell-py) var(--_cell-px);
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
/* 固定列：sticky 横向定位（left/right 由 JS 按列宽累加写入）。
   层级：固定正文格 1 < 表头吸顶格 2 < 固定表头格 3（滚动时表头不被正文盖住） */
td[data-fixed='left'], td[data-fixed='right'] {
  position: sticky;
  z-index: 1;
  background: var(--oas-color-bg);
}
th[data-fixed='left'], th[data-fixed='right'] {
  position: sticky;
  z-index: 3;
  background: var(--oas-color-bg-hover);
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
  padding: var(--_cell-py) var(--_cell-px);
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
/* 吸顶行：position: sticky 纵向吸顶（top 由 JS 按表头/行高写入）。
   与固定列（横向 sticky）共存，层级：正文固定 1 < 吸顶行 2 < 表头 3 < 吸顶行固定 4 */
tr[data-sticky='true'] td {
  position: sticky;
  z-index: 2;
  background: var(--oas-color-bg);
}
tr[data-sticky='true'][data-stripe='odd'] td {
  background: var(--oas-color-bg-hover);
}
tr[data-sticky='true'][data-selected='true'] td {
  background: var(--oas-color-primary-soft, rgba(24, 144, 255, 0.08));
}
tr[data-sticky='true'] td[data-fixed] {
  z-index: 4;
  background: var(--oas-color-bg);
}
tr[data-sticky='true'][data-stripe='odd'] td[data-fixed] {
  background: var(--oas-color-bg-hover);
}
tr[data-sticky='true'][data-selected='true'] td[data-fixed] {
  background: var(--oas-color-primary-soft, rgba(24, 144, 255, 0.08));
}
tr[data-sticky='true']:hover td {
  background: var(--oas-color-bg-hover);
}
/* 行内编辑：编辑态单元格与列高亮 */
td.editing {
  padding: 0;
}
td[data-editing='true'],
tr[data-sticky='true'] td[data-editing='true'] {
  background: var(--oas-color-primary-soft, rgba(24, 144, 255, 0.08));
}
td.editing .cell-editor {
  box-sizing: border-box;
  width: 100%;
  /* 编辑态与常规单元格同密度：padding/字号跟随档位变量 */
  padding: var(--_cell-py) var(--_cell-px);
  border: none;
  background: transparent;
  color: var(--oas-color-text-primary);
  font-size: inherit;
  font-family: inherit;
  line-height: inherit;
}
td.editing .cell-editor:focus {
  outline: none;
  background: var(--oas-color-bg);
  box-shadow: inset 0 0 0 2px var(--oas-color-primary);
}
th[data-editing-col='true'] {
  color: var(--oas-color-primary);
  box-shadow: inset 0 -2px 0 var(--oas-color-primary);
}
/* 操作列按钮 */
.action-btn {
  appearance: none;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--oas-color-primary);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  padding: var(--oas-space-1) var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
}
.action-btn:hover {
  background: var(--oas-color-bg-hover);
}
.action-btn.danger {
  color: var(--oas-color-text-secondary);
}
.action-btn.danger:hover {
  color: var(--oas-color-danger);
}
.action-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
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
      'editable',
      'edit-controlled',
      'sticky-rows',
      'size',
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
  /** 行内编辑：进行中的单元格（同一时刻至多一格在编辑） */
  private editState: EditState | null = null

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

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="table-scroll" part="scroll" tabindex="0">
        <table part="table">
          <thead part="head"></thead>
          <tbody part="body"></tbody>
        </table>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
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
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（关键节点存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.table-scroll')) return false
    if (!this.shadow.querySelector('thead') || !this.shadow.querySelector('tbody')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // 外部重渲染（data/sort/selected 等变化）时先静默取消进行中的编辑，防止编辑 DOM 被整体重建静默销毁
    this.settleEdit()
    this.parse()
    // 密度档位归一化：仅触发非法值告警副作用；档位视觉纯 CSS（:host([size]) 选择器），
    // 非法值不匹配任何档位选择器 → 自然回落 medium 默认
    normalizeTableSize(this.getAttr('size', 'medium'))
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
        flat.length > 0 &&
        flat.every((f) => selected.includes(String(f.row[rowKey] ?? JSON.stringify(f.row))))
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
    // 吸顶行：为前 N 行写入 data-sticky 与 top 偏移（依赖已铺好的表头/行测量高度）
    this.applyStickyRows()
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
    tr.setAttribute('data-key', key)
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
      td.setAttribute('data-col', col.key)
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
      if (col.actions) {
        this.renderActionCell(td, tr)
      } else {
        td.appendChild(document.createTextNode(this.cellText(col, row)))
      }
      // 可编辑单元格：可聚焦，Enter/F2/双击进入编辑（仅响应单元格自身事件，
      // 编辑器内部按键/双击会冒泡到此，需排除避免提交后被重入编辑）
      if (this.editingEnabled(col)) {
        td.tabIndex = 0
        td.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.target !== td) return
          if (e.key === 'Enter' || e.key === 'F2') {
            e.preventDefault()
            this.enterEdit(td)
          }
        })
        td.addEventListener('dblclick', (e: MouseEvent) => {
          if (e.target !== td) return
          this.enterEdit(td)
        })
      }
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
    const win = computeVirtualWindow(
      scrollTop,
      this.tableHeight(),
      this.rowHeight(),
      display.length,
    )
    const colSpan = this.columnCount()
    // 吸顶行恒渲染在列表顶部（视口外的吸顶行也从窗口中排除，避免重复渲染）
    const sticky = this.stickyRowCount()
    const stickyEnd = Math.min(sticky, display.length)
    let windowStart = win.start
    if (stickyEnd > 0) {
      for (let i = 0; i < stickyEnd; i++) {
        const f = display[i]!
        const tr =
          f.kind === 'expand'
            ? this.buildExpandRow(f)
            : this.buildRow(f, i, rowKey, selected, expanded, layout)
        tr.style.height = `${this.rowHeight()}px`
        body.appendChild(tr)
      }
      windowStart = Math.max(win.start, stickyEnd)
    }

    const topSpacer = document.createElement('tr')
    topSpacer.className = 'spacer'
    const topTd = document.createElement('td')
    topTd.colSpan = colSpan
    topTd.style.height = `${(windowStart - stickyEnd) * this.rowHeight()}px`
    topSpacer.appendChild(topTd)
    body.appendChild(topSpacer)

    for (let i = windowStart; i < win.end; i++) {
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

  /**
   * 排序比较器：数字按数值、其余按字符串码点确定性比较。
   * 不依赖宿主 locale（localeCompare 无显式 locale 时 Windows full-ICU 中文拼音与
   * Linux small-ICU 码点排序结果不同，导致跨环境行为不一致）；语言感知排序（如中文
   * 拼音）应由宿主在数据侧预排序或提供自定义 comparator。
   */
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
    const sa = String(av)
    const sb = String(bv)
    const cmp = sa < sb ? -1 : sa > sb ? 1 : 0
    return sortOrder === 'asc' ? cmp : -cmp
  }

  /**
   * 构建扁平行列表（含树形 children 递归）。排序在各层级兄弟间独立进行，不破坏父子结构；
   * 返回的 flat 是完整列表（树形含隐藏子行），visibleFlat 再做可见性过滤。
   */
  private buildFlat(sortKey: string, sortOrder: SortOrder, rowKey: string): FlatRow[] {
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
        out.push({
          row,
          depth: f.depth,
          parent: f.parent,
          kind: 'expand',
          expandContent: row.expand,
        })
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
      else if (cfg.type === 'avg')
        values.set(cfg.key, String(cnt ? Math.round((sum / cnt) * 100) / 100 : 0))
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
      this.settleEdit()
      body.innerHTML = ''
      this.renderVirtualBody(body, display, rowKey, selected, expanded, this.computeLayout(), st)
      this.applyStickyRows()
      // 清空曾把 scrollTop 钳回 0，内容铺满后恢复（窗口按 st 算，视觉不跳）
      if (this.wrap!.scrollTop !== st) {
        this.ignoreNextScroll = true
        this.wrap!.scrollTop = st
      }
      const win = computeVirtualWindow(st, this.tableHeight(), this.rowHeight(), display.length)
      this.emit('scroll', { scrollTop: st, start: win.start, end: win.end })
    })
  }

  // ==================== 行内编辑 ====================

  /** 表格级 editable 开关 + 列级 editable 双重要求 */
  private editingEnabled(col: TableColumn): boolean {
    return this.hasAttr('editable') && Boolean(col.editable)
  }

  /** 单元格展示文本（select 列按选项 label 展示；render 函数优先） */
  private cellText(col: TableColumn, row: Record<string, unknown>): string {
    if (col.actions) return ''
    const raw = row[col.key]
    if (col.editor === 'select' && Array.isArray(col.editOptions) && col.editOptions.length > 0) {
      const opt = col.editOptions.find((o) => String(o.value) === String(raw ?? ''))
      if (opt) return opt.label
    }
    if (col.render) return col.render(row)
    return String(raw ?? '')
  }

  /** 双击 / Enter / F2 / 操作列按钮 → 进入编辑模式 */
  private enterEdit(td: HTMLTableCellElement): void {
    // 防御：两次点击之间表格重渲染导致 td 被整体重建（脱离文档）时不再进入编辑，
    // 否则编辑器会创建在游离节点上（不可见但状态被占用）
    if (!td.isConnected) return
    const colKey = td.getAttribute('data-col') ?? ''
    if (!colKey) return
    const col = this._columns.find((c) => c.key === colKey)
    if (!col || !this.editingEnabled(col)) return
    // 另一格正在编辑：先提交旧格（非受控时可能触发重渲染，需重查 td）
    if (this.editState && this.editState.td !== td) {
      this.submitEdit()
      const key = this.rowKeyOf(td)
      const freshTr = this.findRow(key)
      const freshTd = freshTr ? this.cellOf(freshTr, colKey) : null
      if (!freshTd) return
      td = freshTd
    }
    const tr = td.closest('tr') as HTMLTableRowElement | null
    if (!tr) return
    const key = tr.getAttribute('data-key') ?? ''
    const row = this.findDataRow(key) ?? {}
    const oldValue = String(row[colKey] ?? '')
    const displayIndex = this.displayIndexOf(tr)
    const editor =
      col.editor === 'select'
        ? this.buildSelectEditor(col, key, oldValue)
        : this.buildInputEditor(col, key, oldValue)
    td.textContent = ''
    td.appendChild(editor)
    td.classList.add('editing')
    td.setAttribute('data-editing', 'true')
    this.headerTh(colKey)?.setAttribute('data-editing-col', 'true')
    this.editState = {
      displayIndex,
      key,
      colKey,
      row,
      td,
      oldValue,
      editor: col.editor === 'select' ? 'select' : 'input',
    }
    editor.focus()
    if (editor instanceof HTMLInputElement) editor.select()
    this.refreshActionCells()
  }

  private buildInputEditor(col: TableColumn, key: string, value: string): HTMLInputElement {
    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'cell-editor'
    input.setAttribute('part', 'cell-editor')
    input.value = value
    input.setAttribute('aria-label', this.t('table.editCell', { column: col.title, key }))
    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        this.submitEdit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        this.cancelEdit()
      }
    })
    input.addEventListener('click', (e) => e.stopPropagation())
    input.addEventListener('blur', (e: FocusEvent) => this.handleEditorBlur(e))
    return input
  }

  private buildSelectEditor(col: TableColumn, key: string, value: string): HTMLSelectElement {
    const select = document.createElement('select')
    select.className = 'cell-editor'
    select.setAttribute('part', 'cell-editor')
    select.setAttribute('aria-label', this.t('table.editCell', { column: col.title, key }))
    for (const opt of col.editOptions ?? []) {
      const o = document.createElement('option')
      o.value = String(opt.value)
      o.textContent = opt.label
      select.appendChild(o)
    }
    select.value = value
    select.addEventListener('change', (e) => {
      e.stopPropagation()
      this.submitEdit()
    })
    select.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        this.cancelEdit()
      }
    })
    select.addEventListener('click', (e) => e.stopPropagation())
    select.addEventListener('blur', (e: FocusEvent) => this.handleEditorBlur(e))
    return select
  }

  /**
   * 提交当前编辑（Enter / blur / 操作列保存）：
   * - 空值 → 还原旧值（默认非破坏）并派发 oas-edit-cancel
   * - 值变化且非空 → 非受控模式回写 data 并派发 oas-edit；受控模式仅派发 oas-edit
   * - 值未变 → 静默退出
   */
  private submitEdit(): void {
    const st = this.editState
    if (!st) return
    const value = this.readEditorValue(st)
    this.exitEdit(st)
    if (value === '') {
      this.emit('edit-cancel', this.editDetail(st, st.oldValue))
      this.focusCell(st.key, st.colKey)
      return
    }
    if (value !== st.oldValue) {
      if (!this.hasAttr('edit-controlled')) {
        st.row[st.colKey] = this.coerceEditValue(st, value)
        this.setAttribute('data', JSON.stringify(this._data))
      }
      this.emit('edit', this.editDetail(st, value))
    }
    this.focusCell(st.key, st.colKey)
  }

  /** 取消当前编辑（Esc / 操作列取消）：还原旧值并派发 oas-edit-cancel */
  private cancelEdit(): void {
    const st = this.editState
    if (!st) return
    const detail = this.editDetail(st, st.oldValue)
    this.exitEdit(st)
    this.emit('edit-cancel', detail)
    this.focusCell(st.key, st.colKey)
  }

  /** 退出编辑态：还原单元格展示、清除高亮、刷新操作列按钮 */
  private exitEdit(st: EditState): void {
    const col = this._columns.find((c) => c.key === st.colKey)
    st.td.textContent = col ? this.cellText(col, st.row) : ''
    st.td.classList.remove('editing')
    st.td.removeAttribute('data-editing')
    this.headerTh(st.colKey)?.removeAttribute('data-editing-col')
    this.editState = null
    this.refreshActionCells()
  }

  /** 外部重渲染（数据/排序/滚动等触发整体重建）前静默取消进行中的编辑 */
  private settleEdit(): void {
    this.editState = null
  }

  private handleEditorBlur(e: FocusEvent): void {
    if (!this.editState) return
    const related = e.relatedTarget as Node | null
    // 焦点移至组件内部（操作列保存/取消按钮）时交给按钮 click，避免双重提交
    if (related && this.shadow.contains(related)) return
    this.submitEdit()
  }

  private readEditorValue(st: EditState): string {
    if (st.editor === 'select') {
      const sel = st.td.querySelector<HTMLSelectElement>('select.cell-editor')
      return sel ? sel.value : st.oldValue
    }
    const input = st.td.querySelector<HTMLInputElement>('input.cell-editor')
    return input ? input.value : st.oldValue
  }

  /** 数字列编辑回写保持数值类型（非字符串化） */
  private coerceEditValue(st: EditState, value: string): string | number {
    const old = st.row[st.colKey]
    if (typeof old === 'number' && value !== '' && Number.isFinite(Number(value))) {
      return Number(value)
    }
    return value
  }

  private editDetail(
    st: EditState,
    value: string,
  ): { rowIndex: number; key: string; column: string; value: string } {
    return { rowIndex: st.displayIndex, key: st.key, column: st.colKey, value }
  }

  /** 编辑结束后焦点还给单元格（非受控提交已重建，需重查） */
  private focusCell(key: string, colKey: string): void {
    const tr = this.findRow(key)
    const td = tr ? this.cellOf(tr, colKey) : null
    td?.focus()
  }

  /** 操作列按钮：编辑 → 进入该行首个可编辑列编辑模式 */
  private editRow(key: string): void {
    // 另一行正在编辑时先提交（非受控可能触发重渲染，随后重查 tr）
    if (this.editState) this.submitEdit()
    const tr = this.findRow(key)
    if (!tr) return
    const colIndex = this._columns.findIndex((c) => c.editable)
    if (colIndex < 0) return
    const td = this.cellOf(tr, this._columns[colIndex]!.key)
    if (td) this.enterEdit(td)
  }

  /** 渲染操作列单元格：非编辑态显示 编辑，编辑态显示 保存/取消 */
  private renderActionCell(td: HTMLTableCellElement, tr: HTMLTableRowElement): void {
    const key = tr.getAttribute('data-key') ?? ''
    const isEditing = this.editState?.key === key
    td.textContent = ''
    if (isEditing) {
      const save = document.createElement('button')
      save.className = 'action-btn save'
      save.setAttribute('part', 'action-save')
      save.textContent = this.t('table.save')
      save.addEventListener('click', (e) => {
        e.stopPropagation()
        this.submitEdit()
      })
      const cancel = document.createElement('button')
      cancel.className = 'action-btn danger'
      cancel.setAttribute('part', 'action-cancel')
      cancel.textContent = this.t('table.cancel')
      cancel.addEventListener('click', (e) => {
        e.stopPropagation()
        this.cancelEdit()
      })
      td.append(save, cancel)
    } else {
      const edit = document.createElement('button')
      edit.className = 'action-btn'
      edit.setAttribute('part', 'action-edit')
      edit.textContent = this.t('table.edit')
      edit.addEventListener('click', (e) => {
        e.stopPropagation()
        this.editRow(key)
      })
      td.appendChild(edit)
    }
  }

  /** 编辑状态变化后重渲染可见行的操作列（避免整表重建） */
  private refreshActionCells(): void {
    const body = this.shadow.querySelector('tbody')
    if (!body) return
    const actionIndex = this._columns.findIndex((c) => c.actions)
    if (actionIndex < 0) return
    const offset = this.tdOffset(actionIndex)
    for (const tr of body.querySelectorAll('tr.row')) {
      const td = tr.querySelectorAll('td')[offset]
      if (td) this.renderActionCell(td as HTMLTableCellElement, tr as HTMLTableRowElement)
    }
  }

  private headerTh(colKey: string): HTMLElement | null {
    const thead = this.shadow.querySelector('thead')
    if (!thead) return null
    for (const th of thead.querySelectorAll('th[data-key]')) {
      if (th.getAttribute('data-key') === colKey) return th as HTMLElement
    }
    return null
  }

  private findRow(key: string): HTMLTableRowElement | null {
    const body = this.shadow.querySelector('tbody')
    if (!body) return null
    for (const tr of body.querySelectorAll('tr.row')) {
      if (tr.getAttribute('data-key') === key) return tr as HTMLTableRowElement
    }
    return null
  }

  private cellOf(tr: HTMLTableRowElement, colKey: string): HTMLTableCellElement | null {
    const colIndex = this._columns.findIndex((c) => c.key === colKey)
    if (colIndex < 0) return null
    const td = tr.querySelectorAll('td')[this.tdOffset(colIndex)]
    return (td as HTMLTableCellElement | undefined) ?? null
  }

  private rowKeyOf(td: HTMLTableCellElement): string {
    const tr = td.closest('tr')
    return tr?.getAttribute('data-key') ?? ''
  }

  private displayIndexOf(tr: HTMLTableRowElement): number {
    const body = this.shadow.querySelector('tbody')
    if (!body) return -1
    return [...body.querySelectorAll('tr.row')].indexOf(tr)
  }

  /** 数据列 td 在 tr 内的索引（勾选列占一列时偏移） */
  private tdOffset(colIndex: number): number {
    return colIndex + (this.hasAttr('checkable') ? 1 : 0)
  }

  /** 按行键在数据树中找行对象（提交时回写用） */
  private findDataRow(
    key: string,
    nodes: Array<Record<string, unknown>> = this._data,
  ): Record<string, unknown> | null {
    const rowKey = this.getAttr('row-key', 'key')
    for (const row of nodes) {
      if (String(row[rowKey] ?? JSON.stringify(row)) === key) return row
      const children = row.children
      if (Array.isArray(children)) {
        const hit = this.findDataRow(key, children as Array<Record<string, unknown>>)
        if (hit) return hit
      }
    }
    return null
  }

  // ==================== 吸顶行 ====================

  private stickyRowCount(): number {
    const n = Number(this.getAttr('sticky-rows', ''))
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
  }

  /**
   * 为前 N 行写入 data-sticky 与逐行 top 偏移。
   * top 基准 = 表头高度（表头本身已 sticky top:0），逐行累加行高；
   * happy-dom 无排版测量（offsetHeight 为 0），真实偏移由浏览器排版决定。
   */
  private applyStickyRows(): void {
    const count = this.stickyRowCount()
    if (count === 0) return
    const body = this.shadow.querySelector('tbody')
    const thead = this.shadow.querySelector('thead')
    if (!body || !thead) return
    let top = thead.offsetHeight
    let remaining = count
    for (const tr of body.querySelectorAll('tr')) {
      if (remaining <= 0) break
      if (!tr.classList.contains('row') && !tr.classList.contains('expand-row')) continue
      tr.setAttribute('data-sticky', 'true')
      const h = tr.offsetHeight
      for (const td of tr.querySelectorAll('td')) td.style.top = `${top}px`
      top += h
      remaining--
    }
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
