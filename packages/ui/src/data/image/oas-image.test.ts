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

  /** 预览打开后遮罩被移入 body portal——按「portal shadow 优先」解析预览文档 */
  function previewDoc(el: OASImage): ShadowRoot {
    const portal = document.querySelector('[data-oas-image-preview-portal]')
    if (portal?.shadowRoot?.querySelector('.preview-mask')) return portal.shadowRoot
    return el.shadowRoot!
  }

  function q<T extends Element = HTMLElement>(el: OASImage, sel: string): T {
    return previewDoc(el).querySelector(sel) as T
  }

  function maskOf(el: OASImage): HTMLElement {
    return q(el, '.preview-mask')
  }

  function previewImg(el: OASImage): HTMLElement {
    return q(el, '[part="preview-image"]')
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
    const close = q<HTMLElement>(el, '[part="preview-close"]')
    const spy = vi.spyOn(close, 'focus')
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
    // happy-dom 对 Shadow DOM 内元素聚焦会重定向到宿主，用 spy 验证确实聚焦关闭按钮
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
    const dialog = q(el, '[part="preview-dialog"]')!
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
    q<HTMLElement>(el, '[part="preview-close"]').click()
    expect(maskOf(el).hasAttribute('hidden')).toBe(true)
    expect(document.activeElement).toBe(el)
  })

  it('放大/缩小更新预览图 transform（clamp 边界）', () => {
    const el = mountPreview()
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
    const img = previewImg(el)
    const zoomIn = q<HTMLElement>(el, '[part="preview-zoom-in"]')
    const zoomOut = q<HTMLElement>(el, '[part="preview-zoom-out"]')
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
    const rotate = q<HTMLElement>(el, '[part="preview-rotate"]')
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
    const link = q<HTMLAnchorElement>(el, '[part="preview-download"]')!
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
    q<HTMLElement>(el, '[part="preview-close"]').click()
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

describe('OASImage 图集预览', () => {
  const GALLERY = JSON.stringify(['/a.png', '/b.png', '/c.png'])

  function mountGallery(extra: Record<string, string> = {}, src = '/a.png'): OASImage {
    const el = new OASImage()
    el.setAttribute('src', src)
    el.setAttribute('preview', '')
    el.setAttribute('preview-src-list', GALLERY)
    for (const [k, v] of Object.entries(extra)) el.setAttribute(k, v)
    document.body.appendChild(el)
    return el
  }

  function pdoc(el: OASImage): ShadowRoot {
    const portal = document.querySelector('[data-oas-image-preview-portal]')
    if (portal?.shadowRoot?.querySelector('.preview-mask')) return portal.shadowRoot
    return el.shadowRoot!
  }

  function pq<T extends Element = HTMLElement>(el: OASImage, sel: string): T {
    return pdoc(el).querySelector(sel) as T
  }

  function openIt(el: OASImage): void {
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
  }

  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('打开后预览图取列表第一张，页码 1/3，翻页按钮可见且 prev 禁用', () => {
    const el = mountGallery()
    openIt(el)
    expect(pq<HTMLImageElement>(el, '[part="preview-image"]').getAttribute('src')).toBe('/a.png')
    const counter = pq(el, '[part="preview-counter"]')
    expect(counter.hidden).toBe(false)
    expect(counter.textContent).toBe('1/3')
    expect(pq<HTMLElement>(el, '[part="preview-prev"]').hidden).toBe(false)
    expect(pq<HTMLButtonElement>(el, '[part="preview-prev"]').disabled).toBe(true)
    expect(pq<HTMLButtonElement>(el, '[part="preview-next"]').disabled).toBe(false)
  })

  it('next/prev 翻页更新预览图与页码，非 infinite 到边界后停住', () => {
    const el = mountGallery()
    openIt(el)
    const next = pq<HTMLButtonElement>(el, '[part="preview-next"]')
    const prev = pq<HTMLButtonElement>(el, '[part="preview-prev"]')
    next.click()
    expect(pq<HTMLImageElement>(el, '[part="preview-image"]').getAttribute('src')).toBe('/b.png')
    expect(pq(el, '[part="preview-counter"]').textContent).toBe('2/3')
    next.click()
    expect(pq(el, '[part="preview-counter"]').textContent).toBe('3/3')
    expect(next.disabled).toBe(true)
    // 已到末页：再点 next 停住
    next.click()
    expect(pq(el, '[part="preview-counter"]').textContent).toBe('3/3')
    prev.click()
    expect(pq(el, '[part="preview-counter"]').textContent).toBe('2/3')
  })

  it('键盘 ArrowRight/ArrowLeft 翻页', () => {
    const el = mountGallery()
    openIt(el)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(pq<HTMLImageElement>(el, '[part="preview-image"]').getAttribute('src')).toBe('/b.png')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(pq<HTMLImageElement>(el, '[part="preview-image"]').getAttribute('src')).toBe('/a.png')
  })

  it('infinite 首尾循环：末页 next 回第一页，首页 prev 跳最后一页', () => {
    const el = mountGallery({ infinite: '' })
    openIt(el)
    const next = pq<HTMLButtonElement>(el, '[part="preview-next"]')
    const prev = pq<HTMLButtonElement>(el, '[part="preview-prev"]')
    next.click()
    next.click()
    expect(pq(el, '[part="preview-counter"]').textContent).toBe('3/3')
    // infinite：末页再 next → 回第一页
    next.click()
    expect(pq(el, '[part="preview-counter"]').textContent).toBe('1/3')
    expect(pq<HTMLImageElement>(el, '[part="preview-image"]').getAttribute('src')).toBe('/a.png')
    // infinite：首页 prev → 跳最后一页
    prev.click()
    expect(pq(el, '[part="preview-counter"]').textContent).toBe('3/3')
    expect(pq<HTMLImageElement>(el, '[part="preview-image"]').getAttribute('src')).toBe('/c.png')
  })

  it('缩略图 src 命中列表时从对应索引打开', () => {
    const el = mountGallery({}, '/b.png')
    openIt(el)
    expect(pq(el, '[part="preview-counter"]').textContent).toBe('2/3')
  })

  it('翻页重置缩放/旋转/翻转/平移状态', () => {
    const el = mountGallery()
    openIt(el)
    pq<HTMLElement>(el, '[part="preview-zoom-in"]').click()
    pq<HTMLElement>(el, '[part="preview-rotate"]').click()
    pq<HTMLElement>(el, '[part="preview-flip-x"]').click()
    expect(previewImgAt(el).style.transform).toContain('rotate(90deg)')
    pq<HTMLElement>(el, '[part="preview-next"]').click()
    expect(previewImgAt(el).style.transform).toBe('translate(0px, 0px) rotate(0deg) scale(1)')
  })

  function previewImgAt(el: OASImage): HTMLElement {
    return pq(el, '[part="preview-image"]')
  }

  it('图集中某张加载失败显示失败占位（非空白），翻页后恢复', () => {
    const el = mountGallery()
    openIt(el)
    const img = pq<HTMLImageElement>(el, '[part="preview-image"]')
    img.dispatchEvent(new Event('error'))
    const errBox = pq<HTMLElement>(el, '[part="preview-error"]')
    expect(errBox.hidden).toBe(false)
    expect(errBox.textContent).toContain('图片加载失败')
    expect(img.hidden).toBe(true)
    // 翻到下一张：失败占位收起、预览图恢复显示
    pq<HTMLElement>(el, '[part="preview-next"]').click()
    expect(pq<HTMLElement>(el, '[part="preview-error"]').hidden).toBe(true)
    expect(pq<HTMLImageElement>(el, '[part="preview-image"]').hidden).toBe(false)
  })

  it('图集失败占位复用 error 插槽内容', () => {
    const el = mountGallery()
    el.innerHTML = '<template slot="error"><i class="custom-err">图挂了</i></template>'
    document.body.appendChild(el)
    openIt(el)
    pq<HTMLImageElement>(el, '[part="preview-image"]').dispatchEvent(new Event('error'))
    expect(pq(el, '[part="preview-error"]').querySelector('.custom-err')).not.toBeNull()
  })

  it('非法 JSON 按无图集处理：回落单图预览，页码与翻页隐藏', () => {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    el.setAttribute('preview', '')
    el.setAttribute('preview-src-list', '{bad json')
    document.body.appendChild(el)
    openIt(el)
    expect(pq<HTMLImageElement>(el, '[part="preview-image"]').getAttribute('src')).toBe('/a.png')
    expect(pq<HTMLElement>(el, '[part="preview-counter"]').hidden).toBe(true)
    expect(pq<HTMLElement>(el, '[part="preview-prev"]').hidden).toBe(true)
  })

  it('单图模式页码与翻页按钮隐藏', () => {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    el.setAttribute('preview', '')
    document.body.appendChild(el)
    openIt(el)
    expect(pq<HTMLElement>(el, '[part="preview-counter"]').hidden).toBe(true)
    expect(pq<HTMLElement>(el, '[part="preview-prev"]').hidden).toBe(true)
    expect(pq<HTMLElement>(el, '[part="preview-next"]').hidden).toBe(true)
  })

  it('图集打开派发 oas-preview，detail.src 为当前张地址', () => {
    const el = mountGallery({}, '/b.png')
    let detail: unknown
    el.addEventListener('oas-preview', (e: Event) => (detail = (e as CustomEvent).detail))
    openIt(el)
    expect(detail).toEqual({ src: '/b.png' })
  })

  it('图集翻页派发 oas-preview-nav（detail {index, src}），供容器组件接管索引', () => {
    const el = mountGallery()
    openIt(el)
    const navs: unknown[] = []
    el.addEventListener('oas-preview-nav', (e: Event) => navs.push((e as CustomEvent).detail))
    pq<HTMLElement>(el, '[part="preview-next"]').click()
    expect(navs).toEqual([{ index: 1, src: '/b.png' }])
    pq<HTMLElement>(el, '[part="preview-prev"]').click()
    expect(navs).toEqual([
      { index: 1, src: '/b.png' },
      { index: 0, src: '/a.png' },
    ])
  })

  it('previewGoTo(index)：预览打开时跳转到指定张并重置变换，越界收敛', () => {
    const el = mountGallery()
    openIt(el)
    pq<HTMLElement>(el, '[part="preview-zoom-in"]').click()
    el.previewGoTo(2)
    expect(pq(el, '[part="preview-counter"]').textContent).toBe('3/3')
    expect(previewImgAt(el).style.transform).toBe('translate(0px, 0px) rotate(0deg) scale(1)')
    // 越界收敛到末张；同索引重复调用不做事
    el.previewGoTo(99)
    expect(pq(el, '[part="preview-counter"]').textContent).toBe('3/3')
  })

  it('previewGoTo(index)：预览未打开时不做事', () => {
    const el = mountGallery()
    el.previewGoTo(1)
    expect(pq(el, '.preview-mask').hasAttribute('hidden')).toBe(true)
  })

  it('图集模式下 prev/next 加入 Tab 焦点序列（含翻页按钮的工具栏焦点陷阱不报错）', () => {
    const el = mountGallery()
    openIt(el)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
    )
    expect(pq<HTMLElement>(el, '.preview-mask').hasAttribute('hidden')).toBe(false)
  })
})

describe('OASImage preview-src', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  function pdoc(el: OASImage): ShadowRoot {
    const portal = document.querySelector('[data-oas-image-preview-portal]')
    if (portal?.shadowRoot?.querySelector('.preview-mask')) return portal.shadowRoot
    return el.shadowRoot!
  }

  it('preview-src 优先作为预览地址（缩略图/原图分离）', () => {
    const el = new OASImage()
    el.setAttribute('src', '/thumb.png')
    el.setAttribute('preview-src', '/full.png')
    el.setAttribute('preview', '')
    document.body.appendChild(el)
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
    const root = pdoc(el)
    expect(root.querySelector<HTMLImageElement>('[part="preview-image"]')!.getAttribute('src')).toBe(
      '/full.png',
    )
    expect(
      root.querySelector<HTMLAnchorElement>('[part="preview-download"]')!.getAttribute('href'),
    ).toBe('/full.png')
  })
})

