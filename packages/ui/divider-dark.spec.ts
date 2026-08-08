import { test } from '@playwright/test'

test('暗色模式 divider 截图', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 900 })
  await page.goto('/components/divider.html', { waitUntil: 'networkidle' })
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
  await page.waitForTimeout(200)
  await page.screenshot({ path: 'test-results/divider-dark.png', fullPage: true })
})