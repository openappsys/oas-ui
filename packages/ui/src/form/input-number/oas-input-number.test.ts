import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASInputNumber } from './index.js'

function mount(attrs: Record<string, string> = {}): OASInputNumber {
  const el = new OASInputNumber()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function input(el: OASInputNumber): HTMLInputElement {
  return el.shadowRoot!.querySelector('input')!
}

describe('OASInputNumber', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染原生 number input，value/min/max/step 透传', async () => {
    const el = mount({ value: '5', min: '0', max: '10', step: '1' })
    const i = input(el)
    await Promise.resolve()
    expect(i.type).toBe('number')
    expect(Number(i.value)).toBe(5)
    expect(Number(i.min)).toBe(0)
    expect(Number(i.max)).toBe(10)
    expect(Number(i.step)).toBe(1)
  })

  it('value 受控同步 + 外部变更增量更新', () => {
    const el = mount({ value: '3' })
    const i = input(el)
    el.setAttribute('value', '7')
    expect(input(el)).toBe(i)
    expect(Number(i.value)).toBe(7)
  })

  it('步进按钮 + 增加、- 减少，触发 oas-change', () => {
    const el = mount({ value: '5' })
    const btns = el.shadowRoot!.querySelectorAll('button')
    expect(btns.length).toBe(2)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(btns[0] as HTMLButtonElement).click()
    expect(Number(input(el).value)).toBe(6)
    expect(detail).toEqual({ value: 6 })
    ;(btns[1] as HTMLButtonElement).click()
    expect(Number(input(el).value)).toBe(5)
  })

  it('步进不越界 min/max', () => {
    const el = mount({ value: '9', max: '10' })
    const btns = el.shadowRoot!.querySelectorAll('button')
    ;(btns[0] as HTMLButtonElement).click()
    ;(btns[0] as HTMLButtonElement).click()
    expect(Number(input(el).value)).toBe(10)
  })

  it('disabled 时步进按钮无效', () => {
    const el = mount({ value: '5', disabled: '' })
    const btns = el.shadowRoot!.querySelectorAll('button')
    ;(btns[0] as HTMLButtonElement).click()
    expect(Number(input(el).value)).toBe(5)
  })
})
