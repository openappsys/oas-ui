import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
    expect(el.style.gap).toBe('var(--oas-space-3)')
  })

  it('direction=vertical 切换为列布局', () => {
    const el = mount({ direction: 'vertical' })
    expect(el.style.flexDirection).toBe('column')
  })

  it('size 支持 token 名与数字像素', () => {
    const small = mount({ size: 'small' })
    expect(small.style.gap).toBe('var(--oas-space-2)')
    small.remove()
    const large = mount({ size: 'large' })
    expect(large.style.gap).toBe('var(--oas-space-5)')
    large.remove()
    const num = mount({ size: '16' })
    expect(num.style.gap).toBe('16px')
  })

  it('size 五档：xs=space-1/small=space-2/medium=space-3/large=space-5/xl=space-6', () => {
    const map: Array<[string, string]> = [
      ['xs', 'var(--oas-space-1)'],
      ['small', 'var(--oas-space-2)'],
      ['medium', 'var(--oas-space-3)'],
      ['large', 'var(--oas-space-5)'],
      ['xl', 'var(--oas-space-6)'],
    ]
    for (const [size, gap] of map) {
      const el = mount({ size })
      expect(el.style.gap, `size=${size}`).toBe(gap)
      el.remove()
    }
  })

  it('size 非法值回落 medium 且 dev 下 console.warn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ size: 'huge' })
    expect(el.style.gap).toBe('var(--oas-space-3)')
    el.setAttribute('size', 'huge')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    el.remove()
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
    expect(el.style.gap).toBe('var(--oas-space-5)')
  })
})
