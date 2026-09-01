// 复核回归：spin——能力增强批次固化断言（真实浏览器渲染面，happy-dom 单测覆盖不了的
// CSS 变量注入、动画、fullscreen 定位、delay 真实计时、reduced-motion 降级）。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('spin delay 防闪烁：延迟窗口内结束不出现，到期出现', async ({ page }) => {
  await page.goto('/components/spin.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-spin')
  const r = await page.evaluate(async () => {
    const el = document.createElement('oas-spin')
    el.setAttribute('delay', '500')
    el.setAttribute('spinning', '')
    el.innerHTML = '<p>内容</p>'
    document.body.appendChild(el)
    const wrap = el.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement
    const displayOf = () => getComputedStyle(el.shadowRoot!.querySelector('[part="body"]')!).display
    const before = displayOf()
    await new Promise((res) => setTimeout(res, 250))
    const mid = displayOf()
    await new Promise((res) => setTimeout(res, 400))
    const after = displayOf()
    el.remove()
    return { before, mid, after, ariaBusy: el.getAttribute('aria-busy') }
  })
  // 延迟窗口内指示器不显示；到期后显示；aria-busy 立即生效
  expect(r.before).toBe('none')
  expect(r.mid).toBe('none')
  expect(r.after).not.toBe('none')
  expect(r.ariaBusy).toBe('true')
})

test('spin CSS 变量注入真实生效：指示色/轨道色/线宽/时长/遮罩', async ({ page }) => {
  await page.goto('/components/spin.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-spin')
  const r = await page.evaluate(() => {
    const host = document.createElement('div')
    host.style.cssText =
      '--oas-spin-indicator-color: rgb(255, 0, 0); --oas-spin-track-color: rgb(0, 0, 255); --oas-spin-border-width: 6px; --oas-spin-duration: 3s; --oas-spin-mask-bg: rgba(11, 22, 33, 0.5)'
    const el = document.createElement('oas-spin')
    el.setAttribute('spinning', '')
    el.innerHTML = '<p>内容</p>'
    host.appendChild(el)
    document.body.appendChild(host)
    const indicator = el.shadowRoot!.querySelector('[part="indicator"]') as HTMLElement
    const mask = el.shadowRoot!.querySelector('[part="mask"]') as HTMLElement
    const cs = getComputedStyle(indicator)
    const out = {
      topColor: cs.borderTopColor,
      rightColor: cs.borderRightColor,
      width: cs.borderTopWidth,
      duration: cs.animationDuration,
      maskBg: getComputedStyle(mask).backgroundColor,
      maskDisplay: getComputedStyle(mask).display,
    }
    host.remove()
    return out
  })
  expect(r.topColor).toBe('rgb(255, 0, 0)')
  expect(r.rightColor).toBe('rgb(0, 0, 255)')
  expect(r.width).toBe('6px')
  expect(r.duration).toBe('3s')
  expect(r.maskBg).toBe('rgba(11, 22, 33, 0.5)')
  expect(r.maskDisplay).toBe('block')
})

test('spin variant dot/bars 动画与 paused 冻结', async ({ page }) => {
  await page.goto('/components/spin.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-spin')
  const r = await page.evaluate(() => {
    const mk = (attrs: Record<string, string>) => {
      const el = document.createElement('oas-spin')
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      document.body.appendChild(el)
      return el
    }
    const dot = mk({ variant: 'dot' })
    const bars = mk({ variant: 'bars' })
    const pausedDot = mk({ variant: 'dot', paused: '' })
    const dotI = dot.shadowRoot!.querySelector('[part="dots"] i')!
    const barsI = bars.shadowRoot!.querySelector('[part="bars"] i')!
    const pausedI = pausedDot.shadowRoot!.querySelector('[part="dots"] i')!
    const out = {
      dotAnim: getComputedStyle(dotI).animationName,
      barsAnim: getComputedStyle(barsI).animationName,
      pausedState: getComputedStyle(pausedI).animationPlayState,
      // 默认 ring 的旋转
      ringAnim: getComputedStyle(dot.shadowRoot!.querySelector('[part="indicator"]')!).animationName,
    }
    for (const el of [dot, bars, pausedDot]) el.remove()
    return out
  })
  expect(r.dotAnim).toBe('oas-spin-dot')
  expect(r.barsAnim).toBe('oas-spin-bar')
  expect(r.pausedState).toBe('paused')
  // dot 形态下 indicator 本体不带旋转动画（形态动画在子元素上）
  expect(r.ringAnim).toBe('none')
})

test('spin fullscreen：fixed 定位 + z-index 默认 3500', async ({ page }) => {
  await page.goto('/components/spin.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-spin')
  const r = await page.evaluate(() => {
    const el = document.createElement('oas-spin')
    el.setAttribute('fullscreen', '')
    el.setAttribute('spinning', '')
    el.setAttribute('tip', '全屏')
    document.body.appendChild(el)
    const wrap = el.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement
    const cs = getComputedStyle(wrap)
    const out = {
      position: cs.position,
      zIndex: cs.zIndex,
      bodyDisplay: getComputedStyle(el.shadowRoot!.querySelector('[part="body"]')!).display,
    }
    el.remove()
    return out
  })
  expect(r.position).toBe('fixed')
  expect(r.zIndex).toBe('3500')
  expect(r.bodyDisplay).not.toBe('none')
})

