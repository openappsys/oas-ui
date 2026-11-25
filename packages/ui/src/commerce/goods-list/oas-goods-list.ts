import { OASElement } from '@oas-ui/core/oas-element'
import { devWarn } from '../../shared/dev-warn.js'
import { parseJsonArray } from '../../shared/json-array.js'
import '../price/index.js'
import { assignColumns, resolveColumns, shouldRequestMore } from './column-assign.js'

export { assignColumns, resolveAutoColumns, resolveColumns, shouldRequestMore } from './column-assign.js'

/**
 * oas-goods-list —— 商品列表容器（commerce 族）。
 *
 * 商品列表页的容器件：两形态 `layout="waterfall"`（缺省，瀑布流：`columns` 固定数值或
 * `auto` 按容器宽自适应 + 列均衡分配——按累计高度最短列放置）/ `layout="list"`（纵向单列）。
 * 数据面 = `items` JSON 双通道（image / title / price / originalPrice / tags，渲染内建简版卡，
 * 对齐 product-card 惯例：图片缺失占位、划线原价）；卡片位插槽可整体替换（宿主放自己的
 * product-card / 自定义卡，**插槽优先于默认渲染**）。加载更多：触底派 `oas-load-more`
 * （宿主置 `loading` 显示加载态、置 `no-more` 显示到底态）；`oas-item-click` 进详情；
 * 空态走 `empty` 插槽（缺省 i18n 文案）。
 *
 * 本体只承载大众功能集（architecture §3.1 族级包体分级）；「分页协议 / 虚拟滚动 /
 * 服务端瀑布流」等重增强预留为能力子路径面（见 README「预留能力面」）。
 *
 * 属性（kebab-case）：
 * - `layout`：`waterfall`（缺省，瀑布流多列）/ `list`（纵向单列）；非法值回落 waterfall 并告警一次
 * - `columns`：瀑布流列数——固定数值（1–8，clamp）或 `auto`（缺省，容器宽断点：<640 → 2、
 *   <1024 → 3、其余 4；ResizeObserver 跟随容器宽变化重排）；list 形态恒单列
 * - `items`：JSON 数组 `[{ image?, title, price?, originalPrice?, tags?: string[] }]`
 *   （内建简版卡数据；缺 `title` 的条目被忽略）。property 双通道：`items`。
 * - `loading`：加载更多 loading 态（宿主收到 `oas-load-more` 后置位；渲染 spinner +
 *   加载中文案；置位同时复位触底待应答，允许下一轮触发）
 * - `no-more`：到底态（渲染「没有更多了」文案，触底不再派发）
 * - `currency` / `locale` / `precision`：透传内建卡内嵌 `oas-price`（product-card 同款惯例）
 *
 * 事件（bubbles + composed）：
 * - `oas-load-more`：哨兵进入视口（240px 提前量）且非 loading / no-more 时派发；派发后进入
 *   待应答（同一次可见不重复派发），宿主置 `loading` 或 `items` 变化解除；宿主两者都不做
 *   则不再触发（防炸：宿主责任在收到事件后二选一）。
 * - `oas-item-click`：点击（或 Enter）内建简版卡后派发，`detail: { index, item }`；
 *   插槽卡的内容与点击行为完全由宿主接管（不派发）。
 *
 * 插槽：
 * - 默认：卡片位整体替换——有分配元素时忽略 `items`，宿主卡片按序分配进列（瀑布流同样
 *   均衡放置）；list 形态单列依次排列。
 * - `empty`：空态（items 空且无插槽卡时渲染；缺省 i18n `goodsList.empty` 文案）。
 *
 * a11y：容器 `role="list"` + 卡片 `role="listitem"`（列容器 `role="presentation"` 不打断语义）；
 * 内建卡可 Tab 聚焦、Enter 触发 `oas-item-click`；图片 `alt` 取标题，缺失占位 `role="img"` +
 * i18n 文案（文字进 aria-label 不上屏，与 product-card 同款对比度口径）；加载中 / 到底态
 * 均为文本可读。布局走逻辑属性（RTL 安全），颜色全走 token。
 */

export type GoodsListLayout = 'waterfall' | 'list'

export interface GoodsItem {
  image?: string
  title: string
  price?: number
  originalPrice?: number
  tags?: string[]
}

export interface GoodsItemClickDetail {
  index: number
  item: GoodsItem
}

