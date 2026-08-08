import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASImage } from './index.js'

describe('OASImage', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
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
})
