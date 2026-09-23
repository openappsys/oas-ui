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
