import { OASElement } from '@oas-ui/core'

const ITEM_STYLE = `
:host {
  /* 数据载体：自身不渲染任何可视内容，由 <oas-command> 解析默认插槽文本与属性为内部 items 模型后统一渲染；
     display:none 保证不进无障碍树 */
  display: none;
}
`

/**
 * 命令项（子元素声明式通道）。
 *
 * 纯数据载体：默认插槽文本为 label，属性对齐 CommandItem 字段
 * （value/group/disabled/icon/shortcut/description/view/force-mount/separator/keywords）。
 * keywords 为逗号分隔字符串，解析为 string[]（trim + 去空）。
 * 直接子元素 <oas-command-item> 递归为 page 子页（page 不用属性，嵌套即子页）。
 * 宿主 <oas-command> 在 items 属性未显式设置时解析子元素并收敛到同一渲染路径。
 */
export class OASCommandItem extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'group',
      'disabled',
      'icon',
      'shortcut',
      'description',
      'view',
      'force-mount',
      'separator',
      'keywords',
    ]
  }

  protected override render(): void {
    this.shadow.innerHTML = `<style>${ITEM_STYLE}</style><slot></slot>`
  }

  protected override update(): void {
    // 数据载体：属性/插槽变化由宿主 <oas-command> 的 MutationObserver 感知后统一重渲染
  }
}
