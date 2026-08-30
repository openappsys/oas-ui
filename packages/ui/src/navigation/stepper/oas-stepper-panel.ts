import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
`

/**
 * oas-stepper-panel —— 步骤内容面板。
 *
 * 与 oas-stepper 配套（同构 oas-tabs / oas-tab-panel 的 value 关联模式）：
 * 面板内容走默认插槽，`value` 属性关联步骤序号（如 value="0"）。
 * 可见性由 oas-stepper 按 current 匹配 value 驱动（写 host `hidden`），
 * 面板自身为纯内容容器，不感知步骤数据。
 */
export class OASStepperPanel extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <slot></slot>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；panel 无事件绑定） */
  private bind(): void {}

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（默认 slot 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('slot')) return false
    this.bind()
    return true
  }
}
