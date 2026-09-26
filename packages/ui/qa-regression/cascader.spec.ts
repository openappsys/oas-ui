// 复核回归：cascader——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { panelGeometryAcrossOpens, up } from './helpers'

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
    // 等底部抽屉升起动画落定（transform 收敛、面板贴视口底）后再量几何，避免量到动画中途
    await page.waitForFunction(
      () => {
        const root = document.querySelector('oas-cascader')!.shadowRoot!
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
    expect(Math.abs(info.panelBottom - info.vh), '抽屉面板应贴视口底（≤1px 亚像素容差）').toBeLessThanOrEqual(1)
    expect(info.panelLeft, '抽屉面板应左贴视口').toBe(0)
    expect(Math.abs(info.panelRight - info.vw), '抽屉面板应右贴视口（≤1px 亚像素容差）').toBeLessThanOrEqual(1)
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

test('cascader 浮层定位：首开与再开一致（面板宽度取内容固有宽度，不受定位时序影响）', async ({ page }) => {
  // cascader 面板用 min-width + 内容固有宽度（列定宽），首开即终值，故定位不随「撑宽时机」漂移。
  // 锁定稳定不变量，防未来误改为先定位后设宽而复现 select 家族的首开偏移。
  await page.goto('/components/cascader.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-cascader')
  const g = await panelGeometryAcrossOpens(page, 'oas-cascader', async (host) => {
    await host.locator('[part="trigger"]').click()
  })
  expect(Math.abs(g.first.left - g.second.left)).toBeLessThanOrEqual(1)
})

test('cascader loading / field-names / focus 事件：用户视角反馈（PRD P1-20/21/22）', async ({ page }) => {
  await page.goto('/components/cascader.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-cascader')

  // loading：进入 loading → 触发器 spinner + aria-busy；展开面板只显示加载占位
  const loading = page.locator('#cs-loading')
  await page.locator('oas-button', { hasText: '进入 loading' }).click()
  expect(await loading.evaluate((el) => (el.shadowRoot!.querySelector('[part="spinner"]') as HTMLElement).hidden)).toBe(
    false,
  )
  expect(await loading.evaluate((el) => el.shadowRoot!.querySelector('.trigger')!.getAttribute('aria-busy'))).toBe(
    'true',
  )
  await loading.evaluate((el) => (el.shadowRoot!.querySelector('.trigger') as HTMLElement).click())
  const statusText = await loading.evaluate((el) => el.shadowRoot!.querySelector('[role="status"]')?.textContent)
  expect(statusText).toContain('加载中')
  expect(await loading.evaluate((el) => el.shadowRoot!.querySelectorAll('[role="option"]').length)).toBe(0)
  // 结束 loading → 常规选项恢复（点「结束 loading」属外部点击，面板已按 outside-click 契约关闭，
  // 需重新展开验证选项渲染；根级仅「浙江」1 项）
  await page.locator('oas-button', { hasText: '结束 loading' }).click()
  expect(await loading.evaluate((el) => (el.shadowRoot!.querySelector('[part="spinner"]') as HTMLElement).hidden)).toBe(
    true,
  )
  await loading.evaluate((el) => (el.shadowRoot!.querySelector('.trigger') as HTMLElement).click())
  expect(await loading.evaluate((el) => el.shadowRoot!.querySelectorAll('[role="option"]').length)).toBe(1)

  // field-names：别名渲染 + 别名 disabled 生效（设计 分支展开后查子项 UI——off:true 映射 disabled）
  const fields = page.locator('#cs-fields')
  await fields.evaluate((el) => (el.shadowRoot!.querySelector('.trigger') as HTMLElement).click())
  const firstLabel = await fields.evaluate((el) => el.shadowRoot!.querySelector('.option .label')?.textContent)
  expect(firstLabel).toBe('前端')
  await fields.evaluate((el) => {
    const rows = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.option')]
    rows.find((r) => r.textContent?.includes('设计'))?.click()
  })
  await page.waitForTimeout(150)
  const disabledRow = await fields.evaluate((el) => {
    const rows = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.option')]
    return rows.find((r) => r.textContent?.trim() === 'UI')?.getAttribute('aria-disabled')
  })
  expect(disabledRow).toBe('true')

  // focus/blur：聚焦/失焦后内联反馈更新
  const focus = page.locator('#cs-focus')
  await focus.evaluate((el) => (el.shadowRoot!.querySelector('.trigger') as HTMLElement).focus())
  await expect(page.locator('#cs-focus-output')).toHaveText('oas-focus')
  await page.locator('h1').first().click()
  await expect(page.locator('#cs-focus-output')).toHaveText('oas-blur')
})
