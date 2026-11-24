// 复核回归：submit-bar——真实点击派发与 loading 拦截。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('submit-bar：主按钮真实点击派发 oas-submit，loading 下点击被拦截', async ({ page }) => {
  await page.goto('/components/submit-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-submit-bar')

  const bar = page.locator('#sb-basic')
  await bar.locator('[part="action"]').click()
  await expect(page.locator('#sb-basic-out')).toContainText('oas-submit')
  await expect(page.locator('#sb-basic-out')).toContainText('1299')

  // loading：按钮 disabled + aria-busy，点击不派发
  await page.evaluate(() => {
    const el = document.getElementById('sb-loading')!
    const w = window as unknown as { __sbFired?: number }
    w.__sbFired = 0
    el.addEventListener('oas-submit', () => {
      w.__sbFired = (w.__sbFired ?? 0) + 1
    })
  })
  await page.locator('#sb-loading [part="action"]').click({ force: true })
  const fired = await page.evaluate(() => (window as unknown as { __sbFired?: number }).__sbFired)
  expect(fired).toBe(0)
  await expect(page.locator('#sb-loading [part="action"]')).toHaveAttribute('aria-busy', 'true')
  await expect(page.locator('#sb-loading [part="spinner"]')).toBeVisible()
})

// I3 回归：min-height 曾落在 .row 上（column 布局后整栏高度失控 65px）——归位 .bar 后
// 无 tip 栏高应回到 48–58px 区间；tip 行在场时比无 tip 更高（column 堆叠生效）
test('submit-bar：栏体高度回归修复（min-height 在 .bar）+ 占位块已撤（I3/I4）', async ({ page }) => {
  await page.goto('/components/submit-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-submit-bar')

  const { plainH, tipH } = await page.evaluate(() => {
    const h = (el: Element) => el.getBoundingClientRect().height
    const plain = document.getElementById('sb-basic')!.shadowRoot!.querySelector('[part="bar"]')!
    const tip = [...document.querySelectorAll('oas-submit-bar')]
      .map((el) => el.shadowRoot!.querySelector('[part="tip"]:not([hidden])'))
      .find(Boolean)
    return { plainH: h(plain), tipH: tip ? h(tip.closest('[part="bar"]')!) : 0 }
  })
  // 旧回归值 65px > 58；修复后 = padding 16 + 主行 40 + 边框 1 ≈ 57
  expect(plainH, '无 tip 栏高应在 48–58px（回归时 65px）').toBeGreaterThanOrEqual(48)
  expect(plainH, '无 tip 栏高不应超过 58px').toBeLessThanOrEqual(58)
  expect(tipH, '含 tip 行时栏体更高（column 堆叠生效）').toBeGreaterThan(plainH)

  // I4：占位块已撤——shadow 内无 [part="placeholder"]，demo 页无 placeholder 属性写法
  const probe = await page.evaluate(() => {
    const el = document.querySelector('oas-submit-bar')!
    return {
      hasPart: el.shadowRoot!.querySelector('[part="placeholder"]') != null,
      hasAttrInDemo: document.querySelector('oas-submit-bar[placeholder]') != null,
    }
  })
  expect(probe.hasPart, '占位块应已从 shadow 结构移除').toBe(false)
  expect(probe.hasAttrInDemo, 'demo 不应再写 placeholder 属性').toBe(false)
})
