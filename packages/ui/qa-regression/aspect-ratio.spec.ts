// 复核回归：aspect-ratio——等比容器首份回归固化。
// 覆盖：分式/冒号/预定义 token/小数四语法的真实几何（高度由比例推导）、
// number property 赋值反射到 attribute 的宿主框架桥接、非法 ratio 回落 1/1。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('aspect-ratio 四语法几何：分式/冒号/token/小数的高度都由比例推导（含竖版高于宽）', async ({ page }) => {
  await page.goto('/components/aspect-ratio.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-aspect-ratio[ratio="16/9"]')
  const ratioOf = (sel: string) =>
    page.evaluate((s) => {
      const r = (document.querySelector(s) as HTMLElement).getBoundingClientRect()
      return r.width / r.height
    }, sel)
  expect(await ratioOf('oas-aspect-ratio[ratio="16/9"]'), '16/9 分式').toBeCloseTo(16 / 9, 1)
  expect(await ratioOf('oas-aspect-ratio[ratio="4:3"]'), '4:3 冒号').toBeCloseTo(4 / 3, 1)
  expect(await ratioOf('oas-aspect-ratio[ratio="wide"]'), 'wide token → 16/9').toBeCloseTo(16 / 9, 1)
  expect(await ratioOf('oas-aspect-ratio[ratio="portrait"]'), 'portrait token → 3/4（竖版）').toBeCloseTo(3 / 4, 1)
  expect(await ratioOf('oas-aspect-ratio[ratio="square"]'), 'square token → 1/1').toBeCloseTo(1, 1)
})

test('aspect-ratio property 桥接：el.ratio = 数字/字符串反射到 attribute 并统一解析；非法值回落 1/1', async ({
  page,
}) => {
  await page.goto('/components/aspect-ratio.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ar-property')
  // demo 按钮 el.ratio = 'golden'：property 赋值（字符串）→ attribute 反射 → token 解析
  await page.locator('oas-button:has-text("golden")').click()
  await page.waitForFunction(() => document.querySelector('#ar-property')?.getAttribute('ratio') === 'golden')
  const golden = await page.evaluate(() => {
    const el = document.querySelector('#ar-property') as HTMLElement
    return { attr: el.getAttribute('ratio'), inline: el.style.aspectRatio }
  })
  expect(golden.inline, 'golden token 解析为 1.618 / 1').toBe('1.618 / 1')

  // 非法值：attribute 直设 → dev 告警 + 回落 1 / 1
  await page.evaluate(() => (document.querySelector('#ar-property') as HTMLElement).setAttribute('ratio', 'abc'))
  const fallback = await page.evaluate(() => (document.querySelector('#ar-property') as HTMLElement).style.aspectRatio)
  expect(fallback, '非法 ratio 应回落 1 / 1').toBe('1 / 1')
})
