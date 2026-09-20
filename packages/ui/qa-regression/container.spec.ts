// 复核回归：container——定宽居中容器首份回归固化。
// 覆盖：size 档位限宽真实落点（xs=480px）、fluid 与 size 正交（fluid 恒父宽）、
// center="false" 取消居中（margin 0）、padding 逻辑内边距、breakout 子元素突破定宽撑满视口。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('container 限宽与居中：xs 定宽 480 且水平居中，center="false" 贴行首，fluid 恒父宽', async ({ page }) => {
  await page.goto('/components/container.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-container[size="xs"]')
  const r = await page.evaluate(() => {
    const rect = (sel: string) => (document.querySelector(sel) as HTMLElement).getBoundingClientRect()
    const xs = rect('oas-container[size="xs"]')
    const fluid = rect('oas-container[fluid]')
    const uncentered = rect('oas-container[center="false"]')
    const cs = (sel: string) => getComputedStyle(document.querySelector(sel) as HTMLElement)
    return {
      xsWidth: xs.width,
      xsLeftMargin: cs('oas-container[size="xs"]').marginInlineStart,
      fluidWidth: fluid.width,
      fluidMaxWidth: cs('oas-container[fluid]').maxWidth,
      uncenteredLeftMargin: cs('oas-container[center="false"]').marginInlineStart,
      parentWidth: (
        document.querySelector('oas-container[size="xs"]') as HTMLElement
      ).parentElement!.getBoundingClientRect().width,
    }
  })
  expect(r.parentWidth, '前置：demo 列宽应大于 xs 上限（否则断言无意义）').toBeGreaterThan(520)
  expect(r.xsWidth, 'size="xs" 应限宽 480px').toBeCloseTo(480, 0)
  expect(r.xsLeftMargin, '默认居中：左外边距应 > 0（auto 解析值）').not.toBe('0px')
  expect(r.fluidMaxWidth, 'fluid 不挂 max-width').toBe('none')
  expect(r.fluidWidth, 'fluid 恒父宽 100%').toBeCloseTo(r.parentWidth, 0)
  expect(r.fluidWidth, 'fluid 应比 xs 更宽（对照有效）').toBeGreaterThan(r.xsWidth)
  expect(r.uncenteredLeftMargin, 'center="false" → margin-inline-start: 0px').toBe('0px')
})

test('container padding 与 breakout：逻辑内边距落点，breakout 子元素突破定宽撑满视口', async ({ page }) => {
  await page.goto('/components/container.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-container[padding]')
  const r = await page.evaluate(() => {
    const padded = document.querySelector('oas-container[padding]') as HTMLElement
    const banner = document.querySelector('div[breakout]') as HTMLElement
    const br = banner.getBoundingClientRect()
    return {
      paddingLeft: getComputedStyle(padded).paddingInlineStart,
      bannerWidth: br.width,
      bannerLeft: br.left,
      innerWidth: window.innerWidth,
    }
  })
  expect(r.paddingLeft, 'padding="var(--oas-space-4)" → 16px 逻辑内边距').toBe('16px')
  expect(r.bannerWidth, 'breakout 子元素应撑满视口宽（100vw）').toBeCloseTo(r.innerWidth, 0)
  expect(r.bannerLeft, 'breakout 子元素左缘应贴视口 0').toBeLessThan(2)
})
