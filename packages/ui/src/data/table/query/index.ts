/**
 * table 查询 helper（Pro 子路径，纯函数、零运行时依赖）：
 * - 按需引入：`import { applyQuery, createQueryState } from '@oas-ui/ui/data/table/query'`；
 *   运行闭包不含 oas-table 组件本体 / core / i18n / 任何 UI 模块。
 * - 与 `@oas-ui/ui/data/table/advanced` 的 `compileQuery()` 分工：advanced 版是表格内部
 *   过滤通道（`QueryGroup.logic` + `conditions`）；本 helper 是面向宿主的「查询状态」模型
 *   （`combinator` + `filters` + 排序 + 分页 + 不可变 update），两者互不依赖。
 */

/** 过滤算子 */
export type FilterOp =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'between'
  | 'empty'
  | 'notEmpty'

/** 单条件 */
export interface Filter {
  field: string
  op: FilterOp
  value?: unknown
  /** 文本算子是否区分大小写，默认 false */
  caseSensitive?: boolean
}

/** 条件组：filters 可任意嵌套 FilterGroup */
export interface FilterGroup {
  combinator: 'and' | 'or'
  filters: readonly TableQueryNode[]
}

/** 条件节点 */
export type TableQueryNode = Filter | FilterGroup

/** 排序方向 */
export type SortDir = 'asc' | 'desc'

/** 排序键；dir 缺省 asc */
export interface SortSpec {
  field: string
  dir?: SortDir
}

/** 分页 */
export interface PageSpec {
  /** 1 起，越界返回空数组 */
  current: number
  /** 每页条数，<= 0 / 非有限数视为不分页 */
  pageSize: number
}

/** 一次查询（filter → sort → page） */
export interface Query {
  filter?: FilterGroup | null
  sort?: readonly SortSpec[]
  page?: PageSpec | null
}

/** 新建分页时缺省每页条数 */
export const DEFAULT_PAGE_SIZE = 10

/** 查询状态：只读快照 + 不可变 update helpers（每次返回新对象） */
export interface QueryState {
  readonly filter: FilterGroup | null
  readonly sort: readonly SortSpec[]
  readonly page: PageSpec | null
  /** 聚合快照，可直接喂给 `applyQuery(rows, state.query)` */
  readonly query: Query
  setFilter(filter: FilterGroup | null): QueryState
  /** 追加排序键；同字段已有条目被替换并移到末尾 */
  addSort(field: string, dir?: SortDir): QueryState
  /** 局部更新分页；传 null 关闭分页 */
  setPage(page: Partial<PageSpec> | null): QueryState
}

const OPS: readonly string[] = [
  'eq',
  'neq',
  'contains',
  'startsWith',
  'endsWith',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'between',
  'empty',
  'notEmpty',
]

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

const isObject = (value: unknown): value is Record<string, unknown> => value != null && typeof value === 'object'

/** 条件组判定：带 combinator 的节点按组处理（filters 非数组时按空组） */
export function isFilterGroup(node: TableQueryNode): node is FilterGroup {
  return isObject(node) && 'combinator' in node
}

const asText = (value: unknown, caseSensitive: boolean): string => {
  const text = value == null ? '' : String(value)
  return caseSensitive ? text : text.toLowerCase()
}

const asNumber = (value: unknown): number | null => {
  // 空值不参与数值比较（Number(null) === 0 会把缺失值误判成 0）
  if (value === null || value === undefined || value === '') return null
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const isEmptyValue = (value: unknown): boolean =>
  value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)

/** 文本/数值混合相等判定：任一侧是 number 时按数值比较 */
function looseEqual(left: unknown, right: unknown, caseSensitive: boolean): boolean {
  if (typeof left === 'number' || typeof right === 'number') return asNumber(left) === asNumber(right)
  return asText(left, caseSensitive) === asText(right, caseSensitive)
}

