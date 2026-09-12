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

/** size 尺寸档（对齐 oas-input：small/medium/large，控高走 --oas-control-height-* token） */
const VALID_SIZES = ['small', 'medium', 'large'] as const
/** status 校验态：success / warning / error（error 联动 aria-invalid） */
const VALID_STATUSES = ['error', 'warning', 'success'] as const

/** 枚举归一化：合法值原样返回，空/非法值静默回落默认（非法值不告警，保持输出干净） */
function normalizeChoice(raw: string, fallback: string, valid: readonly string[]): string {
  if (raw === '') return fallback
  return (valid as readonly string[]).includes(raw) ? raw : fallback
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
  /* 尺寸档内部控高变量（data-size 镜像切换；不占公开 API，外部请用 size 属性） */
  --_ch: var(--oas-control-height-md);
  /* 下拉高度 CSS 变量开口：宿主覆盖即可调高（默认 240px），不占属性 API */
  --oas-select-dropdown-height: 240px;
}
:host([data-size='small']) {
  --_ch: var(--oas-control-height-sm);
}
:host([data-size='large']) {
  --_ch: var(--oas-control-height-lg);
}
.trigger {
  appearance: none;
  box-sizing: border-box;
  width: 100%;
  min-height: var(--_ch);
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
/* ---- size 尺寸档：字号/padding/chip 控高联动（默认 medium 走基础样式） ---- */
:host([data-size='small']) .trigger {
  font-size: var(--oas-font-size-sm);
  padding: 0 var(--oas-space-2);
}
:host([data-size='large']) .trigger {
  font-size: var(--oas-font-size-lg);
  padding: 0 var(--oas-space-4);
}
:host([data-size='small']) :is(.chip, .chip-plus) {
  height: 16px;
}
:host([data-size='large']) :is(.chip, .chip-plus) {
  height: 26px;
}
:host([data-size='small']) .search-input {
  font-size: var(--oas-font-size-sm);
}
:host([data-size='large']) .search-input {
  font-size: var(--oas-font-size-lg);
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
.trigger[aria-readonly='true'] {
  /* readonly：可聚焦可复制但不弹层——光标不指示可点开 */
  cursor: default;
}
/* ---- status 校验态：success / warning / error（宿主自设 aria-invalid 等效 error 视觉，置于此处统一胜出） ---- */
:host([data-status='success']) .trigger {
  border-color: var(--oas-color-success);
}
:host([data-status='success']) .trigger:focus-visible,
:host([data-status='success']) .trigger[aria-expanded='true'] {
  border-color: var(--oas-color-success);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-success) 30%, transparent);
}
:host([data-status='warning']) .trigger {
  border-color: var(--oas-color-warning);
}
:host([data-status='warning']) .trigger:focus-visible,
:host([data-status='warning']) .trigger[aria-expanded='true'] {
  border-color: var(--oas-color-warning);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-warning) 30%, transparent);
}
:host([data-status='error']) .trigger,
:host([aria-invalid='true']) .trigger {
  border-color: var(--oas-color-danger);
}
:host([data-status='error']) .trigger:focus-visible,
:host([data-status='error']) .trigger[aria-expanded='true'],
:host([aria-invalid='true']) .trigger:focus-visible,
:host([aria-invalid='true']) .trigger[aria-expanded='true'] {
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
  /* 多行标签时箭头固定首行对齐，不随触发器长高漂浮（随尺寸档控高联动） */
  align-self: flex-start;
  margin-top: calc((var(--_ch) - 12px) / 2);
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
  /* 多行标签时清除按钮固定首行对齐，不随触发器长高漂浮（与 .chevron 一致，随尺寸档联动） */
  align-self: flex-start;
  margin-top: calc((var(--_ch) - 12px) / 2);
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
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-dropdown, 1000));
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
  height: var(--_ch);
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
/* ---- 下拉头尾插槽容器（template[slot="header"/"footer"] 克隆目标；键盘焦点不进入） ---- */
.dropdown-header,
.dropdown-footer {
  padding: var(--oas-space-2) var(--oas-space-3);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-primary);
}
.dropdown-header {
  border-bottom: 1px solid var(--oas-color-border);
  margin-bottom: var(--oas-space-1);
}
.dropdown-footer {
  border-top: 1px solid var(--oas-color-border);
  margin-top: var(--oas-space-1);
}
.listbox {
  max-height: var(--oas-select-dropdown-height, 240px);
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
      'disabled-skip',
      'size',
      'status',
      'open',
      'max-count',
      'placement',
      'readonly',
      'debounce',
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

  /**
   * 自定义本地过滤函数（JS property 通道，attribute 传不了函数）：
   * `(query, option) => boolean`，query 为原始输入（trim 后未转小写），option 为完整选项对象。
   * 仅本地过滤模式生效（remote 模式数据面过滤由宿主负责）；置 null 回落默认 label includes。
   */
  filterMethod: ((query: string, option: Option) => boolean) | null = null

  /** 受控展开（property 通道反射 attribute，宿主框架 :open 绑定可达）；getter 返回当前生效展开态 */
  get open(): boolean {
    return this.openState
  }
  set open(value: boolean) {
    if (value) {
      this.setAttribute('open', '')
    } else {
      this.removeAttribute('open')
      // 属性不在场时 removeAttribute 不触发 attributeChangedCallback，非受控展开态需直接收起
      if (this.openState) {
        this.openState = false
        this.syncDropdown()
      }
    }
  }

  private activeIndex = 0
  private openState = false
  /** allow-create 时无匹配展示的「创建 xxx」行状态 */
  private createVisible = false
  private createLabel = ''
  /** allow-create 已创建选项持久层（源数据每轮重解析，创建项不随源刷新丢失） */
  private createdOptions: Option[] = []
  /** 焦点在组件内（trigger/搜索框/chip 按钮任一）：内部转移不派发 oas-focus/oas-blur */
  private focusWithin = false
  /** remote 防抖派发计时器 */
  private inputTimer: number | null = null
  /** aria-invalid 由 status=error 设置的所有权标志（清理时只移除自己设置的，不动宿主自设值） */
  private invalidByStatus = false

  /**
   * 受控 open：属性即真相——在场=展开、移除=收起（宿主手势只派发
   * oas-open-change 通知宿主，由宿主决定是否增删属性，组件不强制写回）。
   */
  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (name === 'open' && oldValue !== newValue) {
      this.openState = newValue !== null
    }
    super.attributeChangedCallback(name, oldValue, newValue)
  }

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
          <div class="dropdown-header" part="header" hidden></div>
          <div class="listbox" part="listbox" role="listbox"></div>
          <oas-virtual-list class="vlist" part="virtual-list" hidden></oas-virtual-list>
          <div class="dropdown-footer" part="footer" hidden></div>
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
      // remote 模式下过滤交给宿主：组件不本地过滤，只派发 oas-input 供宿主请求；
      // debounce > 0 时按窗口合并派发（默认 0 立即，不干扰现状；本地过滤不受影响）
      if (this.hasAttr('remote')) {
        if (this.inputTimer !== null) window.clearTimeout(this.inputTimer)
        const delay = this.inputDebounce()
        if (delay > 0) {
          this.inputTimer = window.setTimeout(() => {
            this.inputTimer = null
            this.emit('input', { value: v })
          }, delay)
        } else {
          this.emit('input', { value: v })
        }
      }
      this.renderListbox()
    })
    this.shadow
      .querySelector<HTMLInputElement>('.search-input')
      ?.addEventListener('keydown', (e: KeyboardEvent) => this.handleSearchKey(e))
    this.shadow.querySelector<HTMLButtonElement>('.clear-btn')?.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation()
      this.clearValue()
    })

    this.triggerEl?.addEventListener('click', () => this.toggle())
    this.triggerEl?.addEventListener('keydown', (e: KeyboardEvent) => this.handleTriggerKey(e))
    // 焦点事件：组件整体获得/失去焦点派发 oas-focus / oas-blur
    //（trigger↔搜索框↔chip 按钮的组件内转移不误报，离开组件才 blur）
    const wrapper = this.shadow.querySelector<HTMLElement>('.wrapper')
    wrapper?.addEventListener('focusin', () => {
      if (this.focusWithin) return
      this.focusWithin = true
      this.emit('focus')
    })
    wrapper?.addEventListener('focusout', (e: FocusEvent) => {
      if (!this.focusWithin) return
      const related = e.relatedTarget
      if (related instanceof Node && wrapper.contains(related)) return
      this.focusWithin = false
      this.emit('blur')
    })
    // 虚拟滚动：复用 oas-virtual-list 的窗口计算，把每个可见项渲染为选项行
    this.vlist?.addEventListener('oas-item', ((
      e: CustomEvent<{ index: number; item: Option; element: HTMLElement }>,
    ) => {
      const detail = e.detail
      if (detail && detail.item && detail.element) {
        this.createOptionRow(detail.item, detail.index, this.currentValues(), detail.element)
      }
    }) as EventListener)
    this.onCleanup(() => document.removeEventListener('click', this.handleOutsideClick, true))
    this.onCleanup(() => {
      if (this.inputTimer !== null) window.clearTimeout(this.inputTimer)
    })
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
    // size/status 镜像（size 就近读取 config-provider 注入，与全局密度联动）
    this.syncSizeStatus()
    // 下拉头尾插槽（header/footer template 克隆）
    this.syncDropdownChrome()
    // 内置文案走 locale registry（zh-CN 默认，setLocale 切换自动刷新）
    this.shadow.querySelector<HTMLInputElement>('.search-input')?.setAttribute('aria-label', this.t('select.search'))
    this.renderListbox()
    this.syncTrigger()
    // 展开态同步（初始 open 属性、展开中的属性变化重定位等）
    this.syncDropdown()
  }

  private toggle(): void {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    this.requestOpen(!this.openState)
  }

  /**
   * 展开/收起请求（trigger 点击/键盘/外部点击/选中收起的统一入口）。
   * 非受控：直接应用并派发 oas-open-change；受控（open 属性在场）：只派发事件不强制写回——
   * 视觉由 open 属性决定，宿主监听事件决定是否增删属性。
   */
  private requestOpen(next: boolean): void {
    if (this.hasAttribute('open')) {
      this.emit('open-change', { open: next })
      return
    }
    this.openState = next
    this.syncDropdown()
    this.emit('open-change', { open: next })
  }

  private syncDropdown(): void {
    if (!this.dropdown || !this.triggerEl) return
    const wasOpen = this.dropdown.classList.contains('open')
    this.dropdown.classList.toggle('open', this.openState)
    this.triggerEl.setAttribute('aria-expanded', String(this.openState))
    const searchInput = this.shadow.querySelector<HTMLInputElement>('.search-input')
    if (searchInput) {
      searchInput.hidden = !this.hasAttr('searchable')
      // 仅「收起→展开」瞬间聚焦搜索框；展开中的属性变化重同步不抢焦点
      if (this.openState && !wasOpen && this.hasAttr('searchable')) {
        searchInput.focus()
      }
    }
    if (this.openState) {
      document.addEventListener('click', this.handleOutsideClick, true)
      this.positionDropdown()
      // 展开时重读下拉高度变量（宿主改 --oas-select-dropdown-height 后无需触发属性变化，重开即生效）
      this.vlist?.setAttribute('height', String(this.dropdownHeight()))
      if (!wasOpen) {
        const current = this.currentValues()
        const idx = current.length > 0 ? this.visibleOptions().findIndex((o) => o.value === current[0]) : 0
        this.activeIndex = Math.max(idx, 0)
        this.scrollActiveIntoView()
        this.syncActive()
      }
    } else {
      document.removeEventListener('click', this.handleOutsideClick, true)
      this.syncAriaActiveDescendant()
    }
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.requestOpen(false)
    }
  }

  /**
   * fixed 定位：宽度对齐 trigger（同 combobox）。
   * placement：auto（默认）= 下方优先 + 空间不足自动翻转（现状行为）；
   * top / bottom = 强制方向不翻转不避让（宿主显式指定时尊重声明，可能溢出视口）。
   */
  private positionDropdown(): void {
    if (!this.dropdown || !this.triggerEl) return
    const anchorRect = this.triggerEl.getBoundingClientRect()
    const panelRect = this.dropdown.getBoundingClientRect()
    const raw = this.getAttr('placement', 'auto')
    const forced = raw === 'top' || raw === 'bottom'
    const { top, left } = computePosition(
      anchorRect,
      panelRect,
      (forced ? raw : 'bottom') as Placement,
      { width: window.innerWidth, height: window.innerHeight },
      8,
      !forced,
    )
    this.dropdown.style.top = `${top}px`
    this.dropdown.style.left = `${left}px`
    this.dropdown.style.width = `${anchorRect.width}px`
  }

  /** trigger 键盘：Esc 关闭；关闭态 Enter/Space/↑/↓ 展开（readonly 拦截）；展开态 ↑/↓ 移动、Enter 选中 */
  private handleTriggerKey(e: KeyboardEvent): void {
    if (this.injectDisabled()) return
    // 焦点在 trigger 内嵌按钮（清空/移除 chip）时不响应，交给按钮原生行为
    if ((e.target as Element).closest('.clear-btn, .chip button')) return
    if (e.key === 'Escape') {
      this.requestOpen(false)
    } else if (!this.openState) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (this.hasAttr('readonly')) return
        this.requestOpen(true)
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
      this.requestOpen(false)
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
      if (this.blockedByLimit(this.createLabel)) return
      this.createOption()
      return
    }
    const option = visible[this.activeIndex]
    if (!option || option.disabled) return
    if (this.blockedByLimit(option.value)) return
    this.selectValue(option.value)
  }

  /**
   * 当前下拉可见选项：
   * - remote 模式：不做本地过滤（过滤交给宿主，直接渲染 options）
   * - 本地模式：有查询词时按 label 过滤（filterMethod 设置时走自定义函数）
   */
  private visibleOptions(): Option[] {
    if (this.hasAttr('remote')) return this._options
    const q = this.currentQuery()
    if (q === '') return this._options
    // 自定义过滤函数（JS property 通道）：收到原始查询词与完整 option 对象
    if (typeof this.filterMethod === 'function') {
      return this._options.filter((o) => this.filterMethod?.(q, o) === true)
    }
    const lower = q.toLowerCase()
    return this._options.filter((o) => o.label.toLowerCase().includes(lower))
  }

  /** 搜索框原始查询词（trim 后，保留原始大小写供「创建」用） */
  private currentQuery(): string {
    return (this.shadow.querySelector<HTMLInputElement>('.search-input')?.getAttribute('data-query') ?? '').trim()
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
        this.fillEmpty(empty, query ? this.t('select.noMatch') : this.t('select.empty'))
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
  private createOptionRow(option: Option, optionIdx: number, values: string[], container: HTMLElement): void {
    const row = document.createElement('div')
    row.className = 'option'
    if (option.group !== undefined) row.classList.add('grouped')
    row.setAttribute('part', 'option')
    row.setAttribute('role', 'option')
    row.setAttribute('aria-selected', String(values.includes(option.value)))
    // max-count 达上限：未选项禁用置灰（已选项仍可取消），与选项自身 disabled 同视觉
    const disabledByLimit = !values.includes(option.value) && this.limitReached()
    row.setAttribute('aria-disabled', String(option.disabled === true || disabledByLimit))
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
      if (this.blockedByLimit(option.value)) return
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

  /** 空态渲染：template[slot="empty"] 克隆覆盖默认空态/无匹配文案（两态共用） */
  private fillEmpty(emptyEl: HTMLElement, fallbackText: string): void {
    const tpl = this.querySelector('template[slot="empty"]')
    if (tpl instanceof HTMLTemplateElement) {
      emptyEl.appendChild(tpl.content.cloneNode(true))
    } else {
      emptyEl.textContent = fallbackText
    }
  }

  /**
   * size/status 镜像到宿主 data-*（供 :host([data-*]) 样式消费）。
   * size 就近读取 config-provider 注入（与全局密度联动）；status=error 联动 aria-invalid——
   * 所有权标志保证清理时只移除 status 设置的，不动宿主自设的 aria-invalid。
   */
  private syncSizeStatus(): void {
    const size = normalizeChoice(this.injectValue('size', 'medium'), 'medium', VALID_SIZES)
    this.setAttribute('data-size', size)
    const status = normalizeChoice(this.getAttr('status', ''), '', VALID_STATUSES)
    if (status) this.setAttribute('data-status', status)
    else this.removeAttribute('data-status')
    if (status === 'error') {
      if (!this.hasAttribute('aria-invalid')) this.invalidByStatus = true
      this.setAttribute('aria-invalid', 'true')
    } else if (this.invalidByStatus) {
      this.invalidByStatus = false
      this.removeAttribute('aria-invalid')
    }
  }

  /**
   * 下拉头尾插槽：template[slot="header"] / template[slot="footer"] 克隆进下拉头尾
   * （header 在搜索框之下、选项之上；footer 在选项之下）。
   * 注意：键盘 ↑/↓ 导航不进入头尾区——交互内容建议建模为选项（如「全选」选项）或由宿主自管焦点。
   */
  private syncDropdownChrome(): void {
    this.syncSlotChrome('header', '.dropdown-header')
    this.syncSlotChrome('footer', '.dropdown-footer')
  }

  private syncSlotChrome(slot: string, selector: string): void {
    const container = this.shadow.querySelector<HTMLElement>(selector)
    if (!container) return
    const tpl = this.querySelector(`template[slot="${slot}"]`)
    if (tpl instanceof HTMLTemplateElement) {
      container.innerHTML = ''
      container.appendChild(tpl.content.cloneNode(true))
      container.hidden = false
    } else {
      container.innerHTML = ''
      container.hidden = true
    }
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
    vlist.setAttribute('height', String(this.dropdownHeight()))
    vlist.setAttribute('item-height', String(this.virtualItemHeight()))
    vlist.items = visible
  }

  /** 下拉高度：--oas-select-dropdown-height CSS 变量开口（默认 240px，宿主可覆盖；支持 "300px"/"300" 写法）。
   *  computed 优先（覆盖继承/类样式等场景），inline style 兜底（宿主直设 host 内联的主通道） */
  private dropdownHeight(): number {
    const raw =
      getComputedStyle(this).getPropertyValue('--oas-select-dropdown-height').trim() ||
      this.style.getPropertyValue('--oas-select-dropdown-height').trim()
    const n = Number.parseInt(raw, 10)
    return Number.isNaN(n) || n <= 0 ? 240 : n
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

  /** max-count 多选上限（仅 multiple 生效；未设置/非法值视为无上限；单选行为不变） */
  private maxCountLimit(): number | null {
    if (!this.hasAttr('multiple')) return null
    const n = this.intAttr('max-count')
    return n !== null && n > 0 ? n : null
  }

  /** 多选已达上限（当前选中数 >= max-count；已选项仍可取消，未选项禁止新增） */
  private limitReached(): boolean {
    const max = this.maxCountLimit()
    return max !== null && this.currentValues().length >= max
  }

  /** 上限拦截：超限时未选项的点击/键盘/创建一律拒绝并派发 oas-exceed-limit（detail: { value, max }） */
  private blockedByLimit(value: string): boolean {
    if (!this.limitReached() || this.currentValues().includes(value)) return false
    this.emit('exceed-limit', { value, max: this.maxCountLimit() })
    return true
  }

  /** remote 模式 oas-input 派发防抖窗口（ms；默认 0 立即派发不干扰现状） */
  private inputDebounce(): number {
    const n = this.intAttr('debounce')
    return n !== null && n > 0 ? n : 0
  }

  /** 值数组反查完整 option 对象（label/value/group/disabled 全量；未匹配为 null，宿主无需再反查） */
  private optionsOf(values: string[]): Array<Option | null> {
    return values.map((v) => this._options.find((o) => o.value === v) ?? null)
  }

  private selectValue(value: string): void {
    if (this.hasAttr('multiple')) {
      const current = this.currentValues()
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
      this.setAttribute('value', JSON.stringify(next))
      this.emit('change', { value: next, options: this.optionsOf(next) })
    } else {
      this.setAttribute('value', value)
      this.emit('change', { value, option: this.optionsOf([value])[0] })
      this.requestOpen(false)
    }
    this.syncTrigger()
    this.renderListbox()
  }

  /** clearable：清空值并派发 oas-clear（detail 为被清空前的值）+ oas-change（空值）；readonly 拦截（值只读不可改） */
  private clearValue(): void {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    const prev = this.currentValues()
    if (this.hasAttr('multiple')) {
      this.setAttribute('value', '[]')
      this.emit('clear', { value: [...prev] })
      this.emit('change', { value: [], options: [] })
    } else {
      this.removeAttribute('value')
      this.emit('clear', { value: prev[0] ?? '' })
      this.emit('change', { value: '', option: null })
    }
    this.syncTrigger()
    this.renderListbox()
    this.triggerEl?.focus()
  }

  /** allow-create：以输入值创建选项并纳入选中（max-count 达上限时拦截并派发 oas-exceed-limit） */
  private createOption(): void {
    const label = this.createLabel.trim()
    if (label === '') return
    if (this.blockedByLimit(label)) return
    // 创建项进持久层（parseOptions 每轮重解析源数据，直接 push 会被下一轮抹掉）
    if (!this.createdOptions.some((c) => c.value === label)) {
      this.createdOptions.push({ label, value: label })
    }
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
    let base: Option[]
    if (this.hasAttribute('options')) {
      try {
        const parsed = JSON.parse(this.getAttr('options', '[]'))
        base = Array.isArray(parsed) ? parsed.filter((o): o is Option => o && typeof o.value === 'string') : []
      } catch {
        base = []
      }
    } else {
      base = this.parseChildOptions()
    }
    // allow-create 创建的选项持久（源数据刷新/重渲染不丢失，已选 label 与 detail.option 可反查）；
    // 源数据后来补上同值选项时以源为准（去重）
    const created = this.createdOptions.filter((c) => !base.some((b) => b.value === c.value))
    this._options = [...base, ...created]
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
    // disabled 就近读取全局禁用注入（组件显式 disabled > 豁免 > provider 注入）
    const disabled = this.injectDisabled()
    // readonly 与 disabled 表单语义分立：可聚焦可复制、不弹层、值不可改
    const readonly = this.hasAttr('readonly')
    const values = this.currentValues()
    const valueEl = this.triggerEl.querySelector<HTMLElement>('.value')!

    this.triggerEl.disabled = disabled
    this.triggerEl.setAttribute('aria-label', placeholder)
    if (readonly) this.triggerEl.setAttribute('aria-readonly', 'true')
    else this.triggerEl.removeAttribute('aria-readonly')

    // 清空按钮：clearable && 有值 && 未禁用 && 非只读 时显示
    const clearBtn = this.shadow.querySelector<HTMLButtonElement>('.clear-btn')
    if (clearBtn) {
      clearBtn.hidden = !(this.hasAttr('clearable') && !disabled && !readonly && values.length > 0)
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
        chip.append(labelEl)
        // readonly：值只读——chip 不带移除按钮（与清空按钮一致的分立语义）
        if (!readonly) {
          const rm = document.createElement('button')
          rm.setAttribute('aria-label', this.t('select.remove', { label }))
          rm.textContent = '×'
          rm.addEventListener('click', (e: MouseEvent) => {
            e.stopPropagation()
            this.selectValue(v)
          })
          chip.append(rm)
        }
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
