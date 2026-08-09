import { test, expect } from '@playwright/test'

test('DemoBlock 渲染实时示例并可展开源码', async ({ page }) => {
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  const blocks = page.locator('.demo-block')
  await expect(blocks).toHaveCount(4)
  await expect(blocks.first().locator('.demo-block__body oas-button')).toHaveCount(6)
  await blocks.first().locator('.demo-block__toggle').click()
  const code = await blocks.first().locator('.demo-block__code code').innerText()
  expect(code).toContain('<oas-button')
  expect(code).toContain('type="primary"')
})
