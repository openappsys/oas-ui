import type { TableColumn } from '../oas-table.js'
import { registerTableCapability } from '../oas-table-capability.js'
import { isInteractiveEvent } from '../oas-table-interactive.js'
import { parseTsv } from '../advanced/clipboard.js'

/** 单元格坐标：row 为可见数据行下标（0 基，按当前排序/过滤/分页/窗口后的显示顺序） */
export interface CellPosition {
  row: number
  col: string
}

/** 矩形选区：返回时 start 为左上、end 为右下（输入允许对角，内部归一化） */
export interface RangeSelection {
  start: CellPosition
  end: CellPosition
}

export interface RangeSelectionOptions {
  enabled: boolean
  /** 外部写入的可见坐标快照；交互过程中由行键锚定，不回写这里（避免拖拽时整表重建） */
  selection?: RangeSelection | null
}

export interface RangeCopyDetail {
  text: string
  selection: RangeSelection
}

export interface RangePasteDetail {
  /** 选区左上角单元格（宿主按此起点写入数据） */
  start: CellPosition
  /** 左上角行的行键（排序/过滤/虚拟滚动下宿主应优先按行键定位） */
  startKey: string
  /** 剪贴板 TSV 解析出的二维字符串数组 */
  rows: string[][]
  text: string
}

interface PositionKey {
  key: string
  col: string
}

interface RangeKeys {
  anchor: PositionKey
  focus: PositionKey
}

interface RangeHost extends HTMLElement {
  shadowRoot: ShadowRoot
  columns: TableColumn[]
  effectiveColumns?(): TableColumn[]
  getCapabilityOptions<T = unknown>(name: string): T | undefined
  setCapabilityOptions(name: string, options: unknown): void
}

const STYLE_ID = 'oas-table-range-style'
/** 选区样式只用 token：主色描边，不覆盖单元格背景（避免与条件格式抢色） */
const RANGE_STYLE = `
td.range-selected {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--oas-color-primary) 45%, transparent);
}
td.range-anchor,
td.range-focus {
  box-shadow: inset 0 0 0 2px var(--oas-color-primary);
}
td.range-focus:focus {
  outline: none;
}
`

function rowElements(host: RangeHost): HTMLTableRowElement[] {
  return [...host.shadowRoot.querySelectorAll<HTMLTableRowElement>('tr.row')]
}

function rowKeys(host: RangeHost): Map<string, number> {
  const map = new Map<string, number>()
  rowElements(host).forEach((tr, index) => {
    const key = tr.getAttribute('data-key')
    if (key !== null && !map.has(key)) map.set(key, index)
  })
  return map
}

function leafColumns(columns: readonly TableColumn[]): TableColumn[] {
  return columns.flatMap((column) => (column.children ? leafColumns(column.children) : [column]))
}

/** 单元格列顺序：优先表格生效列（排序/合并/列窗口下稳定），回退首行实际渲染顺序 */
function columnOrder(host: RangeHost): string[] {
  const effective = host.effectiveColumns?.()
  if (effective && effective.length > 0) return leafColumns(effective).map((column) => column.key)
  const row = host.shadowRoot.querySelector<HTMLTableRowElement>('tr.row')
  if (!row) return []
  return [...row.querySelectorAll<HTMLTableCellElement>('td[data-col]')].map((td) => td.getAttribute('data-col') ?? '')
}

function resolveSelection(host: RangeHost, keys: RangeKeys | null): RangeSelection | null {
  if (!keys) return null
  const rows = rowKeys(host)
  const cols = columnOrder(host)
  const anchorRow = rows.get(keys.anchor.key)
  const focusRow = rows.get(keys.focus.key)
  const anchorCol = cols.indexOf(keys.anchor.col)
  const focusCol = cols.indexOf(keys.focus.col)
  if (anchorRow === undefined || focusRow === undefined || anchorCol < 0 || focusCol < 0) return null
  const startRow = Math.min(anchorRow, focusRow)
  const endRow = Math.max(anchorRow, focusRow)
  const startCol = Math.min(anchorCol, focusCol)
  const endCol = Math.max(anchorCol, focusCol)
  return {
    start: { row: startRow, col: cols[startCol]! },
    end: { row: endRow, col: cols[endCol]! },
  }
}

