import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
    expect((a.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement).style.flexWrap).toBe(
      'wrap',
    )
    document.body.innerHTML = ''
    const b = mount({})
    expect((b.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement).style.flexWrap).toBe(
      'nowrap',
    )
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

  // ===== 布局批 1：space-evenly / fill / fill-ratio / 响应式断点 =====

  it('justify 补 space-evenly 档：evenly 与旧枚举双向兼容', () => {
    const a = mount({ justify: 'evenly' })
    expect((a.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement).style.justifyContent).toBe(
      'space-evenly',
    )
    a.remove()
    const b = mount({ justify: 'space-evenly' })
    expect((b.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement).style.justifyContent).toBe(
      'space-evenly',
    )
  })

  it('fill：子项等分填满容器（flex: 1 等价物）', () => {
    const el = mount({ fill: '' })
    const items = el.querySelectorAll<HTMLElement>(':scope > div')
    expect(items[0]!.style.flex).toBe('1 1 0%')
    expect(items[1]!.style.flex).toBe('1 1 0%')
  })

  it('fill-ratio：容器级缺省 + 子项自身优先（100 为 1 份）', () => {
    const el = new OASFlex()
    el.setAttribute('fill', '')
    el.setAttribute('fill-ratio', '200')
    el.innerHTML = '<div>a</div><div fill-ratio="300">b</div>'
    document.body.appendChild(el)
    const items = el.querySelectorAll<HTMLElement>(':scope > div')
    expect(items[0]!.style.flex).toBe('2 1 0%')
    expect(items[1]!.style.flex).toBe('3 1 0%')
  })

  it('fill 移除后清空子项 flex', () => {
    const el = mount({ fill: '' })
    const items = el.querySelectorAll<HTMLElement>(':scope > div')
    expect(items[0]!.style.flex).toBe('1 1 0%')
    el.removeAttribute('fill')
    expect(items[0]!.style.flex).toBe('')
  })

  it('direction 断点简写：var() 兜底基础值 + 生成 @media 规则', () => {
    const el = mount({ direction: 'column md:row' })
    const wrap = el.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement
    expect(wrap.style.flexDirection).toBe('var(--oas-flex-direction, column)')
    const css = el.shadowRoot!.querySelector('style[data-oas-flex-breakpoints]')!.textContent!
    expect(css).toContain('@media (min-width: 768px) { :host { --oas-flex-direction: row } }')
  })

  it('gap 断点简写：多断点生成对应 min-width 规则', () => {
    const el = mount({ gap: '8px md:16px xl:24px' })
    const wrap = el.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement
    expect(wrap.style.gap).toBe('var(--oas-flex-gap, 8px)')
    const css = el.shadowRoot!.querySelector('style[data-oas-flex-breakpoints]')!.textContent!
    expect(css).toContain('@media (min-width: 768px) { :host { --oas-flex-gap: 16px } }')
    expect(css).toContain('@media (min-width: 1280px) { :host { --oas-flex-gap: 24px } }')
  })

  it('gap 断点简写无基础值：var() 兜底 normal（0 间距）', () => {
    // 前导空格 = 无基础值（协议要求含空格才视为断点简写），回落 normal
    const el = mount({ gap: ' md:16px' })
    const wrap = el.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement
    expect(wrap.style.gap).toBe('var(--oas-flex-gap, normal)')
    const css = el.shadowRoot!.querySelector('style[data-oas-flex-breakpoints]')!.textContent!
    expect(css).toContain('@media (min-width: 768px) { :host { --oas-flex-gap: 16px } }')
  })

  it('断点简写 + vertical：vertical 优先，全宽 column 不生成 @media', () => {
    const el = mount({ vertical: '', direction: 'column md:row' })
    const wrap = el.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement
    expect(wrap.style.flexDirection).toBe('column')
    const css = el.shadowRoot!.querySelector('style[data-oas-flex-breakpoints]')!.textContent!
    expect(css).toBe('')
  })

  it('无断点纯值不生成 @media 规则（内联直写）；移除断点后规则清空', () => {
    const el = mount({ direction: 'vertical', gap: '12px' })
    const wrap = el.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement
    expect(wrap.style.flexDirection).toBe('column')
    expect(wrap.style.gap).toBe('12px')
    const styleEl = el.shadowRoot!.querySelector('style[data-oas-flex-breakpoints]')!
    expect(styleEl.textContent).toBe('')
    el.setAttribute('direction', 'column md:row')
    expect(styleEl.textContent).toContain('@media (min-width: 768px)')
    el.setAttribute('direction', 'vertical')
    expect(wrap.style.flexDirection).toBe('column')
    expect(styleEl.textContent).toBe('')
  })

  it('非法断点名：丢弃该断点 + dev 告警（同值去重）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ direction: 'column foo:row' })
    const wrap = el.shadowRoot!.querySelector('[part="wrap"]') as HTMLElement
    expect(wrap.style.flexDirection).toBe('var(--oas-flex-direction, column)')
    const css = el.shadowRoot!.querySelector('style[data-oas-flex-breakpoints]')!.textContent!
    expect(css).toBe('')
    el.setAttribute('direction', 'column foo:row')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    el.remove()
  })

  it('非法断点 direction 值：回落基础方向 + dev 告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ direction: 'column md:diagonal' })
    const css = el.shadowRoot!.querySelector('style[data-oas-flex-breakpoints]')!.textContent!
    expect(css).toContain('@media (min-width: 768px) { :host { --oas-flex-direction: column } }')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    el.remove()
  })

  it('SSR 快照：断点 @media 规则与 wrap var() 兜底一并序列化', () => {
    const el = mount({ direction: 'column md:row', gap: '8px md:16px' })
    const shadowHtml = el.shadowRoot!.innerHTML
    expect(shadowHtml).toContain('style data-oas-flex-breakpoints')
    expect(shadowHtml).toContain('@media (min-width: 768px)')
    expect(shadowHtml).toContain('--oas-flex-direction: row')
    expect(shadowHtml).toContain('--oas-flex-gap: 16px')
    expect(shadowHtml).toContain('flex-direction: var(--oas-flex-direction, column)')
    expect(shadowHtml).toContain('gap: var(--oas-flex-gap, 8px)')
  })
})
