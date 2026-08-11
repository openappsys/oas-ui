import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.head {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-3) var(--oas-space-4);
  cursor: pointer;
  font-size: var(--oas-font-size-md);
}
.head:hover {
  background: var(--oas-color-bg-hover);
}
.arrow {
  transition: transform var(--oas-transition-base) var(--oas-ease-out);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-xs);
}
:host([open]) .arrow {
  transform: rotate(90deg);
}
.body {
  display: none;
  padding: var(--oas-space-3) var(--oas-space-4);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-md);
}
:host([open]) .body {
  display: block;
}
`

export class OASCollapseItem extends OASElement {
  static override get observedAttributes(): string[] {
    return ['name', 'header', 'open']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="item" part="item">
        <div class="head" part="head"><span class="arrow">›</span><span part="header"></span></div>
        <div class="body" part="body"><slot></slot></div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定事件（render 与水合路径共用） */
  private bind(): void {
    this.shadow.querySelector('.head')?.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('oas-collapse-item-click', {
          detail: { item: this },
          bubbles: true,
          composed: true,
        }),
      )
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（item 骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.item')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.shadow.querySelector<HTMLElement>('[part="header"]')!.textContent = this.getAttr(
      'header',
      '',
    )
  }
}
