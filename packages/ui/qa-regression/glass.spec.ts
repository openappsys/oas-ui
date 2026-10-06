// 液态玻璃 L2：材质机制 + 感知对比度实测门禁（PRD 承诺：代表性背景 <60 零容忍）。
// 方法：已知纯底背板上的半透明 surface 做 alpha 合成求有效底色，对 surface 文字色跑
// 感知对比度（与 a11y.spec 同源 oklab 评分）——亮蓝/品红/深青三类代表背板 × 明暗双主题。

import { test, expect } from '@playwright/test'
import { perceptualContrast, relativeLuminance } from '../../theme/oklab'

const PAGE = '/guide/glass.html'

/** rgba(r,g,b,a) over 纯色底 → 有效合成色 */
function composite(fg: [number, number, number, number], bg: [number, number, number]): [number, number, number] {
  const a = fg[3]
  return [
    Math.round(fg[0] * a + bg[0] * (1 - a)),
    Math.round(fg[1] * a + bg[1] * (1 - a)),
    Math.round(fg[2] * a + bg[2] * (1 - a)),
  ]
}

function parseRgba(s: string): [number, number, number, number] | null {
  const m = s.match(/rgba?\(([^)]+)\)/)
  if (!m) return null
  const parts = m[1]!.split(',').map((x) => parseFloat(x))
  return [parts[0]!, parts[1]!, parts[2]!, parts.length > 3 ? parts[3]! : 1]
}

const BACKDROPS: Array<[string, [number, number, number]]> = [
  ['亮蓝', [64, 120, 255]],
  ['品红', [255, 120, 180]],
  ['深青', [31, 74, 68]],
]

test.describe('液态玻璃材质层', () => {
  for (const theme of ['light', 'dark']) {
    test(`材质机制 + 文字感知对比度（${theme}，三类背板 <60 零容忍）`, async ({ page }) => {
      await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
      if (theme === 'dark') await page.evaluate(() => document.documentElement.classList.add('dark'))
      await page.waitForTimeout(800)
      const r = await page.evaluate(() => {
        const card = document.querySelector('.gg-card')!
        const cs = getComputedStyle(card)
        const stage = document.querySelector('.gg-stage')!
        return {
          cardBg: cs.backgroundColor,
          blur: cs.backdropFilter || (cs as unknown as { webkitBackdropFilter: string }).webkitBackdropFilter,
          ringColor: cs.outlineColor,
          titleColor: getComputedStyle(card.querySelector('strong')!).color,
          textColor: getComputedStyle(card.querySelector('p')!).color,
          // 真次要文字（第二卡带 inline secondary 样式的 p；不得用第一卡 p 兜底——曾因此漏测 light secondary）
          secondaryColor: getComputedStyle(document.querySelectorAll('.gg-card')[1]!.querySelector('p')!).color,
          stageBg: getComputedStyle(stage).backgroundImage,
        }
      })
      // 机制：blur 生效（非 none）、ring 非透明、surface 半透明
      expect(r.blur, 'backdrop-filter 应生效').not.toBe('none')
      expect(r.blur).toContain('blur(')
      expect(r.ringColor, '折光边应可见（非透明）').not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
      const surf = parseRgba(r.cardBg)!
      expect(surf[3], 'surface 半透明（alpha < 1）').toBeLessThan(1)
      // 感知对比度：surface 文字色 ×（surface rgba 合成到三类代表背板）
      for (const [label, bd] of BACKDROPS) {
        const eff = composite(surf, bd)
        const bgCss = `rgb(${eff[0]}, ${eff[1]}, ${eff[2]})`
        const bgRgb: [number, number, number] = [eff[0], eff[1], eff[2]]
        for (const [what, colorStr] of [
          ['标题/正文', r.titleColor],
          ['正文', r.textColor],
          ['次要文字', r.secondaryColor],
        ] as const) {
          const fg = parseRgba(colorStr)!
          const score = Math.abs(perceptualContrast(relativeLuminance([fg[0], fg[1], fg[2]]), relativeLuminance(bgRgb)))
          expect(
            score,
            `${theme}/${label}/${what}（${colorStr} on ${bgCss}）感知分 ${score.toFixed(1)} 应 ≥ 60`,
          ).toBeGreaterThanOrEqual(60)
        }
      }
    })
  }

  test('high-contrast 下不启用（实心可访问性档优先）', async ({ page }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)
    const blur = await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'high-contrast')
      const cs = getComputedStyle(document.querySelector('.gg-card')!)
      return cs.backdropFilter
    })
    expect(blur, 'HC 下玻璃不启用（blur 回落 none）').toBe('none')
  })

  test('局部降级：容器覆盖变量后 surface 回实心语义', async ({ page }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)
    const r = await page.evaluate(() => {
      const stage = document.querySelector('.gg-stage') as HTMLElement
      stage.style.setProperty('--oas-glass-blur', 'none')
      stage.style.setProperty('--oas-glass-ring', 'transparent')
      const cs = getComputedStyle(document.querySelector('.gg-card')!)
      return { blur: cs.backdropFilter, ring: cs.outlineColor }
    })
    expect(r.blur).toBe('none')
    expect(r.ring).toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
  })
})
