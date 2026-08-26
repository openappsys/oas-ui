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
        dropdownPosition: getComputedStyle(dropdown).position,
        offsetParentIsHost: dropdown.offsetParent === el,
        placement: dropdown.getAttribute('data-placement'),
        dropdownTop: d.top,
        dropdownBottom: d.bottom,
        triggerBottom: t.bottom,
        triggerTop: t.top,
        inViewport: d.right <= window.innerWidth && d.left >= 0,
      }
    })
    if (name === 'time-picker') {
      // time-picker 仍走宿主 absolute 路径：锁定「dropdown 有定位祖先」不变量
      expect(r.hostPosition, `${name} :host 应为定位祖先`).toBe('relative')
      expect(r.offsetParentIsHost, `${name} dropdown 定位基准应是 host`).toBe(true)
      expect(
        r.dropdownTop - r.triggerBottom,
        `${name} 面板应贴住输入框下方（top: calc(100% + 4px)）`,
      ).toBeCloseTo(4, 1)
    } else {
      // date-picker 已改走库内浮层定位引擎（与 select/combobox 同模式：fixed + computePosition
      // 锚定触发器，逃出祖先 overflow）——锁定新架构不变量：fixed 定位 + 面板与触发器相邻
      // （下翻 gap=4 在下；下方空间不足自动上翻 gap=4 在上，两种朝向均合法）+ 视口内不裁 +
      // 碰撞翻转钩子可读（data-placement）
      expect(r.dropdownPosition, `${name} dropdown 应为 fixed 定位`).toBe('fixed')
      expect(r.placement, `${name} 应有 data-placement 定位钩子`).toBeTruthy()
      const gap =
        r.dropdownTop - r.triggerBottom >= 0
          ? r.dropdownTop - r.triggerBottom
          : r.triggerTop - r.dropdownBottom
      expect(gap, `${name} 面板应与触发器相邻（gap 4，下翻或上翻）`).toBeCloseTo(4, 1)
      expect(r.inViewport, `${name} 面板应完整在视口内`).toBe(true)
    }
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
  // 曾现 bug：.option.active 硬编码 color:#fff，暗色下 primary 变亮（旧值 #4d9fff）白字仅 ~2.7:1。
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
  await up(page, '#menubar-basic')
  // 平移 menubar 到视口右缘（基础用法 demo 含 view>zoom 两级子菜单）
  await page.evaluate(() => {
    const mb = document.querySelector('#menubar-basic') as HTMLElement
    mb.style.cssText = 'position: fixed; right: 0; top: 240px; z-index: 9999'
    mb.dataset.e2eRightEdge = '1'
  })
  // click 首开「视图」展开一级下拉，hover 级联「缩放」展开二级子菜单
  // （限定 .bar 作用域：汉堡面板里渲染了同一份 items 镜像，[part="item"] 会重复命中）
  await page
    .locator('#menubar-basic[data-e2e-right-edge] .bar [part="top-item"][data-value="view"]')
    .click()
  await page.waitForTimeout(150)
  await page
    .locator('#menubar-basic[data-e2e-right-edge] .bar [part="item"][data-value="zoom"]')
    .hover()
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
    const mb = document.querySelector('#menubar-basic')!
    const subs = [...mb.shadowRoot!.querySelectorAll('[part="submenu"]')]
    return subs.some((s) => s.classList.contains('flip-left') || s.classList.contains('flip-right'))
  })
  expect(flipped, '贴右缘的子菜单应翻转（flip-left/flip-right），而非被裁掉').toBe(true)
  await page.screenshot({ path: 'C:\\WINDOWS\\TEMP\\opencode\\fix8-menubar-flip.png' })
})

test('menubar click 首开语义：无开态 hover 不展开、开态 hover 切换顶级（桌面共识回归）', async ({
  page,
}) => {
  await page.goto('/components/menubar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#menubar-basic')
  // 无开态：hover 顶级「视图」不展开
  await page.locator('#menubar-basic [part="top-item"][data-value="view"]').hover()
  await page.waitForTimeout(120)
  const closed = await page.evaluate(() => {
    const mb = document.querySelector('#menubar-basic')!
    const sub = mb.shadowRoot!.querySelector('[part="submenu"][data-parent="view"]')!
    return !sub.classList.contains('open')
  })
  expect(closed, '无开态时 hover 顶级项不应展开（click 首开）').toBe(true)
  // 点击「文件」首开
  await page.locator('#menubar-basic [part="top-item"][data-value="file"]').click()
  await page.waitForTimeout(120)
  // hover「编辑」切换：编辑展开、文件收起
  await page.locator('#menubar-basic [part="top-item"][data-value="edit"]').hover()
  await page.waitForTimeout(150)
  const switched = await page.evaluate(() => {
    const mb = document.querySelector('#menubar-basic')!
    const sub = (v: string) => mb.shadowRoot!.querySelector(`[part="submenu"][data-parent="${v}"]`)!
    return {
      editOpen: sub('edit').classList.contains('open'),
      fileOpen: sub('file').classList.contains('open'),
    }
  })
  expect(switched).toEqual({ editOpen: true, fileOpen: false })
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
    { timeout: 20000 },
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
  // 真实链接不阻止默认行为（原生跳转）。测试模拟 SPA 宿主拦截导航：capture 阶段 preventDefault，
  // 事件仍派发 oas-select（宿主可借此做路由），页面不卸载。
  // 注意：shadow DOM 内锚点点击在 document 层 target 已重定向为宿主，须用 composedPath() 找锚点。
  await page.addInitScript(() => {
    document.addEventListener(
      'click',
      (e) => {
        const a = (e.composedPath() as Array<Element | EventTarget>).find(
          (n): n is HTMLAnchorElement => n instanceof HTMLAnchorElement,
        )
        if (a && a.getAttribute('href') && a.getAttribute('href') !== '#') e.preventDefault()
      },
      true,
    )
  })
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

test('breadcrumb 真实链接：原生跳转不阻止 + oas-select 照常派发（target=_blank 新窗）', async ({
  page,
}) => {
  await page.goto('/components/breadcrumb.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-breadcrumb#bc-real')
  // 链接为真实 <a href>（原生跳转能力保留），target=_blank 自动补 rel（第 2 个链接）
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-breadcrumb#bc-real')!
    const root = el.shadowRoot!
    const links = [...root.querySelectorAll<HTMLAnchorElement>('a[part="link"]')]
    return {
      count: links.length,
      href: links[1]!.getAttribute('href'),
      target: links[1]!.getAttribute('target'),
      rel: links[1]!.getAttribute('rel'),
    }
  })
  expect(r.href).toBeTruthy()
  expect(r.target).toBe('_blank')
  expect(r.rel).toContain('noopener')
  // 点击 target=_blank 链接：新窗口打开（原生跳转）+ oas-select 派发（demo tag 反馈，页面不卸载）
  const first = page.locator('oas-breadcrumb#bc-real a[part="link"]').nth(1)
  const popup = page.waitForEvent('popup')
  await first.click()
  const pop = await popup
  expect(pop.url()).not.toBe('about:blank')
  await pop.close()
  const output = await page.locator('#bc-real-result').textContent()
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
// 曾现缺口：下拉只有整体触发一种形态、无拆分按钮形态；菜单项无 loading 态。
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

// —— tooltip 定位一致性回归：hover 与 focus(click) 两条触发路径 ——
// 曾现缺陷：tip-enter 进场动画 scale(0.9) 污染 getBoundingClientRect（打开瞬间按缩小
// ~10% 的尺寸计算居中/间距），且 click → focusin 的同值 setAttribute('open') 仍触发
// attributeChangedCallback 重定位（Chromium 实测）——两条路径测量时机不同，
// 同一 placement 落点分歧（hover 打开后点击会跳位、间距/居中偏差随 tip 尺寸放大）。
test('tooltip 触发路径一致性：hover 与 click 打开的落点/方向逐像素一致（placement=top 上方 8px 居中）', async ({
  page,
}) => {
  await page.goto('/components/tooltip.html', { waitUntil: 'domcontentloaded' })
  const SEL = 'oas-tooltip[placement="top"]'
  await page.waitForSelector(SEL, { state: 'attached', timeout: 15000 })
  await page.waitForFunction((s) => document.querySelector(s)?.shadowRoot != null, SEL, {
    timeout: 15000,
  })
  const btn = page.locator(`${SEL} > *`).first()
  await btn.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)

  const read = () =>
    page.evaluate((s) => {
      const t = document.querySelector(s)!
      const tip = t.shadowRoot!.querySelector<HTMLElement>('[part="tip"]')!
      const anchor = t.querySelector(':scope > *')!
      const tb = tip.getBoundingClientRect()
      const ab = anchor.getBoundingClientRect()
      return {
        placement: tip.getAttribute('data-placement'),
        inlineTop: tip.style.top,
        inlineLeft: tip.style.left,
        gapAbove: Math.round(ab.top - tb.bottom),
        centerOff: Math.round(ab.left + ab.width / 2 - (tb.left + tb.width / 2)),
      }
    }, SEL)
  const waitOpen = () =>
    page.waitForFunction((s) => {
      const tip = document.querySelector(s)?.shadowRoot?.querySelector<HTMLElement>('[part="tip"]')
      return !!tip && tip.getAttribute('aria-hidden') === 'false' && tip.style.top !== ''
    }, SEL)
  const waitClosed = () =>
    page.waitForFunction((s) => {
      const tip = document.querySelector(s)?.shadowRoot?.querySelector('[part="tip"]')
      return tip?.getAttribute('aria-hidden') === 'true'
    }, SEL)

  // hover 打开 → 等进场动画结束再量（动画中 rect 被 scale 污染）
  await btn.hover()
  await waitOpen()
  await page.waitForTimeout(250)
  const hoverState = await read()
  expect(hoverState.placement).toBe('top')
  expect(hoverState.gapAbove, 'placement=top 间距应精确 10px').toBe(10)
  expect(hoverState.centerOff, '浮层应水平居中于锚点').toBe(0)

  // 移开关闭 → click 重新打开（mousedown → focusin 路径）
  await page.mouse.move(8, 8)
  await waitClosed()
  await btn.click()
  await waitOpen()
  await page.waitForTimeout(250)
  const clickState = await read()
  expect(clickState.placement).toBe('top')
  expect(clickState.gapAbove).toBe(10)
  expect(clickState.centerOff).toBe(0)
  // 同一 placement 两条触发路径落点逐像素一致
  expect(clickState.inlineTop).toBe(hoverState.inlineTop)
  expect(clickState.inlineLeft).toBe(hoverState.inlineLeft)
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
// 曾现缺口：多选只有父子级联一种取值模型、无 check-strategy 取值策略（parent 只父级 / child 只叶子）；万级数据下拉无窗口化渲染。
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
  // tooltip 新增入场动画（fade/scale 150ms）：动画进行中面板/箭头的 getBoundingClientRect
  // 受 transform 缩放影响会偏几 px，等动画播完再量几何（静止态箭头精确指向锚点中心，已实测）
  await page.waitForTimeout(250)
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

// —— 缺陷回归：tooltip 箭头形态（用户反馈「底部箭头形态异常」同类缺陷族）——
// 曾现缺陷 1：hover 打开时 tip-enter 动画 scale(0.9) 污染定位测量，气泡按缩小 10% 的
// 尺寸落位 → 气泡中线偏离锚点中线 ~4px、主轴间距缩水 ~3.2px，箭头尖端（探出 5.66px）
// 反向扎进锚点按钮（gap 8−5.66=2.34px 被吃成负值）——肉眼观感即「箭头偏移/压按钮/变形」。
// 曾现缺陷 2：merge 贴角规则用 $='-start'/'-end' 后缀匹配、恒置零顶角、恒写水平轴——
// top 系零错角（圆角残留 × 菱形交界豁口）、left-start 箭头被拉到对侧边、*-end 箭头距角
// 16px 贴不上（12 向仅 bottom 两向正确）。
// 曾现缺陷 3：窄气泡（交叉轴 < 箭头底宽 8√2≈11.31 + 2×radius）圆角曲线侵入箭头底边
// 衔接区，接缝两侧各 ~1.5px 凹口（空内容 16px 气泡像素剖面 14.13→11.1 骤缩实测）。
// 曾现缺陷 4（用户两轮反馈）：merge 修正后箭头仍是 8×8 方块 rotate(45deg) 旋转菱形，
// 菱心骑在角点上、尖端沿 45° 斜向凸出——斜向不指向锚点，观感「怪」。改为直角三角贴角
// 共边（通用形态）：箭头不旋转、整悬面板外贴角 + clip-path 裁直角三角——直角顶点
// 精确落面板角点，两直角边与角两边共线，尖端正交外探 8px 指向锚点侧。

test('tooltip 箭头形态（用户场景）：top 方向底部箭头完整菱形、悬底边居中、尖端距锚点 2.34px 不相交', async ({
  page,
}) => {
  await page.goto('/components/tooltip.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tooltip[placement="top"]')
  // 「四个方向」demo 的 上 按钮（placement="top"，tooltip 在按钮上方 → 箭头悬气泡底边）
  const host = page.locator('oas-tooltip[placement="top"]').first()
  const anchor = host.locator(':scope > oas-button')
  await anchor.scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  const box = (await anchor.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 })
  await page.waitForTimeout(300) // 等进场动画（150ms）播完取静止态
  const r = await host.evaluate((el) => {
    const t = el.shadowRoot!.querySelector<HTMLElement>('[part="tip"]')!
    const arrow = t.querySelector<HTMLElement>('[data-popper-arrow]')!
    const an = el.querySelector('oas-button')!
    const tb = t.getBoundingClientRect()
    const ab = arrow.getBoundingClientRect()
    const bb = an.getBoundingClientRect()
    const tm = getComputedStyle(arrow).transform.match(/matrix\(([^)]+)\)/)
    const n = tm?.[1]?.split(',').map(Number) ?? []
    const pureRot =
      n.length === 6 &&
      Math.abs(n[0]! - n[3]!) < 0.01 &&
      Math.abs(n[1]! + n[2]!) < 0.01 &&
      Math.abs(n[0]! * n[3]! - n[1]! * n[2]! - 1) < 0.01 &&
      n[4] === 0 &&
      n[5] === 0
    return {
      placement: t.getAttribute('data-placement'),
      arrowW: ab.width,
      arrowH: ab.height,
      // 菱心（rect 中心）应恰落气泡底边，且与气泡中线重合
      centerOnEdge: Math.abs((ab.top + ab.bottom) / 2 - tb.bottom),
      arrowVsTipCenter: Math.abs((ab.left + ab.right) / 2 - (tb.left + tb.right) / 2),
      // 尖端（rect.bottom）到锚点顶边 = offset 8 − 半对角线 5.66 = 2.34
      apexGap: bb.top - ab.bottom,
      tipVsAnchorCenter: Math.abs((tb.left + tb.right) / 2 - (bb.left + bb.right) / 2),
      overlap: !(
        ab.right <= bb.left ||
        ab.left >= bb.right ||
        ab.bottom <= bb.top ||
        ab.top >= bb.bottom
      ),
      pureRot,
    }
  })
  expect(r.placement).toBe('top')
  expect(r.arrowW, '旋转方块 bounding rect 宽 ≈ 12√2').toBeCloseTo(16.97, 1)
  expect(r.arrowH, '旋转方块 bounding rect 高 ≈ 12√2').toBeCloseTo(16.97, 1)
  expect(r.pureRot, '箭头 transform 应为纯 rotate(45deg)（无缩放/平移残留）').toBe(true)
  expect(r.centerOnEdge, '菱心应悬在气泡底边上').toBeLessThanOrEqual(0.7)
  expect(r.arrowVsTipCenter, '箭头应居气泡中线').toBeLessThanOrEqual(0.7)
  expect(
    r.tipVsAnchorCenter,
    '气泡中线应对齐锚点中线（动画污染测量曾致 ~4px 偏移）',
  ).toBeLessThanOrEqual(0.7)
  // 修复前（scale 污染测量）：gap = 8 − 3.2 − 5.66 ≈ −0.86（扎进按钮）
  expect(r.apexGap, `箭头尖端距锚点应为 2.34px（实测 ${r.apexGap.toFixed(2)}）`).toBeGreaterThan(
    1.5,
  )
  expect(r.apexGap).toBeLessThan(3.2)
  expect(r.overlap, '箭头不得与锚点按钮相交').toBe(false)
  await page.mouse.move(8, 8)
})

test('tooltip merge 直角三角贴角共边 8 向：直角点贴面板角点、两直角边共线、尖端正交指向锚点侧（真级联逐向验证）', async ({
  page,
}) => {
  await page.goto('/components/tooltip.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tt-arrow-default')
  await page.evaluate(() => {
    // 锚点钉视口中央：排除 auto-adjust 翻转/避让对 8 向的干扰
    const host = document.querySelector('#tt-arrow-default')!
    const btn = host.querySelector('oas-button') as HTMLElement
    btn.style.position = 'fixed'
    btn.style.left = '560px'
    btn.style.top = '380px'
  })
  const results = await page.evaluate(async () => {
    const host = document.querySelector('#tt-arrow-default')!
    // 每向几何契约：cornerEdges 面板角点（tip rect 边）、edge 贴边腿位移（沿面板边向内 8px）、
    // tip 尖端位移（角点正交外探 8px 指向锚点侧）、flush 盒贴角（[箭头边, 面板边]）、
    // cornerProp 应置零的角 radius
    const cases: Array<{
      p: string
      cornerEdges: ['left' | 'right', 'top' | 'bottom']
      edge: [number, number]
      tip: [number, number]
      flush: Array<['left' | 'right' | 'top' | 'bottom', 'left' | 'right' | 'top' | 'bottom']>
      cornerProp: string
    }> = [
      {
        p: 'bottom-start',
        cornerEdges: ['left', 'top'],
        edge: [8, 0],
        tip: [0, -8],
        flush: [
          ['left', 'left'],
          ['bottom', 'top'],
        ],
        cornerProp: 'borderTopLeftRadius',
      },
      {
        p: 'bottom-end',
        cornerEdges: ['right', 'top'],
        edge: [-8, 0],
        tip: [0, -8],
        flush: [
          ['right', 'right'],
          ['bottom', 'top'],
        ],
        cornerProp: 'borderTopRightRadius',
      },
      {
        p: 'top-start',
        cornerEdges: ['left', 'bottom'],
        edge: [8, 0],
        tip: [0, 8],
        flush: [
          ['left', 'left'],
          ['top', 'bottom'],
        ],
        cornerProp: 'borderBottomLeftRadius',
      },
      {
        p: 'top-end',
        cornerEdges: ['right', 'bottom'],
        edge: [-8, 0],
        tip: [0, 8],
        flush: [
          ['right', 'right'],
          ['top', 'bottom'],
        ],
        cornerProp: 'borderBottomRightRadius',
      },
      {
        p: 'left-start',
        cornerEdges: ['right', 'top'],
        edge: [0, 8],
        tip: [8, 0],
        flush: [
          ['left', 'right'],
          ['top', 'top'],
        ],
        cornerProp: 'borderTopRightRadius',
      },
      {
        p: 'left-end',
        cornerEdges: ['right', 'bottom'],
        edge: [0, -8],
        tip: [8, 0],
        flush: [
          ['left', 'right'],
          ['bottom', 'bottom'],
        ],
        cornerProp: 'borderBottomRightRadius',
      },
      {
        p: 'right-start',
        cornerEdges: ['left', 'top'],
        edge: [0, 8],
        tip: [-8, 0],
        flush: [
          ['right', 'left'],
          ['top', 'top'],
        ],
        cornerProp: 'borderTopLeftRadius',
      },
      {
        p: 'right-end',
        cornerEdges: ['left', 'bottom'],
        edge: [0, -8],
        tip: [-8, 0],
        flush: [
          ['right', 'left'],
          ['bottom', 'bottom'],
        ],
        cornerProp: 'borderBottomLeftRadius',
      },
    ]
    const out: Array<Record<string, string | number | boolean>> = []
    for (const c of cases) {
      host.setAttribute('placement', c.p)
      host.setAttribute('arrow-position', 'merge')
      host.setAttribute('open', '')
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
      await new Promise((res) => setTimeout(res, 60))
      const t = host.shadowRoot!.querySelector<HTMLElement>('[part="tip"]')!
      const arrow = t.querySelector<HTMLElement>('[data-popper-arrow]')!
      const tb = t.getBoundingClientRect()
      const ab = arrow.getBoundingClientRect()
      const cs = getComputedStyle(arrow)
      // clip-path polygon 顶点（百分比）→ 页面坐标
      let verts: number[][] = []
      const m = cs.clipPath && cs.clipPath.match(/polygon\(([^)]+)\)/)
      if (m) {
        verts = m[1]!.split(',').map((v) => {
          const [xs, ys] = v.trim().split(/\s+/)
          const fx = xs!.endsWith('%') ? (parseFloat(xs!) / 100) * ab.width : parseFloat(xs!)
          const fy = ys!.endsWith('%') ? (parseFloat(ys!) / 100) * ab.height : parseFloat(ys!)
          return [ab.left + fx, ab.top + fy]
        })
      }
      // 直角顶点（与另两顶点向量内积为 0）到面板角点的偏差
      const corner: [number, number] = [tb[c.cornerEdges[0]], tb[c.cornerEdges[1]]]
      let rv: number[] | null = null
      let others: number[][] = []
      if (verts.length === 3) {
        for (let i = 0; i < 3; i++) {
          const a = verts[(i + 1) % 3]!
          const b = verts[(i + 2) % 3]!
          const v = verts[i]!
          if (
            Math.abs((a[0]! - v[0]!) * (b[0]! - v[0]!) + (a[1]! - v[1]!) * (b[1]! - v[1]!)) < 0.01
          ) {
            rv = v
            others = verts.filter((_, j) => j !== i)
          }
        }
      }
      const near = (v: number[], exp: [number, number]) =>
        Math.abs(v[0]! - (rv![0]! + exp[0])) <= 0.5 && Math.abs(v[1]! - (rv![1]! + exp[1])) <= 0.5
      out.push({
        p: c.p,
        actual: t.getAttribute('data-placement') ?? '',
        transformNone: cs.transform === 'none',
        hasPolygon: verts.length === 3,
        // 直角点与面板角点重合
        rdx: rv ? +(rv[0]! - corner[0]).toFixed(2) : NaN,
        rdy: rv ? +(rv[1]! - corner[1]).toFixed(2) : NaN,
        // 盒贴角：主轴边外悬 + 起止侧边线贴齐
        fdx: +c.flush.map(([ak, tk]) => ab[ak] - tb[tk])[0]!.toFixed(2),
        fdy: +c.flush.map(([ak, tk]) => ab[ak] - tb[tk])[1]!.toFixed(2),
        // 两直角边：一条沿面板边向内 8px（共边）、一条正交外探 8px 尖端（指向锚点侧）
        legsOk:
          rv !== null &&
          ((near(others[0]!, c.edge) && near(others[1]!, c.tip)) ||
            (near(others[0]!, c.tip) && near(others[1]!, c.edge))),
        cornerZero: getComputedStyle(t)[c.cornerProp as 'borderTopLeftRadius'] === '0px',
      })
      host.removeAttribute('open')
      await new Promise((res) => setTimeout(res, 40))
    }
    // 还原 demo 现场属性
    host.removeAttribute('arrow-position')
    host.setAttribute('placement', 'top')
    return out
  })
  for (const r of results) {
    expect(r.actual, `${r.p} 中置视口不应翻转`).toBe(r.p)
    expect(r.transformNone, `${r.p} 箭头不旋转（直角三角形态）`).toBe(true)
    expect(r.hasPolygon, `${r.p} clip-path 应裁出三角`).toBe(true)
    expect(Math.abs(r.rdx as number), `${r.p} 三角直角点应与面板角点重合 X`).toBeLessThanOrEqual(
      0.5,
    )
    expect(Math.abs(r.rdy as number), `${r.p} 三角直角点应与面板角点重合 Y`).toBeLessThanOrEqual(
      0.5,
    )
    expect(
      Math.abs(r.fdx as number),
      `${r.p} 箭头盒应贴角（主轴外悬/侧边贴齐）X`,
    ).toBeLessThanOrEqual(0.5)
    expect(
      Math.abs(r.fdy as number),
      `${r.p} 箭头盒应贴角（主轴外悬/侧边贴齐）Y`,
    ).toBeLessThanOrEqual(0.5)
    expect(r.legsOk, `${r.p} 直角边与面板边共边 + 尖端正交外探 8px 指向锚点侧`).toBe(true)
    expect(r.cornerZero, `${r.p} 对应角 radius 应置零`).toBe(true)
  }
})

