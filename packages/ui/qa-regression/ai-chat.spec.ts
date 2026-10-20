import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('AI 会话 recipe：流式、停止、失败与重试', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/guide/ai-chat.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => {
    const el = document.querySelector('#ai-chat-input') as (HTMLElement & { shadowRoot?: ShadowRoot | null }) | null
    return !!el?.shadowRoot?.querySelector('[part="textarea"]')
  })

  const input = page.locator('#ai-chat-input [part="textarea"]')
  await input.fill('测试消息')
  await input.press('Enter')
  await expect(page.locator('#ai-chat-log')).toContainText('测试消息')
  await expect(page.locator('#ai-chat-status')).toHaveText('完成', { timeout: 10_000 })

  await input.fill('停止测试')
  await input.press('Enter')
  await page.waitForTimeout(80)
  await page.locator('#ai-chat-input [part="send"]').click()
  await expect(page.locator('#ai-chat-status')).toHaveText('已停止', { timeout: 5000 })

  await page.locator('#ai-chat-fail').click()
  await expect(page.locator('#ai-chat-log')).toContainText('请求失败：网络错误', { timeout: 5000 })
  await page.locator('#ai-chat-retry').click()
  await expect(page.locator('#ai-chat-status')).toHaveText('完成', { timeout: 10_000 })
  const a11y = await new AxeBuilder({ page }).analyze()
  expect(
    a11y.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    a11y.violations.map((v) => v.id).join(', '),
  ).toEqual([])
  expect(errors).toEqual([])
})
