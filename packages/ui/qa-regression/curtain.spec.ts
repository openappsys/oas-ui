// 复核回归：curtain 打开覆盖视口、关闭写本地记忆并派发 oas-close、reset 后记忆清空。
import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('curtain 打开可见 → 关闭写记忆 → reset 清除记忆', async ({ page }) => {
  await page.goto('/components/curtain.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ct-demo')

  const demo = page.locator('#ct-demo')
  const output = page.locator('#ct-output')
  const panel = demo.locator('[part="panel"]')
  await expect(panel).toBeHidden()

  await page.click('#ct-open')
  await expect(panel).toBeVisible()
  const box = await panel.boundingBox()
  expect(box!.width).toBeGreaterThan(200)

  await demo.locator('.close-btn').click()
  await expect(panel).toBeHidden()
  await expect(output).toHaveText(/已关闭（button）/)
  const stored = await page.evaluate(() => window.localStorage.getItem('oas-docs-curtain'))
  expect(stored).toBe('1')

  await page.click('#ct-reset')
  const cleared = await page.evaluate(() => window.localStorage.getItem('oas-docs-curtain'))
  expect(cleared).toBeNull()
  await expect(output).toHaveText(/已清除/)

  // 再次打开并 Esc
  await page.click('#ct-open')
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(output).toHaveText(/esc/)
})
