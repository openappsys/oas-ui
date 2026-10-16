import { test, expect } from '@playwright/test'
import type { Page, TestInfo } from '@playwright/test'

// 大数据规模回归：横向 + 纵向虚拟化在「长跨度 × 多行」下渲染 DOM 有界。
//
// 机制事实源（组件内部实现）：
// - gantt：行窗口 computeVirtualWindow(buffer=6)、列窗口 buffer=4——表头格/名称行/任务条/背景格全窗口化；
//   .inner 总宽 = 列数 × 列宽（滚动范围不随窗口缩水）
// - resource：列窗口 COL_BUFFER=4（.ticks .tick 只建窗口列）；泳道条按列窗口像素相交 cull（±1 列）；
//   .track 宽 = periods × colW（滚动条长度不变）
//
// 上界断言全部远小于全量：若虚拟化退化为全量渲染（万行/千列全建 DOM），对应断言必红——
// 反证数在各断言 message 中给出（全量应是多少）。
// ⚠️ 上界/相等断言依赖固定 seed/窗口参数（离屏视口宽 600/520、SCALE_COL 列宽 token、
// buffer 常量、数据跨度等）：改其中任一参数会使命中数/上界偏移 → 断言假红，调整时须同步复核反证数。
// 时间/节点数只记录（annotation + console.log）供人工观察趋势，不作判分断言（不引入 flaky）。

/** evaluate 内的组件探针类型（镜像组件公开面，避免 import 组件源码） */
interface GanttProbeLike extends HTMLElement {
  tasks: unknown
  units: Array<{ startMs: number }>
  colW(): number
  scrollToDate(d: string): void
  shadowRoot: ShadowRoot
}

/** console 收集：pageerror 一律收；console 按传入级别收（gantt 口径 error；resource 口径
 *  error + 组件前缀 warning）。warningPrefix（可选）：warning 只收含该前缀的消息——
 *  页面级引擎噪音（firefox 的 GA4 cookie「expires」警告等）不带组件前缀 → 排除不再间歇红；
 *  组件自身 devWarn（[oas-resource] 前缀，数据自愈/截断等告警）仍被捕获，不放宽为「什么都不查」。
 *  error 恒全收（引擎不会把组件异常降级成 error 以外的级别）。 */
function collectConsole(page: Page, kinds: Array<'error' | 'warning'>, warningPrefix?: string): string[] {
  const out: string[] = []
  page.on('pageerror', (e) => out.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (!kinds.some((k) => m.type() === k)) return
    if (m.type() === 'warning' && warningPrefix !== undefined && !m.text().includes(warningPrefix)) return
    out.push(`${m.type()}: ${m.text()}`)
  })
  return out
}

/** 节点数/耗时记录：console.log + annotation（人工观察趋势用，不判分） */
function logMetrics(testInfo: TestInfo, tag: string, data: unknown): void {
  const summary = `${tag} ${JSON.stringify(data)}`
  console.log('[scale]', summary)
  testInfo.annotations.push({ type: 'scale-metrics', description: summary })
}

// ===== 用例 1：gantt 长跨度 × 万行 =====

