import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// 冷启动竞态对策：等到自定义元素**升级并首帧渲染**（而非 waitForSelector 默认的「可见」——
// 未升级的 <oas-gantt> 是 0 尺寸空盒子，高并发下升级被 CPU 抢占推迟 → 「可见」假失败）。
// 渲染出 .bar 才继续，超时放宽以吸收冷加载抖动。
async function waitGantt(page: Page, id: string): Promise<void> {
  await page.waitForFunction(
    (target) => {
      const el = document.getElementById(target) as (HTMLElement & { shadowRoot?: ShadowRoot | null }) | null
      return !!el && !!el.shadowRoot && !!el.shadowRoot.querySelector('.bar')
    },
    id,
    { timeout: 30000 },
  )
}

// gantt 浏览器回归：渲染/刻度/行树折叠/依赖连线/今日线/拖拽改期真指针操作/console 零告警/暗色
test('gantt 浏览器回归：渲染 + 刻度切换 + 折叠 + 拖拽改期 + console 零告警', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    // 口径对齐 scheduler.spec：只收 error（firefox 引擎噪音如 scroll-linked 警告/GA cookie 不属组件缺陷）
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-basic')

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
  // 列窗口切片后首个渲染格可能是 blank/非周标签 → 按文本定位目标刻度单元
  await expect(page.locator('#gantt-scale .head-minor .unit', { hasText: /W\d/ }).first()).toContainText('W')
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
  await waitGantt(page, 'gantt-basic')
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
  await waitGantt(page, 'gantt-basic')
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

// 行拖拽重排（真实指针）+ 基线对比渲染
test('gantt 行拖拽重排 oas-reparent + 基线对比渲染', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-reparent')

  // 基线对比：demo 页 show-baseline 实例渲染基线条
  await expect(page.locator('oas-gantt[show-baseline] .baseline').first()).toBeVisible()

  // 行重排：把 w4 拖到 w3 上半区（before），收口派发 oas-reparent
  const host = page.locator('#gantt-reparent')
  const w4 = host.locator('.row-name[data-key="w4"]')
  const w3 = host.locator('.row-name[data-key="w3"]')
  await w4.scrollIntoViewIfNeeded()
  const b4 = (await w4.boundingBox())!
  const b3 = (await w3.boundingBox())!
  await page.mouse.move(b4.x + 12, b4.y + b4.height / 2)
  await page.mouse.down()
  await page.mouse.move(b3.x + 12, b3.y + 4, { steps: 5 })
  // 落点指示线可见（评审 C1：drop-line 曾零宽度不可见）
  const dropW = await host.locator('.drop-line').evaluate((el) => el.getBoundingClientRect().width)
  expect(dropW).toBeGreaterThan(0)
  await page.mouse.up()
  await expect(page.locator('#gantt-reparent-output')).toContainText('oas-reparent')

  expect(errors).toEqual([])
})

// 依赖连线交互编辑：悬停出连线点 → 真拖建依赖 → 点选删除
test('gantt 连线拖拽建依赖 + 选中 Delete 删除', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-link')

  const host = page.locator('#gantt-link')
  const l1 = host.locator('.bar[data-id="l1"]')
  const l2 = host.locator('.bar[data-id="l2"]')
  await l1.scrollIntoViewIfNeeded()
  await l1.hover()
  const endDot = l1.locator('.link-dot.link-end')
  await expect(endDot).toHaveCSS('opacity', '1')
  const dRect = (await endDot.boundingBox())!
  const b2 = (await l2.boundingBox())!
  await page.mouse.move(dRect.x + dRect.width / 2, dRect.y + dRect.height / 2)
  await page.mouse.down()
  await page.mouse.move(b2.x + 4, b2.y + b2.height / 2, { steps: 5 }) // 目标左半 → 后继 l2 依赖 l1（fs）
  await page.mouse.up()
  await expect(page.locator('#gantt-link-output')).toContainText('l1(fs)')

  // 新增连线：真实鼠标点中连线（走命中测试，防 .bars 遮挡假绿）→ 选中 → Delete 删除
  const hit = host.locator('.link-hit[data-from="l2"][data-to="l1"]')
  await expect(hit).toHaveCount(1)
  const pt = await hit.evaluate((el) => {
    const p = el as SVGPathElement
    const c = p.getPointAtLength(p.getTotalLength() / 2)
    const r = (p.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
    return { x: r.left + c.x, y: r.top + c.y }
  })
  await page.mouse.click(pt.x, pt.y)
  await expect(hit).toHaveClass(/selected/)
  await page.keyboard.press('Delete')
  await expect(page.locator('#gantt-link-output')).toContainText('（无）')

  expect(errors).toEqual([])
})

// 拖拽自动滚动：拖条到视口下缘 → tbody 自动向底滚
test('gantt 拖拽到视口下缘自动滚动', async ({ page }) => {
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-virtual')
  const host = page.locator('#gantt-virtual')
  const bar = host.locator('.bar').first()
  await bar.scrollIntoViewIfNeeded()
  const bb = (await bar.boundingBox())!
  const tbBox = (await host.locator('.tbody').boundingBox())!
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2)
  await page.mouse.down()
  await page.mouse.move(bb.x + bb.width / 2, tbBox.y + tbBox.height - 4, { steps: 8 })
  await page.waitForFunction(
    () => {
      const t = (
        document.getElementById('gantt-virtual') as HTMLElement & { shadowRoot: ShadowRoot }
      ).shadowRoot.querySelector('.tbody') as HTMLElement
      return t.scrollTop > 0
    },
    undefined,
    { timeout: 8000 },
  )
  const st = await host.locator('.tbody').evaluate((el) => el.scrollTop)
  expect(st, '拖到边缘应自动滚动').toBeGreaterThan(0)
  await page.mouse.up()
})

// 多选：点行选中 + Shift 范围连选 → oas-selection-change 反馈
test('gantt 多选点选与 Shift 连选派发 oas-selection-change', async ({ page }) => {
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-select')
  const host = page.locator('#gantt-select')
  const out = page.locator('#gantt-select-output')
  await host.locator('.row-name[data-key="s1"]').click()
  await expect(out).toContainText('已选 1 条')
  await host.locator('.row-name[data-key="s3"]').click({ modifiers: ['Shift'] })
  await expect(out).toContainText('已选 3 条')
})

// 行 treeitem 暴露 aria-posinset / aria-setsize（同级全集）
test('gantt 行 aria-posinset/aria-setsize', async ({ page }) => {
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-select')
  const host = page.locator('#gantt-select')
  await expect(host.locator('.row-name[data-key="s1"]')).toHaveAttribute('aria-posinset', '1')
  await expect(host.locator('.row-name[data-key="s1"]')).toHaveAttribute('aria-setsize', '4')
  await expect(host.locator('.row-name[data-key="s4"]')).toHaveAttribute('aria-posinset', '4')
})

// 条上 Delete 不冒泡误删已选连线；连线键盘删除后焦点交回组件（非 body）
test('gantt 条上 Delete 不误删连线 + 删连线后焦点交回组件', async ({ page }) => {
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-link')
  const host = page.locator('#gantt-link')
  const hit = host.locator('.link-hit[data-from="l3"][data-to="l2"]')
  await expect(hit).toHaveCount(1)
  await hit.click()
  await expect(hit).toHaveClass(/selected/)
  await host.locator('.bar[data-id="l1"]').focus()
  await page.keyboard.press('Delete')
  await expect(hit, '条上 Delete 不应删连线').toHaveCount(1)
  await hit.click()
  await hit.focus()
  await page.keyboard.press('Enter')
  await expect(hit).toHaveCount(0)
  const focused = await page.evaluate(() => document.activeElement?.id)
  expect(focused, '焦点应留在组件上而非 body').toBe('gantt-link')
})

// 属性通道重写 tasks（非 property）同样剪枝选中并派发 selection-change
test('gantt 属性通道重写 tasks 剪枝选中', async ({ page }) => {
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-select')
  const host = page.locator('#gantt-select')
  const out = page.locator('#gantt-select-output')
  await host.locator('.row-name[data-key="s1"]').click()
  await host.locator('.row-name[data-key="s3"]').click({ modifiers: ['Shift'] })
  await expect(out).toContainText('已选 3 条')
  await page.evaluate(() => {
    const el = document.getElementById('gantt-select') as HTMLElement
    el.setAttribute('tasks', JSON.stringify([{ id: 's3', name: '测试', start: '2026-03-16', end: '2026-03-20' }]))
  })
  await expect(out).toContainText('已选 1 条')
  await expect(out).toContainText('s3')
})

// RTL：选中行高亮条镜像到 inline-start（右缘）
test('gantt RTL 选中行高亮条镜像', async ({ page }) => {
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-select')
  await page.evaluate(() => {
    const el = document.createElement('oas-gantt')
    el.id = 'gantt-rtl-probe'
    el.setAttribute('dir', 'rtl')
    el.setAttribute('tasks', JSON.stringify([{ id: 'r1', name: 'R1', start: '2026-03-02', end: '2026-03-06' }]))
    document.body.appendChild(el)
  })
  const probe = page.locator('#gantt-rtl-probe')
  const row = probe.locator('.row-name[data-key="r1"]')
  await expect(row).toBeVisible()
  await row.click()
  await expect(row).toHaveClass(/selected/)
  const shadow = await row.evaluate((el) => getComputedStyle(el).boxShadow)
  expect(shadow, 'RTL 下高亮条应落在 -2px（右缘）').toContain('-2px')
})

