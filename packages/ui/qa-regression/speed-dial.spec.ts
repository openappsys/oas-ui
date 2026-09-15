// 复核回归：speed-dial——浏览器级固化断言。
// 事件契约为 oas-open（detail: { open, reason }）与 oas-select（detail: { index, label }）。
// 覆盖：点主钮展开/收起（aria-expanded + .dial.open + 动作可见性 + demo 反馈文本 #sd-out）、
// 点动作项派发 oas-select 并自动收起、Esc 收起回焦主钮、点击外部收起（reason: outside）、
// 展开自动聚焦首项 + 方向键 roving 导航。
// 注意：子动作为级联浮现动画（每项 delay = index × 30ms），可见性断言前等待过渡完成。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

const PAGE = '/components/speed-dial.html'

interface OpenLog {
  open: boolean
  reason: string
}

test('speed-dial 点击主钮展开/收起：aria-expanded + .dial.open + 动作可见 + oas-open(toggle) + 反馈文本', async ({
  page,
}) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, '#sd-event')
  await page.waitForTimeout(300) // 等 demo 宿主挂事件监听

  // 点击主钮展开（挂监听记录 oas-open detail）
  await page.evaluate(() => {
    const el = document.querySelector('#sd-event') as HTMLElement & { __opens?: OpenLog[] }
    el.__opens = []
    el.addEventListener('oas-open', (e) => (el.__opens as OpenLog[]).push((e as CustomEvent).detail as OpenLog))
    el.shadowRoot!.querySelector<HTMLElement>('[part="fab"]')!.click()
  })
  await page.waitForTimeout(600) // 等级联动画完成（3 项最大 delay 60ms + 过渡）
  const opened = await page.evaluate(() => {
    const el = document.querySelector('#sd-event') as HTMLElement & { __opens?: OpenLog[] }
    const fab = el.shadowRoot!.querySelector<HTMLElement>('[part="fab"]')!
    const dial = el.shadowRoot!.querySelector<HTMLElement>('.dial')!
    const actions = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="action"]')]
    return {
      open: el.hasAttribute('open'),
      ariaExpanded: fab.getAttribute('aria-expanded'),
      dialOpen: dial.classList.contains('open'),
      actionCount: actions.length,
      actionsVisible: actions.every((a) => {
        const r = a.getBoundingClientRect()
        return r.width > 0 && r.height > 0
      }),
      firstOpacity: getComputedStyle(actions[0]!).opacity,
      opens: el.__opens,
      out: document.querySelector('#sd-out')!.textContent,
    }
  })
  expect(opened.open, '点击主钮后宿主应带 open 属性').toBe(true)
  expect(opened.ariaExpanded, 'aria-expanded 应同步为 true').toBe('true')
  expect(opened.dialOpen, '.dial 应带 open 类（展开布局）').toBe(true)
  expect(opened.actionCount, 'demo 配置 3 个子动作').toBe(3)
  expect(opened.actionsVisible, '展开后子动作应全部可见（有布局尺寸）').toBe(true)
  expect(opened.firstOpacity, '级联动画完成后首个子动作应完全不透明').toBe('1')
  expect(opened.opens, '应派发 oas-open { open: true, reason: "toggle" }').toEqual([{ open: true, reason: 'toggle' }])
  expect(opened.out, '#sd-out 应显示展开反馈').toContain('open: true')

  // 再点主钮收起
  await page.evaluate(() => {
    const el = document.querySelector('#sd-event')!
    el.shadowRoot!.querySelector<HTMLElement>('[part="fab"]')!.click()
  })
  await page.waitForTimeout(600)
  const closed = await page.evaluate(() => {
    const el = document.querySelector('#sd-event') as HTMLElement & { __opens?: OpenLog[] }
    const fab = el.shadowRoot!.querySelector<HTMLElement>('[part="fab"]')!
    const dial = el.shadowRoot!.querySelector<HTMLElement>('.dial')!
    const first = el.shadowRoot!.querySelector<HTMLElement>('[part="action"]')!
    return {
      open: el.hasAttribute('open'),
      ariaExpanded: fab.getAttribute('aria-expanded'),
      dialOpen: dial.classList.contains('open'),
      firstOpacity: getComputedStyle(first).opacity,
      opens: el.__opens,
    }
  })
  expect(closed.open, '再点主钮应收起').toBe(false)
  expect(closed.ariaExpanded).toBe('false')
  expect(closed.dialOpen).toBe(false)
  expect(closed.firstOpacity, '收起后子动作应透明（同步消失）').toBe('0')
  expect(closed.opens, '收起应派发 oas-open { open: false, reason: "toggle" }').toEqual([
    { open: true, reason: 'toggle' },
    { open: false, reason: 'toggle' },
  ])
})

