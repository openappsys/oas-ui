// 复核回归：flex——弹性布局基元首份回归固化。
// 覆盖：justify/align 简写 → flex 值映射落点、wrap/vertical 机制、间距像素、
// 主轴分布与纵向堆叠的子项几何（不只看内联样式，还看真实布局位置）。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('flex 属性落点：justify/align 简写映射、wrap、vertical、gap 全部写到内部 wrap 布局', async ({ page }) => {
  await page.goto('/components/flex.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-flex[justify="between"]')
  const r = await page.evaluate(() => {
    const cs = (sel: string) => {
      const wrap = document.querySelector(sel)!.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement
      return getComputedStyle(wrap)
    }
    return {
      between: cs('oas-flex[justify="between"]').justifyContent,
      evenly: cs('oas-flex[justify="evenly"]').justifyContent,
      alignEnd: cs('oas-flex[align="end"]').alignItems,
      vertical: cs('oas-flex[vertical]').flexDirection,
      wrapped: cs('oas-flex[wrap]').flexWrap,
      gap: cs('oas-flex[gap="12px"]').columnGap,
    }
  })
  expect(r.between, 'justify="between" 简写 → space-between').toBe('space-between')
  expect(r.evenly, 'justify="evenly" 简写 → space-evenly').toBe('space-evenly')
  expect(r.alignEnd, 'align="end" → flex-end').toBe('flex-end')
  expect(r.vertical, 'vertical 布尔 → column').toBe('column')
  expect(r.wrapped, 'wrap 布尔 → flex-wrap: wrap').toBe('wrap')
  expect(r.gap, 'gap="12px" → 12px 间距').toBe('12px')
})

test('flex 几何：justify="end" 子项贴容器尾缘，vertical 子项纵向堆叠不横排', async ({ page }) => {
  await page.goto('/components/flex.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-flex[justify="end"]')
  const r = await page.evaluate(() => {
    const geom = (sel: string) => {
      const host = document.querySelector(sel) as HTMLElement
      const wrap = host.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement
      const items = [...host.querySelectorAll<HTMLElement>(':scope > *')]
      const wr = wrap.getBoundingClientRect()
      const rects = items.map((i) => i.getBoundingClientRect())
      return { wr, rects }
    }
    const end = geom('oas-flex[justify="end"]')
    const v = geom('oas-flex[vertical]')
    return {
      endRightAligned: Math.abs(end.rects[end.rects.length - 1]!.right - end.wr.right) < 1.5,
      vStacked: v.rects.length >= 2 && v.rects[1]!.top >= v.rects[0]!.bottom - 0.5,
      vSameColumn: v.rects.every((r) => Math.abs(r.left - v.rects[0]!.left) < 0.5),
    }
  })
  expect(r.endRightAligned, 'justify="end" 末个子项应贴容器尾缘').toBe(true)
  expect(r.vStacked, 'vertical 子项应纵向堆叠').toBe(true)
  expect(r.vSameColumn, 'vertical 子项应左缘对齐').toBe(true)
})
