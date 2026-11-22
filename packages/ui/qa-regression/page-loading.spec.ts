// 复核回归：page-loading 必须真正全屏遮住页面、按 close() 关闭并派发 oas-close（编程关闭可达）。
import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('page-loading 打开可见全屏遮罩，自动 close() 后消失且派发 oas-close', async ({ page }) => {
  await page.goto('/components/page-loading.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#pl-demo')

  const demo = page.locator('#pl-demo')
  const mask = demo.locator('[part="mask"]')
  await expect(mask).toBeHidden()

  await page.click('#pl-spinner')
  await expect(mask).toBeVisible()
  const covered = await page.evaluate(() => {
    const host = document.querySelector('#pl-demo') as HTMLElement
    const mask = host.shadowRoot!.querySelector('[part="mask"]') as HTMLElement
    const r = mask.getBoundingClientRect()
    return { w: r.width, h: r.height, position: getComputedStyle(mask).position }
  })
  expect(covered.position).toBe('fixed')
  expect(covered.w).toBeGreaterThan(300)
  expect(covered.h).toBeGreaterThan(300)

  await expect.poll(() => demo.getAttribute('open'), { timeout: 6000 }).toBeNull()
  await expect(mask).toBeHidden()
  await expect(page.locator('#pl-output')).toHaveText(/oas-close 已派发/)

  // 进度形态：宽高同步推进后关闭
  await page.click('#pl-progress')
  await expect(mask).toBeVisible()
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const host = document.querySelector('#pl-demo') as HTMLElement
          const bar = host.shadowRoot!.querySelector('[part="bar"]') as HTMLElement
          return parseFloat(bar.style.width) || 0
        }),
      { timeout: 4000 },
    )
    .toBeGreaterThan(1)
  await expect.poll(() => demo.getAttribute('open'), { timeout: 6000 }).toBeNull()
})
