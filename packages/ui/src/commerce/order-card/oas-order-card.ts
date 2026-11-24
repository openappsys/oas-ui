import { OASElement } from '@oas-ui/core/oas-element'
import { chevronDownPath } from '@oas-ui/icons/icons/chevron-down'
import { devWarn } from '../../shared/dev-warn.js'
import { parseJsonArray } from '../../shared/json-array.js'
import { stableHash36 } from '../../shared/stable-id.js'
import '../price/index.js'

/**
 * oas-order-card —— 订单卡片（commerce 族）。
 *
 * 订单列表 / 订单详情页的高频卡：头部（订单号 + 状态徽标）+ 条目摘要（图 + 名 + 规格 × 数量）+
 * 金额区（实付 / 划线原价 / 已优惠）+ 可折叠明细（`details` 插槽）+ 操作按钮区（`actions` 插槽）。
 * 状态徽标的文案与色语义由 `status-map` 声明，宿主可完整接管；未声明时回落原始 `status` 文本 + 中性色。
 *
 * 属性（kebab-case）：
 * - `order-id`：订单号（头部展示；缺省不渲染该位置）
 * - `status`：状态键（查 `status-map`）
 * - `status-map`：JSON 对象 `{ "<statusKey>": { label, tone } }`，也接受简写 `{ "<statusKey>": "文案" }`
 *   - `tone`：`default`（缺省）/ `primary` / `success` / `warning` / `danger`
 * - `items`：JSON 数组 `[{ image?, title, spec?, quantity? }]`（条目摘要；`quantity` 缺省 1）
 * - `payable`：实付金额（非负数值；缺省不渲染金额区）
 * - `original`：优惠前金额（划线展示，交给内嵌 `oas-price` 的 `original` 通道）
 * - `discount`：已优惠金额（负数不渲染；连同 i18n `orderCard.discount` 文案展示）
 * - `currency`：ISO 4217 币种，默认 `CNY`
 * - `locale`：金额格式化 locale；缺省取文档 `<html lang>`，再退回 `zh-CN`
 * - `precision`：金额小数位，默认 2
 * - `expandable`：启用「展开明细」开关（`details` 插槽有内容时才渲染按钮）
 * - `expanded`：明细展开态（用户点击后组件回写该属性；受控宿主按需改写）
 *
 * property 通道：`items` / `statusMap` 为读+写访问器（setter 接受对象/数组或 JSON 字符串并反射 attribute）。
 *
 * 插槽：
 * - `actions`：操作按钮区（付款 / 查看物流 / 再次购买等，宿主放 `oas-button`）
 * - `details`：展开明细内容（订单号、下单时间、收货信息等；无内容时展开按钮不渲染）
 *
 * 事件（bubbles + composed）：
 * - `oas-toggle`：展开态变化后派发，detail `{ expanded, orderId }`（用户点击 → 组件回写 `expanded`；
 *   宿主变更 `expanded` 属性不派发该事件）
 *
 * a11y：`<article>` + 状态徽标文本（颜色不承载唯一语义）；展开按钮原生 `<button>`，带
 * `aria-expanded` 与 `aria-controls`（指向明细区，id 由订单号派生、shadow 内唯一）；金额区语义连贯。
 * 布局走逻辑属性（RTL 安全），颜色全走 token（徽标底色为语义色与页面底的 `color-mix` 淡底）。
 */

export interface OrderCardItem {
  image?: string
  title: string
  spec?: string
  quantity?: number
}

export type OrderStatusTone = 'default' | 'primary' | 'success' | 'warning' | 'danger'

export interface OrderStatusStyle {
  label?: string
  tone?: OrderStatusTone
}

export type OrderStatusMap = Record<string, OrderStatusStyle | string>

export interface OrderToggleDetail {
  expanded: boolean
  orderId: string
}