// —— 缺陷回归：popover arrow-merge 箭头形态（与 tooltip merge 同款缺陷族）——
// 曾现缺陷：arrow-merge 沿用 8×8 方块 rotate(45deg) 旋转菱形、菱心骑在面板角点上、尖端
// 沿 45° 斜向凸出——不指向锚点，观感「怪」；且旧规则基向前缀匹配 + 半宽 -4px 骑角，
// over-constrained 下 *-end 让位边失效。改为直角三角贴角共边（通用形态）：不旋转
// 方块整悬面板外贴角 + clip-path 裁直角三角——直角顶点贴面板角点，两直角边与面板角两边
// 共线，尖端正交外探 8px 指向锚点侧。popover 面板有 1px 描边：箭头贴角让位 1px（直角
// 顶点压进面板描边带 1px、起止侧边对齐面板边），两条直角边描边（--pop-border）与面板
// 描边带共带续接，斜边不描边。

test('popover arrow-merge 直角三角贴角共边 8 向：直角点贴面板角点（描边带让位 1px）、两直角边共线、尖端正交指向锚点侧、描边仅直角两边（真级联逐向验证）', async ({
  page,
}) => {
  await page.goto('/components/popover.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-popover[arrow-merge]')
  await page.evaluate(() => {
    // 锚点钉视口中央：排除 auto-adjust 翻转/避让对 8 向的干扰
    const host = document.querySelector('oas-popover[arrow-merge]')!
    const btn = host.querySelector('oas-button') as HTMLElement
    btn.style.position = 'fixed'
    btn.style.left = '540px'
    btn.style.top = '340px'
  })
  const results = await page.evaluate(async () => {
    const host = document.querySelector('oas-popover[arrow-merge]')!
    // 每向几何契约（面板有 1px 描边，箭头贴角让位 1px）：
    // cornerEdges 面板角点（panel rect 边）；vDelta 直角顶点相对角点位移（主轴压进描边带
    // 1px、起止侧贴齐 0）；edge 贴边腿顶点相对直角点位移（沿面板边 8px，与真实边段共线）；
    // tip 尖端相对直角点位移（正交外探 8px 指向锚点侧）；legs 直角两边的描边（其余边 0）；
    // cornerProp 应置零的角 radius
    const cases: Array<{
      p: string
      cornerEdges: ['left' | 'right', 'top' | 'bottom']
      vDelta: [number, number]
      edge: [number, number]
      tip: [number, number]
      legs: [string, string]
      cornerProp: string
    }> = [
      {
        p: 'bottom-start',
        cornerEdges: ['left', 'top'],
        vDelta: [0, 1],
        edge: [8, 0],
        tip: [0, -8],
        legs: ['borderLeftWidth', 'borderBottomWidth'],
        cornerProp: 'borderTopLeftRadius',
      },
      {
        p: 'bottom-end',
        cornerEdges: ['right', 'top'],
        vDelta: [0, 1],
        edge: [-8, 0],
        tip: [0, -8],
        legs: ['borderRightWidth', 'borderBottomWidth'],
        cornerProp: 'borderTopRightRadius',
      },
      {
        p: 'top-start',
        cornerEdges: ['left', 'bottom'],
        vDelta: [0, -1],
        edge: [8, 0],
        tip: [0, 8],
        legs: ['borderLeftWidth', 'borderTopWidth'],
        cornerProp: 'borderBottomLeftRadius',
      },
      {
        p: 'top-end',
        cornerEdges: ['right', 'bottom'],
        vDelta: [0, -1],
        edge: [-8, 0],
        tip: [0, 8],
        legs: ['borderRightWidth', 'borderTopWidth'],
        cornerProp: 'borderBottomRightRadius',
      },
      {
        p: 'left-start',
        cornerEdges: ['right', 'top'],
        vDelta: [-1, 0],
        edge: [0, 8],
        tip: [8, 0],
        legs: ['borderTopWidth', 'borderLeftWidth'],
        cornerProp: 'borderTopRightRadius',
      },
      {
        p: 'left-end',
        cornerEdges: ['right', 'bottom'],
        vDelta: [-1, 0],
        edge: [0, -8],
        tip: [8, 0],
        legs: ['borderBottomWidth', 'borderLeftWidth'],
        cornerProp: 'borderBottomRightRadius',
      },
      {
        p: 'right-start',
        cornerEdges: ['left', 'top'],
        vDelta: [1, 0],
        edge: [0, 8],
        tip: [-8, 0],
        legs: ['borderTopWidth', 'borderRightWidth'],
        cornerProp: 'borderTopLeftRadius',
      },
      {
        p: 'right-end',
        cornerEdges: ['left', 'bottom'],
        vDelta: [1, 0],
        edge: [0, -8],
        tip: [-8, 0],
        legs: ['borderBottomWidth', 'borderRightWidth'],
        cornerProp: 'borderBottomLeftRadius',
      },
    ]
    const out: Array<Record<string, string | number | boolean>> = []
    for (const c of cases) {
      host.setAttribute('placement', c.p)
      host.setAttribute('open', '')
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
      await new Promise((res) => setTimeout(res, 60))
      const panel = host.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
      const arrow = panel.querySelector<HTMLElement>('[data-popper-arrow]')!
      const tb = panel.getBoundingClientRect()
      const ab = arrow.getBoundingClientRect()
      const cs = getComputedStyle(arrow)
      // clip-path polygon 顶点（百分比）→ 页面坐标
      let verts: number[][] = []
      const m = cs.clipPath && cs.clipPath.match(/polygon\(([^)]+)\)/)
      if (m) {
        verts = m[1]!.split(',').map((v) => {
          const [xs, ys] = v.trim().split(/\s+/)
          const fx = xs!.endsWith('%') ? (parseFloat(xs!) / 100) * ab.width : parseFloat(xs!)
          const fy = ys!.endsWith('%') ? (parseFloat(ys!) / 100) * ab.height : parseFloat(ys!)
          return [ab.left + fx, ab.top + fy]
        })
      }
      // 直角顶点（与另两顶点向量内积为 0）
      const corner: [number, number] = [tb[c.cornerEdges[0]], tb[c.cornerEdges[1]]]
      let rv: number[] | null = null
      let others: number[][] = []
      if (verts.length === 3) {
        for (let i = 0; i < 3; i++) {
          const a = verts[(i + 1) % 3]!
          const b = verts[(i + 2) % 3]!
          const v = verts[i]!
          if (
            Math.abs((a[0]! - v[0]!) * (b[0]! - v[0]!) + (a[1]! - v[1]!) * (b[1]! - v[1]!)) < 0.01
          ) {
            rv = v
            others = verts.filter((_, j) => j !== i)
          }
        }
      }
      const near = (v: number[], exp: [number, number]) =>
        Math.abs(v[0]! - (rv![0]! + exp[0])) <= 0.5 && Math.abs(v[1]! - (rv![1]! + exp[1])) <= 0.5
      // 描边：仅外露直角边 1px；贴面板的融合边无描边（斜边走渐变，非 border）
      const widths: Record<string, string> = {
        borderTopWidth: cs.borderTopWidth,
        borderRightWidth: cs.borderRightWidth,
        borderBottomWidth: cs.borderBottomWidth,
        borderLeftWidth: cs.borderLeftWidth,
      }
      const legsOnly = widths[c.legs[0]!] === '1px' && widths[c.legs[1]!] === '0px'
      const othersZero = Object.entries(widths)
        .filter(([k]) => !c.legs.includes(k))
        .every(([, w]) => w === '0px')
      // 描边色与面板描边同源（--pop-border）
      const legColor = cs[c.legs[0]!.replace('Width', 'Color') as 'borderTopColor']
      out.push({
        p: c.p,
        actual: panel.getAttribute('data-placement') ?? '',
        transformNone: cs.transform === 'none',
        hasPolygon: verts.length === 3,
        boxW: +ab.width.toFixed(2),
        boxH: +ab.height.toFixed(2),
        // 直角点贴面板角点（主轴压进描边带 1px、起止侧贴齐 0）
        rdx: rv ? +(rv[0]! - corner[0]).toFixed(2) : NaN,
        rdy: rv ? +(rv[1]! - corner[1]).toFixed(2) : NaN,
        vdx: +c.vDelta[0],
        vdy: +c.vDelta[1],
        // 两直角边：一条沿面板边向内 8px（共边）、一条正交外探 8px 尖端（指向锚点侧）
        legsOk:
          rv !== null &&
          ((near(others[0]!, c.edge) && near(others[1]!, c.tip)) ||
            (near(others[0]!, c.tip) && near(others[1]!, c.edge))),
        legsOnly,
        othersZero,
        strokeSameAsPanel: legColor === getComputedStyle(panel).borderTopColor,
        cornerZero: getComputedStyle(panel)[c.cornerProp as 'borderTopLeftRadius'] === '0px',
      })
      host.removeAttribute('open')
      await new Promise((res) => setTimeout(res, 40))
    }
    // 还原 demo 现场属性
    host.setAttribute('placement', 'bottom-start')
    return out
  })
  for (const r of results) {
    expect(r.actual, `${r.p} 中置视口不应翻转`).toBe(r.p)
    expect(r.transformNone, `${r.p} 箭头不旋转（直角三角形态）`).toBe(true)
    expect(r.hasPolygon, `${r.p} clip-path 应裁出三角`).toBe(true)
    expect(r.boxW, `${r.p} 箭头盒应为 8px 宽（不旋转）`).toBeCloseTo(8, 1)
    expect(r.boxH, `${r.p} 箭头盒应为 8px 高（不旋转）`).toBeCloseTo(8, 1)
    expect(r.rdx, `${r.p} 直角点相对面板角点 X 应为 ${r.vdx}（描边带让位）`).toBeCloseTo(
      r.vdx as number,
      1,
    )
    expect(r.rdy, `${r.p} 直角点相对面板角点 Y 应为 ${r.vdy}（描边带让位）`).toBeCloseTo(
      r.vdy as number,
      1,
    )
    expect(r.legsOk, `${r.p} 直角边与面板边共边 + 尖端正交外探 8px 指向锚点侧`).toBe(true)
    expect(r.legsOnly, `${r.p} 外露直角边描边 1px、贴面板融合边无描边`).toBe(true)
    expect(r.othersZero, `${r.p} 斜边与其余边不得有描边`).toBe(true)
    expect(r.strokeSameAsPanel, `${r.p} 描边色应与面板描边同源（--pop-border）`).toBe(true)
    expect(r.cornerZero, `${r.p} 对应角 radius 应置零`).toBe(true)
  }
})

// —— 缺陷回归：hover-card collision-boundary 坐标系 ——
// 曾现缺陷：碰撞边界解析只取目标元素 rect 的宽高、丢原点，夹取与翻转按视口 (0,0) 原点系
// 折算——边界位于页面中部时卡片被夹到视口左上角（完全脱离边界容器与锚点）。
// 修复：边界解析保留完整 rect（left/top/right/bottom），fits 判定与夹取均以边界原点计算。
test('hover-card collision-boundary：边界在页面中部时卡片被夹取在边界容器 rect 内（真实几何断言）', async ({
  page,
}) => {
  await page.goto('/components/hover-card.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-hover-card[collision-boundary]')
  const r = await page.evaluate(async () => {
    const host = document.querySelector('oas-hover-card[collision-boundary]')!
    ;(host.firstElementChild as HTMLElement).dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true }),
    )
    await new Promise((res) => setTimeout(res, 500))
    const card = host.shadowRoot!.querySelector('.card') as HTMLElement
    const box = document.querySelector('#hc-cb-box') as HTMLElement
    const c = card.getBoundingClientRect()
    const b = box.getBoundingClientRect()
    return {
      open: card.getAttribute('aria-hidden') === 'false',
      card: { l: c.left, t: c.top, r: c.right, b: c.bottom },
      box: { l: b.left, t: b.top, r: b.right, b: b.bottom },
    }
  })
  expect(r.open).toBe(true)
  // 卡片完整落在边界容器 rect 内（允许 0.5px 亚像素误差）
  expect(r.card.l).toBeGreaterThanOrEqual(r.box.l - 0.5)
  expect(r.card.r).toBeLessThanOrEqual(r.box.r + 0.5)
  expect(r.card.t).toBeGreaterThanOrEqual(r.box.t - 0.5)
  expect(r.card.b).toBeLessThanOrEqual(r.box.b + 0.5)
})

// —— 缺陷回归：hover-card arrow-merge 箭头形态（与 tooltip/popover merge 同款缺陷族）——
// 曾现缺陷：arrow-merge 沿用 8×8 方块 rotate(45deg) 旋转菱形、菱心骑在面板角点上、尖端
// 沿 45° 斜向凸出——不指向锚点，观感「怪」；且旧规则基向前缀 + 后缀匹配 + 半宽 -4px 骑角，
// 后缀让位边与居中 calc 同设 left/top 时 over-constrained，*-end 让位边被忽略、箭头
// 留在居中位贴不上角。改为直角三角贴角共边（通用形态，同 popover 描边续接方案）：
// 不旋转方块整悬面板外贴角 + clip-path 裁直角三角——直角顶点贴面板角点，两直角边与面板
// 角两边共线，尖端正交外探 8px 指向锚点侧。面板有 1px 描边：箭头贴角让位 1px（直角顶点
// 压进面板描边带 1px、起止侧边对齐面板边），两条直角边描边与面板描边带共带续接，斜边不描边。

