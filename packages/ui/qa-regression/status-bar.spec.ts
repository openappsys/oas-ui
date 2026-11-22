// 复核回归：status-bar 的 height 覆盖产生真实高度，color 预设/自定义色在 computed style 上可见。
import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('status-bar height 产生真实高度，color 预设与自定义色真的改变前景色', async ({ page }) => {
  await page.goto('/components/status-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-status-bar')

  const read = (sel: string) =>
    page.evaluate((s) => {
      const el = document.querySelector(s) as HTMLElement
      const cs = getComputedStyle(el)
      return { height: el.getBoundingClientRect().height, color: cs.color }
    }, sel)

  const base = await read('oas-status-bar[height="44"]')
  expect(base.height, 'height=44 → 44px').toBeGreaterThan(43)
  expect(base.height).toBeLessThan(46)

  const blue = await read('oas-status-bar[color="blue"]')
  const orange = await read('oas-status-bar[color="orange"]')
  const custom = await read('oas-status-bar[color="var(--oas-color-danger-text)"]')
  expect(blue.color).not.toBe('rgba(0, 0, 0, 0)')
  expect(orange.color).not.toBe(blue.color)
  // 任意 CSS 值（此处为语义 token 变量）原样生效，且与预设色可区分
  expect(custom.color).not.toBe('rgba(0, 0, 0, 0)')
  expect(custom.color).not.toBe(blue.color)
})
