// 复核回归：list——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('list 选中行 hover 保持 primary 背景（白字可读，不被 clickable hover 浅灰压盖）', async ({ page }) => {
  await page.goto('/components/list.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-list-item[selected]')
  // 真实 hover 选中行
  await page.locator('oas-list-item[selected]').first().hover()
  const r = await page.evaluate(() => {
    const sel = document.querySelector('oas-list-item[selected]')!
    const bg = getComputedStyle(sel).backgroundColor
    const color = getComputedStyle(sel).color
    // 取 primary 与 bg-hover 的实际计算色做对照
    const probe = document.createElement('div')
    document.body.appendChild(probe)
    probe.style.background = 'var(--oas-color-bg-hover)'
    const bgHover = getComputedStyle(probe).backgroundColor
    probe.style.background = 'var(--oas-color-primary)'
    const primary = getComputedStyle(probe).backgroundColor
    probe.style.background = 'var(--oas-color-primary-hover, var(--oas-color-primary))'
    const primaryHover = getComputedStyle(probe).backgroundColor
    probe.remove()
    return { bg, color, bgHover, primary, primaryHover }
  })
  // 选中行 hover 背景 ≠ bg-hover 浅灰（bug 形态），= primary 系（primary 或 primary-hover）
  expect(r.bg).not.toBe(r.bgHover)
  expect([r.primary, r.primaryHover]).toContain(r.bg)
})
