import { OASElement } from '@oas-ui/core/oas-element'
import '../price/index.js'

/**
 * oas-submit-bar —— 结算栏（commerce 族）。
 *
 * 页面/区块底部的固定操作栏：左侧扩展区（默认插槽）+ 合计金额 + 主操作按钮。
 * 合计金额内嵌 `<oas-price>` 渲染（币种/千分位/小数位与价格组件同源），
 * 按钮覆盖 loading / disabled / danger 三态。
 *
 * 属性（kebab-case）：
 * - `total`：合计金额（数字字符串）；缺省不渲染金额
 * - `currency`：ISO 4217 币种，默认 `CNY`
 * - `locale`：金额格式化 locale；缺省取文档 `<html lang>`，再退回 `zh-CN`
 * - `precision`：金额小数位，默认 2
 * - `label`：合计标签，缺省走 i18n `submitBar.total`
 * - `action-text`：主按钮文本；缺省时不渲染按钮（仅合计 + 扩展区，可作通用底栏）
 * - `loading`：加载中——按钮禁用 + spinner + `aria-busy`，不派发事件
 * - `disabled`：禁用——按钮禁用、不可聚焦，不派发事件（兼容 config-provider 注入禁用）
 * - `danger`：主按钮危险色（删除/取消类主操作）
 *
 * 插槽：
 * - 默认：合计左侧扩展区（勾选协议、备注入口等）
 * - `total`：覆盖默认金额展示（自定义价格排版）
 *
 * 事件（bubbles + composed）：
 * - `oas-submit`：主按钮点击（非 loading / disabled）派发，detail `{ total, currency }`
 *
 * 布局：宿主默认 `position: sticky; inset-block-end: 0`（滚动容器内吸底），
 * 宿主可用 CSS 覆盖为 `fixed` 实现整页固定。a11y：合计区 `aria-live="polite"`，
 * 按钮 loading 时 `aria-busy="true"`，spinner `aria-hidden`。
 */

export interface SubmitBarDetail {
  total: number
  currency: string
}

const STYLE = `
:host {
  display: block;
  position: sticky;
  inset-block-end: 0;
  z-index: 10;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.bar {
  display: flex;
  align-items: center;
  gap: var(--oas-space-3);
  box-sizing: border-box;
  min-height: var(--oas-submit-bar-height, var(--oas-control-height-xl, 48px));
  padding: var(--oas-space-2) var(--oas-space-4);
  background: var(--oas-color-bg);
  border-block-start: 1px solid var(--oas-color-border);
  box-shadow: var(--oas-shadow-sm);
}
.extra {
  flex: 1 1 auto;
  min-width: 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.extra[hidden] {
  display: none;
}
.total {
  display: inline-flex;
  align-items: baseline;
  gap: var(--oas-space-2);
  flex: none;
}
.label {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.action {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-2);
  min-width: 112px;
  min-height: var(--oas-control-height-lg, 40px);
  padding: 0 var(--oas-space-4);
  border: none;
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
  font-family: inherit;
  font-size: var(--oas-font-size-md);
  font-weight: 500;
  cursor: pointer;
  transition: background var(--oas-transition-fast) var(--oas-ease-out);
}
.action:hover:not(:disabled) {
  background: var(--oas-color-primary-hover);
}
.action:active:not(:disabled) {
  background: var(--oas-color-primary-active);
}
.action:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.action[data-danger='true'] {
  background: var(--oas-color-danger);
  color: var(--oas-color-bg);
}
.action[data-danger='true']:hover:not(:disabled) {
  background: color-mix(in srgb, var(--oas-color-danger) 85%, var(--oas-color-text-primary));
}
.action[hidden] {
  display: none;
}
.spinner {
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-inline-start-color: transparent;
  border-radius: 50%;
  animation: oas-submit-bar-spin 0.8s linear infinite;
}
.spinner[hidden] {
  display: none;
}
@keyframes oas-submit-bar-spin {
  to {
    transform: rotate(1turn);
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation-duration: 2.4s;
  }
}

@media (forced-colors: active) {
  .action:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 2px;
    box-shadow: none;
  }
}
`

