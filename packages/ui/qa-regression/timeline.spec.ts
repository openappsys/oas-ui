// 复核回归：timeline——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('timeline 圆点中心与连接线中心对齐', async ({ page }) => {
  // 曾现 bug：.dot 未设 box-sizing，content-box 下总宽 14px 圆心 7px，线心 5px，偏右 2px。
  // 结构演进：行已自包含（v2.4），圆点/连接线在 oas-timeline-item 各自 shadow 的 axis 列内。
  await page.goto('/components/timeline.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-timeline-item')
  const r = await page.evaluate(() => {
    const item = document.querySelector('oas-timeline-item')!.shadowRoot!
    const dot = item.querySelector('[part="dot"]')!
    const axis = item.querySelector('[part="axis"]')!
    const dotBox = dot.getBoundingClientRect()
    const axisBox = axis.getBoundingClientRect()
    return {
      diff: Math.abs(dotBox.left + dotBox.width / 2 - (axisBox.left + 5)),
      dotWidth: dotBox.width,
    }
  })
  expect(r.dotWidth).toBe(10)
  expect(r.diff).toBeLessThanOrEqual(1)
})

test('timeline 实心圆点与连接线无缝衔接 + icon/描边变体不错位', async ({ page }) => {
  // 用户实测缺陷：①圆点 2px 底色描边让彩色圆心止于 12px、连接线 14px 起笔 → 2px 视觉断口；
  // ②icon/自定义节点宽于圆点盒时中心偏离线心。修复：实心点去描边（线触点底缘）、
  // icon/custom 中心锚定圆点心、outlined/pending 补全 border 简写（原只设 border-color 依赖基础描边）。
  await page.goto('/components/timeline.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-timeline-item')
  const r = await page.evaluate(() => {
    // 基础 demo 第一个 item（实心圆点）
    const first = document.querySelector('oas-timeline-item')!.shadowRoot!
    const dot = first.querySelector('[part="dot"]')!
    const axis = first.querySelector('[part="axis"]')!
    const dotBox = dot.getBoundingClientRect()
    const axisBox = axis.getBoundingClientRect()
    // 连接线是 axis::after（top:14px 起笔）——用 computed 读伪元素 top/height
    const after = getComputedStyle(axis, '::after')
    // icon 节点 demo（自定义节点节的 icon item）
    const iconItem = [...document.querySelectorAll('oas-timeline-item')].find((el) =>
      el.shadowRoot!.querySelector('[part="dot"][data-icon]'),
    )
    let iconDiff: number | null = null
    if (iconItem) {
      const isr = iconItem.shadowRoot!
      const iDot = isr.querySelector('[part="dot"]')!.getBoundingClientRect()
      const iAxis = isr.querySelector('[part="axis"]')!.getBoundingClientRect()
      iconDiff = Math.abs(iDot.left + iDot.width / 2 - (iAxis.left + 5))
    }
    return {
      dotBottom: dotBox.bottom,
      dotTop: dotBox.top,
      lineTop: axisBox.top + parseFloat(after.top),
      iconDiff,
      dotBorder: getComputedStyle(dot).borderWidth,
    }
  })
  expect(r.dotBorder, '实心圆点无描边（描边会造视觉断口）').toBe('0px')
  expect(Math.abs(r.dotBottom - r.lineTop), '圆点底缘 = 连接线起笔（无缝）').toBeLessThanOrEqual(1)
  if (r.iconDiff !== null) {
    expect(r.iconDiff, 'icon 节点中心与连接线同轴').toBeLessThanOrEqual(1)
  }
})
