// 复核回归：timeline——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('timeline 圆点中心与连接线中心对齐', async ({ page }) => {
  // 曾现 bug：.dot 未设 box-sizing，content-box 下总宽 14px 圆心 7px，线心 5px，偏右 2px。
  await page.goto('/components/timeline.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-timeline')
  const r = await page.evaluate(() => {
    const item = document.querySelector('oas-timeline')!.shadowRoot!.querySelector('.item')!
    const dot = item.querySelector('.dot')!
    const dotBox = dot.getBoundingClientRect()
    const itemBox = item.getBoundingClientRect()
    return {
      diff: Math.abs(dotBox.left + dotBox.width / 2 - (itemBox.left + 5)),
      dotWidth: dotBox.width,
    }
  })
  expect(r.dotWidth).toBe(10)
  expect(r.diff).toBeLessThanOrEqual(1)
})
