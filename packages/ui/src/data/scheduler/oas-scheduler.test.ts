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

describe('OASScheduler 终轮修复回归（F1/F2/F3/F4）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('F1：setter 读→回写 id 稳定；受控 attribute 更新 id 稳定', () => {
    const el = mount({ 'page-show-date': '2026-08-01' })
    el.events = [{ date: '2026-08-10', title: 'a', id: 'a' }]
    expect(el.events[0]!.id).toBe('a')
    el.events = el.events
    expect(el.events[0]!.id, 'setter 回写不得改名').toBe('a')
    el.events = [...el.events, { date: '2026-08-11', title: 'b', id: 'b' }]
    expect(el.events.map((e) => e.id)).toEqual(['a', 'b'])
    el.setAttribute('events', JSON.stringify([{ date: '2026-08-10', title: 'a2', id: 'a' }]))
    expect(el.events[0]!.id, '受控 attribute 更新不得改名').toBe('a')
    expect(el.events[0]!.title).toBe('a2')
  })

  it('F4：同批重复显式 id 自动避让', () => {
    const el = mount({ 'page-show-date': '2026-08-01' })
    el.events = [
      { date: '2026-08-10', title: 'a', id: 'x' },
      { date: '2026-08-11', title: 'b', id: 'x' },
    ]
    const ids = el.events.map((e) => e.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('F2：America/New_York 时区 month 标题当月正确、day 列与 page-show-date 一致', () => {
    const el = mount({ timezone: 'America/New_York', 'page-show-date': '2026-08-10' })
    const title = el.shadowRoot!.querySelector('[part="title"]')!.textContent ?? ''
    expect(title, 'month 标题应为 2026-08 而非回退 2026-07').toContain('2026')
    expect(title).toContain('08')
    const day = mount({ timezone: 'America/New_York', 'page-show-date': '2026-08-10', view: 'day' })
    expect(day.shadowRoot!.querySelector<HTMLElement>('.col')?.dataset.date).toBe('2026-08-10')
    expect(day.shadowRoot!.querySelector('.col-head')?.textContent).toContain('08-10')
  })

  it('F3：monthly day-31 提醒跳过短月落 3-31（非 2-28）；当天提醒已过推进仍保锚定日', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-01-31T10:00:00'))
      const el = mount({
        events: JSON.stringify([
          { date: '2026-01-31', title: '月末', start: '09:00', remind: 10, repeat: { freq: 'monthly' } },
        ]),
      })
      const me = el as unknown as { remindAt(ev: unknown): number | null }
      const at = me.remindAt(el.events[0])
      expect(at).not.toBeNull()
      const when = new Date(at!)
      // 2 月无 31 号：应跳过 2 月落 3-31（而非幻影 2-28）
      expect(when.getMonth()).toBe(2)
      expect(when.getDate()).toBe(31)
    } finally {
      vi.useRealTimers()
    }
  })

  it('C-1：monthly day-31 的 nextOccurrence 在「中间月」不漏最近发生月（from 用 1 号构造防漂移）', () => {
    vi.useFakeTimers()
    try {
      for (const [today, expectDate] of [
        ['2026-03-20', '2026-03-31'],
        ['2026-05-10', '2026-05-31'],
        ['2026-10-15', '2026-10-31'],
        ['2026-12-01', '2026-12-31'],
      ] as const) {
        vi.setSystemTime(new Date(`${today}T08:00:00`))
        const el = mount({
          events: JSON.stringify([
            { date: '2026-01-31', title: '月末', start: '09:00', remind: 10, repeat: { freq: 'monthly' } },
          ]),
        })
        const me = el as unknown as { remindAt(ev: unknown): number | null }
        const at = me.remindAt(el.events[0])
        const when = new Date(at!)
        expect(
          `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}`,
          `${today} → ${expectDate}`,
        ).toBe(expectDate)
      }
    } finally {
      vi.useRealTimers()
    }
  })

  it('I-1：timezone 下「今天」按钮锚 todayTz（跨月差一天时点按不跳整月、today 高亮不丢）', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-09-01T02:00:00')) // 宿主 +08:00；NY 当天为 2026-08-31
      const el = mount({ timezone: 'America/New_York' })
      const todayBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="today"]')!
      todayBtn.click()
      const title = el.shadowRoot!.querySelector('[part="title"]')!.textContent ?? ''
      expect(title, '点今天应锚 NY 的 2026-08 而非宿主 2026-09').toContain('08')
      expect(title).not.toContain('09')
      expect(el.shadowRoot!.querySelector('.day.today'), 'today 高亮不丢').not.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('OASScheduler review 修复回归（C1/I1/I2/I4/I5/I-5/I-6/I-7/I-1）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('C1：远期事件的 remind 不在挂载瞬间误触发（setTimeout 溢出分段重排）', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-01-01T00:00:00'))
      const el = mount({ events: JSON.stringify([{ date: '2026-03-01', title: '远期', start: '09:00', remind: 10 }]) })
      const fired: string[] = []
      el.addEventListener('oas-remind', () => fired.push('x'))
      vi.advanceTimersByTime(1000)
      expect(fired, '远期提醒不得在挂载后立即派发').toEqual([])
    } finally {
      vi.useRealTimers()
    }
  })

  it('I1：repeat 事件的 remind 按「下一发生日」调度（不再只认首个锚点日）', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-08-10T08:49:00'))
      const el = mount({
        events: JSON.stringify([
          { date: '2026-08-01', title: '每日站会', start: '09:00', remind: 10, repeat: { freq: 'daily' } },
        ]),
      })
      const fired: string[] = []
      el.addEventListener('oas-remind', () => fired.push('x'))
      vi.advanceTimersByTime(11 * 60 * 1000)
      expect(fired, '今日发生日 09:00 前十分钟应提醒').toEqual(['x'])
    } finally {
      vi.useRealTimers()
    }
  })

  it('I2：agenda 星期标签按 weekStart 正确换算（en/周日起始不错位）', () => {
    const el = mount({
      'page-show-date': '2026-08-10',
      view: 'agenda',
      locale: 'en',
      events: JSON.stringify([{ date: '2026-08-10', title: 'x' }]),
    })
    const day = el.shadowRoot!.querySelector('.ag-day')!
    expect(day.textContent, '周一 2026-08-10 在 en（周日起始）下应标 M').toContain('M')
    expect(day.textContent).not.toContain(' S')
  })

  it('I4：显式 id 与自动 id 不碰撞（CRUD 命中正确条目）', () => {
    const el = mount({ 'page-show-date': '2026-08-01' })
    el.events = [
      { date: '2026-08-10', title: 'a' },
      { date: '2026-08-11', title: 'b', id: 'ev1' },
    ]
    const ids = el.events.map((e) => e.id)
    expect(new Set(ids).size, 'id 必须唯一').toBe(ids.length)
    expect(el.removeEvent('ev1')).toBe(true)
    expect(el.events.map((e) => e.title)).toEqual(['a'])
  })

  it('I5：start-hour >= end-hour 钳制（end = start+1，时间轴不塌陷）', () => {
    const el = mount({
      view: 'week',
      'start-hour': '21',
      events: JSON.stringify([{ date: '2026-08-10', title: 'x', start: '09:00', end: '10:00' }]),
      'page-show-date': '2026-08-10',
    })
    const track = el.shadowRoot!.querySelector('.track') as HTMLElement
    expect(Number.parseFloat(track.style.height)).toBeGreaterThan(0)
    expect(el.shadowRoot!.querySelectorAll('.gutter span').length).toBeGreaterThan(0)
  })

  it('I-5：拖拽移动按时长约束落点（2 小时事件拖到 23:30 不截断时长）', () => {
    const el = mount({
      view: 'week',
      events: JSON.stringify([{ date: '2026-08-10', title: '长会', start: '09:00', end: '11:00' }]),
      'page-show-date': '2026-08-10',
    })
    const ev = el.shadowRoot!.querySelector('.col[data-date="2026-08-10"] .event') as HTMLElement
    ev.dispatchEvent(new DragEvent('dragstart', { bubbles: true }))
    const target = el.shadowRoot!.querySelector('.col[data-date="2026-08-10"] .track') as HTMLElement
    target.getBoundingClientRect = () =>
      ({ top: 0, left: 0, width: 100, height: 576, right: 100, bottom: 576, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    const drop = new DragEvent('drop', { bubbles: true })
    Object.defineProperty(drop, 'clientY', { value: (23.5 - 8) * 48 })
    Object.defineProperty(drop, 'preventDefault', { value: () => {} })
    target.dispatchEvent(drop)
    const moved = el.events[0]!
    expect(moved.start).toBe('22:00')
    expect(moved.end).toBe('24:00')
  })

  it('I-6：updateEvent 走 sanitize（坏 date/空标题被拒并返回 false，不污染内部状态）', () => {
    const el = mount({ events: JSON.stringify([{ date: '2026-08-10', title: 'a' }]), 'page-show-date': '2026-08-01' })
    const id = el.events[0]!.id!
    expect(el.updateEvent(id, { date: 'not-a-date' })).toBe(false)
    expect(el.updateEvent(id, { title: '' })).toBe(false)
    expect(el.events[0]!.date).toBe('2026-08-10')
    expect(el.events[0]!.title).toBe('a')
  })

  it('I-7：非法时间（25:00）被清洗为不定时（进全天行而非溢出）', () => {
    const el = mount({
      view: 'week',
      events: JSON.stringify([{ date: '2026-08-10', title: 'x', start: '25:00', end: '26:00' }]),
      'page-show-date': '2026-08-10',
    })
    expect(el.shadowRoot!.querySelector('.col[data-date="2026-08-10"] .event')).toBeNull()
    expect(el.shadowRoot!.querySelector('.band-col[data-date="2026-08-10"] .allday .chip')).not.toBeNull()
  })

  it('I-1：resize 落定才派发 oas-events-change（move 期间不重建 DOM）', () => {
    const el = mount({
      view: 'week',
      events: JSON.stringify([{ date: '2026-08-10', title: '晨会', start: '09:00', end: '10:00' }]),
      'page-show-date': '2026-08-10',
    })
    const ev = el.shadowRoot!.querySelector('.col[data-date="2026-08-10"] .event') as HTMLElement
    const grip = ev.querySelector('.resize') as HTMLElement
    const track = el.shadowRoot!.querySelector('.col[data-date="2026-08-10"] .track') as HTMLElement
    track.getBoundingClientRect = () =>
      ({ top: 0, left: 0, width: 100, height: 576, right: 100, bottom: 576, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    let changed = 0
    el.addEventListener('oas-events-change', () => changed++)
    grip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))
    const move = new PointerEvent('pointermove', { bubbles: true, pointerId: 1 })
    Object.defineProperty(move, 'clientY', { value: (11.5 - 8) * 48 })
    track.dispatchEvent(move)
    expect(changed, 'move 期间不派发').toBe(0)
    track.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
    expect(changed, '落定派发一次').toBe(1)
    expect(el.events[0]!.end).toBe('11:30')
  })
})

