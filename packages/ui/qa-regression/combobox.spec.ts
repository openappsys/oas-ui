// 复核回归：combobox——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

// 移动端专项：bottom-sheet 底部抽屉承载（data-mobile-sheet 标记 + sheet open + dropdown 静态化 + oas-close 同步收起）
test('combobox 移动端：底部抽屉贴视口底展开 + 列表可交互 + 点遮罩同步收起', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  try {
    await page.goto('/components/combobox.html', { waitUntil: 'domcontentloaded' })
    await up(page, 'oas-combobox')
    const host = page.locator('oas-combobox').first()
    await expect(host).toHaveAttribute('data-mobile-sheet', '')
    // combobox 聚焦即展开
    await host.locator('input').click()
    await page.waitForFunction(
      () => {
        const root = document.querySelector('oas-combobox')!.shadowRoot!
        return root.querySelector('[part="dropdown"]')!.classList.contains('open')
      },
      null,
      { timeout: 5000 },
    )
    // 等底部抽屉升起动画落定（transform 收敛、面板贴视口底）后再量几何，避免量到动画中途
    await page.waitForFunction(
      () => {
        const root = document.querySelector('oas-combobox')!.shadowRoot!
        const sheet = root.querySelector('oas-bottom-sheet') as HTMLElement
        const panel = sheet.shadowRoot!.querySelector('.sheet') as HTMLElement
        return Math.abs(panel.getBoundingClientRect().bottom - window.innerHeight) < 1
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
      const handle = sheetRoot.querySelector<HTMLElement>('.handle')!
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
        handleVisible: getComputedStyle(handle).display !== 'none',
        // 面板可用：抽屉内能取到选项行
        options: dropdown.querySelectorAll('[role="option"]').length,
      }
    })
    expect(info.sheetOpen, '移动端展开时 sheet 应带 open').toBe(true)
    expect(info.sheetPassive, '移动端 sheet 应去 passive 变容器').toBe(false)
    expect(info.dropdownPosition, '移动端 dropdown 应静态化').toBe('static')
    expect(Math.abs(info.panelBottom - info.vh), '抽屉面板应贴视口底（≤1px 亚像素容差）').toBeLessThanOrEqual(1)
    expect(info.panelLeft, '抽屉面板应左贴视口').toBe(0)
    expect(Math.abs(info.panelRight - info.vw), '抽屉面板应右贴视口（≤1px 亚像素容差）').toBeLessThanOrEqual(1)
    expect(info.backdropOpacity, '遮罩应可见').toBeGreaterThan(0.5)
    expect(info.handleVisible, 'drag handle 应可见').toBe(true)
    expect(info.options, '抽屉内列表应可交互（有选项行）').toBeGreaterThan(0)
    // 抽屉内点选交互：点第一项 → 选中并回写 value
    await host.evaluate((el) => {
      const row = el.shadowRoot!.querySelector<HTMLElement>('[part="dropdown"] [role="option"]')!
      row.click()
    })
    await expect.poll(() => host.evaluate((el) => el.getAttribute('value'))).not.toBe(null)
    // oas-close 同步收起：点遮罩（先失焦——选中后焦点仍在输入框，
    // 直接再点输入框不会重触发 focus，与 PC 行为一致；失焦后重新聚焦即重开）
    await host.evaluate((el) => el.shadowRoot!.querySelector<HTMLInputElement>('input')!.blur())
    await host.locator('input').click()
    await page.waitForFunction(
      () => document.querySelector('oas-combobox')!.shadowRoot!.querySelector('oas-bottom-sheet')!.hasAttribute('open'),
      null,
      { timeout: 5000 },
    )
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
