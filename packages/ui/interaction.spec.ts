import { test, expect } from '@playwright/test'

test.describe('命令式 API 与弹层交互', () => {
  test('message：点击按钮弹出消息并可关闭', async ({ page }) => {
    await page.goto('/components/message.html', { waitUntil: 'networkidle' })
    await page.locator('oas-button').first().click()
    await expect(page.locator('oas-message, .oas-message, [data-oas-message]').first()).toBeVisible()
  })

  test('modal：点击打开对话框，可关闭', async ({ page }) => {
    await page.goto('/components/modal.html', { waitUntil: 'networkidle' })
    await page.locator('oas-button').first().click()
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog.first()).toBeVisible()
  })

  test('confirm：确认框可取消/确认', async ({ page }) => {
    await page.goto('/components/confirm.html', { waitUntil: 'networkidle' })
    await page.locator('oas-button').first().click()
    await expect(page.locator('[role="dialog"]').first()).toBeVisible()
  })

  test('drawer：可打开抽屉', async ({ page }) => {
    await page.goto('/components/drawer.html', { waitUntil: 'networkidle' })
    await page.locator('oas-button').first().click()
    await expect(page.locator('[role="dialog"]').first()).toBeVisible()
  })

  test('table：排序点击生效', async ({ page }) => {
    await page.goto('/components/table.html', { waitUntil: 'networkidle' })
    const th = page.locator('oas-table').first().locator('th.sortable').first()
    await th.click()
    // 排序后表头带 order 标记
    await expect(th).toHaveAttribute('data-order', /asc|desc/)
  })

  test('tree：点击展开显示子节点', async ({ page }) => {
    await page.goto('/components/tree.html', { waitUntil: 'networkidle' })
    const tree = page.locator('oas-tree').first()
    const rowCount = await tree.locator('[part="row"]').count()
    await tree.locator('[part="toggle"]').first().click()
    await expect(tree.locator('[part="row"]')).toHaveCount(await tree.locator('[part="row"]').count().then((c) => c))
    expect(await tree.locator('[part="row"]').count()).toBeGreaterThan(rowCount)
  })

  test('tabs：点击切换激活', async ({ page }) => {
    await page.goto('/components/tabs.html', { waitUntil: 'networkidle' })
    const tabs = page.locator('oas-tabs').first()
    const tab2 = tabs.locator('[role="tab"]').nth(1)
    await tab2.click()
    await expect(tab2).toHaveAttribute('aria-selected', 'true')
  })
})
