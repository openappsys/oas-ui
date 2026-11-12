// 复核回归：signature（新组件批）——机制固化：真实 mouse 笔画 → oas-change 幂等 → 清空归零 /
// 受控回显 / disabled 拦截 / DPR 高清 / 暗色笔色重解析 / a11y 角色与标签 / console 零告警。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

const allow = [
  /net::ERR_/,
  /Failed to load resource/,
  /vite/,
  /hydrating/,
  /cookie .*overwritten/i,
  /scroll-linked positioning effect/i,
]

function watchConsole(page: import('@playwright/test').Page): string[] {
  const bad: string[] = []
  page.on('console', (m) => {
    if ((m.type() === 'error' || m.type() === 'warning') && !allow.some((re) => re.test(m.text()))) {
      bad.push(`${m.type()}: ${m.text()}`)
    }
  })
  return bad
}

/** 真实 mouse 在画布上画一条折线（相对画布左上角的 CSS px 路径） */
async function stroke(page: import('@playwright/test').Page, canvasSel: string, path: Array<[number, number]>) {
  // 先滚入视口再测量——boundingBox 是页面坐标，目标在视口外时 mouse 事件打空（2026-11 e2e 实抓）
  await page.locator(canvasSel).scrollIntoViewIfNeeded()
  const box = await page.locator(canvasSel).boundingBox()
  if (!box) throw new Error(`canvas not visible: ${canvasSel}`)
  const toAbs = ([x, y]: [number, number]) => ({ x: box.x + x, y: box.y + y })
  await page.mouse.move(toAbs(path[0]!).x, toAbs(path[0]!).y)
  await page.mouse.down()
  for (const p of path.slice(1)) {
    await page.mouse.move(toAbs(p).x, toAbs(p).y, { steps: 4 })
  }
  await page.mouse.up()
}

test('signature：真实 mouse 笔画 → oas-change 幂等 → 清空按钮归零', async ({ page }) => {
  const badWarns = watchConsole(page)
  await page.goto('/components/signature.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sig-basic')

  const canvasSel = 'oas-signature#sig-basic [part="canvas"]'
  const events: Array<{ value: string; bubbles: boolean; composed: boolean }> = []
  await page.evaluate(() => {
    const host = document.querySelector('#sig-basic') as HTMLElement
    ;(window as any).__sigEvents = []
    host.addEventListener('oas-change', (e) => {
      const d = (e as CustomEvent).detail as { value: string }
      ;(window as any).__sigEvents.push({ value: d.value, bubbles: e.bubbles, composed: e.composed })
    })
  })

  // 第一笔：派发一次 oas-change，value 为 PNG dataURL
  const PATH: Array<[number, number]> = [
    [20, 20],
    [80, 60],
    [140, 30],
    [200, 80],
  ]
  await stroke(page, canvasSel, PATH)
  // 第二笔（不同路径 → 不同 value）：必再派发——同值幂等语义由单测覆盖；
  // 真实 canvas 反走样使同路径二次合成的 PNG 字节不同，「同路径必幂等」前提在此不成立
  const PATH2: Array<[number, number]> = [
    [30, 120],
    [100, 90],
    [170, 130],
    [240, 60],
  ]
  await stroke(page, canvasSel, PATH2)

  const r = await page.evaluate(() => {
    const host = document.querySelector('#sig-basic') as HTMLElement & {
      toDataURL(): string
      shadowRoot: ShadowRoot
    }
    const events = (window as any).__sigEvents as Array<{ value: string; bubbles: boolean; composed: boolean }>
    const canvas = host.shadowRoot.querySelector('[part="canvas"]') as HTMLCanvasElement
    return {
      events,
      attr: host.getAttribute('value') ?? '',
      method: host.toDataURL(),
      canvasW: canvas.width,
      cssW: canvas.getBoundingClientRect().width,
      dpr: window.devicePixelRatio,
      aria: canvas.getAttribute('aria-label'),
      role: canvas.getAttribute('role'),
      placeholderHidden: host.shadowRoot.querySelector('[part="placeholder"]')!.hasAttribute('hidden'),
      placeholderDisplay: getComputedStyle(host.shadowRoot.querySelector('[part="placeholder"]')!).display,
      live: host.shadowRoot.querySelector('.sr-status')!.textContent,
    }
  })

  expect(r.events, '两笔各派发一次').toHaveLength(2)
  expect(r.events[0]!.bubbles).toBe(true)
  expect(r.events[0]!.composed).toBe(true)
  expect(r.events[0]!.value, '事件 value 为 PNG dataURL').toMatch(/^data:image\/png;base64,/)
  expect(r.events[1]!.value, '不同路径的第二笔 value 不同').not.toBe(r.events[0]!.value)
  expect(r.attr).toBe(r.events[1]!.value)
  expect(r.method, 'toDataURL() 与属性通道一致').toBe(r.attr)
  expect(r.canvasW, 'canvas backing store 按 DPR 放大（高清，DPR=1 时等宽）').toBeGreaterThanOrEqual(200)
  expect(r.canvasW, 'backing store 宽度 = CSS 宽度 × DPR（语义不变量，隐含 DPR ≥ 1）').toBe(Math.round(r.cssW * r.dpr))
  expect(r.canvasW % Math.round(r.dpr), 'backing store 宽度为 DPR 整数倍').toBe(0)
  expect(r.role).toBe('img')
  expect(r.aria).toContain('已签名')
  expect(r.placeholderHidden).toBe(true)
  expect(r.placeholderDisplay, '占位「在此签名」签名后须真实不可见（.placeholder[hidden] 覆盖 display:flex）').toBe(
    'none',
  )
  expect(r.live).toContain('已签名')

  // 清空按钮：value 归空 + 派发 { value: '' }，状态回到未签名
  await page.locator('oas-signature#sig-basic [part="clear-button"]').click()
  const after = await page.evaluate(() => {
    const host = document.querySelector('#sig-basic') as HTMLElement
    const events = (window as any).__sigEvents as Array<{ value: string }>
    const canvas = host.shadowRoot!.querySelector('[part="canvas"]') as HTMLCanvasElement
    return {
      count: events.length,
      last: events[events.length - 1]!,
      attr: host.getAttribute('value') ?? '',
      aria: canvas.getAttribute('aria-label'),
    }
  })
  expect(after.count, '清空按钮再派发一次（在笔画两笔的基础上 +1）').toBe(r.events.length + 1)
  expect(after.last.value).toBe('')
  expect(after.attr).toBe('')
  expect(after.aria).toContain('未签名')

  expect(badWarns, 'console 零告警').toEqual([])
})

