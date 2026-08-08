import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.display {
  display: inline-block;
  min-width: 60px;
  padding: 2px var(--oas-space-1);
  border: 1px solid transparent;
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  line-height: var(--oas-control-height-md);
}
.display:hover {
  background: var(--oas-color-bg-hover);
  border-color: var(--oas-color-border);
}
.display:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.display.placeholder {
  color: var(--oas-color-text-secondary);
}
:host([disabled]) .display {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
}
:host([disabled]) .display:hover {
  background: transparent;
  border-color: transparent;
}
.edit {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
}
.edit[hidden] {
  display: none;
}
input {
  appearance: none;
  box-sizing: border-box;
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  min-width: 140px;
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    box-shadow var(--oas-transition-fast) var(--oas-ease-out);
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
.action {
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  width: var(--oas-control-height-md);
  height: var(--oas-control-height-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--oas-radius-md);
  color: var(--oas-color-text-secondary);
  flex: none;
}
.action:hover:not(:disabled) {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
.action:disabled {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
}
.action:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.action.ok:hover:not(:disabled) {
  color: var(--oas-color-primary);
}
.action.cancel:hover:not(:disabled) {
  color: var(--oas-color-danger);
}
`

const OK_ICON = `
<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
  <path d="M3 8.5 L6.5 12 L13 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

const CANCEL_ICON = `
<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
  <path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
</svg>`

export class OASEditable extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'placeholder', 'disabled', 'submit-on-enter', 'maxlength']
  }

  private displayEl: HTMLElement | null = null
  private editEl: HTMLElement | null = null
  private inputEl: HTMLInputElement | null = null
  private editing = false

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <span class="display" part="display" role="button" tabindex="0"></span>
      <span class="edit" part="edit" hidden>
        <input part="field" />
        <button class="action ok" part="ok" type="button"></button>
        <button class="action cancel" part="cancel" type="button"></button>
      </span>
    `
    this.displayEl = this.shadow.querySelector('.display')
    this.editEl = this.shadow.querySelector('.edit')
    this.inputEl = this.shadow.querySelector('input')
    const okBtn = this.shadow.querySelector<HTMLButtonElement>('.ok')
    const cancelBtn = this.shadow.querySelector<HTMLButtonElement>('.cancel')

    this.displayEl?.addEventListener('click', () => this.enterEdit())
    this.displayEl?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        this.enterEdit()
      }
    })
    this.inputEl?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (this.submitOnEnter()) {
          e.preventDefault()
          this.submit()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        this.cancel()
      }
    })
    this.inputEl?.addEventListener('blur', (e: FocusEvent) => this.handleBlur(e))
    okBtn?.addEventListener('click', () => this.submit())
    cancelBtn?.addEventListener('click', () => this.cancel())
    this.update()
  }

  protected override update(): void {
    const displayEl = this.displayEl
    const inputEl = this.inputEl
    if (!displayEl || !inputEl) return
    const value = this.getAttr('value', '')
    const placeholder = this.getAttr('placeholder', '')
    const disabled = this.hasAttr('disabled')

    displayEl.textContent = value !== '' ? value : placeholder
    displayEl.classList.toggle('placeholder', value === '')
    displayEl.setAttribute('aria-label', this.t('editable.edit'))
    displayEl.setAttribute('aria-disabled', String(disabled))
    displayEl.tabIndex = disabled ? -1 : 0

    inputEl.placeholder = placeholder
    inputEl.disabled = disabled
    const ml = this.getAttr('maxlength', '')
    if (ml !== '') inputEl.maxLength = Number(ml)
    else inputEl.removeAttribute('maxlength')
    inputEl.setAttribute('aria-label', this.t('editable.edit'))

    const okBtn = this.shadow.querySelector<HTMLButtonElement>('.ok')
    const cancelBtn = this.shadow.querySelector<HTMLButtonElement>('.cancel')
    if (okBtn) {
      okBtn.disabled = disabled
      okBtn.setAttribute('aria-label', this.t('editable.submit'))
      okBtn.innerHTML = OK_ICON
    }
    if (cancelBtn) {
      cancelBtn.disabled = disabled
      cancelBtn.setAttribute('aria-label', this.t('editable.cancel'))
      cancelBtn.innerHTML = CANCEL_ICON
    }
  }

  private submitOnEnter(): boolean {
    return this.getAttr('submit-on-enter', 'true') !== 'false'
  }

  private enterEdit(): void {
    if (this.hasAttr('disabled')) return
    const inputEl = this.inputEl
    if (!inputEl) return
    this.editing = true
    if (this.displayEl) this.displayEl.hidden = true
    if (this.editEl) this.editEl.hidden = false
    inputEl.value = this.getAttr('value', '')
    inputEl.focus()
    inputEl.select()
  }

  private exitEdit(): void {
    this.editing = false
    if (this.editEl) this.editEl.hidden = true
    if (this.displayEl) this.displayEl.hidden = false
  }

  private submit(): void {
    if (!this.editing) return
    const oldValue = this.getAttr('value', '')
    const next = this.inputEl?.value ?? ''
    this.exitEdit()
    if (next === '') {
      // 默认非破坏：空值提交还原旧值并派发 oas-cancel
      this.emit('cancel', { value: oldValue })
      this.displayEl?.focus()
      return
    }
    if (next !== oldValue) {
      this.setAttribute('value', next)
      this.emit('change', { value: next })
    }
    this.displayEl?.focus()
  }

  private cancel(): void {
    if (!this.editing) return
    this.exitEdit()
    this.emit('cancel', { value: this.getAttr('value', '') })
    this.displayEl?.focus()
  }

  private handleBlur(e: FocusEvent): void {
    if (!this.editing) return
    const related = e.relatedTarget as Node | null
    // 焦点移到自身内部的确认/取消按钮时交给按钮 click，避免双重提交
    if (related && this.shadow.contains(related)) return
    this.submit()
  }
}
