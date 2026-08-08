import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
button {
  appearance: none;
  box-sizing: border-box;
  min-height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-4);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  cursor: pointer;
  transition: background var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out),
    color var(--oas-transition-fast) var(--oas-ease-out);
}
button:hover {
  border-color: var(--oas-color-primary);
}
button:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
button[aria-pressed='true'] {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
button[disabled] {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
  border-color: var(--oas-color-border);
}
`

export class OASToggleButton extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'pressed', 'disabled']
  }

  private btn: HTMLButtonElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <button part="button" type="button" role="button" aria-pressed="false">
        <slot></slot>
      </button>
    `
    this.btn = this.shadow.querySelector('button')
    this.btn?.addEventListener('click', () => this.toggle())
    this.update()
  }

  protected override update(): void {
    const btn = this.btn
    if (!btn) return
    const pressed = this.hasAttr('pressed')
    btn.setAttribute('aria-pressed', String(pressed))
    btn.disabled = this.hasAttr('disabled')
  }

  private toggle(): void {
    if (this.hasAttr('disabled')) return
    const pressed = !this.hasAttr('pressed')
    this.toggleAttribute('pressed', pressed)
    this.emit('change', { value: this.getAttr('value', ''), pressed })
  }
}
