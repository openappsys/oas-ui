import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import { OASMessageScroller } from './index.js'

/** FakeRO：记录 observe 目标、可手动触发回调（happy-dom 的 ResizeObserver 是 stub 不回调） */
function installFakeRO(): FakeResizeObserver[] {
  const created: FakeResizeObserver[] = []
  class FakeResizeObserver {
    callback: ResizeObserverCallback
    targets: Element[] = []
    disconnected = false
    constructor(cb: ResizeObserverCallback) {
      this.callback = cb
      created.push(this)
    }
    observe(target: Element) {
      this.targets.push(target)
    }
    unobserve() {}
    disconnect() {
      this.disconnected = true
    }
  }
  vi.stubGlobal('ResizeObserver', FakeResizeObserver as unknown as typeof ResizeObserver)
  return created
}
type FakeResizeObserver = {
  callback: ResizeObserverCallback
  targets: Element[]
  disconnected: boolean
  observe(target: Element): void
  unobserve(): void
  disconnect(): void
}

function mount(inner = '', attrs: Record<string, string> = {}): OASMessageScroller {
  const el = new OASMessageScroller()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = inner
  document.body.appendChild(el)
  return el
}

/** 桩化 viewport 滚动几何（happy-dom 无布局引擎，scrollHeight 恒 0——逻辑测试走实例属性覆盖） */
function stubScroll(el: OASMessageScroller, geo: { scrollHeight?: number; clientHeight?: number }) {
  const vp = el.shadowRoot!.querySelector<HTMLElement>('.viewport')!
  if (geo.scrollHeight != null) {
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: geo.scrollHeight })
  }
  if (geo.clientHeight != null) {
    Object.defineProperty(vp, 'clientHeight', { configurable: true, value: geo.clientHeight })
  }
  return vp
}

function viewportOf(el: OASMessageScroller): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.viewport')!
}

const makeRect = (top: number): DOMRect =>
  ({ top, bottom: top, left: 0, right: 0, width: 0, height: 0, x: 0, y: top, toJSON: () => {} }) as unknown as DOMRect

/**
 * 桩化滚动内容几何（模拟真实布局）：content 盒顶随 scrollTop 上移、元素按内容坐标 y 定位。
 * contentYOf(el) = elRect.top - contentRect.top（滚动不变量）；viewportYOf = elRect.top（vpRect=0）。
 */
function stubGeometry(el: OASMessageScroller, items: Array<{ node: Element; y: number }>) {
  const vp = viewportOf(el)
  const content = el.shadowRoot!.querySelector('[part="content"]')!
  vp.getBoundingClientRect = () => makeRect(0)
  content.getBoundingClientRect = () => makeRect(-vp.scrollTop)
  for (const { node, y } of items) {
    node.getBoundingClientRect = () => makeRect(y - vp.scrollTop)
  }
  return vp
}

const raf = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

