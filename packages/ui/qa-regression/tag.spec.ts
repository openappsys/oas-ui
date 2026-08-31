// 复核回归：tag——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('tag primary clickable hover 文字可读（白字）', async ({ page }) => {
  await page.goto('/components/tag.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tag[clickable][type="primary"]')
  const tag = page.locator('oas-tag[clickable][type="primary"]').first()
  await tag.hover()
  const r = await tag.evaluate((el) => {
    const cs = getComputedStyle(el.shadowRoot!.querySelector('.tag')!)
    return { color: cs.color, bg: cs.backgroundColor }
  })
  expect(r.color).toBe('rgb(255, 255, 255)') // 白字不被主题色覆盖
  expect(r.bg).not.toBe(r.color) // 底与字不同色
})

test('tag 插槽 svg 与文字同排（宿主全局 reset display:block 不顶成竖排）', async ({ page }) => {
  // 曾现 bug：文档站全局 reset img/svg{display:block} 把插槽手写 svg 顶成块级，图标标签竖排。
  // 修复：.content 改 inline-flex（svg 被 block 化也只是横向 flex item）。
  await page.goto('/components/tag.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tag')
  const r = await page.evaluate(() => {
    const t = [...document.querySelectorAll('oas-tag:not([icon])')].find((x) =>
      x.querySelector(':scope > svg'),
    )!
    const svg = t.querySelector(':scope > svg')!
    const textNode = [...t.childNodes].find(
      (nd) => nd.nodeType === 3 && (nd.textContent ?? '').trim(),
    )!
    const range = document.createRange()
    range.selectNode(textNode)
    const tb = range.getBoundingClientRect()
    const sb = svg.getBoundingClientRect()
    return {
      sameRow: Math.abs(sb.y + sb.height / 2 - (tb.y + tb.height / 2)) <= 3,
      leftOfText: sb.x + sb.width <= tb.x + 6,
    }
  })
  expect(r.sameRow, '插槽 svg 应与文字同一行').toBe(true)
  expect(r.leftOfText, '插槽 svg 应在文字左侧').toBe(true)
})
