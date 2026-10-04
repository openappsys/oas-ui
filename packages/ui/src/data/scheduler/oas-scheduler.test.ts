import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASScheduler } from './index.js'
import type { SchedulerEvent } from './index.js'

function mount(attrs: Record<string, string> = {}): OASScheduler {
  const el = new OASScheduler()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function days(el: OASScheduler): HTMLButtonElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.day')]
}

function dayOf(el: OASScheduler, iso: string): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>(`.day[data-date="${iso}"]`)!
}

const EVENTS: SchedulerEvent[] = [
  { date: '2026-08-08', title: '发布', color: '#ff0000' },
  { date: '2026-08-08', title: '评审' },
  { date: '2026-08-22', title: 'A' },
  { date: '2026-08-22', title: 'B' },
  { date: '2026-08-22', title: 'C' },
]

describe('OASScheduler 月视图 + events CRUD', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('月视图渲染 42 日格；当日事件渲染芯片（标题+色条），>2 合并 +N', () => {
    const el = mount({ events: JSON.stringify(EVENTS), 'page-show-date': '2026-08-01' })
    expect(days(el).length).toBe(42)
    const d8 = dayOf(el, '2026-08-08')
    const chips = d8.querySelectorAll('.chip')
    expect(chips.length).toBe(2)
    expect(chips[0]!.textContent).toBe('发布')
    expect((chips[0] as HTMLElement).style.getPropertyValue('--chip-color')).toBe('#ff0000')
    const d22 = dayOf(el, '2026-08-22')
    expect(d22.querySelectorAll('.chip').length).toBe(2)
    expect(d22.querySelector('.more')?.textContent).toBe('+1 条')
  })

  it('property get/set events：读为拷贝；写同步 attribute + 派发 oas-events-change + 重渲染', () => {
    const el = mount({ 'page-show-date': '2026-08-01' })
    let changed = 0
    el.addEventListener('oas-events-change', () => changed++)
    el.events = [{ date: '2026-08-10', title: 'x' }]
    expect(changed).toBe(1)
    expect(el.getAttribute('events')).toContain('2026-08-10')
    expect(dayOf(el, '2026-08-10').querySelectorAll('.chip').length).toBe(1)
    const read = el.events
    expect(read.length).toBe(1)
    expect(read[0]!.id, '缺省 id 自动分配').toBeTruthy()
    expect(read).not.toBe((el as unknown as { _events: unknown[] })._events)
  })

  it('addEvent/updateEvent/removeEvent：CRUD 各派发一次 events-change 并即时生效', () => {
    const el = mount({ 'page-show-date': '2026-08-01' })
    const seen: string[] = []
    el.addEventListener('oas-events-change', () => seen.push('c'))

    const id = el.addEvent({ date: '2026-08-11', title: '新增' })
    expect(id).toBeTruthy()
    expect(dayOf(el, '2026-08-11').querySelector('.chip')?.textContent).toBe('新增')

    expect(el.updateEvent(id, { title: '改名', date: '2026-08-12' })).toBe(true)
    expect(dayOf(el, '2026-08-11').querySelector('.chip')).toBeNull()
    expect(dayOf(el, '2026-08-12').querySelector('.chip')?.textContent).toBe('改名')
    expect(el.updateEvent('nope', { title: 'x' })).toBe(false)

    expect(el.removeEvent(id)).toBe(true)
    expect(dayOf(el, '2026-08-12').querySelector('.chip')).toBeNull()
    expect(el.removeEvent(id)).toBe(false)
    expect(seen.length).toBe(3)
  })

  it('点事件芯片派发 oas-event-click（带 id 与 event，且不触发 day-click）；点空白日格派发 oas-day-click', () => {
    const el = mount({ events: JSON.stringify(EVENTS.slice(0, 1)), 'page-show-date': '2026-08-01' })
    const log: string[] = []
    el.addEventListener('oas-event-click', ((e: CustomEvent<{ id: string; event: SchedulerEvent }>) => {
      log.push(`ev:${e.detail.id}:${e.detail.event.title}`)
    }) as EventListener)
    el.addEventListener('oas-day-click', ((e: CustomEvent<{ date: string }>) => {
      log.push(`day:${e.detail.date}`)
    }) as EventListener)

    const d8 = dayOf(el, '2026-08-08')
    d8.querySelector<HTMLButtonElement>('.chip')!.click()
    expect(log.filter((l) => l.startsWith('ev:')).length).toBe(1)
    expect(log.some((l) => l.startsWith('day:'))).toBe(false)

    dayOf(el, '2026-08-15').click()
    expect(log.some((l) => l === 'day:2026-08-15')).toBe(true)
  })

  it('page-show-date 受控锚定：变化才重锚定面板月；无效/未变不打断', () => {
    const el = mount({ 'page-show-date': '2026-08-01' })
    expect(el.shadowRoot!.querySelector('[part="title"]')?.textContent).toContain('2026')
    expect(el.shadowRoot!.querySelector('[part="title"]')?.textContent).toContain('08')
    el.setAttribute('page-show-date', '2026-12-01')
    expect(el.shadowRoot!.querySelector('[part="title"]')?.textContent).toContain('12')
    el.setAttribute('page-show-date', 'bad')
    expect(el.shadowRoot!.querySelector('[part="title"]')?.textContent).toContain('12')
  })

  it('无效 events 入参被清洗（坏日期/空标题/非对象），不渲染、不炸', () => {
    const el = mount({
      events: JSON.stringify([
        { date: 'bad', title: 'x' },
        { date: '2026-08-09', title: '' },
        'junk',
        { date: '2026-08-09', title: '合法' },
      ]),
      'page-show-date': '2026-08-01',
    })
    expect(dayOf(el, '2026-08-09').querySelectorAll('.chip').length).toBe(1)
    expect(el.events.length).toBe(1)
  })
})