describe('OASMessageScroller', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  it('viewport role=region + 可读名称（locale 默认）+ tabIndex=0；content role=log + aria-relevant=additions', () => {
    const el = mount('<p>m1</p>')
    const vp = viewportOf(el)
    expect(vp.getAttribute('role')).toBe('region')
    expect(vp.getAttribute('aria-label')).toBe('消息列表')
    expect(vp.getAttribute('tabindex')).toBe('0')
    const content = el.shadowRoot!.querySelector('[part="content"]')!
    expect(content.getAttribute('role')).toBe('log')
    expect(content.getAttribute('aria-relevant')).toBe('additions')
  })

  it('label 属性覆盖 viewport 可读名称（原生全局属性吸收：读入后从宿主移除）', () => {
    const el = mount('<p>m1</p>', { label: '客服会话' })
    expect(viewportOf(el).getAttribute('aria-label')).toBe('客服会话')
    expect(el.hasAttribute('label')).toBe(false)
  })

  it('default-position=end：首帧后 scrollTop=scrollHeight-clientHeight；start：0', async () => {
    const a = mount('<p>m1</p>')
    stubScroll(a, { scrollHeight: 1000, clientHeight: 400 })
    await raf()
    await raf()
    expect(viewportOf(a).scrollTop).toBe(600)

    const b = mount('<p>m1</p>', { 'default-position': 'start' })
    stubScroll(b, { scrollHeight: 1000, clientHeight: 400 })
    await raf()
    await raf()
    expect(viewportOf(b).scrollTop).toBe(0)
  })

  it('scrollToEnd/scrollToStart 方法（behavior 透传）', async () => {
    const el = mount('<p>m1</p>')
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    el.scrollToEnd({ behavior: 'instant' })
    expect(vp.scrollTop).toBe(600)
    el.scrollToStart({ behavior: 'instant' })
    expect(vp.scrollTop).toBe(0)
  })

  it('scroll-state 事件：滚动时派发 detail { atBottom, atTop, canScrollStart, canScrollEnd }', async () => {
    const el = mount('<p>m1</p>')
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    // 先过首帧（广播闸开）：首连同步段不派发是设计语义——初始态由首帧 rAF 统一广播
    await raf()
    const events: Array<Record<string, unknown>> = []
    el.addEventListener('oas-scroll-state', (e) => events.push((e as CustomEvent).detail))
    vp.scrollTop = 100
    vp.dispatchEvent(new Event('scroll'))
    expect(events.length).toBeGreaterThan(0)
    expect(events.at(-1)).toMatchObject({ atBottom: false, atTop: false, canScrollStart: true, canScrollEnd: true })
  })

  it('near-bottom 检测走 edge-threshold（默认 8）：距底 ≤ 阈值即视为在底部', async () => {
    const el = mount('<p>m1</p>')
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    // 监听先于首帧挂上——顺便验证首帧广播；首帧（default-position=end）在底
    const states: Array<Record<string, unknown>> = []
    el.addEventListener('oas-scroll-state', (e) => states.push((e as CustomEvent).detail))
    await raf()
    expect(states.at(-1)).toMatchObject({ atBottom: true })
    vp.scrollTop = 1000 - 400 - 9 // 超出阈值 → 不在底部（跨线 → 派发）
    vp.dispatchEvent(new Event('scroll'))
    expect(states.at(-1)).toMatchObject({ atBottom: false })
    vp.scrollTop = 1000 - 400 - 8 // 恰在阈值内 → 回到底部（跨线 → 派发）
    vp.dispatchEvent(new Event('scroll'))
    expect(states.at(-1)).toMatchObject({ atBottom: true })
  })

  it('data-scrollable 反射可滚方向（start/end 空格分隔，滚无可滚为空串）', () => {
    const el = mount('<p>m1</p>')
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    vp.scrollTop = 100
    vp.dispatchEvent(new Event('scroll'))
    expect(el.getAttribute('data-scrollable')).toBe('start end')
    vp.scrollTop = 0
    vp.dispatchEvent(new Event('scroll'))
    expect(el.getAttribute('data-scrollable')).toBe('end')
    vp.scrollTop = 600
    vp.dispatchEvent(new Event('scroll'))
    expect(el.getAttribute('data-scrollable')).toBe('start')
  })

  it('auto-scroll（AI 式默认）：读者在底部时新增内容跟随到底；上翻阅读时不打扰', async () => {
    const el = mount('<p>m1</p>', { 'auto-scroll': '' })
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    await raf()
    // 初始到底 → 视为跟随态
    vp.scrollTop = 600
    vp.dispatchEvent(new Event('scroll'))
    // 新行插入（slotchange 信号）且内容长高
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1400 })
    const row = document.createElement('p')
    row.textContent = 'm2'
    el.appendChild(row)
    await raf()
    expect(vp.scrollTop).toBe(1000) // 1400-400

    // 上翻阅读中：不跟随
    vp.scrollTop = 100
    vp.dispatchEvent(new Event('scroll'))
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1800 })
    const row2 = document.createElement('p')
    row2.textContent = 'm3'
    el.appendChild(row2)
    await raf()
    expect(vp.scrollTop).toBe(100)
  })

  it('缺省（AI 式）无 auto-scroll：新增内容不自动跟随', async () => {
    const el = mount('<p>m1</p>')
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    await raf()
    vp.scrollTop = 600
    vp.dispatchEvent(new Event('scroll'))
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1400 })
    el.appendChild(Object.assign(document.createElement('p'), { textContent: 'm2' }))
    await raf()
    expect(vp.scrollTop).toBe(600)
  })

  it('pin-to-bottom（IM 式始终钉底）：无论读者在哪都跟随到底', async () => {
    const el = mount('<p>m1</p>', { 'pin-to-bottom': '' })
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    await raf()
    vp.scrollTop = 100
    vp.dispatchEvent(new Event('scroll'))
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1400 })
    el.appendChild(Object.assign(document.createElement('p'), { textContent: 'm2' }))
    await raf()
    expect(vp.scrollTop).toBe(1000)
  })

  it('prepend 保位基础：顶部插入更早消息后 scrollTop 补偿高度差（默认开）', async () => {
    const el = mount('<p>newer</p>', { 'default-position': 'start' })
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    const p1 = el.children[0]!
    stubGeometry(el, [{ node: p1, y: 0 }])
    await raf()
    await raf()
    vp.scrollTop = 500
    vp.dispatchEvent(new Event('scroll'))
    // 顶部插入 300px 高的历史
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1300 })
    const older = document.createElement('p')
    older.textContent = 'older'
    el.insertBefore(older, p1)
    stubGeometry(el, [{ node: p1, y: 300 }])
    await raf()
    expect(vp.scrollTop).toBe(800) // 500 + 300
  })

  it('prepend 保位基础：已装载后滚到顶部（scrollTop=0）再插入历史也补偿；首次装载不补偿', async () => {
    const el = mount('<p>newer</p>', { 'default-position': 'start' })
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    const p1 = el.children[0]!
    stubGeometry(el, [{ node: p1, y: 0 }])
    await raf()
    await raf()
    // 首次内容装载：首节点从无到有，不得补偿（否则 scrollTop 被顶到整段高度跳底）
    expect(vp.scrollTop, '首次装载不补偿').toBe(0)
    // 读者停在顶部后插入更早历史
    vp.scrollTop = 0
    vp.dispatchEvent(new Event('scroll'))
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1300 })
    const older = document.createElement('p')
    older.textContent = 'older'
    el.insertBefore(older, p1)
    stubGeometry(el, [{ node: p1, y: 300 }])
    await raf()
    expect(vp.scrollTop, '顶部插入历史补偿高度差，阅读位置不跳').toBe(300)
  })

  it('preserve-scroll-on-prepend="false" 关闭保位补偿', async () => {
    const el = mount('<p>newer</p>', { 'default-position': 'start', 'preserve-scroll-on-prepend': 'false' })
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    const p1 = el.children[0]!
    stubGeometry(el, [{ node: p1, y: 0 }])
    await raf()
    await raf()
    vp.scrollTop = 500
    vp.dispatchEvent(new Event('scroll'))
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1300 })
    const older = document.createElement('p')
    older.textContent = 'older'
    el.insertBefore(older, p1)
    stubGeometry(el, [{ node: p1, y: 300 }])
    await raf()
    expect(vp.scrollTop).toBe(500)
  })

  it('跳底按钮：离开底部时可见、到底后隐藏；点击滚到底；可读名称走 locale', async () => {
    const el = mount('<p>m1</p>')
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    const jump = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="button"]')!
    await raf()
    vp.scrollTop = 600
    vp.dispatchEvent(new Event('scroll'))
    expect(jump.hasAttribute('hidden')).toBe(true) // 已在底部
    vp.scrollTop = 100
    vp.dispatchEvent(new Event('scroll'))
    expect(jump.hasAttribute('hidden')).toBe(false)
    expect(jump.getAttribute('aria-label')).toBe('滚动到底部')
    jump.click()
    expect(vp.scrollTop).toBe(600)
  })

  it('slot=button 自定义跳底按钮内容替换内置箭头（显隐仍由组件裁决）', async () => {
    const el = mount('<p>m1</p>')
    const custom = document.createElement('span')
    custom.setAttribute('slot', 'button')
    custom.textContent = '↓'
    el.appendChild(custom)
    await new Promise((r) => setTimeout(r, 0))
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    const jump = el.shadowRoot!.querySelector('[part="button"]')!
    const slot = jump.querySelector<HTMLSlotElement>('slot[name="button"]')!
    expect(slot.assignedNodes()).toContain(custom)
    vp.scrollTop = 100
    vp.dispatchEvent(new Event('scroll'))
    expect(jump.hasAttribute('hidden')).toBe(false)
  })

  it('断开连接清理、重连后滚动监听恢复', async () => {
    const el = mount('<p>m1</p>')
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    const events: unknown[] = []
    el.addEventListener('oas-scroll-state', (e) => events.push(e))
    el.remove()
    document.body.appendChild(el)
    const vp2 = viewportOf(el)
    stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    vp2.scrollTop = 100
    vp2.dispatchEvent(new Event('scroll'))
    expect(events.length).toBeGreaterThan(0)
  })

  it('observedAttributes 覆盖全部公开属性', () => {
    for (const a of [
      'auto-scroll',
      'pin-to-bottom',
      'default-position',
      'edge-threshold',
      'label',
      'preserve-scroll-on-prepend',
    ]) {
      expect(OASMessageScroller.observedAttributes, `缺 ${a}`).toContain(a)
    }
  })

  it('default-position 非法值回退 end', async () => {
    const el = mount('<p>m1</p>', { 'default-position': 'middle' })
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    await raf()
    await raf()
    expect(vp.scrollTop).toBe(600)
  })

  it('读者意图守卫：初始定位应用前用户已滚动则放弃首帧定位（不逆着读者意图移动）', async () => {
    const el = mount('<p>m1</p>')
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    // 首帧 rAF 之前用户先滚动
    vp.scrollTop = 100
    vp.dispatchEvent(new Event('scroll'))
    await raf()
    await raf()
    expect(vp.scrollTop, '初始定位让位于用户滚动').toBe(100)
  })

  // ---------- 第二轮 review 回归：resize 感知 / 首帧广播时序 / 空态 ----------

  it('ResizeObserver 同时观察 content 与 viewport（视口 resize 不再是盲区）', () => {
    const created = installFakeRO()
    const el = mount('<p>m1</p>')
    const ro = created.at(-1)!
    const content = el.shadowRoot!.querySelector('[part="content"]')!
    const vp = viewportOf(el)
    expect(ro.targets, 'content 与 viewport 双目标都被观察').toEqual(expect.arrayContaining([content, vp]))
  })

  it('视口 resize（viewport 尺寸变化回调）刷新边缘状态与跳底按钮显隐', async () => {
    const created = installFakeRO()
    const el = mount('<p>m1</p>')
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    await raf()
    const ro = created.at(-1)!
    expect(el.shadowRoot!.querySelector('[part="button"]')!.hasAttribute('hidden')).toBe(true)

    // 视口变矮：原来贴底（scrollTop=600 满）现在距底超出阈值 → 跳底按钮应显形
    Object.defineProperty(vp, 'clientHeight', { configurable: true, value: 200 })
    vp.scrollTop = 600
    ro.callback([], ro as unknown as ResizeObserver)
    await raf()
    expect(el.shadowRoot!.querySelector('[part="button"]')!.hasAttribute('hidden'), '视口 resize 后状态刷新').toBe(
      false,
    )
    expect(el.getAttribute('data-scrollable')).toBe('start end')
  })

  it('断开连接清理 ResizeObserver（disconnect），重连后重挂', async () => {
    const created = installFakeRO()
    const el = mount('<p>m1</p>')
    await raf()
    const ro = created.at(-1)!
    expect(ro.disconnected).toBe(false)
    el.remove()
    expect(ro.disconnected, '断开连接统一清理 observer').toBe(true)
    document.body.appendChild(el)
    await raf()
    // 重连后重建（cleanup 已置 null → 新实例）且恢复双目标观察
    const ro2 = created.at(-1)!
    expect(ro2).not.toBe(ro)
    expect(ro2.targets.length, '重连后重新 observe content+viewport').toBe(2)
  })

  it('首帧广播：宿主监听晚于元素连接（upgrade 时序）也能收到一次初始态', async () => {
    const el = mount('<p>m1</p>')
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    // 模拟 HTML 声明式用法：元素已连接（upgrade 完成）之后宿主才挂监听
    const states: Array<Record<string, unknown>> = []
    el.addEventListener('oas-scroll-state', (e) => states.push((e as CustomEvent).detail))
    await raf()
    expect(states.length, '首帧（rAF）广播一次初始态（定位后）').toBe(1)
    expect(states[0]).toMatchObject({ atBottom: true, atTop: false, canScrollStart: true, canScrollEnd: false })
    // 初始定位（default-position=end 缺省）已在广播前生效
    expect(vp.scrollTop).toBe(600)
  })

  it('内容不足一屏/空态：恒在底在顶、无可滚方向、跳底按钮隐藏', async () => {
    const empty = mount('')
    const states: Array<Record<string, unknown>> = []
    empty.addEventListener('oas-scroll-state', (e) => states.push((e as CustomEvent).detail))
    await raf()
    expect(empty.getAttribute('data-scrollable')).toBe('')
    expect(empty.shadowRoot!.querySelector('[part="button"]')!.hasAttribute('hidden')).toBe(true)
    const first = states.at(-1) as { atBottom: boolean; atTop: boolean }
    expect(first, '空态首帧广播').toBeDefined()
    expect(first.atBottom).toBe(true)
    expect(first.atTop).toBe(true)

    const short = mount('<p>only one line</p>')
    stubScroll(short, { scrollHeight: 300, clientHeight: 400 })
    await raf()
    await raf()
    expect(short.getAttribute('data-scrollable'), 'scrollHeight < clientHeight 无可滚').toBe('')
    expect(short.shadowRoot!.querySelector('[part="button"]')!.hasAttribute('hidden')).toBe(true)
  })
})

