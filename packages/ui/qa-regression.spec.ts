import { test, expect } from '@playwright/test'

// 复核回归：把历次人工复核发现并修复的缺陷固化为断言，防止复发。
// 覆盖：选中态可见性、纵向布局、圆角合并、hover 可读性、addon 属性存活、点击不滚动、demo 事件反馈。

async function up(p: import('@playwright/test').Page, sel: string) {
  await p.waitForSelector(sel, { timeout: 15000 })
  await p.waitForFunction((s) => document.querySelector(s)?.shadowRoot != null, sel, {
    timeout: 15000,
  })
}

test('button-group 单选选中态可见（primary 字 + 浅底）', async ({ page }) => {
  await page.goto('/components/button-group.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button-group oas-button')
  const r = await page.evaluate(() => {
    const group = document.querySelector('oas-button-group[value]')!
    const sel = [...group.querySelectorAll('oas-button')].find(
      (b) => b.getAttribute('aria-pressed') === 'true',
    )!
    const cs = getComputedStyle(sel.shadowRoot!.querySelector('[part=button]')!)
    return { color: cs.color, bg: cs.backgroundColor }
  })
  expect(r.color).not.toBe('rgb(24, 24, 27)') // 不能与普通按钮同色
  expect(r.bg).not.toBe('rgb(255, 255, 255)')
})

test('button-group 多选点击切换选中态', async ({ page }) => {
  await page.goto('/components/button-group.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button-group[multiple] oas-button')
  const b = page.locator('oas-button-group[multiple] oas-button[value="b"]')
  const before = await b.getAttribute('aria-pressed')
  await b.click()
  await page.waitForFunction(
    () =>
      document
        .querySelector('oas-button-group[multiple] oas-button[value="b"]')
        ?.getAttribute('aria-pressed') !== 'false',
    null,
    { timeout: 5000 },
  )
  const after = await b.getAttribute('aria-pressed')
  expect(after).toBe('true')
  expect(before).toBe('false')
})

test('button-group 纵向布局生效 + 圆角合并', async ({ page }) => {
  await page.goto('/components/button-group.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button-group[vertical] oas-button')
  const r = await page.evaluate(() => {
    const group = document.querySelector('oas-button-group[vertical]')!
    const inner = group.shadowRoot!.querySelector('[part=group]')!
    const cs = getComputedStyle(inner)
    const btns = [...group.querySelectorAll('oas-button')]
    const boxes = btns.map((b) => b.getBoundingClientRect())
    const radii = btns.map((b) => {
      const c = getComputedStyle(b.shadowRoot!.querySelector('[part=button]')!)
      return `${c.borderTopLeftRadius},${c.borderTopRightRadius},${c.borderBottomRightRadius},${c.borderBottomLeftRadius}`
    })
    return {
      flexDirection: cs.flexDirection,
      stackedVertically: boxes[1]!.y > boxes[0]!.y && boxes[1]!.x === boxes[0]!.x,
      radii,
    }
  })
  expect(r.flexDirection).toBe('column')
  expect(r.stackedVertically).toBe(true)
  expect(r.radii[0]).toBe('6px,6px,0px,0px') // 首：上圆角
  expect(r.radii[1]).toBe('0px,0px,0px,0px') // 中：直角
  expect(r.radii[2]).toBe('0px,0px,6px,6px') // 尾：下圆角
})

test('button-group 横向圆角合并', async ({ page }) => {
  await page.goto('/components/button-group.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button-group oas-button')
  const r = await page.evaluate(() => {
    const group = document.querySelector('oas-button-group')!
    return [...group.querySelectorAll('oas-button')].map((b) => {
      const c = getComputedStyle(b.shadowRoot!.querySelector('[part=button]')!)
      return `${c.borderTopLeftRadius},${c.borderTopRightRadius}`
    })
  })
  expect(r[0]).toBe('6px,0px')
  expect(r[1]).toBe('0px,0px')
  expect(r[2]).toBe('0px,6px')
})

test('tag primary clickable hover 文字可读（白字）', async ({ page }) => {
  await page.goto('/components/tag.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tag[clickable][type="primary"]')
  const tag = page.locator('oas-tag[clickable][type="primary"]').first()
  await tag.hover()
  const r = await tag.evaluate((el) => {
    const cs = getComputedStyle(el.shadowRoot!.querySelector('.tag')!)
    return { color: cs.color, bg: cs.backgroundColor }
  })
  expect(r.color).toBe('rgb(255, 255, 255)') // 白字不被主题色覆盖
  expect(r.bg).not.toBe(r.color) // 底与字不同色
})

test('link href="#" 点击不滚动页面', async ({ page }) => {
  await page.goto('/components/link.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-link')
  const link = page.locator('.demo-block', { hasText: '点击事件' }).locator('oas-link')
  await link.scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  const before = await page.evaluate(() => window.scrollY)
  await link.click()
  await page.waitForTimeout(300)
  const after = await page.evaluate(() => window.scrollY)
  expect(after).toBe(before)
  expect(after).toBeGreaterThan(0)
})

test('input addon 属性在 Vue demo 中存活并渲染', async ({ page }) => {
  await page.goto('/components/input.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-input[addon-before]')
  const attrs = await page.evaluate(() =>
    [...document.querySelectorAll('oas-input')].map((el) => el.getAttribute('addon-before')),
  )
  expect(attrs.some((v) => v !== null)).toBe(true)
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-input[addon-before]')!
    return el.shadowRoot?.querySelector('[part="prepend"]')?.textContent ?? null
  })
  expect(r).toBe('http://')
})

test('segmented 未选中项文字对比度达标（text-primary，axe 色彩对比回归）', async ({ page }) => {
  // 曾现 bug：oas-segmented 未选中项用 --oas-color-text-secondary（#71717a）落在
  // --oas-color-bg-hover（#f4f4f5）上对比度 4.39:1 < 4.5:1，form.html 栅格表单 demo
  // 用 segmented 切 label-align 时被 axe 审计揪出；修复为 text-primary。
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-segmented#form-align-switch')
  const r = await page.evaluate(() => {
    const seg = document.querySelector('#form-align-switch')!
    const root = seg.shadowRoot!
    const items = [...root.querySelectorAll<HTMLElement>('[part="item"]')]
    const group = root.querySelector<HTMLElement>('.group')!
    return {
      unselectedColor: getComputedStyle(items[1]!).color,
      groupBg: getComputedStyle(group).backgroundColor, // 轨道色，item 与之构成对比对
      selectedChecked:
        items
          .find((b) => b.getAttribute('aria-checked') === 'true')
          ?.getAttribute('aria-checked') ?? null,
    }
  })
  // 未选中项应为 text-primary（#18181b），而非 text-secondary（#71717a）——
  // 与 bg-hover 轨道（#f4f4f5）的对比从 4.39:1 提升到 >15:1
  expect(r.unselectedColor).toBe('rgb(24, 24, 27)')
  expect(r.groupBg).toBe('rgb(244, 244, 245)')
  expect(r.selectedChecked).toBe('true')
})

test('demo 事件反馈（点击 button 弹出 message）', async ({ page }) => {
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, {
    timeout: 10000,
  })
  await page.locator('.demo-block', { hasText: '点击事件' }).locator('oas-button').click()
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length > 0, null, {
    timeout: 5000,
  })
  const n = await page.evaluate(() => document.querySelectorAll('oas-message').length)
  expect(n).toBeGreaterThan(0)
})

test('table SPA 导航后数据不丢（Vue property 赋值反射到 attribute）', async ({ page }) => {
  // 曾现 bug：oas-table 的 data/columns 是 class 字段，Vue SPA 渲染时走 property 赋值而非
  // setAttribute，组件只读 attribute → 表格空，强刷（SSR attribute 水合）才有数据。
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('a[href="/components/table.html"]', {
    state: 'attached',
    timeout: 10000,
  })
  // 折叠侧栏里的链接不可见，直接 DOM click 走 Vue Router（等价用户 SPA 点进去）
  await page.evaluate(() => {
    document.querySelector<HTMLAnchorElement>('a[href="/components/table.html"]')!.click()
  })
  await page.waitForURL('**/components/table.html')
  await page.waitForSelector('oas-table', { timeout: 10000 })
  await page.waitForTimeout(800)
  const r = await page.evaluate(() =>
    [...document.querySelectorAll('oas-table')].map((t) => ({
      rows: t.shadowRoot?.querySelectorAll('tbody tr').length ?? -1,
      dataLen: t.getAttribute('data')?.length ?? 0,
    })),
  )
  // dataLen>2（非空 data="[]"）的表格必须渲染出数据行
  const nonEmpty = r.filter((t) => t.dataLen > 2)
  expect(nonEmpty.length).toBeGreaterThan(5)
  for (const t of nonEmpty) {
    expect(t.rows, `表格数据 ${t.dataLen}B 但行数 ${t.rows}`).toBeGreaterThan(0)
  }
})

