// 复核回归：grid——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('grid 单值 gap 真实生效：简写不被后续长hand清空（真实浏览器 CSSOM 回归）', async ({ page }) => {
  // 实证缺陷：applyGap 单值分支「先写 style.gap 再清 rowGap/columnGap」——
  // 真实浏览器里简写展开为长hand后被逐个清空，computed gap 掉 0（happy-dom 不展开简写故单测漏检）
  await page.goto('/components/grid.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-grid')
  const r = await page.evaluate(() => {
    const single = document.querySelector('oas-grid[gap="12px"]')!
    const twoVal = [...document.querySelectorAll('oas-grid')].find(
      (g) => (g.getAttribute('gap') || '').includes(' '),
    )!
    const cs1 = getComputedStyle(single)
    const cs2 = getComputedStyle(twoVal)
    return {
      singleCol: cs1.columnGap,
      singleRow: cs1.rowGap,
      twoRow: cs2.rowGap,
      twoCol: cs2.columnGap,
      twoAttr: twoVal.getAttribute('gap'),
    }
  })
  expect(r.singleCol, '单值 gap 列距应生效（不被清空）').toBe('12px')
  expect(r.singleRow, '单值 gap 行距应生效（不被清空）').toBe('12px')
  expect(r.twoRow, `两值 ${r.twoAttr} 行距应生效`).toBe('8px')
  expect(r.twoCol, `两值 ${r.twoAttr} 列距应生效`).toBe('24px')
})

// —— 缺陷回归：theme-editor 颜色函数值编辑（rgb()/oklch() 色板不回落 #000000，文本编辑不破坏原值） ——
// 曾现缺陷：toHex() 只认 #rrggbb，rgb()/oklch()/color-mix() 等颜色函数值回落 #000000（显示黑色，
// 编辑即破坏原值）。修复后：色板只承载可解析为 #rrggbb 的值（rgb/oklch 手动解析非黑 hex），
// 文本框始终保留原始函数值字符串；含 var() 的 color-mix 色板置灰禁用、仅文本框可编辑。