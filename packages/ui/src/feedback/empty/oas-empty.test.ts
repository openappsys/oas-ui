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
})
