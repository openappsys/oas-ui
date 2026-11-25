import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASCart } from './index.js'
import { resolveSwipeOffset, resolveSwipeSettle } from './oas-cart.js'
import type { CartChangeDetail, CartItem, CartRemoveDetail } from './oas-cart.js'

function mount(attrs: Record<string, string> = {}): OASCart {
  const el = new OASCart()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function rowsOf(el: OASCart): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')]
}

function itemEl(el: OASCart, index: number): HTMLElement {
  return rowsOf(el)[index]!
}

function checkboxOf(el: OASCart, index: number): HTMLInputElement {
  return itemEl(el, index).querySelector<HTMLInputElement>('[part="item-check"]')!
}

function plusOf(el: OASCart, index: number): HTMLButtonElement {
  return itemEl(el, index).querySelector<HTMLButtonElement>('[part="plus"]')!
}

function minusOf(el: OASCart, index: number): HTMLButtonElement {
  return itemEl(el, index).querySelector<HTMLButtonElement>('[part="minus"]')!
}

function removeOf(el: OASCart, index: number): HTMLButtonElement {
  return itemEl(el, index).querySelector<HTMLButtonElement>('[part="remove"]')!
}

function priceText(el: OASCart): string {
  const price = el.shadowRoot!.querySelector('[part="subtotal"] oas-price')!
  return price.shadowRoot!.querySelector('[part="amount"]')?.textContent ?? ''
}

const ITEMS: CartItem[] = [
  { id: 'a', title: '纯棉短袖', spec: '白色 / M', price: 99, quantity: 2, selected: true },
  { id: 'b', title: '帆布鞋', spec: '42', price: 199, quantity: 1, selected: false },
  { id: 'c', title: '赠品贴纸', price: 10, quantity: 1, selected: true, disabled: true },
]

const JSON_ITEMS = JSON.stringify(ITEMS)

