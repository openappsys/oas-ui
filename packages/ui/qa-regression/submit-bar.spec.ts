// 复核回归：submit-bar——真实点击派发与 loading 拦截。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('submit-bar：主按钮真实点击派发 oas-submit，loading 下点击被拦截', async ({ page }) => {
  await page.goto('/components/submit-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-submit-bar')

  const bar = page.locator('#sb-basic')
  await bar.locator('[part="action"]').click()
  await expect(page.locator('#sb-basic-out')).toContainText('oas-submit')
  await expect(page.locator('#sb-basic-out')).toContainText('1299')

  // loading：按钮 disabled + aria-busy，点击不派发
  await page.evaluate(() => {
    const el = document.getElementById('sb-loading')!
    const w = window as unknown as { __sbFired?: number }
    w.__sbFired = 0
    el.addEventListener('oas-submit', () => {
      w.__sbFired = (w.__sbFired ?? 0) + 1
    })
  })
  await page.locator('#sb-loading [part="action"]').click({ force: true })
  const fired = await page.evaluate(() => (window as unknown as { __sbFired?: number }).__sbFired)
  expect(fired).toBe(0)
  await expect(page.locator('#sb-loading [part="action"]')).toHaveAttribute('aria-busy', 'true')
  await expect(page.locator('#sb-loading [part="spinner"]')).toBeVisible()
})
