import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASSpin } from './index.js'

describe('OASSpin', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染加载指示器，size 默认中号', () => {
    const el = new OASSpin()
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="indicator"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="indicator"]')!.getAttribute('data-size')).toBe('md')
  })

  it('role=status + aria-busy', () => {
    const el = new OASSpin()
    document.body.appendChild(el)
    const indicator = el.shadowRoot!.querySelector('[part="indicator"]')!
    expect(indicator.getAttribute('role')).toBe('status')
    expect(el.getAttribute('aria-busy')).toBe('false')
    el.setAttribute('spinning', '')
    expect(el.getAttribute('aria-busy')).toBe('true')
  })

  it('包裹内容时嵌套显示', () => {
    const el = new OASSpin()
    el.setAttribute('spinning', '')
    el.innerHTML = `<p>内容</p>`
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="wrap"]')).not.toBeNull()
  })
})
