import { OASElement } from '@oas-ui/core'
// 注册 oas-virtual-list（OASVirtualList 仅作类型用，需裸 import 保住注册副作用）
import '../virtual-list/index.js'
import type { OASVirtualList } from '../virtual-list/index.js'
// 共享树内核：flatten/字段归一 + 勾选级联 + 懒加载状态机 + 模板克隆（与 oas-tree-select 同一实现）
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
  cloneSlotContent,
} from './shared/index.js'
import type {
  ResolvedFields,
  TreeAccessors,
  TreeModel,
  FlatRow,
  CheckStrategy,
} from './shared/index.js'

export interface TreeNode {
  key: string
  label: string
  children?: TreeNode[]
  disabled?: boolean
  /** 懒加载：显式叶子（无可加载子节点，不显示展开箭头） */
  isLeaf?: boolean
  /** 懒加载：已加载完成标记（children 已就绪或确认无子节点） */
  loaded?: boolean
  /** 节点级禁选：点击/键盘不选中，但展开/勾选不受影响 */
  selectable?: boolean
  /** 节点级禁勾选：勾选框禁用，级联跳过（整树 disabled 见组件级 disabled 属性） */
  disableCheckbox?: boolean
  /** 节点级禁重命名：can-rename 总开关下细粒度排除（缺省可重命名） */
  renamable?: boolean
}

const FOLDER_ICON_SVG =
  '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2.5 4.5 C2.5 3.95 2.95 3.5 3.5 3.5 H6.5 L8 5 H12.5 C13.05 5 13.5 5.45 13.5 6 V11 C13.5 11.55 13.05 12 12.5 12 H3.5 C2.95 12 2.5 11.55 2.5 11 Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>'
const FOLDER_OPEN_ICON_SVG =
  '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2.5 4.5 C2.5 3.95 2.95 3.5 3.5 3.5 H6.5 L8 5 H12.5 C13.05 5 13.5 5.45 13.5 6 V11 C13.5 11.55 13.05 12 12.5 12 H3.5 C2.95 12 2.5 11.55 2.5 11 Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M4.5 11.5 L5.5 7 H13.5 L12.5 11.5 Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>'
const FILE_ICON_SVG =
  '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 2 H8.5 L12 5.5 V13 C12 13.55 11.55 14 11 14 H4 C3.45 14 3 13.55 3 13 V3 C3 2.45 3.45 2 4 2 Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M8.5 2 V5.5 H12" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>'

