// 复核回归：anchor——历史缺陷固化断言（移动端触摸目标）。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('anchor 移动端：coarse 下链接行最小高度 ≥44px（--oas-touch-target-min）', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  try {
    await page.goto('/components/anchor.html', { waitUntil: 'domcontentloaded' })
    await up(page, 'oas-anchor')
    const r = await page.evaluate(() => {
      const root = document.querySelector('oas-anchor')!.shadowRoot!
      const css = root.querySelector('style')!.textContent!
      const link = root.querySelector<HTMLElement>("[part='link']")!
      return {
        coarseRule: css.includes('@media (pointer: coarse)') && css.includes('--oas-touch-target-min'),
        linkMin: parseFloat(getComputedStyle(link).minHeight),
      }
    })
    expect(r.coarseRule, '样式表应有 coarse 触摸目标规则').toBe(true)
    expect(r.linkMin, '链接行 coarse 下最小高度 ≥44px').toBeGreaterThanOrEqual(44)
  } finally {
    await ctx.close()
  }
})
