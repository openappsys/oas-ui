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
    // 找一个 LTR 基线 margin-right: 8px 的图标项（同一元素翻转前后对比，排除无间距形态干扰）。
    // 注意：menu 观察 dir，翻转后整树重渲染——必须重新查询元素再读计算样式（旧引用已 detach）
    const hosts = Array.from(document.querySelectorAll<HTMLElement>('oas-menu'))
    for (const el of hosts) {
      const icon = el.shadowRoot?.querySelector('.item .icon') as HTMLElement | null
      if (!icon) continue
      if (getComputedStyle(icon).marginRight !== '8px') continue
      const ltr = { right: getComputedStyle(icon).marginRight, left: getComputedStyle(icon).marginLeft }
      el.setAttribute('dir', 'rtl')
      const fresh = el.shadowRoot?.querySelector('.item .icon') as HTMLElement | null
      if (!fresh) return null
      const rtl = { right: getComputedStyle(fresh).marginRight, left: getComputedStyle(fresh).marginLeft }
      el.removeAttribute('dir')
      return { ltr, rtl }
    }
    return null
  })
  expect(margins, 'menu 页未找到带 8px 间距图标的菜单项').not.toBeNull()
  // 逻辑属性 margin-inline-end：LTR 落物理右、RTL 翻到物理左
  expect(margins!.ltr).toEqual({ right: '8px', left: '0px' })
  expect(margins!.rtl).toEqual({ right: '0px', left: '8px' })
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

test('stepper：dir=rtl 下横向连接线锚点镜像（::after 计算 left→auto / right→50%）', async ({ page }) => {
  await page.goto('/components/stepper.html', { waitUntil: 'load' })
  await up(page, 'oas-stepper')
  const probe = await page.evaluate(() => {
    const el = document.querySelector('oas-stepper') as HTMLElement & { shadowRoot: ShadowRoot }
    const read = () => {
      const step = el.shadowRoot.querySelector('.tab')
      if (!step) return null
      const cs = getComputedStyle(step, '::after')
      return { left: cs.left, right: cs.right, width: cs.width }
    }
    el.removeAttribute('dir')
    const ltr = read()
    el.setAttribute('dir', 'rtl')
    const rtl = read()
    el.removeAttribute('dir')
    return { ltr, rtl }
  })
  expect(probe.ltr, 'stepper 步骤未找到').not.toBeNull()
  // inset-inline-start: 50%（computed 已解析为 px）：LTR 线自中点向右延伸（left 正 / right 负），
  // RTL 镜像为向左延伸（left 负 / right 正）——仍用物理 left 时 RTL 下会画到上一步并悬空到容器边缘
  const n = (v: string) => Number.parseFloat(v)
  expect(n(probe.ltr!.left)).toBeGreaterThan(0)
  expect(n(probe.rtl!.left)).toBeLessThan(0)
  expect(n(probe.rtl!.right)).toBeGreaterThan(0)
  // 镜像对称：两方向锚点数值等大反号
  expect(Math.abs(n(probe.rtl!.right))).toBeCloseTo(Math.abs(n(probe.ltr!.left)), 1)
})
