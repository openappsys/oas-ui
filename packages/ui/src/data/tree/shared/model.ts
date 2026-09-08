/**
 * 树内核 —— 数据访问器 + 扁平化（tree × tree-select 共享）。
 *
 * 组件把「字段读取」收敛进 TreeAccessors（经 field-names 归一），
 * 内核的树遍历/勾选级联/懒加载只依赖访问器，不感知具体数据形态。
 * 扁平化结果 rows 为 DFS 前序（父先于子），与两组件既有语义一致。
 */

export interface TreeAccessors<N> {
  /** 节点唯一标识（oas-tree 的 key / oas-tree-select 的 value） */
  idOf(node: N): string
  labelOf(node: N): string
  childrenOf(node: N): N[] | undefined
  disabledOf(node: N): boolean
  isLeafOf(node: N): boolean
  loadedOf(node: N): boolean
  /** 勾选级联跳过判定（disabled，tree 另含 disableCheckbox） */
  inertOf(node: N): boolean
}

export interface FlatRow<N> {
  node: N
  /** 0 为根层级 */
  depth: number
  /** 父节点 id（根行无） */
  parent?: string
}

export interface TreeModel<N> {
  roots: N[]
  rows: FlatRow<N>[]
  /** id → 节点（同 id 后者覆盖，与组件既有 valueMap/dataMap 行为一致） */
  byId: Map<string, N>
  /** id → 父 id（根无） */
  parentById: Map<string, string>
}

/** DFS 前序扁平化：行含 parent id，byId/parentById 随行维护 */
export function flattenModel<N>(roots: N[], acc: TreeAccessors<N>): TreeModel<N> {
  const model: TreeModel<N> = {
    roots,
    rows: [],
    byId: new Map(),
    parentById: new Map(),
  }
  const walk = (list: N[], depth: number, parent?: string): void => {
    for (const node of list) {
      const id = acc.idOf(node)
      model.rows.push({ node, depth, parent })
      model.byId.set(id, node)
      if (parent !== undefined) model.parentById.set(id, parent)
      const kids = acc.childrenOf(node)
      if (kids?.length) walk(kids, depth + 1, id)
    }
  }
  walk(roots, 0)
  return model
}
