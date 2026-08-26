import { OASElement } from '@oas-ui/core'

const ITEM_STYLE = `
:host {
  /* 数据载体：自身不渲染任何可视内容，由 <oas-sidebar> 解析默认插槽文本与属性为内部 items 模型后统一渲染；
     display:none 保证不进无障碍树 */
  display: none;
}
`

/**
 * 侧栏菜单项（子元素声明式通道）。
 *
 * 纯数据载体：默认插槽文本为 label，属性对齐 SidebarItem 字段
 * （value/icon/group/badge）。badge 字符串直传，纯数字字符串（`/^\d+$/`）
 * 由宿主解析时转 number，对齐 SidebarItem.badge 的 string|number。
 * 直接子元素 <oas-sidebar-item>（及 <oas-sidebar-divider>）递归为嵌套 children。
 * 宿主 <oas-sidebar> 在 items 属性未显式设置时解析子元素并收敛到同一渲染路径。
 * 需要 actions 的项请用 items JSON（对象数组不适合标量属性映射）。
 */
export class OASSidebarItem extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'icon', 'icon-color', 'group', 'badge']
  }

  protected override render(): void {
    this.shadow.innerHTML = `<style>${ITEM_STYLE}</style><slot></slot>`
  }

  protected override update(): void {
    // 数据载体：属性/插槽变化由宿主 <oas-sidebar> 的 MutationObserver 感知后统一重渲染
  }
}
