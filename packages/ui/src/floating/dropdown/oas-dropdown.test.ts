import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASDropdown } from './index.js'

const ITEMS = JSON.stringify([
  { label: '编辑', value: 'edit' },
  { label: '删除', value: 'delete' },
])

function mount(attrs: Record<string, string> = {}): OASDropdown {
  const el = new OASDropdown()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.items) el.setAttribute('items', ITEMS)
  el.innerHTML = `<button>操作</button>`
  document.body.appendChild(el)
  return el
}

describe('OASDropdown', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('open 时显示下拉菜单', async () => {
    const el = mount({ open: '' })
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector('[role="menu"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelectorAll('[role="menuitem"]').length).toBe(2)
  })

  it('点击触发切换 open', () => {
    const el = mount()
    ;(el.querySelector('button') as HTMLElement).click()
    expect(el.shadowRoot!.querySelector('[role="menu"]')!.getAttribute('aria-hidden')).toBe('false')
  })

  it('选择菜单项派发 oas-select 并关闭', async () => {
    const el = mount({ open: '' })
    await Promise.resolve()
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelector('[role="menuitem"]') as HTMLElement).click()
    expect(detail).toEqual({ value: 'edit' })
    expect(el.hasAttribute('open')).toBe(false)
  })
})
