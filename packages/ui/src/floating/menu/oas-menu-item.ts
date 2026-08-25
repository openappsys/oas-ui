import { OASElement } from '@oas-ui/core'

const ITEM_STYLE = `
:host {
  /* 数据载体：自身不渲染任何可视内容，由 <oas-menu> 解析默认插槽文本与属性为内部 items 模型后统一渲染；
     display:none 保证不进无障碍树 */
  display: none;
}
`

/**
 * 菜单项（子元素声明式通道）。
 *
 * 纯数据载体：默认插槽文本为 label，属性对齐 items 字段
 * （value/disabled/loading/icon/kind/danger/href/target/rel）。
 * 直接子元素 <oas-menu-item>/<oas-menu-group>/<oas-menu-divider> 递归为子菜单 children。
 * 宿主 <oas-menu> 在 items 属性未显式设置时解析子元素并收敛到同一渲染路径。
 */
export class OASMenuItem extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'disabled', 'loading', 'icon', 'kind', 'danger', 'href', 'target', 'rel']
  }

  protected override render(): void {
    this.shadow.innerHTML = `<style>${ITEM_STYLE}</style><slot></slot>`
  }

  protected override update(): void {
    // 数据载体：属性/插槽变化由宿主 <oas-menu> 的 MutationObserver 感知后统一重渲染
  }
}
