// 复核回归：radio——同名互斥、组内单选互斥 + oas-change（含 demo 输出反馈）、
// 方向键换项（组 host 层键盘模式）与跳过禁用项、disabled 项不可点。
// demo 选择器：name="demo-basic" / #radio-event / #radio-output / options 组（含"冷链专线"）/ name="radio-item-disabled"。

import { test, expect } from '@playwright/test'
import { up, defocus } from './helpers'

test('radio 同名 name 互斥：选中第二个后第一个取消', async ({ page }) => {
  await page.goto('/components/radio.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-radio')
  await page.evaluate(() => {
    const [, second] = [...document.querySelectorAll('oas-radio[name="demo-basic"]')]
    ;(second!.shadowRoot!.querySelector('input') as HTMLInputElement).click()
  })
  const r = await page.evaluate(() => {
    const [first, second] = [...document.querySelectorAll('oas-radio[name="demo-basic"]')]
    return {
      firstChecked: (first!.shadowRoot!.querySelector('input') as HTMLInputElement).checked,
      firstHostChecked: first!.hasAttribute('checked'),
      secondChecked: (second!.shadowRoot!.querySelector('input') as HTMLInputElement).checked,
      secondHostChecked: second!.hasAttribute('checked'),
    }
  })
  expect(r.secondChecked).toBe(true)
  expect(r.secondHostChecked).toBe(true)
  expect(r.firstChecked, '互斥：前一项原生 input 应取消选中').toBe(false)
  expect(r.firstHostChecked, '互斥：前一项宿主 checked 属性应移除').toBe(false)
})

test('radio 组内点击互斥 + 组 oas-change + demo 输出可见', async ({ page }) => {
  await page.goto('/components/radio.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-radio')
  await page.evaluate(() => {
    ;(window as any).__groupChanges = []
    document.addEventListener('oas-change', (e: Event) => {
      if ((e.target as HTMLElement)?.tagName === 'OAS-RADIO-GROUP') {
        ;(window as any).__groupChanges.push((e as CustomEvent).detail)
      }
    })
    const b = document.querySelector('#radio-event oas-radio[value="b"]')!
    ;(b.shadowRoot!.querySelector('input') as HTMLInputElement).click()
  })
  await page.waitForFunction(() => (window as any).__groupChanges.length > 0, null, { timeout: 5000 })
  const r = await page.evaluate(() => {
    const group = document.getElementById('radio-event')!
    const a = group.querySelector('oas-radio[value="a"]')!
    const b = group.querySelector('oas-radio[value="b"]')!
    return {
      groupDetail: (window as any).__groupChanges[0],
      groupValue: group.getAttribute('value'),
      aChecked: (a.shadowRoot!.querySelector('input') as HTMLInputElement).checked,
      bChecked: (b.shadowRoot!.querySelector('input') as HTMLInputElement).checked,
      output: document.getElementById('radio-output')!.textContent,
    }
  })
  expect(r.groupDetail.value).toBe('b')
  expect(r.groupValue).toBe('b')
  expect(r.bChecked).toBe(true)
  expect(r.aChecked, '互斥：原选中项应取消').toBe(false)
  expect(r.output, 'demo 输出区应显示组值（用户可见反馈）').toBe('oas-change: b')
})