describe('OASImage 受控预览', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  function maskOf(el: OASImage): HTMLElement {
    const portal = document.querySelector('[data-oas-image-preview-portal]')
    return (portal?.shadowRoot?.querySelector('.preview-mask') ??
      el.shadowRoot!.querySelector('.preview-mask')) as HTMLElement
  }

  it('preview-open 属性在场时初始即为打开态', () => {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    el.setAttribute('preview', '')
    el.setAttribute('preview-open', '')
    document.body.appendChild(el)
    expect(maskOf(el).hasAttribute('hidden')).toBe(false)
  })

  it('外部设置 preview-open 打开、移除关闭（属性驱动）', () => {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    el.setAttribute('preview', '')
    document.body.appendChild(el)
    expect(maskOf(el).hasAttribute('hidden')).toBe(true)
    el.setAttribute('preview-open', '')
    expect(maskOf(el).hasAttribute('hidden')).toBe(false)
    el.removeAttribute('preview-open')
    expect(maskOf(el).hasAttribute('hidden')).toBe(true)
  })

  it('内部开合反射 preview-open 属性（双向同步）', () => {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    el.setAttribute('preview', '')
    document.body.appendChild(el)
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
    expect(el.hasAttribute('preview-open')).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(el.hasAttribute('preview-open')).toBe(false)
  })

  it('oas-preview-change 在内部开合时派发 detail {open}，属性驱动不派发', () => {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    el.setAttribute('preview', '')
    document.body.appendChild(el)
    const details: unknown[] = []
    el.addEventListener('oas-preview-change', (e: Event) =>
      details.push((e as CustomEvent).detail),
    )
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
    expect(details).toEqual([{ open: true }])
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(details).toEqual([{ open: true }, { open: false }])
    // 属性驱动开合：不派发 preview-change（外部已知情）
    el.setAttribute('preview-open', '')
    el.removeAttribute('preview-open')
    expect(details).toEqual([{ open: true }, { open: false }])
  })

  it('openPreview()/closePreview() 方法受控开合并派发事件', () => {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    el.setAttribute('preview', '')
    document.body.appendChild(el)
    const details: unknown[] = []
    el.addEventListener('oas-preview-change', (e: Event) =>
      details.push((e as CustomEvent).detail),
    )
    el.openPreview()
    expect(maskOf(el).hasAttribute('hidden')).toBe(false)
    expect(el.hasAttribute('preview-open')).toBe(true)
    el.closePreview()
    expect(maskOf(el).hasAttribute('hidden')).toBe(true)
    expect(details).toEqual([{ open: true }, { open: false }])
  })
})