test('tree 虚拟滚动渲染真实 label 且行样式生效', async ({ page }) => {
  // 曾现 bug1：virtual-list 先写 String(item) 兜底文本再派发 oas-item，[object Object] 与真实行并存。
  // 曾现 bug2：虚拟行样式写在 tree 的 shadow 里用 `oas-virtual-list::part(item) .row` 选择器，
  //           ::part() 后不支持链后代选择器 → 全部静默失效（裸按钮、leaf 占位符外露）。
  //           修复为注入 VIRTUAL_ROW_STYLE 到 vlist 的 shadow root。
  await page.goto('/components/tree.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tree-virtual')
  await page.waitForTimeout(800)
  const r = await page.evaluate(() => {
    const tree = document.querySelector('#tree-virtual')!
    const vlist = tree.shadowRoot!.querySelector('oas-virtual-list')!
    const vroot = vlist.shadowRoot!
    const items = [...vroot.querySelectorAll('[part=item]')]
    const firstRow = items[0]?.querySelector('.row')
    const toggle = firstRow?.querySelector('.toggle')
    const leafToggle = items[1]?.querySelector('.toggle.leaf')
    const viewport = vroot.querySelector('[part=viewport]')!
    return {
      hasObjectObject: items.some((el) => el.textContent?.includes('[object Object')),
      firstLabel: firstRow?.querySelector('.label')?.textContent ?? '',
      styleInjected: !!vroot.querySelector('style[data-oas-tree-rows]'),
      rowDisplay: firstRow ? getComputedStyle(firstRow).display : '',
      toggleBorder: toggle ? getComputedStyle(toggle).borderStyle : '',
      leafVisibility: leafToggle ? getComputedStyle(leafToggle).visibility : '',
      // 曾现 bug3：height 属性只用于窗口计算，视口 height:100% 被撑高容器拉到 16 万 px
      viewportHeight: viewport.getBoundingClientRect().height,
      viewportScrollable: viewport.scrollHeight > viewport.clientHeight,
    }
  })
  expect(r.hasObjectObject).toBe(false)
  expect(r.firstLabel).toContain('节点')
  expect(r.styleInjected).toBe(true)
  expect(r.rowDisplay).toBe('flex')
  expect(r.toggleBorder).toBe('none')
  expect(r.leafVisibility).toBe('hidden')
  expect(r.viewportHeight).toBe(360)
  expect(r.viewportScrollable).toBe(true)
  // hover 背景（Playwright CSS 选择器自动穿透 open shadow DOM）
  const firstRow = page.locator('#tree-virtual oas-virtual-list [part=item] .row').first()
  await firstRow.hover()
  await page.waitForTimeout(200)
  const hoverBg = await firstRow.evaluate((row) => getComputedStyle(row).backgroundColor)
  expect(hoverBg).not.toBe('rgba(0, 0, 0, 0)')
})

test('virtual-list 独立页：items 升级前赋值回收 + 视口高度受限', async ({ page }) => {
  // 曾现 bug：demo 在 onMounted 用 basic.items = [...] 赋值，若此时组件未升级
  // （模块动态 import 与 onMounted 时序竞争），自有属性遮蔽原型 setter → 不渲染。
  // 另有视口 height 不落 CSS 高度的同款撑高问题。
  await page.goto('/components/virtual-list.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-virtual-list')
  await page.waitForTimeout(600)
  const r = await page.evaluate(() =>
    [...document.querySelectorAll('oas-virtual-list')].map((vlist) => {
      const viewport = vlist.shadowRoot!.querySelector('[part=viewport]')
      return {
        itemCount: vlist.shadowRoot!.querySelectorAll('[part=item]').length,
        viewportHeight: viewport?.getBoundingClientRect().height ?? -1,
        scrollable: viewport ? viewport.scrollHeight > viewport.clientHeight : true,
      }
    }),
  )
  expect(r.length).toBeGreaterThan(0)
  for (const [i, v] of r.entries()) {
    expect(v.itemCount, `第 ${i} 个 virtual-list 未渲染`).toBeGreaterThan(0)
    if (v.viewportHeight >= 0) expect(v.viewportHeight).toBeLessThanOrEqual(400)
    expect(v.scrollable).toBe(true)
  }
})

test('timeline 圆点中心与连接线中心对齐', async ({ page }) => {
  // 曾现 bug：.dot 未设 box-sizing，content-box 下总宽 14px 圆心 7px，线心 5px，偏右 2px。
  await page.goto('/components/timeline.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-timeline')
  const r = await page.evaluate(() => {
    const item = document.querySelector('oas-timeline')!.shadowRoot!.querySelector('.item')!
    const dot = item.querySelector('.dot')!
    const dotBox = dot.getBoundingClientRect()
    const itemBox = item.getBoundingClientRect()
    return {
      diff: Math.abs(dotBox.left + dotBox.width / 2 - (itemBox.left + 5)),
      dotWidth: dotBox.width,
    }
  })
  expect(r.dotWidth).toBe(10)
  expect(r.diff).toBeLessThanOrEqual(1)
})

test('tabs tab-position=right：tab 内容右对齐（justify-content: flex-end）', async ({ page }) => {
  // 曾现 bug：纵向 right 模式下 .tab 随 tablist 拉伸占满宽，但内容仍左对齐，与 left 模式不镜像。
  await page.goto('/components/tabs.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tabs[tab-position="right"]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-tabs[tab-position="right"]')!
    const tab = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"]')!
    const cs = getComputedStyle(tab)
    return {
      hostRightClass: el.classList.contains('oas-tabs--right'),
      justifyContent: cs.justifyContent,
    }
  })
  expect(r.hostRightClass).toBe(true)
  expect(r.justifyContent).toBe('flex-end')
})

test('select multiple：chip 结构完整（label + 移除按钮）且样式不拥挤', async ({ page }) => {
  // 曾现 bug：chip 无行高、label 与 × 间距仅 2px、padding 只有横向，文字贴边、行间粘连。
  await page.goto('/components/select.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-select[multiple][value]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-select[multiple][value]')!
    const chip = el.shadowRoot!.querySelector<HTMLElement>('.chip')
    if (!chip) return { chipCount: 0, hasLabel: false, hasButton: false, height: '', gap: '' }
    const cs = getComputedStyle(chip)
    return {
      chipCount: el.shadowRoot!.querySelectorAll('.chip').length,
      hasLabel: !!chip.querySelector('span'),
      hasButton: !!chip.querySelector('button'),
      height: cs.height,
      gap: cs.gap,
    }
  })
  expect(r.chipCount).toBeGreaterThan(0)
  expect(r.hasLabel).toBe(true)
  expect(r.hasButton).toBe(true)
  expect(r.height).toBe('20px')
  expect(r.gap).toBe('4px')
})

test('select 多选默认换行：标签多行展示、触发器增高、chevron 首行对齐、无 +N', async ({ page }) => {
  // 曾现 bug：多选标签被按容器宽度自动折叠为 +N（无开关总是生效），用户期望默认换行展示。
  await page.goto('/components/select.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-select[multiple][value]:not([max-tag-count])')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-select[multiple][value]:not([max-tag-count])')!
    const root = el.shadowRoot!
    const trigger = root.querySelector<HTMLElement>('[part="trigger"]')!
    const valueEl = root.querySelector<HTMLElement>('.value')!
    const chevron = root.querySelector<HTMLElement>('.chevron')!
    const chips = [...root.querySelectorAll<HTMLElement>('.chip:not(.chip-plus)')]
    const t = trigger.getBoundingClientRect()
    const chipTops = chips.map((c) => c.getBoundingClientRect().top)
    const rowCount = new Set(chipTops.map((y) => Math.round(y))).size
    const firstRowTop = Math.min(...chipTops)
    const c = chevron.getBoundingClientRect()
    return {
      wrap: getComputedStyle(valueEl).flexWrap,
      rowCount,
      plusCount: root.querySelectorAll('.chip-plus').length,
      triggerHeight: t.height,
      // chip 高 20px：chevron 中心应与首行 chip 中心对齐
      chevronOffset: Math.abs(c.top + c.height / 2 - (firstRowTop + 10)),
    }
  })
  expect(r.wrap).toBe('wrap')
  expect(r.rowCount).toBeGreaterThan(1)
  expect(r.plusCount).toBe(0)
  expect(r.triggerHeight).toBeGreaterThan(32) // 超出 --oas-control-height-md（32px）说明随内容增高
  expect(r.chevronOffset).toBeLessThanOrEqual(6)
})

test('select 折叠示例：max-tag-count 显式启用时折叠为 +N（单行 nowrap）', async ({ page }) => {
  await page.goto('/components/select.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-select[max-tag-count]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-select[max-tag-count]')!
    const root = el.shadowRoot!
    const valueEl = root.querySelector<HTMLElement>('.value')!
    const plus = root.querySelector<HTMLElement>('.chip-plus')
    return {
      wrap: getComputedStyle(valueEl).flexWrap,
      plusText: plus?.textContent ?? null,
      chipCount: root.querySelectorAll('.chip:not(.chip-plus)').length,
    }
  })
  expect(r.wrap).toBe('nowrap')
  expect(r.chipCount).toBe(2) // max-tag-count="2"
  expect(r.plusText).toBe('+2')
})

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
      (sel) =>
        document
          .querySelector(sel)
          ?.shadowRoot?.querySelector('[part="dropdown"]')
          ?.classList.contains('open'),
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
        offsetParentIsHost: dropdown.offsetParent === el,
        dropdownTop: d.top,
        triggerBottom: t.bottom,
      }
    })
    expect(r.hostPosition, `${name} :host 应为定位祖先`).toBe('relative')
    expect(r.offsetParentIsHost, `${name} dropdown 定位基准应是 host`).toBe(true)
    expect(
      r.dropdownTop - r.triggerBottom,
      `${name} 面板应贴住输入框下方（top: calc(100% + 4px)）`,
    ).toBeCloseTo(4, 1)
  }
})

