import { OASElement } from '@oas-ui/core'
import {
  addMonths,
  buildMonthCells,
  formatToken,
  getWeekStart,
  isSameDay,
  parseISODate,
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
  gap: 0;
}
.header .views button {
  border-radius: 0;
}
.header .views button:first-child {
  border-radius: var(--oas-radius-sm) 0 0 var(--oas-radius-sm);
}
.header .views button:last-child {
  border-radius: 0 var(--oas-radius-sm) var(--oas-radius-sm) 0;
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
.timeview .col-head {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary-strong);
  text-align: center;
  background: var(--oas-color-bg);
  border-bottom: 1px solid var(--oas-color-border);
}
.timeview .col.today .col-head {
  color: var(--oas-color-primary);
  font-weight: 600;
}
.timeview .allday {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: var(--oas-space-1);
  border-bottom: 1px solid var(--oas-color-border);
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

export type SchedulerView = 'month' | 'week' | 'day'

/** 'HH:mm' → 分钟数；非法返回 null */
function parseTime(s: string | undefined): number | null {
  if (typeof s !== 'string' || !/^\d{1,2}:\d{2}$/.test(s)) return null
  const [h, m] = s.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
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
    if (typeof it.start === 'string' && it.start !== '') ev.start = it.start
    if (typeof it.end === 'string' && it.end !== '') ev.end = it.end
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
    return ['events', 'page-show-date', 'first-day-of-week', 'locale', 'view', 'start-hour', 'end-hour']
  }

  private _events: Array<SchedulerEvent & { id: string }> = []
  private _eventsAttrCache = ''
  private nextId = 1
  private viewDate: Date = startOfDay(new Date())
  private lastPageAnchor = ''
  private gridEl: HTMLElement | null = null
  private titleEl: HTMLElement | null = null
  private view: SchedulerView = 'month'
  private lastView = ''
  private dragCtx: { id: string; mode: 'move' | 'resize'; originStart: number; originEnd: number } | null = null
  private dropCol: HTMLElement | null = null

  /**
   * @apiProperty 日程事件（公开读/写通道）：读为数组拷贝（含自动分配的 id）；写为程序性赋值
   * （序列化进受控 `events` 属性并重渲染、派发 oas-events-change）。
   */
  get events(): SchedulerEvent[] {
    return this._events.map((e) => ({ ...e }))
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
    const [item] = this.normalizeWithIds(sanitizeEvents([ev]))
    if (!item) return ''
    this._events = [...this._events, item]
    this.syncEventsAttr()
    this.emitEventsChange()
    return item.id
  }

  /** 按 id 更新事件（浅合并 patch）；找不到返回 false */
  updateEvent(id: string, patch: Partial<SchedulerEvent>): boolean {
    const idx = this._events.findIndex((e) => e.id === id)
    if (idx < 0) return false
    const merged = { ...this._events[idx]!, ...patch, id }
    this._events = [...this._events.slice(0, idx), merged, ...this._events.slice(idx + 1)]
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

  private normalizeWithIds(v: SchedulerEvent[]): Array<SchedulerEvent & { id: string }> {
    return v.map((e) => ({ ...e, id: e.id && e.id !== '' ? e.id : this.allocId() }))
  }

  private allocId(): string {
    let id = `ev${this.nextId++}`
    while (this._events.some((e) => e.id === id)) id = `ev${this.nextId++}`
    return id
  }

  private syncEventsAttr(): void {
    this._eventsAttrCache = JSON.stringify(this._events)
    this.setAttribute('events', this._eventsAttrCache)
    this.update()
  }

  private emitEventsChange(): void {
    const detail: SchedulerEventsChangeDetail = { events: this.events }
    this.emit('events-change', detail)
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
    return 'zh-CN'
  }

  private effectiveWeekStart(): number {
    const raw = this.getAttr('first-day-of-week', '')
    if (/^[0-6]$/.test(raw)) return Number(raw)
    return getWeekStart(this.effectiveLocale())
  }

  private startHour(): number {
    const h = Number(this.getAttr('start-hour', '8'))
    return Number.isFinite(h) && h >= 0 && h <= 23 ? h : 8
  }

  private endHour(): number {
    const h = Number(this.getAttr('end-hour', '20'))
    return Number.isFinite(h) && h > this.startHour() && h <= 24 ? h : 20
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
    const isTime = this.view !== 'month'
    for (const p of monthParts) p.hidden = isTime
    if (timeview) timeview.hidden = !isTime
    if (isTime) this.renderTimeView()
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
          <button type="button" class="prev" part="prev" aria-label="prev">‹</button>
          <button type="button" class="next" part="next" aria-label="next">›</button>
          <div class="title" part="title" aria-live="polite"></div>
          <button type="button" class="today" part="today"></button>
          <span class="views" part="views">
            <button type="button" data-view="month"></button>
            <button type="button" data-view="week"></button>
            <button type="button" data-view="day"></button>
          </span>
        </div>
        <div class="weekdays" part="weekdays"></div>
        <div class="grid" part="grid" role="group"></div>
        <div class="timeview" part="timeview" hidden></div>
      </div>
    `
  }

  private bind(): void {
    this.gridEl = this.shadow.querySelector<HTMLElement>('[part="grid"]')
    this.titleEl = this.shadow.querySelector<HTMLElement>('[part="title"]')
    this.shadow.querySelector<HTMLElement>('[part="prev"]')?.addEventListener('click', () => this.navigate(-1))
    this.shadow.querySelector<HTMLElement>('[part="next"]')?.addEventListener('click', () => this.navigate(1))
    this.shadow.querySelector<HTMLElement>('[part="today"]')?.addEventListener('click', () => {
      this.viewDate = startOfDay(new Date())
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
      this.view = ['month', 'week', 'day'].includes(viewAttr) ? viewAttr : 'month'
    }
    // 面板月锚点：page-show-date 变化时重锚定（受控），未变不打断浏览
    const rawPage = this.getAttr('page-show-date', '')
    if (rawPage !== this.lastPageAnchor) {
      this.lastPageAnchor = rawPage
      if (rawPage) {
        const p = parseISODate(rawPage)
        // 月视图锚到当月 1 号；周/日视图锚到当天（更贴合「展示包含该日的区间」预期）
        if (p) this.viewDate = this.view === 'month' ? new Date(p.getFullYear(), p.getMonth(), 1) : startOfDay(p)
      }
    }

    const todayBtn = this.shadow.querySelector<HTMLElement>('[part="today"]')
    if (todayBtn) todayBtn.textContent = this.t('scheduler.today')
    for (const btn of this.shadow.querySelectorAll<HTMLButtonElement>('[part="views"] button')) {
      btn.classList.toggle('on', btn.dataset.view === this.view)
      const v = btn.dataset.view as SchedulerView
      btn.textContent = this.t(`scheduler.view${v === 'month' ? 'Month' : v === 'week' ? 'Week' : 'Day'}`)
    }
    this.renderCurrentView()
  }

  private navigate(delta: number): void {
    if (this.view === 'month') this.viewDate = addMonths(this.viewDate, delta)
    else if (this.view === 'week') this.viewDate = new Date(this.viewDate.getTime() + delta * 7 * 86400_000)
    else this.viewDate = new Date(this.viewDate.getTime() + delta * 86400_000)
    this.renderCurrentView()
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

  /** 提醒调度：每个带 remind 的事件在「start - remind 分钟」到点派发 oas-remind */
  private remindTimers = new Map<string, number>()

  private scheduleReminders(): void {
    for (const t of this.remindTimers.values()) clearTimeout(t)
    this.remindTimers.clear()
    const now = Date.now()
    for (const ev of this._events) {
      if (ev.remind === undefined || ev.remind < 0) continue
      const at = this.remindAt(ev)
      if (at === null || at <= now) continue
      const id = ev.id
      const timer = window.setTimeout(() => {
        this.remindTimers.delete(id)
        this.emit('remind', { id, event: { ...ev } } satisfies SchedulerRemindDetail)
      }, at - now)
      this.remindTimers.set(id, timer)
    }
  }

  private remindAt(ev: SchedulerEvent): number | null {
    const d = parseISODate(ev.date)
    if (!d) return null
    const start = parseTime(ev.start) ?? 0
    return d.getTime() + start * 60_000 - ev.remind! * 60_000
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
    const today = startOfDay(new Date())
    if (this.titleEl) {
      this.titleEl.textContent = formatToken(this.viewDate, 'yyyy-MM', locale)
    }
    grid.innerHTML = ''
    const cells = buildMonthCells(this.viewDate, locale, weekStart)
    for (const cell of cells) {
      const dayEl = document.createElement('div')
      dayEl.className = 'day'
      dayEl.dataset.date = toISODate(cell.date)
      if (!isSameMonthSafe(cell.date, this.viewDate)) dayEl.classList.add('outside')
      if (isSameDay(cell.date, today)) dayEl.classList.add('today')

      const iso = dayEl.dataset.date!
      // 日格本体为普通容器（防按钮嵌套）；日期数字是独立按钮，与事件芯片为兄弟而非嵌套
      const num = document.createElement('button')
      num.type = 'button'
      num.className = 'num'
      num.textContent = String(cell.date.getDate())
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
    const today = startOfDay(new Date())
    const days: Date[] = []
    if (this.view === 'week') {
      const ws = this.weekStartOf(this.viewDate)
      for (let i = 0; i < 7; i++) days.push(new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + i))
    } else {
      days.push(startOfDay(this.viewDate))
    }
    if (this.titleEl) {
      if (this.view === 'week') {
        const end = days[6]!
        this.titleEl.textContent = `${formatToken(days[0]!, 'yyyy-MM-dd', locale)} ~ ${formatToken(end, 'MM-dd', locale)}`
      } else {
        this.titleEl.textContent = formatToken(days[0]!, 'yyyy-MM-dd', locale)
      }
    }
    tv.innerHTML = ''
    tv.style.setProperty('--hour-h', `${hourH}px`)

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
      const col = document.createElement('div')
      col.className = 'col'
      col.dataset.date = iso
      if (isSameDay(d, today)) col.classList.add('today')
      const head = document.createElement('div')
      head.className = 'col-head'
      head.textContent = formatToken(d, 'MM-dd', locale)
      col.appendChild(head)

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
      col.appendChild(allDay)

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

  /** 拖拽移动落定：按落点列与纵向位置改 date + start（保持时长） */
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
    let minutes = startH * 60 + (rect ? ((e.clientY - rect.top) / hourH) * 60 : 0)
    minutes = Math.round(minutes / 30) * 30
    minutes = Math.max(0, Math.min(minutes, 23 * 60 + 30))
    const duration = ctx.originEnd - ctx.originStart
    const start = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
    const endMin = Math.min(minutes + duration, 24 * 60)
    const end = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`
    this.updateEvent(ctx.id, { date: iso, start, end })
  }

  /** 缩放进行：pointer 捕获期间按纵向位移改 end（15 分钟步进） */
  private onTrackPointerMove(track: HTMLElement, iso: string, e: PointerEvent): void {
    const ctx = this.dragCtx
    if (!ctx || ctx.mode !== 'resize') return
    const hourH = 48
    const rect = track.getBoundingClientRect()
    const startH = this.startHour()
    let end = startH * 60 + ((e.clientY - rect.top) / hourH) * 60
    end = Math.round(end / 15) * 15
    end = Math.max(ctx.originStart + 15, Math.min(end, 24 * 60))
    const ev = this._events.find((x) => x.id === ctx.id)
    if (!ev) return
    ev.end = `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`
    ev.date = iso
    this.syncEventsAttr()
  }

  private onTrackPointerUp(): void {
    if (this.dragCtx?.mode === 'resize') {
      const id = this.dragCtx.id
      this.dragCtx = null
    }
    this.dragCtx = null
  }
}

function isSameMonthSafe(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}
