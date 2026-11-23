import { OASElement } from '@oas-ui/core/oas-element'
import { parseJsonArray } from '../../shared/json-array.js'
import { devWarn } from '../../shared/dev-warn.js'

/** 电子卡 / 储值卡（宿主注入契约）：value 为提交金额（数值），faceValue / price 为展示文案 */
export interface ECard {
  id: string
  name: string
  value: number
  faceValue: string
  price?: string
  description?: string
  disabled?: boolean
}

export interface ECardSelection {
  card: ECard | null
  cardId: string
  amount: number
  custom: boolean
  agreed: boolean
}

/** 自定义面额的伪 id（选中态与选中卡共用 selected-id 通道） */
const CUSTOM_ID = 'custom'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  --oas-ecard-width: 100%;
}
:host([hidden]) {
  display: none;
}
.body {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-4);
  width: var(--oas-ecard-width);
  box-sizing: border-box;
}
.group {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.group[hidden] {
  display: none;
}
.label {
  font-size: var(--oas-font-size-sm);
  line-height: 1.3;
  color: var(--oas-color-text-secondary);
}
.cards {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.card {
  display: flex;
  align-items: center;
  gap: var(--oas-space-3);
  box-sizing: border-box;
  padding: var(--oas-space-3) var(--oas-space-4);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  cursor: pointer;
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    background var(--oas-transition-fast) var(--oas-ease-out);
}
.card:hover {
  border-color: var(--oas-color-primary);
}
.card[data-selected] {
  border-color: var(--oas-color-primary);
  /* 选中态不叠色底：primary 6% 混色会把次要文字压到 WCAG 4.44（AA 4.5 不达标），
     改为主色描边 + 内环双重强调，文字仍在纯底色上 */
  box-shadow: inset 0 0 0 1px var(--oas-color-primary);
}
.card[data-disabled] {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
.card input {
  accent-color: var(--oas-color-primary);
  margin: 0;
}
.card-body {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  min-width: 0;
  flex: 1;
}
.card-head {
  display: flex;
  align-items: baseline;
  gap: var(--oas-space-2);
  flex-wrap: wrap;
}
.card-name {
  font-size: var(--oas-font-size-md);
  font-weight: 600;
}
.card-face {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.card-price {
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-price, var(--oas-color-danger));
  font-weight: 600;
}
.card-desc {
  font-size: var(--oas-font-size-sm);
  line-height: 1.5;
  color: var(--oas-color-text-secondary);
}
.custom-amount {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  min-height: var(--oas-control-height-md);
  padding-inline: var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
}
.custom-amount[hidden] {
  display: none;
}
.custom-amount[data-invalid] {
  border-color: var(--oas-color-danger);
}
.currency {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-md);
}
.amount-input {
  flex: 1;
  min-width: 0;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-md);
  line-height: 1.5;
}
.amount-input:focus-visible {
  outline: none;
}
.custom-amount:focus-within {
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}
.amount-input::placeholder {
  color: var(--oas-color-text-placeholder);
}
.error {
  font-size: var(--oas-font-size-sm);
  line-height: 1.3;
  color: var(--oas-color-danger-text);
}
.error[hidden] {
  display: none;
}
.agreement-row {
  display: flex;
  align-items: flex-start;
  gap: var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  line-height: 1.5;
  color: var(--oas-color-text-secondary);
  cursor: pointer;
}
.agreement-row[data-invalid] {
  color: var(--oas-color-danger-text);
}
.agreement-row input {
  accent-color: var(--oas-color-primary);
  margin: 0;
  margin-block-start: var(--oas-space-1);
}
.agreement-text {
  min-width: 0;
}
.actions {
  display: flex;
  justify-content: flex-end;
}
.confirm {
  box-sizing: border-box;
  min-height: var(--oas-control-height-md);
  padding-inline: var(--oas-space-5);
  border: 1px solid var(--oas-color-primary);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-md);
  cursor: pointer;
}
.confirm:hover {
  background: var(--oas-color-primary-hover);
  border-color: var(--oas-color-primary-hover);
}
.confirm:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
:host([disabled]) .confirm,
:host([readonly]) .confirm {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  border-color: var(--oas-color-border);
  color: var(--oas-color-text-disabled);
}
.empty {
  padding: var(--oas-space-6);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  color: var(--oas-color-text-secondary);
  text-align: center;
  font-size: var(--oas-font-size-sm);
}
.empty[hidden] {
  display: none;
}
`

let ecardUid = 0

export class OASECard extends OASElement {
  static override get observedAttributes(): string[] {
    return ['cards', 'selected-id', 'amount', 'min-amount', 'max-amount', 'agreed', 'currency', 'disabled', 'readonly']
  }

  private cardsEl: HTMLElement | null = null
  private emptyEl: HTMLElement | null = null
  private customRow: HTMLElement | null = null
  private amountInput: HTMLInputElement | null = null
  private amountError: HTMLElement | null = null
  private appliedAmount = '__initial__'
  private agreementRow: HTMLElement | null = null
  private agreementInput: HTMLInputElement | null = null
  private agreementText: HTMLElement | null = null
  private confirmBtn: HTMLButtonElement | null = null
  private readonly uid = `oas-ecard-${++ecardUid}`
  private cardItems: ECard[] = []
  private cardsSignature = ''
  private renderedCardsSignature: string | null = null

  /** 卡面数据（property 通道读端）：已解析并过滤的卡面数组 */
  get cards(): ECard[] {
    return this.cardItems
  }
  /** 卡面数据（property 通道写端）：数组序列化、字符串原样反射到 cards attribute */
  set cards(value: ECard[] | string) {
    this.setAttribute('cards', typeof value === 'string' ? value : JSON.stringify(value))
  }

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="body" part="body">
        <div class="group">
          <span class="label"></span>
          <div class="cards" part="cards" role="radiogroup"></div>
          <p class="empty" part="empty" hidden></p>
          <div class="group custom-group">
            <label class="card custom-card" part="custom">
              <input type="radio" name="${this.uid}" value="${CUSTOM_ID}" />
              <span class="card-body">
                <span class="card-head">
                  <span class="card-name custom-title"></span>
                </span>
              </span>
            </label>
            <div class="custom-amount" part="amount">
              <span class="currency"></span>
              <input class="amount-input" type="number" inputmode="numeric" step="1" part="amount-input" />
            </div>
            <span class="error" hidden></span>
          </div>
        </div>
        <label class="agreement-row" part="agreement">
          <input type="checkbox" part="agreement-input" />
          <slot name="agreement"><span class="agreement-text"></span></slot>
          <span class="error agreement-error" hidden></span>
        </label>
        <div class="actions">
          <button type="button" class="confirm" part="confirm"></button>
        </div>
      </div>
    `
  }

  private bind(): void {
    this.cardsEl = this.shadow.querySelector('.cards')
    this.emptyEl = this.shadow.querySelector('.empty')
    this.customRow = this.shadow.querySelector('.custom-amount')
    this.amountInput = this.shadow.querySelector('.amount-input')
    this.amountError = this.shadow.querySelector('.custom-group > .error')
    this.agreementRow = this.shadow.querySelector('.agreement-row')
    this.agreementInput = this.shadow.querySelector('input[type="checkbox"]')
    this.agreementText = this.shadow.querySelector('.agreement-text')
    this.confirmBtn = this.shadow.querySelector('.confirm')

    this.cardsEl?.addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement | null
      if (input?.type !== 'radio') return
      this.select(input.value)
    })
    this.shadow.querySelector('.custom-card input')?.addEventListener('change', () => this.select(CUSTOM_ID))
    this.amountInput?.addEventListener('input', () => {
      this.clearAmountError()
      this.emitChange()
    })
    this.agreementInput?.addEventListener('change', () => {
      if (this.locked()) {
        this.agreementInput!.checked = !this.agreementInput!.checked
        return
      }
      this.toggleAttribute('agreed', this.agreementInput!.checked)
      this.clearAgreementError()
      this.emitChange()
    })
    this.confirmBtn?.addEventListener('click', () => this.submit())
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override update(): void {
    if (!this.cardsEl) return
    this.shadow.querySelector<HTMLElement>('.group > .label')!.textContent = this.t('ecard.cards')
    this.cardsEl.setAttribute('aria-label', this.t('ecard.cards'))
    const customTitle = this.shadow.querySelector<HTMLElement>('.custom-title')
    if (customTitle) customTitle.textContent = this.t('ecard.custom')
    if (this.amountInput) this.amountInput.placeholder = this.t('ecard.amount')
    const currency = this.shadow.querySelector<HTMLElement>('.currency')
    if (currency) currency.textContent = this.getAttr('currency', '¥')
    if (this.agreementText) this.agreementText.textContent = this.t('ecard.agreement')
    if (this.confirmBtn) this.confirmBtn.textContent = this.t('ecard.confirm')
    if (this.emptyEl) this.emptyEl.textContent = this.t('ecard.empty')

    this.parseCards()
    this.syncCards()
    this.syncSelection()
    this.applyDisabled()
  }

  private parseCards(): void {
    const raw = this.getAttr('cards', '')
    if (raw === this.cardsSignature) return
    this.cardsSignature = raw
    this.cardItems = parseJsonArray<ECard>(raw, () => devWarn('[oas-ecard] cards 不是合法 JSON 数组，已按空列表渲染'))
      .filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string')
      .map((c) => ({ ...c, value: Number(c.value) }))
      .filter((c) => Number.isFinite(c.value))
  }

  private syncCards(): void {
    if (!this.cardsEl) return
    const signature = `${this.cardsSignature}|${this.t('ecard.price', { amount: '' })}|${this.t('ecard.faceValue', { amount: '' })}|${this.t('ecard.selectCard', { name: '' })}`
    if (this.renderedCardsSignature !== signature) {
      this.renderedCardsSignature = signature
      this.cardsEl.replaceChildren()
      for (const card of this.cardItems) this.cardsEl.appendChild(this.buildCard(card))
    }
    if (this.emptyEl) this.emptyEl.hidden = this.cardItems.length > 0
  }

  private buildCard(card: ECard): HTMLElement {
    const label = document.createElement('label')
    label.className = 'card'
    label.setAttribute('part', 'card')
    label.dataset.id = card.id
    label.toggleAttribute('data-disabled', card.disabled === true)

    const input = document.createElement('input')
    input.type = 'radio'
    input.name = this.uid
    input.value = card.id
    input.disabled = card.disabled === true || this.locked()
    input.setAttribute('aria-label', this.t('ecard.selectCard', { name: card.name }))
    label.appendChild(input)

    const body = document.createElement('span')
    body.className = 'card-body'
    const head = document.createElement('span')
    head.className = 'card-head'
    const name = document.createElement('span')
    name.className = 'card-name'
    name.textContent = card.name
    head.appendChild(name)
    if (card.price) {
      const price = document.createElement('span')
      price.className = 'card-price'
      price.textContent = this.t('ecard.price', { amount: card.price })
      head.appendChild(price)
    }
    const face = document.createElement('span')
    face.className = 'card-face'
    face.textContent = this.t('ecard.faceValue', { amount: card.faceValue })
    head.appendChild(face)
    body.appendChild(head)
    if (card.description) {
      const desc = document.createElement('span')
      desc.className = 'card-desc'
      desc.textContent = card.description
      body.appendChild(desc)
    }
    label.appendChild(body)
    return label
  }

  /**
   * 当前选中卡 id（`selected-id` 的解析结果）。
   * 命名刻意避开 `selectedId`：attribute 的 camelCase 与实例方法同名时，宿主框架按
   * 「key in el」写 property 会遮蔽方法，update() 里调用直接 TypeError（撞名守卫覆盖）。
   */
  private selectedIdOf(): string {
    const own = this.getAttr('selected-id', '')
    if (own === CUSTOM_ID) return CUSTOM_ID
    if (own !== '' && this.cardItems.some((c) => c.id === own && !c.disabled)) return own
    const first = this.cardItems.find((c) => !c.disabled)
    return first ? first.id : CUSTOM_ID
  }

  private isCustom(): boolean {
    return this.selectedIdOf() === CUSTOM_ID
  }

  private select(id: string): void {
    if (this.locked()) {
      this.syncSelection()
      return
    }
    const card = this.cardItems.find((c) => c.id === id)
    if (card?.disabled) {
      this.syncSelection()
      return
    }
    if (this.getAttr('selected-id', '') === id) {
      this.syncSelection()
      return
    }
    this.setAttribute('selected-id', id)
    this.clearAmountError()
    this.emitChange()
  }

  /** 选中态增量同步：卡片高亮 / radio checked / 自定义面额区显隐 */
  private syncSelection(): void {
    if (!this.cardsEl) return
    const selected = this.selectedIdOf()
    const custom = selected === CUSTOM_ID
    for (const card of this.cardsEl.querySelectorAll<HTMLElement>('.card')) {
      const on = card.dataset.id === selected
      card.toggleAttribute('data-selected', on)
      const input = card.querySelector<HTMLInputElement>('input')
      if (input) input.checked = on
    }
    const customRadio = this.shadow.querySelector<HTMLInputElement>('.custom-card input')
    if (customRadio) {
      customRadio.checked = custom
      customRadio.disabled = this.locked()
    }
    if (this.customRow) this.customRow.hidden = !custom
    if (this.amountInput) {
      this.applyAmountInputState()
      const amount = this.getAttr('amount', '')
      if (amount !== this.appliedAmount) {
        this.appliedAmount = amount
        this.amountInput.value = amount
      }
    }
    if (this.agreementInput) this.agreementInput.checked = this.hasAttr('agreed')
  }

  private currentAmount(): number {
    if (!this.isCustom()) {
      const card = this.cardItems.find((c) => c.id === this.selectedIdOf())
      return card?.value ?? 0
    }
    return Number(this.amountInput?.value ?? '')
  }

  /** 自定义面额下限（`min-amount` 解析；命名避开 minAmount 撞名，见 selectedIdOf 注释） */
  private resolveMinAmount(): number {
    const n = Number(this.getAttr('min-amount', '1'))
    return Number.isFinite(n) && n >= 0 ? n : 1
  }

  /** 自定义面额上限（`max-amount` 解析；命名避开 maxAmount 撞名，见 selectedIdOf 注释） */
  private resolveMaxAmount(): number {
    const n = Number(this.getAttr('max-amount', '10000'))
    return Number.isFinite(n) && n > 0 ? n : 10000
  }

  private submit(): void {
    if (this.locked()) return
    const errors: string[] = []
    if (this.isCustom()) {
      const amount = Number(this.amountInput?.value ?? '')
      const min = this.resolveMinAmount()
      const max = this.resolveMaxAmount()
      if (!Number.isInteger(amount) || amount < min || amount > max) {
        errors.push('amount')
        this.setError(this.customRow, this.t('ecard.invalidAmount', { min, max }))
      }
    }
    if (!this.hasAttr('agreed')) {
      errors.push('agreement')
      this.agreementRow?.setAttribute('data-invalid', '')
      const error = this.shadow.querySelector<HTMLElement>('.agreement-error')
      if (error) {
        error.textContent = this.t('ecard.requiredAgreement')
        error.hidden = false
      }
      this.agreementInput?.setAttribute('aria-invalid', 'true')
    }
    if (errors.length > 0) {
      this.emit('invalid', { fields: errors })
      return
    }
    const card = this.cardItems.find((c) => c.id === this.selectedIdOf()) ?? null
    const selection: ECardSelection = {
      card,
      cardId: this.selectedIdOf(),
      amount: this.currentAmount(),
      custom: this.isCustom(),
      agreed: true,
    }
    this.emit('submit', selection)
  }

  private emitChange(): void {
    const card = this.cardItems.find((c) => c.id === this.selectedIdOf()) ?? null
    this.emit('change', {
      card,
      cardId: this.selectedIdOf(),
      amount: this.currentAmount(),
      custom: this.isCustom(),
      agreed: this.hasAttr('agreed'),
    })
  }

  private setError(row: HTMLElement | null, message: string): void {
    if (!row) return
    row.setAttribute('data-invalid', '')
    const error = this.amountError
    if (error) {
      error.textContent = message
      error.hidden = false
    }
    this.amountInput?.setAttribute('aria-invalid', 'true')
  }

  private clearAmountError(): void {
    this.customRow?.removeAttribute('data-invalid')
    const error = this.amountError
    if (error) {
      error.hidden = true
      error.textContent = ''
    }
    this.amountInput?.removeAttribute('aria-invalid')
  }

  private clearAgreementError(): void {
    this.agreementRow?.removeAttribute('data-invalid')
    this.agreementInput?.removeAttribute('aria-invalid')
  }

  private locked(): boolean {
    if (this.hasAttr('disabled')) return true
    if (this.injectDisabled()) return true
    return this.hasAttr('readonly')
  }

  private applyDisabled(): void {
    const locked = this.locked()
    for (const card of this.cardsEl?.querySelectorAll<HTMLElement>('.card') ?? []) {
      const input = card.querySelector<HTMLInputElement>('input')
      const cardDisabled = card.hasAttribute('data-disabled')
      if (input) input.disabled = locked || cardDisabled
    }
    if (this.agreementInput) this.agreementInput.disabled = locked
    if (this.confirmBtn) this.confirmBtn.disabled = locked
    this.applyAmountInputState()
  }

  /** 面额输入框状态：readonly 语义对齐 address/invoice——文本框可聚焦复制（原生 readOnly 非 disabled），
   *  禁用态 / 非自定义卡时才真正 disabled */
  private applyAmountInputState(): void {
    if (!this.amountInput) return
    const disabled = this.hasAttr('disabled') || this.injectDisabled()
    const readonly = this.hasAttr('readonly')
    this.amountInput.disabled = disabled || (!this.isCustom() && !readonly)
    this.amountInput.readOnly = readonly
  }
}
