// 复核回归：code——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('code 行内/换行/尺寸/形态/颜色属性真实生效', async ({ page }) => {
  await page.goto('/components/code.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-code[inline]')
  const r = await page.evaluate(() => {
    const probe = (sel: string) => document.querySelector(sel) as HTMLElement | null
    const inline = probe('oas-code[inline]')!
    const inlineInner = inline.shadowRoot!.querySelector('.inline') as HTMLElement
    const block = inline.shadowRoot!.querySelector('.block') as HTMLElement
    const wrap = probe('oas-code[word-wrap]')!
    const wrapBlock = wrap.shadowRoot!.querySelector('.block') as HTMLElement
    const plain = probe('oas-code:not([word-wrap]):not([inline])')!
    const plainBlock = plain.shadowRoot!.querySelector('.block') as HTMLElement
    const sizes = ['xs', 'small', 'large'].map((s) => {
      const el = probe(`oas-code[inline][size="${s}"]`)!
      const inner = el.shadowRoot!.querySelector('.inline')!
      return getComputedStyle(inner).fontSize
    })
    const outline = probe('oas-code[inline][variant="outline"]')!
    const outlineInner = outline.shadowRoot!.querySelector('.inline') as HTMLElement
    const solidEl = probe('oas-code[inline][variant="solid"]')!
    const solidInner = solidEl.shadowRoot!.querySelector('.inline') as HTMLElement
    const colored = probe('oas-code[inline][color="red"]')!
    const coloredInner = colored.shadowRoot!.querySelector('.inline') as HTMLElement
    return {
      inlineHiddenBlock: block.hidden,
      inlineShown: !inlineInner.hidden,
      wrapClass: wrapBlock.classList.contains('word-wrap'),
      wrapWs: getComputedStyle(wrap.shadowRoot!.querySelector('.line-code')!).whiteSpace,
      plainWs: getComputedStyle(plain.shadowRoot!.querySelector('.line-code')!).whiteSpace,
      sizes,
      outlineBorder: getComputedStyle(outlineInner).borderTopStyle,
      solidBg: getComputedStyle(solidInner).backgroundColor,
      colorVar: coloredInner.style.getPropertyValue('--oas-code-color'),
      colorActual: getComputedStyle(coloredInner).color,
    }
  })
  // inline：块级容器隐藏、inline 元素显示
  expect(r.inlineHiddenBlock).toBe(true)
  expect(r.inlineShown).toBe(true)
  // word-wrap：class 挂上且 white-space 真为 pre-wrap；默认保持 pre
  expect(r.wrapClass).toBe(true)
  expect(r.wrapWs).toBe('pre-wrap')
  expect(r.plainWs).toBe('pre')
  // size 档位真实影响字号（递增）
  const px = r.sizes.map((s) => parseFloat(s))
  expect(px[0]!).toBeLessThan(px[1]!)
  expect(px[1]!).toBeLessThan(px[2]!)
  // variant：outline 有描边、solid 有实底
  expect(r.outlineBorder).toBe('solid')
  expect(r.solidBg).not.toBe('rgba(0, 0, 0, 0)')
  // color 预设名注入 --oas-code-color 且计算色非默认
  expect(r.colorVar).toContain('var(--oas-preset-red-text)')
  expect(r.colorActual).not.toBe('rgb(24, 24, 27)')
})