function sameSelection(a: RangeSelection | null, b: RangeSelection | null): boolean {
  if (a === null || b === null) return a === b
  return (
    a.start.row === b.start.row && a.start.col === b.start.col && a.end.row === b.end.row && a.end.col === b.end.col
  )
}

/** 把可见坐标转成行键坐标；行不存在（虚拟窗口未装载）时返回 null */
function toKeys(host: RangeHost, start: CellPosition, end: CellPosition): RangeKeys | null {
  const rows = rowElements(host)
  const startRow = rows[start.row]
  const endRow = rows[end.row]
  if (!startRow || !endRow) return null
  const startKey = startRow.getAttribute('data-key')
  const endKey = endRow.getAttribute('data-key')
  if (startKey === null || endKey === null) return null
  return { anchor: { key: startKey, col: start.col }, focus: { key: endKey, col: end.col } }
}

class RangeSelectionController {
  /** 本能力在渲染后同步整表选区（跨行几何），不占用单元格装饰链 */
  private connected = false
  private dragging = false
  private keys: RangeKeys | null = null
  /** 最近一次从 capability options 读取的快照对象（同一对象不重复导入） */
  private lastSeen: RangeSelection | null | undefined
  private dragAnchor: PositionKey | null = null
  /** 键盘移动焦点时抑制 focusin 的「单格重置选区」 */
  private suppressFocus = false
  /** 本控制器改写过的 tabindex 原值（关闭时精确还原，不吞掉 edit / grid-navigation 的焦点语义） */
  private savedTabindex = new WeakMap<HTMLElement, string | null>()
  /** 是否已绘制过选区/roving tabindex（未启用且未绘制时跳过整表遍历） */
  private painted = false
  /** 外部写入时尚无对应渲染行（连接前/数据未到）：保留快照，后续 update 重试 */
  private pendingSelection: RangeSelection | null = null

  constructor(private readonly host: RangeHost) {}

  hostConnected(): void {
    if (this.connected) return
    this.connected = true
    // 捕获阶段：先于表格自身的网格导航处理 Shift+方向键，避免两套导航各移一格
    this.host.shadowRoot.addEventListener('pointerdown', this.onPointerDown as EventListener)
    this.host.shadowRoot.addEventListener('pointermove', this.onPointerMove as EventListener)
    this.host.shadowRoot.addEventListener('pointerup', this.onPointerUp as EventListener)
    this.host.shadowRoot.addEventListener('selectstart', this.onSelectStart as EventListener)
    this.host.shadowRoot.addEventListener('keydown', this.onKeyDown as EventListener, true)
    this.host.shadowRoot.addEventListener('focusin', this.onFocusIn as EventListener)
    this.host.shadowRoot.addEventListener('paste', this.onPaste as EventListener)
    // 虚拟滚动帧直接重建 tbody（不走 update 周期），需在 oas-scroll 后重新装饰
    this.host.addEventListener('oas-scroll', this.onScroll as EventListener)
    // 拖拽可能在表格外释放（shadowRoot 收不到 pointerup）：window 级兜底复位，避免 dragging 永久残留
    window.addEventListener('pointerup', this.onWindowPointerUp)
    window.addEventListener('pointercancel', this.onWindowPointerUp)
    window.addEventListener('selectstart', this.onWindowSelectStart)
  }

  hostDisconnected(): void {
    if (!this.connected) return
    this.connected = false
    this.host.shadowRoot.removeEventListener('pointerdown', this.onPointerDown as EventListener)
    this.host.shadowRoot.removeEventListener('pointermove', this.onPointerMove as EventListener)
    this.host.shadowRoot.removeEventListener('pointerup', this.onPointerUp as EventListener)
    this.host.shadowRoot.removeEventListener('selectstart', this.onSelectStart as EventListener)
    this.host.shadowRoot.removeEventListener('keydown', this.onKeyDown as EventListener, true)
    this.host.shadowRoot.removeEventListener('focusin', this.onFocusIn as EventListener)
    this.host.shadowRoot.removeEventListener('paste', this.onPaste as EventListener)
    this.host.removeEventListener('oas-scroll', this.onScroll as EventListener)
    window.removeEventListener('pointerup', this.onWindowPointerUp)
    window.removeEventListener('pointercancel', this.onWindowPointerUp)
    window.removeEventListener('selectstart', this.onWindowSelectStart)
  }

