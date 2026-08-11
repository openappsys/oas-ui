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
      const checked = this.input!.checked
      this.toggleAttribute('checked', checked)
      // 原生 radio 的同名互斥只在同一 shadow root 内生效；每个 oas-radio 的 input 位于各自 shadow，
      // 需在 host 层（light DOM）按 name 全文档互斥，避免同名 radio 同时选中
      if (checked) this.excludeSameName()
      this.emit('change', { checked, value: this.getAttr('value', '') })
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

  /** label 点击聚焦委托：把焦点交给 shadow 内原生 radio（配合 oas-form-item 的 label 点击代理） */
  override focus(options?: FocusOptions): void {
    this.shadow.querySelector<HTMLInputElement>('input')?.focus(options)
  }

  /**
   * 同名 radio 互斥：本项选中时，清掉文档内所有同 name（非空）的其他 oas-radio。
   * oas-radio-group 会给子项统一分配唯一的组内 name，因此这里按 name 匹配天然兼容
   * 组内互斥逻辑，不会跨组误伤。
   */
  private excludeSameName(): void {
    const name = this.getAttr('name', '')
    if (name === '') return
    for (const other of document.querySelectorAll('oas-radio')) {
      if (other === this) continue
      if (other.getAttribute('name') !== name) continue
      other.removeAttribute('checked')
      const input = other.shadowRoot?.querySelector('input')
      if (input) input.checked = false
    }
  }
}
