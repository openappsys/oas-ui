// 复核回归：theme-editor——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('theme-editor 颜色函数值：rgb() 色板非黑 hex + 文本框编辑写回不破坏原值 + color-mix 色板禁用', async ({
  page,
}) => {
  await page.goto('/components/theme-editor.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#te-fn')
  const r = await page.evaluate(() => {
    const el = document.querySelector('#te-fn') as HTMLElement
    const rowOf = (name: string) =>
      [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="row"]')].find((x) =>
        x.textContent!.includes(name),
      )!
    const rgbRow = rowOf('--demo-color-rgb')
    const mixRow = rowOf('--demo-color-mix')
    const swatch = rgbRow.querySelector<HTMLInputElement>('input[type="color"]')!
    const text = rgbRow.querySelector<HTMLInputElement>('input[type="text"]')!
    const mixSwatch = mixRow.querySelector<HTMLInputElement>('input[type="color"]')!
    const beforeSwatch = swatch.value
    const beforeText = text.value
    text.value = 'rgb(1, 2, 3)'
    text.dispatchEvent(new Event('input', { bubbles: true }))
    return {
      beforeSwatch,
      beforeText,
      written: el.style.getPropertyValue('--demo-color-rgb'),
      afterSwatch: swatch.value,
      mixDisabled: mixSwatch.disabled,
      mixText: mixRow.querySelector<HTMLInputElement>('input[type="text"]')!.value,
    }
  })
  expect(r.beforeSwatch, 'rgb() 值色板应解析为非黑 hex').not.toBe('#000000')
  expect(r.beforeText, '文本框应显示原始函数值').toContain('rgb(')
  expect(r.written, '文本框编辑应写回原函数值').toBe('rgb(1, 2, 3)')
  expect(r.afterSwatch, '写回后色板应同步为非黑 hex').toBe('#010203')
  expect(r.mixDisabled, '含 var() 的 color-mix 值色板应禁用').toBe(true)
  expect(r.mixText, 'color-mix 值文本框应保留原始字符串').toContain('color-mix(')
})

