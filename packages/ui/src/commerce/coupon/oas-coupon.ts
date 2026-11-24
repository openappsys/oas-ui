import { OASElement } from '@oas-ui/core/oas-element'
import { closePath } from '@oas-ui/icons/icons/close'
import { chevronDownPath } from '@oas-ui/icons/icons/chevron-down'
import { lockBodyScroll, pushEscapeLayer } from '../../shared/overlay-stack.js'
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
 * - `open`：弹层开合（受控：宿主写 attribute / property 即生效且静默；用户交互与命令式
 *   `openOverlay()` / `closeOverlay()` 改变开合时派发 `oas-open-change`）
 * - `z-index`：弹层层级（数值叠加 `--oas-z-index-base`，缺省沿用层叠阶梯）
 * - `multiple`：多选模式——选项变 checkbox，勾选即派发 `oas-select`（detail 为数组）且弹层
 *   不自动关闭（由宿主决定何时收起）；触发按钮显示已选张数；缺省单选（行为不变）
 * - `show-count`：可用 / 不可用分组标题带计数胶囊
 *
 * 列表弹层结构：「不使用优惠券」出口（`part="clear-entry"`）+ 可用 / 不可用两个分组
 * （`part="group-head"` / `part="group-body"`，标题走 i18n，空组不渲染）。
 *
 * 方法：
 * - `openOverlay()` / `closeOverlay()`：命令式开合（幂等；派发 `oas-open-change`）
 * - `clearSelection()`：清空已选券（静默，供宿主重置选择状态）
 *
 * property 通道：`list` 与 `open` 同时是读+写访问器（setter 接受数组 / 布尔或 JSON 字符串
 * 并反射 attribute），供框架把模板静态属性直接写成 property 时走同一份数据入口。
 *
 * 事件（bubbles + composed）：
 * - `oas-select`：选中可用券派发。单选（默认）detail `{ code, coupon }` 并随后关闭弹层；
 *   `multiple` 模式 detail `{ codes, coupons }`（数组，弹层不关）；「不使用优惠券」出口
 *   派发空选——单选 `{ code: '', coupon: null }` / 多选 `{ codes: [], coupons: [] }`
 * - `oas-clear`：点击「不使用优惠券」出口派发（紧随其后是空选 `oas-select`，两个事件成对）
 * - `oas-open-change`：交互/命令式开合，detail `{ open }`（受控属性写入不派发）
 *
 * a11y：触发按钮 `aria-haspopup="dialog"` + `aria-expanded`；弹层 `role="dialog"` +
 * `aria-modal` + 标题关联；列表用原生 radio（方向键切换）；Esc 关闭并归还焦点；
 * 遮罩点击关闭；打开时焦点移入弹层，Tab 在弹层内循环。
 *
 * 层叠协议（对齐 modal）：弹层打开即持 body 滚动锁（跨组件引用计数）并压入共享 Esc 层栈，
 * 关闭/断开时释放。多层浮层同开时一次 Esc 只关最上层（后开者先关），不再由组件自建的
 * 面板 keydown 抢走 Esc。
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
  coupon: CouponData | null
}

