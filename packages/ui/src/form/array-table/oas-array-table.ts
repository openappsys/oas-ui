import { OASElement } from '@oas-ui/core/oas-element'
import { cloneSlotContent } from '../../shared/slot-template.js'
import {
  applyRowNaming,
  copyRowValue,
  indexedRowName,
  rowWrappers,
  swapRowValues,
  type NamedRowField,
} from '../shared/list-row-ops.js'

/**
 * oas-array-table —— 对象数组的行内编辑表格（schema-form 的 `uiSchema.widget: 'array-table'` 承载件）。
 *
 * 分工（与 oas-form-list 同构的数组渲染机制，只多做二维布局与行操作列）：
 * - **行模板由 schema-form 渲染**（form-item 单元格 + `data-schema-key` + 行内字段名），本组件
 *   只克隆模板、索引化 name、维护行数——因此 schema-form 对数组容器的全部 DOM 契约
 *   （`data-schema-array-key` + `[data-oas-form-list-item]`）零成本继承；
 * - 本组件只负责 ARIA 表格语义（`table` / `columnheader` / `row` / `cell`）+ CSS grid 二维布局
 *   + 行操作列（删除 / 复制 / 上移 / 下移，末尾追加行）。
 *
 * 布局实现说明：行 wrapper 与单元格是 light DOM（主表只收集 light DOM，放进 shadow 就收不到值），
 * shadow 样式够不到它们，因此几何（grid-template-columns / padding / 边框）以**内联样式**写在
 * 行 wrapper 与单元格上；列定义与表头（shadow 内）用同一份轨道串，保证表头与行严格对齐。
 *
 * 不用原生 table 元素：slot 产不出 `td`，行内容又必须留在 light DOM——原生表格语义无法成立。
 *
 * 行操作契约与 oas-form-list 完全同源：值读写走内核通道（upload 跳过）、操作后按索引重聚焦、
 * aria-live 播报；事件 `oas-add` / `oas-remove` `{ index }` + `oas-duplicate` / `oas-move` `{ from, to }`。
 */
const STYLE = `
:host {
  display: block;
  font-family: inherit;
  min-width: 0;
}
:host([hidden]) {
  display: none;
}
.table {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-elevated);
  overflow: hidden;
}
.head {
  display: grid;
  gap: var(--oas-space-2);
  align-items: center;
  padding: var(--oas-space-2) var(--oas-space-3);
  background: var(--oas-color-bg-hover);
  border-bottom: 1px solid var(--oas-color-border);
}
.head[hidden] {
  display: none;
}
.head-cell {
  min-width: 0;
  font-size: var(--oas-font-size-sm);
  font-weight: 600;
  color: var(--oas-color-text-secondary-strong);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.head-actions {
  text-align: end;
}
.rows {
  display: block;
}
.empty {
  display: grid;
  padding: var(--oas-space-3);
}
.empty[hidden] {
  display: none;
}
.empty-cell {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.add {
  appearance: none;
  align-self: flex-start;
  border: 1px dashed var(--oas-color-border);
  background: transparent;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  height: var(--oas-control-height-md);
  border-radius: var(--oas-radius-md);
  font-size: var(--oas-font-size-sm);
  padding: 0 var(--oas-space-3);
  font-family: inherit;
  margin-top: var(--oas-space-2);
}
.add:hover:not(:disabled) {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
.add:disabled {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
}
.add:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.live {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
@media (forced-colors: active) {
  .add:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 1px;
    box-shadow: none;
  }
}
`

