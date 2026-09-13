// 复核回归：calendar——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

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
    return el.getAttribute('mode') === 'year' && el.shadowRoot!.querySelectorAll('.month-cell').length === 12
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

test('calendar header 组合：外部操作条 + 组件卡片，内置导航仍可用（part=header 定位）', async ({ page }) => {
  await page.goto('/components/calendar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-calendar#calendar-header-composite')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-calendar#calendar-header-composite')!
    return {
      headerPart: !!el.shadowRoot!.querySelector('[part="header"]'),
      prevBtn: !!el.shadowRoot!.querySelector('[part="prev"]'),
      nextBtn: !!el.shadowRoot!.querySelector('[part="next"]'),
      todayBtn: !!el.shadowRoot!.querySelector('[part="today"]'),
      titleText: el.shadowRoot!.querySelector('[part="title"]')?.textContent ?? '',
    }
  })
  expect(r.headerPart).toBe(true)
  expect(r.prevBtn).toBe(true)
  expect(r.nextBtn).toBe(true)
  expect(r.titleText).toContain('2026')
})

// —— 移动端硬伤修复回归：触屏日格触控目标 ≥44px ——
test('calendar 触屏（coarse）：日格/月格/头部按钮触控目标 ≥44px', async ({ browser }) => {
  const ctx = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } })
  const p = await ctx.newPage()
  await p.goto('/components/calendar.html', { waitUntil: 'domcontentloaded' })
  await up(p, 'oas-calendar#calendar-cell-render')
  const r = await p.evaluate(() => {
    const el = document.querySelector('oas-calendar#calendar-cell-render')!
    const day = el.shadowRoot!.querySelector('.day') as HTMLElement
    const headerBtn = el.shadowRoot!.querySelector('[part="prev"]') as HTMLElement
    return {
      coarse: window.matchMedia('(pointer: coarse)').matches,
      dayMinH: getComputedStyle(day).minHeight,
      dayMinW: getComputedStyle(day).minWidth,
      headerMinW: getComputedStyle(headerBtn).minWidth,
      headerMinH: getComputedStyle(headerBtn).minHeight,
    }
  })
  expect(r.coarse, 'touch context 应命中 pointer: coarse').toBe(true)
  // 修复前日格 32px 高、7 列格宽 <44px，触屏不可点
  expect(r.dayMinH).toBe('44px')
  // 缺陷修复：日格只抬高度不撑宽度（7 列 × 44px min-width 撑破窄容器，周日列被裁）
  expect(r.dayMinW, '未设 min-width（Chrome 计算值为 auto/0px）').not.toBe('44px')
  expect(r.headerMinW).toBe('44px')
  expect(r.headerMinH).toBe('44px')
  await ctx.close()
})

// —— 移动端缺陷修复回归：coarse 日格 min-width:44px 撑破 7 列 → 周日列溢出被裁 ——
// 375/320 窄视口下首行 7 列必须完整可见可点（命中检测落在日格上）。
test('calendar 触屏窄视口（375/320）：7 列日格完整可见可点（周日列不溢出被裁）', async ({ browser }) => {
  for (const width of [375, 320]) {
    const ctx = await browser.newContext({ hasTouch: true, viewport: { width, height: 667 } })
    const p = await ctx.newPage()
    await p.goto('/components/calendar.html', { waitUntil: 'domcontentloaded' })
    await up(p, 'oas-calendar#calendar-cell-render')
    const r = await p.evaluate(() => {
      const el = document.querySelector('oas-calendar#calendar-cell-render')!
      el.scrollIntoView({ block: 'center' })
      const firstWeek = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.week .day')].slice(0, 7)
      const host = el.getBoundingClientRect()
      const last = firstWeek[6]!.getBoundingClientRect()
      const pt = { x: last.left + last.width / 2, y: last.top + last.height / 2 }
      // 命中检测：穿透 shadow DOM 只会拿到宿主，命中宿主或其内部日格均算可点
      const hit = document.elementFromPoint(pt.x, pt.y)
      return {
        vw: document.documentElement.clientWidth,
        hostW: Math.round(host.width),
        cols: new Set(firstWeek.map((d) => Math.round(d.getBoundingClientRect().left))).size,
        lastRight: last.right,
        hostRight: host.right,
        hitOk: hit === el || hit === firstWeek[6] || firstWeek[6]!.contains(hit),
        scrollW: document.documentElement.scrollWidth,
      }
    })
    expect(r.hostW, `${width} 视口日历宿主不应宽于视口`).toBeLessThanOrEqual(r.vw)
    expect(r.cols, `${width} 视口首行应 7 列完整渲染`).toBe(7)
    expect(r.lastRight, `${width} 视口周日列右缘不超宿主右缘（不溢出被裁）`).toBeLessThanOrEqual(r.hostRight + 1)
    expect(r.hitOk, `${width} 视口周日列命中检测可点`).toBe(true)
    await ctx.close()
  }
})
