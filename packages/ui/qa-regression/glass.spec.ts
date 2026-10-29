// 磨砂玻璃 L2：材质机制 + 感知对比度实测门禁（PRD 承诺：代表性背景 <60 零容忍）。
// 方法：已知纯底背板上的半透明 surface 做 alpha 合成求有效底色，对 surface 文字色跑
// 感知对比度（与 a11y.spec 同源 oklab 评分）——亮蓝/品红/深青三类代表背板 × 明暗双主题。

import { test, expect, type Page } from '@playwright/test'
import { perceptualContrast, relativeLuminance } from '../../theme/oklab'
import { GLASS_REGISTRY } from '../../theme/glass-fluid.js'

const PAGE = '/guide/glass.html'

/** rgba(r,g,b,a) over 纯色底 → 有效合成色 */
function composite(fg: [number, number, number, number], bg: [number, number, number]): [number, number, number] {
  const a = fg[3]
  return [
    Math.round(fg[0] * a + bg[0] * (1 - a)),
    Math.round(fg[1] * a + bg[1] * (1 - a)),
    Math.round(fg[2] * a + bg[2] * (1 - a)),
  ]
}

function parseRgba(s: string): [number, number, number, number] | null {
  const m = s.match(/rgba?\(([^)]+)\)/)
  if (!m) return null
  const parts = m[1]!.split(',').map((x) => parseFloat(x))
  return [parts[0]!, parts[1]!, parts[2]!, parts.length > 3 ? parts[3]! : 1]
}

/** 归一化任意计算色值 → [r,g,b,a]（0-255）：hex / color(srgb r g b [/ a]) / rgb(a)。
 *  color-mix 计算值经浏览器序列化为 `color(srgb …)`，只匹配 `rgba?()` 会静默漏采（假绿）。 */
function parseSrgb(s: string): [number, number, number, number] | null {
  if (s.trim() === 'transparent') return [0, 0, 0, 0]
  // Lightning CSS 可能把半透明色压缩为 #rgba / #rrggbbaa；必须保留 alpha 归一化。
  const hex = s.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i)
  if (hex) {
    const h = hex[1]!
    const expand = (x: string): number => parseInt(x.length === 1 ? x + x : x, 16)
    if (h.length <= 4) {
      return [expand(h[0]!), expand(h[1]!), expand(h[2]!), h[3] ? expand(h[3]) / 255 : 1]
    }
    const n = parseInt(h.slice(0, 6), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1]
  }
  const cs = s.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/)
  if (cs) return [Number(cs[1]) * 255, Number(cs[2]) * 255, Number(cs[3]) * 255, cs[4] != null ? Number(cs[4]) : 1]
  const m = s.match(/rgba?\(([^)]+)\)/)
  if (!m) return null
  const p = m[1]!
    .split(/[,\s/]+/)
    .filter(Boolean)
    .map(Number)
  return [p[0]!, p[1]!, p[2]!, p.length > 3 ? p[3]! : 1]
}

const BACKDROPS: Array<[string, [number, number, number]]> = [
  ['亮蓝', [64, 120, 255]],
  ['品红', [255, 120, 180]],
  ['深青', [31, 74, 68]],
]

test.describe('磨砂玻璃材质层', () => {
  for (const theme of ['light', 'dark']) {
    test(`材质机制 + 文字感知对比度（${theme}，三类背板 <60 零容忍）`, async ({ page }) => {
      await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
      if (theme === 'dark') await page.evaluate(() => document.documentElement.classList.add('dark'))
      await page.waitForTimeout(800)
      const r = await page.evaluate(() => {
        const card = document.querySelector('.gg-card')!
        const cs = getComputedStyle(card)
        const stage = document.querySelector('.gg-stage')!
        return {
          cardBg: cs.backgroundColor,
          blur: cs.backdropFilter || (cs as unknown as { webkitBackdropFilter: string }).webkitBackdropFilter,
          ringColor: cs.outlineColor,
          titleColor: getComputedStyle(card.querySelector('strong')!).color,
          textColor: getComputedStyle(card.querySelector('p')!).color,
          // 真次要文字（第二卡带 inline secondary 样式的 p；不得用第一卡 p 兜底——曾因此漏测 light secondary）
          secondaryColor: getComputedStyle(document.querySelectorAll('.gg-card')[1]!.querySelector('p')!).color,
          stageBg: getComputedStyle(stage).backgroundImage,
        }
      })
      // 机制：blur 生效（非 none）、ring 非透明、surface 半透明
      expect(r.blur, 'backdrop-filter 应生效').not.toBe('none')
      expect(r.blur).toContain('blur(')
      expect(r.ringColor, '折光边应可见（非透明）').not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
      const surf = parseRgba(r.cardBg)!
      expect(surf[3], 'surface 半透明（alpha < 1）').toBeLessThan(1)
      if (theme === 'dark') {
        // 暗色折光边曾压到 0.16，深色背景上几乎不可见；锁住「能感知但不刺眼」的下限
        const ring = parseRgba(r.ringColor)!
        expect(ring[3], '暗色折光边 alpha 不应回落到不可感知档（>= 0.4）').toBeGreaterThanOrEqual(0.4)
      }
      // 感知对比度：surface 文字色 ×（surface rgba 合成到三类代表背板）
      for (const [label, bd] of BACKDROPS) {
        const eff = composite(surf, bd)
        const bgCss = `rgb(${eff[0]}, ${eff[1]}, ${eff[2]})`
        const bgRgb: [number, number, number] = [eff[0], eff[1], eff[2]]
        for (const [what, colorStr] of [
          ['标题/正文', r.titleColor],
          ['正文', r.textColor],
          ['次要文字', r.secondaryColor],
        ] as const) {
          const fg = parseRgba(colorStr)!
          const score = Math.abs(perceptualContrast(relativeLuminance([fg[0], fg[1], fg[2]]), relativeLuminance(bgRgb)))
          expect(
            score,
            `${theme}/${label}/${what}（${colorStr} on ${bgCss}）感知分 ${score.toFixed(1)} 应 ≥ 60`,
          ).toBeGreaterThanOrEqual(60)
        }
      }
    })
  }

  test('demo 深浅切换走全站主题：暗色卡片仍半透明（stage 基础 token 不得覆盖玻璃 surface）', async ({ page }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    await page.locator('.gg-toolbar .sg-btn').filter({ hasText: 'dark' }).click()
    await page.waitForTimeout(300)
    const r = await page.evaluate(() => ({
      dark: document.documentElement.classList.contains('dark'),
      stageTheme: document.querySelector('.gg-stage')?.getAttribute('data-theme') ?? null,
      cardBg: getComputedStyle(document.querySelector('.gg-card')!).backgroundColor,
    }))
    expect(r.dark, '点 dark 应切到全站暗色（否则玻璃暗色档不生效）').toBe(true)
    expect(r.stageTheme, '切换器不得只改 stage 的 data-theme（会命中基础 dark token，盖掉玻璃 surface）').toBeNull()
    expect(parseRgba(r.cardBg)![3], '暗色玻璃 surface 应保持半透明').toBeLessThan(1)
  })

  test('high-contrast 下不启用（实心可访问性档优先）', async ({ page }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)
    const blur = await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'high-contrast')
      const cs = getComputedStyle(document.querySelector('.gg-card')!)
      return cs.backdropFilter
    })
    expect(blur, 'HC 下玻璃不启用（blur 回落 none）').toBe('none')
  })

  test('high-contrast × class 式暗色同样不启用（.dark 选择器排除实抓回归锁）', async ({ page }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)
    const blur = await page.evaluate(() => {
      // 宿主常见的 html.dark class 式暗色与 HC 并存时，玻璃材质也必须整体让位
      document.documentElement.classList.add('dark')
      document.documentElement.setAttribute('data-theme', 'high-contrast')
      const cs = getComputedStyle(document.querySelector('.gg-card')!)
      return cs.backdropFilter
    })
    expect(blur, 'HC × .dark 下玻璃不启用（blur 回落 none）').toBe('none')
  })

  test('浅色玻璃阴影含发丝线（白底面板边缘不消失——用户实抓回归锁）', async ({ page }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)
    const shadow = await page.evaluate(() => getComputedStyle(document.querySelector('.gg-card')!).boxShadow)
    // 浅色玻璃：surface/折光边皆为白色系，白底上面板边界消失——发丝线 0 0 0 1px 深色细线补边缘
    expect(shadow, '浅色玻璃阴影应含发丝线（0px 0px 0px 1px）').toContain('0px 0px 0px 1px')
  })

  test('浅色玻璃内部隔断线为深色（modal 标题分割线在白面板上可见——用户实抓回归锁）', async ({ page }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    const divider = await page.evaluate(async () => {
      const btns = [...document.querySelectorAll('oas-button')]
      ;(
        btns.find((b) => /打开对话框/.test(b.textContent || ''))?.shadowRoot?.querySelector('button') as
          | HTMLButtonElement
          | undefined
      )?.click()
      await new Promise((res) => setTimeout(res, 500))
      const modal = document.querySelector('oas-modal')
      const header = modal?.shadowRoot?.querySelector('.header, [part="header"]')
      if (!header) return null
      const bb = getComputedStyle(header).borderBottomColor
      modal?.remove()
      return bb
    })
    expect(divider, '画廊对话框应打开且有标题区').not.toBeNull()
    // 白色结构线（rgba(255,255,255,...)）在白面板上消失——必须为深色系
    expect(divider, '标题分割线必须为深色系（白面板上可见）').toMatch(/^rgba?\(0, 0, 0,/)
  })

  test('局部降级：容器覆盖变量后 surface 回实心语义', async ({ page }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)
    const r = await page.evaluate(() => {
      const stage = document.querySelector('.gg-stage') as HTMLElement
      stage.style.setProperty('--oas-glass-blur', 'none')
      stage.style.setProperty('--oas-glass-ring', 'transparent')
      const cs = getComputedStyle(document.querySelector('.gg-card')!)
      return { blur: cs.backdropFilter, ring: cs.outlineColor }
    })
    expect(r.blur).toBe('none')
    expect(r.ring).toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
  })
})

