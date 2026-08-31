// 复核回归：notification——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('notification 进度条：show-progress 渲染、动画时长与 duration 同步、位于底部', async ({
  page,
}) => {
  await page.goto('/components/notification.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).notification !== 'undefined', null, {
    timeout: 10000,
  })
  await page.locator('.demo-block', { hasText: '带进度条' }).locator('oas-button').first().click()
  await page.waitForFunction(
    () => document.querySelector('oas-notification[show-progress]') != null,
    null,
    { timeout: 5000 },
  )
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-notification[show-progress]')!
    const root = el.shadowRoot!
    const progress = root.querySelector<HTMLElement>('[part="progress"]')!
    const fill = root.querySelector<HTMLElement>('.progress-fill')!
    const box = root.querySelector<HTMLElement>('[part="box"]')!
    const desc = root.querySelector<HTMLElement>('[part="description"]')!
    const p = progress.getBoundingClientRect()
    const b = box.getBoundingClientRect()
    const d = desc.getBoundingClientRect()
    return {
      progressHidden: progress.hidden,
      fillInlineDuration: fill.style.animationDuration, // '5000ms'（demo duration: 5000）
      computedDuration: getComputedStyle(fill).animationDuration,
      animationName: getComputedStyle(fill).animationName,
      belowDescription: p.top >= d.bottom - 1, // 进度条在描述下方
      insideBox: p.bottom <= b.bottom + 1, // 进度条在卡片盒内
      topClass: progress.classList.contains('progress-top'),
    }
  })
  expect(r.progressHidden).toBe(false)
  expect(r.fillInlineDuration).toBe('5000ms')
  expect(r.computedDuration).not.toBe('0s') // 动画真实生效（非 0 时长）
  expect(r.animationName).toContain('oas-notification-progress')
  expect(r.belowDescription).toBe(true)
  expect(r.insideBox).toBe(true)
  expect(r.topClass).toBe(false)
})

test('notification 进度条 progress-position=top：进度条切到描述上方', async ({ page }) => {
  await page.goto('/components/notification.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).notification !== 'undefined', null, {
    timeout: 10000,
  })
  await page.locator('.demo-block', { hasText: '带进度条' }).locator('oas-button').nth(1).click()
  await page.waitForFunction(
    () => document.querySelector('oas-notification[progress-position="top"]') != null,
    null,
    { timeout: 5000 },
  )
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-notification[progress-position="top"]')!
    const root = el.shadowRoot!
    const progress = root.querySelector<HTMLElement>('[part="progress"]')!
    const box = root.querySelector<HTMLElement>('[part="box"]')!
    const titleRow = root.querySelector<HTMLElement>('.title-row')!
    const p = progress.getBoundingClientRect()
    const b = box.getBoundingClientRect()
    const t = titleRow.getBoundingClientRect()
    return {
      topClass: progress.classList.contains('progress-top'),
      aboveTitle: p.bottom <= t.top + 1, // 进度条在标题行上方（卡盒顶部）
      insideBox: p.top >= b.top - 1,
      notHidden: !progress.hidden,
    }
  })
  expect(r.topClass).toBe(true)
  expect(r.aboveTitle).toBe(true)
  expect(r.insideBox).toBe(true)
  expect(r.notHidden).toBe(true)
})

test('notification 长内容可滚动：描述区限高 + overflow-y auto 且真实可滚', async ({ page }) => {
  await page.goto('/components/notification.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).notification !== 'undefined', null, {
    timeout: 10000,
  })
  await page.locator('.demo-block', { hasText: '长内容可滚动' }).locator('oas-button').click()
  await page.waitForFunction(
    () =>
      document
        .querySelector('oas-notification')
        ?.shadowRoot?.querySelector('[part="description"]')
        ?.classList.contains('scrollable') ?? false,
    null,
    { timeout: 5000 },
  )
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-notification')!
    const desc = el.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!
    const cs = getComputedStyle(desc)
    return {
      scrollableClass: desc.classList.contains('scrollable'),
      maxHeight: cs.maxHeight,
      overflowY: cs.overflowY,
      scrollable: desc.scrollHeight > desc.clientHeight, // 内容超长 → 真实可滚
    }
  })
  expect(r.scrollableClass).toBe(true)
  expect(r.maxHeight).not.toBe('none')
  expect(r.overflowY).toBe('auto')
  expect(r.scrollable).toBe(true)
})

// —— calendar P1 补缺：自定义单元格 + 模式切换 ——
// 曾现缺口：日历无法标记节假日/事件点；year 模式选中月份后停留在年视图。
// 本次补 oas-cell-render（detail { date, element }）+ template[slot="cell"] + year 选月自动切回 month。
