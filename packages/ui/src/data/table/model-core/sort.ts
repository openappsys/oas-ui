/**
 * 排序变换段（纯函数）：排序状态解析 + 类型感知比较器。
 *
 * 与组件 `oas-table.ts` 的 `resolveSorts` / `compareRows` / `codePointCompare` /
 * `columnTypeMap` 单一真相源：组件侧为薄壳（读属性 / 列 → 调用本模块），语义逐字节一致。
 * 零 DOM 依赖。
 */
import { flattenLeaves } from './filter.js'
import type { DataColumn, SortDirection, SortState } from './types.js'

/** `resolveSorts` 的属性输入形态：三个属性字符串原样传入（缺省传空串） */
export interface SortAttrs {
  /** `sort-key` 属性原值 */
  sortKey: string
  /** `sort-order` 属性原值（只认 'asc' / 'desc'，其余视为未排序） */
  sortOrder: string
  /** `multi-sort` 属性原值（JSON 数组 `[ { key, order } ]`；非法值忽略并回落单列） */
  multiSort: string
}

/**
 * 解析当前排序状态：`multi-sort` 在场时优先（JSON 数组，逐项校验 key 为 string、
 * order 为 asc/desc，非法项剔除）；JSON 非法回落单列。无 multi-sort 时回退单列
 * sort-key / sort-order（向后兼容）。返回数组按优先级排序（先比较首个，相等再比较次个）。
 */
export function resolveSorts(attrs: SortAttrs): SortState[] {
  const raw = attrs.multiSort
  if (raw) {
    try {
      const arr = JSON.parse(raw) as Array<{ key: string; order?: SortDirection }>
      const out = (Array.isArray(arr) ? arr : [])
        .filter(
          (s): s is { key: string; order: 'asc' | 'desc' } =>
            !!s && typeof s.key === 'string' && (s.order === 'asc' || s.order === 'desc'),
        )
        .map((s): SortState => ({ key: s.key, order: s.order }))
      return out
    } catch {
      /* 非法 multi-sort 忽略，回退单列 */
    }
  }
  const key = attrs.sortKey
  const order = attrs.sortOrder as SortDirection
  return key && (order === 'asc' || order === 'desc') ? [{ key, order }] : []
}

/** key → 列 type 映射（排序比较器热路径外提：避免每次比较都全树走查叶子列） */
export function columnTypeMap(columns: DataColumn[] | undefined): Map<string, DataColumnTypeOrUndefined> {
  const map = new Map<string, DataColumnTypeOrUndefined>()
  if (!columns) return map
  for (const c of flattenLeaves(columns)) map.set(c.key, c.type)
  return map
}

type DataColumnTypeOrUndefined = DataColumn['type']

/** 字符串码点确定性比较（不依赖宿主 locale） */
export function codePointCompare(av: unknown, bv: unknown): number {
  const sa = String(av ?? '')
  const sb = String(bv ?? '')
  return sa < sb ? -1 : sa > sb ? 1 : 0
}

/**
 * 排序比较器：按 sorts 数组逐级比较，数字按数值、其余按字符串码点确定性比较。
 * type 数值类列（number/currency/progress/rate）无论原始形态按数值序、date 按时间序
 *（解析失败回落码点）；不依赖宿主 locale（localeCompare 无显式 locale 时跨环境排序
 * 结果不同，导致跨环境行为不一致）；语言感知排序（如中文拼音）应由宿主在数据侧
 * 预排序或提供自定义 comparator。
 */
export function compareRows(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  sorts: SortState[],
  typeMap: Map<string, DataColumnTypeOrUndefined>,
): number {
  for (const { key, order } of sorts) {
    if (!order) continue
    const av = a[key]
    const bv = b[key]
    let cmp = 0
    const type = typeMap.get(key)
    if (type === 'number' || type === 'currency' || type === 'progress' || type === 'rate') {
      // 数值类型列：按数值序比较（原始形态为数字或数字字符串）；null/空串/非数字回落码点
      const an = av === null || av === undefined || av === '' ? NaN : Number(av)
      const bn = bv === null || bv === undefined || bv === '' ? NaN : Number(bv)
      cmp = Number.isFinite(an) && Number.isFinite(bn) ? an - bn : codePointCompare(av, bv)
    } else if (type === 'date') {
      // date 列：时间序（时间戳/ISO 串）；解析失败回落码点
      const ad = av === null || av === undefined || av === '' ? NaN : new Date(av as string | number).getTime()
      const bd = bv === null || bv === undefined || bv === '' ? NaN : new Date(bv as string | number).getTime()
      cmp = Number.isNaN(ad) || Number.isNaN(bd) ? codePointCompare(av, bv) : ad - bd
    } else if (typeof av === 'number' && typeof bv === 'number') {
      cmp = av - bv
    } else {
      cmp = codePointCompare(av, bv)
    }
    if (cmp !== 0) return order === 'asc' ? cmp : -cmp
  }
  return 0
}
