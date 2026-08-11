import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  padding: var(--oas-space-4) var(--oas-space-5);
  border-top: 1px solid var(--oas-color-border);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
:host([hidden]) {
  display: none;
}
`

export class OASFooter extends OASElement {
  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `<style>${STYLE}</style><footer part="footer"><slot></slot></footer>`
  }

  /** 缓存节点引用（render 与水合路径共用；footer 无事件绑定） */
  private bind(): void {}

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（footer 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('footer')) return false
    this.bind()
    return true
  }
}
