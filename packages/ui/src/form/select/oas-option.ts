import { OASElement } from '@oas-ui/core'

const ITEM_STYLE = `
:host {
  /* 数据载体：自身不渲染任何可视内容，由 <oas-select> 解析默认插槽文本与属性为内部 options 模型后统一渲染；
     display:none 保证不进无障碍树 */
  display: none;
}
`

/**
 * 选项（子元素声明式通道）。
 *
 * 纯数据载体：默认插槽文本为 label，属性对齐 Option 字段
 * （value/disabled/group，group 为分组标题，同组连续渲染组标题）。
 * 宿主 <oas-select> 在 options 属性未显式设置时解析子元素并收敛到同一渲染路径。
 */
export class OASOption extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'disabled', 'group']
  }

  protected override render(): void {
    this.shadow.innerHTML = `<style>${ITEM_STYLE}</style><slot></slot>`
  }

  protected override update(): void {
    // 数据载体：属性/插槽变化由宿主 <oas-select> 的 MutationObserver 感知后统一重渲染
  }
}
