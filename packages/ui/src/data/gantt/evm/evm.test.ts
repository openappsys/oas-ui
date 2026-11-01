import { describe, expect, it } from 'vitest'
import { computeEvm } from './index.js'
import type { GanttTask } from '../oas-gantt.js'

const RATES = { resourceHourly: { zhang: 100, li: 50 }, taskCost: { fix: 800 } }

describe('gantt/evm computeEvm', () => {
  it('budget：taskCost 优先；资源路径 = 工期天数 × hoursPerDay × 时薪求和', () => {
    const tasks: GanttTask[] = [
      // 2026-03-02..2026-03-06 = 5 天 × 8h × (100 + 50) = 6000
      { id: 'a', name: '开发', start: '2026-03-02', end: '2026-03-06', resources: ['zhang', 'li'] },
      { id: 'fix', name: '整包', start: '2026-03-02', end: '2026-03-06' },
    ]
    const r = computeEvm(tasks, { rates: RATES, statusDate: '2026-03-06' })
    expect(r.byTask[0]?.budget).toBe(6000)
    expect(r.byTask[1]?.budget).toBe(800)
  })

  it('PV：已耗天数比例；statusDate 早于 start → 0；超过 end 封顶为 budget', () => {
    const tasks: GanttTask[] = [
      { id: 'a', name: '五天任务', start: '2026-03-02', end: '2026-03-06', resources: ['zhang'] },
      { id: 'b', name: '未开始', start: '2026-04-01', end: '2026-04-03' },
    ]
    // budget a = 5×8×100 = 4000（用 zhang 单资源）；statusDate=03-03 → 已耗 2/5
    const r = computeEvm(tasks, {
      rates: { resourceHourly: { zhang: 100 } },
      statusDate: '2026-03-03',
    })
    expect(r.byTask[0]?.budget).toBe(4000)
    expect(r.byTask[0]?.planned).toBeCloseTo(1600, 10)
    expect(r.byTask[1]?.planned).toBe(0)
    expect(r.pv).toBeCloseTo(1600, 10)

    // statusDate 晚于 end → 封顶
    const done = computeEvm([tasks[0]!], { rates: { resourceHourly: { zhang: 100 } }, statusDate: '2026-05-01' })
    expect(done.byTask[0]?.planned).toBe(4000)
  })

  it('milestone：工期 0（预算只看 taskCost），start ≤ statusDate 全计 PV', () => {
    const tasks: GanttTask[] = [
      { id: 'm', name: '上线', start: '2026-03-10' },
      { id: 'm2', name: '未到', start: '2026-03-20' },
    ]
    const r = computeEvm(tasks, { rates: { taskCost: { m: 500, m2: 300 } }, statusDate: '2026-03-15' })
    expect(r.byTask[0]?.budget).toBe(500)
    expect(r.byTask[0]?.planned).toBe(500)
    expect(r.byTask[1]?.planned).toBe(0)
  })

  it('EV：progress clamp 0-100；缺省 0', () => {
    const tasks: GanttTask[] = [
      { id: 'a', name: '超界', start: '2026-03-02', end: '2026-03-03', progress: 120 },
      { id: 'b', name: '负值', start: '2026-03-02', end: '2026-03-03', progress: -10 },
      { id: 'c', name: '缺省', start: '2026-03-02', end: '2026-03-03' },
    ]
    const r = computeEvm(tasks, { rates: { taskCost: { a: 100, b: 100, c: 100 } }, statusDate: '2026-03-05' })
    expect(r.byTask[0]?.earned).toBeCloseTo(100, 10)
    expect(r.byTask[1]?.earned).toBe(0)
    expect(r.byTask[2]?.earned).toBe(0)
  })

  it('指标：sv/cv/spi/cpi；pv=0 → spi null；ac=0 → cpi null', () => {
    const r = computeEvm([{ id: 'a', name: '任务', start: '2026-03-02', end: '2026-03-06', progress: 50 }], {
      rates: { taskCost: { a: 1000 } },
      statusDate: '2026-03-04',
      actualCost: 300,
    })
    // 已耗 3/5 → pv 600；ev 500；ac 300
    expect(r.pv).toBeCloseTo(600, 10)
    expect(r.ev).toBeCloseTo(500, 10)
    expect(r.ac).toBe(300)
    expect(r.sv).toBeCloseTo(-100, 10)
    expect(r.cv).toBeCloseTo(200, 10)
    expect(r.spi).toBeCloseTo(500 / 600, 12)
    expect(r.cpi).toBeCloseTo(500 / 300, 12)

    const noAc = computeEvm([{ id: 'a', name: '任务', start: '2026-03-02', end: '2026-03-06', progress: 50 }], {
      rates: { taskCost: { a: 1000 } },
      statusDate: '2026-03-04',
    })
    expect(noAc.ac).toBeCloseTo(500, 10) // 缺省 = ev（中性口径）
    expect(noAc.cpi).toBe(1)

    const early = computeEvm([{ id: 'a', name: '任务', start: '2026-03-02' }], {
      rates: { taskCost: { a: 1000 } },
      statusDate: '2026-01-01',
    })
    expect(early.pv).toBe(0)
    expect(early.spi).toBeNull() // pv = 0 → null
  })

  it('actualCost 为 Record 时逐任务求和（缺键按 0）；statusDate 非法 → PV 全 0', () => {
    const tasks: GanttTask[] = [
      { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06', progress: 100 },
      { id: 'b', name: 'B', start: '2026-03-02', end: '2026-03-06', progress: 50 },
    ]
    const r = computeEvm(tasks, {
      rates: { taskCost: { a: 100, b: 100 } },
      statusDate: '2026-03-06',
      actualCost: { a: 30 },
    })
    expect(r.ac).toBe(30)

    const bad = computeEvm(tasks, { rates: { taskCost: { a: 100, b: 100 } }, statusDate: 'not-a-date' })
    expect(bad.pv).toBe(0)
    expect(bad.spi).toBeNull()
  })

  it('hoursPerDay 覆盖默认 8；hoursPerDay: 0 → 资源路径预算为 0', () => {
    const task: GanttTask[] = [{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-03', resources: ['zhang'] }]
    const custom = computeEvm(task, {
      rates: { resourceHourly: { zhang: 100 } },
      statusDate: '2026-03-02',
      hoursPerDay: 10,
    })
    expect(custom.byTask[0]?.budget).toBe(2000) // 2 天 × 10h × 100
    const zero = computeEvm(task, {
      rates: { resourceHourly: { zhang: 100 } },
      statusDate: '2026-03-02',
      hoursPerDay: 0,
    })
    expect(zero.byTask[0]?.budget).toBe(0)
  })

  it('空输入 / 全非法任务 → 全 0 结果、byTask 空', () => {
    const empty = computeEvm([], { rates: RATES, statusDate: '2026-03-02' })
    expect(empty.pv).toBe(0)
    expect(empty.byTask).toEqual([])
    const invalid = computeEvm(
      [
        { name: '缺id', start: '2026-03-02' },
        { id: 'x', name: '坏日期', start: 'oops' },
      ] as GanttTask[],
      {
        rates: RATES,
        statusDate: '2026-03-02',
      },
    )
    expect(invalid.byTask).toEqual([])
  })

  it('嵌套 children 拍平后参与统计（与清洗层同序）', () => {
    const r = computeEvm(
      [
        {
          id: 's',
          name: '摘要',
          start: '2026-03-02',
          end: '2026-03-06',
          children: [{ id: 'c', name: '子', start: '2026-03-02', end: '2026-03-06', progress: 100 }],
        },
      ],
      { rates: { taskCost: { s: 100, c: 400 } }, statusDate: '2026-03-06' },
    )
    expect(r.byTask.map((t) => t.id)).toEqual(['c'])
    expect(r.ev).toBeCloseTo(400, 10) // 摘要 progress 0，子 100%
  })

  it('I10 回归：摘要（有子级/被 parent 指向）不进 byTask、不进 pv/ev 总额（摘要进度由子级派生）', () => {
    const tasks: GanttTask[] = [
      {
        id: 's',
        name: '嵌套摘要',
        start: '2026-03-02',
        end: '2026-03-06',
        progress: 100, // 若不排除：摘要 + 子双计
        children: [{ id: 'c', name: '子', start: '2026-03-02', end: '2026-03-06', progress: 100 }],
      },
      { id: 'p', name: '扁平父', start: '2026-03-02', end: '2026-03-06', progress: 100 },
      { id: 'k', name: '扁平子', start: '2026-03-02', end: '2026-03-06', progress: 100, parent: 'p' },
    ] as GanttTask[]
    const r = computeEvm(tasks, {
      rates: { taskCost: { s: 100, c: 400, p: 200, k: 200 } },
      statusDate: '2026-03-06',
    })
    // 摘要 s/p 双双排除：只剩 c(400) + k(200)
    expect(r.byTask.map((t) => t.id)).toEqual(['c', 'k'])
    expect(r.ev).toBeCloseTo(600, 10)
    expect(r.pv).toBeCloseTo(600, 10) // statusDate = end：PV 封顶 = budget
  })

  it('I3 回归：显式 type="milestone" 优先——end 忽略、工期 0（预算只看 taskCost、PV 二值）', () => {
    const r = computeEvm(
      [{ id: 'm', name: '上线', start: '2026-03-10', end: '2026-03-14', type: 'milestone', resources: ['zhang'] }],
      { rates: { resourceHourly: { zhang: 100 }, taskCost: { m: 500 } }, statusDate: '2026-03-12' },
    )
    // 预算：milestone 工期 0 → 资源路径 0，只看 taskCost
    expect(r.byTask[0]?.budget).toBe(500)
    // PV：start(03-10) ≤ statusDate(03-12) → 全计（与 end 无关）
    expect(r.byTask[0]?.planned).toBe(500)
    // 未到 statusDate：PV 0
    const early = computeEvm([{ id: 'm', name: '上线', start: '2026-03-20', end: '2026-03-24', type: 'milestone' }], {
      rates: { taskCost: { m: 500 } },
      statusDate: '2026-03-12',
    })
    expect(early.byTask[0]?.planned).toBe(0)
  })

  it('I9 回归：start 晚于 end 自愈交换（工期取绝对差 + 1，预算/ PV 不出现负值）', () => {
    const r = computeEvm([{ id: 'a', name: '倒置', start: '2026-03-06', end: '2026-03-02', resources: ['zhang'] }], {
      rates: { resourceHourly: { zhang: 100 } },
      statusDate: '2026-03-06',
    })
    // 交换后 03-02..03-06 = 5 天 × 8h × 100 = 4000；statusDate 03-06 → PV 封顶
    expect(r.byTask[0]?.budget).toBe(4000)
    expect(r.byTask[0]?.planned).toBe(4000)
    expect(r.pv).toBe(4000)
  })

  it('M1 回归：日期完整锚定——start 非法时刻/尾码/Z 后缀丢弃任务；end 坏日期按核心清洗退化为 milestone', () => {
    const r = computeEvm(
      [
        { id: 'bad1', name: '时刻越界', start: '2026-03-02 99:99', end: '2026-03-06' },
        // end 尾码垃圾：对齐核心清洗（解析失败丢 end 字段）→ 任务保留为 milestone 单点
        { id: 'bad2', name: '尾码垃圾', start: '2026-03-02', end: '2026-03-06x' },
        { id: 'bad3', name: 'Z 后缀', start: '2026-03-02T09:00Z', end: '2026-03-06' },
        { id: 'ok', name: 'OK', start: '2026-03-02 08:00', end: '2026-03-06' },
      ] as GanttTask[],
      { rates: { taskCost: { bad1: 1, bad2: 1, bad3: 1, ok: 100 } }, statusDate: '2026-03-06' },
    )
    // bad1/bad3 的 start 非法被丢弃；bad2 退化为 milestone 单点；ok 带合法时刻按日粒度计
    expect(r.byTask.map((t) => t.id)).toEqual(['bad2', 'ok'])
    expect(r.byTask[0]?.planned).toBe(1) // milestone：statusDate ≥ start 全计
    expect(r.pv).toBe(101) // bad2(1) + ok(100)：PV 总和（EV 另看 progress，此处未给 → 0）
  })
})
