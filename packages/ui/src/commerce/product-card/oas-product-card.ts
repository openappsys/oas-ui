import { OASElement } from '@oas-ui/core/oas-element'
import { devWarn } from '../../shared/dev-warn.js'
import '../price/index.js'

/**
 * oas-product-card —— 商品卡片（commerce 族）。
 *
 * 商品列表 / 推荐位的高频卡：图片（比例可配）+ 标题（两行截断）+ 价格（现价 + 划线价）+
 * 标签位 / 促销位 / 按钮区三个插槽。`layout` 两种形态：纵向（缺省，图在上）与横向（图在行首）。
 *
 * 属性（kebab-case）：
 * - `image`：图片地址（加载失败回落虚线占位框）
 * - `image-ratio`：图片比例，写法 `16:9` / `4/3` / `1`（数字）；缺省 `1:1`，非法值回落 `1:1` 并告警一次
 * - `title`：商品标题（两行截断，完整文案保留在 `title` 属性与无障碍名里）
 * - `price`：现价（非负数值）；缺省不渲染价格区
 * - `original-price`：划线原价（交给内嵌 `oas-price` 的 `original` 通道）
 * - `currency`：ISO 4217 币种，默认 `CNY`
 * - `locale`：金额格式化 locale；缺省取文档 `<html lang>`，再退回 `zh-CN`
 * - `precision`：金额小数位，默认 2
 * - `layout`：`vertical`（缺省，纵排）/ `horizontal`（横排，图在行首）；非法值回落 `vertical` 并告警一次
 *
 * 插槽（均为可选，空插槽自动收起不占间距）：
 * - `tags`：标题下方的标签位（折扣 / 自营 / 包邮等，放 `oas-tag`）
 * - `promo`：促销文案位（满减 / 秒杀倒计时等）
 * - `actions`：按钮区（加入购物车 / 立即购买等）
 *
 * 事件：无（纯展示卡片）。跳转不内置——宿主把卡片包进 `<a>`，或把按钮 / 链接放进 `actions` 插槽。
 *
 * a11y：图片 `alt` 取标题；缺图占位框 `role="img"` + i18n 文案（`productCard.noImage`）；
 * 标题两行截断仅为视觉，DOM 里仍是完整文本。布局走逻辑属性（RTL 安全），颜色全走 token。
 */

export type ProductCardLayout = 'vertical' | 'horizontal'

const LAYOUTS: readonly string[] = ['vertical', 'horizontal']
const DEFAULT_PRECISION = 2
const MAX_PRECISION = 20
const DEFAULT_RATIO = '1 / 1'

