// 液态玻璃 L2：材质机制 + 感知对比度实测门禁（PRD 承诺：代表性背景 <60 零容忍）。
// 方法：已知纯底背板上的半透明 surface 做 alpha 合成求有效底色，对 surface 文字色跑
// 感知对比度（与 a11y.spec 同源 oklab 评分）——亮蓝/品红/深青三类代表背板 × 明暗双主题。

import { test, expect } from '@playwright/test'
import { perceptualContrast, relativeLuminance } from '../../theme/oklab'

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

  test('app-bar 溢出弹层打开期间关折射（弹层不被滤镜区域裁切——review 实抓回归锁）', async ({ page }) => {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    const r = await page.evaluate(async () => {
      const bar = document.createElement('oas-app-bar')
      document.body.appendChild(bar)
      await customElements.whenDefined('oas-app-bar')
      const read = () => getComputedStyle(bar).filter
      const before = read()
      bar.setAttribute('data-more-open', '')
      const opened = read()
      bar.removeAttribute('data-more-open')
      const after = read()
      bar.remove()
      return { before, opened, after }
    })
    expect(r.before, '常态应消费折射滤镜').toContain('data:image/svg+xml')
    expect(r.opened, '弹层打开期间应关折射（filter 非 none 会把弹层裁进滤镜区域）').toBe('none')
    expect(r.after, '弹层关闭后应恢复折射').toContain('data:image/svg+xml')
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
