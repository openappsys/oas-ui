// 液态玻璃 L2：材质机制 + 感知对比度实测门禁（PRD 承诺：代表性背景 <60 零容忍）。
// 方法：已知纯底背板上的半透明 surface 做 alpha 合成求有效底色，对 surface 文字色跑
// 感知对比度（与 a11y.spec 同源 oklab 评分）——亮蓝/品红/深青三类代表背板 × 明暗双主题。

import { test, expect } from '@playwright/test'
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
  const hex = s.match(/^#([0-9a-f]{6})$/i)
  if (hex) {
    const n = parseInt(hex[1]!, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]
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

test.describe('液态玻璃材质层', () => {
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

test.describe('玻璃边缘折射 v1（data-URI 自包含滤镜）', () => {
  // 实现约束：shadow DOM 内 CSS 的 url(#id) 片段引用无法跨 shadow 边界解析（实测静默忽略），
  // 滤镜必须以 data-URI 内联——本组断言锁死该机制（退回 #id 引用即红）。

  for (const theme of ['light', 'dark']) {
    test(`shadow 组件消费 data-URI 滤镜（${theme}，button/switch/slider 把手）`, async ({ page, browserName }) => {
      await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
      if (theme === 'dark') await page.evaluate(() => document.documentElement.classList.add('dark'))
      await page.waitForTimeout(800)
      const r = await page.evaluate(() => {
        const probe = (host: Element | null, sel: string) => {
          const el = (host as HTMLElement | null)?.shadowRoot?.querySelector(sel)
          return el ? getComputedStyle(el).filter : null
        }
        return {
          button: probe(document.querySelector('oas-button'), 'button'),
          switch: probe(document.querySelector('oas-switch'), 'button'),
        }
      })
      for (const [name, filter] of Object.entries(r)) {
        expect(filter, `${theme}/${name} 应消费折射滤镜`).toContain('data:image/svg+xml')
        expect(filter, `${theme}/${name} 应为位移滤镜`).toContain('feDisplacementMap')
      }
    })
  }

  test('禁用态守卫：hover/选中不得把组合滤镜反超回禁用按钮（特异性反超实抓回归锁）', async ({ page }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    await page.evaluate(() => {
      const stage = document.querySelector('.gg-stage')!
      const mk = (attrs: Record<string, string>, text: string) => {
        const b = document.createElement('oas-button')
        for (const [k, v] of Object.entries(attrs)) b.setAttribute(k, v)
        b.textContent = text
        stage.appendChild(b)
        return b
      }
      mk({ type: 'success', disabled: '' }, 'guard-probe-disabled')
      mk({ type: 'success', 'disabled-focusable': '', 'aria-pressed': 'true' }, 'guard-probe-pressed')
    })
    await page.waitForTimeout(400)
    // hover 禁用 success 按钮（原生 disabled 仍匹配 :hover；success:hover 组合滤镜特异性更高）
    const probe = page.locator('oas-button', { hasText: 'guard-probe-disabled' }).first()
    await probe.hover()
    await page.waitForTimeout(300)
    const r = await page.evaluate(() => {
      const read = (text: string) => {
        const el = [...document.querySelectorAll('oas-button')].find((b) => b.textContent === text)!
        return getComputedStyle(el.shadowRoot!.querySelector('button, a[part="button"]')!).filter
      }
      return { disabledHover: read('guard-probe-disabled'), pressedDisabledFocusable: read('guard-probe-pressed') }
    })
    expect(r.disabledHover, '禁用按钮 hover 不得恢复 brightness/折射（守卫规则钉死 none）').toBe('none')
    expect(r.pressedDisabledFocusable, '选中 × disabled-focusable 不得恢复组合滤镜').toBe('none')
  })

  test('switch 禁用态关折射（禁用控件静态无装饰变形——跨组件统一纪律）', async ({ page }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    const r = await page.evaluate(() => {
      const sw = document.createElement('oas-switch')
      sw.setAttribute('disabled', '')
      document.querySelector('.gg-stage')!.appendChild(sw)
      const inner = sw.shadowRoot!.querySelector('button')!
      const filter = getComputedStyle(inner).filter
      sw.remove()
      return filter
    })
    expect(r, 'switch 禁用态应关折射（含 busy，busy 同样 btn.disabled=true）').toBe('none')
  })

  test('slider 把手折射真实执行（chromium 像素级；UA 伪元素无 computed 通道）', async ({ page, browserName }) => {
    test.skip(browserName === 'firefox', 'Firefox 不执行 data-URI SVG 滤镜位移（降级契约由像素断言锁）')
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    // 把手裁剪区：按 value 比例定位 thumb 中心（::-webkit-slider-thumb 是 UA 伪元素，getComputedStyle 探不到）。
    // 依赖：画廊首个 oas-slider 为水平滑块（若画廊重排出垂直滑块在前，clip 错位 → 假红，失败模式安全）
    const clip = await page.evaluate(() => {
      const input = document.querySelector('oas-slider')?.shadowRoot?.querySelector('input')
      if (!input) return null
      const r = input.getBoundingClientRect()
      const ratio =
        (Number(input.value || 0) - Number(input.min || 0)) / (Number(input.max || 100) - Number(input.min || 0))
      const cx = r.x + ratio * r.width
      return { x: cx - 18, y: r.y - 8, width: 36, height: r.height + 16 }
    })
    expect(clip, '画廊应有 oas-slider').not.toBeNull()
    const on = await page.screenshot({ clip: clip! })
    await page.evaluate(() => document.documentElement.style.setProperty('--oas-glass-refraction', 'none'))
    await page.waitForTimeout(300)
    const off = await page.screenshot({ clip: clip! })
    const diff = await diffRatio(page, on, off)
    expect(diff, 'slider 把手折射应真实执行（开/关渲染不同）').toBeGreaterThan(0.001)
  })

  test('filter × backdrop-filter 共存：折射生效时玻璃模糊不丢（message 盒）', async ({ page, browserName }) => {
    test.skip(browserName === 'firefox', 'Firefox 不执行 data-URI SVG 滤镜位移（降级契约由像素断言锁）')
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    const r = await page.evaluate(async () => {
      const btns = [...document.querySelectorAll('oas-button')]
      const trigger = btns.find((b) => /消息|message/i.test(b.textContent || ''))
      ;(trigger?.shadowRoot?.querySelector('button') as HTMLButtonElement | undefined)?.click()
      await new Promise((res) => setTimeout(res, 700))
      const box = document.querySelector('oas-message')?.shadowRoot?.querySelector('.box')
      if (!box) return null
      const cs = getComputedStyle(box)
      return {
        filter: cs.filter,
        backdrop: cs.backdropFilter || (cs as unknown as { webkitBackdropFilter: string }).webkitBackdropFilter,
      }
    })
    expect(r, '画廊消息 demo 应弹出').not.toBeNull()
    expect(r!.filter, '折射应生效').toContain('data:image/svg+xml')
    expect(r!.backdrop, '折射生效时 backdrop 模糊不丢').toContain('blur(')
  })

  test('文档化降级路径：容器覆盖空值 → 基础态 none 且 button hover 亮度反馈不失效（none 混排非法实抓回归锁）', async ({
    page,
  }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    // 文档口径：折射停用值留空（--oas-glass-refraction: ;）——none 与 brightness() 混排会使整条声明非法
    await page.addStyleTag({ content: '.gg-stage { --oas-glass-refraction: ; }' })
    const host = await page.evaluateHandle(() => {
      const stage = document.querySelector('.gg-stage')!
      const b = document.createElement('oas-button')
      b.setAttribute('type', 'success')
      b.textContent = 'optout-probe'
      stage.appendChild(b)
      return b
    })
    await page.waitForTimeout(400)
    const base = await page.evaluate(() => {
      const el = [...document.querySelectorAll('oas-button')].find((b) => b.textContent === 'optout-probe')!
      return getComputedStyle(el.shadowRoot!.querySelector('button')!).filter
    })
    expect(base, '空值停用后基础态应回落 none').toBe('none')
    const probe = page.locator('oas-button', { hasText: 'optout-probe' }).first()
    await probe.hover()
    await page.waitForTimeout(300)
    const hover = await page.evaluate(() => {
      const el = [...document.querySelectorAll('oas-button')].find((b) => b.textContent === 'optout-probe')!
      return getComputedStyle(el.shadowRoot!.querySelector('button')!).filter
    })
    expect(hover, '空值停用后 hover 亮度反馈必须仍在（brightness 不被折射变量拖非法）').toBe('brightness(0.94)')
    await host.dispose()
  })

  /** 两张 PNG 截图的像素差异率（浏览器内 canvas 解码比对；阈值 8/255 抗栅格噪声） */
  async function diffRatio(page: import('@playwright/test').Page, a: Buffer, b: Buffer): Promise<number> {
    return page.evaluate(
      async ([aB64, bB64]) => {
        const load = (b64: string) =>
          new Promise<HTMLImageElement>((res, rej) => {
            const img = new Image()
            img.onload = () => res(img)
            img.onerror = rej
            img.src = 'data:image/png;base64,' + b64
          })
        const [ia, ib] = await Promise.all([load(aB64 as string), load(bB64 as string)])
        const c = document.createElement('canvas')
        c.width = ia.width
        c.height = ia.height
        const ctx = c.getContext('2d')!
        ctx.drawImage(ia, 0, 0)
        const da = ctx.getImageData(0, 0, c.width, c.height).data
        ctx.clearRect(0, 0, c.width, c.height)
        ctx.drawImage(ib, 0, 0)
        const db = ctx.getImageData(0, 0, c.width, c.height).data
        let diff = 0
        for (let i = 0; i < da.length; i += 4) {
          if (
            Math.abs(da[i]! - db[i]!) > 8 ||
            Math.abs(da[i + 1]! - db[i + 1]!) > 8 ||
            Math.abs(da[i + 2]! - db[i + 2]!) > 8
          )
            diff++
        }
        return diff / (da.length / 4)
      },
      [a.toString('base64'), b.toString('base64')],
    )
  }

  test('滤镜真实执行：边缘变形而中间恒不变形（硬约束），且布局盒不变（零副作用）', async ({ page, browserName }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    const btn = page.locator('oas-button').first()
    // 中心裁剪区（中部 50%×50%：远离边缘环带，折射硬约束要求此处像素零变化）
    const box = (await btn.boundingBox())!
    const centerClip = {
      x: box.x + box.width * 0.25,
      y: box.y + box.height * 0.25,
      width: box.width * 0.5,
      height: box.height * 0.5,
    }
    const fullOn = await btn.screenshot()
    const centerOn = await page.screenshot({ clip: centerClip })
    const r = await page.evaluate(() => {
      const host = document.querySelector('oas-button')!
      const inner = host.shadowRoot!.querySelector('button')!
      const withFilter = inner.getBoundingClientRect()
      document.documentElement.style.setProperty('--oas-glass-refraction', 'none')
      const without = inner.getBoundingClientRect()
      return {
        with: { w: Math.round(withFilter.width), h: Math.round(withFilter.height) },
        without: { w: Math.round(without.width), h: Math.round(without.height) },
      }
    })
    await page.waitForTimeout(300)
    const fullOff = await btn.screenshot()
    const centerOff = await page.screenshot({ clip: centerClip })
    const fullDiff = await diffRatio(page, fullOn, fullOff)
    const centerDiff = await diffRatio(page, centerOn, centerOff)
    if (browserName === 'firefox') {
      // Firefox 对 CSS filter 的 data-URI SVG 滤镜不执行位移（实测开/关仅 ±1 LSB 栅格噪声）——
      // v1 如实降级为「无折射但渲染正常」。此处锁死安全降级契约：视觉无差异 ≠ 假绿，
      // 而是引擎能力的如实边界（若哪天 Firefox 支持了，本断言变红提醒改回执行断言）
      expect(fullDiff, 'Firefox 安全降级：折射无感不破坏渲染').toBeLessThan(0.01)
    } else {
      // ①执行证明：整体开/关必不同（滤镜失效/未执行 → 恒等 → 红）
      expect(fullDiff, '折射滤镜应真实执行（开/关渲染不同）').toBeGreaterThan(0.001)
    }
    // ②硬约束：中心区像素开/关一致（位移侵入中心 → 红；滤镜链 discrete 阈值归一保证中性）
    expect(centerDiff, '中间恒不变形（硬约束）：中心区像素开/关应一致').toBeLessThan(0.001)
    // ③布局零副作用：位移仅视觉层
    expect(r.with, '折射不得改变布局盒').toEqual(r.without)
  })

  test('法向位移方向性：外包络双轴对称膨胀（梯度图通道错乱盲区回归锁）', async ({ page, browserName }) => {
    test.skip(browserName === 'firefox', 'Firefox 不执行 data-URI SVG 滤镜位移（降级契约由像素断言锁）')
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    // 白底探针区 + primary 按钮：R/G 任一通道写反或 X/Y 互换 → 单轴不膨胀 → 红
    const clip = await page.evaluate(() => {
      const host = document.createElement('div')
      host.style.cssText = 'position:fixed;left:40px;top:40px;width:320px;height:180px;background:#fff;z-index:9999'
      const b = document.createElement('oas-button')
      b.setAttribute('type', 'primary')
      b.textContent = 'dir-probe'
      b.style.cssText = 'position:absolute;left:90px;top:70px'
      host.appendChild(b)
      document.body.appendChild(host)
      return { x: 40, y: 40, width: 320, height: 180 }
    })
    await page.waitForTimeout(500)
    /** 蓝像素外包络（B 高 R 低区分白底） */
    const bboxBlue = async () => {
      const shot = await page.screenshot({ clip })
      return page.evaluate(async (b64) => {
        const img = new Image()
        await new Promise((res) => {
          img.onload = res
          img.src = 'data:image/png;base64,' + (b64 as string)
        })
        const c = document.createElement('canvas')
        c.width = img.width
        c.height = img.height
        const ctx = c.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        const d = ctx.getImageData(0, 0, c.width, c.height).data
        let minY = 1e9
        let maxY = -1
        let minX = 1e9
        let maxX = -1
        for (let y = 0; y < c.height; y++)
          for (let x = 0; x < c.width; x++) {
            const i = (y * c.width + x) * 4
            if (d[i + 2]! > 180 && d[i]! < 120 && d[i + 1]! < 150) {
              if (y < minY) minY = y
              if (y > maxY) maxY = y
              if (x < minX) minX = x
              if (x > maxX) maxX = x
            }
          }
        return maxX < 0 ? null : { w: maxX - minX + 1, h: maxY - minY + 1 }
      }, shot.toString('base64'))
    }
    const on = await bboxBlue()
    await page.evaluate(() => document.documentElement.style.setProperty('--oas-glass-refraction', 'none'))
    await page.waitForTimeout(300)
    const off = await bboxBlue()
    expect(on, '探针按钮应可量测').not.toBeNull()
    expect(off, '探针按钮应可量测').not.toBeNull()
    const dw = on!.w - off!.w
    const dh = on!.h - off!.h
    expect(dw, '宽度方向应膨胀（R 通道位移生效）').toBeGreaterThan(2)
    expect(dh, '高度方向应膨胀（G 通道位移生效）').toBeGreaterThan(2)
    expect(Math.abs(dw - dh), '双轴应对称膨胀（通道互换/隔离写反 → 单轴不变 → 红）').toBeLessThanOrEqual(2)
    expect(dw, '膨胀幅度上限（scale=10 峰值 ±4px/侧 → 外包络约 +8px + 抗锯齿余量）').toBeLessThanOrEqual(12)
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
          const parse = (s: string): [number, number, number, number] | null => {
            const hex = s.match(/^#([0-9a-f]{6})$/i)
            if (hex) {
              const n = parseInt(hex[1]!, 16)
              return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]
            }
            const cs = s.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/)
            if (cs)
              return [Number(cs[1]) * 255, Number(cs[2]) * 255, Number(cs[3]) * 255, cs[4] != null ? Number(cs[4]) : 1]
            const m = s.match(/rgba?\(([^)]+)\)/)
            if (!m) return null
            const p = m[1]!
              .split(/[,\s/]+/)
              .filter(Boolean)
              .map(Number)
            return [p[0]!, p[1]!, p[2]!, p.length > 3 ? p[3]! : 1]
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
              if (!rgb || !bg || !sheen || !sheenPress) throw new Error(`无法归一化 ${tag} 的计算色值（禁止静默漏采）`)
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
        expect(sh, `${theme}/${s.t} sheen 无法归一化`).not.toBeNull()
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

  test('app-bar 溢出弹层打开期间关折射（组件内中性功能规则；弹层不被滤镜区域裁切）', async ({ page }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    // 真实交互：压窄栏体触发 overflow 收纳 → 出现「···」→ 点击打开弹层
    const r = await page.evaluate(async () => {
      const bar = document.createElement('oas-app-bar') as HTMLElement & { shadowRoot: ShadowRoot; remove(): void }
      for (let i = 0; i < 6; i++) {
        const a = document.createElement('oas-button')
        a.setAttribute('slot', 'actions')
        a.textContent = 'A' + i
        bar.appendChild(a)
      }
      bar.style.cssText = 'display:block;width:280px;position:fixed;left:40px;top:80px;z-index:9999'
      document.body.appendChild(bar)
      await customElements.whenDefined('oas-app-bar')
      await new Promise((res) => setTimeout(res, 300))
      const more = bar.shadowRoot.querySelector('[part="more"]') as HTMLButtonElement | null
      if (!more || more.hidden) return { noOverflow: true } as const
      const read = () => ({ filter: getComputedStyle(bar).filter, open: bar.hasAttribute('data-panel-open') })
      const closed = read()
      more.click()
      await new Promise((res) => setTimeout(res, 120))
      const opened = read()
      // 真实键盘路径：openMore 已把焦点移入面板首项；Esc 在 shadow 内派发（host 上派发不会进入自己的 shadow）
      const panel = bar.shadowRoot.querySelector('[part="more-panel"]') as HTMLElement
      const focused = (bar.shadowRoot.activeElement as HTMLElement | null) ?? panel
      focused.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
      await new Promise((res) => setTimeout(res, 120))
      const restored = read()
      bar.remove()
      return { closed, opened, restored }
    })
    expect(r, '应触发溢出收纳以出现「···」').not.toHaveProperty('noOverflow')
    const rr = r as {
      closed: { filter: string; open: boolean }
      opened: { filter: string; open: boolean }
      restored: { filter: string; open: boolean }
    }
    expect(rr.closed.filter, '常态应消费折射滤镜').toContain('data:image/svg+xml')
    expect(rr.opened.open, '弹层打开时应挂中性标记 data-panel-open').toBe(true)
    expect(rr.opened.filter, '弹层打开期间应关滤波（防裁切）').toBe('none')
    expect(rr.restored.filter, '弹层关闭后应恢复折射').toContain('data:image/svg+xml')
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
    await page.waitForTimeout(500)
    const filter = await page.evaluate(() => {
      document.documentElement.removeAttribute('data-glass')
      const inner = document.querySelector('oas-button')!.shadowRoot!.querySelector('button')!
      return getComputedStyle(inner).filter
    })
    expect(filter).toBe('none')
  })
})