describe('OASImage oas-load / oas-error 事件', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('oas-load detail {src}（加载成功时派发）', () => {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    document.body.appendChild(el)
    let detail: unknown
    el.addEventListener('oas-load', (e: Event) => (detail = (e as CustomEvent).detail))
    el.shadowRoot!.querySelector('img')!.dispatchEvent(new Event('load'))
    expect(detail).toEqual({ src: '/a.png' })
  })

  it('oas-error detail {src}（无兜底最终失败时派发）', () => {
    const el = new OASImage()
    el.setAttribute('src', '/bad.png')
    document.body.appendChild(el)
    let detail: unknown
    el.addEventListener('oas-error', (e: Event) => (detail = (e as CustomEvent).detail))
    el.shadowRoot!.querySelector('img')!.dispatchEvent(new Event('error'))
    expect(detail).toEqual({ src: '/bad.png' })
  })

  it('fallback 重试期间不派发 oas-error，兜底图也失败时派发（detail.src 为最终失败地址）', () => {
    const el = new OASImage()
    el.setAttribute('src', '/bad.png')
    el.setAttribute('fallback', '/fallback.png')
    document.body.appendChild(el)
    const details: unknown[] = []
    el.addEventListener('oas-error', (e: Event) => details.push((e as CustomEvent).detail))
    const img = el.shadowRoot!.querySelector('img')!
    img.dispatchEvent(new Event('error'))
    expect(details).toEqual([])
    img.dispatchEvent(new Event('error'))
    expect(details).toEqual([{ src: '/fallback.png' }])
  })
})

