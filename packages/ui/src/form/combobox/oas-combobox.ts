import { OASElement } from '@oas-ui/core'
import { computePosition, type Placement } from '../../overlay/floating/index.js'

interface Option {
  label: string
  value: string
  disabled?: boolean
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  width: 240px;
}
.wrapper {
  position: relative;
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
:host([aria-invalid='true']) input {
  border-color: var(--oas-color-danger);
}
:host([aria-invalid='true']) input:focus {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
input:disabled {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
input:disabled:hover {
  border-color: var(--oas-color-border);
}
/* clearable 时给清空按钮让位 */
:host([clearable]) input {
  padding-right: var(--oas-space-8, 40px);
}
.clear-btn {
  position: absolute;
  right: var(--oas-space-2);
  top: 50%;
  transform: translateY(-50%);
  appearance: none;
  border: none;
  background: transparent;
  padding: 2px;
  cursor: pointer;
  color: var(--oas-color-text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  z-index: 2;
}
.clear-btn:hover {
  color: var(--oas-color-text-primary);
}
.clear-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.clear-btn[hidden] {
  display: none;
}
.clear-btn svg {
  width: 12px;
  height: 12px;
  display: block;
}
/* 复用浮层定位引擎：position: fixed + computePosition 锚定 input 下方，空间不足自动翻转避让 */
.dropdown {
  position: fixed;
  z-index: var(--oas-z-dropdown, 1000);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--oas-color-overlay) 24%, transparent);
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
}
.option:hover,
.option.active {
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
.option[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
.empty {
  padding: var(--oas-space-3);
  text-align: center;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
`

export class OASCombobox extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'placeholder', 'options', 'disabled', 'clearable', 'loading', 'filterable']
  }

  private input: HTMLInputElement | null = null
  private dropdown: HTMLElement | null = null
  private listbox: HTMLElement | null = null
  private clearBtn: HTMLButtonElement | null = null
  private _options: Option[] = []

  /** Vue/React 会把 options 识别为实例属性走 property 赋值；setter 反射到 attribute 统一解析链路 */
  get options(): Option[] {
    return this._options
  }
  set options(value: Option[] | string) {
    this.setAttribute('options', typeof value === 'string' ? value : JSON.stringify(value))
  }

  private activeIndex = 0
  private openState = false
  /** 用户正在输入的过滤词（未选中前不覆盖受控 value，失焦/Esc 回退为选中项 label） */
  private query = ''

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="wrapper" part="wrapper">
        <input part="input" role="combobox" aria-haspopup="listbox" aria-autocomplete="list"
          aria-expanded="false" aria-controls="combobox-list" autocomplete="off" />
        <button class="clear-btn" part="clear" type="button" hidden aria-label="">
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <div class="dropdown" part="dropdown">
          <div class="listbox" part="listbox" role="listbox" id="combobox-list"></div>
        </div>
      </div>
    `
    this.input = this.shadow.querySelector('input')
    this.dropdown = this.shadow.querySelector('.dropdown')
    this.listbox = this.shadow.querySelector('.listbox')
    this.clearBtn = this.shadow.querySelector('.clear-btn')

    this.input?.addEventListener('focus', () => this.open())
    this.input?.addEventListener('blur', () => this.handleBlur())
    this.input?.addEventListener('input', () => this.handleInput())
    this.input?.addEventListener('keydown', (e: KeyboardEvent) => this.handleKey(e))
    // 点击面板/清空按钮不触发 input blur：mousedown 里 preventDefault 阻止默认失焦
    this.dropdown?.addEventListener('mousedown', (e: MouseEvent) => e.preventDefault())
    this.dropdown?.addEventListener('click', (e: MouseEvent) => {
      const row = (e.target as Element).closest('[role="option"]')
      if (!row) return
      const idx = Number(row.getAttribute('data-index'))
      this.selectByIndex(idx)
    })
    this.clearBtn?.addEventListener('mousedown', (e: MouseEvent) => e.preventDefault())
    this.clearBtn?.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation()
      this.clearValue()
    })
    this.onCleanup(() => document.removeEventListener('click', this.handleOutsideClick))
    this.update()
  }

  protected override update(): void {
    this.parseOptions()
    const i = this.input
    if (!i) return
    const placeholder = this.getAttr('placeholder', this.t('select.placeholder'))
    const disabled = this.hasAttr('disabled')
    const value = this.getAttr('value', '')

    i.placeholder = placeholder
    i.disabled = disabled
    i.setAttribute('aria-label', placeholder)
    // 受控 value 外部变化回填 label：仅未展开且未输入时覆盖（避免打断正在输入/过滤）
    if (!this.openState && this.query === '') {
      const label = this.labelOf(value)
      if (i.value !== label) i.value = label
    }
    if (this.clearBtn) {
      this.clearBtn.setAttribute('aria-label', this.t('input.clear'))
      this.clearBtn.hidden = !(this.hasAttr('clearable') && !disabled && value !== '')
    }
    // 展开时同步渲染：options / loading / locale 文案变化即时反映
    if (this.openState) this.renderListbox()
  }

  /** 当前 value 对应的选项 label（无匹配项时回退原始 value，无值回空串） */
  private labelOf(value: string): string {
    if (value === '') return ''
    return this._options.find((o) => o.value === value)?.label ?? value
  }

  private parseOptions(): void {
    try {
      const parsed = JSON.parse(this.getAttr('options', '[]'))
      this._options = Array.isArray(parsed)
        ? parsed.filter((o): o is Option => o && typeof o.value === 'string')
        : []
    } catch {
      this._options = []
    }
  }

  /** filterable 默认 true：属性缺失或空值都视为可过滤，仅 filterable="false" 关闭本地过滤 */
  private isFilterable(): boolean {
    return this.getAttr('filterable', 'true') !== 'false'
  }

  private visibleOptions(): Option[] {
    if (!this.isFilterable()) return this._options
    const q = this.query.trim().toLowerCase()
    if (q === '') return this._options
    return this._options.filter((o) => o.label.toLowerCase().includes(q))
  }

  private open(): void {
    if (this.hasAttr('disabled')) return
    this.openState = true
    // 高亮当前选中项（可见列表内），否则回到首项
    const value = this.getAttr('value', '')
    const idx = this.visibleOptions().findIndex((o) => o.value === value)
    this.activeIndex = Math.max(idx, 0)
    this.renderListbox()
    document.addEventListener('click', this.handleOutsideClick)
  }

  private close(): void {
    this.openState = false
    this.syncDropdown()
    document.removeEventListener('click', this.handleOutsideClick)
  }

  /** 失焦/Esc/点击外部时回退为当前选中项 label（默认非破坏），并丢弃未提交的过滤词 */
  private handleBlur(): void {
    if (this.hasAttr('disabled')) return
    this.revert()
    this.close()
  }

  private revert(): void {
    if (!this.input) return
    this.query = ''
    this.input.value = this.labelOf(this.getAttr('value', ''))
  }

  private handleInput(): void {
    if (!this.input) return
    this.query = this.input.value
    this.emit('input', { value: this.query })
    // 输入视为展开交互（焦点必然在输入框）
    this.openState = true
    this.activeIndex = 0
    this.renderListbox()
  }

  private handleKey(e: KeyboardEvent): void {
    if (this.hasAttr('disabled')) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.moveActive(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.moveActive(-1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      this.selectActive()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      this.revert()
      this.close()
    }
  }

  private moveActive(dir: 1 | -1): void {
    const n = this.visibleOptions().length
    if (n === 0) return
    this.activeIndex = (this.activeIndex + dir + n) % n
    this.renderListbox()
  }

  private selectActive(): void {
    const option = this.visibleOptions()[this.activeIndex]
    if (option && !option.disabled) this.selectValue(option)
  }

  private selectByIndex(idx: number): void {
    const option = this.visibleOptions()[idx]
    if (option && !option.disabled) this.selectValue(option)
  }

  /** 选中：value 置 option.value（受控属性）、输入框显示 label、关闭下拉并派发 oas-change */
  private selectValue(option: Option): void {
    this.query = ''
    this.openState = false
    this.setAttribute('value', option.value)
    if (this.input) this.input.value = option.label
    this.emit('change', { value: option.value })
    this.syncDropdown()
  }

  /** clearable：清空 value 并派发 oas-clear（detail 为被清空前的值）+ oas-change（空值） */
  private clearValue(): void {
    if (this.hasAttr('disabled')) return
    const prev = this.getAttr('value', '')
    this.query = ''
    this.openState = false
    this.removeAttribute('value')
    if (this.input) {
      this.input.value = ''
      this.input.focus()
    }
    this.emit('clear', { value: prev })
    this.emit('change', { value: '' })
    this.syncDropdown()
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.revert()
      this.close()
    }
  }

  private renderListbox(): void {
    const listbox = this.listbox
    if (!listbox) return
    listbox.innerHTML = ''

    // loading 占位态：宿主请求期间下拉显示加载文案（role="status" 播报）
    if (this.hasAttr('loading')) {
      const status = document.createElement('div')
      status.className = 'empty'
      status.setAttribute('role', 'status')
      status.textContent = this.t('combobox.loading')
      listbox.appendChild(status)
      this.syncDropdown()
      return
    }

    const list = this.visibleOptions()
    this.activeIndex = Math.min(this.activeIndex, Math.max(list.length - 1, 0))

    // 空态：options 为空展示 empty，过滤无匹配展示 noMatch（role="status" 供读屏播报）
    if (list.length === 0) {
      const status = document.createElement('div')
      status.className = 'empty'
      status.setAttribute('role', 'status')
      status.textContent =
        this._options.length === 0 ? this.t('combobox.empty') : this.t('combobox.noMatch')
      listbox.appendChild(status)
      this.syncDropdown()
      return
    }

    const value = this.getAttr('value', '')
    for (const [idx, option] of list.entries()) {
      const row = document.createElement('div')
      row.className = 'option'
      row.setAttribute('part', 'option')
      row.setAttribute('role', 'option')
      row.id = `combobox-option-${idx}`
      row.setAttribute('data-index', String(idx))
      row.setAttribute('aria-selected', String(option.value === value))
      row.setAttribute('aria-disabled', String(option.disabled ?? false))
      if (idx === this.activeIndex) row.classList.add('active')
      row.textContent = option.label
      row.addEventListener('mousemove', () => {
        this.activeIndex = idx
        this.renderListbox()
      })
      listbox.appendChild(row)
    }
    this.syncDropdown()
  }

  /** 展开/关闭同步：面板显隐、input aria-expanded / aria-activedescendant、浮层定位 */
  private syncDropdown(): void {
    if (!this.dropdown || !this.input) return
    this.dropdown.classList.toggle('open', this.openState)
    this.input.setAttribute('aria-expanded', String(this.openState))
    const active = this.listbox?.querySelector<HTMLElement>('.option.active')
    if (this.openState && active) {
      this.input.setAttribute('aria-activedescendant', active.id)
    } else {
      this.input.removeAttribute('aria-activedescendant')
    }
    if (this.openState) this.positionDropdown()
  }

  /** 复用浮层定位引擎：锚定输入框下方，空间不足自动翻转/避让，宽度对齐输入框 */
  private positionDropdown(): void {
    if (!this.dropdown || !this.input) return
    const anchorRect = this.input.getBoundingClientRect()
    const panelRect = this.dropdown.getBoundingClientRect()
    const { top, left } = computePosition(anchorRect, panelRect, 'bottom' as Placement, {
      width: window.innerWidth,
      height: window.innerHeight,
    })
    this.dropdown.style.top = `${top}px`
    this.dropdown.style.left = `${left}px`
    this.dropdown.style.width = `${anchorRect.width}px`
  }
}
