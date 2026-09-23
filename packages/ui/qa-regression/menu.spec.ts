// 复核回归：menu——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up, visibleSubmenuRects } from './helpers'

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
  await page.screenshot({ path: test.info().outputPath('fix8-menu-flip.png') })
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
    const host = li.getRootNode() instanceof ShadowRoot ? (li.getRootNode() as ShadowRoot).host : null
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

// —— 回折边界普查（三缺陷之二）：水平模式 .menu 有 overflow-x: clip，是真实裁切边界 ——
// 曾现缺陷：水平模式回折判定只看视口，末项子菜单越出 .menu 右缘的那一段被 clip 真实裁掉
// （rect/display 正常但视觉不可见，elementFromPoint 命中页面元素）。边界须取「视口 ∩ .menu 盒」。
// 场景：容器 380 宽收纳演示的同一类窄容器（改 280 宽 + 末项带子级，保证末项可见且面板越出盒缘）。
test('menu 水平模式：末项子菜单右缘不越 .menu 盒右缘且真实可见（未被 overflow-x:clip 裁掉）', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/components/menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-menu')
  const data = await page.evaluate(async () => {
    const h = document.createElement('oas-menu')
    h.id = 'zz-menu-clip'
    h.setAttribute('mode', 'horizontal')
    // fixed 定位：保证落在视口内，elementFromPoint 才能命中（body 末尾追加会落到折叠线外 → null）
    h.style.cssText = 'position: fixed; top: 120px; left: 40px; width: 280px; z-index: 9999'
    h.setAttribute(
      'items',
      JSON.stringify([
        { label: '首页', value: 'home' },
        { label: '产品中心', value: 'products' },
        {
          label: '帮助中心',
          value: 'help',
          children: [
            { label: '常见问题', value: 'faq' },
            { label: '在线客服', value: 'chat' },
          ],
        },
      ]),
    )
    document.body.appendChild(h)
    await new Promise((r) => setTimeout(r, 400))
    const menu = h.shadowRoot!.querySelector<HTMLElement>('.menu')!
    const li = menu.querySelector<HTMLElement>(':scope > [part="item"][data-value="help"]')!
    li.dispatchEvent(new MouseEvent('mouseenter'))
    await new Promise((r) => setTimeout(r, 250))
    const sub = li.querySelector<HTMLElement>(':scope > .submenu')!
    const mr = menu.getBoundingClientRect()
    const ir = li.getBoundingClientRect()
    const sr = sub.getBoundingClientRect()
    const hit = document.elementFromPoint(sr.x + sr.width - 6, sr.y + Math.min(sr.height / 2, 30))
    return {
      menuLeft: Math.round(mr.left),
      menuRight: Math.round(mr.right),
      itemLeft: Math.round(ir.left),
      panelLeft: Math.round(sr.left),
      panelRight: Math.round(sr.right),
      flipLeft: sub.classList.contains('flip-left'),
      overflowX: getComputedStyle(menu).overflowX,
      hitIsHost: hit === h,
      hitTag: hit?.tagName ?? null,
      collapsed: li.hasAttribute('data-collapsed'),
    }
  })
  expect(data.collapsed, '末项应可见（未被收纳）').toBe(false)
  expect(data.overflowX, '容器应只裁横轴（clip）').toBe('clip')
  expect(data.flipLeft, '面板越出 .menu 右缘 → 必须回折（视口 1280 远未越界）').toBe(true)
  expect(
    data.panelRight,
    `面板右缘 ${data.panelRight} 越出 .menu 右缘 ${data.menuRight}（被 overflow-x:clip 裁掉）`,
  ).toBeLessThanOrEqual(data.menuRight + 1)
  expect(data.panelLeft, `面板左缘 ${data.panelLeft} 越出 .menu 左缘 ${data.menuLeft}`).toBeGreaterThanOrEqual(
    data.menuLeft - 1,
  )
  // 回折 = 面板右缘贴父项左缘（LTR 逻辑镜像）
  expect(Math.abs(data.panelRight - data.itemLeft), '回折后面板右缘应贴父项左缘').toBeLessThanOrEqual(2)
  // 真实命中：面板区域必须命中菜单宿主（若被裁会命中页面元素）
  expect(data.hitIsHost, `面板区域应命中菜单宿主（实际命中 ${data.hitTag}）`).toBe(true)
  await page.screenshot({ path: 'test-results/visual-review/menu-horizontal-clip-after.png' })
})

