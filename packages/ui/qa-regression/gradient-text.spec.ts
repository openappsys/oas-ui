// 复核回归：gradient-text——文字描边兼容能力固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('gradient-text 描边：属性渲染钩子 + 描边与渐变共存样式', async ({ page }) => {
  await page.goto('/components/gradient-text.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-gradient-text[stroke]')
  const r = await page.evaluate(() => {
    const probe = (sel: string) => document.querySelector(sel) as HTMLElement | null
    // 默认 token 描边色 demo（stroke，无 stroke-color）
    const def = probe('oas-gradient-text[stroke]:not([stroke-color])')!
    const defLayer = def.shadowRoot!.querySelector('[part="stroke"]') as HTMLElement
    const defText = def.shadowRoot!.querySelector('[part="text"]') as HTMLElement
    // 自定义描边色 demo
    const custom = probe('oas-gradient-text[stroke-color]')!
    const customLayer = custom.shadowRoot!.querySelector('[part="stroke"]') as HTMLElement
    // 语义渐变 + 描边 demo
    const typed = probe('oas-gradient-text[type][stroke]')!
    const typedText = typed.shadowRoot!.querySelector('[part="text"]') as HTMLElement
    // 流动渐变 + 描边 demo
    const animated = probe('oas-gradient-text[animated][stroke]')!
    const animatedText = animated.shadowRoot!.querySelector('[part="text"]') as HTMLElement
    const css = (el: HTMLElement) => {
      const s = getComputedStyle(el)
      return {
        strokeWidth: s.webkitTextStrokeWidth || s.getPropertyValue('-webkit-text-stroke-width'),
        strokeColor: s.webkitTextStrokeColor || s.getPropertyValue('-webkit-text-stroke-color'),
        display: s.display,
      }
    }
    return {
      defStroked: def.classList.contains('stroked'),
      defHostVarW: def.style.getPropertyValue('--oas-gradient-text-stroke-w'),
      defHostVarC: def.style.getPropertyValue('--oas-gradient-text-stroke-c'),
      defLayerText: defLayer.textContent,
      defLayerAriaHidden: defLayer.getAttribute('aria-hidden'),
      defLayerCss: css(defLayer),
      defTextCss: css(defText),
      defClipped: defText.classList.contains('clipped'),
      defGradBg: defText.style.backgroundImage,
      customLayerCss: css(customLayer),
      customClipped: custom.shadowRoot!.querySelector('[part="text"]')!.classList.contains('clipped'),
      typedDataType: typedText.getAttribute('data-type'),
      typedClipped: typedText.classList.contains('clipped'),
      animatedAnimated: animatedText.classList.contains('animated'),
      animatedClipped: animatedText.classList.contains('clipped'),
      animatedLayerDisplay: css(animated.shadowRoot!.querySelector('[part="stroke"]') as HTMLElement)
        .display,
    }
  })
  // 渲染钩子：host stroked 类 + 宽度/颜色变量（缺省色走 text-primary token）
  expect(r.defStroked).toBe(true)
  expect(r.defHostVarW).toMatch(/^\d+(\.\d+)?(px|em|rem|pt)$/)
  expect(r.defHostVarC).toBe('var(--oas-color-text-primary)')
  // 副层镜像槽文本、aria-hidden 隔离屏幕阅读器、非 display:none
  expect(r.defLayerText).toBeTruthy()
  expect(r.defLayerAriaHidden).toBe('true')
  expect(r.defLayerCss.display).toBe('block')
  // 副层真实带描边（宽度非 0），主层走 clipped 渐变且自身不描边
  expect(parseFloat(r.defLayerCss.strokeWidth)).toBeGreaterThan(0)
  expect(r.defTextCss.strokeWidth === '' || parseFloat(r.defTextCss.strokeWidth) === 0).toBe(true)
  expect(r.defClipped).toBe(true)
  expect(r.defGradBg).toContain('linear-gradient')
  // 自定义描边色真实落在副层
  expect(parseFloat(r.customLayerCss.strokeWidth)).toBeGreaterThan(0)
  expect(r.customLayerCss.strokeColor).not.toBe('rgb(0, 0, 0)')
  expect(r.customClipped).toBe(true)
  // 语义渐变 + 描边：data-type 与 clipped 并存
  expect(r.typedDataType).toBe('warning')
  expect(r.typedClipped).toBe(true)
  // 流动渐变 + 描边：animated 与 clipped 并存，副层展开
  expect(r.animatedAnimated).toBe(true)
  expect(r.animatedClipped).toBe(true)
  expect(r.animatedLayerDisplay).toBe('block')
})