test('menubar 受控：外部 setAttribute(value) 即时同步勾选（value 在 observedAttributes）', async ({
  page,
}) => {
  // 曾现 bug：value 未列入 observedAttributes，外部 setAttribute('value') 不触发 update()，
  // 勾选/高亮不移动，受控 demo 只能靠重设 items 绕开。
  await page.goto('/components/menubar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#mb-value')
  const r = await page.evaluate(() => {
    const mb = document.querySelector('#mb-value')!
    const checked = (v: string) =>
      mb
        .shadowRoot!.querySelector<HTMLElement>(`[part="item"][data-value="${v}"]`)
        ?.getAttribute('aria-checked') ?? null
    mb.setAttribute('value', 'open')
    const afterOpen = { open: checked('open'), created: checked('new') }
    mb.setAttribute('value', 'new')
    const afterNew = { open: checked('open'), created: checked('new') }
    return { afterOpen, afterNew }
  })
  expect(r.afterOpen).toEqual({ open: 'true', created: 'false' })
  expect(r.afterNew).toEqual({ open: 'false', created: 'true' })
})

test('pin-input 受控：外部动态切换 aria-invalid 即时同步 danger 边框', async ({ page }) => {
  // 曾现 bug：aria-invalid 未列入 observedAttributes，外部 setAttribute('aria-invalid') 不触发
  // update()，容器/各格不同步、danger 边框不生效（校验失败态无视觉反馈）。
  await page.goto('/components/pin-input.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#pin-invalid')
  const r = await page.evaluate(async () => {
    const el = document.querySelector('#pin-invalid')!
    const root = el.shadowRoot!
    const container = root.querySelector('[part="container"]')!
    const cell = root.querySelector('input')!
    const state = () => ({
      container: container.getAttribute('aria-invalid'),
      cell: cell.getAttribute('aria-invalid'),
      border: getComputedStyle(cell).borderColor,
    })
    el.setAttribute('aria-invalid', 'true')
    // 边框有 120ms 过渡（--oas-transition-fast）：等过渡完成再读 computed style
    await new Promise((resolve) => setTimeout(resolve, 250))
    const invalid = state()
    el.setAttribute('aria-invalid', 'false')
    await new Promise((resolve) => setTimeout(resolve, 250))
    const restored = state()
    return { invalid, restored }
  })
  expect(r.invalid.container).toBe('true')
  expect(r.invalid.cell).toBe('true')
  expect(r.invalid.border).not.toBe(r.restored.border) // danger 边框 ≠ 默认边框
  expect(r.restored.container).toBe('false')
})

