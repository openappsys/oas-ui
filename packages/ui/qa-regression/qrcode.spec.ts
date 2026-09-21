// 复核回归：qrcode——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('qrcode：role=img 与 aria-label 落在图形元素上，expired 刷新按钮仍可点并派发 oas-refresh', async ({ page }) => {
  // 曾现风险：图形语义挂在外层容器 → 与容器内刷新按钮构成交互嵌套（axe: nested-interactive）；
  // 修法是把 role=img 挪到 <svg> 自身，本断言同时固化解耦与刷新行为不回归
  await page.goto('/components/qrcode.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#qrcode-status')
  const r = await page.evaluate(async () => {
    const host = document.querySelector('#qrcode-status') as HTMLElement & { shadowRoot: ShadowRoot }
    const wrapper = host.shadowRoot.querySelector('[part="wrapper"]') as HTMLElement
    const svg = host.shadowRoot.querySelector('svg') as SVGSVGElement
    const refresh = host.shadowRoot.querySelector('[part="refresh"]') as HTMLButtonElement
    let fired = 0
    host.addEventListener('oas-refresh', () => fired++)
    const label = svg.getAttribute('aria-label')
    // 点前读可见性：demo 的 refresh 处理会把状态切走
    const refreshHidden = refresh.hidden
    refresh.click()
    await new Promise((res) => setTimeout(res, 0))
    return {
      wrapperRole: wrapper.getAttribute('role'),
      svgRole: svg.getAttribute('role'),
      label,
      refreshHidden,
      fired,
    }
  })
  expect(r.wrapperRole, '容器保持普通容器语义').toBe(null)
  expect(r.svgRole, '图形语义挂在 <svg> 上').toBe('img')
  expect(r.label, '图形元素应有可访问名').toBeTruthy()
  expect(r.refreshHidden, 'expired 状态下刷新按钮可见').toBe(false)
  expect(r.fired, '点击刷新按钮应派发 oas-refresh').toBe(1)
})

