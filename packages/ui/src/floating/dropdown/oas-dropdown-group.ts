import { OASMenuGroup } from '../menu/oas-menu-group.js'

/**
 * 下拉菜单分组标题（子元素声明式通道）。
 *
 * 纯数据载体：label 属性为组标题，value 属性可作 radio 组 id；
 * 子元素 `<oas-dropdown-item>` 递归为平铺 children（group 的 children 平铺同层）。
 * 语义与字段集与 `<oas-menu-group>` 完全一致，直接继承实现（零重复代码）。
 * 宿主 `<oas-dropdown>` 在 items 属性未显式设置时解析子元素并收敛到同一渲染路径。
 */
export class OASDropdownGroup extends OASMenuGroup {}
