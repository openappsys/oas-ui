import { test, expect } from '@playwright/test'

// SPA 内部跳转（VitePress 客户端路由）回归：
// Vue 对自定义元素按「key in el」决定写 property 还是 attribute。若组件的**私有方法名与单字属性同名**
// （如 private scale() 与 scale="day"），SPA 跳转时元素已升级 → Vue 把属性写成 property → own string
// 遮蔽原型方法 → `this.scale is not a function` → demo 空白；整页刷新因升级晚于 patch 才走 attribute。
// 该用例锁定 scheduler / gantt / resource 在「表格页 → 日程 → 甘特 → 资源」的客户端跳转后仍渲染数据且无 pageerror。
test('docs SPA 跳转：gantt / resource demo 不因属性-方法撞名而空白', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))

  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)

  // 客户端跳转到日程
  await page.locator('a[href="/components/scheduler"]').first().click()
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('oas-scheduler')].some(
        (el) => (el.shadowRoot?.querySelectorAll('.event, .res-ev, .res-bar').length ?? 0) > 0,
      ),
    undefined,
    { timeout: 20000 },
  )
  const sched = await page.evaluate(() => {
    const els = [...document.querySelectorAll('oas-scheduler')]
    return {
      path: location.pathname,
      events: els.reduce((n, el) => n + (el.shadowRoot?.querySelectorAll('.event, .res-ev, .res-bar').length || 0), 0),
      ownView: els.some((el) => Object.prototype.hasOwnProperty.call(el, 'view')),
    }
  })
  expect(sched.path, '客户端路由到 scheduler').toContain('/components/scheduler')
  expect(sched.events, 'scheduler demo 渲染事件').toBeGreaterThan(0)
  expect(sched.ownView, '元素上不得出现 own 属性 view').toBe(false)

  // 客户端跳转到甘特
  await page.locator('a[href="/components/gantt"]').first().click()
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('oas-gantt')].some(
        (el) => (el.shadowRoot?.querySelectorAll('.bars .bar').length ?? 0) > 0,
      ),
    undefined,
    { timeout: 20000 },
  )
  const gantt = await page.evaluate(() => {
    const els = [...document.querySelectorAll('oas-gantt')]
    return {
      path: location.pathname,
      bars: els.reduce((n, el) => n + (el.shadowRoot?.querySelectorAll('.bars .bar').length || 0), 0),
      rows: els.reduce((n, el) => n + (el.shadowRoot?.querySelectorAll('.side-body .row-name').length || 0), 0),
      ownScale: els.some((el) => Object.prototype.hasOwnProperty.call(el, 'scale')),
      ownExpanded: els.some((el) => Object.prototype.hasOwnProperty.call(el, 'expanded')),
    }
  })
  expect(gantt.path, '客户端路由到 gantt').toContain('/components/gantt')
  expect(gantt.bars, 'gantt demo 渲染任务条').toBeGreaterThan(0)
  expect(gantt.rows, 'gantt demo 渲染行').toBeGreaterThan(0)
  expect(gantt.ownScale, '元素上不得出现 own 属性 scale（会遮蔽方法）').toBe(false)
  expect(gantt.ownExpanded, '元素上不得出现 own 属性 expanded（会遮蔽 Set 字段）').toBe(false)

  // 客户端跳转到资源
  await page.locator('a[href="/components/resource"]').first().click()
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('oas-resource')].some(
        (el) => (el.shadowRoot?.querySelectorAll('.lanes .row.lane .bar').length ?? 0) > 0,
      ),
    undefined,
    { timeout: 20000 },
  )
  const res = await page.evaluate(() => {
    const els = [...document.querySelectorAll('oas-resource')]
    return {
      path: location.pathname,
      lanes: els.reduce((n, el) => n + (el.shadowRoot?.querySelectorAll('.lanes .row.lane').length || 0), 0),
      bars: els.reduce((n, el) => n + (el.shadowRoot?.querySelectorAll('.lanes .bar').length || 0), 0),
      ownScale: els.some((el) => Object.prototype.hasOwnProperty.call(el, 'scale')),
    }
  })
  expect(res.path, '客户端路由到 resource').toContain('/components/resource')
  expect(res.lanes, 'resource demo 渲染泳道').toBeGreaterThan(0)
  expect(res.bars, 'resource demo 渲染任务条').toBeGreaterThan(0)
  expect(res.ownScale, '元素上不得出现 own 属性 scale').toBe(false)

  // 客户端跳转到菜单：items 静态 JSON attribute 在 Vue 下被写成 property（字符串）——
  // setter 若不容忍字符串会把 JSON 串逐字符当菜单项渲染（整串垃圾项）。
  // 侧栏链接可能不可见/被遮挡（locator.click 命中超时）——直接 DOM click 走同一 Vue Router 路径
  await page.evaluate(() => document.querySelector<HTMLAnchorElement>('a[href="/components/menu"]')!.click())
  await page.waitForFunction(
    () => location.pathname.includes('/components/menu') && document.querySelectorAll('oas-menu').length > 0,
    undefined,
    { timeout: 20000 },
  )
  await page.waitForTimeout(500)
  const menu = await page.evaluate(() => {
    const els = [...document.querySelectorAll('oas-menu')]
    const counts = els.map((el) => el.shadowRoot?.querySelectorAll('.item').length ?? 0)
    return { path: location.pathname, counts, total: counts.reduce((a, b) => a + b, 0), max: Math.max(0, ...counts) }
  })
  expect(menu.path, '客户端路由到 menu').toContain('/components/menu')
  expect(menu.total, 'menu demo 应渲染菜单项（items JSON attribute 在 SPA 下存活）').toBeGreaterThan(0)
  expect(menu.max, '单个菜单项数合理（不是 items JSON 串逐字符渲染的垃圾项）').toBeLessThan(30)

  // 客户端跳转到 rate：colors/icons 静态 JSON attribute 同类场景——property 通道收到字符串
  // 须解析生效（分段色注入 / 逐值符号渲染），不得整批回落默认（DOM click 同 menu，规避遮挡）
  await page.evaluate(() => document.querySelector<HTMLAnchorElement>('a[href="/components/rate"]')!.click())
  await page.waitForFunction(
    () => location.pathname.includes('/components/rate') && document.querySelectorAll('oas-rate').length > 0,
    undefined,
    { timeout: 20000 },
  )
  await page.waitForTimeout(500)
  const rate = await page.evaluate(() => {
    const els = [...document.querySelectorAll('oas-rate')]
    // icons JSON 专属产物：icons demo 第 5 星渲染 icons[4]='😍'（默认星形是 SVG 无文本）——
    // property 通道收到 JSON 字符串若被丢弃，该字符不会出现在任何星内
    const starTexts = els.flatMap((el) =>
      [...(el.shadowRoot?.querySelectorAll('.star') ?? [])].map((s) => (s.textContent ?? '').trim()),
    )
    const hasIconsJson = starTexts.some((t) => t === '\u{1F60D}')
    // colors JSON 专属产物：colors demo（value=2 × 3 段均分）命中第二段 gold →
    // --oas-preset-gold 注入（color="red" demo 是普通属性不受本 bug 影响，不作为判据）
    const activeVars = els.map((el) => (el as HTMLElement).style.getPropertyValue('--oas-rate-active'))
    const hasColorsJson = activeVars.some((v) => v.includes('--oas-preset-gold'))
    return { path: location.pathname, rates: els.length, hasIconsJson, hasColorsJson }
  })
  expect(rate.path, '客户端路由到 rate').toContain('/components/rate')
  expect(rate.rates, 'rate demo 在场').toBeGreaterThan(0)
  expect(rate.hasIconsJson, 'icons JSON attribute 应生效（逐值符号渲染）').toBe(true)
  expect(rate.hasColorsJson, 'colors JSON attribute 应生效（分段色注入）').toBe(true)

  expect(errors, 'console/page 零 error').toEqual([])
})
