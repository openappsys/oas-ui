import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASSidebar } from './index.js'
import { registerIcon } from '../../basic/icon/index.js'

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

describe('OASSidebar 能力补齐批（嵌套/徽标/操作/分隔线/骨架/快捷键/键盘导航/tooltip/expand-on-hover/variant/side）', () => {
  it('嵌套子菜单：children 渲染为可展开子树，父项点击切换展开（不派发 select）', () => {
    stubMatchMedia(false)
    const el = mount({
      items:
        '[{"label":"管理","value":"admin","icon":"star","children":[{"label":"用户","value":"users"},{"label":"角色","value":"roles"}]}]',
    })
    const parent = el.shadowRoot!.querySelector<HTMLElement>('[part="item"]')!
    const sub = el.shadowRoot!.querySelector<HTMLElement>('[part="submenu"]')!
    expect(parent.getAttribute('aria-expanded')).toBe('false')
    expect(sub.hidden).toBe(true)
    expect(sub.querySelectorAll('[part="item"]').length).toBe(2)
    // 隐藏走 grid 0fr + visibility（可动画）——display 恒 grid（[hidden] 不再 display:none），
    // visibility:hidden 负责出渲染树/无障碍树/防聚焦（替代 UA display:none 的语义兜底）
    const stl = el.shadowRoot!.querySelector('style')!.textContent!
    expect(stl, 'submenu 应为 grid 布局（0fr/1fr 过渡的前提）').toMatch(/\.submenu\s*\{[^}]*display:\s*grid/)
    expect(stl, 'collapsed 时 visibility:hidden（出渲染树防聚焦）').toMatch(
      /\.submenu\s*\{[^}]*visibility:\s*hidden/,
    )
    let selectCount = 0
    el.addEventListener('oas-select', () => selectCount++)
    parent.click()
    expect(parent.getAttribute('aria-expanded')).toBe('true')
    expect(sub.hidden).toBe(false)
    expect(selectCount, '父项点击只展开不派发 select').toBe(0)
    parent.click()
    expect(parent.getAttribute('aria-expanded')).toBe('false')
    expect(sub.hidden).toBe(true)
  })

  it('子树展开平滑动画：grid-template-rows 0fr/1fr 过渡 + visibility 联动 + reduced-motion 降级 + chevron 过渡', () => {
    stubMatchMedia(false)
    const el = mount({
      items: '[{"label":"管理","value":"admin","icon":"star","children":[{"label":"用户","value":"users"}]}]',
    })
    const stl = el.shadowRoot!.querySelector('style')!.textContent!
    // 高度过渡：0fr（收起）↔ 1fr（展开）
    expect(stl).toMatch(/grid-template-rows:\s*0fr/)
    expect(stl).toMatch(/\.submenu:not\(\[hidden\]\)\s*\{[^}]*grid-template-rows:\s*1fr/)
    // 内层 overflow 裁剪（grid 高度动画的必需结构）
    expect(stl).toMatch(/\.submenu-inner\s*\{[^}]*overflow:\s*hidden/)
    expect(stl).toMatch(/\.submenu-inner\s*\{[^}]*min-height:\s*0/)
    // visibility 联动：收起时 hidden（延迟到过渡结束），展开时 visible
    expect(stl).toMatch(/visibility:\s*hidden/)
    expect(stl).toMatch(/\.submenu:not\(\[hidden\]\)\s*\{[^}]*visibility:\s*visible/)
    // reduced-motion 降级：过渡停用
    expect(stl).toMatch(/prefers-reduced-motion:\s*reduce[\s\S]{0,200}transition:\s*none/)
    // chevron 旋转过渡
    expect(stl).toMatch(/\.chevron\s*\{[^}]*transition:[^}]*transform/)
  })

  it('accordion：同级互斥——展开一个父项自动收起其他同级父项（与 menu 同语义）', () => {
    stubMatchMedia(false)
    const el = mount({
      accordion: '',
      items:
        '[{"label":"业务","value":"biz","icon":"star","children":[{"label":"订单","value":"orders"}]},{"label":"系统","value":"sys","icon":"gear","children":[{"label":"权限","value":"perm"}]}]',
    })
    const items = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')]
    const biz = items.find((i) => i.dataset.value === 'biz')!
    const sys = items.find((i) => i.dataset.value === 'sys')!
    biz.click()
    expect(biz.getAttribute('aria-expanded')).toBe('true')
    sys.click()
    // accordion 外科手术式同步被收起项 DOM（同元素切换），重新查询确认
    const itemsAfter = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')]
    const bizAfter = itemsAfter.find((i) => i.dataset.value === 'biz')!
    const sysAfter = itemsAfter.find((i) => i.dataset.value === 'sys')!
    expect(sysAfter.getAttribute('aria-expanded'), '展开 sys 成功').toBe('true')
    expect(bizAfter.getAttribute('aria-expanded'), 'accordion 同级互斥：biz 应被自动收起').toBe('false')
    expect((el.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="biz"]')!.closest('.item-block')!.querySelector('[part="submenu"]') as HTMLElement).hidden, 'biz 子树应隐藏').toBe(true)
    // 无 accordion 对照：两者可同时展开
    const el2 = mount({
      items:
        '[{"label":"业务","value":"biz","icon":"star","children":[{"label":"订单","value":"orders"}]},{"label":"系统","value":"sys","icon":"gear","children":[{"label":"权限","value":"perm"}]}]',
    })
    const items2 = [...el2.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')]
    items2.find((i) => i.dataset.value === 'biz')!.click()
    items2.find((i) => i.dataset.value === 'sys')!.click()
    expect(items2.find((i) => i.dataset.value === 'biz')!.getAttribute('aria-expanded')).toBe('true')
    expect(items2.find((i) => i.dataset.value === 'sys')!.getAttribute('aria-expanded')).toBe('true')
    // observedAttributes 覆盖
    expect(OASSidebar.observedAttributes).toContain('accordion')
  })

  it('3 级嵌套实证：逐级渲染/逐级展开/激活级联自动展开与 child-selected（机制无限级，递归渲染）', () => {
    stubMatchMedia(false)
    const deep = [
      { label: 'L1', value: 'l1', icon: 'star', children: [
        { label: 'L2', value: 'l2', children: [
          { label: 'L3', value: 'l3' },
        ] },
      ] },
    ]
    const el = mount({ items: JSON.stringify(deep) })
    const sr = el.shadowRoot!
    // L1 展开 → L2 渲染可见
    const l1 = sr.querySelector<HTMLElement>('[part="item"][data-value="l1"]')!
    l1.click()
    const l2 = sr.querySelector<HTMLElement>('[part="item"][data-value="l2"]')
    expect(l2, 'L1 展开后 L2 应渲染').not.toBeNull()
    // L2 展开 → L3 渲染可见
    l2!.click()
    const l3 = sr.querySelector<HTMLElement>('[part="item"][data-value="l3"]')
    expect(l3, 'L2 展开后 L3 应渲染').not.toBeNull()
    // L3 叶子点击派发 select
    let detail: unknown
    el.addEventListener('oas-select', (e) => (detail = (e as CustomEvent).detail))
    l3!.click()
    expect(detail).toEqual({ value: 'l3', label: 'L3' })
    // 激活级联：active=l3 → L1/L2 自动展开 + 双 child-selected
    const el2 = mount({ items: JSON.stringify(deep), active: 'l3' })
    const sr2 = el2.shadowRoot!
    const p1 = sr2.querySelector<HTMLElement>('[part="item"][data-value="l1"]')!
    const p2 = sr2.querySelector<HTMLElement>('[part="item"][data-value="l2"]')!
    expect(p1.getAttribute('aria-expanded'), 'L1 应自动展开').toBe('true')
    expect(p1.classList.contains('child-selected'), 'L1 应带 child-selected').toBe(true)
    expect(p2.getAttribute('aria-expanded'), 'L2 应自动展开').toBe('true')
    expect(p2.classList.contains('child-selected'), 'L2 应带 child-selected').toBe(true)
    const l3b = sr2.querySelector<HTMLElement>('[part="item"][data-value="l3"]')!
    expect(l3b.classList.contains('active'), 'L3 应为激活态').toBe(true)
    expect(l3b.getAttribute('aria-current')).toBe('page')
    expect(sr2.querySelectorAll('[part="submenu"]').length, '两层 submenu 容器嵌套').toBe(2)
  })

  it('嵌套子项点击派发 oas-select（叶子项行为不变）', () => {
    stubMatchMedia(false)
    const el = mount({
      items:
        '[{"label":"管理","value":"admin","icon":"star","children":[{"label":"用户","value":"users"}]}]',
    })
    el.shadowRoot!.querySelector<HTMLElement>('[part="item"]')!.click()
    let detail: unknown
    el.addEventListener('oas-select', (e) => (detail = (e as CustomEvent).detail))
    el.shadowRoot!.querySelector<HTMLElement>('[part="submenu"] [part="item"]')!.click()
    expect(detail).toEqual({ value: 'users', label: '用户' })
  })

  it('嵌套父项含激活子项时自动展开（active 指向子项）', () => {
    stubMatchMedia(false)
    const el = mount({
      items:
        '[{"label":"管理","value":"admin","icon":"star","children":[{"label":"用户","value":"users"}]}]',
      active: 'users',
    })
    const parent = el.shadowRoot!.querySelector<HTMLElement>('[part="item"]')!
    expect(parent.getAttribute('aria-expanded')).toBe('true')
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="submenu"]')!.hidden).toBe(false)
    const childBtn = el.shadowRoot!.querySelector<HTMLElement>('[part="submenu"] [part="item"]')!
    expect(childBtn.classList.contains('active')).toBe(true)
    expect(childBtn.getAttribute('aria-current')).toBe('page')
  })

  it('徽标：item.badge 渲染 part="badge" 计数徽标', () => {
    stubMatchMedia(false)
    const el = mount({ items: '[{"label":"收件箱","value":"inbox","badge":"12"}]' })
    const badge = el.shadowRoot!.querySelector('[part="badge"]')!
    expect(badge.textContent).toBe('12')
    expect(badge.classList.contains('item-badge')).toBe(true)
  })

  it('折叠态嵌套父项渲染为纯图标项：无 chevron、无 aria-expanded、点击派发 select（修复死交互）', () => {
    stubMatchMedia(false)
    const el = mount({
      collapsed: '',
      items:
        '[{"label":"管理","value":"admin","icon":"star","children":[{"label":"用户","value":"users"}]}]',
    })
    const parent = el.shadowRoot!.querySelector<HTMLElement>('[part="item"]')!
    expect(parent.querySelector('.chevron'), '折叠态父项不应有展开箭头').toBeNull()
    expect(parent.getAttribute('aria-expanded'), '折叠态父项不应有 aria-expanded').toBeNull()
    // 点击按普通项处理（派发 oas-select），不再切换死展开
    let detail: unknown
    el.addEventListener('oas-select', (e) => (detail = (e as CustomEvent).detail))
    parent.click()
    expect(detail).toEqual({ value: 'admin', label: '管理' })
    // 展开态对照不受影响：chevron 仍在、点击只展开不派发 select
    const el2 = mount({
      items:
        '[{"label":"管理","value":"admin","icon":"star","children":[{"label":"用户","value":"users"}]}]',
    })
    const p2 = el2.shadowRoot!.querySelector<HTMLElement>('[part="item"]')!
    expect(p2.querySelector('.chevron'), '展开态父项应有展开箭头').not.toBeNull()
  })

  it('折叠态激活后代时父项带 child-selected 指示（激活态在图标条下不丢失）', () => {
    stubMatchMedia(false)
    const el = mount({
      collapsed: '',
      items:
        '[{"label":"管理","value":"admin","icon":"star","children":[{"label":"用户","value":"users"}]}]',
      active: 'users',
    })
    const parent = el.shadowRoot!.querySelector<HTMLElement>('[part="item"]')!
    expect(parent.classList.contains('child-selected'), '激活后代的父项应带 child-selected').toBe(true)
    expect(parent.getAttribute('aria-current'), '父项不是当前页，不应有 aria-current').toBeNull()
    // 展开态对照：child-selected 也应有（激活后代可见性一致）
    const el2 = mount({
      items:
        '[{"label":"管理","value":"admin","icon":"star","children":[{"label":"用户","value":"users"}]}]',
      active: 'users',
    })
    const p2 = el2.shadowRoot!.querySelector<HTMLElement>('[part="item"]')!
    expect(p2.classList.contains('child-selected'), '展开态激活后代的父项也应带 child-selected').toBe(true)
  })

  it('父项与子树间有呼吸（.item-block gap：父项底色与子项 hover 底色不贴死）', () => {
    stubMatchMedia(false)
    const el = mount({
      items: '[{"label":"管理","value":"biz","icon":"star","children":[{"label":"用户","value":"users"}]}]',
    })
    const stl = el.shadowRoot!.querySelector('style')!.textContent!
    expect(stl, '.item-block 应有 flex+gap 使父项与子树留呼吸').toMatch(
      /\.item-block\s*\{[^}]*display:\s*flex[^}]*gap:\s*var\(--oas-space-1/,
    )
  })

  it('嵌套子项支持 icon（children 项 icon 字段渲染注册表 SVG，与父项同通道）', () => {
    stubMatchMedia(false)
    const el = mount({
      items:
        '[{"label":"管理","value":"biz","icon":"star","children":[{"label":"用户","value":"users","icon":"user"}]}]',
    })
    const childBtn = el.shadowRoot!.querySelector<HTMLElement>('[part="submenu"] [part="item"]')!
    const svg = childBtn.querySelector('.icon svg')
    expect(svg, '子项 icon 字段应渲染注册表 SVG').not.toBeNull()
    expect(childBtn.querySelector('.icon svg path'), '子项图标 path 应渲染').not.toBeNull()
  })

  it('折叠态徽标为图标右上角紧凑角标（绝对定位不撑出 64px 图标条；默认药丸会溢出成白条）', () => {
    stubMatchMedia(false)
    const el = mount({ collapsed: '', items: '[{"label":"收件箱","value":"inbox","icon":"star","badge":"12"}]' })
    const stl = el.shadowRoot!.querySelector('style')!.textContent!
    expect(stl, '折叠态徽标应绝对定位为角标').toMatch(
      /:host\(:not\(\[data-mobile\]\)\[collapsed\]\)\s+\.item-badge\s*\{[^}]*position:\s*absolute/,
    )
    expect(stl).toMatch(/\.item-badge\s*\{[^}]*inset-block-start:\s*2px/)
    // 渲染出的徽标元素仍在（角标样式不影响内容）
    const badge = el.shadowRoot!.querySelector('[part="badge"]')
    expect(badge, '折叠态徽标元素仍在').not.toBeNull()
  })

  it('项操作：actions 渲染悬停操作按钮，点击派发 oas-action 且不触发 select', () => {
    stubMatchMedia(false)
    const el = mount({
      items:
        '[{"label":"项目","value":"proj","actions":[{"icon":"star","value":"edit","label":"编辑"}]}]',
    })
    const actionBtn = el.shadowRoot!.querySelector<HTMLElement>('[part="action"]')!
    expect(actionBtn.getAttribute('aria-label')).toBe('编辑')
    let actionDetail: unknown
    let selectCount = 0
    el.addEventListener('oas-action', (e) => (actionDetail = (e as CustomEvent).detail))
    el.addEventListener('oas-select', () => selectCount++)
    actionBtn.click()
    expect(actionDetail).toEqual({ value: 'proj', action: 'edit', label: '编辑' })
    expect(selectCount, '操作按钮不触发 select').toBe(0)
  })

  it('分隔线：{type:"divider"} 渲染 part="divider" 且不计入菜单项', () => {
    stubMatchMedia(false)
    const el = mount({
      items: '[{"label":"首页","value":"home"},{"type":"divider"},{"label":"设置","value":"s"}]',
    })
    const dividers = el.shadowRoot!.querySelectorAll('[part="divider"]')
    expect(dividers.length).toBe(1)
    expect(dividers[0]!.getAttribute('role')).toBe('separator')
    expect(el.shadowRoot!.querySelectorAll('[part="item"]').length).toBe(2)
  })

  it('loading 骨架屏：渲染 part="skeleton" 骨架行、不渲染菜单项', () => {
    stubMatchMedia(false)
    const el = mount({ loading: '', items: '[{"label":"首页","value":"home"}]' })
    expect(el.shadowRoot!.querySelectorAll('[part="skeleton"]').length).toBeGreaterThan(0)
    expect(el.shadowRoot!.querySelectorAll('[part="item"]').length).toBe(0)
    el.setAttribute('loading', '6')
    expect(el.shadowRoot!.querySelectorAll('[part="skeleton"]').length).toBe(6)
    el.removeAttribute('loading')
    expect(el.shadowRoot!.querySelectorAll('[part="item"]').length).toBe(1)
  })

  it('shortcut：ctrl/cmd+b 折叠切换（仅 shortcut 属性开启时）', () => {
    stubMatchMedia(false)
    const el = mount({ shortcut: '' })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }))
    expect(el.hasAttribute('collapsed')).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }))
    expect(el.hasAttribute('collapsed')).toBe(false)
    // metaKey 同样生效
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', metaKey: true, bubbles: true }))
    expect(el.hasAttribute('collapsed')).toBe(true)
    const elNoShortcut = mount()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }))
    expect(elNoShortcut.hasAttribute('collapsed'), '无 shortcut 属性不劫持 ctrl+b').toBe(false)
  })

  it('键盘导航：ArrowDown/ArrowUp 在可见项间移动焦点，Home/End 跳首末', () => {
    stubMatchMedia(false)
    const el = mount({
      items: '[{"label":"一","value":"a"},{"label":"二","value":"b"},{"label":"三","value":"c"}]',
    })
    const items = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')]
    items[0]!.focus()
    el.shadowRoot!.querySelector('.nav')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    )
    expect(el.shadowRoot!.activeElement).toBe(items[1])
    el.shadowRoot!.querySelector('.nav')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true }),
    )
    expect(el.shadowRoot!.activeElement).toBe(items[2])
    el.shadowRoot!.querySelector('.nav')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
    )
    expect(el.shadowRoot!.activeElement).toBe(items[1])
    el.shadowRoot!.querySelector('.nav')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
    )
    expect(el.shadowRoot!.activeElement).toBe(items[0])
  })

  it('折叠态图标项包 oas-tooltip（label 提示、placement=right）', () => {
    stubMatchMedia(false)
    const el = mount({
      items: '[{"label":"首页","value":"home","icon":"star"}]',
      collapsed: '',
    })
    const tip = el.shadowRoot!.querySelector('oas-tooltip')!
    expect(tip.getAttribute('content')).toBe('首页')
    expect(tip.getAttribute('placement')).toBe('right')
    expect(tip.querySelector('[part="item"]')).not.toBeNull()
  })

  it('expand-on-hover：折叠图标条悬停临时展开的 CSS 规则存在', () => {
    stubMatchMedia(false)
    const el = mount({ 'expand-on-hover': '', collapsed: '' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/\[expand-on-hover\]:hover[^}]*width:\s*var\(--oas-sidebar-width/)
    expect(css).toMatch(/\[expand-on-hover\]:hover[^}]*\.item \.label[^}]*display:\s*inline/)
  })

  it('side=right：移动抽屉从右侧滑入（CSS 规则存在）', () => {
    stubMatchMedia(true)
    const el = mount({ side: 'right' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/side='right'\][^{]*\.panel[^}]*inset-inline-end:\s*0/)
    expect(css).toMatch(/side='right'\][^{]*\[part='trigger'\][^}]*inset-inline-end/)
  })

  it('variant：floating/inset 形态 CSS 规则存在（圆角外边距）', () => {
    stubMatchMedia(false)
    const el = mount({ variant: 'floating' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/\[variant='floating'\][^}]*border-radius/)
    expect(css).toMatch(/\[variant='floating'\][^}]*box-shadow/)
    expect(css).toMatch(/\[variant='inset'\][^}]*border-radius/)
  })

  it('嵌套无图标项保留图标占位（图标占位不隐藏 + 宽度保留 18px，供子项 label 缩进对齐父项右侧）', () => {
    stubMatchMedia(false)
    const el = mount({
      items:
        '[{"label":"父项","value":"biz","icon":"star","children":[{"label":"子项","value":"users"}]}]',
    })
    const child = el.shadowRoot!.querySelector<HTMLElement>('[part="submenu"] [part="item"]')!
    const childIcon = child.querySelector('.icon') as HTMLElement
    // 嵌套无图标项：图标占位保留（不 hidden + 宽度 18px → label 缩进，不与父项齐平/更靠左；
    // 18px 为缩进收敛后的档位——24px 对无图标子项显空肥（实测评估后收敛）
    expect(childIcon.hidden, '嵌套无图标项图标占位不应隐藏').toBe(false)
    expect(getComputedStyle(childIcon).width, '嵌套图标占位宽度应保留（18px）').toBe('18px')
    // 像素级 label 缩进对齐（子 label 缩进父 label 右侧）由 qa-regression e2e 真布局断言覆盖
  })

  it('嵌套子菜单容器类名 .submenu 与嵌套按钮 .item.sub 不冲突（防容器样式串扰到按钮致激活背景溢出面板）', () => {
    stubMatchMedia(false)
    const el = mount({
      items:
        '[{"label":"管理","value":"admin","icon":"star","children":[{"label":"用户","value":"users"}]}]',
    })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    // 容器规则（margin/border/padding-inline-start）只作用于 .submenu，不作用于 .sub（嵌套按钮类名）
    expect(css).toMatch(/\.submenu\s*\{[^}]*margin-inline-start/)
    expect(css).toMatch(/\.submenu\s*\{[^}]*border-inline-start/)
    expect(css).not.toMatch(/\.sub\s*\{[^}]*margin-inline-start/)
    // 嵌套按钮不带容器 margin/border（否则激活背景右移溢出面板右缘）
    const subBtn = el.shadowRoot!.querySelector<HTMLElement>('[part="submenu"] [part="item"]')!
    const cs = getComputedStyle(subBtn)
    expect(cs.marginLeft === '' || cs.marginLeft === '0px', '嵌套按钮不应有容器 margin').toBe(true)
    expect(
      cs.borderLeftWidth === '' || cs.borderLeftWidth === '0px' || cs.borderLeftWidth === 'initial',
      '嵌套按钮不应有容器 border',
    ).toBe(true)
  })

  it('item hover 与宿主底色区分：hover 走 --oas-sidebar-item-hover-bg（默认 text-primary 6% 混色，不再与宿主 bg-hover 同 token）；active hover 加深一档', () => {
    stubMatchMedia(false)
    const el = mount()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    // hover 不再用 --oas-color-bg-hover（与宿主底色同 token → 零对比）
    expect(css).toMatch(/\.item:hover\s*\{[^}]*--oas-sidebar-item-hover-bg/)
    expect(css).toMatch(
      /\.item:hover\s*\{[^}]*color-mix\(in srgb, var\(--oas-color-text-primary\) 6%/,
    )
    // active:hover 有独立加深档（14% → 20%）
    expect(css).toMatch(
      /\.item\.active:hover\s*\{[^}]*color-mix\(in srgb, var\(--oas-color-primary\) 20%/,
    )
  })

  it('resizable：边缘拖拽条显隐（resizable 显示；无属性/折叠/移动态隐藏）', () => {
    stubMatchMedia(false)
    const el = mount({ resizable: '' })
    const rail = el.shadowRoot!.querySelector<HTMLElement>('[part="rail"]')!
    expect(rail.hidden).toBe(false)
    expect(rail.getAttribute('aria-label')).toBe('调整侧栏宽度')
    const elNo = mount()
    expect(elNo.shadowRoot!.querySelector<HTMLElement>('[part="rail"]')!.hidden).toBe(true)
    const elCollapsed = mount({ resizable: '', collapsed: '' })
    expect(elCollapsed.shadowRoot!.querySelector<HTMLElement>('[part="rail"]')!.hidden).toBe(true)
    stubMatchMedia(true)
    const elMobile = mount({ resizable: '' })
    expect(elMobile.shadowRoot!.querySelector<HTMLElement>('[part="rail"]')!.hidden).toBe(true)
  })

  it('resizable：拖拽 rail 写 width 属性（夹取 min/max）+ 松手派发 oas-resize', () => {
    stubMatchMedia(false)
    const el = mount({ resizable: '', width: '240px' })
    // happy-dom 无布局：stub host 宽度
    Object.defineProperty(el, 'getBoundingClientRect', {
      value: () => ({
        width: 240,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 240,
        bottom: 600,
        height: 600,
        toJSON: () => ({}),
      }),
      configurable: true,
    })
    const rail = el.shadowRoot!.querySelector<HTMLElement>('[part="rail"]')!
    let detail: unknown
    el.addEventListener('oas-resize', (e) => (detail = (e as CustomEvent).detail))
    rail.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 100, button: 0 }))
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 160 }))
    expect(el.getAttribute('width')).toBe('300px')
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 40 }))
    expect(el.getAttribute('width')).toBe('180px')
    // min 夹取（默认 160）
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: -100 }))
    expect(el.getAttribute('width')).toBe('160px')
    // max 夹取（默认 480）
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 1000 }))
    expect(el.getAttribute('width')).toBe('480px')
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 200 }))
    expect(detail).toEqual({ width: 480 })
    // 拖拽后 width 属性驱动 CSS 变量（update 写入，不被清除）
    expect(el.style.getPropertyValue('--oas-sidebar-width')).toBe('480px')
  })

  it('resizable：side=right 拖拽方向取反（向左拖变宽）', () => {
    stubMatchMedia(false)
    const el = mount({ resizable: '', side: 'right', width: '240px' })
    Object.defineProperty(el, 'getBoundingClientRect', {
      value: () => ({
        width: 240,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 240,
        bottom: 600,
        height: 600,
        toJSON: () => ({}),
      }),
      configurable: true,
    })
    const rail = el.shadowRoot!.querySelector<HTMLElement>('[part="rail"]')!
    rail.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 100, button: 0 }))
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 40 }))
    expect(el.getAttribute('width')).toBe('300px')
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 40 }))
  })

  it('resizable：方向键微调宽度（±8）+ Home/End 跳 min/max + resize-min/max 生效', () => {
    stubMatchMedia(false)
    const el = mount({ resizable: '', width: '240px', 'resize-min': '200', 'resize-max': '300' })
    Object.defineProperty(el, 'getBoundingClientRect', {
      value: () => ({
        width: 240,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 240,
        bottom: 600,
        height: 600,
        toJSON: () => ({}),
      }),
      configurable: true,
    })
    const rail = el.shadowRoot!.querySelector<HTMLElement>('[part="rail"]')!
    rail.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(el.getAttribute('width')).toBe('248px')
    // 再按 5 次 → 288；继续按 → 夹到 max 300
    for (let i = 0; i < 5; i++)
      rail.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(el.getAttribute('width')).toBe('288px')
    rail.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    rail.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    rail.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(el.getAttribute('width')).toBe('300px')
    rail.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    expect(el.getAttribute('width')).toBe('200px')
    rail.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(el.getAttribute('width')).toBe('200px')
    rail.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    expect(el.getAttribute('width')).toBe('300px')
  })
})

