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
    const twoVal = [...document.querySelectorAll('oas-grid')].find((g) => (g.getAttribute('gap') || '').includes(' '))!
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

// —— PRD P2：双轴 gap（逗号双值 + row-gap/column-gap 分离属性） ——
test('grid PRD P2 双轴 gap：逗号双值与分离属性在真实 CSSOM 生效', async ({ page }) => {
  await page.goto('/components/grid.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-grid[gap="4,32"]')
  const r = await page.evaluate(() => {
    const comma = document.querySelector('oas-grid[gap="4,32"]')!
    const axis = document.querySelector('oas-grid[row-gap]')!
    const cs1 = getComputedStyle(comma)
    const cs2 = getComputedStyle(axis)
    return {
      commaRow: cs1.rowGap,
      commaCol: cs1.columnGap,
      axisRow: cs2.rowGap,
      axisCol: cs2.columnGap,
    }
  })
  expect(r.commaRow, 'gap="4,32" 行距 4px').toBe('4px')
  expect(r.commaCol, 'gap="4,32" 列距 32px').toBe('32px')
  expect(r.axisRow, 'row-gap=24 覆盖后行距 24px').toBe('24px')
  expect(r.axisCol, '未覆盖轴保持 gap=8 的列距 8px').toBe('8px')
})

// —— PRD P2：push/pull 偏移 + collapsed-rows 折叠行（尾格展开/收起交互） ——
test('grid PRD P2：push/pull 平移起始线；collapsed-rows 折叠尾格可展开收起', async ({ page }) => {
  await page.goto('/components/grid.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-grid[collapsed-rows]')
  await page.evaluate(() => document.querySelector('oas-grid[collapsed-rows]')!.scrollIntoView({ block: 'center' }))
  const pushed = await page.evaluate(() => {
    const push = document.querySelector('oas-grid-item[push="6"]')! as HTMLElement
    const pull = document.querySelector('oas-grid-item[pull="6"]')! as HTMLElement
    return { pushCol: push.style.gridColumn, pullCol: pull.style.gridColumn }
  })
  expect(pushed.pushCol, 'push=6 → 起始线第 7 列').toBe('7 / span 6')
  expect(pushed.pullCol, 'offset 6 + pull 6 → 净偏移 0 回落自动放置').toBe('span 6')

  // 折叠行：初始首行可见、其余隐藏，尾格「展开」；点击展开后「收起」可折回
  const state = async (): Promise<{
    visible: number
    hidden: number
    tail: string
    aria: string
    collapsed: boolean
  }> =>
    page.evaluate(() => {
      const grid = document.querySelector('oas-grid[collapsed-rows]')!
      const items = [...grid.querySelectorAll('oas-grid-item')] as HTMLElement[]
      const tail = grid.shadowRoot!.querySelector('[part="collapse-tail"]') as HTMLElement
      const btn = tail.querySelector('button')!
      return {
        visible: items.filter((i) => !i.hasAttribute('hidden')).length,
        hidden: items.filter((i) => i.hasAttribute('hidden')).length,
        tail: tail.hidden ? '' : (btn.textContent ?? ''),
        aria: btn.getAttribute('aria-expanded') ?? '',
        collapsed: grid.hasAttribute('collapsed'),
      }
    })
  const folded = await state()
  expect(folded.visible, '折叠态首行 3 项可见').toBe(3)
  expect(folded.hidden, '第 2 行 3 项隐藏').toBe(3)
  expect(folded.tail).toBe('展开')
  expect(folded.aria).toBe('false')
  expect(folded.collapsed, '首帧缺省折叠写回 collapsed').toBe(true)

  // 真实点击尾格展开
  const { realClick } = await import('./helpers')
  await realClick(page, 'oas-grid[collapsed-rows]', '[part="collapse-tail-btn"]')
  const expanded = await state()
  expect(expanded.visible, '展开后全部可见').toBe(6)
  expect(expanded.hidden).toBe(0)
  expect(expanded.tail).toBe('收起')
  expect(expanded.aria).toBe('true')
  expect(expanded.collapsed, '展开态 collapsed 移除').toBe(false)

  // 再点收起折回
  await realClick(page, 'oas-grid[collapsed-rows]', '[part="collapse-tail-btn"]')
  const refolded = await state()
  expect(refolded.visible).toBe(3)
  expect(refolded.tail).toBe('展开')
})
