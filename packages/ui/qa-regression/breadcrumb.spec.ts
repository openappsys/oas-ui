// 复核回归：breadcrumb——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

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