// ===== 子元素声明式通道（oas-sidebar-item / oas-sidebar-divider） =====
// 与 menu/breadcrumb 同范式：items 属性显式设置时数据驱动优先，否则解析子元素收敛到同一渲染路径

/** 子元素通道挂载：innerHTML 填 light DOM 子元素后 append（触发 render → 解析） */
function mountSidebarChildren(html: string, attrs: Record<string, string> = {}): OASSidebar {
  const el = document.createElement('oas-sidebar') as OASSidebar
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

describe('OASSidebar 子元素声明式通道', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('注册 oas-sidebar-item / oas-sidebar-divider 自定义元素', () => {
    expect(customElements.get('oas-sidebar-item')).not.toBeNull()
    expect(customElements.get('oas-sidebar-divider')).not.toBeNull()
  })

  it('基础：普通项/分组/divider/嵌套 children 混排解析渲染，与 items 通道一致', () => {
    stubMatchMedia(false)
    const el = mountSidebarChildren(`
      <oas-sidebar-item value="dash" icon="star" group="概览">仪表盘</oas-sidebar-item>
      <oas-sidebar-item value="orders" icon="star" group="概览">订单</oas-sidebar-item>
      <oas-sidebar-divider></oas-sidebar-divider>
      <oas-sidebar-item value="biz" icon="star">业务管理
        <oas-sidebar-item value="users">用户</oas-sidebar-item>
        <oas-sidebar-item value="roles">角色</oas-sidebar-item>
      </oas-sidebar-item>
    `)
    const root = el.shadowRoot!
    // 分组标题渲染一次（组首项前）
    const titles = [...root.querySelectorAll('[part="group"]')]
    expect(titles.length).toBe(1)
    expect(titles[0]!.textContent).toBe('概览')
    // 分隔线
    expect(root.querySelectorAll('[part="divider"]').length).toBe(1)
    // 顶层 3 项 + 嵌套 2 项
    const items = root.querySelectorAll<HTMLElement>('[part="item"]')
    expect(items.length).toBe(5)
    expect(items[0]!.querySelector('.label')!.textContent).toBe('仪表盘')
    expect(items[4]!.querySelector('.label')!.textContent).toBe('角色')
    // 嵌套父项：默认收起，点击展开/收起（与 items 通道一致）
    const parent = root.querySelector<HTMLElement>('[part="item"][data-value="biz"]')!
    const sub = root.querySelector<HTMLElement>('[part="submenu"]')!
    expect(parent.getAttribute('aria-expanded')).toBe('false')
    expect(sub.hidden).toBe(true)
    expect(sub.querySelectorAll('[part="item"]').length).toBe(2)
    parent.click()
    expect(parent.getAttribute('aria-expanded')).toBe('true')
    expect(sub.hidden).toBe(false)
  })

  it('items 属性显式设置时优先（子元素被忽略）', () => {
    stubMatchMedia(false)
    const el = mountSidebarChildren(`<oas-sidebar-item value="child">子项</oas-sidebar-item>`, {
      items: JSON.stringify([
        { label: '数据项', value: 'data' },
        { label: '末项', value: 'last' },
      ]),
    })
    const labels = [...el.shadowRoot!.querySelectorAll('[part="item"] .label')].map(
      (l) => l.textContent,
    )
    expect(labels).toEqual(['数据项', '末项'])
    expect(el.shadowRoot!.querySelector('[data-value="child"]')).toBeNull()
  })

  it('属性映射：badge 数字/字符串、icon 注册表名渲染 SVG、group 组标题', () => {
    stubMatchMedia(false)
    const el = mountSidebarChildren(`
      <oas-sidebar-item value="inbox" icon="star" badge="12" group="消息">收件箱</oas-sidebar-item>
      <oas-sidebar-item value="notice" badge="hot">通知</oas-sidebar-item>
    `)
    const root = el.shadowRoot!
    // 内部模型：纯数字 badge 转 number、非数字留 string（对齐 SidebarItem.badge 的 string|number）
    const model = (el as unknown as { _items: Array<{ badge?: string | number }> })._items
    expect(model[0]!.badge).toBe(12)
    expect(model[1]!.badge).toBe('hot')
    // 渲染层：徽标文本一致
    const badges = [...root.querySelectorAll('[part="badge"]')]
    expect(badges.length).toBe(2)
    expect(badges[0]!.textContent).toBe('12')
    expect(badges[1]!.textContent).toBe('hot')
    // icon 注册表名 → SVG
    expect(root.querySelector('[data-value="inbox"] .icon svg')).not.toBeNull()
    // group 组标题
    expect(root.querySelector('[part="group"]')!.textContent).toBe('消息')
  })

  it('MutationObserver：运行时 append oas-sidebar-item 后侧栏刷新出现新项', async () => {
    stubMatchMedia(false)
    const el = mountSidebarChildren(`<oas-sidebar-item value="home">首页</oas-sidebar-item>`)
    expect(el.shadowRoot!.querySelectorAll('[part="item"]').length).toBe(1)
    const item = document.createElement('oas-sidebar-item')
    item.setAttribute('value', 'about')
    item.textContent = '关于'
    el.appendChild(item)
    await new Promise((r) => setTimeout(r, 0))
    expect(el.shadowRoot!.querySelectorAll('[part="item"]').length).toBe(2)
    expect(el.shadowRoot!.querySelector('[data-value="about"]')).not.toBeNull()
    expect(
      el.shadowRoot!.querySelector<HTMLElement>('[data-value="about"] .label')!.textContent,
    ).toBe('关于')
  })

  it('MutationObserver：子项 badge 属性变化后徽标自动刷新', async () => {
    stubMatchMedia(false)
    const el = mountSidebarChildren(`<oas-sidebar-item value="inbox">收件箱</oas-sidebar-item>`)
    expect(el.shadowRoot!.querySelector('[part="badge"]')).toBeNull()
    el.querySelector('oas-sidebar-item')!.setAttribute('badge', '5')
    await new Promise((r) => setTimeout(r, 0))
    expect(el.shadowRoot!.querySelector('[part="badge"]')!.textContent).toBe('5')
  })

  it('折叠态：collapsed + 子元素通道 → 图标条渲染（label 隐藏、tooltip 可达、分组标题隐藏）', () => {
    stubMatchMedia(false)
    const el = mountSidebarChildren(
      `
      <oas-sidebar-item value="home" icon="star" group="导航">首页</oas-sidebar-item>
      <oas-sidebar-item value="settings">设置</oas-sidebar-item>
      `,
      { collapsed: '' },
    )
    const root = el.shadowRoot!
    const items = [...root.querySelectorAll<HTMLElement>('[part="item"]')]
    expect(items.length).toBe(2)
    // 有 icon 项可见；无 icon 项整体隐藏（与 items 通道一致）
    expect(items[0]!.hidden).toBe(false)
    expect(items[1]!.hidden).toBe(true)
    // 图标项包 tooltip（label 提示、placement=right）
    const tip = root.querySelector('oas-tooltip')!
    expect(tip.getAttribute('content')).toBe('首页')
    expect(tip.getAttribute('placement')).toBe('right')
    expect(tip.querySelector('[part="item"]')).not.toBeNull()
    // 分组标题渲染但折叠态 CSS 隐藏（与 items 通道同一规则）
    expect(root.querySelector('[part="group"]')!.textContent).toBe('导航')
    const css = root.querySelector('style')!.textContent!
    expect(css).toMatch(/collapsed\][^{]*\.group-title\s*\{[^}]*display:\s*none/)
    expect(css).toMatch(/collapsed\][^{]*\.item \.label\s*\{[^}]*display:\s*none/)
  })

  it('嵌套父项展开/收起与子项选中在子元素通道下不变（collapsed 子树隐藏）', () => {
    stubMatchMedia(false)
    const el = mountSidebarChildren(`
      <oas-sidebar-item value="biz" icon="star">业务管理
        <oas-sidebar-item value="users">用户</oas-sidebar-item>
      </oas-sidebar-item>
    `)
    const root = el.shadowRoot!
    const parent = root.querySelector<HTMLElement>('[part="item"][data-value="biz"]')!
    const sub = root.querySelector<HTMLElement>('[part="submenu"]')!
    // 父项点击只切换展开，不派发 select
    let selectCount = 0
    el.addEventListener('oas-select', () => selectCount++)
    parent.click()
    expect(parent.getAttribute('aria-expanded')).toBe('true')
    expect(sub.hidden).toBe(false)
    expect(selectCount).toBe(0)
    // 子项点击派发 oas-select
    let detail: unknown
    el.addEventListener('oas-select', (e) => (detail = (e as CustomEvent).detail))
    root.querySelector<HTMLElement>('[part="submenu"] [part="item"]')!.click()
    expect(detail).toEqual({ value: 'users', label: '用户' })
    // 再点父项收起
    parent.click()
    expect(parent.getAttribute('aria-expanded')).toBe('false')
    expect(sub.hidden).toBe(true)
    // 折叠态：嵌套父项渲染为纯图标项（新设计——折叠态子树不渲染，展开箭头/aria-expanded 死交互移除；
    // collapsed 触发重渲染，重新查询节点）
    el.setAttribute('collapsed', '')
    const parent2 = root.querySelector<HTMLElement>('[part="item"][data-value="biz"]')!
    expect(root.querySelector('[part="submenu"]'), '折叠态嵌套子树不渲染').toBeNull()
    expect(parent2.querySelector('.chevron'), '折叠态父项无展开箭头').toBeNull()
    expect(parent2.getAttribute('aria-expanded'), '折叠态父项无 aria-expanded').toBeNull()
    // 折叠态点击父项：按普通项派发 oas-select（与 items 通道同构行为一致）
    let collapsedDetail: unknown
    el.addEventListener('oas-select', (e) => (collapsedDetail = (e as CustomEvent).detail))
    parent2.click()
    expect(collapsedDetail).toEqual({ value: 'biz', label: '业务管理' })
    // 同构 items 通道对照：折叠态同样无子树/无箭头
    const elItems = mount({
      collapsed: '',
      items: JSON.stringify([
        {
          label: '业务管理',
          value: 'biz',
          icon: 'star',
          children: [{ label: '用户', value: 'users' }],
        },
      ]),
    })
    const pItems = elItems.shadowRoot!.querySelector<HTMLElement>('[part="item"][data-value="biz"]')!
    expect(elItems.shadowRoot!.querySelector('[part="submenu"]'), 'items 通道折叠态同样不渲染子树').toBeNull()
    expect(pItems.querySelector('.chevron'), 'items 通道折叠态同样无箭头').toBeNull()
  })
})

