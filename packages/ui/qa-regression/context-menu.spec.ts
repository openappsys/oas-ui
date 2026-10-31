// 复核回归：context-menu——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up, visibleSubmenuRects } from './helpers'

test('context-menu 多级子菜单贴近视口右缘：翻转后全部落在视口内', async ({ page }) => {
  await page.goto('/components/context-menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-context-menu')
  // 把「多级子菜单」demo 平移到视口右缘（fixed + 高 z-index），右键点在右缘附近
  await page.evaluate(() => {
    const cm = [...document.querySelectorAll('oas-context-menu')].find((el) =>
      el.getAttribute('items')?.includes('"children"'),
    ) as HTMLElement
    cm.style.cssText = 'position: fixed; right: 0; top: 260px; z-index: 9999'
    cm.dataset.e2eRightEdge = '1'
  })
  const box = await page.locator('oas-context-menu[data-e2e-right-edge]').boundingBox()
  await page.mouse.click(box!.x + box!.width - 12, box!.y + 60, { button: 'right' })
  // 逐级展开两级子菜单链：新建 → 项目 →（Git 仓库/空白）
  await page.locator('oas-context-menu[data-e2e-right-edge] [part="item"][data-value="new"]').hover({ timeout: 5000 })
  await page
    .locator('oas-context-menu[data-e2e-right-edge] [part="item"][data-value="new-project"]')
    .hover({ timeout: 5000 })
  // 级联展开完成的真实信号：可见子菜单 ≥2（即断言条件本身）
  await expect.poll(async () => (await visibleSubmenuRects(page)).length).toBeGreaterThanOrEqual(2)
  const rects = await visibleSubmenuRects(page)
  expect(rects.length).toBeGreaterThanOrEqual(2) // 一级 + 二级子菜单均已展开
  expect(
    rects.some((r) => r.flipLeft),
    '贴右缘的子菜单应向左翻转（flip-left），而非被裁掉',
  ).toBe(true)
  for (const r of rects) {
    expect(r.left, `子菜单 left=${r.left} 越出视口左缘`).toBeGreaterThanOrEqual(-1)
    expect(r.right, `子菜单 right=${r.right} 越出视口右缘`).toBeLessThanOrEqual(r.vw + 1)
    expect(r.top, `子菜单 top=${r.top} 越出视口上缘`).toBeGreaterThanOrEqual(-1)
    expect(r.bottom, `子菜单 bottom=${r.bottom} 越出视口下缘`).toBeLessThanOrEqual(r.vh + 1)
  }
  await page.screenshot({ path: test.info().outputPath('fix8-context-menu-flip.png') })
})

// —— 缺陷回归（demo 实抓）：kind=checkbox 勾选项 value 链路断裂 ——
// 修复前：宿主 value 不下传内层 menu（初始勾选不回显）、勾选切换不写回宿主、勾选即关菜单
test('context-menu kind=checkbox：初始勾选回显 + 勾选写回宿主 value + 切换不收起', async ({ page }) => {
  await page.goto('/components/context-menu.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cm-kind')
  await page.evaluate(() => document.getElementById('cm-kind')!.scrollIntoView({ block: 'center' }))
  // 滚动静默的真实信号：连续两次 scrollY 一致（smooth 滚动结束后右键坐标才可用）
  let prevCmSY: number | null = null
  await expect
    .poll(async () => {
      const y = await page.evaluate(() => window.scrollY)
      const stable = prevCmSY !== null && y === prevCmSY
      prevCmSY = y
      return stable
    })
    .toBe(true)
  const r = await page.evaluate(async () => {
    const el = document.getElementById('cm-kind')!
    const area = el.firstElementChild as HTMLElement
    const rect = area.getBoundingClientRect()
    area.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 100,
        clientY: rect.top + 50,
      }),
    )
    await new Promise((r) => setTimeout(r, 500))
    const menu = el.shadowRoot!.querySelector('oas-menu')!
    const items = [...menu.shadowRoot!.querySelectorAll<HTMLElement>('[role="menuitemcheckbox"]')]
    const gridChecked = items.find((i) => i.textContent?.includes('网格'))?.getAttribute('aria-checked')
    items.find((i) => i.textContent?.includes('标尺'))!.click()
    await new Promise((r) => setTimeout(r, 200))
    return {
      gridChecked,
      afterValue: el.getAttribute('value'),
      stillOpen: el.hasAttribute('open'),
      out: document.getElementById('cm-kind-out')?.textContent ?? '',
    }
  })
  expect(r.gridChecked, '初始 value=["grid"] 应回显勾选').toBe('true')
  expect(r.afterValue, '勾选标尺写回宿主 value').toBe('["grid","ruler"]')
  expect(r.stillOpen, 'checkbox 切换不收起菜单').toBe(true)
  expect(r.out, 'demo 反馈可见').toContain('ruler')
})

// ===== 反馈 #4：打开后不移焦、方向键不可用、Esc 不回焦 =====
test('context-menu：打开后焦点入菜单、ArrowDown 高亮、Esc 关闭回焦触发源', async ({ page }) => {
  await page.goto('/components/context-menu.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!customElements.get('oas-context-menu'))
  await page.evaluate(() => {
    document.getElementById('e2e-cm-kbd')?.remove()
    const cm = document.createElement('oas-context-menu')
    cm.id = 'e2e-cm-kbd'
    cm.setAttribute(
      'items',
      JSON.stringify([
        { label: '复制', value: 'copy' },
        { label: '粘贴', value: 'paste' },
      ]),
    )
    const area = document.createElement('div')
    area.id = 'e2e-cm-area'
    area.tabIndex = 0
    area.textContent = '右键区域'
    area.style.cssText = 'width:220px;height:80px'
    cm.appendChild(area)
    cm.style.cssText = 'position: fixed; top: 120px; left: 50%; transform: translateX(-50%); z-index: 2147483000'
    document.body.appendChild(cm)
  })

  await page.locator('#e2e-cm-area').click({ button: 'right' })
  await page.waitForFunction(() => document.querySelector('oas-context-menu#e2e-cm-kbd')?.hasAttribute('open'))

  const focusIn = await page.evaluate(() => {
    const cm = document.querySelector('oas-context-menu#e2e-cm-kbd')! as HTMLElement & { shadowRoot: ShadowRoot }
    const menu = cm.shadowRoot.querySelector('oas-menu') as (HTMLElement & { shadowRoot: ShadowRoot }) | null
    const list = menu?.shadowRoot.activeElement as HTMLElement | null
    return { inMenu: !!list, role: list?.getAttribute('role') ?? null }
  })
  expect(focusIn.inMenu, '右键打开后焦点必须进入菜单').toBe(true)
  expect(focusIn.role).toBe('menu')

  await page.keyboard.press('ArrowDown')
  await page.waitForFunction(() => {
    const cm = document.querySelector('oas-context-menu#e2e-cm-kbd')! as HTMLElement & { shadowRoot: ShadowRoot }
    const menu = cm.shadowRoot.querySelector('oas-menu') as (HTMLElement & { shadowRoot: ShadowRoot }) | null
    return !!menu?.shadowRoot.querySelector('[part="item"].active')
  })

  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.querySelector('oas-context-menu#e2e-cm-kbd')?.hasAttribute('open'))
  expect(await page.evaluate(() => document.activeElement?.id ?? null), 'Esc 关闭后回焦右键触发源').toBe('e2e-cm-area')
})
