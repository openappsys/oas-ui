// 注册 oas-virtual-list（OASVirtualList 仅作类型用，需裸 import 保住注册副作用）
import '../../data/virtual-list/index.js'
import type { OASVirtualList } from '../../data/virtual-list/index.js'
// 注册 oas-bottom-sheet（移动端底部抽屉承载件，需裸 import 保住注册副作用）
import '../../feedback/bottom-sheet/index.js'
import type { OASBottomSheet } from '../../feedback/bottom-sheet/index.js'
import { watchMobileSheetMode } from '../../shared/mobile-sheet.js'
import { computePosition, getViewport, type Placement } from '../../overlay/floating/index.js'
import { resolveDirection } from '../../shared/direction.js'
import { OASFormElement } from '@oas-ui/core'

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
  padding-inline-start: calc(var(--oas-space-3) + var(--oas-space-4));
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
:host([hidden]) {
  display: none;
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
/* ---- multiple 多选形态：描边/聚焦上移到 .control 容器，input 变无边框弹性过滤字段 ----
   单选形态 .control 为 display: contents（无盒、零影响）；多选时 .control 即控件本体，
   已选 chips 与过滤输入框同居一个描边容器（对齐 oas-select 多选触发器形态） */
.control {
  display: contents;
}
:host([multiple]) .control {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--oas-space-1);
  box-sizing: border-box;
  width: 100%;
  min-height: var(--oas-control-height-md);
  padding: var(--oas-space-1) var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  cursor: text;
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    box-shadow var(--oas-transition-fast) var(--oas-ease-out);
}
:host([multiple]) .control:hover {
  border-color: var(--oas-color-primary);
}
:host([multiple]) .control:focus-within {
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}
:host([multiple][data-size='small']) .control {
  min-height: var(--oas-control-height-sm);
}
:host([multiple][data-size='large']) .control {
  min-height: var(--oas-control-height-lg);
}
:host([multiple]) input {
  flex: 1 1 48px;
  min-width: 48px;
  width: auto;
  height: auto;
  min-height: calc(var(--oas-control-height-md) - 12px);
  padding: 0;
  border: none;
  background: transparent;
}
:host([multiple]) input:focus {
  box-shadow: none;
}
:host([multiple][data-size='small']) input {
  min-height: calc(var(--oas-control-height-sm) - 12px);
}
:host([multiple][data-size='large']) input {
  min-height: calc(var(--oas-control-height-lg) - 12px);
}
:host([multiple]) input:disabled {
  background: transparent;
}
/* 状态/禁用/aria-invalid 视觉上移 .control（input 无边框后 border-color 不再可见） */
:host([multiple][data-status='success']) .control {
  border-color: var(--oas-color-success);
}
:host([multiple][data-status='warning']) .control {
  border-color: var(--oas-color-warning);
}
:host([multiple][data-status='error']) .control,
:host([multiple][aria-invalid='true']) .control {
  border-color: var(--oas-color-danger);
}
:host([multiple]) .control:has(input:disabled) {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
}
/* max-tag-count 折叠模式：单行不换行、不出横向滚动条（未设置时默认换行自适应增高） */
:host([multiple][max-tag-count]) .control {
  flex-wrap: nowrap;
  overflow: hidden;
}
/* 已选标签（chip）：结构与视觉对齐 oas-select 的 .chip 契约 */
.chip {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  height: 20px;
  max-width: 100%;
  flex-shrink: 0;
  gap: var(--oas-space-1);
  background: var(--oas-color-bg-hover);
  border-radius: var(--oas-radius-sm);
  padding: 0 var(--oas-space-1);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-primary);
}
.chip > span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.chip[hidden] {
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
.chip button:hover {
  color: var(--oas-color-text-primary);
}
.chip button:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 折叠计数 chip：仅在显式设置 max-tag-count 且超量时插入 DOM */
.chip-plus {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  height: 20px;
  flex-shrink: 0;
  background: var(--oas-color-bg-hover);
  border-radius: var(--oas-radius-sm);
  padding: 0 var(--oas-space-1);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.chip-plus[hidden] {
  display: none;
}
/* clearable 时给清空按钮让位 */
:host([clearable]) input {
  padding-inline-end: var(--oas-space-8, 40px);
}
.clear-btn {
  position: absolute;
  inset-inline-end: var(--oas-space-2);
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
  box-shadow: var(--oas-shadow-md);
  /* 液态玻璃接线（容器级 surface）：变量缺省时零影响 */
  backdrop-filter: var(--oas-glass-blur, none);
  -webkit-backdrop-filter: var(--oas-glass-blur, none);
  outline: 1px solid var(--oas-glass-ring, transparent);
  outline-offset: -1px;
  padding: var(--oas-space-1);
  display: none;
}
.dropdown.open {
  display: block;
}
/* 移动形态（data-mobile-sheet）：bottom-sheet 底部抽屉承载，dropdown 变静态内嵌内容
   （容器/手势/安全区由 oas-bottom-sheet 统一承载，dropdown 不再 fixed 锚定；
   选项列表在抽屉内容区内滚动） */
:host([data-mobile-sheet]) .dropdown {
  position: static;
  z-index: auto;
  border: none;
  box-shadow: none;
  border-radius: 0;
  padding: 0;
  width: auto !important;
  top: auto !important;
  left: auto !important;
}
/* 选项行触控目标抬升：移动形态（抽屉内）选项行最小高度对齐触摸目标 token
   （--oas-touch-target-min，theme 默认 44px；flex 垂直居中保持可读），
   PC 基础行高不受影响；列表在抽屉内容区内滚动 */
:host([data-mobile-sheet]) .option {
  min-height: var(--oas-touch-target-min, 44px);
  display: flex;
  align-items: center;
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

export class OASCombobox extends OASFormElement {
  /** 原生表单集成（label for / FormData / reset / fieldset disabled）；沿静态原型链已可继承，显式声明便于阅读与检索 */
  static override formAssociated = true

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
      // multiple 多选（对齐 oas-select 多选语义：JSON 数组值 + chips + max-count/max-tag-count）
      'multiple',
      'max-count',
      'max-tag-count',
      'disabled-skip',
      // required 仅驱动原生校验链（valueMissing）
      'required',
      // name：多选 FormData「同名多条」的 entry key 在 syncFormValue 时按此读取，
      // 运行时改名须重同步（同 oas-select）；无 name 浏览器不提交，单选值通道不受影响
      'name',
      // autocomplete 透传内层 input（缺省回落 off：combobox 自绘下拉，浏览器自动补全默认关闭）
      'autocomplete',
    ]
  }

  private input: HTMLInputElement | null = null
  private dropdown: HTMLElement | null = null
  private listbox: HTMLElement | null = null
  private clearBtn: HTMLButtonElement | null = null
  private controlEl: HTMLElement | null = null
  private vlist: OASVirtualList | null = null
  /** 移动端底部抽屉承载件（oas-bottom-sheet；PC 形态 passive 透传） */
  private sheetEl: OASBottomSheet | null = null
  private _options: Option[] = []
  /** 上次 open 状态（null = 未初始化，首帧不派发 oas-open-change） */
  private prevOpen: boolean | null = null
  /** 初始 value 基线（form.reset 恢复目标；null = 空基线）：初始渲染/受控写入跟随 value 属性刷新 */
  private initialValue: string | null = null
  /** 用户交互脏标记（对齐原生 dirty value 语义）：置位后基线冻结，reset 恢复基线并清脏 */
  private valueDirty = false

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
  /** @apiProperty 自定义过滤函数：`(option, query) => boolean`；置 null 恢复默认 label 子串过滤 */
  get filter(): ((option: Option, query: string) => boolean) | null {
    return this._filter
  }
  set filter(fn: ((option: Option, query: string) => boolean) | null) {
    this._filter = typeof fn === 'function' ? fn : null
    if (this.hasAttr('open')) this.renderListbox()
  }

  /**
   * @apiProperty 当前值（公开读通道）：单选——等价既有 getFormValue() 语义，选中值（`value` 属性）
   * 优先，无选中时键入草稿兜底（datalist 语义），双空回落空串。注意 label/值分离：
   * 输入框显示的是选中项 label，此处读的是受控值本身。
   * 多选——选中值字符串数组（`value` 属性 JSON），无选中为空数组（草稿不参与多选取值）。
   */
  get value(): string | string[] {
    if (this.isMultiple()) return this.currentValues()
    // 单选：等价 getFormValue() 单选分支（选中值优先，无选中时键入草稿兜底，双空空串）
    const v = this.getAttr('value', '')
    if (v !== '') return v
    return this.query !== '' ? this.query : ''
  }

  /**
   * 程序性写值（受控赋值即生效语义）：写受控 `value` 属性并走 revert() 路径——清键入
   * 草稿、单选按 labelOf(选中值) 回显（本组件既有的受控显示路径）、多选重渲 chips。
   * 同值 `setAttribute` 不触发 attributeChangedCallback，revert() 保证赋值在任何情况下都
   * 生效。不派发任何事件。
   */
  set value(v: string | string[]) {
    if (this.isMultiple()) {
      const arr = Array.isArray(v) ? v.map((x) => String(x)) : v == null || v === '' ? [] : [String(v)]
      this.setAttribute('value', JSON.stringify(arr))
    } else {
      const next = v == null || Array.isArray(v) ? '' : String(v)
      this.setAttribute('value', next)
    }
    this.revert()
  }

  private activeIndex = 0
  /** 用户正在输入的过滤词（未选中前不覆盖受控 value，失焦/Esc 回退为选中项 label） */
  private query = ''

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="wrapper" part="wrapper">
        <div class="control" part="control">
          <input part="input" role="combobox" aria-haspopup="listbox" aria-autocomplete="list"
            aria-expanded="false" aria-controls="combobox-list" autocomplete="off" />
        </div>
        <button class="clear-btn" part="clear" type="button" hidden aria-label="">
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <oas-bottom-sheet part="sheet" passive>
          <div class="dropdown" part="dropdown">
            <div class="listbox" part="listbox" role="listbox" id="combobox-list"></div>
            <oas-virtual-list class="vlist" part="virtual-list" hidden></oas-virtual-list>
          </div>
        </oas-bottom-sheet>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定输入/失焦/键盘/清空/虚拟列表/外部点击事件（render 与水合路径共用） */
  private bind(): void {
    this.input = this.shadow.querySelector('input')
    this.dropdown = this.shadow.querySelector('.dropdown')
    this.listbox = this.shadow.querySelector('.listbox')
    this.clearBtn = this.shadow.querySelector('.clear-btn')
    this.controlEl = this.shadow.querySelector('.control')
    this.vlist = this.shadow.querySelector<OASVirtualList>('oas-virtual-list')
    // 移动端底部抽屉承载件：oas-close（下滑/backdrop/Esc）→ 同步收起
    this.sheetEl = this.shadow.querySelector<OASBottomSheet>('oas-bottom-sheet')
    this.sheetEl?.addEventListener('oas-close', () => this.closePanel())

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
        this.createOptionRow(detail.item, detail.index, this.currentValues(), detail.element)
      }
    }) as EventListener)
    this.onCleanup(() => document.removeEventListener('click', this.handleOutsideClick, true))
    // 视口/指针形态变化（缩放/横竖屏/设备仿真）时重判定移动/PC 形态（不强刷）
    this.onCleanup(watchMobileSheetMode(() => this.resyncMobileMode()))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（输入框/下拉/listbox/bottom-sheet 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('input')) return false
    if (!this.shadow.querySelector('.dropdown')) return false
    if (!this.shadow.querySelector('.listbox')) return false
    if (!this.shadow.querySelector('oas-bottom-sheet')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // 移动形态同步：coarse pointer（触屏）或窄视口（<768px）→ bottom-sheet 底部抽屉承载
    this.syncMobileMode()
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

    const multiple = this.isMultiple()
    const values = this.currentValues()
    // form.reset 恢复基线：初始渲染/受控写入（非用户交互的属性变化）跟随 value 属性刷新；
    // 用户交互置脏后基线冻结（空值/空数组映射为 null 基线）
    if (!this.valueDirty) this.initialValue = values.length === 0 ? null : this.getAttr('value', '')

    // 尺寸/校验态镜像（size 就近读取 config-provider 注入，与全局密度联动）
    const size = normalizeChoice(this.injectValue('size', 'medium'), 'medium', VALID_SIZES)
    this.setAttribute('data-size', size)
    const status = normalizeChoice(this.getAttr('status', ''), '', VALID_STATUSES)
    if (status) this.setAttribute('data-status', status)
    else this.removeAttribute('data-status')

    i.placeholder = placeholder
    i.disabled = disabled
    i.readOnly = readonly
    // autocomplete 透传：宿主显式值原样镜像；缺省回落 off（浏览器自动补全默认关闭）
    const autocomplete = this.getAttribute('autocomplete')
    i.setAttribute('autocomplete', autocomplete != null && autocomplete !== '' ? autocomplete : 'off')
    i.setAttribute('aria-label', placeholder)
    if (status === 'error') i.setAttribute('aria-invalid', 'true')
    else i.removeAttribute('aria-invalid')
    // 受控 value 外部变化回填 label：仅单选、未展开且未输入时覆盖（避免打断正在输入/过滤；
    // 多选输入框只承载过滤词，已选状态由 chips 展示）
    if (!multiple && !open && this.query === '') {
      const label = this.labelOf(values[0] ?? '')
      if (i.value !== label) i.value = label
    }
    if (this.clearBtn) {
      this.clearBtn.setAttribute('aria-label', this.t('input.clear'))
      // readonly 与 disabled 分立：只读值不可改，清空按钮一并隐藏（对齐 oas-select）
      this.clearBtn.hidden = !(this.hasAttr('clearable') && !disabled && !readonly && values.length > 0)
    }
    // 多选：已选 chips 增量重渲（readonly/disabled 不带移除按钮；max-tag-count 折叠）
    if (multiple) this.syncChips(values, readonly || disabled)

    // 展开态同步：面板显隐 / aria / 列表渲染 / 定位
    this.dropdown?.classList.toggle('open', open)
    i.setAttribute('aria-expanded', String(open))
    if (open) {
      // 高亮当前选中项（可见列表内），否则回到首项（多选取第一个已选项）
      const firstSelected = values[0] ?? ''
      const idx = this.visibleOptions().findIndex((o) => o.value === firstSelected)
      this.activeIndex = Math.max(idx, 0)
      this.renderListbox()
      if (opening) this.scrollActiveIntoView()
      document.addEventListener('click', this.handleOutsideClick, true)
      // 移动形态：bottom-sheet 承载容器（设置 open 展开底部抽屉）；PC 形态：computePosition 锚定 input
      if (this.isMobileSheet()) {
        this.sheetEl?.setAttribute('open', '')
      } else {
        this.sheetEl?.removeAttribute('open')
        this.positionDropdown()
      }
    } else {
      this.sheetEl?.removeAttribute('open')
      document.removeEventListener('click', this.handleOutsideClick, true)
      i.removeAttribute('aria-activedescendant')
    }

    // 原生表单数据 + 校验链同步（form-associated；无 name 浏览器自动不提交）
    this.syncFormValue()
    this.syncValidity()
  }

  /**
   * 表单值快照（form-associated）：
   * - 单选：选中值优先（value 属性）；无选中时草稿文本兜底（datalist 语义——草稿失焦经
   *   revert() 丢弃、此处即回 null）；双空 → null（FormData 不含此项）
   * - 多选：原生「同名多条」语义——返回含多条同名 entry 的 FormData（key 取 name 属性），
   *   无选中 → null（草稿不参与多选取值，值恒来自选项集合）；**无 name 亦返回 null**——
   *   FormData 通道由组件自建 entry，不受浏览器「无 name 不提交」兜底保护，须显式拦下避免空名 entry
   */
  protected override getFormValue(): string | FormData | null {
    if (this.isMultiple()) {
      const values = this.currentValues()
      if (values.length === 0) return null
      const name = this.getAttr('name', '')
      if (name === '') return null
      const fd = new FormData()
      for (const v of values) fd.append(name, v)
      return fd
    }
    const v = this.getAttr('value', '')
    if (v !== '') return v
    return this.query !== '' ? this.query : null
  }

  /** 原生校验链同步：required 判空——多选按选中集是否为空，单选/草稿按 getFormValue（无 name 不参与，见上） */
  private syncValidity(): void {
    // 多选不能用 getFormValue()===null 作判据：无 name 时它恒为 null，会把「有选中」误判 valueMissing
    const missing = this.isMultiple() ? this.currentValues().length === 0 : this.getFormValue() === null
    if (this.hasAttr('required') && missing) {
      this.setValidity({ valueMissing: true }, this.t('form.valueMissing'))
    } else {
      this.setValidity({})
    }
  }

  /** 表单 reset：恢复初始基线（清脏 + 按基线恢复 value 属性与显示文本），不派发事件（与原生 reset 一致） */
  protected override resetFormValue(): void {
    this.valueDirty = false
    this.query = ''
    if (this.initialValue === null) this.removeAttribute('value')
    else this.setAttribute('value', this.initialValue)
    if (this.input) {
      if (this.isMultiple()) this.input.value = ''
      else this.input.value = this.initialValue === null ? '' : this.labelOf(this.initialValue)
    }
    this.syncFormValue()
    this.syncValidity()
  }

  /** 移动形态判定：触屏（coarse pointer）或窄视口（<768px）→ 下拉由 bottom-sheet 底部抽屉承载 */
  private isMobileSheet(): boolean {
    if (typeof window === 'undefined') return false
    if (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) return true
    return window.innerWidth < 768
  }

  /** 移动形态同步：移动端 bottom-sheet 去 passive 变容器、宿主打 data-mobile-sheet（dropdown 静态化）；PC 恢复 passive */
  private syncMobileMode(): void {
    const mobile = this.isMobileSheet()
    this.toggleAttribute('data-mobile-sheet', mobile)
    this.sheetEl?.toggleAttribute('passive', !mobile)
  }

  /** 移动/PC 形态切换时重同步：重跑 update（内重判定形态 + 展开态重排承载方式） */
  private resyncMobileMode(): void {
    this.update()
  }

  /** 当前 value 对应的选项 label（无匹配项时回退原始 value，无值回空串） */
  private labelOf(value: string): string {
    if (value === '') return ''
    return this._options.find((o) => o.value === value)?.label ?? value
  }

  /** 多选形态判定（multiple 属性在场） */
  private isMultiple(): boolean {
    return this.hasAttr('multiple')
  }

  /** 当前选中值数组：多选解析 value 属性 JSON（非法/非数组回落空）；单选为 0/1 元素 */
  private currentValues(): string[] {
    const raw = this.getAttr('value', this.isMultiple() ? '[]' : '')
    if (this.isMultiple()) {
      try {
        const parsed: unknown = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
      } catch {
        return []
      }
    }
    return raw === '' ? [] : [raw]
  }

  /** 值数组反查完整 option 对象（label/value/group/disabled 全量；未匹配为 null，宿主无需再反查） */
  private optionsOf(values: string[]): Array<Option | null> {
    return values.map((v) => this._options.find((o) => o.value === v) ?? null)
  }

  /** max-count 多选上限（仅 multiple 生效；未设置/非法/<=0 视为无上限；单选行为不变） */
  private maxCountLimit(): number | null {
    if (!this.isMultiple()) return null
    const raw = this.getAttr('max-count', '').trim()
    if (raw === '') return null
    const n = Number.parseInt(raw, 10)
    return !Number.isNaN(n) && n >= 1 ? n : null
  }

  /** 多选已达上限（已选项仍可取消，未选项禁止新增） */
  private limitReached(): boolean {
    const max = this.maxCountLimit()
    return max !== null && this.currentValues().length >= max
  }

  /** 上限拦截：超限时未选项的新增一律拒绝并派发 oas-exceed-limit（detail: { value, max }） */
  private blockedByLimit(value: string): boolean {
    if (!this.limitReached() || this.currentValues().includes(value)) return false
    this.emit('exceed-limit', { value, max: this.maxCountLimit() })
    return true
  }

  /**
   * 多选已选 chips 增量重渲：先移除旧 chip，再按选中序插到 input 之前（保持输入框兜底居后）。
   * noRemove 时不带移除按钮（readonly 值只读、disabled 不可交互，均与 oas-select 的分立语义一致）；
   * max-tag-count 显式设置时超量折叠为 +N chip（title 汇总被折叠 label）。
   */
  private syncChips(values: string[], noRemove: boolean): void {
    const control = this.controlEl
    const input = this.input
    if (!control || !input) return
    for (const old of [...control.querySelectorAll<HTMLElement>('.chip')]) old.remove()
    // max-tag-count：仅显式设置时才按数量折叠；未设置时标签默认换行展示
    const rawLimit = this.getAttr('max-tag-count', '').trim()
    const limitN = rawLimit === '' ? Number.POSITIVE_INFINITY : Number.parseInt(rawLimit, 10)
    const limit = rawLimit !== '' && !Number.isNaN(limitN) && limitN >= 0 ? limitN : Number.POSITIVE_INFINITY
    const shown = values.slice(0, limit)
    const allLabels = values.map((v) => this.labelOf(v))
    for (const v of shown) {
      const label = this.labelOf(v)
      const chip = document.createElement('span')
      chip.className = 'chip'
      chip.setAttribute('part', 'chip')
      const labelEl = document.createElement('span')
      labelEl.className = 'chip-label'
      labelEl.textContent = label
      chip.appendChild(labelEl)
      if (!noRemove) {
        const rm = document.createElement('button')
        rm.setAttribute('aria-label', this.t('select.remove', { label }))
        rm.textContent = '×'
        // 与 dropdown/clear-btn 同纪律：mousedown preventDefault 阻止默认失焦——
        // 否则点移除钮先 blur input（handleBlur → closePanel），面板在移除生效前意外收起
        rm.addEventListener('mousedown', (e: MouseEvent) => e.preventDefault())
        rm.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation()
          this.removeValue(v)
        })
        chip.appendChild(rm)
      }
      control.insertBefore(chip, input)
    }
    // 折叠计数 chip：仅在显式设置 max-tag-count 且有折叠时插入
    if (rawLimit !== '' && values.length > shown.length) {
      const plus = document.createElement('span')
      plus.className = 'chip chip-plus'
      plus.textContent = `+${values.length - shown.length}`
      plus.setAttribute('title', allLabels.slice(shown.length).join('、'))
      control.insertBefore(plus, input)
    }
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

  /** 失焦/Esc/点击外部时回退：单选恢复为当前选中项 label（默认非破坏）；多选仅丢弃过滤词（输入框清空） */
  private handleBlur(): void {
    if (this.injectDisabled()) return
    this.revert()
    this.closePanel()
  }

  private revert(): void {
    if (!this.input) return
    this.query = ''
    if (this.isMultiple()) {
      this.input.value = ''
      this.syncFormValue()
      this.syncValidity()
      return
    }
    this.input.value = this.labelOf(this.getAttr('value', ''))
    // 草稿丢弃是值变化点（datalist 语义下草稿曾是表单值的一部分）
    this.syncFormValue()
    this.syncValidity()
  }

  private handleInput(): void {
    if (!this.input) return
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    this.query = this.input.value
    this.emit('input', { value: this.query })
    // datalist 语义：无选中时草稿即表单值（有选中项时选中值优先，getFormValue 内判定）
    this.syncFormValue()
    this.syncValidity()
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

  /**
   * 选中：
   * - 单选——value 置 option.value（受控属性）、输入框显示 label、关闭下拉并派发 oas-change
   *   （detail: { value }，既有口径不变）。
   * - 多选——toggle 语义（再点已选项取消）；面板保持展开、过滤词清空；oas-change detail
   *   对齐 oas-select 多选口径（{ value: string[], options: Array<Option|null> }）；
   *   max-count 达上限时未选项拒绝新增并派发 oas-exceed-limit。
   */
  private selectValue(option: Option): void {
    if (this.isMultiple()) {
      const current = this.currentValues()
      const adding = !current.includes(option.value)
      // 上限拦截放最前：被拒时不得污染 query/valueDirty（对齐 oas-select 在 selectValue 之前拦截）
      if (adding && this.blockedByLimit(option.value)) return
      // 用户选择置脏：冻结 reset 基线（须在 setAttribute 之前，防止 update 把基线刷成新值）
      this.valueDirty = true
      this.query = ''
      const next = adding ? [...current, option.value] : current.filter((v) => v !== option.value)
      this.setAttribute('value', JSON.stringify(next))
      if (this.input) this.input.value = ''
      this.emit('change', { value: next, options: this.optionsOf(next) })
      // 保持面板展开（多选连续挑选），列表按新选中态重渲
      this.renderListbox()
      this.syncFormValue()
      this.syncValidity()
      return
    }
    // 用户选择置脏：冻结 reset 基线（须在 setAttribute 之前，防止 update 把基线刷成新值）
    this.valueDirty = true
    this.query = ''
    this.setAttribute('value', option.value)
    this.closePanel()
    if (this.input) this.input.value = option.label
    this.emit('change', { value: option.value })
    // setAttribute 已触发 update 同步；属性同值不触发时兜底
    this.syncFormValue()
    this.syncValidity()
  }

  /** chip 移除按钮：移除单个已选值（多选专用），事件口径与选中 toggle 一致 */
  private removeValue(value: string): void {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    this.valueDirty = true
    const next = this.currentValues().filter((v) => v !== value)
    this.setAttribute('value', JSON.stringify(next))
    this.emit('change', { value: next, options: this.optionsOf(next) })
    this.syncFormValue()
    this.syncValidity()
  }

  /** clearable：清空值并派发 oas-clear（detail 为被清空前的值）+ oas-change（空值口径随模式）；readonly 拦截（值只读不可改） */
  private clearValue(): void {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    // 用户清空置脏：reset 应恢复清空前的基线（对齐原生「用户交互不改默认值」）
    this.valueDirty = true
    const prev = this.currentValues()
    this.query = ''
    if (this.isMultiple()) {
      this.setAttribute('value', '[]')
      if (this.input) this.input.value = ''
      this.emit('clear', { value: [...prev] })
      this.emit('change', { value: [], options: [] })
      this.renderListbox()
      this.syncFormValue()
      this.syncValidity()
      return
    }
    this.closePanel()
    this.removeAttribute('value')
    if (this.input) {
      this.input.value = ''
      this.input.focus()
    }
    this.emit('clear', { value: prev[0] ?? '' })
    this.emit('change', { value: '' })
    // value 属性原本不在场时 removeAttribute 不触发 update，兜底同步
    this.syncFormValue()
    this.syncValidity()
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
    const selected = this.currentValues()
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
      this.createOptionRow(option, idx, selected, listbox)
      idx++
    }
    this.syncActive()
  }

  /**
   * 构建一个选项行（角色/aria/高亮/点击/增量 mousemove），非虚拟与虚拟（vlist oas-item）两路共用。
   * selected 驱动 aria-selected（多选多项为 true）；max-count 达上限时未选项渲染 aria-disabled
   * （置灰拦截，已选项仍可取消）——只读渲染，不在此处派发 exceed-limit（该事件只在实际交互时发）。
   */
  private createOptionRow(option: Option, optionIdx: number, selected: string[], container: HTMLElement): void {
    const isSelected = selected.includes(option.value)
    const blockedByLimit = !isSelected && this.limitReached()
    const row = document.createElement('div')
    row.className = 'option'
    if (option.group !== undefined) row.classList.add('grouped')
    row.setAttribute('part', 'option')
    row.setAttribute('role', 'option')
    row.setAttribute('aria-selected', String(isSelected))
    row.setAttribute('aria-disabled', String(option.disabled || blockedByLimit))
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

  /** 复用浮层定位引擎：锚定输入框下方，空间不足自动翻转/避让，宽度对齐输入框、左缘对齐（bottom-start） */
  private positionDropdown(): void {
    if (!this.dropdown || !this.input) return
    if (this.isMobileSheet()) return // 移动形态由 bottom-sheet 承载，跳过 fixed 锚定
    // 多选形态锚定控件容器（chips + input 同居的描边盒子；display:contents 单选态无盒，仍锚 input）
    const anchor: HTMLElement = this.isMultiple() && this.controlEl ? this.controlEl : this.input
    const anchorRect = anchor.getBoundingClientRect()
    // 先撑宽再测量/定位：dropdown 为 auto 宽度，撑宽前测会按固有宽度算 left → 首次展开偏右。
    this.dropdown.style.width = `${anchorRect.width}px`
    const panelRect = this.dropdown.getBoundingClientRect()
    const { top, left } = computePosition(anchorRect, panelRect, 'bottom-start' as Placement, getViewport(), 8, true, {
      direction: resolveDirection(this),
    })
    this.dropdown.style.top = `${top}px`
    this.dropdown.style.left = `${left}px`
  }
}
