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
        (r) =>
          r.getAttribute('aria-disabled') === 'true' && r.getAttribute('aria-selected') === 'true',
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
    const vlist = document
      .querySelector('#transfer-virtual')
      ?.shadowRoot?.querySelector('.vlist-left')
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
