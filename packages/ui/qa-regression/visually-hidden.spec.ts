// 复核回归：visually-hidden——视觉隐藏几何、focusable 焦点显形（skip-link）固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('visually-hidden 默认 1×1 几何隐藏但内容保留（读屏可读、可复制）', async ({ page }) => {
  await page.goto('/components/visually-hidden.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-visually-hidden')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-visually-hidden:not([focusable])')!
    const rect = el.getBoundingClientRect()
    return { w: rect.width, h: rect.height, textLen: (el.textContent ?? '').trim().length }
  })
  expect(r.w, '视觉隐藏：宽 ≤1px（clip 方案）').toBeLessThanOrEqual(1)
  expect(r.h, '视觉隐藏：高 ≤1px').toBeLessThanOrEqual(1)
  expect(r.textLen, '文本仍在 DOM（屏幕阅读器可读、可选中复制）').toBeGreaterThan(0)
})

test('visually-hidden focusable：内容聚焦显形（skip-link），失焦恢复隐藏', async ({ page }) => {
  await page.goto('/components/visually-hidden.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-visually-hidden[focusable]')
  const sel = 'oas-visually-hidden[focusable]'
  expect(
    await page.evaluate((s) => document.querySelector(s)!.getBoundingClientRect().width, sel),
    '默认视觉隐藏',
  ).toBeLessThanOrEqual(1)

  // 聚焦内容里的链接（skip-link 链路）→ :focus-within 显形
  await page.evaluate((s) => {
    const wrap = document.querySelector(s)!
    const inner = wrap.querySelector('oas-link')
    const anchor = inner?.shadowRoot?.querySelector<HTMLElement>('a[part="link"]') ?? (inner as HTMLElement | null)
    anchor?.focus()
  }, sel)
  await expect
    .poll(() => page.evaluate((s) => document.querySelector(s)!.getBoundingClientRect().width, sel))
    .toBeGreaterThan(10)

  // 失焦 → 恢复隐藏
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await expect
    .poll(() => page.evaluate((s) => document.querySelector(s)!.getBoundingClientRect().width, sel))
    .toBeLessThanOrEqual(1)
})
