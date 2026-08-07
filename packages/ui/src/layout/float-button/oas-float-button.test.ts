import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASFloatButton } from './index.js'

function mount(attrs: Record<string, string> = {}): OASFloatButton {
  const el = new OASFloatButton()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<span slot="icon">+</span>`
  document.body.appendChild(el)
  return el
}

describe('OASFloatButton', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染悬浮按钮', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="btn"]')).not.toBeNull()
  })

  it('点击派发 oas-click', () => {
    const el = mount()
    let fired = 0
    el.addEventListener('oas-click', () => fired++)
    ;(el.shadowRoot!.querySelector('[part="btn"]') as HTMLElement).click()
    expect(fired).toBe(1)
  })

  it('badge 属性渲染角标', () => {
    const el = mount({ badge: '5' })
    expect(el.shadowRoot!.querySelector('[part="badge"]')!.textContent).toContain('5')
  })
})
