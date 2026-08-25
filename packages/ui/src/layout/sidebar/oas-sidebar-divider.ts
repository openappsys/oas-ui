import { OASElement } from '@oas-ui/core'

const DIVIDER_STYLE = `
:host {
  /* 数据载体：自身不渲染任何可视内容，由 <oas-sidebar> 解析为 {type:'divider'} 后统一渲染 */
  display: none;
}
`

/**
 * 侧栏分隔线（子元素声明式通道）。
 *
 * 纯数据载体：无属性，宿主 <oas-sidebar> 在 items 属性未显式设置时解析为 `{ type: 'divider' }`。
 */
export class OASSidebarDivider extends OASElement {
  protected override render(): void {
    this.shadow.innerHTML = `<style>${DIVIDER_STYLE}</style><slot></slot>`
  }

  protected override update(): void {
    // 数据载体：内容变化由宿主 <oas-sidebar> 的 MutationObserver 感知后统一重渲染
  }
}