const LAYOUTS: readonly string[] = ['waterfall', 'list']

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.wrap {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
  min-width: 0;
}
.grid {
  display: flex;
  align-items: flex-start;
  gap: var(--oas-space-3);
  min-width: 0;
}
.col {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
  flex: 1 1 0;
  min-width: 0;
}
.card {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  box-sizing: border-box;
  padding: var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg);
  cursor: pointer;
  transition: box-shadow var(--oas-transition-fast) var(--oas-ease-out);
}
.card:hover {
  box-shadow: var(--oas-shadow-sm);
}
.card:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.media {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-hover);
  aspect-ratio: 1 / 1;
}
.media[data-empty='true'] {
  border: 1px dashed var(--oas-color-border);
}
.media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.media img[hidden] {
  display: none;
}
.placeholder {
  position: absolute;
  inset: 0;
}
.placeholder[hidden] {
  display: none;
}
.title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  margin: 0;
  font-size: var(--oas-font-size-md);
  font-weight: 500;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.title[hidden] {
  display: none;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--oas-space-1) var(--oas-space-2);
}
.tags[hidden] {
  display: none;
}
.tag {
  display: inline-flex;
  align-items: center;
  padding: 0 var(--oas-space-2);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-xs);
  line-height: 1.6;
}
.price {
  font-size: var(--oas-font-size-sm);
}
.price[hidden] {
  display: none;
}
.more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-2);
  padding-block: var(--oas-space-3);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.more[hidden] {
  display: none;
}
.sentinel {
  height: 1px;
}
.spinner {
  width: 1em;
  height: 1em;
  border: 2px solid var(--oas-color-border);
  border-block-start-color: var(--oas-color-primary);
  border-radius: var(--oas-radius-full, 999px);
  animation: goods-list-spin 0.8s linear infinite;
}
.spinner[hidden] {
  display: none;
}
@keyframes goods-list-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--oas-space-6);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.empty[hidden] {
  display: none;
}
.empty-text {
  display: inline-flex;
}
.empty-text[hidden] {
  display: none;
}
.measure {
  position: absolute;
  inset-inline-start: -9999px;
  inset-block-start: 0;
  visibility: hidden;
  display: flex;
  gap: var(--oas-space-3);
}

