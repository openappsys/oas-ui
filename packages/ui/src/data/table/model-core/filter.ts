/**
 * 过滤变换段（纯函数）：`filter-values` 的解析 + 行匹配。
 *
 * 与组件 `oas-table.ts` 的 `parseFilterValues` / `matchesFilters` 单一真相源：
 * 组件侧为薄壳（读属性 → 调用本模块），语义逐字节一致。零 DOM 依赖。
 */
import type { DataColumn, FilterValues } from './types.js'

/** 展平列树：深度优先收集叶子列（无 children 的列）。组列只承载标题，不参与数据匹配 */
export function flattenLeaves(cols: DataColumn[]): DataColumn[] {
  const out: DataColumn[] = []
  for (const c of cols) {
    if (c.children && c.children.length > 0) out.push(...flattenLeaves(c.children))
    else out.push(c)
  }
  return out
}

/**
 * 解析过滤状态：`filter-values` 属性 JSON `{ [colKey]: value }`；空 / 缺省 / 非法 JSON /
 * 非对象 = 无过滤（空对象）。智能跳过空值（'' / null / undefined），避免误过滤；
 * 数字保留 number 形态，其余一律 String()。
 * `raw` 为对象时（宿主已持有解析结果）走同一归一化循环，不再二次 JSON 解析。
 */
export function parseFilterValues(raw: string | Record<string, string | number>): FilterValues {
  let parsed: unknown
  if (typeof raw === 'string') {
    if (!raw) return {}
    try {
      parsed = JSON.parse(raw)
    } catch {
      return {}
    }
  } else {
    parsed = raw
  }
  if (!parsed || typeof parsed !== 'object') return {}
  const out: FilterValues = {}
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (v === '' || v === null || v === undefined) continue
    out[k] = typeof v === 'number' ? v : String(v)
  }
  return out
}

/**
 * 该行是否命中所有过滤条件：逐个过滤键找叶子列，列定义 `filterMatch` 在场时以它为准，
 * 缺省按字符串严格相等（`String(cell ?? '') !== String(fv)`）；未知键（无对应叶子列）跳过。
 */
export function matchesFilters(
  row: Record<string, unknown>,
  filterValues: FilterValues,
  columns: DataColumn[],
): boolean {
  const leaves = flattenLeaves(columns)
  for (const [key, fv] of Object.entries(filterValues)) {
    const col = leaves.find((c) => c.key === key)
    if (!col) continue
    const cell = row[key]
    if (col.filterMatch) {
      if (!col.filterMatch(cell, fv)) return false
    } else if (String(cell ?? '') !== String(fv)) {
      return false
    }
  }
  return true
}
