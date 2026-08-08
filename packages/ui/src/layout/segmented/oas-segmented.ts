import { OASElement } from '@oas-ui/core'

export interface SegmentedOption {
  label: string
  value: string
  disabled?: boolean
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.group {
  display: inline-flex;
  padding: var(--oas-space-1);
  background: var(--oas-color-bg-hover);
  border-radius: var(--oas-radius-md);
  gap: var(--oas-space-1);
}
.item {
  padding: var(--oas-space-1) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
  color: var(--oas-color-text-secondary);
  border: none;
  background: none;
  font-family: inherit;
  height: var(--oas-control-height-sm);
}
.item[aria-checked='true'] {
  background: var(--oas-color-bg-elevated);
  color: var(--oas-color-text-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  font-weight: 500;
}
.item[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
`

export class OASSegmented extends OASElement {
  static override get observedAttributes(): string[] {
    return ['options', 'value']
  }

  private optionsList: SegmentedOption[] = []

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="group" part="group" role="radiogroup"></div>
    `
    this.update()
  }

  protected override update(): void {
    this.parseOptions()
    const group = this.shadow.querySelector('.group')
    if (!group) return
    group.innerHTML = ''
    let value = this.getAttr('value', '')
    if (value === '' && this.optionsList.length > 0) value = this.optionsList[0]!.value
    for (const option of this.optionsList) {
      const btn = document.createElement('button')
      btn.className = 'item'
      btn.setAttribute('part', 'item')
      btn.setAttribute('role', 'radio')
      btn.setAttribute('aria-checked', String(option.value === value))
      btn.setAttribute('aria-disabled', String(option.disabled ?? false))
      btn.type = 'button'
      btn.textContent = option.label
      btn.addEventListener('click', () => {
        if (option.disabled) return
        this.setAttribute('value', option.value)
        this.emit('change', { value: option.value })
        this.update()
      })
      group.appendChild(btn)
    }
  }

  private parseOptions(): void {
    try {
      const parsed = JSON.parse(this.getAttr('options', '[]'))
      this.optionsList = Array.isArray(parsed)
        ? parsed.filter((o): o is SegmentedOption => o && typeof o.value === 'string')
        : []
    } catch {
      this.optionsList = []
    }
  }
}
