import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASAnchor } from './index.js'

const ITEMS = JSON.stringify([
  { href: '#section1', title: '第一节' },
  { href: '#section2', title: '第二节' },
  { href: '#section3', title: '第三节' },
])

function mount(): OASAnchor {
  const el = new OASAnchor()
  el.setAttribute('items', ITEMS)
  document.body.appendChild(el)
  return el
}

describe('OASAnchor', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('渲染锚点链接列表，nav+aria-label', () => {
    const el = mount()
    const nav = el.shadowRoot!.querySelector('nav')!
    expect(nav.getAttribute('aria-label')).toBe('锚点导航')
    expect(el.shadowRoot!.querySelectorAll('[part="link"]').length).toBe(3)
  })

  it('点击链接派发 oas-change 并滚动到锚点', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    ;(el.shadowRoot!.querySelector('[part="link"]') as HTMLElement).click()
    expect(detail).toEqual({ href: '#section1' })
    spy.mockRestore()
  })

  it('active 属性标记当前项', () => {
    const el = mount()
    el.setAttribute('active', '#section2')
    const links = el.shadowRoot!.querySelectorAll('[part="link"]')
    expect(links[1]!.getAttribute('aria-current')).toBe('true')
  })
})
