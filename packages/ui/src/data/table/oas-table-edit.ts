import type { ReactiveController } from '@oas-ui/core'
import { editPath } from '@oas-ui/icons'
import type { EditOption, TableColumn, TableEditCapability } from './oas-table.js'
import { isTruthyCell } from './oas-table.js'
// 行内交互宿主排除清单：双击进编辑判定与行点击共用同一份（单一事实来源，
// 见 oas-table-interactive.js 的维护纪律注释——库内新增交互型组件须同步该清单）
import { ROW_INTERACTIVE_EXCLUSION } from './oas-table-interactive.js'

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
  notifyEdit(
    kind: 'edit' | 'edit-cancel',
    detail: {
      rowIndex: number
      key: string
      column: string
      value: string
    },
  ): void
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
  /** 编辑器类型：input / select（原生通道）/ component（editComponent 组件通道）/ overlay（浮层组件通道） */
  editor: 'input' | 'select' | 'component' | 'overlay'
  /** component 态的编辑器元素（value 属性语义的任意 WC） */
  componentEl: HTMLElement | null
  /** 浮层多值编辑器（oas-select multiple）：读值/提交走字符串数组形态（空数组为合法值） */
  multiEditor: boolean
  /** multiEditor 的初值快照（未变更判定用；非多值编辑器为 null） */
  oldArray: string[] | null
}

