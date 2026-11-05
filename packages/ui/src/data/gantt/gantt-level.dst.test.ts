/**
 * levelGanttConflicts DST（夏令时）对拍：固定宿主 TZ = America/New_York。
 * 2026-03-08 春季进入 DST（当日 23 小时）、2026-11-01 秋季退出 DST（当日 25 小时）。
 *
 * 避让引擎按 addLocalDays 做 day 步进（保墙钟时刻）：跨令避让后 start/end 必须**恒为
 * 本地零点纯日期**（整日任务不写出 23:00/01:00 的漂移时刻）、工期按**日历日**不变、
 * 写回复检无冲突；hour 档任务保墙钟时刻（跨令不漂 1 小时）。
 *
 * Node 运行期改 process.env.TZ 立即生效；本文件独立进程内自设自还原，避免串扰其它用例。
 */
const ORIG_TZ = process.env.TZ
process.env.TZ = 'America/New_York'

import { describe, it, expect, afterAll } from 'vitest'
import { levelGanttConflicts, ganttLevelDiag } from './gantt-level.js'
import { computeResourceConflicts } from './gantt-utils.js'
import { parseISODate } from '../../form/calendar/date-grid.js'
import type { GanttLevelResult, GanttTask, TG } from './gantt-types.js'

afterAll(() => {
  if (ORIG_TZ === undefined) delete process.env.TZ
  else process.env.TZ = ORIG_TZ
})

const POOL = new Set(['alice'])

const CAL_ANY = (): { days: Set<number> | null; holidays: Set<string> } => ({
  days: null,
  holidays: new Set<string>(),
})

const CAL_WEEKDAYS = (): { days: Set<number> | null; holidays: Set<string> } => ({
  days: new Set([1, 2, 3, 4, 5]),
  holidays: new Set<string>(),
})

function t(id: string, start: string, end: string, extra: Partial<GanttTask> = {}): TG {
  return { id, name: id.toUpperCase(), start, end, resources: ['alice'], ...extra } as TG
}

function apply(base: TG[], moved: GanttLevelResult['moved']): TG[] {
  return base.map((task) => {
    const m = moved.find((x) => x.id === task.id)
    return m ? ({ ...task, start: m.start, end: m.end } as TG) : task
  })
}

/** 本地日历日差（UTC 归一，规避 DST 的 23/25 小时误差） */
function dayDiff(a: string, b: string): number {
  const da = parseISODate(a)!
  const db = parseISODate(b)!
  return Math.round(
    (Date.UTC(db.getFullYear(), db.getMonth(), db.getDate()) -
      Date.UTC(da.getFullYear(), da.getMonth(), da.getDate())) /
      86_400_000,
  )
}

