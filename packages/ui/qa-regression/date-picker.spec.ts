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

// 移动端专项：视口/指针形态变化（窗口缩放、设备仿真、横竖屏）时重判定移动/PC 形态——不必强刷
test('date-picker 视口切换：PC↔窄视口不刷新即重判定形态', async ({ page }) => {
  // PC 起步（宽视口，fine pointer——无触摸模拟）
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/components/date-picker.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-date-picker')
  const host = page.locator('oas-date-picker').first()
  // PC：不带 data-mobile-sheet
  await expect(host).not.toHaveAttribute('data-mobile-sheet')
  // 缩到窄视口（不刷新）→ 应变移动形态
  await page.setViewportSize({ width: 375, height: 667 })
  await expect(host).toHaveAttribute('data-mobile-sheet', '')
  // 拉宽回 PC（不刷新）→ 应回落 PC 形态
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(host).not.toHaveAttribute('data-mobile-sheet')
})

// 移动端专项：单月面板在抽屉里水平居中 + 日格触摸友好（≈44px），范围双月堆叠成单列纵向滚动
test('date-picker 移动端：单月面板水平居中 + 日格触摸友好，范围双月单列堆叠', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  try {
    await page.goto('/components/date-picker.html', { waitUntil: 'domcontentloaded' })
    await up(page, 'oas-date-picker')

    // —— 单月（首个无 type 的 date-picker）——
    const single = page.locator('oas-date-picker:not([type])').first()
    await expect(single).toHaveAttribute('data-mobile-sheet', '')
    await single.locator('[part="trigger"]').click()
    await page.waitForFunction(
      () =>
        document.querySelector('oas-date-picker')!.shadowRoot!.querySelector('oas-bottom-sheet')!.hasAttribute('open'),
      null,
      { timeout: 5000 },
    )
    // 等底部抽屉升起动画落定再量几何
    await page.waitForFunction(
      () => {
        const el = document.querySelector('oas-date-picker')!
        const sheet = el.shadowRoot!.querySelector('oas-bottom-sheet') as HTMLElement
        const panel = sheet.shadowRoot!.querySelector('.sheet') as HTMLElement
        return Math.abs(panel.getBoundingClientRect().bottom - window.innerHeight) < 1
      },
      null,
      { timeout: 5000 },
    )
    const s = await single.evaluate((el) => {
      const panel = el.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
      const day = panel.querySelector<HTMLElement>('.day')!
      const pr = panel.getBoundingClientRect()
      const dr = day.getBoundingClientRect()
      return { left: pr.left, right: pr.right, cellW: dr.width, cellH: dr.height, vw: window.innerWidth }
    })
    // 面板水平居中：左右边距对称（≤2px 容差）
    expect(
      Math.abs(s.left - (s.vw - s.right)),
      `单月面板应水平居中（左边距 ${Math.round(s.left)} / 右边距 ${Math.round(s.vw - s.right)}）`,
    ).toBeLessThanOrEqual(2)
    // 日格触摸友好：宽 ≥ 40px（≈44 触摸目标）
    expect(s.cellW, `日格宽度 ${Math.round(s.cellW)}px 应触摸友好（≥40）`).toBeGreaterThanOrEqual(40)
    // 日格触控目标抬升：移动形态下日格高度 ≥44px（--oas-touch-target-min）
    expect(s.cellH, `移动形态日格高度 ${Math.round(s.cellH)}px 应 ≥44px（触摸目标）`).toBeGreaterThanOrEqual(44)

    // 收起单月
    await single.evaluate((el) => {
      const sheet = el.shadowRoot!.querySelector('oas-bottom-sheet') as HTMLElement
      sheet.shadowRoot!.querySelector<HTMLElement>('.backdrop')!.click()
    })
    await page.waitForFunction(
      () =>
        !document.querySelector('oas-date-picker')!.shadowRoot!.querySelector('oas-bottom-sheet')!.hasAttribute('open'),
      null,
      { timeout: 5000 },
    )

    // —— 范围（type=daterange）：双月堆叠成单列 ——
    const range = page.locator('oas-date-picker[type="daterange"]').first()
    await range.locator('[part="trigger"]').click()
    await page.waitForFunction(
      () =>
        document
          .querySelector('oas-date-picker[type="daterange"]')!
          .shadowRoot!.querySelector('oas-bottom-sheet')!
          .hasAttribute('open'),
      null,
      { timeout: 5000 },
    )
    const g = await range.evaluate((el) => {
      const grids = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.range-grid')]
      const a = grids[0]!.getBoundingClientRect()
      const b = grids[1]!.getBoundingClientRect()
      return { aBottom: a.bottom, bTop: b.top }
    })
    // 第二月在第一月下方（堆叠），而非并排
    expect(
      g.bTop,
      `范围第二月应堆叠在第一月下方（第二月 top=${Math.round(g.bTop)} 应 ≥ 第一月 bottom=${Math.round(g.aBottom)}）`,
    ).toBeGreaterThanOrEqual(g.aBottom - 1)
  } finally {
    await ctx.close()
  }
})

