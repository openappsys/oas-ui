// 复核回归：menubar——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up, visibleSubmenuRects } from './helpers'

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