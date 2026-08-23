import { OASElement } from '@oas-ui/core'

const SEPARATOR_STYLE = `
:host {
  /* 分隔符载体：自身不渲染（内容由 <oas-breadcrumb> 克隆到分隔位置），不进无障碍树 */
  display: none;
}
`

/**
 * 面包屑分隔符（子元素声明式通道）。
 *
 * 置于两个 `<oas-breadcrumb-item>` 之间，内容为任意节点（文本/图标/内联元素），
 * 由宿主 `<oas-breadcrumb>` 解析为该位置的分隔符。
 */
export class OASBreadcrumbSeparator extends OASElement {
  protected override render(): void {
    this.shadow.innerHTML = `<style>${SEPARATOR_STYLE}</style><slot></slot>`
  }

  protected override update(): void {
    // 数据载体：内容变化由宿主 <oas-breadcrumb> 的 MutationObserver 感知后统一重渲染
  }
}