test('radio 键盘方向键换项：ArrowDown/ArrowUp 循环即选中，跳过禁用项', async ({ page }) => {
  await page.goto('/components/radio.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-radio')
  await defocus(page) // 清页面初始焦点：防 target focus 后又被其他 demo 的失焦提交链抢走焦点
  // 组 1（#radio-event，value 初始 a）：ArrowDown 连续换项，焦点与选中同步
  await page.evaluate(() => {
    const a = document.querySelector('#radio-event oas-radio[value="a"]')!
    ;(a.shadowRoot!.querySelector('input') as HTMLInputElement).focus()
  })
  await page.keyboard.press('ArrowDown')
  await page.waitForFunction(() => document.getElementById('radio-event')?.getAttribute('value') === 'b', null, {
    timeout: 5000,
  })
  await page.keyboard.press('ArrowDown')
  await page.waitForFunction(() => document.getElementById('radio-event')?.getAttribute('value') === 'c', null, {
    timeout: 5000,
  })
  const outAfterDown = await page.evaluate(() => document.getElementById('radio-output')!.textContent)
  expect(
    outAfterDown,
    '方向键选中驱动 demo 输出（用户可见反馈；demo 输出为最后一条事件，键盘换项路径 change 后仍有组级 focus 派发覆盖显示）',
  ).toMatch(/^oas-change: c$|^oas-focus/)
  await page.keyboard.press('ArrowUp')
  await page.waitForFunction(() => document.getElementById('radio-event')?.getAttribute('value') === 'b', null, {
    timeout: 5000,
  })
  // 组 2（options 数据通道，含禁用项"冷链专线"，初始 value=stand）：
  // 导航基准是组 value（roving 语义，焦点仅需在组内让 keydown 冒泡）——
  // ArrowDown 从 stand 前进到 expr；再 ArrowDown 越过禁用的 cold 循环回首项 stand。
  const r2 = await page.evaluate(async () => {
    const group = [...document.querySelectorAll('oas-radio-group')].find((g) =>
      (g.getAttribute('options') ?? '').includes('冷链专线'),
    )!
    const items = [...group.shadowRoot!.querySelectorAll('.options oas-radio')]
    const byValue = (v: string) => items.find((i) => i.getAttribute('value') === v)!
    const coldInput = byValue('cold').shadowRoot!.querySelector('input') as HTMLInputElement
    ;(byValue('expr').shadowRoot!.querySelector('input') as HTMLInputElement).focus()
    return { coldDisabled: coldInput.disabled, initValue: group.getAttribute('value') }
  })
  expect(r2.coldDisabled, '禁用项原生 input 应禁用').toBe(true)
  expect(r2.initValue, 'options 组初始 value 应为 stand').toBe('stand')
  await page.keyboard.press('ArrowDown')
  await page.waitForFunction(
    () => {
      const group = [...document.querySelectorAll('oas-radio-group')].find((g) =>
        (g.getAttribute('options') ?? '').includes('冷链专线'),
      )
      return group?.getAttribute('value') === 'expr'
    },
    null,
    { timeout: 5000 },
  )
  await page.keyboard.press('ArrowDown')
  await page.waitForFunction(
    () => {
      const group = [...document.querySelectorAll('oas-radio-group')].find((g) =>
        (g.getAttribute('options') ?? '').includes('冷链专线'),
      )
      return group?.getAttribute('value') === 'stand'
    },
    null,
    { timeout: 5000 },
  )
  const coldStill = await page.evaluate(() => {
    const group = [...document.querySelectorAll('oas-radio-group')].find((g) =>
      (g.getAttribute('options') ?? '').includes('冷链专线'),
    )!
    const cold = [...group.shadowRoot!.querySelectorAll('.options oas-radio')].find(
      (i) => i.getAttribute('value') === 'cold',
    )!
    return (cold.shadowRoot!.querySelector('input') as HTMLInputElement).checked
  })
  expect(coldStill, '禁用项不得被方向键选中').toBe(false)
})

test('radio disabled 项不可点：点击不选中、其余项不受影响', async ({ page }) => {
  await page.goto('/components/radio.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-radio')
  const r = await page.evaluate(() => {
    const byText = (text: string) =>
      [...document.querySelectorAll('oas-radio[name="radio-item-disabled"]')].find((el) =>
        (el.textContent ?? '').includes(text),
      )!
    const optional = byText('可选')
    const disabledItem = byText('已禁用')
    const disabledInput = disabledItem.shadowRoot!.querySelector('input') as HTMLInputElement
    disabledInput.click()
    return {
      disabledNative: disabledInput.disabled,
      disabledChecked: disabledInput.checked,
      optionalChecked: (optional.shadowRoot!.querySelector('input') as HTMLInputElement).checked,
    }
  })
  expect(r.disabledNative, 'disabled 项原生 input 应禁用').toBe(true)
  expect(r.disabledChecked, 'disabled 项点击不得选中').toBe(false)
  expect(r.optionalChecked, '已选中项不受 disabled 项点击影响').toBe(true)
})