test('hover-card arrow-merge 直角三角贴角共边 8 向：直角点贴面板角点（描边带让位 1px）、两直角边共线、尖端正交指向锚点侧、描边仅直角两边（真级联逐向验证）', async ({
  page,
}) => {
  await page.goto('/components/hover-card.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-hover-card[arrow-merge]')
  await page.evaluate(() => {
    // 锚点钉视口中央：排除 auto-adjust 翻转/避让对 8 向的干扰
    const host = document.querySelector('oas-hover-card[arrow-merge]')!
    const btn = host.querySelector('oas-button') as HTMLElement
    btn.style.position = 'fixed'
    btn.style.left = '540px'
    btn.style.top = '340px'
  })
  const results = await page.evaluate(async () => {
    const host = document.querySelector('oas-hover-card[arrow-merge]')!
    // 每向几何契约（面板有 1px 描边，箭头贴角让位 1px）：
    // cornerEdges 面板角点（panel rect 边）；vDelta 直角顶点相对角点位移（主轴压进描边带
    // 1px、起止侧贴齐 0）；edge 贴边腿顶点相对直角点位移（沿面板边 8px，与真实边段共线）；
    // tip 尖端相对直角点位移（正交外探 8px 指向锚点侧）；legs 直角两边的描边（其余边 0）；
    // cornerProp 应置零的角 radius
    const cases: Array<{
      p: string
      cornerEdges: ['left' | 'right', 'top' | 'bottom']
      vDelta: [number, number]
      edge: [number, number]
      tip: [number, number]
      legs: [string, string]
      cornerProp: string
    }> = [
      {
        p: 'bottom-start',
        cornerEdges: ['left', 'top'],
        vDelta: [0, 1],
        edge: [8, 0],
        tip: [0, -8],
        legs: ['borderLeftWidth', 'borderBottomWidth'],
        cornerProp: 'borderTopLeftRadius',
      },
      {
        p: 'bottom-end',
        cornerEdges: ['right', 'top'],
        vDelta: [0, 1],
        edge: [-8, 0],
        tip: [0, -8],
        legs: ['borderRightWidth', 'borderBottomWidth'],
        cornerProp: 'borderTopRightRadius',
      },
      {
        p: 'top-start',
        cornerEdges: ['left', 'bottom'],
        vDelta: [0, -1],
        edge: [8, 0],
        tip: [0, 8],
        legs: ['borderLeftWidth', 'borderTopWidth'],
        cornerProp: 'borderBottomLeftRadius',
      },
      {
        p: 'top-end',
        cornerEdges: ['right', 'bottom'],
        vDelta: [0, -1],
        edge: [-8, 0],
        tip: [0, 8],
        legs: ['borderRightWidth', 'borderTopWidth'],
        cornerProp: 'borderBottomRightRadius',
      },
      {
        p: 'left-start',
        cornerEdges: ['right', 'top'],
        vDelta: [-1, 0],
        edge: [0, 8],
        tip: [8, 0],
        legs: ['borderTopWidth', 'borderLeftWidth'],
        cornerProp: 'borderTopRightRadius',
      },
      {
        p: 'left-end',
        cornerEdges: ['right', 'bottom'],
        vDelta: [-1, 0],
        edge: [0, -8],
        tip: [8, 0],
        legs: ['borderBottomWidth', 'borderLeftWidth'],
        cornerProp: 'borderBottomRightRadius',
      },
      {
        p: 'right-start',
        cornerEdges: ['left', 'top'],
        vDelta: [1, 0],
        edge: [0, 8],
        tip: [-8, 0],
        legs: ['borderTopWidth', 'borderRightWidth'],
        cornerProp: 'borderTopLeftRadius',
      },
      {
        p: 'right-end',
        cornerEdges: ['left', 'bottom'],
        vDelta: [1, 0],
        edge: [0, -8],
        tip: [-8, 0],
        legs: ['borderBottomWidth', 'borderRightWidth'],
        cornerProp: 'borderBottomLeftRadius',
      },
    ]
    const out: Array<Record<string, string | number | boolean>> = []
    for (const c of cases) {
      host.setAttribute('placement', c.p)
      host.setAttribute('open', '')
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
      // hover-card 入场动画 150ms 直接作用在 .card 上（transform: scale），transform-origin
      // 恰为 merge 角点（scale 不变点）但盒与面板 rect 仍被缩放污染——等动画播完取静止态
      await new Promise((res) => setTimeout(res, 220))
      const panel = host.shadowRoot!.querySelector<HTMLElement>('[part="card"]')!
      const arrow = panel.querySelector<HTMLElement>('[data-popper-arrow]')!
      const tb = panel.getBoundingClientRect()
      const ab = arrow.getBoundingClientRect()
      const cs = getComputedStyle(arrow)
      // clip-path polygon 顶点（百分比）→ 页面坐标
      let verts: number[][] = []
      const m = cs.clipPath && cs.clipPath.match(/polygon\(([^)]+)\)/)
      if (m) {
        verts = m[1]!.split(',').map((v) => {
          const [xs, ys] = v.trim().split(/\s+/)
          const fx = xs!.endsWith('%') ? (parseFloat(xs!) / 100) * ab.width : parseFloat(xs!)
          const fy = ys!.endsWith('%') ? (parseFloat(ys!) / 100) * ab.height : parseFloat(ys!)
          return [ab.left + fx, ab.top + fy]
        })
      }
      // 直角顶点（与另两顶点向量内积为 0）
      const corner: [number, number] = [tb[c.cornerEdges[0]], tb[c.cornerEdges[1]]]
      let rv: number[] | null = null
      let others: number[][] = []
      if (verts.length === 3) {
        for (let i = 0; i < 3; i++) {
          const a = verts[(i + 1) % 3]!
          const b = verts[(i + 2) % 3]!
          const v = verts[i]!
          if (
            Math.abs((a[0]! - v[0]!) * (b[0]! - v[0]!) + (a[1]! - v[1]!) * (b[1]! - v[1]!)) < 0.01
          ) {
            rv = v
            others = verts.filter((_, j) => j !== i)
          }
        }
      }
      const near = (v: number[], exp: [number, number]) =>
        Math.abs(v[0]! - (rv![0]! + exp[0])) <= 0.5 && Math.abs(v[1]! - (rv![1]! + exp[1])) <= 0.5
      // 描边：仅外露直角边 1px；贴面板的融合边无描边（斜边走渐变，非 border）
      const widths: Record<string, string> = {
        borderTopWidth: cs.borderTopWidth,
        borderRightWidth: cs.borderRightWidth,
        borderBottomWidth: cs.borderBottomWidth,
        borderLeftWidth: cs.borderLeftWidth,
      }
      const legsOnly = widths[c.legs[0]!] === '1px' && widths[c.legs[1]!] === '0px'
      const othersZero = Object.entries(widths)
        .filter(([k]) => !c.legs.includes(k))
        .every(([, w]) => w === '0px')
      // 描边色与面板描边同源（--oas-color-border）
      const legColor = cs[c.legs[0]!.replace('Width', 'Color') as 'borderTopColor']
      out.push({
        p: c.p,
        actual: panel.getAttribute('data-placement') ?? '',
        transformNone: cs.transform === 'none',
        hasPolygon: verts.length === 3,
        boxW: +ab.width.toFixed(2),
        boxH: +ab.height.toFixed(2),
        // 直角点贴面板角点（主轴压进描边带 1px、起止侧贴齐 0）
        rdx: rv ? +(rv[0]! - corner[0]).toFixed(2) : NaN,
        rdy: rv ? +(rv[1]! - corner[1]).toFixed(2) : NaN,
        vdx: +c.vDelta[0],
        vdy: +c.vDelta[1],
        // 两直角边：一条沿面板边向内 8px（共边）、一条正交外探 8px 尖端（指向锚点侧）
        legsOk:
          rv !== null &&
          ((near(others[0]!, c.edge) && near(others[1]!, c.tip)) ||
            (near(others[0]!, c.tip) && near(others[1]!, c.edge))),
        legsOnly,
        othersZero,
        strokeSameAsPanel: legColor === getComputedStyle(panel).borderTopColor,
        cornerZero: getComputedStyle(panel)[c.cornerProp as 'borderTopLeftRadius'] === '0px',
      })
      host.removeAttribute('open')
      await new Promise((res) => setTimeout(res, 40))
    }
    // 还原 demo 现场属性
    host.setAttribute('placement', 'bottom-start')
    return out
  })
  for (const r of results) {
    expect(r.actual, `${r.p} 中置视口不应翻转`).toBe(r.p)
    expect(r.transformNone, `${r.p} 箭头不旋转（直角三角形态）`).toBe(true)
    expect(r.hasPolygon, `${r.p} clip-path 应裁出三角`).toBe(true)
    expect(r.boxW, `${r.p} 箭头盒应为 8px 宽（不旋转）`).toBeCloseTo(8, 1)
    expect(r.boxH, `${r.p} 箭头盒应为 8px 高（不旋转）`).toBeCloseTo(8, 1)
    expect(r.rdx, `${r.p} 直角点相对面板角点 X 应为 ${r.vdx}（描边带让位）`).toBeCloseTo(
      r.vdx as number,
      1,
    )
    expect(r.rdy, `${r.p} 直角点相对面板角点 Y 应为 ${r.vdy}（描边带让位）`).toBeCloseTo(
      r.vdy as number,
      1,
    )
    expect(r.legsOk, `${r.p} 直角边与面板边共边 + 尖端正交外探 8px 指向锚点侧`).toBe(true)
    expect(r.legsOnly, `${r.p} 外露直角边描边 1px、贴面板融合边无描边`).toBe(true)
    expect(r.othersZero, `${r.p} 斜边与其余边不得有描边`).toBe(true)
    expect(r.strokeSameAsPanel, `${r.p} 描边色应与面板描边同源（--oas-color-border）`).toBe(true)
    expect(r.cornerZero, `${r.p} 对应角 radius 应置零`).toBe(true)
  }
})

test('tooltip 窄气泡圆角封顶：空内容 16px 气泡 radius 收到 (16−11.31)/2≈2.34px，箭头底边与直边段齐宽', async ({
  page,
}) => {
  await page.goto('/components/tooltip.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => {
      const h = Array.from(document.querySelectorAll('oas-tooltip')).find((x) =>
        x.textContent?.includes('无内容提示'),
      )
      return h?.shadowRoot != null
    },
    undefined,
    { timeout: 15000 },
  )
  const host = page.locator('oas-tooltip', { hasText: '无内容提示' })
  await host.locator(':scope > oas-button').scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  await host.evaluate((el) => el.setAttribute('open', ''))
  await page.waitForTimeout(300) // 等动画播完（offset* 本不受影响，取静止态断言收敛值）
  const r = await host.evaluate((el) => {
    const t = el.shadowRoot!.querySelector<HTMLElement>('[part="tip"]')!
    const arrow = t.querySelector<HTMLElement>('[data-popper-arrow]')!
    const tb = t.getBoundingClientRect()
    const ab = arrow.getBoundingClientRect()
    return {
      width: tb.width,
      crossVar: t.style.getPropertyValue('--oas-tip-cross'),
      radius: parseFloat(getComputedStyle(t).borderRadius),
      arrowW: ab.width,
    }
  })
  expect(r.width, '空内容气泡应只有 padding 宽（16px）').toBeCloseTo(16, 0)
  expect(r.crossVar, 'position() 应写入交叉轴布局尺寸').toBe('16px')
  expect(r.radius, `radius 应封顶 2.34px（实测 ${r.radius}）`).toBeCloseTo(2.34, 1)
  expect(r.arrowW).toBeCloseTo(16.97, 1)
  await host.evaluate((el) => el.removeAttribute('open'))
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
  expect(light[1]!.border, '绿色描边').toBe('rgb(4, 120, 87)')
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
  expect(canvasText).toContain(
    '<oas-icon name="check" canvas="fixed" color="var(--oas-color-primary)"></oas-icon>',
  )
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
  // 设计决策（通用做法，详见组件 :host 注释）：
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

test('table size 密度档位：small/medium/large 三档 padding+字号阶梯，组件级变量覆盖优先', async ({
  page,
}) => {
  // 设计（主流三档密度惯例）：档位全走 CSS 变量 token
  // （--_cell-py/--_cell-px/font-size），宿主 --oas-table-* 变量优先级高于档位；
  // row-height 显式值与档位正交（虚拟滚动行高由 row-height 管，不受档位影响）。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  // 首个 demo table 可能不可见（演示结构），本测试自建元素只需组件类已注册
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, {
    timeout: 15000,
  })
  const r = await page.evaluate(() => {
    const probe = (size: string | null) => {
      const el = document.createElement('oas-table')
      el.setAttribute('columns', JSON.stringify([{ key: 'a', title: 'A' }]))
      el.setAttribute('data', JSON.stringify([{ a: 1 }]))
      if (size) el.setAttribute('size', size)
      document.body.append(el)
      const td = el.shadowRoot!.querySelector('td')!
      const cs = getComputedStyle(td)
      const host = getComputedStyle(el)
      const out = {
        py: cs.paddingTop,
        px: cs.paddingLeft,
        hostFont: host.fontSize,
        tdFont: cs.fontSize,
      }
      el.remove()
      return out
    }
    const medium = probe(null)
    const small = probe('small')
    const large = probe('large')
    // 变量覆盖优先于档位：small 档 + 自定义 padding-block 20px
    const el = document.createElement('oas-table')
    el.setAttribute('columns', JSON.stringify([{ key: 'a', title: 'A' }]))
    el.setAttribute('data', JSON.stringify([{ a: 1 }]))
    el.setAttribute('size', 'small')
    el.style.setProperty('--oas-table-cell-padding-block', '20px')
    document.body.append(el)
    const overridePy = getComputedStyle(el.shadowRoot!.querySelector('td')!).paddingTop
    el.remove()
    return { medium, small, large, overridePy }
  })
  expect(r.medium, '默认 medium：12px 16px / 14px').toEqual({
    py: '12px',
    px: '16px',
    hostFont: '14px',
    tdFont: '14px',
  })
  expect(r.small, 'small：8px 12px / 13px').toEqual({
    py: '8px',
    px: '12px',
    hostFont: '13px',
    tdFont: '13px',
  })
  expect(r.large, 'large：16px 24px / 16px').toEqual({
    py: '16px',
    px: '24px',
    hostFont: '16px',
    tdFont: '16px',
  })
  expect(r.overridePy, '--oas-table-cell-padding-block 覆盖 small 档').toBe('20px')
})

// 回归：input prefix/suffix slot 空 slot 时不得产生 data-slot-*（曾用 assignedNodes({flatten:true})，
// 空 slot 扁平化会包含 fallback 子节点 → 恒判有内容 → host 残留 data-slot-suffix、input 多出右内边距）
test('input 内嵌前后缀 slot：空 slot 无 data-slot-*、动态增删同步（flatten fallback 恒真 bug 回归）', async ({
  page,
}) => {
  await page.goto('/components/input.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-input')
  const r = await page.evaluate(async () => {
    const el = document.createElement('oas-input')
    el.setAttribute('placeholder', 'reg-slot')
    document.body.appendChild(el)
    await new Promise((res) => setTimeout(res, 200))
    const shadow = el.shadowRoot!
    const basePadding = getComputedStyle(shadow.querySelector('input')!).paddingRight
    const q = (sel: string) => shadow.querySelector<HTMLElement>(sel)!
    const empty = {
      dataSlotPrefix: el.hasAttribute('data-slot-prefix'),
      dataSlotSuffix: el.hasAttribute('data-slot-suffix'),
      prefixHidden: q('[part="prefix"]').hidden,
      suffixHidden: q('[part="suffix"]').hidden,
    }
    const sp = document.createElement('span')
    sp.textContent = 'S'
    sp.setAttribute('slot', 'suffix')
    el.appendChild(sp)
    await new Promise((res) => setTimeout(res, 200))
    const withSuffix = {
      dataSlotSuffix: el.hasAttribute('data-slot-suffix'),
      suffixHidden: q('[part="suffix"]').hidden,
      paddingRight: getComputedStyle(q('input')).paddingRight,
    }
    el.removeChild(sp)
    await new Promise((res) => setTimeout(res, 200))
    const afterRemove = {
      dataSlotSuffix: el.hasAttribute('data-slot-suffix'),
      suffixHidden: q('[part="suffix"]').hidden,
      paddingRight: getComputedStyle(q('input')).paddingRight,
    }
    el.remove()
    return { basePadding, empty, withSuffix, afterRemove }
  })
  expect(r.empty.dataSlotPrefix).toBe(false)
  expect(r.empty.dataSlotSuffix).toBe(false)
  expect(r.empty.prefixHidden).toBe(true)
  expect(r.empty.suffixHidden).toBe(true)
  expect(r.withSuffix.dataSlotSuffix).toBe(true)
  expect(r.withSuffix.suffixHidden).toBe(false)
  expect(r.withSuffix.paddingRight).not.toBe(r.basePadding)
  expect(r.afterRemove.dataSlotSuffix).toBe(false)
  expect(r.afterRemove.suffixHidden).toBe(true)
  expect(r.afterRemove.paddingRight).toBe(r.basePadding)
})

test('typography 补齐：修饰六布尔原生标签语义、line-clamp 两行截断、copy-text 覆盖、depth 弱化', async ({
  page,
}) => {
  // v2.1 typography 能力补齐回归：code/delete 换原生 <code>/<del>；line-clamp 两行截断（高度=2×行高）；
  // copy-text 覆盖复制内容；depth 三档弱化递进。
  await page.goto('/components/typography.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-text')
  const r = await page.evaluate(async () => {
    const mk = (attrs: Record<string, string>, slot = '文本') => {
      const el = document.createElement('oas-text')
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      el.textContent = slot
      document.body.appendChild(el)
      return el
    }
    const code = mk({ code: '' })
    const del = mk({ delete: '' })
    const clamp = mk(
      { 'line-clamp': '2' },
      '很长很长很长的文本很长很长很长的文本很长很长很长的文本很长很长很长的文本',
    )
    clamp.style.maxWidth = '300px'
    clamp.style.display = 'block'
    await new Promise((res) => setTimeout(res, 100))
    const clampSpan = clamp.shadowRoot!.querySelector('.text')!
    const clampH = clampSpan.getBoundingClientRect().height
    const lineH = parseFloat(getComputedStyle(clampSpan).lineHeight)
    // copy-text 覆盖
    const copyEl = mk({ copyable: '', 'copy-text': 'CUSTOM-TEXT' }, '原文')
    let copied = ''
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: (t: string) => {
          copied = t
          return Promise.resolve()
        },
      },
      configurable: true,
    })
    copyEl.shadowRoot!.querySelector('button')!.click()
    await new Promise((res) => setTimeout(res, 100))
    // depth 弱化递进
    const d1 = mk({ depth: '1' })
    const d2 = mk({ depth: '2' })
    const d3 = mk({ depth: '3' })
    await new Promise((res) => setTimeout(res, 50))
    const col = (el: HTMLElement) => getComputedStyle(el.shadowRoot!.querySelector('.text')!).color
    const out = {
      codeTag: code.shadowRoot!.querySelector('.text')!.tagName,
      delTag: del.shadowRoot!.querySelector('.text')!.tagName,
      clampRatio: clampH / lineH,
      copied,
      d1: col(d1),
      d2: col(d2),
      d3: col(d3),
    }
    for (const el of [code, del, clamp, copyEl, d1, d2, d3]) el.remove()
    return out
  })
  expect(r.codeTag).toBe('CODE')
  expect(r.delTag).toBe('DEL')
  // line-clamp 两行截断：高度 = 2×行高（±0.5 行容差）
  expect(Math.abs(r.clampRatio - 2)).toBeLessThanOrEqual(0.5)
  // copy-text 覆盖
  expect(r.copied).toBe('CUSTOM-TEXT')
  // depth 三档颜色不同（逐档弱化）
  expect(r.d1).not.toBe(r.d2)
  expect(r.d2).not.toBe(r.d3)
})

