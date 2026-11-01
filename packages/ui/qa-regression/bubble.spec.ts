// 回归：oas-bubble opt-in 尾巴（tail）——真实浏览器伪元素几何 / 变体退化 / RTL / 暗色。
// 尾巴是纯 CSS 伪元素：断言必须读 computed style（::after），不能只看影子 HTML。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/components/bubble.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-bubble')
})

test('tail=auto 跟随 align：两侧伪元素落在底部外角且尺寸/偏移走 token', async ({ page }) => {
  const r = await page.evaluate(() => {
    const host = document.createElement('div')
    host.style.cssText = 'width: 360px; padding: 24px; display: flex; flex-direction: column; gap: 12px'
    document.body.appendChild(host)

    const make = (attrs: Record<string, string>) => {
      const el = document.createElement('oas-bubble')
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      el.textContent = '消息'
      host.appendChild(el)
      return el
    }
    const start = make({ tail: 'auto' })
    const end = make({ align: 'end', tail: 'auto' })
    const styled = make({ tail: 'start' })
    styled.style.setProperty('--oas-bubble-tail-size', '20px')
    styled.style.setProperty('--oas-bubble-tail-offset', '4px')

    const probe = (el: HTMLElement) => {
      const bubble = el.shadowRoot!.querySelector<HTMLElement>('[part="bubble"]')!
      const tail = getComputedStyle(bubble, '::after')
      return {
        side: bubble.getAttribute('data-tail-side'),
        content: tail.content,
        width: tail.width,
        height: tail.height,
        insetStart: tail.insetInlineStart,
        insetEnd: tail.insetInlineEnd,
        bottom: tail.insetBlockEnd,
        background: tail.backgroundImage,
      }
    }
    return { start: probe(start), end: probe(end), styled: probe(styled) }
  })

  expect(r.start.side).toBe('start')
  expect(r.end.side).toBe('end')
  // 伪元素真实存在且落在底部外角（负 inline 偏移 = 探出气泡）
  expect(r.start.content).not.toBe('none')
  expect(Number.parseFloat(r.start.insetStart)).toBeLessThan(0)
  expect(Number.parseFloat(r.start.insetEnd)).toBeCloseTo(49.5938, 1)
  expect(Number.parseFloat(r.end.insetEnd)).toBeLessThan(0)
  expect(Number.parseFloat(r.end.insetStart)).toBeCloseTo(49.5938, 1)
  expect(r.start.bottom).toBe('0px')
  expect(r.start.background).toContain('radial-gradient')
  // 尺寸/偏移 token 生效（20px 高；底部偏移 4px）
  expect(r.styled.height).toBe('20px')
  expect(r.styled.bottom).toBe('4px')
})

test('outline 退化为底部外角小圆角；muted / ghost 不画突出尾巴', async ({ page }) => {
  const r = await page.evaluate(() => {
    const host = document.createElement('div')
    host.style.cssText = 'width: 360px; padding: 24px; display: flex; flex-direction: column; gap: 12px'
    document.body.appendChild(host)
    const make = (attrs: Record<string, string>) => {
      const el = document.createElement('oas-bubble')
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      el.textContent = '消息'
      host.appendChild(el)
      return el
    }
    const outline = make({ tail: 'start', variant: 'outline' })
    const muted = make({ tail: 'start', variant: 'muted' })
    const ghost = make({ tail: 'start', variant: 'ghost' })
    const base = getComputedStyle(document.createElement('oas-bubble'), '::after')
    const probe = (el: HTMLElement) => {
      const bubble = el.shadowRoot!.querySelector<HTMLElement>('[part="bubble"]')!
      return {
        side: bubble.getAttribute('data-tail-side'),
        content: getComputedStyle(bubble, '::after').content,
        corner: getComputedStyle(bubble).borderEndStartRadius,
      }
    }
    return {
      outline: probe(outline),
      muted: probe(muted),
      ghost: probe(ghost),
      baseContent: base.content,
    }
  })
  // outline：属性在、伪元素不画、底部 start 角收紧为小圆角（默认 lg 更大）
  expect(r.outline.side).toBe('start')
  expect(r.outline.content).toBe('none')
  expect(r.outline.corner).not.toBe('0px')
  expect(Number.parseFloat(r.outline.corner)).toBeLessThanOrEqual(8)
  // muted / ghost：属性在但不画（无表面）
  expect(r.muted.content).toBe('none')
  expect(r.ghost.content).toBe('none')
})

test('RTL：tail=start 仍贴 inline-start（逻辑属性镜像）且无物理 left/right', async ({ page }) => {
  const r = await page.evaluate(() => {
    const host = document.createElement('div')
    host.dir = 'rtl'
    host.style.cssText = 'width: 360px; padding: 24px'
    document.body.appendChild(host)
    const el = document.createElement('oas-bubble')
    el.setAttribute('tail', 'start')
    el.textContent = 'رسالة'
    host.appendChild(el)
    const bubble = el.shadowRoot!.querySelector<HTMLElement>('[part="bubble"]')!
    const tail = getComputedStyle(bubble, '::after')
    return {
      insetStart: tail.insetInlineStart,
      insetEnd: tail.insetInlineEnd,
      left: tail.left,
      right: tail.right,
    }
  })
  expect(Number.parseFloat(r.insetStart)).toBeLessThan(0)
  expect(Number.parseFloat(r.insetEnd)).toBeCloseTo(57.4844, 1)
  // 逻辑偏移换算后物理边相反：RTL 下 start 对应右侧
  expect(Number.parseFloat(r.right)).toBeLessThan(0)
  expect(Number.parseFloat(r.left)).toBeCloseTo(57.4844, 1)
})

test('暗色：尾巴颜色仍取气泡表面（亮/暗背景色不同，尾巴渐变随表面变化）', async ({ page }) => {
  const read = () =>
    page.evaluate(() => {
      const host = document.createElement('div')
      host.id = 'e2e-bubble-tail-dark'
      host.style.cssText = 'width: 360px; padding: 24px'
      document.body.appendChild(host)
      const el = document.createElement('oas-bubble')
      el.setAttribute('tail', 'start')
      el.textContent = '消息'
      host.appendChild(el)
      const bubble = el.shadowRoot!.querySelector<HTMLElement>('[part="bubble"]')!
      const tail = getComputedStyle(bubble, '::after')
      const result = {
        surface: getComputedStyle(bubble).backgroundColor,
        background: tail.backgroundImage,
      }
      host.remove()
      return result
    })
  const light = await read()
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  const dark = await read()
  expect(light.background).toContain('radial-gradient')
  expect(dark.background).toContain('radial-gradient')
  // 尾巴与表面同源：渐变里应出现表面色；暗色下整个表面与尾巴都换色
  expect(light.background).toContain(light.surface)
  expect(dark.background).toContain(dark.surface)
  expect(dark.surface).not.toBe(light.surface)
})
