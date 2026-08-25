import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASSidebar } from './index.js'

/**
 * 可控 matchMedia stub：matches 可切换，并手动触发 change 监听，
 * 用于模拟移动端断点进入/离开。
 */
function stubMatchMedia(initial: boolean) {
  let matches = initial
  const listeners = new Set<() => void>()
  const mq = {
    get matches() {
      return matches
    },
    media: '(max-width: 768px)',
    addEventListener: (_t: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_t: string, cb: () => void) => listeners.delete(cb),
  }
  vi.stubGlobal('matchMedia', () => mq)
  return {
    setMatches(v: boolean) {
      matches = v
      for (const cb of [...listeners]) cb()
    },
  }
}

function mount(attrs: Record<string, string> = {}): OASSidebar {
  const el = new OASSidebar()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

describe('OASSidebar（可折叠侧栏）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('注册 oas-sidebar 自定义元素', () => {
    expect(customElements.get('oas-sidebar')).not.toBeNull()
  })

  it('桌面端默认：非移动态，折叠按钮可见，移动触发/关闭按钮隐藏', () => {
    stubMatchMedia(false)
    const el = mount()
    expect(el.dataset.mobile).toBeUndefined()
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="toggle"]')!.hidden).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!.hidden).toBe(true)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.hidden).toBe(true)
    expect(el.shadowRoot!.querySelector('.mask')!.classList.contains('open')).toBe(false)
    expect(el.shadowRoot!.querySelector('.panel')!.classList.contains('drawer-open')).toBe(false)
  })

  it('width 属性覆盖展开宽度 token，缺省清空', () => {
    stubMatchMedia(false)
    const el = mount({ width: '280px' })
    expect(el.style.getPropertyValue('--oas-sidebar-width')).toBe('280px')
    el.removeAttribute('width')
    expect(el.style.getPropertyValue('--oas-sidebar-width')).toBe('')
  })

  it('items 渲染菜单项并派发 oas-select', () => {
    stubMatchMedia(false)
    const el = mount({
      items: JSON.stringify([
        { label: '首页', value: 'home', icon: '🏠' },
        { label: '设置', value: 'settings' },
      ]),
    })
    const btns = el.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')
    expect(btns.length).toBe(2)
    expect(btns[0]!.dataset.value).toBe('home')
    expect(btns[0]!.textContent).toContain('首页')
    expect(btns[0]!.getAttribute('aria-label')).toBe('首页')
    let detail: unknown
    el.addEventListener('oas-select', (e) => (detail = (e as CustomEvent).detail))
    btns[0]!.click()
    expect(detail).toEqual({ value: 'home', label: '首页' })
  })

  it('非法 items JSON 不报错、不渲染菜单', () => {
    stubMatchMedia(false)
    const el = mount({ items: '{oops' })
    expect(el.shadowRoot!.querySelectorAll('[part="item"]').length).toBe(0)
  })

  it('collapsed：无 icon 的菜单项隐藏，仅保留图标项', () => {
    stubMatchMedia(false)
    const el = mount({
      collapsed: '',
      items: JSON.stringify([
        { label: '首页', value: 'home', icon: '🏠' },
        { label: '设置', value: 'settings' },
      ]),
    })
    const btns = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')]
    expect(btns.length).toBe(2)
    expect(btns[0]!.hidden).toBe(false)
    expect(btns[1]!.hidden).toBe(true)
  })

  it('点击桌面折叠按钮：切换 collapsed 并派发 oas-collapse', () => {
    stubMatchMedia(false)
    const el = mount()
    const toggle = el.shadowRoot!.querySelector<HTMLElement>('[part="toggle"]')!
    let detail: unknown
    el.addEventListener('oas-collapse', (e) => (detail = (e as CustomEvent).detail))
    toggle.click()
    expect(el.hasAttribute('collapsed')).toBe(true)
    expect(detail).toEqual({ collapsed: true })
    toggle.click()
    expect(el.hasAttribute('collapsed')).toBe(false)
    expect(detail).toEqual({ collapsed: false })
  })

  it('collapsed 时折叠按钮 aria-expanded=false 且文案为展开', () => {
    stubMatchMedia(false)
    const el = mount({ collapsed: '' })
    const toggle = el.shadowRoot!.querySelector<HTMLElement>('[part="toggle"]')!
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(toggle.getAttribute('aria-label')).toBe('展开侧栏')
  })

  it('移动端：抽屉关闭态遮罩/面板隐藏，trigger 可见', () => {
    stubMatchMedia(true)
    const el = mount()
    expect(el.dataset.mobile).toBe('true')
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!.hidden).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="toggle"]')!.hidden).toBe(true)
    expect(el.shadowRoot!.querySelector('.mask')!.classList.contains('open')).toBe(false)
    expect(el.shadowRoot!.querySelector('.panel')!.classList.contains('drawer-open')).toBe(false)
  })

  it('移动端：trigger 打开抽屉，遮罩点击收起', () => {
    stubMatchMedia(true)
    const el = mount()
    el.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!.click()
    expect(el.hasAttribute('drawer-open')).toBe(true)
    expect(el.shadowRoot!.querySelector('.mask')!.classList.contains('open')).toBe(true)
    expect(el.shadowRoot!.querySelector('.panel')!.classList.contains('drawer-open')).toBe(true)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.hidden).toBe(false)
    el.shadowRoot!.querySelector<HTMLElement>('.mask')!.click()
    expect(el.hasAttribute('drawer-open')).toBe(false)
    expect(el.shadowRoot!.querySelector('.mask')!.classList.contains('open')).toBe(false)
  })

  it('移动端：关闭按钮收起抽屉', () => {
    stubMatchMedia(true)
    const el = mount()
    el.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!.click()
    el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.click()
    expect(el.hasAttribute('drawer-open')).toBe(false)
  })

  it('移动端：Esc 关闭抽屉', () => {
    stubMatchMedia(true)
    const el = mount()
    el.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!.click()
    expect(el.hasAttribute('drawer-open')).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(el.hasAttribute('drawer-open')).toBe(false)
  })

  it('移动端：选中菜单项后抽屉自动收起', () => {
    stubMatchMedia(true)
    const el = mount({ items: JSON.stringify([{ label: '首页', value: 'home', icon: '🏠' }]) })
    el.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!.click()
    expect(el.hasAttribute('drawer-open')).toBe(true)
    el.shadowRoot!.querySelector<HTMLElement>('[part="item"]')!.click()
    expect(el.hasAttribute('drawer-open')).toBe(false)
  })

  it('断点变化回到桌面：抽屉关闭，无孤儿浮层', () => {
    const mq = stubMatchMedia(true)
    const el = mount()
    el.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!.click()
    expect(el.hasAttribute('drawer-open')).toBe(true)
    mq.setMatches(false)
    expect(el.dataset.mobile).toBeUndefined()
    expect(el.hasAttribute('drawer-open')).toBe(false)
    expect(el.shadowRoot!.querySelector('.mask')!.classList.contains('open')).toBe(false)
    expect(el.shadowRoot!.querySelector('.panel')!.classList.contains('drawer-open')).toBe(false)
  })

  it('断开连接后清理 document 监听（重挂载不残留）', () => {
    stubMatchMedia(true)
    const el = mount()
    el.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!.click()
    el.remove()
    document.body.innerHTML = ''
    // 再次挂载新实例不应受旧监听影响
    const el2 = mount()
    el2.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!.click()
    expect(el2.hasAttribute('drawer-open')).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(el2.hasAttribute('drawer-open')).toBe(false)
  })

  it('mobile-breakpoint 生效：按属性值构造媒体查询', () => {
    let lastMedia = ''
    vi.stubGlobal('matchMedia', (media: string) => {
      lastMedia = media
      return { matches: false, media, addEventListener: () => {}, removeEventListener: () => {} }
    })
    mount({ 'mobile-breakpoint': '600' })
    expect(lastMedia).toBe('(max-width: 600px)')
  })

  it('内置文案随 locale 切换', () => {
    stubMatchMedia(false)
    const el = mount()
    const nav = el.shadowRoot!.querySelector('.nav')!
    const toggle = el.shadowRoot!.querySelector<HTMLElement>('[part="toggle"]')!
    const trigger = el.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!
    expect(nav.getAttribute('aria-label')).toBe('侧栏导航')
    expect(toggle.getAttribute('aria-label')).toBe('折叠侧栏')
    expect(trigger.getAttribute('aria-label')).toBe('打开侧栏')
    setLocale(en)
    expect(nav.getAttribute('aria-label')).toBe('Sidebar navigation')
    expect(toggle.getAttribute('aria-label')).toBe('Collapse sidebar')
    expect(trigger.getAttribute('aria-label')).toBe('Open sidebar')
    setLocale('zh-CN')
    expect(nav.getAttribute('aria-label')).toBe('侧栏导航')
  })
})