// RTL 复测：水平模式 .submenu-1 的定位逻辑 inset 化后，RTL 回折镜像为「面板左缘贴父项右缘」，
// 且同样不越 .menu 左缘、真实可见（普查未覆盖 RTL 分支）。
test('menu 水平模式 RTL：回折镜像为面板左缘贴父项右缘，不越 .menu 盒左缘且真实可见', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/components/menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-menu')
  await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'))
  const data = await page.evaluate(async () => {
    const h = document.createElement('oas-menu')
    h.id = 'zz-menu-clip-rtl'
    h.setAttribute('mode', 'horizontal')
    // fixed 定位：保证落在视口内，elementFromPoint 才能命中（body 末尾追加会落到折叠线外 → null）
    h.style.cssText = 'position: fixed; top: 120px; left: 40px; width: 280px; z-index: 9999'
    h.setAttribute(
      'items',
      JSON.stringify([
        { label: '首页', value: 'home' },
        { label: '产品中心', value: 'products' },
        {
          label: '帮助中心',
          value: 'help',
          children: [
            { label: '常见问题', value: 'faq' },
            { label: '在线客服', value: 'chat' },
          ],
        },
      ]),
    )
    document.body.appendChild(h)
    await new Promise((r) => setTimeout(r, 400))
    const menu = h.shadowRoot!.querySelector<HTMLElement>('.menu')!
    // RTL 下末项（帮助中心）位于最左
    const li = menu.querySelector<HTMLElement>(':scope > [part="item"][data-value="help"]')!
    li.dispatchEvent(new MouseEvent('mouseenter'))
    await new Promise((r) => setTimeout(r, 250))
    const sub = li.querySelector<HTMLElement>(':scope > .submenu')!
    const mr = menu.getBoundingClientRect()
    const ir = li.getBoundingClientRect()
    const sr = sub.getBoundingClientRect()
    const hit = document.elementFromPoint(sr.x + 6, sr.y + Math.min(sr.height / 2, 30))
    return {
      dataRtl: h.hasAttribute('data-rtl'),
      menuLeft: Math.round(mr.left),
      menuRight: Math.round(mr.right),
      itemRight: Math.round(ir.right),
      panelLeft: Math.round(sr.left),
      panelRight: Math.round(sr.right),
      flipLeft: sub.classList.contains('flip-left'),
      hitIsHost: hit === h,
      hitTag: hit?.tagName ?? null,
    }
  })
  expect(data.dataRtl, 'RTL 镜像开关应同步').toBe(true)
  expect(data.flipLeft, 'RTL 面板未回折左缘越 .menu 左缘 → 必须回折').toBe(true)
  expect(data.panelLeft, `面板左缘 ${data.panelLeft} 越出 .menu 左缘 ${data.menuLeft}`).toBeGreaterThanOrEqual(
    data.menuLeft - 1,
  )
  expect(data.panelRight, `面板右缘 ${data.panelRight} 越出 .menu 右缘 ${data.menuRight}`).toBeLessThanOrEqual(
    data.menuRight + 1,
  )
  // RTL 回折 = 面板左缘贴父项右缘
  expect(Math.abs(data.panelLeft - data.itemRight), 'RTL 回折后面板左缘应贴父项右缘').toBeLessThanOrEqual(2)
  expect(data.hitIsHost, `面板区域应命中菜单宿主（实际命中 ${data.hitTag}）`).toBe(true)
})

// —— 超宽面板残影（三缺陷之外的普查遗留）：回折后仍越界时最小平移夹回 ——
// 曾现缺陷：面板宽于容器给它的任一侧空间（不回折越盒右缘、回折又越盒左缘）时，回折后面板左缘
// 仍越出 .menu 盒左缘，沿裁切边被 overflow-x: clip 裁掉一段（rect/display 正常，但 elementFromPoint
// 命中页面元素 = 残影）。修复：回折/定位完成后量一次实际 rect，越界部分用 inline translateX
// 最小平移夹回裁切边界内（面板本身宽于边界时贴书写起点侧对齐）。
// 场景：280 宽容器 + 末项带长标签子级（面板实测约 185px，宽于父项左侧 157px 与右侧 113px 空间）。
test('menu 水平模式：面板宽于容器一侧空间时，回折后仍被最小平移夹回 .menu 盒内且真实可见', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/components/menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-menu')
  const data = await page.evaluate(async () => {
    const h = document.createElement('oas-menu')
    h.id = 'zz-menu-clamp'
    h.setAttribute('mode', 'horizontal')
    // fixed 定位：保证落在视口内，elementFromPoint 才能命中（body 末尾追加会落到折叠线外 → null）
    h.style.cssText = 'position: fixed; top: 120px; left: 40px; width: 280px; z-index: 9999'
    h.setAttribute(
      'items',
      JSON.stringify([
        { label: '首页', value: 'home' },
        { label: '产品中心', value: 'products' },
        {
          label: '帮助中心',
          value: 'help',
          children: [
            { label: '常见问题与使用指南', value: 'faq' },
            { label: '在线客服与工单提交', value: 'chat' },
            { label: '开发者文档与接口说明', value: 'dev' },
          ],
        },
      ]),
    )
    document.body.appendChild(h)
    await new Promise((r) => setTimeout(r, 400))
    const menu = h.shadowRoot!.querySelector<HTMLElement>('.menu')!
    const li = menu.querySelector<HTMLElement>(':scope > [part="item"][data-value="help"]')!
    li.dispatchEvent(new MouseEvent('mouseenter'))
    await new Promise((r) => setTimeout(r, 250))
    const sub = li.querySelector<HTMLElement>(':scope > .submenu')!
    const mr = menu.getBoundingClientRect()
    const ir = li.getBoundingClientRect()
    const sr = sub.getBoundingClientRect()
    // 探针取面板起点侧边缘内侧 6px：改前该处越出 .menu 盒左缘被裁（命中页面元素），改后应命中宿主
    const hit = document.elementFromPoint(sr.x + 6, sr.y + Math.min(sr.height / 2, 30))
    return {
      menuLeft: Math.round(mr.left),
      menuRight: Math.round(mr.right),
      itemLeft: Math.round(ir.left),
      panelLeft: Math.round(sr.left),
      panelRight: Math.round(sr.right),
      panelWidth: Math.round(sr.width),
      flipLeft: sub.classList.contains('flip-left'),
      inlineTransform: sub.style.transform || '',
      hitIsHost: hit === h,
      hitTag: hit?.tagName ?? null,
    }
  })
  // 场景前置条件：面板确实宽于父项左侧可用空间（否则不构成「任一侧都放不下」）
  expect(
    data.panelWidth,
    `面板宽 ${data.panelWidth} 应大于父项左侧空间 ${data.itemLeft - data.menuLeft}（场景前提）`,
  ).toBeGreaterThan(data.itemLeft - data.menuLeft)
  expect(data.flipLeft, '越出 .menu 右缘 → 回折（视口 1280 远未越界）').toBe(true)
  expect(
    data.panelLeft,
    `面板左缘 ${data.panelLeft} 越出 .menu 左缘 ${data.menuLeft}（被裁成残影）`,
  ).toBeGreaterThanOrEqual(data.menuLeft)
  expect(data.panelRight, `面板右缘 ${data.panelRight} 越出 .menu 右缘 ${data.menuRight}`).toBeLessThanOrEqual(
    data.menuRight,
  )
  expect(data.inlineTransform, '越界部分应由 inline 最小平移夹回').toMatch(/^translateX\(\d+px\)$/)
  // 真实命中：起点侧（改前被裁的那段）必须命中菜单宿主
  expect(data.hitIsHost, `面板起点侧应命中菜单宿主（实际命中 ${data.hitTag}）`).toBe(true)
  await page.screenshot({ path: 'test-results/visual-review/menu-horizontal-clamp-after.png' })
})

