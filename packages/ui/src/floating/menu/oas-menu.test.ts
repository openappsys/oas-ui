import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASMenu } from './index.js'

const ITEMS = JSON.stringify([
  { label: '首页', value: 'home' },
  { label: '关于', value: 'about' },
  { label: '设置', value: 'settings' },
])

function mount(attrs: Record<string, string> = {}): OASMenu {
  const el = new OASMenu()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.items) el.setAttribute('items', ITEMS)
  document.body.appendChild(el)
  return el
}

function items(el: OASMenu): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll('[part="item"]')] as HTMLElement[]
}

describe('OASMenu', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染菜单项，role=menu', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[role="menu"]')).not.toBeNull()
    expect(items(el).length).toBe(3)
  })

  it('点击菜单项派发 oas-select 并标记选中', async () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    items(el)[1]!.click()
    expect(detail).toEqual({ value: 'about' })
    expect(items(el)[1]!.getAttribute('aria-checked')).toBe('true')
  })

  it('方向键导航移动 active', () => {
    const el = mount()
    el.shadowRoot!.querySelector('[role="menu"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(items(el)[1]!.classList.contains('active')).toBe(true)
  })

  it('disabled 项不可选', async () => {
    const el = mount({ items: JSON.stringify([{ label: 'a', value: 'a', disabled: true }]) })
    let fired = 0
    el.addEventListener('oas-select', () => fired++)
    items(el)[0]!.click()
    expect(fired).toBe(0)
  })
})
