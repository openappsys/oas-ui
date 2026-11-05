/**
 * levelGanttConflicts（超配自动排程避让纯引擎）单元测试：
 * ① 机制——收敛 / 受害者排序各分支 / maxIter 截断 / 确定性 / 不改入参 / 幂等；
 * ③ 朴素参考实现对拍——O(n²) 全量重检暴力参考，随机固定 seed 500 组，断言收敛性质等价
 *   （写回后无冲突 + 工期不变量 + 引擎步数 ≤ 参考，不逐值等价）；
 * ④ 边界——单任务 / 池外过滤 / 里程碑 summary / hour 档保时刻。
 * ② DST（夏令时）对拍独立进程见 gantt-level.dst.test.ts（TZ 设置必须在 import 前）。
 */
import { describe, it, expect } from 'vitest'
import { levelGanttConflicts, ganttLevelDiag } from './gantt-level.js'
import { computeResourceConflicts, addLocalDays } from './gantt-utils.js'
import type { GanttLevelResult, GanttTask, TG } from './gantt-types.js'
import { parseISODate } from '../../form/calendar/date-grid.js'

/** 不限日历（全周可排、无假日）：缺省 calendar 回调 */
const CAL_ANY = (): { days: Set<number> | null; holidays: Set<string> } => ({
  days: null,
  holidays: new Set<string>(),
})

/** 周一~周五日历（吸附用） */
const CAL_WEEKDAYS = (): { days: Set<number> | null; holidays: Set<string> } => ({
  days: new Set([1, 2, 3, 4, 5]),
  holidays: new Set<string>(),
})

/** 池：只登记 alice/bob */
const POOL = new Set(['alice', 'bob'])

/** t 快捷构造（带 id/resources 的普通任务） */
function t(
  id: string,
  start: string,
  end: string,
  resources: string[] = ['alice'],
  extra: Partial<GanttTask> = {},
): TG {
  return { id, name: id.toUpperCase(), start, end, resources, ...extra } as TG
}

/** 写回 moved 到任务数组（测试辅助：模拟宿主/组件应用结果） */
function apply(base: TG[], moved: GanttLevelResult['moved']): TG[] {
  return base.map((task) => {
    const m = moved.find((x) => x.id === task.id)
    return m ? ({ ...task, start: m.start, end: m.end } as TG) : task
  })
}

/** 本地日历日差（UTC 归一，规避 DST 误差）——工期不变量断言用 */
function daySpan(task: { start: string; end?: string }): number {
  const s = parseISODate(task.start)!
  const e = parseISODate(task.end ?? task.start)!
  const us = Date.UTC(s.getFullYear(), s.getMonth(), s.getDate())
  const ue = Date.UTC(e.getFullYear(), e.getMonth(), e.getDate())
  return Math.round((ue - us) / 86_400_000)
}

/** 深快照（不改入参断言用） */
function snap(v: unknown): string {
  return JSON.stringify(v)
}

/** 固定种子伪随机（mulberry32；对拍用，避免引入依赖） */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let x = Math.imul(a ^ (a >>> 15), 1 | a)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 朴素参考实现（O(n²) 语义的暴力版）：每轮对全量任务调 computeResourceConflicts 重检，
 * 取第一对冲突用同款受害者排序选人、+1 天平移；双侧永不让位则放弃该对（跳过）；
 * 收敛后同款工作日吸附 + 复检续迭代。与引擎的区别仅在「全量重检 vs 局部重检 + 队列」——
 * 用于交叉验证引擎的队列维护 / 局部谓词没有漏检误检。
 */
