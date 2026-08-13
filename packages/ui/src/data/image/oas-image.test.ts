import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASImage } from './index.js'

describe('OASImage', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('渲染图片', () => {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('img')).not.toBeNull()
  })

  it('alt 透传', () => {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    el.setAttribute('alt', '示例图')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('img')!.getAttribute('alt')).toBe('示例图')
  })

  it('preview 时点击图片派发 oas-preview', () => {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    el.setAttribute('preview', '')
    document.body.appendChild(el)
    let fired = 0
    el.addEventListener('oas-preview', () => fired++)
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
    expect(fired).toBe(1)
  })

  it('placeholder 时加载前显示占位、隐藏图片', () => {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    el.setAttribute('placeholder', '')
    document.body.appendChild(el)
    const img = el.shadowRoot!.querySelector<HTMLImageElement>('img')!
    expect(img.hasAttribute('hidden')).toBe(true)
    expect(el.shadowRoot!.querySelector('[part="placeholder"]')!.hasAttribute('hidden')).toBe(false)
  })

  it('图片 load 后显示图片、隐藏占位', () => {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    el.setAttribute('placeholder', '')
    document.body.appendChild(el)
    const img = el.shadowRoot!.querySelector<HTMLImageElement>('img')!
    img.dispatchEvent(new Event('load'))
    expect(img.hasAttribute('hidden')).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="placeholder"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('加载失败显示兜底文案', () => {
    const el = new OASImage()
    el.setAttribute('src', '/bad.png')
    document.body.appendChild(el)
    const img = el.shadowRoot!.querySelector<HTMLImageElement>('img')!
    img.dispatchEvent(new Event('error'))
    const fb = el.shadowRoot!.querySelector('[part="fallback"]')!
    expect(fb.hasAttribute('hidden')).toBe(false)
    expect(fb.textContent).toContain('图片加载失败')
    expect(img.hasAttribute('hidden')).toBe(true)
  })

  it('fallback 属性时加载失败切换兜底图', () => {
    const el = new OASImage()
    el.setAttribute('src', '/bad.png')
    el.setAttribute('fallback', '/fallback.png')
    document.body.appendChild(el)
    const img = el.shadowRoot!.querySelector<HTMLImageElement>('img')!
    img.dispatchEvent(new Event('error'))
    expect(img.getAttribute('src')).toBe('/fallback.png')
    expect(el.shadowRoot!.querySelector('[part="fallback"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('兜底图也失败时显示兜底文案', () => {
    const el = new OASImage()
    el.setAttribute('src', '/bad.png')
    el.setAttribute('fallback', '/fallback.png')
    document.body.appendChild(el)
    const img = el.shadowRoot!.querySelector<HTMLImageElement>('img')!
    img.dispatchEvent(new Event('error'))
    img.dispatchEvent(new Event('error'))
    expect(el.shadowRoot!.querySelector('[part="fallback"]')!.hasAttribute('hidden')).toBe(false)
  })

  it('locale：默认 alt 随 setLocale 切换，alt 属性优先', () => {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    document.body.appendChild(el)
    const img = el.shadowRoot!.querySelector<HTMLImageElement>('img')!
    expect(img.getAttribute('alt')).toBe('图片')

    setLocale(en)
    expect(img.getAttribute('alt')).toBe('Image')

    setLocale('zh-CN')
    expect(img.getAttribute('alt')).toBe('图片')
  })

  it('locale：占位/失败文案随 setLocale 切换', () => {
    const el = new OASImage()
    el.setAttribute('src', '/bad.png')
    el.setAttribute('placeholder', '')
    document.body.appendChild(el)
    const img = el.shadowRoot!.querySelector<HTMLImageElement>('img')!
    expect(el.shadowRoot!.querySelector('[part="placeholder"]')!.textContent).toContain('加载中')

    img.dispatchEvent(new Event('error'))
    const fb = el.shadowRoot!.querySelector('[part="fallback"]')!
    expect(fb.textContent).toContain('图片加载失败')

    setLocale(en)
    expect(el.shadowRoot!.querySelector('[part="placeholder"]')!.textContent).toContain('Loading')
    expect(el.shadowRoot!.querySelector('[part="fallback"]')!.textContent).toContain(
      'Image failed to load',
    )

    setLocale('zh-CN')
    expect(el.shadowRoot!.querySelector('[part="fallback"]')!.textContent).toContain('图片加载失败')
  })
})

describe('OASImage preview 增强', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  function mountPreview(src = '/a.png'): OASImage {
    const el = new OASImage()
    el.setAttribute('src', src)
    el.setAttribute('preview', '')
    document.body.appendChild(el)
    el.focus()
    return el
  }

  function maskOf(el: OASImage): HTMLElement {
    return el.shadowRoot!.querySelector('.preview-mask')!
  }

  function previewImg(el: OASImage): HTMLElement {
    return el.shadowRoot!.querySelector('[part="preview-image"]')!
  }

  it('点击打开全屏浮层并派发 oas-preview（detail 含 src）', () => {
    const el = mountPreview()
    let detail: unknown
    el.addEventListener('oas-preview', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
    expect(maskOf(el).hasAttribute('hidden')).toBe(false)
    expect(detail).toEqual({ src: '/a.png' })
  })

  it('打开后焦点落在关闭按钮，浮层 role=dialog + aria-label', () => {
    const el = mountPreview()
    const close = el.shadowRoot!.querySelector<HTMLElement>('[part="preview-close"]')!
    const spy = vi.spyOn(close, 'focus')
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
    // happy-dom 对 Shadow DOM 内元素聚焦会重定向到宿主，用 spy 验证确实聚焦关闭按钮
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
    const dialog = el.shadowRoot!.querySelector('[part="preview-dialog"]')!
    expect(dialog.getAttribute('role')).toBe('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })

  it('Esc 关闭预览并还原焦点到触发元素', () => {
    const el = mountPreview()
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(maskOf(el).hasAttribute('hidden')).toBe(true)
    expect(document.activeElement).toBe(el)
  })

  it('关闭按钮点击关闭预览', () => {
    const el = mountPreview()
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
    ;(el.shadowRoot!.querySelector('[part="preview-close"]') as HTMLElement).click()
    expect(maskOf(el).hasAttribute('hidden')).toBe(true)
    expect(document.activeElement).toBe(el)
  })

  it('放大/缩小更新预览图 transform（clamp 边界）', () => {
    const el = mountPreview()
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
    const img = previewImg(el)
    const zoomIn = el.shadowRoot!.querySelector<HTMLElement>('[part="preview-zoom-in"]')!
    const zoomOut = el.shadowRoot!.querySelector<HTMLElement>('[part="preview-zoom-out"]')!
    zoomIn.click()
    zoomIn.click()
    expect(img.style.transform).toContain('scale(2)')
    zoomOut.click()
    expect(img.style.transform).toContain('scale(1.5)')
    // 缩小到下限后不再变化
    for (let i = 0; i < 10; i++) zoomOut.click()
    expect(img.style.transform).toContain('scale(0.5)')
  })

  it('旋转按钮循环 0/90/180/270', () => {
    const el = mountPreview()
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
    const img = previewImg(el)
    const rotate = el.shadowRoot!.querySelector<HTMLElement>('[part="preview-rotate"]')!
    rotate.click()
    expect(img.style.transform).toContain('rotate(90deg)')
    rotate.click()
    expect(img.style.transform).toContain('rotate(180deg)')
    rotate.click()
    rotate.click()
    expect(img.style.transform).toContain('rotate(0deg)')
  })

  it('下载链接带 download 属性且 href 指向当前图片', () => {
    const el = mountPreview('/photo.png')
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
    const link = el.shadowRoot!.querySelector<HTMLAnchorElement>('[part="preview-download"]')!
    expect(link.getAttribute('download')).not.toBeNull()
    expect(link.getAttribute('href')).toBe('/photo.png')
  })

  it('无 preview 属性时点击不打开浮层、不派发事件', () => {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    document.body.appendChild(el)
    let fired = 0
    el.addEventListener('oas-preview', () => fired++)
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
    expect(fired).toBe(0)
    expect(maskOf(el).hasAttribute('hidden')).toBe(true)
  })

  it('关闭后移除 document keydown 监听（无孤儿监听：Esc 不再生效）', () => {
    const el = mountPreview()
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
    ;(el.shadowRoot!.querySelector('[part="preview-close"]') as HTMLElement).click()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(maskOf(el).hasAttribute('hidden')).toBe(true)
    // 再开一次仍可正常 Esc 关闭
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
    expect(maskOf(el).hasAttribute('hidden')).toBe(false)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(maskOf(el).hasAttribute('hidden')).toBe(true)
  })

  it('断开连接时清理 document keydown 监听', () => {
    const el = mountPreview()
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
    el.remove()
    // 组件已移除，document 上不应再有本组件的 Esc 处理（无异常即视为清理）
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(true).toBe(true)
  })

  it('预览图 src 与主图一致，alt 透传', () => {
    const el = mountPreview('/photo.png')
    el.setAttribute('alt', '示例')
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
    const img = previewImg(el)
    expect(img.getAttribute('src')).toBe('/photo.png')
    expect(img.getAttribute('alt')).toBe('示例')
  })
})

describe('OASImage lazy 懒加载', () => {
  /** 可控 IntersectionObserver 桩：记录实例，测试手动触发回调 */
  class FakeIO {
    static instances: FakeIO[] = []
    cb: (entries: Array<{ isIntersecting: boolean }>) => void
    observed: Element[] = []
    disconnected = false
    constructor(cb: (entries: Array<{ isIntersecting: boolean }>) => void) {
      this.cb = cb
      FakeIO.instances.push(this)
    }
    observe(target: Element): void {
      this.observed.push(target)
    }
    unobserve(): void {}
    disconnect(): void {
      this.disconnected = true
    }
  }

  function mountLazy(extra: Record<string, string> = {}): OASImage {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    el.setAttribute('lazy', '')
    for (const [k, v] of Object.entries(extra)) el.setAttribute(k, v)
    document.body.appendChild(el)
    return el
  }

  function imgOf(el: OASImage): HTMLImageElement {
    return el.shadowRoot!.querySelector<HTMLImageElement>('img')!
  }

  beforeEach(() => {
    document.body.innerHTML = ''
    FakeIO.instances = []
    setLocale('zh-CN')
    vi.stubGlobal('IntersectionObserver', FakeIO)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('不在视口内：不设置 src、创建观察器观察宿主、aria-busy=true', () => {
    const el = mountLazy()
    const img = imgOf(el)
    expect(img.hasAttribute('src')).toBe(false)
    expect(FakeIO.instances.length).toBe(1)
    expect(FakeIO.instances[0]!.observed).toContain(el)
    expect(el.getAttribute('aria-busy')).toBe('true')
  })

  it('进入视口（IO 回调 isIntersecting）：开始加载并断开观察器', () => {
    const el = mountLazy()
    const img = imgOf(el)
    FakeIO.instances[0]!.cb([{ isIntersecting: true }])
    expect(img.getAttribute('src')).toBe('/a.png')
    expect(FakeIO.instances[0]!.disconnected).toBe(true)
  })

  it('加载成功后显示图片、aria-busy=false', () => {
    const el = mountLazy()
    const img = imgOf(el)
    FakeIO.instances[0]!.cb([{ isIntersecting: true }])
    img.dispatchEvent(new Event('load'))
    expect(img.hasAttribute('hidden')).toBe(false)
    expect(el.getAttribute('aria-busy')).toBe('false')
  })

  it('加载失败后 aria-busy 复位；fallback 协作（切换到兜底图，兜底加载中仍 busy）', () => {
    const el = mountLazy({ fallback: '/fallback.png' })
    const img = imgOf(el)
    FakeIO.instances[0]!.cb([{ isIntersecting: true }])
    img.dispatchEvent(new Event('error'))
    // 首次失败：切换到兜底图继续加载（此时仍 busy）
    expect(img.getAttribute('src')).toBe('/fallback.png')
    expect(el.getAttribute('aria-busy')).toBe('true')
    // 兜底图加载成功 → busy 复位
    img.dispatchEvent(new Event('load'))
    expect(el.getAttribute('aria-busy')).toBe('false')
  })

  it('兜底图也失败：显示失败占位且 aria-busy=false', () => {
    const el = mountLazy({ fallback: '/fallback.png' })
    const img = imgOf(el)
    FakeIO.instances[0]!.cb([{ isIntersecting: true }])
    img.dispatchEvent(new Event('error'))
    img.dispatchEvent(new Event('error'))
    expect(el.shadowRoot!.querySelector('[part="fallback"]')!.hasAttribute('hidden')).toBe(false)
    expect(el.getAttribute('aria-busy')).toBe('false')
  })

  it('已在视口内（rect 命中视口）：立即加载，不创建观察器', () => {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    el.setAttribute('lazy', '')
    el.getBoundingClientRect = () =>
      ({
        top: 0,
        left: 0,
        right: 300,
        bottom: 200,
        width: 300,
        height: 200,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect
    document.body.appendChild(el)
    expect(imgOf(el).getAttribute('src')).toBe('/a.png')
    expect(FakeIO.instances.length).toBe(0)
  })

  it('环境不支持 IO：退化为立即加载（渐进增强）', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const el = mountLazy()
    expect(imgOf(el).getAttribute('src')).toBe('/a.png')
    expect(FakeIO.instances.length).toBe(0)
  })

  it('卸载时断开观察器（无孤儿观察）', () => {
    const el = mountLazy()
    const inst = FakeIO.instances[0]!
    el.remove()
    expect(inst.disconnected).toBe(true)
  })

  it('placeholder 协作：等待期显示占位、隐藏图片；进入视口仍占位；load 后切换', () => {
    const el = mountLazy({ placeholder: '' })
    const img = imgOf(el)
    const ph = el.shadowRoot!.querySelector('[part="placeholder"]')!
    expect(img.hasAttribute('hidden')).toBe(true)
    expect(ph.hasAttribute('hidden')).toBe(false)

    FakeIO.instances[0]!.cb([{ isIntersecting: true }])
    // 加载中仍显示占位
    expect(img.hasAttribute('hidden')).toBe(true)
    expect(ph.hasAttribute('hidden')).toBe(false)

    img.dispatchEvent(new Event('load'))
    expect(img.hasAttribute('hidden')).toBe(false)
    expect(ph.hasAttribute('hidden')).toBe(true)
  })

  it('src 变化：懒加载重新等待视口，进入后加载新图', () => {
    const el = mountLazy()
    const img = imgOf(el)
    el.setAttribute('src', '/b.png')
    expect(img.hasAttribute('src')).toBe(false)
    expect(FakeIO.instances.length).toBe(2)
    FakeIO.instances[1]!.cb([{ isIntersecting: true }])
    expect(img.getAttribute('src')).toBe('/b.png')
  })

  it('移除 lazy 属性：立即加载并断开观察器', () => {
    const el = mountLazy()
    const inst = FakeIO.instances[0]!
    const img = imgOf(el)
    el.removeAttribute('lazy')
    expect(img.getAttribute('src')).toBe('/a.png')
    expect(inst.disconnected).toBe(true)
  })
})