export class OASSubmitBar extends OASElement {
  static override get observedAttributes(): string[] {
    return ['total', 'currency', 'locale', 'precision', 'label', 'action-text', 'loading', 'disabled', 'danger']
  }

  private barEl: HTMLElement | null = null
  private extraEl: HTMLElement | null = null
  private labelEl: HTMLElement | null = null
  private priceEl: HTMLElement | null = null
  private actionEl: HTMLButtonElement | null = null
  private spinnerEl: HTMLElement | null = null
  private actionTextEl: HTMLElement | null = null

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="bar" part="bar">
        <div class="extra" part="extra" hidden><slot></slot></div>
        <div class="total" part="total" aria-live="polite">
          <span class="label" part="label"></span>
          <slot name="total"><oas-price class="amount" size="lg"></oas-price></slot>
        </div>
        <button class="action" part="action" type="button" hidden>
          <span class="spinner" part="spinner" aria-hidden="true" hidden></span>
          <span class="action-text" part="action-text"></span>
        </button>
      </div>
    `
  }

  private bind(): void {
    this.barEl = this.shadow.querySelector<HTMLElement>('[part="bar"]')
    this.extraEl = this.shadow.querySelector<HTMLElement>('[part="extra"]')
    this.labelEl = this.shadow.querySelector<HTMLElement>('[part="label"]')
    this.priceEl = this.shadow.querySelector<HTMLElement>('oas-price')
    this.actionEl = this.shadow.querySelector<HTMLButtonElement>('[part="action"]')
    this.spinnerEl = this.shadow.querySelector<HTMLElement>('[part="spinner"]')
    this.actionTextEl = this.shadow.querySelector<HTMLElement>('[part="action-text"]')
    this.actionEl?.addEventListener('click', this.onActionClick)
    this.shadow.querySelector('slot:not([name])')?.addEventListener('slotchange', this.onSlotChange)
    this.shadow.querySelector('slot[name="total"]')?.addEventListener('slotchange', this.onSlotChange)
  }

  private onActionClick = (): void => {
    if (this.isDisabled()) return
    this.emit('submit', {
      total: this.totalValue(),
      currency: this.getAttr('currency', 'CNY').trim().toUpperCase() || 'CNY',
    } satisfies SubmitBarDetail)
  }

  private onSlotChange = (): void => {
    this.update()
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 禁用判定：组件自身 disabled / loading / 就近注入禁用任一成立 */
  private isDisabled(): boolean {
    return this.hasAttr('disabled') || this.hasAttr('loading') || this.injectDisabled()
  }

  private totalValue(): number {
    const n = Number(this.getAttr('total').trim())
    return Number.isFinite(n) ? n : 0
  }

  protected override update(): void {
    const label = this.getAttr('label') || this.t('submitBar.total')
    if (this.labelEl) this.labelEl.textContent = label

    if (this.priceEl) {
      this.priceEl.setAttribute('value', this.getAttr('total'))
      this.priceEl.setAttribute('currency', this.getAttr('currency', 'CNY'))
      this.priceEl.setAttribute('precision', this.getAttr('precision', '2'))
      const locale = this.getAttr('locale')
      if (locale) this.priceEl.setAttribute('locale', locale)
      else this.priceEl.removeAttribute('locale')
    }

    const actionText = this.getAttr('action-text').trim()
    const disabled = this.isDisabled()
    const loading = this.hasAttr('loading')
    if (this.actionEl) {
      this.actionEl.hidden = actionText === ''
      this.actionEl.disabled = disabled
      this.actionEl.setAttribute('data-danger', String(this.hasAttr('danger')))
      if (loading) this.actionEl.setAttribute('aria-busy', 'true')
      else this.actionEl.removeAttribute('aria-busy')
    }
    if (this.actionTextEl) this.actionTextEl.textContent = actionText
    if (this.spinnerEl) this.spinnerEl.hidden = !loading

    // 扩展区：有默认插槽内容才占位（无内容不挤压合计右对齐）
    const slot = this.shadow.querySelector<HTMLSlotElement>('slot:not([name])')
    if (this.extraEl)
      this.extraEl.hidden = !(slot?.assignedNodes().some((n) => (n.textContent ?? '').trim() !== '') ?? false)
  }
}
