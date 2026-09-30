import { OASElement } from '@oas-ui/core'

/** 列定义：`columns` 属性（JSON）元素结构 */
export interface KanbanColumn {
  key: string
  title: string
  /** WIP 限制：列卡片数（泳道模式下跨带合计）超过该值 → 列头计数转 warning 色 + data-over-limit 标记（提示语义非阻断，拖入照常落定）；缺省/0/负数 = 不限制 */
  limit?: number
}

/** 卡片：`cards` 属性（JSON）元素结构——`id` 唯一标识、`column` 为所属列 key，其余字段任意 */
export type KanbanCard = Record<string, unknown>

/**
 * 自定义卡片渲染（renderCard property 函数通道）：`(card) => Node | string`。
 * 返回 Node 直接挂载；返回字符串按 textContent 渲染（防注入，不解析 HTML）。
 * 函数不可序列化：不进 observedAttributes / SSR 快照（文档注明）。
 */
export type KanbanCardRenderer = (card: KanbanCard) => Node | string

/** oas-change 事件 detail 契约：id 为卡片标识，from/to 为列 key，index 为落点在目标列的位置 */
export interface KanbanChangeDetail {
  id: string
  from: string
  to: string
  index: number
  /** 多选批量移动（多选拖拽）才有：全部选中卡 id（按数据序，ids[0] === id）；单卡移动不带本字段 */
  ids?: string[]
  /** 跨泳道落定才有：泳道字段值 from → to（原始值口径，空值泳道为 ''）；同带移动不带本字段 */
  swimlane?: { from: string; to: string }
}

