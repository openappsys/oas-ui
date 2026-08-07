import { OASElement } from '@oas-ui/core'
import type { OASRadio } from './oas-radio.js'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
fieldset {
  border: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
legend {
  padding: 0;
  margin-bottom: var(--oas-space-1);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
`

export class OASRadioGroup extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'disabled']
  }

  private items: OASRadio[] = []
  private groupName = `oas-radio-group-${crypto.randomUUID()}`

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <fieldset part="group">
        <legend part="legend"><slot name="label"></slot></legend>
        <slot></slot>
      </fieldset>
    `
    const slot = this.shadow.querySelector('slot:not([name])')
    slot?.addEventListener('slotchange', () => this.collect())
    this.collect()
  }

  protected override update(): void {
    this.collect()
  }

  private collect(): void {
    const value = this.getAttr('value', '')
    const disabled = this.hasAttr('disabled')
    this.items = [...this.querySelectorAll('oas-radio')] as OASRadio[]
    for (const r of this.items) {
      r.setAttribute('name', this.groupName)
      r.toggleAttribute('checked', r.getAttribute('value') === value)
      r.toggleAttribute('disabled', disabled)
      r.addEventListener('oas-change', this.handleItemChange)
    }
  }

  private handleItemChange = (e: Event): void => {
    const r = e.target as OASRadio
    if (!this.contains(r)) return
    if (!r.hasAttribute('checked')) return
    const value = r.getAttribute('value') ?? ''
    this.setAttribute('value', value)
    this.emit('change', { value })
  }
}
