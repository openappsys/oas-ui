import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASScheduler, eventsToIcs } from './index.js'
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

  it('updateEvent 后 canUndo/undo 恢复上一条事件并派发变更', () => {
    const el = mount({
      view: 'week',
      'page-show-date': '2026-08-12',
      events: JSON.stringify([{ id: 'e1', date: '2026-08-10', endDate: '2026-08-12', title: '原' }]),
    })
    let changes = 0
    el.addEventListener('oas-events-change', () => changes++)
    expect(el.canUndo).toBe(false)
    expect(el.updateEvent('e1', { title: '改' })).toBe(true)
    expect(el.canUndo).toBe(true)
    expect(el.events[0]!.title).toBe('改')
    expect(el.undo()).toBe(true)
    expect(el.events[0]!.title).toBe('原')
    expect(el.canUndo).toBe(false)
    expect(changes).toBe(2)
  })

  it('跨日条 Alt+ArrowRight 改 endDate，Alt+ArrowLeft 撤销式缩回', async () => {
    const el = mount({
      view: 'week',
      'page-show-date': '2026-08-12',
      events: JSON.stringify([{ id: 'span', date: '2026-08-10', endDate: '2026-08-11', title: '跨日' }]),
    })
    const bar = (): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('.band-span[data-id="span"]')!
    expect(bar()).not.toBeNull()
    bar().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true }))
    expect(el.events[0]!.endDate).toBe('2026-08-12')
    bar().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, bubbles: true }))
    expect(el.events[0]!.endDate).toBe('2026-08-11')
  })

  it('S03：15 分钟块不叠顶缘手柄；末端手柄 pointercancel 不写数据', () => {
    const short = mount({
      view: 'week',
      'page-show-date': '2026-08-10',
      events: JSON.stringify([{ id: 's', date: '2026-08-10', title: '短会', start: '09:00', end: '09:15' }]),
    })
    const shortEvent = short.shadowRoot!.querySelector<HTMLElement>('.col[data-date="2026-08-10"] .event')!
    expect(shortEvent.querySelector('.resize-start')).toBeNull()
    expect(shortEvent.querySelector('.resize')).not.toBeNull()

    const el = mount({
      view: 'week',
      'page-show-date': '2026-08-10',
      events: JSON.stringify([{ id: 'span', date: '2026-08-10', endDate: '2026-08-11', title: '跨日' }]),
    })
    const band = el.shadowRoot!.querySelector<HTMLElement>('.band')!
    Object.defineProperty(band, 'clientWidth', { value: 700, configurable: true })
    const handle = el.shadowRoot!.querySelector<HTMLElement>('.band-span .span-resize')!
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 9, clientX: 0 }))
    handle.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 9, clientX: 100 }))
    handle.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 9 }))
    const barEl = handle.parentElement as HTMLElement
    expect(barEl.classList.contains('dragging')).toBe(false)
    expect(barEl.style.width).toBe('')
    // cancel 必须拆掉 finish 监听：随后再 pointerup 也不能写数据
    handle.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 9 }))
    expect(el.events[0]!.endDate).toBe('2026-08-11')
    expect(el.canUndo).toBe(false)
  })

  it('S03：时间块缩放 pointercancel 恢复预览几何，且不写数据', async () => {
    const el = mount({
      view: 'week',
      'page-show-date': '2026-08-10',
      events: JSON.stringify([{ id: 'e1', date: '2026-08-10', title: '会', start: '09:00', end: '10:00' }]),
    })
    const track = el.shadowRoot!.querySelector<HTMLElement>('.col[data-date="2026-08-10"] .track')!
    track.getBoundingClientRect = () =>
      ({ top: 0, left: 0, width: 100, height: 576, right: 100, bottom: 576, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    const event = (): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('.col[data-date="2026-08-10"] .event')!
    const before = event().style.height
    const grip = event().querySelector<HTMLElement>('.resize')!
    grip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 11 }))
    const move = new PointerEvent('pointermove', { bubbles: true, pointerId: 11 })
    Object.defineProperty(move, 'clientY', { value: (11 - 8) * 48 })
    track.dispatchEvent(move)
    expect(event().style.height).not.toBe(before)
    track.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 11 }))
    await Promise.resolve()
    expect(event().style.height).toBe(before)
    expect(el.events[0]!.end).toBe('10:00')
  })

  it('S03：非法 endDate / date 越界拒绝，受控原样回写保留撤销快照', () => {
    const loaded = mount({
      events: JSON.stringify([{ id: 'old', date: '2026-08-10', title: '旧', start: '10:00', end: '09:00' }]),
    })
    expect(loaded.updateEvent('old', { title: '改名' }), '载入的旧非法区间不应冻结无关字段更新').toBe(true)
    expect(loaded.updateEvent('old', { start: '11:00' })).toBe(false)

    const el = mount({
      events: JSON.stringify([{ id: 'e1', date: '2026-08-10', endDate: '2026-08-12', title: '原' }]),
      'page-show-date': '2026-08-01',
    })
    expect(el.updateEvent('e1', { endDate: 'bad' })).toBe(false)
    expect(el.updateEvent('e1', { endDate: '2026-08-09' })).toBe(false)
    expect(el.updateEvent('e1', { date: '2026-08-20' })).toBe(false)
    expect(el.addEvent({ date: '2026-08-10', endDate: '2026-08-09', title: 'bad' })).toBe('')
    expect(el.updateEvent('e1', { title: '改' })).toBe(true)
    expect(el.canUndo).toBe(true)
    el.events = el.events
    expect(el.canUndo, '受控桥接原样回写不应清空撤销快照').toBe(true)
    expect(el.undo()).toBe(true)
    expect(el.events[0]!.title).toBe('原')
  })

  it('S03：自动 id 事件的受控回写也保留撤销快照（键序归一）', () => {
    const el = mount({ events: JSON.stringify([{ date: '2026-08-10', title: '原' }]) })
    const id = el.events[0]!.id!
    expect(el.updateEvent(id, { title: '改' })).toBe(true)
    el.events = el.events
    expect(el.canUndo).toBe(true)
    expect(el.undo()).toBe(true)
    expect(el.events[0]!.title).toBe('原')
  })

  it('S03：顶缘越过 end 时按 15 分钟网格钳制，不产生 09:52 这类非网格值', () => {
    const el = mount({
      view: 'week',
      'page-show-date': '2026-08-10',
      events: JSON.stringify([{ id: 'e1', date: '2026-08-10', title: 'x', start: '09:00', end: '10:07' }]),
    })
    const ev = el.shadowRoot!.querySelector<HTMLElement>('.col[data-date="2026-08-10"] .event')!
    const grip = ev.querySelector('.resize-start') as HTMLElement
    const track = el.shadowRoot!.querySelector<HTMLElement>('.col[data-date="2026-08-10"] .track')!
    track.getBoundingClientRect = () =>
      ({ top: 0, left: 0, width: 100, height: 576, right: 100, bottom: 576, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    grip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 5 }))
    const move = new PointerEvent('pointermove', { bubbles: true, pointerId: 5 })
    Object.defineProperty(move, 'clientY', { value: (10.5 - 8) * 48 })
    track.dispatchEvent(move)
    track.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 5 }))
    expect(el.events[0]!.start).toBe('09:45')
  })

  it('S03：定时跨日条最少保留 2 天；缩出可视周时视图跟随且焦点不丢', () => {
    const night = mount({
      view: 'week',
      'page-show-date': '2026-08-12',
      events: JSON.stringify([
        { id: 'night', date: '2026-08-10', endDate: '2026-08-11', title: '夜', start: '22:00', end: '02:00' },
      ]),
    })
    const nightBar = night.shadowRoot!.querySelector<HTMLElement>('.band-span[data-id="night"]')!
    nightBar.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, bubbles: true }))
    expect(night.events[0]!.endDate).toBe('2026-08-11')
    expect(night.canUndo).toBe(false)

    const long = mount({
      view: 'week',
      'page-show-date': '2026-08-12',
      events: JSON.stringify([{ id: 'long', date: '2026-08-01', endDate: '2026-08-10', title: '长' }]),
    })
    const longBar = long.shadowRoot!.querySelector<HTMLElement>('.band-span[data-id="long"]')!
    longBar.focus()
    longBar.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, bubbles: true }))
    expect(long.events[0]!.endDate).toBe('2026-08-09')
    expect(long.shadowRoot!.querySelector('.band-span[data-id="long"]')).not.toBeNull()
    expect(long.shadowRoot!.activeElement?.getAttribute('data-id')).toBe('long')
  })

  it('S03：day 视图跨日条缩到可视日前时跟随且不失焦', () => {
    const day = mount({
      view: 'day',
      'page-show-date': '2026-08-12',
      events: JSON.stringify([{ id: 'long-day', date: '2026-08-01', endDate: '2026-08-12', title: '长日' }]),
    })
    const dayBar = day.shadowRoot!.querySelector<HTMLElement>('.band-span[data-id="long-day"]')!
    dayBar.focus()
    dayBar.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, bubbles: true }))
    expect(day.events[0]!.endDate).toBe('2026-08-11')
    expect(day.shadowRoot!.querySelector('.band-span[data-id="long-day"]')).not.toBeNull()
    expect(day.shadowRoot!.activeElement?.getAttribute('data-id')).toBe('long-day')
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

  it('同日 start >= end 被拒绝且不产生撤销快照；跨日 end 可早于 start', () => {
    const el = mount({
      events: JSON.stringify([{ date: '2026-08-10', title: 'a', start: '09:00', end: '10:00' }]),
      'page-show-date': '2026-08-10',
    })
    const id = el.events[0]!.id!
    expect(el.updateEvent(id, { start: '10:30' })).toBe(false)
    expect(el.canUndo).toBe(false)
    expect(el.events[0]!.start).toBe('09:00')
    expect(el.updateEvent(id, { start: '22:00', end: '02:00', endDate: '2026-08-11' })).toBe(true)
    expect(el.events[0]).toMatchObject({ start: '22:00', end: '02:00', endDate: '2026-08-11' })
    expect(el.addEvent({ date: '2026-08-10', title: 'bad', start: '10:00', end: '09:00' })).toBe('')
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

  it('secondary-timezone：时间刻度显示第二时区标签，非法值忽略', () => {
    const el = mount({
      view: 'day',
      'page-show-date': '2026-08-10',
      'start-hour': '8',
      'end-hour': '10',
      timezone: 'UTC',
      'secondary-timezone': 'Asia/Tokyo',
    })
    const labels = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.gutter .tz-secondary')]
    expect(labels.length).toBe(2)
    expect(labels.every((n) => /^\d{2}:\d{2}$/.test(n.textContent ?? ''))).toBe(true)
    const res = mount({
      view: 'resource',
      'page-show-date': '2026-08-10',
      'start-hour': '8',
      'end-hour': '10',
      'secondary-timezone': 'Asia/Tokyo',
    })
    expect(res.shadowRoot!.querySelectorAll('.res-tick[data-tz]').length).toBe(2)
    const bad = mount({
      view: 'day',
      'page-show-date': '2026-08-10',
      timezone: 'UTC',
      'secondary-timezone': 'Not/AZone',
    })
    expect(bad.shadowRoot!.querySelectorAll('.tz-secondary').length).toBe(0)
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

  it('repeat 与 endDate 不组合：清洗掉 endDate，按 occurrence 展开成每日条目而不是隐形跨日条', () => {
    const el = mount({
      view: 'week',
      'page-show-date': '2026-08-10',
      events: JSON.stringify([
        {
          id: 'rep-span',
          date: '2026-08-10',
          endDate: '2026-08-12',
          title: '重复跨日',
          repeat: { freq: 'daily', count: 3 },
        },
      ]),
    })
    expect(el.events[0]!.endDate).toBeUndefined()
    expect(el.shadowRoot!.querySelector('.band-span[data-id="rep-span"]')).toBeNull()
    for (const iso of ['2026-08-10', '2026-08-11', '2026-08-12']) {
      expect(el.shadowRoot!.querySelector(`.band-col[data-date="${iso}"] .allday .chip`)?.textContent).toBe('重复跨日')
    }
    expect(el.shadowRoot!.querySelector('.band-col[data-date="2026-08-13"] .allday .chip')).toBeNull()
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

  it('view=day：时间重叠的定时事件按车道并排（不再完全叠印），非重叠事件仍占满整列', () => {
    const el = mount({
      view: 'day',
      'page-show-date': '2026-08-10',
      'start-hour': '8',
      'end-hour': '18',
      events: JSON.stringify([
        { date: '2026-08-10', title: 'A', start: '09:00', end: '11:00' },
        { date: '2026-08-10', title: 'B', start: '09:30', end: '10:30' },
        { date: '2026-08-10', title: 'C', start: '12:00', end: '13:00' },
      ]),
    })
    const evs = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.timeview .col .event')]
    const byTitle = new Map(evs.map((e) => [e.textContent, e]))
    // A/B 时间重叠 → 同一聚簇 2 车道，各占约半列且起始位置不同；保留 4px 列内边距
    expect(byTitle.get('A')!.style.width).toContain('/ 2')
    expect(byTitle.get('B')!.style.width).toContain('/ 2')
    expect(byTitle.get('A')!.style.insetInlineStart).toContain('4px')
    expect(byTitle.get('A')!.style.insetInlineStart).not.toBe(byTitle.get('B')!.style.insetInlineStart)
    expect(byTitle.get('A')!.style.insetInlineEnd).toBe('auto')
    expect(byTitle.get('A')!.style.boxSizing).toBe('border-box')
    // C 与它们不重叠 → 不设车道宽度（沿用 CSS 的整列定位）
    expect(byTitle.get('C')!.style.width).toBe('')
  })

  it('view=day：同开始/包含关系按最大并发分道；首尾相接不算重叠（整列宽度）', () => {
    const el = mount({
      view: 'day',
      'page-show-date': '2026-08-10',
      'start-hour': '8',
      'end-hour': '18',
      events: JSON.stringify([
        { date: '2026-08-10', title: 'A', start: '09:00', end: '10:00' },
        { date: '2026-08-10', title: 'B', start: '09:00', end: '09:30' },
        { date: '2026-08-10', title: 'C', start: '09:15', end: '09:45' },
        { date: '2026-08-10', title: 'D', start: '10:00', end: '11:00' },
      ]),
    })
    const evs = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.timeview .col .event')]
    const byTitle = new Map(evs.map((e) => [e.textContent, e]))
    for (const t of ['A', 'B', 'C']) {
      expect(byTitle.get(t)!.style.width, `${t} 属于 3 车道聚簇`).toContain('/ 3')
    }
    expect(
      new Set(['A', 'B', 'C'].map((t) => byTitle.get(t)!.style.insetInlineStart)).size,
      '三条车道起点互异（不能都落在 lane 0）',
    ).toBe(3)
    expect(byTitle.get('D')!.style.width, '10:00 与 A 首尾相接，另起聚簇整列宽').toBe('')
  })

  it('view=day：完全落在 start-hour 之前的事件不占车道（可见事件仍整列宽）', () => {
    const el = mount({
      view: 'day',
      'page-show-date': '2026-08-10',
      'start-hour': '8',
      'end-hour': '18',
      events: JSON.stringify([
        { date: '2026-08-10', title: 'X', start: '06:00', end: '08:00' },
        { date: '2026-08-10', title: 'Y', start: '07:00', end: '09:00' },
      ]),
    })
    const evs = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.timeview .col .event')]
    expect(evs.map((e) => e.textContent)).toEqual(['Y'])
    expect(evs[0]!.style.width, '时段外事件不占车道，Y 不应被挤成半宽').toBe('')
  })

  it('view=day：早到/晚走事件按 start-hour..end-hour 夹取，不越出 track 盖表头', () => {
    const el = mount({
      view: 'day',
      'page-show-date': '2026-08-10',
      'start-hour': '8',
      'end-hour': '18',
      events: JSON.stringify([
        { date: '2026-08-10', title: '早到', start: '07:00', end: '09:00' },
        { date: '2026-08-10', title: '正常', start: '09:00', end: '10:00' },
        { date: '2026-08-10', title: '晚走', start: '17:00', end: '19:00' },
        { date: '2026-08-10', title: '贴底', start: '17:45', end: '18:00' },
      ]),
    })
    const byTitle = new Map(
      [...el.shadowRoot!.querySelectorAll<HTMLElement>('.timeview .col .event')].map((e) => [e.textContent, e]),
    )
    const box = (t: string) => ({
      top: Number.parseFloat(byTitle.get(t)!.style.top),
      h: Number.parseFloat(byTitle.get(t)!.style.height),
    })
    const totalH = (18 - 8) * 48
    expect(box('早到'), '早到事件从轨道顶开始，不再负 top').toEqual({ top: 0, h: 48 })
    expect(box('正常')).toEqual({ top: 48, h: 48 })
    expect(box('晚走'), '晚走事件在轨道底截止').toEqual({ top: 432, h: 48 })
    expect(box('贴底'), '贴底短事件高度让位于剩余轨道，不向下溢出').toEqual({ top: 468, h: 12 })
    for (const t of ['早到', '正常', '晚走', '贴底']) {
      const b = box(t)
      expect(b.top, `${t} top 不为负`).toBeGreaterThanOrEqual(0)
      expect(b.top + b.h, `${t} 底部不越出 track`).toBeLessThanOrEqual(totalH + 0.5)
    }
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

  it('顶部缩放手柄：pointer 位移改 start；不晚于 end-15', () => {
    const el = timedEl({ view: 'week' })
    const ev = el.shadowRoot!.querySelector('.col[data-date="2026-08-10"] .event') as HTMLElement
    const grip = ev.querySelector('.resize-start') as HTMLElement
    const track = el.shadowRoot!.querySelector('.col[data-date="2026-08-10"] .track') as HTMLElement
    track.getBoundingClientRect = () =>
      ({ top: 0, left: 0, width: 100, height: 576, right: 100, bottom: 576, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    grip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 3 }))
    const move = new PointerEvent('pointermove', { bubbles: true, pointerId: 3 })
    Object.defineProperty(move, 'clientY', { value: (9.5 - 8) * 48 })
    track.dispatchEvent(move)
    track.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 3 }))
    expect(el.events.find((x) => x.title === '晨会')!.start).toBe('09:30')
    expect(el.events.find((x) => x.title === '晨会')!.end).toBe('10:00')
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

  it('资源分组：同名 group 在资源视图生成分组标题行，组内资源保持顺序', () => {
    const el = mount({
      view: 'resource',
      'page-show-date': '2026-08-10',
      resources: JSON.stringify([
        { id: 'r1', title: 'A', group: '华东' },
        { id: 'r2', title: 'B', group: '华东' },
        { id: 'r3', title: 'C', group: '华北' },
        { id: 'r4', title: 'D' },
      ]),
    })
    const rows = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.res-row')]
    expect(rows.map((r) => r.dataset.resource)).toEqual(['__group__:华东', 'r1', 'r2', '__group__:华北', 'r3', 'r4'])
    expect(rows[0]!.classList.contains('res-group')).toBe(true)
    expect(rows[0]!.querySelector('.res-group-label')?.textContent).toBe('华东')
    expect(el.resources[0]!.group).toBe('华东')
  })

  it('view=resource-week 同样渲染资源分组标题行', () => {
    const el = mount({
      view: 'resource-week',
      'page-show-date': '2026-08-10',
      resources: JSON.stringify([
        { id: 'r1', title: 'A', group: '华东' },
        { id: 'r2', title: 'B', group: '华东' },
      ]),
    })
    expect(el.shadowRoot!.querySelectorAll('.res-row.res-group').length).toBe(1)
    expect(el.shadowRoot!.querySelector('.res-group-label')?.textContent).toBe('华东')
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

  it('V3b windowed 资源切片：按绝对行号渲染/aria/spacer，并派发 oas-window-request', () => {
    const res = Array.from({ length: 20 }, (_, i) => ({ id: `r${40 + i}`, title: `R${40 + i}` }))
    const el = new OASScheduler()
    let req: { start: number; end: number } | null = null
    el.addEventListener('oas-window-request', (e) => {
      req = (e as CustomEvent).detail
    })
    el.setAttribute('view', 'resource')
    el.setAttribute('page-show-date', '2026-08-10')
    el.setAttribute('windowed', '')
    el.setAttribute('total', '100')
    el.setAttribute('window-start', '40')
    el.setAttribute('resources', JSON.stringify(res))
    document.body.appendChild(el)
    stubBox(resviewOf(el), { clientHeight: 740, scrollTop: 40 * RES_ROW_H })
    el.requestUpdate()
    expect(el.shadowRoot!.querySelector('[role="grid"]')!.getAttribute('aria-rowcount')).toBe('100')
    const first = el.shadowRoot!.querySelector<HTMLElement>('.res-row[data-resource="r40"]')!
    expect(first.getAttribute('aria-rowindex')).toBe('41')
    expect(parseFloat(el.shadowRoot!.querySelector<HTMLElement>('.res-pad-top')!.style.height)).toBe(40 * RES_ROW_H)
    expect(parseFloat(el.shadowRoot!.querySelector<HTMLElement>('.res-pad-bottom')!.style.height)).toBe(
      (100 - 60) * RES_ROW_H,
    )
    expect(req, '切片未覆盖可视窗口时应请求宿主回填').not.toBeNull()
    expect(req!.start).toBeLessThanOrEqual(40)
    expect(req!.end).toBeGreaterThanOrEqual(60)
  })

  it('windowed 空切片：显示加载占位（不渲染假行）', () => {
    const el = mount({
      view: 'resource',
      'page-show-date': '2026-08-10',
      windowed: '',
      total: '100',
      'window-start': '40',
      resources: '[]',
    })
    expect(el.shadowRoot!.querySelectorAll('.res-row').length).toBe(0)
    expect(el.shadowRoot!.querySelector('.res-empty')?.textContent).toContain('加载')
  })

  it('windowed 未分配行可用保留 id __unassigned__ 显式承接', () => {
    const el = mount({
      view: 'resource',
      'page-show-date': '2026-08-10',
      windowed: '',
      total: '2',
      'window-start': '0',
      resources: JSON.stringify([
        { id: 'r1', title: 'R1' },
        { id: '__unassigned__', title: 'Unassigned' },
      ]),
      events: JSON.stringify([{ date: '2026-08-10', title: 'orphan', start: '09:00', end: '10:00' }]),
    })
    const un = el.shadowRoot!.querySelector<HTMLElement>('.res-row[data-resource="__unassigned__"]')!
    expect(un).not.toBeNull()
    expect(un.querySelector('.res-bar')?.textContent).toBe('orphan')
  })

  it('windowed 隐藏视口不请求（防 margin 扩容发散）', () => {
    const res = Array.from({ length: 20 }, (_, i) => ({ id: `r${40 + i}`, title: `R${40 + i}` }))
    const el = new OASScheduler()
    let req: unknown = null
    el.addEventListener('oas-window-request', (e) => {
      req = (e as CustomEvent).detail
    })
    el.setAttribute('view', 'resource')
    el.setAttribute('windowed', '')
    el.setAttribute('total', '100')
    el.setAttribute('window-start', '40')
    el.setAttribute('resources', JSON.stringify(res))
    document.body.appendChild(el)
    el.requestUpdate()
    expect(req, '不可测视口不应派发窗口请求').toBeNull()
  })

  it('windowed off-slice：空交集退化为一点，spacer 总高守恒且请求覆盖可见底部', () => {
    const res = Array.from({ length: 20 }, (_, i) => ({ id: `r${40 + i}`, title: `R${40 + i}` }))
    const el = mount({
      view: 'resource',
      'page-show-date': '2026-08-10',
      windowed: '',
      total: '100',
      'window-start': '40',
      resources: JSON.stringify(res),
    })
    stubBox(resviewOf(el), { clientHeight: 740, scrollTop: 80 * RES_ROW_H })
    el.requestUpdate()
    const rows = el.shadowRoot!.querySelectorAll('.res-row')
    expect(rows.length, '可视窗口在切片下方时应 0 行').toBe(0)
    const top = parseFloat(el.shadowRoot!.querySelector<HTMLElement>('.res-pad-top')!.style.height)
    const bottom = parseFloat(el.shadowRoot!.querySelector<HTMLElement>('.res-pad-bottom')!.style.height)
    expect(top + bottom, 'spacer 总高守恒').toBe(100 * RES_ROW_H)
  })

  it('windowed 宿主回填切片不拽动用户滚动位置（无请求→回填→上移风暴）', async () => {
    const res = Array.from({ length: 20 }, (_, i) => ({ id: `r${40 + i}`, title: `R${40 + i}` }))
    const el = mount({
      view: 'resource',
      'page-show-date': '2026-08-10',
      windowed: '',
      total: '300',
      'window-start': '40',
      resources: JSON.stringify(res),
    })
    const rv = resviewOf(el)
    stubBox(rv, { clientHeight: 740, scrollTop: 150 * RES_ROW_H })
    let request: { start: number; end: number } | null = null
    el.addEventListener('oas-window-request', (e) => {
      request = (e as CustomEvent).detail
    })
    rv.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(request, '滚动到未装载区应请求宿主').not.toBeNull()
    const next = Array.from({ length: 20 }, (_, i) => ({ id: `r${request!.start + i}`, title: 'X' }))
    el.setAttribute('window-start', String(request!.start))
    el.setAttribute('resources', JSON.stringify(next))
    el.requestUpdate()
    expect(rv.scrollTop, '宿主回填后不得把用户滚动拽到切片首行').toBe(150 * RES_ROW_H)
  })

  it('打印：@media print 存在；beforeprint 临时渲染全量、afterprint 恢复行窗口', () => {
    const res = Array.from({ length: 500 }, (_, i) => ({ id: `r${i}`, title: `R${i}` }))
    const el = mount({ view: 'resource', 'page-show-date': '2026-08-10', resources: JSON.stringify(res) })
    expect(el.shadowRoot!.querySelector('style')?.textContent ?? '').toContain('@media print')
    stubBox(resviewOf(el), { clientHeight: 740 })
    el.requestUpdate()
    expect(el.shadowRoot!.querySelectorAll('.res-row').length).toBe(24)
    window.dispatchEvent(new Event('beforeprint'))
    expect(el.shadowRoot!.querySelectorAll('.res-row').length).toBe(500)
    window.dispatchEvent(new Event('afterprint'))
    expect(el.shadowRoot!.querySelectorAll('.res-row').length).toBe(24)
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

describe('OASScheduler 资源视图索引化（终审 F1：滚动帧不随事件总量线性扫描）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const RES_COUNT = 500
  const EV_PER_RES = 10
  const UNASSIGNED_TIMED = 15
  const UNASSIGNED_ALLDAY = 15
  const GHOST_TIMED = 5
  const TOTAL_EV = RES_COUNT * EV_PER_RES + UNASSIGNED_TIMED + UNASSIGNED_ALLDAY + GHOST_TIMED

  /** 大数据夹具：500 资源 × 每资源 10 个定时事件（同日）+ 未分配事件（无 resource 与未知 resource 并存） */
  function bigFixture(): { resources: string; events: string } {
    const resources = Array.from({ length: RES_COUNT }, (_, i) => ({ id: `r${i}`, title: `资源 ${i}` }))
    const events: SchedulerEvent[] = []
    for (let i = 0; i < RES_COUNT; i++) {
      for (let j = 0; j < EV_PER_RES; j++) {
        const h = String(8 + j).padStart(2, '0')
        events.push({
          date: '2026-08-10',
          title: `R${i}-E${j}`,
          start: `${h}:00`,
          end: `${h}:30`,
          resource: `r${i}`,
        })
      }
    }
    for (let i = 0; i < UNASSIGNED_TIMED; i++)
      events.push({ date: '2026-08-10', title: `未分配定时${i}`, start: '09:00', end: '09:30' })
    for (let i = 0; i < UNASSIGNED_ALLDAY; i++) events.push({ date: '2026-08-10', title: `未分配全天${i}` })
    for (let i = 0; i < GHOST_TIMED; i++)
      events.push({ date: '2026-08-10', title: `幽灵定时${i}`, start: '10:00', end: '10:30', resource: 'ghost' })
    return { resources: JSON.stringify(resources), events: JSON.stringify(events) }
  }

  /** happy-dom 无布局：伪造资源视口高度/滚动位置并派发 scroll，等待组件 rAF 合帧重建（同 V4 先例） */
  async function scrollResRows(el: OASScheduler, row: number): Promise<void> {
    const rv = el.shadowRoot!.querySelector<HTMLElement>('[part="resource"]')!
    Object.defineProperty(rv, 'clientHeight', { value: 740, configurable: true }) // 740 / 37 = 20 行视口
    Object.defineProperty(rv, 'scrollTop', { value: row * 37, configurable: true })
    rv.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
  }

  /** 仅内部诊断计数读取（性能回归断言用） */
  function diagScans(el: OASScheduler): number {
    return (el as unknown as { _diagEventScans: number })._diagEventScans
  }

  it('滚动帧扫描上界：500 资源 × 5000+ 事件滚 5 帧，按桶扫描计数 ≤ 帧数 × 事件总量', async () => {
    const fx = bigFixture()
    const el = mount({
      view: 'resource',
      'page-show-date': '2026-08-10',
      resources: fx.resources,
      events: fx.events,
    })
    const before = diagScans(el)
    for (const row of [10, 60, 120, 200, 300]) await scrollResRows(el, row)
    const delta = diagScans(el) - before
    // 索引化后每个事件只属一个资源桶：每帧扫描 = Σ(窗口行桶大小) ≤ 事件总量 → 5 帧上界 5 × TOTAL_EV。
    // 索引化前：每可见行两遍全量扫描（eventsOn + filter）≈ 24 行 × 2 × 5000 × 5 帧 ≈ 120 万次比较
    expect(delta, '滚动帧扫描计数不得随「窗口行数 × 事件总量」增长').toBeLessThanOrEqual(5 * TOTAL_EV)
    expect(delta, '滚动触发窗口重建，扫描计数应为正').toBeGreaterThan(0)
  })

  it('窗口行渲染结果正确：中部行事件齐全、未分配行归并（无/未知 resource 并存）+ aria-rowcount', async () => {
    const fx = bigFixture()
    const el = mount({
      view: 'resource',
      'page-show-date': '2026-08-10',
      resources: fx.resources,
      events: fx.events,
    })
    expect(el.shadowRoot!.querySelector('[role="grid"]')?.getAttribute('aria-rowcount')).toBe(String(RES_COUNT + 1))
    await scrollResRows(el, 250)
    const mid = el.shadowRoot!.querySelector('.res-row[data-resource="r250"]')!
    expect(mid.querySelectorAll('.res-bar').length, 'r250 的 10 个定时事件条齐全').toBe(EV_PER_RES)
    expect(mid.querySelector<HTMLElement>('.res-bar')?.textContent).toBe('R250-E0')
    expect(mid.querySelector('.res-allDayChip')).toBeNull()
    // 滚到最后一行：未分配行（id ''）归并无 resource 与未知 resource 事件
    await scrollResRows(el, RES_COUNT)
    const un = el.shadowRoot!.querySelector('.res-row[data-resource=""]')!
    expect(un, '未分配行存在').not.toBeNull()
    expect(un.getAttribute('aria-rowindex')).toBe(String(RES_COUNT + 1))
    expect(un.querySelectorAll('.res-bar').length, '未分配定时条 = 无 resource 15 + 未知 resource 5').toBe(
      UNASSIGNED_TIMED + GHOST_TIMED,
    )
    expect(un.querySelectorAll('.res-allDayChip').length, '未分配全天芯片 15').toBe(UNASSIGNED_ALLDAY)
  })

  it('repeat 事件在资源桶内照常展开；索引随 CRUD 即时重建（未分配行随事件增删出现/消失）', async () => {
    const el = mount({
      view: 'resource',
      'page-show-date': '2026-08-10',
      resources: JSON.stringify([{ id: 'a', title: 'A' }]),
      events: JSON.stringify([
        {
          date: '2026-08-10',
          title: '每日巡检',
          start: '09:00',
          end: '09:30',
          resource: 'a',
          repeat: { freq: 'daily' },
        },
      ]),
    })
    expect(el.shadowRoot!.querySelector('.res-row[data-resource="a"]')!.querySelectorAll('.res-bar').length).toBe(1)
    expect(el.shadowRoot!.querySelectorAll('.res-row').length, '无未分配事件 → 单资源行').toBe(1)
    const id = el.addEvent({ date: '2026-08-10', title: '新事件', resource: 'ghost' })
    expect(el.shadowRoot!.querySelectorAll('.res-row').length, '未知 resource → 追加未分配行').toBe(2)
    expect(el.removeEvent(id)).toBe(true)
    expect(el.shadowRoot!.querySelectorAll('.res-row').length, '未分配事件清零 → 未分配行移除').toBe(1)
  })
})

describe('OASScheduler 复审修复（I1 now 计时器 / I4 滚动容器键盘可达）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  const RES = JSON.stringify([{ id: 'r1', title: '会议室 A' }])

  /** happy-dom 无布局：伪造滚动容器尺寸（溢出判定读 scrollHeight/clientHeight） */
  function stubScroll(
    el: HTMLElement,
    box: { clientHeight?: number; scrollHeight?: number; clientWidth?: number; scrollWidth?: number },
  ): void {
    for (const [k, v] of Object.entries(box)) {
      Object.defineProperty(el, k, { value: v, configurable: true })
    }
  }

  it('I1 resource 视图启动 now 计时器：每分钟刷新 .res-now 位置；切走停表、切回重启、卸载清理', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-10T10:00:00'))
    const el = mount({
      view: 'resource',
      'page-show-date': '2026-08-10',
      resources: RES,
      'start-hour': '0',
      'end-hour': '24',
    })
    const internals = el as unknown as { nowTimer: unknown }
    const line = (): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('.res-row[data-resource="r1"] .res-now')!
    expect(internals.nowTimer, 'resource 视图启动 now 计时器').toBeTruthy()
    expect(line(), '当天资源视图渲染 now 线').not.toBeNull()
    const before = parseFloat(line().style.insetInlineStart)
    vi.advanceTimersByTime(60_000)
    expect(parseFloat(line().style.insetInlineStart), '推进 1 分钟后 now 线位置变化').toBeGreaterThan(before)

    // 切到 week：资源视图计时器停掉（week 自身按 PRD 也要每分钟刷新 now 线，故 nowTimer 仍 > 0；
    // 用「隐藏后的 .res-now 不再随时钟更新」证明资源视图确实停表，且无旧定时器继续刷资源视图）
    el.shadowRoot!.querySelector<HTMLButtonElement>('[data-view="week"]')!.click()
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="timeview"]')!.hidden).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="resource"]')!.hidden).toBe(true)
    const frozen = line().style.insetInlineStart
    vi.advanceTimersByTime(60_000)
    expect(line().style.insetInlineStart, '切到 week 后资源 now 线不再刷新').toBe(frozen)

    // 切回 resource：重启定时器并立即按当前时刻重渲染
    el.shadowRoot!.querySelector<HTMLButtonElement>('[data-view="resource"]')!.click()
    expect(internals.nowTimer, '切回 resource 重启计时器').toBeTruthy()
    expect(parseFloat(line().style.insetInlineStart), '切回后 now 线推进到当前时刻').toBeGreaterThan(parseFloat(frozen))

    el.remove()
    expect(internals.nowTimer, '卸载清理 now 计时器').toBeFalsy()
  })

  it('now 定时器在拖拽/创建手势中不重建视图（跨分钟边界不打断手势）', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-10T10:00:00'))
    const el = mount({
      view: 'resource',
      'page-show-date': '2026-08-10',
      resources: RES,
      'start-hour': '0',
      'end-hour': '24',
    })
    const internals = el as unknown as { dragCtx: unknown; createCtx: unknown }
    const line = (): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('.res-row[data-resource="r1"] .res-now')!
    const before = parseFloat(line().style.insetInlineStart)

    internals.dragCtx = {}
    vi.advanceTimersByTime(60_000)
    expect(parseFloat(line().style.insetInlineStart), '拖动中定时器跳过整视重建（now 线保持）').toBe(before)

    internals.dragCtx = null
    internals.createCtx = {}
    vi.advanceTimersByTime(60_000)
    expect(parseFloat(line().style.insetInlineStart), '创建手势中同样跳过').toBe(before)

    internals.createCtx = null
    vi.advanceTimersByTime(60_000)
    expect(parseFloat(line().style.insetInlineStart), '手势结束后恢复每分钟刷新').toBeGreaterThan(before)
    el.remove()
  })

  it('I1b 无 now 线视图（agenda）停表；切回 resource 重启', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-10T10:00:00'))
    const el = mount({
      view: 'resource',
      'page-show-date': '2026-08-10',
      resources: RES,
      'start-hour': '0',
      'end-hour': '24',
    })
    const internals = el as unknown as { nowTimer: unknown }
    expect(internals.nowTimer).toBeTruthy()
    el.shadowRoot!.querySelector<HTMLButtonElement>('[data-view="agenda"]')!.click()
    expect(internals.nowTimer, 'agenda 无 now 线，计时器停止').toBeFalsy()
    el.shadowRoot!.querySelector<HTMLButtonElement>('[data-view="resource"]')!.click()
    expect(internals.nowTimer, '切回 resource 重启').toBeTruthy()
  })

  it('I2 资源视图默认 max-height 640px（--oas-scheduler-resource-max-height 可覆盖，与 timeview 一致）', () => {
    const el = mount({ view: 'resource', 'page-show-date': '2026-08-10', resources: RES })
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    const start = css.indexOf('.resourceview {')
    expect(start, '存在 .resourceview 规则').toBeGreaterThan(-1)
    const block = css.slice(start, css.indexOf('}', start)).replace(/\s+/g, ' ')
    expect(block, '默认限高 640px 且可由 token 覆盖').toContain(
      'max-height: var(--oas-scheduler-resource-max-height, 640px)',
    )
  })

  it('月历 .day 有 min-width:0（防长 nowrap 芯片把 7 列网格撑爆、末两列被裁）', () => {
    const el = mount({ 'page-show-date': '2026-08-01' })
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    const start = css.indexOf('.day {')
    expect(start, '存在 .day 规则').toBeGreaterThan(-1)
    const block = css.slice(start, css.indexOf('}', start)).replace(/\s+/g, ' ')
    expect(block, '网格项可收缩').toContain('min-width: 0')
    // .chips 的同款守卫保持（芯片列可收缩）
    const chips = css.indexOf('.chips {')
    const chipsBlock = css.slice(chips, css.indexOf('}', chips)).replace(/\s+/g, ' ')
    expect(chipsBlock, '.chips 仍可收缩').toContain('min-width: 0')
  })

  it('I4 滚动容器键盘可达：真实溢出才 tabindex=0；不溢出 / 隐藏视图无 tabindex（无空 Tab 停靠点）', () => {
    const day = mount({ view: 'day', 'page-show-date': '2026-08-10', 'start-hour': '0', 'end-hour': '24' })
    const tv = day.shadowRoot!.querySelector<HTMLElement>('[part="timeview"]')!
    stubScroll(tv, { clientHeight: 240, scrollHeight: 1200 })
    day.requestUpdate()
    expect(tv.getAttribute('tabindex'), 'timeview 溢出时键盘可达').toBe('0')

    stubScroll(tv, { scrollHeight: 240 })
    day.requestUpdate()
    expect(tv.hasAttribute('tabindex'), 'timeview 不溢出时不加 tabindex').toBe(false)

    // 切走隐藏：即使先前可滚动也移除 tabindex（隐藏容器不是有效 Tab 停靠点）
    stubScroll(tv, { scrollHeight: 1200 })
    day.requestUpdate()
    expect(tv.getAttribute('tabindex')).toBe('0')
    day.shadowRoot!.querySelector<HTMLButtonElement>('[data-view="month"]')!.click()
    expect(tv.hidden).toBe(true)
    expect(tv.hasAttribute('tabindex'), '隐藏视图移除 tabindex').toBe(false)

    // [part=resource] 同口径
    const res = mount({ view: 'resource', 'page-show-date': '2026-08-10', resources: RES })
    const rv = res.shadowRoot!.querySelector<HTMLElement>('[part="resource"]')!
    stubScroll(rv, { clientHeight: 640, scrollHeight: 5000 })
    res.requestUpdate()
    expect(rv.getAttribute('tabindex'), '资源视图溢出时键盘可达').toBe('0')
    stubScroll(rv, { scrollHeight: 640 })
    res.requestUpdate()
    expect(rv.hasAttribute('tabindex'), '资源视图不溢出时不加 tabindex').toBe(false)
  })
})

describe('property 通道接受 JSON 字符串（框架把静态 attribute 写成 property）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  it('events/resources setter 字符串 → 解析为数组', () => {
    const el = mount({ view: 'week', 'page-show-date': '2026-08-10' })
    // @ts-expect-error 以字符串写入：模拟框架把静态 attribute 当 property 传入
    el.resources = JSON.stringify([{ id: 'r1', title: '甲' }])
    // @ts-expect-error 以字符串写入：模拟框架把静态 attribute 当 property 传入
    el.events = JSON.stringify([{ date: '2026-08-10', title: '会议', resource: 'r1' }])
    expect(el.resources.length).toBe(1)
    expect(el.events.length).toBe(1)
    expect(el.events[0]!.title).toBe('会议')
  })
})

