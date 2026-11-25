// 复核回归：logistics——折叠真实切换反馈、aria-current 与状态点视觉、reverse 方向、暗色。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('logistics：折叠真点展开全部 + oas-toggle 反馈可见；再点收起回写 collapsed', async ({ page }) => {
  await page.goto('/components/logistics.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#lg-collapse')
  const host = page.locator('#lg-collapse')
  await host.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  // 折叠态：只显示 2 条
  await expect(host.locator('[part="item"]')).toHaveCount(2)
  const toggle = host.locator('[part="toggle"]')
  await expect(toggle).toContainText('展开全部 5 条')
  await toggle.click()
  // 展开：全部 5 条可见 + demo 反馈
  await expect(host.locator('[part="item"]')).toHaveCount(5)
  await expect(page.locator('#lg-collapse-out')).toContainText('已展开全部')
  // attribute 回写（展开态）
  await expect(host).toHaveJSProperty('collapsed', false)
  // 再点收起
  await toggle.click()
  await expect(host.locator('[part="item"]')).toHaveCount(2)
  await expect(page.locator('#lg-collapse-out')).toContainText('已收起')
  await expect(host).toHaveJSProperty('collapsed', true)
})

test('logistics：缺省推导——首条 current（aria-current + 点径更大视觉）其余 done', async ({ page }) => {
  await page.goto('/components/logistics.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-logistics')
  const first = page.locator('oas-logistics').first()
  await first.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  // 语义：首条 aria-current="step"
  await expect(first.locator('[part="item"]').first()).toHaveAttribute('aria-current', 'step')
  await expect(first.locator('[part="item"]').nth(1)).not.toHaveAttribute('aria-current', /.+/)
  // 状态点视觉区分（不只靠颜色）：current 点径 > done 点径
  const dots = await first.evaluate((el) => {
    const items = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')]
    return items.slice(0, 2).map((li) => {
      const dot = li.querySelector<HTMLElement>('.dot')!
      const r = dot.getBoundingClientRect()
      return { state: li.getAttribute('data-state'), size: Math.round(r.width) }
    })
  })
  expect(dots[0]!.state).toBe('current')
  expect(dots[1]!.state).toBe('done')
  expect(dots[0]!.size).toBeGreaterThan(dots[1]!.size)
})

test('logistics：reverse 实例时间正序（首条为最早节点）；暗色下连接线与状态点随主题翻转', async ({ page }) => {
  await page.goto('/components/logistics.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-logistics[reverse]')
  const host = page.locator('oas-logistics[reverse]')
  await host.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  // reverse 后 DOM 首条 = 数据末条（已签收），语义首条（已下单，done）在 DOM 末位
  const firstTitle = await host.evaluate(
    (el) => el.shadowRoot!.querySelector<HTMLElement>('[part="item"]')!.textContent,
  )
  expect(firstTitle).toContain('已签收')
  // aria-current 跟随语义节点（运输中 = 数据第 3 条 → DOM 第 3 位），不在 DOM 末位
  await expect(host.locator('[part="item"]').nth(2)).toHaveAttribute('aria-current', 'step')
  await expect(host.locator('[part="item"]').last()).not.toHaveAttribute('aria-current', /.+/)

  // 暗色：连接线颜色随主题翻转
  const readLineBg = (): Promise<string> =>
    host.evaluate((el) => {
      const item = el.shadowRoot!.querySelector<HTMLElement>('[part="item"]')!
      return getComputedStyle(item, '::before').backgroundColor
    })
  const lightLine = await readLineBg()
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.querySelector('.demo-block__body')!).backgroundColor))
    .toBe('rgb(24, 24, 27)')
  const darkLine = await readLineBg()
  expect(darkLine).not.toBe(lightLine)
  await page.evaluate(() => document.documentElement.classList.remove('dark'))
})
