// 复核回归：offline 断网提示必须真的可见/消失，事件反馈落到页面（不能只 console）。
import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('offline 模拟断网 → 提示可见 + oas-offline 反馈；恢复 → 提示消失 + oas-online 反馈', async ({ page }) => {
  await page.goto('/components/offline.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#of-demo')

  const demo = page.locator('#of-demo')
  const output = page.locator('#of-output')
  await expect(demo).toBeHidden()

  await page.click('#of-off')
  await expect(demo).toBeVisible()
  await expect(demo.locator('[part="bar"]')).toContainText(/网络连接已断开/)
  await expect(output).toHaveText(/oas-offline 已派发/)

  await page.click('#of-on')
  await expect(demo).toBeHidden()
  await expect(output).toHaveText(/oas-online 已派发/)
})