test('select 展开态 active 选项在暗色主题下文字/背景对比度 ≥ 4.5（on-primary token）', async ({
  page,
}) => {
  // 曾现 bug：.option.active 硬编码 color:#fff，暗色下 primary 变亮（#4d9fff）白字仅 ~2.7:1。
  // 修复：改用 --oas-color-text-on-primary（暗色为深色文字），回归锁定对比度。
  await page.goto('/components/select.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-select')
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(200)
  const sel = page.locator('oas-select').first()
  await sel.locator('[part="trigger"]').click()
  await page.waitForFunction(() => {
    const s = document.querySelector('oas-select')
    return s?.shadowRoot?.querySelector('.option.active') != null
  })
  const r = await sel.evaluate((el) => {
    const root = el.shadowRoot!
    const active = root.querySelector<HTMLElement>('.option.active')!
    const cs = getComputedStyle(active)
    const parse = (c: string) => c.match(/\d+/g)!.slice(0, 3).map(Number)
    const lum = (rgb: number[]) => {
      const f = (v: number) => {
        v /= 255
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * f(rgb[0]!) + 0.7152 * f(rgb[1]!) + 0.0722 * f(rgb[2]!)
    }
    const a = lum(parse(cs.color))
    const b = lum(parse(cs.backgroundColor))
    return {
      color: cs.color,
      bg: cs.backgroundColor,
      ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
    }
  })
  expect(r.ratio, `暗色 active 文字 ${r.color} 落在背景 ${r.bg} 上`).toBeGreaterThanOrEqual(4.5)
})

test('select virtual：1 万条选项仅渲染可视窗口，滚动后窗口平移、滚动条可用', async ({ page }) => {
  // 曾现风险：虚拟滚动退化为全量渲染（万级 DOM 卡死）；本测试锁定「DOM 行数 ≪ 数据量」不变量。
  await page.goto('/components/select.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#select-virtual')
  const sel = page.locator('#select-virtual')
  await sel.locator('[part="trigger"]').click()
  await page.waitForFunction(() => {
    const s = document.querySelector('#select-virtual')
    const vlist = s?.shadowRoot?.querySelector('oas-virtual-list') as HTMLElement | null
    return (
      vlist != null &&
      !vlist.hidden &&
      (vlist.shadowRoot?.querySelectorAll('[role="option"]').length ?? 0) > 0
    )
  })
  const initial = await page.evaluate(() => {
    const s = document.querySelector('#select-virtual')!
    const vlist = s.shadowRoot!.querySelector('oas-virtual-list') as HTMLElement
    const vp = vlist.shadowRoot!.querySelector<HTMLElement>('.viewport')!
    const first = vlist.shadowRoot!.querySelector<HTMLElement>('[role="option"]')!
    return {
      rendered: vlist.shadowRoot!.querySelectorAll('[role="option"]').length,
      viewportHeight: vp.clientHeight,
      firstLabel: first.textContent,
    }
  })
  // 1 万条数据下只渲染窗口（240/36≈7 项 + 上下 buffer 4）
  expect(initial.rendered).toBeLessThan(30)
  expect(initial.rendered).toBeGreaterThan(3)
  expect(initial.viewportHeight).toBeGreaterThan(100)
  expect(initial.firstLabel).toContain('选项 0')
  // 滚动后窗口平移：首可见项不再是 选项 0
  await page.evaluate(() => {
    const s = document.querySelector('#select-virtual')!
    const vlist = s.shadowRoot!.querySelector('oas-virtual-list') as HTMLElement
    const vp = vlist.shadowRoot!.querySelector<HTMLElement>('.viewport')!
    vp.scrollTop = 4000
    vp.dispatchEvent(new Event('scroll'))
  })
  await page.waitForTimeout(100)
  const after = await page.evaluate(() => {
    const s = document.querySelector('#select-virtual')!
    const vlist = s.shadowRoot!.querySelector('oas-virtual-list') as HTMLElement
    const first = vlist.shadowRoot!.querySelector<HTMLElement>('[role="option"]')!
    return { firstLabel: first.textContent }
  })
  expect(after.firstLabel).not.toContain('选项 0')
  expect(after.firstLabel).toMatch(/选项 1\d{2}/)
})

test('select virtual：键盘导航高亮项滚动进视口且 aria-activedescendant 指向可见项', async ({
  page,
}) => {
  await page.goto('/components/select.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#select-virtual')
  const sel = page.locator('#select-virtual')
  await sel.locator('[part="trigger"]').click()
  await page.waitForFunction(() => {
    const s = document.querySelector('#select-virtual')
    const vlist = s?.shadowRoot?.querySelector('oas-virtual-list') as HTMLElement | null
    return (
      vlist != null &&
      !vlist.hidden &&
      (vlist.shadowRoot?.querySelectorAll('[role="option"]').length ?? 0) > 0
    )
  })
  const r = await page.evaluate(async () => {
    const s = document.querySelector('#select-virtual')!
    const trigger = s.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!
    // 连按 20 次 ↓：高亮滚出首屏，aria-activedescendant 应跟随
    for (let i = 0; i < 20; i++) {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
    const vlist = s.shadowRoot!.querySelector('oas-virtual-list') as HTMLElement
    const vp = vlist.shadowRoot!.querySelector<HTMLElement>('.viewport')!
    const desc = trigger.getAttribute('aria-activedescendant')
    const activeRow = vlist.shadowRoot!.querySelector<HTMLElement>('.option.active')
    return {
      desc,
      descId: desc ? (document.getElementById(desc)?.tagName ?? null) : null,
      activeIndex: activeRow?.getAttribute('data-index') ?? null,
      scrollTop: vp.scrollTop,
    }
  })
  expect(r.desc).toBe('opt-20')
  expect(r.activeIndex).toBe('20')
  expect(r.scrollTop).toBeGreaterThan(0) // 窗口已滚动
})

test('select 自定义选项渲染：demo 里图标 + 文本进入选项行与标签', async ({ page }) => {
  // 曾现风险：oas-option-render 的 element 绑定不回 UI（事件只进 console）；本测试锁定
  // 「宿主改写的 element 内容真的渲染进下拉」。
  await page.goto('/components/select.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#select-custom')
  const sel = page.locator('#select-custom')
  await sel.locator('[part="trigger"]').click()
  await page.waitForFunction(() => {
    const s = document.querySelector('#select-custom')
    return s?.shadowRoot?.querySelectorAll('[role="option"]').length === 4
  })
  const r = await page.evaluate(() => {
    const s = document.querySelector('#select-custom')!
    const first = s.shadowRoot!.querySelector<HTMLElement>('[role="option"]')!
    const label = first.querySelector<HTMLElement>('.option-label')!
    // 图标渲染为 span（emoji 文本），label 文本紧随其后
    return {
      optionText: first.textContent ?? '',
      labelChildCount: label.children.length,
    }
  })
  expect(r.optionText).toContain('🍎')
  expect(r.optionText).toContain('苹果')
  expect(r.labelChildCount).toBeGreaterThanOrEqual(2)
})

test('form-item label 点击聚焦 oas-input 的 shadow 内 input（focus 委托链）', async ({ page }) => {
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-form-item[label] oas-input')
  const item = page.locator('oas-form-item[label]').first()
  await item.locator('[part="label"]').click()
  await page.waitForTimeout(100)
  const r = await page.evaluate(() => {
    const item = document.querySelector<HTMLElement>('oas-form-item[label]')!
    const control = item.querySelector('oas-input')
    const inner = control?.shadowRoot?.activeElement
    return {
      hostFocused: document.activeElement === control,
      innerTag: inner?.tagName ?? null,
      sameAsInput: inner === control?.shadowRoot?.querySelector('input'),
    }
  })
  expect(r.hostFocused).toBe(true)
  expect(r.innerTag).toBe('INPUT')
  expect(r.sameAsInput).toBe(true)
})

test('size 五档：button/tag/switch 在 demo 中渲染对应 size class（不静默吞值）', async ({
  page,
}) => {
  const SIZES = ['xs', 'small', 'medium', 'large', 'xl']
  // button：shadow button 应带对应 size class
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  const buttonSizes = await page.evaluate((list) => {
    return list.map((s) => {
      const el = document.querySelector(`oas-button[size="${s}"]`)
      return el?.shadowRoot?.querySelector('button')?.classList.contains(s) ?? false
    })
  }, SIZES)
  expect(buttonSizes).toEqual([true, true, true, true, true])

  // tag：.tag 应带对应 size class
  await page.goto('/components/tag.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tag')
  const tagSizes = await page.evaluate((list) => {
    return list.map((s) => {
      const el = document.querySelector(`oas-tag[size="${s}"]`)
      return el?.shadowRoot?.querySelector('.tag')?.classList.contains(s) ?? false
    })
  }, SIZES)
  expect(tagSizes).toEqual([true, true, true, true, true])

  // switch：shadow button className 应等于对应 size（白名单修复：不再吞掉 xs/xl）
  await page.goto('/components/switch.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-switch')
  const switchSizes = await page.evaluate((list) => {
    return list.map((s) => {
      const el = document.querySelector(`oas-switch[size="${s}"]`)
      return el?.shadowRoot?.querySelector('button')?.className ?? null
    })
  }, SIZES)
  expect(switchSizes).toEqual(['xs', 'small', 'medium', 'large', 'xl'])
})

test('alert 关闭后真正隐藏：closeable 点击关闭按钮 host 视觉消失（:host([hidden]) 兜底 author display 规则）', async ({
  page,
}) => {
  await page.goto('/components/alert.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-alert[closeable]')
  const firstCloseable = page.locator('oas-alert[closeable]').first()
  const host = firstCloseable
  // 点击关闭按钮：shadow 内 [part=close]
  await host.locator('[part="close"]').click()
  // host 应视觉消失（此前 :host{display:block} 覆盖 UA [hidden]，点击后仍可见——已修复）
  await expect(host).toBeHidden()
  expect(await host.getAttribute('hidden')).not.toBeNull()
})

test('virtual-list 滚轮增量滚动不失控（overflow-anchor 回归）', async ({ page }) => {
  // 曾现 bug：虚拟滚动重渲染触发 Chrome 滚动锚定，滚轮增量逐帧放大（120 → 1056 → 2784），
  // 表现为"滚一下直接滚到底/越滚越快"。修复：.viewport/.inner 加 overflow-anchor: none。
  await page.goto('/components/virtual-list.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#vl-basic')
  await page.waitForTimeout(600)
  const box = await page.locator('#vl-basic').boundingBox()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + 50)
  const scrollTop = () =>
    page.evaluate(() => {
      const el = document.querySelector('#vl-basic')!
      return el.shadowRoot!.querySelector('[part=viewport]')!.scrollTop
    })
  const s0 = await scrollTop()
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(300)
  const s1 = await scrollTop()
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(300)
  const s2 = await scrollTop()
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(300)
  const s3 = await scrollTop()
  const d1 = s1 - s0
  const d2 = s2 - s1
  const d3 = s3 - s2
  // 每格滚轮应基本按增量前进（120 上下），绝不失控放大
  expect(d1).toBeGreaterThanOrEqual(100)
  expect(d2).toBeGreaterThanOrEqual(100)
  expect(d3).toBeGreaterThanOrEqual(100)
  expect(d2).toBeLessThanOrEqual(240)
  expect(d3).toBeLessThanOrEqual(240)
})

test('tree 虚拟列表滚轮增量滚动正常（overflow-anchor 回归）', async ({ page }) => {
  // 曾现 bug：同 virtual-list——tree 虚拟模式复用 oas-virtual-list，滚轮一下直接滚到底。
  await page.goto('/components/tree.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tree-virtual')
  await page.waitForTimeout(800)
  await page.locator('#tree-virtual').scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const r = await page.evaluate(() => {
    const tree = document.querySelector('#tree-virtual')!
    const vlist = tree.shadowRoot!.querySelector('oas-virtual-list')!
    const vp = vlist.shadowRoot!.querySelector('[part=viewport]')!
    const br = vp.getBoundingClientRect()
    return { x: br.x, y: br.y, w: br.width, h: br.height }
  })
  await page.mouse.move(r.x + r.w / 2, r.y + 20)
  const scrollTop = () =>
    page.evaluate(() => {
      const tree = document.querySelector('#tree-virtual')!
      const vlist = tree.shadowRoot!.querySelector('oas-virtual-list')!
      return vlist.shadowRoot!.querySelector('[part=viewport]')!.scrollTop
    })
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(300)
  const s1 = await scrollTop()
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(300)
  const s2 = await scrollTop()
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(300)
  const s3 = await scrollTop()
  expect(s1).toBeGreaterThanOrEqual(100)
  expect(s2 - s1).toBeGreaterThanOrEqual(100)
  expect(s3 - s2).toBeGreaterThanOrEqual(100)
  expect(s2 - s1).toBeLessThanOrEqual(240)
  expect(s3 - s2).toBeLessThanOrEqual(240)
})

test('scroll-area 横向可滚：滚轮增量横向滚动 + 横向/纵向 thumb 可拖拽', async ({ page }) => {
  // 曾现 bug：thumb 完全无拖拽实现（mousedown 无响应）；横向仅溢出时原生纵向滚轮
  // 不滚动横向轴，用户"滚不动"。修复：thumb 拖拽 + 滚轮纵向增量转译横向。
  await page.goto('/components/scroll-area.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-scroll-area')
  await page.waitForTimeout(600)

  // 横向 demo（第 2 个 oas-scroll-area）：纵向滚轮 → 横向滚动
  const area = page.locator('oas-scroll-area').nth(1)
  await area.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const r = await area.evaluate((el) => {
    const vp = el.shadowRoot!.querySelector('[part=viewport]')!
    const br = vp.getBoundingClientRect()
    return { x: br.x, y: br.y, w: br.width, h: br.height }
  })
  await page.mouse.move(r.x + r.w / 2, r.y + r.h / 2)
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(300)
  const afterWheel = await area.evaluate(
    (el) => el.shadowRoot!.querySelector('[part=viewport]')!.scrollLeft,
  )
  expect(afterWheel).toBeGreaterThan(0)

  // 横向 thumb 拖拽：scrollLeft 变化
  const h = await area.evaluate((el) => {
    const vp = el.shadowRoot!.querySelector('[part=viewport]')!
    const before = vp.scrollLeft
    const thumbEl = el.shadowRoot!.querySelector('[part=thumb-h]')!
    const br = thumbEl.getBoundingClientRect()
    return { before, x: br.x, y: br.y, w: br.width, h: br.height }
  })
  await page.mouse.move(h.x + 30, h.y + h.h / 2)
  await page.mouse.down()
  await page.mouse.move(h.x + h.w / 2, h.y + h.h / 2, { steps: 4 })
  await page.mouse.up()
  await page.waitForTimeout(300)
  const afterHDrag = await area.evaluate(
    (el) => el.shadowRoot!.querySelector('[part=viewport]')!.scrollLeft,
  )
  expect(afterHDrag).not.toBe(h.before)

  // 纵向 thumb 拖拽（基础 demo，第 1 个）：scrollTop 增大
  // 注意：scrollIntoView 时 thumb 起点可能落在文档站粘性页头之下，pointerdown 被页头截走；
  // 把 host 移到固定坐标（避开页头）再拖，保证拖拽真实发生在 thumb 上。
  const area0 = page.locator('oas-scroll-area').nth(0)
  await area0.evaluate((el) => {
    el.style.cssText = 'position: fixed; left: 80px; top: 300px; z-index: 9999'
  })
  await page.waitForTimeout(300)
  const v = await area0.evaluate((el) => {
    const vp = el.shadowRoot!.querySelector('[part=viewport]')!
    const before = vp.scrollTop
    const thumbEl = el.shadowRoot!.querySelector('[part=thumb-v]')!
    const br = thumbEl.getBoundingClientRect()
    return { before, x: br.x, y: br.y, w: br.width, h: br.height }
  })
  await page.mouse.move(v.x + v.w / 2, v.y + 10)
  await page.mouse.down()
  await page.mouse.move(v.x + v.w / 2, v.y + v.h - 10, { steps: 4 })
  await page.mouse.up()
  await page.waitForTimeout(300)
  const afterVDrag = await area0.evaluate(
    (el) => el.shadowRoot!.querySelector('[part=viewport]')!.scrollTop,
  )
  expect(afterVDrag).toBeGreaterThan(v.before)
})

// —— 缺陷 8：多级子菜单视口边界翻转 ——
// 曾现 bug：ContextMenu/Menu/Dropdown 的多级子菜单一律向右展开，贴近视口右缘时被子菜单
// 顶出屏幕被裁剪。修复：展开前检测视口剩余空间，右侧不足向左翻转（flip-left）、
// 底部不足向上翻转（flip-up），三级及以上逐级检测。断言：可见子菜单完整落在视口内。

/** 收集所有可见子菜单的矩形（递归遍历 open shadow root；原生 querySelectorAll 不穿透 shadow） */
async function visibleSubmenuRects(page: import('@playwright/test').Page): Promise<
  Array<{
    left: number
    right: number
    top: number
    bottom: number
    vw: number
    vh: number
    flipLeft: boolean
  }>
> {
  return page.evaluate(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const out: Array<{
      left: number
      right: number
      top: number
      bottom: number
      vw: number
      vh: number
      flipLeft: boolean
    }> = []
    const walk = (root: Document | ShadowRoot): void => {
      for (const el of root.querySelectorAll('*')) {
        if (el.getAttribute('part') === 'submenu') {
          const b = el.getBoundingClientRect()
          if (b.width > 0 && b.height > 0) {
            out.push({
              left: b.left,
              right: b.right,
              top: b.top,
              bottom: b.bottom,
              vw,
              vh,
              flipLeft: el.classList.contains('flip-left'),
            })
          }
        }
        if (el.shadowRoot) walk(el.shadowRoot)
      }
    }
    walk(document)
    return out
  })
}