// ===== 属性-方法撞名回归（observedAttributes 的 camelCase 与原型方法同名） =====
//
// 机制：宿主框架（Vue 等按 camelCase 做 property 桥接）或用户 JS 写 `el.startHour = 9`
// 会在实例上建自有属性遮蔽原型同名方法，day/week 视图渲染内部 `this.startHour()` 随后抛
// TypeError。私有方法已改名（startHourValue / endHourValue），此处锁定：property 写入后
// attribute 通道行为仍等价。
describe('OASScheduler 属性-方法撞名回归', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('property 写入 startHour/endHour 后 day 视图 update 不抛错，时间轴按 start-hour/end-hour 属性渲染', () => {
    const el = mount({ view: 'day', 'page-show-date': '2026-08-10' })
    const rec = el as unknown as Record<string, unknown>
    rec.startHour = 9
    rec.endHour = 18
    // attribute 变更同步触发 update → renderTimeView 内 startHourValue/endHourValue 调用；
    // 改名前此处抛 TypeError
    expect(() => el.setAttribute('start-hour', '9')).not.toThrow()
    expect(() => el.setAttribute('end-hour', '18')).not.toThrow()
    // 行为等价断言：gutter 首刻度 = start-hour（09:00）
    const firstTick = el.shadowRoot!.querySelector<HTMLElement>('.gutter span')!
    expect(firstTick.textContent).toBe('09:00')
  })
})

