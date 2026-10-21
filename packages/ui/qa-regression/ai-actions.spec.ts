import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('消息操作与工具调用：真实点击事件 + a11y', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto('/components/message-actions.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-message-actions') != null)
  await page.locator('#message-actions-basic [part="action"]').first().click()
  await expect(page.locator('#message-actions-output')).toContainText('已触发：copy')

  await page.goto('/components/tool-call.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-tool-call') != null)
  const tool = page.locator('#tool-call-running')
  await expect(tool.locator('[part="status-text"]')).toHaveText('运行中')
  await tool.locator('[part="head"]').click()
  await expect(tool.locator('[part="body"]')).toBeVisible()
  await expect(tool.locator('[part="args"]')).toContainText('scheduler')
  await expect(tool).toHaveAttribute('open', '')

  const a11y = await new AxeBuilder({ page }).analyze()
  expect(
    a11y.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    a11y.violations.map((v) => v.id).join(', '),
  ).toEqual([])
  expect(errors).toEqual([])
})
