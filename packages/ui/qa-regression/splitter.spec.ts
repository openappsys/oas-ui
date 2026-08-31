// 复核回归：splitter——历史缺陷固化断言。

import { test, expect } from '@playwright/test'

test('oas-splitter + sidebar：拖拽分割条 sidebar 宽度实时跟随（不被窄面板遮住）', async ({
  page,
}) => {
  await page.goto('/components/sidebar.html', { waitUntil: 'domcontentloaded' })
  // 等 splitter 与其内部 sidebar 升级
  await page.waitForFunction(
    () => {
      const sp = document.querySelector('oas-splitter')
      const sb = sp?.querySelector('oas-sidebar')
      return sp?.shadowRoot != null && sb?.shadowRoot != null
    },
    undefined,
    { timeout: 15000 },
  )
  const r = await page.evaluate(async () => {
    const sp = document.querySelector('oas-splitter')!
    const sb = sp.querySelector('oas-sidebar')! as HTMLElement
    sp.scrollIntoView({ block: 'center' })
    await new Promise((res) => setTimeout(res, 300))
    const handle = sp.shadowRoot!.querySelector('[part="splitter"]') as HTMLElement
    const rect = handle.getBoundingClientRect()
    const cx = rect.x + rect.width / 2
    const cy = rect.y + rect.height / 2
    const w0 = Math.round(sb.getBoundingClientRect().width)
    const inlineVar0 = sb.style.getPropertyValue('--oas-sidebar-width')
    handle.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy, button: 0 }),
    )
    const widths: number[] = []
    for (let i = 1; i <= 4; i++) {
      document.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, clientX: cx + i * 30, clientY: cy }),
      )
      await new Promise((res) => setTimeout(res, 60))
      widths.push(Math.round(sb.getBoundingClientRect().width))
    }
    document.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, clientX: cx + 120, clientY: cy }),
    )
    return { w0, widths, inlineVar0, percentAfter: sp.getAttribute('percent') }
  })
  // width="100%" 属性存活（update 不清除），sidebar 填满左面板
  expect(r.inlineVar0, 'sidebar 应保留 width=100%（不被 update 清掉）').toBe('100%')
  // 左面板 22%（splitter 宽 638 级），sidebar 不应是默认 220px 固定宽被遮住
  expect(r.w0, 'sidebar 初宽应≈左面板宽（220px 以下，非固定 220px 被遮）').toBeLessThan(220)
  // 拖拽中宽度实时变化且单调递增
  expect(r.widths.length, '拖拽采样应有宽度读数').toBeGreaterThan(0)
  const finalW = r.widths[r.widths.length - 1]!
  expect(finalW, '拖拽后 sidebar 应变宽').toBeGreaterThan(r.w0)
  const mono = r.widths.every((w, i) => i === 0 || w >= r.widths[i - 1]!)
  expect(mono, '拖拽过程宽度应单调不减小').toBe(true)
  expect(r.percentAfter, 'percent 应随拖拽增大').not.toBe('22')
})

// —— 缺陷回归：sidebar resizable 边缘拖拽调宽（内置 rail 形态） ——
// 设计定夺：拖拽调宽内置（resizable rail）优于 splitter 组合（组合有 width="100%" 写法
// 门槛 + 强制 split-pane 布局）。本断言真实拖拽 rail 边缘，验证宽度实时跟随并写回 width 属性。