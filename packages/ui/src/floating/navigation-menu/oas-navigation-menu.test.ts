import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import '@oas-ui/i18n'
import { OASNavigationMenu } from './index.js'

// 文件级钩子：覆盖所有 describe（含新增能力测试块）。
// happy-dom 缺陷规避：Document 内部 activeElement symbol 跨测试残留指向已移除
// 子树时，ShadowRoot.activeElement 遍历会崩溃（blur 因 symbol≠getter 结果是 no-op，
// 用 body.focus() 覆盖 symbol 复位）
beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.focus()
  document.body.innerHTML = ''
})

// 大面板形态：顶级项带 children 打开统一 viewport 面板；面板内多列网格链接卡（icon+标题+描述）+ inline 二级子导航
const ITEMS = JSON.stringify([
  {
    label: '产品',
    value: 'products',
    children: [
      {
        label: '组件',
        value: 'components',
        href: '/components',
        icon: 'star',
        description: '30+ 组件',
      },
      { label: '文档', value: 'docs', href: '/docs', icon: 'user', description: 'API 文档' },
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
  {
    label: '资源',
    value: 'resources',
    children: [
      { label: '主题', value: 'themes', href: '/themes', icon: 'star' },
      { label: '指南', value: 'guide', href: '/guide' },
    ],
  },
  { label: '定价', value: 'pricing', href: '/pricing' },
])

// 两个带 children 的顶级项 + 一个叶子，用于面板切换 / 延迟 / skip-delay 测试
const SWITCH_ITEMS = JSON.stringify([
  {
    label: '产品',
    value: 'products',
    children: [{ label: '组件', value: 'components', href: '/components' }],
  },
  {
    label: '资源',
    value: 'resources',
    children: [{ label: '博客', value: 'blog', href: '/blog' }],
  },
  { label: '定价', value: 'pricing', href: '/pricing' },
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

function bar(el: OASNavigationMenu): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
}

function topItems(el: OASNavigationMenu): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="top-item"]')]
}

function viewport(el: OASNavigationMenu): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
}

function panel(el: OASNavigationMenu): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
}

function grid(el: OASNavigationMenu): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="grid"]')
}

function panelItems(el: OASNavigationMenu): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')]
}

function isOpen(el: OASNavigationMenu): boolean {
  return viewport(el).classList.contains('open')
}

function key(el: OASNavigationMenu, k: string): void {
  nav(el).dispatchEvent(new KeyboardEvent('keydown', { key: k }))
}

function panelFocusables(el: OASNavigationMenu): HTMLElement[] {
  return [
    ...panel(el).querySelectorAll<HTMLElement>(
      '[part="card-link"], [part="section-title"], [part="section-links"] a',
    ),
  ]
}