test('context-menu 多级子菜单贴近视口右缘：翻转后全部落在视口内', async ({ page }) => {
  await page.goto('/components/context-menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-context-menu')
  // 把「多级子菜单」demo 平移到视口右缘（fixed + 高 z-index），右键点在右缘附近
  await page.evaluate(() => {
    const cm = [...document.querySelectorAll('oas-context-menu')].find((el) =>
      el.getAttribute('items')?.includes('"children"'),
    ) as HTMLElement
    cm.style.cssText = 'position: fixed; right: 0; top: 260px; z-index: 9999'
    cm.dataset.e2eRightEdge = '1'
  })
  const box = await page.locator('oas-context-menu[data-e2e-right-edge]').boundingBox()
  await page.mouse.click(box!.x + box!.width - 12, box!.y + 60, { button: 'right' })
  // 逐级展开两级子菜单链：新建 → 项目 →（Git 仓库/空白）
  await page
    .locator('oas-context-menu[data-e2e-right-edge] [part="item"][data-value="new"]')
    .hover({ timeout: 5000 })
  await page
    .locator('oas-context-menu[data-e2e-right-edge] [part="item"][data-value="new-project"]')
    .hover({ timeout: 5000 })
  await page.waitForTimeout(200)
  const rects = await visibleSubmenuRects(page)
  expect(rects.length).toBeGreaterThanOrEqual(2) // 一级 + 二级子菜单均已展开
  expect(
    rects.some((r) => r.flipLeft),
    '贴右缘的子菜单应向左翻转（flip-left），而非被裁掉',
  ).toBe(true)
  for (const r of rects) {
    expect(r.left, `子菜单 left=${r.left} 越出视口左缘`).toBeGreaterThanOrEqual(-1)
    expect(r.right, `子菜单 right=${r.right} 越出视口右缘`).toBeLessThanOrEqual(r.vw + 1)
    expect(r.top, `子菜单 top=${r.top} 越出视口上缘`).toBeGreaterThanOrEqual(-1)
    expect(r.bottom, `子菜单 bottom=${r.bottom} 越出视口下缘`).toBeLessThanOrEqual(r.vh + 1)
  }
  await page.screenshot({ path: 'C:\\WINDOWS\\TEMP\\opencode\\fix8-context-menu-flip.png' })
})

test('menu 多级子菜单贴近视口右缘：翻转后全部落在视口内', async ({ page }) => {
  await page.goto('/components/menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#menu-nested')
  await page.evaluate(() => {
    const m = document.querySelector('#menu-nested') as HTMLElement
    m.style.cssText = 'position: fixed; right: 0; top: 240px; z-index: 9999'
    m.dataset.e2eRightEdge = '1'
  })
  // hover 展开 文件 → 新建（三级链）
  await page.locator('#menu-nested [part="item"][data-value="file"]').hover()
  await page.locator('#menu-nested [part="item"][data-value="new"]').hover()
  await page.waitForTimeout(200)
  const rects = await visibleSubmenuRects(page)
  expect(rects.length).toBeGreaterThanOrEqual(2)
  expect(
    rects.some((r) => r.flipLeft),
    '贴右缘的子菜单应向左翻转（flip-left），而非被裁掉',
  ).toBe(true)
  for (const r of rects) {
    expect(r.left, `子菜单 left=${r.left} 越出视口左缘`).toBeGreaterThanOrEqual(-1)
    expect(r.right, `子菜单 right=${r.right} 越出视口右缘`).toBeLessThanOrEqual(r.vw + 1)
    expect(r.bottom, `子菜单 bottom=${r.bottom} 越出视口下缘`).toBeLessThanOrEqual(r.vh + 1)
  }
  await page.screenshot({ path: 'C:\\WINDOWS\\TEMP\\opencode\\fix8-menu-flip.png' })
})

test('menubar 多级子菜单贴近视口右缘：翻转后全部落在视口内', async ({ page }) => {
  await page.goto('/components/menubar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-menubar')
  // 平移 menubar 到视口右缘
  await page.evaluate(() => {
    const mb = document.querySelector('oas-menubar') as HTMLElement
    mb.style.cssText = 'position: fixed; right: 0; top: 240px; z-index: 9999'
    mb.dataset.e2eRightEdge = '1'
  })
  // hover 顶级「视图」展开一级下拉，hover 级联「缩放」展开二级子菜单（menubar 是 mouseenter 展开）
  await page
    .locator('oas-menubar[data-e2e-right-edge] [part="top-item"][data-value="view"]')
    .hover()
  await page.waitForTimeout(150)
  await page.locator('oas-menubar[data-e2e-right-edge] [part="item"][data-value="zoom"]').hover()
  await page.waitForTimeout(200)
  const rects = await visibleSubmenuRects(page)
  expect(rects.length).toBeGreaterThanOrEqual(2) // 一级下拉 + 级联子菜单
  for (const r of rects) {
    expect(r.left, `子菜单 left=${r.left} 越出视口左缘`).toBeGreaterThanOrEqual(-1)
    expect(r.right, `子菜单 right=${r.right} 越出视口右缘`).toBeLessThanOrEqual(r.vw + 1)
    expect(r.bottom, `子菜单 bottom=${r.bottom} 越出视口下缘`).toBeLessThanOrEqual(r.vh + 1)
  }
  // 右缘场景至少一级发生了翻转（级联 flip-left 或一级 flip-right 右对齐）
  const flipped = await page.evaluate(() => {
    const mb = document.querySelector('oas-menubar')!
    const subs = [...mb.shadowRoot!.querySelectorAll('[part="submenu"]')]
    return subs.some((s) => s.classList.contains('flip-left') || s.classList.contains('flip-right'))
  })
  expect(flipped, '贴右缘的子菜单应翻转（flip-left/flip-right），而非被裁掉').toBe(true)
  await page.screenshot({ path: 'C:\\WINDOWS\\TEMP\\opencode\\fix8-menubar-flip.png' })
})

test('dropdown 多级子菜单贴近视口右缘：翻转后全部落在视口内', async ({ page }) => {
  await page.goto('/components/dropdown.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-dropdown')
  // 注入一个带两级子菜单的 dropdown 并平移到视口右缘
  await page.evaluate(() => {
    const dd = document.createElement('oas-dropdown')
    dd.setAttribute(
      'items',
      JSON.stringify([
        {
          label: '文件',
          value: 'file',
          children: [
            {
              label: '新建',
              value: 'new',
              children: [
                { label: '文件', value: 'new-file' },
                { label: '窗口', value: 'new-window' },
              ],
            },
            { label: '打开', value: 'open' },
          ],
        },
        { label: '编辑', value: 'edit' },
      ]),
    )
    dd.innerHTML = '<button>操作</button>'
    dd.style.cssText = 'position: fixed; right: 0; top: 240px; z-index: 9999'
    dd.dataset.e2eRightEdge = '1'
    document.body.appendChild(dd)
  })
  const dd = page.locator('oas-dropdown[data-e2e-right-edge]')
  await dd.locator('button').click()
  await page.locator('oas-dropdown[data-e2e-right-edge] [part="item"][data-value="file"]').hover()
  await page.locator('oas-dropdown[data-e2e-right-edge] [part="item"][data-value="new"]').hover()
  await page.waitForTimeout(200)
  const rects = await visibleSubmenuRects(page)
  expect(rects.length).toBeGreaterThanOrEqual(2)
  expect(
    rects.some((r) => r.flipLeft),
    '贴右缘的子菜单应向左翻转（flip-left），而非被裁掉',
  ).toBe(true)
  for (const r of rects) {
    expect(r.left, `子菜单 left=${r.left} 越出视口左缘`).toBeGreaterThanOrEqual(-1)
    expect(r.right, `子菜单 right=${r.right} 越出视口右缘`).toBeLessThanOrEqual(r.vw + 1)
    expect(r.bottom, `子菜单 bottom=${r.bottom} 越出视口下缘`).toBeLessThanOrEqual(r.vh + 1)
  }
  await page.screenshot({ path: 'C:\\WINDOWS\\TEMP\\opencode\\fix8-dropdown-flip.png' })
})

// —— 缺陷 9：rate 半选视觉 ——
// 曾现 bug：半星整颗按 50% 透明度淡化，看起来是整颗黄描边星。
// 修复：半星 = 左半激活色（warning）+ 右半未激活色（border），由 .half-fill 覆盖层 +
// clip-path 垂直分割（inset(0 50% 0 0)）实现。断言：覆盖层存在、clip 只留左半、
// 覆盖层为 warning 色、基础星为未激活 border 色。

