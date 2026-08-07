import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
label {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-2);
  cursor: pointer;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
}
:host([disabled]) label {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
}
input {
  width: 16px;
  height: 16px;
  accent-color: var(--oas-color-primary);
  cursor: pointer;
  margin: 0;
}
input:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
:host([disabled]) input {
  cursor: not-allowed;
}
`

export class OASRadio extends OASElement {
  static override get observedAttributes(): string[] {
    return ['checked', 'disabled', 'value', 'name']
  }

  private input: HTMLInputElement | null = null
  private labelEl: HTMLLabelElement | null = null
  private inputId = ''

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <label part="label"><input part="radio" type="radio" /><slot></slot></label>
    `
    this.input = this.shadow.querySelector('input')
    this.labelEl = this.shadow.querySelector('label')
    this.inputId = `oas-radio-${crypto.randomUUID()}`

    this.input?.addEventListener('change', () => {
      this.toggleAttribute('checked', this.input!.checked)
      this.emit('change', { checked: this.input!.checked, value: this.getAttr('value', '') })
    })
    this.update()
  }

  protected override update(): void {
    const input = this.input
    if (!input) return
    const checked = this.hasAttr('checked')
    const disabled = this.hasAttr('disabled')
    const name = this.getAttr('name', '')

    input.checked = checked
    input.disabled = disabled
    input.name = name
    input.setAttribute('aria-checked', String(checked))

    input.id = this.inputId
    if (this.labelEl) this.labelEl.setAttribute('for', this.inputId)
  }
}
