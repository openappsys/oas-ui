import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
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
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
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

  it('渲染左右箭头按钮', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="arrow-prev"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="arrow-next"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="arrow-prev"]')?.getAttribute('aria-label')).toBe('上一屏')
    expect(el.shadowRoot!.querySelector('[part="arrow-next"]')?.getAttribute('aria-label')).toBe('下一屏')
  })

  it('arrows=never 时箭头隐藏（hidden），不渲染可见箭头元素', () => {
    const el = mount({ arrows: 'never' })
    expect(el.shadowRoot!.querySelector('[part="arrow-prev"]')?.hasAttribute('hidden')).toBe(true)
    expect(el.shadowRoot!.querySelector('[part="arrow-next"]')?.hasAttribute('hidden')).toBe(true)
    expect(el.shadowRoot!.querySelectorAll('[part="arrow-prev"]:not([hidden])').length).toBe(0)
    expect(el.shadowRoot!.querySelectorAll('[part="arrow-next"]:not([hidden])').length).toBe(0)
  })

  it('arrows=hover 时箭头保留在 DOM，可见性由 CSS 控制', () => {
    const el = mount({ arrows: 'hover' })
    expect(el.getAttribute('arrows')).toBe('hover')
    expect(el.shadowRoot!.querySelector('[part="arrow-prev"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="arrow-next"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="arrow-prev"]')?.hasAttribute('hidden')).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="arrow-next"]')?.hasAttribute('hidden')).toBe(false)
  })

  it('arrows=always 时箭头始终显示（无 hidden）', () => {
    const el = mount({ arrows: 'always' })
    expect(el.shadowRoot!.querySelector('[part="arrow-prev"]')?.hasAttribute('hidden')).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="arrow-next"]')?.hasAttribute('hidden')).toBe(false)
  })

  it('未指定 arrows 时默认悬停形态（hover），箭头保留在 DOM', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="arrow-prev"]')?.hasAttribute('hidden')).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="arrow-next"]')?.hasAttribute('hidden')).toBe(false)
  })

  it('点击 next 箭头 index+1 并派发 oas-change', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelector('[part="arrow-next"]') as HTMLElement).click()
    expect(detail).toEqual({ index: 1 })
    expect(el.getAttribute('index')).toBe('1')
  })

  it('点击 prev 箭头循环到最后一屏', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelector('[part="arrow-prev"]') as HTMLElement).click()
    expect(detail).toEqual({ index: 2 })
    expect(el.getAttribute('index')).toBe('2')
  })

  it('autoplay 时定时切换', () => {
    vi.useFakeTimers()
    const el = mount({ autoplay: '' })
    vi.advanceTimersByTime(3500)
    expect(el.getAttribute('index')).toBe('1')
    vi.useRealTimers()
  })

  it('locale：箭头/指示器 aria-label 随 setLocale 切换', () => {
    const el = mount()
    const prev = el.shadowRoot!.querySelector<HTMLElement>('[part="arrow-prev"]')!
    const next = el.shadowRoot!.querySelector<HTMLElement>('[part="arrow-next"]')!
    const dot = el.shadowRoot!.querySelector<HTMLElement>('[part="dot"]')!
    expect(prev.getAttribute('aria-label')).toBe('上一屏')
    expect(next.getAttribute('aria-label')).toBe('下一屏')
    expect(dot.getAttribute('aria-label')).toBe('第 1 张')

    setLocale(en)
    expect(prev.getAttribute('aria-label')).toBe('Previous slide')
    expect(next.getAttribute('aria-label')).toBe('Next slide')
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="dot"]')!.getAttribute('aria-label')).toBe('Slide 1')

    setLocale('zh-CN')
    expect(prev.getAttribute('aria-label')).toBe('上一屏')
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="dot"]')!.getAttribute('aria-label')).toBe('第 1 张')
  })
})
