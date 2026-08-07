import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}
input {
  appearance: none;
  box-sizing: border-box;
  width: 100%;
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-8, 56px) 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    box-shadow var(--oas-transition-fast) var(--oas-ease-out);
}
input:hover {
  border-color: var(--oas-color-primary);
}
input:focus {
  outline: none;
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}
input:disabled {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
.controls {
  position: absolute;
  right: 4px;
  display: flex;
  flex-direction: column;
  height: calc(100% - 8px);
}
button {
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  flex: 1;
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--oas-color-text-secondary);
  border-radius: 2px;
}
button:hover {
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg-hover);
}
button:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
button[disabled] {
  cursor: not-allowed;
  opacity: 0.5;
}
svg {
  width: 8px;
  height: 8px;
}
`

export class OASInputNumber extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'min', 'max', 'step', 'disabled', 'precision']
  }

  private input: HTMLInputElement | null = null
  private upBtn: HTMLButtonElement | null = null
  private downBtn: HTMLButtonElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <span class="wrapper" part="wrapper">
        <input part="input" type="number" />
        <span class="controls" part="controls">
          <button part="up" aria-label="增加"><svg viewBox="0 0 8 8" aria-hidden="true"><path d="M1 5.5 L4 2.5 L7 5.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <button part="down" aria-label="减少"><svg viewBox="0 0 8 8" aria-hidden="true"><path d="M1 2.5 L4 5.5 L7 2.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        </span>
      </span>
    `
    this.input = this.shadow.querySelector('input')
    this.upBtn = this.shadow.querySelector('button[part="up"]')
    this.downBtn = this.shadow.querySelector('button[part="down"]')

    this.input?.addEventListener('change', () => this.emitChange())
    this.upBtn?.addEventListener('click', () => this.step(1))
    this.downBtn?.addEventListener('click', () => this.step(-1))
    this.update()
  }

  protected override update(): void {
    const i = this.input
    if (!i) return
    const value = this.getAttr('value', '')
    const min = this.getAttr('min', '')
    const max = this.getAttr('max', '')
    const step = this.getAttr('step', '1')
    const disabled = this.hasAttr('disabled')

    if (i.value !== value) i.value = value
    i.min = min
    i.max = max
    i.step = step
    i.disabled = disabled
    this.syncControls()
  }

  private step(dir: 1 | -1): void {
    const i = this.input
    if (!i || this.hasAttr('disabled')) return
    const step = Number(i.step) || 1
    const current = Number(i.value) || 0
    const next = current + step * dir
    i.value = String(this.clamp(next))
    this.syncControls()
    this.emitChange()
  }

  private clamp(n: number): number {
    const min = this.getAttr('min', '')
    const max = this.getAttr('max', '')
    let v = n
    if (max !== '') v = Math.min(v, Number(max))
    if (min !== '') v = Math.max(v, Number(min))
    const precision = this.getAttr('precision', '')
    if (precision !== '') v = Number(v.toFixed(Number(precision)))
    return v
  }

  private emitChange(): void {
    this.emit('change', { value: Number(this.input?.value) || 0 })
  }

  private syncControls(): void {
    if (!this.upBtn || !this.downBtn || !this.input) return
    const disabled = this.hasAttr('disabled')
    const value = Number(this.input.value) || 0
    const max = this.getAttr('max', '')
    const min = this.getAttr('min', '')
    this.upBtn.disabled = disabled || (max !== '' && value >= Number(max))
    this.downBtn.disabled = disabled || (min !== '' && value <= Number(min))
  }
}