describe('OASSidebar 受控高亮与图标渲染（模板实测缺陷回归）', () => {
  it('active 受控属性：对应 value 的菜单项渲染 active 高亮 + aria-current', () => {
    stubMatchMedia(false)
    const el = mount({
      items: '[{"label":"首页","value":"home"},{"label":"设置","value":"settings"}]',
      active: 'settings',
    })
    const items = [...el.shadowRoot!.querySelectorAll('[part="item"]')]
    const active = items.find((b) => b.getAttribute('aria-current') === 'page')
    expect(active, '应有一个 aria-current=page 的项').toBeTruthy()
    expect(active!.querySelector('.label')!.textContent).toBe('设置')
    expect(active!.classList.contains('active')).toBe(true)
    // 切换 active → 高亮迁移
    el.setAttribute('active', 'home')
    const items2 = [...el.shadowRoot!.querySelectorAll('[part="item"]')]
    expect(
      items2.find((b) => b.getAttribute('aria-current') === 'page')!.querySelector('.label')!
        .textContent,
    ).toBe('首页')
  })

  it('drawer-open 进 observedAttributes：setAttribute 后抽屉重绘', () => {
    stubMatchMedia(true)
    const el = mount()
    expect(el.shadowRoot!.querySelector('.panel')!.classList.contains('drawer-open')).toBe(false)
    el.setAttribute('drawer-open', '')
    expect(el.shadowRoot!.querySelector('.panel')!.classList.contains('drawer-open')).toBe(true)
    el.removeAttribute('drawer-open')
    expect(el.shadowRoot!.querySelector('.panel')!.classList.contains('drawer-open')).toBe(false)
  })

  it('移动端触发按钮用 SVG 图标（非 emoji 文本）', () => {
    stubMatchMedia(true)
    const el = mount()
    const trigger = el.shadowRoot!.querySelector('[part="trigger"]')!
    expect(trigger.querySelector('svg'), 'trigger 应含 svg 图标而非文本').toBeTruthy()
    expect(trigger.textContent!.trim(), '不应是 ☰/文本').not.toMatch(/☰|⋯|汉堡/)
  })

  it('items.icon 支持注册表图标名渲染为 SVG（非纯文本）', () => {
    stubMatchMedia(false)
    const el = mount({
      items: '[{"label":"首页","value":"home","icon":"star"},{"label":"设置","value":"settings"}]',
    })
    const items = [...el.shadowRoot!.querySelectorAll('[part="item"]')]
    const withIcon = items[0]!.querySelector('.icon')!
    const withoutIcon = items[1]!.querySelector('.icon') as HTMLElement
    expect(withIcon.querySelector('svg'), '有 icon 的项应渲染 svg').toBeTruthy()
    expect(withoutIcon.hidden).toBe(true)
  })
})

