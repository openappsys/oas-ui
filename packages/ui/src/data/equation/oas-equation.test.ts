import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASEquation } from './index.js'

function mount(attrs: Record<string, string> = {}): OASEquation {
  const el = new OASEquation()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function eqOf(el: OASEquation): HTMLElement {
  return el.shadowRoot!.querySelector('[part="equation"]')!
}

describe('OASEquation', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('普通文本原样渲染', () => {
    const el = mount({ code: 'x + y' })
    expect(eqOf(el).textContent).toBe('x + y')
  })

  it('上标 x^2 渲染 sup', () => {
    const el = mount({ code: 'x^2' })
    const sup = eqOf(el).querySelector('.sup')
    expect(sup).not.toBeNull()
    expect(sup!.textContent).toBe('2')
  })

  it('下标 a_{i} 渲染 sub', () => {
    const el = mount({ code: 'a_{i}' })
    const sub = eqOf(el).querySelector('.sub')
    expect(sub).not.toBeNull()
    expect(sub!.textContent).toBe('i')
  })

  it('分数 \\frac{a}{b}', () => {
    const el = mount({ code: '\\frac{a}{b}' })
    const frac = eqOf(el).querySelector('.frac')
    expect(frac).not.toBeNull()
    expect(frac!.querySelector('.num')!.textContent).toBe('a')
    expect(frac!.querySelector('.den')!.textContent).toBe('b')
  })

  it('根号 \\sqrt{x}', () => {
    const el = mount({ code: '\\sqrt{x}' })
    const sqrt = eqOf(el).querySelector('.sqrt')
    expect(sqrt).not.toBeNull()
    expect(sqrt!.textContent).toBe('x')
  })

  it('求和带上下限 \\sum_{i=1}^{n}', () => {
    const el = mount({ code: '\\sum_{i=1}^{n}' })
    const op = eqOf(el).querySelector('.op')
    expect(op).not.toBeNull()
    expect(op!.textContent).toContain('i=1')
    expect(op!.textContent).toContain('n')
  })

  it('希腊字母映射 \\alpha → α', () => {
    const el = mount({ code: '\\alpha + \\beta' })
    const text = eqOf(el).textContent!
    expect(text).toContain('α')
    expect(text).toContain('β')
  })

  it('运算符 \\times → ×', () => {
    const el = mount({ code: 'a \\times b' })
    expect(eqOf(el).textContent).toContain('×')
  })

  it('未知命令按字面显示不报错', () => {
    const el = mount({ code: '\\foo{x}' })
    expect(eqOf(el).textContent).toContain('\\foo')
  })

  it('aria-label = 原始 LaTeX', () => {
    const el = mount({ code: '\\frac{1}{2}' })
    expect(eqOf(el).getAttribute('aria-label')).toBe('\\frac{1}{2}')
  })

  it('特殊字符转义防注入', () => {
    const el = mount({ code: '<script>' })
    const eq = eqOf(el)
    expect(eq.querySelector('script')).toBeNull()
    expect(eq.innerHTML).toContain('&lt;')
  })

  it('嵌套：分数内上标/下标', () => {
    const el = mount({ code: '\\frac{x^2}{y_1}' })
    const frac = eqOf(el).querySelector('.frac')!
    expect(frac.querySelector('.sup')).not.toBeNull()
    expect(frac.querySelector('.sub')).not.toBeNull()
  })

  it('空 code 不报错', () => {
    const el = mount({})
    expect(eqOf(el)).not.toBeNull()
  })

  it('code 更新重新渲染', () => {
    const el = mount({ code: 'x^2' })
    const eq = eqOf(el)
    el.setAttribute('code', '\\alpha')
    expect(eq).toBe(eqOf(el))
    expect(eq.textContent).toContain('α')
  })
})
