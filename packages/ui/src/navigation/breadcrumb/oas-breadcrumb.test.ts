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

  const LONG_ITEMS = JSON.stringify([
    { label: '首页', href: '/' },
    { label: '组件', href: '/components' },
    { label: '导航', href: '/components/anchor' },
    { label: '数据展示', href: '/components/table' },
    { label: '反馈', href: '/components/alert' },
    { label: '面包屑' },
  ])

  function mountWith(attrs: Record<string, string>): OASBreadcrumb {
    const el = new OASBreadcrumb()
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
    document.body.appendChild(el)
    return el
  }

  it('collapsed 且 items 超过 max-items：中间项折叠为 …，下拉默认关闭', () => {
    const el = mountWith({ items: LONG_ITEMS, collapsed: '', 'max-items': '4' })
    const root = el.shadowRoot!
    // 视觉序列：首页 / … / 反馈 / 面包屑（4 个 .item，省略占一个）
    expect(root.querySelectorAll('.item').length).toBe(4)
    const btn = root.querySelector<HTMLButtonElement>('.ellipsis-btn')!
    expect(btn).not.toBeNull()
    expect(btn.textContent).toBe('…')
    expect(btn.getAttribute('aria-haspopup')).toBe('menu')
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    expect(btn.getAttribute('aria-label')).toBe('展开被折叠的面包屑项')
    // 下拉默认关闭，且包含全部被折叠项
    const dd = root.querySelector('.ellipsis-dropdown')!
    expect(dd.classList.contains('open')).toBe(false)
    expect(dd.querySelectorAll('a').length).toBe(3)
    expect([...dd.querySelectorAll('a')].map((a) => a.textContent)).toEqual([
      '组件',
      '导航',
      '数据展示',
    ])
    // 可见链接：首页 + 反馈；当前页为末项
    expect(root.querySelectorAll('nav > .item > [part="link"]').length).toBe(2)
    expect(root.querySelector('[part="current"]')!.textContent).toBe('面包屑')
  })

  it('collapsed 但未超过 max-items：全部渲染，无省略按钮', () => {
    const el = mountWith({ items: ITEMS, collapsed: '', 'max-items': '4' })
    const root = el.shadowRoot!
    expect(root.querySelectorAll('.item').length).toBe(3)
    expect(root.querySelector('.ellipsis-btn')).toBeNull()
  })

  it('点击 … 展开下拉，面板内为被折叠项', () => {
    const el = mountWith({ items: LONG_ITEMS, collapsed: '', 'max-items': '4' })
    const root = el.shadowRoot!
    const btn = root.querySelector<HTMLButtonElement>('.ellipsis-btn')!
    btn.click()
    expect(root.querySelector('.ellipsis-dropdown')!.classList.contains('open')).toBe(true)
    expect(btn.getAttribute('aria-expanded')).toBe('true')
  })

  it('点击下拉内项：派发 oas-select 并关闭下拉', () => {
    const el = mountWith({ items: LONG_ITEMS, collapsed: '', 'max-items': '4' })
    const root = el.shadowRoot!
    const btn = root.querySelector<HTMLButtonElement>('.ellipsis-btn')!
    btn.click()
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    const link = root.querySelectorAll<HTMLAnchorElement>('.ellipsis-dropdown a')[1]!
    link.click()
    expect(detail).toEqual({ value: '/components/anchor' })
    expect(root.querySelector('.ellipsis-dropdown')!.classList.contains('open')).toBe(false)
    expect(btn.getAttribute('aria-expanded')).toBe('false')
  })

  it('Esc 关闭下拉', () => {
    const el = mountWith({ items: LONG_ITEMS, collapsed: '', 'max-items': '4' })
    const root = el.shadowRoot!
    const btn = root.querySelector<HTMLButtonElement>('.ellipsis-btn')!
    btn.click()
    expect(root.querySelector('.ellipsis-dropdown')!.classList.contains('open')).toBe(true)
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(root.querySelector('.ellipsis-dropdown')!.classList.contains('open')).toBe(false)
    expect(btn.getAttribute('aria-expanded')).toBe('false')
  })

  it('点击组件外部关闭下拉', () => {
    const el = mountWith({ items: LONG_ITEMS, collapsed: '', 'max-items': '4' })
    const root = el.shadowRoot!
    root.querySelector<HTMLButtonElement>('.ellipsis-btn')!.click()
    document.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(root.querySelector('.ellipsis-dropdown')!.classList.contains('open')).toBe(false)
  })

  it('max-items 非法值回退默认 4', () => {
    const el = mountWith({ items: LONG_ITEMS, collapsed: '', 'max-items': 'abc' })
    const root = el.shadowRoot!
    expect(root.querySelector('.ellipsis-btn')).not.toBeNull()
    expect(root.querySelector('.ellipsis-dropdown')!.querySelectorAll('a').length).toBe(3)
  })

  it('ellipsis：nav 单行省略 class + 链接带全文 title', () => {
    const el = mountWith({ items: ITEMS, ellipsis: '' })
    const root = el.shadowRoot!
    const nav = root.querySelector('nav')!
    expect(nav.classList.contains('ellipsis')).toBe(true)
    const link = nav.querySelector<HTMLAnchorElement>('[part="link"]')!
    expect(link.getAttribute('title')).toBe('首页')
  })

  it('折叠项无 href 时渲染为纯文本（aria-disabled）', () => {
    const el = mountWith({
      items: JSON.stringify([{ label: '首页', href: '/' }, { label: '无链接' }, { label: '末项' }]),
      collapsed: '',
      'max-items': '2',
    })
    const root = el.shadowRoot!
    const item = root.querySelector<HTMLElement>('.ellipsis-item[aria-disabled="true"]')!
    expect(item).not.toBeNull()
    expect(item.textContent).toBe('无链接')
  })
})
