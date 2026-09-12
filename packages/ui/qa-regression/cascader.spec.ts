// 复核回归：cascader——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('cascader 结构恒包 bottom-sheet，PC 形态 passive 透传', async ({ page }) => {
  await page.goto('/components/cascader.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-cascader')
  const host = page.locator('oas-cascader').first()
  const info = await host.evaluate((el) => {
    const root = el.shadowRoot!
    const sheet = root.querySelector('oas-bottom-sheet')
    const dropdown = root.querySelector<HTMLElement>('[part="dropdown"]')!
    return {
      sheetExists: sheet != null,
      sheetPart: sheet?.getAttribute('part') ?? null,
      sheetPassive: sheet?.hasAttribute('passive') ?? null,
      sheetWrapsDropdown: sheet?.contains(dropdown) ?? false,
      mobileSheet: el.hasAttribute('data-mobile-sheet'),
      dropdownPosition: getComputedStyle(dropdown).position,
    }
  })
  // 结构恒包 oas-bottom-sheet（SSR/客户端一致），PC 形态 passive 透传、不标移动态
  expect(info.sheetExists).toBe(true)
  expect(info.sheetPart).toBe('sheet')
  expect(info.sheetPassive).toBe(true)
  expect(info.sheetWrapsDropdown).toBe(true)
  expect(info.mobileSheet).toBe(false)
  expect(info.dropdownPosition).toBe('fixed')
})

// 移动端专项：bottom-sheet 底部抽屉承载（data-mobile-sheet 标记 + sheet open + dropdown 静态化 + oas-close 同步收起）
test('cascader 移动端：底部抽屉贴视口底展开 + 多级面板可用 + 点遮罩同步收起', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  try {
    await page.goto('/components/cascader.html', { waitUntil: 'domcontentloaded' })
    await up(page, 'oas-cascader')
    const host = page.locator('oas-cascader').first()
    await expect(host).toHaveAttribute('data-mobile-sheet', '')
    await host.locator('[part="trigger"]').click()
    await page.waitForFunction(
      () => {
        const root = document.querySelector('oas-cascader')!.shadowRoot!
        return root.querySelector('[part="dropdown"]')!.classList.contains('open')
      },
      null,
      { timeout: 5000 },
    )
    const info = await host.evaluate((el) => {
      const root = el.shadowRoot!
      const sheet = root.querySelector('oas-bottom-sheet')!
      const sheetRoot = sheet.shadowRoot!
      const panel = sheetRoot.querySelector<HTMLElement>('.sheet')!
      const backdrop = sheetRoot.querySelector<HTMLElement>('.backdrop')!
      const dropdown = root.querySelector<HTMLElement>('[part="dropdown"]')!
      const pr = panel.getBoundingClientRect()
      return {
        sheetOpen: sheet.hasAttribute('open'),
        sheetPassive: sheet.hasAttribute('passive'),
        dropdownPosition: getComputedStyle(dropdown).position,
        panelBottom: pr.bottom,
        panelLeft: pr.left,
        panelRight: pr.right,
        vw: window.innerWidth,
        vh: window.innerHeight,
        backdropOpacity: Number(getComputedStyle(backdrop).opacity),
        options: dropdown.querySelectorAll('[role="option"]').length,
      }
    })
    expect(info.sheetOpen, '移动端展开时 sheet 应带 open').toBe(true)
    expect(info.sheetPassive, '移动端 sheet 应去 passive 变容器').toBe(false)
    expect(info.dropdownPosition, '移动端 dropdown 应静态化').toBe('static')
    expect(info.panelBottom, '抽屉面板应贴视口底').toBeCloseTo(info.vh, 0)
    expect(info.panelLeft, '抽屉面板应左贴视口').toBe(0)
    expect(info.panelRight, '抽屉面板应右贴视口').toBeCloseTo(info.vw, 0)
    expect(info.backdropOpacity, '遮罩应可见').toBeGreaterThan(0.5)
    expect(info.options, '抽屉内多级面板应可交互（有选项）').toBeGreaterThan(0)
    // oas-close 同步收起：点遮罩
    await host.evaluate((el) => {
      const sheet = el.shadowRoot!.querySelector('oas-bottom-sheet')!
      sheet.shadowRoot!.querySelector<HTMLElement>('.backdrop')!.click()
    })
    await expect
      .poll(() => host.evaluate((el) => el.shadowRoot!.querySelector('oas-bottom-sheet')!.hasAttribute('open')))
      .toBe(false)
  } finally {
    await ctx.close()
  }
})
