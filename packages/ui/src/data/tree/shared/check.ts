/**
 * 树内核 —— 勾选模型（tree × tree-select 共享）。
 *
 * 语义（两组件既有一致约定）：
 * - 级联：勾选父级 → 全部可勾选后代勾选；非 disabled 直接子级全勾选 → 父级收敛进闭包；
 * - inert（disabled / tree 的 disableCheckbox）节点：不进级联闭包、不参与父级收敛、
 *   自身 normalize 跳过——与 tree-select 已落地实现逐点对齐；
 * - check-strictly：勾选互不级联，闭包即受控值集合本身；
 * - 导出策略：all（默认）/ parent（父级代表）/ child（只留叶子）；
 *   策略在闭包之上派生，strictly 下恒为 all。
 * 全部为纯函数，输入输出都是 Set<string> / string[]（key/value 集合），不碰 DOM。
 */
import type { FlatRow, TreeAccessors, TreeModel } from './model.js'

export interface CheckContext<N> {
  model: TreeModel<N>
  acc: TreeAccessors<N>
}

export type CheckStrategy = 'all' | 'parent' | 'child'

/** 节点的全部后代（含 inert），供 half 态判定 */
export function descendantNodes<N>(ctx: CheckContext<N>, node: N): N[] {
  const out: N[] = []
  const walk = (list: N[] | undefined): void => {
    for (const o of list ?? []) {
      out.push(o)
      walk(ctx.acc.childrenOf(o))
    }
  }
  walk(ctx.acc.childrenOf(node))
  return out
}

/** 递归收集 fn 命中的后代（遍历不受 inert 阻断，命中过滤由 fn 决定） */
function eachDescendant<N>(ctx: CheckContext<N>, node: N, fn: (n: N) => void): void {
  for (const c of ctx.acc.childrenOf(node) ?? []) {
    fn(c)
    eachDescendant(ctx, c, fn)
  }
}

/** 自底向上归一化：全勾子级 → 父级加入，否则移出（inert 节点与 inert 子级不参与） */
export function normalizeClosure<N>(ctx: CheckContext<N>, checked: Set<string>): void {
  const rows = ctx.model.rows
  const acc = ctx.acc
  for (let i = rows.length - 1; i >= 0; i--) {
    const node = rows[i]!.node
    if (acc.inertOf(node)) continue
    const kids = (acc.childrenOf(node) ?? []).filter((c) => !acc.inertOf(c))
    if (!kids.length) continue
    if (kids.every((k) => checked.has(acc.idOf(k)))) checked.add(acc.idOf(node))
    else checked.delete(acc.idOf(node))
  }
}

/**
 * 由受控值数组推导「内部完整勾选闭包」（驱动复选框展示）：
 * 每个值展开其全部可勾选后代后自底向上归一化；树外未知值原样保留。
 */
export function closureFromValues<N>(ctx: CheckContext<N>, values: string[]): Set<string> {
  const checked = new Set<string>()
  const acc = ctx.acc
  for (const v of values) {
    const node = ctx.model.byId.get(v)
    if (!node) {
      checked.add(v)
      continue
    }
    checked.add(v)
    eachDescendant(ctx, node, (d) => {
      if (!acc.inertOf(d)) checked.add(acc.idOf(d))
    })
  }
  normalizeClosure(ctx, checked)
  return checked
}

/**
 * 闭包集合 → 按策略派生对外值（strictly 时策略恒 all）。
 * 树外受控值（不在树中）原样追加在末尾，保持宿主回传不回丢。
 */
export function applyCheckStrategy<N>(
  ctx: CheckContext<N>,
  checked: Set<string>,
  strategy: CheckStrategy,
  controlled: string[],
): string[] {
  const out: string[] = []
  const acc = ctx.acc
  for (const item of ctx.model.rows) {
    const v = acc.idOf(item.node)
    if (!checked.has(v)) continue
    if (strategy === 'child') {
      if (acc.childrenOf(item.node)?.length) continue
      out.push(v)
    } else if (strategy === 'parent') {
      // 父级已勾选时其子级被父级代表，不再单独入值
      if (item.parent && checked.has(item.parent)) continue
      out.push(v)
    } else {
      out.push(v)
    }
  }
  const outSet = new Set(out)
  for (const v of controlled) {
    if (!outSet.has(v) && !ctx.model.byId.has(v)) out.push(v)
  }
  return out
}

/**
 * 翻转某节点勾选（在内部闭包集合上操作）：
 * - strictly：仅翻转自身；
 * - 级联：勾选 → 自身 + 全部可勾选后代后归一化；取消 → 自身 + 后代移出后归一化。
 * 返回原集合引用（已原地变更）。
 */
export function flipChecked<N>(
  ctx: CheckContext<N>,
  checked: Set<string>,
  id: string,
  strictly: boolean,
): Set<string> {
  const acc = ctx.acc
  const node = ctx.model.byId.get(id)
  if (!node) {
    if (strictly) {
      if (checked.has(id)) checked.delete(id)
      else checked.add(id)
    }
    return checked
  }
  const willCheck = !checked.has(id)
  if (strictly) {
    if (willCheck) checked.add(id)
    else checked.delete(id)
    return checked
  }
  if (willCheck) {
    checked.add(id)
    eachDescendant(ctx, node, (d) => {
      if (!acc.inertOf(d)) checked.add(acc.idOf(d))
    })
  } else {
    checked.delete(id)
    // 只移除可勾选后代（与 tree-select 既有实现一致：inert 后代不参与勾选翻转）
    eachDescendant(ctx, node, (d) => {
      if (!acc.inertOf(d)) checked.delete(acc.idOf(d))
    })
  }
  normalizeClosure(ctx, checked)
  return checked
}

/** half 态：自身未勾选但存在（任意）勾选后代（半选回显，strictly 时组件侧不调用） */
export function halfByDescendant<N>(
  ctx: CheckContext<N>,
  checked: Set<string>,
  id: string,
): boolean {
  const node = ctx.model.byId.get(id)
  if (!node || checked.has(id)) return false
  const acc = ctx.acc
  let hit = false
  eachDescendant(ctx, node, (d) => {
    if (checked.has(acc.idOf(d))) hit = true
  })
  return hit
}

/** 根到自身 label 序列（show-path / 回显用） */
export function labelPath<N>(ctx: CheckContext<N>, id: string): string[] {
  const acc = ctx.acc
  const parts: string[] = []
  let cur: N | undefined = ctx.model.byId.get(id)
  let seen = 0
  while (cur && seen <= ctx.model.rows.length) {
    parts.unshift(acc.labelOf(cur))
    const parentId = ctx.model.parentById.get(acc.idOf(cur))
    cur = parentId !== undefined ? ctx.model.byId.get(parentId) : undefined
    seen++
  }
  return parts
}

/** 行遍历辅助（visibleFlat 过滤等），类型导出避免各组件重复声明 */
export type { FlatRow, TreeAccessors, TreeModel }