// RTL 镜像：越盒右缘（RTL 面板向左回折后右缘越盒）同样被夹回，且起点侧（物理右缘）完整可见
test('menu 水平模式 RTL：面板宽于容器一侧空间时，回折后夹回 .menu 盒内（右缘贴盒缘）且真实可见', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/components/menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-menu')
  await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'))
  const data = await page.evaluate(async () => {
    const h = document.createElement('oas-menu')
    h.id = 'zz-menu-clamp-rtl'
    h.setAttribute('mode', 'horizontal')
    h.style.cssText = 'position: fixed; top: 120px; left: 40px; width: 280px; z-index: 9999'
    h.setAttribute(
      'items',
      JSON.stringify([
        { label: '首页', value: 'home' },
        { label: '产品中心', value: 'products' },
        {
          label: '帮助中心',
          value: 'help',
          children: [
            { label: '常见问题与使用指南', value: 'faq' },
            { label: '在线客服与工单提交', value: 'chat' },
            { label: '开发者文档与接口说明', value: 'dev' },
          ],
        },
      ]),
    )
    document.body.appendChild(h)
    await new Promise((r) => setTimeout(r, 400))
    const menu = h.shadowRoot!.querySelector<HTMLElement>('.menu')!
    const li = menu.querySelector<HTMLElement>(':scope > [part="item"][data-value="help"]')!
    li.dispatchEvent(new MouseEvent('mouseenter'))
    await new Promise((r) => setTimeout(r, 250))
    const sub = li.querySelector<HTMLElement>(':scope > .submenu')!
    const mr = menu.getBoundingClientRect()
    const ir = li.getBoundingClientRect()
    const sr = sub.getBoundingClientRect()
    // 探针取面板终点侧（RTL 书写起点侧 = 物理右缘）内侧 6px：改前越出 .menu 盒右缘被裁
    const hit = document.elementFromPoint(sr.x + sr.width - 6, sr.y + Math.min(sr.height / 2, 30))
    return {
      menuLeft: Math.round(mr.left),
      menuRight: Math.round(mr.right),
      itemRight: Math.round(ir.right),
      panelLeft: Math.round(sr.left),
      panelRight: Math.round(sr.right),
      panelWidth: Math.round(sr.width),
      flipLeft: sub.classList.contains('flip-left'),
      inlineTransform: sub.style.transform || '',
      hitIsHost: hit === h,
      hitTag: hit?.tagName ?? null,
    }
  })
  expect(
    data.panelWidth,
    `面板宽 ${data.panelWidth} 应大于父项右侧空间 ${data.menuRight - data.itemRight}（场景前提）`,
  ).toBeGreaterThan(data.menuRight - data.itemRight)
  expect(data.flipLeft, 'RTL 未回折面板左缘越 .menu 左缘 → 回折（视口远未越界）').toBe(true)
  expect(
    data.panelRight,
    `面板右缘 ${data.panelRight} 越出 .menu 右缘 ${data.menuRight}（被裁成残影）`,
  ).toBeLessThanOrEqual(data.menuRight)
  expect(data.panelLeft, `面板左缘 ${data.panelLeft} 越出 .menu 左缘 ${data.menuLeft}`).toBeGreaterThanOrEqual(
    data.menuLeft,
  )
  expect(data.inlineTransform, 'RTL 越界部分应由 inline 负位移夹回').toMatch(/^translateX\(-\d+px\)$/)
  expect(data.hitIsHost, `面板起点侧（物理右缘）应命中菜单宿主（实际命中 ${data.hitTag}）`).toBe(true)
})