test('speed-dial 点击动作项：派发 oas-select { index, label } 并自动收起 + 反馈文本', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, '#sd-event')
  await page.waitForTimeout(300)
  await page.evaluate(() => {
    const el = document.querySelector('#sd-event') as HTMLElement & { __selects?: unknown[] }
    el.__selects = []
    el.addEventListener('oas-select', (e) => (el.__selects as unknown[]).push((e as CustomEvent).detail))
    // 先展开
    el.shadowRoot!.querySelector<HTMLElement>('[part="fab"]')!.click()
  })
  await page.waitForTimeout(400)
  // 点击第一个动作项「复制」
  await page.evaluate(() => {
    const el = document.querySelector('#sd-event')!
    el.shadowRoot!.querySelectorAll<HTMLElement>('[part="action"]')[0]!.click()
  })
  await page.waitForTimeout(300)
  const r = await page.evaluate(() => {
    const el = document.querySelector('#sd-event') as HTMLElement & { __selects?: unknown[] }
    return {
      open: el.hasAttribute('open'),
      dialOpen: el.shadowRoot!.querySelector<HTMLElement>('.dial')!.classList.contains('open'),
      fabAria: el.shadowRoot!.querySelector<HTMLElement>('[part="fab"]')!.getAttribute('aria-expanded'),
      selects: el.__selects,
      out: document.querySelector('#sd-out')!.textContent,
    }
  })
  expect(r.selects, '应派发 oas-select { index: 0, label: "复制" }').toEqual([{ index: 0, label: '复制' }])
  expect(r.open, '选择动作后应自动收起').toBe(false)
  expect(r.dialOpen).toBe(false)
  expect(r.fabAria, '收起后 aria-expanded 应回落 false').toBe('false')
  // demo #sd-out 同时监听 oas-open 与 oas-select 且显示最后一条：select 后组件自动收起
  // 随即派发 oas-open(false, reason: "select") 覆盖显示——oas-select 的派发已由 selects 断言覆盖
  expect(r.out, '#sd-out 应显示事件反馈（自动收起的 oas-open 为最后一条）').toContain(
    'oas-open: { open: false, reason: "select" }',
  )
})

test('speed-dial Esc 收起并回焦主按钮（reason: escape）', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, '#sd-event')
  await page.locator('h1').first().scrollIntoViewIfNeeded()
  // 真实点击主钮展开（焦点落在主钮）
  await page.locator('#sd-event [part="fab"]').click()
  await page.waitForTimeout(300)
  const before = await page.evaluate(() => document.querySelector('#sd-event')!.hasAttribute('open'))
  expect(before, '点击主钮应展开').toBe(true)
  // Esc 收起
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  const after = await page.evaluate(() => {
    const el = document.querySelector('#sd-event')!
    return {
      open: el.hasAttribute('open'),
      focusOnFab: el.shadowRoot!.activeElement === el.shadowRoot!.querySelector('[part="fab"]'),
      out: document.querySelector('#sd-out')!.textContent,
    }
  })
  expect(after.open, 'Esc 应收起').toBe(false)
  expect(after.focusOnFab, 'Esc 后焦点应回到主按钮').toBe(true)
  expect(after.out, '#sd-out 应显示 escape 来源反馈').toContain('escape')
})

test('speed-dial 点击外部收起（reason: outside），点击组件内部不收起', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, '#sd-event')
  await page.waitForTimeout(300)
  // 展开
  await page.evaluate(() => {
    document.querySelector('#sd-event')!.shadowRoot!.querySelector<HTMLElement>('[part="fab"]')!.click()
  })
  await page.waitForTimeout(200)
  // 点击组件内部（.dial 容器）：不收起
  await page.evaluate(() => {
    document
      .querySelector('#sd-event')!
      .shadowRoot!.querySelector<HTMLElement>('.dial')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
  })
  expect(
    await page.evaluate(() => document.querySelector('#sd-event')!.hasAttribute('open')),
    '点击组件内部不应收起',
  ).toBe(true)
  // 点击外部（body）：收起
  await page.evaluate(() => {
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
  })
  await page.waitForTimeout(200)
  const after = await page.evaluate(() => ({
    open: document.querySelector('#sd-event')!.hasAttribute('open'),
    out: document.querySelector('#sd-out')!.textContent,
  }))
  expect(after.open, '点击外部应收起').toBe(false)
  expect(after.out, '#sd-out 应显示 outside 来源反馈').toContain('outside')
})

test('speed-dial 键盘导航：展开自动聚焦首项，ArrowDown/ArrowUp 循环移动', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, '#sd-event')
  // 真实点击主钮展开 → 组件意图为自动聚焦首个子动作
  await page.locator('#sd-event [part="fab"]').click()
  await page.waitForTimeout(400)
  const focusState = await page.evaluate(() => {
    const el = document.querySelector('#sd-event')!
    const root = el.shadowRoot!
    const actions = [...root.querySelectorAll('[part="action"]')]
    const fab = root.querySelector('[part="fab"]')
    const a0 = actions[0] as HTMLElement
    return {
      focusOnFab: root.activeElement === fab,
      focusOnFirstAction: root.activeElement === a0,
      firstVisible: getComputedStyle(a0).visibility === 'visible',
    }
  })
  // 展开自动聚焦：visibility 展开向无过渡延迟（回归修复），T0 即可聚焦首项
  expect(focusState.focusOnFirstAction, '展开后焦点应自动落在首个子动作（键盘可达）').toBe(true)
  expect(focusState.firstVisible, '展开过渡完成后首个子动作应可见').toBe(true)
  const first = await page.evaluate(() => {
    const el = document.querySelector('#sd-event')!
    const actions = [...el.shadowRoot!.querySelectorAll('[part="action"]')]
    return { focusIndex: actions.indexOf(el.shadowRoot!.activeElement as Element) }
  })
  expect(first.focusIndex, '键盘导航起点应为首项').toBe(0)
  await page.keyboard.press('ArrowDown')
  const second = await page.evaluate(() => {
    const el = document.querySelector('#sd-event')!
    const actions = [...el.shadowRoot!.querySelectorAll('[part="action"]')]
    return { focusIndex: actions.indexOf(el.shadowRoot!.activeElement as Element), open: el.hasAttribute('open') }
  })
  expect(second.focusIndex, 'ArrowDown 应移到第二个子动作').toBe(1)
  expect(second.open, '方向键仅移动焦点，不收起').toBe(true)
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowUp')
  const wrapped = await page.evaluate(() => {
    const el = document.querySelector('#sd-event')!
    const actions = [...el.shadowRoot!.querySelectorAll('[part="action"]')]
    return actions.indexOf(el.shadowRoot!.activeElement as Element)
  })
  expect(wrapped, 'ArrowUp 越首应循环到末项').toBe(2)
})
