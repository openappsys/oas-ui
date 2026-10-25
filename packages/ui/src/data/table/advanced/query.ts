/** 查询条件运算符 */
export type QueryOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'between'
  | 'exists'
  | 'empty'

export interface QueryCondition {
  field: string
  op: QueryOperator
  value?: unknown
  /** 文本运算符是否区分大小写，默认 false */
  caseSensitive?: boolean
}

export interface QueryGroup {
  logic: 'and' | 'or'
  conditions: QueryNode[]
}

export type QueryNode = QueryCondition | QueryGroup

export function isQueryGroup(node: QueryNode): node is QueryGroup {
  return 'logic' in node && Array.isArray((node as QueryGroup).conditions)
}

function valueOf(row: Record<string, unknown>, field: string): unknown {
  return field.split('.').reduce<unknown>((current, key) => {
    if (current == null || typeof current !== 'object') return undefined
    if (!Object.hasOwn(current, key)) return undefined
    return (current as Record<string, unknown>)[key]
  }, row)
}

function asText(value: unknown, caseSensitive: boolean): string {
  const text = value == null ? '' : String(value)
  return caseSensitive ? text : text.toLowerCase()
}

function asNumber(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : null
}

/** 判断单条条件是否命中；数组字段的 in / contains 按「任一元素命中」处理 */
export function matchCondition(row: Record<string, unknown>, condition: QueryCondition): boolean {
  const value = valueOf(row, condition.field)
  const caseSensitive = condition.caseSensitive ?? false
  switch (condition.op) {
    case 'eq':
      return typeof value === 'number' || typeof condition.value === 'number'
        ? asNumber(value) === asNumber(condition.value)
        : asText(value, caseSensitive) === asText(condition.value, caseSensitive)
    case 'ne':
      return !matchCondition(row, { ...condition, op: 'eq' })
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const left = asNumber(value)
      const right = asNumber(condition.value)
      if (left == null || right == null) return false
      if (condition.op === 'gt') return left > right
      if (condition.op === 'gte') return left >= right
      if (condition.op === 'lt') return left < right
      return left <= right
    }
    case 'contains': {
      const needle = asText(condition.value, caseSensitive)
      if (Array.isArray(value)) return value.some((item) => asText(item, caseSensitive).includes(needle))
      return asText(value, caseSensitive).includes(needle)
    }
    case 'startsWith':
      return asText(value, caseSensitive).startsWith(asText(condition.value, caseSensitive))
    case 'endsWith':
      return asText(value, caseSensitive).endsWith(asText(condition.value, caseSensitive))
    case 'in': {
      const list = Array.isArray(condition.value) ? condition.value : []
      const hit = (entry: unknown): boolean =>
        list.some((item) =>
          typeof entry === 'number' || typeof item === 'number'
            ? asNumber(entry) === asNumber(item)
            : asText(entry, caseSensitive) === asText(item, caseSensitive),
        )
      return Array.isArray(value) ? value.some(hit) : hit(value)
    }
    case 'between': {
      const [min, max] = Array.isArray(condition.value) ? condition.value : []
      const target = asNumber(value)
      const lower = asNumber(min)
      const upper = asNumber(max)
      return target != null && lower != null && upper != null && target >= lower && target <= upper
    }
    case 'exists':
      return value != null && value !== ''
    case 'empty':
      return value == null || value === '' || (Array.isArray(value) && value.length === 0)
    default:
      return false
  }
}

/**
 * 编译查询树为行谓词；支持 and/or 任意嵌套。
 * 空 group 语义：and → true，or → false（与常见查询构建器一致）。
 */
export function compileQuery(node: QueryNode): (row: Record<string, unknown>) => boolean {
  if (isQueryGroup(node)) {
    const predicates = node.conditions.map((child) => compileQuery(child))
    if (node.logic === 'or') return (row) => predicates.some((predicate) => predicate(row))
    return (row) => predicates.every((predicate) => predicate(row))
  }
  return (row) => matchCondition(row, node)
}

/** 过滤行并保持原顺序 */
export function filterRows<T extends Record<string, unknown>>(rows: readonly T[], node: QueryNode): T[] {
  const predicate = compileQuery(node)
  return rows.filter((row) => predicate(row))
}
