// 复核回归：date-picker——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('date-picker / time-picker 面板贴输入框下方（:host 为定位祖先）', async ({ page }) => {
  // 曾现 bug：:host 缺 position: relative，[part=dropdown] 的 absolute 定位基准逃逸出 shadow，
  // top: calc(100% + 4px) 相对页面底部定位，面板掉到页面底部。
  // 修复：:host 补 position: relative；本测试锁定「dropdown 有定位祖先」不变量。
  for (const name of ['date-picker', 'time-picker'] as const) {
    await page.goto(`/components/${name}.html`, { waitUntil: 'domcontentloaded' })
    await up(page, `oas-${name}`)
    const host = page.locator(`oas-${name}`).first()
    await host.locator('[part="trigger"]').click()
    await page.waitForFunction(
      (sel) => document.querySelector(sel)?.shadowRoot?.querySelector('[part="dropdown"]')?.classList.contains('open'),
      `oas-${name}`,
      { timeout: 5000 },
    )
    const r = await host.evaluate((el) => {
      const root = el.shadowRoot!
      const dropdown = root.querySelector<HTMLElement>('[part="dropdown"]')!
      const trigger = root.querySelector<HTMLElement>('[part="trigger"]')!
      const d = dropdown.getBoundingClientRect()
      const t = trigger.getBoundingClientRect()
      return {
        hostPosition: getComputedStyle(el).position,
        dropdownPosition: getComputedStyle(dropdown).position,
        placement: dropdown.getAttribute('data-placement'),
        dropdownTop: d.top,
        dropdownBottom: d.bottom,
        triggerBottom: t.bottom,
        triggerTop: t.top,
        inViewport: d.right <= window.innerWidth && d.left >= 0,
      }
    })
    // 两组件统一走库内浮层定位引擎（fixed + computePosition 锚定触发器，逃出祖先 overflow）
    // ——锁定架构不变量：fixed 定位 + 面板与触发器相邻（下翻 gap=4 在下；下方空间不足自动
    // 上翻 gap=4 在上，两种朝向均合法）+ 视口内不裁 + 碰撞翻转钩子可读（data-placement）
    expect(r.dropdownPosition, `${name} dropdown 应为 fixed 定位`).toBe('fixed')
    expect(r.placement, `${name} 应有 data-placement 定位钩子`).toBeTruthy()
    const gap = r.dropdownTop - r.triggerBottom >= 0 ? r.dropdownTop - r.triggerBottom : r.triggerTop - r.dropdownBottom
    expect(gap, `${name} 面板应与触发器相邻（gap 4，下翻或上翻）`).toBeCloseTo(4, 1)
    expect(r.inViewport, `${name} 面板应完整在视口内`).toBe(true)
  }
})

// 移动端专项：bottom-sheet 底部抽屉承载（data-mobile-sheet 标记 + sheet open + dropdown 静态化 + oas-close 同步收起）
test('date-picker 移动端：底部抽屉贴视口底展开 + dropdown 静态化 + 点遮罩同步收起', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  try {
    await page.goto('/components/date-picker.html', { waitUntil: 'domcontentloaded' })
    await up(page, 'oas-date-picker')
    const host = page.locator('oas-date-picker').first()
    await expect(host).toHaveAttribute('data-mobile-sheet', '')
    await host.locator('[part="trigger"]').click()
    await page.waitForFunction(
      () => {
        const root = document.querySelector('oas-date-picker')!.shadowRoot!
        return root.querySelector('[part="dropdown"]')!.classList.contains('open')
      },
      null,
      { timeout: 5000 },
    )
    // 等底部抽屉升起动画落定（transform 收敛、面板贴视口底）后再量几何，避免量到动画中途
    await page.waitForFunction(
      () => {
        const root = document.querySelector('oas-date-picker')!.shadowRoot!
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
        // 面板可用：抽屉内能取到日格按钮
        dayButtons: dropdown.querySelectorAll('.day').length,
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
    expect(info.dayButtons, '抽屉内面板应可交互（有日格）').toBeGreaterThan(0)
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
