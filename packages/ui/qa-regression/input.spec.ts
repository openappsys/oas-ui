// 复核回归：input——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('input addon 属性在 Vue demo 中存活并渲染', async ({ page }) => {
  await page.goto('/components/input.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-input[addon-before]')
  const attrs = await page.evaluate(() =>
    [...document.querySelectorAll('oas-input')].map((el) => el.getAttribute('addon-before')),
  )
  expect(attrs.some((v) => v !== null)).toBe(true)
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-input[addon-before]')!
    return el.shadowRoot?.querySelector('[part="prepend"]')?.textContent ?? null
  })
  expect(r).toBe('http://')
})

test('input 内嵌前后缀 slot：空 slot 无 data-slot-*、动态增删同步（flatten fallback 恒真 bug 回归）', async ({
  page,
}) => {
  await page.goto('/components/input.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-input')
  const r = await page.evaluate(async () => {
    const el = document.createElement('oas-input')
    el.setAttribute('placeholder', 'reg-slot')
    document.body.appendChild(el)
    await new Promise((res) => setTimeout(res, 200))
    const shadow = el.shadowRoot!
    const basePadding = getComputedStyle(shadow.querySelector('input')!).paddingRight
    const q = (sel: string) => shadow.querySelector<HTMLElement>(sel)!
    const empty = {
      dataSlotPrefix: el.hasAttribute('data-slot-prefix'),
      dataSlotSuffix: el.hasAttribute('data-slot-suffix'),
      prefixHidden: q('[part="prefix"]').hidden,
      suffixHidden: q('[part="suffix"]').hidden,
    }
    const sp = document.createElement('span')
    sp.textContent = 'S'
    sp.setAttribute('slot', 'suffix')
    el.appendChild(sp)
    await new Promise((res) => setTimeout(res, 200))
    const withSuffix = {
      dataSlotSuffix: el.hasAttribute('data-slot-suffix'),
      suffixHidden: q('[part="suffix"]').hidden,
      paddingRight: getComputedStyle(q('input')).paddingRight,
    }
    el.removeChild(sp)
    await new Promise((res) => setTimeout(res, 200))
    const afterRemove = {
      dataSlotSuffix: el.hasAttribute('data-slot-suffix'),
      suffixHidden: q('[part="suffix"]').hidden,
      paddingRight: getComputedStyle(q('input')).paddingRight,
    }
    el.remove()
    return { basePadding, empty, withSuffix, afterRemove }
  })
  expect(r.empty.dataSlotPrefix).toBe(false)
  expect(r.empty.dataSlotSuffix).toBe(false)
  expect(r.empty.prefixHidden).toBe(true)
  expect(r.empty.suffixHidden).toBe(true)
  expect(r.withSuffix.dataSlotSuffix).toBe(true)
  expect(r.withSuffix.suffixHidden).toBe(false)
  expect(r.withSuffix.paddingRight).not.toBe(r.basePadding)
  expect(r.afterRemove.dataSlotSuffix).toBe(false)
  expect(r.afterRemove.suffixHidden).toBe(true)
  expect(r.afterRemove.paddingRight).toBe(r.basePadding)
})
