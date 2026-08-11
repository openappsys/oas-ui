import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.items {
  display: grid;
  grid-template-columns: repeat(var(--oas-desc-columns, 3), 1fr);
  row-gap: var(--oas-space-4);
  column-gap: var(--oas-space-4);
}
.title {
  font-weight: 600;
  margin-bottom: var(--oas-space-4);
}
`

export class OASDescriptions extends OASElement {
  static override get observedAttributes(): string[] {
    return ['column', 'title']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="title" part="title"></div>
      <div class="items" part="items"><slot></slot></div>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；descriptions 无事件绑定） */
  private bind(): void {}

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（items 网格存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="items"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.shadow.querySelector<HTMLElement>('[part="title"]')!.textContent = this.getAttr(
      'title',
      '',
    )
    const itemsEl = this.shadow.querySelector<HTMLElement>('[part="items"]')
    if (!itemsEl) return
    const column = this.getAttr('column', '3')
    itemsEl.setAttribute('data-column', column)
    itemsEl.style.setProperty('--oas-desc-columns', column)
  }
}
