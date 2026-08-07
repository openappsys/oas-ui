import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASSpace } from './index.js'

function mount(attrs: Record<string, string> = {}): OASSpace {
  const el = new OASSpace()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

describe('OASSpace', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认水平等距布局：flex-row + medium 间距', async () => {
    const el = mount()
    await Promise.resolve()
    expect(el.style.flexDirection).toBe('row')
    expect(el.style.gap).toBe('12px')
  })

  it('direction=vertical 切换为列布局', () => {
    const el = mount({ direction: 'vertical' })
    expect(el.style.flexDirection).toBe('column')
  })

  it('size 支持 token 名与数字像素', () => {
    const small = mount({ size: 'small' })
    expect(small.style.gap).toBe('8px')
    small.remove()
    const large = mount({ size: 'large' })
    expect(large.style.gap).toBe('24px')
    large.remove()
    const num = mount({ size: '16' })
    expect(num.style.gap).toBe('16px')
  })

  it('wrap 控制 flex-wrap', () => {
    const el = mount({ wrap: '' })
    expect(el.style.flexWrap).toBe('wrap')
  })

  it('align 控制 align-items', () => {
    const el = mount({ align: 'center' })
    expect(el.style.alignItems).toBe('center')
  })

  it('属性变化增量更新：改 direction/size 即时生效', () => {
    const el = mount()
    el.setAttribute('direction', 'vertical')
    el.setAttribute('size', 'large')
    expect(el.style.flexDirection).toBe('column')
    expect(el.style.gap).toBe('24px')
  })
})
