/**
 * 分组 + 展平变换段（纯函数）：分节头行插入 + 各层级兄弟排序 + 树形 children 递归。
 *
 * 与组件 `oas-table.ts` 的 `buildFlat` 单一真相源：组件侧为薄壳（传入列与排序状态 →
 * 调用本模块），语义逐字节一致。组件内的诊断计数（flatBuilds）与 i18n 文案查找留在壳层
 * ——本模块只接参数化的 `groupEmptyLabel`。零 DOM 依赖。
 */
import { rowKeyValue } from '../oas-table-row-key.js'
import { columnTypeMap, compareRows } from './sort.js'
import type { DataColumn, FlatRow, SortState } from './types.js'

/** `buildFlat` 的选项：排序状态 / 行键 / 分组字段 / 空值组文案 */
export interface BuildFlatOptions {
  /** 排序状态（各层级兄弟间独立排序，不破坏父子结构；空数组 = 不排序） */
  sorts?: SortState[]
  /** 行键字段名（树形子行的 parent 键取值；缺省 'key'） */
  rowKey: string
  /** 分组字段键（非空时按字段值分节：分节头行前置于组内行） */
  groupBy?: string
  /** 空值组（null / undefined / 空白串）的分节头文案（i18n 由调用方注入；缺省 "(empty)"） */
  groupEmptyLabel?: string
}

/**
 * 构建扁平行列表（含树形 children 递归）。排序在各层级兄弟间独立进行，不破坏父子结构；
 * 返回的 flat 是完整列表（树形含隐藏子行），可见性过滤（visibleFlat）再做。
 * roots 只遍历这些顶层行（分页场景传当前页切片）。groupBy 非空时按该字段值分节：
 * 分节头行（kind='group'）前置于组内行，组间按字段值首次出现序、组内独立排序
 * （sorts 作用于组内）；空值行归入空值组（groupKey=''，文案 groupEmptyLabel）。
 */
export function buildFlat(
  roots: Array<Record<string, unknown>>,
  columns: DataColumn[] | undefined,
  options: BuildFlatOptions,
): FlatRow[] {
  const sorts = options.sorts ?? []
  const rowKey = options.rowKey
  const groupBy = options.groupBy ?? ''
  const flat: FlatRow[] = []
  const sortTypeMap = sorts.length > 0 ? columnTypeMap(columns) : null
  const walk = (nodes: Array<Record<string, unknown>>, depth: number, parent?: string): void => {
    const list = [...nodes]
    if (sorts.length > 0) {
      list.sort((a, b) => compareRows(a, b, sorts, sortTypeMap!))
    }
    for (const row of list) {
      flat.push({ row, depth, parent, kind: 'data' })
      const children = row.children
      if (Array.isArray(children) && children.length > 0) {
        walk(children, depth + 1, rowKeyValue(row, rowKey))
      }
    }
  }
  if (groupBy) {
    // 分组：Map 保持首次出现序（组间序 = 字段值首次出现序）
    const groups = new Map<string, Array<Record<string, unknown>>>()
    for (const row of roots) {
      const v = row[groupBy]
      // null/undefined/空白串归入空值组（键为空串，与真实值键不冲突）
      const key = v === null || v === undefined || String(v).trim() === '' ? '' : String(v)
      const bucket = groups.get(key)
      if (bucket) bucket.push(row)
      else groups.set(key, [row])
    }
    const emptyLabel = options.groupEmptyLabel ?? '(empty)'
    for (const [key, rows] of groups) {
      flat.push({
        row: {},
        depth: 0,
        kind: 'group',
        groupKey: key,
        groupLabel: key === '' ? emptyLabel : key,
        groupCount: rows.length,
      })
      walk(rows, 0)
    }
    return flat
  }
  walk(roots, 0)
  return flat
}
