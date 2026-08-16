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
  //           ::part 后不支持链后代选择器 → 全部静默失效（裸按钮、leaf 占位符外露）。
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
  // 曾现 bug：value 未列入 observedAttributes，外部 setAttribute('value') 不触发 update，
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
  // update，容器/各格不同步、danger 边框不生效（校验失败态无视觉反馈）。
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
  // 注：dropdown shadow 内也有原生 button（拆分箭头按钮），必须限定 light DOM 直接子元素
  await dd.locator(':scope > button').click()
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

test('upload 预览浮层关闭态不拦截指针事件 + 拖拽区图标尺寸稳定', async ({ page }) => {
  // 曾现风险 1：.preview-mask 的 display:flex 压过 UA [hidden] 规则 → 关闭态浮层 fixed 铺满
  // 视口拦截全页指针事件（DSD 真水合 e2e 全页点击被 oas-upload 拦截而超时）。
  // 曾现风险 2：zone 内 oas-icon 未 upgrade 前高度 0、upgrade 后 28px → 拖拽区高度跳变。
  await page.goto('/components/upload.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#upload-drag')
  const r = await page.evaluate(() => {
    const el = document.querySelector('#upload-drag')!
    const mask = el.shadowRoot!.querySelector('.preview-mask')!
    const icon = el.shadowRoot!.querySelector('.zone .icon')!
    const rect = mask.getBoundingClientRect()
    const iconStyle = getComputedStyle(icon)
    return {
      maskHidden: mask.hasAttribute('hidden'),
      maskDisplay: getComputedStyle(mask).display,
      maskCoversPage: rect.width > 0 && rect.height > 0,
      iconW: iconStyle.width,
      iconH: iconStyle.height,
    }
  })
  expect(r.maskHidden).toBe(true)
  expect(r.maskDisplay).toBe('none')
  expect(r.maskCoversPage).toBe(false)
  expect(r.iconW).toBe('28px')
  expect(r.iconH).toBe('28px')
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
    const badges = [...document.querySelectorAll('oas-badge[ribbon], oas-badge[mode="ribbon"]')]
    const ribbonEl = (el: Element) => el.shadowRoot!.querySelector<HTMLElement>('.ribbon')
    const cornerEl = (el: Element) => el.shadowRoot!.querySelector<HTMLElement>('.ribbon-corner')
    const pick = (color?: string, placement?: string) => {
      const b = badges.find((x) => {
        if (color && x.getAttribute('color') !== color) return false
        if (placement && x.getAttribute('placement') !== placement) return false
        // 只挑基础 fold 缎带（排除 ribbon-form/rolled/premium 等形态卡，它们的背景不是纯语义色）
        if (x.hasAttribute('ribbon-form') || x.hasAttribute('rolled') || x.hasAttribute('premium'))
          return false
        return x.hasAttribute('ribbon') || x.getAttribute('mode') === 'ribbon'
      })
      if (!b) return null
      const rb = ribbonEl(b)!
      const cs = getComputedStyle(rb)
      // 根元素 color 故意=背景色（corner 用 currentColor 折叠阴影），文字色在 .ribbon-text，断言取文字
      const textEl = rb.querySelector<HTMLElement>('.ribbon-text')
      return {
        hidden: rb.hidden,
        text: rb.textContent,
        bg: cs.backgroundColor,
        color: textEl ? getComputedStyle(textEl).color : cs.color,
        endRadius: cs.borderEndEndRadius,
        cornerClip: getComputedStyle(cornerEl(b)!).clipPath,
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
  // 默认缎带：可见、文本同步、danger 色、尖三角折叠角生效（clip-path 非 none）
  expect(r.default).not.toBeNull()
  expect(r.default!.hidden).toBe(false)
  expect(r.default!.text).toContain('HOT')
  expect(r.default!.bg).toBe('rgb(220, 38, 38)')
  expect(r.default!.color).not.toBe(r.default!.bg) // 文字色 ≠ 背景色（文字不可见曾现风险）
  expect(r.default!.endRadius).toBe('0px')
  expect(r.default!.cornerClip).not.toBe('none')
  expect(r.default!.cornerClip).toContain('polygon(')
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
  // 注意：openConfirmLoading 返回 confirm 的 Promise（settle 于确定/取消），
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
    const glyph = label.querySelector('svg.node-demo-glyph') as SVGSVGElement | null
    const binder = label.querySelector('[data-node-label]') as HTMLElement | null
    return {
      glyph: !!glyph,
      glyphW: glyph ? Math.round(glyph.getBoundingClientRect().width) : null,
      boundText: binder?.textContent ?? '',
      labelW: binder ? Math.round(binder.getBoundingClientRect().width) : null,
      badge: label.querySelector('.node-demo-count')?.textContent ?? '',
      rowRole: row.getAttribute('role'),
      rowLevel: row.getAttribute('aria-level'),
      toggleTag: toggle?.tagName ?? '',
      toggleExpanded: toggle?.getAttribute('aria-expanded') ?? '',
    }
  })
  // 骨架模板渲染：图标 + [data-node-label] 绑定 + 徽标（oas-node-render 写入）
  expect(r.glyph, '自定义节点应渲染骨架图标').toBe(true)
  expect(r.glyphW, 'SVG glyph 应有显式 width 属性（14px），不能撑满容器').toBeGreaterThan(0)
  expect(r.glyphW, 'SVG glyph 渲染宽应 ≤32px（14 + 余量）').toBeLessThanOrEqual(32)
  expect(r.boundText).toBe('项目 A')
  expect(r.labelW, '[data-node-label] 文字宽度应 > 0（不被 flex 压成 0 宽）').toBeGreaterThan(0)
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

test('tree slot 模板：Vue CSR 直插形态（insertBefore 到模板自身、content 为空）也能克隆渲染', async ({
  page,
}) => {
  // 回归：dev（Vue CSR 挂载）下 insertBefore 直插 template 元素，子节点落在元素自身 childNodes、
  // content 为空（Chromium 不转发进 content），曾致 #tree-custom 自定义节点行空白；preview 走
  // SSR 快照 content 有值所以正常。此处用 insertBefore 在真实 Chromium 复现 CSR 形态。
  await page.goto('/components/tree.html', { waitUntil: 'domcontentloaded' })
  // 先等 ui bundle 加载完成（oas-tree 已注册），保证动态创建的元素立即 upgrade
  await up(page, '#tree-custom')
  await page.evaluate(() => {
    const wrap = document.createElement('div')
    wrap.innerHTML = `<oas-tree id="tree-csr-slot" data='[{"key":"a","label":"CSR 节点"}]'></oas-tree>`
    document.body.appendChild(wrap)
    const tree = document.querySelector('#tree-csr-slot')!
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'node')
    const glyph = document.createElement('svg')
    glyph.setAttribute('class', 'csr-glyph')
    const binder = document.createElement('span')
    binder.setAttribute('data-node-label', '')
    // Vue runtime-dom 的 insert 实现即 parent.insertBefore(child, anchor)
    tpl.insertBefore(glyph, null)
    tpl.insertBefore(binder, null)
    tree.appendChild(tpl)
    // 模板就位后触发 update 重建行（与 demo onMounted 重刷同路径）
    tree.setAttribute('data', tree.getAttribute('data')!)
  })
  await up(page, '#tree-csr-slot')
  await page.waitForTimeout(200)
  const r = await page.evaluate(() => {
    const tree = document.querySelector('#tree-csr-slot')!
    const label = tree.shadowRoot!.querySelector('[part="row"] .label')!
    return {
      glyph: !!label.querySelector('svg.csr-glyph'),
      boundText: label.querySelector('[data-node-label]')?.textContent ?? '',
    }
  })
  expect(r.glyph, 'CSR 直插形态应克隆骨架图标').toBe(true)
  expect(r.boundText).toBe('CSR 节点')
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
  // 回归：lazy 必须真正延迟加载——视口外 img 没有 src，进入视口后才发起加载
  await page.goto('/components/image.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-image[lazy]')
  // 动态创建的懒加载列表由 demo onMounted 填充，静态首图存在不代表列表已建完
  await page.waitForFunction(
    () => document.querySelectorAll('#image-lazy-list oas-image[lazy]').length >= 6,
    null,
    { timeout: 15000 },
  )
  // 懒加载列表块整体位于页面首屏之外（demo 页需先滚页面才可见）——
  // 仅滚内层容器时列表块仍在视口外，IO 永远不触发。先把列表整体滚入页面视口。
  await page.evaluate(() => document.querySelector('#image-lazy-list')?.scrollIntoView())
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
  expect(state.noSrc, '列表底部应有未加载的图片').toBeGreaterThan(0)
  // 逐步滚动内层列表到底部（模拟真实浏览：每屏都经过视口，IO 逐屏触发加载；
  // 一次滚到底会跳过中间项，这些项从未进入视口 → 永远不加载，属于正确懒加载行为）
  await page.evaluate(async () => {
    const list = document.querySelector('#image-lazy-list') as HTMLElement
    const max = list.scrollHeight - list.clientHeight
    while (list.scrollTop < max) {
      list.scrollTop = Math.min(list.scrollTop + 150, max)
      await new Promise((r) => setTimeout(r, 50))
    }
  })
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
    { timeout: 10000 },
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

test('notification 进度条：show-progress 渲染、动画时长与 duration 同步、位于底部', async ({
  page,
}) => {
  await page.goto('/components/notification.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).notification !== 'undefined', null, {
    timeout: 10000,
  })
  await page.locator('.demo-block', { hasText: '带进度条' }).locator('oas-button').first().click()
  await page.waitForFunction(
    () => document.querySelector('oas-notification[show-progress]') != null,
    null,
    { timeout: 5000 },
  )
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-notification[show-progress]')!
    const root = el.shadowRoot!
    const progress = root.querySelector<HTMLElement>('[part="progress"]')!
    const fill = root.querySelector<HTMLElement>('.progress-fill')!
    const box = root.querySelector<HTMLElement>('[part="box"]')!
    const desc = root.querySelector<HTMLElement>('[part="description"]')!
    const p = progress.getBoundingClientRect()
    const b = box.getBoundingClientRect()
    const d = desc.getBoundingClientRect()
    return {
      progressHidden: progress.hidden,
      fillInlineDuration: fill.style.animationDuration, // '5000ms'（demo duration: 5000）
      computedDuration: getComputedStyle(fill).animationDuration,
      animationName: getComputedStyle(fill).animationName,
      belowDescription: p.top >= d.bottom - 1, // 进度条在描述下方
      insideBox: p.bottom <= b.bottom + 1, // 进度条在卡片盒内
      topClass: progress.classList.contains('progress-top'),
    }
  })
  expect(r.progressHidden).toBe(false)
  expect(r.fillInlineDuration).toBe('5000ms')
  expect(r.computedDuration).not.toBe('0s') // 动画真实生效（非 0 时长）
  expect(r.animationName).toContain('oas-notification-progress')
  expect(r.belowDescription).toBe(true)
  expect(r.insideBox).toBe(true)
  expect(r.topClass).toBe(false)
})

test('notification 进度条 progress-position=top：进度条切到描述上方', async ({ page }) => {
  await page.goto('/components/notification.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).notification !== 'undefined', null, {
    timeout: 10000,
  })
  await page.locator('.demo-block', { hasText: '带进度条' }).locator('oas-button').nth(1).click()
  await page.waitForFunction(
    () => document.querySelector('oas-notification[progress-position="top"]') != null,
    null,
    { timeout: 5000 },
  )
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-notification[progress-position="top"]')!
    const root = el.shadowRoot!
    const progress = root.querySelector<HTMLElement>('[part="progress"]')!
    const box = root.querySelector<HTMLElement>('[part="box"]')!
    const titleRow = root.querySelector<HTMLElement>('.title-row')!
    const p = progress.getBoundingClientRect()
    const b = box.getBoundingClientRect()
    const t = titleRow.getBoundingClientRect()
    return {
      topClass: progress.classList.contains('progress-top'),
      aboveTitle: p.bottom <= t.top + 1, // 进度条在标题行上方（卡盒顶部）
      insideBox: p.top >= b.top - 1,
      notHidden: !progress.hidden,
    }
  })
  expect(r.topClass).toBe(true)
  expect(r.aboveTitle).toBe(true)
  expect(r.insideBox).toBe(true)
  expect(r.notHidden).toBe(true)
})

