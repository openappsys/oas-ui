import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASAvatar } from './index.js'

describe('OASAvatar', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
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
})
