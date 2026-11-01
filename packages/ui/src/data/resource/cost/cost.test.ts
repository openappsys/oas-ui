import { describe, expect, it } from 'vitest'
import { computeCost } from './index.js'
import type { ResourceTask } from '../oas-resource.js'

describe('resource/cost computeCost', () => {
  it('资源路径：工期天数 × hoursPerDay × 时薪求和（end 含当日）', () => {
    // 03-02..03-06 = 5 天 × 8h；zhang 100 + li 50 → 5×8×150 = 6000
    const tasks: ResourceTask[] = [
      { id: 't1', name: '开发', start: '2026-03-02', end: '2026-03-06', resources: ['zhang', 'li'] },
    ]
    const r = computeCost(tasks, ['zhang', 'li'], { resourceHourly: { zhang: 100, li: 50 } })
    expect(r.perTask.t1).toBe(6000)
    // 均摊：6000 / 2 = 3000 each
    expect(r.perResource.zhang).toBe(3000)
    expect(r.perResource.li).toBe(3000)
    expect(r.total).toBe(6000)
  })

  it('taskCost 优先于资源路径；整包成本仍按分配资源数均摊', () => {
    const tasks: ResourceTask[] = [
      { id: 't1', name: '整包', start: '2026-03-02', end: '2026-03-03', resources: ['zhang', 'li'] },
    ]
    const r = computeCost(tasks, ['zhang', 'li'], {
      resourceHourly: { zhang: 100, li: 50 },
      taskCost: { t1: 900 },
    })
    expect(r.perTask.t1).toBe(900)
    expect(r.perResource.zhang).toBe(450)
    expect(r.perResource.li).toBe(450)
    expect(r.total).toBe(900)
  })

  it('resourceIds 限定集合：不在集合内的分配不计费不分摊；均摊按计费资源数', () => {
    const tasks: ResourceTask[] = [
      { id: 't1', name: '任务', start: '2026-03-02', end: '2026-03-03', resources: ['zhang', 'li', 'wang'] },
    ]
    // wang 不在集合 → 不计费；zhang/li 均摊：2 天×8h×(100+50) = 2400 → 各 1200
    const r = computeCost(tasks, ['zhang', 'li'], { resourceHourly: { zhang: 100, li: 50, wang: 999 } })
    expect(r.perTask.t1).toBe(2400)
    expect(r.perResource.zhang).toBe(1200)
    expect(r.perResource.li).toBe(1200)
    expect(r.perResource.wang).toBeUndefined()
  })

  it('无费率 / 未分配资源 → 资源路径成本 0；无费率资源不参与分摊', () => {
    const tasks: ResourceTask[] = [
      { id: 'a', name: '无费率', start: '2026-03-02', end: '2026-03-03', resources: ['ghost'] },
      { id: 'b', name: '未分配', start: '2026-03-02', end: '2026-03-03' },
      { id: 'c', name: '半数有费率', start: '2026-03-02', end: '2026-03-03', resources: ['zhang', 'ghost2'] },
    ]
    const r = computeCost(tasks, ['zhang', 'ghost', 'ghost2'], { resourceHourly: { zhang: 100 } })
    expect(r.perTask.a).toBe(0)
    expect(r.perTask.b).toBe(0)
    // c：只有 zhang 计费 → 2 天×8h×100 = 1600，全摊给 zhang
    expect(r.perTask.c).toBe(1600)
    expect(r.perResource.zhang).toBe(1600)
    expect(r.total).toBe(1600)
  })

  it('hoursPerDay：默认 8、可覆盖、0 = 零人力成本', () => {
    const task: ResourceTask = { id: 't', name: 'T', start: '2026-03-02', end: '2026-03-03', resources: ['zhang'] }
    expect(computeCost([task], ['zhang'], { resourceHourly: { zhang: 10 } }).perTask.t).toBe(160) // 2 天×8h×10
    expect(computeCost([task], ['zhang'], { resourceHourly: { zhang: 10 }, hoursPerDay: 10 }).perTask.t).toBe(200)
    expect(computeCost([task], ['zhang'], { resourceHourly: { zhang: 10 }, hoursPerDay: 0 }).perTask.t).toBe(0)
  })

  it('非法任务跳过：缺 id / 非法日期；重复 id 首条生效；倒置日期按 I5 交换保留（无分配计 0）', () => {
    const tasks: ResourceTask[] = [
      { name: '缺id', start: '2026-03-02', end: '2026-03-03' },
      { id: 'bad', name: '坏日期', start: 'nope', end: '2026-03-03' },
      { id: 'rev', name: '倒置', start: '2026-03-05', end: '2026-03-03' },
      { id: 'dup', name: '首条', start: '2026-03-02', end: '2026-03-03', resources: ['zhang'] },
      { id: 'dup', name: '次条', start: '2026-03-02', end: '2026-03-03', resources: ['li'] },
    ] as ResourceTask[]
    const r = computeCost(tasks, ['zhang', 'li'], { resourceHourly: { zhang: 100, li: 100 } })
    // rev 交换后保留（03-03..03-05）但无分配 → 资源路径 0
    expect(Object.keys(r.perTask).sort()).toEqual(['dup', 'rev'])
    expect(r.perTask.rev).toBe(0)
    expect(r.perTask.dup).toBe(1600) // 首条 zhang：2 天×8h×100
    expect(r.perResource.li).toBeUndefined()
  })

  it('空输入 / 空资源集合 → 全 0', () => {
    expect(computeCost([], [], { resourceHourly: { zhang: 100 } })).toEqual({ perTask: {}, perResource: {}, total: 0 })
    const task: ResourceTask = { id: 't', name: 'T', start: '2026-03-02', end: '2026-03-03', resources: ['zhang'] }
    const empty = computeCost([task], [], { resourceHourly: { zhang: 100 } })
    expect(empty.perTask.t).toBe(0)
    expect(empty.perResource).toEqual({})
  })

  it('I5 回归：带时刻串截断到日 + start>end 自愈交换（对齐核心清洗）', () => {
    const tasks: ResourceTask[] = [
      // 带时刻输入按日粒度截断：03-02 09:00..03-03 18:00 → 2 天 × 8h × 100 = 1600
      { id: 't1', name: '时刻串', start: '2026-03-02 09:00', end: '2026-03-03 18:00', resources: ['zhang'] },
      // start > end 自愈交换：03-02..03-06 = 5 天 × 8h × 50 = 2000
      { id: 't2', name: '倒置', start: '2026-03-06', end: '2026-03-02', resources: ['li'] },
    ]
    const r = computeCost(tasks, ['zhang', 'li'], { resourceHourly: { zhang: 100, li: 50 } })
    expect(r.perTask.t1).toBe(1600)
    expect(r.perTask.t2).toBe(2000)
    expect(r.total).toBe(3600)
  })

  it('I5 回归：原型键名 id（constructor/toString/__proto__）不触发误判，正常计入', () => {
    const tasks: ResourceTask[] = [
      { id: 'constructor', name: 'C', start: '2026-03-02', end: '2026-03-03', resources: ['zhang'] },
      { id: 'toString', name: 'T', start: '2026-03-02', end: '2026-03-03', resources: ['zhang'] },
      { id: '__proto__', name: 'P', start: '2026-03-02', end: '2026-03-03', resources: ['zhang'] },
    ]
    const r = computeCost(tasks, ['zhang'], { resourceHourly: { zhang: 100 } })
    // Object.create(null) 容器：三个任务的 id 都是普通键，互不冲突、不误判重复
    expect(Object.keys(r.perTask).sort()).toEqual(['__proto__', 'constructor', 'toString'])
    expect(r.perTask.constructor).toBe(1600)
    expect(r.perTask.toString).toBe(1600)
    expect(r.perResource.zhang).toBe(4800)
    expect(r.total).toBe(4800)
  })

  it('M1 回归：cost 日期完整锚定——非法时刻(99:99)/截断尾码/Z 后缀的任务跳过', () => {
    const tasks: ResourceTask[] = [
      { id: 'bad1', name: '时刻越界', start: '2026-03-02 99:99', end: '2026-03-03' },
      { id: 'bad2', name: '尾码垃圾', start: '2026-03-02', end: '2026-03-03x' },
      { id: 'bad3', name: 'Z 后缀', start: '2026-03-02', end: '2026-03-03T10:00Z' },
      { id: 'ok', name: 'OK', start: '2026-03-02', end: '2026-03-03', resources: ['zhang'] },
    ]
    const r = computeCost(tasks, ['zhang'], { resourceHourly: { zhang: 100 } })
    expect(Object.keys(r.perTask)).toEqual(['ok'])
    expect(r.perTask.ok).toBe(1600)
  })

  it('跨月与 DST 边界工期按日历日（end 含端）', () => {
    // 2026-03-28..2026-04-02（欧洲夏令时 03-29 切换）= 6 天
    const task: ResourceTask = { id: 't', name: 'T', start: '2026-03-28', end: '2026-04-02', resources: ['zhang'] }
    const r = computeCost([task], ['zhang'], { resourceHourly: { zhang: 100 } })
    expect(r.perTask.t).toBe(4800) // 6 天×8h×100
  })

  it('多任务累计：total = Σ perTask = Σ perResource', () => {
    const tasks: ResourceTask[] = [
      { id: 't1', name: 'T1', start: '2026-03-02', end: '2026-03-03', resources: ['zhang'] },
      { id: 't2', name: 'T2', start: '2026-03-03', end: '2026-03-05', resources: ['zhang', 'li'] },
      { id: 't3', name: 'T3', start: '2026-03-04', end: '2026-03-04' },
    ]
    const r = computeCost(tasks, ['zhang', 'li'], { resourceHourly: { zhang: 100, li: 50 }, taskCost: { t3: 77 } })
    // t1: 2×8×100 = 1600（zhang 全摊）；t2: 3×8×150 = 3600（各 1800）；t3: 77（无分配 → 不分摊）
    expect(r.perTask).toEqual({ t1: 1600, t2: 3600, t3: 77 })
    expect(r.perResource.zhang).toBeCloseTo(1600 + 1800, 10)
    expect(r.perResource.li).toBeCloseTo(1800, 10)
    expect(r.total).toBe(1600 + 3600 + 77)
  })
})
