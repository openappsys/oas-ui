import { OASElement } from '@oas-ui/core/oas-element'
import { isRtl } from '../../shared/direction.js'
import { devWarn } from '../../shared/dev-warn.js'
import { stableHash36 } from '../../shared/stable-id.js'

/**
 * oas-matrix —— 矩阵题（form 族）。
 *
 * 行 = 子问题、列 = 选项的矩阵选择；`mode="radio"` 行内单选、`mode="checkbox"` 行内多选。
 *
 * 属性（kebab-case）：
 * - `rows`：行（子问题）JSON 数组 `[{ key, label?, disabled? }]`；字符串项按 `key=label` 收敛
 * - `columns`：列（选项）JSON 数组，形态同 `rows`
 * - `mode`：`radio`（默认）| `checkbox`
 * - `value`：JSON 对象——radio `{ rowKey: columnKey }` / checkbox `{ rowKey: [columnKey] }`
 * - `required`：必答；`required-scope="row"`（默认，每行必选）/ `"table"`（全表至少一行作答）
 * - `disabled` / `readonly`：批量禁用 / 只读（只读保持正常外观，不响应交互）
 * - `label`：题面文本（同时作为分组可访问名称）
 *
 * 事件（bubbles + composed）：
 * - `oas-change`：用户改变选择，`detail: { value, rowKey, columnKey, checked }`
 * - `oas-invalid`：`validate()` 未通过，`detail: { reason: 'required', scope, missingRows, value }`
 *
 * 方法：
 * - `validate()`：校验必答语义并同步可视错误，返回是否通过
 * - `clear()`：清空全部选择（派发 `oas-change`）
 *
 * a11y：每行一个 `fieldset` + `legend`（行标题），选项为原生 `input[type=radio|checkbox]`；
 * 列头可见、输入以 `aria-labelledby` 关联「行标题 + 列头」，行头与列头都可朗读；
 * 方向键在行内移动（radio 行同时选中，roving tabindex）、Home/End 跳到首/末列。
 *
 * @summary 矩阵题选择（行 × 列，单选/多选）
 */

export interface MatrixRow {
  key: string
  label: string
  disabled?: boolean
}

export interface MatrixColumn {
  key: string
  label: string
  disabled?: boolean
}

export type MatrixMode = 'radio' | 'checkbox'

export type MatrixValue = Record<string, string | string[]>

type RequiredScope = 'row' | 'table'

const VALID_MODES: string[] = ['radio', 'checkbox']
const VALID_SCOPES: string[] = ['row', 'table']

const warned = new Set<string>()
function warnOnce(message: string): void {
  if (warned.has(message)) return
  warned.add(message)
  devWarn(message)
}

