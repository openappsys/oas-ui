import { test, expect } from '@playwright/test'

// SPA 内部跳转（VitePress 客户端路由）回归：
// Vue 对自定义元素按「key in el」决定写 property 还是 attribute。若组件的**私有方法名与单字属性同名**
// （如 private scale() 与 scale="day"），SPA 跳转时元素已升级 → Vue 把属性写成 property → own string
// 遮蔽原型方法 → `this.scale is not a function` → demo 空白；整页刷新因升级晚于 patch 才走 attribute。
// 该用例锁定 gantt / resource 在「表格页 → 甘特 → 资源」的客户端跳转后仍渲染数据且无 pageerror。
test('docs SPA 跳转：gantt / resource demo 不因属性-方法撞名而空白', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))

  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)

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
    }
  })
  expect(gantt.path, '客户端路由到 gantt').toContain('/components/gantt')
  expect(gantt.bars, 'gantt demo 渲染任务条').toBeGreaterThan(0)
  expect(gantt.rows, 'gantt demo 渲染行').toBeGreaterThan(0)
  expect(gantt.ownScale, '元素上不得出现 own 属性 scale（会遮蔽方法）').toBe(false)

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

  expect(errors, 'console/page 零 error').toEqual([])
})
