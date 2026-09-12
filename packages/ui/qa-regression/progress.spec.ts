// 复核回归：progress——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('progress value 别名渲染：percent 缺失时写 value 生效（宽度/ARIA/文本）', async ({ page }) => {
  // 曾现 bug：宿主直觉写 value 静默无效（组件只认 percent）。修复=value 作为 percent 的
  // 别名纳入 observedAttributes，percent 存在时优先，否则读 value。
  await page.goto('/components/progress.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-progress')
  const r = await page.evaluate(() => {
    const el = document.createElement('oas-progress')
    el.setAttribute('value', '60')
    document.body.appendChild(el)
    const bar = el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
    const out = {
      width: bar.style.width,
      now: bar.getAttribute('aria-valuenow'),
      max: bar.getAttribute('aria-valuemax'),
      text: el.shadowRoot!.querySelector('[part="text"]')!.textContent,
    }
    el.remove()
    return out
  })
  expect(r.width, 'value=60 驱动条宽 60%').toBe('60%')
  expect(r.now, 'aria-valuenow 同步 60').toBe('60')
  expect(r.max, 'aria-valuemax 保持 100').toBe('100')
  expect(r.text, '百分比文本同步').toContain('60%')
})

test('progress 同设 value + percent 时 percent 优先；移除 percent 后回退 value', async ({ page }) => {
  await page.goto('/components/progress.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-progress')
  const r = await page.evaluate(() => {
    const el = document.createElement('oas-progress')
    el.setAttribute('value', '60')
    el.setAttribute('percent', '30')
    document.body.appendChild(el)
    const bar = el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
    const both = bar.style.width
    el.removeAttribute('percent')
    const fallback = bar.style.width
    el.remove()
    return { both, fallback }
  })
  expect(r.both, '两者同设 percent 优先 → 30%').toBe('30%')
  expect(r.fallback, '移除 percent 后回退 value → 60%').toBe('60%')
})