test('qrcode：形状化/渐变/挖空生效，且默认渲染零影响、download 产物与屏幕一致', async ({ page }) => {
  // 曾现缺陷：download() 的离屏 SVG 走旧合并路径渲染器 → 下载产物与屏幕上的形状/渐变不一致（真报错 matrixToPath is not defined）
  await page.goto('/components/qrcode.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-qrcode')

  const r = await page.evaluate(async () => {
    interface QrEl extends HTMLElement {
      shadowRoot: ShadowRoot
      download(name?: string): Promise<void>
    }
    const icon =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' rx='12' fill='%23146ae3'/%3E%3C/svg%3E"
    const make = async (attrs: Record<string, string>): Promise<QrEl> => {
      const el = document.createElement('oas-qrcode') as QrEl
      el.setAttribute('value', 'https://oas-ui.dev')
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      document.body.append(el)
      await customElements.whenDefined('oas-qrcode')
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
      return el
    }
    const svgOf = (el: QrEl): SVGSVGElement => el.shadowRoot.querySelector('svg')!

    const plain = await make({})
    const dots = await make({ 'dot-shape': 'dots', 'corner-shape': 'rounded' })
    const cornerOnly = await make({ 'corner-shape': 'rounded' })
    const grad = await make({ gradient: '["#0b6cff","#7c3aed"]', 'gradient-angle': '45' })
    const bad = await make({ gradient: 'not-json' })
    const withIcon = await make({ icon })
    const hidden = await make({ icon, 'icon-hide-dots': '' })
    const withIconDots = await make({ icon, 'dot-shape': 'dots' })
    const hiddenDots = await make({ icon, 'icon-hide-dots': '', 'dot-shape': 'dots' })
    const styled = await make({
      'dot-shape': 'dots',
      'corner-shape': 'rounded',
      gradient: '["#0b6cff","#7c3aed"]',
      icon,
      'icon-hide-dots': '',
    })
    // 下载断言用无 icon 的同类元素：SVG 内嵌图片会让 canvas 变 tainted、toBlob 返回 null（与形状化无关）
    const dl = await make({
      'dot-shape': 'dots',
      'corner-shape': 'rounded',
      gradient: '["#0b6cff","#7c3aed"]',
    })

    // 截获 download() 构建的离屏 SVG：stub Image 记录 src，并让 canvas 流程无副作用跑完
    // （headless 下 data-URL SVG 栅格化行为与真实浏览器有差异，且内嵌图片会让 canvas tainted）
    const svgUrls: string[] = []
    const g = globalThis as unknown as Record<string, unknown>
    const origImage = g.Image
    const origGetContext = HTMLCanvasElement.prototype.getContext
    const origToBlob = HTMLCanvasElement.prototype.toBlob
    const origCreateObjectURL = URL.createObjectURL
    g.Image = class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      crossOrigin = ''
      naturalWidth = 64
      naturalHeight = 64
      set src(v: string) {
        svgUrls.push(v)
        setTimeout(() => this.onload?.(), 0)
      }
    }
    HTMLCanvasElement.prototype.getContext = function (): never {
      return {
        drawImage() {},
        beginPath() {},
        roundRect() {},
        rect() {},
        fill() {},
        fillStyle: '',
      } as never
    }
    HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback): void {
      cb(new Blob(['x'], { type: 'image/png' }))
    }
    URL.createObjectURL = (): string => 'blob:stub'

    let downloadError = ''
    try {
      await dl.download('oas-ui-qrcode.png')
    } catch (e) {
      downloadError = String(e)
    } finally {
      g.Image = origImage
      HTMLCanvasElement.prototype.getContext = origGetContext
      HTMLCanvasElement.prototype.toBlob = origToBlob
      URL.createObjectURL = origCreateObjectURL
    }

    // 行 run 路径的「正 h 之和」= 覆盖格数（挖空后单调减少，不受 run 被切断影响）
    const cells = (d: string): number =>
      [...d.matchAll(/h(-?[\d.]+)/g)].reduce((n, m) => n + Math.max(0, Number(m[1])), 0)

    // 定位图形覆盖：把 SVG 栅格化到 canvas，按模块中心数三处 7×7 的暗模块（=环 24 + 内点 9 = 33）
    const finderCoverage = async (el: QrEl): Promise<{ tl: number; tr: number; bl: number }> => {
      const svg = svgOf(el)
      const vb = (svg.getAttribute('viewBox') || '0 0 33 33').split(' ').map(Number)
      const vbW = vb[2] ?? 33
      const margin = Number(el.getAttribute('margin') ?? 4)
      const modules = vbW - margin * 2
      const k = 8
      // 关键：克隆后把 width/height 设为 total*k 再栅格化——避免按固有尺寸(128px)渲染后二次缩放产生抗锯齿
      const clone = svg.cloneNode(true) as SVGSVGElement
      clone.setAttribute('width', String(vbW * k))
      clone.setAttribute('height', String(vbW * k))
      const img = new Image()
      await new Promise<void>((res, rej) => {
        img.onload = () => res()
        img.onerror = () => rej(new Error('SVG 序列化失败'))
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`
      })
      const cv = document.createElement('canvas')
      cv.width = vbW * k
      cv.height = vbW * k
      const ctx = cv.getContext('2d')!
      ctx.drawImage(img, 0, 0, cv.width, cv.height)
      const count = (ox: number, oy: number): number => {
        let dark = 0
        const px = Math.round((ox + margin) * k)
        const py = Math.round((oy + margin) * k)
        const side = 7 * k
        const data = ctx.getImageData(px, py, side, side).data
        for (let y = 0; y < side; y += k) {
          for (let x = 0; x < side; x += k) {
            const cx = x + k / 2
            const cy = y + k / 2
            const i = (cy * side + cx) * 4
            const lum = 0.299 * (data[i] ?? 0) + 0.587 * (data[i + 1] ?? 0) + 0.114 * (data[i + 2] ?? 0)
            if (lum < 128) dark++
          }
        }
        return dark
      }
      return { tl: count(0, 0), tr: count(modules - 7, 0), bl: count(0, modules - 7) }
    }

    const squareCoverage = await finderCoverage(plain)
    const cornerCoverage = await finderCoverage(cornerOnly)
    const dotsCoverage = await finderCoverage(dots)

    return {
      squareCoverage,
      cornerCoverage,
      dotsCoverage,
      plainPaths: svgOf(plain).querySelectorAll('path').length,
      plainDefs: svgOf(plain).querySelector('defs') !== null,
      plainUses: svgOf(plain).querySelectorAll('use').length,
      dotsCircle: svgOf(dots).querySelector('defs circle#oas-qr-mod') !== null,
      dotsUses: svgOf(dots).querySelectorAll('use').length,
      dotsArc: /a\d/.test([...svgOf(dots).querySelectorAll('path')].map((p) => p.getAttribute('d')).join('')),
      gradDef: svgOf(grad).querySelector('defs linearGradient#oas-qr-grad') !== null,
      gradFill: [...svgOf(grad).querySelectorAll('[fill]')].some((n) => n.getAttribute('fill') === 'url(#oas-qr-grad)'),
      badFallsBack: svgOf(bad).querySelector('defs linearGradient') === null,
      squareIconCells: cells(svgOf(withIcon).querySelector('path')!.getAttribute('d')!),
      squareHiddenCells: cells(svgOf(hidden).querySelector('path')!.getAttribute('d')!),
      dotUses: svgOf(withIconDots).querySelectorAll('use').length,
      dotHiddenUses: svgOf(hiddenDots).querySelectorAll('use').length,
      downloadError,
      downloadUrl: svgUrls[0] ?? '',
    }
  })

  expect(r.plainDefs, '默认渲染不引入 defs（零影响）').toBe(false)
  expect(r.plainPaths, '默认只有数据区 + 定位图形两条 path').toBe(2)
  expect(r.plainUses, '默认不走 <use>').toBe(0)

  expect(r.dotsCircle, 'dot-shape=dots 生成圆点原型').toBe(true)
  expect(r.dotsUses, 'dot-shape=dots 数据区走 <use>').toBeGreaterThan(0)
  expect(r.dotsArc, 'corner-shape=rounded 定位图形带弧线').toBe(true)

  expect(r.gradDef, 'gradient 生成 linearGradient').toBe(true)
  expect(r.gradFill, '码点填充引用渐变').toBe(true)
  expect(r.badFallsBack, 'gradient 非法值回落纯色').toBe(true)

  expect(r.squareHiddenCells, 'icon-hide-dots 减少中心区码点（square）').toBeLessThan(r.squareIconCells)
  expect(r.dotHiddenUses, 'icon-hide-dots 减少中心区码点（dots）').toBeLessThan(r.dotUses)

  // 曾现缺陷：roundRect 模板串漏 ${} → 路径数据 "v-(h - 2 * rr)" 非法，浏览器丢弃后续子路径
  // → 右上/左下定位图形整块消失（0）、左上糊成实心（45+）（视觉核验才发现）
  expect(r.squareCoverage, 'square：定位图形应与模块矩阵逐格一致（33）').toEqual({
    tl: 33,
    tr: 33,
    bl: 33,
  })
  for (const [name, cov] of [
    ['corner-shape=rounded', r.cornerCoverage],
    ['dots+rounded', r.dotsCoverage],
  ] as const) {
    for (const [pos, n] of Object.entries(cov)) {
      // 圆角弧线会切到定位图形最外角格，采样点恰好落在抗锯齿带 → 允许 32；但仍能抓「整块丢失(0)/糊成实心(45+)」
      expect(n, `${name}：${pos} 定位图形不应丢失或糊成实心`).toBeGreaterThanOrEqual(32)
      expect(n, `${name}：${pos} 定位图形不应糊成实心`).toBeLessThanOrEqual(34)
    }
  }

  expect(r.downloadError, 'download() 不应抛错').toBe('')
  expect(r.downloadUrl.startsWith('data:image/svg+xml'), 'download 已触发').toBe(true)
  const svg = decodeURIComponent(r.downloadUrl.replace('data:image/svg+xml;charset=utf-8,', ''))
  expect(svg, 'download 产物含圆点原型').toContain('<circle id="oas-qr-mod"')
  expect(svg, 'download 产物含渐变').toContain('<linearGradient id="oas-qr-grad"')
  expect(svg, 'download 产物未回退到合并路径').not.toContain('crispEdges')
})
