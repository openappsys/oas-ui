import { test, expect } from '@playwright/test'

async function openReady(page: import('@playwright/test').Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.locator('oas-button').first().waitFor({ state: 'attached', timeout: 15000 })
  await page.waitForTimeout(1000)
}

test('onoas-* 属性绑定 CustomEvent（modal 事件反馈 demo）', async ({ page }) => {
  await openReady(page, '/components/modal.html')
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
  await openReady(page, '/components/popconfirm.html')
  const trigger = page.locator('oas-popconfirm').first().locator('oas-button').first()
  await trigger.click()
  const pop = page.locator('oas-popconfirm').first().locator('[part="popover"]')
  await expect(pop).toHaveAttribute('aria-hidden', 'false', { timeout: 10000 })
  await pop.locator('[part="ok"]').click()
  await expect(pop).toHaveAttribute('aria-hidden', 'true')
})
