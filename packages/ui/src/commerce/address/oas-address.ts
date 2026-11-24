import { OASElement } from '@oas-ui/core/oas-element'
import { parseJsonArray } from '../../shared/json-array.js'
import { devWarn } from '../../shared/dev-warn.js'

/** 省 / 市 / 区三级节点（宿主注入契约：children 递归，最多取三级） */
export interface AddressRegion {
  /** 稳定标识（可选；缺省用 name 作值） */
  code?: string
  name: string
  children?: AddressRegion[]
}

/** 地址值（编辑表单提交 / 列表项共用同一形状） */
export interface AddressEntry {
  id?: string
  name: string
  phone: string
  province?: string
  city?: string
  district?: string
  detail?: string
  /** 是否默认地址（列表项） */
  isDefault?: boolean
}

/** 自定义校验钩子：返回错误串表示不通过（空串 / null / undefined 视为通过） */
export type AddressValidator = (key: string, value: string) => string | null | undefined

export type AddressMode = 'edit' | 'list' | 'contact'

/** 地区值输出档位：name（默认，输出名称）/ code（输出区划编码，缺失 code 的节点回退名称） */
export type AddressValueFormat = 'name' | 'code'

const VALID_MODES: readonly string[] = ['edit', 'list', 'contact']
const VALID_VALUE_FORMATS: readonly string[] = ['name', 'code']
/**
 * 常规电话格式门（移动端场景不锁国家码）：`+` 仅可在首位，允许数字 / 空格 / 连字符，
 * 总字符长 6–21（`+` 占 1 位时上限 21）；数字位数另由 isValidPhone 要求 ≥6（纯符号串如 `------` 不得通过）。
 */
