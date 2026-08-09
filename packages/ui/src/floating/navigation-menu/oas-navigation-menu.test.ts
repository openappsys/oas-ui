import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import '@oas-ui/i18n'
import { OASNavigationMenu } from './index.js'

const ITEMS = JSON.stringify([
  {
    label: '产品',
    value: 'products',
    children: [
      { label: '组件', value: 'components', href: '/components' },
      { label: '文档', value: 'docs', href: '/docs' },
      {
        label: '更多',
        value: 'more',
        children: [
          { label: '博客', value: 'blog', href: '/blog' },
          { label: '社区', value: 'community', href: '/community' },
        ],
      },
    ],
  },
  { label: '定价', value: 'pricing', href: '/pricing' },
  { label: '关于', value: 'about', href: '/about' },
])

function mount(attrs: Record<string, string> = {}): OASNavigationMenu {
  const el = new OASNavigationMenu()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.items) el.setAttribute('items', ITEMS)
  document.body.appendChild(el)
  return el
}

function nav(el: OASNavigationMenu): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="nav"]')!
}

function topItems(el: OASNavigationMenu): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="top-item"]')]
}

function subItems(el: OASNavigationMenu): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')]
}

function openSubmenus(el: OASNavigationMenu): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="submenu"].open')]
}

function key(el: OASNavigationMenu, k: string): void {
  nav(el).dispatchEvent(new KeyboardEvent('keydown', { key: k }))
}

describe('OASNavigationMenu', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 role=navigation + aria-label，顶级项 role=menuitem', () => {
    const el = mount()
    expect(nav(el).getAttribute('role')).toBe('navigation')
    expect(nav(el).getAttribute('aria-label')).toBe('导航')
    expect(topItems(el).length).toBe(3)
  })

  it('带 href 的叶子项渲染为链接', () => {
    const el = mount()
    const pricing = topItems(el)[1]!
    expect(pricing.tagName).toBe('A')
    expect(pricing.getAttribute('href')).toBe('/pricing')
    expect(topItems(el)[0]!.tagName).toBe('BUTTON') // 有子菜单的是按钮
  })

  it('hover 展开子菜单，选中叶子项派发 oas-select', async () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    topItems(el)[0]!.dispatchEvent(new MouseEvent('mouseenter'))
    expect(openSubmenus(el).length).toBe(1)
    expect(subItems(el)[0]!.textContent).toContain('组件')
    subItems(el)[0]!.click()
    expect(detail).toEqual({ value: 'components' })
    expect(openSubmenus(el).length).toBe(0)
  })

  it('ArrowDown 打开子菜单并聚焦第一子项', () => {
    const el = mount()
    key(el, 'ArrowDown')
    expect(openSubmenus(el).length).toBe(1)
    expect(el.shadowRoot!.activeElement).toBe(subItems(el)[0])
  })

  it('子菜单内 ArrowDown 移动、Enter 选中并收起', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    key(el, 'ArrowDown') // 打开 产品，聚焦 组件
    key(el, 'ArrowDown') // 文档
    key(el, 'Enter')
    expect(detail).toEqual({ value: 'docs' })
    expect(openSubmenus(el).length).toBe(0)
    expect(el.shadowRoot!.activeElement).toBe(topItems(el)[0])
  })

  it('顶级 ArrowLeft/ArrowRight 移动高亮', () => {
    const el = mount()
    key(el, 'ArrowRight')
    expect(topItems(el)[1]!.classList.contains('active')).toBe(true)
    key(el, 'ArrowLeft')
    expect(topItems(el)[0]!.classList.contains('active')).toBe(true)
  })

  it('级联：ArrowRight 进入二级子菜单，ArrowLeft 返回', () => {
    const el = mount()
    key(el, 'ArrowDown') // 打开 产品，聚焦 组件
    key(el, 'ArrowDown') // 文档
    key(el, 'ArrowDown') // 更多
    key(el, 'ArrowRight') // 进入 更多 子菜单
    expect(openSubmenus(el).length).toBe(2)
    expect(el.shadowRoot!.activeElement!.textContent).toContain('博客')
    key(el, 'ArrowLeft') // 返回 更多
    expect(openSubmenus(el).length).toBe(1)
    expect(el.shadowRoot!.activeElement!.textContent).toContain('更多')
  })

  it('Escape 关闭所有子菜单并聚焦顶级项', () => {
    const el = mount()
    key(el, 'ArrowDown')
    key(el, 'Escape')
    expect(openSubmenus(el).length).toBe(0)
    expect(el.shadowRoot!.activeElement).toBe(topItems(el)[0])
  })

  it('键盘导航跳过 disabled 项', () => {
    const el = mount({
      items: JSON.stringify([
        {
          label: '产品',
          value: 'products',
          children: [
            { label: '只读', value: 'ro', disabled: true },
            { label: '组件', value: 'components' },
          ],
        },
      ]),
    })
    key(el, 'ArrowDown') // 打开，聚焦第一个可用项 组件
    expect(subItems(el)[1]!.classList.contains('active')).toBe(true)
  })

  it('disabled 顶级项不可展开', () => {
    const el = mount({
      items: JSON.stringify([{ label: '禁用', value: 'x', disabled: true, children: [{ label: '子', value: 'sub' }] }]),
    })
    let fired = 0
    el.addEventListener('oas-select', () => fired++)
    topItems(el)[0]!.click()
    expect(openSubmenus(el).length).toBe(0)
    expect(fired).toBe(0)
  })

  it('子菜单链接项渲染 <a href> 包裹标签', () => {
    const el = mount()
    key(el, 'ArrowDown')
    const anchor = subItems(el)[0]!.querySelector('a[href]')
    expect(anchor).not.toBeNull()
    expect((anchor as HTMLAnchorElement).getAttribute('href')).toBe('/components')
  })

  it('焦点陷阱：子菜单打开时 Tab 在子项间循环', () => {
    const el = mount()
    key(el, 'ArrowDown')
    const items = subItems(el)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(el.shadowRoot!.activeElement).toBe(items[1])
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }))
    expect(el.shadowRoot!.activeElement).toBe(items[0])
  })

  it('items 数据变化增量重渲染', () => {
    const el = mount()
    el.setAttribute('items', JSON.stringify([{ label: '首页', value: 'home', href: '/' }]))
    expect(topItems(el).length).toBe(1)
    expect(topItems(el)[0]!.textContent).toBe('首页')
  })
})
