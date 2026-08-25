import { OASMenuDivider } from '../menu/oas-menu-divider.js'

/**
 * 右键菜单分隔线（子元素声明式通道）。
 *
 * 纯数据载体：无属性，语义与 `<oas-menu-divider>` 完全一致，直接继承实现
 * （零重复代码）；宿主 `<oas-context-menu>` 在 items 属性未显式设置时解析为 `{ type: 'divider' }`。
 */
export class OASContextMenuDivider extends OASMenuDivider {}