/** 单个条件命中判定（非法字段 / 未知算子 → false） */
export function matchFilter(row: Record<string, unknown>, condition: Filter): boolean {
  if (!isObject(condition) || typeof condition.field !== 'string' || !OPS.includes(condition.op)) return false
  const value = readPath(row, condition.field)
  const caseSensitive = condition.caseSensitive ?? false
  const expected = condition.value
  switch (condition.op) {
    case 'eq':
      return looseEqual(value, expected, caseSensitive)
    case 'neq':
      return !looseEqual(value, expected, caseSensitive)
    case 'contains': {
      const needle = asText(expected, caseSensitive)
      if (Array.isArray(value)) return value.some((item) => asText(item, caseSensitive).includes(needle))
      return asText(value, caseSensitive).includes(needle)
    }
    case 'startsWith':
      return asText(value, caseSensitive).startsWith(asText(expected, caseSensitive))
    case 'endsWith':
      return asText(value, caseSensitive).endsWith(asText(expected, caseSensitive))
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const left = asNumber(value)
      const right = asNumber(expected)
      if (left == null || right == null) return false
      if (condition.op === 'gt') return left > right
      if (condition.op === 'gte') return left >= right
      return condition.op === 'lt' ? left < right : left <= right
    }
    case 'in': {
      const list = Array.isArray(expected) ? expected : []
      const hit = (entry: unknown): boolean => list.some((item) => looseEqual(entry, item, caseSensitive))
      return Array.isArray(value) ? value.some(hit) : hit(value)
    }
    case 'between': {
      const [min, max] = Array.isArray(expected) ? expected : []
      const target = asNumber(value)
      const lower = asNumber(min)
      const upper = asNumber(max)
      return target != null && lower != null && upper != null && target >= lower && target <= upper
    }
    case 'empty':
      return isEmptyValue(value)
    case 'notEmpty':
      return !isEmptyValue(value)
    default:
      return false
  }
}

/** 条件树命中判定：and 空组 → true，or 空组 → false */
export function matchQuery(row: Record<string, unknown>, node: TableQueryNode): boolean {
  if (isFilterGroup(node)) {
    const children = Array.isArray(node.filters) ? node.filters : []
    if (node.combinator === 'or') return children.some((child) => matchQuery(row, child))
    return children.every((child) => matchQuery(row, child))
  }
  return matchFilter(row, node)
}

function normalizeFilter(filter: unknown): FilterGroup | null {
  if (!isObject(filter)) return null
  if (!('combinator' in filter) || !('filters' in filter)) return null
  const combinator = filter.combinator === 'or' ? 'or' : 'and'
  const children = Array.isArray(filter.filters) ? [...(filter.filters as TableQueryNode[])] : []
  return { combinator, filters: children }
}

function normalizeSort(sort: unknown): SortSpec[] {
  if (!Array.isArray(sort)) return []
  const out: SortSpec[] = []
  const position = new Map<string, number>()
  for (const raw of sort) {
    if (!isObject(raw) || typeof raw.field !== 'string' || raw.field === '') continue
    const dir: SortDir = raw.dir === 'desc' ? 'desc' : 'asc'
    const existing = position.get(raw.field)
    if (existing === undefined) {
      position.set(raw.field, out.length)
      out.push({ field: raw.field, dir })
    } else {
      out[existing] = { field: raw.field, dir }
    }
  }
  return out
}

function normalizePage(page: unknown): PageSpec | null {
  if (!isObject(page)) return null
  const pageSize = typeof page.pageSize === 'number' ? Math.trunc(page.pageSize) : Number.NaN
  if (!Number.isFinite(pageSize) || pageSize <= 0) return null
  const rawCurrent = typeof page.current === 'number' ? Math.trunc(page.current) : 1
  const current = Number.isFinite(rawCurrent) && rawCurrent > 1 ? rawCurrent : 1
  return { current, pageSize }
}

