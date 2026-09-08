import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASVirtualList, computeVirtualWindow } from './index.js'

function mount(attrs: Record<string, string> = {}): OASVirtualList {
  const el = new OASVirtualList()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function items(el: OASVirtualList): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll('[part="item"]')] as HTMLElement[]
}

function pad(el: OASVirtualList, name: 'padding-top' | 'padding-bottom'): HTMLElement {
  return el.shadowRoot!.querySelector(`[part="${name}"]`) as HTMLElement
}

function viewport(el: OASVirtualList): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
}

function scrollTo(el: OASVirtualList, top: number): void {
  const vp = viewport(el)
  vp.scrollTop = top
  vp.dispatchEvent(new Event('scroll'))
}

const flushRaf = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i)

describe('computeVirtualWindow（窗口数学）', () => {
  it('顶部：可见 5 项 + 上下 buffer 4 项', () => {
    expect(computeVirtualWindow(0, 100, 20, 100, 4)).toEqual({ start: 0, end: 9 })
  })

  it('滚动后窗口随 scrollTop 平移', () => {
    expect(computeVirtualWindow(200, 100, 20, 100, 4)).toEqual({ start: 6, end: 19 })
  })

  it('夹取边界：底部与空数据', () => {
    // 超长 scrollTop 夹取到底部窗口（maxScroll = 100*20-100 = 1900 → start=95-4）
    expect(computeVirtualWindow(100000, 100, 20, 100, 4)).toEqual({ start: 91, end: 100 })
    expect(computeVirtualWindow(0, 100, 20, 0, 4)).toEqual({ start: 0, end: 0 })
  })
})

