import { OASElement } from '@oas-ui/core'

interface CascaderOption {
  label: string
  value: string
  children?: CascaderOption[]
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
:host([aria-invalid='true']) .trigger {
  border-color: var(--oas-color-danger);
}
:host([aria-invalid='true']) .trigger[aria-expanded='true'],
:host([aria-invalid='true']) .trigger:focus-visible {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
.trigger[disabled] {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
.placeholder {
  color: var(--oas-color-text-secondary);
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
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  display: none;
}
.dropdown.open {
  display: flex;
}
.panel {
  min-width: 120px;
  max-height: 240px;
  overflow-y: auto;
  padding: var(--oas-space-1);
}
.panel + .panel {
  border-left: 1px solid var(--oas-color-border);
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
  color: var(--oas-color-text-on-primary);
}
.option[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
.arrow {
  margin-left: var(--oas-space-2);
  font-size: var(--oas-font-size-xs);
  color: inherit;
  opacity: 0.7;
}
`

export class OASCascader extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'placeholder', 'options', 'disabled', 'change-on-select', 'show-all-levels']
  }

  private triggerEl: HTMLButtonElement | null = null
  private dropdown: HTMLElement | null = null
  private _options: CascaderOption[] = []

  /** Vue/React 会把 options 识别为实例属性走 property 赋值；setter 反射到 attribute 统一解析链路 */
  get options(): CascaderOption[] {
    return this._options
  }
  set options(value: CascaderOption[] | string) {
    this.setAttribute('options', typeof value === 'string' ? value : JSON.stringify(value))
  }
  private openState = false
  private activePath: string[] = []
  private activePanel = 0
  private activeRow = 0

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="wrapper" part="wrapper">
        <button class="trigger" part="trigger" type="button" role="combobox" aria-haspopup="true" aria-expanded="false">
          <span class="value" part="value"></span>
          <svg class="chevron" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M4 6 L8 10 L12 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="dropdown" part="dropdown" tabindex="-1"></div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定触发器/面板键盘/外部点击事件（render 与水合路径共用） */
  private bind(): void {
    this.triggerEl = this.shadow.querySelector('.trigger')
    this.dropdown = this.shadow.querySelector('.dropdown')
    this.dropdown?.addEventListener('keydown', (e: KeyboardEvent) => this.handleDropdownKey(e))
    this.triggerEl?.addEventListener('click', () => this.toggle())
    this.triggerEl?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (!this.openState) {
          this.openState = true
          this.activePath = this.currentPath()
          this.activePanel = 0
          this.activeRow = 0
          this.renderPanels()
        }
        this.syncDropdown()
      } else if (e.key === 'Escape') {
        this.openState = false
        this.syncDropdown()
      }
    })
    this.onCleanup(() => document.removeEventListener('click', this.handleOutsideClick))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（trigger 与 dropdown 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.trigger')) return false
    if (!this.shadow.querySelector('.dropdown')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.parseOptions()
    this.syncTrigger()
  }

  private toggle(): void {
    if (this.hasAttr('disabled')) return
    this.openState = !this.openState
    if (this.openState) {
      this.activePath = this.currentPath()
      this.activePanel = 0
      this.activeRow = 0
    }
    this.renderPanels()
    this.syncDropdown()
  }

  private syncDropdown(): void {
    if (!this.dropdown || !this.triggerEl) return
    this.dropdown.classList.toggle('open', this.openState)
    this.triggerEl.setAttribute('aria-expanded', String(this.openState))
    if (this.openState) {
      document.addEventListener('click', this.handleOutsideClick)
      this.dropdown.focus()
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

  private parseOptions(): void {
    try {
      const parsed = JSON.parse(this.getAttr('options', '[]'))
      this._options = Array.isArray(parsed)
        ? parsed.filter((o): o is CascaderOption => o && typeof o.value === 'string')
        : []
    } catch {
      this._options = []
    }
  }

  private currentPath(): string[] {
    try {
      const parsed = JSON.parse(this.getAttr('value', '[]'))
      return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []
    } catch {
      return []
    }
  }

  private panelsData: CascaderOption[][] = []

  private renderPanels(): void {
    const dropdown = this.dropdown
    if (!dropdown) return
    dropdown.innerHTML = ''
    this.panelsData = this.buildPanels()
    this.panelsData.forEach((list, depth) => {
      const panel = document.createElement('div')
      panel.className = 'panel'
      panel.setAttribute('part', 'panel')
      const selected = this.activePath[depth]
      for (const option of list) {
        const row = document.createElement('div')
        row.className = 'option'
        row.setAttribute('role', 'option')
        row.setAttribute('aria-selected', String(option.value === selected))
        row.setAttribute('aria-disabled', String(option.disabled ?? false))
        const label = document.createElement('span')
        label.textContent = option.label
        row.appendChild(label)
        if (option.children && option.children.length > 0) {
          const arrow = document.createElement('span')
          arrow.className = 'arrow'
          arrow.textContent = '›'
          row.appendChild(arrow)
          row.addEventListener('click', () => {
            if (option.disabled) return
            this.activePath[depth] = option.value
            this.activePath.length = depth + 1
            this.activePanel = depth + 1
            this.activeRow = 0
            this.renderPanels()
            this.syncTrigger()
            if (this.hasAttr('change-on-select')) this.commit(this.activePath)
          })
        } else {
          row.addEventListener('click', () => {
            if (option.disabled) return
            this.activePath[depth] = option.value
            this.activePath.length = depth + 1
            this.commit(this.activePath)
          })
        }
        panel.appendChild(row)
      }
      dropdown.appendChild(panel)
    })
    this.focusPanel()
  }

  private focusPanel(): void {
    const panel = this.dropdown?.querySelectorAll<HTMLElement>('.panel')[this.activePanel]
    if (!panel) return
    const rows = [...panel.querySelectorAll<HTMLElement>('.option')]
    const enabled = rows.filter((r) => r.getAttribute('aria-disabled') !== 'true')
    const target = enabled[Math.min(this.activeRow, enabled.length - 1)] ?? enabled[0]
    for (const r of rows) r.classList.remove('active')
    if (target) {
      target.classList.add('active')
      target.scrollIntoView?.({ block: 'nearest' })
    }
  }

  private handleDropdownKey(e: KeyboardEvent): void {
    const panels = this.panelsData
    if (panels.length === 0) return
    const panel = panels[this.activePanel]
    if (!panel) return
    const enabled = panel.map((o, idx) => (o.disabled ? -1 : idx)).filter((i) => i >= 0)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const cur = enabled.indexOf(this.activeRow)
      this.activeRow = enabled[(cur + 1) % enabled.length] ?? enabled[0] ?? 0
      this.focusPanel()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const cur = enabled.indexOf(this.activeRow)
      this.activeRow =
        enabled[(cur - 1 + enabled.length) % enabled.length] ?? enabled[enabled.length - 1] ?? 0
      this.focusPanel()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      const option = panel[this.activeRow]
      if (option?.children?.length) {
        this.activePath[this.activePanel] = option.value
        this.activePath.length = this.activePanel + 1
        this.activePanel += 1
        this.activeRow = 0
        this.renderPanels()
        this.syncTrigger()
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      if (this.activePanel > 0) {
        this.activePanel -= 1
        this.activeRow = 0
        this.activePath.length = this.activePanel
        this.focusPanel()
      } else {
        this.openState = false
        this.syncDropdown()
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const option = panel[this.activeRow]
      if (!option || option.disabled) return
      if (option.children?.length) {
        this.activePath[this.activePanel] = option.value
        this.activePath.length = this.activePanel + 1
        this.activePanel += 1
        this.activeRow = 0
        this.renderPanels()
        this.syncTrigger()
      } else {
        this.activePath[this.activePanel] = option.value
        this.activePath.length = this.activePanel + 1
        this.commit(this.activePath)
      }
    } else if (e.key === 'Escape') {
      this.openState = false
      this.syncDropdown()
    }
  }

  private buildPanels(): CascaderOption[][] {
    const panels: CascaderOption[][] = []
    let current: CascaderOption[] = this._options
    for (let depth = 0; depth <= this.activePath.length; depth++) {
      panels.push(current)
      const selected = this.activePath[depth]
      if (selected === undefined) break
      const node = current.find((o) => o.value === selected)
      if (!node?.children?.length) break
      current = node.children
    }
    return panels
  }

  private commit(path: string[]): void {
    this.setAttribute('value', JSON.stringify(path))
    this.emit('change', { value: path })
    this.openState = false
    this.syncDropdown()
    this.syncTrigger()
  }

  private syncTrigger(): void {
    if (!this.triggerEl) return
    const placeholder = this.getAttr('placeholder', this.t('cascader.placeholder'))
    const valueEl = this.triggerEl.querySelector<HTMLElement>('.value')!
    const path = this.currentPath()
    this.triggerEl.disabled = this.hasAttr('disabled')

    if (path.length === 0) {
      valueEl.innerHTML = ''
      const ph = document.createElement('span')
      ph.className = 'placeholder'
      ph.textContent = placeholder
      valueEl.appendChild(ph)
      return
    }

    const labels: string[] = []
    let current: CascaderOption[] = this._options
    for (const value of path) {
      const node = current.find((o) => o.value === value)
      if (!node) break
      labels.push(node.label)
      if (!node.children?.length) break
      current = node.children
    }
    valueEl.textContent = labels.join(' / ')
  }

  /** label 点击聚焦委托：把焦点交给 shadow 内 trigger（配合 oas-form-item 的 label 点击代理） */
  override focus(options?: FocusOptions): void {
    this.shadow.querySelector<HTMLButtonElement>('.trigger')?.focus(options)
  }
}
