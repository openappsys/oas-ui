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
 * `kind` 在协议激活时为**保留字段**：`kind:'group'` 但 groupKey 非法（非字符串且非空值）
 * 的行降级按数据行渲染（数据不丢），宿主数据若以 kind 承载业务字段建议改列名。
 *
 * 空值组（批 H）：`groupKey` 为 `''` / `null` / `undefined` = **合法空值组**——组行形态
 * 保留（groupKey 归一为空串），渲染走既有空值组文案（`emptyGroupLabel` 注入，与本地
 * 分组 `table.groupEmpty` 同一份 i18n 文案）；聚合照常。仅非字符串且非空值的键
 * （数值/布尔/对象等）视为无效键降级按数据行。
 */
import type { FlatRow } from './types.js'

/** server 分组行协议（宿主行数据里的 kind='group' 标记行） */
export interface ServerGroupRowInput {
  /** 行类别标记（恒 'group'；其他值按数据行处理。kind 在协议激活时为保留字段） */
  kind: 'group'
  /** 组键（展开/折叠与折叠过滤的标识）：空串 / null / undefined = 合法空值组（渲染走空值组
   *  文案）；其他非字符串值（数值/布尔/对象等）为无效键——该行降级按数据行渲染 */
  groupKey?: string | null
  /** 分节头展示文案（缺省回落 groupKey；空值组忽略该字段——文案恒走空值组 label） */
  groupLabel?: string
  /** 组内数据行计数（缺省不显示计数；NaN/负数按缺省处理） */
  groupCount?: number
  /** 层级深度（层级分组场景；缺省 0。非正数/非有限数回落 0；病态大值钳制上限 20） */
  depth?: number
  /** 组内聚合值（列 key → 宿主计算好的数值/字符串；列定义 aggregate 指定该列显示哪个聚合） */
  aggregates?: Record<string, number | string>
}

/** `partitionServerGroupRows` 的可选选项 */
export interface PartitionServerGroupOptions {
  /** 空值组（groupKey 为空串/null/undefined）的分节头文案（i18n 由调用方注入；缺省 "(empty)"——
   *  与本地分组 buildFlat 的 groupEmptyLabel 同语义） */
  emptyGroupLabel?: string
}

/** `partitionServerGroupRows` 的输出 */
export interface PartitionServerGroupResult<T extends Record<string, unknown>> {
  /** 渲染输入（组行 + 数据行按宿主原序；无效组行降级为数据行后由后续可见集变换消费） */
  flat: FlatRow[]
  /** 纯数据行（宿主原序；含降级的数据行——合计/导出等纯数据口径消费） */
  dataRows: T[]
  /** groupKey 无效（非字符串且非空值——数值/布尔/对象等）的 kind:'group' 行数（已降级按数据行渲染，壳层据此 devWarn 一次） */
  invalidGroupRows: number
}

/** 是否普通对象（aggregates 合法性：排除数组/字符串/null 等） */
const isRecord = (v: unknown): v is Record<string, number | string> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * server 组行 depth 上限：病态值（如 depth:1e6）钳到 20——层级分组超过 20 层本身超出
 * 可读范围，不钳会生成超大缩进 padding（16 + depth × indent-size）撑破表宽。
 */
const MAX_SERVER_GROUP_DEPTH = 20

/** groupCount 合法性：有限非负数放行；NaN / 负数 / 非数值视为「未提供」（组件不渲染计数） */
const validGroupCount = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined

/**
 * 混合行分区：按行内 `kind` 字段分离组行与数据行，组行按协议校验后转为 FlatRow
 * （kind='group'），数据行原样透传（depth 恒 0、不递归 children——树形子行展平是宿主
 * 责任，组件不做本地变换）。数组顺序 = 渲染顺序（宿主权威）。
 *
 * 契约（kind 保留字段 + 批 H 空值组）：
 * - `kind:'group'` + 有效非空字符串 groupKey → 组行；
 * - `kind:'group'` + groupKey 为 `''` / `null` / `undefined` → **合法空值组**（groupKey
 *   归一为空串，分节头文案走 `emptyGroupLabel` 注入值——与本地分组空值组同一份 i18n）；
 * - `kind:'group'` + 其他非法 groupKey（数值/布尔/对象等非字符串非空值）→ **按数据行
 *   渲染（数据不丢，不剔除）**，计数供壳层一次性 devWarn 提示（kind 在协议激活时为
 *   保留字段，宿主数据若以 kind 承载业务字段建议改列名）。
 */
export function partitionServerGroupRows<T extends Record<string, unknown>>(
  rows: readonly T[],
  options?: PartitionServerGroupOptions,
): PartitionServerGroupResult<T> {
  const flat: FlatRow[] = []
  const dataRows: T[] = []
  let invalidGroupRows = 0
  const depthOf = (g: ServerGroupRowInput): number =>
    typeof g.depth === 'number' && Number.isFinite(g.depth) && g.depth > 0
      ? Math.min(Math.floor(g.depth), MAX_SERVER_GROUP_DEPTH)
      : 0
  for (const row of rows) {
    if ((row as { kind?: unknown }).kind === 'group') {
      const g = row as unknown as ServerGroupRowInput
      const key = g.groupKey
      if (key === '' || key === null || key === undefined) {
        // 空值组（批 H）：''/null/undefined = 合法空值组——组行形态保留（groupKey 归一 ''），
        // 分节头文案走空值组 label（与本地分组「（空）」同一份 i18n），聚合照常
        flat.push({
          row: {},
          depth: depthOf(g),
          kind: 'group',
          groupKey: '',
          groupLabel: options?.emptyGroupLabel ?? '(empty)',
          groupCount: validGroupCount(g.groupCount),
          aggregates: isRecord(g.aggregates) ? g.aggregates : undefined,
        })
        continue
      }
      if (typeof key !== 'string') {
        // 无效组行（非字符串且非空值）：降级按数据行渲染（数据不丢——旧行为剔除丢行）；
        // invalidGroupRows 计数供壳层一次性 devWarn（诊断语义：kind 为协议保留字段）
        invalidGroupRows++
        flat.push({ row, depth: 0, kind: 'data' })
        dataRows.push(row)
        continue
      }
      flat.push({
        row: {},
        depth: depthOf(g),
        kind: 'group',
        groupKey: key,
        groupLabel: typeof g.groupLabel === 'string' ? g.groupLabel : key,
        groupCount: validGroupCount(g.groupCount),
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
 * aggregates 未提供 / 值非数值字符串时返回 null（格子留空）。数值/字符串原样字符串化
 * （聚合值由宿主计算并格式化，组件不做二次格式化）；对象/数组/函数等其他形态降级为空
 * （不渲染 `String(v)` 的 "[object Object]" 之类宿主数据事故）。
 */
export function groupAggregateValue(
  aggregates: Record<string, number | string> | undefined,
  col: { key: string; aggregate?: boolean },
): string | null {
  if (!col.aggregate || !aggregates) return null
  const v = aggregates[col.key]
  if (typeof v !== 'number' && typeof v !== 'string') return null
  return String(v)
}
