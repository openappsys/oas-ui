import { test, expect } from '@playwright/test'

// gantt 浏览器回归：渲染/刻度/行树折叠/依赖连线/今日线/拖拽改期真指针操作/console 零告警/暗色
test('gantt 浏览器回归：渲染 + 刻度切换 + 折叠 + 拖拽改期 + console 零告警', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    // 口径对齐 scheduler.spec：只收 error（firefox 引擎噪音如 scroll-linked 警告/GA cookie 不属组件缺陷）
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#gantt-basic', { timeout: 15000 })

  const basic = page.locator('#gantt-basic')

  // 渲染：任务条 + 摘要条（WBS 缺省展开）；p2 数据 expanded:false 收起 → 先展开再断言里程碑
  await expect(basic.locator('.bars .bar[data-id="t1"]')).toBeVisible()
  await expect(basic.locator('.bars .bar[data-id="p1"].summary')).toBeVisible()
  await expect(basic.locator('.bars .bar[data-id="m1"].milestone')).toHaveCount(0)
  await basic.locator('.row-name[data-key="p2"] .toggle').click()
  await expect(basic.locator('.bars .bar[data-id="m1"].milestone')).toBeVisible()
  await expect(basic.locator('.side-body .row-name[data-key="t2"]')).toBeVisible()

  // 依赖连线（SVG path data-type）
  await expect(basic.locator('svg.links path[data-from][data-to]').first()).toBeVisible()

  // 今日线渲染（#gantt-today demo 动态注入覆盖今天的区间；基础 demo 静态 3 月数据不含今天 → 无线属预期）
  const todayDemo = page.locator('#gantt-today')
  await expect(todayDemo.locator('.today-line:not([hidden])')).toBeVisible()

  // 行树折叠：点折叠钮 → 子行消失 + expanded 写回
  const toggle = basic.locator('.row-name[data-key="p1"] .toggle')
  await toggle.click()
  await expect(basic.locator('.side-body .row-name[data-key="t2"]')).toHaveCount(0)
  const expandedAttr = await basic.evaluate((el) => el.getAttribute('expanded'))
  expect(JSON.parse(expandedAttr ?? '[]')).not.toContain('p1')
  await basic.locator('.row-name[data-key="p1"] .toggle').click()
  await expect(basic.locator('.side-body .row-name[data-key="t2"]')).toBeVisible()

  // 刻度切换（宿主 segmented → scale 属性 → oas-scale-change；监听挂在 scale demo 实例上）
  const scaleChanged = page.locator('#gantt-scale').evaluate(
    (el) =>
      new Promise<string>((resolve) => {
        el.addEventListener(
          'oas-scale-change',
          ((e: CustomEvent<{ scale: string }>) => resolve(e.detail.scale)) as EventListener,
          {
            once: true,
          },
        )
      }),
  )
  await page.locator('#gantt-scale-switch [part="item"]', { hasText: '周' }).click()
  expect(await scaleChanged).toBe('week')
  await expect(page.locator('#gantt-scale .head-minor .unit').first()).toContainText('W')
  // 切回 day
  await page.locator('#gantt-scale-switch [part="item"]', { hasText: '日' }).click()

  // 拖拽改期（真实指针）：t1 右拖 72px（2 格）→ oas-task-change 派发 + 数据写回
  // mouse 事件不自动滚动：先滚进视口
  await basic.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(300)
  const before = await basic.evaluate(
    (el) => (el as unknown as { tasks: Array<{ id: string; start: string }> }).tasks.find((t) => t.id === 't1')?.start,
  )
  const bar = basic.locator('.bars .bar[data-id="t1"]')
  const box = await bar.boundingBox()
  if (box) {
    const y = box.y + box.height / 2
    await page.mouse.move(box.x + box.width / 2, y)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 72, y, { steps: 5 })
    await page.mouse.up()
  }
  const after = await basic.evaluate(
    (el) => (el as unknown as { tasks: Array<{ id: string; start: string }> }).tasks.find((t) => t.id === 't1')?.start,
  )
  expect(after, '真指针拖拽后 start 应写回前移 2 天').not.toBe(before)

  // tooltip（真实 hover）
  const bar2 = basic.locator('.bars .bar[data-id="t2"]')
  await bar2.hover()
  await expect(basic.locator('.tooltip:not([hidden])')).toBeVisible()

  // 暗色：条与今日线仍可见
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(300)
  await expect(basic.locator('.bars .bar[data-id="t1"]').first()).toBeVisible()
  await expect(todayDemo.locator('.today-line:not([hidden])')).toBeVisible()

  expect(errors).toEqual([])
})

