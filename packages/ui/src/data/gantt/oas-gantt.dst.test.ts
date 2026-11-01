/**
 * DST（夏令时）时区下的时间轴 / 自动排程回归：固定宿主 TZ = America/New_York。
 * 2026-03-08 春季进入 DST（当日 23 小时）、2026-11-01 秋季退出 DST（当日 25 小时）。
 *
 * 旧实现用毫秒步进（24h / 7×24h）推进 day/week 刻度与工作日吸附：
 * - 春令后每个单位起点漂到 01:00/02:00…（任务条按 24h 网格错位）；
 * - 秋令 25 小时日会让 11-01 出现两次（刻度标签重复）；
 * - 工作日吸附在 DST 日写出 23:00/01:00 的“半个零点”，污染任务数据；
 * - 班次换算用「当日零点 + 分钟数」，跨过跳变的那天落点差 1 小时。
 *
 * Node 运行期改 process.env.TZ 立即生效；本文件独立进程内自设自还原，避免串扰其它用例。
 */
const ORIG_TZ = process.env.TZ
process.env.TZ = 'America/New_York'

import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest'
import { OASGantt } from './index.js'

afterAll(() => {
  if (ORIG_TZ === undefined) delete process.env.TZ
  else process.env.TZ = ORIG_TZ
})

interface Unit {
  startMs: number
  endMs: number
  major: string
  minor: string
}

interface GanttInternals {
  units: Unit[]
  hostRangeMs(): { startMs: number; endMs: number } | null
}

function mount(attrs: Record<string, string> = {}): OASGantt {
  const el = new OASGantt()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function internals(el: OASGantt): GanttInternals {
  return el as unknown as GanttInternals
}

function barOf(el: OASGantt, id: string): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>(`.bars .bar[data-id="${id}"]`)!
}

/** 本地日历日差（UTC 归一，规避 DST 的 23/25 小时误差） */
function dayDiff(a: Date, b: Date): number {
  return Math.round(
    (Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) - Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) /
      86_400_000,
  )
}

function localMidnight(y: number, m: number, d: number): number {
  return new Date(y, m, d).getTime()
}

