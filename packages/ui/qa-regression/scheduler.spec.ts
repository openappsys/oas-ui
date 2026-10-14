import { test, expect } from '@playwright/test'

// scheduler 浏览器回归：视图渲染/切换/芯片/全天行/重复展开/agenda/console 零告警
test('scheduler 浏览器回归：月/周/agenda 视图渲染与切换 + console 零告警', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/scheduler.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#scheduler-basic', { timeout: 15000 })

  // 月视图：芯片 + +N
  const basic = page.locator('#scheduler-basic')
  await expect(basic.locator('.day[data-date="2026-08-08"] .chip').first()).toContainText('发布 v2.6')
  await expect(basic.locator('.day[data-date="2026-08-22"] .more')).toHaveText('+1 条')

  // 周视图：时刻表 + 定时块 + band 全天行（band 结构与 gutter 对齐）
  const week = page.locator('#scheduler-week')
  await expect(week.locator('.timeview .col')).toHaveCount(7)
  await expect(week.locator('.col[data-date="2026-08-10"] .event')).toHaveCount(2)
  await expect(week.locator('.band-col[data-date="2026-08-11"] .allday .chip')).toContainText('全天活动')
  // gutter 首标签与首行网格线对齐（band 修正后）：gutter 首个 span 与 track 顶部同线
  const aligned = await week.evaluate(() => {
    const el = document.getElementById('scheduler-week')!
    const gutterFirst = el.shadowRoot!.querySelector('.gutter span') as HTMLElement
    const track = el.shadowRoot!.querySelector('.track') as HTMLElement
    const g = gutterFirst.getBoundingClientRect()
    const t = track.getBoundingClientRect()
    return Math.abs(g.top + g.height / 2 - t.top) < 30
  })
  expect(aligned, 'gutter 首刻度应与 track 首网格线对齐（band 修正）').toBe(true)

  // 日视图切换（oas-view-change）
  await week.locator('[part="views"] button[data-view="day"]').click()
  await expect(week.locator('.timeview .col')).toHaveCount(1)

  // 重复 demo：daily 展开多日芯片
  const repeat = page.locator('#scheduler-repeat')
  await expect(repeat.locator('.day[data-date="2026-08-04"] .chip')).toContainText('每日站会')

  // agenda 视图：分组 + 行
  const agenda = page.locator('[view="agenda"]')
  await expect(agenda.locator('.ag-row', { hasText: '晨会' }).first()).toBeVisible()

  // agenda 行不被 flex 压缩：内容超 max-height 应滚动溢出而非压扁行（实抓：行被压到 13px 裁掉文本上半）
  const agendaMetrics = await agenda.evaluate((host) => {
    const s = (host as HTMLElement).shadowRoot!
    const row = s.querySelector('.ag-row') as HTMLElement
    const box = s.querySelector('.agenda') as HTMLElement
    return { rowH: row.getBoundingClientRect().height, scrollable: box.scrollHeight > box.clientHeight + 1 }
  })
  expect(agendaMetrics.rowH, 'agenda 行应保持自然高度（flex-shrink:0），不被压扁').toBeGreaterThanOrEqual(24)
  expect(agendaMetrics.scrollable, 'agenda 内容超高应出现纵向滚动').toBe(true)

  // 暗色：各视图仍可见
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(300)
  await expect(basic.locator('.day[data-date="2026-08-08"] .chip').first()).toBeVisible()
  await expect(week.locator('.col[data-date="2026-08-10"] .event').first()).toBeVisible()

  expect(errors).toEqual([])
})

// 资源视图（单日 + 周 × 资源）+ 拖拽创建 + now 线
test('scheduler 资源视图 + 拖拽创建 + now 线 浏览器回归', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/scheduler.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#scheduler-res-day', { timeout: 15000 })

  // 单日资源视图：行 = 资源；定时事件渲染横条、全天事件渲染芯片
  const resDay = page.locator('#scheduler-res-day')
  await expect(resDay.locator('.res-row')).toHaveCount(3)
  await expect(resDay.locator('.res-row[data-resource="a"] .res-bar')).toContainText('晨会')
  await expect(resDay.locator('.res-row[data-resource="c"] .res-allDayChip')).toContainText('维护')

  // 周 × 资源矩阵：7 列日头 + 格内事件
  const resWeek = page.locator('#scheduler-res-week')
  await expect(resWeek.locator('.res-dayhead')).toHaveCount(7)
  await expect(resWeek.locator('.res-cell[data-date="2026-08-12"][data-resource="a"] .chip')).toContainText('全天巡检')

  // 拖拽创建：日视图时间格空白处拖出区间 → oas-create → 宿主 addEvent
  const create = page.locator('#scheduler-create')
  const track = create.locator('.timeview .col .track')
  await track.scrollIntoViewIfNeeded()
  const box = (await track.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + 8)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y + 104, { steps: 6 })
  await page.mouse.up()
  await expect(page.locator('#scheduler-create-output')).toContainText('oas-create')
  await expect(create.locator('.event', { hasText: '新建（拖拽）' })).toHaveCount(1)

  // now 线：含今天的时间视图渲染 nowline，show-now=false 不渲染
  const now = await page.evaluate(() => {
    const on = document.createElement('oas-scheduler') as HTMLElement & { shadowRoot: ShadowRoot }
    on.setAttribute('view', 'day')
    on.setAttribute('start-hour', '0')
    on.setAttribute('end-hour', '24')
    on.setAttribute('show-now', 'true')
    document.body.appendChild(on)
    const hasOn = on.shadowRoot.querySelector('.nowline') !== null
    const off = document.createElement('oas-scheduler') as HTMLElement & { shadowRoot: ShadowRoot }
    off.setAttribute('view', 'day')
    off.setAttribute('start-hour', '0')
    off.setAttribute('end-hour', '24')
    off.setAttribute('show-now', 'false')
    document.body.appendChild(off)
    const hasOff = off.shadowRoot.querySelector('.nowline') !== null
    on.remove()
    off.remove()
    return { hasOn, hasOff }
  })
  expect(now.hasOn, '默认显示 now 线').toBe(true)
  expect(now.hasOff, 'show-now=false 不渲染 now 线').toBe(false)

  // RTL：资源视图容器 direction=rtl
  const rtl = await page.evaluate(() => {
    const el = document.createElement('oas-scheduler') as HTMLElement & { shadowRoot: ShadowRoot }
    el.setAttribute('dir', 'rtl')
    el.setAttribute('view', 'resource')
    el.setAttribute('page-show-date', '2026-08-10')
    el.setAttribute('resources', '[{"id":"a","title":"A"}]')
    document.body.appendChild(el)
    const res = el.shadowRoot.querySelector('[part="resource"]') as HTMLElement
    const out = { hasRtl: res.hasAttribute('data-rtl'), dir: getComputedStyle(res).direction }
    el.remove()
    return out
  })
  expect(rtl.hasRtl, 'RTL 下资源视图带 data-rtl').toBe(true)
  expect(rtl.dir, 'RTL 下资源视图 direction=rtl').toBe('rtl')

  // 暗色：资源视图仍可见
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(300)
  await expect(resDay.locator('.res-row[data-resource="a"] .res-bar')).toBeVisible()

  expect(errors).toEqual([])
})