test('spin percent determinate：SVG 进度环 + dashoffset 真实值 + tip-position 布局', async ({
  page,
}) => {
  await page.goto('/components/spin.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-spin')
  const r = await page.evaluate(() => {
    const mk = (attrs: Record<string, string>) => {
      const el = document.createElement('oas-spin')
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      document.body.appendChild(el)
      return el
    }
    const half = mk({ percent: '50', size: 'large' })
    const before = mk({ tip: '前', 'tip-position': 'before' })
    const above = mk({ tip: '上', 'tip-position': 'above' })
    const svg = half.shadowRoot!.querySelector('[part="progress"]') as SVGElement
    const svgCs = getComputedStyle(svg)
    const C = 2 * Math.PI * 21
    const offset = Number(
      (half.shadowRoot!.querySelector('[part="progress-bar"]') as SVGCircleElement).getAttribute(
        'stroke-dashoffset',
      ),
    )
    const out = {
      svgDisplay: svgCs.display,
      indicatorRole: half.shadowRoot!.querySelector('[part="indicator"]')!.getAttribute('role'),
      ariaNow: half.shadowRoot!.querySelector('[part="indicator"]')!.getAttribute('aria-valuenow'),
      offsetHalf: Math.abs(offset - C * 0.5) < 0.01,
      beforeDir: getComputedStyle(before.shadowRoot!.querySelector('[part="body"]')!).flexDirection,
      aboveDir: getComputedStyle(above.shadowRoot!.querySelector('[part="body"]')!).flexDirection,
    }
    for (const el of [half, before, above]) el.remove()
    return out
  })
  expect(r.svgDisplay).toBe('block')
  expect(r.indicatorRole).toBe('progressbar')
  expect(r.ariaNow).toBe('50')
  expect(r.offsetHalf).toBe(true)
  expect(r.beforeDir).toBe('row-reverse')
  expect(r.aboveDir).toBe('column-reverse')
})

test('spin size 任意值与读屏文本、reduced-motion 降级', async ({ page }) => {
  await page.goto('/components/spin.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-spin')
  const sized = await page.evaluate(() => {
    const el = document.createElement('oas-spin')
    el.setAttribute('size', '44')
    document.body.appendChild(el)
    const indicator = el.shadowRoot!.querySelector('[part="indicator"]') as HTMLElement
    const out = {
      w: getComputedStyle(indicator).width,
      label: el.shadowRoot!.querySelector('[part="label"]')!.textContent ?? '',
      labelVisible: getComputedStyle(el.shadowRoot!.querySelector('[part="label"]')!).position,
    }
    el.remove()
    return out
  })
  expect(sized.w).toBe('44px')
  // 读屏文本非空（locale 兜底）且视觉隐藏
  expect(sized.label.trim()).not.toBe('')
  expect(sized.labelVisible).toBe('absolute')

  // reduced-motion：动画降级为静态
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reduced = await page.evaluate(() => {
    const el = document.createElement('oas-spin')
    document.body.appendChild(el)
    const indicator = el.shadowRoot!.querySelector('[part="indicator"]') as HTMLElement
    const out = getComputedStyle(indicator).animationName
    el.remove()
    return out
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  expect(reduced).toBe('none')
})

test('spin show-overlay=false 与命令式 fullscreen 句柄', async ({ page }) => {
  await page.goto('/components/spin.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-spin')
  const r = await page.evaluate(async () => {
    // 页面上下文无法解析裸模块说明符：组件已由文档站注册，直接取注册类
    const OASSpin = customElements.get('oas-spin') as unknown as {
      fullscreen: (options?: { tip?: string; delay?: number }) => { close(): void }
    }
    const el = document.createElement('oas-spin')
    el.setAttribute('spinning', '')
    el.setAttribute('show-overlay', 'false')
    el.innerHTML = '<p>内容</p>'
    document.body.appendChild(el)
    const noMask = getComputedStyle(el.shadowRoot!.querySelector('[part="mask"]')!).display
    el.remove()

    const h = OASSpin.fullscreen({ tip: '命令式' })
    const fs = document.querySelector('oas-spin[fullscreen]')!
    const fsVisible = getComputedStyle(
      fs.shadowRoot!.querySelector('[part="body"]') as HTMLElement,
    ).display
    const fsPosition = getComputedStyle(fs.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement)
      .position
    h.close()
    return { noMask, fsConnected: fs.isConnected, fsVisible, fsPosition, closedAfter: fs.isConnected }
  })
  expect(r.noMask).toBe('none')
  expect(r.fsVisible).not.toBe('none')
  expect(r.fsPosition).toBe('fixed')
  expect(r.closedAfter).toBe(false)
})