describe('oas-cart', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('按 items 渲染条目：标题 / 规格 / 单价 / 数量，缺 id 的条目被忽略', () => {
    const el = mount({ items: JSON.stringify([{ title: '无 id 条目', price: 1 }]) })
    expect(rowsOf(el)).toHaveLength(0)

    el.setAttribute('items', JSON_ITEMS)
    expect(rowsOf(el)).toHaveLength(3)
    expect(itemEl(el, 0).querySelector('[part="item-title"]')!.textContent).toBe('纯棉短袖')
    expect(itemEl(el, 0).querySelector('[part="item-spec"]')!.textContent).toBe('白色 / M')
    expect(itemEl(el, 1).querySelector('[part="quantity"]')).toBeInstanceOf(HTMLInputElement)
    expect((itemEl(el, 0).querySelector('[part="quantity"]') as HTMLInputElement).value).toBe('2')
  })

  it('全选框反映半选取态：部分选中 → indeterminate，全选 → checked', () => {
    const el = mount({ items: JSON_ITEMS })
    const all = el.shadowRoot!.querySelector<HTMLInputElement>('[part="select-all"]')!
    // a / c 选中（c 禁用不计），b 未选中 → 半选
    expect(all.indeterminate).toBe(true)
    expect(all.checked).toBe(false)

    el.setAttribute('items', JSON.stringify(ITEMS.map((item) => ({ ...item, selected: true }))))
    expect(all.indeterminate).toBe(false)
    expect(all.checked).toBe(true)
  })

  it('全选联动：勾选全选 → 非禁用条目全部选中，禁用条目保持不选中', () => {
    const el = mount({ items: JSON_ITEMS })
    const changes: CartChangeDetail[] = []
    el.addEventListener('oas-change', (e) => changes.push((e as CustomEvent<CartChangeDetail>).detail))
    const all = el.shadowRoot!.querySelector<HTMLInputElement>('[part="select-all"]')!

    all.checked = true
    all.dispatchEvent(new Event('change', { bubbles: true }))

    const items = el.items
    expect(items.map((item) => item.selected)).toEqual([true, true, false])
    expect(changes).toHaveLength(1)
    expect(changes[0]!.allSelected).toBe(true)
    expect(changes[0]!.selectedCount).toBe(2)
    // 条目 checkbox 同步刷新
    expect(checkboxOf(el, 1).checked).toBe(true)
    expect(checkboxOf(el, 2).disabled).toBe(true)
  })

  it('小计只累计选中且未禁用条目，按 precision 收敛', () => {
    const el = mount({ items: JSON_ITEMS })
    const details: CartChangeDetail[] = []
    el.addEventListener('oas-change', (e) => details.push((e as CustomEvent<CartChangeDetail>).detail))
    checkboxOf(el, 1).checked = true
    checkboxOf(el, 1).dispatchEvent(new Event('change', { bubbles: true }))
    // 99*2 + 199*1 = 397（赠品禁用不计）
    expect(details.at(-1)!.total).toBe(397)
    expect(details.at(-1)!.selectedCount).toBe(2)
    expect(priceText(el)).toBe('397')
  })

  it('浮点合计按精度收敛，不把浮点尾巴写进 detail', () => {
    // 0.1×3 是 IEEE754 非整倍口径（0.1*3 = 0.30000000000000004）——能真正抓住 toFixed 收敛缺失
    const el = mount({
      items: JSON.stringify([{ id: 'x', title: '称重', price: 0.1, quantity: 2, selected: true }]),
    })
    const details: CartChangeDetail[] = []
    el.addEventListener('oas-change', (e) => details.push((e as CustomEvent<CartChangeDetail>).detail))
    plusOf(el, 0).click()
    expect(details.at(-1)!.total).toBe(0.3)
  })

  it('数量步进：加减各一次并夹到 [1, maxQuantity]，合计随之变化', () => {
    const el = mount({
      items: JSON.stringify([{ id: 'a', title: 'A', price: 10, quantity: 1, selected: true, maxQuantity: 2 }]),
    })
    const details: CartChangeDetail[] = []
    el.addEventListener('oas-change', (e) => details.push((e as CustomEvent<CartChangeDetail>).detail))

    plusOf(el, 0).click()
    expect((itemEl(el, 0).querySelector('[part="quantity"]') as HTMLInputElement).value).toBe('2')
    expect(details.at(-1)!.total).toBe(20)
    // 到达上限：加号禁用，再点无效
    expect(plusOf(el, 0).disabled).toBe(true)
    plusOf(el, 0).click()
    expect(details.at(-1)!.total).toBe(20)

    minusOf(el, 0).click()
    minusOf(el, 0).click()
    expect((itemEl(el, 0).querySelector('[part="quantity"]') as HTMLInputElement).value).toBe('1')
    expect(minusOf(el, 0).disabled).toBe(true)
  })

  it('数量输入越界：低于 1 钳到 1，超过上限钳到上限', () => {
    const el = mount({
      items: JSON.stringify([{ id: 'a', title: 'A', price: 5, quantity: 1, maxQuantity: 3 }]),
    })
    const qty = itemEl(el, 0).querySelector<HTMLInputElement>('[part="quantity"]')!
    qty.value = '99'
    qty.dispatchEvent(new Event('change', { bubbles: true }))
    expect(el.items[0]!.quantity).toBe(3)

    qty.value = '0'
    qty.dispatchEvent(new Event('change', { bubbles: true }))
    expect(el.items[0]!.quantity).toBe(1)
  })

  it('删除：按钮删除移除条目并派发 oas-remove + oas-change', () => {
    const el = mount({ items: JSON_ITEMS })
    const removes: CartRemoveDetail[] = []
    const changes: CartChangeDetail[] = []
    el.addEventListener('oas-remove', (e) => removes.push((e as CustomEvent<CartRemoveDetail>).detail))
    el.addEventListener('oas-change', (e) => changes.push((e as CustomEvent<CartChangeDetail>).detail))

    removeOf(el, 1).click()
    expect(rowsOf(el)).toHaveLength(2)
    expect(el.items.map((item) => item.id)).toEqual(['a', 'c'])
    expect(removes).toHaveLength(1)
    expect(removes[0]!.item.id).toBe('b')
    // detail.items 是删除后的列表
    expect(removes[0]!.items.map((item) => item.id)).toEqual(['a', 'c'])
    expect(changes).toHaveLength(1)
  })

  it('删除前拦截：oas-remove preventDefault 即取消本次删除（确认策略归宿主）', () => {
    const el = mount({ items: JSON_ITEMS })
    el.addEventListener('oas-remove', (e) => e.preventDefault())
    removeOf(el, 0).click()
    expect(rowsOf(el)).toHaveLength(3)
    expect(el.items.map((item) => item.id)).toEqual(['a', 'b', 'c'])
  })

  it('delete-mode=none 不渲染任何删除钮；非法值回落 button 并告警一次', () => {
    const el = mount({ items: JSON_ITEMS, 'delete-mode': 'none' })
    expect(el.shadowRoot!.querySelector('[part="remove"]')).toBeNull()
    expect(el.shadowRoot!.querySelector('[part="swipe-remove"]')).toBeNull()
    el.removeAttribute('delete-mode')

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      el.setAttribute('delete-mode', 'flick')
      el.setAttribute('delete-mode', 'flick-again')
      const hits = warn.mock.calls.filter((call) => String(call[0]).includes('delete-mode'))
      expect(hits).toHaveLength(1)
      expect(el.shadowRoot!.querySelectorAll('[part="remove"]')).toHaveLength(3)
    } finally {
      warn.mockRestore()
    }
  })

  it('delete-mode=swipe：渲染滑动删除钮，且只在行内非控件区按下才发起拖拽', () => {
    const el = mount({ items: JSON_ITEMS, 'delete-mode': 'swipe' })
    const swipeRemove = itemEl(el, 0).querySelector<HTMLButtonElement>('[part="swipe-remove"]')!
    expect(itemEl(el, 0).querySelectorAll('[part="swipe-remove"]')).toHaveLength(1)
    expect(el.shadowRoot!.querySelector('[part="remove"]')).toBeNull()
    expect(itemEl(el, 0).querySelector('[part="item-inner"]')!.getAttribute('data-swipeable')).toBe('true')
    // 滑出后点删除钮
    swipeRemove.click()
    expect(el.items.map((item) => item.id)).toEqual(['b', 'c'])
  })

  it('滑动落位纯函数：越过一半吸附展开，未过一半回弹，已展开可反向关闭', () => {
    // LTR：向左拖（dx 负）
    expect(resolveSwipeOffset({ dx: -20, open: false, reveal: 72, rtl: false })).toEqual({
      offset: -20,
      open: false,
    })
    expect(resolveSwipeOffset({ dx: -50, open: false, reveal: 72, rtl: false })).toEqual({
      offset: -50,
      open: true,
    })
    // 已展开后反向拖回：位移收缩，越过一半以下即关闭
    expect(resolveSwipeOffset({ dx: 60, open: true, reveal: 72, rtl: false })).toEqual({
      offset: -12,
      open: false,
    })
    // 正向拖（LTR 反向）不产生位移
    expect(resolveSwipeOffset({ dx: 40, open: false, reveal: 72, rtl: false })).toEqual({ offset: 0, open: false })
    // RTL 镜像：向右拖出
    expect(resolveSwipeOffset({ dx: 50, open: false, reveal: 72, rtl: true })).toEqual({
      offset: 50,
      open: true,
    })
  })

  it('松手落定纯函数：过半吸附到完全露出，未过半回弹关闭（不取跟手 clamp 值）', () => {
    // LTR 过半（如 dx=-50，跟手 offset=-50 但落定必须是满露出 -72）
    expect(resolveSwipeSettle({ open: true, reveal: 72, rtl: false })).toBe(-72)
    // LTR 未过半（如 dx=-20，回弹 0 而非停半路的 -20）
    expect(resolveSwipeSettle({ open: false, reveal: 72, rtl: false })).toBe(0)
    // RTL 镜像吸附
    expect(resolveSwipeSettle({ open: true, reveal: 72, rtl: true })).toBe(72)
  })

  it('滑动删除钮聚焦时自动露出（键盘可达，焦点环不被内容层遮挡）', () => {
    const el = mount({ items: JSON_ITEMS, 'delete-mode': 'swipe' })
    const swipeRemove = itemEl(el, 0).querySelector<HTMLButtonElement>('[part="swipe-remove"]')!
    swipeRemove.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    const inner = itemEl(el, 0).querySelector<HTMLElement>('[part="item-inner"]')!
    expect(inner.style.transform).toBe('translateX(-72px)')
  })

  it('点击条目主体派发 oas-item-click（含 id 与条目），点控件不派发', () => {
    const el = mount({ items: JSON_ITEMS })
    const clicks: Array<{ id: string; item: CartItem }> = []
    el.addEventListener('oas-item-click', (e) => clicks.push((e as CustomEvent<{ id: string; item: CartItem }>).detail))
    itemEl(el, 0).querySelector<HTMLElement>('[part="item-body"]')!.click()
    expect(clicks).toHaveLength(1)
    expect(clicks[0]!.id).toBe('a')
    expect(clicks[0]!.item.title).toBe('纯棉短袖')

    plusOf(el, 0).click()
    removeOf(el, 0).click()
    expect(clicks).toHaveLength(1)
  })

  it('禁用条目不计合计、不可勾选；disabled 属性整体禁用时控件全禁用', () => {
    const el = mount({ items: JSON_ITEMS })
    expect(checkboxOf(el, 2).disabled).toBe(true)
    expect(checkboxOf(el, 2).checked).toBe(false)
    expect(minusOf(el, 2).disabled).toBe(true)
    // 条目级禁用不锁删除（失效商品要能清掉）
    expect(removeOf(el, 2).disabled).toBe(false)
    removeOf(el, 2).click()
    expect(el.items.map((item) => item.id)).toEqual(['a', 'b'])

    el.setAttribute('disabled', '')
    expect(checkboxOf(el, 0).disabled).toBe(true)
    expect(plusOf(el, 0).disabled).toBe(true)
    expect(removeOf(el, 0).disabled).toBe(true)
    expect(el.shadowRoot!.querySelector<HTMLInputElement>('[part="select-all"]')!.disabled).toBe(true)
  })

  it('空态：列表与合计行隐藏、空态文案与空态插槽生效', () => {
    const el = mount({ items: '[]' })
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="list"]')!.hidden).toBe(true)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="summary"]')!.hidden).toBe(true)
    const empty = el.shadowRoot!.querySelector<HTMLElement>('[part="empty"]')!
    expect(empty.hidden).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="empty-text"]')!.textContent).toBe('购物车还是空的')
  })

  it('图片缺失渲染占位态；加载失败同样回落占位', () => {
    const el = mount({
      items: JSON.stringify([
        { id: 'no-img', title: '无图', price: 1 },
        { id: 'broken', title: '坏图', price: 1, image: 'https://example.invalid/x.png' },
      ]),
    })
    const thumbs = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="thumb"]')]
    expect(thumbs[0]!.getAttribute('data-empty')).toBe('true')
    expect(thumbs[1]!.getAttribute('data-empty')).toBe('false')

    const img = itemEl(el, 1).querySelector<HTMLImageElement>('[part="image"]')!
    expect(img.getAttribute('src')).toBe('https://example.invalid/x.png')
    img.dispatchEvent(new Event('error'))
    expect(img.hidden).toBe(true)
    expect(itemEl(el, 1).querySelector<HTMLElement>('[part="thumb"]')!.getAttribute('data-empty')).toBe('true')
    // 后续 update 不把占位态闪回原图
    el.setAttribute('currency', 'USD')
    expect(itemEl(el, 1).querySelector<HTMLElement>('[part="thumb"]')!.getAttribute('data-empty')).toBe('true')
  })

  it('失败记忆按 id+src 记：同 id 换新图 URL 后恢复显示，再次失败才重新回落', () => {
    const el = mount({
      items: JSON.stringify([{ id: 'p', title: 'P', price: 1, image: 'https://example.invalid/old.png' }]),
    })
    const thumb = () => itemEl(el, 0).querySelector<HTMLElement>('[part="thumb"]')!
    const img = itemEl(el, 0).querySelector<HTMLImageElement>('[part="image"]')!
    img.dispatchEvent(new Event('error'))
    expect(thumb().getAttribute('data-empty')).toBe('true')

    // 宿主换新图 URL（如换 SKU 图）：不得沿用旧失败记录，应重试显示
    el.setAttribute('items', JSON.stringify([{ id: 'p', title: 'P', price: 1, image: 'https://example.com/new.png' }]))
    const img2 = itemEl(el, 0).querySelector<HTMLImageElement>('[part="image"]')!
    expect(img2.getAttribute('src')).toBe('https://example.com/new.png')
    expect(img2.hidden).toBe(false)
    expect(thumb().getAttribute('data-empty')).toBe('false')

    // 新 URL 再次失败 → 记入新键，回落占位；旧键不再影响该条目
    img2.dispatchEvent(new Event('error'))
    expect(thumb().getAttribute('data-empty')).toBe('true')
  })

  it('非法数据：items 非 JSON / price 非法 / maxQuantity 非法各告警一次并降级不抛错', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ items: 'not-json' })
      expect(rowsOf(el)).toHaveLength(0)
      el.setAttribute(
        'items',
        JSON.stringify([
          { id: 'a', title: 'A', price: 'abc', maxQuantity: 0 },
          { id: 'b', title: 'B', price: 3, maxQuantity: 0 },
        ]),
      )
      const priceWarns = warn.mock.calls.filter((call) => String(call[0]).includes('price'))
      const maxWarns = warn.mock.calls.filter((call) => String(call[0]).includes('maxQuantity'))
      expect(priceWarns).toHaveLength(1)
      expect(maxWarns).toHaveLength(1)
      // 价格降级为 0、非法上限被忽略（数量 5 不被钳到 0）
      expect(el.items[0]!.quantity).toBe(1)
      expect(priceText(el)).toBe('0')
    } finally {
      warn.mockRestore()
    }
  })

  it('property 通道：items 读写双向，数组与 JSON 字符串都接受', () => {
    const el = mount()
    el.items = ITEMS
    expect(el.getAttribute('items')).toBe(JSON.stringify(ITEMS))
    expect(rowsOf(el)).toHaveLength(3)

    el.items = '[]'
    expect(el.items).toEqual([])
    expect(rowsOf(el)).toHaveLength(0)

    const desc = Object.getOwnPropertyDescriptor(OASCart.prototype, 'items')
    expect(typeof desc?.get).toBe('function')
    expect(typeof desc?.set).toBe('function')
  })

  it('currency / precision 透传到条目单价与合计', () => {
    const el = mount({ items: JSON_ITEMS, currency: 'USD', locale: 'en-US', precision: '0' })
    const prices = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="item-price"]')]
    expect(prices[0]!.getAttribute('currency')).toBe('USD')
    expect(prices[0]!.getAttribute('precision')).toBe('0')
    expect(prices[0]!.getAttribute('locale')).toBe('en-US')
    const subtotal = el.shadowRoot!.querySelector<HTMLElement>('[part="subtotal"] oas-price')!
    expect(subtotal.getAttribute('precision')).toBe('0')
  })

  it('条目增删触发重建、勾选改数量走增量（节点身份不变，焦点保持）', () => {
    const el = mount({ items: JSON_ITEMS })
    const firstCheckbox = checkboxOf(el, 0)
    const firstPlus = plusOf(el, 0)

    plusOf(el, 0).click()
    expect(checkboxOf(el, 0)).toBe(firstCheckbox)
    expect(plusOf(el, 0)).toBe(firstPlus)

    el.setAttribute('items', JSON.stringify([...ITEMS, { id: 'd', title: '新条目', price: 1 }]))
    expect(rowsOf(el)).toHaveLength(4)
    expect(rowsOf(el)[3]!.getAttribute('data-id')).toBe('d')
  })

  it('操作 actions 插槽渲染在合计行右侧', () => {
    const el = mount({ items: JSON_ITEMS })
    const btn = document.createElement('button')
    btn.textContent = '去结算'
    btn.slot = 'actions'
    el.appendChild(btn)
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('[part="actions"] slot')!
    expect(slot.assignedNodes()).toContain(btn)
  })
})

