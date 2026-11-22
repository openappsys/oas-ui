// commerce invoice 用户视角回归：已保存抬头弹层可见、选择后表单与页面反馈生效。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('invoice 已保存抬头：弹层打开、选择回填、页面反馈更新', async ({ page }) => {
  await page.goto('/components/invoice.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-invoice#invoice-saved-demo')

  await page.evaluate(() => {
    const el = document.querySelector('oas-invoice#invoice-saved-demo')!
    el.shadowRoot!.querySelector<HTMLButtonElement>('.saved-trigger')!.click()
  })
  const opened = await page.evaluate(() => {
    const el = document.querySelector('oas-invoice#invoice-saved-demo')!
    return {
      visible: !el.shadowRoot!.querySelector<HTMLElement>('.picker')!.hidden,
      expanded: el.shadowRoot!.querySelector('.saved-trigger')!.getAttribute('aria-expanded'),
      options: el.shadowRoot!.querySelectorAll('[role="option"]').length,
    }
  })
  expect(opened.visible).toBe(true)
  expect(opened.expanded).toBe('true')
  expect(opened.options).toBe(3)

  await page.evaluate(() => {
    const el = document.querySelector('oas-invoice#invoice-saved-demo')!
    el.shadowRoot!.querySelectorAll<HTMLElement>('[role="option"]')[0]!.click()
  })
  const picked = await page.evaluate(() => {
    const el = document.querySelector('oas-invoice#invoice-saved-demo')!
    return {
      hidden: el.shadowRoot!.querySelector<HTMLElement>('.picker')!.hidden,
      type: el.getAttribute('type'),
      title: el.shadowRoot!.querySelector<HTMLInputElement>('input[name="title"]')!.value,
      taxId: el.shadowRoot!.querySelector<HTMLInputElement>('input[name="taxId"]')!.value,
      feedback: document.getElementById('invoice-saved-info')!.textContent,
    }
  })
  expect(picked.hidden).toBe(true)
  expect(picked.type).toBe('company')
  expect(picked.title).toBe('杭州示例科技有限公司')
  expect(picked.taxId).toBe('91330100MA2AB1234X')
  expect(picked.feedback).toContain('杭州示例科技有限公司')
})

test('invoice 企业抬头：税号非法时错误可见，修正后提交成功', async ({ page }) => {
  await page.goto('/components/invoice.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-invoice#invoice-company-demo')

  await page.evaluate(() => {
    const el = document.querySelector('oas-invoice#invoice-company-demo')!
    const tax = el.shadowRoot!.querySelector<HTMLInputElement>('input[name="taxId"]')!
    tax.value = '123'
    el.shadowRoot!.querySelector<HTMLButtonElement>('.submit')!.click()
  })
  const invalid = await page.evaluate(() => {
    const el = document.querySelector('oas-invoice#invoice-company-demo')!
    const error = el.shadowRoot!.querySelector<HTMLElement>('.tax-field .error')!
    return {
      visible: !error.hidden && error.textContent!.length > 0,
      feedback: document.getElementById('invoice-company-info')!.textContent,
    }
  })
  expect(invalid.visible).toBe(true)
  expect(invalid.feedback).toContain('taxId')

  await page.evaluate(() => {
    const el = document.querySelector('oas-invoice#invoice-company-demo')!
    el.shadowRoot!.querySelector<HTMLInputElement>('input[name="taxId"]')!.value = '91330100MA2AB1234X'
    el.shadowRoot!.querySelector<HTMLButtonElement>('.submit')!.click()
  })
  const submitted = await page.evaluate(() => document.getElementById('invoice-company-info')!.textContent)
  expect(submitted).toContain('已提交')
})