/** oas-column-reorder 事件 detail 契约：from/to 为移动列的原/新位次（新位次 = 重排后该列最终所在下标），keys 为重排后的列 key 全序 */
export interface KanbanColumnReorderDetail {
  from: number
  to: number
  keys: string[]
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
/* 尊重 [hidden] 语义：:host display:block 会覆盖 UA 的 [hidden]{display:none}，需显式补 */
:host([hidden]) {
  display: none;
}
.kanban {
  display: flex;
  gap: var(--oas-space-3);
  align-items: stretch;
}
/* 泳道模式：板体纵向排布（列头行 + 各泳道带横贯） */
.kanban.swimlane {
  flex-direction: column;
  gap: var(--oas-space-3);
}
.column {
  flex: 1 1 0;
  min-width: var(--oas-kanban-column-min-width, 220px);
  display: flex;
  flex-direction: column;
  background: var(--oas-color-bg-hover);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  overflow: hidden;
}
.column-head {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-2) var(--oas-space-3);
  background: var(--oas-color-bg-hover);
  border-bottom: 1px solid var(--oas-color-border);
}
/* 泳道模式：列头行内的列头是独立小容器（整边框），宽度与列单元格对齐 */
.lane-header {
  display: flex;
  gap: var(--oas-space-3);
}
.lane-header .column-head {
  flex: 1 1 0;
  min-width: var(--oas-kanban-column-min-width, 220px);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  border-bottom: 1px solid var(--oas-color-border);
}
.column-title {
  min-width: 0;
  font-weight: var(--oas-font-weight-medium, 500);
  font-size: var(--oas-font-size-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.column-count {
  flex: none;
  min-width: 20px;
  margin-inline-start: auto;
  padding: 0 var(--oas-space-1);
  text-align: center;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  background: var(--oas-color-bg);
  border-radius: var(--oas-radius-full, 999px);
}
/* WIP 超限：计数转 warning 色（明暗两套 token 由主题提供，保证可读） */
.column-count.over-limit {
  color: var(--oas-color-warning-text);
}
/* 列头拖拽手柄（列重排）：HTML5 DnD；键盘 ←/→ 亦可换序 */
.column-drag {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: var(--oas-radius-xs, 4px);
  background: transparent;
  color: var(--oas-color-text-secondary);
  cursor: grab;
}
.column-drag:active {
  cursor: grabbing;
}
.column-drag:hover,
.column-drag:focus-visible {
  color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.column-drag:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.column-drag svg {
  display: block;
  width: 12px;
  height: 12px;
}
/* 列拖动视觉：源列头淡化 + 列间插入指示线（与卡片拖拽同视觉语言：inset 主色线，方向换轴为纵向） */
.column-head.drag-source {
  opacity: 0.45;
}
.column-head.drop-before {
  box-shadow: inset 3px 0 0 var(--oas-color-primary);
}
.column-head.drop-after {
  box-shadow: inset -3px 0 0 var(--oas-color-primary);
}
/* 触屏列移动按钮：coarse 显示，边界项 aria-disabled（PC 态 display:none 零影响） */
.column-nav {
  flex: none;
  display: none;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: var(--oas-radius-xs, 4px);
  background: transparent;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
}
.column-nav:hover,
.column-nav:focus-visible {
  color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.column-nav:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.column-nav[aria-disabled='true'] {
  opacity: 0.45;
  cursor: default;
}
.column-nav[aria-disabled='true']:hover {
  color: var(--oas-color-text-secondary);
  background: transparent;
}
.column-nav svg {
  display: block;
  width: 12px;
  height: 12px;
}
@media (pointer: coarse) {
  .column-nav {
    display: inline-flex;
  }
}
/* 列体独立纵向滚动：高度约束来自宿主（:host 设 height / 容器拉伸） */
.column-body {
  flex: 1;
  min-height: var(--oas-kanban-column-min-height, 60px);
  padding: var(--oas-space-2);
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  overflow-y: auto;
}
.card {
  position: relative;
  background: var(--oas-color-bg-elevated);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  padding: var(--oas-space-2) var(--oas-space-3);
  font-size: var(--oas-font-size-sm);
  cursor: grab;
}
.card[draggable='true']:active {
  cursor: grabbing;
}
.card:hover {
  border-color: var(--oas-color-border-strong);
}
.card:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 多选选中态：token 色描边 + 主色弱底（color-mix 与 badge/button 同机制，暗色自适应） */
.card[data-selected] {
  border-color: var(--oas-color-primary);
  background: color-mix(in srgb, var(--oas-color-primary) 8%, var(--oas-color-bg-elevated));
}
.card-title {
  display: block;
  /* 右侧让位触屏移动按钮（coarse 下可见） */
  padding-inline-end: var(--oas-space-4);
}
/* 拖拽源淡化 + 落点插入指示线（与表格行拖拽同视觉语言：inset 主色线） */
.card.drag-source {
  opacity: 0.45;
}
.card.drop-before {
  box-shadow: inset 0 2px 0 var(--oas-color-primary);
}
.card.drop-after {
  box-shadow: inset 0 -2px 0 var(--oas-color-primary);
}
.column-body.drop-tail,
.lane-cell.drop-tail {
  box-shadow: inset 0 -2px 0 var(--oas-color-primary);
}
.empty-column,
.empty-cell {
  border: 1px dashed var(--oas-color-border-strong);
  border-radius: var(--oas-radius-sm);
  padding: var(--oas-space-4);
  text-align: center;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
/* 泳道带：横向分带横贯各列（带头行 + 列单元格矩阵） */
.lane {
  background: var(--oas-color-bg-hover);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  overflow: hidden;
}
.lane-head {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-1) var(--oas-space-3);
  background: var(--oas-color-bg-hover);
  border-bottom: 1px solid var(--oas-color-border);
}
.lane-label {
  font-weight: var(--oas-font-weight-medium, 500);
  font-size: var(--oas-font-size-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lane-count {
  flex: none;
  min-width: 20px;
  padding: 0 var(--oas-space-1);
  text-align: center;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  background: var(--oas-color-bg);
  border-radius: var(--oas-radius-full, 999px);
}
/* 折叠箭头：默认横向 ›，展开态旋成纵向下（与 table 分节头同语义） */
.lane-toggle {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: var(--oas-radius-xs, 4px);
  background: transparent;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  transition: transform var(--oas-transition-base, 0.2s) var(--oas-ease-out, ease-out);
}
.lane-toggle.open {
  transform: rotate(90deg);
}
.lane-toggle:hover,
.lane-toggle:focus-visible {
  color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.lane-toggle:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.lane-body {
  display: flex;
  gap: var(--oas-space-3);
  padding: var(--oas-space-2);
}
.lane.lane-collapsed .lane-body {
  display: none;
}
.lane-cell {
  flex: 1 1 0;
  min-width: var(--oas-kanban-column-min-width, 220px);
  min-height: var(--oas-kanban-column-min-height, 60px);
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
/* 触屏移动按钮：HTML5 DnD（dragstart）触屏不可用，coarse 下提供移动菜单替代。
   PC 态 display:none 零视觉/无障碍影响；箭头为原创内联 SVG */
.card-move {
  display: none;
  position: absolute;
  top: 2px;
  inset-inline-end: 2px;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: var(--oas-radius-xs, 4px);
  background: transparent;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
}
.card-move svg {
  display: block;
  width: 12px;
  height: 12px;
}
.card-move:hover,
.card-move:focus-visible {
  color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.card-move:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
@media (pointer: coarse) {
  .card-move {
    display: inline-flex;
  }
}
/* 触屏移动菜单：fixed 浮层（不受列体 overflow 裁剪），Esc/外点/滚动关闭 */
.move-menu {
  position: fixed;
  z-index: calc(var(--oas-z-index-base, 0) + 1000);
  min-width: 120px;
  max-height: 260px;
  overflow: auto;
  padding: var(--oas-space-1);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: var(--oas-shadow-md);
}
.move-menu [role='menuitem'] {
  display: block;
  width: 100%;
  text-align: start;
  padding: var(--oas-space-1) var(--oas-space-2);
  border: none;
  border-radius: var(--oas-radius-sm);
  background: transparent;
  color: var(--oas-color-text-primary);
  font: inherit;
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
  white-space: nowrap;
}
.move-menu [role='menuitem']:hover {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-primary);
}
.move-menu [role='menuitem']:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.move-menu [role='menuitem'][aria-disabled='true'] {
  opacity: 0.45;
  cursor: default;
}
.move-menu [role='menuitem'][aria-disabled='true']:hover {
  background: transparent;
  color: var(--oas-color-text-primary);
}
`

/** 移动按钮图标（原创内联 SVG：上下双箭头，组件专属语义美术） */
const MOVE_ICON =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 6l3-3 3 3M5 10l3 3 3-3"/></svg>'

/** 列拖拽手柄图标（原创内联 SVG：2×3 握点阵） */
const DRAG_ICON =
  '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false"><circle cx="5.5" cy="3.5" r="1.2"/><circle cx="10.5" cy="3.5" r="1.2"/><circle cx="5.5" cy="8" r="1.2"/><circle cx="10.5" cy="8" r="1.2"/><circle cx="5.5" cy="12.5" r="1.2"/><circle cx="10.5" cy="12.5" r="1.2"/></svg>'

/** 列移动按钮图标（原创内联 SVG：左/右单箭头） */
const NAV_LEFT_ICON =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M10 3L5 8l5 5"/></svg>'
const NAV_RIGHT_ICON =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 3l5 5-5 5"/></svg>'

/** 卡片拖拽落点（目标列 key + 目标泳道值（无泳道为 null）+ 视觉插入位） */
interface KanbanDropTarget {
  column: string
  lane: string | null
  index: number
}

/**
 * oas-kanban —— 看板（列 + 卡片拖拽）。
 *
 * 数据通道（与 oas-table 惯例一致：attribute JSON + property 双通道，非受控回写 + attribute 反射）：
 * - `columns`：JSON 数组 `[{ key, title, limit? }]` 列定义（limit 为 WIP 限制，提示语义）；
 * - `cards`：JSON 数组 `[{ id, column, title, ...任意字段 }]`，`column` 为所属列 key；
 * - 拖放后改写数据并**回写 cards attribute**，同时派发 `oas-change`；
 * - `renderCard` property 函数在场时数据不反射回 attribute（内存持有，函数不可序列化）；
 * - 列重排回写 columns attribute（列定义无函数通道，恒反射）。
 *
 * 交互：
 * - 卡片 HTML5 DnD 拖拽：换列 + 列内排序；落点插入指示线；拖回原位零操作；
 * - 卡片多选：Ctrl/Cmd+点击逐枚切换、Shift+点击同单元格（同列同泳道带）范围选；
 *   多选拖拽任选一枚 → 全部选中卡移动到落点（一条 oas-change，detail 加 ids）；
 *   空白处点击 / Esc 清空多选；普通点击 = 单选该枚；
 * - 列拖拽重排：列头手柄 HTML5 DnD（键盘 ←/→ 同效）→ 派发 `oas-column-reorder`（from/to/keys）；
 * - 触屏降级：卡片移动按钮 + 列头左移/右移按钮（pointer:coarse 显示，边界 aria-disabled）；
 * - 泳道：`swimlane-by="字段key"` 按字段值横向分带（带头：字段值 + 计数 + 折叠箭头，
 *   默认全展开，折叠状态在数据变化时保留）；跨带拖拽 = 改泳道字段值；
 *   拖拽悬停折叠带头自动展开（只切类不重建 DOM，拖拽不中断）；
 * - WIP 限制：列 `limit` 超限 → 列头计数 warning 色 + data-over-limit 标记（提示非阻断）；
 * - 键盘可达：卡片 tabindex=0（listitem）；非空列体/单元格 role=list + aria-label（空不带 list 语义）；
 * - 空列/空单元格占位走 i18n（`kanban.emptyColumn`），`empty-column-text` 属性可覆盖；
 *   泳道空值归「（空）」带（`kanban.groupEmpty`，与 table 分组空值同语义）。
 *
 * 事件（bubbles + composed）：
 * - `oas-change`：拖放/菜单移动落定后派发，detail `{ id, from, to, index, ids?, swimlane? }`——
 *   from/to 为列 key，index 为落点在目标列的插入位（移除移动卡后的口径）；
 *   多选拖拽加 ids（全部选中 id，首枚与 id 一致）；跨泳道落定加 swimlane { from, to }。
 * - `oas-column-reorder`：列重排落定后派发，detail `{ from, to, keys }`。
 */
export class OASKanban extends OASElement {
  static override get observedAttributes(): string[] {
    return ['columns', 'cards', 'empty-column-text', 'swimlane-by']
  }

  private _columns: KanbanColumn[] = []
  private _cards: KanbanCard[] = []
  /** 已解析的 cards attribute 原文（变化才重解析，renderCard 在场不阻断首帧解析） */
  private _cardsRaw = ''
  /** renderCard property 函数在场：数据内存持有，不反射 cards attribute（同 table 函数列先例） */
  private _renderCard: KanbanCardRenderer | null = null
  /** 已解析的 swimlane-by 值缓存（变化时清空泳道折叠残留，同 table group-by 先例） */
  private _swimlaneByCache: string | null = null

  /** 卡片多选选中集（id；内部状态不进 attribute，Esc/空白点击/普通点击/移动落定清空） */
  private selectedIds = new Set<string>()
  /** 范围选锚点（最后点击的卡片 id） */
  private anchorId = ''
  /** 泳道折叠状态（原始字段值集合，''=空值带；数据变化保留，swimlane-by 变化清空） */
  private collapsedLanes = new Set<string>()

  /** 拖拽源卡片 id 集（多选拖拽为全部选中 id；空 = 无进行中卡片拖拽；不依赖 dataTransfer——部分环境 DragEvent 不带） */
  private dragIds: string[] = []
  /** 列拖拽起始位次（-1 = 无进行中列拖拽）与落点位次（移除后插入位） */
  private colDragFrom = -1
  private colDropTo = -1
  /** 最近一次卡片 dragover 计算的落点（目标列 + 泳道 + 视觉插入位），drop 时据此落定 */
  private dropTarget: KanbanDropTarget | null = null
  /** 触屏移动菜单：当前打开的卡片 id 与锚点按钮（同一时刻至多一个） */
  private menuCardId = ''
  private menuAnchor: HTMLButtonElement | null = null

  get columns(): KanbanColumn[] {
    return this._columns
  }
  set columns(value: KanbanColumn[] | string) {
    this.setAttribute('columns', typeof value === 'string' ? value : JSON.stringify(value))
  }

  get cards(): KanbanCard[] {
    return this._cards
  }
  set cards(value: KanbanCard[] | string) {
    if (typeof value === 'string') {
      this.setAttribute('cards', value)
      return
    }
    if (this._renderCard) {
      // renderCard 在场：函数不可序列化、数据不反射 attribute——直接内存持有
      this._cards = Array.isArray(value) ? value.slice() : []
      this.runUpdateAndNotify()
      return
    }
    this.setAttribute('cards', JSON.stringify(value))
  }

  /**
   * @apiProperty 自定义卡片渲染：`(card) => Node | string`（函数无法用 attribute 表达；
   * 在场时数据不反射 cards attribute——函数不可序列化，数据由宿主持有）。
   * 返回 Node 直接挂载；返回字符串按纯文本渲染（防注入）。置 null 恢复默认 title 渲染。
   */
  get renderCard(): KanbanCardRenderer | null {
    return this._renderCard
  }
  set renderCard(fn: KanbanCardRenderer | null) {
    this._renderCard = typeof fn === 'function' ? fn : null
    this.runUpdateAndNotify()
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="kanban" part="kanban"></div>
    `
  }

  /** 真水合：校验 SSR 快照结构（看板容器与列/泳道存在）后直接接管，跳过 shadow 重建（oas-table 同款先例） */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.kanban')) return false
    if (!this.shadow.querySelector('.column') && !this.shadow.querySelector('.lane')) return false
    this.bind()
    return true
  }

  /** 缓存节点引用 + 事件委托绑定 + 注册清理（render/hydrate 共用路径） */
  private bind(): void {
    const root = this.shadow
    // 拖拽事件委托到 shadow 根：列/卡片/泳道重建无需重绑（dragstart 触屏不可用，触屏走按钮）
    root.addEventListener('dragstart', this.handleDragStart)
    root.addEventListener('dragover', this.handleDragOver)
    root.addEventListener('drop', this.handleDrop)
    root.addEventListener('dragend', this.handleDragEnd)
    // 点击委托：触屏移动按钮开菜单 / 菜单项落定 / 列移动按钮 / 泳道折叠 / 卡片多选
    root.addEventListener('click', this.handleClick)
    // shadow 内滚动（列体 overflow-y）必须另挂 shadow 根：scroll 是 non-composed 事件，
    // 不跨 shadow 边界——document capture 收不到列体滚动（实证），菜单会悬停原地脱锚
    root.addEventListener('scroll', this.handleDocumentScroll, true)
    // Esc 关菜单/清多选 + 列手柄键盘换序（shadow 内 keydown 不冒泡出宿主，shadow 根监听够用）
    root.addEventListener('keydown', this.handleKeydown)
    this.onCleanup(() => {
      // 只关菜单（closeMenu 内部顺带摘 document 级监听——监听生命周期跟菜单走，
      // openMenu 挂 / closeMenu 摘；重连后再开菜单自然重挂，无「断开摘除后重连失效」）
      this.closeMenu()
    })
  }

  /** document 级外点/滚动关菜单监听：openMenu 时挂、closeMenu 时摘（幂等）——
      监听生命周期跟菜单走而非组件 bind（组件断开重连后 bind 不重跑，挂 bind 里会永久失效） */
  private menuDocBound = false
  private bindMenuDocument(): void {
    if (this.menuDocBound) return
    this.menuDocBound = true
    document.addEventListener('click', this.handleOutsideClick, true)
    document.addEventListener('scroll', this.handleDocumentScroll, true)
  }
  private unbindMenuDocument(): void {
    if (!this.menuDocBound) return
    this.menuDocBound = false
    document.removeEventListener('click', this.handleOutsideClick, true)
    document.removeEventListener('scroll', this.handleDocumentScroll, true)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.runUpdateAndNotify()
  }

  protected override update(): void {
    // 数据重渲染前先关菜单（菜单项引用的列/卡序即将重建，防孤儿态）
    this.closeMenu()
    this.parse()
    const board = this.shadow.querySelector<HTMLElement>('.kanban')
    if (!board) return
    board.innerHTML = ''
    if (this.hasLanes) {
      board.classList.add('swimlane')
      this.buildWithLanes(board)
      return
    }
    board.classList.remove('swimlane')
    for (const col of this._columns) {
      const cards = this._cards.filter((c) => String(c.column ?? '') === col.key)
      board.appendChild(this.buildColumn(col, cards))
    }
  }

  /** 属性解析：JSON 非法/非数组回退空数组；cards 按 attribute 原文变化重解析
      （renderCard 在场一刀切跳过会让「renderCard 先于连接赋值」的宿主首帧拿到空板——实抓） */
  private parse(): void {
    const cols = this.parseJsonArray('columns')
    this._columns = cols.filter(
      (c): c is KanbanColumn => c != null && typeof c === 'object' && typeof (c as { key?: unknown }).key === 'string',
    )
    const cardsRaw = this.getAttribute('cards') ?? ''
    if (cardsRaw !== this._cardsRaw) {
      this._cardsRaw = cardsRaw
      this._cards = this.parseJsonArray('cards') as KanbanCard[]
    }
    // 泳道字段变化：旧字段值的折叠残留无意义，清空（同 table group-by 先例）
    const swimlaneBy = this.getAttr('swimlane-by', '').trim()
    if (swimlaneBy !== this._swimlaneByCache) {
      this._swimlaneByCache = swimlaneBy
      this.collapsedLanes.clear()
    }
  }

  private parseJsonArray(name: string): unknown[] {
    const raw = this.getAttribute(name)
    if (raw == null) return []
    try {
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as unknown[]) : []
    } catch {
      /* 非法 JSON 忽略，保持空数组 */
      return []
    }
  }

  /** 泳道字段 key（swimlane-by 属性，trim 后空 = 无泳道） */
  private get swimlaneField(): string {
    return this.getAttr('swimlane-by', '').trim()
  }

  private get hasLanes(): boolean {
    return this.swimlaneField !== ''
  }

  /** 卡片的泳道字段值（原始值口径；缺失/null/空白 = '' 空值带，与 table 分组空值同语义） */
  private laneOf(card: KanbanCard): string {
    const field = this.swimlaneField
    if (field === '') return ''
    const v = card[field]
    return v == null || String(v).trim() === '' ? '' : String(v)
  }

  /** 泳道带显示名：空值带走 i18n（kanban.groupEmpty） */
  private laneLabel(lane: string): string {
    return lane === '' ? this.t('kanban.groupEmpty') : lane
  }

  /** 泳道值列表（按参与渲染的卡片首次出现序；缺失/空归 ''） */
  private laneValues(cards: KanbanCard[]): string[] {
    const out: string[] = []
    for (const c of cards) {
      const v = this.laneOf(c)
      if (!out.includes(v)) out.push(v)
    }
    return out
  }

  /** WIP 限制解析：有限正数生效（向下取整），缺省/0/负数/非数值 = 不限制（返回 0） */
  private columnLimit(col: KanbanColumn): number {
    const n = Number((col as { limit?: unknown }).limit)
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
  }

  /** WIP 超限判定（按列聚合；泳道模式下跨带合计）：limit>0 且卡数 > limit */
  private isOverLimit(col: KanbanColumn, count: number): boolean {
    const limit = this.columnLimit(col)
    return limit > 0 && count > limit
  }

  /** 空列/空单元格占位文案：属性覆盖 > i18n */
  private emptyColumnText(): string {
    const custom = this.getAttr('empty-column-text', '')
    if (custom !== '') return custom
    return this.t('kanban.emptyColumn')
  }

  /** 泳道模式渲染：列头行（重排手柄/计数所在）+ 每个泳道带一条（带头 + 列单元格矩阵） */
  private buildWithLanes(board: HTMLElement): void {
    const header = document.createElement('div')
    header.className = 'lane-header'
    header.setAttribute('part', 'lane-header')
    // WIP 超限列集合（按列跨带聚合）：列头计数标记 + 该列全部单元格标记（CSS 开口）
    const overCols = new Set(
      this._columns
        .filter((col) => this.isOverLimit(col, this._cards.filter((c) => String(c.column ?? '') === col.key).length))
        .map((col) => col.key),
    )
    for (const col of this._columns) {
      const count = this._cards.filter((c) => String(c.column ?? '') === col.key).length
      header.appendChild(this.buildColumnHead(col, count, overCols.has(col.key)))
    }
    board.appendChild(header)
    // 只为可渲染（列 key 命中）的卡片建带：未命中列的游卡不产生泳道
    const cards = this._cards.filter((c) => this._columns.some((col) => col.key === String(c.column ?? '')))
    for (const lane of this.laneValues(cards)) {
      board.appendChild(
        this.buildLane(
          lane,
          cards.filter((c) => this.laneOf(c) === lane),
          overCols,
        ),
      )
    }
  }

  /** 构建单个泳道带：带头（折叠箭头 + 字段值 + 计数）+ 列单元格矩阵 */
  private buildLane(lane: string, laneCards: KanbanCard[], overCols: Set<string>): HTMLElement {
    const laneEl = document.createElement('div')
    laneEl.className = 'lane'
    laneEl.setAttribute('part', 'lane')
    laneEl.setAttribute('data-lane', lane)
    const collapsed = this.collapsedLanes.has(lane)
    if (collapsed) laneEl.classList.add('lane-collapsed')

    const head = document.createElement('div')
    head.className = 'lane-head'
    head.setAttribute('part', 'lane-head')
    const toggle = document.createElement('button')
    toggle.type = 'button'
    toggle.className = `lane-toggle${collapsed ? '' : ' open'}`
    toggle.setAttribute('part', 'lane-toggle')
    toggle.setAttribute('aria-label', this.t('kanban.toggleLane'))
    toggle.setAttribute('aria-expanded', String(!collapsed))
    toggle.textContent = '›'
    const label = document.createElement('span')
    label.className = 'lane-label'
    label.setAttribute('part', 'lane-label')
    label.textContent = this.laneLabel(lane)
    const count = document.createElement('span')
    count.className = 'lane-count'
    count.setAttribute('part', 'lane-count')
    count.textContent = String(laneCards.length)
    head.append(toggle, label, count)

    const body = document.createElement('div')
    body.className = 'lane-body'
    body.setAttribute('part', 'lane-body')
    for (const col of this._columns) {
      body.appendChild(
        this.buildLaneCell(
          col,
          lane,
          laneCards.filter((c) => String(c.column ?? '') === col.key),
          overCols.has(col.key),
        ),
      )
    }
    laneEl.append(head, body)
    return laneEl
  }

  /** 构建单元格（带 × 列）：空显示占位（不带 list 语义）；非空 role=list + 可读名称 */
  private buildLaneCell(col: KanbanColumn, lane: string, cards: KanbanCard[], overLimit: boolean): HTMLElement {
    const cell = document.createElement('div')
    cell.className = 'lane-cell'
    cell.setAttribute('part', 'lane-cell')
    cell.setAttribute('data-column', col.key)
    if (overLimit) cell.setAttribute('data-over-limit', '')
    if (cards.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'empty-cell'
      empty.setAttribute('part', 'empty-cell')
      empty.textContent = this.emptyColumnText()
      cell.appendChild(empty)
      return cell
    }
    cell.setAttribute('role', 'list')
    cell.setAttribute('aria-label', `${col.title} - ${this.laneLabel(lane)}`)
    for (const card of cards) cell.appendChild(this.buildCard(card))
    return cell
  }

  /** 构建列头（两种模式共用）：手柄 + 标题 + 触屏移动按钮 + 计数（WIP 超限标记在此） */
  private buildColumnHead(col: KanbanColumn, count: number, overLimit: boolean): HTMLElement {
    const head = document.createElement('div')
    head.className = 'column-head'
    head.setAttribute('part', 'column-head')
    head.setAttribute('data-key', col.key)
    if (overLimit) head.setAttribute('data-over-limit', '')

    const handle = document.createElement('button')
    handle.type = 'button'
    handle.className = 'column-drag'
    handle.setAttribute('part', 'column-drag')
    handle.setAttribute('draggable', 'true')
    handle.setAttribute('aria-label', this.t('kanban.dragColumn'))
    handle.innerHTML = DRAG_ICON
    const title = document.createElement('span')
    title.className = 'column-title'
    title.setAttribute('part', 'column-title')
    title.textContent = col.title

    // 触屏列移动按钮（coarse 显示）：HTML5 DnD 替代路径，边界 aria-disabled
    const idx = this._columns.findIndex((c) => c.key === col.key)
    const prev = document.createElement('button')
    prev.type = 'button'
    prev.className = 'column-nav'
    prev.setAttribute('part', 'column-nav')
    prev.dataset.nav = 'prev'
    prev.setAttribute('aria-label', this.t('kanban.moveLeft'))
    prev.setAttribute('aria-disabled', String(idx <= 0))
    prev.innerHTML = NAV_LEFT_ICON
    const next = document.createElement('button')
    next.type = 'button'
    next.className = 'column-nav'
    next.setAttribute('part', 'column-nav')
    next.dataset.nav = 'next'
    next.setAttribute('aria-label', this.t('kanban.moveRight'))
    next.setAttribute('aria-disabled', String(idx < 0 || idx >= this._columns.length - 1))
    next.innerHTML = NAV_RIGHT_ICON

    const countEl = document.createElement('span')
    countEl.className = 'column-count'
    countEl.setAttribute('part', 'column-count')
    countEl.textContent = String(count)
    if (overLimit) countEl.classList.add('over-limit')

    head.append(handle, title, prev, next, countEl)
    return head
  }

  /** 构建单列（无泳道模式）：列头 + 列体（卡片 / 空列占位）+ WIP 超限标记 */
  private buildColumn(col: KanbanColumn, cards: KanbanCard[]): HTMLElement {
    const overLimit = this.isOverLimit(col, cards.length)
    const column = document.createElement('div')
    column.className = 'column'
    column.setAttribute('part', 'column')
    column.setAttribute('data-key', col.key)
    if (overLimit) column.setAttribute('data-over-limit', '')

    const head = this.buildColumnHead(col, cards.length, overLimit)

    const body = document.createElement('div')
    body.className = 'column-body'
    body.setAttribute('part', 'column-body')
    if (cards.length === 0) {
      // 空列不设 role=list：axe aria-required-children 要求 list 必有 listitem 子元素，
      // 空列无卡片时 list 语义不成立（列头 aria-label 已提供列名可达性）
      const empty = document.createElement('div')
      empty.className = 'empty-column'
      empty.setAttribute('part', 'empty-column')
      empty.textContent = this.emptyColumnText()
      body.appendChild(empty)
    } else {
      body.setAttribute('role', 'list')
      body.setAttribute('aria-label', col.title)
      for (const card of cards) body.appendChild(this.buildCard(card))
    }

    column.append(head, body)
    return column
  }

  /** 构建单卡：默认渲染 title；renderCard 在场时按其返回挂载（Node 直挂 / 字符串 textContent） */
  private buildCard(card: KanbanCard): HTMLElement {
    const el = document.createElement('div')
    el.className = 'card'
    el.setAttribute('part', 'card')
    el.setAttribute('data-id', String(card.id ?? ''))
    el.setAttribute('draggable', 'true')
    el.setAttribute('tabindex', '0')
    el.setAttribute('role', 'listitem')
    if (this.selectedIds.has(String(card.id ?? ''))) el.setAttribute('data-selected', '')
    const title = typeof card.title === 'string' ? card.title : ''
    if (title !== '') el.setAttribute('aria-label', title)

    if (this._renderCard) {
      const out = this._renderCard(card)
      if (out instanceof Node) el.appendChild(out)
      else el.appendChild(document.createTextNode(String(out)))
    } else {
      const span = document.createElement('span')
      span.className = 'card-title'
      span.textContent = title
      el.appendChild(span)
    }

    // 触屏移动按钮（coarse 显示）：HTML5 DnD 的替代路径
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'card-move'
    btn.setAttribute('part', 'card-move')
    btn.setAttribute('aria-label', this.t('kanban.moveCard'))
    btn.setAttribute('aria-haspopup', 'menu')
    btn.setAttribute('aria-expanded', 'false')
    btn.innerHTML = MOVE_ICON
    el.appendChild(btn)
    return el
  }

  // ==================== 多选（Ctrl/Shift 点击 + 多选拖拽） ====================

  /** 直接同步 DOM 选中态（不重渲染：重渲染会打断拖拽/焦点） */
  private paintSelection(): void {
    for (const card of this.shadow.querySelectorAll<HTMLElement>('.card')) {
      const id = card.getAttribute('data-id') ?? ''
      if (this.selectedIds.has(id)) card.setAttribute('data-selected', '')
      else card.removeAttribute('data-selected')
    }
  }

  private clearSelection(): void {
    if (this.selectedIds.size === 0) return
    this.selectedIds.clear()
    this.anchorId = ''
    this.paintSelection()
  }

  /** 卡片点击多选语义：Ctrl/Cmd 切换、Shift 同单元格范围选、普通点击单选 */
  private handleCardClick(e: MouseEvent, card: HTMLElement): void {
    const id = card.getAttribute('data-id') ?? ''
    if (e.ctrlKey || e.metaKey) {
      if (this.selectedIds.has(id)) this.selectedIds.delete(id)
      else this.selectedIds.add(id)
      this.anchorId = id
      this.paintSelection()
      return
    }
    if (e.shiftKey) {
      const range = this.rangeFromAnchor(id)
      this.selectedIds = new Set(range ?? [id])
      this.anchorId = id
      this.paintSelection()
      return
    }
    this.selectedIds = new Set([id])
    this.anchorId = id
    this.paintSelection()
  }

  /** 锚点到指定卡的同单元格范围（不同单元格/无锚点返回 null——调用方退化为单选该枚） */
  private rangeFromAnchor(clickedId: string): string[] | null {
    if (!this.anchorId || this.anchorId === clickedId) return null
    const cards = [...this.shadow.querySelectorAll<HTMLElement>('.card')]
    const anchorEl = cards.find((c) => c.getAttribute('data-id') === this.anchorId)
    const clickedEl = cards.find((c) => c.getAttribute('data-id') === clickedId)
    if (!anchorEl || !clickedEl) return null
    const container = clickedEl.closest('.column-body, .lane-cell')
    if (!container || anchorEl.closest('.column-body, .lane-cell') !== container) return null
    const ids = [...container.querySelectorAll<HTMLElement>('.card')].map((c) => c.getAttribute('data-id') ?? '')
    const a = ids.indexOf(this.anchorId)
    const b = ids.indexOf(clickedId)
    if (a < 0 || b < 0) return null
    return ids.slice(Math.min(a, b), Math.max(a, b) + 1)
  }

  // ==================== HTML5 DnD 拖拽（卡片换列/排序 + 列重排） ====================

  private handleDragStart = (e: Event): void => {
    const target = e.target as HTMLElement | null
    // 列头手柄 → 列重排拖拽
    const handle = target?.closest?.('.column-drag') as HTMLElement | null
    if (handle) {
      this.startColumnDrag(e, handle)
      return
    }
    const card = target?.closest?.('.card') as HTMLElement | null
    if (!card) return
    this.colDragFrom = -1
    this.colDropTo = -1
    this.dropTarget = null
    const id = card.getAttribute('data-id') ?? ''
    // 多选拖拽：拖的是选中卡且选中集 > 1 → 移动全部选中卡（数据序）；否则单卡
    this.dragIds =
      card.hasAttribute('data-selected') && this.selectedIds.size > 1
        ? this._cards.filter((c) => this.selectedIds.has(String(c.id ?? ''))).map((c) => String(c.id ?? ''))
        : [id]
    card.classList.add('drag-source')
    const de = e as DragEvent
    if (de.dataTransfer) {
      de.dataTransfer.effectAllowed = 'move'
      de.dataTransfer.setData('text/plain', this.dragIds.join(','))
    }
  }

  private handleDragOver = (e: Event): void => {
    if (this.colDragFrom >= 0) {
      this.handleColumnDragOver(e)
      return
    }
    if (this.dragIds.length === 0) return
    e.preventDefault()
    const de = e as DragEvent
    if (de.dataTransfer) de.dataTransfer.dropEffect = 'move'
    const target = e.target as HTMLElement | null
    // 拖拽悬停折叠泳道带头：自动展开（只切类不重建 DOM，拖拽不中断）
    const laneEl = target?.closest?.('.lane') as HTMLElement | null
    if (laneEl?.classList.contains('lane-collapsed')) this.expandLane(laneEl)
    const hoverCard = target?.closest?.('.card') as HTMLElement | null
    // 卡片容器：无泳道 .column-body；泳道模式 .lane-cell
    const container = (hoverCard ?? target)?.closest?.('.column-body, .lane-cell') as HTMLElement | null
    if (!container) {
      this.clearDropMarks()
      this.dropTarget = null
      return
    }
    const column = container.classList.contains('lane-cell')
      ? (container.getAttribute('data-column') ?? '')
      : (container.closest('.column')?.getAttribute('data-key') ?? '')
    const lane = container.closest('.lane')?.getAttribute('data-lane') ?? null
    if (!this._columns.some((c) => c.key === column)) {
      this.clearDropMarks()
      this.dropTarget = null
      return
    }
    if (hoverCard && this.dragIds.includes(hoverCard.getAttribute('data-id') ?? '')) {
      // 悬在拖动集自身上：无落点指示（拖回原位由 drop 判定）
      this.clearDropMarks()
      this.dropTarget = null
      return
    }
    const list = [...container.querySelectorAll<HTMLElement>('.card')].map((c) => c.getAttribute('data-id') ?? '')
    let index: number
    let before: boolean
    let markCard = hoverCard
    if (hoverCard) {
      const rect = hoverCard.getBoundingClientRect()
      before = de.clientY < rect.top + rect.height / 2
      index = list.indexOf(hoverCard.getAttribute('data-id') ?? '') + (before ? 0 : 1)
    } else {
      // 悬在卡片间隙/容器空白（gap/padding 区）：按 clientY 找下方最近卡插其前，
      // 否则容器尾——旧版一律列尾会让间隙松手的卡片飞列尾（实抓）
      const next = [...container.querySelectorAll<HTMLElement>('.card')].find(
        (c) => c.getBoundingClientRect().top > de.clientY,
      )
      if (next && this.dragIds.includes(next.getAttribute('data-id') ?? '')) {
        // 「下方最近卡」在拖动集内（悬在源卡正上方间隙）：视同悬在自身——原位零操作、无落点指示
        this.clearDropMarks()
        this.dropTarget = null
        return
      }
      if (next) {
        before = true
        index = list.indexOf(next.getAttribute('data-id') ?? '')
        markCard = next
      } else {
        before = false
        index = list.length
      }
    }
    this.dropTarget = { column, lane, index }
    this.paintDropMark(container, markCard, before)
  }

  private handleDrop = (e: Event): void => {
    if (this.colDragFrom >= 0) {
      const from = this.colDragFrom
      const to = this.colDropTo
      this.clearAllDragMarks()
      this.dragIds = []
      this.colDragFrom = -1
      this.colDropTo = -1
      if (to >= 0) this.applyColumnReorder(from, to)
      return
    }
    if (this.dragIds.length === 0) return
    e.preventDefault()
    const ids = this.dragIds
    const target = this.dropTarget
    this.clearAllDragMarks()
    this.dragIds = []
    this.dropTarget = null
    if (!target) return
    this.applyMultiMove(ids, target.column, target.index, target.lane)
  }

  private handleDragEnd = (): void => {
    // 取消路径（Esc/拖出窗口/无效落点）：零操作，只清指示与状态，无孤儿标记
    this.clearAllDragMarks()
    this.dragIds = []
    this.colDragFrom = -1
    this.colDropTo = -1
    this.dropTarget = null
  }

  /** 指示线：目标卡 before/after 插入线；容器尾/空容器给尾部标记 */
  private paintDropMark(container: HTMLElement, hoverCard: HTMLElement | null, before: boolean): void {
    this.clearDropMarks()
    if (hoverCard) {
      hoverCard.classList.add(before ? 'drop-before' : 'drop-after')
    } else {
      container.classList.add('drop-tail')
    }
  }

  private clearDropMarks(): void {
    for (const el of this.shadow.querySelectorAll('.drop-before, .drop-after, .drop-tail')) {
      el.classList.remove('drop-before', 'drop-after', 'drop-tail')
    }
  }

  /** 拖拽终了清全部标记（含源淡化）；dragover 期间只清落点标记（clearDropMarks）——
      源淡化必须贯穿拖拽全程（否则指针一移动淡化即消失，drag-source 形同虚设） */
  private clearAllDragMarks(): void {
    this.clearDropMarks()
    for (const el of this.shadow.querySelectorAll('.drag-source')) el.classList.remove('drag-source')
  }

  /**
   * 落定移动（单卡）：更新内存数据 → 回写 cards attribute（renderCard 在场时仅内存）→ 派发 oas-change。
   * index 语义（与 detail 契约一致）：目标容器在「移除卡片自身后」的插入位。
   * targetLane：目标泳道值（null = 保持卡片原泳道——菜单移动/无泳道场景）。
   * 拖回原单元格原位零操作（不派发、不回写）。
   */
  private applyMove(id: string, toKey: string, visualIndex: number, targetLane: string | null = null): void {
    const pos = this._cards.findIndex((c) => String(c.id ?? '') === id)
    if (pos < 0) return
    const card = this._cards[pos]!
    const from = String(card.column ?? '')
    if (!this._columns.some((c) => c.key === toKey)) return
    const fromLane = this.laneOf(card)
    const lane = targetLane ?? fromLane
    const laneChanged = this.hasLanes && lane !== fromLane
    // 自身在原单元格（列 × 泳道）中的位次（原位判定基准：数组序与渲染分组序一致）
    const originIndex = this._cards
      .slice(0, pos)
      .filter((c) => String(c.column ?? '') === from && this.laneOf(c) === fromLane).length
    let index = visualIndex
    if (from === toKey && lane === fromLane) {
      // 同单元格：视觉位含自身——先判原位（视觉位为 oi 或 oi+1 都等于没动），再换算为移除后的插入位
      if (index === originIndex || index === originIndex + 1) return
      if (index > originIndex) index -= 1
    }
    const rest = this._cards.filter((_, i) => i !== pos)
    const moved: KanbanCard = { ...card }
    if (from !== toKey) moved.column = toKey
    if (laneChanged) moved[this.swimlaneField] = lane
    // 目标单元格锚点插入：index 处目标卡之前；超出则目标单元格区段末尾
    const match = (c: KanbanCard): boolean => String(c.column ?? '') === toKey && this.laneOf(c) === lane
    const targetIds = rest.filter(match).map((c) => String(c.id ?? ''))
    let insertAt: number
    if (index < targetIds.length) {
      insertAt = rest.findIndex((c) => String(c.id ?? '') === targetIds[index])
    } else if (targetIds.length > 0) {
      insertAt = rest.findIndex((c) => String(c.id ?? '') === targetIds[targetIds.length - 1]!) + 1
    } else {
      insertAt = rest.length
    }
    rest.splice(insertAt, 0, moved)
    this._cards = rest
    this.writeBackCards()
    this.emit('change', {
      id,
      from,
      to: toKey,
      index,
      ...(laneChanged ? { swimlane: { from: fromLane, to: lane } } : {}),
    } satisfies KanbanChangeDetail)
  }

  /**
   * 落定移动（多选入口）：单卡走 applyMove 保持既有契约（detail 不带 ids）；
   * 多卡一次性移动全部选中卡（保持数据相对顺序），index 为移除全部选中卡后的目标容器插入位，
   * 派发一条 oas-change（ids + 首枚口径的 from/swimlane）。
   * 零操作判定：移动前后整组数据逐字相同（原位多选拖拽）则不派发、不回写。
   */
  private applyMultiMove(ids: string[], toKey: string, visualIndex: number, targetLane: string | null): void {
    const wanted = new Set(ids)
    const selected = this._cards.filter((c) => wanted.has(String(c.id ?? '')))
    if (selected.length === 0) return
    if (selected.length === 1) {
      this.applyMove(ids[0]!, toKey, visualIndex, targetLane)
      return
    }
    if (!this._columns.some((c) => c.key === toKey)) return
    // 零操作判定前对 this._cards 取快照引用（供签名比对），不复用 JSON.stringify
    //（renderCard 内存对象循环引用会抛、函数字段被丢——交叉审实抓）
    const beforeRef = this._cards
    const first = selected[0]!
    const from = String(first.column ?? '')
    const fromLane = this.laneOf(first)
    const lane = targetLane ?? fromLane
    // 视觉位换算：visualIndex 基于移除前的目标容器，扣除其中位次在插入点之前、将被移走的选中卡
    const preList = this._cards.filter((c) => String(c.column ?? '') === toKey && this.laneOf(c) === lane)
    const removedBefore = preList
      .slice(0, Math.max(0, visualIndex))
      .filter((c) => wanted.has(String(c.id ?? ''))).length
    const index = Math.max(0, visualIndex) - removedBefore
    const rest = this._cards.filter((c) => !wanted.has(String(c.id ?? '')))
    const movedCards = selected.map((card) => {
      const moved: KanbanCard = { ...card }
      if (String(moved.column ?? '') !== toKey) moved.column = toKey
      if (this.hasLanes && this.laneOf(moved) !== lane) moved[this.swimlaneField] = lane
      return moved
    })
    const match = (c: KanbanCard): boolean => String(c.column ?? '') === toKey && this.laneOf(c) === lane
    const targetIds = rest.filter(match).map((c) => String(c.id ?? ''))
    let insertAt: number
    if (index < targetIds.length) {
      insertAt = rest.findIndex((c) => String(c.id ?? '') === targetIds[index])
    } else if (targetIds.length > 0) {
      insertAt = rest.findIndex((c) => String(c.id ?? '') === targetIds[targetIds.length - 1]!) + 1
    } else {
      insertAt = rest.length
    }
    for (const moved of movedCards) {
      rest.splice(insertAt, 0, moved)
      insertAt++
    }
    // 零操作判定：id+column+泳道 三元签名比对（原位移动/未变 → 零操作；跨列/跨带/换序必检出）。
    // 不用 JSON.stringify：renderCard 通道下 cards 是宿主内存对象（循环引用会抛、函数字段被丢——
    // 交叉审实抓）；不用引用比较：移动卡是新展开对象（引用必不同，原位会误判有变化）
    const laneKey = this.hasLanes ? this.swimlaneField : null
    const sigOf = (list: KanbanCard[]): string =>
      list
        .map((c) => `${String(c.id ?? '')}${String(c.column ?? '')}${laneKey ? String(c[laneKey] ?? '') : ''}`)
        .join('|')
    if (sigOf(rest) === sigOf(beforeRef)) return
    this._cards = rest
    this.clearSelection()
    this.writeBackCards()
    const laneChanged = this.hasLanes && lane !== fromLane
    this.emit('change', {
      id: String(first.id ?? ''),
      from,
      to: toKey,
      index,
      ids: selected.map((c) => String(c.id ?? '')),
      ...(laneChanged ? { swimlane: { from: fromLane, to: lane } } : {}),
    } satisfies KanbanChangeDetail)
  }

  /** cards 回写：renderCard 在场时仅内存（函数不可序列化）；否则反射 attribute（触发重渲染） */
  private writeBackCards(): void {
    if (this._renderCard) {
      this.runUpdateAndNotify()
    } else {
      this.setAttribute('cards', JSON.stringify(this._cards))
    }
  }

  // ==================== 列拖拽重排 ====================

  private startColumnDrag(e: Event, handle: HTMLElement): void {
    const head = handle.closest('.column-head') as HTMLElement | null
    const key = head?.getAttribute('data-key') ?? ''
    const from = this._columns.findIndex((c) => c.key === key)
    if (from < 0) return
    this.dragIds = []
    this.dropTarget = null
    this.colDragFrom = from
    this.colDropTo = -1
    head!.classList.add('drag-source')
    const de = e as DragEvent
    if (de.dataTransfer) {
      de.dataTransfer.effectAllowed = 'move'
      de.dataTransfer.setData('text/plain', key)
    }
  }

  /** 列拖拽悬停：目标头左半/右半 → 移除后插入位（to === 原位则无指示） */
  private handleColumnDragOver(e: Event): void {
    if (this.colDragFrom < 0) return
    e.preventDefault()
    const de = e as DragEvent
    if (de.dataTransfer) de.dataTransfer.dropEffect = 'move'
    const head = (e.target as HTMLElement | null)?.closest?.('.column-head') as HTMLElement | null
    if (!head) {
      this.clearDropMarks()
      this.colDropTo = -1
      return
    }
    const h = this._columns.findIndex((c) => c.key === (head.getAttribute('data-key') ?? ''))
    if (h < 0) {
      this.clearDropMarks()
      this.colDropTo = -1
      return
    }
    const rect = head.getBoundingClientRect()
    const before = de.clientX < rect.left + rect.width / 2
    const visual = h + (before ? 0 : 1)
    const to = visual > this.colDragFrom ? visual - 1 : visual
    if (to === this.colDragFrom) {
      // 紧邻原位：零操作，无指示
      this.clearDropMarks()
      this.colDropTo = -1
      return
    }
    this.colDropTo = to
    this.clearDropMarks()
    head.classList.add(before ? 'drop-before' : 'drop-after')
  }

  /**
   * 落定列重排：只重排列定义（卡片数据不动——分组按 key 跟随），回写 columns attribute
   * （列定义无函数通道，恒反射）→ 派发 oas-column-reorder { from, to, keys }。
   * to 为移除后的插入位（即重排后该列最终位次）；to === from 原位零操作。
   */
  private applyColumnReorder(from: number, to: number): void {
    if (from < 0 || from >= this._columns.length) return
    if (to < 0 || to > this._columns.length - 1) return
    if (to === from) return
    const cols = this._columns.slice()
    const [moved] = cols.splice(from, 1)
    cols.splice(to, 0, moved!)
    this._columns = cols
    this.setAttribute('columns', JSON.stringify(cols))
    this.emit('column-reorder', { from, to, keys: cols.map((c) => c.key) } satisfies KanbanColumnReorderDetail)
  }

  // ==================== 触屏移动菜单（coarse 降级）+ 列移动按钮 + 泳道折叠 ====================

  private handleClick = (e: Event): void => {
    const target = e.target as HTMLElement | null
    const moveBtn = target?.closest?.('.card-move') as HTMLButtonElement | null
    if (moveBtn) {
      const card = moveBtn.closest('.card') as HTMLElement | null
      if (card) this.openMenu(card.getAttribute('data-id') ?? '', moveBtn)
      return
    }
    if (target?.closest?.('.move-menu')) {
      this.handleMenuItemClick(target as HTMLElement)
      return
    }
    const navBtn = target?.closest?.('.column-nav') as HTMLElement | null
    if (navBtn) {
      this.handleColumnNav(navBtn)
      return
    }
    const laneToggle = target?.closest?.('.lane-toggle') as HTMLElement | null
    if (laneToggle) {
      this.handleLaneToggle(laneToggle)
      return
    }
    // 列拖拽手柄点击零操作（拖拽走 DnD，键盘换序在 keydown）
    if (target?.closest?.('.column-drag')) return
    const card = target?.closest?.('.card') as HTMLElement | null
    if (card) {
      this.handleCardClick(e as MouseEvent, card)
      return
    }
    // 空白处点击：清空多选
    this.clearSelection()
  }

  /** 外点关菜单（document capture）：事件路径含菜单或触发按钮则忽略 */
  private handleOutsideClick = (e: Event): void => {
    if (!this.menuCardId) return
    const path = e.composedPath()
    if (
      (this.menuAnchor && path.includes(this.menuAnchor)) ||
      path.some((n) => n instanceof Element && n.classList.contains('move-menu'))
    ) {
      return
    }
    this.closeMenu()
  }

  private handleKeydown = (e: Event): void => {
    const key = (e as KeyboardEvent).key
    const target = e.target as HTMLElement | null
    // 列手柄键盘换序：←/→（键盘可达；触屏按钮之外的第三条路径）
    if (target?.closest?.('.column-drag') && (key === 'ArrowLeft' || key === 'ArrowRight')) {
      e.preventDefault()
      const head = target.closest('.column-head') as HTMLElement | null
      const idx = this._columns.findIndex((c) => c.key === (head?.getAttribute('data-key') ?? ''))
      if (idx >= 0) this.applyColumnReorder(idx, idx + (key === 'ArrowRight' ? 1 : -1))
      return
    }
    if (key === 'Escape') {
      if (this.menuCardId) this.closeMenu()
      else this.clearSelection()
    }
  }

  /** 打开移动菜单：上移/下移（同单元格边界禁用）+ 其它列名（菜单第一期只作用于按钮所在单卡） */
  private openMenu(cardId: string, anchor: HTMLButtonElement): void {
    this.closeMenu()
    const card = this._cards.find((c) => String(c.id ?? '') === cardId)
    if (!card) return
    const from = String(card.column ?? '')
    const lane = this.laneOf(card)
    // 同单元格（列 × 泳道）内兄弟序：上移/下移只在单元格内换位
    const siblings = this._cards.filter((c) => String(c.column ?? '') === from && this.laneOf(c) === lane)
    const idx = siblings.indexOf(card)

    const menu = document.createElement('div')
    menu.className = 'move-menu'
    menu.setAttribute('part', 'move-menu')
    menu.setAttribute('role', 'menu')
    const addItem = (label: string, action: string, disabled: boolean): void => {
      const item = document.createElement('button')
      item.type = 'button'
      item.setAttribute('role', 'menuitem')
      item.dataset.action = action
      item.textContent = label
      if (disabled) item.setAttribute('aria-disabled', 'true')
      menu.appendChild(item)
    }
    addItem(this.t('kanban.moveUp'), 'up', idx <= 0)
    addItem(this.t('kanban.moveDown'), 'down', idx < 0 || idx >= siblings.length - 1)
    for (const col of this._columns) {
      if (col.key === from) continue
      addItem(col.title, `to:${col.key}`, false)
    }

    // fixed 定位锚在按钮下方（右缘对齐；happy-dom 无布局全 0 不影响断言路径）
    this.shadow.appendChild(menu)
    const rect = anchor.getBoundingClientRect()
    const menuRect = menu.getBoundingClientRect()
    const top = rect.bottom + 4
    menu.style.top = `${Math.max(4, top)}px`
    const left = rect.right - menuRect.width
    menu.style.left = `${Math.max(4, left)}px`

    this.menuCardId = cardId
    this.menuAnchor = anchor
    anchor.setAttribute('aria-expanded', 'true')
    this.bindMenuDocument()
    // 键盘可达（ARIA menu 惯例）：开菜单焦点移交首项，↑↓ 漫游、Home/End 跳首尾、Esc 关菜单回焦锚点
    const items = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')]
    items.forEach((it) => (it.tabIndex = -1))
    const first = items.find((it) => it.getAttribute('aria-disabled') !== 'true') ?? items[0]
    if (first) {
      first.tabIndex = 0
      first.focus()
    }
    menu.addEventListener('keydown', (e: KeyboardEvent) => {
      const enabled = items.filter((it) => it.getAttribute('aria-disabled') !== 'true')
      if (enabled.length === 0) return
      const cur = enabled.indexOf(this.shadow.activeElement as HTMLElement)
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const next =
          e.key === 'ArrowDown'
            ? enabled[(cur + 1 + enabled.length) % enabled.length]
            : enabled[(cur - 1 + enabled.length) % enabled.length]
        enabled.forEach((it) => (it.tabIndex = it === next ? 0 : -1))
        next!.focus()
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault()
        const target = e.key === 'Home' ? enabled[0] : enabled[enabled.length - 1]
        enabled.forEach((it) => (it.tabIndex = it === target ? 0 : -1))
        target!.focus()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        // 阻断冒泡：菜单 Esc 只关菜单，不让根级 Esc 处理顺带清空多选
        e.stopPropagation()
        const anchor = this.menuAnchor
        this.closeMenu()
        anchor?.focus()
      }
    })
  }

  private closeMenu = (): void => {
    this.unbindMenuDocument()
    if (!this.menuCardId) return
    this.shadow.querySelector('.move-menu')?.remove()
    this.menuAnchor?.setAttribute('aria-expanded', 'false')
    this.menuAnchor = null
    this.menuCardId = ''
  }

  /** document 级滚动关菜单：菜单自身滚动豁免（composedPath 含 .move-menu 时保留——
      菜单超高（max-height 260px）时滚动菜单不应被关闭，否则够不到下方列项） */
  private handleDocumentScroll = (e: Event): void => {
    if (!this.menuCardId) return
    if (e.composedPath().some((n) => n instanceof HTMLElement && n.classList?.contains('move-menu'))) return
    this.closeMenu()
  }

  private handleMenuItemClick = (item: HTMLElement): void => {
    if (item.getAttribute('aria-disabled') === 'true') return
    const action = item.dataset.action ?? ''
    const cardId = this.menuCardId
    this.closeMenu()
    if (!cardId) return
    const card = this._cards.find((c) => String(c.id ?? '') === cardId)
    if (!card) return
    const from = String(card.column ?? '')
    const lane = this.laneOf(card)
    if (action === 'up' || action === 'down') {
      const siblings = this._cards.filter((c) => String(c.column ?? '') === from && this.laneOf(c) === lane)
      const idx = siblings.indexOf(card)
      // 下移传 idx+2 而非 idx+1：applyMove 同单元格原位判定把「原位+1」视为没动（拖到紧随
      // 其后 = 原位零操作），idx+1 会被静默吞掉——触屏「下移」曾因此恒为死按钮（实抓）；
      // idx+2 经 applyMove 的 index>originIndex → index-=1 换算后恰为正确插入位
      const index = action === 'up' ? idx - 1 : Math.min(idx + 2, siblings.length)
      if (index < 0) return
      this.applyMove(cardId, from, index)
      return
    }
    if (action.startsWith('to:')) {
      const toKey = action.slice(3)
      // 移到目标列同带（泳道不变）末尾：index = 目标单元格当前卡数（与拖拽落点同语义）
      const count = this._cards.filter((c) => String(c.column ?? '') === toKey && this.laneOf(c) === lane).length
      this.applyMove(cardId, toKey, count)
    }
  }

  // ==================== 泳道折叠 / 触屏列移动 ====================

  /** 折叠/展开泳道（只切类不重建 DOM：折叠态切换不打断拖拽/焦点，数据变化时状态保留） */
  private handleLaneToggle(toggle: HTMLElement): void {
    const laneEl = toggle.closest('.lane') as HTMLElement | null
    if (!laneEl) return
    const lane = laneEl.getAttribute('data-lane') ?? ''
    if (this.collapsedLanes.has(lane)) {
      this.expandLane(laneEl)
    } else {
      this.collapsedLanes.add(lane)
      laneEl.classList.add('lane-collapsed')
      toggle.setAttribute('aria-expanded', 'false')
      toggle.classList.remove('open')
    }
  }

  private expandLane(laneEl: HTMLElement): void {
    const lane = laneEl.getAttribute('data-lane') ?? ''
    if (!this.collapsedLanes.delete(lane)) return
    laneEl.classList.remove('lane-collapsed')
    const toggle = laneEl.querySelector('.lane-toggle')
    toggle?.setAttribute('aria-expanded', 'true')
    toggle?.classList.add('open')
  }

  /** 触屏列移动按钮（coarse）：左移/右移一位，边界 aria-disabled 拦截 */
  private handleColumnNav(btn: HTMLElement): void {
    if (btn.getAttribute('aria-disabled') === 'true') return
    const head = btn.closest('.column-head') as HTMLElement | null
    const idx = this._columns.findIndex((c) => c.key === (head?.getAttribute('data-key') ?? ''))
    if (idx < 0) return
    this.applyColumnReorder(idx, idx + (btn.dataset.nav === 'next' ? 1 : -1))
  }
}