describe('OASNavigationMenu', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  // ============ 大面板内容形态 ============

  it('渲染 role=navigation + aria-label；顶级触发器为 button（disclosure 模式，无 menuitem role）', () => {
    const el = mount()
    expect(nav(el).getAttribute('role')).toBe('navigation')
    expect(nav(el).getAttribute('aria-label')).toBe('导航')
    expect(topItems(el).length).toBe(3)
    expect(topItems(el)[0]!.getAttribute('role')).toBeNull()
    expect(topItems(el)[0]!.tagName).toBe('BUTTON')
  })

  it('带 href 的叶子顶级项渲染为链接，无 children 顶级项无 aria-expanded', () => {
    const el = mount()
    const pricing = topItems(el)[2]!
    expect(pricing.tagName).toBe('A')
    expect(pricing.getAttribute('href')).toBe('/pricing')
    expect(pricing.getAttribute('aria-expanded')).toBeNull()
  })

  it('顶级触发器带下拉箭头 chevron（part=chevron），叶子无', () => {
    const el = mount()
    expect(topItems(el)[0]!.querySelector('[part="chevron"]')).not.toBeNull()
    expect(topItems(el)[2]!.querySelector('[part="chevron"]')).toBeNull()
  })

  it('点击顶级触发器打开统一 viewport 面板：面板内含多列网格链接卡（icon + 标题 + description）', () => {
    const el = mount({ 'delay-duration': '0' })
    topItems(el)[0]!.click()
    expect(isOpen(el)).toBe(true)
    const g = grid(el)
    expect(g).not.toBeNull()
    // columns 默认 2 → 网格列数变量
    expect(g!.style.getPropertyValue('--nav-columns')).toBe('2')
    const cards = panelItems(el).filter((li) => li.querySelector('[part="card-link"]'))
    expect(cards.length).toBe(2)
    expect(cards[0]!.textContent).toContain('组件')
    expect(cards[0]!.textContent).toContain('30+ 组件')
    expect(cards[0]!.querySelector('.icon svg')).not.toBeNull()
    expect(cards[0]!.querySelector('a[href="/components"]')).not.toBeNull()
  })

  it('columns 属性控制面板网格列数', () => {
    const el = mount({ 'delay-duration': '0', columns: '3' })
    topItems(el)[0]!.click()
    expect(grid(el)!.style.getPropertyValue('--nav-columns')).toBe('3')
  })

  it('面板链接卡点击 → oas-select（detail.value）+ 收起面板', () => {
    const el = mount({ 'delay-duration': '0' })
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    topItems(el)[0]!.click()
    panelItems(el)[0]!.click()
    expect(detail).toEqual({ value: 'components' })
    expect(isOpen(el)).toBe(false)
  })

  it('面板内容统一渲染在 viewport 容器内（所有顶级项共用同一面板）', () => {
    const el = mount({ 'delay-duration': '0' })
    topItems(el)[0]!.click()
    expect(panel(el).closest('[part="viewport"]')).not.toBeNull()
    // 切换打开项 → 同一 viewport 内面板内容替换
    topItems(el)[1]!.click()
    expect(isOpen(el)).toBe(true)
    expect(panelItems(el).some((li) => li.textContent!.includes('主题'))).toBe(true)
  })

  // ============ 延迟开合 ============

  it('hover 顶级触发器延迟打开（delay-duration 默认 200ms），未到时间不开', () => {
    vi.useFakeTimers()
    const el = mount()
    topItems(el)[0]!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    vi.advanceTimersByTime(199)
    expect(isOpen(el)).toBe(false)
    vi.advanceTimersByTime(2)
    expect(isOpen(el)).toBe(true)
    vi.useRealTimers()
  })

  it('delay-duration="0"：hover 立即打开', () => {
    const el = mount({ 'delay-duration': '0' })
    topItems(el)[0]!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    expect(isOpen(el)).toBe(true)
  })

  it('鼠标离开导航栏延迟关闭（delay-duration）', () => {
    vi.useFakeTimers()
    const el = mount()
    topItems(el)[0]!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    vi.advanceTimersByTime(200)
    expect(isOpen(el)).toBe(true)
    nav(el).dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    vi.advanceTimersByTime(199)
    expect(isOpen(el)).toBe(true)
    vi.advanceTimersByTime(2)
    expect(isOpen(el)).toBe(false)
    vi.useRealTimers()
  })

  it('skip-delay-duration：关闭后立即 hover 另一项跳过打开延迟', () => {
    vi.useFakeTimers()
    const el = mount({ items: SWITCH_ITEMS, 'delay-duration': '200', 'skip-delay-duration': '300' })
    // 打开 A → 关闭
    topItems(el)[0]!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    vi.advanceTimersByTime(200)
    nav(el).dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    vi.advanceTimersByTime(200)
    expect(isOpen(el)).toBe(false)
    // 立即 hover B：skip-delay 命中 → 跳过 200ms 延迟直接打开
    topItems(el)[1]!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    vi.advanceTimersByTime(0)
    expect(isOpen(el)).toBe(true)
    vi.useRealTimers()
  })

  it('超过 skip-delay-duration 后恢复延迟打开', () => {
    vi.useFakeTimers()
    const el = mount({ items: SWITCH_ITEMS, 'delay-duration': '200', 'skip-delay-duration': '100' })
    topItems(el)[0]!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    vi.advanceTimersByTime(200)
    nav(el).dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    vi.advanceTimersByTime(200)
    // 超过 100ms 窗口
    vi.advanceTimersByTime(120)
    topItems(el)[1]!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    vi.advanceTimersByTime(199)
    expect(isOpen(el)).toBe(false)
    vi.advanceTimersByTime(2)
    expect(isOpen(el)).toBe(true)
    vi.useRealTimers()
  })

  // ============ 受控 value + oas-change ============

  it('value 属性受控打开面板（打开项 = value）', () => {
    const el = mount({ value: 'products' })
    expect(isOpen(el)).toBe(true)
    expect(viewport(el).getAttribute('data-value')).toBe('products')
  })

  it('打开/关闭派发 oas-change（detail.value）；受控时交互不改写属性、由宿主更新', () => {
    const el = mount({ 'delay-duration': '0' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    topItems(el)[0]!.click()
    expect(detail).toEqual({ value: 'products' })
    // 非受控：点击另一顶级切换打开项并派发 oas-change
    topItems(el)[1]!.click()
    expect(detail).toEqual({ value: 'resources' })
    // 关闭：value 置空
    topItems(el)[1]!.click()
    expect(detail).toEqual({ value: '' })
    expect(isOpen(el)).toBe(false)
  })

  it('受控（value 属性存在）时点击不改内部打开态，仅派发 oas-change', () => {
    const el = mount({ value: 'products', 'delay-duration': '0' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    topItems(el)[1]!.click()
    expect(detail).toEqual({ value: 'resources' })
    // 受控：宿主未更新 value 属性 → 打开项仍为 products
    expect(viewport(el).getAttribute('data-value')).toBe('products')
  })

  // ============ 外部点击关闭 + Link active / aria-current ============

  it('外部 pointerdown 关闭面板', () => {
    const el = mount({ 'delay-duration': '0' })
    topItems(el)[0]!.click()
    expect(isOpen(el)).toBe(true)
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(isOpen(el)).toBe(false)
    outside.remove()
  })

  it('item.active → 链接渲染 aria-current="page"（顶级与面板链接）', () => {
    const el = mount({
      items: JSON.stringify([
        { label: '首页', value: 'home', href: '/', active: true },
        {
          label: '产品',
          value: 'products',
          children: [{ label: '组件', value: 'components', href: '/components', active: true }],
        },
      ]),
      'delay-duration': '0',
    })
    expect(topItems(el)[0]!.getAttribute('aria-current')).toBe('page')
    topItems(el)[1]!.click()
    const link = panel(el).querySelector<HTMLElement>('a[href="/components"]')!
    expect(link.getAttribute('aria-current')).toBe('page')
  })

  // ============ Viewport / data-motion / Indicator ============

  it('切换打开项设置面板 data-motion 方向（from-start / from-end）', () => {
    const el = mount({ 'delay-duration': '0' })
    topItems(el)[0]!.click()
    expect(panel(el).getAttribute('data-motion')).toBe('from-start')
    topItems(el)[1]!.click() // 向右 → from-end
    expect(panel(el).getAttribute('data-motion')).toBe('from-end')
    topItems(el)[0]!.click() // 向左 → from-start
    expect(panel(el).getAttribute('data-motion')).toBe('from-start')
  })

  it('Indicator 指示条存在，打开时 data-state=open', () => {
    const el = mount({ 'delay-duration': '0' })
    const ind = el.shadowRoot!.querySelector<HTMLElement>('[part="indicator"]')!
    expect(ind).not.toBeNull()
    expect(ind.getAttribute('data-state')).toBe('closed')
    topItems(el)[0]!.click()
    expect(ind.getAttribute('data-state')).toBe('open')
  })

  // ============ orientation="vertical" ============

  it('orientation="vertical"：bar 竖排（data-orientation + vertical class），面板右侧展开', () => {
    const el = mount({ orientation: 'vertical' })
    expect(bar(el).getAttribute('data-orientation')).toBe('vertical')
    expect(bar(el).classList.contains('vertical')).toBe(true)
    expect(viewport(el).classList.contains('vertical')).toBe(true)
  })

  // ============ 面板内 inline 二级子导航（常开一项） ============

  it('面板内带 children 的项渲染 inline 二级子导航：标题 + 子链接列表', () => {
    const el = mount({ 'delay-duration': '0' })
    topItems(el)[0]!.click()
    const section = el.shadowRoot!.querySelector<HTMLElement>('[part="section"]')!
    expect(section).not.toBeNull()
    expect(section.textContent).toContain('更多')
    const links = [...section.querySelectorAll<HTMLElement>('[part="section-links"] a')]
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/blog', '/community'])
  })

  it('inline 二级子导航常开一项：默认展开第一项，点击切换', () => {
    const el = mount({
      items: JSON.stringify([
        {
          label: '产品',
          value: 'products',
          children: [
            { label: '组件', value: 'components', href: '/components' },
            {
              label: '文档',
              value: 'docs',
              children: [
                { label: '指南', value: 'guide', href: '/guide' },
                { label: 'API', value: 'api', href: '/api' },
              ],
            },
            {
              label: '资源',
              value: 'resources',
              children: [
                { label: '博客', value: 'blog', href: '/blog' },
                { label: '社区', value: 'community', href: '/community' },
              ],
            },
          ],
        },
      ]),
      'delay-duration': '0',
    })
    topItems(el)[0]!.click()
    const titles = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="section-title"]')]
    expect(titles.length).toBe(2)
    // 默认第一项展开
    expect(titles[0]!.getAttribute('aria-expanded')).toBe('true')
    expect(titles[1]!.getAttribute('aria-expanded')).toBe('false')
    // 点击第二项 → 切换（常开一项）
    titles[1]!.click()
    expect(titles[0]!.getAttribute('aria-expanded')).toBe('false')
    expect(titles[1]!.getAttribute('aria-expanded')).toBe('true')
  })

  // ============ Backdrop / keep-mounted / arrow / max-height ============

  it('backdrop 属性：打开时显示遮罩，点击遮罩关闭', () => {
    const el = mount({ backdrop: '', 'delay-duration': '0' })
    const bd = el.shadowRoot!.querySelector<HTMLElement>('[part="backdrop"]')!
    expect(bd).not.toBeNull()
    topItems(el)[0]!.click()
    expect(bd.classList.contains('open')).toBe(true)
    bd.click()
    expect(isOpen(el)).toBe(false)
    expect(bd.classList.contains('open')).toBe(false)
  })

  it('无 backdrop 属性时不显示遮罩', () => {
    const el = mount({ 'delay-duration': '0' })
    topItems(el)[0]!.click()
    const bd = el.shadowRoot!.querySelector<HTMLElement>('[part="backdrop"]')!
    expect(bd.classList.contains('open')).toBe(false)
  })

  it('keep-mounted：关闭时面板 DOM 保留（供爬虫索引）；默认关闭清空面板', () => {
    const kept = mount({ 'keep-mounted': '', 'delay-duration': '0' })
    topItems(kept)[0]!.click()
    expect(panelItems(kept).length).toBeGreaterThan(0)
    topItems(kept)[0]!.click()
    expect(isOpen(kept)).toBe(false)
    expect(panel(kept).textContent).toContain('组件') // DOM 保留

    const cleared = mount({ 'delay-duration': '0' })
    topItems(cleared)[0]!.click()
    topItems(cleared)[0]!.click()
    expect(isOpen(cleared)).toBe(false)
    expect(panel(cleared).textContent).toBe('') // 默认清空
  })

  it('弹出层箭头 arrow：默认存在；arrow="false" 隐藏', () => {
    const el = mount({ 'delay-duration': '0' })
    topItems(el)[0]!.click()
    expect(el.shadowRoot!.querySelector('[part="arrow"]')).not.toBeNull()
    const hidden = mount({ arrow: 'false', 'delay-duration': '0' })
    topItems(hidden)[0]!.click()
    const ar = hidden.shadowRoot!.querySelector<HTMLElement>('[part="arrow"]')!
    expect(ar.hasAttribute('hidden')).toBe(true)
  })

  it('超大面板滚动：面板 max-height 由 CSS 变量兜底（宿主可覆盖）', () => {
    const el = mount()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('max-height: var(--oas-nav-panel-max-height')
    expect(css).toContain('overflow')
  })

  // ============ 键盘导航 ============

  it('ArrowDown 打开面板并聚焦第一面板项', () => {
    const el = mount()
    key(el, 'ArrowDown')
    expect(isOpen(el)).toBe(true)
    expect(el.shadowRoot!.activeElement).toBe(panelFocusables(el)[0])
  })

  it('面板内 ArrowDown 移动、Enter 选中并收起 + oas-select', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    key(el, 'ArrowDown') // 打开 产品，聚焦 组件
    key(el, 'ArrowDown') // 文档
    key(el, 'Enter')
    expect(detail).toEqual({ value: 'docs' })
    expect(isOpen(el)).toBe(false)
    expect(el.shadowRoot!.activeElement).toBe(topItems(el)[0])
  })

  it('顶级 ArrowLeft/ArrowRight 移动高亮', () => {
    const el = mount()
    key(el, 'ArrowRight')
    expect(topItems(el)[1]!.classList.contains('active')).toBe(true)
    key(el, 'ArrowLeft')
    expect(topItems(el)[0]!.classList.contains('active')).toBe(true)
  })

  it('Escape 关闭面板并聚焦顶级项', () => {
    const el = mount()
    key(el, 'ArrowDown')
    key(el, 'Escape')
    expect(isOpen(el)).toBe(false)
    expect(el.shadowRoot!.activeElement).toBe(topItems(el)[0])
  })

  it('面板内 ArrowRight 展开 inline 二级子导航并聚焦其第一个链接', () => {
    const el = mount()
    key(el, 'ArrowDown') // 打开 产品
    key(el, 'ArrowDown') // 文档
    key(el, 'ArrowDown') // 更多（section-title）
    key(el, 'ArrowRight')
    const links = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="section-links"] a')]
    expect(el.shadowRoot!.activeElement).toBe(links[0])
    key(el, 'ArrowLeft') // 返回 section-title
    const title = el.shadowRoot!.querySelector<HTMLElement>('[part="section-title"]')!
    expect(el.shadowRoot!.activeElement).toBe(title)
  })

  it('键盘导航跳过 disabled 面板项', () => {
    const el = mount({
      items: JSON.stringify([
        {
          label: '产品',
          value: 'products',
          children: [
            { label: '只读', value: 'ro', disabled: true },
            { label: '组件', value: 'components', href: '/components' },
          ],
        },
      ]),
    })
    key(el, 'ArrowDown') // 打开，跳过 disabled 聚焦 组件
    expect(el.shadowRoot!.activeElement!.textContent).toContain('组件')
  })

  it('disabled 顶级触发器不可展开', () => {
    const el = mount({
      items: JSON.stringify([
        { label: '禁用', value: 'x', disabled: true, children: [{ label: '子', value: 'sub' }] },
      ]),
      'delay-duration': '0',
    })
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    topItems(el)[0]!.click()
    expect(isOpen(el)).toBe(false)
    expect(fired).toBe(0)
  })

  it('焦点陷阱：面板打开时 Tab 在面板项间循环', () => {
    const el = mount()
    key(el, 'ArrowDown')
    const items = panelFocusables(el)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
    expect(el.shadowRoot!.activeElement).toBe(items[1])
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }))
    expect(el.shadowRoot!.activeElement).toBe(items[0])
  })

  // ============ 数据 ============

  it('items 数据变化增量重渲染', () => {
    const el = mount()
    el.setAttribute('items', JSON.stringify([{ label: '首页', value: 'home', href: '/' }]))
    expect(topItems(el).length).toBe(1)
    expect(topItems(el)[0]!.textContent).toBe('首页')
  })
})