test('notification 长内容可滚动：描述区限高 + overflow-y auto 且真实可滚', async ({ page }) => {
  await page.goto('/components/notification.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).notification !== 'undefined', null, {
    timeout: 10000,
  })
  await page.locator('.demo-block', { hasText: '长内容可滚动' }).locator('oas-button').click()
  await page.waitForFunction(
    () =>
      document
        .querySelector('oas-notification')
        ?.shadowRoot?.querySelector('[part="description"]')
        ?.classList.contains('scrollable') ?? false,
    null,
    { timeout: 5000 },
  )
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-notification')!
    const desc = el.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!
    const cs = getComputedStyle(desc)
    return {
      scrollableClass: desc.classList.contains('scrollable'),
      maxHeight: cs.maxHeight,
      overflowY: cs.overflowY,
      scrollable: desc.scrollHeight > desc.clientHeight, // 内容超长 → 真实可滚
    }
  })
  expect(r.scrollableClass).toBe(true)
  expect(r.maxHeight).not.toBe('none')
  expect(r.overflowY).toBe('auto')
  expect(r.scrollable).toBe(true)
})

// —— calendar P1 补缺：自定义单元格 + 模式切换 ——
// 曾现缺口：日历无法标记节假日/事件点；year 模式选中月份后停留在年视图。
// 本次补 oas-cell-render（detail { date, element }）+ template[slot="cell"] + year 选月自动切回 month。

test('calendar 自定义单元格：cell-render 标记的节假日点可见', async ({ page }) => {
  await page.goto('/components/calendar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-calendar#calendar-cell-render')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-calendar#calendar-cell-render')!
    const dots = [...el.shadowRoot!.querySelectorAll('.day .cell-dot')].map((d) => {
      const btn = d.closest('.day')
      return { iso: btn?.getAttribute('data-date'), cls: btn?.className }
    })
    return { dots, text: el.shadowRoot!.querySelector('[part="title"]')?.textContent ?? '' }
  })
  expect(r.text).toContain('2026')
  // 至少两个节假日点（建军节 8-01、8-15），且标记落在本日单元格上
  expect(r.dots.length).toBeGreaterThanOrEqual(2)
  expect(r.dots.some((d) => d.iso === '2026-08-01' && d.cls?.includes('holiday'))).toBe(true)
})

test('calendar 模式切换：year 选中月份后自动切回月视图（value 双向同步）', async ({ page }) => {
  await page.goto('/components/calendar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-calendar#calendar-mode')
  // 切到年视图
  await page.locator('#calendar-mode-year').click()
  await page.waitForFunction(() => {
    const el = document.querySelector('oas-calendar#calendar-mode')!
    return (
      el.getAttribute('mode') === 'year' &&
      el.shadowRoot!.querySelectorAll('.month-cell').length === 12
    )
  })
  // 年视图下点 2026 年 7 月 → value 更新 + 自动切回月视图
  await page.evaluate(() => {
    const el = document.querySelector('oas-calendar#calendar-mode')!
    const months = el.shadowRoot!.querySelectorAll('.month-cell')
    ;(months[6] as HTMLElement).click()
  })
  await page.waitForFunction(() => {
    const el = document.querySelector('oas-calendar#calendar-mode')!
    return (
      el.getAttribute('value') === '2026-07' &&
      el.getAttribute('mode') === 'month' &&
      el.shadowRoot!.querySelectorAll('.day').length > 0
    )
  })
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-calendar#calendar-mode')!
    return {
      mode: el.getAttribute('mode'),
      value: el.getAttribute('value'),
      title: el.shadowRoot!.querySelector('[part="title"]')!.textContent,
      output: document.querySelector('#calendar-mode-output')?.textContent ?? '',
    }
  })
  expect(r.mode).toBe('month')
  expect(r.value).toBe('2026-07')
  expect(r.title).toContain('2026年7月')
  expect(r.output).toContain('oas-mode-change')
})

// —— slider P1 补缺：show-input 联动 + 自定义滑块 + reverse ——
// 曾现缺口：滑块无数值输入联动（精确取值只能靠猜）、滑块外观不可定制、方向不可反转。
// 本次补 show-input（双向同步 + 防抖 + 夹取）、range（双滑块区间）、custom-thumb（模板/插槽）、reverse。

test('slider show-input：拖动滑块实时更新输入框、输入数字防抖后驱动滑块', async ({ page }) => {
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider[show-input]')
  const el = page.locator('oas-slider[show-input]').first()
  // 初始：输入框与滑块数值一致
  const r0 = await el.evaluate((node) => {
    const root = node.shadowRoot!
    const input = root.querySelector<HTMLInputElement>('[data-role="range"]')!
    const num = root.querySelector<HTMLInputElement>('[data-role="num"]')!
    return { range: Number(input.value), num: num.value }
  })
  expect(r0.num).toBe(String(r0.range))
  // 拖动滑块（派发 input）→ 输入框实时更新
  await el.evaluate((node) => {
    const root = node.shadowRoot!
    const input = root.querySelector<HTMLInputElement>('[data-role="range"]')!
    input.value = '77'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const r1 = await el.evaluate((node) => {
    const root = node.shadowRoot!
    return root.querySelector<HTMLInputElement>('[data-role="num"]')!.value
  })
  expect(r1).toBe('77')
  // 输入数字 → 防抖（300ms）后驱动滑块
  await el.evaluate((node) => {
    const root = node.shadowRoot!
    const num = root.querySelector<HTMLInputElement>('[data-role="num"]')!
    num.value = '35'
    num.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForFunction(
    () => {
      const el = document.querySelector('oas-slider[show-input]')
      const input = el?.shadowRoot?.querySelector<HTMLInputElement>('[data-role="range"]')
      return input != null && Number(input.value) === 35
    },
    null,
    { timeout: 5000 },
  )
})

test('slider range：双滑块区间 + 双输入框联动且方向反向（reverse）生效', async ({ page }) => {
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider[range][show-input]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[range][show-input]')!
    const root = el.shadowRoot!
    const min = root.querySelector<HTMLInputElement>('[data-role="range-min"]')!
    const max = root.querySelector<HTMLInputElement>('[data-role="range-max"]')!
    const numMin = root.querySelector<HTMLInputElement>('[data-role="num-min"]')!
    const numMax = root.querySelector<HTMLInputElement>('[data-role="num-max"]')!
    const fill = root.querySelector<HTMLElement>('.fill')!
    return {
      min: Number(min.value),
      max: Number(max.value),
      numMin: numMin.value,
      numMax: numMax.value,
      fillWidth: fill.style.width,
      minAria: min.getAttribute('aria-label'),
      maxAria: max.getAttribute('aria-label'),
    }
  })
  expect(r.min).toBe(20)
  expect(r.max).toBe(80)
  expect(r.numMin).toBe('20')
  expect(r.numMax).toBe('80')
  expect(r.fillWidth).toBe('60%')
  expect(r.minAria).toBeTruthy()
  expect(r.maxAria).toBeTruthy()

  // reverse demo：方向反转 + 填充区从右端
  await up(page, 'oas-slider[reverse]')
  const rev = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[reverse]')!
    const root = el.shadowRoot!
    const input = root.querySelector<HTMLInputElement>('[data-role="range"]')!
    const fill = root.querySelector<HTMLElement>('.fill')!
    return {
      dir: input.getAttribute('dir'),
      fillRight: fill.style.right,
      fillWidth: fill.style.width,
      ariaLabel: input.getAttribute('aria-label'),
      ariaNow: input.getAttribute('aria-valuenow'),
    }
  })
  expect(rev.dir).toBe('rtl')
  expect(rev.fillRight).toBe('0%')
  expect(parseFloat(rev.fillWidth)).toBeGreaterThan(0)
  expect(rev.ariaLabel).toBeTruthy()
  expect(rev.ariaNow).toBe('60')
})

test('slider custom-thumb：模板内容克隆进滑块、值气泡显示当前值、原生 thumb 隐藏', async ({
  page,
}) => {
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider[show-tooltip]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[show-tooltip]')!
    const root = el.shadowRoot!
    const thumb = root.querySelector<HTMLElement>('.custom-thumb[data-thumb="value"]')!
    return {
      visible: !thumb.hidden,
      content: thumb.querySelector('.thumb-content')?.textContent ?? '',
      tip: thumb.querySelector('.thumb-tip')?.textContent ?? '',
      tipVisible: !thumb.querySelector('.thumb-tip')?.hasAttribute('hidden'),
      nativeHidden: el.hasAttribute('data-custom-thumb'),
      dataPct: thumb.getAttribute('data-pct'),
    }
  })
  expect(r.visible).toBe(true)
  expect(r.content).toContain('🎯')
  expect(r.tip).toBe('60')
  expect(r.tipVisible).toBe(true)
  expect(r.nativeHidden).toBe(true)
  expect(parseFloat(r.dataPct ?? '')).toBe(60)
})

test('message 分组与更新：同组合并计数、update/destroy 可见反馈', async ({ page }) => {
  // 曾现风险：group/key 能力不透明，命令式 API 只有 show/close，同组消息堆叠、更新只能先关再弹。
  // 现要求：同 group 合并为一条并递增计数；update(key, options) 原位改内容/类型；destroy(key) 关单条。
  await page.goto('/components/message.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, {
    timeout: 10000,
  })
  // 同 group 连点两次 → 合并为一条且计数 ×2（demo 按钮带 group + duration 0，可连点）
  const groupBlock = page.locator('.demo-block', { hasText: '分组消息' })
  await groupBlock.locator('oas-button').nth(0).click()
  await groupBlock.locator('oas-button').nth(0).click()
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length === 1, null, {
    timeout: 5000,
  })
  let text = await page.evaluate(
    () =>
      document.querySelector('oas-message')?.shadowRoot?.querySelector('[part="text"]')
        ?.textContent ?? '',
  )
  expect(text).toContain('保存成功')
  expect(text).toContain('×2')
  // 不同 group → 相互独立（2 条）
  await groupBlock.locator('oas-button').nth(1).click()
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length === 2, null, {
    timeout: 5000,
  })
  // update：点「开始上传」新建 key=upload，再点「更新为成功」→ 原位改类型/内容（计数不显示后缀）
  const updateBlock = page.locator('.demo-block', { hasText: '更新消息' })
  await updateBlock.locator('oas-button').nth(0).click()
  await updateBlock.locator('oas-button').nth(1).click()
  await page.waitForFunction(
    () => document.querySelector('oas-message[key="upload"]')?.getAttribute('type') === 'success',
    null,
    { timeout: 5000 },
  )
  const upd = await page.evaluate(() => {
    const el = document.querySelector('oas-message[key="upload"]')!
    return {
      text: el.shadowRoot!.querySelector('[part="text"]')!.textContent ?? '',
      total: document.querySelectorAll('oas-message').length,
    }
  })
  expect(upd.text).toBe('上传成功')
  expect(upd.total).toBe(3)
  // destroy：关闭指定 key，其余保留
  await updateBlock.locator('oas-button').nth(2).click()
  await page.waitForFunction(
    () => document.querySelector('oas-message[key="upload"]') == null,
    null,
    {
      timeout: 5000,
    },
  )
  expect(await page.locator('oas-message').count()).toBe(2)
  // 同组再点 → 计数继续累加（×3，分组合并后 count 持久）
  await groupBlock.locator('oas-button').nth(0).click()
  await page.waitForFunction(
    () =>
      document
        .querySelector('oas-message[group="save"]')
        ?.shadowRoot?.querySelector('[part="text"]')
        ?.textContent?.includes('×3') ?? false,
    null,
    { timeout: 5000 },
  )
})

// —— breadcrumb P1 补缺：折叠（collapsed/max-items）+ 单行省略（ellipsis）——
// 曾现缺口：长路径面包屑无处折叠、窄容器下换行/溢出。本次补 collapsed + max-items 中间折叠为 …，
// 点击展开下拉查看全部；ellipsis 单行省略 + 链接全文 title。