test.describe('玻璃材质与动态高光（跨浏览器一致）', () => {
  test('玻璃控件不消费位移滤镜，开关尺寸与布局盒一致（Chromium/Firefox 同构）', async ({ page }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(900)
    const r = await page.evaluate(() => {
      const read = (host: Element) => {
        const root = (host as HTMLElement).shadowRoot
        const surfaces = [...(root?.querySelectorAll('button, .thumb, input[type="range"]') ?? [])]
        return surfaces.map((el) => getComputedStyle(el).filter)
      }
      const hosts = [...document.querySelectorAll('.gg-stage oas-button, .gg-stage oas-switch, .gg-stage oas-slider')]
      const sw = document.querySelector('.gg-controls oas-switch') as HTMLElement
      const swButton = sw?.shadowRoot?.querySelector('button')
      const box = swButton?.getBoundingClientRect()
      return {
        filters: hosts.flatMap((h) => read(h)),
        switchBox: box ? { w: box.width, h: box.height } : null,
      }
    })
    expect(r.filters.length, '应采到玻璃控件 surface').toBeGreaterThan(0)
    for (const filter of r.filters) {
      expect(filter, '玻璃控件不得再消费浏览器专属位移滤镜').not.toContain('data:image/svg+xml')
      expect(filter, '玻璃控件不得再出现 feDisplacementMap').not.toContain('feDisplacementMap')
    }
    expect(r.switchBox).toEqual({ w: 40, h: 22 })
  })

  /** 动态流动感覆盖的控件域探针：[标签, 在宿主内取 surface 元素]（message 系共享 .box 形态，见源断言） */
  const FLUID_CASES: Array<[string, (host: HTMLElement) => Element | null]> = [
    ['oas-button', (h) => h.shadowRoot!.querySelector('button')],
    ['oas-switch', (h) => h.shadowRoot!.querySelector('button')],
    ['oas-slider', (h) => h.shadowRoot!.querySelector('input[type="range"]')],
    ['oas-app-bar', (h) => h],
    ['oas-bottom-navigation', (h) => h.shadowRoot!.querySelector('.tablist')],
    ['oas-message', (h) => h.shadowRoot!.querySelector('.box')],
  ]

  test('prefers-reduced-transparency：实心回退（关 blur/ring/sheen）', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CDP media emulation is Chromium-only')
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
    })
    await page.waitForTimeout(250)
    const r = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement)
      const card = getComputedStyle(document.querySelector('.gg-card')!)
      return {
        matched: matchMedia('(prefers-reduced-transparency: reduce)').matches,
        blur: root.getPropertyValue('--oas-glass-blur').trim(),
        ring: root.getPropertyValue('--oas-glass-ring').trim(),
        sheen: root.getPropertyValue('--oas-glass-sheen').trim(),
        cardBg: card.backgroundColor,
        cardBlur: card.backdropFilter,
      }
    })
    expect(r.matched).toBe(true)
    expect(r.blur).toBe('none')
    expect(r.ring).toBe('transparent')
    expect(r.sheen).toBe('transparent')
    expect(r.cardBg).toBe('rgb(255, 255, 255)')
    expect(r.cardBlur).toBe('none')
  })

  test('动态流动感：多组件指针命中 → 坐标变量 + 高光亮起 → 离开清理（跨引擎）', async ({ page }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(900)
    // 逐个注入探针组件到固定位置（docs 全量包已注册全部组件）
    // 等组件升级 + 一帧渲染后取 **surface 自身** rect（宿主 rect ≠ surface rect，空 bottom-nav 高度为 0）
    const boxes = await page.evaluate(
      async (cases: string[]) => {
        const selOf = (t: string): string | null =>
          t === 'oas-button' || t === 'oas-switch'
            ? 'button'
            : t === 'oas-slider'
              ? 'input[type="range"]'
              : t === 'oas-bottom-navigation'
                ? '.tablist'
                : t === 'oas-message'
                  ? '.box'
                  : null
        const out: Record<string, { x: number; y: number; w: number; h: number }> = {}
        for (let i = 0; i < cases.length; i++) {
          const tag = cases[i]!
          const el = document.createElement(tag) as HTMLElement
          el.style.cssText = `position:fixed;left:80px;top:${60 + i * 70}px;z-index:9999;width:220px;min-height:40px`
          if (tag === 'oas-message') el.setAttribute('open', '')
          document.body.appendChild(el)
          await customElements.whenDefined(tag)
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))))
          const sel = selOf(tag)
          const surface = ((sel ? el.shadowRoot?.querySelector(sel) : el) ?? el) as HTMLElement
          const r = surface.getBoundingClientRect()
          out[tag] = { x: r.x, y: r.y, w: Math.max(1, r.width), h: Math.max(1, r.height) }
        }
        return out
      },
      FLUID_CASES.map(([tag]) => tag),
    )
    for (const [tag] of FLUID_CASES) {
      const b = boxes[tag]!
      await page.mouse.move(b.x + b.w / 2, b.y + b.h / 2)
      // 轮询等待高光激活（去固定等待赌博）
      await page.waitForFunction(
        (t: string) => {
          const sel =
            t === 'oas-button' || t === 'oas-switch'
              ? 'button'
              : t === 'oas-slider'
                ? 'input[type="range"]'
                : t === 'oas-bottom-navigation'
                  ? '.tablist'
                  : t === 'oas-message'
                    ? '.box'
                    : null
          const host = [...document.querySelectorAll(t)].pop() as HTMLElement
          const surface = (sel ? host.shadowRoot!.querySelector(sel) : host) as Element | null
          return !!surface && surface.hasAttribute('data-glass-fluid')
        },
        tag,
        { timeout: 5000 },
      )
      const on = await page.evaluate((t: string) => {
        const sel =
          t === 'oas-button' || t === 'oas-switch'
            ? 'button'
            : t === 'oas-slider'
              ? 'input[type="range"]'
              : t === 'oas-bottom-navigation'
                ? '.tablist'
                : t === 'oas-message'
                  ? '.box'
                  : null
        const host = [...document.querySelectorAll(t)].pop() as HTMLElement
        const surface = (sel ? host.shadowRoot!.querySelector(sel) : host) as HTMLElement | null
        const after = surface ? getComputedStyle(surface, '::after') : null
        return {
          px: surface ? surface.style.getPropertyValue('--oas-glass-px') : '',
          // 真断言：无 content 的伪元素不生成（backgroundImage 会照返回声明值 → 单看它会假绿）
          afterContent: after?.content ?? '',
          afterBg: after?.backgroundImage ?? '',
          afterOpacity: after?.opacity ?? '',
          sheetInjected: (host.shadowRoot?.adoptedStyleSheets?.length ?? 0) > 0,
        }
      }, tag)
      // B 档：组件源码零标记；命中后运行时写坐标变量 + 注入样式表渲染高光层
      expect(on.px, `${tag} 应写本地坐标`).toMatch(/%$/)
      expect(on.sheetInjected, `${tag} shadow 根应被注入共享样式表`).toBe(true)
      if (tag !== 'oas-slider') {
        expect(on.afterContent, `${tag} 高光层必须真生成（::after content 非 none）`).not.toBe('none')
        expect(on.afterBg, `${tag} 注入表应渲染高光（radial-gradient）`).toContain('radial-gradient')
      }
      // slider 高光落在把手伪元素（::-webkit-slider-thumb / ::-moz-range-thumb）——UA 伪元素的
      // computed 通道不可靠，其规则存在性由单测（sheet 断言）与「注册表↔真实 DOM 对账」覆盖
    }
    // 离开：全部清理
    await page.mouse.move(5, 5)
    await page.waitForTimeout(300)
    const leftover = await page.evaluate(() => {
      const hosts = [
        ...document.querySelectorAll(
          'oas-button, oas-switch, oas-slider, oas-app-bar, oas-bottom-navigation, oas-message',
        ),
      ]
      let n = 0
      for (const h of hosts) {
        const els = [h, ...(h.shadowRoot ? [...h.shadowRoot.querySelectorAll('*')] : [])]
        for (const el of els) if (el.hasAttribute('data-glass-fluid')) n++
      }
      return n
    })
    expect(leftover, '指针离开后不得残留 data-glass-fluid').toBe(0)
  })

  test('动态流动感：shadow 内动态新增的注册组件也被注入（观察器不跨 shadow 边界回归锁）', async ({ page }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(700)
    const r = await page.evaluate(async () => {
      const host = document.createElement('oas-card')
      document.body.appendChild(host)
      await customElements.whenDefined('oas-card')
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res(null))))
      // 往 shadow 内动态插入注册组件（模拟 oas-table 可编辑单元格在 shadow 内插入 oas-switch；
      // MutationObserver 不跨 shadow 边界，必须由该根自己的观察器发现）
      const btn = document.createElement('oas-button')
      btn.textContent = 'nested'
      host.shadowRoot!.appendChild(btn)
      await customElements.whenDefined('oas-button')
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res(null))))
      const injected = btn.shadowRoot ? (btn.shadowRoot.adoptedStyleSheets?.length ?? 0) : -1
      btn.remove()
      host.remove()
      return { injected }
    })
    expect(r.injected, 'shadow 内动态新增的注册组件也应被注入共享样式表').toBeGreaterThan(0)
  })

  test('动态流动感：message 系 `.box` 高光层真生成（四组件防「漏基态 → 伪元素不生成」假绿）', async ({ page }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(600)
    const r = await page.evaluate(
      async (tags: string[]) => {
        const out: Record<string, { content: string; bg: string; opacity: string; border: string }> = {}
        for (const tag of tags) {
          const host = document.createElement(tag) as HTMLElement
          document.body.appendChild(host)
          await customElements.whenDefined(tag)
          await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res(null))))
          const box = (host.shadowRoot?.querySelector('.box') ?? host) as HTMLElement
          // 直接置运行时标记（等价指针命中）——验「注入表本身」是否生成高光层
          box.setAttribute('data-glass-fluid', '')
          const cs = getComputedStyle(box, '::after')
          out[tag] = {
            content: cs.content,
            bg: cs.backgroundImage,
            opacity: cs.opacity,
            border: getComputedStyle(box).borderRadius,
          }
          box.removeAttribute('data-glass-fluid')
          host.remove()
        }
        return out
      },
      ['oas-message', 'oas-toast', 'oas-snackbar', 'oas-notification'],
    )
    for (const [tag, v] of Object.entries(r)) {
      expect(v.content, `${tag} .box 高光层必须真生成（::after content 非 none）`).not.toBe('none')
      expect(v.bg, `${tag} .box 高光应含 radial-gradient`).toContain('radial-gradient')
    }
  })

  test('动态流动感：surface 内部子元素跨界不熄灭高光（leave 精判回归）', async ({ page }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(900)
    const box = await page.evaluate(async () => {
      const btn = document.createElement('oas-button') as HTMLElement
      btn.setAttribute('type', 'primary')
      btn.textContent = 'fluid-cross-probe'
      btn.style.cssText = 'position:fixed;left:120px;top:120px;z-index:9999'
      document.body.appendChild(btn)
      await customElements.whenDefined('oas-button')
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))))
      const r = btn.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    })
    await page.mouse.move(box.x + box.w / 2, box.y + box.h / 2)
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('oas-button')]
          .pop()!
          .shadowRoot!.querySelector('button')!
          .hasAttribute('data-glass-fluid'),
      null,
      { timeout: 5000 },
    )
    // 在 surface 内部跨界（跨过内部文字/插槽子元素边界，触发 capture pointerleave 派发链）
    await page.mouse.move(box.x + box.w * 0.3, box.y + box.h / 2)
    await page.mouse.move(box.x + box.w * 0.8, box.y + box.h / 2)
    await page.waitForTimeout(250)
    const r = await page.evaluate(() => {
      const inner = [...document.querySelectorAll('oas-button')].pop()!.shadowRoot!.querySelector('button')!
      return { fluid: inner.hasAttribute('data-glass-fluid'), px: inner.style.getPropertyValue('--oas-glass-px') }
    })
    expect(r.fluid, 'surface 内部跨界后高光应仍在（leave 精判）').toBe(true)
    expect(r.px, '坐标应已重写').toMatch(/%$/)
  })

  test('动态流动感按压：按下换成更强的高光色（真增强），非压暗', async ({ page }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(900)
    // 专用探针（append 在最后 → `.pop()` 稳定命中，不依赖页面既有按钮的 DOM 次序）；
    // 用默认（玻璃）按钮：实心按钮的按压走内描边而非「更强高光铺底」，故以玻璃按钮验证更强按压高光
    const box = await page.evaluate(() => {
      const btn = document.createElement('oas-button') as HTMLElement
      btn.textContent = 'fluid-press-probe'
      btn.style.cssText = 'position:fixed;left:120px;top:120px;z-index:9999'
      document.body.appendChild(btn)
      const r = btn.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    })
    await page.waitForTimeout(200)
    await page.mouse.move(box.x + box.w * 0.6, box.y + box.h * 0.5)
    await page.waitForFunction(
      () => {
        const inner = [...document.querySelectorAll('oas-button')].pop()!.shadowRoot!.querySelector('button')
        return !!inner && inner.hasAttribute('data-glass-fluid')
      },
      null,
      { timeout: 5000 },
    )
    const hoverBg = await page.evaluate(() => {
      const inner = [...document.querySelectorAll('oas-button')].pop()!.shadowRoot!.querySelector('button')!
      return getComputedStyle(inner, '::after').backgroundImage
    })
    await page.mouse.down()
    await page.waitForTimeout(250)
    const pressBg = await page.evaluate(() => {
      const inner = [...document.querySelectorAll('oas-button')].pop()!.shadowRoot!.querySelector('button')!
      const cs = getComputedStyle(inner, '::after')
      return { bg: cs.backgroundImage, opacity: cs.opacity }
    })
    await page.mouse.up()
    expect(hoverBg, 'hover 态应有高光渐变').toContain('gradient')
    expect(pressBg.bg, '按压态应有高光渐变').toContain('gradient')
    expect(pressBg.bg, '按压高光色应强于 hover（0.5 vs 0.28）').not.toBe(hoverBg)
    expect(pressBg.bg, '按压用更强 sheen 色').toContain('0.5')
    expect(pressBg.opacity, '按压态不得把高光层压暗').toBe('1')
  })

  test('动态流动感作用域：实心按钮 hover 有高光、按压走边缘内描边（非提亮）；禁用玻璃无高光', async ({ page }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    const rects = await page.evaluate(async () => {
      const mk = (id: string, setup: (b: HTMLElement) => void) => {
        const b = document.createElement('oas-button') as HTMLElement
        b.id = id
        setup(b)
        b.style.cssText = `position:fixed;left:60px;top:${40 + ['g', 'p', 'c', 'd'].indexOf(id[0]!) * 70}px;z-index:99999`
        document.body.appendChild(b)
        return b
      }
      mk('g-glass', (b) => (b.textContent = 'g'))
      mk('p-primary', (b) => {
        b.setAttribute('type', 'primary')
        b.textContent = 'p'
      })
      mk('c-custom', (b) => {
        b.setAttribute('color', '#fbbf24')
        b.textContent = 'c'
      })
      mk('d-disabled', (b) => {
        b.setAttribute('disabled-focusable', '')
        b.textContent = 'd'
      })
      await customElements.whenDefined('oas-button')
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res(null))))
      return ['g-glass', 'p-primary', 'c-custom', 'd-disabled'].map((id) => {
        const r = document.getElementById(id)!.getBoundingClientRect()
        return { id, x: r.x, y: r.y, w: r.width, h: r.height }
      })
    })
    const bgOf: Record<string, string> = {}
    const contentOf: Record<string, string> = {}
    const hitOf: Record<string, boolean> = {}
    for (const rect of rects) {
      await page.mouse.move(rect.x + rect.w / 2, rect.y + rect.h / 2)
      await page.waitForTimeout(150)
      const read = await page.evaluate((id) => {
        const inner = document.getElementById(id)!.shadowRoot!.querySelector('button')!
        const cs = getComputedStyle(inner, '::after')
        return {
          bg: cs.backgroundImage,
          content: cs.content,
          hit: inner.hasAttribute('data-glass-fluid'),
        }
      }, rect.id)
      bgOf[rect.id] = read.bg
      contentOf[rect.id] = read.content
      hitOf[rect.id] = read.hit
    }
    // 先证命中链路通（否则排除项「未命中」也会得到 none → 假绿）
    for (const id of ['g-glass', 'p-primary', 'c-custom', 'd-disabled']) {
      expect(hitOf[id], `${id} 指针应命中（运行时写入 data-glass-fluid）`).toBe(true)
    }
    expect(bgOf['g-glass'], '玻璃按钮 hover 应有高光').toContain('radial-gradient')
    expect(bgOf['p-primary'], '实心语义色按钮 hover 应有高光').toContain('radial-gradient')
    expect(bgOf['c-custom'], '自定义色实心按钮 hover 应有高光').toContain('radial-gradient')
    // 高光层必须真生成（content 非 none）——不透明底 + z-index:-1 下不能只靠 backgroundImage 声明值
    for (const id of ['g-glass', 'p-primary', 'c-custom']) {
      expect(contentOf[id], `${id} 高光层必须真生成（::after content 非 none）`).not.toBe('none')
    }
    expect(bgOf['d-disabled'], '禁用玻璃按钮不得有高光（守卫不得被反超）').toBe('none')
    // 按压：实心按钮走边缘内描边（background 清空、box-shadow inset），不铺白底
    await page.mouse.move(rects[1]!.x + rects[1]!.w / 2, rects[1]!.y + rects[1]!.h / 2)
    await page.mouse.down()
    await page.waitForTimeout(150)
    const pressed = await page.evaluate(() => {
      const inner = document.getElementById('p-primary')!.shadowRoot!.querySelector('button')!
      const cs = getComputedStyle(inner, '::after')
      return { bg: cs.backgroundImage, shadow: cs.boxShadow }
    })
    await page.mouse.up()
    expect(pressed.bg, '按压不得提亮铺底（守白字对比度）').toBe('none')
    expect(pressed.shadow, '按压应显示边缘内描边').toContain('inset')
  })

  test('动态流动感对比度门禁：玻璃面高光叠底后文字仍达标（hover ≥60 / 按压 ≥45，双主题）', async ({ page }) => {
    for (const theme of ['light', 'dark'] as const) {
      await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
      if (theme === 'dark') await page.evaluate(() => document.documentElement.classList.add('dark'))
      await page.waitForTimeout(600)
      const r = await page.evaluate(
        async (cases: string[]) => {
          // 用 Canvas 把任意 CSS 计算色（rgb/color(srgb)/oklab/oklch/color-mix 结果）归一到 sRGB；
          // Vite/Lightning CSS 会改变主题色的序列化形式，正则白名单会漏采。
          const canvas = document.createElement('canvas')
          canvas.width = 1
          canvas.height = 1
          const ctx = canvas.getContext('2d')!
          const probe = document.createElement('span')
          const parse = (s: string): [number, number, number, number] | null => {
            if (!s) return null
            // 自定义属性可能是原始 color-mix()/var()；通过自定义属性再赋给 color，
            // 让浏览器完成计算，再交给 Canvas 归一化。
            probe.style.color = 'rgba(1, 2, 3, 0.5)'
            probe.style.setProperty('--oas-probe-color', s)
            probe.style.color = 'var(--oas-probe-color)'
            document.body.appendChild(probe)
            const resolved = getComputedStyle(probe).color
            probe.remove()
            if (!resolved || resolved === 'rgba(1, 2, 3, 0.5)') {
              // 探针不接受的自定义属性值（例如部分 #rrggbbaa 序列化）直接按 hex8 归一化。
              const hex8 = s.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
              if (hex8)
                return [
                  parseInt(hex8[1]!, 16),
                  parseInt(hex8[2]!, 16),
                  parseInt(hex8[3]!, 16),
                  parseInt(hex8[4]!, 16) / 255,
                ]
              return null
            }
            ctx.clearRect(0, 0, 1, 1)
            ctx.fillStyle = 'rgba(1, 2, 3, 0.5)'
            ctx.fillStyle = resolved
            ctx.fillRect(0, 0, 1, 1)
            const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
            if (r === 1 && g === 2 && b === 3 && a === 128) return null
            return [r!, g!, b!, a! / 255]
          }
          const out: Array<{ tag: string; fg: number[]; bg: number[]; sheen: number[]; sheenPress: number[] }> = []
          for (const tag of cases) {
            // 排除项（其 surface 文字与底色的组合无法用单点取样刻画）：
            // - slider：文字在 track 容器上、input 底透明，surface 无文字；
            // - switch：轨道内文案随 checked/未选中两态底色切换（组合矩阵需单独覆盖），且轨道底随状态变
            const host = document.createElement(tag) as HTMLElement
            host.style.cssText = 'position:fixed;left:-9999px;top:0'
            document.body.appendChild(host)
            await customElements.whenDefined(tag)
            await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res(null))))
            const sel =
              tag === 'oas-button' || tag === 'oas-switch'
                ? 'button'
                : tag === 'oas-slider'
                  ? 'input[type="range"]'
                  : tag === 'oas-bottom-navigation'
                    ? '.tablist'
                    : tag === 'oas-message'
                      ? '.box'
                      : null
            const surface = (sel ? host.shadowRoot!.querySelector(sel) : host) as HTMLElement | null
            if (surface) {
              const cs = getComputedStyle(surface)
              const rgb = parse(cs.color)
              const bg = parse(cs.backgroundColor)
              const sheen = parse(
                getComputedStyle(host).getPropertyValue('--oas-glass-sheen').trim() || 'rgba(255,255,255,0)',
              )
              const sheenPress = parse(
                getComputedStyle(host).getPropertyValue('--oas-glass-sheen-press').trim() || 'rgba(255,255,255,0)',
              )
              if (!rgb || !bg || !sheen || !sheenPress)
                throw new Error(
                  `无法归一化 ${tag} 的计算色值（禁止静默漏采）：fg=${JSON.stringify(cs.color)} bg=${JSON.stringify(cs.backgroundColor)} sheen=${JSON.stringify(getComputedStyle(host).getPropertyValue('--oas-glass-sheen'))} press=${JSON.stringify(getComputedStyle(host).getPropertyValue('--oas-glass-sheen-press'))}`,
                )
              out.push({ tag, fg: rgb, bg, sheen, sheenPress })
            }
            host.remove()
          }
          return out
        },
        FLUID_CASES.filter(([t]) => t !== 'oas-slider' && t !== 'oas-switch').map(([t]) => t),
      )
      expect(r.length, `${theme}：应采到控件文字与底色`).toBeGreaterThan(3)
      // 玻璃面（半透明）：有效底色取决于身后内容，按主题真实页面底合成；hover ≥60、按压（玻璃面提亮更强）≥45
      const pageBg: [number, number, number] = theme === 'light' ? [255, 255, 255] : [24, 24, 27]
      for (const item of r) {
        const [br, bg1, bb, ba] = item.bg as [number, number, number, number]
        const a = ba ?? 1
        const eff: [number, number, number] = [
          br * a + pageBg[0] * (1 - a),
          bg1 * a + pageBg[1] * (1 - a),
          bb * a + pageBg[2] * (1 - a),
        ]
        const [sr, sg, sb, sa] = item.sheen as [number, number, number, number]
        expect(sa, `${theme}/${item.tag}：sheen 必须有 alpha（为 0 则门禁空转假绿）`).toBeGreaterThan(0)
        const [fr, fg2, fb] = item.fg as [number, number, number, number]
        // 高光层落在「surface 背景之上、文字之下」（注入表 isolation:isolate + z-index:-1）——
        // 文字亮度不变，只有底被提亮；取「高光叠底（文字不动）」与「无高光基线」更差者
        const litBg: [number, number, number] = [
          sr * sa + eff[0] * (1 - sa),
          sg * sa + eff[1] * (1 - sa),
          sb * sa + eff[2] * (1 - sa),
        ]
        const score = Math.min(
          Math.abs(perceptualContrast(relativeLuminance([fr, fg2, fb]), relativeLuminance(litBg))),
          Math.abs(perceptualContrast(relativeLuminance([fr, fg2, fb]), relativeLuminance(eff))),
        )
        expect(score, `${theme}/${item.tag} hover 高光叠底后感知分 ${score.toFixed(1)} 应 ≥60`).toBeGreaterThanOrEqual(
          60,
        )
        // 按压态用更强高光色：瞬态、指针局部峰值、按钮/标签属大字号档——按 APCA 大字档 ≥45 设门限
        const [pr, pg, pb, pa] = item.sheenPress as [number, number, number, number]
        const litBgPress: [number, number, number] = [
          pr * pa + eff[0] * (1 - pa),
          pg * pa + eff[1] * (1 - pa),
          pb * pa + eff[2] * (1 - pa),
        ]
        const pressScore = Math.min(
          Math.abs(perceptualContrast(relativeLuminance([fr, fg2, fb]), relativeLuminance(litBgPress))),
          Math.abs(perceptualContrast(relativeLuminance([fr, fg2, fb]), relativeLuminance(eff))),
        )
        expect(
          pressScore,
          `${theme}/${item.tag} 按压高光感知分 ${pressScore.toFixed(1)} 应 ≥45（瞬态大字档）`,
        ).toBeGreaterThanOrEqual(45)
      }
      // 实心语义色按钮：hover 保留镜面高光（玻璃面同级），**按压走边缘内描边不提亮**（守白字对比度）。
      // hover 属瞬态大字档按 ≥45；静止/按压基线（底不被提亮）仍须 ≥60。
      const solSpecs: Array<{ label: string; type?: string; color?: string }> = [
        { label: 'primary', type: 'primary' },
        { label: 'success', type: 'success' },
        { label: 'warning', type: 'warning' },
        { label: 'danger', type: 'danger' },
        { label: 'custom#7c3aed', color: '#7c3aed' },
      ]
      const sol = await page.evaluate(
        (specs: Array<{ label: string; type?: string; color?: string }>) =>
          specs.map((spec) => {
            const host = document.createElement('oas-button')
            if (spec.type) host.setAttribute('type', spec.type)
            if (spec.color) host.setAttribute('color', spec.color)
            document.body.appendChild(host)
            const inner = host.shadowRoot!.querySelector('button')!
            const cs = getComputedStyle(inner)
            const out = {
              t: spec.label,
              color: cs.color,
              bg: cs.backgroundColor,
              sheen: getComputedStyle(host).getPropertyValue('--oas-glass-sheen').trim(),
            }
            host.remove()
            return out
          }),
        solSpecs,
      )
      const mixOver = (
        a: [number, number, number],
        b: [number, number, number],
        alpha: number,
      ): [number, number, number] => [
        a[0] * alpha + b[0] * (1 - alpha),
        a[1] * alpha + b[1] * (1 - alpha),
        a[2] * alpha + b[2] * (1 - alpha),
      ]
      for (const s of sol) {
        const fg = parseSrgb(s.color)
        const bg = parseSrgb(s.bg)
        const sh = parseSrgb(s.sheen || 'rgba(255,255,255,0)')
        expect(fg, `${theme}/${s.t} 文字色无法归一化（color-mix？）`).not.toBeNull()
        expect(bg, `${theme}/${s.t} 底色无法归一化（color-mix？）`).not.toBeNull()
        expect(sh, `${theme}/${s.t} sheen 无法归一化 raw=${JSON.stringify(s.sheen)}`).not.toBeNull()
        expect(sh![3], `${theme}/${s.t} sheen 必须有 alpha（为 0 则 hover 断言空转）`).toBeGreaterThan(0)
        const fgRgb: [number, number, number] = [fg![0], fg![1], fg![2]]
        const bgRgb: [number, number, number] = [bg![0], bg![1], bg![2]]
        const base = Math.abs(perceptualContrast(relativeLuminance(fgRgb), relativeLuminance(bgRgb)))
        expect(
          base,
          `${theme}/${s.t} 实心按钮静止/按压基线 ${base.toFixed(1)} 应 ≥60（按压不提亮）`,
        ).toBeGreaterThanOrEqual(60)
        const hoverBg = mixOver([sh![0], sh![1], sh![2]], bgRgb, sh![3])
        const hoverScore = Math.min(
          Math.abs(perceptualContrast(relativeLuminance(fgRgb), relativeLuminance(hoverBg))),
          base,
        )
        expect(
          hoverScore,
          `${theme}/${s.t} 实心按钮 hover 高光感知分 ${hoverScore.toFixed(1)} 应 ≥45（瞬态大字档）`,
        ).toBeGreaterThanOrEqual(45)
      }
    }
  })

  test('动态流动感守卫：reduced-motion 下不启用（零变量）', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(900)
    const box = await page.evaluate(() => {
      const btn = document.createElement('oas-button') as HTMLElement
      btn.setAttribute('type', 'primary')
      btn.textContent = 'fluid-rm-probe'
      btn.style.cssText = 'position:fixed;left:120px;top:120px;z-index:9999'
      document.body.appendChild(btn)
      const r = btn.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    })
    await page.waitForTimeout(200)
    await page.mouse.move(box.x + box.w * 0.7, box.y + box.h * 0.5)
    await page.waitForTimeout(300)
    const r = await page.evaluate(() => {
      const inner = [...document.querySelectorAll('oas-button')].pop()!.shadowRoot!.querySelector('button')!
      return { fluid: inner.hasAttribute('data-glass-fluid'), px: inner.style.getPropertyValue('--oas-glass-px') }
    })
    expect(r.fluid, 'reduced-motion 下不得亮高光').toBe(false)
    expect(r.px, 'reduced-motion 下不得写坐标').toBe('')
  })

  test('动态流动感守卫：无 data-glass 页面零变量', async ({ page }) => {
    await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(700)
    const box = await page.evaluate(() => {
      const btn = document.querySelector('oas-button') as HTMLElement
      btn.style.cssText += ';position:fixed;left:120px;top:120px;z-index:9999'
      const r = btn.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    })
    await page.mouse.move(box.x + box.w * 0.7, box.y + box.h * 0.5)
    await page.waitForTimeout(250)
    const r = await page.evaluate(() => {
      const inner = document.querySelector('oas-button')!.shadowRoot!.querySelector('button')!
      return { fluid: inner.hasAttribute('data-glass-fluid'), px: inner.style.getPropertyValue('--oas-glass-px') }
    })
    expect(r.fluid, '无 data-glass 不得亮高光').toBe(false)
    expect(r.px, '无 data-glass 不得写坐标').toBe('')
  })

  test('注册表 ↔ 真实 DOM 对账：每个注册组件的 surface 选择器都命中（防漂移静默失效）', async ({ page }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(600)
    const miss = await page.evaluate(async (registry: Array<{ tag: string; surface: string; host?: boolean }>) => {
      const out: string[] = []
      for (const e of registry) {
        const host = document.createElement(e.tag) as HTMLElement
        document.body.appendChild(host)
        await customElements.whenDefined(e.tag)
        await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res(null))))
        if (e.host) {
          if (host.localName !== e.tag) out.push(`${e.tag} host`)
        } else if (!host.shadowRoot?.querySelector(e.surface)) {
          out.push(`${e.tag} ${e.surface}`)
        }
        host.remove()
      }
      return out
    }, GLASS_REGISTRY)
    expect(miss, '注册表选择器必须与组件真实 shadow DOM 一致（漂移即静默失效）').toEqual([])
  })

  test('注入不得改变既有定位：fixed/absolute 宿主与 fixed 盒悬停后 position 不变（B 档实抓回归锁）', async ({
    page,
  }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    const r = await page.evaluate(async () => {
      const fixedBar = document.createElement('oas-app-bar')
      fixedBar.setAttribute('data-position', 'fixed')
      fixedBar.setAttribute('title', 'fixed-bar')
      fixedBar.style.cssText = 'position:fixed;left:40px;top:60px;width:260px;z-index:9998'
      document.body.appendChild(fixedBar)
      await customElements.whenDefined('oas-app-bar')
      // snackbar：`.box` 基础态是 fixed —— 构造可见盒体（组件打开通道不可用时的最小复刻：直接取真实盒体并置显示）
      const snack = document.createElement('oas-snackbar') as HTMLElement & { shadowRoot: ShadowRoot }
      document.body.appendChild(snack)
      await customElements.whenDefined('oas-snackbar')
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res(null))))
      const boxOf = () => snack.shadowRoot.querySelector('.box') as HTMLElement | null
      const beforeBar = getComputedStyle(fixedBar).position
      const box = boxOf()
      const beforeBox = box ? getComputedStyle(box).position : null
      // 命中（写标记）——用真实指针在 e2e 层完成，这里只返回定位基线
      fixedBar.setAttribute('data-glass-fluid', '')
      if (box) box.setAttribute('data-glass-fluid', '')
      const afterBar = getComputedStyle(fixedBar).position
      const afterBox = box ? getComputedStyle(box).position : null
      fixedBar.remove()
      snack.remove()
      return { beforeBar, afterBar, beforeBox, afterBox }
    })
    expect(r.beforeBar).toBe('fixed')
    expect(r.afterBar, 'fixed 宿主命中高光后不得掉回 relative').toBe('fixed')
    if (r.beforeBox !== null) {
      expect(r.beforeBox).toBe('fixed')
      expect(r.afterBox, 'fixed 盒体命中高光后不得掉回 relative').toBe('fixed')
    }
  })

  test('无 data-glass 时回落 none（opt-in 零影响）', async ({ page }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    // CI 冷启动时组件升级可能晚于固定等待；等 shadow 根就绪再取内部按钮
    await page.waitForFunction(() => document.querySelector('oas-button')?.shadowRoot != null, undefined, {
      timeout: 15000,
    })
    const filter = await page.evaluate(() => {
      document.documentElement.removeAttribute('data-glass')
      const inner = document.querySelector('oas-button')!.shadowRoot!.querySelector('button')!
      return getComputedStyle(inner).filter
    })
    expect(filter).toBe('none')
  })
})

