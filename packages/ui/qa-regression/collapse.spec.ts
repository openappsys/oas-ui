// 复核回归：collapse——浏览器级固化断言。
// 覆盖：点击头部切换展开/收起（open 反射 + aria-expanded + 内容可见性 + oas-change）、
// 手风琴互斥与 demo 事件反馈文本（#collapse-state）、键盘 Enter/Space 触发、
// slot="extra" 操作区点击不触发展开。
// 注意：展开/收起是 grid-template-rows 0fr→1fr 过渡动画，内容可见性断言前等待过渡完成。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

const PAGE = '/components/collapse.html'

// 「默认全部收起」demo 是文档页第 3 个 oas-collapse（前两个分别带 active 与 accordion 属性）
test('collapse 点击头切换展开/收起：open 反射 + aria-expanded + 内容可见性 + oas-change', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-collapse-item')
  // 先校验索引 2 指向「默认全部收起」demo（防 demo 增删导致索引漂移）
  const probe = await page.evaluate(() => {
    const el = document.querySelectorAll('oas-collapse')[2]!
    return el.querySelector('oas-collapse-item')!.getAttribute('header')
  })
  expect(probe, '索引 2 应指向「默认全部收起」demo').toBe('面板一')

  // 挂 oas-change 监听并点击第一个面板头
  await page.evaluate(() => {
    const el = document.querySelectorAll('oas-collapse')[2] as HTMLElement & { __changes?: unknown[] }
    el.__changes = []
    el.addEventListener('oas-change', (e) => (el.__changes as unknown[]).push((e as CustomEvent).detail))
    el.querySelector('oas-collapse-item')!.shadowRoot!.querySelector<HTMLElement>('[part="head"]')!.click()
  })
  await page.waitForTimeout(500) // 等展开过渡完成
  const opened = await page.evaluate(() => {
    const el = document.querySelectorAll('oas-collapse')[2] as HTMLElement & { __changes?: unknown[] }
    const item = el.querySelector('oas-collapse-item')!
    const head = item.shadowRoot!.querySelector<HTMLElement>('[part="head"]')!
    // 可见性量折叠内容 wrapper（grid-template-rows 0fr/1fr + overflow hidden 的容器）：
    // 内层 <p> 自带布局高度，收起时被 wrapper 裁剪但 rect 仍非零，不能作为可见性依据
    const bodyWrap = item.shadowRoot!.querySelector<HTMLElement>('[part="body-wrap"]')!
    return {
      open: item.hasAttribute('open'),
      ariaExpanded: head.getAttribute('aria-expanded'),
      bodyHeight: bodyWrap.getBoundingClientRect().height,
      changes: el.__changes,
    }
  })
  expect(opened.open, '点击头后 item 应带 open 属性').toBe(true)
  expect(opened.ariaExpanded, 'head button aria-expanded 应同步为 true').toBe('true')
  expect(opened.bodyHeight, '展开后面板内容可见（高度 > 0）').toBeGreaterThan(0)
  expect(opened.changes, '应派发 oas-change { active: ["a"] }').toEqual([{ active: ['a'] }])

  // 再点同一头部收起
  await page.evaluate(() => {
    const el = document.querySelectorAll('oas-collapse')[2]!
    el.querySelector('oas-collapse-item')!.shadowRoot!.querySelector<HTMLElement>('[part="head"]')!.click()
  })
  await page.waitForTimeout(500)
  const closed = await page.evaluate(() => {
    const el = document.querySelectorAll('oas-collapse')[2] as HTMLElement & { __changes?: unknown[] }
    const item = el.querySelector('oas-collapse-item')!
    const bodyWrap = item.shadowRoot!.querySelector<HTMLElement>('[part="body-wrap"]')!
    return {
      open: item.hasAttribute('open'),
      ariaExpanded: item.shadowRoot!.querySelector<HTMLElement>('[part="head"]')!.getAttribute('aria-expanded'),
      bodyHeight: bodyWrap.getBoundingClientRect().height,
      changes: el.__changes,
    }
  })
  expect(closed.open, '再点头后 item 应收起').toBe(false)
  expect(closed.ariaExpanded, '收起后 aria-expanded 应为 false').toBe('false')
  expect(closed.bodyHeight, '收起后面板内容不可见（高度归零）').toBe(0)
  expect(closed.changes, '收起应派发 oas-change { active: [] }').toEqual([{ active: ['a'] }, { active: [] }])
})

