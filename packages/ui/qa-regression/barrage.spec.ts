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

test('barrage 点击弹幕派发 oas-item-click（暂停后点，目标位置固定）', async ({ page }) => {
  await page.goto('/components/barrage.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#bg-demo')

  const demo = page.locator('#bg-demo')
  const output = page.locator('#bg-output')
  await page.click('#bg-add')
  await expect(demo.locator('.item')).toHaveCount(1)
  // 冻结动画：漂移中的弹幕点击目标不稳定（demo 自己也有暂停按钮）
  await page.click('#bg-pause')
  await demo.locator('.item').first().click()
  await expect(output).toHaveText(/oas-item-click/)
})

test('barrage RTL：镜像关键帧生效，弹幕自舞台左侧进场', async ({ page }) => {
  await page.goto('/components/barrage.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#bg-rtl')

  const rtl = page.locator('#bg-rtl')
  // dir="rtl" 祖先 → data-rtl 由 update 同步（镜像样式只在 :host([data-rtl]) 下生效）
  await expect(rtl).toHaveAttribute('data-rtl', '')
  await page.click('#bg-rtl-add')
  await expect(rtl.locator('.item')).toHaveCount(1)

  const geom = await rtl.evaluate((el) => {
    const root = (el as HTMLElement).shadowRoot!
    const item = root.querySelector('.item') as HTMLElement
    const stage = root.querySelector('.stage') as HTMLElement
    return {
      name: getComputedStyle(item).animationName,
      itemRight: item.getBoundingClientRect().right,
      stageLeft: stage.getBoundingClientRect().left,
    }
  })
  // LTR 是 oas-barrage-move（负向平移）；RTL 必须换成镜像关键帧，否则弹幕整条飞在舞台左侧外
  expect(geom.name).toBe('oas-barrage-move-rtl')
  // 进场起点贴舞台左缘外侧（若沿用 LTR 起点会在右缘外侧，差值约一个舞台宽）
  expect(Math.abs(geom.itemRight - geom.stageLeft)).toBeLessThan(3)
})
