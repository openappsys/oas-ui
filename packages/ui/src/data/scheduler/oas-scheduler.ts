import { OASElement } from '@oas-ui/core'
import {
  addMonths,
  buildMonthCells,
  daysInMonth,
  formatToken,
  getWeekStart,
  isSameDay,
  parseISODate,
  resolveLocale,
  startOfDay,
  toISODate,
  weekdayLabels,
} from '../../form/calendar/date-grid.js'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  min-width: 0;
}
:host([hidden]) {
  display: none;
}
.calendar {
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  overflow: hidden;
}
/* hidden 属性切换视图：组件自身的 display:grid/flex 会覆盖 UA 的 [hidden] 默认，需显式压制 */
.grid[hidden],
.weekdays[hidden],
.timeview[hidden],
.agenda[hidden] {
  display: none !important;
}
.header {
  display: flex;
  align-items: center;
  gap: var(--oas-space-1);
  padding: var(--oas-space-2) var(--oas-space-3);
  border-bottom: 1px solid var(--oas-color-border);
}
.header button {
  appearance: none;
  border: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  border-radius: var(--oas-radius-sm);
  height: var(--oas-control-height-sm);
  min-width: var(--oas-control-height-sm);
  padding: 0 var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  cursor: pointer;
}
.header button:hover {
  background: var(--oas-color-bg-hover);
  border-color: var(--oas-color-primary);
}
.header .title {
  flex: 1;
  text-align: center;
  font-weight: 600;
  border-color: transparent;
  background: transparent;
  cursor: default;
}
.header .today {
  color: var(--oas-color-primary);
}
.header .views {
  display: inline-flex;
  gap: var(--oas-space-1);
}
.header .views button {
  border-radius: var(--oas-radius-sm);
}
.header .views button.on {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
.timeview {
  position: relative;
  display: grid;
  grid-template-columns: 48px 1fr;
  overflow-y: auto;
  max-height: 640px;
}
.band-spacer {
  border-inline-end: 1px solid var(--oas-color-border);
  border-bottom: 1px solid var(--oas-color-border);
}
.band {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
}
.band-col {
  border-inline-end: 1px solid var(--oas-color-border);
  border-bottom: 1px solid var(--oas-color-border);
  min-width: 0;
}
.band-col:last-child {
  border-inline-end: none;
}
.band-col .col-head {
  padding: var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary-strong);
  text-align: center;
}
.band-col.today .col-head {
  color: var(--oas-color-primary);
  font-weight: 600;
}
.timeview .gutter {
  border-inline-end: 1px solid var(--oas-color-border);
}
.timeview .gutter span {
  display: block;
  height: var(--hour-h, 48px);
  padding: 0 var(--oas-space-1);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary-strong);
  text-align: end;
  transform: translateY(-50%);
}
.timeview .cols {
  position: relative;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
}
.timeview .col {
  position: relative;
  border-inline-end: 1px solid var(--oas-color-border);
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent calc(var(--hour-h, 48px) - 1px),
    var(--oas-color-border) calc(var(--hour-h, 48px) - 1px),
    var(--oas-color-border) var(--hour-h, 48px)
  );
}
.timeview .col:last-child {
  border-inline-end: none;
}
.timeview .allday {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: var(--oas-space-1);
  min-height: 26px;
}
.timeview .event {
  position: absolute;
  inset-inline: 4px;
  border: none;
  background: color-mix(in srgb, var(--chip-color, var(--oas-color-primary)) 20%, transparent);
  border-inline-start: 3px solid var(--chip-color, var(--oas-color-primary));
  border-radius: var(--oas-radius-xs);
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-xs);
  line-height: 1.3;
  padding: 2px var(--oas-space-1);
  text-align: start;
  cursor: grab;
  overflow: hidden;
  text-overflow: ellipsis;
}
.timeview .event:active {
  cursor: grabbing;
}
.timeview .event[draggable='true']:hover {
  background: color-mix(in srgb, var(--chip-color, var(--oas-color-primary)) 30%, transparent);
}
.timeview .event .resize {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: 7px;
  cursor: ns-resize;
}
.timeview .col.drop {
  outline: 2px dashed var(--oas-color-primary);
  outline-offset: -2px;
}
.agenda {
  display: flex;
  flex-direction: column;
  max-height: 640px;
  overflow-y: auto;
}
.agenda > * {
  flex-shrink: 0;
}
.ag-day {
  appearance: none;
  border: none;
  border-bottom: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  font-weight: 600;
  padding: var(--oas-space-1) var(--oas-space-3);
  text-align: start;
  cursor: pointer;
  position: sticky;
  top: 0;
  z-index: 1;
}
.ag-day.today {
  color: var(--oas-color-primary);
}
.ag-row {
  appearance: none;
  border: none;
  border-bottom: 1px solid var(--oas-color-border);
  border-inline-start: 3px solid var(--chip-color, var(--oas-color-primary));
  background: transparent;
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  padding: var(--oas-space-1_5) var(--oas-space-3);
  text-align: start;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ag-row:hover {
  background: var(--oas-color-bg-hover);
}
.ag-empty {
  padding: var(--oas-space-4);
  text-align: center;
  color: var(--oas-color-text-secondary-strong);
  font-size: var(--oas-font-size-sm);
}
.weekdays,
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.weekdays {
  border-bottom: 1px solid var(--oas-color-border);
}
.weekdays span {
  padding: var(--oas-space-1) var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary-strong);
  text-align: center;
}
.day {
  position: relative;
  min-height: 84px;
  padding: var(--oas-space-1);
  border: none;
  border-inline-end: 1px solid var(--oas-color-border);
  border-bottom: 1px solid var(--oas-color-border);
  background: transparent;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  text-align: start;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.day:nth-child(7n) {
  border-inline-end: none;
}
.day:nth-last-child(-n + 7) {
  border-bottom: none;
}
.day:hover:not(.outside) {
  background: var(--oas-color-bg-hover);
}
.num {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0;
  font-family: inherit;
  font-size: var(--oas-font-size-sm);
  line-height: 1.4;
  color: inherit;
  text-align: start;
  cursor: pointer;
}
.num:focus-visible,
.day:focus-within {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: -2px;
  border-radius: var(--oas-radius-xs);
}
.day.outside {
  color: var(--oas-color-text-disabled);
}
.day.today .num {
  color: var(--oas-color-primary);
  font-weight: 600;
}
.chips {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.chip {
  appearance: none;
  border: none;
  background: color-mix(in srgb, var(--chip-color, var(--oas-color-primary)) 14%, transparent);
  border-inline-start: 3px solid var(--chip-color, var(--oas-color-primary));
  border-radius: var(--oas-radius-xs);
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-xs);
  line-height: 1.3;
  padding: 1px var(--oas-space-1);
  text-align: start;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.chip:hover {
  background: color-mix(in srgb, var(--chip-color, var(--oas-color-primary)) 26%, transparent);
}
.more {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--oas-color-text-secondary-strong);
  font-family: inherit;
  font-size: var(--oas-font-size-xs);
  padding: 0 var(--oas-space-1);
  text-align: start;
  cursor: pointer;
}
.more:hover {
  color: var(--oas-color-primary);
}
`

/** 日程事件：`{ id?, date: 'YYYY-MM-DD', title, color?, start?, end? }`（P0 以 date 为准，start/end 预留 P1） */
export interface SchedulerEvent {
  id?: string
  date: string
  title: string
  color?: string
  start?: string
  end?: string
  /** 重复规则（RRULE 子集）：按 freq × interval 从 date 起重复，until 截止（含当日） */
  repeat?: SchedulerRepeat
  /** 提前提醒分钟数（组件到点派发 oas-remind） */
  remind?: number
}

/** 重复规则（RRULE 子集） */
export interface SchedulerRepeat {
  freq: 'daily' | 'weekly' | 'monthly'
  interval?: number
  until?: string
}

/** remind 事件载荷 */
export interface SchedulerRemindDetail {
  id: string
  event: SchedulerEvent
}

/** events-change 事件载荷 */
export interface SchedulerEventsChangeDetail {
  events: SchedulerEvent[]
}

/** event-click 事件载荷 */
export interface SchedulerEventClickDetail {
  id: string
  event: SchedulerEvent
}

/** day-click 事件载荷 */
export interface SchedulerDayClickDetail {
  date: string
}

/** view-change 事件载荷 */
export interface SchedulerViewChangeDetail {
  view: SchedulerView
}

export type SchedulerView = 'month' | 'week' | 'day' | 'agenda'

/** 'HH:mm' → 分钟数；非法或越界返回 null（h 0-24、m 0-59，且 24 点仅允许整点） */
function parseTime(s: string | undefined): number | null {
  if (typeof s !== 'string' || !/^\d{1,2}:\d{2}$/.test(s)) return null
  const [h, m] = s.split(':').map(Number)
  if (h === undefined || m === undefined || h > 24 || m > 59 || (h === 24 && m !== 0)) return null
  return h * 60 + m
}

function sanitizeEvents(v: unknown): SchedulerEvent[] {
  if (!Array.isArray(v)) return []
  const out: SchedulerEvent[] = []
  for (const item of v) {
    if (typeof item !== 'object' || item === null) continue
    const it = item as Record<string, unknown>
    if (typeof it.date !== 'string' || !parseISODate(it.date)) continue
    if (typeof it.title !== 'string' || it.title === '') continue
    const ev: SchedulerEvent = { date: it.date, title: it.title }
    if (typeof it.id === 'string' && it.id !== '') ev.id = it.id
    if (typeof it.color === 'string' && it.color !== '') ev.color = it.color
    if (typeof it.start === 'string' && it.start !== '' && parseTime(it.start) !== null) ev.start = it.start
    if (typeof it.end === 'string' && it.end !== '' && parseTime(it.end) !== null) ev.end = it.end
    if (typeof it.repeat === 'object' && it.repeat !== null) {
      const r = it.repeat as Record<string, unknown>
      if (r.freq === 'daily' || r.freq === 'weekly' || r.freq === 'monthly') {
        const rep: SchedulerRepeat = { freq: r.freq }
        if (typeof r.interval === 'number' && r.interval >= 1) rep.interval = r.interval
        if (typeof r.until === 'string' && r.until !== '') rep.until = r.until
        ev.repeat = rep
      }
    }
    if (typeof it.remind === 'number' && Number.isFinite(it.remind) && it.remind >= 0) ev.remind = it.remind
    out.push(ev)
  }
  return out
}

export class OASScheduler extends OASElement {
  static override get observedAttributes(): string[] {
    return ['events', 'page-show-date', 'first-day-of-week', 'locale', 'view', 'start-hour', 'end-hour', 'timezone']
  }

  private _events: Array<SchedulerEvent & { id: string }> = []
  private _eventsAttrCache = ''
  private nextId = 1
  private viewDate: Date = startOfDay(new Date())
  private lastPageAnchor = ''
  private lastTz = ''
  private anchorInit = false
  private gridEl: HTMLElement | null = null
  private titleEl: HTMLElement | null = null
  private view: SchedulerView = 'month'
  private lastView = ''
  private dragCtx: {
    id: string
    mode: 'move' | 'resize'
    originStart: number
    originEnd: number
    newEnd?: string
  } | null = null
  private dropCol: HTMLElement | null = null

  /**
   * @apiProperty 日程事件（公开读/写通道）：读为数组拷贝（含自动分配的 id）；写为程序性赋值
   * （序列化进受控 `events` 属性并重渲染、派发 oas-events-change）。
   */
  get events(): SchedulerEvent[] {
    return this._events.map((e) => ({ ...e, repeat: e.repeat ? { ...e.repeat } : undefined }))
  }
  set events(v: SchedulerEvent[]) {
    this._events = this.normalizeWithIds(sanitizeEvents(v))
    this._eventsAttrCache = JSON.stringify(this._events)
    this.setAttribute('events', this._eventsAttrCache)
    this.update()
    this.emitEventsChange()
  }

  /** 新增事件：返回分配到的 id */
  addEvent(ev: SchedulerEvent): string {
    const [item] = this.normalizeWithIds(sanitizeEvents([ev]), true)
    if (!item) return ''
    this._events = [...this._events, item]
    this.syncEventsAttr()
    this.emitEventsChange()
    return item.id
  }

  /** 按 id 更新事件（浅合并 patch 后走 sanitize 清洗；找不到返回 false） */
  updateEvent(id: string, patch: Partial<SchedulerEvent>): boolean {
    const idx = this._events.findIndex((e) => e.id === id)
    if (idx < 0) return false
    const merged = { ...this._events[idx]!, ...patch, id }
    const [clean] = sanitizeEvents([merged])
    if (!clean) return false
    ;(clean as SchedulerEvent & { id: string }).id = id
    this._events = [
      ...this._events.slice(0, idx),
      clean as SchedulerEvent & { id: string },
      ...this._events.slice(idx + 1),
    ]
    this.syncEventsAttr()
    this.emitEventsChange()
    return true
  }

  /** 按 id 删除事件；找不到返回 false */
  removeEvent(id: string): boolean {
    const idx = this._events.findIndex((e) => e.id === id)
    if (idx < 0) return false
    this._events = [...this._events.slice(0, idx), ...this._events.slice(idx + 1)]
    this.syncEventsAttr()
    this.emitEventsChange()
    return true
  }

  /**
   * id 归一化（避让集与重复判定分离）：
   * - 显式 id：本批首次出现且不撞（respectExisting 时的）存量 → 保留；本批重复或撞存量 → 自动避让
   * - 自动 id：避让「存量 + 本批全部显式 id + 已分配 id」
   */
  private normalizeWithIds(v: SchedulerEvent[], respectExisting = false): Array<SchedulerEvent & { id: string }> {
    const avoid = new Set<string>()
    if (respectExisting) for (const e of this._events) avoid.add(e.id)
    for (const e of v) {
      if (e.id && e.id !== '') avoid.add(e.id)
    }
    const seen = new Set<string>()
    return v.map((e) => {
      let id: string
      if (e.id && e.id !== '' && !seen.has(e.id) && (!respectExisting || !this._events.some((x) => x.id === e.id))) {
        id = e.id
      } else {
        id = this.allocId(avoid)
      }
      seen.add(id)
      avoid.add(id)
      return { ...e, id }
    })
  }

  private allocId(used?: Set<string>): string {
    const taken = used ?? new Set(this._events.map((e) => e.id))
    let id = `ev${this.nextId++}`
    while (taken.has(id)) id = `ev${this.nextId++}`
    return id
  }

  private syncEventsAttr(): void {
    this._eventsAttrCache = JSON.stringify(this._events)
    this.setAttribute('events', this._eventsAttrCache)
    this.update()
  }

  private emitEventsChange(): void {
    this.emit('events-change', { events: this.events } satisfies SchedulerEventsChangeDetail)
  }

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
    this._events = this.normalizeWithIds(sanitizeEvents(parsed))
  }

  private effectiveLocale(): string {
    const own = this.getAttr('locale', '')
    if (own) return own
    return resolveLocale(this)
  }

  private effectiveWeekStart(): number {
    const raw = this.getAttr('first-day-of-week', '')
    if (/^[0-6]$/.test(raw)) return Number(raw)
    return getWeekStart(this.effectiveLocale())
  }

  private startHour(): number {
    const h = Math.floor(Number(this.getAttr('start-hour', '8')))
    return Number.isFinite(h) && h >= 0 && h <= 23 ? h : 8
  }

  private endHour(): number {
    const h = Math.floor(Number(this.getAttr('end-hour', '20')))
    const valid = Number.isFinite(h) && h <= 24 ? h : 20
    // 非法区间（end <= start）钳到 start+1，防时间轴负高度塌陷
    return Math.max(valid, this.startHour() + 1)
  }

  /** 时区（IANA，如 'Asia/Shanghai'；空串 = 本地） */
  private timezone(): string {
    const tz = this.getAttr('timezone', '')
    if (!tz) return ''
    try {
      new Intl.DateTimeFormat('en', { timeZone: tz })
      return tz
    } catch {
      return ''
    }
  }

  /** 时区感知的日期格式化（设了 timezone 走 Intl timeZone，否则本地 formatToken） */
  private fmtTz(d: Date, token: string): string {
    // 面板日期已是「目标时区日历日」（page-show-date 直用 / todayTz 归一），直接本地格式化
    return formatToken(d, token, this.effectiveLocale())
  }

  /** 时区感知的「今天」（按目标时区的年月日取本地零点） */
  private todayTz(): Date {
    const tz = this.timezone()
    if (!tz) return startOfDay(new Date())
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date())
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
    return new Date(get('year'), get('month') - 1, get('day'))
  }

  private setView(v: SchedulerView): void {
    this.view = v
    this.setAttribute('view', v)
    this.emit('view-change', { view: v } satisfies SchedulerViewChangeDetail)
    this.renderCurrentView()
  }

  private renderCurrentView(): void {
    const monthParts = this.shadow.querySelectorAll<HTMLElement>('[part="weekdays"], [part="grid"]')
    const timeview = this.shadow.querySelector<HTMLElement>('[part="timeview"]')
    const agenda = this.shadow.querySelector<HTMLElement>('[part="agenda"]')
    const isTime = this.view === 'week' || this.view === 'day'
    const isAgenda = this.view === 'agenda'
    for (const p of monthParts) p.hidden = isTime || isAgenda
    if (timeview) timeview.hidden = !isTime
    if (agenda) agenda.hidden = !isAgenda
    if (isTime) this.renderTimeView()
    else if (isAgenda) this.renderAgenda()
    else {
      this.renderWeekdays()
      this.renderMonth()
    }
  }

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="calendar" part="calendar">
        <div class="header" part="header">
          <button type="button" class="prev" part="prev"></button>
          <button type="button" class="next" part="next"></button>
          <div class="title" part="title" aria-live="polite"></div>
          <button type="button" class="today" part="today"></button>
          <span class="views" part="views">
            <button type="button" data-view="month"></button>
            <button type="button" data-view="week"></button>
            <button type="button" data-view="day"></button>
            <button type="button" data-view="agenda"></button>
          </span>
        </div>
        <div class="weekdays" part="weekdays"></div>
        <div class="grid" part="grid" role="group"></div>
        <div class="timeview" part="timeview" hidden></div>
        <div class="agenda" part="agenda" hidden></div>
      </div>
    `
  }

  private bind(): void {
    this.gridEl = this.shadow.querySelector<HTMLElement>('[part="grid"]')
    this.titleEl = this.shadow.querySelector<HTMLElement>('[part="title"]')
    this.shadow.querySelector<HTMLElement>('[part="prev"]')?.addEventListener('click', () => this.navigate(-1))
    this.shadow.querySelector<HTMLElement>('[part="next"]')?.addEventListener('click', () => this.navigate(1))
    this.shadow.querySelector<HTMLElement>('[part="today"]')?.addEventListener('click', () => {
      this.viewDate = this.todayTz()
      this.renderCurrentView()
    })
    for (const btn of this.shadow.querySelectorAll<HTMLButtonElement>('[part="views"] button')) {
      btn.addEventListener('click', () => {
        const v = btn.dataset.view as SchedulerView
        if (v && v !== this.view) this.setView(v)
      })
    }
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="header"]')) return false
    if (!this.shadow.querySelector('[part="grid"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.syncEvents()
    this.scheduleReminders()
    // view 属性同步（受控宿主驱动才发 oas-view-change；属性首次吸收不派发）
    const viewAttr = (this.getAttr('view', 'month') as SchedulerView) || 'month'
    if (viewAttr !== this.lastView) {
      const first = this.lastView === ''
      this.lastView = viewAttr
      if (!first && viewAttr !== this.view)
        this.emit('view-change', { view: viewAttr } satisfies SchedulerViewChangeDetail)
      this.view = ['month', 'week', 'day', 'agenda'].includes(viewAttr) ? viewAttr : 'month'
    }
    // 面板月锚点：page-show-date 变化时重锚定（受控），未变不打断浏览。
    // page-show-date 视为「目标时区的日历日」直接使用（不换算；防偏西时区差一天/整月）
    const rawPage = this.getAttr('page-show-date', '')
    if (rawPage !== this.lastPageAnchor) {
      this.lastPageAnchor = rawPage
      if (rawPage) {
        const p = parseISODate(rawPage)
        // 月视图锚到当月 1 号；周/日视图锚到当天（更贴合「展示包含该日的区间」预期）
        if (p) this.viewDate = this.view === 'month' ? new Date(p.getFullYear(), p.getMonth(), 1) : startOfDay(p)
      }
    }
    // timezone 变化或首次（无受控锚点）：锚到目标时区的今天
    const tz = this.timezone()
    if (tz !== this.lastTz || !this.anchorInit) {
      this.lastTz = tz
      this.anchorInit = true
      if (!rawPage) this.viewDate = this.todayTz()
    }

    const todayBtn = this.shadow.querySelector<HTMLElement>('[part="today"]')
    if (todayBtn) todayBtn.textContent = this.t('scheduler.today')
    for (const btn of this.shadow.querySelectorAll<HTMLButtonElement>('[part="views"] button')) {
      const active = btn.dataset.view === this.view
      btn.classList.toggle('on', active)
      btn.setAttribute('aria-pressed', String(active))
      const v = btn.dataset.view as SchedulerView
      btn.textContent = this.t(
        `scheduler.view${v === 'month' ? 'Month' : v === 'week' ? 'Week' : v === 'day' ? 'Day' : 'Agenda'}`,
      )
    }
    const prev = this.shadow.querySelector<HTMLElement>('[part="prev"]')
    const next = this.shadow.querySelector<HTMLElement>('[part="next"]')
    if (prev) {
      prev.textContent = '‹'
      prev.setAttribute('aria-label', this.t('scheduler.prev'))
    }
    if (next) {
      next.textContent = '›'
      next.setAttribute('aria-label', this.t('scheduler.next'))
    }
    this.renderCurrentView()
  }

  private navigate(delta: number): void {
    if (this.view === 'month') this.viewDate = addMonths(this.viewDate, delta)
    else if (this.view === 'week') this.viewDate = new Date(this.viewDate.getTime() + delta * 7 * 86400_000)
    else if (this.view === 'agenda') this.viewDate = new Date(this.viewDate.getTime() + delta * 28 * 86400_000)
    else this.viewDate = new Date(this.viewDate.getTime() + delta * 86400_000)
    this.renderCurrentView()
  }

  /** 日程（agenda）视图：从锚点起 28 天按日分组的时序清单（重复事件已展开） */
  private renderAgenda(): void {
    const el = this.shadow.querySelector<HTMLElement>('[part="agenda"]')
    if (!el) return
    const start = this.viewDate
    const today = this.todayTz()
    const locale = this.effectiveLocale()
    if (this.titleEl) {
      const end = new Date(start.getTime() + 27 * 86400_000)
      this.titleEl.textContent = `${this.fmtTz(start, 'yyyy-MM-dd')} ~ ${this.fmtTz(end, 'MM-dd')}`
    }
    el.innerHTML = ''
    let any = false
    for (let i = 0; i < 28; i++) {
      const d = new Date(start.getTime() + i * 86400_000)
      const iso = toISODate(d)
      const evs = this.eventsOn(iso)
      if (evs.length === 0) continue
      any = true
      const day = document.createElement('button')
      day.type = 'button'
      day.className = 'ag-day'
      if (isSameDay(d, today)) day.classList.add('today')
      day.textContent = `${this.fmtTz(d, 'MM-dd')} ${weekdayLabels(locale, this.effectiveWeekStart())[(d.getDay() - this.effectiveWeekStart() + 7) % 7] ?? ''}`
      day.addEventListener('click', () => {
        this.emit('day-click', { date: iso } satisfies SchedulerDayClickDetail)
      })
      el.appendChild(day)
      for (const ev of evs) {
        const row = document.createElement('button')
        row.type = 'button'
        row.className = 'ag-row'
        if (ev.color) row.style.setProperty('--chip-color', ev.color)
        const time = ev.start ? `${ev.start}${ev.end ? `–${ev.end}` : ''}` : this.t('scheduler.allDay')
        row.textContent = `${time} ${ev.title}`
        row.addEventListener('click', () => {
          this.emit('event-click', { id: ev.id, event: { ...ev } } satisfies SchedulerEventClickDetail)
        })
        el.appendChild(row)
      }
    }
    if (!any) {
      const empty = document.createElement('div')
      empty.className = 'ag-empty'
      empty.textContent = this.t('scheduler.noEvents')
      el.appendChild(empty)
    }
  }
  private renderWeekdays(): void {
    const el = this.shadow.querySelector<HTMLElement>('[part="weekdays"]')
    if (!el) return
    const labels = weekdayLabels(this.effectiveLocale(), this.effectiveWeekStart())
    el.innerHTML = labels.map((l) => `<span>${l}</span>`).join('')
  }

  private eventsOn(iso: string): Array<SchedulerEvent & { id: string }> {
    return this._events.filter((e) => (e.repeat ? this.isOccurrence(e, iso) : e.date === iso))
  }

  /** iso 是否该重复事件的某个发生日（RRULE 子集：daily/weekly 按天数间隔、monthly 按同日） */
  private isOccurrence(ev: SchedulerEvent, iso: string): boolean {
    const rep = ev.repeat
    if (!rep) return false
    const d0 = parseISODate(ev.date)
    const d = parseISODate(iso)
    if (!d0 || !d || d.getTime() < d0.getTime()) return false
    const until = rep.until ? parseISODate(rep.until) : null
    if (until && d.getTime() > until.getTime()) return false
    const interval = Math.max(rep.interval ?? 1, 1)
    const days = Math.round((d.getTime() - d0.getTime()) / 86400_000)
    if (rep.freq === 'daily') return days % interval === 0
    if (rep.freq === 'weekly') return days % (7 * interval) === 0
    const monthDiff = d.getFullYear() * 12 + d.getMonth() - (d0.getFullYear() * 12 + d0.getMonth())
    return d.getDate() === d0.getDate() && monthDiff % interval === 0
  }

  /** 提醒调度：每个带 remind 的事件在「下一发生日的 start - remind 分钟」到点派发 oas-remind。
   *  setTimeout delay 超 2^31-1（≈24.85 天）会被浏览器钳为 0 立即误触发——分段重排直到真正到点 */
  private remindTimers = new Map<string, number>()

  private scheduleReminders(): void {
    for (const t of this.remindTimers.values()) clearTimeout(t)
    this.remindTimers.clear()
    const MAX_DELAY = 2_147_483_647
    for (const ev of this._events) {
      if (ev.remind === undefined || ev.remind < 0) continue
      const at = this.remindAt(ev)
      if (at === null) continue
      const id = ev.id
      const arm = (): void => {
        const remaining = at - Date.now()
        if (remaining <= 0) return
        this.remindTimers.set(
          id,
          window.setTimeout(
            () => {
              if (Date.now() < at) {
                arm()
                return
              }
              this.remindTimers.delete(id)
              this.emit('remind', { id, event: { ...ev } } satisfies SchedulerRemindDetail)
            },
            Math.min(remaining, MAX_DELAY),
          ),
        )
      }
      arm()
    }
  }

  /** 下一发生日的提醒时刻（repeat 事件取今天起最近的发生日；无 repeat 用 date 本身；过期返回 null） */
  private remindAt(ev: SchedulerEvent): number | null {
    const start = parseTime(ev.start) ?? 0
    if (!ev.repeat) {
      const d = parseISODate(ev.date)
      if (!d) return null
      const at = d.getTime() + start * 60_000 - ev.remind! * 60_000
      return at > Date.now() ? at : null
    }
    const next = this.nextOccurrence(ev)
    if (!next) return null
    let d = next
    let at = d.getTime() + start * 60_000 - ev.remind! * 60_000
    if (at <= Date.now()) {
      // 今天发生日的提醒时刻已过（页面在提醒点后挂载）→ 推进到下一个发生日
      d = this.advanceOneStep(d, ev.repeat!, parseISODate(ev.date)!.getDate())
      const until = ev.repeat!.until ? parseISODate(ev.repeat!.until) : null
      if (until && d.getTime() > until.getTime()) return null
      at = d.getTime() + start * 60_000 - ev.remind! * 60_000
    }
    return at > Date.now() ? at : null
  }

  /** 发生日按重复规则前进一步（monthly 携带锚定日、跳过无该日的短月） */
  private advanceOneStep(d: Date, rep: SchedulerRepeat, dayOfMonth: number): Date {
    const interval = Math.max(rep.interval ?? 1, 1)
    if (rep.freq === 'daily') return new Date(d.getTime() + interval * 86400_000)
    if (rep.freq === 'weekly') return new Date(d.getTime() + interval * 7 * 86400_000)
    return this.nextMonthly(d, interval, dayOfMonth)
  }

  /** monthly：从某月推进 interval 步，跳过「无锚定日」的短月（如 1-31 跳过 2 月落 3-31） */
  private nextMonthly(from: Date, interval: number, dayOfMonth: number): Date {
    let total = from.getFullYear() * 12 + from.getMonth() + Math.max(interval, 1)
    for (let guard = 0; guard < 36; guard++) {
      const first = new Date(Math.floor(total / 12), total % 12, 1)
      if (daysInMonth(first) >= dayOfMonth) return new Date(first.getFullYear(), first.getMonth(), dayOfMonth)
      total += Math.max(interval, 1)
    }
    return from
  }

  /** repeat 事件从今天起的下一个发生日（按 freq×interval 直接推进，无逐日循环） */
  private nextOccurrence(ev: SchedulerEvent): Date | null {
    const rep = ev.repeat!
    const d0 = parseISODate(ev.date)
    if (!d0) return null
    const until = rep.until ? parseISODate(rep.until) : null
    const interval = Math.max(rep.interval ?? 1, 1)
    const today = startOfDay(new Date())
    let d: Date
    if (rep.freq === 'daily') {
      const days = Math.max(0, Math.ceil((today.getTime() - d0.getTime()) / 86400_000 / interval) * interval)
      d = new Date(d0.getTime() + days * 86400_000)
    } else if (rep.freq === 'weekly') {
      const weeks = Math.max(0, Math.ceil((today.getTime() - d0.getTime()) / (7 * 86400_000) / interval) * interval)
      d = new Date(d0.getTime() + weeks * 7 * 86400_000)
    } else {
      const monthDiff = Math.max(
        0,
        today.getFullYear() * 12 + today.getMonth() - (d0.getFullYear() * 12 + d0.getMonth()),
      )
      const steps = Math.ceil(monthDiff / interval) * interval
      d = this.nextMonthly(
        // from 用 1 号构造：防「前一步月无锚定日」时 Date 规范化滚入下月、跳过目标发生月
        new Date(d0.getFullYear(), d0.getMonth() + steps - Math.max(interval, 1), 1),
        interval,
        d0.getDate(),
      )
      // nextMonthly 的 from 取「目标发生月前一步」，第一次调用即落在目标发生月（含短月跳过）
      if (d.getTime() < today.getTime()) d = this.nextMonthly(d, interval, d0.getDate())
    }
    if (d.getTime() < today.getTime()) return null
    if (until && d.getTime() > until.getTime()) return null
    return d
  }

  override disconnectedCallback(): void {
    for (const t of this.remindTimers.values()) clearTimeout(t)
    this.remindTimers.clear()
    super.disconnectedCallback()
  }

  private renderMonth(): void {
    const grid = this.gridEl
    if (!grid) return
    const locale = this.effectiveLocale()
    const weekStart = this.effectiveWeekStart()
    const today = this.todayTz()
    const anchor = this.viewDate
    if (this.titleEl) {
      this.titleEl.textContent = this.fmtTz(anchor, 'yyyy-MM')
    }
    grid.innerHTML = ''
    const cells = buildMonthCells(anchor, locale, weekStart)
    for (const cell of cells) {
      const dayEl = document.createElement('div')
      dayEl.className = 'day'
      dayEl.dataset.date = toISODate(cell.date)
      if (!isSameMonthSafe(cell.date, anchor)) dayEl.classList.add('outside')
      if (isSameDay(cell.date, today)) dayEl.classList.add('today')

      const iso = dayEl.dataset.date!
      // 日格本体为普通容器（防按钮嵌套）；日期数字是独立按钮，与事件芯片为兄弟而非嵌套
      const num = document.createElement('button')
      num.type = 'button'
      num.className = 'num'
      num.textContent = String(cell.date.getDate())
      num.setAttribute('aria-label', iso)
      num.addEventListener('click', () => {
        this.emit('day-click', { date: iso } satisfies SchedulerDayClickDetail)
      })
      dayEl.appendChild(num)

      const evs = this.eventsOn(iso)
      if (evs.length > 0) {
        const chips = document.createElement('span')
        chips.className = 'chips'
        for (const ev of evs.slice(0, 2)) chips.appendChild(this.renderChip(ev))
        if (evs.length > 2) {
          const more = document.createElement('button')
          more.type = 'button'
          more.className = 'more'

          more.textContent = this.t('scheduler.more', { count: evs.length - 2 })
          more.addEventListener('click', (e) => {
            e.stopPropagation()
            this.emit('day-click', { date: iso } satisfies SchedulerDayClickDetail)
          })
          chips.appendChild(more)
        }
        dayEl.appendChild(chips)
      }

      dayEl.addEventListener('click', (e) => {
        if (e.target === dayEl) this.emit('day-click', { date: iso } satisfies SchedulerDayClickDetail)
      })
      grid.appendChild(dayEl)
    }
  }

  private renderChip(ev: SchedulerEvent & { id: string }): HTMLButtonElement {
    const chip = document.createElement('button')
    chip.type = 'button'
    chip.className = 'chip'
    chip.textContent = ev.title
    if (ev.color) chip.style.setProperty('--chip-color', ev.color)
    chip.addEventListener('click', (e) => {
      e.stopPropagation()
      this.emit('event-click', { id: ev.id, event: { ...ev } } satisfies SchedulerEventClickDetail)
    })
    return chip
  }

  /** 当前周（按 first-day-of-week 对齐）的起始日 */
  private weekStartOf(d: Date): Date {
    const ws = this.effectiveWeekStart()
    const diff = (d.getDay() - ws + 7) % 7
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff)
  }

  /** 周/日时间轴视图：左侧时刻表 + 每列一天，事件按 start/end 绝对定位；无 start 归全天行 */
  private renderTimeView(): void {
    const tv = this.shadow.querySelector<HTMLElement>('[part="timeview"]')
    if (!tv) return
    const hourH = 48
    const startH = this.startHour()
    const endH = this.endHour()
    const locale = this.effectiveLocale()
    const today = this.todayTz()
    const days: Date[] = []
    if (this.view === 'week') {
      const ws = this.weekStartOf(this.viewDate)
      for (let i = 0; i < 7; i++) days.push(new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + i))
    } else {
      days.push(this.viewDate)
    }
    if (this.titleEl) {
      if (this.view === 'week') {
        const end = days[6]!
        this.titleEl.textContent = `${this.fmtTz(days[0]!, 'yyyy-MM-dd')} ~ ${this.fmtTz(end, 'MM-dd')}`
      } else {
        this.titleEl.textContent = this.fmtTz(days[0]!, 'yyyy-MM-dd')
      }
    }
    tv.innerHTML = ''
    tv.style.setProperty('--hour-h', `${hourH}px`)

    // band 行（列头 + 全天行）与 gutter 对齐：头部信息整体上移到独立带，gutter 与 track 从同一水平线起排，
    // 避免 col-head/allday 把 track 下推导致时刻刻度错位
    const spacer = document.createElement('div')
    spacer.className = 'band-spacer'
    tv.appendChild(spacer)

    const band = document.createElement('div')
    band.className = 'band'
    tv.appendChild(band)

    const gutter = document.createElement('div')
    gutter.className = 'gutter'
    for (let h = startH; h < endH; h++) {
      const span = document.createElement('span')
      span.textContent = `${String(h).padStart(2, '0')}:00`
      gutter.appendChild(span)
    }
    tv.appendChild(gutter)

    const cols = document.createElement('div')
    cols.className = 'cols'
    for (const d of days) {
      const iso = toISODate(d)
      const bandCol = document.createElement('div')
      bandCol.className = 'band-col'
      bandCol.dataset.date = iso
      if (isSameDay(d, today)) bandCol.classList.add('today')
      const head = document.createElement('div')
      head.className = 'col-head'
      head.textContent = this.fmtTz(d, 'MM-dd')
      bandCol.appendChild(head)

      const allDay = document.createElement('div')
      allDay.className = 'allday'
      const timed: Array<{ ev: SchedulerEvent & { id: string }; s: number; e: number }> = []
      for (const ev of this.eventsOn(iso)) {
        const s = parseTime(ev.start)
        if (s === null) {
          allDay.appendChild(this.renderChip(ev))
        } else {
          const e = parseTime(ev.end) ?? s + 60
          timed.push({ ev, s, e: Math.max(e, s + 15) })
        }
      }
      bandCol.appendChild(allDay)
      band.appendChild(bandCol)

      const col = document.createElement('div')
      col.className = 'col'
      col.dataset.date = iso
      if (isSameDay(d, today)) col.classList.add('today')

      const track = document.createElement('div')
      track.className = 'track'
      track.style.position = 'relative'
      track.style.height = `${(endH - startH) * hourH}px`
      for (const { ev, s, e } of timed) {
        track.appendChild(this.renderTimedEvent(ev, s, e, startH, hourH))
      }
      track.addEventListener('dragover', (e) => {
        if (!this.dragCtx) return
        e.preventDefault()
        this.setDropCol(col)
      })
      track.addEventListener('dragleave', () => {
        if (this.dropCol === col) this.setDropCol(null)
      })
      track.addEventListener('drop', (e) => {
        e.preventDefault()
        this.onTrackDrop(col, iso, e as DragEvent)
      })
      track.addEventListener('pointermove', (e) => this.onTrackPointerMove(track, iso, e))
      track.addEventListener('pointerup', () => this.onTrackPointerUp())
      track.addEventListener('pointercancel', () => {
        this.dragCtx = null
        this.setDropCol(null)
      })
      col.appendChild(track)
      cols.appendChild(col)
    }
    tv.appendChild(cols)
  }

  private setDropCol(col: HTMLElement | null): void {
    this.dropCol?.classList.remove('drop')
    this.dropCol = col
    col?.classList.add('drop')
  }

  private renderTimedEvent(
    ev: SchedulerEvent & { id: string },
    s: number,
    e: number,
    startH: number,
    hourH: number,
  ): HTMLButtonElement {
    const el = document.createElement('button')
    el.type = 'button'
    el.className = 'event'
    el.dataset.id = ev.id
    el.draggable = true
    el.textContent = ev.title
    if (ev.color) el.style.setProperty('--chip-color', ev.color)
    el.style.top = `${((s - startH * 60) / 60) * hourH}px`
    el.style.height = `${Math.max(((e - s) / 60) * hourH, 16)}px`
    el.addEventListener('click', (evt) => {
      evt.stopPropagation()
      this.emit('event-click', { id: ev.id, event: { ...ev } } satisfies SchedulerEventClickDetail)
    })
    el.addEventListener('dragstart', (evt) => {
      this.dragCtx = { id: ev.id, mode: 'move', originStart: s, originEnd: e }
      evt.dataTransfer?.setData('text/plain', ev.id)
      if (evt.dataTransfer) evt.dataTransfer.effectAllowed = 'move'
    })
    el.addEventListener('dragend', () => {
      this.dragCtx = null
      this.setDropCol(null)
    })
    // 底缘缩放手柄：pointer 拖拽改 end
    const grip = document.createElement('span')
    grip.className = 'resize'
    grip.addEventListener('pointerdown', (evt) => {
      evt.stopPropagation()
      evt.preventDefault()
      this.dragCtx = { id: ev.id, mode: 'resize', originStart: s, originEnd: e }
      ;(evt.currentTarget as HTMLElement).setPointerCapture(evt.pointerId)
      // 记在 track 的 pointermove/up 上结算（手柄本身即目标，捕获后事件流同样落在其祖先 track）
    })
    el.appendChild(grip)
    return el
  }

  /** 拖拽移动落定：按落点列与纵向位置改 date + start（保持时长——先按时长约束落点，避免 23:30 截断） */
  private onTrackDrop(col: HTMLElement, iso: string, e: DragEvent): void {
    const ctx = this.dragCtx
    this.dragCtx = null
    this.setDropCol(null)
    if (!ctx || ctx.mode !== 'move') return
    const ev = this._events.find((x) => x.id === ctx.id)
    if (!ev) return
    const hourH = 48
    const track = col.querySelector<HTMLElement>('.track')
    const rect = track?.getBoundingClientRect()
    const startH = this.startHour()
    const duration = ctx.originEnd - ctx.originStart
    let minutes = startH * 60 + (rect ? ((e.clientY - rect.top) / hourH) * 60 : 0)
    minutes = Math.round(minutes / 30) * 30
    // 先按时长约束落点：start+duration 不得超过 24:00（保时长优先于落点精度）
    minutes = Math.max(0, Math.min(minutes, 24 * 60 - duration))
    const endMin = minutes + duration
    const start = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
    const end = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`
    this.updateEvent(ctx.id, { date: iso, start, end })
  }

  /** 缩放进行：只更新被拖块的视觉高度（不重建 DOM），把新 end 记在 dragCtx，pointerup 才一次性回写+派发 */
  private onTrackPointerMove(track: HTMLElement, _iso: string, e: PointerEvent): void {
    const ctx = this.dragCtx
    if (!ctx || ctx.mode !== 'resize') return
    const hourH = 48
    const rect = track.getBoundingClientRect()
    const startH = this.startHour()
    let end = startH * 60 + ((e.clientY - rect.top) / hourH) * 60
    end = Math.round(end / 15) * 15
    end = Math.max(ctx.originStart + 15, Math.min(end, 24 * 60))
    ctx.newEnd = `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`
    const block = track.querySelector<HTMLElement>(`.event[data-id="${ctx.id}"]`)
    if (block) block.style.height = `${Math.max(((end - ctx.originStart) / 60) * hourH, 16)}px`
  }

  /** 缩放落定：一次性回写 end（update → 单次重建）并派发 oas-events-change */
  private onTrackPointerUp(): void {
    const ctx = this.dragCtx
    this.dragCtx = null
    if (!ctx || ctx.mode !== 'resize' || !ctx.newEnd) return
    this.updateEvent(ctx.id, { end: ctx.newEnd })
  }
}

function isSameMonthSafe(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}
