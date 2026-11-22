// 复核回归：goods-action——角标可见、真实点击派发。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('goods-action：角标可见，点击 icon 项派发 oas-action-click', async ({ page }) => {
  await page.goto('/components/goods-action.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-goods-action')

  const bar = page.locator('#ga-basic')
  await expect(bar.locator('[part="badge"]:not([hidden])')).toHaveText('3')
  await bar.locator('[part="icon-button"]').nth(2).click()
  await expect(page.locator('#ga-basic-out')).toContainText('cart')
  await expect(page.locator('#ga-basic-out')).toContainText('icon')

  await bar.locator('[part="button"]').last().click()
  await expect(page.locator('#ga-basic-out')).toContainText('buy')
  await expect(page.locator('#ga-basic-out')).toContainText('button')
})
