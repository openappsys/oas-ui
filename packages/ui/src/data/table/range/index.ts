import type { TableColumn } from '../oas-table.js'
import { registerTableCapability } from '../oas-table-capability.js'
import { isInteractiveEvent } from '../oas-table-interactive.js'
import { rowKeyValue } from '../oas-table-row-key.js'
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
  /** 多选区时的全部选区（单选区时为 [selection]） */
  selections?: RangeSelection[]
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

export type RangeWriteKind = 'paste' | 'cut' | 'fill'

export interface RangeWriteChange {
  key: string
  column: string
  value: unknown
  oldValue?: string
  oldRawValue?: unknown
}

export interface RangeWriteDetail {
  kind: RangeWriteKind
  changes: RangeWriteChange[]
}

export interface RangePasteApplyOptions {
  /** 文本到数据值的转换（默认原样字符串；列类型转换由宿主/调用方决定） */
  coerce?: (text: string, column: string) => unknown
  /** true 时空字符串单元格不覆盖原值（默认 false） */
  skipEmpty?: boolean
}

export interface RangeCopyOptions {
  /** 是否带表头（默认 false） */
  header?: boolean
}

export interface RangeFillOptions {
  direction?: 'down' | 'up' | 'left' | 'right'
  mode?: 'copy' | 'series'
  /** 数值序列步长（默认 1；up/left 取负） */
  step?: number
  /** 填充行/列数（默认 1） */
  cells?: number
  /** 内部：拖拽填充柄时的源选区（不传则用当前活动选区） */
  source?: RangeSelection
}

interface PositionKey {
  key: string
  col: string
  /** windowed 下的绝对数据行号（跨窗口选区保留；非 windowed 用可见行下标） */
  abs?: number
}

interface SelectionRect {
  startRow: number
  endRow: number
  startCol: number
  endCol: number
}

/** 归一化选区矩形；windowed 下可用绝对行号表示跨窗口选区 */
function selectionRect(host: RangeHost, keys: RangeKeys | null): SelectionRect | null {
  if (!keys) return null
  const rows = rowKeys(host)
  const cols = columnOrder(host)
  const windowed = host.hasAttribute('windowed')
  const anchorRow = windowed ? (keys.anchor.abs ?? rows.get(keys.anchor.key)) : rows.get(keys.anchor.key)
  const focusRow = windowed ? (keys.focus.abs ?? rows.get(keys.focus.key)) : rows.get(keys.focus.key)
  const anchorCol = cols.indexOf(keys.anchor.col)
  const focusCol = cols.indexOf(keys.focus.col)
  if (anchorRow === undefined || focusRow === undefined || anchorCol < 0 || focusCol < 0) return null
  return {
    startRow: Math.min(anchorRow, focusRow),
    endRow: Math.max(anchorRow, focusRow),
    startCol: Math.min(anchorCol, focusCol),
    endCol: Math.max(anchorCol, focusCol),
  }
}

/** 行键 + 列 key 的单元格坐标（供 selectByKey 使用） */
export type CellKey = PositionKey

interface RangeKeys {
  anchor: PositionKey
  focus: PositionKey
}

