import { OASElement } from '@oas-ui/core'
import { formatToken, resolveLocale } from '../calendar/date-grid.js'

const STYLE = `
:host {
  display: inline-block;
  position: relative;
  font-family: inherit;
  width: 180px;
}
[part='trigger'] {
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
[part='trigger']:hover {
  border-color: var(--oas-color-primary);
}
[part='trigger']:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
[part='trigger'][aria-expanded='true'] {
  border-color: var(--oas-color-primary);
}
[part='trigger'][disabled] {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
.value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.value.placeholder {
  color: var(--oas-color-text-secondary);
}
.chevron {
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
}
[part='trigger'][aria-expanded='true'] .chevron {
  transform: rotate(180deg);
}
[part='dropdown'] {
  position: absolute;
  z-index: calc(var(--oas-z-index-base, 0) + 10);
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--oas-color-overlay) 25%, transparent);
  padding: var(--oas-space-2);
  display: none;
}
[part='dropdown'].open {
  display: block;
}
.columns {
  display: flex;
  gap: var(--oas-space-1);
  max-height: 220px;
}
.column {
  flex: 1;
  overflow-y: auto;
  border-right: 1px solid var(--oas-color-border);
}
.column:last-child {
  border-right: none;
}
.option {
  appearance: none;
  display: block;
  width: 100%;
  border: none;
  background: transparent;
  padding: var(--oas-space-1) 0;
  text-align: center;
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  color: var(--oas-color-text-primary);
  cursor: pointer;
  border-radius: var(--oas-radius-sm);
}
.option:hover {
  background: var(--oas-color-bg-hover);
}
.option:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
.option.selected {
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
.option.selected:hover {
  background: var(--oas-color-primary-hover);
}
`

type TimeUnit = 'h' | 'm' | 's'

interface TimeParts {
  h: number
  m: number
  s: number
}

function parseTime(value: string): TimeParts | null {
  const m = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/.exec(value)
  if (!m) return null
  return { h: Number(m[1]), m: Number(m[2]), s: Number(m[3] ?? 0) }
}

function pad(v: number): string {
  return String(v).padStart(2, '0')
}

