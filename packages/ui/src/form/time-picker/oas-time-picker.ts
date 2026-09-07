import { OASElement, escapeHtml } from '@oas-ui/core'
import { formatToken, resolveLocale } from '../calendar/date-grid.js'
import { computePosition, type Placement } from '../../overlay/floating/index.js'

const STYLE = `
 :host {
  display: inline-block;
  position: relative;
  font-family: inherit;
  width: 180px;
  /* 尺寸档内部控高变量（data-size 镜像切换；不占公开 API，外部请用 size 属性） */
  --_ch: var(--oas-control-height-md);
}
:host([data-size='small']) {
  --_ch: var(--oas-control-height-sm);
}
:host([data-size='large']) {
  --_ch: var(--oas-control-height-lg);
}
.trigger {
  appearance: none;
  box-sizing: border-box;
  width: 100%;
  min-height: var(--_ch);
  padding: 0 var(--oas-space-8, 40px) 0 var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  cursor: pointer;
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    box-shadow var(--oas-transition-fast) var(--oas-ease-out);
}
/* ---- size 尺寸档：字号/padding 联动（默认 medium 走基础样式） ---- */
:host([data-size='small']) .trigger {
  font-size: var(--oas-font-size-sm);
  padding-left: var(--oas-space-2);
}
:host([data-size='large']) .trigger {
  font-size: var(--oas-font-size-lg);
  padding-left: var(--oas-space-4);
}
.trigger:hover:not(:disabled) {
  border-color: var(--oas-color-primary);
}
.trigger:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.trigger[aria-expanded='true'] {
  border-color: var(--oas-color-primary);
}
.trigger:disabled {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
.trigger::placeholder {
  color: var(--oas-color-text-secondary);
}
.trigger[readonly] {
  cursor: default;
}
/* ---- status 校验态：success / warning / error（error 兼容宿主 aria-invalid 通道） ---- */
:host([data-status='success']) .trigger {
  border-color: var(--oas-color-success);
}
:host([data-status='success']) .trigger:focus-visible {
  border-color: var(--oas-color-success);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-success) 30%, transparent);
}
:host([data-status='warning']) .trigger {
  border-color: var(--oas-color-warning);
}
:host([data-status='warning']) .trigger:focus-visible {
  border-color: var(--oas-color-warning);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-warning) 30%, transparent);
}
:host([data-status='error']) .trigger {
  border-color: var(--oas-color-danger);
}
:host([data-status='error']) .trigger:focus-visible {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
:host([aria-invalid='true']) .trigger {
  border-color: var(--oas-color-danger);
}
:host([aria-invalid='true']) .trigger:focus-visible {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
.chevron {
  position: absolute;
  right: var(--oas-space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--oas-color-text-secondary);
  pointer-events: none;
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
}
.trigger[aria-expanded='true'] ~ .chevron {
  transform: translateY(-50%) rotate(180deg);
}
.clear-btn {
  position: absolute;
  right: var(--oas-space-7, 30px);
  top: 50%;
  transform: translateY(-50%);
  appearance: none;
  border: none;
  background: transparent;
  padding: 2px;
  margin: 0;
  cursor: pointer;
  color: var(--oas-color-text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--oas-radius-sm);
  z-index: 2;
}
.clear-btn:hover {
  color: var(--oas-color-text-primary);
}
.clear-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.clear-btn[hidden] {
  display: none;
}
.clear-btn svg {
  width: 12px;
  height: 12px;
  display: block;
}
[part='dropdown'] {
  /* fixed + computePosition 锚定 trigger（与 date-picker/select 同定位契约）：
     逃出祖先 overflow 容器，空间不足自动翻转/视口夹取 */
  position: fixed;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-dropdown, 1000));
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--oas-color-overlay) 25%, transparent);
  padding: var(--oas-space-2);
  display: none;
}
[part='dropdown'].open {
  display: block;
}
.presets {
  display: flex;
  flex-wrap: wrap;
  gap: var(--oas-space-1);
  margin-bottom: var(--oas-space-2);
  padding-bottom: var(--oas-space-2);
  border-bottom: 1px solid var(--oas-color-border);
}
.preset {
  appearance: none;
  border: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg);
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  border-radius: var(--oas-radius-sm);
  padding: var(--oas-space-1) var(--oas-space-2);
  cursor: pointer;
  transition: color var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out);
}
.preset:hover {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
.preset:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
.columns {
  display: flex;
  gap: var(--oas-space-1);
  max-height: 220px;
}
.column-group {
  display: flex;
  gap: var(--oas-space-1);
  flex: 1;
  min-width: 0;
}
.range-sep {
  align-self: center;
  color: var(--oas-color-text-secondary);
  padding: 0 var(--oas-space-1);
}
.column {
  flex: 1;
  overflow-y: auto;
  border-right: 1px solid var(--oas-color-border);
}
.column-group .column:last-child {
  border-right: none;
}
.columns > .column:last-child {
  border-right: none;
}
.option {
  appearance: none;
  display: block;
  width: 100%;
  border: none;
  background: transparent;
  padding: var(--oas-space-1) 0;
  text-align: center;
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  color: var(--oas-color-text-primary);
  cursor: pointer;
  border-radius: var(--oas-radius-sm);
}
.option:hover:not(.disabled) {
  background: var(--oas-color-bg-hover);
}
.option:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
.option.selected {
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
.option.selected:hover {
  background: var(--oas-color-primary-hover);
}
.option.disabled {
  color: var(--oas-color-text-disabled);
  cursor: not-allowed;
}
.footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: var(--oas-space-2);
  padding-top: var(--oas-space-2);
  border-top: 1px solid var(--oas-color-border);
}
.footer button {
  appearance: none;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
  color: var(--oas-color-primary);
  border-radius: var(--oas-radius-sm);
  padding: var(--oas-space-1) var(--oas-space-2);
}
.footer button:hover {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-primary-hover);
}
`

