import { test, expect } from '@playwright/test'

// 复核回归：把历次人工复核发现并修复的缺陷固化为断言，防止复发。
// 覆盖：选中态可见性、纵向布局、圆角合并、hover 可读性、addon 属性存活、点击不滚动、demo 事件反馈。

async function up(p: import('@playwright/test').Page, sel: string) {
  await p.waitForSelector(sel, { timeout: 15000 })
  await p.waitForFunction(
    (s) => document.querySelector(s)?.shadowRoot != null,
    sel,
    { timeout: 15000 },
  )
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
  const attrs = await page.evaluate(
    () => [...document.querySelectorAll('oas-input')].map((el) => el.getAttribute('addon-before')),
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
      selectedChecked: items.find((b) => b.getAttribute('aria-checked') === 'true')
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
        document.querySelector(sel)?.shadowRoot
          ?.querySelector('[part="dropdown"]')
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

test('menubar 受控：外部 setAttribute(value) 即时同步勾选（value 在 observedAttributes）', async ({ page }) => {
  // 曾现 bug：value 未列入 observedAttributes，外部 setAttribute('value') 不触发 update()，
  // 勾选/高亮不移动，受控 demo 只能靠重设 items 绕开。
  await page.goto('/components/menubar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#mb-value')
  const r = await page.evaluate(() => {
    const mb = document.querySelector('#mb-value')!
    const checked = (v: string) =>
      mb.shadowRoot!.querySelector<HTMLElement>(`[part="item"][data-value="${v}"]`)
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
