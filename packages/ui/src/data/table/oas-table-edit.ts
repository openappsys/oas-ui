import type { ReactiveController } from '@oas-ui/core'
import { editPath } from '@oas-ui/icons'
import type { TableColumn, TableEditCapability } from './oas-table.js'

/**
 * 行内编辑能力（edit 能力包）：把「编辑 + 校验 machinery」从 OASTableBase 外置为
 * ReactiveController，经能力注册表（oas-table-capability.js）注入宿主。
 *
 * 与列设置能力（纯行为类，hostUpdated 后扫 DOM 绑事件）不同：编辑与渲染管线深度耦合
 * ——buildRow 的 editable/actions 分支要按编辑态渲染单元格、退出编辑要经 cellNode
 * 重画富内容、EditState 持有 DOM 引用。因此本 controller 同时实现 TableEditCapability
 * 的渲染挂接点（decorateCell / renderActionCell / settleEdit），由宿主在渲染管线中回调；
 * 其余编辑交互（双击/Enter/F2 进编辑、input/select 编辑器、校验、提交/取消）全部内聚在本文件。
 *
 * 宿主能力经 TableEditHost 面访问（与列设置一致：controller 不感知宿主实现细节）。
 */

/** 行内编辑宿主能力面（OASTableBase 公开实现；controller 仅经此访问宿主） */
export interface TableEditHost {
  /** 有效列（column-keys / hidden 过滤后的渲染列，与 buildRow 用同一份） */
  effectiveColumns(): TableColumn[]
  /** 重绘单元格为常规展示内容（尊重 render/cellTemplate 富内容；编辑退出/取消后还原用） */
  paintCell(td: HTMLTableCellElement, col: TableColumn, row: Record<string, unknown>): void
  /** 翻译内置文案（就近 config-provider / locale） */
  translateText(key: string, params?: Record<string, string | number>): string
  /** 派发编辑结果事件（提交/取消；事件名集中于此，detail 由本 controller 组好） */
  notifyEdit(kind: 'edit' | 'edit-cancel', detail: {
    rowIndex: number
    key: string
    column: string
    value: string
  }): void
  /** 行数据（提交回写时经此取当前全量） */
  readonly data: Array<Record<string, unknown>>
}

/** 行内编辑进行中的单元格状态（同一时刻至多一格在编辑） */
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