test('breadcrumb 折叠：超出 max-items 中间项折叠为 …，点击展开下拉、点击项派发 oas-select', async ({
  page,
}) => {
  await page.goto('/components/breadcrumb.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-breadcrumb#bc-collapsed')
  // 折叠态：可见 item 4（首 + … + 末2），省略按钮可聚焦（aria-expanded=false）、下拉默认关闭
  const r0 = await page.evaluate(() => {
    const el = document.querySelector('oas-breadcrumb#bc-collapsed')!
    const root = el.shadowRoot!
    const btn = root.querySelector<HTMLButtonElement>('.ellipsis-btn')!
    const dd = root.querySelector<HTMLElement>('.ellipsis-dropdown')!
    return {
      itemCount: root.querySelectorAll('nav > .item').length,
      btnText: btn.textContent,
      ariaExpanded: btn.getAttribute('aria-expanded'),
      ariaLabel: btn.getAttribute('aria-label'),
      open: dd.classList.contains('open'),
      hiddenLabels: [...dd.querySelectorAll('a')].map((a) => a.textContent),
      current: root.querySelector('[part="current"]')?.textContent ?? '',
    }
  })
  expect(r0.itemCount).toBe(4)
  expect(r0.btnText).toContain('…')
  expect(r0.ariaExpanded).toBe('false')
  expect(r0.ariaLabel).toBeTruthy()
  expect(r0.open).toBe(false)
  expect(r0.hiddenLabels).toEqual(['组件', '导航', '数据展示'])
  expect(r0.current).toBe('面包屑')
  // 点击 … 展开下拉
  await page.evaluate(() => {
    const el = document.querySelector('oas-breadcrumb#bc-collapsed')!
    el.shadowRoot!.querySelector<HTMLElement>('.ellipsis-btn')!.click()
  })
  await page.waitForFunction(() => {
    const el = document.querySelector('oas-breadcrumb#bc-collapsed')!
    return el.shadowRoot!.querySelector('.ellipsis-dropdown')!.classList.contains('open')
  })
  // 点击折叠项：派发 oas-select（demo 输出可见反馈）+ 下拉关闭
  await page.evaluate(() => {
    const el = document.querySelector('oas-breadcrumb#bc-collapsed')!
    el.shadowRoot!.querySelector<HTMLElement>('.ellipsis-dropdown a')!.click()
  })
  await page.waitForFunction(() => {
    const el = document.querySelector('oas-breadcrumb#bc-collapsed')!
    return !el.shadowRoot!.querySelector('.ellipsis-dropdown')!.classList.contains('open')
  })
  const output = await page.locator('#bc-collapsed-result').textContent()
  expect(output).toContain('已点击')
})

test('breadcrumb 单行省略：ellipsis 时 nav 不换行 class + 链接带全文 title', async ({ page }) => {
  await page.goto('/components/breadcrumb.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-breadcrumb#bc-ellipsis')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-breadcrumb#bc-ellipsis')!
    const root = el.shadowRoot!
    const nav = root.querySelector('nav')!
    const link = root.querySelector<HTMLAnchorElement>('nav > .item > [part="link"]')!
    return {
      ellipsis: nav.classList.contains('ellipsis'),
      title: link.getAttribute('title'),
    }
  })
  expect(r.ellipsis).toBe(true)
  expect(r.title).toBeTruthy()
})

test('tabs 动态增删：+ 新增默认标签（locale 文案、选中、roving tabindex），× 关闭可见反馈', async ({
  page,
}) => {
  await page.goto('/components/tabs.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tabs[addable] oas-tab-panel')
  const r1 = await page.evaluate(() => {
    const t = document.querySelector('#tabs-editable')!
    const add = t.shadowRoot!.querySelector<HTMLElement>('.tab-add')!
    add.focus() // 模拟真实点击：先聚焦 + 按钮（键盘 Enter / 鼠标按下都会聚焦）
    add.click()
    // 排除 + 占位 tab（role=tab 但无 data-value，axe aria-required-children 需要它是 tab）
    const tabs = [...t.shadowRoot!.querySelectorAll('[role="tab"][data-value]')]
    const selected = tabs.find((b) => b.getAttribute('aria-selected') === 'true')!
    return {
      count: tabs.length,
      selectedText: selected.textContent ?? '',
      selectedTabIndex: selected.getAttribute('tabindex'),
      otherTabIndexes: tabs.filter((b) => b !== selected).map((b) => b.getAttribute('tabindex')),
      panelCount: t.querySelectorAll('oas-tab-panel').length,
      focusOnNew: t.shadowRoot!.activeElement === selected,
    }
  })
  expect(r1.count).toBe(3)
  expect(r1.panelCount).toBe(3)
  expect(r1.selectedText).toContain('新标签')
  expect(r1.selectedTabIndex).toBe('0')
  expect(r1.otherTabIndexes.every((v) => v === '-1')).toBe(true)
  expect(r1.focusOnNew).toBe(true)

  // 关闭新增的激活标签 → 面板移除 + 切回第一个 + 焦点仍在标签栏
  const r2 = await page.evaluate(() => {
    const t = document.querySelector('#tabs-editable')!
    const key = t.getAttribute('active')!
    const tabs = [...t.shadowRoot!.querySelectorAll('[role="tab"][data-value]')]
    const idx = tabs.findIndex((b) => b.getAttribute('data-value') === key)
    const close = tabs[idx]!.querySelector<HTMLElement>('.tab-close')!
    close.focus // 模拟真实鼠标点击 ×（mousedown 聚焦可聚焦的关闭位）
    close.click()
    const after = [...t.shadowRoot!.querySelectorAll('[role="tab"][data-value]')]
    return {
      panelCount: t.querySelectorAll('oas-tab-panel').length,
      active: t.getAttribute('active'),
      firstSelected: after[0]?.getAttribute('aria-selected'),
      focusInTablist: !!after.find((b) => b === t.shadowRoot!.activeElement),
    }
  })
  expect(r2.panelCount).toBe(2)
  expect(r2.active).toBe('a')
  expect(r2.firstSelected).toBe('true')
  expect(r2.focusInTablist).toBe(true)
})

test('tabs 键盘方向键：焦点随 roving tabindex 移动、aria-selected 同步', async ({ page }) => {
  await page.goto('/components/tabs.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tabs oas-tab-panel')
  const r = await page.evaluate(() => {
    const t = document.querySelector('oas-tabs')!
    const tablist = t.shadowRoot!.querySelector<HTMLElement>('[role="tablist"]')!
    const first = t.shadowRoot!.querySelector<HTMLElement>('[role="tab"]')!
    first.focus()
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    const tabs = [...t.shadowRoot!.querySelectorAll('[role="tab"]')]
    return {
      active: t.getAttribute('active'),
      focusIndex: tabs.indexOf(t.shadowRoot!.activeElement as Element),
      selectedIndex: tabs.findIndex((b) => b.getAttribute('aria-selected') === 'true'),
      tabIndexes: tabs.map((b) => b.getAttribute('tabindex')),
    }
  })
  expect(r.active).toBe('b')
  expect(r.focusIndex).toBe(1)
  expect(r.selectedIndex).toBe(1)
  expect(r.tabIndexes).toEqual(['-1', '0', '-1'])
})

test('tabs 图标标签：icon 属性渲染 SVG，slot="icon" 自定义图标，均对读屏隐藏', async ({ page }) => {
  await page.goto('/components/tabs.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tabs#tabs-icon oas-tab-panel')
  const r = await page.evaluate(() => {
    const t = document.querySelector('#tabs-icon')!
    const icons = [...t.shadowRoot!.querySelectorAll('.tab-icon')]
    return {
      svgCount: icons.filter((i) => i.querySelector('svg')).length,
      texts: icons.map((i) => i.textContent ?? ''),
      hidden: icons.every((i) => i.getAttribute('aria-hidden') === 'true'),
    }
  })
  expect(r.svgCount).toBe(3) // star / mail / search
  expect(r.texts.join('')).toContain('🚀')
  expect(r.hidden).toBe(true)
})

// —— steps P1 补缺：点状（progress-dot）+ 导航模式（navigation）——
// 曾现缺口：步骤只有序号圆点一种形态，无点状/导航形态；导航模式无内置上一步/下一步。
// 本次补 progress-dot（圆点 + 细连线 + 点击/键盘切换）与 navigation（箭头导航条 + 底部按钮）。

test('steps progress-dot：属性在 Vue demo 存活、指示器为装饰性圆点、连线细且对齐圆心', async ({
  page,
}) => {
  await page.goto('/components/steps.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-steps[progress-dot]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-steps[progress-dot]')!
    const root = el.shadowRoot!
    const items = [...root.querySelectorAll('.item')]
    const icons = items.map((it) => it.querySelector('.icon')!)
    const line = getComputedStyle(items[0]!, '::after')
    const iconRect = icons[0]!.getBoundingClientRect()
    const itemRect = items[0]!.getBoundingClientRect()
    return {
      attrSurvived: el.getAttribute('progress-dot'),
      dotMarked: root.querySelector('[part="steps"]')!.getAttribute('data-progress-dot'),
      iconsEmpty: icons.every((i) => i.textContent === ''),
      iconsAriaHidden: icons.every((i) => i.getAttribute('aria-hidden') === 'true'),
      lineHeight: line.height,
      lineTop: line.top,
      iconCenterY: Math.round(iconRect.top + iconRect.height / 2 - itemRect.top),
      processAriaCurrent: items
        .find((i) => i.getAttribute('data-status') === 'process')
        ?.getAttribute('aria-current'),
      processDotWider:
        parseFloat(
          getComputedStyle(
            items.find((i) => i.getAttribute('data-status') === 'process')!.querySelector('.icon')!,
            '::before',
          ).width,
        ) >
        parseFloat(
          getComputedStyle(
            items.find((i) => i.getAttribute('data-status') === 'wait')!.querySelector('.icon')!,
            '::before',
          ).width,
        ),
    }
  })
  expect(r.attrSurvived, 'progress-dot 被 Vue 剥离').toBe('')
  expect(r.dotMarked).toBe('true')
  expect(r.iconsEmpty).toBe(true)
  expect(r.iconsAriaHidden).toBe(true)
  expect(r.lineHeight).toBe('2px')
  // 连线贴近圆心（此前在指示器底部；24px 指示器中心 12，允许 1px 误差）
  expect(Math.abs(parseFloat(r.lineTop) + 1 - r.iconCenterY)).toBeLessThanOrEqual(2)
  expect(r.processAriaCurrent).toBe('step')
  expect(r.processDotWider, '当前步圆点应放大').toBe(true)
})

test('steps navigation：底部上一步/下一步可见，点击切换 current 并弹 message 反馈，末步下一步禁用', async ({
  page,
}) => {
  await page.goto('/components/steps.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-steps[navigation]')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, {
    timeout: 10000,
  })
  const r0 = await page.evaluate(() => {
    const el = document.querySelector('oas-steps[navigation]')!
    const root = el.shadowRoot!
    const nav = root.querySelector('[part="nav"]')!
    const items = [...root.querySelectorAll('.item')]
    const process = items.find((i) => i.getAttribute('data-status') === 'process')!
    return {
      attrSurvived: el.getAttribute('navigation'),
      navMarked: root.querySelector('[part="steps"]')!.getAttribute('data-navigation'),
      navVisible: !nav.hasAttribute('hidden'),
      prevText: nav.querySelector<HTMLButtonElement>('[part="prev"]')!.textContent,
      nextText: nav.querySelector<HTMLButtonElement>('[part="next"]')!.textContent,
      prevDisabled: nav.querySelector<HTMLButtonElement>('[part="prev"]')!.disabled,
      nextDisabled: nav.querySelector<HTMLButtonElement>('[part="next"]')!.disabled,
      processAriaCurrent: process.getAttribute('aria-current'),
      processBg: getComputedStyle(process).backgroundColor,
      processColor: getComputedStyle(process.querySelector('.text')!).color,
      itemClickable: items.every(
        (i) => i.getAttribute('role') === 'button' && i.getAttribute('tabindex') === '0',
      ),
      descHidden: items.every((i) => !i.querySelector('.desc')),
      arrowExists: getComputedStyle(items[0]!, '::after').width === '16px',
    }
  })
  expect(r0.attrSurvived, 'navigation 被 Vue 剥离').toBe('')
  expect(r0.navMarked).toBe('true')
  expect(r0.navVisible).toBe(true)
  expect(r0.prevText).toBe('上一步')
  expect(r0.nextText).toBe('下一步')
  expect(r0.prevDisabled).toBe(false)
  expect(r0.nextDisabled).toBe(false)
  expect(r0.processAriaCurrent).toBe('step')
  expect(r0.processBg).toBe('rgb(11, 108, 255)') // --oas-color-primary（light）
  expect(r0.processColor).toBe('rgb(255, 255, 255)') // --oas-color-text-on-primary
  expect(r0.itemClickable).toBe(true)
  expect(r0.descHidden).toBe(true)
  expect(r0.arrowExists).toBe(true)

  // 点击下一步 → current 前移 + oas-change 弹 message（可见反馈）
  await page.evaluate(() => {
    const el = document.querySelector('oas-steps[navigation]')!
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="next"]')!.click()
  })
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length > 0, null, {
    timeout: 5000,
  })
  const after = await page.evaluate(() => {
    const el = document.querySelector('oas-steps[navigation]')!
    const root = el.shadowRoot!
    const msg = document.querySelector('oas-message')?.shadowRoot?.textContent ?? ''
    const items = [...root.querySelectorAll('.item')]
    const process = items.find((i) => i.getAttribute('data-status') === 'process')!
    return {
      current: el.getAttribute('current'),
      processText: process.querySelector('.text')?.textContent,
      msg,
    }
  })
  expect(after.current).toBe('2')
  expect(after.processText).toContain('提交完成')
  expect(after.msg).toContain('当前步骤')
  expect(after.msg).toContain('第 3 步')

  // 末步下一步禁用
  const lastDisabled = await page.evaluate(() => {
    const el = document.querySelector('oas-steps[navigation]')!
    return el.shadowRoot!.querySelector<HTMLButtonElement>('[part="next"]')!.disabled
  })
  expect(lastDisabled).toBe(true)

  // 点击上一步回退 + 步骤项点击也可切换（点击第 1 项回到第 1 步）
  await page.evaluate(() => {
    const el = document.querySelector('oas-steps[navigation]')!
    el.shadowRoot!.querySelector<HTMLElement>('.item')!.click()
  })
  await page.waitForFunction(
    () => document.querySelector('oas-steps[navigation]')?.getAttribute('current') === '0',
    null,
    { timeout: 5000 },
  )
})

