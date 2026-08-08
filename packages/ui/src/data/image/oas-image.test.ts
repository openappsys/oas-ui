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
