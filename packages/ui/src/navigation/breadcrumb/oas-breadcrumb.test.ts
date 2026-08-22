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

  // ===== A 档：项 icon / 图标分隔符 / 真实链接 / disabled / 折叠保留数 =====

  it('A1 项 icon：item.icon 渲染前置 svg（part=icon），无效图标名不渲染', () => {
    const el = mountWith({
      items: JSON.stringify([
        { label: '首页', href: '/', icon: 'star' },
        { label: '组件', href: '/components' },
        { label: '面包屑' },
      ]),
    })
    const root = el.shadowRoot!
    const link = root.querySelector<HTMLAnchorElement>('nav > .item > a[part="link"]')!
    const icon = link.querySelector<SVGElement>('[part="icon"]')
    expect(icon).not.toBeNull()
    expect(icon!.getAttribute('aria-hidden')).toBe('true')
    expect(icon!.querySelector('path')).not.toBeNull()
    // 文本在图标之后
    expect(link.lastElementChild!.classList.contains('item-text')).toBe(true)
    // 无效图标名 → 不渲染
    const el2 = mountWith({
      items: JSON.stringify([{ label: '首页', href: '/', icon: 'not-exist' }]),
    })
    expect(el2.shadowRoot!.querySelector('[part="icon"]')).toBeNull()
  })

  it('A2 图标分隔符：separator 匹配图标名时渲染 svg，否则渲染文本', () => {
    const el = mountWith({ items: ITEMS, separator: 'chevron-right' })
    const root = el.shadowRoot!
    const seps = root.querySelectorAll('.sep')
    expect(seps.length).toBe(2)
    expect(seps[0]!.querySelector('svg')).not.toBeNull()
    expect(seps[0]!.textContent).toBe('')
    // 非图标名 → 文本
    const el2 = mountWith({ items: ITEMS, separator: '›' })
    const sep2 = el2.shadowRoot!.querySelector('.sep')!
    expect(sep2.querySelector('svg')).toBeNull()
    expect(sep2.textContent).toBe('›')
  })

  it('A2 项级分隔符：item.separator 覆盖全局 separator（同样支持图标名）', () => {
    const el = mountWith({
      items: JSON.stringify([
        { label: '首页', href: '/', separator: 'heart' },
        { label: '组件', href: '/components' },
        { label: '面包屑' },
      ]),
      separator: '/',
    })
    const root = el.shadowRoot!
    const seps = root.querySelectorAll('.sep')
    expect(seps[0]!.querySelector('svg')).not.toBeNull() // 首项 item.separator=heart → 图标
    expect(seps[1]!.textContent).toBe('/') // 第二项未配置 → 全局
  })

  it('A3 真实链接：href 不阻止默认行为（原生跳转）、支持 target，空/# 才阻止', () => {
    const el = mountWith({
      items: JSON.stringify([
        { label: '首页', href: '/', target: '_blank' },
        { label: '组件', href: '#' },
        { label: '面包屑' },
      ]),
    })
    const root = el.shadowRoot!
    const links = root.querySelectorAll<HTMLAnchorElement>('a[part="link"]')
    expect(links.length).toBe(2)
    // target 透传 + _blank 自动补 noopener
    expect(links[0]!.target).toBe('_blank')
    expect(links[0]!.getAttribute('rel')).toContain('noopener')
    // 真实 href：点击不阻止默认行为（宿主可自行拦截导航做路由）
    let prevented = false
    links[0]!.addEventListener('click', (e: Event) => {
      if (e.defaultPrevented) prevented = true
    })
    links[0]!.click()
    expect(prevented).toBe(false)
    // href="#"：仅作动作链接，阻止默认跳转
    let prevented2 = false
    links[1]!.addEventListener('click', (e: Event) => {
      if (e.defaultPrevented) prevented2 = true
    })
    links[1]!.click()
    expect(prevented2).toBe(true)
  })

  it('A4 disabled 项：aria-disabled 非交互、点击不派发 oas-select', () => {
    const el = mountWith({
      items: JSON.stringify([
        { label: '首页', href: '/' },
        { label: '禁用', href: '/forbidden', disabled: true },
        { label: '面包屑' },
      ]),
    })
    const root = el.shadowRoot!
    const d = root.querySelector<HTMLElement>('[part="disabled"]')!
    expect(d).not.toBeNull()
    expect(d.getAttribute('aria-disabled')).toBe('true')
    expect(d.textContent).toBe('禁用')
    let fired = 0
    el.addEventListener('oas-select', () => fired++)
    d.click()
    expect(fired).toBe(0)
    expect(root.querySelectorAll('a[part="link"]').length).toBe(1)
  })

  it('A5 items-before-collapse / items-after-collapse 控制折叠保留数', () => {
    const el = mountWith({
      items: LONG_ITEMS,
      collapsed: '',
      'max-items': '4',
      'items-before-collapse': '2',
      'items-after-collapse': '1',
    })
    const root = el.shadowRoot!
    // 可见序列：首页 / 组件 / … / 面包屑
    const visible = [...root.querySelectorAll('nav > .item > a[part="link"]')].map(
      (a) => a.textContent,
    )
    expect(visible).toEqual(['首页', '组件'])
    expect(root.querySelector('[part="current"]')!.textContent).toBe('面包屑')
    // 被折叠项：导航 / 数据展示 / 反馈
    const dd = root.querySelector('.ellipsis-dropdown')!
    expect([...dd.querySelectorAll('a')].map((a) => a.textContent)).toEqual([
      '导航',
      '数据展示',
      '反馈',
    ])
  })

  it('A5 折叠保留数缺省时保持旧行为（首 1 + 末 max-items-2）', () => {
    const el = mountWith({ items: LONG_ITEMS, collapsed: '', 'max-items': '4' })
    const root = el.shadowRoot!
    const visible = [...root.querySelectorAll('nav > .item > a[part="link"]')].map(
      (a) => a.textContent,
    )
    expect(visible).toEqual(['首页', '反馈'])
    expect(root.querySelectorAll('.item').length).toBe(4) // 首页 + … + 反馈 + 面包屑
  })

  // ===== B 档：项下拉菜单 / 单项截断 / size / 末项可点 / 键盘导航 / 自定义省略号 =====

  it('B1 项带下拉菜单：dropdown 项渲染触发器，点击展开/收起', () => {
    const el = mountWith({
      items: JSON.stringify([
        { label: '首页', href: '/' },
        { label: '更多', dropdown: [{ label: '子项A', href: '/a' }, { label: '子项B', href: '/b' }] },
        { label: '面包屑' },
      ]),
    })
    const root = el.shadowRoot!
    const btn = root.querySelector<HTMLButtonElement>('button.dropdown-trigger')!
    expect(btn).not.toBeNull()
    expect(btn.getAttribute('aria-haspopup')).toBe('menu')
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    expect(btn.textContent).toContain('更多')
    const panel = root.querySelector<HTMLElement>('.item-dropdown')!
    expect(panel.classList.contains('open')).toBe(false)
    expect([...panel.querySelectorAll('a')].map((a) => a.textContent)).toEqual(['子项A', '子项B'])
    btn.click()
    expect(panel.classList.contains('open')).toBe(true)
    expect(btn.getAttribute('aria-expanded')).toBe('true')
    btn.click()
    expect(panel.classList.contains('open')).toBe(false)
    expect(btn.getAttribute('aria-expanded')).toBe('false')
  })

  it('B1 项下拉菜单：点击菜单项派发 oas-select 并关闭', () => {
    const el = mountWith({
      items: JSON.stringify([
        { label: '首页', href: '/' },
        { label: '更多', dropdown: [{ label: '子项A', href: '/a' }, { label: '子项B', href: '/b' }] },
        { label: '面包屑' },
      ]),
    })
    const root = el.shadowRoot!
    const btn = root.querySelector<HTMLButtonElement>('button.dropdown-trigger')!
    btn.click()
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    root.querySelectorAll<HTMLAnchorElement>('.item-dropdown a')[1]!.click()
    expect(detail).toEqual({ value: '/b' })
    expect(root.querySelector('.item-dropdown')!.classList.contains('open')).toBe(false)
  })

  it('B1 下拉菜单互斥展开：开一个关一个；Esc 关闭', () => {
    const el = mountWith({
      items: JSON.stringify([
        { label: '首页', href: '/' },
        { label: 'A', dropdown: [{ label: 'A1', href: '/a1' }] },
        { label: 'B', dropdown: [{ label: 'B1', href: '/b1' }] },
        { label: '面包屑' },
      ]),
    })
    const root = el.shadowRoot!
    const btns = [...root.querySelectorAll<HTMLButtonElement>('button.dropdown-trigger')]
    const panels = [...root.querySelectorAll<HTMLElement>('.item-dropdown')]
    expect(btns.length).toBe(2)
    btns[0]!.click()
    expect(panels[0]!.classList.contains('open')).toBe(true)
    btns[1]!.click()
    expect(panels[0]!.classList.contains('open')).toBe(false)
    expect(panels[1]!.classList.contains('open')).toBe(true)
    btns[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(panels[1]!.classList.contains('open')).toBe(false)
  })

  it('B1 下拉菜单项 href="#"：阻止默认跳转（不滚回顶部）但仍派发 oas-select', () => {
    const el = mountWith({
      items: JSON.stringify([
        { label: '首页', href: '/' },
        { label: '更多', dropdown: [{ label: '占位', href: '#' }] },
        { label: '面包屑' },
      ]),
    })
    const root = el.shadowRoot!
    const btn = root.querySelector<HTMLButtonElement>('button.dropdown-trigger')!
    btn.click()
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    const a = root.querySelector<HTMLAnchorElement>('.item-dropdown a')!
    let prevented = false
    a.addEventListener('click', (e: Event) => {
      if (e.defaultPrevented) prevented = true
    })
    a.click()
    expect(prevented).toBe(true)
    expect(detail).toEqual({ value: '#' })
  })

  it('B2 max-item-width：全局截断 + 项级 maxWidth 覆盖', () => {
    const el = mountWith({
      items: JSON.stringify([
        { label: '首页', href: '/' },
        { label: '一个很长很长的面包屑项', href: '/x', maxWidth: 60 },
        { label: '面包屑' },
      ]),
      'max-item-width': '120',
    })
    const root = el.shadowRoot!
    const texts = root.querySelectorAll<HTMLElement>('.item-text')
    expect(texts[0]!.style.maxWidth).toBe('120px')
    expect(texts[0]!.classList.contains('truncated')).toBe(true)
    expect(texts[1]!.style.maxWidth).toBe('60px') // 项级覆盖全局
    expect(texts[2]!.style.maxWidth).toBe('120px')
  })

  it('B3 size：small/medium/large 生效（nav class）', () => {
    const el = mountWith({ items: ITEMS, size: 'small' })
    expect(el.shadowRoot!.querySelector('nav')!.classList.contains('size-small')).toBe(true)
    const el2 = mountWith({ items: ITEMS, size: 'large' })
    expect(el2.shadowRoot!.querySelector('nav')!.classList.contains('size-large')).toBe(true)
    const el3 = mountWith({ items: ITEMS, size: 'medium' })
    const nav3 = el3.shadowRoot!.querySelector('nav')!
    expect(nav3.classList.contains('size-small')).toBe(false)
    expect(nav3.classList.contains('size-large')).toBe(false)
  })

  it('B5 active 字段：显式标记当前项（aria-current 迁移），末项有 href 时可点', () => {
    const el = mountWith({
      items: JSON.stringify([
        { label: '首页', href: '/' },
        { label: '组件', href: '/components', active: true },
        { label: '面包屑', href: '/breadcrumb' },
      ]),
    })
    const root = el.shadowRoot!
    const current = root.querySelector('[part="current"]')!
    expect(current.getAttribute('aria-current')).toBe('page')
    expect(current.textContent).toBe('组件')
    // 末项有 href 且非当前 → 渲染为可点链接
    expect(
      [...root.querySelectorAll<HTMLAnchorElement>('a[part="link"]')].map((a) =>
        a.getAttribute('href'),
      ),
    ).toContain('/breadcrumb')
  })

  it('B5 active-last：末项保持可点击（链接渲染 + aria-current=page）', () => {
    const el = mountWith({
      items: JSON.stringify([
        { label: '首页', href: '/' },
        { label: '面包屑', href: '/breadcrumb' },
      ]),
      'active-last': '',
    })
    const root = el.shadowRoot!
    const link = root.querySelector<HTMLAnchorElement>('a[part="link"][aria-current="page"]')!
    expect(link).not.toBeNull()
    expect(link.getAttribute('href')).toContain('/breadcrumb')
    // 无 active-last 时末项仍是 current span
    const el2 = mountWith({
      items: JSON.stringify([{ label: '首页', href: '/' }, { label: '末页', href: '/last' }]),
    })
    expect(el2.shadowRoot!.querySelector('[part="current"]')).not.toBeNull()
    expect(el2.shadowRoot!.querySelector('a[aria-current="page"]')).toBeNull()
  })

  it('B6 键盘方向键导航：ArrowLeft/ArrowRight/Home/End 在可聚焦项间移动焦点', () => {
    const el = mountWith({
      items: JSON.stringify([
        { label: '首页', href: '/' },
        { label: '组件', href: '/components' },
        { label: '禁用', href: '/x', disabled: true },
        { label: '面包屑' },
      ]),
    })
    const root = el.shadowRoot!
    const links = [...root.querySelectorAll<HTMLElement>('a[part="link"]')]
    expect(links.length).toBe(2) // 禁用项不可聚焦
    links[0]!.focus()
    links[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(root.activeElement).toBe(links[1])
    links[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(root.activeElement).toBe(links[0])
    links[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    expect(root.activeElement).toBe(links[0])
    links[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    expect(root.activeElement).toBe(links[1])
    // 循环：最后一个 ArrowRight → 第一个
    links[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(root.activeElement).toBe(links[0])
  })

  it('B6 键盘导航不响应非方向键（Tab 等保持原生）', () => {
    const el = mountWith({ items: ITEMS })
    const root = el.shadowRoot!
    const link = root.querySelector<HTMLElement>('a[part="link"]')!
    link.focus()
    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(root.activeElement).toBe(link)
  })

  it('B7 collapse-text：自定义省略号文本', () => {
    const el = mountWith({ items: LONG_ITEMS, collapsed: '', 'max-items': '4', 'collapse-text': '展开' })
    expect(el.shadowRoot!.querySelector('.ellipsis-btn')!.textContent).toBe('展开')
  })

  // ===== C 档：结构化数据 / color/variant / part 体系 =====

  it('C1 结构化数据：light DOM 注入 BreadcrumbList JSON-LD（仅含 href 项）', () => {
    const el = mount()
    const script = el.querySelector<HTMLScriptElement>('script[data-oas-breadcrumb-ld]')
    expect(script).not.toBeNull()
    expect(script!.type).toBe('application/ld+json')
    const data = JSON.parse(script!.textContent!) as {
      '@type': string
      itemListElement: Array<{ position: number; name: string; item?: string }>
    }
    expect(data['@type']).toBe('BreadcrumbList')
    expect(data.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: '首页', item: '/' },
      { '@type': 'ListItem', position: 2, name: '组件', item: '/components' },
    ])
    // 无 href 的当前页不进链接清单
    expect(data.itemListElement.length).toBe(2)
  })

  it('C1 结构化数据：无 href 项不注入；属性更新时去重不重复注入', () => {
    const el = new OASBreadcrumb()
    document.body.appendChild(el)
    expect(el.querySelector('script[data-oas-breadcrumb-ld]')).toBeNull()
    el.setAttribute('items', JSON.stringify([{ label: '首页', href: '/' }]))
    expect(el.querySelectorAll('script[data-oas-breadcrumb-ld]').length).toBe(1)
    el.setAttribute(
      'items',
      JSON.stringify([{ label: '首页', href: '/' }, { label: '新项', href: '/new' }]),
    )
    expect(el.querySelectorAll('script[data-oas-breadcrumb-ld]').length).toBe(1)
    expect(el.querySelector('script')!.textContent).toContain('/new')
  })

  it('C2 color/variant：nav 视觉变体 class（非法 color 不生效）', () => {
    const el = mountWith({ items: ITEMS, color: 'danger', variant: 'underline' })
    const nav = el.shadowRoot!.querySelector('nav')!
    expect(nav.classList.contains('color-danger')).toBe(true)
    expect(nav.classList.contains('variant-underline')).toBe(true)
    const el2 = mountWith({ items: ITEMS, color: 'nope' })
    expect(el2.shadowRoot!.querySelector('nav')!.classList.contains('color-nope')).toBe(false)
  })

  it('C3 part 体系：item/separator/icon/dropdown/ellipsis 等 part 暴露', () => {
    const el = mountWith({
      items: JSON.stringify([
        { label: '首页', href: '/', icon: 'star' },
        { label: '更多', dropdown: [{ label: '子项', href: '/a' }] },
        { label: '面包屑' },
      ]),
    })
    const root = el.shadowRoot!
    expect(root.querySelectorAll('[part="item"]').length).toBe(3)
    expect(root.querySelector('[part="separator"]')).not.toBeNull()
    expect(root.querySelector('[part="icon"]')).not.toBeNull()
    expect(root.querySelector('[part="dropdown"]')).not.toBeNull()
    expect(root.querySelector('[part="current"]')).not.toBeNull()
    // 折叠场景 part：ellipsis + ellipsis-menu
    const el2 = mountWith({ items: LONG_ITEMS, collapsed: '', 'max-items': '4' })
    expect(el2.shadowRoot!.querySelector('[part="ellipsis"]')).not.toBeNull()
    expect(el2.shadowRoot!.querySelector('[part="ellipsis-menu"]')).not.toBeNull()
  })
})
