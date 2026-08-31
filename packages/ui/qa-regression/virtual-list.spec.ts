// 复核回归：virtual-list——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('virtual-list 独立页：items 升级前赋值回收 + 视口高度受限', async ({ page }) => {
  // 曾现 bug：demo 在 onMounted 用 basic.items = [...] 赋值，若此时组件未升级
  // （模块动态 import 与 onMounted 时序竞争），自有属性遮蔽原型 setter → 不渲染。
  // 另有视口 height 不落 CSS 高度的同款撑高问题。
  await page.goto('/components/virtual-list.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-virtual-list')
  await page.waitForTimeout(600)
  const r = await page.evaluate(() =>
    [...document.querySelectorAll('oas-virtual-list')].map((vlist) => {
      const viewport = vlist.shadowRoot!.querySelector('[part=viewport]')
      return {
        itemCount: vlist.shadowRoot!.querySelectorAll('[part=item]').length,
        viewportHeight: viewport?.getBoundingClientRect().height ?? -1,
        scrollable: viewport ? viewport.scrollHeight > viewport.clientHeight : true,
      }
    }),
  )
  expect(r.length).toBeGreaterThan(0)
  for (const [i, v] of r.entries()) {
    expect(v.itemCount, `第 ${i} 个 virtual-list 未渲染`).toBeGreaterThan(0)
    if (v.viewportHeight >= 0) expect(v.viewportHeight).toBeLessThanOrEqual(400)
    expect(v.scrollable).toBe(true)
  }
})

test('virtual-list 滚轮增量滚动不失控（overflow-anchor 回归）', async ({ page }) => {
  // 曾现 bug：虚拟滚动重渲染触发 Chrome 滚动锚定，滚轮增量逐帧放大（120 → 1056 → 2784），
  // 表现为"滚一下直接滚到底/越滚越快"。修复：.viewport/.inner 加 overflow-anchor: none。
  await page.goto('/components/virtual-list.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#vl-basic')
  await page.waitForTimeout(600)
  const box = await page.locator('#vl-basic').boundingBox()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + 50)
  const scrollTop = () =>
    page.evaluate(() => {
      const el = document.querySelector('#vl-basic')!
      return el.shadowRoot!.querySelector('[part=viewport]')!.scrollTop
    })
  const s0 = await scrollTop()
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(300)
  const s1 = await scrollTop()
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(300)
  const s2 = await scrollTop()
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(300)
  const s3 = await scrollTop()
  const d1 = s1 - s0
  const d2 = s2 - s1
  const d3 = s3 - s2
  // 每格滚轮应基本按增量前进（120 上下），绝不失控放大
  expect(d1).toBeGreaterThanOrEqual(100)
  expect(d2).toBeGreaterThanOrEqual(100)
  expect(d3).toBeGreaterThanOrEqual(100)
  expect(d2).toBeLessThanOrEqual(240)
  expect(d3).toBeLessThanOrEqual(240)
})
