import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  font-family: inherit;
  font-size: var(--oas-font-size-md);
}
:host([hidden]) {
  display: none;
}
.label {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.content {
  color: var(--oas-color-text-primary);
}
`

export class OASDescriptionsItem extends OASElement {
  static override get observedAttributes(): string[] {
    return ['label']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="label" part="label"></div>
      <div class="content" part="content"><slot></slot></div>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；descriptions-item 无事件绑定） */
  private bind(): void {}

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（label 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="label"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.shadow.querySelector<HTMLElement>('[part="label"]')!.textContent = this.getAttr(
      'label',
      '',
    )
  }
}