// ============ 箭头跟随触发器（--arrow-x / --arrow-y） ============

describe('箭头跟随触发器', () => {
  it('打开后按当前触发器位置写入 --arrow-x（水平：offsetLeft + 半宽 - 半箭头）', () => {
    const el = mount({ 'delay-duration': '0' })
    const trigger = topItems(el)[0]!
    Object.defineProperty(trigger, 'offsetLeft', { value: 120, configurable: true })
    Object.defineProperty(trigger, 'offsetWidth', { value: 80, configurable: true })
    trigger.click()
    const ar = el.shadowRoot!.querySelector<HTMLElement>('[part="arrow"]')!
    expect(ar.style.getPropertyValue('--arrow-x')).toBe('156px') // 120 + 40 - 4
  })

  it('切换触发器后箭头位置更新（跟随新打开项）', () => {
    const el = mount({ items: SWITCH_ITEMS, 'delay-duration': '0' })
    const first = topItems(el)[0]!
    const second = topItems(el)[1]!
    Object.defineProperty(first, 'offsetLeft', { value: 0, configurable: true })
    Object.defineProperty(first, 'offsetWidth', { value: 80, configurable: true })
    Object.defineProperty(second, 'offsetLeft', { value: 200, configurable: true })
    Object.defineProperty(second, 'offsetWidth', { value: 80, configurable: true })
    first.click()
    const ar = el.shadowRoot!.querySelector<HTMLElement>('[part="arrow"]')!
    expect(ar.style.getPropertyValue('--arrow-x')).toBe('36px') // 0 + 40 - 4
    second.click()
    expect(ar.style.getPropertyValue('--arrow-x')).toBe('236px') // 200 + 40 - 4
  })

  it('竖排写入 --arrow-y（垂直中心）', () => {
    const el = mount({ orientation: 'vertical', 'delay-duration': '0' })
    const trigger = topItems(el)[0]!
    Object.defineProperty(trigger, 'offsetTop', { value: 30, configurable: true })
    Object.defineProperty(trigger, 'offsetHeight', { value: 40, configurable: true })
    trigger.click()
    const ar = el.shadowRoot!.querySelector<HTMLElement>('[part="arrow"]')!
    expect(ar.style.getPropertyValue('--arrow-y')).toBe('46px') // 30 + 20 - 4
  })
})