  hostUpdated(): void {
    const options = this.options()
    // 未启用且从未绘制过：不注入样式、不遍历 DOM（能力被 import 后所有表都会走到这里）
    if (!options.enabled && !this.painted) return
    this.injectStyle()
    // 只认「对象身份变化」的外部写入：交互只改内部键锚定，避免每次拖拽/方向键都重建整表 DOM
    if (options.selection !== this.lastSeen) {
      this.lastSeen = options.selection
      const keys = options.selection ? toKeys(this.host, options.selection.start, options.selection.end) : null
      this.keys = keys
      this.pendingSelection = options.selection && !keys ? options.selection : null
    } else if (this.pendingSelection) {
      const keys = toKeys(this.host, this.pendingSelection.start, this.pendingSelection.end)
      if (keys) {
        this.keys = keys
        this.pendingSelection = null
      }
    }
    this.syncDom()
    if (options.enabled) {
      const selection = this.getSelection()
      if (!sameSelection(selection, this.lastEmitted)) {
        this.lastEmitted = selection
        this.host.dispatchEvent(new CustomEvent('oas-range-change', { detail: selection }))
      }
    }
  }

  /** 当前选区（按最新可见顺序解析；行已离开可视窗口/被过滤时为 null） */
  getSelection(): RangeSelection | null {
    return resolveSelection(this.host, this.keys)
  }

  /** 表格虚拟滚动帧重建 tbody 后重新装饰（滚动帧不走 update，hostUpdated 不会触发） */
  private onScroll = (): void => {
    const options = this.options()
    if (!options.enabled || !this.painted) return
    this.syncDom()
    const selection = this.getSelection()
    if (!sameSelection(selection, this.lastEmitted)) {
      this.lastEmitted = selection
      this.host.dispatchEvent(new CustomEvent('oas-range-change', { detail: selection }))
    }
  }

  private options(): RangeSelectionOptions {
    return this.host.getCapabilityOptions<RangeSelectionOptions>('range') ?? { enabled: false }
  }

  private injectStyle(): void {
    if (this.host.shadowRoot.querySelector(`#${STYLE_ID}`)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = RANGE_STYLE
    this.host.shadowRoot.appendChild(style)
  }

  private setSelection(keys: RangeKeys | null, focusCell = false): void {
    this.keys = keys
    this.pendingSelection = null
    const selection = resolveSelection(this.host, this.keys)
    this.syncDom()
    if (!sameSelection(selection, this.lastEmitted)) {
      this.lastEmitted = selection
      // 清空也派发（detail: null），宿主才能同步状态/读屏提示
      this.host.dispatchEvent(new CustomEvent('oas-range-change', { detail: selection }))
    }
    if (focusCell && this.keys) {
      const td = this.cellOf(this.keys.focus.key, this.keys.focus.col)
      if (td) {
        this.suppressFocus = true
        td.focus()
        this.suppressFocus = false
        if (typeof td.scrollIntoView === 'function') {
          try {
            td.scrollIntoView({ block: 'nearest', inline: 'nearest' })
          } catch {
            /* 老环境不支持滚动选项 */
          }
        }
      }
    }
  }

  private lastEmitted: RangeSelection | null = null

  private cellOf(key: string, col: string): HTMLTableCellElement | null {
    const rows = rowElements(this.host)
    const row = rows[rowKeys(this.host).get(key) ?? -1]
    if (!row) return null
    return (
      [...row.querySelectorAll<HTMLTableCellElement>('td[data-col]')].find(
        (td) => td.getAttribute('data-col') === col,
      ) ?? null
    )
  }

  private cellPositionOf(td: HTMLElement): PositionKey | null {
    const row = td.closest<HTMLTableRowElement>('tr.row')
    const col = td.getAttribute('data-col')
    const key = row?.getAttribute('data-key')
    if (!row || !col || key == null) return null
    return { key, col }
  }

  private isInteractive(target: HTMLElement | null): boolean {
    return Boolean(
      target &&
        typeof target.closest === 'function' &&
        target.closest('input, select, textarea, button, a, [role="button"], [role="link"], [contenteditable="true"]'),
    )
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || !this.options().enabled) return
    const target = event.target as HTMLElement | null
    const td = target?.closest<HTMLElement>('td[data-col]')
    if (!td || this.isInteractive(target)) return
    const position = this.cellPositionOf(td)
    if (!position) return
    this.dragging = true
    this.dragAnchor = position
    // 不 preventDefault：保留原生聚焦与 dblclick（编辑能力依赖）；拖拽文本选择由 selectstart 抑制
    this.setSelection({ anchor: position, focus: position })
  }

