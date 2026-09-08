import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASQRCode } from './index.js'

function mount(attrs: Record<string, string> = {}): OASQRCode {
  const el = new OASQRCode()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function svgOf(el: OASQRCode): SVGSVGElement {
  return el.shadowRoot!.querySelector('svg')!
}

function wrapperOf(el: OASQRCode): HTMLElement {
  return el.shadowRoot!.querySelector('[part="wrapper"]')!
}

describe('OASQRCode', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('渲染 SVG，viewBox 与版本匹配（含默认静区 margin=4），含 path 图形', () => {
    const el = mount({ value: 'HELLO WORLD' })
    const svg = svgOf(el)
    // v1 矩阵 21 + 静区 2×4 = 29
    expect(svg.getAttribute('viewBox')).toBe('0 0 29 29')
    expect(svg.getAttribute('width')).toBe('128')
    expect(svg.getAttribute('height')).toBe('128')
    expect(svg.querySelector('path')).not.toBeNull()
  })

  it('size 属性控制宽高', () => {
    const el = mount({ value: 'hi', size: '200' })
    const svg = svgOf(el)
    expect(svg.getAttribute('width')).toBe('200')
    expect(svg.getAttribute('height')).toBe('200')
  })

  it('空 value 显示空态提示，不渲染二维码', () => {
    const el = mount({})
    const empty = el.shadowRoot!.querySelector('[part="empty"]')!
    expect(empty.hasAttribute('hidden')).toBe(false)
    expect(empty.textContent).toContain('暂无内容')
    expect(svgOf(el).hasAttribute('hidden')).toBe(true)
  })

  it('超长 value 显示超长提示', () => {
    const el = mount({ value: 'x'.repeat(2954) })
    const err = el.shadowRoot!.querySelector('[part="error"]')!
    expect(err.hasAttribute('hidden')).toBe(false)
    expect(err.textContent).toContain('内容过长')
    expect(svgOf(el).hasAttribute('hidden')).toBe(true)
  })

  it('error-correction 四级别真实实现：同值不同级别渲染产物两两不同（不再静默归一）', () => {
    const paths = new Set<string>()
    for (const ec of ['l', 'm', 'q', 'h']) {
      const el = mount({ value: 'HELLO WORLD', 'error-correction': ec })
      const svg = svgOf(el)
      expect(svg.querySelector('path')).not.toBeNull()
      paths.add(svg.querySelector('path')!.getAttribute('d')!)
      el.remove()
    }
    // L/M/Q 同版本但 ECC/格式信息不同；H 升入 v2（viewBox 更大）——至少 3 种不同产物
    expect(paths.size).toBeGreaterThanOrEqual(3)
  })

  it('error-correction="h" 时版本自动升高（HELLO WORLD → v2，viewBox 33）', () => {
    const el = mount({ value: 'HELLO WORLD', 'error-correction': 'h' })
    expect(svgOf(el).getAttribute('viewBox')).toBe('0 0 33 33')
  })

  it('aria-label 默认走 i18n，组件 aria-label 属性优先', () => {
    const el = mount({ value: 'hi' })
    expect(wrapperOf(el).getAttribute('aria-label')).toBe('二维码')
    el.setAttribute('aria-label', '商品链接二维码')
    expect(wrapperOf(el).getAttribute('aria-label')).toBe('商品链接二维码')
  })

  it('role="img" 语义', () => {
    const el = mount({ value: 'hi' })
    expect(wrapperOf(el).getAttribute('role')).toBe('img')
  })

  it('locale：空态文案随 setLocale 切换', () => {
    const el = mount({})
    setLocale(en)
    expect(el.shadowRoot!.querySelector('[part="empty"]')!.textContent).toContain('No content')
    setLocale('zh-CN')
    expect(el.shadowRoot!.querySelector('[part="empty"]')!.textContent).toContain('暂无内容')
  })

  it('value 变化增量更新（不重建 svg 节点）', () => {
    const el = mount({ value: 'a' })
    const svg = svgOf(el)
    el.setAttribute('value', 'bbbbbbbbbb')
    expect(svgOf(el)).toBe(svg)
    expect(svg.querySelector('path')).not.toBeNull()
  })

  describe('背景/前景/静区（dark 可扫性修复）', () => {
    it('默认背景固定白（var 通道含 #ffffff fallback），不随主题色漂移', () => {
      const el = mount({ value: 'hi' })
      const rect = svgOf(el).querySelector('rect')!
      expect(rect.getAttribute('fill')).toBe('var(--oas-qrcode-bg, #ffffff)')
    })

    it('bg-color 属性覆盖背景', () => {
      const el = mount({ value: 'hi', 'bg-color': '#f5f5f5' })
      expect(svgOf(el).querySelector('rect')!.getAttribute('fill')).toBe('#f5f5f5')
    })

    it('color 属性控制前景：CSS 色值直注 / 预设名走 var(--oas-preset-*)', () => {
      const plain = mount({ value: 'hi', color: '#123456' })
      expect(svgOf(plain).querySelector('path')!.getAttribute('fill')).toBe('#123456')
      plain.remove()
      const preset = mount({ value: 'hi', color: 'blue' })
      expect(svgOf(preset).querySelector('path')!.getAttribute('fill')).toBe('var(--oas-preset-blue)')
      preset.remove()
      // 缺省固定深色（dark 可扫性：与固定白静区配套，currentColor 在 dark 下是浅色不可扫）
      const dft = mount({ value: 'hi' })
      expect(svgOf(dft).querySelector('path')!.getAttribute('fill')).toBe(
        'var(--oas-qrcode-color, #18181b)',
      )
    })

    it('margin 静区：默认 4 模块，path 整体偏移；margin=0 贴边', () => {
      const el = mount({ value: 'hi' })
      const d = el.shadowRoot!.querySelector('path')!.getAttribute('d')!
      expect(d).toMatch(/^M4 /)
      el.remove()
      const noMargin = mount({ value: 'hi', margin: '0' })
      expect(noMargin.shadowRoot!.querySelector('path')!.getAttribute('d')).toMatch(/^M[01] /)
      expect(svgOf(noMargin).getAttribute('viewBox')).toBe('0 0 21 21')
    })
  })

  describe('中心 logo（icon + icon-size）', () => {
    it('icon 属性在 SVG 内嵌 <image> + 底色托，居中于矩阵', () => {
      const el = mount({ value: 'hi', icon: 'https://oas-ui.dev/logo.png' })
      const svg = svgOf(el)
      const image = svg.querySelector('image')!
      expect(image.getAttribute('href')).toBe('https://oas-ui.dev/logo.png')
      // 默认 icon-size = size/5 = 128/5 ≈ 26 → 以 viewBox 模块计（v1 总 29 模块）
      const w = Number(image.getAttribute('width'))
      expect(w).toBeGreaterThan(0)
      expect(w).toBeLessThan(29 / 2)
    })

    it('icon-size 属性控制嵌入尺寸并收敛上限（≤ size/2）', () => {
      const el = mount({
        value: 'hi',
        icon: 'https://oas-ui.dev/logo.png',
        'icon-size': '999',
      })
      const image = svgOf(el).querySelector('image')!
      expect(Number(image.getAttribute('width'))).toBeLessThanOrEqual(29 / 2)
    })

    it('icon URL 转义：引号不破坏模板（属性序列化后仍可读回原值）', () => {
      const el = mount({ value: 'hi', icon: 'https://x.dev/a.png?b="1"&c=2' })
      const html = svgOf(el).innerHTML
      expect(html).not.toContain('?b="1"')
      expect(html).toContain('&quot;')
      expect(svgOf(el).querySelector('image')!.getAttribute('href')).toBe(
        'https://x.dev/a.png?b="1"&c=2',
      )
    })
  })

  describe('状态机（status + oas-refresh + slot="status"）', () => {
    it('status="active"（缺省）不显示覆盖层', () => {
      const el = mount({ value: 'hi' })
      expect(el.shadowRoot!.querySelector('[part="overlay"]')!.hasAttribute('hidden')).toBe(true)
    })

    it('status="expired"：覆盖层显示「已过期」+ 刷新按钮，点击派发 oas-refresh', () => {
      const el = mount({ value: 'hi', status: 'expired' })
      const overlay = el.shadowRoot!.querySelector<HTMLElement>('[part="overlay"]')!
      expect(overlay.hasAttribute('hidden')).toBe(false)
      expect(overlay.querySelector('[part="overlay-text"]')!.textContent).toContain('已过期')
      const refresh = overlay.querySelector<HTMLButtonElement>('[part="refresh"]')!
      expect(refresh.hidden).toBe(false)
      let fired = 0
      el.addEventListener('oas-refresh', () => fired++)
      refresh.click()
      expect(fired).toBe(1)
    })

    it('status="loading"：spinner 可见 + aria-busy，无刷新按钮', () => {
      const el = mount({ value: 'hi', status: 'loading' })
      const overlay = el.shadowRoot!.querySelector('[part="overlay"]')!
      expect(overlay.querySelector('[part="spinner"]')!.hasAttribute('hidden')).toBe(false)
      expect(overlay.querySelector<HTMLButtonElement>('[part="refresh"]')!.hidden).toBe(true)
      expect(wrapperOf(el).getAttribute('aria-busy')).toBe('true')
    })

    it('status="scanned"：只读文案，无 spinner/刷新按钮', () => {
      const el = mount({ value: 'hi', status: 'scanned' })
      const overlay = el.shadowRoot!.querySelector('[part="overlay"]')!
      expect(overlay.querySelector('[part="overlay-text"]')!.textContent).toContain('已扫描')
      expect(overlay.querySelector('[part="spinner"]')!.hasAttribute('hidden')).toBe(true)
      expect(overlay.querySelector<HTMLButtonElement>('[part="refresh"]')!.hidden).toBe(true)
    })

    it('状态切换增量同步（expired → active 覆盖层隐藏）', () => {
      const el = mount({ value: 'hi', status: 'expired' })
      expect(el.shadowRoot!.querySelector('[part="overlay"]')!.hasAttribute('hidden')).toBe(false)
      el.setAttribute('status', 'active')
      expect(el.shadowRoot!.querySelector('[part="overlay"]')!.hasAttribute('hidden')).toBe(true)
    })

    it('template[slot="status"] 克隆覆盖默认状态内容', () => {
      const el = mount({ value: 'hi', status: 'expired' })
      const tpl = document.createElement('template')
      tpl.setAttribute('slot', 'status')
      tpl.innerHTML = '<span class="custom-status">自定义过期</span>'
      el.appendChild(tpl)
      el.setAttribute('status', 'loading')
      const overlay = el.shadowRoot!.querySelector('[part="overlay"]')!
      expect(overlay.querySelector('.custom-status')!.textContent).toBe('自定义过期')
      // 默认形态隐藏
      expect(overlay.querySelector<HTMLElement>('[part="status-default"]')!.hidden).toBe(true)
    })
  })

  describe('download()（离屏 rasterize）', () => {
    it('生成独立 SVG 串：显式白底/前景/静区，无 currentColor 残留', () => {
      const el = mount({ value: 'https://oas-ui.dev' })
      const url = (
        el as unknown as { buildSvgDataUrl: (s: number, m: Uint8Array, k: number) => string }
      ).buildSvgDataUrl(21, new Uint8Array(21 * 21), 4)
      const svg = decodeURIComponent(url.replace('data:image/svg+xml;charset=utf-8,', ''))
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
      expect(svg).toContain('fill="#ffffff"')
      expect(svg).not.toContain('currentColor')
      expect(url.startsWith('data:image/svg+xml')).toBe(true)
    })

    it('download() 在无 canvas 环境下安全返回（不抛、不悬挂）', async () => {
      // happy-dom 的 Image 不触发 onload：用桩立即回调，canvas getContext 返回 null 时早退
      vi.stubGlobal(
        'Image',
        class {
          onload: (() => void) | null = null
          onerror: (() => void) | null = null
          set src(_v: string) {
            this.onload?.()
          }
        },
      )
      const el = mount({ value: 'hi' })
      await expect(el.download()).resolves.toBeUndefined()
      vi.unstubAllGlobals()
    })
  })
})
