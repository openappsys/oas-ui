import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASSlider } from './index.js'

function mount(attrs: Record<string, string> = {}): OASSlider {
  const el = new OASSlider()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function range(el: OASSlider): HTMLInputElement {
  return el.shadowRoot!.querySelector('input')!
}

describe('OASSlider', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染原生 range input，min/max/step 透传', async () => {
    const el = mount({ min: '0', max: '100', step: '5' })
    const input = range(el)
    await Promise.resolve()
    expect(input.type).toBe('range')
    expect(Number(input.min)).toBe(0)
    expect(Number(input.max)).toBe(100)
    expect(Number(input.step)).toBe(5)
  })

  it('value 受控同步 + 外部变更增量更新', () => {
    const el = mount({ value: '40' })
    const input = range(el)
    expect(Number(input.value)).toBe(40)
    el.setAttribute('value', '60')
    expect(range(el)).toBe(input)
    expect(Number(input.value)).toBe(60)
  })

  it('input 事件派发 oas-input（实时），change 派发 oas-change', () => {
    const el = mount()
    let inputDetail: unknown
    let changeDetail: unknown
    el.addEventListener('oas-input', (e: Event) => (inputDetail = (e as CustomEvent).detail))
    el.addEventListener('oas-change', (e: Event) => (changeDetail = (e as CustomEvent).detail))
    const input = range(el)
    input.value = '50'
    input.dispatchEvent(new Event('input'))
    input.dispatchEvent(new Event('change'))
    expect(inputDetail).toEqual({ value: 50 })
    expect(changeDetail).toEqual({ value: 50 })
  })

  it('disabled 透传', () => {
    const el = mount({ disabled: '' })
    expect(range(el).disabled).toBe(true)
  })
})
