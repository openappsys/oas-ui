// 复核回归：stepper——历史缺陷固化断言（移动端窄屏横向溢出滚动，不再硬压缩省略）。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('stepper 移动端：coarse 下步骤头横向可滚、tab 最小触控高 ≥44px', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  try {
    await page.goto('/components/stepper.html', { waitUntil: 'domcontentloaded' })
    await up(page, 'oas-stepper')
    const r = await page.evaluate(() => {
      const root = document.querySelector('oas-stepper')!.shadowRoot!
      const css = root.querySelector('style')!.textContent!
      const tablist = root.querySelector<HTMLElement>('.tablist')!
      const tab = root.querySelector<HTMLElement>('[role="tab"]')!
      return {
        coarseRule: css.includes('@media (pointer: coarse)') && css.includes('--oas-touch-target-min'),
        tablistOverflowX: getComputedStyle(tablist).overflowX,
        tabMin: parseFloat(getComputedStyle(tab).minHeight),
      }
    })
    expect(r.coarseRule, '样式表应有 coarse 窄屏规则').toBe(true)
    expect(r.tablistOverflowX, '步骤头 coarse 下应横向可滚（auto/scroll）').toMatch(/auto|scroll/)
    expect(r.tabMin, 'tab coarse 下最小触控高 ≥44px').toBeGreaterThanOrEqual(44)
  } finally {
    await ctx.close()
  }
})

test('stepper：每个 tab 的 aria-controls 指向真实存在的 panel id（跨 shadow 引用兜底断言）', async ({ page }) => {
  await page.goto('/components/stepper.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-stepper')
  const r = await page.evaluate(() => {
    const missing: string[] = []
    let checked = 0
    for (const host of Array.from(document.querySelectorAll('oas-stepper'))) {
      const root = (host as HTMLElement).shadowRoot!
      for (const tab of Array.from(root.querySelectorAll<HTMLElement>('[role="tab"]'))) {
        const id = tab.getAttribute('aria-controls')
        if (!id) continue
        checked++
        const found = document.getElementById(id) ?? root.querySelector(`#${CSS.escape(id)}`)
        if (!found) missing.push(id)
      }
    }
    return { checked, missing }
  })
  expect(r.checked, '页面应有带 aria-controls 的 tab').toBeGreaterThan(0)
  expect(r.missing, 'aria-controls 指向的 panel id 必须真实存在（axe 静态分析够不到，由此断言兜底）').toEqual([])
})