  private onSelectStart = (event: Event): void => {
    if (this.dragging) event.preventDefault()
  }

  /** 拖出表格后页面文本选择同样抑制 */
  private onWindowSelectStart = (event: Event): void => {
    if (this.dragging) event.preventDefault()
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.dragging || !this.dragAnchor) return
    const target = event.target as HTMLElement | null
    const td = target?.closest<HTMLElement>('td[data-col]')
    const position = td ? this.cellPositionOf(td) : null
    if (position) this.setSelection({ anchor: this.dragAnchor, focus: position })
  }

  private onPointerUp = (): void => {
    this.dragging = false
    this.dragAnchor = null
  }

  /** 表格外释放/触摸取消的兜底（shadowRoot 不接收表格外 pointerup） */
  private onWindowPointerUp = (): void => {
    if (!this.dragging) return
    this.dragging = false
    this.dragAnchor = null
  }

  private onFocusIn = (event: Event): void => {
    if (this.suppressFocus || !this.options().enabled) return
    const td = (event.target as HTMLElement | null)?.closest?.<HTMLElement>('td[data-col]')
    if (!td) return
    const position = this.cellPositionOf(td)
    if (!position) return
    const current = this.keys
    if (
      current &&
      current.anchor.key === position.key &&
      current.anchor.col === position.col &&
      current.focus.key === position.key &&
      current.focus.col === position.col
    ) {
      return
    }
    // Tab / 网格导航进入某格：选区收敛为该格（表格语义），拖拽中不重置
    if (this.dragging) return
    this.setSelection({ anchor: position, focus: position })
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.options().enabled) return
    const target = event.target as HTMLElement | null
    const td = target?.closest?.<HTMLElement>('td[data-col]')
    if (!td || isInteractiveEvent(event)) return
    const key = event.key
    if ((event.ctrlKey || event.metaKey) && key.toLowerCase() === 'c' && !event.shiftKey && !event.altKey) {
      if (!this.keys) return
      // 用户选中了单元格内部分文字：放行原生复制，不整格覆盖
      const textSelection = typeof window !== 'undefined' ? window.getSelection?.() : null
      if (textSelection && !textSelection.isCollapsed && textSelection.toString().length > 0) return
      event.preventDefault()
      event.stopPropagation()
      void copyRange(this.host)
      return
    }
    if (key === 'Escape') {
      if (!this.keys) return
      event.preventDefault()
      this.setSelection(null)
      return
    }
    const step = stepOf(key)
    if (!step) return
    if (step.col !== 0) {
      // RTL 下左右方向与 DOM 列序相反
      const rtl = typeof getComputedStyle === 'function' && getComputedStyle(this.host).direction === 'rtl'
      if (rtl) step.col = -step.col
    }
    // Shift+方向键：扩展选区。捕获阶段拦截，避免下游网格导航再移一格
    if (event.shiftKey) {
      event.preventDefault()
      event.stopPropagation()
      this.moveFocus(step.row, step.col, true)
      return
    }
    // 普通方向键：表格已启用 grid-navigation 时交给其统一导航，focusin 会收敛选区
    if (this.host.hasAttribute('grid-navigation')) return
    if (event.altKey || event.ctrlKey || event.metaKey) return
    event.preventDefault()
    event.stopPropagation()
    this.moveFocus(step.row, step.col, false)
  }

  private moveFocus(deltaRow: number, deltaCol: number, extend: boolean): void {
    const rows = rowElements(this.host)
    if (rows.length === 0) return
    const cols = columnOrder(this.host)
    if (cols.length === 0) return
    const current = this.keys?.focus
    let rowIndex = 0
    let colIndex = 0
    if (current) {
      const found = rowKeys(this.host).get(current.key)
      if (found !== undefined) rowIndex = found
      const foundCol = cols.indexOf(current.col)
      if (foundCol >= 0) colIndex = foundCol
    }
    const nextRow = Math.max(0, Math.min(rows.length - 1, rowIndex + deltaRow))
    const nextCol = Math.max(0, Math.min(cols.length - 1, colIndex + deltaCol))
    const nextKey = rows[nextRow]?.getAttribute('data-key')
    if (nextKey == null) return
    const focus: PositionKey = { key: nextKey, col: cols[nextCol]! }
    const anchor = extend ? (this.keys?.anchor ?? current ?? focus) : focus
    this.setSelection({ anchor, focus }, true)
  }

  private onPaste = (event: ClipboardEvent): void => {
    if (!this.options().enabled) return
    if (isInteractiveEvent(event)) return
    const text = event.clipboardData?.getData('text/plain') ?? ''
    const selection = this.getSelection()
    if (!text || !selection) return
    const startKey = rowElements(this.host)[selection.start.row]?.getAttribute('data-key') ?? ''
    this.host.dispatchEvent(
      new CustomEvent<RangePasteDetail>('oas-range-paste', {
        detail: { start: selection.start, startKey, rows: parseTsv(text), text },
      }),
    )
  }

  private syncDom(): void {
    const options = this.options()
    const rows = rowElements(this.host)
    if (!options.enabled && !this.painted) return
    const cols = columnOrder(this.host)
    const colIndex = new Map(cols.map((col, index) => [col, index]))
    // 一次构建行/列边界：拖拽与重渲染都是热路径，避免逐格 indexOf
    const rowIndex = new Map<string, number>()
    rows.forEach((tr, index) => {
      const key = tr.getAttribute('data-key')
      if (key !== null && !rowIndex.has(key)) rowIndex.set(key, index)
    })
    const keys = options.enabled ? this.keys : null
    const anchorRow = keys ? rowIndex.get(keys.anchor.key) : undefined
    const focusRow = keys ? rowIndex.get(keys.focus.key) : undefined
    const anchorCol = keys ? colIndex.get(keys.anchor.col) : undefined
    const focusCol = keys ? colIndex.get(keys.focus.col) : undefined
    const hasSelection =
      anchorRow !== undefined && focusRow !== undefined && anchorCol !== undefined && focusCol !== undefined
    const startRow = hasSelection ? Math.min(anchorRow, focusRow) : 0
    const endRow = hasSelection ? Math.max(anchorRow, focusRow) : -1
    const startCol = hasSelection ? Math.min(anchorCol, focusCol) : 0
    const endCol = hasSelection ? Math.max(anchorCol, focusCol) : -1
    // grid-navigation 自带「容器单停靠 + 方向键漫游」；再改 td tabindex 会多出第二个停靠点
    const manageTabindex = options.enabled && !this.host.hasAttribute('grid-navigation')
    const grid = this.host.shadowRoot.querySelector<HTMLElement>('[role="grid"]')
    if (grid) {
      if (options.enabled) grid.setAttribute('aria-multiselectable', 'true')
      else grid.removeAttribute('aria-multiselectable')
    }
    const firstCol = cols[0]
    for (let row = 0; row < rows.length; row++) {
      const rowEl = rows[row]!
      const rowKey = rowEl.getAttribute('data-key')
      for (const td of rowEl.querySelectorAll<HTMLTableCellElement>('td[data-col]')) {
        const col = td.getAttribute('data-col') ?? ''
        const colIdx = colIndex.get(col) ?? -1
        const selected = hasSelection && row >= startRow && row <= endRow && colIdx >= startCol && colIdx <= endCol
        td.classList.toggle('range-selected', selected)
        const isAnchor = Boolean(selected && keys && rowKey === keys.anchor.key && col === keys.anchor.col)
        const isFocus = Boolean(selected && keys && rowKey === keys.focus.key && col === keys.focus.col)
        td.classList.toggle('range-anchor', isAnchor)
        td.classList.toggle('range-focus', isFocus)
        // 仅 grid-navigation 语义下 gridcell 支持 aria-selected；普通 table 不写非法 ARIA
        if (td.getAttribute('role') === 'gridcell') td.setAttribute('aria-selected', String(selected))
        if (!manageTabindex) {
          const saved = this.savedTabindex.get(td)
          if (saved !== undefined) {
            if (saved === null) td.removeAttribute('tabindex')
            else td.setAttribute('tabindex', saved)
            this.savedTabindex.delete(td)
          }
          continue
        }
        if (!this.savedTabindex.has(td)) this.savedTabindex.set(td, td.getAttribute('tabindex'))
        if (isFocus || ((!keys || !hasSelection) && row === 0 && col === firstCol)) {
          // 行内 roving tabindex：仅焦点格可 Tab 进入，避免逐格 Tab 穿透整表
          td.tabIndex = 0
        } else {
          td.tabIndex = -1
        }
      }
    }
    this.painted = options.enabled
  }
}