// ---------------------------------------------------------------------------
// switch 轨道内文案 36 格真实对比度矩阵
//
// 固定 2 主题 × 2 checked × 3 真实身后底色（页面 / 灰卡 / bg-elevated）× 3 交互态
// （静止 / hover / press）= 36。每格使用真实 shadow DOM 文字色、真实轨道计算色、
// 真实容器计算底色与真实主题 sheen token；半透明轨道与半透明 backplate 一律逐层
// alpha 合成，不假定玻璃不透明。press 必须由真实指针按下产生 :active 后采样
// --oas-glass-sheen-press（不是改 class / 复用 hover）。
// ---------------------------------------------------------------------------

type SwitchTheme = 'light' | 'dark'
type SwitchChecked = 'checked' | 'unchecked'
type SwitchBackdrop = 'page' | 'gray' | 'elevated'
type SwitchInteraction = 'static' | 'hover' | 'press'

interface SwitchProbe {
  id: string
  theme: SwitchTheme
  checked: SwitchChecked
  backdrop: SwitchBackdrop
}

interface SwitchSample {
  name: string
  theme: SwitchTheme
  checked: SwitchChecked
  backdrop: SwitchBackdrop
  state: SwitchInteraction
  fg: string
  track: string
  backdropLayer: string
  baseBg: string
  litBg: string
  sheen: string
  sheenAlpha: number
  baseScore: number
  litScore: number
  score: number
  threshold: number
  marker: boolean
  active: boolean
  afterBg: string
}

