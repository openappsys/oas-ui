import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASSegmented } from './index.js'

const OPTIONS = JSON.stringify([
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
])

function mount(attrs: Record<string, string> = {}): OASSegmented {
  const el = new OASSegmented()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.options) el.setAttribute('options', OPTIONS)
  document.body.appendChild(el)
  return el
}

function items(el: OASSegmented): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll('[role="radio"]')] as HTMLElement[]
}

describe('OASSegmented', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染选项，默认选中第一项', () => {
    const el = mount()
    expect(items(el).length).toBe(3)
    expect(items(el)[0]!.getAttribute('aria-checked')).toBe('true')
  })

  it('点击切换 value 并派发 oas-change', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    items(el)[2]!.click()
    expect(detail).toEqual({ value: 'month' })
    expect(items(el)[2]!.getAttribute('aria-checked')).toBe('true')
  })

  it('value 属性控制选中', () => {
    const el = mount({ value: 'week' })
    expect(items(el)[1]!.getAttribute('aria-checked')).toBe('true')
  })

  it('disabled 项不可选', () => {
    const el = mount({ options: JSON.stringify([{ label: 'a', value: 'a' }, { label: 'b', value: 'b', disabled: true }]) })
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    items(el)[1]!.click()
    expect(fired).toBe(0)
  })
})
