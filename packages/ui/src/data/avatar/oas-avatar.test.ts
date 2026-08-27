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

  it('text 属性驱动首字符（响应式：宿主运行时改 text 亦刷新）', () => {
    const el = new OASAvatar()
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="text"]')!.textContent).toBe('?')
    el.setAttribute('text', '李') // 运行时改 → attributeChangedCallback 触发重渲染
    expect(el.shadowRoot!.querySelector('[part="text"]')!.textContent).toBe('李')
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

  it('alt 加入观察列表：动态修改立即生效', () => {
    const el = new OASAvatar()
    el.setAttribute('src', '/avatar.png')
    document.body.appendChild(el)
    const img = el.shadowRoot!.querySelector<HTMLImageElement>('img')!
    el.setAttribute('alt', '新头像')
    expect(img.getAttribute('alt')).toBe('新头像')
  })
})

describe('OASAvatar badge（徽标叠加）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  function badge(el: OASAvatar): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>('[part="badge"]')!
  }

  it('badge 文本徽标：显示在头像上，文本真实可见（非 aria-hidden，屏幕阅读器可读）', () => {
    const el = new OASAvatar()
    el.textContent = '张'
    el.setAttribute('badge', '99+')
    document.body.appendChild(el)
    expect(badge(el).hidden).toBe(false)
    expect(badge(el).textContent).toBe('99+')
    expect(badge(el).hasAttribute('aria-hidden')).toBe(false)
  })

  it('无 badge 属性时徽标隐藏', () => {
    const el = new OASAvatar()
    document.body.appendChild(el)
    expect(badge(el).hidden).toBe(true)
  })

  it('badge 布尔形式（空值）显示小圆点', () => {
    const el = new OASAvatar()
    el.setAttribute('badge', '')
    document.body.appendChild(el)
    expect(badge(el).hidden).toBe(false)
    expect(badge(el).classList.contains('dot')).toBe(true)
    expect(badge(el).textContent).toBe('')
  })

  it('badge-dot 显示小圆点且无文本（优先级高于 badge 文本）', () => {
    const el = new OASAvatar()
    el.setAttribute('badge-dot', '')
    el.setAttribute('badge', '5')
    document.body.appendChild(el)
    expect(badge(el).hidden).toBe(false)
    expect(badge(el).classList.contains('dot')).toBe(true)
    expect(badge(el).textContent).toBe('')
  })

  it('dot 与文本互切：dot 残留的内联 width/padding 不泄漏到文本模式', () => {
    const el = new OASAvatar()
    el.setAttribute('badge-dot', '')
    document.body.appendChild(el)
    expect(badge(el).classList.contains('dot')).toBe(true)
    el.removeAttribute('badge-dot')
    el.setAttribute('badge', '5')
    expect(badge(el).classList.contains('dot')).toBe(false)
    expect(badge(el).textContent).toBe('5')
    expect(badge(el).style.width).toBe('')
    expect(badge(el).style.padding).toBe('')
  })

  it('badge-color 映射语义 class，默认 danger', () => {
    const el = new OASAvatar()
    el.setAttribute('badge', '5')
    document.body.appendChild(el)
    expect(badge(el).classList.contains('color-danger')).toBe(true)
    el.setAttribute('badge-color', 'success')
    expect(badge(el).classList.contains('color-success')).toBe(true)
    expect(badge(el).classList.contains('color-danger')).toBe(false)
    el.setAttribute('badge-color', 'primary')
    expect(badge(el).classList.contains('color-primary')).toBe(true)
    el.setAttribute('badge-color', 'warning')
    expect(badge(el).classList.contains('color-warning')).toBe(true)
    expect(badge(el).classList.contains('color-danger')).toBe(false)
  })

  it('badge-placement 默认 top-right，可切 bottom-right', () => {
    const el = new OASAvatar()
    el.setAttribute('badge', '5')
    document.body.appendChild(el)
    expect(badge(el).classList.contains('placement-top-right')).toBe(true)
    expect(badge(el).classList.contains('placement-bottom-right')).toBe(false)
    el.setAttribute('badge-placement', 'bottom-right')
    expect(badge(el).classList.contains('placement-bottom-right')).toBe(true)
    expect(badge(el).classList.contains('placement-top-right')).toBe(false)
  })

  it('徽标尺寸随头像 size 缩放（32 → 16px，48 → 22px）', () => {
    const el = new OASAvatar()
    el.setAttribute('badge', '5')
    document.body.appendChild(el)
    expect(badge(el).style.height).toBe('16px')
    el.setAttribute('size', '48')
    expect(badge(el).style.height).toBe('22px')
  })

  it('图片头像同样支持徽标', () => {
    const el = new OASAvatar()
    el.setAttribute('src', '/avatar.png')
    el.setAttribute('badge', '7')
    document.body.appendChild(el)
    expect(badge(el).hidden).toBe(false)
    expect(badge(el).textContent).toBe('7')
  })
})

