// 复核回归：coupon——弹层开合、不可用券禁用、选中派发并关闭。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('coupon：选择弹层可用券可选、不可用券禁用、选中后派发 oas-select 并关闭', async ({ page }) => {
  await page.goto('/components/coupon.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-coupon')

  const host = page.locator('#cp-select')
  await host.locator('[part="trigger"]').click()
  await expect(host.locator('[part="overlay"]')).toBeVisible()

  const options = host.locator('[part="option"]')
  await expect(options).toHaveCount(4)
  await expect(options.nth(2).locator('input')).toBeDisabled()
  await expect(options.nth(3).locator('input')).toBeDisabled()

  await options.first().click()
  await expect(page.locator('#cp-select-out')).toContainText('oas-select')
  await expect(host.locator('[part="overlay"]')).toBeHidden()
  // 已选券面额回显在触发按钮
  await expect(host.locator('[part="trigger"]')).toContainText('30')
})

test('coupon：选中态原位同步——重开弹层选中卡片 data-selected="true" 且边框色可区分（C1 回归）', async ({ page }) => {
  await page.goto('/components/coupon.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cp-select')

  const host = page.locator('#cp-select')
  const overlay = host.locator('[part="overlay"]')
  await host.locator('[part="trigger"]').click()
  await expect(overlay).toBeVisible()
  await host.locator('[part="option"]').first().click()
  await expect(overlay).toBeHidden()

  // 重开：选中卡片必须带 data-selected="true"（回归：同步路径曾写空串，CSS [data-selected='true'] 不命中）
  await host.locator('[part="trigger"]').click()
  await expect(overlay).toBeVisible()
  const states = await page.evaluate(() => {
    const el = document.getElementById('cp-select')!
    return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="coupon"]')].map((c) =>
      c.getAttribute('data-selected'),
    )
  })
  expect(states[0], '已选卡片 data-selected 应为 "true"（非空串；undefined 同样红）').toBe('true')
  expect(
    states.slice(1).some((v) => v === 'true'),
    '其余卡片不应带选中标记',
  ).toBe(false)

  // 选中卡片与未选中卡片边框色可区分（主色描边 vs 中性边框）
  const borders = await page.evaluate(() => {
    const el = document.getElementById('cp-select')!
    const cards = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="coupon"]')]
    return cards.slice(0, 2).map((c) => getComputedStyle(c).borderTopColor)
  })
  expect(borders[0], '选中卡片边框色应区别于未选中').not.toBe(borders[1])
})

// 层叠协议回归：弹层接入共享 overlay-stack（body 滚动锁 + Esc 层栈），不再自建 Esc 处理。
test('coupon 与 oas-modal 同开：一次 Esc 只关最上层（modal 先关、coupon 保持），body 锁按引用计数释放', async ({
  page,
}) => {
  await page.goto('/components/coupon.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cp-select')

  const host = page.locator('#cp-select')
  const overlay = host.locator('[part="overlay"]')
  const bodyOverflow = () => page.evaluate(() => document.body.style.overflow)

  await host.locator('[part="trigger"]').click()
  await expect(overlay).toBeVisible()
  // 打开即锁 body 滚动（跨组件共享引用计数锁）
  expect(await bodyOverflow()).toBe('hidden')

  // 后开 modal：Esc 应先关 modal（层栈后进先出），coupon 弹层不得被同一次 Esc 连带关闭
  await page.evaluate(() => {
    document.getElementById('e2e-cp-modal')?.remove()
    const modal = document.createElement('oas-modal')
    modal.id = 'e2e-cp-modal'
    modal.setAttribute('visible', '')
    modal.innerHTML = '<p>modal</p>'
    document.body.appendChild(modal)
  })
  await page.waitForFunction(() => !!document.querySelector('oas-modal#e2e-cp-modal[visible]'))

  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.querySelector('oas-modal#e2e-cp-modal[visible]'), undefined, {
    timeout: 5000,
  })
  await expect(overlay, 'coupon 弹层此时必须仍然打开').toBeVisible()
  expect(await bodyOverflow(), 'coupon 仍打开时 body 必须保持锁定').toBe('hidden')

  // 再按一次 Esc：coupon 关闭（层栈下一层），锁释放
  await page.keyboard.press('Escape')
  await expect(overlay).toBeHidden()
  await page.waitForFunction(() => document.body.style.overflow !== 'hidden', undefined, { timeout: 5000 })
  await page.evaluate(() => document.getElementById('e2e-cp-modal')?.remove())
})

test('coupon 打开态断开重连：滚动锁与 Esc 层重获，二次断开不遗留', async ({ page }) => {
  await page.goto('/components/coupon.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cp-select')

  const overlay = page.locator('#cp-select [part="overlay"]')
  await page.locator('#cp-select [part="trigger"]').click()
  await expect(overlay).toBeVisible()
  await page.waitForFunction(() => document.body.style.overflow === 'hidden')

  // 打开态摘挂（路由缓存 / 条件渲染）：重连后必须重新持锁，Esc 仍能关闭
  await page.evaluate(() => {
    const el = document.getElementById('cp-select')!
    const parent = el.parentElement!
    el.remove()
    parent.appendChild(el)
  })
  await page.waitForFunction(() => document.body.style.overflow === 'hidden', undefined, { timeout: 5000 })
  await page.keyboard.press('Escape')
  await expect(overlay).toBeHidden()
  await page.waitForFunction(() => document.body.style.overflow !== 'hidden', undefined, { timeout: 5000 })
})
