// 复核回归：select——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

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
