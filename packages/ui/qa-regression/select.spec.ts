// 复核回归：select——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { panelGeometryAcrossOpens, up } from './helpers'

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

test('select 展开态 active 选项在暗色主题下文字/背景对比度 ≥ 4.5（on-primary token）', async ({ page }) => {
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
    return vlist != null && !vlist.hidden && (vlist.shadowRoot?.querySelectorAll('[role="option"]').length ?? 0) > 0
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

test('select virtual：键盘导航高亮项滚动进视口且 aria-activedescendant 指向可见项', async ({ page }) => {
  await page.goto('/components/select.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#select-virtual')
  const sel = page.locator('#select-virtual')
  await sel.locator('[part="trigger"]').click()
  await page.waitForFunction(() => {
    const s = document.querySelector('#select-virtual')
    const vlist = s?.shadowRoot?.querySelector('oas-virtual-list') as HTMLElement | null
    return vlist != null && !vlist.hidden && (vlist.shadowRoot?.querySelectorAll('[role="option"]').length ?? 0) > 0
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

test('select 触发器 chevron：路径为规范 V 形（曾写坏成乱纹，v2.5.1–v2.5.4 带病发布）', async ({ page }) => {
  // 曾现 bug：内联 chevron 的 path 被写成 `M4 6 L8 10 L12 6 L4 12`（标准 V 形后多一段回折线），
  // 触发器的下拉箭头渲染成乱纹。visual.spec 只截图不做基线比对，故此缺陷躲过全部自动门禁。
  await page.goto('/components/select.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-select')
  const chevron = await page
    .locator('oas-select')
    .first()
    .evaluate((el) => {
      const svg = el.shadowRoot!.querySelector('.chevron')
      return { exists: !!svg, d: svg?.querySelector('path')?.getAttribute('d') ?? null }
    })
  expect(chevron.exists, '触发器应含 .chevron 图标').toBe(true)
  expect(chevron.d, 'chevron 应为规范 V 形路径').toBe('M4 6 L8 10 L12 6')
})

// 移动端专项：bottom-sheet 底部抽屉承载（data-mobile-sheet 标记 + sheet open + dropdown 静态化 + oas-close 同步收起）
test('select 移动端：底部抽屉贴视口底展开 + dropdown 静态化 + 点遮罩同步收起', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  try {
    await page.goto('/components/select.html', { waitUntil: 'domcontentloaded' })
    await up(page, 'oas-select')
    const host = page.locator('oas-select').first()
    await expect(host).toHaveAttribute('data-mobile-sheet', '')
    await host.locator('[part="trigger"]').click()
    await page.waitForFunction(
      () => {
        const root = document.querySelector('oas-select')!.shadowRoot!
        return root.querySelector('[part="dropdown"]')!.classList.contains('open')
      },
      null,
      { timeout: 5000 },
    )
    // 等底部抽屉升起动画落定（transform 收敛、面板贴视口底）后再量几何，避免量到动画中途
    await page.waitForFunction(
      () => {
        const root = document.querySelector('oas-select')!.shadowRoot!
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
    expect(info.options, '抽屉内选项应可交互').toBeGreaterThan(0)
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

test('select 浮层定位：首开左缘对齐 trigger 且与再开一致', async ({ page }) => {
  // 曾现 bug：positionDropdown 先用面板固有宽度（选项文字 ~72px）按 bottom(center) 算 left，
  // 之后才把 style.width 撑到 trigger 宽度 → 首开左缘偏右（实测 +74px），再开（内联宽度已在）才对齐。
  // 不变量：面板左缘 == trigger 左缘，且首开/再开完全一致。
  await page.goto('/components/select.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-select')
  const g = await panelGeometryAcrossOpens(page, 'oas-select', async (host) => {
    await host.locator('[part="trigger"]').click()
  })
  expect(Math.abs(g.first.left - g.first.anchorLeft)).toBeLessThanOrEqual(1)
  expect(Math.abs(g.first.left - g.second.left)).toBeLessThanOrEqual(1)
})

// ---- 能力缺口 P1：label / variant ----

test('select variant：三态 data-variant 镜像（默认 outlined；filled/borderless 生效）且底色有区分', async ({
  page,
}) => {
  await page.goto('/components/select.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-select[variant="filled"]')
  const r = await page.evaluate(() => {
    const trigBg = (sel: string) => {
      const el = document.querySelector(sel) as HTMLElement | null
      if (!el) return null
      return getComputedStyle(el.shadowRoot!.querySelector('[part="trigger"]')!).backgroundColor
    }
    return {
      filled: document.querySelector('oas-select[variant="filled"]')!.getAttribute('data-variant'),
      borderless: document.querySelector('oas-select[variant="borderless"]')!.getAttribute('data-variant'),
      def: document.querySelector('oas-select')!.getAttribute('data-variant'),
      filledBg: trigBg('oas-select[variant="filled"]'),
      borderlessBg: trigBg('oas-select[variant="borderless"]'),
    }
  })
  expect(r.filled).toBe('filled')
  expect(r.borderless).toBe('borderless')
  expect(r.def).toBe('outlined')
  // filled 有填充底色、borderless 透明——视觉形态真实落到 computed style
  expect(r.filledBg).not.toBe('rgba(0, 0, 0, 0)')
  expect(r.borderlessBg).toBe('rgba(0, 0, 0, 0)')
})

test('select label：trigger aria-label 取 label 属性（优先于 placeholder），无 label 回落 placeholder', async ({
  page,
}) => {
  await page.goto('/components/select.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#select-label-set')
  const r = await page.evaluate(() => ({
    set: document
      .querySelector('#select-label-set')!
      .shadowRoot!.querySelector('[part="trigger"]')!
      .getAttribute('aria-label'),
    fallback: document
      .querySelector('#select-label-fallback')!
      .shadowRoot!.querySelector('[part="trigger"]')!
      .getAttribute('aria-label'),
  }))
  expect(r.set).toBe('所属城市')
  expect(r.fallback).toBe('无 label，回退占位文本')
})

// ---- 能力缺口 P2：长尾组 ----

test('select show-arrow / suffix-icon / clear-icon：默认箭头可隐藏，模板图标替换 chevron 与清空图标', async ({
  page,
}) => {
  await page.goto('/components/select.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#select-no-arrow')
  const r = await page.evaluate(() => {
    const read = (id: string) => {
      const el = document.querySelector(id)!
      const root = el.shadowRoot!
      const trigger = root.querySelector('[part="trigger"]')!
      const box = trigger.querySelector<HTMLElement>('.suffix-icon')!
      const clearBox = root.querySelector<HTMLElement>('.clear-btn .clear-icon')!
      return {
        chevronHidden: trigger.querySelector('.chevron')!.hasAttribute('hidden'),
        iconVisible: !box.hidden,
        iconHtml: box.innerHTML,
        clearHtml: clearBox.innerHTML,
      }
    }
    return { noArrow: read('#select-no-arrow'), icons: read('#select-icons-demo') }
  })
  // show-arrow="false"：默认箭头隐藏（hidden attribute，svg 无 hidden IDL）
  expect(r.noArrow.chevronHidden).toBe(true)
  // suffix-icon 模板：chevron 隐藏、自定义图标克隆进容器；clear-icon 替换默认 ×
  expect(r.icons.chevronHidden).toBe(true)
  expect(r.icons.iconVisible).toBe(true)
  expect(r.icons.iconHtml).toContain('⌄')
  expect(r.icons.clearHtml).toContain('✕')
})

test('select input-value 写回 + allow-create 创建派发 oas-create，demo 反馈可见', async ({ page }) => {
  await page.goto('/components/select.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#select-input-value')
  // input-value：输入写回属性 + demo 输出回显（真实链路：打开面板 → 输入 → 事件 → 输出）
  await page.evaluate(() => {
    const el = document.querySelector('#select-input-value')!
    el.shadowRoot!.querySelector('[part="trigger"]')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }),
    )
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('.search-input')!
    input.value = '苹'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForFunction(() => {
    const el = document.querySelector('#select-input-value')!
    const out = document.getElementById('select-input-value-output')?.textContent ?? ''
    return el.getAttribute('input-value') === '苹' && out.includes('苹')
  })
  // allow-create：创建行点击 → oas-create → 输出更新
  await up(page, '#select-create')
  await page.evaluate(() => {
    const el = document.querySelector('#select-create')!
    el.shadowRoot!.querySelector('[part="trigger"]')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }),
    )
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('.search-input')!
    input.value = '榴莲'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    el.shadowRoot!.querySelector<HTMLElement>('.create-option')!.click()
  })
  await page.waitForFunction(() =>
    (document.getElementById('select-create-output')?.textContent ?? '').includes('榴莲'),
  )
})

// ---- 能力缺口 D20：hide-selected ----

test('select hide-selected：多选已选项从下拉隐藏、取消后回到列表、demo 反馈可见', async ({ page }) => {
  await page.goto('/components/select.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#select-hide-selected')
  const host = page.locator('#select-hide-selected')
  await host.scrollIntoViewIfNeeded()
  // hide-selected 属性在 Vue demo 中存活（不被剥离）
  await expect(host).toHaveAttribute('hide-selected', '')
  await host.locator('[part="trigger"]').click()
  await page.waitForFunction(() => {
    const s = document.querySelector('#select-hide-selected')!
    return s.shadowRoot!.querySelectorAll('[role="option"]').length === 4
  })
  // 选中苹果 → 从下拉隐藏（剩 3 项），demo 输出回显剩余数
  await host.locator('[role="option"]').first().click()
  await page.waitForFunction(() => {
    const s = document.querySelector('#select-hide-selected')!
    return s.shadowRoot!.querySelectorAll('[role="option"]').length === 3
  })
  const value = await host.getAttribute('value')
  expect(JSON.parse(value!)).toEqual(['apple'])
  await expect(page.locator('#select-hide-selected-output')).toContainText('3 项')
  // clearable 清空 → 全部回到列表
  await host.locator('[part="clear"]').click()
  await page.waitForFunction(() => {
    const s = document.querySelector('#select-hide-selected')!
    return s.shadowRoot!.querySelectorAll('[role="option"]').length === 4
  })
  await expect(page.locator('#select-hide-selected-output')).toContainText('4 项')
})

test('select reserve-width：锁宽生效且真切换选中值后触发器宽度不抖', async ({ page }) => {
  await page.goto('/components/select.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sel-reserve')
  const locked = await page
    .locator('#sel-reserve')
    .evaluate((node) => node.style.getPropertyValue('--oas-select-reserve'))
  expect(locked).toMatch(/^[\d.]+px$/)
  // 对照（无预留）：变量不存在
  const control = await page
    .locator('#sel-narrow')
    .evaluate((node) => node.style.getPropertyValue('--oas-select-reserve'))
  expect(control).toBe('')
  // 真切换：点开下拉选中最宽选项（两端对齐并自动换行）→ 触发器宽度由锁宽托底不抖
  const widthBefore = await page.locator('#sel-reserve').evaluate((node) => node.getBoundingClientRect().width)
  await page.locator('#sel-reserve').locator('.trigger').click()
  await page.locator('#sel-reserve').locator('.option', { hasText: '两端对齐并自动换行' }).click()
  await expect
    .poll(() => page.locator('#sel-reserve').evaluate((node) => node.getAttribute('value')), { timeout: 3000 })
    .toBe('c')
  const widthAfter = await page.locator('#sel-reserve').evaluate((node) => node.getBoundingClientRect().width)
  expect(Math.abs(widthAfter - widthBefore)).toBeLessThanOrEqual(1)
// 回归（二轮 review）：多选无 name 不注入空名 entry——FormData 通道由组件自建 entry，
// 不受浏览器「无 name 不提交」兜底保护，须显式拦下（对齐 combobox 同款拦截）。
// 用真实 <form> + FormData(form) 收集，走浏览器 FACE 原生提交链路验证。
test('select 多选无 name：真实 FormData 收集零 entry（不出现空名 entry 污染）', async ({ page }) => {
  await page.goto('/components/select.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-select[multiple]')
  const r = await page.evaluate(() => {
    const build = (name?: string) => {
      const el = document.createElement('oas-select')
      el.setAttribute('multiple', '')
      if (name) el.setAttribute('name', name)
      el.setAttribute('value', '["apple","banana"]')
      const form = document.createElement('form')
      form.appendChild(el)
      document.body.appendChild(form)
      return form
    }
    const named = build('tags')
    const nameless = build()
    return {
      named: [...new FormData(named).entries()],
      nameless: [...new FormData(nameless).entries()],
    }
  })
  expect(r.named, '有 name → 同名多条 entry').toEqual([
    ['tags', 'apple'],
    ['tags', 'banana'],
  ])
  expect(r.nameless, '无 name → 零 entry（不出现 ["", "apple"] 空名污染）').toEqual([])
})

// 回归（二轮 review）：多选无 name + required + 有选中不误报 valueMissing——
// 校验按选中集判定，不按 FormData null（无 name 时 getFormValue 恒 null 的连带坑）。
test('select 多选无 name + required + 有选中：不误报 valueMissing（checkValidity 通过）', async ({ page }) => {
  await page.goto('/components/select.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-select[multiple]')
  const r = await page.evaluate(() => {
    const el = document.createElement('oas-select')
    el.setAttribute('multiple', '')
    el.setAttribute('required', '')
    el.setAttribute('value', '["apple"]')
    document.body.appendChild(el)
    return new Promise<{ valid: boolean; emptyValid: boolean }>((resolve) => {
      requestAnimationFrame(() => {
        const face = el as HTMLElement & { checkValidity(): boolean }
        const valid = face.checkValidity()
        el.setAttribute('value', '[]')
        requestAnimationFrame(() => resolve({ valid, emptyValid: face.checkValidity() }))
      })
    })
  })
  expect(r.valid, '有选中（无 name）→ 校验通过').toBe(true)
  expect(r.emptyValid, '清空后 → valueMissing 生效').toBe(false)
})
