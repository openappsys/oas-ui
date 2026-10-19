import { test, expect } from '@playwright/test'

// 「服务端窗口取数」指南页的可运行 demo 回归：
// 首屏分段装载、跳滚换窗且保留 scrollTop、段内小幅滚动不再发请求、console 零告警。
// 防止文档 demo 的脚本/文案随组件演进腐化（guide 页不在 components 自动收集面内）。
test('guide windowed demo：首屏装载、跳滚换窗、段内滚动零请求、console 零告警', async ({ page }) => {
  const issues: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || (m.type() === 'warning' && /^\[oas-/.test(m.text())))
      issues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`))

  await page.goto('/guide/windowed-data.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!customElements.get('oas-table'), undefined, { timeout: 15000 })
  await page.waitForFunction(
    () => {
      const log = document.getElementById('guide-windowed-demo-log')
      return !!log && !/等待|Waiting/.test(log.textContent || '')
    },
    undefined,
    { timeout: 15000 },
  )

  const initial = await page.evaluate(() => {
    const el = document.getElementById('guide-windowed-demo') as HTMLElement & { shadowRoot: ShadowRoot }
    const log = document.getElementById('guide-windowed-demo-log')
    return {
      ws: el.getAttribute('window-start'),
      rows: el.shadowRoot.querySelectorAll('tbody tr[part="row"]').length,
      log: log?.textContent ?? '',
    }
  })
  expect(initial.ws, '首屏窗口从 0 开始').toBe('0')
  expect(initial.rows, '首屏渲染窗口行').toBeGreaterThan(0)
  expect(initial.log, '首屏已装载一个分段（200 行）').toContain('已装载 200 行')

  const jumped = await page.evaluate(async () => {
    const el = document.getElementById('guide-windowed-demo') as HTMLElement & { shadowRoot: ShadowRoot }
    const wrap = el.shadowRoot.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 800000
    wrap.dispatchEvent(new Event('scroll'))
    await new Promise((r) => setTimeout(r, 1200))
    return {
      scrollTop: wrap.scrollTop,
      ws: el.getAttribute('window-start'),
      rows: el.shadowRoot.querySelectorAll('tbody tr[part="row"]').length,
      log: document.getElementById('guide-windowed-demo-log')?.textContent ?? '',
    }
  })
  expect(Number(jumped.ws), '跳滚后窗口换到段起点（非 0）').toBeGreaterThan(0)
  expect(jumped.scrollTop, '换窗后 scrollTop 保留（不被钳回 0）').toBeGreaterThan(700000)
  expect(jumped.rows, '换窗后仍渲染窗口行').toBeGreaterThan(0)
  expect(jumped.log, '段取数一次装载两段（400 行）').toContain('已装载 400 行')

  const sameSegment = await page.evaluate(async () => {
    const el = document.getElementById('guide-windowed-demo') as HTMLElement & { shadowRoot: ShadowRoot }
    const wrap = el.shadowRoot.querySelector('.table-scroll') as HTMLElement
    const log = document.getElementById('guide-windowed-demo-log') as HTMLElement
    const reqCount = () => Number(/请求\s*(\d+)\s*次/.exec(log.textContent || '')?.[1] ?? -1)
    const before = reqCount()
    wrap.scrollTop += 400
    wrap.dispatchEvent(new Event('scroll'))
    await new Promise((r) => setTimeout(r, 500))
    return { before, after: reqCount(), log: log.textContent ?? '' }
  })
  expect(sameSegment.before, '能解析请求次数').toBeGreaterThan(0)
  expect(sameSegment.after, '段内小幅滚动不再发请求（分段覆盖多窗口）').toBe(sameSegment.before)

  expect(issues, 'console 零 error/warning').toEqual([])
})

test('guide windowed demo（en 页）：首屏装载 + console 零告警', async ({ page }) => {
  const issues: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || (m.type() === 'warning' && /^\[oas-/.test(m.text())))
      issues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`))
  await page.goto('/en/guide/windowed-data.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => {
      const log = document.getElementById('guide-windowed-demo-log')
      return !!log && !/Waiting/.test(log.textContent || '')
    },
    undefined,
    { timeout: 15000 },
  )
  const rows = await page.evaluate(() => {
    const el = document.getElementById('guide-windowed-demo') as HTMLElement & { shadowRoot: ShadowRoot }
    return el.shadowRoot.querySelectorAll('tbody tr[part="row"]').length
  })
  expect(rows, 'en 页 demo 渲染窗口行').toBeGreaterThan(0)
  expect(issues, 'console 零 error/warning').toEqual([])
})

