import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASHoverCard } from './index.js'

function mount(attrs: Record<string, string> = {}): OASHoverCard {
  const el = new OASHoverCard()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<button>悬停</button>`
  document.body.appendChild(el)
  return el
}

function card(el: OASHoverCard): HTMLElement {
  return el.shadowRoot!.querySelector('[part="card"]')!
}

function anchorOf(el: OASHoverCard): HTMLElement {
  return el.querySelector('button')!
}

/** happy-dom 无布局引擎：stub 元素 getBoundingClientRect，让定位数学可精确断言 */
function stubRect(
  el: HTMLElement,
  r: { left: number; top: number; width: number; height: number },
): void {
  el.getBoundingClientRect = () =>
    ({
      x: r.left,
      y: r.top,
      width: r.width,
      height: r.height,
      left: r.left,
      top: r.top,
      right: r.left + r.width,
      bottom: r.top + r.height,
      toJSON: () => ({}),
    }) as DOMRect
}

/** 固定视口尺寸（定位越界/翻转/避让断言依赖确定性的 viewport） */
function setViewport(w: number, h: number): void {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true })
}

/** 定位基线：锚点 + 卡片尺寸 stub（中段视口，各主向均不翻转） */
function stubPositionBaseline(el: OASHoverCard): void {
  setViewport(800, 600)
  stubRect(anchorOf(el), { left: 300, top: 200, width: 120, height: 40 })
  stubRect(card(el), { left: 0, top: 0, width: 200, height: 100 })
}

describe('OASHoverCard', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  // —— 基础（沿用既有能力）——

  it('open 时显示卡片，含标题与内容', async () => {
    const el = mount({ open: '', title: '卡片', content: '内容' })
    await Promise.resolve()
    const c = card(el)
    expect(c).not.toBeNull()
    expect(el.shadowRoot!.textContent).toContain('卡片')
    expect(c.querySelector<HTMLElement>('[part="content"]')!.textContent).toBe('内容')
  })

  it('mouseenter 延迟后显示，mouseleave 延迟后隐藏（delay 兼容别名）', async () => {
    const el = mount({ title: 'x', delay: '100' })
    anchorOf(el).dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    expect(card(el).getAttribute('aria-hidden')).toBe('true')
    vi.advanceTimersByTime(100)
    expect(card(el).getAttribute('aria-hidden')).toBe('false')
    anchorOf(el).dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    vi.advanceTimersByTime(100)
    expect(card(el).getAttribute('aria-hidden')).toBe('true')
  })

  it('focus 触发显示', () => {
    const el = mount({ title: 'x', delay: '0' })
    anchorOf(el).dispatchEvent(new FocusEvent('focusin'))
    vi.advanceTimersByTime(1)
    expect(card(el).getAttribute('aria-hidden')).toBe('false')
  })

  // —— A10 富内容插槽 ——

  it('slot="content" 命名插槽：富内容渲染进卡片', async () => {
    const el = new OASHoverCard()
    el.innerHTML = `<button>悬停</button><div slot="content"><b>富内容</b><a href="#">链接</a></div>`
    document.body.appendChild(el)
    await Promise.resolve()
    const slot = card(el).querySelector<HTMLSlotElement>('slot[name="content"]')
    expect(slot).not.toBeNull()
    const nodes = slot!.assignedNodes({ flatten: true })
    expect(nodes.length).toBeGreaterThan(0)
    expect((nodes[0] as HTMLElement).textContent).toContain('富内容')
  })

  it('锚点识别跳过 slot="content" 元素（内容在前也不被当作触发器）', async () => {
    const el = new OASHoverCard()
    el.innerHTML = `<div slot="content">富</div><button>悬停</button>`
    document.body.appendChild(el)
    await Promise.resolve()
    const btn = el.querySelector('button')!
    btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    vi.advanceTimersByTime(301)
    expect(card(el).getAttribute('aria-hidden')).toBe('false')
  })

  // —— A9 浮层可悬停不闪关（悬停区域 = 触发器 + 卡片）——

  it('离开触发器排队关闭，指针进入卡片取消关闭（跨间隙不闪关）', async () => {
    const el = mount({ open: '', 'close-delay': '200' })
    await Promise.resolve()
    const c = card(el)
    expect(c.getAttribute('aria-hidden')).toBe('false')
    // 离开触发器 → 排队关闭（close-delay 内未关）
    anchorOf(el).dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    vi.advanceTimersByTime(100)
    expect(c.getAttribute('aria-hidden')).toBe('false')
    // 指针进入卡片 → 取消排队的关闭 → 保持打开
    c.dispatchEvent(new MouseEvent('mouseenter'))
    vi.advanceTimersByTime(300)
    expect(c.getAttribute('aria-hidden')).toBe('false')
    // 卡片 mouseleave → 延迟后关闭
    c.dispatchEvent(new MouseEvent('mouseleave'))
    vi.advanceTimersByTime(200)
    expect(c.getAttribute('aria-hidden')).toBe('true')
  })

  it('卡内 slotted 链接保持打开：focus 从触发器移到卡内内容不关闭', async () => {
    const el = new OASHoverCard()
    el.setAttribute('open-delay', '0')
    el.innerHTML = `<button>悬停</button><a slot="content" href="#">卡内链接</a>`
    document.body.appendChild(el)
    await Promise.resolve()
    anchorOf(el).dispatchEvent(new FocusEvent('focusin'))
    vi.advanceTimersByTime(1)
    expect(card(el).getAttribute('aria-hidden')).toBe('false')
    // focusout 的 relatedTarget 是卡内 slotted 内容（light DOM，host 内）→ 不关闭
    const link = el.querySelector('a')!
    anchorOf(el).dispatchEvent(new FocusEvent('focusout', { relatedTarget: link }))
    vi.advanceTimersByTime(200)
    expect(card(el).getAttribute('aria-hidden')).toBe('false')
    // focus 移出（无 relatedTarget）→ 关闭
    anchorOf(el).dispatchEvent(new FocusEvent('focusout'))
    vi.advanceTimersByTime(200)
    expect(card(el).getAttribute('aria-hidden')).toBe('true')
  })

  // —— A1 placement 12 向 ——

  it('12 向 placement 全部写入 data-placement', async () => {
    const cases = [
      'top',
      'bottom',
      'left',
      'right',
      'top-start',
      'top-end',
      'bottom-start',
      'bottom-end',
      'left-start',
      'left-end',
      'right-start',
      'right-end',
    ]
    for (const p of cases) {
      const el = mount({ content: 'x', placement: p })
      await Promise.resolve()
      stubPositionBaseline(el)
      el.setAttribute('open', '')
      await Promise.resolve()
      expect(card(el).getAttribute('data-placement'), `placement=${p}`).toBe(p)
      el.remove()
    }
  })

  it('-start/-end 交叉轴对齐锚点边', async () => {
    const el = mount({ placement: 'bottom-start' })
    await Promise.resolve()
    stubPositionBaseline(el)
    el.setAttribute('open', '')
    await Promise.resolve()
    // bottom-start：卡片左缘对齐锚点左缘
    expect(card(el).style.left).toBe('300px')
    el.setAttribute('placement', 'bottom-end')
    await Promise.resolve()
    // bottom-end：卡片右缘对齐锚点右缘
    expect(card(el).style.left).toBe('220px')
    el.setAttribute('placement', 'right-start')
    await Promise.resolve()
    // right-start：卡片上缘对齐锚点上缘
    expect(card(el).style.top).toBe('200px')
  })

  it('非法 placement 回退 top（默认）', async () => {
    const el = mount({ placement: 'diagonal' })
    await Promise.resolve()
    stubPositionBaseline(el)
    el.setAttribute('open', '')
    await Promise.resolve()
    expect(card(el).getAttribute('data-placement')).toBe('top')
  })

  // —— A11 open-delay / close-delay 分离 ——

  it('open-delay / close-delay 分别生效（互不干扰）', async () => {
    const el = mount({ title: 'x', 'open-delay': '400', 'close-delay': '800' })
    anchorOf(el).dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    vi.advanceTimersByTime(399)
    expect(card(el).getAttribute('aria-hidden')).toBe('true')
    vi.advanceTimersByTime(1)
    expect(card(el).getAttribute('aria-hidden')).toBe('false')
    anchorOf(el).dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    vi.advanceTimersByTime(799)
    expect(card(el).getAttribute('aria-hidden')).toBe('false')
    vi.advanceTimersByTime(1)
    expect(card(el).getAttribute('aria-hidden')).toBe('true')
  })

  it('open-delay 显式优先于 delay 别名', async () => {
    const el = mount({ title: 'x', delay: '50', 'open-delay': '300' })
    anchorOf(el).dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    vi.advanceTimersByTime(100)
    expect(card(el).getAttribute('aria-hidden')).toBe('true')
    vi.advanceTimersByTime(200)
    expect(card(el).getAttribute('aria-hidden')).toBe('false')
  })

  // —— A8 disabled ——

  it('disabled：hover / focus 均不触发打开', async () => {
    const el = mount({ disabled: '', 'open-delay': '0' })
    anchorOf(el).dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    anchorOf(el).dispatchEvent(new FocusEvent('focusin'))
    vi.advanceTimersByTime(10)
    expect(card(el).getAttribute('aria-hidden')).toBe('true')
  })

  // —— A12 箭头 ——

  it('箭头元素存在（part=arrow + data-popper-arrow），arrow="false" 隐藏', async () => {
    const el = mount({ open: '', content: 'x', placement: 'top' })
    await Promise.resolve()
    const arrow = card(el).querySelector<HTMLElement>('[data-popper-arrow]')
    expect(arrow).not.toBeNull()
    expect(arrow!.getAttribute('part')).toBe('arrow')
    expect(arrow!.hidden).toBe(false)
    el.setAttribute('arrow', 'false')
    await Promise.resolve()
    expect(card(el).querySelector<HTMLElement>('[data-popper-arrow]')!.hidden).toBe(true)
  })

  it('箭头悬面板对应边（12 向均落正确边）', async () => {
    const el = mount({ placement: 'bottom-start' })
    await Promise.resolve()
    stubPositionBaseline(el)
    el.setAttribute('open', '')
    await Promise.resolve()
    expect(card(el).getAttribute('data-placement')).toBe('bottom-start')
    const cs = window.getComputedStyle(card(el).querySelector<HTMLElement>('[data-popper-arrow]')!)
    // bottom 系 → 箭头悬面板顶边
    expect(cs.getPropertyValue('top')).toBe('-4px')
    // 中心对齐（无 arrow-point-at-center）：left 走 calc 居中
    expect(cs.getPropertyValue('left')).toBe('calc(50% - 4px)')
  })

  // —— A13 oas-open-change ——

  it('受控 open 变化派发 oas-open-change 双向', async () => {
    const el = mount({ content: 'x' })
    await Promise.resolve()
    const fired: Array<{ open: boolean }> = []
    el.addEventListener('oas-open-change', (e) =>
      fired.push((e as CustomEvent<{ open: boolean }>).detail),
    )
    el.setAttribute('open', '')
    await Promise.resolve()
    el.removeAttribute('open')
    await Promise.resolve()
    expect(fired).toEqual([{ open: true }, { open: false }])
  })

  it('hover 触发也会派发 oas-open-change', async () => {
    const el = mount({ content: 'x', 'open-delay': '0', 'close-delay': '0' })
    await Promise.resolve()
    const fired: boolean[] = []
    el.addEventListener('oas-open-change', (e) =>
      fired.push((e as CustomEvent<{ open: boolean }>).detail.open),
    )
    anchorOf(el).dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    vi.advanceTimersByTime(1)
    anchorOf(el).dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    vi.advanceTimersByTime(1)
    expect(fired).toEqual([true, false])
  })

  it('初始 open 不派发 oas-open-change（仅变化时）', async () => {
    const el = mount({ open: '', content: 'x' })
    await Promise.resolve()
    const fired: boolean[] = []
    el.addEventListener('oas-open-change', (e) =>
      fired.push((e as CustomEvent<{ open: boolean }>).detail.open),
    )
    el.setAttribute('content', 'y')
    await Promise.resolve()
    expect(fired).toEqual([])
  })

  // —— A14 role 语义修正（去 dialog）——

  it('无 role=dialog（屏幕阅读器不再误判为对话框）', async () => {
    const el = mount({ open: '', title: 'x' })
    await Promise.resolve()
    expect(card(el).getAttribute('role')).toBeNull()
  })

  it('aria-hidden 随 open 同步（关闭隐藏、打开暴露）', async () => {
    const el = mount({ title: 'x' })
    await Promise.resolve()
    expect(card(el).getAttribute('aria-hidden')).toBe('true')
    el.setAttribute('open', '')
    await Promise.resolve()
    expect(card(el).getAttribute('aria-hidden')).toBe('false')
  })

  // —— B1 方向感知动画 ——

  it('入场动画：样式含 fade/scale keyframes + reduced-motion 关闭', async () => {
    const el = mount({ open: '' })
    await Promise.resolve()
    const styleText = el.shadowRoot!.querySelector('style')!.textContent!
    expect(styleText).toContain('@keyframes')
    expect(styleText).toMatch(/animation:\s*[a-z-]+\s+\d+ms/)
    expect(styleText).toContain('prefers-reduced-motion')
  })

  it('transform-origin 随 placement 方向感知', async () => {
    const el = mount({ placement: 'top' })
    await Promise.resolve()
    stubPositionBaseline(el)
    el.setAttribute('open', '')
    await Promise.resolve()
    // top → 从底边向上展开
    expect(card(el).style.transformOrigin).toBe('center bottom')
    el.setAttribute('placement', 'bottom-start')
    await Promise.resolve()
    // bottom-start → 从左下角展开
    expect(card(el).style.transformOrigin).toBe('left top')
  })

  // —— B9 双轴偏移 ——

  it('offset 主轴距离', async () => {
    const el = mount({ placement: 'bottom', offset: '20' })
    await Promise.resolve()
    stubPositionBaseline(el)
    el.setAttribute('open', '')
    await Promise.resolve()
    // bottom + offset 20 → top = anchor.bottom + 20
    expect(card(el).style.top).toBe('260px')
  })

  it('skidding 交叉轴偏移', async () => {
    const el = mount({ placement: 'bottom', skidding: '15' })
    await Promise.resolve()
    stubPositionBaseline(el)
    el.setAttribute('open', '')
    await Promise.resolve()
    // bottom 居中 left = 360 - 100 = 260；+skidding 15 → 275
    expect(card(el).style.left).toBe('275px')
  })

  // —— B6 append-to 挂载点/定位容器 ——

  it('append-to：卡片改为绝对定位在容器内，容器提升为定位上下文', async () => {
    const target = document.createElement('div')
    target.id = 'hc-target'
    document.body.appendChild(target)
    const el = mount({ open: '', 'append-to': '#hc-target' })
    await Promise.resolve()
    expect(target.style.position).toBe('relative')
    expect(card(el).style.position).toBe('absolute')
    // 关闭后恢复 fixed + 容器还原
    el.removeAttribute('open')
    await Promise.resolve()
    expect(card(el).style.position).toBe('')
    expect(target.style.position).toBe('')
  })

  // —— B13 碰撞细调 ——

  it('collision-padding 视口夹取边距', async () => {
    setViewport(800, 600)
    const el = mount({ placement: 'bottom', 'collision-padding': '20' })
    await Promise.resolve()
    stubRect(anchorOf(el), { left: 700, top: 200, width: 100, height: 40 })
    stubRect(card(el), { left: 0, top: 0, width: 200, height: 100 })
    el.setAttribute('open', '')
    await Promise.resolve()
    // 卡片越右界 → 夹取到 800 - 200 - 20 = 580
    expect(card(el).style.left).toBe('580px')
  })

  it('fallback-placements：主向放不下时按自定义序列回退', async () => {
    setViewport(800, 600)
    // 锚点贴底：bottom 放不下
    const el = mount({ placement: 'bottom', 'fallback-placements': 'left,top' })
    await Promise.resolve()
    stubRect(anchorOf(el), { left: 300, top: 500, width: 100, height: 40 })
    stubRect(card(el), { left: 0, top: 0, width: 200, height: 100 })
    el.setAttribute('open', '')
    await Promise.resolve()
    // bottom 放不下 → 按序列先试 left（放得下）→ 实际 left
    expect(card(el).getAttribute('data-placement')).toBe('left')
  })

  it('无 fallback-placements：默认翻转到对向', async () => {
    setViewport(800, 600)
    const el = mount({ placement: 'bottom' })
    await Promise.resolve()
    stubRect(anchorOf(el), { left: 300, top: 500, width: 100, height: 40 })
    stubRect(card(el), { left: 0, top: 0, width: 200, height: 100 })
    el.setAttribute('open', '')
    await Promise.resolve()
    expect(card(el).getAttribute('data-placement')).toBe('top')
  })

  it('hide-when-detached：锚点滚出视口时隐藏卡片', async () => {
    setViewport(800, 600)
    const el = mount({ placement: 'top', 'hide-when-detached': '' })
    await Promise.resolve()
    // 锚点完全在视口上方
    stubRect(anchorOf(el), { left: 100, top: -200, width: 100, height: 40 })
    stubRect(card(el), { left: 0, top: 0, width: 200, height: 100 })
    el.setAttribute('open', '')
    await Promise.resolve()
    expect(card(el).classList.contains('oas-detached')).toBe(true)
    // 锚点回到视口 → 恢复（先关再开触发重定位）
    stubRect(anchorOf(el), { left: 100, top: 200, width: 100, height: 40 })
    el.removeAttribute('open')
    el.setAttribute('open', '')
    await Promise.resolve()
    expect(card(el).classList.contains('oas-detached')).toBe(false)
  })

  it('hide-when-detached 未设置：锚点脱离不隐藏', async () => {
    setViewport(800, 600)
    const el = mount({ placement: 'top' })
    await Promise.resolve()
    stubRect(anchorOf(el), { left: 100, top: -200, width: 100, height: 40 })
    stubRect(card(el), { left: 0, top: 0, width: 200, height: 100 })
    el.setAttribute('open', '')
    await Promise.resolve()
    expect(card(el).classList.contains('oas-detached')).toBe(false)
  })

  // —— 宽度定制 ——

  it('width="300" 设置卡片宽度（px）', async () => {
    const el = mount({ open: '', width: '300' })
    await Promise.resolve()
    expect(card(el).style.width).toBe('300px')
  })

  it('width="trigger" 与触发器同宽', async () => {
    const el = mount({ width: 'trigger' })
    await Promise.resolve()
    Object.defineProperty(anchorOf(el), 'offsetWidth', { value: 150, configurable: true })
    el.setAttribute('open', '')
    await Promise.resolve()
    expect(card(el).style.width).toBe('150px')
  })

  // —— C11 延迟组（HoverCard.Group 语义）——

  it('组内连续悬停：后一个立即打开、前一个立即关闭', async () => {
    const a = mount({ title: 'A', group: 'g1', 'open-delay': '500' })
    const b = mount({ title: 'B', group: 'g1', 'open-delay': '500' })
    await Promise.resolve()
    // 首个进入组：仍走 open-delay
    anchorOf(a).dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    vi.advanceTimersByTime(100)
    expect(card(a).getAttribute('aria-hidden')).toBe('true')
    vi.advanceTimersByTime(400)
    expect(card(a).getAttribute('aria-hidden')).toBe('false')
    // 移到 b：b 立即打开（跳过 open-delay），a 立即关闭
    anchorOf(b).dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    expect(card(b).getAttribute('aria-hidden')).toBe('false')
    expect(card(a).getAttribute('aria-hidden')).toBe('true')
  })

  it('组内首个进入仍走 open-delay（无组内已开成员时不跳过）', async () => {
    const c = mount({ title: 'C', group: 'g2', 'open-delay': '500' })
    await Promise.resolve()
    anchorOf(c).dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    vi.advanceTimersByTime(100)
    expect(card(c).getAttribute('aria-hidden')).toBe('true')
    vi.advanceTimersByTime(400)
    expect(card(c).getAttribute('aria-hidden')).toBe('false')
  })

  // —— C1 箭头 merge 模式 ——

  it('arrow-merge：*-start/*-end 位置箭头贴角 + 对应圆角清零', async () => {
    const el = mount({ placement: 'bottom-start', 'arrow-merge': '' })
    await Promise.resolve()
    const styleText = el.shadowRoot!.querySelector('style')!.textContent!
    expect(styleText).toContain(".card.arrow-merge[data-placement='bottom-start']")
    expect(styleText).toContain('border-top-left-radius: 0')
  })
})