test('rate 半选（allow-half）：半星为左半黄右半灰的垂直分割视觉', async ({ page }) => {
  await page.goto('/components/rate.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-rate[value="3.5"][allow-half]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-rate[value="3.5"][allow-half]')!
    const root = el.shadowRoot!
    const stars = [...root.querySelectorAll<HTMLElement>('.star')]
    const half = stars.find((s) => s.classList.contains('half'))!
    const fill = half.querySelector<HTMLElement>('.half-fill')
    const fillCs = fill ? getComputedStyle(fill) : null
    return {
      starCount: stars.length,
      activeCount: stars.filter((s) => s.classList.contains('active')).length,
      halfIndex: stars.indexOf(half),
      oldOpacityHack: half.style.opacity,
      hasFill: !!fill,
      fillAriaHidden: fill?.getAttribute('aria-hidden') ?? null,
      fillHasSvg: !!fill?.querySelector('svg'),
      fillClipPath: fillCs?.clipPath ?? '',
      fillColor: fillCs?.color ?? '',
      baseColor: getComputedStyle(half).color,
    }
  })
  // 2.5 语义演示用 3.5：3 颗全黄 + 1 颗半黄半灰 + 1 颗全灰
  expect(r.starCount).toBe(5)
  expect(r.activeCount).toBe(3)
  expect(r.halfIndex).toBe(3)
  expect(r.oldOpacityHack).toBe('') // 旧透明度淡化已移除
  expect(r.hasFill).toBe(true)
  expect(r.fillAriaHidden).toBe('true')
  expect(r.fillHasSvg).toBe(true)
  expect(r.fillClipPath).toContain('50%') // 垂直分割：只保留左半
  expect(r.fillColor).toBe('rgb(217, 119, 6)') // --oas-color-warning（light）
  expect(r.baseColor).toBe('rgb(228, 228, 231)') // --oas-color-border（light）
  await page.screenshot({ path: 'C:\\WINDOWS\\TEMP\\opencode\\fix9-rate-half-star.png' })
})

// —— upload P0 补缺：照片墙 + 拖拽 ——
// 曾现风险：picture-card 缩略图不渲染、Vue 剥离 list-type、超限无可见反馈、disabled 拖拽会打开文件。

test('upload picture-card：list-type 属性在 Vue demo 存活，预置照片渲染缩略图卡片', async ({
  page,
}) => {
  await page.goto('/components/upload.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#upload-full')
  // #upload-full 预置 3 张 SVG 图片（onMounted 异步 import 后设置 files）
  await page.waitForFunction(
    () =>
      document.querySelector('#upload-full')?.shadowRoot?.querySelectorAll('.card').length === 3,
    null,
    { timeout: 10000 },
  )
  const r = await page.evaluate(() => {
    const full = document.querySelector('#upload-full')!
    return {
      listTypeAttr: full.getAttribute('list-type'),
      cards: full.shadowRoot!.querySelectorAll('.card').length,
      thumbs: full.shadowRoot!.querySelectorAll('.card .thumb img').length,
      thumbBlobSrc: full.shadowRoot!.querySelector('.card .thumb img')?.getAttribute('src') ?? '',
    }
  })
  expect(r.listTypeAttr, 'list-type 被 Vue 剥离').toBe('picture-card')
  expect(r.cards).toBe(3)
  expect(r.thumbs).toBe(3)
  expect(r.thumbBlobSrc).toContain('blob:') // URL.createObjectURL 缩略图
})

test('upload 拖拽 drop：真实拖放文件到拖拽区即渲染', async ({ page }) => {
  await page.goto('/components/upload.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#upload-drag')
  await page.evaluate(() => {
    const el = document.querySelector('#upload-drag')!
    const zone = el.shadowRoot!.querySelector('.zone')!
    const dt = new DataTransfer()
    dt.items.add(new File(['hello'], 'drag.txt', { type: 'text/plain' }))
    zone.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
  })
  await page.waitForFunction(
    () => document.querySelector('#upload-drag')?.shadowRoot?.querySelector('.item') != null,
    null,
    { timeout: 5000 },
  )
  const r = await page.evaluate(() => {
    const el = document.querySelector('#upload-drag')!
    return {
      items: el.shadowRoot!.querySelectorAll('.item').length,
      hasName: el.shadowRoot!.querySelector('.item .name')?.textContent,
    }
  })
  expect(r.items).toBe(1)
  expect(r.hasName).toBe('drag.txt')
})

test('upload 超限 max：drop 超过 max 的文件触发 oas-exceed 并弹出 message 可见反馈', async ({
  page,
}) => {
  await page.goto('/components/upload.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#upload-wall-exceed')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, {
    timeout: 10000,
  })
  await page.evaluate(() => {
    const el = document.querySelector('#upload-wall-exceed')!
    const zone = el.shadowRoot!.querySelector('.zone')!
    const dt = new DataTransfer()
    for (let i = 0; i < 4; i++) {
      dt.items.add(new File(['x'], `f${i}.png`, { type: 'image/png' }))
    }
    zone.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
  })
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length > 0, null, {
    timeout: 5000,
  })
  const r = await page.evaluate(() => {
    const el = document.querySelector('#upload-wall-exceed')!
    return {
      msgCount: document.querySelectorAll('oas-message').length,
      msgText: document.querySelector('oas-message')?.shadowRoot?.textContent ?? '',
      cards: el.shadowRoot!.querySelectorAll('.card').length, // max=3：只接收 3 个
    }
  })
  expect(r.msgCount).toBeGreaterThan(0)
  expect(r.msgText).toContain('最多上传 3 个文件')
  expect(r.cards).toBe(3)
})

test('form inline：表单项水平排列（同一行）、label 在控件左侧、空提交必填错误在控件下方', async ({
  page,
}) => {
  // 曾现风险：inline 仅声明属性但无视觉效果（form 未切 flex / form-item 未感知行内）
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-form[inline] oas-form-item oas-input')
  const r = await page.evaluate(() => {
    const form = document.querySelector('#form-inline-login')!
    const formEl = form.shadowRoot!.querySelector('form')!
    const items = [...form.querySelectorAll('oas-form-item')].filter((i) =>
      i.querySelector('oas-input, oas-select'),
    )
    const first = items[0]!
    const second = items[1]!
    const a = first.getBoundingClientRect()
    const b = second.getBoundingClientRect()
    const labelBox = first
      .shadowRoot!.querySelector<HTMLElement>('[part="label"]')!
      .getBoundingClientRect()
    const controlBox = first.querySelector<HTMLElement>('oas-input')!.getBoundingClientRect()
    return {
      flex: getComputedStyle(formEl).display,
      wrap: getComputedStyle(formEl).flexWrap,
      sameRow: Math.abs(a.top - b.top) < 4 && b.left > a.right,
      labelLeftOfControl: labelBox.right <= controlBox.left + 1,
      labelWidth: first
        .shadowRoot!.querySelector<HTMLElement>('[part="label"]')!
        .getBoundingClientRect().width,
    }
  })
  expect(r.flex).toBe('flex')
  expect(r.wrap).toBe('wrap')
  expect(r.sameRow).toBe(true)
  expect(r.labelLeftOfControl).toBe(true)
  expect(r.labelWidth).toBeLessThan(96) // label-width 自动：不加固定 96px 列宽

  // 空表单提交 → 必填错误写入 form-item 错误位（控件下方红字）
  await page.locator('#form-inline-login oas-form-item:last-child oas-button').click()
  await page.waitForFunction(() => {
    const item = document.querySelector('#form-inline-login oas-form-item')
    const err = item?.shadowRoot?.querySelector<HTMLElement>('[part="error"]')
    return err != null && !err.hidden && (err.textContent?.length ?? 0) > 0
  })
  const err = await page.evaluate(() => {
    const item = document.querySelector('#form-inline-login oas-form-item')!
    const err = item.shadowRoot!.querySelector<HTMLElement>('[part="error"]')!
    const input = item.querySelector('oas-input')!.getBoundingClientRect()
    const errBox = err.getBoundingClientRect()
    return {
      text: err.textContent,
      belowInput: errBox.top >= input.bottom - 1,
      labelLeftOfInput:
        item.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!.getBoundingClientRect()
          .right <=
        input.left + 1,
    }
  })
  expect(err.text).toContain('请输入用户名')
  expect(err.belowInput).toBe(true)
  expect(err.labelLeftOfInput).toBe(true)
})

test('badge ribbon：缎带可见、折叠角生效、语义色与 placement 渲染正确', async ({ page }) => {
  // 曾现风险：ribbon 只有机制没有视觉（角标不显、无折叠角、颜色/位置不生效）
  await page.goto('/components/badge.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-badge[ribbon] oas-card')
  const r = await page.evaluate(() => {
    const badges = [...document.querySelectorAll('oas-badge[ribbon]')]
    const ribbonEl = (el: Element) => el.shadowRoot!.querySelector<HTMLElement>('.ribbon')
    const cornerEl = (el: Element) => el.shadowRoot!.querySelector<HTMLElement>('.ribbon-corner')
    const pick = (color?: string, placement?: string) => {
      const b = badges.find((x) => {
        if (color && x.getAttribute('color') !== color) return false
        if (placement && x.getAttribute('placement') !== placement) return false
        return x.hasAttribute('ribbon')
      })
      if (!b) return null
      const rb = ribbonEl(b)!
      const cs = getComputedStyle(rb)
      return {
        hidden: rb.hidden,
        text: rb.textContent,
        bg: cs.backgroundColor,
        color: cs.color,
        endRadius: cs.borderEndEndRadius,
        cornerTransform: getComputedStyle(cornerEl(b)!).transform,
        placementStart: rb.classList.contains('placement-start'),
      }
    }
    const countEl = document.querySelector('oas-badge[value="5"]')
    return {
      default: pick(),
      start: pick(undefined, 'start'),
      success: pick('success'),
      count: countEl?.shadowRoot?.querySelector<HTMLElement>('.badge')?.textContent ?? null,
    }
  })
  // 默认缎带：可见、文本同步、danger 色、折叠角方形 + transform 生效
  expect(r.default).not.toBeNull()
  expect(r.default!.hidden).toBe(false)
  expect(r.default!.text).toContain('HOT')
  expect(r.default!.bg).toBe('rgb(220, 38, 38)')
  expect(r.default!.color).not.toBe(r.default!.bg) // 文字色 ≠ 背景色（文字不可见曾现风险）
  expect(r.default!.endRadius).toBe('0px')
  expect(r.default!.cornerTransform).not.toBe('none')
  // placement=start：换到行首
  expect(r.start).not.toBeNull()
  expect(r.start!.hidden).toBe(false)
  expect(r.start!.placementStart).toBe(true)
  // color=success：语义色生效（非 danger）
  expect(r.success).not.toBeNull()
  expect(r.success!.bg).toBe('rgb(22, 163, 74)')
  // count 数字徽标与 ribbon 并存正常
  expect(r.count).toBe('5')
})

