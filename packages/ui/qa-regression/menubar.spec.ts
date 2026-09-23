// 复核回归：menubar——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up, visibleSubmenuRects } from './helpers'

// 子菜单是否展开（限定 .bar 作用域：汉堡面板镜像同一份 items）
const submenuOpen = (page: import('@playwright/test').Page, hostId: string, parent: string) =>
  page.evaluate(
    ({ hostId, parent }) => {
      const mb = document.querySelector(hostId)
      if (!mb?.shadowRoot) return false // 宿主/升级未就绪时视为未展开，交给 poll 重试
      const sub = mb.shadowRoot.querySelector(`.bar [part="submenu"][data-parent="${parent}"]`)
      return sub?.classList.contains('open') ?? false
    },
    { hostId, parent },
  )

test('menubar 受控：外部 setAttribute(value) 即时同步勾选（value 在 observedAttributes）', async ({ page }) => {
  // 曾现 bug：value 未列入 observedAttributes，外部 setAttribute('value') 不触发 update，
  // 勾选/高亮不移动，受控 demo 只能靠重设 items 绕开。
  await page.goto('/components/menubar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#mb-value')
  const r = await page.evaluate(() => {
    const mb = document.querySelector('#mb-value')!
    const checked = (v: string) =>
      mb.shadowRoot!.querySelector<HTMLElement>(`[part="item"][data-value="${v}"]`)?.getAttribute('aria-checked') ??
      null
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
  await page.locator('#menubar-basic[data-e2e-right-edge] .bar [part="top-item"][data-value="view"]').click()
  await page.waitForTimeout(150)
  await page.locator('#menubar-basic[data-e2e-right-edge] .bar [part="item"][data-value="zoom"]').hover()
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
  await page.screenshot({ path: test.info().outputPath('fix8-menubar-flip.png') })
})

test('menubar click 首开语义：无开态 hover 不展开、开态 hover 切换顶级（桌面共识回归）', async ({ page }) => {
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

test('menubar show-arrow side-top align-end 箭头右对齐触发器（右缘 12px，不落面板左端）', async ({ page }) => {
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

// ===== close-on-select 布尔语义（对齐 menu 的 hasAttr+缺省模式，行为零变化）=====
// 布尔属性约定「存在即真（含空值），仅显式 "false" 关闭」；缺省收（桌面菜单栏共识）。
// docs 无空值 demo（menubar-checkbox 是显式 "false"），空串存在即真由单测覆盖，此处不硬造。

test('menubar 缺省（未设置 close-on-select）：基础 demo 点叶子后子菜单收起', async ({ page }) => {
  await page.goto('/components/menubar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#menubar-basic')
  // 限定 .bar 作用域：汉堡面板渲染同一份 items 镜像，不限定会 strict 重复命中
  await page.locator('#menubar-basic .bar [part="top-item"][data-value="file"]').click()
  const leaf = page.locator('#menubar-basic .bar [part="item"][data-value="new"]')
  await leaf.waitFor({ state: 'visible' })
  await expect.poll(() => submenuOpen(page, '#menubar-basic', 'file')).toBe(true)
  // 浮层展开动画/定位期间元素持续微动，Playwright 稳定性检查会重试到超时（firefox 尤甚）；
  // 这里验证的是 close-on-select 行为，用 DOM click 触发组件处理器即可。
  await leaf.evaluate((el) => (el as HTMLElement).click())
  // 收起是异步的：轮询到最终态，别固定 sleep（高并发下 200ms 不够 → flaky）
  await expect
    .poll(() => submenuOpen(page, '#menubar-basic', 'file'), {
      message: '未设置 close-on-select（缺省收）点叶子后子菜单应收起',
    })
    .toBe(false)
})

test('menubar close-on-select="false"（menubar-checkbox demo）：radio 叶子选中后子菜单保持展开', async ({ page }) => {
  await page.goto('/components/menubar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#menubar-checkbox')
  await page.locator('#menubar-checkbox .bar [part="top-item"][data-value="view"]').click()
  const leaf = page.locator('#menubar-checkbox .bar [part="item"][data-value="fullscreen"]')
  await leaf.waitFor({ state: 'visible' })
  await expect.poll(() => submenuOpen(page, '#menubar-checkbox', 'view')).toBe(true)
  // 浮层展开动画/定位期间元素持续微动，Playwright 稳定性检查会重试到超时（firefox 尤甚）；
  // 这里验证的是 close-on-select 行为，用 DOM click 触发组件处理器即可。
  await leaf.evaluate((el) => (el as HTMLElement).click())
  // close-on-select="false"：点叶子后应保持展开。等一个动画窗口让「若会收」的收起发生，
  // 再断言仍展开（避免点击效果还没跑就抢跑通过）。
  await page.waitForTimeout(300)
  await expect
    .poll(() => submenuOpen(page, '#menubar-checkbox', 'view'), {
      message: 'close-on-select="false" radio 叶子选中后子菜单应保持展开',
    })
    .toBe(true)
})

// RTL 回归：根级 dir=rtl 时（页面加载后动态设置亦可）顶级下拉面板不得溢出视口右缘
// ——曾现 bug：data-rtl 仅在 update() 刷新，加载后设 dir 面板沿用 LTR 形态右溢 24px
test('menubar RTL：根级 dir=rtl 顶级下拉不溢出视口（data-rtl 面板同步时实时刷新）', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/components/menubar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-menubar')
  await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'))
  const info = await page.evaluate(() => {
    const mb = document.querySelector('#menubar-basic')!
    mb.shadowRoot!.querySelector<HTMLElement>('.bar [part="top-item"][data-value="view"]')!.click()
    const sub = [...mb.shadowRoot!.querySelectorAll<HTMLElement>('[part="submenu"]')].find((s) =>
      s.classList.contains('open'),
    )!
    const r = sub.getBoundingClientRect()
    return { left: r.left, right: r.right, vw: window.innerWidth, dataRtl: mb.hasAttribute('data-rtl') }
  })
  expect(info.dataRtl, '打开面板时应同步 data-rtl 镜像开关').toBe(true)
  expect(info.right, `面板右缘 ${Math.round(info.right)} 越出视口 ${info.vw}`).toBeLessThanOrEqual(info.vw + 1)
})

// —— 回折边界普查（三缺陷之一）：bar 不是裁切容器，回折边界必须是视口 ——
// 曾现缺陷（LTR）：回折右界取 min(视口, bar 右缘)——bar 落在面板必经路径上时，面板明明未越出
// 视口也被判回折，三个顶级项面板一律左缘 = 触发器左缘 −118（全右对齐、落到组件左缘甚至组件外）。
// 该缺陷在原 spec 里被「把 menubar 平移为 position:fixed;right:0」（此时 bar 在视口右缘、误判消失）
// 掩盖；故此处**在页面自然位置**逐个顶级项断言：面板左缘跟随触发器、无 flip-right、不越视口。
test('menubar 自然位置：顶级下拉左缘跟随触发器，不因 bar 盒宽误回折', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/components/menubar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#menubar-basic')
  const rows = await page.evaluate(async () => {
    const mb = document.querySelector('#menubar-basic')!
    const out: Array<{ v: string; dLeft: number; flip: boolean; panelRight: number; vw: number }> = []
    for (const v of ['file', 'edit', 'view']) {
      const trig = mb.shadowRoot!.querySelector<HTMLElement>(`.bar [part="top-item"][data-value="${v}"]`)!
      trig.click()
      await new Promise((r) => setTimeout(r, 160))
      const sub = mb.shadowRoot!.querySelector<HTMLElement>(`.bar [part="submenu"][data-parent="${v}"]`)!
      const tr = trig.getBoundingClientRect()
      const sr = sub.getBoundingClientRect()
      out.push({
        v,
        dLeft: Math.round(sr.left - tr.left),
        flip: sub.classList.contains('flip-right'),
        panelRight: Math.round(sr.right),
        vw: window.innerWidth,
      })
      // 关闭再测下一项（外点收起）
      document.body.click()
      await new Promise((r) => setTimeout(r, 120))
    }
    return out
  })
  expect(rows.length).toBe(3)
  for (const r of rows) {
    expect(Math.abs(r.dLeft), `顶级「${r.v}」面板左缘应跟随触发器（实测偏差 ${r.dLeft}px）`).toBeLessThanOrEqual(2)
    expect(r.flip, `顶级「${r.v}」面板未越出视口不应回折（bar 盒宽非回折边界）`).toBe(false)
    expect(r.panelRight, `顶级「${r.v}」面板右缘 ${r.panelRight} 越出视口 ${r.vw}`).toBeLessThanOrEqual(r.vw)
  }
  await page.screenshot({ path: 'test-results/visual-review/menubar-natural-position-after.png' })
})

// 曾现缺陷（RTL 镜像）：回折左界取 max(margin, bar 左缘)+margin，且回折后不再校验视口 →
// RTL 点位于 bar 最右的「文件」时面板 [1134,1304]，右缘越出视口 24px。
test('menubar RTL：bar 最右项下拉不越视口右缘（回折边界取视口 + 回折后二次校验）', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/components/menubar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-menubar')
  await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'))
  const info = await page.evaluate(async () => {
    const mb = document.querySelector('#menubar-basic')!
    // RTL 书写起点在右：bar 最右的顶级项 = rect.right 最大者
    const triggers = [...mb.shadowRoot!.querySelectorAll<HTMLElement>('.bar [part="top-item"]')]
    const trig = triggers.reduce((a, b) => (a.getBoundingClientRect().right >= b.getBoundingClientRect().right ? a : b))
    const tr = trig.getBoundingClientRect()
    trig.click()
    await new Promise((r) => setTimeout(r, 250))
    const sub = mb.shadowRoot!.querySelector<HTMLElement>('.bar [part="submenu"].open')!
    const sr = sub.getBoundingClientRect()
    return {
      trigValue: trig.dataset.value,
      trigRight: Math.round(tr.right),
      panelLeft: Math.round(sr.left),
      panelRight: Math.round(sr.right),
      flip: sub.classList.contains('flip-right'),
      vw: window.innerWidth,
    }
  })
  // 未回折左缘 = 触发器右缘 − 面板宽，仍在视口内 → 不应回折（旧实现按 bar 左缘误判回折 → 右溢 24px）
  expect(info.flip, `RTL「${info.trigValue}」未回折左缘未越视口左缘 → 不应回折`).toBe(false)
  expect(info.panelLeft, '面板左缘应在视口内').toBeGreaterThanOrEqual(0)
  expect(info.panelRight, `面板右缘 ${info.panelRight} 越出视口 ${info.vw}`).toBeLessThanOrEqual(info.vw)
  expect(info.trigRight, '面板右缘应贴触发器右缘（RTL 缺省右对齐）').toBeLessThanOrEqual(info.panelRight + 2)
  await page.screenshot({ path: 'test-results/visual-review/menubar-rtl-rightmost.png' })
})

// ===== RTL + dark 实测（菜单族定位修复复测）=====
// RTL 缺省 align-start 是逻辑语义 → 物理右缘：面板右缘贴触发器右缘、向左展开。
// 端点触发器都要过（第 1 个 / 最后 1 个，排除「···」收纳项——它的弹层固定右对齐、0×0 会污染量测）；
// light/dark 各一遍（dark 另断言面板文字对底色对比度 ≥4.5，可见性不降级）。
for (const theme of ['light', 'dark'] as const) {
  test(`menubar RTL（${theme}）：第 1 个与最后 1 个触发器下拉右缘贴触发器 ≤2px、不越视口`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/components/menubar.html', { waitUntil: 'domcontentloaded' })
    await up(page, '#menubar-basic')
    await page.evaluate((dark) => {
      document.documentElement.setAttribute('dir', 'rtl')
      document.documentElement.classList.toggle('dark', dark)
    }, theme === 'dark')
    await page.waitForTimeout(200)
    const rows = await page.evaluate(async () => {
      const mb = document.querySelector('#menubar-basic')!
      const trigs = [...mb.shadowRoot!.querySelectorAll<HTMLElement>('.bar [part="top-item"]')].filter(
        (t) => t.dataset.value !== '__more__',
      )
      const picked = [trigs[0]!, trigs[trigs.length - 1]!]
      const out: Array<Record<string, number | string | boolean>> = []
      for (const trig of picked) {
        trig.click()
        await new Promise((r) => setTimeout(r, 300))
        const sub = mb.shadowRoot!.querySelector<HTMLElement>(
          `.bar [part="submenu"][data-parent="${trig.dataset.value}"]`,
        )!
        const tr = trig.getBoundingClientRect()
        const sr = sub.getBoundingClientRect()
        const cs = getComputedStyle(sub)
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
        out.push({
          v: trig.dataset.value!,
          dRight: Math.round(sr.right - tr.right),
          panelLeft: Math.round(sr.left),
          panelRight: Math.round(sr.right),
          flip: sub.classList.contains('flip-right'),
          color: cs.color,
          bg: cs.backgroundColor,
          ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
          vw: window.innerWidth,
        })
        document.body.click()
        await new Promise((r) => setTimeout(r, 160))
      }
      return out
    })
    expect(rows.length, '应量到第 1 个与最后 1 个顶级触发器').toBe(2)
    for (const r of rows) {
      expect(
        Math.abs(r.dRight as number),
        `RTL「${r.v}」面板右缘应对齐触发器右缘（偏差 ${r.dRight}px）`,
      ).toBeLessThanOrEqual(2)
      expect(r.flip, `RTL「${r.v}」视口 1280 足够宽 → 不应回折`).toBe(false)
      expect(r.panelLeft as number, `RTL「${r.v}」面板左缘应在视口内`).toBeGreaterThanOrEqual(0)
      expect(r.panelRight as number, `RTL「${r.v}」面板右缘 ${r.panelRight} 越出视口 ${r.vw}`).toBeLessThanOrEqual(
        r.vw as number,
      )
      expect(r.ratio as number, `${theme} 面板文字 ${r.color} 对底色 ${r.bg} 对比度`).toBeGreaterThanOrEqual(4.5)
    }
    // 截图留档：RTL 最右项（= DOM 第 1 个「文件」）下拉展开态。
    // 先把 demo 滚进视口中央——基础用法 demo 在折叠线以下，不滚会截到页面顶部（看不到面板）
    await page.evaluate(async () => {
      const mb = document.querySelector('#menubar-basic')!
      mb.scrollIntoView({ block: 'center' })
      await new Promise((r) => setTimeout(r, 250))
      ;(mb.shadowRoot!.querySelector('.bar [part="top-item"][data-value="file"]') as HTMLElement).click()
      await new Promise((r) => setTimeout(r, 300))
    })
    await page.screenshot({ path: `test-results/visual-review/menubar-rtl-rightmost-${theme}.png` })
  })
}
