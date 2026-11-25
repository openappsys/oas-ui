import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASGoodsList, type GoodsItem } from './index.js'
import { assignColumns, resolveAutoColumns, resolveColumns, shouldRequestMore } from './column-assign.js'

const ITEMS: GoodsItem[] = [
  { title: 'A', price: 10, tags: ['新品'] },
  { title: 'B', price: 20 },
  { title: 'C', price: 30 },
  { title: 'D', price: 40 },
  { title: 'E', price: 50, tags: ['热销', '包邮'] },
  { title: 'F', price: 60 },
]

function mount(attrs: Record<string, string> = {}): OASGoodsList {
  const el = new OASGoodsList()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function part(el: OASGoodsList, name: string): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)
}

function parts(el: OASGoodsList, name: string): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>(`[part="${name}"]`)]
}

describe('goods-list 纯函数内核', () => {
  it('assignColumns：累计高度最短列放置（不均高度分布不集中于首列）', () => {
    const assignment = assignColumns([300, 100, 200, 150, 400, 50], 3)
    expect(assignment).toHaveLength(6)
    // 逐项手算：h=300→c0；h=100→c1；h=200→c2；h=150→c1(250<300,300)；h=400→c2(400)；h=50→c1(300)
    expect(assignment).toEqual([0, 1, 2, 1, 2, 1])
  })

  it('assignColumns：全 0 高度（未布局）退化为轮转均匀分布', () => {
    const assignment = assignColumns([0, 0, 0, 0, 0, 0], 3)
    expect(assignment).toEqual([0, 1, 2, 0, 1, 2])
  })

  it('resolveAutoColumns：容器宽断点（<640→2、<1024→3、其余→4、非法宽回落 2）', () => {
    expect(resolveAutoColumns(375)).toBe(2)
    expect(resolveAutoColumns(639)).toBe(2)
    expect(resolveAutoColumns(768)).toBe(3)
    expect(resolveAutoColumns(1023)).toBe(3)
    expect(resolveAutoColumns(1280)).toBe(4)
    expect(resolveAutoColumns(0)).toBe(2)
    expect(resolveAutoColumns(Number.NaN)).toBe(2)
  })

  it('resolveColumns：固定数值 clamp（1–8）、auto / 缺省 / 非法回落自适应', () => {
    expect(resolveColumns('3', 1000)).toEqual({ columns: 3, mode: 'fixed' })
    expect(resolveColumns('0', 1200)).toEqual({ columns: 4, mode: 'auto' })
    expect(resolveColumns('9', 1200)).toEqual({ columns: 4, mode: 'auto' })
    expect(resolveColumns('auto', 768)).toEqual({ columns: 3, mode: 'auto' })
    expect(resolveColumns('', 1280)).toEqual({ columns: 4, mode: 'auto' })
    expect(resolveColumns('bad', 375)).toEqual({ columns: 2, mode: 'auto' })
  })

  it('shouldRequestMore：触底判定矩阵（loading / no-more / pending 任一为真不触发）', () => {
    const base = { loading: false, noMore: false, pending: false }
    expect(shouldRequestMore(500, 600, base)).toBe(true) // 哨兵在视口内
    expect(shouldRequestMore(840, 600, base)).toBe(true) // 840 <= 600+240（提前量边界内）
    expect(shouldRequestMore(841, 600, base)).toBe(false) // 刚出提前量
    expect(shouldRequestMore(500, 600, { ...base, loading: true })).toBe(false)
    expect(shouldRequestMore(500, 600, { ...base, noMore: true })).toBe(false)
    expect(shouldRequestMore(500, 600, { ...base, pending: true })).toBe(false)
    expect(shouldRequestMore(Number.NaN, 600, base)).toBe(false)
    expect(shouldRequestMore(500, 0, base)).toBe(false)
  })
})

