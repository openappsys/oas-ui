import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASOrderList } from './index.js'

const TABS = JSON.stringify([
  { key: 'all', label: '全部', count: 8 },
  { key: 'pending', label: '待付款', count: 2 },
  { key: 'shipped', label: '已发货' },
  { key: 'done', label: '已完成', count: 3 },
])

function mount(attrs: Record<string, string> = {}): OASOrderList {
  const el = new OASOrderList()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function part(el: OASOrderList, name: string): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)
}

function tabs(el: OASOrderList): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="tab"]')]
}

function tabByKey(el: OASOrderList, key: string): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>(`[part="tab"][data-key="${key}"]`)
}

function slotCards(el: OASOrderList, n: number): void {
  for (let i = 0; i < n; i++) {
    const card = document.createElement('div')
    card.className = 'fake-card'
    card.textContent = `订单卡 ${i + 1}`
    el.appendChild(card)
  }
}

describe('oas-order-list', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  // —— 页签 ——

  it('tabs 渲染 tablist/tab 语义 + count 徽标；active 缺省第一个 tab（aria-selected）', () => {
    const el = mount({ tabs: TABS })
    const tablist = part(el, 'tablist')!
    expect(tablist.getAttribute('role')).toBe('tablist')
    expect(tablist.getAttribute('aria-label')).toBe('订单状态')
    // tabpanel 可访问名（组件级上下文）
    expect(part(el, 'body')!.getAttribute('aria-label')).toBe('订单列表')
    const tabsEls = tabs(el)
    expect(tabsEls).toHaveLength(4)
    expect(tabsEls[0]!.getAttribute('role')).toBe('tab')
    expect(tabsEls[0]!.getAttribute('aria-selected')).toBe('true')
    expect(tabsEls[1]!.getAttribute('aria-selected')).toBe('false')
    // count 徽标渲染且可访问名从可见内容推导（含数字，不用 aria-label 包裹破坏 label-in-name）
    expect(tabsEls[0]!.textContent).toContain('8')
    expect(tabsEls[2]!.textContent).not.toContain('undefined')
  })

  it('点击 tab：回写 active attribute + 派发 oas-tab-change（detail {key, label}）；宿主直写 active 静默', () => {
    const el = mount({ tabs: TABS })
    const detail: Array<Record<string, unknown>> = []
    el.addEventListener('oas-tab-change', (e) => detail.push((e as CustomEvent).detail))
    tabByKey(el, 'shipped')!.click()
    expect(el.getAttribute('active')).toBe('shipped')
    expect(detail).toEqual([{ key: 'shipped', label: '已发货' }])
    expect(tabByKey(el, 'shipped')!.getAttribute('aria-selected')).toBe('true')

    // 宿主直写静默（不派发）
    detail.length = 0
    el.setAttribute('active', 'all')
    expect(detail).toHaveLength(0)
    expect(tabByKey(el, 'all')!.getAttribute('aria-selected')).toBe('true')
  })

  it('active property 双通道（字符串 setter 反射 attribute）', () => {
    const el = mount({ tabs: TABS })
    el.active = 'pending'
    expect(el.getAttribute('active')).toBe('pending')
    expect(el.active).toBe('pending')
    expect(tabByKey(el, 'pending')!.getAttribute('aria-selected')).toBe('true')
  })

  it('键盘：方向键移动焦点（roving tabindex），Enter/Space 激活', () => {
    const el = mount({ tabs: TABS })
    const tabsEls = tabs(el)
    // 初始 tabindex：激活 tab 0，其余 -1
    expect(tabsEls[0]!.getAttribute('tabindex')).toBe('0')
    expect(tabsEls[1]!.getAttribute('tabindex')).toBe('-1')
    // 聚焦 tab0 按右方向键 → 焦点移到 tab1（不激活）
    tabsEls[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))
    expect(tabsEls[1]!.getAttribute('tabindex')).toBe('0')
    expect(tabsEls[0]!.getAttribute('tabindex')).toBe('-1')
    expect(tabByKey(el, 'pending')!.getAttribute('aria-selected')).toBe('false')
    // Enter 激活
    tabsEls[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(tabByKey(el, 'pending')!.getAttribute('aria-selected')).toBe('true')
    expect(el.getAttribute('active')).toBe('pending')
  })

  it('tabs 非法 JSON：告警一次 + 空页签隐藏 tablist；disabled tab 不激活不派发', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bad = mount({ tabs: 'nope' })
    expect(part(bad, 'tablist')!.hidden).toBe(true)
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()

    const el = mount({
      tabs: JSON.stringify([
        { key: 'a', label: 'A' },
        { key: 'b', label: 'B', disabled: true },
      ]),
    })
    const detail: Array<Record<string, unknown>> = []
    el.addEventListener('oas-tab-change', (e) => detail.push((e as CustomEvent).detail))
    ;(tabByKey(el, 'b') as HTMLButtonElement).click()
    expect(detail).toHaveLength(0)
    // active 未回写（disabled 点击无效），getter 兜底仍解析到首个 tab
    expect(el.getAttribute('active')).toBeNull()
    expect(el.active).toBe('a')
    expect(tabByKey(el, 'a')!.getAttribute('aria-selected')).toBe('true')
  })

  it('缺省（无 tabs）不渲染 tablist；插槽订单卡直接渲染（不搬运）', () => {
    const el = mount()
    expect(part(el, 'tablist')!.hidden).toBe(true)
    slotCards(el, 2)
    // 卡留在 light DOM（轻量容器不做 shadow 搬运——宿主卡样式自治）
    expect(el.querySelectorAll('.fake-card')).toHaveLength(2)
    expect(el.querySelector('.fake-card')!.parentElement).toBe(el)
  })

  // —— 空态 ——

  it('插槽无内容时显示空态（i18n 缺省文案）；empty 插槽替换；有卡隐藏', async () => {
    const el = mount({ tabs: TABS })
    const empty = part(el, 'empty')!
    expect(empty.hidden).toBe(false)
    expect(empty.textContent).toContain('暂无订单')

    const custom = document.createElement('div')
    custom.slot = 'empty'
    custom.textContent = '这个状态下没有订单'
    el.appendChild(custom)
    slotCards(el, 1)
    await Promise.resolve()
    await new Promise((r) => setTimeout(r, 0))
    expect(empty.hidden).toBe(true)
  })

  // —— 触底加载更多（复用 goods-list 状态机） ——

  it('触底：哨兵可见且非 loading/no-more 时派发 oas-load-more；pending 防重；置 loading 解除待应答', () => {
    // 监听须在挂载前就位：插槽卡先就位，首次 update（挂载）即派发首触底
    const el = new OASOrderList()
    el.setAttribute('tabs', TABS)
    const card = document.createElement('div')
    card.textContent = '订单卡 1'
    el.appendChild(card)
    const events: number[] = []
    el.addEventListener('oas-load-more', () => events.push(1))
    document.body.appendChild(el)
    expect(events).toHaveLength(1)
    // 滚动事件再检查：pending 未解除 → 不重复派发
    document.dispatchEvent(new Event('scroll'))
    expect(events).toHaveLength(1)
    // 宿主应答（置 loading）→ 解除 → 哨兵仍在视口 → 再派发
    el.setAttribute('loading', '')
    el.removeAttribute('loading')
    document.dispatchEvent(new Event('scroll'))
    expect(events).toHaveLength(2)
    // no-more → 恒不派发
    el.setAttribute('no-more', '')
    document.dispatchEvent(new Event('scroll'))
    expect(events).toHaveLength(2)
    // no-more 态到底文案
    expect(part(el, 'more')!.textContent).toContain('没有更多了')
  })

  it('插槽内容变化解除待应答：宿主只追加订单卡（不置 loading）→ 第二次触底再派发', () => {
    const el = new OASOrderList()
    el.setAttribute('tabs', TABS)
    const card = document.createElement('div')
    card.textContent = '订单卡 1'
    el.appendChild(card)
    const events: number[] = []
    el.addEventListener('oas-load-more', () => events.push(1))
    document.body.appendChild(el)
    expect(events).toHaveLength(1)
    // 只追加插槽卡（宿主未置 loading）→ slot 分配变化解除待应答
    const card2 = document.createElement('div')
    card2.textContent = '订单卡 2'
    el.appendChild(card2)
    document.dispatchEvent(new Event('scroll'))
    expect(events).toHaveLength(2)
    // 插槽未变时 pending 仍防重
    document.dispatchEvent(new Event('scroll'))
    expect(events).toHaveLength(2)
  })

  it('display:none 链路内不派发（隐藏容器守卫）；loading 态渲染 spinner + 加载中文案', async () => {
    const wrapper = document.createElement('div')
    wrapper.style.display = 'none'
    document.body.appendChild(wrapper)
    const el = new OASOrderList()
    el.setAttribute('tabs', TABS)
    const card = document.createElement('div')
    card.textContent = '订单卡 1'
    el.appendChild(card)
    const events: number[] = []
    el.addEventListener('oas-load-more', () => events.push(1))
    // 挂进 display:none 容器：几何值无意义，不误派
    wrapper.appendChild(el)
    expect(events).toHaveLength(0)
    // 显示后滚动（rAF 节流异步落定）→ 哨兵可见 → 派发
    wrapper.style.display = 'block'
    document.dispatchEvent(new Event('scroll'))
    await new Promise((r) => setTimeout(r, 50))
    expect(events).toHaveLength(1)

    // loading 态可见
    el.setAttribute('loading', '')
    expect(part(el, 'spinner')!.hidden).toBe(false)
    expect(part(el, 'more')!.hidden).toBe(false)
    expect(part(el, 'more')!.textContent).toContain('加载中')
  })

  it('I1 键盘激活后焦点保持在 tablist 内（重建后焦点复原到激活 tab）', () => {
    const el = mount({ tabs: TABS })
    const tabsEls = tabs(el)
    tabsEls[1]!.focus()
    tabsEls[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    // activateTab → 回写 active → attributeChangedCallback → update() → syncTabs 重建 tablist；
    // 焦点必须仍在（新渲染的）tab 上，不得丢失到 body
    const focusedKey = el.shadowRoot!.activeElement?.getAttribute('data-key')
    expect(focusedKey, '激活后焦点应落在 shadow 内某 tab').toBe('pending')
  })

  it('I2 active 指向 disabled 页签时 roving 兜底到首个 enabled tab（tablist 仍可 Tab 达 + devWarn 一次）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({
      tabs: JSON.stringify([
        { key: 'a', label: 'A' },
        { key: 'b', label: 'B', disabled: true },
      ]),
      active: 'b',
    })
    const tabsEls = tabs(el)
    const zeroTabs = tabsEls.filter((t) => t.getAttribute('tabindex') === '0')
    expect(zeroTabs, '必须恰好有可 Tab 达的 tab').toHaveLength(1)
    expect(zeroTabs[0]!.getAttribute('data-key')).toBe('a')
    expect(zeroTabs[0]!.getAttribute('aria-selected')).toBe('false')
    expect(tabByKey(el, 'b')!.getAttribute('tabindex')).toBe('-1')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0])).toContain('b')
  })

  it('I3 触底待应答按插槽卡身份签名解除——等数量换卡（移除一张 + 追加一张）也解除并可再次派发', () => {
    const el = new OASOrderList()
    el.setAttribute('tabs', TABS)
    const cardA = document.createElement('div')
    cardA.textContent = '订单卡 A'
    el.appendChild(cardA)
    const events: number[] = []
    el.addEventListener('oas-load-more', () => events.push(1))
    document.body.appendChild(el)
    expect(events).toHaveLength(1)
    // 等数量换卡：数量签名不变、身份签名变化 → 必须解除待应答（换页签后宿主换卡场景）
    cardA.remove()
    const cardB = document.createElement('div')
    cardB.textContent = '订单卡 B'
    el.appendChild(cardB)
    document.dispatchEvent(new Event('scroll'))
    expect(events, '等数量换卡后应解除待应答并再次派发').toHaveLength(2)
  })

  it('M6 用户激活页签不重复渲染（回写 attribute 由属性通道触发一次 update，无手动二次调用）', () => {
    const el = mount({ tabs: TABS })
    const original = (OASOrderList.prototype as unknown as { update(): void }).update
    let count = 0
    ;(OASOrderList.prototype as unknown as { update(): void }).update = function (this: OASOrderList) {
      count++
      original.call(this)
    }
    try {
      tabByKey(el, 'shipped')!.click()
    } finally {
      ;(OASOrderList.prototype as unknown as { update(): void }).update = original
    }
    expect(count, '点击激活应只触发一轮 update').toBe(1)
    expect(el.getAttribute('active')).toBe('shipped')
  })

  it('断开重连后滚动监听恢复（触底仍可用）', () => {
    const el = new OASOrderList()
    el.setAttribute('tabs', TABS)
    const card = document.createElement('div')
    card.textContent = '订单卡 1'
    el.appendChild(card)
    const events: number[] = []
    el.addEventListener('oas-load-more', () => events.push(1))
    document.body.appendChild(el)
    expect(events).toHaveLength(1)
    // 断开重连：监听经 onReconnect 恢复
    el.remove()
    document.body.appendChild(el)
    // 重连后首帧 update 触发检查（slot 签名未变 → pending 仍在？——断连时 loadPending 保留，
    // 但 slotSignature 与分配一致、无新派发条件；先置 loading 应答重置待应答再驱动）
    el.setAttribute('loading', '')
    el.removeAttribute('loading')
    document.dispatchEvent(new Event('scroll'))
    expect(events).toHaveLength(2)
  })
})
