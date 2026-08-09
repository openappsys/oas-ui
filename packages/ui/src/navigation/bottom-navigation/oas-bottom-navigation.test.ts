import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import '@oas-ui/i18n'
import { OASBottomNavigation } from './index.js'

const ITEMS = JSON.stringify([
  { label: '首页', value: 'home', icon: 'user' },
  { label: '搜索', value: 'search', icon: 'search' },
  { label: '我的', value: 'mine', icon: 'gear' },
])

function mount(attrs: Record<string, string> = {}): OASBottomNavigation {
  const el = new OASBottomNavigation()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.items) el.setAttribute('items', ITEMS)
  document.body.appendChild(el)
  return el
}

function list(el: OASBottomNavigation): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="tablist"]')!
}

function tabs(el: OASBottomNavigation): HTMLButtonElement[] {
  return [...el.shadowRoot!.querySelectorAll('[part="tab"]')] as HTMLButtonElement[]
}

function key(el: OASBottomNavigation, k: string): void {
  list(el).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
}

describe('OASBottomNavigation', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 tablist 语义 + aria-label（内置文案走 t()）', () => {
    const el = mount()
    expect(list(el).getAttribute('role')).toBe('tablist')
    expect(list(el).getAttribute('aria-label')).toBe('底部导航')
    const ts = tabs(el)
    expect(ts.length).toBe(3)
    expect(ts[0]!.getAttribute('role')).toBe('tab')
  })

  it('aria-selected 跟随 value，未指定默认选中第一项', () => {
    const el = mount({ value: 'search' })
    const ts = tabs(el)
    expect(ts[0]!.getAttribute('aria-selected')).toBe('false')
    expect(ts[1]!.getAttribute('aria-selected')).toBe('true')
    const el2 = mount()
    expect(tabs(el2)[0]!.getAttribute('aria-selected')).toBe('true')
  })

  it('roving tabindex：仅激活项可聚焦', () => {
    const el = mount({ value: 'search' })
    const ts = tabs(el)
    expect(ts[0]!.tabIndex).toBe(-1)
    expect(ts[1]!.tabIndex).toBe(0)
    expect(ts[2]!.tabIndex).toBe(-1)
  })

  it('点击选中派发 oas-change { value }', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    tabs(el)[2]!.click()
    expect(el.getAttribute('value')).toBe('mine')
    expect(detail).toEqual({ value: 'mine' })
    expect(tabs(el)[2]!.getAttribute('aria-selected')).toBe('true')
  })

  it('点击已选中项不重复派发', () => {
    const el = mount({ value: 'home' })
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    tabs(el)[0]!.click()
    expect(fired).toBe(0)
  })

  it('键盘左右移动焦点（roving tabindex），Enter 选中', () => {
    const el = mount({ value: 'home' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    key(el, 'ArrowRight')
    expect(el.shadowRoot!.activeElement).toBe(tabs(el)[1])
    expect(tabs(el)[1]!.tabIndex).toBe(0)
    expect(detail).toBeUndefined() // 方向键只移动焦点不选中
    key(el, 'Enter')
    expect(el.getAttribute('value')).toBe('search')
    expect(detail).toEqual({ value: 'search' })
    key(el, 'ArrowLeft')
    expect(el.shadowRoot!.activeElement).toBe(tabs(el)[0])
  })

  it('方向键循环移动且跳过 disabled 项', () => {
    const el = mount({
      items: JSON.stringify([
        { label: 'a', value: 'a' },
        { label: 'b', value: 'b', disabled: true },
        { label: 'c', value: 'c' },
      ]),
    })
    key(el, 'ArrowRight')
    // a(选中) -> b 被禁用，跳到 c
    expect(el.shadowRoot!.activeElement).toBe(tabs(el)[2])
    key(el, 'Enter')
    expect(el.getAttribute('value')).toBe('c')
  })

  it('disabled 项 aria-disabled、不可聚焦、点击不派发', () => {
    const el = mount({
      items: JSON.stringify([
        { label: 'a', value: 'a' },
        { label: 'b', value: 'b', disabled: true },
      ]),
    })
    const b = tabs(el)[1]!
    expect(b.getAttribute('aria-disabled')).toBe('true')
    expect(b.tabIndex).toBe(-1)
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    b.click()
    expect(fired).toBe(0)
    expect(el.getAttribute('value')).toBeNull()
  })

  it('icon 用 iconRegistry 渲染内联 SVG', () => {
    const el = mount()
    const svgs = el.shadowRoot!.querySelectorAll('svg')
    expect(svgs.length).toBe(3)
    expect(svgs[0]!.getAttribute('viewBox')).toBe('0 0 16 16')
  })

  it('空 items 渲染空 tablist 不报错', () => {
    const el = mount({ items: '[]' })
    expect(tabs(el).length).toBe(0)
    expect(list(el).getAttribute('role')).toBe('tablist')
  })

  it('items 非法 JSON 渲染空容器', () => {
    const el = mount({ items: 'not-json' })
    expect(tabs(el).length).toBe(0)
  })

  it('fixed 属性给 host 加 fixed 类名（demo 可静态）', () => {
    const el = mount()
    expect(el.classList.contains('oas-bottom-navigation--fixed')).toBe(false)
    el.setAttribute('fixed', '')
    expect(el.classList.contains('oas-bottom-navigation--fixed')).toBe(true)
  })

  it('value 属性变化增量同步，不重建按钮引用', () => {
    const el = mount({ value: 'home' })
    const first = tabs(el)[0]
    el.setAttribute('value', 'search')
    expect(tabs(el)[0]).toBe(first)
    expect(tabs(el)[1]!.getAttribute('aria-selected')).toBe('true')
    expect(tabs(el)[1]!.tabIndex).toBe(0)
  })

  it('items 属性变化重建列表', () => {
    const el = mount()
    const first = tabs(el)[0]
    el.setAttribute('items', JSON.stringify([{ label: 'x', value: 'x' }]))
    expect(tabs(el).length).toBe(1)
    expect(tabs(el)[0]).not.toBe(first)
  })
})
