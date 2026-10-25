import { createHistory, createSequenceEntry, type HistoryEntry, type HistoryStack } from '../advanced/history.js'
import { rowKeyValue } from '../oas-table-row-key.js'
import { isInteractiveEvent } from '../oas-table-interactive.js'
import type { RangeWriteChange, RangeWriteDetail } from '../oas-table-range-write.js'

export type { RangeWriteChange, RangeWriteDetail } from '../oas-table-range-write.js'

export interface HistoryOptions {
  /** 监听表格 shadow 内的 Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z / Ctrl+Y（默认开启） */
  keyboard?: boolean
  limit?: number
  /** 记录 `oas-range-write`（粘贴/剪切/填充的批量写入，合成一条事务），默认开启 */
  rangeWrites?: boolean
  /** windowed 表格也自动记录（默认关闭；受控 edit-controlled 始终不自动记录） */
  windowed?: boolean
}

interface HistoryHost extends HTMLElement {
  shadowRoot: ShadowRoot
  data: Array<Record<string, unknown>>
}

interface HistorySetup {
  history: HistoryStack
  onEdit: (event: Event) => void
  onRangeWrite: (event: Event) => void
  onKeydown: (event: Event) => void
  unsubscribe: () => void
}

interface EditDetail {
  rowIndex?: number
  key?: string
  column?: string
  value?: unknown
  oldValue?: string
  oldRawValue?: unknown
}

type DataRow = Record<string, unknown>

/** 行键递归查找路径（树形子行 children）；未找到返回 null */
function indexPath(rows: readonly DataRow[], key: string, rowKey: string, prefix: number[] = []): number[] | null {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    if (rowKeyValue(row, rowKey) === key) return [...prefix, i]
    const children = row.children
    if (Array.isArray(children)) {
      const found = indexPath(children as DataRow[], key, rowKey, [...prefix, i])
      if (found) return found
    }
  }
  return null
}

function rowAtPath(rows: readonly DataRow[], path: readonly number[]): DataRow | null {
  let current: DataRow | undefined = rows[path[0]!]
  for (let i = 1; i < path.length; i++) {
    const children = current?.children
    if (!Array.isArray(children)) return null
    current = (children as DataRow[])[path[i]!]
  }
  return current ?? null
}

/** 沿路径不可变替换行字段（父行 children 浅拷贝，其余行保持引用） */
function replaceAtPath(rows: readonly DataRow[], path: readonly number[], column: string, value: unknown): DataRow[] {
  const index = path[0]!
  const next = rows.slice()
  if (path.length === 1) {
    next[index] = { ...rows[index], [column]: value }
    return next
  }
  const children = Array.isArray(rows[index]!.children) ? (rows[index]!.children as DataRow[]) : []
  next[index] = { ...rows[index], children: replaceAtPath(children, path.slice(1), column, value) }
  return next
}

/**
 * 按行键定位数据行后写值：`oas-edit` 的 rowIndex 是可见行下标（排序/过滤/分页后会漂移），
 * 只有行键能稳定对应数据行。行键字段自身被编辑（键值变化）时，用「另一侧编辑值」唯一定位；
 * 未提供稳定键时退回 rowIndex（仅无排序/过滤/分页时成立）。
 */
function applyValue(host: HistoryHost, detail: EditDetail, target: unknown, other: unknown): void {
  if (!detail.column) return
  const rows = host.data ?? []
  const rowKey = host.getAttribute('row-key') ?? 'key'
  let path = detail.key != null ? indexPath(rows, detail.key, rowKey) : null
  if (!path && detail.column === rowKey) {
    // 编辑的是行键字段：数据行当前持有「编辑后/编辑前」的另一侧值，唯一命中才回写
    const matches = rows
      .map((row, i) => ({ row, i }))
      .filter(({ row }) => (other == null ? false : String(row[detail.column!] ?? '') === String(other)))
    if (matches.length === 1) path = [matches[0]!.i]
  }
  if (!path && !host.hasAttribute('row-key') && detail.rowIndex != null) {
    // 无稳定行键：仅在无排序/过滤/分页/分组/树形时按展示序回退（避免写错行）
    const transformed =
      ['sort-key', 'filter-values', 'page', 'page-size', 'group-by', 'pagination'].some((attr) =>
        host.hasAttribute(attr),
      ) || rows.some((row) => Array.isArray(row.children))
    // 记录后行被删除/移位：下标存在且该行仍持有「另一侧编辑值」才回退，避免覆盖无关行
    const candidate = rows[detail.rowIndex]
    const otherMatches =
      candidate !== undefined && other != null && String(candidate[detail.column] ?? '') === String(other)
    if (!transformed && otherMatches) path = [detail.rowIndex]
  }
  if (!path) return
  host.data = replaceAtPath(rows, path, detail.column, target)
}

