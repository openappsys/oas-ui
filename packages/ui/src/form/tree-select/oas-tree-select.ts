import { OASElement } from '@oas-ui/core'
// 注册 oas-virtual-list（OASVirtualList 仅作类型用，需裸 import 保住注册副作用）
import '../../data/virtual-list/index.js'
import type { OASVirtualList } from '../../data/virtual-list/index.js'
import { computePosition } from '../../overlay/floating/index.js'
// 共享树内核：flatten/字段归一 + 勾选级联 + 懒加载状态机 + 模板克隆（与 oas-tree 同一实现）
import {
  resolveFieldNames,
  defaultFields,
  flattenModel,
  releaseLoading,
  expandableNode,
  loadPendingNode,
  closureFromValues,
  applyCheckStrategy,
  flipChecked,
  halfByDescendant,
  labelPath,
  cloneSlotContent,
} from '../../data/tree/shared/index.js'
import type { ResolvedFields, TreeAccessors, TreeModel, CheckContext } from '../../data/tree/shared/index.js'

export interface TreeOption {
  label: string
  value: string
  children?: TreeOption[]
  disabled?: boolean
  /** 懒加载：显式叶子（无可加载子节点，不显示展开箭头） */
  isLeaf?: boolean
  /** 懒加载：已加载完成标记（children 已就绪或确认无子节点） */
  loaded?: boolean
}

/** 勾选策略：all=父级+子级全进值；parent=只保留父级（子级全选时以父级为代表）；child=只保留叶子 */
type CheckStrategy = 'all' | 'parent' | 'child'

const VALID_SIZES = ['small', 'medium', 'large'] as const
const VALID_STATUSES = ['error', 'warning', 'success'] as const

/**
 * 节点行样式（非虚拟渲染在 tree-select 自身 shadow；虚拟模式需注入 vlist shadow，两处共用）。
 * 颜色/间距一律走 CSS 变量 token（light+dark 由主题切换自动适配）。
 */
const NODE_STYLE = `
.node {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding: var(--oas-space-1) var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
}
.node:hover {
  background: var(--oas-color-bg-hover);
}
.node.active {
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
}
.node[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
.indent {
  width: 18px;
  flex: none;
  align-self: stretch;
}
.tree-lines .indent {
  border-inline-start: 1px solid var(--oas-color-border);
}
.toggle {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0;
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-xs);
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
  flex: none;
}
.toggle.open {
  transform: rotate(90deg);
}
.toggle.leaf {
  visibility: hidden;
}
.toggle-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex: none;
}
.toggle-spinner::before {
  content: '';
  width: 12px;
  height: 12px;
  border: 2px solid var(--oas-color-border);
  border-top-color: var(--oas-color-primary);
  border-radius: 50%;
  animation: oas-tree-select-spin 0.8s linear infinite;
}
@keyframes oas-tree-select-spin {
  to {
    transform: rotate(360deg);
  }
}
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
}
.check.checked {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
}
.check.half {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  opacity: 0.6;
}
.label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
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
:host([aria-invalid='true']) .trigger[aria-expanded='true'] {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
:host([aria-invalid='true']) .trigger:focus-visible {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
:host([data-status='error']) .trigger {
  border-color: var(--oas-color-danger);
}
:host([data-status='warning']) .trigger {
  border-color: var(--oas-color-warning);
}
:host([data-status='success']) .trigger {
  border-color: var(--oas-color-success);
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
/* 清除按钮/箭头首行对齐随尺寸档位联动（12px 图标垂直居中于首行） */
:host([data-size='small']) .clear-btn {
  margin-top: calc((var(--oas-control-height-sm) - 12px) / 2);
}
:host([data-size='small']) .chevron {
  margin-top: calc((var(--oas-control-height-sm) - 12px) / 2);
}
:host([data-size='large']) .clear-btn {
  margin-top: calc((var(--oas-control-height-lg) - 12px) / 2);
}
:host([data-size='large']) .chevron {
  margin-top: calc((var(--oas-control-height-lg) - 12px) / 2);
}
.prefix,
.suffix {
  display: inline-flex;
  align-items: center;
  color: var(--oas-color-text-secondary);
  flex: none;
}
.value {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--oas-space-1);
  min-width: 0;
  flex: 1;
  text-align: left;
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
.chip-plus {
  color: var(--oas-color-text-secondary);
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
.chevron {
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
  flex: none;
  /* 多行标签时箭头固定首行对齐，不随触发器长高漂浮 */
  align-self: flex-start;
  margin-top: calc((var(--oas-control-height-md) - 12px) / 2);
}
.trigger[aria-expanded='true'] .chevron {
  transform: rotate(180deg);
}
.dropdown {
  /* fixed + computePosition 锚定 trigger 下方：逃出祖先 overflow 容器（模态滚动 body 等），
     不再为该容器贡献溢出逼出滚动条（与 select/combobox 同思路） */
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
.panel-header,
.panel-footer {
  padding: var(--oas-space-1) var(--oas-space-2);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.panel-header[hidden] {
  display: none;
}
.panel-footer[hidden] {
  display: none;
}
.search-input {
  box-sizing: border-box;
  width: 100%;
  height: var(--oas-control-height-sm);
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
.tree {
  max-height: 288px;
  overflow-y: auto;
}
.tree[hidden] {
  display: none;
}
.empty {
  padding: var(--oas-space-3);
  text-align: center;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.empty[hidden] {
  display: none;
}
.loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--oas-color-bg) 70%, transparent);
  border-radius: var(--oas-radius-md);
}
.loading[hidden] {
  display: none;
}
.loading-spinner {
  width: 20px;
  height: 20px;
  display: inline-block;
  border: 2px solid var(--oas-color-border);
  border-top-color: var(--oas-color-primary);
  border-radius: 50%;
  animation: oas-tree-select-spin 0.8s linear infinite;
}
.vlist {
  display: block;
}
.vlist[hidden] {
  display: none;
}
${NODE_STYLE}
`

/**
 * 虚拟模式注入 oas-virtual-list 的 shadow：节点行占满 item、整行可高亮；
 * 行内元素样式（node/toggle/check/label）需整体复制——vlist shadow 内够不到 tree-select 自身样式。
 * tree-lines 类挂在 vlist 宿主上，经 :host(.tree-lines) 生效。
 */