test('typography 省略约束链：ellipsis/ellipsis-suffix/line-clamp 均不溢出父容器（wrap 层 max-width 回归）', async ({
  page,
}) => {
  // 曾现 bug：actions 功能引入 .wrap(inline-flex) 层后，max-width 约束链断裂
  // （.text 的 max-width:100% 参照未定宽的 wrap → 整条链撑到内容全宽，suffix 卡片文字跑出卡片）。
  // 修复：:host 与 .wrap 均加 max-width:100%，约束锚定到有确定宽度的父容器。
  await page.goto('/components/typography.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-text')
  const r = await page.evaluate(async () => {
    const wrap300 = (el: HTMLElement) => {
      const box = document.createElement('div')
      box.style.maxWidth = '300px'
      box.appendChild(el)
      document.body.appendChild(box)
      return box
    }
    const mk = (attrs: Record<string, string>, text: string) => {
      const el = document.createElement('oas-text')
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      el.textContent = text
      return el
    }
    const longText =
      'To be, or not to be, that is the question: Whether tis nobler in the mind to suffer'
    const suffix = wrap300(mk({ ellipsis: '', 'ellipsis-suffix': '--结尾' }, longText))
    const plain = wrap300(mk({ ellipsis: '' }, longText))
    const clamp = wrap300(mk({ 'line-clamp': '2' }, longText))
    await new Promise((res) => setTimeout(res, 100))
    const measure = (el: HTMLElement) => {
      const host = el.getBoundingClientRect()
      const text = el.shadowRoot!.querySelector('.text')!.getBoundingClientRect()
      const wrap = el.shadowRoot!.querySelector('.wrap')!.getBoundingClientRect()
      return { host: host.width, text: text.width, wrap: wrap.width }
    }
    const suffixEl = suffix.querySelector('oas-text')! as HTMLElement
    const out = {
      suffix: measure(suffixEl),
      plain: measure(plain.querySelector('oas-text')! as HTMLElement),
      clamp: measure(clamp.querySelector('oas-text')! as HTMLElement),
      suffixVisible: !(suffixEl.shadowRoot!.querySelector('.suffix') as HTMLElement).hidden,
    }
    suffix.remove()
    plain.remove()
    clamp.remove()
    return out
  })
  for (const m of [r.suffix, r.plain, r.clamp]) {
    expect(m.host).toBeLessThanOrEqual(301)
    expect(m.wrap).toBeLessThanOrEqual(301)
    expect(m.text).toBeLessThanOrEqual(301)
  }
  expect(r.suffixVisible).toBe(true)
})

test('link 三态下划线 + icon + external + rel：hover 悬停出下划线、图标前后位置、外链自动 target/rel/图标', async ({
  page,
}) => {
  // v2.1 link 补齐回归：underline 三态（hover 默认悬停出现）+ icon/icon-position +
  // external（自动 target=_blank + rel + 外链图标）+ rel 安全自动补。
  await page.goto('/components/link.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-link')
  const r = await page.evaluate(() => {
    const block = [...document.querySelectorAll('.demo-block')].find((b) =>
      b.textContent?.includes('hover'),
    )
    const links = [...block!.querySelectorAll('oas-link')]
    const deco = (el: Element) =>
      getComputedStyle(el.shadowRoot!.querySelector('a')!).textDecorationLine
    return {
      hoverRest: deco(links[0]!),
      alwaysRest: deco(links[1]!),
      neverRest: deco(links[2]!),
      iconDemo: (() => {
        const iconBlock = [...document.querySelectorAll('.demo-block')].find((b) =>
          b.textContent?.includes('搜索文档'),
        )
        const withIcon = iconBlock!.querySelector('oas-link[icon]')!
        const a = withIcon.shadowRoot!.querySelector('a')!
        return {
          firstIsIcon: a.firstElementChild!.classList.contains('icon'),
          iconSvg: !!a.querySelector('.icon svg'),
        }
      })(),
      external: (() => {
        const ext = document.querySelector('oas-link[external]')!
        const a = ext.shadowRoot!.querySelector('a')!
        return {
          target: a.getAttribute('target'),
          rel: a.getAttribute('rel'),
          iconAtEnd: a.lastElementChild!.classList.contains('icon-external'),
        }
      })(),
    }
  })
  expect(r.hoverRest).not.toContain('underline') // 静止无下划线
  expect(r.alwaysRest).toContain('underline') // 常驻
  expect(r.neverRest).not.toContain('underline') // 无
  expect(r.iconDemo.firstIsIcon).toBe(true) // 图标在文字前（start 默认）
  expect(r.iconDemo.iconSvg).toBe(true)
  expect(r.external.target).toBe('_blank')
  expect(r.external.rel).toBe('noopener noreferrer')
  expect(r.external.iconAtEnd).toBe(true)

  // hover 悬停真交互：hover 态出下划线
  const hoverLink = page.locator('oas-link').filter({ hasText: 'hover' }).first()
  await hoverLink.hover()
  await page.waitForTimeout(200)
  const hoverDeco = await page.evaluate(() => {
    const el = [...document.querySelectorAll('oas-link')].find((l) =>
      l.textContent?.includes('hover'),
    )
    return getComputedStyle(el!.shadowRoot!.querySelector('a')!).textDecorationLine
  })
  expect(hoverDeco).toContain('underline')
})

test('link 色板达标：预设名映射 -text 达标 token、自定义色原值渲染、type 语义色改指 text 变体', async ({
  page,
}) => {
  // v2.1 link 色板对齐（设计期文字 token 模型）：预设亮色（gold 等）白底本色不达标，
  // 预设名映射 --oas-preset-*-text 达标 token；自定义色值原值渲染（责任在宿主）；
  // 存量隐患修复：type=success/warning/danger 文字色改指 -text 变体（此前 3.3:1 不达 AA）。
  await page.goto('/components/link.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-link')
  const r = await page.evaluate(() => {
    const block = [...document.querySelectorAll('.demo-block')].find((b) =>
      b.textContent?.includes('magenta'),
    )
    const color = (name: string) =>
      getComputedStyle(
        block!.querySelector(`oas-link[color="${name}"]`)!.shadowRoot!.querySelector('a')!,
      ).color
    const sem = [...document.querySelectorAll('.demo-block')].find((b) =>
      b.textContent?.includes('主要链接'),
    )
    const typeColor = (t: string) =>
      getComputedStyle(sem!.querySelector(`oas-link[type="${t}"]`)!.shadowRoot!.querySelector('a')!)
        .color
    const custom = document.querySelector('oas-link[color="#0e7490"]')
    return {
      gold: color('gold'),
      geekblue: color('geekblue'),
      purple: color('purple'),
      success: typeColor('success'),
      warning: typeColor('warning'),
      custom: getComputedStyle(custom!.shadowRoot!.querySelector('a')!).color,
    }
  })
  // light 下预设亮色取 -text 深色变体（gold 本色 #faad14 白底 1.9:1，text 变体 #94660c 5.04:1）
  expect(r.gold).toBe('rgb(148, 102, 12)')
  // 本色达标者保本色
  expect(r.geekblue).toBe('rgb(47, 84, 235)')
  expect(r.purple).toBe('rgb(114, 46, 209)')
  // type 语义色改 -text 变体
  expect(r.success).toBe('rgb(17, 129, 58)')
  expect(r.warning).toBe('rgb(167, 92, 5)')
  // 自定义色值原值渲染（不做改写）
  expect(r.custom).toBe('rgb(14, 116, 144)')
})

test('divider 线型/缩进/间距档/strong：variant 驱动、dashed 布尔兼容、变量开口、vertical 撑满', async ({
  page,
}) => {
  // v2.1 divider 能力补齐回归：variant 四线型（含 double 双线间隙）、inset/middle 缩进、
  // size 三档、strong 文字、CSS 变量开口（spacing 注入实测）、vertical 在 flex 容器撑满。
  await page.goto('/components/divider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-divider')
  const r = await page.evaluate(async () => {
    const mk = (attrs: Record<string, string>, slot = '') => {
      const el = document.createElement('oas-divider')
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      el.textContent = slot
      document.body.appendChild(el)
      return el
    }
    const cls = (el: Element) => el.shadowRoot!.querySelector('.divider')!.className
    const dotted = mk({ variant: 'dotted' })
    const compat = mk({ dashed: '' })
    const both = mk({ dashed: '', variant: 'dotted' })
    const inset = mk({ inset: '' })
    const large = mk({ size: 'large' })
    const strong = mk({ strong: '' }, '标题')
    const badVar = mk({ variant: 'wavy' })
    const badSize = mk({ size: 'xxl' })
    // vertical 撑满：flex 容器实测
    const wrap = document.createElement('div')
    wrap.style.cssText = 'display:flex;height:48px'
    const vert = mk({ direction: 'vertical' })
    wrap.appendChild(vert)
    document.body.appendChild(wrap)
    // spacing 变量注入实测
    const spacing = mk({})
    spacing
      .shadowRoot!.querySelector<HTMLElement>('.divider')!
      .style.setProperty('--oas-divider-spacing', '0px')
    await new Promise((res) => setTimeout(res, 100))
    const spacingMargin = getComputedStyle(spacing.shadowRoot!.querySelector('.divider')!).marginTop
    const doubleH = mk({ variant: 'double' })
    const doubleBefore = getComputedStyle(
      doubleH.shadowRoot!.querySelector('.divider')!,
      '::before',
    )
    const out = {
      dotted: cls(dotted),
      compat: cls(compat),
      both: cls(both),
      inset: cls(inset),
      large: cls(large),
      strong: cls(strong),
      badVar: cls(badVar),
      badSize: cls(badSize),
      vertH: vert.getBoundingClientRect().height,
      spacingMargin,
      doubleHeight: doubleBefore.height,
      doubleBorderTop: doubleBefore.borderTopStyle,
      doubleBorderBottom: doubleBefore.borderBottomStyle,
    }
    for (const el of [
      dotted,
      compat,
      both,
      inset,
      large,
      strong,
      badVar,
      badSize,
      spacing,
      doubleH,
    ])
      el.remove()
    wrap.remove()
    return out
  })
  expect(r.dotted).toContain('dotted')
  expect(r.compat).toContain('dashed')
  // 显式 variant 优先于 dashed 布尔
  expect(r.both).toContain('dotted')
  expect(r.both).not.toContain('dashed')
  expect(r.inset).toContain('inset')
  expect(r.large).toContain('large')
  expect(r.strong).toContain('strong')
  // 非法值回落：无线型/档位 class
  expect(r.badVar).not.toMatch(/dashed|dotted|double/)
  expect(r.badSize).not.toMatch(/small|large/)
  // vertical 在 48px flex 容器内撑满（±2px 边界容差）
  expect(Math.abs(r.vertH - 48)).toBeLessThanOrEqual(2)
  // spacing 变量注入真实生效
  expect(r.spacingMargin).toBe('0px')
  // double 双线：总高 = 1+3+1 = 5px，上下边线 solid
  expect(r.doubleHeight).toBe('5px')
  expect(r.doubleBorderTop).toBe('solid')
  expect(r.doubleBorderBottom).toBe('solid')
})

test('code 行内/换行/尺寸/形态/颜色属性真实生效', async ({ page }) => {
  await page.goto('/components/code.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-code[inline]')
  const r = await page.evaluate(() => {
    const probe = (sel: string) => document.querySelector(sel) as HTMLElement | null
    const inline = probe('oas-code[inline]')!
    const inlineInner = inline.shadowRoot!.querySelector('.inline') as HTMLElement
    const block = inline.shadowRoot!.querySelector('.block') as HTMLElement
    const wrap = probe('oas-code[word-wrap]')!
    const wrapBlock = wrap.shadowRoot!.querySelector('.block') as HTMLElement
    const plain = probe('oas-code:not([word-wrap]):not([inline])')!
    const plainBlock = plain.shadowRoot!.querySelector('.block') as HTMLElement
    const sizes = ['xs', 'small', 'large'].map((s) => {
      const el = probe(`oas-code[inline][size="${s}"]`)!
      const inner = el.shadowRoot!.querySelector('.inline')!
      return getComputedStyle(inner).fontSize
    })
    const outline = probe('oas-code[inline][variant="outline"]')!
    const outlineInner = outline.shadowRoot!.querySelector('.inline') as HTMLElement
    const solidEl = probe('oas-code[inline][variant="solid"]')!
    const solidInner = solidEl.shadowRoot!.querySelector('.inline') as HTMLElement
    const colored = probe('oas-code[inline][color="red"]')!
    const coloredInner = colored.shadowRoot!.querySelector('.inline') as HTMLElement
    return {
      inlineHiddenBlock: block.hidden,
      inlineShown: !inlineInner.hidden,
      wrapClass: wrapBlock.classList.contains('word-wrap'),
      wrapWs: getComputedStyle(wrap.shadowRoot!.querySelector('.line-code')!).whiteSpace,
      plainWs: getComputedStyle(plain.shadowRoot!.querySelector('.line-code')!).whiteSpace,
      sizes,
      outlineBorder: getComputedStyle(outlineInner).borderTopStyle,
      solidBg: getComputedStyle(solidInner).backgroundColor,
      colorVar: coloredInner.style.getPropertyValue('--oas-code-color'),
      colorActual: getComputedStyle(coloredInner).color,
    }
  })
  // inline：块级容器隐藏、inline 元素显示
  expect(r.inlineHiddenBlock).toBe(true)
  expect(r.inlineShown).toBe(true)
  // word-wrap：class 挂上且 white-space 真为 pre-wrap；默认保持 pre
  expect(r.wrapClass).toBe(true)
  expect(r.wrapWs).toBe('pre-wrap')
  expect(r.plainWs).toBe('pre')
  // size 档位真实影响字号（递增）
  const px = r.sizes.map((s) => parseFloat(s))
  expect(px[0]!).toBeLessThan(px[1]!)
  expect(px[1]!).toBeLessThan(px[2]!)
  // variant：outline 有描边、solid 有实底
  expect(r.outlineBorder).toBe('solid')
  expect(r.solidBg).not.toBe('rgba(0, 0, 0, 0)')
  // color 预设名注入 --oas-code-color 且计算色非默认
  expect(r.colorVar).toContain('var(--oas-preset-red-text)')
  expect(r.colorActual).not.toBe('rgb(24, 24, 27)')
})

test('slider/input-number 受控写回：交互后宿主 value 属性同步（真实浏览器）', async ({ page }) => {
  // 集成反馈固化：曾单向受控不写回，宿主 getAttribute 永远初始值，集成方被迫缓存事件 detail
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider[show-input]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[show-input]')!
    const num = el.shadowRoot!.querySelector<HTMLInputElement>(
      '[role="textbox"], input[type="number"]',
    )
    return { before: el.getAttribute('value'), hasNum: !!num }
  })
  expect(r.before).not.toBeNull()
  // 真实交互：改数值输入框并提交（change 事件）
  const written = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[show-input]')!
    const num = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="number"]')
    if (!num) return null
    num.value = '60'
    num.dispatchEvent(new Event('change', { bubbles: true }))
    return el.getAttribute('value')
  })
  expect(written).toBe('60')
})

test('modal 视口高度保护：dialog 限高 + body 可滚动（小窗口内容不溢出）', async ({ page }) => {
  // 集成反馈固化：曾只限宽不限高，窗口比 modal 矮时标题/关闭钮被裁出视口够不到
  await page.goto('/components/modal.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-modal')
  // 打开第一个基础 modal
  await page
    .locator('oas-button', { hasText: /基础|打开/ })
    .first()
    .click()
  await page.waitForFunction(() => {
    const m = document.querySelector('oas-modal[visible]')
    return m?.shadowRoot?.querySelector('[part="dialog"]') != null
  })
  const r = await page.evaluate(() => {
    const m = document.querySelector('oas-modal[visible]')!
    const dialog = m.shadowRoot!.querySelector('[part="dialog"]') as HTMLElement
    const body = m.shadowRoot!.querySelector('[part="body"]') as HTMLElement
    return {
      maxHeight: getComputedStyle(dialog).maxHeight,
      display: getComputedStyle(dialog).display,
      overflowY: getComputedStyle(body).overflowY,
    }
  })
  expect(r.maxHeight).not.toBe('none')
  expect(r.display).toBe('flex')
  expect(r.overflowY).toBe('auto')
})

test('tabs 非激活项 hover 有视觉反馈（line 与 card 模式）', async ({ page }) => {
  // 集成反馈固化：曾 .tab 无 hover 规则，悬停毫无反馈（选中项 hover 设计不变，选非激活项断言）
  await page.goto('/components/tabs.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tabs')
  const tab = page.locator('oas-tabs [role="tab"][aria-selected="false"]').first()
  const before = await tab.evaluate((el) => getComputedStyle(el).backgroundColor)
  await tab.hover()
  await page.waitForTimeout(300)
  const after = await tab.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(after, 'hover 后背景应变化').not.toBe(before)
})

test('tabs 溢出（滚动/更多）时标签不压缩换行——white-space nowrap + flex-shrink 0（防文字竖排）', async ({
  page,
}) => {
  // 缺陷固化：more/滚动模式下 tab 曾被 flex 压缩致文字逐字竖排（应 nowrap + flex-shrink:0 保持宽度，
  // 溢出交给滚动箭头或「更多」下拉，而非挤压标签）
  await page.goto('/components/tabs.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tabs')
  // 溢出滚动 demo 与 more demo 的标签都不该换行/压缩
  for (const sel of ['.demo-block oas-tabs:not([more])', '.demo-block oas-tabs[more]']) {
    const result = await page
      .locator(sel)
      .first()
      .evaluate((el) => {
        const tabs = [...(el.shadowRoot?.querySelectorAll('[role="tab"][data-value]') ?? [])]
        const t = tabs.find((x) => (x as HTMLElement).offsetWidth > 0)
        if (!t) return null
        const cs = getComputedStyle(t as HTMLElement)
        return { whiteSpace: cs.whiteSpace, flexShrink: cs.flexShrink }
      })
    if (result) {
      expect(result.whiteSpace, `${sel} 标签应 nowrap`).toBe('nowrap')
      expect(result.flexShrink, `${sel} 标签应不压缩`).toBe('0')
    }
  }
})

