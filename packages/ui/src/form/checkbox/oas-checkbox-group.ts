import { OASElement } from '@oas-ui/core'
import type { OASCheckbox } from './oas-checkbox.js'

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

export class OASCheckboxGroup extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'disabled']
  }

  private items: OASCheckbox[] = []

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
    const disabled = this.hasAttr('disabled')
    const values = this.parseValue()
    this.items = [...this.querySelectorAll('oas-checkbox')] as OASCheckbox[]
    for (const cb of this.items) {
      cb.toggleAttribute('checked', values.includes(cb.getAttribute('value') ?? ''))
      cb.toggleAttribute('disabled', disabled)
      cb.addEventListener('oas-change', this.handleItemChange)
    }
  }

  private handleItemChange = (e: Event): void => {
    const cb = e.target as OASCheckbox
    if (!this.contains(cb)) return
    const value = cb.getAttribute('value') ?? ''
    const current = new Set(this.parseValue())
    if (cb.hasAttribute('checked')) current.add(value)
    else current.delete(value)
    this.setAttribute('value', JSON.stringify([...current]))
    this.emit('change', { value: [...current] })
  }

  private parseValue(): string[] {
    const raw = this.getAttr('value', '[]')
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []
    } catch {
      return []
    }
  }
}
