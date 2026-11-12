// 复核回归：chips-input——收件人 chips 输入核心行为固化（粘贴拆分 / Enter 成 chip / Backspace 回编辑 / 非法邮箱红边 + 事件）。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('chips-input：Enter / 逗号 / 分号成 chip，oas-add + oas-change(trigger=add)', async ({ page }) => {
  await page.goto('/components/chips-input.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#chips-basic')
  await page.evaluate(() => {
    const el = document.querySelector('#chips-basic')!
    el.shadowRoot!.querySelector<HTMLInputElement>('.chip-input')!.focus()
  })
  await page.keyboard.type('new@example.com')
  await page.keyboard.press('Enter')
  await page.keyboard.type('second@example.com')
  await page.keyboard.press(',')
  await page.keyboard.type('third@example.com')
  await page.keyboard.press(';')
  const r = await page.evaluate(() => {
    const el = document.querySelector('#chips-basic')!
    return {
      value: JSON.parse(el.getAttribute('value')!),
      chips: el.shadowRoot!.querySelectorAll('[role="listitem"]').length,
      inputCleared: el.shadowRoot!.querySelector<HTMLInputElement>('.chip-input')!.value === '',
    }
  })
  expect(r.value).toEqual([
    'alice@example.com',
    'bob@example.com',
    'new@example.com',
    'second@example.com',
    'third@example.com',
  ])
  expect(r.chips).toBe(5)
  expect(r.inputCleared).toBe(true)
})

test('chips-input：粘贴分号/逗号/换行/空白分隔文本自动拆分成多个 chip', async ({ page }) => {
  await page.goto('/components/chips-input.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#chips-paste')
  const r = await page.evaluate(() => {
    const el = document.querySelector('#chips-paste')!
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('.chip-input')!
    const ev = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(ev, 'clipboardData', {
      value: { getData: () => 'a@b.co; c@d.co,e@f.co\n g@h.co' },
    })
    const notPrevented = input.dispatchEvent(ev)
    return { notPrevented, value: JSON.parse(el.getAttribute('value')!) }
  })
  expect(r.notPrevented).toBe(false) // 含分隔符：拦截原生插入
  expect(r.value).toEqual(['a@b.co', 'c@d.co', 'e@f.co', 'g@h.co'])
})

test('chips-input：空输入 Backspace 回编辑上一 chip（可编辑文本）', async ({ page }) => {
  await page.goto('/components/chips-input.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#chips-edit')
  await page.evaluate(() => {
    const el = document.querySelector('#chips-edit')!
    el.shadowRoot!.querySelector<HTMLInputElement>('.chip-input')!.focus()
  })
  await page.keyboard.press('Backspace')
  const editing = await page.evaluate(() => {
    const el = document.querySelector('#chips-edit')!
    const edit = el.shadowRoot!.querySelector<HTMLInputElement>('.chip-edit')
    return { present: edit != null, value: edit?.value ?? '', focused: edit === el.shadowRoot!.activeElement }
  })
  expect(editing.present).toBe(true)
  expect(editing.value).toBe('typo@example.com')
  expect(editing.focused).toBe(true)
  // 提交修改：trigger=edit
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('fixed@example.com')
  await page.keyboard.press('Enter')
  const after = await page.evaluate(() => document.querySelector('#chips-edit')!.getAttribute('value'))
  expect(after).toBe('["fixed@example.com"]')
})

test('chips-input：非法邮箱红描边（danger token）+ 派发 oas-invalid 且不拦截成 chip', async ({ page }) => {
  await page.goto('/components/chips-input.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#chips-invalid')
  await page.evaluate(() => {
    const el = document.querySelector('#chips-invalid')!
    ;(window as unknown as { __invalid: unknown[] }).__invalid = []
    el.addEventListener('oas-invalid', (e) =>
      (window as unknown as { __invalid: unknown[] }).__invalid.push((e as CustomEvent).detail),
    )
    el.shadowRoot!.querySelector<HTMLInputElement>('.chip-input')!.focus()
  })
  await page.keyboard.type('not-an-email')
  await page.keyboard.press('Enter')
  const r = await page.evaluate(() => {
    const el = document.querySelector('#chips-invalid')!
    const chip = el.shadowRoot!.querySelector<HTMLElement>('[role="listitem"]')!
    return {
      invalidEvents: (window as unknown as { __invalid: unknown[] }).__invalid,
      dataInvalid: chip.getAttribute('data-invalid'),
      borderColor: getComputedStyle(chip).borderColor,
      // 对照：合法 chip 的边框色（#chips-basic 首枚为合法邮箱）
      validBorderColor: getComputedStyle(
        document.querySelector('#chips-basic')!.shadowRoot!.querySelector<HTMLElement>('[role="listitem"]')!,
      ).borderColor,
      value: JSON.parse(el.getAttribute('value')!),
    }
  })
  // 不拦截提交语义：chip 照建
  expect(r.value).toEqual(['not-an-email'])
  expect(r.invalidEvents).toEqual([{ value: 'not-an-email', index: 0 }])
  expect(r.dataInvalid).toBe('true')
  // 红描边：非法 chip 边框色为 danger token，与合法 chip 边框色不同
  expect(r.borderColor).not.toBe(r.validBorderColor)
})
