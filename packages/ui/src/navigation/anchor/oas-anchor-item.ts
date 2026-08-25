import { OASElement } from '@oas-ui/core'

const ITEM_STYLE = `
:host {
  /* 数据载体：自身不渲染任何可视内容，由 <oas-anchor> 解析默认插槽文本与属性为内部 items 模型后统一渲染；
     display:none 保证不进无障碍树 */
  display: none;
}
`

/**
 * 锚点项（子元素声明式通道）。
 *
 * 纯数据载体：默认插槽文本为 title（直接子 oas-anchor-item 是嵌套数据，不计入 title），
 * 属性对齐 AnchorItem 字段（href/target/target-offset）。
 * 嵌套：直接子 `<oas-anchor-item>` 递归为 `children` 多级嵌套（层级缩进，参与滚动高亮）。
 * 宿主 `<oas-anchor>` 在 items 属性未显式设置时解析子元素并收敛到同一渲染路径。
 */
export class OASAnchorItem extends OASElement {
  static override get observedAttributes(): string[] {
    return ['href', 'target', 'target-offset']
  }

  protected override render(): void {
    this.shadow.innerHTML = `<style>${ITEM_STYLE}</style><slot></slot>`
  }

  protected override update(): void {
    // 数据载体：属性/插槽变化由宿主 <oas-anchor> 的 MutationObserver 感知后统一重渲染
  }
}
