import type { TableColumn, TableDisplaySnapshot } from '../oas-table.js'
import { registerTableCapability } from '../oas-table-capability.js'
import { isInteractiveEvent } from '../oas-table-interactive.js'
import { rowKeyValue } from '../oas-table-row-key.js'
import { expandWindow, loadedRange, windowCovered, WINDOW_MARGIN } from '../../../shared/window-data.js'
import { parseTsv } from '../advanced/clipboard.js'
import type { RangeWriteChange, RangeWriteDetail, RangeWriteKind } from '../oas-table-range-write.js'

export type { RangeWriteChange, RangeWriteDetail, RangeWriteKind } from '../oas-table-range-write.js'

/** 单元格坐标：row 为 `data-row-index` 展示集行号（0 基；windowed 为全量绝对行号），与 oas-cell-click / oas-edit 一致 */
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
  /** 外部写入的展示集坐标快照；交互过程中由行键锚定，不回写这里（避免拖拽时整表重建） */
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
  /** 数值序列步长绝对值（默认 1；正负由 direction 决定） */
  step?: number
  /** 填充行/列数（默认 1；以方向边界行/列为源，不做源块循环） */
  cells?: number
  /** 内部：拖拽填充柄时的源选区（不传则用当前活动选区） */
  source?: RangeSelection
}

