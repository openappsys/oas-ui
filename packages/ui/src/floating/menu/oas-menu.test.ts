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

const GROUP_ITEMS = JSON.stringify([
  {
    type: 'group',
    label: '导航',
    children: [
      { label: '首页', value: 'home' },
      { label: '关于', value: 'about' },
    ],
  },
  { type: 'divider' },
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

/** 顶层菜单项（.menu 直接子级，不含子菜单内项） */
function topItems(el: OASMenu): HTMLElement[] {
  return [...el.shadowRoot!.querySelector('.menu')!.children].filter((c) =>
    c.classList.contains('item'),
  ) as HTMLElement[]
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
    expect(topItems(el).length).toBe(3)
    // 子菜单始终在 DOM，但默认隐藏（父项无 .open、aria-expanded=false）
    const firstParent = topItems(el)[0]!
    expect(firstParent.getAttribute('aria-expanded')).toBe('false')
    expect(firstParent.classList.contains('open')).toBe(false)
    expect(firstParent.querySelector('[part="submenu"]')).not.toBeNull()
  })

  it('点击展开显示子项，再点击收起', () => {
    const el = mount({ items: NESTED_ITEMS })
    const parent = topItems(el)[0]!
    parent.click()
    expect(parent.getAttribute('aria-expanded')).toBe('true')
    expect(parent.classList.contains('open')).toBe(true)
    parent.click()
    expect(parent.getAttribute('aria-expanded')).toBe('false')
    expect(parent.classList.contains('open')).toBe(false)
  })

  it('hover 展开子菜单', () => {
    const el = mount({ items: NESTED_ITEMS })
    const parent = topItems(el)[1]! // 文件（有子级）
    parent.dispatchEvent(new MouseEvent('mouseenter'))
    expect(parent.getAttribute('aria-expanded')).toBe('true')
    expect(parent.classList.contains('open')).toBe(true)
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
    const parent = topItems(el)[0]!
    const activeEl = () => el.shadowRoot!.querySelector('.item.active')
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })) // active=0 编辑
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })) // 进入编辑子菜单
    expect(parent.getAttribute('aria-expanded')).toBe('true')
    expect(parent.classList.contains('open')).toBe(true)
    expect(activeEl()!.textContent).toContain('复制') // 复制高亮
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })) // 返回父级
    expect(parent.getAttribute('aria-expanded')).toBe('false')
    expect(parent.classList.contains('open')).toBe(false)
    expect(activeEl()!.textContent).toContain('编辑') // 编辑高亮
  })

  it('三级嵌套：进入再进入，选中最深子项', () => {
    const el = mount({ items: NESTED_ITEMS })
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    const menu = el.shadowRoot!.querySelector('[role="menu"]')!
    const activeEl = () => el.shadowRoot!.querySelector('.item.active')
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })) // 编辑
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })) // 文件
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })) // 进入 文件 > 新建/打开
    expect(topItems(el)[1]!.classList.contains('open')).toBe(true)
    expect(activeEl()!.textContent).toContain('新建') // 新建高亮
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })) // 进入 新建 > 文件/窗口
    expect(activeEl()!.textContent).toContain('文件') // 文件高亮
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(detail).toEqual({ value: 'new-file' })
  })

  it('子菜单样式：菜单项禁止逐字换行、子菜单为级联浮出面板（CSS 规则存在性断言）', () => {
    const el = mount({ items: NESTED_ITEMS })
    items(el)[0]!.click() // 展开子菜单，确保 submenu 存在
    expect(submenuEl(el)).not.toBeNull()
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    // 菜单项禁止中文断裂换行
    expect(css).toContain('white-space: nowrap;')
    // 子菜单：级联浮出（绝对定位于父项右侧，独立背景/边框/阴影）
    expect(css).toMatch(/\.submenu\s*\{[^}]*position:\s*absolute/)
    expect(css).toMatch(/\.submenu\s*\{[^}]*left:\s*100%/)
    expect(css).toMatch(/\.item\s*\{[^}]*position:\s*relative/)
    // 实际 DOM 中嵌套项均带 item 类
    for (const it of items(el)) {
      expect(it.classList.contains('item')).toBe(true)
    }
  })

  it('子菜单级联浮出：面板独立背景/边框/阴影，层级可继续嵌套（CSS + 结构断言）', () => {
    const el = mount({ items: NESTED_ITEMS })
    items(el)[0]!.click()
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    // 浮出面板：独立背景与边框、圆角、投影，不随父项 hover 背景整块罩住
    expect(css).toMatch(/\.submenu\s*\{[^}]*background:\s*var\(--oas-color-bg\)/)
    expect(css).toMatch(/\.submenu\s*\{[^}]*border:\s*1px\s+solid/)
    expect(css).toMatch(/\.submenu\s*\{[^}]*box-shadow:/)
    // 结构：子菜单内嵌套项依然带 item 类，且层级可继续嵌套
    const sub = submenuEl(el)!
    expect(sub.querySelectorAll('[part="item"]').length).toBe(2)
    for (const it of sub.querySelectorAll('[part="item"]')) {
      expect((it as HTMLElement).classList.contains('item')).toBe(true)
    }
  })

  it('水平模式：菜单项横排，一级子菜单向下浮出（top:100%; left:0）', () => {
    const el = mount({ items: NESTED_ITEMS, mode: 'horizontal' })
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    // 菜单项横排
    expect(css).toMatch(/:host\(\[mode='horizontal'\]\)\s*\.menu\s*\{[^}]*display:\s*flex/)
    expect(css).toMatch(/:host\(\[mode='horizontal'\]\)\s*\.menu\s*\{[^}]*flex-direction:\s*row/)
    // 一级子菜单向下浮出
    expect(css).toMatch(/\.submenu-1\s*\{[^}]*top:\s*100%/)
    expect(css).toMatch(/\.submenu-1\s*\{[^}]*left:\s*0/)
    // 展开一级子菜单：带 submenu-1 类，内容为完整菜单
    items(el)[0]!.click()
    const sub = submenuEl(el)!
    expect(sub.classList.contains('submenu-1')).toBe(true)
    expect(sub.querySelectorAll('[part="item"]').length).toBe(2)
  })

  it('收起态（collapsed，仅 vertical）：收窄只显示图标，hover 浮出完整子菜单', () => {
    const el = mount({ items: NESTED_ITEMS, collapsed: '' })
    expect(el.hasAttribute('collapsed')).toBe(true)
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    // 项居中收窄、顶层 label/arrow 隐藏
    expect(css).toMatch(/:host\(:not\(\[mode='horizontal'\]\)\[collapsed\]\)\s*\.item\s*\{[^}]*justify-content:\s*center/)
    expect(css).toMatch(/:host\(:not\(\[mode='horizontal'\]\)\[collapsed\]\)\s*>\s*\.menu\s*>\s*\.item\s*>\s*\.label/)
    // hover 浮出子菜单（子菜单为完整菜单）
    items(el)[0]!.dispatchEvent(new MouseEvent('mouseenter'))
    expect(items(el)[0]!.getAttribute('aria-expanded')).toBe('true')
    expect(submenuEl(el)).not.toBeNull()
    // 叶子项仍可选
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    items(el)[1]!.click()
    expect(detail).toEqual({ value: 'copy' })
  })

  it('分组：渲染组标题分区，子项平铺同层，组标题不可点、子项可选中', () => {
    const el = mount({ items: GROUP_ITEMS })
    const group = el.shadowRoot!.querySelector('[part="group"]')
    expect(group).not.toBeNull()
    expect(group!.getAttribute('role')).toBe('none')
    expect(group!.querySelector('.group-label')!.textContent).toBe('导航')
    // 子项平铺：items() 只统计可点项（首页/关于/设置），组标题与分隔线不计入
    expect(items(el).length).toBe(3)
    // 组标题不可点
    let fired = 0
    el.addEventListener('oas-select', () => fired++)
    ;(group as HTMLElement).click()
    expect(fired).toBe(0)
    // 组内子项可正常选中
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    items(el)[1]!.click()
    expect(detail).toEqual({ value: 'about' })
  })

  it('分组+分隔线：键盘导航跳过组标题与分隔线', () => {
    const el = mount({ items: GROUP_ITEMS })
    const menu = el.shadowRoot!.querySelector('[role="menu"]')!
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(items(el)[0]!.classList.contains('active')).toBe(true) // 首页
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(items(el)[1]!.classList.contains('active')).toBe(true) // 关于（跳过组标题）
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(items(el)[2]!.classList.contains('active')).toBe(true) // 设置（跳过分隔线）
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(el.getAttribute('value')).toBe('settings')
  })

  it('分隔线：渲染细分隔线（role=separator），不可点', () => {
    const el = mount({ items: GROUP_ITEMS })
    const divider = el.shadowRoot!.querySelector('[part="divider"]')
    expect(divider).not.toBeNull()
    expect(divider!.getAttribute('role')).toBe('separator')
    let fired = 0
    el.addEventListener('oas-select', () => fired++)
    ;(divider as HTMLElement).click()
    expect(fired).toBe(0)
  })

  it('图标：带 icon 的项渲染内联 SVG 图标在文字左侧，无图标项不渲染', () => {
    const el = mount({
      items: JSON.stringify([
        { label: '用户', value: 'user', icon: 'user' },
        { label: '设置', value: 'settings', icon: 'gear' },
      ]),
    })
    const icon = items(el)[0]!.querySelector('.icon')
    expect(icon).not.toBeNull()
    expect(icon!.querySelector('svg')).not.toBeNull()
    const plain = mount({ items: JSON.stringify([{ label: '普通', value: 'plain' }]) })
    expect(plain.shadowRoot!.querySelector('[part="item"] .icon')).toBeNull()
  })

  it('暗色主题：theme="dark" 写入 data-theme 到自身（局部暗色，独立于全局），样式不硬编码色值', () => {
    const el = mount({ items: ITEMS, theme: 'dark' })
    expect(el.dataset.theme).toBe('dark')
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    el.removeAttribute('theme')
    expect(el.dataset.theme).toBeUndefined()
  })
})
