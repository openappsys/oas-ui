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
  await page.screenshot({ path: 'C:\\WINDOWS\\TEMP\\opencode\\fix8-menu-flip.png' })
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