interface PositionKey {
  key: string
  col: string
  /** 展示集行号（windowed 为全量绝对行号）；离窗锚点保留时使用 */
  abs?: number
  /** 创建锚点时的展示集签名；非 windowed 仅签名不变才允许复用离窗 abs */
  view?: string
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
  const absOf = (position: PositionKey): number | undefined => {
    const visible = rows.get(position.key)
    if (visible !== undefined) return visible
    if (position.abs === undefined) return undefined
    if (windowed) {
      if (position.abs < 0 || position.abs >= displayRowCount(host)) return undefined
      // abs 行存在但 key 不匹配：数据已被插入/重排，不能拿旧 abs 当锚点
      const absRow = rowAtIndex(host, position.abs)
      if (absRow && absRow.getAttribute('data-key') !== position.key) return undefined
      return position.abs
    }
    // 非 windowed 的完整展示集快照能解析离窗行：结构变化时也按 key 重定位
    const snapshot = host.getDisplaySnapshot?.()
    if (snapshot) return snapshot.rowIndexByKey.get(position.key)
    // 快照不可用的旧宿主才回退签名；abs 位 key 不匹配同样拒绝
    if (position.abs < 0 || position.abs >= displayRowCount(host)) return undefined
    const absRow = rowAtIndex(host, position.abs)
    if (absRow && absRow.getAttribute('data-key') !== position.key) return undefined
    return position.view === rangeViewSignature(host) ? position.abs : undefined
  }
  const anchorRow = absOf(keys.anchor)
  const focusRow = absOf(keys.focus)
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

/** 行键 + 可选列 key 的单元格坐标（供 selectByKey 使用；windowed 未渲染时可提供 abs） */
export interface CellKey {
  key: string
  col?: string
  abs?: number
}

/** selectByKey 的可选列（省略时取当前焦点列或首列） */
export type CellKeyOptionalCol = CellKey

interface RangeKeys {
  anchor: PositionKey
  focus: PositionKey
}

interface RangeHost extends HTMLElement {
  shadowRoot: ShadowRoot
  columns: TableColumn[]
  data?: Array<Record<string, unknown>>
  effectiveColumns?(): TableColumn[]
  getDisplaySnapshot?(): TableDisplaySnapshot | null
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

function rowIndexOf(tr: HTMLTableRowElement, fallback = -1): number {
  const raw = tr.getAttribute('data-row-index')
  if (raw === null) return fallback
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

/** 统一按展示集行号找渲染行；DOM 数组下标只在无 data-row-index 的旧快照中兜底 */
function rowAtIndex(host: RangeHost, index: number): HTMLTableRowElement | undefined {
  const rows = rowElements(host)
  return rows.find((tr, domIndex) => rowIndexOf(tr, domIndex) === index)
}

function rowKeys(host: RangeHost): Map<string, number> {
  const map = new Map<string, number>()
  rowElements(host).forEach((tr, index) => {
    const key = tr.getAttribute('data-key')
    if (key !== null && !map.has(key)) map.set(key, rowIndexOf(tr, index))
  })
  return map
}

function positionOfRow(host: RangeHost, tr: HTMLTableRowElement, col: string): PositionKey | null {
  const key = tr.getAttribute('data-key')
  if (key === null) return null
  const abs = rowIndexOf(tr)
  return { key, col, abs: abs >= 0 ? abs : undefined, view: rangeViewSignature(host) }
}

/** 当前展示集总行数（windowed 为 total）；与表格 aria-rowcount 共用同一口径 */
function displayRowCount(host: RangeHost): number {
  const raw = host.shadowRoot.querySelector('table')?.getAttribute('aria-rowcount')
  const fromAria = raw === null || raw === undefined ? Number.NaN : Number(raw)
  if (Number.isFinite(fromAria) && fromAria >= 0) return fromAria
  if (host.hasAttribute('windowed')) return Math.max(0, Number(host.getAttribute('total') ?? 0) || 0)
  return host.data?.length ?? rowElements(host).length
}

const RANGE_VIEW_ATTRS = [
  'sort-key',
  'sort-order',
  'multi-sort',
  'filter-values',
  'group-by',
  'page-size',
  'current',
  'expanded',
  'pagination',
  'total',
  'row-key',
] as const

/** 旧宿主回退签名（不读原始 data）；新实现优先消费 getDisplaySnapshot 的结构指纹 */
function rangeViewSignature(host: RangeHost): string {
  const snapshot = host.getDisplaySnapshot?.()
  if (snapshot) return snapshot.fingerprint
  return JSON.stringify([
    ...RANGE_VIEW_ATTRS.map((attr) => [attr, host.getAttribute(attr)]),
    ['aria-rowcount', host.shadowRoot.querySelector('table')?.getAttribute('aria-rowcount')],
  ])
}

function withRangeView(host: RangeHost, keys: RangeKeys | null): RangeKeys | null {
  if (!keys) return null
  const view = rangeViewSignature(host)
  return {
    anchor: { ...keys.anchor, view: keys.anchor.view ?? view },
    focus: { ...keys.focus, view: keys.focus.view ?? view },
  }
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

function sameKeys(a: RangeKeys | null, b: RangeKeys | null): boolean {
  if (a === null || b === null) return a === b
  return (
    a.anchor.key === b.anchor.key &&
    a.anchor.col === b.anchor.col &&
    a.focus.key === b.focus.key &&
    a.focus.col === b.focus.col
  )
}

function sameSelection(a: RangeSelection | null, b: RangeSelection | null): boolean {
  if (a === null || b === null) return a === b
  return (
    a.start.row === b.start.row && a.start.col === b.start.col && a.end.row === b.end.row && a.end.col === b.end.col
  )
}

/** 把公开展示集坐标转成行键坐标；优先用完整展示集快照解析未渲染行，目标不在展示集时返回 null */
function toKeys(host: RangeHost, start: CellPosition, end: CellPosition): RangeKeys | null {
  const snapshot = host.getDisplaySnapshot?.()
  if (snapshot) {
    const fromSnapshot = (position: CellPosition): PositionKey | null => {
      const key = snapshot.keysByIndex[position.row]
      if (!key) return null
      return { key, col: position.col, abs: position.row, view: snapshot.fingerprint }
    }
    const anchor = fromSnapshot(start)
    const focus = fromSnapshot(end)
    return anchor && focus ? { anchor, focus } : null
  }
  const startRow = rowAtIndex(host, start.row)
  const endRow = rowAtIndex(host, end.row)
  if (!startRow || !endRow) return null
  const anchor = positionOfRow(host, startRow, start.col)
  const focus = positionOfRow(host, endRow, end.col)
  return anchor && focus ? { anchor, focus } : null
}

interface PendingGate {
  waitForData: boolean
  windowStart: number
  firstKey: string | null
  dataReady: boolean
}

function firstRowKey(host: RangeHost, start: number): string | null {
  const snapshotKey = host.getDisplaySnapshot?.()?.keysByIndex[start]
  if (snapshotKey) return snapshotKey
  const first = host.data?.[0]
  return first ? rowKeyValue(first, host.getAttribute('row-key') ?? 'key') : null
}

function shouldResolvePending(
  gate: PendingGate,
  start: number,
  firstKey: string | null,
  dataChanged: boolean,
): boolean {
  if (!gate.waitForData) return true
  // data 到达且 window-start 已同步，或首行键连续（合法同窗口扩窗）才允许落地
  if (dataChanged && (start !== gate.windowStart || firstKey === gate.firstKey)) return true
  // data 已先到达但首行键不连续：必须等 window-start 后到达，防止旧 offset 错绑
  return gate.dataReady && start !== gate.windowStart
}

function updatePendingGate(gate: PendingGate, firstKey: string | null, dataChanged: boolean): void {
  if (dataChanged) gate.dataReady = true
  // windowStart 保留创建时的原值，供后续 data/window-start 分批到达时判定顺序
  gate.firstKey = firstKey
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
  private pendingSelection: {
    selection: RangeSelection
    dataSignature: string | null
    windowStart: number
    firstKey: string | null
    waitForData: boolean
    dataReady: boolean
  } | null = null
  private pendingFocus: {
    index: number
    col: string
    extend: boolean
    waitForData: boolean
    windowStart: number
    firstKey: string | null
    dataReady: boolean
    scrollIndex: number
  } | null = null
  /** 填充柄拖拽中的源选区 */
  private fillSource: RangeSelection | null = null
  private fillPreview: { direction: 'down' | 'up' | 'left' | 'right'; cells: number } | null = null
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
    const isOwnNode = (node: Node): boolean => {
      if (node.nodeType !== 1) return false
      const el = node as HTMLElement
      return el.id === STYLE_ID || el.classList.contains('range-fill-handle') || el.classList.contains('range-live')
    }
    this.observer = new MutationObserver((records) => {
      const ownOnly = records.every((record) => {
        if ((record.target as HTMLElement).classList?.contains('range-live')) return true
        return [...record.addedNodes, ...record.removedNodes].every(isOwnNode)
      })
      if (!ownOnly) this.onDomRebuilt()
    })
    this.observer.observe(this.host.shadowRoot, { childList: true, subtree: true })
    // 拖拽可能在表格外释放（shadowRoot 收不到 pointerup）：window 级兜底复位，避免 dragging 永久残留
    window.addEventListener('pointerup', this.onWindowPointerUp)
    window.addEventListener('pointercancel', this.onWindowPointerCancel)
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
    this.pendingFocus = null
    this.pendingSelection = null
    window.removeEventListener('pointerup', this.onWindowPointerUp)
    window.removeEventListener('pointercancel', this.onWindowPointerCancel)
    window.removeEventListener('selectstart', this.onWindowSelectStart)
  }

  hostUpdated(): void {
    const options = this.options()
    if (!options.enabled) {
      this.pendingFocus = null
      this.pendingSelection = null
    }
    // 未启用且从未绘制过：不注入样式、不遍历 DOM（能力被 import 后所有表都会走到这里）
    if (!options.enabled && !this.painted) return
    this.injectStyle()
    // 只认「对象身份变化」的外部写入：交互只改内部键锚定，避免每次拖拽/方向键都重建整表 DOM
    if (options.selection !== this.lastSeen) {
      this.lastSeen = options.selection
      this.pendingFocus = null
      const keys = options.selection ? toKeys(this.host, options.selection.start, options.selection.end) : null
      this.keys = keys
      this.ranges = keys ? [keys] : []
      this.pendingSelection = options.selection && !keys ? this.createPendingSelection(options.selection) : null
    } else if (this.pendingSelection) {
      this.resolvePendingSelection()
    }
    this.syncDom()
    if (options.enabled) {
      const selection = this.getSelection()
      if (this.shouldEmit(selection)) {
        this.lastEmitted = selection
        this.emitChange(selection)
      }
    }
  }

  /** 当前活动选区（展示集坐标；windowed 离窗行保留逻辑锚点，仅在无法解析时返回 null） */
  getSelection(): RangeSelection | null {
    return resolveSelection(this.host, this.keys)
  }

  /** 全部逻辑选区（按加入顺序；无法解析的项被过滤，windowed 离窗不等于失效） */
  getSelections(): RangeSelection[] {
    return this.ranges.map((keys) => resolveSelection(this.host, keys)).filter((s): s is RangeSelection => s !== null)
  }

  /** 表格手写重建（虚拟滚动/列窗口/resize）后重新装饰；childList 观察覆盖所有路径 */
  private onDomRebuilt = (): void => {
    const options = this.options()
    if (!options.enabled || !this.painted) return
    this.resolvePendingSelection()
    this.syncDom()
    const selection = this.getSelection()
    if (this.shouldEmit(selection)) {
      this.lastEmitted = selection
      this.emitChange(selection)
    }
  }

  private resolvePendingSelection(): void {
    const pending = this.pendingSelection
    if (!pending) return
    const dataSignature = this.host.getAttribute('data')
    const windowStart = Math.max(0, Number(this.host.getAttribute('window-start') ?? 0) || 0)
    const dataChanged = dataSignature !== pending.dataSignature
    const firstKey = firstRowKey(this.host, windowStart)
    if (!shouldResolvePending(pending, windowStart, firstKey, dataChanged)) return
    const keys = toKeys(this.host, pending.selection.start, pending.selection.end)
    if (keys) {
      this.keys = keys
      this.ranges = [keys]
      this.pendingSelection = null
      return
    }
    updatePendingGate(pending, firstKey, dataChanged)
    pending.dataSignature = dataSignature
  }

  private createPendingSelection(selection: RangeSelection): {
    selection: RangeSelection
    dataSignature: string | null
    windowStart: number
    firstKey: string | null
    waitForData: boolean
    dataReady: boolean
  } {
    const windowed = this.host.hasAttribute('windowed')
    const loadedStart = Math.max(0, Number(this.host.getAttribute('window-start') ?? 0) || 0)
    const loadedEnd = loadedStart + (this.host.data?.length ?? 0)
    const outside = (row: number): boolean => row < loadedStart || row >= loadedEnd
    const waitForData = windowed && (outside(selection.start.row) || outside(selection.end.row))
    return {
      selection,
      dataSignature: this.host.getAttribute('data'),
      windowStart: loadedStart,
      firstKey: firstRowKey(this.host, loadedStart),
      waitForData,
      dataReady: !waitForData,
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
    this.pendingFocus = null
    keys = withRangeView(this.host, keys)
    if (keys === null) {
      this.keys = null
      this.ranges = []
    } else if (mode === 'append') {
      const existing = this.ranges.findIndex((range) => sameKeys(range, keys))
      this.ranges =
        existing >= 0 ? [...this.ranges.filter((_, index) => index !== existing), keys] : [...this.ranges, keys]
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
    if (this.shouldEmit(selection)) {
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

  /** 展示集坐标在滚动中稳定，只有真实选区变化或可见性变化才派发；数据重排会给出新坐标 */
  private shouldEmit(selection: RangeSelection | null): boolean {
    return !sameSelection(selection, this.lastEmitted)
  }

  private cellOf(key: string, col: string): HTMLTableCellElement | null {
    const row = rowElements(this.host).find((tr) => tr.getAttribute('data-key') === key)
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
    if (!row || !col) return null
    return positionOfRow(this.host, row, col)
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
    this.filling = false
    this.fillSource = null
    this.fillPreview = null
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
      if (position) this.scheduleMove(position)
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
      if (pending && this.filling) {
        this.previewFill(pending)
      } else if (pending && this.dragging && this.dragAnchor) {
        this.setSelection({ anchor: this.dragAnchor, focus: pending }, false, 'active')
      }
    })
  }

  private previewFill(position: PositionKey): void {
    const source = this.fillSource
    if (!source) return
    const cols = columnOrder(this.host)
    const rowPos = position.abs ?? rowKeys(this.host).get(position.key) ?? -1
    if (rowPos < 0) return
    const colPos = cols.indexOf(position.col)
    let direction: 'down' | 'up' | 'left' | 'right' | null = null
    let cells = 0
    if (rowPos > source.end.row) {
      direction = 'down'
      cells = rowPos - source.end.row
    } else if (rowPos < source.start.row) {
      direction = 'up'
      cells = source.start.row - rowPos
    } else if (colPos > cols.indexOf(source.end.col)) {
      direction = 'right'
      cells = colPos - cols.indexOf(source.end.col)
    } else if (colPos < cols.indexOf(source.start.col)) {
      direction = 'left'
      cells = cols.indexOf(source.start.col) - colPos
    }
    this.fillPreview = direction && cells > 0 ? { direction, cells } : null
    const startRow = Math.min(source.start.row, rowPos)
    const endRow = Math.max(source.end.row, rowPos)
    const startKey = rowAtIndex(this.host, startRow)?.getAttribute('data-key') ?? ''
    const endKey = rowAtIndex(this.host, endRow)?.getAttribute('data-key') ?? ''
    let focusCol = source.end.col
    if (direction === 'right') focusCol = cols[cols.indexOf(source.end.col) + cells] ?? source.end.col
    else if (direction === 'left') focusCol = cols[cols.indexOf(source.start.col) - cells] ?? source.start.col
    this.setSelection(
      {
        anchor: { key: startKey, col: source.start.col, abs: startRow },
        focus: { key: endKey, col: focusCol, abs: endRow },
      },
      false,
      'active',
    )
  }

  private onPointerUp = (): void => {
    if (this.filling) {
      // pointermove 已合帧：释放先冲刷最后的位置，保证方向/格数与最终预览一致
      if (this.movePending) {
        const pending = this.movePending
        this.movePending = null
        if (this.moveRaf) cancelAnimationFrame(this.moveRaf)
        this.moveRaf = 0
        this.previewFill(pending)
      }
      const source = this.fillSource
      const preview = this.fillPreview
      this.filling = false
      this.fillSource = null
      this.fillPreview = null
      // 只有发生方向/格数位移才写入；点击/无预览/取消不填
      if (source && preview) fillRange(this.host, { source, direction: preview.direction, cells: preview.cells })
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

  /** 系统手势取消（pointercancel）：只复位并恢复源选区，不写入填充数据 */
  private onWindowPointerCancel = (): void => {
    const source = this.fillSource
    this.filling = false
    this.fillSource = null
    this.fillPreview = null
    this.dragging = false
    this.dragAnchor = null
    if (this.moveRaf) cancelAnimationFrame(this.moveRaf)
    this.moveRaf = 0
    this.movePending = null
    if (source) {
      const keys = toKeys(this.host, source.start, source.end)
      if (keys) this.setSelection(keys, false, 'active')
    }
  }

  private onFocusIn = (event: Event): void => {
    if (this.suppressFocus || !this.options().enabled) return
    const td = (event.target as HTMLElement | null)?.closest?.<HTMLElement>('td[data-col]')
    if (!td || td.hasAttribute('data-oas-focus-restore')) return
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
      const wasFilling = this.filling
      if (!this.keys && !wasFilling) return
      event.preventDefault()
      event.stopPropagation()
      if (wasFilling) {
        this.filling = false
        this.fillSource = null
        this.fillPreview = null
        this.dragging = false
        this.dragAnchor = null
        if (this.moveRaf) cancelAnimationFrame(this.moveRaf)
        this.moveRaf = 0
        this.movePending = null
      }
      this.setSelection(null)
      return
    }
    if (key === 'Home' || key === 'End') {
      event.preventDefault()
      event.stopPropagation()
      const rows = rowElements(this.host)
      const cols = columnOrder(this.host)
      const total = displayRowCount(this.host)
      if (rows.length === 0 || cols.length === 0 || total === 0) return
      const currentRow = this.keys?.focus
        ? (rowKeys(this.host).get(this.keys.focus.key) ?? this.keys.focus.abs ?? 0)
        : 0
      const targetRow =
        key === 'Home'
          ? event.ctrlKey || event.metaKey
            ? 0
            : currentRow
          : event.ctrlKey || event.metaKey
            ? total - 1
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

  private requestBeyond(targetRow: number, col: string, extend: boolean, scrollIndex = targetRow): void {
    const windowed = this.host.hasAttribute('windowed')
    const total = displayRowCount(this.host)
    if (targetRow < 0 || targetRow >= total) return
    const loadedStart = Math.max(0, Number(this.host.getAttribute('window-start') ?? 0) || 0)
    const loadedEnd = loadedStart + (this.host.data?.length ?? 0)
    const waitForData = windowed && (targetRow < loadedStart || targetRow >= loadedEnd)
    this.pendingFocus = {
      index: targetRow,
      col,
      extend,
      // 已装载但未渲染只需滚动；未装载才等待新 data，防止 window-start 先变时落到旧切片
      waitForData,
      windowStart: loadedStart,
      firstKey: firstRowKey(this.host, loadedStart),
      dataReady: !waitForData,
      scrollIndex,
    }
    const wrap = this.host.shadowRoot.querySelector<HTMLElement>('.table-scroll')
    const rowHeight = Number(this.host.getAttribute('row-height') ?? 40) || 40
    // 非 windowed 的分组头/展开内容也占扁平条目：滚动位置必须与数据行号分开计算
    if (wrap) wrap.scrollTop = scrollIndex * rowHeight
    if (windowed) {
      const need = expandWindow(targetRow, targetRow + 1, total, WINDOW_MARGIN)
      if (!windowCovered(need, loadedRange(loadedStart, this.host.data?.length ?? 0))) {
        this.host.dispatchEvent(
          new CustomEvent('oas-window-request', { detail: { start: need.start, end: need.end, reason: 'scroll' } }),
        )
      }
    }
  }

  private moveTo(rowIndex: number, colIndex: number, extend: boolean): void {
    const cols = columnOrder(this.host)
    const total = displayRowCount(this.host)
    if (cols.length === 0 || total === 0) return
    const row = Math.max(0, Math.min(total - 1, rowIndex))
    const col = Math.max(0, Math.min(cols.length - 1, colIndex))
    const tr = rowAtIndex(this.host, row)
    if (!tr) {
      const snapshot = this.host.hasAttribute('windowed') ? undefined : this.host.getDisplaySnapshot?.()
      const flatCount = snapshot?.flatCount ?? total
      const currentFlat = this.keys?.focus ? snapshot?.flatIndexByKey.get(this.keys.focus.key) : undefined
      const scrollIndex = row === 0 ? 0 : row === total - 1 ? flatCount - 1 : (currentFlat ?? row)
      this.requestBeyond(row, cols[col]!, extend, scrollIndex)
      return
    }
    const focus = positionOfRow(this.host, tr, cols[col]!)
    if (!focus) return
    const anchor = extend ? (this.keys?.anchor ?? this.keys?.focus ?? focus) : focus
    this.setSelection({ anchor, focus }, true, 'active')
  }

  private moveFocus(deltaRow: number, deltaCol: number, extend: boolean): void {
    const rows = rowElements(this.host)
    if (rows.length === 0) return
    const cols = columnOrder(this.host)
    if (cols.length === 0) return
    const current = this.keys?.focus
    let currentIndex = current?.abs ?? 0
    let colIndex = 0
    if (current) {
      const found = rowKeys(this.host).get(current.key)
      if (found !== undefined) currentIndex = found
      const foundCol = cols.indexOf(current.col)
      if (foundCol >= 0) colIndex = foundCol
    }
    const nextCol = Math.max(0, Math.min(cols.length - 1, colIndex + deltaCol))
    const targetRow = currentIndex + deltaRow
    const nextTr = rowAtIndex(this.host, targetRow)
    if (!nextTr) {
      if (deltaRow !== 0) {
        const flatIndex = this.host.hasAttribute('windowed')
          ? undefined
          : current
            ? this.host.getDisplaySnapshot?.()?.flatIndexByKey.get(current.key)
            : undefined
        this.requestBeyond(
          targetRow,
          cols[nextCol]!,
          extend,
          flatIndex === undefined ? targetRow : flatIndex + deltaRow,
        )
      }
      return
    }
    const focus = positionOfRow(this.host, nextTr, cols[nextCol]!)
    if (!focus) return
    const anchor = extend ? (this.keys?.anchor ?? current ?? focus) : focus
    this.setSelection({ anchor, focus }, true, 'active')
  }

  private onPaste = (event: ClipboardEvent): void => {
    if (!this.options().enabled) return
    if (isInteractiveEvent(event)) return
    const text = event.clipboardData?.getData('text/plain') ?? ''
    const selection = this.getSelection()
    if (!text || !selection) return
    const startKey =
      rowAtIndex(this.host, selection.start.row)?.getAttribute('data-key') ??
      this.host.getDisplaySnapshot?.()?.keysByIndex[selection.start.row] ??
      [this.keys?.anchor, this.keys?.focus].find(
        (position) => position?.abs === selection.start.row && position?.col === selection.start.col,
      )?.key ??
      ''
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
    const dataSignature = this.host.getAttribute('data')
    let focusAfterSync: HTMLTableCellElement | null = null
    // 键盘越界目标行已渲染/装载：先落地选区，装饰与 roving tabindex 完成后再聚焦。
    if (this.pendingFocus) {
      const wrap = this.host.shadowRoot.querySelector<HTMLElement>('.table-scroll')
      const rowHeight = Number(this.host.getAttribute('row-height') ?? 40) || 40
      const expectedScrollTop = Math.min(
        this.pendingFocus.scrollIndex * rowHeight,
        Math.max(0, (wrap?.scrollHeight ?? 0) - (wrap?.clientHeight ?? 0)) || this.pendingFocus.scrollIndex * rowHeight,
      )
      if (wrap && this.host.hasAttribute('height') && Math.abs(wrap.scrollTop - expectedScrollTop) > rowHeight) {
        // 用户已改滚到其它位置：旧 pending 不再延迟抢焦点或改选区
        this.pendingFocus = null
      }
      const pending = this.pendingFocus
      if (pending) {
        const start = Math.max(0, Number(this.host.getAttribute('window-start') ?? 0) || 0)
        const firstKey = firstRowKey(this.host, start)
        const dataChanged = dataSignature !== this.lastDataSignature
        if (shouldResolvePending(pending, start, firstKey, dataChanged)) {
          const target = rows.find((tr, index) => rowIndexOf(tr, index) === pending.index)
          const key = target?.getAttribute('data-key')
          if (target && key) {
            const focus: PositionKey = {
              key,
              col: pending.col,
              abs: pending.index,
              view: rangeViewSignature(this.host),
            }
            const anchor = pending.extend ? (this.keys?.anchor ?? focus) : focus
            this.keys = { anchor, focus }
            this.ranges = this.ranges.length > 0 ? [...this.ranges.slice(0, -1), this.keys] : [this.keys]
            this.pendingFocus = null
            focusAfterSync = this.cellOf(key, pending.col)
          }
        }
        if (this.pendingFocus) updatePendingGate(pending, firstKey, dataChanged)
      }
    }
    this.lastDataSignature = dataSignature
    const keys = options.enabled ? this.keys : null
    // 多选区逐矩形归一化；活动选区（keys）仅负责锚点/焦点/键盘
    const rects = (options.enabled ? this.ranges : [])
      .map((range) => selectionRect(this.host, range))
      .filter((rect): rect is SelectionRect => rect !== null)
    const hasSelection = rects.length > 0
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
      const rowPos = rowIndexOf(rowEl, row)
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
    if (focusAfterSync) {
      this.suppressFocus = true
      focusAfterSync.focus()
      this.suppressFocus = false
    }
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

/** 设置/清除选区；设置会自动启用区域选择。row 按展示集行号给出（windowed 为全量绝对行号），内部以行键 + 列 key 锚定。 */
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

/** 读取当前活动选区（展示集坐标；windowed 离窗保留逻辑选区，无法解析时返回 null） */
export function getRangeSelection(table: HTMLElement): RangeSelection | null {
  return controllerOf(table)?.getSelection() ?? null
}

/** 读取全部逻辑选区（Ctrl/Cmd 追加的多矩形；无法解析的项被过滤，windowed 离窗不等于失效） */
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
export function selectByKey(table: HTMLElement, anchor: CellKeyOptionalCol, focus?: CellKeyOptionalCol): void {
  const host = table as RangeHost
  if (typeof host.getCapabilityOptions !== 'function') {
    throw new Error('[oas-table] selectByKey 需要已升级的 oas-table 元素（请先 import 表格入口）')
  }
  const controller = controllerOf(table)
  if (!controller) return
  enableRangeSelection(table)
  const col = focus?.col ?? anchor.col ?? controller.getSelection()?.start.col ?? columnOrder(host)[0]
  if (!col) return
  const absOf = (key: string, fallback?: number): number | undefined => {
    const snapshotIndex = host.getDisplaySnapshot?.()?.rowIndexByKey.get(key)
    if (snapshotIndex !== undefined) return snapshotIndex
    const tr = rowElements(host).find((row) => row.getAttribute('data-key') === key)
    return tr ? rowIndexOf(tr) : fallback
  }
  const nextAnchor = { ...anchor, col: anchor.col ?? col, abs: absOf(anchor.key, anchor.abs) }
  const nextFocus = focus ? { ...focus, col: focus.col ?? col, abs: absOf(focus.key, focus.abs) } : { ...nextAnchor }
  controller.setSelection({ anchor: nextAnchor, focus: nextFocus })
}

/** 选中整行（row 为展示集行号；windowed 为全量绝对行号） */
export function selectRow(table: HTMLElement, row: number): void {
  const host = table as RangeHost
  const cols = columnOrder(host)
  if (cols.length === 0) return
  setRangeSelection(table, { row, col: cols[0]! }, { row, col: cols[cols.length - 1]! })
}

/** 选中整列（当前全部可见行） */
export function selectColumn(table: HTMLElement, col: string): void {
  const host = table as RangeHost
  const rows = rowElements(host)
  if (rows.length === 0) return
  const start = rowIndexOf(rows[0]!, 0)
  const end = rowIndexOf(rows[rows.length - 1]!, rows.length - 1)
  setRangeSelection(table, { row: start, col }, { row: end, col })
}

/** 选中当前已渲染的全部单元格（windowed/虚拟场景不含离窗逻辑选区） */
export function selectAllRange(table: HTMLElement): void {
  const host = table as RangeHost
  const cols = columnOrder(host)
  const rows = rowElements(host)
  if (cols.length === 0 || rows.length === 0) return
  const start = rowIndexOf(rows[0]!, 0)
  const end = rowIndexOf(rows[rows.length - 1]!, rows.length - 1)
  setRangeSelection(table, { row: start, col: cols[0]! }, { row: end, col: cols[cols.length - 1]! })
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
    let hasRows = false
    for (let row = 0; row < rows.length; row++) {
      const rowPos = rowIndexOf(rows[row]!, row)
      if (rowPos < selection.start.row || rowPos > selection.end.row) continue
      const cells = rows[row]!.querySelectorAll<HTMLTableCellElement>('td[data-col]')
      if (cells.length > 0) hasRows = true
      const values: string[] = []
      for (let col = startCol; col <= endCol; col++) {
        const key = cols[col]
        const td = key ? [...cells].find((cell) => cell.getAttribute('data-col') === key) : undefined
        values.push((td?.textContent ?? '').replace(/[\t\r\n]+/g, ' ').trim())
      }
      lines.push(values.join('\t'))
    }
    if (hasRows || (options.header && blocks.length === 0)) blocks.push(lines.join('\n'))
  }
  const text = blocks.join('\n\n')
  try {
    await navigator.clipboard?.writeText(text)
  } catch {
    /* 剪贴板权限不可用时仍派发事件/返回文本，由宿主自行降级 */
  }
  const selection = controller.getSelection() ?? selections[selections.length - 1]!
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

function indexRowPaths(rows: readonly Record<string, unknown>[], rowKey: string): Map<string, number[]> {
  const paths = new Map<string, number[]>()
  const walk = (items: readonly Record<string, unknown>[], prefix: number[]): void => {
    for (let index = 0; index < items.length; index++) {
      const row = items[index]!
      const path = [...prefix, index]
      const key = rowKeyValue(row, rowKey)
      if (!paths.has(key)) paths.set(key, path)
      const children = row.children
      if (Array.isArray(children)) walk(children as Record<string, unknown>[], path)
    }
  }
  walk(rows, [])
  return paths
}

function writeRangeChanges(host: RangeHost, kind: RangeWriteKind, changes: RangeWriteChange[]): number {
  if (changes.length === 0) return 0
  const controlled = host.hasAttribute('edit-controlled')
  if (!controlled) {
    const rowKey = host.getAttribute('row-key') ?? 'key'
    let next = host.data ?? []
    // 一次索引整棵树，批量写回不再按单元格重复查找行路径
    const paths = indexRowPaths(next, rowKey)
    const applied: RangeWriteChange[] = []
    for (const change of changes) {
      const path = paths.get(change.key)
      if (!path) continue
      next = replaceAtPath(next, path, change.column, change.value)
      applied.push(change)
    }
    if (applied.length === 0) return 0
    host.setAttribute('data', JSON.stringify(next))
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
  const selections = controller.getSelections()
  if (selections.length === 0) return text
  const cols = columnOrder(host)
  const changes: RangeWriteChange[] = []
  const rowKey = host.getAttribute('row-key') ?? 'key'
  const seen = new Set<string>()
  const renderedRows = rowElements(host)
  for (const selection of selections) {
    const startCol = Math.min(cols.indexOf(selection.start.col), cols.indexOf(selection.end.col))
    const endCol = Math.max(cols.indexOf(selection.start.col), cols.indexOf(selection.end.col))
    // 只清理当前已渲染单元格；避免跨大窗口逻辑选区按绝对行号逐行空扫
    for (const tr of renderedRows) {
      const row = rowIndexOf(tr)
      if (row < selection.start.row || row > selection.end.row) continue
      const key = tr.getAttribute('data-key')
      if (key == null) continue
      const dataRow = findRowPath(host.data ?? [], key, rowKey)
      const source = dataRow ? rowAtPath(host.data ?? [], dataRow) : null
      if (!source) continue
      for (let col = startCol; col <= endCol; col++) {
        const column = cols[col]
        if (!column) continue
        const id = `${key}\u0000${column}`
        if (seen.has(id)) continue
        seen.add(id)
        changes.push({ key, column, value: '', ...cellOld(source, column) })
      }
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
  if (Array.isArray(oldRawValue)) return text === '' ? [] : text.split(',').map((item) => item.trim())
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
  if (cols.indexOf(source.start.col) < 0 || cols.indexOf(source.end.col) < 0) return 0
  const rowKey = host.getAttribute('row-key') ?? 'key'
  const changes: RangeWriteChange[] = []
  const sourceValue = (
    rowIndex: number,
    col: string,
  ): { value: unknown; old: { oldValue: string; oldRawValue: unknown } } | null => {
    const tr = rowAtIndex(host, rowIndex)
    const key = tr?.getAttribute('data-key')
    if (!key) return null
    const path = findRowPath(host.data ?? [], key, rowKey)
    const row = path ? rowAtPath(host.data ?? [], path) : null
    if (!row) return null
    return { value: row[col], old: cellOld(row, col) }
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
    if (!source) return
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
      value = String(Number(source.value) + step * offset)
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
        const column = cols[col]
        if (!column) continue
        pushChange(targetRow, column, startRow, column, sign * offset)
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
    const windowed = host.hasAttribute('windowed')
    const absOf = (rowIndex: number): number | undefined =>
      windowed ? Number(rowAtIndex(host, rowIndex)?.getAttribute('data-row-index') ?? rowIndex) : undefined
    let focus: PositionKey = { key: endKey, col: source.end.col }
    if (direction === 'down') {
      focus = {
        key: rowAtIndex(host, source.end.row + cells)?.getAttribute('data-key') ?? endKey,
        col: source.end.col,
        abs: absOf(source.end.row + cells),
      }
    } else if (direction === 'up') {
      focus = {
        key: rowAtIndex(host, source.start.row - cells)?.getAttribute('data-key') ?? startKey,
        col: source.end.col,
        abs: absOf(source.start.row - cells),
      }
    } else if (direction === 'right') {
      const rowIndex = source.end.row
      focus = { key: endKey, col: cols[endCol + cells] ?? source.end.col, abs: absOf(rowIndex) }
    } else {
      const rowIndex = source.start.row
      focus = { key: startKey, col: cols[startCol - cells] ?? source.start.col, abs: absOf(rowIndex) }
    }
    controller.setSelection(
      { anchor: { key: startKey, col: source.start.col, abs: windowed ? source.start.row : undefined }, focus },
      false,
      'active',
    )
  }
  return changed
}

registerTableCapability('range', (host) => {
  const controller = new RangeSelectionController(host as RangeHost)
  controllers.set(host as HTMLElement, controller)
  return controller
})
