import { describe, expect, it } from 'vitest'
import { expandRecurring } from './index.js'
import type { GanttRecurringRule, GanttRecurringTask } from './index.js'
import type { GanttTask } from '../oas-gantt.js'

/** 2026-03 布局：03-01(日) 03-02(一) … 03-07(六) 03-08(日) 03-09(一) … 03-31(二) */
describe('gantt/recurring expandRecurring', () => {
  it('daily：窗口内逐日展开，实例 id/字段/工期平移正确，master 默认剔除', () => {
    const master: GanttRecurringTask = {
      id: 'r',
      name: '日会',
      start: '2026-03-02',
      end: '2026-03-03',
      progress: 60,
      project: 'p1',
      dependencies: [{ id: 'x' }],
      recurring: { freq: 'daily' },
    }
    const out = expandRecurring([master], { start: '2026-03-04', end: '2026-03-06' })
    // master 剔除；窗口内 03-04..03-06 三例（03-02/03 在窗口前被过滤）
    // seq = 序列内发生序号（含窗外）→ 首例是第 3 次发生
    expect(out.map((t) => t.id)).toEqual(['r#3', 'r#4', 'r#5'])
    const first = out[0]!
    expect(first.masterId).toBe('r')
    expect(first.recurringInstance).toBe(true)
    expect(first.start).toBe('2026-03-04')
    expect(first.end).toBe('2026-03-05') // 工期 1 天平移
    expect(first.progress).toBe(0)
    expect(first.name).toBe('日会')
    expect(first.project).toBe('p1')
    expect(first.dependencies).toBeUndefined() // v1 剥除依赖
    expect((first as GanttRecurringTask).recurring).toBeUndefined() // 剥除规则防二次展开
    expect(out[2]?.start).toBe('2026-03-06')
  })

  it('keepMaster: true 保留 master；seq 仍从 1 起按输出序', () => {
    const master: GanttRecurringTask = {
      id: 'r',
      name: '周报',
      start: '2026-03-02',
      recurring: { freq: 'weekly' },
    }
    const out = expandRecurring([master], { start: '2026-03-02', end: '2026-03-16' }, { keepMaster: true })
    expect(out[0]?.id).toBe('r')
    expect(out[0]?.start).toBe('2026-03-02')
    // 周一缺省 byWeekday=[1]：03-02(一)、03-09(一)、03-16(一)——master 自身日期也是首例
    expect(out.map((t) => t.id)).toEqual(['r', 'r#1', 'r#2', 'r#3'])
    expect(out[1]?.start).toBe('2026-03-02')
    expect(out[2]?.start).toBe('2026-03-09')
    expect(out[3]?.start).toBe('2026-03-16')
  })

  it('weekly + byWeekday：周二/周四双发；interval=2 隔周；输出时间序', () => {
    const master: GanttRecurringTask = {
      id: 'w',
      name: '双周会',
      start: '2026-03-03', // 周二
      recurring: { freq: 'weekly', byWeekday: [2, 4], interval: 2 },
    }
    const out = expandRecurring([master], { start: '2026-03-01', end: '2026-03-31' })
    // 锚点周（03-02 周一起）：03-03(二)、03-05(四)；隔周：03-17(二)、03-19(四)、03-31(二)
    expect(out.map((t) => t.start)).toEqual(['2026-03-03', '2026-03-05', '2026-03-17', '2026-03-19', '2026-03-31'])
    expect(out.map((t) => t.id)).toEqual(['w#1', 'w#2', 'w#3', 'w#4', 'w#5'])
  })

  it('weekly：周日（0）归属锚点周且时间序正确；缺省 byWeekday = start 的星期', () => {
    const sunday: GanttRecurringTask = {
      id: 'sun',
      name: '周日',
      start: '2026-03-08', // 周日
      recurring: { freq: 'weekly', byWeekday: [0] },
    }
    const out = expandRecurring([sunday], { start: '2026-03-08', end: '2026-03-22' })
    expect(out.map((t) => t.start)).toEqual(['2026-03-08', '2026-03-15', '2026-03-22'])

    // 缺省 byWeekday：master start 是周三 → 每周三
    const wed: GanttRecurringTask = { id: 'wd', name: 'W', start: '2026-03-04', recurring: { freq: 'weekly' } }
    const outWd = expandRecurring([wed], { start: '2026-03-01', end: '2026-03-20' })
    expect(outWd.map((t) => t.start)).toEqual(['2026-03-04', '2026-03-11', '2026-03-18'])
  })

  it('monthly：同月日；interval 跨月；短月无该日跳过（1 月 31 日 → 2 月无 → 3 月 31 日）', () => {
    const master: GanttRecurringTask = {
      id: 'm',
      name: '月末',
      start: '2026-01-31',
      recurring: { freq: 'monthly' },
    }
    const out = expandRecurring([master], { start: '2026-01-01', end: '2026-05-31' })
    expect(out.map((t) => t.start)).toEqual(['2026-01-31', '2026-03-31', '2026-05-31'])

    const quarter: GanttRecurringTask = {
      id: 'q',
      name: 'Q',
      start: '2026-01-15',
      recurring: { freq: 'monthly', interval: 3 },
    }
    const outQ = expandRecurring([quarter], { start: '2026-01-01', end: '2026-12-31' })
    expect(outQ.map((t) => t.start)).toEqual(['2026-01-15', '2026-04-15', '2026-07-15', '2026-10-15'])
  })

  it('daily + interval：隔 N 天；count 计整个序列（含窗口前发生）', () => {
    const master: GanttRecurringTask = {
      id: 'd2',
      name: '隔日',
      start: '2026-03-01',
      recurring: { freq: 'daily', interval: 2, count: 3 },
    }
    // 发生序列 03-01、03-03、03-05、03-07…；count 3 → 前 3 次后终止；窗口只罩住 03-05
    const out = expandRecurring([master], { start: '2026-03-05', end: '2026-03-20' })
    expect(out.map((t) => t.start)).toEqual(['2026-03-05'])
    expect(out[0]?.id).toBe('d2#3') // seq 按输出序，但它是序列第 3 次发生

    // count 在窗口内用尽：03-01 起 count 2 → 窗口 03-01..03-10 只得 2 例
    const master2: GanttRecurringTask = {
      id: 'd3',
      name: 'D',
      start: '2026-03-01',
      recurring: { freq: 'daily', count: 2 },
    }
    expect(expandRecurring([master2], { start: '2026-03-01', end: '2026-03-10' }).map((t) => t.start)).toEqual([
      '2026-03-01',
      '2026-03-02',
    ])
  })

  it('until：发生晚于截止日终止序列', () => {
    const master: GanttRecurringTask = {
      id: 'u',
      name: 'U',
      start: '2026-03-01',
      recurring: { freq: 'daily', until: '2026-03-03' },
    }
    const out = expandRecurring([master], { start: '2026-03-01', end: '2026-03-31' })
    expect(out.map((t) => t.start)).toEqual(['2026-03-01', '2026-03-02', '2026-03-03'])
  })

  it('milestone master（无 end）：实例无 end；hour 成分保留；工期平移带成分', () => {
    const ms: GanttRecurringTask = {
      id: 'ms',
      name: '里程碑',
      start: '2026-03-02 09:30',
      recurring: { freq: 'daily' },
    }
    const out = expandRecurring([ms], { start: '2026-03-03', end: '2026-03-04' })
    expect(out[0]?.start).toBe('2026-03-03 09:30')
    expect(out[0]?.end).toBeUndefined()

    const withEnd: GanttRecurringTask = {
      id: 'he',
      name: 'H',
      start: '2026-03-02 08:00',
      end: '2026-03-04 18:00',
      recurring: { freq: 'daily' },
    }
    const outHe = expandRecurring([withEnd], { start: '2026-03-10', end: '2026-03-10' })
    // 工期 2 天平移：03-10 + 2 = 03-12；end 成分 18:00 保留
    expect(outHe[0]?.start).toBe('2026-03-10 08:00')
    expect(outHe[0]?.end).toBe('2026-03-12 18:00')
  })

  it('非周期任务原样透传（引用相等）；非法 recurring 视为普通任务', () => {
    const plain: GanttTask = { id: 'p', name: '普通', start: '2026-03-02', end: '2026-03-03' }
    const badRule: GanttRecurringTask = {
      id: 'b',
      name: '坏规则',
      start: '2026-03-02',
      recurring: { freq: 'yearly' as 'daily' },
    }
    const noStart: GanttRecurringTask = { id: 'ns', name: '无日期', start: 'oops', recurring: { freq: 'daily' } }
    const noId: GanttRecurringTask = {
      name: '无id',
      start: '2026-03-02',
      recurring: { freq: 'daily' },
    } as GanttRecurringTask
    const out = expandRecurring([plain, badRule, noStart, noId], { start: '2026-03-01', end: '2026-03-31' })
    expect(out).toEqual([plain, badRule, noStart, noId])
    expect(out[0]).toBe(plain)
  })

  it('range 非法 / 窗口外 master → 无实例输出', () => {
    const master: GanttRecurringTask = { id: 'r', name: 'R', start: '2026-06-01', recurring: { freq: 'daily' } }
    expect(expandRecurring([master], { start: '2026-03-01', end: '2026-03-31' })).toEqual([])
    expect(expandRecurring([master], { start: 'bad', end: '2026-03-31' })).toEqual([])
    expect(expandRecurring([master], { start: '2026-03-31', end: '2026-03-01' })).toEqual([])
  })

  it('嵌套 children：master 带 children 原样透传（keepMaster/非周期）；实例剥 children；非对象项跳过', () => {
    const master: GanttRecurringTask = {
      id: 'r',
      name: 'R',
      start: '2026-03-02',
      recurring: { freq: 'daily' },
      children: [{ id: 'c', name: '子', start: '2026-03-02', end: '2026-03-03' }],
    }
    // keepMaster：master 原样保留（children 在），实例剥 children（I7）
    const withMaster = expandRecurring(
      [master, null as unknown as GanttTask],
      { start: '2026-03-03', end: '2026-03-03' },
      { keepMaster: true },
    )
    expect(withMaster.length).toBe(2)
    expect(withMaster[0]?.children).toHaveLength(1) // master 原样
    expect(withMaster[1]?.children).toBeUndefined() // 实例剥 children
    // 非 keepMaster：master 被剔除、children 随之消失（master 的子树不独立展开，v1 口径）
    const noMaster = expandRecurring([master], { start: '2026-03-03', end: '2026-03-03' })
    expect(noMaster.length).toBe(1)
    expect(noMaster[0]?.children).toBeUndefined()
  })

  it('DST 安全：跨夏令时切换的逐日展开不漂移', () => {
    // 2026 美国夏令时 03-08 切换；逐日序列应严格按日历日
    const master: GanttRecurringTask = { id: 'dst', name: 'D', start: '2026-03-07', recurring: { freq: 'daily' } }
    const out = expandRecurring([master], { start: '2026-03-07', end: '2026-03-10' })
    expect(out.map((t) => t.start)).toEqual(['2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10'])
  })

  it('I7 回归：实例剥掉 children；数组字段切片克隆；type summary 强转为 task', () => {
    const resourceList = ['zhang', 'li']
    const master: GanttRecurringTask = {
      id: 'r',
      name: 'R',
      start: '2026-03-02',
      end: '2026-03-03',
      type: 'summary',
      resources: resourceList,
      deadlines: ['2026-03-15', '2026-03-20'],
      recurring: { freq: 'daily' },
      children: [{ id: 'c', name: '子', start: '2026-03-02', end: '2026-03-03' }],
    }
    const out = expandRecurring([master], { start: '2026-03-03', end: '2026-03-04' })
    expect(out.length).toBe(2)
    for (const inst of out) {
      expect(inst.children).toBeUndefined() // 实例不带子级（否则 N 份重复子行）
      expect(inst.type).toBe('task') // summary 强转 task（带 children 的 recurring summary 语义可疑，v1 不继承摘要性）
      expect(inst.resources).toEqual(['zhang', 'li'])
      expect(inst.resources).not.toBe(resourceList) // 切片克隆：与 master 的数组引用隔离
      expect(inst.deadlines).toEqual(['2026-03-15', '2026-03-20'])
      expect(inst.deadlines).not.toBe(master.deadlines)
    }
    // master 自身不被改动（children/数组原样保留）
    expect(master.children).toHaveLength(1)
    expect(master.type).toBe('summary')
    expect(master.resources).toBe(resourceList)
  })

  it('I8 回归：count ≤ 0 / 非有限 → 规则无效不展开（master 视为普通任务透传）；until 非法同样不展开', () => {
    const base = (rule: GanttRecurringRule): GanttRecurringTask => ({
      id: 'r',
      name: 'R',
      start: '2026-03-02',
      recurring: rule,
    })
    // count 0 / 负数 / NaN → 不展开
    for (const rule of [
      { freq: 'daily' as const, count: 0 },
      { freq: 'daily' as const, count: -3 },
      { freq: 'daily' as const, count: Number.NaN },
    ]) {
      const out = expandRecurring([base(rule)], { start: '2026-03-01', end: '2026-03-05' })
      expect(out.map((t) => t.id)).toEqual(['r'])
      expect((out[0] as GanttRecurringTask).recurring).toEqual(rule)
    }
    // until 非法 → 不展开
    const badUntil = expandRecurring([base({ freq: 'daily', until: 'not-a-date' })], {
      start: '2026-03-01',
      end: '2026-03-05',
    })
    expect(badUntil.map((t) => t.id)).toEqual(['r'])
    // 对照：count ≥ 1 正常展开（发生自 master start 起，不从窗口起点起）
    const ok = expandRecurring([base({ freq: 'daily', count: 2 })], { start: '2026-03-01', end: '2026-03-05' })
    expect(ok.map((t) => t.start)).toEqual(['2026-03-02', '2026-03-03'])
  })

  it('M1 回归：recurring 日期完整锚定——start 非法时刻/尾码/Z 后缀的 master 视为普通任务；range 同样拒绝', () => {
    const okRule = { freq: 'daily' as const }
    // master start 带非法时刻 → 不展开
    const badStart = expandRecurring(
      [{ id: 'a', name: 'A', start: '2026-03-02 99:99', recurring: okRule } as GanttRecurringTask],
      { start: '2026-03-01', end: '2026-03-05' },
    )
    expect(badStart.map((t) => t.id)).toEqual(['a'])
    // range.start 非法时刻 → 窗口无效 → 不生成发生；master 默认剔除 → 输出空
    const m: GanttRecurringTask = { id: 'b', name: 'B', start: '2026-03-02', recurring: okRule }
    expect(expandRecurring([m], { start: '2026-03-01 99:99', end: '2026-03-05' }).map((t) => t.id)).toEqual([])
    expect(
      expandRecurring([m], { start: '2026-03-01 99:99', end: '2026-03-05' }, { keepMaster: true }).map((t) => t.id),
    ).toEqual(['b'])
    // 合法时刻成分照常
    const okTime = expandRecurring(
      [{ id: 'c', name: 'C', start: '2026-03-02 09:00', recurring: okRule } as GanttRecurringTask],
      { start: '2026-03-03', end: '2026-03-03' },
    )
    expect(okTime[0]?.start).toBe('2026-03-03 09:00')
  })
})