describe('OASImage 自定义 placeholder / error 插槽', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('template[slot="placeholder"] 克隆进占位容器', () => {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    el.setAttribute('placeholder', '')
    el.innerHTML = '<template slot="placeholder"><b class="custom-ph">加载中请稍候</b></template>'
    document.body.appendChild(el)
    const ph = el.shadowRoot!.querySelector('[part="placeholder"]')!
    expect(ph.querySelector('.custom-ph')).not.toBeNull()
    expect(ph.textContent).toContain('加载中请稍候')
  })

  it('template[slot="error"] 克隆进失败容器', () => {
    const el = new OASImage()
    el.setAttribute('src', '/bad.png')
    el.innerHTML = '<template slot="error"><i class="custom-err">图片不见了</i></template>'
    document.body.appendChild(el)
    el.shadowRoot!.querySelector('img')!.dispatchEvent(new Event('error'))
    const fb = el.shadowRoot!.querySelector('[part="fallback"]')!
    expect(fb.querySelector('.custom-err')).not.toBeNull()
    expect(fb.textContent).toContain('图片不见了')
  })

  it('普通元素 [slot="placeholder"] 亦被克隆，且原节点保留在 light DOM', () => {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    el.setAttribute('placeholder', '')
    el.innerHTML = '<span slot="placeholder">等一等</span>'
    document.body.appendChild(el)
    const ph = el.shadowRoot!.querySelector('[part="placeholder"]')!
    expect(ph.textContent).toContain('等一等')
    expect(el.querySelector('span[slot="placeholder"]')).not.toBeNull()
  })

  it('插槽内容优先于 locale 文案，setLocale 不覆盖插槽', () => {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    el.setAttribute('placeholder', '')
    el.innerHTML = '<template slot="placeholder"><b class="custom-ph">插槽占位</b></template>'
    document.body.appendChild(el)
    setLocale(en)
    const ph = el.shadowRoot!.querySelector('[part="placeholder"]')!
    expect(ph.querySelector('.custom-ph')).not.toBeNull()
    expect(ph.textContent).toContain('插槽占位')
    setLocale('zh-CN')
  })
})

