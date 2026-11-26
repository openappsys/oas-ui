import { OASElement } from '@oas-ui/core/oas-element'
import { closePath } from '@oas-ui/icons/icons/close'
import { minusPath } from '@oas-ui/icons/icons/minus'
import { plusPath } from '@oas-ui/icons/icons/plus'
import { devWarn } from '../../shared/dev-warn.js'
import { isRtl } from '../../shared/direction.js'
import { parseJsonArray } from '../../shared/json-array.js'
import '../price/index.js'

/**
 * oas-cart —— 购物车列表（commerce 族）。
 *
 * 交易链路的核心列表件：条目行选择 + 数量步进（内建钳制）+ 删除（按钮 / 滑动）+ 全选联动 +
 * 选中合计。数据由 `items` JSON 驱动（attribute / property 双通道），用户交互后组件把结果
 * 回写 `items` 并派发 `oas-change`——非受控用法开箱即用；受控宿主忽略回写、按自己的状态
 * 重新赋 `items` 即可。
 *
 * 属性（kebab-case）：
 * - `items`：JSON 数组 `[{ id, image?, title, spec?, price, quantity?, selected?, maxQuantity?, disabled? }]`
 *   - `id`：条目唯一键（缺失的条目被忽略）
 *   - `price`：单价（非负数值）；非法值按 0 计并告警一次
 *   - `quantity`：数量（整数，缺省 1；低于 1 钳到 1，超过 `maxQuantity` 钳到上限）
 *   - `selected`：是否选中（缺省 false；`disabled` 条目恒不选中、不计合计）
 *   - `maxQuantity`：数量上限（≥1 的整数；非法值忽略并告警一次）
 *   - `disabled`：条目禁用（灰显、不可勾选 / 改数量、不计合计；**仍可删除**——失效商品需要能清掉）
 * - `currency`：ISO 4217 币种，默认 `CNY`（透传内嵌 `oas-price`）
 * - `locale`：金额格式化 locale；缺省取文档 `<html lang>`，再退回 `zh-CN`
 * - `precision`：金额小数位，默认 2（合计按此精度收敛后回传 detail）
 * - `disabled`：整体禁用（兼容 config-provider 注入禁用）
 * - `delete-mode`：删除交互形态——`button`（缺省，行尾删除钮）/ `swipe`（向行首拖出删除钮）/
 *   `none`（不可删除）；非法值回落 `button` 并告警一次
 *
 * property 通道：`items` 为读+写访问器（setter 接受数组或 JSON 字符串并反射 attribute）。
 *
 * 插槽：
 * - `empty`：空态内容（缺省渲染 i18n `cart.empty` 文案）
 * - `actions`：合计行右侧扩展位（结算按钮、优惠入口等；空购物车时整行不渲染）
 *
 * 事件（bubbles + composed）：
 * - `oas-change`：勾选 / 全选 / 改数量 / 删除后派发，detail `{ items, total, selectedCount, allSelected, indeterminate }`
 * - `oas-remove`：删除前派发（**cancelable**）——`preventDefault()` 即取消本次删除（宿主据此接确认框），
 *   detail `{ item, items, total, selectedCount }`（`items` 为删除后的列表）
 * - `oas-item-click`：点击条目主体（标题 / 规格 / 价格区）派发，detail `{ id, item }`，宿主据此进详情
 *
 * 与结算件组合：本组件只管列表与小计，结算按钮放 `actions` 插槽——`total` 取 `oas-change` 的
 * detail.total 交给 `oas-submit-bar`，或底部导航交给 `oas-goods-action`。
 *
 * a11y：`<ul>` 列表 + 原生 checkbox；全选框用 `indeterminate` 表达半选；合计区 `aria-live="polite"`；
 * 数量输入与步进钮带含商品名的可访问名；滑动删除钮始终在 Tab 序（获得焦点时自动露出，键盘可达）。
 * 样式走逻辑属性（RTL 安全），颜色全走 token。
 */

export interface CartItem {
  id: string
  title: string
  price: number | string
  quantity?: number
  image?: string
  spec?: string
  selected?: boolean
  maxQuantity?: number
  disabled?: boolean
}

/** 快照条目：宿主原有字段保留，`quantity` / `selected` 为归一后的生效值 */
export type CartItemsSnapshot = CartItem[]

export interface CartChangeDetail {
  items: CartItemsSnapshot
  /** 选中条目合计（按 precision 收敛） */
  total: number
  selectedCount: number
  allSelected: boolean
  /** 部分选中（非全选且至少一项选中） */
  indeterminate: boolean
}

export interface CartRemoveDetail {
  item: CartItem
  /** 删除后的条目列表 */
  items: CartItemsSnapshot
  total: number
  selectedCount: number
}

export interface CartItemClickDetail {
  id: string
  item: CartItem
}

export type CartDeleteMode = 'button' | 'swipe' | 'none'

const DELETE_MODES: readonly string[] = ['button', 'swipe', 'none']
const DEFAULT_PRECISION = 2
const MAX_PRECISION = 20
/** 滑动露出的删除钮宽度（px）：拖过一半即吸附展开 */
const SWIPE_REVEAL = 72
/** 判定「这是一次滑动而非点击」的水平位移阈值（px） */
const SWIPE_SLOP = 4

/** 失败图片记忆键：id + src——同 id 换新图 URL 时应重试加载，不沿用旧失败记录 */
const imageFailKey = (id: string, src: string): string => `${id}\n${src}`

