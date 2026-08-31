// 复核回归：badge——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('badge ribbon：缎带可见、折叠角生效、语义色与 placement 渲染正确', async ({ page }) => {
  // 曾现风险：ribbon 只有机制没有视觉（角标不显、无折叠角、颜色/位置不生效）
  await page.goto('/components/badge.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-badge[ribbon] oas-card')
  const r = await page.evaluate(() => {
    const badges = [...document.querySelectorAll('oas-badge[ribbon], oas-badge[mode="ribbon"]')]
    const ribbonEl = (el: Element) => el.shadowRoot!.querySelector<HTMLElement>('.ribbon')
    const cornerEl = (el: Element) => el.shadowRoot!.querySelector<HTMLElement>('.ribbon-corner')
    const pick = (color?: string, placement?: string) => {
      const b = badges.find((x) => {
        if (color && x.getAttribute('color') !== color) return false
        if (placement && x.getAttribute('placement') !== placement) return false
        // 只挑基础 fold 缎带（排除 ribbon-form/rolled/premium 等形态卡，它们的背景不是纯语义色）
        if (x.hasAttribute('ribbon-form') || x.hasAttribute('rolled') || x.hasAttribute('premium'))
          return false
        return x.hasAttribute('ribbon') || x.getAttribute('mode') === 'ribbon'
      })
      if (!b) return null
      const rb = ribbonEl(b)!
      const cs = getComputedStyle(rb)
      // 根元素 color 故意=背景色（corner 用 currentColor 折叠阴影），文字色在 .ribbon-text，断言取文字
      const textEl = rb.querySelector<HTMLElement>('.ribbon-text')
      return {
        hidden: rb.hidden,
        text: rb.textContent,
        bg: cs.backgroundColor,
        color: textEl ? getComputedStyle(textEl).color : cs.color,
        endRadius: cs.borderEndEndRadius,
        cornerClip: getComputedStyle(cornerEl(b)!).clipPath,
        placementStart: rb.classList.contains('placement-start'),
      }
    }
    const countEl = document.querySelector('oas-badge[value="5"]')
    return {
      default: pick(),
      start: pick(undefined, 'start'),
      success: pick('success'),
      count: countEl?.shadowRoot?.querySelector<HTMLElement>('.badge')?.textContent ?? null,
    }
  })
  // 默认缎带：可见、文本同步、danger 色、尖三角折叠角生效（clip-path 非 none）
  expect(r.default).not.toBeNull()
  expect(r.default!.hidden).toBe(false)
  expect(r.default!.text).toContain('HOT')
  expect(r.default!.bg).toBe('rgb(220, 38, 38)')
  expect(r.default!.color).not.toBe(r.default!.bg) // 文字色 ≠ 背景色（文字不可见曾现风险）
  expect(r.default!.endRadius).toBe('0px')
  expect(r.default!.cornerClip).not.toBe('none')
  expect(r.default!.cornerClip).toContain('polygon(')
  // placement=start：换到行首
  expect(r.start).not.toBeNull()
  expect(r.start!.hidden).toBe(false)
  expect(r.start!.placementStart).toBe(true)
  // color=success：语义色生效（非 danger）
  expect(r.success).not.toBeNull()
  expect(r.success!.bg).toBe('rgb(22, 163, 74)')
  // count 数字徽标与 ribbon 并存正常
  expect(r.count).toBe('5')
})

// —— modal P0 补缺：fullscreen 全屏 + 命令式 confirm loading ——
