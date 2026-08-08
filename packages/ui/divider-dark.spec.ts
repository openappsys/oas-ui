import { test, expect } from '@playwright/test'

test('DemoBlock 跟随全局主题：暗色下 body 背景与 divider 可见', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 900 })
  await page.goto('/components/divider.html', { waitUntil: 'networkidle' })

  // 默认浅色：body 背景应为白
  const body0 = page.locator('.demo-block__body').first()
  await expect(body0).toHaveCSS('background-color', 'rgb(255, 255, 255)')

  // 切换全局暗色（模拟 vitepress 主题切换按钮）
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(400)
  const bg = await body0.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(bg).toBe('rgb(24, 24, 27)') // #18181b

  // 块内 divider 文字继承暗色 text-primary（#fafafa）
  const dividerColor = await page
    .locator('.demo-block__body')
    .first()
    .locator('oas-divider')
    .first()
    .evaluate((el) => {
      const d = el.shadowRoot?.querySelector('.divider')
      return d ? getComputedStyle(d).color : null
    })
  expect(dividerColor).toBe('rgb(250, 250, 250)')
})

test('暗色模式 divider 截图（全局暗色）', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 900 })
  await page.goto('/components/divider.html', { waitUntil: 'networkidle' })
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'test-results/divider-dark.png', fullPage: true })
})
