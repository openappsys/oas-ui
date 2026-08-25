// 注册 oas-virtual-list（OASVirtualList 仅作类型用，需裸 import 保住注册副作用）
import '../../data/virtual-list/index.js'
import type { OASVirtualList } from '../../data/virtual-list/index.js'
import { computePosition, type Placement } from '../../overlay/floating/index.js'
import { OASElement } from '@oas-ui/core'

export interface Option {
  label: string
  value: string
  disabled?: boolean
  /** 选项分组标题：同一组连续渲染组标题（不可选），组内选项缩进 */
  group?: string
}

/** 选项行样式（非虚拟模式渲染在 select 自身 shadow；虚拟模式需注入到 vlist shadow，两处共用） */
const OPTION_STYLE = `
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
.option-label {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
}
.option-label > * {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  /* compact/button-group 圆角合并协议：--oas-button-group-radius 优先，独立使用回落自身圆角 */
  border-radius: var(--oas-button-group-radius, var(--oas-radius-md));
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
/* 自定义标签模板（template[slot="tag"]）渲染时：标签容器改为 flex 布局，子元素各自省略 */
.chip .chip-label {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
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
  /* fixed + computePosition 锚定 trigger 下方：逃出祖先 overflow 容器（模态滚动 body 等），
     不再为该容器贡献溢出逼出滚动条（与 combobox 同思路，见 oas-select 定位契约） */
  position: fixed;
  z-index: var(--oas-z-dropdown, 1000);
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
${OPTION_STYLE}
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
      'virtual',
      'item-height',
    ]
  }

  private triggerEl: HTMLButtonElement | null = null
  private dropdown: HTMLElement | null = null
  private listbox: HTMLElement | null = null
  private vlist: OASVirtualList | null = null
  private _options: Option[] = []
  /** 子元素通道观察器：light DOM 里 oas-option 增删或属性/文本变化 → 重解析渲染 */
  private childObserver: MutationObserver | null = null

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
          <oas-virtual-list class="vlist" part="virtual-list" hidden></oas-virtual-list>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定触发器/搜索/清空/虚拟列表事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.triggerEl = this.shadow.querySelector('.trigger')
    this.dropdown = this.shadow.querySelector('.dropdown')
    this.listbox = this.shadow.querySelector('.listbox')
    this.vlist = this.shadow.querySelector<OASVirtualList>('oas-virtual-list')

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
    // 虚拟滚动：复用 oas-virtual-list 的窗口计算，把每个可见项渲染为选项行
    this.vlist?.addEventListener('oas-item', ((
      e: CustomEvent<{ index: number; item: Option; element: HTMLElement }>,
    ) => {
      const detail = e.detail
      if (detail && detail.item && detail.element) {
        this.createOptionRow(detail.item, detail.index, this.currentValues(), detail.element)
      }
    }) as EventListener)
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
    // 子元素通道观察器（重连后重建；options 属性显式时子元素被忽略，观察器空转无副作用）
    this.ensureChildObserver()
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
      this.positionDropdown()
      const current = this.currentValues()
      const idx =
        current.length > 0 ? this.visibleOptions().findIndex((o) => o.value === current[0]) : 0
      this.activeIndex = Math.max(idx, 0)
      this.scrollActiveIntoView()
      this.syncActive()
    } else {
      document.removeEventListener('click', this.handleOutsideClick)
      this.syncAriaActiveDescendant()
    }
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.openState = false
    }
    this.syncDropdown()
  }

  /** fixed 定位：锚定 trigger 下方，空间不足自动翻转避让，宽度对齐 trigger（同 combobox） */
  private positionDropdown(): void {
    if (!this.dropdown || !this.triggerEl) return
    const anchorRect = this.triggerEl.getBoundingClientRect()
    const panelRect = this.dropdown.getBoundingClientRect()
    const { top, left } = computePosition(anchorRect, panelRect, 'bottom' as Placement, {
      width: window.innerWidth,
      height: window.innerHeight,
    })
    this.dropdown.style.top = `${top}px`
    this.dropdown.style.left = `${left}px`
    this.dropdown.style.width = `${anchorRect.width}px`
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

  /**
   * 移动高亮：增量同步（不重建 DOM）——虚拟滚动下重建会打断窗口渲染，
   * 改走 scrollActiveIntoView + syncActive（class / aria-activedescendant / 选中态）
   */
  private moveActive(dir: 1 | -1): void {
    const n = this.navigableCount()
    if (n === 0) return
    this.activeIndex = (this.activeIndex + dir + n) % n
    this.scrollActiveIntoView()
    this.syncActive()
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
    this.createVisible = false

    // loading 占位态：remote 模式下宿主请求期间显示（文案走 locale）
    if (this.hasAttr('loading')) {
      this.setVirtualVisible(false)
      const loading = document.createElement('div')
      loading.className = 'empty'
      loading.textContent = this.t('loading.loading')
      listbox.appendChild(loading)
      this.syncActive()
      return
    }

    const visible = this.visibleOptions()
    const query = this.currentQuery()

    if (visible.length === 0) {
      this.setVirtualVisible(false)
      // allow-create：无匹配时展示「创建 xxx」行（选中后以输入值新建选项）
      if (this.hasAttr('allow-create') && query !== '') {
        this.createVisible = true
        this.createLabel = query
        const row = document.createElement('div')
        row.className = 'option create-option'
        row.setAttribute('role', 'option')
        row.setAttribute('aria-selected', 'false')
        row.id = `opt-${visible.length}` // aria-activedescendant 指向创建行
        if (this.activeIndex === visible.length) row.classList.add('active')
        const label = document.createElement('span')
        label.textContent = this.t('select.create', { label: query })
        row.append(label)
        row.addEventListener('click', () => this.createOption())
        row.addEventListener('mousemove', () => {
          this.activeIndex = visible.length
          this.syncActive()
        })
        listbox.appendChild(row)
      } else {
        const empty = document.createElement('div')
        empty.className = 'empty'
        empty.textContent = query ? this.t('select.noMatch') : this.t('select.empty')
        listbox.appendChild(empty)
      }
      this.syncActive()
      return
    }

    // 虚拟滚动：大数据量时复用 oas-virtual-list 仅渲染可见窗口；
    // 带 group 的选项回退非虚拟全量渲染（组标题是不同行高的流式分隔，虚拟定高模型不适配）；
    // vlist 缺失（如手写 DSD 快照无此元素）时同样回退全量渲染，避免静默空下拉
    if (this.hasAttr('virtual') && this.vlist && !visible.some((o) => o.group !== undefined)) {
      this.renderVirtualList(visible)
      this.syncActive()
      return
    }

    this.setVirtualVisible(false)
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
      this.createOptionRow(option, optionIdx, values, listbox)
      optionIdx++
    }
    this.syncActive()
  }

  /** 构建一个选项行（角色/aria/高亮/点击/自定义渲染），非虚拟与虚拟（vlist oas-item）两路共用 */
  private createOptionRow(
    option: Option,
    optionIdx: number,
    values: string[],
    container: HTMLElement,
  ): void {
    const row = document.createElement('div')
    row.className = 'option'
    if (option.group !== undefined) row.classList.add('grouped')
    row.setAttribute('part', 'option')
    row.setAttribute('role', 'option')
    row.setAttribute('aria-selected', String(values.includes(option.value)))
    row.setAttribute('aria-disabled', String(option.disabled ?? false))
    row.id = `opt-${optionIdx}` // aria-activedescendant 锚点（shadow 内 id 作用域隔离，无宿主冲突）
    row.setAttribute('data-index', String(optionIdx))
    if (optionIdx === this.activeIndex) row.classList.add('active')
    const label = document.createElement('span')
    label.className = 'option-label'
    this.fillOptionLabel(label, option)
    const check = document.createElement('span')
    check.className = 'check'
    check.textContent = '✓'
    row.append(label, check)
    row.addEventListener('click', () => {
      if (option.disabled) return
      this.selectValue(option.value)
    })
    row.addEventListener('mousemove', () => {
      if (this.activeIndex === optionIdx) return
      this.activeIndex = optionIdx
      this.syncActive()
    })
    container.appendChild(row)
    // 自定义选项渲染：宿主可监听改写 element（图标/富文本），机制与 virtual-list 的 oas-item 一致
    this.emit('option-render', { index: optionIdx, option, element: label })
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

  /** 虚拟模式：切到 vlist 渲染（保证行样式/视口键盘可达性）并喂入可见选项 */
  private renderVirtualList(visible: Option[]): void {
    const vlist = this.vlist
    if (!vlist) return
    this.setVirtualVisible(true)
    // 行样式注入 vlist shadow（虚拟行在 vlist shadow 内，select 自身样式够不到）
    const vlistRoot = vlist.shadowRoot
    if (vlistRoot && !vlistRoot.querySelector('style[data-oas-select-rows]')) {
      const style = document.createElement('style')
      style.setAttribute('data-oas-select-rows', '')
      style.textContent = VIRTUAL_ROW_STYLE
      vlistRoot.appendChild(style)
    }
    // 视口键盘可达性由 trigger 的 combobox 键盘流负责，去掉 vlist 内层 tabindex 避免多余 Tab 停靠点
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

  /** 虚拟滚动：让 activeIndex 所在项进入视口（设置 scrollTop，vlist 随 scroll 重算窗口） */
  private scrollActiveIntoView(): void {
    const vlist = this.vlist
    if (!vlist || vlist.hidden) return
    const ih = this.virtualItemHeight()
    const vp = vlist.shadowRoot?.querySelector<HTMLElement>('.viewport')
    if (!vp) return
    const top = this.activeIndex * ih
    const vh = vp.clientHeight || 240
    const cur = vp.scrollTop
    if (top < cur) vp.scrollTop = Math.max(0, top)
    else if (top + ih > cur + vh) vp.scrollTop = Math.max(0, top + ih - vh)
  }

  /** 高亮/aria 增量同步（不重建 DOM）：虚拟滚动下窗口随 scroll 重算后行内 class 由 createOptionRow 落定 */
  private syncActive(): void {
    for (const row of this.renderedOptionRows()) {
      const idx = Number(row.getAttribute('data-index'))
      row.classList.toggle('active', idx === this.activeIndex)
    }
    const visibleLen = this.visibleOptions().length
    const create = this.shadow.querySelector('.create-option')
    if (create) {
      create.classList.toggle('active', this.createVisible && this.activeIndex >= visibleLen)
    }
    this.syncAriaActiveDescendant()
  }

  /** 已渲染的选项行：非虚拟在 listbox、虚拟在 vlist shadow（open shadow 可跨根查询） */
  private renderedOptionRows(): HTMLElement[] {
    const out: HTMLElement[] = []
    const listbox = this.shadow.querySelector('.listbox')
    if (listbox) out.push(...listbox.querySelectorAll<HTMLElement>('.option[data-index]'))
    const vroot = this.vlist?.shadowRoot
    if (vroot) out.push(...vroot.querySelectorAll<HTMLElement>('.option[data-index]'))
    return out
  }

  /** combobox 的 aria-activedescendant 指向高亮行（仅展开时），随窗口滚动保持有效 */
  private syncAriaActiveDescendant(): void {
    if (!this.triggerEl) return
    if (!this.openState) {
      this.triggerEl.removeAttribute('aria-activedescendant')
      return
    }
    const n = this.navigableCount()
    if (n > 0 && this.activeIndex >= 0 && this.activeIndex < n) {
      this.triggerEl.setAttribute('aria-activedescendant', `opt-${this.activeIndex}`)
    } else {
      this.triggerEl.removeAttribute('aria-activedescendant')
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
    // 双通道：options 属性显式设置时数据驱动优先；否则解析子元素收敛到同一 options 模型渲染。
    // 收敛点在虚拟/非虚拟两条渲染路径之前的唯一数据入口，两路径都吃到子元素通道数据
    if (this.hasAttribute('options')) {
      try {
        const parsed = JSON.parse(this.getAttr('options', '[]'))
        this._options = Array.isArray(parsed)
          ? parsed.filter((o): o is Option => o && typeof o.value === 'string')
          : []
      } catch {
        this._options = []
      }
    } else {
      this._options = this.parseChildOptions()
    }
  }

  // ===== 子元素声明式通道 =====

  /** 解析 light DOM 的 `<oas-option>` 数据载体为 Option[]（其余 light DOM 内容忽略） */
  private parseChildOptions(): Option[] {
    const options: Option[] = []
    for (const child of Array.from(this.children)) {
      if (child.tagName === 'OAS-OPTION') options.push(this.childToOption(child))
    }
    return options
  }

  /** 单个 <oas-option> → Option（默认插槽文本为 label，属性对齐 options 字段） */
  private childToOption(el: Element): Option {
    const option: Option = { label: this.childLabel(el), value: el.getAttribute('value') ?? '' }
    if (el.hasAttribute('disabled')) option.disabled = true
    const group = el.getAttribute('group')
    if (group) option.group = group
    return option
  }

  /** 默认插槽 label 文本（trim） */
  private childLabel(el: Element): string {
    let text = ''
    for (const node of el.childNodes) {
      text += node.textContent ?? ''
    }
    return text.trim()
  }

  /**
   * 子元素通道观察器：只监听 light DOM 子元素（数据载体增删/属性/文本变化 → 重解析）。
   * 组件自身动作不写 light DOM，无需自引用守卫。
   */
  private ensureChildObserver(): void {
    if (this.childObserver) return
    const observer = new MutationObserver(() => {
      this.update()
    })
    observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
      attributeFilter: ['value', 'disabled', 'group', 'slot'],
    })
    this.childObserver = observer
    this.onCleanup(() => {
      observer.disconnect()
      this.childObserver = null
    })
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
        const label = option?.label ?? v
        const chip = document.createElement('span')
        chip.className = 'chip'
        const labelEl = document.createElement('span')
        this.fillTagLabel(labelEl, v, label)
        const rm = document.createElement('button')
        rm.setAttribute('aria-label', this.t('select.remove', { label }))
        rm.textContent = '×'
        rm.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation()
          this.selectValue(v)
        })
        chip.append(labelEl, rm)
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

  /** 标签（chip）渲染：template[slot="tag"] 克隆 + [data-tag-label] 绑定；随后派发 oas-tag-render 供宿主改写 */
  private fillTagLabel(labelEl: HTMLElement, value: string, label: string): void {
    const tpl = this.querySelector('template[slot="tag"]')
    if (tpl instanceof HTMLTemplateElement) {
      labelEl.innerHTML = ''
      labelEl.appendChild(tpl.content.cloneNode(true))
      const binder = labelEl.querySelector('[data-tag-label]')
      if (binder) binder.textContent = label
      labelEl.classList.add('chip-label')
    } else {
      labelEl.textContent = label
    }
    this.emit('tag-render', { value, label, element: labelEl })
  }

  /** label 点击聚焦委托：把焦点交给 shadow 内 trigger（配合 oas-form-item 的 label 点击代理） */
  override focus(options?: FocusOptions): void {
    this.shadow.querySelector<HTMLButtonElement>('.trigger')?.focus(options)
  }
}
