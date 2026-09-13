// 复核回归：transfer——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('transfer 搜索：输入过滤词后可见行减少、无匹配显示空态', async ({ page }) => {
  // 防回归：searchable 过滤必须真实驱动面板渲染，且无匹配时有可见空态反馈
  await page.goto('/components/transfer.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-transfer[searchable]')
  await page.waitForFunction(() => {
    const el = document.querySelector('#transfer-search')
    return el?.shadowRoot?.querySelectorAll('.listbox.left .option').length === 5
  })
  await page.locator('#transfer-search').evaluate((el) => {
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('.search-left')!
    input.value = '香'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForFunction(() => {
    const el = document.querySelector('#transfer-search')
    return el?.shadowRoot?.querySelectorAll('.listbox.left .option').length === 1
  })
  await page.locator('#transfer-search').evaluate((el) => {
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('.search-left')!
    input.value = 'zzz'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForFunction(() => {
    const el = document.querySelector('#transfer-search')
    return el?.shadowRoot?.querySelector('.listbox.left .empty') != null
  })
})

test('transfer case-sensitive：区分大小写搜索', async ({ page }) => {
  await page.goto('/components/transfer.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-transfer[case-sensitive]')
  await page.locator('#transfer-casesensitive').evaluate((el) => {
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('.search-left')!
    input.value = 'ap'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  // 'ap' 只命中 apricot（Apple 大写 A 不匹配）
  await page.waitForFunction(() => {
    const el = document.querySelector('#transfer-casesensitive')
    const rows = el?.shadowRoot?.querySelectorAll('.listbox.left .option') ?? []
    return rows.length === 1 && rows[0]!.textContent === 'apricot'
  })
})

test('transfer one-way：左侧含全部数据且已穿梭项禁用，右侧无移除按钮', async ({ page }) => {
  await page.goto('/components/transfer.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-transfer[one-way]')
  await page.locator('#transfer-oneway').evaluate((el) => {
    const row = el.shadowRoot!.querySelector('.listbox.left .option') as HTMLElement
    row.click()
    el.shadowRoot!.querySelector<HTMLButtonElement>('.to-right')!.click()
  })
  await page.waitForFunction(() => {
    const el = document.querySelector('#transfer-oneway')
    return el?.getAttribute('value')?.includes('a')
  })
  const state = await page.locator('#transfer-oneway').evaluate((el) => {
    const s = el.shadowRoot!
    const rows = [...s.querySelectorAll('.listbox.left .option')]
    return {
      total: rows.length,
      disabledSelected: rows.filter(
        (r) => r.getAttribute('aria-disabled') === 'true' && r.getAttribute('aria-selected') === 'true',
      ).length,
      toLeftHidden: (s.querySelector('.to-left') as HTMLButtonElement).hidden,
    }
  })
  expect(state.total).toBe(4)
  expect(state.disabledSelected).toBe(1)
  expect(state.toLeftHidden).toBe(true)
})

test('transfer virtual：万级数据窗口化渲染且滚动后窗口平移', async ({ page }) => {
  await page.goto('/components/transfer.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-transfer[virtual]')
  await page.waitForFunction(() => {
    const vlist = document.querySelector('#transfer-virtual')?.shadowRoot?.querySelector('.vlist-left')
    return !!vlist && !!vlist.shadowRoot?.querySelector('[part="item"]')
  })
  const before = await page.locator('#transfer-virtual').evaluate((el) => {
    const vlist = el.shadowRoot!.querySelector('.vlist-left')!
    return {
      rows: vlist.shadowRoot!.querySelectorAll('[part="item"]').length,
      innerHeight: (vlist.shadowRoot!.querySelector('[part="inner"]') as HTMLElement).style.height,
    }
  })
  expect(before.rows).toBeLessThan(40)
  expect(before.innerHeight).toBe('320000px') // 10000 * item-height 32
  // 滚动后窗口平移：首行 data-key 不再是 k0
  await page.locator('#transfer-virtual').evaluate((el) => {
    const vlist = el.shadowRoot!.querySelector('.vlist-left')!
    const vp = vlist.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
    vp.scrollTop = 10000
    vp.dispatchEvent(new Event('scroll'))
  })
  await page.waitForTimeout(200)
  const after = await page.locator('#transfer-virtual').evaluate((el) => {
    const vlist = el.shadowRoot!.querySelector('.vlist-left')!
    const first = vlist.shadowRoot!.querySelector('[part="item"] .option')
    return first?.getAttribute('data-key') ?? null
  })
  expect(after).not.toBe('k0')
})

// —— notification P1 补缺：进度条 + 可滚动 ——
// 曾现缺口：notification 无自动关闭倒计时反馈（用户不知何时消失）、长内容撑破卡片。
// 本次补 show-progress（进度动画时长=duration）+ progress-position + scrollable。

// —— 移动端硬伤修复回归：窄屏堆叠不溢出 + 触屏按钮排序（HTML5 DnD 触屏不可用）——
test('transfer 375 窄屏：双面板纵向堆叠，无横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/components/transfer.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#transfer-basic')
  const r = await page.evaluate(() => {
    const el = document.querySelector('#transfer-basic')!
    const hostRect = el.getBoundingClientRect()
    const actions = el.shadowRoot!.querySelector('.actions') as HTMLElement
    const panel = el.shadowRoot!.querySelector('.panel') as HTMLElement
    return {
      hostW: Math.round(hostRect.width),
      hostRight: Math.round(hostRect.right),
      vw: document.documentElement.clientWidth,
      hostDir: getComputedStyle(el).flexDirection,
      actionsDir: getComputedStyle(actions).flexDirection,
      panelW: Math.round(panel.getBoundingClientRect().width),
    }
  })
  // 修复前 180px×2 + 34px + gap ≈ 430px 刚性宽度在 375 视口溢出
  expect(r.hostDir).toBe('column')
  expect(r.actionsDir).toBe('row')
  expect(r.hostW).toBeLessThanOrEqual(r.vw)
  expect(r.hostRight).toBeLessThanOrEqual(r.vw)
  expect(r.panelW).toBeLessThanOrEqual(r.vw)
})

test('transfer 触屏（coarse）：行触控高 44 + 按钮排序可点（DnD 触屏不可用的替代通道）', async ({ browser }) => {
  const ctx = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } })
  const p = await ctx.newPage()
  await p.goto('/components/transfer.html', { waitUntil: 'domcontentloaded' })
  await up(p, '#transfer-sort')
  const coarse = await p.evaluate(() => window.matchMedia('(pointer: coarse)').matches)
  expect(coarse, 'touch context 应命中 pointer: coarse').toBe(true)
  const before = await p.evaluate(() => {
    const el = document.querySelector('#transfer-sort')!
    const rows = [...el.shadowRoot!.querySelectorAll('.listbox.right .option')]
    return {
      value: el.getAttribute('value'),
      rowMinH: getComputedStyle(rows[0]!).minHeight,
      btnW: getComputedStyle(el.shadowRoot!.querySelector('.actions button')!).minWidth,
    }
  })
  expect(before.rowMinH).toBe('44px')
  expect(before.btnW).toBe('44px')
  // 按钮式排序：目标侧需 ≥2 项才有可点的下移钮（demo 预置 1 项，先补到 2 项）
  await p.evaluate(() => document.querySelector('#transfer-sort')!.setAttribute('value', '["a","b"]'))
  await p.waitForFunction(() => {
    const el = document.querySelector('#transfer-sort')!
    return el.shadowRoot!.querySelectorAll('.listbox.right .option').length === 2
  })
  const before2 = await p.evaluate(() => document.querySelector('#transfer-sort')!.getAttribute('value'))
  await p.evaluate(() => {
    const el = document.querySelector('#transfer-sort')!
    const down = el.shadowRoot!.querySelector<HTMLButtonElement>('.listbox.right .move-down')!
    down.click()
  })
  const after = await p.evaluate(() => document.querySelector('#transfer-sort')!.getAttribute('value'))
  expect(after).not.toBe(before2)
  await ctx.close()
})
