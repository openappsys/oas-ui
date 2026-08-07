import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
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

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="item" part="item">
        <div class="head" part="head"><span class="arrow">›</span><span part="header"></span></div>
        <div class="body" part="body"><slot></slot></div>
      </div>
    `
    this.shadow.querySelector('.head')?.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('oas-collapse-item-click', {
          detail: { item: this },
          bubbles: true,
          composed: true,
        }),
      )
    })
    this.update()
  }

  protected override update(): void {
    this.shadow.querySelector<HTMLElement>('[part="header"]')!.textContent = this.getAttr('header', '')
  }
}