describe('scheduler ICS 导出', () => {
  it('全天/定时/重复/转义：生成 VCALENDAR 行，CRLF 换行，非法事件跳过', () => {
    const now = new Date(Date.UTC(2026, 7, 1, 12, 0, 0))
    const events: SchedulerEvent[] = [
      { id: 'a', date: '2026-08-03', title: 'A, B; C\nD', repeat: { freq: 'daily', until: '2026-08-05' } },
      {
        id: 'b',
        date: '2026-08-10',
        title: 'Timed',
        start: '09:00',
        end: '10:30',
        repeat: { freq: 'weekly', interval: 2 },
      },
      { id: 'bad', date: '2026-13-40', title: 'Bad' },
    ]
    const ics = eventsToIcs(events, { now, calendarName: 'Work' })
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('DTSTAMP:20260801T120000Z')
    expect(ics).toContain('DTSTART;VALUE=DATE:20260803')
    expect(ics).toContain('DTEND;VALUE=DATE:20260804')
    expect(ics).toContain('RRULE:FREQ=DAILY;UNTIL=20260805')
    expect(ics).toContain('SUMMARY:A\\, B\\; C\\nD')
    expect(ics).toContain('DTSTART:20260810T090000')
    expect(ics).toContain('DTEND:20260810T103000')
    expect(ics).toContain('RRULE:FREQ=WEEKLY;INTERVAL=2')
    expect(ics).toContain('X-WR-CALNAME:Work')
    expect(ics).not.toContain('Bad')
    expect(ics.split('\r\n').length).toBeGreaterThan(10)
  })

  it('组件 exportIcs 走当前事件；不修改 events', () => {
    const now = new Date(Date.UTC(2026, 7, 1, 0, 0, 0))
    const el = mount({ events: JSON.stringify([{ id: 'x', date: '2026-08-03', title: 'X' }]) })
    const before = el.events
    const ics = el.exportIcs({ now })
    expect(ics).toContain('SUMMARY:X')
    expect(el.events).toEqual(before)
  })
})

