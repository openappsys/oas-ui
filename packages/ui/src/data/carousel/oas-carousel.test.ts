import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASCarousel } from './index.js'

function mount(attrs: Record<string, string> = {}): OASCarousel {
  const el = new OASCarousel()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<div class="slide">一</div><div class="slide">二</div><div class="slide">三</div>`
  document.body.appendChild(el)
  return el
}

describe('OASCarousel', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染滑动容器与指示器', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="track"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelectorAll('[part="dot"]').length).toBe(3)
  })

  it('点击指示器切换并派发 oas-change', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelectorAll('[part="dot"]')[2] as HTMLElement).click()
    expect(detail).toEqual({ index: 2 })
  })

  it('autoplay 时定时切换', () => {
    vi.useFakeTimers()
    const el = mount({ autoplay: '' })
    vi.advanceTimersByTime(3500)
    expect(el.getAttribute('index')).toBe('1')
    vi.useRealTimers()
  })
})
