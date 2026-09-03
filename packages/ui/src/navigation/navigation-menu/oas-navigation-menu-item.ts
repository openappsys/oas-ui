import { OASElement } from '@oas-ui/core'

const ITEM_STYLE = `
:host {
  /* 数据载体：自身不渲染任何可视内容，由 <oas-navigation-menu> 解析默认插槽文本与属性为内部 items 模型后统一渲染；
     display:none 保证不进无障碍树 */
  display: none;
}
`

/**
 * 导航菜单项（子元素声明式通道）。
 *
 * 纯数据载体：默认插槽文本为 label（直接子 oas-navigation-menu-item / oas-navigation-menu-group
 * 是嵌套数据，不计入 label），属性对齐 NavItem/MenuItem 标量字段
 * （value/href/target/rel/icon/icon-color/description/active/disabled/loading/kind/danger）。
 * 嵌套：带 `sub` 属性（布尔）时直接子项解析为 `sub`（面板内覆盖式二级导航），否则递归为 `children`。
 * 宿主 `<oas-navigation-menu>` 在 items 属性未显式设置时解析子元素并收敛到同一渲染路径。
 */
export class OASNavigationMenuItem extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'href',
      'target',
      'rel',
      'icon',
      'icon-color',
      'description',
      'active',
      'disabled',
      'loading',
      'kind',
      'danger',
      'sub',
    ]
  }

  protected override render(): void {
    this.shadow.innerHTML = `<style>${ITEM_STYLE}</style><slot></slot>`
  }

  protected override update(): void {
    // 数据载体：属性/插槽变化由宿主 <oas-navigation-menu> 的 MutationObserver 感知后统一重渲染
  }
}
