// 复核回归：order-list——页签真点选中态与卡列表切换、触底真滚动加载、暗色。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('order-list：页签真点切换——选中态视觉 + oas-tab-change 反馈 + 宿主卡列表切换', async ({ page }) => {
  await page.goto('/components/order-list.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ol-basic')
  const host = page.locator('#ol-basic')
  await host.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  // 初始 active="pending"：第二个页签选中（胶囊底色 = primary token）
  const tabs = host.locator('[part="tab"]')
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
  const selectedBg = await tabs.nth(1).evaluate((el) => getComputedStyle(el).backgroundColor)
  // 点第一个页签（全部）→ 选中态迁移 + 事件反馈 + 卡切换
  await tabs.nth(0).click()
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true')
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'false')
  const newSelectedBg = await tabs.nth(0).evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(newSelectedBg).toBe(selectedBg) // 选中胶囊底色一致（token 驱动）
  await expect(page.locator('#ol-basic-out')).toContainText('oas-tab-change：all')
  // 宿主已按 key 换卡（全部 = 3 张轻量卡）
  await expect(host.locator('[data-demo-card]')).toHaveCount(3)
  // roving tabindex 跟随激活
  await expect(tabs.nth(0)).toHaveAttribute('tabindex', '0')
  await expect(tabs.nth(1)).toHaveAttribute('tabindex', '-1')
})

test('order-list：键盘方向键移动焦点 + Enter 激活（manual activation）', async ({ page }) => {
  await page.goto('/components/order-list.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ol-basic')
  const host = page.locator('#ol-basic')
  await host.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  const tabs = host.locator('[part="tab"]')
  // 聚焦激活页签，右方向键移焦点（不改选中）
  await tabs.nth(1).focus()
  await page.keyboard.press('ArrowRight')
  await expect(tabs.nth(2)).toHaveAttribute('tabindex', '0')
  await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'false')
  // Enter 激活
  await page.keyboard.press('Enter')
  await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#ol-basic-out')).toContainText('shipped')
})

test('order-list：键盘 Enter 激活后焦点保持在 tablist（I1——激活回写重建 tablist 后焦点不丢）', async ({ page }) => {
  await page.goto('/components/order-list.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ol-basic')
  const host = page.locator('#ol-basic')
  await host.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  const tabs = host.locator('[part="tab"]')
  await tabs.nth(1).focus()
  await page.keyboard.press('Enter')
  // 激活回写 active → syncTabs 全量重建；焦点必须仍在新 tab 上（不得丢到 body）
  await expect(tabs.nth(1)).toBeFocused()
})

test('order-list：触底真滚动——oas-load-more 派发 + 宿主协议追加订单卡 + no-more 到底态', async ({ page }) => {
  await page.goto('/components/order-list.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ol-more')
  // 首触底委托监听先于滚动就位
  await page.evaluate(() => {
    const w = window as unknown as { __olEvents?: number }
    w.__olEvents = 0
    document.addEventListener('oas-load-more', (e) => {
      const el = e.target as HTMLElement
      if (el.id !== 'ol-more') return
      w.__olEvents = (w.__olEvents ?? 0) + 1
      el.setAttribute('loading', '')
      setTimeout(() => {
        const div = document.createElement('div')
        div.textContent = '触底追加的订单卡'
        div.style.cssText = 'padding:12px;border:1px solid var(--oas-color-border);border-radius:var(--oas-radius-lg)'
        el.appendChild(div)
        el.removeAttribute('loading')
      }, 120)
    })
  })
  const host = page.locator('#ol-more')
  await host.evaluate((el) => {
    el.scrollIntoView({ block: 'center' })
    document.dispatchEvent(new Event('scroll'))
  })
  // 触发链带 rAF 节流：poll 等待派发 + 宿主追加落定
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __olEvents?: number }).__olEvents ?? 0), { timeout: 3000 })
    .toBeGreaterThanOrEqual(1)
  await expect(host.locator('[part="spinner"]')).toBeHidden({ timeout: 3000 })
  // 追加的卡在插槽（light DOM）里可见（:scope > div 需 .first()——demo 页多张卡共存）
  await expect(host.locator(':scope > div').filter({ hasText: '触底追加的订单卡' }).first()).toBeVisible()
  // no-more 到底态
  await host.evaluate((el) => el.setAttribute('no-more', ''))
  await expect(host.locator('[part="more-text"]')).toContainText('没有更多了')
})

test('order-list：暗色下选中页签底色随主题翻转（token 驱动）', async ({ page }) => {
  await page.goto('/components/order-list.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ol-basic')
  const host = page.locator('#ol-basic')
  await host.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  const selected = host.locator('[part="tab"][aria-selected="true"]')
  const lightBg = await selected.evaluate((el) => getComputedStyle(el).backgroundColor)
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.querySelector('.demo-block__body')!).backgroundColor))
    .toBe('rgb(24, 24, 27)')
  const darkBg = await selected.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(darkBg).not.toBe(lightBg)
  await page.evaluate(() => document.documentElement.classList.remove('dark'))
})