const EDIT_ICON = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${editPath}</svg>`

/**
 * 浮层类编辑器组件名单（editComponent 第二期 + multi-select 列默认编辑器）。
 * 这些组件的浮层面板挂在自身 shadow 内（select 为 position: fixed 的 .dropdown，仍在
 * 组件 shadowRoot 里），面板内点击会引发「焦点离开编辑器宿主」的 focusout——第一期
 * 通用失焦提交链会把面板内交互误判为离开编辑器（未选完就提交/拆编辑器）。
 * 名单内组件改走 buildOverlayEditor 浮层通道：自动展开、失焦抑制、Esc 双层级；
 * 名单外组件保持第一期通用组件通道。库内新增浮层编辑类组件时同步本名单。
 */
const OVERLAY_EDITOR_TAGS: ReadonlySet<string> = new Set(['oas-select', 'oas-date-picker'])

/** multi-select 列的默认浮层编辑器（第一期逗号分隔 input 通道已退役） */
const MULTI_SELECT_EDITOR_TAG = 'oas-select'

export class TableEditController implements ReactiveController, TableEditCapability {
  private hostEl: HTMLElement & TableEditHost
  private editState: EditState | null = null
  /** click 委托绑定的稳定 <table> 节点（重连幂等） */
  private delegatedTable: HTMLTableElement | null = null
  /** 手工双击判定的上一击签名（行 key + 列 key + 时间戳） */
  private lastCellClick: { key: string; col: string; time: number } | null = null

  constructor(host: HTMLElement & TableEditHost) {
    this.hostEl = host
  }

  /** 宿主连接：把 click 委托到稳定的 <table> 容器（手工双击判定） */
  hostConnected(): void {
    this.bindDelegatedClick()
  }

  /** 宿主断开连接：解绑委托 + 清掉进行中编辑对已脱离 DOM 节点的引用（重连后 update 整体重建） */
  hostDisconnected(): void {
    this.delegatedTable?.removeEventListener('click', this.onTableClick)
    this.delegatedTable?.removeEventListener('dblclick', this.onTableDblClick)
    this.delegatedTable = null
    this.lastCellClick = null
    this.teardownOverlayGuards()
    this.editState = null
  }

  /**
   * 双击进编辑必须手工判定且委托到稳定容器（原生 dblclick 在此架构下不可靠）：
   * 真实双击的首击触发行选中切换 → update() 同步重建 tbody → 被击 td 脱离文档 →
   * 浏览器判定两次点击目标不同，**dblclick 事件根本不派发**（逐 td 绑定/容器委托都收不到）。
   * 但两次 click 都会冒泡到 update 中存活的 <table> 节点——按「同行同列 + 时间窗」
   * 手工判定双击；命中时目标 td 已被重建（tr 选中处理器先于本委托执行），经 findRow/cellOf
   * 重查活节点再进编辑。判定窗口取 Windows 默认双击间隔 500ms。
   */
  private bindDelegatedClick(): void {
    if (this.delegatedTable) return
    const table = this.hostEl.shadowRoot?.querySelector('table') as HTMLTableElement | null
    if (!table) return
    this.delegatedTable = table
    table.addEventListener('click', this.onTableClick)
    table.addEventListener('dblclick', this.onTableDblClick)
  }

  /**
   * 原生 dblclick 兜底：无重建场景（如 checkable 表首击不触发行选中重建）浏览器正常派发；
   * 与手工判定相继命中同一格时经 enterEdit 同格重入守卫去重，不会重置进行中的编辑器。
   */
  private onTableDblClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement | null
    if (!target) return
    // 双击落在行内交互宿主（原生控件/库内交互组件/逃生口容器）上不进入编辑：
    // 内嵌 oas-button 等控件会被误判为「双击编辑」（与行点击排除同一清单）
    if (target.closest(ROW_INTERACTIVE_EXCLUSION)) return
    const td = target.closest('td.editable-cell') as HTMLTableCellElement | null
    if (!td) return
    this.enterEdit(td)
  }

  /** 委托的 click 处理：排除交互宿主内部；同行同列 500ms 内两击 = 双击进编辑 */
  private onTableClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement | null
    if (!target) return
    // 与 dblclick 兜底同源：行内交互宿主（含 data-oas-row-click-ignore 逃生口）上的
    // 连点不参与双击判定（否则控件上的快速两击会误判为「双击编辑」进入编辑态）
    if (target.closest(ROW_INTERACTIVE_EXCLUSION)) return
    const td = target.closest('td.editable-cell') as HTMLTableCellElement | null
    if (!td) return
    const sig = {
      key: td.closest('tr')?.getAttribute('data-key') ?? '',
      col: td.getAttribute('data-col') ?? '',
      time: Date.now(),
    }
    const prev = this.lastCellClick
    this.lastCellClick = sig
    if (!prev || prev.key !== sig.key || prev.col !== sig.col || sig.time - prev.time >= 500) {
      return
    }
    // 命中双击：本击已触发选中重建（tr 处理器先行），e.target 的 td 已脱离文档，重查活节点
    this.lastCellClick = null
    const freshTr = this.findRow(sig.key)
    const freshTd = freshTr ? this.cellOf(freshTr, sig.col) : null
    if (freshTd) this.enterEdit(freshTd)
  }

  // ==================== 渲染挂接点（宿主 buildRow / update 调用） ====================

  /** 可编辑单元格：可聚焦，Enter/F2 进编辑（双击走 <table> 稳定容器的手工判定委托，见
      bindDelegatedClick；编辑器内部按键会冒泡到此，需排除避免提交后被重入编辑） */
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
  }

  /** 操作列单元格：非编辑态显示 编辑，编辑态显示 保存/取消 */
  renderActionCell(td: HTMLTableCellElement, tr: HTMLTableRowElement): void {
    const key = tr.getAttribute('data-key') ?? ''
    const isEditing = this.editState?.key === key
    td.textContent = ''
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
    const edit = document.createElement('button')
    edit.className = 'action-btn'
    edit.setAttribute('part', 'action-edit')
    edit.textContent = this.hostEl.translateText('table.edit')
    edit.addEventListener('click', (e) => {
      e.stopPropagation()
      this.editRow(key)
    })
    // 两态按钮组同槽叠放（inline-grid 同格）：格子宽恒为两组最大值，进/出编辑操作列不宽窄跳变
    const editGroup = document.createElement('span')
    editGroup.className = `action-group${isEditing ? ' group-hidden' : ''}`
    editGroup.appendChild(edit)
    const editingGroup = document.createElement('span')
    editingGroup.className = `action-group${isEditing ? '' : ' group-hidden'}`
    editingGroup.append(save, cancel)
    const stack = document.createElement('span')
    stack.className = 'action-stack'
    stack.append(editGroup, editingGroup)
    td.appendChild(stack)
  }

  /** 外部重渲染（数据/排序/滚动等触发整体重建）前静默取消进行中的编辑 */
  settleEdit(): void {
    // 浮层编辑器的 document 级守卫不随编辑器 DOM 移除自动消失，重建取消时必须显式拆除
    //（否则泄漏的 Esc capture 会在表格外键盘流里误触发取消）
    this.teardownOverlayGuards()
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
    // 同格重入守卫：本格已在编辑时静默跳过（手工双击判定与原生 dblclick 可能相继命中同一格，
    // 重复进入会销毁进行中的编辑器并重置用户已输入内容）
    if (this.editState?.td === td) return
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
    // 编辑前原值（字符串形态）：multi-select 数组天然 join 为逗号形态展示
    const oldValue = String(row[colKey] ?? '')
    const displayIndex = this.displayIndexOf(tr)
    // 编辑器分派：editComponent 显式指定（浮层名单内走浮层通道，否则通用组件通道）>
    // 列 type 专属编辑器（checkbox 开关 / select 原生通道 / multi-select 浮层多选）>
    // editor 声明（select）> 默认原生 input
    const overlayTag = col.editComponent
      ? OVERLAY_EDITOR_TAGS.has(col.editComponent)
        ? col.editComponent
        : null
      : col.type === 'multi-select'
        ? MULTI_SELECT_EDITOR_TAG
        : null
    const multiOverlay = overlayTag === MULTI_SELECT_EDITOR_TAG && col.type === 'multi-select'
    const multiInitial = multiOverlay ? this.parseMultiInitial(row[colKey]) : null
    let editor: HTMLInputElement | HTMLSelectElement | HTMLElement
    let kind: EditState['editor']
    if (overlayTag) {
      editor = this.buildOverlayEditor(col, key, oldValue, overlayTag, multiInitial)
      kind = 'overlay'
    } else if (col.editComponent) {
      editor = this.buildFormComponentEditor(col, key, oldValue)
      kind = 'component'
    } else if (col.type === 'checkbox') {
      editor = this.buildCheckboxEditor(col, key, oldValue)
      kind = 'component'
    } else if (col.type === 'select' || col.editor === 'select') {
      editor = this.buildSelectEditor(col, key, oldValue)
      kind = 'select'
    } else {
      editor = this.buildInputEditor(col, key, oldValue)
      kind = 'input'
    }
    // 不可见占位：保留原单元格文本的布局贡献（auto 表格布局下列宽/行高与常态逐像素一致），
    // 编辑器绝对定位覆于其上零贡献——进/出编辑不撑列、不挤邻列、不跳行高
    const sizer = document.createElement('span')
    sizer.className = 'cell-editor-sizer'
    sizer.setAttribute('aria-hidden', 'true')
    sizer.textContent = td.textContent ?? ''
    td.textContent = ''
    td.append(sizer, editor)
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
      editor: kind,
      componentEl: kind === 'component' || kind === 'overlay' ? (editor as HTMLElement) : null,
      multiEditor: multiOverlay,
      oldArray: multiInitial,
    }
    // preventScroll：默认聚焦会让浏览器 scrollIntoView 编辑器（行虚拟下产生微 scroll →
    // 滚动重建路径 settleEdit 静默拆掉刚打开的编辑器——双击进编辑 30ms 内即被拆除，实测复现）
    editor.focus({ preventScroll: true })
    if (editor instanceof HTMLInputElement) editor.select()
    // 浮层编辑器：进入编辑自动展开面板 + 挂 document 级守卫（Esc 双层级 / 失焦抑制）
    if (kind === 'overlay') {
      this.openOverlayEditor(editor as HTMLElement)
      this.setupOverlayGuards()
    }
    this.refreshActionCells()
  }

  private buildInputEditor(col: TableColumn, key: string, value: string): HTMLInputElement {
    const input = document.createElement('input')
    input.type = 'text'
    // size=1：input 默认 size=20 的内在宽度（≈170px+）会成为 auto 表格布局下本列的
    // min-content 贡献，进编辑时把整列撑宽、邻列挤窄文字换行、行高联动跳变；
    // size=1 压掉内在贡献，实际宽度由 CSS width:100% 决定（贴合原单元格）
    input.size = 1
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
    // focusout（composed）而非 blur：shadow DOM 内部控件失焦时 blur 不跨边界，focusout 可冒泡
    input.addEventListener('focusout', (e: FocusEvent) => this.handleEditorBlur(e))
    return input
  }

  private buildSelectEditor(col: TableColumn, key: string, value: string): HTMLSelectElement {
    const select = document.createElement('select')
    select.className = 'cell-editor'
    select.setAttribute('part', 'cell-editor')
    select.setAttribute('aria-label', this.hostEl.translateText('table.editCell', { column: col.title, key }))
    // 选项来源：显式 editOptions 优先；type=select 列把展示 options 同步为编辑选项（同一份选项语义）
    for (const opt of this.editOptionsOf(col)) {
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
    select.addEventListener('focusout', (e: FocusEvent) => this.handleEditorBlur(e))
    return select
  }

  /**
   * select 通道的编辑选项：显式 editOptions 优先；type=select/multi-select 列回落展示 options
   *（options 与 editOptions 是同一份选项语义的两种声明位置）。
   */
  private editOptionsOf(col: TableColumn): EditOption[] {
    if (Array.isArray(col.editOptions) && col.editOptions.length > 0) return col.editOptions
    if (col.type === 'select' || col.type === 'multi-select') {
      return (col.options ?? []).map((o) => ({ label: o.label, value: o.value }))
    }
    return []
  }

  /**
   * checkbox 类型列的编辑器（editComponent 通道挂 oas-switch，非浮层 ✓）：
   * true-value/false-value 固定 'true'/'false'，读值链（getFormValue → value property →
   * value attribute）在开/关两态均得确定性字符串。
   */
  private buildCheckboxEditor(col: TableColumn, key: string, value: string): HTMLElement {
    const el = document.createElement('oas-switch') as HTMLElement
    el.className = 'cell-editor cell-editor-component'
    el.setAttribute('part', 'cell-editor')
    el.setAttribute('true-value', 'true')
    el.setAttribute('false-value', 'false')
    // 初值判定与展示侧同口径（isTruthyCell 含 'on'——表单序列化真值形态；
    // 漏判会让 'on' 值进编辑显示 off，失焦提交把数据静默翻转为 false——两模型交叉审同抓）
    const checked = isTruthyCell(value)
    el.setAttribute('value', checked ? 'true' : 'false')
    if ('value' in el) (el as unknown as { value?: unknown }).value = checked ? 'true' : 'false'
    el.setAttribute('aria-label', this.hostEl.translateText('table.editCell', { column: col.title, key }))
    const submit = (e: Event): void => {
      e.stopPropagation()
      this.submitEdit()
    }
    el.addEventListener('oas-change', submit)
    el.addEventListener('change', submit)
    el.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        this.cancelEdit()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        this.submitEdit()
      }
    })
    el.addEventListener('click', (e) => e.stopPropagation())
    el.addEventListener('focusout', (e: FocusEvent) => this.handleEditorBlur(e))
    return el
  }

  /**
   * 提交当前编辑（Enter / blur / 操作列保存）：
   * - 空值 → 还原旧值（默认非破坏）并派发 oas-edit-cancel（浮层多值编辑器除外：空数组是合法值）
   * - 值变化且非空 → 非受控模式回写 data 并派发 oas-edit；受控模式仅派发 oas-edit
   * - 值未变 → 静默退出
   */
  private submitEdit(): void {
    const st = this.editState
    if (!st) return
    const raw = this.readEditorRawValue(st)
    // 多值编辑器（oas-select multiple）以数组为提交语义：事件 detail 仍用逗号 join 字符串形态
    const isMulti = Array.isArray(raw)
    const value = isMulti ? raw.join(',') : raw
    const col = this.hostEl.effectiveColumns().find((c) => c.key === st.colKey)
    // 校验：自定义 validate 优先；type=date 且未自定义时内置 YYYY-MM-DD 形态校验
    //（失败无自定义文案，保持编辑态 + data-invalid 红框提示）
    let err: string | boolean | undefined
    if (col?.validate) {
      err = col.validate(value, st.row)
    } else if (col?.type === 'date' && value !== '' && value !== st.oldValue && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      // 内置校验豁免「未改动」：旧值是 ISO/时间戳形态时沿用原串提交不该被拦（否则无法退出编辑态）
      err = false
    }
    const invalid = err === false || (typeof err === 'string' && err.trim() !== '')
    this.renderEditError(st, invalid ? (typeof err === 'string' ? err : undefined) : undefined)
    if (invalid) {
      // 校验失败：保持编辑态、不提交（编辑器仍可编辑重试）；preventScroll 同 enterEdit（防微滚拆编辑）
      st.td.dataset.invalid = 'true'
      ;(st.componentEl as HTMLElement | null)?.focus?.({ preventScroll: true })
      st.td.querySelector<HTMLInputElement | HTMLSelectElement>('input, select')?.focus({ preventScroll: true })
      return
    }
    st.td.removeAttribute('data-invalid')
    this.exitEdit(st)
    // 空值取消仅针对字符串形态：多值编辑器的空数组是合法值（用户清空全部勾选 = 明确置空），照常提交
    if (!isMulti && value === '') {
      this.hostEl.notifyEdit('edit-cancel', this.editDetail(st, st.oldValue))
      this.focusCell(st.key, st.colKey)
      return
    }
    // checkbox 走语义相等（'on'/'true'/'1' 同真——原始形态与编辑器读值形态不同但语义未变，不得误判为变化改写数据）；
    // 多值走数组全等（顺序敏感：选择顺序变化视为变化，按新顺序回写）
    const unchanged = isMulti
      ? this.multiValuesEqual(raw, st.oldArray ?? [])
      : col?.type === 'checkbox'
        ? isTruthyCell(value) === isTruthyCell(st.oldValue)
        : value === st.oldValue
    if (!unchanged) {
      if (!this.hostEl.hasAttribute('edit-controlled')) {
        st.row[st.colKey] = isMulti ? raw : this.coerceEditValue(st, value)
        this.hostEl.setAttribute('data', JSON.stringify(this.hostEl.data))
      }
      this.hostEl.notifyEdit('edit', this.editDetail(st, value))
    }
    this.focusCell(st.key, st.colKey)
  }

  /** 多选值全等（同长同序同项） */
  private multiValuesEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i])
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
    this.teardownOverlayGuards()
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
    if (this.editState.editor === 'overlay') {
      const el = this.editState.componentEl
      // 焦点在浮层编辑器组件自身 shadow 内转移（如进入编辑自动展开时 trigger → 面板网格、
      // trigger → 搜索框）：不是离开编辑器。兼容两种环境——真实浏览器把 relatedTarget retarget
      // 成宿主元素（related === el），happy-dom 保留原始内部节点（el.shadowRoot.contains 命中）
      if (
        el &&
        related &&
        (related === el || (el.contains(related) as boolean) || (el.shadowRoot?.contains(related) ?? false))
      ) {
        return
      }
      // 浮层内指针交互（点选项/滚动条等非焦点元素）引发的焦点转移：见 onDocumentPointerdown
      if (this.pointerInEditor) return
    }
    this.submitEdit()
  }

  /**
   * 编辑器读值（统一入口）：浮层通道区分多值（数组形态）与单值（字符串形态），
   * 其余通道恒为字符串。多值读 value attribute 的 JSON 数组（oas-select multiple 的
   * 受控源即 value 属性）；单值沿用 getFormValue → value attribute 兜底链。
   */
  private readEditorRawValue(st: EditState): string | string[] {
    if (st.editor === 'overlay') {
      const el = st.componentEl ?? st.td.querySelector<HTMLElement>('.cell-editor-component')
      if (!el) return st.multiEditor ? (st.oldArray ?? []) : st.oldValue
      if (st.multiEditor) return this.readOverlayArrayValue(el)
      // 单值浮层组件：getFormValue 优先（库内 form-associated 钩子；仅收字符串形态——
      // 多值/范围形态返回 FormData，落到 value attribute 兜底），value attribute 次之
      const withHook = el as unknown as { getFormValue?: () => unknown }
      if (typeof withHook.getFormValue === 'function') {
        const v = withHook.getFormValue()
        if (typeof v === 'string' && v !== '') return v
      }
      return el.getAttribute('value') ?? st.oldValue
    }
    return this.readEditorValue(st)
  }

  /** 浮层多值编辑器读值：value attribute 的 JSON 数组（非法/非数组回落空数组） */
  private readOverlayArrayValue(el: HTMLElement): string[] {
    try {
      const parsed: unknown = JSON.parse(el.getAttribute('value') ?? '[]')
      return Array.isArray(parsed) ? parsed.map((v) => String(v)) : []
    } catch {
      return []
    }
  }

  /**
   * multi-select 列初值归一为数组：数组原样（String 归一）；字符串按逗号拆分 trim 空段
   *（兼容第一期逗号分隔 input 通道存储的字符串形态数据）；其余（null/undefined 等）空集。
   */
  private parseMultiInitial(raw: unknown): string[] {
    if (Array.isArray(raw)) return raw.map((v) => String(v))
    if (typeof raw === 'string') {
      return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }
    return []
  }

  private readEditorValue(st: EditState): string {
    if (st.editor === 'component') {
      // 组件编辑器读值优先级：getFormValue()（库内 form 组件 form-associated 钩子）→
      // value property（宿主自定义 WC 常见形态）→ value attribute 兜底。
      // 库内组件用户输入不回写 attribute，只读 attribute 会拿到初始值（实抓的假绿根因）
      const el = st.componentEl ?? st.td.querySelector<HTMLElement>('.cell-editor-component')
      if (!el) return st.oldValue
      const withHook = el as unknown as { getFormValue?: () => unknown }
      if (typeof withHook.getFormValue === 'function') {
        const v = withHook.getFormValue()
        if (v !== null && v !== undefined) return String(v)
      }
      // 'value' in el 判定真 property（含原型链与 class field）：注入对无 property 元素不建
      // expando（见 buildFormComponentEditor），故此处 in 命中即真 property；无条件读
      // el.value 会把注入期 expando 当初值返回，attribute-only 组件的新值被静默吞掉
      if ('value' in el) {
        const prop = (el as unknown as { value?: unknown }).value
        if (prop !== undefined && prop !== null) return String(prop)
      }
      return el.getAttribute('value') ?? st.oldValue
    }
    if (st.editor === 'select') {
      const sel = st.td.querySelector<HTMLSelectElement>('select.cell-editor')
      return sel ? sel.value : st.oldValue
    }
    const input = st.td.querySelector<HTMLInputElement>('input.cell-editor')
    return input ? input.value : st.oldValue
  }

  /**
   * 组件编辑器（editComponent 通道）：创建对应 WC、注入初值与提交/取消语义。
   * 契约（最小集）：可读当前值（getFormValue() / value property / value attribute 三级兜底）、
   * 提交事件（oas-change 或 change 二者其一）、Esc 取消。
   * 库内 form 组件天然满足（派发 oas-change、值经 getFormValue 可读）；宿主自定义 WC 常以
   * value property + 原生 change 接入。多行编辑器（textarea 内核）Enter 让路换行，提交走失焦。
   */
  private buildFormComponentEditor(col: TableColumn, key: string, value: string): HTMLElement {
    const el = document.createElement(col.editComponent!) as HTMLElement
    el.className = 'cell-editor cell-editor-component'
    el.setAttribute('part', 'cell-editor')
    // 初值双注入：attribute（attribute-only 契约组件）+ property（仅当元素真拥有 value
    // property——含原型链与 class field；无条件赋值会给无 property 元素建 expando，读值时
    // expando 先于 attribute 命中，attribute-only 组件的用户新值被静默吞掉——实抓）
    el.setAttribute('value', value)
    if ('value' in el) (el as unknown as { value?: unknown }).value = value
    el.setAttribute('aria-label', this.hostEl.translateText('table.editCell', { column: col.title, key }))
    // 并听 oas-change（库内组件经 core emit 统一 oas- 前缀）与原生 change（宿主自定义 WC 常用）：
    // submitEdit 的 editState 空守卫保证同名双派发时第二次调用幂等
    const submit = (e: Event): void => {
      e.stopPropagation()
      this.submitEdit()
    }
    el.addEventListener('oas-change', submit)
    el.addEventListener('change', submit)
    el.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        this.cancelEdit()
      } else if (e.key === 'Enter') {
        // 多行编辑器（textarea 内核）Enter 让路换行：提交交给失焦（focusout）/change
        const multiline = el instanceof HTMLTextAreaElement || el.shadowRoot?.querySelector('textarea') != null
        if (multiline) return
        e.preventDefault()
        this.submitEdit()
      }
    })
    el.addEventListener('click', (e) => e.stopPropagation())
    // focusout（composed）而非 blur：编辑器为自定义元素时焦点落在 shadow 内部控件上，
    // blur 不跨 shadow 边界，宿主上的 blur 监听永不触发（点击表格外滞留编辑态）
    el.addEventListener('focusout', (e: FocusEvent) => this.handleEditorBlur(e))
    return el
  }

  /**
   * 浮层组件编辑器（editComponent 第二期：oas-select / oas-date-picker；multi-select
   * 类型列的默认编辑器同样走本通道——oas-select multiple）。与非浮层组件通道的差异：
   * - 挂载后自动展开浮层：模拟触发器 click 走组件**非受控**开合通道——不写 open 属性
   *  （open 是受控模式：写人后组件只派 oas-open-change 不自行收合，面板会被钉死）。
   *  组件未注册（宿主笔误/漏 import）时挂载即白板，不展开不告警——对齐第一期通道行为。
   * - 浮层内指针交互不误提交：document 级 pointerdown/mousedown capture 维护「指针在
   *  编辑器子树内」抑制窗口，配合 handleEditorBlur 的失焦抑制（见该处注释）。
   * - Esc 双层级：document 级 keydown capture 先于组件内部 Esc 处理——浮层开着让组件
   *  自关面板（不取消编辑），浮层已关才取消编辑。
   * - 提交语义：单值浮层组件选定即提交（oas-change）；多选浮层组件勾选是中间态不提交，
   *  失焦/外点一次性提交数组（空数组为合法值回写 []）。
   */
  private buildOverlayEditor(
    col: TableColumn,
    key: string,
    value: string,
    tag: string,
    multiInitial: string[] | null,
  ): HTMLElement {
    const el = document.createElement(tag) as HTMLElement
    el.className = 'cell-editor cell-editor-component cell-editor-overlay'
    el.setAttribute('part', 'cell-editor')
    const multi = tag === MULTI_SELECT_EDITOR_TAG && col.type === 'multi-select'
    if (tag === MULTI_SELECT_EDITOR_TAG) {
      // 选项同步：editOptions 优先，回落列 options（与展示侧同一份选项语义）；
      // value 统一归一字符串——oas-select 的 options 解析只收字符串 value，数字 value 会被过滤丢失
      const opts = this.editOptionsOf(col).map((o) => ({ label: o.label, value: String(o.value) }))
      el.setAttribute('options', JSON.stringify(opts))
      if (multi) {
        // 多选初值为 JSON 数组（oas-select multiple 的 value attribute 契约形态）
        el.setAttribute('multiple', '')
        el.setAttribute('value', JSON.stringify(multiInitial ?? []))
      } else {
        el.setAttribute('value', value)
      }
    } else {
      // date-picker 等 attribute-only 浮层组件：初值走 value attribute
      //（date-picker 值契约为格式化字符串，缺省 yyyy-MM-dd；旧值是时间戳/带时刻形态时
      // 组件解析不出锚点显示为空——属组件解析边界，提交未改动值仍走原串静默退出不丢数据）
      el.setAttribute('value', value)
    }
    el.setAttribute('aria-label', this.hostEl.translateText('table.editCell', { column: col.title, key }))
    if (!multi) {
      // 单值浮层组件：选定即提交（oas-change）；多选不在此提交（勾选是中间态）
      el.addEventListener('oas-change', (e) => {
        e.stopPropagation()
        this.submitEdit()
      })
    }
    // 面板在组件 shadow 内，click 冒泡出宿主会参与表格双击判定/行级手势，统一拦在编辑器层
    el.addEventListener('click', (e) => e.stopPropagation())
    el.addEventListener('focusout', (e: FocusEvent) => this.handleEditorBlur(e))
    return el
  }

  /** 进入编辑自动展开浮层：模拟触发器 click（非受控开合通道）。组件未注册时不动作（白板对齐第一期） */
  private openOverlayEditor(el: HTMLElement): void {
    if (customElements.get(el.tagName.toLowerCase()) === undefined) return
    // 触发器为库内浮层组件的统一内部结构（select 的 button.trigger / date-picker 的 input.trigger）
    el.shadowRoot?.querySelector<HTMLElement>('.trigger')?.click()
  }

  /** 浮层开合态：读触发器 aria-expanded 镜像（两组件的触发器均同步该 aria 状态） */
  private overlayOpen(el: HTMLElement | null): boolean {
    return el?.shadowRoot?.querySelector<HTMLElement>('.trigger')?.getAttribute('aria-expanded') === 'true'
  }

  /** 浮层编辑器 document 级守卫是否在场（幂等拆挂开关） */
  private overlayGuardsActive = false
  /** 最近一次指针按下是否落在浮层编辑器子树内（面板内交互的失焦抑制窗口） */
  private pointerInEditor = false

  /** 挂浮层编辑器守卫（Esc 双层级 + 指针抑制），重复进入先拆旧（幂等） */
  private setupOverlayGuards(): void {
    this.teardownOverlayGuards()
    this.overlayGuardsActive = true
    document.addEventListener('keydown', this.onDocumentKeydown, true)
    document.addEventListener('pointerdown', this.onDocumentPointerdown, true)
    document.addEventListener('mousedown', this.onDocumentPointerdown, true)
  }

  /** 拆浮层编辑器守卫（退出编辑/静默取消/宿主断开三路都必须到达，否则 document 监听泄漏） */
  private teardownOverlayGuards(): void {
    if (!this.overlayGuardsActive) return
    this.overlayGuardsActive = false
    this.pointerInEditor = false
    document.removeEventListener('keydown', this.onDocumentKeydown, true)
    document.removeEventListener('pointerdown', this.onDocumentPointerdown, true)
    document.removeEventListener('mousedown', this.onDocumentPointerdown, true)
  }

  /**
   * document keydown capture：Esc 双层级 + 键盘输入解除指针抑制。
   * capture 先于组件内部 Esc 处理执行——此刻读到的浮层开合态还是「处理前」的真值：
   * 开着 → 直接放行（组件自关面板，同一事件继续传播到组件）；已关 → 本层消费（取消编辑
   * 并 stopPropagation，防组件把 Esc 再当开合手势）。
   */
  private onDocumentKeydown = (e: KeyboardEvent): void => {
    // 任何键盘输入都解除指针抑制窗口：键盘引发的失焦（如 Tab 离开）不得被陈旧的
    // 「指针在面板内」状态挡住（那会滞留编辑态无法用键盘退出）
    this.pointerInEditor = false
    if (e.key !== 'Escape') return
    const st = this.editState
    if (!st || st.editor !== 'overlay') return
    if (this.overlayOpen(st.componentEl)) return
    e.preventDefault()
    e.stopPropagation()
    this.cancelEdit()
  }

  /** document pointerdown/mousedown capture：维护「指针是否落在浮层编辑器子树内」窗口 */
  private onDocumentPointerdown = (e: Event): void => {
    const st = this.editState
    if (!st || st.editor !== 'overlay') return
    this.pointerInEditor = !!st.componentEl && e.composedPath().includes(st.componentEl)
  }

  /**
   * 编辑提交值的类型回写：按列 type 归一化——
   * - number/currency：数字（非法输入原样字符串交由展示端空态回落）；
   * - progress：数字夹取 0-100；rate：数字夹取 0-5；
   * - checkbox：布尔；
   * - multi-select 不经此函数（浮层多选通道直接回写字符串数组，逗号拆分通道已退役）；
   * - 其余：现状行为（旧值 number 且新值为有限数字 → 保持 number 类型回写）。
   */
  private coerceEditValue(st: EditState, value: string): string | number | boolean | string[] {
    const col = this.hostEl.effectiveColumns().find((c) => c.key === st.colKey)
    switch (col?.type) {
      case 'number':
      case 'currency': {
        const n = Number(value)
        return Number.isFinite(n) ? n : value
      }
      case 'progress': {
        const n = Number(value)
        return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : value
      }
      case 'rate': {
        const n = Number(value)
        return Number.isFinite(n) ? Math.min(5, Math.max(0, n)) : value
      }
      case 'checkbox':
        return isTruthyCell(value)
      default: {
        // 数字列先例（type 未声明列保持现状）：旧值 number 且新值合法数字 → 数值回写
        const old = st.row[st.colKey]
        if (typeof old === 'number' && value !== '' && Number.isFinite(Number(value))) {
          return Number(value)
        }
        return value
      }
    }
  }

  private editDetail(st: EditState, value: string): { rowIndex: number; key: string; column: string; value: string } {
    return { rowIndex: st.displayIndex, key: st.key, column: st.colKey, value }
  }

  /** 编辑结束后焦点还给单元格（非受控提交已重建，需重查） */
  private focusCell(key: string, colKey: string): void {
    const tr = this.findRow(key)
    const td = tr ? this.cellOf(tr, colKey) : null
    td?.focus()
  }

  /** 操作列按钮：编辑 → 进入该行首个可编辑列编辑模式（column-virtual 下目标列滚出
      列窗口时回退到窗口内首个可编辑列——窗口外 td 不存在，静默无反应对用户是死交互） */
  private editRow(key: string): void {
    // 另一行正在编辑时先提交（非受控可能触发重渲染，随后重查 tr）
    if (this.editState) this.submitEdit()
    const tr = this.findRow(key)
    if (!tr) return
    for (const col of this.hostEl.effectiveColumns()) {
      if (!col.editable) continue
      const td = this.cellOf(tr, col.key)
      if (td) {
        this.enterEdit(td)
        return
      }
    }
  }

  /** 编辑状态变化后重渲染可见行的操作列（避免整表重建） */
  private refreshActionCells(): void {
    const body = this.hostEl.shadowRoot?.querySelector('tbody')
    if (!body) return
    const actionCol = this.hostEl.effectiveColumns().find((c) => c.actions)
    if (!actionCol) return
    for (const tr of body.querySelectorAll('tr.row')) {
      const td = tr.querySelector(`td[data-col="${CSS.escape(actionCol.key)}"]`)
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
    // 按 data-col 查询（与 applyRowMerge 同范式）：column-virtual 下 tr 内 td 序列含占位格
    // （colSpan 归并），「索引 = 列索引 + 前置列数」的换算会错位到占位格/错误列
    return tr.querySelector<HTMLTableCellElement>(`td[data-col="${CSS.escape(colKey)}"]`)
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