// 触屏（coarse）：重排手柄渲染（≥24px 触达）且从手柄拖拽改序
test.describe('gantt 触屏硬指针', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 460, height: 720 } })
  test.skip(({ browserName }) => browserName !== 'chromium', 'coarse 触屏模拟仅 Chromium 支持')

  test('gantt 触屏手柄 ≥24px 且从手柄拖拽改序', async ({ page }) => {
    await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
    await waitGantt(page, 'gantt-reparent')
    const host = page.locator('#gantt-reparent')
    const out = page.locator('#gantt-reparent-output')
    const handle = host.locator('.row-name[data-key="w4"] .row-drag')
    await expect(handle).toBeVisible()
    expect(await handle.evaluate((el) => getComputedStyle(el).minWidth)).toBe('24px')
    await handle.scrollIntoViewIfNeeded()
    const hb = (await handle.boundingBox())!
    // 拖 w4 到 w3 之上（w4 原本已在 w3 之后 → 前移一位才是真实变更）
    const target = (await host.locator('.row-name[data-key="w3"]').boundingBox())!
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
    await page.mouse.down()
    await page.mouse.move(hb.x + hb.width / 2, target.y + 4, { steps: 6 })
    await page.mouse.up()
    await expect(out).toContainText('oas-reparent')
  })
})

// 任务管理示例：命令式增删改 + creatable 行内新建（真点 + console 零 error）
test('gantt 任务管理示例：命令式增删改 + creatable 行内新建', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-tm')
  const host = page.locator('#gantt-tm')
  const out = page.locator('#gantt-tm-output')

  await expect(host.locator('.row-add')).toHaveCount(4)

  await page.locator('#gantt-tm-add').click()
  await expect(out).toContainText('addTask →')

  await host.locator('.row-name[data-key="d2"]').click()
  await page.locator('#gantt-tm-copy').click()
  await expect(out).toContainText('duplicateTask(d2)')

  await page.locator('#gantt-tm-dep').click()
  await expect(out).toContainText('依赖')

  await page.locator('#gantt-tm-fit').click()
  await expect(out).toContainText('fit →')

  // 行内「＋」新建 → 进入重命名
  await host.locator('.row-name[data-key="d1"] .row-add').first().click()
  await expect(host.locator('.rename-input')).toHaveCount(1)
  await page.keyboard.press('Escape')

  // 删除所选
  await host.locator('.row-name[data-key="d4"]').click()
  await page.locator('#gantt-tm-del').click()
  await expect(out).toContainText('removeTasks →')

  // 改（updateTasks 批量浅合并）
  await host.locator('.row-name[data-key="d1"]').click()
  await page.locator('#gantt-tm-progress').click()
  await expect(out).toContainText('updateTasks →')

  expect(errors).toEqual([])
})

// 表头随横向滚动对齐列/条：LTR 与 RTL 下滚动前后「同一条与其日期表头格」的相对位移须不变（修复 RTL 表头错位）
test('gantt 表头横向对齐（LTR/RTL 滚动不变）', async ({ page }) => {
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-select')
  const res = await page.evaluate(async () => {
    const p = (n: number) => String(n).padStart(2, '0')
    const iso = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const probe = async (dir: string, s0: number, s1: number) => {
      const el = document.createElement('oas-gantt') as HTMLElement & {
        tasks: unknown
        shadowRoot: ShadowRoot
      }
      if (dir) el.setAttribute('dir', dir)
      el.style.width = '640px'
      document.body.appendChild(el)
      const tasks = []
      for (let i = 0; i < 60; i++) {
        tasks.push({
          id: 't' + i,
          name: 'T' + i,
          start: iso(new Date(2026, 2, 2 + i)),
          end: iso(new Date(2026, 2, 4 + i)),
        })
      }
      el.tasks = tasks
      await raf()
      const sr = el.shadowRoot
      const tb = sr.querySelector('.tbody') as HTMLElement
      // 列窗口切片后 .head-minor .unit 的 DOM 序号 ≠ 全局列索引 → 按日期标签定位。
      // 轴范围 03-01..05-03 里日号 '07' 出现两次（03-07/04-07），但两个滚动位置的列窗口
      // 都只到 3 月段（≤26 列），渲染出的 '07' 唯一 → find 结果稳定
      const gap = () => {
        const cell = [...sr.querySelectorAll<HTMLElement>('.head-minor .unit')].find(
          (c) => (c.textContent ?? '').trim() === '07',
        )!
        const bar = sr.querySelector<HTMLElement>('.bar[data-id="t5"]')!
        return cell.getBoundingClientRect().left - bar.getBoundingClientRect().left
      }
      tb.scrollLeft = s0
      await raf()
      const g0 = gap()
      tb.scrollLeft = s1
      await raf()
      const g1 = gap()
      el.remove()
      return { g0, g1 }
    }
    return {
      ltr: await probe('', 0, 120),
      rtl: await probe('rtl', 0, -120),
    }
  })
  for (const [dir, d] of Object.entries(res)) {
    // 滚动前后相对位移不变（修复前 RTL 会漂移 maxScroll 像素）
    expect(Math.abs(d.g1 - d.g0), `${dir} 表头-条相对位移应滚动不变`).toBeLessThanOrEqual(1)
  }
})

// 横向列虚拟化：3 年 day 档（≈1100 列）表头/背景格只渲染窗口列（远小于总列数），
// 滚到时间轴中部后窗口平移且可视区仍有刻度覆盖（切片不得漏掉可视列）
test('gantt 长跨度列虚拟化：表头格数有上界 + 滚动后窗口平移覆盖可视区', async ({ page }) => {
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-basic')
  const res = await page.evaluate(async () => {
    const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const el = document.createElement('oas-gantt') as HTMLElement & {
      tasks: unknown
      units: Array<{ startMs: number }>
      scrollToDate(d: string): void
      shadowRoot: ShadowRoot
    }
    el.style.width = '600px'
    el.style.position = 'fixed'
    el.style.top = '-9999px' // 离屏挂载：有真实布局测量，不干扰页面视觉
    document.body.appendChild(el)
    el.tasks = [{ id: 'a', name: 'A', start: '2026-01-01', end: '2028-12-31' }]
    await raf()
    const sr = el.shadowRoot!
    const tb = sr.querySelector('.tbody') as HTMLElement
    const tbRect = () => tb.getBoundingClientRect()
    const hasCoverage = () =>
      [...sr.querySelectorAll<HTMLElement>('.head-minor .unit')].some((c) => {
        const r = c.getBoundingClientRect()
        return r.left < tbRect().right && r.right > tbRect().left
      })
    const before = {
      units: el.units.length,
      minors: sr.querySelectorAll('.head-minor .unit').length,
      coverage: hasCoverage(),
    }
    el.scrollToDate('2027-06-15')
    // scroll 事件 → onScroll → rAF 合帧重建列窗口（等待窗口追上滚动位置）
    await raf()
    await raf()
    const after = {
      scrollLeft: tb.scrollLeft,
      minors: sr.querySelectorAll('.head-minor .unit').length,
      coverage: hasCoverage(),
    }
    el.remove()
    return { before, after }
  })
  expect(res.before.units, '3 年 day 档 ≈1100 列').toBeGreaterThan(1000)
  expect(res.before.minors, '窗口列远小于总列数').toBeLessThan(200)
  expect(res.before.coverage, '未滚动时可视区有刻度覆盖').toBe(true)
  expect(res.after.scrollLeft, 'scrollToDate 已滚动').not.toBe(0)
  expect(res.after.minors, '滚到中部后窗口格数仍有上界').toBeLessThan(200)
  expect(res.after.minors).toBeGreaterThan(0)
  expect(res.after.coverage, '滚到中部后可视区仍有刻度覆盖').toBe(true)
})

// 宿主容器变宽（无滚动）→ 列窗口必须扩展到新右缘：长跨度下自适应列宽被钳在 SCALE_MIN_COL，
// 旧实现只比较 displayColW（不变）→ 早退跳过列窗口/表头重算 → 时间轴右侧露白
test('gantt 容器变宽：列窗口扩展覆盖新右缘（无滚动不露白）', async ({ page }) => {
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-basic')
  const res = await page.evaluate(async () => {
    const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const el = document.createElement('oas-gantt') as HTMLElement & {
      tasks: unknown
      shadowRoot: ShadowRoot
    }
    el.style.cssText = 'position:fixed;top:-9999px;left:0;width:600px' // 离屏：有真实布局测量
    document.body.appendChild(el)
    el.tasks = [{ id: 'a', name: 'A', start: '2026-01-01', end: '2028-12-31' }]
    await raf()
    const sr = el.shadowRoot!
    const tb = sr.querySelector('.tbody') as HTMLElement
    const probe = () => {
      const units = [...sr.querySelectorAll<HTMLElement>('.head-minor .unit')]
      const last = units[units.length - 1]
      return {
        clientW: tb.clientWidth,
        count: units.length,
        lastRight: last ? last.getBoundingClientRect().right : Number.NEGATIVE_INFINITY,
        tbRight: tb.getBoundingClientRect().right,
      }
    }
    const narrow = probe()
    // 宿主容器变宽：不滚动、不改数据 → ResizeObserver 回调路径重算列窗口
    el.style.width = '1200px'
    await raf()
    await raf()
    const wide = probe()
    el.remove()
    return { narrow, wide }
  })
  expect(res.wide.clientW, '容器变宽后 tbody 视口变宽').toBeGreaterThan(res.narrow.clientW)
  expect(
    res.wide.lastRight,
    `最后可见刻度右缘应覆盖变宽后的视口右缘（wide.last=${res.wide.lastRight.toFixed(0)} wide.tbRight=${res.wide.tbRight.toFixed(0)}）`,
  ).toBeGreaterThanOrEqual(res.wide.tbRight - 1)
  expect(res.wide.count, '可见刻度格数随窗口扩展增加').toBeGreaterThan(res.narrow.count)
})