// —— dropdown P1 补缺：拆分下拉按钮（split）+ loading 菜单项 ——
// 曾现缺口：下拉只有整体触发一种形态，无  Dropdown.Button 式拆分按钮；菜单项无 loading 态。
// 本批补：split（主按钮派发 oas-action + 箭头按钮开合菜单 + aria 同步）与菜单项 loading（spinner 禁点）。

test('dropdown split：Vue demo 属性存活、箭头按钮 aria 同步、主按钮 oas-action 有可见反馈', async ({
  page,
}) => {
  await page.goto('/components/dropdown.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-dropdown[split]')
  await page.waitForFunction(() => typeof (window as any).ddSplitAction === 'function', null, {
    timeout: 10000,
  })
  // 点拆分主按钮（host 中心落在主按钮上）→ oas-action → tag 回显（可见反馈）
  await page.locator('#dd-split').click()
  await page.waitForFunction(
    () => document.getElementById('dd-split-result')?.textContent === '主按钮已点击（oas-action）',
    null,
    { timeout: 5000 },
  )
  const r = await page.evaluate(() => {
    const dd = document.querySelector('#dd-split')!
    const arrow = dd.shadowRoot!.querySelector<HTMLElement>('[part="split-arrow"]')!
    const cs = getComputedStyle(arrow)
    return {
      splitAttr: dd.getAttribute('split'),
      hasArrow: !!arrow,
      haspoup: arrow.getAttribute('aria-haspopup'),
      expanded: arrow.getAttribute('aria-expanded'),
      label: arrow.getAttribute('aria-label'),
      open: dd.hasAttribute('open'),
      display: cs.display,
      height: cs.height,
      topLeftRadius: cs.borderTopLeftRadius,
      topRightRadius: cs.borderTopRightRadius,
    }
  })
  expect(r.splitAttr, 'split 属性被 Vue 剥离').not.toBeNull()
  expect(r.hasArrow).toBe(true)
  expect(r.haspoup).toBe('menu')
  expect(r.expanded).toBe('false')
  expect(r.label).toBe('打开菜单') // locale 可访问名称
  expect(r.open).toBe(false)
  expect(r.display).not.toBe('none') // split 下箭头按钮可见
  expect(r.height).toBe('32px') // 与 --oas-control-height-md 主按钮等高（align-self stretch）
  expect(r.topLeftRadius).toBe('0px') // 左直右圆，与主按钮贴合
  expect(r.topRightRadius).toBe('6px')

  // 点箭头 → 展开菜单 + aria-expanded 同步
  await page.locator('#dd-split [part="split-arrow"]').click()
  await page.waitForFunction(
    () =>
      document.querySelector('#dd-split')?.hasAttribute('open') === true &&
      document
        .querySelector('#dd-split')!
        .shadowRoot!.querySelector<HTMLElement>('[part="split-arrow"]')!
        .getAttribute('aria-expanded') === 'true',
    null,
    { timeout: 5000 },
  )
})

test('dropdown loading 菜单项：spinner 视觉 + 禁点，异步恢复后还原可点', async ({ page }) => {
  await page.goto('/components/dropdown.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#dd-async')
  await page.waitForFunction(() => typeof (window as any).ddAsyncLog === 'function', null, {
    timeout: 10000,
  })
  // 打开异步 demo 菜单并选「保存」→ 该项转圈禁点（demo 1.5s 后恢复）
  await page.evaluate(() => document.querySelector('#dd-async')!.setAttribute('open', ''))
  await page.waitForSelector('#dd-async [role="menuitemradio"]', { timeout: 5000 })
  await page.locator('#dd-async [role="menuitemradio"]', { hasText: '保存' }).first().click()
  // 等 demo 把「保存」置 loading（items 数据驱动）；menu 浮层在两层 shadow 内，
  // 这里只查 items 属性，元素态用穿透 locator 断言
  await page.waitForFunction(
    () => {
      const dd = document.querySelector('#dd-async')!
      const save = JSON.parse(dd.getAttribute('items') ?? '[]').find(
        (i: { value: string }) => i.value === 'save',
      )
      return save?.loading === true
    },
    null,
    { timeout: 5000 },
  )
  const saveItem = page.locator('#dd-async [part="item"][data-value="save"]')
  await expect(saveItem).toHaveClass(/loading/)
  const during = await saveItem.evaluate((el) => {
    const spin = el.querySelector('.spin')
    return {
      busy: el.getAttribute('aria-busy'),
      ariaDisabled: el.getAttribute('aria-disabled'),
      hasSpin: !!spin,
      cursor: getComputedStyle(el).cursor,
    }
  })
  expect(during.busy).toBe('true')
  expect(during.ariaDisabled).toBe('true')
  expect(during.hasSpin).toBe(true)
  expect(during.cursor).toBe('wait')

  // 等 1.5s 异步完成 → spinner 消失、禁点解除
  await page.waitForFunction(
    () => {
      const dd = document.querySelector('#dd-async')!
      const save = JSON.parse(dd.getAttribute('items') ?? '[]').find(
        (i: { value: string }) => i.value === 'save',
      )
      return save && !save.loading
    },
    null,
    { timeout: 5000 },
  )
  await expect(saveItem).not.toHaveClass(/loading/)
  const after = await saveItem.evaluate((el) => ({
    hasSpin: !!el.querySelector('.spin'),
    busy: el.getAttribute('aria-busy'),
  }))
  expect(after.hasSpin).toBe(false)
  expect(after.busy).toBeNull()
})

// —— tooltip P1 补缺：虚拟触发（virtual-trigger）——
// 曾现缺口：tooltip 只能绑定宿主元素 hover/focus，图表点位、拖拽中的浮层提示等
// 无触发元素的场景无法使用。本次补 virtual 模式：open 受控 + oas-open-change +
// virtual-anchor（锚点元素选择器）/ virtual-x、virtual-y（视口坐标）定位。

test('tooltip virtual 坐标跟随：鼠标移入画布 tooltip 跟随显示、移出隐藏（Vue demo 属性存活 + 可见反馈）', async ({
  page,
}) => {
  await page.goto('/components/tooltip.html', { waitUntil: 'domcontentloaded' })
  // oas-tooltip host 零尺寸（inline-block 无内容），waitForSelector 默认等可见会超时 → 等 attached + shadowRoot
  await page.waitForSelector('#tt-follow', { state: 'attached', timeout: 15000 })
  await page.waitForFunction((s) => document.querySelector(s)?.shadowRoot != null, '#tt-follow', {
    timeout: 15000,
  })
  // virtual / virtual-x / virtual-y 在 Vue demo 中存活（不被剥离）
  const attrs = await page.evaluate(() => {
    const t = document.querySelector('#tt-follow')!
    return {
      virtual: t.getAttribute('virtual'),
      x: t.getAttribute('virtual-x'),
      y: t.getAttribute('virtual-y'),
    }
  })
  expect(attrs.virtual, 'virtual 被 Vue 剥离').not.toBeNull()
  expect(attrs.x).toBe('0')
  expect(attrs.y).toBe('0')

  // 画布滚到视口中央（避开粘性页头拦截指针）
  const canvas = page.locator('#vp-canvas')
  await canvas.scrollIntoViewIfNeeded()
  await page.evaluate(() => {
    document.querySelector('#vp-canvas')?.scrollIntoView({ block: 'center' })
  })
  await page.waitForTimeout(300)
  const box = await canvas.boundingBox()

  // 监听 oas-open-change 计数（demo 可见反馈：状态 tag 跟随中/未跟随）
  await page.evaluate(() => {
    ;(window as any).__tipOpenCount = 0
    document.querySelector('#tt-follow')!.addEventListener('oas-open-change', () => {
      ;(window as any).__tipOpenCount++
    })
  })

  // 移入画布 → tooltip 按坐标跟随显示
  await page.mouse.move(box!.x + 60, box!.y + 40)
  await page.waitForFunction(() => {
    const t = document.querySelector('#tt-follow')
    const tip = t?.shadowRoot?.querySelector<HTMLElement>('[part="tip"]')
    return tip?.getAttribute('aria-hidden') === 'false' && tip?.style.top !== ''
  })
  const r = await page.evaluate(() => {
    const t = document.querySelector('#tt-follow')!
    const tip = t.shadowRoot!.querySelector<HTMLElement>('[part="tip"]')!
    const tb = tip.getBoundingClientRect()
    return {
      openCount: (window as any).__tipOpenCount,
      status: document.querySelector('#tt-follow-status')?.textContent ?? '',
      content: tip.textContent,
      placement: tip.getAttribute('data-placement'),
      top: parseFloat(tip.style.top),
      left: parseFloat(tip.style.left),
      inViewport:
        tb.top >= 0 &&
        tb.left >= 0 &&
        tb.bottom <= window.innerHeight &&
        tb.right <= window.innerWidth,
    }
  })
  expect(r.openCount, '鼠标移入应派发 oas-open-change').toBeGreaterThan(0)
  expect(r.status, 'demo 状态 tag 应有可见反馈').toContain('跟随')
  expect(r.content).toContain('坐标') // 内容实时更新
  expect(r.placement).toBe('bottom')
  expect(r.top, 'tooltip 应定位在鼠标下方').toBeGreaterThan(0)
  expect(r.left).toBeGreaterThan(0)
  expect(r.inViewport, 'tooltip 不应溢出视口').toBe(true)

  // 移出画布 → tooltip 隐藏 + 状态反馈复位
  await page.mouse.move(box!.x + box!.width + 60, box!.y + 40)
  await page.waitForFunction(
    () =>
      document
        .querySelector('#tt-follow')
        ?.shadowRoot?.querySelector('[part="tip"]')
        ?.getAttribute('aria-hidden') === 'true',
  )
  const closed = await page.evaluate(
    () => document.querySelector('#tt-follow-status')?.textContent ?? '',
  )
  expect(closed).toContain('未跟随')
})

test('tooltip virtual-anchor：hover 图表点位 tooltip 锚定该点显示、切换点位跟随', async ({
  page,
}) => {
  await page.goto('/components/tooltip.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#tt-anchor', { state: 'attached', timeout: 15000 })
  await page.waitForFunction((s) => document.querySelector(s)?.shadowRoot != null, '#tt-anchor', {
    timeout: 15000,
  })
  const attrs = await page.evaluate(() => {
    const t = document.querySelector('#tt-anchor')!
    return { virtual: t.getAttribute('virtual'), anchor: t.getAttribute('virtual-anchor') }
  })
  expect(attrs.virtual, 'virtual 被 Vue 剥离').not.toBeNull()
  expect(attrs.anchor).toBe('#vp-dot-0')

  await page.evaluate(() => {
    document.querySelector('#vp-chart')?.scrollIntoView({ block: 'center' })
  })
  await page.waitForTimeout(300)

  // hover 点位 0 → tooltip 锚定显示（placement=top，气泡在点位上方）
  await page.locator('#vp-dot-0').hover()
  await page.waitForFunction(() => {
    const t = document.querySelector('#tt-anchor')
    const tip = t?.shadowRoot?.querySelector<HTMLElement>('[part="tip"]')
    return tip?.getAttribute('aria-hidden') === 'false'
  })
  const r0 = await page.evaluate(() => {
    const t = document.querySelector('#tt-anchor')!
    const tip = t.shadowRoot!.querySelector<HTMLElement>('[part="tip"]')!
    const tb = tip.getBoundingClientRect()
    const db = document.getElementById('vp-dot-0')!.getBoundingClientRect()
    return {
      content: tip.textContent,
      placement: tip.getAttribute('data-placement'),
      anchor: t.getAttribute('virtual-anchor'),
      aboveDot: Math.abs(tb.bottom - db.top) < 30, // 气泡底 ≈ 点位顶（8px gap）
    }
  })
  expect(r0.content).toContain('Q1')
  expect(r0.placement).toBe('top')
  expect(r0.anchor).toBe('#vp-dot-0')
  expect(r0.aboveDot, 'tooltip 应锚定在点位上方').toBe(true)

  // 切到点位 2 → virtual-anchor 与内容同步更新（跟随移动）
  await page.locator('#vp-dot-2').hover()
  await page.waitForFunction(() => {
    const t = document.querySelector('#tt-anchor')
    const tip = t?.shadowRoot?.querySelector<HTMLElement>('[part="tip"]')
    return tip?.textContent?.includes('Q3') ?? false
  })
  const r1 = await page.evaluate(() => {
    const t = document.querySelector('#tt-anchor')!
    return {
      anchor: t.getAttribute('virtual-anchor'),
      content: t.shadowRoot!.querySelector<HTMLElement>('[part="tip"]')!.textContent,
    }
  })
  expect(r1.anchor).toBe('#vp-dot-2')
  expect(r1.content).toContain('Q3')
})