/** 每个矩阵格必须可解析；null / 空值直接失败，禁止静默漏采。 */
function mustColor(raw: string, what: string): [number, number, number, number] {
  const parsed = parseSrgb((raw ?? '').trim())
  if (!parsed) throw new Error(`${what} 无法解析色值（禁止漏采）：${JSON.stringify(raw)}`)
  return parsed
}

function rgbCss(rgb: [number, number, number]): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}

/** 前景（可能带 alpha）压到底色后的实际呈现色与该底色的感知对比度。 */
function contrastOn(fg: [number, number, number, number], bg: [number, number, number]): number {
  const text = composite(fg, bg)
  return Math.abs(perceptualContrast(relativeLuminance(text), relativeLuminance(bg)))
}

/** 逐格真实取样 + 合成。所有失败（缺节点/缺文字/无法解析/状态不符）都抛错。 */
async function sampleSwitchCell(page: Page, probe: SwitchProbe, state: SwitchInteraction): Promise<SwitchSample> {
  const raw = await page.evaluate(
    ({ id }) => {
      const stage = document.getElementById('sw-glass-matrix')
      const host = document.getElementById(id) as HTMLElement | null
      const root = host?.shadowRoot
      const btn = root?.querySelector('button') as HTMLButtonElement | null
      const label = root?.querySelector<HTMLElement>('.label')
      const card = host?.parentElement
      if (!stage || !host || !btn || !label || !card) {
        return { missing: `stage/host/button/label/card 不完整（${id}）` }
      }
      const lr = label.getBoundingClientRect()
      const after = getComputedStyle(btn, '::after')
      return {
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
        stageBg: getComputedStyle(stage).backgroundColor,
        cardBg: getComputedStyle(card).backgroundColor,
        track: getComputedStyle(btn).backgroundColor,
        fg: getComputedStyle(label).color,
        sheen: getComputedStyle(host).getPropertyValue('--oas-glass-sheen').trim(),
        sheenPress: getComputedStyle(host).getPropertyValue('--oas-glass-sheen-press').trim(),
        labelHidden: label.hidden,
        labelText: label.textContent ?? '',
        labelWidth: lr.width,
        labelHeight: lr.height,
        hostChecked: host.hasAttribute('checked'),
        ariaChecked: btn.getAttribute('aria-checked'),
        marker: btn.hasAttribute('data-glass-fluid'),
        active: btn.matches(':active'),
        afterBg: after.backgroundImage,
        afterContent: after.content,
      }
    },
    { id: probe.id },
  )

  if ('missing' in raw) throw new Error(`[${probe.id}] ${raw.missing}`)

  const name = `${probe.theme}/${probe.checked}/${probe.backdrop}/${state}`
  if (raw.theme !== probe.theme) throw new Error(`[${name}] 主题不符：实际 ${raw.theme}`)
  if (raw.labelHidden || raw.labelText === '') throw new Error(`[${name}] 轨道内文案缺失（不得用无文字样本凑数）`)
  if (raw.labelText !== (probe.checked === 'checked' ? '开' : '关')) {
    throw new Error(`[${name}] 轨道内文案不符：${JSON.stringify(raw.labelText)}`)
  }
  if (raw.labelWidth <= 0 || raw.labelHeight <= 0) throw new Error(`[${name}] 轨道内文案无可见盒`)
  if (raw.hostChecked !== (probe.checked === 'checked')) throw new Error(`[${name}] checked 状态被取样过程改变`)
  if (raw.ariaChecked !== String(probe.checked === 'checked')) throw new Error(`[${name}] aria-checked 不同步`)

  if (state === 'static' && raw.marker) throw new Error(`[${name}] 静止态不得带运行时高光标记`)
  if (state === 'hover' && (!raw.marker || raw.active)) {
    throw new Error(`[${name}] hover 必须由真实指针命中（marker=${raw.marker} active=${raw.active}）`)
  }
  if (state === 'press' && (!raw.marker || !raw.active)) {
    throw new Error(`[${name}] press 必须由真实指针按下产生 :active（marker=${raw.marker} active=${raw.active}）`)
  }
  if (state !== 'static' && (!raw.afterContent || raw.afterContent === 'none')) {
    throw new Error(`[${name}] 高光伪元素未生成（content=${JSON.stringify(raw.afterContent)}）`)
  }
  if (state !== 'static' && !raw.afterBg.includes('radial-gradient')) {
    throw new Error(`[${name}] 高光层缺少 radial-gradient：${JSON.stringify(raw.afterBg)}`)
  }

  const pageBg = mustColor(raw.stageBg, `${name} 页面底`)
  if (pageBg[3] !== 1) throw new Error(`[${name}] 页面底必须不透明，实际 ${JSON.stringify(raw.stageBg)}`)
  const pageRgb: [number, number, number] = [pageBg[0], pageBg[1], pageBg[2]]

  let backdropLayer = pageRgb
  if (probe.backdrop !== 'page') {
    const card = mustColor(raw.cardBg, `${name} ${probe.backdrop} 卡片底`)
    if (card[3] <= 0) throw new Error(`[${name}] ${probe.backdrop} 卡片底不可见`)
    backdropLayer = composite(card, pageRgb)
  }

  const track = mustColor(raw.track, `${name} 轨道底`)
  const baseBg = composite(track, backdropLayer)

  const fg = mustColor(raw.fg, `${name} 前景色`)
  const baseScore = contrastOn(fg, baseBg)
  let litBg = baseBg
  let litScore = baseScore
  let sheenAlpha = 0

  if (state !== 'static') {
    const sheen = mustColor(state === 'hover' ? raw.sheen : raw.sheenPress, `${name} sheen 色`)
    if (sheen[3] <= 0) throw new Error(`[${name}] ${state} sheen alpha 必须 >0（为 0 则门禁空转）`)
    sheenAlpha = sheen[3]
    litBg = composite(sheen, baseBg)
    litScore = contrastOn(fg, litBg)
  }

  return {
    name,
    theme: probe.theme,
    checked: probe.checked,
    backdrop: probe.backdrop,
    state,
    fg: raw.fg,
    track: raw.track,
    backdropLayer: rgbCss(backdropLayer),
    baseBg: rgbCss(baseBg),
    litBg: rgbCss(litBg),
    sheen: state === 'static' ? 'n/a' : state === 'hover' ? raw.sheen : raw.sheenPress,
    sheenAlpha,
    baseScore,
    litScore,
    // hover/press 取「高光叠底」与「无高光基线」的较差者（与既有玻璃门禁同口径）
    score: state === 'static' ? baseScore : Math.min(baseScore, litScore),
    threshold: state === 'press' ? 45 : 60,
    marker: raw.marker,
    active: raw.active,
    afterBg: raw.afterBg,
  }
}

