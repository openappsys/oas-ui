// 复核回归：divider——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('divider 线型/缩进/间距档/strong：variant 驱动、dashed 布尔兼容、变量开口、vertical 撑满', async ({ page }) => {
  // v2.1 divider 能力补齐回归：variant 四线型（含 double 双线间隙）、inset/middle 缩进、
  // size 三档、strong 文字、CSS 变量开口（spacing 注入实测）、vertical 在 flex 容器撑满。
  await page.goto('/components/divider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-divider')
  const r = await page.evaluate(async () => {
    const mk = (attrs: Record<string, string>, slot = '') => {
      const el = document.createElement('oas-divider')
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      el.textContent = slot
      document.body.appendChild(el)
      return el
    }
    const cls = (el: Element) => el.shadowRoot!.querySelector('.divider')!.className
    const dotted = mk({ variant: 'dotted' })
    const compat = mk({ dashed: '' })
    const both = mk({ dashed: '', variant: 'dotted' })
    const inset = mk({ inset: '' })
    const large = mk({ size: 'large' })
    const strong = mk({ strong: '' }, '标题')
    const badVar = mk({ variant: 'wavy' })
    const badSize = mk({ size: 'xxl' })
    // vertical 撑满：flex 容器实测
    const wrap = document.createElement('div')
    wrap.style.cssText = 'display:flex;height:48px'
    const vert = mk({ direction: 'vertical' })
    wrap.appendChild(vert)
    document.body.appendChild(wrap)
    // spacing 变量注入实测
    const spacing = mk({})
    spacing.shadowRoot!.querySelector<HTMLElement>('.divider')!.style.setProperty('--oas-divider-spacing', '0px')
    await new Promise((res) => setTimeout(res, 100))
    const spacingMargin = getComputedStyle(spacing.shadowRoot!.querySelector('.divider')!).marginTop
    const doubleH = mk({ variant: 'double' })
    const doubleBefore = getComputedStyle(doubleH.shadowRoot!.querySelector('.divider')!, '::before')
    const out = {
      dotted: cls(dotted),
      compat: cls(compat),
      both: cls(both),
      inset: cls(inset),
      large: cls(large),
      strong: cls(strong),
      badVar: cls(badVar),
      badSize: cls(badSize),
      vertH: vert.getBoundingClientRect().height,
      spacingMargin,
      doubleHeight: doubleBefore.height,
      doubleBorderTop: doubleBefore.borderTopStyle,
      doubleBorderBottom: doubleBefore.borderBottomStyle,
    }
    for (const el of [dotted, compat, both, inset, large, strong, badVar, badSize, spacing, doubleH]) el.remove()
    wrap.remove()
    return out
  })
  expect(r.dotted).toContain('dotted')
  expect(r.compat).toContain('dashed')
  // 显式 variant 优先于 dashed 布尔
  expect(r.both).toContain('dotted')
  expect(r.both).not.toContain('dashed')
  expect(r.inset).toContain('inset')
  expect(r.large).toContain('large')
  expect(r.strong).toContain('strong')
  // 非法值回落：无线型/档位 class
  expect(r.badVar).not.toMatch(/dashed|dotted|double/)
  expect(r.badSize).not.toMatch(/small|large/)
  // vertical 在 48px flex 容器内撑满（±2px 边界容差）
  expect(Math.abs(r.vertH - 48)).toBeLessThanOrEqual(2)
  // spacing 变量注入真实生效
  expect(r.spacingMargin).toBe('0px')
  // double 双线：总高 = 1+3+1 = 5px，上下边线 solid
  expect(r.doubleHeight).toBe('5px')
  expect(r.doubleBorderTop).toBe('solid')
  expect(r.doubleBorderBottom).toBe('solid')
})

test('divider 双虚线 / 双点线（double-dashed / double-dotted）：类映射 + double 加高结构 × 双层渐变', async ({
  page,
}) => {
  await page.goto('/components/divider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-divider')

  const r = await page.evaluate(async () => {
    const make = (variant: string): HTMLElement => {
      const el = document.createElement('oas-divider')
      el.setAttribute('variant', variant)
      document.body.appendChild(el)
      return el
    }
    const dash2 = make('double-dashed')
    const dot2 = make('double-dotted')
    await new Promise((res) => setTimeout(res, 50))
    const dash2Line = dash2.shadowRoot!.querySelector<HTMLElement>('.divider')!
    const dot2Line = dot2.shadowRoot!.querySelector<HTMLElement>('.divider')!
    const out = {
      dash2Cls: dash2Line.className,
      dot2Cls: dot2Line.className,
      dash2H: getComputedStyle(dash2Line).height,
      dot2H: getComputedStyle(dot2Line).height,
      dash2Bg: getComputedStyle(dash2Line, '::before').backgroundImage,
      dot2Bg: getComputedStyle(dot2Line, '::before').backgroundImage,
    }
    dash2.remove()
    dot2.remove()
    return out
  })

  expect(r.dash2Cls, '双虚线类映射').toContain('double-dashed')
  // 不含「独立的」单虚线类（double-dashed 含 dashed 子串，按空格分词精确匹配）
  expect(r.dash2Cls.split(/\s+/), '双虚线不含单虚线类').not.toContain('dashed')
  expect(r.dot2Cls, '双点线类映射').toContain('double-dotted')
  expect(r.dash2H, '加高容器同 double（5px）').toBe('5px')
  expect(r.dot2H, '加高容器同 double（5px）').toBe('5px')
  // 双层渐变：background-image 含两条 repeating-linear-gradient（上线+下线）
  expect(r.dash2Bg.match(/repeating-linear-gradient/g)?.length ?? 0, '双虚线两条渐变线').toBe(2)
  expect(r.dot2Bg.match(/repeating-linear-gradient/g)?.length ?? 0, '双点线两条渐变线').toBe(2)
})