function naiveLevel(
  input: TG[],
  registeredIds: Set<string>,
  calendar: (task: GanttTask) => { days: Set<number> | null; holidays: Set<string> },
  maxIter = 800,
): { steps: number; truncated: boolean; tasks: TG[] } {
  const work = input.map((x) => ({ ...x })) as TG[]
  const hasChildren = new Set<string>()
  for (const x of work) if (x.parent) hasChildren.add(x.parent)
  // 参与者（与引擎同过滤口径）
  const parts: TG[] = []
  for (const x of work) {
    const id = typeof x.id === 'string' ? x.id : ''
    if (id === '' || hasChildren.has(id)) continue
    if (x.type === 'milestone' || !x.end) continue
    if (!Array.isArray(x.resources) || x.resources.length === 0) continue
    if (!x.resources.some((r) => registeredIds.has(r))) continue
    parts.push(x)
  }
  const cal = new Map<string, { days: Set<number> | null; holidays: Set<string> }>()
  for (const p of parts) cal.set(p.id, calendar(p))
  const pinnedOf = (x: TG): boolean => {
    if (x.disabled === true || x.constraint === 'mso') return true
    const days = cal.get(x.id!)?.days
    return days !== null && days !== undefined && days.size === 0
  }
  const deadlineOf = (x: TG): number | null => {
    const list: string[] = []
    if (typeof x.deadline === 'string') list.push(x.deadline)
    if (Array.isArray(x.deadlines)) for (const d of x.deadlines) if (typeof d === 'string') list.push(d)
    let min: number | null = null
    for (const s of list) {
      const p = parseISODate(s.trim())
      if (!p) continue
      const ms = p.getTime()
      if (min === null || ms < min) min = ms
    }
    return min
  }
  // 与引擎同款受害者排序（负数 = a 先让位）
  const compare = (a: TG, b: TG): number => {
    const pa = pinnedOf(a)
    const pb = pinnedOf(b)
    if (pa !== pb) return pa ? 1 : -1
    const da = deadlineOf(a)
    const db = deadlineOf(b)
    if ((da !== null) !== (db !== null)) return da !== null ? 1 : -1
    if (da !== null && db !== null && da !== db) return da - db
    const sa = parseISODate(a.start)!.getTime()
    const sb = parseISODate(b.start)!.getTime()
    if (sa !== sb) return sb - sa
    return work.indexOf(b) - work.indexOf(a)
  }
  const step = (x: TG): void => {
    const s = parseISODate(x.start)!
    x.start = x.start.length > 10 ? fmtTimed(addLocalDays(s.getTime(), 1)) : isoOf(addLocalDays(s.getTime(), 1))
    const e = parseISODate(x.end!)!
    x.end = x.end!.length > 10 ? fmtTimed(addLocalDays(e.getTime(), 1)) : isoOf(addLocalDays(e.getTime(), 1))
  }
  const allowed = (x: TG): boolean => {
    const c = cal.get(x.id!)!
    const d = parseISODate(x.start)!
    const { holidays } = c
    const iso = isoOf(d.getTime())
    if (holidays.has(iso)) return false
    const days = c.days
    if (!days) return true
    return days.has(d.getDay())
  }
  const givenUp = new Set<string>()
  let steps = 0
  let truncated = false
  // 主循环：day 步进 → 吸附 → 复检续迭代（与引擎同构，检测全量重检）
  for (;;) {
    for (;;) {
      const all = computeResourceConflicts(work, registeredIds).filter(
        (c) => c.taskA !== c.taskB && !givenUp.has(`${c.taskA}|${c.taskB}|${c.resourceId}`),
      )
      if (all.length === 0) break
      const c = all[0]!
      const a = parts.find((p) => p.id === c.taskA)!
      const b = parts.find((p) => p.id === c.taskB)!
      const victim = compare(a, b) <= 0 ? a : b
      if (pinnedOf(victim)) {
        givenUp.add(`${c.taskA}|${c.taskB}|${c.resourceId}`)
        continue
      }
      if (steps >= maxIter) {
        truncated = true
        break
      }
      step(victim)
      steps++
    }
    if (truncated) break
    let snapped = false
    for (const p of parts) {
      for (let i = 0; i < 400; i++) {
        if (allowed(p)) break
        if (steps >= maxIter) {
          truncated = true
          break
        }
        step(p)
        steps++
        snapped = true
      }
      if (truncated) break
    }
    if (truncated) break
    if (!snapped) break
    if (computeResourceConflicts(work, registeredIds).length === 0) break
  }
  return { steps, truncated, tasks: work }
}

