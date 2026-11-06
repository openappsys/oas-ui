import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest'
import { levelResources } from './index.js'
import type { LevelResourcesOptions, ResourceItem, ResourceTask } from './index.js'

// ===== 抽核冒烟（导出面 / 确定性 / 幂等 / 负例） =====

describe('level 子路径导出面与纯函数性质', () => {
  const RES: ResourceItem[] = [{ id: 'r1', name: 'A', capacity: 1 }]
  const PAIR: ResourceTask[] = [
    { id: 't1', name: '先', start: '2026-03-02', end: '2026-03-02', resources: ['r1'] },
    { id: 't2', name: '后', start: '2026-03-02', end: '2026-03-02', resources: ['r1'] },
  ]

  it('导出面：levelResources 为导出函数，入参清洗与选项契约可用（编译期类型）', () => {
    expect(typeof levelResources).toBe('function')
    const opts: LevelResourcesOptions = { scale: 'week', capacity: 2, maxIter: 10, weekStart: 1, mode: 'shift' }
    const mode: LevelResourcesOptions['mode'] = 'reassign'
    expect(mode).toBe('reassign')
    expect(levelResources(RES, PAIR, opts).length).toBeGreaterThanOrEqual(0)
  })

  it('确定性：同输入两次调用输出逐位一致，且不改入参', () => {
    const res = RES.map((r) => ({ ...r }))
    const tasks = PAIR.map((t) => ({ ...t, resources: [...(t.resources ?? [])] }))
    const a = levelResources(res, tasks)
    const b = levelResources(res, tasks)
    expect(a).toEqual(b)
    expect(res[0]!.capacity).toBe(1)
    expect(tasks.map((t) => t.start)).toEqual(['2026-03-02', '2026-03-02'])
  })

  it('幂等：把移动结果合并回全量任务后重跑，不再有新移动', () => {
    const moved = levelResources(RES, PAIR)
    // 强断言：cap 1 下两任务同窗，恰好低序后者 t2 后移一个 period
    expect(moved.map((t) => t.id)).toEqual(['t2'])
    const settled: ResourceTask[] = PAIR.map((t) => moved.find((m) => m.id === t.id) ?? t)
    expect(levelResources(RES, settled)).toEqual([])
  })

  it('负例：空资源/空任务 → []；非法任务被清洗丢弃；maxIter=0 → []', () => {
    expect(levelResources([], PAIR)).toEqual([])
    expect(levelResources(RES, [])).toEqual([])
    const bad: unknown[] = [
      { id: '', name: 'X', start: '2026-03-02', end: '2026-03-02', resources: ['r1'] },
      { id: 't9', name: 'X', start: '2026-13-99', end: '2026-03-02', resources: ['r1'] },
    ]
    expect(levelResources(RES, bad as ResourceTask[])).toEqual([])
    expect(levelResources(RES, PAIR, { maxIter: 0 })).toEqual([])
    // capacity 选项是「资源未声明 capacity 时的回落值」：资源自带 capacity 1 优先，不会压掉超载；
    // 无声明资源 + 回落 9 → 每档容量 9 > 2 任务 → 无超载
    expect(levelResources([{ id: 'r1', name: 'A' }], PAIR, { capacity: 9 })).toEqual([])
  })
})

// ===== 周末发散守卫（TDD：先 RED 后 GREEN） =====

