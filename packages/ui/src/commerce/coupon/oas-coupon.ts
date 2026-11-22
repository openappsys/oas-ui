import { OASElement } from '@oas-ui/core/oas-element'
import { closePath } from '@oas-ui/icons/icons/close'
import { chevronDownPath } from '@oas-ui/icons/icons/chevron-down'
import { parseJsonArray } from '../../shared/json-array.js'
import { normalizeChoice } from '../../shared/choice.js'
import { devWarn } from '../../shared/dev-warn.js'

/**
 * oas-coupon —— 优惠券（commerce 族）。
 *
 * 两种形态共用一份券面渲染：
 * - **券面卡片**（默认）：面额 / 使用门槛 / 有效期 / 状态语义色；
 * - **选择弹层**（`list` 在场）：触发按钮 + 底部弹层列表，可用券可选、过期 / 已使用 /
 *   未达门槛券禁用，选中即派发 `oas-select` 并关闭。
 *
 * 属性（kebab-case）：
 * - `amount`：面额（数字，必填；卡片模式）
 * - `threshold`：使用门槛（数字，0/缺省 = 无门槛）
 * - `currency`：ISO 4217 币种，默认 `CNY`
 * - `locale`：金额与日期格式化 locale；缺省取文档 `<html lang>`，再退回 `zh-CN`
 * - `start` / `end`：有效期起止（`YYYY-MM-DD`）；`validity` 文本优先（宿主完全控制展示）
 * - `validity`：有效期文案覆盖（如「长期有效」）
 * - `status`：`available`（默认）/ `expired` / `used` / `unavailable`（未达门槛等，配 `reason`）
 * - `reason`：不可用原因文案（`status="unavailable"` 时展示）
 * - `code`：券标识（事件 detail 回传）
 * - `selected`：选中态标记（供外层组合排版）
 * - `list`：JSON 数组——选择列表 `[{ code, amount, threshold?, start?, end?, validity?, status?, reason? }]`
 * - `trigger-text`：触发按钮文案（缺省 i18n `coupon.select`；已选券时显示所选面额）
 * - `open`：弹层开合（受控属性；宿主写入静默生效，交互引起的变化派发 `oas-open-change`）
 *
 * 方法：
 * - `open()` / `close()`：命令式开合（派发 `oas-open-change`）
 *
 * 事件（bubbles + composed）：
 * - `oas-select`：选中可用券，detail `{ code, coupon }`，随后关闭弹层
 * - `oas-open-change`：交互/命令式开合，detail `{ open }`（受控属性写入不派发）
 *
 * a11y：触发按钮 `aria-haspopup="dialog"` + `aria-expanded`；弹层 `role="dialog"` +
 * `aria-modal` + 标题关联；列表用原生 radio（方向键切换）；Esc 关闭并归还焦点；
 * 遮罩点击关闭；打开时焦点移入弹层，Tab 在弹层内循环。
 */

export type CouponStatus = 'available' | 'expired' | 'used' | 'unavailable'

export interface CouponData {
  code: string
  amount: number
  threshold: number
  start: string
  end: string
  validity: string
  status: CouponStatus
  reason: string
}

export interface CouponSelectDetail {
  code: string
  coupon: CouponData
}

export interface CouponOpenChangeDetail {
  open: boolean
}

