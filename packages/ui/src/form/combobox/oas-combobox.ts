// 注册 oas-virtual-list（OASVirtualList 仅作类型用，需裸 import 保住注册副作用）
import '../../data/virtual-list/index.js'
import type { OASVirtualList } from '../../data/virtual-list/index.js'
import { computePosition, type Placement } from '../../overlay/floating/index.js'
import { OASElement } from '@oas-ui/core'

interface Option {
  label: string
  value: string
  disabled?: boolean
  /** 选项分组标题：同一组连续渲染组标题（不可选），组内选项缩进（与 oas-select 同一 JSON 契约） */
  group?: string
}

const VALID_SIZES = ['small', 'medium', 'large'] as const
const VALID_STATUSES = ['error', 'warning', 'success'] as const

/** 枚举归一化：合法值原样返回，空/非法值静默回落默认 */
function normalizeChoice(raw: string, fallback: string, valid: readonly string[]): string {
  if (raw === '') return fallback
  return (valid as readonly string[]).includes(raw) ? raw : fallback
}

/** 选项行样式（非虚拟模式渲染在 combobox 自身 shadow；虚拟模式注入到 vlist shadow，两处共用） */
const OPTION_STYLE = `
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
.option.grouped {
  padding-left: calc(var(--oas-space-3) + var(--oas-space-4));
}
.option[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
`