describe('levelResources 跨度守卫（workdays 最长连续段）', () => {
  /** 逐用例安装的 devWarn 捕获（显式 MockInstance 类型，避免回调参数隐式 any） */
  let warn: MockInstance<(message?: unknown, ...args: unknown[]) => void>

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    warn.mockRestore()
  })

  it('10 天任务遇 5 天工作制：不再漂移，返回未移动，devWarn 恰好一次', () => {
    warn.mockClear()
    // 复现原缺陷：workdays [1..5] + capacity 1，任务 2026-03-02(一)..03-11(三) 跨 10 个日历日
    //（= 两个完整工作周段），任何整体后移都找不到全段空档 → 旧实现逐档后移至 maxIter 漂移到 2027 年。
    const res: ResourceItem[] = [{ id: 'r1', name: 'A', capacity: 1, workdays: [1, 2, 3, 4, 5] }]
    const tasks: ResourceTask[] = [
      { id: 'long', name: '跨双周任务', start: '2026-03-02', end: '2026-03-11', resources: ['r1'] },
    ]
    const moved = levelResources(res, tasks)
    expect(moved, '跨度超长任务不参与移动').toEqual([])
    // 原任务对象未被就地篡改（纯函数契约）
    expect(tasks[0]!.start).toBe('2026-03-02')
    expect(tasks[0]!.end).toBe('2026-03-11')
    const msgs = warn.mock.calls.map((c: unknown[]) => String(c[0]))
    const guardMsgs = msgs.filter((m: string) => m.includes('最长连续工作日'))
    expect(guardMsgs.length, '守卫 devWarn 恰好一次（模块级去重）').toBe(1)
    expect(guardMsgs[0]).toContain('跨双周任务')
  })

  it('正例：4 天任务（五..一）跨度可容，正常逐档后移 3 次收敛', () => {
    // 2026-03-06(五)..03-09(一) = 4 个日历日 ≤ 最长连续段 5 → 守卫不拦；
    // 周六/周日容量 0 → 逐档后移，03-09(一)..03-12(四) 全工作日收敛，恰好 3 次。
    const res: ResourceItem[] = [{ id: 'r1', name: 'A', capacity: 1, workdays: [1, 2, 3, 4, 5] }]
    const tasks: ResourceTask[] = [
      { id: 'fit', name: '可容任务', start: '2026-03-06', end: '2026-03-09', resources: ['r1'] },
    ]
    const moved = levelResources(res, tasks)
    expect(moved.map((t) => t.id)).toEqual(['fit'])
    expect(moved[0]!.start).toBe('2026-03-09')
    expect(moved[0]!.end).toBe('2026-03-12')
    expect(moved[0]!.end, '工期保持 4 天（含端）').toBe('2026-03-12')
  })

  it('边界：workdays 未声明 → 无守卫（行为与守卫引入前一致，不触发守卫告警）', () => {
    warn.mockClear()
    // 未声明 workdays：每档容量语义（capacity 按档计），任务数 > 档容量时正常逐档后移
    const res: ResourceItem[] = [{ id: 'r1', name: 'A', capacity: 1 }]
    const tasks: ResourceTask[] = [
      { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04', resources: ['r1'] },
      { id: 'b', name: 'B', start: '2026-03-02', end: '2026-03-04', resources: ['r1'] },
    ]
    const moved = levelResources(res, tasks)
    expect(moved.map((t) => t.id)).toEqual(['b'])
    const guardMsgs = warn.mock.calls
      .map((c: unknown[]) => String(c[0]))
      .filter((m: string) => m.includes('最长连续工作日'))
    expect(guardMsgs.length, '无 workdays 声明不触发守卫告警').toBe(0)
  })

  it('边界：连续段跨周回绕（[5,6,0] 最长段 3）——3 天任务可容参与，4 天任务被拦', () => {
    const res: ResourceItem[] = [{ id: 'r1', name: 'A', capacity: 1, workdays: [5, 6, 0] }]
    // 3 天任务：2026-03-06(五)..03-08(日) = 3 日 ≤ 3 → 可参与（且恰落全工作段内不超载）
    const ok = levelResources(res, [
      { id: 'ok3', name: '三日', start: '2026-03-06', end: '2026-03-08', resources: ['r1'] },
    ])
    expect(ok, '3 天任务恰在五/六/日段内，容量 1 无超载').toEqual([])
    // 4 天任务：2026-03-06(五)..03-09(一) = 4 日 > 3 → 守卫拦截（跨周回绕计数正确）
    const blocked = levelResources(res, [
      { id: 'long4', name: '四日', start: '2026-03-06', end: '2026-03-09', resources: ['r1'] },
    ])
    expect(blocked, '4 天任务超过跨周段长 3 → 不移动').toEqual([])
  })

  it('DST 防呆：America/New_York 下跨度按本地日历日计（跨 DST 周末段长判定不漂移）', () => {
    const origTz = process.env.TZ
    process.env.TZ = 'America/New_York'
    try {
      // 前置：确认 TZ 生效（否则本用例失去意义）
      expect(new Date(2026, 2, 8).getTimezoneOffset()).toBe(300) // EST（DST 切换日 03-08 前）
      expect(new Date(2026, 2, 9).getTimezoneOffset()).toBe(240) // EDT（DST 后）
      // 2026-03-06(五)..03-15(日) = 10 个本地日历日（毫秒差会因 23 小时日差一位）；
      // 5 天工作制下 10 日 > 5 → 守卫拦截；守卫天数用日历日口径，跨 DST 不影响段长判定。
      const res: ResourceItem[] = [{ id: 'r1', name: 'A', capacity: 1, workdays: [1, 2, 3, 4, 5] }]
      const tasks: ResourceTask[] = [
        { id: 'dst10', name: '跨DST任务', start: '2026-03-06', end: '2026-03-15', resources: ['r1'] },
      ]
      expect(levelResources(res, tasks), 'DST 时区下守卫同样拦截超长跨度').toEqual([])
    } finally {
      if (origTz === undefined) delete process.env.TZ
      else process.env.TZ = origTz
    }
  })
})
