import { test, expect } from '@playwright/test'

test('onoas-* 属性绑定 CustomEvent（modal 事件反馈 demo）', async ({ page }) => {
  await page.goto('/components/modal.html', { waitUntil: 'networkidle' })
  // 打开「事件反馈」对话框（第 4 个 oas-button）
  const btns = page.locator('oas-button')
  await btns.nth(3).click()
  const dialog = page.locator('oas-modal[id="modal-event"]')
  await expect(dialog).toHaveAttribute('visible', '')
  // 点确定 → onoas-ok → closeModal + message.success
  await dialog.locator('button').filter({ hasText: '确定' }).click()
  await expect(dialog).not.toHaveAttribute('visible', '')
  // message 已弹出
  await expect(page.locator('[data-oas-message], oas-message, .oas-message').first()).toBeVisible()
})

test('popconfirm onoas-ok 触发（气泡确认）', async ({ page }) => {
  await page.goto('/components/popconfirm.html', { waitUntil: 'networkidle' })
  const trigger = page.locator('oas-popconfirm').first().locator('oas-button').first()
  await trigger.click()
  await page.locator('button').filter({ hasText: '确定' }).first().click()
})