// 宿主容器变高（无滚动）→ 行窗口必须补齐新视口：旧实现 onViewportResize 只比较
// 「视口宽 + displayColW」，高度变化早退跳过 renderWindow → 底部露白直到滚动才重建。
// 行窗口与列窗口同因（视口尺寸快照判据），一并兜住
test('gantt 容器变高：行窗口扩展覆盖新视口底部（无滚动不露白）', async ({ page }) => {
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-basic')
  await page.evaluate(async () => {
    const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const el = document.createElement('oas-gantt') as HTMLElement & { tasks: unknown; shadowRoot: ShadowRoot }
    el.id = 'gantt-grow-h'
    el.style.cssText = 'position:fixed;top:-9999px;left:0;width:600px;--oas-gantt-height:200px' // 离屏：有真实布局测量
    document.body.appendChild(el)
    el.tasks = Array.from({ length: 60 }, (_, i) => ({
      id: 'g' + i,
      name: 'G' + i,
      start: '2026-01-01',
      end: '2026-03-31',
    }))
    await raf()
  })
  const probe = () =>
    page.evaluate(() => {
      const el = document.getElementById('gantt-grow-h') as (HTMLElement & { shadowRoot: ShadowRoot }) | null
      if (!el) return null
      const sr = el.shadowRoot
      const tb = sr.querySelector('.tbody') as HTMLElement
      const names = [...sr.querySelectorAll<HTMLElement>('.side-body .row-name')]
      const last = names[names.length - 1]
      return {
        scrollTop: tb.scrollTop,
        clientH: tb.clientHeight,
        rows: names.length,
        lastBottom: last ? last.getBoundingClientRect().bottom : Number.NEGATIVE_INFINITY,
        tbBottom: tb.getBoundingClientRect().bottom,
      }
    })
  const before = await probe()
  // 容器变高：零滚动、零数据变化 → ResizeObserver 回调路径（onViewportResize）补行窗口
  await page.evaluate(() => {
    document.getElementById('gantt-grow-h')!.style.setProperty('--oas-gantt-height', '560px')
  })
  await page.waitForFunction(
    () => {
      const el = document.getElementById('gantt-grow-h') as (HTMLElement & { shadowRoot: ShadowRoot }) | null
      if (!el) return false
      const tb = el.shadowRoot.querySelector('.tbody') as HTMLElement
      const names = el.shadowRoot.querySelectorAll('.side-body .row-name')
      const last = names[names.length - 1] as HTMLElement | undefined
      return !!last && last.getBoundingClientRect().bottom >= tb.getBoundingClientRect().bottom - 2
    },
    undefined,
    { timeout: 8000 },
  )
  const after = (await probe())!
  await page.evaluate(() => document.getElementById('gantt-grow-h')?.remove())
  expect(after.scrollTop, '零滚动（行窗口补齐不依赖滚动事件）').toBe(0)
  expect(after.clientH, 'tbody 视口已变高').toBeGreaterThan(before!.clientH)
  expect(after.rows, '渲染行数随视口变高增加（旧行窗口不补则此断言红）').toBeGreaterThan(before!.rows)
  expect(
    after.lastBottom,
    `最后可见行底缘应覆盖变高后的视口底部（last=${after.lastBottom.toFixed(0)} tb=${after.tbBottom.toFixed(0)}）`,
  ).toBeGreaterThanOrEqual(after.tbBottom - 2)
})

// 增强示例：auto-schedule 联动 + 框选 + 拖拽建任务（真点 + console 零 error）
test('gantt 增强示例：auto-schedule 联动 + 框选 + 拖拽建任务', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-auto')
  const host = page.locator('#gantt-auto')
  await host.evaluate((el) => {
    ;(el as HTMLElement).scrollIntoView({ block: 'center' })
  })
  const colW = await host.evaluate((el) => (el as unknown as { colW(): number }).colW())

  // 1) auto-schedule：拖 a2 右移 3 格 → a3 顺延
  const startOf = (id: string) =>
    host.evaluate(
      (el, i) =>
        (el as unknown as { tasks: Array<{ id: string; start: string }> }).tasks.find((t) => t.id === i)!.start,
      id,
    )
  const before = await startOf('a3')
  const a2 = (await host.locator('.bar[data-id="a2"]').boundingBox())!
  await page.mouse.move(a2.x + a2.width / 2, a2.y + a2.height / 2)
  await page.mouse.down()
  await page.mouse.move(a2.x + a2.width / 2 + 3 * colW, a2.y + a2.height / 2, { steps: 8 })
  await page.mouse.up()
  const after = await startOf('a3')
  expect(after > before, `a3 应随 a2 顺延（${before} → ${after}）`).toBe(true)

  // 2) 框选：左侧列表空白纵向拖 → 选中多行
  const side = (await host.locator('.side-body').boundingBox())!
  await page.mouse.move(side.x + side.width / 2, side.y + side.height - 6)
  await page.mouse.down()
  await page.mouse.move(side.x + side.width / 2, side.y + 4, { steps: 8 })
  await page.mouse.up()
  const selCount = await host.evaluate((el) => (el as unknown as { selection: string[] }).selection.length)
  expect(selCount, '框选应选中多行').toBeGreaterThanOrEqual(2)

  // 3) 拖拽建任务：时间轴空白拖出区间 → 任务数 +1
  const count = () => host.evaluate((el) => (el as unknown as { tasks: unknown[] }).tasks.length)
  const before2 = await count()
  const tb = (await host.locator('.tbody').boundingBox())!
  const yEmpty = tb.y + tb.height - 8
  await page.mouse.move(tb.x + 40, yEmpty)
  await page.mouse.down()
  await page.mouse.move(tb.x + 40 + 3 * colW, yEmpty, { steps: 8 })
  await page.mouse.up()
  expect(await count(), '空白拖出区间应新建 1 条').toBe(before2 + 1)

  expect(errors).toEqual([])
})

// 排程深化示例：关键路径高亮（k1/k2 关键、k3 有时差不高亮）
test('gantt 排程深化示例：关键路径高亮', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-critical')
  const host = page.locator('#gantt-critical')
  const critical = await host.evaluate((el) =>
    [...(el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot.querySelectorAll('.bar.critical')].map(
      (b) => (b as HTMLElement).dataset.id,
    ),
  )
  expect(critical.sort()).toEqual(['k1', 'k2'])
  expect(errors).toEqual([])
})

// 宿主集成配方 demo：编辑弹窗（双击条→弹窗→保存写回）+ 导出 JSON
test('gantt 集成配方：编辑弹窗写回 + 导出 JSON', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-edit')
  const host = page.locator('#gantt-edit')
  await host.evaluate((el) => {
    ;(el as HTMLElement).scrollIntoView({ block: 'center' })
  })
  // 双击条打开弹窗，且表单控件已回填该任务名（配方选择器须命中控件而非 form-item）
  await host.locator('.bar[data-id="e2"]').dblclick()
  await expect(page.locator('#gantt-edit-modal')).toHaveAttribute('visible', '')
  const nameInput = page.locator('#gantt-edit-form oas-input[name="name"] input')
  await expect(nameInput).toHaveValue('开发')
  // 改名 → 弹窗「确定」（oas-ok → form.submit）→ updateTask 写回
  await nameInput.fill('开发（改）')
  await page.evaluate(() => {
    document.getElementById('gantt-edit-modal')!.dispatchEvent(new CustomEvent('oas-ok'))
  })
  await expect
    .poll(async () =>
      host.evaluate(
        (el) =>
          (el as unknown as { tasks: Array<{ id: string; name: string }> }).tasks.find((t) => t.id === 'e2')!.name,
      ),
    )
    .toBe('开发（改）')

  // 导出 JSON
  await page.locator('#gantt-export').scrollIntoViewIfNeeded()
  await page.evaluate(() => {
    document.getElementById('gantt-export')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await expect(page.locator('#gantt-export-output')).toContainText('x1')

  expect(errors).toEqual([])
})

// 工作日日历：拖前置 → 后置吸附到工作日（跳周末）；连线 lag 标签可见
test('gantt 工作日日历：前推吸附工作日 + lag 标签', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-workdays')
  const host = page.locator('#gantt-workdays')
  await host.evaluate((el) => {
    ;(el as HTMLElement).scrollIntoView({ block: 'center' })
  })
  const colW = await host.evaluate((el) => (el as unknown as { colW(): number }).colW())
  // 连线 lag 标签（+2）
  await expect(host.locator('text.link-label')).toHaveCount(1)
  // 拖 w1 右移，w2 应吸附到工作日（周一~周五）
  const w1 = (await host.locator('.bar[data-id="w1"]').boundingBox())!
  await page.mouse.move(w1.x + w1.width / 2, w1.y + w1.height / 2)
  await page.mouse.down()
  await page.mouse.move(w1.x + w1.width / 2 + 6 * colW, w1.y + w1.height / 2, { steps: 10 })
  await page.mouse.up()
  const res = await host.evaluate((el) => {
    const t = (el as unknown as { tasks: Array<{ id: string; start: string }> }).tasks.find((x) => x.id === 'w2')!
    const d = new Date(t.start)
    return { start: t.start, day: d.getDay() }
  })
  expect(res.start, '后置应被前推').not.toBe('2026-03-09')
  expect([1, 2, 3, 4, 5], `吸附到工作日（实得 ${res.start} 周${res.day}）`).toContain(res.day)

  expect(errors).toEqual([])
})