test('gantt 规模回归：10 年 day 档（≈3660 列）× 1 万行，表头/条/行名列 DOM 有界 + 滚到中部窗口平移', async ({
  page,
}) => {
  // 口径对齐 gantt.spec：只收 error（页面引擎噪音 warning 不属组件缺陷）
  const errors = collectConsole(page, ['error'])
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })

  const metrics = await page.evaluate(async () => {
    // demo 页已加载组件 → whenDefined 后 createElement 即同步升级（property 通道可用）
    await customElements.whenDefined('oas-gantt')
    const raf2 = (): Promise<void> =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(undefined))))
    const t0 = performance.now()
    const el = document.createElement('oas-gantt') as GanttProbeLike
    el.style.cssText = 'position:fixed;top:-9999px;left:0;width:600px' // 离屏：有真实布局测量
    el.setAttribute('scale', 'day')
    document.body.appendChild(el)
    // 1 万行扁平任务：首条为跨度锚任务（拉开 2016..2025 ≈10 年轴），其余同一天起止
    // （落在轴内 2020-06-01..05）。构造 O(n)，fixture 不成为瓶颈。
    // 注意：gantt 轴由数据 min/max 跨度决定——没有锚任务时轴只有任务自身的 5 天。
    const ROWS = 10000
    const tasks: Array<{ id: string; name: string; start: string; end: string }> = new Array(ROWS)
    tasks[0] = { id: 'span0', name: '跨度锚', start: '2016-01-01', end: '2025-12-31' }
    for (let i = 1; i < ROWS; i++) {
      tasks[i] = { id: 't' + i, name: '任务' + i, start: '2020-06-01', end: '2020-06-05' }
    }
    el.tasks = tasks
    await raf2() // 首帧：等 resize 测量 + 行/列窗口就绪
    const buildMs = performance.now() - t0

    const sr = el.shadowRoot
    const count = (sel: string): number => sr.querySelectorAll(sel).length
    const tb = sr.querySelector<HTMLElement>('.tbody')!
    const inner = sr.querySelector<HTMLElement>('.inner')!
    const tbRect = () => tb.getBoundingClientRect()
    const hasTickCoverage = (): boolean =>
      [...sr.querySelectorAll<HTMLElement>('.head-minor .unit')].some((c) => {
        const r = c.getBoundingClientRect()
        return r.left < tbRect().right && r.right > tbRect().left
      })
    const before = {
      units: el.units.length,
      colW: el.colW(),
      minors: count('.head-minor .unit'),
      bars: count('.bars .bar'),
      sideRows: count('.side-body .row-name'),
      innerW: Number.parseFloat(inner.style.width),
      coverage: hasTickCoverage(),
    }
    // 滚到跨度中部（2016..2025 的中点附近）→ scroll 事件 → rAF 帧重建列窗口
    el.scrollToDate('2021-06-15')
    await raf2()
    const after = {
      scrollLeft: tb.scrollLeft,
      minors: count('.head-minor .unit'),
      bars: count('.bars .bar'),
      sideRows: count('.side-body .row-name'),
      coverage: hasTickCoverage(),
    }
    const shadowNodes = count('*')
    el.remove()
    return { buildMs, before, after, shadowNodes }
  })

  logMetrics(test.info(), `gantt 10y×10k buildMs=${metrics.buildMs.toFixed(0)}`, {
    before: metrics.before,
    after: metrics.after,
    shadowNodes: metrics.shadowNodes,
  })

  // 卫断言：渲染确实成功（防「渲染失败 → 计数 0 → 上界恒真」的假绿）
  expect(metrics.before.units, '10 年 day 档列数（含首尾留白）应 >3000（全量）').toBeGreaterThan(3000)
  expect(metrics.before.minors, '辅刻度格已渲染').toBeGreaterThan(0)
  expect(metrics.before.bars, '任务条已渲染').toBeGreaterThan(0)
  expect(metrics.before.sideRows, '行名列已渲染').toBeGreaterThan(0)

  // DOM 有界（反证：无列虚拟化 minors=3660、无行虚拟化 bars/sideRows=10000，均远超上界 → 红）
  expect(metrics.before.minors, '表头辅刻度格有上界（全量 3660）').toBeLessThan(300)
  expect(metrics.before.bars, '任务条有上界 ≈ 行窗口数（全量 10000）').toBeLessThan(100)
  expect(metrics.before.sideRows, '行名列有上界 ≈ 行窗口数（全量 10000）').toBeLessThan(100)

  // 滚动范围保持：.inner 总宽 ≈ 列数 × 列宽（容差 2px；不断言精确值）
  expect(
    Math.abs(metrics.before.innerW - metrics.before.units * metrics.before.colW),
    '.inner 总宽 ≈ 列数×列宽（画布不随窗口缩水）',
  ).toBeLessThanOrEqual(2)
  expect(metrics.before.coverage, '未滚动时可视区有刻度覆盖').toBe(true)

  // 滚到跨度中部：窗口平移后仍有界 + 可视区仍有刻度覆盖
  expect(metrics.after.scrollLeft, 'scrollToDate 已滚动').toBeGreaterThan(0)
  expect(metrics.after.minors, '滚动后表头格数仍有上界').toBeLessThan(300)
  expect(metrics.after.bars, '滚动（横向）后条数仍有上界').toBeLessThan(100)
  expect(metrics.after.sideRows, '滚动（横向）后行名列仍有上界').toBeLessThan(100)
  expect(metrics.after.coverage, '滚到中部后可视区仍有刻度覆盖（列窗口切片不漏可视列）').toBe(true)

  expect(errors, 'console 零 error').toEqual([])
})

// ===== 用例 2：resource 长跨度 × 大任务量 =====

