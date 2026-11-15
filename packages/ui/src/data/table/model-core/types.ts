/**
 * table 行模型数据层类型（实现本体；公开面经 `../model/index.ts` re-export）。
 *
 * 本文件是数据层的类型契约单一来源：组件 `oas-table.ts` 从本目录 import 并
 * re-export（SortState），不再各自维护第二份。
 * 全部类型零 DOM 依赖（无 HTMLElement / template 等），可在 node / worker / SSR 直接使用。
 */

/** 排序方向（升序 / 降序；组件侧表头三态 `SortOrder` 的非空子集） */
export type SortDirection = 'asc' | 'desc'

/**
 * 参与排序的单个列状态（多列排序时按数组顺序决定优先级）。
 * 与组件侧 `SortState` 同形：order 为 asc/desc（undefined 表示未指定，比较时跳过该键）。
 */
export interface SortState {
  key: string
  order: SortDirection | undefined
}

/** 过滤值集合：列键 → 过滤值（`filter-values` 属性 JSON 解析后的形态） */
export type FilterValues = Record<string, string | number>

/** 列字段类型（与组件 `TableColumnType` 同形；text 为缺省纯文本行为） */
export type DataColumnType =
  | 'text'
  | 'number'
  | 'currency'
  | 'select'
  | 'multi-select'
  | 'date'
  | 'checkbox'
  | 'link'
  | 'progress'
  | 'rate'

/**
 * 数据层最小列契约：行模型管道实际消费的字段子集（过滤匹配 / 排序类型映射 / 叶子展开）。
 * 组件侧完整 `TableColumn` 结构兼容本接口，可直接传入（多余字段被忽略，不做复制）。
 */
export interface DataColumn {
  /** 列键（数据字段名） */
  key: string
  /** 列字段类型（排序比较器据此选择数值序 / 时间序 / 码点序） */
  type?: DataColumnType
  /** 自定义过滤匹配器：返回该行是否命中过滤值；缺省按字符串严格相等 */
  filterMatch?: (cell: unknown, filterValue: string | number) => boolean
  /** 多级表头子列（有 children 的列是组列，不参与数据匹配；过滤/排序作用于叶子列） */
  children?: DataColumn[]
}

/**
 * 扁平行：树形 / 可展开行 / 分节头统一的渲染无关展平单位。
 * 与组件内部 `FlatRow` 定义一致（组件侧从本模块 import）。
 */
export interface FlatRow {
  /** 行数据本体（group 类型行为空对象占位） */
  row: Record<string, unknown>
  /** 树形深度（0 起；group 行恒 0） */
  depth: number
  /** 树形父行键（顶层行无此字段；可见性过滤按它查 expanded 集合） */
  parent?: string
  /** 行类别：data=数据行 / expand=行内嵌内容行 / group=分节头行 */
  kind: 'data' | 'expand' | 'group'
  /** expand 类型行的自定义内容（来自 row.expand 字段） */
  expandContent?: string
  /** group 类型行：组键（折叠状态集合的标识；空值组为空串） */
  groupKey?: string
  /** group 类型行：分节头展示文案（空值组由调用方注入文案，缺省 "(empty)"） */
  groupLabel?: string
  /** group 类型行：组内数据行计数 */
  groupCount?: number
  /** group 类型行：组内聚合值（列 key → 宿主计算好的值；server 分组协议透传，组件不做本地聚合） */
  aggregates?: Record<string, number | string>
}

/**
 * 行模型输入（`computeRowModel` 的参数）。
 * 字段全部可选缺省（data 必填）：不给过滤/排序/分页/分组时对应变换段整体跳过，
 * 与组件缺省行为一致。
 */