// auto-schedule × show-critical-path 组合：拖前置后关键链高亮
test('gantt auto-schedule + show-critical-path 组合高亮', async ({ page }) => {
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-select')
  const res = await page.evaluate(async () => {
    const el = document.createElement('oas-gantt') as HTMLElement & {
      tasks: unknown
      shadowRoot: ShadowRoot
    }
    el.setAttribute('auto-schedule', '')
    el.setAttribute('show-critical-path', '')
    el.style.width = '600px'
    document.body.appendChild(el)
    el.tasks = [
      { id: 'c1', name: 'C1', start: '2026-03-02', end: '2026-03-04' },
      { id: 'c2', name: 'C2', start: '2026-03-05', end: '2026-03-09', dependencies: [{ id: 'c1' }] },
      { id: 'c3', name: 'C3', start: '2026-03-05', end: '2026-03-06', dependencies: [{ id: 'c1' }] },
    ]
    const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    await raf()
    const ids = [...el.shadowRoot.querySelectorAll('.bar.critical')].map((b) => (b as HTMLElement).dataset.id)
    el.remove()
    return ids.sort()
  })
  expect(res).toEqual(['c1', 'c2'])
})

// height 属性映射 --oas-gantt-height（与 oas-resource 同协议）：属性值生效（rect 高 = 盒高 260 +
// 上下边框 = 262，旧行为属性完全无效恒 320）、缺省回落 320、宿主自身 height 内联始终优先（组件不
// 触碰）、移除属性归零回落。
// 真实布局断言（getBoundingClientRect）——happy-dom 无布局，单测只能锁「变量写入」机制
test('gantt height 属性映射 --oas-gantt-height：属性生效/缺省 320/宿主内联优先/移除归零', async ({ page }) => {
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-basic')
  const res = await page.evaluate(async () => {
    await customElements.whenDefined('oas-gantt')
    const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const tasks = JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' }])
    const make = (heightAttr?: string, inlineHeight?: string) => {
      const el = document.createElement('oas-gantt') as HTMLElement & { shadowRoot: ShadowRoot }
      el.setAttribute('tasks', tasks)
      if (heightAttr != null) el.setAttribute('height', heightAttr)
      el.style.cssText = `position:fixed;top:-9999px;left:0;width:600px${inlineHeight ? `;height:${inlineHeight}` : ''}`
      document.body.appendChild(el)
      return el
    }
    const withAttr = make('260')
    const noAttr = make()
    const inlineHost = make(undefined, '400px') // 宿主内联 height、无 height 属性
    await raf()
    const read = (el: HTMLElement) => ({
      v: el.style.getPropertyValue('--oas-gantt-height'),
      h: Math.round(el.getBoundingClientRect().height),
      inlineHeight: el.style.height,
    })
    const out = { withAttr: read(withAttr), noAttr: read(noAttr), inlineHost: read(inlineHost) }
    // 移除属性 → 组件自写值归零，回落 token 缺省 320
    withAttr.removeAttribute('height')
    await raf()
    const afterRemove = read(withAttr)
    withAttr.remove()
    noAttr.remove()
    inlineHost.remove()
    return { ...out, afterRemove }
  })
  // rect 高口径（实测 + 源码确认）：height: var(--oas-gantt-height, 320px) 设在内部 .gantt 上
  // （content-box），上下边框（各 1px）也在 .gantt 上 → token 通道 rect = 盒高 + 2（默认 320 → 322）；
  // 宿主自身无边框，宿主内联 height 是 border-box 高 → 内联通道 rect = 内联值。故 token 通道高度
  // 用差值/加边框口径断言，不把 CSS 盒高直接当 rect 高。base 取无属性回落态，borderOffset 记录边框贡献。
  const base = res.noAttr.h
  const borderOffset = base - 320
  expect(borderOffset, '无 height 属性 → 回落 token 缺省 320（rect = 320 + .gantt 上下边框 = 322）').toBe(2)
  expect(res.withAttr.v, 'height="260" → 组件写 --oas-gantt-height:260px').toBe('260px')
  expect(
    base - res.withAttr.h,
    'height="260" → 盒高 320−60=260，rect = 260 + 边框（旧缺陷属性无效时盒高恒 320，差值为 0）',
  ).toBe(60)
  expect(res.withAttr.inlineHeight, '宿主 height 内联未被组件触碰').toBe('')
  expect(res.noAttr.v, '无 height 属性 → 组件不写变量（宿主 token 通道不受影响）').toBe('')
  expect(res.inlineHost.v, '无 height 属性 → 组件不写变量').toBe('')
  expect(res.inlineHost.inlineHeight, '宿主内联 height 原样保留').toBe('400px')
  expect(
    res.inlineHost.h,
    '宿主内联 height:400px 优先（无属性）→ 宿主无边框、内联 height 即 border-box 高 → rect = 400（内部 .gantt 回落 322 不撑满）',
  ).toBe(400)
  expect(res.afterRemove.v, '移除 height 属性 → 自写值归零').toBe('')
  expect(res.afterRemove.h, '移除后回落 token 缺省 320（rect 与默认态一致）').toBe(base)
})

// height token 通道（宿主 class 规则 --oas-gantt-height，无 height 属性）：宿主 token 生效 → height 属性
// 接管 → 移除属性回落宿主 token。真实几何 + 边框口径（token 挂在内部 .gantt 上，rect = 盒高 + 上下边框 2）
test('gantt height token 通道：宿主 token 500 → height="480" 接管 → 移除回落 500', async ({ page }) => {
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-basic')
  // 宿主元素级 class 规则设置 --oas-gantt-height（无 height 属性 → 组件不写该变量）
  await page.addStyleTag({ content: '.gantt-h-token { --oas-gantt-height: 500px }' })
  const res = await page.evaluate(async () => {
    await customElements.whenDefined('oas-gantt')
    const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const tasks = JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' }])
    const make = (cls: string | null): HTMLElement & { requestUpdate(): void; shadowRoot: ShadowRoot } => {
      const el = document.createElement('oas-gantt') as HTMLElement & { requestUpdate(): void; shadowRoot: ShadowRoot }
      if (cls) el.classList.add(cls)
      el.setAttribute('tasks', tasks)
      el.style.cssText = 'position:fixed;top:-9999px;left:0;width:600px'
      document.body.appendChild(el)
      return el
    }
    const def = make(null)
    const el = make('gantt-h-token')
    await raf()
    const h = (e: HTMLElement) => Math.round(e.getBoundingClientRect().height)
    const v = (e: HTMLElement) => e.style.getPropertyValue('--oas-gantt-height')
    const before = { h: h(el), v: v(el) }
    el.setAttribute('height', '480')
    el.requestUpdate()
    await raf()
    const attr = { h: h(el), v: v(el) }
    el.removeAttribute('height')
    el.requestUpdate()
    await raf()
    const after = { h: h(el), v: v(el) }
    const out = { defH: h(def), before, attr, after }
    def.remove()
    el.remove()
    return out
  })
  const borderOffset = res.defH - 320
  expect(borderOffset, '无 height 属性 → 回落 token 缺省 320（rect = 320 + .gantt 上下边框 = 322）').toBe(2)
  expect(res.before.v, '无 height 属性 → 组件不写变量，宿主 class token 生效').toBe('')
  expect(res.before.h, '宿主 token 500 → rect = 500 + 边框 2 = 502').toBe(500 + borderOffset)
  expect(res.attr.v, 'height="480" → 组件接管变量').toBe('480px')
  expect(res.attr.h, 'height="480" → rect = 480 + 边框 2 = 482').toBe(480 + borderOffset)
  expect(res.after.v, '移除属性 → 自写值归零').toBe('')
  expect(res.after.h, '回落宿主 token 500 → rect 502（不残留 480）').toBe(500 + borderOffset)
})

