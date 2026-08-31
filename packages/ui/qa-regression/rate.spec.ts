// 复核回归：rate——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('rate 半选（allow-half）：半星为左半黄右半灰的垂直分割视觉', async ({ page }) => {
  await page.goto('/components/rate.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-rate[value="3.5"][allow-half]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-rate[value="3.5"][allow-half]')!
    const root = el.shadowRoot!
    const stars = [...root.querySelectorAll<HTMLElement>('.star')]
    const half = stars.find((s) => s.classList.contains('half'))!
    const fill = half.querySelector<HTMLElement>('.half-fill')
    const fillCs = fill ? getComputedStyle(fill) : null
    return {
      starCount: stars.length,
      activeCount: stars.filter((s) => s.classList.contains('active')).length,
      halfIndex: stars.indexOf(half),
      oldOpacityHack: half.style.opacity,
      hasFill: !!fill,
      fillAriaHidden: fill?.getAttribute('aria-hidden') ?? null,
      fillHasSvg: !!fill?.querySelector('svg'),
      fillClipPath: fillCs?.clipPath ?? '',
      fillColor: fillCs?.color ?? '',
      baseColor: getComputedStyle(half).color,
    }
  })
  // 2.5 语义演示用 3.5：3 颗全黄 + 1 颗半黄半灰 + 1 颗全灰
  expect(r.starCount).toBe(5)
  expect(r.activeCount).toBe(3)
  expect(r.halfIndex).toBe(3)
  expect(r.oldOpacityHack).toBe('') // 旧透明度淡化已移除
  expect(r.hasFill).toBe(true)
  expect(r.fillAriaHidden).toBe('true')
  expect(r.fillHasSvg).toBe(true)
  expect(r.fillClipPath).toContain('50%') // 垂直分割：只保留左半
  expect(r.fillColor).toBe('rgb(217, 119, 6)') // --oas-color-warning（light）
  expect(r.baseColor).toBe('rgb(228, 228, 231)') // --oas-color-border（light）
  await page.screenshot({ path: 'C:\\WINDOWS\\TEMP\\opencode\\fix9-rate-half-star.png' })
})

// —— upload P0 补缺：照片墙 + 拖拽 ——
// 曾现风险：picture-card 缩略图不渲染、Vue 剥离 list-type、超限无可见反馈、disabled 拖拽会打开文件。