/** 整日任务的纯日期断言：无时刻部分（T/空格/冒号均不允许） */
function expectPureDate(task: { start: string; end?: string }, label: string): void {
  expect(task.start, `${label} start 应为纯日期`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(task.end ?? '', `${label} end 应为纯日期`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
}

describe('levelGanttConflicts DST 边界（America/New_York）', () => {
  it('断言前置：TZ 生效（否则本文件失去意义）', () => {
    expect(new Date(2026, 2, 9).getTimezoneOffset()).toBe(240) // EDT = UTC-4（春令后）
    expect(new Date(2026, 2, 7).getTimezoneOffset()).toBe(300) // EST = UTC-5（春令前）
    expect(new Date(2026, 10, 2).getTimezoneOffset()).toBe(300) // EST（秋令后）
    expect(new Date(2026, 9, 31).getTimezoneOffset()).toBe(240) // EDT（秋令前）
  })

  it('春令跨日避让：被移动任务逐日 +1 后 start/end 恒本地零点纯日期、工期日历日不变、复检无冲突', () => {
    // t1 [03-06, 03-10)；t2 [03-07, 03-11) 让位 3 天 → [03-10, 03-14)，全程跨 03-08（23 小时日）
    const tasks = [t('t1', '2026-03-06', '2026-03-09'), t('t2', '2026-03-07', '2026-03-10')]
    const r = levelGanttConflicts(tasks, POOL, CAL_ANY)
    expect(r.truncated).toBe(false)
    expect(r.moved).toEqual([{ id: 't2', start: '2026-03-10', end: '2026-03-13' }])
    const moved = apply(tasks, r.moved).find((x) => x.id === 't2')!
    expectPureDate(moved, '春令 t2')
    expect(dayDiff(moved.start, moved.end!), 'end−start 差值 3 个日历日不变（含端工期同保）').toBe(
      dayDiff('2026-03-07', '2026-03-10'),
    )
    expect(computeResourceConflicts(apply(tasks, r.moved), POOL)).toEqual([])
  })

  it('秋令跨日避让：25 小时日不产生漂移时刻、工期不变、复检无冲突', () => {
    // t1 [10-30, 11-03)；t2 [10-31, 11-04) 让位 3 天 → [11-03, 11-07)，跨 11-01（25 小时日）
    const tasks = [t('t1', '2026-10-30', '2026-11-02'), t('t2', '2026-10-31', '2026-11-03')]
    const r = levelGanttConflicts(tasks, POOL, CAL_ANY)
    expect(r.truncated).toBe(false)
    expect(r.moved).toEqual([{ id: 't2', start: '2026-11-03', end: '2026-11-06' }])
    const moved = apply(tasks, r.moved).find((x) => x.id === 't2')!
    expectPureDate(moved, '秋令 t2')
    expect(dayDiff(moved.start, moved.end!), 'end−start 差值 3 个日历日不变（含端工期同保）').toBe(
      dayDiff('2026-10-31', '2026-11-03'),
    )
    expect(computeResourceConflicts(apply(tasks, r.moved), POOL)).toEqual([])
  })

  it('春令 hour 档：+1 天平移保墙钟（21:00 → 次日 21:00，毫秒步进会漂成 22:00）', () => {
    const tasks = [t('h1', '2026-03-07 20:00', '2026-03-08 10:00'), t('h2', '2026-03-07 21:00', '2026-03-08 11:00')]
    const r = levelGanttConflicts(tasks, POOL, CAL_ANY)
    expect(r.truncated).toBe(false)
    expect(r.moved).toEqual([{ id: 'h2', start: '2026-03-08 21:00', end: '2026-03-09 11:00' }])
    expect(computeResourceConflicts(apply(tasks, r.moved), POOL)).toEqual([])
  })

  it('秋令吸附：收敛落点周六 → 吸附跳过周日（25 小时日）落周一，写回纯日期', () => {
    // 2026-10-31 周六（秋令前夜）；t2 避让后落 10-31（Sat）→ 吸附 11-02（Mon，跨 25 小时日）
    const tasks = [t('t1', '2026-10-26', '2026-10-30'), t('t2', '2026-10-30', '2026-10-31')]
    const r = levelGanttConflicts(tasks, POOL, CAL_WEEKDAYS)
    expect(r.truncated).toBe(false)
    expect(r.moved).toEqual([{ id: 't2', start: '2026-11-02', end: '2026-11-03' }])
    const moved = apply(tasks, r.moved).find((x) => x.id === 't2')!
    expectPureDate(moved, '秋令吸附 t2')
    expect(dayDiff(moved.start, moved.end!), 'end−start 差值 1 个日历日不变（含端工期 2 日同保）').toBe(
      dayDiff('2026-10-30', '2026-10-31'),
    )
    expect(computeResourceConflicts(apply(tasks, r.moved), POOL)).toEqual([])
  })

  it('DST 区间多任务避让：引擎步数有界（不因 23/25 小时日空转），终态无冲突', () => {
    const tasks = [
      t('a', '2026-03-05', '2026-03-09'),
      t('b', '2026-03-06', '2026-03-10'),
      t('c', '2026-03-07', '2026-03-11'),
      t('d', '2026-03-08', '2026-03-12'),
    ]
    const r = levelGanttConflicts(tasks, POOL, CAL_ANY)
    expect(r.truncated).toBe(false)
    expect(ganttLevelDiag.lastSteps).toBeLessThanOrEqual(60)
    expect(computeResourceConflicts(apply(tasks, r.moved), POOL)).toEqual([])
    // 全部写回日期仍为纯日期
    for (const m of r.moved) expectPureDate(m as { start: string; end: string }, m.id)
  })
})