export interface RowModelInput<T = Record<string, unknown>> {
  /** 行数据（顶层行；树形子行挂 row.children） */
  data: T[]
  /** 列定义（最小契约即可，组件 TableColumn 直接兼容）：过滤匹配与排序类型映射消费 */
  columns?: DataColumn[]
  /** 排序状态数组（优先级 = 数组顺序）；serverModel=true 时被忽略 */
  sorters?: SortState[]
  /** 过滤值集合（列键 → 值）；serverModel=true 时被忽略 */
  filters?: FilterValues
  /** 分组：按字段值分节（grouping.by 为字段键） */
  grouping?: { by: string }
  /**
   * 分页：current 从 1 起；pageSize 非法回落 10。
   * total 在场 = 外部分页口径（data 即宿主切好的当前页切片：只排序不切片，total 直通输出）；
   * 缺省 = 内部切片模式（排序后按 current/pageSize 切片）。
   */
  pagination?: { current: number; pageSize: number; total?: number }
  /** 行键字段名（树形 parent / expand 键取值；缺省 'key'） */
  rowKey?: string
  /** 空值组（分组模式 null / undefined / 空白串）的分节头文案（i18n 由调用方注入；缺省 "(empty)"） */
  groupEmptyLabel?: string
  /** 已展开集合（树形父行键与可展开行键共用；缺省空集 = 全部折叠） */
  expanded?: ReadonlySet<string>
  /** 已折叠分组键集合（分组模式可见性过滤；缺省空集 = 全部展开） */
  collapsedGroups?: ReadonlySet<string>
  /** server 行模型语义：true = 跳过本地过滤与本地排序（服务端已按当前条件返回当前页切片） */
  serverModel?: boolean
}

/** 分页切片中间结果（`computeDisplayRoots` 的输出；组件壳层接线的直接契约） */
export interface DisplayRootsResult<T = Record<string, unknown>> {
  /** 过滤 + 排序后的全量顶层行（未切片；外部分页时 = data 本身） */
  roots: T[]
  /** 过滤后的全量顶层行（与 roots 的差异仅为排序口径——roots 为排序后副本，fullRoots 保持过滤后原序；合计 scope=all 消费） */
  fullRoots: T[]
  /** 当前页切片（内部切片模式；外部分页 = roots；未开分页 = roots） */
  pageRows: T[]
  /** 总行数（外部分页 = 输入 total；否则 = 过滤后数据长度） */
  total: number
  /** 归一化后的页尺寸（非法入参回落后值；分页关闭（未传 pagination）时归一化返回 10；壳层分页器直用） */
  pageSize: number
  /** 总页数（未开分页恒 1） */
  pageCount: number
  /** 建议 current（归一化 ≥1 且不超过 pageCount；纯函数不写 DOM，写回由调用方决定） */
  clampedCurrent: number
  /** 是否发生超页钳制（true 时调用方应把 current 写回 clampedCurrent） */
  clamped: boolean
  /** 分页是否开启（pagination 输入在场） */
  paginationOn: boolean
}

/**
 * 行模型输出（`computeRowModel` 的返回）：一份数据在整条管道（过滤 → 排序 → 分页切片 →
 * 分组 → 展平 → 可见集）后的全部派生值，渲染层拿任意一段自行消费。
 */
export interface RowModelResult<T = Record<string, unknown>> {
  /** 过滤 + 排序后全量顶层行（未切片） */
  roots: T[]
  /** 过滤后的全量顶层行（与 roots 的差异仅为排序口径——roots 为排序后副本，fullRoots 保持过滤后原序；合计 scope=all 的输入基准） */
  fullRoots: T[]
  /** 当前页切片（未开分页 = roots；外部分页 = data 本身经排序） */
  pageRows: T[]
  /** 总行数（外部分页口径 = 输入 total） */
  total: number
  /** 归一化后的页尺寸（非法入参回落后值，最小 1；分页关闭（未传 pagination）时归一化返回 10） */
  pageSize: number
  /** 总页数（未开分页恒 1） */
  pageCount: number
  /** 建议 current（纯函数不写 DOM；超页时与输入 current 不同） */
  clampedCurrent: number
  /** 是否发生超页钳制 */
  clamped: boolean
  /** 展平列表（含分组头 / 树形子行 / 可展开内容行；折叠前的完整列表） */
  flat: FlatRow[]
  /** 可见集（按 expanded / collapsedGroups 过滤后的渲染列表） */
  visible: FlatRow[]
}
