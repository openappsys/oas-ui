import { OASElement } from '@oas-ui/core'

export class OASTimelineItem extends OASElement {
  static override get observedAttributes(): string[] {
    return ['time', 'color', 'pending']
  }

  protected override render(): void {
    this.shadow.innerHTML = `<slot></slot>`
  }
}
