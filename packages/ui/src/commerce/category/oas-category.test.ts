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

  it('子级树项归属 role=group（父项展开时分组包裹，层级不变）', () => {
    const el = mount({ categories: CATEGORIES, 'active-key': 'phone' })
    const tree = q<HTMLElement>(el, '.tree')
    expect(tree.getAttribute('role')).toBe('tree')
    const group = tree.querySelector<HTMLElement>(':scope > .node-group')
    expect(group, '根级展开的子项必须包在 role=group 内').not.toBe(null)
    expect(group!.getAttribute('role')).toBe('group')
    expect([...group!.querySelectorAll(':scope > .node')].map((n) => (n as HTMLElement).dataset.key)).toEqual([
      'phone',
      'audio',
    ])
    // 深层子项再套一层 group
    const nested = group!.querySelector<HTMLElement>(':scope > .node-group')
    expect(nested, '已展开的子级也要分组').not.toBe(null)
    expect(nodes(el).map((n) => n.getAttribute('data-level'))).toEqual(['1', '2', '3', '3', '2', '1'])
  })

  it('property 通道：categories 收数组与 JSON 字符串，均反射 attribute 并渲染', () => {
    const el = mount()
    el.categories = [{ key: 'k1', label: '甲类', children: [{ key: 'k2', label: '乙类' }] }]
    expect(JSON.parse(el.getAttribute('categories')!)).toMatchObject([{ key: 'k1', label: '甲类' }])
    expect(el.categories).toMatchObject([{ key: 'k1', label: '甲类' }])
    expect(nodes(el).map((n) => n.textContent!.replace('›', ''))).toEqual(['甲类', '乙类'])

    el.categories = JSON.stringify([{ key: 'k3', label: '丙类' }])
    expect(nodes(el).map((n) => n.textContent)).toEqual(['丙类'])
    expect(el.getAttribute('categories')).toBe('[{"key":"k3","label":"丙类"}]')
  })

  it('撞名回归：宿主写入 activeKey property 不遮蔽内部方法，后续 update 不崩', () => {
    const el = mount({ categories: CATEGORIES })
    // 框架按「key in el」写入 property（修复前 activeKey 是原型方法，被 own property 遮蔽后 update() TypeError）
    ;(el as unknown as Record<string, unknown>)['activeKey'] = 'phone'
    expect(() => el.setAttribute('active-key', 'phone')).not.toThrow()
    expect(el.getAttribute('active-key')).toBe('phone')
    expect(el.shadowRoot!.querySelector('.node[data-key="phone"]')).not.toBe(null)
  })

  it('键盘激活重建树后焦点仍留在同一节点（键盘导航不被打断）', () => {
    const el = mount({ categories: CATEGORIES })
    const first = nodes(el)[0]!
    first.focus()
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.getAttribute('active-key')).toBe('digital')
    expect((el.shadowRoot!.activeElement as HTMLElement | null)?.dataset.key).toBe('digital')
  })

  it('返回上级后面板重建仍保留焦点（无返回钮时交给左侧树当前项）', () => {
    const el = mount({ categories: CATEGORIES, 'active-key': 'phone' })
    const back = q<HTMLButtonElement>(el, '.back')
    back.focus()
    back.click()
    expect(el.getAttribute('active-key')).toBe('digital')
    const focused = el.shadowRoot!.activeElement as HTMLElement | null
    expect(focused?.dataset.key, '根层没有返回钮 → 焦点回到左侧树当前项').toBe('digital')
  })

  it('宫格进入子类后面板重建仍是可见焦点（落到返回钮）', () => {
    const el = mount({ categories: CATEGORIES })
    const tile = el.shadowRoot!.querySelector<HTMLElement>('.tile[data-key="audio"]')!
    tile.focus()
    tile.click()
    expect(el.getAttribute('active-key')).toBe('audio')
    const focused = el.shadowRoot!.activeElement as HTMLElement | null
    expect(focused?.classList.contains('back'), '进入子类后焦点不得丢到 body').toBe(true)
  })
})