type TimeUnit = 'h' | 'm' | 's'
/** 列单位含 am/pm（use12-hours 时第四列） */
type ColumnUnit = TimeUnit | 'ampm'

interface TimeParts {
  h: number
  m: number
  s: number
}

interface PresetItem {
  label: string
  value: string
}

/** placement 合法取值：12 向（与 date-picker 同契约） */
const VALID_PLACEMENTS: readonly Placement[] = [
  'top',
  'top-start',
  'top-end',
  'bottom',
  'bottom-start',
  'bottom-end',
  'left',
  'left-start',
  'left-end',
  'right',
  'right-start',
  'right-end',
]

const VALID_SIZES = ['small', 'medium', 'large'] as const
const VALID_STATUSES = ['error', 'warning', 'success'] as const

function normalizeChoice(raw: string, fallback: string, valid: readonly string[]): string {
  return valid.includes(raw) ? raw : fallback
}

function pad(v: number): string {
  return String(v).padStart(2, '0')
}

function parseTime(value: string): TimeParts | null {
  const m = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/.exec(value)
  if (!m) return null
  const p = { h: Number(m[1]), m: Number(m[2]), s: Number(m[3] ?? 0) }
  if (p.h > 23 || p.m > 59 || p.s > 59) return null
  return p
}

function partsToString(p: TimeParts): string {
  return `${pad(p.h)}:${pad(p.m)}:${pad(p.s)}`
}

