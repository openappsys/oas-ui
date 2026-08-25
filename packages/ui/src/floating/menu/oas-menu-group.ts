import { OASElement } from '@oas-ui/core'

const GROUP_STYLE = `
:host {
  /* 数据载体：自身不渲染任何可视内容，由 <oas-menu> 解析 label/value 属性与子元素为内部 items 模型后统一渲染 */
  display: none;
}
`

/**
 * 菜单分组标题（子元素声明式通道）。
 *
 * 纯数据载体：label 属性为组标题，value 属性可作 radio 组 id；
 * 子元素 <oas-menu-item>/<oas-menu-group>/<oas-menu-divider> 递归为平铺 children
 * （group 的 children 平铺同层，对齐 items 字段既有语义）。
 * 宿主 <oas-menu> 在 items 属性未显式设置时解析子元素并收敛到同一渲染路径。
 */
export class OASMenuGroup extends OASElement {
  static override get observedAttributes(): string[] {
    return ['label', 'value']
  }

  protected override render(): void {
    this.shadow.innerHTML = `<style>${GROUP_STYLE}</style><slot></slot>`
  }

  protected override update(): void {
    // 数据载体：属性/插槽变化由宿主 <oas-menu> 的 MutationObserver 感知后统一重渲染
  }
}