test('tabs editable 真实双击进入重命名编辑态（真实 dblclick，非 dispatchEvent）', async ({
  page,
}) => {
  // 缺陷固化：真实双击前两次 click 触发 activate→update 重建 tablist，导致浏览器判定双击目标
  // 已变而不派发 dblclick，重命名永不进入编辑态。修复=activate 重复点击守卫 + dblclick 委托到
  // 稳定的 tablist 容器。此处用 Playwright 真实 dblclick 复现路径（dispatchEvent 无法暴露该 bug）。
  await page.goto('/components/tabs.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tabs-rename')
  await page.locator('h2:has-text("可编辑重命名")').first().scrollIntoViewIfNeeded()
  const tabA = page.locator('#tabs-rename [role="tab"][data-value="a"]')
  await tabA.dblclick({ force: true })
  await page.waitForTimeout(300)
  const hasInput = await page.evaluate(
    () => !!document.querySelector('#tabs-rename')!.shadowRoot!.querySelector('.tab-rename-input'),
  )
  expect(hasInput, '真实双击应进入重命名编辑态').toBe(true)
})

test('tabs editable 编辑态与非编辑态几何一致（编辑框贴合标签宽高，不晃动）', async ({ page }) => {
  // 缺陷固化：编辑框曾因 1px border + padding 比 label 高 1px，撑高 tab 致标签栏轻微晃动；
  // 修复=outline 替代 border（不占位）+ 宽高贴合原 label。此处断言切换前后 tab 高度不变。
  await page.goto('/components/tabs.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tabs-rename')
  await page.locator('h2:has-text("可编辑重命名")').first().scrollIntoViewIfNeeded()
  const tabA = page.locator('#tabs-rename [role="tab"][data-value="a"]')
  const before = await tabA.evaluate((el) => {
    const label = el.querySelector('.tab-label')!.getBoundingClientRect()
    return { tabH: el.getBoundingClientRect().height, labelTop: label.top, labelH: label.height }
  })
  await tabA.dblclick({ force: true })
  await page.waitForTimeout(200)
  const after = await tabA.evaluate((el) => {
    const input = el.querySelector('.tab-rename-input')!.getBoundingClientRect()
    return { tabH: el.getBoundingClientRect().height, inputTop: input.top, inputH: input.height }
  })
  expect(after.tabH, '编辑态不应撑高 tab').toBe(before.tabH)
  expect(Math.abs(after.inputTop - before.labelTop), '编辑框与原标签纵向对齐').toBeLessThanOrEqual(
    0.5,
  )
  expect(Math.abs(after.inputH - before.labelH), '编辑框与原标签同高').toBeLessThanOrEqual(0.5)
})

test('tabs 选中下划线与文字同主色且为 2px 细线（light/dark，无 border 叠加变粗）', async ({
  page,
}) => {
  // 缺陷固化：①tablist overflow-x:auto 时 overflow-y 连带裁剪，tab border 溢出的激活下划线被裁
  // 导致 dark 下选中下划线丢失主色；②改 box-shadow 后与残留 border 占位叠加变粗。
  // 修复=纯 box-shadow inset 2px 主色（无 border 占位）。断言选中下划线颜色==选中文字颜色、且
  // border-bottom 无占位（宽度 0，粗细仅由 box-shadow 2px 决定）。
  await page.goto('/components/tabs.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tabs')
  const probe = await page.evaluate(() => {
    const el = document.querySelector('.demo-block oas-tabs')!
    const sel = el.shadowRoot!.querySelector('[role="tab"][aria-selected="true"]') as HTMLElement
    const cs = getComputedStyle(sel)
    // ::after 伪元素承载激活下划线（独立 2px 盒子，渲染精确无 box-shadow 亚像素伪影）
    const after = getComputedStyle(sel, '::after')
    return {
      color: cs.color,
      borderBottomWidth: cs.borderBottomWidth,
      afterBg: after.backgroundColor,
      afterH: after.height,
    }
  })
  // 下划线颜色 == 文字颜色（同主色）；border 无占位（0）；::after 为 2px 均匀色带
  expect(probe.afterBg, '选中下划线（::after）应与文字同主色').toBe(probe.color)
  expect(probe.afterH, '下划线应为 2px').toBe('2px')
  expect(probe.borderBottomWidth, 'border 不应再占位').toBe('0px')
  // card 模式：激活用边框连通（border-bottom bg 色），::after 不叠加主色（否则变粗）
  const cardProbe = await page.evaluate(() => {
    const el = [...document.querySelectorAll('oas-tabs')].find((t) =>
      t.classList.contains('oas-tabs--card'),
    )
    if (!el) return null
    const sel = el.shadowRoot!.querySelector('[role="tab"][aria-selected="true"]') as HTMLElement
    return getComputedStyle(sel, '::after').backgroundColor
  })
  expect(
    cardProbe === null || cardProbe === 'rgba(0, 0, 0, 0)' || cardProbe === 'transparent',
    'card 模式激活 ::after 不应叠加主色（保持边框连通）',
  ).toBe(true)
})

test('tabs more 模式（通用机制）：tab 全渲染不隐藏 + more 下拉列视口外 tab + 点选平滑滚动到可见区', async ({
  page,
}) => {
  // 通用（滚动 + 视口外镜像下拉）：more 不再是 display:none 收缩，而是 tab 全部渲染 +
  // tablist 可滚动，more 下拉列出当前滚动视口之外的 tab 作快捷跳转，点选后平滑滚动到可见区。
  await page.goto('/components/tabs.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tabs[more]')
  await page.locator('h2:has-text("更多收缩")').first().scrollIntoViewIfNeeded()
  // tab 全部渲染不隐藏（无 display 收缩）
  const noHidden = await page.evaluate(() => {
    const el = document.querySelector('oas-tabs[more]')!
    return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"][data-value]')].every(
      (t) => getComputedStyle(t).display !== 'none',
    )
  })
  expect(noHidden, 'more 模式 tab 应全部渲染不隐藏').toBe(true)
  // 打开 more 下拉，列出视口外 tab
  await page.evaluate(() => {
    document
      .querySelector('oas-tabs[more]')!
      .shadowRoot!.querySelector<HTMLElement>('.more-btn')!
      .click()
  })
  await page.waitForTimeout(200)
  const dropCount = await page.evaluate(
    () =>
      document.querySelector('oas-tabs[more]')!.shadowRoot!.querySelectorAll('.more-item').length,
  )
  expect(dropCount, 'more 下拉应列出视口外 tab').toBeGreaterThan(0)
  // 点选最后一个视口外项 → 平滑滚动到可见 + 激活
  const scrollBefore = await page.evaluate(
    () =>
      document.querySelector('oas-tabs[more]')!.shadowRoot!.querySelector('.tablist')!.scrollLeft,
  )
  await page.evaluate(() => {
    const items = [
      ...document
        .querySelector('oas-tabs[more]')!
        .shadowRoot!.querySelectorAll<HTMLElement>('.more-item'),
    ]
    items[items.length - 1]?.click()
  })
  await page.waitForTimeout(600) // 等平滑滚动
  const result = await page.evaluate(() => {
    const el = document.querySelector('oas-tabs[more]')!
    return {
      active: el.getAttribute('active'),
      scrollLeft: el.shadowRoot!.querySelector('.tablist')!.scrollLeft,
    }
  })
  expect(result.active, '点选后应激活').toBeTruthy()
  expect(result.scrollLeft, '点选视口外项应滚动到可见区').toBeGreaterThan(scrollBefore)
})

test('menu 水平模式子菜单浮层不被裁剪——.menu 容器 overflow-x:clip（曾 overflow:hidden 双轴裁剪致浮层不可见）', async ({
  page,
}) => {
  // 缺陷固化：水平收纳引入 .menu{overflow:hidden}，把向下浮出的一级子菜单（及「···」收纳弹层）
  // 一并裁剪——display/rect 正常（机制断言全绿）但视觉不可见。用 elementFromPoint 验证真实命中。
  await page.goto('/components/menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-menu')
  const menu = page.locator('oas-menu[mode="horizontal"]').first()
  await menu.scrollIntoViewIfNeeded()
  // hover「产品」展开一级子菜单
  const item = menu.locator('[data-value="products"]')
  await item.hover()
  await page.waitForTimeout(400)
  const result = await item.evaluate((li) => {
    const host =
      li.getRootNode() instanceof ShadowRoot ? (li.getRootNode() as ShadowRoot).host : null
    const menuRoot = host?.shadowRoot?.querySelector('.menu') as HTMLElement | null
    const sub = li.querySelector(':scope > .submenu') as HTMLElement | null
    if (!host || !menuRoot || !sub) return null
    const r = sub.getBoundingClientRect()
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + Math.min(r.height / 2, 40))
    return {
      overflowX: getComputedStyle(menuRoot).overflowX,
      subVisible: getComputedStyle(sub).display !== 'none' && r.height > 0,
      hitIsHost: hit === host, // 子菜单可见时，其区域命中应落在 oas-menu（shadow 重定向到宿主）
      hitTag: hit?.tagName ?? null,
    }
  })
  expect(result, '子菜单应已展开').not.toBeNull()
  expect(result!.subVisible, '子菜单应 display 可见').toBe(true)
  expect(result!.overflowX, '容器应只裁横轴（clip）').toBe('clip')
  expect(result!.hitIsHost, `子菜单区域应命中菜单宿主（实际命中 ${result!.hitTag}）`).toBe(true)
})

test('menu 水平溢出收纳「···」可见且末项不截断（曾收纳项被误纳入收纳计算致自身 data-collapsed 隐藏）', async ({
  page,
}) => {
  // 缺陷固化：syncOverflowCollapse 的顶层项选择器把「···」收纳项也算进数据项，
  // 它排在末尾总被标记 data-collapsed（display:none）——溢出时项被裁掉但「···」永不出现。
  // 另：测量前须复位 data-collapsed（display:none 宽为 0 会误判无溢出），且收纳项自身占宽须扣除。
  await page.goto('/components/menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-menu')
  const menu = page.locator('oas-menu[mode="horizontal"][style*="380px"]')
  await menu.scrollIntoViewIfNeeded()
  await page.waitForTimeout(400) // 等 rAF 测量
  const st = await menu.evaluate((host) => {
    const root = host.shadowRoot!.querySelector('.menu')!
    const items = [
      ...root.querySelectorAll<HTMLElement>(':scope > [part="item"][data-value]:not(.menu-more)'),
    ]
    const more = root.querySelector<HTMLElement>('.menu-more')!
    const visible = items.filter((t) => !t.hasAttribute('data-collapsed'))
    const lastVisible = visible[visible.length - 1]
    return {
      collapsedCount: items.length - visible.length,
      moreVisible: getComputedStyle(more).display !== 'none' && more.offsetWidth > 0,
      // 末个可见项文本不被截断（scrollWidth 不超过盒宽）
      lastItemClipped: lastVisible ? lastVisible.scrollWidth > lastVisible.offsetWidth + 1 : false,
    }
  })
  expect(st.collapsedCount, '应有溢出项被收纳').toBeGreaterThan(0)
  expect(st.moreVisible, '「···」收纳项应可见').toBe(true)
  expect(st.lastItemClipped, '末个可见项不应截断').toBe(false)
  // 点击「···」→ 镜像弹层真实可见（elementFromPoint 命中宿主）
  await menu.locator('.menu-more').click()
  await page.waitForTimeout(300)
  const pop = await menu.evaluate((host) => {
    const sub = host.shadowRoot!.querySelector<HTMLElement>('.menu-more-sub')!
    const r = sub.getBoundingClientRect()
    const kids = sub.querySelectorAll('[role="menuitemradio"]').length
    if (getComputedStyle(sub).display === 'none' || r.height === 0) return { visible: false, kids }
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + Math.min(r.height / 2, 40))
    return { visible: hit === host, kids }
  })
  expect(pop.kids, '弹层应镜像全部收纳项').toBe(st.collapsedCount)
  expect(pop.visible, '收纳弹层应真实可见（不被裁剪）').toBe(true)
  // 选中弹层内某项（弹层此时仍开着，勿再点「···」否则会收起）→ 条上无 ✓（项被收不可见），
  // 「···」高亮（child-selected + 主色 + aria-current），弹层镜像项带 radio 选中态
  // （选中项在溢出弹层里时由收纳指示器高亮表达）
  await menu.locator('.menu-more-sub [role="menuitemradio"]').first().click()
  await page.waitForTimeout(400) // 等 value 写回 → update → rAF 重建镜像
  const sel = await menu.evaluate((host) => {
    const root = host.shadowRoot!.querySelector('.menu')!
    const more = root.querySelector<HTMLElement>('.menu-more')!
    const firstMirror = root.querySelector<HTMLElement>('.menu-more-sub [role="menuitemradio"]')
    const visibleChecked = [
      ...root.querySelectorAll<HTMLElement>(':scope > [part="item"]:not(.menu-more)'),
    ]
      .filter((t) => !t.hasAttribute('data-collapsed'))
      .some((t) => t.getAttribute('aria-checked') === 'true')
    return {
      value: host.getAttribute('value'),
      moreCls: more.className,
      moreColor: getComputedStyle(more).color,
      moreAriaCurrent: more.getAttribute('aria-current'),
      mirrorChecked: firstMirror?.getAttribute('aria-checked'),
      visibleChecked,
    }
  })
  expect(sel.value, '选中值应写回').toBeTruthy()
  expect(sel.visibleChecked, '条上可见项不应带 ✓（选中项被收纳）').toBe(false)
  expect(sel.moreCls, '「···」应有 child-selected 高亮').toContain('child-selected')
  expect(sel.moreAriaCurrent, '「···」应有 aria-current').toBe('true')
  expect(sel.mirrorChecked, '镜像项应有选中态').toBe('true')
})

test('hover-card 浮层可悬停：触发器 → 卡片跨间隙移动不闪关', async ({ page }) => {
  await page.goto('/components/hover-card.html', { waitUntil: 'domcontentloaded' })
  const sel = 'oas-hover-card:has([slot="content"])'
  await up(page, sel)
  // demo 块可能在首屏下方，先把触发器滚进视口（视口外元素收不到指针事件）
  await page.evaluate((s) => {
    document.querySelector(s)?.querySelector('oas-button')?.scrollIntoView({ block: 'center' })
  }, sel)
  await page.waitForTimeout(300)
  const trigger = await page.evaluate((s) => {
    const host = document.querySelector(s) as HTMLElement
    const el = host.querySelector('oas-button') as HTMLElement
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }, sel)
  // hover 触发器 → 卡片打开（open-delay 300ms）
  await page.mouse.move(trigger.x, trigger.y)
  await page.waitForFunction(
    (s) => {
      const host = document.querySelector(s) as HTMLElement
      return (
        host?.shadowRoot?.querySelector('[part="card"]')?.getAttribute('aria-hidden') === 'false'
      )
    },
    sel,
    { timeout: 5000 },
  )
  // 读取已打开的卡片区域，指针移入卡片 → 等过 close-delay → 仍打开（不闪关）
  const card = await page.evaluate((s) => {
    const host = document.querySelector(s) as HTMLElement
    const el = host?.shadowRoot?.querySelector('[part="card"]') as HTMLElement
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }, sel)
  await page.mouse.move(card.x, card.y)
  await page.waitForTimeout(600)
  const stillOpen = await page.evaluate((s) => {
    const host = document.querySelector(s) as HTMLElement
    return host?.shadowRoot?.querySelector('[part="card"]')?.getAttribute('aria-hidden') === 'false'
  }, sel)
  expect(stillOpen, '移入卡片后应保持打开（不闪关）').toBe(true)
})

