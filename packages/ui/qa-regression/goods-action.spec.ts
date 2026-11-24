// 复核回归：goods-action——角标可见、真实点击派发。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('goods-action：角标可见，点击 icon 项派发 oas-action-click', async ({ page }) => {
  await page.goto('/components/goods-action.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-goods-action')

  const bar = page.locator('#ga-basic')
  await expect(bar.locator('[part="badge"]:not([hidden])')).toHaveText('3')
  await bar.locator('[part="icon-button"]').nth(2).click()
  await expect(page.locator('#ga-basic-out')).toContainText('cart')
  await expect(page.locator('#ga-basic-out')).toContainText('icon')

  await bar.locator('[part="button"]').last().click()
  await expect(page.locator('#ga-basic-out')).toContainText('buy')
  await expect(page.locator('#ga-basic-out')).toContainText('button')
})

test('goods-action：loading spinner 是 1em 圆环（修复前为 4px 竖线）；success/warning 实底文字对比度 ≥4.5', async ({
  page,
}) => {
  await page.goto('/components/goods-action.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-goods-action')

  // C2 回归：`.button` 无 flex 布局时 spinner（inline span）1em 尺寸失效 → 4×21 竖线。
  // 真实浏览器几何断言：spinner 宽高均应 ≈1em（font-size-md 14px）
  const spinner = page.locator('oas-goods-action [part="button-spinner"]:not([hidden])').first()
  await expect(spinner).toBeVisible()
  const box = await spinner.boundingBox()
  expect(box?.width, 'spinner 存在且宽 ≈1em 而非 4px').toBeGreaterThan(8)
  expect(box?.height, 'spinner 高应 ≈1em 而非 21px 拉伸').toBeLessThan(30)
  expect(Math.abs((box?.width ?? 0) - (box?.height ?? 0)), 'spinner 应为正圆环').toBeLessThan(3)

  // I5 回归：success/warning 实底压深（color-mix 80%）+ 专用 on-<tone> 文字 token 后，
  // 背景 vs 文字对比度须达 WCAG AA（修复前 3.30 / 3.19）
  const ratios = await page.evaluate(() => {
    const parse = (v: string): [number, number, number] => {
      const m = v.match(/[\d.]+/g)
      return m ? (m.slice(0, 3).map(Number) as [number, number, number]) : [0, 0, 0]
    }
    const lum = ([r, g, b]: [number, number, number]) => {
      const f = (c: number) => {
        c /= 255
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const contrastOf = (btn: Element) => {
      const cs = getComputedStyle(btn)
      const l1 = lum(parse(cs.backgroundColor))
      const l2 = lum(parse(cs.color))
      const hi = Math.max(l1, l2)
      const lo = Math.min(l1, l2)
      return { ratio: (hi + 0.05) / (lo + 0.05), bg: cs.backgroundColor }
    }
    const read = (key: string) => {
      const btn = [...document.querySelectorAll('oas-goods-action')]
        .map((el) => el.shadowRoot!.querySelector(`[part="button"][data-key="${key}"]`))
        .find(Boolean)
      return btn ? contrastOf(btn) : null
    }
    return { success: read('ok'), warning: read('warn') }
  })
  expect(ratios.success?.ratio, 'success 实底对比度').toBeGreaterThanOrEqual(4.5)
  expect(ratios.warning?.ratio, 'warning 实底对比度').toBeGreaterThanOrEqual(4.5)
  // 压深生效：背景不再是 token 原色 success #16a34a / warning #d97706
  expect(ratios.success?.bg).not.toContain('22, 163, 74')
  expect(ratios.warning?.bg).not.toContain('217, 119, 6')
})
