// 复核回归：product-card——图片比例真实几何、标题两行截断、横向布局图在行首、缺图占位。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('product-card：image-ratio 落到真实几何（16:9 ≈ 1.78，缺省 1:1 为正方形）', async ({ page }) => {
  await page.goto('/components/product-card.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-product-card')

  const ratios = await page.evaluate(() =>
    [...document.querySelectorAll('oas-product-card')]
      .map((host) => {
        const media = host.shadowRoot?.querySelector<HTMLElement>('[part="media"]')
        if (!media) return null
        const rect = media.getBoundingClientRect()
        return {
          attr: host.getAttribute('image-ratio'),
          w: rect.width,
          h: rect.height,
          ratio: rect.height > 0 ? rect.width / rect.height : 0,
        }
      })
      .filter(Boolean),
  )
  const square = ratios.find((r) => r!.attr === null)!
  expect(square.ratio, '缺省 1:1 应为正方形').toBeCloseTo(1, 1)
  const fourThree = ratios.find((r) => r!.attr === '4:3')!
  expect(fourThree.ratio, '4:3 宽高比').toBeCloseTo(4 / 3, 1)
  const wide = ratios.find((r) => r!.attr === '16:9')!
  expect(wide.ratio, '16:9 宽高比').toBeCloseTo(16 / 9, 1)
  // 反向确认：三种比例确有差异（不是都被同一条规则压平）
  expect(wide.ratio).toBeGreaterThan(fourThree.ratio)
  expect(fourThree.ratio).toBeGreaterThan(square.ratio)
})

test('product-card：标题两行截断（视觉裁剪但文本完整）、缺图渲染占位框', async ({ page }) => {
  await page.goto('/components/product-card.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-product-card')

  const probe = await page.evaluate(() => {
    const hosts = [...document.querySelectorAll('oas-product-card')] as HTMLElement[]
    const long = hosts.find((h) => (h.getAttribute('title') ?? '').includes('这是一段很长的商品标题'))!
    const title = long.shadowRoot!.querySelector<HTMLElement>('[part="title"]')!
    const cs = getComputedStyle(title)
    const noImage = hosts.find((h) => !h.hasAttribute('image'))!
    const media = noImage.shadowRoot!.querySelector<HTMLElement>('[part="media"]')!
    const placeholder = noImage.shadowRoot!.querySelector<HTMLElement>('[part="placeholder"]')!
    return {
      clamp: cs.webkitLineClamp,
      overflow: cs.overflow,
      clipped: title.scrollHeight > title.clientHeight,
      fullText: title.textContent ?? '',
      empty: media.getAttribute('data-empty'),
      placeholderVisible: !placeholder.hidden && placeholder.getBoundingClientRect().height > 0,
      placeholderLabel: placeholder.getAttribute('aria-label') || placeholder.textContent,
    }
  })
  expect(probe.clamp).toBe('2')
  expect(probe.overflow).toBe('hidden')
  expect(probe.clipped, '长标题确被两行裁剪（非恒真前提）').toBe(true)
  expect(probe.fullText).toContain('完整文案')
  expect(probe.empty).toBe('true')
  expect(probe.placeholderVisible).toBe(true)
  expect(probe.placeholderLabel).toContain('暂无图片')
})

test('product-card：layout=horizontal 时图片在内容之前（行首），纵向时图在上', async ({ page }) => {
  await page.goto('/components/product-card.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-product-card')

  const geom = await page.evaluate(() => {
    const hosts = [...document.querySelectorAll('oas-product-card')] as HTMLElement[]
    const read = (host: HTMLElement) => {
      const media = host.shadowRoot!.querySelector<HTMLElement>('[part="media"]')!.getBoundingClientRect()
      const body = host.shadowRoot!.querySelector<HTMLElement>('[part="body"]')!.getBoundingClientRect()
      return { media, body }
    }
    const horizontal = hosts.find((h) => h.getAttribute('layout') === 'horizontal')!
    const vertical = hosts.find((h) => !h.hasAttribute('layout'))!
    return { h: read(horizontal), v: read(vertical) }
  })
  // 横向：图在左、内容在右且同一行
  expect(geom.h.media.right).toBeLessThanOrEqual(geom.h.body.left + 1)
  expect(Math.abs(geom.h.media.top - geom.h.body.top)).toBeLessThan(8)
  // 纵向：图在上、内容在下
  expect(geom.v.media.bottom).toBeLessThanOrEqual(geom.v.body.top + 1)
})
