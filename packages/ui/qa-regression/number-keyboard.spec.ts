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

test('number-keyboard：长按删除键起连删（间隔递减），释放停止且收尾 click 不多删', async ({ page }) => {
  await page.goto('/components/number-keyboard.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#nk-wired')
  // 先键入 4 位（真实点击）
  for (const k of ['7', '8', '9', '3']) {
    await realClick(page, '#nk-wired', `[data-key="${k}"]`)
  }
  const before = await page.getAttribute('#nk-wired', 'value')
  expect(before).toBe('7893')

  // 真实长按：按下 → 保持 900ms（首删 400ms + 300ms 二删 + 200ms 三删）→ 释放
  const delBox = await page.evaluate(() => {
    const host = document.querySelector('#nk-wired')!
    const del = host.shadowRoot!.querySelector<HTMLElement>('[data-action="delete"]')!
    const r = del.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  })
  await page.mouse.move(delBox.x, delBox.y)
  await page.mouse.down()
  // 轮询首删到位（长按 400ms 起删），不写固定等待
  await page.waitForFunction(
    () => ((document.querySelector('#nk-wired')?.getAttribute('value') ?? '') as string).length <= 3,
    { timeout: 5000, polling: 50 },
  )
  const duringHold = await page.getAttribute('#nk-wired', 'value')
  await page.mouse.up()
  // 收尾 click：真实浏览器 pointerup 后派发 click，不得再多删一次
  const afterRelease = await page.getAttribute('#nk-wired', 'value')
  expect(duringHold, '长按起删（7893 → 789）').toBe('789')
  expect(afterRelease, '释放后收尾 click 不再多删').toBe('789')
  // 再单击一次正常删除（789 → 78）
  await realClick(page, '#nk-wired', '[data-action="delete"]')
  expect(await page.getAttribute('#nk-wired', 'value')).toBe('78')
})
