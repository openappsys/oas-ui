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
    await raf()
    await raf()
    vp.scrollTop = 500
    vp.dispatchEvent(new Event('scroll'))
    // 顶部插入 300px 高的历史
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1300 })
    const older = document.createElement('p')
    older.textContent = 'older'
    el.insertBefore(older, el.firstChild)
    await raf()
    expect(vp.scrollTop).toBe(800) // 500 + 300
  })

  it('prepend 保位基础：已装载后滚到顶部（scrollTop=0）再插入历史也补偿；首次装载不补偿', async () => {
    const el = mount('<p>newer</p>', { 'default-position': 'start' })
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
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
    el.insertBefore(older, el.firstChild)
    await raf()
    expect(vp.scrollTop, '顶部插入历史补偿高度差，阅读位置不跳').toBe(300)
  })

  it('preserve-scroll-on-prepend="false" 关闭保位补偿', async () => {
    const el = mount('<p>newer</p>', { 'default-position': 'start', 'preserve-scroll-on-prepend': 'false' })
    const vp = stubScroll(el, { scrollHeight: 1000, clientHeight: 400 })
    await raf()
    await raf()
    vp.scrollTop = 500
    vp.dispatchEvent(new Event('scroll'))
    Object.defineProperty(vp, 'scrollHeight', { configurable: true, value: 1300 })
    el.insertBefore(Object.assign(document.createElement('p'), { textContent: 'older' }), el.firstChild)
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
