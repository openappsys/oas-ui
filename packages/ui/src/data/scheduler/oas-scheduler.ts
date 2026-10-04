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
    out.push(ev)
  }
  return out
}

export class OASScheduler extends OASElement {
  static override get observedAttributes(): string[] {
    return ['events', 'page-show-date', 'first-day-of-week', 'locale']
  }

  private _events: Array<SchedulerEvent & { id: string }> = []
  private _eventsAttrCache = ''
  private nextId = 1
  private viewDate: Date = startOfDay(new Date())
  private lastPageAnchor = ''
  private gridEl: HTMLElement | null = null
  private titleEl: HTMLElement | null = null

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

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="calendar" part="calendar">
        <div class="header" part="header">
          <button type="button" class="prev" part="prev" aria-label="prev">‹</button>
          <button type="button" class="next" part="next" aria-label="next">›</button>
          <div class="title" part="title" aria-live="polite"></div>
          <button type="button" class="today" part="today"></button>
        </div>
        <div class="weekdays" part="weekdays"></div>
        <div class="grid" part="grid" role="group"></div>
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
      this.renderMonth()
    })
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
    // 面板月锚点：page-show-date 变化时重锚定（受控），未变不打断浏览
    const rawPage = this.getAttr('page-show-date', '')
    if (rawPage !== this.lastPageAnchor) {
      this.lastPageAnchor = rawPage
      if (rawPage) {
        const p = parseISODate(rawPage)
        if (p) this.viewDate = new Date(p.getFullYear(), p.getMonth(), 1)
      }
    }

    const todayBtn = this.shadow.querySelector<HTMLElement>('[part="today"]')
    if (todayBtn) todayBtn.textContent = this.t('scheduler.today')
    this.renderWeekdays()
    this.renderMonth()
  }

  private navigate(delta: number): void {
    this.viewDate = addMonths(this.viewDate, delta)
    this.renderMonth()
  }

  private renderWeekdays(): void {
    const el = this.shadow.querySelector<HTMLElement>('[part="weekdays"]')
    if (!el) return
    const labels = weekdayLabels(this.effectiveLocale(), this.effectiveWeekStart())
    el.innerHTML = labels.map((l) => `<span>${l}</span>`).join('')
  }

  private eventsOn(iso: string): Array<SchedulerEvent & { id: string }> {
    return this._events.filter((e) => e.date === iso)
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
}

function isSameMonthSafe(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}