// —— 夹取延伸到全部层级（上一轮未解项）：一级被夹回后，二级仍整体越盒被裁 ——
// 曾现缺陷：夹取只做在一级子菜单。实测「一级面板宽 185 + 其子项带宽子面板」时，一级被夹回
// [41,226] ✓，但二级 sub2 = [−124,46]（盒 [41,319]）→ 整体越出 .menu 盒被 overflow-x: clip
// 裁掉，elementFromPoint 在子面板中心为 null（视觉不可见）。修法：夹取对全部层级生效，
// 逐级独立（父级先、子级后，子级基于父级夹后位置再夹）。
test('menu 水平模式：二级子面板被夹回 .menu 盒内（全部层级夹取，elementFromPoint 命中宿主）', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/components/menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-menu')
  const data = await page.evaluate(async () => {
    const h = document.createElement('oas-menu')
    h.id = 'zz-menu-clamp-l2'
    h.setAttribute('mode', 'horizontal')
    // fixed 定位：保证落在视口内，elementFromPoint 才能命中（body 末尾追加会落到折叠线外 → null）
    h.style.cssText = 'position: fixed; top: 120px; left: 40px; width: 280px; z-index: 9999'
    h.setAttribute(
      'items',
      JSON.stringify([
        { label: '首页', value: 'home' },
        { label: '产品中心', value: 'products' },
        {
          label: '帮助中心',
          value: 'help',
          children: [
            {
              label: '常见问题与使用指南',
              value: 'faq',
              children: [
                { label: '账号与安全设置说明', value: 'faq-account' },
                { label: '支付与退款流程说明', value: 'faq-pay' },
              ],
            },
            { label: '在线客服与工单提交', value: 'chat' },
            { label: '开发者文档与接口说明', value: 'dev' },
          ],
        },
      ]),
    )
    document.body.appendChild(h)
    await new Promise((r) => setTimeout(r, 400))
    const menu = h.shadowRoot!.querySelector<HTMLElement>('.menu')!
    const helpLi = menu.querySelector<HTMLElement>(':scope > [part="item"][data-value="help"]')!
    // hover 最深叶子：级联展开整条链（help → faq）
    const deep = menu.querySelector<HTMLElement>('[part="item"][data-value="faq-account"]')!
    deep.dispatchEvent(new MouseEvent('mouseenter'))
    await new Promise((r) => setTimeout(r, 250))
    const sub1 = helpLi.querySelector<HTMLElement>(':scope > .submenu')!
    const faqLi = sub1.querySelector<HTMLElement>('[part="item"][data-value="faq"]')!
    const sub2 = faqLi.querySelector<HTMLElement>(':scope > .submenu')!
    const mr = menu.getBoundingClientRect()
    const r1 = sub1.getBoundingClientRect()
    const r2 = sub2.getBoundingClientRect()
    // 探针取二级面板中心（改前中心越出视口左缘/盒缘被裁，命中页面元素而非宿主）
    const vw = window.innerWidth
    const probeX = Math.max(2, Math.min(vw - 3, r2.x + r2.width / 2))
    const probeY = r2.y + Math.min(r2.height / 2, 30)
    const hit = document.elementFromPoint(probeX, probeY)
    return {
      menuLeft: Math.round(mr.left),
      menuRight: Math.round(mr.right),
      sub1Left: Math.round(r1.left),
      sub1Right: Math.round(r1.right),
      sub2Left: Math.round(r2.left),
      sub2Right: Math.round(r2.right),
      sub2Width: Math.round(r2.width),
      sub1Transform: sub1.style.transform || '',
      sub2Transform: sub2.style.transform || '',
      helpCollapsed: helpLi.hasAttribute('data-collapsed'),
      faqOpen: faqLi.classList.contains('open'),
      hitIsHost: hit === h,
      hitTag: hit?.tagName ?? null,
    }
  })
  expect(data.helpCollapsed, '「帮助中心」应可见（未被收纳，否则场景不成立）').toBe(false)
  expect(data.faqOpen, '二级父项 faq 应已展开').toBe(true)
  // 一级：上一轮已绿的既有行为（回折后夹回盒内），本次零扰动
  expect(data.sub1Transform, '一级由 inline 最小平移夹回盒内（既有行为不回归）').toMatch(/^translateX\(\d+px\)$/)
  expect(data.sub1Left, `一级左缘 ${data.sub1Left} 越出 .menu 左缘 ${data.menuLeft}`).toBeGreaterThanOrEqual(
    data.menuLeft,
  )
  expect(data.sub1Right, `一级右缘 ${data.sub1Right} 越出 .menu 右缘 ${data.menuRight}`).toBeLessThanOrEqual(
    data.menuRight,
  )
  // 二级：本次新增——同样夹回盒内且真实可见
  expect(data.sub2Transform, '二级应由 inline 最小平移夹回盒内（本次新增）').toMatch(/^translateX\(\d+px\)$/)
  expect(
    data.sub2Left,
    `二级面板左缘 ${data.sub2Left} 越出 .menu 左缘 ${data.menuLeft}（改前为负值，整体被裁）`,
  ).toBeGreaterThanOrEqual(data.menuLeft)
  expect(data.sub2Right, `二级面板右缘 ${data.sub2Right} 越出 .menu 右缘 ${data.menuRight}`).toBeLessThanOrEqual(
    data.menuRight,
  )
  expect(data.hitIsHost, `二级面板中心应命中菜单宿主（实际命中 ${data.hitTag}）`).toBe(true)
  await page.screenshot({ path: 'test-results/visual-review/menu-horizontal-clamp-l2-after.png' })
})