/** 行级样式（树自身 shadow 与注入 vlist shadow 两处共用；颜色一律走 CSS 变量 token） */
const ROW_STYLE = `
.row {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding: var(--oas-space-1) var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  cursor: default;
  box-sizing: border-box;
}
.row:hover {
  background: var(--oas-color-bg-hover);
}
.row[data-selected='true'] {
  background: var(--oas-color-primary-soft, color-mix(in srgb, var(--oas-color-primary) 10%, transparent));
  color: var(--oas-color-primary-active);
}
.row:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
.row[data-disabled='true'] {
  opacity: 0.6;
}
.tree.disabled .row,
:host(.disabled) .row {
  pointer-events: none;
  opacity: 0.55;
}
.row[data-disabled='true'] .label {
  color: var(--oas-color-text-secondary);
}
.row.dragging {
  opacity: 0.5;
}
.row.drop-inner {
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
}
.row.drop-before::before,
.row.drop-after::after {
  content: '';
  position: absolute;
  left: var(--oas-space-1);
  right: var(--oas-space-1);
  height: 2px;
  background: var(--oas-color-primary);
}
.row.drop-before::before {
  top: 0;
}
.row.drop-after::after {
  bottom: 0;
}
.indent {
  width: 20px;
  flex: none;
  align-self: stretch;
}
.tree.tree-lines .indent,
:host(.tree-lines) .indent {
  border-inline-start: 1px solid var(--oas-color-border);
}
.toggle {
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  padding: 0;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.toggle.leaf {
  visibility: hidden;
}
.toggle.open {
  transform: rotate(90deg);
}
.toggle-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
.toggle-spinner::before {
  content: '';
  width: 12px;
  height: 12px;
  border: 2px solid var(--oas-color-border);
  border-top-color: var(--oas-color-primary);
  border-radius: 50%;
  animation: oas-tree-spin 0.8s linear infinite;
}
@keyframes oas-tree-spin {
  to {
    transform: rotate(360deg);
  }
}
.check {
  accent-color: var(--oas-color-primary);
  margin: 0;
  flex-shrink: 0;
}
.node-icon {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--oas-color-text-secondary);
}
.node-icon svg {
  width: 16px;
  height: 16px;
  display: block;
}
.label {
  user-select: none;
  /* 防压扁：label 占用行内剩余宽度且保证最小可见宽度，避免被 flex 压缩到 0 宽后文字/省略号全不可见 */
  flex: 1 1 auto;
  min-width: var(--oas-control-height-sm, 24px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.label mark {
  background: var(--oas-color-primary-soft, color-mix(in srgb, var(--oas-color-primary) 18%, transparent));
  color: inherit;
  border-radius: 2px;
}
/* 内联重命名：编辑态输入框占满 label 区，替换文本显示 */
.label.renaming {
  overflow: visible;
  cursor: text;
}
.rename-input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  font: inherit;
  color: inherit;
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-primary);
  border-radius: var(--oas-radius-sm);
  padding: 0 var(--oas-space-1);
  margin: 0;
  outline: none;
  user-select: text;
}
/* motion 行过渡钩子：入场/离场类 + 虚拟行淡入降级（reduced-motion 停用） */
.oas-row-enter,
.oas-row-leave {
  overflow: hidden;
}
.oas-row-fade {
  animation: oas-tree-row-fade var(--oas-transition-base, 180ms) var(--oas-ease-out, cubic-bezier(0.2, 0, 0.2, 1));
}
@keyframes oas-tree-row-fade {
  from {
    opacity: 0;
    transform: translateY(-3px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .oas-row-fade {
    animation: none;
  }
}
`

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
}
.tree {
  outline: none;
}
.tree.drop-inner {
  outline: 2px dashed var(--oas-color-primary);
  outline-offset: -2px;
  border-radius: var(--oas-radius-md);
}
.tree:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
.empty {
  padding: var(--oas-space-4);
  text-align: center;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.empty[hidden] {
  display: none;
}
${ROW_STYLE}
`

/**
 * 虚拟路径行样式：行渲染在 oas-virtual-list 的 shadow 内，tree 自身样式够不到；
 * ::part() 后不支持链后代选择器（浏览器静默丢规则），故注入 vlist 的 shadow root。
 * tree-lines / disabled 类挂在 vlist 宿主上，经 :host(.xxx) 生效。
 */
const VIRTUAL_ROW_STYLE = `
[part="item"] {
  display: flex;
  align-items: center;
}
[part="item"] .row {
  flex: 1;
  height: 100%;
}
:host(.tree-lines) .indent {
  border-inline-start: 1px solid var(--oas-color-border);
}
${ROW_STYLE}
`

/** 按字段别名构造共享访问器（TreeNode 经 record 索引读取原始数据） */
function makeTreeAccessors(fields: ResolvedFields): TreeAccessors<TreeNode> {
  const read = (n: TreeNode): Record<string, unknown> => n as unknown as Record<string, unknown>
  return {
    idOf: (n) => {
      const v = read(n)[fields.idField]
      return typeof v === 'string' ? v : ''
    },
    labelOf: (n) => {
      const v = read(n)[fields.labelField]
      return typeof v === 'string' ? v : ''
    },
    childrenOf: (n) => {
      const v = read(n)[fields.childrenField]
      return Array.isArray(v) ? (v as TreeNode[]) : undefined
    },
    disabledOf: (n) => read(n)[fields.disabledField] === true,
    isLeafOf: (n) => read(n)[fields.isLeafField] === true,
    loadedOf: (n) => read(n)[fields.loadedField] === true,
    // 级联跳过判定：disabled 或 disableCheckbox（勾选框禁用语义与整节点禁用一致不进级联）
    inertOf: (n) => read(n)[fields.disabledField] === true || read(n).disableCheckbox === true,
  }
}

/** JSON 数组属性解析（expanded / checked / selected-multiple 统一形态） */
function parseIdList(raw: string): string[] {
  if (raw === '') return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []
  } catch {
    return []
  }
}

/**
 * oas-tree —— 树形控件，支持大数据量虚拟化与键盘/勾选/过滤等完整交互。
 *
 * 状态约定（自 v2.5 起破坏性变更，与 oas-tree-select 对齐）：
 * - `expanded` / `checked` / multiple 态 `selected` 一律 JSON 字符串数组（旧版逗号串已废弃）；
 * - `checkable` 勾选为级联模型：父勾 → 可勾选子级全勾，子级全勾 → 父级收敛，
 *   半选回显（input.indeterminate），`check-strictly` 解耦，`check-strategy` 控制导出值；
 * - 字段别名 `field-names`（key/label/children/disabled/isLeaf/loaded）在数据入口归一化。
 *
 * 虚拟化（可选）：设置 `height`（视口高度 px）后经内嵌 oas-virtual-list 仅渲染窗口行。
 */
export class OASTree extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'data',
      'selected',
      'multiple',
      'checked',
      'checkable',
      'check-strategy',
      'check-strictly',
      'expanded',
      'default-expand-all',
      'accordion',
      'auto-expand-parent',
      'expand-trigger',
      'filter',
      'filter-highlight',
      'field-names',
      'tree-lines',
      'height',
      'row-height',
      'lazy',
      'draggable',
      'directory',
      'disabled',
      'empty',
      'can-rename',
      'motion',
    ]
  }

  /**
   * 懒加载回调：展开未加载节点时触发 `{ key }`，宿主回填子节点后重设 data。
   * 返回 Promise 且 reject 时：自动清 loading、回滚 expanded、派发 oas-load-error，
   * 节点恢复可点击重试（低成本失败重试）。
   */
  load?: (payload: { key: string }) => void | Promise<unknown>

  /** 自定义过滤函数：(label, node) => boolean；缺省按 label 包含关键词（大小写不敏感） */
  filterNode?: (label: string, node: TreeNode) => boolean

  /** 拖拽落点守卫：(payload) => boolean，false 拒绝该落点（dragover/drop 均生效） */
  allowDrop?: (payload: {
    dragKey: string
    dropKey: string
    position: 'before' | 'after' | 'inner'
  }) => boolean

  /** 拖拽源守卫：(node) => boolean，false 该节点不可拖拽 */
  allowDrag?: (node: TreeNode) => boolean

  private _data: TreeNode[] = []
  private fields: ResolvedFields = defaultFields('key')
  private acc: TreeAccessors<TreeNode> = makeTreeAccessors(defaultFields('key'))
  private model: TreeModel<TreeNode> = flattenModel([], makeTreeAccessors(defaultFields('key')))
  private visible: FlatRow<TreeNode>[] = []
  private vlist: OASVirtualList | null = null
  /** 正在懒加载的节点 key 集合 */
  private loading = new Set<string>()
  /** 当前正在拖拽的节点 key */
  private dragKey: string | null = null
  /** roving tabindex：当前键盘焦点的可见行 key */
  private rovingKey: string | null = null
  /** 焦点是否在树内（重渲染后恢复焦点用） */
  private focusInside = false
  /** expanded 属性写回守卫（auto-expand-parent 归一化防递归） */
  private syncingExpanded = false
  /** id → 父 id（auto-expand-parent / 键盘回父级用，update 时重建） */
  private parentIndex = new Map<string, string>()

  // ---------- 内联重命名状态 ----------

  /** 进行中的重命名（key + 进入编辑前的旧 label + 编辑草稿值；组件不写数据，由宿主受控） */
  private rename: { key: string; oldLabel: string; value: string } | null = null
  /** update 重建后需要把焦点送回编辑输入框（开始编辑/外部重建保住输入焦点） */
  private renameFocusPending = false
  /** 手工双击判定的上一击签名（双击进编辑在行重建架构下原生 dblclick 不可靠，对齐 table 同源做法） */
  private lastLabelClick: { key: string; time: number } | null = null
  /** 双击第二击进入编辑后抑制随后的行点击选中（防 multiple 下再点取消选中） */
  private suppressRowSelect = false

  // ---------- motion 展开/收起过渡状态 ----------

  /** motion 离场动画进行中（防 200ms 窗口内重复收起/连点抖动） */
  private motionCollapsing = false
  /** motion 收起落库延迟定时器（onCleanup 清理） */
  private motionCollapseTimer = 0

  get data(): TreeNode[] {
    return this._data
  }
  set data(value: TreeNode[] | string) {
    this.setAttribute('data', typeof value === 'string' ? value : JSON.stringify(value))
  }

  // ---------- 模板 / 绑定（render 与水合共用） ----------

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="tree" part="tree" role="tree" tabindex="-1"></div>
      <oas-virtual-list part="virtual" hidden></oas-virtual-list>
      <div class="empty" part="empty" hidden></div>
    `
  }

  private bind(): void {
    this.vlist = this.shadow.querySelector<OASVirtualList>('oas-virtual-list')
    // 行自带 roving tabindex：经公共契约关闭 vlist 视口聚焦（tree 不做 Tab 停靠点），
    // 取代直查 vlist shadow 内部 .viewport 移除 tabindex 的耦合写法
    if (this.vlist) this.vlist.viewportFocusable = false
    // 行样式注入 vlist 的 shadow（其 render 已在 innerHTML 插入时同步完成，后追加不会被覆盖）
    const vlistRoot = this.vlist?.shadowRoot
    if (vlistRoot && !vlistRoot.querySelector('style[data-oas-tree-rows]')) {
      const style = document.createElement('style')
      style.setAttribute('data-oas-tree-rows', '')
      style.textContent = VIRTUAL_ROW_STYLE
      vlistRoot.appendChild(style)
    }
    this.vlist?.addEventListener('oas-item', ((
      e: CustomEvent<{ index: number; item: FlatRow<TreeNode>; element: HTMLElement }>,
    ) => {
      const detail = e.detail
      if (detail && detail.item && detail.element) {
        this.renderRow(detail.item, detail.element)
      }
    }) as EventListener)
    // 根容器拖放：拖到空白处视为移入根（dropKey 为空字符串、position 'inner'）
    const wrap = this.shadow.querySelector<HTMLElement>('.tree')
    if (wrap) {
      wrap.addEventListener('dragover', (e: Event) => {
        if (!this.dragKey) return
        const target = e.target as HTMLElement
        if (target.closest('[part="row"]')) return
        e.preventDefault()
        const dt = (e as DragEvent).dataTransfer
        if (dt) dt.dropEffect = 'move'
        wrap.classList.add('drop-inner')
      })
      wrap.addEventListener('dragleave', () => wrap.classList.remove('drop-inner'))
      wrap.addEventListener('drop', (e: Event) => {
        const target = e.target as HTMLElement
        if (target.closest('[part="row"]')) return
        e.preventDefault()
        wrap.classList.remove('drop-inner')
        if (this.dragKey) {
          if (this.guardDrop({ dragKey: this.dragKey, dropKey: '', position: 'inner' })) {
            this.emit('node-drop', {
              dragKey: this.dragKey,
              dropKey: '',
              position: 'inner',
            })
          }
          this.dragKey = null
        }
      })
    }
    this.addEventListener('focusin', this.onTreeFocusIn)
    this.addEventListener('focusout', this.onTreeFocusOut)
    // 双击进重命名：capture 相位先于行点击处理器判定（首击选中重建行 → 原生 dblclick 不可靠）
    this.addEventListener('click', this.onRenameClickCapture, true)
    this.onCleanup(() => {
      if (this.motionCollapseTimer) {
        clearTimeout(this.motionCollapseTimer)
        this.motionCollapseTimer = 0
      }
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.tree')) return false
    if (!this.shadow.querySelector('oas-virtual-list')) return false
    this.bind()
    return true
  }

  /** expanded 外部注入深层 key 时按 auto-expand-parent 自动补全祖先（写回归一化） */
  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (name === 'expanded' && this.hasAttr('auto-expand-parent') && !this.syncingExpanded) {
      this.syncingExpanded = true
      try {
        const merged = this.addAncestors(new Set(parseIdList(newValue ?? '')))
        const mergedJson = JSON.stringify([...merged])
        if (mergedJson !== (newValue ?? '')) {
          this.setAttribute('expanded', mergedJson)
          return // 归一再入 attributeChangedCallback（super 只跑一次）
        }
      } finally {
        this.syncingExpanded = false
      }
    }
    super.attributeChangedCallback(name, oldValue, newValue)
  }

  // ---------- 数据 / 字段解析 ----------

  private parseFieldNames(): void {
    const raw = this.getAttr('field-names', '')
    this.fields = resolveFieldNames(raw, 'key', 'key', true)
    this.acc = makeTreeAccessors(this.fields)
  }

  private parseData(): void {
    try {
      const parsed = JSON.parse(this.getAttr('data', '[]'))
      this._data = Array.isArray(parsed) ? parsed.filter((n) => n && typeof n === 'object') : []
    } catch {
      this._data = []
    }
  }

  private rebuildParentIndex(): void {
    this.parentIndex.clear()
    const walk = (list: TreeNode[], parentId?: string): void => {
      for (const node of list) {
        const id = this.acc.idOf(node)
        if (parentId !== undefined) this.parentIndex.set(id, parentId)
        const kids = this.acc.childrenOf(node)
        if (kids?.length) walk(kids, id)
      }
    }
    walk(this._data)
  }

  // ---------- 状态读取 ----------

  private isTreeDisabled(): boolean {
    return this.injectDisabled()
  }

  private filtering(): boolean {
    return this.getAttr('filter', '').trim() !== ''
  }

  private matchesQuery(node: TreeNode): boolean {
    const term = this.getAttr('filter', '').trim()
    const label = this.acc.labelOf(node)
    const userFilter = typeof this.filterNode === 'function' ? this.filterNode : null
    if (userFilter) return !!userFilter(label, node)
    return label.toLowerCase().includes(term.toLowerCase())
  }

  /** 当前展开集合：expanded 属性（JSON 数组）→ 缺省回落 default-expand-all 全展开 */
  private expandedSet(): Set<string> {
    const raw = this.getAttr('expanded', '')
    if (raw !== '') return new Set(parseIdList(raw))
    if (this.hasAttr('default-expand-all')) {
      const set = new Set<string>()
      for (const row of this.model.rows) {
        if (this.acc.childrenOf(row.node)?.length) set.add(this.acc.idOf(row.node))
      }
      return set
    }
    return new Set()
  }

  private checkStrictly(): boolean {
    return this.hasAttr('check-strictly')
  }

  private checkStrategy(): CheckStrategy {
    const s = this.getAttr('check-strategy', 'all')
    return s === 'parent' || s === 'child' ? s : 'all'
  }

  private internalChecked(): Set<string> {
    if (this.checkStrictly()) return new Set(parseIdList(this.getAttr('checked', '')))
    return closureFromValues(
      { model: this.model, acc: this.acc },
      parseIdList(this.getAttr('checked', '')),
    )
  }

  private currentSelected(): string[] {
    if (!this.hasAttr('multiple')) {
      const raw = this.getAttr('selected', '')
      return raw === '' ? [] : [raw]
    }
    return parseIdList(this.getAttr('selected', ''))
  }

  /** 可见行：过滤态 = 命中 + 祖先 + 命中子树；常态 = 根 + 展开节点的直接子级 */
  private visibleRows(): FlatRow<TreeNode>[] {
    if (this.filtering()) return this.filterVisibleRows()
    const expanded = this.expandedSet()
    return this.model.rows.filter((row) => row.parent === undefined || expanded.has(row.parent))
  }

  /**
   * 宽松过滤：命中节点 + 其全部祖先（路径上下文）+ 其全部后代（命中即含子树）可见；
   * 过滤态不依赖 expanded（自动展开显示命中路径），与 tree-select 面板搜索同语义。
   */
  private filterVisibleRows(): FlatRow<TreeNode>[] {
    const match = (node: TreeNode): boolean => this.matchesQuery(node)
    const visible = new Set<string>()
    const mark = (list: TreeNode[]): boolean => {
      let any = false
      for (const node of list) {
        const id = this.acc.idOf(node)
        if (visible.has(id)) continue // 已被祖先命中展开的子树整体可见
        const self = match(node)
        const kids = this.acc.childrenOf(node) ?? []
        const sub = kids.length ? mark(kids) : false
        if (self || sub) {
          visible.add(id)
          any = true
          if (self) {
            // 命中含全部后代：整个子树可见
            const addAll = (l: TreeNode[]): void => {
              for (const k of l) {
                visible.add(this.acc.idOf(k))
                addAll(this.acc.childrenOf(k) ?? [])
              }
            }
            addAll(kids)
          }
        }
      }
      return any
    }
    mark(this._data)
    return this.model.rows.filter((row) => visible.has(this.acc.idOf(row.node)))
  }

  /** auto-expand-parent：为集合内每个 key 补全祖先链 */
  private addAncestors(set: Set<string>): Set<string> {
    const out = new Set(set)
    for (const id of [...set]) {
      let cur = this.parentIndex.get(id)
      let guard = 0
      while (cur !== undefined && guard <= this.model.rows.length + 1) {
        out.add(cur)
        cur = this.parentIndex.get(cur)
        guard++
      }
    }
    return out
  }

  private isExpandableNode(node: TreeNode): boolean {
    return expandableNode(node, this.acc, this.hasAttr('lazy'))
  }

  private nodeDisabled(node: TreeNode): boolean {
    return this.acc.disabledOf(node)
  }

  private nodeSelectable(node: TreeNode): boolean {
    if (this.acc.disabledOf(node)) return false
    const raw = node as unknown as Record<string, unknown>
    return raw.selectable !== false
  }

  private nodeCheckable(node: TreeNode): boolean {
    if (this.acc.disabledOf(node)) return false
    const raw = node as unknown as Record<string, unknown>
    return raw.disableCheckbox !== true
  }

  // ---------- update / 渲染入口 ----------

  protected override update(): void {
    this.parseFieldNames()
    this.parseData()
    this.model = flattenModel(this._data, this.acc)
    releaseLoading(this.model, this.acc, this.loading)
    this.rebuildParentIndex()
    // auto-expand-parent 归一化：覆盖「首渲染前 expanded 已预置深层 key」的通道
    if (this.hasAttr('auto-expand-parent') && !this.syncingExpanded) {
      const raw = this.getAttr('expanded', '')
      if (raw !== '') {
        const merged = this.addAncestors(new Set(parseIdList(raw)))
        const mergedJson = JSON.stringify([...merged])
        if (mergedJson !== raw) {
          this.syncingExpanded = true
          try {
            this.setAttribute('expanded', mergedJson)
          } finally {
            this.syncingExpanded = false
          }
          return // 归一化写回经 attributeChangedCallback 再入 update
        }
      }
    }
    this.visible = this.visibleRows()
    // 编辑行从可见集消失（数据/过滤变化）→ 静默退出编辑，防悬挂草稿态
    if (
      this.rename &&
      !this.visible.some((r) => this.acc.idOf(r.node) === this.rename!.key)
    ) {
      this.rename = null
      this.renameFocusPending = false
    }
    const virtual = this.getAttr('height', '') !== ''
    const wrap = this.shadow.querySelector<HTMLElement>('.tree')
    const emptyEl = this.shadow.querySelector<HTMLElement>('.empty')
    if (!wrap || !emptyEl) return

    wrap.hidden = virtual
    wrap.classList.toggle('tree-lines', this.hasAttr('tree-lines'))
    wrap.classList.toggle('disabled', this.isTreeDisabled())
    wrap.classList.toggle('motion', this.hasAttr('motion'))

    if (this.visible.length === 0) {
      if (this.vlist) this.vlist.hidden = true
      wrap.innerHTML = ''
      emptyEl.hidden = false
      this.fillEmpty(emptyEl)
      this.vlist?.classList.toggle('disabled', this.isTreeDisabled())
      this.vlist?.classList.toggle('motion', this.hasAttr('motion'))
      return
    }
    emptyEl.hidden = true

    if (virtual && this.vlist) {
      wrap.hidden = true
      this.vlist.hidden = false
      this.vlist.classList.toggle('tree-lines', this.hasAttr('tree-lines'))
      this.vlist.classList.toggle('disabled', this.isTreeDisabled())
      this.vlist.classList.toggle('motion', this.hasAttr('motion'))
      this.vlist.setAttribute('items-role', 'tree')
      this.vlist.setAttribute('item-role', 'presentation')
      this.vlist.setAttribute('aria-label', this.t('tree.select'))
      this.vlist.setAttribute('height', this.getAttr('height', '360'))
      this.vlist.setAttribute('item-height', this.getAttr('row-height', '32'))
      this.vlist.items = this.visible
      this.syncRoving()
      this.syncRenameFocus()
      return
    }
    if (this.vlist) {
      this.vlist.hidden = true
      this.vlist.removeAttribute('items-role')
      this.vlist.removeAttribute('item-role')
      this.vlist.removeAttribute('aria-label')
    }
    wrap.innerHTML = ''
    const checked = this.internalChecked()
    const expanded = this.expandedSet()
    if (this.hasAttr('multiple') || this.hasAttr('checkable')) {
      wrap.setAttribute('aria-multiselectable', 'true')
    } else {
      wrap.removeAttribute('aria-multiselectable')
    }
    for (const flat of this.visible) {
      this.renderRow(flat, wrap, { checked, expanded })
    }
    this.syncRoving()
    this.syncRenameFocus()
  }

  // ---------- 行渲染（虚拟/非虚拟共用） ----------

  private renderRow(
    flat: FlatRow<TreeNode>,
    container: HTMLElement,
    ctx?: { checked: Set<string>; expanded: Set<string> },
  ): void {
    const { node, depth } = flat
    const id = this.acc.idOf(node)
    const selected = this.currentSelected()
    const isSelected = selected.includes(id)
    const checkable = this.hasAttr('checkable')
    const expanded = ctx?.expanded ?? this.expandedSet()
    const checked = ctx?.checked ?? this.internalChecked()
    const isChecked = checked.has(id)
    const isHalf =
      checkable &&
      !isChecked &&
      !this.checkStrictly() &&
      halfByDescendant({ model: this.model, acc: this.acc }, checked, id)
    const disabled = this.nodeDisabled(node) || this.isTreeDisabled()

    const row = document.createElement('div')
    row.className = 'row'
    row.setAttribute('part', 'row')
    row.setAttribute('role', 'treeitem')
    row.setAttribute('aria-level', String(depth + 1))
    row.setAttribute('data-key', id)
    row.setAttribute('data-disabled', String(this.nodeDisabled(node)))
    row.setAttribute('data-selected', String(isSelected))
    row.tabIndex = -1

    // 缩进占位（tree-lines 时渲染为引导竖线；占位恒在保证行结构稳定）
    for (let i = 0; i < depth; i++) {
      const indent = document.createElement('span')
      indent.className = 'indent'
      indent.setAttribute('aria-hidden', 'true')
      row.appendChild(indent)
    }

    if (this.isExpandableNode(node)) {
      if (this.loading.has(id)) {
        const spinner = document.createElement('span')
        spinner.className = 'toggle-spinner'
        spinner.setAttribute('part', 'spinner')
        spinner.setAttribute('aria-label', this.t('tree.loading'))
        this.fillToggleLoading(spinner)
        row.appendChild(spinner)
      } else {
        const toggle = document.createElement('button')
        toggle.className = `toggle${expanded.has(id) ? ' open' : ''}`
        toggle.setAttribute('part', 'toggle')
        toggle.setAttribute('aria-label', this.t('tree.expand'))
        toggle.setAttribute('aria-expanded', String(expanded.has(id)))
        toggle.setAttribute('tabindex', '-1')
        this.fillToggle(toggle)
        toggle.addEventListener('click', (e: MouseEvent) => {
          e.stopPropagation()
          this.toggleExpansion(node)
        })
        row.appendChild(toggle)
      }
    } else {
      const toggle = document.createElement('button')
      toggle.className = 'toggle leaf'
      toggle.setAttribute('aria-hidden', 'true')
      toggle.setAttribute('tabindex', '-1')
      row.appendChild(toggle)
    }

    if (this.hasAttr('directory')) this.appendNodeIcon(row, node, expanded)
    if (checkable) {
      const box = document.createElement('input')
      box.type = 'checkbox'
      box.className = 'check'
      box.setAttribute('aria-label', this.t('tree.select', { label: this.acc.labelOf(node) }))
      box.checked = isChecked
      // 半选回显：indeterminate 为真时浏览器画横线
      box.indeterminate = isHalf
      box.disabled = !this.nodeCheckable(node) || disabled
      box.tabIndex = -1
      // 阻止复选框点击冒泡到行：既避免误触发行选中，也避免行内 update()
      // 重建 DOM 打断浏览器对复选框的原生激活（toggle + change）
      box.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation()
      })
      box.addEventListener('change', () => {
        this.toggleCheckByKey(id)
      })
      row.appendChild(box)
    }

    const renaming = this.rename?.key === id
    const label = document.createElement('span')
    label.className = renaming ? 'label renaming' : 'label'
    if (renaming) {
      label.appendChild(this.buildRenameInput(node))
    } else {
      this.fillNodeLabel(label, node)
    }
    row.appendChild(label)

    row.addEventListener('click', () => {
      this.handleRowClick(node)
    })
    // 行级 keydown：roving 方向键/展开/勾选（无需跨 shadow 冒泡，虚拟/非虚拟一致可达）
    row.addEventListener('keydown', this.onTreeKeydown)
    if (this.hasAttr('draggable')) this.bindDrag(row, node)
    container.appendChild(row)
    this.emit('node-render', {
      node,
      element: label,
      level: depth + 1,
      expanded: expanded.has(id),
      selected: isSelected,
      checked: checkable ? isChecked : false,
    })
  }

  // ---------- 交互（点选 / 勾选 / 展开） ----------

  private handleRowClick(node: TreeNode): void {
    // 双击进重命名的第二击：capture 相位已进入编辑，抑制本次行点击选中（防 multiple 反选）
    if (this.suppressRowSelect) {
      this.suppressRowSelect = false
      return
    }
    if (this.isTreeDisabled() || this.nodeDisabled(node)) return
    const id = this.acc.idOf(node)
    // 点选（selectable 排除；勾选树同样可点选，与 oas-tree-select 语义一致）
    if (this.nodeSelectable(node)) {
      if (this.hasAttr('multiple')) {
        const selected = this.currentSelected()
        const idx = selected.indexOf(id)
        if (idx >= 0) {
          selected.splice(idx, 1)
          this.setAttribute('selected', JSON.stringify(selected))
          this.emit('select', { key: id, selected: false })
        } else {
          selected.push(id)
          this.setAttribute('selected', JSON.stringify(selected))
          this.emit('select', { key: id, selected: true })
        }
      } else {
        this.setAttribute('selected', id)
        this.emit('select', { key: id, selected: true })
      }
    }
    // expand-trigger='node'：点击节点同时展开/收起（对勾选树同样生效）
    if (this.getAttr('expand-trigger', 'toggle') === 'node') {
      this.toggleExpansion(node)
    }
  }

  private toggleCheckByKey(id: string): void {
    if (this.isTreeDisabled()) return
    const node = this.model.byId.get(id)
    if (!node || !this.nodeCheckable(node)) return
    const ctx = { model: this.model, acc: this.acc }
    const checked = this.internalChecked()
    flipChecked(ctx, checked, id, this.checkStrictly())
    const values = applyCheckStrategy(
      ctx,
      checked,
      this.checkStrictly() ? 'all' : this.checkStrategy(),
      parseIdList(this.getAttr('checked', '')),
    )
    this.setAttribute('checked', JSON.stringify(values))
    // 翻转后该节点自身在闭包集合中的最终态（级联下勾选父/子均收敛，直接读集合成员）
    this.emit('check', { key: id, checked: checked.has(id) })
  }

  /** 展开/收起切换（toggle 按钮、expand-trigger='node'、键盘 →/← 共用入口） */
  private toggleExpansion(node: TreeNode): void {
    if (this.isTreeDisabled() || this.nodeDisabled(node)) return
    const id = this.acc.idOf(node)
    if (this.loading.has(id)) return
    if (!this.isExpandableNode(node)) return
    const exp = this.expandedSet()
    if (exp.has(id)) {
      // motion 开：先离场动画再落库（收起延迟 ~过渡时长，动画期间防重复触发）
      this.collapseWithMotion(exp, node)
    } else {
      this.expandNode(exp, node)
    }
  }

  private expandNode(exp: Set<string>, node: TreeNode): void {
    const id = this.acc.idOf(node)
    exp.add(id)
    if (this.hasAttr('accordion')) {
      // 手风琴：收起同父展开中的兄弟（及其子树）
      const parentId = this.model.rows.find((r) => this.acc.idOf(r.node) === id)?.parent
      for (const row of this.model.rows) {
        if (row.parent === parentId && this.acc.idOf(row.node) !== id) {
          this.collapseNode(exp, this.acc.idOf(row.node))
        }
      }
    }
    // 先写 expanded（loading 态依赖展开集合展示），再触发懒加载；
    // 失败重试路径会再次改写 expanded 回滚
    this.commitExpanded(exp)
    // motion 开：对刚落库新增的子树行播放入场过渡（懒加载等子节点尚未就绪时无行可播）
    if (this.hasAttr('motion')) {
      const keys = this.subtreeVisibleKeys(id)
      if (keys.length) this.animateRowsIn(keys)
    }
    if (loadPendingNode(node, this.acc, this.hasAttr('lazy'))) this.triggerLoad(node)
  }

  private collapseNode(exp: Set<string>, id: string): void {
    exp.delete(id)
    // 收起子树：移除 id 全部后代 key（防止 auto-expand-parent 归一化把已收起的祖先补回来）
    const node = this.model.byId.get(id)
    if (node) {
      const drop = (list?: TreeNode[]): void => {
        for (const n of list ?? []) {
          exp.delete(this.acc.idOf(n))
          drop(this.acc.childrenOf(n))
        }
      }
      drop(this.acc.childrenOf(node))
    }
    this.commitExpanded(exp)
  }

  private commitExpanded(set: Set<string>): void {
    this.setAttribute('expanded', JSON.stringify([...set]))
  }

  /** 懒加载：loading 入集 + 派发 oas-load + 调 el.load；Promise reject → 失败回滚 */
  private triggerLoad(node: TreeNode): void {
    const id = this.acc.idOf(node)
    if (this.loading.has(id)) return
    this.loading.add(id)
    this.emit('load', { key: id })
    let ret: unknown
    try {
      ret = this.load?.({ key: id })
    } catch (error) {
      this.loadFailed(node, error)
      return
    }
    // 立即刷新：expanded 写回与 loading 入集分属两次 update，补一次渲染让 spinner 落位
    this.update()
    if (ret && typeof (ret as PromiseLike<unknown>).then === 'function') {
      ;(ret as PromiseLike<unknown>).then(
        () => undefined,
        (error: unknown) => this.loadFailed(node, error),
      )
    }
  }

  private loadFailed(node: TreeNode, error: unknown): void {
    const id = this.acc.idOf(node)
    this.loading.delete(id)
    const exp = this.expandedSet()
    exp.delete(id)
    this.commitExpanded(exp)
    this.emit('load-error', {
      key: id,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // ---------- 节点重命名（can-rename：双击 label / F2 进入内联编辑） ----------

  /** can-rename 总开关 + 节点可重命名判定（节点级 disabled / renamable:false 排除） */
  private nodeRenamable(node: TreeNode): boolean {
    if (!this.hasAttr('can-rename') || this.isTreeDisabled()) return false
    if (this.acc.disabledOf(node)) return false
    const raw = node as unknown as Record<string, unknown>
    return raw.renamable !== false
  }

  /**
   * 进入内联编辑。数据由宿主受控：组件只把用户输入记在草稿态，
   * 提交仅派发 oas-node-rename，不改数据模型（宿主不更新则保持旧值）。
   */
  private startRename(key: string): void {
    if (!this.hasAttr('can-rename') || this.isTreeDisabled()) return
    const node = this.model.byId.get(key)
    if (!node || !this.nodeRenamable(node)) return
    if (this.rename) {
      if (this.rename.key === key) return
      this.commitRename(false) // 换行编辑前先提交旧行（与 blur 语义一致）
    }
    const label = this.acc.labelOf(node)
    this.rename = { key, oldLabel: label, value: label }
    this.renameFocusPending = true
    this.update()
  }

  /** 提交：空值/未变静默退出；变化后派发 oas-node-rename { key, label, oldLabel } */
  private commitRename(restoreFocus: boolean): void {
    const state = this.rename
    if (!state) return
    this.rename = null
    this.renameFocusPending = false
    const { key, oldLabel } = state
    const label = state.value
    // 非破坏默认：清空输入按未提交还原（不派发）
    const changed = label.trim() !== '' && label !== oldLabel
    if (changed) this.emit('node-rename', { key, label, oldLabel })
    if (restoreFocus) {
      // Enter 提交：整树重建恢复模板/自定义节点视觉（node-render 随行重发），焦点回行
      this.update()
      this.focusRowByKey(key)
    } else {
      // blur 提交：就地换回数据 label（不重建以免吞掉本次点击对目标行的选中）
      this.restoreRowDisplay(key)
    }
  }

  /** Esc 取消：还原显示、不派发事件；整树重建恢复模板视觉后焦点回行 */
  private cancelRename(): void {
    const state = this.rename
    if (!state) return
    this.rename = null
    this.renameFocusPending = false
    this.update()
    this.focusRowByKey(state.key)
  }

  /** 退出编辑：把该行 label 换回数据展示文本（就地替换，不做整树重建以免吞掉后续点击） */
  private restoreRowDisplay(key: string): void {
    const row = this.rowElByKey(key)
    if (!row) return
    const label = row.querySelector<HTMLElement>('.label')
    if (!label || !label.querySelector('.rename-input')) return
    const node = this.model.byId.get(key)
    if (!node) return
    label.classList.remove('renaming')
    label.textContent = ''
    this.fillNodeLabel(label, node)
  }

  /** 构造编辑输入框（Enter 提交 / Esc 取消 / blur 提交；键盘归 input，不干扰 roving） */
  private buildRenameInput(node: TreeNode): HTMLInputElement {
    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'rename-input'
    input.setAttribute('part', 'rename-input')
    input.value = this.rename?.value ?? this.acc.labelOf(node)
    input.setAttribute('aria-label', this.acc.labelOf(node))
    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        if (this.rename) this.rename.value = input.value
        this.commitRename(true)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        this.cancelRename()
      }
    })
    input.addEventListener('input', () => {
      if (this.rename) this.rename.value = input.value
    })
    // 输入框内点击不触发整行选中/双击判定
    input.addEventListener('click', (e: MouseEvent) => e.stopPropagation())
    input.addEventListener('blur', () => {
      // 重建导致输入框脱离文档的 blur 不算用户失焦：编辑态跨重建保持（草稿在 rename 态）
      if (input.isConnected) {
        if (this.rename) this.rename.value = input.value
        this.commitRename(false)
      }
    })
    return input
  }

  /** update 重建后把焦点送回编辑输入框（一次性；行不可见时放弃避免后续偷焦点） */
  private syncRenameFocus(): void {
    if (!this.rename || !this.renameFocusPending) return
    this.renameFocusPending = false
    for (const row of this.allRows()) {
      if (row.getAttribute('data-key') !== this.rename.key) continue
      const input = row.querySelector<HTMLInputElement>('.rename-input')
      if (input) {
        input.focus()
        input.select()
      }
      return
    }
  }

  /** 双击进编辑判定（capture 相位）：label 区同 key 500ms 内两击 = 双击 */
  private onRenameClickCapture = (e: Event): void => {
    if (!this.hasAttr('can-rename') || this.isTreeDisabled() || this.rename) return
    // 宿主级监听下 e.target 会被 shadow 边界重定向成宿主自身；行内元素走 composedPath 定位
    let label: Element | null = null
    let row: Element | null = null
    for (const node of e.composedPath()) {
      if (!(node instanceof Element)) continue
      if (!row && node.getAttribute('part') === 'row') row = node
      if (!label && node.classList.contains('label')) label = node
      if (row && label) break
    }
    if (!label || label.querySelector('.rename-input')) return
    const key = row?.getAttribute('data-key')
    if (!key) return
    const node = this.model.byId.get(key)
    if (!node || !this.nodeRenamable(node)) {
      this.lastLabelClick = null
      return
    }
    const now = Date.now()
    const prev = this.lastLabelClick
    this.lastLabelClick = { key, time: now }
    if (!prev || prev.key !== key || now - prev.time >= 500) return
    // 双击命中：进入编辑并抑制本击的行选中
    this.lastLabelClick = null
    this.suppressRowSelect = true
    this.startRename(key)
  }

  // ---------- motion 展开/收起过渡（高度过渡动画；虚拟模式入场降级 fade、收起即时） ----------

  /** motion 生效判定：属性开启且用户未声明减少动效 */
  private motionEnabled(): boolean {
    if (!this.hasAttr('motion')) return false
    try {
      if (
        typeof globalThis.matchMedia === 'function' &&
        globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        return false
      }
    } catch {
      /* 无 matchMedia 环境视为不减少动效 */
    }
    return true
  }

  /** 读取过渡时长（--oas-transition-base，可被主题覆盖；解析 '180ms' / '0.18s'，兜底 180ms） */
  private motionMs(): number {
    try {
      const raw = getComputedStyle(this).getPropertyValue('--oas-transition-base').trim()
      const m = /^([\d.]+)\s*(ms|s)$/i.exec(raw)
      if (m) return m[2]!.toLowerCase() === 's' ? Number(m[1]) * 1000 : Number(m[1])
    } catch {
      /* happy-dom 等环境不解析 var */
    }
    return 180
  }

  /** 该节点当前可见的后代 key（DFS 行内按 parentIndex 上溯判定） */
  private subtreeVisibleKeys(id: string): string[] {
    const out: string[] = []
    for (const row of this.visible) {
      const rid = this.acc.idOf(row.node)
      if (rid === id) continue
      let cur = this.parentIndex.get(rid)
      while (cur !== undefined) {
        if (cur === id) {
          out.push(rid)
          break
        }
        cur = this.parentIndex.get(cur)
      }
    }
    return out
  }

  /** 展开落库后播放入场过渡：常规模式行高 0→自然（max-height 过渡），虚拟模式 fade 降级 */
  private animateRowsIn(keys: string[]): void {
    if (!this.motionEnabled()) return
    const virtual = this.getAttr('height', '') !== ''
    for (const key of keys) {
      const row = this.rowElByKey(key)
      if (!row) continue
      if (virtual) {
        row.classList.add('oas-row-fade')
        continue
      }
      const height = row.getBoundingClientRect().height
      if (!(height > 0)) {
        // 0 高（未布局/测试环境）降级 fade 钩子
        row.classList.add('oas-row-enter')
        continue
      }
      row.classList.add('oas-row-enter')
      row.style.overflow = 'hidden'
      row.style.maxHeight = '0px'
      row.style.opacity = '0'
      void row.offsetHeight // 强制 reflow 固化起点
      const ms = this.motionMs()
      row.style.transition =
        `max-height ${ms}ms var(--oas-ease-out), opacity ${ms}ms var(--oas-ease-out)`
      row.style.maxHeight = `${height}px`
      row.style.opacity = '1'
      // 过渡结束后清掉行内样式与钩子类（重建会自然清掉，这里兜底防残留）
      const clean = (): void => {
        row.classList.remove('oas-row-enter')
        row.style.maxHeight = ''
        row.style.opacity = ''
        row.style.transition = ''
        row.style.overflow = ''
      }
      row.addEventListener('transitionend', clean, { once: true })
      window.setTimeout(clean, ms + 80)
    }
  }

  /** 收起离场：子行高度 → 0（max-height 过渡），结束后真正落库收起 */
  private animateRowsOut(rows: HTMLElement[], done: () => void): void {
    const virtual = this.getAttr('height', '') !== ''
    if (virtual || rows.length === 0) {
      done()
      return
    }
    let hasMotion = false
    for (const row of rows) {
      row.classList.add('oas-row-leave')
      const height = row.getBoundingClientRect().height
      if (!(height > 0)) continue
      hasMotion = true
      row.style.overflow = 'hidden'
      row.style.maxHeight = `${height}px`
      row.style.opacity = '1'
    }
    const ms = this.motionMs()
    if (hasMotion) {
      void rows[0]!.offsetHeight // 固化起始 max-height（auto → 定值需先落一次）
      for (const row of rows) {
        if (!row.style.maxHeight) continue
        row.style.transition =
          `max-height ${ms}ms var(--oas-ease-in-out), opacity ${ms}ms var(--oas-ease-out)`
        row.style.maxHeight = '0px'
        row.style.opacity = '0'
      }
    }
    // 0 高（未布局/测试环境）也走异步落库，保证「先离场再收起」的两阶段时序一致
    this.motionCollapseTimer = window.setTimeout(() => {
      this.motionCollapseTimer = 0
      // 动画期间组件被移除：放弃落库、复位动画态（重连后仍按 expanded 原状渲染）
      if (!this.isConnected) {
        this.motionCollapsing = false
        return
      }
      done()
    }, ms + 40)
  }

  /** 行收起入口：motion 下先播离场再落库，非 motion 直接收起 */
  private collapseWithMotion(exp: Set<string>, node: TreeNode): void {
    const id = this.acc.idOf(node)
    if (!this.motionEnabled() || this.motionCollapsing) {
      this.collapseNode(exp, id)
      return
    }
    const rows = this.subtreeVisibleKeys(id)
      .map((key) => this.rowElByKey(key))
      .filter((r): r is HTMLElement => r !== null)
    if (rows.length === 0) {
      this.collapseNode(exp, id)
      return
    }
    this.motionCollapsing = true
    this.animateRowsOut(rows, () => {
      this.motionCollapsing = false
      this.collapseNode(this.expandedSet(), id)
    })
  }

  // ---------- 命令式方法（展开控制 + 滚动；数据仍归宿主受控） ----------

  /** 全部展开：展开所有已有 children 的节点（懒加载未加载节点不触发加载） */
  expandAll(): void {
    const exp = this.expandedSet()
    for (const row of this.model.rows) {
      const node = row.node
      if (this.acc.childrenOf(node)?.length && !this.loading.has(this.acc.idOf(node))) {
        exp.add(this.acc.idOf(node))
      }
    }
    this.commitExpanded(exp)
  }

  /** 全部收起 */
  collapseAll(): void {
    this.commitExpanded(new Set())
  }

  /** 展开指定 key 集合 */
  expand(keys: string[]): void {
    const exp = this.expandedSet()
    for (const key of keys) exp.add(key)
    if (this.hasAttr('auto-expand-parent')) {
      this.commitExpanded(this.addAncestors(exp))
    } else {
      this.commitExpanded(exp)
    }
  }

  /** 收起指定 key 集合（连同子树） */
  collapse(keys: string[]): void {
    const exp = this.expandedSet()
    for (const key of keys) this.collapseNode(exp, key)
    this.commitExpanded(exp)
  }

  /**
   * 滚动到节点。默认展开其祖先链后定位；options.expand=false 时不改展开状态（需节点本身可见）。
   * 虚拟模式滚 vlist 视口；非虚拟用 scrollIntoView（nearest 不滚动已可见祖先）。
   * 注：与 HTMLElement.scrollTo 同名的签名必须兼容基类重载，数值/ScrollToOptions 调用回退原生行为。
   */
  override scrollTo(
    target?: string | number | ScrollToOptions,
    optionsOrY?: number | { expand?: boolean },
  ): void {
    if (target === undefined) {
      super.scrollTo()
      return
    }
    if (typeof target === 'number') {
      super.scrollTo(target, typeof optionsOrY === 'number' ? optionsOrY : 0)
      return
    }
    if (typeof target === 'object') {
      super.scrollTo(target)
      return
    }
    const key = target
    const options = optionsOrY as { expand?: boolean } | undefined
    const node = this.model.byId.get(key)
    if (!node) return
    const needExpand = options?.expand !== false
    if (needExpand) {
      const exp = this.expandedSet()
      exp.add(key)
      this.commitExpanded(this.addAncestors(exp))
    }
    // expanded 写回触发 update（同步重建）后再定位
    queueMicrotask(() => {
      const vis = this.visibleRows()
      const idx = vis.findIndex((r) => this.acc.idOf(r.node) === key)
      if (idx < 0) return
      const virtual = this.getAttr('height', '') !== ''
      if (virtual && this.vlist) {
        // 最小滚动定位（align auto：已可见不动），不直查 vlist 内部 DOM
        this.vlist.scrollToIndex(idx, { align: 'auto' })
        return
      }
      const row = this.rowElByKey(key)
      row?.scrollIntoView({ block: 'nearest' })
    })
  }

  override focus(options?: FocusOptions): void {
    const key = this.rovingKey ?? this.visibleKeys()[0]
    if (key) {
      this.rovingKey = key
      this.focusRowByKey(key, options)
    } else {
      this.shadow.querySelector<HTMLElement>('.tree')?.focus(options)
    }
  }

  // ---------- 键盘 roving（APG tree：↑↓ 移动、→ 展开/进首子、← 收起/回父、Home/End、Space 勾选、Enter 激活） ----------

  private visibleKeys(): string[] {
    return this.visible.map((r) => this.acc.idOf(r.node))
  }

  private onTreeFocusIn = (e: FocusEvent): void => {
    const row = this.rowFromEvent(e)
    if (row) {
      this.focusInside = true
      this.rovingKey = row.getAttribute('data-key')
      this.applyRovingTabIndex()
    }
  }

  private onTreeFocusOut = (): void => {
    // 焦点可能在本轮 update 重建后短暂悬空，统一到下一帧判定
    queueMicrotask(() => {
      this.focusInside = this.containsActiveRow()
    })
  }

  private containsActiveRow(): boolean {
    const active = this.shadow.activeElement ?? document.activeElement
    if (!active) return false
    return active instanceof Element && !!active.closest('[part="row"]')
  }

  private rowFromEvent(e: Event): HTMLElement | null {
    const path = e.composedPath()
    for (const node of path) {
      if (node instanceof Element && node.getAttribute?.('part') === 'row')
        return node as HTMLElement
    }
    return null
  }

  private onTreeKeydown = (e: KeyboardEvent): void => {
    if (this.isTreeDisabled()) return
    const target = e.target
    if (!(target instanceof Element)) return
    // 原生控件自理（checkbox/toggle 已在行内但 tabindex=-1，双保险防双触发）
    if (target.closest('button, input, a')) return
    // 事件源即行：直接采纳为 roving 目标（不依赖 focusin 时序）
    const row = this.rowFromEvent(e)
    if (row?.getAttribute('data-key')) {
      this.rovingKey = row.getAttribute('data-key')
    }
    const keys = this.visibleKeys()
    if (keys.length === 0) return
    const key = e.key
    const idx = keys.indexOf(this.rovingKey ?? '')
    const cur = idx >= 0 ? idx : 0

    if (key === 'ArrowDown') {
      e.preventDefault()
      this.navTo(cur, 1, keys)
    } else if (key === 'ArrowUp') {
      e.preventDefault()
      this.navTo(cur, -1, keys)
    } else if (key === 'ArrowRight') {
      e.preventDefault()
      const id = keys[cur]!
      const node = this.model.byId.get(id)
      if (!node) return
      if (this.isExpandableNode(node) && !this.expandedSet().has(id)) {
        this.toggleExpansion(node)
      } else {
        this.navTo(cur, 1, keys)
      }
    } else if (key === 'ArrowLeft') {
      e.preventDefault()
      const id = keys[cur]!
      const node = this.model.byId.get(id)
      if (!node) return
      if (this.expandedSet().has(id)) {
        this.toggleExpansion(node)
      } else {
        const parentId = this.parentIndex.get(id)
        if (parentId !== undefined) this.focusRowByKey(parentId)
      }
    } else if (key === 'Home') {
      e.preventDefault()
      this.navTo(-1, 1, keys)
    } else if (key === 'End') {
      e.preventDefault()
      this.navTo(keys.length, -1, keys)
    } else if (key === ' ') {
      e.preventDefault()
      const id = keys[cur]!
      const node = this.model.byId.get(id)
      if (!node) return
      if (this.hasAttr('checkable') && this.nodeCheckable(node)) {
        this.toggleCheckByKey(id)
      } else {
        this.handleRowClick(node)
      }
    } else if (key === 'Enter') {
      e.preventDefault()
      const id = keys[cur]!
      const node = this.model.byId.get(id)
      if (node) this.handleRowClick(node)
    } else if (key === 'F2') {
      // 行内重命名（与双击 label 同入口；can-rename 关闭/节点不可重命名时 no-op）
      e.preventDefault()
      const id = keys[cur]!
      if (id) this.startRename(id)
    }
  }

  /** 方向导航：从当前行的下一行起跳过不可聚焦行（disabled），到达可见边界后停止 */
  private navTo(from: number, dir: 1 | -1, keys: string[]): void {
    const len = keys.length
    let i = from + dir
    while (i >= 0 && i < len) {
      const node = this.model.byId.get(keys[i]!)
      if (node && !this.nodeDisabled(node)) break
      i += dir
    }
    if (i < 0 || i >= len) return
    this.focusRowByKey(keys[i]!)
  }

  private applyRovingTabIndex(): void {
    const key = this.rovingKey
    for (const row of this.allRows()) {
      row.tabIndex = row.getAttribute('data-key') === key ? 0 : -1
    }
  }

  /** 重渲染后同步 roving：确保 rovingKey 在可见集内、tabindex 只落在它身上，焦点仍在树内则补回 */
  private syncRoving(): void {
    const keys = this.visibleKeys()
    if (keys.length === 0) {
      this.rovingKey = null
      return
    }
    if (!this.rovingKey || !keys.includes(this.rovingKey)) {
      this.rovingKey =
        keys.find((k) => {
          const node = this.model.byId.get(k)
          return node && !this.nodeDisabled(node)
        }) ??
        keys[0] ??
        null
    }
    this.applyRovingTabIndex()
    if (this.focusInside && this.rovingKey) {
      this.rowElByKey(this.rovingKey)?.focus()
    }
  }

  private focusRowByKey(key: string, options?: FocusOptions): void {
    this.rovingKey = key
    this.focusInside = true
    this.applyRovingTabIndex()
    const row = this.rowElByKey(key)
    if (row) {
      row.focus(options)
      return
    }
    // 虚拟模式目标行未渲染（越出窗口）→ 最小滚动进视口后下一帧聚焦
    const keys = this.visibleKeys()
    const idx = keys.indexOf(key)
    if (idx < 0 || !this.vlist || this.vlist.hidden) return
    this.vlist.scrollToIndex(idx, { align: 'auto' })
    requestAnimationFrame(() => {
      this.rowElByKey(key)?.focus(options)
    })
  }

  // ---------- 行查询 ----------

  private allRows(): HTMLElement[] {
    const out: HTMLElement[] = [...this.shadow.querySelectorAll<HTMLElement>('[part="row"]')]
    const root = this.vlist?.shadowRoot
    if (root) out.push(...root.querySelectorAll<HTMLElement>('[part="row"]'))
    return out
  }

  private rowElByKey(key: string): HTMLElement | null {
    // 遍历行集而非 data-key 属性选择器：key 可能含特殊字符，且 CSS.escape 非全环境可用
    for (const row of this.allRows()) {
      if (row.getAttribute('data-key') === key) return row
    }
    return null
  }

  // ---------- 空态 ----------

  private fillEmpty(container: HTMLElement): void {
    const tpl = this.querySelector('template[slot="empty"]')
    if (tpl instanceof HTMLTemplateElement) {
      container.innerHTML = ''
      container.appendChild(cloneSlotContent(tpl))
      return
    }
    const custom = this.getAttr('empty', '')
    container.textContent =
      custom || (this.filtering() ? this.t('select.noMatch') : this.t('treeSelect.empty'))
  }

  // ---------- 部件填充（template 骨架克隆） ----------

  private fillToggle(toggle: HTMLButtonElement): void {
    const tpl = this.querySelector('template[slot="toggle"]')
    if (tpl instanceof HTMLTemplateElement) {
      toggle.appendChild(cloneSlotContent(tpl))
    } else {
      toggle.textContent = '›'
    }
  }

  private fillToggleLoading(spinner: HTMLElement): void {
    const tpl = this.querySelector('template[slot="toggle-loading"]')
    if (tpl instanceof HTMLTemplateElement) {
      spinner.appendChild(cloneSlotContent(tpl))
    }
  }

  /** label 渲染：template 克隆优先；默认文本在 filter-highlight 下把命中片段包 <mark> */
  private fillNodeLabel(labelEl: HTMLElement, node: TreeNode): void {
    const tpl = this.querySelector('template[slot="node"]')
    if (tpl instanceof HTMLTemplateElement) {
      labelEl.appendChild(cloneSlotContent(tpl))
      const binder = labelEl.querySelector('[data-node-label]')
      if (binder) binder.textContent = this.acc.labelOf(node)
      return
    }
    const text = this.acc.labelOf(node)
    if (this.filtering() && this.hasAttr('filter-highlight')) {
      this.fillHighlighted(labelEl, text, this.getAttr('filter', '').trim())
    } else {
      labelEl.textContent = text
    }
  }

  /** 把 label 中关键词命中片段包进 <mark>（大小写不敏感、全部命中） */
  private fillHighlighted(el: HTMLElement, text: string, term: string): void {
    const lower = text.toLowerCase()
    const needle = term.toLowerCase()
    if (!needle) {
      el.textContent = text
      return
    }
    let cursor = 0
    let index = lower.indexOf(needle, cursor)
    while (index >= 0) {
      if (index > cursor) el.appendChild(document.createTextNode(text.slice(cursor, index)))
      const mark = document.createElement('mark')
      mark.textContent = text.slice(index, index + needle.length)
      el.appendChild(mark)
      cursor = index + needle.length
      index = lower.indexOf(needle, cursor)
    }
    if (cursor < text.length) el.appendChild(document.createTextNode(text.slice(cursor)))
  }

  private appendNodeIcon(row: HTMLElement, node: TreeNode, expanded: Set<string>): void {
    const icon = document.createElement('span')
    icon.className = 'node-icon'
    icon.setAttribute('part', 'node-icon')
    icon.setAttribute('aria-hidden', 'true')
    const kind = this.isExpandableNode(node)
      ? expanded.has(this.acc.idOf(node))
        ? 'folder-open'
        : 'folder'
      : 'file'
    icon.setAttribute('data-kind', kind)
    icon.innerHTML =
      kind === 'file' ? FILE_ICON_SVG : kind === 'folder' ? FOLDER_ICON_SVG : FOLDER_OPEN_ICON_SVG
    row.appendChild(icon)
  }

  // ---------- 拖拽（HTML5 DnD + allowDrop/allowDrag 守卫） ----------

  private bindDrag(row: HTMLElement, node: TreeNode): void {
    if (this.nodeDisabled(node)) return
    const id = this.acc.idOf(node)
    const sourceAllowed = typeof this.allowDrag !== 'function' || this.allowDrag(node) !== false
    row.draggable = sourceAllowed
    if (sourceAllowed) {
      row.addEventListener('dragstart', ((e: DragEvent) => {
        this.dragKey = id
        row.classList.add('dragging')
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', id)
        }
      }) as EventListener)
    }
    row.addEventListener('dragend', (() => {
      if (this.dragKey !== id) return
      this.dragKey = null
      row.classList.remove('dragging')
      this.clearDropMarkers()
    }) as EventListener)
    row.addEventListener('dragover', ((e: DragEvent) => {
      if (!this.dragKey || this.dragKey === id || this.nodeDisabled(node)) return
      const pos = this.dropPosition(row, e, node)
      if (!this.guardDrop({ dragKey: this.dragKey, dropKey: id, position: pos })) {
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'none'
        this.clearDropMarkers()
        return
      }
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
      this.clearDropMarkers()
      row.classList.add(
        pos === 'before' ? 'drop-before' : pos === 'after' ? 'drop-after' : 'drop-inner',
      )
    }) as EventListener)
    row.addEventListener('dragleave', (() => {
      row.classList.remove('drop-before', 'drop-after', 'drop-inner')
    }) as EventListener)
    row.addEventListener('drop', ((e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      this.clearDropMarkers()
      const dragKey = this.dragKey
      if (!dragKey || dragKey === id || this.nodeDisabled(node)) return
      const position = this.dropPosition(row, e, node)
      if (this.guardDrop({ dragKey, dropKey: id, position })) {
        this.emit('node-drop', { dragKey, dropKey: id, position })
      }
      this.dragKey = null
    }) as EventListener)
  }

  private guardDrop(payload: {
    dragKey: string
    dropKey: string
    position: 'before' | 'after' | 'inner'
  }): boolean {
    if (typeof this.allowDrop !== 'function') return true
    return this.allowDrop(payload) !== false
  }

  private dropPosition(
    row: HTMLElement,
    e: DragEvent,
    node: TreeNode,
  ): 'before' | 'after' | 'inner' {
    const rect = row.getBoundingClientRect()
    const ratio = rect.height ? (e.clientY - rect.top) / rect.height : 0.5
    if (ratio < 0.25) return 'before'
    if (ratio > 0.75) return 'after'
    if (this.isExpandableNode(node)) return 'inner'
    return ratio < 0.5 ? 'before' : 'after'
  }

  private clearDropMarkers(): void {
    this.shadow.querySelector<HTMLElement>('.tree')?.classList.remove('drop-inner')
    for (const el of this.allRows()) {
      el.classList.remove('drop-before', 'drop-after', 'drop-inner')
    }
  }
}
