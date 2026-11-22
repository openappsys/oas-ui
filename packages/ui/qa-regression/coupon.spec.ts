// 复核回归：coupon——弹层开合、不可用券禁用、选中派发并关闭。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('coupon：选择弹层可用券可选、不可用券禁用、选中后派发 oas-select 并关闭', async ({ page }) => {
  await page.goto('/components/coupon.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-coupon')

  const host = page.locator('#cp-select')
  await host.locator('[part="trigger"]').click()
  await expect(host.locator('[part="overlay"]')).toBeVisible()

  const options = host.locator('[part="option"]')
  await expect(options).toHaveCount(4)
  await expect(options.nth(2).locator('input')).toBeDisabled()
  await expect(options.nth(3).locator('input')).toBeDisabled()

  await options.first().click()
  await expect(page.locator('#cp-select-out')).toContainText('oas-select')
  await expect(host.locator('[part="overlay"]')).toBeHidden()
  // 已选券面额回显在触发按钮
  await expect(host.locator('[part="trigger"]')).toContainText('30')
})