// RTL 镜像：二级面板同样夹回盒内（平移轴是物理的，自动镜像为负位移）
test('menu 水平模式 RTL：二级子面板镜像夹回 .menu 盒内（负位移）且真实可见', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/components/menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-menu')
  await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'))
  const data = await page.evaluate(async () => {
    const h = document.createElement('oas-menu')
    h.id = 'zz-menu-clamp-l2-rtl'
    h.setAttribute('mode', 'horizontal')
    h.style.cssText = 'position: fixed; top: 120px; left: 40px; width: 280px; z-index: 9999'
    h.setAttribute(
      'items',
      JSON.stringify([
        { label: '首页', value: 'home' },
        { label: '产品中心', value: 'products' },
        {
          label: '帮助中心',
          value: 'help',
          children: [
            {
              label: '常见问题与使用指南',
              value: 'faq',
              children: [
                { label: '账号与安全设置说明', value: 'faq-account' },
                { label: '支付与退款流程说明', value: 'faq-pay' },
              ],
            },
            { label: '在线客服与工单提交', value: 'chat' },
            { label: '开发者文档与接口说明', value: 'dev' },
          ],
        },
      ]),
    )
    document.body.appendChild(h)
    await new Promise((r) => setTimeout(r, 400))
    const menu = h.shadowRoot!.querySelector<HTMLElement>('.menu')!
    const helpLi = menu.querySelector<HTMLElement>(':scope > [part="item"][data-value="help"]')!
    const deep = menu.querySelector<HTMLElement>('[part="item"][data-value="faq-account"]')!
    deep.dispatchEvent(new MouseEvent('mouseenter'))
    await new Promise((r) => setTimeout(r, 250))
    const sub1 = helpLi.querySelector<HTMLElement>(':scope > .submenu')!
    const faqLi = sub1.querySelector<HTMLElement>('[part="item"][data-value="faq"]')!
    const sub2 = faqLi.querySelector<HTMLElement>(':scope > .submenu')!
    const mr = menu.getBoundingClientRect()
    const r1 = sub1.getBoundingClientRect()
    const r2 = sub2.getBoundingClientRect()
    const vw = window.innerWidth
    const probeX = Math.max(2, Math.min(vw - 3, r2.x + r2.width / 2))
    const probeY = r2.y + Math.min(r2.height / 2, 30)
    const hit = document.elementFromPoint(probeX, probeY)
    return {
      menuLeft: Math.round(mr.left),
      menuRight: Math.round(mr.right),
      sub1Transform: sub1.style.transform || '',
      sub2Left: Math.round(r2.left),
      sub2Right: Math.round(r2.right),
      sub2Transform: sub2.style.transform || '',
      hitIsHost: hit === h,
      hitTag: hit?.tagName ?? null,
    }
  })
  expect(data.sub1Transform, 'RTL 一级由 inline 负位移夹回（既有行为不回归）').toMatch(/^translateX\(-\d+px\)$/)
  expect(data.sub2Transform, 'RTL 二级镜像夹回（负位移）').toMatch(/^translateX\(-\d+px\)$/)
  expect(data.sub2Left, `RTL 二级左缘 ${data.sub2Left} 越出 .menu 左缘 ${data.menuLeft}`).toBeGreaterThanOrEqual(
    data.menuLeft,
  )
  expect(data.sub2Right, `RTL 二级右缘 ${data.sub2Right} 越出 .menu 右缘 ${data.menuRight}`).toBeLessThanOrEqual(
    data.menuRight,
  )
  expect(data.hitIsHost, `RTL 二级面板中心应命中菜单宿主（实际命中 ${data.hitTag}）`).toBe(true)
})