test('resource 规模回归：3 年 day 档（≈1096 period）× 5000 任务，刻度/泳道条 DOM 有界 + 滚到中部覆盖', async ({
  page,
}) => {
  // 口径：error 全收 + warning 限 [oas-resource] 前缀（页面级引擎噪音如 firefox GA4 cookie
  // 警告不属组件缺陷；组件自身 devWarn 仍被捕获——与 gantt.spec 的 error-only 相比保留了告警面）
  const errors = collectConsole(page, ['error', 'warning'], '[oas-resource]')
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })

  // 构建实例 + 首帧测量 + 滚到中部（实例留在页面，供下方窗口平移等待与 after 测量）
  const before = await page.evaluate(async () => {
    await customElements.whenDefined('oas-resource')
    const raf2 = (): Promise<void> =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(undefined))))
    const iso = (d: Date): string =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const t0 = performance.now()
    const el = document.createElement('oas-resource')
    el.id = 'res-scale-3y'
    el.style.cssText = 'position:fixed;top:-9999px;left:0;width:520px'
    el.setAttribute('scale', 'day')
    el.setAttribute(
      'resources',
      JSON.stringify([
        { id: 'r1', name: '甲' },
        { id: 'r2', name: '乙' },
        { id: 'r3', name: '丙' },
      ]),
    )
    document.body.appendChild(el)
    // 5000 任务铺满 3 年（2026-01-01..2028-12-31 = 1096 天）：每资源 ≈1667 条、各 3 天长，
    // 构造 O(n)；end 钳在轴内 → period 数与 resource.spec 同跨度用例一致（≈1096）
    const TASKS = 5000
    const SPAN = 1096
    const resIds = ['r1', 'r2', 'r3']
    const tasks: Array<{ id: string; name: string; start: string; end: string; resources: string[] }> = new Array(TASKS)
    for (let i = 0; i < TASKS; i++) {
      const day = Math.floor(i / 3) % SPAN
      const endDay = Math.min(day + 2, SPAN - 1)
      tasks[i] = {
        id: 'k' + i,
        name: 'K' + i,
        start: iso(new Date(2026, 0, 1 + day)),
        end: iso(new Date(2026, 0, 1 + endDay)),
        resources: [resIds[i % 3]!],
      }
    }
    ;(el as HTMLElement & { tasks: unknown }).tasks = tasks
    await raf2()
    const buildMs = performance.now() - t0

    const sr = (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot
    const sc = sr.querySelector<HTMLElement>('.scroller')!
    const tickAtCenter = (): boolean => {
      const scRect = sc.getBoundingClientRect()
      const centerX = scRect.left + scRect.width / 2
      for (const t of sr.querySelectorAll<HTMLElement>('.ticks .tick')) {
        const b = t.getBoundingClientRect()
        if (b.left <= centerX && b.right >= centerX) return true
      }
      return false
    }
    const lane = sr.querySelectorAll('.row.lane')[0]
    const out = {
      buildMs,
      ticks: sr.querySelectorAll('.ticks .tick').length,
      lane1Bars: lane ? lane.querySelectorAll('.bar').length : 0,
      trackW: (sr.querySelector('.lane .track') as HTMLElement).getBoundingClientRect().width,
      coverage: tickAtCenter(),
    }
    // 滚到中部 → scroll 事件 → rAF 帧重算列窗口
    sc.scrollLeft = Math.floor((sc.scrollWidth - sc.clientWidth) / 2)
    return out
  })

  // 等窗口平移：首刻度 left 显著右移（非零滚动位置），避免与窗口重建竞态
  await page.waitForFunction(
    () => {
      const sr = document.getElementById('res-scale-3y')?.shadowRoot
      const first = sr?.querySelector('.ticks .tick') as HTMLElement | null
      return !!first && Number.parseFloat(first.style.left) > 1000
    },
    undefined,
    { timeout: 15000 },
  )

  const after = await page.evaluate(() => {
    const sr = (document.getElementById('res-scale-3y') as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot
    const sc = sr.querySelector<HTMLElement>('.scroller')!
    const scRect = sc.getBoundingClientRect()
    const centerX = scRect.left + scRect.width / 2
    let tickAtCenter = false
    for (const t of sr.querySelectorAll<HTMLElement>('.ticks .tick')) {
      const b = t.getBoundingClientRect()
      if (b.left <= centerX && b.right >= centerX) tickAtCenter = true
    }
    const lane = sr.querySelectorAll('.row.lane')[0]
    return {
      scrollLeft: sc.scrollLeft,
      ticks: sr.querySelectorAll('.ticks .tick').length,
      lane1Bars: lane ? lane.querySelectorAll('.bar').length : 0,
      coverage: tickAtCenter,
    }
  })

  logMetrics(test.info(), `resource 3y×5k buildMs=${before.buildMs.toFixed(0)}`, { before, after })
  await page.evaluate(() => document.getElementById('res-scale-3y')?.remove())

  // 卫断言：渲染成功 + 窗口内确实有内容（防「计数 0 → 上界恒真」假绿）
  expect(before.ticks, '刻度已渲染').toBeGreaterThan(0)
  expect(before.lane1Bars, '首泳道条已渲染（窗口内有相交任务）').toBeGreaterThan(0)

  // DOM 有界（反证：无列窗口化 ticks≈1096、无 lane cull 首 lane 条数≈1667，均远超上界 → 红）
  expect(before.ticks, '刻度数有上界（全量 ≈1096 period）').toBeLessThan(200)
  expect(before.lane1Bars, '单泳道条数有上界 ≈ 窗口相交数（全量 ≈1667/泳道）').toBeLessThan(200)

  // 滚动范围保持：track 宽 ≈ 1096 × 36（容差 ±2 列；periods 边界差 1 列不影响判定）
  expect(Math.abs(before.trackW - 1096 * 36), '轨道宽 ≈ 1096×36（画布不随窗口缩水）').toBeLessThanOrEqual(72)
  expect(before.coverage, '未滚动时可视区有刻度覆盖').toBe(true)

  // 滚到中部：窗口平移后仍有界 + 可视区仍有刻度覆盖
  expect(after.scrollLeft, '已横向滚动到中部').toBeGreaterThan(0)
  expect(after.ticks, '滚动后刻度数仍有上界').toBeLessThan(200)
  expect(after.lane1Bars, '滚动后单泳道条数仍有上界').toBeLessThan(200)
  expect(after.coverage, '滚到中部后可视区仍有刻度覆盖').toBe(true)

  expect(errors, 'console 零 error/warning（warning 限 [oas-resource] 前缀）').toEqual([])
})