// ============ 碰撞/翻转（窄视口右缘 / 下缘） ============

describe('碰撞翻转', () => {
  it('面板宽于剩余视口：右缘溢出 flip-right（right 对齐）', () => {
    const el = mount({ 'delay-duration': '0' })
    const p = panel(el)
    Object.defineProperty(p, 'scrollWidth', { value: 400, configurable: true })
    Object.defineProperty(window, 'innerWidth', { value: 300, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
    topItems(el)[0]!.click()
    expect(viewport(el).classList.contains('flip-right')).toBe(true)
  })

  it('面板底部超出视口下缘：flip-up 向上弹', () => {
    const el = mount({ 'delay-duration': '0' })
    const p = panel(el)
    Object.defineProperty(p, 'scrollHeight', { value: 200, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 300, configurable: true })
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
    Object.defineProperty(viewport(el), 'getBoundingClientRect', {
      value: () => ({
        top: 400,
        bottom: 400,
        left: 0,
        right: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON() {},
      }),
      configurable: true,
    })
    topItems(el)[0]!.click()
    expect(viewport(el).classList.contains('flip-up')).toBe(true)
  })

  it('空间充足时不翻转', () => {
    const el = mount({ 'delay-duration': '0' })
    Object.defineProperty(window, 'innerWidth', { value: 2000, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 2000, configurable: true })
    topItems(el)[0]!.click()
    expect(viewport(el).classList.contains('flip-right')).toBe(false)
    expect(viewport(el).classList.contains('flip-up')).toBe(false)
  })
})

// ============ loop 循环开关 ============

describe('loop 循环开关', () => {
  it('缺省循环：首项 ArrowLeft 回绕到末项', () => {
    const el = mount({ items: SWITCH_ITEMS })
    key(el, 'ArrowLeft')
    expect(topItems(el)[2]!.classList.contains('active')).toBe(true)
  })

  it('loop="false"：边界停止不循环', () => {
    const el = mount({ items: SWITCH_ITEMS, loop: 'false' })
    key(el, 'ArrowLeft') // 首项不回绕
    expect(topItems(el)[0]!.classList.contains('active')).toBe(true)
    key(el, 'ArrowRight')
    key(el, 'ArrowRight')
    expect(topItems(el)[2]!.classList.contains('active')).toBe(true)
    key(el, 'ArrowRight') // 末项停止
    expect(topItems(el)[2]!.classList.contains('active')).toBe(true)
  })

  it('loop 列入 observedAttributes', () => {
    expect(OASNavigationMenu.observedAttributes).toContain('loop')
  })
})

// ============ Sub 二级级联（面板内覆盖式二级面板） ============

const SUB_ITEMS = JSON.stringify([
  {
    label: '产品',
    value: 'products',
    children: [
      { label: '组件', value: 'components', href: '/components' },
      {
        label: '学习中心',
        value: 'learn',
        sub: [
          { label: '文档', value: 'docs', href: '/docs' },
          { label: '教程', value: 'tutorial', href: '/tutorial' },
          { label: '社区', value: 'community', href: '/community', disabled: true },
        ],
      },
    ],
  },
])

describe('Sub 二级级联', () => {
  it('面板内带 sub 字段的项渲染二级触发器（非 section/card）', () => {
    const el = mount({ items: SUB_ITEMS, 'delay-duration': '0' })
    topItems(el)[0]!.click()
    const trig = el.shadowRoot!.querySelector<HTMLElement>('[part="sub-trigger"]')!
    expect(trig).not.toBeNull()
    expect(trig.textContent).toContain('学习中心')
    expect(trig.getAttribute('aria-expanded')).toBe('false')
  })

  it('点击二级触发器打开覆盖式二级面板：内容为 sub 链接列表，焦点移入首项', () => {
    const el = mount({ items: SUB_ITEMS, 'delay-duration': '0' })
    topItems(el)[0]!.click()
    const trig = el.shadowRoot!.querySelector<HTMLElement>('[part="sub-trigger"]')!
    trig.click()
    const sp = el.shadowRoot!.querySelector<HTMLElement>('[part="sub-panel"]')!
    expect(sp.hidden).toBe(false)
    expect(trig.getAttribute('aria-expanded')).toBe('true')
    const links = sp.querySelectorAll<HTMLElement>('[part="sub-link"]')
    expect(links.length).toBe(3)
    expect(links[0]!.getAttribute('href')).toBe('/docs')
    expect(links[1]!.getAttribute('href')).toBe('/tutorial')
    expect(links[2]!.getAttribute('aria-disabled')).toBe('true')
    // 焦点进入二级面板首项
    expect(el.shadowRoot!.activeElement).toBe(links[0])
  })

  it('二级面板内点选链接 → oas-select 并整体关闭；Esc 逐层回退', () => {
    const el = mount({ items: SUB_ITEMS, 'delay-duration': '0' })
    const details: unknown[] = []
    el.addEventListener('oas-select', (e) => details.push((e as CustomEvent).detail))
    topItems(el)[0]!.click()
    const trig = el.shadowRoot!.querySelector<HTMLElement>('[part="sub-trigger"]')!
    trig.click()
    const sp = el.shadowRoot!.querySelector<HTMLElement>('[part="sub-panel"]')!
    // Esc：逐层回退 → 二级面板关闭、主面板仍开、焦点回触发器
    nav(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(sp.hidden).toBe(true)
    expect(isOpen(el)).toBe(true)
    expect(el.shadowRoot!.activeElement).toBe(trig)
    // 主面板 Esc：整体关闭
    nav(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(isOpen(el)).toBe(false)
    // 再开一次走点选
    topItems(el)[0]!.click()
    el.shadowRoot!.querySelector<HTMLElement>('[part="sub-trigger"]')!.click()
    sp.querySelector<HTMLElement>('[part="sub-link"]')!.click()
    expect(details.at(-1)).toEqual({ value: 'docs' })
    expect(isOpen(el)).toBe(false)
  })

  it('二级面板内键盘上下移动、跳过 disabled；ArrowLeft 返回主面板', () => {
    const el = mount({ items: SUB_ITEMS, 'delay-duration': '0' })
    topItems(el)[0]!.click()
    el.shadowRoot!.querySelector<HTMLElement>('[part="sub-trigger"]')!.click()
    const links = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="sub-link"]')]
    nav(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })) // 跳过 disabled 教程 → 社区后回绕到 文档
    expect(el.shadowRoot!.activeElement).toBe(links[1])
    nav(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    const trig = el.shadowRoot!.querySelector<HTMLElement>('[part="sub-trigger"]')!
    expect(el.shadowRoot!.activeElement).toBe(trig)
  })

  it('切换顶级触发器时二级面板复位', () => {
    const el = mount({ items: SWITCH_ITEMS, 'delay-duration': '0' })
    topItems(el)[0]!.click()
    topItems(el)[1]!.click()
    const sp = el.shadowRoot!.querySelector<HTMLElement>('[part="sub-panel"]')!
    expect(sp.hidden).toBe(true)
  })
})

// ============ panel-footer 营销位插槽 ============

describe('panel-footer 插槽', () => {
  it('无内容时容器隐藏；有内容时面板底部渲染', () => {
    const el = mount({ 'delay-duration': '0' })
    topItems(el)[0]!.click()
    const footer = el.shadowRoot!.querySelector<HTMLElement>('[part="panel-footer"]')!
    expect(footer).not.toBeNull()
    expect(footer.hidden).toBe(true)

    const withFooter = mount({ 'delay-duration': '0' })
    const cta = document.createElement('a')
    cta.slot = 'panel-footer'
    cta.href = '/start'
    cta.textContent = '立即开始'
    withFooter.appendChild(cta)
    withFooter.setAttribute('items', withFooter.getAttribute('items')!) // 触发 update 重算
    topItems(withFooter)[0]!.click()
    const footer2 = withFooter.shadowRoot!.querySelector<HTMLElement>('[part="panel-footer"]')!
    expect(footer2.hidden).toBe(false)
    expect(footer2.querySelector('slot')).not.toBeNull()
    // 插槽投影的营销内容在 light DOM（shadow 容器只负责承接 slot）
    expect(withFooter.querySelector('[slot="panel-footer"]')!.textContent).toContain('立即开始')
  })
})
