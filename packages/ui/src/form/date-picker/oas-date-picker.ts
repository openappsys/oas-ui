import { OASElement, escapeHtml } from '@oas-ui/core'
import {
  resolveLocale,
  startOfDay,
  toISODate,
  parseISODate,
  addMonths,
  addYears,
  formatYear,
  formatYearMonth,
  formatToken,
  findDayButton,
  setRovingTab,
  renderMonthGrid,
  moveGridDate,
  getWeekStart,
} from '../calendar/date-grid.js'
import { computePosition, type Placement } from '../../overlay/floating/index.js'

type PickerType = 'date' | 'daterange' | 'month' | 'datetime'
type SubPanel = 'days' | 'months'

/** placement 合法取值：12 向（四基向 × start/end 交叉轴对齐） */
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

/** 快捷预设项：value 为静态值（date 为 ISO 字符串，daterange 为 [start, end]），getValue 动态计算 */
interface ShortcutItem {
  label: string
  value?: string | [string, string]
  getValue?: () => Date | [Date, Date]
}

const DEFAULT_FORMAT: Record<PickerType, string> = {
  date: 'yyyy-MM-dd',
  month: 'yyyy-MM',
  datetime: 'yyyy-MM-dd HH:mm:ss',
  daterange: 'yyyy-MM-dd',
}

function pad(v: number): string {
  return String(v).padStart(2, '0')
}

const STYLE = `
:host {
  display: inline-block;
  position: relative;
  font-family: inherit;
  width: 220px;
}
[part='trigger'] {
  appearance: none;
  box-sizing: border-box;
  width: 100%;
  min-height: var(--oas-control-height-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2);
  padding: 0 var(--oas-space-3);
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
[part='trigger']:hover {
  border-color: var(--oas-color-primary);
}
[part='trigger']:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
[part='trigger'][aria-expanded='true'] {
  border-color: var(--oas-color-primary);
}
[part='trigger'][disabled] {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
.value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.value.placeholder {
  color: var(--oas-color-text-secondary);
}
.chevron {
  transition: transform var(--oas-transition-fast) var(--oas-ease-out);
}
[part='trigger'][aria-expanded='true'] .chevron {
  transform: rotate(180deg);
}
[part='dropdown'] {
  /* fixed + computePosition 锚定 trigger：逃出祖先 overflow 容器（窄工具栏/模态滚动容器），
     不再被裁剪；空间不足自动翻转/右对齐/视口夹取（与 select/combobox 同定位契约） */
  position: fixed;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-dropdown, 1000));
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--oas-color-overlay) 25%, transparent);
  padding: var(--oas-space-3);
  display: none;
}
[part='dropdown'].open {
  display: block;
}
[part='panel'] {
  min-width: 240px;
}
[part='panel'].range-panel {
  min-width: 480px;
}
[part='panel'] .header {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  margin-bottom: var(--oas-space-2);
}
[part='panel'] .header button,
[part='panel'] .header .title {
  appearance: none;
  border: none;
  background: transparent;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-md);
  height: var(--oas-control-height-md);
  min-width: var(--oas-control-height-md);
  padding: 0 var(--oas-space-1);
}
[part='panel'] .header button {
  cursor: pointer;
}
[part='panel'] .header button:hover {
  background: var(--oas-color-bg-hover);
}
[part='panel'] .header button:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
[part='panel'] .title {
  flex: 1;
  text-align: center;
  font-weight: 500;
  white-space: nowrap;
}
[part='grid'] .weekdays,
[part='grid'] .week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
[part='grid'] .weekday {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--oas-control-height-md);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
[part='grid'] .day {
  appearance: none;
  border: none;
  background: transparent;
  width: 100%;
  height: var(--oas-control-height-md);
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  color: var(--oas-color-text-primary);
  cursor: pointer;
}
[part='grid'] .day:hover:not(.disabled) {
  background: var(--oas-color-bg-hover);
}
[part='grid'] .day:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
[part='grid'] .day.today {
  box-shadow: inset 0 0 0 1px var(--oas-color-primary);
}
[part='grid'] .day.selected {
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
[part='grid'] .day.selected:hover {
  background: var(--oas-color-primary-hover);
}
[part='grid'] .day.disabled {
  color: var(--oas-color-text-disabled);
  cursor: not-allowed;
}
[part='grid'] .day.outside {
  color: var(--oas-color-text-disabled);
}
[part='grid'] .day.range-start,
[part='grid'] .day.range-end {
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
  border-radius: var(--oas-radius-sm);
}
[part='grid'] .day.in-range {
  background: color-mix(in srgb, var(--oas-color-primary) 18%, transparent);
  border-radius: 0;
}
[part='panel'] .months {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--oas-space-1);
}
[part='panel'] .month-cell {
  appearance: none;
  border: none;
  background: transparent;
  height: var(--oas-control-height-lg);
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  color: var(--oas-color-text-primary);
  cursor: pointer;
}
[part='panel'] .month-cell:hover {
  background: var(--oas-color-bg-hover);
}
[part='panel'] .month-cell:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
[part='panel'] .month-cell.selected {
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
[part='panel'] .range-grids {
  display: flex;
  gap: var(--oas-space-4);
}
[part='panel'] .range-grids [part='grid'] + [part='grid'] {
  border-left: 1px solid var(--oas-color-border);
  padding-left: var(--oas-space-4);
}
[part='panel'] .time-section {
  display: flex;
  gap: var(--oas-space-1);
  margin-top: var(--oas-space-3);
  padding-top: var(--oas-space-2);
  border-top: 1px solid var(--oas-color-border);
}
.time-col {
  flex: 1;
  max-height: 140px;
  overflow-y: auto;
}
.time-option {
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
.time-option:hover {
  background: var(--oas-color-bg-hover);
}
.time-option.selected {
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
[part='panel'] .footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--oas-space-2);
  padding-top: var(--oas-space-2);
  border-top: 1px solid var(--oas-color-border);
}
[part='panel'] .footer button {
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
[part='panel'] .footer button:hover {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-primary-hover);
}
[part='panel'] .footer .confirm {
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
[part='panel'] .footer .confirm:hover {
  background: var(--oas-color-primary-hover);
  color: var(--oas-color-bg);
}
[part='panel'] .shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--oas-space-1);
  margin-bottom: var(--oas-space-2);
  padding-bottom: var(--oas-space-2);
  border-bottom: 1px solid var(--oas-color-border);
}
[part='panel'] .shortcut {
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
    border-color var(--oas-transition-fast) var(--oas-ease-out),
    background var(--oas-transition-fast) var(--oas-ease-out);
}
[part='panel'] .shortcut:hover {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
[part='panel'] .shortcut:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
[part='grid'] .day.disabled.selected {
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
  box-shadow: none;
}
`

