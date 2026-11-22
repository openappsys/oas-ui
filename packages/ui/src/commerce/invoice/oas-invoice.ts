import { OASElement } from '@oas-ui/core/oas-element'
import { parseJsonArray } from '../../shared/json-array.js'
import { devWarn } from '../../shared/dev-warn.js'

export type InvoiceType = 'personal' | 'company'

/** 发票内容选项（宿主注入契约） */
export interface InvoiceContent {
  value: string
  label: string
}

/** 已保存抬头（宿主注入契约；id 缺省时用 type + title 派生） */
export interface InvoiceSavedTitle {
  id?: string
  type: InvoiceType
  title: string
  taxId?: string
}

export interface InvoiceValue {
  type: InvoiceType
  title: string
  taxId: string
  content: string
}

const TAX_ID_RE = /^[A-Za-z0-9]{15,20}$/

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  --oas-invoice-width: 100%;
}
:host([hidden]) {
  display: none;
}
.form {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-4);
  width: var(--oas-invoice-width);
  box-sizing: border-box;
}
.field {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  min-width: 0;
}
.field[hidden] {
  display: none;
}
.label {
  font-size: var(--oas-font-size-sm);
  line-height: 1.3;
  color: var(--oas-color-text-secondary);
}
.segmented {
  display: inline-flex;
  gap: var(--oas-space-1);
  padding: var(--oas-space-1);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-hover);
  align-self: flex-start;
}
.segment {
  box-sizing: border-box;
  min-height: var(--oas-control-height-sm);
  padding-inline: var(--oas-space-4);
  border: 0;
  border-radius: var(--oas-radius-sm);
  background: transparent;
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-md);
  cursor: pointer;
}
.segment:hover {
  color: var(--oas-color-primary);
}
.segment[aria-checked='true'] {
  background: var(--oas-color-bg-elevated);
  box-shadow: var(--oas-shadow-sm);
  font-weight: 500;
}
.segment:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.input,
.select {
  box-sizing: border-box;
  width: 100%;
  min-height: var(--oas-control-height-md);
  padding-inline: var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-md);
  line-height: 1.5;
}
.input::placeholder {
  color: var(--oas-color-text-placeholder);
}
.input:hover,
.select:hover {
  border-color: var(--oas-color-border-strong);
}
.input:focus-visible,
.select:focus-visible {
  outline: none;
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}
.field[data-invalid] .input,
.field[data-invalid] .select {
  border-color: var(--oas-color-danger);
}
.error {
  font-size: var(--oas-font-size-sm);
  line-height: 1.3;
  color: var(--oas-color-danger-text);
}
.error[hidden] {
  display: none;
}
.saved {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.saved[hidden] {
  display: none;
}
.saved-trigger {
  align-self: flex-start;
  box-sizing: border-box;
  min-height: var(--oas-control-height-sm);
  padding-inline: var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
}
.saved-trigger:hover {
  border-color: var(--oas-color-primary);
}
.saved-trigger:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.saved-trigger[aria-expanded='true'] {
  border-color: var(--oas-color-primary);
}
.picker {
  position: absolute;
  inset-inline-start: 0;
  inset-block-start: calc(100% + var(--oas-space-1));
  z-index: 1;
  box-sizing: border-box;
  width: min(100%, 28rem);
  max-height: 18rem;
  overflow: auto;
  padding: var(--oas-space-1);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-elevated);
  box-shadow: var(--oas-shadow-lg);
}
.picker[hidden] {
  display: none;
}
.picker-list {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}
.option {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
}
.option:hover,
.option[data-active] {
  background: var(--oas-color-bg-hover);
}
.option[aria-selected='true'] {
  color: var(--oas-color-primary);
}
.option-title {
  font-size: var(--oas-font-size-md);
}
.option-tax {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.option:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.empty {
  padding: var(--oas-space-3);
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.actions {
  display: flex;
  justify-content: flex-end;
}
.submit {
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
.submit:hover {
  background: var(--oas-color-primary-hover);
  border-color: var(--oas-color-primary-hover);
}
.submit:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
:host([disabled]) .submit,
:host([readonly]) .submit {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  border-color: var(--oas-color-border);
  color: var(--oas-color-text-disabled);
}
:host([disabled]) .saved-trigger,
:host([readonly]) .saved-trigger {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
}
`

let invoiceUid = 0

export class OASInvoice extends OASElement {
  static override get observedAttributes(): string[] {
    return ['type', 'title', 'tax-id', 'content', 'contents', 'save-titles', 'disabled', 'readonly']
  }

  private form: HTMLFormElement | null = null
  private titleInput: HTMLInputElement | null = null
  private taxInput: HTMLInputElement | null = null
  private taxField: HTMLElement | null = null
  private contentField: HTMLElement | null = null
  private contentSelect: HTMLSelectElement | null = null
  private savedWrap: HTMLElement | null = null
  private savedTrigger: HTMLButtonElement | null = null
  private picker: HTMLElement | null = null
  private pickerList: HTMLElement | null = null
  private readonly uid = `oas-invoice-${++invoiceUid}`
  private contents: InvoiceContent[] = []
  private savedTitles: InvoiceSavedTitle[] = []
  private contentsSignature = ''
  private savedSignature = ''
  private open = false
  private activeIndex = -1
  private appliedTitle = '__initial__'
  private appliedTax = '__initial__'
  private appliedContent = '__initial__'

  private template(): string {
    return `
      <style>${STYLE}</style>
      <form class="form" part="form" novalidate>
        <div class="field">
          <span class="label"></span>
          <div class="segmented" part="type" role="radiogroup"></div>
        </div>
        <div class="field">
          <label class="label" for="${this.uid}-title"></label>
          <input class="input" id="${this.uid}-title" name="title" part="title" autocomplete="organization" />
          <span class="error" hidden></span>
        </div>
        <div class="field tax-field">
          <label class="label" for="${this.uid}-tax"></label>
          <input class="input" id="${this.uid}-tax" name="taxId" part="tax-id" autocomplete="off" />
          <span class="error" hidden></span>
        </div>
        <div class="field content-field">
          <label class="label" for="${this.uid}-content"></label>
          <select class="select" id="${this.uid}-content" name="content" part="content"></select>
        </div>
        <div class="saved" part="saved">
          <button type="button" class="saved-trigger" part="saved-trigger" aria-haspopup="listbox" aria-expanded="false"></button>
          <div class="picker" part="picker" hidden>
            <ul class="picker-list" role="listbox"></ul>
            <p class="empty" hidden></p>
          </div>
        </div>
        <div class="actions" part="actions">
          <button type="submit" class="submit" part="submit"></button>
        </div>
      </form>
    `
  }

  private bind(): void {
    this.form = this.shadow.querySelector('form')
    this.titleInput = this.shadow.querySelector('input[name="title"]')
    this.taxInput = this.shadow.querySelector('input[name="taxId"]')
    this.taxField = this.shadow.querySelector('.tax-field')
    this.contentField = this.shadow.querySelector('.content-field')
    this.contentSelect = this.shadow.querySelector('select[name="content"]')
    this.savedWrap = this.shadow.querySelector('.saved')
    this.savedTrigger = this.shadow.querySelector('.saved-trigger')
    this.picker = this.shadow.querySelector('.picker')
    this.pickerList = this.shadow.querySelector('.picker-list')

    this.titleInput?.addEventListener('input', () => {
      this.clearFieldError('title')
      this.emit('change', { field: 'title', value: this.currentValue() })
    })
    this.taxInput?.addEventListener('input', () => {
      this.clearFieldError('taxId')
      this.emit('change', { field: 'taxId', value: this.currentValue() })
    })
    this.contentSelect?.addEventListener('change', () => {
      this.setAttribute('content', this.contentSelect!.value)
      this.emit('change', { field: 'content', value: this.currentValue() })
    })
    this.form?.addEventListener('submit', (e) => {
      e.preventDefault()
      this.submit()
    })
    this.savedTrigger?.addEventListener('click', () => this.togglePicker())
    this.pickerList?.addEventListener('click', (e) => {
      const option = (e.target as Element | null)?.closest<HTMLElement>('[role="option"]')
      if (!option) return
      this.pickSaved(option.dataset.id ?? '')
    })
    this.pickerList?.addEventListener('keydown', (e) => this.onPickerKey(e as KeyboardEvent))

    // 外点关闭：document 级监听只挂一次（组件存续期），open 门控；断开时统一清理。
    // shadow DOM 内点击会冒泡到 document，用 composedPath 命中宿主即忽略。
    const onDoc = (e: Event): void => {
      if (!this.open) return
      if (e.composedPath().includes(this)) return
      this.closePicker()
    }
    document.addEventListener('pointerdown', onDoc)
    this.onCleanup(() => document.removeEventListener('pointerdown', onDoc))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override update(): void {
    if (!this.form) return
    const type: InvoiceType = this.getAttr('type', 'personal') === 'company' ? 'company' : 'personal'
    this.setAttribute('data-type', type)

    this.setLabel('input[name="title"]', this.t('invoice.title'))
    this.setLabel('input[name="taxId"]', this.t('invoice.taxId'))
    this.setLabel('select[name="content"]', this.t('invoice.content'))
    this.titleInput!.placeholder = this.t('invoice.titlePlaceholder')
    this.taxInput!.placeholder = this.t('invoice.taxIdPlaceholder')
    const typeLabel = this.shadow.querySelector<HTMLElement>('.field > .label')
    if (typeLabel) typeLabel.textContent = this.t('invoice.typeLabel')
    const group = this.shadow.querySelector<HTMLElement>('.segmented')
    if (group) group.setAttribute('aria-label', this.t('invoice.typeLabel'))
    this.savedTrigger!.textContent = this.t('invoice.selectSaved')
    this.savedTrigger!.setAttribute('aria-label', this.t('invoice.saved'))
    this.pickerList?.setAttribute('aria-label', this.t('invoice.saved'))
    this.shadow.querySelector<HTMLButtonElement>('button[type="submit"]')!.textContent = this.t('invoice.submit')

    this.syncTypeButtons(type)
    if (this.taxField) this.taxField.hidden = type === 'personal'

    this.parseContents()
    this.syncContents()
    this.parseSaved()
    this.syncSaved()

    // 受控回写按「属性原文是否变化」判定：用户输入不反写属性，避免无关 update 用旧属性吞掉草稿
    const title = this.getAttr('title', '')
    if (this.titleInput && title !== this.appliedTitle) {
      this.appliedTitle = title
      this.titleInput.value = title
    }
    const taxId = this.getAttr('tax-id', '')
    if (this.taxInput && taxId !== this.appliedTax) {
      this.appliedTax = taxId
      this.taxInput.value = taxId
    }
    const content = this.getAttr('content', '')
    if (this.contentSelect && content !== this.appliedContent) {
      this.appliedContent = content
      if (content !== '') this.contentSelect.value = content
      else this.appliedContent = this.contentSelect.value
    }

    this.applyDisabled()
    if (this.disabledOrReadonly()) this.closePicker()
  }

  /** 抬头类型分段控件：role=radiogroup + 两项 role=radio，键盘左右切换 */
  private syncTypeButtons(type: InvoiceType): void {
    const group = this.shadow.querySelector<HTMLElement>('.segmented')
    if (!group) return
    const signature = `${type}|${this.t('invoice.personal')}|${this.t('invoice.company')}`
    if (group.dataset.signature !== signature) {
      group.dataset.signature = signature
      group.replaceChildren()
      for (const value of ['personal', 'company'] as const) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'segment'
        btn.setAttribute('part', 'segment')
        btn.setAttribute('role', 'radio')
        btn.dataset.value = value
        btn.tabIndex = value === type ? 0 : -1
        btn.textContent = value === 'personal' ? this.t('invoice.personal') : this.t('invoice.company')
        btn.setAttribute('aria-checked', String(value === type))
        btn.addEventListener('click', () => this.selectType(value))
        group.appendChild(btn)
      }
      group.addEventListener('keydown', (e) => this.onTypeKey(e as KeyboardEvent))
    }
    for (const btn of group.querySelectorAll<HTMLButtonElement>('.segment')) {
      const checked = btn.dataset.value === type
      btn.setAttribute('aria-checked', String(checked))
      btn.tabIndex = checked ? 0 : -1
    }
  }

  private selectType(value: InvoiceType): void {
    if (this.disabledOrReadonly()) return
    if (this.getAttr('type', 'personal') === value) return
    // 切换类型前把当前输入固化为属性，避免 update() 用旧属性回写输入框（丢失用户草稿）
    if (this.titleInput) this.setAttribute('title', this.titleInput.value)
    if (this.taxInput) this.setAttribute('tax-id', this.taxInput.value)
    this.setAttribute('type', value)
    this.emit('change', { field: 'type', value: this.currentValue() })
    if (value === 'personal') this.clearFieldError('taxId')
  }

  private onTypeKey(e: KeyboardEvent): void {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    if (this.disabledOrReadonly()) return
    const next: InvoiceType = this.getAttr('type', 'personal') === 'personal' ? 'company' : 'personal'
    this.selectType(next)
    this.shadow.querySelector<HTMLButtonElement>(`.segment[data-value="${next}"]`)?.focus()
  }

  private parseContents(): void {
    const raw = this.getAttr('contents', '')
    if (raw === this.contentsSignature) return
    this.contentsSignature = raw
    this.contents = parseJsonArray<InvoiceContent>(raw, () =>
      devWarn('[oas-invoice] contents 不是合法 JSON 数组，已按空选项渲染'),
    ).filter((c) => c && typeof c.value === 'string' && typeof c.label === 'string')
  }

  private syncContents(): void {
    if (!this.contentField || !this.contentSelect) return
    this.contentField.hidden = this.contents.length === 0
    if (this.contents.length === 0) return
    const signature = this.contents.map((c) => `${c.value}:${c.label}`).join('|')
    if (this.contentSelect.dataset.signature === signature) return
    this.contentSelect.dataset.signature = signature
    this.contentSelect.replaceChildren()
    for (const option of this.contents) {
      const el = document.createElement('option')
      el.value = option.value
      el.textContent = option.label
      this.contentSelect.appendChild(el)
    }
    // 选项重建后按属性恢复选中值（否则会被浏览器重置到第一项）
    const current = this.getAttr('content', '')
    if (current !== '') {
      this.contentSelect.value = current
      this.appliedContent = current
    }
  }

  private parseSaved(): void {
    const raw = this.getAttr('save-titles', '')
    if (raw === this.savedSignature) return
    this.savedSignature = raw
    this.savedTitles = parseJsonArray<InvoiceSavedTitle>(raw, () =>
      devWarn('[oas-invoice] save-titles 不是合法 JSON 数组，已按空列表渲染'),
    ).filter((t) => t && typeof t.title === 'string')
  }

  private syncSaved(): void {
    if (!this.savedWrap || !this.pickerList) return
    this.savedWrap.hidden = this.savedTitles.length === 0
    this.pickerList.replaceChildren()
    this.savedTitles.forEach((title, index) => {
      const id = this.savedId(title)
      const li = document.createElement('li')
      li.className = 'option'
      li.setAttribute('part', 'option')
      li.setAttribute('role', 'option')
      li.dataset.id = id
      li.tabIndex = -1
      li.setAttribute('aria-selected', String(this.currentTitleId() === id))
      const name = document.createElement('span')
      name.className = 'option-title'
      name.textContent = title.title
      li.appendChild(name)
      if (title.taxId) {
        const tax = document.createElement('span')
        tax.className = 'option-tax'
        tax.textContent = title.taxId
        li.appendChild(tax)
      }
      if (index === this.activeIndex) li.setAttribute('data-active', '')
      this.pickerList!.appendChild(li)
    })
    if (this.savedTitles.length === 0) {
      const empty = this.shadow.querySelector<HTMLElement>('.empty')
      if (empty) {
        empty.textContent = this.t('invoice.noSaved')
        empty.hidden = false
      }
    }
  }

  private togglePicker(): void {
    if (this.disabledOrReadonly()) return
    if (this.open) this.closePicker()
    else this.openPicker()
  }

  private openPicker(): void {
    if (!this.picker || !this.savedTrigger) return
    this.open = true
    this.picker.hidden = false
    this.savedTrigger.setAttribute('aria-expanded', 'true')
    this.activeIndex = this.savedTitles.length > 0 ? 0 : -1
    this.syncActive()
    const first = this.pickerList?.querySelector<HTMLElement>('[role="option"]')
    first?.focus()
  }

  private closePicker(): void {
    if (!this.picker || !this.savedTrigger) return
    this.open = false
    this.picker.hidden = true
    this.savedTrigger.setAttribute('aria-expanded', 'false')
    this.activeIndex = -1
  }

  private syncActive(): void {
    const options = [...(this.pickerList?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])]
    options.forEach((option, index) => {
      option.toggleAttribute('data-active', index === this.activeIndex)
    })
  }

  private onPickerKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault()
      this.closePicker()
      this.savedTrigger?.focus()
      return
    }
    if (this.savedTitles.length === 0) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const delta = e.key === 'ArrowDown' ? 1 : -1
      this.activeIndex = (this.activeIndex + delta + this.savedTitles.length) % this.savedTitles.length
      this.syncActive()
      this.pickerList?.querySelectorAll<HTMLElement>('[role="option"]')[this.activeIndex]?.focus()
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const title = this.savedTitles[this.activeIndex]
      if (title) this.pickSaved(this.savedId(title))
    }
  }

  private pickSaved(id: string): void {
    const title = this.savedTitles.find((t) => this.savedId(t) === id)
    if (!title) return
    this.setAttribute('type', title.type)
    this.setAttribute('title', title.title)
    this.setAttribute('tax-id', title.taxId ?? '')
    this.clearFieldError('title')
    this.clearFieldError('taxId')
    this.closePicker()
    const value = this.currentValue()
    this.emit('title-select', { id, value })
    this.emit('change', { field: 'saved', value })
    this.savedTrigger?.focus()
  }

  private submit(): void {
    if (this.disabledOrReadonly()) return
    const type: InvoiceType = this.getAttr('type', 'personal') === 'company' ? 'company' : 'personal'
    const title = this.titleInput?.value.trim() ?? ''
    const taxId = this.taxInput?.value.trim() ?? ''
    const errors: string[] = []

    if (title === '') {
      errors.push('title')
      this.setFieldError('title', this.t('invoice.requiredTitle'))
    }
    if (type === 'company') {
      if (taxId === '') {
        errors.push('taxId')
        this.setFieldError('taxId', this.t('invoice.taxIdPlaceholder'))
      } else if (!TAX_ID_RE.test(taxId)) {
        errors.push('taxId')
        this.setFieldError('taxId', this.t('invoice.invalidTaxId'))
      }
    }
    if (errors.length > 0) {
      this.emit('invalid', { fields: errors })
      const target = errors[0] === 'title' ? this.titleInput : this.taxInput
      target?.focus()
      return
    }
    this.setAttribute('title', title)
    if (type === 'company') this.setAttribute('tax-id', taxId)
    this.emit('submit', {
      value: {
        type,
        title,
        taxId: type === 'company' ? taxId : '',
        content: this.contentSelect?.value ?? this.getAttr('content', ''),
      },
    })
  }

  private currentValue(): InvoiceValue {
    const type: InvoiceType = this.getAttr('type', 'personal') === 'company' ? 'company' : 'personal'
    return {
      type,
      title: this.titleInput?.value ?? this.getAttr('title', ''),
      taxId: this.taxInput?.value ?? this.getAttr('tax-id', ''),
      content: this.contentSelect?.value ?? this.getAttr('content', ''),
    }
  }

  private currentTitleId(): string {
    return this.savedId({
      type: this.getAttr('type', 'personal') === 'company' ? 'company' : 'personal',
      title: this.getAttr('title', ''),
      taxId: this.getAttr('tax-id', ''),
    })
  }

  private savedId(title: InvoiceSavedTitle): string {
    return title.id ?? `${title.type}:${title.title}:${title.taxId ?? ''}`
  }

  private disabledOrReadonly(): boolean {
    if (this.hasAttr('disabled')) return true
    if (this.injectDisabled()) return true
    return this.hasAttr('readonly')
  }

  private applyDisabled(): void {
    const locked = this.disabledOrReadonly()
    if (this.titleInput) this.titleInput.disabled = locked
    if (this.taxInput) this.taxInput.disabled = locked
    if (this.contentSelect) this.contentSelect.disabled = locked
    if (this.savedTrigger) this.savedTrigger.disabled = locked
    const submit = this.shadow.querySelector<HTMLButtonElement>('button[type="submit"]')
    if (submit) submit.disabled = locked
    this.shadow.querySelectorAll<HTMLButtonElement>('.segment').forEach((btn) => {
      btn.disabled = locked
    })
  }

  private setLabel(selector: string, text: string): void {
    const el = this.shadow.querySelector(selector)
    if (!(el instanceof HTMLElement)) return
    const label = this.shadow.querySelector(`label[for="${el.id}"]`)
    if (label) label.textContent = text
  }

  private setFieldError(field: 'title' | 'taxId', message: string): void {
    const wrap = field === 'title' ? this.titleInput?.closest<HTMLElement>('.field') : this.taxField
    if (!wrap) return
    wrap.setAttribute('data-invalid', '')
    const error = wrap.querySelector<HTMLElement>('.error')
    const input = wrap.querySelector<HTMLInputElement>('.input')
    if (error) {
      error.textContent = message
      error.hidden = false
      if (!error.id) error.id = `${this.uid}-${field}-error`
      input?.setAttribute('aria-describedby', error.id)
    }
    input?.setAttribute('aria-invalid', 'true')
  }

  private clearFieldError(field: 'title' | 'taxId'): void {
    const wrap = field === 'title' ? this.titleInput?.closest<HTMLElement>('.field') : this.taxField
    if (!wrap) return
    wrap.removeAttribute('data-invalid')
    const error = wrap.querySelector<HTMLElement>('.error')
    if (error) {
      error.hidden = true
      error.textContent = ''
    }
    wrap.querySelector('.input')?.removeAttribute('aria-invalid')
  }
}
