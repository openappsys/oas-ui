import { describe, expect, it } from 'vitest'
import { computeLateDates } from './index.js'
import type { GanttTask } from '../oas-gantt.js'

/** 2026-03 布局：03-02(一) 03-03(二) 03-04(三) 03-05(四) 03-06(五) 03-07(六) 03-08(日) */
describe('gantt/alap computeLateDates', () => {
  it('fs 链：关键链全零浮时，独立短任务浮时 = 项目右界差', () => {
    const tasks: GanttTask[] = [
      { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04', dependencies: [] },
      { id: 'b', name: 'B', start: '2026-03-05', end: '2026-03-05', dependencies: [{ id: 'a' }] },
      { id: 'c', name: 'C', start: '2026-03-06', end: '2026-03-06', dependencies: [{ id: 'b' }] },
      // 独立任务：Mon..Tue（2 天），项目右界 = C 的 03-06
      { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-03' },
    ]
    const r = computeLateDates(tasks)
    const byId = new Map(r.map((x) => [x.id, x]))
    // 链 a→b→c 全关键：a 03-02..03-04、b 03-05、c 03-06
    expect(byId.get('a')).toEqual({ id: 'a', lateStart: '2026-03-02', lateFinish: '2026-03-04', totalFloatDays: 0 })
    expect(byId.get('b')).toEqual({ id: 'b', lateStart: '2026-03-05', lateFinish: '2026-03-05', totalFloatDays: 0 })
    expect(byId.get('c')).toEqual({ id: 'c', lateStart: '2026-03-06', lateFinish: '2026-03-06', totalFloatDays: 0 })
    // d 可自由延到 03-05..03-06：浮时 3 天
    expect(byId.get('d')).toEqual({ id: 'd', lateStart: '2026-03-05', lateFinish: '2026-03-06', totalFloatDays: 3 })
  })

  it('milestone（无 end）工期 0：fs 前置回推正确、自身 lateStart = lateFinish', () => {
    const tasks: GanttTask[] = [
      { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04' },
      { id: 'm', name: '上线', start: '2026-03-05', dependencies: [{ id: 'a' }] },
    ]
    const byId = new Map(computeLateDates(tasks).map((x) => [x.id, x]))
    expect(byId.get('a')).toEqual({ id: 'a', lateStart: '2026-03-02', lateFinish: '2026-03-04', totalFloatDays: 0 })
    expect(byId.get('m')).toEqual({ id: 'm', lateStart: '2026-03-05', lateFinish: '2026-03-05', totalFloatDays: 0 })
  })

  it('I3 回归：显式 type="milestone" 优先——end 被忽略、工期按 0（对齐核心 endMsOfTask）', () => {
    const tasks: GanttTask[] = [
      // m 显式 milestone 但带 end：end 必须被忽略（工期 0），后继 a 依赖 m（依赖写在后继侧）
      { id: 'm', name: '上线', start: '2026-03-05', end: '2026-03-08', type: 'milestone' },
      { id: 'a', name: 'A', start: '2026-03-06', end: '2026-03-08', dependencies: [{ id: 'm' }] },
    ]
    const byId = new Map(computeLateDates(tasks).map((x) => [x.id, x]))
    // end 被忽略：m 工期 0、endPos = 03-05 位；fs：LF_m = LS_a = 03-06 位 → m 最晚 03-06，浮时 1
    // （若 end 未被忽略：m dur 4 抬高右界到 03-08，LF_m = LS_a = 03-06 位 → ls_m = 03-02，浮时 −3）
    expect(byId.get('m')).toEqual({ id: 'm', lateStart: '2026-03-06', lateFinish: '2026-03-06', totalFloatDays: 1 })
    expect(byId.get('a')).toEqual({ id: 'a', lateStart: '2026-03-06', lateFinish: '2026-03-08', totalFloatDays: 0 })
  })

  it('I2 回归：摘要（有子级）不进依赖图、不参与 projectEnd、不在输出中列出（对齐核心 criticalPathIds）', () => {
    const tasks: GanttTask[] = [
      {
        id: 's',
        name: '摘要',
        start: '2026-03-02',
        end: '2026-03-31', // 摘要自身日期若参与会把项目右界拉到 03-31——必须被排除
        children: [{ id: 'c', name: '子', start: '2026-03-02', end: '2026-03-03' }],
      },
      { id: 'x', name: 'X', start: '2026-03-06', end: '2026-03-06', dependencies: [{ id: 'c' }] },
    ]
    const r = computeLateDates(tasks)
    // 摘要被排除后：项目右界 = x 的 03-06；x 被 fs 钉在 c 后，浮时 0；s 不在输出
    // （若摘要参与：右界 03-31 → c 浮时 5、x 浮时 4，均虚高）
    expect(r.map((v) => v.id)).toEqual(['c', 'x'])
    expect(r.find((v) => v.id === 'c')).toEqual({
      id: 'c',
      lateStart: '2026-03-04',
      lateFinish: '2026-03-05',
      totalFloatDays: 2,
    })
    expect(r.find((v) => v.id === 'x')).toEqual({
      id: 'x',
      lateStart: '2026-03-06',
      lateFinish: '2026-03-06',
      totalFloatDays: 0,
    })
  })

  it('I2 回归：扁平显式 parent 指针同样判定摘要（对齐核心 childStructure 的指针口径）', () => {
    const tasks: GanttTask[] = [
      { id: 'p', name: '父', start: '2026-03-02', end: '2026-03-20' },
      { id: 'k', name: '子', start: '2026-03-02', end: '2026-03-02', parent: 'p' },
    ] as GanttTask[]
    const r = computeLateDates(tasks)
    expect(r.map((x) => x.id)).toEqual(['k'])
    // 右界取 k 自身（03-02）：浮时 0
    expect(r[0]).toEqual({ id: 'k', lateStart: '2026-03-02', lateFinish: '2026-03-02', totalFloatDays: 0 })
  })

  it('I11 回归：lag 非有限按 0；|lag| 超 11574 天安全域按 0（对齐核心 sanitizeLag）；输出无 NaN', () => {
    const tasks: GanttTask[] = [
      { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04' },
      {
        id: 'b',
        name: 'B',
        start: '2026-03-08',
        end: '2026-03-08',
        dependencies: [
          { id: 'a', lag: Number.NaN },
          { id: 'a', lag: 1e8 },
        ],
      },
    ]
    const r = computeLateDates(tasks)
    // 两个非法 lag 都按 0：fs → LF_a = LS_b = 03-08 位（106）→ A 最晚 03-05..03-07，浮时 3
    expect(r.find((x) => x.id === 'a')).toEqual({
      id: 'a',
      lateStart: '2026-03-05',
      lateFinish: '2026-03-07',
      totalFloatDays: 3,
    })
    expect(r.find((x) => x.id === 'b')).toEqual({
      id: 'b',
      lateStart: '2026-03-08',
      lateFinish: '2026-03-08',
      totalFloatDays: 0,
    })
    for (const x of r) {
      expect(Number.isFinite(x.totalFloatDays)).toBe(true)
      expect(x.lateStart).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(x.lateFinish).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
    // lag 恰在安全域内（11574 天）保留：fs → LF_a = LS_b − 11574 = 106 − 11574 = −11468
    // → A 最晚开始位置 −11470、浮时 −11570（精确值由测试内独立换算，非弱断言）
    const toDay = (idx: number): string => {
      const dt = new Date(1970, 0, 1 + idx)
      const mo = String(dt.getMonth() + 1).padStart(2, '0')
      const d = String(dt.getDate()).padStart(2, '0')
      return `${dt.getFullYear()}-${mo}-${d}`
    }
    const edge = computeLateDates([
      { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04' },
      { id: 'b', name: 'B', start: '2026-03-08', end: '2026-03-08', dependencies: [{ id: 'a', lag: 11574 }] },
    ])
    const ae = edge.find((x) => x.id === 'a')!
    const bIdx = Math.round(Date.UTC(2026, 2, 8) / 86_400_000) // 03-08 的 epoch 日索引
    const lfA = bIdx - 11574 // LF_a = LS_b − lag；ls_b = endPos_b − dur_b = (bIdx+1) − 1 = bIdx
    const startA = bIdx - 6 // 03-02
    expect(ae.totalFloatDays).toBe(lfA - 3 - startA) // ls_a = lf_a − dur_a(3)；float = ls_a − start
    expect(ae.lateStart).toBe(toDay(lfA - 3))
    expect(ae.lateFinish).toBe(toDay(lfA - 1))
  })

  it('M1 回归：日期串完整锚定——非法时刻(99:99)、截断尾码、Z 后缀一律拒绝', () => {
    const tasks: GanttTask[] = [
      { id: 'bad1', name: '时刻越界', start: '2026-03-02 99:99' },
      { id: 'bad2', name: '尾码垃圾', start: '2026-03-02x' },
      { id: 'bad3', name: 'Z 后缀', start: '2026-03-02T09:00Z' },
      { id: 'ok', name: 'OK', start: '2026-03-06', end: '2026-03-06' },
    ] as GanttTask[]
    // 三个坏 start 的任务不产出（对齐核心 parseISODate 同样拒绝），ok 单独成图
    const r = computeLateDates(tasks)
    expect(r.map((x) => x.id)).toEqual(['ok'])
    expect(r[0]).toEqual({ id: 'ok', lateStart: '2026-03-06', lateFinish: '2026-03-06', totalFloatDays: 0 })
  })

  it('fs + lag：正值 lag 推迟后继（同日期无 lag 时浮时 2，lag 2 时收为 0）', () => {
    // A 03-02..03-04，B 03-07..03-08 依赖 A（fs）；依赖写在后继 B 上（dependencies = 被 B 依赖的前置）
    const base: GanttTask[] = [
      { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04' },
      { id: 'b', name: 'B', start: '2026-03-07', end: '2026-03-08' },
    ]
    const noLag = computeLateDates([{ ...base[0]! }, { ...base[1]!, dependencies: [{ id: 'a' }] }])
    // 无 lag：A 最晚可滑到 03-04..03-06（B.start 03-07 前接），浮时 2
    expect(noLag.find((x) => x.id === 'a')).toEqual({
      id: 'a',
      lateStart: '2026-03-04',
      lateFinish: '2026-03-06',
      totalFloatDays: 2,
    })
    const withLag = computeLateDates([{ ...base[0]! }, { ...base[1]!, dependencies: [{ id: 'a', lag: 2 }] }])
    // lag 2：LF_A = LS_B − 2 = 03-05 位 → A 最晚 03-02..03-04，浮时 0（lag 吃掉全部余量）
    expect(withLag.find((x) => x.id === 'a')).toEqual({
      id: 'a',
      lateStart: '2026-03-02',
      lateFinish: '2026-03-04',
      totalFloatDays: 0,
    })
  })

  it('ss / ff / sf 四类约束按核心同公式回推', () => {
    // ss：A.start + lag ≤ B.start；A 03-02..03-04(dur3) ss B 03-02..03-06(dur5)
    const ss = computeLateDates([
      { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04' },
      { id: 'b', name: 'B', start: '2026-03-02', end: '2026-03-06', dependencies: [{ id: 'a', type: 'ss' }] },
    ])
    const ssA = ss.find((x) => x.id === 'a')
    // LF_A = LS_B + dur_A = 03-02位 + 3 → 最晚 03-04..03-06；浮时 0
    expect(ssA).toEqual({ id: 'a', lateStart: '2026-03-02', lateFinish: '2026-03-04', totalFloatDays: 0 })

    // ff：A.end ≤ B.end；A 03-02..03-04 B 03-06..03-07
    const ff = computeLateDates([
      { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04' },
      { id: 'b', name: 'B', start: '2026-03-06', end: '2026-03-07', dependencies: [{ id: 'a', type: 'ff' }] },
    ])
    const ffa = ff.find((x) => x.id === 'a')
    // LF_A = LF_B = 03-07 → A 最晚 03-05..03-07，浮时 3
    expect(ffa).toEqual({ id: 'a', lateStart: '2026-03-05', lateFinish: '2026-03-07', totalFloatDays: 3 })

    // sf：后继完成 ≥ 前置开始（依赖写在后继 B 上）；sf 收紧需要「dur_A < 后继链工期压力」，
    // 这里用显式提前的 projectEnd + 长 E 使 LF_B + dur_A 低于右界（公式真正起约束作用）
    const sf = computeLateDates(
      [
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-03' },
        { id: 'b', name: 'B', start: '2026-03-06', end: '2026-03-06', dependencies: [{ id: 'a', type: 'sf' }] },
        { id: 'e', name: 'E', start: '2026-03-07', end: '2026-03-09', dependencies: [{ id: 'b' }] },
      ],
      { projectEnd: '2026-03-06' },
    )
    const sfa = sf.find((x) => x.id === 'a')
    // LF_E = 右界 03-06 位、LS_E = 03-04 位；LF_B = LS_E = 03-04 位；LF_A = LF_B + dur_A = 03-06 位
    // → A 最晚 03-04..03-05（浮时 2）；E/B 被 projectEnd 反压出负浮时 −3
    expect(sfa).toEqual({ id: 'a', lateStart: '2026-03-04', lateFinish: '2026-03-05', totalFloatDays: 2 })
    expect(sf.find((x) => x.id === 'b')).toEqual({
      id: 'b',
      lateStart: '2026-03-03',
      lateFinish: '2026-03-03',
      totalFloatDays: -3,
    })
    expect(sf.find((x) => x.id === 'e')).toEqual({
      id: 'e',
      lateStart: '2026-03-04',
      lateFinish: '2026-03-06',
      totalFloatDays: -3,
    })
  })

  it('多后继取 min：被两条链夹住的任务按最紧约束', () => {
    const tasks: GanttTask[] = [
      { id: 'hub', name: 'hub', start: '2026-03-02', end: '2026-03-02' },
      // x 进 z 链（紧），y 是松链（可滑到项目尾）
      { id: 'x', name: 'X', start: '2026-03-05', end: '2026-03-05', dependencies: [{ id: 'hub' }] },
      { id: 'y', name: 'Y', start: '2026-03-06', end: '2026-03-06', dependencies: [{ id: 'hub' }] },
      { id: 'z', name: 'Z', start: '2026-03-09', end: '2026-03-09', dependencies: [{ id: 'x' }] },
    ]
    const byId = new Map(computeLateDates(tasks).map((x) => [x.id, x]))
    // x: LF=LS_z=03-09；y: 汇点滑到项目尾 03-09。hub = min(LS_x=03-08, LS_y=03-09) → 03-07..03-07
    expect(byId.get('hub')).toEqual({ id: 'hub', lateStart: '2026-03-07', lateFinish: '2026-03-07', totalFloatDays: 5 })
    expect(byId.get('x')).toEqual({ id: 'x', lateStart: '2026-03-08', lateFinish: '2026-03-08', totalFloatDays: 3 })
  })

  it('悬空依赖跳过、type/lag 非法按 fs/0、缺 id 与坏 start 的任务不产出', () => {
    const tasks: GanttTask[] = [
      {
        id: 'a',
        name: 'A',
        start: '2026-03-02',
        end: '2026-03-03',
        dependencies: [{ id: 'ghost' }, { id: 'a', type: 'bogus' }, { id: '' }],
      },
      { name: '缺id', start: '2026-03-02' },
      { id: 'bad', name: '坏start', start: 'not-a-date', end: '2026-03-05' },
      { id: 'ok', name: 'OK', start: '2026-03-06', end: '2026-03-06', dependencies: [{ id: 'a', lag: Number.NaN }] },
    ] as GanttTask[]
    const r = computeLateDates(tasks)
    expect(r.map((x) => x.id)).toEqual(['a', 'ok'])
    const a = r.find((x) => x.id === 'a')
    // ok 的 fs 边生效：LF_a = LS_ok = 03-06 → A 最晚 03-04..03-05；非法 lag 按 0、非法 type 按 fs
    expect(a).toEqual({ id: 'a', lateStart: '2026-03-04', lateFinish: '2026-03-05', totalFloatDays: 2 })
  })

  it('依赖环：best-effort 不抛、全部节点有值；具体值按当前单趟语义锁定（顺序相关，换输入序会变）', () => {
    // A(03-02, dur1) ↔ B(03-03, dur1)：互相依赖。右界 = max endPos = B 的 03-03 位 +1 = 102。
    // 单趟（补入段输入序 [A,B]，反向处理 [B,A]）：
    //   B: implied = LS_A − 0 = (102−1) = 101 → LF_B = 101
    //   A: implied = LS_B − 0 = (101−1) = 100 → LF_A = 100
    // 结果（含端日 = 位置 −1）：A = 03-01..03-01 浮时 −1；B = 03-02..03-02 浮时 −1。
    // 注意：把 A/B 的输入顺序对调会得到不同的（同样任意的）值——环属数据错误，此处仅锁定确定性。
    const tasks: GanttTask[] = [
      { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-02', dependencies: [{ id: 'b' }] },
      { id: 'b', name: 'B', start: '2026-03-03', end: '2026-03-03', dependencies: [{ id: 'a' }] },
    ]
    const r = computeLateDates(tasks)
    expect(r).toEqual([
      { id: 'a', lateStart: '2026-03-01', lateFinish: '2026-03-01', totalFloatDays: -1 },
      { id: 'b', lateStart: '2026-03-02', lateFinish: '2026-03-02', totalFloatDays: -1 },
    ])
    // 确定性：两次调用结果逐字段一致
    expect(computeLateDates(tasks)).toEqual(r)
  })

  it('projectEnd 显式早于当前排程 → 负浮时（违约口径）；非法 projectEnd 回落 max(end)', () => {
    const tasks: GanttTask[] = [{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' }]
    const early = computeLateDates(tasks, { projectEnd: '2026-03-04' })
    expect(early[0]).toEqual({ id: 'a', lateStart: '2026-02-28', lateFinish: '2026-03-04', totalFloatDays: -2 })
    const earlier = computeLateDates(tasks, { projectEnd: '2026-03-03' })
    expect(earlier[0]).toEqual({ id: 'a', lateStart: '2026-02-27', lateFinish: '2026-03-03', totalFloatDays: -3 })
    const invalid = computeLateDates(tasks, { projectEnd: 'nope' })
    expect(invalid[0]).toEqual({ id: 'a', lateStart: '2026-03-02', lateFinish: '2026-03-06', totalFloatDays: 0 })
  })

  it('hour 成分原样保留（lateStart 取 start 成分、lateFinish 取 end 成分）', () => {
    const tasks: GanttTask[] = [{ id: 'a', name: 'A', start: '2026-03-02 09:00', end: '2026-03-04 18:00' }]
    const r = computeLateDates(tasks, { projectEnd: '2026-03-06' })
    // 项目右界 03-06 → 最晚 03-04..03-06，浮时 2
    expect(r[0]).toEqual({ id: 'a', lateStart: '2026-03-04 09:00', lateFinish: '2026-03-06 18:00', totalFloatDays: 2 })
  })

  it('空输入 → 空数组；嵌套 children 拍平后参与（摘要父不输出、输出保持 DFS 序）', () => {
    expect(computeLateDates([])).toEqual([])
    const r = computeLateDates([
      {
        id: 's',
        name: 'S',
        start: '2026-03-02',
        end: '2026-03-06',
        children: [{ id: 'c', name: 'C', start: '2026-03-02', end: '2026-03-03' }],
      },
      { id: 'd', name: 'D', start: '2026-03-06', end: '2026-03-06' },
    ])
    // 摘要 s 被排除（不输出、不抬右界）：节点 = [c, d]，右界 = d 的 03-06
    expect(r.map((x) => x.id)).toEqual(['c', 'd'])
    // c 无后继（汇点）：LF_c = 右界 03-06 位 → 最晚 03-05..03-06，浮时 3
    expect(r[0]).toEqual({ id: 'c', lateStart: '2026-03-05', lateFinish: '2026-03-06', totalFloatDays: 3 })
    expect(r[1]).toEqual({ id: 'd', lateStart: '2026-03-06', lateFinish: '2026-03-06', totalFloatDays: 0 })
  })

  it('DST 安全：跨夏令时边界日期运算仍按日历日', () => {
    // 2026 美国夏令时 3 月第二个周日（03-08）切换；跨 03-07..03-09 的工期按日历日不受时区跳变影响
    const tasks: GanttTask[] = [
      { id: 'a', name: 'A', start: '2026-03-06', end: '2026-03-09' },
      { id: 'b', name: 'B', start: '2026-03-10', end: '2026-03-10', dependencies: [{ id: 'a' }] },
    ]
    const byId = new Map(computeLateDates(tasks).map((x) => [x.id, x]))
    expect(byId.get('a')).toEqual({ id: 'a', lateStart: '2026-03-06', lateFinish: '2026-03-09', totalFloatDays: 0 })
    expect(byId.get('b')).toEqual({ id: 'b', lateStart: '2026-03-10', lateFinish: '2026-03-10', totalFloatDays: 0 })
  })
})
