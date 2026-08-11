import { OASElement } from '@oas-ui/core'

export class OASTimelineItem extends OASElement {
  static override get observedAttributes(): string[] {
    return ['time', 'color', 'pending']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `<slot></slot>`
  }

  /** 缓存节点引用（render 与水合路径共用；timeline-item 无事件绑定） */
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
