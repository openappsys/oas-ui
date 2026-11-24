import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASProductCard } from './index.js'
import { parseImageRatio } from './oas-product-card.js'

function mount(attrs: Record<string, string> = {}): OASProductCard {
  const el = new OASProductCard()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function q(el: OASProductCard, part: string): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>(`[part="${part}"]`)
}

describe('oas-product-card', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染标题 / 价格 / 划线价，价格件透传 currency / precision / locale', () => {
    const el = mount({
      title: '轻量羽绒服',
      price: '399',
      'original-price': '599',
      currency: 'USD',
      locale: 'en-US',
      precision: '1',
    })
    expect(q(el, 'title')!.textContent).toBe('轻量羽绒服')
    const price = q(el, 'price')!
    expect(price.hidden).toBe(false)
    expect(price.getAttribute('value')).toBe('399')
    expect(price.getAttribute('original')).toBe('599')
    expect(price.getAttribute('currency')).toBe('USD')
    expect(price.getAttribute('precision')).toBe('1')
    expect(price.getAttribute('locale')).toBe('en-US')
  })

  it('价格缺省时价格区隐藏；标题缺省时标题隐藏', () => {
    const el = mount({})
    expect(q(el, 'price')!.hidden).toBe(true)
    expect(q(el, 'title')!.hidden).toBe(true)
    expect(q(el, 'title')!.textContent).toBe('')
  })

  it('图片比例：image-ratio 落到内联 aspect-ratio，缺省 1，非法值回落 1 并告警一次', () => {
    const el = mount({ image: 'https://example.test/a.png', 'image-ratio': '16:9' })
    expect(q(el, 'media')!.style.aspectRatio).toBe('16 / 9')

    el.setAttribute('image-ratio', '4/3')
    expect(q(el, 'media')!.style.aspectRatio).toBe('4 / 3')

    el.removeAttribute('image-ratio')
    expect(q(el, 'media')!.style.aspectRatio).toBe('1 / 1')

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      el.setAttribute('image-ratio', 'wide')
      el.setAttribute('image-ratio', 'wider')
      const hits = warn.mock.calls.filter((call) => String(call[0]).includes('image-ratio'))
      expect(hits).toHaveLength(1)
      expect(q(el, 'media')!.style.aspectRatio).toBe('1 / 1')
    } finally {
      warn.mockRestore()
    }
  })

  it('比例解析纯函数：冒号 / 斜杠 / 单数字 / 非法', () => {
    expect(parseImageRatio('16:9')).toBe('16 / 9')
    expect(parseImageRatio('4/3')).toBe('4 / 3')
    expect(parseImageRatio('1.5')).toBe('1.5 / 1')
    expect(parseImageRatio(' 2 : 1 ')).toBe('2 / 1')
    expect(parseImageRatio('0:1')).toBeNull()
    expect(parseImageRatio('16:')).toBeNull()
    expect(parseImageRatio('wide')).toBeNull()
    expect(parseImageRatio('')).toBeNull()
  })

  it('缺图渲染虚线占位框并带 i18n 无障碍名；有图时隐藏占位', () => {
    const el = mount({ title: '羽绒服' })
    const media = q(el, 'media')!
    expect(media.getAttribute('data-empty')).toBe('true')
    expect(q(el, 'placeholder')!.hidden).toBe(false)
    // 占位框无可见文字（避免落在 bg-hover 上低于 AA），无障碍名走 aria-label
    expect(q(el, 'placeholder')!.textContent).toBe('')
    expect(q(el, 'placeholder')!.getAttribute('aria-label')).toBe('暂无图片')
    expect(q(el, 'placeholder')!.getAttribute('role')).toBe('img')
    expect(q(el, 'image')!.hidden).toBe(true)

    el.setAttribute('image', 'https://example.test/a.png')
    expect(q(el, 'media')!.getAttribute('data-empty')).toBe('false')
    expect(q(el, 'placeholder')!.hidden).toBe(true)
    expect(q(el, 'image')!.hidden).toBe(false)
  })

  it('图片加载失败回落占位，且后续属性更新不把占位闪回原图', () => {
    const el = mount({ image: 'https://example.test/broken.png', title: '羽绒服' })
    const img = q(el, 'image') as HTMLImageElement
    img.dispatchEvent(new Event('error'))
    expect(img.hidden).toBe(true)
    expect(q(el, 'media')!.getAttribute('data-empty')).toBe('true')
    expect(q(el, 'placeholder')!.hidden).toBe(false)

    el.setAttribute('price', '99')
    expect(q(el, 'media')!.getAttribute('data-empty')).toBe('true')

    // 换一张图则重新尝试
    el.setAttribute('image', 'https://example.test/ok.png')
    expect(q(el, 'media')!.getAttribute('data-empty')).toBe('false')
    expect(q(el, 'image')!.hidden).toBe(false)
  })

  it('图片 alt 取标题（可访问名）', () => {
    const el = mount({ image: 'https://example.test/a.png', title: '轻量羽绒服' })
    expect(q(el, 'image')!.getAttribute('alt')).toBe('轻量羽绒服')
    el.setAttribute('title', '夏季短袖')
    expect(q(el, 'image')!.getAttribute('alt')).toBe('夏季短袖')
  })

  it('插槽：tags / promo / actions 有内容才展开（空插槽不占间距）', () => {
    const el = mount({ title: '羽绒服' })
    expect(q(el, 'tags')!.hidden).toBe(true)
    expect(q(el, 'promo')!.hidden).toBe(true)
    expect(q(el, 'actions')!.hidden).toBe(true)

    const tag = document.createElement('oas-tag')
    tag.slot = 'tags'
    tag.textContent = '自营'
    const promo = document.createElement('span')
    promo.slot = 'promo'
    promo.textContent = '满 300 减 50'
    const btn = document.createElement('button')
    btn.slot = 'actions'
    btn.textContent = '加入购物车'
    el.append(tag, promo, btn)

    expect(q(el, 'tags')!.hidden).toBe(false)
    expect(q(el, 'promo')!.hidden).toBe(false)
    expect(q(el, 'actions')!.hidden).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="tags"]')!.assignedNodes()).toContain(tag)
  })

  it('layout：横向 / 纵向属性通道，非法值回落 vertical 并告警一次', () => {
    const el = mount({ layout: 'horizontal' })
    expect(el.getAttribute('layout')).toBe('horizontal')

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const bad = mount({ layout: 'grid' })
      expect(bad.getAttribute('layout')).toBe('grid')
      const hits = warn.mock.calls.filter((call) => String(call[0]).includes('layout'))
      expect(hits).toHaveLength(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('标题两行截断的样式契约（-webkit-line-clamp: 2 + 完整文本仍在 DOM）', () => {
    const el = mount({ title: '这是一段很长的商品标题用于验证两行截断之后仍保留完整文本' })
    const title = q(el, 'title')!
    expect(title.textContent).toBe('这是一段很长的商品标题用于验证两行截断之后仍保留完整文本')
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toContain('-webkit-line-clamp: 2')
    expect(css).toContain('overflow: hidden')
  })
})
