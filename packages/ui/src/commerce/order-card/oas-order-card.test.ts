import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASOrderCard } from './index.js'
import type { OrderStatusMap, OrderToggleDetail } from './oas-order-card.js'

const ITEMS = JSON.stringify([
  { title: '纯棉短袖', spec: '白色 / M', quantity: 2, image: 'https://example.test/a.png' },
  { title: '帆布鞋', spec: '42' },
])

const STATUS_MAP: OrderStatusMap = {
  pending: { label: '待付款', tone: 'warning' },
  shipped: { label: '待收货', tone: 'primary' },
  done: { label: '已完成', tone: 'success' },
  canceled: '已取消',
}

function mount(attrs: Record<string, string> = {}): OASOrderCard {
  const el = new OASOrderCard()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function q(el: OASOrderCard, part: string): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>(`[part="${part}"]`)
}

function withDetails(el: OASOrderCard, text = '订单号 20241124001'): void {
  const div = document.createElement('div')
  div.slot = 'details'
  div.textContent = text
  el.appendChild(div)
}

describe('oas-order-card', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('头部：order-id 与状态徽标文案按 status-map 解析', () => {
    const el = mount({ 'order-id': 'NO-1001', status: 'pending', 'status-map': JSON.stringify(STATUS_MAP) })
    expect(q(el, 'order-id')!.textContent).toBe('NO-1001')
    expect(q(el, 'order-id')!.hidden).toBe(false)
    const status = q(el, 'status')!
    expect(status.textContent).toBe('待付款')
    expect(status.hidden).toBe(false)
  })

  it('状态色语义：tone 落到 data-tone，非法 tone 回落 default 并告警一次', () => {
    const el = mount({ status: 'done', 'status-map': JSON.stringify(STATUS_MAP) })
    expect(q(el, 'status')!.getAttribute('data-tone')).toBe('success')

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      el.setAttribute('status-map', JSON.stringify({ bad: { label: '坏档', tone: 'rainbow' } }))
      el.setAttribute('status', 'bad')
      expect(q(el, 'status')!.getAttribute('data-tone')).toBe('default')
      expect(q(el, 'status')!.textContent).toBe('坏档')
      const hits = warn.mock.calls.filter((call) => String(call[0]).includes('tone'))
      expect(hits).toHaveLength(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('状态未映射时回落原始 status 文本 + 中性色；status 缺省不渲染徽标', () => {
    const el = mount({ status: 'refunding' })
    expect(q(el, 'status')!.textContent).toBe('refunding')
    expect(q(el, 'status')!.getAttribute('data-tone')).toBe('default')

    el.removeAttribute('status')
    expect(q(el, 'status')!.hidden).toBe(true)
  })

  it('状态映射支持字符串简写（{ key: "文案" }）', () => {
    const el = mount({ status: 'canceled', 'status-map': JSON.stringify(STATUS_MAP) })
    expect(q(el, 'status')!.textContent).toBe('已取消')
    expect(q(el, 'status')!.getAttribute('data-tone')).toBe('default')
  })

  it('条目摘要：图 + 名 + 规格 ×数量，数量缺省为 1', () => {
    const el = mount({ items: ITEMS })
    const rows = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')]
    expect(rows).toHaveLength(2)
    expect(rows[0]!.querySelector('[part="item-title"]')!.textContent).toBe('纯棉短袖')
    expect(rows[0]!.querySelector('[part="item-spec"]')!.textContent).toBe('白色 / M')
    expect(rows[0]!.querySelector('[part="item-quantity"]')!.textContent).toBe('×2')
    expect(rows[1]!.querySelector('[part="item-quantity"]')!.textContent).toBe('×1')
    expect(rows[0]!.querySelectorAll('[part="image"]')).toHaveLength(1)
    // 图片 src 真的写进 img（曾漏 set，缩略图渲染成空框）
    expect(rows[0]!.querySelector('[part="image"]')!.getAttribute('src')).toBe('https://example.test/a.png')
    expect(rows[1]!.querySelector('[part="thumb"]')!.getAttribute('data-empty')).toBe('true')
  })

  it('条目图片加载失败回落占位态', () => {
    const el = mount({ items: ITEMS })
    const img = el.shadowRoot!.querySelector<HTMLImageElement>('[part="image"]')!
    img.dispatchEvent(new Event('error'))
    expect(img.hidden).toBe(true)
    expect(el.shadowRoot!.querySelector('[part="thumb"]')!.getAttribute('data-empty')).toBe('true')
  })

  it('空条目渲染空态文案（items 缺省 / 空数组 / 非法 JSON）', () => {
    const el = mount()
    expect(q(el, 'items')!.hidden).toBe(true)
    expect(q(el, 'empty')!.hidden).toBe(false)
    expect(q(el, 'empty')!.textContent).toBe('暂无商品')

    el.setAttribute('items', '[{"title":""},{"no":"title"}]')
    expect(q(el, 'items')!.hidden).toBe(true)
  })

  it('金额区：实付 + 划线原价 + 已优惠，金额缺省整体隐藏', () => {
    const el = mount({ payable: '199', original: '229', discount: '30' })
    const amount = q(el, 'amount')!
    expect(amount.hidden).toBe(false)
    expect(q(el, 'payable')!.hidden).toBe(false)
    expect(q(el, 'payable-label')!.textContent).toBe('实付')
    const payablePrice = q(el, 'payable-price')!
    expect(payablePrice.getAttribute('value')).toBe('199')
    expect(payablePrice.getAttribute('original')).toBe('229')
    expect(q(el, 'discount')!.hidden).toBe(false)
    expect(q(el, 'discount-label')!.textContent).toBe('已优惠')
    expect(q(el, 'discount-price')!.getAttribute('value')).toBe('30')

    el.removeAttribute('payable')
    el.removeAttribute('original')
    el.removeAttribute('discount')
    expect(q(el, 'amount')!.hidden).toBe(true)
  })

  it('只设 original 不设 payable：金额区整体隐藏，不留空壳条', () => {
    // original 只经 payable 通道渲染（划线原价），自身无独立渲染出口
    const el = mount({ original: '229' })
    expect(q(el, 'amount')!.hidden).toBe(true)
    expect(q(el, 'payable')!.hidden).toBe(true)
    expect(q(el, 'discount')!.hidden).toBe(true)

    // 补上 payable 后恢复：original 转为划线价渲染
    el.setAttribute('payable', '199')
    expect(q(el, 'amount')!.hidden).toBe(false)
    expect(q(el, 'payable-price')!.getAttribute('original')).toBe('229')
  })

  it('金额透传 currency / precision / locale 到内嵌价格件', () => {
    const el = mount({ payable: '99.5', currency: 'USD', locale: 'en-US', precision: '1' })
    const price = q(el, 'payable-price')!
    expect(price.getAttribute('currency')).toBe('USD')
    expect(price.getAttribute('precision')).toBe('1')
    expect(price.getAttribute('locale')).toBe('en-US')
  })

  it('expandable：有 details 内容才渲染展开按钮，点击同步 aria-expanded 与明细区并派发 oas-toggle', () => {
    const el = mount({ 'order-id': 'NO-1001', expandable: '' })
    // 无 details 内容 → 不渲染按钮
    expect(q(el, 'toggle')!.hidden).toBe(true)

    withDetails(el)
    el.requestUpdate()
    const toggle = q(el, 'toggle') as HTMLButtonElement
    expect(toggle.hidden).toBe(false)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(toggle.textContent).toContain('展开明细')
    expect(q(el, 'details')!.hidden).toBe(true)
    // aria-controls 指向明细区，且 id 在 shadow 内存在
    const controls = toggle.getAttribute('aria-controls')!
    expect(controls).not.toBe('')
    expect(el.shadowRoot!.getElementById(controls)).toBe(q(el, 'details'))

    const events: OrderToggleDetail[] = []
    el.addEventListener('oas-toggle', (e) => events.push((e as CustomEvent<OrderToggleDetail>).detail))
    toggle.click()
    expect(el.hasAttribute('expanded')).toBe(true)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(q(el, 'details')!.hidden).toBe(false)
    expect(toggle.textContent).toContain('收起明细')
    expect(events).toEqual([{ expanded: true, orderId: 'NO-1001' }])

    toggle.click()
    expect(el.hasAttribute('expanded')).toBe(false)
    expect(q(el, 'details')!.hidden).toBe(true)
    expect(events.at(-1)!.expanded).toBe(false)
  })

  it('expanded 受控：宿主写属性直接生效，且不派发 oas-toggle', () => {
    const el = mount({ expandable: '' })
    withDetails(el)
    el.requestUpdate()
    const events: OrderToggleDetail[] = []
    el.addEventListener('oas-toggle', (e) => events.push((e as CustomEvent<OrderToggleDetail>).detail))

    el.setAttribute('expanded', '')
    expect(q(el, 'details')!.hidden).toBe(false)
    expect(q(el, 'toggle')!.getAttribute('aria-expanded')).toBe('true')
    expect(events).toHaveLength(0)
  })

  it('未开 expandable 时不渲染展开按钮（即使有 details 内容）', () => {
    const el = mount({})
    withDetails(el)
    el.requestUpdate()
    expect(q(el, 'toggle')!.hidden).toBe(true)
    expect(q(el, 'details')!.hidden).toBe(true)
  })

  it('property 通道：items / statusMap 读写双向，接受对象与 JSON 字符串', () => {
    const el = mount()
    el.items = [{ title: '帆布鞋' }]
    expect(el.items).toHaveLength(1)
    expect(el.getAttribute('items')).toBe('[{"title":"帆布鞋"}]')

    el.statusMap = STATUS_MAP
    expect(el.statusMap.pending).toEqual({ label: '待付款', tone: 'warning' })
    el.statusMap = '{"a":{"label":"A"}}'
    expect(el.statusMap.a).toEqual({ label: 'A' })

    el.setAttribute('status-map', 'not-json')
    expect(el.statusMap).toEqual({})

    for (const key of ['items', 'statusMap']) {
      const desc = Object.getOwnPropertyDescriptor(OASOrderCard.prototype, key)
      expect(typeof desc?.get).toBe('function')
      expect(typeof desc?.set).toBe('function')
    }
  })

  it('非法 status-map 告警一次并回落原始 status 文本', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ status: 'pending', 'status-map': 'oops' })
      expect(q(el, 'status')!.textContent).toBe('pending')
      el.setAttribute('status-map', 'oops-again')
      const hits = warn.mock.calls.filter((call) => String(call[0]).includes('status-map'))
      expect(hits).toHaveLength(1)
    } finally {
      warn.mockRestore()
    }
  })
})