describe('OASScheduler P3：时区 + 日程（agenda）视图', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('view=agenda：从锚点起 28 天按日分组列出事件（含重复展开），timed 带时间、untimed 标全天', () => {
    const el = mount({
      events: JSON.stringify([
        { date: '2026-08-10', title: '晨会', start: '09:00', end: '10:00' },
        { date: '2026-08-12', title: '评审', color: '#059669' },
        { date: '2026-08-05', title: '每日站会', repeat: { freq: 'daily' } },
      ]),
      'page-show-date': '2026-08-10',
      view: 'agenda',
    })
    const days = el.shadowRoot!.querySelectorAll('.ag-day')
    expect(days.length).toBeGreaterThanOrEqual(2)
    const rows = [...el.shadowRoot!.querySelectorAll('.ag-row')].map((r) => r.textContent)
    expect(rows.some((t) => t?.includes('09:00–10:00') && t.includes('晨会'))).toBe(true)
    expect(rows.some((t) => t?.includes('评审'))).toBe(true)
    expect(rows.filter((t) => t?.includes('每日站会')).length).toBeGreaterThan(1)
    expect(rows.some((t) => t?.includes('全天') && t.includes('评审'))).toBe(true)
  })

  it('agenda 空区间显示占位；点事件行派发 oas-event-click、点日头派发 oas-day-click', () => {
    const el = mount({ 'page-show-date': '2026-08-10', view: 'agenda' })
    expect(el.shadowRoot!.querySelector('.ag-empty')?.textContent).toBeTruthy()
    const el2 = mount({
      events: JSON.stringify([{ date: '2026-08-10', title: 'x' }]),
      'page-show-date': '2026-08-10',
      view: 'agenda',
    })
    const log: string[] = []
    el2.addEventListener('oas-event-click', () => log.push('ev'))
    el2.addEventListener('oas-day-click', () => log.push('day'))
    el2.shadowRoot!.querySelector<HTMLButtonElement>('.ag-row')!.click()
    el2.shadowRoot!.querySelector<HTMLButtonElement>('.ag-day')!.click()
    expect(log).toEqual(['ev', 'day'])
  })

  it('timezone：IANA 时区影响标题/列头格式化与「今天」标记；非法时区回落本地', () => {
    const el = mount({ 'page-show-date': '2026-08-10', view: 'week', timezone: 'Asia/Shanghai' })
    const head = el.shadowRoot!.querySelector('.col-head')?.textContent ?? ''
    expect(head).toMatch(/\d{2}-\d{2}/)
    const bad = mount({ 'page-show-date': '2026-08-10', timezone: 'Not/AZone' })
    expect(bad.shadowRoot!.querySelector('[part="title"]')?.textContent).toContain('2026')
  })

  it('视图按钮含 agenda；切换派发 oas-view-change', () => {
    const el = mount({ 'page-show-date': '2026-08-10' })
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="views"] button[data-view="agenda"]')
    expect(btn).not.toBeNull()
    const log: string[] = []
    el.addEventListener('oas-view-change', ((e: Event) =>
      log.push((e as CustomEvent<{ view: string }>).detail.view)) as EventListener)
    btn!.click()
    expect(log).toEqual(['agenda'])
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="agenda"]')?.hidden).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="grid"]')?.hidden).toBe(true)
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
    expect(el.shadowRoot!.querySelector('.band-col[data-date="2026-08-10"] .allday')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('.band-col[data-date="2026-08-11"] .allday .chip')?.textContent).toBe(
      '全天活动',
    )
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
    const up = new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })
    track.dispatchEvent(up)
    const resized = el.events.find((x) => x.title === '晨会')!
    expect(resized.end).toBe('11:30')
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

