import { OASElement } from '@oas-ui/core'

interface Option {
  label: string
  value: string
  disabled?: boolean
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  width: 220px;
}
.trigger {
  appearance: none;
  box-sizing: border-box;
  width: 100%;
  min-height: var(--oas-control-height-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2);
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  cursor: pointer;
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    box-shadow var(--oas-transition-fast) var(--oas-ease-out);
}
.trigger:hover {
  border-color: var(--oas-color-primary);
}
.trigger:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.trigger[aria-expanded='true'] {
  border-color: var(--oas-color-primary);
}
.trigger[disabled] {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
.value {
  display: flex;
  flex-wrap: wrap;
  gap: var(--oas-space-1);
  min-width: 0;
  text-align: left;
}
.placeholder {
  color: var(--oas-color-text-secondary);
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: var(--oas-color-bg-hover);
  border-radius: var(--oas-radius-sm);
  padding: 0 var(--oas-space-1);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-primary);
}
.chip button {
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0 2px;
  color: var(--oas-color-text-secondary);
  font-size: 1em;
  line-height: 1;
}
.chevron {
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
}
.trigger[aria-expanded='true'] .chevron {
  transform: rotate(180deg);
}
.dropdown {
  position: absolute;
  z-index: 10;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  padding: var(--oas-space-1);
  display: none;
}
.dropdown.open {
  display: block;
}
.listbox {
  max-height: 240px;
  overflow-y: auto;
}
.option {
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.option:hover {
  background: var(--oas-color-bg-hover);
}
.option.active {
  background: var(--oas-color-primary);
  color: #fff;
}
.option[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
.option .check {
  visibility: hidden;
}
.option[aria-selected='true'] .check {
  visibility: visible;
}
.empty {
  padding: var(--oas-space-3);
  text-align: center;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
`

export class OASSelect extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'placeholder', 'options', 'disabled', 'multiple', 'searchable']
  }

  private triggerEl: HTMLButtonElement | null = null
  private dropdown: HTMLElement | null = null
  private listbox: HTMLElement | null = null
  private options: Option[] = []
  private activeIndex = 0
  private openState = false

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="wrapper" part="wrapper">
        <button class="trigger" part="trigger" type="button" role="combobox"
          aria-haspopup="listbox" aria-expanded="false">
          <span class="value" part="value"></span>
          <svg class="chevron" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M4 6 L8 10 L12 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="dropdown" part="dropdown">
          <div class="listbox" part="listbox" role="listbox"></div>
        </div>
      </div>
    `
    this.triggerEl = this.shadow.querySelector('.trigger')
    this.dropdown = this.shadow.querySelector('.dropdown')
    this.listbox = this.shadow.querySelector('.listbox')

    this.triggerEl?.addEventListener('click', () => this.toggle())
    this.triggerEl?.addEventListener('keydown', (e: KeyboardEvent) => this.handleTriggerKey(e))
    this.onCleanup(() => document.removeEventListener('click', this.handleOutsideClick))
    this.update()
  }

  protected override update(): void {
    this.parseOptions()
    this.renderListbox()
    this.syncTrigger()
  }

  private toggle(): void {
    if (this.hasAttr('disabled')) return
    this.openState = !this.openState
    this.syncDropdown()
  }

  private syncDropdown(): void {
    if (!this.dropdown || !this.triggerEl) return
    this.dropdown.classList.toggle('open', this.openState)
    this.triggerEl.setAttribute('aria-expanded', String(this.openState))
    if (this.openState) {
      document.addEventListener('click', this.handleOutsideClick)
      const current = this.currentValues()
      const idx = current.length > 0 ? this.options.findIndex((o) => o.value === current[0]) : 0
      this.activeIndex = Math.max(idx, 0)
    } else {
      document.removeEventListener('click', this.handleOutsideClick)
    }
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.openState = false
    }
    this.syncDropdown()
  }

  private handleTriggerKey(e: KeyboardEvent): void {
    if (this.hasAttr('disabled')) return
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault()
      if (!this.openState) this.openState = true
      else if (e.key === 'ArrowDown') this.moveActive(1)
      this.syncDropdown()
    } else if (e.key === 'ArrowUp' && this.openState) {
      e.preventDefault()
      this.moveActive(-1)
    } else if (e.key === 'Escape') {
      this.openState = false
      this.syncDropdown()
    } else if (e.key === 'Enter' && this.openState) {
      e.preventDefault()
      this.selectActive()
    }
  }

  private moveActive(dir: 1 | -1): void {
    const n = this.options.length
    if (n === 0) return
    this.activeIndex = (this.activeIndex + dir + n) % n
    this.renderListbox()
  }

  private selectActive(): void {
    const option = this.options[this.activeIndex]
    if (!option || option.disabled) return
    this.selectValue(option.value)
  }

  private renderListbox(): void {
    const listbox = this.listbox
    if (!listbox) return
    listbox.innerHTML = ''
    if (this.options.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'empty'
      empty.textContent = '暂无数据'
      listbox.appendChild(empty)
      return
    }
    const values = this.currentValues()
    this.options.forEach((option, idx) => {
      const row = document.createElement('div')
      row.className = 'option'
      row.setAttribute('part', 'option')
      row.setAttribute('role', 'option')
      row.setAttribute('aria-selected', String(values.includes(option.value)))
      row.setAttribute('aria-disabled', String(option.disabled ?? false))
      if (idx === this.activeIndex) row.classList.add('active')
      const label = document.createElement('span')
      label.textContent = option.label
      const check = document.createElement('span')
      check.className = 'check'
      check.textContent = '✓'
      row.append(label, check)
      row.addEventListener('click', () => {
        if (option.disabled) return
        this.selectValue(option.value)
      })
      row.addEventListener('mousemove', () => {
        this.activeIndex = idx
        this.renderListbox()
      })
      listbox.appendChild(row)
    })
  }

  private selectValue(value: string): void {
    if (this.hasAttr('multiple')) {
      const current = this.currentValues()
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
      this.setAttribute('value', JSON.stringify(next))
      this.emit('change', { value: next })
    } else {
      this.setAttribute('value', value)
      this.emit('change', { value })
      this.openState = false
      this.syncDropdown()
    }
    this.syncTrigger()
    this.renderListbox()
  }

  private currentValues(): string[] {
    const raw = this.getAttr('value', this.hasAttr('multiple') ? '[]' : '')
    if (this.hasAttr('multiple')) {
      try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []
      } catch {
        return []
      }
    }
    return raw === '' ? [] : [raw]
  }

  private parseOptions(): void {
    try {
      const parsed = JSON.parse(this.getAttr('options', '[]'))
      this.options = Array.isArray(parsed)
        ? parsed.filter((o): o is Option => o && typeof o.value === 'string')
        : []
    } catch {
      this.options = []
    }
  }

  private syncTrigger(): void {
    if (!this.triggerEl) return
    const placeholder = this.getAttr('placeholder', '请选择')
    const disabled = this.hasAttr('disabled')
    const values = this.currentValues()
    const valueEl = this.triggerEl.querySelector<HTMLElement>('.value')!

    this.triggerEl.disabled = disabled

    if (values.length === 0) {
      valueEl.innerHTML = ''
      const ph = document.createElement('span')
      ph.className = 'placeholder'
      ph.textContent = placeholder
      valueEl.appendChild(ph)
      return
    }

    if (this.hasAttr('multiple')) {
      valueEl.innerHTML = ''
      for (const v of values) {
        const option = this.options.find((o) => o.value === v)
        const chip = document.createElement('span')
        chip.className = 'chip'
        const label = document.createElement('span')
        label.textContent = option?.label ?? v
        const rm = document.createElement('button')
        rm.setAttribute('aria-label', `移除 ${option?.label ?? v}`)
        rm.textContent = '×'
        rm.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation()
          this.selectValue(v)
        })
        chip.append(label, rm)
        valueEl.appendChild(chip)
      }
    } else {
      const value = values[0] ?? ''
      const option = this.options.find((o) => o.value === value)
      valueEl.textContent = option?.label ?? value
    }
  }
}
