// 复核回归：number-keyboard——按键真实点击后的值写回与可见反馈。
//
// 固化点：demo 的键盘按钮必须真点得动（不是只有事件监听注册成功），
// 值写回宿主属性且页面上有可见反馈文案。

import { test, expect } from '@playwright/test'
import { realClick, up } from './helpers'

test('number-keyboard：点击数字键写回 value 并更新 demo 反馈', async ({ page }) => {
  await page.goto('/components/number-keyboard.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#nk-basic')
  await realClick(page, '#nk-basic', '[data-key="1"]')
  await realClick(page, '#nk-basic', '[data-key="2"]')
  const state = await page.evaluate(() => {
    const host = document.querySelector('#nk-basic')!
    const out = document.querySelector('#nk-basic-out')!
    return {
      value: host.getAttribute('value'),
      feedback: out.textContent ?? '',
    }
  })
  expect(state.value).toBe('12')
  expect(state.feedback).toContain('12')
})

test('number-keyboard：车牌布局可从省份面板选省份，删除键回退', async ({ page }) => {
  await page.goto('/components/number-keyboard.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#nk-plate')
  await realClick(page, '#nk-plate', '[data-action="province"]')
  const panelVisible = await page.evaluate(() => {
    const host = document.querySelector('#nk-plate')!
    const panel = host.shadowRoot!.querySelector<HTMLElement>('[part="provinces"]')!
    return panel.hidden === false && panel.querySelectorAll('button').length > 20
  })
  expect(panelVisible).toBe(true)
  await realClick(page, '#nk-plate', '[part="provinces"] [data-province="京"]')
  await realClick(page, '#nk-plate', '[data-action="delete"]')
  const value = await page.getAttribute('#nk-plate', 'value')
  expect(value).toBe('')
})