function stepOf(key: string): { row: number; col: number } | null {
  switch (key) {
    case 'ArrowUp':
      return { row: -1, col: 0 }
    case 'ArrowDown':
      return { row: 1, col: 0 }
    case 'ArrowLeft':
      return { row: 0, col: -1 }
    case 'ArrowRight':
      return { row: 0, col: 1 }
    default:
      return null
  }
}

const controllers = new WeakMap<HTMLElement, RangeSelectionController>()

function controllerOf(table: HTMLElement): RangeSelectionController | null {
  const host = table as RangeHost
  if (typeof host.getCapabilityOptions !== 'function') return null
  return controllers.get(table) ?? null
}

/** 启用/关闭区域选择（关闭时保留锚定，便于再次开启；装饰与键盘交互同步停用） */
export function enableRangeSelection(table: HTMLElement, enabled = true): void {
  const host = table as RangeHost
  if (typeof host.getCapabilityOptions !== 'function') return
  const current = host.getCapabilityOptions<RangeSelectionOptions>('range') ?? { enabled: false }
  host.setCapabilityOptions('range', { ...current, enabled })
}

/** 设置/清除选区；设置会自动启用区域选择。坐标按当前可见行/列给出，内部以行键 + 列 key 锚定。 */
export function setRangeSelection(table: HTMLElement, start: CellPosition | null, end?: CellPosition): void {
  const host = table as RangeHost
  if (typeof host.getCapabilityOptions !== 'function') return
  const current = host.getCapabilityOptions<RangeSelectionOptions>('range') ?? { enabled: false }
  if (!start) {
    host.setCapabilityOptions('range', { ...current, selection: null })
    return
  }
  host.setCapabilityOptions('range', { ...current, enabled: true, selection: { start, end: end ?? start } })
}

