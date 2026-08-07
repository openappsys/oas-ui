import { OASElement } from '@oas-ui/core'

export class OASDescriptionsItem extends OASElement {
  static override get observedAttributes(): string[] {
    return ['label']
  }

  protected override render(): void {
    this.shadow.innerHTML = `<slot></slot>`
  }
}