const ADD_ICON_PATH = 'M8 3 L8 13 M3 8 L13 8'
const REMOVE_ICON = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M3 5 L13 5 M5.5 5 L6.5 14 L9.5 14 L10.5 5 M6 5 L6 3 L10 3 L10 5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const DUPLICATE_ICON = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M5 2 L12 2 L12 9 M3 5 L10 5 L10 13 L3 13 Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`
const UP_ICON = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M8 12 L8 4 M4.5 7.5 L8 4 L11.5 7.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`
const DOWN_ICON = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M8 4 L8 12 M4.5 8.5 L8 12 L11.5 8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`

const ROW_ACTIONS = ['duplicate', 'move-up', 'move-down', 'remove'] as const
type RowAction = (typeof ROW_ACTIONS)[number]

/** 列定义（顺序 = 单元格顺序；hidden 列保留单元格与值，只隐藏视觉） */
export interface ArrayTableColumn {
  key: string
  label: string
  /** grid 轨道尺寸：数字 → px，字符串原样（如 `2fr` / `120px`） */
  width?: number | string
  align?: 'left' | 'center' | 'right'
  hidden?: boolean
}

/** 行操作列固定宽度（表头与每行同值，保证末列对齐） */
const ACTIONS_TRACK = 'var(--oas-array-table-actions-width, 148px)'

interface TableItem {
  uid: number
  wrapper: HTMLElement
  named: NamedRowField[]
  /** 行内单元格（模板克隆后的直接子节点，顺序 = 列顺序） */
  cells: HTMLElement[]
  actions: HTMLElement
}

const OPS_STYLE = 'display:flex;align-items:center;justify-content:flex-end;gap:var(--oas-space-1);min-width:0;'

export class OASArrayTable extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'name',
      'rows',
      'min',
      'max',
      'disabled',
      'columns',
      'label',
      'add-text',
      'remove-text',
      'duplicate-text',
      'move-up-text',
      'move-down-text',
    ]
  }

  private rowsEl: HTMLElement | null = null
  private headEl: HTMLElement | null = null
  private emptyEl: HTMLElement | null = null
  private tableEl: HTMLElement | null = null
  private addBtn: HTMLButtonElement | null = null
  private liveEl: HTMLElement | null = null
  private items: TableItem[] = []
  private uidCounter = 0
  private lastTemplate: HTMLTemplateElement | null = null
  private pendingInitialReplay = true
  private childObserver: MutationObserver | null = null
  private frameKey = ''
  /** 列定义原文缓存（变更才重排表头/单元格几何） */
  private columnsRaw: string | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="table" part="table" role="table">
        <div class="head" part="head" role="row"></div>
        <div class="rows" part="rows"><slot></slot></div>
        <div class="empty" part="empty" role="row" hidden>
          <div class="empty-cell" role="cell"></div>
        </div>
      </div>
      <div class="live" part="live" role="status" aria-live="polite" aria-atomic="true"></div>
      <button class="add" part="add" type="button"></button>
    `
  }

  private bind(): void {
    this.tableEl = this.shadow.querySelector('.table')
    this.headEl = this.shadow.querySelector('.head')
    this.rowsEl = this.shadow.querySelector('.rows')
    this.emptyEl = this.shadow.querySelector('.empty')
    this.addBtn = this.shadow.querySelector('.add')
    this.liveEl = this.shadow.querySelector('.live')
    this.addBtn?.addEventListener('click', this.handleAddClick)

    if (!this.childObserver) {
      const observer = new MutationObserver(() => this.handleDomMutation())
      observer.observe(this, { childList: true })
      this.childObserver = observer
      this.onCleanup(() => {
        observer.disconnect()
        this.childObserver = null
      })
    }
    // 行状态（items / lastTemplate）不随断开清理：行 wrapper 仍在 light DOM，清空记录会让重连时再建一遍
  }

  /** 断开重连：观察器已由 cleanup 摘除 → 重新绑定（幂等） */
  protected override onReconnect(): void {
    this.bind()
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（表格容器 + 行容器 + 添加按钮）后接管 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.table')) return false
    if (!this.shadow.querySelector('.rows')) return false
    if (!this.shadow.querySelector('.add')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const tpl = this.resolveTemplate()
    if (tpl !== this.lastTemplate) {
      this.lastTemplate = tpl
      this.rebuild()
    }
    this.ensureItems()
    this.applyNaming()
    this.syncLayout()
    this.syncShadow()
    this.replayInitialValues()
  }

  private resolveTemplate(): HTMLTemplateElement | null {
    return this.querySelector('template:not([slot])')
  }

  /** 列定义（JSON attribute；非法形态按空列处理——表头缺列好过整表不渲染） */
  get columns(): ArrayTableColumn[] {
    return this.parseColumns(this.getAttr('columns', ''))
  }
  set columns(value: ArrayTableColumn[] | string) {
    this.setAttribute('columns', typeof value === 'string' ? value : JSON.stringify(value))
  }

  private parseColumns(raw: string): ArrayTableColumn[] {
    if (raw === '') return []
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed
        .filter((col): col is Record<string, unknown> => !!col && typeof col === 'object')
        .map((col) => ({
          key: typeof col.key === 'string' ? col.key : '',
          label: typeof col.label === 'string' ? col.label : '',
          width: typeof col.width === 'number' || typeof col.width === 'string' ? col.width : undefined,
          align:
            col.align === 'center' || col.align === 'right' ? col.align : col.align === 'left' ? 'left' : undefined,
          hidden: col.hidden === true,
        }))
    } catch {
      return []
    }
  }

  private minValue(): number {
    return Math.max(0, Number(this.getAttr('min', '0')) || 0)
  }

  private initialRowCount(): number {
    const rows = this.getAttr('rows', '')
    if (rows !== '') {
      const n = Number(rows)
      return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
    }
    return this.minValue()
  }

  private maxValue(): number {
    const raw = this.getAttr('max', '')
    if (raw === '') return Number.POSITIVE_INFINITY
    const n = Number(raw)
    return Number.isFinite(n) ? Math.max(0, n) : Number.POSITIVE_INFINITY
  }

  private rebuild(): void {
    for (const item of this.items) item.wrapper.remove()
    this.items = []
    this.frameKey = ''
    this.pendingInitialReplay = true
  }

  private ensureItems(): void {
    if (!this.lastTemplate) return
    let grew = false
    const target = this.initialRowCount()
    while (this.items.length < target) {
      this.addItem()
      grew = true
    }
    if (grew) this.pendingInitialReplay = true
  }

  /** 创建一行：克隆模板 → 单元格标注（role=cell + 列几何）+ 操作单元格 */
  private addItem(at: number = this.items.length): TableItem {
    const uid = this.uidCounter++
    const listName = this.getAttr('name', '')
    const wrapper = document.createElement('div')
    wrapper.setAttribute('data-oas-form-list-item', '')
    wrapper.setAttribute('slot', `oas-array-table-row-${uid}`)
    wrapper.setAttribute('role', 'row')

    const named: NamedRowField[] = []
    const content = cloneSlotContent(this.lastTemplate!)
    for (const el of [...content.querySelectorAll('[name]')]) {
      const tplName = el.getAttribute('name') ?? ''
      const next = indexedRowName(tplName, at, listName)
      if (next !== tplName) el.setAttribute('name', next)
      named.push({ el, tplName })
    }
    const cells: HTMLElement[] = []
    for (const node of [...content.children]) {
      if (!(node instanceof HTMLElement)) continue
      node.setAttribute('role', 'cell')
      cells.push(node)
      wrapper.appendChild(node)
    }
    const actions = document.createElement('div')
    actions.setAttribute('role', 'cell')
    actions.setAttribute('part', 'actions')
    actions.style.cssText = OPS_STYLE
    for (const action of ROW_ACTIONS) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'op'
      btn.setAttribute('part', action)
      btn.setAttribute('data-action', action)
      btn.style.cssText = [
        'appearance:none',
        'border:none',
        'background:transparent',
        'cursor:pointer',
        'padding:0',
        'width:28px',
        'height:28px',
        'display:inline-flex',
        'align-items:center',
        'justify-content:center',
        'border-radius:var(--oas-radius-sm)',
        'color:var(--oas-color-text-secondary)',
        'font-family:inherit',
      ].join(';')
      btn.innerHTML =
        action === 'duplicate'
          ? DUPLICATE_ICON
          : action === 'move-up'
            ? UP_ICON
            : action === 'move-down'
              ? DOWN_ICON
              : REMOVE_ICON
      btn.addEventListener('mouseenter', () => {
        if (btn.disabled) return
        btn.style.background = 'var(--oas-color-bg-hover)'
        btn.style.color = action === 'remove' ? 'var(--oas-color-danger)' : 'var(--oas-color-primary)'
      })
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'transparent'
        btn.style.color = 'var(--oas-color-text-secondary)'
      })
      btn.addEventListener('focus', () => {
        btn.style.boxShadow = 'var(--oas-focus-ring)'
      })
      btn.addEventListener('blur', () => {
        btn.style.boxShadow = 'none'
      })
      actions.appendChild(btn)
    }
    wrapper.appendChild(actions)

    const item: TableItem = { uid, wrapper, named, cells, actions }
    // 行操作直接绑在按钮上（不靠 shadow 容器委托：light DOM 里的按钮跨 shadow 的冒泡路径在部分实现里丢失）
    for (const btn of actions.querySelectorAll<HTMLButtonElement>('[data-action]')) {
      const action = btn.getAttribute('data-action') as RowAction | null
      if (!action) continue
      btn.addEventListener('click', () => {
        const index = this.items.indexOf(item)
        if (index >= 0) this.runAction(action, index)
      })
    }
    const anchor = this.items[at]?.wrapper ?? null
    if (anchor) this.insertBefore(wrapper, anchor)
    else this.appendChild(wrapper)
    this.items.splice(at, 0, item)
    return item
  }

  private applyNaming(): void {
    if (this.items.length === 0) return
    applyRowNaming(
      this.items.map((item) => item.named),
      this.getAttr('name', ''),
    )
  }

  /** 表头 + 行/单元格几何（列定义或行集合变化才重排；文案与禁用态每次刷新） */
  private syncLayout(): void {
    const raw = this.getAttr('columns', '')
    const columns = this.columns
    const tracks = columns.filter((col) => col.hidden !== true).map((col) => columnTrack(col.width))
    const gridTemplate = `${tracks.length > 0 ? tracks.join(' ') : 'minmax(0, 1fr)'} ${ACTIONS_TRACK}`
    if (raw !== this.columnsRaw) {
      this.columnsRaw = raw
      this.renderHead(columns, gridTemplate)
    }
    for (const item of this.items) {
      item.wrapper.style.cssText = [
        'display:grid',
        `grid-template-columns:${gridTemplate}`,
        'gap:var(--oas-space-2)',
        'align-items:start',
        'padding:var(--oas-space-2) var(--oas-space-3)',
        'border-top:1px solid var(--oas-color-border)',
        `border-inline-start:3px solid transparent`,
      ].join(';')
      item.cells.forEach((cell, index) => {
        const column = columns[index]
        const style = ['min-width:0']
        if (column?.hidden === true) style.push('display:none')
        if (column?.align) style.push(`text-align:${column.align}`)
        cell.style.cssText = style.join(';')
      })
    }
  }

  /** 表头（shadow 内）：列头 + 行操作列头；零行时隐藏表头（空态优先） */
  private renderHead(columns: ArrayTableColumn[], gridTemplate: string): void {
    const head = this.headEl
    if (!head) return
    head.textContent = ''
    head.style.cssText = [
      'display:grid',
      `grid-template-columns:${gridTemplate}`,
      'gap:var(--oas-space-2)',
      'align-items:center',
      'padding:var(--oas-space-2) var(--oas-space-3)',
      'background:var(--oas-color-bg-hover)',
      'border-bottom:1px solid var(--oas-color-border)',
    ].join(';')
    for (const column of columns) {
      const cell = document.createElement('div')
      cell.className = 'head-cell'
      cell.setAttribute('part', 'columnheader')
      cell.setAttribute('role', 'columnheader')
      cell.textContent = column.label !== '' ? column.label : column.key
      if (column.hidden === true) cell.style.display = 'none'
      if (column.align) cell.style.textAlign = column.align
      head.appendChild(cell)
    }
    const actions = document.createElement('div')
    actions.className = 'head-cell head-actions'
    actions.setAttribute('part', 'columnheader-actions')
    actions.setAttribute('role', 'columnheader')
    actions.textContent = this.t('schemaForm.rowActions')
    head.appendChild(actions)
  }

  private syncShadow(): void {
    const table = this.tableEl
    if (!table) return
    const head = this.headEl
    if (head) head.hidden = this.items.length === 0
    const empty = this.emptyEl
    if (empty) {
      empty.hidden = this.items.length > 0
      const cell = empty.querySelector<HTMLElement>('.empty-cell')
      if (cell) cell.textContent = this.t('schemaForm.emptyArray')
    }
    table.setAttribute('aria-label', this.getAttr('label', '') || this.t('schemaForm.tableLabel'))
    table.setAttribute('aria-rowcount', String(this.items.length + 1))

    const frames = [...(this.rowsEl?.querySelectorAll<HTMLElement>(':scope > .row-frame') ?? [])]
    const key = this.items.map((item) => item.uid).join(',')
    if (key !== this.frameKey) {
      this.frameKey = key
      for (const frame of frames) frame.remove()
      for (const item of this.items) {
        const frame = document.createElement('div')
        frame.className = 'row-frame'
        const slot = document.createElement('slot')
        slot.setAttribute('name', `oas-array-table-row-${item.uid}`)
        frame.appendChild(slot)
        this.rowsEl?.appendChild(frame)
      }
    }

    const frozen = this.hasAttr('disabled')
    const atMin = this.items.length <= this.minValue()
    const atMax = this.items.length >= this.maxValue()
    const last = this.items.length - 1
    this.items.forEach((item, index) => {
      const states: Record<RowAction, boolean> = {
        duplicate: frozen || atMax,
        'move-up': frozen || index === 0,
        'move-down': frozen || index === last,
        remove: frozen || atMin,
      }
      for (const action of ROW_ACTIONS) {
        const btn = item.actions.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)
        if (!btn) continue
        btn.disabled = states[action]
        btn.style.cursor = btn.disabled ? 'not-allowed' : 'pointer'
        btn.style.color = btn.disabled ? 'var(--oas-color-text-disabled)' : 'var(--oas-color-text-secondary)'
        const label = this.resolveActionText(action)
        if (btn.getAttribute('aria-label') !== label) btn.setAttribute('aria-label', label)
      }
    })

    const addBtn = this.addBtn
    if (addBtn) {
      addBtn.disabled = frozen || atMax
      addBtn.setAttribute('aria-label', this.resolveAddText())
      addBtn.textContent = ''
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      icon.setAttribute('viewBox', '0 0 16 16')
      icon.setAttribute('width', '12')
      icon.setAttribute('height', '12')
      icon.setAttribute('aria-hidden', 'true')
      icon.setAttribute('focusable', 'false')
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', ADD_ICON_PATH)
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke', 'currentColor')
      path.setAttribute('stroke-width', '1.4')
      path.setAttribute('stroke-linecap', 'round')
      icon.appendChild(path)
      icon.style.setProperty('margin-inline-end', 'var(--oas-space-1)')
      icon.style.verticalAlign = '-2px'
      addBtn.appendChild(icon)
      const span = document.createElement('span')
      span.textContent = this.resolveAddText()
      addBtn.appendChild(span)
    }
  }

  private resolveActionText(action: RowAction): string {
    const raw = this.getAttr(`${action}-text`, '')
    if (raw !== '') return raw
    if (action === 'duplicate') return this.t('schemaForm.rowDuplicate')
    if (action === 'move-up') return this.t('schemaForm.rowUp')
    if (action === 'move-down') return this.t('schemaForm.rowDown')
    return this.t('schemaForm.rowRemove')
  }

  private resolveAddText(): string {
    const raw = this.getAttr('add-text', '')
    return raw !== '' ? raw : this.t('schemaForm.rowAdd')
  }

  private replayInitialValues(): void {
    if (!this.pendingInitialReplay) return
    this.pendingInitialReplay = false
    const form = this.closest('oas-form') as { reapplyInitialValues?: () => void } | null
    form?.reapplyInitialValues?.()
  }

  private handleDomMutation(): void {
    const tpl = this.resolveTemplate()
    if (tpl !== this.lastTemplate) {
      this.lastTemplate = tpl
      this.rebuild()
      this.ensureItems()
      this.applyNaming()
      this.syncLayout()
      this.syncShadow()
      this.replayInitialValues()
    }
  }

  get rowCount(): number {
    return this.items.length
  }

  /** 行数收敛（受控数组缩容 / 行值内层数组对齐用）：增补空行、缩减从末尾删行，不派发事件 */
  setRowCount(count: number): void {
    if (!this.lastTemplate) return
    const target = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : this.items.length
    if (target === this.items.length) return
    let grew = false
    while (this.items.length < target) {
      this.addItem()
      grew = true
    }
    while (this.items.length > target) {
      const [removed] = this.items.splice(this.items.length - 1, 1)
      removed?.wrapper.remove()
    }
    if (grew) this.pendingInitialReplay = true
    this.applyNaming()
    this.syncLayout()
    this.syncShadow()
    this.replayInitialValues()
  }

  insertRowAt(index: number): boolean {
    if (!this.lastTemplate) return false
    if (this.items.length >= this.maxValue()) return false
    const at = Math.min(Math.max(0, Math.floor(index)), this.items.length)
    this.addItem(at)
    this.pendingInitialReplay = true
    this.applyNaming()
    this.syncLayout()
    this.syncShadow()
    this.replayInitialValues()
    return true
  }

  private readonly handleAddClick = (): void => this.handleAdd()

  /** 行操作分派（按钮点击 / 键盘激活同一入口） */
  private runAction(action: RowAction, index: number): void {
    if (action === 'remove') this.removeRow(index)
    else if (action === 'duplicate') this.duplicateRow(index)
    else this.moveRow(index, action === 'move-up' ? index - 1 : index + 1)
  }

  private handleAdd(): void {
    if (this.hasAttr('disabled')) return
    if (this.items.length >= this.maxValue()) return
    if (!this.lastTemplate) return
    this.addItem()
    this.applyNaming()
    this.syncLayout()
    this.syncShadow()
    this.replayInitialValues()
    const index = this.items.length - 1
    this.emit('add', { index })
    this.announce(this.t('schemaForm.rowAdded', { index: index + 1 }))
    this.focusItem(index)
  }

  private removeRow(index: number): void {
    if (this.hasAttr('disabled')) return
    if (this.items.length <= this.minValue()) return
    const [item] = this.items.splice(index, 1)
    item!.wrapper.remove()
    this.applyNaming()
    this.syncLayout()
    this.syncShadow()
    this.emit('remove', { index })
    this.announce(this.t('schemaForm.rowRemoved', { index: index + 1 }))
    const next = Math.min(index, this.items.length - 1)
    if (next >= 0) this.focusAction(next, 'remove')
  }

  private duplicateRow(index: number): void {
    if (this.hasAttr('disabled')) return
    if (this.items.length >= this.maxValue()) return
    const target = index + 1
    if (!this.insertRowAt(target)) return
    copyRowValue(this, this.getAttr('name', ''), index, target)
    this.emit('duplicate', { from: index, to: target })
    this.announce(this.t('schemaForm.rowDuplicated', { index: target + 1 }))
    this.focusAction(target, 'duplicate')
  }

  private moveRow(from: number, to: number): void {
    if (this.hasAttr('disabled')) return
    if (to < 0 || to >= this.items.length) return
    swapRowValues(this, this.getAttr('name', ''), from, to)
    this.emit('move', { from, to })
    this.announce(this.t('schemaForm.rowMoved', { from: from + 1, to: to + 1 }))
    this.focusAction(to, to < from ? 'move-up' : 'move-down')
  }

  private announce(message: string): void {
    if (!this.liveEl) return
    this.liveEl.textContent = message
  }

  /** 焦点落点：优先被点按钮的同位按钮；边界处该按钮已禁用（首行上移 / 末行下移）则退到该行首个可用操作钮 */
  private focusAction(index: number, action: RowAction): void {
    const actions = this.items[index]?.actions
    if (!actions) return
    const preferred = actions.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)
    if (preferred && !preferred.disabled) {
      preferred.focus()
      return
    }
    // 边界处优先退到「反向」操作钮（刚上移到首行 → 下移可撤销），再退首个可用
    const opposite = action === 'move-up' ? 'move-down' : action === 'move-down' ? 'move-up' : null
    const order: RowAction[] = opposite ? [opposite, ...ROW_ACTIONS] : [...ROW_ACTIONS]
    for (const candidate of order) {
      const btn = actions.querySelector<HTMLButtonElement>(`[data-action="${candidate}"]`)
      if (btn && !btn.disabled) {
        btn.focus()
        return
      }
    }
  }

  /** 聚焦新行首个可聚焦控件（oas-input 聚焦其内部 input） */
  private focusItem(index: number): void {
    const row = this.items[index]?.wrapper
    if (!row) return
    const oasInput = row.querySelector<HTMLElement>('oas-input')
    const inner = oasInput?.shadowRoot?.querySelector<HTMLElement>('input')
    if (inner) {
      inner.focus()
      return
    }
    row.querySelector<HTMLElement>('input, textarea, select, button, [tabindex]')?.focus()
  }
}

/** 列宽 → grid 轨道串（数字按 px；字符串原样；缺省等分且可收缩） */
function columnTrack(width: number | string | undefined): string {
  if (typeof width === 'number' && Number.isFinite(width) && width > 0) return `${Math.round(width)}px`
  if (typeof width === 'string' && width.trim() !== '') return width.trim()
  return 'minmax(0, 1fr)'
}