/** 读取当前选区（按最新可见顺序解析；行已离开可视窗口/被过滤时返回 null） */
export function getRangeSelection(table: HTMLElement): RangeSelection | null {
  return controllerOf(table)?.getSelection() ?? null
}

/**
 * 复制当前选区为 TSV（按可见行列顺序）。优先写系统剪贴板，失败时仍返回文本并派发事件。
 * 事件：`oas-range-copy`（detail: { text, selection }）。
 */
export async function copyRange(table: HTMLElement): Promise<string> {
  const host = table as RangeHost
  const controller = controllerOf(table)
  if (!controller) return ''
  const selection = controller.getSelection()
  if (!selection) return ''
  const cols = columnOrder(host)
  const rows = rowElements(host)
  const startCol = Math.min(cols.indexOf(selection.start.col), cols.indexOf(selection.end.col))
  const endCol = Math.max(cols.indexOf(selection.start.col), cols.indexOf(selection.end.col))
  const lines: string[] = []
  for (let row = selection.start.row; row <= selection.end.row; row++) {
    const cells = rows[row]?.querySelectorAll<HTMLTableCellElement>('td[data-col]')
    if (!cells) continue
    const values: string[] = []
    for (let col = startCol; col <= endCol; col++) {
      const key = cols[col]
      const td = key ? [...cells].find((cell) => cell.getAttribute('data-col') === key) : undefined
      values.push((td?.textContent ?? '').replace(/[\t\r\n]+/g, ' ').trim())
    }
    lines.push(values.join('\t'))
  }
  const text = lines.join('\n')
  try {
    await navigator.clipboard?.writeText(text)
  } catch {
    /* 剪贴板权限不可用时仍派发事件/返回文本，由宿主自行降级 */
  }
  host.dispatchEvent(new CustomEvent<RangeCopyDetail>('oas-range-copy', { detail: { text, selection } }))
  return text
}

registerTableCapability('range', (host) => {
  const controller = new RangeSelectionController(host as RangeHost)
  controllers.set(host as HTMLElement, controller)
  return controller
})
