import { OASElement } from '@oas-ui/core'

interface Option {
  label: string
  value: string
  disabled?: boolean
  /** 选项分组标题：同一组连续渲染组标题（不可选），组内选项缩进 */
  group?: string
}

const STYLE = `
:host {
  display: inline-block;
  position: relative;
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
.value {
  display: flex;
  flex-wrap: wrap;
  gap: var(--oas-space-1);
  min-width: 0;
  flex: 1;
  text-align: left;
  /* 默认换行：标签放不下时换行、触发器自适应增高；折叠仅在显式设置 max-tag-count 时启用 */
}
:host([max-tag-count]) .value {
  flex-wrap: nowrap;
  /* max-tag-count 折叠模式：单行不换行、不出横向滚动条，放不下的标签折叠为 +N（见 collapseOverflowChips） */
  overflow: hidden;
}
.placeholder {
  color: var(--oas-color-text-secondary);
}
.chip {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  height: 20px;
  flex-shrink: 0;
  max-width: 100%;
  gap: var(--oas-space-1);
  background: var(--oas-color-bg-hover);
  border-radius: var(--oas-radius-sm);
  padding: 0 var(--oas-space-1);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-primary);
}
/* 超长标签在 chip 内省略，避免超出容器横向溢出（换行模式下单个标签无法再折行） */
.chip > span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.chip[hidden] {
  display: none;
}
/* 折叠计数 chip：样式同 .chip，颜色次要；仅在需要折叠时才插入 DOM */
.chip-plus {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  height: 20px;
  flex-shrink: 0;
  gap: var(--oas-space-1);
  background: var(--oas-color-bg-hover);
  border-radius: var(--oas-radius-sm);
  padding: 0 var(--oas-space-1);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.chip-plus[hidden] {
  display: none;
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
  /* 多行标签时箭头固定首行对齐，不随触发器长高漂浮 */
  align-self: flex-start;
  margin-top: calc((var(--oas-control-height-md) - 12px) / 2);
  flex-shrink: 0;
}
.trigger[aria-expanded='true'] .chevron {
  transform: rotate(180deg);
}
.clear-btn {
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0 2px;
  margin: 0;
  color: var(--oas-color-text-secondary);
  font-size: 1em;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  border-radius: var(--oas-radius-sm);
  flex-shrink: 0;
  /* 多行标签时清除按钮固定首行对齐，不随触发器长高漂浮（与 .chevron 一致） */
  align-self: flex-start;
  margin-top: calc((var(--oas-control-height-md) - 12px) / 2);
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
.search-input {
  box-sizing: border-box;
  width: 100%;
  height: var(--oas-control-height-md);
  margin-bottom: var(--oas-space-1);
  padding: 0 var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
}
.search-input:focus {
  outline: none;
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}
.listbox {
  max-height: 240px;
  overflow-y: auto;
}
.option-group {
  padding: var(--oas-space-2) var(--oas-space-3) var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  user-select: none;
  cursor: default;
}
.option-group + .option-group {
  margin-top: var(--oas-space-2);
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
.option.grouped {
  padding-left: calc(var(--oas-space-3) + var(--oas-space-4));
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
.create-option {
  color: var(--oas-color-primary);
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
    return [
      'value',
      'placeholder',
      'options',
      'disabled',
      'multiple',
      'searchable',
      'clearable',
      'remote',
      'loading',
      'max-tag-count',
      'allow-create',
    ]
  }

  private triggerEl: HTMLButtonElement | null = null
  private dropdown: HTMLElement | null = null
  private listbox: HTMLElement | null = null
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
  /** allow-create 时无匹配展示的「创建 xxx」行状态 */
  private createVisible = false
  private createLabel = ''

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="wrapper" part="wrapper">
        <button class="trigger" part="trigger" type="button" role="combobox"
          aria-haspopup="listbox" aria-expanded="false">
          <span class="value" part="value"></span>
          <span class="clear-btn" part="clear" role="button" tabindex="-1" hidden aria-label="">
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </span>
          <svg class="chevron" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M4 6 L8 10 L12 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="dropdown" part="dropdown">
          <input class="search-input" part="search-input" type="text" hidden />
          <div class="listbox" part="listbox" role="listbox"></div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定触发器/搜索/清空事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.triggerEl = this.shadow.querySelector('.trigger')
    this.dropdown = this.shadow.querySelector('.dropdown')
    this.listbox = this.shadow.querySelector('.listbox')

    this.shadow.querySelector<HTMLInputElement>('.search-input')?.addEventListener('input', (e) => {
      const v = (e.target as HTMLInputElement).value
      const searchInput = this.shadow.querySelector<HTMLInputElement>('.search-input')
      if (searchInput) searchInput.setAttribute('data-query', v)
      // remote 模式下过滤交给宿主：组件不本地过滤，只派发 oas-input 供宿主请求
      if (this.hasAttr('remote')) this.emit('input', { value: v })
      this.renderListbox()
    })
    this.shadow
      .querySelector<HTMLInputElement>('.search-input')
      ?.addEventListener('keydown', (e: KeyboardEvent) => this.handleSearchKey(e))
    this.shadow
      .querySelector<HTMLButtonElement>('.clear-btn')
      ?.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation()
        this.clearValue()
      })

    this.triggerEl?.addEventListener('click', () => this.toggle())
    this.triggerEl?.addEventListener('keydown', (e: KeyboardEvent) => this.handleTriggerKey(e))
    this.onCleanup(() => document.removeEventListener('click', this.handleOutsideClick))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（trigger/dropdown/listbox 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.trigger')) return false
    if (!this.shadow.querySelector('.dropdown')) return false
    if (!this.shadow.querySelector('.listbox')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.parseOptions()
    // 内置文案走 locale registry（zh-CN 默认，setLocale 切换自动刷新）
    this.shadow
      .querySelector<HTMLInputElement>('.search-input')
      ?.setAttribute('aria-label', this.t('select.search'))
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
    const searchInput = this.shadow.querySelector<HTMLInputElement>('.search-input')
    if (searchInput) {
      searchInput.hidden = !this.hasAttr('searchable')
      if (this.openState && this.hasAttr('searchable')) {
        searchInput.focus()
      }
    }
    if (this.openState) {
      document.addEventListener('click', this.handleOutsideClick)
      const current = this.currentValues()
      const idx =
        current.length > 0 ? this.visibleOptions().findIndex((o) => o.value === current[0]) : 0
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

  /** trigger 键盘：Esc 关闭；关闭态 Enter/Space/↑/↓ 展开；展开态 ↑/↓ 移动、Enter 选中 */
  private handleTriggerKey(e: KeyboardEvent): void {
    if (this.hasAttr('disabled')) return
    // 焦点在 trigger 内嵌按钮（清空/移除 chip）时不响应，交给按钮原生行为
    if ((e.target as Element).closest('.clear-btn, .chip button')) return
    if (e.key === 'Escape') {
      this.openState = false
      this.syncDropdown()
    } else if (!this.openState) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        this.openState = true
        this.syncDropdown()
      }
    } else {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        this.moveActive(1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        this.moveActive(-1)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        this.selectActive()
      }
    }
  }

  /** 搜索框键盘：↑/↓ 移动、Enter 选中、Esc 关闭并还焦 trigger */
  private handleSearchKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault()
      this.openState = false
      this.syncDropdown()
      this.triggerEl?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.moveActive(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.moveActive(-1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      this.selectActive()
    }
  }

  /** 可导航行数：可见选项 +（allow-create 无匹配时的「创建」行） */
  private navigableCount(): number {
    return this.visibleOptions().length + (this.createVisible ? 1 : 0)
  }

  private moveActive(dir: 1 | -1): void {
    const n = this.navigableCount()
    if (n === 0) return
    this.activeIndex = (this.activeIndex + dir + n) % n
    this.renderListbox()
  }

  private selectActive(): void {
    const visible = this.visibleOptions()
    if (this.createVisible && this.activeIndex >= visible.length) {
      this.createOption()
      return
    }
    const option = visible[this.activeIndex]
    if (!option || option.disabled) return
    this.selectValue(option.value)
  }

  /**
   * 当前下拉可见选项：
   * - remote 模式：不做本地过滤（过滤交给宿主，直接渲染 options）
   * - 本地模式：有查询词时按 label 过滤
   */
  private visibleOptions(): Option[] {
    if (this.hasAttr('remote')) return this._options
    const q = this.currentQuery().toLowerCase()
    if (q === '') return this._options
    return this._options.filter((o) => o.label.toLowerCase().includes(q))
  }

  /** 搜索框原始查询词（trim 后，保留原始大小写供「创建」用） */
  private currentQuery(): string {
    return (
      this.shadow.querySelector<HTMLInputElement>('.search-input')?.getAttribute('data-query') ?? ''
    ).trim()
  }

  private renderListbox(): void {
    const listbox = this.listbox
    if (!listbox) return
    listbox.innerHTML = ''
    this.createVisible = false

    // loading 占位态：remote 模式下宿主请求期间显示（文案走 locale）
    if (this.hasAttr('loading')) {
      const loading = document.createElement('div')
      loading.className = 'empty'
      loading.textContent = this.t('loading.loading')
      listbox.appendChild(loading)
      return
    }

    const visible = this.visibleOptions()
    const query = this.currentQuery()

    if (visible.length === 0) {
      // allow-create：无匹配时展示「创建 xxx」行（选中后以输入值新建选项）
      if (this.hasAttr('allow-create') && query !== '') {
        this.createVisible = true
        this.createLabel = query
        const row = document.createElement('div')
        row.className = 'option create-option'
        row.setAttribute('role', 'option')
        row.setAttribute('aria-selected', 'false')
        if (this.activeIndex === visible.length) row.classList.add('active')
        const label = document.createElement('span')
        label.textContent = this.t('select.create', { label: query })
        row.append(label)
        row.addEventListener('click', () => this.createOption())
        row.addEventListener('mousemove', () => {
          this.activeIndex = visible.length
          this.renderListbox()
        })
        listbox.appendChild(row)
        return
      }
      const empty = document.createElement('div')
      empty.className = 'empty'
      empty.textContent = query ? this.t('select.noMatch') : this.t('select.empty')
      listbox.appendChild(empty)
      return
    }

    const values = this.currentValues()
    let prevGroup: string | undefined
    let optionIdx = 0
    for (const option of visible) {
      // 分组标题：组字段变化时插入（不可选，仅展示）
      if (option.group !== undefined && option.group !== prevGroup) {
        const groupEl = document.createElement('div')
        groupEl.className = 'option-group'
        groupEl.textContent = option.group
        listbox.appendChild(groupEl)
      }
      prevGroup = option.group

      const row = document.createElement('div')
      row.className = 'option'
      if (option.group !== undefined) row.classList.add('grouped')
      row.setAttribute('part', 'option')
      row.setAttribute('role', 'option')
      row.setAttribute('aria-selected', String(values.includes(option.value)))
      row.setAttribute('aria-disabled', String(option.disabled ?? false))
      if (optionIdx === this.activeIndex) row.classList.add('active')
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
        this.activeIndex = optionIdx
        this.renderListbox()
      })
      listbox.appendChild(row)
      optionIdx++
    }
  }

  private selectValue(value: string): void {
    if (this.hasAttr('multiple')) {
      const current = this.currentValues()
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
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

  /** clearable：清空值并派发 oas-clear（detail 为被清空前的值）+ oas-change（空值） */
  private clearValue(): void {
    if (this.hasAttr('disabled')) return
    const prev = this.currentValues()
    if (this.hasAttr('multiple')) {
      this.setAttribute('value', '[]')
      this.emit('clear', { value: [...prev] })
      this.emit('change', { value: [] })
    } else {
      this.removeAttribute('value')
      this.emit('clear', { value: prev[0] ?? '' })
      this.emit('change', { value: '' })
    }
    this.syncTrigger()
    this.renderListbox()
    this.triggerEl?.focus()
  }

  /** allow-create：以输入值创建选项并纳入选中 */
  private createOption(): void {
    const label = this.createLabel.trim()
    if (label === '') return
    this._options.push({ label, value: label })
    this.createVisible = false
    this.selectValue(label)
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
      this._options = Array.isArray(parsed)
        ? parsed.filter((o): o is Option => o && typeof o.value === 'string')
        : []
    } catch {
      this._options = []
    }
  }

  private intAttr(name: string): number | null {
    const raw = this.getAttr(name, '').trim()
    if (raw === '') return null
    const n = Number.parseInt(raw, 10)
    return Number.isNaN(n) ? null : n
  }

  /** 单行（max-tag-count 折叠模式）放不下时把放不下的标签收进 +N（不换行、不出横向滚动条） */
  private collapseOverflowChips(
    valueEl: HTMLElement,
    plus: HTMLElement,
    allLabels: string[],
    renderedCount: number,
  ): void {
    const chips = [...valueEl.querySelectorAll<HTMLElement>('.chip:not(.chip-plus)')]
    let hidden = allLabels.length - renderedCount // 已按 max-tag-count 折叠的数量
    // 无需折叠且单行放得下：移除 +N，不占位
    if (hidden === 0 && valueEl.scrollWidth <= valueEl.clientWidth) {
      plus.remove()
      return
    }
    const applyPlus = () => {
      plus.hidden = false
      plus.textContent = `+${hidden}`
      plus.setAttribute('title', allLabels.slice(allLabels.length - hidden).join('、'))
    }
    applyPlus()
    // 从后往前收起，直到单行放得下
    for (let i = chips.length - 1; i >= 0; i--) {
      if (valueEl.scrollWidth <= valueEl.clientWidth) break
      const c = chips[i]
      if (!c) continue
      c.hidden = true
      hidden++
      applyPlus()
    }
  }

  private syncTrigger(): void {
    if (!this.triggerEl) return
    const placeholder = this.getAttr('placeholder', this.t('select.placeholder'))
    const disabled = this.hasAttr('disabled')
    const values = this.currentValues()
    const valueEl = this.triggerEl.querySelector<HTMLElement>('.value')!

    this.triggerEl.disabled = disabled
    this.triggerEl.setAttribute('aria-label', placeholder)

    // 清空按钮：clearable && 有值 && 未禁用 时显示
    const clearBtn = this.shadow.querySelector<HTMLButtonElement>('.clear-btn')
    if (clearBtn) {
      clearBtn.hidden = !(this.hasAttr('clearable') && !disabled && values.length > 0)
      clearBtn.setAttribute('aria-label', this.t('input.clear'))
    }

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
      // max-tag-count：仅显式设置时才按数量折叠；未设置时标签默认换行展示（flex-wrap: wrap 见 CSS）
      const limit = this.hasAttr('max-tag-count')
        ? (this.intAttr('max-tag-count') ?? Number.POSITIVE_INFINITY)
        : Number.POSITIVE_INFINITY
      const shown = limit >= 0 ? values.slice(0, limit) : values
      const allLabels = values.map((v) => this._options.find((o) => o.value === v)?.label ?? v)
      for (const v of shown) {
        const option = this._options.find((o) => o.value === v)
        const chip = document.createElement('span')
        chip.className = 'chip'
        const label = document.createElement('span')
        label.textContent = option?.label ?? v
        const rm = document.createElement('button')
        rm.setAttribute('aria-label', this.t('select.remove', { label: option?.label ?? v }))
        rm.textContent = '×'
        rm.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation()
          this.selectValue(v)
        })
        chip.append(label, rm)
        valueEl.appendChild(chip)
      }
      // 折叠计数 chip：仅在显式设置 max-tag-count 时插入（数量折叠 + 超宽折叠合并计数）
      if (this.hasAttr('max-tag-count')) {
        const plus = document.createElement('span')
        plus.className = 'chip chip-plus'
        valueEl.appendChild(plus)
        this.collapseOverflowChips(valueEl, plus, allLabels, shown.length)
      }
    } else {
      const value = values[0] ?? ''
      const option = this._options.find((o) => o.value === value)
      valueEl.textContent = option?.label ?? value
    }
  }

  /** label 点击聚焦委托：把焦点交给 shadow 内 trigger（配合 oas-form-item 的 label 点击代理） */
  override focus(options?: FocusOptions): void {
    this.shadow.querySelector<HTMLButtonElement>('.trigger')?.focus(options)
  }
}