describe('scheduler 跨日全天 / repeat count+byDay / ICS 增强', () => {
  it('endDate 覆盖的每一天都渲染全天芯片（月视图）', () => {
    const el = mount({
      'page-show-date': '2026-08-01',
      events: JSON.stringify([{ id: 'span', date: '2026-08-10', endDate: '2026-08-12', title: '跨日' }]),
    })
    for (const d of ['2026-08-10', '2026-08-11', '2026-08-12']) {
      expect(el.shadowRoot!.querySelector('.day[data-date="' + d + '"] .chip')?.textContent).toBe('跨日')
    }
    expect(el.shadowRoot!.querySelector('.day[data-date="2026-08-13"] .chip')).toBeNull()
  })

  it('跨日全天事件在周视图渲染一条连续长条（不再逐日芯片）', () => {
    const el = mount({
      view: 'week',
      'page-show-date': '2026-08-10',
      events: JSON.stringify([{ id: 'span', date: '2026-08-10', endDate: '2026-08-12', title: '连续' }]),
    })
    expect(el.shadowRoot!.querySelectorAll('.band-span').length).toBe(1)
    expect(el.shadowRoot!.querySelectorAll('.band-col .chip').length).toBe(0)
    expect(el.shadowRoot!.querySelector<HTMLElement>('.band-span')!.style.width).not.toBe('')
  })

  it('range 托管：可视周窗口未覆盖时派发 oas-range-request，覆盖后去重', () => {
    const el = mount({ view: 'week', 'page-show-date': '2026-08-10' })
    const reqs: Array<{ startMs: number; endMs: number; reason: string }> = []
    el.addEventListener('oas-range-request', (e) =>
      reqs.push((e as CustomEvent<{ startMs: number; endMs: number; reason: string }>).detail),
    )
    el.setAttribute('range-start', '2026-08-10')
    el.setAttribute('range-end', '2026-08-12')
    expect(reqs).toHaveLength(1)
    expect(reqs[0]).toMatchObject({
      startMs: new Date(2026, 7, 10).getTime(),
      endMs: new Date(2026, 7, 17).getTime(),
      reason: 'init',
    })
    el.setAttribute('range-end', '2026-08-16')
    expect(reqs).toHaveLength(1)
    el.setAttribute('page-show-date', '2026-08-17')
    expect(reqs).toHaveLength(2)
    expect(reqs[1]!.startMs).toBe(new Date(2026, 7, 17).getTime())
  })

  it('range 托管：月/日/agenda 按各自可见范围计算', () => {
    const getRange = (attrs: Record<string, string>) => {
      const el = mount(attrs)
      let detail: { startMs: number; endMs: number } | null = null
      el.addEventListener('oas-range-request', (e) => {
        detail = (e as CustomEvent<{ startMs: number; endMs: number }>).detail
      })
      el.setAttribute('range-start', '2026-08-01')
      el.setAttribute('range-end', '2026-08-03')
      return detail as { startMs: number; endMs: number } | null
    }
    const day = getRange({ view: 'day', 'page-show-date': '2026-08-10' })!
    expect(day).toMatchObject({ startMs: new Date(2026, 7, 10).getTime(), endMs: new Date(2026, 7, 11).getTime() })
    const agenda = getRange({ view: 'agenda', 'page-show-date': '2026-08-10' })!
    expect(agenda).toMatchObject({
      startMs: new Date(2026, 7, 10).getTime(),
      endMs: new Date(2026, 7, 10 + 28).getTime(),
    })
    const month = getRange({ view: 'month', 'page-show-date': '2026-08-15' })!
    expect(month.startMs).toBeLessThanOrEqual(new Date(2026, 7, 1).getTime())
    expect(month.endMs).toBeGreaterThanOrEqual(new Date(2026, 8, 1).getTime())
    expect((month.endMs - month.startMs) / 86_400_000).toBeGreaterThanOrEqual(35)
  })

  it('range 托管：非法/缺失 range 时不派发 range-request', () => {
    const el = mount({ view: 'week', 'page-show-date': '2026-08-10' })
    const reqs: unknown[] = []
    el.addEventListener('oas-range-request', (e) => reqs.push(e))
    el.setAttribute('range-start', 'not-a-date')
    el.setAttribute('range-end', '2026-08-16')
    expect(reqs).toHaveLength(0)
  })

  it('跨日连续条支持左右方向键按天平移（键盘可达）', () => {
    const el = mount({
      view: 'week',
      'page-show-date': '2026-08-10',
      events: JSON.stringify([{ id: 'span', date: '2026-08-10', endDate: '2026-08-11', title: '连续' }]),
    })
    const bar = el.shadowRoot!.querySelector<HTMLElement>('.band-span')!
    let changes = 0
    el.addEventListener('oas-events-change', () => changes++)
    bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    let event = el.events.find((item) => item.id === 'span')!
    expect(event.date).toBe('2026-08-11')
    expect(event.endDate).toBe('2026-08-12')
    expect(changes).toBe(1)
    bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    event = el.events.find((item) => item.id === 'span')!
    expect(event.date).toBe('2026-08-10')
    expect(event.endDate).toBe('2026-08-11')
    expect(changes).toBe(2)
  })

  it('RTL 下方向键跟随视觉方向（右键回退一天）', () => {
    const el = mount({
      view: 'week',
      dir: 'rtl',
      'page-show-date': '2026-08-10',
      events: JSON.stringify([{ id: 'span', date: '2026-08-10', endDate: '2026-08-11', title: '连续' }]),
    })
    el.shadowRoot!.querySelector<HTMLElement>('.band-span')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    )
    expect(el.events.find((item) => item.id === 'span')!.date).toBe('2026-08-09')
  })

  it('连续条移出当前周时视图跟随，焦点/条保持', () => {
    const el = mount({
      view: 'week',
      'page-show-date': '2026-08-10',
      events: JSON.stringify([{ id: 'span', date: '2026-08-10', endDate: '2026-08-11', title: '连续' }]),
    })
    for (let i = 0; i < 7; i++) {
      el.shadowRoot!.querySelector<HTMLElement>('.band-span')!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      )
    }
    expect(el.events.find((item) => item.id === 'span')!.date).toBe('2026-08-17')
    expect(el.shadowRoot!.querySelector('.band-span')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('.band-col[data-date="2026-08-17"]')).not.toBeNull()
  })

  it('定时跨日条键盘平移保留 start/end 时刻', () => {
    const el = mount({
      view: 'week',
      'page-show-date': '2026-08-10',
      events: JSON.stringify([
        { id: 'night', date: '2026-08-10', endDate: '2026-08-11', title: '夜间', start: '22:00', end: '02:00' },
      ]),
    })
    el.shadowRoot!.querySelector<HTMLElement>('.band-span.timed-span')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    )
    expect(el.events[0]).toMatchObject({ date: '2026-08-11', endDate: '2026-08-12', start: '22:00', end: '02:00' })
  })

  it('定时跨日事件在周视图渲染连续条，不再按日拆块', () => {
    const el = mount({
      view: 'week',
      'page-show-date': '2026-08-10',
      'start-hour': '0',
      'end-hour': '24',
      events: JSON.stringify([
        { id: 'night', date: '2026-08-10', endDate: '2026-08-11', title: '夜间', start: '22:00', end: '02:00' },
      ]),
    })
    const bar = el.shadowRoot!.querySelector<HTMLElement>('.band-span.timed-span')!
    expect(bar).not.toBeNull()
    expect(bar.textContent).toContain('22:00')
    expect(bar.textContent).toContain('夜间')
    expect(el.shadowRoot!.querySelectorAll('.col .event').length).toBe(0)
  })

  it('weekly byDay + count：只出现指定 weekday，且不超过 count 次', () => {
    const el = mount({
      'page-show-date': '2026-08-01',
      events: JSON.stringify([
        { id: 'r', date: '2026-08-03', title: '双周', repeat: { freq: 'weekly', byDay: [1, 3], count: 4 } },
      ]),
    })
    const hit = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.day[data-date]')]
      .filter((d) => d.querySelector('.chip'))
      .map((d) => d.dataset.date)
    expect(hit).toEqual(['2026-08-03', '2026-08-05', '2026-08-10', '2026-08-12'])
  })

  it('monthly byMonth + byMonthDay + exDates：限定月份/日并排除 EXDATE', () => {
    const events = JSON.stringify([
      {
        id: 'r',
        date: '2026-08-01',
        title: '盘点',
        repeat: { freq: 'monthly', byMonth: [8, 9], byMonthDay: [1, 15], exDates: ['2026-09-01'] },
      },
    ])
    const aug = mount({ 'page-show-date': '2026-08-01', events })
    const augHit = [...aug.shadowRoot!.querySelectorAll<HTMLElement>('.day[data-date]')]
      .filter((d) => d.querySelector('.chip'))
      .map((d) => d.dataset.date)
    expect(augHit).toEqual(['2026-08-01', '2026-08-15'])
    const sep = mount({ 'page-show-date': '2026-09-01', events })
    const sepHit = [...sep.shadowRoot!.querySelectorAll<HTMLElement>('.day[data-date]')]
      .filter((d) => d.querySelector('.chip'))
      .map((d) => d.dataset.date)
    expect(sepHit).toEqual(['2026-09-15'])
  })

  it('monthly bySetPos=-1 与 byMonthDay 组合只保留最后一个候选日', () => {
    const el = mount({
      'page-show-date': '2026-08-01',
      events: JSON.stringify([
        {
          id: 'r',
          date: '2026-08-01',
          title: '末次',
          repeat: { freq: 'monthly', byMonthDay: [1, 15], bySetPos: -1 },
        },
      ]),
    })
    const hit = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.day[data-date]')]
      .filter((d) => d.querySelector('.chip'))
      .map((d) => d.dataset.date)
    expect(hit).toEqual(['2026-08-15'])
  })

  it('ICS：endDate/COUNT/BYDAY/UTC/TZID 输出', () => {
    const now = new Date(Date.UTC(2026, 7, 1, 0, 0, 0))
    const allDay = eventsToIcs([{ id: 's', date: '2026-08-10', endDate: '2026-08-12', title: 'Span' }], {
      now,
      timeMode: 'utc',
      timezone: 'Asia/Shanghai',
    })
    expect(allDay).toContain('DTSTART;VALUE=DATE:20260810')
    expect(allDay).toContain('DTEND;VALUE=DATE:20260813')
    const recurring = eventsToIcs(
      [
        {
          id: 'r',
          date: '2026-08-03',
          title: 'R',
          start: '09:00',
          end: '10:00',
          repeat: { freq: 'weekly', byDay: [1, 3], count: 4 },
        },
      ],
      { now, timeMode: 'utc', timezone: 'Asia/Shanghai' },
    )
    expect(recurring).toContain('DTSTART:20260803T010000Z')
    expect(recurring).toContain('RRULE:FREQ=WEEKLY;COUNT=4;BYDAY=MO,WE')
    const tzid = eventsToIcs([{ id: 't', date: '2026-08-03', title: 'T', start: '09:00', end: '10:00' }], {
      now,
      timeMode: 'tzid',
      timezone: 'Asia/Shanghai',
    })
    expect(tzid).toContain('BEGIN:VTIMEZONE')
    expect(tzid).toContain('TZID:Asia/Shanghai')
    expect(tzid).toContain('DTSTART;TZID=Asia/Shanghai:20260803T090000')
    const extra = eventsToIcs(
      [
        {
          id: 'e',
          date: '2026-08-01',
          title: 'Extra',
          repeat: { freq: 'monthly', byMonth: [8, 9], byMonthDay: [1, 15], exDates: ['2026-09-01'] },
          remind: 10,
        },
      ],
      { now },
    )
    expect(extra).toContain('RRULE:FREQ=MONTHLY;BYMONTH=8,9;BYMONTHDAY=1,15')
    expect(extra).toContain('EXDATE;VALUE=DATE:20260901')
    expect(extra).toContain('TRIGGER:-PT10M')
  })
})
