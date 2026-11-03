/**
 * table 透视 helper（Pro 子路径，纯函数、零运行时依赖）：
 * - 按需引入：`import { pivotMatrix } from '@oas-ui/ui/data/table/pivot'`；
 *   运行闭包不含 oas-table 组件本体 / core / i18n / 任何 UI 模块。
 * - 与 `@oas-ui/ui/data/table/advanced` 的 `pivot()` 分工：advanced 版直接产出可喂给
 *   `oas-table` 的 `columns` / `data`；本 helper 输出与 UI 无关的二维矩阵
 *   （行头 / 列头 / 单元格 / 合计），便于自行渲染表格、图表或导出。两者互不依赖。
 */

/** 透视聚合方式 */
export type PivotAggregate = 'sum' | 'count' | 'avg' | 'min' | 'max'

/** 单个值指标定义 */
export interface PivotValueSpec {
  field: string
  aggregate: PivotAggregate
  /** 列头显示名，缺省取 field */
  alias?: string
}

/** 透视配置 */
export interface PivotSpec {
  /** 行维度字段（按数组顺序分层）；空数组 = 不分行，全部数据汇入一个空行头分组 */
  rows?: readonly string[]
  /** 列维度字段（按数组顺序分层）；空数组 = 不分列，退化为单列汇总 */
  columns?: readonly string[]
  /** 值指标定义；每项展开为一组叶子列，非法项（空字段名 / 未知聚合方式）被跳过 */
  values: readonly PivotValueSpec[]
  /** 合计开关（等价于第三参 options.totals） */
  totals?: boolean
}

/** 第三参选项 */
export interface PivotOptions {
  totals?: boolean
}

/** 透视矩阵（与 UI 无关） */
export interface PivotMatrix {
  /** 每行分组的分层行头，顺序为 rows 字段首次出现顺序 */
  rowHeaders: string[][]
  /** 每个叶子列的分层列头：columns 字段层级 + 值指标层级（指标层恒有，多指标时结构不变） */
  columnHeaders: string[][]
  /** cells[行分组][叶子列]；null = 该组合无有效数据 */
  cells: (number | null)[][]
  /** 值指标显示名（与 values 有效项一一对应） */
  valueLabels: string[]
  /** 合计行：每个叶子列的合计（需 totals） */
  grandRow?: (number | null)[]
  /** 合计列：grandColumn[行分组][指标序号]（需 totals） */
  grandColumn?: (number | null)[][]
  /** 全表合计：按指标序号（需 totals） */
  grandTotal?: (number | null)[]
}

interface Bucket {
  /** 有效数值（count 模式不使用） */
  numbers: number[]
  /** 非空值计数（仅 count 模式累加） */
  count: number
}

const AGGREGATES: readonly string[] = ['sum', 'count', 'avg', 'min', 'max']

const isField = (value: unknown): value is string => typeof value === 'string' && value !== ''

const isAggregate = (value: unknown): value is PivotAggregate => typeof value === 'string' && AGGREGATES.includes(value)