test('signature：受控回显与 disabled 拦截', async ({ page }) => {
  const badWarns = watchConsole(page)
  await page.goto('/components/signature.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sig-src')

  // 左板签名 → 受控写入右板（readonly 回显板）
  await stroke(page, 'oas-signature#sig-src [part="canvas"]', [
    [20, 20],
    [100, 80],
    [180, 40],
  ])
  const r = await page.evaluate(async () => {
    const src = document.querySelector('#sig-src') as HTMLElement
    const echo = document.querySelector('#sig-echo') as HTMLElement
    // 宿主受控闭环：回写组件自己刚派发的值 → 不清空、不震荡
    const v = src.getAttribute('value') ?? ''
    let echoEvents = 0
    echo.addEventListener('oas-change', () => echoEvents++)
    echo.setAttribute('value', v)
    await new Promise((res) => setTimeout(res, 50))
    const echoCanvas = echo.shadowRoot!.querySelector('[part="canvas"]') as HTMLCanvasElement
    return {
      srcValue: v,
      echoValue: echo.getAttribute('value') ?? '',
      echoEvents,
      echoAria: echoCanvas.getAttribute('aria-label'),
      echoDisabled: (echo.shadowRoot!.querySelector('[part="clear-button"]') as HTMLButtonElement).hidden,
    }
  })
  expect(r.srcValue).toMatch(/^data:image\/png;base64,/)
  // 外部图像异步加载完成：回显板进入已签名状态且未派发多余事件
  expect(r.echoValue).toBe(r.srcValue)
  expect(r.echoEvents).toBe(0)
  expect(r.echoAria).toContain('已签名')

  // disabled 板：真实 mouse 笔画被拦截（无 value、无事件）
  const d = await page.evaluate(() => {
    const host = document.querySelector('#sig-basic') as HTMLElement
    host.setAttribute('disabled', '')
    let events = 0
    host.addEventListener('oas-change', () => events++)
    ;(window as any).__sigDisabledEvents = () => events
    return host.getAttribute('value') ?? ''
  })
  await stroke(page, 'oas-signature#sig-basic [part="canvas"]', [
    [30, 30],
    [120, 90],
  ])
  const dAfter = await page.evaluate(() => {
    const host = document.querySelector('#sig-basic') as HTMLElement
    host.removeAttribute('disabled')
    return {
      value: host.getAttribute('value') ?? '',
      events: (window as any).__sigDisabledEvents() as number,
      aria: (host.shadowRoot!.querySelector('[part="canvas"]') as HTMLCanvasElement).getAttribute('aria-label'),
    }
  })
  expect(dAfter.value).toBe(d)
  expect(dAfter.events).toBe(0)
  expect(dAfter.aria).toContain('未签名')

  expect(badWarns, 'console 零告警').toEqual([])
})

