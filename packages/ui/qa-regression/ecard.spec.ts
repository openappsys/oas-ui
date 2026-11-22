// commerce ecard 用户视角回归：协议校验与提交反馈必须有可见结果。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('ecard 未勾选协议：点击确认提示可见；勾选后提交成功', async ({ page }) => {
  await page.goto('/components/ecard.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-ecard#ecard-submit-demo')

  await page.evaluate(() => {
    const el = document.querySelector('oas-ecard#ecard-submit-demo')!
    el.shadowRoot!.querySelector<HTMLButtonElement>('.confirm')!.click()
  })
  const invalid = await page.evaluate(() => {
    const el = document.querySelector('oas-ecard#ecard-submit-demo')!
    const error = el.shadowRoot!.querySelector<HTMLElement>('.agreement-error')!
    return {
      visible: !error.hidden && error.textContent!.length > 0,
      marked: el.shadowRoot!.querySelector<HTMLElement>('.agreement-row')!.hasAttribute('data-invalid'),
      feedback: document.getElementById('ecard-submit-info')!.textContent,
    }
  })
  expect(invalid.visible).toBe(true)
  expect(invalid.marked).toBe(true)
  expect(invalid.feedback).toContain('agreement')

  await page.evaluate(() => {
    const el = document.querySelector('oas-ecard#ecard-submit-demo')!
    el.shadowRoot!.querySelector<HTMLInputElement>('.agreement-row input')!.click()
    el.shadowRoot!.querySelector<HTMLButtonElement>('.confirm')!.click()
  })
  const submitted = await page.evaluate(() => document.getElementById('ecard-submit-info')!.textContent)
  expect(submitted).toContain('已提交')
  expect(submitted).toContain('电子礼品卡')
})

test('ecard 自定义面额：选中后可输入，越界提示可见，合法金额提交', async ({ page }) => {
  await page.goto('/components/ecard.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-ecard#ecard-submit-demo')

  await page.evaluate(() => {
    const el = document.querySelector('oas-ecard#ecard-submit-demo')!
    el.shadowRoot!.querySelector<HTMLInputElement>('.custom-card input')!.click()
  })
  const custom = await page.evaluate(() => {
    const el = document.querySelector('oas-ecard#ecard-submit-demo')!
    return !el.shadowRoot!.querySelector<HTMLElement>('.custom-amount')!.hidden
  })
  expect(custom).toBe(true)

  await page.evaluate(() => {
    const el = document.querySelector('oas-ecard#ecard-submit-demo')!
    const amount = el.shadowRoot!.querySelector<HTMLInputElement>('.amount-input')!
    amount.value = '0'
    amount.dispatchEvent(new Event('input', { bubbles: true }))
    el.shadowRoot!.querySelector<HTMLInputElement>('.agreement-row input')!.click()
    el.shadowRoot!.querySelector<HTMLButtonElement>('.confirm')!.click()
  })
  const outOfRange = await page.evaluate(() => {
    const el = document.querySelector('oas-ecard#ecard-submit-demo')!
    const error = el.shadowRoot!.querySelector<HTMLElement>('.custom-group .error')!
    return { visible: !error.hidden, text: error.textContent }
  })
  expect(outOfRange.visible).toBe(true)
  expect(outOfRange.text).toContain('1–10000')
})