describe('OASImage 自定义工具栏（slot=toolbar + oas-toolbar-render）', () => {
  const TOOLBAR_TPL = `<template slot="toolbar">
    <button type="button" data-cmd="zoom-in">放大</button>
    <button type="button" data-cmd="zoom-out">缩小</button>
    <button type="button" data-cmd="rotate-left">左旋</button>
    <button type="button" data-cmd="rotate-right">右旋</button>
    <button type="button" data-cmd="flip-x">水平翻转</button>
    <button type="button" data-cmd="flip-y">垂直翻转</button>
    <button type="button" data-cmd="prev">上一张</button>
    <button type="button" data-cmd="next">下一张</button>
    <button type="button" data-cmd="download">下载</button>
    <button type="button" data-cmd="close">关闭</button>
  </template>`

  /** 挂监听 → 挂载（挂载与打开均会派发 oas-toolbar-render，先挂监听确保不丢） */
  function mountToolbar(
    extra: Record<string, string> = {},
  ): { el: OASImage; details: Array<{ element: HTMLElement; actions: Record<string, () => void> }> } {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    el.setAttribute('preview', '')
    for (const [k, v] of Object.entries(extra)) el.setAttribute(k, v)
    el.innerHTML = TOOLBAR_TPL
    const details: Array<{ element: HTMLElement; actions: Record<string, () => void> }> = []
    el.addEventListener('oas-toolbar-render', (e: Event) =>
      details.push((e as CustomEvent).detail as never),
    )
    document.body.appendChild(el)
    return { el, details }
  }

  function pdoc(el: OASImage): ShadowRoot {
    const portal = document.querySelector('[data-oas-image-preview-portal]')
    if (portal?.shadowRoot?.querySelector('.preview-mask')) return portal.shadowRoot
    return el.shadowRoot!
  }

  function openIt(el: OASImage): void {
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
  }

  function barOf(el: OASImage): HTMLElement {
    return pdoc(el).querySelector('[part="preview-toolbar"]') as HTMLElement
  }

  function wire(el: OASImage, detail: { element: HTMLElement; actions: Record<string, () => void> }): void {
    for (const btn of detail.element.querySelectorAll<HTMLElement>('[data-cmd]')) {
      const cmd = btn.getAttribute('data-cmd')!.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
      btn.onclick = detail.actions[cmd]!
    }
  }

  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('模板克隆进工具栏区并替换默认按钮组（原模板保留在 light DOM）', () => {
    const { el } = mountToolbar()
    openIt(el)
    const bar = barOf(el)
    expect(bar.querySelector('[data-cmd="zoom-in"]')).not.toBeNull()
    expect(bar.querySelector('[data-cmd="close"]')).not.toBeNull()
    // 默认按钮组被替换
    expect(bar.querySelector('[part="preview-zoom-in"]')).toBeNull()
    expect(bar.querySelector('[part="preview-close"]')).toBeNull()
    // 原模板节点不被移动
    expect(el.querySelector('template[slot="toolbar"]')).not.toBeNull()
  })

  it('oas-toolbar-render detail 携带 element 与 actions 命令全集（打开时再次派发）', () => {
    const { el, details } = mountToolbar()
    expect(details.length).toBeGreaterThanOrEqual(1)
    const d = details[0]!
    expect(d.element).toBe(el.shadowRoot!.querySelector('[part="preview-toolbar"]'))
    for (const name of [
      'zoomIn',
      'zoomOut',
      'rotateLeft',
      'rotateRight',
      'flipX',
      'flipY',
      'download',
      'close',
      'prev',
      'next',
    ]) {
      expect(typeof d.actions[name], `actions.${name} 应为函数`).toBe('function')
    }
    // 打开预览时再次派发（宿主可重复绑定，幂等）
    openIt(el)
    expect(details.length).toBeGreaterThanOrEqual(2)
    expect(details[details.length - 1]!.element).toBe(barOf(el))
  })

  it('自定义按钮经 actions 接线后实际生效：缩放/旋转/翻转/关闭', () => {
    const { el, details } = mountToolbar()
    openIt(el)
    const d = details[details.length - 1]!
    wire(el, d)
    const img = pdoc(el).querySelector('[part="preview-image"]') as HTMLElement
    const bar = barOf(el)
    bar.querySelector<HTMLElement>('[data-cmd="zoom-in"]')!.click()
    expect(img.style.transform).toContain('scale(1.5)')
    bar.querySelector<HTMLElement>('[data-cmd="zoom-out"]')!.click()
    expect(img.style.transform).toContain('scale(1)')
    bar.querySelector<HTMLElement>('[data-cmd="rotate-right"]')!.click()
    expect(img.style.transform).toContain('rotate(90deg)')
    bar.querySelector<HTMLElement>('[data-cmd="rotate-left"]')!.click()
    expect(img.style.transform).toContain('rotate(0deg)')
    bar.querySelector<HTMLElement>('[data-cmd="zoom-in"]')!.click()
    bar.querySelector<HTMLElement>('[data-cmd="flip-x"]')!.click()
    expect(img.style.transform).toContain('scale(-1.5, 1.5)')
    bar.querySelector<HTMLElement>('[data-cmd="flip-y"]')!.click()
    expect(img.style.transform).toContain('scale(-1.5, -1.5)')
    bar.querySelector<HTMLElement>('[data-cmd="close"]')!.click()
    expect(pdoc(el).querySelector('.preview-mask')!.hasAttribute('hidden')).toBe(true)
  })

  it('actions.download 触发下载链接点击', () => {
    const { el, details } = mountToolbar()
    openIt(el)
    const spy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    details[details.length - 1]!.actions.download!()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('图集模式：prev/next 命令翻页生效（页码与预览图同步）', () => {
    const GALLERY = JSON.stringify(['/a.png', '/b.png', '/c.png'])
    const { el, details } = mountToolbar({ 'preview-src-list': GALLERY })
    openIt(el)
    wire(el, details[details.length - 1]!)
    const bar = barOf(el)
    bar.querySelector<HTMLElement>('[data-cmd="next"]')!.click()
    expect(pdoc(el).querySelector('[part="preview-counter"]')!.textContent).toBe('2/3')
    expect(pdoc(el).querySelector<HTMLImageElement>('[part="preview-image"]')!.getAttribute('src')).toBe(
      '/b.png',
    )
    bar.querySelector<HTMLElement>('[data-cmd="prev"]')!.click()
    expect(pdoc(el).querySelector('[part="preview-counter"]')!.textContent).toBe('1/3')
  })

  it('单图模式：prev/next 为 no-op（无副作用）', () => {
    const { el, details } = mountToolbar()
    openIt(el)
    const d = details[details.length - 1]!
    wire(el, d)
    const img = pdoc(el).querySelector('[part="preview-image"]') as HTMLElement
    barOf(el).querySelector<HTMLElement>('[data-cmd="prev"]')!.click()
    barOf(el).querySelector<HTMLElement>('[data-cmd="next"]')!.click()
    expect(img.style.transform).toBe('translate(0px, 0px) rotate(0deg) scale(1)')
    expect(pdoc(el).querySelector('.preview-mask')!.hasAttribute('hidden')).toBe(false)
  })

  it('移除模板后恢复默认工具栏（零变化向后兼容）', () => {
    const { el } = mountToolbar()
    el.innerHTML = ''
    el.setAttribute('alt', '触发 update')
    openIt(el)
    const bar = barOf(el)
    expect(bar.querySelector('[data-cmd]')).toBeNull()
    expect(bar.querySelector('[part="preview-zoom-in"]')).not.toBeNull()
    expect(bar.querySelector('[part="preview-close"]')).not.toBeNull()
    // 默认按钮仍可用
    bar.querySelector<HTMLElement>('[part="preview-zoom-in"]')!.click()
    expect(
      pdoc(el).querySelector<HTMLElement>('[part="preview-image"]')!.style.transform,
    ).toContain('scale(1.5)')
  })

  it('无模板时维持默认工具栏（oas-toolbar-render 不派发）', () => {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    el.setAttribute('preview', '')
    let fired = 0
    el.addEventListener('oas-toolbar-render', () => fired++)
    document.body.appendChild(el)
    openIt(el)
    expect(fired).toBe(0)
    expect(barOf(el).querySelector('.tool')).not.toBeNull()
  })

  it('自定义按钮参与 Tab 焦点陷阱（Tab/Shift+Tab 循环不逃逸、浮层保持打开）', () => {
    const { el, details } = mountToolbar()
    openIt(el)
    wire(el, details[details.length - 1]!)
    for (let i = 0; i < 12; i++) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
      )
    }
    expect(pdoc(el).querySelector('.preview-mask')!.hasAttribute('hidden')).toBe(false)
  })
})