// 指南页 gantt / resource 窗口化 demo：行窗口（垂直滚动）+ 宿主托管时间轴（滚到轴尾 → oas-range-request → 扩轴）。
test('guide gantt/resource windowed demo：行窗口 + 轴端范围请求扩轴', async ({ page }) => {
  const issues: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || (m.type() === 'warning' && /^\[oas-/.test(m.text())))
      issues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`))

  await page.goto('/guide/windowed-data.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => {
      const g = document.getElementById('guide-windowed-gantt-log')
      const r = document.getElementById('guide-windowed-resource-log')
      return !!g && !!r && !/等待|Waiting/.test(g.textContent || '') && !/等待|Waiting/.test(r.textContent || '')
    },
    undefined,
    { timeout: 15000 },
  )

  const initial = await page.evaluate(() => {
    const g = document.getElementById('guide-windowed-gantt') as HTMLElement & { shadowRoot: ShadowRoot }
    const r = document.getElementById('guide-windowed-resource') as HTMLElement & { shadowRoot: ShadowRoot }
    const num = (id: string, kw: string) => {
      const text = document.getElementById(id)?.textContent || ''
      return Number(new RegExp(kw + '\\s*(\\d+)').exec(text)?.[1] ?? -1)
    }
    return {
      ganttBars: g.shadowRoot.querySelectorAll('.bars .bar').length,
      resourceLanes: r.shadowRoot.querySelectorAll('.lanes .row.lane').length,
      resourceBars: r.shadowRoot.querySelectorAll('.lanes .bar').length,
      ganttRanges: num('guide-windowed-gantt-log', '范围请求'),
      resourceRanges: num('guide-windowed-resource-log', '范围请求'),
    }
  })
  expect(initial.ganttBars, 'gantt 初始渲染任务条').toBeGreaterThan(0)
  expect(initial.resourceLanes, 'resource 初始渲染泳道行').toBeGreaterThan(0)
  expect(initial.resourceBars, 'resource 初始渲染任务条（轴起点附近有任务）').toBeGreaterThan(0)
  expect(initial.ganttRanges, '初始（左侧越界被忽略）不扩轴').toBe(0)
  expect(initial.resourceRanges, 'resource 初始不扩轴').toBe(0)

  const after = await page.evaluate(async () => {
    const g = document.getElementById('guide-windowed-gantt') as HTMLElement & { shadowRoot: ShadowRoot }
    const r = document.getElementById('guide-windowed-resource') as HTMLElement & { shadowRoot: ShadowRoot }
    const gBody = g.shadowRoot.querySelector('.tbody') as HTMLElement
    gBody.scrollTop = 36 * 400
    gBody.dispatchEvent(new Event('scroll'))
    await new Promise((res) => setTimeout(res, 500))
    gBody.scrollLeft = gBody.scrollWidth
    gBody.dispatchEvent(new Event('scroll'))
    await new Promise((res) => setTimeout(res, 800))

    const rSc = r.shadowRoot.querySelector('.scroller') as HTMLElement
    rSc.scrollTop = 37 * 150
    rSc.dispatchEvent(new Event('scroll'))
    await new Promise((res) => setTimeout(res, 600))
    rSc.scrollLeft = rSc.scrollWidth
    rSc.dispatchEvent(new Event('scroll'))
    await new Promise((res) => setTimeout(res, 800))

    return {
      ganttWS: Number(g.getAttribute('window-start')),
      ganttRangeEnd: g.getAttribute('range-end') || '',
      resourceWS: Number(r.getAttribute('window-start')),
      resourceRangeEnd: r.getAttribute('range-end') || '',
      ganttLog: document.getElementById('guide-windowed-gantt-log')?.textContent || '',
      resourceLog: document.getElementById('guide-windowed-resource-log')?.textContent || '',
    }
  })
  expect(after.ganttWS, 'gantt 垂直滚动后切到后续行切片').toBeGreaterThan(0)
  expect(after.ganttRangeEnd, 'gantt 滚到轴尾后轴范围被扩展').not.toBe('2026-09-30')
  const rangeCount = Number(/范围请求\s*(\d+)/.exec(after.ganttLog)?.[1] ?? -1)
  expect(rangeCount, 'gantt 记录范围请求（滚到轴尾至少一次）').toBeGreaterThan(0)
  expect(after.resourceWS, 'resource 垂直滚动后切到后续资源切片').toBeGreaterThan(0)
  expect(after.resourceRangeEnd, 'resource 滚到轴尾后轴范围被扩展').not.toBe('2026-06-30')
  expect(issues, 'console 零 error/warning').toEqual([])
})

// 回归：组件包延迟注册（模拟 dev 下主题动态 import 更慢）时，页面脚本不得在未升级元素上写 property。
// 修复前 el.tasks/el.resources 会变成 own property 遮蔽 setter，表现为泳道/直方图空白。
test('guide windowed demo：组件包延迟注册仍能装载数据（防 property 早于 upgrade）', async ({ page }) => {
  const issues: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || (m.type() === 'warning' && /^\[oas-/.test(m.text())))
      issues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`))
  let delayedUi = false
  // 必须延迟 UI 包 chunk（VitePress 2 为 assets/chunks/dist.*，1.x 为 chunks/index.*），
  // 不能只延迟页面 chunk；否则组件包早已注册，回归会变成假绿。
  await page.route(/\/assets\/(?:chunks\/(?:index|dist)|guide_windowed-data\.md)\..*\.js$/, async (route) => {
    if (/\/assets\/chunks\/(?:index|dist)\./.test(route.request().url())) delayedUi = true
    await new Promise((r) => setTimeout(r, 1200))
    await route.continue()
  })
  await page.goto('/guide/windowed-data.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => {
      const g = document.getElementById('guide-windowed-gantt')
      const r = document.getElementById('guide-windowed-resource')
      return !!g?.shadowRoot?.querySelector('.bars .bar') && !!r?.shadowRoot?.querySelector('.lanes .row.lane')
    },
    undefined,
    { timeout: 20000 },
  )
  expect(delayedUi, 'UI chunk 确实被延迟（否则该回归无效）').toBe(true)
  const out = await page.evaluate(() => {
    const g = document.getElementById('guide-windowed-gantt') as HTMLElement & { shadowRoot: ShadowRoot }
    const r = document.getElementById('guide-windowed-resource') as HTMLElement & { shadowRoot: ShadowRoot }
    return {
      ganttBars: g.shadowRoot.querySelectorAll('.bars .bar').length,
      resourceLanes: r.shadowRoot.querySelectorAll('.lanes .row.lane').length,
      resourceBars: r.shadowRoot.querySelectorAll('.lanes .bar').length,
    }
  })
  expect(out.ganttBars, '延迟注册后 gantt 仍渲染任务条').toBeGreaterThan(0)
  expect(out.resourceLanes, '延迟注册后 resource 仍渲染泳道').toBeGreaterThan(0)
  expect(out.resourceBars, '延迟注册后 resource 仍渲染任务条').toBeGreaterThan(0)
  expect(issues, 'console 零 error/warning').toEqual([])
})
