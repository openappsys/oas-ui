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

// 修复回归：地区必填曾因 fieldOf('region') 返回 null 而静默——错误文案与 aria 标记都不可见，
// 用户只看到「点了保存没反应」
test('address 地区必填：错误文案与 aria-invalid 可见（注入 regions 时）', async ({ page }) => {
  await page.goto('/components/address.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-address')

  const result = await page.evaluate(() => {
    const el = document.createElement('oas-address')
    el.id = 'address-region-probe'
    el.setAttribute('regions', '[{"name":"浙江省","children":[{"name":"杭州市","children":[{"name":"西湖区"}]}]}]')
    document.getElementById('address-validate-demo')!.parentElement!.appendChild(el)
    const root = el.shadowRoot!
    root.querySelector<HTMLInputElement>('input[name="name"]')!.value = '张三'
    root.querySelector<HTMLInputElement>('input[name="phone"]')!.value = '13800000000'
    root.querySelector<HTMLButtonElement>('button[type="submit"]')!.click()
    const error = root.querySelector<HTMLElement>('.region-group > .field > .error')!
    const province = root.querySelector<HTMLSelectElement>('.province')!
    return {
      fieldInvalid: root.querySelector<HTMLElement>('.region-group > .field')!.hasAttribute('data-invalid'),
      errorVisible: !error.hidden && error.textContent.length > 0,
      ariaInvalid: province.getAttribute('aria-invalid'),
      describedBy: province.getAttribute('aria-describedby') === error.id && error.id !== '',
      focused: root.activeElement === province,
    }
  })
  expect(result.fieldInvalid).toBe(true)
  expect(result.errorVisible, '地区必填错误必须可见（曾静默）').toBe(true)
  expect(result.ariaInvalid).toBe('true')
  expect(result.describedBy, 'aria-describedby 必须指向错误文案').toBe(true)
  expect(result.focused, '首个错误字段应获得焦点').toBe(true)
})

test('address 只读态：字段禁编辑但仍可聚焦复制，提交按钮禁用', async ({ page }) => {
  await page.goto('/components/address.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-address')

  const state = await page.evaluate(() => {
    const els = [...document.querySelectorAll<HTMLElement>('oas-address')]
    const ro = els.find((el) => el.hasAttribute('readonly'))!
    const root = ro.shadowRoot!
    const input = root.querySelector<HTMLInputElement>('input[name="name"]')!
    input.focus()
    return {
      disabled: input.disabled,
      focused: root.activeElement === input,
      submitDisabled: root.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled,
      value: input.value.length > 0,
    }
  })
  expect(state.disabled, 'readonly 不置 disabled（仍可聚焦复制）').toBe(false)
  expect(state.focused).toBe(true)
  expect(state.submitDisabled).toBe(true)
  expect(state.value, '只读态应按 value 预填').toBe(true)
})
