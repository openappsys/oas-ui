import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASEmpty } from './index.js'

describe('OASEmpty', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染默认描述文案', () => {
    const el = new OASEmpty()
    document.body.appendChild(el)
    expect(el.shadowRoot!.textContent).toContain('暂无数据')
  })

  it('description 属性自定义文案', () => {
    const el = new OASEmpty()
    el.setAttribute('description', '没有更多了')
    document.body.appendChild(el)
    expect(el.shadowRoot!.textContent).toContain('没有更多了')
  })

  it('渲染原创插画区域', () => {
    const el = new OASEmpty()
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="image"]')).not.toBeNull()
  })

  it('illustration 属性（SVG 标记）替换默认插画', () => {
    const el = new OASEmpty()
    el.setAttribute('illustration', '<svg id="custom"><circle r="10"/></svg>')
    document.body.appendChild(el)
    const content = el.shadowRoot!.querySelector<HTMLElement>('[part="illustration"]')!
    expect(content.querySelector('#custom')).not.toBeNull()
    expect(content.querySelector('rect')).toBeNull()
    expect(content.getAttribute('data-default')).toBeNull()
  })

  it('illustration 属性（图片 URL）渲染 img', () => {
    const el = new OASEmpty()
    el.setAttribute('illustration', 'https://example.com/empty.png')
    document.body.appendChild(el)
    const img = el.shadowRoot!.querySelector<HTMLImageElement>('[part="illustration"] img')!
    expect(img.getAttribute('src')).toBe('https://example.com/empty.png')
    expect(img.getAttribute('alt')).toBe('')
  })

  it('slot="illustration" 优先级高于 illustration 属性', async () => {
    const el = new OASEmpty()
    el.setAttribute('illustration', '<svg id="attr-illu"></svg>')
    el.innerHTML = '<svg slot="illustration" id="slot-illu"></svg>'
    document.body.appendChild(el)
    await new Promise((r) => setTimeout(r, 0))
    const content = el.shadowRoot!.querySelector<HTMLElement>('[part="illustration"]')!
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="illustration"]')!
    expect(content.hidden).toBe(true)
    expect(slot.hidden).toBe(false)
    expect(slot.assignedNodes().length).toBeGreaterThan(0)
  })

  it('无 slot 时使用 illustration 属性', async () => {
    const el = new OASEmpty()
    el.setAttribute('illustration', '<svg id="attr-illu"></svg>')
    document.body.appendChild(el)
    await new Promise((r) => setTimeout(r, 0))
    const content = el.shadowRoot!.querySelector<HTMLElement>('[part="illustration"]')!
    expect(content.hidden).toBe(false)
    expect(content.querySelector('#attr-illu')).not.toBeNull()
  })

  it('image-size 控制插画尺寸', () => {
    const el = new OASEmpty()
    el.setAttribute('image-size', '128')
    document.body.appendChild(el)
    const image = el.shadowRoot!.querySelector<HTMLElement>('.image')!
    expect(image.style.width).toBe('128px')
    expect(image.style.height).toBe('128px')
  })

  it('image-size 缺省为 96px', () => {
    const el = new OASEmpty()
    document.body.appendChild(el)
    const image = el.shadowRoot!.querySelector<HTMLElement>('.image')!
    expect(image.style.width).toBe('96px')
    expect(image.style.height).toBe('96px')
  })
})
