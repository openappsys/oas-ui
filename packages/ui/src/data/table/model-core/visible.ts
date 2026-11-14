/**
 * 可见集变换段（纯函数）：树形展开过滤 + 分组折叠过滤 + 可展开内容行追加。
 *
 * 与组件 `oas-table.ts` 的 `visibleFlat` 单一真相源：组件侧为薄壳（传入展开集 /
 * 折叠组集合 → 调用本模块），语义逐字节一致。零 DOM 依赖。
 */
import { rowKeyValue } from './row-key.js'
import type { FlatRow } from './types.js'

/** 空组折叠集合缺省值（模块级只读共享；函数不修改入参集合） */
const NO_COLLAPSED_GROUPS: ReadonlySet<string> = new Set()

/**
 * 可见行列表：树形数据按 expanded（父行 key）过滤；可展开行的内容行紧随数据行。
 * 父行有 children 时优先展示子树（不叠加 expand 内容行）。
 * 分组模式下跟踪当前组折叠态（collapsedGroups：折叠组只保留分节头行，组内行全部隐藏）。
 */
export function visibleFlat(
  flat: FlatRow[],
  expanded: ReadonlySet<string>,
  rowKey: string,
  collapsedGroups: ReadonlySet<string> = NO_COLLAPSED_GROUPS,
): FlatRow[] {
  const out: FlatRow[] = []
  let groupCollapsed = false
  for (const f of flat) {
    if (f.kind === 'group') {
      groupCollapsed = collapsedGroups.has(f.groupKey ?? '')
      out.push(f)
      continue
    }
    if (groupCollapsed) continue
    if (f.parent !== undefined && !expanded.has(f.parent)) continue
    out.push(f)
    const row = f.row
    const children = row.children
    const hasChildren = Array.isArray(children) && children.length > 0
    const key = rowKeyValue(row, rowKey)
    if (!hasChildren && expanded.has(key) && typeof row.expand === 'string' && row.expand.length > 0) {
      out.push({
        row,
        depth: f.depth,
        parent: f.parent,
        kind: 'expand',
        expandContent: row.expand,
      })
    }
  }
  return out
}
