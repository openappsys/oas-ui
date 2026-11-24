import { OASElement } from '@oas-ui/core/oas-element'
import { lookupIcon } from '@oas-ui/icons/runtime'
import { devWarn } from '../../shared/dev-warn.js'
import '../price/index.js'

/**
 * oas-submit-bar —— 结算栏（commerce 族）。
 *
 * 页面/区块底部的固定操作栏：提示行（可选）+ 左侧扩展区（默认插槽）+ 合计金额 + 主操作按钮。
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
 * - `tip`：提示行文案（运费 / 发票等高频提示，渲染在主行上方）
 * - `tip-icon`：提示行图标名（lookupIcon 查表，自定义注册优先）；未注册告警一次且不渲染图标
 *
 * fixed 场景占位配方：栏体缺省 `sticky`（本就占据文档流，无需占位）。宿主用 CSS 覆写为
 * `fixed` 时自行给页尾留白（如 `padding-bottom`），高度对齐用 `--oas-submit-bar-height`
 * （栏体最小高度 token，缺省 `--oas-control-height-xl`；含 tip 行时按实际渲染高度另加）
 *
 * 插槽：
 * - 默认：合计左侧扩展区（勾选协议、备注入口等）
 * - `total`：覆盖默认金额展示（自定义价格排版）
 *
 * 事件（bubbles + composed）：
 * - `oas-submit`：主按钮点击（非 loading / disabled）派发，detail `{ total, currency }`
 *
 * 布局：宿主默认 `position: sticky; inset-block-end: 0`（滚动容器内吸底），
 * 宿主可用 CSS 覆盖为 `fixed` 实现整页固定。栏体底部内边距走
 * `max(间距 token, env(safe-area-inset-bottom))`（刘海屏 / 手势条安全区）。
 * a11y：合计区 `aria-live="polite"`，按钮 loading 时 `aria-busy="true"`，spinner `aria-hidden`。
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
  flex-direction: column;
  box-sizing: border-box;
  min-height: var(--oas-submit-bar-height, var(--oas-control-height-xl, 48px));
  padding: var(--oas-space-2) var(--oas-space-4);
  padding-block-end: max(var(--oas-space-2), env(safe-area-inset-bottom, 0px));
  background: var(--oas-color-bg);
  border-block-start: 1px solid var(--oas-color-border);
  box-shadow: var(--oas-shadow-sm);
}
.tip {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding-block-end: var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.tip[hidden] {
  display: none;
}
.tip-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  font-size: var(--oas-font-size-md);
  line-height: 1;
}
.tip-icon svg {
  width: 1em;
  height: 1em;
  fill: currentColor;
}
.tip-icon[hidden] {
  display: none;
}
.tip-text {
  min-width: 0;
  overflow-wrap: anywhere;
}
.row {
  display: flex;
  align-items: center;
  gap: var(--oas-space-3);
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
    return [
      'total',
      'currency',
      'locale',
      'precision',
      'label',
      'action-text',
      'loading',
      'disabled',
      'danger',
      'tip',
      'tip-icon',
    ]
  }

  private tipEl: HTMLElement | null = null
  private tipIconEl: HTMLElement | null = null
  private tipTextEl: HTMLElement | null = null
  private extraEl: HTMLElement | null = null
  private labelEl: HTMLElement | null = null
  private priceEl: HTMLElement | null = null
  private actionEl: HTMLButtonElement | null = null
  private spinnerEl: HTMLElement | null = null
  private actionTextEl: HTMLElement | null = null
  /** 未注册 tip-icon 名的 dev 告警去重（实例级；同一名字只报一次） */
  private warnedTipIcons = new Set<string>()

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="bar" part="bar">
        <div class="tip" part="tip" hidden>
          <span class="tip-icon" part="tip-icon" aria-hidden="true" hidden></span>
          <span class="tip-text" part="tip-text"></span>
        </div>
        <div class="row" part="row">
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
      </div>
    `
  }

  private bind(): void {
    this.tipEl = this.shadow.querySelector<HTMLElement>('[part="tip"]')
    this.tipIconEl = this.shadow.querySelector<HTMLElement>('[part="tip-icon"]')
    this.tipTextEl = this.shadow.querySelector<HTMLElement>('[part="tip-text"]')
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

    this.syncTip()

    // 扩展区：有默认插槽内容才占位（无内容不挤压合计右对齐）
    const slot = this.shadow.querySelector<HTMLSlotElement>('slot:not([name])')
    if (this.extraEl)
      this.extraEl.hidden = !(slot?.assignedNodes().some((n) => (n.textContent ?? '').trim() !== '') ?? false)
  }

  /** 提示行：tip 文案在场才渲染；tip-icon 查表（未注册告警一次、不渲染图标，文案保留） */
  private syncTip(): void {
    if (!this.tipEl || !this.tipTextEl || !this.tipIconEl) return
    const text = this.getAttr('tip').trim()
    this.tipTextEl.textContent = text
    this.tipEl.hidden = text === ''
    if (text === '') {
      this.tipIconEl.hidden = true
      this.tipIconEl.replaceChildren()
      return
    }
    const name = this.getAttr('tip-icon').trim()
    if (name === '') {
      this.tipIconEl.hidden = true
      this.tipIconEl.replaceChildren()
      return
    }
    const path = lookupIcon(name)
    if (!path) {
      if (!this.warnedTipIcons.has(name)) {
        this.warnedTipIcons.add(name)
        devWarn(`[oas-submit-bar] tip-icon "${name}" 未注册，已跳过图标（自定义图标需先 registerIcon）`)
      }
      this.tipIconEl.hidden = true
      this.tipIconEl.replaceChildren()
      return
    }
    this.tipIconEl.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${path}</svg>`
    this.tipIconEl.hidden = false
  }
}