describe('oas-goods-list', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('瀑布流缺省渲染：items → 内建卡（role=listitem / 列容器结构），卡片数与列数正确', () => {
    const el = mount({ items: JSON.stringify(ITEMS), columns: '2' })
    const cards = parts(el, 'card')
    expect(cards).toHaveLength(6)
    expect(cards.every((c) => c.getAttribute('role') === 'listitem')).toBe(true)
    const cols = parts(el, 'col')
    expect(cols).toHaveLength(2)
    // 卡片全部落在列里
    expect(cols.reduce((n, col) => n + col.childElementCount, 0)).toBe(6)
  })

  it('list 语义合法：role=list 在卡片网格容器上，more / empty / 哨兵等非卡节点不在 list 容器内', () => {
    const el = mount({ items: JSON.stringify(ITEMS), columns: '2' })
    const grid = part(el, 'grid')!
    expect(grid.getAttribute('role')).toBe('list')
    expect(grid.getAttribute('aria-label')).toBe('商品列表')
    // wrap 回归普通区块（无 list 语义，装非卡片节点不再违规）
    expect(part(el, 'wrap')!.getAttribute('role')).toBeNull()
    // list 容器内只有列容器（presentation）与卡片（listitem）
    const ok = [...grid.querySelectorAll('*')].every(
      (n) =>
        n.getAttribute('role') === 'presentation' ||
        n.getAttribute('role') === 'listitem' ||
        n.closest('[part="card"]') != null,
    )
    expect(ok).toBe(true)
    // 非卡节点在 grid 之外
    expect(part(el, 'grid')!.contains(part(el, 'more')!)).toBe(false)
    expect(part(el, 'grid')!.contains(part(el, 'empty')!)).toBe(false)
    expect(part(el, 'grid')!.contains(part(el, 'sentinel')!)).toBe(false)
  })

  it('插槽卡搬运进列后补 listitem 语义（宿主节点无 role 时）', async () => {
    const el = mount({})
    const custom = document.createElement('div')
    custom.textContent = '宿主自定义卡'
    custom.slot = ''
    el.appendChild(custom)
    await new Promise((r) => setTimeout(r, 0))
    expect(el.shadowRoot!.contains(custom)).toBe(true)
    expect(custom.getAttribute('role')).toBe('listitem')
    // 宿主自带 role 不覆盖
    const withRole = document.createElement('button')
    withRole.setAttribute('role', 'button')
    withRole.slot = ''
    el.appendChild(withRole)
    await new Promise((r) => setTimeout(r, 0))
    expect(withRole.getAttribute('role')).toBe('button')
  })

  it('固定 columns=3 渲染三列；list 形态恒单列', () => {
    const el3 = mount({ items: JSON.stringify(ITEMS), columns: '3' })
    expect(parts(el3, 'col')).toHaveLength(3)
    const list = mount({ items: JSON.stringify(ITEMS), layout: 'list', columns: '3' })
    expect(parts(list, 'col')).toHaveLength(1)
  })

  it('内建卡结构：标题 / 价格（oas-price）/ 标签位 / 图片 alt 与缺失占位', () => {
    const el = mount({
      items: JSON.stringify([
        { title: '带图商品', image: 'demo.svg', price: 9.9, originalPrice: 19.9, tags: ['限时'] },
      ]),
    })
    const card = part(el, 'card')!
    expect(card.querySelector('[part="title"]')!.textContent).toBe('带图商品')
    expect(card.querySelector('[part="media"]')!.getAttribute('data-empty')).toBe('false')
    expect(card.querySelector('[part="image"]')!.getAttribute('alt')).toBe('带图商品')
    expect(card.querySelector('[part="price"]')!.getAttribute('value')).toBe('9.9')
    expect(card.querySelector('[part="price"]')!.getAttribute('original')).toBe('19.9')
    expect(part(el, 'tag')!.textContent).toBe('限时')
    // 缺图：占位 aria-label（i18n）
    const el2 = mount({ items: JSON.stringify([{ title: '无图商品' }]) })
    expect(el2.shadowRoot!.querySelector('[part="media"]')!.getAttribute('data-empty')).toBe('true')
    expect(el2.shadowRoot!.querySelector('[part="placeholder"]')!.getAttribute('aria-label')).toBe('暂无图片')
  })

  it('items property 双通道（数组写入反射 attribute），非法 JSON 告警一次按空处理', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount()
    el.items = ITEMS.slice(0, 3)
    expect(JSON.parse(el.getAttribute('items')!)).toEqual(ITEMS.slice(0, 3))
    expect(parts(el, 'card')).toHaveLength(3)
    const el2 = mount({ items: '{bad' })
    expect(parts(el2, 'card')).toHaveLength(0)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0]?.[0]).toContain('oas-goods-list')
  })

  it('缺 title 的条目被忽略；currency / precision 透传内嵌 oas-price', () => {
    const el = mount({
      items: JSON.stringify([{ title: 'OK', price: 5 }, { price: 6 }, { title: '' }, 'not-an-object']),
      currency: 'USD',
      precision: '1',
    })
    expect(parts(el, 'card')).toHaveLength(1)
    expect(part(el, 'price')!.getAttribute('currency')).toBe('USD')
    expect(part(el, 'price')!.getAttribute('precision')).toBe('1')
  })

  it('插槽卡整体替换优先于 items 默认渲染（同时给两者只渲染插槽卡）', async () => {
    const el = mount({ items: JSON.stringify(ITEMS) })
    const custom = document.createElement('div')
    custom.textContent = '宿主自定义卡'
    custom.slot = ''
    el.appendChild(custom)
    await new Promise((r) => setTimeout(r, 0))
    expect(parts(el, 'card')).toHaveLength(0) // items 内建卡不渲染
    // 宿主卡被分配进列
    expect(el.shadowRoot!.contains(custom)).toBe(true)
    expect(parts(el, 'col').some((col) => col.contains(custom))).toBe(true)
  })

  it('插槽卡增量追加：初始 2 张后再追加 3 张，全部捕获入列显示', async () => {
    const el = mount({ columns: '2' })
    const make = (text: string): HTMLElement => {
      const d = document.createElement('div')
      d.textContent = text
      d.slot = ''
      return d
    }
    const c1 = make('卡一')
    const c2 = make('卡二')
    el.append(c1)
    el.append(c2)
    await new Promise((r) => setTimeout(r, 0))
    expect(parts(el, 'col').reduce((n, col) => n + col.childElementCount, 0)).toBe(2)
    // 追加 3 张：全部 5 张入列（不丢已捕获的）
    el.append(make('卡三'))
    el.append(make('卡四'))
    el.append(make('卡五'))
    await new Promise((r) => setTimeout(r, 0))
    const inCols = parts(el, 'col').reduce((n, col) => n + col.childElementCount, 0)
    expect(inCols).toBe(5)
    expect(parts(el, 'col').some((col) => col.contains(c1))).toBe(true)
    expect(parts(el, 'col').some((col) => col.contains(c2))).toBe(true)
    // light DOM 不残留未分配卡
    expect([...el.children].filter((c) => !el.shadowRoot!.contains(c))).toHaveLength(0)
  })

  it('空态：items 空显示缺省文案，empty 插槽可整体替换', async () => {
    const el = mount({})
    expect(part(el, 'empty')!.hidden).toBe(false)
    expect(part(el, 'empty-text')!.textContent).toBe('暂无商品')
    const slotEl = document.createElement('div')
    slotEl.slot = 'empty'
    slotEl.textContent = '自定义空态'
    el.appendChild(slotEl)
    await new Promise((r) => setTimeout(r, 0))
    // 插槽内容分配后 fallback 收起（slot 元素保留分配通道）
    expect(part(el, 'empty-text')!.hidden).toBe(true)
    expect(
      part(el, 'empty')!
        .querySelector('slot')!
        .assignedNodes()
        .some((n) => n.textContent === '自定义空态'),
    ).toBe(true)
  })

  it('oas-item-click：点击 / Enter 内建卡派发 detail（index + item）', () => {
    const el = mount({ items: JSON.stringify(ITEMS) })
    const events: unknown[] = []
    el.addEventListener('oas-item-click', (e) => events.push((e as CustomEvent).detail))
    // 轮转分配下 DOM 序 ≠ items 序：按 dataset.index 取卡核对
    const card = parts(el, 'card')[0]!
    const expectIndex = Number(card.dataset.index)
    card.click()
    expect(events).toHaveLength(1)
    expect((events[0] as { index: number }).index).toBe(expectIndex)
    expect((events[0] as { item: GoodsItem }).item.title).toBe(ITEMS[expectIndex]!.title)
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(events).toHaveLength(2)
  })

  it('加载更多：loading / no-more 态渲染（spinner + 文案 / 到底文案）', () => {
    const el = mount({ items: JSON.stringify(ITEMS) })
    expect(part(el, 'spinner')!.hidden).toBe(true)
    el.setAttribute('loading', '')
    expect(part(el, 'spinner')!.hidden).toBe(false)
    expect(part(el, 'more-text')!.textContent).toBe('加载中…')
    el.removeAttribute('loading')
    el.setAttribute('no-more', '')
    expect(part(el, 'more-text')!.textContent).toBe('没有更多了')
  })

  it('触底：哨兵在视口内派发 oas-load-more 且 pending 防重；置 loading 解除待应答', () => {
    // 监听须在挂载前就位：首次 update（mount 内部）即派发首触底
    const el = new OASGoodsList()
    el.setAttribute('items', JSON.stringify(ITEMS))
    const events: number[] = []
    el.addEventListener('oas-load-more', () => events.push(1))
    document.body.appendChild(el)
    expect(events).toHaveLength(1)
    // 滚动事件再检查：pending 未解除 → 不重复派发
    document.dispatchEvent(new Event('scroll'))
    expect(events).toHaveLength(1)
    // 宿主应答（置 loading）→ 加载完成（解除 loading）→ 哨兵仍在视口 → 再派发
    el.setAttribute('loading', '')
    el.removeAttribute('loading')
    document.dispatchEvent(new Event('scroll'))
    expect(events).toHaveLength(2)
    // no-more → 恒不派发
    el.setAttribute('no-more', '')
    document.dispatchEvent(new Event('scroll'))
    expect(events).toHaveLength(2)
  })

  it('items 变化解除触底待应答：宿主只追加数据（不置 loading）→ 第二次触底再派发', () => {
    const el = new OASGoodsList()
    el.setAttribute('items', JSON.stringify(ITEMS.slice(0, 2)))
    const events: number[] = []
    el.addEventListener('oas-load-more', () => events.push(1))
    document.body.appendChild(el)
    expect(events).toHaveLength(1)
    // 只追加 items（宿主未置 loading）→ 待应答解除
    el.setAttribute('items', JSON.stringify(ITEMS))
    document.dispatchEvent(new Event('scroll'))
    expect(events).toHaveLength(2)
    // items 未变时 pending 仍防重
    document.dispatchEvent(new Event('scroll'))
    expect(events).toHaveLength(2)
  })

  it('隐藏容器挂载零事件：display:none 下不误派 load-more，显示后滚动才派发', async () => {
    const wrapper = document.createElement('div')
    wrapper.style.display = 'none'
    const el = new OASGoodsList()
    el.setAttribute('items', JSON.stringify(ITEMS))
    const events: number[] = []
    el.addEventListener('oas-load-more', () => events.push(1))
    wrapper.appendChild(el)
    document.body.appendChild(wrapper)
    expect(events).toHaveLength(0)
    // 显示后滚动（rAF 节流异步落定）→ 哨兵可见 → 派发
    wrapper.style.display = 'block'
    document.dispatchEvent(new Event('scroll'))
    await new Promise((r) => setTimeout(r, 50))
    expect(events).toHaveLength(1)
  })

  it('加载更多区是活区：role=status + aria-live=polite（loading / 到底文案变化可播报）', () => {
    const el = mount({ items: JSON.stringify(ITEMS) })
    const more = part(el, 'more')!
    expect(more.getAttribute('role')).toBe('status')
    expect(more.getAttribute('aria-live')).toBe('polite')
  })

  it('list 形态卡结构：media 与 info 分列（图文横排行），info 内含标题 / 标签 / 价格', () => {
    const el = mount({
      items: JSON.stringify([{ title: '行卡', price: 9, tags: ['标签'], image: 'a.svg' }]),
      layout: 'list',
    })
    const card = part(el, 'card')!
    const info = card.querySelector<HTMLElement>('[part="info"]')
    expect(info).toBeInstanceOf(HTMLElement)
    expect(info!.contains(card.querySelector('[part="title"]')!)).toBe(true)
    expect(info!.contains(card.querySelector('[part="tags"]')!)).toBe(true)
    expect(info!.contains(card.querySelector('[part="price"]')!)).toBe(true)
    // media 是 info 的兄弟（横排左右分区）
    expect(info!.contains(card.querySelector('[part="media"]')!)).toBe(false)
    // waterfall 形态同样有 info 容器（同构 DOM，CSS 控制方向）
    const el2 = mount({ items: JSON.stringify([{ title: '瀑布卡' }]) })
    expect(part(el2, 'card')!.querySelector('[part="info"]')).toBeInstanceOf(HTMLElement)
  })

  it('layout 非法值告警一次并回落 waterfall', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ items: JSON.stringify(ITEMS), layout: 'grid' })
    expect(parts(el, 'col').length).toBeGreaterThan(1)
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it('断开重连：卡片保留、滚动监听恢复（再滚动仍可触发）', () => {
    const el = new OASGoodsList()
    el.setAttribute('items', JSON.stringify(ITEMS))
    const events: number[] = []
    el.addEventListener('oas-load-more', () => events.push(1))
    document.body.appendChild(el)
    expect(events).toHaveLength(1)
    el.remove()
    document.body.appendChild(el)
    expect(parts(el, 'card')).toHaveLength(6)
    // 重连后监听恢复：宿主应答 → 解除 loading → 滚动再触发
    el.setAttribute('loading', '')
    el.removeAttribute('loading')
    document.dispatchEvent(new Event('scroll'))
    expect(events).toHaveLength(2)
  })

  it('RTL 容器下渲染与点击不受方向影响', () => {
    document.documentElement.setAttribute('dir', 'rtl')
    try {
      const el = mount({ items: JSON.stringify(ITEMS.slice(0, 2)), columns: '2' })
      const events: unknown[] = []
      el.addEventListener('oas-item-click', (e) => events.push((e as CustomEvent).detail))
      parts(el, 'card')[0]!.click()
      expect(events).toHaveLength(1)
      expect(parts(el, 'col')).toHaveLength(2)
    } finally {
      document.documentElement.removeAttribute('dir')
    }
  })
})
