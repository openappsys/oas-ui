// 复核回归：avatar——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('avatar 徽标角标：badge 文本可见且带底色、dot 圆点不渲染文本', async ({ page }) => {
  // 曾现缺口：avatar 无徽标能力，通知计数/在线状态需宿主自绘角标；
  // 本次补 badge/badge-dot/badge-color/badge-placement 叠加角标（视觉对齐 oas-badge）。
  await page.goto('/components/avatar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-avatar[badge="99+"]')
  const textBadge = await page.evaluate(() => {
    const el = document.querySelector('oas-avatar[badge="99+"]')!
    const b = el.shadowRoot!.querySelector('[part="badge"]')!
    const cs = getComputedStyle(b)
    return { visible: !b.hasAttribute('hidden'), text: b.textContent, bg: cs.backgroundColor }
  })
  expect(textBadge.visible).toBe(true)
  expect(textBadge.text).toBe('99+')
  expect(textBadge.bg, '徽标应有非透明底色').not.toBe('rgba(0, 0, 0, 0)')

  const dot = await page.evaluate(() => {
    const el = document.querySelector('oas-avatar[badge-dot]')!
    const b = el.shadowRoot!.querySelector('[part="badge"]')!
    return { dot: b.classList.contains('dot'), text: b.textContent }
  })
  expect(dot.dot).toBe(true)
  expect(dot.text).toBe('')
})

test('avatar 加载失败回退：404 图触发 img error 后回退首字符、状态保持', async ({ page }) => {
  // 曾现缺口：avatar 图片加载失败显示裂图，无占位回退；本次补 onerror → fallback 插槽/首字符。
  await page.goto('/components/avatar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-avatar[src*="invalid.example.com"]')
  // 等 img error 触发 → fallback 容器显示
  await page.waitForFunction(
    () => {
      const el = document.querySelector('oas-avatar[src*="invalid.example.com"]')!
      return el.shadowRoot!.querySelector('[part="fallback"]')!.hasAttribute('hidden') === false
    },
    null,
    { timeout: 10000 },
  )
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-avatar[src*="invalid.example.com"]')!
    return {
      imgHidden: el.shadowRoot!.querySelector('img')!.hasAttribute('hidden'),
      text: el.shadowRoot!.querySelector('[part="text"]')!.textContent,
    }
  })
  expect(r.imgHidden).toBe(true)
  expect(r.text).toBe('张')
})
