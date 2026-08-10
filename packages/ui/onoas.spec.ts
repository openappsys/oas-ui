import { test, expect } from '@playwright/test'

async function openReady(
  page: import('@playwright/test').Page,
  url: string,
  selector: string,
): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
  // 自定义元素注册/升级是异步的（并行负载下可能远超 1s）：等到目标组件 shadowRoot
  // 就绪再交互，否则点击会落在未升级元素上、事件丢失
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel)
      return el instanceof HTMLElement && el.shadowRoot !== null
    },
    selector,
    { timeout: 15000 },
  )
  await page.waitForTimeout(300)
}

test('onoas-* 属性绑定 CustomEvent（modal 事件反馈 demo）', async ({ page }) => {
  await openReady(page, '/components/modal.html', 'oas-modal[id="modal-event"]')
  // 点击「事件反馈」demo 的打开按钮（modal 页 demo 块已增多，不按索引取按钮）
  const openBtn = page.locator('oas-button', { hasText: '打开并监听事件' })
  await openBtn.click()
  const dialog = page.locator('oas-modal[id="modal-event"]')
  await expect(dialog).toHaveAttribute('visible', '')
  // 点确定 → onoas-ok → closeModal + message.success
  await dialog.locator('button').filter({ hasText: '确定' }).click()
  await expect(dialog).not.toHaveAttribute('visible', '')
  // message 已弹出
  await expect(page.locator('[data-oas-message], oas-message, .oas-message').first()).toBeVisible()
})

test('popconfirm onoas-ok 触发（气泡确认）', async ({ page }) => {
  await openReady(page, '/components/popconfirm.html', 'oas-popconfirm')
  const trigger = page.locator('oas-popconfirm').first().locator('oas-button').first()
  await trigger.click()
  const pop = page.locator('oas-popconfirm').first().locator('[part="popover"]')
  await expect(pop).toHaveAttribute('aria-hidden', 'false', { timeout: 10000 })
  await pop.locator('[part="ok"]').click()
  await expect(pop).toHaveAttribute('aria-hidden', 'true')
})
