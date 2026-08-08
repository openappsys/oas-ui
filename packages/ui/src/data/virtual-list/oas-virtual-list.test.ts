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
})
