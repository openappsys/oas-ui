/**
 * server 分组行分区（纯函数，零 DOM 依赖）：宿主返回的混合行 → 渲染 FlatRow 列表。
 *
 * 协议背景（`row-model="server"` 形态 + `group-by` 在场 = 宿主分组）：
 * 宿主在回填行数组里以行内保留字段 `kind` 标记两类行——
 * - 分组行 `{ kind:'group', groupKey, groupLabel?, groupCount?, depth?, aggregates? }`
 *   （`aggregates` 以列 key 为键，聚合值由宿主计算，组件不做本地聚合）；
 * - 数据行（无 `kind` 或 `kind:'data'`）。
 * 组件按宿主数组顺序渲染（不在组件内分组/排序——宿主返回什么顺序就渲染什么顺序，
 * 含层级顺序）；折叠在已装载行内本地过滤（visibleFlat 的分组折叠语义）。
 *
 * 与组件 `oas-table.ts` 的 `buildServerGroupFlat` 单一真相源：组件侧为薄壳
 * （诊断计数与无效组行告警留在壳层），变换本体在本模块。
 */
import type { FlatRow } from './types.js'

/** server 分组行协议（宿主行数据里的 kind='group' 标记行） */
export interface ServerGroupRowInput {
  /** 行类别标记（恒 'group'；其他值按数据行处理） */
  kind: 'group'
  /** 组键（展开/折叠与折叠过滤的标识；须为非空字符串——空串/缺失/非字符串视为无效组行） */
  groupKey: string
  /** 分节头展示文案（缺省回落 groupKey） */
  groupLabel?: string
  /** 组内数据行计数（缺省不显示计数） */
  groupCount?: number
  /** 层级深度（层级分组场景；缺省 0。非正数/非有限数回落 0） */
  depth?: number
  /** 组内聚合值（列 key → 宿主计算好的数值/字符串；列定义 aggregate 指定该列显示哪个聚合） */
  aggregates?: Record<string, number | string>
}

/** `partitionServerGroupRows` 的输出 */
export interface PartitionServerGroupResult<T extends Record<string, unknown>> {
  /** 渲染输入（组行 + 数据行按宿主原序；无效组行剔除后由后续可见集变换消费） */
  flat: FlatRow[]
  /** 纯数据行（宿主原序；合计/导出等纯数据口径消费） */
  dataRows: T[]
  /** groupKey 无效（缺失/非字符串/空串）的组行数（壳层据此 devWarn 一次） */
  invalidGroupRows: number
}

/** 是否普通对象（aggregates 合法性：排除数组/字符串/null 等） */
const isRecord = (v: unknown): v is Record<string, number | string> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * 混合行分区：按行内 `kind` 字段分离组行与数据行，组行按协议校验后转为 FlatRow
 * （kind='group'），数据行原样透传（depth 恒 0、不递归 children——树形子行展平是宿主
 * 责任，组件不做本地变换）。数组顺序 = 渲染顺序（宿主权威）。
 */
export function partitionServerGroupRows<T extends Record<string, unknown>>(
  rows: readonly T[],
): PartitionServerGroupResult<T> {
  const flat: FlatRow[] = []
  const dataRows: T[] = []
  let invalidGroupRows = 0
  for (const row of rows) {
    if ((row as { kind?: unknown }).kind === 'group') {
      const g = row as unknown as ServerGroupRowInput
      const key = g.groupKey
      if (typeof key !== 'string' || key === '') {
        // 无效组行：剔除（降级平铺渲染，组内数据行不受影响——数据不丢）
        invalidGroupRows++
        continue
      }
      const depth = typeof g.depth === 'number' && Number.isFinite(g.depth) && g.depth > 0 ? Math.floor(g.depth) : 0
      flat.push({
        row: {},
        depth,
        kind: 'group',
        groupKey: key,
        groupLabel: typeof g.groupLabel === 'string' ? g.groupLabel : key,
        groupCount: typeof g.groupCount === 'number' ? g.groupCount : undefined,
        aggregates: isRecord(g.aggregates) ? g.aggregates : undefined,
      })
      continue
    }
    // 数据行（无 kind / kind:'data' / 其他未知值）：原样透传
    flat.push({ row, depth: 0, kind: 'data' })
    dataRows.push(row)
  }
  return { flat, dataRows, invalidGroupRows }
}

/**
 * 组行聚合取值：列定义 `aggregate` 指定该列显示组行聚合——列未配置 / 组行未提供该键 /
 * aggregates 未提供时返回 null（格子留空）。值原样字符串化（聚合值由宿主计算并格式化，
 * 组件不做二次格式化）。
 */
export function groupAggregateValue(
  aggregates: Record<string, number | string> | undefined,
  col: { key: string; aggregate?: boolean },
): string | null {
  if (!col.aggregate || !aggregates) return null
  const v = aggregates[col.key]
  return v === undefined || v === null ? null : String(v)
}
