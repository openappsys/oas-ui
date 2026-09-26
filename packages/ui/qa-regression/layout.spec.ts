// 复核回归：layout——历史缺陷固化断言。

import { test, expect } from '@playwright/test'

test('layout viewport：高度锁定 + 侧栏/内容各自独立滚动 + 顶栏不随内容动（实测缺陷回归）', async ({ page }) => {
  await page.goto('/components/layout.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector('#layout-viewport')?.shadowRoot != null, undefined, {
    timeout: 15000,
  })
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

test('sider 内嵌 sidebar 宽度自动对齐：填满轨道而非自身默认宽（实测缺陷回归）', async ({ page }) => {
  await page.goto('/components/layout.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector('#layout-viewport-sidebar')?.shadowRoot != null, undefined, {
    timeout: 15000,
  })
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

// —— PRD P2：oas-sider width 属性（轨道宽度显式覆盖，与 collapsed 窄条契约共存） ——
test('sider width：显式宽度生效（纯数字按 px）、折叠窄条契约让位、解除恢复（PRD P2）', async ({ page }) => {
  await page.goto('/components/layout.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector('oas-sider[width]')?.shadowRoot != null, null, {
    timeout: 15000,
  })
  await page.evaluate(() => {
    document.querySelector('oas-sider[width]')!.scrollIntoView({ block: 'center' })
  })
  const r = await page.evaluate(async () => {
    const wide = document.querySelector('oas-sider[width]:not([collapsed])')! as HTMLElement
    const folded = document.querySelector('oas-sider[width][collapsed]')! as HTMLElement
    await new Promise((res) => setTimeout(res, 350)) // 等折叠宽度过渡结束
    return {
      wideInline: wide.style.width,
      wideRect: Math.round(wide.getBoundingClientRect().width),
      foldedInline: folded.style.width,
      foldedRect: Math.round(folded.getBoundingClientRect().width),
    }
  })
  expect(r.wideInline, 'width=280 应内联生效（纯数字补 px）').toBe('280px')
  expect(r.wideRect, '轨道实际宽度应为 280').toBe(280)
  expect(r.foldedInline, '折叠态应清内联（窄条契约优先）').toBe('')
  expect(r.foldedRect, '折叠窄条应为 64px（--oas-sider-collapsed-width 默认）').toBe(64)
})