const TONES: readonly string[] = ['default', 'primary', 'success', 'warning', 'danger']
const DEFAULT_PRECISION = 2
const MAX_PRECISION = 20

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.card {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
  box-sizing: border-box;
  padding: var(--oas-space-4);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg);
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-3);
  min-width: 0;
}
.order-id {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.order-id[hidden] {
  display: none;
}
/* 徽标底色 = 语义色与页面底的 12% 淡底；文字用 -text 深档再向 text-primary 压 12%
   （light 压深、dark 提亮，两档都朝对比增大方向）—— 单用 -text 落在淡底上只有 4.14–4.42，
   小字号不达 AA；混色后 light 4.94–6.89 / dark 8.38–9.27 */
.status {
  display: inline-flex;
  align-items: center;
  flex: none;
  padding-block: var(--oas-space-1);
  padding-inline: var(--oas-space-2);
  border-radius: var(--oas-radius-full, 999px);
  background: var(--oas-color-bg-hover);
  color: color-mix(in srgb, var(--oas-color-text-secondary) 88%, var(--oas-color-text-primary));
  font-size: var(--oas-font-size-xs);
  line-height: 1.4;
  white-space: nowrap;
}
.status[hidden] {
  display: none;
}
.status[data-tone='primary'] {
  background: color-mix(in srgb, var(--oas-color-primary) 12%, var(--oas-color-bg));
  color: color-mix(in srgb, var(--oas-color-primary-text) 88%, var(--oas-color-text-primary));
}
.status[data-tone='success'] {
  background: color-mix(in srgb, var(--oas-color-success) 12%, var(--oas-color-bg));
  color: color-mix(in srgb, var(--oas-color-success-text) 88%, var(--oas-color-text-primary));
}
.status[data-tone='warning'] {
  background: color-mix(in srgb, var(--oas-color-warning) 12%, var(--oas-color-bg));
  color: color-mix(in srgb, var(--oas-color-warning-text) 88%, var(--oas-color-text-primary));
}
.status[data-tone='danger'] {
  background: color-mix(in srgb, var(--oas-color-danger) 12%, var(--oas-color-bg));
  color: color-mix(in srgb, var(--oas-color-danger-text) 88%, var(--oas-color-text-primary));
}
.items {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}
.items[hidden] {
  display: none;
}
.item {
  display: flex;
  align-items: center;
  gap: var(--oas-space-3);
  min-width: 0;
}
.thumb {
  display: flex;
  flex: none;
  width: 48px;
  height: 48px;
  overflow: hidden;
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-hover);
}
.thumb[data-empty='true'] {
  border: 1px dashed var(--oas-color-border);
}
.thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumb img[hidden] {
  display: none;
}
.info {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  flex: 1 1 auto;
  min-width: 0;
}
.item-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-primary);
}
.item-spec {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.item-spec[hidden] {
  display: none;
}
.item-qty {
  flex: none;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  font-variant-numeric: tabular-nums;
}
.empty {
  margin: 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.empty[hidden] {
  display: none;
}
.amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--oas-space-1);
  padding-block-start: var(--oas-space-2);
  border-block-start: 1px solid var(--oas-color-border);
}
.amount[hidden] {
  display: none;
}
.discount {
  display: inline-flex;
  align-items: baseline;
  gap: var(--oas-space-2);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.discount[hidden] {
  display: none;
}
.payable {
  display: inline-flex;
  align-items: baseline;
  gap: var(--oas-space-2);
}
.payable[hidden] {
  display: none;
}
.payable-label {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.details {
  padding-block-start: var(--oas-space-2);
  border-block-start: 1px solid var(--oas-color-border);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.details[hidden] {
  display: none;
}
.foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: var(--oas-space-2) var(--oas-space-3);
}
.toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  flex: none;
  margin: 0;
  margin-inline-end: auto;
  padding: var(--oas-space-1) var(--oas-space-2);
  border: none;
  border-radius: var(--oas-radius-sm);
  background: none;
  color: var(--oas-color-text-secondary);
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
}
.toggle:hover {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
.toggle:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.toggle[hidden] {
  display: none;
}
.caret {
  width: 1em;
  height: 1em;
  fill: currentColor;
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
}
.toggle[aria-expanded='true'] .caret {
  transform: rotate(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .caret {
    transition: none;
  }
}

@media (forced-colors: active) {
  .toggle:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 2px;
    box-shadow: none;
  }
  .status {
    border: 1px solid CanvasText;
  }
}
`

export class OASOrderCard extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'order-id',
      'status',
      'status-map',
      'items',
      'payable',
      'original',
      'discount',
      'currency',
      'locale',
      'precision',
      'expandable',
      'expanded',
    ]
  }

  private cardEl: HTMLElement | null = null
  private orderIdEl: HTMLElement | null = null
  private statusEl: HTMLElement | null = null
  private itemsEl: HTMLElement | null = null
  private emptyEl: HTMLElement | null = null
  private amountEl: HTMLElement | null = null
  private discountEl: HTMLElement | null = null
  private discountLabelEl: HTMLElement | null = null
  private discountPriceEl: HTMLElement | null = null
  private payableEl: HTMLElement | null = null
  private payableLabelEl: HTMLElement | null = null
  private payablePriceEl: HTMLElement | null = null
  private detailsEl: HTMLElement | null = null
  private toggleEl: HTMLButtonElement | null = null
  private toggleTextEl: HTMLElement | null = null
  private detailsSlot: HTMLSlotElement | null = null

  private warnedStatusMap = false
  private warnedTone = false
  /** 条目列表渲染签名（items + currency/precision/locale） */
  private itemsSignature = ''

  // -------------------------------------------------------------------------
  // property 通道
  // -------------------------------------------------------------------------

  /**
   * @apiProperty 订单条目摘要：get+set 双通道（数组或 JSON 字符串），赋值即生效不派发事件
   */
  get items(): OrderCardItem[] {
    return this.parseItems()
  }

  set items(value: OrderCardItem[] | string) {
    this.setAttribute('items', typeof value === 'string' ? value : JSON.stringify(value ?? []))
  }

  /**
   * @apiProperty 状态语义映射：get+set 双通道（对象或 JSON 字符串），值支持 `{ label, tone }` 与字符串简写
   */
  get statusMap(): OrderStatusMap {
    return this.parseStatusMap()
  }

  set statusMap(value: OrderStatusMap | string) {
    this.setAttribute('status-map', typeof value === 'string' ? value : JSON.stringify(value ?? {}))
  }

  private template(): string {
    return `
      <style>${STYLE}</style>
      <article class="card" part="card">
        <header class="head" part="head">
          <span class="order-id" part="order-id" hidden></span>
          <span class="status" part="status" hidden></span>
        </header>
        <ul class="items" part="items"></ul>
        <p class="empty" part="empty" hidden></p>
        <div class="amount" part="amount" hidden>
          <span class="discount" part="discount" hidden>
            <span class="discount-label" part="discount-label"></span>
            <oas-price class="discount-price" part="discount-price" size="sm"></oas-price>
          </span>
          <span class="payable" part="payable" hidden>
            <span class="payable-label" part="payable-label"></span>
            <oas-price class="payable-price" part="payable-price" size="md"></oas-price>
          </span>
        </div>
        <div class="details" part="details" hidden><slot name="details"></slot></div>
        <footer class="foot" part="foot">
          <button class="toggle" part="toggle" type="button" aria-expanded="false" hidden>
            <span class="toggle-text" part="toggle-text"></span>
            <svg class="caret" viewBox="0 0 16 16" aria-hidden="true" focusable="false">${chevronDownPath}</svg>
          </button>
          <slot name="actions"></slot>
        </footer>
      </article>
    `
  }

  private bind(): void {
    this.cardEl = this.shadow.querySelector<HTMLElement>('[part="card"]')
    this.orderIdEl = this.shadow.querySelector<HTMLElement>('[part="order-id"]')
    this.statusEl = this.shadow.querySelector<HTMLElement>('[part="status"]')
    this.itemsEl = this.shadow.querySelector<HTMLElement>('[part="items"]')
    this.emptyEl = this.shadow.querySelector<HTMLElement>('[part="empty"]')
    this.amountEl = this.shadow.querySelector<HTMLElement>('[part="amount"]')
    this.discountEl = this.shadow.querySelector<HTMLElement>('[part="discount"]')
    this.discountLabelEl = this.shadow.querySelector<HTMLElement>('[part="discount-label"]')
    this.discountPriceEl = this.shadow.querySelector<HTMLElement>('[part="discount-price"]')
    this.payableEl = this.shadow.querySelector<HTMLElement>('[part="payable"]')
    this.payableLabelEl = this.shadow.querySelector<HTMLElement>('[part="payable-label"]')
    this.payablePriceEl = this.shadow.querySelector<HTMLElement>('[part="payable-price"]')
    this.detailsEl = this.shadow.querySelector<HTMLElement>('[part="details"]')
    this.toggleEl = this.shadow.querySelector<HTMLButtonElement>('[part="toggle"]')
    this.toggleTextEl = this.shadow.querySelector<HTMLElement>('[part="toggle-text"]')
    this.detailsSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="details"]')

    this.toggleEl?.addEventListener('click', this.onToggle)
    this.detailsSlot?.addEventListener('slotchange', this.onSlotChange)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override onReconnect(): void {
    this.bind()
  }

  private onSlotChange = (): void => {
    this.update()
  }

  // -------------------------------------------------------------------------
  // 数据解析
  // -------------------------------------------------------------------------

  private parseItems(): OrderCardItem[] {
    return parseJsonArray<OrderCardItem>(this.getAttr('items'), () =>
      devWarn('[oas-order-card] items 不是合法 JSON 数组，已忽略'),
    ).filter((item): item is OrderCardItem => {
      if (typeof item !== 'object' || item === null) return false
      return typeof (item as OrderCardItem).title === 'string' && (item as OrderCardItem).title !== ''
    })
  }

  private parseStatusMap(): OrderStatusMap {
    const raw = this.getAttr('status-map').trim()
    if (raw === '') return {}
    try {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as OrderStatusMap
    } catch {
      // 落到下方统一告警
    }
    if (!this.warnedStatusMap) {
      this.warnedStatusMap = true
      devWarn('[oas-order-card] status-map 不是合法 JSON 对象，已忽略（状态徽标回落原始 status 文本）')
    }
    return {}
  }

  private resolvePrecision(): number {
    const raw = this.getAttr('precision').trim()
    if (raw === '') return DEFAULT_PRECISION
    const n = Number(raw)
    return Number.isInteger(n) && n >= 0 && n <= MAX_PRECISION ? n : DEFAULT_PRECISION
  }

  private resolveAmount(name: string): number | null {
    const raw = this.getAttr(name).trim()
    if (raw === '') return null
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : null
  }

  // -------------------------------------------------------------------------
  // 渲染
  // -------------------------------------------------------------------------

  protected override update(): void {
    if (!this.cardEl) return
    const orderId = this.getAttr('order-id').trim()
    if (orderId === '') this.cardEl.removeAttribute('aria-label')
    else this.cardEl.setAttribute('aria-label', orderId)

    if (this.orderIdEl) {
      this.orderIdEl.textContent = orderId
      this.orderIdEl.hidden = orderId === ''
    }

    this.syncStatus()
    this.syncItems()
    this.syncAmount()
    this.syncDetails()
  }

  private syncStatus(): void {
    const status = this.getAttr('status').trim()
    if (!this.statusEl) return
    if (status === '') {
      this.statusEl.hidden = true
      this.statusEl.textContent = ''
      return
    }
    const entry = this.parseStatusMap()[status]
    const label = typeof entry === 'string' ? entry : (entry?.label ?? status)
    const tone = typeof entry === 'string' ? 'default' : this.resolveTone(entry?.tone)
    this.statusEl.hidden = false
    this.statusEl.textContent = label
    this.statusEl.setAttribute('data-tone', tone)
  }

  private resolveTone(raw: OrderStatusTone | undefined): OrderStatusTone {
    if (raw === undefined) return 'default'
    if (TONES.includes(raw)) return raw
    if (!this.warnedTone) {
      this.warnedTone = true
      devWarn(`[oas-order-card] status-map tone "${raw}" 非法（${TONES.join(' / ')}），已回落 default`)
    }
    return 'default'
  }

  private syncItems(): void {
    const list = this.itemsEl
    if (!list) return
    const items = this.parseItems()
    const signature = JSON.stringify(items)
    if (signature !== this.itemsSignature) {
      list.replaceChildren(...items.map((item) => this.buildItem(item)))
      this.itemsSignature = signature
    }
    list.hidden = items.length === 0
    if (this.emptyEl) {
      this.emptyEl.hidden = items.length > 0
      this.emptyEl.textContent = items.length === 0 ? this.t('orderCard.empty') : ''
    }
  }

  private buildItem(item: OrderCardItem): HTMLLIElement {
    const li = document.createElement('li')
    li.className = 'item'
    li.setAttribute('part', 'item')

    const thumb = document.createElement('span')
    thumb.className = 'thumb'
    thumb.setAttribute('part', 'thumb')
    let img: HTMLImageElement | null = null
    if (item.image) {
      img = document.createElement('img')
      img.setAttribute('part', 'image')
      img.alt = ''
      img.loading = 'lazy'
      img.setAttribute('src', item.image)
      const image = img
      image.addEventListener('error', () => {
        image.hidden = true
        thumb.setAttribute('data-empty', 'true')
      })
      thumb.appendChild(img)
    }
    thumb.setAttribute('data-empty', String(!item.image))

    const info = document.createElement('span')
    info.className = 'info'
    info.setAttribute('part', 'item-info')
    const title = document.createElement('span')
    title.className = 'item-title'
    title.setAttribute('part', 'item-title')
    title.textContent = item.title
    const spec = document.createElement('span')
    spec.className = 'item-spec'
    spec.setAttribute('part', 'item-spec')
    spec.textContent = item.spec ?? ''
    spec.hidden = !item.spec
    info.append(title, spec)

    const quantity = Number(item.quantity)
    const qty = Number.isFinite(quantity) && quantity >= 1 ? Math.floor(quantity) : 1
    const qtyEl = document.createElement('span')
    qtyEl.className = 'item-qty'
    qtyEl.setAttribute('part', 'item-quantity')
    qtyEl.textContent = `×${qty}`

    li.append(thumb, info, qtyEl)
    return li
  }

  private syncAmount(): void {
    const payable = this.resolveAmount('payable')
    const original = this.resolveAmount('original')
    const discount = this.resolveAmount('discount')
    const currency = this.getAttr('currency', 'CNY')
    const locale = this.getAttr('locale').trim()
    const precision = String(this.resolvePrecision())

    // original 只经 payable 通道渲染（划线原价），自身无独立出口——
    // 只设 original 不设 payable 时容器必须隐藏，否则渲染出只有边框内距的空壳条
    if (this.amountEl) this.amountEl.hidden = payable === null && discount === null

    if (this.discountEl && this.discountPriceEl) {
      this.discountEl.hidden = discount === null
      if (discount !== null) {
        if (this.discountLabelEl) this.discountLabelEl.textContent = this.t('orderCard.discount')
        this.discountPriceEl.setAttribute('value', String(discount))
        this.discountPriceEl.setAttribute('currency', currency)
        this.discountPriceEl.setAttribute('precision', precision)
        if (locale) this.discountPriceEl.setAttribute('locale', locale)
        else this.discountPriceEl.removeAttribute('locale')
      }
    }

    if (this.payableEl && this.payablePriceEl) {
      this.payableEl.hidden = payable === null
      if (payable !== null) {
        if (this.payableLabelEl) this.payableLabelEl.textContent = this.t('orderCard.payable')
        this.payablePriceEl.setAttribute('value', String(payable))
        this.payablePriceEl.setAttribute('currency', currency)
        this.payablePriceEl.setAttribute('precision', precision)
        if (original !== null) this.payablePriceEl.setAttribute('original', String(original))
        else this.payablePriceEl.removeAttribute('original')
        if (locale) this.payablePriceEl.setAttribute('locale', locale)
        else this.payablePriceEl.removeAttribute('locale')
      }
    }
  }

  private syncDetails(): void {
    const expandable = this.hasAttr('expandable')
    const hasDetails = this.hasDetailsContent()
    const expanded = expandable && this.hasAttr('expanded')
    if (this.detailsEl) this.detailsEl.hidden = !expanded
    if (!this.toggleEl) return
    const show = expandable && hasDetails
    this.toggleEl.hidden = !show
    if (!show) {
      this.toggleEl.setAttribute('aria-expanded', 'false')
      return
    }
    this.toggleEl.setAttribute('aria-expanded', String(expanded))
    const detailsId = `oas-order-card-${this.uid()}-details`
    if (this.detailsEl) {
      this.detailsEl.id = detailsId
      this.toggleEl.setAttribute('aria-controls', detailsId)
    }
    if (this.toggleTextEl)
      this.toggleTextEl.textContent = expanded ? this.t('orderCard.collapse') : this.t('orderCard.expand')
  }

  private uid(): string {
    return stableHash36(`${this.getAttr('order-id')}|${this.getAttr('items')}`)
  }

  private hasDetailsContent(): boolean {
    const nodes = this.detailsSlot?.assignedNodes() ?? []
    return nodes.some((node) => (node.textContent ?? '').trim() !== '' || node.nodeType === Node.ELEMENT_NODE)
  }

  private onToggle = (): void => {
    if (!this.hasAttr('expandable')) return
    const expanded = !this.hasAttr('expanded')
    if (expanded) this.setAttribute('expanded', '')
    else this.removeAttribute('expanded')
    this.emit('toggle', { expanded, orderId: this.getAttr('order-id') } satisfies OrderToggleDetail)
  }
}