// ===== 用例 3：数据量翻倍对照（gantt）=====
// 「渲染节点数不随数据总量线性增长」的直接证据：跨度/视口不变、任务量 1 万 → 2 万，
// 行/列窗口只由视口尺寸与列宽决定 → 节点数严格不变。若实现退化全量渲染，2 万实例节点数翻倍 → 红。

test('gantt 规模对照：跨度不变、数据量翻倍（1 万→2 万）渲染节点数不变', async ({ page }) => {
  const errors = collectConsole(page, ['error'])
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })

  const counts = await page.evaluate(async () => {
    await customElements.whenDefined('oas-gantt')
    const raf2 = (): Promise<void> =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(undefined))))
    const mk = (id: string, rows: number): GanttProbeLike => {
      const el = document.createElement('oas-gantt') as GanttProbeLike
      el.id = id
      el.style.cssText = 'position:fixed;top:-9999px;left:0;width:600px'
      el.setAttribute('scale', 'day')
      // 首条为跨度锚任务（拉开 2016..2025 轴），其余同一天起止——两实例轴/视口完全相同
      const tasks: Array<{ id: string; name: string; start: string; end: string }> = new Array(rows)
      tasks[0] = { id: 'span0', name: '跨度锚', start: '2016-01-01', end: '2025-12-31' }
      for (let i = 1; i < rows; i++) {
        tasks[i] = { id: 't' + i, name: '任务' + i, start: '2020-06-01', end: '2020-06-05' }
      }
      el.tasks = tasks
      document.body.appendChild(el)
      return el
    }
    const a = mk('gantt-scale-2x-a', 10000)
    const b = mk('gantt-scale-2x-b', 20000) // 数据量 ×2，其余条件完全相同
    await raf2()
    const read = (el: GanttProbeLike): { bars: number; minors: number; sideRows: number; units: number } => {
      const sr = el.shadowRoot
      return {
        bars: sr.querySelectorAll('.bars .bar').length,
        minors: sr.querySelectorAll('.head-minor .unit').length,
        sideRows: sr.querySelectorAll('.side-body .row-name').length,
        units: el.units.length,
      }
    }
    const out = { a: read(a), b: read(b) }
    a.remove()
    b.remove()
    return out
  })

  logMetrics(test.info(), 'gantt 2x', counts)
  // 卫断言：两实例都渲染成功，且轴完全一致（对照公平性前提）
  expect(counts.a.bars, '1 万行实例条已渲染').toBeGreaterThan(0)
  expect(counts.b.bars, '2 万行实例条已渲染').toBeGreaterThan(0)
  expect(counts.b.units, '两实例轴列数一致（跨度锚相同）').toBe(counts.a.units)
  // 行/列窗口与数据总量无关 → 节点数严格相等（若全量渲染，b 应是 a 的 2 倍 → 红）
  expect(counts.b.bars, '数据量翻倍 → 条数不变（全量渲染应翻倍）').toBe(counts.a.bars)
  expect(counts.b.minors, '数据量翻倍 → 表头格数不变（列窗口只依赖视口/列宽）').toBe(counts.a.minors)
  expect(counts.b.sideRows, '数据量翻倍 → 行名列数不变').toBe(counts.a.sideRows)
  expect(errors, 'console 零 error').toEqual([])
})