/** 读取字段值：支持 `a.b` 点号路径（缺字段 / 非对象中间层 → undefined） */
function readPath(row: Record<string, unknown>, field: string): unknown {
  let current: unknown = row
  for (const key of field.split('.')) {
    if (current == null || typeof current !== 'object') return undefined
    if (!Object.hasOwn(current, key)) return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

/** 维度键：null / undefined → 空串，其余 String()；不修改原值 */
function keyOf(value: unknown): string {
  return value == null ? '' : String(value)
}

/** 是否为「空值」——空值不参与任何聚合（含 count），避免 null / '' 被 Number() 变成 0 虚增 */
function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === ''
}

function aggregateNumbers(values: readonly number[], mode: PivotAggregate): number {
  if (mode === 'sum') {
    let sum = 0
    for (const value of values) sum += value
    return sum
  }
  if (mode === 'avg') {
    let sum = 0
    for (const value of values) sum += value
    return sum / values.length
  }
  if (mode === 'min') {
    let min = values[0]!
    for (const value of values) if (value < min) min = value
    return min
  }
  let max = values[0]!
  for (const value of values) if (value > max) max = value
  return max
}

/** 单格聚合：无 bucket / 无有效值 → null */
function valueOf(bucket: Bucket | undefined, mode: PivotAggregate): number | null {
  if (!bucket) return null
  if (mode === 'count') return bucket.count > 0 ? bucket.count : null
  if (bucket.numbers.length === 0) return null
  return aggregateNumbers(bucket.numbers, mode)
}

/** 合计聚合：count 求和计数；其余按原始数值重新聚合（不是单元格值的二次聚合） */
function combineOf(buckets: readonly (Bucket | undefined)[], mode: PivotAggregate): number | null {
  if (mode === 'count') {
    let count = 0
    for (const bucket of buckets) count += bucket?.count ?? 0
    return count > 0 ? count : null
  }
  const numbers: number[] = []
  for (const bucket of buckets) {
    if (bucket) numbers.push(...bucket.numbers)
  }
  if (numbers.length === 0) return null
  return aggregateNumbers(numbers, mode)
}

/**
 * 把明细行转换为透视矩阵（纯函数，不修改输入）。
 *
 * - 行 / 列分组的顺序 = 首次出现顺序；值指标顺序 = spec.values 顺序
 * - 空值（null / undefined / ''）忽略；`count` 统计非空值（含非数值字符串），其余聚合只用有限数值
 * - 空 rows / 空 columns 轴各自退化：空 rows → 单行分组（行头为 `[]`），空 columns → 单列汇总
 * - `totals: true`（spec 或第三参）时追加 grandRow（合计行）/ grandColumn（合计列）/ grandTotal
 */
export function pivotMatrix<T extends Record<string, unknown>>(
  rows: readonly T[],
  spec: PivotSpec,
  options: PivotOptions = {},
): PivotMatrix {
  const rowFields = Array.isArray(spec?.rows) ? spec.rows.filter(isField) : []
  const columnFields = Array.isArray(spec?.columns) ? spec.columns.filter(isField) : []
  const valueSpecs = (Array.isArray(spec?.values) ? spec.values : []).filter(
    (item): item is PivotValueSpec => item != null && isField(item.field) && isAggregate(item.aggregate),
  )
  const valueLabels = valueSpecs.map((item) => item.alias ?? item.field)
  const valueCount = valueSpecs.length

  const rowHeaders: string[][] = []
  const rowIndex = new Map<string, number>()
  const colHeaders: string[][] = []
  const colIndex = new Map<string, number>()
  const buckets = new Map<number, Map<number, Bucket>>()

  /** 取（或建）某行分组某叶子列的聚合桶 */
  const bucketAt = (rowOrder: number, leaf: number): Bucket => {
    let byLeaf = buckets.get(rowOrder)
    if (!byLeaf) {
      byLeaf = new Map()
      buckets.set(rowOrder, byLeaf)
    }
    let bucket = byLeaf.get(leaf)
    if (!bucket) {
      bucket = { numbers: [], count: 0 }
      byLeaf.set(leaf, bucket)
    }
    return bucket
  }

  const source = Array.isArray(rows) ? rows : []
  for (const row of source) {
    if (row == null || typeof row !== 'object') continue
    const record = row as Record<string, unknown>

    const header = rowFields.map((field) => keyOf(readPath(record, field)))
    const rowKey = JSON.stringify(header)
    let rowOrder = rowIndex.get(rowKey)
    if (rowOrder === undefined) {
      rowOrder = rowHeaders.length
      rowIndex.set(rowKey, rowOrder)
      rowHeaders.push(header)
    }

    const columnHeader = columnFields.map((field) => keyOf(readPath(record, field)))
    const columnKey = JSON.stringify(columnHeader)
    let columnOrder = colIndex.get(columnKey)
    if (columnOrder === undefined) {
      columnOrder = colHeaders.length
      colIndex.set(columnKey, columnOrder)
      colHeaders.push(columnHeader)
    }

    for (let valueOrder = 0; valueOrder < valueCount; valueOrder += 1) {
      const valueSpec = valueSpecs[valueOrder]!
      const raw = readPath(record, valueSpec.field)
      if (isEmpty(raw)) continue
      const leaf = columnOrder * valueCount + valueOrder
      if (valueSpec.aggregate === 'count') {
        bucketAt(rowOrder, leaf).count += 1
      } else {
        const numeric = Number(raw)
        if (!Number.isFinite(numeric)) continue
        bucketAt(rowOrder, leaf).numbers.push(numeric)
      }
    }
  }

  // 列头：列组合 × 值指标（指标层恒有，指标数变化时列头结构稳定）
  const columnHeaders: string[][] = []
  for (const header of colHeaders) {
    for (let valueOrder = 0; valueOrder < valueCount; valueOrder += 1) {
      columnHeaders.push([...header, valueLabels[valueOrder]!])
    }
  }

  const cells = rowHeaders.map((_header, rowOrder) => {
    const byLeaf = buckets.get(rowOrder)
    const line: (number | null)[] = []
    for (let columnOrder = 0; columnOrder < colHeaders.length; columnOrder += 1) {
      for (let valueOrder = 0; valueOrder < valueCount; valueOrder += 1) {
        line.push(valueOf(byLeaf?.get(columnOrder * valueCount + valueOrder), valueSpecs[valueOrder]!.aggregate))
      }
    }
    return line
  })

  const result: PivotMatrix = { rowHeaders, columnHeaders, cells, valueLabels }
  const totals = Boolean(spec?.totals ?? options.totals)
  if (!totals) return result

  const grandRow: (number | null)[] = []
  for (let leaf = 0; leaf < columnHeaders.length; leaf += 1) {
    const valueOrder = leaf % valueCount
    grandRow.push(
      combineOf(
        rowHeaders.map((_header, rowOrder) => buckets.get(rowOrder)?.get(leaf)),
        valueSpecs[valueOrder]!.aggregate,
      ),
    )
  }

  const grandColumn = rowHeaders.map((_header, rowOrder) => {
    const byLeaf = buckets.get(rowOrder)
    const line: (number | null)[] = []
    for (let valueOrder = 0; valueOrder < valueCount; valueOrder += 1) {
      const columnBuckets: (Bucket | undefined)[] = []
      for (let columnOrder = 0; columnOrder < colHeaders.length; columnOrder += 1) {
        columnBuckets.push(byLeaf?.get(columnOrder * valueCount + valueOrder))
      }
      line.push(combineOf(columnBuckets, valueSpecs[valueOrder]!.aggregate))
    }
    return line
  })

  const grandTotal: (number | null)[] = []
  for (let valueOrder = 0; valueOrder < valueCount; valueOrder += 1) {
    const all: (Bucket | undefined)[] = []
    for (const byLeaf of buckets.values()) {
      for (let columnOrder = 0; columnOrder < colHeaders.length; columnOrder += 1) {
        all.push(byLeaf.get(columnOrder * valueCount + valueOrder))
      }
    }
    grandTotal.push(combineOf(all, valueSpecs[valueOrder]!.aggregate))
  }

  result.grandRow = grandRow
  result.grandColumn = grandColumn
  result.grandTotal = grandTotal
  return result
}