// windowed（服务端行窗口模式）+ 宿主托管时间范围（range-start/range-end）浏览器回归：
// 真实布局路径下——① 首帧 init 派发 oas-window-request（tasks 未装载）→ 宿主按请求区间精确
// 回填（真实宿主行为：读 detail.start/end）→ 覆盖后不再重复派发；② 滚出装载区 → 派发 scroll
// 请求（绝对行区间）；③ 宿主回填新窗口 → 新切片按**绝对行号**渲染；④ 轴托管：首帧 need 前扩
// 1 视口宽越出轴头派发 oas-range-request（reason=init，可视列窗贴轴起点 ±1 视口宽必越出——
// 与 oas-resource 同设计），滚到轴端派发（reason=scroll）。happy-dom 单测只锁机制（无布局），
// 本 spec 补真实滚动/布局感知层。
// 事件监听必须在 appendChild **之前**挂：首帧 update() 在 connectedCallback 内同步跑完，
// init 请求在 appendChild 返回前已派发（后挂监听会漏掉 init 请求 → coveredAfterFill 假失败）。
test('gantt windowed：滚动派发行窗口请求 + 绝对行回填 + 轴端 range 请求', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  // 组件就绪信号：custom element 升级 + 首帧**结构性元素**（.tbody）存在——不依赖 demo 数据的
  // 任务条（本用例 fixture 自建实例，gantt-basic 有无 .bar 与 windowed 机制无关）
  await page.waitForFunction(
    () => {
      const el = document.getElementById('gantt-basic') as (HTMLElement & { shadowRoot?: ShadowRoot | null }) | null
      return !!el && !!el.shadowRoot && !!el.shadowRoot.querySelector('.tbody')
    },
    undefined,
    { timeout: 30000 },
  )
  const res = await page.evaluate(async () => {
    await customElements.whenDefined('oas-gantt')
    const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const el = document.createElement('oas-gantt') as HTMLElement & { shadowRoot: ShadowRoot }
    el.setAttribute('windowed', '')
    el.setAttribute('total', '500')
    el.setAttribute('window-start', '0')
    el.setAttribute('height', '200') // 视口 200/40 = 5 行
    el.setAttribute('row-height', '40')
    // 宽轴托管（两年）：轴头/轴尾按 need ± 1 视口宽评估
    el.setAttribute('range-start', '2026-01-01')
    el.setAttribute('range-end', '2027-12-31')
    el.style.cssText = 'position:fixed;top:-9999px;left:0;width:600px' // 离屏：有真实布局测量
    const slice = (start: number, len: number): string =>
      JSON.stringify(
        Array.from({ length: len }, (_, i) => ({
          id: 't' + (start + i),
          name: '任务' + (start + i),
          start: `2026-03-${String((i % 27) + 1).padStart(2, '0')}`,
          end: `2026-03-${String((i % 27) + 2).padStart(2, '0')}`,
        })),
      )
    const winReqs: Array<{ start: number; end: number; reason: string }> = []
    const rangeReqs: Array<{ startMs: number; endMs: number; reason: string }> = []
    el.addEventListener('oas-window-request', (e) => {
      const d = (e as CustomEvent).detail
      winReqs.push({ start: d.start, end: d.end, reason: d.reason })
    })
    el.addEventListener('oas-range-request', (e) => {
      const d = (e as CustomEvent).detail
      rangeReqs.push({ startMs: d.startMs, endMs: d.endMs, reason: d.reason })
    })
    document.body.appendChild(el)
    // 首帧 init：tasks 未装载 → 期望区间自绝对行 0 起、越出空装载区
    const initReq = winReqs[0] ?? null
    // 宿主喂首屏切片 [0,6)（窄于期望区间）→ 同 need 去重，不重复派发
    el.setAttribute('tasks', slice(0, 6))
    await raf()
    const afterInit = winReqs.length
    // ① 宿主按 init 请求区间精确回填（覆盖期望区间）→ 不再重复派发
    if (initReq) el.setAttribute('tasks', slice(initReq.start, initReq.end - initReq.start))
    await raf()
    const coveredAfterFill = !!initReq && initReq.reason === 'init' && winReqs.length === afterInit
    // 轴托管首帧：need 前扩越出轴头 → 派发（reason=init；与 oas-resource 同设计）
    const rangeInit = rangeReqs[0] ?? null
    // ② 滚出装载区 → 派发 scroll 请求（绝对行区间）
    const tb = el.shadowRoot.querySelector('.tbody') as HTMLElement
    tb.scrollTop = 1200 // 行 30
    tb.dispatchEvent(new Event('scroll'))
    await raf()
    await raf()
    const scrollReq = winReqs.find((r) => r.reason === 'scroll') ?? null
    // ③ 宿主按请求回填新窗口 [100,117) + 滚到该窗口 → 绝对行号渲染（行 100 的 top = 100 × 40）
    el.setAttribute('window-start', '100')
    el.setAttribute('tasks', slice(100, 17))
    tb.scrollTop = 4000 // 行 100
    tb.dispatchEvent(new Event('scroll'))
    await raf()
    await raf()
    const firstName = el.shadowRoot.querySelector('.side-body .row-name') as HTMLElement | null
    // ④ 滚到时间轴最右端（可视时间窗贴近 range-end）→ 派发 range 请求
    const rangeBeforeEnd = rangeReqs.length
    tb.scrollLeft = tb.scrollWidth - tb.clientWidth
    tb.dispatchEvent(new Event('scroll'))
    await raf()
    await raf()
    const rangeAtEnd = rangeReqs.length > rangeBeforeEnd
    const out = {
      initReq,
      coveredAfterFill,
      rangeInit,
      scrollReq,
      absKey: firstName?.getAttribute('data-key') ?? '',
      absTop: firstName?.style.top ?? '',
      rangeAtEnd,
      rangeReason: rangeReqs[rangeReqs.length - 1]?.reason ?? '',
    }
    el.remove()
    return out
  })
  // 首帧 init 请求：reason=init、绝对半开区间自 0 起、越出首屏切片（未覆盖才派）
  expect(res.initReq !== null && res.initReq.reason === 'init', '首帧派发 init 行窗口请求').toBe(true)
  expect(res.initReq !== null && res.initReq.start === 0, '期望区间自绝对行 0 起').toBe(true)
  expect(res.initReq !== null && res.initReq.end > 6, '期望区间越出首屏切片 [0,6)（未覆盖才派）').toBe(true)
  expect(res.coveredAfterFill, '宿主回填覆盖期望区间后不再重复派发').toBe(true)
  expect(
    res.rangeInit !== null && res.rangeInit.reason === 'init',
    '轴托管首帧派发 range 请求（need 前扩越出轴头，与 oas-resource 同设计）',
  ).toBe(true)
  expect(
    res.rangeInit !== null && res.rangeInit.startMs < new Date(2026, 0, 1).getTime(),
    '首帧 range need 起点越出轴起点（可视列窗贴轴头 ±1 视口宽）',
  ).toBe(true)
  expect(res.scrollReq, '滚出装载区派发 scroll 请求').not.toBeNull()
  expect(
    res.scrollReq !== null && res.scrollReq.start <= 30 && res.scrollReq.end > 30,
    `scroll 请求应覆盖滚动行 30（实得 ${JSON.stringify(res.scrollReq)}）`,
  ).toBe(true)
  expect(res.absKey, '回填后渲染新切片首行').toBe('t100')
  expect(res.absTop, '按绝对行号定位（行 100 × 40px，局部下标定位会得 0px）').toBe('4000px')
  expect(res.rangeAtEnd, '滚到轴端派发 range 请求').toBe(true)
  expect(res.rangeReason, 'range 请求原因为 scroll').toBe('scroll')
  expect(errors).toEqual([])
})

// windowed × 层级切片（含折叠父级）回归：切片即行序（不递归 children / 忽略 expanded）——
// 旧实现按树递归 rows 塌缩（1 行 ≪ 切片长度）→ 覆盖判定误吞请求 + 滚动装载区空白。
// 真实布局下断言：装载区中部滚动有行渲染（无空白）、装载区内滚动零请求（覆盖契约）、
// aria 坐标按全量口径（posinset/rowindex=绝对行号 1 基、setsize=total、容器 rowcount=total）。
// 机制层（含 devWarn/反证）由单测锁定，本用例补真实布局感知层。
test('gantt windowed 层级切片扁平化：装载区滚动无空白 + aria 全量口径', async ({ page }) => {
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => {
      const el = document.getElementById('gantt-basic') as (HTMLElement & { shadowRoot?: ShadowRoot | null }) | null
      return !!el && !!el.shadowRoot && !!el.shadowRoot.querySelector('.tbody')
    },
    undefined,
    { timeout: 30000 },
  )
  const res = await page.evaluate(async () => {
    const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const el = document.createElement('oas-gantt') as HTMLElement & { shadowRoot: ShadowRoot }
    el.setAttribute('windowed', '')
    el.setAttribute('total', '1000')
    el.setAttribute('window-start', '0')
    el.setAttribute('height', '200') // 视口 200/40 = 5 行 + buffer
    el.setAttribute('row-height', '40')
    el.setAttribute('expanded', '[]') // 全收起：旧实现树递归后 rows 塌缩成 1 行的触发条件
    // 层级切片：1 父 + 200 子（拍平后切片长度 201）——旧实现把切片当树展开 → 只渲染父级 1 行
    el.setAttribute(
      'tasks',
      JSON.stringify([
        {
          id: 'p',
          name: '父',
          start: '2026-03-02',
          end: '2026-03-05',
          children: Array.from({ length: 200 }, (_, i) => ({
            id: `c${i}`,
            name: `子${i}`,
            start: '2026-03-02',
            end: '2026-03-05',
          })),
        },
      ]),
    )
    const reqs: Array<{ start: number; end: number; reason: string }> = []
    el.addEventListener('oas-window-request', (e) => {
      const d = (e as CustomEvent).detail
      reqs.push({ start: d.start, end: d.end, reason: d.reason })
    })
    document.body.appendChild(el)
    await raf()
    const sr = el.shadowRoot!
    const tb = sr.querySelector('.tbody') as HTMLElement
    const names = () => [...sr.querySelectorAll<HTMLElement>('.side-body .row-name')]
    const initFirst = names()[0]?.dataset.key ?? ''
    // 滚到装载区中部（行 120，仍在 [0,201) 内）→ 有行渲染（旧实现塌缩 → 空白且零请求）
    tb.scrollTop = 120 * 40
    tb.dispatchEvent(new Event('scroll'))
    await raf()
    await raf()
    const mid = { count: names().length, first: names()[0]?.dataset.key ?? '' }
    const reqsInLoaded = reqs.length // 装载区内滚动：期望区间被覆盖 → 零请求
    // aria 全量口径：首渲染行 = 扁平行 114（父占 1 行）→ 绝对行号 115（1 基）
    const aria = {
      posinset: names()[0]?.getAttribute('aria-posinset') ?? '',
      rowindex: names()[0]?.getAttribute('aria-rowindex') ?? '',
      setsize: names()[0]?.getAttribute('aria-setsize') ?? '',
      rowcount: sr.querySelector('.side-rows')?.getAttribute('aria-rowcount') ?? '',
    }
    el.remove()
    return { initFirst, mid, reqsInLoaded, aria }
  })
  expect(res.initFirst, '切片即行序：首行 = 切片首任务（expanded 收起不塌缩）').toBe('p')
  expect(res.mid.count, '装载区中部滚动有行渲染（旧实现塌缩 → 空白）').toBeGreaterThan(0)
  expect(res.mid.first, '滚动后首渲染行按扁平行序（行 120 - buffer 6 → c113）').toBe('c113')
  expect(res.reqsInLoaded, '装载区内滚动零请求（期望区间被覆盖）').toBe(0)
  expect(res.aria.posinset, 'posinset = 绝对行号（1 基）').toBe('115')
  expect(res.aria.rowindex, 'treeitem 不使用 aria-rowindex（axe aria-allowed-attr）').toBe('')
  expect(res.aria.setsize, 'setsize = 全量 total').toBe('1000')
  expect(res.aria.rowcount, 'tree 不使用 aria-rowcount（全量口径由 setsize 承载）').toBe('')
})