// 窗口自适应与可见性回归：默认窗口贴合数据（首任务不被起始留白推到右缘）、今日线/里程碑在视口内、
// 行名超长出省略号、跨月主刻度标签靠左可见（旧缺陷：合并格居中把标签推出视口）
test('gantt 窗口自适应/可见性回归：首任务贴近左缘 + 今日线/里程碑在视口 + 行名 ellipsis + 主刻度标签可见', async ({
  page,
}) => {
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#gantt-basic', { timeout: 15000 })
  await page.waitForTimeout(500)

  const basic = page.locator('#gantt-basic')
  await basic.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(200)

  // 首任务左缘落在时间轴左半区（旧缺陷：起始留白 7 天把条推到 252px 接近右缘）
  const tbodyBox = (await basic.locator('.tbody').boundingBox())!
  const t1Box = (await basic.locator('.bars .bar[data-id="t1"]').boundingBox())!
  expect(t1Box.x).toBeGreaterThanOrEqual(tbodyBox.x)
  expect(t1Box.x).toBeLessThan(tbodyBox.x + tbodyBox.width / 2)

  // 主刻度标签靠 inline-start：文本左缘贴近合并格左缘（居中会把宽月格的标签推到格中部）
  const majorAlign = await basic
    .locator('.head-major .unit')
    .first()
    .evaluate((el) => {
      const cell = el.getBoundingClientRect()
      const range = document.createRange()
      range.selectNodeContents(el)
      const text = range.getBoundingClientRect()
      return { delta: text.left - cell.left, width: cell.width }
    })
  expect(majorAlign.delta).toBeLessThan(30)

  // 今日线在视口内（#gantt-today 数据动态覆盖今天；旧缺陷：窗口起点留白使今日线滚出视口）
  const todayDemo = page.locator('#gantt-today')
  await todayDemo.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(200)
  await expect(todayDemo.locator('.today-line:not([hidden])')).toBeInViewport()

  // 里程碑菱形在视口内（拖拽 demo 的 dg2；旧缺陷：滚出视口 → 整行无菱形）
  const drag = page.locator('#gantt-drag')
  await drag.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(200)
  await expect(drag.locator('.bars .bar[data-id="dg2"].milestone')).toBeInViewport()
  await expect(drag.locator('.bars .bar[data-id="dg2"] .dia')).toBeVisible()

  // readonly 整图只读 demo：任务条在视口内（旧缺陷：条被推到右缘外看似空白）
  const readonly = page.locator('oas-gantt[readonly]')
  await readonly.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(200)
  await expect(readonly.locator('.bars .bar[data-id="r1"]')).toBeInViewport()

  // 行名超长省略号：.name 收缩到行宽内且 ellipsis（旧缺陷：flex 子项不收缩 → 硬裁无省略号）
  const nameStyle = await drag.locator('.row-name[data-key="dg1"] .name').evaluate((el) => {
    const cs = getComputedStyle(el)
    return { textOverflow: cs.textOverflow, overflow: cs.overflow, clientW: el.clientWidth, scrollW: el.scrollWidth }
  })
  expect(nameStyle.textOverflow).toBe('ellipsis')
  expect(nameStyle.overflow).toBe('hidden')
  expect(nameStyle.scrollW).toBeGreaterThan(nameStyle.clientW)
})