/** 虚拟模式注入 oas-virtual-list 的 shadow：选项行占满 item、整行可高亮 */
const VIRTUAL_ROW_STYLE = `
[part="item"] {
  display: flex;
  align-items: center;
}
[part="item"] .option {
  flex: 1;
  height: 100%;
  box-sizing: border-box;
}
${OPTION_STYLE}
`

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
/* 复用浮层定位引擎：position: fixed + computePosition 锚定 input 下方，空间不足自动翻转避让 */
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
${OPTION_STYLE}
.empty {
  padding: var(--oas-space-3);
  text-align: center;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
`

export class OASCombobox extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'placeholder',
      'options',
      'disabled',
      'clearable',
      'loading',
      'filterable',
      'size',
      'status',
      'open',
      'virtual',
      'item-height',
      'readonly',
      'disabled-skip',
    ]
  }

  private input: HTMLInputElement | null = null
  private dropdown: HTMLElement | null = null
  private listbox: HTMLElement | null = null
  private clearBtn: HTMLButtonElement | null = null
  private vlist: OASVirtualList | null = null
  private _options: Option[] = []
  /** 上次 open 状态（null = 未初始化，首帧不派发 oas-open-change） */
  private prevOpen: boolean | null = null

  /** Vue/React 会把 options 识别为实例属性走 property 赋值；setter 反射到 attribute 统一解析链路 */
  get options(): Option[] {
    return this._options
  }
  set options(value: Option[] | string) {
    this.setAttribute('options', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** 自定义过滤函数（仅 property 通道：`el.filter = fn`，WC attribute 无法传函数）。
   *  签名 `(option, query) => boolean`；置 null 恢复默认 label 子串过滤；filterable="false" 时不参与（不做本地过滤）。 */
  private _filter: ((option: Option, query: string) => boolean) | null = null
  get filter(): ((option: Option, query: string) => boolean) | null {
    return this._filter
  }
  set filter(fn: ((option: Option, query: string) => boolean) | null) {
    this._filter = typeof fn === 'function' ? fn : null
    if (this.hasAttr('open')) this.renderListbox()
  }

  private activeIndex = 0
  /** 用户正在输入的过滤词（未选中前不覆盖受控 value，失焦/Esc 回退为选中项 label） */
  private query = ''

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
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
          <oas-virtual-list class="vlist" part="virtual-list" hidden></oas-virtual-list>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定输入/失焦/键盘/清空/虚拟列表/外部点击事件（render 与水合路径共用） */
  private bind(): void {
    this.input = this.shadow.querySelector('input')
    this.dropdown = this.shadow.querySelector('.dropdown')
    this.listbox = this.shadow.querySelector('.listbox')
    this.clearBtn = this.shadow.querySelector('.clear-btn')
    this.vlist = this.shadow.querySelector<OASVirtualList>('oas-virtual-list')

    this.input?.addEventListener('focus', () => this.openPanel())
    this.input?.addEventListener('blur', () => this.handleBlur())
    this.input?.addEventListener('input', () => this.handleInput())
    this.input?.addEventListener('keydown', (e: KeyboardEvent) => this.handleKey(e))
    // 点击面板/清空按钮不触发 input blur：mousedown 里 preventDefault 阻止默认失焦
    this.dropdown?.addEventListener('mousedown', (e: MouseEvent) => e.preventDefault())
    this.clearBtn?.addEventListener('mousedown', (e: MouseEvent) => e.preventDefault())
    this.clearBtn?.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation()
      this.clearValue()
    })
    // 虚拟滚动：复用 oas-virtual-list 的窗口计算，把每个可见项渲染为选项行
    this.vlist?.addEventListener('oas-item', ((
      e: CustomEvent<{ index: number; item: Option; element: HTMLElement }>,
    ) => {
      const detail = e.detail
      if (detail && detail.item && detail.element) {
        this.createOptionRow(detail.item, detail.index, this.getAttr('value', ''), detail.element)
      }
    }) as EventListener)
    this.onCleanup(() => document.removeEventListener('click', this.handleOutsideClick, true))
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
    const i = this.input
    if (!i) return
    const placeholder = this.getAttr('placeholder', this.t('select.placeholder'))
    // disabled 就近读取全局禁用注入（组件显式 disabled > 豁免 > provider 注入）
    const disabled = this.injectDisabled()
    const readonly = this.hasAttr('readonly')
    // 受控 open：readonly/disabled 下强制收起（只读优先于展开意图）
    const open = this.hasAttr('open') && !disabled && !readonly
    // 仅「收起→展开」迁移时滚动跟随选中项（宿主在展开期间的属性变更不拉扯视口）
    const opening = this.prevOpen === false && open

    // open 状态迁移 → oas-open-change（受控 setAttribute 与组件内部开合都会走到这里）
    if (this.prevOpen !== null && this.prevOpen !== open) {
      this.emit('open-change', { open })
    }
    this.prevOpen = open

    const value = this.getAttr('value', '')

    // 尺寸/校验态镜像（size 就近读取 config-provider 注入，与全局密度联动）
    const size = normalizeChoice(this.injectValue('size', 'medium'), 'medium', VALID_SIZES)
    this.setAttribute('data-size', size)
    const status = normalizeChoice(this.getAttr('status', ''), '', VALID_STATUSES)
    if (status) this.setAttribute('data-status', status)
    else this.removeAttribute('data-status')

    i.placeholder = placeholder
    i.disabled = disabled
    i.readOnly = readonly
    i.setAttribute('aria-label', placeholder)
    if (status === 'error') i.setAttribute('aria-invalid', 'true')
    else i.removeAttribute('aria-invalid')
    // 受控 value 外部变化回填 label：仅未展开且未输入时覆盖（避免打断正在输入/过滤）
    if (!open && this.query === '') {
      const label = this.labelOf(value)
      if (i.value !== label) i.value = label
    }
    if (this.clearBtn) {
      this.clearBtn.setAttribute('aria-label', this.t('input.clear'))
      this.clearBtn.hidden = !(this.hasAttr('clearable') && !disabled && value !== '')
    }

    // 展开态同步：面板显隐 / aria / 列表渲染 / 定位
    this.dropdown?.classList.toggle('open', open)
    i.setAttribute('aria-expanded', String(open))
    if (open) {
      // 高亮当前选中项（可见列表内），否则回到首项
      const idx = this.visibleOptions().findIndex((o) => o.value === value)
      this.activeIndex = Math.max(idx, 0)
      this.renderListbox()
      if (opening) this.scrollActiveIntoView()
      document.addEventListener('click', this.handleOutsideClick, true)
      this.positionDropdown()
    } else {
      document.removeEventListener('click', this.handleOutsideClick, true)
      i.removeAttribute('aria-activedescendant')
    }
  }

  /** 当前 value 对应的选项 label（无匹配项时回退原始 value，无值回空串） */
  private labelOf(value: string): string {
    if (value === '') return ''
    return this._options.find((o) => o.value === value)?.label ?? value
  }

  private parseOptions(): void {
    try {
      const parsed = JSON.parse(this.getAttr('options', '[]'))
      this._options = Array.isArray(parsed) ? parsed.filter((o): o is Option => o && typeof o.value === 'string') : []
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
    const q = this.query.trim()
    if (q === '') return this._options
    if (this._filter) return this._options.filter((o) => this._filter!(o, q))
    const lq = q.toLowerCase()
    return this._options.filter((o) => o.label.toLowerCase().includes(lq))
  }

  // ---- 开合（受控 open 属性为唯一状态源，内部开合同步写属性） ----

  private openPanel(): void {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    if (!this.hasAttr('open')) this.setAttribute('open', '')
  }

  private closePanel(): void {
    if (this.hasAttr('open')) this.removeAttribute('open')
  }

  /** 失焦/Esc/点击外部时回退为当前选中项 label（默认非破坏），并丢弃未提交的过滤词 */
  private handleBlur(): void {
    if (this.injectDisabled()) return
    this.revert()
    this.closePanel()
  }

  private revert(): void {
    if (!this.input) return
    this.query = ''
    this.input.value = this.labelOf(this.getAttr('value', ''))
  }

  private handleInput(): void {
    if (!this.input) return
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    this.query = this.input.value
    this.emit('input', { value: this.query })
    // 输入视为展开交互（焦点必然在输入框）
    this.activeIndex = 0
    if (!this.hasAttr('open')) this.setAttribute('open', '')
    else this.renderListbox()
  }

  private handleKey(e: KeyboardEvent): void {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
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
      this.closePanel()
    }
  }

  /** 键盘移动高亮：增量同步（不重建 DOM）+ 滚动跟随（虚拟窗口/普通列表两路） */
  private moveActive(dir: 1 | -1): void {
    const n = this.visibleOptions().length
    if (n === 0) return
    this.activeIndex = (this.activeIndex + dir + n) % n
    this.syncActive()
    this.scrollActiveIntoView()
  }

  private selectActive(): void {
    const option = this.visibleOptions()[this.activeIndex]
    if (option && !option.disabled) this.selectValue(option)
  }

  /** 选中：value 置 option.value（受控属性）、输入框显示 label、关闭下拉并派发 oas-change */
  private selectValue(option: Option): void {
    this.query = ''
    this.setAttribute('value', option.value)
    this.closePanel()
    if (this.input) this.input.value = option.label
    this.emit('change', { value: option.value })
  }

  /** clearable：清空 value 并派发 oas-clear（detail 为被清空前的值）+ oas-change（空值） */
  private clearValue(): void {
    if (this.injectDisabled()) return
    const prev = this.getAttr('value', '')
    this.query = ''
    this.closePanel()
    this.removeAttribute('value')
    if (this.input) {
      this.input.value = ''
      this.input.focus()
    }
    this.emit('clear', { value: prev })
    this.emit('change', { value: '' })
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.revert()
      this.closePanel()
    }
  }

  // ---- 列表渲染（普通 / 分组 / 虚拟三路） ----

  /** 虚拟滚动定高：默认 36（与 oas-virtual-list 默认一致，匹配选项行视觉高度） */
  private virtualItemHeight(): number {
    const raw = this.getAttr('item-height', '36')
    const n = Number.parseInt(raw, 10)
    return Number.isNaN(n) ? 36 : n
  }

  private renderListbox(): void {
    const listbox = this.listbox
    if (!listbox) return
    listbox.innerHTML = ''

    // loading 占位态：宿主请求期间下拉显示加载文案（role="status" 播报）
    if (this.hasAttr('loading')) {
      this.setVirtualVisible(false)
      const status = document.createElement('div')
      status.className = 'empty'
      status.setAttribute('role', 'status')
      status.textContent = this.t('combobox.loading')
      listbox.appendChild(status)
      this.syncActive()
      return
    }

    const list = this.visibleOptions()
    this.activeIndex = Math.min(this.activeIndex, Math.max(list.length - 1, 0))

    // 空态：options 为空展示 empty，过滤无匹配展示 noMatch（role="status" 供读屏播报）
    if (list.length === 0) {
      this.setVirtualVisible(false)
      const status = document.createElement('div')
      status.className = 'empty'
      status.setAttribute('role', 'status')
      status.textContent = this._options.length === 0 ? this.t('combobox.empty') : this.t('combobox.noMatch')
      listbox.appendChild(status)
      this.syncActive()
      return
    }

    // 虚拟滚动：大数据量时复用 oas-virtual-list 仅渲染可见窗口；
    // 带 group 的选项回退非虚拟全量渲染（组标题是不同行高的流式分隔，虚拟定高模型不适配）；
    // vlist 缺失（如手写 DSD 快照无此元素）时同样回退全量渲染，避免静默空下拉
    if (this.hasAttr('virtual') && this.vlist && !list.some((o) => o.group !== undefined)) {
      this.renderVirtualList(list)
      this.syncActive()
      return
    }

    this.setVirtualVisible(false)
    const value = this.getAttr('value', '')
    let prevGroup: string | undefined
    let idx = 0
    for (const option of list) {
      // 分组标题：组字段变化时插入（不可选，仅展示）
      if (option.group !== undefined && option.group !== prevGroup) {
        const groupEl = document.createElement('div')
        groupEl.className = 'option-group'
        groupEl.textContent = option.group
        listbox.appendChild(groupEl)
      }
      prevGroup = option.group
      this.createOptionRow(option, idx, value, listbox)
      idx++
    }
    this.syncActive()
  }

  /** 构建一个选项行（角色/aria/高亮/点击/增量 mousemove），非虚拟与虚拟（vlist oas-item）两路共用 */
  private createOptionRow(option: Option, optionIdx: number, value: string, container: HTMLElement): void {
    const row = document.createElement('div')
    row.className = 'option'
    if (option.group !== undefined) row.classList.add('grouped')
    row.setAttribute('part', 'option')
    row.setAttribute('role', 'option')
    row.setAttribute('aria-selected', String(option.value === value))
    row.setAttribute('aria-disabled', String(option.disabled ?? false))
    row.id = `combobox-option-${optionIdx}` // aria-activedescendant 锚点（shadow 内 id 作用域隔离）
    row.setAttribute('data-index', String(optionIdx))
    if (optionIdx === this.activeIndex) row.classList.add('active')
    row.textContent = option.label
    row.addEventListener('click', () => {
      if (option.disabled) return
      this.selectValue(option)
    })
    row.addEventListener('mousemove', () => {
      if (this.activeIndex === optionIdx) return
      this.activeIndex = optionIdx
      this.syncActive()
    })
    container.appendChild(row)
  }

  /** 虚拟模式：切到 vlist 渲染（保证行样式/视口键盘可达性）并喂入可见选项 */
  private renderVirtualList(visible: Option[]): void {
    const vlist = this.vlist
    if (!vlist) return
    this.setVirtualVisible(true)
    // 行样式注入 vlist shadow（虚拟行在 vlist shadow 内，combobox 自身样式够不到）
    const vlistRoot = vlist.shadowRoot
    if (vlistRoot && !vlistRoot.querySelector('style[data-oas-combobox-rows]')) {
      const style = document.createElement('style')
      style.setAttribute('data-oas-combobox-rows', '')
      style.textContent = VIRTUAL_ROW_STYLE
      vlistRoot.appendChild(style)
    }
    // 视口键盘可达性由 input 的 combobox 键盘流负责，去掉 vlist 内层 tabindex 避免多余 Tab 停靠点
    vlistRoot?.querySelector<HTMLElement>('.viewport')?.removeAttribute('tabindex')
    vlist.setAttribute('items-role', 'listbox')
    vlist.setAttribute('item-role', 'presentation')
    vlist.setAttribute('height', '240')
    vlist.setAttribute('item-height', String(this.virtualItemHeight()))
    vlist.items = visible
  }

  private setVirtualVisible(visible: boolean): void {
    if (this.listbox) this.listbox.hidden = visible
    if (this.vlist) this.vlist.hidden = !visible
  }

  /** 键盘导航滚动跟随：虚拟模式滚 vlist 视口，普通模式滚 listbox（高亮项保持可见） */
  private scrollActiveIntoView(): void {
    const vlist = this.vlist
    if (vlist && !vlist.hidden) {
      const ih = this.virtualItemHeight()
      const vp = vlist.shadowRoot?.querySelector<HTMLElement>('.viewport')
      if (!vp) return
      const top = this.activeIndex * ih
      const vh = vp.clientHeight || 240
      const cur = vp.scrollTop
      if (top < cur) vp.scrollTop = Math.max(0, top)
      else if (top + ih > cur + vh) vp.scrollTop = Math.max(0, top + ih - vh)
      return
    }
    if (!this.listbox) return
    const row = this.listbox.querySelector<HTMLElement>(`#combobox-option-${this.activeIndex}`)
    if (!row) return
    const top = row.offsetTop
    const bottom = row.offsetTop + row.offsetHeight
    const vh = this.listbox.clientHeight
    const cur = this.listbox.scrollTop
    if (top < cur) this.listbox.scrollTop = Math.max(0, top)
    else if (bottom > cur + vh) this.listbox.scrollTop = Math.max(0, bottom - vh)
  }

  /** 高亮/aria 增量同步（不重建 DOM）：虚拟滚动下窗口随 scroll 重算后行内 class 由 createOptionRow 落定 */
  private syncActive(): void {
    for (const row of this.renderedOptionRows()) {
      const idx = Number(row.getAttribute('data-index'))
      row.classList.toggle('active', idx === this.activeIndex)
    }
    this.syncAriaActiveDescendant()
  }

  /** 已渲染的选项行：非虚拟在 listbox、虚拟在 vlist shadow（open shadow 可跨根查询） */
  private renderedOptionRows(): HTMLElement[] {
    const out: HTMLElement[] = []
    if (this.listbox) out.push(...this.listbox.querySelectorAll<HTMLElement>('.option[data-index]'))
    const vroot = this.vlist?.shadowRoot
    if (vroot) out.push(...vroot.querySelectorAll<HTMLElement>('.option[data-index]'))
    return out
  }

  /** input 的 aria-activedescendant 指向高亮行（仅展开时），随窗口滚动保持有效 */
  private syncAriaActiveDescendant(): void {
    const i = this.input
    if (!i) return
    const n = this.visibleOptions().length
    if (this.hasAttr('open') && n > 0 && this.activeIndex >= 0 && this.activeIndex < n) {
      i.setAttribute('aria-activedescendant', `combobox-option-${this.activeIndex}`)
    } else {
      i.removeAttribute('aria-activedescendant')
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
}
