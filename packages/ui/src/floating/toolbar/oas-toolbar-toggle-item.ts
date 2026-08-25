import { OASElement } from '@oas-ui/core'

const ITEM_STYLE = `
:host {
  /* 数据载体：自身不渲染任何可视内容，由 <oas-toolbar-toggle> 解析默认插槽文本与属性为内部 items 模型后统一渲染；
     display:none 保证不进无障碍树（也不参与工具栏 roving） */
  display: none;
}
`

/**
 * 工具栏切换项（子元素声明式通道）。
 *
 * 纯数据载体：默认插槽文本为 label，属性对齐 ToolbarToggleItem 字段
 * （value/disabled）。
 * 宿主 <oas-toolbar-toggle> 在 items 属性未显式设置时解析子元素并收敛到同一渲染路径。
 */
export class OASToolbarToggleItem extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'disabled']
  }

  protected override render(): void {
    this.shadow.innerHTML = `<style>${ITEM_STYLE}</style><slot></slot>`
  }

  protected override update(): void {
    // 数据载体：属性/插槽变化由宿主 <oas-toolbar-toggle> 的 MutationObserver 感知后统一重渲染
  }
}