/** 图片比例解析：`16:9` / `4/3` / `1.75` → CSS aspect-ratio 可用的 `w / h`；非法返回 null */
export function parseImageRatio(raw: string): string | null {
  const value = raw.trim()
  if (value === '') return null
  const pair = /^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/.exec(value)
  if (pair) {
    const w = Number(pair[1])
    const h = Number(pair[2])
    if (w > 0 && h > 0) return `${w} / ${h}`
    return null
  }
  const single = Number(value)
  if (Number.isFinite(single) && single > 0) return `${single} / 1`
  return null
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
.card {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  box-sizing: border-box;
  height: 100%;
  padding: var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg);
  transition: box-shadow var(--oas-transition-fast) var(--oas-ease-out);
}
.card:hover {
  box-shadow: var(--oas-shadow-sm);
}
.media {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 100%;
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-hover);
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
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.placeholder[hidden] {
  display: none;
}
.body {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  flex: 1 1 auto;
  min-width: 0;
}
.title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  font-size: var(--oas-font-size-md);
  font-weight: 500;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.title[hidden] {
  display: none;
}
.tags,
.promo,
.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--oas-space-1) var(--oas-space-2);
}
.tags[hidden],
.promo[hidden],
.actions[hidden] {
  display: none;
}
.promo {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.actions {
  margin-block-start: auto;
}
.price {
  font-size: var(--oas-font-size-sm);
}
.price[hidden] {
  display: none;
}
:host([layout='horizontal']) .card {
  flex-direction: row;
  align-items: flex-start;
  gap: var(--oas-space-3);
}
:host([layout='horizontal']) .media {
  flex: none;
  width: 104px;
}
:host([layout='horizontal']) .body {
  gap: var(--oas-space-1);
}

@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none;
  }
}
`

export class OASProductCard extends OASElement {
  static override get observedAttributes(): string[] {
    return ['image', 'image-ratio', 'title', 'price', 'original-price', 'currency', 'locale', 'precision', 'layout']
  }

  private cardEl: HTMLElement | null = null
  private mediaEl: HTMLElement | null = null
  private imgEl: HTMLImageElement | null = null
  private placeholderEl: HTMLElement | null = null
  private titleEl: HTMLElement | null = null
  private priceEl: HTMLElement | null = null
  private tagsEl: HTMLElement | null = null
  private promoEl: HTMLElement | null = null
  private actionsEl: HTMLElement | null = null
  private tagsSlot: HTMLSlotElement | null = null
  private promoSlot: HTMLSlotElement | null = null
  private actionsSlot: HTMLSlotElement | null = null

  private warnedRatio = false
  private warnedLayout = false
  /** 加载失败的图片地址（同一 src 不重复尝试，也不把占位态闪回原图） */
  private failedSrc = ''

  private template(): string {
    return `
      <style>${STYLE}</style>
      <article class="card" part="card">
        <div class="media" part="media" data-empty="true">
          <img part="image" alt="" loading="lazy" hidden />
          <span class="placeholder" part="placeholder" role="img"></span>
        </div>
        <div class="body" part="body">
          <div class="title" part="title" hidden></div>
          <div class="tags" part="tags" hidden><slot name="tags"></slot></div>
          <div class="promo" part="promo" hidden><slot name="promo"></slot></div>
          <oas-price class="price" part="price" size="md" hidden></oas-price>
          <div class="actions" part="actions" hidden><slot name="actions"></slot></div>
        </div>
      </article>
    `
  }

  private bind(): void {
    this.cardEl = this.shadow.querySelector<HTMLElement>('[part="card"]')
    this.mediaEl = this.shadow.querySelector<HTMLElement>('[part="media"]')
    this.imgEl = this.shadow.querySelector<HTMLImageElement>('[part="image"]')
    this.placeholderEl = this.shadow.querySelector<HTMLElement>('[part="placeholder"]')
    this.titleEl = this.shadow.querySelector<HTMLElement>('[part="title"]')
    this.priceEl = this.shadow.querySelector<HTMLElement>('[part="price"]')
    this.tagsEl = this.shadow.querySelector<HTMLElement>('[part="tags"]')
    this.promoEl = this.shadow.querySelector<HTMLElement>('[part="promo"]')
    this.actionsEl = this.shadow.querySelector<HTMLElement>('[part="actions"]')
    this.tagsSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="tags"]')
    this.promoSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="promo"]')
    this.actionsSlot = this.shadow.querySelector<HTMLSlotElement>('slot[name="actions"]')

    this.imgEl?.addEventListener('error', this.onImageError)
    for (const slot of [this.tagsSlot, this.promoSlot, this.actionsSlot]) {
      slot?.addEventListener('slotchange', this.onSlotChange)
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override onReconnect(): void {
    this.bind()
  }

  private onImageError = (): void => {
    this.failedSrc = this.getAttr('image').trim()
    if (this.imgEl) this.imgEl.hidden = true
    if (this.mediaEl) this.mediaEl.setAttribute('data-empty', 'true')
    if (this.placeholderEl) {
      this.placeholderEl.hidden = false
      this.placeholderEl.setAttribute('aria-label', this.t('productCard.noImage'))
    }
  }

  private onSlotChange = (): void => {
    this.syncSlots()
  }

  // -------------------------------------------------------------------------
  // 属性解析
  // -------------------------------------------------------------------------

  private resolvePrecision(): number {
    const raw = this.getAttr('precision').trim()
    if (raw === '') return DEFAULT_PRECISION
    const n = Number(raw)
    return Number.isInteger(n) && n >= 0 && n <= MAX_PRECISION ? n : DEFAULT_PRECISION
  }

  private resolvePrice(name: string): number | null {
    const raw = this.getAttr(name).trim()
    if (raw === '') return null
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : null
  }

  private resolveLayout(): ProductCardLayout {
    const raw = this.getAttr('layout').trim()
    if (raw === '') return 'vertical'
    if (LAYOUTS.includes(raw)) return raw as ProductCardLayout
    if (!this.warnedLayout) {
      this.warnedLayout = true
      devWarn(`[oas-product-card] layout "${raw}" 非法（vertical / horizontal），已回落 vertical`)
    }
    return 'vertical'
  }

  private resolveRatio(): string {
    const raw = this.getAttr('image-ratio')
    if (raw.trim() === '') return DEFAULT_RATIO
    const parsed = parseImageRatio(raw)
    if (parsed !== null) return parsed
    if (!this.warnedRatio) {
      this.warnedRatio = true
      devWarn(`[oas-product-card] image-ratio "${raw}" 非法（如 16:9 / 4/3 / 1），已回落 1:1`)
    }
    return DEFAULT_RATIO
  }

  // -------------------------------------------------------------------------
  // 渲染
  // -------------------------------------------------------------------------

  protected override update(): void {
    if (!this.cardEl) return
    // 布局由 CSS（:host([layout='horizontal'])）承载，这里只做合法性校验与告警
    this.resolveLayout()

    const title = this.getAttr('title').trim()
    if (this.titleEl) {
      this.titleEl.textContent = title
      this.titleEl.hidden = title === ''
      this.titleEl.title = title
    }
    if (this.cardEl) {
      if (title === '') this.cardEl.removeAttribute('aria-label')
      else this.cardEl.setAttribute('aria-label', title)
    }

    this.syncMedia(title)
    this.syncPrice()
    this.syncSlots()
  }

  private syncMedia(title: string): void {
    const media = this.mediaEl
    if (!media) return
    media.style.aspectRatio = this.resolveRatio()
    const src = this.getAttr('image').trim()
    const empty = src === '' || this.failedSrc === src
    media.setAttribute('data-empty', String(empty))
    if (this.imgEl) {
      if (this.imgEl.getAttribute('src') !== src) this.imgEl.setAttribute('src', src)
      this.imgEl.hidden = empty
      this.imgEl.alt = title
    }
    if (this.placeholderEl) {
      this.placeholderEl.hidden = !empty
      // 占位框只有虚线边框、无可见文字（文字放 aria-label：role="img" 需要作者名，且可见文字
      // 落在 bg-hover 上只有 4.39 不达 AA）
      this.placeholderEl.setAttribute('aria-label', empty ? this.t('productCard.noImage') : '')
    }
  }

  private syncPrice(): void {
    const price = this.resolvePrice('price')
    const original = this.resolvePrice('original-price')
    const el = this.priceEl
    if (!el) return
    el.hidden = price === null && original === null
    if (price !== null) el.setAttribute('value', String(price))
    else el.removeAttribute('value')
    if (original !== null) el.setAttribute('original', String(original))
    else el.removeAttribute('original')
    el.setAttribute('currency', this.getAttr('currency', 'CNY'))
    el.setAttribute('precision', String(this.resolvePrecision()))
    const locale = this.getAttr('locale').trim()
    if (locale) el.setAttribute('locale', locale)
    else el.removeAttribute('locale')
  }

  private syncSlots(): void {
    this.syncSlotBox(this.tagsEl, this.tagsSlot)
    this.syncSlotBox(this.promoEl, this.promoSlot)
    this.syncSlotBox(this.actionsEl, this.actionsSlot)
  }

  private syncSlotBox(box: HTMLElement | null, slot: HTMLSlotElement | null): void {
    if (!box) return
    const filled = slot
      ? slot
          .assignedNodes()
          .some((node) => (node.textContent ?? '').trim() !== '' || node.nodeType === Node.ELEMENT_NODE)
      : false
    box.hidden = !filled
  }
}