const EDIT_ICON = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${editPath}</svg>`

export class TableEditController implements ReactiveController, TableEditCapability {
  private hostEl: HTMLElement & TableEditHost
  private editState: EditState | null = null

  constructor(host: HTMLElement & TableEditHost) {
    this.hostEl = host
  }

  /** 宿主断开连接：清掉进行中编辑对已脱离 DOM 节点的引用（重连后 update 整体重建） */
  hostDisconnected(): void {
    this.editState = null
  }

  // ==================== 渲染挂接点（宿主 buildRow / update 调用） ====================

  /** 可编辑单元格：可聚焦，Enter/F2/双击进入编辑（仅响应单元格自身事件，
      编辑器内部按键/双击会冒泡到此，需排除避免提交后被重入编辑） */
  decorateCell(td: HTMLTableCellElement, col: TableColumn): void {
    if (!this.editingEnabled(col)) return
    td.tabIndex = 0
    td.classList.add('editable-cell')
    // 可感知线索：title 提示进入方式 + 铅笔图标（hover/focus-visible 时显现）
    td.title = this.hostEl.translateText('table.editHint')
    this.appendEditAffordance(td)
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

  /** 操作列单元格：非编辑态显示 编辑，编辑态显示 保存/取消 */
  renderActionCell(td: HTMLTableCellElement, tr: HTMLTableRowElement): void {
    const key = tr.getAttribute('data-key') ?? ''
    const isEditing = this.editState?.key === key
    td.textContent = ''
    if (isEditing) {
      const save = document.createElement('button')
      save.className = 'action-btn save'
      save.setAttribute('part', 'action-save')
      save.textContent = this.hostEl.translateText('table.save')
      save.addEventListener('click', (e) => {
        e.stopPropagation()
        this.submitEdit()
      })
      const cancel = document.createElement('button')
      cancel.className = 'action-btn danger'
      cancel.setAttribute('part', 'action-cancel')
      cancel.textContent = this.hostEl.translateText('table.cancel')
      cancel.addEventListener('click', (e) => {
        e.stopPropagation()
        this.cancelEdit()
      })
      td.append(save, cancel)
    } else {
      const edit = document.createElement('button')
      edit.className = 'action-btn'
      edit.setAttribute('part', 'action-edit')
      edit.textContent = this.hostEl.translateText('table.edit')
      edit.addEventListener('click', (e) => {
        e.stopPropagation()
        this.editRow(key)
      })
      td.appendChild(edit)
    }
  }

  /** 外部重渲染（数据/排序/滚动等触发整体重建）前静默取消进行中的编辑 */
  settleEdit(): void {
    this.editState = null
  }

  // ==================== 编辑交互 ====================

  /** 表格级 editable 开关 + 列级 editable 双重要求 */
  private editingEnabled(col: TableColumn): boolean {
    return this.hostEl.hasAttribute('editable') && Boolean(col.editable)
  }

  /** 可编辑单元格挂铅笔图标（右上角绝对定位，hover/focus-visible 时显现；aria-hidden 不给读屏噪音） */
  private appendEditAffordance(td: HTMLTableCellElement): void {
    const icon = document.createElement('span')
    icon.className = 'cell-edit-icon'
    icon.setAttribute('aria-hidden', 'true')
    icon.innerHTML = EDIT_ICON
    td.appendChild(icon)
  }

  /** 双击 / Enter / F2 / 操作列按钮 → 进入编辑模式 */
  private enterEdit(td: HTMLTableCellElement): void {
    // 防御：两次点击之间表格重渲染导致 td 被整体重建（脱离文档）时不再进入编辑，
    // 否则编辑器会创建在游离节点上（不可见但状态被占用）
    if (!td.isConnected) return
    const colKey = td.getAttribute('data-col') ?? ''
    if (!colKey) return
    const col = this.hostEl.effectiveColumns().find((c) => c.key === colKey)
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
    input.setAttribute('aria-label', this.hostEl.translateText('table.editCell', { column: col.title, key }))
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
    select.setAttribute('aria-label', this.hostEl.translateText('table.editCell', { column: col.title, key }))
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
    const col = this.hostEl.effectiveColumns().find((c) => c.key === st.colKey)
    const err = col?.validate ? col.validate(value, st.row) : undefined
    const invalid = err === false || (typeof err === 'string' && err.trim() !== '')
    this.renderEditError(st, invalid ? (typeof err === 'string' ? err : undefined) : undefined)
    if (invalid) {
      // 校验失败：保持编辑态、不提交（编辑器仍可编辑重试）
      st.td.dataset.invalid = 'true'
      st.td.querySelector<HTMLInputElement | HTMLSelectElement>('input, select')?.focus()
      return
    }
    st.td.removeAttribute('data-invalid')
    this.exitEdit(st)
    if (value === '') {
      this.hostEl.notifyEdit('edit-cancel', this.editDetail(st, st.oldValue))
      this.focusCell(st.key, st.colKey)
      return
    }
    if (value !== st.oldValue) {
      if (!this.hostEl.hasAttribute('edit-controlled')) {
        st.row[st.colKey] = this.coerceEditValue(st, value)
        this.hostEl.setAttribute('data', JSON.stringify(this.hostEl.data))
      }
      this.hostEl.notifyEdit('edit', this.editDetail(st, value))
    }
    this.focusCell(st.key, st.colKey)
  }

  /** 编辑校验错误展示：写入/清除 td 的 error 消息（重渲染编辑器时保留该错误于单元格内） */
  private renderEditError(st: EditState, message: string | undefined): void {
    let el = st.td.querySelector<HTMLElement>('.edit-error')
    if (message) {
      if (!el) {
        el = document.createElement('span')
        el.className = 'edit-error'
        st.td.appendChild(el)
      }
      el.textContent = message
      st.td.classList.add('edit-invalid')
    } else if (el) {
      el.remove()
      st.td.classList.remove('edit-invalid')
    }
  }

  /** 取消当前编辑（Esc / 操作列取消）：还原旧值并派发 oas-edit-cancel */
  private cancelEdit(): void {
    const st = this.editState
    if (!st) return
    const detail = this.editDetail(st, st.oldValue)
    this.exitEdit(st)
    this.hostEl.notifyEdit('edit-cancel', detail)
    this.focusCell(st.key, st.colKey)
  }

  /** 退出编辑态：还原单元格展示、清除高亮、刷新操作列按钮 */
  private exitEdit(st: EditState): void {
    // 先置 null：清 td 会移除聚焦的 input 触发 blur，若 editState 未清空，blur→handleEditorBlur→submitEdit 会把值误提交
    this.editState = null
    const col = this.hostEl.effectiveColumns().find((c) => c.key === st.colKey)
    if (col) {
      // 退出编辑后单元格重画走与正常渲染一致的 cellNode（尊重 render/cellTemplate 富内容），而非裸 textContent
      this.hostEl.paintCell(st.td, col, st.row)
      // 可编辑单元格：铅笔图标在进入编辑时随 textContent 清空，退出后恢复
      if (this.editingEnabled(col)) this.appendEditAffordance(st.td)
    } else {
      st.td.textContent = ''
    }
    st.td.classList.remove('editing')
    st.td.removeAttribute('data-editing')
    this.headerTh(st.colKey)?.removeAttribute('data-editing-col')
    this.refreshActionCells()
  }

  private handleEditorBlur(e: FocusEvent): void {
    if (!this.editState) return
    const related = e.relatedTarget as Node | null
    // 焦点移至组件内部（操作列保存/取消按钮）时交给按钮 click，避免双重提交
    if (related && this.hostEl.shadowRoot?.contains(related)) return
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
    const colIndex = this.hostEl.effectiveColumns().findIndex((c) => c.editable)
    if (colIndex < 0) return
    const td = this.cellOf(tr, this.hostEl.effectiveColumns()[colIndex]!.key)
    if (td) this.enterEdit(td)
  }

  /** 编辑状态变化后重渲染可见行的操作列（避免整表重建） */
  private refreshActionCells(): void {
    const body = this.hostEl.shadowRoot?.querySelector('tbody')
    if (!body) return
    const actionIndex = this.hostEl.effectiveColumns().findIndex((c) => c.actions)
    if (actionIndex < 0) return
    const offset = this.tdOffset(actionIndex)
    for (const tr of body.querySelectorAll('tr.row')) {
      const td = tr.querySelectorAll('td')[offset]
      if (td) this.renderActionCell(td as HTMLTableCellElement, tr as HTMLTableRowElement)
    }
  }

  // ==================== DOM 映射辅助（编辑持有单元格 DOM 引用，随重渲染重查） ====================

  private headerTh(colKey: string): HTMLElement | null {
    const thead = this.hostEl.shadowRoot?.querySelector('thead')
    if (!thead) return null
    for (const th of thead.querySelectorAll('th[data-key]')) {
      if (th.getAttribute('data-key') === colKey) return th as HTMLElement
    }
    return null
  }

  private findRow(key: string): HTMLTableRowElement | null {
    const body = this.hostEl.shadowRoot?.querySelector('tbody')
    if (!body) return null
    for (const tr of body.querySelectorAll('tr.row')) {
      if (tr.getAttribute('data-key') === key) return tr as HTMLTableRowElement
    }
    return null
  }

  private cellOf(tr: HTMLTableRowElement, colKey: string): HTMLTableCellElement | null {
    const colIndex = this.hostEl.effectiveColumns().findIndex((c) => c.key === colKey)
    if (colIndex < 0) return null
    const td = tr.querySelectorAll('td')[this.tdOffset(colIndex)]
    return (td as HTMLTableCellElement | undefined) ?? null
  }

  private rowKeyOf(td: HTMLTableCellElement): string {
    const tr = td.closest('tr')
    return tr?.getAttribute('data-key') ?? ''
  }

  private displayIndexOf(tr: HTMLTableRowElement): number {
    const body = this.hostEl.shadowRoot?.querySelector('tbody')
    if (!body) return -1
    return [...body.querySelectorAll('tr.row')].indexOf(tr)
  }

  /** 数据列 td 在 tr 内的索引（勾选列占一列时偏移） */
  private tdOffset(colIndex: number): number {
    return colIndex + (this.hostEl.hasAttribute('checkable') ? 1 : 0)
  }

  /** 按行键在数据树中找行对象（提交时回写用） */
  private findDataRow(
    key: string,
    nodes: Array<Record<string, unknown>> = this.hostEl.data,
  ): Record<string, unknown> | null {
    const rowKey = this.hostEl.getAttribute('row-key') ?? 'key'
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
}

/** 便捷：构造编辑能力 controller（供能力注册表 / 组装类 addController 用） */
export function createEditController(host: HTMLElement & TableEditHost): TableEditController {
  return new TableEditController(host)
}