describe('OASGantt DST 边界（America/New_York）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    // 断言前置：确认 TZ 生效（否则本文件失去意义，直接失败暴露）
    expect(new Date(2026, 2, 9).getTimezoneOffset()).toBe(240) // EDT = UTC-4
    expect(new Date(2026, 2, 7).getTimezoneOffset()).toBe(300) // EST = UTC-5
    expect(new Date(2026, 10, 2).getTimezoneOffset()).toBe(300) // EST
    expect(new Date(2026, 9, 31).getTimezoneOffset()).toBe(240) // EDT
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('day 档跨春令：单位起点恒为本地零点、标签唯一、任务条落位/宽度按日历日计', () => {
    const el = mount({
      tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-07', end: '2026-03-08' }]),
      'range-start': '2026-03-06',
      'range-end': '2026-03-10',
    })
    const units = internals(el).units
    expect(units.length, '03-01..03-10 共 10 个日刻度').toBe(10)
    for (const u of units) {
      const d = new Date(u.startMs)
      expect(d.getHours(), `单位 ${u.minor} 起点应为本地零点`).toBe(0)
      expect(d.getMinutes()).toBe(0)
    }
    const minors = units.map((u) => u.minor)
    expect(new Set(minors).size, '刻度标签不应重复').toBe(minors.length)

    // 03-07 起的 2 天任务条：左缘落在 03-07 单位起点，宽度 = 2 × 36（跨春令日仍是 2 个日历日）
    const idx = units.findIndex((u) => u.startMs === localMidnight(2026, 2, 7))
    expect(idx, '03-07 应有独立单位').toBeGreaterThanOrEqual(0)
    const bar = barOf(el, 'a')
    expect(Number.parseFloat(bar.style.left)).toBe(idx * 36)
    expect(Number.parseFloat(bar.style.width)).toBe(2 * 36)
  })

  it('day 档跨秋令（25 小时日）：单位起点恒为本地零点、标签唯一（旧实现 11-01 出现两次）', () => {
    const el = mount({
      tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-10-30', end: '2026-11-03' }]),
      'range-start': '2026-10-26',
      'range-end': '2026-11-10',
    })
    const units = internals(el).units
    for (const u of units) {
      const d = new Date(u.startMs)
      expect(d.getHours(), `单位 ${u.minor} 起点应为本地零点（跳过重复的 25 小时日）`).toBe(0)
    }
    const minors = units.map((u) => u.minor)
    expect(new Set(minors).size, '秋令日不应产生重复刻度标签').toBe(minors.length)
    // 单位按日历日连续（间隔恒 1 天），无重无漏
    for (let i = 1; i < units.length; i++) {
      expect(dayDiff(new Date(units[i]!.startMs), new Date(units[i - 1]!.startMs))).toBe(1)
    }
  })

  it('week 档跨 DST：单位起点恒为本地零点，相邻单位间隔恒 7 个日历日', () => {
    const el = mount({
      tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' }]),
      scale: 'week',
      'range-start': '2026-02-23',
      'range-end': '2026-03-15',
    })
    const units = internals(el).units
    expect(units.length).toBeGreaterThan(2)
    for (const u of units) {
      const d = new Date(u.startMs)
      expect(d.getHours(), `周单位 ${u.minor} 起点应为本地零点`).toBe(0)
    }
    for (let i = 1; i < units.length; i++) {
      expect(dayDiff(new Date(units[i]!.startMs), new Date(units[i - 1]!.startMs))).toBe(7)
    }
    const minors = units.map((u) => u.minor)
    expect(new Set(minors).size).toBe(minors.length)
  })

  it('hostRangeMs 右界 = range-end 次日本地零点（春令 / 秋令都不漂 1 小时）', () => {
    const spring = mount({ tasks: '[]', 'range-start': '2026-03-06', 'range-end': '2026-03-07' })
    expect(internals(spring).hostRangeMs()!.endMs).toBe(localMidnight(2026, 2, 8))
    const fall = mount({ tasks: '[]', 'range-start': '2026-10-30', 'range-end': '2026-11-01' })
    expect(internals(fall).hostRangeMs()!.endMs).toBe(localMidnight(2026, 10, 2))
  })

  it('auto-schedule 春令：工作日吸附后写回纯日期（不写 02:00 之类的漂移时刻）', () => {
    const el = mount({
      'auto-schedule': '',
      resources: JSON.stringify([{ id: 'r1', name: 'R', workdays: [1] }]),
      tasks: JSON.stringify([
        { id: 'p', name: 'P', start: '2026-03-05', end: '2026-03-06' },
        { id: 's', name: 'S', start: '2026-03-06', end: '2026-03-07', dependencies: [{ id: 'p' }], resources: ['r1'] },
      ]),
    })
    const s = el.tasks.find((t) => t.id === 's')!
    // 前置 03-06 结束（右缘 03-07 零点）→ 下一个周一是 03-09；工期 2 个日历日 → 03-09..03-10
    expect(s.start, '起点应为本地零点，不得被 DST 推成 02:00').toBe('2026-03-09')
    expect(s.end).toBe('2026-03-10')
    expect(s.start.includes(':') || s.end!.includes(':'), '整日任务不应写出时刻').toBe(false)
  })

  it('auto-schedule 秋令：工作日吸附后写回纯日期（不写 23:00 之类的漂移时刻）', () => {
    const el = mount({
      'auto-schedule': '',
      resources: JSON.stringify([{ id: 'r1', name: 'R', workdays: [1] }]),
      tasks: JSON.stringify([
        { id: 'p', name: 'P', start: '2026-10-30', end: '2026-10-31' },
        { id: 's', name: 'S', start: '2026-10-31', end: '2026-11-01', dependencies: [{ id: 'p' }], resources: ['r1'] },
      ]),
    })
    const s = el.tasks.find((t) => t.id === 's')!
    expect(s.start, '起点应为本地零点，不得被 25 小时日推成 23:00').toBe('2026-11-02')
    expect(s.end).toBe('2026-11-03')
    expect(s.start.includes(':') || s.end!.includes(':'), '整日任务不应写出时刻').toBe(false)
  })

  it('auto-schedule 春令：班次吸附用本地墙钟（09:00 而不是 10:00）', () => {
    const el = mount({
      'auto-schedule': '',
      scale: 'hour',
      resources: JSON.stringify([{ id: 'r1', name: 'R', shifts: [{ start: '09:00', end: '17:00' }] }]),
      tasks: JSON.stringify([
        { id: 'p', name: 'P', start: '2026-03-06', end: '2026-03-07' },
        { id: 's', name: 'S', start: '2026-03-07', end: '2026-03-07', dependencies: [{ id: 'p' }], resources: ['r1'] },
      ]),
    })
    const s = el.tasks.find((t) => t.id === 's')!
    expect(s.start).toBe('2026-03-08 09:00')
  })

  it('auto-schedule 秋令：班次吸附用本地墙钟（09:00 而不是 08:00）', () => {
    const el = mount({
      'auto-schedule': '',
      scale: 'hour',
      resources: JSON.stringify([{ id: 'r1', name: 'R', shifts: [{ start: '09:00', end: '17:00' }] }]),
      tasks: JSON.stringify([
        { id: 'p', name: 'P', start: '2026-10-30', end: '2026-10-31' },
        { id: 's', name: 'S', start: '2026-10-31', end: '2026-10-31', dependencies: [{ id: 'p' }], resources: ['r1'] },
      ]),
    })
    const s = el.tasks.find((t) => t.id === 's')!
    expect(s.start).toBe('2026-11-01 09:00')
  })

  it('今日线落在 DST 当日单位起点（不因 25 小时日错位）', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date(2026, 10, 1, 12, 0, 0))
      const el = mount({
        tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-10-26', end: '2026-11-08' }]),
        'range-start': '2026-10-26',
        'range-end': '2026-11-10',
      })
      const units = internals(el).units
      const idx = units.findIndex((u) => u.startMs === localMidnight(2026, 10, 1))
      expect(idx, '11-01 应有起点为零点的独立单位').toBeGreaterThanOrEqual(0)
      const line = el.shadowRoot!.querySelector<HTMLElement>('.today-line')!
      expect(line.hidden).toBe(false)
      expect(Number.parseFloat(line.style.left)).toBe(idx * 36)
    } finally {
      vi.useRealTimers()
    }
  })
})
