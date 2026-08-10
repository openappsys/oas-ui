import { test, expect } from '@playwright/test'

test('DemoBlock 渲染实时示例并可展开源码', async ({ page }) => {
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  // demo 块总数随 demo 新增变化，不断言死数量；断言关键块存在（含最近新增的图标/块级/圆角/幽灵）
  for (const title of ['按钮类型', '图标 + 文字', '纯图标按钮', '块级按钮', '圆角按钮', '幽灵按钮']) {
    await expect(
      page.locator('.demo-block').filter({ has: page.locator(`h3:text-is("${title}")`) }),
    ).toHaveCount(1)
  }
  const typeBlock = page.locator('.demo-block').filter({ has: page.locator('h3:text-is("按钮类型")') })
  // 「按钮类型」块渲染 6 个按钮
  await expect(typeBlock.locator('.demo-block__body oas-button')).toHaveCount(6)
  // 展开源码
  await typeBlock.locator('.demo-block__toggle').click()
  const code = await typeBlock.locator('.demo-block__code code').innerText()
  expect(code).toContain('<oas-button')
  expect(code).toContain('type="primary"')
})
