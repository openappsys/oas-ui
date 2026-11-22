// 复核回归：barrage 增删/暂停/清空必须反映到真实 DOM 与动画状态。
import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('barrage 发一条 → 出现；暂停 → 冻结；清空 → 移除', async ({ page }) => {
  await page.goto('/components/barrage.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#bg-demo')

  const demo = page.locator('#bg-demo')
  const items = demo.locator('.item')
  await expect(items).toHaveCount(0)

  await page.click('#bg-add')
  await expect(items).toHaveCount(1)
  // 动画真的在跑（animationName + duration 已写入）
  const anim = await demo.evaluate((el) => {
    const item = (el as HTMLElement).shadowRoot!.querySelector('.item') as HTMLElement
    const cs = getComputedStyle(item)
    return { name: cs.animationName, duration: cs.animationDuration }
  })
  expect(anim.name).toBe('oas-barrage-move')
  // getComputedStyle 的 animation-duration 在浏览器里以秒返回（如 "3.65s"）
  expect(anim.duration.endsWith('s')).toBe(true)
  expect(parseFloat(anim.duration)).toBeGreaterThan(1)

  await page.click('#bg-pause')
  await expect
    .poll(() =>
      demo.evaluate((el) => (el as HTMLElement).shadowRoot!.querySelector('.stage')!.classList.contains('paused')),
    )
    .toBe(true)
  const playState = await demo.evaluate((el) => {
    const item = (el as HTMLElement).shadowRoot!.querySelector('.item') as HTMLElement
    return getComputedStyle(item).animationPlayState
  })
  expect(playState).toBe('paused')
  await expect(items).toHaveCount(1)

  await page.click('#bg-clear')
  await expect(items).toHaveCount(0)
})