// —— modal P0 补缺：fullscreen 全屏 + 命令式 confirm loading ——

test('modal fullscreen：铺满视口、无圆角、width 被忽略、Esc/遮罩关闭照常', async ({ page }) => {
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-modal[fullscreen]')
  await page.evaluate(() => {
    document.querySelector('#modal-fullscreen')?.setAttribute('visible', '')
  })
  await page.waitForFunction(
    () =>
      document
        .querySelector('#modal-fullscreen')
        ?.shadowRoot?.querySelector('.dialog[data-fullscreen]') != null,
    null,
    { timeout: 5000 },
  )
  const r = await page.evaluate(() => {
    const el = document.querySelector('#modal-fullscreen')!
    const dialog = el.shadowRoot!.querySelector<HTMLElement>('.dialog')!
    const d = dialog.getBoundingClientRect()
    return {
      left: d.left,
      top: d.top,
      right: d.right,
      bottom: d.bottom,
      vw: window.innerWidth,
      vh: window.innerHeight,
      radius: getComputedStyle(dialog).borderRadius,
      inlineWidth: dialog.style.width,
      ariaModal: dialog.getAttribute('aria-modal'),
      ariaHidden: dialog.getAttribute('aria-hidden'),
    }
  })
  expect(r.left).toBeLessThanOrEqual(1)
  expect(r.top).toBeLessThanOrEqual(1)
  expect(r.right).toBeGreaterThanOrEqual(r.vw - 1)
  expect(r.bottom).toBeGreaterThanOrEqual(r.vh - 1)
  expect(r.radius).toBe('0px') // 无圆角
  expect(r.inlineWidth).toBe('') // width 属性被忽略
  expect(r.ariaModal).toBe('true')
  expect(r.ariaHidden).toBe('false')
  // Esc 关闭照常
  await page.keyboard.press('Escape')
  await page.waitForFunction(
    () => !document.querySelector('#modal-fullscreen')?.hasAttribute('visible'),
    null,
    { timeout: 5000 },
  )
})

test('modal 命令式确认 loading：确定进入 loading、1.5s 后自动关闭并弹出成功 message', async ({
  page,
}) => {
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, {
    timeout: 10000,
  })
  // 注意：openConfirmLoading() 返回 confirm 的 Promise（settle 于确定/取消），
  // 用块语句包裹避免 page.evaluate 等待该 Promise
  await page.evaluate(() => {
    ;(window as any).openConfirmLoading()
  })
  await page.waitForFunction(() => document.querySelector('oas-modal[visible]') != null, null, {
    timeout: 5000,
  })
  // 点击确定 → 对话框保持打开并进入 loading（OK 禁用 + aria-busy + spinner 可见）
  await page.evaluate(() => {
    const m = document.querySelector('oas-modal[visible]')!
    ;(m.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
  })
  await page.waitForFunction(
    () => {
      const m = document.querySelector('oas-modal[visible]')
      const ok = m?.shadowRoot?.querySelector<HTMLButtonElement>('[part="ok"]')
      const spinner = m?.shadowRoot?.querySelector('[part="ok"] .spinner')
      return (
        ok != null &&
        ok.disabled &&
        ok.getAttribute('aria-busy') === 'true' &&
        spinner != null &&
        !spinner.hasAttribute('hidden')
      )
    },
    null,
    { timeout: 5000 },
  )
  // onOk resolve（1.5s）后自动关闭并弹成功 message
  await page.waitForFunction(
    () =>
      document.querySelector('oas-modal[visible]') == null &&
      document.querySelectorAll('oas-message').length > 0,
    null,
    { timeout: 8000 },
  )
})

test('card clickable：整卡 role/tabindex 存活、点击派发 oas-click 有可见反馈、内部按钮不触发整卡', async ({
  page,
}) => {
  // 曾现风险：clickable 属性被 Vue 剥离、整卡点击静默失败、actions 内按钮误触整卡
  await page.goto('/components/card.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-card[clickable]')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, {
    timeout: 10000,
  })
  // 整卡承担按钮语义（Vue 下 clickable 存活 → role/tabindex 同步）
  const r = await page.evaluate(() => {
    const card = document.querySelector('oas-card[clickable][cover-src]')!
    const cover = card.shadowRoot!.querySelector('[part="cover-img"]')
    const actions = card.shadowRoot!.querySelector('[part="actions"]')
    return {
      role: card.getAttribute('role'),
      tabindex: card.getAttribute('tabindex'),
      coverSrc: cover?.getAttribute('src') ?? '',
      actionsHidden: actions?.hasAttribute('hidden') ?? true,
    }
  })
  expect(r.role, 'clickable 卡片应带 role=button').toBe('button')
  expect(r.tabindex).toBe('0')
  expect(r.coverSrc).toContain('picsum')
  expect(r.actionsHidden).toBe(false)

  // 点击整卡 → message 可见反馈（demo 监听 oas-click 弹消息）
  await page.evaluate(() => {
    const card = document.querySelector('oas-card[clickable][cover-src]')!
    ;(card.shadowRoot!.querySelector('[part="body"]') as HTMLElement).click()
  })
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length > 0, null, {
    timeout: 5000,
  })
  const msgCount = await page.locator('oas-message').count()
  expect(msgCount).toBeGreaterThan(0)

  // 点击 actions 内按钮 → 不派发整卡 oas-click（演示反馈应不重复弹出）
  const before = await page.locator('oas-message').count()
  await page.locator('oas-card[clickable][cover-src] oas-button').first().click()
  await page.waitForTimeout(600)
  const after = await page.locator('oas-message').count()
  expect(after, '点内部按钮不应再触发整卡 oas-click').toBe(before)
})

test('table 行内编辑：Enter 提交后编辑器退出且列高亮清除', async ({ page }) => {
  // 曾现 bug：编辑器内按 Enter 提交后，keydown 冒泡到单元格的 Enter 监听器，在已销毁的
  // td 上重入编辑 → 列高亮残留、编辑态未退出。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-edit')
  // 直接对首行「姓名」单元格派发 dblclick 进入编辑
  // （Playwright 真实 dblclick 手势会把两次 click 派发给同一解析元素——首击触发行选中重建
  //  后该元素已脱离文档，进入编辑会落到游离节点上；这里用 DOM 事件直派更确定）
  await page.evaluate(() => {
    const table = document.querySelector('#table-edit')!
    const td = table.shadowRoot!.querySelector('tbody tr.row td')!
    td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
  })
  await page.waitForFunction(
    () => {
      const t = document.querySelector('#table-edit')!
      return !!t.shadowRoot!.querySelector('input.cell-editor')
    },
    null,
    { timeout: 5000 },
  )
  const entered = await page.evaluate(() => {
    const table = document.querySelector('#table-edit')!
    return {
      hasEditor: !!table.shadowRoot!.querySelector('input.cell-editor'),
      editingCol: !!table.shadowRoot!.querySelector('th[data-editing-col="true"]'),
    }
  })
  expect(entered.hasEditor).toBe(true)
  expect(entered.editingCol).toBe(true)
  await page.evaluate(() => {
    const table = document.querySelector('#table-edit')!
    const input = table.shadowRoot!.querySelector<HTMLInputElement>('input.cell-editor')!
    input.value = '演示提交'
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }),
    )
  })
  await page.waitForFunction(
    () => {
      const t = document.querySelector('#table-edit')!
      return !t.shadowRoot!.querySelector('input.cell-editor')
    },
    null,
    { timeout: 5000 },
  )
  const after = await page.evaluate(() => {
    const table = document.querySelector('#table-edit')!
    return {
      hasEditor: !!table.shadowRoot!.querySelector('input.cell-editor'),
      editingCol: !!table.shadowRoot!.querySelector('th[data-editing-col="true"]'),
      cellText: table.shadowRoot!.querySelector('tbody td')!.textContent,
    }
  })
  expect(after.hasEditor, '提交后编辑器应退出').toBe(false)
  expect(after.editingCol, '提交后列高亮应清除').toBe(false)
  expect(after.cellText).toBe('演示提交')
})

test('table 吸顶行：sticky-rows 前 N 行带 data-sticky 且与固定列共存', async ({ page }) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-table[sticky-rows]')
  const r = await page.evaluate(() => {
    const table = document.querySelector('oas-table[sticky-rows]')!
    const rows = [...table.shadowRoot!.querySelectorAll('tbody tr.row')]
    return rows.slice(0, 4).map((tr) => ({
      sticky: tr.getAttribute('data-sticky'),
      left: (tr.querySelector('td') as HTMLElement).style.left,
      top: (tr.querySelector('td') as HTMLElement).style.top,
    }))
  })
  expect(r[0]!.sticky).toBe('true')
  expect(r[1]!.sticky).toBe('true')
  expect(r[2]!.sticky).toBe('true')
  expect(r[3]!.sticky).toBeNull()
  // 固定列与吸顶行共存：sticky 行的固定单元格仍保留横向偏移
  expect(r[0]!.left).toBe('0px')
  expect(parseFloat(r[0]!.top), '吸顶行 top 应大于 0（表头下方）').toBeGreaterThan(0)
})