const VIRTUAL_ROW_STYLE = `
[part="item"] {
  display: flex;
  align-items: center;
}
[part="item"] .node {
  flex: 1;
  height: 100%;
  box-sizing: border-box;
}
:host(.tree-lines) .indent {
  border-inline-start: 1px solid var(--oas-color-border);
}
${NODE_STYLE}
`

interface FlatNode {
  option: TreeOption
  depth: number
  parent?: TreeOption
}

/** 按字段别名构造共享访问器（TreeOption 经 record 索引读取原始数据） */
function defaultAccessors(fields: ResolvedFields): TreeAccessors<TreeOption> {
  const read = (o: TreeOption): Record<string, unknown> => o as unknown as Record<string, unknown>
  return {
    idOf: (o) => {
      const v = read(o)[fields.idField]
      return typeof v === 'string' ? v : ''
    },
    labelOf: (o) => {
      const v = read(o)[fields.labelField]
      return typeof v === 'string' ? v : ''
    },
    childrenOf: (o) => {
      const v = read(o)[fields.childrenField]
      return Array.isArray(v) ? (v as TreeOption[]) : undefined
    },
    disabledOf: (o) => read(o)[fields.disabledField] === true,
    isLeafOf: (o) => read(o)[fields.isLeafField] === true,
    loadedOf: (o) => read(o)[fields.loadedField] === true,
    inertOf: (o) => read(o)[fields.disabledField] === true,
  }
}

