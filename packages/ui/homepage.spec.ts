import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// 官网首页（home 布局）专属 e2e：自动收集型 spec（smoke/visual 等）只扫 components 目录，不含首页。
// qa-regression.spec.ts 不另加断言：防复发铁律针对「修的 bug」，首页为新增功能，本 spec 即固化载体。
const stats = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, '../docs/docs/.vitepress/generated/stats.json'),
    'utf8',
  ),
)

test.describe.configure({ mode: 'parallel' })

test.describe('官网首页', () => {
  test('hero 渲染：标题/双 CTA/console 零告警', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text())
    })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.VPHero h1')).toContainText('OAS-UI')
    await expect(page.locator('.VPHero .actions a')).toHaveCount(2)
    await page.waitForTimeout(300)
    expect(errors).toEqual([])
  })

  test('组件墙可交互：按钮出 message、switch 翻转、segmented 切换', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const hero = page.locator('.hero-playground')
    await expect(hero).toBeAttached()
    // 按钮点击 → message 出现（window.message 由 theme 挂载）
    await hero.locator('oas-button').first().click()
    await expect(page.getByText('来自 OAS-UI 的问候')).toBeVisible()
    // switch 翻转
    const sw = hero.locator('oas-switch')
    await sw.click()
    await expect(sw).toHaveAttribute('aria-checked', 'true')
    // segmented 切换
    const seg = hero.locator('oas-segmented')
    await seg.locator('[role="radio"]').nth(1).click()
    await expect(seg).toHaveAttribute('value', 'week')
  })

  test('StatsBar 数字与 stats.json 一致', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const bar = page.locator('.stats-bar')
    await expect(bar).toBeAttached()
    await expect(bar.locator('oas-statistic')).toHaveCount(4)
    await expect(bar).toContainText(String(stats.components))
    await expect(bar).toContainText(String(stats.cdnGzipKB))
    await expect(bar).toContainText(`v${stats.version}`)
  })

  test('FeatureGrid 六卡且链接非空', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const links = page.locator('.feature-grid a[href]')
    await expect(links).toHaveCount(6)
    for (let i = 0; i < 6; i++) {
      await expect(links.nth(i)).toHaveAttribute('href', /.+/)
    }
  })

  test('英文首页 hero 渲染', async ({ page }) => {
    await page.goto('/en/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.VPHero h1')).toContainText('OAS-UI')
    await expect(page.locator('.VPHero .actions a')).toHaveCount(2)
  })
})
