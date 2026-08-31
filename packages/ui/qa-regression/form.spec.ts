// 复核回归：form——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('form-item label 点击聚焦 oas-input 的 shadow 内 input（focus 委托链）', async ({ page }) => {
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-form-item[label] oas-input')
  const item = page.locator('oas-form-item[label]').first()
  await item.locator('[part="label"]').click()
  await page.waitForTimeout(100)
  const r = await page.evaluate(() => {
    const item = document.querySelector<HTMLElement>('oas-form-item[label]')!
    const control = item.querySelector('oas-input')
    const inner = control?.shadowRoot?.activeElement
    return {
      hostFocused: document.activeElement === control,
      innerTag: inner?.tagName ?? null,
      sameAsInput: inner === control?.shadowRoot?.querySelector('input'),
    }
  })
  expect(r.hostFocused).toBe(true)
  expect(r.innerTag).toBe('INPUT')
  expect(r.sameAsInput).toBe(true)
})

test('form inline：表单项水平排列（同一行）、label 在控件左侧、空提交必填错误在控件下方', async ({
  page,
}) => {
  // 曾现风险：inline 仅声明属性但无视觉效果（form 未切 flex / form-item 未感知行内）
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-form[inline] oas-form-item oas-input')
  const r = await page.evaluate(() => {
    const form = document.querySelector('#form-inline-login')!
    const formEl = form.shadowRoot!.querySelector('form')!
    const items = [...form.querySelectorAll('oas-form-item')].filter((i) =>
      i.querySelector('oas-input, oas-select'),
    )
    const first = items[0]!
    const second = items[1]!
    const a = first.getBoundingClientRect()
    const b = second.getBoundingClientRect()
    const labelBox = first
      .shadowRoot!.querySelector<HTMLElement>('[part="label"]')!
      .getBoundingClientRect()
    const controlBox = first.querySelector<HTMLElement>('oas-input')!.getBoundingClientRect()
    return {
      flex: getComputedStyle(formEl).display,
      wrap: getComputedStyle(formEl).flexWrap,
      sameRow: Math.abs(a.top - b.top) < 4 && b.left > a.right,
      labelLeftOfControl: labelBox.right <= controlBox.left + 1,
      labelWidth: first
        .shadowRoot!.querySelector<HTMLElement>('[part="label"]')!
        .getBoundingClientRect().width,
    }
  })
  expect(r.flex).toBe('flex')
  expect(r.wrap).toBe('wrap')
  expect(r.sameRow).toBe(true)
  expect(r.labelLeftOfControl).toBe(true)
  expect(r.labelWidth).toBeLessThan(96) // label-width 自动：不加固定 96px 列宽

  // 空表单提交 → 必填错误写入 form-item 错误位（控件下方红字）
  await page.locator('#form-inline-login oas-form-item:last-child oas-button').click()
  await page.waitForFunction(() => {
    const item = document.querySelector('#form-inline-login oas-form-item')
    const err = item?.shadowRoot?.querySelector<HTMLElement>('[part="error"]')
    return err != null && !err.hidden && (err.textContent?.length ?? 0) > 0
  })
  const err = await page.evaluate(() => {
    const item = document.querySelector('#form-inline-login oas-form-item')!
    const err = item.shadowRoot!.querySelector<HTMLElement>('[part="error"]')!
    const input = item.querySelector('oas-input')!.getBoundingClientRect()
    const errBox = err.getBoundingClientRect()
    return {
      text: err.textContent,
      belowInput: errBox.top >= input.bottom - 1,
      labelLeftOfInput:
        item.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!.getBoundingClientRect()
          .right <=
        input.left + 1,
    }
  })
  expect(err.text).toContain('请输入用户名')
  expect(err.belowInput).toBe(true)
  expect(err.labelLeftOfInput).toBe(true)
})
