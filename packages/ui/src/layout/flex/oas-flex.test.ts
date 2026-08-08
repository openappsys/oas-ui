import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASFlex } from './index.js'

function mount(attrs: Record<string, string> = {}): OASFlex {
  const el = new OASFlex()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<div>a</div><div>b</div>`
  document.body.appendChild(el)
  return el
}

describe('OASFlex', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认水平弹性布局，gap 属性生效', () => {
    const el = mount({ gap: '16px' })
    const wrap = el.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement
    expect(wrap.style.display).toBe('flex')
    expect(wrap.style.gap).toBe('16px')
  })

  it('wrap 填满宿主高度（宿主定高时 align 生效）', () => {
    const el = mount({})
    const wrap = el.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement
    expect(wrap.style.height).toBe('100%')
  })

  it('direction=vertical 改为纵向', () => {
    const el = mount({ direction: 'vertical' })
    const wrap = el.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement
    expect(wrap.style.flexDirection).toBe('column')
  })

  it('justify/align 映射到样式', () => {
    const el = mount({ justify: 'center', align: 'center', wrap: 'wrap' })
    const wrap = el.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement
    expect(wrap.style.justifyContent).toBe('center')
    expect(wrap.style.alignItems).toBe('center')
    expect(wrap.style.flexWrap).toBe('wrap')
  })

  it('vertical 简写 = direction:column', () => {
    const el = mount({ vertical: '' })
    const wrap = el.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement
    expect(wrap.style.flexDirection).toBe('column')
  })

  it('wrap 为布尔：存在即 flex-wrap:wrap，缺省 nowrap', () => {
    const a = mount({ wrap: '' })
    expect((a.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement).style.flexWrap).toBe('wrap')
    document.body.innerHTML = ''
    const b = mount({})
    expect((b.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement).style.flexWrap).toBe('nowrap')
  })

  it('justify 简写枚举补全：start/end/between/around', () => {
    const cases: Array<[string, string]> = [
      ['start', 'flex-start'],
      ['end', 'flex-end'],
      ['between', 'space-between'],
      ['around', 'space-around'],
    ]
    for (const [attr, css] of cases) {
      document.body.innerHTML = ''
      const el = mount({ justify: attr })
      const wrap = el.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement
      expect(wrap.style.justifyContent).toBe(css)
    }
  })

  it('align 简写枚举补全：start/end/baseline/stretch', () => {
    const cases: Array<[string, string]> = [
      ['start', 'flex-start'],
      ['end', 'flex-end'],
      ['baseline', 'baseline'],
      ['stretch', 'stretch'],
    ]
    for (const [attr, css] of cases) {
      document.body.innerHTML = ''
      const el = mount({ align: attr })
      const wrap = el.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement
      expect(wrap.style.alignItems).toBe(css)
    }
  })

  it('旧枚举（flex-start/space-between 等）仍兼容', () => {
    const el = mount({ justify: 'flex-start', align: 'flex-end', wrap: 'wrap' })
    const wrap = el.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement
    expect(wrap.style.justifyContent).toBe('flex-start')
    expect(wrap.style.alignItems).toBe('flex-end')
    expect(wrap.style.flexWrap).toBe('wrap')
  })

  it('空态：无子元素挂载不报错', () => {
    const el = new OASFlex()
    document.body.appendChild(el)
    const wrap = el.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement
    expect(wrap.style.display).toBe('flex')
    expect(wrap.style.height).toBe('100%')
  })
})
