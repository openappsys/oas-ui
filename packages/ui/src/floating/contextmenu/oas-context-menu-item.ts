import { OASMenuItem } from '../menu/oas-menu-item.js'

/**
 * 右键菜单项（子元素声明式通道）。
 *
 * 纯数据载体：默认插槽文本为 label，属性对齐 items 字段
 * （value/disabled/loading/icon/kind/danger/href/target/rel）。
 * 字段集与语义与 `<oas-menu-item>` 完全一致，直接继承实现
 * （display:none + observedAttributes + render，零重复代码）。
 * 宿主 `<oas-context-menu>` 在 items 属性未显式设置时解析子元素并收敛到同一渲染路径。
 */
export class OASContextMenuItem extends OASMenuItem {}