export class OASTimePicker extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'format', 'step', 'disabled', 'disabled-skip']
  }

  private triggerEl: HTMLButtonElement | null = null
  private dropdown: HTMLElement | null = null
  private columnsEl: HTMLElement | null = null
  private openState = false
  private parts: TimeParts = { h: 0, m: 0, s: 0 }
  private committedValue = ''
  private activeColumn = 0
  private units: TimeUnit[] = ['h', 'm', 's']

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致（快照不含弹出面板内容） */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="picker" part="picker">
        <button class="trigger" part="trigger" type="button" role="combobox"
          aria-haspopup="listbox" aria-expanded="false">
          <span class="value"></span>
          <svg class="chevron" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M4 6 L8 10 L12 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="dropdown" part="dropdown">
          <div class="columns" part="columns"></div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定触发器/面板/外部点击事件（render 与水合路径共用） */
  private bind(): void {
    this.triggerEl = this.shadow.querySelector<HTMLButtonElement>('[part="trigger"]')
    this.dropdown = this.shadow.querySelector<HTMLElement>('[part="dropdown"]')
    this.columnsEl = this.shadow.querySelector<HTMLElement>('[part="columns"]')
    this.triggerEl?.addEventListener('click', () => this.toggle())
    this.triggerEl?.addEventListener('keydown', (e) => this.handleTriggerKey(e as KeyboardEvent))
    // 面板内点击不触发「外部点击确认」：选项点击会重渲列 DOM
    this.dropdown?.addEventListener('click', (e) => e.stopPropagation())
    this.dropdown?.addEventListener('keydown', (e) => this.handleDropdownKey(e as KeyboardEvent))
    this.onCleanup(() => document.removeEventListener('click', this.handleOutsideClick, true))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（trigger/dropdown/columns 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="trigger"]')) return false
    if (!this.shadow.querySelector('[part="dropdown"]')) return false
    if (!this.shadow.querySelector('[part="columns"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    const format = this.getAttr('format', 'HH:mm:ss')
    this.units = this.parseUnits(format)
    // 面板打开时外部 value 变化需同步内部 parts（受控模式下改属性即时反映）
    if (this.openState) {
      const parsed = parseTime(this.getAttr('value', ''))
      if (parsed) this.parts = parsed
    }
    this.syncTrigger()
    if (this.openState) this.renderColumns(false)
  }

  private toggle(): void {
    if (this.injectDisabled()) return
    if (this.openState) this.cancel()
    else this.open()
  }

  private open(): void {
    const parsed = parseTime(this.getAttr('value', ''))
    this.parts = parsed ?? { h: 0, m: 0, s: 0 }
    this.committedValue = this.getAttr('value', '00:00:00') || '00:00:00'
    this.activeColumn = 0
    this.openState = true
    this.syncDropdown()
    this.renderColumns(true)
  }

  private cancel(): void {
    const parsed = parseTime(this.committedValue)
    if (parsed) this.parts = parsed
    this.close()
  }

  private close(): void {
    this.openState = false
    this.syncDropdown()
  }

  private confirm(): void {
    const value = this.formatParts()
    if (value !== this.committedValue) {
      this.setAttribute('value', value)
      this.emit('change', { value })
    }
    this.close()
    this.syncTrigger()
  }

  private syncDropdown(): void {
    if (!this.dropdown || !this.triggerEl) return
    this.dropdown.classList.toggle('open', this.openState)
    this.triggerEl.setAttribute('aria-expanded', String(this.openState))
    if (this.openState) {
      document.addEventListener('click', this.handleOutsideClick, true)
    } else {
      document.removeEventListener('click', this.handleOutsideClick, true)
    }
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.confirm()
    }
  }

  private handleTriggerKey(e: KeyboardEvent): void {
    if (this.injectDisabled()) return
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault()
      if (!this.openState) this.open()
      else if (e.key === 'ArrowDown') this.moveColumn(1)
    } else if (e.key === 'Escape' && this.openState) {
      e.preventDefault()
      this.cancel()
    }
  }

  private handleDropdownKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      this.adjustActive(e.key === 'ArrowUp' ? 1 : -1)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      this.moveColumn(e.key === 'ArrowRight' ? 1 : -1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      this.confirm()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      this.cancel()
    }
  }

  private adjustActive(delta: 1 | -1): void {
    const unit = this.units[this.activeColumn]
    if (!unit) return
    const options = this.unitOptions(unit)
    const idx = options.indexOf(this.parts[unit])
    const next = options[(idx + delta + options.length) % options.length]
    if (next !== undefined) this.parts[unit] = next
    this.renderColumns(true)
  }

  private moveColumn(dir: 1 | -1): void {
    const n = this.units.length
    this.activeColumn = (this.activeColumn + dir + n) % n
    this.renderColumns(true)
  }

  private unitOptions(unit: TimeUnit): number[] {
    if (unit === 'h') return Array.from({ length: 24 }, (_, i) => i)
    if (unit === 'm') {
      const step = Math.max(1, Number(this.getAttr('step', '1')) || 1)
      const out: number[] = []
      for (let v = 0; v < 60; v += step) out.push(v)
      return out
    }
    return Array.from({ length: 60 }, (_, i) => i)
  }

  private parseUnits(format: string): TimeUnit[] {
    const units: TimeUnit[] = []
    if (/H/.test(format)) units.push('h')
    if (/m/.test(format)) units.push('m')
    if (/s/.test(format)) units.push('s')
    return units.length > 0 ? units : ['h', 'm', 's']
  }

  private unitLabel(unit: TimeUnit): string {
    if (unit === 'h') return this.t('timePicker.hour')
    if (unit === 'm') return this.t('timePicker.minute')
    return this.t('timePicker.second')
  }

  private renderColumns(focusNow: boolean): void {
    const cols = this.columnsEl
    if (!cols) return
    cols.innerHTML = ''
    for (let i = 0; i < this.units.length; i++) {
      const unit = this.units[i]!
      const col = document.createElement('div')
      col.className = 'column'
      col.setAttribute('role', 'listbox')
      col.setAttribute('aria-label', this.unitLabel(unit))
      const options = this.unitOptions(unit)
      for (const v of options) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'option'
        btn.setAttribute('role', 'option')
        btn.setAttribute('aria-selected', String(v === this.parts[unit]))
        btn.textContent = pad(v)
        btn.setAttribute('data-value', String(v))
        btn.tabIndex = v === this.parts[unit] ? 0 : -1
        if (v === this.parts[unit]) btn.classList.add('selected')
        btn.addEventListener('click', () => {
          this.parts[unit] = v
          this.activeColumn = i
          this.renderColumns(true)
        })
        col.appendChild(btn)
      }
      cols.appendChild(col)
    }
    if (focusNow) {
      const selected = this.shadow.querySelectorAll<HTMLElement>('.column')[this.activeColumn]
      const option = selected?.querySelector<HTMLButtonElement>('.option.selected')
      option?.focus()
      option?.scrollIntoView?.({ block: 'center' })
    }
  }

  private formatParts(): string {
    return `${pad(this.parts.h)}:${pad(this.parts.m)}:${pad(this.parts.s)}`
  }

  private syncTrigger(): void {
    const triggerEl = this.triggerEl
    if (!triggerEl) return
    triggerEl.disabled = this.injectDisabled()
    const valueEl = this.shadow.querySelector<HTMLElement>('.value')
    if (!valueEl) return
    const value = this.getAttr('value', '')
    const format = this.getAttr('format', 'HH:mm:ss')
    if (!value) {
      valueEl.textContent = this.t('timePicker.placeholder')
      valueEl.classList.add('placeholder')
      triggerEl.setAttribute('aria-label', this.t('timePicker.placeholder'))
      return
    }
    const parsed = parseTime(value)
    const date = new Date(2000, 0, 1, parsed?.h ?? 0, parsed?.m ?? 0, parsed?.s ?? 0)
    const text = formatToken(date, format, resolveLocale(this))
    valueEl.textContent = text
    valueEl.classList.remove('placeholder')
    triggerEl.setAttribute('aria-label', text)
  }
}
