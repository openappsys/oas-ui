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

// ---- 能力缺口 P2：label / placement / suffix-icon / option 插槽 ----

test('cascader placement 12 向：right-start 声明后面板弹出在触发器侧方（几何不变量，翻转自适应断言）', async ({
  page,
}) => {
  await page.goto('/components/cascader.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cs-placement-right')
  const host = page.locator('#cs-placement-right')
  // e2e 指针先 scrollIntoView
  await host.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await host.locator('[part="trigger"]').click()
  await page.waitForFunction(() => {
    const el = document.querySelector('#cs-placement-right')!
    return el.shadowRoot!.querySelector('[part="dropdown"]')!.classList.contains('open')
  })
  const g = await host.evaluate((el) => {
    const trig = el.shadowRoot!.querySelector('[part="trigger"]')!.getBoundingClientRect()
    const drop = el.shadowRoot!.querySelector('[part="dropdown"]')!.getBoundingClientRect()
    return {
      anchorLeft: trig.left,
      anchorTop: trig.top,
      anchorRight: trig.right,
      panelLeft: drop.left,
      panelTop: drop.top,
      panelRight: drop.right,
      panelWidth: drop.width,
      vw: window.innerWidth,
    }
  })
  const fitsRight = g.anchorRight + g.panelWidth + 8 <= g.vw
  if (fitsRight) {
    // right 主轴 + start 对齐：面板左缘在锚点右缘之后、顶缘对齐锚点顶缘
    expect(g.panelLeft, 'right 主轴：面板在锚点右侧').toBeGreaterThanOrEqual(g.anchorRight + 4)
    expect(g.panelTop, 'start 对齐：面板顶缘对齐锚点顶缘').toBeLessThanOrEqual(g.anchorTop + 1)
  } else {
    // 右侧空间不足自动翻转（浮层引擎既有机制）：面板右缘在锚点左缘之前
    expect(g.panelRight, '翻转 left：面板在锚点左侧').toBeLessThanOrEqual(g.anchorLeft - 4)
  }
})

test('cascader option 插槽：图标模板克隆进选项行，data-option-label 绑定选项文本', async ({ page }) => {
  await page.goto('/components/cascader.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cs-option-slot')
  const host = page.locator('#cs-option-slot')
  await host.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await host.locator('[part="trigger"]').click()
  await page.waitForFunction(() => {
    const el = document.querySelector('#cs-option-slot')!
    return !!el.shadowRoot!.querySelector('.panel [role="option"]')
  })
  const r = await host.evaluate((el) => {
    const row = el.shadowRoot!.querySelector('.panel [role="option"]')!
    return {
      label: row.querySelector('[data-option-label]')?.textContent ?? '',
      rowText: row.textContent ?? '',
    }
  })
  expect(r.label, 'data-option-label 绑定选项 label').toBe('浙江')
  expect(r.rowText, '模板图标进入选项行').toContain('📍')
})

// ===== 能力缺口 D4：virtual 面板列虚拟滚动（长列性能 + 键盘不越界 + 选中回显） =====

