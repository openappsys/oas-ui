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

  // 状态矩阵 demo：同一工具三态（运行中 / 已完成 / 失败）+ 折叠反馈读数（防止 demo 反馈静默失效）
  const matrix = page.locator('#tool-call-matrix')
  const stages = matrix.locator('oas-tool-call')
  await expect(stages).toHaveCount(3)
  await expect(stages.nth(0).locator('[part="status-text"]')).toHaveText('运行中')
  await expect(stages.nth(1).locator('[part="status-text"]')).toHaveText('已完成')
  await expect(stages.nth(2).locator('[part="status-text"]')).toHaveText('失败')
  // 运行中还没结果 → 结果段隐藏；成功/失败各有载荷
  await expect(stages.nth(0).locator('[data-section="result"]')).toBeHidden()
  await expect(stages.nth(1).locator('[part="result"]')).toContainText('shipped')
  await expect(stages.nth(2).locator('[part="result"]')).toContainText('ETIMEDOUT')
  await matrix.locator('oas-tool-call[data-stage="success"] [part="head"]').click()
  await expect(page.locator('#tool-call-matrix-event')).toHaveText(/已完成.*已折叠/)
  await expect(matrix.locator('oas-tool-call[data-stage="success"]')).not.toHaveAttribute('open', '')

  const a11y = await new AxeBuilder({ page }).analyze()
  expect(
    a11y.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    a11y.violations.map((v) => v.id).join(', '),
  ).toEqual([])
  expect(errors).toEqual([])
})