// ---------- B 批：滚动的精确性与会话体验（异步保位锚 / 混合结算 / 首屏防跳 / last-anchor / 轮次锚定） ----------

describe('OASMessageScroller B 批', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  // ---------- 首屏防跳（data-pending-scroll） ----------

  it('首屏防跳：end 打开——连接即在宿主上反射 data-pending-scroll，首帧定位后移除', async () => {
    const el = mount('<p>m1</p>')
    stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    expect(el.hasAttribute('data-pending-scroll'), '定位应用前在场（防未定位帧闪现顶部）').toBe(true)
    await raf()
    expect(el.hasAttribute('data-pending-scroll'), '定位后移除').toBe(false)
    expect(viewportOf(el).scrollTop, '定位在移除前已生效').toBe(600)
  })

  it('首屏防跳：default-position=start 天然定位（scrollTop=0 是初始值），不设 pending', () => {
    const el = mount('<p>m1</p>', { 'default-position': 'start' })
    expect(el.hasAttribute('data-pending-scroll')).toBe(false)
  })

  it('首屏防跳：读者在定位前已滚动（让位）也移除 pending，viewport 不被永久隐藏', async () => {
    const el = mount('<p>m1</p>')
    stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    viewportOf(el).scrollTop = 100
    viewportOf(el).dispatchEvent(new Event('scroll'))
    await raf()
    expect(el.hasAttribute('data-pending-scroll')).toBe(false)
    expect(viewportOf(el).scrollTop).toBe(100)
  })

  it('首屏防跳 CSS 机制：样式表含 :host([data-pending-scroll]) 下 viewport visibility:hidden 规则', () => {
    const el = mount('<p>m1</p>')
    const style = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(style).toContain(':host([data-pending-scroll])')
    expect(style).toContain('visibility: hidden')
  })

  // ---------- default-position=last-anchor 与 scrollToMessage ----------

  it('last-anchor：定位到最后一个 anchor 标记消息顶部；多个锚取最后', async () => {
    const el = mount('<p>a1</p><p anchor>q1</p><p>mid</p><p anchor>q2</p><p>tail</p>', {
      'default-position': 'last-anchor',
    })
    const vp = stubScroll(el, { scrollHeight: 2000, clientHeight: 400 })
    stubGeometry(el, [
      { node: el.children[0]!, y: 0 },
      { node: el.children[1]!, y: 100 },
      { node: el.children[2]!, y: 300 },
      { node: el.children[3]!, y: 900 },
      { node: el.children[4]!, y: 1000 },
    ])
    await raf()
    await raf()
    expect(vp.scrollTop, '最后一个锚（内容 y=900）顶对齐').toBe(900)
  })

  it('last-anchor：无锚点消息时回退 end', async () => {
    const el = mount('<p>m1</p><p>m2</p>', { 'default-position': 'last-anchor' })
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    await raf()
    await raf()
    expect(vp.scrollTop, '无锚点回退 end（600）').toBe(600)
  })

  it('scrollToMessage(id)：滚到对应 message-id 元素顶返回 true；未知 id 返回 false 且不滚动', async () => {
    const el = mount('<p message-id="m1">a</p><p message-id="m2">b</p>')
    const vp = stubScroll(el, { scrollHeight: 2000, clientHeight: 400 })
    stubGeometry(el, [
      { node: el.children[0]!, y: 0 },
      { node: el.children[1]!, y: 700 },
    ])
    await raf()
    await raf()
    expect(el.scrollToMessage('m2', { behavior: 'instant' })).toBe(true)
    expect(vp.scrollTop).toBe(700)
    expect(el.scrollToMessage('nope', { behavior: 'instant' })).toBe(false)
    expect(vp.scrollTop, '未知 id 不动').toBe(700)
  })

  // ---------- prepend 异步资源保位（锚点追踪） ----------

  it('prepend 保位锚：插入历史后异步资源撑高（RO 通道）按锚点视口位移补偿', async () => {
    const created = installFakeRO()
    const el = mount('<p>newer</p>', { 'default-position': 'start' })
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    const p1 = el.children[0]!
    stubGeometry(el, [{ node: p1, y: 0 }])
    await raf()
    await raf()
    vp.scrollTop = 500
    vp.dispatchEvent(new Event('scroll'))
    // prepend 300px 历史（p1 被顶到内容 y=300，补偿后 scrollTop=800，p1 视口 y=-500）
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1300 })
    const older = document.createElement('p')
    el.insertBefore(older, p1)
    stubGeometry(el, [{ node: p1, y: 300 }])
    await raf()
    await raf()
    expect(vp.scrollTop, 'prepend 补偿基础').toBe(800)
    // 模拟历史内图片加载撑高上方内容 300px（p1 被顶到 y=600）
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1600 })
    stubGeometry(el, [{ node: p1, y: 600 }])
    const ro = created.at(-1)!
    ro.callback([], ro as unknown as ResizeObserver)
    await raf()
    expect(vp.scrollTop, '锚点视口位置保持（-500 不变 → scrollTop+300）').toBe(1100)
  })

  it('prepend 保位锚：stable message-id 优先——锚行被宿主替换后按 id 重查继续保位', async () => {
    const created = installFakeRO()
    const el = mount('<p message-id="m1">newer</p>', { 'default-position': 'start' })
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    const p1 = el.children[0]!
    stubGeometry(el, [{ node: p1, y: 0 }])
    await raf()
    await raf()
    vp.scrollTop = 500
    vp.dispatchEvent(new Event('scroll'))
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1300 })
    const older = document.createElement('p')
    el.insertBefore(older, p1)
    stubGeometry(el, [{ node: p1, y: 300 }])
    await raf()
    await raf()
    expect(vp.scrollTop).toBe(800)
    // 宿主重建锚行（同 id 新元素替换旧节点）
    const p2 = document.createElement('p')
    p2.setAttribute('message-id', 'm1')
    el.replaceChild(p2, p1)
    // 异步撑高 300px
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1600 })
    stubGeometry(el, [{ node: p2, y: 600 }])
    const ro = created.at(-1)!
    ro.callback([], ro as unknown as ResizeObserver)
    await raf()
    expect(vp.scrollTop, '按 message-id 重查锚点继续补偿').toBe(1100)
  })

  it('prepend 保位锚：读者真实滚动释放锚（后续撑高不再补偿）', async () => {
    const created = installFakeRO()
    const el = mount('<p>newer</p>', { 'default-position': 'start' })
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    const p1 = el.children[0]!
    stubGeometry(el, [{ node: p1, y: 0 }])
    await raf()
    await raf()
    vp.scrollTop = 500
    vp.dispatchEvent(new Event('scroll'))
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1300 })
    const older = document.createElement('p')
    el.insertBefore(older, p1)
    stubGeometry(el, [{ node: p1, y: 300 }])
    await raf()
    await raf()
    expect(vp.scrollTop).toBe(800)
    // 读者接管：真实滚动到 400
    vp.scrollTop = 400
    vp.dispatchEvent(new Event('scroll'))
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1600 })
    stubGeometry(el, [{ node: p1, y: 600 }])
    const ro = created.at(-1)!
    ro.callback([], ro as unknown as ResizeObserver)
    await raf()
    expect(vp.scrollTop, '锚已释放，不再补偿').toBe(400)
  })

  it('程序滚动回声：保位补偿自身触发的 scroll 事件不当读者意图（不释放锚）', async () => {
    const created = installFakeRO()
    const el = mount('<p>newer</p>', { 'default-position': 'start' })
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    const p1 = el.children[0]!
    stubGeometry(el, [{ node: p1, y: 0 }])
    await raf()
    await raf()
    vp.scrollTop = 500
    vp.dispatchEvent(new Event('scroll'))
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1300 })
    const older = document.createElement('p')
    el.insertBefore(older, p1)
    stubGeometry(el, [{ node: p1, y: 300 }])
    await raf()
    await raf()
    expect(vp.scrollTop).toBe(800)
    // 浏览器对程序 scrollTop 赋值会异步派发 scroll——happy-dom 手动补一次回声
    vp.dispatchEvent(new Event('scroll'))
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1600 })
    stubGeometry(el, [{ node: p1, y: 600 }])
    const ro = created.at(-1)!
    ro.callback([], ro as unknown as ResizeObserver)
    await raf()
    expect(vp.scrollTop, '回声未释放锚，补偿照常').toBe(1100)
  })

  it('prepend 保位锚：preserve-scroll-on-prepend="false" 时不设锚（撑高不补偿）', async () => {
    const created = installFakeRO()
    const el = mount('<p>newer</p>', { 'default-position': 'start', 'preserve-scroll-on-prepend': 'false' })
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    const p1 = el.children[0]!
    stubGeometry(el, [{ node: p1, y: 0 }])
    await raf()
    await raf()
    vp.scrollTop = 500
    vp.dispatchEvent(new Event('scroll'))
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1300 })
    const older = document.createElement('p')
    el.insertBefore(older, p1)
    stubGeometry(el, [{ node: p1, y: 300 }])
    await raf()
    await raf()
    expect(vp.scrollTop).toBe(500)
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1600 })
    stubGeometry(el, [{ node: p1, y: 600 }])
    const ro = created.at(-1)!
    ro.callback([], ro as unknown as ResizeObserver)
    await raf()
    expect(vp.scrollTop, '关闭保位 → 无锚 → 不补偿').toBe(500)
  })

  // ---------- 同帧 append+prepend 混合结算 ----------

  it('混合插入：同帧 prepend 历史 + append 新消息，补偿只结算顶部插入量（不多补底部追加）', async () => {
    const el = mount('<p>newer</p>', { 'default-position': 'start' })
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    const p1 = el.children[0]!
    stubGeometry(el, [{ node: p1, y: 0 }])
    await raf()
    await raf()
    vp.scrollTop = 500
    vp.dispatchEvent(new Event('scroll'))
    // 同帧：顶部插 300px 历史 + 底部追加（总高 +700 = 顶 300 + 底 400）
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1700 })
    const older = document.createElement('p')
    el.insertBefore(older, p1)
    const newer = document.createElement('p')
    el.appendChild(newer)
    stubGeometry(el, [{ node: p1, y: 300 }])
    await raf()
    expect(vp.scrollTop, '只补顶部 300（500+300），底部追加的 400 不参与补偿').toBe(800)
  })

  it('混合插入 + auto-scroll 底部跟随：读者在底部时先结算 prepend、钉底后发覆盖', async () => {
    const el = mount('<p>m1</p>', { 'auto-scroll': '' })
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    const p1 = el.children[0]!
    stubGeometry(el, [{ node: p1, y: 0 }])
    await raf()
    // 同帧混合插入
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1700 })
    const older = document.createElement('p')
    el.insertBefore(older, p1)
    const newer = document.createElement('p')
    el.appendChild(newer)
    stubGeometry(el, [{ node: p1, y: 300 }])
    await raf()
    expect(vp.scrollTop, '底部跟随（1700-400）').toBe(1300)
  })

  // ---------- 轮次锚定（turn-anchor + prev-peek） ----------

  it('turn-anchor：锚贴顶时内容增长保持锚顶对齐（锚定在视口顶 prev-peek 处）', async () => {
    const el = mount('<p>a1</p><p anchor>q1</p><p>ans1</p>', { 'turn-anchor': '' })
    const vp = stubScroll(el, { scrollHeight: 2000, clientHeight: 400 })
    const q1 = el.children[1]!
    stubGeometry(el, [
      { node: el.children[0]!, y: 0 },
      { node: q1, y: 100 },
      { node: el.children[2]!, y: 200 },
    ])
    await raf()
    await raf()
    // 读者滚到锚定位置（锚视口 y = prev-peek 64）
    vp.scrollTop = 100 - 64
    vp.dispatchEvent(new Event('scroll'))
    // 回答流式增长（append 行，无锚点行）
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 2400 })
    el.appendChild(document.createElement('p'))
    await raf()
    expect(vp.scrollTop, '锚顶对齐保持（contentY(q1)=100 - peek 64 = 36）').toBe(36)
  })

  it('turn-anchor：锚顶跟随中上方插入历史，锚点被顶下后对齐修正', async () => {
    const el = mount('<p>a1</p><p anchor>q1</p>', { 'turn-anchor': '' })
    const vp = stubScroll(el, { scrollHeight: 2000, clientHeight: 400 })
    const [a1, q1] = [el.children[0]!, el.children[1]!]
    stubGeometry(el, [
      { node: a1, y: 0 },
      { node: q1, y: 100 },
    ])
    await raf()
    await raf()
    vp.scrollTop = 36 // 锚定位置（100 - 64）
    vp.dispatchEvent(new Event('scroll'))
    // prepend 200px 历史：q1 内容 y 100→300；prepend 补偿后 scrollTop=236，锚视口 y=64 → 对齐幂等保持
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 2200 })
    const older = document.createElement('p')
    el.insertBefore(older, a1)
    stubGeometry(el, [
      { node: a1, y: 200 },
      { node: q1, y: 300 },
    ])
    await raf()
    expect(vp.scrollTop, 'prepend 补偿 + 锚顶对齐保持（36+200）').toBe(236)
  })

  it('turn-anchor：读者在底部时新锚到来，定型贴底跟随（bottom 模式）', async () => {
    const el = mount('<p>a1</p><p anchor>q1</p><p>ans…</p>', { 'turn-anchor': '' })
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    stubGeometry(el, [
      { node: el.children[0]!, y: 0 },
      { node: el.children[1]!, y: 50 },
      { node: el.children[2]!, y: 100 },
    ])
    await raf()
    // 读者在底（首帧 end 定位后 600）
    // 新一轮：append 新锚 + 回答，内容撑高
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1600 })
    const q2 = document.createElement('p')
    q2.setAttribute('anchor', '')
    el.appendChild(q2)
    el.appendChild(document.createElement('p'))
    stubGeometry(el, [
      { node: el.children[0]!, y: 0 },
      { node: el.children[1]!, y: 50 },
      { node: el.children[2]!, y: 100 },
      { node: q2, y: 1100 },
    ])
    await raf()
    expect(vp.scrollTop, '贴底跟随（1600-400）——新轮次从底部流入视野').toBe(1200)
  })

  it('turn-anchor：读者上翻历史区（锚离顶离底）内容增长静止', async () => {
    const el = mount('<p>a1</p><p anchor>q1</p><p>ans</p>', { 'turn-anchor': '' })
    const vp = stubScroll(el, { scrollHeight: 2000, clientHeight: 400 })
    const q1 = el.children[1]!
    stubGeometry(el, [
      { node: el.children[0]!, y: 0 },
      { node: q1, y: 100 },
      { node: el.children[2]!, y: 200 },
    ])
    await raf()
    await raf()
    // 上翻到顶部（锚视口 y=100，不在顶窗口也不在 peek 窗口）
    vp.scrollTop = 0
    vp.dispatchEvent(new Event('scroll'))
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 2400 })
    el.appendChild(document.createElement('p'))
    await raf()
    expect(vp.scrollTop, '读者接管，不拉回').toBe(0)
  })

  it('turn-anchor：无锚点回退钉底', async () => {
    const el = mount('<p>m1</p>', { 'turn-anchor': '' })
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    await raf()
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1400 })
    el.appendChild(Object.assign(document.createElement('p'), { textContent: 'm2' }))
    await raf()
    expect(vp.scrollTop, '无锚回退钉底').toBe(1000)
  })

  it('turn-anchor：prev-peek 自定义值生效（对齐在锚顶上方 peek px 处）', async () => {
    const el = mount('<p>a1</p><p anchor>q1</p>', { 'turn-anchor': '', 'prev-peek': '20' })
    const vp = stubScroll(el, { scrollHeight: 2000, clientHeight: 400 })
    const q1 = el.children[1]!
    stubGeometry(el, [
      { node: el.children[0]!, y: 0 },
      { node: q1, y: 100 },
    ])
    await raf()
    await raf()
    vp.scrollTop = 80 // 锚视口 y=20（自定义 peek 位置）
    vp.dispatchEvent(new Event('scroll'))
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 2400 })
    el.appendChild(document.createElement('p'))
    await raf()
    expect(vp.scrollTop, '对齐 contentY(q1)-20=80（保持）').toBe(80)
  })

  it('回底后零位移的过期 scroll 事件不释放跟随（原生事件异步到达时几何已被追加更新）', async () => {
    const el = mount('<p>m1</p>', { 'auto-scroll': '' })
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    await raf()
    // 铺垫 + 上翻接管
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1400 })
    el.appendChild(Object.assign(document.createElement('p'), { textContent: '铺垫' }))
    await raf()
    vp.scrollTop = 100
    vp.dispatchEvent(new Event('scroll'))
    // 回底（真实位移 → following 恢复）
    vp.scrollTop = 1000
    vp.dispatchEvent(new Event('scroll'))
    // 立即追加一行（gap=436）——回底写入的「原生 scroll 事件」此刻才异步到达：scrollTop 无位移，
    // 但几何已含新行（过期快照若参与重判会把 following 错误置 false）
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1436 })
    el.appendChild(Object.assign(document.createElement('p'), { textContent: '回底后立即追加' }))
    vp.dispatchEvent(new Event('scroll')) // 零位移的过期事件
    // 再追加：跟随必须仍在（钉底），证明过期事件没有释放 following
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1872 })
    el.appendChild(Object.assign(document.createElement('p'), { textContent: '再追加' }))
    await raf()
    expect(vp.scrollTop, '过期 scroll 事件未释放跟随，追加仍钉底（1472=1872-400）').toBe(1472)
  })

  it('observedAttributes 覆盖 B 批新增属性（turn-anchor / prev-peek）', () => {
    expect(OASMessageScroller.observedAttributes).toContain('turn-anchor')
    expect(OASMessageScroller.observedAttributes).toContain('prev-peek')
  })

  // ---------- 可见性通道（visibleMessageIds / currentAnchorId / oas-visible-change） ----------

  const rectH = (top: number, height: number): DOMRect =>
    ({
      top,
      bottom: top + height,
      left: 0,
      right: 0,
      width: 0,
      height,
      x: 0,
      y: top,
      toJSON: () => {},
    }) as unknown as DOMRect

  /** 桩化可见性几何：viewport 顶为 0，行盒按内容坐标 y + 高度 h 随 scrollTop 平移 */
  function stubVisible(el: OASMessageScroller, rows: Array<{ y: number; h: number }>): void {
    const vp = viewportOf(el)
    vp.getBoundingClientRect = () => makeRect(0)
    el.shadowRoot!.querySelector('[part="content"]')!.getBoundingClientRect = () => makeRect(-vp.scrollTop)
    rows.forEach((r, i) => {
      el.children[i]!.getBoundingClientRect = () => rectH(r.y - vp.scrollTop, r.h)
    })
  }

  it('visibleMessageIds / currentAnchorId getter：按需计算（无需 track-visible）', () => {
    const el = mount('<p message-id="m1" anchor>q</p><p message-id="m2">a</p><p message-id="m3">b</p>')
    stubScroll(el, { scrollHeight: 1000, clientHeight: 100 })
    stubVisible(el, [
      { y: 0, h: 40 },
      { y: 60, h: 40 },
      { y: 120, h: 40 },
    ])
    // 视口 0–100：m1(0–40)、m2(60–100) 相交；m3(120) 不在
    expect(el.visibleMessageIds).toEqual(['m1', 'm2'])
    // 当前锚点 = 最后一个 top ≤ 8 的 anchor 行
    expect(el.currentAnchorId).toBe('m1')
  })

  it('currentAnchorId：随滚动跟随最后一个视口顶附近的 anchor 行（轮次跟踪）', () => {
    const el = mount('<p message-id="a1" anchor>q1</p><p message-id="a2" anchor>q2</p><p message-id="a3">a</p>')
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 100 })
    stubVisible(el, [
      { y: 0, h: 40 },
      { y: 50, h: 40 },
      { y: 100, h: 40 },
    ])
    expect(el.currentAnchorId, 'a1 顶在视口顶（a2 在 50px，超出阈值）').toBe('a1')
    vp.scrollTop = 55 // a2 顶=-5 ≤ 8 → 当前锚点前移
    expect(el.currentAnchorId).toBe('a2')
  })

  it('track-visible：可见集变化时派发 oas-visible-change（detail 含 visibleMessageIds/currentAnchorId）', async () => {
    const el = mount('<p message-id="m1" anchor>q</p><p message-id="m2">a</p>', {
      'track-visible': '',
      'default-position': 'start',
    })
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 100 })
    stubVisible(el, [
      { y: 0, h: 40 },
      { y: 60, h: 40 },
    ])
    await raf()
    const seen: Array<Record<string, unknown>> = []
    el.addEventListener('oas-visible-change', (e) => seen.push((e as CustomEvent).detail))
    vp.scrollTop = 50
    vp.dispatchEvent(new Event('scroll'))
    expect(seen.length).toBeGreaterThanOrEqual(1)
    expect(seen.at(-1)).toEqual({ visibleMessageIds: ['m2'], currentAnchorId: 'm1' })
  })

  it('未开启 track-visible 时不派发 oas-visible-change（pay-for-use，零计算）', async () => {
    const el = mount('<p message-id="m1">q</p><p message-id="m2">a</p>', { 'default-position': 'start' })
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 100 })
    stubVisible(el, [
      { y: 0, h: 40 },
      { y: 60, h: 40 },
    ])
    await raf()
    let fired = 0
    el.addEventListener('oas-visible-change', () => fired++)
    vp.scrollTop = 50
    vp.dispatchEvent(new Event('scroll'))
    expect(fired).toBe(0)
  })

  it('observedAttributes 声明 track-visible', () => {
    expect(OASMessageScroller.observedAttributes).toContain('track-visible')
  })
})
