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
  await page.waitForTimeout(200)
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
  await page.waitForTimeout(300)
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
