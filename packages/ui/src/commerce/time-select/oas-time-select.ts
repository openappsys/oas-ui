import { OASElement } from '@oas-ui/core/oas-element'
import { getLocaleName } from '@oas-ui/i18n/registry'
import { devWarn } from '../../shared/dev-warn.js'
import { isRtl } from '../../shared/direction.js'
import { stableHash36 } from '../../shared/stable-id.js'

/**
 * oas-time-select —— 配送时段选择（commerce 族）。
 *
 * 下单链路的时间选择件：日期列（今日起 N 天）+ 时段网格（固定时段或按日期覆盖），
 * 「尽快送达 / 预约配送」两模式；不可选时段区分「休息」与「满约」两种语义。
 *
 * 属性（kebab-case）：
 * - `days`：日期列天数（今日起 N 天，缺省 3；非法值回落 3 并告警一次）
 * - `start-date`：起始日期 `YYYY-MM-DD`（缺省今天；供宿主指定发货日与测试固定时点）
 * - `slots`：通用时段 JSON 数组 `[{ key, label, disabled?, full? }]`；字符串项按 `key=label` 收敛
 * - `slots-override`：按日期覆盖的时段 JSON 对象 `{ "YYYY-MM-DD": [...] }`（该日以覆盖值为准）
 * - `mode`：`express` 尽快送达（缺省，自动取首个可用时段）/ `schedule` 预约配送（手动选日期与时段）
 * - `value`：值 JSON 对象 `{ date, slot }`；property 对象与 attribute JSON 双通道
 * - `disabled`：整体禁用
 *
 * 事件（bubbles + composed）：
 * - `oas-change`：用户改变模式 / 日期 / 时段后派发，`detail: { value, mode, date, slot }`
 *
 * a11y：日期列 `role="tablist"`（垂直）+ `role="tab"`，时段网格 `role="radiogroup"` + `role="radio"`，
 * 模式组同为 `role="radiogroup"` + `role="radio"`；
 * 三处各自 roving tabindex，方向键在可用项之间移动（跳过休息 / 满约），Home / End 到首末可用项；
 * 选中态由 `aria-selected` / `aria-checked` 同步，绑定关系走 `aria-controls` / `aria-labelledby`。
 *
 * @summary 配送日期与时段选择（尽快送达 / 预约配送）
 */

export interface TimeSlot {
  key: string
  label: string
  /** 休息：该时段不提供配送 */
  disabled?: boolean
  /** 满约：该时段预约量已满 */
  full?: boolean
}

export type TimeSelectMode = 'express' | 'schedule'

export interface TimeSelectValue {
  date: string
  slot: string
}

const VALID_MODES: readonly string[] = ['express', 'schedule']
const DEFAULT_DAYS = 3
const MAX_DAYS = 14

const warned = new Set<string>()
function warnOnce(message: string): void {
  if (warned.has(message)) return
  warned.add(message)
  devWarn(message)
}