interface RangeState {
  start: Date | null
  end: Date | null
}

export class OASDatePicker extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'format',
      'type',
      'min',
      'max',
      'disabled',
      'placeholder',
      'multiple',
      'placement',
      'disabled-skip',
    ]
  }

  private triggerEl: HTMLButtonElement | null = null
  private dropdown: HTMLElement | null = null
  private panel: HTMLElement | null = null
  private openState = false
  private viewDate: Date = startOfDay(new Date())
  private focusDate: Date | null = null
  private subPanel: SubPanel = 'days'
  private pendingDate: Date | null = null
  private time = { h: 0, m: 0, s: 0 }
  private range: RangeState = { start: null, end: null }
  private previewEnd: Date | null = null
  private _shortcuts: ShortcutItem[] | null = null
  private _disabledDate: ((d: Date) => boolean) | null = null
  /** 非法 placement 仅告警一次（滚动/resize 重定位不重复刷屏） */
  private placementWarned = false

  /** shortcuts 走 property（对象数组无法用 JSON 属性表达），设置后即时重渲面板 */
  get shortcuts(): ShortcutItem[] | null {
    return this._shortcuts
  }

  set shortcuts(items: ShortcutItem[] | null) {
    this._shortcuts = items
    if (this.isConnected) this.update()
  }

  /** disabled-date 走 property（回调无法用 JSON 表达），设置后即时重渲面板 */
  get disabledDate(): ((d: Date) => boolean) | null {
    return this._disabledDate
  }

  set disabledDate(fn: ((d: Date) => boolean) | null) {
    this._disabledDate = fn
    if (this.isConnected) this.update()
  }

  private get pickerType(): PickerType {
    const t = this.getAttr('type', 'date')
    return t === 'daterange' || t === 'month' || t === 'datetime' ? t : 'date'
  }

  private currentFormat(): string {
    return this.getAttr('format', '') || DEFAULT_FORMAT[this.pickerType]
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致（快照不含弹出面板内容） */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="picker" part="picker">
        <button class="trigger" part="trigger" type="button" role="combobox"
          aria-haspopup="dialog" aria-expanded="false">
          <span class="value"></span>
          <svg class="chevron" width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M4 6 L8 10 L12 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="dropdown" part="dropdown">
          <div class="panel" part="panel"></div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定触发器/面板/外部点击事件（render 与水合路径共用） */
  private bind(): void {
    this.triggerEl = this.shadow.querySelector<HTMLButtonElement>('[part="trigger"]')
    this.dropdown = this.shadow.querySelector<HTMLElement>('[part="dropdown"]')
    this.panel = this.shadow.querySelector<HTMLElement>('[part="panel"]')
    this.triggerEl?.addEventListener('click', () => this.toggle())
    this.triggerEl?.addEventListener('keydown', (e) => this.handleTriggerKey(e as KeyboardEvent))
    // 面板内点击永不触发「外部点击关闭」：面板交互会重渲 DOM，
    // happy-dom 中已分离节点 composedPath 不完整，需显式阻断冒泡
    this.dropdown?.addEventListener('click', (e) => e.stopPropagation())
    this.dropdown?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape') {
        e.preventDefault()
        this.close()
      }
    })
    this.onCleanup(() => document.removeEventListener('click', this.handleOutsideClick, true))
    // 视口 resize / 祖先滚动时重定位（仅展开态有意义）；capture 捕获滚动以覆盖任何可滚动祖先
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

  /** 真水合：校验 SSR 快照结构（trigger/dropdown/panel 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="trigger"]')) return false
    if (!this.shadow.querySelector('[part="dropdown"]')) return false
    if (!this.shadow.querySelector('[part="panel"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.syncTrigger()
    if (this.openState) this.renderPanel(false)
  }

  private toggle(): void {
    if (this.injectDisabled()) return
    if (this.openState) this.close()
    else this.open()
  }

  private open(): void {
    const t = this.pickerType
    const today = startOfDay(new Date())
    const multi = this.isMultiple()
    const sel = multi ? (this.selectedDateArray().at(-1) ?? null) : this.selectedDates()
    this.subPanel = 'days'
    this.focusDate = sel ?? null
    if (t === 'daterange') {
      const r = this.parseRange()
      this.range = { start: r.start, end: r.end }
      this.viewDate = r.start ? new Date(r.start.getFullYear(), r.start.getMonth(), 1) : today
    } else {
      this.viewDate = sel ? new Date(sel.getFullYear(), sel.getMonth(), 1) : today
      if (t === 'datetime') {
        this.pendingDate = sel
        const dt = parseISODate(this.getAttr('value', ''))
        if (dt) this.time = { h: dt.getHours(), m: dt.getMinutes(), s: dt.getSeconds() }
      }
    }
    this.previewEnd = null
    this.openState = true
    this.syncDropdown()
    this.renderPanel(true)
  }

  private close(): void {
    this.openState = false
    this.syncDropdown()
    this.syncTrigger()
  }

  private syncDropdown(): void {
    if (!this.dropdown || !this.triggerEl) return
    this.dropdown.classList.toggle('open', this.openState)
    this.triggerEl.setAttribute('aria-expanded', String(this.openState))
    if (this.openState) {
      document.addEventListener('click', this.handleOutsideClick, true)
    } else {
      document.removeEventListener('click', this.handleOutsideClick, true)
    }
  }

  /** placement 解析：12 向（默认 bottom-start）；非法值回落 bottom-start + console.warn（仅告警一次） */
  private resolvePlacement(): Placement {
    const raw = this.getAttr('placement', 'bottom-start')
    if ((VALID_PLACEMENTS as readonly string[]).includes(raw)) return raw as Placement
    if (!this.placementWarned) {
      this.placementWarned = true
      console.warn(
        `[oas-date-picker] 非法 placement "${raw}"，已回落 bottom-start（支持 12 向：top/bottom/left/right × start/end）`,
      )
    }
    return 'bottom-start'
  }

  /**
   * 交叉轴对齐自动调整：宽面板（range 双月 480px）在 start 对齐下贴视口右缘会右溢出 →
   * 翻转 end（面板右缘对齐触发器右缘，保持视觉连接）；反之左溢出时 end → start。
   * 调整后仍不足交给 computePosition 的视口夹取兜底。
   */
  private adjustCrossAlignment(
    anchor: DOMRect,
    popup: DOMRect,
    viewport: { width: number; height: number },
    padding: number,
    placement: Placement,
  ): Placement {
    const main = placement.split('-')[0] as string
    // left/right 系列交叉轴是垂直向，溢出交给引擎垂直夹取
    if (main !== 'top' && main !== 'bottom') return placement
    if (placement.endsWith('-start') && anchor.left + popup.width > viewport.width - padding) {
      return `${main}-end` as Placement
    }
    if (placement.endsWith('-end') && anchor.right - popup.width < padding) {
      return `${main}-start` as Placement
    }
    return placement
  }

  /**
   * fixed 定位：锚定 trigger，面板尺寸落定后计算（碰撞翻转/右对齐/视口夹取），
   * 结果写入 style.top/left 与 data-placement（真实浏览器像素级断言钩子）
   */
  private positionDropdown(): void {
    if (!this.dropdown || !this.triggerEl) return
    const anchorRect = this.triggerEl.getBoundingClientRect()
    const popupRect = this.dropdown.getBoundingClientRect()
    const viewport = { width: window.innerWidth, height: window.innerHeight }
    const padding = 8 // 视口夹取边距：range 双月面板 480px 宽，避让余量更足
    const placement = this.adjustCrossAlignment(
      anchorRect,
      popupRect,
      viewport,
      padding,
      this.resolvePlacement(),
    )
    const {
      top,
      left,
      placement: actual,
    } = computePosition(
      anchorRect,
      popupRect,
      placement,
      viewport,
      4, // 保持既有「触发器下方 4px」视觉间距
      true,
      { collisionPadding: padding },
    )
    this.dropdown.style.top = `${top}px`
    this.dropdown.style.left = `${left}px`
    this.dropdown.setAttribute('data-placement', actual)
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.close()
    }
  }

  private handleTriggerKey(e: KeyboardEvent): void {
    if (this.injectDisabled()) return
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault()
      if (!this.openState) this.open()
    } else if (e.key === 'Escape' && this.openState) {
      this.close()
    }
  }

  // ---- value / 状态解析 ----

  /** multiple 仅在 date 类型下生效（daterange 忽略，走范围语义） */
  private isMultiple(): boolean {
    return this.hasAttr('multiple') && this.pickerType === 'date'
  }

  /** 全部选中日期（multiple 时为 JSON 数组展开；其余类型返回单个或空） */
  private selectedDateArray(): Date[] {
    const raw = this.getAttr('value', '')
    if (!raw) return []
    if (this.isMultiple()) {
      try {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          return arr
            .map((s) => parseISODate(String(s)))
            .filter((d): d is Date => !!d)
            .map(startOfDay)
        }
      } catch {
        /* 非 JSON 数组走单值兜底 */
      }
      // 单值兜底：非 multiple 初始值切到 multiple 时不丢已选日期
      const d = parseISODate(raw)
      if (d) return [startOfDay(d)]
      return []
    }
    const d = this.selectedDates()
    return d ? [d] : []
  }

  private selectedDates(): Date | null {
    const raw = this.getAttr('value', '')
    if (!raw) return null
    const t = this.pickerType
    if (t === 'daterange') return this.parseRange().start
    const d = parseISODate(raw)
    if (!d) return null
    if (t === 'month') return new Date(d.getFullYear(), d.getMonth(), 1)
    return startOfDay(d)
  }

  private parseRange(): RangeState {
    const raw = this.getAttr('value', '')
    if (!raw) return { start: null, end: null }
    try {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length === 2) {
        return {
          start: parseISODate(String(arr[0])),
          end: parseISODate(String(arr[1])),
        }
      }
    } catch {
      /* 非法 JSON 走空态 */
    }
    return { start: null, end: null }
  }

  private syncTrigger(): void {
    const triggerEl = this.triggerEl
    if (!triggerEl) return
    triggerEl.disabled = this.injectDisabled()
    const valueEl = this.shadow.querySelector<HTMLElement>('.value')
    if (!valueEl) return
    const t = this.pickerType
    const format = this.currentFormat()
    const locale = resolveLocale(this)
    const raw = this.getAttr('value', '')
    const placeholder = this.getAttr('placeholder', this.t('datePicker.placeholder'))
    triggerEl.setAttribute('aria-label', placeholder)
    if (!raw) {
      valueEl.textContent = placeholder
      valueEl.classList.add('placeholder')
      return
    }
    valueEl.classList.remove('placeholder')
    if (t === 'daterange') {
      const { start, end } = this.parseRange()
      const st = start ? formatToken(start, format, locale) : ''
      const et = end ? formatToken(end, format, locale) : ''
      valueEl.textContent = start && end ? `${st} ~ ${et}` : placeholder
      return
    }
    if (this.isMultiple()) {
      const dates = this.selectedDateArray()
      if (!dates.length) {
        valueEl.textContent = placeholder
        valueEl.classList.add('placeholder')
        return
      }
      valueEl.textContent = dates
        .map((d) => formatToken(d, format, locale))
        .join(this.t('datePicker.join'))
      return
    }
    // datetime 显示需保留时分（selectedDates 为网格高亮会截到日）
    const d = t === 'datetime' ? parseISODate(raw) : this.selectedDates()
    valueEl.textContent = d ? formatToken(d, format, locale) : placeholder
  }

  // ---- 面板渲染 ----

  private renderPanel(focusNow: boolean): void {
    const panel = this.panel
    if (!panel) return
    const t = this.pickerType
    if (t === 'month') {
      panel.classList.remove('range-panel')
      this.renderMonthPanel(panel)
    } else if (t === 'daterange') {
      panel.classList.add('range-panel')
      this.renderRangePanel(panel, focusNow)
    } else {
      panel.classList.remove('range-panel')
      this.renderDatePanel(panel, focusNow)
    }
    // 面板内容落定后重定位：首开（尺寸可测）/换月/切子面板/外部改值重渲均覆盖
    if (this.openState) this.positionDropdown()
  }

  private renderDatePanel(panel: HTMLElement, focusNow: boolean): void {
    const locale = resolveLocale(this)
    const t = this.pickerType
    const yearNav = this.subPanel === 'months'
    panel.innerHTML = `
      ${this.shortcutsMarkup()}
      <div class="header">
        <button type="button" class="nav" part="prev"
          aria-label="${yearNav ? this.t('calendar.prevYear') : this.t('calendar.prevMonth')}">‹</button>
        <button type="button" class="title" part="title"></button>
        <button type="button" class="nav" part="next"
          aria-label="${yearNav ? this.t('calendar.nextYear') : this.t('calendar.nextMonth')}">›</button>
      </div>
      <div class="grid" part="grid" role="grid"></div>
      ${t === 'datetime' ? '<div class="time-section" part="time-section"></div>' : ''}
      <div class="footer">
        <button type="button" class="today" part="today">${this.t('calendar.today')}</button>
        ${t === 'datetime' ? `<button type="button" class="confirm" part="confirm">${this.t('datePicker.confirm')}</button>` : ''}
      </div>
    `
    this.bindShortcuts(panel)
    const grid = panel.querySelector<HTMLElement>('[part="grid"]')!
    const title = panel.querySelector<HTMLElement>('[part="title"]')!
    title.textContent =
      this.subPanel === 'months'
        ? formatYear(this.viewDate, locale)
        : formatYearMonth(this.viewDate, locale)

    if (this.subPanel === 'months') {
      this.renderMonthsGrid(grid, (m) => {
        this.viewDate = new Date(this.viewDate.getFullYear(), m, 1)
        this.subPanel = 'days'
        this.renderPanel(false)
      })
    } else {
      this.renderDaysGrid(grid, focusNow)
    }
    if (t === 'datetime') this.renderTimeSection()

    panel
      .querySelector<HTMLElement>('[part="prev"]')
      ?.addEventListener('click', () => this.stepView(-1))
    panel
      .querySelector<HTMLElement>('[part="next"]')
      ?.addEventListener('click', () => this.stepView(1))
    title.addEventListener('click', () => {
      this.subPanel = this.subPanel === 'days' ? 'months' : 'days'
      this.renderPanel(false)
    })
    panel
      .querySelector<HTMLElement>('[part="today"]')
      ?.addEventListener('click', () => this.pickToday())
    panel
      .querySelector<HTMLElement>('[part="confirm"]')
      ?.addEventListener('click', () => this.confirmDateTime())
    grid.addEventListener('keydown', (e) => this.handleGridKey(e as KeyboardEvent, grid))
  }

  private renderDaysGrid(grid: HTMLElement, focusNow: boolean): void {
    const locale = resolveLocale(this)
    const t = this.pickerType
    const multi = this.isMultiple()
    const selectedList = multi ? this.selectedDateArray() : []
    const selected =
      t === 'datetime' ? this.pendingDate : multi ? selectedList : this.selectedDates()
    let focus: Date
    if (this.focusDate) focus = this.focusDate
    else if (multi && selectedList.length) focus = selectedList[selectedList.length - 1]!
    else if (selected instanceof Date) focus = selected
    else focus = startOfDay(new Date())
    renderMonthGrid(grid, {
      viewDate: this.viewDate,
      locale,
      selected,
      today: new Date(),
      min: parseISODate(this.getAttr('min', '')),
      max: parseISODate(this.getAttr('max', '')),
      disabledDate: this._disabledDate ?? undefined,
      onSelect: (d) => this.selectDay(d),
    })
    setRovingTab(grid, focus)
    if (focusNow) {
      const cell = findDayButton(grid, focus)
      cell?.focus()
    }
  }

  private renderMonthsGrid(grid: HTMLElement, onPick: (m: number) => void): void {
    const locale = resolveLocale(this)
    const year = this.viewDate.getFullYear()
    grid.innerHTML = ''
    const months = document.createElement('div')
    months.className = 'months'
    for (let m = 0; m < 12; m++) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'month-cell'
      btn.setAttribute('part', 'month-cell')
      btn.textContent = new Intl.DateTimeFormat(locale, { month: 'short' }).format(
        new Date(year, m, 1),
      )
      btn.setAttribute('aria-label', formatYearMonth(new Date(year, m, 1), locale))
      btn.addEventListener('click', () => onPick(m))
      months.appendChild(btn)
    }
    grid.appendChild(months)
  }

  private renderTimeSection(): void {
    const section = this.panel?.querySelector<HTMLElement>('[part="time-section"]')
    if (!section) return
    section.innerHTML = ''
    for (const unit of ['h', 'm', 's'] as const) {
      const col = document.createElement('div')
      col.className = 'time-col'
      col.setAttribute('data-unit', unit)
      col.setAttribute('role', 'listbox')
      const count = unit === 'h' ? 24 : 60
      for (let v = 0; v < count; v++) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'time-option'
        btn.setAttribute('data-value', String(v))
        btn.setAttribute('role', 'option')
        btn.textContent = pad(v)
        if (this.time[unit] === v) btn.classList.add('selected')
        btn.addEventListener('click', () => {
          this.time[unit] = v
          this.renderTimeSection()
        })
        col.appendChild(btn)
      }
      section.appendChild(col)
    }
  }

  private renderMonthPanel(panel: HTMLElement): void {
    const locale = resolveLocale(this)
    const year = this.viewDate.getFullYear()
    const selected = this.selectedDates()
    const selectedMonth = selected?.getFullYear() === year ? selected.getMonth() : -1
    panel.innerHTML = `
      ${this.shortcutsMarkup()}
      <div class="header">
        <button type="button" class="nav" part="prev" aria-label="${this.t('calendar.prevYear')}">‹</button>
        <span class="title" part="title"></span>
        <button type="button" class="nav" part="next" aria-label="${this.t('calendar.nextYear')}">›</button>
      </div>
      <div class="months"></div>
    `
    this.bindShortcuts(panel)
    panel.querySelector<HTMLElement>('[part="title"]')!.textContent = formatYear(
      this.viewDate,
      locale,
    )
    const monthsWrap = panel.querySelector<HTMLElement>('.months')!
    for (let m = 0; m < 12; m++) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'month-cell'
      btn.setAttribute('part', 'month-cell')
      btn.textContent = new Intl.DateTimeFormat(locale, { month: 'short' }).format(
        new Date(year, m, 1),
      )
      btn.setAttribute('aria-label', formatYearMonth(new Date(year, m, 1), locale))
      if (m === selectedMonth) btn.classList.add('selected')
      btn.addEventListener('click', () => {
        const value = `${year}-${String(m + 1).padStart(2, '0')}`
        this.setAttribute('value', value)
        this.emit('change', { value })
        this.close()
      })
      monthsWrap.appendChild(btn)
    }
    panel.querySelector<HTMLElement>('[part="prev"]')?.addEventListener('click', () => {
      this.viewDate = addYears(this.viewDate, -1)
      this.renderPanel(false)
    })
    panel.querySelector<HTMLElement>('[part="next"]')?.addEventListener('click', () => {
      this.viewDate = addYears(this.viewDate, 1)
      this.renderPanel(false)
    })
  }

  private renderRangePanel(panel: HTMLElement, focusNow: boolean): void {
    const locale = resolveLocale(this)
    const firstMonth = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), 1)
    const secondMonth = addMonths(this.viewDate, 1)
    const min = parseISODate(this.getAttr('min', ''))
    const max = parseISODate(this.getAttr('max', ''))
    panel.innerHTML = `
      ${this.shortcutsMarkup()}
      <div class="header">
        <button type="button" class="nav" part="prev" aria-label="${this.t('calendar.prevMonth')}">‹</button>
        <span class="title" part="title"></span>
        <button type="button" class="nav" part="next" aria-label="${this.t('calendar.nextMonth')}">›</button>
      </div>
      <div class="range-grids">
        <div class="grid" part="grid" role="grid" data-month="0"></div>
        <div class="grid" part="grid" role="grid" data-month="1"></div>
      </div>
    `
    this.bindShortcuts(panel)
    panel.querySelector<HTMLElement>('[part="title"]')!.textContent =
      `${formatYearMonth(firstMonth, locale)} ~ ${formatYearMonth(secondMonth, locale)}`
    const gridA = panel.querySelector<HTMLElement>('[part="grid"][data-month="0"]')!
    const gridB = panel.querySelector<HTMLElement>('[part="grid"][data-month="1"]')!
    const range = { start: this.range.start, end: this.range.end ?? this.previewEnd }
    const renderRangeGrid = (grid: HTMLElement, view: Date): void => {
      renderMonthGrid(grid, {
        viewDate: view,
        locale,
        today: new Date(),
        min,
        max,
        disabledDate: this._disabledDate ?? undefined,
        range,
        onSelect: (d) => this.selectRangeDate(d),
        onCellHover: (d) => this.hoverRangeDate(d),
      })
    }
    renderRangeGrid(gridA, firstMonth)
    renderRangeGrid(gridB, secondMonth)

    const focus = this.focusDate ?? this.range.start ?? startOfDay(new Date())
    const targetGrid = findDayButton(gridA, focus) ? gridA : gridB
    setRovingTab(targetGrid, focus)
    if (focusNow) findDayButton(targetGrid, focus)?.focus()

    gridA.addEventListener('keydown', (e) => this.handleGridKey(e as KeyboardEvent, gridA))
    gridB.addEventListener('keydown', (e) => this.handleGridKey(e as KeyboardEvent, gridB))
    panel.querySelector<HTMLElement>('[part="prev"]')?.addEventListener('click', () => {
      this.viewDate = addMonths(this.viewDate, -1)
      this.renderPanel(false)
    })
    panel.querySelector<HTMLElement>('[part="next"]')?.addEventListener('click', () => {
      this.viewDate = addMonths(this.viewDate, 1)
      this.renderPanel(false)
    })
  }

  // ---- 交互 ----

  /** 生效的快捷预设：用户 property 优先，未设置时用内置默认（label 走 locale） */
  private shortcutItems(): ShortcutItem[] {
    return this._shortcuts ?? this.defaultShortcuts()
  }

  private defaultShortcuts(): ShortcutItem[] {
    const t = this.pickerType
    if (t === 'daterange') {
      return [
        { label: this.t('datePicker.shortcutToday'), getValue: () => this.todayRange() },
        { label: this.t('datePicker.shortcutThisWeek'), getValue: () => this.weekRange() },
        { label: this.t('datePicker.shortcutThisMonth'), getValue: () => this.monthRange() },
        { label: this.t('datePicker.shortcutThisYear'), getValue: () => this.yearRange() },
      ]
    }
    if (t === 'date') {
      return [{ label: this.t('datePicker.shortcutToday'), getValue: () => new Date() }]
    }
    return []
  }

  private shortcutsMarkup(): string {
    const items = this.shortcutItems()
    if (!items.length) return ''
    const labels = items
      .map(
        (it, i) =>
          `<button type="button" class="shortcut" part="shortcut" data-index="${i}">${escapeHtml(it.label)}</button>`,
      )
      .join('')
    return `<div class="shortcuts" part="shortcuts">${labels}</div>`
  }

  private bindShortcuts(panel: HTMLElement): void {
    const items = this.shortcutItems()
    for (const btn of panel.querySelectorAll<HTMLElement>('.shortcut')) {
      const idx = Number(btn.dataset.index)
      btn.addEventListener('click', () => {
        const item = items[idx]
        if (item) this.applyShortcut(item)
      })
    }
  }

  private applyShortcut(item: ShortcutItem): void {
    const t = this.pickerType
    if (t === 'daterange') {
      const r = this.resolveShortcutRange(item)
      if (!r) return
      this.range = { start: r.start, end: r.end }
      const value = JSON.stringify([toISODate(r.start), toISODate(r.end)])
      this.setAttribute('value', value)
      this.emit('change', { value: [toISODate(r.start), toISODate(r.end)] })
      this.close()
      return
    }
    const d = this.resolveShortcutDate(item)
    if (!d) return
    if (t === 'datetime') {
      const value = `${toISODate(d)}T${pad(this.time.h)}:${pad(this.time.m)}:${pad(this.time.s)}`
      this.setAttribute('value', value)
      this.emit('change', { value })
      this.close()
      return
    }
    if (t === 'month') {
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      this.setAttribute('value', value)
      this.emit('change', { value })
      this.close()
      return
    }
    const iso = toISODate(d)
    if (this.isMultiple()) {
      const value = JSON.stringify([iso])
      this.setAttribute('value', value)
      this.emit('change', { value: [iso] })
      this.close()
      return
    }
    this.setAttribute('value', iso)
    this.emit('change', { value: iso })
    this.close()
  }

  /** 解析单值快捷预设，命中禁用日期返回 null（不应用） */
  private resolveShortcutDate(item: ShortcutItem): Date | null {
    let d: Date | null = null
    if (item.getValue) {
      const v = item.getValue()
      d = Array.isArray(v) ? v[0] : v
    } else if (typeof item.value === 'string') {
      d = parseISODate(item.value)
    }
    if (!d) return null
    const s = startOfDay(d)
    if (this._disabledDate && this._disabledDate(s)) return null
    return s
  }

  /** 解析范围快捷预设（端点早于起点时自动对调），命中禁用日期返回 null */
  private resolveShortcutRange(item: ShortcutItem): { start: Date; end: Date } | null {
    let start: Date | null = null
    let end: Date | null = null
    if (item.getValue) {
      const v = item.getValue()
      if (Array.isArray(v) && v.length === 2) {
        start = startOfDay(v[0])
        end = startOfDay(v[1])
      }
    } else if (Array.isArray(item.value) && item.value.length === 2) {
      start = parseISODate(item.value[0])
      end = parseISODate(item.value[1])
    }
    if (!start || !end) return null
    if (end < start) {
      const tmp = start
      start = end
      end = tmp
    }
    if (this._disabledDate && (this._disabledDate(start) || this._disabledDate(end))) return null
    return { start, end }
  }

  private todayRange(): [Date, Date] {
    const t = startOfDay(new Date())
    return [t, t]
  }

  private weekRange(): [Date, Date] {
    const ws = getWeekStart(resolveLocale(this))
    const today = new Date()
    const diff = (today.getDay() + 7 - ws) % 7
    const start = new Date(today)
    start.setDate(today.getDate() - diff)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return [startOfDay(start), startOfDay(end)]
  }

  private monthRange(): [Date, Date] {
    const today = new Date()
    return [new Date(today.getFullYear(), today.getMonth(), 1), startOfDay(today)]
  }

  private yearRange(): [Date, Date] {
    const today = new Date()
    return [new Date(today.getFullYear(), 0, 1), startOfDay(today)]
  }

  private stepView(dir: 1 | -1): void {
    if (this.subPanel === 'months') this.viewDate = addYears(this.viewDate, dir)
    else this.viewDate = addMonths(this.viewDate, dir)
    this.renderPanel(false)
  }

  private pickToday(): void {
    const t = this.pickerType
    const today = startOfDay(new Date())
    if (t === 'datetime') {
      this.pendingDate = today
      this.viewDate = today
      this.renderPanel(false)
    } else if (t === 'month') {
      this.viewDate = new Date(today.getFullYear(), today.getMonth(), 1)
      this.renderPanel(false)
    } else {
      this.selectDay(today)
    }
  }

  private selectDay(d: Date): void {
    this.focusDate = startOfDay(d)
    const t = this.pickerType
    if (t === 'datetime') {
      this.pendingDate = startOfDay(d)
      this.renderPanel(false)
      return
    }
    if (this.isMultiple()) {
      const iso = toISODate(d)
      const before = this.selectedDateArray()
      const list = before.filter((x) => toISODate(x) !== iso)
      if (list.length === before.length) list.push(startOfDay(d))
      const values = list.map(toISODate)
      this.setAttribute('value', JSON.stringify(values))
      this.emit('change', { value: values })
      // 保持面板打开，支持连续点选（setAttribute 触发 update 重渲染高亮）
      return
    }
    const iso = toISODate(d)
    this.setAttribute('value', iso)
    this.emit('change', { value: iso })
    this.close()
  }

  private confirmDateTime(): void {
    if (!this.pendingDate) return
    const value = `${toISODate(this.pendingDate)}T${pad(this.time.h)}:${pad(this.time.m)}:${pad(this.time.s)}`
    this.setAttribute('value', value)
    this.emit('change', { value })
    this.close()
  }

  private selectRangeDate(d: Date): void {
    this.focusDate = startOfDay(d)
    this.previewEnd = null
    if (!this.range.start || this.range.end) {
      this.range = { start: startOfDay(d), end: null }
    } else if (d < this.range.start) {
      this.range = { start: startOfDay(d), end: null }
    } else {
      this.range = { ...this.range, end: startOfDay(d) }
      this.commitRange()
      return
    }
    this.renderPanel(false)
  }

  private hoverRangeDate(d: Date): void {
    if (!this.range.start || this.range.end) return
    const iso = toISODate(d)
    if (!this.previewEnd || toISODate(this.previewEnd) !== iso) {
      this.previewEnd = startOfDay(d)
      if (this.panel) this.renderRangePanel(this.panel, false)
    }
  }

  private commitRange(): void {
    if (!this.range.start || !this.range.end) return
    const value = JSON.stringify([toISODate(this.range.start), toISODate(this.range.end)])
    this.setAttribute('value', value)
    this.emit('change', {
      value: [toISODate(this.range.start), toISODate(this.range.end)],
    })
    this.close()
  }

  private handleGridKey(e: KeyboardEvent, grid: HTMLElement): void {
    if (this.subPanel === 'months') return
    const t = this.pickerType
    const selected = t === 'datetime' ? this.pendingDate : this.selectedDates()
    const focus = this.focusDate ?? selected ?? startOfDay(new Date())
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      findDayButton(grid, focus)?.click()
      return
    }
    const next = moveGridDate(focus, e.key)
    if (!next) return
    const cell = findDayButton(grid, next)
    if (!cell || cell.classList.contains('disabled')) return
    e.preventDefault()
    this.focusDate = next
    this.renderDaysGrid(grid, true)
  }
}