// 万行「选择变化」增量回归：真实浏览器连点选择 20 次（Ctrl 累加/退选）——
// ① 渲染行/条数保持窗口量级（选择不得触发整窗/全量重建扩张）；② 窗口行节点身份不变
// （dataset.probe 是「局部 patch vs 整窗重建」的客观判据：重建会丢标记）；③ 未选中行带着
// 显式 data-selected="false"（状态写入一致，无漏写/残留 true）；④ console 零告警。
// 耗时只打 annotation + console.log（人工观察趋势），**不作时间断言**——CI 机器抖动会变 flaky。
test('gantt 万行选择增量：连点 20 次选择零重建、渲染行数有界、console 零告警', async ({ page }) => {
  const errors: string[] = []
  const warnings: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`error: ${m.text()}`)
    // 组件自身 devWarn（页面外壳/引擎噪音不带该前缀，不属本用例口径）
    if (m.type() === 'warning' && m.text().includes('[oas-gantt]')) warnings.push(m.text())
  })
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => {
      const el = document.getElementById('gantt-basic') as (HTMLElement & { shadowRoot?: ShadowRoot | null }) | null
      return !!el && !!el.shadowRoot && !!el.shadowRoot.querySelector('.tbody')
    },
    undefined,
    { timeout: 30000 },
  )

  // 万行实例：真实布局容器（有实际高度，虚拟行窗口按宿主 clientHeight 计算）
  await page.evaluate(async () => {
    await customElements.whenDefined('oas-gantt')
    const el = document.createElement('oas-gantt') as HTMLElement & { tasks: unknown; shadowRoot: ShadowRoot }
    el.id = 'gantt-10k-select'
    el.setAttribute('height', '400')
    el.setAttribute('row-height', '36')
    el.style.cssText = 'width:900px'
    document.body.appendChild(el)
    // property 通道在连接后写入（先 append 再赋 tasks：render 骨架已就绪）
    el.tasks = Array.from({ length: 10000 }, (_, i) => ({
      id: `k${i}`,
      name: `任务${i}`,
      start: `2026-03-${String((i % 27) + 1).padStart(2, '0')}`,
      end: `2026-03-${String((i % 27) + 2).padStart(2, '0')}`,
    }))
  })
  const host = page.locator('#gantt-10k-select')
  await host.locator('.row-name[data-key="k0"]').waitFor({ state: 'visible' })
  // 先把宿主整体滚入页面视口：页面自身滚动会平移宿主，令「首行 top / 行数」断言失去可比基准。
  // 后续手势在页面内派生（不触发浏览器 scrollIntoView），不会去滚内部 .tbody。
  await host.scrollIntoViewIfNeeded()

  // 探针 + 基线：窗口行/条数、首行节点标记、首行 top（滚动位置）
  const before = await host.evaluate((el) => {
    const sr = (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot
    const rows = [...sr.querySelectorAll<HTMLElement>('.side-body .row-name')]
    rows[0]!.dataset.probe = 'keep'
    return {
      rows: rows.length,
      bars: sr.querySelectorAll('.bars .bar').length,
      top: rows[0]!.style.top,
    }
  })
  expect(before.rows, '万行下只渲染窗口行（全量 10000）').toBeLessThan(40)
  expect(before.bars, '万行下只渲染窗口条（全量 10000）').toBeLessThan(40)

  const warnBase = warnings.length
  // 连点 20 次：Ctrl 累加/退选（同一行偶数次退选、奇数次选中）→ 期望选中 k4..k7
  const keys = ['k2', 'k3', 'k4', 'k5', 'k6', 'k7']
  const started = Date.now()
  // 页面内真实手势，不用 locator.click：后者的可操作性重试会对**虚拟化行**反复
  // scrollIntoView → 触发窗口重建换节点 → 命中目标反复失效（实测报 “subtree intercepts
  // pointer events” 死循环至 60s 超时）。组件选择链路是「行 pointerdown 起手 + document
  // pointerup 收口」，合成事件同样命中（与单测 clickRow 同一路径），且不引入额外滚动。
  const clickDiag = await host.evaluate((el, ks) => {
    const sr = (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot
    const missing: string[] = []
    let dispatched = 0
    for (let i = 0; i < 20; i++) {
      const key = ks[i % ks.length]!
      const row = sr.querySelector<HTMLElement>(`.row-name[data-key="${key}"]`)
      if (!row) {
        missing.push(key)
        continue
      }
      row.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          composed: true,
          pointerId: 1,
          button: 0,
          clientX: 40,
          clientY: 40,
        }),
      )
      document.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1, ctrlKey: true }),
      )
      dispatched++
    }
    return { dispatched, missing }
  }, keys)
  const elapsedMs = Date.now() - started
  expect(clickDiag.missing, '连选目标行均在虚拟窗口内（否则手势落空）').toEqual([])
  expect(clickDiag.dispatched, '20 次页面内手势全部发出').toBe(20)
  // 选中态由同步链路写入；等公开 selection 收敛后再断言（避免读到中间态）
  await page
    .waitForFunction(() => {
      const el = document.getElementById('gantt-10k-select') as (HTMLElement & { selection?: string[] }) | null
      const sel = el?.selection ?? []
      return sel.length === 4 && sel.slice().sort().join(',') === 'k4,k5,k6,k7'
    })
    .catch(() => {})
  const metrics = `gantt 10k selection×20 ${elapsedMs}ms`
  console.log('[gantt-select-incremental]', metrics)
  test.info().annotations.push({ type: 'gantt-10k-selection-20x', description: metrics })

  const after = await host.evaluate((el) => {
    const sr = (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot
    const rows = [...sr.querySelectorAll<HTMLElement>('.side-body .row-name')]
    const bars = [...sr.querySelectorAll<HTMLElement>('.bars .bar')]
    return {
      rows: rows.length,
      bars: bars.length,
      probe: rows[0]?.dataset.probe ?? '',
      top: rows[0]?.style.top ?? '',
      selected: rows.filter((r) => r.classList.contains('selected')).map((r) => r.dataset.key ?? ''),
      selectedBars: bars.filter((b) => b.classList.contains('selected')).map((b) => b.dataset.id ?? ''),
      ariaTrue: rows.filter((r) => r.getAttribute('aria-selected') === 'true').length,
      dataTrue: rows.filter((r) => r.getAttribute('data-selected') === 'true').length,
      dataFalse: rows.filter((r) => r.getAttribute('data-selected') === 'false').length,
      multiselectable: sr.querySelector('.side-rows')?.getAttribute('aria-multiselectable') ?? '',
      selection: (el as HTMLElement & { selection: string[] }).selection.slice().sort(),
    }
  })

  // 渲染规模有界：选择变化不得把窗口行/条扩成全量重建
  expect(after.rows, '连点 20 次后窗口行数仍有界').toBeLessThan(40)
  expect(after.bars, '连点 20 次后窗口条数仍有界').toBeLessThan(40)
  expect(after.rows, '行数不因选择变化扩张').toBe(before.rows)
  // 节点身份：首行仍带探针 → 窗口未被整窗重建（重建会丢 dataset.probe），滚动位置也未漂移
  expect(after.probe, '窗口行未被整窗重建（局部 patch）').toBe('keep')
  expect(after.top, '滚动位置不因选择变化漂移').toBe(before.top)
  // 选择结果（感知层可见态）：行 class 与条 class 同步，公开 selection 一致
  expect(after.selected, 'Ctrl 连点后选中 k4..k7（偶数次退选、奇数次选中）').toEqual(['k4', 'k5', 'k6', 'k7'])
  expect(after.selectedBars, '条选中态与行同步').toEqual(['k4', 'k5', 'k6', 'k7'])
  expect(after.selection).toEqual(['k4', 'k5', 'k6', 'k7'])
  // 状态写入一致：aria/data 的 true 计数 = 选中数，且未选中行带显式 false
  expect(after.ariaTrue).toBe(4)
  expect(after.dataTrue).toBe(4)
  expect(after.dataFalse, '未选中行仍带显式 data-selected="false"').toBeGreaterThan(0)
  expect(after.multiselectable, '树容器声明多选语义').toBe('true')

  expect(errors, 'console 零 error').toEqual([])
  expect(warnings.slice(warnBase), '交互期间无组件告警').toEqual([])
})