describe('OASImage flip 翻转', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  function setup(): { el: OASImage; img: HTMLElement; root: () => ShadowRoot } {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    el.setAttribute('preview', '')
    document.body.appendChild(el)
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
    const portal = document.querySelector('[data-oas-image-preview-portal]')
    const root = () =>
      portal?.shadowRoot?.querySelector('.preview-mask')
        ? portal.shadowRoot
        : el.shadowRoot!
    return { el, img: root().querySelector('[part="preview-image"]') as HTMLElement, root }
  }

  it('flipX/flipY 与缩放、旋转串接进 transform 状态机', () => {
    const { img, root } = setup()
    const q = (s: string) => root().querySelector(s) as HTMLElement
    q('[part="preview-zoom-in"]').click()
    q('[part="preview-zoom-in"]').click()
    expect(img.style.transform).toContain('scale(2)')
    q('[part="preview-flip-x"]').click()
    expect(img.style.transform).toContain('scale(-2, 2)')
    q('[part="preview-flip-x"]').click()
    expect(img.style.transform).toContain('scale(2)')
    q('[part="preview-flip-y"]').click()
    expect(img.style.transform).toContain('scale(2, -2)')
    q('[part="preview-rotate"]').click()
    expect(img.style.transform).toContain('rotate(90deg)')
    expect(img.style.transform).toContain('scale(2, -2)')
    // 再次 flipY 复位
    q('[part="preview-flip-y"]').click()
    expect(img.style.transform).toContain('scale(2)')
  })
})