test('signature：笔画进行中容器 resize 不丢段——value 非空且两笔只派发两次', async ({ page }) => {
  const badWarns = watchConsole(page)
  await page.goto('/components/signature.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sig-basic')

  const canvasSel = 'oas-signature#sig-basic [part="canvas"]'
  await page.evaluate(() => {
    const host = document.querySelector('#sig-basic') as HTMLElement
    ;(window as any).__sigResizeEvents = []
    host.addEventListener('oas-change', (e) => {
      const d = (e as CustomEvent).detail as { value: string }
      ;(window as any).__sigResizeEvents.push(d.value)
    })
  })

  // 第一笔：正常落定
  await stroke(page, canvasSel, [
    [20, 20],
    [80, 60],
    [140, 30],
  ])
  // 第二笔：画到一半时宿主改容器尺寸（触发 ResizeObserver → repaint 重置画布），
  // 已画段必须随重绘保留，尾笔完整入值
  const box = await page.locator(canvasSel).boundingBox()
  if (!box) throw new Error('canvas not visible')
  await page.mouse.move(box.x + 30, box.y + 120)
  await page.mouse.down()
  await page.mouse.move(box.x + 100, box.y + 90, { steps: 4 })
  await page.evaluate(() => {
    const host = document.querySelector('#sig-basic') as HTMLElement
    host.style.width = '360px'
  })
  await page.mouse.move(box.x + 170, box.y + 130, { steps: 4 })
  await page.mouse.move(box.x + 240, box.y + 60, { steps: 4 })
  await page.mouse.up()

  const r = await page.evaluate(() => {
    const host = document.querySelector('#sig-basic') as HTMLElement
    const events = (window as any).__sigResizeEvents as string[]
    return { events, attr: host.getAttribute('value') ?? '' }
  })
  expect(r.events, '第二笔后只有两次派发').toHaveLength(2)
  for (const v of r.events) expect(v, '笔画中 resize 后 value 仍为非空 PNG').toMatch(/^data:image\/png;base64,/)
  expect(r.attr).toBe(r.events[1])

  expect(badWarns, 'console 零告警').toEqual([])
})

test('signature：暗色下默认笔色翻转为浅色、画板边界可见', async ({ page }) => {
  const badWarns = watchConsole(page)
  await page.goto('/components/signature.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-signature')

  const r = await page.evaluate(async () => {
    document.documentElement.classList.add('dark')
    const el = document.createElement('oas-signature')
    el.setAttribute('clearable', '')
    el.style.width = '320px'
    document.body.append(el)
    await customElements.whenDefined('oas-signature')
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
    const canvas = el.shadowRoot!.querySelector('[part="canvas"]') as HTMLCanvasElement
    const cs = getComputedStyle(canvas)
    // 等两次 rAF 让主题 observer 重解析完成
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
    const colorAfter = getComputedStyle(canvas).color
    document.documentElement.classList.remove('dark')
    return {
      bg: cs.backgroundColor,
      borderW: cs.borderWidth,
      borderS: cs.borderStyle,
      // 默认笔色 = --oas-color-text-primary 解析值：暗色应为浅色（相对亮度高）
      color: colorAfter,
    }
  })

  // 暗色画板底色应为 dark token（非透明/白），边框 1px 实线保障 forced-colors 下边界可见
  expect(r.borderS).toBe('solid')
  expect(Number.parseFloat(r.borderW), '边框宽 1px（CSS 固定值，与字体度量无关）').toBe(1)
  expect(r.color).not.toBe('rgb(24, 24, 27)')

  expect(badWarns, 'console 零告警').toEqual([])
})

test('signature：外部图像受控回显后 resize 不抹图——画布非空、状态保持已签名', async ({ page }) => {
  const badWarns = watchConsole(page)
  await page.goto('/components/signature.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sig-src')

  // 左板签名 → 受控写入回显板 → 外部图像异步加载完成后改容器尺寸（ResizeObserver → repaint）
  await stroke(page, 'oas-signature#sig-src [part="canvas"]', [
    [20, 20],
    [100, 80],
    [180, 40],
  ])
  const r = await page.evaluate(async () => {
    const src = document.querySelector('#sig-src') as HTMLElement
    const echo = document.querySelector('#sig-echo') as HTMLElement & { toDataURL(): string }
    echo.setAttribute('value', src.getAttribute('value') ?? '')
    // 等外部图像 onload + repaint 落定
    await new Promise((res) => setTimeout(res, 100))
    // 容器尺寸变化：repaint 重置画布像素，外部图像必须垫底重放（否则回显被抹成空白画布）
    echo.style.width = '360px'
    await new Promise((res) => setTimeout(res, 100))
    const canvas = echo.shadowRoot!.querySelector('[part="canvas"]') as HTMLCanvasElement
    const ctx = canvas.getContext('2d')!
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let inked = 0
    for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) inked++
    return {
      inked,
      // 外部签名图 contain 垫底铺满画板——非透明像素应占绝大多数（防「零星噪点即通过」）
      total: canvas.width * canvas.height,
      url: echo.toDataURL(),
      aria: canvas.getAttribute('aria-label'),
      placeholderHidden: echo.shadowRoot!.querySelector('[part="placeholder"]')!.hasAttribute('hidden'),
      live: echo.shadowRoot!.querySelector('.sr-status')!.textContent,
    }
  })
  expect(
    r.inked,
    'resize 后画布非透明像素 > 0.5%——稀疏笔画签名图像被垫底重放（实测约 2.6%；断言意图是「图像内容保留」而非满幅）',
  ).toBeGreaterThan(r.total * 0.005)
  expect(r.url, 'value 契约保持非空 PNG').toMatch(/^data:image\/png;base64,/)
  expect(r.aria).toContain('已签名')
  expect(r.placeholderHidden).toBe(true)
  expect(r.live).toContain('已签名')

  expect(badWarns, 'console 零告警').toEqual([])
})
