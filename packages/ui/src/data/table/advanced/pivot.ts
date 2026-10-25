import type { TableColumn } from '../oas-table.js'

/** 透视聚合方式：求和 / 平均 / 计数 / 最小 / 最大 */
export type PivotAggregate = 'sum' | 'avg' | 'count' | 'min' | 'max'

/** 透视表配置：rowField 必填，columnField 省略时只输出一列汇总 */
export interface PivotOptions<T extends Record<string, unknown>> {
  rows: readonly T[]
  rowField: keyof T & string
  columnField?: keyof T & string
  valueField?: keyof T & string
  aggregate?: PivotAggregate
  /** 首列表头，默认取 rowField */
  rowLabel?: string
  /** 合计列表头，默认「合计」 */
  totalLabel?: string
  /** 数值格式化，默认 String(value) */
  format?: (value: number) => string
}

/** 无列维度时使用的内部列 key */
const SINGLE_COLUMN = '__value__'
/** pivotTable 生成的保留字段前缀，避免与业务字段撞名 */
const CELL_PREFIX = 'pivot:'
const ROW_KEY = '__row__'
const TOTAL_KEY = '__total__'

export interface PivotResult {
  rowKeys: string[]
  columnKeys: string[]
  aggregate: PivotAggregate
  /** cells[rowKey][columnKey] */
  cells: Record<string, Record<string, number>>
  rowTotals: Record<string, number>
  columnTotals: Record<string, number>
  total: number
}

function keyOf(value: unknown): string {
  return value == null ? '' : String(value)
}

function aggregate(values: number[], mode: PivotAggregate): number {
  if (mode === 'count') return values.length
  if (values.length === 0) return 0
  if (mode === 'sum') return values.reduce((sum, value) => sum + value, 0)
  if (mode === 'avg') return values.reduce((sum, value) => sum + value, 0) / values.length
  if (mode === 'min') return Math.min(...values)
  return Math.max(...values)
}

/**
 * 把明细行转换为透视矩阵（纯函数，不依赖 DOM）。
 * - valueField 缺省时每条记录按 1 计（适合 count）
 * - 空值（null / undefined / ''）与非有限数值一律忽略；count 只计有效值
 */
export function pivot<T extends Record<string, unknown>>(options: PivotOptions<T>): PivotResult {
  const { rows, rowField, columnField, valueField } = options
  const mode = options.aggregate ?? 'sum'
  // rowKey -> columnKey -> 数值集合
  const grouped = new Map<string, Map<string, number[]>>()
  const rowKeys: string[] = []
  const columnKeys: string[] = []
  const seenRows = new Set<string>()
  const seenColumns = new Set<string>()

  for (const row of rows) {
    const rowKey = keyOf(row[rowField])
    const columnKey = columnField ? keyOf(row[columnField]) : SINGLE_COLUMN
    if (!seenRows.has(rowKey)) {
      seenRows.add(rowKey)
      rowKeys.push(rowKey)
    }
    if (!seenColumns.has(columnKey)) {
      seenColumns.add(columnKey)
      columnKeys.push(columnKey)
    }
    let byColumn = grouped.get(rowKey)
    if (!byColumn) {
      byColumn = new Map()
      grouped.set(rowKey, byColumn)
    }
    let values = byColumn.get(columnKey)
    if (!values) {
      values = []
      byColumn.set(columnKey, values)
    }
    if (valueField) {
      const raw = row[valueField]
      // 空值不参与任何聚合（含 count），避免 null/'' 被 Number() 变成 0 虚增
      if (raw !== null && raw !== undefined && raw !== '') {
        const value = Number(raw)
        if (Number.isFinite(value)) values.push(value)
      }
    } else {
      // 无值字段时 count 语义；sum/avg/min/max 也按 1 计，避免结果全 0
      values.push(1)
    }
  }

  const cells: Record<string, Record<string, number>> = Object.create(null)
  const rowTotals: Record<string, number> = Object.create(null)
  const columnTotals: Record<string, number> = Object.create(null)
  let total = 0
  for (const rowKey of rowKeys) {
    cells[rowKey] = Object.create(null) as Record<string, number>
    const rowValues: number[] = []
    for (const columnKey of columnKeys) {
      const values = grouped.get(rowKey)?.get(columnKey) ?? []
      const value = aggregate(values, mode)
      cells[rowKey]![columnKey] = value
      rowValues.push(...values)
    }
    rowTotals[rowKey] = aggregate(rowValues, mode)
  }
  for (const columnKey of columnKeys) {
    const values: number[] = []
    for (const rowKey of rowKeys) {
      const byColumn = grouped.get(rowKey)?.get(columnKey)
      if (byColumn) values.push(...byColumn)
    }
    columnTotals[columnKey] = aggregate(values, mode)
  }
  const allValues: number[] = []
  for (const byColumn of grouped.values()) {
    for (const values of byColumn.values()) allValues.push(...values)
  }
  total = aggregate(allValues, mode)

  return { rowKeys, columnKeys, aggregate: mode, cells, rowTotals, columnTotals, total }
}

export interface PivotTable {
  columns: TableColumn[]
  rows: Array<Record<string, string | number>>
  /** `oas-table` 的 data 属性别名（与 rows 同一数组） */
  data: Array<Record<string, string | number>>
}

/**
 * 把透视结果转换为 `oas-table` 可直接消费的 columns / data。
 * 生成字段使用 `pivot:` 前缀，首列固定 key 为 `__row__`；有 columnField 时追加总列 `__total__`。
 */
export function pivotTable<T extends Record<string, unknown>>(options: PivotOptions<T>): PivotTable {
  const result = pivot(options)
  const format = options.format ?? ((value: number) => String(value))
  const formatCell = (value: number | undefined): string => (value == null ? '' : format(value))
  const hasColumnField = Boolean(options.columnField)
  const columns: TableColumn[] = [
    {
      key: ROW_KEY,
      title: options.rowLabel ?? String(options.rowField),
      fixed: 'left',
    },
    ...result.columnKeys.map((columnKey) => ({
      key: `${CELL_PREFIX}${columnKey}`,
      title: columnKey === SINGLE_COLUMN ? (options.totalLabel ?? '合计') : columnKey,
      align: 'right' as const,
      render: (row: Record<string, unknown>) => {
        const value = row[`${CELL_PREFIX}${columnKey}`]
        return formatCell(typeof value === 'number' ? value : 0)
      },
    })),
  ]
  if (hasColumnField) {
    columns.push({
      key: TOTAL_KEY,
      title: options.totalLabel ?? '合计',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => {
        const value = row[TOTAL_KEY]
        return formatCell(typeof value === 'number' ? value : 0)
      },
    })
  }
  const rows = result.rowKeys.map((rowKey) => {
    const row: Record<string, string | number> = { [ROW_KEY]: rowKey }
    for (const columnKey of result.columnKeys) {
      row[`${CELL_PREFIX}${columnKey}`] = result.cells[rowKey]?.[columnKey] ?? 0
    }
    if (hasColumnField) row[TOTAL_KEY] = result.rowTotals[rowKey] ?? 0
    return row
  })
  return { columns, rows, data: rows }
}
