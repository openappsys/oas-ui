import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
button {
  appearance: none;
  border: none;
  padding: 0;
  cursor: pointer;
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: var(--oas-color-bg-disabled);
  transition: background var(--oas-transition-base) var(--oas-ease-out);
  display: inline-block;
}
button[aria-checked='true'] {
  background: var(--oas-color-primary);
}
button:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
button[disabled] {
  cursor: not-allowed;
  opacity: 0.6;
}
.thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--oas-color-bg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: transform var(--oas-transition-base) var(--oas-ease-out);
}
button[aria-checked='true'] .thumb {
  transform: translateX(18px);
}
.spinner {
  position: absolute;
  right: 8px;
  width: 10px;
  height: 10px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: oas-spin 0.8s linear infinite;
  color: #fff;
}
button[aria-checked='false'] .spinner {
  color: var(--oas-color-text-secondary);
}
@keyframes oas-spin {
  to {
    transform: rotate(360deg);
  }
}
`

export class OASSwitch extends OASElement {
  static override get observedAttributes(): string[] {
    return ['checked', 'disabled', 'loading']
  }

  private btn: HTMLButtonElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <button part="switch" role="switch" aria-checked="false">
        <span class="thumb" part="thumb"></span>
        <span class="spinner" hidden></span>
      </button>
    `
    this.btn = this.shadow.querySelector('button')
    this.btn?.addEventListener('click', () => {
      if (this.hasAttr('disabled') || this.hasAttr('loading')) return
      const checked = !this.hasAttr('checked')
      this.toggleAttribute('checked', checked)
      this.emit('change', { checked })
    })
    this.update()
  }

  protected override update(): void {
    const btn = this.btn
    if (!btn) return
    const checked = this.hasAttr('checked')
    const disabled = this.hasAttr('disabled')
    const loading = this.hasAttr('loading')

    btn.setAttribute('aria-checked', String(checked))
    btn.disabled = disabled || loading
    const spinner = btn.querySelector<HTMLElement>('.spinner')
    if (spinner) spinner.hidden = !loading
  }
}
