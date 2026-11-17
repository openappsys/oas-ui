// 复核回归：password-strength——真实输入驱动档位、事件「变化才派发」、受控 level 不派发、
// score-fn property 接管、slot 自动发现、axe demo 区零严重违规、暗色对比度、
// Vue 桥接（levels JSON 属性存活）、console 零告警。
// demo 锚点（packages/docs/docs/components/password-strength.md）：
//   #ps-demo-pwd + [for="ps-demo-pwd"] / #ps-demo-ctrl / #ps-demo-fn-toggle + #ps-demo-fn-meter /
//   slot meter（无 for 且内嵌原生 input）/ #ps-demo-lv-pwd + oas-password-strength[levels]。

import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { up } from './helpers'

type ConsolePage = Page & { __oasConsole: string[] }

const PAGE_URL = '/components/password-strength.html'
const MAIN_METER = 'oas-password-strength[for="ps-demo-pwd"]'
/** 弱口令打字串：逐字符到 'abcde1' 恰好升到 1 分（danger） */
const WEAK_TYPED = 'abcde1'
/** 强密码：13 位 4 类（内置评分 4）；第 12 位时先升 4，末位同分不再派发 */
const STRONG = 'MyStr0ng!Pass'

// token 解析实色（theme/index.css）——主题分支翻转的确定性锚点：
// 分段填充 = 状态实色（light #16a34a / dark #4ade80）；档位文案 = -text 文字安全色（light #11813a / dark 同 #4ade80）
const LIGHT_SUCCESS_RGB = 'rgb(22, 163, 74)'
const DARK_SUCCESS_RGB = 'rgb(74, 222, 128)'
const LIGHT_SUCCESS_TEXT_RGB = 'rgb(17, 129, 58)'
const DARK_SUCCESS_TEXT_RGB = 'rgb(74, 222, 128)'

// console 告警收集（workbench 同口径）：error/warning 都算；
// 白名单 = preview 生产构建下 GA4 cookie 过期 benign 告警 + firefox scroll-linked 引擎级性能提示。
test.beforeEach(async ({ page }) => {
  const p = page as ConsolePage
  p.__oasConsole = []
  page.on('console', (msg) => {
    if (msg.type() !== 'error' && msg.type() !== 'warning') return
    if (/_ga_RXS142HBXF|Google Analytics|gtag/.test(msg.text())) return
    if (/scroll-linked positioning effect/i.test(msg.text())) return
    p.__oasConsole.push(`${msg.type()}: ${msg.text()}`)
  })
})

function expectNoConsole(page: Page): void {
  expect((page as ConsolePage).__oasConsole, '全程 console 零告警（error/warning）').toEqual([])
}

/** 页面事件收集：document 级挂 oas-score-change（可按宿主选择器过滤；宿主经 matches 识别） */
async function collectScoreEvents(page: Page, hostSel?: string): Promise<void> {
  await page.evaluate((sel) => {
    const w = window as unknown as { __psEvents?: Array<{ score: number; label: string; host: string | null }> }
    w.__psEvents = []
    document.addEventListener('oas-score-change', (e) => {
      const target = e.target as Element | null
      if (sel && !(target && target.matches(sel))) return
      const ce = e as CustomEvent<{ score: number; label: string }>
      const host = target?.getAttribute('for') ?? target?.id ?? null
      w.__psEvents!.push({ ...ce.detail, host })
    })
  }, hostSel ?? null)
}

function collectedEvents(page: Page): Promise<Array<{ score: number; label: string; host: string | null }>> {
  return page.evaluate(
    () =>
      (window as unknown as { __psEvents?: Array<{ score: number; label: string; host: string | null }> }).__psEvents ??
      [],
  )
}

/** meter 状态快照：bar 的 meter aria + 分段点亮数 + 档位文案 */
function meterState(page: Page, sel: string) {
  return page.evaluate((s) => {
    const host = document.querySelector<HTMLElement>(s)
    if (!host) return null
    const root = host.shadowRoot!
    const segs = [...root.querySelectorAll<HTMLElement>('[part="segment"]')]
    const label = root.querySelector<HTMLElement>('[part="label"]')
    const bar = root.querySelector<HTMLElement>('[part="bar"]')
    return {
      now: bar?.getAttribute('aria-valuenow'),
      ariaLabel: bar?.getAttribute('aria-label'),
      barLevel: bar?.getAttribute('data-level') ?? '',
      lit: segs.filter((x) => x.classList.contains('filled')).length,
      segCount: segs.length,
      labelText: label?.textContent ?? '',
      labelHidden: label?.hidden ?? true,
    }
  }, sel)
}