/** multiple 模式的 oas-select detail（数组契约；空选 = 两个空数组） */
export interface CouponMultiSelectDetail {
  codes: string[]
  coupons: CouponData[]
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
  /* 弱化底上的次级文字走安全档：secondary on bg-hover 仅 4.39，不到 WCAG AA 4.5 */
  color: var(--oas-color-text-secondary-strong);
}
.coupon[data-status='unavailable'] {
  /* 未达门槛等：面额与左侧色条走加深档 warning-text（浅色底上可读，暗色由 deep-mix 提亮） */
  --coupon-accent: color-mix(in srgb, var(--oas-color-warning-text) var(--oas-deep-mix, 72%), var(--oas-deep-sink, black));
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
  /* 卡片可能落在选中态/弱化底的着色面上：小字走安全档保证 ≥4.5 */
  color: var(--oas-color-text-secondary-strong);
}
.state {
  flex: none;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  text-align: end;
  max-width: 40%;
}
.coupon[data-status='expired'] .state,
.coupon[data-status='used'] .state {
  color: var(--oas-color-text-secondary-strong);
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
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-modal, 1050));
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
/* ---------- 分组与出口 ---------- */
.clear-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  min-height: var(--oas-control-height-lg, 40px);
  margin-block-end: var(--oas-space-1);
  border: 1px dashed var(--oas-color-border-strong);
  border-radius: var(--oas-radius-md);
  background: transparent;
  color: var(--oas-color-text-secondary);
  font-family: inherit;
  font-size: var(--oas-font-size-md);
  cursor: pointer;
  transition:
    color var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out),
    background var(--oas-transition-fast) var(--oas-ease-out);
}
.clear-entry:hover {
  color: var(--oas-color-primary-text);
  border-color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.clear-entry:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.group-head {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  padding-block: var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.group-count {
  min-width: var(--oas-control-height-sm, 24px);
  padding: 0 var(--oas-space-1);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-secondary-strong);
  font-size: var(--oas-font-size-xs);
  line-height: 1.4;
  text-align: center;
}
.group-body {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}

@media (forced-colors: active) {
  .trigger:focus-visible,
  .close:focus-visible,
  .option:focus-within,
  .clear-entry:focus-visible {
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
      'z-index',
      'multiple',
      'show-count',
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

  /** 已选券 code（列表单选模式）；空串 = 未选 */
  private selectedCode = ''
  /** 已选券 code 集（multiple 模式） */
  private selectedCodes = new Set<string>()
  /** 分组列表构建签名（list 原文 / 模式 / 计数 / 文案）；仅勾选变化时不重建 */
  private renderedListSignature = ''
  /** 上一帧开合态（焦点迁移与关闭归还只在真实跳变时执行） */
  private lastOpen = false
  /** 打开前的焦点元素（关闭时归还） */
  private lastFocus: HTMLElement | null = null
  /** 卡片模式缺少 amount 的 dev 告警去重（实例级一次） */
  private warnedMissingAmount = false
  /** 打开态的共享层栈退栈函数（关闭/断开连接时释放） */
  private releaseEscapeLayer: (() => void) | null = null
  /** 打开态的 body 滚动锁释放函数（跨组件引用计数） */
  private releaseScrollLock: (() => void) | null = null

  // -------------------------------------------------------------------------
  // property 通道（框架把模板静态属性写成 property 时的数据入口）
  // -------------------------------------------------------------------------

  /** 选择列表（读=归一后的券数据；写=接受数组或 JSON 字符串，反射 `list` attribute） */
  get list(): CouponData[] {
    return this.parseList()
  }
  set list(value: CouponData[] | string) {
    this.setAttribute('list', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** 弹层开合（受控：读写即反射 `open` attribute，静默不派发事件） */
  get open(): boolean {
    return this.hasAttribute('open')
  }
  set open(value: boolean | string) {
    // presence 语义：静态 `<oas-coupon open>` 经框架 property 通道写入的是空串，
    // 空串必须视为打开；仅 false / 'false' 关闭。
    const on = value !== false && value !== 'false' && value != null
    this.toggleAttribute('open', on)
  }

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
          <div class="list" part="list" aria-labelledby="${DIALOG_TITLE_ID}"></div>
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
    // 「不使用优惠券」出口走容器事件委托：分组列表按签名重建后按钮是全新节点，
    // 直连监听会随 replaceChildren 丢失；容器本身在静态模板里，委托监听永远有效
    this.listEl?.addEventListener('click', (event) => {
      if ((event.target as HTMLElement | null)?.closest?.('[part="clear-entry"]')) this.onClearEntryClick()
    })
    // 断开连接必须退栈并解锁（否则残留幽灵 Esc 层 + body 永久锁死）；
    // 重连走 bind() 重新注册，打开态由 syncOpenState 重新持锁
    this.onCleanup(() => this.releaseOverlay())
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
  openOverlay(): void {
    if (this.hasAttribute('open')) return
    this.lastFocus = this.shadow.activeElement as HTMLElement | null
    this.setAttribute('open', '')
    this.emit('open-change', { open: true } satisfies CouponOpenChangeDetail)
  }

  /** 命令式关闭（幂等；派发 open-change） */
  closeOverlay(): void {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.emit('open-change', { open: false } satisfies CouponOpenChangeDetail)
  }

  /** 清空已选券（静默：不派发事件；供宿主重置选择状态） */
  clearSelection(): void {
    this.selectedCode = ''
    this.selectedCodes.clear()
    this.update()
  }

  private onTriggerClick = (): void => {
    this.openOverlay()
  }

  private onCloseClick = (): void => {
    this.closeOverlay()
  }

  private onBackdropClick = (): void => {
    this.closeOverlay()
  }

  /** 面板键盘：Tab 在面板内循环（焦点陷阱）；Esc 由共享层栈统一处理（不再本地拦截） */
  private onPanelKeydown = (event: KeyboardEvent): void => {
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

  /** 列表选择：单选 radio（选中即派发并关闭）；multiple checkbox（切换派发数组、弹层不关） */
  private onListChange = (event: Event): void => {
    const input = event.target as HTMLInputElement | null
    if (!input || !input.value) return
    const coupon = this.parseList().find((item) => item.code === input.value)
    if (!coupon || coupon.status !== 'available') return
    if (input.type === 'checkbox') {
      if (input.checked) this.selectedCodes.add(coupon.code)
      else this.selectedCodes.delete(coupon.code)
      this.emit('select', {
        codes: [...this.selectedCodes],
        coupons: this.parseList().filter((item) => this.selectedCodes.has(item.code)),
      } satisfies CouponMultiSelectDetail)
      this.update()
      return
    }
    this.selectedCode = coupon.code
    this.emit('select', { code: coupon.code, coupon } satisfies CouponSelectDetail)
    this.closeOverlay()
    this.update()
  }

  /** 「不使用优惠券」出口：派发 oas-clear + 空选 oas-select（成对），随后关闭弹层 */
  private onClearEntryClick = (): void => {
    const multiple = this.hasAttr('multiple')
    this.selectedCode = ''
    this.selectedCodes.clear()
    this.emit('clear')
    this.emit(
      'select',
      multiple
        ? ({ codes: [], coupons: [] } satisfies CouponMultiSelectDetail)
        : ({ code: '', coupon: null } satisfies CouponSelectDetail),
    )
    this.closeOverlay()
    this.update()
  }

  // -------------------------------------------------------------------------
  // 渲染
  // -------------------------------------------------------------------------

  /** 卡面模式数据（自身属性）；amount 缺省/非数字视为无券面 */
  private ownCoupon(): CouponData | null {
    const raw = this.getAttr('amount').trim()
    if (raw === '') return null
    const amount = Number(raw)
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

  /** 列表选项：原生 radio（单选）/ checkbox（multiple）承载键盘语义，卡面作为可点击标签内容 */
  private renderOption(
    data: CouponData,
    currency: string,
    locale: string,
    index: number,
    multiple: boolean,
  ): HTMLElement {
    const label = document.createElement('label')
    label.className = 'option'
    label.setAttribute('part', 'option')
    label.setAttribute('data-status', data.status)
    label.setAttribute('data-code', data.code)
    const input = document.createElement('input')
    input.type = multiple ? 'checkbox' : 'radio'
    input.className = 'option-input'
    input.setAttribute('part', 'option-input')
    if (!multiple) input.name = 'oas-coupon-choice'
    input.value = data.code
    input.id = `oas-coupon-option-${index}`
    input.disabled = data.status !== 'available'
    input.checked = multiple ? this.selectedCodes.has(data.code) : data.code === this.selectedCode
    label.appendChild(input)
    label.appendChild(
      this.renderCard(
        data,
        currency,
        locale,
        multiple ? this.selectedCodes.has(data.code) : data.code === this.selectedCode,
      ),
    )
    return label
  }

  protected override update(): void {
    if (!this.cardHostEl || !this.triggerEl) return
    this.applyZ()
    const locale = this.resolveLocale()
    const currency = this.getAttr('currency', 'CNY').trim().toUpperCase() || 'CNY'
    const listMode = this.hasAttribute('list')
    const list = this.parseList()

    this.cardModeEl!.hidden = listMode
    this.listModeEl!.hidden = !listMode

    if (listMode) {
      const selected = this.selectedCode ? list.find((item) => item.code === this.selectedCode) : undefined
      const multiple = this.hasAttr('multiple')
      this.triggerTextEl!.textContent = this.triggerLabel(list, locale, currency, multiple)
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
      this.renderListGroups(list, currency, locale, multiple)
    } else {
      this.cardHostEl.replaceChildren()
      const own = this.ownCoupon()
      if (own) this.cardHostEl.appendChild(this.renderCard(own, currency, locale, this.hasAttr('selected')))
      else if (!this.warnedMissingAmount) {
        this.warnedMissingAmount = true
        devWarn('[oas-coupon] 卡片模式缺少合法的 amount，券面未渲染（列表模式请改用 list 属性）')
      }
      this.listEl!.replaceChildren()
    }

    this.syncOpenState()
  }

  /**
   * 列表弹层分组渲染：「不使用优惠券」出口 + 可用 / 不可用两组（空组不渲染标题）。
   * `.list` 容器降级为 role="group"，radio 语义收进每个分组的 role="radiogroup"。
   * 按「list 原文 / 模式 / 计数开关 / 组标题」签名重建——仅勾选态变化时跳过重建、
   * 原位同步 checked（重建会打断多选的连续勾选）。
   */
  private renderListGroups(list: CouponData[], currency: string, locale: string, multiple: boolean): void {
    const container = this.listEl
    if (!container) return
    container.setAttribute('role', 'group')
    const signature = [
      this.getAttr('list'),
      multiple ? 'm' : 's',
      this.hasAttr('show-count') ? 'c' : '',
      this.t('coupon.groupAvailable'),
      this.t('coupon.groupUnavailable'),
      this.t('coupon.notUse'),
    ].join('|')
    if (signature !== this.renderedListSignature) {
      this.renderedListSignature = signature
      const available = list.filter((item) => item.status === 'available')
      const unavailable = list.filter((item) => item.status !== 'available')
      const fragments: HTMLElement[] = []

      const clearEntry = document.createElement('button')
      clearEntry.type = 'button'
      clearEntry.className = 'clear-entry'
      clearEntry.setAttribute('part', 'clear-entry')
      clearEntry.textContent = this.t('coupon.notUse')
      fragments.push(clearEntry)

      let optionIndex = 0
      for (const [title, items] of [
        [this.t('coupon.groupAvailable'), available],
        [this.t('coupon.groupUnavailable'), unavailable],
      ] as const) {
        if (items.length === 0) continue
        const head = document.createElement('div')
        head.className = 'group-head'
        head.setAttribute('part', 'group-head')
        const titleEl = document.createElement('span')
        titleEl.className = 'group-title'
        titleEl.textContent = title
        head.appendChild(titleEl)
        if (this.hasAttr('show-count')) {
          const count = document.createElement('span')
          count.className = 'group-count'
          count.textContent = String(items.length)
          head.appendChild(count)
        }
        const body = document.createElement('div')
        body.className = 'group-body'
        body.setAttribute('part', 'group-body')
        body.setAttribute('role', multiple ? 'group' : 'radiogroup')
        body.setAttribute('aria-label', title)
        for (const item of items) body.appendChild(this.renderOption(item, currency, locale, optionIndex++, multiple))
        fragments.push(head, body)
      }
      container.replaceChildren(...fragments)
    }
    // 勾选态原位同步（选中变化不重建 DOM，多选连续点击不丢节点）
    for (const input of container.querySelectorAll<HTMLInputElement>('[part="option-input"]')) {
      input.checked = multiple ? this.selectedCodes.has(input.value) : input.value === this.selectedCode
      for (const card of [input.parentElement?.querySelector('[part="coupon"]')]) {
        card?.toggleAttribute('data-selected', input.checked)
      }
    }
  }

  /** 触发按钮文案：单选已选显示面额；multiple 显示已选张数；否则 trigger-text / i18n */
  private triggerLabel(list: CouponData[], locale: string, currency: string, multiple: boolean): string {
    if (multiple) {
      if (this.selectedCodes.size > 0) return this.t('coupon.selectedCount', { count: String(this.selectedCodes.size) })
      return this.getAttr('trigger-text') || this.t('coupon.select')
    }
    const selected = this.selectedCode ? list.find((item) => item.code === this.selectedCode) : undefined
    if (selected) return formatMoney(selected.amount, locale, currency)
    return this.getAttr('trigger-text') || this.t('coupon.select')
  }

  /** 开合同步：显隐 + aria + 焦点迁移（只在真实跳变时执行，避免 locale 重刷抢焦点） */
  /**
   * z-index 显式属性通道（对齐 modal / drawer）：数值叠加在 `--oas-z-index-base` 之上，
   * 缺省（未写 / 非数值）沿用层叠阶梯 token `--oas-z-modal`，与 CSS 缺省同值——动态切换无跳变。
   * 弹层本体（含遮罩）是同一个 fixed 定位容器，因此只改 `.overlay` 一处。
   */
  private applyZ(): void {
    const overlay = this.overlayEl
    if (!overlay) return
    const explicit = this.getAttr('z-index')
    overlay.style.zIndex =
      explicit !== '' && Number.isFinite(Number(explicit))
        ? `calc(var(--oas-z-index-base, 0) + ${Number(explicit)})`
        : ''
  }

  private syncOpenState(): void {
    if (!this.overlayEl || !this.triggerEl) return
    // 弹层只在列表形态下成立：卡片形态写 open 不应弹出空对话框
    const open = this.hasAttribute('open') && this.hasAttribute('list')
    this.overlayEl.hidden = !open
    this.triggerEl.setAttribute('aria-expanded', String(open))
    // 每次同步都过一遍持锁（幂等）：重连后 lastOpen 仍为 true 也须重新持锁
    if (open) this.acquireOverlay()
    else this.releaseOverlay()
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

  /**
   * 持锁（幂等）：body 滚动锁 + 共享 Esc 层栈。
   * Esc 交给层栈统一排定——多层浮层同开时只关最上层（后开者先关），
   * 弹层被上层覆盖时也不抢 Esc（层栈按后进先出，本层自然排在下面）。
   */
  private acquireOverlay(): void {
    if (!this.releaseScrollLock) this.releaseScrollLock = lockBodyScroll()
    if (!this.releaseEscapeLayer) {
      this.releaseEscapeLayer = pushEscapeLayer({
        name: 'coupon',
        // 兜底：已断开/已关闭时跳过本层，不吞后续 Esc
        active: () => this.isConnected && this.hasAttribute('open'),
        handle: () => {
          this.closeOverlay()
          return true
        },
      })
    }
  }

  /** 释放锁（幂等）：关闭、断开连接都走这里 */
  private releaseOverlay(): void {
    this.releaseEscapeLayer?.()
    this.releaseEscapeLayer = null
    this.releaseScrollLock?.()
    this.releaseScrollLock = null
  }
}