// 行斑马纹（stripe，opt-in）：真实浏览器断言——① 开启后奇数绝对行有底色、偶数无，
// 行名（.row-name data-stripe）与时间轴条纹（.stripe）同口径，computed background 奇偶不同，
// 条纹层 pointer-events:none（不拦条拖拽/框选/连线命中）；② 滚动到中部后条纹随**绝对行号**
// 移动（winStart=21 → DOM 序 0 的行必有底色——按窗口局部序/nth-child 着色此断言必红，反证锚点）；
// ③ 暗色主题下奇偶仍不同（token 有暗色变体 #27272a vs 亮色 #f4f4f5）；④ 关闭（移除属性）后
// 条纹容器与行名底色一并清除（零额外 DOM）；⑤ console 零告警。
// 机制层（含窗口数学反证）由单测锁定，本用例补真实布局 + computed style 感知层。
test('gantt stripe 斑马纹：绝对行号奇偶 + 滚动稳定 + 暗色 + 关闭清除 + console 零告警', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-basic')
  const res = await page.evaluate(async () => {
    await customElements.whenDefined('oas-gantt')
    const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const el = document.createElement('oas-gantt') as HTMLElement & { tasks: unknown; shadowRoot: ShadowRoot }
    el.setAttribute('stripe', '')
    el.setAttribute('height', '360')
    el.setAttribute('row-height', '36')
    el.style.cssText = 'position:fixed;top:-9999px;left:0;width:600px' // 离屏：有真实布局测量
    document.body.appendChild(el)
    el.tasks = Array.from({ length: 60 }, (_, i) => ({
      id: 'z' + i,
      name: 'Z' + i,
      start: '2026-03-02',
      end: '2026-03-06',
    }))
    await raf()
    const sr = el.shadowRoot
    const ROW_H = 36
    // top(px) → 绝对行号（非 windowed top = i×行高；windowed = (window-start+i)×行高，同构）
    const absOf = (pxTop: string): number => Math.round(parseFloat(pxTop) / ROW_H)
    const bg = (e: HTMLElement): string => getComputedStyle(e).backgroundColor
    const snapshot = () => {
      const names = [...sr.querySelectorAll<HTMLElement>('.side-body .row-name')]
      const stripes = [...sr.querySelectorAll<HTMLElement>('.stripe-canvas .stripe')]
      return {
        names: names.map((n) => ({ abs: absOf(n.style.top), striped: n.hasAttribute('data-stripe'), bg: bg(n) })),
        stripes: stripes.map((s) => ({ abs: absOf(s.style.top), bg: bg(s), pe: getComputedStyle(s).pointerEvents })),
        canvas: !!sr.querySelector('.stripe-canvas'),
      }
    }
    const light = snapshot()
    // 滚到中部：scrollTop = 27×36 → 首可见行 27 − buffer 6 → winStart = 21（奇）
    const tb = sr.querySelector('.tbody') as HTMLElement
    tb.scrollTop = 27 * ROW_H
    await raf()
    await raf()
    const scrolled = snapshot()
    // 暗色：token 暗色变体生效（#27272a ≠ 亮色 #f4f4f5）
    document.documentElement.classList.add('dark')
    await raf()
    const dark = snapshot()
    document.documentElement.classList.remove('dark')
    // 关闭：移除属性 → 条纹容器与行名底色一并清除
    el.removeAttribute('stripe')
    await raf()
    const off = snapshot()
    el.remove()
    return { light, scrolled, dark, off }
  })

  // ① 开启：奇数绝对行有底色、偶数无；行名与条纹同口径；条纹不拦指针
  expect(res.light.canvas, '开启后条纹容器存在').toBe(true)
  expect(res.light.names.length, '窗口行已渲染').toBeGreaterThan(0)
  for (const n of res.light.names) {
    expect(n.striped, `绝对行 ${n.abs} 行名 data-stripe 应为 ${n.abs % 2 === 1}`).toBe(n.abs % 2 === 1)
  }
  for (const s of res.light.stripes) {
    expect(s.abs % 2, `条纹落在绝对行 ${s.abs} 应为奇数`).toBe(1)
    expect(s.pe, '条纹层不拦指针（条拖拽/框选/连线命中不受影响）').toBe('none')
  }
  const stripedName = res.light.names.find((n) => n.striped)!
  const plainName = res.light.names.find((n) => !n.striped)!
  expect(stripedName.bg, '奇数行行名有底色').not.toBe(plainName.bg)
  expect(res.light.stripes.length, '时间轴条纹与行名底色行数一致').toBe(res.light.names.filter((n) => n.striped).length)
  expect(res.light.stripes[0]!.bg, '条纹背景 = 行名底色（同 token）').toBe(stripedName.bg)

  // ② 滚动后仍按绝对奇偶：winStart=21 → 首渲染行（DOM 序 0）必有底色
  expect(res.scrolled.names[0]!.abs, '滚动后首渲染行 = 绝对行 21（窗口数学自检）').toBe(21)
  expect(res.scrolled.names[0]!.striped, '绝对行 21（奇）→ 底色；DOM 序着色此处必红（反证锚点）').toBe(true)
  for (const n of res.scrolled.names) {
    expect(n.striped, `滚动后绝对行 ${n.abs} 行名 data-stripe 应为 ${n.abs % 2 === 1}`).toBe(n.abs % 2 === 1)
  }
  for (const s of res.scrolled.stripes) {
    expect(s.abs % 2, `滚动后条纹落在绝对行 ${s.abs} 应为奇数`).toBe(1)
  }

  // ③ 暗色：奇偶仍不同，且条纹底色为暗色变体（≠ 亮色值）
  for (const n of res.dark.names) {
    expect(n.striped, `暗色下绝对行 ${n.abs} 同口径`).toBe(n.abs % 2 === 1)
  }
  const darkStriped = res.dark.names.find((n) => n.striped)!
  const darkPlain = res.dark.names.find((n) => !n.striped)!
  expect(darkStriped.bg, '暗色下奇数行底色 ≠ 偶数行').not.toBe(darkPlain.bg)
  expect(darkStriped.bg, '暗色 token 变体生效（≠ 亮色底色）').not.toBe(stripedName.bg)

  // ④ 关闭（移除属性）：容器与行名底色一并清除（零额外 DOM）
  expect(res.off.canvas, '关闭后条纹容器移除').toBe(false)
  expect(res.off.stripes.length).toBe(0)
  expect(
    res.off.names.some((n) => n.striped),
    '关闭后行名无 data-stripe',
  ).toBe(false)
  expect(res.off.names[0]!.bg, '关闭后行名回落无底色（= 亮色无条纹行基线）').toBe(plainName.bg)

  expect(errors, 'console 零 error').toEqual([])
})

// C1 回归（lag 安全域）：极大有限 lag（1e8 天）× auto-schedule 曾把排程运算推出 Date 合法域
// （±8.64e15 ms）→ Invalid Date → fmtIso 内 Intl.formatToParts 抛 RangeError（整图白屏）。
// 修复口径：越域 lag 清洗为无 lag（等价 0，依赖保留），排程按 0 计算。
// 本用例走 hour 精度任务（fmtIso → Intl 崩溃路径的触发条件）：① 组件可渲染（非白屏）；
// ② lag 被清洗；③ 日期数据合法（无 NaN）；④ console 零 error。
test('gantt 极大 lag 安全域：lag=1e8 + auto-schedule 渲染正常 + console 零 error', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`error: ${m.text()}`)
  })
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-basic')
  const res = await page.evaluate(async () => {
    await customElements.whenDefined('oas-gantt')
    const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const el = document.createElement('oas-gantt') as HTMLElement & {
      tasks: Array<{
        id: string
        name: string
        start: string
        end?: string
        dependencies?: Array<{ id: string; lag?: number }>
      }>
      shadowRoot: ShadowRoot
      updateTask(id: string, patch: Record<string, string>): boolean
    }
    el.setAttribute('auto-schedule', '')
    el.style.cssText = 'position:fixed;top:-9999px;left:0;width:600px' // 离屏：有真实布局测量
    document.body.appendChild(el)
    el.tasks = [
      { id: 'd', name: 'D', start: '2026-03-02 08:00', end: '2026-03-02 12:00' },
      {
        id: 't',
        name: 'T',
        start: '2026-03-03 09:00',
        end: '2026-03-03 10:00',
        dependencies: [{ id: 'd', lag: 1e8 }],
      },
    ]
    await raf()
    const t = el.tasks.find((x) => x.id === 't')!
    // 命令式改期触发联动前推（旧实现在此 fmtIso(Invalid Date) → RangeError）
    let updateThrew = false
    try {
      el.updateTask('t', { start: '2026-03-01 09:00', end: '2026-03-01 10:00' })
    } catch {
      updateThrew = true
    }
    const t2 = el.tasks.find((x) => x.id === 't')!
    const out = {
      bars: el.shadowRoot.querySelectorAll('.bars .bar').length,
      lagDropped: t.dependencies?.[0]?.lag === undefined,
      startBefore: t.start,
      updateThrew,
      startAfter: t2.start,
      endAfter: t2.end ?? '',
      datesValid: [t.start, t2.start, t2.end ?? ''].every((s) => s !== '' && !s.includes('NaN')),
    }
    el.remove()
    return out
  })
  expect(res.bars, '组件可渲染（非白屏，两条任务条都在）').toBe(2)
  expect(res.lagDropped, '越域 lag 清洗为无 lag（等价 0，依赖保留）').toBe(true)
  expect(res.updateThrew, '命令式联动改期不抛 RangeError').toBe(false)
  expect(res.startAfter, '联动前推到前置右缘 03-02 12:00（合法日期）').toBe('2026-03-02 12:00')
  expect(res.datesValid, `日期数据合法（实得 ${res.startBefore}/${res.startAfter}/${res.endAfter}）`).toBe(true)
  expect(errors, 'console 零 error').toEqual([])
})

