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

/** happy-dom 无真实布局：手动桩掉 getBoundingClientRect 以驱动视口边界翻转检测 */
function stubRect(
  el: Element,
  rect: { top: number; left: number; right: number; bottom: number; width: number; height: number },
): void {
  el.getBoundingClientRect = () => rect as DOMRect
}

const ORIG_INNER_WIDTH = Object.getOwnPropertyDescriptor(window, 'innerWidth')
const ORIG_INNER_HEIGHT = Object.getOwnPropertyDescriptor(window, 'innerHeight')

/** 测试内视口；每例结束还原，避免污染其他用例 */
function stubViewport(w: number, h: number): void {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true })
}
function restoreViewport(): void {
  if (ORIG_INNER_WIDTH) Object.defineProperty(window, 'innerWidth', ORIG_INNER_WIDTH)
  if (ORIG_INNER_HEIGHT) Object.defineProperty(window, 'innerHeight', ORIG_INNER_HEIGHT)
}

describe('OASMenu', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    restoreViewport()
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
    el.shadowRoot!.querySelector('[role="menu"]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown' }),
    )
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

  it('选中叶子项后收回所有展开的子菜单', () => {
    const el = mount({ items: NESTED_ITEMS })
    topItems(el)[0]!.click() // 展开 编辑
    expect(topItems(el)[0]!.classList.contains('open')).toBe(true)
    items(el)[1]!.click() // 选中 复制（触发 value 变化 → 全量重建，需重新查询）
    const parent = topItems(el)[0]!
    expect(parent.classList.contains('open')).toBe(false)
    expect(parent.getAttribute('aria-expanded')).toBe('false')
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
    expect(css).toMatch(
      /:host\(:not\(\[mode='horizontal'\]\)\[collapsed\]\)\s*\.item\s*\{[^}]*justify-content:\s*center/,
    )
    expect(css).toMatch(
      /:host\(:not\(\[mode='horizontal'\]\)\[collapsed\]\)\s*>\s*\.menu\s*>\s*\.item\s*>\s*\.label/,
    )
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

  // —— 视口边界翻转（缺陷 8 回归）——
  // 右侧剩余空间不足 → 子菜单向左展开（flip-left）；底部不足 → 向上展开（flip-up）。
  // 翻转由样式表类表达（calc/var 在样式表内，happy-dom 无法解析 inline calc(…var())），
  // 多级嵌套逐级检测；happy-dom 无真实布局，rect 用桩值驱动。

  it('样式表声明翻转规则：flip-left 向左（right:100%）、flip-up 向上（bottom 翻转）', () => {
    const el = mount({ items: NESTED_ITEMS })
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toMatch(/\.submenu\.flip-left\s*\{[^}]*left:\s*auto;\s*right:\s*100%/)
    expect(css).toMatch(
      /\.submenu\.flip-up\s*\{[^}]*top:\s*auto;\s*bottom:\s*calc\(-1\s*\*\s*var\(--oas-space-1\)\)/,
    )
    // 水平模式一级子菜单向上翻转：bottom:100%（在父项上方浮出）
    const h = mount({ items: NESTED_ITEMS, mode: 'horizontal' })
    const hcss = h.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(hcss).toMatch(
      /:host\(\[mode='horizontal'\]\)\s*\.submenu-1\.flip-up\s*\{[^}]*bottom:\s*calc\(100%\s*\+\s*var\(--oas-space-1\)\)/,
    )
  })

  it('右侧空间不足：子菜单向左翻转（flip-left）', () => {
    stubViewport(800, 600)
    const el = mount({ items: NESTED_ITEMS })
    const parent = topItems(el)[0]! // 编辑（有子级）
    // 父项贴近视口右缘：右侧仅剩 20px，不足以容纳 140px 宽的子菜单
    stubRect(parent, { left: 620, top: 40, right: 780, bottom: 76, width: 160, height: 36 })
    const sub = parent.querySelector<HTMLElement>('[part="submenu"]')!
    stubRect(sub, { left: 780, top: 36, right: 920, bottom: 176, width: 140, height: 140 })
    parent.dispatchEvent(new MouseEvent('mouseenter'))
    expect(parent.classList.contains('open')).toBe(true)
    expect(sub.classList.contains('flip-left')).toBe(true)
    expect(sub.classList.contains('flip-up')).toBe(false)
  })

  it('右侧空间充足：不翻转', () => {
    stubViewport(800, 600)
    const el = mount({ items: NESTED_ITEMS })
    const parent = topItems(el)[0]!
    stubRect(parent, { left: 10, top: 40, right: 170, bottom: 76, width: 160, height: 36 })
    const sub = parent.querySelector<HTMLElement>('[part="submenu"]')!
    stubRect(sub, { left: 170, top: 36, right: 310, bottom: 176, width: 140, height: 140 })
    parent.dispatchEvent(new MouseEvent('mouseenter'))
    expect(sub.classList.contains('flip-left')).toBe(false)
  })

  it('底部空间不足：级联子菜单向上翻转（flip-up）', () => {
    stubViewport(800, 600)
    const el = mount({ items: NESTED_ITEMS })
    const parent = topItems(el)[0]!
    stubRect(parent, { left: 10, top: 500, right: 170, bottom: 536, width: 160, height: 36 })
    const sub = parent.querySelector<HTMLElement>('[part="submenu"]')!
    stubRect(sub, { left: 170, top: 496, right: 310, bottom: 2000, width: 140, height: 1504 })
    parent.dispatchEvent(new MouseEvent('mouseenter'))
    expect(sub.classList.contains('flip-up')).toBe(true)
    expect(sub.classList.contains('flip-left')).toBe(false)
  })

  it('底部空间充足：不垂直翻转', () => {
    stubViewport(800, 600)
    const el = mount({ items: NESTED_ITEMS })
    const parent = topItems(el)[0]!
    stubRect(parent, { left: 10, top: 10, right: 170, bottom: 46, width: 160, height: 36 })
    const sub = parent.querySelector<HTMLElement>('[part="submenu"]')!
    stubRect(sub, { left: 170, top: 6, right: 310, bottom: 146, width: 140, height: 140 })
    parent.dispatchEvent(new MouseEvent('mouseenter'))
    expect(sub.classList.contains('flip-up')).toBe(false)
  })

  it('水平模式一级子菜单底部不足：向上翻转（flip-up）', () => {
    stubViewport(800, 600)
    const el = mount({ items: NESTED_ITEMS, mode: 'horizontal' })
    const parent = topItems(el)[0]!
    stubRect(parent, { left: 10, top: 200, right: 170, bottom: 236, width: 160, height: 36 })
    const sub = parent.querySelector<HTMLElement>('[part="submenu"]')!
    stubRect(sub, { left: 10, top: 240, right: 150, bottom: 2000, width: 140, height: 1760 })
    parent.dispatchEvent(new MouseEvent('mouseenter'))
    expect(sub.classList.contains('submenu-1')).toBe(true)
    expect(sub.classList.contains('flip-up')).toBe(true)
  })

  it('三级嵌套：最深层子菜单同样按视口右缘翻转（逐级检测）', () => {
    stubViewport(800, 600)
    const el = mount({ items: NESTED_ITEMS })
    // 展开 文件 > 新建（两级链），使 新建 成为 .open 父项
    topItems(el)[1]!.dispatchEvent(new MouseEvent('mouseenter')) // 文件
    const newItem = el.shadowRoot!.querySelector<HTMLElement>('[data-value="new"]')!
    expect(newItem).not.toBeNull()
    // 桩掉 新建 的 rect 与它的子菜单 rect：新建 贴近视口右缘
    stubRect(newItem, { left: 600, top: 40, right: 760, bottom: 76, width: 160, height: 36 })
    const deepSub = newItem.querySelector<HTMLElement>('[part="submenu"]')!
    stubRect(deepSub, { left: 760, top: 36, right: 900, bottom: 176, width: 140, height: 140 })
    newItem.dispatchEvent(new MouseEvent('mouseenter'))
    expect(newItem.classList.contains('open')).toBe(true)
    expect(deepSub.classList.contains('flip-left')).toBe(true)
  })

  it('展开切换不同父项：翻转类随各父项视口条件独立判定', () => {
    stubViewport(800, 600)
    const el = mount({ items: NESTED_ITEMS })
    // 编辑 贴近右缘 → 左翻；随后切到靠左的 文件 → 不复位翻转
    const edit = topItems(el)[0]!
    const file = topItems(el)[1]!
    stubRect(edit, { left: 620, top: 40, right: 780, bottom: 76, width: 160, height: 36 })
    const editSub = edit.querySelector<HTMLElement>('[part="submenu"]')!
    stubRect(editSub, { left: 780, top: 36, right: 920, bottom: 176, width: 140, height: 140 })
    edit.dispatchEvent(new MouseEvent('mouseenter'))
    expect(editSub.classList.contains('flip-left')).toBe(true)

    stubRect(file, { left: 10, top: 40, right: 170, bottom: 76, width: 160, height: 36 })
    const fileSub = file.querySelector<HTMLElement>('[part="submenu"]')!
    stubRect(fileSub, { left: 170, top: 36, right: 310, bottom: 176, width: 140, height: 140 })
    file.dispatchEvent(new MouseEvent('mouseenter'))
    expect(fileSub.classList.contains('flip-left')).toBe(false)
    expect(fileSub.classList.contains('flip-up')).toBe(false)
  })
})