describe('OASScheduler 资源视图 + now 线 + 拖拽创建', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const RES = [
    { id: 'r1', title: '会议室 A', color: '#2563eb' },
    { id: 'r2', title: '会议室 B' },
  ]
  const EVS: SchedulerEvent[] = [
    { date: '2026-08-10', title: '评审', start: '09:00', end: '10:00', resource: 'r1' },
    { date: '2026-08-10', title: '全天项', resource: 'r2' },
    { date: '2026-08-11', title: '跨日项', start: '13:00', end: '14:00', resource: 'r1' },
  ]

  it('resources property 清洗：id/title 必填、id 去重、非法项丢弃', () => {
    const el = mount({})
    el.resources = [
      { id: 'r1', title: 'A' },
      { id: 'r1', title: '重复' },
      { id: '', title: 'B' },
      { id: 'r3', title: '' },
    ]
    expect(el.resources.map((r) => r.id)).toEqual(['r1'])
  })

  it('view=resource 单日：行 = 资源，事件按 start/end 渲染横条，全天事件渲染芯片', () => {
    const el = mount({
      view: 'resource',
      resources: JSON.stringify(RES),
      events: JSON.stringify(EVS),
      'page-show-date': '2026-08-10',
    })
    expect(el.shadowRoot!.querySelectorAll('[part="resource"] .res-row').length).toBe(2)
    const r1 = el.shadowRoot!.querySelector('.res-row[data-resource="r1"]')!
    expect(r1.querySelector('.res-bar')?.textContent).toBe('评审')
    const r2 = el.shadowRoot!.querySelector('.res-row[data-resource="r2"]')!
    expect(r2.querySelector('.res-allDayChip')?.textContent).toBe('全天项')
  })

  it('view=resource：无 resources 时渲染单行「未分配」', () => {
    const el = mount({
      view: 'resource',
      events: JSON.stringify([{ date: '2026-08-10', title: 'x' }]),
      'page-show-date': '2026-08-10',
    })
    expect(el.shadowRoot!.querySelectorAll('[part="resource"] .res-row').length).toBe(1)
  })

  it('view=resource-week：行 = 资源，列 = 7 天，格内渲染当日事件', () => {
    const el = mount({
      view: 'resource-week',
      resources: JSON.stringify(RES),
      events: JSON.stringify(EVS),
      'page-show-date': '2026-08-10',
    })
    expect(el.shadowRoot!.querySelectorAll('[part="resource"] .res-dayhead').length).toBe(7)
    const cell = el.shadowRoot!.querySelector('.res-cell[data-date="2026-08-11"][data-resource="r1"]')!
    expect(cell.querySelector('.res-ev')?.textContent).toContain('跨日项')
  })

  it('RTL：资源视图容器带 data-rtl；LTR 不带；运行时切 dir 即时重判定', () => {
    const ltr = mount({ view: 'resource', 'page-show-date': '2026-08-10' })
    expect(ltr.shadowRoot!.querySelector('[part="resource"]')!.hasAttribute('data-rtl')).toBe(false)
    const rtl = mount({ view: 'resource', dir: 'rtl', 'page-show-date': '2026-08-10' })
    expect(rtl.shadowRoot!.querySelector('[part="resource"]')!.hasAttribute('data-rtl')).toBe(true)
    // 运行时切向：dir 在 observedAttributes，动态写入即时生效
    rtl.setAttribute('dir', 'ltr')
    expect(rtl.shadowRoot!.querySelector('[part="resource"]')!.hasAttribute('data-rtl')).toBe(false)
  })

  it('now 线：今天的时间视图渲染 nowline；show-now=false 不渲染', () => {
    const t = new Date()
    const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
    const on = mount({ view: 'day', 'page-show-date': iso, 'start-hour': '0', 'end-hour': '24' })
    expect(on.shadowRoot!.querySelector('.nowline')).not.toBeNull()
    const off = mount({ view: 'day', 'page-show-date': iso, 'show-now': 'false', 'start-hour': '0', 'end-hour': '24' })
    expect(off.shadowRoot!.querySelector('.nowline')).toBeNull()
  })

  it('拖拽创建：时间格拖出 >=15 分钟派发 oas-create；短拖派发 oas-day-click', () => {
    const el = mount({ view: 'day', 'page-show-date': '2026-08-10', 'start-hour': '8', 'end-hour': '20' })
    const track = el.shadowRoot!.querySelector('.col .track') as HTMLElement
    track.getBoundingClientRect = () =>
      ({ top: 0, left: 0, width: 100, height: 576, right: 100, bottom: 576, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    const created: Array<Record<string, unknown>> = []
    let dayClicks = 0
    el.addEventListener('oas-create', (ev) => created.push((ev as CustomEvent).detail))
    el.addEventListener('oas-day-click', () => dayClicks++)

    const down = new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 })
    Object.defineProperty(down, 'clientY', { value: 48 })
    track.dispatchEvent(down)
    const move = new PointerEvent('pointermove', { bubbles: true, pointerId: 1 })
    Object.defineProperty(move, 'clientY', { value: 120 })
    track.dispatchEvent(move)
    track.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
    expect(created.length).toBe(1)
    expect(created[0]).toEqual({ date: '2026-08-10', start: '09:00', end: '10:30', resource: undefined })
    expect(dayClicks).toBe(0)

    // 短拖（同点）视作点击
    const down2 = new PointerEvent('pointerdown', { bubbles: true, pointerId: 2 })
    Object.defineProperty(down2, 'clientY', { value: 48 })
    track.dispatchEvent(down2)
    track.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 2 }))
    expect(dayClicks).toBe(1)
    expect(created.length).toBe(1)
  })
})

