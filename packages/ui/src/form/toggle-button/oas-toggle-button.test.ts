import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASToggleButton } from './index.js'

function mount(attrs: Record<string, string> = {}): OASToggleButton {
  const el = new OASToggleButton()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function btn(el: OASToggleButton): HTMLButtonElement {
  return el.shadowRoot!.querySelector('button')!
}

describe('OASToggleButton', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 button，role=button 且 aria-pressed 默认 false', async () => {
    const el = mount()
    await Promise.resolve()
    expect(btn(el).getAttribute('role')).toBe('button')
    expect(btn(el).getAttribute('aria-pressed')).toBe('false')
  })

  it('pressed 属性驱动 aria-pressed 与按下态', () => {
    const el = mount({ pressed: '' })
    expect(btn(el).getAttribute('aria-pressed')).toBe('true')
  })

  it('点击切换 pressed 并派发 oas-change（含 value/pressed）', () => {
    const el = mount({ value: 'bold' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    btn(el).click()
    expect(el.hasAttribute('pressed')).toBe(true)
    expect(btn(el).getAttribute('aria-pressed')).toBe('true')
    expect(detail).toEqual({ value: 'bold', pressed: true })
    btn(el).click()
    expect(detail).toEqual({ value: 'bold', pressed: false })
    expect(el.hasAttribute('pressed')).toBe(false)
  })

  it('disabled 时不可切换', () => {
    const el = mount({ disabled: '' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    btn(el).click()
    expect(detail).toBeUndefined()
    expect(btn(el).getAttribute('aria-pressed')).toBe('false')
  })

  it('属性变化增量更新且不重建按钮引用', () => {
    const el = mount()
    const b = btn(el)
    el.setAttribute('pressed', '')
    expect(btn(el)).toBe(b)
    expect(btn(el).getAttribute('aria-pressed')).toBe('true')
  })
})
