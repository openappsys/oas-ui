/**
 * DST（夏令时）回归：翻页 / agenda 用毫秒步进时，秋季回拨日会「原地不动」（同一天重复），
 * 提醒的发生日推进同样漂 1 小时。固定宿主 TZ = America/New_York（2026-03-08 进入 DST、
 * 2026-11-01 退出 DST），文件内自设自还原，避免串扰其它用例。
 */
const ORIG_TZ = process.env.TZ
process.env.TZ = 'America/New_York'

import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { OASScheduler } from './index.js'

afterAll(() => {
  if (ORIG_TZ === undefined) delete process.env.TZ
  else process.env.TZ = ORIG_TZ
})

function mount(attrs: Record<string, string> = {}): OASScheduler {
  const el = new OASScheduler()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function colDates(el: OASScheduler): string[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.col')].map((c) => c.dataset.date!)
}

describe('OASScheduler DST 翻页 / agenda / 提醒（America/New_York）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    // 断言前置：确认 TZ 生效（否则本文件失去意义，直接失败暴露）
    expect(new Date(2026, 2, 8).getTimezoneOffset()).toBe(300) // 03-08 00:00 EST
    expect(new Date(2026, 2, 9).getTimezoneOffset()).toBe(240) // 03-09 EDT
    expect(new Date(2026, 10, 1).getTimezoneOffset()).toBe(240) // 11-01 00:00 EDT
    expect(new Date(2026, 10, 2).getTimezoneOffset()).toBe(300) // 11-02 00:00 EST
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('C5：day 视图跨秋季回拨日「下一页」逐日推进（不原地不动）', () => {
    const el = mount({ view: 'day', 'page-show-date': '2026-10-31' })
    const next = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="next"]')!
    expect(colDates(el)).toEqual(['2026-10-31'])
    next.click()
    expect(colDates(el)).toEqual(['2026-11-01'])
    next.click()
    expect(colDates(el), '回拨日次日仍应前进一天').toEqual(['2026-11-02'])
    next.click()
    expect(colDates(el)).toEqual(['2026-11-03'])
  })

  it('C5：day 视图跨春季进拨日逐日推进，且列日期不进位到次日', () => {
    const el = mount({ view: 'day', 'page-show-date': '2026-03-07' })
    const next = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="next"]')!
    next.click()
    expect(colDates(el)).toEqual(['2026-03-08'])
    next.click()
    expect(colDates(el)).toEqual(['2026-03-09'])
  })

  it('C5：week 视图跨秋季回拨周仍从周首日推进（不提前一天）', () => {
    const el = mount({ view: 'week', 'first-day-of-week': '1', 'page-show-date': '2026-10-26' })
    const next = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="next"]')!
    expect(colDates(el)[0]).toBe('2026-10-26')
    next.click()
    expect(colDates(el)[0], '跨 DST 后周首日应为 11-02').toBe('2026-11-02')
    expect(colDates(el)).toHaveLength(7)
  })

  it('C5：agenda 28 天窗口跨秋季回拨日不重复同一天', () => {
    const el = mount({
      view: 'agenda',
      'page-show-date': '2026-11-01',
      events: JSON.stringify([
        { date: '2026-11-01', title: 'A' },
        { date: '2026-11-02', title: 'B' },
      ]),
    })
    const labels = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.ag-day')].map((d) => d.textContent)
    expect(labels).toHaveLength(2)
    expect(new Set(labels).size, 'agenda 不得重复同日分组').toBe(2)
  })

  it('C5：agenda 翻页按日历 28 天推进（跨 DST 不漂一天）', () => {
    const el = mount({ view: 'agenda', 'page-show-date': '2026-10-01' })
    const next = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="next"]')!
    const title = (): string => el.shadowRoot!.querySelector('[part="title"]')!.textContent ?? ''
    next.click()
    expect(title()).toContain('2026-10-29')
    next.click()
    expect(title(), '跨回拨日仍应前进 28 个日历日').toContain('2026-11-26')
  })

  it('I-5：单次提醒跨春季进拨日按发生日当地时刻合成（不晚 1 小时）', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date(2026, 2, 8, 7, 0)) // 03-08 07:00 EST（当天 02:00 进 DST）
      const el = mount({
        events: JSON.stringify([{ id: 'one', date: '2026-03-08', title: '单次', start: '09:00', remind: 10 }]),
      })
      const me = el as unknown as { remindAt(ev: unknown): number | null }
      expect(me.remindAt(el.events[0])).toBe(new Date(2026, 2, 8, 8, 50).getTime())
    } finally {
      vi.useRealTimers()
    }
  })

  it('I-5：每日重复提醒跨秋季回拨日仍按发生日本地零点合成（不提前 1 小时）', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date(2026, 10, 1, 12, 0)) // 11-01 12:00 EST（当天 02:00 退出 DST）
      const el = mount({
        events: JSON.stringify([
          { id: 'd', date: '2026-10-30', title: '每日', start: '09:00', remind: 10, repeat: { freq: 'daily' } },
        ]),
      })
      const me = el as unknown as { remindAt(ev: unknown): number | null }
      expect(me.remindAt(el.events[0])).toBe(new Date(2026, 10, 2, 8, 50).getTime())
    } finally {
      vi.useRealTimers()
    }
  })

  it('I-5：每日重复提醒跨春季进拨日仍按发生日本地零点合成（不晚 1 小时）', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date(2026, 2, 7, 12, 0)) // 03-07 12:00 EST
      const el = mount({
        events: JSON.stringify([
          { id: 'd', date: '2026-03-01', title: '每日', start: '09:00', remind: 10, repeat: { freq: 'daily' } },
        ]),
      })
      const me = el as unknown as { remindAt(ev: unknown): number | null }
      expect(me.remindAt(el.events[0])).toBe(new Date(2026, 2, 8, 8, 50).getTime())
    } finally {
      vi.useRealTimers()
    }
  })

  it('I-5：weekly byDay 提醒跨 DST 后仍落本地 08:50（不漂到 07:50/09:50）', () => {
    vi.useFakeTimers()
    try {
      // 周六 03-07 提醒已过 → 下一个周一 03-09 08:50（EDT）
      vi.setSystemTime(new Date(2026, 2, 7, 12, 0))
      const el = mount({
        events: JSON.stringify([
          {
            id: 'w',
            date: '2026-03-02',
            title: '周一',
            start: '09:00',
            remind: 10,
            repeat: { freq: 'weekly', byDay: [1] },
          },
        ]),
      })
      const me = el as unknown as { remindAt(ev: unknown): number | null }
      expect(me.remindAt(el.events[0])).toBe(new Date(2026, 2, 9, 8, 50).getTime())
    } finally {
      vi.useRealTimers()
    }
  })
})