// ===== 用例 4：数据量翻倍对照（resource）=====
// 刻度数只由列窗口（视口/列宽/跨度）决定 → 数据量翻倍后严格不变；
// 泳道条 cull 按「窗口像素相交」——密度翻倍则窗口相交数近似翻倍（有界但非常数，机制如此），
// 故 bar 只锁上界（远小于全量 3333/泳道），tick 锁严格相等。

test('resource 规模对照：跨度不变、数据量翻倍（5 千→1 万）刻度数不变 + 条数仍有界', async ({ page }) => {
  // 口径同用例 2：error 全收 + warning 限 [oas-resource] 前缀
  const errors = collectConsole(page, ['error', 'warning'], '[oas-resource]')
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })

  const counts = await page.evaluate(async () => {
    await customElements.whenDefined('oas-resource')
    const raf2 = (): Promise<void> =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(undefined))))
    const iso = (d: Date): string =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const resIds = ['r1', 'r2', 'r3']
    const mk = (id: string, taskCount: number): HTMLElement => {
      const el = document.createElement('oas-resource')
      el.id = id
      el.style.cssText = 'position:fixed;top:-9999px;left:0;width:520px'
      el.setAttribute('scale', 'day')
      el.setAttribute(
        'resources',
        JSON.stringify([
          { id: 'r1', name: '甲' },
          { id: 'r2', name: '乙' },
          { id: 'r3', name: '丙' },
        ]),
      )
      document.body.appendChild(el)
      const SPAN = 1096
      const tasks: Array<{ id: string; name: string; start: string; end: string; resources: string[] }> = new Array(
        taskCount,
      )
      for (let i = 0; i < taskCount; i++) {
        const day = Math.floor(i / 3) % SPAN
        const endDay = Math.min(day + 2, SPAN - 1)
        tasks[i] = {
          id: id + '-' + i,
          name: 'K' + i,
          start: iso(new Date(2026, 0, 1 + day)),
          end: iso(new Date(2026, 0, 1 + endDay)),
          resources: [resIds[i % 3]!],
        }
      }
      ;(el as HTMLElement & { tasks: unknown }).tasks = tasks
      return el
    }
    const a = mk('res-scale-2x-a', 5000)
    const b = mk('res-scale-2x-b', 10000) // 数据量 ×2，分布方式相同（密度翻倍）
    await raf2()
    const read = (el: HTMLElement): { ticks: number; lane1Bars: number } => {
      const sr = (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot
      const lane = sr.querySelectorAll('.row.lane')[0]
      return {
        ticks: sr.querySelectorAll('.ticks .tick').length,
        lane1Bars: lane ? lane.querySelectorAll('.bar').length : 0,
      }
    }
    const out = { a: read(a), b: read(b) }
    a.remove()
    b.remove()
    return out
  })

  logMetrics(test.info(), 'resource 2x', counts)
  // 卫断言
  expect(counts.a.ticks, '5 千任务实例刻度已渲染').toBeGreaterThan(0)
  expect(counts.b.lane1Bars, '1 万任务实例首泳道条已渲染').toBeGreaterThan(0)
  // 刻度数与任务量无关 → 严格相等（全量渲染下刻度数同样与任务量无关——真正的反证在用例 2 的
  // 「≈1096 period」上界；此断言锁「数据量不引入额外刻度」这一不变量）
  expect(counts.b.ticks, '数据量翻倍 → 刻度数不变（列窗口只依赖视口/列宽/跨度）').toBe(counts.a.ticks)
  // bar 有界但非常数（cull 按窗口相交，密度翻倍 → 相交数近似翻倍）：锁上界远小于全量
  expect(counts.a.lane1Bars, '5 千任务首泳道条数有上界（全量 ≈1667）').toBeLessThan(200)
  expect(counts.b.lane1Bars, '1 万任务首泳道条数有上界（全量 ≈3333）').toBeLessThan(400)
  expect(errors, 'console 零 error/warning（warning 限 [oas-resource] 前缀）').toEqual([])
})
