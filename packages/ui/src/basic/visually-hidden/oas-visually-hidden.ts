import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  clip-path: inset(50%) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
`

/**
 * 视觉隐藏但保留在文档流中：屏幕阅读器可读、文本可被选中复制。
 * 纯展示组件，不派发任何事件、不含任何交互元素。
 */
export class OASVisuallyHidden extends OASElement {
  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <slot></slot>
    `
  }
}