describe('OASAvatar fallback（加载失败回退）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  function img(el: OASAvatar): HTMLImageElement {
    return el.shadowRoot!.querySelector<HTMLImageElement>('img')!
  }

  function fb(el: OASAvatar): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>('[part="fallback"]')!
  }

  it('图片加载失败回退到内容首字符', () => {
    const el = new OASAvatar()
    el.textContent = '张'
    el.setAttribute('src', '/missing.png')
    document.body.appendChild(el)
    img(el).dispatchEvent(new Event('error'))
    expect(img(el).hidden).toBe(true)
    expect(fb(el).hidden).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="text"]')!.textContent).toBe('张')
  })

  it('加载失败且无内容时显示 ? 占位', () => {
    const el = new OASAvatar()
    el.setAttribute('src', '/missing.png')
    document.body.appendChild(el)
    img(el).dispatchEvent(new Event('error'))
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="text"]')!.textContent).toBe('?')
  })

  it('fallback 命名插槽内容在失败时显示，首字符隐藏', () => {
    const el = new OASAvatar()
    el.innerHTML = '<span slot="fallback">!</span>'
    el.setAttribute('src', '/missing.png')
    document.body.appendChild(el)
    img(el).dispatchEvent(new Event('error'))
    expect(fb(el).hidden).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="text"]')!.hidden).toBe(true)
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="fallback"]')!
    expect(slot.assignedNodes().length).toBeGreaterThan(0)
  })

  it('失败状态保持：其他属性变化不恢复图片', () => {
    const el = new OASAvatar()
    el.setAttribute('src', '/missing.png')
    document.body.appendChild(el)
    img(el).dispatchEvent(new Event('error'))
    el.setAttribute('badge', '5')
    expect(img(el).hidden).toBe(true)
    expect(fb(el).hidden).toBe(false)
  })

  it('更换 src 重置失败状态并重新尝试加载', () => {
    const el = new OASAvatar()
    el.setAttribute('src', '/missing.png')
    document.body.appendChild(el)
    img(el).dispatchEvent(new Event('error'))
    expect(img(el).hidden).toBe(true)
    el.setAttribute('src', '/ok.png')
    expect(img(el).hidden).toBe(false)
    expect(img(el).getAttribute('src')).toBe('/ok.png')
  })

  it('移除 src 后回退到文本占位', () => {
    const el = new OASAvatar()
    el.textContent = '李'
    el.setAttribute('src', '/missing.png')
    document.body.appendChild(el)
    img(el).dispatchEvent(new Event('error'))
    el.removeAttribute('src')
    expect(fb(el).hidden).toBe(false)
    expect(img(el).hidden).toBe(true)
  })

  it('动态补设 src 后渲染图片（模板常驻 img 骨架）', () => {
    const el = new OASAvatar()
    el.textContent = '王'
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('img')).not.toBeNull()
    expect(img(el).hidden).toBe(true)
    el.setAttribute('src', '/new.png')
    expect(img(el).hidden).toBe(false)
    expect(img(el).getAttribute('src')).toBe('/new.png')
  })

  it('DSD 真水合：快照含 img 与 fallback 容器时接管成功', () => {
    const ref = new OASAvatar()
    ref.setAttribute('src', '/a.png')
    document.body.appendChild(ref)
    const snap = ref.shadowRoot!.innerHTML
    ref.remove()

    const el = new OASAvatar()
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-avatar" data-oas-ssr-v="1">${snap}`
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(el.shadowRoot!.querySelector('img')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="fallback"]')).not.toBeNull()
  })
})
