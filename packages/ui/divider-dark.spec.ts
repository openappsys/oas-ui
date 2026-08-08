import { test, expect } from '@playwright/test'

test('DemoBlock 主题切换 + divider 暗色可见', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 900 })
  await page.goto('/components/divider.html', { waitUntil: 'networkidle' })

  // 默认浅色
  const body0 = page.locator('.demo-block__body').nth(0)
  await expect(body0).toHaveAttribute('data-theme', 'light')

  // 点第 2 个 DemoBlock（带内容）的 🌙 切到暗色
  const block1 = page.locator('.demo-block').nth(1)
  await block1.locator('.demo-block__theme').click()
  const body1 = block1.locator('.demo-block__body')
  await expect(body1).toHaveAttribute('data-theme', 'dark')
  // 等待 background 过渡完成
  await page.waitForTimeout(400)
  // body 背景应为暗色
  const bg = await body1.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(bg).toBe('rgb(24, 24, 27)') // #18181b

  // 块内 divider 文字应继承暗色 text-primary（#fafafa）
  const dividerColor = await block1.locator('oas-divider').first().evaluate((el) => {
    const d = el.shadowRoot?.querySelector('.divider')
    return d ? getComputedStyle(d).color : null
  })
  expect(dividerColor).toBe('rgb(250, 250, 250)')
})

test('暗色模式 divider 截图（浅色 + 暗色）', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 900 })
  await page.goto('/components/divider.html', { waitUntil: 'networkidle' })
  // 全部 DemoBlock 切暗色
  const blocks = page.locator('.demo-block')
  const n = await blocks.count()
  for (let i = 0; i < n; i++) {
    await blocks.nth(i).locator('.demo-block__theme').click()
  }
  await page.waitForTimeout(200)
  await page.screenshot({ path: 'test-results/divider-dark.png', fullPage: true })
})
