// commerce category 用户视角回归：双栏联动与商品位选择反馈。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('category 左类右品联动：点击子类更新高亮、宫格与页面反馈', async ({ page }) => {
  await page.goto('/components/category.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-category#category-event-demo')

  await page.evaluate(() => {
    const el = document.querySelector('oas-category#category-event-demo')!
    const node = el.shadowRoot!.querySelector<HTMLElement>('.node[data-key="phone"]')!
    node.click()
  })
  const linked = await page.evaluate(() => {
    const el = document.querySelector('oas-category#category-event-demo')!
    const root = el.shadowRoot!
    return {
      active: el.getAttribute('active-key'),
      selected: root.querySelector('.node[data-key="phone"]')!.getAttribute('aria-selected'),
      tiles: [...root.querySelectorAll<HTMLElement>('.tile')].map((t) => t.textContent),
      feedback: document.getElementById('category-event-info')!.textContent,
    }
  })
  expect(linked.active).toBe('phone')
  expect(linked.selected).toBe('true')
  expect(linked.tiles).toEqual(['苹果', '安卓'])
  expect(linked.feedback).toContain('digital / phone')
})

test('category 商品位点击：页面反馈显示商品名', async ({ page }) => {
  await page.goto('/components/category.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-category#category-event-demo')

  await page.evaluate(() => {
    const el = document.querySelector('oas-category#category-event-demo')!
    const tile = el.shadowRoot!.querySelector<HTMLElement>('.tile[data-key="audio"]')!
    tile.click()
    el.shadowRoot!.querySelector<HTMLElement>('.tile[data-key="p1"]')!.click()
  })
  const feedback = await page.evaluate(() => document.getElementById('category-event-info')!.textContent)
  expect(feedback).toContain('蓝牙耳机')
})
