// 复核回归：barcode（新组件批）——机制固化：六码制渲染 / 非法输入事件 / 静区护栏 / 暗色白底 / console 零告警。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('barcode：role=img 与 aria-label 落在图形元素上，非法输入渲染错误占位并派发 oas-invalid', async ({ page }) => {
  const badWarns: string[] = []
  // 与 console-sweep 同口径过滤良性资源噪声（静态托管下理论不出现，防环境噪声误报）
  const allow = [/net::ERR_/, /Failed to load resource/, /vite/, /hydrating/]
  page.on('console', (m) => {
    if ((m.type() === 'error' || m.type() === 'warning') && !allow.some((re) => re.test(m.text()))) {
      badWarns.push(`${m.type()}: ${m.text()}`)
    }
  })
  await page.goto('/components/barcode.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#barcode-invalid-demo')

  const r = await page.evaluate(async () => {
    const host = document.querySelector('#barcode-invalid-demo') as HTMLElement & { shadowRoot: ShadowRoot }
    const svg = host.shadowRoot.querySelector('svg') as SVGSVGElement
    const errorEl = host.shadowRoot.querySelector('[part="error"]') as HTMLElement
    // 初始合法值：图形在、无占位
    const okRole = svg.getAttribute('role')
    const okLabel = svg.getAttribute('aria-label')
    const okErrorHidden = errorEl.hasAttribute('hidden')

    // 置非法值（EAN-13 塞字母 → charset）：错误占位可见 + oas-invalid 派发且 reason 正确
    const events: Array<{ reason: string; bubbles: boolean; composed: boolean }> = []
    host.addEventListener('oas-invalid', (e) => {
      const d = (e as CustomEvent).detail as { reason: string }
      events.push({ reason: d.reason, bubbles: e.bubbles, composed: e.composed })
    })
    host.setAttribute('value', '40063813339A')
    await new Promise((res) => setTimeout(res, 0))
    const badErrorVisible = !errorEl.hasAttribute('hidden')
    const badErrorText = errorEl.textContent ?? ''
    const badSvgHidden = svg.hasAttribute('hidden')

    // 同一非法输入改无关属性：不重复派发
    host.setAttribute('height', '80')
    await new Promise((res) => setTimeout(res, 0))
    const eventsAfterNoise = events.length

    // 修正：恢复渲染、占位隐藏
    host.setAttribute('value', '4006381333931')
    await new Promise((res) => setTimeout(res, 0))
    const fixedSvgVisible = !svg.hasAttribute('hidden')
    const fixedErrorHidden = errorEl.hasAttribute('hidden')

    return {
      okRole,
      okLabel,
      okErrorHidden,
      badErrorVisible,
      badErrorText,
      badSvgHidden,
      events,
      eventsAfterNoise,
      fixedSvgVisible,
      fixedErrorHidden,
    }
  })

  expect(r.okRole, '图形语义挂在 <svg> 上').toBe('img')
  expect(r.okLabel, '图形元素应有可访问名').toBeTruthy()
  expect(r.okErrorHidden, '合法值时错误占位隐藏').toBe(true)
  expect(r.badErrorVisible, '非法值时错误占位可见').toBe(true)
  expect(r.badErrorText, '错误占位含 i18n 文案').toContain('编码规则')
  expect(r.badSvgHidden, '非法值时图形隐藏').toBe(true)
  expect(r.events, 'oas-invalid 派发一次且 reason=charset').toEqual([
    { reason: 'charset', bubbles: true, composed: true },
  ])
  expect(r.eventsAfterNoise, '无关属性变化不重复派发').toBe(1)
  expect(r.fixedSvgVisible, '修正后恢复渲染').toBe(true)
  expect(r.fixedErrorHidden, '修正后错误占位隐藏').toBe(true)

  // demo 页本身（加载 + 上述交互）不得产生任何 console error/warning
  expect(badWarns, 'console 零告警').toEqual([])
})

test('barcode：六码制切换全部可渲染，整体宽度由内容决定；暗色下默认仍白底深条', async ({ page }) => {
  await page.goto('/components/barcode.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-barcode')

  const r = await page.evaluate(async () => {
    const make = async (attrs: Record<string, string>): Promise<HTMLElement> => {
      const el = document.createElement('oas-barcode')
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      document.body.append(el)
      await customElements.whenDefined('oas-barcode')
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
      return el
    }
    const svgOf = (el: HTMLElement): SVGSVGElement => el.shadowRoot!.querySelector('svg')!

    // 六码制合法样例全部出条形 path
    const cases: Array<[string, string, string]> = [
      ['code128', 'LOG-2026-0042', 'code128'],
      ['ean13', '4006381333931', 'ean13'],
      ['ean8', '96385074', 'ean8'],
      ['upca', '036000291452', 'upca'],
      ['code39', 'ASSET-0093', 'code39'],
      ['itf14', '10614141000415', 'itf14'],
    ]
    const widths: Record<string, string> = {}
    const rendered: Record<string, boolean> = {}
    for (const [key, value, format] of cases) {
      const el = await make({ value, format })
      const svg = svgOf(el)
      rendered[key] = !svg.hasAttribute('hidden') && svg.querySelector('path[shape-rendering="crispEdges"]') !== null
      widths[key] = svg.getAttribute('width') ?? ''
      el.remove()
    }

    // 静区护栏：显式 margin 低于 10×bar-width → 收敛到 20（默认 bar-width 2）
    const clamped = await make({ value: '123', margin: '1' })
    const clampedWidth = svgOf(clamped).getAttribute('width')
    clamped.remove()

    // 暗色主题：默认底 rect 恒为固定白 var 通道（可扫性优先，不随主题漂移）
    document.documentElement.classList.add('dark')
    const darkEl = await make({ value: '123' })
    const darkFill = svgOf(darkEl).querySelector('rect')!.getAttribute('fill')
    const darkPathFill = svgOf(darkEl).querySelector('path')!.getAttribute('fill')
    document.documentElement.classList.remove('dark')
    darkEl.remove()

    return { rendered, widths, clampedWidth, darkFill, darkPathFill }
  })

  for (const key of ['code128', 'ean13', 'ean8', 'upca', 'code39', 'itf14']) {
    expect(r.rendered[key], `${key} 应渲染出条形 path`).toBe(true)
    expect(Number(r.widths[key]), `${key} 宽度应由内容决定（>0）`).toBeGreaterThan(0)
  }
  // '123'（68 模 × 2）+ 收敛静区 20×2 = 176
  expect(r.clampedWidth, 'margin 低于下限收敛到 10×bar-width').toBe('176')
  expect(r.darkFill, '暗色下默认底仍固定白 var 通道').toBe('var(--oas-barcode-bg, #ffffff)')
  expect(r.darkPathFill, '暗色下默认条仍固定深色 var 通道').toBe('var(--oas-barcode-color, #18181b)')
})
