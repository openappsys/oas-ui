// 复核回归：tree-select——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { panelGeometryAcrossOpens, up } from './helpers'

test('tree-select check-strategy：parent/child 勾选父级后值按策略过滤并可见回显', async ({ page }) => {
  await page.goto('/components/tree-select.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ts-strategy-parent')
  // parent：勾选根节点「前端」→ value 只含 fe
  await page.locator('#ts-strategy-parent [part="trigger"]').click()
  await page.locator('#ts-strategy-parent [role="treeitem"]').first().click()
  await page.waitForFunction(
    () => document.querySelector('#ts-strategy-parent')?.getAttribute('value') === '["fe"]',
    null,
    { timeout: 5000 },
  )
  // 可见反馈：输出 span 回显选中值
  expect(await page.locator('#ts-out-parent').textContent()).toBe('[fe]')
  // 关闭 parent 下拉，避免其浮层遮挡下方 child 触发器
  await page.locator('#ts-strategy-parent [part="trigger"]').press('Escape')
  // child：勾选根节点「前端」→ value 只含叶子
  await page.locator('#ts-strategy-child [part="trigger"]').click()
  await page.locator('#ts-strategy-child [role="treeitem"]').first().click()
  await page.waitForFunction(
    () => {
      const v = document.querySelector('#ts-strategy-child')?.getAttribute('value')
      // demo 数据中 框架 的子节点顺序为 Vue 在前 React 在后
      return v === '["vue","react","css"]'
    },
    null,
    { timeout: 5000 },
  )
  expect(await page.locator('#ts-out-child').textContent()).toBe('[vue, react, css]')
})

test('tree-select virtual：万级节点窗口化渲染、滚动窗口平移、行 ARIA 保持', async ({ page }) => {
  await page.goto('/components/tree-select.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ts-virtual')
  // 等注入的万级数据就绪（onMounted 经 options 属性通道写入）
  await page.waitForFunction(
    () => document.querySelector('#ts-virtual')?.getAttribute('options')?.includes('"m-99-99"'),
    null,
    { timeout: 10000 },
  )
  await page.locator('#ts-virtual [part="trigger"]').click()
  await page.waitForFunction(
    () => {
      const el = document.querySelector('#ts-virtual')!
      return (
        el.shadowRoot!.querySelector('oas-virtual-list')!.shadowRoot!.querySelectorAll('[role="treeitem"]').length > 0
      )
    },
    null,
    { timeout: 5000 },
  )
  const info = await page.evaluate(() => {
    const el = document.querySelector('#ts-virtual')!
    const vlist = el.shadowRoot!.querySelector('oas-virtual-list')!
    const rows = [...vlist.shadowRoot!.querySelectorAll('[role="treeitem"]')]
    const vp = vlist.shadowRoot!.querySelector('.viewport')!
    return {
      rendered: rows.length,
      first: rows[0]?.getAttribute('data-index'),
      itemsRole: vlist.getAttribute('items-role'),
      itemRole: vlist.getAttribute('item-role'),
      ariaLevel: rows[0]?.getAttribute('aria-level'),
      viewportTabindex: vp.getAttribute('tabindex'),
    }
  })
  expect(info.rendered).toBeLessThanOrEqual(20) // 万级只渲染窗口 + buffer
  expect(info.first).toBe('0')
  expect(info.itemsRole).toBe('tree')
  expect(info.itemRole).toBe('presentation')
  expect(info.ariaLevel).toBe('1')
  expect(info.viewportTabindex).toBeNull // 键盘焦点保持在 trigger（combobox 键盘流）

  // 全部展开 → 可见节点 10100（100 部门 + 10000 成员），窗口化渲染仍受限
  await page.evaluate(() => {
    const depts = Array.from({ length: 100 }, (_, i) => `dept-${i}`)
    document.querySelector('#ts-virtual')!.setAttribute('expanded', JSON.stringify(depts))
  })
  await page.waitForFunction(
    () => {
      const el = document.querySelector('#ts-virtual')!
      const inner = el
        .shadowRoot!.querySelector('oas-virtual-list')!
        .shadowRoot!.querySelector('.inner') as HTMLElement | null
      return !!inner && inner.style.height !== '' && Number.parseInt(inner.style.height, 10) > 100000
    },
    null,
    { timeout: 5000 },
  )

  // 滚动到 5000 行附近 → 窗口平移（真实浏览器 scroll 驱动 vlist 重算）
  const after = await page.evaluate(
    () =>
      new Promise<{ first: string | null | undefined; count: number }>((resolve) => {
        const el = document.querySelector('#ts-virtual')!
        const vlist = el.shadowRoot!.querySelector('oas-virtual-list')!
        const vp = vlist.shadowRoot!.querySelector('.viewport')!
        vp.scrollTop = 5000 * 36
        vp.dispatchEvent(new Event('scroll'))
        requestAnimationFrame(() => {
          const rows = [...vlist.shadowRoot!.querySelectorAll('[role="treeitem"]')]
          resolve({ first: rows[0]?.getAttribute('data-index'), count: rows.length })
        })
      }),
  )
  expect(after.first).toBe('4996')
  expect(after.count).toBe(16)
})

