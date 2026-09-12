// 复核回归：switch——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

// 移动端专项 P5 回归：块级拉伸时宿主整行空白区可点（iOS 设置项语义），内部通道不重复触发
test('switch 块级拉伸：点宿主右侧空白区切换，点拨杆本体只触发一次（无重复 toggle）', async ({ page }) => {
  await page.goto('/components/switch.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#switch-block')
  const host = page.locator('#switch-block')
  await host.scrollIntoViewIfNeeded()
  const box = (await host.boundingBox())!
  expect(box.width, 'demo 开关应被拉成整行宽').toBeGreaterThan(200)

  // oas-change 计数：验证任何路径都不重复触发
  await page.evaluate(() => {
    ;(window as unknown as { __swCount: number }).__swCount = 0
    document.querySelector('#switch-block')!.addEventListener('oas-change', () => {
      ;(window as unknown as { __swCount: number }).__swCount++
    })
  })

  const checked = () => page.evaluate(() => document.querySelector('#switch-block')!.hasAttribute('checked'))

  // 1) 点宿主右侧空白区（拨杆 + 标签之外的区域）→ 切换开
  await page.mouse.click(box.x + box.width - 8, box.y + box.height / 2)
  await page.waitForFunction(() => document.querySelector('#switch-block')!.hasAttribute('checked'))
  // 2) 再点同一空白区 → 切换关
  await page.mouse.click(box.x + box.width - 8, box.y + box.height / 2)
  await page.waitForFunction(() => !document.querySelector('#switch-block')!.hasAttribute('checked'))

  // 3) 点内部拨杆（shadow button）→ 只触发一次
  const track = await page.evaluate(() => {
    const b = document.querySelector('#switch-block')!.shadowRoot!.querySelector('button')!
    const r = b.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  })
  await page.evaluate(() => {
    ;(window as unknown as { __swCount: number }).__swCount = 0
  })
  await page.mouse.click(track.x, track.y)
  await page.waitForFunction(() => document.querySelector('#switch-block')!.hasAttribute('checked'))
  const count = await page.evaluate(() => (window as unknown as { __swCount: number }).__swCount)
  expect(count, '点拨杆应恰好触发一次 oas-change（宿主委托不得重复）').toBe(1)
  expect(await checked()).toBe(true)
})