// C2 回归（lag 安全域上限）：旧上限 1e15 ms（注释曾误写 ≈11574 天，实为 ≈1.15e7 天）放行
// lag=1e7 天 → 2026 + 27397 年 = 29405（5 位年份）→ 组件 parseTaskDate（parseISODate 只收 4 位年）
// 无法回读 → el.tasks = el.tasks 时清洗层静默丢任务。新上限 1e12 ms（≈11574 天）。
test('gantt lag 安全域 1e7 天：不写 5 位年份、回写不丢任务（告警口径由单测锁定）', async ({ page }) => {
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-basic')
  const res = await page.evaluate(async () => {
    await customElements.whenDefined('oas-gantt')
    const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    type Task = {
      id: string
      name: string
      start: string
      end?: string
      dependencies?: Array<{ id: string; type?: string; lag?: number }>
    }
    const el = document.createElement('oas-gantt') as HTMLElement & {
      tasks: Task[]
      shadowRoot: ShadowRoot
    }
    el.setAttribute('auto-schedule', '')
    el.style.cssText = 'position:fixed;top:-9999px;left:0;width:600px' // 离屏：有真实布局测量
    document.body.appendChild(el)
    el.tasks = [
      { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' },
      {
        id: 't',
        name: 'T',
        start: '2026-03-01',
        end: '2026-03-02',
        dependencies: [{ id: 'd', type: 'fs', lag: 1e7 }],
      },
    ]
    await raf()
    const before = el.tasks
    const start = before.find((x) => x.id === 't')!.start
    const lagDropped = before.find((x) => x.id === 't')!.dependencies?.[0]?.lag === undefined
    // 回写：旧实现 5 位年份不能被回读 → 任务被清洗掉
    el.tasks = el.tasks
    await raf()
    const after = el.tasks
    const out = {
      lagDropped,
      start,
      fiveDigit: /^\d{5}-/.test(start),
      idsBefore: before.map((x) => x.id).sort(),
      idsAfter: after.map((x) => x.id).sort(),
      startAfter: after.find((x) => x.id === 't')?.start ?? '',
      bars: el.shadowRoot.querySelectorAll('.bars .bar').length,
    }
    el.remove()
    return out
  })
  expect(res.lagDropped, '越域 lag 按 0 处理（依赖保留）').toBe(true)
  expect(res.start, '排程到前置右缘 03-07').toBe('2026-03-07')
  expect(res.fiveDigit, '不写出 5 位年份（旧实现 29405-…）').toBe(false)
  expect(res.idsAfter, 'el.tasks = el.tasks 回写不丢任务').toEqual(res.idsBefore)
  expect(res.startAfter, '回写后日期仍可回读').toBe('2026-03-07')
  expect(res.bars, '组件正常渲染两条任务条').toBe(2)
})

// C3 回归（事件序）：属性通道直接改写 tasks 时联动排程序原为 tasks-change → reschedule，
// 与提交口 reschedule → tasks-change 相反。现两通道统一为「reschedule → tasks-change」。
test('gantt 属性通道联动排程事件序：reschedule → tasks-change（一次）', async ({ page }) => {
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-basic')
  const events = await page.evaluate(async () => {
    await customElements.whenDefined('oas-gantt')
    const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const el = document.createElement('oas-gantt')
    el.setAttribute('auto-schedule', '')
    el.style.cssText = 'position:fixed;top:-9999px;left:0;width:600px'
    const order: string[] = []
    el.addEventListener('oas-reschedule', () => order.push('reschedule'))
    el.addEventListener('oas-tasks-change', () => order.push('tasks-change'))
    document.body.appendChild(el)
    // 属性通道写入：d 右缘 03-07，t 起点 03-02 → update 末尾联动前推 t
    el.setAttribute(
      'tasks',
      JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' },
        { id: 't', name: 'T', start: '2026-03-02', end: '2026-03-04', dependencies: [{ id: 'd' }] },
      ]),
    )
    await raf()
    const start = (el as unknown as { tasks: Array<{ id: string; start: string }> }).tasks.find(
      (x) => x.id === 't',
    )?.start
    el.remove()
    return { order, start }
  })
  expect(events.start, '联动前推已发生（否则事件序断言无意义）').toBe('2026-03-07')
  expect(events.order, '属性通道与提交口统一事件序').toEqual(['reschedule', 'tasks-change'])
})

// C4 回归（windowed 切片越界）：window-start + 装载行数 > total 时旧实现静默截断，
// 宿主误以为切片全部生效。现越界行按 total 夹取不渲染 + 实例级 devWarn 一次。
test('gantt windowed 切片越界：越界行不渲染 + total 夹取（告警口径由单测锁定）', async ({ page }) => {
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-basic')
  const res = await page.evaluate(async () => {
    await customElements.whenDefined('oas-gantt')
    const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const el = document.createElement('oas-gantt')
    el.setAttribute('windowed', '')
    el.setAttribute('total', '100')
    el.setAttribute('window-start', '95')
    el.setAttribute('height', '120')
    el.setAttribute('row-height', '40')
    el.setAttribute('range-start', '2026-03-01')
    el.setAttribute('range-end', '2026-03-31')
    el.style.cssText = 'position:fixed;top:-9999px;left:0;width:600px'
    document.body.appendChild(el)
    // loaded [95,115) 越过 total 100 → 越界 15 行
    el.setAttribute(
      'tasks',
      JSON.stringify(
        Array.from({ length: 20 }, (_, i) => ({
          id: `t${95 + i}`,
          name: `T${95 + i}`,
          start: '2026-03-02',
          end: '2026-03-06',
        })),
      ),
    )
    await raf()
    const tb = el.shadowRoot!.querySelector('.tbody') as HTMLElement
    tb.scrollTop = 95 * 40
    tb.dispatchEvent(new Event('scroll'))
    await raf()
    const rows = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.side-body .row-name')].map((r) => r.dataset.key)
    const innerH = (el.shadowRoot!.querySelector('.inner') as HTMLElement).style.height
    el.remove()
    return { rows, innerH }
  })
  expect(res.rows, 'total 夹取：只渲染 95..99 五行').toEqual(['t95', 't96', 't97', 't98', 't99'])
  expect(res.innerH, '滚动域仍按 total 撑起').toBe(`${100 * 40}px`)
})

test('gantt 任务名与条形标签文字可选中复制（不牺牲可选中文本）', async ({ page }) => {
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-basic')
  await page.waitForFunction(() => {
    const host = document.querySelector('oas-gantt[label-position="inside"]') as HTMLElement | null
    return !!host?.shadowRoot?.querySelector('.bar-label')
  })

  const r = await page.evaluate(() => {
    const basic = document.querySelector('#gantt-basic') as HTMLElement
    const labelHost = document.querySelector('oas-gantt[label-position="inside"]') as HTMLElement
    const rowName = basic.shadowRoot!.querySelector('.row-name .name') as HTMLElement
    const barLabel = labelHost.shadowRoot!.querySelector('.bar-label') as HTMLElement
    const selectText = (el: HTMLElement): string => {
      const range = document.createRange()
      range.selectNodeContents(el)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)
      return sel.toString()
    }
    return {
      rowUserSelect: getComputedStyle(rowName).userSelect,
      barUserSelect: getComputedStyle(barLabel).userSelect,
      rowText: selectText(rowName),
      barText: selectText(barLabel),
    }
  })
  expect(r.rowUserSelect, '任务名列应允许文本选择').toBe('text')
  expect(r.barUserSelect, '条标签应允许文本选择').toBe('text')
  expect(r.rowText).toContain('一期')
  expect(r.barText.length).toBeGreaterThan(0)

  // 真实鼠标拖选（不是只读 computedStyle）：行名文本可被用户划选复制
  const name = page.locator('#gantt-basic .row-name[data-key="t1"] .name')
  await name.scrollIntoViewIfNeeded()
  const box = await name.boundingBox()
  if (box) {
    await page.evaluate(() => window.getSelection()?.removeAllRanges())
    await page.mouse.move(box.x + 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2, { steps: 5 })
    await page.mouse.up()
    const selected = await page.evaluate(() => window.getSelection()?.toString() ?? '')
    expect(selected.length, '真实拖选应产生文本选区').toBeGreaterThan(0)
  }
})

test('gantt deadline / show-float / baseline.progress：截止违约、浮时标签与基线进度可见', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await waitGantt(page, 'gantt-basic')
  await page.evaluate(() => {
    const el = document.createElement('oas-gantt')
    el.id = 'gantt-qa-advanced'
    el.setAttribute('show-baseline', '')
    el.setAttribute('show-float', '')
    el.setAttribute(
      'tasks',
      JSON.stringify([
        {
          id: 'd1',
          name: 'Design',
          start: '2026-03-02',
          end: '2026-03-04',
          deadline: '2026-03-03',
          progress: 40,
          baseline: { start: '2026-03-02', end: '2026-03-03', progress: 25 },
        },
        { id: 'd2', name: 'Build', start: '2026-03-05', end: '2026-03-09', dependencies: [{ id: 'd1' }] },
      ]),
    )
    document.body.appendChild(el)
  })
  const el = page.locator('#gantt-qa-advanced')
  await expect(el.locator('.bars .bar[data-id="d1"].conflict')).toBeVisible()
  await expect(el.locator('.deadline[data-id="d1"]')).toBeVisible()
  await expect(el.locator('.float-label').first()).toBeVisible()
  await expect(el.locator('.baseline[data-id="d1"] .baseline-progress')).toBeVisible()
  expect(
    await el.locator('.baseline[data-id="d1"] .baseline-progress').evaluate((n) => (n as HTMLElement).style.width),
  ).toBe('25%')
  expect(errors).toEqual([])
})
