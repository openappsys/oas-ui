import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASWatermark, textTileDataUri } from './index.js'

function mount(attrs: Record<string, string> = {}, content = ''): OASWatermark {
  const el = new OASWatermark()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (content) el.innerHTML = content
  document.body.appendChild(el)
  return el
}

function layerOf(el: OASWatermark): HTMLElement {
  return el.shadowRoot!.querySelector('[part="watermark"]')!
}

/** 内联样式（happy-dom 对超长 data-uri 的 CSS 解析有限，断言用 style 属性字符串） */
function styleOf(el: OASWatermark): string {
  return layerOf(el).getAttribute('style') ?? ''
}

describe('OASWatermark', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('text 水印生成 SVG data-uri 背景，pointer-events 为 none', () => {
    const el = mount({ text: '内部资料' })
    const style = styleOf(el)
    expect(style).toContain('data:image/svg+xml')
    expect(style).toContain('pointer-events: none')
    expect(layerOf(el).getAttribute('aria-hidden')).toBe('true')
  })

  it('image 属性优先于 text', () => {
    const el = mount({ text: 'x', image: '/wm.png' })
    const style = styleOf(el)
    expect(style).toContain('/wm.png')
    expect(style).not.toContain('data:image/svg+xml')
  })

  it('opacity 属性生效且夹取 0–1', () => {
    const a = mount({ text: 'x', opacity: '0.4' })
    expect(layerOf(a).style.opacity).toBe('0.4')
    const b = mount({ text: 'x', opacity: '1.5' })
    expect(layerOf(b).style.opacity).toBe('1')
    const c = mount({ text: 'x', opacity: '-0.2' })
    expect(layerOf(c).style.opacity).toBe('0')
  })

  it('repeat 属性时平铺（无 single 类），缺省时单枚居中（single 类）', () => {
    const repeatEl = mount({ text: 'x', repeat: '' })
    expect(layerOf(repeatEl).classList.contains('single')).toBe(false)
    const singleEl = mount({ text: 'x' })
    expect(layerOf(singleEl).classList.contains('single')).toBe(true)
  })

  it('容器无内容也正常显示水印', () => {
    const el = mount({ text: '水印' })
    expect(el.querySelector('*')).toBeNull() // 无 slot 内容
    expect(styleOf(el)).toContain('data:image/svg+xml')
  })

  it('装饰水印层 aria-hidden，slot 内容正常保留', () => {
    const el = mount({ text: '水印' }, '<button id="btn">按钮</button>')
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
    expect(el.querySelector('#btn')).not.toBeNull()
  })

  it('text 中的 XML 特殊字符被转义（不破坏 data-uri）', () => {
    const el = mount({ text: 'a&b<c>"d\'' })
    expect(styleOf(el)).toContain('data:image/svg+xml')
    const uri = textTileDataUri('a&b<c>"d\'')
    const decoded = decodeURIComponent(uri)
    expect(decoded).toContain('&amp;')
    expect(decoded).toContain('&lt;')
    expect(decoded).toContain('&gt;')
    expect(decoded).toContain('&quot;')
    expect(decoded).toContain('&apos;')
  })

  it('text 为空且无 image 时不设背景（干净降级）', () => {
    const el = mount({})
    expect(styleOf(el)).toContain('background-image: none')
  })

  it('text 变化增量更新背景（不重建图层）', () => {
    const el = mount({ text: '第一版' })
    const layer = layerOf(el)
    const before = styleOf(el)
    el.setAttribute('text', '第二版')
    expect(layerOf(el)).toBe(layer)
    expect(styleOf(el)).not.toBe(before)
  })
})