test('tree 自定义节点模板 + oas-node-render 渲染真实内容且 ARIA 保持', async ({ page }) => {
  // 曾现缺口：tree 无自定义渲染能力，图标/富文本必须走宿主整段替换方案；
  // 本次补 template[slot="node"] / template[slot="toggle"] 骨架 + oas-node-render 事件。
  await page.goto('/components/tree.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tree-custom')
  await page.waitForTimeout(600)
  const r = await page.evaluate(() => {
    const tree = document.querySelector('#tree-custom')!
    const row = tree.shadowRoot!.querySelector('[part="row"]')!
    const label = row.querySelector('.label')!
    const toggle = row.querySelector('[part="toggle"]')!
    return {
      glyph: !!label.querySelector('svg.node-demo-glyph'),
      boundText: label.querySelector('[data-node-label]')?.textContent ?? '',
      badge: label.querySelector('.node-demo-count')?.textContent ?? '',
      rowRole: row.getAttribute('role'),
      rowLevel: row.getAttribute('aria-level'),
      toggleTag: toggle?.tagName ?? '',
      toggleExpanded: toggle?.getAttribute('aria-expanded') ?? '',
    }
  })
  // 骨架模板渲染：图标 + [data-node-label] 绑定 + 徽标（oas-node-render 写入）
  expect(r.glyph, '自定义节点应渲染骨架图标').toBe(true)
  expect(r.boundText).toBe('项目 A')
  expect(r.badge).toContain('3')
  // ARIA 在自定义渲染下保持
  expect(r.rowRole).toBe('treeitem')
  expect(r.rowLevel).toBe('1')
  expect(r.toggleTag, '展开按钮应为原生 button（键盘 Enter/Space 可达）').toBe('BUTTON')
  expect(r.toggleExpanded).toBe('true')
  // 展开按钮点击 → aria-expanded 翻转（自定义 toggle 模板下键盘/ARIA 不丢）
  await page.evaluate(() => {
    const tree = document.querySelector('#tree-custom')!
    ;(tree.shadowRoot!.querySelector('[part="toggle"]') as HTMLElement).click()
  })
  await page.waitForFunction(
    () =>
      document
        .querySelector('#tree-custom')!
        .shadowRoot!.querySelector('[part="toggle"]')
        ?.getAttribute('aria-expanded') === 'false',
    null,
    { timeout: 5000 },
  )
})

test('tree 目录模式：文件夹/文件图标、展开态切换与 ARIA', async ({ page }) => {
  // 曾现缺口：tree 无目录模式，文件浏览器场景需宿主自绘整行；
  // 本次补 directory 属性：children/isLeaf 判定目录/文件，文件夹按展开态换图标。
  await page.goto('/components/tree.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tree-dir')
  await page.waitForTimeout(600)
  const kinds = () =>
    page.evaluate(() => {
      const tree = document.querySelector('#tree-dir')!
      return [...tree.shadowRoot!.querySelectorAll('[part="row"]')].map((row) => ({
        kind: row.querySelector('[part="node-icon"]')?.getAttribute('data-kind') ?? '',
        iconHidden: row.querySelector('[part="node-icon"]')?.getAttribute('aria-hidden') ?? '',
        ariaExpanded: row.querySelector('[part="toggle"]')?.getAttribute('aria-expanded') ?? '',
        label: row.querySelector('.label')?.textContent ?? '',
      }))
    })
  const rows = await kinds()
  // src(folder-open，expanded 初始含 src) components(folder) index.ts(file) …
  expect(rows[0]!.label).toBe('src')
  expect(rows[0]!.kind, '已展开文件夹应为 folder-open').toBe('folder-open')
  expect(rows[1]!.label).toBe('components')
  expect(rows[1]!.kind, '未展开文件夹应为 folder').toBe('folder')
  expect(rows[2]!.label).toBe('index.ts')
  expect(rows[2]!.kind, 'isLeaf 节点应为 file').toBe('file')
  expect(rows[0]!.iconHidden, '目录图标应为纯装饰（aria-hidden）').toBe('true')
  expect(rows[1]!.ariaExpanded).toBe('false')
  // 点击 components 展开按钮 → 图标切 folder-open 且子文件出现
  await page.evaluate(() => {
    const tree = document.querySelector('#tree-dir')!
    const row = [...tree.shadowRoot!.querySelectorAll('[part="row"]')][1]!
    ;(row.querySelector('[part="toggle"]') as HTMLElement).click()
  })
  await page.waitForFunction(
    () => {
      const tree = document.querySelector('#tree-dir')!
      const row = [...tree.shadowRoot!.querySelectorAll('[part="row"]')][1]!
      return row.querySelector('[part="node-icon"]')?.getAttribute('data-kind') === 'folder-open'
    },
    null,
    { timeout: 5000 },
  )
  const expanded = await kinds()
  expect(expanded[1]!.ariaExpanded).toBe('true')
  expect(
    expanded.some((r) => r.label === 'tree.tsx' && r.kind === 'file'),
    '展开后子文件行应出现且为 file 图标',
  ).toBe(true)
})

test('avatar 徽标角标：badge 文本可见且带底色、dot 圆点不渲染文本', async ({ page }) => {
  // 曾现缺口：avatar 无徽标能力，通知计数/在线状态需宿主自绘角标；
  // 本次补 badge/badge-dot/badge-color/badge-placement 叠加角标（视觉对齐 oas-badge）。
  await page.goto('/components/avatar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-avatar[badge="99+"]')
  const textBadge = await page.evaluate(() => {
    const el = document.querySelector('oas-avatar[badge="99+"]')!
    const b = el.shadowRoot!.querySelector('[part="badge"]')!
    const cs = getComputedStyle(b)
    return { visible: !b.hasAttribute('hidden'), text: b.textContent, bg: cs.backgroundColor }
  })
  expect(textBadge.visible).toBe(true)
  expect(textBadge.text).toBe('99+')
  expect(textBadge.bg, '徽标应有非透明底色').not.toBe('rgba(0, 0, 0, 0)')

  const dot = await page.evaluate(() => {
    const el = document.querySelector('oas-avatar[badge-dot]')!
    const b = el.shadowRoot!.querySelector('[part="badge"]')!
    return { dot: b.classList.contains('dot'), text: b.textContent }
  })
  expect(dot.dot).toBe(true)
  expect(dot.text).toBe('')
})

test('avatar 加载失败回退：404 图触发 img error 后回退首字符、状态保持', async ({ page }) => {
  // 曾现缺口：avatar 图片加载失败显示裂图，无占位回退；本次补 onerror → fallback 插槽/首字符。
  await page.goto('/components/avatar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-avatar[src*="invalid.example.com"]')
  // 等 img error 触发 → fallback 容器显示
  await page.waitForFunction(
    () => {
      const el = document.querySelector('oas-avatar[src*="invalid.example.com"]')!
      return el.shadowRoot!.querySelector('[part="fallback"]')!.hasAttribute('hidden') === false
    },
    null,
    { timeout: 10000 },
  )
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-avatar[src*="invalid.example.com"]')!
    return {
      imgHidden: el.shadowRoot!.querySelector('img')!.hasAttribute('hidden'),
      text: el.shadowRoot!.querySelector('[part="text"]')!.textContent,
    }
  })
  expect(r.imgHidden).toBe(true)
  expect(r.text).toBe('张')
})

test('image 懒加载：视口外图片不加载（img 无 src、占位显示），滚动进入视口后逐图加载', async ({
  page,
}) => {
  // 防回归：lazy 必须真正延迟请求——视口外 img 不得带 src；滚动后开始加载并断开观察器
  await page.goto('/components/image.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-image[lazy]')
  // 滚动列表到顶部：首屏在视口内的项已加载，视口外项仍为占位（无 src）
  await page.locator('#image-lazy-list').evaluate((el) => (el.scrollTop = 0))
  const state = await page.evaluate(() => {
    const list = document.querySelector('#image-lazy-list')!
    const imgs = [...list.querySelectorAll('oas-image[lazy]')]
    const noSrc = imgs.filter((i) => {
      const img = i.shadowRoot?.querySelector('img')
      return img && !img.hasAttribute('src')
    })
    return { total: imgs.length, noSrc: noSrc.length }
  })
  expect(state.total).toBeGreaterThan(5)
  expect(state.noSrc, '滚动列表底部应仍有未加载的懒加载项').toBeGreaterThan(0)
  // 滚动到底部：所有项都应开始加载（img 带 src）
  await page.locator('#image-lazy-list').evaluate((el) => (el.scrollTop = el.scrollHeight))
  await page.waitForFunction(
    () => {
      const list = document.querySelector('#image-lazy-list')!
      const imgs = [...list.querySelectorAll('oas-image[lazy]')]
      return (
        imgs.length > 0 &&
        imgs.every((i) => {
          const img = i.shadowRoot?.querySelector('img')
          return img && img.hasAttribute('src')
        })
      )
    },
    null,
    { timeout: 5000 },
  )
  // 状态机收尾：首批（列表首个）加载完成后 aria-busy 从 true 复位为 false
  await page.waitForFunction(
    () => {
      const first = document.querySelector('#image-lazy-list oas-image[lazy]')!
      return first.getAttribute('aria-busy') === 'false'
    },
    null,
    { timeout: 15000 },
  )
})
