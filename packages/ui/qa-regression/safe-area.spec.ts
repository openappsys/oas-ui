// 复核回归：safe-area 的 size 覆盖必须产生真实高度，position 切换读取对应方向的环境变量。
import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('safe-area size 覆盖产生真实高度（非仅 CSS 文本）', async ({ page }) => {
  await page.goto('/components/safe-area.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-safe-area')
  const heightOf = (sel: string) =>
    page.evaluate((s) => {
      const el = document.querySelector(s) as HTMLElement
      return el.getBoundingClientRect().height
    }, sel)
  expect(await heightOf('oas-safe-area[size="24"]'), 'size=24 → 24px 高度').toBeGreaterThan(23)
  expect(await heightOf('oas-safe-area[size="24"]')).toBeLessThan(26)
  expect(await heightOf('oas-safe-area[size="1.5rem"]'), 'size=1.5rem → 24px').toBeGreaterThan(23)
  const top = await page.evaluate(() => {
    const el = document.querySelector('oas-safe-area[position="top"]') as HTMLElement
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    return { position: el.getAttribute('position'), hasTopInset: /env\(safe-area-inset-top/.test(css) }
  })
  expect(top.position).toBe('top')
  expect(top.hasTopInset).toBe(true)
})