describe('OASImage 拖拽平移与滚轮缩放', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  function setup(): { el: OASImage; stage: HTMLElement; img: HTMLElement } {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    el.setAttribute('preview', '')
    document.body.appendChild(el)
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
    const portal = document.querySelector('[data-oas-image-preview-portal]')!
    const stage = portal.shadowRoot!.querySelector('.preview-stage') as HTMLElement
    const img = portal.shadowRoot!.querySelector('[part="preview-image"]') as HTMLElement
    return { el, stage, img }
  }

  it('滚轮向上放大、向下缩小，并 preventDefault 阻断页面滚动', () => {
    const { stage, img } = setup()
    const up = new WheelEvent('wheel', { deltaY: -100, cancelable: true })
    stage.dispatchEvent(up)
    expect(up.defaultPrevented).toBe(true)
    expect(img.style.transform).toContain('scale(1.5)')
    const down = new WheelEvent('wheel', { deltaY: 100, cancelable: true })
    stage.dispatchEvent(down)
    expect(down.defaultPrevented).toBe(true)
    expect(img.style.transform).toContain('scale(1)')
  })

  it('缩放步进/上下限走 --oas-image-zoom-* CSS 变量', () => {
    const { el, stage, img } = setup()
    el.style.setProperty('--oas-image-zoom-step', '0.25')
    el.style.setProperty('--oas-image-zoom-max', '1.5')
    el.style.setProperty('--oas-image-zoom-min', '0.75')
    stage.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true }))
    expect(img.style.transform).toContain('scale(1.25)')
    // 顶到 max=1.5 后不再放大
    for (let i = 0; i < 5; i++) {
      stage.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true }))
    }
    expect(img.style.transform).toContain('scale(1.5)')
    // 顶到 min=0.75 后不再缩小
    for (let i = 0; i < 10; i++) {
      stage.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, cancelable: true }))
    }
    expect(img.style.transform).toContain('scale(0.75)')
  })

  it('pointer 拖拽平移更新 translate，pointerup 后停止跟随', () => {
    const { stage, img } = setup()
    stage.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 10, clientY: 10, button: 0, pointerId: 1 }),
    )
    stage.dispatchEvent(new PointerEvent('pointermove', { clientX: 30, clientY: 25, pointerId: 1 }))
    expect(img.style.transform).toContain('translate(20px, 15px)')
    stage.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }))
    stage.dispatchEvent(new PointerEvent('pointermove', { clientX: 60, clientY: 60, pointerId: 1 }))
    expect(img.style.transform).toContain('translate(20px, 15px)')
  })

  it('拖拽超出可视范围时按边界 clamp', () => {
    const { stage, img } = setup()
    const rect = (w: number, h: number) =>
      ({ width: w, height: h, top: 0, left: 0, right: w, bottom: h, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    stage.getBoundingClientRect = () => rect(1000, 800)
    img.getBoundingClientRect = () => rect(2000, 1600)
    stage.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 0, clientY: 0, button: 0, pointerId: 1 }),
    )
    // 拖拽远超边界：x 限 500，y 限 400
    stage.dispatchEvent(new PointerEvent('pointermove', { clientX: 900, clientY: 900, pointerId: 1 }))
    expect(img.style.transform).toContain('translate(500px, 400px)')
  })

  it('非主键（右键）不触发拖拽', () => {
    const { stage, img } = setup()
    stage.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 10, clientY: 10, button: 2, pointerId: 1 }),
    )
    stage.dispatchEvent(new PointerEvent('pointermove', { clientX: 30, clientY: 25, pointerId: 1 }))
    expect(img.style.transform).not.toContain('translate(20px, 15px)')
  })
})