export class OASTimePicker extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'format',
      'step',
      'disabled',
      'disabled-skip',
      'clearable',
      'size',
      'status',
      'readonly',
      'open',
      'use12-hours',
      'is-range',
      'placement',
      'placeholder',
    ]
  }

  private triggerEl: HTMLInputElement | null = null
  private dropdown: HTMLElement | null = null
  private columnsEl: HTMLElement | null = null
  private openState = false
  /** 展开态下面板是否已初始化（防 update 重入 boot） */
  private panelBooted = false
  /** 起止两侧的时刻状态（单值长度 1，is-range 长度 2） */
  private sides: TimeParts[] = [{ h: 0, m: 0, s: 0 }]
  private committedValue = ''
  /** 上次同步进 sides 的 value 原文（update 时识别外部改值） */
  private lastSyncedValue = ''
  private activeColumn = 0
  private units: TimeUnit[] = ['h', 'm', 's']
  /** 手输中标记：update 不回写 input.value 打断输入 */
  private typing = false
  /** 焦点在组件内：内部转移不派发 oas-focus/oas-blur */
  private focusWithin = false
  /** 非法 placement 仅告警一次 */
  private placementWarned = false
  /** aria-invalid 由 status=error 设置的所有权标志 */
  private invalidByStatus = false
  private _disabledTime:
    | ((parts: TimeParts) => { hours?: number[]; minutes?: number[]; seconds?: number[] } | null)
    | null = null
  private _presets: PresetItem[] | null = null

  /** disabledTime 走 property（回调无法用 JSON 表达），设置后即时重渲列 */
  get disabledTime():
    | ((parts: TimeParts) => { hours?: number[]; minutes?: number[]; seconds?: number[] } | null)
    | null {
    return this._disabledTime
  }

  set disabledTime(
    fn:
      | ((parts: TimeParts) => { hours?: number[]; minutes?: number[]; seconds?: number[] } | null)
      | null,
  ) {
    this._disabledTime = fn
    if (this.isConnected && this.openState) this.renderColumns(false)
  }

  /** presets 快捷时刻（property，与 date-picker shortcuts 心智成对） */
  get presets(): PresetItem[] | null {
    return this._presets
  }

  set presets(items: PresetItem[] | null) {
    this._presets = Array.isArray(items) ? items : null
    if (this.isConnected) this.renderPresets()
  }

  /**
   * 受控 open：属性即真相——在场=展开、移除=收起（宿主手势只派发
   * oas-open-change 通知宿主，由宿主决定是否增删属性，组件不强制写回）。
   */
  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (name === 'open' && oldValue !== newValue && this.hasRendered) {
      if (newValue !== null && !this.openState) {
        this.bootPanel(false)
        this.emit('open-change', { open: true })
      } else if (newValue === null && this.openState) {
        this.closeSync()
        this.emit('open-change', { open: false })
      }
    }
    super.attributeChangedCallback(name, oldValue, newValue)
  }

  private isRange(): boolean {
    return this.hasAttr('is-range')
  }

  private use12(): boolean {
    return this.hasAttr('use12-hours')
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="picker" part="picker">
        <input class="trigger" part="trigger" type="text" role="combobox"
          aria-haspopup="listbox" aria-expanded="false" autocomplete="off" spellcheck="false" />
        <button class="clear-btn" part="clear" type="button" tabindex="-1" hidden aria-label="">
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <svg class="chevron" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M4 6 L8 10 L12 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="dropdown" part="dropdown">
          <div class="presets" part="presets" hidden></div>
          <div class="columns" part="columns"></div>
          <div class="footer">
            <button type="button" class="now" part="now"></button>
          </div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定触发器/面板/外部点击事件（render 与水合路径共用） */
  private bind(): void {
    this.triggerEl = this.shadow.querySelector<HTMLInputElement>('[part="trigger"]')
    this.dropdown = this.shadow.querySelector<HTMLElement>('[part="dropdown"]')
    this.columnsEl = this.shadow.querySelector<HTMLElement>('[part="columns"]')
    this.triggerEl?.addEventListener('click', () => this.toggle())
    this.triggerEl?.addEventListener('keydown', (e) => this.handleTriggerKey(e as KeyboardEvent))
    this.triggerEl?.addEventListener('input', () => {
      this.typing = true
    })
    this.triggerEl?.addEventListener('blur', () => this.commitTyped())
    const clearBtn = this.shadow.querySelector<HTMLButtonElement>('[part="clear"]')
    clearBtn?.addEventListener('mousedown', (e) => e.preventDefault())
    clearBtn?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.clearValue()
    })
    // 面板内点击不触发「外部点击确认」：选项点击会重渲列 DOM
    this.dropdown?.addEventListener('click', (e) => e.stopPropagation())
    this.dropdown?.addEventListener('keydown', (e) => this.handleDropdownKey(e as KeyboardEvent))
    // 此刻按钮：填入当前时刻并确认关闭
    this.shadow.querySelector<HTMLElement>('[part="now"]')?.addEventListener('click', () => {
      if (this.injectDisabled() || this.hasAttr('readonly')) return
      const n = new Date()
      const p = { h: n.getHours(), m: n.getMinutes(), s: n.getSeconds() }
      this.sides = this.isRange() ? [p, p] : [p]
      const detail = this.commitValue()
      this.requestOpen(false)
      this.emit('confirm', { value: detail })
      this.syncTrigger()
    })
    // 焦点事件：组件整体获得/失去焦点派发 oas-focus / oas-blur
    const wrapper = this.shadow.querySelector<HTMLElement>('.picker')
    wrapper?.addEventListener('focusin', () => {
      if (this.focusWithin) return
      this.focusWithin = true
      this.emit('focus')
    })
    wrapper?.addEventListener('focusout', (e) => {
      if (!this.focusWithin) return
      const related = (e as FocusEvent).relatedTarget
      if (related instanceof Node && wrapper.contains(related)) return
      this.focusWithin = false
      this.emit('blur')
    })
    this.onCleanup(() => document.removeEventListener('click', this.handleOutsideClick, true))
    // 视口 resize / 祖先滚动时重定位（仅展开态）
    const reposition = (): void => {
      if (this.openState) this.positionDropdown()
    }
    window.addEventListener('resize', reposition)
    this.onCleanup(() => window.removeEventListener('resize', reposition))
    window.addEventListener('scroll', reposition, true)
    this.onCleanup(() => window.removeEventListener('scroll', reposition, true))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（trigger/dropdown/columns 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="trigger"]')) return false
    if (!this.shadow.querySelector('[part="dropdown"]')) return false
    if (!this.shadow.querySelector('[part="columns"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.syncSizeStatus()
    this.syncTrigger()
    this.renderPresets()
    if (this.hasAttribute('open') && !this.openState) this.bootPanel(false)
    if (this.openState) {
      // 面板打开时外部 value 变化需同步内部 sides（受控模式下改属性即时反映；
      // lastSyncedValue 守卫避免无关节点属性变化冲掉面板内未提交的点选）
      const raw = this.getAttr('value', '')
      if (raw !== this.lastSyncedValue) {
        this.sides = this.parseSides()
        this.lastSyncedValue = raw
      }
      this.renderColumns(false)
    }
  }

  // ---- 开合（受控 open / oas-open-change） ----

  private toggle(): void {
    if (this.injectDisabled()) return
    if (this.openState) this.cancel()
    else this.requestOpen(true)
  }

  private requestOpen(next: boolean): void {
    if (this.hasAttribute('open')) {
      this.emit('open-change', { open: next })
      return
    }
    if (next) {
      if (this.openState) return
      this.bootPanel(true)
      this.emit('open-change', { open: true })
      return
    }
    if (!this.openState) return
    this.closeSync()
    this.emit('open-change', { open: false })
  }

  private bootPanel(focusNow: boolean): void {
    this.units = this.parseUnits(this.getAttr('format', 'HH:mm:ss'))
    this.sides = this.parseSides()
    this.lastSyncedValue = this.getAttr('value', '')
    this.committedValue = this.normalizedValue()
    this.activeColumn = 0
    this.typing = false
    this.openState = true
    this.panelBooted = true
    this.syncDropdown()
    this.renderColumns(focusNow)
  }

  private closeSync(): void {
    this.openState = false
    this.panelBooted = false
    this.typing = false
    this.syncDropdown()
    this.syncTrigger()
  }

  private cancel(): void {
    // 取消：恢复展开前已提交的值
    this.sides = this.parseSides()
    this.requestOpen(false)
  }

  private confirm(): void {
    if (this.hasAttr('readonly')) {
      this.requestOpen(false)
      return
    }
    const detail = this.commitValue()
    this.requestOpen(false)
    this.emit('confirm', { value: detail })
    this.syncTrigger()
  }

  /** 提交当前 parts（is-range 起止自动排序），有 diff 才写值派发 oas-change；返回 detail */
  private commitValue(): string | string[] {
    const next = this.currentValue()
    const nextRaw = this.isRange() ? JSON.stringify(next) : (next as string)
    const detail: string | string[] = this.isRange() ? (next as string[]) : next
    if (nextRaw !== this.committedValue) {
      this.setAttribute('value', nextRaw)
      this.emit('change', { value: detail })
      this.committedValue = nextRaw
    }
    return detail
  }

  private syncDropdown(): void {
    if (!this.dropdown || !this.triggerEl) return
    this.dropdown.classList.toggle('open', this.openState)
    this.triggerEl.setAttribute('aria-expanded', String(this.openState))
    if (this.openState) {
      document.addEventListener('click', this.handleOutsideClick, true)
      this.positionDropdown()
    } else {
      document.removeEventListener('click', this.handleOutsideClick, true)
    }
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.confirm()
    }
  }

  // ---- 值解析 / 格式化 ----

  /** 当前 value 属性解析为两侧 parts（单值长度 1） */
  private parseSides(): TimeParts[] {
    const raw = this.getAttr('value', '')
    if (this.isRange()) {
      try {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length === 2) {
          return [parseTime(String(arr[0])) ?? { h: 0, m: 0, s: 0 }, parseTime(String(arr[1])) ?? { h: 0, m: 0, s: 0 }]
        }
      } catch {
        /* 非法 JSON 走空态 */
      }
      return [
        { h: 0, m: 0, s: 0 },
        { h: 0, m: 0, s: 0 },
      ]
    }
    return [parseTime(raw) ?? { h: 0, m: 0, s: 0 }]
  }

  /** 当前 parts 序列化为值串（range 起止自动排序） */
  private currentValue(): string | string[] {
    if (!this.isRange()) return partsToString(this.sides[0]!)
    const [a, b] = [partsToString(this.sides[0]!), partsToString(this.sides[1]!)]
    return a <= b ? [a, b] : [b, a]
  }

  /** value 属性的规范形态（空值时 range 为 JSON 空串对） */
  private normalizedValue(): string {
    const raw = this.getAttr('value', '')
    if (!raw) return ''
    return this.isRange() ? JSON.stringify(this.parseSides().map(partsToString)) : raw
  }

  /** 12 小时制的 am/pm 本地化词（走 Intl dayPeriod，locale 通道） */
  private ampmWords(): { am: string; pm: string } {
    const locale = resolveLocale(this)
    const partsOf = (hour: number): string => {
      const parts = new Intl.DateTimeFormat(locale, {
        hour: 'numeric',
        hourCycle: 'h11',
      }).formatToParts(new Date(2000, 0, 1, hour, 0, 0))
      return parts.find((p) => p.type === 'dayPeriod')?.value ?? (hour < 12 ? 'AM' : 'PM')
    }
    return { am: partsOf(1), pm: partsOf(13) }
  }

  private hour12Of(h: number): number {
    const v = h % 12
    return v === 0 ? 12 : v
  }

  /** 手输解析：24h `H:mm[:ss]` 或 12h `h:mm[:ss] + 上午/下午词`（词走 Intl 本地化） */
  private parseInputTime(text: string): TimeParts | null {
    const s = text.trim()
    if (!s) return null
    const words = this.ampmWords()
    let pm = false
    let hadPeriod = false
    let body = s
    for (const [word, isPm] of [
      [words.pm, true],
      [words.am, false],
    ] as [string, boolean][]) {
      const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      if (re.test(body)) {
        pm = isPm
        hadPeriod = true
        body = body.replace(re, '').trim()
      }
    }
    const enPm = /\bpm\b/i.test(body)
    const enAm = /\bam\b/i.test(body)
    if (enPm || enAm) {
      pm = enPm
      hadPeriod = true
      body = body.replace(/\b[ap]m\b/i, '').trim()
    }
    const p = parseTime(body)
    if (!p) return null
    if (hadPeriod) {
      if (pm && p.h < 12) p.h += 12
      else if (!pm && p.h === 12) p.h = 0
      else if (p.h > 12) return null
    }
    return p
  }

  // ---- 步进 / 禁用 ----

  /** step 解析：JSON 三元组 {"h","m","s"}；单数字向后兼容 = 分钟步进 */
  private stepSteps(): { h: number; m: number; s: number } {
    const raw = this.getAttr('step', '')
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const num = (v: unknown): number =>
            typeof v === 'number' && Number.isFinite(v) && v >= 1 ? Math.floor(v) : 1
          return { h: num(parsed.h), m: num(parsed.m), s: num(parsed.s) }
        }
      } catch {
        /* 非法 JSON 走单数字通道 */
      }
      const n = Number(raw)
      if (Number.isFinite(n) && n >= 1) return { h: 1, m: Math.floor(n), s: 1 }
    }
    return { h: 1, m: 1, s: 1 }
  }

  /** 当前列的可选值与禁用集合（disabledTime 按该侧当前时刻上下文求值） */
  private unitOptions(unit: ColumnUnit, sideIdx: number): { values: number[]; disabled: Set<number> } {
    if (unit === 'ampm') {
      return { values: [0, 1], disabled: new Set<number>() }
    }
    const steps = this.stepSteps()
    const step = unit === 'h' ? steps.h : unit === 'm' ? steps.m : steps.s
    const count = unit === 'h' ? (this.use12() ? 12 : 24) : 60
    const start = unit === 'h' && this.use12() ? 1 : 0
    const values: number[] = []
    for (let v = 0; v < count; v += step) values.push(start + v)
    const disabled = new Set<number>()
    const dt = this._disabledTime?.(this.sides[sideIdx] ?? this.sides[0]!)
    if (dt) {
      const list =
        unit === 'h' ? dt.hours : unit === 'm' ? dt.minutes : unit === 's' ? dt.seconds : null
      if (list) {
        for (const raw of list) {
          if (unit === 'h' && this.use12()) {
            // 12h 小时列：按当前上下午语境换算出显示值
            const ctx = this.sides[sideIdx] ?? this.sides[0]!
            const h24 = raw
            const isPm = h24 >= 12
            const v12 = h24 % 12 === 0 ? 12 : h24 % 12
            const periodMatch = isPm === ctx.h >= 12
            if (periodMatch) disabled.add(v12)
          } else {
            disabled.add(raw)
          }
        }
      }
    }
    return { values, disabled }
  }

  /** 值 → 列显示值（12h 小时列取 1-12 表示；ampm 列 0=am 1=pm） */
  private displayValueOf(unit: ColumnUnit, parts: TimeParts): number {
    if (unit === 'ampm') return parts.h >= 12 ? 1 : 0
    if (unit === 'h' && this.use12()) return this.hour12Of(parts.h)
    return parts[unit]
  }

  /** 列显示值 → 写回 parts（12h 小时列保持当前上下午语境；ampm 列切换上下午） */
  private applyColumnValue(unit: ColumnUnit, parts: TimeParts, v: number): void {
    if (unit === 'ampm') {
      const isPm = v === 1
      const h12 = this.hour12Of(parts.h)
      parts.h = isPm ? h12 % 12 + 12 : h12 % 12
      return
    }
    if (unit === 'h' && this.use12()) {
      parts.h = parts.h >= 12 ? v % 12 + 12 : v % 12
      return
    }
    parts[unit] = v
  }

  /** 就近吸附：值不在步进集合时取距离最近的选项（仅显示，不主动改值） */
  private nearestOf(values: number[], v: number): number {
    let best = values[0] ?? 0
    let bestDist = Infinity
    for (const cand of values) {
      const dist = Math.abs(cand - v)
      if (dist < bestDist) {
        best = cand
        bestDist = dist
      }
    }
    return best
  }

  // ---- 列渲染 / 键盘 ----

  private parseUnits(format: string): TimeUnit[] {
    const units: TimeUnit[] = []
    if (/[Hh]/.test(format)) units.push('h')
    if (/m/.test(format)) units.push('m')
    if (/s/.test(format)) units.push('s')
    return units.length > 0 ? units : ['h', 'm', 's']
  }

  /** 扁平列描述：每侧的时分秒列（+12h 时的 am/pm 列） */
  private columnList(): { side: number; unit: ColumnUnit }[] {
    const out: { side: number; unit: ColumnUnit }[] = []
    for (let s = 0; s < this.sides.length; s++) {
      for (const u of this.units) out.push({ side: s, unit: u })
      if (this.use12()) out.push({ side: s, unit: 'ampm' })
    }
    return out
  }

  private unitLabel(unit: ColumnUnit): string {
    if (unit === 'ampm') {
      const w = this.ampmWords()
      return `${w.am} / ${w.pm}`
    }
    if (unit === 'h') return this.t('timePicker.hour')
    if (unit === 'm') return this.t('timePicker.minute')
    return this.t('timePicker.second')
  }

  private renderColumns(focusNow: boolean): void {
    const cols = this.columnsEl
    if (!cols) return
    cols.innerHTML = ''
    const list = this.columnList()
    const single = this.sides.length === 1
    const groupOf: HTMLElement[] = []
    if (!single) {
      for (let s = 0; s < this.sides.length; s++) {
        const g = document.createElement('div')
        g.className = 'column-group'
        g.setAttribute('data-side', s === 0 ? 'start' : 'end')
        cols.appendChild(g)
        groupOf.push(g)
        if (s === 1) {
          const sep = document.createElement('span')
          sep.className = 'range-sep'
          sep.textContent = '~'
          cols.insertBefore(sep, g)
        }
      }
    }
    list.forEach((desc, i) => {
      const parts = this.sides[desc.side]!
      const parent = single ? cols : groupOf[desc.side]!
      const col = document.createElement('div')
      col.className = 'column'
      col.setAttribute('role', 'listbox')
      col.setAttribute('aria-label', this.unitLabel(desc.unit))
      const { values, disabled } = this.unitOptions(desc.unit, desc.side)
      const current = this.displayValueOf(desc.unit, parts)
      const shown = values.includes(current) ? current : this.nearestOf(values, current)
      if (desc.unit === 'ampm') {
        const words = this.ampmWords()
        for (const v of [0, 1]) {
          const btn = this.createOption(String(v), v === 0 ? words.am : words.pm, v === shown, false, () => {
            this.applyColumnValue('ampm', parts, v)
            this.activeColumn = i
            this.renderColumns(true)
          })
          col.appendChild(btn)
        }
      } else {
        for (const v of values) {
          const isDisabled = disabled.has(v)
          const btn = this.createOption(String(v), pad(v), v === shown, isDisabled, () => {
            this.applyColumnValue(desc.unit, parts, v)
            this.activeColumn = i
            this.renderColumns(true)
          })
          col.appendChild(btn)
        }
      }
      parent.appendChild(col)
    })
    if (focusNow) {
      const colNodes = [...cols.querySelectorAll<HTMLElement>('.column')]
      const col = colNodes[this.activeColumn]
      const option = col?.querySelector<HTMLButtonElement>('.option.selected')
        ?? col?.querySelector<HTMLButtonElement>('.option:not(.disabled)')
      option?.focus()
      option?.scrollIntoView?.({ block: 'center' })
    }
  }

  private createOption(
    dataValue: string,
    text: string,
    selected: boolean,
    disabled: boolean,
    onPick: () => void,
  ): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'option'
    btn.setAttribute('role', 'option')
    btn.setAttribute('data-value', dataValue)
    btn.textContent = text
    btn.setAttribute('aria-selected', String(selected))
    btn.tabIndex = selected ? 0 : -1
    if (selected) btn.classList.add('selected')
    if (disabled) {
      btn.classList.add('disabled')
      btn.setAttribute('aria-disabled', 'true')
    }
    btn.addEventListener('click', () => {
      if (disabled) return
      onPick()
    })
    return btn
  }

  /** presets 快捷时刻按钮列（与 date-picker shortcuts 视觉成对） */
  private renderPresets(): void {
    const wrap = this.shadow.querySelector<HTMLElement>('[part="presets"]')
    if (!wrap) return
    const items = this._presets
    if (!items || items.length === 0) {
      wrap.hidden = true
      wrap.innerHTML = ''
      return
    }
    wrap.hidden = false
    wrap.innerHTML = items
      .map(
        (it, i) =>
          `<button type="button" class="preset" part="preset" data-index="${i}">${escapeHtml(it.label)}</button>`,
      )
      .join('')
    for (const btn of wrap.querySelectorAll<HTMLButtonElement>('.preset')) {
      const idx = Number(btn.dataset.index)
      btn.addEventListener('click', () => {
        const item = items[idx]
        if (!item || this.hasAttr('readonly')) return
        const p = parseTime(item.value)
        if (!p) return
        if (this.isRange()) {
          const value = [item.value, item.value]
          this.setAttribute('value', JSON.stringify(value))
          this.emit('change', { value })
        } else {
          this.setAttribute('value', partsToString(p))
          this.emit('change', { value: partsToString(p) })
        }
        this.requestOpen(false)
        this.syncTrigger()
      })
    }
  }

  private handleTriggerKey(e: KeyboardEvent): void {
    if (this.injectDisabled()) return
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault()
      this.commitTyped()
      if (!this.openState) this.requestOpen(true)
      else {
        // 已展开：焦点送进当前列（输入框 → 面板）
        const colNodes = [...(this.columnsEl?.querySelectorAll<HTMLElement>('.column') ?? [])]
        colNodes[this.activeColumn]
          ?.querySelector<HTMLButtonElement>('.option.selected')
          ?.focus()
      }
    } else if (e.key === 'Escape' && this.openState) {
      e.preventDefault()
      this.revertInput()
      this.cancel()
    }
  }

  private handleDropdownKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      this.adjustActive(e.key === 'ArrowUp' ? 1 : -1)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      this.moveColumn(e.key === 'ArrowRight' ? 1 : -1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      this.jumpColumn('first')
    } else if (e.key === 'End') {
      e.preventDefault()
      this.jumpColumn('last')
    } else if (e.key === 'Enter') {
      e.preventDefault()
      this.confirm()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      this.cancel()
    }
  }

  /** ↑↓ 调整当前列（跳过禁用项，回绕；ampm 列切换上下午） */
  private adjustActive(delta: 1 | -1): void {
    const desc = this.columnList()[this.activeColumn]
    if (!desc) return
    const parts = this.sides[desc.side]!
    if (desc.unit === 'ampm') {
      this.applyColumnValue('ampm', parts, parts.h >= 12 ? 0 : 1)
      this.renderColumns(true)
      return
    }
    const { values, disabled } = this.unitOptions(desc.unit, desc.side)
    const current = this.displayValueOf(desc.unit, parts)
    let idx = values.indexOf(current)
    if (idx < 0) idx = values.indexOf(this.nearestOf(values, current))
    if (idx < 0) return
    for (let step = 0; step < values.length; step++) {
      idx = (idx + delta + values.length) % values.length
      if (!disabled.has(values[idx]!)) {
        this.applyColumnValue(desc.unit, parts, values[idx]!)
        break
      }
    }
    this.renderColumns(true)
  }

  private moveColumn(dir: 1 | -1): void {
    const n = this.columnList().length
    this.activeColumn = (this.activeColumn + dir + n) % n
    this.renderColumns(true)
  }

  /** Home/End：跳当前列首/末个可选值（跳过禁用） */
  private jumpColumn(which: 'first' | 'last'): void {
    const desc = this.columnList()[this.activeColumn]
    if (!desc || desc.unit === 'ampm') return
    const parts = this.sides[desc.side]!
    const { values, disabled } = this.unitOptions(desc.unit, desc.side)
    const ordered = which === 'first' ? values : [...values].reverse()
    const target = ordered.find((v) => !disabled.has(v))
    if (target !== undefined) {
      this.applyColumnValue(desc.unit, parts, target)
      this.renderColumns(true)
    }
  }

  // ---- 触发器（输入框化 + 手输通道） ----

  private syncTrigger(): void {
    const i = this.triggerEl
    if (!i) return
    const disabled = this.injectDisabled()
    const readonly = this.hasAttr('readonly')
    i.disabled = disabled
    i.readOnly = disabled || readonly || this.isRange()
    const placeholder = this.getAttr('placeholder', this.t('timePicker.placeholder'))
    i.placeholder = placeholder
    i.setAttribute('aria-label', placeholder)
    if (!this.typing) i.value = this.displayText()
    const nowBtn = this.shadow.querySelector<HTMLElement>('[part="now"]')
    if (nowBtn) nowBtn.textContent = this.t('calendar.today')
    const clearBtn = this.shadow.querySelector<HTMLElement>('[part="clear"]')
    if (clearBtn) {
      clearBtn.setAttribute('aria-label', this.t('input.clear'))
      clearBtn.hidden = !(
        this.hasAttr('clearable') &&
        !disabled &&
        !readonly &&
        this.getAttr('value', '') !== ''
      )
    }
  }

  /** trigger 显示文本（24h 走 format token；12h 走 Intl 12 小时制；range 显示起止） */
  private displayText(): string {
    const raw = this.getAttr('value', '')
    if (!raw) return ''
    const locale = resolveLocale(this)
    const format = this.getAttr('format', 'HH:mm:ss')
    const one = (p: TimeParts): string => {
      if (this.use12()) {
        const bag: Intl.DateTimeFormatOptions = {
          hour: '2-digit',
          hourCycle: 'h11',
        }
        if (/m/.test(format)) bag.minute = '2-digit'
        if (/s/.test(format)) bag.second = '2-digit'
        return new Intl.DateTimeFormat(locale, bag).format(new Date(2000, 0, 1, p.h, p.m, p.s))
      }
      return formatToken(new Date(2000, 0, 1, p.h, p.m, p.s), format, locale)
    }
    const sides = this.parseSides()
    if (this.isRange()) return `${one(sides[0]!)} ~ ${one(sides[1]!)}`
    return one(sides[0]!)
  }

  /** 手输提交：合法 → 写值派发 oas-change；非法/为空 → 回退原显示（非破坏） */
  private commitTyped(): void {
    const i = this.triggerEl
    if (!i || !this.typing) return
    this.typing = false
    if (this.isRange() || this.hasAttr('readonly') || this.injectDisabled()) {
      i.value = this.displayText()
      return
    }
    const p = this.parseInputTime(i.value)
    if (p) {
      const value = partsToString(p)
      if (value !== this.getAttr('value', '')) {
        this.setAttribute('value', value)
        this.emit('change', { value })
        return
      }
    }
    i.value = this.displayText()
  }

  /** Esc/取消：丢弃未提交键入，回退当前值显示 */
  private revertInput(): void {
    this.typing = false
    const i = this.triggerEl
    if (i) i.value = this.displayText()
  }

  /** clearable：清空值并派发 oas-clear + oas-change（空值）；readonly 拦截 */
  private clearValue(): void {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    const prev = this.getAttr('value', '')
    if (prev === '') return
    let prevDetail: string | string[] = prev
    if (this.isRange()) {
      try {
        const arr = JSON.parse(prev)
        if (Array.isArray(arr)) prevDetail = arr.map(String)
      } catch {
        /* 保持原串 */
      }
    }
    this.removeAttribute('value')
    this.emit('clear', { value: prevDetail })
    this.emit('change', { value: '' })
    this.syncTrigger()
    this.triggerEl?.focus()
  }

  // ---- 浮层定位（fixed + computePosition，与 date-picker 同契约） ----

  private resolvePlacement(): Placement {
    const raw = this.getAttr('placement', 'bottom-start')
    if ((VALID_PLACEMENTS as readonly string[]).includes(raw)) return raw as Placement
    if (!this.placementWarned) {
      this.placementWarned = true
      console.warn(
        `[oas-time-picker] 非法 placement "${raw}"，已回落 bottom-start（支持 12 向：top/bottom/left/right × start/end）`,
      )
    }
    return 'bottom-start'
  }

  private positionDropdown(): void {
    if (!this.dropdown || !this.triggerEl) return
    const anchorRect = this.triggerEl.getBoundingClientRect()
    const popupRect = this.dropdown.getBoundingClientRect()
    const viewport = { width: window.innerWidth, height: window.innerHeight }
    const { top, left, placement: actual } = computePosition(
      anchorRect,
      popupRect,
      this.resolvePlacement(),
      viewport,
      4,
      true,
      { collisionPadding: 8 },
    )
    this.dropdown.style.top = `${top}px`
    this.dropdown.style.left = `${left}px`
    this.dropdown.style.width = `${Math.max(anchorRect.width, 120)}px`
    this.dropdown.setAttribute('data-placement', actual)
  }

  /** size/status 镜像到宿主 data-*（供 :host([data-*]) 样式消费），error 联动 aria-invalid */
  private syncSizeStatus(): void {
    const size = normalizeChoice(this.injectValue('size', 'medium'), 'medium', VALID_SIZES)
    this.setAttribute('data-size', size)
    const status = normalizeChoice(this.getAttr('status', ''), '', VALID_STATUSES)
    if (status) this.setAttribute('data-status', status)
    else this.removeAttribute('data-status')
    if (status === 'error') {
      if (!this.hasAttribute('aria-invalid')) this.invalidByStatus = true
      this.setAttribute('aria-invalid', 'true')
    } else if (this.invalidByStatus) {
      this.invalidByStatus = false
      this.removeAttribute('aria-invalid')
    }
  }
}
