import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: flex;
  align-items: center;
  gap: var(--oas-space-3);
  padding: var(--oas-space-3) var(--oas-space-4);
  font-family: inherit;
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

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="main" part="main">
        <div class="title" part="title"></div>
        <div class="desc" part="desc"><slot name="description"><slot></slot></slot></div>
      </div>
      <div class="extra"><slot name="extra"></slot></div>
    `
    this.update()
  }

  protected override update(): void {
    this.shadow.querySelector<HTMLElement>('[part="title"]')!.textContent = this.getAttr(
      'title',
      '',
    )
  }
}
