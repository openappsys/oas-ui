import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.card.hoverable {
  transition: box-shadow var(--oas-transition-base) var(--oas-ease-out);
}
.card.hoverable:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--oas-space-4);
  border-bottom: 1px solid var(--oas-color-border);
}
.title {
  font-weight: 600;
  font-size: var(--oas-font-size-lg);
}
.extra {
  display: flex;
}
.body {
  padding: var(--oas-space-4);
  font-size: var(--oas-font-size-md);
  line-height: 1.6;
}
`

export class OASCard extends OASElement {
  static override get observedAttributes(): string[] {
    return ['title', 'hoverable']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="card" part="card">
        <div class="header" part="header">
          <span class="title" part="title"></span>
          <div class="extra"><slot name="extra"></slot></div>
        </div>
        <div class="body" part="body"><slot></slot></div>
      </div>
    `
  }

  /** 缓存节点引用（render 与水合路径共用） */
  private bind(): void {
    /* card 无事件绑定，bind 保持为空（结构校验在 hydrate 中完成） */
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（card 骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="card"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const card = this.shadow.querySelector('[part="card"]')
    if (!card) return
    card.classList.toggle('hoverable', this.hasAttr('hoverable'))
    this.shadow.querySelector<HTMLElement>('[part="title"]')!.textContent = this.getAttr(
      'title',
      '',
    )
  }
}