const setups = new WeakMap<HTMLElement, HistorySetup>()
/** 进行中的批次帧栈：recordHistory 的子命令先入栈顶帧，最外层批次结束时合并为一条事务 */
const batchFrames = new WeakMap<HTMLElement, HistoryEntry[][]>()

/**
 * 显式记录任意命令（宿主自管的写入、远程同步等）：undo/redo 由调用方实现。
 * 未 `enableHistory` 返回 false；批次进行中并入当前批次（见 withHistoryBatch）。
 * 不经过 edit-controlled / windowed 闸门——显式调用即宿主自担数据责任。
 */
export function recordHistory(table: HTMLElement, entry: HistoryEntry): boolean {
  const setup = setups.get(table)
  if (!setup) return false
  const frames = batchFrames.get(table)
  const frame = frames?.[frames.length - 1]
  if (frame) {
    frame.push(entry)
    return true
  }
  setup.history.push(entry)
  return true
}

/**
 * 批处理：fn 内所有 recordHistory 子命令（含自动记录的 oas-edit / oas-range-write）
 * 合并为一条事务——undo 按子命令逆序执行，redo 正序；嵌套批次并入最外层；
 * fn 抛错时本批子命令全部丢弃不入栈，异常继续向上传播。空批次不入栈。
 * 未启用历史时 fn 照常执行（无可记录命令）。
 */
export function withHistoryBatch<T>(table: HTMLElement, fn: () => T): T {
  const setup = setups.get(table)
  if (!setup) return fn()
  const frames = batchFrames.get(table) ?? []
  batchFrames.set(table, frames)
  const frame: HistoryEntry[] = []
  frames.push(frame)
  try {
    const result = fn()
    frames.splice(frames.lastIndexOf(frame), 1)
    const parent = frames[frames.length - 1]
    if (parent) parent.push(...frame)
    else if (frame.length > 0) setup.history.push(createSequenceEntry(frame, frame[0]?.label))
    return result
  } catch (error) {
    // fn 抛错：仅丢弃本批子命令（嵌套时内层已先各自丢弃），不入栈
    frames.splice(frames.lastIndexOf(frame), 1)
    throw error
  }
}

/**
 * 自动记录统一闸门：受控编辑（edit-controlled）的数据归宿主，始终不自动记录；
 * windowed 表格仅在显式开启 options.windowed 后记录。
 */
function autoRecordAllowed(table: HTMLElement, windowed: boolean): boolean {
  if (table.hasAttribute('edit-controlled')) return false
  return !table.hasAttribute('windowed') || windowed
}

/** 单格命令（oas-edit 与 range-write changes 共用）：撤销回写编辑前原值，重做回写记录时已提交的值 */
function cellCommand(host: HistoryHost, snapshot: EditDetail): HistoryEntry {
  const column = snapshot.column as string
  const rows = host.data ?? []
  const rowKey = host.getAttribute('row-key') ?? 'key'
  const path = snapshot.key != null ? indexPath(rows, snapshot.key, rowKey) : null
  const current = path ? rowAtPath(rows, path) : null
  const hasOldRaw = Object.prototype.hasOwnProperty.call(snapshot, 'oldRawValue')
  // 原始类型：撤销用编辑前原值（number / boolean / string[] 等），重做取记录时已提交的当前值
  const oldTarget = hasOldRaw ? snapshot.oldRawValue : snapshot.oldValue
  const newTarget = current ? current[column] : snapshot.value
  return {
    label: `edit:${column}`,
    undo: () => applyValue(host, snapshot, oldTarget, newTarget),
    redo: () => applyValue(host, snapshot, newTarget, oldTarget),
  }
}

function sameRawValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((value, index) => Object.is(value, b[index]))
  }
  return false
}

/**
 * 启用编辑历史（默认记录非受控 `oas-edit` 与 `oas-range-write`；受控编辑 edit-controlled 跳过）。
 * 键盘快捷键作用于表格 shadow 内，输入框聚焦时不拦截。
 * 重复调用返回既有栈（不重置）；如需变更 keyboard / limit 等选项，先 `disableHistory` 再启用。
 */
