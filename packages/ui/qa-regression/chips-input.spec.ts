// 复核回归：chips-input——收件人 chips 输入核心行为固化（粘贴拆分 / Enter 成 chip / Backspace 回编辑 / 非法邮箱红边 + 事件）。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

/** 组件自身告警收集（浏览器级 warning 非组件缺陷，只收 error 与 [oas- 前缀 warning） */
function watchConsole(page: import('@playwright/test').Page): string[] {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' || (msg.type() === 'warning' && /^\[oas-/.test(msg.text()))) errors.push(msg.text())
  })
  page.on('pageerror', (e) => errors.push(String(e)))
  return errors
}

test('chips-input：Enter / 逗号 / 分号成 chip，oas-add + oas-change(trigger=add)', async ({ page }) => {
  const errors = watchConsole(page)
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
  expect(errors, `console 应零告警，实际：${errors.join(' | ')}`).toEqual([])
})

test('chips-input：粘贴分号/逗号/换行/空白分隔文本自动拆分成多个 chip', async ({ page }) => {
  const errors = watchConsole(page)
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
  expect(errors, `console 应零告警，实际：${errors.join(' | ')}`).toEqual([])
})

test('chips-input：空输入 Backspace 回编辑上一 chip（可编辑文本）', async ({ page }) => {
  const errors = watchConsole(page)
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
  expect(errors, `console 应零告警，实际：${errors.join(' | ')}`).toEqual([])
})

test('chips-input：非法邮箱红描边（danger token）+ 派发 oas-invalid 且不拦截成 chip', async ({ page }) => {
  const errors = watchConsole(page)
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
  expect(errors, `console 应零告警，实际：${errors.join(' | ')}`).toEqual([])
})

test('chips-input × oas-form：name 收集声明式初值，Enter 成 chip 回写后提交值同步（console 零告警）', async ({
  page,
}) => {
  const errors = watchConsole(page)
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-form')

  // 注入表单实例（chips-input 走 value JSON 数组串通道，注册进 oas-form 收集链）
  await page.evaluate(() => {
    const form = document.createElement('oas-form')
    form.id = 'form-chips-e2e'
    form.innerHTML = `<oas-chips-input name="to" value='["a@b.co"]'></oas-chips-input>`
    // 注入主内容流（.vp-doc）而非 body 末尾：body 直系子元素不受内容区左边距约束，
    // 渲染在视口左缘会被固定定位的侧边栏盖住（kanban 同款先例）
    ;(document.querySelector('.vp-doc') ?? document.body).appendChild(form)
  })
  await up(page, '#form-chips-e2e oas-chips-input')

  // 真实键盘输入成 chip → 组件回写 value 属性 → 表单经 name 收集
  await page.evaluate(() => {
    document
      .querySelector('#form-chips-e2e oas-chips-input')!
      .shadowRoot!.querySelector<HTMLInputElement>('.chip-input')!
      .focus()
  })
  await page.keyboard.type('new@example.com')
  await page.keyboard.press('Enter')

  const r = await page.evaluate(() => {
    const form = document.querySelector('#form-chips-e2e')!
    let detail: { values: Record<string, string> } | null = null
    form.addEventListener('oas-submit', (e) => (detail = (e as CustomEvent).detail))
    ;(form as unknown as { submit(): void }).submit()
    // 监听器回调内的赋值 TS 控制流跟踪不到，需显式 widen 再读
    const values = (detail as { values: Record<string, string> } | null)?.values ?? null
    return { values }
  })
  expect(r.values, '提交值收集 chips-input 的 value JSON 串（含交互新增 chip）').toEqual({
    to: '["a@b.co","new@example.com"]',
  })
  expect(errors, `console 应零告警，实际：${errors.join(' | ')}`).toEqual([])
})
