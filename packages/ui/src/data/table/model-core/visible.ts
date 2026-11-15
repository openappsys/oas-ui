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
 *
 * 层级分组（server 分组协议的组行可带 depth）：折叠某组 = 折叠其整棵子树——该组行之后
 * depth 更深的组行与其组内行一并隐藏，直到下一个不深于折叠组的组行。本地分组组行
 * depth 恒 0，此时本算法与「折叠组只保留分节头行」的既有语义逐字节等价（零漂移）。
 */
export function visibleFlat(
  flat: FlatRow[],
  expanded: ReadonlySet<string>,
  rowKey: string,
  collapsedGroups: ReadonlySet<string> = NO_COLLAPSED_GROUPS,
): FlatRow[] {
  const out: FlatRow[] = []
  // 最近折叠组的 depth（Infinity = 当前无折叠）：其子树（更深的组行与组内行）全部隐藏
  let collapsedDepth = Infinity
  for (const f of flat) {
    if (f.kind === 'group') {
      const d = f.depth ?? 0
      // 深于折叠组的组行处于折叠子树内 → 一并隐藏（层级语义）；不深于 → 脱离折叠子树，可见
      if (d > collapsedDepth) continue
      out.push(f)
      collapsedDepth = collapsedGroups.has(f.groupKey ?? '') ? d : Infinity
      continue
    }
    // 数据/expand 行：处于折叠组子树内 → 隐藏（组归属按数组相邻性——最近的未隐藏组行；
    // 单层分组折叠组 depth=0 时组内行全隐藏，与既有语义等价）
    if (collapsedDepth !== Infinity) continue
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
