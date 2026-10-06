import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASBarcode } from './index.js'
import { encodeBarcode } from './encoders.js'

function mount(attrs: Record<string, string> = {}): OASBarcode {
  const el = new OASBarcode()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function svgOf(el: OASBarcode): SVGSVGElement {
  return el.shadowRoot!.querySelector('svg')!
}

describe('OASBarcode', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
    setLocale('zh-CN')
  })

  it('渲染 SVG：整体宽度由内容决定（位数×码制×bar-width），不设 width/size 属性', () => {
    // code128 '123'：START_B + 3 符号 + 校验 = 5 符号 × 11 + 停止 13 = 68 模
    // 默认 bar-width=2、margin=10 → 宽 = 68×2 + 20 = 156；高 = 100 + 文字区(4+16) = 120
    const el = mount({ value: '123' })
    const svg = svgOf(el)
    expect(svg.getAttribute('viewBox')).toBe('0 0 156 120')
    expect(svg.getAttribute('width')).toBe('156')
    expect(svg.getAttribute('height')).toBe('120')
    expect(svg.querySelector('path')).not.toBeNull()
  })

  it('bar-width 放大整体几何（条宽与静区联动），下限 clamp ≥1', () => {
    const el = mount({ value: '123', 'bar-width': '3' })
    // 68×3 + 20 = 224
    expect(svgOf(el).getAttribute('width')).toBe('224')
    el.remove()
    const tiny = mount({ value: '123', 'bar-width': '0.5' })
    // clamp 到 1：68×1 + 20 = 88
    expect(svgOf(tiny).getAttribute('width')).toBe('88')
  })

  it('height 只控制条高（不含文字区）；bar-width=1 时条高 = height', () => {
    const el = mount({ value: '123', height: '60', 'display-value': 'false' })
    expect(svgOf(el).getAttribute('height')).toBe('60')
  })

  it('空 value 显示空态占位，不渲染条码', () => {
    const el = mount({})
    const empty = el.shadowRoot!.querySelector('[part="empty"]')!
    expect(empty.hasAttribute('hidden')).toBe(false)
    expect(empty.textContent).toContain('暂无内容')
    expect(svgOf(el).hasAttribute('hidden')).toBe(true)
  })

  it('六码制全部可编码渲染（结构合法：条 path + 背景 rect）', () => {
    const cases: Array<[string, string]> = [
      ['code128', 'HELLO-128'],
      ['ean13', '4006381333931'],
      ['ean8', '96385074'],
      ['upca', '036000291452'],
      ['code39', 'ABC 123'],
      ['itf14', '10614141000415'],
    ]
    for (const [format, value] of cases) {
      const el = mount({ value, format })
      const svg = svgOf(el)
      expect(svg.hasAttribute('hidden'), `${format} 应渲染`).toBe(false)
      expect(svg.querySelector('path[shape-rendering="crispEdges"]')).not.toBeNull()
      el.remove()
    }
  })

  it('format 非法值静默回退 code128', () => {
    const el = mount({ value: '123', format: 'pdf417' })
    // code128 '123' 默认宽 156
    expect(svgOf(el).getAttribute('width')).toBe('156')
  })

  it('format 常见笔误（带连字符 ean-13）同样静默回退 code128，不误判为合法码制', () => {
    const el = mount({ value: '123', format: 'ean-13' })
    expect(svgOf(el).getAttribute('width')).toBe('156')
  })

  it('RTL 隔离：方向锁在条码 svg 上（内容恒 LTR），宿主不复写 direction（空态/错误占位随宿主 dir，RTL 语言文案方向正确）', () => {
    const el = mount({ value: 'ASSET-0093', format: 'code39' })
    document.documentElement.setAttribute('dir', 'rtl')
    // 样式规则常驻 shadow <style>（同 code/color-picker 惯例）；dir 变化不增删规则
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    // 条码图形/HRI 方向锁在内容元素 svg 上（与 code 的 .line-code / color-picker 的 .hex-text 同惯例）
    expect(css).toMatch(/svg\s*\{[^}]*direction:\s*ltr/)
    // :host 不得复写 direction——否则 ar 等 RTL 语言的空态/错误占位被强制 LTR，基方向错误
    expect(css).not.toMatch(/:host\s*\{[^}]*direction:\s*ltr/)
    // 宿主盒仍于外层 bidi 上下文中隔离
    expect(css).toMatch(/:host\s*\{[^}]*unicode-bidi:\s*isolate/)
    document.documentElement.removeAttribute('dir')
  })

  describe('非法输入：错误占位 + oas-invalid（detail.reason = charset/length/checksum）', () => {
    it('字符集不符 → charset', async () => {
      const el = mount({ value: '40063813339A', format: 'ean13' })
      const err = el.shadowRoot!.querySelector('[part="error"]')!
      expect(err.hasAttribute('hidden')).toBe(false)
      expect(err.textContent).toContain('编码规则')
      expect(svgOf(el).hasAttribute('hidden')).toBe(true)
      const events: Array<CustomEvent> = []
      el.addEventListener('oas-invalid', (e) => events.push(e as CustomEvent))
      el.setAttribute('value', '40063813339B')
      await Promise.resolve()
      expect(events).toHaveLength(1)
      expect((events[0]!.detail as { reason: string }).reason).toBe('charset')
      expect(events[0]!.bubbles).toBe(true)
      expect(events[0]!.composed).toBe(true)
    })

    it('位数不符 → length', () => {
      const el = mount({ value: '40063813339', format: 'ean13' })
      expect(el.shadowRoot!.querySelector('[part="error"]')!.hasAttribute('hidden')).toBe(false)
    })

    it('校验位不符 → checksum；download() 对非法值静默返回', async () => {
      const el = mount({ value: '4006381333932', format: 'ean13' })
      expect(el.shadowRoot!.querySelector('[part="error"]')!.hasAttribute('hidden')).toBe(false)
      await expect(el.download()).resolves.toBeUndefined()
    })

    it('同一非法输入只派发一次 oas-invalid；修正后恢复渲染并不再报错', async () => {
      const events: Array<CustomEvent> = []
      const el = mount({ value: '40063813339A', format: 'ean13' })
      el.addEventListener('oas-invalid', (e) => events.push(e as CustomEvent))
      el.setAttribute('height', '80')
      await Promise.resolve()
      expect(events, '其他属性变化不重复派发').toHaveLength(0)
      el.setAttribute('value', '4006381333931')
      expect(el.shadowRoot!.querySelector('[part="error"]')!.hasAttribute('hidden')).toBe(true)
      expect(svgOf(el).hasAttribute('hidden')).toBe(false)
    })

    it('合法化后再回到同一非法输入会重新派发；停在非法值上不重复派发', async () => {
      const events: Array<CustomEvent> = []
      const el = mount({ value: '40063813339A', format: 'ean13' })
      el.addEventListener('oas-invalid', (e) => events.push(e as CustomEvent))
      // 合法化 → 复位派发指纹
      el.setAttribute('value', '4006381333931')
      await Promise.resolve()
      expect(events, '合法值不派发').toHaveLength(0)
      // 再次非法 → 重新派发一次
      el.setAttribute('value', '40063813339A')
      await Promise.resolve()
      expect(events, '合法化后再次非法应重新派发').toHaveLength(1)
      // 停留在同一非法值 → 不重复
      el.setAttribute('value', '40063813339A')
      await Promise.resolve()
      expect(events, '同一非法输入不重复派发').toHaveLength(1)
    })
  })

  describe('可扫性约束内建', () => {
    it('margin 显式值低于 10×bar-width：clamp 收敛 + console.warn 一次', () => {
      const warn = vi.mocked(console.warn)
      const el = mount({ value: '123', margin: '2', 'bar-width': '2' })
      // clamp 到 10×2=20：宽 = 68×2 + 40 = 176
      expect(svgOf(el).getAttribute('width')).toBe('176')
      expect(warn).toHaveBeenCalledTimes(1)
      expect(String(warn.mock.calls[0])).toContain('margin')
      // 后续更新不再重复告警
      el.setAttribute('height', '60')
      expect(warn).toHaveBeenCalledTimes(1)
    })

    it('margin 缺省为 10（默认值豁免下限 clamp，不告警）', () => {
      const el = mount({ value: '123' })
      expect(vi.mocked(console.warn)).not.toHaveBeenCalled()
      expect(svgOf(el).getAttribute('width')).toBe('156')
    })

    it('margin 显式值 ≥ 下限时原样生效', () => {
      const el = mount({ value: '123', margin: '30' })
      expect(svgOf(el).getAttribute('width')).toBe(String(68 * 2 + 60))
    })
  })

  describe('颜色与 dark 白底（可扫性优先）', () => {
    it('默认深条白底：bg 走 --oas-barcode-bg（fallback #ffffff），条走 --oas-barcode-color（fallback #18181b），不随主题漂移', () => {
      const el = mount({ value: '123' })
      const svg = svgOf(el)
      expect(svg.querySelector('rect')!.getAttribute('fill')).toBe('var(--oas-barcode-bg, #ffffff)')
      expect(svg.querySelector('path')!.getAttribute('fill')).toBe('var(--oas-barcode-color, #18181b)')
    })

    it('bg-color / color 属性覆盖；预设名走 var(--oas-preset-*)', () => {
      const el = mount({ value: '123', 'bg-color': '#f5f5f5', color: 'blue' })
      const svg = svgOf(el)
      expect(svg.querySelector('rect')!.getAttribute('fill')).toBe('#f5f5f5')
      expect(svg.querySelector('path')!.getAttribute('fill')).toBe('var(--oas-preset-blue)')
    })
  })

  describe('人读文字（HRI）', () => {
    it('display-value 缺省显示：EAN-13 护条延伸 + 首位数字在护条外侧 + 两组分段文字', () => {
      const el = mount({ value: '4006381333931', format: 'ean13' })
      const svg = svgOf(el)
      const texts = [...svg.querySelectorAll('text')]
      expect(texts).toHaveLength(3)
      // 首位在左护条外侧：居中于静区之后的沟槽（沟槽 12px，护条起点 x = 10 + 12 = 22）
      const first = texts.find((t) => t.textContent === '4')!
      expect(Number(first.getAttribute('x'))).toBeLessThan(22)
      // 护条延伸 path 存在（guard bars 高于普通条）
      expect(svg.querySelectorAll('path')).toHaveLength(2)
      // 高 = 100 + max(护条延伸 5×2=10, 文字 4+16) = 120
      expect(svg.getAttribute('height')).toBe('120')
    })

    it('display-value="false" 隐藏文字（EAN 护条延伸按标准保留，高度回落）', () => {
      const el = mount({ value: '4006381333931', format: 'ean13', 'display-value': 'false' })
      const svg = svgOf(el)
      expect(svg.querySelectorAll('text')).toHaveLength(0)
      expect(svg.querySelectorAll('path')).toHaveLength(2)
      // 高 = 100 + 护条延伸 10 = 110
      expect(svg.getAttribute('height')).toBe('110')
      el.remove()
      const plain = mount({ value: '123', 'display-value': 'false' })
      // code128 无护条延伸：高 = 100
      expect(svgOf(plain).getAttribute('height')).toBe('100')
    })

    it('text-position="top" 文字在条上方', () => {
      const el = mount({ value: '123', 'text-position': 'top' })
      const svg = svgOf(el)
      const text = svg.querySelector('text')!
      expect(Number(text.getAttribute('y'))).toBeLessThan(100)
      expect(svg.getAttribute('height')).toBe('120')
    })

    it('text-position="top" + EAN-13：护条延伸计入总高，不被 viewBox 截断', () => {
      const el = mount({ value: '4006381333931', format: 'ean13', 'text-position': 'top' })
      // 顶部文字区 4+16=20，条高 100，护条延伸 5×2=10 → 20+100+10 = 130
      expect(svgOf(el).getAttribute('height')).toBe('130')
      el.remove()
      // 对照：底部文字时护条与文字区重叠，取大者 → 100 + max(10,20) = 120
      const bottom = mount({ value: '4006381333931', format: 'ean13' })
      expect(svgOf(bottom).getAttribute('height')).toBe('120')
    })

    it('EAN-8 中央护条同样向下延伸（护条 path 6 段，左/中/右各 2 条）', () => {
      const el = mount({ value: '96385074', format: 'ean8' })
      const paths = [...svgOf(el).querySelectorAll('path')]
      expect(paths).toHaveLength(2)
      // 第二条为护条 path（普通条在前、护条在后）；每条一段 `v` 延伸
      const guardsPath = paths[1]!.getAttribute('d') ?? ''
      expect((guardsPath.match(/v/g) ?? []).length).toBe(6)
    })

    it('font-size / text-margin 控制文字区几何', () => {
      const el = mount({ value: '123', 'font-size': '20', 'text-margin': '8' })
      // 高 = 100 + 8 + 20 = 128
      expect(svgOf(el).getAttribute('height')).toBe('128')
    })
  })

  describe('可访问性', () => {
    it('role="img" + aria-label 挂在图形元素上，缺省走 i18n，组件属性优先', () => {
      const el = mount({ value: '123' })
      expect(svgOf(el).getAttribute('role')).toBe('img')
      expect(svgOf(el).getAttribute('aria-label')).toBe('条码')
      el.setAttribute('aria-label', '仓储货位条码')
      expect(svgOf(el).getAttribute('aria-label')).toBe('仓储货位条码')
    })

    it('locale 切换：空态文案随 setLocale 切换', () => {
      const el = mount({})
      setLocale(en)
      expect(el.shadowRoot!.querySelector('[part="empty"]')!.textContent).toContain('No content')
      setLocale('zh-CN')
      expect(el.shadowRoot!.querySelector('[part="empty"]')!.textContent).toContain('暂无内容')
    })
  })

  it('value 变化增量更新（不重建 svg 节点）', () => {
    const el = mount({ value: '123' })
    const svg = svgOf(el)
    el.setAttribute('value', '12345678')
    expect(svgOf(el)).toBe(svg)
    expect(svg.querySelector('path')).not.toBeNull()
  })

  describe('download()（离屏 rasterize）', () => {
    it('生成独立 SVG 串：显式白底/前景，无 var()/currentColor 残留', () => {
      const el = mount({ value: '123' })
      const result = (el as unknown as { buildSvgDataUrl: (r: unknown, scale: number) => string }).buildSvgDataUrl(
        encodeBarcode('123', 'code128'),
        4,
      )
      const svg = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''))
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
      expect(svg).toContain('fill="#ffffff"')
      expect(svg).toContain('fill="#18181b"')
      expect(svg).not.toContain('currentColor')
      expect(svg).not.toContain('var(--oas-')
      expect(result.startsWith('data:image/svg+xml')).toBe(true)
    })

    it('download() 在无 canvas 环境下安全返回（不抛、不悬挂）', async () => {
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
      const el = mount({ value: '123' })
      await expect(el.download()).resolves.toBeUndefined()
      vi.unstubAllGlobals()
    })

    it('download() onerror 路径：SVG rasterize 失败时向调用方抛出（不静默吞错）', async () => {
      vi.stubGlobal(
        'Image',
        class {
          onload: (() => void) | null = null
          onerror: (() => void) | null = null
          set src(_v: string) {
            this.onerror?.()
          }
        },
      )
      const el = mount({ value: '123' })
      await expect(el.download()).rejects.toThrowError(/rasterize failed/i)
      vi.unstubAllGlobals()
    })

    it('download() 空值/非法值静默返回（不产出不可扫的图）', async () => {
      const empty = mount({})
      await expect(empty.download()).resolves.toBeUndefined()
      empty.remove()
      const invalid = mount({ value: '40063813339A', format: 'ean13' })
      await expect(invalid.download()).resolves.toBeUndefined()
    })
  })
})