test('tree-select virtual：键盘导航高亮滚动进视口且 aria-activedescendant 跟随', async ({ page }) => {
  await page.goto('/components/tree-select.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ts-virtual')
  await page.waitForFunction(
    () => document.querySelector('#ts-virtual')?.getAttribute('options')?.includes('"m-99-99"'),
    null,
    { timeout: 10000 },
  )
  const btn = page.locator('#ts-virtual [part="trigger"]')
  await btn.click()
  for (let i = 0; i < 30; i++) await btn.press('ArrowDown')
  await expect(btn).toHaveAttribute('aria-activedescendant', 'tree-opt-30', { timeout: 5000 })
  // 高亮项滚动进视口（viewport scrollTop > 0）
  const scrolled = await page.evaluate(() => {
    const el = document.querySelector('#ts-virtual')!
    const vp = el.shadowRoot!.querySelector('oas-virtual-list')!.shadowRoot!.querySelector('.viewport')!
    return vp.scrollTop
  })
  expect(scrolled).toBeGreaterThan(0)
  // Enter 勾选高亮行 → value 写回（trigger 显示成员标签，可见反馈）
  await btn.press('Enter')
  await page.waitForFunction(
    () => document.querySelector('#ts-virtual')?.getAttribute('value')?.includes('m-0-29'),
    null,
    { timeout: 5000 },
  )
})

// —— 缺陷 10：popover 画布文字竖排 + tree 自定义节点文字被压没 + tooltip/popover 无箭头 ——
// 曾现 bug1：popover.md 虚拟画布 #virt-canvas 无 in-flow 子元素，在 DemoBlock 的 flex 容器里
//           宽度坍缩到 0，画布内提示 <p>（flex center）在 0 宽下每字一行竖排。
// 曾现 bug2：tree .label 是 min-width:0 + overflow:hidden 的 flex 子项，dev/SSR 下被压缩到 0 宽，
//           自定义节点文字（glyph 可见文字没有）完全不可见。
// 曾现 bug3：tooltip/popover 完全没有箭头元素（grep arrow 零结果），用户期望小箭头指向锚点。

// 移动端专项：bottom-sheet 底部抽屉承载（data-mobile-sheet 标记 + sheet open + dropdown 静态化 + oas-close 同步收起）
test('tree-select 移动端：底部抽屉贴视口底展开 + 搜索/树面板可用 + 点遮罩同步收起', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  try {
    await page.goto('/components/tree-select.html', { waitUntil: 'domcontentloaded' })
    await up(page, 'oas-tree-select')
    const host = page.locator('oas-tree-select').first()
    await expect(host).toHaveAttribute('data-mobile-sheet', '')
    await host.locator('[part="trigger"]').click()
    await page.waitForFunction(
      () => {
        const root = document.querySelector('oas-tree-select')!.shadowRoot!
        return root.querySelector('[part="dropdown"]')!.classList.contains('open')
      },
      null,
      { timeout: 5000 },
    )
    // 等底部抽屉升起动画落定（transform 收敛、面板贴视口底）后再量几何，避免量到动画中途
    await page.waitForFunction(
      () => {
        const root = document.querySelector('oas-tree-select')!.shadowRoot!
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
        treeitems: dropdown.querySelectorAll('[role="treeitem"]').length,
      }
    })
    expect(info.sheetOpen, '移动端展开时 sheet 应带 open').toBe(true)
    expect(info.sheetPassive, '移动端 sheet 应去 passive 变容器').toBe(false)
    expect(info.dropdownPosition, '移动端 dropdown 应静态化').toBe('static')
    expect(Math.abs(info.panelBottom - info.vh), '抽屉面板应贴视口底（≤1px 亚像素容差）').toBeLessThanOrEqual(1)
    expect(info.panelLeft, '抽屉面板应左贴视口').toBe(0)
    expect(Math.abs(info.panelRight - info.vw), '抽屉面板应右贴视口（≤1px 亚像素容差）').toBeLessThanOrEqual(1)
    expect(info.backdropOpacity, '遮罩应可见').toBeGreaterThan(0.5)
    expect(info.treeitems, '抽屉内树面板应可交互（有节点）').toBeGreaterThan(0)
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

test('tree-select 浮层定位：首开左缘对齐 trigger 且与再开一致', async ({ page }) => {
  // 曾现 bug：与 select 同根因——先按面板固有宽度算 left，后设 style.width 撑到 trigger 宽度，
  // 首开左缘偏右（实测 +83px），再开才对齐。不变量：左缘对齐且首开/再开一致。
  await page.goto('/components/tree-select.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tree-select')
  const g = await panelGeometryAcrossOpens(page, 'oas-tree-select', async (host) => {
    await host.locator('[part="trigger"]').click()
  })
  expect(Math.abs(g.first.left - g.first.anchorLeft)).toBeLessThanOrEqual(1)
  expect(Math.abs(g.first.left - g.second.left)).toBeLessThanOrEqual(1)
})