/** 本地日期键（YYYY-MM-DD，不做 UTC 换算——时区邻日不漂移） */
function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** `YYYY-MM-DD` → 本地零点 Date；非法返回 null */
function parseDateKey(raw: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount)
}

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const STYLE = `
:host {
  display: block;
  box-sizing: border-box;
  inline-size: 100%;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none !important;
}
.root {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
  font-size: var(--oas-font-size-md);
}
.root[data-disabled] {
  opacity: 0.7;
}
.modes {
  display: flex;
  gap: var(--oas-space-2);
}
.mode {
  box-sizing: border-box;
  min-block-size: var(--oas-touch-target-min);
  padding: var(--oas-space-1) var(--oas-space-4);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font: inherit;
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
  transition:
    border-color var(--oas-transition-fast) var(--oas-ease-out),
    color var(--oas-transition-fast) var(--oas-ease-out);
}
.mode:hover {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary-text);
}
.mode[aria-checked='true'] {
  border-color: var(--oas-color-primary);
  background: color-mix(in srgb, var(--oas-color-primary) 10%, transparent);
  color: var(--oas-color-primary-text);
  font-weight: 600;
}
.mode:focus-visible,
.date:focus-visible,
.slot:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 2px;
}
.picker {
  display: flex;
  gap: var(--oas-space-3);
  min-inline-size: 0;
}
.picker[hidden],
.express[hidden],
.empty[hidden] {
  display: none;
}
.dates {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: var(--oas-space-1);
  min-inline-size: 5.5rem;
  margin: 0;
  padding: 0;
  border: 0;
}
.date {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--oas-space-1);
  inline-size: 100%;
  min-block-size: var(--oas-touch-target-min);
  padding: var(--oas-space-1) var(--oas-space-2);
  border: 1px solid transparent;
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
  font: inherit;
  font-size: var(--oas-font-size-sm);
  text-align: start;
  cursor: pointer;
}
.date:hover {
  border-color: var(--oas-color-primary);
}
.date[aria-selected='true'] {
  border-color: var(--oas-color-primary);
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
  color: var(--oas-color-primary-text);
  font-weight: 600;
}
.date[aria-disabled='true'] {
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
  cursor: not-allowed;
}
.date[aria-disabled='true']:hover {
  border-color: transparent;
}
/* 次要文字落在 bg-hover 表面：用 secondary-strong 保证 4.5:1（secondary 在 #f4f4f5 上仅 4.39） */
.date-relative {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary-strong);
}
.date[aria-selected='true'] .date-relative {
  color: inherit;
}
.date[aria-disabled='true'] .date-relative {
  color: var(--oas-color-text-disabled);
}
.slots {
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
  gap: var(--oas-space-2);
  align-content: start;
  min-inline-size: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
.slot {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--oas-space-1);
  min-block-size: var(--oas-touch-target-min);
  padding: var(--oas-space-1) var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font: inherit;
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
  transition:
    border-color var(--oas-transition-fast) var(--oas-ease-out),
    background-color var(--oas-transition-fast) var(--oas-ease-out);
}
.slot:hover {
  border-color: var(--oas-color-primary);
}
.slot[aria-checked='true'] {
  border-color: var(--oas-color-primary);
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
  color: var(--oas-color-primary-text);
  font-weight: 600;
}
.slot[data-state='rest'],
.slot[data-state='full'] {
  border-style: dashed;
  border-color: var(--oas-color-border);
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
  cursor: not-allowed;
}
.slot[data-state='rest']:hover,
.slot[data-state='full']:hover {
  border-color: var(--oas-color-border);
}
/* 休息 / 满约两种不可选语义的视觉区分：满约划掉时段文字并给出「已满约」徽标 */
.slot[data-state='full'] .slot-label {
  text-decoration: line-through;
}
.slot-badge {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.slot[data-state] .slot-badge {
  color: inherit;
}
.express {
  display: flex;
  align-items: baseline;
  gap: var(--oas-space-2);
  min-block-size: var(--oas-touch-target-min);
  padding: var(--oas-space-1) var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-hover);
  font-size: var(--oas-font-size-sm);
}
.express-title {
  font-weight: 600;
}
.express-detail {
  color: var(--oas-color-text-secondary-strong);
}
.empty {
  padding: var(--oas-space-3) 0;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 480px) {
  .picker {
    flex-direction: column;
  }
  .dates {
    flex-direction: row;
    overflow-x: auto;
    padding-block-end: var(--oas-space-1);
  }
  .date {
    inline-size: auto;
    min-inline-size: 4.5rem;
  }
}
@media (forced-colors: active) {
  /* 强制色下自绘底色失效：选中态与焦点环回退系统色实线（WCAG 1.4.1 / 2.4.7） */
  .mode:focus-visible,
  .date:focus-visible,
  .slot:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 1px;
  }
  .date[aria-selected='true'],
  .slot[aria-checked='true'],
  .mode[aria-checked='true'] {
    outline: 2px solid Highlight;
    outline-offset: -2px;
  }
}
`

export class OASTimeSelect extends OASElement {
  static override get observedAttributes(): string[] {
    return ['days', 'start-date', 'slots', 'slots-override', 'mode', 'value', 'disabled']
  }

  private rootEl: HTMLElement | null = null
  private modesEl: HTMLElement | null = null
  private expressEl: HTMLElement | null = null
  private expressDetailEl: HTMLElement | null = null
  private pickerEl: HTMLElement | null = null
  private datesEl: HTMLElement | null = null
  private slotsEl: HTMLElement | null = null
  private slotsLabelEl: HTMLElement | null = null
  private emptyEl: HTMLElement | null = null

