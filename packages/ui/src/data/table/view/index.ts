import type { TableColumn } from '../oas-table.js'

/** 表格视图状态：只存结构/查询态，不含选中、展开中的编辑草稿等易失状态 */
export interface TableViewState {
  columnKeys?: string[]
  widths?: Record<string, string>
  sortKey?: string
  sortOrder?: string
  multiSort?: string
  filterValues?: string
  groupBy?: string
  pageSize?: string
  current?: string
  expanded?: string
  stickyRows?: string
  showHeader?: string
  size?: string
}

interface TableViewHost extends HTMLElement {
  columns: TableColumn[]
  columnKeys: string[]
}

const ATTR_FIELDS = [
  ['sortKey', 'sort-key'],
  ['sortOrder', 'sort-order'],
  ['multiSort', 'multi-sort'],
  ['filterValues', 'filter-values'],
  ['groupBy', 'group-by'],
  ['pageSize', 'page-size'],
  ['current', 'current'],
  ['expanded', 'expanded'],
  ['stickyRows', 'sticky-rows'],
  ['showHeader', 'show-header'],
  ['size', 'size'],
] as const

function widthsOf(columns: readonly TableColumn[]): Record<string, string> {
  const out: Record<string, string> = {}
  const walk = (cols: readonly TableColumn[]): void => {
    for (const col of cols) {
      if (col.width) out[col.key] = col.width
      if (col.children) walk(col.children)
    }
  }
  walk(columns)
  return out
}

function withWidths(columns: readonly TableColumn[], widths: Record<string, string>): TableColumn[] {
  return columns.map((col) => {
    const next: TableColumn = { ...col, width: widths[col.key] ?? undefined }
    if (col.children) next.children = withWidths(col.children, widths)
    return next
  })
}

/** 捕获当前视图状态（可 JSON 序列化，持久化由宿主负责） */
export function captureViewState(table: HTMLElement): TableViewState {
  const host = table as TableViewHost
  const state: TableViewState = {
    columnKeys: [...(host.columnKeys ?? [])],
    widths: widthsOf(host.columns ?? []),
  }
  for (const [field, attr] of ATTR_FIELDS) {
    const value = table.getAttribute(attr)
    if (value != null) state[field] = value
  }
  return state
}

/**
 * 应用完整视图快照：未出现的属性与列宽一并回默认；`''` 同样表示移除该属性。
 * 列宽通过重写 columns 的 width 实现，保留 render/editor 等函数字段。
 */
export function applyViewState(table: HTMLElement, state: TableViewState): void {
  const host = table as TableViewHost
  // 快照语义是「精确恢复」：未出现的 width / attr 一并回到默认，避免残留旧视图
  host.columns = withWidths(host.columns ?? [], state.widths ?? {})
  if (state.columnKeys) {
    host.columnKeys = [...state.columnKeys]
    // property setter 只改内存；同步 attribute，避免后续属性更新触发 parse 时被旧列集合覆盖
    table.setAttribute('column-keys', JSON.stringify(state.columnKeys))
  } else {
    host.columnKeys = []
    table.setAttribute('column-keys', '[]')
  }
  for (const [field, attr] of ATTR_FIELDS) {
    const value = state[field]
    if (value === undefined || value === '') table.removeAttribute(attr)
    else table.setAttribute(attr, value)
  }
}

/** 视图状态持久化适配器：宿主注入（localStorage / sessionStorage / 自有存储），模块不依赖任何全局 Storage。读取需 getItem，写入需 setItem */
export interface ViewStateAdapter {
  getItem?(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

/** 持久化键（v1 格式：`{"version":1,"state":TableViewState}`） */
export const VIEW_STATE_KEY = 'oas-table-view:v1'

/** 保存视图状态到 adapter：写入 `{version:1,state}`；序列化/写入失败（配额满等）静默返回 false */
export function saveViewState(table: HTMLElement, adapter: ViewStateAdapter, key = VIEW_STATE_KEY): boolean {
  if (typeof adapter?.setItem !== 'function') return false
  try {
    adapter.setItem(key, JSON.stringify({ version: 1, state: captureViewState(table) }))
    return true
  } catch {
    return false
  }
}

/**
 * 从 adapter 恢复视图状态：键缺失 / 坏 JSON / version!=1 / 字段结构非法时
 * 静默返回 false 且不修改表格；成功应用返回 true。
 */
export function loadViewState(table: HTMLElement, adapter: ViewStateAdapter, key = VIEW_STATE_KEY): boolean {
  if (typeof adapter?.getItem !== 'function') return false
  let raw: string | null
  try {
    raw = adapter.getItem(key)
  } catch {
    return false
  }
  if (raw == null) return false
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return false
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return false
  const record = parsed as { version?: unknown; state?: unknown }
  if (record.version !== 1) return false
  const state = record.state
  if (typeof state !== 'object' || state === null || Array.isArray(state)) return false
  // 字段结构预检：columnKeys 非数组会让 applyViewState 写入脏数据，widths 非对象同理
  const view = state as TableViewState
  if (view.columnKeys !== undefined && !Array.isArray(view.columnKeys)) return false
  if (view.columnKeys?.some((key) => typeof key !== 'string')) return false
  for (const [field] of ATTR_FIELDS) {
    const value = view[field]
    if (value !== undefined && typeof value !== 'string') return false
  }
  if (
    view.widths !== undefined &&
    (typeof view.widths !== 'object' || view.widths === null || Array.isArray(view.widths))
  ) {
    return false
  }
  if (view.widths && Object.values(view.widths).some((width) => typeof width !== 'string')) return false
  applyViewState(table, view)
  return true
}
