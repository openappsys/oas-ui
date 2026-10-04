import { test, expect } from '@playwright/test'

// 皮肤画廊页交互回归：点皮肤/主题有可见反馈 + 计算值正确 + console 零告警
// （验证目标：skins.css 在 docs 页内自包含生效；暗态 html.dark/data-theme 双机制兼容）
test('皮肤画廊：点皮肤/主题有可见反馈 + console 零告警', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.setViewportSize({ width: 900, height: 900 })
  await page.goto('/guide/skins.html', { waitUntil: 'domcontentloaded' })
  const wrap = page.locator('.sg-wrap')
  await wrap.waitFor({ timeout: 15000 })

  await page.getByRole('button', { name: 'violet' }).first().click()
  await page.waitForTimeout(300)
  const afterViolet = await wrap.evaluate((el) => getComputedStyle(el).getPropertyValue('--oas-color-primary').trim())
  expect(afterViolet.toLowerCase(), '点 violet 主色应变').toBe('#7c3aed')

  const bgLight = await wrap.evaluate((el) => getComputedStyle(el).backgroundColor)
  await page.getByRole('button', { name: 'dark', exact: true }).click()
  await page.waitForTimeout(400)
  const bgDark = await wrap.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(bgDark, '点 dark 背景应变深').not.toBe(bgLight)
  const primaryDarkViolet = await wrap.evaluate((el) =>
    getComputedStyle(el).getPropertyValue('--oas-color-primary').trim(),
  )
  expect(primaryDarkViolet.toLowerCase(), 'dark+violet 应提亮为浅紫').toBe('#b69bff')

  // en 页
  await page.goto('/en/guide/skins.html', { waitUntil: 'domcontentloaded' })
  await page.locator('.sg-wrap').waitFor({ timeout: 15000 })
  await page.getByRole('button', { name: 'emerald' }).first().click()
  await page.waitForTimeout(300)
  const p = await page
    .locator('.sg-wrap')
    .evaluate((el) => getComputedStyle(el).getPropertyValue('--oas-color-primary').trim())
  expect(p.toLowerCase(), 'en 页 emerald 生效').toBe('#059669')

  expect(errors, 'console/pageerror 应为空').toEqual([])
})
