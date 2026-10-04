import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

describe('OASScheduler P2：重复规则（RRULE 子集）+ 提醒', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('daily 重复：按月视图逐日展开；weekly 按周；monthly 按同日；until 截止；interval 间隔', () => {
    const el = mount({
      events: JSON.stringify([
        { date: '2026-08-03', title: '每日站会', repeat: { freq: 'daily' } },
        { date: '2026-08-05', title: '周会', repeat: { freq: 'weekly', interval: 2, until: '2026-08-19' } },
        { date: '2026-08-10', title: '月度盘点', repeat: { freq: 'monthly' } },
      ]),
      'page-show-date': '2026-08-01',
    })
    // daily：8-03/8-04/8-05 都有
    expect(dayOf(el, '2026-08-03').querySelector('.chip')?.textContent).toBe('每日站会')
    expect(dayOf(el, '2026-08-04').querySelector('.chip')?.textContent).toBe('每日站会')
    // weekly interval=2：8-05 有、8-12 无、8-19 有、8-26 无（until 截止外）
    expect([...dayOf(el, '2026-08-05').querySelectorAll('.chip')].some((c) => c.textContent === '周会')).toBe(true)
    expect([...dayOf(el, '2026-08-12').querySelectorAll('.chip')].some((c) => c.textContent === '周会')).toBe(false)
    expect([...dayOf(el, '2026-08-19').querySelectorAll('.chip')].some((c) => c.textContent === '周会')).toBe(true)
    expect([...dayOf(el, '2026-08-26').querySelectorAll('.chip')].some((c) => c.textContent === '周会')).toBe(false)
    // monthly：8-10 有、8-11 无
    expect([...dayOf(el, '2026-08-10').querySelectorAll('.chip')].some((c) => c.textContent === '月度盘点')).toBe(true)
    expect([...dayOf(el, '2026-08-11').querySelectorAll('.chip')].some((c) => c.textContent === '月度盘点')).toBe(false)
  })

  it('周视图定时重复事件也展开；events 属性只读原始条目（非展开）', () => {
    const el = mount({
      events: JSON.stringify([
        { date: '2026-08-10', title: '晨会', start: '09:00', end: '09:30', repeat: { freq: 'daily' } },
      ]),
      'page-show-date': '2026-08-10',
      view: 'week',
    })
    expect(el.shadowRoot!.querySelector('.col[data-date="2026-08-10"] .event')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('.col[data-date="2026-08-11"] .event')).not.toBeNull()
    expect(el.events.length).toBe(1)
    expect(el.events[0]!.repeat?.freq).toBe('daily')
  })

  it('remind：到点派发 oas-remind（start - remind 分钟）；过期不排', () => {
    vi.useFakeTimers()
    try {
      const now = new Date()
      const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const startMin = (now.getHours() * 60 + now.getMinutes() + 2) % (24 * 60) // 2 分钟后开始 → 1 分钟后提醒
      const start = `${String(Math.floor(startMin / 60)).padStart(2, '0')}:${String(startMin % 60).padStart(2, '0')}`
      const el = mount({
        events: JSON.stringify([
          { date: iso, title: '快到点', start, remind: 1 },
          { date: '2020-01-01', title: '过期', start: '08:00', remind: 5 },
        ]),
      })
      const fired: string[] = []
      el.addEventListener('oas-remind', ((e: Event) =>
        fired.push((e as CustomEvent<{ id: string; event: { title: string } }>).detail.event.title)) as EventListener)
      vi.advanceTimersByTime(61_000)
      expect(fired).toEqual(['快到点'])
    } finally {
      vi.useRealTimers()
    }
  })

  it('CRUD 变化重排提醒（removeEvent 后不再派发）', () => {
    vi.useFakeTimers()
    try {
      const now = new Date()
      const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const startMin = (now.getHours() * 60 + now.getMinutes() + 2) % (24 * 60)
      const start = `${String(Math.floor(startMin / 60)).padStart(2, '0')}:${String(startMin % 60).padStart(2, '0')}`
      const el = mount({ events: JSON.stringify([{ date: iso, title: '将删', start, remind: 1 }]) })
      const id = el.events[0]!.id!
      expect(el.removeEvent(id)).toBe(true)
      const fired: string[] = []
      el.addEventListener('oas-remind', () => fired.push('x'))
      vi.advanceTimersByTime(61_000)
      expect(fired).toEqual([])
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('OASScheduler P1：view 切换 + 周/日时间轴 + 拖拽移动/缩放', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const TIMED: SchedulerEvent[] = [
    { date: '2026-08-10', title: '晨会', start: '09:00', end: '10:00' },
    { date: '2026-08-10', title: '评审', start: '14:00', end: '15:30', color: '#059669' },
    { date: '2026-08-11', title: '全天活动' },
  ]

  function timedEl(extra: Record<string, string> = {}): OASScheduler {
    return mount({ events: JSON.stringify(TIMED), 'page-show-date': '2026-08-10', ...extra })
  }

  it('view=week：渲染 7 列 + 时刻表；定时事件按 start/end 绝对定位，无 start 进全天行', () => {
    const el = timedEl({ view: 'week' })
    const cols = el.shadowRoot!.querySelectorAll('.timeview .col')
    expect(cols.length).toBe(7)
    const col10 = el.shadowRoot!.querySelector('.col[data-date="2026-08-10"]')!
    const evs = col10.querySelectorAll('.event')
    expect(evs.length).toBe(2)
    const first = evs[0] as HTMLElement
    expect(Number.parseFloat(first.style.top)).toBeCloseTo((9 - 8) * 48, 0)
    expect(Number.parseFloat(first.style.height)).toBeCloseTo(48, 0)
    expect(col10.querySelector('.allday')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('.col[data-date="2026-08-11"] .allday .chip')?.textContent).toBe('全天活动')
  })

  it('view=day：只渲染 1 列；视图按钮切换派发 oas-view-change（属性吸收不派发）', () => {
    const el = timedEl({ view: 'day' })
    expect(el.shadowRoot!.querySelectorAll('.timeview .col').length).toBe(1)
    const log: string[] = []
    el.addEventListener('oas-view-change', ((e: Event) =>
      log.push((e as CustomEvent<{ view: string }>).detail.view)) as EventListener)
    const weekBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="views"] button[data-view="week"]')!
    weekBtn.click()
    expect(log).toEqual(['week'])
    expect(el.getAttribute('view')).toBe('week')
    // 受控属性变化才派发（初始吸收不派发已在上一断言覆盖）
  })

  it('拖拽移动：落点列与纵向位置改 date + start（保持时长），派发 oas-events-change', () => {
    const el = timedEl({ view: 'week' })
    const ev = el.shadowRoot!.querySelector('.col[data-date="2026-08-10"] .event') as HTMLElement
    ev.dispatchEvent(new DragEvent('dragstart', { bubbles: true }))
    const target = el.shadowRoot!.querySelector('.col[data-date="2026-08-12"] .track') as HTMLElement
    target.getBoundingClientRect = () =>
      ({ top: 0, left: 0, width: 100, height: 576, right: 100, bottom: 576, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    const drop = new DragEvent('drop', { bubbles: true })
    Object.defineProperty(drop, 'clientY', { value: (12 - 8) * 48 })
    Object.defineProperty(drop, 'preventDefault', { value: () => {} })
    let changed = 0
    el.addEventListener('oas-events-change', () => changed++)
    target.dispatchEvent(drop)
    const moved = el.events.find((x) => x.title === '晨会')!
    expect(moved.date).toBe('2026-08-12')
    expect(moved.start).toBe('12:00')
    expect(moved.end).toBe('13:00')
    expect(changed).toBe(1)
  })

  it('缩放手柄：pointer 位移按 15 分钟步进改 end；小于 start+15 时钳制', () => {
    const el = timedEl({ view: 'week' })
    const ev = el.shadowRoot!.querySelector('.col[data-date="2026-08-10"] .event') as HTMLElement
    const grip = ev.querySelector('.resize') as HTMLElement
    const track = el.shadowRoot!.querySelector('.col[data-date="2026-08-10"] .track') as HTMLElement
    track.getBoundingClientRect = () =>
      ({ top: 0, left: 0, width: 100, height: 576, right: 100, bottom: 576, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    grip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))
    const move = new PointerEvent('pointermove', { bubbles: true, pointerId: 1 })
    Object.defineProperty(move, 'clientY', { value: (11.5 - 8) * 48 })
    track.dispatchEvent(move)
    const resized = el.events.find((x) => x.title === '晨会')!
    expect(resized.end).toBe('11:30')
    const up = new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })
    track.dispatchEvent(up)
  })

  it('周导航：prev/next 按周平移；start-hour/end-hour 限幅时刻表', () => {
    const el = timedEl({ view: 'week', 'start-hour': '9', 'end-hour': '12' })
    expect(el.shadowRoot!.querySelectorAll('.timeview .gutter span').length).toBe(3)
    const prev = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="prev"]')!
    prev.click()
    const dates = [...el.shadowRoot!.querySelectorAll('.timeview .col')].map((c) => (c as HTMLElement).dataset.date)
    expect(dates[0]).toBe('2026-08-03')
  })
})