// ---------------------------------------------------------------------------
// 滑动删除交互（本批：pointercancel 单独结算 / 多点触控守卫 / 点行体收起）
// ---------------------------------------------------------------------------

/** 指针事件辅助（happy-dom 的 PointerEvent 可直接构造；cancel 场景给 0 坐标模拟 Safari 行为） */
function swipePointer(el: OASCart, type: string, x: number, y: number, pointerId = 1, target?: HTMLElement): boolean {
  const ev = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId,
    button: 0,
    clientX: x,
    clientY: y,
  })
  return (target ?? itemEl(el, 0).querySelector<HTMLElement>('[part="item-inner"]')!).dispatchEvent(ev)
}

describe('oas-cart 滑动删除交互', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('pointercancel（0 坐标，Safari 类行为）单独结算：未展开回弹 0，不误判满展开', () => {
    const el = mount({ items: JSON_ITEMS, 'delete-mode': 'swipe' })
    const inner = itemEl(el, 0).querySelector<HTMLElement>('[part="item-inner"]')!
    // 按下并拖过吸附阈值（跟手中）
    swipePointer(el, 'pointerdown', 200, 20)
    swipePointer(el, 'pointermove', 140, 20) // dx = -60，已越过 72/2
    expect(inner.getAttribute('data-dragging')).toBe('true')
    // 手势被浏览器接管：cancel 给 0 坐标（Safari 类行为）
    swipePointer(el, 'pointercancel', 0, 0)
    // 必须按手势前状态落定：未展开 → 回弹 0（清除 transform），而不是拿 (0-200) 误判成满展开
    expect(inner.style.transform, 'cancel 不读坐标：未展开手势回弹关闭').toBe('')
    expect(inner.getAttribute('data-dragging'), '拖拽态已收尾').toBeNull()
    // cancel 不是正常松手：不抑制紧随的 click（无 suppressClick 残留）
    const clicks: Array<{ id: string }> = []
    el.addEventListener('oas-item-click', (e) => clicks.push((e as CustomEvent<{ id: string }>).detail))
    itemEl(el, 0).querySelector<HTMLElement>('[part="item-body"]')!.click()
    expect(
      clicks.map((c) => c.id),
      'cancel 后的首次点击不得被吞',
    ).toEqual(['a'])
  })

  it('pointercancel：手势前已展开的行保持展开（不被 cancel 收起）', () => {
    const el = mount({ items: JSON_ITEMS, 'delete-mode': 'swipe' })
    const inner = itemEl(el, 0).querySelector<HTMLElement>('[part="item-inner"]')!
    // 第一次手势：拖过半松手 → 吸附展开
    swipePointer(el, 'pointerdown', 200, 20)
    swipePointer(el, 'pointermove', 130, 20)
    swipePointer(el, 'pointerup', 130, 20)
    expect(inner.style.transform).toBe('translateX(-72px)')
    // 第二次手势（拖回中）被 cancel 打断：保持展开落定
    swipePointer(el, 'pointerdown', 100, 20)
    swipePointer(el, 'pointermove', 150, 20)
    swipePointer(el, 'pointercancel', 0, 0)
    expect(inner.style.transform, '已展开行 cancel 后保持展开').toBe('translateX(-72px)')
    expect(inner.getAttribute('data-dragging')).toBeNull()
  })

  it('多点触控守卫：第二指按下不改写第一行的拖拽会话（起点不被覆盖）', () => {
    const el = mount({ items: JSON_ITEMS, 'delete-mode': 'swipe' })
    const innerA = itemEl(el, 0).querySelector<HTMLElement>('[part="item-inner"]')!
    const innerB = itemEl(el, 1).querySelector<HTMLElement>('[part="item-inner"]')!
    // 第一指按下行 A
    swipePointer(el, 'pointerdown', 200, 20, 1)
    swipePointer(el, 'pointermove', 160, 20, 1)
    expect(innerA.getAttribute('data-dragging')).toBe('true')
    // 第二指按下行 B：已有会话在途 → 不开新会话，行 A 的状态不被改写
    swipePointer(el, 'pointerdown', 200, 80, 2, innerB)
    expect(innerA.getAttribute('data-dragging'), '第一行拖拽态不被第二指清掉').toBe('true')
    expect(innerB.getAttribute('data-dragging'), '第二指不抢会话').toBeNull()
    // 第二指的 move/up 与会话 pointerId 不匹配：不影响任何状态
    swipePointer(el, 'pointermove', 120, 80, 2, innerB)
    swipePointer(el, 'pointerup', 120, 80, 2, innerB)
    expect(innerA.getAttribute('data-dragging')).toBe('true')
    expect(innerB.getAttribute('data-dragging')).toBeNull()
    // 第一指抬起顺序无关：行 A 正常结算（dx=-30 未过吸附半 36 → 回弹 0）
    swipePointer(el, 'pointerup', 170, 20, 1)
    expect(innerA.getAttribute('data-dragging')).toBeNull()
    expect(innerA.style.transform, '未过半回弹关闭').toBe('')
    expect(innerB.getAttribute('data-dragging'), '行 B 全程无残留').toBeNull()
  })

  /** 模拟真实 tap 序列（pointerdown 会重置 suppressClick——幽灵 click 抑制只针对无 down 的 click） */
  function tapOn(el: OASCart, target: HTMLElement): void {
    swipePointer(el, 'pointerdown', 200, 20, 3, target)
    swipePointer(el, 'pointerup', 200, 20, 3, target)
    target.click()
  }

  it('展开态点行体收起且不派 oas-item-click；点其他行收起已展开行并正常派发', () => {
    const el = mount({ items: JSON_ITEMS, 'delete-mode': 'swipe' })
    const clicks: Array<{ id: string }> = []
    el.addEventListener('oas-item-click', (e) => clicks.push((e as CustomEvent<{ id: string }>).detail))
    const innerA = itemEl(el, 0).querySelector<HTMLElement>('[part="item-inner"]')!
    const bodyA = itemEl(el, 0).querySelector<HTMLElement>('[part="item-body"]')!
    const bodyB = itemEl(el, 1).querySelector<HTMLElement>('[part="item-body"]')!
    // 展开行 A
    swipePointer(el, 'pointerdown', 200, 20)
    swipePointer(el, 'pointermove', 130, 20)
    swipePointer(el, 'pointerup', 130, 20)
    expect(innerA.style.transform).toBe('translateX(-72px)')
    // 点已展开行的行体（真实 tap 序列）→ 只收起，不派事件
    tapOn(el, bodyA)
    expect(innerA.style.transform, '展开态点行体收起').toBe('')
    expect(clicks, '收起动作不派 oas-item-click').toEqual([])
    // 再展开行 A，然后点行 B 的行体 → 行 A 收起 + 行 B 正常派发事件
    swipePointer(el, 'pointerdown', 200, 20)
    swipePointer(el, 'pointermove', 130, 20)
    swipePointer(el, 'pointerup', 130, 20)
    expect(innerA.style.transform).toBe('translateX(-72px)')
    tapOn(el, bodyB)
    expect(innerA.style.transform, '点其他行收起已展开行（单行操作惯例）').toBe('')
    expect(
      clicks.map((c) => c.id),
      '点其他行仍正常派发',
    ).toEqual(['b'])
  })

  it('button 模式点行体不受滑动收起逻辑影响（正常派发 oas-item-click）', () => {
    const el = mount({ items: JSON_ITEMS })
    const clicks: Array<{ id: string }> = []
    el.addEventListener('oas-item-click', (e) => clicks.push((e as CustomEvent<{ id: string }>).detail))
    itemEl(el, 0).querySelector<HTMLElement>('[part="item-body"]')!.click()
    expect(clicks.map((c) => c.id)).toEqual(['a'])
  })
})