/** 本地零点 ms → 'YYYY-MM-DD' */
function isoOf(ms: number): string {
  const d = new Date(ms)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** ms → 'YYYY-MM-DD HH:mm'（保墙钟） */
function fmtTimed(ms: number): string {
  const d = new Date(ms)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${isoOf(ms)} ${h}:${m}`
}

describe('levelGanttConflicts：机制', () => {
  it('无冲突：零移动零残留零跳过（相切不算——共享一天才算交叠的对面）', () => {
    const tasks = [t('a', '2026-03-02', '2026-03-03'), t('b', '2026-03-04', '2026-03-06')]
    const r = levelGanttConflicts(tasks, POOL, CAL_ANY)
    expect(r).toEqual({ moved: [], unresolved: [], truncated: false, skipped: [] })
  })

  it('交叠收敛：晚开始者让位，逐日 +1 直到相切边界（日精度 end 含端）', () => {
    const tasks = [t('t1', '2026-03-02', '2026-03-05'), t('t2', '2026-03-04', '2026-03-07')]
    const r = levelGanttConflicts(tasks, POOL, CAL_ANY)
    expect(r.truncated).toBe(false)
    expect(r.unresolved).toEqual([])
    expect(r.skipped).toEqual([])
    // t2（start 03-04 晚于 t1 03-02）让位：03-04 → 03-06（+2 天），工期 4 天不变
    expect(r.moved).toEqual([{ id: 't2', start: '2026-03-06', end: '2026-03-09' }])
    // 写回后无冲突（与检测同源终检）
    expect(computeResourceConflicts(apply(tasks, r.moved), POOL)).toEqual([])
  })

  it('disabled 永不让位：对侧全部让完', () => {
    const tasks = [
      t('t1', '2026-03-02', '2026-03-05', ['alice'], { disabled: true }),
      t('t2', '2026-03-02', '2026-03-05'),
    ]
    const r = levelGanttConflicts(tasks, POOL, CAL_ANY)
    expect(r.moved).toEqual([{ id: 't2', start: '2026-03-06', end: '2026-03-09' }])
    expect(computeResourceConflicts(apply(tasks, r.moved), POOL)).toEqual([])
  })

  it('双侧 disabled：不让位不移动，对子进 unresolved（truncated 仍 false——预算未触顶）', () => {
    const tasks = [
      t('t1', '2026-03-02', '2026-03-05', ['alice'], { disabled: true }),
      t('t2', '2026-03-02', '2026-03-05', ['alice'], { disabled: true }),
    ]
    const r = levelGanttConflicts(tasks, POOL, CAL_ANY)
    expect(r.moved).toEqual([])
    expect(r.truncated).toBe(false)
    expect(r.unresolved).toEqual([{ taskA: 't1', taskB: 't2', resourceId: 'alice' }])
  })

  it('日历 days 空集永不让位', () => {
    const tasks = [t('t1', '2026-03-02', '2026-03-05'), t('t2', '2026-03-02', '2026-03-05')]
    const cal = (task: GanttTask): { days: Set<number> | null; holidays: Set<string> } =>
      task.id === 't1' ? { days: new Set(), holidays: new Set() } : CAL_ANY()
    const r = levelGanttConflicts(tasks, POOL, cal)
    expect(r.moved).toEqual([{ id: 't2', start: '2026-03-06', end: '2026-03-09' }])
  })

  it("constraint==='mso' 永不让位", () => {
    const tasks = [
      t('t1', '2026-03-02', '2026-03-05', ['alice'], { constraint: 'mso', constraintDate: '2026-03-02' }),
      t('t2', '2026-03-02', '2026-03-05'),
    ]
    const r = levelGanttConflicts(tasks, POOL, CAL_ANY)
    expect(r.moved).toEqual([{ id: 't2', start: '2026-03-06', end: '2026-03-09' }])
  })

  it('有 deadline 者后让位：无 deadline 一侧先动', () => {
    const tasks = [
      t('t1', '2026-03-02', '2026-03-05'),
      t('t2', '2026-03-02', '2026-03-05', ['alice'], { deadline: '2026-03-10' }),
    ]
    const r = levelGanttConflicts(tasks, POOL, CAL_ANY)
    expect(r.moved).toEqual([{ id: 't1', start: '2026-03-06', end: '2026-03-09' }])
  })

  it('都有 deadline 按最晚者后让位：deadline 早的一侧先动；多 deadline 取最早为键', () => {
    const tasks = [
      t('t1', '2026-03-02', '2026-03-05', ['alice'], { deadlines: ['2026-03-20', '2026-03-10'] }),
      t('t2', '2026-03-02', '2026-03-05', ['alice'], { deadline: '2026-03-15' }),
    ]
    const r = levelGanttConflicts(tasks, POOL, CAL_ANY)
    // t1 最早 deadline 03-10 早于 t2 03-15 → t1 先让位
    expect(r.moved).toEqual([{ id: 't1', start: '2026-03-06', end: '2026-03-09' }])
  })

  it('startMs 并列时输入序靠后者先让位', () => {
    const tasks = [t('t1', '2026-03-02', '2026-03-05'), t('t2', '2026-03-02', '2026-03-05')]
    const r = levelGanttConflicts(tasks, POOL, CAL_ANY)
    expect(r.moved).toEqual([{ id: 't2', start: '2026-03-06', end: '2026-03-09' }])
  })

  it('maxIter 截断：达上限 truncated:true + 残留如实返回（不静默）；预算恰好够则收敛', () => {
    const tasks = [t('t1', '2026-03-02', '2026-03-05'), t('t2', '2026-03-02', '2026-03-05')]
    // 4 步才收敛；maxIter=2 中途截断
    const cut = levelGanttConflicts(tasks, POOL, CAL_ANY, { maxIter: 2 })
    expect(cut.truncated).toBe(true)
    expect(cut.moved).toEqual([{ id: 't2', start: '2026-03-04', end: '2026-03-07' }])
    expect(cut.unresolved).toEqual([{ taskA: 't1', taskB: 't2', resourceId: 'alice' }])
    // maxIter=0：零移动但截断如实
    const zero = levelGanttConflicts(tasks, POOL, CAL_ANY, { maxIter: 0 })
    expect(zero.moved).toEqual([])
    expect(zero.truncated).toBe(true)
    expect(zero.unresolved).toEqual([{ taskA: 't1', taskB: 't2', resourceId: 'alice' }])
    // 恰好 4 步：收敛
    const exact = levelGanttConflicts(tasks, POOL, CAL_ANY, { maxIter: 4 })
    expect(exact.truncated).toBe(false)
    expect(exact.moved).toEqual([{ id: 't2', start: '2026-03-06', end: '2026-03-09' }])
  })

  it('确定性：同输入重复调用结果逐值一致（引擎不改入参使同数组可复用）', () => {
    const tasks = [
      t('a', '2026-03-02', '2026-03-08'),
      t('b', '2026-03-04', '2026-03-09'),
      t('c', '2026-03-05', '2026-03-07'),
      t('d', '2026-03-07', '2026-03-10'),
      t('e', '2026-03-06', '2026-03-12', ['bob']),
    ]
    const r1 = levelGanttConflicts(tasks, POOL, CAL_ANY)
    const r2 = levelGanttConflicts(tasks, POOL, CAL_ANY)
    expect(r1).toEqual(r2)
    // 多任务真实收敛
    expect(computeResourceConflicts(apply(tasks, r1.moved), POOL)).toEqual([])
    expect(r1.truncated).toBe(false)
  })

  it('不改入参：输入数组与任务对象保持原样', () => {
    const tasks = [t('t1', '2026-03-02', '2026-03-05'), t('t2', '2026-03-04', '2026-03-07')]
    const before = snap(tasks)
    levelGanttConflicts(tasks, POOL, CAL_ANY)
    expect(snap(tasks)).toBe(before)
  })

  it('幂等：写回后再跑一次零移动', () => {
    const tasks = [t('t1', '2026-03-02', '2026-03-05'), t('t2', '2026-03-04', '2026-03-07')]
    const r1 = levelGanttConflicts(tasks, POOL, CAL_ANY)
    const next = apply(tasks, r1.moved)
    const r2 = levelGanttConflicts(next, POOL, CAL_ANY)
    expect(r2.moved).toEqual([])
    expect(r2.unresolved).toEqual([])
    expect(r2.truncated).toBe(false)
  })

  it('工作日吸附：收敛落点在周末 → 吸附到下一个工作日；吸附后复检无冲突', () => {
    // 2026-03-07 为周六：t2 收敛到 03-07（Sat）→ 吸附 03-09（Mon）
    const tasks = [t('t1', '2026-03-02', '2026-03-06'), t('t2', '2026-03-06', '2026-03-07')]
    const r = levelGanttConflicts(tasks, POOL, CAL_WEEKDAYS)
    expect(r.truncated).toBe(false)
    expect(r.moved).toEqual([{ id: 't2', start: '2026-03-09', end: '2026-03-10' }])
    expect(computeResourceConflicts(apply(tasks, r.moved), POOL)).toEqual([])
  })

  it('吸附后复检不过继续迭代：吸附撞上第三条 → 继续避让至干净', () => {
    // t2 避让 t1 后吸附到 03-09（Mon），撞上 t3（03-09..03-11）→ t3 继续让位至 03-11
    const tasks = [
      t('t1', '2026-03-02', '2026-03-06'),
      t('t2', '2026-03-06', '2026-03-07'),
      t('t3', '2026-03-09', '2026-03-11'),
    ]
    const r = levelGanttConflicts(tasks, POOL, CAL_WEEKDAYS)
    expect(r.truncated).toBe(false)
    expect(computeResourceConflicts(apply(tasks, r.moved), POOL)).toEqual([])
    expect(r.moved.map((m) => m.id)).toEqual(['t2', 't3'])
    const t2 = r.moved.find((m) => m.id === 't2')!
    const t3 = r.moved.find((m) => m.id === 't3')!
    expect(t2.start).toBe('2026-03-09')
    expect(t3.start).toBe('2026-03-11')
    // 工期不变量（吸附 / 平移都保日历日）
    const src = Object.fromEntries(tasks.map((x) => [x.id, x]))
    expect(daySpan({ start: t2.start, end: t2.end })).toBe(daySpan(src['t2']!))
    expect(daySpan({ start: t3.start, end: t3.end })).toBe(daySpan(src['t3']!))
  })

  it('moved 按输入序输出（移动次序与输出序解耦）', () => {
    const tasks = [
      t('t1', '2026-03-02', '2026-03-05'),
      t('t2', '2026-03-04', '2026-03-07'),
      t('t3', '2026-03-07', '2026-03-08'),
    ]
    const r = levelGanttConflicts(tasks, POOL, CAL_ANY)
    const idx = (id: string) => tasks.findIndex((x) => x.id === id)
    let last = -1
    for (const m of r.moved) {
      const i = idx(m.id)
      expect(i, 'moved 序严格按输入序递增').toBeGreaterThan(last)
      last = i
    }
    expect(computeResourceConflicts(apply(tasks, r.moved), POOL)).toEqual([])
  })
})

describe('levelGanttConflicts：边界', () => {
  it('单任务无冲突：空结果（四字段全空）', () => {
    const r = levelGanttConflicts([t('solo', '2026-03-02', '2026-03-05')], POOL, CAL_ANY)
    expect(r).toEqual({ moved: [], unresolved: [], truncated: false, skipped: [] })
  })

  it('池外过滤：全池外引用不产出冲突且 skipped 如实回报 off-pool', () => {
    const tasks = [t('g1', '2026-03-02', '2026-03-05', ['ghost']), t('g2', '2026-03-04', '2026-03-07', ['ghost'])]
    const r = levelGanttConflicts(tasks, POOL, CAL_ANY)
    expect(r.moved).toEqual([])
    expect(r.unresolved).toEqual([])
    expect(r.skipped).toEqual([
      { id: 'g1', reason: 'off-pool' },
      { id: 'g2', reason: 'off-pool' },
    ])
  })

  it('混合池内外：池外一侧跳过、池内一侧无对手（不误判）', () => {
    const tasks = [
      t('in1', '2026-03-02', '2026-03-05', ['alice', 'ghost']),
      t('off1', '2026-03-03', '2026-03-06', ['ghost']),
    ]
    const r = levelGanttConflicts(tasks, POOL, CAL_ANY)
    expect(r.moved).toEqual([])
    expect(r.skipped).toEqual([{ id: 'off1', reason: 'off-pool' }])
  })

  it('里程碑不参与（同资源同区间也不触发），skipped 报 milestone', () => {
    const tasks = [
      t('m1', '2026-03-05', '2026-03-05', ['alice'], { type: 'milestone' }),
      t('m2', '2026-03-05', '2026-03-05', ['alice'], { type: 'milestone' }),
    ]
    const r = levelGanttConflicts(tasks, POOL, CAL_ANY)
    expect(r.moved).toEqual([])
    expect(r.unresolved).toEqual([])
    expect(r.skipped).toEqual([
      { id: 'm1', reason: 'milestone' },
      { id: 'm2', reason: 'milestone' },
    ])
  })

  it('无 end 的任务按里程碑口径不参与', () => {
    const tasks = [
      { id: 'pt', name: 'PT', start: '2026-03-05', resources: ['alice'] } as TG,
      t('t1', '2026-03-04', '2026-03-06'),
    ]
    const r = levelGanttConflicts(tasks, POOL, CAL_ANY)
    expect(r.moved).toEqual([])
    expect(r.skipped).toEqual([{ id: 'pt', reason: 'milestone' }])
  })

  it('summary 不参与（被 parent 指向），skipped 报 summary', () => {
    const tasks = [
      t('sum', '2026-03-02', '2026-03-12'),
      t('w1', '2026-03-03', '2026-03-06', ['alice'], { parent: 'sum' }),
    ]
    const r = levelGanttConflicts(tasks, POOL, CAL_ANY)
    expect(r.moved).toEqual([])
    expect(r.skipped).toEqual([{ id: 'sum', reason: 'summary' }])
  })

  it('日期非法/退化（end ≤ start）不参与，skipped 报 invalid-dates', () => {
    const tasks = [
      { id: 'bad', name: 'BAD', start: '2026-03-02', end: 'nope', resources: ['alice'] } as unknown as TG,
      t('rev', '2026-03-05', '2026-03-03'),
    ]
    const r = levelGanttConflicts(tasks, POOL, CAL_ANY)
    expect(r.moved).toEqual([])
    expect(r.skipped).toEqual([
      { id: 'bad', reason: 'invalid-dates' },
      { id: 'rev', reason: 'invalid-dates' },
    ])
  })

  it('无资源引用的普通任务静默不参与（与检测同口径，不进 skipped）', () => {
    const tasks = [
      { id: 'plain', name: 'P', start: '2026-03-02', end: '2026-03-05' } as TG,
      t('t1', '2026-03-02', '2026-03-05'),
    ]
    const r = levelGanttConflicts(tasks, POOL, CAL_ANY)
    expect(r.moved).toEqual([])
    expect(r.skipped).toEqual([])
  })

  it('hour 档保时刻：+1 天平移保墙钟（09:00 → 次日 09:00），数据串规格不变', () => {
    const tasks = [t('h1', '2026-03-05 09:00', '2026-03-05 12:00'), t('h2', '2026-03-05 11:00', '2026-03-05 14:00')]
    const r = levelGanttConflicts(tasks, POOL, CAL_ANY)
    expect(r.moved).toEqual([{ id: 'h2', start: '2026-03-06 11:00', end: '2026-03-06 14:00' }])
    expect(computeResourceConflicts(apply(tasks, r.moved), POOL)).toEqual([])
  })
})

describe('levelGanttConflicts：朴素参考实现对拍（O(n²) 全量重检，固定 seed 500 组）', () => {
  it('引擎与参考在「收敛 + 工期不变量 + 步数 ≤ 参考」上等价', () => {
    const rand = mulberry32(20260306)
    let groups = 0
    for (let g = 0; g < 500; g++) {
      const n = 3 + Math.floor(rand() * 5) // 3..7 条
      const tasks: TG[] = []
      for (let i = 0; i < n; i++) {
        const startOff = Math.floor(rand() * 40) // 2026-03-02 起 40 天窗口
        const dur = 1 + Math.floor(rand() * 5)
        const s = addLocalDays(parseISODate('2026-03-02')!.getTime(), startOff)
        const rid = rand() < 0.5 ? 'alice' : 'bob'
        tasks.push(t(`k${i}`, isoOf(s), isoOf(addLocalDays(s, dur)), [rid]))
      }
      const before = snap(tasks)
      const engine = levelGanttConflicts(tasks, POOL, CAL_ANY)
      const naive = naiveLevel(tasks, POOL, CAL_ANY)
      groups++
      // 引擎收敛性：小规模稀疏数据必须收敛（截断 = 引擎/参考有 bug 的强信号）
      expect(engine.truncated, `组 ${g} 引擎不应截断`).toBe(false)
      expect(naive.truncated, `组 ${g} 参考不应截断`).toBe(false)
      // 写回后无冲突（两侧各自满足）
      const engineApplied = apply(tasks, engine.moved)
      expect(computeResourceConflicts(engineApplied, POOL), `组 ${g} 引擎写回后应无冲突`).toEqual([])
      expect(computeResourceConflicts(naive.tasks, POOL), `组 ${g} 参考写回后应无冲突`).toEqual([])
      // 工期不变量（两侧各任务日历日工期不变）
      for (let i = 0; i < n; i++) {
        const src = tasks[i]!
        const e = engineApplied[i]!
        const nv = naive.tasks[i]!
        expect(daySpan(e), `组 ${g} 任务 ${i} 引擎工期不变`).toBe(daySpan(src))
        expect(daySpan(nv), `组 ${g} 任务 ${i} 参考工期不变`).toBe(daySpan(src))
      }
      // 引擎步数 ≤ 参考步数（同受害者排序 + 同 +1 天步进；队列维护不得多走）
      expect(ganttLevelDiag.lastSteps, `组 ${g} 引擎步数 ≤ 参考`).toBeLessThanOrEqual(naive.steps)
      // 纯函数不变式：引擎调用后输入原样
      expect(snap(tasks), `组 ${g} 入参不变`).toBe(before)
    }
    expect(groups).toBe(500)
  })
})
