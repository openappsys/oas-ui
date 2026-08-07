import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASCard } from './index.js'

function mount(attrs: Record<string, string> = {}): OASCard {
  const el = new OASCard()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<p>卡片内容</p>`
  document.body.appendChild(el)
  return el
}

describe('OASCard', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染标题与内容', () => {
    const el = mount({ title: '卡片标题' })
    const sr = el.shadowRoot!
    expect(sr.querySelector('[part="title"]')!.textContent).toBe('卡片标题')
    expect(sr.querySelector('slot')).not.toBeNull()
  })

  it('hoverable 时带悬浮阴影类', () => {
    const el = mount({ hoverable: '' })
    expect(el.shadowRoot!.querySelector('[part="card"]')!.classList.contains('hoverable')).toBe(true)
  })
})
