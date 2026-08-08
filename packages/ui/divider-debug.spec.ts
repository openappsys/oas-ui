import { test } from '@playwright/test'

test('divider 真实几何', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 900 })
  await page.goto('/components/divider.html', { waitUntil: 'networkidle' })
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
  await page.waitForTimeout(200)
  const info = await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('oas-divider'))
    const first = divs[0]
    if (!first) return null
    const dividerEl = first.shadowRoot?.querySelector('.divider')
    const beforeEl = first.shadowRoot?.querySelector('.divider')
    const beforeCS = beforeEl ? window.getComputedStyle(beforeEl, '::before') : null
    const hostRect = first.getBoundingClientRect()
    const dividerRect = dividerEl?.getBoundingClientRect()
    return {
      hostRect: { x: hostRect.x, y: hostRect.y, w: hostRect.width, h: hostRect.height },
      dividerRect: dividerRect ? { x: dividerRect.x, y: dividerRect.y, w: dividerRect.width, h: dividerRect.height } : null,
      beforeContent: beforeCS?.content,
      beforeHeight: beforeCS?.height,
      beforeBackground: beforeCS?.backgroundColor,
      beforeDisplay: beforeCS?.display,
      hostBg: window.getComputedStyle(first).backgroundColor,
    }
  })
  console.log(JSON.stringify(info, null, 2))
})