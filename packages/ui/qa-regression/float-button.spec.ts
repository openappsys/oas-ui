// 复核回归：float-button——家族扩展（mode group/menu、受控展开、链接化、徽标封顶、RTL 镜像）的
// 浏览器级断言。机制单测（happy-dom）验证状态与事件；此处验证真实渲染几何与 demo 可交互性。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

const PAGE = '/components/float-button.html'

async function waitMessage(p: import('@playwright/test').Page) {
  await p.waitForFunction(() => typeof (window as any).message !== 'undefined', null, { timeout: 10000 })
}

test('group 模式：点击主钮展开，子钮在主钮下方纵向可见（expand-direction=down 几何）', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-float-button[mode="group"]')
  const group = page.locator('oas-float-button[mode="group"]').first()
  const main = group.locator('[part="btn"]')
  await main.click()
  await expect(group).toHaveAttribute('expanded', '', { timeout: 5000 })
  // 子钮真实渲染且在主钮正下方（down 方向：首个子钮最靠近主钮）
  const geom = await group.evaluate((el) => {
    const root = el.shadowRoot!
    const open = root.querySelector('[part="group"]')!.classList.contains('open')
    const mainRect = root.querySelector('[part="btn"]')!.getBoundingClientRect()
    const kids = [...el.querySelectorAll<HTMLElement>('[slot="action"]')].map((k) => {
      const r = k.getBoundingClientRect()
      return { top: r.top, left: r.left, w: r.width, h: r.height }
    })
    return { open, mainRect, kids }
  })
  expect(geom.open).toBe(true)
  expect(geom.kids.length).toBeGreaterThanOrEqual(3)
  for (const k of geom.kids) {
    expect(k.w, '子钮有真实渲染尺寸').toBeGreaterThan(0)
    expect(k.h, '子钮有真实渲染尺寸').toBeGreaterThan(0)
    expect(k.top, '子钮在主钮下方（down）').toBeGreaterThan(geom.mainRect.bottom)
  }
  // 纵向堆叠：子钮 x 对齐
  expect(geom.kids[0]!.left, '子钮横向对齐').toBe(geom.kids[1]!.left)
  // 收起：Esc 关闭
  await page.keyboard.press('Escape')
  await expect(group).not.toHaveAttribute('expanded', { timeout: 5000 })
})

test('group 展开事件反馈：点击主钮切换，oas-expand-change 有 message 可见反馈；宿主直切 expanded 不派发事件', async ({
  page,
}) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await waitMessage(page)
  // Demo A：默认 click 触发 + onoas-expand-change 反馈（该 demo 是第一个带 onoas-expand-change 的 group）
  const eventDemo = page.locator('oas-float-button[onoas-expand-change]')
  await up(page, 'oas-float-button[onoas-expand-change]')
  await eventDemo.locator('[part="btn"]').click()
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length > 0, null, { timeout: 5000 })
  const msg = await page.evaluate(() =>
    [...document.querySelectorAll('oas-message')].map((m) => m.textContent ?? '').join('|'),
  )
  expect(msg).toContain('展开态：true')
  // 先收起 Demo A（Esc 也会触发其 onoas-expand-change 反馈），避免其外点收起污染后续计数
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  // Demo B：trigger=manual 受控——宿主切换 expanded 属性，组件不自切也不派发事件
  const host = page.locator('#fb-manual-demo')
  const before = await page.evaluate(() => document.querySelectorAll('oas-message').length)
  const toggle = page.getByRole('button', { name: '切换 expanded' })
  await toggle.click()
  await expect(host).toHaveAttribute('expanded', '', { timeout: 5000 })
  await page.waitForTimeout(300)
  const after = await page.evaluate(() => document.querySelectorAll('oas-message').length)
  expect(after, '宿主直切 expanded 不派发事件（无新 message）').toBe(before)
})

