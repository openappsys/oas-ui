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
})
