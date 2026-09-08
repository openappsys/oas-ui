/**
 * 树内核 —— 懒加载状态机判定（tree × tree-select 共享）。
 *
 * 展开判定 / 加载触发判定 / 加载态释放统一走这里：children 就绪、isLeaf、
 * loaded 任一收口都结束「未加载」语义，与两组件既有实现逐点对齐。
 */
import type { TreeAccessors, TreeModel } from './model.js'

/** 节点是否可展开：常规仅 children 非空；懒加载下未加载节点也可展开（点击触发加载） */
export function expandableNode<N>(node: N, acc: TreeAccessors<N>, lazy: boolean): boolean {
  if (acc.childrenOf(node)?.length) return true
  if (!lazy) return false
  if (acc.isLeafOf(node) || acc.loadedOf(node)) return false
  if (acc.childrenOf(node) !== undefined) return false // children: [] → 已加载为空
  return true
}

/** 是否应触发懒加载（展开未加载节点）：与 expandable 判定共享条件，排除已有 children */
export function loadPendingNode<N>(node: N, acc: TreeAccessors<N>, lazy: boolean): boolean {
  if (!lazy) return false
  if (acc.childrenOf(node)?.length) return false
  if (acc.isLeafOf(node) || acc.loadedOf(node)) return false
  if (acc.childrenOf(node) !== undefined) return false
  return true
}

/** 宿主回填子节点（children 就绪 / isLeaf / loaded）后释放对应加载态 */
export function releaseLoading<N>(
  model: TreeModel<N>,
  acc: TreeAccessors<N>,
  loading: Set<string>,
): void {
  for (const { node } of model.rows) {
    const id = acc.idOf(node)
    if (
      loading.has(id) &&
      (acc.childrenOf(node) !== undefined || acc.isLeafOf(node) || acc.loadedOf(node))
    ) {
      loading.delete(id)
    }
  }
}
