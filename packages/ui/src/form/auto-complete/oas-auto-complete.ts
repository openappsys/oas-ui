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
  color: var(--oas-color-text-on-primary);
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

export class OASAutoComplete extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'placeholder', 'options', 'disabled']
  }

  private input: HTMLInputElement | null = null
  private dropdown: HTMLElement | null = null
  private _options: Option[] = []

  /** Vue/React 会把 options 识别为实例属性走 property 赋值；setter 反射到 attribute 统一解析链路 */
  get options(): Option[] {
    return this._options
  }
  set options(value: Option[] | string) {
    this.setAttribute('options', typeof value === 'string' ? value : JSON.stringify(value))
  }
  private activeIndex = 0
  private query = ''

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="wrapper" part="wrapper">
        <input part="input" role="combobox" aria-expanded="false" aria-haspopup="listbox" autocomplete="off" />
        <div class="dropdown" part="dropdown" role="listbox"></div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定输入/键盘/外部点击事件（render 与水合路径共用） */
  private bind(): void {
    this.input = this.shadow.querySelector('input')
    this.dropdown = this.shadow.querySelector('.dropdown')

    this.input?.addEventListener('input', () => {
      this.query = this.input!.value
      this.emit('input', { value: this.query })
      this.renderDropdown(true)
    })
    this.input?.addEventListener('keydown', (e: KeyboardEvent) => this.handleKey(e))
    this.onCleanup(() => document.removeEventListener('click', this.handleOutsideClick, true))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（输入框与下拉容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('input')) return false
    if (!this.shadow.querySelector('.dropdown')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.parseOptions()
    if (!this.input) return
    const value = this.getAttr('value', '')
    const placeholder = this.getAttr('placeholder', '')
    const disabled = this.hasAttr('disabled')
    if (this.input.value !== value && this.query === '') this.input.value = value
    this.input.placeholder = placeholder
    this.input.disabled = disabled
    // 下拉展开时同步刷新 locale 文案（无匹配空态）
    if (this.dropdown?.classList.contains('open')) this.renderDropdown(true)
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

  private filtered(): Option[] {
    const q = this.query.trim().toLowerCase()
    if (!q) return this._options
    return this._options.filter((o) => o.label.toLowerCase().includes(q))
  }

  private renderDropdown(open: boolean): void {
    if (!this.dropdown || !this.input) return
    const list = this.filtered()
    this.dropdown.innerHTML = ''
    this.activeIndex = 0

    if (list.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'empty'
      empty.textContent = this.t('autoComplete.noMatch')
      this.dropdown.appendChild(empty)
    } else {
      for (const [idx, option] of list.entries()) {
        const row = document.createElement('div')
        row.className = 'option'
        row.setAttribute('part', 'option')
        row.setAttribute('role', 'option')
        row.setAttribute('aria-disabled', String(option.disabled ?? false))
        if (idx === this.activeIndex) row.classList.add('active')
        row.textContent = option.label
        row.addEventListener('click', () => {
          if (option.disabled) return
          this.choose(option)
        })
        row.addEventListener('mousemove', () => {
          this.activeIndex = idx
          this.renderDropdown(true)
        })
        this.dropdown.appendChild(row)
      }
    }

    this.dropdown.classList.toggle('open', open)
    this.input.setAttribute('aria-expanded', String(open))
    if (open) document.addEventListener('click', this.handleOutsideClick, true)
    else document.removeEventListener('click', this.handleOutsideClick, true)
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.renderDropdown(false)
    }
  }

  private handleKey(e: KeyboardEvent): void {
    const list = this.filtered()
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.activeIndex = (this.activeIndex + 1) % Math.max(list.length, 1)
      this.renderDropdown(true)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.activeIndex =
        (this.activeIndex - 1 + Math.max(list.length, 1)) % Math.max(list.length, 1)
      this.renderDropdown(true)
    } else if (e.key === 'Enter' && list.length > 0) {
      e.preventDefault()
      this.choose(list[this.activeIndex]!)
    } else if (e.key === 'Escape') {
      this.renderDropdown(false)
    }
  }

  private choose(option: Option): void {
    this.query = option.label
    if (this.input) this.input.value = option.label
    this.setAttribute('value', option.value)
    this.emit('change', { value: option.value, label: option.label })
    this.renderDropdown(false)
  }

  /** label 点击聚焦委托：把焦点交给 shadow 内主输入（配合 oas-form-item 的 label 点击代理） */
  override focus(options?: FocusOptions): void {
    this.shadow.querySelector<HTMLInputElement>('input')?.focus(options)
  }
}