describe('OASVirtualList', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('仅渲染可见窗口 + buffer 项，首尾 padding 撑滚动高度', () => {
    const el = mount({
      height: '100',
      'item-height': '20',
      items: JSON.stringify(range(100)),
    })
    const rendered = items(el)
    expect(rendered.length).toBe(9)
    expect(rendered[0]!.getAttribute('data-index')).toBe('0')
    expect(rendered[8]!.getAttribute('data-index')).toBe('8')
    expect(pad(el, 'padding-top').style.height).toBe('0px')
    expect(pad(el, 'padding-bottom').style.height).toBe('1820px')
    const inner = el.shadowRoot!.querySelector<HTMLElement>('[part="inner"]')!
    expect(inner.style.height).toBe('2000px')
  })

  it('默认渲染 String(item) 文本', () => {
    const el = mount({ items: JSON.stringify(['甲', '乙', '丙']) })
    expect(items(el)[0]!.textContent).toBe('甲')
    expect(items(el)[2]!.textContent).toBe('丙')
  })

  it('滚动后按 scrollTop 重算窗口与 padding', async () => {
    const el = mount({
      height: '100',
      'item-height': '20',
      items: JSON.stringify(range(100)),
    })
    scrollTo(el, 200)
    await flushRaf()
    const rendered = items(el)
    expect(rendered.length).toBe(13)
    expect(rendered[0]!.getAttribute('data-index')).toBe('6')
    expect(pad(el, 'padding-top').style.height).toBe('120px')
    expect(pad(el, 'padding-bottom').style.height).toBe('1620px')
  })

  it('滚动派发 oas-scroll（rAF 节流，detail 含 scrollTop/start/end）', async () => {
    const el = mount({
      height: '100',
      'item-height': '20',
      items: JSON.stringify(range(100)),
    })
    let detail: unknown
    el.addEventListener('oas-scroll', (e: Event) => (detail = (e as CustomEvent).detail))
    scrollTo(el, 200)
    await flushRaf()
    expect(detail).toEqual({ scrollTop: 200, start: 6, end: 19 })
  })

  it('items property 优先于 items 属性（JSON）', () => {
    const el = new OASVirtualList()
    el.items = ['x', 'y']
    el.setAttribute('items', JSON.stringify(['a', 'b', 'c']))
    document.body.appendChild(el)
    expect(items(el).length).toBe(2)
    expect(items(el)[0]!.textContent).toBe('x')
  })

  it('oas-item 事件提供 index/item/element 上下文', () => {
    const data = range(10).map((i) => ({ id: i }))
    const el = mount({ items: JSON.stringify(data) })
    const seen: Array<{ index: number; item: unknown; element: HTMLElement }> = []
    el.addEventListener('oas-item', ((e: Event) => {
      seen.push((e as CustomEvent).detail)
    }) as EventListener)
    el.items = data // 触发重渲染
    expect(seen.length).toBeGreaterThan(0)
    expect(seen[0]!.index).toBe(0)
    expect(seen[0]!.item).toEqual({ id: 0 })
    expect(seen[0]!.element.getAttribute('data-index')).toBe('0')
  })

  it('template[slot="item"] 内容克隆到每个可见项', () => {
    const el = mount({ items: JSON.stringify(range(5)) })
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'item')
    tpl.innerHTML = '<span class="tpl-tag"></span>'
    el.appendChild(tpl)
    el.items = [...el.items] // 触发重渲染拾取模板
    const first = items(el)[0]!
    expect(first.querySelector('.tpl-tag')).not.toBeNull()
    expect(first.textContent).not.toContain('0')
  })

  it('scroll-target：监听外部滚动容器', async () => {
    const scroller = document.createElement('div')
    scroller.id = 'scroller'
    document.body.appendChild(scroller)
    const el = mount({
      'scroll-target': '#scroller',
      height: '100',
      'item-height': '20',
      items: JSON.stringify(range(100)),
    })
    scroller.scrollTop = 100
    scroller.dispatchEvent(new Event('scroll'))
    await flushRaf()
    // floor(100/20)-4 = 5-4 = 1
    expect(items(el)[0]!.getAttribute('data-index')).toBe('1')
    expect(pad(el, 'padding-top').style.height).toBe('20px')
  })

  it('空数据渲染不报错', () => {
    const el = mount({ height: '100', 'item-height': '20', items: '[]' })
    expect(items(el).length).toBe(0)
  })

  it('断开连接后重新连接可正常渲染（清理无泄漏）', () => {
    const el = mount({
      height: '100',
      'item-height': '20',
      items: JSON.stringify(range(10)),
    })
    el.remove()
    document.body.appendChild(el)
    expect(items(el).length).toBeGreaterThan(0)
  })

  it('视口与 inner 禁用 Chrome 滚动锚定（overflow-anchor: none）', () => {
    // 回归：虚拟滚动重渲染（padding/items 增删）会触发 Chrome 滚动锚定，滚轮增量被逐帧
    // 放大成加速循环（滚一下直接到底）；.viewport 与 .inner（scroll-target 外部容器场景）
    // 都必须显式禁用锚定。
    const el = mount({ height: '100', 'item-height': '20', items: JSON.stringify(range(100)) })
    const styleText = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    const block = (sel: string) => styleText.match(new RegExp(`${sel}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
    expect(block('\\.viewport')).toContain('overflow-anchor: none')
    expect(block('\\.inner')).toContain('overflow-anchor: none')
  })

  it('buffer 宿主 property 遮蔽原型方法后渲染不崩且按属性生效（回归）', async () => {
    // 曾现 bug：私有方法 buffer() 与 observedAttributes 的 buffer 同名，React/Vue 对自定义
    // 元素同名绑定走 property 通道（el.buffer = 8 在实例挂自有属性遮蔽原型方法），此后
    // this.buffer() 直接 TypeError。修复=私有方法改名 bufferSize()，公开 attribute 语义不变。
    const el = new OASVirtualList()
    el.setAttribute('height', '100')
    el.setAttribute('item-height', '20')
    el.setAttribute('buffer', '8')
    el.setAttribute('items', JSON.stringify(range(100)))
    // 模拟宿主 property 通道在实例上挂同名自有属性
    ;(el as unknown as { buffer: number }).buffer = 8
    document.body.appendChild(el) // 连接即渲染，此前会在此抛 TypeError
    const first = items(el)
    expect(first.length).toBe(13) // 顶部：5 可见 + 上下 buffer 8
    expect(first[0]!.getAttribute('data-index')).toBe('0')
    scrollTo(el, 200)
    await flushRaf()
    const rendered = items(el)
    expect(rendered.length).toBe(21) // floor(200/20)-8=2 → 窗口 2..22
    expect(rendered[0]!.getAttribute('data-index')).toBe('2')
    expect(pad(el, 'padding-top').style.height).toBe('40px')
  })

  it('默认视口可聚焦（tabindex=0）；viewportFocusable=false 移除 tabindex（tree 契约）', () => {
    const el = mount({ height: '100', 'item-height': '20', items: JSON.stringify(range(10)) })
    expect(viewport(el).getAttribute('tabindex')).toBe('0')
    el.viewportFocusable = false
    expect(viewport(el).getAttribute('tabindex')).toBeNull()
    el.viewportFocusable = true
    expect(viewport(el).getAttribute('tabindex')).toBe('0')
  })
})

describe('scrollToIndex（公共滚动定位方法）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mountList(): OASVirtualList {
    return mount({ height: '100', 'item-height': '20', items: JSON.stringify(range(100)) })
  }

  it('align: start 目标项顶部对齐视口顶部并同步重渲染窗口', () => {
    const el = mountList()
    el.scrollToIndex(50, { align: 'start' })
    expect(viewport(el).scrollTop).toBe(1000)
    // 窗口随滚动同步重建：floor(1000/20)-4 = 46
    expect(items(el)[0]!.getAttribute('data-index')).toBe('46')
    expect(pad(el, 'padding-top').style.height).toBe('920px')
  })

  it('align: center 目标项在视口垂直居中', () => {
    const el = mountList()
    el.scrollToIndex(50, { align: 'center' })
    // 50*20 - (100-20)/2 = 960
    expect(viewport(el).scrollTop).toBe(960)
  })

  it('align: end 目标项底部对齐视口底部', () => {
    const el = mountList()
    el.scrollToIndex(50, { align: 'end' })
    // 50*20 + 20 - 100 = 920
    expect(viewport(el).scrollTop).toBe(920)
  })

  it('align: auto（默认）：已可见时不滚动，下方越界时最小滚动', () => {
    const el = mountList()
    el.scrollToIndex(50)
    // 视口顶部 0，第 50 项（1000-1020）远在下方 → 滚到 项底-视口高
    expect(viewport(el).scrollTop).toBe(920)
    // 现在视口 920-1020，第 48 项（960-980）已可见 → auto 不滚动
    el.scrollToIndex(48)
    expect(viewport(el).scrollTop).toBe(920)
    // 上方越界：第 10 项（200-220）在视口上方 → 滚到项顶
    el.scrollToIndex(10)
    expect(viewport(el).scrollTop).toBe(200)
  })

  it('索引越界夹取到有效范围，非有限数值忽略', () => {
    const el = mountList()
    el.scrollToIndex(9999, { align: 'start' })
    // 最大滚动 = 100*20-100 = 1900
    expect(viewport(el).scrollTop).toBe(1900)
    el.scrollToIndex(-5, { align: 'start' })
    expect(viewport(el).scrollTop).toBe(0)
    el.scrollToIndex(Number.NaN, { align: 'start' })
    expect(viewport(el).scrollTop).toBe(0)
  })

  it('小数索引截断取整', () => {
    const el = mountList()
    el.scrollToIndex(50.9, { align: 'start' })
    expect(viewport(el).scrollTop).toBe(1000)
  })

  it('空数据调用不抛错、不滚动', () => {
    const el = mount({ height: '100', 'item-height': '20', items: '[]' })
    expect(() => el.scrollToIndex(5, { align: 'start' })).not.toThrow()
    expect(viewport(el).scrollTop).toBe(0)
  })

  it('smooth: true 委托 scrollTo({ top, behavior: "smooth" })', () => {
    const el = mountList()
    const vp = viewport(el)
    const calls: unknown[] = []
    vp.scrollTo = ((opts: unknown) => calls.push(opts)) as typeof vp.scrollTo
    el.scrollToIndex(50, { align: 'start', smooth: true })
    expect(calls).toEqual([{ top: 1000, behavior: 'smooth' }])
    // 平滑滚动由浏览器 scroll 事件驱动重渲染，不同步改 scrollTop
    expect(vp.scrollTop).toBe(0)
  })

  it('scroll-target 模式：写外部容器 scrollTop', async () => {
    const scroller = document.createElement('div')
    scroller.id = 'scroller'
    document.body.appendChild(scroller)
    const el = mount({
      'scroll-target': '#scroller',
      height: '100',
      'item-height': '20',
      items: JSON.stringify(range(100)),
    })
    el.scrollToIndex(30, { align: 'start' })
    expect(scroller.scrollTop).toBe(600)
  })
})
