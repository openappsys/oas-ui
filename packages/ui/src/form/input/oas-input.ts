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
  width: 100%;
}
input {
  appearance: none;
  box-sizing: border-box;
  width: 100%;
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-3);
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
input:disabled:hover {
  border-color: var(--oas-color-border);
}
.clear-btn {
  position: absolute;
  right: var(--oas-space-2);
  appearance: none;
  border: none;
  background: transparent;
  padding: 2px;
  cursor: pointer;
  color: var(--oas-color-text-secondary);
  display: inline-flex;
  border-radius: 50%;
}
.clear-btn:hover {
  color: var(--oas-color-text-primary);
}
.clear-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* hidden 属性需要显式覆盖 display（避免 class 的 display 优先级压过 UA 的 [hidden] 规则） */
.clear-btn[hidden] {
  display: none;
}
`

export class OASInput extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'placeholder', 'type', 'disabled', 'readonly', 'clearable', 'label']
  }

  private inputEl: HTMLInputElement | null = null
  private clearBtn: HTMLButtonElement | null = null

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <span class="wrapper" part="wrapper">
        <input part="input" />
        <button class="clear-btn" part="clear" hidden>
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
            <path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </span>
    `
    this.inputEl = this.shadow.querySelector('input')
    this.clearBtn = this.shadow.querySelector('.clear-btn')

    this.inputEl?.addEventListener('input', () => {
      this.emit('input', { value: this.inputEl!.value })
      this.syncClearVisibility()
    })
    this.clearBtn?.addEventListener('click', () => {
      if (!this.inputEl) return
      this.inputEl.value = ''
      this.emit('clear', { originalEvent: new MouseEvent('click') })
      this.inputEl.focus()
      this.syncClearVisibility()
    })
    this.update()
  }

  protected override update(): void {
    const i = this.inputEl
    if (!i) return
    const value = this.getAttr('value', '')
    const placeholder = this.getAttr('placeholder', '')
    const type = this.getAttr('type', 'text')
    const disabled = this.hasAttr('disabled')
    const readonly = this.hasAttr('readonly')

    if (i.value !== value) i.value = value
    i.placeholder = placeholder
    i.type = type
    i.disabled = disabled
    i.readOnly = readonly
    // 内置文案走 locale registry（label/placeholder 属性优先，setLocale 切换自动刷新）
    i.setAttribute('aria-label', this.getAttr('label', placeholder) || this.t('input.defaultLabel'))
    if (this.clearBtn) {
      this.clearBtn.setAttribute('aria-label', this.t('input.clear'))
      this.clearBtn.hidden = !this.shouldShowClear()
    }
  }

  private shouldShowClear(): boolean {
    return (
      this.hasAttr('clearable') &&
      !this.hasAttr('disabled') &&
      !this.hasAttr('readonly') &&
      this.inputEl !== null &&
      this.inputEl.value !== ''
    )
  }

  private syncClearVisibility(): void {
    if (!this.clearBtn || !this.inputEl) return
    this.clearBtn.hidden = !this.shouldShowClear()
  }
}
