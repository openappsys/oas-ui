// 复核回归：input-number——历史缺陷固化断言。
// 曾现 bug：clearable + controls 并存时步进钮锚定 .inner 右缘而非 input 右缘，
// inner 被 suffix/clear 撑宽后 up 按钮右缘溢出输入框 16px；suffix/clear 本身
// 也被 width:100% 的 input 顶出输入框边框外（渲染在框外、与步进钮互相挤压）。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

/** 读取 shadow 内 input 与叠加元素的相对几何（controls/clear/suffix 以 input 右缘为 0 点，prefix 以 input 左缘为 0 点） */
async function rightStack(page: import('@playwright/test').Page, selector: string) {
  return page.evaluate((sel) => {
    const n = document.querySelector(sel) as HTMLElement
    const sr = n.shadowRoot!
    const ir = sr.querySelector<HTMLElement>('input')!.getBoundingClientRect()
    const rel = (el: HTMLElement | null) => {
      if (!el || el.hidden) return null
      const r = el.getBoundingClientRect()
      return { left: r.left - ir.right, right: r.right - ir.right, top: r.top - ir.top }
    }
    const prefixEl = sr.querySelector<HTMLElement>('[part="prefix"]')
    const pr = prefixEl && !prefixEl.hidden ? prefixEl.getBoundingClientRect() : null
    return {
      inputRight: ir.right,
      inputLeft: ir.left,
      innerRightDelta:
        sr.querySelector<HTMLElement>('[part="inner"]')!.getBoundingClientRect().right - ir.right,
      controls: rel(sr.querySelector<HTMLElement>('[part="controls"]')),
      clear: rel(sr.querySelector<HTMLElement>('[part="clear"]')),
      suffix: rel(sr.querySelector<HTMLElement>('[part="suffix"]')),
      prefix: pr ? { left: pr.left - ir.left, right: pr.right - ir.right } : null,
    }
  }, selector)
}

test('input-number clearable+controls：步进钮完整内嵌（upOverflow ≤ 0）且 inner 与 input 同宽', async ({
  page,
}) => {
  await page.goto('/components/input-number.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#num-event')
  const r = await rightStack(page, '#num-event')
  // 步进钮右缘不得超出 input 右缘（历史溢出 16px）
  expect(r.controls!.right, '步进钮右缘应 ≤ input 右缘').toBeLessThanOrEqual(0)
  expect(r.controls!.left, '步进钮应整体在 input 内').toBeGreaterThan(-1000)
  // 清除钮内嵌且在步进钮左侧
  expect(r.clear!.right, '清除钮右缘应在 input 内').toBeLessThanOrEqual(0)
  expect(r.clear!.right, '清除钮应在步进钮左侧').toBeLessThanOrEqual(r.controls!.left)
  // inner 宽度 == input 宽度（根因：流内后缀曾把 inner 撑得比 input 宽）
  expect(r.innerRightDelta, 'inner 右缘应与 input 右缘齐平').toBeCloseTo(0, 0)
})

test('input-number suffix+controls：后缀内嵌、与步进钮不重叠', async ({ page }) => {
  await page.goto('/components/input-number.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-input-number[suffix]')
  const r = await rightStack(page, 'oas-input-number[suffix]')
  expect(r.suffix!.right, '后缀右缘应在 input 内（历史渲染在框外）').toBeLessThanOrEqual(0)
  expect(
    r.suffix!.right,
    '后缀应完全位于步进钮左侧，不重叠',
  ).toBeLessThanOrEqual(r.controls!.left)
  expect(r.controls!.right, '步进钮右缘应 ≤ input 右缘').toBeLessThanOrEqual(0)
})

test('input-number clearable+suffix+controls 叠加：序排列 步进钮→清除→后缀 全内嵌', async ({
  page,
}) => {
  await page.goto('/components/input-number.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-input-number[suffix="元"]')
  const r = await rightStack(page, 'oas-input-number[suffix="元"]')
  expect(r.controls!.right).toBeLessThanOrEqual(0)
  expect(r.clear!.right).toBeLessThanOrEqual(r.controls!.left)
  expect(r.suffix!.right).toBeLessThanOrEqual(r.clear!.left)
  expect(r.suffix!.left, '后缀整体在 input 内').toBeGreaterThan(-1000)
})

test('input-number both 形态 + clearable：清除钮内嵌且让开右侧 + 钮', async ({ page }) => {
  await page.goto('/components/input-number.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-input-number[controls-position="both"][clearable]')
  const r = await rightStack(page, 'oas-input-number[controls-position="both"][clearable]')
  // [+] 钮在 input 右缘外（both 形态），清除钮必须在 input 内
  expect(r.clear!.right, '清除钮右缘应在 input 内').toBeLessThanOrEqual(0)
  expect(r.clear!.right, '清除钮不得探入 [+] 钮区域').toBeLessThanOrEqual(-4)
  expect(r.prefix!.left, '内嵌 prefix 应位于 input 内').toBeGreaterThanOrEqual(0)
})

test('input-number prefix：内嵌在输入框内（非框外贴边）', async ({ page }) => {
  await page.goto('/components/input-number.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-input-number[prefix]')
  const r = await rightStack(page, 'oas-input-number[prefix]')
  expect(r.prefix!.left, 'prefix 左缘应在 input 左缘之内').toBeGreaterThanOrEqual(0)
  expect(r.prefix!.right, 'prefix 右缘应在 input 内').toBeLessThanOrEqual(0)
})