const VALID_STATUS: readonly CouponStatus[] = ['available', 'expired', 'used', 'unavailable']
const DIALOG_TITLE_ID = 'oas-coupon-title'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
/* ---------- 券面 ---------- */
.coupon {
  --coupon-accent: var(--oas-color-primary-text);
  --coupon-surface: var(--oas-color-bg);
  display: flex;
  align-items: center;
  gap: var(--oas-space-3);
  box-sizing: border-box;
  padding: var(--oas-space-3) var(--oas-space-4);
  border: 1px solid var(--oas-color-border);
  border-inline-start: 4px solid var(--coupon-accent);
  border-radius: var(--oas-radius-lg);
  background: var(--coupon-surface);
}
.coupon[data-status='expired'],
.coupon[data-status='used'] {
  --coupon-accent: var(--oas-color-text-disabled);
  --coupon-surface: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-secondary);
}
.coupon[data-status='unavailable'] {
  --coupon-accent: var(--oas-color-warning);
}
.coupon[data-selected='true'] {
  border-color: var(--oas-color-primary);
  background: color-mix(in srgb, var(--oas-color-primary) 6%, var(--oas-color-bg));
}
.amount {
  display: inline-flex;
  align-items: baseline;
  flex: none;
  color: var(--coupon-accent);
  font-weight: 600;
  white-space: nowrap;
  font-size: var(--oas-font-size-xl);
  line-height: 1;
}
.coupon[data-status='expired'] .amount,
.coupon[data-status='used'] .amount {
  color: var(--oas-color-text-disabled);
}
.meta {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  flex: 1 1 auto;
  min-width: 0;
}
.condition {
  font-size: var(--oas-font-size-md);
}
.validity {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.state {
  flex: none;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  text-align: end;
  max-width: 40%;
}
.coupon[data-status='unavailable'] .state {
  color: color-mix(in srgb, var(--oas-color-warning-text) var(--oas-deep-mix, 72%), var(--oas-deep-sink, black));
}
.validity[hidden],
.state[hidden],
.meta[hidden] {
  display: none;
}
/* ---------- 触发按钮 ---------- */
.trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2);
  box-sizing: border-box;
  width: 100%;
  min-height: var(--oas-control-height-lg, 40px);
  padding: 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-md);
  cursor: pointer;
  text-align: start;
}
.trigger:hover {
  background: var(--oas-color-bg-hover);
}
.trigger:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.trigger-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.arrow {
  flex: none;
  display: block;
  width: 1em;
  height: 1em;
  fill: currentColor;
  color: var(--oas-color-text-secondary);
}
/* ---------- 弹层 ---------- */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.overlay[hidden] {
  display: none;
}
.backdrop {
  position: absolute;
  inset: 0;
  background: var(--oas-color-overlay);
}
.panel {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  max-width: 520px;
  max-height: 70vh;
  padding: var(--oas-space-3) var(--oas-space-4) var(--oas-space-4);
  border-start-start-radius: var(--oas-radius-xl);
  border-start-end-radius: var(--oas-radius-xl);
  background: var(--oas-color-bg);
  box-shadow: var(--oas-shadow-lg);
  animation: oas-coupon-rise var(--oas-transition-base) var(--oas-ease-out);
}
@keyframes oas-coupon-rise {
  from {
    transform: translateY(16px);
    opacity: 0;
  }
  to {
    transform: none;
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .panel {
    animation: none;
  }
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2);
  padding-block-end: var(--oas-space-2);
}
.title {
  margin: 0;
  font-size: var(--oas-font-size-lg);
  font-weight: 600;
}
.close {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--oas-control-height-sm, 24px);
  min-height: var(--oas-control-height-sm, 24px);
  padding: var(--oas-space-1);
  border: none;
  border-radius: var(--oas-radius-sm);
  background: none;
  color: var(--oas-color-text-secondary);
  font-family: inherit;
  cursor: pointer;
}
.close:hover {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
}
.close:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.close svg {
  width: 1em;
  height: 1em;
  display: block;
  fill: currentColor;
}
.list {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  overflow-y: auto;
  padding-block-start: var(--oas-space-1);
}
.list[hidden] {
  display: none;
}
.option {
  position: relative;
  display: block;
  cursor: pointer;
  border-radius: var(--oas-radius-lg);
}
.option:focus-within {
  box-shadow: var(--oas-focus-ring);
}
.option[data-status='expired'],
.option[data-status='used'],
.option[data-status='unavailable'] {
  cursor: not-allowed;
}
.option-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
.empty {
  padding: var(--oas-space-6) 0;
  text-align: center;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.empty[hidden] {
  display: none;
}

@media (forced-colors: active) {
  .trigger:focus-visible,
  .close:focus-visible,
  .option:focus-within {
    outline: 1px solid CanvasText;
    outline-offset: 2px;
    box-shadow: none;
  }
}
`

/** 金额格式化（券面额/门槛取整币值；非法值回落原始数字文本） */
function formatMoney(value: number, locale: string, currency: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return String(value)
  }
}

/** locale 归一：非法 BCP47 回落 zh-CN */
function resolveLocale(raw: string): string {
  const value = raw.trim()
  if (value === '') return 'zh-CN'
  try {
    return new Intl.NumberFormat(value).resolvedOptions().locale
  } catch {
    return 'zh-CN'
  }
}

/** 日期区间格式化：ISO 日期 → locale 短日期；非法日期原样透出 */
function formatDateRange(start: string, end: string, locale: string): string {
  if (start === '' && end === '') return ''
  const fmt = (raw: string): string => {
    if (raw === '') return ''
    const date = new Date(`${raw}T00:00:00`)
    if (Number.isNaN(date.getTime())) return raw
    try {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)
    } catch {
      return raw
    }
  }
  const left = fmt(start)
  const right = fmt(end)
  if (left && right) return `${left} ~ ${right}`
  return left || right
}

export class OASCoupon extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'amount',
      'threshold',
      'currency',
      'locale',
      'start',
      'end',
      'validity',
      'status',
      'reason',
      'code',
      'selected',
      'list',
      'trigger-text',
      'open',
    ]
  }

  private cardModeEl: HTMLElement | null = null
  private cardHostEl: HTMLElement | null = null
  private listModeEl: HTMLElement | null = null
  private triggerEl: HTMLButtonElement | null = null
  private triggerTextEl: HTMLElement | null = null
  private overlayEl: HTMLElement | null = null
  private backdropEl: HTMLElement | null = null
  private panelEl: HTMLElement | null = null
  private titleEl: HTMLElement | null = null
  private titleTextEl: HTMLElement | null = null
  private listEl: HTMLElement | null = null
  private emptyEl: HTMLElement | null = null
  private closeEl: HTMLButtonElement | null = null

  /** 已选券 code（列表模式）；空串 = 未选 */
  private selectedCode = ''
  /** 上一帧开合态（焦点迁移与关闭归还只在真实跳变时执行） */
  private lastOpen = false
  /** 打开前的焦点元素（关闭时归还） */
  private lastFocus: HTMLElement | null = null

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="card-mode" part="card-mode"><div class="card-host"></div></div>
      <div class="list-mode" part="list-mode" hidden>
        <button class="trigger" part="trigger" type="button" aria-haspopup="dialog" aria-expanded="false">
          <span class="trigger-text" part="trigger-text"></span>
          <svg class="arrow" viewBox="0 0 16 16" aria-hidden="true" focusable="false">${chevronDownPath}</svg>
        </button>
      </div>
      <div class="overlay" part="overlay" hidden>
        <div class="backdrop" part="backdrop"></div>
        <section class="panel" part="panel" role="dialog" aria-modal="true" aria-labelledby="${DIALOG_TITLE_ID}">
          <header class="head">
            <h2 class="title" part="title" id="${DIALOG_TITLE_ID}"></h2>
            <button class="close" part="close" type="button" aria-label="">
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${closePath}</svg>
            </button>
          </header>
          <div class="list" part="list" role="radiogroup" aria-labelledby="${DIALOG_TITLE_ID}"></div>
          <div class="empty" part="empty" hidden></div>
        </section>
      </div>
    `
  }

  private bind(): void {
    this.cardModeEl = this.shadow.querySelector<HTMLElement>('[part="card-mode"]')
    this.cardHostEl = this.shadow.querySelector<HTMLElement>('.card-host')
    this.listModeEl = this.shadow.querySelector<HTMLElement>('[part="list-mode"]')
    this.triggerEl = this.shadow.querySelector<HTMLButtonElement>('[part="trigger"]')
    this.triggerTextEl = this.shadow.querySelector<HTMLElement>('[part="trigger-text"]')
    this.overlayEl = this.shadow.querySelector<HTMLElement>('[part="overlay"]')
    this.backdropEl = this.shadow.querySelector<HTMLElement>('[part="backdrop"]')
    this.panelEl = this.shadow.querySelector<HTMLElement>('[part="panel"]')
    this.titleEl = this.shadow.querySelector<HTMLElement>('[part="title"]')
    this.titleTextEl = this.titleEl
    this.listEl = this.shadow.querySelector<HTMLElement>('[part="list"]')
    this.emptyEl = this.shadow.querySelector<HTMLElement>('[part="empty"]')
    this.closeEl = this.shadow.querySelector<HTMLButtonElement>('[part="close"]')

    this.triggerEl?.addEventListener('click', this.onTriggerClick)
    this.backdropEl?.addEventListener('click', this.onBackdropClick)
    this.closeEl?.addEventListener('click', this.onCloseClick)
    this.panelEl?.addEventListener('keydown', this.onPanelKeydown)
    this.listEl?.addEventListener('change', this.onListChange)
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
  // 开合
  // -------------------------------------------------------------------------

  /** 命令式打开（幂等；派发 open-change） */
  open(): void {
    if (this.hasAttribute('open')) return
    this.lastFocus = this.shadow.activeElement as HTMLElement | null
    this.setAttribute('open', '')
    this.emit('open-change', { open: true } satisfies CouponOpenChangeDetail)
  }

  /** 命令式关闭（幂等；派发 open-change） */
  close(): void {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.emit('open-change', { open: false } satisfies CouponOpenChangeDetail)
  }

  private onTriggerClick = (): void => {
    this.open()
  }

  private onCloseClick = (): void => {
    this.close()
  }

  private onBackdropClick = (): void => {
    this.close()
  }

  /** 面板键盘：Esc 关闭；Tab 在面板内循环（焦点陷阱） */
  private onPanelKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      this.close()
      return
    }
    if (event.key !== 'Tab' || !this.panelEl) return
    const focusables = [
      ...this.panelEl.querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])'),
    ].filter((node) => !(node as HTMLButtonElement).disabled && !node.hidden)
    if (focusables.length === 0) return
    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!
    const active = this.shadow.activeElement
    if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    } else if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus()
    }
  }

  /** 列表选择：仅可用券可选中，选中即派发并关闭 */
  private onListChange = (event: Event): void => {
    const input = event.target as HTMLInputElement | null
    if (!input || input.type !== 'radio' || !input.value) return
    const coupon = this.parseList().find((item) => item.code === input.value)
    if (!coupon || coupon.status !== 'available') return
    this.selectedCode = coupon.code
    this.emit('select', { code: coupon.code, coupon } satisfies CouponSelectDetail)
    this.close()
    this.update()
  }

  // -------------------------------------------------------------------------
  // 渲染
  // -------------------------------------------------------------------------

  /** 卡面模式数据（自身属性） */
  private ownCoupon(): CouponData | null {
    const amount = Number(this.getAttr('amount'))
    if (!Number.isFinite(amount)) return null
    const threshold = Number(this.getAttr('threshold'))
    const rawStatus = this.getAttr('status', 'available')
    return {
      code: this.getAttr('code'),
      amount,
      threshold: Number.isFinite(threshold) ? threshold : 0,
      start: this.getAttr('start'),
      end: this.getAttr('end'),
      validity: this.getAttr('validity'),
      status: normalizeChoice(rawStatus, 'available', VALID_STATUS) as CouponStatus,
      reason: this.getAttr('reason'),
    }
  }

  /** 列表数据：非法 JSON 告警一次并回落空数组 */
  private parseList(): CouponData[] {
    return parseJsonArray<Record<string, unknown>>(this.getAttr('list'), () =>
      devWarn('[oas-coupon] list 不是合法 JSON 数组，已忽略'),
    )
      .map((raw) => this.normalizeCoupon(raw))
      .filter((item): item is CouponData => item !== null)
  }

  private normalizeCoupon(raw: Record<string, unknown>): CouponData | null {
    if (raw == null || typeof raw !== 'object') return null
    const amount = Number(raw.amount)
    if (!Number.isFinite(amount)) return null
    const threshold = Number(raw.threshold ?? 0)
    const status = normalizeChoice(String(raw.status ?? 'available'), 'available', VALID_STATUS) as CouponStatus
    return {
      code: typeof raw.code === 'string' && raw.code !== '' ? raw.code : String(amount),
      amount,
      threshold: Number.isFinite(threshold) ? threshold : 0,
      start: typeof raw.start === 'string' ? raw.start : '',
      end: typeof raw.end === 'string' ? raw.end : '',
      validity: typeof raw.validity === 'string' ? raw.validity : '',
      status,
      reason: typeof raw.reason === 'string' ? raw.reason : '',
    }
  }

  private resolveLocale(): string {
    return resolveLocale(this.getAttr('locale') || document.documentElement.lang)
  }

  /** 券面 DOM：card / 列表选项共用 */
  private renderCard(data: CouponData, currency: string, locale: string, selected: boolean): HTMLElement {
    const card = document.createElement('div')
    card.className = 'coupon'
    card.setAttribute('part', 'coupon')
    card.setAttribute('data-status', data.status)
    if (selected) card.setAttribute('data-selected', 'true')

    const amount = document.createElement('span')
    amount.className = 'amount'
    amount.setAttribute('part', 'amount')
    amount.textContent = formatMoney(data.amount, locale, currency)

    const meta = document.createElement('span')
    meta.className = 'meta'
    const condition = document.createElement('span')
    condition.className = 'condition'
    condition.setAttribute('part', 'condition')
    condition.textContent =
      data.threshold > 0
        ? this.t('coupon.threshold', { amount: formatMoney(data.threshold, locale, currency) })
        : this.t('coupon.noThreshold')
    meta.appendChild(condition)

    const validityText = data.validity || formatDateRange(data.start, data.end, locale)
    const validity = document.createElement('span')
    validity.className = 'validity'
    validity.setAttribute('part', 'validity')
    validity.textContent = validityText
    validity.hidden = validityText === ''
    meta.appendChild(validity)

    const state = document.createElement('span')
    state.className = 'state'
    state.setAttribute('part', 'state')
    state.textContent = this.statusText(data)
    state.hidden = state.textContent === ''

    card.append(amount, meta, state)
    return card
  }

  private statusText(data: CouponData): string {
    if (data.status === 'expired') return this.t('coupon.expired')
    if (data.status === 'used') return this.t('coupon.used')
    if (data.status === 'unavailable') return data.reason
    return ''
  }

  /** 列表选项：原生 radio 承载键盘/方向键语义，卡面作为可点击标签内容 */
  private renderOption(data: CouponData, currency: string, locale: string, index: number): HTMLElement {
    const label = document.createElement('label')
    label.className = 'option'
    label.setAttribute('part', 'option')
    label.setAttribute('data-status', data.status)
    label.setAttribute('data-code', data.code)
    const input = document.createElement('input')
    input.type = 'radio'
    input.className = 'option-input'
    input.name = 'oas-coupon-choice'
    input.value = data.code
    input.id = `oas-coupon-option-${index}`
    input.disabled = data.status !== 'available'
    input.checked = data.code === this.selectedCode
    label.appendChild(input)
    label.appendChild(this.renderCard(data, currency, locale, data.code === this.selectedCode))
    return label
  }

  protected override update(): void {
    if (!this.cardHostEl || !this.triggerEl) return
    const locale = this.resolveLocale()
    const currency = this.getAttr('currency', 'CNY').trim().toUpperCase() || 'CNY'
    const listMode = this.hasAttribute('list')
    const list = this.parseList()

    this.cardModeEl!.hidden = listMode
    this.listModeEl!.hidden = !listMode

    if (listMode) {
      const selected = this.selectedCode ? list.find((item) => item.code === this.selectedCode) : undefined
      this.triggerTextEl!.textContent = this.triggerLabel(list, locale, currency)
      this.triggerEl.setAttribute(
        'aria-label',
        selected
          ? `${this.t('coupon.select')} ${formatMoney(selected.amount, locale, currency)}`
          : this.getAttr('trigger-text') || this.t('coupon.select'),
      )
      this.titleTextEl!.textContent = this.t('coupon.select')
      this.closeEl!.setAttribute('aria-label', this.t('coupon.close'))
      this.emptyEl!.textContent = this.t('coupon.empty')
      this.emptyEl!.hidden = list.length > 0
      this.listEl!.replaceChildren(...list.map((item, i) => this.renderOption(item, currency, locale, i)))
    } else {
      this.cardHostEl.replaceChildren()
      const own = this.ownCoupon()
      if (own) this.cardHostEl.appendChild(this.renderCard(own, currency, locale, this.hasAttr('selected')))
      this.listEl!.replaceChildren()
    }

    this.syncOpenState()
  }

  /** 触发按钮文案：已选券显示面额，否则 trigger-text / i18n */
  private triggerLabel(list: CouponData[], locale: string, currency: string): string {
    const selected = this.selectedCode ? list.find((item) => item.code === this.selectedCode) : undefined
    if (selected) return formatMoney(selected.amount, locale, currency)
    return this.getAttr('trigger-text') || this.t('coupon.select')
  }

  /** 开合同步：显隐 + aria + 焦点迁移（只在真实跳变时执行，避免 locale 重刷抢焦点） */
  private syncOpenState(): void {
    if (!this.overlayEl || !this.triggerEl) return
    const open = this.hasAttribute('open')
    this.overlayEl.hidden = !open
    this.triggerEl.setAttribute('aria-expanded', String(open))
    if (open === this.lastOpen) return
    this.lastOpen = open
    if (open) {
      if (!this.lastFocus) this.lastFocus = this.shadow.activeElement as HTMLElement | null
      // 焦点移入弹层：优先已选项，其次首个可用项，最后关闭按钮
      const checked = this.listEl?.querySelector<HTMLInputElement>('input:checked:not(:disabled)')
      const firstAvailable = this.listEl?.querySelector<HTMLInputElement>('input:not(:disabled)')
      const target = checked ?? firstAvailable ?? this.closeEl
      ;(target ?? this.closeEl)?.focus()
    } else {
      const focus = this.lastFocus
      this.lastFocus = null
      if (focus && focus.isConnected) focus.focus()
      else this.triggerEl.focus()
    }
  }
}
