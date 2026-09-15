// RTL 第二批回归：方向键镜像 + 面板逻辑属性（dir=rtl 真实渲染断言）。
// 机制单测覆盖键盘逻辑与 transform 字符串；此处验证浏览器 computed style 下
// 逻辑属性按方向正确解析、真实键盘事件按视觉方向换向。
// 约定守卫（conventions.test.ts）管「不再新增物理 CSS」；此处管「逻辑化后在 RTL 真的可用了」。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('stepper：dir=rtl 下 ArrowRight 移向上一步（真实键盘事件）', async ({ page }) => {
  await page.goto('/components/stepper.html', { waitUntil: 'load' })
  await up(page, 'oas-stepper')
  await page.evaluate(() => {
    const el = document.querySelector('oas-stepper') as HTMLElement
    el.setAttribute('dir', 'rtl')
    const list = Array.from(el.shadowRoot?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [])
    list[1]?.focus()
  })
  await page.keyboard.press('ArrowRight')
  // 焦点断言：ArrowRight 在 RTL 下应移到上一步（DOM 前项）
  const focusedIdx = await page.evaluate(() => {
    const el = document.querySelector('oas-stepper') as HTMLElement & { shadowRoot: ShadowRoot }
    const list = Array.from(el.shadowRoot.querySelectorAll<HTMLElement>('[role="tab"]'))
    return list.findIndex((t) => t === el.shadowRoot.activeElement)
  })
  expect(focusedIdx).toBe(0)
})

test('menu：dir=rtl 下图标间距逻辑属性镜像（inline-end → 物理左）', async ({ page }) => {
  await page.goto('/components/menu.html', { waitUntil: 'load' })
  await up(page, 'oas-menu')
  const margins = await page.evaluate(() => {
    const el = document.querySelector('oas-menu') as HTMLElement
    el.setAttribute('dir', 'rtl')
    const icon = el.shadowRoot?.querySelector('.item .icon') as HTMLElement | null
    if (!icon) return null
    const cs = getComputedStyle(icon)
    return { left: cs.marginLeft, right: cs.marginRight }
  })
  // LTR 下 icon margin-right: 8px；RTL 下 margin-inline-end 翻到物理左
  expect(margins, 'menu icon 未找到').not.toBeNull()
  expect(margins!.right).toBe('0px')
  expect(margins!.left).toBe('8px')
})

test('dropdown split：dir=rtl 下接缝/外侧圆角随方向翻转', async ({ page }) => {
  await page.goto('/components/dropdown.html', { waitUntil: 'load' })
  await up(page, 'oas-dropdown[split]')
  const radii = await page.evaluate(() => {
    const el = document.querySelector('oas-dropdown[split]') as HTMLElement
    el.setAttribute('dir', 'rtl')
    const btn = el.shadowRoot?.querySelector('[part="arrow-btn"], .arrow-btn') as HTMLElement | null
    if (!btn) return null
    const cs = getComputedStyle(btn)
    return { topLeft: cs.borderTopLeftRadius, topRight: cs.borderTopRightRadius }
  })
  expect(radii, 'split 按钮未找到').not.toBeNull()
  // LTR：接缝在左（topLeft=0）、外侧圆角在右；RTL 镜像后相反
  expect(radii!.topLeft).not.toBe('0px')
  expect(radii!.topRight).toBe('0px')
})