const STYLE = `
:host {
  display: block;
  box-sizing: border-box;
  inline-size: 100%;
  font-family: inherit;
  /* 行标题列宽（宿主可覆盖做细调） */
  --oas-matrix-label-width: 34%;
}
:host([hidden]) {
  display: none !important;
}
.matrix {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
}
.caption {
  font-weight: 600;
}
.caption[hidden] {
  display: none;
}
.scroll {
  overflow-x: auto;
}
.scroll[hidden] {
  display: none;
}
.head {
  display: flex;
  padding-inline-start: var(--oas-matrix-label-width);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.head[hidden] {
  display: none;
}
.head-cols {
  display: flex;
  flex: 1 1 auto;
  min-inline-size: 0;
}
.head-cell {
  flex: 1 1 0;
  min-inline-size: 0;
  padding: var(--oas-space-1) var(--oas-space-2);
  text-align: center;
  overflow-wrap: anywhere;
}
.head-cell[data-disabled] {
  color: var(--oas-color-text-disabled);
}
.row {
  position: relative;
  min-inline-size: 0;
  margin: 0;
  padding: 0;
  padding-inline-start: var(--oas-matrix-label-width);
  border: 0;
}
.row + .row {
  margin-block-start: var(--oas-space-1);
}
.row-label {
  position: absolute;
  inset-inline-start: 0;
  inset-block: 0;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: var(--oas-matrix-label-width);
  padding: 0;
  padding-inline-end: var(--oas-space-3);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  font-weight: 500;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.row[data-disabled] .row-label {
  color: var(--oas-color-text-disabled);
}
.row[data-invalid] .row-label {
  color: var(--oas-color-danger-text);
}
.cells {
  display: flex;
  min-inline-size: 0;
}
.cell {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  min-inline-size: 0;
  min-block-size: var(--oas-touch-target-min);
  margin: 0;
  border-radius: var(--oas-radius-md);
  cursor: pointer;
  transition: background-color var(--oas-transition-fast) var(--oas-ease-out);
}
.cell:hover {
  background: var(--oas-color-bg-hover);
}
.cell[data-checked] {
  background: color-mix(in srgb, var(--oas-color-primary) 10%, transparent);
}
.cell[data-cell-disabled] {
  background: var(--oas-color-bg-disabled);
  cursor: not-allowed;
}
.cell[data-cell-disabled]:hover {
  background: var(--oas-color-bg-disabled);
}
.control {
  box-sizing: border-box;
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--oas-color-primary);
  cursor: inherit;
}
.control:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 2px;
}
.error {
  color: var(--oas-color-danger-text);
  font-size: var(--oas-font-size-sm);
}
.error[hidden] {
  display: none;
}
.empty {
  padding: var(--oas-space-3) 0;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.empty[hidden] {
  display: none;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 480px) {
  .head {
    padding-inline-start: 0;
  }
  .row {
    padding-inline-start: 0;
  }
  .row-label {
    position: static;
    width: auto;
    margin-block-end: var(--oas-space-1);
    padding-inline-end: 0;
  }
}
@media (forced-colors: active) {
  /* 强制色下 UA 弃用 accent-color 之外的自绘色：焦点环回退系统色实线（WCAG 2.4.7） */
  .control:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 1px;
  }
}
`

export class OASMatrix extends OASElement {
  static override get observedAttributes(): string[] {
    return ['rows', 'columns', 'mode', 'value', 'required', 'required-scope', 'disabled', 'readonly', 'label']
  }

  private matrixEl: HTMLElement | null = null
  private captionEl: HTMLElement | null = null
  private scrollEl: HTMLElement | null = null
  private headColsEl: HTMLElement | null = null
  private rowsEl: HTMLElement | null = null
  private errorEl: HTMLElement | null = null
  private emptyEl: HTMLElement | null = null
  private hintEl: HTMLElement | null = null

  /** 行/列快照（与已渲染 DOM 严格对齐，交互回调按索引取值） */
  private rowSnapshot: MatrixRow[] = []
  private columnSnapshot: MatrixColumn[] = []
  /** 每行输入（行索引 → 列索引 → input） */
  private inputRows: HTMLInputElement[][] = []
  /** 上次渲染签名（rows/columns/mode/label 原文），原文未变跳过重建 */
  private renderSignature: string | null = null
  /** 身份哈希（由 rows/columns/label 派生，供 shadow 内 IDREF 稳定复用） */
  private uid = ''
  /** 校验失败中的缺失行（aria-invalid 分发用） */
  private missingRows = new Set<string>()
  /** 当前是否处于可视错误态（用于交互后静默复检） */
  private invalidActive = false

  /** @apiProperty 行（子问题）列表：JSON 属性与对象数组 property 双通道 */
  get rows(): MatrixRow[] {
    return this.parseChoices(this.getAttribute('rows'), 'rows')
  }

  set rows(value: MatrixRow[] | string) {
    this.writeJsonAttr('rows', value)
  }

  /** @apiProperty 列（选项）列表：JSON 属性与对象数组 property 双通道 */
  get columns(): MatrixColumn[] {
    return this.parseChoices(this.getAttribute('columns'), 'columns')
  }

  set columns(value: MatrixColumn[] | string) {
    this.writeJsonAttr('columns', value)
  }

