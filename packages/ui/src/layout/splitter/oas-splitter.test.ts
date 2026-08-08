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

  it('鼠标拖拽分割条改变 percent 并派发 oas-resize', () => {
    const el = mount()
    el.setAttribute('percent', '50')
    Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
    let detail: unknown
    el.addEventListener('oas-resize', (e: Event) => (detail = (e as CustomEvent).detail))
    const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
    splitter.dispatchEvent(pointer('pointerdown', 500))
    document.dispatchEvent(pointer('pointermove', 600))
    expect(Number(el.getAttribute('percent'))).toBe(60)
    expect(detail).toEqual({ percent: 60 })
    document.dispatchEvent(pointer('pointerup', 600))
    // 松手后不再响应
    document.dispatchEvent(pointer('pointermove', 700))
    expect(Number(el.getAttribute('percent'))).toBe(60)
  })

  it('拖拽受 min/max 限制', () => {
    const el = mount()
    el.setAttribute('percent', '50')
    el.setAttribute('min', '20')
    el.setAttribute('max', '80')
    Object.defineProperty(el, 'clientWidth', { value: 1000, configurable: true })
    const splitter = el.shadowRoot!.querySelector('[part="splitter"]')!
    splitter.dispatchEvent(pointer('pointerdown', 500))
    document.dispatchEvent(pointer('pointermove', 950))
    expect(Number(el.getAttribute('percent'))).toBe(80)
    document.dispatchEvent(pointer('pointerup', 950))
  })
})

function pointer(type: string, clientX: number): Event {
  const Ctor = (globalThis as Record<string, unknown>).PointerEvent as
    | typeof PointerEvent
    | undefined
  if (typeof Ctor === 'function') {
    return new Ctor(type, { bubbles: true, clientX })
  }
  return new MouseEvent(type, { bubbles: true, clientX })
}
