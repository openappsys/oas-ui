import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  width: 100%;
  min-width: 120px;
}
input {
  appearance: none;
  width: 100%;
  height: 20px;
  margin: 0;
  background: transparent;
  cursor: pointer;
}
input::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 2px;
  background: var(--oas-color-border);
}
input::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  margin-top: -5px;
  background: var(--oas-color-primary);
  border: none;
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
}
input::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}
input:focus-visible {
  outline: none;
}
input:focus-visible::-webkit-slider-thumb {
  box-shadow: var(--oas-focus-ring);
}
input:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
`

export class OASSlider extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'min', 'max', 'step', 'disabled']
  }

  private input: HTMLInputElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <input part="track" type="range" />
    `
    this.input = this.shadow.querySelector('input')
    this.input?.addEventListener('input', () => {
      this.emit('input', { value: Number(this.input!.value) })
    })
    this.input?.addEventListener('change', () => {
      this.emit('change', { value: Number(this.input!.value) })
    })
    this.update()
  }

  protected override update(): void {
    const input = this.input
    if (!input) return
    const value = this.getAttr('value', '')
    const min = this.getAttr('min', '0')
    const max = this.getAttr('max', '100')
    const step = this.getAttr('step', '1')
    const disabled = this.hasAttr('disabled')

    if (input.value !== value) input.value = value
    input.min = min
    input.max = max
    input.step = step
    input.disabled = disabled
  }
}
