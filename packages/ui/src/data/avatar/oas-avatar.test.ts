import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASAvatar } from './index.js'

describe('OASAvatar', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('无 src 时显示文字首字符', () => {
    const el = new OASAvatar()
    el.textContent = '张三'
    document.body.appendChild(el)
    expect(el.shadowRoot!.textContent).toContain('张')
  })

  it('src 时渲染图片', () => {
    const el = new OASAvatar()
    el.setAttribute('src', '/avatar.png')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('img')).not.toBeNull()
  })

  it('size 属性生效', () => {
    const el = new OASAvatar()
    el.setAttribute('size', '40')
    document.body.appendChild(el)
    expect(el.style.width).toBe('40px')
  })

  it('locale：默认 alt 随 setLocale 切换，alt 属性优先', () => {
    const el = new OASAvatar()
    el.setAttribute('src', '/avatar.png')
    document.body.appendChild(el)
    const img = el.shadowRoot!.querySelector<HTMLImageElement>('img')!
    expect(img.getAttribute('alt')).toBe('头像')

    setLocale(en)
    expect(img.getAttribute('alt')).toBe('Avatar')

    setLocale('zh-CN')
    expect(img.getAttribute('alt')).toBe('头像')
  })
})
