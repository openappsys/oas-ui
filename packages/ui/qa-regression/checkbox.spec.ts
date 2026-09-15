// 复核回归：checkbox——点击切换 checked + oas-change（单项/组两级）、disabled/readonly 不可切换、
// checkbox-group max 达上限拦截并派发 oas-exceed-limit。demo 选择器：#cbg-event / #cbg-max / #cbg-limit-out。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('checkbox 点击切换 checked 并派发 oas-change（单项 + 组两级、demo 输出可见）', async ({ page }) => {
  await page.goto('/components/checkbox.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-checkbox')
  await page.evaluate(() => {
    ;(window as any).__itemChanges = []
    ;(window as any).__groupChanges = []
    document.addEventListener('oas-change', (e: Event) => {
      const ce = e as CustomEvent
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'OAS-CHECKBOX') (window as any).__itemChanges.push(ce.detail)
      if (tag === 'OAS-CHECKBOX-GROUP') (window as any).__groupChanges.push(ce.detail)
    })
    const item = document.querySelector('#cbg-event oas-checkbox[value="b"]')!
    ;(item.shadowRoot!.querySelector('input') as HTMLInputElement).click()
  })
  await page.waitForFunction(() => (window as any).__groupChanges.length > 0, null, { timeout: 5000 })
  let r: Record<string, any> = await page.evaluate(() => {
    const item = document.querySelector('#cbg-event oas-checkbox[value="b"]')!
    const group = document.getElementById('cbg-event')!
    return {
      itemDetail: (window as any).__itemChanges[0],
      groupDetail: (window as any).__groupChanges[0],
      inputChecked: (item.shadowRoot!.querySelector('input') as HTMLInputElement).checked,
      hostChecked: item.hasAttribute('checked'),
      groupValue: JSON.parse(group.getAttribute('value') ?? '[]'),
      output: document.getElementById('cbg-output')!.textContent,
    }
  })
  expect(r.itemDetail).toEqual({ checked: true, value: 'b' })
  expect(r.groupDetail.value).toEqual(['a', 'b'])
  expect(r.inputChecked).toBe(true)
  expect(r.hostChecked).toBe(true)
  expect(r.groupValue).toEqual(['a', 'b'])
  expect(r.output, 'demo 输出区应显示组值变化（用户可见反馈）').toBe('oas-change: [a, b]')
  // 再点一次取消：两级事件同样派发
  await page.evaluate(() => {
    ;(window as any).__itemChanges = []
    ;(window as any).__groupChanges = []
    const item = document.querySelector('#cbg-event oas-checkbox[value="b"]')!
    ;(item.shadowRoot!.querySelector('input') as HTMLInputElement).click()
  })
  await page.waitForFunction(() => (window as any).__groupChanges.length > 0, null, { timeout: 5000 })
  r = await page.evaluate(() => {
    const item = document.querySelector('#cbg-event oas-checkbox[value="b"]')!
    const group = document.getElementById('cbg-event')!
    return {
      itemDetail: (window as any).__itemChanges[0],
      inputChecked: (item.shadowRoot!.querySelector('input') as HTMLInputElement).checked,
      hostChecked: item.hasAttribute('checked'),
      groupValue: JSON.parse(group.getAttribute('value') ?? '[]'),
    }
  })
  expect(r.itemDetail).toEqual({ checked: false, value: 'b' })
  expect(r.inputChecked).toBe(false)
  expect(r.hostChecked).toBe(false)
  expect(r.groupValue).toEqual(['a'])
})

