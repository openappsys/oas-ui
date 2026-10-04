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

  // 暗色：各视图仍可见
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(300)
  await expect(basic.locator('.day[data-date="2026-08-08"] .chip').first()).toBeVisible()
  await expect(week.locator('.col[data-date="2026-08-10"] .event').first()).toBeVisible()

  expect(errors).toEqual([])
})
