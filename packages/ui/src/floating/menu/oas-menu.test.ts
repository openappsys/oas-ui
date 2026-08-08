import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASMenu } from './index.js'

const ITEMS = JSON.stringify([
  { label: '首页', value: 'home' },
  { label: '关于', value: 'about' },
  { label: '设置', value: 'settings' },
])

const NESTED_ITEMS = JSON.stringify([
  {
    label: '编辑',
    value: 'edit',
    children: [
      { label: '复制', value: 'copy' },
      { label: '剪切', value: 'cut' },
    ],
  },
  {
    label: '文件',
    value: 'file',
    children: [
      {
        label: '新建',
        value: 'new',
        children: [
          { label: '文件', value: 'new-file' },
          { label: '窗口', value: 'new-window' },
        ],
      },
      { label: '打开', value: 'open' },
    ],
  },
  { label: '视图', value: 'view' },
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

function submenuEl(el: OASMenu): HTMLElement | null {
  return el.shadowRoot!.querySelector('[part="submenu"]')
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
    expect(items(el)[0]!.classList.contains('active')).toBe(true)
  })

  it('ArrowDown 连续移动，Enter 选中', () => {
    const el = mount()
    const menu = el.shadowRoot!.querySelector('[role="menu"]')!
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(items(el)[1]!.classList.contains('active')).toBe(true)
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(el.getAttribute('value')).toBe('about')
  })

  it('disabled 项不可选', async () => {
    const el = mount({ items: JSON.stringify([{ label: 'a', value: 'a', disabled: true }]) })
    let fired = 0
    el.addEventListener('oas-select', () => fired++)
    items(el)[0]!.click()
    expect(fired).toBe(0)
  })

  it('渲染嵌套项默认收起', () => {
    const el = mount({ items: NESTED_ITEMS })
    expect(items(el).length).toBe(3)
    expect(submenuEl(el)).toBeNull()
    expect(items(el)[0]!.getAttribute('aria-expanded')).toBe('false')
  })

  it('点击展开显示子项，再点击收起', () => {
    const el = mount({ items: NESTED_ITEMS })
    items(el)[0]!.click()
    expect(items(el)[0]!.getAttribute('aria-expanded')).toBe('true')
    expect(submenuEl(el)).not.toBeNull()
    expect(items(el).length).toBe(5) // 编辑 + 复制/剪切 + 文件 + 视图
    items(el)[0]!.click()
    expect(submenuEl(el)).toBeNull()
    expect(items(el).length).toBe(3)
  })

  it('hover 展开子菜单', () => {
    const el = mount({ items: NESTED_ITEMS })
    items(el)[1]!.dispatchEvent(new MouseEvent('mouseenter'))
    expect(items(el)[1]!.getAttribute('aria-expanded')).toBe('true')
    expect(items(el).length).toBeGreaterThan(3)
  })

  it('选中子项派发 oas-select 且 value 为子项 value', () => {
    const el = mount({ items: NESTED_ITEMS })
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    // 展开 编辑 > 复制
    items(el)[0]!.click()
    items(el)[1]!.click()
    expect(detail).toEqual({ value: 'copy' })
    expect(el.getAttribute('value')).toBe('copy')
    expect(items(el)[1]!.getAttribute('aria-checked')).toBe('true')
  })

  it('ArrowRight 进入子菜单，ArrowLeft 返回', () => {
    const el = mount({ items: NESTED_ITEMS })
    const menu = el.shadowRoot!.querySelector('[role="menu"]')!
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })) // active=0 编辑
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })) // 进入编辑子菜单
    expect(items(el)[0]!.getAttribute('aria-expanded')).toBe('true')
    expect(items(el).length).toBe(5)
    expect(items(el)[1]!.classList.contains('active')).toBe(true) // 复制高亮
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })) // 返回父级
    expect(items(el)[0]!.getAttribute('aria-expanded')).toBe('false')
    expect(items(el).length).toBe(3)
    expect(items(el)[0]!.classList.contains('active')).toBe(true) // 编辑高亮
  })

  it('三级嵌套：进入再进入，选中最深子项', () => {
    const el = mount({ items: NESTED_ITEMS })
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    const menu = el.shadowRoot!.querySelector('[role="menu"]')!
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })) // 编辑
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })) // 文件
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })) // 进入 文件 > 新建/打开
    expect(items(el).length).toBe(5)
    expect(items(el)[2]!.classList.contains('active')).toBe(true) // 新建高亮
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })) // 进入 新建 > 文件/窗口
    expect(items(el).length).toBe(7)
    expect(items(el)[3]!.classList.contains('active')).toBe(true) // 文件高亮
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(detail).toEqual({ value: 'new-file' })
  })

  it('子菜单样式：菜单项禁止逐字换行、子菜单独占一行且有最小宽度（CSS 规则存在性断言）', () => {
    const el = mount({ items: NESTED_ITEMS })
    items(el)[0]!.click() // 展开子菜单，确保 submenu 存在
    expect(submenuEl(el)).not.toBeNull()
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    // 菜单项禁止中文断裂换行
    expect(css).toContain('white-space: nowrap;')
    // 子菜单容器：独占一行 + 最小宽度
    expect(css).toMatch(/\.submenu\s*\{[^}]*flex-basis:\s*100%/)
    expect(css).toMatch(/\.submenu\s*\{[^}]*min-width:\s*120px/)
    // 实际 DOM 中嵌套项均带 item 类
    for (const it of items(el)) {
      expect(it.classList.contains('item')).toBe(true)
    }
  })
})
