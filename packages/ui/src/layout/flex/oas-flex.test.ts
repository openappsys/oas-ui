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
})