interface RangeHost extends HTMLElement {
  shadowRoot: ShadowRoot
  columns: TableColumn[]
  data?: Array<Record<string, unknown>>
  effectiveColumns?(): TableColumn[]
  translateText?(key: string, params?: Record<string, string | number>): string
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
td.range-focus {
  position: relative;
}
.range-fill-handle {
  position: absolute;
  inset-inline-end: -1px;
  bottom: -1px;
  width: 6px;
  height: 6px;
  background: var(--oas-color-primary);
  cursor: crosshair;
  z-index: 1;
}
.range-live {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
`

function rowElements(host: RangeHost): HTMLTableRowElement[] {
  return [...host.shadowRoot.querySelectorAll<HTMLTableRowElement>('tr.row')]
}

function rowAtIndex(host: RangeHost, index: number): HTMLTableRowElement | undefined {
  const rows = rowElements(host)
  if (!host.hasAttribute('windowed')) return rows[index]
  return rows.find((tr) => Number(tr.getAttribute('data-row-index')) === index)
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
  const rect = selectionRect(host, keys)
  if (!rect) return null
  const cols = columnOrder(host)
  return {
    start: { row: rect.startRow, col: cols[rect.startCol]! },
    end: { row: rect.endRow, col: cols[rect.endCol]! },
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
  const windowed = host.hasAttribute('windowed')
  const absOf = (tr: HTMLTableRowElement): number | undefined =>
    windowed ? Number(tr.getAttribute('data-row-index')) : undefined
  return {
    anchor: { key: startKey, col: start.col, abs: absOf(startRow) },
    focus: { key: endKey, col: end.col, abs: absOf(endRow) },
  }
}

class RangeSelectionController {
  /** 本能力在渲染后同步整表选区（跨行几何），不占用单元格装饰链 */
  private connected = false
  private dragging = false
  private keys: RangeKeys | null = null
  /** 多选区：活动选区始终是 ranges 的最后一项（keys 为其便捷别名） */
  private ranges: RangeKeys[] = []
  private observer: MutationObserver | null = null
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
  private pendingFocus: { index: number; col: string; extend: boolean } | null = null
  /** 填充柄拖拽中的源选区 */
  private fillSource: RangeSelection | null = null
  private filling = false
  /** 上次同步时的 data 快照（windowed 下防止 window-start 先于 data 变化时误落地） */
  private lastDataSignature: string | null = null
  private liveEl: HTMLElement | null = null
  private announceTimer: ReturnType<typeof setTimeout> | null = null
  private moveRaf = 0
  private movePending: PositionKey | null = null

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
    // 虚拟滚动 / 列窗口 / resize 等手写重建路径不经过 update 周期：用 childList 观察统一重装饰
    this.observer = new MutationObserver(() => this.onDomRebuilt())
    this.observer.observe(this.host.shadowRoot, { childList: true, subtree: true })
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
    this.observer?.disconnect()
    this.observer = null
    if (this.announceTimer) clearTimeout(this.announceTimer)
    this.announceTimer = null
    this.liveEl = null
    if (this.moveRaf) cancelAnimationFrame(this.moveRaf)
    this.moveRaf = 0
    this.movePending = null
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
      this.ranges = keys ? [keys] : []
      this.pendingSelection = options.selection && !keys ? options.selection : null
    } else if (this.pendingSelection) {
      const keys = toKeys(this.host, this.pendingSelection.start, this.pendingSelection.end)
      if (keys) {
        this.keys = keys
        this.ranges = [keys]
        this.pendingSelection = null
      }
    }
    this.syncDom()
    if (options.enabled) {
      const selection = this.getSelection()
      if (!sameSelection(selection, this.lastEmitted)) {
        this.lastEmitted = selection
        this.emitChange(selection)
      }
    }
  }

  /** 当前活动选区（按最新可见顺序解析；行已离开可视窗口/被过滤时为 null） */
  getSelection(): RangeSelection | null {
    return resolveSelection(this.host, this.keys)
  }

  /** 全部选区（按加入顺序；无法解析到当前可见行的项被过滤） */
  getSelections(): RangeSelection[] {
    return this.ranges.map((keys) => resolveSelection(this.host, keys)).filter((s): s is RangeSelection => s !== null)
  }

  /** 表格手写重建（虚拟滚动/列窗口/resize）后重新装饰；childList 观察覆盖所有路径 */
  private onDomRebuilt = (): void => {
    const options = this.options()
    if (!options.enabled || !this.painted) return
    this.syncDom()
    const selection = this.getSelection()
    if (!sameSelection(selection, this.lastEmitted)) {
      this.lastEmitted = selection
      this.emitChange(selection)
    }
  }

  private options(): RangeSelectionOptions {
    return this.host.getCapabilityOptions<RangeSelectionOptions>('range') ?? { enabled: false }
  }

  private injectStyle(): void {
    if (!this.liveEl) {
      this.liveEl = this.host.shadowRoot.querySelector<HTMLElement>('.range-live')
      if (!this.liveEl) {
        const live = document.createElement('div')
        live.className = 'range-live'
        live.setAttribute('role', 'status')
        live.setAttribute('aria-live', 'polite')
        live.setAttribute('aria-atomic', 'true')
        this.host.shadowRoot.appendChild(live)
        this.liveEl = live
      }
    }
    if (this.host.shadowRoot.querySelector(`#${STYLE_ID}`)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = RANGE_STYLE
    this.host.shadowRoot.appendChild(style)
  }