  /** 日期键快照（与已渲染按钮一一对应） */
  private dateKeys: string[] = []
  /** 当前渲染的时段快照（对应 slotsEl 内的按钮） */
  private slotSnapshot: TimeSlot[] = []
  /** 日期按钮：dateKey → 按钮 */
  private dateButtons = new Map<string, HTMLButtonElement>()
  private slotButtons: HTMLButtonElement[] = []
  /** 日期列 / 时段网格的渲染签名（原文未变不重建） */
  private datesSignature = ''
  private slotsSignature = ''
  /** 当前选中（由 value 归一得出，交互后即写回 value） */
  private activeDate = ''
  private activeSlot = ''
  /** 内部静默写 value 时抑制 update 递归 */
  private suppressUpdate = false
  private uid = ''

  /**
   * @apiProperty 日期列天数：今日起 N 天（缺省 3，上限 14；非法值回落默认并告警一次）
   */
  get days(): number {
    return this.resolveDays().value
  }

  set days(value: number | string) {
    this.setAttribute('days', String(value))
  }

  /**
   * @apiProperty 值对象 `{ date, slot }`：get+set 双通道（JSON 字符串运行时容忍），赋值即生效不派发事件
   */
  get value(): TimeSelectValue {
    return { date: this.activeDate, slot: this.activeSlot }
  }

