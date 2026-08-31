// 复核回归：pin-input——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('pin-input 受控：外部动态切换 aria-invalid 即时同步 danger 边框', async ({ page }) => {
  // 曾现 bug：aria-invalid 未列入 observedAttributes，外部 setAttribute('aria-invalid') 不触发
  // update，容器/各格不同步、danger 边框不生效（校验失败态无视觉反馈）。
  await page.goto('/components/pin-input.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#pin-invalid')
  const r = await page.evaluate(async () => {
    const el = document.querySelector('#pin-invalid')!
    const root = el.shadowRoot!
    const container = root.querySelector('[part="container"]')!
    const cell = root.querySelector('input')!
    const state = () => ({
      container: container.getAttribute('aria-invalid'),
      cell: cell.getAttribute('aria-invalid'),
      border: getComputedStyle(cell).borderColor,
    })
    el.setAttribute('aria-invalid', 'true')
    // 边框有 120ms 过渡（--oas-transition-fast）：等过渡完成再读 computed style
    await new Promise((resolve) => setTimeout(resolve, 250))
    const invalid = state()
    el.setAttribute('aria-invalid', 'false')
    await new Promise((resolve) => setTimeout(resolve, 250))
    const restored = state()
    return { invalid, restored }
  })
  expect(r.invalid.container).toBe('true')
  expect(r.invalid.cell).toBe('true')
  expect(r.invalid.border).not.toBe(r.restored.border) // danger 边框 ≠ 默认边框
  expect(r.restored.container).toBe('false')
})