describe('OASSidebar 分组（items.group）', () => {
  const GROUPED_ITEMS =
    '[{"label":"仪表盘","value":"dash","icon":"star","group":"概览"},{"label":"订单","value":"orders","icon":"star","group":"概览"},{"label":"商品","value":"goods","icon":"star","group":"管理"},{"label":"用户","value":"users","icon":"star","group":"管理"},{"label":"个人中心","value":"me"}]'

  it('items 带 group：组首项前渲染 part="group" 组标题，组内连续项共享一个标题', () => {
    stubMatchMedia(false)
    const el = mount({ items: GROUPED_ITEMS })
    const nav = el.shadowRoot!.querySelector('.nav')!
    const children = [...nav.children]
    const titles = [...nav.querySelectorAll('[part="group"]')]
    expect(titles.length).toBe(2)
    expect(titles[0]!.textContent).toBe('概览')
    expect(titles[1]!.textContent).toBe('管理')
    // 顺序：概览标题 → 2 项 → 管理标题 → 2 项 → 个人中心（无标题）
    expect(children[0]!.getAttribute('part')).toBe('group')
    expect(children[1]!.getAttribute('part')).toBe('item')
    expect(children[3]!.getAttribute('part')).toBe('group')
    expect(children[children.length - 1]!.getAttribute('part')).toBe('item')
  })

  it('items 无 group 字段：平铺、无组标题（向后兼容）', () => {
    stubMatchMedia(false)
    const el = mount({ items: '[{"label":"首页","value":"home"},{"label":"设置","value":"s"}]' })
    expect(el.shadowRoot!.querySelectorAll('[part="group"]').length).toBe(0)
    expect(el.shadowRoot!.querySelectorAll('[part="item"]').length).toBe(2)
  })

  it('换组才渲染新标题；连续同组不重复', () => {
    stubMatchMedia(false)
    const el = mount({
      items:
        '[{"label":"a","value":"a","group":"G"},{"label":"b","value":"b","group":"G"},{"label":"c","value":"c"}]',
    })
    expect(el.shadowRoot!.querySelectorAll('[part="group"]').length).toBe(1)
  })

  it('折叠态组标题隐藏（CSS 规则），移动抽屉态不隐藏', () => {
    stubMatchMedia(false)
    const el = mount({ items: GROUPED_ITEMS, collapsed: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/collapsed\][^{]*\.group-title\s*\{[^}]*display:\s*none/)
    stubMatchMedia(true)
    const elMobile = mount({ items: GROUPED_ITEMS })
    // 移动态：组标题存在且无 collapsed 选择器覆盖
    expect(elMobile.shadowRoot!.querySelectorAll('[part="group"]').length).toBe(2)
  })
})