test('collapse 手风琴互斥：展开新项收起旧项、再点已展开项全部收起、#collapse-state 反馈同步', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, '#collapse-event')
  await page.waitForTimeout(300) // 等 demo 宿主挂 oas-change 监听（onMounted 内异步 import）
  // 初始 active="a"：面板 a 展开
  const init = await page.evaluate(() => {
    const el = document.querySelector('#collapse-event')!
    const items = el.querySelectorAll('oas-collapse-item')
    return {
      aOpen: items[0]!.hasAttribute('open'),
      bOpen: items[1]!.hasAttribute('open'),
    }
  })
  expect(init.aOpen).toBe(true)
  expect(init.bOpen).toBe(false)

  // 点面板 b：b 展开、a 收起（互斥）
  await page.evaluate(() => {
    const el = document.querySelector('#collapse-event')!
    el.querySelectorAll('oas-collapse-item')[1]!.shadowRoot!.querySelector<HTMLElement>('[part="head"]')!.click()
  })
  await page.waitForTimeout(200)
  const switched = await page.evaluate(() => {
    const el = document.querySelector('#collapse-event')!
    const items = el.querySelectorAll('oas-collapse-item')
    return {
      active: el.getAttribute('active'),
      aOpen: items[0]!.hasAttribute('open'),
      bOpen: items[1]!.hasAttribute('open'),
      bAria: items[1]!.shadowRoot!.querySelector<HTMLElement>('[part="head"]')!.getAttribute('aria-expanded'),
    }
  })
  expect(switched.active, '手风琴下 active 应切到 b').toBe('b')
  expect(switched.aOpen, '展开新项应收起旧项 a').toBe(false)
  expect(switched.bOpen).toBe(true)
  expect(switched.bAria).toBe('true')
  // demo 可见反馈：#collapse-state 文本随展开集合更新
  expect(await page.locator('#collapse-state').textContent(), '#collapse-state 应显示 b').toBe('b')

  // 再点已展开的 b：全部收起
  await page.evaluate(() => {
    const el = document.querySelector('#collapse-event')!
    el.querySelectorAll('oas-collapse-item')[1]!.shadowRoot!.querySelector<HTMLElement>('[part="head"]')!.click()
  })
  await page.waitForTimeout(200)
  const collapsed = await page.evaluate(() => {
    const el = document.querySelector('#collapse-event')!
    return {
      active: el.getAttribute('active'),
      bOpen: el.querySelectorAll('oas-collapse-item')[1]!.hasAttribute('open'),
    }
  })
  expect(collapsed.active, '再点已展开项应收起全部（active 为空）').toBe('')
  expect(collapsed.bOpen).toBe(false)
  expect(await page.locator('#collapse-state').textContent(), '空集合反馈为「（无）」').toBe('（无）')
})

test('collapse 键盘 Enter/Space：head button 焦点上触发展开/收起', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-collapse-item')
  const head = page.locator('oas-collapse').nth(2).locator('oas-collapse-item').first().locator('[part="head"]')
  await head.focus()
  await page.keyboard.press('Enter')
  expect(
    await page.evaluate(() =>
      document.querySelectorAll('oas-collapse')[2]!.querySelector('oas-collapse-item')!.hasAttribute('open'),
    ),
    'Enter 应展开面板',
  ).toBe(true)
  await page.keyboard.press(' ')
  expect(
    await page.evaluate(() =>
      document.querySelectorAll('oas-collapse')[2]!.querySelector('oas-collapse-item')!.hasAttribute('open'),
    ),
    'Space 应收起面板',
  ).toBe(false)
})

test('collapse slot="extra" 操作区点击不触发展开/收起（组件内阻断冒泡）', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-collapse-item')
  // 富标题 demo 中 name="b"（普通属性标题）带 slot="extra" 的导出按钮，初始收起
  const r = await page.evaluate(() => {
    const item = [...document.querySelectorAll('oas-collapse-item')].find(
      (i) => i.getAttribute('name') === 'b' && i.querySelector('[slot="extra"]'),
    )
    if (!item) return { found: false as const, open: false }
    let itemClicks = 0
    item.addEventListener('oas-collapse-item-click', () => itemClicks++)
    // 模拟真实用户点击 extra 内按钮：composed click 冒泡路径经过 item shadow 内 extra 容器
    item.querySelector('[slot="extra"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    return { found: true as const, open: item.hasAttribute('open'), itemClicks }
  })
  expect(r.found, '应找到带 extra 操作区的 item').toBe(true)
  expect(r.open, 'extra 点击不应触发展开').toBe(false)
  if (r.found) expect(r.itemClicks, 'extra 点击不应派发 item-click').toBe(0)
})