export function enableHistory(table: HTMLElement, options: HistoryOptions = {}): HistoryStack {
  const existing = setups.get(table)
  if (existing) return existing.history
  if (!table.shadowRoot) {
    throw new Error('[oas-table] enableHistory 需要已升级的 oas-table 元素（请先 import 表格入口）')
  }
  const host = table as HistoryHost
  const history = createHistory(options.limit ?? 100)
  const windowedAllowed = options.windowed ?? false
  const onEdit = (event: Event): void => {
    if (!autoRecordAllowed(table, windowedAllowed)) return
    const detail = (event as CustomEvent<EditDetail>).detail
    const column = detail?.column
    if (!detail || !column || detail.oldValue == null || detail.key == null) return
    if (detail.oldValue === detail.value) return
    if (detail.value == null) return
    recordHistory(table, cellCommand(host, { ...detail, column }))
  }
  const onRangeWrite = (event: Event): void => {
    if (options.rangeWrites === false) return
    if (!autoRecordAllowed(table, windowedAllowed)) return
    const detail = (event as CustomEvent<RangeWriteDetail>).detail
    const changes = detail?.changes
    if (!Array.isArray(changes)) return
    const commands: HistoryEntry[] = []
    for (const change of changes) {
      if (!change || !change.column || change.key == null) continue
      const hasOldRaw = Object.prototype.hasOwnProperty.call(change, 'oldRawValue')
      // 无旧值无法还原；与 oas-edit 同口径跳过无变化单元格（避免大面积无差别回写）
      if (change.oldValue == null && !hasOldRaw) continue
      if (hasOldRaw ? sameRawValue(change.oldRawValue, change.value) : change.oldValue === change.value) continue
      commands.push(cellCommand(host, { ...change }))
    }
    if (commands.length === 0) return
    recordHistory(table, createSequenceEntry(commands, `range:${detail.kind ?? 'write'}`))
  }
  const onKeydown = (event: Event): void => {
    const keyboard = (event as KeyboardEvent).key
    if ((options.keyboard ?? true) === false || isInteractiveEvent(event)) return
    if ((event as KeyboardEvent).defaultPrevented) return
    if (!(event as KeyboardEvent).ctrlKey && !(event as KeyboardEvent).metaKey) return
    if (keyboard.toLowerCase() === 'z' && !(event as KeyboardEvent).shiftKey) {
      if (!history.canUndo()) return
      event.preventDefault()
      history.undo()
    } else if (
      (keyboard.toLowerCase() === 'z' && (event as KeyboardEvent).shiftKey) ||
      keyboard.toLowerCase() === 'y'
    ) {
      if (!history.canRedo()) return
      event.preventDefault()
      history.redo()
    }
  }
  const unsubscribe = history.subscribe((state) => {
    table.dispatchEvent(new CustomEvent('oas-history-change', { detail: state, bubbles: true, composed: true }))
  })
  table.addEventListener('oas-edit', onEdit)
  table.addEventListener('oas-range-write', onRangeWrite)
  host.shadowRoot?.addEventListener('keydown', onKeydown as EventListener)
  setups.set(table, { history, onEdit, onRangeWrite, onKeydown, unsubscribe })
  return history
}

export function undo(table: HTMLElement): boolean {
  return setups.get(table)?.history.undo() ?? false
}

export function redo(table: HTMLElement): boolean {
  return setups.get(table)?.history.redo() ?? false
}

export function canUndo(table: HTMLElement): boolean {
  return setups.get(table)?.history.canUndo() ?? false
}

export function canRedo(table: HTMLElement): boolean {
  return setups.get(table)?.history.canRedo() ?? false
}

export function clearHistory(table: HTMLElement): void {
  setups.get(table)?.history.clear()
}

/** 关闭并清理监听（宿主可重新 enable） */
export function disableHistory(table: HTMLElement): void {
  const setup = setups.get(table)
  if (!setup) return
  table.removeEventListener('oas-edit', setup.onEdit)
  table.removeEventListener('oas-range-write', setup.onRangeWrite)
  ;(table as HistoryHost).shadowRoot?.removeEventListener('keydown', setup.onKeydown as EventListener)
  setup.unsubscribe()
  setups.delete(table)
}