// ===== 图标通道与着色 =====
// customIcons 是模块级共享 Map（无清理 API）：本 describe 置于文件末尾，注册的自定义名
// 只影响其后不再有测试执行的文件区段；其中「同名覆盖」用内置 check（本文件其它测试不用
// check），避免污染其它测试高频使用的内置 star。vitest 默认按文件隔离模块，不影响其它测试文件。

describe('OASSidebar 图标通道与着色', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('registerIcon 注册的自定义图标名在 sidebar items 中渲染为对应 SVG（查表打通）', () => {
    stubMatchMedia(false)
    registerIcon('sidebar-custom-rocket', '<path d="M1 1 L15 15"/>')
    const el = mount({
      items: JSON.stringify([{ label: '任务', value: 'task', icon: 'sidebar-custom-rocket' }]),
    })
    const svg = el.shadowRoot!.querySelector<SVGSVGElement>('.icon svg')
    expect(svg, 'registerIcon 注册的自定义图标应渲染为 SVG').not.toBeNull()
    expect(svg!.querySelector('path')!.getAttribute('d')).toBe('M1 1 L15 15')
  })

  it('同名覆盖：registerIcon 与内置同名时 sidebar 用自定义版（customIcons 优先）', () => {
    stubMatchMedia(false)
    registerIcon('check', '<path d="M2 2 L14 14"/>') // 与内置 check 同名 → 自定义版覆盖
    const el = mount({ items: JSON.stringify([{ label: '完成', value: 'done', icon: 'check' }]) })
    const svg = el.shadowRoot!.querySelector<SVGSVGElement>('.icon svg')
    expect(svg).not.toBeNull()
    expect(svg!.querySelector('path')!.getAttribute('d')).toBe('M2 2 L14 14')
  })

  it('iconColor 显式时 svg stroke 为该色值；未给时保持 currentColor（既有行为零回归）', () => {
    stubMatchMedia(false)
    const el = mount({
      items: JSON.stringify([
        { label: '一', value: 'a', icon: 'star', iconColor: '#f50' },
        { label: '二', value: 'b', icon: 'star' },
      ]),
    })
    const svgs = el.shadowRoot!.querySelectorAll<SVGSVGElement>('.icon svg')
    expect(svgs[0]!.getAttribute('stroke')).toBe('#f50')
    expect(svgs[1]!.getAttribute('stroke')).toBe('currentColor')
  })

  it('彩色自定义 SVG（path 自带 stroke 属性）保留自带色，外层不强制覆盖', () => {
    stubMatchMedia(false)
    registerIcon('sidebar-color-heart', '<path d="M2 2 L14 14" stroke="#0a0" fill="none"/>')
    const el = mount({
      items: JSON.stringify([{ label: '徽标', value: 'logo', icon: 'sidebar-color-heart' }]),
    })
    const path = el.shadowRoot!.querySelector<SVGPathElement>('.icon svg path')
    expect(path, '彩色自定义 SVG 应渲染').not.toBeNull()
    expect(path!.getAttribute('stroke'), 'path 自带 stroke 应保留（外层 stroke 不干扰）').toBe(
      '#0a0',
    )
  })

  it('折叠态 tooltip 图标与展开态同色（iconColor 一致性）', () => {
    stubMatchMedia(false)
    const el = mount({
      collapsed: '',
      items: JSON.stringify([{ label: '首页', value: 'home', icon: 'star', iconColor: '#0af' }]),
    })
    const tip = el.shadowRoot!.querySelector('oas-tooltip')
    expect(tip, '折叠态图标项应包 tooltip').not.toBeNull()
    const svg = tip!.querySelector<SVGSVGElement>('svg')
    expect(svg, 'tooltip 内应有图标 svg').not.toBeNull()
    expect(svg!.getAttribute('stroke')).toBe('#0af')
  })

  it('子元素声明式通道：oas-sidebar-item 的 icon-color 属性映射到 iconColor（双通道一致）', () => {
    stubMatchMedia(false)
    const el = new OASSidebar()
    el.innerHTML = `<oas-sidebar-item value="home" icon="star" icon-color="#f0a">首页</oas-sidebar-item>`
    document.body.appendChild(el)
    const svg = el.shadowRoot!.querySelector<SVGSVGElement>('.icon svg')
    expect(svg, '子元素 icon 应渲染').not.toBeNull()
    expect(svg!.getAttribute('stroke'), 'icon-color 应映射为 iconColor 生效').toBe('#f0a')
  })

  it('背景开口 --oas-sidebar-bg：默认回落 var 链（不硬编码），三形态各自默认', () => {
    const el = new OASSidebar()
    document.body.appendChild(el)
    const stl = el.shadowRoot!.querySelector('style')!.textContent!
    // 默认/inset 回落 bg-hover、floating 回落 bg——var 链锚定基础 token（主题/暗色/品牌定制自动传导）
    expect(stl).toMatch(/:host\s*\{[^}]*background:\s*var\(--oas-sidebar-bg,\s*var\(--oas-color-bg-hover\)\)/)
    expect(stl).toMatch(
      /:host\(\[variant='floating'\]\)\s*\{[^}]*background:\s*var\(--oas-sidebar-bg,\s*var\(--oas-color-bg\)\)/,
    )
    expect(stl).toMatch(
      /:host\(\[variant='inset'\]\)\s*\{[^}]*background:\s*var\(--oas-sidebar-bg,\s*var\(--oas-color-bg-hover\)\)/,
    )
  })

  it('hide-toggle：桌面折叠按钮隐藏（宿主 opt-out）；默认显示', () => {
    stubMatchMedia(false)
    const el = mount({ 'hide-toggle': '' })
    const toggle = el.shadowRoot!.querySelector<HTMLElement>('[part="toggle"]')
    expect(toggle, 'toggle 按钮存在').not.toBeNull()
    expect(toggle!.hidden, 'hide-toggle 时折叠按钮应隐藏').toBe(true)
    // 对照：无属性时桌面显示
    const el2 = mount({})
    const toggle2 = el2.shadowRoot!.querySelector<HTMLElement>('[part="toggle"]')
    expect(toggle2!.hidden, '默认桌面应显示折叠按钮').toBe(false)
    // observedAttributes 覆盖（属性动态变化可触发 update）
    expect(OASSidebar.observedAttributes).toContain('hide-toggle')
  })
})
