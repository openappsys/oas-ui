/**
 * oas-tree / oas-tree-select 共享树内核。
 *
 * 抽取范围（最小高复用集）：字段别名归一（fields）+ DFS 扁平化与索引（model）
 * + 勾选级联闭包/half/导出策略（check）+ 懒加载状态机判定（lazy）+ slot 模板克隆
 * （template）。两组件各自保留 ARIA/键盘、触发外观、目录/拖拽/面板等差异化能力。
 */
export { resolveFieldNames, defaultFields } from './fields.js'
export type { ResolvedFields } from './fields.js'
export { flattenModel } from './model.js'
export type { FlatRow, TreeAccessors, TreeModel } from './model.js'
export {
  descendantNodes,
  normalizeClosure,
  closureFromValues,
  applyCheckStrategy,
  flipChecked,
  halfByDescendant,
  labelPath,
} from './check.js'
export type { CheckContext, CheckStrategy } from './check.js'
export { expandableNode, loadPendingNode, releaseLoading } from './lazy.js'
export { cloneSlotContent } from './template.js'
