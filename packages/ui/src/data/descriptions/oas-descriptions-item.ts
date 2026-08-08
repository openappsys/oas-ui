import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  font-family: inherit;
  font-size: var(--oas-font-size-md);
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

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="label" part="label"></div>
      <div class="content" part="content"><slot></slot></div>
    `
    this.update()
  }

  protected override update(): void {
    this.shadow.querySelector<HTMLElement>('[part="label"]')!.textContent = this.getAttr(
      'label',
      '',
    )
  }
}