  setSelection(keys: RangeKeys | null, focusCell = false, mode: 'replace' | 'append' | 'active' = 'replace'): void {
    if (keys === null) {
      this.keys = null
      this.ranges = []
    } else if (mode === 'append') {
      this.ranges = [...this.ranges, keys]
      this.keys = keys
    } else if (mode === 'active' && this.ranges.length > 0) {
      this.ranges = [...this.ranges.slice(0, -1), keys]
      this.keys = keys
    } else {
      this.ranges = [keys]
      this.keys = keys
    }
    this.pendingSelection = null
    const selection = resolveSelection(this.host, this.keys)
    this.syncDom()
    if (!sameSelection(selection, this.lastEmitted)) {
      this.lastEmitted = selection
      // 清空也派发（detail: null），宿主才能同步状态/读屏提示
      this.emitChange(selection)
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

  private emitChange(selection: RangeSelection | null): void {
    this.host.dispatchEvent(new CustomEvent('oas-range-change', { detail: selection }))
    this.announce(selection)
  }

  private announce(selection: RangeSelection | null): void {
    if (this.announceTimer) clearTimeout(this.announceTimer)
    this.announceTimer = setTimeout(() => {
      this.announceTimer = null
      if (!this.liveEl) return
      if (!selection) {
        this.liveEl.textContent = ''
        return
      }
      const rows = selection.end.row - selection.start.row + 1
      const cols = columnOrder(this.host)
      const start = cols.indexOf(selection.start.col)
      const end = cols.indexOf(selection.end.col)
      const count = Math.abs(end - start) + 1
      this.liveEl.textContent =
        this.host.translateText?.('table.rangeSelection', { rows, cols: count }) ??
        `${rows} rows × ${count} columns selected`
    }, 250)
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
    const abs = this.host.hasAttribute('windowed') ? Number(row.getAttribute('data-row-index')) : undefined
    return { key, col, abs }
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || !this.options().enabled) return
    const target = event.target as HTMLElement | null
    if (target?.closest('.range-fill-handle') && this.getSelection()) {
      // 填充柄：进入填充预览，不启动普通选区拖拽
      event.preventDefault()
      event.stopPropagation()
      this.filling = true
      this.fillSource = this.getSelection()
      return
    }
    const td = target?.closest<HTMLElement>('td[data-col]')
    if (!td || isInteractiveEvent(event)) return
    const position = this.cellPositionOf(td)
    if (!position) return
    this.dragging = true
    this.dragAnchor = position
    // 不 preventDefault：保留原生聚焦与 dblclick（编辑能力依赖）；拖拽文本选择由 selectstart 抑制
    if ((event.ctrlKey || event.metaKey) && this.keys) {
      // Ctrl/Cmd 追加一个矩形选区
      this.setSelection({ anchor: position, focus: position }, false, 'append')
    } else if (event.shiftKey && this.keys) {
      // Shift 扩展当前活动选区
      this.setSelection({ anchor: this.keys.anchor, focus: position }, false, 'active')
    } else {
      this.setSelection({ anchor: position, focus: position })
    }
  }

  private onSelectStart = (event: Event): void => {
    if (this.dragging) event.preventDefault()
  }

  /** 拖出表格后页面文本选择同样抑制 */
  private onWindowSelectStart = (event: Event): void => {
    if (this.dragging) event.preventDefault()
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (this.filling) {
      const target = event.target as HTMLElement | null
      const td = target?.closest<HTMLElement>('td[data-col]')
      const position = td ? this.cellPositionOf(td) : null
      if (position) this.previewFill(position)
      return
    }
    if (!this.dragging || !this.dragAnchor) return
    const target = event.target as HTMLElement | null
    const td = target?.closest<HTMLElement>('td[data-col]')
    const position = td ? this.cellPositionOf(td) : null
    if (position) this.scheduleMove(position)
  }

  /** 拖拽移动合并到下一帧，避免每个 pointermove 都全表扫描 */
  private scheduleMove(position: PositionKey): void {
    this.movePending = position
    if (this.moveRaf) return
    this.moveRaf = requestAnimationFrame(() => {
      this.moveRaf = 0
      const pending = this.movePending
      this.movePending = null
      if (pending && this.dragging && this.dragAnchor) {
        this.setSelection({ anchor: this.dragAnchor, focus: pending }, false, 'active')
      }
    })
  }

  private previewFill(position: PositionKey): void {
    const source = this.fillSource
    if (!source) return
    const rows = rowElements(this.host)
    const startRow = Math.min(
      source.start.row,
      position.abs ?? rows.findIndex((tr) => tr.getAttribute('data-key') === position.key),
    )
    const endRow = Math.max(
      source.end.row,
      position.abs ?? rows.findIndex((tr) => tr.getAttribute('data-key') === position.key),
    )
    const startKey = rows[startRow]?.getAttribute('data-key') ?? ''
    const endKey = rows[endRow]?.getAttribute('data-key') ?? ''
    this.setSelection(
      { anchor: { key: startKey, col: source.start.col }, focus: { key: endKey, col: source.end.col } },
      false,
      'active',
    )
  }

  private onPointerUp = (): void => {
    if (this.filling) {
      const source = this.fillSource
      this.filling = false
      this.fillSource = null
      if (source) fillRange(this.host, { source })
      return
    }
    this.dragging = false
    this.dragAnchor = null
  }

  /** 表格外释放/触摸取消的兜底（shadowRoot 不接收表格外 pointerup） */
  private onWindowPointerUp = (): void => {
    if (this.filling) {
      this.onPointerUp()
      return
    }
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
    if ((event.ctrlKey || event.metaKey) && key.toLowerCase() === 'a' && !event.shiftKey && !event.altKey) {
      event.preventDefault()
      event.stopPropagation()
      selectAllRange(this.host)
      return
    }
    if (key === 'Escape') {
      if (!this.keys) return
      event.preventDefault()
      this.setSelection(null)
      return
    }
    if (key === 'Home' || key === 'End') {
      event.preventDefault()
      event.stopPropagation()
      const rows = rowElements(this.host)
      const cols = columnOrder(this.host)
      if (rows.length === 0 || cols.length === 0) return
      const currentRow = this.keys?.focus ? (rowKeys(this.host).get(this.keys.focus.key) ?? 0) : 0
      const targetRow =
        key === 'Home'
          ? event.ctrlKey || event.metaKey
            ? 0
            : currentRow
          : event.ctrlKey || event.metaKey
            ? rows.length - 1
            : currentRow
      const targetCol = key === 'Home' ? 0 : cols.length - 1
      this.moveTo(targetRow, targetCol, event.shiftKey)
      return
    }
    if (key === 'PageUp' || key === 'PageDown') {
      event.preventDefault()
      event.stopPropagation()
      const wrap = this.host.shadowRoot.querySelector<HTMLElement>('.table-scroll')
      const rowHeight = Number(this.host.getAttribute('row-height') ?? 40) || 40
      const pageSize = Math.max(
        1,
        Math.floor((wrap?.clientHeight || Number(this.host.getAttribute('height') ?? 0) || 400) / rowHeight),
      )
      this.moveFocus(key === 'PageUp' ? -pageSize : pageSize, 0, event.shiftKey)
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

  private requestBeyond(targetRow: number, deltaRow: number, col: string, extend: boolean): void {
    const rows = rowElements(this.host)
    const windowed = this.host.hasAttribute('windowed')
    const total = windowed ? Number(this.host.getAttribute('total') ?? 0) : (this.host.data?.length ?? rows.length)
    let index = targetRow
    if (windowed) {
      const current = this.keys?.focus
      const currentTr = current ? rows.find((tr) => tr.getAttribute('data-key') === current.key) : null
      const abs = currentTr ? Number(currentTr.getAttribute('data-row-index')) : targetRow - deltaRow
      index = abs + deltaRow
    }
    if (index < 0 || index >= total) return
    this.pendingFocus = { index, col, extend }
    if (windowed) {
      // windowed 的下一行可能不在当前切片：按绝对行号向宿主请求窗口
      this.host.dispatchEvent(
        new CustomEvent('oas-window-request', { detail: { start: index, end: index + 1, reason: 'scroll' } }),
      )
    } else {
      // 本地虚拟滚动：先滚动到目标行，MutationObserver 重建后由 pendingFocus 落地
      const wrap = this.host.shadowRoot.querySelector<HTMLElement>('.table-scroll')
      if (wrap) {
        const rowHeight = Number(this.host.getAttribute('row-height') ?? 40) || 40
        wrap.scrollTop += deltaRow * rowHeight
      }
    }
  }

  private moveTo(rowIndex: number, colIndex: number, extend: boolean): void {
    const rows = rowElements(this.host)
    const cols = columnOrder(this.host)
    if (rows.length === 0 || cols.length === 0) return
    const row = Math.max(0, Math.min(rows.length - 1, rowIndex))
    const col = Math.max(0, Math.min(cols.length - 1, colIndex))
    const key = rows[row]?.getAttribute('data-key')
    if (key == null) return
    const focus: PositionKey = { key, col: cols[col]! }
    const anchor = extend ? (this.keys?.anchor ?? this.keys?.focus ?? focus) : focus
    this.setSelection({ anchor, focus }, true, 'active')
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
    const nextCol = Math.max(0, Math.min(cols.length - 1, colIndex + deltaCol))
    const targetRow = rowIndex + deltaRow
    if (targetRow < 0 || targetRow >= rows.length) {
      this.requestBeyond(targetRow, deltaRow, cols[nextCol]!, extend)
      return
    }
    const nextRow = targetRow
    const nextKey = rows[nextRow]?.getAttribute('data-key')
    if (nextKey == null) return
    const focus: PositionKey = { key: nextKey, col: cols[nextCol]! }
    const anchor = extend ? (this.keys?.anchor ?? current ?? focus) : focus
    this.setSelection({ anchor, focus }, true, 'active')
  }

  private onPaste = (event: ClipboardEvent): void => {
    if (!this.options().enabled) return
    if (isInteractiveEvent(event)) return
    const text = event.clipboardData?.getData('text/plain') ?? ''
    const selection = this.getSelection()
    if (!text || !selection) return
    const startKey = rowAtIndex(this.host, selection.start.row)?.getAttribute('data-key') ?? ''
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
    const windowed = this.host.hasAttribute('windowed')
    const dataSignature = this.host.getAttribute('data')
    // 键盘越界目标行已渲染/装载：先落地焦点，再按最新行列重绘。
    // windowed 必须等 data 真正变化，避免 window-start 先于 data 的瞬态旧切片误导焦点
    if (this.pendingFocus && (!windowed || dataSignature !== this.lastDataSignature)) {
      const pending = this.pendingFocus
      const target = rows.find((tr) => Number(tr.getAttribute('data-row-index')) === pending.index)
      const key = target?.getAttribute('data-key')
      if (target && key) {
        const focus: PositionKey = { key, col: pending.col, abs: pending.index }
        const anchor = pending.extend ? (this.keys?.anchor ?? focus) : focus
        this.keys = { anchor, focus }
        this.ranges = this.ranges.length > 0 ? [...this.ranges.slice(0, -1), this.keys] : [this.keys]
        this.pendingFocus = null
        const td = this.cellOf(key, pending.col)
        if (td) {
          this.suppressFocus = true
          td.focus()
          this.suppressFocus = false
        }
      }
    }
    this.lastDataSignature = dataSignature
    // 多选区逐矩形归一化；活动选区（keys）仅负责锚点/焦点/键盘
    const rects = (options.enabled ? this.ranges : [])
      .map((range) => selectionRect(this.host, range))
      .filter((rect): rect is SelectionRect => rect !== null)
    const hasSelection = rects.length > 0
    const anchorRow = keys ? rowIndex.get(keys.anchor.key) : undefined
    const focusRow = keys ? rowIndex.get(keys.focus.key) : undefined
    const anchorCol = keys ? colIndex.get(keys.anchor.col) : undefined
    const focusCol = keys ? colIndex.get(keys.focus.col) : undefined
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
      const rowPos = this.host.hasAttribute('windowed') ? Number(rowEl.getAttribute('data-row-index')) : row
      for (const td of rowEl.querySelectorAll<HTMLTableCellElement>('td[data-col]')) {
        const col = td.getAttribute('data-col') ?? ''
        const colIdx = colIndex.get(col) ?? -1
        const selected =
          hasSelection &&
          rects.some(
            (rect) =>
              rowPos >= rect.startRow && rowPos <= rect.endRow && colIdx >= rect.startCol && colIdx <= rect.endCol,
          )
        td.classList.toggle('range-selected', selected)
        const isAnchor = Boolean(selected && keys && rowKey === keys.anchor.key && col === keys.anchor.col)
        const isFocus = Boolean(selected && keys && rowKey === keys.focus.key && col === keys.focus.col)
        td.classList.toggle('range-anchor', isAnchor)
        td.classList.toggle('range-focus', isFocus)
        if (options.enabled && isFocus) {
          if (!td.querySelector('.range-fill-handle')) {
            const handle = document.createElement('span')
            handle.className = 'range-fill-handle'
            handle.setAttribute('part', 'fill-handle')
            handle.setAttribute('aria-hidden', 'true')
            td.appendChild(handle)
          }
        } else {
          td.querySelector('.range-fill-handle')?.remove()
        }
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
  if (typeof host.getCapabilityOptions !== 'function') {
    throw new Error('[oas-table] enableRangeSelection 需要已升级的 oas-table 元素（请先 import 表格入口）')
  }
  const current = host.getCapabilityOptions<RangeSelectionOptions>('range') ?? { enabled: false }
  host.setCapabilityOptions('range', { ...current, enabled })
}

/** 设置/清除选区；设置会自动启用区域选择。坐标按当前可见行/列给出，内部以行键 + 列 key 锚定。 */
export function setRangeSelection(table: HTMLElement, start: CellPosition | null, end?: CellPosition): void {
  const host = table as RangeHost
  if (typeof host.getCapabilityOptions !== 'function') {
    throw new Error('[oas-table] setRangeSelection 需要已升级的 oas-table 元素（请先 import 表格入口）')
  }
  const current = host.getCapabilityOptions<RangeSelectionOptions>('range') ?? { enabled: false }
  if (!start) {
    host.setCapabilityOptions('range', { ...current, selection: null })
    return
  }
  host.setCapabilityOptions('range', { ...current, enabled: true, selection: { start, end: end ?? start } })
}

/** 读取当前活动选区（按最新可见顺序解析；行已离开可视窗口/被过滤时返回 null） */
export function getRangeSelection(table: HTMLElement): RangeSelection | null {
  return controllerOf(table)?.getSelection() ?? null
}

/** 读取全部选区（Ctrl/Cmd 追加的多矩形；无法解析到当前可见行的项被过滤） */
export function getRangeSelections(table: HTMLElement): RangeSelection[] {
  return controllerOf(table)?.getSelections() ?? []
}

/** 追加一个矩形选区（程序化多选；不替换已有选区） */
export function addRangeSelection(table: HTMLElement, start: CellPosition, end?: CellPosition): void {
  const host = table as RangeHost
  if (typeof host.getCapabilityOptions !== 'function') {
    throw new Error('[oas-table] addRangeSelection 需要已升级的 oas-table 元素（请先 import 表格入口）')
  }
  const controller = controllerOf(table)
  if (!controller) return
  enableRangeSelection(table)
  const keys = toKeys(host, start, end ?? start)
  if (keys) controller.setSelection(keys, false, 'append')
}

/** 按行键选择单元格/区域（focus 省略时为单格；col 默认为当前焦点列或首列） */
export function selectByKey(table: HTMLElement, anchor: CellKey, focus?: CellKey): void {
  const host = table as RangeHost
  if (typeof host.getCapabilityOptions !== 'function') {
    throw new Error('[oas-table] selectByKey 需要已升级的 oas-table 元素（请先 import 表格入口）')
  }
  const controller = controllerOf(table)
  if (!controller) return
  enableRangeSelection(table)
  const col = focus?.col ?? anchor.col ?? controller.getSelection()?.start.col ?? columnOrder(host)[0]
  if (!col) return
  controller.setSelection({
    anchor: { ...anchor, col: anchor.col ?? col },
    focus: { ...(focus ?? anchor), col: focus?.col ?? col },
  })
}

/** 选中整行（可见行下标；列取当前全部生效列） */
export function selectRow(table: HTMLElement, row: number): void {
  const host = table as RangeHost
  const cols = columnOrder(host)
  if (cols.length === 0) return
  setRangeSelection(table, { row, col: cols[0]! }, { row, col: cols[cols.length - 1]! })
}

/** 选中整列（当前全部可见行） */
export function selectColumn(table: HTMLElement, col: string): void {
  const rows = rowElements(table as RangeHost)
  if (rows.length === 0) return
  setRangeSelection(table, { row: 0, col }, { row: rows.length - 1, col })
}

/** 选中当前可见全部单元格（windowed/虚拟场景为当前已装载范围） */
export function selectAllRange(table: HTMLElement): void {
  const host = table as RangeHost
  const cols = columnOrder(host)
  const rows = rowElements(host)
  if (cols.length === 0 || rows.length === 0) return
  setRangeSelection(table, { row: 0, col: cols[0]! }, { row: rows.length - 1, col: cols[cols.length - 1]! })
}

/**
 * 复制当前选区为 TSV（按可见行列顺序）。优先写系统剪贴板，失败时仍返回文本并派发事件。
 * 事件：`oas-range-copy`（detail: { text, selection }）。
 */
export async function copyRange(table: HTMLElement, options: RangeCopyOptions = {}): Promise<string> {
  const host = table as RangeHost
  const controller = controllerOf(table)
  if (!controller) return ''
  const selections = controller.getSelections()
  if (selections.length === 0) return ''
  const cols = columnOrder(host)
  const rows = rowElements(host)
  const blocks: string[] = []
  for (const selection of selections) {
    const startCol = Math.min(cols.indexOf(selection.start.col), cols.indexOf(selection.end.col))
    const endCol = Math.max(cols.indexOf(selection.start.col), cols.indexOf(selection.end.col))
    const lines: string[] = []
    if (options.header && blocks.length === 0) {
      const titles = leafColumns(host.effectiveColumns?.() ?? host.columns ?? []).map(
        (column) => column.title ?? column.key,
      )
      lines.push(titles.slice(startCol, endCol + 1).join('\t'))
    }
    for (let row = 0; row < rows.length; row++) {
      const rowPos = host.hasAttribute('windowed') ? Number(rows[row]!.getAttribute('data-row-index')) : row
      if (rowPos < selection.start.row || rowPos > selection.end.row) continue
      const cells = rows[row]!.querySelectorAll<HTMLTableCellElement>('td[data-col]')
      if (!cells) continue
      const values: string[] = []
      for (let col = startCol; col <= endCol; col++) {
        const key = cols[col]
        const td = key ? [...cells].find((cell) => cell.getAttribute('data-col') === key) : undefined
        values.push((td?.textContent ?? '').replace(/[\t\r\n]+/g, ' ').trim())
      }
      lines.push(values.join('\t'))
    }
    blocks.push(lines.join('\n'))
  }
  const text = blocks.join('\n\n')
  try {
    await navigator.clipboard?.writeText(text)
  } catch {
    /* 剪贴板权限不可用时仍派发事件/返回文本，由宿主自行降级 */
  }
  const selection = controller.getSelection()!
  host.dispatchEvent(new CustomEvent<RangeCopyDetail>('oas-range-copy', { detail: { text, selection, selections } }))
  return text
}

function findRowPath(
  rows: readonly Record<string, unknown>[],
  key: string,
  rowKey: string,
  prefix: number[] = [],
): number[] | null {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    if (rowKeyValue(row, rowKey) === key) return [...prefix, i]
    const children = row.children
    if (Array.isArray(children)) {
      const found = findRowPath(children as Record<string, unknown>[], key, rowKey, [...prefix, i])
      if (found) return found
    }
  }
  return null
}

function rowAtPath(rows: readonly Record<string, unknown>[], path: readonly number[]): Record<string, unknown> | null {
  let current: Record<string, unknown> | undefined = rows[path[0]!]
  for (const index of path.slice(1)) {
    const children = current?.children
    if (!Array.isArray(children)) return null
    current = (children as Record<string, unknown>[])[index]
  }
  return current ?? null
}

function replaceAtPath(
  rows: readonly Record<string, unknown>[],
  path: readonly number[],
  column: string,
  value: unknown,
): Record<string, unknown>[] {
  const index = path[0]!
  const next = rows.slice()
  if (path.length === 1) {
    next[index] = { ...rows[index], [column]: value }
    return next
  }
  const children = Array.isArray(rows[index]!.children) ? (rows[index]!.children as Record<string, unknown>[]) : []
  next[index] = { ...rows[index], children: replaceAtPath(children, path.slice(1), column, value) }
  return next
}

function writeRangeChanges(host: RangeHost, kind: RangeWriteKind, changes: RangeWriteChange[]): number {
  if (changes.length === 0) return 0
  const controlled = host.hasAttribute('edit-controlled')
  if (!controlled) {
    const rowKey = host.getAttribute('row-key') ?? 'key'
    let next = host.data ?? []
    const applied: RangeWriteChange[] = []
    for (const change of changes) {
      const path = findRowPath(next, change.key, rowKey)
      if (!path) continue
      next = replaceAtPath(next, path, change.column, change.value)
      applied.push(change)
    }
    if (applied.length > 0) host.setAttribute('data', JSON.stringify(next))
    changes = applied
  }
  host.dispatchEvent(new CustomEvent<RangeWriteDetail>('oas-range-write', { detail: { kind, changes } }))
  return changes.length
}

function cellOld(row: Record<string, unknown>, column: string): { oldValue: string; oldRawValue: unknown } {
  const raw = row[column]
  return { oldValue: String(raw ?? ''), oldRawValue: Array.isArray(raw) ? [...raw] : raw }
}

/** 复制选区后清空对应单元格（uncontrolled 才改数据；edit-controlled 仅发 oas-range-write） */
export async function cutRange(table: HTMLElement, options: RangeCopyOptions = {}): Promise<string> {
  const host = table as RangeHost
  const controller = controllerOf(table)
  if (!controller) return ''
  const text = await copyRange(table, options)
  if (!text) return ''
  const selection = controller.getSelection()
  if (!selection) return text
  const rows = rowElements(host)
  const cols = columnOrder(host)
  const changes: RangeWriteChange[] = []
  const rowKey = host.getAttribute('row-key') ?? 'key'
  const startCol = Math.min(cols.indexOf(selection.start.col), cols.indexOf(selection.end.col))
  const endCol = Math.max(cols.indexOf(selection.start.col), cols.indexOf(selection.end.col))
  for (let row = selection.start.row; row <= selection.end.row; row++) {
    const tr = rows[row]
    const key = tr?.getAttribute('data-key')
    if (!tr || key == null) continue
    const dataRow = findRowPath(host.data ?? [], key, rowKey)
    const source = dataRow ? rowAtPath(host.data ?? [], dataRow) : null
    if (!source) continue
    for (let col = startCol; col <= endCol; col++) {
      const column = cols[col]
      if (!column) continue
      changes.push({ key, column, value: '', ...cellOld(source, column) })
    }
  }
  writeRangeChanges(host, 'cut', changes)
  return text
}

function coerceText(text: string, oldRawValue: unknown): unknown {
  if (typeof oldRawValue === 'number' && text.trim() !== '' && Number.isFinite(Number(text))) return Number(text)
  if (typeof oldRawValue === 'boolean') {
    const normalized = text.trim().toLowerCase()
    if (['true', '1', 'on', 'yes'].includes(normalized)) return true
    if (['false', '0', 'off', 'no', ''].includes(normalized)) return false
    return text
  }
  if (Array.isArray(oldRawValue)) return text === '' ? [] : text.split(',')
  return text
}

/** 将 TSV 按当前选区左上角写回（startKey + 可见行序）；返回写入单元格数 */
export function applyRangePaste(table: HTMLElement, text: string, options: RangePasteApplyOptions = {}): number {
  const host = table as RangeHost
  const controller = controllerOf(table)
  const selection = controller?.getSelection()
  if (!controller || !selection || !text) return 0
  const matrix = parseTsv(text)
  if (matrix.length === 0) return 0
  const rows = rowElements(host)
  const cols = columnOrder(host)
  const rowKey = host.getAttribute('row-key') ?? 'key'
  const startCol = Math.min(cols.indexOf(selection.start.col), cols.indexOf(selection.end.col))
  const changes: RangeWriteChange[] = []
  for (let r = 0; r < matrix.length; r++) {
    const tr = rowAtIndex(host, selection.start.row + r)
    const key = tr?.getAttribute('data-key')
    if (!tr || key == null) break
    const path = findRowPath(host.data ?? [], key, rowKey)
    if (!path) continue
    let source: Record<string, unknown> | undefined = rowAtPath(host.data ?? [], path) ?? undefined
    if (!source) continue
    const line = matrix[r]!
    for (let c = 0; c < line.length; c++) {
      const column = cols[startCol + c]
      if (!column) break
      const rawText = line[c] ?? ''
      if (options.skipEmpty && rawText === '') continue
      const old = cellOld(source, column)
      changes.push({
        key,
        column,
        value: options.coerce ? options.coerce(rawText, column) : coerceText(rawText, old.oldRawValue),
        ...old,
      })
    }
  }
  return writeRangeChanges(host, 'paste', changes)
}

/** 按当前选区/源选区填充（复制或数值序列）；返回写入单元格数 */
export function fillRange(table: HTMLElement, options: RangeFillOptions = {}): number {
  const host = table as RangeHost
  const controller = controllerOf(table)
  if (!controller) return 0
  const source = options.source ?? controller.getSelection()
  if (!source) return 0
  const direction = options.direction ?? 'down'
  const mode = options.mode ?? 'copy'
  const cells = Math.max(1, Math.trunc(options.cells ?? 1) || 1)
  const cols = columnOrder(host)
  const rowKey = host.getAttribute('row-key') ?? 'key'
  const changes: RangeWriteChange[] = []
  const sourceValue = (
    rowIndex: number,
    col: string,
  ): { value: unknown; old: { oldValue: string; oldRawValue: unknown } } => {
    const tr = rowAtIndex(host, rowIndex)
    const key = tr?.getAttribute('data-key')
    if (!key) return { value: '', old: { oldValue: '', oldRawValue: '' } }
    const path = findRowPath(host.data ?? [], key, rowKey)
    const row = path ? rowAtPath(host.data ?? [], path) : null
    return { value: row?.[col], old: cellOld(row ?? {}, col) }
  }
  const pushChange = (
    targetRow: number,
    targetCol: string,
    sourceRow: number,
    sourceCol: string,
    offset: number,
  ): void => {
    const tr = rowAtIndex(host, targetRow)
    const key = tr?.getAttribute('data-key')
    if (!key) return
    const path = findRowPath(host.data ?? [], key, rowKey)
    const target = path ? rowAtPath(host.data ?? [], path) : null
    if (!target) return
    const source = sourceValue(sourceRow, sourceCol)
    const step = Math.abs(options.step ?? 1)
    let value: unknown
    if (mode === 'series' && typeof source.value === 'number' && Number.isFinite(source.value)) {
      value = source.value + step * offset
    } else if (
      mode === 'series' &&
      typeof source.value === 'string' &&
      source.value.trim() !== '' &&
      Number.isFinite(Number(source.value))
    ) {
      value = Number(source.value) + step * offset
    } else {
      value = source.value ?? ''
    }
    changes.push({ key, column: targetCol, value, ...cellOld(target, targetCol) })
  }
  if (direction === 'down' || direction === 'up') {
    const sign = direction === 'down' ? 1 : -1
    const startRow = direction === 'down' ? source.end.row : source.start.row
    const startCol = cols.indexOf(source.start.col)
    const endCol = cols.indexOf(source.end.col)
    for (let offset = 1; offset <= cells; offset++) {
      const targetRow = startRow + sign * offset
      if (targetRow < 0) continue
      for (let col = startCol; col <= endCol; col++) {
        pushChange(targetRow, cols[col]!, startRow, cols[col]!, sign * offset)
      }
    }
  } else {
    const sign = direction === 'right' ? 1 : -1
    const startCol = cols.indexOf(direction === 'right' ? source.end.col : source.start.col)
    for (let offset = 1; offset <= cells; offset++) {
      const targetCol = startCol + sign * offset
      if (targetCol < 0 || targetCol >= cols.length) continue
      for (let row = source.start.row; row <= source.end.row; row++) {
        pushChange(row, cols[targetCol]!, row, direction === 'right' ? source.end.col : source.start.col, sign * offset)
      }
    }
  }
  const changed = writeRangeChanges(host, 'fill', changes)
  if (changed > 0) {
    const startKey = rowAtIndex(host, source.start.row)?.getAttribute('data-key') ?? ''
    const endKey = rowAtIndex(host, source.end.row)?.getAttribute('data-key') ?? ''
    const startCol = cols.indexOf(source.start.col)
    const endCol = cols.indexOf(source.end.col)
    let focus: PositionKey = { key: endKey, col: source.end.col }
    if (direction === 'down') {
      focus = { key: rowAtIndex(host, source.end.row + cells)?.getAttribute('data-key') ?? endKey, col: source.end.col }
    } else if (direction === 'up') {
      focus = {
        key: rowAtIndex(host, source.start.row - cells)?.getAttribute('data-key') ?? startKey,
        col: source.end.col,
      }
    } else if (direction === 'right') {
      focus = { key: endKey, col: cols[endCol + cells] ?? source.end.col }
    } else {
      focus = { key: startKey, col: cols[startCol - cells] ?? source.start.col }
    }
    controller.setSelection({ anchor: { key: startKey, col: source.start.col }, focus }, false, 'active')
  }
  return changed
}

registerTableCapability('range', (host) => {
  const controller = new RangeSelectionController(host as RangeHost)
  controllers.set(host as HTMLElement, controller)
  return controller
})
