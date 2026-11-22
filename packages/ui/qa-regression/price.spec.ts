// 复核回归：price——格式化结果与暗色 token 翻转。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('price：千分位/小数位按 Intl 渲染，暗色下颜色随 token 翻转', async ({ page }) => {
  await page.goto('/components/price.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-price')
  const first = page.locator('oas-price').first()
  await expect(first.locator('[part="amount"]').first()).toHaveText('1,299')
  await expect(first.locator('[part="decimal"]').first()).toHaveText('.00')
  await expect(first.locator('[part="symbol"]').first()).toHaveText('¥')
  await expect(first.locator('[part="original"]')).toContainText('1,599.00')

  const readColor = () =>
    first.evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('[part="amount"]')!).color)
  const light = await readColor()
  expect(light).not.toBe('')
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await expect.poll(readColor, 'dark 下金额颜色翻转（token 暗色变体生效）').not.toBe(light)
})
