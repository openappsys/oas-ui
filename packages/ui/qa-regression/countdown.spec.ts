// 复核回归：countdown——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('countdown countup 正计时：走时递增、active 暂停冻结、reset() 归零', async ({ page }) => {
  // 定夺：正计时（type="countup"）与倒计时互补（番茄钟/工时统计方向）——
  // 从 start（默认 0）往上递增、无终止点（不派发 oas-finish）、active 暂停续走不重置、
  // reset() 归位到 start。此处固化 demo 实际走表行为，防止回归成"静态 00:00:00"。
  await page.goto('/components/countdown.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-countdown#countup-active')
  const read = () =>
    page.evaluate(
      () => document.querySelector('oas-countdown#countup-active')!.shadowRoot!
        .querySelector('[part="display"]')!.textContent,
    )
  const first = await read()
  expect(first, '正计时初始为 00:00:00').toBe('00:00:00')
  await page.waitForTimeout(1600)
  const second = await read()
  expect(second, '走时递增（≥1s）').not.toBe('00:00:00')
  expect(Number(second!.split(':')[2]), '秒位已递增').toBeGreaterThanOrEqual(1)

  // active=false 冻结：再走 1.2s 显示不变
  await page.evaluate(() => {
    document.querySelector('oas-countdown#countup-active')!.setAttribute('active', 'false')
  })
  await page.waitForTimeout(300)
  const frozen = await read()
  await page.waitForTimeout(1200)
  expect(await read(), '暂停期间冻结').toBe(frozen)

  // 恢复后续走
  await page.evaluate(() => {
    document.querySelector('oas-countdown#countup-active')!.setAttribute('active', 'true')
  })
  await page.waitForTimeout(1300)
  const resumed = await read()
  expect(resumed, '恢复后续走（秒位前进）').not.toBe(frozen)

  // reset() 归零到 start 重新开始
  await page.click('#countup-reset')
  expect(await read(), 'reset() 归零').toBe('00:00:00')
})

test('countdown countup 正计时：dark 主题下显示与 light 一致可读', async ({ page }) => {
  // 颜色只走 CSS 变量 token（含暗色变体）：dark 下显示值应随 --oas-color-text-primary 翻转
  await page.goto('/components/countdown.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-countdown#countup-active')
  const readColor = () =>
    page.evaluate(() => {
      const display = document.querySelector('oas-countdown#countup-active')!.shadowRoot!
        .querySelector('[part="display"]')!
      return getComputedStyle(display).color
    })
  const light = await readColor()
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(300)
  const dark = await readColor()
  expect(light, 'light 下颜色来自 token').not.toBe('')
  expect(dark, 'dark 下颜色翻转（token 暗色变体生效）').not.toBe(light)
})
