import { OASElement } from '@oas-ui/core/oas-element'
import { arrowDownPath } from '@oas-ui/icons/icons/arrow-down'
import { arrowUpPath } from '@oas-ui/icons/icons/arrow-up'

/**
 * oas-price —— 价格展示（commerce 族）。
 *
 * 单一职责：把数值格式化为「币种符号 + 千分位 + 指定小数位」的价格文本，并提供
 * 划线价（`original`）、区间价（`min`/`max`）、涨跌趋势（`trend` + `trend-value`）三种附加形态。
 *
 * 属性（kebab-case）：
 * - `value`：单值价格（数字字符串）；与 `min`+`max` 同在场时单值优先
 * - `min` / `max`：区间价两端（两者都在场且 `value` 缺省时生效）
 * - `original`：划线原价（渲染为 `<s>`，读屏前缀走 i18n `price.original`）
 * - `currency`：ISO 4217 币种代码，默认 `CNY`（非法代码回落默认，不抛错）
 * - `locale`：`Intl.NumberFormat` 的 locale；缺省取文档 `<html lang>`，再退回 `zh-CN`
 * - `precision`：小数位（0–20 的整数，默认 `2`；非法值回退默认）
 * - `size`：`sm` / `md`（默认）/ `lg`，仅影响字号档
 * - `trend`：`up` / `down`；非法值不渲染趋势
 * - `trend-value`：涨跌幅文本（纯数值自动补正负号与 `%`，其余原样渲染）
 *
 * 插槽：无（纯展示组件）。
 * 事件：无（展示组件不派发事件）。
 *
 * a11y：金额按 Intl 部件顺序输出，读屏得到连续金额文本；趋势箭头 `aria-hidden`，
 * 语义走 visually-hidden 的方向文案（i18n）；划线价带「原价」读屏前缀。
 * 颜色全部走 token：`--oas-price-color` / `--oas-price-original-color` /
 * `--oas-price-up-color` / `--oas-price-down-color`（暗色随主题 token 自适应）。
 * 趋势文字默认用深/浅双主题都可读的 `--oas-color-danger-text` / `--oas-color-success-text`
 * （纯语义色 `--oas-color-danger/success` 在白底上对比度不足，只适合做底/边框）。
 */

const VALID_SIZES = ['sm', 'md', 'lg'] as const
type PriceSize = (typeof VALID_SIZES)[number]

const DEFAULT_PRECISION = 2
const MAX_PRECISION = 20

/** 金额渲染部件（symbol 与数字的先后顺序由 Intl parts 决定，适配 de-DE 这类「符号在后」的语言） */
interface PriceParts {
  symbol: string
  integer: string
  decimal: string
  symbolAfter: boolean
}

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  color: var(--oas-price-color, var(--oas-color-text-primary));
  font-variant-numeric: tabular-nums;
}
:host([hidden]) {
  display: none;
}
.root {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--oas-space-1) var(--oas-space-2);
}
.price,
.original,
.trend {
  display: inline-flex;
  align-items: baseline;
}
.price {
  font-weight: 600;
  color: var(--oas-price-color, var(--oas-color-text-primary));
}
/* 字号档：符号与小数位始终小于整数位，保持「大数字」视觉层级 */
[data-size='sm'] .integer {
  font-size: var(--oas-font-size-md);
}
[data-size='sm'] .symbol,
[data-size='sm'] .decimal {
  font-size: var(--oas-font-size-xs);
}
[data-size='md'] .integer {
  font-size: var(--oas-font-size-xl);
}
[data-size='md'] .symbol,
[data-size='md'] .decimal {
  font-size: var(--oas-font-size-sm);
}
[data-size='lg'] .integer {
  font-size: calc(var(--oas-font-size-xl) * 1.4);
}
[data-size='lg'] .symbol,
[data-size='lg'] .decimal {
  font-size: var(--oas-font-size-md);
}
.symbol {
  margin-inline-end: var(--oas-space-1);
}
.symbol[data-after='true'] {
  margin-inline-end: 0;
  margin-inline-start: var(--oas-space-1);
}
.integer {
  line-height: 1;
}
.decimal {
  line-height: 1;
}
.original {
  color: var(--oas-price-original-color, var(--oas-color-text-secondary));
  font-size: var(--oas-font-size-sm);
  text-decoration: line-through;
}
.trend {
  gap: var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
}
.trend[data-trend='up'] {
  color: var(--oas-price-up-color, var(--oas-color-danger-text));
}
.trend[data-trend='down'] {
  color: var(--oas-price-down-color, var(--oas-color-success-text));
}
.trend svg {
  width: 1em;
  height: 1em;
  fill: currentColor;
  align-self: center;
}
.separator {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-md);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: calc(-1 * var(--oas-space-1) / 2);
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
[hidden] {
  display: none !important;
}

