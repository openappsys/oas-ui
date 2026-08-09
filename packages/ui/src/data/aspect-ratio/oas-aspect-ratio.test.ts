import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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