  set value(value: TimeSelectValue | string) {
    const parsed = typeof value === 'string' ? this.tryParse(value) : value
    const next = this.coerceValue(parsed)
    const json = JSON.stringify(next)
    if (this.getAttribute('value') !== json) this.setAttribute('value', json)
    else if (this.hasRendered) this.update()
  }

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="root" part="root" role="group">
        <div class="modes" part="modes" role="radiogroup"></div>
        <div class="express" part="express" hidden>
          <span class="express-title" part="express-title"></span>
          <span class="express-detail" part="express-detail"></span>
        </div>
        <span class="sr-only" part="slots-label"></span>
        <div class="picker" part="picker">
          <div class="dates" part="dates" role="tablist" aria-orientation="vertical"></div>
          <div class="slots" part="slots" role="radiogroup"></div>
        </div>
        <div class="empty" part="empty" hidden></div>
      </div>
    `
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override onReconnect(): void {
    this.bind()
  }

  private bind(): void {
    this.rootEl = this.shadow.querySelector('.root')
    this.modesEl = this.shadow.querySelector('.modes')
    this.expressEl = this.shadow.querySelector('.express')
    this.expressDetailEl = this.shadow.querySelector('.express-detail')
    this.pickerEl = this.shadow.querySelector('.picker')
    this.datesEl = this.shadow.querySelector('.dates')
    this.slotsEl = this.shadow.querySelector('.slots')
    this.slotsLabelEl = this.shadow.querySelector('[part="slots-label"]')
    this.emptyEl = this.shadow.querySelector('.empty')
    // click / keydown 挂在 shadow 内部容器：原生按钮的激活事件跨界会重定向 target
    this.modesEl?.addEventListener('click', this.onModeClick)
    this.modesEl?.addEventListener('keydown', this.onModeKeydown)
    this.datesEl?.addEventListener('click', this.onDateClick)
    this.datesEl?.addEventListener('keydown', this.onDateKeydown)
    this.slotsEl?.addEventListener('click', this.onSlotClick)
    this.slotsEl?.addEventListener('keydown', this.onSlotKeydown)
  }

  protected override update(): void {
    if (!this.rootEl || this.suppressUpdate) return
    const mode = this.resolveMode()
    const disabled = this.injectDisabled()
    const dates = this.resolveDateKeys()
    this.uid = stableHash36(dates.join(','))

    this.rootEl.toggleAttribute('data-disabled', disabled)
    this.rootEl.setAttribute('aria-disabled', String(disabled))

    this.renderModes(mode, disabled)
    const hasSlots = dates.some((key) => this.hasSelectable(key))
    this.pickerEl!.hidden = mode === 'express' || !hasSlots
    this.expressEl!.hidden = mode !== 'express' || !hasSlots
    this.emptyEl!.hidden = hasSlots
    this.emptyEl!.textContent = hasSlots ? '' : this.t('timeSelect.empty')

    this.syncSelection(mode, dates)
    this.renderDates(mode, disabled, hasSlots)
    this.renderSlots(mode, disabled)
    this.syncStates(mode, disabled)
    this.renderExpress(mode)
    this.syncValueAttr()
  }

  // ---------- 解析 ----------

  private resolveDays(): { value: number; valid: boolean } {
    const raw = this.getAttr('days', String(DEFAULT_DAYS))
    if (raw.trim() === '') return { value: DEFAULT_DAYS, valid: true }
    const parsed = Number(raw)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_DAYS) {
      warnOnce(`[oas-time-select] 非法 days "${raw}"，已回落 ${DEFAULT_DAYS}；合法范围 1–${MAX_DAYS}`)
      return { value: DEFAULT_DAYS, valid: false }
    }
    return { value: parsed, valid: true }
  }

  private resolveMode(): TimeSelectMode {
    const raw = this.getAttr('mode', 'express')
    if (VALID_MODES.includes(raw)) return raw as TimeSelectMode
    warnOnce(`[oas-time-select] 非法 mode "${raw}"，已回落 express；合法值：express / schedule`)
    return 'express'
  }

  private resolveDateKeys(): string[] {
    const raw = this.getAttr('start-date', '').trim()
    let start = startOfToday()
    if (raw !== '') {
      const parsed = parseDateKey(raw)
      if (parsed) {
        start = parsed
      } else {
        warnOnce(`[oas-time-select] 非法 start-date "${raw}"（应为 YYYY-MM-DD），已回落今天`)
      }
    }
    const count = this.resolveDays().value
    const keys: string[] = []
    for (let i = 0; i < count; i++) keys.push(toDateKey(addDays(start, i)))
    return keys
  }

  /** 通用时段（slots 属性；缺省/非法 → 空数组） */
  private parseSlots(raw: string, source: string): TimeSlot[] {
    if (raw.trim() === '') return []
    const parsed = this.tryParse(raw)
    if (!Array.isArray(parsed)) {
      warnOnce(`[oas-time-select] ${source} 应为 JSON 数组，已忽略`)
      return []
    }
    return this.normalizeSlots(parsed)
  }

  private normalizeSlots(list: unknown[]): TimeSlot[] {
    const out: TimeSlot[] = []
    const seen = new Set<string>()
    for (const item of list) {
      let key = ''
      let label = ''
      let disabled = false
      let full = false
      if (typeof item === 'string') {
        key = item
        label = item
      } else if (item && typeof item === 'object') {
        const record = item as { key?: unknown; label?: unknown; disabled?: unknown; full?: unknown }
        if (typeof record.key !== 'string' || record.key === '') continue
        key = record.key
        label = typeof record.label === 'string' && record.label !== '' ? record.label : record.key
        disabled = record.disabled === true
        full = record.full === true
      } else {
        continue
      }
      if (key === '' || seen.has(key)) continue
      seen.add(key)
      out.push({ key, label, disabled, full })
    }
    return out
  }

  /** 某日的生效时段：`slots-override` 命中则以覆盖值为准，否则回落 `slots` */
  private slotsFor(dateKey: string): TimeSlot[] {
    const raw = this.getAttr('slots-override', '')
    if (raw.trim() !== '') {
      const parsed = this.tryParse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const record = parsed as Record<string, unknown>
        if (Object.hasOwn(record, dateKey)) {
          const list = record[dateKey]
          if (Array.isArray(list)) return this.normalizeSlots(list)
          warnOnce(`[oas-time-select] slots-override["${dateKey}"] 应为 JSON 数组，已回落通用 slots`)
        }
      } else {
        warnOnce('[oas-time-select] 非法 slots-override（应为日期 → 时段数组的 JSON 对象），已忽略')
      }
    }
    return this.parseSlots(this.getAttr('slots', ''), 'slots')
  }

  private isSelectableSlot(slot: TimeSlot | undefined): boolean {
    return slot !== undefined && slot.disabled !== true && slot.full !== true
  }

  private hasSelectable(dateKey: string): boolean {
    return this.slotsFor(dateKey).some((slot) => this.isSelectableSlot(slot))
  }

  private firstSelectable(dateKey: string): TimeSlot | null {
    return this.slotsFor(dateKey).find((slot) => this.isSelectableSlot(slot)) ?? null
  }

  // ---------- 选择归一 ----------

  /** 归一当前选中：预约模式尊重 value；尽快模式恒取首个可用时段 */
  private syncSelection(mode: TimeSelectMode, dates: string[]): void {
    if (mode === 'express') {
      const date = dates.find((key) => this.hasSelectable(key)) ?? ''
      const slot = date === '' ? '' : (this.firstSelectable(date)?.key ?? '')
      this.activeDate = date
      this.activeSlot = slot
      return
    }
    const requested = this.readValueAttr()
    let date = requested.date
    if (!dates.includes(date) || !this.hasSelectable(date)) date = ''
    if (date === '') date = dates.find((key) => this.hasSelectable(key)) ?? ''
    let slot = requested.date === date && this.isSelectable(date, requested.slot) ? requested.slot : ''
    if (slot === '') slot = date === '' ? '' : (this.firstSelectable(date)?.key ?? '')
    this.activeDate = date
    this.activeSlot = slot
  }

  private isSelectable(dateKey: string, slotKey: string): boolean {
    if (dateKey === '' || slotKey === '') return false
    return this.slotsFor(dateKey).some((slot) => slot.key === slotKey && this.isSelectableSlot(slot))
  }

  /** value 归一：只保留字符串字段，缺字段补空串 */
  private coerceValue(input: unknown): TimeSelectValue {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return { date: '', slot: '' }
    const record = input as { date?: unknown; slot?: unknown }
    const asString = (value: unknown): string => (typeof value === 'string' ? value : '')
    return { date: asString(record.date), slot: asString(record.slot) }
  }

  private readValueAttr(): TimeSelectValue {
    const raw = this.getAttr('value', '')
    if (raw === '') return { date: '', slot: '' }
    return this.coerceValue(this.tryParse(raw))
  }

  private tryParse(raw: string): unknown {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  /** 把归一后的选中静默写回 value 属性（宿主读得到；不派发事件、不再触发渲染） */
  private syncValueAttr(): void {
    if (this.activeSlot === '') return
    const json = JSON.stringify({ date: this.activeDate, slot: this.activeSlot })
    if (this.getAttribute('value') === json) return
    this.suppressUpdate = true
    try {
      this.setAttribute('value', json)
    } finally {
      this.suppressUpdate = false
    }
  }

  // ---------- 渲染 ----------

  private renderModes(mode: TimeSelectMode, disabled: boolean): void {
    const signature = `${mode}|${disabled}|${this.uid}|${getLocaleName()}`
    if (this.modesEl!.dataset.signature === signature) return
    this.modesEl!.dataset.signature = signature
    this.modesEl!.setAttribute('aria-label', this.t('timeSelect.modeLabel'))
    const buttons: HTMLButtonElement[] = []
    for (const value of VALID_MODES) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'mode'
      button.setAttribute('part', 'mode')
      button.setAttribute('role', 'radio')
      button.dataset.mode = value
      button.textContent = value === 'express' ? this.t('timeSelect.express') : this.t('timeSelect.schedule')
      button.disabled = disabled
      buttons.push(button)
    }
    this.modesEl!.replaceChildren(...buttons)
  }

  private renderDates(mode: TimeSelectMode, disabled: boolean, hasSlots: boolean): void {
    const signature = [
      mode,
      String(disabled),
      String(hasSlots),
      this.uid,
      this.getAttribute('start-date') ?? '',
      getLocaleName(),
    ].join('\u0000')
    if (signature === this.datesSignature) return
    this.datesSignature = signature
    this.dateKeys = this.resolveDateKeys()
    this.dateButtons.clear()
    const buttons: HTMLButtonElement[] = []
    this.datesEl!.setAttribute('aria-label', this.t('timeSelect.dates'))
    for (const key of this.dateKeys) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'date'
      button.setAttribute('part', 'date')
      button.setAttribute('role', 'tab')
      button.id = `oas-time-select-${this.uid}-d-${key}`
      button.dataset.date = key
      button.setAttribute('aria-controls', `oas-time-select-${this.uid}-slots`)
      const available = this.hasSelectable(key)
      if (!available) button.setAttribute('aria-disabled', 'true')
      button.disabled = disabled
      const main = document.createElement('span')
      main.className = 'date-main'
      main.textContent = this.formatDate(key)
      const relative = document.createElement('span')
      relative.className = 'date-relative'
      relative.textContent = this.relativeLabel(key)
      button.append(main, relative)
      buttons.push(button)
      this.dateButtons.set(key, button)
    }
    this.datesEl!.replaceChildren(...buttons)
  }

  private renderSlots(mode: TimeSelectMode, disabled: boolean): void {
    const dateKey = this.activeDate
    const slots = dateKey === '' ? [] : this.slotsFor(dateKey)
    const signature = [
      mode,
      dateKey,
      String(disabled),
      getLocaleName(),
      slots
        .map((slot) => `${slot.key}\u0001${slot.label}\u0001${slot.disabled ? 1 : 0}${slot.full ? 1 : 0}`)
        .join('\u0000'),
    ].join('\u0002')
    if (signature === this.slotsSignature) return
    this.slotsSignature = signature
    this.slotSnapshot = slots
    this.slotButtons = []
    this.slotsEl!.id = `oas-time-select-${this.uid}-slots`
    this.slotsLabelEl!.id = `oas-time-select-${this.uid}-slots-label`
    this.slotsLabelEl!.textContent = this.t('timeSelect.slots')
    this.slotsEl!.setAttribute('aria-label', this.t('timeSelect.slots'))
    if (dateKey !== '') {
      // 可访问名称 = 分组标题（可见性隐藏）+ 当前日期（读屏可区分哪个日期的网格）
      this.slotsEl!.setAttribute('aria-labelledby', `${this.slotsLabelEl!.id} ${this.dateButtonId(dateKey)}`)
      this.slotsEl!.removeAttribute('aria-label')
    } else {
      this.slotsEl!.removeAttribute('aria-labelledby')
    }
    const buttons: HTMLButtonElement[] = []
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i]!
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'slot'
      button.setAttribute('part', 'slot')
      button.setAttribute('role', 'radio')
      button.dataset.slot = slot.key
      button.dataset.index = String(i)
      if (slot.full) button.setAttribute('data-state', 'full')
      else if (slot.disabled) button.setAttribute('data-state', 'rest')
      // 不可选时段走原生 disabled（与不可配送日期钮一致）：机读语义更硬，对比度门禁按原生禁用态豁免；
      // aria-disabled 同时保留（读屏对 radio 的禁用播报）
      const selectable = this.isSelectableSlot(slot)
      button.disabled = disabled || !selectable
      if (!selectable) button.setAttribute('aria-disabled', 'true')
      const label = document.createElement('span')
      label.className = 'slot-label'
      label.textContent = slot.label
      button.appendChild(label)
      if (slot.full) {
        const badge = document.createElement('span')
        badge.className = 'slot-badge'
        badge.textContent = this.t('timeSelect.full')
        button.appendChild(badge)
      } else if (slot.disabled) {
        const badge = document.createElement('span')
        badge.className = 'slot-badge'
        badge.textContent = this.t('timeSelect.rest')
        button.appendChild(badge)
      }
      buttons.push(button)
    }
    this.slotButtons = buttons
    this.slotsEl!.replaceChildren(...buttons)
  }

  private renderExpress(mode: TimeSelectMode): void {
    if (mode !== 'express' || !this.expressDetailEl) return
    const slot = this.activeDate === '' ? null : this.firstSelectable(this.activeDate)
    this.expressDetailEl.textContent =
      slot === null ? this.t('timeSelect.empty') : `${this.formatDate(this.activeDate)} ${slot.label}`
  }

  /** 状态同步：选中、roving tabindex、日期可用性（不重建 DOM） */
  private syncStates(mode: TimeSelectMode, disabled: boolean): void {
    const rtl = isRtl(this)
    this.toggleAttribute('data-rtl', rtl)
    const modeButtons = Array.from(this.modesEl!.querySelectorAll<HTMLButtonElement>('.mode'))
    const modeRoving = Math.max(
      0,
      modeButtons.findIndex((button) => button.dataset.mode === mode),
    )
    modeButtons.forEach((button, index) => {
      const checked = button.dataset.mode === mode
      button.setAttribute('aria-checked', String(checked))
      button.disabled = disabled
      button.tabIndex = index === modeRoving && !disabled ? 0 : -1
    })

    for (const [key, button] of this.dateButtons) {
      const available = this.hasSelectable(key)
      button.setAttribute('aria-selected', String(key === this.activeDate))
      button.toggleAttribute('aria-disabled', !available)
      button.disabled = disabled || !available
    }
    const dateTabStop = this.dateKeys.includes(this.activeDate)
      ? this.activeDate
      : (this.dateKeys.find((key) => this.hasSelectable(key)) ?? '')
    for (const [key, button] of this.dateButtons) {
      button.tabIndex = key === dateTabStop && !disabled ? 0 : -1
    }

    let slotTabStop = this.slotSnapshot.findIndex((slot) => slot.key === this.activeSlot)
    if (slotTabStop < 0) slotTabStop = this.slotSnapshot.findIndex((slot) => this.isSelectableSlot(slot))
    this.slotButtons.forEach((button, index) => {
      const slot = this.slotSnapshot[index]!
      button.setAttribute('aria-checked', String(slot.key === this.activeSlot))
      button.tabIndex = index === slotTabStop ? 0 : -1
    })
  }

  private dateButtonId(dateKey: string): string {
    return `oas-time-select-${this.uid}-d-${dateKey}`
  }

  /** 日期主文案（locale 感知：月日 + 星期） */
  private formatDate(dateKey: string): string {
    const date = parseDateKey(dateKey)
    if (!date) return dateKey
    const locale = getLocaleName() || 'zh-CN'
    try {
      return new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric', weekday: 'short' }).format(date)
    } catch {
      return dateKey
    }
  }

  /** 今天 / 明天的相对文案（其余日期返回空串） */
  private relativeLabel(dateKey: string): string {
    const today = toDateKey(startOfToday())
    const tomorrow = toDateKey(addDays(startOfToday(), 1))
    if (dateKey === today) return this.t('timeSelect.today')
    if (dateKey === tomorrow) return this.t('timeSelect.tomorrow')
    return ''
  }

  // ---------- 交互 ----------

  private onModeClick = (event: Event): void => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest<HTMLButtonElement>('.mode')
    if (!button || !this.modesEl!.contains(button)) return
    this.selectMode(button.dataset.mode ?? '')
  }

  /**
   * 模式组键盘导航（radiogroup + roving）：左右方向键切换模式并迁移焦点，Home / End 到首末模式。
   * 只有 2 个模式时方向键恒切到另一个模式；RTL 下左右语义镜像（与日期列 / 时段网格一致）。
   */
  private onModeKeydown = (event: KeyboardEvent): void => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest<HTMLButtonElement>('.mode')
    if (!button || !this.modesEl!.contains(button)) return
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End']
    if (!keys.includes(event.key)) return
    event.preventDefault()
    if (this.injectDisabled()) return
    const rtl = isRtl(this)
    const forward = (event.key === 'ArrowRight' && !rtl) || (event.key === 'ArrowLeft' && rtl)
    const current = VALID_MODES.indexOf(button.dataset.mode ?? '')
    let next: string
    if (event.key === 'Home') {
      next = VALID_MODES[0]!
    } else if (event.key === 'End') {
      next = VALID_MODES[VALID_MODES.length - 1]!
    } else {
      const base = current < 0 ? 0 : current
      next = VALID_MODES[(base + (forward ? 1 : -1) + VALID_MODES.length) % VALID_MODES.length]!
    }
    this.selectMode(next)
    // 切换模式会按签名重建模式钮：焦点必须落到新节点上，否则键盘用户丢失位置
    this.modeButton(next)?.focus()
  }

  /** 写回 mode 属性并派发 oas-change（点击与键盘共用）；未变化或非法时不动 */
  private selectMode(next: string): boolean {
    if (this.injectDisabled()) return false
    if (!VALID_MODES.includes(next)) return false
    if (next === this.resolveMode()) return false
    this.setAttribute('mode', next)
    const mode = next as TimeSelectMode
    const value = { date: this.activeDate, slot: this.activeSlot }
    this.emit('change', { value, mode, date: this.activeDate, slot: this.activeSlot })
    return true
  }

  private modeButton(mode: string): HTMLButtonElement | null {
    return this.modesEl?.querySelector<HTMLButtonElement>(`.mode[data-mode="${mode}"]`) ?? null
  }

  private onDateClick = (event: Event): void => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest<HTMLButtonElement>('.date')
    if (!button) return
    this.selectDate(button.dataset.date ?? '')
  }

  private onSlotClick = (event: Event): void => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest<HTMLButtonElement>('.slot')
    if (!button) return
    this.selectSlot(button.dataset.slot ?? '')
  }

  private selectDate(dateKey: string): void {
    if (this.injectDisabled() || dateKey === '' || !this.dateKeys.includes(dateKey)) return
    if (!this.hasSelectable(dateKey)) return
    if (this.resolveMode() !== 'schedule') return
    if (dateKey === this.activeDate) return
    this.activeDate = dateKey
    const keep = this.isSelectable(dateKey, this.activeSlot) ? this.activeSlot : ''
    this.activeSlot = keep !== '' ? keep : (this.firstSelectable(dateKey)?.key ?? '')
    this.renderSlots(this.resolveMode(), this.injectDisabled())
    this.syncStates(this.resolveMode(), this.injectDisabled())
    this.syncValueAttr()
    const mode = this.resolveMode()
    const value = { date: this.activeDate, slot: this.activeSlot }
    this.emit('change', { value, mode, date: this.activeDate, slot: this.activeSlot })
  }

  private selectSlot(slotKey: string): void {
    if (this.injectDisabled() || this.activeDate === '' || slotKey === '') return
    const mode = this.resolveMode()
    if (mode !== 'schedule') return
    if (slotKey === this.activeSlot) return
    if (!this.isSelectable(this.activeDate, slotKey)) return
    this.activeSlot = slotKey
    this.syncStates(mode, this.injectDisabled())
    this.syncValueAttr()
    const value = { date: this.activeDate, slot: this.activeSlot }
    this.emit('change', { value, mode, date: this.activeDate, slot: this.activeSlot })
  }

  private onDateKeydown = (event: KeyboardEvent): void => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest<HTMLButtonElement>('.date')
    if (!button) return
    const keys = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End', 'Enter', ' ']
    if (!keys.includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Enter' || event.key === ' ') {
      this.selectDate(button.dataset.date ?? '')
      return
    }
    const candidates = this.dateKeys.filter((key) => this.hasSelectable(key))
    if (candidates.length === 0) return
    const rtl = isRtl(this)
    const current = candidates.indexOf(this.activeDate)
    let index: number
    if (event.key === 'Home') {
      index = 0
    } else if (event.key === 'End') {
      index = candidates.length - 1
    } else {
      const forward =
        event.key === 'ArrowDown' || (event.key === 'ArrowRight' && !rtl) || (event.key === 'ArrowLeft' && rtl)
      const base = current < 0 ? 0 : current
      index = (base + (forward ? 1 : -1) + candidates.length) % candidates.length
    }
    const nextKey = candidates[index]!
    this.selectDate(nextKey)
    this.dateButtons.get(nextKey)?.focus()
  }

  private onSlotKeydown = (event: KeyboardEvent): void => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest<HTMLButtonElement>('.slot')
    if (!button) return
    const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' ']
    if (!keys.includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Enter' || event.key === ' ') {
      this.selectSlot(button.dataset.slot ?? '')
      return
    }
    const enabledIndexes = this.slotSnapshot
      .map((slot, index) => (this.isSelectableSlot(slot) ? index : -1))
      .filter((index) => index >= 0)
    if (enabledIndexes.length === 0) return
    const rtl = isRtl(this)
    const currentSlotIndex = this.slotSnapshot.findIndex((slot) => slot.key === this.activeSlot)
    const currentPos = Math.max(0, enabledIndexes.indexOf(currentSlotIndex))
    let pos: number
    if (event.key === 'Home') {
      pos = 0
    } else if (event.key === 'End') {
      pos = enabledIndexes.length - 1
    } else {
      const forward =
        event.key === 'ArrowDown' || (event.key === 'ArrowRight' && !rtl) || (event.key === 'ArrowLeft' && rtl)
      pos = (currentPos + (forward ? 1 : -1) + enabledIndexes.length) % enabledIndexes.length
    }
    const index = enabledIndexes[pos]!
    const slot = this.slotSnapshot[index]!
    this.selectSlot(slot.key)
    this.slotButtons[index]?.focus()
  }
}