const PHONE_RE = /^\+?[0-9][0-9\s-]{5,19}$/
const PHONE_MIN_DIGITS = 6
const MAX_REGION_DEPTH = 3

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  --oas-address-width: 100%;
}
:host([hidden]) {
  display: none;
}
.form {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-4);
  margin: 0;
  padding: 0;
  border: 0;
  width: var(--oas-address-width);
  box-sizing: border-box;
}
.group {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
}
.form[hidden],
.group[hidden],
.field[hidden],
.row[hidden],
.actions[hidden] {
  display: none;
}
.field {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  min-width: 0;
}
.label {
  font-size: var(--oas-font-size-sm);
  line-height: 1.3;
  color: var(--oas-color-text-secondary);
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
:host([disabled]) .input,
:host([disabled]) .select,
:host([readonly]) .select {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
/* readonly 文本控件保持正常可读色：只读语义是「可聚焦复制、不可编辑」，不是禁用 */
:host([readonly]) .input {
  cursor: default;
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
.row {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  cursor: pointer;
}
.row input {
  accent-color: var(--oas-color-primary);
  margin: 0;
}
.selects {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--oas-space-2);
}
.actions {
  display: flex;
  justify-content: flex-end;
}
.button {
  /* inline-flex：spinner（inline span）的 1em 尺寸只在 flex 布局下生效——
     否则 loading 态渲染成 4px 竖线 */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-1);
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
.button:hover {
  background: var(--oas-color-primary-hover);
  border-color: var(--oas-color-primary-hover);
}
.button:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
:host([disabled]) .button,
:host([readonly]) .button {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  border-color: var(--oas-color-border);
  color: var(--oas-color-text-disabled);
}
.list {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
}
.list[hidden] {
  display: none;
}
.card {
  display: flex;
  align-items: flex-start;
  gap: var(--oas-space-3);
  box-sizing: border-box;
  padding: var(--oas-space-3) var(--oas-space-4);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
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
.card input {
  accent-color: var(--oas-color-primary);
  margin: 0;
  margin-block-start: var(--oas-space-1);
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
  align-items: center;
  gap: var(--oas-space-2);
  flex-wrap: wrap;
  font-size: var(--oas-font-size-md);
}
.card-name {
  font-weight: 600;
}
.card-phone {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.badge {
  padding-inline: var(--oas-space-1);
  border-radius: var(--oas-radius-sm);
  background: color-mix(in srgb, var(--oas-color-primary) 12%, var(--oas-color-bg));
  /* 文字用加深档 token：primary 原色压在 12% 混色底上感知对比度 59.5（门禁 <60 不达标） */
  color: var(--oas-color-primary-text);
  font-size: var(--oas-font-size-xs);
  line-height: 1.5;
}
.card-line {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.add {
  align-self: flex-start;
  box-sizing: border-box;
  min-height: var(--oas-control-height-md);
  padding-inline: var(--oas-space-4);
  border: 1px dashed var(--oas-color-border-strong);
  border-radius: var(--oas-radius-md);
  background: transparent;
  color: var(--oas-color-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-md);
  cursor: pointer;
}
.add:hover {
  border-color: var(--oas-color-primary);
  background: color-mix(in srgb, var(--oas-color-primary) 6%, transparent);
}
.add:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
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
/* 列表卡结构：.card 只负责卡面，radio + 内容收进 .card-main（label，点选区域），
   行内操作钮（编辑 / 删除）独立成组放卡尾——交互控件不嵌进 label（避免点击钮误触选中） */
.card-main {
  display: flex;
  align-items: flex-start;
  gap: var(--oas-space-3);
  flex: 1 1 auto;
  min-width: 0;
  cursor: pointer;
}
.card-actions {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  flex: none;
}
.card-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-1);
  box-sizing: border-box;
  min-height: var(--oas-control-height-sm, 24px);
  padding: 0 var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: transparent;
  color: var(--oas-color-text-secondary);
  font-family: inherit;
  font-size: var(--oas-font-size-xs);
  cursor: pointer;
  transition:
    color var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out),
    background var(--oas-transition-fast) var(--oas-ease-out);
}
.card-action:hover:not(:disabled) {
  color: var(--oas-color-primary-text);
  border-color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
.card-action:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.card-action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.card-action[data-danger='true']:hover:not(:disabled) {
  color: var(--oas-color-danger-text);
  border-color: var(--oas-color-danger);
}
.card-action svg {
  width: 1em;
  height: 1em;
  fill: currentColor;
}
.card-action .spinner {
  width: 1em;
  height: 1em;
  flex: none;
  border: 2px solid currentColor;
  border-inline-start-color: transparent;
  border-radius: 50%;
  animation: oas-address-spin 0.8s linear infinite;
}
.card-action .spinner[hidden] {
  display: none;
}
@keyframes oas-address-spin {
  to {
    transform: rotate(1turn);
  }
}
@media (prefers-reduced-motion: reduce) {
  .card-action .spinner {
    animation-duration: 2.4s;
  }
}
/* 保存按钮 loading 态：spinner 与文案并存 */
.button {
  position: relative;
}
.button .spinner {
  width: 1em;
  height: 1em;
  flex: none;
  border: 2px solid currentColor;
  border-inline-start-color: transparent;
  border-radius: 50%;
  animation: oas-address-spin 0.8s linear infinite;
}
.button .spinner[hidden] {
  display: none;
}
`

let addressUid = 0

export class OASAddress extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'mode',
      'value',
      'items',
      'selected-id',
      'regions',
      'disabled',
      'readonly',
      'show-delete',
      'saving',
      'deleting',
      'value-format',
    ]
  }

  /**
   * 自定义校验钩子（property 通道，attribute 装不下函数）：`validator(key, value)` 返回
   * 错误串表示不通过（并入 `oas-invalid` 与字段错误标记），空串 / null / undefined 视为通过。
   * key 为字段名：`name` / `phone` / `detail` / `province` / `city` / `district`。
   */
  validator: AddressValidator | null = null

  private form: HTMLFormElement | null = null
  private list: HTMLElement | null = null
  private contactGroup: HTMLElement | null = null
  private regionGroup: HTMLElement | null = null
  private detailField: HTMLElement | null = null
  private defaultField: HTMLElement | null = null
  private actions: HTMLElement | null = null
  private addBtn: HTMLButtonElement | null = null
  private emptyEl: HTMLElement | null = null
  private nameInput: HTMLInputElement | null = null
  private phoneInput: HTMLInputElement | null = null
  private detailInput: HTMLTextAreaElement | null = null
  private defaultInput: HTMLInputElement | null = null
  private provinceSelect: HTMLSelectElement | null = null
  private citySelect: HTMLSelectElement | null = null
  private districtSelect: HTMLSelectElement | null = null
  private readonly uid = `oas-address-${++addressUid}`

  /** 当前编辑草稿（受控 value 属性在外部变化时覆盖；用户输入只改草稿不反写属性） */
  private draft: AddressEntry = { name: '', phone: '' }
  private appliedValueSignature = ''
  private renderedListSignature = ''
  private regionsSignature = ''
  private itemsSignature = ''
  private itemsCache: AddressEntry[] = []
  private warnedMode = ''

  /** 受控地址值（property 通道读端）：已归一化的地址对象 */
  get value(): AddressEntry {
    return this.parseValue(this.getAttr('value', ''))
  }
  /** 受控地址值（property 通道写端）：对象序列化、字符串原样反射到 value attribute */
  set value(value: AddressEntry | string) {
    this.setAttribute('value', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** 地址列表数据（property 通道读端）：已解析的地址数组 */
  get items(): AddressEntry[] {
    return this.parseItems()
  }
  /** 地址列表数据（property 通道写端）：数组序列化、字符串原样反射到 items attribute */
  set items(value: AddressEntry[] | string) {
    this.setAttribute('items', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** 省市区数据（property 通道读端）：已解析的三级节点数组 */
  get regions(): AddressRegion[] {
    return this.parseRegions()
  }
  /** 省市区数据（property 通道写端）：数组序列化、字符串原样反射到 regions attribute */
  set regions(value: AddressRegion[] | string) {
    this.setAttribute('regions', typeof value === 'string' ? value : JSON.stringify(value))
  }

  private template(): string {
    return `
      <style>${STYLE}</style>
      <form class="form" part="form" novalidate>
        <div class="group contact-group" part="contact" role="group">
          <div class="field">
            <label class="label" for="${this.uid}-name"></label>
            <input class="input" id="${this.uid}-name" name="name" part="name" autocomplete="name" />
            <span class="error" hidden></span>
          </div>
          <div class="field">
            <label class="label" for="${this.uid}-phone"></label>
            <input class="input" id="${this.uid}-phone" name="phone" part="phone" inputmode="tel" autocomplete="tel" />
            <span class="error" hidden></span>
          </div>
        </div>
        <div class="group region-group" part="region" role="group">
          <div class="field">
            <span class="label"></span>
            <div class="selects">
              <select class="select province" part="province" aria-label="province"></select>
              <select class="select city" part="city" aria-label="city"></select>
              <select class="select district" part="district" aria-label="district"></select>
            </div>
            <span class="error" hidden></span>
          </div>
          <div class="field detail-field">
            <label class="label" for="${this.uid}-detail"></label>
            <textarea class="input" id="${this.uid}-detail" name="detail" part="detail" rows="2"></textarea>
            <span class="error" hidden></span>
          </div>
        </div>
        <label class="row default-field" part="default-field">
          <input type="checkbox" part="default" />
          <span class="default-text"></span>
        </label>
        <div class="actions" part="actions">
          <button type="submit" class="button" part="submit">
            <span class="spinner" part="save-spinner" aria-hidden="true" hidden></span>
            <span class="submit-text" part="submit-text"></span>
          </button>
        </div>
      </form>
      <div class="list" part="list" role="radiogroup"></div>
      <p class="empty" part="empty" hidden></p>
      <button type="button" class="add" part="add" hidden></button>
    `
  }

  private bind(): void {
    this.form = this.shadow.querySelector('form')
    this.list = this.shadow.querySelector('.list')
    this.contactGroup = this.shadow.querySelector('.contact-group')
    this.regionGroup = this.shadow.querySelector('.region-group')
    this.detailField = this.shadow.querySelector('.detail-field')
    this.defaultField = this.shadow.querySelector('.default-field')
    this.actions = this.shadow.querySelector('.actions')
    this.addBtn = this.shadow.querySelector('.add')
    this.emptyEl = this.shadow.querySelector('.empty')
    this.nameInput = this.shadow.querySelector('input[name="name"]')
    this.phoneInput = this.shadow.querySelector('input[name="phone"]')
    this.detailInput = this.shadow.querySelector('textarea[name="detail"]')
    this.defaultInput = this.shadow.querySelector('input[type="checkbox"]')
    this.provinceSelect = this.shadow.querySelector('.province')
    this.citySelect = this.shadow.querySelector('.city')
    this.districtSelect = this.shadow.querySelector('.district')

    this.nameInput?.addEventListener('input', () => this.onFieldInput('name'))
    this.phoneInput?.addEventListener('input', () => this.onFieldInput('phone'))
    this.detailInput?.addEventListener('input', () => this.onFieldInput('detail'))
    this.defaultInput?.addEventListener('change', () => {
      this.draft.isDefault = this.defaultInput!.checked
      this.emitChange('default')
    })
    this.provinceSelect?.addEventListener('change', () => this.onRegionChange('province'))
    this.citySelect?.addEventListener('change', () => this.onRegionChange('city'))
    this.districtSelect?.addEventListener('change', () => this.onRegionChange('district'))
    this.form?.addEventListener('submit', (e) => {
      e.preventDefault()
      this.submit()
    })
    this.addBtn?.addEventListener('click', () => {
      if (this.isLocked()) return
      this.emit('add')
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override update(): void {
    if (!this.form) return
    const mode: AddressMode = this.currentMode()
    this.setAttribute('data-mode', mode)
    // 模式显隐（先算出显隐，占位提示只在可见字段上设置：隐藏字段的 placeholder 不展示，
    // 却会被无障碍静态扫描当成「有文字但取不到配色的节点」，制造无意义噪声）
    const showForm = mode !== 'list'
    const showContactOnly = mode === 'contact'
    const showDetail = showForm && !showContactOnly

    // 静态文案（locale 切换时 update() 会自动重刷）
    this.setLabel('input[name="name"]', this.t('address.name'))
    this.setLabel('input[name="phone"]', this.t('address.phone'))
    this.setLabel('textarea[name="detail"]', this.t('address.detail'))
    this.setPlaceholder(this.nameInput, showForm ? this.t('address.namePlaceholder') : '')
    this.setPlaceholder(this.phoneInput, showForm ? this.t('address.phonePlaceholder') : '')
    this.setPlaceholder(this.detailInput, showDetail ? this.t('address.detailPlaceholder') : '')
    const regionLabel = this.shadow.querySelector<HTMLElement>('.region-group > .field > .label')
    if (regionLabel) regionLabel.textContent = this.t('address.region')
    this.contactGroup?.setAttribute('aria-label', this.t('address.contact'))
    this.regionGroup?.setAttribute('aria-label', this.t('address.region'))
    const defaultText = this.shadow.querySelector<HTMLElement>('.default-text')
    if (defaultText) defaultText.textContent = this.t('address.default')
    const submitBtn = this.shadow.querySelector<HTMLButtonElement>('button[type="submit"]')
    const submitText = this.shadow.querySelector<HTMLElement>('[part="submit-text"]')
    if (submitText) submitText.textContent = this.t('address.save')
    if (submitBtn) submitBtn.setAttribute('aria-label', this.t('address.save'))
    if (this.addBtn) this.addBtn.textContent = this.t('address.add')
    if (this.provinceSelect)
      this.provinceSelect.setAttribute('aria-label', `${this.t('address.region')} ${this.t('address.select')}`)
    if (this.citySelect)
      this.citySelect.setAttribute('aria-label', `${this.t('address.region')} ${this.t('address.select')}`)
    if (this.districtSelect)
      this.districtSelect.setAttribute('aria-label', `${this.t('address.region')} ${this.t('address.select')}`)
    this.list?.setAttribute('aria-label', this.t('address.listLabel'))

    if (this.form) this.setSectionHidden(this.form, !showForm)
    if (this.list) this.setSectionHidden(this.list, showForm)
    if (this.addBtn) this.setSectionHidden(this.addBtn, showForm)
    if (this.emptyEl) this.setSectionHidden(this.emptyEl, showForm)
    if (this.contactGroup) this.setSectionHidden(this.contactGroup, !showForm)
    if (this.regionGroup) this.setSectionHidden(this.regionGroup, !showDetail)
    if (this.detailField) this.setSectionHidden(this.detailField, !showDetail)
    if (this.defaultField) this.setSectionHidden(this.defaultField, !showDetail)
    if (this.actions) this.setSectionHidden(this.actions, !showDetail)

    this.applyDisabled()
    this.parseRegions()
    this.syncRegions()
    this.applyValue()
    if (mode === 'list') this.renderList()
    // 忙态在列表（可能重建）之后应用：重建签名不含 busy，deleting 切换不重建卡片
    // （保焦点 / 滚动），由这里对既有按钮增量同步；重建出的新卡片也在此被补上忙态
    this.applyBusyStates()
  }

  /** saving / deleting 忙态：保存钮与删除钮禁用 + aria-busy + spinner（正交于 disabled，可叠加） */
  private applyBusyStates(): void {
    const saving = this.hasAttr('saving')
    const deleting = this.hasAttr('deleting')
    const submitBtn = this.shadow.querySelector<HTMLButtonElement>('button[type="submit"]')
    const saveSpinner = this.shadow.querySelector<HTMLElement>('[part="save-spinner"]')
    if (submitBtn) {
      if (saving) submitBtn.setAttribute('aria-busy', 'true')
      else submitBtn.removeAttribute('aria-busy')
    }
    if (saveSpinner) saveSpinner.hidden = !saving
    for (const btn of this.shadow.querySelectorAll<HTMLButtonElement>('[part="card-delete"]')) {
      if (deleting) btn.setAttribute('aria-busy', 'true')
      else btn.removeAttribute('aria-busy')
      const spinner = btn.querySelector<HTMLElement>('[part="card-delete-spinner"]')
      if (spinner) spinner.hidden = !deleting
    }
  }

  /**
   * 分区显隐同步：`hidden` 之外再挂 `inert`。隐藏分区里的输入框既不该被键盘聚焦 / 朗读，
   * 也会被无障碍静态扫描当作「有文字但取不到配色」的噪声节点（多形态组件一页会堆到十几条）。
   * 两个状态由同一个布尔驱动，不会出现「可见却被 inert」。
   */
  private setSectionHidden(el: HTMLElement | null, hidden: boolean): void {
    if (!el) return
    el.hidden = hidden
    el.toggleAttribute('inert', hidden)
  }

  /** 形态解析（非法值回落 edit，并只告警一次——反复 update 不刷屏） */
  private currentMode(): AddressMode {
    const raw = this.getAttr('mode', 'edit')
    if (VALID_MODES.includes(raw)) return raw as AddressMode
    if (this.warnedMode !== raw) {
      this.warnedMode = raw
      devWarn(`[oas-address] mode="${raw}" 不是合法形态（edit / list / contact），已按 edit 渲染`)
    }
    return 'edit'
  }

  /** 用户输入通道：只更新草稿 + 派发 change，不反写 value 属性（受控语义由宿主决定） */
  private onFieldInput(field: 'name' | 'phone' | 'detail'): void {
    if (this.isLocked()) return
    if (!this.nameInput || !this.phoneInput || !this.detailInput) return
    this.draft.name = this.nameInput.value
    this.draft.phone = this.phoneInput.value
    this.draft.detail = this.detailInput.value
    this.clearFieldError(field)
    this.emitChange(field)
  }

  private onRegionChange(level: 'province' | 'city' | 'district'): void {
    if (this.isLocked()) return
    const province = this.provinceSelect?.value ?? ''
    const city = this.citySelect?.value ?? ''
    const district = this.districtSelect?.value ?? ''
    this.draft.province = province
    this.draft.city = level === 'province' ? '' : city
    this.draft.district = level === 'district' ? district : ''
    this.syncRegions()
    this.clearFieldError('region')
    this.emitChange('region')
  }

  private emitChange(field: string): void {
    this.emit('change', { field, value: this.outputValue({ ...this.draft }) })
  }

  /** 表单提交：校验通过派发 oas-submit，否则标记字段并派发 oas-invalid */
  private submit(): void {
    if (this.isLocked()) return
    // saving 忙态拦截（原生 disabled 之外的程序化 submit 兜底）
    if (this.hasAttr('saving')) return
    // contact 轻模式没有提交按钮（契约只有姓名 + 电话 + 输入即 change），
    // 输入框里按 Enter 触发的隐式提交必须拦住，否则会冒出一条无按钮可触发的 oas-invalid
    if (this.currentMode() === 'contact') return
    const errors: string[] = []
    const name = this.nameInput?.value.trim() ?? ''
    const phone = this.phoneInput?.value.trim() ?? ''
    const detail = this.detailInput?.value.trim() ?? ''
    const requireRegion = this.hasRegionData()

    if (name === '') {
      errors.push('name')
      this.setFieldError('name', this.t('address.required'))
    }
    if (phone === '') {
      errors.push('phone')
      this.setFieldError('phone', this.t('address.required'))
    } else if (!isValidPhone(phone)) {
      errors.push('phone')
      this.setFieldError('phone', this.t('address.invalidPhone'))
    }
    if (requireRegion && !this.regionComplete()) {
      errors.push('region')
      this.setFieldError('region', this.t('address.required'))
    }
    if (requireRegion && detail === '') {
      errors.push('detail')
      this.setFieldError('detail', this.t('address.required'))
    }

    this.draft = {
      ...this.draft,
      name,
      phone,
      detail,
      province: this.provinceSelect?.value ?? '',
      city: this.citySelect?.value ?? '',
      district: this.districtSelect?.value ?? '',
    }

    // 自定义校验钩子：内建校验之后逐字段调用，返回错误串则标记并并入 oas-invalid
    const customErrors = this.runValidator()
    for (const [key, message] of customErrors) {
      if (!errors.includes(key)) errors.push(key)
      this.setFieldError(key, message)
    }

    if (errors.length > 0) {
      this.emit('invalid', { fields: errors })
      this.focusField(errors[0]!)
      return
    }
    this.emit('submit', { value: this.outputValue({ ...this.draft }) })
  }

  /**
   * 自定义校验（validator property）：逐字段调用并收集错误。
   * 抛错不中断提交（devWarn 后按无错误处理——宿主钩子 bug 不该把表单锁死）。
   */
  private runValidator(): Array<[string, string]> {
    const validate = this.validator
    if (typeof validate !== 'function') return []
    const entries: Array<[string, string]> = [
      ['name', this.draft.name ?? ''],
      ['phone', this.draft.phone ?? ''],
      ['province', this.draft.province ?? ''],
      ['city', this.draft.city ?? ''],
      ['district', this.draft.district ?? ''],
      ['detail', this.draft.detail ?? ''],
    ]
    const out: Array<[string, string]> = []
    for (const [key, value] of entries) {
      let message: string | null | undefined
      try {
        message = validate(key, value)
      } catch (error) {
        devWarn(`[oas-address] validator 抛错（key="${key}"），已按无错误处理：${String(error)}`)
        continue
      }
      if (typeof message === 'string' && message !== '') out.push([key, message])
    }
    return out
  }

  /** 首个错误字段聚焦（region 组共用省下拉；未知键回落姓名输入框） */
  private focusField(key: string): void {
    const target =
      key === 'name'
        ? this.nameInput
        : key === 'phone'
          ? this.phoneInput
          : key === 'detail'
            ? this.detailInput
            : key === 'region' || key === 'province' || key === 'city' || key === 'district'
              ? this.provinceSelect
              : this.nameInput
    target?.focus()
  }

  /**
   * 输出值按 value-format 归档：`name`（默认）原样输出名称；`code` 把省/市/区名称换成
   * 区划编码（regions 数据缺 code 的节点回退名称——数据契约以宿主注入为准）。
   */
  private outputValue(draft: AddressEntry): AddressEntry {
    if (this.resolveValueFormat() !== 'code') return draft
    return {
      ...draft,
      province: this.regionCodeOf(draft.province ?? ''),
      city: this.regionCodeOf(draft.city ?? ''),
      district: this.regionCodeOf(draft.district ?? ''),
    }
  }

  private resolveValueFormat(): AddressValueFormat {
    const raw = this.getAttr('value-format', 'name')
    return VALID_VALUE_FORMATS.includes(raw) ? (raw as AddressValueFormat) : 'name'
  }

  /** 名称 → 编码（找不到节点或缺 code 回退原名称） */
  private regionCodeOf(name: string): string {
    if (name === '') return ''
    const find = (nodes: AddressRegion[]): string | null => {
      for (const node of nodes) {
        if (node.name === name) return typeof node.code === 'string' && node.code !== '' ? node.code : name
        const hit = node.children ? find(node.children) : null
        if (hit !== null) return hit
      }
      return null
    }
    return find(this.regionsCache) ?? name
  }

  /** 编码 → 名称（value 回填用；找不到节点回退原值） */
  private regionNameOf(code: string): string {
    if (code === '') return ''
    const find = (nodes: AddressRegion[]): string | null => {
      for (const node of nodes) {
        if (node.code === code) return node.name
        const hit = node.children ? find(node.children) : null
        if (hit !== null) return hit
      }
      return null
    }
    return find(this.regionsCache) ?? code
  }

  /** 受控 value 应用：仅当 value 原文（或 value-format）变化时覆盖草稿（避免用户输入被无关 update 覆盖） */
  private applyValue(): void {
    const raw = this.getAttr('value', '')
    const format = this.resolveValueFormat()
    const signature = `${format}|${raw}`
    if (signature === this.appliedValueSignature) return
    this.appliedValueSignature = signature
    const parsed = this.parseValue(raw)
    this.draft =
      format === 'code'
        ? {
            ...parsed,
            province: this.regionNameOf(parsed.province ?? ''),
            city: this.regionNameOf(parsed.city ?? ''),
            district: this.regionNameOf(parsed.district ?? ''),
          }
        : parsed
    if (this.nameInput) this.nameInput.value = this.draft.name
    if (this.phoneInput) this.phoneInput.value = this.draft.phone
    if (this.detailInput) this.detailInput.value = this.draft.detail ?? ''
    if (this.defaultInput) this.defaultInput.checked = this.draft.isDefault === true
    this.syncRegions()
  }

  private parseValue(raw: string): AddressEntry {
    if (raw.trim() === '') return { name: '', phone: '' }
    try {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const o = parsed as Record<string, unknown>
        return {
          id: typeof o['id'] === 'string' ? o['id'] : undefined,
          name: typeof o['name'] === 'string' ? o['name'] : '',
          phone: typeof o['phone'] === 'string' ? o['phone'] : '',
          province: typeof o['province'] === 'string' ? o['province'] : '',
          city: typeof o['city'] === 'string' ? o['city'] : '',
          district: typeof o['district'] === 'string' ? o['district'] : '',
          detail: typeof o['detail'] === 'string' ? o['detail'] : '',
          isDefault: o['isDefault'] === true,
        }
      }
    } catch {
      devWarn('[oas-address] value 不是合法 JSON 对象，已按空地址处理')
    }
    return { name: '', phone: '' }
  }

  private parseRegions(): AddressRegion[] {
    const raw = this.getAttr('regions', '')
    if (raw === this.regionsSignature) return this.regionsCache
    this.regionsSignature = raw
    this.regionsCache = parseJsonArray<AddressRegion>(raw, () =>
      devWarn('[oas-address] regions 不是合法 JSON 数组，已按空数据渲染'),
    ).filter((r) => r && typeof r.name === 'string')
    return this.regionsCache
  }

  private regionsCache: AddressRegion[] = []

  /** 三级下拉重建：省份全集；市 = 省 children；区 = 市 children。保留草稿选中值。 */
  private syncRegions(): void {
    if (!this.provinceSelect || !this.citySelect || !this.districtSelect) return
    const regions = this.regionsCache
    fillSelect(this.provinceSelect, regions, this.t('address.select'), this.draft.province ?? '')
    const province = regions.find((r) => r.name === this.provinceSelect!.value)
    const cities = province?.children ?? []
    fillSelect(this.citySelect, cities, this.t('address.select'), this.draft.city ?? '')
    const city = cities.find((c) => c.name === this.citySelect!.value)
    const districts = city?.children ?? []
    fillSelect(this.districtSelect, districts, this.t('address.select'), this.draft.district ?? '')
    const maxDepth = this.regionDepth()
    this.citySelect.disabled = this.isLocked() || maxDepth < 2
    this.districtSelect.disabled = this.isLocked() || maxDepth < 3
    this.provinceSelect.disabled = this.isLocked() || regions.length === 0
    if (this.draft.city && cities.some((c) => c.name === this.draft.city) === false) this.draft.city = ''
    if (this.draft.district && districts.some((d) => d.name === this.draft.district) === false) this.draft.district = ''
  }

  private regionDepth(): number {
    const depthOf = (nodes: AddressRegion[]): number => {
      let max = 0
      for (const node of nodes) {
        const child = node.children?.length ? depthOf(node.children) : 0
        max = Math.max(max, 1 + child)
      }
      return max
    }
    return Math.min(depthOf(this.regionsCache), MAX_REGION_DEPTH)
  }

  private hasRegionData(): boolean {
    return this.regionsCache.length > 0
  }

  private regionComplete(): boolean {
    if (this.regionsCache.length === 0) return true
    const depth = this.regionDepth()
    if (depth >= 1 && (this.provinceSelect?.value ?? '') === '') return false
    if (depth >= 2 && (this.citySelect?.value ?? '') === '') return false
    if (depth >= 3 && (this.districtSelect?.value ?? '') === '') return false
    return true
  }

  /** 地址列表数据（items attribute 解析缓存：property 读端与列表渲染共用同一份） */
  private parseItems(): AddressEntry[] {
    const raw = this.getAttr('items', '[]')
    if (raw === this.itemsSignature) return this.itemsCache
    this.itemsSignature = raw
    this.itemsCache = parseJsonArray<AddressEntry>(raw, () =>
      devWarn('[oas-address] items 不是合法 JSON 数组，已按空列表渲染'),
    ).filter((item) => item && typeof item === 'object')
    return this.itemsCache
  }

  /** 列表模式：items / 文案 / 行内钮配置签名变化才重建；选中态增量同步（选中变化不重建，避免抢焦点） */
  private renderList(): void {
    if (!this.list) return
    const items = this.parseItems()
    const signature = [
      this.itemsSignature,
      this.t('address.defaultBadge'),
      this.t('address.edit'),
      this.t('address.delete'),
      this.hasAttr('disabled') || this.hasAttr('readonly') ? 'd' : '',
      this.hasAttr('show-delete') ? 'del' : '',
    ].join('|')
    if (signature !== this.renderedListSignature) {
      this.renderedListSignature = signature
      this.list.replaceChildren()
      for (const item of items) this.list.appendChild(this.buildCard(item))
      this.reconcileSelected(items)
    }
    this.syncCards()
    const empty = this.emptyEl
    if (empty) {
      empty.textContent = this.t('address.empty')
      empty.hidden = this.list.children.length > 0
    }
  }

  /**
   * 宿主删掉选中项后自愈：selected-id 指向不存在的项时回落到 default / 首项并派发 oas-select，
   * 避免宿主界面停在「一个已经不存在的地址」上（attribute 同步写回，受控侧可感知）。
   */
  private reconcileSelected(items: AddressEntry[]): void {
    const own = this.getAttr('selected-id', '')
    if (own === '') return
    if (items.some((item) => this.idOf(item) === own)) return
    const fallback = this.fallbackSelectedId(items)
    if (fallback === '' || fallback === own) return
    this.setAttribute('selected-id', fallback)
    const item = items.find((entry) => this.idOf(entry) === fallback) ?? null
    this.emit('select', { id: fallback, item })
  }

  private buildCard(item: AddressEntry): HTMLDivElement {
    const id = this.idOf(item)
    const selected = id === this.currentSelectedId()
    const card = document.createElement('div')
    card.className = 'card'
    card.setAttribute('part', 'card')
    card.dataset.id = id
    if (selected) card.setAttribute('data-selected', '')

    // radio + 内容收进 label（点选区域）；操作钮独立在卡尾，不嵌进 label
    const main = document.createElement('label')
    main.className = 'card-main'

    const input = document.createElement('input')
    input.type = 'radio'
    input.name = this.uid
    input.value = id
    input.checked = selected
    input.disabled = this.isLocked()
    input.addEventListener('change', () => this.selectItem(id, item))
    main.appendChild(input)

    const body = document.createElement('span')
    body.className = 'card-body'
    const head = document.createElement('span')
    head.className = 'card-head'
    const name = document.createElement('span')
    name.className = 'card-name'
    name.textContent = item.name
    head.appendChild(name)
    const phone = document.createElement('span')
    phone.className = 'card-phone'
    phone.textContent = item.phone
    head.appendChild(phone)
    if (item.isDefault) {
      const badge = document.createElement('span')
      badge.className = 'badge'
      badge.textContent = this.t('address.defaultBadge')
      head.appendChild(badge)
    }
    body.appendChild(head)
    const line = document.createElement('span')
    line.className = 'card-line'
    line.textContent = [item.province, item.city, item.district, item.detail].filter(Boolean).join(' ')
    body.appendChild(line)
    main.appendChild(body)
    card.appendChild(main)

    const actions = document.createElement('span')
    actions.className = 'card-actions'
    actions.appendChild(this.buildCardAction(id, item, 'edit'))
    if (this.hasAttr('show-delete')) actions.appendChild(this.buildCardAction(id, item, 'delete'))
    card.appendChild(actions)
    return card
  }

  /** 行内操作钮：编辑（恒有）/ 删除（show-delete 在场）；deleting 态删除钮转忙（按属性直接生成，重建路径同样正确） */
  private buildCardAction(id: string, item: AddressEntry, kind: 'edit' | 'delete'): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'card-action'
    btn.setAttribute('part', kind === 'edit' ? 'card-edit' : 'card-delete')
    btn.dataset.id = id
    btn.dataset.action = kind
    if (kind === 'delete') btn.setAttribute('data-danger', 'true')
    const label = kind === 'edit' ? this.t('address.edit') : this.t('address.delete')
    btn.setAttribute('aria-label', `${label} ${item.name}`)
    const busy = kind === 'delete' && this.hasAttr('deleting')
    const spinner = document.createElement('span')
    spinner.className = 'spinner'
    spinner.setAttribute('part', 'card-delete-spinner')
    spinner.setAttribute('aria-hidden', 'true')
    spinner.hidden = !busy
    if (busy) btn.setAttribute('aria-busy', 'true')
    const text = document.createElement('span')
    text.textContent = label
    btn.append(spinner, text)
    btn.disabled = this.isLocked() || busy
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (this.isLocked()) return
      if (kind === 'edit') this.emit('edit', { id, item })
      else if (!this.hasAttr('deleting')) this.emit('delete', { id, item })
    })
    return btn
  }

  private selectItem(id: string, item: AddressEntry): void {
    if (this.isLocked()) return
    if (id === this.getAttr('selected-id', '')) {
      this.syncCards()
      return
    }
    this.setAttribute('selected-id', id)
    this.emit('select', { id, item })
    this.syncCards()
  }

  /** cards 选中态增量同步（不重建 DOM） */
  private syncCards(): void {
    if (!this.list) return
    const selected = this.currentSelectedId()
    for (const card of this.list.querySelectorAll<HTMLElement>('.card')) {
      const on = card.dataset.id === selected
      card.toggleAttribute('data-selected', on)
      const input = card.querySelector<HTMLInputElement>('input')
      if (input) {
        input.checked = on
        input.disabled = this.isLocked()
      }
    }
  }

  private currentSelectedId(): string {
    const own = this.getAttr('selected-id', '')
    if (own !== '') return own
    return this.fallbackSelectedId(this.parseItems())
  }

  /** 同 id 派生规则（渲染 / 回落 / 选中同步共用一份，避免三处各写一套） */
  private idOf(item: AddressEntry): string {
    return String(item.id ?? `${item.name}-${item.phone}`)
  }

  /** selected-id 缺省（或被宿主删项）时的回落项：isDefault 优先，否则首项 */
  private fallbackSelectedId(items: AddressEntry[]): string {
    const def = items.find((item) => item.isDefault)
    if (def) return this.idOf(def)
    const first = items[0]
    return first ? this.idOf(first) : ''
  }

  private isLocked(): boolean {
    if (this.hasAttr('disabled')) return true
    if (this.injectDisabled()) return true
    return this.hasAttr('readonly')
  }

  /** 仅 readonly（没有 disabled / 继承禁用）：文本控件走原生 readOnly —— 可聚焦复制、不可编辑 */
  private isReadonlyOnly(): boolean {
    return this.hasAttr('readonly') && !this.hasAttr('disabled') && !this.injectDisabled()
  }

  private applyDisabled(): void {
    const locked = this.isLocked()
    const readonlyOnly = this.isReadonlyOnly()
    const textControls = [this.nameInput, this.phoneInput, this.detailInput]
    for (const control of textControls) {
      if (!control) continue
      control.disabled = locked && !readonlyOnly
      control.readOnly = readonlyOnly
    }
    if (this.defaultInput) this.defaultInput.disabled = locked
    if (this.addBtn) this.addBtn.disabled = locked
    const submitBtn = this.shadow.querySelector<HTMLButtonElement>('button[type="submit"]')
    if (submitBtn) submitBtn.disabled = locked
    // 行内操作钮：锁定态禁用；deleting 态删除钮禁用（保存钮 saving 态同理）
    const deleting = this.hasAttr('deleting')
    const saving = this.hasAttr('saving')
    for (const btn of this.shadow.querySelectorAll<HTMLButtonElement>('[part="card-edit"], [part="card-delete"]')) {
      btn.disabled = locked || (btn.dataset.action === 'delete' && deleting)
    }
    if (submitBtn) submitBtn.disabled = locked || saving
    if (this.form) {
      this.form.querySelectorAll('input, textarea, select, button').forEach((el) => {
        const keepsFocusable = readonlyOnly && textControls.includes(el as HTMLInputElement)
        if (locked && !keepsFocusable) el.setAttribute('aria-disabled', 'true')
        else el.removeAttribute('aria-disabled')
      })
    }
  }

  private setLabel(selector: string, text: string): void {
    const input = this.shadow.querySelector(selector)
    if (!(input instanceof HTMLElement)) return
    const label = this.shadow.querySelector(`label[for="${input.id}"]`)
    if (label) label.textContent = text
  }

  private setPlaceholder(el: HTMLInputElement | HTMLTextAreaElement | null, text: string): void {
    if (el) el.placeholder = text
  }

  /**
   * 字段名 → 字段容器。region 是「三级下拉」这一组的校验单元（无单个 input），
   * 必须与 name/phone/detail 同等对待——否则 setFieldError 静默 return，地区必填错误永远不可见。
   */
  private fieldOf(name: string): HTMLElement | null {
    if (name === 'region') return this.regionGroup?.querySelector<HTMLElement>('.field') ?? null
    const el =
      name === 'name'
        ? this.nameInput
        : name === 'phone'
          ? this.phoneInput
          : name === 'detail'
            ? this.detailInput
            : null
    return el?.closest<HTMLElement>('.field') ?? null
  }

  /** 字段内的可校验控件（region 组是多个 select，全部标记 aria-invalid / describedby） */
  private controlsOf(field: HTMLElement): Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
    return [...field.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('.input, .select')]
  }

  private setFieldError(name: string, message: string): void {
    const field = this.fieldOf(name)
    if (!field) return
    field.setAttribute('data-invalid', '')
    const error = field.querySelector<HTMLElement>('.error')
    if (error) {
      error.textContent = message
      error.hidden = false
      if (!error.id) error.id = `${this.uid}-${name}-error`
    }
    for (const control of this.controlsOf(field)) {
      control.setAttribute('aria-invalid', 'true')
      if (error) control.setAttribute('aria-describedby', error.id)
    }
  }

  private clearFieldError(name: string): void {
    const field = this.fieldOf(name)
    if (!field) return
    field.removeAttribute('data-invalid')
    const error = field.querySelector<HTMLElement>('.error')
    if (error) {
      error.hidden = true
      error.textContent = ''
    }
    for (const control of this.controlsOf(field)) control.removeAttribute('aria-invalid')
  }
}

/** 电话有效：格式门 + 数字位数下限（纯符号串不得通过：`^[0-9+\-\s]{6,20}$` 曾让 `------` 合法） */
function isValidPhone(phone: string): boolean {
  if (!PHONE_RE.test(phone)) return false
  return phone.replace(/\D/g, '').length >= PHONE_MIN_DIGITS
}

/** 填充 select：首项为占位（空值）；value 匹配项设为选中 */
function fillSelect(select: HTMLSelectElement, options: AddressRegion[], placeholder: string, value: string): void {
  select.replaceChildren()
  const empty = document.createElement('option')
  empty.value = ''
  empty.textContent = placeholder
  select.appendChild(empty)
  for (const option of options) {
    const el = document.createElement('option')
    el.value = option.name
    el.textContent = option.name
    select.appendChild(el)
  }
  select.value = options.some((o) => o.name === value) ? value : ''
}