test('date-picker 月/年/区间面板：内容铺满不留右侧空白（非范围收窄为 240）', async ({ page }) => {
  // 曾现 bug：月/年网格的 fr 轨道在 shrink-to-fit 容器下塌缩到内容宽，把面板撑到 378/431 且右侧留大片
  // 空白；范围面板两栏按内容宽排布、右侧同样留白。修复：非范围面板收窄为 240 + 网格显式等宽 + range-grid 均分。
  await page.goto('/components/date-picker.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-date-picker')
  const closePanel = (sel: string) =>
    page.evaluate((s) => {
      const trig = document.querySelector(s)!.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement
      trig.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
      trig.blur()
    }, sel)
  for (const [name, sel] of [
    ['month', 'oas-date-picker[type="month"]'],
    ['year', 'oas-date-picker[type="year"]'],
    ['monthrange', 'oas-date-picker[type="monthrange"]'],
    ['yearrange', 'oas-date-picker[type="yearrange"]'],
    ['daterange', 'oas-date-picker[type="daterange"]'],
  ] as const) {
    const host = page.locator(sel).first()
    await host.scrollIntoViewIfNeeded()
    await host.locator('[part="trigger"]').click()
    await page.waitForFunction(
      (s) => document.querySelector(s)?.shadowRoot?.querySelector('[part="dropdown"]')?.classList.contains('open'),
      sel,
      { timeout: 5000 },
    )
    const r = await host.evaluate((el) => {
      const panel = el.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
      const pr = panel.getBoundingClientRect()
      const rs = [...panel.querySelectorAll<HTMLElement>('.month-cell, .year-cell, .quarter-cell, .day')].map((c) =>
        c.getBoundingClientRect(),
      )
      return {
        panelW: pr.width,
        blankRight: pr.right - Math.max(...rs.map((x) => x.right)),
        blankLeft: Math.min(...rs.map((x) => x.left)) - pr.left,
      }
    })
    expect(r.blankRight, `${name} 面板右侧不应留大片空白`).toBeLessThanOrEqual(2)
    expect(r.blankLeft, `${name} 面板左侧不应留白`).toBeLessThanOrEqual(2)
    if (name === 'month' || name === 'year') {
      expect(r.panelW, `${name} 非范围面板应收窄为 240`).toBeCloseTo(240, 0)
    }
    await closePanel(sel)
  }
})

test('date-picker 单元格渲染：template[slot=cell] 内容保留、每个日格有数字与标记点', async ({ page }) => {
  // 曾现 bug：docs demo 里的 <template slot="cell"> 被 Vue 编译管线吞空，组件克隆到空模板 →
  // 日格 textContent 被清空，42 个日期数字全消失（只剩背景块）。修复：demo 宿主加 v-pre。
  await page.goto('/components/date-picker.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#date-picker-cell-render')
  const host = page.locator('#date-picker-cell-render')
  await host.locator('[part="trigger"]').click()
  await page.waitForFunction(
    () => {
      const el = document.querySelector('#date-picker-cell-render')
      const dd = el?.shadowRoot?.querySelector('[part="dropdown"]')
      return !!dd?.classList.contains('open') && !!el?.shadowRoot?.querySelector('.day')
    },
    null,
    { timeout: 5000 },
  )
  const r = await host.evaluate((el) => {
    const tpl = el.querySelector('template[slot="cell"]')
    const days = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.day')]
    return {
      hasTemplateContent: !!tpl && tpl.innerHTML.trim().length > 0,
      dayCount: days.length,
      withNumber: days.filter((d) => /\d/.test(d.textContent ?? '')).length,
      dotCount: el.shadowRoot!.querySelectorAll('.day .cell-dot').length,
    }
  })
  expect(r.hasTemplateContent, 'template[slot=cell] 内容应被保留').toBe(true)
  expect(r.dayCount).toBeGreaterThan(0)
  expect(r.withNumber, '每个日格都应有日期数字').toBe(r.dayCount)
  // 标记点只给固定几天（2026-08-10/20/28）：曾误把 .cell-dot 放进模板，导致每格都长红点
  expect(r.dotCount, '标记点应只出现在固定几天，不能每格都有').toBe(3)
})