@media (forced-colors: active) {
  .card:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 2px;
    box-shadow: none;
  }
  .spinner {
    border-color: CanvasText;
  }
}
`

export class OASGoodsList extends OASElement {
  static override get observedAttributes(): string[] {
    return ['layout', 'columns', 'items', 'loading', 'no-more', 'currency', 'locale', 'precision']
  }

  private gridEl: HTMLElement | null = null
  private wrapEl: HTMLElement | null = null
  private moreEl: HTMLElement | null = null
  private spinnerEl: HTMLElement | null = null
  private moreTextEl: HTMLElement | null = null
  private sentinelEl: HTMLElement | null = null
  private emptyEl: HTMLElement | null = null
  private emptyTextEl: HTMLElement | null = null
  private measureEl: HTMLElement | null = null
  private slotEl: HTMLSlotElement | null = null
  private emptySlot: HTMLSlotElement | null = null

  private warnedLayout = false
  private warnedItems = false
  /** 卡片集渲染签名（items JSON / 插槽成员集变化才重建列） */
  private cardsSignature = ''
  /** 触底待应答（派发 oas-load-more 后直到宿主置 loading 或 items 变化才解除） */
  private loadPending = false
  /** rAF 节流句柄（scroll/resize 共用） */
  private scrollRaf = 0
  /** 已捕获的插槽卡（搬运进 shadow 列后 assignedElements 变空，靠此保持插槽模式） */
  private capturedCards: HTMLElement[] = []

  // -------------------------------------------------------------------------
  // property 通道
  // -------------------------------------------------------------------------

  /**
   * @apiProperty 商品数据：get+set 双通道（数组或 JSON 字符串），赋值即生效不派发事件
   */
  get items(): GoodsItem[] {
    return this.parseItems()
  }

  set items(value: GoodsItem[] | string) {
    this.setAttribute('items', typeof value === 'string' ? value : JSON.stringify(value ?? []))
  }

  // -------------------------------------------------------------------------
  // 数据解析
  // -------------------------------------------------------------------------

  private parseItems(): GoodsItem[] {
    return parseJsonArray<GoodsItem>(this.getAttr('items'), () => {
      if (!this.warnedItems) {
        this.warnedItems = true
        devWarn('[oas-goods-list] items 不是合法 JSON 数组，已按空列表处理')
      }
    }).filter(
      (it): it is GoodsItem =>
        typeof it === 'object' &&
        it !== null &&
        typeof (it as GoodsItem).title === 'string' &&
        (it as GoodsItem).title !== '',
    )
  }

  private resolveLayout(): GoodsListLayout {
    const raw = this.getAttr('layout').trim()
    if (raw === '' || raw === 'waterfall') return 'waterfall'
    if (raw === 'list') return 'list'
    if (!this.warnedLayout) {
      this.warnedLayout = true
      devWarn(`[oas-goods-list] layout "${raw}" 非法（waterfall / list），已回落 waterfall`)
    }
    return 'waterfall'
  }

  // -------------------------------------------------------------------------
  // 生命周期
  // -------------------------------------------------------------------------

  private template(): string {
    return `
      <style>${STYLE}</style>
      <section class="wrap" part="wrap" role="list" aria-label="">
        <div class="grid" part="grid"></div>
        <slot class="slot-source"></slot>
        <div class="more" part="more" hidden>
          <span class="spinner" part="spinner" aria-hidden="true" hidden></span>
          <span class="more-text" part="more-text"></span>
        </div>
        <div class="sentinel" part="sentinel" aria-hidden="true"></div>
        <div class="empty" part="empty" hidden>
          <slot name="empty"></slot>
          <span class="empty-text" part="empty-text"></span>
        </div>
        <div class="measure" aria-hidden="true"></div>
      </section>
    `
  }

  private bind(): void {
    this.gridEl = this.shadow.querySelector<HTMLElement>('[part="grid"]')
    this.wrapEl = this.shadow.querySelector<HTMLElement>('[part="wrap"]')
    this.moreEl = this.shadow.querySelector<HTMLElement>('[part="more"]')
    this.spinnerEl = this.shadow.querySelector<HTMLElement>('[part="spinner"]')
    this.moreTextEl = this.shadow.querySelector<HTMLElement>('[part="more-text"]')
    this.sentinelEl = this.shadow.querySelector<HTMLElement>('[part="sentinel"]')
    this.emptyEl = this.shadow.querySelector<HTMLElement>('[part="empty"]')
    this.emptyTextEl = this.shadow.querySelector<HTMLElement>('[part="empty-text"]')
    this.measureEl = this.shadow.querySelector<HTMLElement>('.measure')
    this.slotEl = this.shadow.querySelector<HTMLSlotElement>('slot.slot-source')
    this.emptySlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="empty"]')

    this.slotEl?.addEventListener('slotchange', this.onSlotChange)
    this.emptySlot?.addEventListener('slotchange', this.onSlotChange)
    this.gridEl?.addEventListener('click', this.onCardClick)
    this.gridEl?.addEventListener('keydown', this.onCardKeydown)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
    // 触底滚动 / 容器宽监听随首渲染挂载（断开经 disconnectedCallback 摘）
    this.bindLoadMoreListeners()
  }

  protected override onReconnect(): void {
    this.bind()
    this.bindLoadMoreListeners()
    this.watchHostSize()
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.unwatchHostSize()
    this.unbindLoadMoreListeners()
  }

  private readonly onSlotChange = (): void => {
    this.update()
  }

  /**
   * 插槽卡捕获：宿主节点会被搬进 shadow 列（瀑布流分列的通用做法），搬运引发的
   * slotchange（分配变空）不得回落 items 模式——以「已捕获且仍在组件内连接」判定保持；
   * 宿主真正移除内容（节点断连）或追加新内容（分配非空）时同步捕获集。
   */
  private captureSlotCards(): HTMLElement[] {
    const assigned = this.slotEl?.assignedElements({ flatten: true }) ?? []
    if (assigned.length > 0) {
      this.capturedCards = assigned.filter((n): n is HTMLElement => n instanceof HTMLElement)
    } else {
      this.capturedCards = this.capturedCards.filter((c) => c.isConnected && this.shadow.contains(c))
    }
    return this.capturedCards
  }

  // -------------------------------------------------------------------------
  // 渲染同步
  // -------------------------------------------------------------------------

  protected override update(): void {
    if (!this.gridEl) return
    if (this.wrapEl) this.wrapEl.setAttribute('aria-label', this.t('goodsList.label'))
    this.syncCards()
    this.syncMore()
    this.syncEmpty()
  }

  /** 卡片集：插槽优先，否则 items 内建卡；签名变化才重建列 */
  private syncCards(): void {
    const grid = this.gridEl
    if (!grid) return
    const slotted = this.captureSlotCards()
    const useSlot = slotted.length > 0
    const items = useSlot ? [] : this.parseItems()
    const layout = this.resolveLayout()
    const { columns, mode } =
      layout === 'list'
        ? { columns: 1, mode: 'fixed' as const }
        : resolveColumns(this.getAttr('columns'), grid.clientWidth)
    const signature = JSON.stringify([useSlot ? 'slot' : items.length, items, columns, layout])
    // auto 列数随容器宽变化需要重排：签名含 columns；列 DOM 数不匹配也要重建
    if (signature === this.cardsSignature && grid.childElementCount === columns) return
    this.cardsSignature = signature
    if (mode === 'auto') this.watchHostSize()
    else this.unwatchHostSize()

    // 阶段 1：收集卡片节点（插槽卡搬移 / items 内建卡新建），先进测量容器测高
    const cards: HTMLElement[] = []
    for (const node of slotted) cards.push(node as HTMLElement)
    items.forEach((item, index) => cards.push(this.buildCard(item, index)))
    const measure = this.measureEl
    if (measure) {
      measure.replaceChildren(...cards)
      // 与列容器同宽（瀑布流 gap 占位由 assignColumns 的高度口径天然容忍）
      if (measure.style.width !== '') measure.style.width = ''
    }

    // 阶段 2：按累计高度最短列放置（纯函数分配；未布局 / happy-dom 全 0 高度退化为轮转）
    const heights = cards.map((card) => card.offsetHeight)
    const assignment = assignColumns(heights, columns)
    const cols: HTMLElement[] = []
    for (let c = 0; c < columns; c++) {
      const col = document.createElement('div')
      col.className = 'col'
      col.setAttribute('part', 'col')
      col.setAttribute('role', 'presentation')
      cols.push(col)
    }
    assignment.forEach((colIndex, cardIndex) => cols[colIndex]?.appendChild(cards[cardIndex]!))
    grid.replaceChildren(...cols)
  }

  /** 内建简版卡（对齐 product-card 惯例：缺失图片占位 / 划线原价 / 两行截断标题） */
  private buildCard(item: GoodsItem, index: number): HTMLElement {
    const card = document.createElement('article')
    card.className = 'card'
    card.setAttribute('part', 'card')
    card.setAttribute('role', 'listitem')
    card.tabIndex = 0
    card.dataset.index = String(index)
    card.setAttribute('aria-label', item.title)

    const media = document.createElement('div')
    media.className = 'media'
    media.setAttribute('part', 'media')
    media.setAttribute('data-empty', String(!item.image))
    if (item.image) {
      const img = document.createElement('img')
      img.setAttribute('part', 'image')
      img.alt = item.title
      img.loading = 'lazy'
      img.setAttribute('src', item.image)
      const image = img
      image.addEventListener('error', () => {
        image.hidden = true
        media.setAttribute('data-empty', 'true')
      })
      media.appendChild(img)
    } else {
      // 占位框与 product-card 同口径：无可见文字（对比度），文字进 aria-label
      const ph = document.createElement('span')
      ph.className = 'placeholder'
      ph.setAttribute('part', 'placeholder')
      ph.setAttribute('role', 'img')
      ph.setAttribute('aria-label', this.t('goodsList.noImage'))
      media.appendChild(ph)
    }
    card.appendChild(media)

    const title = document.createElement('h3')
    title.className = 'title'
    title.setAttribute('part', 'title')
    title.textContent = item.title
    card.appendChild(title)

    const tags = item.tags ?? []
    const tagsBox = document.createElement('div')
    tagsBox.className = 'tags'
    tagsBox.setAttribute('part', 'tags')
    tagsBox.hidden = tags.length === 0
    for (const tag of tags) {
      const el = document.createElement('span')
      el.className = 'tag'
      el.setAttribute('part', 'tag')
      el.textContent = tag
      tagsBox.appendChild(el)
    }
    card.appendChild(tagsBox)

    const price = document.createElement('oas-price')
    price.className = 'price'
    price.setAttribute('part', 'price')
    if (item.price !== undefined && Number.isFinite(Number(item.price))) {
      price.setAttribute('value', String(item.price))
    }
    if (item.originalPrice !== undefined && Number.isFinite(Number(item.originalPrice))) {
      price.setAttribute('original', String(item.originalPrice))
    }
    const currency = this.getAttr('currency').trim()
    if (currency) price.setAttribute('currency', currency)
    const precision = this.getAttr('precision').trim()
    if (precision) price.setAttribute('precision', precision)
    const locale = this.getAttr('locale').trim()
    if (locale) price.setAttribute('locale', locale)
    card.appendChild(price)
    return card
  }

  /** 加载更多区：loading / no-more / 缺省（哨兵常驻）三态；空列表时整区隐藏 */
  private syncMore(): void {
    const more = this.moreEl
    if (!more) return
    const loading = this.hasAttr('loading')
    const noMore = this.hasAttr('no-more')
    const hasCards = this.captureSlotCards().length > 0 || this.parseItems().length > 0
    more.hidden = !hasCards
    if (this.spinnerEl) this.spinnerEl.hidden = !loading
    if (this.moreTextEl) {
      this.moreTextEl.textContent = loading ? this.t('goodsList.loading') : noMore ? this.t('goodsList.noMore') : ''
      this.moreTextEl.hidden = !loading && !noMore
    }
    // loading 置位 = 宿主应答本轮触底，解除待应答
    if (loading) this.loadPending = false
    this.checkLoadMore()
  }

  private syncEmpty(): void {
    const empty = this.emptyEl
    if (!empty) return
    const hasCards = this.captureSlotCards().length > 0 || this.parseItems().length > 0
    empty.hidden = hasCards
    const hasSlot = this.hasSlotContent(this.emptySlot)
    // fallback 文案走独立 span（不覆盖 empty 插槽的分配通道）
    if (this.emptyTextEl) {
      this.emptyTextEl.hidden = hasSlot
      this.emptyTextEl.textContent = hasSlot ? '' : this.t('goodsList.empty')
    }
  }

  private hasSlotContent(slot: HTMLSlotElement | null): boolean {
    return (
      slot
        ?.assignedNodes()
        .some((node) => (node.textContent ?? '').trim() !== '' || node.nodeType === Node.ELEMENT_NODE) ?? false
    )
  }

  // -------------------------------------------------------------------------
  // 加载更多（触底）
  // -------------------------------------------------------------------------

  /** 检查哨兵可见性：rAF 节流由监听端承担，这里做纯判定 + 派发（空列表不触发） */
  private checkLoadMore(): void {
    const sentinel = this.sentinelEl
    if (!sentinel) return
    const hasCards = this.captureSlotCards().length > 0 || this.parseItems().length > 0
    if (!hasCards) return
    const rect = sentinel.getBoundingClientRect()
    const state = {
      loading: this.hasAttr('loading'),
      noMore: this.hasAttr('no-more'),
      pending: this.loadPending,
    }
    if (!shouldRequestMore(rect.top, window.innerHeight, state)) return
    this.loadPending = true
    this.emit('load-more', {})
  }

  /** 容器宽变化（auto 列数重排）+ 触底检查的滚动监听（document capture 捕获子容器滚动） */
  private resizeObserver: ResizeObserver | null = null

  private readonly onScrollOrResize = (): void => {
    if (this.scrollRaf) return
    this.scrollRaf = requestAnimationFrame(() => {
      this.scrollRaf = 0
      this.checkLoadMore()
    })
  }

  /** 全局监听（滚动触底 + 容器宽自适应）：连接 / 重连时挂，断开时经 onCleanup 摘 */
  private bindLoadMoreListeners(): void {
    document.addEventListener('scroll', this.onScrollOrResize, { capture: true, passive: true })
    window.addEventListener('resize', this.onScrollOrResize)
    this.onCleanup(() => this.unbindLoadMoreListeners())
  }

  private unbindLoadMoreListeners(): void {
    document.removeEventListener('scroll', this.onScrollOrResize, { capture: true })
    window.removeEventListener('resize', this.onScrollOrResize)
    if (this.scrollRaf) {
      cancelAnimationFrame(this.scrollRaf)
      this.scrollRaf = 0
    }
  }

  private watchHostSize(): void {
    if (this.resizeObserver || typeof ResizeObserver === 'undefined') return
    // auto 列数跟随容器宽变化重排（签名含列数，宽度跨断点时重建列）
    this.resizeObserver = new ResizeObserver(() => this.update())
    this.resizeObserver.observe(this)
  }

  private unwatchHostSize(): void {
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
  }

  // -------------------------------------------------------------------------
  // 交互
  // -------------------------------------------------------------------------

  private readonly onCardClick = (e: MouseEvent): void => {
    const card = (e.target as Element | null)?.closest<HTMLElement>('[part="card"]')
    if (!card || !card.dataset.index) return
    this.emitItemClick(card)
  }

  private readonly onCardKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter') return
    const card = (e.target as Element | null)?.closest<HTMLElement>('[part="card"]')
    if (!card || !card.dataset.index) return
    e.preventDefault()
    this.emitItemClick(card)
  }

  private emitItemClick(card: HTMLElement): void {
    const index = Number(card.dataset.index)
    const items = this.parseItems()
    if (!Number.isInteger(index) || index < 0 || index >= items.length) return
    this.emit('item-click', { index, item: items[index]! } satisfies GoodsItemClickDetail)
  }
}