const emptyValue = (value: unknown): boolean => value === null || value === undefined || value === ''

/** 单值比较：数值/日期按数值语义，其余按字符串码元序（跨引擎确定） */
function compareValue(left: unknown, right: unknown): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left < right ? -1 : left > right ? 1 : 0
  }
  if (left instanceof Date && right instanceof Date) {
    const a = left.getTime()
    const b = right.getTime()
    return a < b ? -1 : a > b ? 1 : 0
  }
  const a = String(left)
  const b = String(right)
  return a < b ? -1 : a > b ? 1 : 0
}

function compareRows(left: Record<string, unknown>, right: Record<string, unknown>, sort: readonly SortSpec[]): number {
  for (const spec of sort) {
    const a = readPath(left, spec.field)
    const b = readPath(right, spec.field)
    const aEmpty = emptyValue(a)
    const bEmpty = emptyValue(b)
    // 空值恒排末尾（不随方向翻转）
    if (aEmpty || bEmpty) {
      if (aEmpty && bEmpty) continue
      return aEmpty ? 1 : -1
    }
    const compared = compareValue(a, b)
    if (compared !== 0) return spec.dir === 'desc' ? -compared : compared
  }
  return 0
}

function paginate<T>(rows: T[], page: PageSpec | null): T[] {
  if (!page) return rows
  const start = (page.current - 1) * page.pageSize
  return rows.slice(start, start + page.pageSize)
}

/**
 * 应用一次查询（纯函数）：先过滤、再排序（稳定）、最后分页。
 *
 * - filter 缺省 / 非法 → 不过滤；sort 缺省 / 非法 → 保持原顺序；page 缺省 / 非法 → 不分页
 * - 过滤与排序返回新数组，输入数组与其元素不被修改
 * - 排序空值（null / undefined / ''）恒排末尾；等值保持原相对顺序（显式稳定排序）
 */
export function applyQuery<T extends Record<string, unknown>>(rows: readonly T[], query: Query = {}): T[] {
  const source = Array.isArray(rows) ? rows : []
  const filter = normalizeFilter(query?.filter)
  const filtered = filter ? source.filter((row) => matchQuery(row, filter)) : [...source]

  const sort = normalizeSort(query?.sort)
  let result = filtered
  if (sort.length > 0) {
    result = filtered
      .map((row, index) => ({ row, index }))
      .sort((a, b) => compareRows(a.row, b.row, sort) || a.index - b.index)
      .map((entry) => entry.row)
  }

  return paginate(result, normalizePage(query?.page))
}

function makeState(filter: FilterGroup | null, sort: readonly SortSpec[], page: PageSpec | null): QueryState {
  return {
    filter,
    sort,
    page,
    get query(): Query {
      return { filter, sort: [...sort], page }
    },
    setFilter(next) {
      return makeState(normalizeFilter(next), sort, page)
    },
    addSort(field, dir = 'asc') {
      if (typeof field !== 'string' || field === '') return makeState(filter, sort, page)
      const rest = sort.filter((entry) => entry.field !== field)
      return makeState(filter, [...rest, { field, dir: dir === 'desc' ? 'desc' : 'asc' }], page)
    },
    setPage(patch) {
      if (patch === null) return makeState(filter, sort, null)
      if (!isObject(patch)) return makeState(filter, sort, page)
      const current = typeof patch.current === 'number' ? patch.current : (page?.current ?? 1)
      const pageSize = typeof patch.pageSize === 'number' ? patch.pageSize : (page?.pageSize ?? DEFAULT_PAGE_SIZE)
      return makeState(filter, sort, normalizePage({ current, pageSize }))
    },
  }
}

/** 创建查询状态（不可变）：初始化非法字段按缺省值归一 */
export function createQueryState(init: Query = {}): QueryState {
  return makeState(normalizeFilter(init?.filter), normalizeSort(init?.sort), normalizePage(init?.page))
}
