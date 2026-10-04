import { OASElement, getLocaleTranslator } from '@oas-ui/core'
import {
  resolveLocale,
  startOfDay,
  toISODate,
  parseISODate,
  addMonths,
  addYears,
  formatYearMonth,
  formatYear,
  formatToken,
  findDayButton,
  setRovingTab,
  renderMonthGrid,
  moveGridDate,
  getWeekStart,
  isSameDay,
} from './date-grid.js'
import { isRtl } from '../../shared/direction.js'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  padding: var(--oas-space-3);
  box-sizing: border-box;
}
:host([hidden]) {
  display: none;
}
/* 全局禁用：整体降透明 + 光标禁示意（数据态由 update 同步 data-disabled） */
:host([data-disabled]) {
  opacity: 0.6;
  cursor: not-allowed;
}
:host([data-disabled]) [part='header'] button {
  cursor: not-allowed;
}
:host([data-disabled]) [part='grid'] button {
  cursor: not-allowed;
}
:host([data-disabled]) [part='grid'] .day:hover,
:host([data-disabled]) [part='grid'] .month-cell:hover,
:host([data-disabled]) [part='grid'] .year-cell:hover {
  background: transparent;
}
/* readonly：可浏览不可提交，日格不指示可点 */
:host([readonly]) [part='grid'] .day {
  cursor: default;
}
[part='header'] {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  margin-bottom: var(--oas-space-2);
}
[part='header'] button {
  appearance: none;
  border: none;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  color: var(--oas-color-text-primary);
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-md);
  height: var(--oas-control-height-md);
  min-width: var(--oas-control-height-md);
  padding: 0 var(--oas-space-1);
}
[part='header'] button:hover:not(:disabled) {
  background: var(--oas-color-bg-hover);
}
[part='header'] button:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
/* 翻页边界（min/max 整页越界）/ 全局禁用：导航钮置灰 */
[part='header'] button:disabled {
  color: var(--oas-color-text-disabled);
  background: transparent;
  cursor: not-allowed;
}
[part='title'] {
  flex: 1;
  text-align: center;
  font-size: var(--oas-font-size-md);
  font-weight: 500;
  white-space: nowrap;
}
[part='today'] {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-primary);
}
[part='today']:hover:not(:disabled) {
  color: var(--oas-color-primary-hover);
}
[part='grid'] .weekdays,
[part='grid'] .week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
/* 多月份并排（months>1）：flex 主轴随书写方向自动镜像（RTL 逻辑方向），各面板等宽 */
[part='grid'].multi-month {
  display: flex;
  gap: var(--oas-space-4);
}
[part='grid'].multi-month .month-panel {
  flex: 1 1 auto;
  min-width: 0;
}
[part='grid'].has-week-number .weekdays,
[part='grid'].has-week-number .week {
  grid-template-columns: 1.4fr repeat(7, 1fr);
}
[part='grid'] .weekday {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--oas-control-height-md);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
[part='grid'] .week-number {
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
  position: relative;
  width: 100%;
  height: var(--oas-control-height-md);
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  color: var(--oas-color-text-primary);
  cursor: pointer;
}
/* 自定义单元格标记点：宿主经 oas-cell-render 追加 <span class="cell-dot"> 即可获得可见标记 */
[part='grid'] .day .cell-dot {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--oas-color-danger);
}
/* 排期条目（events 通道）：当日标记点/计数徽标 */
[part='grid'] .day .ev-marks {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 3px;
  pointer-events: none;
}
[part='grid'] .day .ev-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--oas-color-primary);
}
[part='grid'] .day .ev-more {
  font-size: 9px;
  line-height: 1;
  color: var(--oas-color-text-secondary-strong);
}
/* 排期条目行内浮层（shadow 内自渲染） */
:host .calendar {
  position: relative;
}
:host .ev-panel {
  position: absolute;
  z-index: var(--oas-z-dropdown);
  min-width: 120px;
  max-width: 220px;
  padding: var(--oas-space-2);
  background: var(--oas-color-bg-elevated);
  color: var(--oas-color-text-primary);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: var(--oas-shadow-md);
  font-size: var(--oas-font-size-sm);
}
:host .ev-row {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1_5);
  padding: 2px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