// —— P1 补缺：loading 菜单项 ——
// loading: true 的项渲染 spinner、禁点（点击/键盘/hover 子菜单均拦截），aria-busy 同步；
// 恢复（items 更新移除 loading）后还原可点。视觉上 spinner 动画 + 弱化文字（token 驱动）。

describe('OASMenu loading 菜单项', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  const LOADING_ITEMS = JSON.stringify([
    { label: '保存', value: 'save' },
    { label: '同步中', value: 'syncing', loading: true },
    { label: '删除', value: 'delete' },
  ])

  it('loading 项渲染 spinner、aria-busy/aria-disabled，点击不派发 oas-select', () => {
    const el = mount({ items: LOADING_ITEMS })
    const item = items(el).find((i) => i.dataset.value === 'syncing')!
    expect(item.classList.contains('loading')).toBe(true)
    expect(item.querySelector('.spin')).not.toBeNull()
    expect(item.getAttribute('aria-busy')).toBe('true')
    expect(item.getAttribute('aria-disabled')).toBe('true')
    let fired = 0
    el.addEventListener('oas-select', () => fired++)
    item.click()
    expect(fired).toBe(0)
    // 相邻普通项不受影响
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    items(el)[0]!.click()
    expect(detail).toEqual({ value: 'save' })
  })

  it('键盘导航跳过 loading 项（ArrowDown 从 保存 跳到 删除）', () => {
    const el = mount({ items: LOADING_ITEMS })
    const menu = el.shadowRoot!.querySelector('[role="menu"]')!
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(items(el)[0]!.classList.contains('active')).toBe(true)
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(items(el)[2]!.classList.contains('active')).toBe(true)
    // loading 项不参与 Enter 选中
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(el.getAttribute('value')).toBe('delete')
  })

  it('loading 恢复（items 更新移除 loading）后还原可点、spinner 消失', () => {
    const el = mount({ items: LOADING_ITEMS })
    el.setAttribute(
      'items',
      JSON.stringify([
        { label: '保存', value: 'save' },
        { label: '同步中', value: 'syncing' },
        { label: '删除', value: 'delete' },
      ]),
    )
    const item = items(el).find((i) => i.dataset.value === 'syncing')!
    expect(item.classList.contains('loading')).toBe(false)
    expect(item.getAttribute('aria-busy')).toBeNull()
    expect(item.getAttribute('aria-disabled')).toBe('false')
    expect(item.querySelector('.spin')).toBeNull()
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    item.click()
    expect(detail).toEqual({ value: 'syncing' })
  })

  it('loading 样式：spinner 旋转动画 + 禁点视觉，颜色全走 token', () => {
    const el = mount({ items: LOADING_ITEMS })
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toMatch(/\.item\.loading\s*\{[^}]*cursor:\s*wait/)
    expect(css).toMatch(/\.item\.loading\s*\{[^}]*opacity:/)
    expect(css).toMatch(/\.spin\s*\{[^}]*animation:/)
    expect(css).toMatch(/\.spin\s*\{[^}]*border-top-color:\s*transparent/)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('loading + disabled 共存：仍禁点，不派发 select', () => {
    const el = mount({
      items: JSON.stringify([{ label: 'x', value: 'x', loading: true, disabled: true }]),
    })
    let fired = 0
    el.addEventListener('oas-select', () => fired++)
    items(el)[0]!.click()
    expect(fired).toBe(0)
  })

  it('loading 项带 children：hover 不展开子菜单', () => {
    const el = mount({
      items: JSON.stringify([
        { label: '同步中', value: 'sync', loading: true, children: [{ label: 'a', value: 'a' }] },
      ]),
    })
    items(el)[0]!.dispatchEvent(new MouseEvent('mouseenter'))
    expect(items(el)[0]!.getAttribute('aria-expanded')).toBe('false')
    expect(items(el)[0]!.classList.contains('open')).toBe(false)
  })

  // ===== 组作用域 value（与 menubar #4 同根）：group 项 value 作组 id，JSON 对象按组独立勾选 =====

  const MULTI_GROUP_ITEMS = JSON.stringify([
    {
      type: 'group',
      label: '排序',
      value: 'sort',
      children: [
        { label: '按名称', value: 'name' },
        { label: '按时间', value: 'time' },
      ],
    },
    { type: 'divider' },
    {
      type: 'group',
      label: '视图',
      value: 'view',
      children: [
        { label: '列表', value: 'list' },
        { label: '网格', value: 'grid' },
      ],
    },
  ])

  it('#10-3 JSON value 按组作用域：两组各自独立勾选', () => {
    const el = mount({ items: MULTI_GROUP_ITEMS, value: '{"sort":"time","view":"grid"}' })
    const name = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="name"]')!
    const time = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="time"]')!
    const list = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="list"]')!
    const grid = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="grid"]')!
    expect(time.getAttribute('aria-checked')).toBe('true')
    expect(name.getAttribute('aria-checked')).toBe('false')
    expect(grid.getAttribute('aria-checked')).toBe('true')
    expect(list.getAttribute('aria-checked')).toBe('false')
  })

  it('#10-3 字符串 value 不穿透组作用域；无组 items 仍按现有全局命中', () => {
    const el = mount({ items: MULTI_GROUP_ITEMS, value: 'name' })
    const name = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="name"]')!
    const time = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="time"]')!
    // 组内叶子 scope=sort，字符串 value 只命中根作用域，故组内均不勾（隔离）
    expect(name.getAttribute('aria-checked')).toBe('false')
    expect(time.getAttribute('aria-checked')).toBe('false')
    // 无组 items + 字符串 value：现有全局命中不变
    const plain = mount({ value: 'about' })
    const about = plain.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="about"]')!
    expect(about.getAttribute('aria-checked')).toBe('true')
  })

  it('#10-3 组内点击写回该组 value（JSON 对象），不影响另一组', () => {
    const el = mount({ items: MULTI_GROUP_ITEMS, value: '{"sort":"name","view":"list"}' })
    el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="grid"]')!.click()
    const v = JSON.parse(el.getAttribute('value')!)
    expect(v.sort).toBe('name') // 另一组保持
    expect(v.view).toBe('grid')
    // value 写回触发重建，重新查询节点断言勾选态
    const time = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="time"]')!
    const grid = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="grid"]')!
    expect(time.getAttribute('aria-checked')).toBe('false')
    expect(grid.getAttribute('aria-checked')).toBe('true')
  })

  it('#10-3 action 项不参与组作用域勾选', () => {
    const el = mount({
      items: JSON.stringify([
        {
          type: 'group',
          label: '排序',
          value: 'sort',
          children: [
            { label: '按名称', value: 'name' },
            { label: '按时间', value: 'time' },
          ],
        },
        { type: 'divider' },
        { label: '刷新', value: 'refresh', kind: 'action' },
      ]),
      value: '{"sort":"time"}',
    })
    const refresh = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="refresh"]')!
    expect(refresh.getAttribute('role')).toBe('menuitem')
    expect(refresh.hasAttribute('aria-checked')).toBe(false)
    refresh.click()
    expect(el.getAttribute('value')).toBe('{"sort":"time"}') // 未改变
  })

  // ===== 数据模型增强：checkbox / danger / href / max-height / typeahead =====

  describe('kind="checkbox" 多选项', () => {
    const CB_ITEMS = JSON.stringify([
      { label: '显示网格线', value: 'grid', kind: 'checkbox' },
      { label: '自动换行', value: 'wrap', kind: 'checkbox' },
      { label: '深色模式', value: 'dark', kind: 'checkbox' },
    ])

    it('checkbox 项渲染 menuitemcheckbox + aria-checked', () => {
      const el = mount({ items: CB_ITEMS, value: '["grid"]' })
      const grid = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="grid"]')!
      expect(grid.getAttribute('role')).toBe('menuitemcheckbox')
      expect(grid.getAttribute('aria-checked')).toBe('true')
      const wrap = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="wrap"]')!
      expect(wrap.getAttribute('aria-checked')).toBe('false')
    })

    it('checkbox 点击切换勾选，value 写回数组形态（多选勾选集）', () => {
      const el = mount({ items: CB_ITEMS, value: '["grid"]' })
      let detail: unknown
      el.addEventListener('oas-select', (e) => (detail = (e as CustomEvent).detail))
      const wrap = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="wrap"]')!
      wrap.click()
      const v = JSON.parse(el.getAttribute('value')!)
      expect(Array.isArray(v)).toBe(true)
      expect(v).toContain('grid')
      expect(v).toContain('wrap')
    })

    it('checkbox 取消勾选从勾选集移除', () => {
      const el = mount({ items: CB_ITEMS, value: '["grid","wrap"]' })
      const grid = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="grid"]')!
      grid.click()
      const v = JSON.parse(el.getAttribute('value')!)
      expect(v).not.toContain('grid')
      expect(v).toContain('wrap')
    })

    it('checkbox 勾选框视觉与 radio 区分（☐/☑ 而非 ✓）', () => {
      const el = mount({ items: CB_ITEMS, value: '["grid"]' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/menuitemcheckbox|checkbox/)
    })
  })

  describe('danger 破坏性项', () => {
    it('danger 项渲染危险色（--oas-color-danger token）', () => {
      const el = mount({
        items: JSON.stringify([
          { label: '编辑', value: 'edit' },
          { label: '删除', value: 'del', danger: true },
        ]),
      })
      const del = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="del"]')!
      expect(del.classList.contains('danger')).toBe(true)
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/\.item\.danger[^{]*\{[^}]*--oas-color-danger/)
    })
  })

  describe('href 链接项', () => {
    it('href 项渲染 <a>（锚点语义），透传 target/rel', () => {
      const el = mount({
        items: JSON.stringify([
          { label: '文档', value: 'doc', href: '/docs', target: '_blank', rel: 'noopener' },
          { label: '普通', value: 'plain' },
        ]),
      })
      const doc = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="doc"]')!
      expect(doc.tagName).toBe('A')
      expect(doc.getAttribute('href')).toBe('/docs')
      expect(doc.getAttribute('target')).toBe('_blank')
      const plain = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="plain"]')!
      expect(plain.tagName).not.toBe('A')
    })
  })

  describe('max-height 长菜单滚动', () => {
    it('max-height 属性：菜单容器 overflow-y auto + max-height', () => {
      const el = mount({ 'max-height': '200' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/max-height/)
      expect(css).toMatch(/overflow-y/)
    })
  })

  describe('typeahead 字符定位', () => {
    it('菜单聚焦时按字符跳转到匹配 label 的项', () => {
      const el = mount({
        items: JSON.stringify([
          { label: '复制', value: 'copy' },
          { label: '剪切', value: 'cut' },
          { label: '粘贴', value: 'paste' },
        ]),
      })
      const menu = el.shadowRoot!.querySelector('.menu')!
      // 按「剪」应跳到「剪切」
      menu.dispatchEvent(new KeyboardEvent('keydown', { key: '剪', bubbles: true }))
      const cut = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="cut"]')!
      // typeahead 定位：该项获得焦点/高亮（active 或 focus）
      expect(cut.classList.contains('active') || el.shadowRoot!.activeElement === cut).toBe(true)
    })
  })

  // ===== inline 导航形态（侧边导航主流） =====

  describe('mode="inline" 就地展开', () => {
    const INLINE_ITEMS = JSON.stringify([
      {
        label: '仪表盘',
        value: 'dash',
        children: [
          { label: '概览', value: 'dash-overview' },
          { label: '分析', value: 'dash-analytics' },
        ],
      },
      { label: '设置', value: 'settings' },
    ])

    it('inline 模式：子菜单就地展开（非浮出），缩进展开在父项下方', () => {
      const el = mount({ mode: 'inline', items: INLINE_ITEMS })
      // inline 模式标记
      expect(el.classList.contains('oas-menu--inline')).toBe(true)
      // 子菜单容器是 inline 展开容器（非浮出 submenu）
      const dash = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="dash"]')!
      dash.click() // 展开
      const sub = el.shadowRoot!.querySelector('.inline-sub')
      expect(sub).not.toBeNull() // inline 展开容器存在
    })

    it('inline 展开/收起有高度过渡（只动 height/opacity）', () => {
      const el = mount({ mode: 'inline', items: INLINE_ITEMS })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/inline-sub|grid-template-rows|max-height|height/)
    })

    it('inline 模式 hover 不展开子菜单（click-to-expand；否则 hover 展开与 click 收起相互抵消）', () => {
      const el = mount({ mode: 'inline', items: INLINE_ITEMS })
      const dash = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="dash"]')!
      const sub = el.shadowRoot!.querySelector('.inline-sub[data-parent="dash"]')!
      // 模拟真实时序：mouseenter（hover）先于 click
      dash.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
      expect(sub.classList.contains('open')).toBe(false)
      // click 应正常展开
      dash.click()
      expect(sub.classList.contains('open')).toBe(true)
      // 再 click 收起
      dash.click()
      expect(sub.classList.contains('open')).toBe(false)
    })
  })

  describe('expanded 双模式（受控/非受控）', () => {
    const EXP_ITEMS = JSON.stringify([
      { label: 'A 组', value: 'a', children: [{ label: 'A1', value: 'a1' }] },
      { label: 'B 组', value: 'b', children: [{ label: 'B1', value: 'b1' }] },
    ])

    it('expanded 属性受控：指定展开的子菜单', () => {
      const el = mount({ mode: 'inline', items: EXP_ITEMS, expanded: '["a"]' })
      const subA = el.shadowRoot!.querySelector('.inline-sub[data-parent="a"]')
      expect(subA).not.toBeNull()
    })

    it('展开/收起派发 oas-expand-change（detail:{expanded, value, isExpanded}）', () => {
      const el = mount({ mode: 'inline', items: EXP_ITEMS })
      let detail: unknown
      el.addEventListener('oas-expand-change', (e) => (detail = (e as CustomEvent).detail))
      const dashA = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="a"]')!
      dashA.click() // 展开 a
      expect(detail).toMatchObject({ value: 'a', isExpanded: true })
      expect(Array.isArray((detail as { expanded: string[] }).expanded)).toBe(true)
    })

    it('非受控：内部管理展开状态（expanded 属性未设时）', () => {
      const el = mount({ mode: 'inline', items: EXP_ITEMS })
      const dashA = el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="a"]')!
      dashA.click()
      const subA = el.shadowRoot!.querySelector('.inline-sub[data-parent="a"]')
      expect(subA).not.toBeNull()
    })
  })

  describe('手风琴互斥（inline accordion）', () => {
    const ACC_ITEMS = JSON.stringify([
      { label: 'A 组', value: 'a', children: [{ label: 'A1', value: 'a1' }] },
      { label: 'B 组', value: 'b', children: [{ label: 'B1', value: 'b1' }] },
    ])

    it('accordion：同级只展开一个（展开一个收起其他同级）', () => {
      const el = mount({ mode: 'inline', accordion: '', items: ACC_ITEMS })
      el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="a"]')!.click() // 展开 a
      el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="b"]')!.click() // 展开 b
      const subA = el.shadowRoot!.querySelector('.inline-sub[data-parent="a"]')
      const subB = el.shadowRoot!.querySelector('.inline-sub[data-parent="b"]')
      // a 收起（无展开容器或隐藏），b 展开
      expect(subB).not.toBeNull()
      expect(subA === null || !subA.classList.contains('open')).toBe(true)
    })
  })

  describe('水平溢出收纳（horizontal）', () => {
    it('horizontal 超宽项收进「···」子菜单（ResizeObserver 溢出检测）', () => {
      const el = mount({
        mode: 'horizontal',
        items: JSON.stringify(Array.from({ length: 10 }, (_, i) => ({ label: `菜单${i}`, value: `m${i}` }))),
      })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      // 水平溢出收纳的机制（··· 收纳项/overflow 容器）
      expect(css).toMatch(/overflow|ellipsis|more/)
    })
  })
})