// —— popover P1 补缺：嵌套浮层（nested）+ 虚拟触发（virtual）——
// 曾现缺口：popover 面板内无法再开子浮层（父关闭时子面板残留）、无图表/画布坐标提示能力。
// 本次补：父关闭级联关闭子层、Esc 逐层关闭并还原焦点；virtual 模式（同 tooltip 的
// virtual-x/virtual-y/virtual-anchor）+ oas-open-change。

test('popover 嵌套：父关闭级联关闭子层、Esc 逐层关闭、Vue demo 属性存活', async ({ page }) => {
  await page.goto('/components/popover.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#pop-parent')
  const parent = page.locator('#pop-parent')
  const child = page.locator('#pop-child')
  // 嵌套层级：子 popover 是父的 light DOM 后代，parent.locator('[part=panel]') 会同时匹配
  // 父/子两块面板（pierce 嵌套 shadow），故用 evaluate 精确取各自 shadow 内的面板。
  const panelState = () =>
    page.evaluate(() => {
      const p = document.querySelector('#pop-parent')!.shadowRoot!.querySelector('[part="panel"]')!
      const c = document.querySelector('#pop-child')!.shadowRoot!.querySelector('[part="panel"]')!
      return {
        pAria: p.getAttribute('aria-hidden'),
        cAria: c.getAttribute('aria-hidden'),
      }
    })

  // focus-on-open 属性在 Vue demo 中存活（不被剥离）
  const focusAttr = await parent.evaluate((e) => e.getAttribute('focus-on-open'))
  expect(focusAttr, 'focus-on-open 被 Vue 剥离').not.toBeNull()

  // 同时打开父子 → 子层可见且层级在父之上
  await parent.evaluate((e) => e.setAttribute('open', ''))
  await child.evaluate((e) => e.setAttribute('open', ''))
  await page.waitForFunction(
    () =>
      document
        .querySelector('#pop-child')
        ?.shadowRoot?.querySelector('[part="panel"]')
        ?.getAttribute('aria-hidden') === 'false',
    null,
    { timeout: 5000 },
  )
  let s = await panelState()
  expect(s.pAria).toBe('false')
  expect(s.cAria).toBe('false')
  const z = await page.evaluate(() => {
    const c = document.querySelector('#pop-child')!.shadowRoot!.querySelector('[part="panel"]')!
    const p = document.querySelector('#pop-parent')!.shadowRoot!.querySelector('[part="panel"]')!
    return { child: getComputedStyle(c).zIndex, parent: getComputedStyle(p).zIndex }
  })
  expect(z.child).toBe(z.parent) // 同 token；子层在父的 stacking context 内，视觉上盖在父之上

  // Esc 一次只关最内层（子），父保持打开
  await page.keyboard.press('Escape')
  s = await panelState()
  expect(s.cAria).toBe('true')
  expect(s.pAria).toBe('false')

  // 再次 Esc 关父层
  await page.keyboard.press('Escape')
  s = await panelState()
  expect(s.pAria).toBe('true')

  // 父关闭级联关闭子层
  await parent.evaluate((e) => e.setAttribute('open', ''))
  await child.evaluate((e) => e.setAttribute('open', ''))
  await page.waitForFunction(
    () =>
      document
        .querySelector('#pop-child')
        ?.shadowRoot?.querySelector('[part="panel"]')
        ?.getAttribute('aria-hidden') === 'false',
    null,
    { timeout: 5000 },
  )
  await parent.evaluate((e) => e.removeAttribute('open'))
  s = await panelState()
  expect(s.pAria).toBe('true')
  expect(s.cAria, '父关闭应级联关闭子层').toBe('true')
})

test('popover virtual：virtual-x/virtual-y 定位 + 锚点元素跟随 + oas-open-change 可见反馈', async ({
  page,
}) => {
  await page.goto('/components/popover.html', { waitUntil: 'domcontentloaded' })
  // oas-popover host 零尺寸（inline-block 无内容），waitForSelector 默认等可见会超时 → 等 attached + shadowRoot
  await page.waitForSelector('#pop-point', { state: 'attached', timeout: 15000 })
  await page.waitForFunction((s) => document.querySelector(s)?.shadowRoot != null, '#pop-point', {
    timeout: 15000,
  })
  const point = page.locator('#pop-point')

  // virtual / virtual-x / virtual-y 在 Vue demo 中存活（不被剥离）
  const attrs = await point.evaluate((e) => ({
    virtual: e.getAttribute('virtual'),
    x: e.getAttribute('virtual-x'),
    y: e.getAttribute('virtual-y'),
  }))
  expect(attrs.virtual, 'virtual 被 Vue 剥离').not.toBeNull()
  expect(attrs.x).toBe('160')
  expect(attrs.y).toBe('90')

  // 按坐标打开：placement=right → 面板左缘 = 160 + 8（gap），垂直居中于锚点
  await point.evaluate((e) => e.setAttribute('open', ''))
  const panel = point.locator('[part="panel"]')
  await expect(panel).toHaveAttribute('aria-hidden', 'false')
  await expect(panel).toHaveAttribute('data-placement', 'right')
  const box = (await panel.boundingBox())!
  expect(Math.abs(box.x - 168)).toBeLessThanOrEqual(2)
  expect(Math.abs(box.y - (90 - box.height / 2))).toBeLessThanOrEqual(2)

  // oas-open-change 可见反馈：demo 状态 tag 回显 open
  await page.waitForFunction(
    () => document.getElementById('pop-point-status')?.textContent === 'open: true',
    null,
    { timeout: 5000 },
  )

  // 外部点击不关闭（虚拟模式生命周期由宿主控制）
  await page.mouse.click(5, 5)
  await expect(panel).toHaveAttribute('aria-hidden', 'false')
  await point.evaluate((e) => e.removeAttribute('open'))

  // 换坐标重新打开：virtual-x/y 更新后 open 应重定位（宿主 mousemove 场景）
  await point.evaluate((e) => e.setAttribute('virtual-x', '700'))
  await point.evaluate((e) => e.setAttribute('virtual-y', '500'))
  await point.evaluate((e) => e.setAttribute('open', ''))
  await expect(panel).toHaveAttribute('aria-hidden', 'false')
  await page.waitForFunction(
    () => {
      const p = document
        .querySelector('#pop-point')!
        .shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
      return p.style.left === '708px' // 700 + 8（gap）
    },
    null,
    { timeout: 5000 },
  )
  const box2 = (await panel.boundingBox())!
  expect(Math.abs(box2.x - 708)).toBeLessThanOrEqual(2)
  expect(Math.abs(box2.y - (500 - box2.height / 2))).toBeLessThanOrEqual(2)
  await point.evaluate((e) => e.removeAttribute('open'))

  // 虚拟锚点元素跟随：hover 点位 → 面板锚定该点（placement=top，气泡在点位上方）
  const chart = page.locator('#pop-chart')
  await chart.scrollIntoViewIfNeeded()
  await page.evaluate(() => {
    document.querySelector('#pop-chart')?.scrollIntoView({ block: 'center' })
  })
  await page.waitForTimeout(300)
  await page.locator('#pop-dot-0').hover()
  const anchorPanel = page.locator('#pop-anchor [part="panel"]')
  await expect(anchorPanel).toHaveAttribute('aria-hidden', 'false', { timeout: 5000 })
  const anchorBox = (await anchorPanel.boundingBox())!
  const dotBox = (await page.locator('#pop-dot-0').boundingBox())!
  expect(anchorBox.y + anchorBox.height - dotBox.y).toBeLessThanOrEqual(40) // 气泡底 ≈ 点位顶（8px gap）
  // 切到点位 1 → 面板跟随
  await page.locator('#pop-dot-1').hover()
  await page.waitForFunction(() => {
    const t = document.querySelector('#pop-anchor')!
    return t.getAttribute('virtual-anchor') === '#pop-dot-1'
  })
})

// —— tree-select P1 补缺：勾选策略（check-strategy）+ 虚拟滚动（virtual）——
// 曾现缺口：多选只有父子级联一种取值模型，无  式
// check-strategy（parent 只父级 / child 只叶子）；万级数据下拉无窗口化渲染。
// 本批补：策略对比 demo 值回显、虚拟滚动窗口化渲染 + 滚动窗口平移 + 键盘导航 ARIA。

