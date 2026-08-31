// 复核回归：sidebar——历史缺陷固化断言。

import { test, expect } from '@playwright/test'

test('sidebar resizable：拖拽 rail 边缘宽度实时跟随并写回 width 属性（内置 rail）', async ({
  page,
}) => {
  await page.goto('/components/sidebar.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => document.querySelector('#sidebar-resizable')?.shadowRoot != null,
    undefined,
    { timeout: 15000 },
  )
  const r = await page.evaluate(async () => {
    const sb = document.querySelector('#sidebar-resizable') as HTMLElement
    sb.scrollIntoView({ block: 'center' })
    await new Promise((res) => setTimeout(res, 300))
    const rail = sb.shadowRoot!.querySelector('[part="rail"]') as HTMLElement
    const rect = rail.getBoundingClientRect()
    const cx = rect.x + rect.width / 2
    const cy = rect.y + rect.height / 2
    const w0 = Math.round(sb.getBoundingClientRect().width)
    rail.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy, button: 0 }),
    )
    const widths: number[] = []
    for (let i = 1; i <= 3; i++) {
      document.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, clientX: cx + i * 30, clientY: cy }),
      )
      await new Promise((res) => setTimeout(res, 60))
      widths.push(Math.round(sb.getBoundingClientRect().width))
    }
    document.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, clientX: cx + 90, clientY: cy }),
    )
    await new Promise((res) => setTimeout(res, 200))
    return {
      w0,
      widths,
      widthAttr: sb.getAttribute('width'),
      logText: document.getElementById('sidebar-resize-log')?.textContent ?? '',
      railHidden: rail.hidden,
    }
  })
  expect(r.railHidden, 'resizable 态 rail 应显示').toBe(false)
  expect(r.w0, '初始宽度应为 220（width 属性值）').toBe(220)
  expect(r.widths.length, '拖拽采样应有宽度读数').toBe(3)
  const mono = r.widths.every((w, i) => i === 0 || w > r.widths[i - 1]!)
  expect(mono, '拖拽过程宽度应单调递增').toBe(true)
  expect(r.widths[2], '拖拽后宽度应增大').toBeGreaterThan(r.w0)
  expect(r.widthAttr, '拖拽应写回 width 属性').toBe(`${r.widths[2]}px`)
  expect(r.logText, 'oas-resize 事件应更新 demo 日志').toContain(`${r.widths[2]}px`)
})
// —— 缺陷回归：sidebar 嵌套子菜单 label 缩进对齐（不得与父项齐平/更靠左） ——
// 曾现缺陷：嵌套无图标项 icon 占位被 hidden 折叠，子项 label 与父项 label 齐平甚至偏左
//（实测子 label 比父 label 左 3px），层级错乱。修复：嵌套无图标项保留图标占位（24px），
// 子项 label 缩进父项 label 右侧。本断言真布局测量 label x 坐标。
test('sidebar 嵌套子菜单：无图标子项 label 缩进父项 label 右侧（层级不错乱）', async ({ page }) => {
  await page.goto('/components/sidebar.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => document.querySelector('oas-sidebar[active="users"]')?.shadowRoot != null,
    undefined,
    { timeout: 15000 },
  )
  const r = await page.evaluate(() => {
    const sb = document.querySelector('oas-sidebar[active="users"]')!
    const items = [...sb.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')]
    const parent = items.find((i) => i.dataset.value === 'biz')!
    const child = items.find((i) => i.dataset.value === 'orders')!
    const parentLabelX = parent.querySelector('.label')!.getBoundingClientRect().left
    const childLabelX = child.querySelector('.label')!.getBoundingClientRect().left
    const childIcon = child.querySelector('.icon') as HTMLElement
    return {
      parentLabelX: Math.round(parentLabelX),
      childLabelX: Math.round(childLabelX),
      indent: Math.round(childLabelX - parentLabelX),
      childIconHidden: childIcon.hidden,
      childIconWidth: Math.round(childIcon.getBoundingClientRect().width),
    }
  })
  expect(r.childIconHidden, '嵌套无图标项图标占位不应隐藏').toBe(false)
  expect(r.childIconWidth, '嵌套图标占位应保留宽度').toBeGreaterThan(0)
  expect(r.indent, '子项 label 应缩进父项 label 右侧（不得齐平/更靠左）').toBeGreaterThan(0)
})
test('sidebar 嵌套父项点击折叠子菜单：hidden 真实隐藏（grid 0fr + visibility 动画机制，真实视觉断言）', async ({
  page,
}) => {
  // 历史根因：.submenu{display:flex} 作者级规则压过 UA [hidden]{display:none}（只改属性不改渲染）；
  // 现行机制：grid-template-rows 0fr/1fr 平滑过渡 + visibility 联动（收起时出渲染树防聚焦）。
  // 本断言量 computed visibility 与高度（真实视觉），不是只查 hidden 属性。
  await page.goto('/components/sidebar.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => document.querySelector('#sidebar-decl')?.shadowRoot != null,
    undefined,
    { timeout: 15000 },
  )
  const r = await page.evaluate(async () => {
    const host = document.getElementById('sidebar-decl') as HTMLElement
    const biz = [...host.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')].find(
      (i) => i.dataset.value === 'biz',
    )!
    const sub = () => host.shadowRoot!.querySelector('[part="submenu"]') as HTMLElement
    const visibility = () => getComputedStyle(sub()).visibility
    const before = { aria: biz.getAttribute('aria-expanded'), visibility: visibility() }
    biz.click()
    await new Promise((r2) => setTimeout(r2, 500))
    const afterClick = {
      aria: biz.getAttribute('aria-expanded'),
      visibility: visibility(),
      rectH: Math.round(sub().getBoundingClientRect().height),
    }
    biz.click()
    await new Promise((r2) => setTimeout(r2, 500))
    const afterReclick = {
      aria: biz.getAttribute('aria-expanded'),
      visibility: visibility(),
      rectH: Math.round(sub().getBoundingClientRect().height),
    }
    return { before, afterClick, afterReclick }
  })
  expect(r.before.aria).toBe('true') // 激活子项自动展开
  expect(r.before.visibility).toBe('visible')
  expect(r.afterClick.aria, '点击后 aria-expanded 应收起').toBe('false')
  // grid 0fr + visibility 动画机制（平滑过渡）：收起后 visibility:hidden + 高度 0（真实视觉隐藏且防聚焦）
  expect(r.afterClick.visibility, '点击后子菜单应 visibility:hidden（真实视觉隐藏）').toBe('hidden')
  expect(r.afterClick.rectH, '隐藏后子菜单高度应为 0').toBe(0)
  expect(r.afterReclick.aria, '再点应重新展开').toBe('true')
  expect(r.afterReclick.visibility).toBe('visible')
  expect(r.afterReclick.rectH, '再展开后子菜单高度应恢复').toBeGreaterThan(0)
})