/** 归一后的行数据（渲染与事件共用同一份） */
interface CartRow {
  item: CartItem
  price: number
  quantity: number
  selected: boolean
  disabled: boolean
  max: number | null
}

interface CartRowRefs {
  root: HTMLLIElement
  inner: HTMLElement
  thumb: HTMLElement
  img: HTMLImageElement | null
  check: HTMLInputElement
  body: HTMLButtonElement
  title: HTMLElement
  spec: HTMLElement
  price: HTMLElement
  qty: HTMLInputElement
  minus: HTMLButtonElement
  plus: HTMLButtonElement
  remove: HTMLButtonElement | null
  swipeRemove: HTMLButtonElement | null
}

/**
 * 滑动落位计算（纯函数，供单测覆盖吸附/回弹/关闭三态）：
 * - LTR 向行首（屏幕左）拖出删除钮（位移取负），RTL 反向
 * - `open` 为手势开始时的吸附态：已展开时反向拖回可关闭
 * - 越过 `reveal / 2` 吸附展开，否则回弹关闭
 */
export function resolveSwipeOffset(input: { dx: number; open: boolean; reveal: number; rtl: boolean }): {
  offset: number
  open: boolean
} {
  const { dx, open, reveal, rtl } = input
  const sign = rtl ? 1 : -1
  const base = open ? reveal : 0
  const amount = Math.max(0, Math.min(reveal, base + sign * dx))
  // amount 为 0 时统一返回 +0（避免 -0 进入 transform 产生 "-0px"）
  return { offset: amount === 0 ? 0 : sign * amount, open: amount >= reveal / 2 }
}

/**
 * 松手落定：过半吸附到完全露出（sign×reveal），未过半回弹关闭（0）。
 * 与跟手 `resolveSwipeOffset` 分离——落定值取吸附/回弹终点，
 * 不取 clamp 跟手值（否则拖到一半松手会停半路：过半时删除钮半露、未过半时不回弹）。
 */
