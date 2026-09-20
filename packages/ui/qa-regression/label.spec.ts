// 复核回归：label——for 点击代理聚焦、必填星号/位置、状态钩子固化断言。

import { test, expect } from '@playwright/test'
import { up, realClick } from './helpers'

test('label for 点击代理聚焦目标控件；required 星号 / position=before / colon 渲染', async ({ page }) => {
  await page.goto('/components/label.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-label')
  const state = await page.evaluate(() => {
    const shadowLabel = (el: Element) => el.shadowRoot!.querySelector('[part="label"]')!
    const req = document.querySelector('oas-label[for="demo-required"]')!
    const before = document.querySelector('oas-label[for="demo-before"]')!
    const colon = [...document.querySelectorAll('oas-label')].find(
      (el) => el.hasAttribute('colon') && !el.hasAttribute('required'),
    )!
    const plain = document.querySelector('oas-label:not([for])')!
    return {
      reqVisible: !req.shadowRoot!.querySelector<HTMLElement>('[part="required"]')!.hidden,
      beforeReverse: shadowLabel(before).classList.contains('reverse'),
      beforeRequiredVisible: !before.shadowRoot!.querySelector<HTMLElement>('[part="required"]')!.hidden,
      colonVisible: !colon.shadowRoot!.querySelector<HTMLElement>('[part="colon"]')!.hidden,
      plainClickable: shadowLabel(plain).classList.contains('clickable'),
      forSynced: shadowLabel(document.querySelector('oas-label[for="demo-input"]')!).getAttribute('for'),
    }
  })
  expect(state.reqVisible, 'required 显示必填星号').toBe(true)
  expect(state.beforeReverse, 'position=before 星号前置（reverse 布局钩子）').toBe(true)
  expect(state.beforeRequiredVisible, '前置星号同样可见').toBe(true)
  expect(state.colonVisible, 'colon 显示冒号').toBe(true)
  expect(state.plainClickable, '无 for 不挂 clickable（点击无代理）').toBe(false)
  expect(state.forSynced, '内部 label for 与宿主属性同步（可访问性关联）').toBe('demo-input')

  // 点击 label → 焦点落到 for 指向的控件（跨 Shadow DOM 手动代理）。
  // 判定：focus 落在宿主 shadow 内层 input 时 document.activeElement 是宿主本身；
  // 深挖后命中宿主或其 shadowRoot 内元素均算聚焦（host.contains 不遍历 shadow，勿用）
  await realClick(page, 'oas-label[for="demo-input"]', '[part="label"]')
  const focusedOk = await page.evaluate(() => {
    const host = document.getElementById('demo-input')
    if (!host) return false
    if (document.activeElement === host) return true
    let ae: HTMLElement | null = document.activeElement as HTMLElement | null
    while (ae?.shadowRoot?.activeElement) ae = ae.shadowRoot.activeElement as HTMLElement
    return ae != null && (ae === host || host.shadowRoot?.contains(ae) === true)
  })
  expect(focusedOk, '点击 label 代理聚焦 #demo-input').toBe(true)
})

test('label error/disabled 状态钩子；点击无 for 的纯文本标签不改变焦点', async ({ page }) => {
  await page.goto('/components/label.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-label')
  const r = await page.evaluate(() => {
    const shadowLabel = (el: Element) => el.shadowRoot!.querySelector('[part="label"]')!
    const err = [...document.querySelectorAll('oas-label')].find((el) => el.hasAttribute('error'))!
    const dis = [...document.querySelectorAll('oas-label')].find((el) => el.hasAttribute('disabled'))!
    return {
      errClass: shadowLabel(err).classList.contains('error'),
      disClass: shadowLabel(dis).classList.contains('disabled'),
    }
  })
  expect(r.errClass, 'error 校验失败红字钩子').toBe(true)
  expect(r.disClass, 'disabled 静态灰化钩子').toBe(true)

  const readActive = () =>
    page.evaluate(() => {
      let ae: HTMLElement | null = document.activeElement as HTMLElement | null
      while (ae?.shadowRoot?.activeElement) ae = ae.shadowRoot.activeElement as HTMLElement
      return ae?.id ?? ae?.tagName ?? 'null'
    })
  const before = await readActive()
  await realClick(page, 'oas-label:not([for])', '[part="label"]')
  const after = await readActive()
  expect(after, '点击无 for 的纯文本标签不改变焦点').toBe(before)
})
