import { OASElement } from '@oas-ui/core'
import { computePosition, type Placement } from '../../overlay/floating/index.js'

interface Option {
  label: string
  value: string
  disabled?: boolean
  /** 选项分组标题：同一组连续渲染组标题（不可选），组内选项缩进 */
  group?: string
}

const VALID_SIZES = ['small', 'medium', 'large'] as const
const VALID_STATUSES = ['error', 'warning', 'success'] as const

/** 枚举归一化：合法值原样返回，空/非法值静默回落默认 */
function normalizeChoice(raw: string, fallback: string, valid: readonly string[]): string {
  if (raw === '') return fallback
  return (valid as readonly string[]).includes(raw) ? raw : fallback
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
/* ---- size 尺寸档位（默认 medium 走基础样式；高度对齐 --oas-control-height-* token） ---- */
:host([data-size='small']) input {
  height: var(--oas-control-height-sm);
  font-size: var(--oas-font-size-sm);
}
:host([data-size='large']) input {
  height: var(--oas-control-height-lg);
  font-size: var(--oas-font-size-lg);
}
/* ---- status 校验态：success / warning / error（error 兼容宿主 aria-invalid 通道） ---- */
:host([data-status='success']) input {
  border-color: var(--oas-color-success);
}
:host([data-status='success']) input:focus {
  border-color: var(--oas-color-success);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-success) 30%, transparent);
}
:host([data-status='warning']) input {
  border-color: var(--oas-color-warning);
}
:host([data-status='warning']) input:focus {
  border-color: var(--oas-color-warning);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-warning) 30%, transparent);
}
:host([data-status='error']) input {
  border-color: var(--oas-color-danger);
}
:host([data-status='error']) input:focus {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
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
/* 复用浮层定位引擎：fixed + computePosition 锚定 input 下方（逃出 overflow 祖先），
   空间不足自动翻转避让——与 select/combobox 的定位契约一致 */
.dropdown {
  position: fixed;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-dropdown, 1000));
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
.panel-header {
  padding: var(--oas-space-2) var(--oas-space-3) var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.panel-footer {
  padding: var(--oas-space-1) var(--oas-space-3) var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
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
.option.grouped {
  padding-left: calc(var(--oas-space-3) + var(--oas-space-4));
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
    return [
      'value',
      'placeholder',
      'options',
      'disabled',
      'clearable',
      'loading',
      'debounce',
      'trigger-on-focus',
      'size',
      'status',
      'readonly',
      'disabled-skip',
    ]
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
  private query = ''
  private openState = false
  /** IME 组合态：composition 期间不触发过滤与键盘选中（中文输入刚需） */
  private composing = false
  private debounceTimer: ReturnType<typeof setTimeout> | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="wrapper" part="wrapper">
        <input part="input" role="combobox" aria-haspopup="listbox" aria-autocomplete="list"
          aria-expanded="false" aria-controls="ac-list" autocomplete="off" />
        <button class="clear-btn" part="clear" type="button" hidden aria-label="">
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <div class="dropdown" part="dropdown">
          <div class="panel-header" part="header" hidden><slot name="header"></slot></div>
          <div class="listbox" part="listbox" role="listbox" id="ac-list"></div>
          <div class="panel-footer" part="footer" hidden><slot name="footer"></slot></div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定输入/组合态/键盘/焦点/清空/外部点击事件（render 与水合路径共用） */
  private bind(): void {
    this.input = this.shadow.querySelector('input')
    this.dropdown = this.shadow.querySelector('.dropdown')
    this.listbox = this.shadow.querySelector('.listbox')
    this.clearBtn = this.shadow.querySelector('.clear-btn')

    this.input?.addEventListener('compositionstart', () => {
      this.composing = true
    })
    this.input?.addEventListener('compositionend', () => {
      this.composing = false
      // 组合结束后以最终文本补发一次过滤（组合期间的 input 不派发）
      this.scheduleFilter()
    })
    this.input?.addEventListener('input', () => this.handleInput())
    this.input?.addEventListener('keydown', (e: KeyboardEvent) => this.handleKey(e))
    this.input?.addEventListener('focus', () => this.handleFocus())
    this.input?.addEventListener('blur', () => {
      // 自由文本组件：失焦只收起建议，不回退输入内容
      if (this.openState) this.renderDropdown(false)
    })
    // 点击面板/清空按钮不触发 input blur：mousedown 里 preventDefault 阻止默认失焦
    this.dropdown?.addEventListener('mousedown', (e: MouseEvent) => e.preventDefault())
    this.dropdown?.addEventListener('click', (e: MouseEvent) => {
      const row = (e.target as Element).closest('[role="option"]')
      if (!row) return
      const idx = Number(row.getAttribute('data-index'))
      const option = this.filtered()[idx]
      if (option && !option.disabled) this.choose(option)
    })
    this.clearBtn?.addEventListener('mousedown', (e: MouseEvent) => e.preventDefault())
    this.clearBtn?.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation()
      this.clearValue()
    })
    this.onCleanup(() => {
      document.removeEventListener('click', this.handleOutsideClick, true)
      this.clearDebounce()
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（输入框/下拉/listbox 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('input')) return false
    if (!this.shadow.querySelector('.dropdown')) return false
    if (!this.shadow.querySelector('.listbox')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.parseOptions()
    if (!this.input) return
    const value = this.getAttr('value', '')
    const placeholder = this.getAttr('placeholder', '')
    // disabled 就近读取全局禁用注入（组件显式 disabled > 豁免 > provider 注入）
    const disabled = this.injectDisabled()
    // 尺寸/校验态镜像（size 就近读取 config-provider 注入，与全局密度联动）
    const size = normalizeChoice(this.injectValue('size', 'medium'), 'medium', VALID_SIZES)
    this.setAttribute('data-size', size)
    const status = normalizeChoice(this.getAttr('status', ''), '', VALID_STATUSES)
    if (status) this.setAttribute('data-status', status)
    else this.removeAttribute('data-status')
    if (this.input.value !== value && this.query === '') this.input.value = value
    this.input.placeholder = placeholder
    this.input.disabled = disabled
    this.input.readOnly = this.hasAttr('readonly')
    if (status === 'error') this.input.setAttribute('aria-invalid', 'true')
    else this.input.removeAttribute('aria-invalid')
    this.syncClear()
    // 下拉展开时同步刷新：options / loading / locale 文案 / 面板插槽变化即时反映
    if (this.openState) this.renderDropdown(true)
  }

  private parseOptions(): void {
    try {
      const parsed = JSON.parse(this.getAttr('options', '[]'))
      this._options = Array.isArray(parsed) ? parsed.filter((o): o is Option => o && typeof o.value === 'string') : []
    } catch {
      this._options = []
    }
  }

  private filtered(): Option[] {
    const q = this.query.trim().toLowerCase()
    if (!q) return this._options
    return this._options.filter((o) => o.label.toLowerCase().includes(q))
  }

  /** 清空按钮可见性：clearable && 未禁用 && 输入框有内容（自由文本组件以可见文本为准） */
  private syncClear(): void {
    if (!this.clearBtn || !this.input) return
    this.clearBtn.setAttribute('aria-label', this.t('input.clear'))
    this.clearBtn.hidden = !(this.hasAttr('clearable') && !this.injectDisabled() && this.input.value !== '')
  }

  // ---- 输入链路（IME 守卫 + debounce） ----

  private handleInput(): void {
    if (!this.input) return
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    this.query = this.input.value
    this.syncClear()
    this.scheduleFilter()
  }

  /** debounce 防抖值（ms，默认 0 不防抖）：只防抖 oas-input 派发与过滤触发，不防抖输入回显 */
  private debounceDelay(): number {
    const raw = this.getAttr('debounce', '0')
    const n = Number.parseInt(raw, 10)
    return Number.isNaN(n) || n < 0 ? 0 : n
  }

  private clearDebounce(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
  }

  private scheduleFilter(): void {
    // IME 组合中不派发不过滤（组合期 input 是拼音中间态）
    if (this.composing) return
    this.clearDebounce()
    const delay = this.debounceDelay()
    if (delay <= 0) {
      this.applyFilter()
      return
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      this.applyFilter()
    }, delay)
  }

  private applyFilter(): void {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    this.emit('input', { value: this.query })
    this.activeIndex = 0
    this.renderDropdown(true)
  }

  // ---- 焦点 / 键盘 ----

  private handleFocus(): void {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    // trigger-on-focus 默认 false：聚焦不弹全量建议（维持「输入优先」现状），显式开启走 datalist 心智
    if (this.hasAttr('trigger-on-focus')) {
      this.activeIndex = 0
      this.renderDropdown(true)
    }
  }

  private handleKey(e: KeyboardEvent): void {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    // IME 组合期：Enter/方向键交给输入法（确认候选/移动候选光标），不触发选中与导航
    if (this.composing || e.isComposing) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!this.openState) {
        this.activeIndex = 0
        this.renderDropdown(true)
      } else {
        this.moveActive(1)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!this.openState) {
        this.activeIndex = 0
        this.renderDropdown(true)
      } else {
        this.moveActive(-1)
      }
    } else if (e.key === 'Enter') {
      if (!this.openState) return
      const list = this.filtered()
      if (list.length === 0) return
      e.preventDefault()
      const option = list[this.activeIndex]
      if (option && !option.disabled) this.choose(option)
    } else if (e.key === 'Escape') {
      if (this.openState) this.renderDropdown(false)
    }
  }

  /** 键盘移动高亮：增量同步（不重建 DOM）+ 滚动跟随（对齐 select 机制） */
  private moveActive(dir: 1 | -1): void {
    const n = this.filtered().length
    if (n === 0) return
    this.activeIndex = (this.activeIndex + dir + n) % n
    this.syncActive()
    this.scrollActiveIntoView()
  }

  private scrollActiveIntoView(): void {
    if (!this.listbox) return
    const row = this.listbox.querySelector<HTMLElement>(`#opt-${this.activeIndex}`)
    if (!row) return
    const top = row.offsetTop
    const bottom = row.offsetTop + row.offsetHeight
    const vh = this.listbox.clientHeight
    const cur = this.listbox.scrollTop
    if (top < cur) this.listbox.scrollTop = Math.max(0, top)
    else if (bottom > cur + vh) this.listbox.scrollTop = Math.max(0, bottom - vh)
  }

  // ---- 下拉渲染 ----

  /** header/footer 插槽可见性：light DOM 提供 [slot=...] 内容时显示（每次展开时同步） */
  private syncPanelSlots(): void {
    const header = this.shadow.querySelector<HTMLElement>('.panel-header')
    const footer = this.shadow.querySelector<HTMLElement>('.panel-footer')
    if (header) header.hidden = !this.querySelector('[slot="header"]')
    if (footer) footer.hidden = !this.querySelector('[slot="footer"]')
  }

  private renderDropdown(open: boolean): void {
    if (!this.dropdown || !this.input || !this.listbox) return
    this.openState = open
    if (!open) {
      this.dropdown.classList.remove('open')
      this.input.setAttribute('aria-expanded', 'false')
      this.input.removeAttribute('aria-activedescendant')
      document.removeEventListener('click', this.handleOutsideClick, true)
      return
    }
    this.syncPanelSlots()
    this.listbox.innerHTML = ''

    // loading 占位态：宿主请求远程建议期间显示加载文案（role=status 播报）
    if (this.hasAttr('loading')) {
      const status = document.createElement('div')
      status.className = 'empty'
      status.setAttribute('role', 'status')
      status.textContent = this.t('loading.loading')
      this.listbox.appendChild(status)
      this.finishOpen()
      return
    }

    const list = this.filtered()
    this.activeIndex = Math.min(this.activeIndex, Math.max(list.length - 1, 0))

    // 空态：自定义 [slot="empty"] 优先，缺省回落 locale 文案
    if (list.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'empty'
      empty.setAttribute('role', 'status')
      const slot = document.createElement('slot')
      slot.setAttribute('name', 'empty')
      const def = document.createElement('span')
      def.className = 'empty-default'
      def.textContent = this.t('autoComplete.noMatch')
      if (this.querySelector('[slot="empty"]')) def.hidden = true
      empty.append(slot, def)
      this.listbox.appendChild(empty)
      this.finishOpen()
      return
    }

    let prevGroup: string | undefined
    let idx = 0
    for (const option of list) {
      // 分组标题：组字段变化时插入（不可选，仅展示）
      if (option.group !== undefined && option.group !== prevGroup) {
        const groupEl = document.createElement('div')
        groupEl.className = 'option-group'
        groupEl.textContent = option.group
        this.listbox.appendChild(groupEl)
      }
      prevGroup = option.group
      this.createOptionRow(option, idx)
      idx++
    }
    this.finishOpen()
  }

  /** 展开收尾：面板显隐 / aria / 定位 / 全局点击监听（open 分支共用） */
  private finishOpen(): void {
    if (!this.dropdown || !this.input) return
    this.dropdown.classList.add('open')
    this.input.setAttribute('aria-expanded', 'true')
    this.syncActive()
    this.positionDropdown()
    document.addEventListener('click', this.handleOutsideClick, true)
  }

  /** 构建选项行：角色/aria/高亮/自定义渲染模板；点击走 dropdown 委托，mousemove 走增量同步 */
  private createOptionRow(option: Option, idx: number): void {
    const row = document.createElement('div')
    row.className = 'option'
    if (option.group !== undefined) row.classList.add('grouped')
    row.setAttribute('part', 'option')
    row.setAttribute('role', 'option')
    row.setAttribute('aria-disabled', String(option.disabled ?? false))
    row.id = `opt-${idx}` // aria-activedescendant 锚点（shadow 内 id 作用域隔离，无宿主冲突）
    row.setAttribute('data-index', String(idx))
    if (idx === this.activeIndex) row.classList.add('active')
    const label = document.createElement('span')
    label.className = 'option-label'
    this.fillOptionLabel(label, option)
    row.appendChild(label)
    row.addEventListener('mousemove', () => {
      if (this.activeIndex === idx) return
      this.activeIndex = idx
      this.syncActive()
    })
    this.listbox!.appendChild(row)
    // 自定义选项渲染：宿主可监听改写 element（图标/富文本），机制与 select 的 oas-option-render 一致
    this.emit('option-render', { index: idx, option, element: label })
  }

  /** 选项 label 渲染：template[slot="option"] 克隆 + [data-option-label] 绑定，缺省回落纯文本 */
  private fillOptionLabel(labelEl: HTMLElement, option: Option): void {
    const tpl = this.querySelector('template[slot="option"]')
    if (tpl instanceof HTMLTemplateElement) {
      labelEl.appendChild(tpl.content.cloneNode(true))
      const binder = labelEl.querySelector('[data-option-label]')
      if (binder) binder.textContent = option.label
    } else {
      labelEl.textContent = option.label
    }
  }

  /** 高亮/aria 增量同步（不重建 DOM） */
  private syncActive(): void {
    const list = this.listbox
    if (!list) return
    for (const row of list.querySelectorAll<HTMLElement>('.option[data-index]')) {
      row.classList.toggle('active', Number(row.getAttribute('data-index')) === this.activeIndex)
    }
    const n = this.filtered().length
    if (this.openState && n > 0 && this.activeIndex < n) {
      this.input?.setAttribute('aria-activedescendant', `opt-${this.activeIndex}`)
    } else {
      this.input?.removeAttribute('aria-activedescendant')
    }
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

  private handleOutsideClick = (e: MouseEvent): void => {
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.renderDropdown(false)
    }
  }

  // ---- 选中 / 清空 ----

  private choose(option: Option): void {
    this.clearDebounce()
    this.query = option.label
    this.renderDropdown(false)
    if (this.input) this.input.value = option.label
    this.setAttribute('value', option.value)
    this.emit('change', { value: option.value, label: option.label })
    this.syncClear()
  }

  /** clearable：清空输入与 value 并派发 oas-clear（detail 为清空前的 value）+ oas-change（空值） */
  private clearValue(): void {
    if (this.injectDisabled()) return
    const prev = this.getAttr('value', '')
    this.clearDebounce()
    this.query = ''
    this.renderDropdown(false)
    this.removeAttribute('value')
    if (this.input) {
      this.input.value = ''
      this.input.focus()
    }
    this.emit('clear', { value: prev })
    this.emit('change', { value: '', label: '' })
    this.syncClear()
  }

  /** label 点击聚焦委托：把焦点交给 shadow 内主输入（配合 oas-form-item 的 label 点击代理） */
  override focus(options?: FocusOptions): void {
    this.shadow.querySelector<HTMLInputElement>('input')?.focus(options)
  }
}
