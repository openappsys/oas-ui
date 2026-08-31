// 复核回归：context-menu——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up, visibleSubmenuRects } from './helpers'

test('context-menu 多级子菜单贴近视口右缘：翻转后全部落在视口内', async ({ page }) => {
  await page.goto('/components/context-menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-context-menu')
  // 把「多级子菜单」demo 平移到视口右缘（fixed + 高 z-index），右键点在右缘附近
  await page.evaluate(() => {
    const cm = [...document.querySelectorAll('oas-context-menu')].find((el) =>
      el.getAttribute('items')?.includes('"children"'),
    ) as HTMLElement
    cm.style.cssText = 'position: fixed; right: 0; top: 260px; z-index: 9999'
    cm.dataset.e2eRightEdge = '1'
  })
  const box = await page.locator('oas-context-menu[data-e2e-right-edge]').boundingBox()
  await page.mouse.click(box!.x + box!.width - 12, box!.y + 60, { button: 'right' })
  // 逐级展开两级子菜单链：新建 → 项目 →（Git 仓库/空白）
  await page
    .locator('oas-context-menu[data-e2e-right-edge] [part="item"][data-value="new"]')
    .hover({ timeout: 5000 })
  await page
    .locator('oas-context-menu[data-e2e-right-edge] [part="item"][data-value="new-project"]')
    .hover({ timeout: 5000 })
  await page.waitForTimeout(200)
  const rects = await visibleSubmenuRects(page)
  expect(rects.length).toBeGreaterThanOrEqual(2) // 一级 + 二级子菜单均已展开
  expect(
    rects.some((r) => r.flipLeft),
    '贴右缘的子菜单应向左翻转（flip-left），而非被裁掉',
  ).toBe(true)
  for (const r of rects) {
    expect(r.left, `子菜单 left=${r.left} 越出视口左缘`).toBeGreaterThanOrEqual(-1)
    expect(r.right, `子菜单 right=${r.right} 越出视口右缘`).toBeLessThanOrEqual(r.vw + 1)
    expect(r.top, `子菜单 top=${r.top} 越出视口上缘`).toBeGreaterThanOrEqual(-1)
    expect(r.bottom, `子菜单 bottom=${r.bottom} 越出视口下缘`).toBeLessThanOrEqual(r.vh + 1)
  }
  await page.screenshot({ path: 'C:\\WINDOWS\\TEMP\\opencode\\fix8-context-menu-flip.png' })
})
