import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASBreadcrumb } from './index.js'

const ITEMS = JSON.stringify([
  { label: '首页', href: '/' },
  { label: '组件', href: '/components' },
  { label: '按钮' },
])

function mount(): OASBreadcrumb {
  const el = new OASBreadcrumb()
  el.setAttribute('items', ITEMS)
  document.body.appendChild(el)
  return el
}

describe('OASBreadcrumb', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染导航与分隔符，最后一项不可点', () => {
    const el = mount()
    const nav = el.shadowRoot!.querySelector('nav')!
    expect(nav.getAttribute('aria-label')).toBe('面包屑')
    expect(el.shadowRoot!.querySelectorAll('.item').length).toBe(3)
    expect(el.shadowRoot!.querySelectorAll('.sep').length).toBe(2)
    expect(el.shadowRoot!.querySelectorAll('[part="link"]').length).toBe(2)
    expect(el.shadowRoot!.querySelector('[part="current"]')).not.toBeNull()
  })

  it('点击链接派发 oas-select', async () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelector('[part="link"]') as HTMLElement).click()
    expect(detail).toEqual({ value: '/' })
  })
})
