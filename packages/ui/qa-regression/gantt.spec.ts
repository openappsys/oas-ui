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

  // 条旁标签缺省不渲染（行名列已承载名称，旧缺陷：条旁重复行名）；显式 inside/right 才渲染
  await expect(basic.locator('.bars .bar[data-id="t1"] .bar-label')).toHaveCount(0)
  await expect(page.locator('oas-gantt[label-position="inside"] .bar-label').first()).toBeVisible()
  await expect(page.locator('oas-gantt[label-position="right"] .bar-label').first()).toBeVisible()

  // 轴标签抽稀：日档窄容器下相邻可见辅刻度中心距 ≥ 阈值（旧缺陷：14.4px 列宽下双位日号首尾相接）
  const scaleDemo = page.locator('#gantt-scale')
  await scaleDemo.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(200)
  const centers = await scaleDemo.locator('.head-minor .unit').evaluateAll((cells) =>
    cells
      .filter((c) => (c.textContent ?? '').trim() !== '')
      .map((c) => {
        const r = c.getBoundingClientRect()
        return r.left + r.width / 2
      }),
  )
  expect(centers.length, '抽稀后仍有可见刻度标签').toBeGreaterThan(2)
  for (let i = 1; i < centers.length; i++) {
    expect(centers[i]! - centers[i - 1]!, '相邻可见刻度标签不得堆叠').toBeGreaterThanOrEqual(16)
  }
})

// RTL scrollToDate 走真实浏览器 scrollLeft 负值模型（0 在最右、向左滚为负）——
// happy-dom 无 RTL 滚动布局，单测只能锁公式，负值语义必须真浏览器验证；
// 附带显式 type:"milestone" 带 end 的浏览器渲染（菱形可见，end 不渲染成条形）
test('gantt RTL scrollToDate 负值模型 + 显式 milestone 带 end 渲染菱形', async ({ page }) => {
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#gantt-basic', { timeout: 15000 })
  const result = await page.evaluate(async () => {
    await customElements.whenDefined('oas-gantt')
    const tasks = JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-20' }])
    const make = (dir?: string) => {
      const el = document.createElement('oas-gantt')
      if (dir) el.setAttribute('dir', dir)
      el.setAttribute('tasks', tasks)
      el.style.position = 'fixed'
      el.style.width = '400px' // 固定宽：视口半宽小于目标 x，scrollLeft 计算不被钳 0
      el.style.top = '-9999px' // 离屏挂载：有真实布局测量，不干扰页面视觉
      document.body.appendChild(el)
      return el
    }
    const ltr = make() as HTMLElement & { scrollToDate(d: string): void }
    const rtl = make('rtl') as HTMLElement & { scrollToDate(d: string): void }
    const ms = make('rtl')
    ms.setAttribute(
      'tasks',
      JSON.stringify([{ id: 'm', name: 'M', start: '2026-03-05', end: '2026-03-10', type: 'milestone' }]),
    )
    // 感知层验证：RTL 下 scrollToDate 后目标列真的落在视口内（旧缺陷：LTR 公式把视口钉在画布左端）
    const target = make('rtl') as HTMLElement & { scrollToDate(d: string): void }
    target.setAttribute('tasks', JSON.stringify([{ id: 'x', name: 'X', start: '2026-03-18', end: '2026-03-19' }]))
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    ltr.scrollToDate('2026-03-18')
    rtl.scrollToDate('2026-03-18')
    target.scrollToDate('2026-03-18')
    const tbRect = (target.shadowRoot!.querySelector('.tbody') as HTMLElement).getBoundingClientRect()
    const barRect = (target.shadowRoot!.querySelector('.bar[data-id="x"]') as HTMLElement).getBoundingClientRect()
    const centered =
      barRect.width > 0 &&
      barRect.left >= tbRect.left - 1 &&
      barRect.left + barRect.width <= tbRect.left + tbRect.width + 1
    const out = {
      rtlAttr: rtl.hasAttribute('data-rtl'),
      ltr: (ltr.shadowRoot!.querySelector('.tbody') as HTMLElement).scrollLeft,
      rtl: (rtl.shadowRoot!.querySelector('.tbody') as HTMLElement).scrollLeft,
      milestoneDiamond: !!ms.shadowRoot!.querySelector('.bar.milestone .dia'),
      milestoneW: (ms.shadowRoot!.querySelector('.bar.milestone') as HTMLElement).style.width,
      centered,
    }
    ltr.remove()
    rtl.remove()
    ms.remove()
    target.remove()
    return out
  })
  expect(result.rtlAttr).toBe(true)
  // LTR 正值模型：向右滚为正
  expect(result.ltr).toBeGreaterThan(0)
  // RTL 负值模型：同一目标日期 scrollLeft 为负（时间轴镜像，0 在画布最右）
  expect(result.rtl).toBeLessThan(0)
  // 感知层：目标日期列滚动后落在视口内（不只是公式为负）
  expect(result.centered, 'RTL scrollToDate 后目标列应可见').toBe(true)
  expect(result.milestoneDiamond).toBe(true)
  // end 忽略：菱形容器恒 16px 宽（按 end 渲染则会是条形宽度）
  expect(result.milestoneW).toBe('16px')
})