// ===== hover 衔接（真鼠标）：指针从父项移向「被回折 + 夹回」的面板时面板不中途收起 =====
// 缺陷：回折 / 夹取后的面板与父项在行内轴错开（面板右缘落在父项左缘或更靠书写起点侧），指针从
// 父项斜向移向面板的直线路径会在菜单盒下缘处短暂落在「页面区域」上（既不在菜单盒、也不在面板
// 盒）——旧的 mouseleave 只看菜单盒，于是面板在指针到达前瞬间收起（hover 断链）。面板越高、
// 错开越多越明显。修法：mouseleave 时指针仍在「父项 → 面板」桥区内则保留展开态，由桥区观察器
// （mousemove）判定真正离开（无定时器）。
// 实测（真鼠标 page.mouse 逐步移动）：修复前 4 项面板（高 170）直线 30 步采样丢 24 点（首丢第 7 步）；
// 修复后 LTR / RTL 的 3 / 4 / 5 / 8 项面板全部 0 丢失。3 项为既有 e2e 场景（冻结不回归）。
for (const sc of [
  { children: 3, rtl: false },
  { children: 4, rtl: false },
  { children: 4, rtl: true },
] as const) {
  test(`menu 水平${sc.rtl ? ' RTL' : ''}：真鼠标从父项移向被夹回的面板（${sc.children} 项），全程保持展开`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/components/menu.html', { waitUntil: 'domcontentloaded' })
    await up(page, 'oas-menu')
    if (sc.rtl) await page.evaluate(() => document.documentElement.setAttribute('dir', 'rtl'))
    // 注入 280 宽水平菜单：末项带长标签子级 → 面板宽于容器一侧空间 → 回折 + inline 平移夹回
    const item = await page.evaluate(async (n) => {
      document.querySelector('#zz-menu-bridge')?.remove()
      const h = document.createElement('oas-menu')
      h.id = 'zz-menu-bridge'
      h.setAttribute('mode', 'horizontal')
      // fixed 定位：保证落在视口内（body 末尾追加会落到折叠线外）
      h.style.cssText = 'position: fixed; top: 120px; left: 40px; width: 280px; z-index: 9999'
      h.setAttribute(
        'items',
        JSON.stringify([
          { label: '首页', value: 'home' },
          { label: '产品中心', value: 'products' },
          {
            label: '帮助中心',
            value: 'help',
            children: Array.from({ length: n }, (_, i) => ({
              label: `常见问题与使用指南${i + 1}`,
              value: `leaf-${i + 1}`,
            })),
          },
        ]),
      )
      document.body.appendChild(h)
      await new Promise((r) => setTimeout(r, 400))
      const li = h.shadowRoot!.querySelector<HTMLElement>('.menu > [part="item"][data-value="help"]')!
      const ir = li.getBoundingClientRect()
      return { cx: ir.left + ir.width / 2, cy: ir.top + ir.height / 2 }
    }, sc.children)
    const readState = () =>
      page.evaluate(() => {
        const h = document.querySelector('#zz-menu-bridge')!
        const li = h.shadowRoot!.querySelector<HTMLElement>('.menu > [part="item"][data-value="help"]')!
        const sub = li.querySelector<HTMLElement>(':scope > .submenu')!
        const sr = sub.getBoundingClientRect()
        return {
          open: li.classList.contains('open'),
          transform: sub.style.transform || '',
          panelHover: sub.matches(':hover'),
          panelLeft: sr.left,
          panelRight: sr.right,
          panelCx: sr.left + sr.width / 2,
          panelCy: sr.top + sr.height / 2,
        }
      })
    // 真鼠标 hover 展开（page.mouse 走完整 hit-test 事件路径）
    await page.mouse.move(item.cx, item.cy)
    await page.waitForTimeout(260)
    const opened = await readState()
    expect(opened.open, 'hover 父项应展开面板').toBe(true)
    expect(opened.transform, '场景前提：面板被回折 + inline 平移夹回（与父项横向错开）').toMatch(
      /^translateX\(-?\d+px\)$/,
    )
    // 场景前提：父项中心落在面板横向范围之外（LTR 面板在父项左侧 / RTL 镜像在右侧）——
    // 指针从父项中心下移时会离开面板盒，正是缺口发生的位置
    expect(
      item.cx < opened.panelLeft || item.cx > opened.panelRight,
      `场景前提：父项中心 ${Math.round(item.cx)} 应在面板 [${Math.round(opened.panelLeft)},${Math.round(opened.panelRight)}] 之外（错开）`,
    ).toBe(true)
    // 沿「父项中心 → 面板中心」直线逐步移动，逐点采样 .open
    const steps = 30
    let lost = 0
    let firstLost = -1
    let hoveredPanel = false
    for (let i = 1; i <= steps; i++) {
      const x = item.cx + ((opened.panelCx - item.cx) * i) / steps
      const y = item.cy + ((opened.panelCy - item.cy) * i) / steps
      await page.mouse.move(x, y)
      const s = await readState()
      if (s.panelHover) hoveredPanel = true
      if (!s.open) {
        lost++
        if (firstLost === -1) firstLost = i
      }
    }
    expect(lost, `面板中途收起 ${lost}/${steps} 点（首丢第 ${firstLost} 步）——hover 断链`).toBe(0)
    expect(hoveredPanel, '指针应最终进入面板盒（桥接生效，而非面板从未展开）').toBe(true)
  })
}