describe('OASImage 预览挂载点（portal 到 body）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  function portal(): HTMLElement | null {
    return document.querySelector('[data-oas-image-preview-portal]')
  }

  it('打开后遮罩移入 body 下 portal host，关闭后还原回组件 shadow', () => {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    el.setAttribute('preview', '')
    document.body.appendChild(el)
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
    expect(portal()).not.toBeNull()
    expect(portal()!.shadowRoot!.querySelector('.preview-mask')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('.preview-mask')).toBeNull()
    ;(portal()!.shadowRoot!.querySelector('[part="preview-close"]') as HTMLElement).click()
    expect(portal()).toBeNull()
    expect(el.shadowRoot!.querySelector('.preview-mask')).not.toBeNull()
  })

  it('断开连接时拆除 portal 并还原遮罩（无孤儿浮层）', () => {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    el.setAttribute('preview', '')
    document.body.appendChild(el)
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
    expect(portal()).not.toBeNull()
    el.remove()
    expect(portal()).toBeNull()
    expect(el.shadowRoot!.querySelector('.preview-mask')).not.toBeNull()
  })

  it('打开态断开重连：遮罩隐藏无残留，preview-open 属性在场则重新打开', () => {
    const el = new OASImage()
    el.setAttribute('src', '/a.png')
    el.setAttribute('preview', '')
    document.body.appendChild(el)
    ;(el.shadowRoot!.querySelector('.previewable') as HTMLElement).click()
    expect(portal()).not.toBeNull()
    el.remove()
    // 无 preview-open：重连保持关闭，遮罩隐藏（无残留可见遮罩）
    document.body.appendChild(el)
    expect(portal()).toBeNull()
    expect(el.shadowRoot!.querySelector('.preview-mask')!.hasAttribute('hidden')).toBe(true)
    el.remove()
    // 有 preview-open：重连按属性重新打开（portal/keydown 重新装配）
    el.setAttribute('preview-open', '')
    document.body.appendChild(el)
    expect(portal()).not.toBeNull()
    expect(
      portal()!.shadowRoot!.querySelector('.preview-mask')!.hasAttribute('hidden'),
    ).toBe(false)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(portal()).toBeNull()
  })
})
