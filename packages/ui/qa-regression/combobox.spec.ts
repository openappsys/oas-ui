// 复核回归：combobox——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { panelGeometryAcrossOpens, up } from './helpers'

test('combobox 浮层定位：首开左缘对齐输入框且与再开一致', async ({ page }) => {
  // 曾现 bug：与 select 同根因——positionDropdown 先用面板固有宽度（未撑开）算 left，
  // 之后才把 style.width 设成输入框宽度 → 首开左缘偏右（实测 +89px），再开才对齐。
  // 不变量：面板左缘 == 输入框左缘，且首开/再开完全一致。
  await page.goto('/components/combobox.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-combobox')
  const g = await panelGeometryAcrossOpens(page, 'oas-combobox', async (host) => {
    await host.locator('input[part="input"]').click()
    await page.keyboard.press('ArrowDown')
  })
  expect(Math.abs(g.first.left - g.first.anchorLeft)).toBeLessThanOrEqual(1)
  expect(Math.abs(g.first.left - g.second.left)).toBeLessThanOrEqual(1)
})
