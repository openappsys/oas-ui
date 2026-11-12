// 复核回归：scanner（新组件批）——手动模式真实输入提交（oas-scan + 幂等）/ start-stop 属性同步 /
// not-supported 降级确定性 / dark 主题 / console 零告警。
// 相机抽帧链路（getUserMedia + BarcodeDetector detect）在无头环境不可确定性执行，不进 e2e：
// 机制由 oas-scanner.test.ts 单测全量覆盖；真实相机链路走用户视角验证门禁。

import { test, expect, type Page } from '@playwright/test'
import { up } from './helpers'

/** console 零告警收集（与 console-sweep 同口径过滤良性资源噪声，防环境噪声误报） */
function collectBadConsole(page: Page): string[] {
  const badWarns: string[] = []
  const allow = [
    /net::ERR_/,
    /Failed to load resource/,
    /vite/,
    /hydrating/,
    /cookie .*overwritten/i,
    /scroll-linked positioning effect/i,
  ]
  page.on('console', (m) => {
    if ((m.type() === 'error' || m.type() === 'warning') && !allow.some((re) => re.test(m.text()))) {
      badWarns.push(`${m.type()}: ${m.text()}`)
    }
  })
  return badWarns
}

test('scanner：手动模式真实输入提交派发 oas-scan（trim + 无 format + 幂等 + 输入清空），start/stop 同步 active 属性', async ({
  page,
}) => {
  const badWarns = collectBadConsole(page)
  await page.goto('/components/scanner.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#scanner-manual')

  const host = page.locator('#scanner-manual')
  const input = host.locator('.manual-input')
  const submit = host.locator('.manual-submit')

  // 手动行默认显示（manual 属性在场），label 关联 input
  await expect(host).toBeVisible()
  await expect(input).toBeVisible()
  await expect(submit).toBeVisible()
  const labelFor = await host.locator('.manual-label').getAttribute('for')
  const inputId = await input.getAttribute('id')
  expect(labelFor, 'label[for] 应关联手动输入框').toBe(inputId)

  // 挂事件采集（真实键入之前）
  await host.evaluate((el) => {
    ;(window as unknown as { __scannerEvents: unknown[] }).__scannerEvents = []
    el.addEventListener('oas-scan', (e) => {
      const d = (e as CustomEvent).detail as { value: string; format?: string }
      ;(window as unknown as { __scannerEvents: unknown[] }).__scannerEvents.push({
        value: d.value,
        hasFormat: 'format' in d,
        bubbles: e.bubbles,
        composed: e.composed,
      })
    })
  })

  // 真实键入 + Enter 提交（原生 form submit 语义，键盘可达）
  await input.fill('  OAS-2026-001  ')
  await input.press('Enter')
  const events = await page.evaluate(
    () => (window as unknown as { __scannerEvents: Array<Record<string, unknown>> }).__scannerEvents,
  )
  expect(events, 'Enter 提交派发 oas-scan：value trim、无 format、bubbles+composed').toEqual([
    { value: 'OAS-2026-001', hasFormat: false, bubbles: true, composed: true },
  ])
  await expect(input, '提交后输入框清空').toHaveValue('')

  // 幂等：同一 value 重复提交（按钮点击路径）不重发
  await input.fill('OAS-2026-001')
  await submit.click()
  const eventsAfterDup = await page.evaluate(
    () => (window as unknown as { __scannerEvents: Array<Record<string, unknown>> }).__scannerEvents,
  )
  expect(eventsAfterDup.length, '同值重复提交不重复派发').toBe(1)

  // start()/stop() 命令式便捷与 active 属性同步（状态以属性为准）
  const activeSync = await host.evaluate((el) => {
    const s = el as HTMLElement & { start(): void; stop(): void }
    s.start()
    const started = el.hasAttribute('active')
    s.stop()
    const stopped = el.hasAttribute('active')
    return { started, stopped }
  })
  expect(activeSync, 'start/stop 置/移 active 属性').toEqual({ started: true, stopped: false })

  expect(badWarns, 'console 零告警').toEqual([])
})

