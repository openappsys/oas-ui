import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: flex;
  align-items: center;
  gap: var(--oas-space-3);
  padding: var(--oas-space-3) var(--oas-space-4);
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.title {
  font-weight: 500;
  font-size: var(--oas-font-size-md);
}
.main {
  flex: 1;
  min-width: 0;
}
.desc {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.extra {
  flex-shrink: 0;
}
`

export class OASListItem extends OASElement {
  static override get observedAttributes(): string[] {
    return ['title']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="main" part="main">
        <div class="title" part="title"></div>
        <div class="desc" part="desc"><slot name="description"><slot></slot></slot></div>
      </div>
      <div class="extra"><slot name="extra"></slot></div>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；list-item 无事件绑定） */
  private bind(): void {}

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（main 骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="main"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.shadow.querySelector<HTMLElement>('[part="title"]')!.textContent = this.getAttr(
      'title',
      '',
    )
  }
}
