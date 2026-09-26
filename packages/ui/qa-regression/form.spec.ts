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

test('form inline：表单项水平排列（同一行）、label 在控件左侧、空提交必填错误在控件下方', async ({ page }) => {
  // 曾现风险：inline 仅声明属性但无视觉效果（form 未切 flex / form-item 未感知行内）
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-form[inline] oas-form-item oas-input')
  const r = await page.evaluate(() => {
    const form = document.querySelector('#form-inline-login')!
    const formEl = form.shadowRoot!.querySelector('form')!
    const items = [...form.querySelectorAll('oas-form-item')].filter((i) => i.querySelector('oas-input, oas-select'))
    const first = items[0]!
    const second = items[1]!
    const a = first.getBoundingClientRect()
    const b = second.getBoundingClientRect()
    const labelBox = first.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!.getBoundingClientRect()
    const controlBox = first.querySelector<HTMLElement>('oas-input')!.getBoundingClientRect()
    return {
      flex: getComputedStyle(formEl).display,
      wrap: getComputedStyle(formEl).flexWrap,
      sameRow: Math.abs(a.top - b.top) < 4 && b.left > a.right,
      labelLeftOfControl: labelBox.right <= controlBox.left + 1,
      labelWidth: first.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!.getBoundingClientRect().width,
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
        item.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!.getBoundingClientRect().right <= input.left + 1,
    }
  })
  expect(err.text).toContain('请输入用户名')
  expect(err.belowInput).toBe(true)
  expect(err.labelLeftOfInput).toBe(true)
})

// ---- P2 批次：表级 size / colon / help / status-icon / validate-messages ----

test('form 表级 size：下发 data-form-size 且字段 data-size 镜像；冒号开关 data-colon 即时翻转', async ({ page }) => {
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#form-size-colon oas-checkbox, #form-size-colon oas-input')
  const r1 = await page.evaluate(() => {
    const form = document.getElementById('form-size-colon')!
    const bio = form.querySelector('oas-textarea[name="sc-bio"]')!
    const cbA = form.querySelector('oas-checkbox[name="sc-a"]')!
    const cbB = form.querySelector('oas-checkbox[name="sc-b"]')!
    return {
      bioFormSize: bio.getAttribute('data-form-size'),
      bioSize: bio.getAttribute('data-size'),
      cbAFormSize: cbA.getAttribute('data-form-size'),
      cbASize: cbA.getAttribute('data-size'),
      cbBFormSize: cbB.getAttribute('data-form-size'),
      cbBSize: cbB.getAttribute('data-size'),
    }
  })
  // 表级 large 下发：已接通道的组件拿 large 并镜像 data-size；自身 size=medium 优先于表级
  expect(r1.bioFormSize).toBe('large')
  expect(r1.bioSize).toBe('large')
  expect(r1.cbAFormSize).toBe('large')
  expect(r1.cbASize).toBe('large')
  expect(r1.cbBFormSize).toBe(null)
  expect(r1.cbBSize).toBe('medium')
  // colon 开关：点击后 form-item data-colon 翻转
  const r2 = await page.evaluate(() => {
    const form = document.getElementById('form-size-colon')!
    const item = form.querySelector('oas-form-item')!
    const before = item.hasAttribute('data-colon')
    form.removeAttribute('colon')
    const afterRemove = item.hasAttribute('data-colon')
    form.setAttribute('colon', '')
    const afterSet = item.hasAttribute('data-colon')
    return { before, afterRemove, afterSet }
  })
  expect(r2.before).toBe(true)
  expect(r2.afterRemove).toBe(false)
  expect(r2.afterSet).toBe(true)
})

test('form help + status-icon：帮助文案常驻，提交失败后 danger 图标可见、修正后隐藏', async ({ page }) => {
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#form-help-icon oas-form-item oas-input')
  // 提交空表单：错误文本 + 状态图标出现，help 仍在
  await page.locator('#form-help-icon oas-button[type="primary"]').click()
  await page.waitForFunction(() => {
    const item = document.querySelector('#form-help-icon oas-form-item')!
    const icon = item.shadowRoot!.querySelector('[part="status-icon"]')!
    return icon.hasAttribute('hidden') === false
  })
  const r1 = await page.evaluate(() => {
    const item = document.querySelector('#form-help-icon oas-form-item')!
    const icon = item.shadowRoot!.querySelector<HTMLElement>('[part="status-icon"]')!
    const help = item.shadowRoot!.querySelector<HTMLElement>('[part="help"]')!
    const err = item.shadowRoot!.querySelector<HTMLElement>('[part="error"]')!
    return {
      iconVisible: !icon.hasAttribute('hidden'),
      hasSvg: icon.querySelector('svg') != null,
      helpVisible: !help.hasAttribute('hidden'),
      helpText: help.textContent,
      errText: item.shadowRoot!.querySelector('.error-msg')!.textContent,
    }
  })
  expect(r1.iconVisible).toBe(true)
  expect(r1.hasSvg).toBe(true)
  expect(r1.helpVisible).toBe(true)
  expect(r1.helpText).toBe('用于接收登录验证码')
  expect(r1.errText).toBe('请输入邮箱')
  // 修正后重新提交：图标随错误一起隐藏
  await page.evaluate(() => {
    const input = document.querySelector('#form-help-icon oas-input')!
    input.setAttribute('value', 'user@example.com')
  })
  await page.locator('#form-help-icon oas-button[type="primary"]').click()
  await page.waitForFunction(() => {
    const item = document.querySelector('#form-help-icon oas-form-item')!
    const icon = item.shadowRoot!.querySelector('[part="status-icon"]')!
    return icon.hasAttribute('hidden') === true
  })
})

test('form validate-messages：property 模板覆盖 locale 默认错误文案（可见反馈）', async ({ page }) => {
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#form-vmessages oas-form-item oas-input')
  await page.locator('#form-vmessages oas-button[type="primary"]').click()
  await page.waitForFunction(() => {
    const item = document.querySelector('#form-vmessages oas-form-item')!
    return item.shadowRoot!.querySelector('[part="error"]')!.hasAttribute('hidden') === false
  })
  const msg = await page.evaluate(() => {
    const item = document.querySelector('#form-vmessages oas-form-item')!
    return item.shadowRoot!.querySelector('.error-msg')!.textContent
  })
  expect(msg, 'validate-messages.required 模板应覆盖 locale 默认').toBe('用户名不能为空')
})
