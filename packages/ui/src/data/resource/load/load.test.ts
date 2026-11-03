import { describe, it, expect } from 'vitest'
import { computeResourceLoad } from './index.js'
import type { GanttTask } from '../../gantt/oas-gantt.js'

/** 深拷贝快照：断言输入未被 mutate */
function snapshot<T>(v: T): string {
  return JSON.stringify(v)
}

describe('computeResourceLoad（gantt 资源负荷纯函数）', () => {
  it('单资源单任务日桶：逐日 1，peak=峰值桶（=1），bucketStart=任务首日，bucketDays 全 1', () => {
    const result = computeResourceLoad([
      { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04', resources: ['alice'] },
    ])
    expect(result.unit).toBe('day')
    expect(result.bucketStart).toBe('2026-03-02')
    expect(result.bucketDays).toEqual([1, 1, 1])
    expect(result.resources).toEqual([{ id: 'alice', buckets: [1, 1, 1], peak: 1 }])
  })

  it('跨桶任务：任务横跨多桶按交集拆分（from 早于任务首日的前桶为 0 天——不产生行负荷）', () => {
    const result = computeResourceLoad(
      [{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04', resources: ['alice'] }],
      { from: '2026-03-01', to: '2026-03-05' },
    )
    expect(result.bucketDays).toEqual([1, 1, 1, 1, 1])
    expect(result.resources[0]!.buckets).toEqual([0, 1, 1, 1, 0])
  })

  it('跨桶粒度 week：单桶吞并多日覆盖（任务 5 天落入一个周桶 → 该桶 5）', () => {
    const result = computeResourceLoad(
      [{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06', resources: ['alice'] }],
      { unit: 'week', from: '2026-03-02', to: '2026-03-08' },
    )
    expect(result.unit).toBe('week')
    // 2026-03-02 是周一 → 桶 [03-02..03-08]，整桶 7 天，覆盖 5 天
    expect(result.bucketStart).toBe('2026-03-02')
    expect(result.bucketDays).toEqual([7])
    expect(result.resources[0]!.buckets).toEqual([5])
    expect(result.resources[0]!.peak).toBe(5)
  })

  it('相切任务不重复累计：A 末日 < B 首日，各覆盖日只计 1（与超配检测「相切不算」同口径）', () => {
    const result = computeResourceLoad([
      { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-03', resources: ['alice'] },
      { id: 'b', name: 'B', start: '2026-03-04', end: '2026-03-06', resources: ['alice'] },
    ])
    expect(result.resources[0]!.buckets).toEqual([1, 1, 1, 1, 1])
    expect(result.resources[0]!.peak).toBe(1)
  })

  it('同桶重叠逐任务累计：共享一天 → 该桶 2 > 桶天数 1（>100% 超配可视化语义）', () => {
    const result = computeResourceLoad([
      { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04', resources: ['alice'] },
      { id: 'b', name: 'B', start: '2026-03-04', end: '2026-03-06', resources: ['alice'] },
    ])
    // 03-04 被 A、B 同时覆盖 → 计 2
    expect(result.resources[0]!.buckets).toEqual([1, 1, 2, 1, 1])
    expect(result.resources[0]!.peak).toBe(2)
  })

  it('里程碑按点计 0 天：不产生行、不占桶（显式 type 与缺 end 两种形态）', () => {
    const result = computeResourceLoad([
      { id: 'm1', name: '甲', type: 'milestone', start: '2026-03-05', resources: ['alice'] },
      { id: 'm2', name: '乙', start: '2026-03-05', resources: ['alice'] },
    ])
    expect(result.resources).toEqual([])
    expect(result.bucketStart).toBe('')
    expect(result.bucketDays).toEqual([])
  })

  it('summary 不参与：显式 type summary / 有 children / 被 parent 指针引用都不参与；引用者（叶子）照常参与', () => {
    const result = computeResourceLoad(
      [
        { id: 'sum', name: '汇总', type: 'summary', start: '2026-03-02', end: '2026-03-08', resources: ['alice'] },
        { id: 'w1', name: '子一', start: '2026-03-03', end: '2026-03-05', parent: 'sum', resources: ['alice'] },
        {
          id: 'grp',
          name: '组',
          start: '2026-03-02',
          end: '2026-03-08',
          resources: ['alice'],
          children: [{ id: 'c1', name: '嵌套子', start: '2026-03-04', end: '2026-03-06', resources: ['alice'] }],
        },
      ],
      // 显式区间盖住三任务全跨度，排除「默认区间取参与任务」的干扰
      { from: '2026-03-02', to: '2026-03-08' },
    )
    // sum（显式 summary）/ grp（有 children，聚合形态）不参与；w1 与嵌套拍平的 c1（叶子）参与：
    // w1 覆盖 03-03..03-05，c1 覆盖 03-04..03-06
    expect(result.resources.map((r) => ({ id: r.id, buckets: r.buckets }))).toEqual([
      { id: 'alice', buckets: [0, 1, 2, 2, 1, 0, 0] },
    ])
    expect(result.bucketDays).toEqual([1, 1, 1, 1, 1, 1, 1])
  })

  it('清洗：缺名 / 非法 start 丢弃；非法 end 按里程碑；end 颠倒自愈交换；00:00 末日按前一日', () => {
    const result = computeResourceLoad([
      { id: 'x1', start: '2026-03-02', end: '2026-03-03', resources: ['alice'] }, // 缺名 → 丢弃
      { id: 'x2', name: 'B', start: 'bad', end: '2026-03-03', resources: ['alice'] }, // 非法 start → 丢弃
      { id: 'x3', name: 'C', start: '2026-03-02', end: 'nope', resources: ['alice'] }, // 非法 end → 里程碑 → 不参与
      { id: 'x4', name: 'D', start: '2026-03-05', end: '2026-03-03', resources: ['alice'] }, // 颠倒 → 交换为 3 天
      { id: 'x5', name: 'E', start: '2026-03-02', end: '2026-03-06 00:00', resources: ['alice'] }, // 00:00 → 末日 03-05
    ])
    // 有效：x4 [03-03..03-05]（交换）+ x5 [03-02..03-05]（00:00 末日按前一日 03-05）
    expect(result.bucketStart).toBe('2026-03-02')
    expect(result.bucketDays).toEqual([1, 1, 1, 1])
    expect(result.resources).toEqual([{ id: 'alice', buckets: [1, 2, 2, 2], peak: 2 }])
  })

  it('清洗 resources：非字符串/空串过滤、trim、去重；无有效 resources 的任务不参与', () => {
    const result = computeResourceLoad([
      {
        id: 'a',
        name: 'A',
        start: '2026-03-02',
        end: '2026-03-02',
        resources: [' alice ', 'alice', '', 42 as unknown as string, 'bob'],
      },
      { id: 'b', name: 'B', start: '2026-03-02', end: '2026-03-02', resources: [] },
    ])
    expect(result.resources.map((r) => r.id)).toEqual(['alice', 'bob'])
    expect(result.resources[0]!.buckets).toEqual([1])
    expect(result.resources[1]!.buckets).toEqual([1])
  })

  it('池外 id 一样列出（负荷视图不要求登记池）；rows 按资源首次出现序', () => {
    const result = computeResourceLoad([
      { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-02', resources: ['ghost', 'zed'] },
      { id: 'b', name: 'B', start: '2026-03-02', end: '2026-03-02', resources: ['ghost'] },
    ])
    expect(result.resources.map((r) => r.id)).toEqual(['ghost', 'zed'])
    expect(result.resources.every((r) => r.name === undefined)).toBe(true)
  })

  it('pool 名称：命中取池名称；池外 id 无 name；同 id 保留池末次登记（对齐 register 覆盖语义）', () => {
    const result = computeResourceLoad(
      [
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-02', resources: ['alice', 'ghost'] },
        { id: 'b', name: 'B', start: '2026-03-02', end: '2026-03-02', resources: ['zed'] },
      ],
      {
        pool: [
          { id: 'alice', name: '张三' },
          { id: 'zed', name: '' }, // 空名不收录
          { id: 'alice', name: '张三三' }, // 末次覆盖
        ],
      },
    )
    expect(result.resources[0]).toEqual({ id: 'alice', name: '张三三', buckets: [1], peak: 1 })
    expect(result.resources[1]).toEqual({ id: 'ghost', buckets: [1], peak: 1 })
    expect(result.resources[2]).toEqual({ id: 'zed', buckets: [1], peak: 1 })
  })

  it('unit 归一：非法值回落 day；week/month 原样保留', () => {
    const tasks = [{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-02', resources: ['alice'] }]
    expect(computeResourceLoad(tasks, { unit: 'quarter' as 'day' }).unit).toBe('day')
    expect(computeResourceLoad(tasks).unit).toBe('day')
    expect(computeResourceLoad(tasks, { unit: 'month' }).unit).toBe('month')
  })

  it('week 桶锚定：bucketStart 对齐 weekStart 起始周；首尾桶按区间裁剪为部分桶', () => {
    // 2026-03-05 是周四；weekStart=1（周一）→ 桶 0 = [03-02..03-08]，裁剪 [03-05..03-08] = 4 天
    const result = computeResourceLoad(
      [{ id: 'a', name: 'A', start: '2026-03-05', end: '2026-03-06', resources: ['alice'] }],
      { unit: 'week', from: '2026-03-05', to: '2026-03-08' },
    )
    expect(result.bucketStart).toBe('2026-03-02')
    expect(result.bucketDays).toEqual([4])
    expect(result.resources[0]!.buckets).toEqual([2])
  })

  it('week 桶锚定 weekStart=0（周日）：锚点落到周日', () => {
    // 2026-03-05 周四；weekStart=0 → 桶 0 = [03-01(周日)..03-07]
    const result = computeResourceLoad(
      [{ id: 'a', name: 'A', start: '2026-03-05', end: '2026-03-05', resources: ['alice'] }],
      { unit: 'week', weekStart: 0, from: '2026-03-05', to: '2026-03-05' },
    )
    expect(result.bucketStart).toBe('2026-03-01')
    expect(result.bucketDays).toEqual([1])
  })

  it('month 桶：锚定当月 1 日，月长按自然月（2026-02=28 天、2026-03=31 天）', () => {
    const result = computeResourceLoad(
      [
        { id: 'a', name: 'A', start: '2026-02-26', end: '2026-03-02', resources: ['alice'] },
        { id: 'b', name: 'B', start: '2026-03-30', end: '2026-03-31', resources: ['alice'] },
      ],
      { unit: 'month', from: '2026-02-01', to: '2026-03-31' },
    )
    expect(result.bucketStart).toBe('2026-02-01')
    expect(result.bucketDays).toEqual([28, 31])
    // 2 月覆盖 26-28 = 3 天；3 月覆盖 03-01..03-02 + 03-30..03-31 = 4 天
    expect(result.resources[0]!.buckets).toEqual([3, 4])
  })

  it('from/to：显式值裁剪任务区间；颠倒自动交换；非法值回落任务推导', () => {
    const tasks = [{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06', resources: ['alice'] }]
    const clipped = computeResourceLoad(tasks, { from: '2026-03-04', to: '2026-03-08' })
    expect(clipped.bucketStart).toBe('2026-03-04')
    expect(clipped.bucketDays).toEqual([1, 1, 1, 1, 1])
    expect(clipped.resources[0]!.buckets).toEqual([1, 1, 1, 0, 0])
    const swapped = computeResourceLoad(tasks, { from: '2026-03-08', to: '2026-03-04' })
    expect(swapped.bucketDays).toEqual(clipped.bucketDays)
    const fallback = computeResourceLoad(tasks, { from: 'nope', to: 'also-bad' })
    expect(fallback.bucketStart).toBe('2026-03-02')
    expect(fallback.bucketDays).toEqual([1, 1, 1, 1, 1])
  })

  it('确定性：同输入两次调用逐项相同；资源序 = 首次出现序；输入不被 mutate', () => {
    const tasks: GanttTask[] = [
      { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-08', resources: ['bob', 'alice'] },
      { id: 'b', name: 'B', start: '2026-03-04', end: '2026-03-06', resources: ['alice'] },
    ]
    const before = snapshot(tasks)
    const r1 = computeResourceLoad(tasks)
    const r2 = computeResourceLoad(tasks)
    expect(snapshot(tasks)).toBe(before)
    expect(r1).toEqual(r2)
    expect(r1.resources.map((r) => r.id)).toEqual(['bob', 'alice'])
    // alice: 03-02..03-08(7) + 03-04..03-06(3) → 每日 2；bob: 每日 1
    expect(r1.resources[1]!.buckets).toEqual([1, 1, 2, 2, 2, 1, 1])
    expect(r1.resources[1]!.peak).toBe(2)
    expect(r1.resources[0]!.buckets).toEqual([1, 1, 1, 1, 1, 1, 1])
  })

  it('空数据 / 无有效任务：空 rows、bucketStart 空、bucketDays 空', () => {
    expect(computeResourceLoad([])).toEqual({ resources: [], bucketStart: '', bucketDays: [], unit: 'day' })
    expect(computeResourceLoad([null, 42, 'x'] as unknown as GanttTask[]).resources).toEqual([])
    expect(computeResourceLoad([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-03' }]).resources).toEqual([])
  })

  it('桶数防御上限：超长区间截断到 MAX_BUCKETS 个桶（不卡死）', () => {
    const result = computeResourceLoad(
      [{ id: 'a', name: 'A', start: '2000-01-01', end: '2000-01-01', resources: ['alice'] }],
      { from: '2000-01-01', to: '9999-12-31' },
    )
    expect(result.bucketDays.length).toBeLessThanOrEqual(5000)
  })
})