test('back-top append-to 不触发 SSR 水合告警（组件 chunk 先于水合 chunk 到达的竞态时序）', async ({
  page,
}) => {
  // 缺陷回归：connectedCallback 即时把宿主 teleport 进 append-to 容器，组件 chunk
  // （customElements.define）先于页面 chunk（Vue mount 水合链）到达时，水合在 SSR
  // 原位置找不到节点 → console error「Hydration completed but contains mismatches.」。
  // 修复：teleport 推迟到文档 load 后（水合必然已完成）。此处反向延迟页面 chunk
  // （2500ms > 组件 chunk ~1MB 的本地传输耗时）强制「先升级后水合」的竞态时序。
  const errs: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text())
  })
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`))
  await page.route(/components_back-top\.md\..*\.js$/, async (route) => {
    await new Promise((r) => setTimeout(r, 2500))
    await route.continue()
  })
  await page.goto('/components/back-top.html', { waitUntil: 'load' })
  // 等竞态时序完整走完：页面 chunk 到达 → mount/水合 → onMounted 注册组件 → 升级 → teleport
  await page.waitForFunction(() => !!document.querySelector('#bt-app-root > oas-back-top'), null, {
    timeout: 15000,
  })

  const hydrationErrs = errs.filter((e) => /[Hh]ydration/.test(e))
  expect(hydrationErrs, '竞态时序下 console 不得出现水合 mismatch error').toEqual([])
})

test('toolbar-toggle 选中态主题可见——light/dark 下选中与未选中背景可区分（曾识图验收：dark 选中态不可见）', async ({
  page,
}) => {
  // 缺陷固化：识图验收在 dark 下点击 toggle 后选中与未选中几乎一致（陈旧产物假象）。
  // 回归断言走「点击 → 计算样式」全链路：选中项背景必须等于当前主题的 primary
  // 计算色（token 怎么调都跟随），且与未选中（透明底）可区分；dark 下文字色同步校验。
  await page.goto('/components/toolbar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-toolbar-toggle')

  /** 读当前主题下某 token 的计算 rgb（临时元素 color 解析，var() 在页面上下文求值） */
  const tokenRgb = (token: string) =>
    page.evaluate((t) => {
      const el = document.createElement('div')
      el.style.color = `var(${t})`
      document.body.appendChild(el)
      const v = getComputedStyle(el).color
      el.remove()
      return v
    }, token)

  /** 读 tb-align 组各按钮的 pressed/背景/文字色计算样式 */
  const readAlign = () =>
    page.evaluate(() => {
      const tg = document.querySelector('oas-toolbar-toggle#tb-align')!
      return [...(tg.shadowRoot?.querySelectorAll<HTMLButtonElement>('button.item') || [])].map(
        (b) => {
          const cs = getComputedStyle(b)
          return {
            text: b.textContent,
            pressed: b.getAttribute('aria-pressed'),
            bg: cs.backgroundColor,
            color: cs.color,
          }
        },
      )
    })

  // ---- light：选中=primary 蓝底，未选中=透明底 ----
  const primaryLight = await tokenRgb('--oas-color-primary')
  let btns = await readAlign()
  const selL = btns.find((b) => b.pressed === 'true')!
  const unselL = btns.find((b) => b.pressed === 'false')!
  expect(selL.bg, `light 选中项背景应为 primary（${primaryLight}）`).toBe(primaryLight)
  expect(unselL.bg, 'light 未选中项背景应为透明').toBe('rgba(0, 0, 0, 0)')
  expect(selL.bg, 'light 选中/未选中背景必须可区分').not.toBe(unselL.bg)

  // ---- dark：token 切换后选中项背景跟随 dark primary（识图缺陷场景） ----
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(400)
  const primaryDark = await tokenRgb('--oas-color-primary')
  expect(primaryDark, 'dark token 应与 light 不同（主题已切换）').not.toBe(primaryLight)

  // 点击未选中项（复现识图操作路径：点击后读计算样式）
  await page.evaluate(() => {
    const tg = document.querySelector('oas-toolbar-toggle#tb-align')!
    const btn = [...(tg.shadowRoot?.querySelectorAll<HTMLButtonElement>('button.item') || [])].find(
      (b) => b.getAttribute('aria-pressed') === 'false',
    )!
    btn.click()
  })
  await page.waitForTimeout(300)

  btns = await readAlign()
  const selD = btns.find((b) => b.pressed === 'true')!
  const unselD = btns.find((b) => b.pressed === 'false')!
  expect(selD.bg, `dark 点击后选中项背景应为 dark primary（${primaryDark}）`).toBe(primaryDark)
  expect(unselD.bg, 'dark 未选中项背景应为透明').toBe('rgba(0, 0, 0, 0)')
  expect(selD.bg, 'dark 选中/未选中背景必须可区分（识图缺陷场景）').not.toBe(unselD.bg)
  // 文字色：选中（on-primary 深字）与未选中（text-primary 亮字）可区分
  expect(selD.color, 'dark 选中/未选中文字色必须可区分').not.toBe(unselD.color)
})

// —— 缺陷回归：popover 实测六条（12 向箭头对准 / portal 样式保真 / closable X / virtual 点标记）——
// 曾现缺陷：① -start/-end 箭头恒 CSS 居中、脱离锚点投影区间（箭头没对准宿主）；
// ② append-to 裸 appendChild 到 body，面板脱离 shadow 树后 scoped CSS 全失效
//   （static 掉文档流末尾、随滚动乱飘）；③ closable 的 X 显示规则钩子（.panel.oas-closable）
//   无人挂类，✕ 永不显示；④ virtual 定点无视觉标记，「对准哪里」不可感知。

test('popover 12 向箭头对准锚点：demo 4 实例箭头中心落在锚点投影区间内（曾恒居中脱离锚点）', async ({
  page,
}) => {
  await page.goto('/components/popover.html', { waitUntil: 'domcontentloaded' })
  const firstSel = '.demo-block__body oas-popover[placement="bottom-start"]'
  await page.locator(firstSel).first().waitFor({ state: 'attached', timeout: 15000 })
  await page.waitForFunction(
    () =>
      document.querySelectorAll('oas-popover').length > 0 &&
      [...document.querySelectorAll('oas-popover')].every(
        (e) => (e as HTMLElement).shadowRoot != null,
      ),
  )
  for (const pl of ['bottom-start', 'bottom-end', 'right-start', 'top-end']) {
    const sel = `.demo-block__body oas-popover[placement="${pl}"]`
    const pop = page.locator(sel).first()
    await pop.scrollIntoViewIfNeeded()
    await pop.click()
    await page.waitForTimeout(350)
    const r = await page.evaluate((s) => {
      const pop = document.querySelector(s)!
      const panel = pop.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
      const arrow = panel.querySelector<HTMLElement>('[data-popper-arrow]')!
      const anchor = pop.querySelector<HTMLElement>(':scope > *')!
      const ab = arrow.getBoundingClientRect()
      const nb = anchor.getBoundingClientRect()
      const placement = panel.getAttribute('data-placement')!
      const vertical = placement.startsWith('top') || placement.startsWith('bottom')
      const cx = ab.left + ab.width / 2
      const cy = ab.top + ab.height / 2
      return vertical
        ? { ok: cx >= nb.left - 2 && cx <= nb.right + 2 }
        : { ok: cy >= nb.top - 2 && cy <= nb.bottom + 2 }
    }, sel)
    expect(r.ok, `${pl} 箭头中心应落在锚点投影区间内`).toBe(true)
    await page.evaluate((s) => document.querySelector(s)!.removeAttribute('open'), sel)
    await page.waitForTimeout(120)
  }
})

test('popover portal 样式保真：append-to 面板 fixed + 有背景边框，滚动跟随锚点（曾 scoped CSS 全失效掉文档流末尾）', async ({
  page,
}) => {
  await page.goto('/components/popover.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('oas-popover[append-to="body"]', { timeout: 15000 })
  await page.waitForFunction(() => {
    const e = document.querySelector('oas-popover[append-to="body"]')
    return !!e && (e as HTMLElement).shadowRoot != null
  })
  const sel = 'oas-popover[append-to="body"]'
  const pop = page.locator(sel).first()
  await pop.scrollIntoViewIfNeeded()
  await pop.click()
  await page.waitForTimeout(350)
  const r1 = await page.evaluate((s) => {
    const pop = document.querySelector(s)!
    const host = document.querySelector<HTMLElement>('[data-oas-popover-portal]')
    const panel =
      (host?.shadowRoot?.querySelector<HTMLElement>('[part="panel"]') ?? null) ||
      pop.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
    const cs = getComputedStyle(panel)
    const anchor = pop.querySelector<HTMLElement>(':scope > *')!
    return {
      hostInBody: !!host && document.body.contains(host),
      panelInHostShadow: !!host?.shadowRoot?.contains(panel),
      position: cs.position,
      hasBg: cs.backgroundColor !== 'rgba(0, 0, 0, 0)',
      hasBorder: cs.borderTopWidth !== '0px',
      gapOk:
        Math.abs(panel.getBoundingClientRect().top - anchor.getBoundingClientRect().bottom - 8) <=
        2,
    }
  }, sel)
  expect(r1.hostInBody, 'portal host 应挂在 body').toBe(true)
  expect(r1.panelInHostShadow, '面板应在 portal host 的独立 shadow 内（样式作用域保真）').toBe(true)
  expect(r1.position, '面板应保持 fixed（曾失效为 static）').toBe('fixed')
  expect(r1.hasBg, '面板应有背景色（曾透明）').toBe(true)
  expect(r1.hasBorder, '面板应有边框（曾无边框）').toBe(true)
  expect(r1.gapOk, '面板应在锚点下方 8px').toBe(true)
  // 滚动跟随：面板与锚点视口坐标同步
  await page.evaluate(() => window.scrollBy(0, 300))
  await page.waitForTimeout(400)
  const r2 = await page.evaluate((s) => {
    const pop = document.querySelector(s)!
    const host = document.querySelector<HTMLElement>('[data-oas-popover-portal]')
    const panel = host?.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')!
    const anchor = pop.querySelector<HTMLElement>(':scope > *')!
    return (
      Math.abs(panel.getBoundingClientRect().top - anchor.getBoundingClientRect().bottom - 8) <= 2
    )
  }, sel)
  expect(r2, '滚动后面板应跟随锚点（曾乱飘）').toBe(true)
  await page.evaluate((s) => document.querySelector(s)!.removeAttribute('open'), sel)
})

test('popover closable：右上角 ✕ 按钮真实可见（display 非 none 且有尺寸，曾 CSS 类钩子缺失永不显示）', async ({
  page,
}) => {
  await page.goto('/components/popover.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('oas-popover[closable]', { timeout: 15000 })
  await page.waitForFunction(() => {
    const e = document.querySelector('oas-popover[closable]')
    return !!e && (e as HTMLElement).shadowRoot != null
  })
  const sel = 'oas-popover[closable]'
  const pop = page.locator(sel).first()
  await pop.scrollIntoViewIfNeeded()
  await pop.click()
  await page.waitForTimeout(350)
  const r = await page.evaluate((s) => {
    const pop = document.querySelector(s)!
    const panel = pop.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
    const btn = panel.querySelector<HTMLElement>('[part="close"]')!
    const cs = getComputedStyle(btn)
    const b = btn.getBoundingClientRect()
    const pb = panel.getBoundingClientRect()
    return {
      display: cs.display,
      visible: b.width > 0 && b.height > 0,
      atTopRight: b.right <= pb.right + 2 && b.top >= pb.top && b.top <= pb.top + 24,
    }
  }, sel)
  expect(
    r.display,
    '✕ 应可见（display 非 none，曾规则钩子 .panel.oas-closable 无人挂类）',
  ).not.toBe('none')
  expect(r.visible, '✕ 应有渲染尺寸').toBe(true)
  expect(r.atTopRight, '✕ 应位于面板右上角').toBe(true)
  await page.evaluate((s) => document.querySelector(s)!.removeAttribute('open'), sel)
})

test('popover virtual 定点：(160,90) 标记点可见且箭头对准该点（曾无标记、对准哪里不可感知）', async ({
  page,
}) => {
  await page.goto('/components/popover.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#pop-point', { state: 'attached', timeout: 15000 })
  await page.waitForFunction(() => {
    const e = document.querySelector('#pop-point')
    return !!e && (e as HTMLElement).shadowRoot != null
  })
  await page.evaluate(() => {
    document.getElementById('pop-point')!.scrollIntoView({ block: 'center' })
    ;(window as unknown as { popPointShow: (x: number, y: number) => void }).popPointShow(160, 90)
  })
  await page.waitForTimeout(400)
  const r = await page.evaluate(() => {
    const pop = document.getElementById('pop-point')!
    const panel = pop.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
    const arrow = panel.querySelector<HTMLElement>('[data-popper-arrow]')!
    const mark = document.getElementById('pop-point-mark')!
    const ab = arrow.getBoundingClientRect()
    const mb = mark.getBoundingClientRect()
    const cs = getComputedStyle(mark)
    return {
      markVisible: cs.opacity !== '0' && mb.width > 0,
      markCenter: { x: mb.left + mb.width / 2, y: mb.top + mb.height / 2 },
      arrowCenter: { x: ab.left + ab.width / 2, y: ab.top + ab.height / 2 },
    }
  })
  expect(r.markVisible, '虚拟锚点标记应可见').toBe(true)
  expect(Math.abs(r.markCenter.x - 160), '标记中心应在视口 x=160').toBeLessThanOrEqual(1)
  expect(Math.abs(r.markCenter.y - 90), '标记中心应在视口 y=90').toBeLessThanOrEqual(1)
  // placement=right：箭头垂直中心对准点 y=90
  expect(Math.abs(r.arrowCenter.y - 90), '箭头应对准虚拟锚点坐标点（P6 定夺）').toBeLessThanOrEqual(
    3,
  )
  await page.evaluate(() => {
    ;(window as unknown as { popPointHide: () => void }).popPointHide()
  })
})

// —— 缺陷回归：navigation-menu 面板箭头跟随触发器 ——
// 曾现缺陷：CSS 引用 var(--arrow-x,24px)/var(--arrow-y,24px) 但 JS 从未写入，
// 箭头永远停在 24px 默认位、不指向打开的触发器。修复后按当前触发器中心写入变量。
test('navigation-menu 箭头跟随触发器：面板箭头 --arrow-x 随触发器切换而移动', async ({ page }) => {
  await page.goto('/components/navigation-menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#nav-arrow')
  const r = await page.evaluate(async () => {
    const host = document.querySelector('#nav-arrow')!
    host.scrollIntoView({ block: 'center' })
    await new Promise((res) => setTimeout(res, 300))
    const triggers = [...host.shadowRoot!.querySelectorAll<HTMLElement>('[aria-expanded]')]
    const t0 = triggers[0]
    const t1 = triggers[1]
    if (!t0 || !t1) return { skip: true as const }
    t0.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    await new Promise((res) => setTimeout(res, 450))
    const arrow1 = host.shadowRoot!.querySelector<HTMLElement>('.arrow, [class*="arrow"]')
    const x1 = arrow1 ? arrow1.style.getPropertyValue('--arrow-x') : ''
    t0.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    await new Promise((res) => setTimeout(res, 400))
    t1.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    await new Promise((res) => setTimeout(res, 450))
    const arrow2 = host.shadowRoot!.querySelector<HTMLElement>('.arrow, [class*="arrow"]')
    const x2 = arrow2 ? arrow2.style.getPropertyValue('--arrow-x') : ''
    return { skip: false as const, x1, x2 }
  })
  if (r.skip) return // demo 结构变化时跳过而非误报
  expect(r.x1, '箭头变量应被 JS 写入（非空）').not.toBe('')
  expect(r.x2, '箭头变量应被 JS 写入（非空）').not.toBe('')
  expect(r.x1, '箭头位置应随触发器切换而变化').not.toBe(r.x2)
})

// —— 缺陷回归：breadcrumb ellipsis 模式项下拉不被 nav 自裁剪 ——
// 曾现缺陷：nav.ellipsis 的 overflow:hidden 双轴裁剪会裁掉向下展开的项下拉面板。
// 修复为 overflow-x:clip + overflow-y:visible（只裁横轴防溢出闪动，纵轴放行下拉）。
test('breadcrumb ellipsis 模式项下拉不被裁剪：面板 elementFromPoint 真实命中', async ({ page }) => {
  await page.goto('/components/breadcrumb.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-breadcrumb')
  const r = await page.evaluate(async () => {
    const host = [...document.querySelectorAll('oas-breadcrumb')].find((b) =>
      (b.getAttribute('items') || '').includes('"dropdown"'),
    )
    if (!host) return { skip: true as const }
    host.scrollIntoView({ block: 'center' })
    await new Promise((res) => setTimeout(res, 300))
    const trig = host.shadowRoot!.querySelector<HTMLElement>('[aria-haspopup]')
    if (!trig) return { skip: true as const }
    trig.click()
    await new Promise((res) => setTimeout(res, 400))
    const panel = host.shadowRoot!.querySelector<HTMLElement>('.menu-panel.open')
    if (!panel) return { skip: false as const, open: false }
    const rect = panel.getBoundingClientRect()
    const hit = document.elementFromPoint(
      rect.left + rect.width / 2,
      Math.min(rect.top + 8, rect.bottom - 4),
    )
    return {
      skip: false as const,
      open: true,
      height: rect.height,
      hitInside: !!hit && (host.shadowRoot!.contains(hit) || host.contains(hit)),
    }
  })
  if (r.skip) return
  expect(r.open, '下拉面板应打开').toBe(true)
  expect(r.height, '下拉面板应有高度').toBeGreaterThan(20)
  expect(r.hitInside, '下拉面板顶部应真实可见（不被 nav overflow 裁剪）').toBe(true)
})

// —— 缺陷回归：toolbar 溢出收纳的子项防收缩 ——
// 曾现缺陷：slotted 子项无 flex-shrink:0，窄容器下被 flex 压扁成窄条，
// scrollWidth 恒等于 clientWidth，溢出收纳判定永不触发（「···」不出现）。
// 修复：::slotted(*) flex-shrink:0，溢出真实出现后由 syncOverflow 收纳。
test('toolbar 窄容器子项防收缩：项保持固有宽度、溢出触发「···」、弹层镜像项为 menuitemcheckbox', async ({
  page,
}) => {
  await page.goto('/components/toolbar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tb-overflow')
  const r = await page.evaluate(async () => {
    const host = document.querySelector('#tb-overflow')!
    host.scrollIntoView({ block: 'center' })
    await new Promise((res) => setTimeout(res, 500))
    const more = host.shadowRoot!.querySelector<HTMLElement>('.more')
    const kids = [...host.children].filter((k) => !k.hasAttribute('data-collapsed'))
    const collapsed = [...host.children].filter((k) => k.hasAttribute('data-collapsed'))
    // 至少一个文本按钮未被压扁（宽度 > 按钮内容合理下限）
    const textBtn = kids.find((k) => (k.textContent || '').trim().length >= 2)
    const minW = textBtn ? textBtn.getBoundingClientRect().width : 0
    let panelRoles: string[] = []
    if (more && !more.hidden) {
      more.click()
      await new Promise((res) => setTimeout(res, 400))
      const panel = host.shadowRoot!.querySelector<HTMLElement>('.more-panel')
      if (panel && !panel.hidden) {
        panelRoles = [...panel.querySelectorAll('[role]')].map((n) => n.getAttribute('role') || '')
      }
    }
    return {
      moreVisible: !!more && !more.hidden,
      collapsedCount: collapsed.length,
      minW: minW | 0,
      panelRoles,
    }
  })
  expect(r.moreVisible, '「···」收纳项应可见').toBe(true)
  expect(r.collapsedCount, '应有被收纳项').toBeGreaterThan(0)
  expect(
    r.minW,
    '未收纳按钮不应被压扁（两字中文按钮固有宽约 24px+，压扁态为 ~13px）',
  ).toBeGreaterThan(24)
  expect(r.panelRoles.length, '弹层应有镜像项').toBeGreaterThan(0)
  for (const role of r.panelRoles) {
    expect(['menuitem', 'menuitemcheckbox'], '镜像项角色应为 menuitem/menuitemcheckbox').toContain(
      role,
    )
  }
})

// —— 缺陷回归：icon duotone 显式 data-layer 分层被元素序 fallback 劫持 ——
// 曾现缺陷：[data-layer='primary'/'secondary'] 显式分层规则与「前两个直接子元素」
// fallback 规则特异性相同（0,2,1）且 fallback 声明在后——SVG 按自然绘制序摆放
// （底色层在前、主图形在后）时，primary 层命中 > :nth-child(2) 的 secondary
// fallback，opacity 双双错乱（primary 变 0.4 / swap 两层全 1），双色观感消失。
// 修复：fallback 选择器加 :not([data-layer])——显式分层永远优先，序号兜底只管未标记的 SVG。
test('icon duotone：显式 data-layer 分层的透明度不被元素序 fallback 覆盖（真实 computed 断言）', async ({
  page,
}) => {
  await page.goto('/components/icon.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-icon[duotone]')
  const r = await page.evaluate(() => {
    const icons = [...document.querySelectorAll('oas-icon[duotone]')]
    return icons.map((el) => {
      const svg = el.shadowRoot!.querySelector('svg')!
      const layers = [...svg.querySelectorAll('path')].map((pt) => ({
        layer: pt.getAttribute('data-layer'),
        opacity: getComputedStyle(pt).opacity,
      }))
      return { swap: svg.getAttribute('data-swap'), layers }
    })
  })
  // 非 swap 图标：primary=1 / secondary=0.4（demo SVG 绘制序 secondary 在前）
  const normal = r.find((x) => !x.swap)
  const normalPrimary = normal?.layers.find((l) => l.layer === 'primary')
  const normalSecondary = normal?.layers.find((l) => l.layer === 'secondary')
  expect(normalPrimary?.opacity, 'primary 层应为全实（opacity 1）').toBe('1')
  expect(normalSecondary?.opacity, 'secondary 层应为半透明（opacity 0.4）').toBe('0.4')
  // swap 图标：两层透明度互换（primary=0.4 / secondary=1）
  const swapped = r.find((x) => x.swap)
  const swapPrimary = swapped?.layers.find((l) => l.layer === 'primary')
  const swapSecondary = swapped?.layers.find((l) => l.layer === 'secondary')
  expect(swapPrimary?.opacity, 'swap 后 primary 层应为 0.4').toBe('0.4')
  expect(swapSecondary?.opacity, 'swap 后 secondary 层应为 1').toBe('1')
})

// —— 缺陷回归：menubar show-arrow 的 side-top 缺 align 定位分支，箭头错位 ——
// 曾现缺陷：show-arrow 只给 side-bottom 配了 align-start/center/end 的 left/right 定位，
// side-top 缺三档（只有通用 bottom/rotate 规则）——position:absolute 无 left/right 时停在
// 面板内容起始位（左缘附近），而面板右对齐触发器时箭头偏左、不指向触发器右端。
// 修复：side-top 补 align-start/center/end 三档（与 side-bottom 对称）。
test('menubar show-arrow side-top align-end 箭头右对齐触发器（右缘 12px，不落面板左端）', async ({
  page,
}) => {
  await page.goto('/components/menubar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-menubar[show-arrow][side="top"]')
  const r = await page.evaluate(async () => {
    const host = document.querySelector('oas-menubar[show-arrow][side="top"]')!
    host.scrollIntoView({ block: 'center' })
    await new Promise((res) => setTimeout(res, 300))
    const trig = host.shadowRoot!.querySelector('.top-item') as HTMLElement
    trig.click()
    await new Promise((res) => setTimeout(res, 450))
    const popup = host.shadowRoot!.querySelector('.submenu.popup-first.open')!
    const cs = getComputedStyle(popup, '::before')
    return { left: cs.left, right: cs.right }
  })
  // align=end：箭头应 right:12px（靠近面板右缘=触发器右缘），不应落回左端
  expect(r.right, 'side-top align-end 箭头应 right:12px（面板右缘）').toContain('12px')
  // left 在 right 定位下 getComputedStyle 返回计算值（面板宽-12-10 附近，即靠右），
  // 不可能是小值（若落左端 left≈左缘、right 会为负）
  const leftPx = parseFloat(r.left)
  expect(leftPx, '箭头左缘应靠面板右侧（远离左端）').toBeGreaterThan(80)
})

// —— 缺陷回归：navigation-menu 箭头坐标系 + 营销位高度账 ——
// 曾现缺陷①：箭头用触发器 offsetLeft（相对 bar）但在 viewport 内定位，垂直/翻转形态
// viewport 原点漂移后箭头错位（指到宿主外）；垂直形态另有横→竖排重排的同帧旧值问题。
// 修复：箭头挂 nav 直下（viewport 外），坐标系=触发器相对 nav 的 offset（静止），
// rAF 等重排后写入。缺陷②：营销位高度手工拼「+4」与 .panel-footer 的 margin+padding+border
// 实际结构差 13px，且打开瞬间测量比终态少 5px——底缘被裁 3px。修复：真实布局计法
// （offsetHeight+marginTop+1）+ rAF 终态重算。
test('navigation-menu 箭头几何对准触发器中心（水平+垂直）且营销位不溢出面板（真实 rect 断言）', async ({
  page,
}) => {
  await page.goto('/components/navigation-menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-navigation-menu')
  const probe = async (sel: string, vertical: boolean) =>
    page.evaluate(
      async ({ sel, vertical }) => {
        const host = document.querySelector(sel as string) as HTMLElement | null
        if (!host) return null
        host.scrollIntoView({ block: 'center' })
        await new Promise((res) => setTimeout(res, 250))
        const trig = [...host.shadowRoot!.querySelectorAll<HTMLElement>('[aria-expanded]')][0]
        trig?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
        await new Promise((res) => setTimeout(res, 650))
        const ar = host.shadowRoot!.querySelector('.arrow') as HTMLElement
        const vp = host.shadowRoot!.querySelector('.viewport') as HTMLElement
        const pf = host.shadowRoot!.querySelector('.panel-footer') as HTMLElement | null
        const tr = trig!.getBoundingClientRect()
        const arR = ar.getBoundingClientRect()
        const vr = vp.getBoundingClientRect()
        const fr = pf && !pf.hidden ? pf.getBoundingClientRect() : null
        return {
          trigC: vertical ? (tr.top + tr.bottom) / 2 : (tr.left + tr.right) / 2,
          arrowC: vertical ? (arR.top + arR.bottom) / 2 : (arR.left + arR.right) / 2,
          // 箭头跨边悬置（探出面板边缘）：顶部可探出面板顶缘之上，但左右两侧不越面板、
          // 探出量收敛（顶边探出 ≤ 12px 半数对角，不悬空漂离）
          arrowInVp:
            arR.left >= vr.left - 2 &&
            arR.right <= vr.right + 2 &&
            vr.top - arR.top <= 10 &&
            arR.bottom <= vr.bottom + 2,
          pfOverflow: fr ? Math.round(fr.bottom - vr.bottom) : null,
        }
      },
      { sel, vertical },
    )
  const horiz = await probe('#nav-arrow', false)
  expect(horiz).not.toBeNull()
  expect(
    Math.abs(horiz!.arrowC - horiz!.trigC),
    '水平箭头中心对准触发器中心（±2px）',
  ).toBeLessThanOrEqual(2)
  expect(horiz!.arrowInVp, '箭头不越出面板').toBe(true)
  const vert = await probe('oas-navigation-menu[orientation="vertical"]', true)
  expect(vert).not.toBeNull()
  expect(
    Math.abs(vert!.arrowC - vert!.trigC),
    '垂直箭头中心对准触发器中心（±2px）',
  ).toBeLessThanOrEqual(2)
  const footer = await probe('#nav-footer', false)
  expect(footer).not.toBeNull()
  expect(footer!.pfOverflow, '营销位底缘不超出面板（≤0px 溢出）').toBeLessThanOrEqual(0)
})

// —— 缺陷回归：navigation-menu 面板碰撞翻转后箭头脱节 ——
// 曾现缺陷：箭头位置写死「面板在 nav 下方/右侧」，flip-up（面板翻到触发器上方）后
// 箭头仍留在翻转前位置——悬空在面板外 49px 且背对触发器。修复：syncViewportPosition
// 把 flip 类镜像到箭头，CSS flip 变体换边贴合面板、尖端反向指向触发器。
test('navigation-menu flip-up 后箭头贴面板底边指向触发器（不悬空脱节）', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 420 })
  await page.goto('/components/navigation-menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#nav-arrow')
  const r = await page.evaluate(async () => {
    const host = document.querySelector('#nav-arrow')!
    host.scrollIntoView({ block: 'end' })
    await new Promise((res) => setTimeout(res, 300))
    const trig = [...host.shadowRoot!.querySelectorAll<HTMLElement>('[aria-expanded]')][0]
    trig?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    await new Promise((res) => setTimeout(res, 700))
    const ar = host.shadowRoot!.querySelector('.arrow') as HTMLElement
    const vp = host.shadowRoot!.querySelector('.viewport') as HTMLElement
    const tr = trig!.getBoundingClientRect()
    const arR = ar.getBoundingClientRect()
    const vr = vp.getBoundingClientRect()
    const cs = getComputedStyle(ar)
    return {
      flipUp: vp.classList.contains('flip-up'),
      arrowFlip: ar.classList.contains('flip-up'),
      // flip-up 箭头朝向：贴面板底边、尖朝下指触发器——rotate45 菱形用右下两描边边
      // （border-right + border-bottom）构成 ▼ chevron；非 rotate 矩阵或缺描边即方向错
      tipDown:
        cs.transform.includes('matrix') &&
        parseFloat(cs.borderRightWidth) > 0 &&
        parseFloat(cs.borderBottomWidth) > 0,
      // 面板在触发器上方；箭头应贴面板底边（顶部 ≥ 面板底-12，底部 ≤ 面板底+12）
      arrowAttachedToPanel: arR.top >= vr.bottom - 12 && arR.bottom <= vr.bottom + 12,
      // 箭头在触发器与面板之间（不悬空到面板另一侧之外）
      arrowOnTriggerSide: arR.bottom <= tr.top + 2,
      arrowXCentered: Math.abs((arR.left + arR.right) / 2 - (tr.left + tr.right) / 2) <= 2,
    }
  })
  expect(r.flipUp, '短视口应触发 flip-up').toBe(true)
  expect(r.arrowFlip, '箭头应镜像 flip-up 类').toBe(true)
  expect(r.tipDown, 'flip-up 箭头尖端应朝下（clip-path 含底边中点，不反装）').toBe(true)
  expect(r.arrowAttachedToPanel, '箭头应贴翻转后面板底边').toBe(true)
  expect(r.arrowOnTriggerSide, '箭头应在触发器一侧').toBe(true)
  expect(r.arrowXCentered, '箭头 X 向对准触发器中心').toBe(true)
})

// —— 缺陷回归：navigation-menu 箭头内缩面板（用户三连实测揪出） ——
// 曾现缺陷：箭头 clip-path 直角三角 top:calc(100%+space-1-1px) 高 6px——5px 埋在面板
// 内部、仅 1px 探出顶边，视觉上缩成面板里的小凹槽而非「从面板探出的箭头」。
// 修复：改 menubar 同款 rotate45 描边菱形、跨面板边缘悬置（探出侧指向宿主）。
test('navigation-menu 箭头跨面板边缘探出指向宿主（rotate45 悬置，不内缩面板）', async ({
  page,
}) => {
  await page.goto('/components/navigation-menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#nav-arrow')
  const r = await page.evaluate(async () => {
    const host = document.querySelector('#nav-arrow')!
    host.scrollIntoView({ block: 'center' })
    await new Promise((res) => setTimeout(res, 250))
    const trig = [...host.shadowRoot!.querySelectorAll<HTMLElement>('[aria-expanded]')][0]
    trig?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    await new Promise((res) => setTimeout(res, 600))
    const ar = host.shadowRoot!.querySelector('.arrow') as HTMLElement
    const vp = host.shadowRoot!.querySelector('.viewport') as HTMLElement
    const tr = trig!.getBoundingClientRect()
    const arR = ar.getBoundingClientRect()
    const vr = vp.getBoundingClientRect()
    const cs = getComputedStyle(ar)
    return {
      // 探出面板顶缘：箭头顶部必须在面板顶之上（跨边悬置，不内缩）
      protrudeAbove: arR.top < vr.top,
      protrudeAmount: Math.round(vr.top - arR.top),
      // rotate45 菱形形态（computed transform 为旋转矩阵，描边 chevron 指向宿主）
      isRotated: cs.transform.includes('matrix'),
      hasBorder: parseFloat(cs.borderTopWidth) > 0,
      panelBelowTrigger: vr.top > tr.bottom,
      arrowXCentered: Math.abs((arR.left + arR.right) / 2 - (tr.left + tr.right) / 2) <= 2,
    }
  })
  expect(r.protrudeAbove, '箭头应探出面板顶缘（跨边悬置，不内缩面板）').toBe(true)
  expect(r.protrudeAmount, '探出量应明显（≥3px）').toBeGreaterThanOrEqual(3)
  expect(r.isRotated, '箭头应为 rotate45 菱形').toBe(true)
  expect(r.hasBorder, '箭头应有描边 chevron 轮廓').toBe(true)
  expect(r.panelBelowTrigger, '面板应在触发器下方').toBe(true)
  expect(r.arrowXCentered, '箭头 X 向对准触发器中心').toBe(true)
})

// —— 缺陷回归：dropdown 箭头开合时序与面板错位 ——
// 曾现缺陷：开合动画只挂 oas-menu（fade+scale），箭头是兄弟节点无动画——
// 打开瞬间箭头先显（描边线先亮后融）、关闭时箭头原地留守慢一拍消失。
// 修复：箭头补与面板同时长的 fade（仅透明度），两端时序对齐。
test('dropdown 关闭过程箭头与面板透明度逐帧同步（不慢一拍消失）', async ({ page }) => {
  await page.goto('/components/dropdown.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-dropdown')
  await page.evaluate(() => {
    const h = document.querySelector('oas-dropdown')!
    h.scrollIntoView({ block: 'center' })
    ;(h.shadowRoot!.querySelector('button') as HTMLElement).click()
  })
  await page.waitForTimeout(400)
  // 触发关闭并多帧采样
  const samples = await page.evaluate(async () => {
    const h = document.querySelector('oas-dropdown')!
    const menu = h.shadowRoot!.querySelector('oas-menu')!
    const arrow = h.shadowRoot!.querySelector('.arrow')!
    const out: Array<{ menu: number; arrow: number }> = []
    document.body.click()
    for (let i = 0; i < 4; i++) {
      await new Promise((r) => setTimeout(r, 30))
      out.push({
        menu: parseFloat(getComputedStyle(menu).opacity),
        arrow: parseFloat(getComputedStyle(arrow).opacity),
      })
    }
    return out
  })
  // 关闭过程中至少有一帧处于淡出中（opacity 在 0~1 之间），且每帧箭头与面板同步
  const fading = samples.filter((s) => s.menu > 0 && s.menu < 1)
  expect(fading.length, '应采样到淡出过程帧').toBeGreaterThan(0)
  for (const s of fading) {
    expect(
      Math.abs(s.arrow - s.menu),
      '箭头与面板 opacity 应逐帧同步（差 ≤0.05）',
    ).toBeLessThanOrEqual(0.05)
  }
})

// —— 复核：tour 步骤推进流程（用户对「点下一步就消失」的反馈实测验证） ——
test('tour-basic 2 步流程：点下一步高亮移到区域二 + 按钮变完成 + 不消失，点完成才关闭', async ({
  page,
}) => {
  await page.goto('/components/tour.html', { waitUntil: 'networkidle' })
  await page.waitForSelector('#tour-basic', { state: 'attached', timeout: 15000 })
  await page.waitForFunction(() => document.querySelector('#tour-basic')?.shadowRoot != null, {
    timeout: 15000,
  })
  const step = async () =>
    page.evaluate(() => {
      const host = document.querySelector('#tour-basic')!
      const sr = host.shadowRoot!
      const hl = sr.querySelector('.highlight, [part=highlight]') as HTMLElement | null
      const popup = sr.querySelector('.popup, [part=popup]')
      const hlR = hl?.getBoundingClientRect()
      const b1 = document.querySelector('#tour-b1')?.getBoundingClientRect()
      const b2 = document.querySelector('#tour-b2')?.getBoundingClientRect()
      const near = (a: any, b: any) =>
        a && b && Math.abs(a.x - b.x) < 10 && Math.abs(a.y - b.y) < 10
      return {
        open: host.hasAttribute('open'),
        current: host.getAttribute('current'),
        onB1: near(hlR, b1),
        onB2: near(hlR, b2),
        popupText: popup ? popup.textContent!.replace(/\s+/g, ' ').slice(0, 30) : null,
        btnText: (sr.querySelector('[part=next]') as HTMLElement)?.textContent?.trim(),
      }
    })
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('oas-button')].find((x) =>
      /开始引导/.test(x.textContent),
    )!
    ;(btn as HTMLElement).click()
  })
  await page.waitForTimeout(500)
  const s1 = await step()
  expect(s1.open, '打开后 open').toBe(true)
  expect(s1.onB1, 'step1 高亮在区域一').toBe(true)
  // 点下一步
  await page.evaluate(() =>
    (
      document.querySelector('#tour-basic')!.shadowRoot!.querySelector('[part=next]') as HTMLElement
    ).click(),
  )
  await page.waitForTimeout(500)
  const s2 = await step()
  expect(s2.open, '点下一步后不应消失').toBe(true)
  expect(s2.current, '应推进到第 2 步').toBe('1')
  expect(s2.onB2, '点下一步后高亮应移到区域二').toBe(true)
  expect(s2.onB1, '不应还停留在区域一').toBe(false)
  expect(s2.btnText, '最后一步按钮应变「完成」').toBe('完成')
  // 点完成才关闭
  await page.evaluate(() =>
    (
      document.querySelector('#tour-basic')!.shadowRoot!.querySelector('[part=next]') as HTMLElement
    ).click(),
  )
  await page.waitForTimeout(400)
  const s3 = await step()
  expect(s3.open, '点完成后才关闭').toBe(false)
})

// —— 缺陷回归：tour 弹窗 pointer-events:none 致点击穿透遮罩误关（实测：点弹窗任意位置消失） ——
// 曾现缺陷：.overlay 是 pointer-events:none，.popup 未补 auto 继承 none → 整个弹窗点击透明，
// 真实鼠标点击穿透到下层遮罩（pointer-events:auto）触发 onMaskClick 关闭。
// 元素级 .click() 跳过命中测试会造成假通过——必须用真实鼠标点击（page.mouse，带命中测试）验证。
test('tour 弹窗可交互：真实鼠标点击弹窗内部不关闭（pointer-events 修复回归）', async ({ page }) => {
  await page.goto('/components/tour.html', { waitUntil: 'networkidle' })
  // tour 宿主关闭态零尺寸（overlay/popup display:none），up() 的 visible 判定不适用——用 attached + shadowRoot
  await page.waitForSelector('#tour-basic', { state: 'attached', timeout: 15000 })
  await page.waitForFunction(() => document.querySelector('#tour-basic')?.shadowRoot != null, {
    timeout: 15000,
  })
  await page.evaluate(() => {
    ;[...document.querySelectorAll<HTMLElement>('oas-button')]
      .find((x) => /开始引导/.test(x.textContent))!
      .click()
  })
  await page.waitForTimeout(500)
  const center = await page.evaluate(() => {
    const r = document
      .querySelector('#tour-basic')!
      .shadowRoot!.querySelector('.popup')!
      .getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  })
  // 真实鼠标点击弹窗中心（带 pointerdown + 命中测试）
  await page.mouse.click(center.x, center.y)
  await page.waitForTimeout(400)
  const open = await page.evaluate(() =>
    document.querySelector('#tour-basic')!.hasAttribute('open'),
  )
  expect(open, '真实点击弹窗内部不应关闭（pointer-events 须为 auto）').toBe(true)
})

// —— 缺陷回归：tour append-to portal host display:none 致浮层 0×0 不可见（实测：点了没反应） ——
// 曾现缺陷：ensurePortal 镜像 data-open 属性，但共享 STYLE 的 :host([open]) 显示门控只认 open
// 属性——portal host（普通 div，只有 data-open）不命中 → display:none，浮层全 0×0 不可见。
// 修复：host 显示规则同时认 [open] 与 [data-open]。
test('tour append-to=body：portal host 显示 + 弹窗非零尺寸 + 高亮框住挂载目标', async ({
  page,
}) => {
  await page.goto('/components/tour.html', { waitUntil: 'networkidle' })
  await page.waitForSelector('#tour-portal', { state: 'attached', timeout: 15000 })
  await page.waitForFunction(() => document.querySelector('#tour-portal')?.shadowRoot != null, {
    timeout: 15000,
  })
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll<HTMLElement>('oas-button')].find((x) =>
      /append-to body/.test(x.textContent),
    )!
    btn.scrollIntoView({ block: 'center' })
    btn.click()
  })
  await page.waitForTimeout(800)
  const r = await page.evaluate(() => {
    const ph = [...document.body.children].find(
      (c) => c.shadowRoot && c.shadowRoot.querySelector('.popup'),
    )
    if (!ph) return { noPortal: true }
    const sr = ph.shadowRoot!
    const popup = sr.querySelector('.popup')!
    const hl = sr.querySelector('.highlight')
    const target = document.querySelector('#tour-pp1')!
    const rect = (el: Element) => {
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    }
    const pr = rect(popup)
    const hr = hl ? rect(hl) : null
    const tr = rect(target)
    return {
      hostDisplay: getComputedStyle(ph).display,
      popupW: pr.w,
      popupH: pr.h,
      hlOnTarget: hr ? Math.abs(hr.x - tr.x) < 12 && Math.abs(hr.y - tr.y) < 12 : false,
    }
  })
  expect(r.hostDisplay, 'portal host 应显示').not.toBe('none')
  expect(r.popupW, '弹窗应有宽度').toBeGreaterThan(50)
  expect(r.popupH, '弹窗应有高度').toBeGreaterThan(20)
  expect(r.hlOnTarget, '高亮应框住挂载目标').toBe(true)
})

// —— 缺陷回归：tour typewriter 布尔属性误判致打字机不生效（实测：没看到逐字效果） ——
// 曾现缺陷：typewriter 是 opt-in 布尔属性，getAttribute 对无值布尔返回 ''，检查
// getAttr('typewriter')!=='true' 把布尔写法误判为关（''!=='true' → 跳过打字机全量赋值）。
// 修复：改 hasAttr + getAttr(...)!=='false' 判定。
test('tour typewriter：描述逐字增长（非一次性全显示）', async ({ page }) => {
  await page.goto('/components/tour.html', { waitUntil: 'networkidle' })
  await page.waitForSelector('#tour-tw', { state: 'attached', timeout: 15000 })
  await page.waitForFunction(() => document.querySelector('#tour-tw')?.shadowRoot != null, {
    timeout: 15000,
  })
  const samples = await page.evaluate(async () => {
    const btn = [...document.querySelectorAll<HTMLElement>('oas-button')].find(
      (x) =>
        /开始引导/.test(x.textContent) &&
        x.closest('.demo-block')?.textContent.includes('打字机动画'),
    )!
    const host = document.querySelector('#tour-tw')!
    btn.scrollIntoView({ block: 'center' })
    btn.click()
    const desc = () => host.shadowRoot!.querySelector('[part="desc"]')!.textContent ?? ''
    const out: number[] = []
    for (let i = 0; i < 5; i++) {
      out.push(desc().length)
      await new Promise((r) => setTimeout(r, 150))
    }
    return out
  })
  // 逐字增长：长度应随时间递增（非一开始就满长）
  expect(samples[0]!, '初始应未显示完整').toBeLessThan(samples[samples.length - 1]!)
  const increasing = samples.every((v, i) => i === 0 || v >= (samples[i - 1] ?? 0))
  expect(increasing, '描述长度应单调递增（逐字出现）').toBe(true)
})

// —— 缺陷回归：tour 首次打开目标在视口外时弹窗闪现错位 ——
// 曾现缺陷：目标初始在视口外，position() 按错位目标位置算「安全兜底位」显示弹窗，
// scrollToTarget 平滑滚动期间弹窗卡在错位处（长滚动时明显），滚动末尾才跳正——「首次点击错位」。
// 修复：目标需滚动进视口时弹窗进入「定位待定」（opacity 0 隐藏），scrollend/定位正确后显示。
test('tour 目标在视口外首次打开：滚动期间弹窗隐藏（不闪现错位），滚动停止后正确显示', async ({
  page,
}) => {
  await page.goto('/components/tour.html', { waitUntil: 'networkidle' })
  await page.waitForSelector('#tour-interact', { state: 'attached', timeout: 15000 })
  await page.waitForFunction(() => document.querySelector('#tour-interact')?.shadowRoot != null, {
    timeout: 15000,
  })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(200)
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll<HTMLElement>('oas-button')].find(
      (x) => x.textContent.trim() === '高亮区可交互',
    )!
    btn.click()
  })
  // 采样滚动期间弹窗隐藏 + 停止后正确显示
  const samples = await page.evaluate(async () => {
    const host = document.querySelector('#tour-interact')!
    const popup = host.shadowRoot!.querySelector('.popup') as HTMLElement
    const out: Array<{ pending: boolean; opacity: number; placement: string | null }> = []
    for (let k = 0; k < 12; k++) {
      out.push({
        pending: popup.classList.contains('oas-tour-pending'),
        opacity: parseFloat(getComputedStyle(popup).opacity),
        placement: popup.getAttribute('data-placement'),
      })
      await new Promise((r) => setTimeout(r, 150))
    }
    return out
  })
  // 滚动期间弹窗应隐藏（pending 或 opacity 0 / placement null）
  const duringScroll = samples.filter((s) => s.pending)
  expect(duringScroll.length, '滚动期间应有定位待定(隐藏)的帧').toBeGreaterThan(0)
  for (const s of duringScroll) {
    expect(s.opacity, '滚动期间弹窗应近透明(隐藏，不在错位处闪现)').toBeLessThan(0.1)
  }
  // 滚动停止后弹窗应正确显示（placement 已设、opacity 1）
  const settled = samples[samples.length - 1]!
  expect(settled.opacity, '滚动停止后弹窗显示').toBe(1)
  expect(settled.placement, '滚动停止后 placement 已设').not.toBeNull()
  expect(settled.pending, '滚动停止后不再待定').toBe(false)
})

// —— 缺陷回归：oas-splitter + sidebar 拖拽调宽（实测真缺陷） ——
// 曾现缺陷：demo 用内联 style="--oas-sidebar-width: 100%" 想让 sidebar 填满 splitter 左面板，
// 但 sidebar update() 在无 width 属性时会 removeProperty('--oas-sidebar-width')——内联变量被清、
// sidebar 回落 220px 固定宽，被 22% 窄面板遮住（宽度不随拖拽变化）。修复：demo 改用 width="100%"
// 属性（update 保留并写入）。本断言真实拖拽分割条，验证 sidebar 宽度实时跟随面板变化。
test('oas-splitter + sidebar：拖拽分割条 sidebar 宽度实时跟随（不被窄面板遮住）', async ({
  page,
}) => {
  await page.goto('/components/sidebar.html', { waitUntil: 'domcontentloaded' })
  // 等 splitter 与其内部 sidebar 升级
  await page.waitForFunction(
    () => {
      const sp = document.querySelector('oas-splitter')
      const sb = sp?.querySelector('oas-sidebar')
      return sp?.shadowRoot != null && sb?.shadowRoot != null
    },
    undefined,
    { timeout: 15000 },
  )
  const r = await page.evaluate(async () => {
    const sp = document.querySelector('oas-splitter')!
    const sb = sp.querySelector('oas-sidebar')! as HTMLElement
    sp.scrollIntoView({ block: 'center' })
    await new Promise((res) => setTimeout(res, 300))
    const handle = sp.shadowRoot!.querySelector('[part="splitter"]') as HTMLElement
    const rect = handle.getBoundingClientRect()
    const cx = rect.x + rect.width / 2
    const cy = rect.y + rect.height / 2
    const w0 = Math.round(sb.getBoundingClientRect().width)
    const inlineVar0 = sb.style.getPropertyValue('--oas-sidebar-width')
    handle.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy, button: 0 }),
    )
    const widths: number[] = []
    for (let i = 1; i <= 4; i++) {
      document.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, clientX: cx + i * 30, clientY: cy }),
      )
      await new Promise((res) => setTimeout(res, 60))
      widths.push(Math.round(sb.getBoundingClientRect().width))
    }
    document.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, clientX: cx + 120, clientY: cy }),
    )
    return { w0, widths, inlineVar0, percentAfter: sp.getAttribute('percent') }
  })
  // width="100%" 属性存活（update 不清除），sidebar 填满左面板
  expect(r.inlineVar0, 'sidebar 应保留 width=100%（不被 update 清掉）').toBe('100%')
  // 左面板 22%（splitter 宽 638 级），sidebar 不应是默认 220px 固定宽被遮住
  expect(r.w0, 'sidebar 初宽应≈左面板宽（220px 以下，非固定 220px 被遮）').toBeLessThan(220)
  // 拖拽中宽度实时变化且单调递增
  expect(r.widths.length, '拖拽采样应有宽度读数').toBeGreaterThan(0)
  const finalW = r.widths[r.widths.length - 1]!
  expect(finalW, '拖拽后 sidebar 应变宽').toBeGreaterThan(r.w0)
  const mono = r.widths.every((w, i) => i === 0 || w >= r.widths[i - 1]!)
  expect(mono, '拖拽过程宽度应单调不减小').toBe(true)
  expect(r.percentAfter, 'percent 应随拖拽增大').not.toBe('22')
})

// —— 缺陷回归：sidebar resizable 边缘拖拽调宽（内置 rail 形态） ——
// 设计定夺：拖拽调宽内置（resizable rail）优于 splitter 组合（组合有 width="100%" 写法
// 门槛 + 强制 split-pane 布局）。本断言真实拖拽 rail 边缘，验证宽度实时跟随并写回 width 属性。
test('sidebar resizable：拖拽 rail 边缘宽度实时跟随并写回 width 属性（内置 rail）', async ({
  page,
}) => {
  await page.goto('/components/sidebar.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => document.querySelector('#sidebar-resizable')?.shadowRoot != null,
    undefined,
    { timeout: 15000 },
  )
  const r = await page.evaluate(async () => {
    const sb = document.querySelector('#sidebar-resizable') as HTMLElement
    sb.scrollIntoView({ block: 'center' })
    await new Promise((res) => setTimeout(res, 300))
    const rail = sb.shadowRoot!.querySelector('[part="rail"]') as HTMLElement
    const rect = rail.getBoundingClientRect()
    const cx = rect.x + rect.width / 2
    const cy = rect.y + rect.height / 2
    const w0 = Math.round(sb.getBoundingClientRect().width)
    rail.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy, button: 0 }),
    )
    const widths: number[] = []
    for (let i = 1; i <= 3; i++) {
      document.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, clientX: cx + i * 30, clientY: cy }),
      )
      await new Promise((res) => setTimeout(res, 60))
      widths.push(Math.round(sb.getBoundingClientRect().width))
    }
    document.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, clientX: cx + 90, clientY: cy }),
    )
    await new Promise((res) => setTimeout(res, 200))
    return {
      w0,
      widths,
      widthAttr: sb.getAttribute('width'),
      logText: document.getElementById('sidebar-resize-log')?.textContent ?? '',
      railHidden: rail.hidden,
    }
  })
  expect(r.railHidden, 'resizable 态 rail 应显示').toBe(false)
  expect(r.w0, '初始宽度应为 220（width 属性值）').toBe(220)
  expect(r.widths.length, '拖拽采样应有宽度读数').toBe(3)
  const mono = r.widths.every((w, i) => i === 0 || w > r.widths[i - 1]!)
  expect(mono, '拖拽过程宽度应单调递增').toBe(true)
  expect(r.widths[2], '拖拽后宽度应增大').toBeGreaterThan(r.w0)
  expect(r.widthAttr, '拖拽应写回 width 属性').toBe(`${r.widths[2]}px`)
  expect(r.logText, 'oas-resize 事件应更新 demo 日志').toContain(`${r.widths[2]}px`)
})
// —— 缺陷回归：sidebar 嵌套子菜单 label 缩进对齐（不得与父项齐平/更靠左） ——
// 曾现缺陷：嵌套无图标项 icon 占位被 hidden 折叠，子项 label 与父项 label 齐平甚至偏左
//（实测子 label 比父 label 左 3px），层级错乱。修复：嵌套无图标项保留图标占位（24px），
// 子项 label 缩进父项 label 右侧。本断言真布局测量 label x 坐标。
test('sidebar 嵌套子菜单：无图标子项 label 缩进父项 label 右侧（层级不错乱）', async ({ page }) => {
  await page.goto('/components/sidebar.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => document.querySelector('oas-sidebar[active="users"]')?.shadowRoot != null,
    undefined,
    { timeout: 15000 },
  )
  const r = await page.evaluate(() => {
    const sb = document.querySelector('oas-sidebar[active="users"]')!
    const items = [...sb.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')]
    const parent = items.find((i) => i.dataset.value === 'biz')!
    const child = items.find((i) => i.dataset.value === 'orders')!
    const parentLabelX = parent.querySelector('.label')!.getBoundingClientRect().left
    const childLabelX = child.querySelector('.label')!.getBoundingClientRect().left
    const childIcon = child.querySelector('.icon') as HTMLElement
    return {
      parentLabelX: Math.round(parentLabelX),
      childLabelX: Math.round(childLabelX),
      indent: Math.round(childLabelX - parentLabelX),
      childIconHidden: childIcon.hidden,
      childIconWidth: Math.round(childIcon.getBoundingClientRect().width),
    }
  })
  expect(r.childIconHidden, '嵌套无图标项图标占位不应隐藏').toBe(false)
  expect(r.childIconWidth, '嵌套图标占位应保留宽度').toBeGreaterThan(0)
  expect(r.indent, '子项 label 应缩进父项 label 右侧（不得齐平/更靠左）').toBeGreaterThan(0)
})
test('layout viewport：高度锁定 + 侧栏/内容各自独立滚动 + 顶栏不随内容动（实测缺陷回归）', async ({
  page,
}) => {
  await page.goto('/components/layout.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => document.querySelector('#layout-viewport')?.shadowRoot != null,
    undefined,
    { timeout: 15000 },
  )
  const r = await page.evaluate(() => {
    const layout = document.querySelector('#layout-viewport')!
    const sr = layout.shadowRoot!
    const contentPart = sr.querySelector('.content-part') as HTMLElement
    const header = document.querySelector('#layout-viewport > [slot="header"]')!
    const siderPart = sr.querySelector('.sider-part') as HTMLElement
    const sb = document.querySelector('#layout-viewport-sidebar') as HTMLElement
    const sbPanel = sb.shadowRoot!.querySelector('.panel') as HTMLElement
    const before = header.getBoundingClientRect().top
    contentPart.scrollTop = 120
    const after = header.getBoundingClientRect().top
    return {
      layoutHeight: Math.round(layout.getBoundingClientRect().height),
      contentScrollable: contentPart.scrollHeight > contentPart.clientHeight,
      contentScrolled: contentPart.scrollTop === 120,
      headerStill: Math.abs(after - before) < 1,
      siderOverflow: getComputedStyle(siderPart).overflowY,
      sbPanelScrollable: sbPanel.scrollHeight > sbPanel.clientHeight,
    }
  })
  expect(r.layoutHeight, '--oas-layout-height 锁定的布局高度不应被内容撑高').toBe(320)
  expect(r.contentScrollable, '内容区应可独立滚动').toBe(true)
  expect(r.contentScrolled, '内容区滚动应生效').toBe(true)
  expect(r.headerStill, '滚动内容时顶栏应保持不动').toBe(true)
  expect(['auto', 'scroll']).toContain(r.siderOverflow)
  expect(r.sbPanelScrollable, '内嵌 sidebar panel 应在侧栏内独立滚动').toBe(true)
})

test('sider 内嵌 sidebar 宽度自动对齐：填满轨道而非自身默认宽（实测缺陷回归）', async ({
  page,
}) => {
  await page.goto('/components/layout.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => document.querySelector('#layout-viewport-sidebar')?.shadowRoot != null,
    undefined,
    { timeout: 15000 },
  )
  const r = await page.evaluate(() => {
    const layout = document.querySelector('#layout-viewport') as HTMLElement
    const sider = layout.querySelector('oas-sider') as HTMLElement
    const sb = document.querySelector('#layout-viewport-sidebar') as HTMLElement
    const w1 = { sider: sider.getBoundingClientRect().width, sb: sb.getBoundingClientRect().width }
    return { w1 }
  })
  // 走真实路径折叠：点击 sidebar 折叠按钮 → oas-collapse → sider 联动（属性直设=受控不派事件）
  await page.evaluate(() => {
    const sb = document.querySelector('#layout-viewport-sidebar') as HTMLElement
    const toggle = sb.shadowRoot!.querySelector('[part="toggle"]') as HTMLElement
    toggle.click()
  })
  await page.waitForTimeout(300) // 等 width transition（180ms）
  const r2 = await page.evaluate(() => {
    const layout = document.querySelector('#layout-viewport') as HTMLElement
    const sider = layout.querySelector('oas-sider') as HTMLElement
    const sb = document.querySelector('#layout-viewport-sidebar') as HTMLElement
    return { sider: sider.getBoundingClientRect().width, sb: sb.getBoundingClientRect().width }
  })
  expect(Math.round(r.w1.sider), '轨道宽应为默认 200').toBe(200)
  expect(Math.round(r.w1.sb), '内嵌 sidebar 应填满轨道（200）而非自身默认 220').toBe(200)
  expect(Math.round(r2.sider), '折叠后轨道宽应联动为 64').toBe(64)
  expect(Math.round(r2.sb), '折叠时内嵌 sidebar 应跟随 64').toBe(64)
})

test('sidebar 嵌套父项点击折叠子菜单：hidden 真实隐藏（grid 0fr + visibility 动画机制，真实视觉断言）', async ({
  page,
}) => {
  // 历史根因：.submenu{display:flex} 作者级规则压过 UA [hidden]{display:none}（只改属性不改渲染）；
  // 现行机制：grid-template-rows 0fr/1fr 平滑过渡 + visibility 联动（收起时出渲染树防聚焦）。
  // 本断言量 computed visibility 与高度（真实视觉），不是只查 hidden 属性。
  await page.goto('/components/sidebar.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => document.querySelector('#sidebar-decl')?.shadowRoot != null,
    undefined,
    { timeout: 15000 },
  )
  const r = await page.evaluate(async () => {
    const host = document.getElementById('sidebar-decl') as HTMLElement
    const biz = [...host.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')].find(
      (i) => i.dataset.value === 'biz',
    )!
    const sub = () => host.shadowRoot!.querySelector('[part="submenu"]') as HTMLElement
    const visibility = () => getComputedStyle(sub()).visibility
    const before = { aria: biz.getAttribute('aria-expanded'), visibility: visibility() }
    biz.click()
    await new Promise((r2) => setTimeout(r2, 500))
    const afterClick = {
      aria: biz.getAttribute('aria-expanded'),
      visibility: visibility(),
      rectH: Math.round(sub().getBoundingClientRect().height),
    }
    biz.click()
    await new Promise((r2) => setTimeout(r2, 500))
    const afterReclick = {
      aria: biz.getAttribute('aria-expanded'),
      visibility: visibility(),
      rectH: Math.round(sub().getBoundingClientRect().height),
    }
    return { before, afterClick, afterReclick }
  })
  expect(r.before.aria).toBe('true') // 激活子项自动展开
  expect(r.before.visibility).toBe('visible')
  expect(r.afterClick.aria, '点击后 aria-expanded 应收起').toBe('false')
  // grid 0fr + visibility 动画机制（平滑过渡）：收起后 visibility:hidden + 高度 0（真实视觉隐藏且防聚焦）
  expect(r.afterClick.visibility, '点击后子菜单应 visibility:hidden（真实视觉隐藏）').toBe('hidden')
  expect(r.afterClick.rectH, '隐藏后子菜单高度应为 0').toBe(0)
  expect(r.afterReclick.aria, '再点应重新展开').toBe('true')
  expect(r.afterReclick.visibility).toBe('visible')
  expect(r.afterReclick.rectH, '再展开后子菜单高度应恢复').toBeGreaterThan(0)
})