// ===== RTL + dark 实测（菜单族定位修复复测）=====
// RTL 水平模式：一级面板书写起点侧 = 物理右缘 → 未回折时右缘贴父项右缘、向左展开；
// 回折（flip-left 的逻辑 inset 镜像）时左缘贴父项右缘、向右展开。两端点父项都要覆盖，
// 且两种情况都不越 .menu 的裁切盒（overflow-x: clip）。light/dark 各一遍（dark 另查对比度）。
for (const theme of ['light', 'dark'] as const) {
  test(`menu 水平 RTL（${theme}）：第 1 个与最后 1 个父项面板贴父项右缘 ≤2px、不越 .menu 盒`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/components/menu.html', { waitUntil: 'domcontentloaded' })
    await up(page, 'oas-menu')
    await page.evaluate((dark) => {
      document.documentElement.setAttribute('dir', 'rtl')
      document.documentElement.classList.toggle('dark', dark)
    }, theme === 'dark')
    const data = await page.evaluate(async () => {
      const h = document.createElement('oas-menu')
      h.id = 'zz-menu-rtl-ends'
      h.setAttribute('mode', 'horizontal')
      h.style.cssText = 'position: fixed; top: 140px; left: 40px; width: 280px; z-index: 9999'
      h.setAttribute(
        'items',
        JSON.stringify([
          {
            label: '首页',
            value: 'home',
            children: [
              { label: '常见问题', value: 'faq' },
              { label: '在线客服', value: 'chat' },
            ],
          },
          { label: '产品中心', value: 'products' },
          {
            label: '帮助中心',
            value: 'help',
            children: [
              { label: '使用指南', value: 'guide' },
              { label: '接口文档', value: 'api' },
            ],
          },
        ]),
      )
      document.body.appendChild(h)
      await new Promise((r) => setTimeout(r, 400))
      const menuEl = h.shadowRoot!.querySelector<HTMLElement>('.menu')!
      const measure = async (v: string) => {
        const li = menuEl.querySelector<HTMLElement>(`:scope > [part="item"][data-value="${v}"]`)!
        li.dispatchEvent(new MouseEvent('mouseenter'))
        await new Promise((r) => setTimeout(r, 260))
        const sub = li.querySelector<HTMLElement>(':scope > .submenu')!
        const mr = menuEl.getBoundingClientRect()
        const ir = li.getBoundingClientRect()
        const sr = sub.getBoundingClientRect()
        const cs = getComputedStyle(sub)
        const parse = (c: string) => c.match(/\d+/g)!.slice(0, 3).map(Number)
        const lum = (rgb: number[]) => {
          const f = (n: number) => {
            n /= 255
            return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4
          }
          return 0.2126 * f(rgb[0]!) + 0.7152 * f(rgb[1]!) + 0.0722 * f(rgb[2]!)
        }
        const a = lum(parse(cs.color))
        const b = lum(parse(cs.backgroundColor))
        return {
          v,
          boxLeft: Math.round(mr.left),
          boxRight: Math.round(mr.right),
          itemRight: Math.round(ir.right),
          panelLeft: Math.round(sr.left),
          panelRight: Math.round(sr.right),
          flip: sub.classList.contains('flip-left'),
          dStart: Math.round(sr.right - ir.right), // 未回折：面板右缘应贴父项右缘
          dFlip: Math.round(sr.left - ir.right), // 回折：面板左缘应贴父项右缘
          color: cs.color,
          bg: cs.backgroundColor,
          ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
        }
      }
      // 第 1 个父项（RTL 最右）；量完 hover 无子级的「产品中心」收起
      const first = await measure('home')
      menuEl
        .querySelector<HTMLElement>(':scope > [part="item"][data-value="products"]')!
        .dispatchEvent(new MouseEvent('mouseenter'))
      await new Promise((r) => setTimeout(r, 140))
      // 最后 1 个父项（RTL 最左）
      const last = await measure('help')
      return { first, last, dataRtl: h.hasAttribute('data-rtl') }
    })
    expect(data.dataRtl, 'RTL 镜像开关应同步').toBe(true)
    // 第 1 个父项（RTL 最右）：向左展开空间充足 → 不回折，右缘贴父项右缘
    expect(data.first.flip, 'RTL 最右父项向左展开不越盒 → 不应回折').toBe(false)
    expect(
      Math.abs(data.first.dStart),
      `RTL 未回折：面板右缘应贴父项右缘（偏差 ${data.first.dStart}px）`,
    ).toBeLessThanOrEqual(2)
    // 最后 1 个父项（RTL 最左）：向左展开越盒 → 回折，左缘贴父项右缘
    expect(data.last.flip, 'RTL 最左父项向左展开越 .menu 左缘 → 应回折').toBe(true)
    expect(
      Math.abs(data.last.dFlip),
      `RTL 回折：面板左缘应贴父项右缘（偏差 ${data.last.dFlip}px）`,
    ).toBeLessThanOrEqual(2)
    for (const r of [data.first, data.last]) {
      expect(r.panelLeft, `RTL「${r.v}」面板左缘 ${r.panelLeft} 越出 .menu 盒左缘 ${r.boxLeft}`).toBeGreaterThanOrEqual(
        r.boxLeft,
      )
      expect(r.panelRight, `RTL「${r.v}」面板右缘 ${r.panelRight} 越出 .menu 盒右缘 ${r.boxRight}`).toBeLessThanOrEqual(
        r.boxRight,
      )
      expect(r.ratio, `${theme} 面板文字 ${r.color} 对底色 ${r.bg} 对比度`).toBeGreaterThanOrEqual(4.5)
    }
    // 截图留档：RTL 回折态（最后 1 个父项「帮助中心」）
    await page.evaluate(async () => {
      const h = document.querySelector('#zz-menu-rtl-ends')!
      const menuEl = h.shadowRoot!.querySelector<HTMLElement>('.menu')!
      const li = menuEl.querySelector<HTMLElement>(':scope > [part="item"][data-value="help"]')!
      li.dispatchEvent(new MouseEvent('mouseenter'))
      await new Promise((r) => setTimeout(r, 300))
    })
    await page.screenshot({ path: `test-results/visual-review/menu-rtl-flip-${theme}.png` })
  })
}

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
    const items = [...root.querySelectorAll<HTMLElement>(':scope > [part="item"][data-value]:not(.menu-more)')]
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
    const visibleChecked = [...root.querySelectorAll<HTMLElement>(':scope > [part="item"]:not(.menu-more)')]
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

