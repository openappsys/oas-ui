// 复核回归：code——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up, realClick } from './helpers'

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

test('code 行高亮 / 行聚焦 / diff 着色真实生效（token 派生色）', async ({ page }) => {
  await page.goto('/components/code.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-code[highlight-lines]')
  await up(page, 'oas-code[focus-lines]')
  await up(page, 'oas-code[diff]')
  const r = await page.evaluate(() => {
    const probe = (sel: string) => document.querySelector(sel) as HTMLElement
    const hl = probe('oas-code[highlight-lines]')
    hl.scrollIntoView({ block: 'center' })
    const hlFlags = [...hl.shadowRoot!.querySelectorAll('[part="line"]')].map((l) =>
      l.classList.contains('line-highlight'),
    )
    const hlBgs = [...hl.shadowRoot!.querySelectorAll('[part="line"]')].map((l) => getComputedStyle(l).backgroundColor)
    const focus = probe('oas-code[focus-lines]')
    const focusFlags = [...focus.shadowRoot!.querySelectorAll('[part="line"]')].map((l) =>
      l.classList.contains('line-focus-dim'),
    )
    // 淡化机制：掺色（currentColor × --oas-code-focus-dim-strength + 文字安全档），opacity 恒 1
    //（opacity 淡化在感知对比度门禁下永不达标，已改掺色）——断言淡化行与聚焦行文字色不同
    const focusColors = [...focus.shadowRoot!.querySelectorAll('[part="line"]')].map((l) => {
      const code = l.querySelector('.line-code') ?? l
      return getComputedStyle(code).color
    })
    const diff = probe('oas-code[diff]')
    const diffRows = [...diff.shadowRoot!.querySelectorAll('[part="line"]')].map((l) => ({
      add: l.classList.contains('line-diff-add'),
      remove: l.classList.contains('line-diff-remove'),
      color: getComputedStyle(l.querySelector('.line-code')!).color,
    }))
    return { hlFlags, hlBgs, focusFlags, focusColors, diffRows }
  })
  // 行高亮：命中行有底色，未命中行透明
  const hlOn = r.hlFlags.map((on, i) => (on ? i : -1)).filter((i) => i >= 0)
  expect(hlOn.length).toBeGreaterThan(0)
  expect(r.hlBgs[hlOn[0]!]).not.toBe('rgba(0, 0, 0, 0)')
  expect(r.hlBgs[r.hlFlags.findIndex((on) => !on)]).toBe('rgba(0, 0, 0, 0)')
  // 行聚焦：淡化行与聚焦行文字色有区分（掺色机制；opacity 恒 1——opacity 淡化在感知对比度门禁下不达标）
  expect(r.focusFlags.some(Boolean)).toBe(true)
  expect(new Set(r.focusColors).size, '淡化行与聚焦行文字色应有区分').toBeGreaterThan(1)
  // diff：增行绿、减行红（语义色非默认文本色）
  const adds = r.diffRows.filter((x) => x.add)
  const removes = r.diffRows.filter((x) => x.remove)
  expect(adds.length).toBeGreaterThan(0)
  expect(removes.length).toBeGreaterThan(0)
  expect(adds[0]!.color).not.toBe(removes[0]!.color)
  expect(adds[0]!.color).not.toBe('rgb(24, 24, 27)')
})

test('code max-rows 尾行可展开 / 收起（真实点击）', async ({ page }) => {
  await page.goto('/components/code.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-code[max-rows]')
  const read = () =>
    page.evaluate(() => {
      const el = document.querySelector('oas-code[max-rows]') as HTMLElement
      return {
        lines: el.shadowRoot!.querySelectorAll('[part="line"]').length,
        btn: el.shadowRoot!.querySelector('[part="more-btn"]')!.textContent,
      }
    })
  const before = await read()
  expect(before.lines).toBe(3)
  expect(before.btn).toBe('展开')
  await realClick(page, 'oas-code[max-rows]', '[part="more-btn"]')
  const expanded = await read()
  expect(expanded.lines).toBe(6)
  expect(expanded.btn).toBe('收起')
  await realClick(page, 'oas-code[max-rows]', '[part="more-btn"]')
  const collapsed = await read()
  expect(collapsed.lines).toBe(3)
  expect(collapsed.btn).toBe('展开')
})
