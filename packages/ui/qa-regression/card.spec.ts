// 复核回归：card——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('card clickable：整卡 role/tabindex 存活、点击派发 oas-click 有可见反馈、内部按钮不触发整卡', async ({
  page,
}) => {
  // 曾现风险：clickable 属性被 Vue 剥离、整卡点击静默失败、actions 内按钮误触整卡
  await page.goto('/components/card.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-card[clickable]')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, {
    timeout: 10000,
  })
  // 整卡承担按钮语义（Vue 下 clickable 存活 → role/tabindex 同步）
  const r = await page.evaluate(() => {
    const card = document.querySelector('oas-card[clickable][cover-src]')!
    const cover = card.shadowRoot!.querySelector('[part="cover-img"]')
    const actions = card.shadowRoot!.querySelector('[part="actions"]')
    return {
      role: card.getAttribute('role'),
      tabindex: card.getAttribute('tabindex'),
      coverSrc: cover?.getAttribute('src') ?? '',
      actionsHidden: actions?.hasAttribute('hidden') ?? true,
    }
  })
  expect(r.role, 'clickable 卡片应带 role=button').toBe('button')
  expect(r.tabindex).toBe('0')
  expect(r.coverSrc).toContain('picsum')
  expect(r.actionsHidden).toBe(false)

  // 点击整卡 → message 可见反馈（demo 监听 oas-click 弹消息）
  await page.evaluate(() => {
    const card = document.querySelector('oas-card[clickable][cover-src]')!
    ;(card.shadowRoot!.querySelector('[part="body"]') as HTMLElement).click()
  })
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length > 0, null, {
    timeout: 5000,
  })
  const msgCount = await page.locator('oas-message').count()
  expect(msgCount).toBeGreaterThan(0)

  // 点击 actions 内按钮 → 不派发整卡 oas-click（演示反馈应不重复弹出）
  const before = await page.locator('oas-message').count()
  await page.locator('oas-card[clickable][cover-src] oas-button').first().click()
  await page.waitForTimeout(600)
  const after = await page.locator('oas-message').count()
  expect(after, '点内部按钮不应再触发整卡 oas-click').toBe(before)
})

test('card title 吸收：宿主不残留原生 title（消除整卡悬浮 tooltip），标题照常渲染', async ({ page }) => {
  await page.goto('/components/card.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-card')
  const r = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('oas-card')]
    return {
      total: cards.length,
      residue: cards.filter((c) => c.hasAttribute('title')).length,
      renderedTitles: cards.filter((c) => (c.shadowRoot?.querySelector('[part="title"]')?.textContent ?? '') !== '').length,
    }
  })
  expect(r.total, '页面应有 card demo').toBeGreaterThan(0)
  expect(r.residue, '任何卡片宿主都不应残留原生 title（整卡悬停不弹原生提示）').toBe(0)
  expect(r.renderedTitles, '带 title 的卡片应照常渲染标题区').toBeGreaterThan(0)
})