test('tree-select check-strategy：parent/child 勾选父级后值按策略过滤并可见回显', async ({
  page,
}) => {
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
        el
          .shadowRoot!.querySelector('oas-virtual-list')!
          .shadowRoot!.querySelectorAll('[role="treeitem"]').length > 0
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
      return (
        !!inner && inner.style.height !== '' && Number.parseInt(inner.style.height, 10) > 100000
      )
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

test('tree-select virtual：键盘导航高亮滚动进视口且 aria-activedescendant 跟随', async ({
  page,
}) => {
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
    const vp = el
      .shadowRoot!.querySelector('oas-virtual-list')!
      .shadowRoot!.querySelector('.viewport')!
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

test('popover.md 虚拟画布：#virt-canvas 有可见宽度且提示文字单行居中（不竖排）', async ({
  page,
}) => {
  await page.goto('/components/popover.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#virt-canvas', { timeout: 15000 })
  const r = await page.evaluate(() => {
    const canvas = document.getElementById('virt-canvas')!
    const p = canvas.querySelector('p')!
    const c = canvas.getBoundingClientRect()
    // Range 包围全部文本：单行时 rect 高≈字号、宽≈整句；竖排（每字一行）时 高≈句长×行高、宽≈单字
    const range = document.createRange()
    range.selectNodeContents(p)
    const t = range.getBoundingClientRect()
    return {
      canvasWidth: c.width,
      text: (p.textContent ?? '').trim(),
      textWidth: t.width,
      textHeight: t.height,
    }
  })
  expect(r.canvasWidth, '画布在 flex 容器里不应坍缩为 0').toBeGreaterThan(200)
  expect(r.text).toContain('移动鼠标')
  // 单行（不竖排）：文本包围盒宽度 ≥ 5 个汉字（约 70px）、高度 < 30px（1~2 行）
  expect(r.textWidth, '文字应单行横向排列，而非每字一行竖排').toBeGreaterThan(70)
  expect(r.textHeight).toBeLessThan(30)
})

test('tree 自定义节点：#tree-custom 每行 .label 实际渲染宽度 > 0（文字不被 flex 压没）', async ({
  page,
}) => {
  await page.goto('/components/tree.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tree-custom')
  await page.waitForTimeout(800)
  const r = await page.evaluate(() => {
    const tree = document.querySelector('#tree-custom')!
    return [...tree.shadowRoot!.querySelectorAll('[part="row"]')].map((row) => {
      const label = row.querySelector<HTMLElement>('.label')!
      const binder = label.querySelector<HTMLElement>('[data-node-label]')
      const lb = label.getBoundingClientRect()
      const bb = binder?.getBoundingClientRect()
      return {
        labelText: binder?.textContent ?? '',
        labelWidth: lb.width,
        binderWidth: bb?.width ?? 0,
        rowWidth: row.getBoundingClientRect().width,
      }
    })
  })
  expect(r.length).toBeGreaterThan(0)
  for (const [i, item] of r.entries()) {
    expect(item.labelText.length, `第 ${i} 行 [data-node-label] 文字缺失`).toBeGreaterThan(0)
    expect(item.labelWidth, `第 ${i} 行 .label 渲染宽度为 0（被 flex 压没）`).toBeGreaterThan(24)
    expect(item.binderWidth, `第 ${i} 行 [data-node-label] 实际宽度为 0`).toBeGreaterThan(0)
  }
  await page.screenshot({ path: 'C:\\WINDOWS\\TEMP\\opencode\\fix-tree-custom-label.png' })
})

test('tooltip 箭头：#tt-follow 打开后 .arrow 可见且位于面板顶部居中（placement=bottom 尖端朝上指向锚点）', async ({
  page,
}) => {
  await page.goto('/components/tooltip.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#tt-follow', { state: 'attached', timeout: 15000 })
  await page.waitForFunction((s) => document.querySelector(s)?.shadowRoot != null, '#tt-follow', {
    timeout: 15000,
  })
  const canvas = page.locator('#vp-canvas')
  await canvas.scrollIntoViewIfNeeded()
  await page.evaluate(() => {
    document.querySelector('#vp-canvas')?.scrollIntoView({ block: 'center' })
  })
  await page.waitForTimeout(300)
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + 60, box.y + 40)
  await page.waitForFunction(() => {
    const t = document.querySelector('#tt-follow')
    const tip = t?.shadowRoot?.querySelector<HTMLElement>('[part="tip"]')
    return (
      tip?.getAttribute('aria-hidden') === 'false' &&
      tip.querySelector('[data-popper-arrow]') != null
    )
  })
  const r = await page.evaluate(() => {
    const t = document.querySelector('#tt-follow')!
    const tip = t.shadowRoot!.querySelector<HTMLElement>('[part="tip"]')!
    const arrow = tip.querySelector<HTMLElement>('[data-popper-arrow]')!
    const tb = tip.getBoundingClientRect()
    const ab = arrow.getBoundingClientRect()
    return {
      placement: tip.getAttribute('data-placement'),
      arrowPart: arrow.getAttribute('part'),
      arrowVisible: ab.width > 0 && ab.height > 0,
      arrowAtTop: ab.top <= tb.top + 2, // 箭头横跨面板顶边（top: -4px → 旋转后更靠上）
      arrowCentered: Math.abs(ab.left + ab.width / 2 - (tb.left + tb.width / 2)) <= 6,
      arrowProtrudes: ab.top < tb.top, // 箭头尖端探出面板外沿
    }
  })
  expect(r.placement, '画布中部 placement=bottom 不翻转').toBe('bottom')
  expect(r.arrowPart).toBe('arrow')
  expect(r.arrowVisible, '箭头应真实渲染（宽高 > 0）').toBe(true)
  expect(r.arrowAtTop, 'bottom placement 箭头应在面板顶部').toBe(true)
  expect(r.arrowCentered, '箭头应水平居中指向锚点').toBe(true)
  expect(r.arrowProtrudes, '箭头尖端应探出面板外沿').toBe(true)
  await page.screenshot({ path: 'C:\\WINDOWS\\TEMP\\opencode\\fix-tooltip-arrow.png' })
})

test('popover 箭头：#pop-point 打开后 .arrow 可见且位于面板左缘居中（placement=right 面板在锚点右侧，尖端朝左指向锚点）', async ({
  page,
}) => {
  await page.goto('/components/popover.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#pop-point', { state: 'attached', timeout: 15000 })
  await page.waitForFunction((s) => document.querySelector(s)?.shadowRoot != null, '#pop-point', {
    timeout: 15000,
  })
  const point = page.locator('#pop-point')
  await point.evaluate((e) => e.setAttribute('open', ''))
  const panel = point.locator('[part="panel"]')
  await expect(panel).toHaveAttribute('aria-hidden', 'false')
  await expect(panel).toHaveAttribute('data-placement', 'right')
  const r = await point.evaluate((pop) => {
    const p = pop.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
    const arrow = p.querySelector<HTMLElement>('[data-popper-arrow]')!
    const pb = p.getBoundingClientRect()
    const ab = arrow.getBoundingClientRect()
    return {
      arrowPart: arrow.getAttribute('part'),
      arrowVisible: ab.width > 0 && ab.height > 0,
      arrowAtLeft: ab.left <= pb.left + 2, // 箭头横跨面板左边（left: -4px → 旋转后更靠左）
      arrowCentered: Math.abs(ab.top + ab.height / 2 - (pb.top + pb.height / 2)) <= 6,
      arrowProtrudes: ab.left < pb.left, // 尖端探出面板外沿指向锚点
    }
  })
  expect(r.arrowPart).toBe('arrow')
  expect(r.arrowVisible, '箭头应真实渲染（宽高 > 0）').toBe(true)
  expect(r.arrowAtLeft, 'right placement 箭头应在面板左缘').toBe(true)
  expect(r.arrowCentered, '箭头应垂直居中指向锚点').toBe(true)
  expect(r.arrowProtrudes, '箭头尖端应探出面板外沿').toBe(true)
  await point.evaluate((e) => e.removeAttribute('open'))
  await page.screenshot({ path: 'C:\\WINDOWS\\TEMP\\opencode\\fix-popover-arrow.png' })
})

// —— 缺陷回归：tooltip/popover 箭头能力补齐（arrow 显隐 / arrow-point-at-center / auto-adjust-overflow）——
// 曾现缺口：箭头固定渲染无显隐控制；箭头始终随面板居中，视口边缘避让导致面板偏移后
// 不再指向锚点中心。本次补：arrow="false" 隐藏箭头（元素与 ::part(arrow) 保留）、
// arrow-point-at-center 在面板被 clamp 时仍指向锚点中心。

test('tooltip arrow="false"：打开后无可见箭头元素（hidden 属性 + 0 尺寸，part 保留）', async ({
  page,
}) => {
  await page.goto('/components/tooltip.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tt-arrow-off')
  await page.evaluate(() => {
    document.querySelector('#tt-arrow-off')!.setAttribute('open', '')
  })
  const tip = page.locator('#tt-arrow-off [part="tip"]')
  await expect(tip).toHaveAttribute('aria-hidden', 'false')
  const r = await page.evaluate(() => {
    const host = document.querySelector('#tt-arrow-off')!
    const t = host.shadowRoot!.querySelector<HTMLElement>('[part="tip"]')!
    const arrow = t.querySelector<HTMLElement>('[data-popper-arrow]')!
    const ab = arrow.getBoundingClientRect()
    return {
      part: arrow.getAttribute('part'),
      hidden: arrow.hidden,
      hasHidden: arrow.hasAttribute('hidden'),
      w: ab.width,
      h: ab.height,
    }
  })
  expect(r.part, 'arrow="false" 时 ::part(arrow) 仍保留').toBe('arrow')
  expect(r.hidden, 'arrow="false" 箭头应带 hidden 属性').toBe(true)
  expect(r.hasHidden).toBe(true)
  expect(r.w, 'hidden 箭头不应渲染（宽 0）').toBe(0)
  expect(r.h, 'hidden 箭头不应渲染（高 0）').toBe(0)
})

test('tooltip arrow-point-at-center：面板被视口边缘避让 clamp 偏移后，箭头仍指向锚点中心', async ({
  page,
}) => {
  await page.goto('/components/tooltip.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tt-arrow-center')
  // 把触发元素钉到视口左缘（placement 默认 top）：面板水平居中会被 clamp 到视口左缘，
  // 默认箭头会随面板中心偏移（脱离锚点），arrow-point-at-center 箭头必须仍指向锚点中心
  await page.evaluate(() => {
    const host = document.querySelector('#tt-arrow-center')!
    // 锚点是 oas-button 自定义元素宿主（内部 button 在它自己的 shadow 里）
    const btn = host.querySelector('oas-button') as HTMLElement
    btn.style.position = 'fixed'
    btn.style.left = '12px'
    btn.style.top = '200px'
    host.setAttribute('open', '')
  })
  const tip = page.locator('#tt-arrow-center [part="tip"]')
  await expect(tip).toHaveAttribute('aria-hidden', 'false')
  const r = await page.evaluate(() => {
    const host = document.querySelector('#tt-arrow-center')!
    const t = host.shadowRoot!.querySelector<HTMLElement>('[part="tip"]')!
    const arrow = t.querySelector<HTMLElement>('[data-popper-arrow]')!
    const btn = host.querySelector('oas-button')!
    const tb = t.getBoundingClientRect()
    const ab = arrow.getBoundingClientRect()
    const bb = btn.getBoundingClientRect()
    return {
      placement: t.getAttribute('data-placement'),
      arrowVisible: ab.width > 0 && ab.height > 0,
      arrowCenterX: ab.left + ab.width / 2,
      btnCenterX: bb.left + bb.width / 2,
      panelClamped: tb.left < 20, // 面板确实被 clamp 到视口左缘（偏移发生）
    }
  })
  expect(r.placement, 'placement 默认 top 不应翻转').toBe('top')
  expect(r.arrowVisible, 'point-at-center 箭头应真实渲染').toBe(true)
  expect(r.panelClamped, '触发元素钉在视口左缘时面板应被 clamp 偏移').toBe(true)
  expect(
    Math.abs(r.arrowCenterX - r.btnCenterX),
    `箭头中心(${r.arrowCenterX.toFixed(1)})应指向锚点中心(${r.btnCenterX.toFixed(1)})`,
  ).toBeLessThanOrEqual(6)
})

// —— dropdown 箭头——
// 面板带指向触发元素的箭头（默认显示）；arrow="false" 隐藏（骨架保留）。

test('dropdown 箭头：#dd-arrow 打开后 .arrow 可见且位于面板顶部居中（placement=bottom 尖端朝上指向触发按钮）', async ({
  page,
}) => {
  await page.goto('/components/dropdown.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#dd-arrow')
  const dd = page.locator('#dd-arrow')
  await dd.locator(':scope > oas-button').click()
  await page.waitForFunction(() => {
    const d = document.querySelector('#dd-arrow')
    const anchor = d?.shadowRoot?.querySelector<HTMLElement>('.menu-anchor')
    return anchor != null && !anchor.hidden && anchor.getAttribute('data-placement') === 'bottom'
  })
  const r = await page.evaluate(() => {
    const d = document.querySelector('#dd-arrow')!
    const anchor = d.shadowRoot!.querySelector<HTMLElement>('.menu-anchor')!
    const arrow = anchor.querySelector<HTMLElement>('[data-popper-arrow]')!
    const ab = anchor.getBoundingClientRect()
    const bb = arrow.getBoundingClientRect()
    return {
      arrowPart: arrow.getAttribute('part'),
      arrowHidden: arrow.hasAttribute('hidden'),
      arrowVisible: bb.width > 0 && bb.height > 0,
      arrowAtTop: bb.top <= ab.top + 2, // 箭头横跨面板顶边（top: -4px → 旋转后更靠上）
      arrowCentered: Math.abs(bb.left + bb.width / 2 - (ab.left + ab.width / 2)) <= 6,
      arrowProtrudes: bb.top < ab.top, // 尖端探出面板外沿指向触发按钮
    }
  })
  expect(r.arrowPart).toBe('arrow')
  expect(r.arrowHidden).toBe(false)
  expect(r.arrowVisible, '箭头应真实渲染（宽高 > 0）').toBe(true)
  expect(r.arrowAtTop, 'bottom placement 箭头应在面板顶部').toBe(true)
  expect(r.arrowCentered, '触发按钮居中于面板下方 → 箭头指向触发元素中心').toBe(true)
  expect(r.arrowProtrudes, '箭头尖端应探出面板外沿指向触发按钮').toBe(true)
  await page.screenshot({ path: 'C:\\WINDOWS\\TEMP\\opencode\\fix-dropdown-arrow.png' })
})

test('dropdown 箭头 arrow="false"：#dd-arrow-none 打开后无箭头（hidden 属性）且菜单正常', async ({
  page,
}) => {
  await page.goto('/components/dropdown.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#dd-arrow-none')
  const dd = page.locator('#dd-arrow-none')
  await dd.locator(':scope > oas-button').click()
  await page.waitForFunction(() => {
    const d = document.querySelector('#dd-arrow-none')
    return d?.shadowRoot?.querySelector<HTMLElement>('.menu-anchor')?.hidden === false
  })
  const r = await page.evaluate(() => {
    const d = document.querySelector('#dd-arrow-none')!
    const anchor = d.shadowRoot!.querySelector<HTMLElement>('.menu-anchor')!
    const arrow = anchor.querySelector<HTMLElement>('[data-popper-arrow]')!
    return {
      arrowExists: arrow != null,
      arrowHidden: arrow.hasAttribute('hidden'),
    }
  })
  expect(r.arrowExists, '骨架应保留').toBe(true)
  expect(r.arrowHidden, 'arrow="false" 应通过 hidden 隐藏箭头').toBe(true)
  // 菜单项照常渲染（穿透两层 shadow 断言，demo 数据为 1 项）
  expect(await page.locator('#dd-arrow-none [part="item"]').count()).toBe(1)
})

test('icon slot 内联 SVG：源 svg 不渲染（slot display:none）且表现属性随克隆保留', async ({
  page,
}) => {
  // 曾现 bug1：宿主全局 reset（img/svg{display:block}）跨树压过 shadow 普通 ::slotted 规则，
  //           源 svg 黑色副本外露（duotone demo 一个图标渲染成两个）。修复：slot{display:none}。
  // 曾现 bug2：克隆只拷 viewBox，fill/stroke 丢失 → 描边 svg 变实心块/不可见；
  //           且组件 svg{fill:currentColor} 优先级高于 fill 表现属性。修复：属性全量复制 + 兜底改 :not([fill])。
  await page.goto('/components/icon.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-icon[duotone]')
  const r = await page.evaluate(() => {
    const duo = document.querySelector('oas-icon[duotone]')!
    const lightSvg = duo.querySelector(':scope > svg')!
    const duoRect = lightSvg.getBoundingClientRect()
    // slot 内联 SVG demo（描边 plus）：宿主 svg 应带 stroke/fill 属性且图形可见
    const slotIcon = [...document.querySelectorAll('oas-icon')].find(
      (el) => el.querySelector(':scope > svg')?.getAttribute('stroke') === 'currentColor',
    )!
    const hostSvg = slotIcon.shadowRoot!.querySelector('svg')!
    const hostBox = hostSvg.getBoundingClientRect()
    return {
      srcHidden: duoRect.width === 0 && duoRect.height === 0,
      hostHeight: Math.round(duo.getBoundingClientRect().height),
      strokeKept: hostSvg.getAttribute('stroke'),
      fillKept: hostSvg.getAttribute('fill'),
      rendered: hostBox.width > 0 && hostBox.height > 0,
    }
  })
  expect(r.srcHidden, '源 svg 不应渲染（黑色副本回归）').toBe(true)
  expect(r.hostHeight, '宿主高度应等于图标尺寸（32），不被源 svg 撑高').toBe(32)
  expect(r.strokeKept, 'stroke 表现属性应随克隆保留').toBe('currentColor')
  expect(r.fillKept, 'fill 表现属性应随克隆保留').toBe('none')
  expect(r.rendered).toBe(true)
})

test('tag 插槽 svg 与文字同排（宿主全局 reset display:block 不顶成竖排）', async ({ page }) => {
  // 曾现 bug：文档站全局 reset img/svg{display:block} 把插槽手写 svg 顶成块级，图标标签竖排。
  // 修复：.content 改 inline-flex（svg 被 block 化也只是横向 flex item）。
  await page.goto('/components/tag.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tag')
  const r = await page.evaluate(() => {
    const t = [...document.querySelectorAll('oas-tag:not([icon])')].find((x) =>
      x.querySelector(':scope > svg'),
    )!
    const svg = t.querySelector(':scope > svg')!
    const textNode = [...t.childNodes].find(
      (nd) => nd.nodeType === 3 && (nd.textContent ?? '').trim(),
    )!
    const range = document.createRange()
    range.selectNode(textNode)
    const tb = range.getBoundingClientRect()
    const sb = svg.getBoundingClientRect()
    return {
      sameRow: Math.abs(sb.y + sb.height / 2 - (tb.y + tb.height / 2)) <= 3,
      leftOfText: sb.x + sb.width <= tb.x + 6,
    }
  })
  expect(r.sameRow, '插槽 svg 应与文字同一行').toBe(true)
  expect(r.leftOfText, '插槽 svg 应在文字左侧').toBe(true)
})

test('icon 宿主 inline-flex：tag 内图标与文字中心线对齐（行高支撑偏心回归）', async ({ page }) => {
  // 曾现 bug：oas-icon 宿主默认 inline，内部 svg 被继承 line-height 撑出基线支撑，
  // 图标视觉中心比文字中心高 2px（tag icon 属性标签里肉眼可见不在一条线）。
  // 修复：:host display: inline-flex 收缩包裹 svg。锁定「svg 中心 == 文字中心」。
  await page.goto('/components/tag.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tag[icon]')
  const r = await page.evaluate(() => {
    const tag = document.querySelector('oas-tag[icon]')!
    const root = tag.shadowRoot!
    const iconHost = root.querySelector('.icon oas-icon')!
    const svg = iconHost.shadowRoot!.querySelector('svg')!
    const content = root.querySelector('.content')!
    const cy = (el: Element) => {
      const b = el.getBoundingClientRect()
      return b.top + b.height / 2
    }
    return {
      diff: Math.abs(cy(svg) - cy(content)),
      hostDisplay: getComputedStyle(iconHost).display,
    }
  })
  expect(r.hostDisplay).toBe('flex') // flex 容器内块化后的计算值
  expect(r.diff, '图标与文字中心线偏差应 ≤1px').toBeLessThanOrEqual(1)
})

test('button color 自定义色：无 type 也按 variant 着色，文字色按底色亮度自适应', async ({
  page,
}) => {
  // 曾现 bug：--btn-color 只在 type 类上定义、solid 规则只认 primary——无 type 的 color
  // 按钮全部渲染成灰色（自定义颜色 demo 肉眼可见失效）。修复：base 兜底 --btn-color +
  // has-color 实心规则 + 文字色按底色亮度取黑/白（暗色主题下中间调底色配深字不可读）。
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button[color]')
  const read = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('oas-button[color]')].map((el) => {
        const cs = getComputedStyle(el.shadowRoot!.querySelector('button')!)
        return { bg: cs.backgroundColor, border: cs.borderColor, color: cs.color }
      }),
    )
  const light = await read()
  expect(light[0]!.bg, '紫色实底').toBe('rgb(124, 58, 237)')
  expect(light[0]!.color, '紫底白字').toBe('rgb(255, 255, 255)')
  expect(light[1]!.border, '绿色描边').toBe('rgb(14, 159, 110)')
  expect(light[2]!.bg, '粉色浅底（12% tint）').toContain('0.12')
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(300)
  const dark = await read()
  expect(dark[0]!.bg).toBe('rgb(124, 58, 237)')
  expect(dark[0]!.color, '暗色下紫底仍是白字（亮度自适应）').toBe('rgb(255, 255, 255)')
})

test('button wrap：默认 nowrap 不换行，显式 wrap 才换行增高，icon-only 保持正方形', async ({
  page,
}) => {
  // 用户定夺：默认不换行（正常使用即正常表现）；只有显式 wrap 属性才让长文本换行、
  // 盒随内容长高（min-height 兜底单行高度）；icon-only/circle 固定尺寸保形。
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button[wrap]')
  const r = await page.evaluate(() => {
    const wrapBtn = document.querySelector('oas-button[wrap]')!.shadowRoot!.querySelector('button')!
    const plain = [...document.querySelectorAll('oas-button')].find(
      (b) => b.textContent?.trim() === '普通按钮',
    )!
    const plainBtn = plain.shadowRoot!.querySelector('button')!
    const iconOnly = document.querySelector('oas-button[icon]')!
    const iconBtn = iconOnly.shadowRoot!.querySelector('button')!
    const wb = wrapBtn.getBoundingClientRect()
    const pb = plainBtn.getBoundingClientRect()
    const ib = iconBtn.getBoundingClientRect()
    return {
      wrapHeight: wb.height,
      plainHeight: pb.height,
      plainNowrap: getComputedStyle(plainBtn).whiteSpace,
      iconSquare: Math.abs(ib.width - ib.height) <= 1,
    }
  })
  expect(r.plainNowrap, '默认按钮必须 nowrap').toBe('nowrap')
  expect(r.plainHeight, '默认按钮单行 32px').toBe(32)
  expect(r.wrapHeight, 'wrap 按钮受限宽换行增高（>32px）').toBeGreaterThan(32)
  expect(r.iconSquare, 'icon-only 保持正方形').toBe(true)
})

test('button href anchor 变体：静止态不永久显示选中色（a 镜像规则的 :host 前缀回归）', async ({
  page,
}) => {
  // 曾现 bug：选中态的 a[part='button'] 镜像规则丢了 :host([aria-pressed='true']) 前缀，
  // 带 href 的 primary/text 按钮静止时永久渲染选中色（primary-active 深底）。
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button[href]')
  const r = await page.evaluate(() => {
    const pick = (cls: string) => {
      const el = [...document.querySelectorAll('oas-button[href]')].find((e) =>
        e.shadowRoot!.querySelector(`a[part=button].${cls}`),
      )!
      const a = el.shadowRoot!.querySelector('a[part=button]')!
      const cs = getComputedStyle(a)
      return { pressed: el.getAttribute('aria-pressed'), bg: cs.backgroundColor, filter: cs.filter }
    }
    return { primary: pick('primary'), default: pick('default') }
  })
  expect(r.primary.pressed).toBeNull()
  expect(r.primary.bg, 'href primary 静止应为默认 primary 色，非选中深色').toBe('rgb(11, 108, 255)')
  expect(r.primary.filter).toBe('none')
  expect(r.default.bg, 'href 默认链接静止应为白底').toBe('rgb(255, 255, 255)')
})

test('button 语义色状态方向统一：success hover 变暗（0.94）、选中更深（0.85）', async ({
  page,
}) => {
  // 曾现不一致：primary hover 变暗（color-mix 85% black），success/warning/danger hover
  // 却用 brightness(1.08) 变亮——同库 hover 明暗方向相反。统一为变暗递进：hover 0.94、
  // 选中 0.85（与 primary 的 85%/75% 两档比例对齐）。
  await page.goto('/components/button-group.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button-group[type="primary"] oas-button')
  // 页面无 success 组 demo，注入一个验证语义色规则（type 由组透传子按钮）
  await page.evaluate(() => {
    const g = document.querySelector('oas-button-group[type="primary"]')!
    const clone = g.cloneNode(true) as HTMLElement
    clone.setAttribute('type', 'success')
    clone.removeAttribute('value')
    g.parentElement!.appendChild(clone)
  })
  const sg = page.locator('oas-button-group[type="success"]').last()
  const mid = sg.locator('oas-button', { hasText: '中' })
  const readFilter = () =>
    page.evaluate(() => {
      const gs = [...document.querySelectorAll('oas-button-group[type="success"]')]
      const b = [...gs[gs.length - 1]!.querySelectorAll('oas-button')][1]!
      return getComputedStyle(b.shadowRoot!.querySelector('button')!).filter
    })
  expect(await readFilter()).toBe('none')
  await mid.hover()
  await page.waitForTimeout(400)
  const hoverFilter = await readFilter()
  expect(hoverFilter, 'success hover 应变暗（brightness < 1）').toBe('brightness(0.94)')
  // 选中比 hover 更深
  await mid.click()
  await page.mouse.move(0, 0)
  await page.waitForTimeout(400)
  expect(await readFilter(), 'success 选中应比 hover 更深').toBe('brightness(0.85)')
})

test('button-group 有色组：分段缝常驻可见（非首按钮带 1px 半透明白缝，首按钮无）', async ({
  page,
}) => {
  // 曾现缺陷：primary 等有色实心组静止时无缝合线，三段融成一整个按钮，
  // 「多选一」结构不可发现。修复：非首按钮宿主外侧 box-shadow 画 1px 白缝。
  await page.goto('/components/button-group.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button-group[type="primary"] oas-button')
  const r = await page.evaluate(() => {
    const g = document.querySelector('oas-button-group[type="primary"]')!
    return [...g.querySelectorAll('oas-button')].map((b) => getComputedStyle(b).boxShadow)
  })
  expect(r[0], '首按钮不应有缝').toBe('none')
  expect(r[1], '非首按钮应有 1px 半透明白缝').toContain('rgba(255, 255, 255, 0.35)')
  expect(r[2]).toContain('rgba(255, 255, 255, 0.35)')
  // 默认（白底）组不受影响：按钮自带灰色边框，不画白缝
  const defaultSeams = await page.evaluate(() => {
    const g = document.querySelector('oas-button-group:not([type])')!
    return [...g.querySelectorAll('oas-button')].map((b) => getComputedStyle(b).boxShadow)
  })
  expect(
    defaultSeams.every((s) => s === 'none'),
    '默认组不应画白缝',
  ).toBe(true)
})

test('button primary（solid）：hover/选中背景不被自定义底色兜底规则压死', async ({ page }) => {
  // 曾现 bug：--oas-button-bg 覆盖规则的选择器带 :not() 链（权重 (0,6,1)），压死
  // button.primary:hover / :active / :host([aria-pressed]) 的 background (0,2,1)——
  // solid primary 按钮 hover 不加深、按钮组选中态无视觉反馈（只剩 1px 边框变色）。
  // 修复：:not() 链包 :where() 归零权重。此处锁定「hover 与选中背景必须真实变化」。
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button[type="primary"]')
  const btn = page.locator('oas-button[type="primary"]').first()
  const readBg = () =>
    page.evaluate(() => {
      const el = document.querySelector('oas-button[type="primary"]')!
      return getComputedStyle(el.shadowRoot!.querySelector('button')!).backgroundColor
    })
  const normal = await readBg()
  await btn.hover()
  await page.waitForTimeout(400)
  const hover = await readBg()
  expect(hover, 'solid primary hover 背景应变深').not.toBe(normal)

  // 按钮组选中态：点击后 aria-pressed=true 且底色与未选项可区分（primary-active）
  await page.goto('/components/button-group.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button-group[type="primary"] oas-button')
  const group = page.locator('oas-button-group[type="primary"]').first()
  await group.locator('oas-button', { hasText: '中' }).click()
  await page.mouse.move(0, 0) // 移开鼠标，排除 hover 色干扰，看纯选中态
  await page.waitForTimeout(400)
  const r = await page.evaluate(() => {
    const g = document.querySelector('oas-button-group[type="primary"]')!
    const btns = [...g.querySelectorAll('oas-button')]
    const bg = (b: Element) =>
      getComputedStyle(b.shadowRoot!.querySelector('button')!).backgroundColor
    return {
      pressed: btns[1]!.getAttribute('aria-pressed'),
      selected: bg(btns[1]!),
      rest: bg(btns[0]!),
    }
  })
  expect(r.pressed).toBe('true')
  expect(r.selected, '选中项底色应与未选项可区分').not.toBe(r.rest)
})

test('DemoBlock 示例代码：连排闭合标签逐行拆分（</svg></oas-icon> 不挤一行）', async ({ page }) => {
  // 曾现 bug：formatHtml 的「闭合标签间换行」正则把下一个闭合标签的 `</` 消费掉，
  // `</path></svg></oas-icon>` 连排时第二次匹配失败 → duotone demo 代码里 </svg></oas-icon>
  // 挤一行且其后缩进全乱（canvas demo 闭合标签前是文本不受影响，所以表现正常）。
  // 修复：正则尾部 `</` 改前瞻不消费。此处锁定「连排闭合标签必须拆行 + 顶层标签不缩进」。
  await page.goto('/components/icon.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.demo-block', { state: 'attached' })
  const block = page.locator('.demo-block', { hasText: 'duotone 双色' }).first()
  await block.locator('.demo-block__toggle').click()
  const code = block.locator('.demo-block__code code').first()
  // 点击后异步高亮，自动重试等待非空
  await expect(code).not.toBeEmpty()
  const text = await code.innerText()
  expect(text, '连排闭合标签不允许挤一行').not.toContain('</svg></oas-icon>')
  expect(text).toContain('</svg>\n</oas-icon>')
  // 顶层 oas-icon 之间换行且不缩进（depth 归零）
  expect(text).toMatch(/<\/oas-icon>\n<oas-icon/)
  // 空元素保持一行（canvas demo 的 <oas-icon ...></oas-icon> 不被拆）
  const canvasBlock = page.locator('.demo-block', { hasText: 'canvas 占位框模式' }).first()
  await canvasBlock.locator('.demo-block__toggle').click()
  const canvasCode = canvasBlock.locator('.demo-block__code code').first()
  await expect(canvasCode).not.toBeEmpty()
  const canvasText = await canvasCode.innerText()
  expect(canvasText).toContain('<oas-icon name="check" canvas="fixed"></oas-icon>')
})

test('slider 基础用法：自定义滑块/数值输入区 hidden 真实隐藏（默认与拖动后均无残留圆环）', async ({
  page,
}) => {
  // 曾现 bug：.custom-thumb{display:flex} 压过 UA [hidden] 规则 → 三个自定义滑块恒可见：
  // 默认态全堆在 left:0（轨道起点多一个白圈，被误认为正常）；一拖动车 'value' 滑块被定位
  // 到值位置后松手 hidden=true 仍显示 → 原生蓝 thumb 旁残留白圈（双滑块假象）。
  // 同类根因：.inputs{display:flex} 在无 show-input 时同样压过 hidden（空容器白占 flex gap）。
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider')
  const probe = () =>
    page.evaluate(() => {
      const el = document.querySelector('oas-slider')!
      const sr = el.shadowRoot!
      const disp = (sel: string) => getComputedStyle(sr.querySelector(sel)!).display
      return {
        valueThumb: disp('.custom-thumb[data-thumb="value"]'),
        minThumb: disp('.custom-thumb[data-thumb="min"]'),
        maxThumb: disp('.custom-thumb[data-thumb="max"]'),
        inputs: disp('.inputs'),
      }
    })
  const before = await probe()
  expect(before.valueThumb, '默认态 value 自定义滑块应隐藏').toBe('none')
  expect(before.minThumb, '默认态 min 自定义滑块应隐藏').toBe('none')
  expect(before.maxThumb, '默认态 max 自定义滑块应隐藏').toBe('none')
  expect(before.inputs, '无 show-input 时数值输入区应隐藏').toBe('none')
  // 模拟拖动（input→change 全程），松手后不得残留任何自定义滑块
  await page.evaluate(() => {
    const input = document
      .querySelector('oas-slider')!
      .shadowRoot!.querySelector<HTMLInputElement>('input[data-role="range"]')!
    input.value = '70'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  const after = await probe()
  expect(after.valueThumb, '拖动后 value 自定义滑块不得残留').toBe('none')
  expect(after.minThumb, '拖动后 min 自定义滑块不得残留').toBe('none')
  expect(after.maxThumb, '拖动后 max 自定义滑块不得残留').toBe('none')
})

test('slider range：拖动中自定义滑块中心与原生 thumb 中心对齐（无半径跳变）', async ({ page }) => {
  // 曾现 bug：thumbLeft() 返回的是原生 thumb「左缘」公式 pct*(w-size)，但 .custom-thumb 以
  // translate(-50%,-50%) 把它当「中心」用 → 拖动中空心环偏左半个直径（7px），松手切回
  // 原生实心 thumb 瞬间右跳 7px（用户感知「空心的会移位」）。
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider[range]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[range]')!
    const sr = el.shadowRoot!
    const maxInput = sr.querySelector<HTMLInputElement>('input[data-role="range-max"]')!
    // 进入拖动态（dragging=true → overlay 启用，custom-thumb 显示）
    maxInput.value = '60'
    maxInput.dispatchEvent(new Event('input', { bubbles: true }))
    const rect = maxInput.getBoundingClientRect()
    const min = Number(maxInput.min)
    const max = Number(maxInput.max)
    const v = Number(maxInput.value)
    const THUMB = 14
    // 原生 thumb 中心公式：左缘 pct*(w-size) + 半径 size/2
    const nativeCx = rect.left + ((v - min) / (max - min)) * (rect.width - THUMB) + THUMB / 2
    const th = sr.querySelector<HTMLElement>('.custom-thumb[data-thumb="max"]')!
    const tr = th.getBoundingClientRect()
    return {
      visible: getComputedStyle(th).display !== 'none',
      delta: tr.left + tr.width / 2 - nativeCx,
    }
  })
  expect(r.visible, '拖动中自定义滑块应显示').toBe(true)
  expect(Math.abs(r.delta), '自定义滑块中心与原生 thumb 中心偏差不得超 1.5px').toBeLessThanOrEqual(
    1.5,
  )
})

test('slider range：pointerdown 提升 input z-index 后蓝色填充仍可见（灰轨道不得盖住 fill）', async ({
  page,
}) => {
  // 曾现 bug：range 模式 pointerdown 把目标 input 提 z-index 抢拖动权，但原生 input 的
  // 灰色轨道背景（::-webkit-slider-runnable-track）随之上浮盖住 .fill → 蓝色区间填充
  // 消失（dark 下 20-77 之间无蓝条）。修复：灰轨道下沉到 .track-wrap::before 底层，
  // 原生 track 背景透明，z-index 提升只影响 thumb 命中、不遮视觉。
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider[range]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[range]')!
    const sr = el.shadowRoot!
    const wrap = sr.querySelector<HTMLElement>('.track-wrap')!
    const maxInput = sr.querySelector<HTMLInputElement>('input[data-role="range-max"]')!
    const rect = wrap.getBoundingClientRect()
    // 等价真实按下：pointerdown 冒泡到 wrap，触发 z-index 提升逻辑
    maxInput.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: rect.left + rect.width * 0.8,
        clientY: rect.top + rect.height / 2,
      }),
    )
    const fill = sr.querySelector<HTMLElement>('.fill')!
    const fr = fill.getBoundingClientRect()
    const fillCs = getComputedStyle(fill)
    const trackBg = getComputedStyle(maxInput, '::-webkit-slider-runnable-track').backgroundColor
    return {
      fillWidth: fr.width,
      fillBg: fillCs.backgroundColor,
      fillVisible: fillCs.display !== 'none' && fillCs.visibility !== 'hidden',
      trackBg,
      raisedZ: maxInput.style.zIndex,
    }
  })
  expect(r.fillWidth, 'fill 应有宽度').toBeGreaterThan(0)
  expect(r.fillVisible, 'fill 应可见').toBe(true)
  expect(r.fillBg, 'fill 应为 primary 填充色').not.toMatch(/transparent|rgba\(0, 0, 0, 0\)/)
  expect(r.raisedZ, 'pointerdown 后 z-index 提升逻辑仍应生效').toBe('2')
  // 视觉遮挡根因锁定：原生轨道背景必须透明，否则 z-index 提升后灰轨道盖住 fill
  expect(r.trackBg, '原生轨道背景应透明（灰轨道由底层伪元素承担）').toMatch(
    /transparent|rgba\(0, 0, 0, 0\)/,
  )
})

