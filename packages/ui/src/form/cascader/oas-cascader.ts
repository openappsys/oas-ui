import { OASElement } from '@oas-ui/core'
import { computePosition, type Placement } from '../../overlay/floating/index.js'

export interface CascaderOption {
  label: string
  value: string
  children?: CascaderOption[]
  disabled?: boolean
  /** 懒加载标记：true=叶子（无子级、不触发加载）；false/缺省且设置 el.load 时展开会触发加载 */
  isLeaf?: boolean
}

/** 懒加载函数（仅 property 通道 `el.load = fn`）：path 为根时 option 为 null */
export type CascaderLoadFn = (node: {
  option: CascaderOption | null
  path: string[]
  depth: number
}) => Promise<CascaderOption[]>

/** 自定义搜索过滤（仅 property 通道 `el.filter = fn`）：path 为完整路径（各级 option） */
export type CascaderFilterFn = (query: string, path: CascaderOption[]) => boolean

/** 多选值策略：all=全部勾选节点；parentFirst=父级代表子级；onlyLeaf=只保留叶子 */
type ValueMode = 'all' | 'parentFirst' | 'onlyLeaf'

const VALID_SIZES = ['small', 'medium', 'large'] as const
const VALID_STATUSES = ['error', 'warning', 'success'] as const
const VALID_VALUE_MODES = ['all', 'parentFirst', 'onlyLeaf'] as const
/** 悬停展开延时：跨行扫过时避免误展开（近似悬停安全区） */
const HOVER_EXPAND_DELAY = 120

