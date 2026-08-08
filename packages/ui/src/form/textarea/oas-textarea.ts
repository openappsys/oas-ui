import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
textarea {
  appearance: none;
  box-sizing: border-box;
  width: 100%;
  min-height: var(--oas-control-height-md);
  padding: var(--oas-space-2) var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  line-height: 1.5;
  resize: none;
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    box-shadow var(--oas-transition-fast) var(--oas-ease-out);
}
textarea:hover {
  border-color: var(--oas-color-primary);
}
textarea:focus {
  outline: none;
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}
:host([aria-invalid='true']) textarea {
  border-color: var(--oas-color-danger);
}
:host([aria-invalid='true']) textarea:focus {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
textarea:disabled {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
textarea:disabled:hover {
  border-color: var(--oas-color-border);
}
`

export class OASTextarea extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'placeholder', 'rows', 'resize', 'disabled', 'readonly']
  }

  private ta: HTMLTextAreaElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <textarea part="textarea"></textarea>
    `
    this.ta = this.shadow.querySelector('textarea')
    this.ta?.addEventListener('input', () => {
      this.emit('input', { value: this.ta!.value })
      this.autoGrow()
    })
    this.update()
  }

  protected override update(): void {
    const t = this.ta
    if (!t) return
    const value = this.getAttr('value', '')
    const placeholder = this.getAttr('placeholder', '')
    const rows = Number(this.getAttr('rows', '3')) || 3
    const resize = this.getAttr('resize', '')
    const disabled = this.hasAttr('disabled')
    const readonly = this.hasAttr('readonly')

    if (t.value !== value) t.value = value
    t.placeholder = placeholder
    t.rows = rows
    t.style.resize = resize
    t.disabled = disabled
    t.readOnly = readonly
  }

  private autoGrow(): void {
    if (!this.ta || !this.hasAttr('auto-height')) return
    this.ta.style.height = 'auto'
    this.ta.style.height = `${this.ta.scrollHeight}px`
  }
}