export class OASTreeSelect extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'placeholder',
      'options',
      'disabled',
      'multiple',
      'expanded',
      'check-strategy',
      'check-strictly',
      'virtual',
      'height',
      'item-height',
      'disabled-skip',
      'filterable',
      'reserve-keyword',
      'lazy',
      'clearable',
      'size',
      'status',
      'field-names',
      'max-tag-count',
      'max',
      'open',
      'default-expand-all',
      'tree-lines',
      'loading',
      'empty',
      'cache-data',
      'show-path',
      'separator',
      'expand-trigger',
      'prefix-text',
      'suffix-text',
    ]
  }

  /** 懒加载回调：展开未加载节点时触发 `{ value }`，宿主回填子节点后重设 options 属性（对齐 oas-tree 的 el.load） */
  load?: (payload: { value: string }) => void

  /** 自定义过滤函数：(label, option) => boolean；缺省按 label 包含关键词（大小写不敏感） */
  filter?: (label: string, option: TreeOption) => boolean

  private triggerEl: HTMLButtonElement | null = null
  private dropdown: HTMLElement | null = null
  private treeWrap: HTMLElement | null = null
  private vlist: OASVirtualList | null = null
  private _options: TreeOption[] = []
  private optionsAttr = ''
  /** 键盘导航高亮：visibleFlat() 的索引 */
  private activeIndex = 0
  /** 搜索关键词（面板顶部搜索框；仅 filterable 时生效） */
  private searchQuery = ''
  /** 懒加载中节点集合（value） */
  private loadingSet = new Set<string>()
  /** cache-data 解析结果：value → label（树外/未加载值的回显兜底） */
  private cacheLabels = new Map<string, string>()
  /** 字段别名归一（共享内核 resolveFieldNames，'value' 语义标识、不覆盖 isLeaf/loaded） */
  private fields: ResolvedFields = defaultFields('value')
  /** 按字段别名构造的节点访问器（每次字段变化重建） */
  private acc: TreeAccessors<TreeOption> = defaultAccessors(defaultFields('value'))
  /** 共享内核扁平模型（rows/byId/parentById），update 时重建 */
  private model: TreeModel<TreeOption> = flattenModel([], defaultAccessors(defaultFields('value')))

  /** Vue/React 会把 options 识别为实例属性走 property 赋值；setter 反射到 attribute 统一解析链路 */
  get options(): TreeOption[] {
    return this._options
  }
  set options(value: TreeOption[] | string) {
    this.setAttribute('options', typeof value === 'string' ? value : JSON.stringify(value))
  }

  override connectedCallback(): void {
    super.connectedCallback()
    // 升级前被赋过 options（SSR/onMounted 与模块加载的时序竞争），自有属性遮蔽原型
    // setter → parseOptions 读 attribute 为空 → 不渲染。回收到 setter 通道。
    if (Object.prototype.hasOwnProperty.call(this, 'options') && Array.isArray(this.options)) {
      const own = this.options
      delete (this as unknown as Record<string, unknown>).options
      this.options = own
    }
  }

  private openState = false
  private flat: FlatNode[] = []
  /** value → 原始 option 映射（共享模型 byId 别名），勾选闭包/未知值判定用 O(1) 查找 */
  private valueMap = new Map<string, TreeOption>()

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="wrapper" part="wrapper">
        <button class="trigger" part="trigger" type="button" role="combobox"
          aria-haspopup="tree" aria-expanded="false" aria-controls="ts-tree">
          <span class="prefix" part="prefix" hidden></span>
          <span class="value" part="value"></span>
          <span class="clear-btn" part="clear" role="button" tabindex="-1" hidden aria-label="">
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </span>
          <span class="suffix" part="suffix" hidden></span>
          <svg class="chevron" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M4 6 L8 10 L12 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="dropdown" part="dropdown">
          <div class="panel-header" part="panel-header" hidden></div>
          <input class="search-input" part="search-input" type="text" hidden />
          <div class="tree" part="tree" role="tree" id="ts-tree"></div>
          <oas-virtual-list class="vlist" part="virtual-list" hidden></oas-virtual-list>
          <div class="empty" part="empty" hidden></div>
          <div class="loading" part="loading" hidden>
            <span class="loading-spinner" role="status"></span>
          </div>
          <div class="panel-footer" part="panel-footer" hidden></div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定触发器/搜索框/虚拟列表事件 + 注入虚拟行样式（render 与水合路径共用） */
  private bind(): void {
    this.triggerEl = this.shadow.querySelector('.trigger')
    this.dropdown = this.shadow.querySelector('.dropdown')
    this.treeWrap = this.shadow.querySelector('.tree')
    this.vlist = this.shadow.querySelector<OASVirtualList>('oas-virtual-list')

    this.triggerEl?.addEventListener('click', () => this.toggle())
    this.triggerEl?.addEventListener('keydown', (e: KeyboardEvent) => this.handleTriggerKey(e))
    this.shadow.querySelector<HTMLInputElement>('.search-input')?.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value
      this.activeIndex = 0
      // 高亮定位到首个命中节点（祖先行只是过滤上下文，不应抢 Enter）
      const hit = this.visibleFlat().findIndex((item) => this.matchesQuery(item.option))
      if (hit >= 0) this.activeIndex = hit
      this.emit('search', { value: this.searchQuery })
      this.renderTree()
    })
    this.shadow
      .querySelector<HTMLInputElement>('.search-input')
      ?.addEventListener('keydown', (e: KeyboardEvent) => this.handleSearchKey(e))
    this.shadow.querySelector<HTMLButtonElement>('.clear-btn')?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.clearValue()
    })
    // 虚拟滚动：复用 oas-virtual-list 的窗口计算，把每个可见项渲染为节点行
    this.vlist?.addEventListener('oas-item', ((
      e: CustomEvent<{ index: number; item: FlatNode; element: HTMLElement }>,
    ) => {
      const detail = e.detail
      if (detail && detail.item && detail.element) {
        this.createNodeRow(detail.item, detail.index, detail.element)
      }
    }) as EventListener)
    this.onCleanup(() => document.removeEventListener('click', this.handleOutsideClick, true))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（trigger/dropdown/tree/virtual-list 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.trigger')) return false
    if (!this.shadow.querySelector('.dropdown')) return false
    if (!this.shadow.querySelector('.tree')) return false
    if (!this.shadow.querySelector('oas-virtual-list')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.normalizeLegacyAlias('prefix-text', 'prefix')
    this.normalizeLegacyAlias('suffix-text', 'suffix')
    this.parseFieldNames()
    this.parseOptions()
    this.parseCache()
    this.model = flattenModel(this._options, this.acc)
    releaseLoading(this.model, this.acc, this.loadingSet)
    this.flat = this.model.rows.map(
      (r): FlatNode => ({
        option: r.node,
        depth: r.depth,
        parent: r.parent !== undefined ? this.model.byId.get(r.parent) : undefined,
      }),
    )
    this.valueMap = this.model.byId
    this.syncHostState()
    this.syncOpenControl()
    this.syncPanelChrome()
    this.syncTrigger()
    // 下拉展开时同步刷新节点（勾选态/展开态/虚拟窗口）
    if (this.openState) this.renderTree()
  }

  // ---------- 字段别名 / 数据解析 ----------

  private parseFieldNames(): void {
    const raw = this.getAttr('field-names', '')
    const next = resolveFieldNames(raw, 'value', 'value', false)
    if (
      next.idField !== this.fields.idField ||
      next.labelField !== this.fields.labelField ||
      next.childrenField !== this.fields.childrenField ||
      next.disabledField !== this.fields.disabledField
    ) {
      this.optionsAttr = '' // 字段映射变化 → 强制重解析 options（沿用既有行为）
    }
    this.fields = next
    this.acc = defaultAccessors(next)
  }

  private parseOptions(): void {
    const raw = this.getAttr('options', '[]')
    if (raw === this.optionsAttr) return
    this.optionsAttr = raw
    try {
      const parsed = JSON.parse(raw)
      const valueField = this.fields.idField
      this._options = Array.isArray(parsed)
        ? parsed.filter((o) => o && typeof (o as unknown as Record<string, unknown>)[valueField] === 'string')
        : []
    } catch {
      this._options = []
    }
  }

  private parseCache(): void {
    this.cacheLabels.clear()
    try {
      const parsed = JSON.parse(this.getAttr('cache-data', '[]'))
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item.value === 'string' && typeof item.label === 'string') {
            this.cacheLabels.set(item.value, item.label)
          }
        }
      }
    } catch {
      // 非法 JSON 静默忽略（缓存是兜底能力）
    }
  }

  /** 共享内核上下文（扁平模型 + 访问器） */
  private checkCtx(): CheckContext<TreeOption> {
    return { model: this.model, acc: this.acc }
  }

  // ---------- 语义字段读取（经 field-names 别名，委托共享访问器） ----------

  private labelOf(option: TreeOption): string {
    return this.acc.labelOf(option)
  }

  private valueKeyOf(option: TreeOption): string {
    return this.acc.idOf(option)
  }

  private childrenOf(option: TreeOption): TreeOption[] | undefined {
    return this.acc.childrenOf(option)
  }

  private disabledOf(option: TreeOption): boolean {
    return this.acc.disabledOf(option)
  }

  // ---------- 宿主状态映射（size / status） ----------

  private syncHostState(): void {
    const size = this.getAttr('size', 'medium')
    if (VALID_SIZES.includes(size as (typeof VALID_SIZES)[number]) && size !== 'medium') {
      this.setAttribute('data-size', size)
    } else {
      this.removeAttribute('data-size')
    }
    const status = this.getAttr('status', '')
    if (VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
      this.setAttribute('data-status', status)
    } else {
      this.removeAttribute('data-status')
    }
  }

  // ---------- 开合（受控 open / oas-open-change） ----------

  /** 受控判定：open 属性存在即受控（值为 'false' 表示受控关闭），缺省为非受控 */
  private setOpen(next: boolean): void {
    if (this.hasAttribute('open')) {
      const current = this.getAttr('open', '') !== 'false'
      if (current !== next) this.emit('open-change', { open: next })
      return
    }
    if (this.openState === next) return
    this.openState = next
    this.emit('open-change', { open: next })
    this.renderTree()
    this.syncDropdown()
  }

  /** 受控模式：open 属性变化驱动内部开合态 */
  private syncOpenControl(): void {
    if (!this.hasAttribute('open')) return
    const target = this.getAttr('open', '') !== 'false'
    if (target === this.openState) return
    this.openState = target
    this.renderTree()
    this.syncDropdown()
  }

  private toggle(): void {
    if (this.injectDisabled()) return
    this.setOpen(!this.openState)
  }

  private syncDropdown(): void {
    if (!this.dropdown || !this.triggerEl) return
    this.dropdown.classList.toggle('open', this.openState)
    this.triggerEl.setAttribute('aria-expanded', String(this.openState))
    const searchInput = this.shadow.querySelector<HTMLInputElement>('.search-input')
    if (searchInput) {
      if (this.openState && this.hasAttr('filterable')) {
        searchInput.focus()
      } else if (!this.openState && this.searchQuery) {
        // 关闭面板时清空搜索词（下次打开回到全量树）
        this.searchQuery = ''
        searchInput.value = ''
      }
    }
    if (this.openState) {
      document.addEventListener('click', this.handleOutsideClick, true)
      this.positionDropdown()
      const vis = this.visibleFlat()
      const values = this.currentValues()
      let idx = 0
      if (values.length) {
        const found = vis.findIndex((v) => values.includes(this.valueKeyOf(v.option)))
        if (found >= 0) idx = found
      }
      this.activeIndex = Math.min(idx, Math.max(0, vis.length - 1))
      this.scrollActiveIntoView()
      this.syncActive()
    } else {
      document.removeEventListener('click', this.handleOutsideClick, true)
      this.syncAriaActiveDescendant()
    }
  }

  /** fixed 定位：锚定 trigger 下方，空间不足自动翻转避让，宽度对齐 trigger（与 select/combobox 同思路） */
  private positionDropdown(): void {
    if (!this.dropdown || !this.triggerEl) return
    const anchorRect = this.triggerEl.getBoundingClientRect()
    const panelRect = this.dropdown.getBoundingClientRect()
    const { top, left } = computePosition(anchorRect, panelRect, 'bottom', {
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
      this.setOpen(false)
      return
    }
    this.syncDropdown()
  }

  /** trigger 键盘：Esc 关闭；关闭态 Enter/Space/↑/↓ 展开、Backspace 删尾；展开态 ↑/↓ 移动、Enter/Space 选中、→/← 展开/收起 */
  private handleTriggerKey(e: KeyboardEvent): void {
    if (this.injectDisabled()) return
    // 焦点在 trigger 内嵌按钮（清空/chip 移除）时不响应，交给按钮原生行为
    if ((e.target as Element).closest('.clear-btn, .chip button')) return
    if (e.key === 'Escape') {
      this.setOpen(false)
      return
    }
    if (!this.openState) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        this.setOpen(true)
      } else if (e.key === 'Backspace' && this.hasAttr('multiple') && this.currentValues().length > 0) {
        e.preventDefault()
        this.removeLastValue()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.moveActive(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.moveActive(-1)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      this.selectActive()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      this.expandActive()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      this.collapseActive()
    }
  }

  /** 搜索框键盘：↑/↓ 移动、Enter 选中、Esc 关闭并还焦 trigger */
  private handleSearchKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault()
      this.setOpen(false)
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

  // ---------- 可见列表（展开 / 过滤） ----------

  /** 过滤是否生效：filterable 且有关键词（或自定义函数要求全量重算） */
  private filtering(): boolean {
    return this.hasAttr('filterable') && this.searchQuery.trim() !== ''
  }

  /** 单节点是否命中搜索：el.filter 自定义函数优先，缺省按 label 包含关键词（大小写不敏感） */
  private matchesQuery(option: TreeOption): boolean {
    const userFilter = typeof this.filter === 'function' ? this.filter : null
    if (userFilter) return !!userFilter(this.labelOf(option), option)
    return this.labelOf(option).toLowerCase().includes(this.searchQuery.trim().toLowerCase())
  }

  /** 当前下拉可见节点：过滤态走宽松匹配（命中含祖先与全部后代）；常态为根 + 展开节点直接子级 */
  private visibleFlat(): FlatNode[] {
    if (this.filtering()) return this.filterVisible()
    const expanded = this.getExpandedNodes()
    return this.flat.filter((item) => item.depth === 0 || expanded.has(this.valueKeyOf(item.parent!)))
  }

  /**
   * 宽松过滤：命中节点 + 其全部祖先（路径上下文）+ 其全部后代（命中即含子树）可见；
   * 过滤态不依赖 expanded（自动展开显示命中路径）。
   */
  private filterVisible(): FlatNode[] {
    const match = (option: TreeOption): boolean => this.matchesQuery(option)
    const visible = new Set<string>()
    const mark = (list: TreeOption[]): boolean => {
      let any = false
      for (const option of list) {
        const value = this.valueKeyOf(option)
        if (visible.has(value)) continue // 已被祖先命中展开的子树整体可见
        const self = match(option)
        const kids = this.childrenOf(option) ?? []
        const sub = kids.length ? mark(kids) : false
        if (self || sub) {
          visible.add(value)
          any = true
          if (self) {
            // 命中含全部后代：整个子树可见
            const addAll = (l: TreeOption[]): void => {
              for (const k of l) {
                const kv = this.valueKeyOf(k)
                visible.add(kv)
                addAll(this.childrenOf(k) ?? [])
              }
            }
            addAll(kids)
          }
        }
      }
      return any
    }
    mark(this._options)
    return this.flat.filter((item) => visible.has(this.valueKeyOf(item.option)))
  }

  private moveActive(dir: 1 | -1): void {
    const n = this.visibleFlat().length
    if (n === 0) return
    this.activeIndex = (this.activeIndex + dir + n) % n
    this.scrollActiveIntoView()
    this.syncActive()
  }

  private selectActive(): void {
    const item = this.visibleFlat()[this.activeIndex]
    if (!item || this.disabledOf(item.option)) return
    if (this.hasAttr('multiple')) {
      this.toggleCheck(item.option)
    } else {
      this.commit([this.valueKeyOf(item.option)])
    }
  }

  private expandActive(): void {
    const item = this.visibleFlat()[this.activeIndex]
    if (!item || !this.isExpandable(item.option)) return
    const set = this.getExpandedNodes()
    if (set.has(this.valueKeyOf(item.option))) return
    this.expandNode(item.option, set)
  }

  private collapseActive(): void {
    const item = this.visibleFlat()[this.activeIndex]
    if (!item) return
    const set = this.getExpandedNodes()
    if (!set.has(this.valueKeyOf(item.option))) return
    set.delete(this.valueKeyOf(item.option))
    this.setExpandedNodes(set)
    this.renderTree()
  }

  // ---------- 展开集合（expanded 受控 / default-expand-all） ----------

  private getExpandedNodes(): Set<string> {
    const raw = this.getAttr('expanded', '')
    if (raw !== '') {
      try {
        const parsed = JSON.parse(raw)
        return new Set(Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [])
      } catch {
        return new Set()
      }
    }
    // 非受控初值：default-expand-all 展开全部有子节点的节点（首次内部切换后 expanded 属性接管）
    if (this.hasAttr('default-expand-all')) {
      const set = new Set<string>()
      for (const item of this.flat) {
        if (this.childrenOf(item.option)?.length) set.add(this.valueKeyOf(item.option))
      }
      return set
    }
    return new Set()
  }

  private setExpandedNodes(set: Set<string>): void {
    this.setAttribute('expanded', JSON.stringify([...set]))
  }

  /** 展开某节点（写入 expanded 集合 + 懒加载触发 + 重渲染） */
  private expandNode(option: TreeOption, set?: Set<string>): void {
    const next = set ?? this.getExpandedNodes()
    next.add(this.valueKeyOf(option))
    this.tryLazyLoad(option)
    this.setExpandedNodes(next)
    this.renderTree()
  }

  /**
   * 是否可展开。常规模式仅 children 非空；懒加载模式下未加载节点
   * （无 children、非 isLeaf、未标记 loaded）也可展开，展开触发加载（共享内核判定）。
   */
  private isExpandable(option: TreeOption): boolean {
    return expandableNode(option, this.acc, this.hasAttr('lazy'))
  }

  /** 懒加载：展开未加载节点时派发 oas-load 并调用 el.load，宿主回填 options 后 spinner 消失 */
  private tryLazyLoad(option: TreeOption): void {
    if (!loadPendingNode(option, this.acc, this.hasAttr('lazy'))) return
    const value = this.valueKeyOf(option)
    if (this.loadingSet.has(value)) return
    this.loadingSet.add(value)
    this.emit('load', { value })
    this.load?.({ value })
  }

  // ---------- 取值 ----------

  private currentValues(): string[] {
    if (!this.hasAttr('multiple')) {
      const raw = this.getAttr('value', '')
      return raw === '' ? [] : [raw]
    }
    try {
      const parsed = JSON.parse(this.getAttr('value', '[]'))
      return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []
    } catch {
      return []
    }
  }

  private checkStrategy(): CheckStrategy {
    const s = this.getAttr('check-strategy', 'all')
    return s === 'parent' || s === 'child' ? s : 'all'
  }

  private checkStrictly(): boolean {
    return this.hasAttr('check-strictly')
  }

  /** 多选上限（<=0 不限） */
  private maxLimit(): number {
    const n = Number.parseInt(this.getAttr('max', ''), 10)
    return Number.isNaN(n) || n <= 0 ? 0 : n
  }

  /** 是否已达多选上限（按内部勾选集合大小计——级联收敛不改变勾选数量语义） */
  private maxReached(): boolean {
    const max = this.maxLimit()
    return max > 0 && this.internalChecked().size >= max
  }

  // ---------- 勾选模型（级联 / check-strictly 解联，共享内核实现） ----------

  /**
   * 内部完整勾选集合（策略无关，驱动复选框展示）：
   * - check-strictly：勾选不级联，集合即受控 value 本身；
   * - 级联模式：closureFromValues 从受控 value 做级联闭包（含自底向上收敛），见共享内核。
   */
  private internalChecked(): Set<string> {
    if (this.checkStrictly()) return new Set(this.currentValues())
    return closureFromValues(this.checkCtx(), this.currentValues())
  }

  /**
   * 切换某节点勾选：级联模式节点 + 全部后代翻转随后归一化；strictly 仅翻转自身。超上限时拦截。
   * 翻转与策略导出均委托共享内核（flipChecked / applyCheckStrategy）。
   */
  private toggleCheck(option: TreeOption): boolean {
    if (this.disabledOf(option)) return false
    const ctx = this.checkCtx()
    const checked = this.internalChecked()
    const value = this.valueKeyOf(option)
    const willCheck = !checked.has(value)
    if (willCheck && this.maxReached()) return false
    flipChecked(ctx, checked, value, this.checkStrictly())
    const values = applyCheckStrategy(
      ctx,
      checked,
      this.checkStrictly() ? 'all' : this.checkStrategy(),
      this.currentValues(),
    )
    const max = this.maxLimit()
    if (max > 0 && checked.size > max) return false
    this.commitValues(values)
    return true
  }

  /** 直接从值数组移除一项（chip ✕ / Backspace）：树内值走反勾选（级联收敛），树外值直接删 */
  private removeValue(value: string): void {
    const node = this.findNode(value)
    if (node && this.internalChecked().has(value)) {
      this.toggleCheck(node)
      return
    }
    const values = this.currentValues().filter((v) => v !== value)
    this.commitValues(values)
  }

  private removeLastValue(): void {
    const values = this.currentValues()
    const last = values[values.length - 1]
    if (last !== undefined) this.removeValue(last)
  }

  /** 提交对外值：写 value 属性 + 派发 oas-change（detail 带 labels）+ 刷新回显与树 */
  private commitValues(values: string[]): void {
    const labels = values.map((v) => this.displayLabelOf(v))
    if (this.hasAttr('multiple')) {
      this.setAttribute('value', JSON.stringify(values))
      this.emit('change', { value: values, labels })
    } else {
      this.setAttribute('value', values[0] ?? '')
      this.emit('change', { value: values[0] ?? '', labels })
      this.setOpen(false)
    }
    // filterable 默认选中后清空搜索词（reserve-keyword 保留）
    if (this.hasAttr('filterable') && !this.hasAttr('reserve-keyword')) {
      this.searchQuery = ''
      const search = this.shadow.querySelector<HTMLInputElement>('.search-input')
      if (search) search.value = ''
    }
    this.syncTrigger()
    this.renderTree()
  }

  /** 单选提交（保留既有 commit 语义） */
  private commit(values: string[]): void {
    this.commitValues(values)
    this.triggerEl?.focus()
  }

  /** clearable：清空 value 并派发 oas-clear + oas-change */
  private clearValue(): void {
    if (this.injectDisabled()) return
    const prev = this.currentValues()
    if (this.hasAttr('multiple')) {
      this.setAttribute('value', '[]')
      this.emit('clear', { value: [...prev] })
      this.emit('change', { value: [], labels: [] })
    } else {
      this.setAttribute('value', '')
      this.emit('clear', { value: prev[0] ?? '' })
      this.emit('change', { value: '', labels: [] })
    }
    this.syncTrigger()
    this.renderTree()
    this.triggerEl?.focus()
  }

  // ---------- 渲染 ----------

  /** 面板静态部件同步（搜索框/头尾插槽/空态/loading/前后缀），update 与开合共用 */
  private syncPanelChrome(): void {
    const dropdown = this.dropdown
    if (!dropdown) return
    const search = dropdown.querySelector<HTMLInputElement>('.search-input')
    if (search) {
      search.hidden = !this.hasAttr('filterable')
      search.setAttribute('aria-label', this.t('select.search'))
      search.setAttribute('placeholder', this.t('select.search'))
    }
    this.fillSlotContainer('.panel-header', 'header')
    this.fillSlotContainer('.panel-footer', 'footer')
    const loading = dropdown.querySelector<HTMLElement>('.loading')
    if (loading) {
      loading.hidden = !this.hasAttr('loading')
      const spinner = loading.querySelector('.loading-spinner')
      spinner?.setAttribute('aria-label', this.t('tree.loading'))
    }
    // 前后缀：模板插槽优先，缺省回落属性文本（prefix-text/suffix-text）；两者皆无则隐藏
    this.fillAffix('.prefix', 'prefix', this.getAttr('prefix-text', ''))
    this.fillAffix('.suffix', 'suffix', this.getAttr('suffix-text', ''))
  }

  /** 面板头/尾插槽容器：有 template[slot] 则克隆填充并显示，否则隐藏 */
  private fillSlotContainer(selector: string, slot: string): void {
    const container = this.dropdown?.querySelector<HTMLElement>(selector)
    if (!container) return
    const tpl = this.querySelector(`template[slot="${slot}"]`)
    if (tpl instanceof HTMLTemplateElement) {
      container.innerHTML = ''
      container.appendChild(this.slotTemplateFragment(tpl))
      container.hidden = false
    } else {
      container.hidden = true
    }
  }

  /** 触发器前后缀：template[slot=prefix|suffix] 克隆优先，缺省回落属性文本 */
  private fillAffix(selector: string, slot: string, text: string): void {
    const el = this.triggerEl?.querySelector<HTMLElement>(selector)
    if (!el) return
    const tpl = this.querySelector(`template[slot="${slot}"]`)
    if (tpl instanceof HTMLTemplateElement) {
      el.innerHTML = ''
      el.appendChild(this.slotTemplateFragment(tpl))
      el.hidden = false
    } else if (text) {
      el.textContent = text
      el.hidden = false
    } else {
      el.textContent = ''
      el.hidden = true
    }
  }

  /**
   * 克隆 slot 骨架模板内容（静态 content 与 Vue CSR 直插双形态，共享内核实现）。
   */
  private slotTemplateFragment(tpl: HTMLTemplateElement): DocumentFragment {
    return cloneSlotContent(tpl)
  }

  private renderTree(): void {
    const dropdown = this.dropdown
    const treeWrap = this.treeWrap
    if (!dropdown || !treeWrap) return
    const emptyEl = dropdown.querySelector<HTMLElement>('.empty')

    const vis = this.visibleFlat()
    this.activeIndex = Math.min(this.activeIndex, Math.max(0, vis.length - 1))
    const lines = this.hasAttr('tree-lines')
    dropdown.classList.toggle('tree-lines', lines)
    this.vlist?.classList.toggle('tree-lines', lines)

    if (vis.length === 0) {
      if (this.vlist) this.vlist.hidden = true
      treeWrap.hidden = true
      treeWrap.innerHTML = ''
      if (emptyEl) {
        emptyEl.hidden = false
        this.fillEmpty(emptyEl)
      }
      this.syncAriaActiveDescendant()
      return
    }
    if (emptyEl) emptyEl.hidden = true

    // 虚拟滚动：大数据量时复用 oas-virtual-list 仅渲染可见窗口（键盘/ARIA 保持在 vlist 之上）
    if (this.hasAttr('virtual') && this.vlist) {
      treeWrap.hidden = true
      this.setupVirtualList(vis)
      return
    }

    if (this.vlist) this.vlist.hidden = true
    treeWrap.hidden = false
    treeWrap.innerHTML = ''
    const checked = this.internalChecked()
    const expanded = this.getExpandedNodes()
    if (this.hasAttr('multiple')) {
      treeWrap.setAttribute('aria-multiselectable', 'true')
    } else {
      treeWrap.removeAttribute('aria-multiselectable')
    }
    for (let i = 0; i < vis.length; i++) {
      this.createNodeRow(vis[i]!, i, treeWrap, { checked, expanded })
    }
    this.syncActive()
  }

  /** 空态填充：template[slot=empty] > empty 属性文案 > 内置 i18n（过滤无匹配/无数据分别给文案） */
  private fillEmpty(emptyEl: HTMLElement): void {
    const tpl = this.querySelector('template[slot="empty"]')
    if (tpl instanceof HTMLTemplateElement) {
      emptyEl.innerHTML = ''
      emptyEl.appendChild(this.slotTemplateFragment(tpl))
      return
    }
    const custom = this.getAttr('empty', '')
    emptyEl.textContent = custom || (this.filtering() ? this.t('select.noMatch') : this.t('treeSelect.empty'))
  }

  /** 虚拟模式：切到 vlist 渲染（窗口化）并喂入可见节点 */
  private setupVirtualList(vis: FlatNode[]): void {
    const vlist = this.vlist
    if (!vlist) return
    vlist.hidden = false
    // 行样式注入 vlist shadow（虚拟行在 vlist shadow 内，tree-select 自身样式够不到）
    const vlistRoot = vlist.shadowRoot
    if (vlistRoot && !vlistRoot.querySelector('style[data-oas-tree-select-rows]')) {
      const style = document.createElement('style')
      style.setAttribute('data-oas-tree-select-rows', '')
      style.textContent = VIRTUAL_ROW_STYLE
      vlistRoot.appendChild(style)
    }
    // 视口键盘可达性由 trigger 的 combobox 键盘流负责，去掉 vlist 内层 tabindex 避免多余 Tab 停靠点
    vlistRoot?.querySelector<HTMLElement>('.viewport')?.removeAttribute('tabindex')
    vlist.setAttribute('items-role', 'tree')
    vlist.setAttribute('item-role', 'presentation')
    vlist.setAttribute('height', this.getAttr('height', '288'))
    vlist.setAttribute('item-height', this.getAttr('item-height', '36'))
    vlist.items = vis
    this.syncActive()
  }

  private virtualItemHeight(): number {
    const n = Number.parseInt(this.getAttr('item-height', '36'), 10)
    return Number.isNaN(n) || n <= 0 ? 36 : n
  }

  /** 构建一个节点行（缩进线 + 展开按钮/懒加载 spinner + 可选复选框 + 标签），非虚拟与虚拟两路共用 */
  private createNodeRow(
    item: FlatNode,
    index: number,
    container: HTMLElement,
    ctx?: { checked: Set<string>; expanded: Set<string> },
  ): void {
    const { option, depth } = item
    const kids = this.childrenOf(option)
    const hasChildren = !!kids?.length || this.isExpandable(option)
    const expanded = ctx?.expanded ?? this.getExpandedNodes()
    const value = this.valueKeyOf(option)
    const row = document.createElement('div')
    row.className = 'node'
    row.setAttribute('part', 'node')
    row.setAttribute('role', 'treeitem')
    row.setAttribute('aria-level', String(depth + 1))
    row.setAttribute('aria-disabled', String(this.disabledOf(option) ?? false))
    row.setAttribute('data-index', String(index))
    row.id = `tree-opt-${index}` // aria-activedescendant 锚点（shadow 内 id 作用域隔离，无宿主冲突）
    row.style.paddingInlineStart = '8px'
    if (index === this.activeIndex) row.classList.add('active')

    const multiple = this.hasAttr('multiple')
    const checked = ctx?.checked ?? this.internalChecked()
    const isChecked = checked.has(value)
    // 达多选上限后：未勾选行视觉禁用且不可再勾选（已勾选可取消）
    const maxed = multiple && !isChecked && this.maxReached()
    if (maxed) row.setAttribute('aria-disabled', 'true')
    if (multiple) {
      row.setAttribute('aria-selected', String(isChecked))
    } else {
      row.setAttribute('aria-selected', String(this.currentValues().includes(value)))
    }

    // 缩进占位（tree-lines 时渲染为引导竖线，深度即层级）
    for (let i = 0; i < depth; i++) {
      const indent = document.createElement('span')
      indent.className = 'indent'
      indent.setAttribute('aria-hidden', 'true')
      row.appendChild(indent)
    }

    // 展开按钮：懒加载中显示 spinner；可展开节点为可点 button；叶子隐藏占位
    if (this.loadingSet.has(value)) {
      const spinner = document.createElement('span')
      spinner.className = 'toggle-spinner'
      spinner.setAttribute('part', 'spinner')
      spinner.setAttribute('aria-label', this.t('tree.loading'))
      row.appendChild(spinner)
    } else {
      const toggle = document.createElement('button')
      toggle.className = `toggle${hasChildren ? '' : ' leaf'}${expanded.has(value) ? ' open' : ''}`
      toggle.setAttribute('part', 'toggle')
      if (hasChildren) {
        toggle.setAttribute('aria-label', this.t('tree.expand'))
        toggle.setAttribute('aria-expanded', String(expanded.has(value)))
        toggle.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation()
          const set = this.getExpandedNodes()
          if (set.has(value)) {
            set.delete(value)
            this.setExpandedNodes(set)
          } else {
            this.expandNode(option, set)
            return
          }
          this.renderTree()
        })
      } else {
        toggle.setAttribute('aria-hidden', 'true')
        toggle.setAttribute('tabindex', '-1')
      }
      toggle.textContent = '›'
      row.appendChild(toggle)
    }

    if (multiple) {
      const check = document.createElement('span')
      check.className = 'check'
      const isHalf = !isChecked && !this.checkStrictly() && halfByDescendant(this.checkCtx(), checked, value)
      check.classList.toggle('checked', isChecked)
      check.classList.toggle('half', isHalf)
      check.textContent = isChecked ? '✓' : isHalf ? '—' : ''
      check.setAttribute('aria-hidden', 'true')
      row.appendChild(check)
      row.addEventListener('click', () => {
        if (this.disabledOf(option) || maxed) return
        this.toggleCheck(option)
        this.afterRowActivated(option, expanded)
      })
    } else {
      row.addEventListener('click', () => {
        if (this.disabledOf(option)) return
        this.commit([value])
        this.afterRowActivated(option, expanded)
      })
    }

    // 标签：template[slot=node] 克隆 + [data-node-label] 绑定，随后派发 oas-node-render 供宿主改写
    const label = document.createElement('span')
    label.className = 'label'
    this.fillNodeLabel(label, option)
    row.appendChild(label)
    container.appendChild(row)
    this.emit('node-render', {
      node: option,
      element: label,
      level: depth + 1,
      expanded: expanded.has(value),
      selected: multiple ? isChecked : this.currentValues().includes(value),
      checked: multiple ? isChecked : false,
    })
  }

  /** expand-trigger='node'：点击父级标签同时展开（选中行为不变） */
  private afterRowActivated(option: TreeOption, expanded: Set<string>): void {
    if (this.getAttr('expand-trigger', 'toggle') !== 'node') return
    if (!this.isExpandable(option)) return
    const value = this.valueKeyOf(option)
    if (expanded.has(value)) return
    this.expandNode(option, expanded)
  }

  /** 节点 label 渲染：template[slot="node"] 克隆 + [data-node-label] 绑定，缺省回落纯文本 */
  private fillNodeLabel(labelEl: HTMLElement, option: TreeOption): void {
    const tpl = this.querySelector('template[slot="node"]')
    if (tpl instanceof HTMLTemplateElement) {
      labelEl.appendChild(this.slotTemplateFragment(tpl))
      const binder = labelEl.querySelector('[data-node-label]')
      if (binder) binder.textContent = this.labelOf(option)
    } else {
      labelEl.textContent = this.labelOf(option)
    }
  }

  private findNode(value: string): TreeOption | undefined {
    return this.valueMap.get(value)
  }

  // ---------- 回显（label / 路径 / cache-data / chip） ----------

  /** 展示 label：树内节点 → show-path 拼路径或自身 label；树外值 → cache-data 兜底或原文 */
  private displayLabelOf(value: string): string {
    const node = this.valueMap.get(value)
    if (!node) return this.cacheLabels.get(value) ?? value
    if (this.hasAttr('show-path')) return this.pathOf(node)
    return this.labelOf(node)
  }

  /** 节点完整路径（根到自身 label 链，separator 拼接；共享内核 labelPath） */
  private pathOf(node: TreeOption): string {
    return labelPath(this.checkCtx(), this.valueKeyOf(node)).join(this.getAttr('separator', ' / '))
  }

  private syncTrigger(): void {
    if (!this.triggerEl) return
    const placeholder = this.getAttr('placeholder', this.t('treeSelect.placeholder'))
    const valueEl = this.triggerEl.querySelector<HTMLElement>('.value')!
    const values = this.currentValues()
    const disabled = this.injectDisabled()
    this.triggerEl.disabled = disabled

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
      // aria-label 随展示文案变化：空值 = placeholder，有值 = 当前选中标签（AT 可读名称 + 当前值）
      this.triggerEl.setAttribute('aria-label', placeholder)
      return
    }

    const labels = values.map((v) => this.displayLabelOf(v))

    if (this.hasAttr('multiple')) {
      valueEl.innerHTML = ''
      // max-tag-count：仅显式设置时按数量折叠；未设置时 chip 默认换行展示
      const limit = this.hasAttr('max-tag-count')
        ? Math.max(0, Number.parseInt(this.getAttr('max-tag-count', ''), 10) || 0)
        : Number.POSITIVE_INFINITY
      const shown = limit >= 0 ? values.slice(0, limit) : values
      for (const v of shown) {
        const label = this.displayLabelOf(v)
        const chip = document.createElement('span')
        chip.className = 'chip'
        const labelEl = document.createElement('span')
        labelEl.textContent = label
        const rm = document.createElement('button')
        rm.setAttribute('aria-label', this.t('select.remove', { label }))
        rm.textContent = '×'
        rm.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation()
          this.removeValue(v)
        })
        chip.append(labelEl, rm)
        valueEl.appendChild(chip)
      }
      // 折叠计数 chip：仅在显式设置 max-tag-count 且有折叠时插入
      if (shown.length < values.length) {
        const plus = document.createElement('span')
        plus.className = 'chip chip-plus'
        plus.textContent = `+${values.length - shown.length}`
        plus.setAttribute('title', labels.slice(shown.length).join(this.t('treeSelect.join')))
        valueEl.appendChild(plus)
      }
      this.triggerEl.setAttribute('aria-label', labels.join(this.t('treeSelect.join')))
    } else {
      const text = labels[0] ?? values[0] ?? ''
      valueEl.textContent = text
      this.triggerEl.setAttribute('aria-label', text)
    }
  }

  // ---------- 键盘高亮增量同步（不重建 DOM） ----------

  /** 虚拟滚动：让 activeIndex 所在项进入视口（设置 scrollTop，vlist 随 scroll 重算窗口）；非虚拟滚 tree 容器 */
  private scrollActiveIntoView(): void {
    const vis = this.visibleFlat()
    if (this.activeIndex < 0 || this.activeIndex >= vis.length) return
    if (this.hasAttr('virtual') && this.vlist && !this.vlist.hidden) {
      const vp = this.vlist.shadowRoot?.querySelector<HTMLElement>('.viewport')
      if (!vp) return
      const ih = this.virtualItemHeight()
      const vh = Number(this.getAttr('height', '288')) || 288
      const top = this.activeIndex * ih
      const cur = vp.scrollTop
      if (top < cur) vp.scrollTop = Math.max(0, top)
      else if (top + ih > cur + vh) vp.scrollTop = Math.max(0, top + ih - vh)
      return
    }
    const wrap = this.treeWrap
    if (!wrap) return
    const row = wrap.querySelector<HTMLElement>(`[data-index="${this.activeIndex}"]`)
    if (!row) return
    const vh = wrap.clientHeight || 288
    const top = row.offsetTop
    if (top < wrap.scrollTop) wrap.scrollTop = top
    else if (top + row.offsetHeight > wrap.scrollTop + vh) {
      wrap.scrollTop = top + row.offsetHeight - vh
    }
  }

  /** 高亮 class + aria-activedescendant 增量同步（虚拟滚动下窗口随 scroll 重算后行内 class 由 createNodeRow 落定） */
  private syncActive(): void {
    const idx = this.activeIndex
    for (const row of this.renderedRows()) {
      const i = Number(row.getAttribute('data-index'))
      row.classList.toggle('active', i === idx)
    }
    this.syncAriaActiveDescendant()
  }

  /** 已渲染的节点行：非虚拟在 tree 容器、虚拟在 vlist shadow（open shadow 可跨根查询） */
  private renderedRows(): HTMLElement[] {
    const out: HTMLElement[] = []
    const wrap = this.shadow.querySelector('.tree')
    if (wrap) out.push(...wrap.querySelectorAll<HTMLElement>('.node[data-index]'))
    const vroot = this.vlist?.shadowRoot
    if (vroot) out.push(...vroot.querySelectorAll<HTMLElement>('.node[data-index]'))
    return out
  }

  /** combobox 的 aria-activedescendant 指向高亮行（仅展开时） */
  private syncAriaActiveDescendant(): void {
    if (!this.triggerEl) return
    if (!this.openState || this.visibleFlat().length === 0) {
      this.triggerEl.removeAttribute('aria-activedescendant')
      return
    }
    this.triggerEl.setAttribute('aria-activedescendant', `tree-opt-${this.activeIndex}`)
  }

  /** label 点击聚焦委托：把焦点交给 shadow 内 trigger（配合 oas-form-item 的 label 点击代理） */
  override focus(options?: FocusOptions): void {
    this.shadow.querySelector<HTMLButtonElement>('.trigger')?.focus(options)
  }
}
