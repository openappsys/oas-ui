// 复核回归：sku——缺货置灰、切换颜色后可选、价格联动、数量库存上限。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('sku：缺货选项置灰并标缺货，切换颜色后可选，价格与数量上限随 sku 联动', async ({ page }) => {
  await page.goto('/components/sku.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-sku')

  const host = page.locator('#sku-basic')
  const option = (value: string) => host.locator(`[part="option"][data-value="${value}"]`)

  // 选中曜石黑：该颜色下 M 码无库存 → 置灰 + 缺货（可选路径提示）
  await option('曜石黑').click()
  await expect(option('M')).toHaveAttribute('data-available', 'false')
  await expect(option('M')).toContainText('缺货')
  await expect(option('S')).toHaveAttribute('data-available', 'true')

  // 切到雾霭白：M 码有库存 → 可选，价格随组合联动
  await option('雾霭白').click()
  await expect(option('M')).toHaveAttribute('data-available', 'true')
  await option('M').click()
  await expect(page.locator('#sku-basic-out')).toContainText('329')

  // 换尺码后切回曜石黑：价格随组合更新（S 码在黑/白均有库存）
  await option('S').click()
  await option('曜石黑').click()
  await expect(page.locator('#sku-basic-out')).toContainText('299')

  // 数量上限 = 库存 2：加到 2 后加号禁用
  const qty = page.locator('#sku-qty')
  await qty.locator('[part="plus"]').click()
  await expect(qty.locator('[part="quantity-input"]')).toHaveValue('2')
  await expect(qty.locator('[part="plus"]')).toBeDisabled()
  await expect(page.locator('#sku-qty-out')).toContainText('2')
})
