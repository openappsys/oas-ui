import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASDescriptions, OASDescriptionsItem } from './index.js'

function mount(attrs: Record<string, string> = {}): OASDescriptions {
  const el = new OASDescriptions()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `
    <oas-descriptions-item label="姓名"><span>张三</span></oas-descriptions-item>
    <oas-descriptions-item label="年龄"><span>30</span></oas-descriptions-item>
  `
  document.body.appendChild(el)
  return el
}

describe('OASDescriptions', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染标签与内容', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="items"]')).not.toBeNull()
    const items = el.querySelectorAll('oas-descriptions-item')
    expect(items.length).toBe(2)
  })

  it('column 属性生效', () => {
    const el = mount({ column: '2' })
    expect(el.shadowRoot!.querySelector('[part="items"]')!.getAttribute('data-column')).toBe('2')
  })
})