  /**
   * @apiProperty 当前值：radio `{ rowKey: columnKey }` / checkbox `{ rowKey: columnKey[] }`；
   * 赋值即生效（JSON 字符串运行时容忍），不派发事件。
   */
  get value(): MatrixValue {
    return this.coerceValue(this.readRawValue(), this.modeName())
  }

  set value(value: MatrixValue | string) {
    const parsed = typeof value === 'string' ? this.tryParse(value) : value
    const next = this.coerceValue(parsed, this.modeName())
    const json = JSON.stringify(next)
    if (this.getAttribute('value') !== json) this.setAttribute('value', json)
    else if (this.hasRendered) this.update()
  }

  /** 纯函数骨架：SSR 快照与客户端渲染共用（本组件暂未进 SSR 白名单，保留同构写法） */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="matrix" part="root" role="group">
        <div class="caption" part="caption" hidden></div>
        <div class="scroll" part="scroll">
          <div class="head" part="head">
            <span class="head-cols" part="columns"></span>
          </div>
          <div class="rows" part="rows"></div>
        </div>
        <span class="sr-only" part="hint" hidden></span>
        <div class="error" part="error" role="alert" hidden></div>
        <div class="empty" part="empty" hidden></div>
      </div>
    `
  }

  private bind(): void {
    this.matrixEl = this.shadow.querySelector('.matrix')
    this.captionEl = this.shadow.querySelector('.caption')
    this.scrollEl = this.shadow.querySelector('.scroll')
    this.headColsEl = this.shadow.querySelector('.head-cols')
    this.rowsEl = this.shadow.querySelector('.rows')
    this.errorEl = this.shadow.querySelector('.error')
    this.emptyEl = this.shadow.querySelector('.empty')
    this.hintEl = this.shadow.querySelector('[part="hint"]')
    // 事件必须挂在 shadow 内部容器：change 不 composed、click 跨界会重定向 target，
    // 挂宿主会收不到原生控件的变更或拿不到真实按钮
    this.matrixEl?.addEventListener('change', this.onChange)
    this.matrixEl?.addEventListener('keydown', this.onKeydown)
    // 只读：在捕获阶段拦下 label/input 的激活，避免原生控件自行改选中态
    this.matrixEl?.addEventListener('click', this.onClickCapture, true)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override onReconnect(): void {
    this.bind()
  }

  protected override update(): void {
    if (!this.matrixEl) return
    const mode = this.modeName()
    const label = this.getAttr('label', '').trim()
    const disabled = this.injectDisabled()
    const readonly = this.hasAttr('readonly')

    this.toggleAttribute('data-disabled', disabled)
    this.toggleAttribute('data-readonly', readonly)
    this.toggleAttribute('data-invalid', this.invalidActive)
    this.matrixEl.setAttribute('aria-label', label || this.t('matrix.group'))
    this.matrixEl.setAttribute('aria-disabled', String(disabled))
    this.matrixEl.toggleAttribute('data-disabled', disabled)
    this.matrixEl.toggleAttribute('data-readonly', readonly)

    this.captionEl!.hidden = label === ''
    this.captionEl!.textContent = label

    const signature = [this.getAttribute('rows') ?? '', this.getAttribute('columns') ?? '', mode, label].join('\u0000')
    this.uid = stableHash36(signature)
    if (signature !== this.renderSignature) {
      this.renderSignature = signature
      this.rebuild(mode, label)
    }

    this.syncHint()
    this.syncStates()
    // 已显示错误时随选择变化静默复检：补满即消失，持续缺失则保持最新文案
    if (this.invalidActive) this.applyValidation(this.missingInfo(), false)
  }

  /** 重建列头与各行（rows/columns/mode/label 变化时） */
  private rebuild(mode: MatrixMode, label: string): void {
    const rows = this.rows
    const columns = this.columns
    this.rowSnapshot = rows
    this.columnSnapshot = columns
    this.inputRows = []
    const empty = rows.length === 0 || columns.length === 0
    this.scrollEl!.hidden = empty
    this.emptyEl!.hidden = !empty
    this.emptyEl!.textContent = empty ? this.t('empty.noData') : ''
    const head = this.headColsEl!
    const body = this.rowsEl!
    head.textContent = ''
    body.textContent = ''
    if (empty) return

    const uid =
      this.uid || stableHash36(`${this.getAttribute('rows') ?? ''}|${this.getAttribute('columns') ?? ''}|${label}`)
    for (let j = 0; j < columns.length; j++) {
      const col = columns[j]!
      const cell = document.createElement('span')
      cell.className = 'head-cell'
      cell.setAttribute('part', 'column')
      cell.id = `oas-matrix-${uid}-c${j}`
      if (col.disabled) cell.setAttribute('data-disabled', '')
      cell.textContent = col.label
      head.appendChild(cell)
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!
      const fieldset = document.createElement('fieldset')
      fieldset.className = 'row'
      fieldset.setAttribute('part', 'row')
      if (row.disabled) {
        fieldset.setAttribute('data-disabled', '')
        fieldset.disabled = true
      }
      const legend = document.createElement('legend')
      legend.className = 'row-label'
      legend.setAttribute('part', 'row-label')
      legend.id = `oas-matrix-${uid}-r${i}`
      legend.textContent = row.label
      fieldset.appendChild(legend)

      const cells = document.createElement('div')
      cells.className = 'cells'
      cells.setAttribute('part', 'cells')
      const rowInputs: HTMLInputElement[] = []
      for (let j = 0; j < columns.length; j++) {
        const col = columns[j]!
        const cell = document.createElement('label')
        cell.className = 'cell'
        cell.setAttribute('part', 'cell')
        if (row.disabled || col.disabled) cell.setAttribute('data-cell-disabled', '')
        const input = document.createElement('input')
        input.className = 'control'
        input.setAttribute('part', 'control')
        input.type = mode
        input.setAttribute('value', col.key)
        input.setAttribute('aria-labelledby', `${legend.id} ${this.columnHeaderId(uid, j)}`)
        input.dataset.rowIndex = String(i)
        input.dataset.colIndex = String(j)
        if (mode === 'radio') input.name = `oas-matrix-row-${uid}-${i}`
        cell.appendChild(input)
        cells.appendChild(cell)
        rowInputs.push(input)
      }
      this.inputRows.push(rowInputs)
      fieldset.appendChild(cells)
      body.appendChild(fieldset)
    }
  }

  private columnHeaderId(uid: string, index: number): string {
    return `oas-matrix-${uid}-c${index}`
  }

  /** 状态同步：勾选、禁用、roving tabindex、aria-required / aria-invalid / aria-describedby */
  private syncStates(): void {
    const value = this.value
    const mode = this.modeName()
    const groupDisabled = this.injectDisabled()
    const required = this.hasAttr('required')
    const rowScope = this.resolveRequiredScope() === 'row'
    const hintId = this.hintId()
    const errorId = this.errorEl?.id ?? ''
    for (let i = 0; i < this.rowSnapshot.length; i++) {
      const row = this.rowSnapshot[i]!
      const rowValue = value[row.key]
      const rowDisabled = groupDisabled || row.disabled === true
      const rowMissing = this.invalidActive && this.missingRows.has(row.key)
      // radio 行内 roving：已选项优先，否则首个可用项
      let roving = -1
      if (mode === 'radio') {
        const inputs = this.inputRows[i] ?? []
        roving = inputs.findIndex((input, index) => input.checked && this.cellEnabled(i, index))
        if (roving < 0) roving = inputs.findIndex((_, index) => this.cellEnabled(i, index))
      }
      for (let j = 0; j < this.columnSnapshot.length; j++) {
        const column = this.columnSnapshot[j]!
        const input = this.inputRows[i]?.[j]
        if (!input) continue
        const disabled = rowDisabled || column.disabled === true
        input.disabled = disabled
        input.checked =
          mode === 'radio'
            ? typeof rowValue === 'string' && rowValue === column.key
            : Array.isArray(rowValue) && rowValue.includes(column.key)
        if (disabled) input.removeAttribute('aria-required')
        else if (required && rowScope) input.setAttribute('aria-required', 'true')
        else input.removeAttribute('aria-required')
        if (rowMissing) input.setAttribute('aria-invalid', 'true')
        else input.removeAttribute('aria-invalid')
        const describedBy = [required ? hintId : '', rowMissing ? errorId : ''].filter((id) => id !== '').join(' ')
        if (describedBy) input.setAttribute('aria-describedby', describedBy)
        else input.removeAttribute('aria-describedby')
        if (mode === 'checkbox') {
          input.tabIndex = 0
        } else {
          input.tabIndex = j === roving ? 0 : -1
        }
        const cell = input.closest('.cell')
        if (cell) {
          if (input.checked) cell.setAttribute('data-checked', '')
          else cell.removeAttribute('data-checked')
        }
      }
      const fieldset = this.rowsEl?.children[i] as HTMLElement | undefined
      if (fieldset) {
        fieldset.toggleAttribute('data-disabled', rowDisabled)
        fieldset.toggleAttribute('data-invalid', rowMissing)
      }
    }
  }

  /** 必答提示（sr-only，输入经 aria-describedby 关联） */
  private syncHint(): void {
    if (!this.hintEl) return
    const required = this.hasAttr('required')
    const scope = this.resolveRequiredScope()
    this.hintEl.id = `oas-matrix-${this.uid}-hint`
    this.hintEl.hidden = !required
    this.hintEl.textContent = required
      ? scope === 'row'
        ? this.t('matrix.requiredAll')
        : this.t('matrix.requiredAny')
      : ''
    if (!this.errorEl) return
    this.errorEl.id = `oas-matrix-${this.uid}-error`
    this.errorEl.textContent = this.invalidActive
      ? scope === 'row'
        ? this.t('matrix.requiredAll')
        : this.t('matrix.requiredAny')
      : ''
  }

  private hintId(): string {
    return this.hasAttr('required') ? (this.hintEl?.id ?? '') : ''
  }

  private onChange = (event: Event): void => {
    const input = event.target
    if (!(input instanceof HTMLInputElement)) return
    if (this.injectDisabled()) return
    if (this.hasAttr('readonly')) {
      this.syncStates()
      return
    }
    const rowIndex = Number(input.dataset.rowIndex)
    const colIndex = Number(input.dataset.colIndex)
    if (!Number.isInteger(rowIndex) || !Number.isInteger(colIndex)) return
    const row = this.rowSnapshot[rowIndex]
    const column = this.columnSnapshot[colIndex]
    if (!row || !column) return
    if (this.modeName() === 'radio') {
      for (const other of this.inputRows[rowIndex] ?? []) {
        if (other !== input) other.checked = false
      }
    }
    const next = this.collectDomValue()
    const json = JSON.stringify(next)
    if (this.getAttribute('value') !== json) this.setAttribute('value', json)
    this.syncStates()
    const entry = next[row.key]
    const checked = this.modeName() === 'radio' ? input.checked : Array.isArray(entry) && entry.includes(column.key)
    this.emit('change', { value: next, rowKey: row.key, columnKey: column.key, checked })
    if (this.invalidActive) this.applyValidation(this.missingInfo(), false)
  }

  private onClickCapture = (event: Event): void => {
    if (!this.hasAttr('readonly')) return
    const target = event.target
    if (!(target instanceof Element)) return
    // label 包装会代理点击到 input：只读态拦下默认激活（原生控件不支援 readonly）
    if (target.closest('.cell')) event.preventDefault()
  }

  private onKeydown = (event: KeyboardEvent): void => {
    const input = event.target
    if (!(input instanceof HTMLInputElement)) return
    const rowIndex = Number(input.dataset.rowIndex)
    const colIndex = Number(input.dataset.colIndex)
    if (!Number.isInteger(rowIndex) || !Number.isInteger(colIndex)) return
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End']
    if (!keys.includes(event.key)) {
      if (this.hasAttr('readonly') && (event.key === ' ' || event.key === 'Enter')) event.preventDefault()
      return
    }
    event.preventDefault()
    const count = this.columnSnapshot.length
    if (count === 0) return
    const rtl = isRtl(this)
    let next = colIndex
    if (event.key === 'Home') {
      next = 0
    } else if (event.key === 'End') {
      next = count - 1
    } else {
      const forward =
        event.key === 'ArrowDown' || (event.key === 'ArrowRight' && !rtl) || (event.key === 'ArrowLeft' && rtl)
      const step = forward ? 1 : -1
      for (let offset = 1; offset <= count; offset++) {
        const candidate = (colIndex + step * offset + count * 2) % count
        if (this.cellEnabled(rowIndex, candidate)) {
          next = candidate
          break
        }
      }
    }
    if (!this.cellEnabled(rowIndex, next)) return
    const target = this.inputRows[rowIndex]?.[next]
    if (!target) return
    target.focus()
    if (this.hasAttr('readonly') || this.modeName() !== 'radio') return
    if (!target.checked) {
      target.checked = true
      target.dispatchEvent(new Event('change', { bubbles: true }))
    }
  }

  private cellEnabled(rowIndex: number, colIndex: number): boolean {
    const row = this.rowSnapshot[rowIndex]
    const column = this.columnSnapshot[colIndex]
    if (!row || !column) return false
    if (this.injectDisabled() || row.disabled || column.disabled) return false
    return true
  }

  /** 从已渲染控件收集值（用户交互后的权威来源） */
  private collectDomValue(): MatrixValue {
    const mode = this.modeName()
    const out: MatrixValue = {}
    for (let i = 0; i < this.rowSnapshot.length; i++) {
      const row = this.rowSnapshot[i]!
      const inputs = this.inputRows[i] ?? []
      if (mode === 'radio') {
        const index = inputs.findIndex((input) => input.checked)
        if (index >= 0) out[row.key] = this.columnSnapshot[index]!.key
        continue
      }
      const selected: string[] = []
      for (let j = 0; j < inputs.length; j++) {
        if (inputs[j]!.checked) selected.push(this.columnSnapshot[j]!.key)
      }
      if (selected.length > 0) out[row.key] = selected
    }
    return out
  }

  /**
   * 校验必答语义并同步可视错误。
   * @param scope 缺省按 `required-scope`：row = 每行必选；table = 全表至少一行作答
   * @returns 是否通过；未通过时派发 `oas-invalid`
   */
  validate(): boolean {
    const info = this.missingInfo()
    this.applyValidation(info, true)
    return info === null
  }

  /** 清空全部选择（派发 `oas-change`） */
  clear(): void {
    if (this.getAttribute('value') === '{}') return
    this.setAttribute('value', '{}')
    this.syncStates()
    this.emit('change', { value: {}, rowKey: '', columnKey: '', checked: false })
    if (this.invalidActive) this.applyValidation(this.missingInfo(), false)
  }

  /** 缺失信息（无 required 或已满足返回 null；读属性而非渲染快照，未挂载时 validate 同样可用） */
  private missingInfo(): { missingRows: string[]; scope: RequiredScope } | null {
    if (!this.hasAttr('required')) return null
    const scope = this.resolveRequiredScope()
    const value = this.value
    const rows = this.rows
    const columns = this.columns
    const answerable = rows.filter((row) => !row.disabled && columns.some((column) => !column.disabled))
    if (answerable.length === 0) return null
    const answered = (rowKey: string): boolean => {
      const entry = value[rowKey]
      return this.modeName() === 'radio'
        ? typeof entry === 'string' && entry !== ''
        : Array.isArray(entry) && entry.length > 0
    }
    if (scope === 'table') {
      return answerable.some((row) => answered(row.key))
        ? null
        : { missingRows: answerable.map((row) => row.key), scope }
    }
    const missingRows = answerable.filter((row) => !answered(row.key)).map((row) => row.key)
    return missingRows.length > 0 ? { missingRows, scope } : null
  }

  /** 应用校验结果（emit=false 用于交互后的静默复检，不重复派发事件） */
  private applyValidation(info: { missingRows: string[]; scope: RequiredScope } | null, emit: boolean): void {
    this.invalidActive = info !== null
    this.toggleAttribute('data-invalid', info !== null)
    this.missingRows = new Set(info?.missingRows ?? [])
    this.syncHint()
    if (this.errorEl) this.errorEl.hidden = info === null
    this.syncStates()
    if (info === null || !emit) return
    this.emit('invalid', {
      reason: 'required',
      scope: info.scope,
      missingRows: [...info.missingRows],
      value: this.value,
    })
  }

  private resolveRequiredScope(): RequiredScope {
    const raw = this.getAttr('required-scope', 'row')
    if (VALID_SCOPES.includes(raw)) return raw as RequiredScope
    warnOnce(`[oas-matrix] 非法 required-scope "${raw}"，已回落 row；合法值：row / table`)
    return 'row'
  }

  private modeName(): MatrixMode {
    const raw = this.getAttr('mode', 'radio')
    if (VALID_MODES.includes(raw)) return raw as MatrixMode
    warnOnce(`[oas-matrix] 非法 mode "${raw}"，已回落 radio；合法值：radio / checkbox`)
    return 'radio'
  }

  private readRawValue(): unknown {
    const raw = this.getAttribute('value')
    if (raw === null || raw.trim() === '') return {}
    const parsed = this.tryParse(raw)
    return parsed ?? {}
  }

  private tryParse(raw: string): unknown {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  /** 值归一：按 mode 收敛行→列（对象数组双形态容错，非法项静默丢弃） */
  private coerceValue(input: unknown, mode: MatrixMode): MatrixValue {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
    const out: MatrixValue = {}
    for (const [rowKey, entry] of Object.entries(input as Record<string, unknown>)) {
      if (rowKey === '') continue
      if (mode === 'radio') {
        const column = Array.isArray(entry) ? entry.find((item) => typeof item === 'string') : entry
        if (typeof column === 'string' && column !== '') out[rowKey] = column
        continue
      }
      const list = Array.isArray(entry) ? entry : typeof entry === 'string' ? [entry] : []
      const keys: string[] = []
      for (const item of list) {
        if (typeof item === 'string' && item !== '' && !keys.includes(item)) keys.push(item)
      }
      if (keys.length > 0) out[rowKey] = keys
    }
    return out
  }

  /** rows/columns 解析：字符串项按 key=label 收敛；非法 JSON / 非数组告警一次并回落空数组 */
  private parseChoices(raw: string | null, kind: 'rows' | 'columns'): MatrixRow[] {
    if (raw === null || raw.trim() === '') return []
    const parsed = this.tryParse(raw)
    if (!Array.isArray(parsed)) {
      warnOnce(`[oas-matrix] 非法 ${kind} JSON（应为数组），已忽略`)
      return []
    }
    const out: MatrixRow[] = []
    const seen = new Set<string>()
    for (const item of parsed) {
      let key = ''
      let label = ''
      let disabled = false
      if (typeof item === 'string') {
        key = item
        label = item
      } else if (item && typeof item === 'object') {
        const record = item as { key?: unknown; label?: unknown; disabled?: unknown }
        if (typeof record.key !== 'string') continue
        key = record.key
        label = typeof record.label === 'string' && record.label !== '' ? record.label : record.key
        disabled = record.disabled === true
      } else {
        continue
      }
      if (key === '' || seen.has(key)) continue
      seen.add(key)
      out.push({ key, label, disabled })
    }
    return out
  }

  private writeJsonAttr(name: string, value: unknown): void {
    const json = typeof value === 'string' ? value : JSON.stringify(value ?? [])
    if (this.getAttribute(name) === json) return
    this.setAttribute(name, json)
  }
}
