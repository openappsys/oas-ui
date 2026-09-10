import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASWatermark, textTileDataUri, textTileCanvas, canvasAvailable, parseTextLines } from './index.js'

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
    expect(decoded).toContain('&#39;')
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

  it('text 支持 JSON 数组与 \\n 多行（SVG 内多 <text> 行）', () => {
    const el = mount({ text: '["第一行","第二行"]', repeat: '' })
    expect(styleOf(el)).toContain('data:image/svg+xml')
    const svg = decodeURIComponent(textTileDataUri('甲\n乙'))
    expect(svg.match(/<text /g)!.length).toBe(2)
  })

  it('textTileDataUri 多行行距按字号比例排布', () => {
    // lineHeight = fontSize * 1.4 = 28；两行中线 = 60 ± 14
    const svg = decodeURIComponent(textTileDataUri('甲\n乙', { fontSize: 20 }))
    expect(svg).toContain('y="46"')
    expect(svg).toContain('y="74"')
  })

  it('textTileDataUri 支持 rotate / font-size / font-weight / font-family / width / height', () => {
    const svg = decodeURIComponent(
      textTileDataUri('x', {
        rotate: -45,
        fontSize: 24,
        fontWeight: '700',
        fontFamily: 'Georgia, "Times New Roman", serif',
        width: 300,
        height: 150,
      }),
    )
    expect(svg).toContain('rotate(-45 150 75)')
    expect(svg).toContain('font-size="24"')
    expect(svg).toContain('font-weight="700"')
    expect(svg).toContain('font-family="Georgia, &quot;Times New Roman&quot;, serif"')
    expect(svg).toContain('width="300" height="150"')
    expect(svg).toContain('viewBox="0 0 300 150"')
  })

  it('font-size/font-weight/font-family/width/height/rotate 属性进 data-uri', () => {
    const el = mount({
      text: 'x',
      repeat: '',
      rotate: '-22',
      'font-size': '20',
      'font-weight': '600',
      'font-family': 'monospace',
      width: '320',
      height: '160',
    })
    const style = styleOf(el)
    expect(style).toContain('data:image/svg+xml')
    const uriMatch = style.match(/data:image\/svg\+xml[^"]+/)
    expect(uriMatch).not.toBeNull()
    const svg = decodeURIComponent(uriMatch![0])
    expect(svg).toContain('rotate(-22 160 80)')
    expect(svg).toContain('font-size="20"')
    expect(svg).toContain('font-weight="600"')
    expect(svg).toContain('font-family="monospace"')
  })

  it('gap 属性控制 background-size（JSON [x,y]，单值双等）', () => {
    const el = mount({ text: 'x', repeat: '', gap: '[160, 90]' })
    expect(styleOf(el)).toContain('background-size: 160px 90px')
    const single = mount({ text: 'x', repeat: '', gap: '[200]' })
    expect(styleOf(single)).toContain('background-size: 200px 200px')
  })

  it('offset 属性控制 background-position，缺省为 gap/2', () => {
    const el = mount({ text: 'x', repeat: '', offset: '[10, 20]' })
    expect(styleOf(el)).toContain('background-position: 10px 20px')
    const dft = mount({ text: 'x', repeat: '' })
    expect(styleOf(dft)).toContain('background-position: 120px 60px')
  })

  it('z-index 属性生效，默认 2', () => {
    const a = mount({ text: 'x' })
    expect(layerOf(a).style.zIndex).toBe('2')
    const b = mount({ text: 'x', 'z-index': '10' })
    expect(layerOf(b).style.zIndex).toBe('10')
  })

  it('staggered 时双层背景错位半 tile（第二层高斯偏移 gap/2）', () => {
    const el = mount({ text: 'x', repeat: '', gap: '[200, 100]', staggered: '' })
    const style = styleOf(el)
    expect(style.split('data:image/svg+xml').length - 1).toBe(2)
    expect(style).toContain('background-position: 100px 50px, 200px 100px')
  })

  it('color 预设名解析为 preset token，具体色值直接注入', () => {
    const a = mount({ text: 'x', color: 'geekblue' })
    expect(styleOf(a)).toContain('color: var(--oas-preset-geekblue)')
    const b = mount({ text: 'x', color: '#ff6b00' })
    expect(styleOf(b)).toContain('color: #ff6b00')
  })

  it('tamper-proof 默认开：水印层被移除后自动重挂并派发 oas-remove', async () => {
    const el = mount({ text: 'x', repeat: '' })
    const events: unknown[] = []
    el.addEventListener('oas-remove', (e) => events.push((e as CustomEvent).detail))
    const layer = layerOf(el)
    layer.remove()
    await new Promise((r) => setTimeout(r, 0))
    const restored = layerOf(el)
    expect(restored).not.toBeNull()
    expect(restored).not.toBe(layer)
    expect(restored.getAttribute('aria-hidden')).toBe('true')
    expect(styleOf(el)).toContain('data:image/svg+xml')
    expect(events).toEqual([{ type: 'removed' }])
  })

  it('tamper-proof：水印层样式被篡改后自动恢复并派发 oas-remove（modified）', async () => {
    const el = mount({ text: 'x', repeat: '' })
    const events: unknown[] = []
    el.addEventListener('oas-remove', (e) => events.push((e as CustomEvent).detail))
    layerOf(el).setAttribute('style', 'display: none')
    await new Promise((r) => setTimeout(r, 0))
    expect(events).toEqual([{ type: 'modified' }])
    expect(styleOf(el)).toContain('data:image/svg+xml')
  })

  it('自身属性更新不触发防篡改重建（无 oas-remove 风暴）', async () => {
    const el = mount({ text: 'x', repeat: '' })
    let count = 0
    el.addEventListener('oas-remove', () => count++)
    el.setAttribute('text', 'y')
    el.setAttribute('opacity', '0.5')
    el.setAttribute('rotate', '-10')
    await new Promise((r) => setTimeout(r, 0))
    expect(count).toBe(0)
  })

  it('tamper-proof="false" 关闭防篡改：移除后不重建', async () => {
    const el = mount({ text: 'x', repeat: '', 'tamper-proof': 'false' })
    layerOf(el).remove()
    await new Promise((r) => setTimeout(r, 0))
    expect(layerOf(el)).toBeNull()
  })

  it('tamper-proof 在断开重连后仍生效', async () => {
    const el = mount({ text: 'x', repeat: '' })
    el.remove()
    document.body.appendChild(el)
    layerOf(el).remove()
    await new Promise((r) => setTimeout(r, 0))
    expect(layerOf(el)).not.toBeNull()
  })

  it('movable：拖拽更新 offset 属性（默认 offset=gap/2 起步）', async () => {
    const el = mount({ text: 'x', repeat: '', movable: '' })
    expect(styleOf(el)).toContain('pointer-events: auto')
    const layer = layerOf(el)
    layer.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true, button: 0 }),
    )
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 140, clientY: 130 }))
    await new Promise((r) => setTimeout(r, 0))
    // 起步 offset 120,60（gap 240×120 的一半）+ 位移 (40,30)
    expect(el.getAttribute('offset')).toBe('[160,90]')
    expect(styleOf(el)).toContain('background-position: 160px 90px')
    document.dispatchEvent(new PointerEvent('pointerup', { clientX: 140, clientY: 130 }))
    await new Promise((r) => setTimeout(r, 0))
    // 松手后不再跟随
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 300, clientY: 300 }))
    await new Promise((r) => setTimeout(r, 0))
    expect(el.getAttribute('offset')).toBe('[160,90]')
  })

  it('非 movable 时水印层 pointer-events 为 none（不拦截交互）', () => {
    const el = mount({ text: 'x', repeat: '' })
    expect(styleOf(el)).toContain('pointer-events: none')
  })

  // —— canvas 引擎（任务①）：特性检测回退 / grayscale / 缓存约定 ——
  // happy-dom 无 canvas 2d 上下文，组件须自动回退 SVG data-uri 路径（SSR 同此约定）

  it('canvasAvailable 在 happy-dom 为 false，文字水印回退 SVG data-uri', () => {
    expect(canvasAvailable()).toBe(false)
    const el = mount({ text: 'canvas 回退' })
    expect(styleOf(el)).toContain('data:image/svg+xml')
  })

  it('textTileCanvas 在环境无 2d 上下文时返回 null（SSR/测试环境优雅降级）', () => {
    expect(textTileCanvas('x')).toBeNull()
    expect(textTileCanvas('')).toBeNull()
  })

  it('grayscale 属性进 observedAttributes', () => {
    expect(OASWatermark.observedAttributes).toContain('grayscale')
    expect(OASWatermark.observedAttributes).toContain('fullscreen')
  })

  it('grayscale：无 canvas 环境回退为图层 CSS filter（不丢能力）', () => {
    const el = mount({ image: '/wm.png', grayscale: '' })
    expect(styleOf(el)).toContain('filter: grayscale(1)')
    const plain = mount({ image: '/wm.png' })
    expect(styleOf(plain)).not.toContain('grayscale')
  })

  it('grayscale 属性变化增量更新（不重建图层）', () => {
    const el = mount({ image: '/wm.png' })
    const layer = layerOf(el)
    el.setAttribute('grayscale', '')
    expect(layerOf(el)).toBe(layer)
    expect(styleOf(el)).toContain('filter: grayscale(1)')
  })

  // —— fullscreen 全屏水印（任务②）——

  it('fullscreen：shadow 样式表含 :host([fullscreen]) fixed 全屏规则', () => {
    const el = mount({ text: 'x', fullscreen: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toContain(':host([fullscreen])')
    expect(css).toContain('position: fixed')
    expect(css).toContain('inset: 0')
    expect(css).toContain('pointer-events: none')
  })

  it('fullscreen + z-index 属性：宿主内联 z-index 写入（覆盖默认高层）', () => {
    const el = mount({ text: 'x', fullscreen: '', 'z-index': '999' })
    expect(el.style.zIndex).toBe('999')
  })

  it('fullscreen 缺省不写宿主 z-index（CSS 变量默认最高层兜底）', () => {
    const el = mount({ text: 'x', fullscreen: '' })
    expect(el.style.zIndex).toBe('')
  })

  it('非 fullscreen 不写宿主 z-index（容器模式宿主样式零干扰）', () => {
    const el = mount({ text: 'x', 'z-index': '10' })
    expect(el.style.zIndex).toBe('')
    expect(layerOf(el).style.zIndex).toBe('10')
  })

  it('fullscreen 关闭后清除宿主内联 z-index', () => {
    const el = mount({ text: 'x', fullscreen: '', 'z-index': '999' })
    expect(el.style.zIndex).toBe('999')
    el.removeAttribute('fullscreen')
    expect(el.style.zIndex).toBe('')
  })
})