:host .ev-row .ev-dot {
  flex: 0 0 auto;
  width: 6px;
  height: 6px;
}
:host .ev-row .ev-title {
  overflow: hidden;
  text-overflow: ellipsis;
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
/* range 范围选择：起止端点主色实底 + 圆角，中间段主色浅底直角（连续条带观感）；
   色值一律走 token（对齐 date-picker daterange 的 range 视觉语言） */
[part='grid'] .day.range-start,
[part='grid'] .day.range-end {
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
  border-radius: var(--oas-radius-sm);
}
[part='grid'] .day.range-start:hover,
[part='grid'] .day.range-end:hover {
  background: var(--oas-color-primary-hover);
}
[part='grid'] .day.in-range {
  background: color-mix(in srgb, var(--oas-color-primary) 18%, transparent);
  border-radius: 0;
}
[part='grid'] .day.in-range:hover {
  background: color-mix(in srgb, var(--oas-color-primary) 26%, transparent);
}
[part='grid'] .day.disabled {
  color: var(--oas-color-text-disabled);
  cursor: not-allowed;
}
[part='grid'] .day.outside {
  color: var(--oas-color-text-disabled);
}
[part='grid'] .months {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--oas-space-1);
}
[part='grid'] .month-cell {
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
[part='grid'] .month-cell:hover:not(.disabled) {
  background: var(--oas-color-bg-hover);
}
[part='grid'] .month-cell:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
[part='grid'] .month-cell.selected {
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
/* decade 年网格（月面板标题钻取，4 列 x 3 行） */
[part='grid'] .years {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--oas-space-1);
}
[part='grid'] .year-cell {
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
[part='grid'] .year-cell:hover:not(.disabled) {
  background: var(--oas-color-bg-hover);
}
[part='grid'] .year-cell:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
}
[part='grid'] .year-cell.selected {
  background: var(--oas-color-primary);
  color: var(--oas-color-bg);
}
[part='grid'] .month-cell.disabled,
[part='grid'] .year-cell.disabled {
  color: var(--oas-color-text-disabled);
  cursor: not-allowed;
}
/* ---- 触屏（pointer: coarse）：日格/月格/年格与头部导航触控目标 ≥44px ---- */
/* 日格只抬高度不撑宽度：7 列 × 44px min-width 会撑破窄容器（375 卡片内容宽 ~250px），
   周日列溢出被裁不可见不可点。格宽随容器 1fr 均分，触控热区由高度 + 整格可点保障；
   月格/年格不受 7 列约束，宽高抬升保留。 */
@media (pointer: coarse) {
  [part='grid'] .day {
    min-height: var(--oas-touch-target-min, 44px);
  }
  [part='grid'] .month-cell,
  [part='grid'] .year-cell {
    min-height: var(--oas-touch-target-min, 44px);
  }
  [part='header'] button {
    min-width: var(--oas-touch-target-min, 44px);
    min-height: var(--oas-touch-target-min, 44px);
  }
}
`

/** 面板层级：days 日网格 / months 12 月网格 / years decade 年网格（内部导航态） */
type PanelView = 'days' | 'months' | 'years'

/** 排期条目：`{ date: 'YYYY-MM-DD', title?, color? }` */
export interface CalendarEvent {
  date: string
  title?: string
  color?: string
}

/** 清洗 events 入参：仅保留 date 可解析的条目，title/color 仅收字符串 */
function sanitizeEvents(v: unknown): CalendarEvent[] {
  if (!Array.isArray(v)) return []
  const out: CalendarEvent[] = []
  for (const item of v) {
    if (typeof item !== 'object' || item === null) continue
    const it = item as Record<string, unknown>
    if (typeof it.date !== 'string' || !parseISODate(it.date)) continue
    const ev: CalendarEvent = { date: it.date }
    if (typeof it.title === 'string' && it.title !== '') ev.title = it.title
    if (typeof it.color === 'string' && it.color !== '') ev.color = it.color
    out.push(ev)
  }
  return out
}

export class OASCalendar extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'mode',
      'range',
      'min',
      'max',
      'show-week-number',
      'first-day-of-week',
      'page-show-date',
      'disabled',
      'readonly',
      'locale',
      'format',
      'calendar-system',
      'months',
      'events',
    ]
  }

  /** 排期条目类型：`{ date: 'YYYY-MM-DD', title?, color? }` */
  private _events: CalendarEvent[] = []
  /** events 属性快照（避免每帧重解析 JSON） */
  private _eventsAttrCache = ''
  /** 当日条目浮层节点（至多一个） */
  private evPanel: HTMLElement | null = null
  private evPanelHideTimer: number | null = null

  private viewDate: Date = startOfDay(new Date())
  private focusDate: Date | null = null
  /** 导航面板状态机：日网格 → 月面板 → 十年网格（decade 快速跳年） */
  private panel: PanelView = 'days'
  private userNavigated = false
  /** page-show-date 上次已处理值：属性变化时重锚定面板月（受控），未变则不打断用户浏览 */
  private lastPageAnchor = ''
  private grid: HTMLElement | null = null
  private _disabledDate: ((d: Date) => boolean) | null = null
  /** mode 变化检测：首帧吸收初始值不派发，之后任何 mode 属性变化（宿主/内部）都派发 oas-mode-change */
  private lastMode = 'month'
  private modeInit = false
  /** range 范围选择进行中状态：已点起点（null=非选择中）与悬停预览终点 */
  private rangeStart: Date | null = null
  private rangePreview: Date | null = null

  /** @apiProperty 禁用日期回调（回调无法用 attribute 表达；置 null 恢复全部可选） */
  get disabledDate(): ((d: Date) => boolean) | null {
    return this._disabledDate
  }
  set disabledDate(fn: ((d: Date) => boolean) | null) {
    this._disabledDate = fn
    if (this.isConnected) this.update()
  }

  /**
   * 排期条目（公开读/写通道）：`[{ date: 'YYYY-MM-DD', title?, color? }]`。
   * 读：当前生效条目（数组拷贝）；写：程序性赋值，序列化进受控 `events` 属性并即时重渲染（不派发事件）。
   */
  get events(): CalendarEvent[] {
    return this._events.slice()
  }
  set events(v: CalendarEvent[]) {
    this._events = sanitizeEvents(v)
    this._eventsAttrCache = JSON.stringify(this._events)
    this.setAttribute('events', this._eventsAttrCache)
    this.hideEventsPanel()
    this.update()
  }

  /** 解析 events（属性变化时重解析；property 写入已由 setter 置好快照） */
  private syncEvents(): void {
    const raw = this.getAttr('events', '')
    if (raw === this._eventsAttrCache) return
    this._eventsAttrCache = raw
    let parsed: unknown
    try {
      parsed = raw === '' ? [] : JSON.parse(raw)
    } catch {
      parsed = []
    }
    this._events = sanitizeEvents(parsed)
    this.hideEventsPanel()
  }

  /** 当日条目（按 ISO 日分组） */
  private eventsOn(iso: string): CalendarEvent[] {
    return this._events.filter((e) => e.date === iso)
  }

  /** 生效周起始：first-day-of-week 覆写（0-6）> 面板 locale 推导 */
  private effectiveWeekStart(): number {
    const raw = this.getAttr('first-day-of-week', '')
    if (/^[0-6]$/.test(raw)) return Number(raw)
    return getWeekStart(this.effectiveLocale())
  }

  /**
   * 生效面板 locale：`locale` 属性覆盖 > config-provider 注入 > 全局 locale（resolveLocale 链）。
   * 覆盖面：标题/周头/单元格描述等 Intl 格式化 + 周起始推导。
   */
  private effectiveLocale(): string {
    const own = this.getAttr('locale', '')
    return own !== '' ? own : resolveLocale(this)
  }

  /** 内置文案：`locale` 属性覆盖且该语言包已注册时优先用之，否则回落 t()（config-provider 注入 > 全局） */
  private tt(key: string, params?: Record<string, string | number>): string {
    const own = this.getAttr('locale', '')
    if (own !== '') {
      const local = getLocaleTranslator(own)
      if (local) return local(key, params)
    }
    return this.t(key, params)
  }

  /** 生效历法：`calendar-system` 属性（Intl calendar 标识，如 chinese/islamic/hebrew）；缺省公历 */
  private calendarSystem(): string {
    return this.getAttr('calendar-system', '').trim()
  }

  /** 生效并排月份数（`months` 属性，正整数，越界/非法回落 1，上限 12 防超宽） */
  private monthCount(): number {
    const raw = this.getAttr('months', '')
    if (raw === '') return 1
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n) || n < 1) return 1
    return Math.min(n, 12)
  }

  /** 当前面板所在「月页」锚点（day 1），用于 oas-panel-change / 页面对比 */
  private pageAnchor(): Date {
    return new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), 1)
  }

  private samePage(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
  }

  /** min/max（日精度）+ disabledDate 联合不可用判定（键盘移动预检） */
  private isDateUnavailable(d: Date): boolean {
    const s = startOfDay(d)
    const min = parseISODate(this.getAttr('min', ''))
    const max = parseISODate(this.getAttr('max', ''))
    if ((min != null && s < startOfDay(min)) || (max != null && s > startOfDay(max))) return true
    return this._disabledDate?.(d) ?? false
  }

  /**
   * 翻页边界：目标页整页落在 [min,max] 之外时禁止步进（导航钮置灰）。
   * 按当前面板层级判定步进单元：days=月、months=年、years=十年页。
   */
  private canStep(dir: 1 | -1): boolean {
    const min = parseISODate(this.getAttr('min', ''))
    const max = parseISODate(this.getAttr('max', ''))
    if (this.panel === 'days') {
      if (dir < 0) {
        if (!min) return true
        const prevEnd = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), 0)
        return !(prevEnd < startOfDay(min))
      }
      if (!max) return true
      // 多月份并排：下一段起点为当前面板末月再 +1 月
      const nextStart = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + this.monthCount(), 1)
      return !(nextStart > startOfDay(max))
    }
    const year = this.viewDate.getFullYear()
    if (this.panel === 'months') {
      if (dir < 0) {
        if (!min) return true
        return !(new Date(year - 1, 11, 31) < startOfDay(min))
      }
      if (!max) return true
      return !(new Date(year + 1, 0, 1) > startOfDay(max))
    }
    // years：十年页（当前页起 12 年），dir 步进 ±12 年
    const minYear = min?.getFullYear() ?? null
    const maxYear = max?.getFullYear() ?? null
    if (dir < 0) {
      if (minYear == null) return true
      return year - 1 >= minYear
    }
    if (maxYear == null) return true
    return year + 12 <= maxYear
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="calendar" part="calendar">
        <div class="header" part="header">
          <slot name="header">
            <button type="button" class="nav prev" part="prev" aria-label=""></button>
            <button type="button" class="title" part="title" aria-live="polite"></button>
            <button type="button" class="nav next" part="next" aria-label=""></button>
            <button type="button" class="today" part="today" hidden></button>
          </slot>
        </div>
        <div class="grid" part="grid" role="grid"></div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定导航/标题/今天/网格键盘事件（render 与水合路径共用） */
  private bind(): void {
    this.grid = this.shadow.querySelector<HTMLElement>('[part="grid"]')
    this.shadow.querySelector<HTMLElement>('[part="prev"]')?.addEventListener('click', () => this.navigate(-1))
    this.shadow.querySelector<HTMLElement>('[part="next"]')?.addEventListener('click', () => this.navigate(1))
    this.shadow.querySelector<HTMLElement>('[part="title"]')?.addEventListener('click', () => this.onTitleClick())
    this.shadow.querySelector<HTMLElement>('[part="today"]')?.addEventListener('click', () => this.goToday())
    this.grid?.addEventListener('keydown', (e) => this.handleGridKey(e as KeyboardEvent))
    // 排期条目浮层：悬停/聚焦当日（有条目时）展开行内清单；离开延迟收起（允许指针移入浮层）
    this.grid?.addEventListener('pointerover', (e) => {
      const day = (e.target as Element).closest?.('.day') as HTMLButtonElement | null
      if (day) this.maybeShowEventsPanel(day)
    })
    this.grid?.addEventListener('focusin', (e) => {
      const day = (e.target as Element).closest?.('.day') as HTMLButtonElement | null
      if (day) this.maybeShowEventsPanel(day)
    })
    const scheduleHide = (): void => {
      if (this.evPanelHideTimer !== null) clearTimeout(this.evPanelHideTimer)
      this.evPanelHideTimer = window.setTimeout(() => this.hideEventsPanel(), 140)
    }
    this.grid?.addEventListener('pointerout', scheduleHide)
    this.grid?.addEventListener('focusout', scheduleHide)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（header 与 grid 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="header"]')) return false
    if (!this.shadow.querySelector('[part="grid"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.syncEvents()
    const locale = this.effectiveLocale()
    const mode = this.getAttr('mode', 'month')
    // mode 属性变化统一派发 oas-mode-change（受控宿主可据此重新设置 mode 保持模式）
    if (!this.modeInit) {
      this.lastMode = mode
      this.modeInit = true
    } else if (mode !== this.lastMode) {
      this.lastMode = mode
      this.emit('mode-change', { mode })
      // 年视图退出（mode → month）：面板回到日网格
      if (mode === 'month') this.panel = 'days'
    }
    // year 视图本质即 12 月面板（内部导航层恒非 days）
    if (mode === 'year' && this.panel === 'days') this.panel = 'months'

    const selected = this.selectedDate()

    // 面板月锚点优先级：page-show-date（受控/初始锚定）> value 跟随 > 保持现页。
    // 锚点属性变化时才重锚定（含移除回退 value/当月）；未变化不打断用户浏览。
    const rawPage = this.getAttr('page-show-date', '')
    if (rawPage !== this.lastPageAnchor) {
      const releasing = this.lastPageAnchor !== '' && rawPage === ''
      this.lastPageAnchor = rawPage
      if (rawPage) {
        const p = parseISODate(rawPage)
        if (p) {
          this.viewDate = new Date(p.getFullYear(), p.getMonth(), 1)
          this.userNavigated = false
          this.focusDate = null
        }
      } else if (releasing) {
        // 锚点释放：回到 value 所在月，否则当月
        this.userNavigated = false
        this.focusDate = null
        this.viewDate = selected ? startOfDay(selected) : startOfDay(new Date())
      }
    } else if (!this.userNavigated && selected && this.lastPageAnchor === '') {
      // 未显式锚定且用户未手动翻页：value 变化时面板跟随
      this.viewDate = startOfDay(selected)
    }

    // 全局禁用态（config-provider 注入或自身 disabled 属性）→ 数据态 + inert 全停交互
    const dis = this.injectDisabled()
    this.toggleAttribute('data-disabled', dis)
    const rootEl = this.shadow.querySelector<HTMLElement>('[part="calendar"]')
    if (rootEl) rootEl.inert = dis

    const title = this.shadow.querySelector<HTMLElement>('[part="title"]')
    if (title) {
      // format 覆盖头部标题格式（token 同 date-picker：yyyy/MM/dd…）；十年面板为区间形态，格式串不适用
      const fmt = this.getAttr('format', '')
      const calendar = this.calendarSystem()
      const y = this.viewDate.getFullYear()
      const count = this.monthCount()
      title.textContent =
        this.panel === 'days'
          ? count > 1
            ? // 多月份并排：标题为月份范围（format 串对区间不适用，忽略）
              `${formatYearMonth(this.viewDate, locale, calendar)} – ${formatYearMonth(addMonths(this.viewDate, count - 1), locale, calendar)}`
            : fmt
              ? formatToken(this.viewDate, fmt, locale, calendar)
              : formatYearMonth(this.viewDate, locale, calendar)
          : this.panel === 'months'
            ? fmt
              ? formatToken(this.viewDate, fmt, locale, calendar)
              : formatYear(this.viewDate, locale, calendar)
            : `${y}-${y + 11}`
    }
    const yearNav = this.panel !== 'days'
    const prev = this.shadow.querySelector<HTMLButtonElement>('[part="prev"]')
    const next = this.shadow.querySelector<HTMLButtonElement>('[part="next"]')
    prev?.setAttribute('aria-label', yearNav ? this.tt('calendar.prevYear') : this.tt('calendar.prevMonth'))
    next?.setAttribute('aria-label', yearNav ? this.tt('calendar.nextYear') : this.tt('calendar.nextMonth'))
    // min/max 翻页边界置灰 + 全局禁用
    if (prev) prev.disabled = dis || !this.canStep(-1)
    if (next) next.disabled = dis || !this.canStep(1)
    const todayBtn = this.shadow.querySelector<HTMLButtonElement>('[part="today"]')
    if (todayBtn) {
      todayBtn.hidden = this.panel !== 'days' || mode !== 'month'
      todayBtn.textContent = this.tt('calendar.today')
      todayBtn.disabled = dis
    }
    this.renderGrid(false)
  }

  private selectedDate(): Date | null {
    const raw = this.getAttr('value', '')
    if (!raw) return null
    const d = parseISODate(raw)
    if (!d) return null
    if (this.getAttr('mode', 'month') === 'year') return new Date(d.getFullYear(), d.getMonth(), 1)
    return startOfDay(d)
  }

  /** 是否范围选择模式（range 属性在场） */
  private isRange(): boolean {
    return this.hasAttr('range')
  }

  /** range 模式的已提交范围：value 属性 JSON 数组 `["YYYY-MM-DD","YYYY-MM-DD"]`（对齐 date-picker range 值形态） */
  private rangeValue(): { start: Date | null; end: Date | null } {
    const raw = this.getAttr('value', '')
    if (!raw) return { start: null, end: null }
    try {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed) || parsed.length !== 2) return { start: null, end: null }
      const s = parseISODate(String(parsed[0] ?? ''))
      const e = parseISODate(String(parsed[1] ?? ''))
      return { start: s, end: e }
    } catch {
      return { start: null, end: null }
    }
  }

  /** 悬停预览：已点起点后，预览终点随指针日格更新（悬停日 < 起点时预览交换区间） */
  private onRangeHover(d: Date): void {
    if (!this.isRange() || !this.rangeStart) return
    const next = startOfDay(d)
    if (this.rangePreview && isSameDay(next, this.rangePreview)) return
    this.rangePreview = next
    this.renderGrid(false)
  }

  /** 当前渲染应高亮的范围：选择中 = 起点 + 悬停预览（自动交换）；否则已提交 value */
  private activeRange(): { start: Date | null; end: Date | null } | null {
    if (!this.isRange()) return null
    if (this.rangeStart) {
      if (!this.rangePreview) return { start: this.rangeStart, end: null }
      return this.rangeStart <= this.rangePreview
        ? { start: this.rangeStart, end: this.rangePreview }
        : { start: this.rangePreview, end: this.rangeStart }
    }
    return this.rangeValue()
  }

  private renderGrid(focusNow: boolean): void {
    const grid = this.grid
    if (!grid) return
    if (this.panel !== 'days') {
      grid.classList.add('months-view')
      grid.classList.remove('has-week-number')
      // 月/年面板无行/列子结构，role=grid 会违反 aria-required-children → 降级为 group（键盘导航仍由组件接管）
      grid.setAttribute('role', 'group')
      if (this.panel === 'years') this.renderYearsPicker(grid)
      else this.renderMonthPicker(grid)
      return
    }
    grid.classList.remove('months-view')
    grid.setAttribute('role', 'grid')
    grid.classList.toggle('has-week-number', this.hasAttr('show-week-number'))

    const count = this.monthCount()
    grid.classList.toggle('multi-month', count > 1)

    const hadFocus = focusNow || (this.shadow.activeElement != null && grid.contains(this.shadow.activeElement))
    const selected = this.isRange() ? null : this.selectedDate()
    const focus = this.focusDate ?? selected ?? startOfDay(new Date())
    const calendar = this.calendarSystem()

    // 多月份并排：清空后逐月渲染（每月一个 role=rowgroup 面板）；单月份保持既有直挂结构（零回归）
    if (count > 1) grid.innerHTML = ''
    for (let i = 0; i < count; i++) {
      let host: HTMLElement = grid
      if (count > 1) {
        host = document.createElement('div')
        host.className = 'month-panel'
        host.setAttribute('role', 'rowgroup')
        grid.appendChild(host)
      }
      renderMonthGrid(host, {
        viewDate: addMonths(this.viewDate, i),
        locale: this.effectiveLocale(),
        calendar,
        weekStart: this.effectiveWeekStart(),
        selected,
        today: new Date(),
        min: parseISODate(this.getAttr('min', '')),
        max: parseISODate(this.getAttr('max', '')),
        disabledDate: this._disabledDate ?? undefined,
        showWeekNumber: this.hasAttr('show-week-number'),
        range: this.activeRange(),
        onSelect: (d) => this.selectDate(d),
        onCellHover: this.isRange() ? (d) => this.onRangeHover(d) : undefined,
      })
    }
    this.fillCells(grid)
    setRovingTab(grid, focus)
    if (hadFocus) {
      const cell = findDayButton(grid, focus)
      cell?.focus()
    }
  }

  /**
   * 自定义单元格渲染（对齐 select 的 option-render 机制，双通道）：
   * 1. `template[slot="cell"]` 克隆到每个日单元格，`[data-cell-date]` 节点自动绑定日期数字；
   * 2. 每个单元格派发 `oas-cell-render`，detail `{ date, element }`，宿主可追加标记/徽标/富文本。
   * 每次网格重建都会执行并重派发，宿主监听须幂等。
   */
  private fillCells(grid: HTMLElement): void {
    const tpl = this.querySelector<HTMLTemplateElement>('template[slot="cell"]')
    for (const btn of grid.querySelectorAll<HTMLButtonElement>('.day')) {
      const date = parseISODate(btn.dataset.date ?? '')
      if (!date) continue
      if (tpl) {
        btn.textContent = ''
        btn.appendChild(tpl.content.cloneNode(true))
        const binder = btn.querySelector<HTMLElement>('[data-cell-date]')
        if (binder) binder.textContent = String(date.getDate())
      }
      this.emit('cell-render', { date, element: btn })
      // 排期条目标记（一等公民 events 通道）：当日有条目渲染圆点（有 color 用之，无则主色），>2 合并 +N 徽标
      const iso = btn.dataset.date ?? ''
      const evs = iso ? this.eventsOn(iso) : []
      if (evs.length > 0) {
        const marks = document.createElement('span')
        marks.className = 'ev-marks'
        for (const ev of evs.slice(0, 2)) {
          const dot = document.createElement('span')
          dot.className = 'ev-dot'
          if (ev.color) dot.style.background = ev.color
          marks.appendChild(dot)
        }
        if (evs.length > 2) {
          const more = document.createElement('span')
          more.className = 'ev-more'
          more.textContent = `+${evs.length - 2}`
          marks.appendChild(more)
        }
        btn.appendChild(marks)
      }
    }
  }

  /** 悬停/聚焦当日：有条目时展开行内条目浮层（日历 shadow 内自渲染，不经 oas-popover） */
  private maybeShowEventsPanel(day: HTMLButtonElement): void {
    const iso = day.dataset.date ?? ''
    const evs = iso ? this.eventsOn(iso) : []
    if (evs.length === 0) {
      if (this.evPanel) this.hideEventsPanel()
      return
    }
    if (this.evPanelHideTimer !== null) {
      clearTimeout(this.evPanelHideTimer)
      this.evPanelHideTimer = null
    }
    if (this.evPanel && this.evPanel.dataset.date === iso) return
    this.hideEventsPanel()
    const host = this.shadow.querySelector<HTMLElement>('.calendar')
    if (!host) return
    const panel = document.createElement('div')
    panel.className = 'ev-panel'
    panel.dataset.date = iso
    panel.setAttribute('role', 'dialog')
    panel.setAttribute('aria-label', iso)
    for (const ev of evs) {
      const row = document.createElement('div')
      row.className = 'ev-row'
      const dot = document.createElement('span')
      dot.className = 'ev-dot'
      if (ev.color) dot.style.background = ev.color
      row.appendChild(dot)
      const text = document.createElement('span')
      text.className = 'ev-title'
      text.textContent = ev.title ?? iso
      row.appendChild(text)
      panel.appendChild(row)
    }
    host.appendChild(panel)
    // 定位：按钮下方；下方空间不足则上翻
    const btnRect = day.getBoundingClientRect()
    const hostRect = host.getBoundingClientRect()
    panel.style.insetInlineStart = `${btnRect.left - hostRect.left}px`
    if (btnRect.bottom - hostRect.top + 6 + panel.offsetHeight > hostRect.height) {
      panel.style.top = `${btnRect.top - hostRect.top - panel.offsetHeight - 4}px`
    } else {
      panel.style.top = `${btnRect.bottom - hostRect.top + 4}px`
    }
    panel.addEventListener('pointerover', () => {
      if (this.evPanelHideTimer !== null) {
        clearTimeout(this.evPanelHideTimer)
        this.evPanelHideTimer = null
      }
    })
    panel.addEventListener('pointerout', () => {
      this.evPanelHideTimer = window.setTimeout(() => this.hideEventsPanel(), 140)
    })
    this.evPanel = panel
  }

  private hideEventsPanel(): void {
    if (this.evPanelHideTimer !== null) {
      clearTimeout(this.evPanelHideTimer)
      this.evPanelHideTimer = null
    }
    this.evPanel?.remove()
    this.evPanel = null
  }

  /** 12 月面板（mode=year 的常驻视图 / month 模式标题钻取的子面板共用） */
  private renderMonthPicker(grid: HTMLElement): void {
    const locale = this.effectiveLocale()
    const year = this.viewDate.getFullYear()
    const selected = this.selectedDate()
    const min = parseISODate(this.getAttr('min', ''))
    const max = parseISODate(this.getAttr('max', ''))
    const selectedMonth = selected?.getFullYear() === year ? selected.getMonth() : -1
    grid.innerHTML = ''
    const months = document.createElement('div')
    months.className = 'months'
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(year, m, 1)
      const mEnd = new Date(year, m + 1, 0)
      const disabled = (min != null && mEnd < startOfDay(min)) || (max != null && mStart > startOfDay(max))
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'month-cell'
      btn.setAttribute('part', 'month-cell')
      // 月/年选择面板恒为公历导航（选择目标就是公历月），不套用 calendar-system
      btn.textContent = new Intl.DateTimeFormat(locale, { month: 'short' }).format(mStart)
      btn.setAttribute('aria-label', formatYearMonth(mStart, locale))
      if (m === selectedMonth) btn.classList.add('selected')
      if (disabled) {
        btn.classList.add('disabled')
        btn.setAttribute('aria-disabled', 'true')
      }
      btn.addEventListener('click', () => {
        if (disabled || this.injectDisabled() || this.hasAttr('readonly')) return
        this.selectMonth(m)
      })
      months.appendChild(btn)
    }
    grid.appendChild(months)
  }

  /** decade 年网格：12 年页（起点对齐 10 年），选年回月网格快速跳远年 */
  private renderYearsPicker(grid: HTMLElement): void {
    const locale = this.effectiveLocale()
    const start = this.viewDate.getFullYear()
    const selected = this.selectedDate()
    const min = parseISODate(this.getAttr('min', ''))
    const max = parseISODate(this.getAttr('max', ''))
    const selYear = selected?.getFullYear() ?? -1
    grid.innerHTML = ''
    const years = document.createElement('div')
    years.className = 'years'
    for (let i = 0; i < 12; i++) {
      const y = start + i
      const yStart = new Date(y, 0, 1)
      const yEnd = new Date(y, 11, 31)
      const disabled = (min != null && yEnd < startOfDay(min)) || (max != null && yStart > startOfDay(max))
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'year-cell'
      btn.setAttribute('part', 'year-cell')
      btn.setAttribute('data-year', String(y))
      btn.textContent = String(y)
      // 十年/年网格为公历导航，不套用 calendar-system
      btn.setAttribute('aria-label', formatYear(yStart, locale))
      if (y === selYear) btn.classList.add('selected')
      if (disabled) {
        btn.classList.add('disabled')
        btn.setAttribute('aria-disabled', 'true')
      }
      btn.addEventListener('click', () => {
        if (disabled || this.injectDisabled() || this.hasAttr('readonly')) return
        this.selectYear(y)
      })
      years.appendChild(btn)
    }
    grid.appendChild(years)
  }

  /** 翻页：层级决定步进单元（月 / 年 / 十年页），整页越界时按钮已置灰拦截 */
  private navigate(dir: 1 | -1): void {
    if (this.injectDisabled()) return
    const prev = this.pageAnchor()
    this.userNavigated = true
    if (this.panel === 'days') this.viewDate = addMonths(this.viewDate, dir * this.monthCount())
    else if (this.panel === 'months') this.viewDate = addYears(this.viewDate, dir)
    else this.viewDate = addYears(this.viewDate, dir * 12)
    this.update()
    if (!this.samePage(prev, this.pageAnchor())) {
      this.emit('panel-change', { date: this.pageAnchor() })
    }
  }

  /** 标题钻取：日网格 → 月面板 → 十年网格（decade 快速跳远年），再点回退一层 */
  private onTitleClick(): void {
    if (this.injectDisabled()) return
    // 钻取会改变面板所在页（进入十年网格需对齐页锚），此后 value 不再自动吸附
    this.userNavigated = true
    if (this.panel === 'days') {
      this.panel = 'months'
    } else if (this.panel === 'months') {
      // 进入十年网格：viewDate 对齐到 10 年页起点（保留月分量便于回月面板）
      const y = this.viewDate.getFullYear()
      this.viewDate = new Date(y - (y % 10), this.viewDate.getMonth(), 1)
      this.panel = 'years'
    } else {
      this.panel = 'months'
    }
    this.update()
  }

  private goToday(): void {
    if (this.injectDisabled()) return
    const today = startOfDay(new Date())
    const prev = this.pageAnchor()
    this.viewDate = today
    this.focusDate = today
    this.panel = 'days'
    this.userNavigated = true
    this.update()
    if (!this.samePage(prev, this.pageAnchor())) {
      this.emit('panel-change', { date: this.pageAnchor() })
    }
  }

  private selectDate(d: Date): void {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    // range 范围选择：两段式（起点点击 → 悬停预览 → 终点点击提交 oas-change { start, end }；
    // 提交后再次点击重开新一轮，旧区间即时清除）
    if (this.isRange()) {
      const prev = this.pageAnchor()
      if (!this.rangeStart) {
        // 第一击：记录起点、清除已提交区间（重开新一轮），不派发 change
        this.rangeStart = startOfDay(d)
        this.rangePreview = null
        this.focusDate = this.rangeStart
        if (this.hasAttribute('value')) this.removeAttribute('value')
        this.update()
        if (!this.samePage(prev, this.pageAnchor())) {
          this.emit('panel-change', { date: this.pageAnchor() })
        }
        return
      }
      // 第二击：提交区间（起点晚于终点时自动交换）
      const a = this.rangeStart
      const b = startOfDay(d)
      const [s, e] = a <= b ? [a, b] : [b, a]
      const startIso = toISODate(s)
      const endIso = toISODate(e)
      this.rangeStart = null
      this.rangePreview = null
      this.focusDate = b
      this.setAttribute('value', JSON.stringify([startIso, endIso]))
      this.emit('change', { start: startIso, end: endIso })
      this.update()
      if (!this.samePage(prev, this.pageAnchor())) {
        this.emit('panel-change', { date: this.pageAnchor() })
      }
      return
    }
    const iso = toISODate(d)
    const prev = this.pageAnchor()
    this.setAttribute('value', iso)
    this.emit('change', { value: iso })
    this.focusDate = startOfDay(d)
    this.update()
    // 点邻月补位日选中后面板跟随值所在月 → 视为面板月变化
    if (!this.samePage(prev, this.pageAnchor())) {
      this.emit('panel-change', { date: this.pageAnchor() })
    }
  }

  private selectMonth(m: number): void {
    const mode = this.getAttr('mode', 'month')
    const target = new Date(this.viewDate.getFullYear(), m, 1)
    const prev = this.pageAnchor()
    this.viewDate = target
    this.focusDate = target
    this.userNavigated = true
    this.panel = 'days'
    if (mode === 'year') {
      // 年模式选中月份：更新 value 并切回月视图。
      // 受控宿主可监听 oas-mode-change 后重新设置 mode="year" 保持年模式。
      const value = `${target.getFullYear()}-${String(m + 1).padStart(2, '0')}`
      this.setAttribute('mode', 'month') // update 内统一派发 oas-mode-change
      this.setAttribute('value', value)
      this.emit('change', { value })
    }
    this.update()
    if (!this.samePage(prev, this.pageAnchor())) {
      this.emit('panel-change', { date: this.pageAnchor() })
    }
  }

  /** decade 网格选年：回到该年 12 月面板（保持面板月份分量） */
  private selectYear(y: number): void {
    const prev = this.pageAnchor()
    this.viewDate = new Date(y, this.viewDate.getMonth(), 1)
    this.panel = 'months'
    this.userNavigated = true
    this.update()
    if (!this.samePage(prev, this.pageAnchor())) {
      this.emit('panel-change', { date: this.pageAnchor() })
    }
  }

  private handleGridKey(e: KeyboardEvent): void {
    const grid = this.grid
    if (!grid) return
    if (this.injectDisabled()) return
    // 月/年/十年面板走原生按钮行为（Tab / Enter / Space）
    if (this.panel !== 'days') return
    const focus = this.focusDate ?? this.selectedDate() ?? startOfDay(new Date())
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      findDayButton(grid, focus)?.click()
      return
    }
    const next = moveGridDate(focus, e.key, this.effectiveWeekStart(), e.shiftKey, isRtl(this))
    if (!next) return
    // 目标不可用（min/max/disabledDate）时不移动
    if (this.isDateUnavailable(next)) return
    const prev = this.pageAnchor()
    e.preventDefault()
    this.focusDate = next
    this.userNavigated = true
    // 跨月目标不在当前网格 → 面板翻页跟随（走 update 刷新标题/边界钮后聚焦目标格）
    const firstMonth = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), 1)
    const lastMonthEnd = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + this.monthCount(), 0)
    const inView = next >= firstMonth && next <= lastMonthEnd
    if (inView) {
      this.renderGrid(true)
    } else {
      this.viewDate = new Date(next.getFullYear(), next.getMonth(), 1)
      this.update()
      const cell = this.grid ? findDayButton(this.grid, next) : null
      cell?.focus()
    }
    if (!this.samePage(prev, this.pageAnchor())) {
      this.emit('panel-change', { date: this.pageAnchor() })
    }
  }
}