@media (forced-colors: active) {
  .original {
    color: CanvasText;
  }
}
`

/** 小数位归一：0–20 整数；空串/非法回退 2 */
function resolvePrecision(raw: string): number {
  if (raw.trim() === '') return DEFAULT_PRECISION
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0 || n > MAX_PRECISION) return DEFAULT_PRECISION
  return n
}

/** locale 归一：非法 BCP47 回落 zh-CN（Intl 对非法 tag 会抛 RangeError） */
function resolveLocale(raw: string): string {
  const value = raw.trim()
  if (value === '') return 'zh-CN'
  try {
    // 构造一次验证标签合法性；支持程度交给运行时默认回退
    return new Intl.NumberFormat(value).resolvedOptions().locale
  } catch {
    return 'zh-CN'
  }
}

/** 币种归一：非法 ISO 代码回落 CNY */
function resolveCurrency(raw: string): string {
  const value = raw.trim().toUpperCase()
  if (value === '') return 'CNY'
  try {
    new Intl.NumberFormat('en', { style: 'currency', currency: value })
    return value
  } catch {
    return 'CNY'
  }
}

export class OASPrice extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'min', 'max', 'original', 'currency', 'locale', 'precision', 'size', 'trend', 'trend-value']
  }

  private rootEl: HTMLElement | null = null
  private priceEl: HTMLElement | null = null
  private originalEl: HTMLElement | null = null
  private trendEl: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <span class="root">
        <span class="price"></span>
        <s class="original" part="original" hidden></s>
        <span class="trend" hidden></span>
      </span>
    `
  }

  private bind(): void {
    this.rootEl = this.shadow.querySelector<HTMLElement>('.root')
    this.priceEl = this.shadow.querySelector<HTMLElement>('.price')
    this.originalEl = this.shadow.querySelector<HTMLElement>('.original')
    this.trendEl = this.shadow.querySelector<HTMLElement>('.trend')
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override update(): void {
    const root = this.rootEl
    if (!root) return

    const size: PriceSize = (VALID_SIZES as readonly string[]).includes(this.getAttr('size'))
      ? (this.getAttr('size') as PriceSize)
      : 'md'
    root.setAttribute('data-size', size)

    const locale = resolveLocale(this.getAttr('locale') || document.documentElement.lang)
    const currency = resolveCurrency(this.getAttr('currency'))
    const precision = resolvePrecision(this.getAttr('precision'))

    const valueRaw = this.getAttr('value').trim()
    const minRaw = this.getAttr('min').trim()
    const maxRaw = this.getAttr('max').trim()

    const single = this.parseNumber(valueRaw)
    const rangeMin = single === null ? this.parseNumber(minRaw) : null
    const rangeMax = single === null ? this.parseNumber(maxRaw) : null

    this.priceEl?.replaceChildren()
    if (this.priceEl) {
      if (single !== null) {
        this.priceEl.setAttribute('part', 'price')
        this.appendAmount(this.priceEl, single, locale, currency, precision)
      } else if (rangeMin !== null && rangeMax !== null) {
        this.priceEl.setAttribute('part', 'price')
        this.appendAmount(this.priceEl, rangeMin, locale, currency, precision)
        const sep = document.createElement('span')
        sep.className = 'separator'
        sep.setAttribute('part', 'separator')
        sep.setAttribute('aria-hidden', 'true')
        sep.textContent = '~'
        this.priceEl.appendChild(sep)
        this.appendAmount(this.priceEl, rangeMax, locale, currency, precision)
      } else {
        // 空态：不渲染残缺价格（part="price" 同时移除，宿主内容为空）
        this.priceEl.removeAttribute('part')
      }
    }

    // 划线原价：<s> + visually-hidden「原价」前缀（读屏得到「原价 ¥199.00」）
    const original = this.parseNumber(this.getAttr('original').trim())
    if (this.originalEl) {
      this.originalEl.replaceChildren()
      this.originalEl.hidden = original === null
      if (original !== null) {
        const label = document.createElement('span')
        label.className = 'sr-only'
        label.textContent = `${this.t('price.original')} `
        this.originalEl.appendChild(label)
        this.appendAmount(this.originalEl, original, locale, currency, precision)
      }
    }

    this.syncTrend(locale)
  }

  /** 趋势区：up/down 箭头 + 方向读屏文案 + 涨跌幅文本 */
  private syncTrend(locale: string): void {
    const trend = this.trendEl
    if (!trend) return
    const dir = this.getAttr('trend')
    const valid = dir === 'up' || dir === 'down'
    trend.hidden = !valid
    if (!valid) {
      trend.replaceChildren()
      trend.removeAttribute('part')
      trend.removeAttribute('data-trend')
      return
    }
    trend.setAttribute('part', 'trend')
    trend.setAttribute('data-trend', dir)
    const raw = this.getAttr('trend-value').trim()
    const num = this.parseNumber(raw)
    const text = num === null ? raw : `${dir === 'up' ? '+' : '-'}${this.formatPlain(Math.abs(num), locale)}%`

    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    arrow.setAttribute('viewBox', '0 0 16 16')
    arrow.setAttribute('aria-hidden', 'true')
    arrow.setAttribute('focusable', 'false')
    arrow.innerHTML = dir === 'up' ? arrowUpPath : arrowDownPath
    const label = document.createElement('span')
    label.className = 'sr-only'
    label.textContent = `${dir === 'up' ? this.t('price.trendUp') : this.t('price.trendDown')} `
    const valueEl = document.createElement('span')
    valueEl.className = 'trend-value'
    valueEl.textContent = text
    trend.replaceChildren(arrow, label, valueEl)
  }

  /** 数值解析：空串/非有限数返回 null */
  private parseNumber(raw: string): number | null {
    if (raw === '') return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }

  /** 纯数字格式（趋势百分比用：不带币种、最多两位小数） */
  private formatPlain(n: number, locale: string): string {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n)
  }

  /** 追加一段金额：符号/整数/小数按 Intl parts 的真实顺序排列 */
  private appendAmount(host: HTMLElement, value: number, locale: string, currency: string, precision: number): void {
    const parts = this.intlParts(value, locale, currency, precision)
    const symbol = document.createElement('span')
    symbol.className = 'symbol'
    symbol.setAttribute('part', 'symbol')
    symbol.textContent = parts.symbol
    if (parts.symbolAfter) symbol.setAttribute('data-after', 'true')
    const integer = document.createElement('span')
    integer.className = 'integer'
    integer.setAttribute('part', 'amount')
    integer.textContent = parts.integer
    const nodes: HTMLElement[] = [integer]
    if (parts.decimal !== '') {
      const decimal = document.createElement('span')
      decimal.className = 'decimal'
      decimal.setAttribute('part', 'decimal')
      decimal.textContent = parts.decimal
      nodes.push(decimal)
    }

    if (parts.symbolAfter) host.append(...nodes, symbol)
    else host.append(symbol, ...nodes)
  }

  /** Intl 部件拆分：number 部分只保留整数/分组，decimal 保留小数点与小数位 */
  private intlParts(value: number, locale: string, currency: string, precision: number): PriceParts {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    })
    const parts = formatter.formatToParts(value)
    let symbol = ''
    let integer = ''
    let decimal = ''
    let currencyIndex = -1
    let integerIndex = -1
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!
      if (part.type === 'currency') {
        symbol = part.value
        currencyIndex = i
      } else if (part.type === 'integer' || part.type === 'group') {
        integer += part.value
        if (integerIndex < 0) integerIndex = i
      } else if (part.type === 'decimal' || part.type === 'fraction') {
        decimal += part.value
      }
    }
    return { symbol, integer, decimal, symbolAfter: currencyIndex > integerIndex }
  }
}