describe('OASScheduler 虚拟化（时间轴小时窗口 + 资源行窗口）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const HOUR_H = 48
  const RES_ROW_H = 37

  /** happy-dom 无布局：显式伪造滚动容器的视口高度/滚动位置（同 gantt 测试 stubProp 先例） */
  function stubBox(el: HTMLElement, box: { clientHeight?: number; scrollTop?: number }): void {
    if (box.clientHeight !== undefined)
      Object.defineProperty(el, 'clientHeight', { value: box.clientHeight, configurable: true })
    if (box.scrollTop !== undefined)
      Object.defineProperty(el, 'scrollTop', { value: box.scrollTop, configurable: true })
  }

  /** happy-dom 无布局：stub 元素几何 rect（band 行高量测路径） */
  function stubRect(el: Element, height: number): void {
    el.getBoundingClientRect = () =>
      ({ height, top: 0, left: 0, width: 100, right: 100, bottom: height, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
  }

  function timeviewOf(el: OASScheduler): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>('[part="timeview"]')!
  }

  function resviewOf(el: OASScheduler): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>('[part="resource"]')!
  }

  /** 排在组件待决 rAF 之后（组件帧先执行），返回时窗口已按新滚动位置重建 */
  function flushRaf(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
  }

  it('V1 小时轴窗口：只渲染可视小时 ±buffer 刻度；gutter 总高守恒（滚动范围不变）', () => {
    const el = mount({ view: 'day', 'page-show-date': '2026-08-10', 'start-hour': '0', 'end-hour': '24' })
    stubBox(timeviewOf(el), { clientHeight: 240 }) // 240 / 48 = 5 小时视口
    el.requestUpdate()
    const gutter = el.shadowRoot!.querySelector<HTMLElement>('.timeview .gutter')!
    const spans = gutter.querySelectorAll('span')
    // 窗口 = [0, 5 + buffer 2) = 7 个刻度（全量 24）
    expect(spans.length, '24 小时刻度应按窗口渲染（上界 7）').toBe(7)
    expect(spans.length).toBeGreaterThan(0)
    // 容器总高守恒：gutter 高度仍为 全部小时 × 行高（滚动范围不随窗口缩水）
    expect(parseFloat(gutter.style.height)).toBe(24 * HOUR_H)
    // 日列不窗口化（≤7 列恒全量）：day 视图仍 1 列
    expect(el.shadowRoot!.querySelectorAll('.timeview .col').length).toBe(1)
  })

  it('V2 事件块按可视小时窗口相交渲染（窗外跳过、跨窗长事件保留）', () => {
    const el = mount({
      view: 'day',
      'page-show-date': '2026-08-10',
      'start-hour': '0',
      'end-hour': '24',
      events: JSON.stringify([
        { date: '2026-08-10', title: '窗内早', start: '02:00', end: '03:00' },
        { date: '2026-08-10', title: '窗内上午', start: '05:00', end: '05:30' },
        { date: '2026-08-10', title: '窗外午间', start: '09:00', end: '10:00' },
        { date: '2026-08-10', title: '窗外晚', start: '15:00', end: '16:00' },
        { date: '2026-08-10', title: '跨窗长会', start: '01:00', end: '23:00' },
      ]),
    })
    stubBox(timeviewOf(el), { clientHeight: 240 }) // 窗口小时 [0, 7) → 分钟 [0, 420)
    el.requestUpdate()
    const titles = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.col .event')].map((e) => e.textContent)
    expect(titles.length, '窗外事件块跳过（5 个只渲染 3 个）').toBe(3)
    expect(titles, '跨窗长事件必须保留').toContain('跨窗长会')
    expect(titles).toContain('窗内早')
    expect(titles).toContain('窗内上午')
  })

  it('V3 资源行窗口：500 资源只渲染可视行 ±buffer；spacer 守恒总高（500×37）', () => {
    const res = Array.from({ length: 500 }, (_, i) => ({ id: `r${i}`, title: `资源 ${i}` }))
    const el = mount({ view: 'resource', 'page-show-date': '2026-08-10', resources: JSON.stringify(res) })
    stubBox(resviewOf(el), { clientHeight: 740 }) // 740 / 37 = 20 行视口
    el.requestUpdate()
    const rows = el.shadowRoot!.querySelectorAll('.res-row')
    // 窗口 = [0, 20 + buffer 4) = 24 行（全量 500）
    expect(rows.length, '渲染行数应有上界（500 行只渲染窗口 24 行）').toBe(24)
    const top = el.shadowRoot!.querySelector<HTMLElement>('.res-pad-top')
    const bottom = el.shadowRoot!.querySelector<HTMLElement>('.res-pad-bottom')
    expect(top, '窗口上方 spacer 存在').not.toBeNull()
    expect(bottom, '窗口下方 spacer 存在').not.toBeNull()
    const total = parseFloat(top!.style.height) + parseFloat(bottom!.style.height) + rows.length * RES_ROW_H
    expect(total, 'spacer + 渲染行高之和守恒总高').toBe(500 * RES_ROW_H)
    expect(parseFloat(bottom!.style.height)).toBe((500 - 24) * RES_ROW_H)
  })

  it('V4 中部滚动：scroll 合帧驱动窗口平移覆盖可视区（中部行出现、顶部行移出）', async () => {
    const res = Array.from({ length: 500 }, (_, i) => ({ id: `r${i}`, title: `资源 ${i}` }))
    const el = mount({ view: 'resource', 'page-show-date': '2026-08-10', resources: JSON.stringify(res) })
    const rv = resviewOf(el)
    stubBox(rv, { clientHeight: 740 })
    el.requestUpdate()
    expect(el.shadowRoot!.querySelector('.res-row[data-resource="r0"]'), '顶部窗口首行在 DOM').not.toBeNull()
    stubBox(rv, { scrollTop: 250 * RES_ROW_H }) // 滚到第 250 行
    rv.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(el.shadowRoot!.querySelector('.res-row[data-resource="r250"]'), '中部行渲染覆盖可视区').not.toBeNull()
    expect(el.shadowRoot!.querySelector('.res-row[data-resource="r0"]'), '顶部行随窗口移出').toBeNull()
  })

  it('V5 窗口未变：scroll 合帧后跳过重建（行节点引用稳定）', async () => {
    const res = Array.from({ length: 500 }, (_, i) => ({ id: `r${i}`, title: `资源 ${i}` }))
    const el = mount({ view: 'resource', 'page-show-date': '2026-08-10', resources: JSON.stringify(res) })
    const rv = resviewOf(el)
    stubBox(rv, { clientHeight: 720 }) // 窗口 [0, ceil(720/37)+4) = [0, 24)
    el.requestUpdate()
    const row = el.shadowRoot!.querySelector<HTMLElement>('.res-row[data-resource="r0"]')!
    stubBox(rv, { scrollTop: 15 }) // 15/37 仍落第 0 行槽，窗口端点不变（ceil(735/37)=20）
    rv.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(el.shadowRoot!.querySelector('.res-row[data-resource="r0"]'), '窗口未变不得重建 DOM（同节点）').toBe(row)
  })

  it('V6 视口不可测（happy-dom 缺省）：回落全量渲染（500 行 / 24 刻度全渲染）', () => {
    const res = Array.from({ length: 500 }, (_, i) => ({ id: `r${i}`, title: `资源 ${i}` }))
    const resEl = mount({ view: 'resource', 'page-show-date': '2026-08-10', resources: JSON.stringify(res) })
    expect(resEl.shadowRoot!.querySelectorAll('.res-row').length, 'clientHeight 不可测回落全量行').toBe(500)
    const dayEl = mount({ view: 'day', 'page-show-date': '2026-08-10', 'start-hour': '0', 'end-hour': '24' })
    expect(dayEl.shadowRoot!.querySelectorAll('.timeview .gutter span').length, 'clientHeight 不可测回落全量刻度').toBe(
      24,
    )
  })

  it('V7 空数据零异常：resource 单行「未分配」、day/week 空渲染不炸', () => {
    const resEl = mount({ view: 'resource', 'page-show-date': '2026-08-10' })
    expect(resEl.shadowRoot!.querySelectorAll('[part="resource"] .res-row').length).toBe(1)
    const dayEl = mount({ view: 'day', 'page-show-date': '2026-08-10' })
    expect(dayEl.shadowRoot!.querySelector('.col .track')).not.toBeNull()
    const weekEl = mount({ view: 'week', 'page-show-date': '2026-08-10' })
    expect(weekEl.shadowRoot!.querySelectorAll('.timeview .col').length).toBe(7)
  })

  it('V8 窗口原点扣 band 高：scrollTop 先减 band 实高再算窗口（多全天事件时顶部刻度/事件不被裁）', () => {
    const evs = Array.from({ length: 30 }, (_, i) => ({ date: '2026-08-10', title: `全天事项${i}` }))
    const el = mount({
      view: 'day',
      'page-show-date': '2026-08-10',
      'start-hour': '0',
      'end-hour': '24',
      events: JSON.stringify(evs),
    })
    const tv = timeviewOf(el)
    stubBox(tv, { clientHeight: 240, scrollTop: 500 })
    // happy-dom 无布局：stub band 行实高（spacer 与 band 同处 grid 首行，行高取大者 137）
    stubRect(el.shadowRoot!.querySelector('.band-spacer')!, 20)
    stubRect(el.shadowRoot!.querySelector('.band')!, 137)
    el.requestUpdate()
    // 有效原点 = 500 - 137 = 363 → 首可视小时 floor(363/48) = 7 → 窗口 [7-2, …) 起于 05:00
    // （不扣 band 会错起 08:00：视口顶在 07:00 而渲染从 08:00 起 → 顶部约 1h 空白、可见事件被裁）
    const first = el.shadowRoot!.querySelector<HTMLElement>('.gutter span')!
    expect(first.textContent).toBe('05:00')
  })

  it('V9 重建回焦：聚焦事件条 → 滚动触发窗口平移重建 → shadow.activeElement 仍为同一事件 id', async () => {
    const el = mount({
      view: 'day',
      'page-show-date': '2026-08-10',
      'start-hour': '0',
      'end-hour': '24',
      events: JSON.stringify([{ date: '2026-08-10', title: '焦点目标', start: '05:00', end: '06:00' }]),
    })
    const tv = timeviewOf(el)
    stubBox(tv, { clientHeight: 240 }) // 初始窗口 [0, 7)
    el.requestUpdate()
    const ev = el.shadowRoot!.querySelector<HTMLElement>('.col .event')!
    ev.focus()
    expect(el.shadowRoot!.activeElement, '前置：事件条已聚焦').toBe(ev)
    stubBox(tv, { scrollTop: 240 }) // 5 小时 → 窗口平移 [3, 12)，事件条仍在窗内
    tv.dispatchEvent(new Event('scroll'))
    await flushRaf()
    const after = el.shadowRoot!.activeElement as HTMLElement | null
    expect(after, '重建后焦点不得丢失').not.toBeNull()
    expect(after!.getAttribute('data-id'), '回焦到同一事件 id').toBe(ev.getAttribute('data-id'))
  })

  it('V10 aria 行计数：resource 网格 aria-rowcount + 每行绝对 aria-rowindex（1 基，窗口平移不重编号）', () => {
    const res = Array.from({ length: 500 }, (_, i) => ({ id: `r${i}`, title: `R${i}` }))
    const el = mount({ view: 'resource', 'page-show-date': '2026-08-10', resources: JSON.stringify(res) })
    expect(el.shadowRoot!.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe('500')
    expect(el.shadowRoot!.querySelector('[role="row"]')?.getAttribute('aria-rowindex')).toBe('1')
    stubBox(resviewOf(el), { clientHeight: 740, scrollTop: 250 * RES_ROW_H })
    el.requestUpdate()
    const mid = el.shadowRoot!.querySelector<HTMLElement>('.res-row[data-resource="r250"]')!
    expect(mid.getAttribute('aria-rowindex'), '窗口平移后行号仍为绝对行号').toBe('251')
    // 周 × 资源网格同规格
    const wk = mount({
      view: 'resource-week',
      'page-show-date': '2026-08-10',
      resources: JSON.stringify([{ id: 'a', title: 'A' }]),
    })
    expect(wk.shadowRoot!.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe('1')
    expect(wk.shadowRoot!.querySelector('[role="row"]')?.getAttribute('aria-rowindex')).toBe('1')
  })

  it('V11 res-week 行高下界：1 小时区间（轨道 24px < 单元格 min-height 36px）行高兜底，spacer 总高守恒', () => {
    const res = Array.from({ length: 200 }, (_, i) => ({ id: `r${i}`, title: `R${i}` }))
    const el = mount({
      view: 'resource-week',
      'page-show-date': '2026-08-10',
      'start-hour': '8',
      'end-hour': '9',
      resources: JSON.stringify(res),
    })
    stubBox(resviewOf(el), { clientHeight: 740 })
    el.requestUpdate()
    const top = el.shadowRoot!.querySelector<HTMLElement>('.res-pad-top')!
    const bottom = el.shadowRoot!.querySelector<HTMLElement>('.res-pad-bottom')!
    const rendered = el.shadowRoot!.querySelectorAll('.res-row').length
    // 实际行高 = max(轨道 24px, 单元格 min-height 36px) + 1px 行边框 = 37
    const rowH = Math.max((9 - 8) * 24, 36) + 1
    expect(rowH).toBe(37)
    const total = parseFloat(top.style.height) + rendered * rowH + parseFloat(bottom.style.height)
    expect(total, 'spacer 按兜底行高计 → 总高守恒 200×37（未兜底模型 25px 会少算）').toBe(200 * rowH)
    expect(parseFloat(bottom.style.height)).toBe((200 - rendered) * rowH)
  })
})