/** 颜色探针：点亮段实色 / 档位文案色 / 最近非透明祖先底色（demo-block 底 = --oas-color-bg） */
function colorProbe(page: Page, sel: string) {
  return page.evaluate((s) => {
    const host = document.querySelector<HTMLElement>(s)!
    const root = host.shadowRoot!
    const seg = [...root.querySelectorAll<HTMLElement>('[part="segment"]')].find((x) => x.classList.contains('filled'))!
    const label = root.querySelector<HTMLElement>('[part="label"]')!
    let n: Element | null = host
    let bg = ''
    while (n && n !== document.documentElement) {
      const c = getComputedStyle(n).backgroundColor
      if (c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)') {
        bg = c
        break
      }
      n = n.parentElement
    }
    if (!bg) bg = getComputedStyle(document.body).backgroundColor
    return {
      segBg: getComputedStyle(seg).backgroundColor,
      labelColor: getComputedStyle(label).color,
      bg,
    }
  }, sel)
}

/** WCAG 相对亮度对比度（workbench.spec 先例同式） */
function luminance(rgb: string): number {
  const m = rgb.match(/rgba?\((\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)/)
  if (!m) throw new Error(`无法解析的 rgb 颜色串：${rgb}`)
  const f = (v: number): number => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(Number(m[1])) + 0.7152 * f(Number(m[2])) + 0.0722 * f(Number(m[3]))
}

function contrastRatio(fg: string, bg: string): number {
  const a = luminance(fg)
  const b = luminance(bg)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

test('真实输入驱动档位：弱打字→danger、强打字→success、弱口令表命中恒最弱（for 关联 + show-label）', async ({
  page,
}) => {
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  await up(page, MAIN_METER)
  const input = page.locator('#ps-demo-pwd').locator('input[part="input"]')
  await input.click()

  // 逐字符真打字弱组合 → 1 分 danger（分段 1 点亮 + 文案「弱」）
  await input.pressSequentially(WEAK_TYPED)
  await expect
    .poll(() => meterState(page, MAIN_METER), { timeout: 10_000 })
    .toEqual(expect.objectContaining({ now: '1', barLevel: 'danger', lit: 1, labelText: '弱' }))
  const weak = await meterState(page, MAIN_METER)
  // 点亮数与 aria-valuenow 一致（分段总数与渲染结构由单测模板断言守护）
  expect(weak!.lit, '点亮段数与 aria-valuenow 一致').toBe(Number(weak!.now))
  expect(weak!.labelHidden, 'show-label 在场：文案可见').toBe(false)
  expect(weak!.ariaLabel).toBe('弱')

  // 清空 → 回落空档（全灭 + neutral + 很弱）
  await input.press('ControlOrMeta+a')
  await input.press('Backspace')
  await expect
    .poll(() => meterState(page, MAIN_METER), { timeout: 10_000 })
    .toEqual(expect.objectContaining({ now: '0', barLevel: 'neutral', lit: 0, labelText: '很弱' }))

  // 弱口令表命中（123456）：恒最弱档，不得因纯数字长度升档
  await input.pressSequentially('123456')
  await expect
    .poll(() => meterState(page, MAIN_METER), { timeout: 10_000 })
    .toEqual(expect.objectContaining({ now: '0', barLevel: 'neutral', lit: 0, labelText: '很弱' }))

  // 清空 → 强密码逐字符 → 满档 success（分段 4 点亮 + 文案「很强」）
  await input.press('ControlOrMeta+a')
  await input.press('Backspace')
  await input.pressSequentially(STRONG)
  await expect
    .poll(() => meterState(page, MAIN_METER), { timeout: 10_000 })
    .toEqual(expect.objectContaining({ now: '4', barLevel: 'success', lit: 4, labelText: '很强' }))
  expect(await meterState(page, MAIN_METER)).toEqual(expect.objectContaining({ ariaLabel: '很强', labelHidden: false }))
  // 几何回归：指示条宽度跟随目标输入（flex 收缩语境下曾塌成 12px——真实浏览器截图复核发现）
  const widths = await page.evaluate(() => {
    const host = document.querySelector('oas-password-strength[for="ps-demo-pwd"]') as HTMLElement
    const bar = host.shadowRoot!.querySelector('[part="bar"]') as HTMLElement
    const target = document.getElementById('ps-demo-pwd') as HTMLElement
    const br = bar.getBoundingClientRect()
    const ir = target.getBoundingClientRect()
    return { barW: br.width, inputW: ir.width, hostInlineW: host.style.width }
  })
  expect(widths.inputW, '目标输入应有布局宽').toBeGreaterThan(100)
  expect(widths.barW, '指示条不得塌缩（回归：flex 收缩语境下曾 12px）').toBeGreaterThan(200)
  expect(widths.hostInlineW).toBe(`${Math.round(widths.inputW)}px`)
  expectNoConsole(page)
})

test('oas-score-change：detail {score,label}，逐字符输入 21 键仅 6 次档位变化派发（变化才派发）', async ({ page }) => {
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  await up(page, MAIN_METER)
  await collectScoreEvents(page, 'oas-password-strength[for="ps-demo-pwd"]')
  const input = page.locator('#ps-demo-pwd').locator('input[part="input"]')
  await input.click()
  await input.pressSequentially(WEAK_TYPED)
  await expect
    .poll(() => meterState(page, MAIN_METER), { timeout: 10_000 })
    .toEqual(expect.objectContaining({ now: '1' }))
  await input.press('ControlOrMeta+a')
  await input.press('Backspace')
  await expect
    .poll(() => meterState(page, MAIN_METER), { timeout: 10_000 })
    .toEqual(expect.objectContaining({ now: '0' }))
  await input.pressSequentially(STRONG)
  await expect
    .poll(() => meterState(page, MAIN_METER), { timeout: 10_000 })
    .toEqual(expect.objectContaining({ now: '4' }))

  // 精确事件序列（探针实测固化为回归口径）：
  // 弱组合升 1 → 清空回落 0 → 强密码逐字符 1('MyStr0')→2('MyStr0n'，len 7 无长度基础分)→
  // 3('MyStr0ng'，len 8)→4('MyStr0ng!Pas'，len 12 加权；末位同分不重发）
  expect(await collectedEvents(page)).toEqual([
    { score: 1, label: '弱', host: 'ps-demo-pwd' },
    { score: 0, label: '很弱', host: 'ps-demo-pwd' },
    { score: 1, label: '弱', host: 'ps-demo-pwd' },
    { score: 2, label: '一般', host: 'ps-demo-pwd' },
    { score: 3, label: '强', host: 'ps-demo-pwd' },
    { score: 4, label: '很强', host: 'ps-demo-pwd' },
  ])
  expectNoConsole(page)
})

test('受控 level demo：五档按钮逐一切档（分段/aria/文案同步）且全程不派发事件', async ({ page }) => {
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  await up(page, '#ps-demo-ctrl')
  await collectScoreEvents(page, 'ps-demo-ctrl')

  const CTRL = '#ps-demo-ctrl'
  const expected: Record<number, { barLevel: string; label: string; lit: number }> = {
    0: { barLevel: 'neutral', label: '很弱', lit: 0 },
    1: { barLevel: 'danger', label: '弱', lit: 1 },
    2: { barLevel: 'warning', label: '一般', lit: 2 },
    3: { barLevel: 'success', label: '强', lit: 3 },
    4: { barLevel: 'success', label: '很强', lit: 4 },
  }
  for (const n of [0, 1, 2, 3, 4]) {
    await page.locator('oas-button', { hasText: `level=${n}` }).click()
    const want = expected[n]!
    await expect
      .poll(() => meterState(page, CTRL), { timeout: 10_000 })
      .toEqual(
        expect.objectContaining({
          now: String(n),
          barLevel: want.barLevel,
          lit: want.lit,
          labelText: want.label,
          ariaLabel: want.label,
        }),
      )
  }
  // 受控模式：值由宿主给，任何切档不得派发 oas-score-change（防双向绑定回环）
  expect(await collectedEvents(page), '受控切档零事件').toEqual([])
  expectNoConsole(page)
})

test('score-fn demo：同一密码在自定义评分开/关下档位不同（JS property 真实接管）', async ({ page }) => {
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  await up(page, '#ps-demo-fn-meter')
  const input = page.locator('#ps-demo-fn-pwd').locator('input[part="input"]')
  await input.click()
  // 内置评分：'abc' = 0
  await input.pressSequentially('abc')
  await expect
    .poll(() => meterState(page, '#ps-demo-fn-meter'), { timeout: 10_000 })
    .toEqual(expect.objectContaining({ now: '0' }))
  // 勾选自定义评分（demo 以 property 赋值 scoreFn）：同密码按长度档 → 1
  await page.locator('#ps-demo-fn-toggle').check()
  await expect
    .poll(() => meterState(page, '#ps-demo-fn-meter'), { timeout: 10_000 })
    .toEqual(expect.objectContaining({ now: '1' }))
  // 取消勾选（scoreFn 置 null）：恢复内置 → 0；同一密码三个状态
  await page.locator('#ps-demo-fn-toggle').uncheck()
  await expect
    .poll(() => meterState(page, '#ps-demo-fn-meter'), { timeout: 10_000 })
    .toEqual(expect.objectContaining({ now: '0' }))
  // property 通道在设计上就是组件 API：原型访问器在场（'scoreFn' in el 且 setter 后为 function）
  const propChannel = await page.evaluate(() => {
    const el = document.querySelector('#ps-demo-fn-meter') as HTMLElement & { scoreFn?: unknown }
    return { hasAccessor: 'scoreFn' in el, type: typeof el.scoreFn }
  })
  expect(propChannel.hasAccessor, 'scoreFn 原型访问器在场（property 通道存在）').toBe(true)
  expect(propChannel.type, 'demo 勾选已取消后 scoreFn 复位为 null（内置评分恢复）').toBe('object')
  expectNoConsole(page)
})

test('slot 形态：内嵌原生 input 自动发现并实时评分（无 for 关联）', async ({ page }) => {
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-password-strength')
  const slotMeter = page.locator('oas-password-strength').filter({ has: page.locator('input[type="password"]') })
  await expect(slotMeter).toHaveCount(1)
  const slotInput = slotMeter.locator('input[type="password"]')
  await slotInput.click()
  await slotInput.pressSequentially(STRONG)
  // 从 slot meter 自身读取状态（页面上 :not([for]) 的 meter 有多个，document.querySelector 会取错）
  await expect
    .poll(
      () =>
        slotMeter.evaluate((el) => {
          const root = el.shadowRoot!
          const bar = root.querySelector<HTMLElement>('[part="bar"]')!
          const label = root.querySelector<HTMLElement>('[part="label"]')
          const segs = [...root.querySelectorAll<HTMLElement>('[part="segment"]')]
          return {
            now: bar.getAttribute('aria-valuenow'),
            barLevel: bar.getAttribute('data-level'),
            lit: segs.filter((x) => x.classList.contains('filled')).length,
            labelText: label?.textContent ?? '',
          }
        }),
      { timeout: 10_000 },
    )
    .toEqual(expect.objectContaining({ now: '4', barLevel: 'success', lit: 4, labelText: '很强' }))
  expectNoConsole(page)
})

test('axe + meter 语义：demo 区零 critical/serious，bar role=meter + aria-valuenow/min/max（host generic）', async ({
  page,
}) => {
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  await up(page, MAIN_METER)
  // 先驱动出真实档位状态再审计（含打字后的 label 文案/分段态）
  const input = page.locator('#ps-demo-pwd').locator('input[part="input"]')
  await input.click()
  await input.pressSequentially(STRONG)
  await expect
    .poll(() => meterState(page, MAIN_METER), { timeout: 10_000 })
    .toEqual(expect.objectContaining({ now: '4' }))

  const axe = await new AxeBuilder({ page }).include('.demo-block').analyze()
  expect(
    axe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
    '组件 demo 区 axe 零 critical/serious 违规',
  ).toEqual([])

  const semantics = await page.evaluate((s) => {
    const host = document.querySelector<HTMLElement>(s)!
    const bar = host.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
    return {
      hostRole: host.getAttribute('role'),
      role: bar.getAttribute('role'),
      min: bar.getAttribute('aria-valuemin'),
      max: bar.getAttribute('aria-valuemax'),
      now: bar.getAttribute('aria-valuenow'),
      label: bar.getAttribute('aria-label'),
      tabIndex: host.tabIndex,
    }
  }, MAIN_METER)
  expect(semantics.role, 'bar 承载 meter 语义').toBe('meter')
  expect(
    semantics.hostRole,
    'host 不挂 role=meter（slot 内嵌输入不被 meter 子内容展平吞掉，nested-interactive 回归）',
  ).toBeNull()
  expect(semantics.min).toBe('0')
  expect(semantics.max).toBe('4')
  expect(semantics.now).toBe('4')
  expect(semantics.label).toBe('很强')
  expect(semantics.tabIndex, '纯指示组件不进 tab 序（不抢焦点）').toBe(-1)
  expectNoConsole(page)
})

test('暗色：点亮段与档位文案翻转后仍可读（成功档 token 实色锚定 + 对比度）', async ({ page }) => {
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  await up(page, MAIN_METER)
  const input = page.locator('#ps-demo-pwd').locator('input[part="input"]')
  await input.click()
  await input.pressSequentially(STRONG)
  await expect
    .poll(() => meterState(page, MAIN_METER), { timeout: 10_000 })
    .toEqual(expect.objectContaining({ now: '4', barLevel: 'success' }))

  // 亮色：点亮段 = success 实色（等 120ms 过渡到终值，避免过渡中间态采样）；文案 = -text 文字安全色
  await expect
    .poll(() => colorProbe(page, MAIN_METER).then((c) => c.segBg), { timeout: 10_000 })
    .toBe(LIGHT_SUCCESS_RGB)
  const light = await colorProbe(page, MAIN_METER)
  expect(light.segBg, '亮色点亮段 = --oas-color-success 实色').toBe(LIGHT_SUCCESS_RGB)
  expect(light.labelColor, '亮色档位文案 = -text 文字安全色（实色 3.29:1 不达 4.5:1，回归）').toBe(
    LIGHT_SUCCESS_TEXT_RGB,
  )
  expect(contrastRatio(light.segBg, light.bg), '亮色点亮段对比度 ≥3:1（WCAG 1.4.11 非文字）').toBeGreaterThanOrEqual(3)
  expect(
    contrastRatio(light.labelColor, light.bg),
    '亮色档位文案对比度 ≥4.5:1（WCAG 1.4.3 小字）',
  ).toBeGreaterThanOrEqual(4.5)

  // 切暗色：token 翻转完成的真实信号 = 点亮段到达暗色 token 终值（避开 120ms 过渡中间态）
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await expect.poll(() => colorProbe(page, MAIN_METER).then((c) => c.segBg), { timeout: 10_000 }).toBe(DARK_SUCCESS_RGB)
  const dark = await colorProbe(page, MAIN_METER)
  expect(dark.segBg).toBe(DARK_SUCCESS_RGB)
  expect(dark.labelColor, '暗色档位文案 = 暗色 -text 文字安全色').toBe(DARK_SUCCESS_TEXT_RGB)
  expect(contrastRatio(dark.segBg, dark.bg), '暗色点亮段对比度 ≥3:1').toBeGreaterThanOrEqual(3)
  expect(contrastRatio(dark.labelColor, dark.bg), '暗色档位文案对比度 ≥4:1').toBeGreaterThanOrEqual(4)
  await page.evaluate(() => document.documentElement.classList.remove('dark'))
  expectNoConsole(page)
})

test('Vue 桥接：levels JSON 属性在 Vue 渲染下存活且驱动档位文案（attribute 通道，无 property 劫持）', async ({
  page,
}) => {
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-password-strength[levels]')
  // attribute 通道存活：Vue 渲染后 levels JSON 仍在（若被 property 赋值劫持会静默消失）
  const raw = await page.evaluate(() => document.querySelector('oas-password-strength[levels]')!.getAttribute('levels'))
  expect(JSON.parse(raw!), 'levels JSON 属性存活且可解析').toEqual(['太弱', '较弱', '中等', '较强', '很强'])
  // 组件无 levels 访问器：'levels' in el 为 false → Vue 走 setAttribute（劫持不成立的结构证据）
  const hijackRisk = await page.evaluate(() => 'levels' in document.querySelector('oas-password-strength[levels]')!)
  expect(hijackRisk, '组件无 levels 同名 property（Vue 按 attribute 写入）').toBe(false)

  // 属性真实驱动行为：档位升到 1 分时文案显示自定义第 1 档「较弱」（≠ 内置「弱」）
  await collectScoreEvents(page, 'oas-password-strength[levels]')
  const input = page.locator('#ps-demo-lv-pwd').locator('input[part="input"]')
  await input.click()
  await input.pressSequentially(WEAK_TYPED)
  await expect
    .poll(() => meterState(page, 'oas-password-strength[levels]'), { timeout: 10_000 })
    .toEqual(expect.objectContaining({ now: '1', labelText: '较弱', ariaLabel: '较弱' }))
  // 事件 label 同步携带自定义文案
  expect(await collectedEvents(page)).toEqual([{ score: 1, label: '较弱', host: 'ps-demo-lv-pwd' }])
  expectNoConsole(page)
})