test('checkbox disabled 不可点、readonly 可聚焦但不切换', async ({ page }) => {
  await page.goto('/components/checkbox.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-checkbox')
  const r = await page.evaluate(() => {
    const byText = (text: string) =>
      [...document.querySelectorAll('oas-checkbox')].find((el) => (el.textContent ?? '').includes(text))!
    const disabledUnchecked = byText('未选且禁用')
    const disabledChecked = byText('已选且禁用')
    const readonlyUnchecked = byText('只读未勾选')
    // 点击前快照
    const before = {
      disabledInput: disabledUnchecked.shadowRoot!.querySelector('input') as HTMLInputElement,
      disabledCheckedInput: disabledChecked.shadowRoot!.querySelector('input') as HTMLInputElement,
      readonlyInput: readonlyUnchecked.shadowRoot!.querySelector('input') as HTMLInputElement,
    }
    disabledUnchecked.shadowRoot!.querySelector<HTMLInputElement>('input')!.click()
    disabledChecked.shadowRoot!.querySelector<HTMLInputElement>('input')!.click()
    readonlyUnchecked.shadowRoot!.querySelector<HTMLInputElement>('input')!.click()
    // readonly 可聚焦（focus 委托到 shadow 内原生 input）
    before.readonlyInput.focus()
    return {
      disabledNative: before.disabledInput.disabled,
      disabledUncheckedChanged: before.disabledInput.checked,
      disabledCheckedChanged: before.disabledCheckedInput.checked,
      readonlyAria: before.readonlyInput.getAttribute('aria-readonly'),
      readonlyChanged: before.readonlyInput.checked,
      readonlyFocused: readonlyUnchecked.shadowRoot!.activeElement === before.readonlyInput,
    }
  })
  expect(r.disabledNative, 'disabled 子项原生 input 应禁用').toBe(true)
  expect(r.disabledUncheckedChanged, 'disabled 未选项点击不得切换').toBe(false)
  expect(r.disabledCheckedChanged, 'disabled 已选项点击不得取消').toBe(true)
  expect(r.readonlyAria).toBe('true')
  expect(r.readonlyChanged, 'readonly 点击不得切换').toBe(false)
  expect(r.readonlyFocused, 'readonly 可聚焦（表单语义分立）').toBe(true)
})

test('checkbox-group max 达上限：未选项拦截 + oas-exceed-limit + demo 提示 + 已选项可取消解锁', async ({ page }) => {
  await page.goto('/components/checkbox.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-checkbox')
  await page.evaluate(() => {
    ;(window as any).__exceeds = []
    document.addEventListener('oas-exceed-limit', (e: Event) => {
      ;(window as any).__exceeds.push((e as CustomEvent).detail)
    })
    // 选中 b（value ["a"] → ["a","b"]，到达 max=2）
    const b = document.querySelector('#cbg-max oas-checkbox[value="b"]')!
    ;(b.shadowRoot!.querySelector('input') as HTMLInputElement).click()
  })
  await page.waitForFunction(
    () => (document.getElementById('cbg-max')?.getAttribute('value') ?? '').includes('"b"'),
    null,
    { timeout: 5000 },
  )
  // 越界点 c：拦截 + 派发 oas-exceed-limit
  await page.evaluate(() => {
    const c = document.querySelector('#cbg-max oas-checkbox[value="c"]')!
    ;(c.shadowRoot!.querySelector('input') as HTMLInputElement).click()
  })
  await page.waitForFunction(() => (window as any).__exceeds.length > 0, null, { timeout: 5000 })
  let r: Record<string, any> = await page.evaluate(() => {
    const group = document.getElementById('cbg-max')!
    const c = group.querySelector('oas-checkbox[value="c"]')!
    return {
      exceedDetail: (window as any).__exceeds[0],
      cChecked: (c.shadowRoot!.querySelector('input') as HTMLInputElement).checked,
      cBlocked: c.hasAttribute('data-limit-blocked'),
      groupValue: JSON.parse(group.getAttribute('value') ?? '[]'),
      hint: document.getElementById('cbg-limit-out')!.textContent,
    }
  })
  expect(r.exceedDetail).toEqual({ value: 'c', max: 2 })
  expect(r.cChecked, '越界项不得被选中').toBe(false)
  expect(r.cBlocked, '越界项应置灰标记 data-limit-blocked').toBe(true)
  expect(r.groupValue).toEqual(['a', 'b'])
  expect(r.hint, 'demo 提示区应显示上限文案（用户可见反馈）').toContain('已达上限 2')
  // 已选项 b 可取消 → c 解锁
  await page.evaluate(() => {
    const b = document.querySelector('#cbg-max oas-checkbox[value="b"]')!
    ;(b.shadowRoot!.querySelector('input') as HTMLInputElement).click()
  })
  await page.waitForFunction(
    () =>
      !(document.querySelector('#cbg-max oas-checkbox[value="c"]') as HTMLElement)?.hasAttribute('data-limit-blocked'),
    null,
    { timeout: 5000 },
  )
  r = await page.evaluate(() => {
    const group = document.getElementById('cbg-max')!
    const b = group.querySelector('oas-checkbox[value="b"]')!
    return {
      bChecked: (b.shadowRoot!.querySelector('input') as HTMLInputElement).checked,
      groupValue: JSON.parse(group.getAttribute('value') ?? '[]'),
    }
  })
  expect(r.bChecked, '达上限后已选项仍可取消').toBe(false)
  expect(r.groupValue).toEqual(['a'])
})
