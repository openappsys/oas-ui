import { OASElement } from '@oas-ui/core'

/** 列定义：`columns` 属性（JSON）元素结构 */
export interface KanbanColumn {
  key: string
  title: string
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
  justify-content: space-between;
  gap: var(--oas-space-2);
  padding: var(--oas-space-2) var(--oas-space-3);
  background: var(--oas-color-bg-hover);
  border-bottom: 1px solid var(--oas-color-border);
}
.column-title {
  font-weight: var(--oas-font-weight-medium, 500);
  font-size: var(--oas-font-size-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.column-count {
  flex: none;
  min-width: 20px;
  padding: 0 var(--oas-space-1);
  text-align: center;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  background: var(--oas-color-bg);
  border-radius: var(--oas-radius-full, 999px);
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
.column-body.drop-tail {
  box-shadow: inset 0 -2px 0 var(--oas-color-primary);
}
.empty-column {
  border: 1px dashed var(--oas-color-border-strong);
  border-radius: var(--oas-radius-sm);
  padding: var(--oas-space-4);
  text-align: center;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
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

/**
 * oas-kanban —— 看板（列 + 卡片拖拽）。
 *
 * 数据通道（与 oas-table 惯例一致：attribute JSON + property 双通道，非受控回写 + attribute 反射）：
 * - `columns`：JSON 数组 `[{ key, title }]` 列定义；
 * - `cards`：JSON 数组 `[{ id, column, title, ...任意字段 }]`，`column` 为所属列 key；
 * - 拖放后改写数据并**回写 cards attribute**，同时派发 `oas-change`；
 * - `renderCard` property 函数在场时数据不反射回 attribute（内存持有，函数不可序列化）。
 *
 * 交互：
 * - 卡片 HTML5 DnD 拖拽：换列 + 列内排序；落点插入指示线；拖回原位零操作；
 * - 触屏降级：卡片右上角移动按钮（pointer:coarse 显示）——上移/下移/移到指定列；
 * - 键盘可达：卡片 tabindex=0（listitem）；非空列体 role=list + aria-label 列名（空列不设 list 语义）；
 * - 空列占位文案走 i18n（`kanban.emptyColumn`），`empty-column-text` 属性可覆盖。
 *
 * 事件（bubbles + composed）：
 * - `oas-change`：拖放/菜单移动落定后派发，detail `{ id, from, to, index }`——
 *   from/to 为列 key，index 为落点在目标列的位置（移除卡片自身后的插入位，
 *   宿主「目标列数组 splice(index, 0, card)」即可复现）。
 *
 * 第一期不做：列拖拽重排、泳道、WIP 限制、卡片多选。
 */
export class OASKanban extends OASElement {
  static override get observedAttributes(): string[] {
    return ['columns', 'cards', 'empty-column-text']
  }

  private _columns: KanbanColumn[] = []
  private _cards: KanbanCard[] = []
  /** 已解析的 cards attribute 原文（变化才重解析，renderCard 在场不阻断首帧解析） */
  private _cardsRaw = ''
  /** renderCard property 函数在场：数据内存持有，不反射 cards attribute（同 table 函数列先例） */
  private _renderCard: KanbanCardRenderer | null = null

  /** 拖拽源卡片 id（'' = 无进行中拖拽；不依赖 dataTransfer——部分环境 DragEvent 不带） */
  private dragId = ''
  /** 最近一次 dragover 计算的落点（目标列 key + 视觉插入位），drop 时据此落定 */
  private dropTarget: { column: string; index: number } | null = null
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

  /** 真水合：校验 SSR 快照结构（看板容器与列存在）后直接接管，跳过 shadow 重建（oas-table 同款先例） */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.kanban')) return false
    if (!this.shadow.querySelector('.column')) return false
    this.bind()
    return true
  }

  /** 缓存节点引用 + 事件委托绑定 + 注册清理（render/hydrate 共用路径） */
  private bind(): void {
    const root = this.shadow
    // 拖拽事件委托到 shadow 根：列/卡片重建无需重绑（dragstart 触屏不可用，触屏走移动菜单）
    root.addEventListener('dragstart', this.handleDragStart)
    root.addEventListener('dragover', this.handleDragOver)
    root.addEventListener('drop', this.handleDrop)
    root.addEventListener('dragend', this.handleDragEnd)
    // 点击委托：触屏移动按钮开菜单 / 菜单项落定
    root.addEventListener('click', this.handleClick)
    // 外点与滚动关菜单：挂 document——shadow 根监听收不到宿主/外部区域冒泡的事件；
    // scroll 不冒泡，capture 捕获列体滚动（菜单 fixed 定位防错位）
    document.addEventListener('click', this.handleOutsideClick, true)
    document.addEventListener('scroll', this.handleDocumentScroll, true)
    // shadow 内滚动（列体 overflow-y）必须另挂 shadow 根：scroll 是 non-composed 事件，
    // 不跨 shadow 边界——document capture 收不到列体滚动（实证），菜单会悬停原地脱锚
    root.addEventListener('scroll', this.handleDocumentScroll, true)
    // Esc 关菜单（shadow 内 keydown 不冒泡出宿主，shadow 根监听够用）
    root.addEventListener('keydown', this.handleKeydown)
    this.onCleanup(() => {
      // 只摘 document 级监听（shadow 根监听随元素 GC，不摘也不泄漏——摘除反而让
      // append/re-parent 重连后交互全灭且永不恢复：render 生命周期只 bind 一次）
      document.removeEventListener('click', this.handleOutsideClick, true)
      document.removeEventListener('scroll', this.handleDocumentScroll, true)
      this.closeMenu()
    })
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
    for (const col of this._columns) {
      board.appendChild(
        this.buildColumn(
          col,
          this._cards.filter((c) => String(c.column ?? '') === col.key),
        ),
      )
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

  /** 空列占位文案：属性覆盖 > i18n */
  private emptyColumnText(): string {
    const custom = this.getAttr('empty-column-text', '')
    if (custom !== '') return custom
    return this.t('kanban.emptyColumn')
  }

  /** 构建单列：列头（标题 + 计数）+ 列体（卡片 / 空列占位） */
  private buildColumn(col: KanbanColumn, cards: KanbanCard[]): HTMLElement {
    const column = document.createElement('div')
    column.className = 'column'
    column.setAttribute('part', 'column')
    column.setAttribute('data-key', col.key)

    const head = document.createElement('div')
    head.className = 'column-head'
    head.setAttribute('part', 'column-head')
    const title = document.createElement('span')
    title.className = 'column-title'
    title.setAttribute('part', 'column-title')
    title.textContent = col.title
    const count = document.createElement('span')
    count.className = 'column-count'
    count.setAttribute('part', 'column-count')
    count.textContent = String(cards.length)
    head.appendChild(title)
    head.appendChild(count)

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

    column.appendChild(head)
    column.appendChild(body)
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

  // ==================== HTML5 DnD 拖拽（换列 + 列内排序） ====================

  private handleDragStart = (e: Event): void => {
    const card = (e.target as HTMLElement | null)?.closest?.('.card') as HTMLElement | null
    if (!card) return
    this.dragId = card.getAttribute('data-id') ?? ''
    this.dropTarget = null
    card.classList.add('drag-source')
    const de = e as DragEvent
    if (de.dataTransfer) {
      de.dataTransfer.effectAllowed = 'move'
      de.dataTransfer.setData('text/plain', this.dragId)
    }
  }

  private handleDragOver = (e: Event): void => {
    if (!this.dragId) return
    e.preventDefault()
    const de = e as DragEvent
    if (de.dataTransfer) de.dataTransfer.dropEffect = 'move'
    const target = e.target as HTMLElement | null
    const hoverCard = target?.closest?.('.card') as HTMLElement | null
    const column = hoverCard?.closest<HTMLElement>('.column') ?? (target?.closest?.('.column') as HTMLElement | null)
    if (!column) {
      this.clearDropMarks()
      this.dropTarget = null
      return
    }
    const toKey = column.getAttribute('data-key') ?? ''
    if (hoverCard && hoverCard.getAttribute('data-id') === this.dragId) {
      // 悬在自身上：无落点指示（拖回原位由 drop 判定）
      this.clearDropMarks()
      this.dropTarget = null
      return
    }
    const list = this.cardsInColumn(toKey)
    let index: number
    let before: boolean
    let markCard = hoverCard
    if (hoverCard) {
      const rect = hoverCard.getBoundingClientRect()
      before = de.clientY < rect.top + rect.height / 2
      index = list.indexOf(hoverCard.getAttribute('data-id') ?? '') + (before ? 0 : 1)
    } else {
      // 悬在卡片间隙/列体空白（gap/padding 区）：按 clientY 找下方最近卡插其前，
      // 否则列尾——旧版一律列尾会让间隙松手的卡片飞列尾（实抓）
      const next = [...column.querySelectorAll<HTMLElement>('.card')].find(
        (c) => c.getBoundingClientRect().top > de.clientY,
      )
      if (next?.getAttribute('data-id') === this.dragId) {
        // 「下方最近卡」是拖动源卡自身（悬在源卡正上方间隙）：视同悬在自身——原位零操作、无落点指示
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
    this.dropTarget = { column: toKey, index }
    this.paintDropMark(column, markCard, before)
  }

  private handleDrop = (e: Event): void => {
    if (!this.dragId) return
    e.preventDefault()
    const id = this.dragId
    const target = this.dropTarget
    this.clearAllDragMarks()
    this.dragId = ''
    this.dropTarget = null
    if (!target) return
    this.applyMove(id, target.column, target.index)
  }

  private handleDragEnd = (): void => {
    // 取消路径（Esc/拖出窗口/无效落点）：零操作，只清指示与状态，无孤儿标记
    this.clearAllDragMarks()
    this.dragId = ''
    this.dropTarget = null
  }

  /** 目标列当前卡 id 序（按展示顺序；遍历比对避免 key 内插选择器） */
  private cardsInColumn(key: string): string[] {
    for (const column of this.shadow.querySelectorAll<HTMLElement>('.column')) {
      if (column.getAttribute('data-key') === key) {
        return [...column.querySelectorAll<HTMLElement>('.card')].map((c) => c.getAttribute('data-id') ?? '')
      }
    }
    return []
  }

  /** 指示线：目标卡 before/after 插入线；列尾/空列给列体尾部标记 */
  private paintDropMark(column: HTMLElement, hoverCard: HTMLElement | null, before: boolean): void {
    this.clearDropMarks()
    if (hoverCard) {
      hoverCard.classList.add(before ? 'drop-before' : 'drop-after')
    } else {
      column.querySelector('.column-body')?.classList.add('drop-tail')
    }
  }

  private clearDropMarks(): void {
    for (const el of this.shadow.querySelectorAll('.drop-before, .drop-after, .drop-tail')) {
      el.classList.remove('drop-before', 'drop-after', 'drop-tail')
    }
  }

  /** 拖拽终了清全部标记（含源卡淡化）；dragover 期间只清落点标记（clearDropMarks）——
      源卡淡化必须贯穿拖拽全程（否则指针一移动淡化即消失，drag-source 形同虚设） */
  private clearAllDragMarks(): void {
    this.clearDropMarks()
    for (const el of this.shadow.querySelectorAll('.drag-source')) el.classList.remove('drag-source')
  }

  /**
   * 落定移动：更新内存数据 → 回写 cards attribute（renderCard 在场时仅内存）→ 派发 oas-change。
   * index 语义（与 detail 契约一致）：目标列在「移除卡片自身后」的插入位。
   * 拖回原位零操作（不派发、不回写）。
   */
  private applyMove(id: string, toKey: string, visualIndex: number): void {
    const pos = this._cards.findIndex((c) => String(c.id ?? '') === id)
    if (pos < 0) return
    const card = this._cards[pos]!
    const from = String(card.column ?? '')
    if (!this._columns.some((c) => c.key === toKey)) return
    // 自身在原列中的位次（原位判定基准：数组序与渲染分组序一致）
    const originIndex = this._cards.slice(0, pos).filter((c) => String(c.column ?? '') === from).length
    let index = visualIndex
    if (from === toKey) {
      // 同列：视觉位含自身——先判原位（视觉位为 oi 或 oi+1 都等于没动），再换算为移除后的插入位
      if (index === originIndex || index === originIndex + 1) return
      if (index > originIndex) index -= 1
    }
    const rest = this._cards.filter((_, i) => i !== pos)
    const moved: KanbanCard = { ...card }
    if (from !== toKey) moved.column = toKey
    // 目标列锚点插入：index 处目标卡之前；超出则目标列区段末尾
    const targetIds = rest.filter((c) => String(c.column ?? '') === toKey).map((c) => String(c.id ?? ''))
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
    if (this._renderCard) {
      // renderCard 在场：函数不可序列化，数据不反射 attribute（同 table 函数列先例）
      this.runUpdateAndNotify()
    } else {
      this.setAttribute('cards', JSON.stringify(this._cards))
    }
    this.emit('change', { id, from, to: toKey, index } satisfies KanbanChangeDetail)
  }

  // ==================== 触屏移动菜单（coarse 降级） ====================

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
    }
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
    if ((e as KeyboardEvent).key === 'Escape' && this.menuCardId) this.closeMenu()
  }

  /** 打开移动菜单：上移/下移（同列边界禁用）+ 其它列名 */
  private openMenu(cardId: string, anchor: HTMLButtonElement): void {
    this.closeMenu()
    const card = this._cards.find((c) => String(c.id ?? '') === cardId)
    if (!card) return
    const from = String(card.column ?? '')
    const siblings = this._cards.filter((c) => String(c.column ?? '') === from)
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
        const anchor = this.menuAnchor
        this.closeMenu()
        anchor?.focus()
      }
    })
  }

  private closeMenu = (): void => {
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
    if (action === 'up' || action === 'down') {
      const siblings = this._cards.filter((c) => String(c.column ?? '') === from)
      const idx = siblings.indexOf(card)
      // 下移传 idx+2 而非 idx+1：applyMove 同列原位判定把「原位+1」视为没动（拖到紧随
      // 其后 = 原位零操作），idx+1 会被静默吞掉——触屏「下移」曾因此恒为死按钮（实抓）；
      // idx+2 经 applyMove 的 index>originIndex → index-=1 换算后恰为正确插入位
      const index = action === 'up' ? idx - 1 : Math.min(idx + 2, siblings.length)
      if (index < 0) return
      this.applyMove(cardId, from, index)
      return
    }
    if (action.startsWith('to:')) {
      const toKey = action.slice(3)
      // 移到目标列末尾：index = 目标列当前卡数（与拖拽列尾落点同语义）
      const count = this._cards.filter((c) => String(c.column ?? '') === toKey).length
      this.applyMove(cardId, toKey, count)
    }
  }
}