test.describe('switch 玻璃轨道内文案 36 格真实对比度矩阵', () => {
  test('2 主题 × 2 checked × 3 真实底色 × 3 交互态全部达标（样本必须恰好 36）', async ({ page }, testInfo) => {
    const badWarns: string[] = []
    const allow = [
      /net::ERR_/,
      /Failed to load resource/,
      /vite/,
      /hydrating/,
      /cookie .*overwritten/i,
      /scroll-linked positioning effect/i,
      /Google Analytics|gtag/i,
    ]
    page.on('console', (m) => {
      if ((m.type() === 'error' || m.type() === 'warning') && !allow.some((re) => re.test(m.text()))) {
        badWarns.push(`${m.type()}: ${m.text()}`)
      }
    })
    page.on('pageerror', (err) => badWarns.push(`pageerror: ${err.message}`))

    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-glass'), undefined, {
      timeout: 15000,
    })
    await page.evaluate(() => document.documentElement.setAttribute('data-glass', ''))

    const rows: SwitchSample[] = []
    const themes: SwitchTheme[] = ['light', 'dark']
    const checkedStates: SwitchChecked[] = ['unchecked', 'checked']
    const backdrops: SwitchBackdrop[] = ['page', 'gray', 'elevated']

    for (const theme of themes) {
      await page.evaluate((next) => {
        document.documentElement.classList.toggle('dark', next === 'dark')
        document.documentElement.removeAttribute('data-theme')
      }, theme)
      await page.waitForTimeout(250)

      const probes = await page.evaluate(
        ({ theme: currentTheme, checkedStates: checks, backdrops: kinds }) => {
          document.getElementById('sw-glass-matrix')?.remove()
          const stage = document.createElement('div')
          stage.id = 'sw-glass-matrix'
          stage.style.cssText = [
            'position:fixed',
            'inset:0',
            'z-index:2147483640',
            'display:grid',
            'grid-template-columns:repeat(3,1fr)',
            'grid-auto-rows:1fr',
            'gap:24px',
            'padding:48px',
            'box-sizing:border-box',
            'background:var(--vp-c-bg)',
          ].join(';')
          document.body.appendChild(stage)
          const out: Array<{ id: string; theme: string; checked: string; backdrop: string }> = []
          for (const checked of checks) {
            for (const backdrop of kinds) {
              const card = document.createElement('div')
              card.dataset.backdrop = backdrop
              card.style.cssText = [
                'display:flex',
                'align-items:center',
                'justify-content:center',
                'min-height:120px',
                'border-radius:12px',
                'padding:24px',
                'box-sizing:border-box',
                `background:${
                  backdrop === 'page'
                    ? 'transparent'
                    : backdrop === 'gray'
                      ? 'var(--oas-color-bg-hover)'
                      : 'var(--oas-color-bg-elevated)'
                }`,
              ].join(';')
              const sw = document.createElement('oas-switch')
              const id = `sw-glass-${checked}-${backdrop}`
              sw.id = id
              if (checked === 'checked') sw.setAttribute('checked', '')
              sw.setAttribute('checked-text', '开')
              sw.setAttribute('unchecked-text', '关')
              card.appendChild(sw)
              stage.appendChild(card)
              out.push({ id, theme: currentTheme, checked, backdrop })
            }
          }
          return out
        },
        { theme, checkedStates, backdrops },
      )

      const ids = probes.map((p) => p.id)
      await page.waitForFunction(
        (list: string[]) =>
          list.every((id) => document.getElementById(id)?.shadowRoot?.querySelector('button[part="switch"]')),
        ids,
        { timeout: 15000 },
      )
      await page.evaluate(
        () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
      )

      // 静止：指针移出所有 surface，等高光淡出与颜色过渡结束
      await page.mouse.move(1, 1)
      await page.waitForTimeout(250)
      for (const id of ids) {
        const p = probes.find((x) => x.id === id)!
        rows.push(await sampleSwitchCell(page, p as SwitchProbe, 'static'))
      }
      await page.locator('#sw-glass-matrix').screenshot({
        path: testInfo.outputPath(`switch-glass-${theme}-static.png`),
      })
      for (const id of ['sw-glass-unchecked-page', 'sw-glass-checked-page']) {
        await page
          .locator(`#${id}`)
          .locator('..')
          .screenshot({ path: testInfo.outputPath(`switch-glass-${theme}-${id}-static.png`) })
      }

      // hover：真实指针移到轨道内文案中央（高光最坏位置）
      let hoverShot = false
      for (const id of ids) {
        const p = probes.find((x) => x.id === id)!
        const point = await page.evaluate((probeId) => {
          const label = document.getElementById(probeId)!.shadowRoot!.querySelector<HTMLElement>('.label')!
          const r = label.getBoundingClientRect()
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
        }, id)
        await page.mouse.move(point.x, point.y)
        await page.waitForFunction(
          (probeId) => {
            const btn = document.getElementById(probeId)?.shadowRoot?.querySelector('button')
            return !!btn?.hasAttribute('data-glass-fluid')
          },
          id,
          { timeout: 5000 },
        )
        await page.waitForTimeout(180)
        rows.push(await sampleSwitchCell(page, p as SwitchProbe, 'hover'))
        if (!hoverShot) {
          hoverShot = true
          await page.locator('#sw-glass-matrix').screenshot({
            path: testInfo.outputPath(`switch-glass-${theme}-hover.png`),
          })
        }
        if (id === 'sw-glass-checked-page') {
          await page
            .locator(`#${id}`)
            .locator('..')
            .screenshot({ path: testInfo.outputPath(`switch-glass-${theme}-hover-checked-card.png`) })
        }
      }

      // press：真实按下 → 等 :active → 采样 press token；移开后抬起，避免切换状态
      let pressShot = false
      for (const id of ids) {
        const p = probes.find((x) => x.id === id)!
        const point = await page.evaluate((probeId) => {
          const label = document.getElementById(probeId)!.shadowRoot!.querySelector<HTMLElement>('.label')!
          const r = label.getBoundingClientRect()
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
        }, id)
        await page.mouse.move(point.x, point.y)
        await page.waitForFunction(
          (probeId) => {
            const btn = document.getElementById(probeId)?.shadowRoot?.querySelector('button')
            return !!btn?.hasAttribute('data-glass-fluid')
          },
          id,
          { timeout: 5000 },
        )
        await page.mouse.down()
        await page.waitForFunction(
          (probeId) => {
            const btn = document.getElementById(probeId)?.shadowRoot?.querySelector('button')
            return !!btn?.hasAttribute('data-glass-fluid') && btn.matches(':active')
          },
          id,
          { timeout: 5000 },
        )
        await page.waitForTimeout(180)
        rows.push(await sampleSwitchCell(page, p as SwitchProbe, 'press'))
        if (!pressShot) {
          pressShot = true
          await page.locator('#sw-glass-matrix').screenshot({
            path: testInfo.outputPath(`switch-glass-${theme}-press.png`),
          })
        }
        if (id === 'sw-glass-checked-page') {
          await page
            .locator(`#${id}`)
            .locator('..')
            .screenshot({ path: testInfo.outputPath(`switch-glass-${theme}-press-checked-card.png`) })
        }
        await page.mouse.move(1, 1)
        await page.mouse.up()
        await page.waitForTimeout(60)
      }

      await page.evaluate(() => document.getElementById('sw-glass-matrix')?.remove())
      await page.mouse.move(1, 1)
    }

    // 先输出完整矩阵（BASE 失败时也能拿到逐格证据），再断言
    console.log(`[SWITCH_GLASS_MATRIX]${JSON.stringify(rows)}`)
    await testInfo.attach('switch-glass-matrix.json', {
      body: JSON.stringify(rows, null, 2),
      contentType: 'application/json',
    })

    expect(rows, '36 格必须全部采样（禁止 filter 后少样本仍绿）').toHaveLength(36)
    expect(new Set(rows.map((r) => r.name)).size, '每格名称必须唯一').toBe(36)
    const count = (key: keyof SwitchSample): Record<string, number> =>
      rows.reduce<Record<string, number>>((acc, row) => {
        const value = String(row[key])
        acc[value] = (acc[value] ?? 0) + 1
        return acc
      }, {})
    expect(count('theme'), '主题维度必须 2 × 18').toEqual({ light: 18, dark: 18 })
    expect(count('checked'), 'checked 维度必须 2 × 18').toEqual({ unchecked: 18, checked: 18 })
    expect(count('backdrop'), '真实底色维度必须 3 × 12').toEqual({ page: 12, gray: 12, elevated: 12 })
    expect(count('state'), '交互态维度必须 3 × 12').toEqual({ static: 12, hover: 12, press: 12 })

    for (const theme of themes) {
      const staticBgs = new Set(
        rows.filter((r) => r.theme === theme && r.checked === 'unchecked' && r.state === 'static').map((r) => r.baseBg),
      )
      expect(staticBgs.size, `${theme} 三种真实底色不得全部采样成同一色`).toBeGreaterThanOrEqual(2)
    }

    for (const row of rows) {
      expect.soft(Number.isFinite(row.score), `${row.name} 分数必须可计算`).toBe(true)
      expect
        .soft(
          row.score,
          `${row.name} 分数 ${row.score.toFixed(1)} 应 ≥${row.threshold}（fg ${row.fg} on ${row.litBg}，底色 ${row.backdropLayer}）`,
        )
        .toBeGreaterThanOrEqual(row.threshold)
    }

    // press 必须是更强 sheen，且与 hover 的真实伪元素底色不同（不是复用 hover 样本）
    for (const theme of themes) {
      for (const checked of checkedStates) {
        for (const backdrop of backdrops) {
          const hover = rows.find(
            (r) => r.theme === theme && r.checked === checked && r.backdrop === backdrop && r.state === 'hover',
          )!
          const press = rows.find(
            (r) => r.theme === theme && r.checked === checked && r.backdrop === backdrop && r.state === 'press',
          )!
          expect
            .soft(press.sheenAlpha, `${theme}/${checked}/${backdrop} press sheen 应强于 hover`)
            .toBeGreaterThan(hover.sheenAlpha)
          expect
            .soft(press.afterBg, `${theme}/${checked}/${backdrop} press 不得复用 hover 伪元素`)
            .not.toBe(hover.afterBg)
        }
      }
    }

    expect(badWarns, `console 应零告警：${badWarns.join(' | ')}`).toEqual([])
  })
})