test('menu 模式：主钮弹出动作菜单，选择项派发 oas-select 且 message 反馈含 label，菜单自动收起', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await waitMessage(page)
  const host = page.locator('oas-float-button[mode="menu"]')
  await up(page, 'oas-float-button[mode="menu"]')
  await host.locator('[part="btn"]').click()
  const panel = host.locator('[part="menu"]')
  await expect(panel).toHaveClass(/open/, { timeout: 5000 })
  // 菜单项可见（真实渲染）
  const items = host.locator('.item')
  await expect(items.first()).toBeVisible()
  expect(await items.count()).toBe(5)
  // 点「复制」（badge 数字项）→ oas-select 反馈
  await items.nth(1).click()
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length > 0, null, { timeout: 5000 })
  const msg = await page.evaluate(() =>
    [...document.querySelectorAll('oas-message')].map((m) => m.textContent ?? '').join('|'),
  )
  expect(msg).toContain('选中：复制')
  await expect(host).not.toHaveAttribute('expanded', { timeout: 5000 })
})

test('menu 模式：Esc 关闭并回焦主钮', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-float-button[mode="menu"]')
  const host = page.locator('oas-float-button[mode="menu"]')
  await host.locator('[part="btn"]').click()
  await expect(host.locator('[part="menu"]')).toHaveClass(/open/, { timeout: 5000 })
  await page.keyboard.press('Escape')
  await expect(host.locator('[part="menu"]')).not.toHaveClass(/open/, { timeout: 5000 })
  const focused = await page.evaluate(() => document.activeElement?.tagName)
  expect(focused).toBe('OAS-FLOAT-BUTTON')
})

test('链接化存活：group 链接子钮与 menu 链接项均渲染为 a[href][target]', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-float-button[mode="group"]')
  // group 链接子钮（light DOM，宿主自填）
  const linkChild = page.locator('oas-float-button[mode="group"] a[slot="action"]').first()
  await expect(linkChild).toHaveAttribute('href', 'https://example.com')
  await expect(linkChild).toHaveAttribute('target', '_blank')
  // menu 链接项（shadow 渲染）
  await up(page, 'oas-float-button[mode="menu"]')
  const host = page.locator('oas-float-button[mode="menu"]')
  await host.locator('[part="btn"]').click()
  const linkItem = host.locator('.item[href]')
  await expect(linkItem).toHaveCount(1, { timeout: 5000 })
  await expect(linkItem).toHaveAttribute('target', '_blank')
  await expect(linkItem).toHaveAttribute('role', 'menuitem')
})

test('徽标封顶可见：badge=120 显示 99+，badge=dot 为状态点', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-float-button[badge="120"]')
  const capped = await page
    .locator('oas-float-button[badge="120"]')
    .evaluate((el) => el.shadowRoot!.querySelector('[part="badge"]')!.textContent)
  expect(capped).toBe('99+')
  const dotHasClass = await page
    .locator('oas-float-button[badge="dot"]')
    .first()
    .evaluate((el) => el.shadowRoot!.querySelector('[part="badge"]')!.classList.contains('dot'))
  expect(dotHasClass).toBe(true)
})

test('RTL 镜像：group 横向展开方向在 dir=rtl 下 data-dir 自动互换（left↔right）', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-float-button[mode="group"]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-float-button[mode="group"]')!
    el.setAttribute('expand-direction', 'left')
    const ltr = el.shadowRoot!.querySelector('[part="group"]')!.getAttribute('data-dir')
    el.setAttribute('dir', 'rtl')
    const rtl = el.shadowRoot!.querySelector('[part="group"]')!.getAttribute('data-dir')
    el.setAttribute('expand-direction', 'right')
    const rtlRight = el.shadowRoot!.querySelector('[part="group"]')!.getAttribute('data-dir')
    el.removeAttribute('dir')
    el.removeAttribute('expand-direction')
    return { ltr, rtl, rtlRight }
  })
  expect(r.ltr).toBe('left')
  expect(r.rtl).toBe('right')
  expect(r.rtlRight).toBe('left')
})

test('group 子钮点击后组自动收起（选择即收起，浏览器级行为）', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-float-button[mode="group"]')
  const group = page.locator('oas-float-button[mode="group"]').first()
  await group.locator('[part="btn"]').click()
  await expect(group).toHaveAttribute('expanded', '', { timeout: 5000 })
  await group.locator('button[slot="action"]').first().click()
  await expect(group).not.toHaveAttribute('expanded', { timeout: 5000 })
})