test('展示型组件字号继承：A 类跟随外层 font-size、B 类大数字默认固定且组件级变量可覆盖', async ({
  page,
}) => {
  // 设计决策（详见组件 :host 注释）：
  //   A 类展示文本（gradient-text/comment/equation/log/timeline/breadcrumb/descriptions-item）
  //     :host font-size = var(--组件级变量, inherit) → 跟随外层；code 特例 0.875em 略缩
  //   B 类大数字（statistic/countdown/number-animation）
  //     :host font-size = var(--组件级变量, var(--全局lg)) → 默认固定 16px（语义同 h1），
  //     组件级变量（--oas-statistic-font 等）显式覆盖
  // 曾现 bug：首页统计条外层 font-size:32px 对 oas-statistic 无效（:host 显式全局 token 阻断继承）
  await page.goto('/components/statistic.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-statistic')
  const r = await page.evaluate(() => {
    const wrap = document.createElement('div')
    wrap.style.fontSize = '32px'
    wrap.innerHTML = `
      <oas-statistic value="42"></oas-statistic>
      <oas-countdown value="60000"></oas-countdown>
      <oas-number-animation value="42"></oas-number-animation>
      <oas-gradient-text>g</oas-gradient-text>
      <oas-comment author="a" content="c"></oas-comment>
      <oas-equation code="x"></oas-equation>
      <oas-log></oas-log>
      <oas-timeline></oas-timeline>
      <oas-breadcrumb items='[{"label":"a"}]'></oas-breadcrumb>
      <oas-descriptions><oas-descriptions-item label="l">v</oas-descriptions-item></oas-descriptions>
      <oas-code code="x"></oas-code>
    `
    document.body.append(wrap)
    const fs = (sel: string, inner?: string) => {
      const el = wrap.querySelector(sel)!
      if (!inner) return getComputedStyle(el).fontSize
      return getComputedStyle(el.shadowRoot!.querySelector(inner)!).fontSize
    }
    const out: Record<string, string> = {
      statistic: fs('oas-statistic'),
      countdown: fs('oas-countdown'),
      numberAnimation: fs('oas-number-animation'),
      gradientText: fs('oas-gradient-text'),
      comment: fs('oas-comment'),
      commentTime: fs('oas-comment', '.time'),
      equation: fs('oas-equation'),
      log: fs('oas-log'),
      timeline: fs('oas-timeline'),
      breadcrumb: fs('oas-breadcrumb'),
      descriptionsItem: fs('oas-descriptions-item'),
      code: fs('oas-code'),
    }
    // B 类开口验证：组件级变量覆盖
    ;(wrap.querySelector('oas-statistic') as HTMLElement).style.setProperty(
      '--oas-statistic-font',
      '40px',
    )
    out.statisticOverride = getComputedStyle(wrap.querySelector('oas-statistic')!).fontSize
    wrap.remove()
    return out
  })
  // B 类：默认固定 lg(16px)，不随外层 32px；组件级变量开口生效
  expect(r.statistic, 'statistic 默认固定 16px').toBe('16px')
  expect(r.countdown, 'countdown 默认固定 16px').toBe('16px')
  expect(r.numberAnimation, 'number-animation 默认固定 16px').toBe('16px')
  expect(r.statisticOverride, '--oas-statistic-font 覆盖开口应生效').toBe('40px')
  // A 类：跟随外层 32px（code 0.875em = 28px）
  expect(r.gradientText).toBe('32px')
  expect(r.comment).toBe('32px')
  expect(r.commentTime, 'comment 次级文本 0.857em 比例跟随').toBe('27.424px')
  expect(r.equation).toBe('32px')
  expect(r.log).toBe('32px')
  expect(r.timeline).toBe('32px')
  expect(r.breadcrumb).toBe('32px')
  expect(r.descriptionsItem).toBe('32px')
  expect(r.code, 'code 0.875em 略缩跟随').toBe('28px')
})