// ===== close-on-select 布尔语义（demo 实结构核对）=====
// 布尔属性约定「存在即真（含空值），仅显式 "false" 关闭」：
// 缺省按形态（inline 不收 / 浮出收）。docs 无空值 demo（menu-keep-open/inline-close 分别是
// 显式 "false"/"true"），空串存在即真由单测覆盖，此处不硬造。

test('menu close-on-select="false"（menu-keep-open demo）：点叶子后子菜单保持展开（连选场景）', async ({ page }) => {
  await page.goto('/components/menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#menu-keep-open')
  // 浮出形态子菜单靠 hover 展开（对齐本文件既有三级链用例的交互惯例）
  await page.locator('#menu-keep-open [part="item"][data-value="edit"]').hover()
  const leaf = page.locator('#menu-keep-open [part="item"][data-value="copy"]')
  await leaf.waitFor({ state: 'visible' })
  await leaf.click()
  await page.waitForTimeout(200)
  const r = await page.evaluate(() => {
    const menu = document.querySelector('#menu-keep-open')!
    const parent = menu.shadowRoot!.querySelector('[part="item"][data-value="edit"]')
    return {
      open: parent?.classList.contains('open') ?? false,
      expanded: parent?.getAttribute('aria-expanded'),
      value: menu.getAttribute('value'),
    }
  })
  expect(r.open, 'close-on-select="false" 点叶子后子菜单应保持展开').toBe(true)
  expect(r.expanded, '父级 aria-expanded 应保持 true').toBe('true')
  expect(r.value, '选中值应写回 copy').toBe('copy')
})

test('menu inline + close-on-select="true"（menu-inline-close demo）：点叶子后收起父级子菜单', async ({ page }) => {
  await page.goto('/components/menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#menu-inline-close')
  await page.locator('#menu-inline-close [data-value="dash"]').click()
  await page.waitForTimeout(200)
  await page.locator('#menu-inline-close [data-value="dash-overview"]').click()
  await page.waitForTimeout(200)
  const r = await page.evaluate(() => {
    const menu = document.querySelector('#menu-inline-close')!
    const sub = menu.shadowRoot!.querySelector('.inline-sub[data-parent="dash"]')
    return { open: sub?.classList.contains('open') ?? false, value: menu.getAttribute('value') }
  })
  expect(r.open, 'inline + close-on-select="true" 点叶子后应收起父级子菜单').toBe(false)
  expect(r.value, '选中值应写回 dash-overview').toBe('dash-overview')
})

// 移动端专项 P2 回归：coarse pointer 下浮层交互行触摸目标 ≥44px（iPhone 触屏仿真）
test.describe('触摸目标（P2，iPhone 仿真）', () => {
  // iPhone 13 触屏仿真（defaultBrowserType 不可在 describe 内 use，逐项展开）
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  })

  test('coarse pointer 下菜单项渲染高度 ≥44px（--oas-touch-target-min）', async ({ page }) => {
    await page.goto('/components/menu.html', { waitUntil: 'domcontentloaded' })
    await up(page, 'oas-menu')
    const menu = page.locator('oas-menu').first()
    await menu.scrollIntoViewIfNeeded()
    const heights = await page.evaluate(() => {
      const m = document.querySelector('oas-menu')!
      return [...m.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')]
        .filter((el) => el.getBoundingClientRect().height > 0)
        .map((el) => el.getBoundingClientRect().height)
    })
    expect(heights.length, '页面应渲染出可见菜单项').toBeGreaterThan(0)
    for (const h of heights) {
      expect(h, `触屏下菜单项高度 ${h}px 应 ≥44px`).toBeGreaterThanOrEqual(44)
    }
  })
})
