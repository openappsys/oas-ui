// commerce address 用户视角回归：选择地址 / 表单校验必须有可见反馈。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('address 列表选择：选中态迁移 + 页面反馈文案更新', async ({ page }) => {
  await page.goto('/components/address.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-address#address-list-demo')

  const before = await page.evaluate(() => {
    const el = document.querySelector('oas-address#address-list-demo')!
    const cards = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.card')]
    return cards.map((c) => c.hasAttribute('data-selected'))
  })
  expect(before).toEqual([true, false])

  await page.evaluate(() => {
    const el = document.querySelector('oas-address#address-list-demo')!
    const cards = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.card')]
    cards[1]!.querySelector<HTMLInputElement>('input')!.click()
  })

  const after = await page.evaluate(() => {
    const el = document.querySelector('oas-address#address-list-demo')!
    const cards = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.card')]
    return {
      selected: cards.map((c) => c.hasAttribute('data-selected')),
      checked: cards.map((c) => c.querySelector<HTMLInputElement>('input')!.checked),
      feedback: document.getElementById('address-list-info')!.textContent,
    }
  })
  expect(after.selected).toEqual([false, true])
  expect(after.checked).toEqual([false, true])
  expect(after.feedback).toContain('a2')
})

test('address 表单校验：失败时错误可见、成功时提交反馈可见', async ({ page }) => {
  await page.goto('/components/address.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-address#address-validate-demo')

  await page.evaluate(() => {
    const el = document.querySelector('oas-address#address-validate-demo')!
    el.shadowRoot!.querySelector<HTMLButtonElement>('button[type="submit"]')!.click()
  })
  const invalid = await page.evaluate(() => {
    const el = document.querySelector('oas-address#address-validate-demo')!
    const error = el.shadowRoot!.querySelector<HTMLElement>('.contact-group .error')!
    return {
      visible: !error.hidden && error.textContent!.length > 0,
      ariaInvalid: el.shadowRoot!.querySelector<HTMLInputElement>('input[name="name"]')!.getAttribute('aria-invalid'),
      feedback: document.getElementById('address-validate-info')!.textContent,
    }
  })
  expect(invalid.visible).toBe(true)
  expect(invalid.ariaInvalid).toBe('true')
  expect(invalid.feedback).toContain('name')

  await page.evaluate(() => {
    const el = document.querySelector('oas-address#address-validate-demo')!
    const root = el.shadowRoot!
    root.querySelector<HTMLInputElement>('input[name="name"]')!.value = '张三'
    const phone = root.querySelector<HTMLInputElement>('input[name="phone"]')!
    phone.value = '13800000000'
    phone.dispatchEvent(new Event('input', { bubbles: true }))
    root.querySelector<HTMLButtonElement>('button[type="submit"]')!.click()
  })
  const submitted = await page.evaluate(() => document.getElementById('address-validate-info')!.textContent)
  expect(submitted).toContain('校验通过')
})