export function resolveSwipeSettle(input: { open: boolean; reveal: number; rtl: boolean }): number {
  const sign = input.rtl ? 1 : -1
  return input.open ? sign * input.reveal : 0
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.root {
  display: flex;
  flex-direction: column;
  background: var(--oas-color-bg);
}
.list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.list[hidden] {
  display: none;
}
.item {
  position: relative;
  display: flex;
  align-items: stretch;
  overflow: hidden;
  background: var(--oas-color-bg);
}
.item + .item {
  border-block-start: 1px solid var(--oas-color-border);
}
/* 内容层用两行网格：第一行 = 勾选 / 图 / 文本 / 删除，第二行 = 数量步进（贴行尾）。
   单行 flex 在窄宿主（≈250px）会把删除钮挤到下一行、留一个孤零零的 ×——网格不随宽度塌陷 */
.inner {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  grid-template-areas:
    'check thumb body remove'
    'check thumb stepper stepper';
  align-items: center;
  column-gap: var(--oas-space-2);
  row-gap: var(--oas-space-1);
  flex: 1 1 auto;
  min-width: 0;
  padding-block: var(--oas-space-3);
  background: var(--oas-color-bg);
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
}
.inner[data-swipeable='true'] {
  touch-action: pan-y;
}
.inner[data-dragging='true'] {
  transition: none;
}
.check {
  grid-area: check;
  margin: 0;
  accent-color: var(--oas-color-primary);
  cursor: pointer;
}
.check:disabled {
  cursor: not-allowed;
}
.thumb {
  display: flex;
  grid-area: thumb;
  align-self: start;
  width: 56px;
  height: 56px;
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
  /* 图片处在滑动删除的手势面上：禁原生拖拽与文本选择，避免 dragstart / 选区抢走指针 */
  -webkit-user-drag: none;
  user-select: none;
}
.thumb img[hidden] {
  display: none;
}
.body {
  display: flex;
  grid-area: body;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--oas-space-1);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: var(--oas-radius-sm);
  background: none;
  color: inherit;
  font-family: inherit;
  text-align: start;
  cursor: pointer;
}
.body:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
  overflow-wrap: anywhere;
  transition: color var(--oas-transition-fast) var(--oas-ease-out);
}
.body:hover .title {
  color: var(--oas-color-primary-text);
}
.item[data-disabled='true'] .title {
  color: var(--oas-color-text-secondary);
}
.spec {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.spec[hidden] {
  display: none;
}
.price {
  font-size: var(--oas-font-size-sm);
}
/* 条目级禁用：标题与单价降到 text-secondary（≈4.84:1 仍达 AA）——用 text-disabled 会掉到 2.56，
   而这一行不在 <button disabled> 语义里，axe 会真判低对比 */
.item[data-disabled='true'] .price {
  --oas-price-color: var(--oas-color-text-secondary);
}
.stepper {
  display: inline-flex;
  grid-area: stepper;
  align-items: stretch;
  justify-self: end;
  overflow: hidden;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
}
.step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--oas-control-height-md, 32px);
  min-height: var(--oas-control-height-md, 32px);
  margin: 0;
  padding: 0;
  border: none;
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-md);
  line-height: 1;
  cursor: pointer;
}
.step:hover:not(:disabled) {
  background: var(--oas-color-bg-hover);
}
.step:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.step:disabled {
  color: var(--oas-color-text-disabled);
  cursor: not-allowed;
}
.step svg {
  width: 1em;
  height: 1em;
  fill: currentColor;
}
.qty {
  width: 36px;
  min-height: var(--oas-control-height-md, 32px);
  margin: 0;
  padding: 0 var(--oas-space-1);
  border: none;
  border-inline: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-md);
  text-align: center;
  -moz-appearance: textfield;
  appearance: textfield;
}
.qty:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.qty:disabled {
  color: var(--oas-color-text-disabled);
  background: var(--oas-color-bg-disabled);
  cursor: not-allowed;
}
.qty::-webkit-outer-spin-button,
.qty::-webkit-inner-spin-button {
  margin: 0;
  -webkit-appearance: none;
  appearance: none;
}
.remove {
  display: inline-flex;
  grid-area: remove;
  align-items: center;
  justify-content: center;
  justify-self: end;
  width: 24px;
  min-height: 24px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: var(--oas-radius-sm);
  background: none;
  color: var(--oas-color-text-secondary);
  font-family: inherit;
  font-size: var(--oas-font-size-md);
  line-height: 1;
  cursor: pointer;
}
.remove:hover:not(:disabled) {
  background: var(--oas-color-danger-soft);
  color: var(--oas-color-danger-text);
}
.remove:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.remove svg {
  width: 1em;
  height: 1em;
  fill: currentColor;
}
.remove:disabled {
  color: var(--oas-color-text-disabled);
  cursor: not-allowed;
}
.swipe-remove {
  position: absolute;
  z-index: 0;
  inset-block: 0;
  inset-inline-end: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  padding: 0 var(--oas-space-2);
  border: none;
  background: var(--oas-color-danger);
  color: var(--oas-color-bg);
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  white-space: nowrap;
  cursor: pointer;
}
.swipe-remove:focus-visible {
  outline: 2px solid var(--oas-color-bg);
  outline-offset: -4px;
}
.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-block: var(--oas-space-6);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.empty[hidden] {
  display: none;
}
.summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--oas-space-2) var(--oas-space-3);
  padding-block: var(--oas-space-3);
  border-block-start: 1px solid var(--oas-color-border);
}
.summary[hidden] {
  display: none;
}
.all {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
}
.all[data-disabled='true'] {
  color: var(--oas-color-text-disabled);
  cursor: not-allowed;
}
.all-check {
  margin: 0;
  accent-color: var(--oas-color-primary);
  cursor: inherit;
}
.count {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.count[hidden] {
  display: none;
}
.subtotal {
  display: inline-flex;
  align-items: baseline;
  gap: var(--oas-space-2);
  margin-inline-start: auto;
}
.subtotal-label {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.actions {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-2);
  flex: none;
}

@media (prefers-reduced-motion: reduce) {
  .inner {
    transition: none;
  }
}

@media (forced-colors: active) {
  .step:focus-visible,
  .remove:focus-visible,
  .body:focus-visible,
  .qty:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 2px;
    box-shadow: none;
  }
}
`

export class OASCart extends OASElement {
  static override get observedAttributes(): string[] {
    return ['items', 'currency', 'locale', 'precision', 'disabled', 'delete-mode']
  }

  private listEl: HTMLUListElement | null = null
  private emptyEl: HTMLElement | null = null
  private emptyTextEl: HTMLElement | null = null
  private summaryEl: HTMLElement | null = null
  private allLabelEl: HTMLElement | null = null
  private allCheckEl: HTMLInputElement | null = null
  private allTextEl: HTMLElement | null = null
  private countEl: HTMLElement | null = null
  private subtotalLabelEl: HTMLElement | null = null
  private subtotalPriceEl: HTMLElement | null = null

  /** id → 行节点引用（增量同步，重建保留焦点） */
  private rows = new Map<string, CartRowRefs>()
  /** 上次渲染的结构指纹（id 序列）；变化才重建列表 */
  private renderedSignature = ''
  private renderedMode: CartDeleteMode | '' = ''
  /** 加载失败的图片 id（占位态在后续 update 中保持，不因重回写而闪回原图） */
  private failedImages = new Set<string>()
  /** 非法数据的 dev 告警去重（实例级，同一类只报一次） */
  private warnedInvalidPrice = false
  private warnedMaxQuantity = false
  private warnedDeleteMode = false

  /** 滑动删除进行中的拖拽态 */
  private drag: {
    id: string
    inner: HTMLElement
    startX: number
    startY: number
    pointerId: number
    moved: boolean
  } | null = null
  /** 最近一次滑动越过了点击阈值（抑制随后的 click 误触） */
  private suppressClick = false
  /** 已展开滑动删除钮的条目 id */
  private openSwipeId = ''

  // -------------------------------------------------------------------------
  // property 通道
  // -------------------------------------------------------------------------

  /**
   * @apiProperty 购物车条目：get+set 双通道（数组或 JSON 字符串）；用户交互后组件回写该属性并派发 oas-change（受控宿主忽略回写即可）
   */
  get items(): CartItem[] {
    return this.snapshot(this.rowsFromAttribute())
  }

  set items(value: CartItem[] | string) {
    this.setAttribute('items', typeof value === 'string' ? value : JSON.stringify(value ?? []))
  }

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="root" part="root">
        <ul class="list" part="list"></ul>
        <div class="empty" part="empty" hidden>
          <slot name="empty"><span class="empty-text" part="empty-text"></span></slot>
        </div>
        <div class="summary" part="summary">
          <label class="all" part="all">
            <input class="all-check" part="select-all" type="checkbox" />
            <span class="all-text" part="select-all-text"></span>
          </label>
          <span class="count" part="selected-count"></span>
          <span class="subtotal" part="subtotal" aria-live="polite">
            <span class="subtotal-label" part="subtotal-label"></span>
            <oas-price class="subtotal-price" size="md"></oas-price>
          </span>
          <span class="actions" part="actions"><slot name="actions"></slot></span>
        </div>
      </div>
    `
  }

  private bind(): void {
    this.listEl = this.shadow.querySelector<HTMLUListElement>('.list')
    this.emptyEl = this.shadow.querySelector<HTMLElement>('[part="empty"]')
    this.emptyTextEl = this.shadow.querySelector<HTMLElement>('[part="empty-text"]')
    this.summaryEl = this.shadow.querySelector<HTMLElement>('[part="summary"]')
    this.allLabelEl = this.shadow.querySelector<HTMLElement>('[part="all"]')
    this.allCheckEl = this.shadow.querySelector<HTMLInputElement>('[part="select-all"]')
    this.allTextEl = this.shadow.querySelector<HTMLElement>('[part="select-all-text"]')
    this.countEl = this.shadow.querySelector<HTMLElement>('[part="selected-count"]')
    this.subtotalLabelEl = this.shadow.querySelector<HTMLElement>('[part="subtotal-label"]')
    this.subtotalPriceEl = this.shadow.querySelector<HTMLElement>('[part="subtotal"] oas-price')

    this.listEl?.addEventListener('click', this.onListClick)
    this.listEl?.addEventListener('change', this.onListChange)
    this.listEl?.addEventListener('pointerdown', this.onPointerDown)
    this.listEl?.addEventListener('pointermove', this.onPointerMove)
    this.listEl?.addEventListener('pointerup', this.onPointerUp)
    this.listEl?.addEventListener('pointercancel', this.onPointerCancel)
    this.listEl?.addEventListener('focusin', this.onFocusIn)
    this.allCheckEl?.addEventListener('change', this.onAllChange)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override onReconnect(): void {
    this.bind()
  }

  // -------------------------------------------------------------------------
  // 数据归一
  // -------------------------------------------------------------------------

  private parseItems(): CartItem[] {
    return parseJsonArray<CartItem>(this.getAttr('items'), () =>
      devWarn('[oas-cart] items 不是合法 JSON 数组，已忽略'),
    ).filter((item): item is CartItem => {
      if (typeof item !== 'object' || item === null) return false
      return typeof (item as CartItem).id === 'string' && (item as CartItem).id !== ''
    })
  }

  private resolvePrecision(): number {
    const raw = this.getAttr('precision').trim()
    if (raw === '') return DEFAULT_PRECISION
    const n = Number(raw)
    return Number.isInteger(n) && n >= 0 && n <= MAX_PRECISION ? n : DEFAULT_PRECISION
  }

  private resolveDeleteMode(): CartDeleteMode {
    const raw = this.getAttr('delete-mode').trim()
    if (raw === '') return 'button'
    if (DELETE_MODES.includes(raw)) return raw as CartDeleteMode
    if (!this.warnedDeleteMode) {
      this.warnedDeleteMode = true
      devWarn(`[oas-cart] delete-mode "${raw}" 非法（button / swipe / none），已回落 button`)
    }
    return 'button'
  }

  private isDisabled(): boolean {
    if (this.hasAttr('disabled')) return true
    return this.injectDisabled()
  }

  /** 原始条目 → 渲染/事件共用的行数据（价格、数量、选中、上限全部归一） */
  private rowsFromAttribute(): CartRow[] {
    const out: CartRow[] = []
    for (const item of this.parseItems()) {
      const price = Number(item.price)
      const validPrice = Number.isFinite(price) && price >= 0
      if (!validPrice && !this.warnedInvalidPrice) {
        this.warnedInvalidPrice = true
        devWarn('[oas-cart] 条目 price 非法（应为非负数值），已按 0 计')
      }
      const disabled = item.disabled === true
      const max = this.resolveMaxQuantity(item)
      let quantity = Number(item.quantity)
      if (!Number.isFinite(quantity)) quantity = 1
      quantity = Math.max(1, Math.floor(quantity))
      if (max !== null) quantity = Math.min(quantity, max)
      out.push({
        item,
        price: validPrice ? price : 0,
        quantity,
        selected: !disabled && item.selected === true,
        disabled,
        max,
      })
    }
    return out
  }

  private resolveMaxQuantity(item: CartItem): number | null {
    if (item.maxQuantity === undefined || item.maxQuantity === null) return null
    const n = Number(item.maxQuantity)
    if (Number.isInteger(n) && n >= 1) return n
    if (!this.warnedMaxQuantity) {
      this.warnedMaxQuantity = true
      devWarn('[oas-cart] 条目 maxQuantity 非法（应为 ≥1 的整数），已忽略该上限')
    }
    return null
  }

  /** 回写/事件使用的条目形状（保留宿主原有字段，只归一 quantity / selected） */
  private snapshot(rows: CartRow[]): CartItem[] {
    return rows.map((row) => ({ ...row.item, quantity: row.quantity, selected: row.selected }))
  }

  private totalOf(rows: CartRow[]): number {
    const precision = this.resolvePrecision()
    const sum = rows.reduce((acc, row) => (row.selected ? acc + row.price * row.quantity : acc), 0)
    // 先按精度收敛，避免 0.1 * 3 = 0.30000000000000004 这类浮点尾巴进入 detail
    return Number(sum.toFixed(precision))
  }

  private selectionOf(rows: CartRow[]): { selectedCount: number; allSelected: boolean; indeterminate: boolean } {
    const selectable = rows.filter((row) => !row.disabled)
    const selectedCount = selectable.filter((row) => row.selected).length
    const allSelected = selectable.length > 0 && selectedCount === selectable.length
    return { selectedCount, allSelected, indeterminate: selectedCount > 0 && !allSelected }
  }

  // -------------------------------------------------------------------------
  // 渲染
  // -------------------------------------------------------------------------

  protected override update(): void {
    if (!this.listEl) return
    const rows = this.rowsFromAttribute()
    const mode = this.resolveDeleteMode()
    const signature = rows.map((row) => row.item.id).join('\u0001')
    this.listEl.setAttribute('aria-label', this.t('cart.label'))

    if (mode !== this.renderedMode || signature !== this.renderedSignature) {
      this.rebuild(rows, mode)
      this.renderedMode = mode
      this.renderedSignature = signature
    }
    // 无论重建与否都走增量同步：勾选/数量/价格/禁用态全部原地更新（焦点与滚动保持）
    this.syncRows(rows)
    this.syncEmpty(rows)
    this.syncSummary(rows)
  }

  /** 结构变化（条目增删 / 删除形态切换）：整表重建 */
  private rebuild(rows: CartRow[], mode: CartDeleteMode): void {
    if (!this.listEl) return
    this.rows.clear()
    this.openSwipeId = ''
    this.drag = null
    this.listEl.replaceChildren(...rows.map((row) => this.buildRow(row, mode)))
  }

  private buildRow(row: CartRow, mode: CartDeleteMode): HTMLLIElement {
    const li = document.createElement('li')
    li.className = 'item'
    li.setAttribute('part', 'item')
    li.setAttribute('data-id', row.item.id)

    const inner = document.createElement('div')
    inner.className = 'inner'
    inner.setAttribute('part', 'item-inner')
    if (mode === 'swipe') inner.setAttribute('data-swipeable', 'true')

    const check = document.createElement('input')
    check.className = 'check'
    check.type = 'checkbox'
    check.setAttribute('part', 'item-check')

    const thumb = document.createElement('span')
    thumb.className = 'thumb'
    thumb.setAttribute('part', 'thumb')

    let img: HTMLImageElement | null = null
    if (row.item.image) {
      img = document.createElement('img')
      img.setAttribute('part', 'image')
      img.alt = ''
      img.loading = 'lazy'
      // 缩略图处在滑动删除的手势面上：不禁原生拖拽的话，按住缩略图横移会走浏览器图片拖拽
      // （pointerdown → dragstart → pointercancel），滑动会话被 cancel 收掉——缩略图那一段
      // 永远滑不出删除钮。draggable=false + CSS -webkit-user-drag:none 双保险。
      img.draggable = false
      const image = img
      image.addEventListener('error', () => {
        image.hidden = true
        thumb.setAttribute('data-empty', 'true')
        this.failedImages.add(imageFailKey(row.item.id, image.getAttribute('src') ?? ''))
      })
      thumb.appendChild(img)
    }

    const body = document.createElement('button')
    body.className = 'body'
    body.type = 'button'
    body.setAttribute('part', 'item-body')

    const title = document.createElement('span')
    title.className = 'title'
    title.setAttribute('part', 'item-title')

    const spec = document.createElement('span')
    spec.className = 'spec'
    spec.setAttribute('part', 'item-spec')

    const price = document.createElement('oas-price')
    price.className = 'price'
    price.setAttribute('part', 'item-price')
    price.setAttribute('size', 'sm')

    body.append(title, spec, price)

    const stepper = document.createElement('div')
    stepper.className = 'stepper'
    stepper.setAttribute('part', 'stepper')

    const minus = document.createElement('button')
    minus.className = 'step'
    minus.type = 'button'
    minus.setAttribute('part', 'minus')
    minus.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${minusPath}</svg>`

    const qty = document.createElement('input')
    qty.className = 'qty'
    qty.setAttribute('part', 'quantity')
    qty.type = 'number'
    qty.min = '1'
    qty.step = '1'
    qty.inputMode = 'numeric'

    const plus = document.createElement('button')
    plus.className = 'step'
    plus.type = 'button'
    plus.setAttribute('part', 'plus')
    plus.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${plusPath}</svg>`

    stepper.append(minus, qty, plus)
    inner.append(check, thumb, body, stepper)

    let remove: HTMLButtonElement | null = null
    if (mode === 'button') {
      remove = document.createElement('button')
      remove.className = 'remove'
      remove.type = 'button'
      remove.setAttribute('part', 'remove')
      remove.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${closePath}</svg>`
      inner.appendChild(remove)
    }

    li.appendChild(inner)

    let swipeRemove: HTMLButtonElement | null = null
    if (mode === 'swipe') {
      swipeRemove = document.createElement('button')
      swipeRemove.className = 'swipe-remove'
      swipeRemove.type = 'button'
      swipeRemove.setAttribute('part', 'swipe-remove')
      li.appendChild(swipeRemove)
    }

    this.rows.set(row.item.id, {
      root: li,
      inner,
      thumb,
      img,
      check,
      body,
      title,
      spec,
      price,
      qty,
      minus,
      plus,
      remove,
      swipeRemove,
    })
    return li
  }

  /** 同结构下的增量同步（勾选 / 数量 / 价格 / 禁用态；不重建节点） */
  private syncRows(rows: CartRow[]): void {
    const disabledAll = this.isDisabled()
    const currency = this.getAttr('currency', 'CNY')
    const precision = String(this.resolvePrecision())
    const locale = this.getAttr('locale').trim()
    const removeLabel = this.t('cart.remove', { title: '' }).trim()
    const sign = this.swipeSign()

    for (const row of rows) {
      const refs = this.rows.get(row.item.id)
      if (!refs) continue
      const title = row.item.title ?? ''
      refs.root.setAttribute('data-disabled', String(row.disabled))
      refs.check.checked = row.selected
      refs.check.disabled = disabledAll || row.disabled
      refs.check.setAttribute('aria-label', this.t('cart.selectItem', { title }))

      const imageMissing = !row.item.image || this.failedImages.has(imageFailKey(row.item.id, row.item.image))
      refs.thumb.setAttribute('data-empty', String(imageMissing))
      if (refs.img) {
        const src = row.item.image ?? ''
        if (refs.img.getAttribute('src') !== src) refs.img.setAttribute('src', src)
        refs.img.hidden = imageMissing
      }

      refs.title.textContent = title
      refs.spec.textContent = row.item.spec ?? ''
      refs.spec.hidden = !row.item.spec

      refs.price.setAttribute('value', String(row.price))
      refs.price.setAttribute('currency', currency)
      refs.price.setAttribute('precision', precision)
      if (locale) refs.price.setAttribute('locale', locale)
      else refs.price.removeAttribute('locale')

      const quantity = String(row.quantity)
      if (refs.qty.value !== quantity) refs.qty.value = quantity
      if (row.max !== null) refs.qty.setAttribute('max', String(row.max))
      else refs.qty.removeAttribute('max')
      refs.qty.disabled = disabledAll || row.disabled
      refs.qty.setAttribute('aria-label', `${this.t('cart.quantity')} ${title}`.trim())

      refs.minus.disabled = disabledAll || row.disabled || row.quantity <= 1
      refs.minus.setAttribute('aria-label', `${this.t('cart.decrease')} ${title}`.trim())
      refs.plus.disabled = disabledAll || row.disabled || (row.max !== null && row.quantity >= row.max)
      refs.plus.setAttribute('aria-label', `${this.t('cart.increase')} ${title}`.trim())

      if (refs.remove) {
        refs.remove.disabled = disabledAll
        refs.remove.setAttribute('aria-label', this.t('cart.remove', { title }))
      }
      if (refs.swipeRemove) {
        refs.swipeRemove.disabled = disabledAll
        refs.swipeRemove.textContent = removeLabel
        refs.swipeRemove.setAttribute('aria-label', this.t('cart.remove', { title }))
      }

      const open = this.openSwipeId === row.item.id
      const transform = open ? `translateX(${sign * SWIPE_REVEAL}px)` : ''
      if (refs.inner.style.transform !== transform) refs.inner.style.transform = transform
    }
  }

  private syncEmpty(rows: CartRow[]): void {
    const empty = rows.length === 0
    if (this.listEl) this.listEl.hidden = empty
    if (this.emptyEl) this.emptyEl.hidden = !empty
    if (this.emptyTextEl) this.emptyTextEl.textContent = empty ? this.t('cart.empty') : ''
    if (this.summaryEl) this.summaryEl.hidden = empty
  }

  private syncSummary(rows: CartRow[]): void {
    const { selectedCount, allSelected, indeterminate } = this.selectionOf(rows)
    const disabledAll = this.isDisabled()
    if (this.allCheckEl) {
      this.allCheckEl.checked = allSelected
      this.allCheckEl.indeterminate = indeterminate
      this.allCheckEl.disabled = disabledAll || rows.every((row) => row.disabled)
      this.allCheckEl.setAttribute('aria-label', this.t('cart.selectAll'))
    }
    if (this.allLabelEl) this.allLabelEl.setAttribute('data-disabled', String(disabledAll))
    if (this.allTextEl) this.allTextEl.textContent = this.t('cart.selectAll')

    if (this.countEl) {
      this.countEl.textContent = this.t('cart.selectedCount', { count: selectedCount })
      this.countEl.hidden = selectedCount === 0
    }
    if (this.subtotalLabelEl) this.subtotalLabelEl.textContent = this.t('cart.subtotal')
    if (this.subtotalPriceEl) {
      const locale = this.getAttr('locale').trim()
      this.subtotalPriceEl.setAttribute('value', String(this.totalOf(rows)))
      this.subtotalPriceEl.setAttribute('currency', this.getAttr('currency', 'CNY'))
      this.subtotalPriceEl.setAttribute('precision', String(this.resolvePrecision()))
      if (locale) this.subtotalPriceEl.setAttribute('locale', locale)
      else this.subtotalPriceEl.removeAttribute('locale')
    }
  }

  // -------------------------------------------------------------------------
  // 交互
  // -------------------------------------------------------------------------

  private rowIdOf(target: HTMLElement | null): string {
    const row = target?.closest<HTMLElement>('[data-id]')
    return row?.getAttribute('data-id') ?? ''
  }

  private onListClick = (event: Event): void => {
    const target = event.target as HTMLElement | null
    if (!target) return
    const id = this.rowIdOf(target)
    if (id === '') return
    if (this.suppressClick) {
      this.suppressClick = false
      return
    }
    if (target.closest('[part="plus"]')) {
      this.stepQuantity(id, 1)
      return
    }
    if (target.closest('[part="minus"]')) {
      this.stepQuantity(id, -1)
      return
    }
    if (target.closest('[part="remove"]') || target.closest('[part="swipe-remove"]')) {
      this.requestRemove(id)
      return
    }
    if (target.closest('[part="item-body"]')) {
      // 滑动删除惯例：已展开行点行体 = 收起动作（不派 oas-item-click）；
      // 点其他行先收起已展开行（购物车单行操作），事件照常派发进详情
      if (this.openSwipeId !== '') {
        const wasOpenRow = id === this.openSwipeId
        this.closeSwipe()
        if (wasOpenRow) return
      }
      this.emitItemClick(id)
    }
  }

  /** 收起已展开的滑动删除钮（transform 由下一次 syncRows 统一落定，这里即时清） */
  private closeSwipe(): void {
    if (this.openSwipeId === '') return
    const refs = this.rows.get(this.openSwipeId)
    this.openSwipeId = ''
    if (refs) refs.inner.style.transform = ''
  }

  private emitItemClick(id: string): void {
    const row = this.rowsFromAttribute().find((entry) => entry.item.id === id)
    if (!row) return
    this.emit('item-click', {
      id,
      item: { ...row.item, quantity: row.quantity, selected: row.selected },
    } satisfies CartItemClickDetail)
  }

  private onListChange = (event: Event): void => {
    const target = event.target as HTMLElement | null
    if (!target) return
    const id = this.rowIdOf(target)
    if (id === '') return
    const part = target.getAttribute('part')
    if (part === 'item-check') {
      this.toggleSelected(id, (target as HTMLInputElement).checked)
      return
    }
    if (part === 'quantity') {
      this.setQuantity(id, Number((target as HTMLInputElement).value))
    }
  }

  private onAllChange = (): void => {
    if (this.isDisabled()) return
    const checked = this.allCheckEl?.checked ?? false
    const next = this.parseItems().map((item) => (item.disabled === true ? item : { ...item, selected: checked }))
    this.commit(next)
  }

  /** 滑动删除：按下起点（只对非控件区域生效） */
  private onPointerDown = (event: PointerEvent): void => {
    if (this.resolveDeleteMode() !== 'swipe') return
    if (this.isDisabled()) return
    if (event.button !== 0) return
    // 多点触控守卫：已有会话在途时**不同** pointerId 的新指针直接忽略——覆盖 this.drag 会让
    // 旧会话的起点 / pointerId 被改写，旧行的 data-dragging 永久残留（抬起顺序无关：旧指针的
    // move/up 仍按旧 pointerId 结算，新指针的后续事件因 id 不匹配被忽略）。
    // 同一 pointerId 的新按下则说明旧会话已死（丢了 pointerup / 行节点被重建；鼠标 pointerId
    // 恒为 1）——必须收尾旧会话后重开，否则滑动入口会被永久锁死、再也无法自愈。
    if (this.drag) {
      if (this.drag.pointerId !== event.pointerId) return
      const stale = this.drag
      this.endDrag()
      this.settleSwipe(stale.inner, this.openSwipeId === stale.id)
    }
    const target = event.target as HTMLElement | null
    if (!target) return
    if (target.closest('[part="stepper"], [part="item-check"], [part="swipe-remove"]')) return
    const inner = target.closest<HTMLElement>('[part="item-inner"]')
    const id = this.rowIdOf(target)
    if (!inner || id === '') return
    this.suppressClick = false
    this.drag = {
      id,
      inner,
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
      moved: false,
    }
    inner.setAttribute('data-dragging', 'true')
  }

  private onPointerMove = (event: PointerEvent): void => {
    const drag = this.drag
    if (!drag || event.pointerId !== drag.pointerId) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    // 纵向意图优先：放行滚动，不接管这次手势
    if (!drag.moved && Math.abs(dy) > Math.abs(dx)) {
      this.endDrag()
      return
    }
    if (Math.abs(dx) < SWIPE_SLOP) return
    if (!drag.moved) {
      // 横向意图确立：捕获指针。此后指针移出列表再松手，pointerup 仍会派发到 inner
      // （capture 目标在列表内，事件冒泡仍途经 listEl），滑动状态不会卡在半途。
      // 纯点击不会走到这里（无 moved 即无捕获），click 目标不受影响。
      try {
        drag.inner.setPointerCapture(event.pointerId)
      } catch {
        /* 指针已失效或环境不支持捕获（如 happy-dom）时忽略 */
      }
    }
    drag.moved = true
    const { offset } = resolveSwipeOffset({
      dx,
      open: this.openSwipeId === drag.id,
      reveal: SWIPE_REVEAL,
      rtl: this.swipeSign() === 1,
    })
    drag.inner.style.transform = offset === 0 ? '' : `translateX(${offset}px)`
  }

  private onPointerUp = (event: PointerEvent): void => {
    const drag = this.drag
    if (!drag || event.pointerId !== drag.pointerId) return
    const { open } = resolveSwipeOffset({
      dx: event.clientX - drag.startX,
      open: this.openSwipeId === drag.id,
      reveal: SWIPE_REVEAL,
      rtl: this.swipeSign() === 1,
    })
    // 展开态只随本次手势的行变化：本次吸附展开 → 切到该行（单行操作惯例）；
    // 本次收起且该行正是展开行 → 清；与已展开行无关的手势（如 tap 其他行）不得
    // 抹掉它的展开态（否则状态与视觉脱节：transform 残留而 openSwipeId 已丢）
    if (open) {
      // 单行操作：新行吸附展开时先收起旧展开行——否则两行同时露出删除钮，
      // 而状态只剩新行（旧行的 transform 再也没有归属，直到下一次 syncRows 才自愈）
      if (this.openSwipeId !== '' && this.openSwipeId !== drag.id) this.closeSwipe()
      this.openSwipeId = drag.id
    } else if (this.openSwipeId === drag.id) {
      this.openSwipeId = ''
    }
    if (drag.moved) this.suppressClick = true
    // 先清拖拽态（恢复 transform 过渡动画），再写落定位置：
    // 过半吸附到完全露出、未过半回弹关闭。落定值不能复用跟手 clamp 值——
    // 否则拖到一半松手会停半路（过半时删除钮半露、未过半时不回弹）。
    this.endDrag()
    this.settleSwipe(drag.inner, open)
  }

  /**
   * 手势被浏览器接管（滚动 / 系统手势）：cancel 事件的坐标不可信——Safari 类浏览器派发
   * clientX/Y = 0，按坐标结算会把中断手势误判成「向行首拖满」→ 意外满展开 + 抑制紧随
   * click。因此 cancel 单独结算：不读坐标，按手势开始前的吸附态落定——未展开回弹 0，
   * 已展开保持展开；也不设 suppressClick（cancel 不是用户意图上的滑动松手，紧随的
   * click 应照常响应）。
   */
  private onPointerCancel = (event: PointerEvent): void => {
    const drag = this.drag
    if (!drag || event.pointerId !== drag.pointerId) return
    const open = this.openSwipeId === drag.id
    // openSwipeId 不改写：手势行已展开时值本就是 drag.id（保持），未展开时不动全局展开态
    this.endDrag()
    this.settleSwipe(drag.inner, open)
  }

  /** 写落定位置：吸附展开 → sign×reveal，回弹关闭 → 清 transform（走 CSS 过渡） */
  private settleSwipe(inner: HTMLElement, open: boolean): void {
    const settle = resolveSwipeSettle({ open, reveal: SWIPE_REVEAL, rtl: this.swipeSign() === 1 })
    inner.style.transform = settle === 0 ? '' : `translateX(${settle}px)`
  }

  private endDrag(): void {
    this.drag?.inner.removeAttribute('data-dragging')
    this.drag = null
  }

  /** 键盘可达：滑动删除钮获得焦点时自动露出（否则焦点环被内容层遮挡、看不见） */
  private onFocusIn = (event: Event): void => {
    if (this.resolveDeleteMode() !== 'swipe') return
    const target = event.target as HTMLElement | null
    if (!target || target.getAttribute('part') !== 'swipe-remove') return
    const id = this.rowIdOf(target)
    if (id === '') return
    this.openSwipeId = id
    const refs = this.rows.get(id)
    if (refs) refs.inner.style.transform = `translateX(${this.swipeSign() * SWIPE_REVEAL}px)`
  }

  /** LTR 向行首拖出（位移取负）；RTL 反向（方向判定收敛 shared/direction，
   * computed 通道保留原先直读样式表的语义——本件滑动方向在指针事件里判） */
  private swipeSign(): number {
    return isRtl(this, { computed: true }) ? 1 : -1
  }

  // -------------------------------------------------------------------------
  // 变更提交
  // -------------------------------------------------------------------------

  private toggleSelected(id: string, checked: boolean): void {
    const next = this.parseItems().map((item) => (item.id === id ? { ...item, selected: checked } : item))
    this.commit(next)
  }

  private stepQuantity(id: string, delta: number): void {
    const row = this.rowsFromAttribute().find((entry) => entry.item.id === id)
    if (!row) return
    this.setQuantity(id, row.quantity + delta)
  }

  private setQuantity(id: string, raw: number): void {
    if (this.isDisabled()) return
    const row = this.rowsFromAttribute().find((entry) => entry.item.id === id)
    if (!row || row.disabled) return
    let quantity = Number.isFinite(raw) ? Math.floor(raw) : 1
    quantity = Math.max(1, quantity)
    if (row.max !== null) quantity = Math.min(quantity, row.max)
    if (quantity === row.quantity) {
      // 输入框可能被改成越界值：即便数值没变也要把显示拉回归一值
      const refs = this.rows.get(id)
      if (refs) refs.qty.value = String(row.quantity)
      return
    }
    const next = this.parseItems().map((item) => (item.id === id ? { ...item, quantity } : item))
    this.commit(next)
  }

  private requestRemove(id: string): void {
    if (this.isDisabled()) return
    const row = this.rowsFromAttribute().find((entry) => entry.item.id === id)
    if (!row) return
    const next = this.parseItems().filter((item) => item.id !== id)
    const nextRows = this.rowsFromAttribute().filter((entry) => entry.item.id !== id)
    const { selectedCount } = this.selectionOf(nextRows)
    const detail: CartRemoveDetail = {
      item: { ...row.item, quantity: row.quantity, selected: row.selected },
      items: this.snapshot(nextRows),
      total: this.totalOf(nextRows),
      selectedCount,
    }
    // 删除前派发（cancelable）：宿主 preventDefault 即拦下本次删除（接确认框后自行写 items）
    if (!this.emit('remove', detail, { cancelable: true })) return
    if (this.openSwipeId === id) this.openSwipeId = ''
    this.commit(next)
  }

  /** 写回 items（非受控通道）并派发 oas-change */
  private commit(next: CartItem[]): void {
    const json = JSON.stringify(next)
    if (this.getAttribute('items') === json) {
      if (this.hasRendered) this.update()
    } else {
      this.setAttribute('items', json)
    }
    const rows = this.rowsFromAttribute()
    const { selectedCount, allSelected, indeterminate } = this.selectionOf(rows)
    this.emit('change', {
      items: this.snapshot(rows),
      total: this.totalOf(rows),
      selectedCount,
      allSelected,
      indeterminate,
    } satisfies CartChangeDetail)
  }
}
