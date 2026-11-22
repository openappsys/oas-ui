import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASCategory } from './index.js'

function mount(attrs: Record<string, string> = {}): OASCategory {
  const el = new OASCategory()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function q<T extends Element>(el: OASCategory, selector: string): T {
  return el.shadowRoot!.querySelector(selector) as T
}

function nodes(el: OASCategory): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.node')]
}

const CATEGORIES = JSON.stringify([
  {
    key: 'digital',
    label: '数码',
    children: [
      {
        key: 'phone',
        label: '手机',
        children: [
          { key: 'apple', label: '苹果' },
          { key: 'android', label: '安卓' },
        ],
      },
      {
        key: 'audio',
        label: '影音',
        items: [{ key: 'p1', label: '蓝牙耳机', meta: '热卖' }],
      },
    ],
  },
  {
    key: 'home',
    label: '家居',
    items: [{ key: 'p2', label: '收纳盒' }],
  },
])

describe('OASCategory', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认激活首类目：左树渲染根与首层子类，右栏宫格显示子类', () => {
    const el = mount({ categories: CATEGORIES })
    expect(q<HTMLElement>(el, '.tree').getAttribute('role')).toBe('tree')
    expect(q<HTMLElement>(el, '.tree').getAttribute('aria-label')).toBe('商品分类')
    expect(nodes(el).map((n) => n.textContent?.replace('›', ''))).toEqual(['数码', '手机', '影音', '家居'])
    expect(nodes(el)[0]!.getAttribute('aria-selected')).toBe('true')
    expect(nodes(el)[0]!.getAttribute('aria-expanded')).toBe('true')
    const tiles = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.tile')]
    expect(tiles.map((t) => t.textContent)).toEqual(['手机', '影音'])
    expect(el.shadowRoot!.querySelector('.crumb'), '根类目不重复展示面包屑').toBe(null)
  })

  it('点击左侧子类目：激活、展开路径、右栏更新并派发 oas-change', () => {
    const el = mount({ categories: CATEGORIES })
    let detail: { key: string; path: string[] } | null = null
    el.addEventListener('oas-change', (e) => (detail = (e as CustomEvent).detail))
    nodes(el)[1]!.click()
    expect(el.getAttribute('active-key')).toBe('phone')
    expect(detail!.key).toBe('phone')
    expect(detail!.path).toEqual(['digital', 'phone'])
    expect(nodes(el).map((n) => n.getAttribute('data-level'))).toEqual(['1', '2', '3', '3', '2', '1'])
    const tiles = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.tile')]
    expect(tiles.map((t) => t.textContent)).toEqual(['苹果', '安卓'])
    expect(q<HTMLElement>(el, '.crumb').textContent).toBe('数码 / 手机')
  })

  it('右侧宫格进入子类，商品位点击派发 oas-select', () => {
    const el = mount({ categories: CATEGORIES })
    const tiles = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.tile')]
    tiles[1]!.click() // 影音
    expect(el.getAttribute('active-key')).toBe('audio')
    const product = q<HTMLElement>(el, '.tile')
    expect(product.textContent).toContain('蓝牙耳机')
    expect(product.textContent).toContain('热卖')

    let detail: { key: string; path: string[] } | null = null
    el.addEventListener('oas-select', (e) => (detail = (e as CustomEvent).detail))
    product.click()
    expect(detail!.key).toBe('p1')
    expect(detail!.path).toEqual(['digital', 'audio'])
  })

  it('返回上级按钮回到父类目', () => {
    const el = mount({ categories: CATEGORIES, 'active-key': 'apple' })
    expect(el.getAttribute('active-key')).toBe('apple')
    const back = q<HTMLButtonElement>(el, '.back')
    expect(back.textContent).toBe('返回上级')
    back.click()
    expect(el.getAttribute('active-key')).toBe('phone')
  })

  it('键盘：上下移动 / 右展开 / 左收起 / 回车激活', () => {
    const el = mount({ categories: CATEGORIES })
    const tree = q<HTMLElement>(el, '.tree')
    const first = nodes(el)[0]!
    first.focus()
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(el.shadowRoot!.activeElement?.getAttribute('data-key')).toBe('phone')

    const phone = el.shadowRoot!.activeElement as HTMLElement
    phone.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(nodes(el).some((n) => n.getAttribute('data-key') === 'android')).toBe(true)

    const phoneAgain = el.shadowRoot!.activeElement as HTMLElement
    phoneAgain.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(nodes(el).some((n) => n.getAttribute('data-key') === 'android')).toBe(false)

    const current = el.shadowRoot!.activeElement as HTMLElement
    current.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.getAttribute('active-key')).toBe('phone')
  })

  it('空类目显示空态', () => {
    const el = mount({ categories: '[]' })
    expect(q<HTMLElement>(el, '.empty').textContent).toBe('暂无分类')
    expect(nodes(el).length).toBe(0)
  })

  it('非法 categories JSON 不抛异常', () => {
    const el = mount({ categories: '{oops' })
    expect(nodes(el).length).toBe(0)
    expect(q<HTMLElement>(el, '.empty').textContent).toBe('暂无分类')
  })

  it('外部改写 active-key 展开对应路径', () => {
    const el = mount({ categories: CATEGORIES })
    el.setAttribute('active-key', 'apple')
    expect(el.shadowRoot!.querySelector('.node[data-key="apple"]')!.textContent).toContain('苹果')
    expect(el.shadowRoot!.querySelector('.node[data-key="apple"]')!.getAttribute('aria-selected')).toBe('true')
  })
})
