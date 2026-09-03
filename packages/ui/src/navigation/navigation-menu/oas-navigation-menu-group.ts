import { OASElement } from '@oas-ui/core'

const GROUP_STYLE = `
:host {
  /* 分组数据载体：自身不渲染，组内直接子 oas-navigation-menu-item 由宿主解析为 group.children
     （type:"group" 语义），面板渲染时平铺进网格；不进无障碍树 */
  display: none;
}
`

/**
 * 导航菜单分组（子元素声明式通道）。
 *
 * 对应 items 的 `type: "group"` 语义：组内直接子 `<oas-navigation-menu-item>` 由宿主
 * `<oas-navigation-menu>` 解析为 `{ type: 'group', children }`，面板渲染时组内子项平铺进网格。
 * label 为可选分组标题（本组件渲染不展示分组标题，仅承载数据，与 JSON 通道字段一致）。
 */
export class OASNavigationMenuGroup extends OASElement {
  static override get observedAttributes(): string[] {
    return ['label']
  }

  protected override render(): void {
    this.shadow.innerHTML = `<style>${GROUP_STYLE}</style><slot></slot>`
  }

  protected override update(): void {
    // 数据载体：属性/插槽变化由宿主 <oas-navigation-menu> 的 MutationObserver 感知后统一重渲染
  }
}
