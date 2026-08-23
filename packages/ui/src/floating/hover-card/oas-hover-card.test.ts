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
  // append-to portal 期间卡片在 portal host 的 shadow 内，需两处查
  return (el.shadowRoot!.querySelector('[part="card"]') ??
    document.querySelector<HTMLElement>('[data-oas-hover-card-portal]')?.shadowRoot?.querySelector(
      '[part="card"]',
    ))!
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

  // —— 富内容插槽 ——

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

  // —— 浮层可悬停不闪关（悬停区域 = 触发器 + 卡片）——

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

  // —— placement 12 向 ——

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

  it('-start/-end 8 向：箭头内联偏移指向锚点中心投影（对准宿主，不再恒居中，P1 同款修复）', async () => {
    // stubPositionBaseline：锚点 {300,200,120,40}（中心 360,220）、卡片 200x100、gap 8：
    //   bottom/top-start 卡片 left=300、-end 卡片 left=220；
    //   left/right-start 卡片 top=200、-end 卡片 top=140
    const cases: Record<string, { prop: 'left' | 'top'; value: string }> = {
      'bottom-start': { prop: 'left', value: '56px' }, // 360-300-4
      'bottom-end': { prop: 'left', value: '136px' }, // 360-220-4
      'top-start': { prop: 'left', value: '56px' },
      'top-end': { prop: 'left', value: '136px' },
      'left-start': { prop: 'top', value: '16px' }, // 220-200-4
      'left-end': { prop: 'top', value: '76px' }, // 220-140-4
      'right-start': { prop: 'top', value: '16px' },
      'right-end': { prop: 'top', value: '76px' },
    }
    for (const [placement, { prop, value }] of Object.entries(cases)) {
      const el = mount({ placement })
      await Promise.resolve()
      stubPositionBaseline(el)
      setViewport(1280, 800)
      el.setAttribute('open', '')
      await Promise.resolve()
      const arrow = card(el).querySelector<HTMLElement>('[data-popper-arrow]')!
      expect(arrow.style[prop], `${placement} 箭头应指向锚点中心投影（${prop}=${value}）`).toBe(value)
    }
  })

  // —— open-delay / close-delay 分离 ——

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

  // —— disabled ——

  it('disabled：hover / focus 均不触发打开', async () => {
    const el = mount({ disabled: '', 'open-delay': '0' })
    anchorOf(el).dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    anchorOf(el).dispatchEvent(new FocusEvent('focusin'))
    vi.advanceTimersByTime(10)
    expect(card(el).getAttribute('aria-hidden')).toBe('true')
  })

  // —— 箭头 ——

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
    // -start 对齐：箭头内联偏移指向锚点中心投影（对准宿主）；
    // center 对齐（无 arrow-point-at-center）走 calc 居中兜底
    expect(cs.getPropertyValue('left')).toBe('56px') // 360 - 300 - 4
    el.setAttribute('placement', 'bottom')
    await Promise.resolve()
    const cs2 = window.getComputedStyle(card(el).querySelector<HTMLElement>('[data-popper-arrow]')!)
    expect(cs2.getPropertyValue('left')).toBe('calc(50% - 4px)')
  })

  // —— oas-open-change ——

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

  // —— role 语义修正（去 dialog）——

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

  // —— 方向感知动画 ——

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

  // —— 双轴偏移 ——

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

  // —— append-to 挂载点 ——

  it('append-to：卡片移入目标容器的 portal host（独立 shadow + STYLE 保真），关闭移回、host 无孤儿', async () => {
    // 曾缺陷（P5 扫描实锤，与 popover P2 同族）：append-to 只做 absolute + 坐标换算，
    // 卡片并未移进容器——absolute 相对的是页面无关 positioned 祖先，top - cRect.top
    // 参照物全错 → 定位彻底错乱（实测卡片跑到视口外 -2591px）
    const target = document.createElement('div')
    target.id = 'hc-target'
    document.body.appendChild(target)
    const el = mount({ open: '', 'append-to': '#hc-target' })
    await Promise.resolve()
    const host = target.querySelector<HTMLElement>('[data-oas-hover-card-portal]')
    expect(host).not.toBeNull()
    expect(host!.shadowRoot!.contains(card(el))).toBe(true)
    // 样式作用域保真：portal shadow 内注入同一份 STYLE
    expect(host!.shadowRoot!.querySelector('style')!.textContent).toContain('.card')
    expect(el.shadowRoot!.contains(card(el))).toBe(false)
    // 关闭：卡片移回原 shadow，host 移除
    el.removeAttribute('open')
    await Promise.resolve()
    expect(el.shadowRoot!.contains(card(el))).toBe(true)
    expect(target.querySelector('[data-oas-hover-card-portal]')).toBeNull()
  })

  it('append-to + slot 富内容：slotted 节点桥接到 portal host light DOM（跨 host 分配不断供）', async () => {
    const target = document.createElement('div')
    target.id = 'hc-target-2'
    document.body.appendChild(target)
    const el = mount({ open: '', 'append-to': '#hc-target-2' })
    await Promise.resolve()
    const rich = document.createElement('b')
    rich.setAttribute('slot', 'content')
    rich.textContent = '富内容'
    el.appendChild(rich)
    el.setAttribute('content', 'y') // 触发 update 桥接后加节点
    await Promise.resolve()
    const host = target.querySelector<HTMLElement>('[data-oas-hover-card-portal]')!
    expect(host.contains(rich)).toBe(true)
    const slot = card(el).querySelector('slot[name="content"]') as HTMLSlotElement
    expect(slot.assignedNodes()).toContain(rich)
    el.removeAttribute('open')
    await Promise.resolve()
    expect(el.contains(rich)).toBe(true)
  })

  it('定位测量用布局尺寸（offsetWidth/offsetHeight）：进场动画 scale 不污染 bottom-end 右缘对齐', async () => {
    // 曾缺陷（P5 扫描实锤）：position() 用 getBoundingClientRect 测宽，进场动画
    // scale(0.95) 中间帧把宽缩小 ~5% → bottom-end 面板右缘对齐漂移十余 px、箭头脱离锚点
    setViewport(1280, 800)
    const el = mount({ placement: 'bottom-end' })
    await Promise.resolve()
    stubRect(anchorOf(el), { left: 300, top: 200, width: 120, height: 40 }) // 锚点右缘 420
    // rect 被动画污染（宽 234*0.95≈222），offsetWidth/Height 提供真实布局尺寸
    stubRect(card(el), { left: 0, top: 0, width: 222.3, height: 95 })
    Object.defineProperty(card(el), 'offsetWidth', { value: 234, configurable: true })
    Object.defineProperty(card(el), 'offsetHeight', { value: 100, configurable: true })
    el.setAttribute('open', '')
    await Promise.resolve()
    // 右缘对齐用布局宽：420 - 234 = 186（污染宽会得 197.7，右缘漂 11.7px）
    expect(card(el).style.left).toBe('186px')
  })

  // —— 碰撞细调 ——

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

  // —— 延迟组（HoverCard.Group 语义）——

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

  // —— 箭头 merge 模式（直角三角贴角共边，对齐 tooltip/popover 形态） ——

  /** shadow 内 STYLE 文本（空白折叠后做规则断言） */
  function mergeCss(el: OASHoverCard): string {
    return (el.shadowRoot!.querySelector('style')!.textContent ?? '').replace(/\s+/g, ' ')
  }

  it('arrow-merge：卡片写 arrow-merge 类，center placement 不触发贴角规则（仅 -start/-end 生效）', async () => {
    const el = mount({ open: '', placement: 'bottom-start', 'arrow-merge': '' })
    await Promise.resolve()
    expect(card(el).classList.contains('arrow-merge')).toBe(true)
    const css = mergeCss(el)
    expect(css).toMatch(/\.card\.arrow-merge\[data-placement='bottom-start'\] \.arrow/)
    expect(css).toContain('border-top-left-radius: 0')
    // bottom 无后缀 → 不匹配贴角规则（center placement merge 不生效）
    expect(css).not.toMatch(/\.card\.arrow-merge\[data-placement='bottom'\] \.arrow/)
    // 移除属性 → 类同步摘除
    el.removeAttribute('arrow-merge')
    await Promise.resolve()
    expect(card(el).classList.contains('arrow-merge')).toBe(false)
  })

  it('arrow-merge 逐角置零：8 个 -start/-end placement 的角 radius 规则各就各位', () => {
    const css = mergeCss(mount())
    const cornerOf: Record<string, string> = {
      // bottom 系箭头悬顶边：start→左上角、end→右上角
      'bottom-start': 'border-top-left-radius: 0;',
      'bottom-end': 'border-top-right-radius: 0;',
      // top 系箭头悬底边：start→左下角、end→右下角
      'top-start': 'border-bottom-left-radius: 0;',
      'top-end': 'border-bottom-right-radius: 0;',
      // left 系箭头悬右边：start→右上角、end→右下角
      'left-start': 'border-top-right-radius: 0;',
      'left-end': 'border-bottom-right-radius: 0;',
      // right 系箭头悬左边：start→左上角、end→左下角
      'right-start': 'border-top-left-radius: 0;',
      'right-end': 'border-bottom-left-radius: 0;',
    }
    for (const [p, decl] of Object.entries(cornerOf)) {
      expect(css, `merge ${p} 应置零 ${decl}`).toContain(
        `.card.arrow-merge[data-placement='${p}'] { ${decl} }`,
      )
    }
  })

  it('arrow-merge 直角三角贴角共边：8 向箭头盒整悬面板外、transform none、描边覆盖汇于尖端的两条边（直角边 + 斜边渐变）', () => {
    const css = mergeCss(mount())
    const B = '1px solid var(--oas-color-border)'
    // 盒定位：主轴边外 -8px（压进面板描边带 1px 共带）、起止侧边 -1px（描边带对齐，
    // -end 向显式 left/top: auto 解除与居中 calc 的 over-constrained——否则让位边被忽略）；
    // 不旋转 + 描边策略（P3 同款修复）：直角边用 border（与面板描边共带续接）、
    // 斜边（汇于尖端的主要外露边）用 45°/135° 渐变带补 1px 法向线（斜边=盒对角线，
    // 恰落渐变 50% 等值线，clip 保留内侧 1px）+ clip-path 直角三角
    const grad = (angle: number) =>
      `linear-gradient(${angle}deg, var(--oas-color-bg) 0 calc(50% - 1px), var(--oas-color-border) calc(50% - 1px) calc(50% + 1px), var(--oas-color-bg) calc(50% + 1px))`
    const rules: Record<string, string> = {
      'bottom-start': `top: -8px; left: -1px; transform: none; border: none; border-left: ${B}; border-bottom: ${B}; background: ${grad(45)}; clip-path: polygon(0% 0%, 0% 100%, 100% 100%);`,
      'bottom-end': `top: -8px; right: -1px; left: auto; transform: none; border: none; border-right: ${B}; border-bottom: ${B}; background: ${grad(135)}; clip-path: polygon(100% 0%, 0% 100%, 100% 100%);`,
      'top-start': `bottom: -8px; left: -1px; transform: none; border: none; border-left: ${B}; border-top: ${B}; background: ${grad(135)}; clip-path: polygon(0% 0%, 100% 0%, 0% 100%);`,
      'top-end': `bottom: -8px; right: -1px; left: auto; transform: none; border: none; border-right: ${B}; border-top: ${B}; background: ${grad(45)}; clip-path: polygon(0% 0%, 100% 0%, 100% 100%);`,
      'left-start': `right: -8px; top: -1px; transform: none; border: none; border-top: ${B}; border-left: ${B}; background: ${grad(135)}; clip-path: polygon(0% 0%, 100% 0%, 0% 100%);`,
      'left-end': `right: -8px; bottom: -1px; top: auto; transform: none; border: none; border-bottom: ${B}; border-left: ${B}; background: ${grad(45)}; clip-path: polygon(0% 0%, 0% 100%, 100% 100%);`,
      'right-start': `left: -8px; top: -1px; transform: none; border: none; border-top: ${B}; border-right: ${B}; background: ${grad(45)}; clip-path: polygon(0% 0%, 100% 0%, 100% 100%);`,
      'right-end': `left: -8px; bottom: -1px; top: auto; transform: none; border: none; border-bottom: ${B}; border-right: ${B}; background: ${grad(135)}; clip-path: polygon(100% 0%, 0% 100%, 100% 100%);`,
    }
    for (const [p, decl] of Object.entries(rules)) {
      expect(css, `merge ${p} 箭头应为直角三角贴角共边（斜边渐变描边）`).toContain(
        `.card.arrow-merge[data-placement='${p}'] .arrow { ${decl} }`,
      )
    }
    // 旧「菱形骑角」规则（基向前缀 + 后缀匹配 + 半宽 -4px 骑角）不得残留
    expect(css).not.toMatch(/\[data-placement\^='bottom'\]\[data-placement\$='-start'\] \.arrow/)
    expect(css).not.toMatch(/\[data-placement\^='bottom'\]\[data-placement\$='-end'\] \.arrow/)
    expect(css).not.toMatch(/\[data-placement\^='top'\]\[data-placement\$='-start'\] \.arrow/)
    expect(css).not.toMatch(/\[data-placement\^='top'\]\[data-placement\$='-end'\] \.arrow/)
    expect(css).not.toMatch(/\[data-placement\^='left'\]\[data-placement\$='-start'\] \.arrow/)
    expect(css).not.toMatch(/\[data-placement\^='left'\]\[data-placement\$='-end'\] \.arrow/)
    expect(css).not.toMatch(/\[data-placement\^='right'\]\[data-placement\$='-start'\] \.arrow/)
    expect(css).not.toMatch(/\[data-placement\^='right'\]\[data-placement\$='-end'\] \.arrow/)
  })

  it('arrow-merge 8 向三角几何：直角顶点贴面板角、两直角边与角两边共线、尖端正交外探 8px 指向锚点侧', () => {
    const css = mergeCss(mount())
    // 每向：clip-path 顶点（盒内 8×8 百分比坐标）→ 面板角点位于盒的哪个角 + 三角朝向
    // corner: 面板角点在箭头盒内的位置；edge: 贴边腿顶点相对角点的位移（沿面板边向内 8px，
    // 该腿与面板真实边段共边）；tip: 尖端相对角点的正交位移 8px（指向锚点侧）
    const geom: Record<string, { corner: [number, number]; edge: [number, number]; tip: [number, number] }> =
      {
        // bottom 系：盒悬顶边上方 → 角点在盒底边；start 贴左（贴边腿向右）、end 贴右（向左）；尖端朝上
        'bottom-start': { corner: [0, 8], edge: [8, 0], tip: [0, -8] },
        'bottom-end': { corner: [8, 8], edge: [-8, 0], tip: [0, -8] },
        // top 系：盒悬底边下方 → 角点在盒顶边；尖端朝下
        'top-start': { corner: [0, 0], edge: [8, 0], tip: [0, 8] },
        'top-end': { corner: [8, 0], edge: [-8, 0], tip: [0, 8] },
        // left 系：盒悬右边右侧 → 角点在盒左边；贴边腿沿面板右边（start 向下、end 向上）；尖端朝右
        'left-start': { corner: [0, 0], edge: [0, 8], tip: [8, 0] },
        'left-end': { corner: [0, 8], edge: [0, -8], tip: [8, 0] },
        // right 系：盒悬左边左侧 → 角点在盒右边；尖端朝左
        'right-start': { corner: [8, 0], edge: [0, 8], tip: [-8, 0] },
        'right-end': { corner: [8, 8], edge: [0, -8], tip: [-8, 0] },
      }
    // 从 STYLE 文本解析某 placement 的 clip-path 顶点（百分比 → 8×8 盒内 px 坐标）
    const verticesOf = (p: string): Array<[number, number]> => {
      const m = css.match(
        new RegExp(
          `\\.card\\.arrow-merge\\[data-placement='${p}'\\] \\.arrow \\{ [^}]*clip-path: polygon\\(([^)]+)\\)`,
        ),
      )
      if (!m) throw new Error(`merge ${p} 规则缺失`)
      return m[1]!.split(',').map((v) => {
        const [xs, ys] = v.trim().split(/\s+/)
        return [(parseFloat(xs!) / 100) * 8, (parseFloat(ys!) / 100) * 8] as [number, number]
      })
    }
    const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6
    for (const [p, { corner, edge, tip }] of Object.entries(geom)) {
      const vs = verticesOf(p)
      expect(vs.length, `${p} clip-path 应为三角（3 顶点）`).toBe(3)
      // 找直角顶点：与另两顶点构成的向量内积为 0
      const rightIdx = vs.findIndex((v, i) => {
        const a = vs[(i + 1) % 3]!
        const b = vs[(i + 2) % 3]!
        return near((a[0] - v[0]) * (b[0] - v[0]) + (a[1] - v[1]) * (b[1] - v[1]), 0)
      })
      expect(rightIdx, `${p} clip-path 应含直角顶点`).toBeGreaterThanOrEqual(0)
      const rv = vs[rightIdx]!
      // 直角顶点精确落面板角点（角点在盒内的已知位置）
      expect(near(rv[0], corner[0]) && near(rv[1], corner[1]), `${p} 直角顶点应落面板角点`).toBe(true)
      // 另两顶点：一个沿面板边向内 8px（贴边腿与面板真实边段共边）、一个为尖端
      // （角点 + 正交位移 8px 指向锚点侧）
      const others = vs.filter((_, i) => i !== rightIdx)
      const isEdge = (v: [number, number]): boolean =>
        near(v[0] - rv[0], edge[0]) && near(v[1] - rv[1], edge[1])
      const isTip = (v: [number, number]): boolean =>
        near(v[0] - rv[0], tip[0]) && near(v[1] - rv[1], tip[1])
      expect(
        (isEdge(others[0]!) && isTip(others[1]!)) || (isTip(others[0]!) && isEdge(others[1]!)),
        `${p} 两直角边应分别与面板边共边（向内 8px）与正交外探尖端（8px）`,
      ).toBe(true)
    }
  })

  it('arrow-merge + arrow-point-at-center：箭头钉死角点，不写内联偏移（直角三角不脱离角）', async () => {
    const el = mount({
      open: '',
      placement: 'bottom-start',
      'arrow-merge': '',
      'arrow-point-at-center': '',
    })
    await Promise.resolve()
    stubPositionBaseline(el)
    // 锚点中心（x=360）≠ 面板中心（x=400）：无 merge 守卫时会写内联偏移
    el.setAttribute('content', 'x') // 触发重定位
    await Promise.resolve()
    const arrow = card(el).querySelector<HTMLElement>('[data-popper-arrow]')!
    expect(arrow.style.left).toBe('')
    expect(arrow.style.top).toBe('')
  })

  // —— 滚动跟随默认开启（缺陷修复：仅 hide-when-detached 才挂 scroll 监听，默认锚点滚走卡片悬空）——

  it('滚动后卡片仍贴锚点（scroll 重定位默认开启，sticky=partial 为默认值）', async () => {
    const el = mount({ placement: 'bottom' })
    await Promise.resolve()
    stubPositionBaseline(el)
    el.setAttribute('open', '')
    await Promise.resolve()
    expect(card(el).style.top).toBe('248px') // 200+40+8
    // 模拟滚动：锚点下移 120px → scroll 事件（rAF 节流后）重定位
    stubRect(anchorOf(el), { left: 300, top: 320, width: 120, height: 40 })
    window.dispatchEvent(new Event('scroll'))
    vi.advanceTimersByTime(20)
    expect(card(el).style.top).toBe('368px') // 320+40+8
    // resize 同样触发重定位
    stubRect(anchorOf(el), { left: 300, top: 120, width: 120, height: 40 })
    window.dispatchEvent(new Event('resize'))
    vi.advanceTimersByTime(20)
    expect(card(el).style.top).toBe('168px') // 120+40+8
  })

  // —— sticky 三档（off / partial / always）——

  it('sticky="off"：显式关闭滚动重定位（滚动后卡片不动）', async () => {
    const el = mount({ placement: 'bottom', sticky: 'off' })
    await Promise.resolve()
    stubPositionBaseline(el)
    el.setAttribute('open', '')
    await Promise.resolve()
    expect(card(el).style.top).toBe('248px')
    stubRect(anchorOf(el), { left: 300, top: 320, width: 120, height: 40 })
    window.dispatchEvent(new Event('scroll'))
    vi.advanceTimersByTime(20)
    expect(card(el).style.top).toBe('248px') // 不重定位
  })

  it('sticky="always"：锚点滚出视口后卡片吸附视口边缘（贴边不消失）', async () => {
    setViewport(800, 600)
    const el = mount({ placement: 'top', sticky: 'always' })
    await Promise.resolve()
    stubRect(anchorOf(el), { left: 300, top: -200, width: 120, height: 40 })
    stubRect(card(el), { left: 0, top: 0, width: 200, height: 100 })
    el.setAttribute('open', '')
    await Promise.resolve()
    expect(card(el).classList.contains('oas-detached')).toBe(false)
    expect(card(el).style.top).toBe('4px') // 吸附视口顶边（collision-padding 4）
    expect(card(el).getAttribute('data-placement')).toBe('top')
  })

  it('sticky="always" + hide-when-detached：锚点滚出仍贴边不隐藏（always 优先于脱离隐藏）', async () => {
    setViewport(800, 600)
    const el = mount({ placement: 'top', sticky: 'always', 'hide-when-detached': '' })
    await Promise.resolve()
    stubRect(anchorOf(el), { left: 300, top: -200, width: 120, height: 40 })
    stubRect(card(el), { left: 0, top: 0, width: 200, height: 100 })
    el.setAttribute('open', '')
    await Promise.resolve()
    expect(card(el).classList.contains('oas-detached')).toBe(false)
    expect(card(el).style.top).toBe('4px')
  })

  it('sticky=partial（默认）+ hide-when-detached：锚点滚出即隐藏（脱离隐藏语义保留）', async () => {
    setViewport(800, 600)
    const el = mount({ placement: 'top', 'hide-when-detached': '' })
    await Promise.resolve()
    stubRect(anchorOf(el), { left: 300, top: -200, width: 120, height: 40 })
    stubRect(card(el), { left: 0, top: 0, width: 200, height: 100 })
    el.setAttribute('open', '')
    await Promise.resolve()
    expect(card(el).classList.contains('oas-detached')).toBe(true)
  })

  // —— collision-boundary 自定义碰撞边界 ——

  it('collision-boundary（选择器）：视口夹取边界换成目标元素 rect（多祖先取第一个命中）', async () => {
    setViewport(800, 600)
    const boundary = document.createElement('div')
    boundary.id = 'hc-cb'
    document.body.appendChild(boundary)
    stubRect(boundary, { left: 0, top: 0, width: 400, height: 300 })
    const el = mount({ placement: 'bottom', 'collision-boundary': '#hc-cb' })
    await Promise.resolve()
    stubRect(anchorOf(el), { left: 350, top: 100, width: 100, height: 40 })
    stubRect(card(el), { left: 0, top: 0, width: 200, height: 100 })
    el.setAttribute('open', '')
    await Promise.resolve()
    // 锚点中心 x=400 → left=300；卡片右缘 500 越出边界（400）→ 夹取到 400-200-4=196
    // （视口 800 内本无需夹取，证明夹取边界已替换）
    expect(card(el).style.left).toBe('196px')
    // 纵向不受影响：bottom → top = 100+40+8 = 148
    expect(card(el).style.top).toBe('148px')
  })

  it('collisionBoundary property 通道接受元素（与选择器通道等价）', async () => {
    setViewport(800, 600)
    const boundary = document.createElement('div')
    document.body.appendChild(boundary)
    stubRect(boundary, { left: 0, top: 0, width: 400, height: 300 })
    const el = mount({ placement: 'bottom' })
    await Promise.resolve()
    el.collisionBoundary = boundary
    stubRect(anchorOf(el), { left: 350, top: 100, width: 100, height: 40 })
    stubRect(card(el), { left: 0, top: 0, width: 200, height: 100 })
    el.setAttribute('open', '')
    await Promise.resolve()
    expect(card(el).style.left).toBe('196px')
  })

  it('collision-boundary：翻转判定同样基于边界（边界内放不下时翻转，视口内本可放下）', async () => {
    setViewport(800, 600)
    const boundary = document.createElement('div')
    boundary.id = 'hc-cb2'
    document.body.appendChild(boundary)
    stubRect(boundary, { left: 0, top: 0, width: 400, height: 300 })
    const el = mount({ placement: 'bottom', 'collision-boundary': '#hc-cb2' })
    await Promise.resolve()
    stubRect(anchorOf(el), { left: 100, top: 240, width: 100, height: 40 }) // anchor.bottom=280
    stubRect(card(el), { left: 0, top: 0, width: 200, height: 100 })
    el.setAttribute('open', '')
    await Promise.resolve()
    // bottom 需 280+100+8=388，边界高 300 放不下 → 翻转 top（视口 600 内 388 本可放下）
    expect(card(el).getAttribute('data-placement')).toBe('top')
  })

  it('collision-boundary 坐标系：边界位于页面中部时，夹取与翻转均以边界 rect 原点计算（而非视口原点）', async () => {
    setViewport(1280, 800)
    const boundary = document.createElement('div')
    boundary.id = 'hc-cb-mid'
    document.body.appendChild(boundary)
    // 边界在页面中部（原点非 0）：真实滚动页面中的常见形态
    stubRect(boundary, { left: 500, top: 300, width: 320, height: 200 })
    const el = mount({ placement: 'bottom', 'collision-boundary': '#hc-cb-mid' })
    await Promise.resolve()
    // 锚点在边界内右半：中心 x=760
    stubRect(anchorOf(el), { left: 710, top: 360, width: 100, height: 40 })
    stubRect(card(el), { left: 0, top: 0, width: 200, height: 100 })
    el.setAttribute('open', '')
    await Promise.resolve()
    // 期望 left = 760 - 100 = 660；但边界右缘 820，卡片右缘 660+200=860 越界
    // → 夹取到 820 - 200 - 4 = 616（以边界 right 为基准，而非视口宽）
    expect(card(el).style.left).toBe('616px')
    // 纵向：bottom → top = 360 + 40 + 8 = 408，边界底部 500 - 100 = 400 < 508 放不下 → 翻转 top
    // 翻转后 top = 360 - 100 - 8 = 252 ≥ 边界顶 300？252 < 304 也放不下 → 仍用声明 bottom（候选耗尽），夹取到 500 - 100 - 4 = 396
    expect(card(el).style.top).toBe('396px')
  })
})