/** 枚举归一化：合法值原样返回，空/非法回落默认（静默，不告警） */
function pickValid(raw: string, fallback: string, valid: readonly string[]): string {
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
.trigger[disabled] {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
/* ---- size 尺寸档位（默认 medium 走基础样式；高度对齐 --oas-control-height-* token） ---- */
:host([data-size='small']) .trigger {
  min-height: var(--oas-control-height-sm);
  font-size: var(--oas-font-size-sm);
}
:host([data-size='large']) .trigger {
  min-height: var(--oas-control-height-lg);
  font-size: var(--oas-font-size-lg);
}
/* ---- status 校验态：error / warning / success（error 兼容宿主 aria-invalid 通道） ---- */
:host([data-status='error']) .trigger {
  border-color: var(--oas-color-danger);
}
:host([data-status='error']) .trigger[aria-expanded='true'] {
  border-color: var(--oas-color-danger);
}
:host([data-status='error']) .trigger:focus-visible {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
:host([data-status='warning']) .trigger {
  border-color: var(--oas-color-warning);
}
:host([data-status='warning']) .trigger[aria-expanded='true'] {
  border-color: var(--oas-color-warning);
}
:host([data-status='warning']) .trigger:focus-visible {
  border-color: var(--oas-color-warning);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-warning) 30%, transparent);
}
:host([data-status='success']) .trigger {
  border-color: var(--oas-color-success);
}
:host([data-status='success']) .trigger[aria-expanded='true'] {
  border-color: var(--oas-color-success);
}
:host([data-status='success']) .trigger:focus-visible {
  border-color: var(--oas-color-success);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-success) 30%, transparent);
}
:host([aria-invalid='true']) .trigger {
  border-color: var(--oas-color-danger);
}
:host([aria-invalid='true']) .trigger[aria-expanded='true'] {
  border-color: var(--oas-color-danger);
}
:host([aria-invalid='true']) .trigger:focus-visible {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
.placeholder {
  color: var(--oas-color-text-secondary);
}
.value {
  display: flex;
  flex-wrap: wrap;
  gap: var(--oas-space-1);
  min-width: 0;
  flex: 1;
  text-align: left;
  /* 多行标签时省略单行末级文本 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}
:host([max-tag-count]) .value {
  flex-wrap: nowrap;
  /* max-tag-count 折叠模式：单行不换行、不出横向滚动条，放不下的标签折叠为 +N */
  overflow: hidden;
}
.chevron {
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
  /* 多行标签时箭头固定首行对齐，不随触发器长高漂浮（与 select 一致）；12px 为箭头高度 */
  align-self: flex-start;
  margin-top: calc((var(--oas-control-height-md) - 12px) / 2);
  flex-shrink: 0;
}
:host([data-size='small']) .chevron {
  margin-top: calc((var(--oas-control-height-sm) - 12px) / 2);
}
:host([data-size='large']) .chevron {
  margin-top: calc((var(--oas-control-height-lg) - 12px) / 2);
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
  color: var(--oas-color-text-secondary);
  font-size: 1em;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--oas-radius-sm);
  flex-shrink: 0;
  /* 多行标签时清空按钮固定首行对齐（与 .chevron 一致） */
  align-self: flex-start;
  margin-top: calc((var(--oas-control-height-md) - 12px) / 2);
}
:host([data-size='small']) .clear-btn {
  margin-top: calc((var(--oas-control-height-sm) - 12px) / 2);
}
:host([data-size='large']) .clear-btn {
  margin-top: calc((var(--oas-control-height-lg) - 12px) / 2);
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
/* ---- 多选标签（chips） ---- */
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
.chip[hidden] {
  display: none;
}
.chip .chip-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.chip .remove {
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0 2px;
  color: var(--oas-color-text-secondary);
  font-size: 1em;
  line-height: 1;
  display: inline-flex;
  align-items: center;
}
.chip .remove:hover {
  color: var(--oas-color-text-primary);
}
/* 折叠计数 chip：仅在显式设置 max-tag-count 且需要折叠时插入 */
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
  cursor: default;
}
.chip-plus[hidden] {
  display: none;
}
/* 复用浮层定位引擎：fixed + computePosition 锚定 trigger 下方，逃出祖先 overflow 容器，
   空间不足自动翻转避让（与 combobox/select 同一浮层契约） */
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
.search-input[hidden] {
  display: none;
}
.panels {
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
.search-results {
  min-width: 180px;
  max-height: 240px;
  overflow-y: auto;
  padding: var(--oas-space-1);
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
  gap: var(--oas-space-1);
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
.option .label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.arrow {
  margin-left: var(--oas-space-2);
  font-size: var(--oas-font-size-xs);
  color: inherit;
  opacity: 0.7;
  flex-shrink: 0;
}
/* 多选复选框（视觉态由行 aria-selected 驱动，样式与 tree-select 一致） */
.check {
  width: 16px;
  height: 16px;
  border: 1px solid var(--oas-color-border);
  border-radius: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  color: var(--oas-color-text-on-primary);
  font-size: var(--oas-font-size-xs);
  box-sizing: border-box;
}
.option[aria-selected='true'] .check {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
}
.check.half {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  opacity: 0.6;
}
.empty {
  padding: var(--oas-space-3);
  text-align: center;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  min-width: 120px;
}
`

export class OASCascader extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'placeholder',
      'options',
      'disabled',
      'change-on-select',
      'show-all-levels',
      'disabled-skip',
      'multiple',
      'check-strictly',
      'value-mode',
      'filterable',
      'clearable',
      'separator',
      'expand-trigger',
      'size',
      'status',
      'open',
      'max-tag-count',
    ]
  }

  private triggerEl: HTMLButtonElement | null = null
  private dropdown: HTMLElement | null = null
  private panelsEl: HTMLElement | null = null
  private searchInputEl: HTMLInputElement | null = null
  private _options: CascaderOption[] = []

  /** Vue/React 会把 options 识别为实例属性走 property 赋值；setter 反射到 attribute 统一解析链路 */
  get options(): CascaderOption[] {
    return this._options
  }
  set options(value: CascaderOption[] | string) {
    this.setAttribute('options', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** 懒加载函数（仅 property 通道） */
  private _load: CascaderLoadFn | null = null
  get load(): CascaderLoadFn | null {
    return this._load
  }
  set load(fn: CascaderLoadFn | null) {
    this._load = typeof fn === 'function' ? fn : null
    if (this.hasRendered) this.syncDropdown()
  }

  /** 自定义搜索过滤（仅 property 通道） */
  private _filter: CascaderFilterFn | null = null
  get filter(): CascaderFilterFn | null {
    return this._filter
  }
  set filter(fn: CascaderFilterFn | null) {
    this._filter = typeof fn === 'function' ? fn : null
    if (this.hasRendered && this.isOpen()) this.renderPanels()
  }

  override connectedCallback(): void {
    super.connectedCallback()
    // 升级前被赋过的函数 property（expando 遮蔽原型访问器，setter 不会触发）回收到 property 通道
    for (const name of ['load', 'filter'] as const) {
      if (Object.prototype.hasOwnProperty.call(this, name)) {
        const own = (this as unknown as Record<string, unknown>)[name]
        delete (this as unknown as Record<string, unknown>)[name]
        ;(this as unknown as Record<string, unknown>)[name] = own
      }
    }
  }

  private lastOpenState = false
  private activePath: string[] = []
  private activePanel = 0
  private activeRow = 0
  private panelsData: CascaderOption[][] = []
  private searchResults: string[][] = []
  private searchActive = 0
  /** 搜索词（filterable 时非空则渲染扁平路径结果） */
  private query = ''
  /** 懒加载运行态：路径 → 已加载子级 / 加载中 / 根级加载中 */
  private loadedChildren = new Map<string, CascaderOption[]>()
  private loadingPaths = new Set<string>()
  private loadedRoots: CascaderOption[] | null = null
  private loadingRoot = false
  /** 悬停展开计时（expand-trigger=hover） */
  private hoverTimer: ReturnType<typeof setTimeout> | null = null
  private hoverPendingDepth: number | null = null

  constructor() {
    super()
    // 宿主预设 open 属性时首帧即为展开态：不产生 open-change 事件（与受控组件惯例一致）
    this.lastOpenState = this.hasAttribute('open')
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="wrapper" part="wrapper">
        <button class="trigger" part="trigger" type="button" role="combobox" aria-haspopup="listbox" aria-expanded="false">
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
        <div class="dropdown" part="dropdown" tabindex="-1">
          <input class="search-input" part="search-input" type="text" hidden autocomplete="off" />
          <div class="panels" part="panels"></div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定触发器/面板键盘/搜索/清空/外部点击事件（render 与水合路径共用） */
  private bind(): void {
    this.triggerEl = this.shadow.querySelector('.trigger')
    this.dropdown = this.shadow.querySelector('.dropdown')
    this.panelsEl = this.shadow.querySelector('.panels')
    this.searchInputEl = this.shadow.querySelector('.search-input')

    this.dropdown?.addEventListener('keydown', (e: KeyboardEvent) => this.handleDropdownKey(e))
    this.triggerEl?.addEventListener('click', () => this.toggle())
    this.triggerEl?.addEventListener('keydown', (e: KeyboardEvent) => this.handleTriggerKey(e))
    this.shadow.querySelector('.clear-btn')?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.clearValue()
    })
    this.searchInputEl?.addEventListener('input', () => this.handleSearchInput())
    this.searchInputEl?.addEventListener('keydown', (e: KeyboardEvent) => this.handleSearchKey(e))
    this.onCleanup(() => {
      document.removeEventListener('click', this.handleOutsideClick, true)
      this.cancelHover()
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（trigger/dropdown/panels 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.trigger')) return false
    if (!this.shadow.querySelector('.dropdown')) return false
    if (!this.shadow.querySelector('.panels')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.parseOptions()
    this.mirrorSizeStatus()
    this.searchInputEl?.setAttribute('aria-label', this.t('select.search'))
    this.syncTrigger()
    this.syncDropdown()
  }

  // ---------- 配置读取 ----------

  private isOpen(): boolean {
    return this.hasAttr('open')
  }

  private isMultiple(): boolean {
    return this.hasAttr('multiple')
  }

  private isStrictly(): boolean {
    return this.isMultiple() && this.hasAttr('check-strictly')
  }

  private valueMode(): ValueMode {
    return pickValid(this.getAttr('value-mode', 'all'), 'all', VALID_VALUE_MODES) as ValueMode
  }

  private separatorText(): string {
    return this.getAttr('separator', ' / ')
  }

  /** 默认 true（完整路径，与存量行为一致）；show-all-levels="false" 收窄为仅末级 */
  private showAllLevels(): boolean {
    return this.getAttr('show-all-levels', 'true') !== 'false'
  }

  private isFilterable(): boolean {
    return this.hasAttr('filterable')
  }

  private searchMode(): boolean {
    return this.isFilterable() && this.query.trim() !== ''
  }

  // ---------- 数据解析 ----------

  private parseOptions(): void {
    try {
      const parsed = JSON.parse(this.getAttr('options', '[]'))
      this._options = this.normalizeOptionList(parsed)
    } catch {
      this._options = []
    }
  }

  private normalizeOptionList(input: unknown): CascaderOption[] {
    return Array.isArray(input) ? input.filter((o): o is CascaderOption => !!o && typeof o.value === 'string') : []
  }

  private currentPath(): string[] {
    try {
      const parsed = JSON.parse(this.getAttr('value', '[]'))
      return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []
    } catch {
      return []
    }
  }

  private currentPaths(): string[][] {
    try {
      const parsed = JSON.parse(this.getAttr('value', '[]'))
      return Array.isArray(parsed)
        ? parsed.filter((p): p is string[] => Array.isArray(p) && p.every((v) => typeof v === 'string'))
        : []
    } catch {
      return []
    }
  }

  // ---------- 树解析（含懒加载合并） ----------

  private roots(): CascaderOption[] {
    return this._options.length > 0 ? this._options : (this.loadedRoots ?? [])
  }

  /** 节点子级：静态 children 优先，其次懒加载结果（path 为到该节点的完整路径） */
  private childrenOf(option: CascaderOption, path: string[]): CascaderOption[] {
    if (option.children?.length) return option.children
    return this.loadedChildren.get(kOf(path)) ?? []
  }

  private needLazyLoad(path: string[], option: CascaderOption): boolean {
    if (option.children?.length) return false
    if (option.isLeaf === true) return false
    if (!this._load) return false
    const key = kOf(path)
    return !this.loadedChildren.has(key) && !this.loadingPaths.has(key)
  }

  private isExpandable(option: CascaderOption, path: string[]): boolean {
    if (option.children?.length) return true
    if (this.needLazyLoad(path, option)) return true
    return this.childrenOf(option, path).length > 0
  }

  private nodeAt(path: string[]): CascaderOption | undefined {
    let list = this.roots()
    let node: CascaderOption | undefined
    const walked: string[] = []
    for (const v of path) {
      node = list.find((o) => o.value === v)
      if (!node) return undefined
      walked.push(v)
      list = this.childrenOf(node, walked)
    }
    return node
  }

  /** 可勾选后代路径（排除 disabled 节点本身；disabled 子树的后代仍可勾选，与 tree-select 一致） */
  private selectableDescendantPaths(path: string[], node: CascaderOption): string[][] {
    const out: string[][] = []
    const walk = (list: CascaderOption[], prefix: string[]): void => {
      for (const o of list) {
        const p = [...prefix, o.value]
        if (!o.disabled) out.push(p)
        walk(this.childrenOf(o, p), p)
      }
    }
    walk(this.childrenOf(node, path), path)
    return out
  }

  // ---------- 勾选模型（多选） ----------

  /** 内部完整勾选键集（策略无关，驱动复选框展示）：value 出发的级联闭包 + 自底向上归一化 */
  private checkedKeySet(): Set<string> {
    const paths = this.currentPaths()
    if (this.isStrictly()) return new Set(paths.map(kOf))
    const checked = new Set<string>()
    for (const p of paths) {
      checked.add(kOf(p))
      const node = this.nodeAt(p)
      if (node) for (const d of this.selectableDescendantPaths(p, node)) checked.add(kOf(d))
    }
    this.normalizeCascade(checked)
    return checked
  }

  /** 自底向上归一化：全部可勾选子级选中时父级入集，否则移出（半选不出现在键集） */
  private normalizeCascade(checked: Set<string>): void {
    const walk = (list: CascaderOption[], prefix: string[]): void => {
      for (const o of list) {
        const path = [...prefix, o.value]
        const kids = this.childrenOf(o, path).filter((c) => !c.disabled)
        if (kids.length === 0) continue
        walk(kids, path)
        if (kids.every((k) => checked.has(kOf([...path, k.value])))) checked.add(kOf(path))
        else checked.delete(kOf(path))
      }
    }
    walk(this.roots(), [])
  }

  /** 勾选键集 → 按 value-mode 派生对外值（DFS 序）；树外未知路径原样保留 */
  private applyStrategy(checked: Set<string>): string[][] {
    const out: string[][] = []
    const mode = this.valueMode()
    const walk = (list: CascaderOption[], prefix: string[]): void => {
      for (const o of list) {
        const path = [...prefix, o.value]
        const kids = this.childrenOf(o, path)
        if (checked.has(kOf(path))) {
          if (mode === 'onlyLeaf') {
            if (kids.length === 0) out.push(path)
          } else if (mode === 'parentFirst') {
            if (prefix.length === 0 || !checked.has(kOf(prefix))) out.push(path)
          } else {
            out.push(path)
          }
        }
        if (kids.length > 0) walk(kids, path)
      }
    }
    walk(this.roots(), [])
    const known = new Set(out.map(kOf))
    for (const p of this.currentPaths()) {
      if (!known.has(kOf(p)) && !this.nodeAt(p)) out.push(p)
    }
    return out
  }

  /** 展示用路径集：字面 value（chips 与 value 严格一致，与 tree-select 同约定）；
   *  级联收敛（子级全选父级进值）只在交互提交时发生，不改写宿主预设的展示 */
  private displayPaths(): string[][] {
    return this.currentPaths()
  }

  private isHalfChecked(path: string[], checked: Set<string>): boolean {
    if (this.isStrictly()) return false
    const node = this.nodeAt(path)
    if (!node) return false
    return this.selectableDescendantPaths(path, node).some((d) => checked.has(kOf(d)))
  }

  /** 切换勾选：strict 字面翻转；级联翻转整棵子树后归一化再按策略提交 */
  private toggleCheck(path: string[]): void {
    const key = kOf(path)
    if (this.isStrictly()) {
      const cur = this.currentPaths()
      const next = cur.some((p) => kOf(p) === key) ? cur.filter((p) => kOf(p) !== key) : [...cur, path]
      this.commitMultiple(next)
      return
    }
    const checked = this.checkedKeySet()
    const node = this.nodeAt(path)
    if (checked.has(key)) {
      checked.delete(key)
      if (node) for (const d of this.selectableDescendantPaths(path, node)) checked.delete(kOf(d))
    } else {
      // 级联模式下子级未加载的父节点语义不确定（无法级联到未知后代）：先展开加载，不做勾选
      if (node && this.needLazyLoad(path, node)) return
      checked.add(key)
      if (node) for (const d of this.selectableDescendantPaths(path, node)) checked.add(kOf(d))
    }
    this.normalizeCascade(checked)
    this.commitMultiple(this.applyStrategy(checked))
  }

  private commitMultiple(paths: string[][]): void {
    this.setAttribute('value', JSON.stringify(paths))
    this.emit('change', { value: paths })
  }

  private commitSingle(path: string[]): void {
    this.setAttribute('value', JSON.stringify(path))
    this.emit('change', { value: path })
    this.setOpen(false)
  }

  // ---------- 懒加载 ----------

  private ensureRootLazyLoad(): void {
    const fn = this._load
    if (!fn) return
    if (this.roots().length > 0 || this.loadedRoots || this.loadingRoot) return
    this.loadingRoot = true
    // 打开瞬间已渲染过空态：置 loading 后立即重渲染，保证首帧即「加载中」
    if (this.hasRendered && this.isOpen()) this.renderPanels()
    fn({ option: null, path: [], depth: 0 }).then(
      (children) => {
        this.loadedRoots = this.normalizeOptionList(children)
        this.loadingRoot = false
      },
      () => {
        this.loadingRoot = false
      },
    )
    // 加载落定后若仍展开则重渲染（.then 链尾统一处理）
    void this.rerenderAfterLoad()
  }

  private loadChildren(path: string[], option: CascaderOption): void {
    const fn = this._load
    if (!fn) return
    const key = kOf(path)
    this.loadingPaths.add(key)
    fn({ option, path, depth: path.length }).then(
      (children) => {
        this.loadedChildren.set(key, this.normalizeOptionList(children))
        this.loadingPaths.delete(key)
      },
      () => {
        this.loadingPaths.delete(key)
      },
    )
    void this.rerenderAfterLoad()
  }

  /** 懒加载链尾：冲刷微任务后在仍展开时重渲染面板 */
  private async rerenderAfterLoad(): Promise<void> {
    await Promise.resolve()
    await Promise.resolve()
    await new Promise((r) => setTimeout(r, 0))
    if (this.isOpen()) this.renderPanels()
  }

  // ---------- 开合（受控 open 属性为唯一状态源） ----------

  private setOpen(open: boolean): void {
    if (this.hasAttr('open') === open) return
    if (open) this.setAttribute('open', '')
    else this.removeAttribute('open')
  }

  private toggle(): void {
    if (this.injectDisabled()) return
    this.setOpen(!this.isOpen())
  }

  /** 展开态同步：面板显隐、aria、首帧渲染/聚焦、浮层定位、oas-open-change（仅状态翻转时派发） */
  private syncDropdown(): void {
    const dropdown = this.dropdown
    const trigger = this.triggerEl
    if (!dropdown || !trigger) return
    const open = this.isOpen()
    const transitioned = open !== this.lastOpenState
    dropdown.classList.toggle('open', open)
    trigger.setAttribute('aria-expanded', String(open))
    if (this.searchInputEl) this.searchInputEl.hidden = !(open && this.isFilterable())
    if (transitioned && open) {
      this.initTrail()
      this.renderPanels()
      if (this.isFilterable()) this.searchInputEl?.focus()
      else dropdown.focus()
    }
    if (open) {
      document.addEventListener('click', this.handleOutsideClick, true)
      this.ensureRootLazyLoad()
    } else {
      document.removeEventListener('click', this.handleOutsideClick, true)
      this.cancelHover()
    }
    if (open && !transitioned) this.renderPanels()
    if (open) this.positionDropdown()
    this.lastOpenState = open
    if (transitioned) this.emit('open-change', { open })
  }

  /** 打开时的浏览轨迹初始化：单选对齐当前值路径；多选对齐首个勾选路径 */
  private initTrail(): void {
    this.activePath = this.isMultiple() ? (this.currentPaths()[0] ?? []) : this.currentPath()
    this.activePanel = 0
    this.activeRow = 0
    this.query = ''
    this.searchActive = 0
    if (this.searchInputEl) this.searchInputEl.value = ''
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.setOpen(false)
    }
  }

  /** 复用浮层定位引擎：锚定 trigger 下方，空间不足自动翻转/避让；最小宽度对齐 trigger（面板可自然加宽） */
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
    this.dropdown.style.minWidth = `${anchorRect.width}px`
  }

  // ---------- 面板渲染 ----------

  private renderPanels(): void {
    const container = this.panelsEl
    if (!container) return
    container.innerHTML = ''
    this.panelsData = []
    this.searchResults = []

    if (this.searchMode()) {
      this.renderSearchResults(container)
      if (this.isOpen()) this.positionDropdown()
      return
    }

    const roots = this.roots()
    if (roots.length === 0) {
      container.appendChild(this.statusEl(this.loadingRoot ? this.t('loading.loading') : this.t('empty.noData')))
      if (this.isOpen()) this.positionDropdown()
      return
    }

    let list = roots
    for (let depth = 0; ; depth++) {
      this.renderColumn(container, list, depth)
      this.panelsData.push(list)
      const sel = this.activePath[depth]
      if (sel === undefined) break
      const node = list.find((o) => o.value === sel)
      if (!node) break
      const childPath = this.activePath.slice(0, depth + 1)
      const kids = this.childrenOf(node, childPath)
      if (kids.length > 0) {
        list = kids
        continue
      }
      if (this.loadingPaths.has(kOf(childPath))) {
        const loading = this.statusEl(this.t('loading.loading'))
        loading.classList.add('panel', 'loading-col')
        loading.removeAttribute('role')
        container.appendChild(loading)
      }
      break
    }
    this.syncActiveHighlight()
    if (this.isOpen()) this.positionDropdown()
  }

  private statusEl(text: string): HTMLElement {
    const status = document.createElement('div')
    status.className = 'empty'
    status.setAttribute('role', 'status')
    status.textContent = text
    return status
  }

  private renderColumn(container: HTMLElement, list: CascaderOption[], depth: number): void {
    const panel = document.createElement('div')
    panel.className = 'panel'
    panel.setAttribute('part', 'panel')
    panel.setAttribute('role', 'listbox')
    if (this.isMultiple()) panel.setAttribute('aria-multiselectable', 'true')
    const checked = this.checkedKeySet()
    const selected = this.activePath[depth]
    list.forEach((option, index) => {
      const path = [...this.activePath.slice(0, depth), option.value]
      panel.appendChild(this.createRow(option, path, depth, index, checked, selected))
    })
    container.appendChild(panel)
  }

  /** 构建一个选项行（多选含复选框；展开式节点带箭头），click/mouseenter 行为按模式分派 */
  private createRow(
    option: CascaderOption,
    path: string[],
    depth: number,
    index: number,
    checked: Set<string>,
    selected: string | undefined,
  ): HTMLElement {
    const expandable = this.isExpandable(option, path)
    const row = document.createElement('div')
    row.className = 'option'
    row.setAttribute('role', 'option')
    row.setAttribute('aria-selected', String(this.isMultiple() ? checked.has(kOf(path)) : option.value === selected))
    row.setAttribute('aria-disabled', String(option.disabled ?? false))
    row.setAttribute('data-index', String(index))

    if (this.isMultiple()) {
      const check = document.createElement('span')
      check.className = 'check'
      check.setAttribute('aria-hidden', 'true')
      const on = checked.has(kOf(path))
      const half = !on && this.isHalfChecked(path, checked)
      check.classList.toggle('half', half)
      check.textContent = on ? '✓' : half ? '—' : ''
      check.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation()
        if (option.disabled) return
        this.toggleCheck(path)
      })
      row.appendChild(check)
    }

    const label = document.createElement('span')
    label.className = 'label'
    label.textContent = option.label
    row.appendChild(label)

    if (expandable) {
      const arrow = document.createElement('span')
      arrow.className = 'arrow'
      arrow.setAttribute('aria-hidden', 'true')
      arrow.textContent = '›'
      row.appendChild(arrow)
    }

    row.addEventListener('click', () => {
      if (option.disabled) return
      if (expandable) {
        this.drill(depth, option)
        // 单选 + change-on-select：点击任意层级（含父级）立即提交当前路径
        if (!this.isMultiple() && this.hasAttr('change-on-select')) this.commitSingle([...this.activePath])
        return
      }
      if (this.isMultiple()) this.toggleCheck(path)
      else this.commitSingle(path)
    })

    row.addEventListener('mouseenter', () => {
      // 同列/更浅列的悬停取代 pending 展开；更深列（子级面板内）不打断父级
      if (this.hoverPendingDepth !== null && depth <= this.hoverPendingDepth) this.cancelHover()
      if (this.getAttr('expand-trigger', 'click') !== 'hover' || option.disabled || !expandable) return
      this.scheduleHoverExpand(depth, option)
    })

    return row
  }

  private renderSearchResults(container: HTMLElement): void {
    this.searchResults = this.searchResultPaths()
    if (this.searchResults.length === 0) {
      container.appendChild(this.statusEl(this.t('select.noMatch')))
      return
    }
    const listbox = document.createElement('div')
    listbox.className = 'search-results'
    listbox.setAttribute('role', 'listbox')
    if (this.isMultiple()) listbox.setAttribute('aria-multiselectable', 'true')
    const checked = this.checkedKeySet()
    const singleValue = kOf(this.currentPath())
    this.searchResults.forEach((path, index) => {
      const row = document.createElement('div')
      row.className = 'option'
      row.setAttribute('role', 'option')
      row.setAttribute('aria-selected', String(this.isMultiple() ? checked.has(kOf(path)) : kOf(path) === singleValue))
      row.setAttribute('data-index', String(index))
      if (index === this.searchActive) row.classList.add('active')
      const label = document.createElement('span')
      label.className = 'label'
      label.textContent = this.pathToText(path)
      row.appendChild(label)
      row.addEventListener('click', () => {
        if (this.isMultiple()) this.toggleCheck(path)
        else this.commitSingle(path)
      })
      row.addEventListener('mousemove', () => {
        if (this.searchActive === index) return
        this.searchActive = index
        this.syncSearchActive()
      })
      listbox.appendChild(row)
    })
    container.appendChild(listbox)
    this.syncSearchActive()
  }

  /** 搜索：路径各级 label 拼接匹配（默认），或 el.filter 自定义（仅已加载节点参与） */
  private searchResultPaths(): string[][] {
    const query = this.query.trim()
    const out: string[][] = []
    const lower = query.toLowerCase()
    const walk = (list: CascaderOption[], prefix: string[], optPath: CascaderOption[]): void => {
      for (const o of list) {
        const path = [...prefix, o.value]
        const op = [...optPath, o]
        const hit = this._filter ? this._filter(query, op) : op.some((n) => n.label.toLowerCase().includes(lower))
        if (hit) out.push(path)
        walk(this.childrenOf(o, path), path, op)
      }
    }
    walk(this.roots(), [], [])
    return out
  }

  // ---------- 交互 ----------

  private drill(depth: number, option: CascaderOption): void {
    this.cancelHover()
    this.activePath[depth] = option.value
    this.activePath.length = depth + 1
    this.activePanel = depth + 1
    this.activeRow = 0
    const path = [...this.activePath]
    if (this.needLazyLoad(path, option)) this.loadChildren(path, option)
    this.renderPanels()
  }

  private scheduleHoverExpand(depth: number, option: CascaderOption): void {
    this.cancelHover()
    this.hoverPendingDepth = depth
    this.hoverTimer = setTimeout(() => {
      this.hoverTimer = null
      this.hoverPendingDepth = null
      this.drill(depth, option)
    }, HOVER_EXPAND_DELAY)
  }

  private cancelHover(): void {
    if (this.hoverTimer !== null) {
      clearTimeout(this.hoverTimer)
      this.hoverTimer = null
    }
    this.hoverPendingDepth = null
  }

  private handleTriggerKey(e: KeyboardEvent): void {
    if (this.injectDisabled()) return
    // 焦点在 trigger 内嵌按钮（清空/移除 chip）时不响应，交给按钮原生行为
    if ((e.target as Element).closest('.clear-btn, .chip .remove')) return
    if (e.key === 'Escape') {
      this.setOpen(false)
    } else if (!this.isOpen()) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        this.setOpen(true)
      }
    }
  }

  private handleDropdownKey(e: KeyboardEvent): void {
    if (this.injectDisabled()) return
    // 搜索框自有键盘流（见 handleSearchKey），不在此重复处理
    if (e.target === this.searchInputEl) return
    if (this.searchMode()) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        this.moveSearch(1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        this.moveSearch(-1)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        this.selectSearchActive()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        this.clearQuery()
      }
      return
    }
    const panels = this.panelsData
    if (e.key === 'Escape') {
      e.preventDefault()
      this.setOpen(false)
      this.triggerEl?.focus()
      return
    }
    if (panels.length === 0) return
    const panel = panels[this.activePanel] ?? panels[panels.length - 1]!
    const enabled = panel.map((o, idx) => (o.disabled ? -1 : idx)).filter((i) => i >= 0)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const cur = enabled.indexOf(this.activeRow)
      this.activeRow = enabled[(cur + 1) % enabled.length] ?? enabled[0] ?? 0
      this.syncActiveHighlight()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const cur = enabled.indexOf(this.activeRow)
      this.activeRow = enabled[(cur - 1 + enabled.length) % enabled.length] ?? enabled[enabled.length - 1] ?? 0
      this.syncActiveHighlight()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      const option = panel[this.activeRow]
      if (!option || option.disabled) return
      const path = [...this.activePath.slice(0, this.activePanel), option.value]
      if (this.isExpandable(option, path)) this.drill(this.activePanel, option)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      if (this.activePanel > 0) {
        this.activePanel -= 1
        this.activeRow = 0
        this.activePath.length = this.activePanel
        this.renderPanels()
      } else {
        this.setOpen(false)
      }
    } else if (e.key === 'Enter' || (e.key === ' ' && this.isMultiple())) {
      e.preventDefault()
      this.activateRow()
    }
  }

  /** 面板高亮行激活（Enter/Space）：等价于点击该行（多选=勾选，单选=下钻/提交） */
  private activateRow(): void {
    const panel = this.panelsData[this.activePanel]
    const option = panel?.[this.activeRow]
    if (!option || option.disabled) return
    const path = [...this.activePath.slice(0, this.activePanel), option.value]
    const expandable = this.isExpandable(option, path)
    if (expandable) {
      if (this.isMultiple()) {
        // 级联模式下子级未加载的父节点不可直接勾选 → 转为下钻（触发加载）
        if (!this.isStrictly() && this.needLazyLoad(path, option)) {
          this.drill(this.activePanel, option)
          return
        }
        this.toggleCheck(path)
        return
      }
      if (this.hasAttr('change-on-select')) {
        this.commitSingle(path)
        return
      }
      this.drill(this.activePanel, option)
      return
    }
    if (this.isMultiple()) this.toggleCheck(path)
    else this.commitSingle(path)
  }

  private handleSearchInput(): void {
    if (!this.searchInputEl) return
    this.query = this.searchInputEl.value
    this.searchActive = 0
    this.emit('search', { value: this.query })
    this.renderPanels()
  }

  private handleSearchKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      if (this.query.trim() !== '') this.clearQuery()
      else {
        this.setOpen(false)
        this.triggerEl?.focus()
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()
      this.moveSearch(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      this.moveSearch(-1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      this.selectSearchActive()
    }
  }

  private moveSearch(dir: 1 | -1): void {
    const n = this.searchResults.length
    if (n === 0) return
    this.searchActive = (this.searchActive + dir + n) % n
    this.syncSearchActive()
  }

  private selectSearchActive(): void {
    const path = this.searchResults[this.searchActive]
    if (!path) return
    if (this.isMultiple()) this.toggleCheck(path)
    else this.commitSingle(path)
  }

  private clearQuery(): void {
    this.query = ''
    if (this.searchInputEl) {
      this.searchInputEl.value = ''
      this.searchInputEl.focus()
    }
    this.renderPanels()
  }

  /** 键盘高亮增量同步：面板行（列内 active 行）或搜索结果行 */
  private syncActiveHighlight(): void {
    if (this.searchMode()) {
      this.syncSearchActive()
      return
    }
    const panel = this.dropdown?.querySelectorAll<HTMLElement>('.panel')[this.activePanel]
    if (!panel) return
    const rowsEl = [...panel.querySelectorAll<HTMLElement>('.option')]
    const enabledRows = rowsEl.filter((r) => r.getAttribute('aria-disabled') !== 'true')
    const target = enabledRows[Math.min(this.activeRow, enabledRows.length - 1)] ?? enabledRows[0]
    for (const r of rowsEl) r.classList.remove('active')
    if (target) {
      target.classList.add('active')
      target.scrollIntoView?.({ block: 'nearest' })
    }
  }

  private syncSearchActive(): void {
    const box = this.dropdown?.querySelector<HTMLElement>('.search-results')
    if (!box) return
    for (const r of box.querySelectorAll<HTMLElement>('.option')) {
      r.classList.toggle('active', Number(r.getAttribute('data-index')) === this.searchActive)
    }
  }

  // ---------- 触发器 ----------

  private mirrorSizeStatus(): void {
    // size 就近读取 config-provider 注入（与全局密度联动），status 仅自身属性
    const size = pickValid(this.injectValue('size', 'medium'), 'medium', VALID_SIZES)
    this.setAttribute('data-size', size)
    const status = pickValid(this.getAttr('status', ''), '', VALID_STATUSES)
    if (status) this.setAttribute('data-status', status)
    else this.removeAttribute('data-status')
    // error 态同步 trigger aria-invalid（warning/success 不是「无效」语义，不标）
    if (this.triggerEl) {
      if (status === 'error') this.triggerEl.setAttribute('aria-invalid', 'true')
      else this.triggerEl.removeAttribute('aria-invalid')
    }
  }

  private pathLabels(path: string[]): string[] {
    const labels: string[] = []
    let list = this.roots()
    const walked: string[] = []
    for (const v of path) {
      const node = list.find((o) => o.value === v)
      labels.push(node?.label ?? v)
      if (!node) {
        list = []
        continue
      }
      walked.push(v)
      list = this.childrenOf(node, walked)
    }
    return labels
  }

  private pathToText(path: string[]): string {
    const labels = this.pathLabels(path)
    return this.showAllLevels() ? labels.join(this.separatorText()) : (labels[labels.length - 1] ?? '')
  }

  private intAttr(name: string): number | null {
    const raw = this.getAttr(name, '').trim()
    if (raw === '') return null
    const n = Number.parseInt(raw, 10)
    return Number.isNaN(n) ? null : n
  }

  private syncTrigger(): void {
    if (!this.triggerEl) return
    const placeholder = this.getAttr('placeholder', this.t('cascader.placeholder'))
    const disabled = this.injectDisabled()
    const valueEl = this.triggerEl.querySelector<HTMLElement>('.value')!
    this.triggerEl.disabled = disabled

    const hasValue = this.isMultiple() ? this.currentPaths().length > 0 : this.currentPath().length > 0
    const clearBtn = this.shadow.querySelector<HTMLElement>('.clear-btn')
    if (clearBtn) {
      clearBtn.hidden = !(this.hasAttr('clearable') && !disabled && hasValue)
      clearBtn.setAttribute('aria-label', this.t('input.clear'))
    }

    if (!hasValue) {
      valueEl.innerHTML = ''
      const ph = document.createElement('span')
      ph.className = 'placeholder'
      ph.textContent = placeholder
      valueEl.appendChild(ph)
      this.triggerEl.setAttribute('aria-label', placeholder)
      return
    }

    if (this.isMultiple()) {
      this.renderChips(valueEl)
      this.triggerEl.setAttribute(
        'aria-label',
        this.displayPaths()
          .map((p) => this.pathToText(p))
          .join('、'),
      )
    } else {
      const text = this.pathToText(this.currentPath())
      valueEl.textContent = text
      this.triggerEl.setAttribute('aria-label', text)
    }
  }

  /** 多选标签：路径文本 chip + 单独移除；max-tag-count 显式设置时按数量折叠为 +N */
  private renderChips(valueEl: HTMLElement): void {
    valueEl.innerHTML = ''
    const paths = this.displayPaths()
    const limit = this.hasAttr('max-tag-count')
      ? (this.intAttr('max-tag-count') ?? Number.POSITIVE_INFINITY)
      : Number.POSITIVE_INFINITY
    const shown = paths.slice(0, limit)
    const allLabels = paths.map((p) => this.pathToText(p))
    for (const p of shown) {
      const text = this.pathToText(p)
      const chip = document.createElement('span')
      chip.className = 'chip'
      const labelEl = document.createElement('span')
      labelEl.className = 'chip-label'
      labelEl.textContent = text
      const rm = document.createElement('span')
      rm.className = 'remove'
      rm.setAttribute('role', 'button')
      rm.setAttribute('tabindex', '-1')
      rm.setAttribute('aria-label', this.t('select.remove', { label: text }))
      rm.textContent = '×'
      rm.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation()
        this.toggleCheck(p)
      })
      chip.append(labelEl, rm)
      valueEl.appendChild(chip)
    }
    if (this.hasAttr('max-tag-count')) {
      const plus = document.createElement('span')
      plus.className = 'chip-plus'
      plus.setAttribute('part', 'tag-more')
      valueEl.appendChild(plus)
      this.collapseOverflowChips(valueEl, plus, allLabels, shown.length)
    }
  }

  /** 单行（max-tag-count 折叠模式）放不下时把放不下的标签收进 +N（不换行、不出横向滚动条） */
  private collapseOverflowChips(
    valueEl: HTMLElement,
    plus: HTMLElement,
    allLabels: string[],
    renderedCount: number,
  ): void {
    const chips = [...valueEl.querySelectorAll<HTMLElement>('.chip:not(.chip-plus)')]
    let hidden = allLabels.length - renderedCount
    if (hidden === 0 && valueEl.scrollWidth <= valueEl.clientWidth) {
      plus.remove()
      return
    }
    const applyPlus = (): void => {
      plus.hidden = false
      plus.textContent = `+${hidden}`
      plus.setAttribute('title', allLabels.slice(allLabels.length - hidden).join('、'))
    }
    applyPlus()
    for (let i = chips.length - 1; i >= 0; i--) {
      if (valueEl.scrollWidth <= valueEl.clientWidth) break
      const c = chips[i]
      if (!c) continue
      c.hidden = true
      hidden++
      applyPlus()
    }
  }

  /** clearable：清空值并派发 oas-clear（detail 为被清空前的值）+ oas-change（空值） */
  private clearValue(): void {
    if (this.injectDisabled()) return
    if (this.isMultiple()) {
      const prev = this.currentPaths()
      this.setAttribute('value', '[]')
      this.emit('clear', { value: prev })
      this.emit('change', { value: [] })
    } else {
      const prev = this.currentPath()
      this.removeAttribute('value')
      this.emit('clear', { value: prev })
      this.emit('change', { value: [] })
    }
    this.triggerEl?.focus()
  }

  /** label 点击聚焦委托：把焦点交给 shadow 内 trigger（配合 oas-form-item 的 label 点击代理） */
  override focus(options?: FocusOptions): void {
    this.shadow.querySelector<HTMLButtonElement>('.trigger')?.focus(options)
  }
}

/** 路径键：JSON 序列化避免值内分隔符歧义 */
function kOf(path: string[]): string {
  return JSON.stringify(path)
}