test('cascader virtual（D4）：千级长列窗口渲染 + 面板高度恒定 + 键盘跟随 + 深层选中回显', async ({ page }) => {
  await page.goto('/components/cascader.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cs-virtual')
  const host = page.locator('#cs-virtual')
  // e2e 指针先 scrollIntoView
  await host.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await host.locator('[part="trigger"]').click()
  await page.waitForFunction(() => {
    const el = document.querySelector('#cs-virtual')!
    const vl = el.shadowRoot!.querySelector('.panel oas-virtual-list')
    return vl != null && !vl.hasAttribute('hidden') && (vl as any).shadowRoot?.querySelector('[role="option"]') != null
  })
  const opened = await host.evaluate((el) => {
    const vl = el.shadowRoot!.querySelector('.panel oas-virtual-list')!
    const rows = [...vl.shadowRoot!.querySelectorAll<HTMLElement>('[role="option"]')]
    const panel = el.shadowRoot!.querySelector<HTMLElement>('.panel')!
    const vp = vl.shadowRoot!.querySelector<HTMLElement>('.viewport')!
    return {
      windowRows: rows.length,
      total: JSON.parse(el.getAttribute('options') ?? '[]').length,
      viewportHeight: vp.style.height,
      panelMaxHeight: panel.style.maxHeight,
      firstIndex: rows[0]?.getAttribute('data-index'),
    }
  })
  // 窗口渲染：可见行数远小于 1000，视口高度恒定 240，面板不撑爆（max-height none = 滚动交给 vlist）
  expect(opened.total).toBe(1000)
  expect(opened.windowRows, '虚拟窗口应远小于全量 1000').toBeLessThan(30)
  expect(opened.viewportHeight, 'vlist 视口高度恒定 240px').toBe('240px')
  expect(opened.panelMaxHeight, '虚拟列解除面板自身 max-height（滚动交给 vlist）').toBe('none')
  expect(opened.firstIndex).toBe('0')
  // 键盘导航：展开后组件把焦点交给 dropdown（syncDropdown → dropdown.focus()），
  // 真实按键 ↓ ×30 不越界，窗口跟随高亮行
  for (let i = 0; i < 30; i++) await page.keyboard.press('ArrowDown')
  await page.waitForFunction(() => {
    const vl = document.querySelector('#cs-virtual')!.shadowRoot!.querySelector('.panel oas-virtual-list')!
    const active = [...vl.shadowRoot!.querySelectorAll<HTMLElement>('[role="option"]')].find((r) =>
      r.classList.contains('active'),
    )
    return active?.getAttribute('data-index') === '30'
  })
  const keyed = await host.evaluate((el) => {
    const vl = el.shadowRoot!.querySelector('.panel oas-virtual-list')!
    return vl.shadowRoot!.querySelector<HTMLElement>('.viewport')!.scrollTop
  })
  expect(keyed, '窗口应随键盘导航滚动').toBeGreaterThan(0)
  // 深层选中回显：滚动到长列末尾窗口，点第 999 项下钻 → 点叶子提交 → 触发器文本 + 可见反馈
  await host.evaluate((el) => {
    const vl = el.shadowRoot!.querySelector('.panel oas-virtual-list')!
    const vp = vl.shadowRoot!.querySelector<HTMLElement>('.viewport')!
    vp.scrollTop = vp.scrollHeight // 滚到末尾（浏览器夹取到 max）
    vp.dispatchEvent(new Event('scroll'))
  })
  await page.waitForFunction(() => {
    const vl = document.querySelector('#cs-virtual')!.shadowRoot!.querySelector('.panel oas-virtual-list')!
    return [...vl.shadowRoot!.querySelectorAll<HTMLElement>('[role="option"]')].some(
      (r) => r.getAttribute('data-index') === '999',
    )
  })
  await host.evaluate((el) => {
    const vl = el.shadowRoot!.querySelector('.panel oas-virtual-list')!
    const row = [...vl.shadowRoot!.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (r) => r.getAttribute('data-index') === '999',
    )!
    row.click()
  })
  // 下钻后第二列（短列）普通渲染，点击叶子提交
  await page.waitForFunction(() => {
    const el = document.querySelector('#cs-virtual')!
    const panels = el.shadowRoot!.querySelectorAll('.panel')
    return panels.length === 2 && panels[1]!.querySelector('[role="option"]') != null
  })
  await host.evaluate((el) => {
    const leaf = el
      .shadowRoot!.querySelectorAll<HTMLElement>('.panel')[1]!
      .querySelector<HTMLElement>('[role="option"]')!
    leaf.click()
  })
  await expect(host.locator('[part="value"]')).toContainText('项目 999 / 999-子')
  await expect(page.locator('#cs-virtual-output')).toContainText('v999 / c999')
})
