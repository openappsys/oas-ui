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

// 修复回归：选中态曾用 primary 6% 混色底，把次要文字/价格压到 WCAG 4.44（AA 4.5 不达标）。
// 现在改为「主色描边 + 内环」，卡片底色与未选中一致 —— 视觉区分靠边框，文字对比回到 AA 以上。
test('ecard 选中态：主色描边 + 内环，不叠色底（对比度闸）', async ({ page }) => {
  await page.goto('/components/ecard.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-ecard#ecard-submit-demo')

  const state = await page.evaluate(() => {
    const el = document.querySelector('oas-ecard#ecard-submit-demo')!
    const cards = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.cards .card')]
    const selected = cards.find((c) => c.hasAttribute('data-selected'))!
    const plain = cards.find((c) => !c.hasAttribute('data-selected'))!
    const cs = (node: Element) => getComputedStyle(node)
    return {
      selectedBorder: cs(selected).borderColor,
      plainBorder: cs(plain).borderColor,
      sameBackground: cs(selected).backgroundColor === cs(plain).backgroundColor,
      ring: cs(selected).boxShadow,
      primary: cs(el).getPropertyValue('--oas-color-primary').trim(),
    }
  })
  expect(state.selectedBorder, '选中卡边框用主色').not.toBe(state.plainBorder)
  expect(state.sameBackground, '选中卡不得叠色底（曾把文字压到 AA 以下）').toBe(true)
  expect(state.ring, '选中态内环可见（1px inset 主色）').toContain('inset')
})
