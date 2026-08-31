// 复核回归：button-group——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('button-group 单选选中态可见（primary 字 + 浅底）', async ({ page }) => {
  await page.goto('/components/button-group.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button-group oas-button')
  const r = await page.evaluate(() => {
    const group = document.querySelector('oas-button-group[value]')!
    const sel = [...group.querySelectorAll('oas-button')].find(
      (b) => b.getAttribute('aria-pressed') === 'true',
    )!
    const cs = getComputedStyle(sel.shadowRoot!.querySelector('[part=button]')!)
    return { color: cs.color, bg: cs.backgroundColor }
  })
  expect(r.color).not.toBe('rgb(24, 24, 27)') // 不能与普通按钮同色
  expect(r.bg).not.toBe('rgb(255, 255, 255)')
})

test('button-group 多选点击切换选中态', async ({ page }) => {
  await page.goto('/components/button-group.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button-group[multiple] oas-button')
  const b = page.locator('oas-button-group[multiple] oas-button[value="b"]')
  const before = await b.getAttribute('aria-pressed')
  await b.click()
  await page.waitForFunction(
    () =>
      document
        .querySelector('oas-button-group[multiple] oas-button[value="b"]')
        ?.getAttribute('aria-pressed') !== 'false',
    null,
    { timeout: 5000 },
  )
  const after = await b.getAttribute('aria-pressed')
  expect(after).toBe('true')
  expect(before).toBe('false')
})

test('button-group 纵向布局生效 + 圆角合并', async ({ page }) => {
  await page.goto('/components/button-group.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button-group[vertical] oas-button')
  const r = await page.evaluate(() => {
    const group = document.querySelector('oas-button-group[vertical]')!
    const inner = group.shadowRoot!.querySelector('[part=group]')!
    const cs = getComputedStyle(inner)
    const btns = [...group.querySelectorAll('oas-button')]
    const boxes = btns.map((b) => b.getBoundingClientRect())
    const radii = btns.map((b) => {
      const c = getComputedStyle(b.shadowRoot!.querySelector('[part=button]')!)
      return `${c.borderTopLeftRadius},${c.borderTopRightRadius},${c.borderBottomRightRadius},${c.borderBottomLeftRadius}`
    })
    return {
      flexDirection: cs.flexDirection,
      stackedVertically: boxes[1]!.y > boxes[0]!.y && boxes[1]!.x === boxes[0]!.x,
      radii,
    }
  })
  expect(r.flexDirection).toBe('column')
  expect(r.stackedVertically).toBe(true)
  expect(r.radii[0]).toBe('6px,6px,0px,0px') // 首：上圆角
  expect(r.radii[1]).toBe('0px,0px,0px,0px') // 中：直角
  expect(r.radii[2]).toBe('0px,0px,6px,6px') // 尾：下圆角
})

test('button-group 横向圆角合并', async ({ page }) => {
  await page.goto('/components/button-group.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button-group oas-button')
  const r = await page.evaluate(() => {
    const group = document.querySelector('oas-button-group')!
    return [...group.querySelectorAll('oas-button')].map((b) => {
      const c = getComputedStyle(b.shadowRoot!.querySelector('[part=button]')!)
      return `${c.borderTopLeftRadius},${c.borderTopRightRadius}`
    })
  })
  expect(r[0]).toBe('6px,0px')
  expect(r[1]).toBe('0px,0px')
  expect(r[2]).toBe('0px,6px')
})

test('button-group 有色组：分段缝常驻可见（非首按钮带 1px 半透明白缝，首按钮无）', async ({
  page,
}) => {
  // 曾现缺陷：primary 等有色实心组静止时无缝合线，三段融成一整个按钮，
  // 「多选一」结构不可发现。修复：非首按钮宿主外侧 box-shadow 画 1px 白缝。
  await page.goto('/components/button-group.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button-group[type="primary"] oas-button')
  const r = await page.evaluate(() => {
    const g = document.querySelector('oas-button-group[type="primary"]')!
    return [...g.querySelectorAll('oas-button')].map((b) => getComputedStyle(b).boxShadow)
  })
  expect(r[0], '首按钮不应有缝').toBe('none')
  expect(r[1], '非首按钮应有 1px 半透明白缝').toContain('rgba(255, 255, 255, 0.35)')
  expect(r[2]).toContain('rgba(255, 255, 255, 0.35)')
  // 默认（白底）组不受影响：按钮自带灰色边框，不画白缝
  const defaultSeams = await page.evaluate(() => {
    const g = document.querySelector('oas-button-group:not([type])')!
    return [...g.querySelectorAll('oas-button')].map((b) => getComputedStyle(b).boxShadow)
  })
  expect(
    defaultSeams.every((s) => s === 'none'),
    '默认组不应画白缝',
  ).toBe(true)
})
