import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OASAspectRatio } from './index.js'

function mount(attrs: Record<string, string> = {}, content = '内容'): OASAspectRatio {
  const el = new OASAspectRatio()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = content
  document.body.appendChild(el)
  return el
}

function styleText(el: OASAspectRatio): string {
  return el.shadowRoot!.querySelector('style')!.textContent!
}

describe('OASAspectRatio', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认 ratio 回退 1 / 1', () => {
    const el = mount()
    expect(el.style.aspectRatio).toBe('1 / 1')
  })

  it('ratio="16/9" 应用 aspect-ratio', () => {
    const el = mount({ ratio: '16/9' })
    expect(el.style.aspectRatio).toBe('16 / 9')
  })

  it('支持冒号与空白分隔（4:3 / 16 / 9）', () => {
    const el = mount({ ratio: '4:3' })
    expect(el.style.aspectRatio).toBe('4 / 3')
    el.setAttribute('ratio', '16 / 9')
    expect(el.style.aspectRatio).toBe('16 / 9')
  })

  it('支持小数 ratio（1.5 → 1.5 / 1）', () => {
    const el = mount({ ratio: '1.5' })
    expect(el.style.aspectRatio).toBe('1.5 / 1')
  })

  it('非法 ratio 回退 1 / 1（含 0 分母/0 分子）', () => {
    const el = mount({ ratio: 'abc' })
    expect(el.style.aspectRatio).toBe('1 / 1')
    el.setAttribute('ratio', '1/0')
    expect(el.style.aspectRatio).toBe('1 / 1')
    el.setAttribute('ratio', '0/4')
    expect(el.style.aspectRatio).toBe('1 / 1')
  })

  it('宽度 100% + 内容铺满（absolute inset 0）', () => {
    const el = mount({ ratio: '16/9' })
    const css = styleText(el)
    expect(css).toContain('width: 100%')
    expect(css).toContain('position: absolute')
    expect(css).toContain('inset: 0')
  })

  it('无子内容仍保比例占位', () => {
    const el = mount({ ratio: '16/9' }, '')
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
    expect(el.style.aspectRatio).toBe('16 / 9')
  })
})

describe('OASAspectRatio 预定义 ratio token', () => {
  it.each([
    ['square', '1 / 1'],
    ['landscape', '4 / 3'],
    ['portrait', '3 / 4'],
    ['wide', '16 / 9'],
    ['ultrawide', '21 / 9'],
    ['golden', '1.618 / 1'],
  ])('token "%s" 映射 %s', (token, expected) => {
    const el = mount({ ratio: token })
    expect(el.style.aspectRatio).toBe(expected)
    el.remove()
  })

  it('token 名与分式/小数语法共存（token 匹配优先）', () => {
    const el = mount({ ratio: 'wide' })
    expect(el.style.aspectRatio).toBe('16 / 9')
    el.setAttribute('ratio', '16/9')
    expect(el.style.aspectRatio).toBe('16 / 9')
    el.setAttribute('ratio', '1.5')
    expect(el.style.aspectRatio).toBe('1.5 / 1')
    el.setAttribute('ratio', 'square')
    expect(el.style.aspectRatio).toBe('1 / 1')
    el.remove()
  })
})

describe('OASAspectRatio number 类型 property', () => {
  it('el.ratio = 数字 反射到属性并生效', () => {
    const el = mount()
    el.ratio = 1.5
    expect(el.getAttribute('ratio')).toBe('1.5')
    expect(el.style.aspectRatio).toBe('1.5 / 1')
    el.remove()
  })

  it('el.ratio = 分式/小数/token 字符串同样生效', () => {
    const el = mount()
    el.ratio = '16/9'
    expect(el.style.aspectRatio).toBe('16 / 9')
    el.ratio = '0.5625'
    expect(el.style.aspectRatio).toBe('0.5625 / 1')
    el.ratio = 'golden'
    expect(el.style.aspectRatio).toBe('1.618 / 1')
    el.remove()
  })
})

describe('OASAspectRatio 非法 ratio 回落 + dev 告警（同值去重）', () => {
  it('非法值回落 1/1 且 console.warn 同值去重', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ ratio: 'bogus-ratio-xyz' })
    expect(el.style.aspectRatio).toBe('1 / 1')
    // 同值再次设置：告警去重，仅一次
    el.setAttribute('ratio', 'bogus-ratio-xyz')
    expect(warn).toHaveBeenCalledTimes(1)
    // 不同非法值各自告警一次
    el.setAttribute('ratio', 'another-bogus-ratio')
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
    el.remove()
  })

  it('0 分子/0 分母同样回落 1/1 + 告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ ratio: '5/0' })
    expect(el.style.aspectRatio).toBe('1 / 1')
    el.setAttribute('ratio', '0/7')
    expect(el.style.aspectRatio).toBe('1 / 1')
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
    el.remove()
  })
})
