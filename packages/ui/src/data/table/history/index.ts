import { createHistory, type HistoryStack } from '../advanced/history.js'
import { rowKeyValue } from '../oas-table-row-key.js'
import { isInteractiveEvent } from '../oas-table-interactive.js'

export interface HistoryOptions {
  /** 监听表格 shadow 内的 Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z / Ctrl+Y（默认开启） */
  keyboard?: boolean
  limit?: number
}

interface HistoryHost extends HTMLElement {
  shadowRoot: ShadowRoot
  data: Array<Record<string, unknown>>
}

interface HistorySetup {
  history: HistoryStack
  onEdit: (event: Event) => void
  onKeydown: (event: Event) => void
  unsubscribe: () => void
}

interface EditDetail {
  rowIndex?: number
  key?: string
  column?: string
  value?: string
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

const setups = new WeakMap<HTMLElement, HistorySetup>()

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
    if (!transformed) path = [detail.rowIndex]
  }
  if (!path) return
  host.data = replaceAtPath(rows, path, detail.column, target)
}

/**
 * 启用编辑历史（默认记录非受控 `oas-edit`；受控编辑 edit-controlled 的数据归宿主，跳过）。
 * 键盘快捷键作用于表格 shadow 内，输入框聚焦时不拦截。
 * 重复调用返回既有栈；如需变更 keyboard / limit，先 `disableHistory` 再启用。
 */
export function enableHistory(table: HTMLElement, options: HistoryOptions = {}): HistoryStack {
  const existing = setups.get(table)
  if (existing) return existing.history
  if (!table.shadowRoot) {
    throw new Error('[oas-table] enableHistory 需要已升级的 oas-table 元素（请先 import 表格入口）')
  }
  const host = table as HistoryHost
  const history = createHistory(options.limit ?? 100)
  const onEdit = (event: Event): void => {
    if (table.hasAttribute('edit-controlled') || table.hasAttribute('windowed')) return
    const detail = (event as CustomEvent<EditDetail>).detail
    const column = detail?.column
    if (!detail || !column || detail.oldValue == null || detail.key == null) return
    if (detail.oldValue === detail.value) return
    if (detail.value == null) return
    const snapshot = { ...detail, column }
    // 原始类型：撤销用编辑前原值（number / boolean / string[] 等），重做取事件后已提交的当前值
    const rows = host.data ?? []
    const rowKey = table.getAttribute('row-key') ?? 'key'
    const path = snapshot.key != null ? indexPath(rows, snapshot.key, rowKey) : null
    const current = path ? rowAtPath(rows, path) : null
    const hasOldRaw = Object.prototype.hasOwnProperty.call(snapshot, 'oldRawValue')
    const oldTarget = hasOldRaw ? snapshot.oldRawValue : snapshot.oldValue
    const newTarget = current ? current[column] : snapshot.value
    history.push({
      label: `edit:${column}`,
      undo: () => applyValue(host, snapshot, oldTarget, newTarget),
      redo: () => applyValue(host, snapshot, newTarget, oldTarget),
    })
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
    table.dispatchEvent(new CustomEvent('oas-history-change', { detail: state }))
  })
  table.addEventListener('oas-edit', onEdit)
  host.shadowRoot?.addEventListener('keydown', onKeydown as EventListener)
  setups.set(table, { history, onEdit, onKeydown, unsubscribe })
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
  ;(table as HistoryHost).shadowRoot?.removeEventListener('keydown', setup.onKeydown as EventListener)
  setup.unsubscribe()
  setups.delete(table)
}
