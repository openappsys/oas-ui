import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASSplitter } from './index.js'

function mount(): OASSplitter {
  const el = new OASSplitter()
  el.innerHTML = `<div>左面板</div><div>右面板</div>`
  document.body.appendChild(el)
  return el
}

describe('OASSplitter', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染分割条', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="splitter"]')).not.toBeNull()
  })

  it('方向键调整比例并派发 oas-resize', () => {
    const el = mount()
    el.setAttribute('percent', '50')
    let detail: unknown
    el.addEventListener('oas-resize', (e: Event) => (detail = (e as CustomEvent).detail))
    el.shadowRoot!.querySelector('[part="splitter"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(detail).toEqual({ percent: 51 })
  })

  it('min/max 限制比例', () => {
    const el = mount()
    el.setAttribute('percent', '10')
    el.setAttribute('min', '30')
    el.setAttribute('max', '70')
    el.shadowRoot!.querySelector('[part="splitter"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    expect(Number(el.getAttribute('percent'))).toBeGreaterThanOrEqual(30)
  })
})