test('scanner：无 BarcodeDetector 环境下 active 置位自动落手动模式并派发一次 not-supported（环境自适应）', async ({
  page,
}) => {
  await page.goto('/components/scanner.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#scanner-manual')

  const r = await page.evaluate(async () => {
    const el = document.createElement('oas-scanner')
    const errors: Array<{ code: string }> = []
    el.addEventListener('oas-error', (e) => errors.push((e as CustomEvent).detail as { code: string }))
    document.body.append(el)
    await customElements.whenDefined('oas-scanner')
    el.setAttribute('active', '')
    await new Promise((res) => setTimeout(res, 50))
    const form = el.shadowRoot!.querySelector('form[part="manual"]')!
    const status = el.shadowRoot!.querySelector('[part="status"]')!
    const supported = 'BarcodeDetector' in window
    // 无关属性抖动不重发
    el.setAttribute('aria-label', '自定义名')
    await new Promise((res) => setTimeout(res, 0))
    const errorsAfterNoise = errors.length
    el.removeAttribute('active')
    el.remove()
    return {
      supported,
      errors,
      errorsAfterNoise,
      manualShown: !form.hasAttribute('hidden'),
      statusText: status.textContent ?? '',
    }
  })

  if (!r.supported) {
    // 本仓 Playwright chromium 默认不带 BarcodeDetector flag：确定性走降级链
    expect(r.errors, 'not-supported 派发一次且 detail 正确').toEqual([{ code: 'not-supported' }])
    expect(r.manualShown, '自动降级：手动行显示').toBe(true)
    expect(r.errorsAfterNoise, '无关属性变化不重复派发').toBe(1)
    // 状态区渲染 i18n 降级文案（zh-CN：「当前环境不支持相机扫码，请手动输入」）——
    // 双关键片段同时命中：raw key（scanner.unsupported）或空文案都拦下
    expect(r.statusText, '状态区渲染降级文案（非 raw key）').toContain('不支持')
    expect(r.statusText, '降级文案含手动输入指引').toContain('手动输入')
  } else {
    // 带 BarcodeDetector 的环境走 getUserMedia 分支（结果取决于设备/权限），机制由单测覆盖
    expect(r.errors.length, '有 detector 时不派发 not-supported').toBe(0)
  }
})

test('scanner：dark 主题下手动模式输入提交可用、状态区可见', async ({ page }) => {
  const badWarns = collectBadConsole(page)
  await page.goto('/components/scanner.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#scanner-manual')

  // 文档站暗色切换（html.dark），切回前完成断言
  await page.evaluate(() => document.documentElement.classList.add('dark'))

  const host = page.locator('#scanner-manual')
  const input = host.locator('.manual-input')
  await host.evaluate((el) => {
    ;(window as unknown as { __scannerDarkEvents: unknown[] }).__scannerDarkEvents = []
    el.addEventListener('oas-scan', () => {
      ;(window as unknown as { __scannerDarkEvents: unknown[] }).__scannerDarkEvents.push(1)
    })
  })

  // dark 下真实输入提交照常工作
  await input.fill('DARK-42')
  await input.press('Enter')
  const fired = await page.evaluate(
    () => (window as unknown as { __scannerDarkEvents: number[] }).__scannerDarkEvents.length,
  )
  expect(fired, 'dark 下手动提交仍派发 oas-scan').toBe(1)
  await expect(input, 'dark 下提交后输入框清空').toHaveValue('')

  // 状态区可见（token 配色在 dark 下可读——视觉核对由用户视角门禁截图复核）
  const status = host.locator('[part="status"]')
  await expect(status).toBeVisible()

  await page.evaluate(() => document.documentElement.classList.remove('dark'))
  expect(badWarns, 'console 零告警').toEqual([])
})
