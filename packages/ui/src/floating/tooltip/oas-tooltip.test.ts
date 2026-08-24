import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OAStooltip } from './index.js'

function mount(attrs: Record<string, string> = {}): OAStooltip {
  const el = new OAStooltip()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<button>hover</button>`
  document.body.appendChild(el)
  return el
}

function tip(el: OAStooltip): HTMLElement {
  return el.shadowRoot!.querySelector('[part="tip"]')!
}

function mountVirtual(attrs: Record<string, string> = {}): OAStooltip {
  // 虚拟模式：不绑定宿主元素，无触发 slot
  const el = new OAStooltip()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
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

describe('OAStooltip', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('open 时显示 tooltip，role=tooltip + 内容', async () => {
    const el = mount({ open: '', content: '这是提示', placement: 'top' })
    await Promise.resolve()
    const t = tip(el)
    expect(t).not.toBeNull()
    expect(t.getAttribute('role')).toBe('tooltip')
    expect(t.textContent).toContain('这是提示')
  })

  it('mouseenter 触发显示，mouseleave 隐藏', async () => {
    const el = mount({ content: '提示' })
    ;(el.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true }),
    )
    await Promise.resolve()
    expect(tip(el).getAttribute('aria-hidden')).toBe('false')
    ;(el.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('mouseleave', { bubbles: true }),
    )
    expect(tip(el).getAttribute('aria-hidden')).toBe('true')
  })

  it('placement 传给浮层', async () => {
    const el = mount({ open: '', content: 'x', placement: 'bottom' })
    await Promise.resolve()
    expect(tip(el).getAttribute('data-placement')).toBe('bottom')
  })

  // —— 虚拟触发（virtual-trigger）——

  it('virtual 坐标模式：virtual-x/y 定位 + open 受控显示', async () => {
    const el = mountVirtual({
      virtual: '',
      'virtual-x': '150',
      'virtual-y': '200',
      content: '坐标提示',
      open: '',
    })
    await Promise.resolve()
    const t = tip(el)
    expect(t.getAttribute('aria-hidden')).toBe('false')
    expect(t.querySelector<HTMLElement>('.tip-content')!.textContent).toBe('坐标提示')
    // 按虚拟坐标定位：placement 默认 top，锚点为 0 尺寸点
    expect(t.style.top).not.toBe('')
    expect(t.style.left).not.toBe('')
    expect(t.getAttribute('data-placement')).toBe('top')
    // 坐标更新（鼠标移动）→ 重新定位
    el.setAttribute('virtual-x', '300')
    el.setAttribute('virtual-y', '260')
    await Promise.resolve()
    const left = parseFloat(t.style.left)
    expect(left).toBeGreaterThan(parseFloat('150'))
  })

  it('virtual 坐标更新多次：每次坐标变化 tip 都重定位到新位置（精确断言）', async () => {
    const el = mountVirtual({
      virtual: '',
      'virtual-x': '200',
      'virtual-y': '300',
      content: 'x',
      open: '',
    })
    await Promise.resolve()
    const t = tip(el)
    // happy-dom 无布局引擎（rect 全 0）：mock 真实 tip 尺寸，让 placement 数学可精确断言
    vi.spyOn(t, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 120,
      bottom: 36,
      width: 120,
      height: 36,
    } as DOMRect)
    // 坐标更新（模拟鼠标从 200,300 移到 400,260）→ 重定位
    el.setAttribute('virtual-x', '400')
    el.setAttribute('virtual-y', '260')
    await Promise.resolve()
    // placement 默认 top：top = 260 - 36 - 8 = 216；left = 400 - 120/2 = 340
    expect(t.style.top).toBe('216px')
    expect(t.style.left).toBe('340px')
    expect(t.getAttribute('data-placement')).toBe('top')
    // 再更新（移到 600,500）→ 继续跟随
    el.setAttribute('virtual-x', '600')
    el.setAttribute('virtual-y', '500')
    await Promise.resolve()
    expect(t.style.top).toBe('456px') // 500 - 36 - 8
    expect(t.style.left).toBe('540px') // 600 - 60
    // 每次坐标变化都应重定位：三次坐标 → 三组不同的 top/left
    el.setAttribute('virtual-x', '200')
    el.setAttribute('virtual-y', '300')
    await Promise.resolve()
    expect(t.style.top).toBe('256px')
    expect(t.style.left).toBe('140px')
  })

  it('virtual 坐标 placement=top：tip 落在锚点上方（top < anchor.y，center x 对齐）', async () => {
    const el = mountVirtual({
      virtual: '',
      'virtual-x': '320',
      'virtual-y': '280',
      placement: 'top',
      content: 'x',
      open: '',
    })
    await Promise.resolve()
    const t = tip(el)
    vi.spyOn(t, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 120,
      bottom: 36,
      width: 120,
      height: 36,
    } as DOMRect)
    // 同值 setAttribute 也会触发 attributeChangedCallback → update() → 用 mock 尺寸重算
    el.setAttribute('virtual-x', '320')
    el.setAttribute('virtual-y', '280')
    await Promise.resolve()
    expect(t.getAttribute('data-placement')).toBe('top') // 空间足够，不翻转
    expect(parseFloat(t.style.top)).toBeLessThan(280) // 锚点上方
    expect(t.style.top).toBe('236px') // 280 - 36 - 8
    expect(t.style.left).toBe('260px') // 320 - 120/2
  })

  it('virtual 坐标 placement=bottom：tip 在锚点下方（top = anchor.bottom + gap）', async () => {
    const el = mountVirtual({
      virtual: '',
      'virtual-x': '320',
      'virtual-y': '280',
      placement: 'bottom',
      content: 'x',
      open: '',
    })
    await Promise.resolve()
    const t = tip(el)
    vi.spyOn(t, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 120,
      bottom: 36,
      width: 120,
      height: 36,
    } as DOMRect)
    el.setAttribute('virtual-x', '320')
    el.setAttribute('virtual-y', '280')
    await Promise.resolve()
    expect(t.getAttribute('data-placement')).toBe('bottom')
    expect(parseFloat(t.style.top)).toBeGreaterThan(280) // 锚点下方
    expect(t.style.top).toBe('288px') // 280 + 8
    expect(t.style.left).toBe('260px')
  })

  it('virtual 模式下 anchor hover/focus 不触发（open 只受外部控制）', async () => {
    const el = mount({ virtual: '', content: 'x' })
    await Promise.resolve()
    ;(el.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true }),
    )
    ;(el.querySelector('button') as HTMLElement).dispatchEvent(
      new FocusEvent('focusin', { bubbles: true }),
    )
    await Promise.resolve()
    expect(tip(el).getAttribute('aria-hidden')).toBe('true')
  })

  it('virtual-anchor：selector 解析到元素时按该元素锚点定位', async () => {
    // happy-dom 无布局引擎，锚点 rect 全 0；断言定位被真正执行（top/left 有值、placement 翻转生效）
    document.body.innerHTML =
      '<div id="vp-point" style="position:absolute;left:300px;top:100px;width:20px;height:20px"></div>'
    const el = mountVirtual({
      virtual: '',
      'virtual-anchor': '#vp-point',
      content: '锚点提示',
      open: '',
    })
    await Promise.resolve()
    const t = tip(el)
    expect(t.getAttribute('aria-hidden')).toBe('false')
    expect(t.getAttribute('data-placement')).toBe('bottom') // 0 尺寸锚点贴视口顶 → 自动翻转到底部
    expect(t.style.top).not.toBe('')
    expect(t.style.left).not.toBe('')
  })

  it('virtual-anchor selector 解析失败：不定位但不报错（无孤儿浮层）', async () => {
    const el = mountVirtual({
      virtual: '',
      'virtual-anchor': '#missing-el',
      content: 'x',
      open: '',
    })
    await Promise.resolve()
    const t = tip(el)
    expect(t.getAttribute('aria-hidden')).toBe('false')
    expect(t.style.top).toBe('')
    expect(t.style.left).toBe('')
  })

  it('open 变化派发 oas-open-change（受控 setAttribute 双向）', async () => {
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
    const el = mount({ content: 'x' })
    await Promise.resolve()
    const fired: boolean[] = []
    el.addEventListener('oas-open-change', (e) =>
      fired.push((e as CustomEvent<{ open: boolean }>).detail.open),
    )
    ;(el.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true }),
    )
    await Promise.resolve()
    ;(el.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('mouseleave', { bubbles: true }),
    )
    await Promise.resolve()
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

  // —— 箭头（arrow）——

  it('箭头元素存在：part=arrow + data-popper-arrow + aria-hidden，内容写入独立容器', async () => {
    const el = mount({ open: '', content: '提示内容', placement: 'top' })
    await Promise.resolve()
    const t = tip(el)
    const arrow = t.querySelector<HTMLElement>('[data-popper-arrow]')
    expect(arrow).not.toBeNull()
    expect(arrow!.getAttribute('part')).toBe('arrow')
    expect(arrow!.getAttribute('aria-hidden')).toBe('true')
    // 内容写入 .tip-content，不会被 textContent 覆盖清掉箭头骨架
    expect(t.querySelector<HTMLElement>('.tip-content')!.textContent).toBe('提示内容')
    expect(t.querySelector('[data-popper-arrow]')).not.toBeNull()
  })

  it('内容更新不影响箭头元素（update 重建内容容器，箭头保留）', async () => {
    const el = mount({ open: '', content: 'A', placement: 'top' })
    await Promise.resolve()
    el.setAttribute('content', 'B')
    await Promise.resolve()
    const t = tip(el)
    expect(t.querySelector<HTMLElement>('.tip-content')!.textContent).toBe('B')
    expect(t.querySelector('[data-popper-arrow]')).not.toBeNull()
  })

  it('virtual 各 placement：data-placement 写入后箭头元素随浮层就位（四向）', async () => {
    for (const p of ['top', 'bottom', 'left', 'right'] as const) {
      const el = mountVirtual({
        virtual: '',
        'virtual-x': '300',
        'virtual-y': '200',
        placement: p,
        content: 'x',
        open: '',
      })
      await Promise.resolve()
      const t = tip(el)
      // 视口中段坐标：四向均不翻转，data-placement 与请求一致
      expect(t.getAttribute('data-placement')).toBe(p)
      expect(t.querySelector('[data-popper-arrow]')).not.toBeNull()
    }
  })

  it('各 placement：箭头定位 CSS 落在面板正确边（悬顶/底/左/右），中心对齐', async () => {
    // happy-dom 无布局引擎（boundingBox 全 0），退化为断言箭头定位 CSS：
    // computePosition 语义下 placement=bottom → 面板在锚点下方 → 箭头悬顶边(top:-4px、尖朝上)；
    // top → 底边(bottom:-4px)；left → 右边(right:-4px)；right → 左边(left:-4px)。
    // 中心对齐：left/right 用 calc(50% - 4px)（虚拟 0 尺寸锚点 → 面板中心即锚点中心）。
    const cases = {
      bottom: { edge: 'top' },
      top: { edge: 'bottom' },
      left: { edge: 'right' },
      right: { edge: 'left' },
    } as const
    for (const p of ['top', 'bottom', 'left', 'right'] as const) {
      const el = mountVirtual({
        virtual: '',
        'virtual-x': '300',
        'virtual-y': '200',
        placement: p,
        content: 'x',
        open: '',
      })
      await Promise.resolve()
      const t = tip(el)
      expect(t.getAttribute('data-placement')).toBe(p)
      const arrow = t.querySelector<HTMLElement>('[data-popper-arrow]')!
      const cs = window.getComputedStyle(arrow)
      // 该 placement 对应的悬空边为 -4px（8px 方块半宽外探）
      expect(
        cs.getPropertyValue(cases[p].edge),
        `placement=${p} 箭头应悬面板${cases[p].edge}边`,
      ).toBe('-6px')
    }
  })

  // —— 箭头显隐（arrow，默认 true）——

  it('arrow 默认 true：箭头可见（hidden=false）', async () => {
    const el = mount({ open: '', content: 'x', placement: 'top' })
    await Promise.resolve()
    const arrow = tip(el).querySelector<HTMLElement>('[data-popper-arrow]')!
    expect(arrow.hidden).toBe(false)
    expect(arrow.hasAttribute('hidden')).toBe(false)
  })

  it('arrow="false"：隐藏箭头（hidden=true），元素与 part 保留', async () => {
    const el = mount({ open: '', content: 'x', placement: 'top', arrow: 'false' })
    await Promise.resolve()
    const arrow = tip(el).querySelector<HTMLElement>('[data-popper-arrow]')!
    expect(arrow).not.toBeNull()
    expect(arrow.getAttribute('part')).toBe('arrow')
    expect(arrow.hidden).toBe(true)
  })

  it('arrow 动态切换：arrow="false" ↔ 移除 → hidden 同步', async () => {
    const el = mount({ open: '', content: 'x', placement: 'top' })
    await Promise.resolve()
    const arrow = tip(el).querySelector<HTMLElement>('[data-popper-arrow]')!
    el.setAttribute('arrow', 'false')
    await Promise.resolve()
    expect(arrow.hidden).toBe(true)
    el.removeAttribute('arrow')
    await Promise.resolve()
    expect(arrow.hidden).toBe(false)
  })

  // —— 箭头指向锚点中心（arrow-point-at-center，默认 false）——

  it('arrow-point-at-center：面板被视口边缘避让偏移时，箭头仍指向锚点中心（定位差异）', async () => {
    const el = mount({ open: '', content: 'x', placement: 'bottom' })
    const t = tip(el)
    stubRect(t, { left: 0, top: 0, width: 240, height: 36 })
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 12, top: 300, width: 64, height: 32 }) // 锚点中心 X = 44
    setViewport(1280, 800)
    el.setAttribute('content', 'x') // 触发重定位（stub 尺寸生效）
    await Promise.resolve()
    // 面板被 clamp 到视口左缘：left = max(4, 44-120) = 4 → 面板中心 124 ≠ 锚点中心 44
    expect(t.style.left).toBe('4px')
    const arrow = t.querySelector<HTMLElement>('[data-popper-arrow]')!
    // 默认（边缘对齐）：无内联偏移，箭头随面板居中（CSS calc(50% - 4px)）
    expect(arrow.style.left).toBe('')
    // 开启 point-at-center：箭头指向锚点中心（面板局部 X = 44 - 4 = 40 → left = 40 - 4 = 36px）
    el.setAttribute('arrow-point-at-center', '')
    await Promise.resolve()
    expect(arrow.style.left).toBe('36px')
    // 关闭后恢复 CSS 居中（无内联偏移）
    el.removeAttribute('arrow-point-at-center')
    await Promise.resolve()
    expect(arrow.style.left).toBe('')
  })

  it('arrow-point-at-center：virtual 0 尺寸锚点与默认等价（无内联偏移）', async () => {
    const el = mountVirtual({
      virtual: '',
      'virtual-x': '400',
      'virtual-y': '300',
      placement: 'bottom',
      content: 'x',
      open: '',
      'arrow-point-at-center': '',
    })
    const t = tip(el)
    stubRect(t, { left: 0, top: 0, width: 240, height: 36 })
    setViewport(1280, 800)
    el.setAttribute('virtual-x', '400') // 触发重定位
    await Promise.resolve()
    // 面板居中于锚点：箭头中心 = 锚点中心 = 面板中心 → 无需内联偏移（CSS 居中即指向锚点）
    const arrow = t.querySelector<HTMLElement>('[data-popper-arrow]')!
    expect(arrow.style.left).toBe('')
  })

  // —— 视口自动调整（auto-adjust-overflow，默认 true）——

  it('auto-adjust-overflow 默认 true：空间不足自动翻转', async () => {
    const el = mount({ open: '', content: 'x', placement: 'bottom' })
    const t = tip(el)
    stubRect(t, { left: 0, top: 0, width: 240, height: 36 })
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 200, top: 760, width: 64, height: 32 }) // 锚点贴视口底
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    await Promise.resolve()
    expect(t.getAttribute('data-placement')).toBe('top')
  })

  it('auto-adjust-overflow="false"：空间不足不翻转，保持声明 placement', async () => {
    const el = mount({
      open: '',
      content: 'x',
      placement: 'bottom',
      'auto-adjust-overflow': 'false',
    })
    const t = tip(el)
    stubRect(t, { left: 0, top: 0, width: 240, height: 36 })
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 200, top: 760, width: 64, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    await Promise.resolve()
    expect(t.getAttribute('data-placement')).toBe('bottom')
    // 不避让：按声明 placement 数学放置（可能溢出视口底缘）
    expect(t.style.top).toBe('800px') // 792 + 8
  })

  // ================= placement 12 向 =================

  it('placement 12 向：top-start 面板左缘对齐锚点左缘，data-placement 保留', async () => {
    const el = mount({ open: '', content: 'x', placement: 'top-start' })
    const t = tip(el)
    stubRect(t, { left: 0, top: 0, width: 120, height: 36 })
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 200, top: 300, width: 64, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    await Promise.resolve()
    expect(t.getAttribute('data-placement')).toBe('top-start')
    expect(t.style.left).toBe('200px') // 锚点左缘
    expect(t.style.top).toBe('256px') // 300 - 36 - 8
  })

  it('placement 12 向：bottom-end 面板右缘对齐锚点右缘', async () => {
    const el = mount({ open: '', content: 'x', placement: 'bottom-end' })
    const t = tip(el)
    stubRect(t, { left: 0, top: 0, width: 120, height: 36 })
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 200, top: 300, width: 64, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    await Promise.resolve()
    expect(t.getAttribute('data-placement')).toBe('bottom-end')
    expect(t.style.left).toBe('144px') // 264 - 120（锚点右缘对齐面板右缘）
    expect(t.style.top).toBe('340px') // 332 + 8
  })

  it('placement 12 向：left-start 面板顶缘对齐锚点顶缘', async () => {
    const el = mount({ open: '', content: 'x', placement: 'left-start' })
    const t = tip(el)
    stubRect(t, { left: 0, top: 0, width: 120, height: 36 })
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 200, top: 300, width: 64, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    await Promise.resolve()
    expect(t.getAttribute('data-placement')).toBe('left-start')
    expect(t.style.top).toBe('300px') // 锚点顶缘
    expect(t.style.left).toBe('72px') // 200 - 120 - 8
  })

  it('placement 12 向：right-end 空间不足时翻转保留 end 对齐 → left-end', async () => {
    const el = mount({ open: '', content: 'x', placement: 'right-end' })
    const t = tip(el)
    stubRect(t, { left: 0, top: 0, width: 120, height: 36 })
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 1200, top: 300, width: 64, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    await Promise.resolve()
    expect(t.getAttribute('data-placement')).toBe('left-end')
    expect(t.style.top).toBe('296px') // 332 - 36（end 对齐保留）
  })

  // ================= trigger 触发方式 =================

  it('trigger="click"：点击打开，再点关闭', async () => {
    const el = mount({ trigger: 'click', content: 'x' })
    await Promise.resolve()
    const btn = el.querySelector('button')!
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await Promise.resolve()
    expect(tip(el).getAttribute('aria-hidden')).toBe('false')
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await Promise.resolve()
    expect(tip(el).getAttribute('aria-hidden')).toBe('true')
  })

  it('trigger 多选（"hover click"）：hover 与 click 都生效', async () => {
    const el = mount({ trigger: 'hover click', content: 'x' })
    await Promise.resolve()
    const btn = el.querySelector('button')!
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await Promise.resolve()
    expect(tip(el).getAttribute('aria-hidden')).toBe('false')
  })

  it('trigger="manual"：hover/click 都不触发，仅受控 open', async () => {
    const el = mount({ trigger: 'manual', content: 'x' })
    await Promise.resolve()
    const btn = el.querySelector('button')!
    btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    btn.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    await Promise.resolve()
    expect(tip(el).getAttribute('aria-hidden')).toBe('true')
    el.setAttribute('open', '')
    await Promise.resolve()
    expect(tip(el).getAttribute('aria-hidden')).toBe('false')
  })

  it('trigger 不含 focus：focusin 不触发', async () => {
    const el = mount({ trigger: 'hover', content: 'x' })
    await Promise.resolve()
    ;(el.querySelector('button') as HTMLElement).dispatchEvent(
      new FocusEvent('focusin', { bubbles: true }),
    )
    await Promise.resolve()
    expect(tip(el).getAttribute('aria-hidden')).toBe('true')
  })

  it('trigger 不含 hover：mouseenter 不触发', async () => {
    const el = mount({ trigger: 'focus', content: 'x' })
    await Promise.resolve()
    ;(el.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true }),
    )
    await Promise.resolve()
    expect(tip(el).getAttribute('aria-hidden')).toBe('true')
  })

  it('trigger 默认 hover+focus：mouseenter 触发（向后兼容）', async () => {
    const el = mount({ content: 'x' })
    await Promise.resolve()
    ;(el.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true }),
    )
    await Promise.resolve()
    expect(tip(el).getAttribute('aria-hidden')).toBe('false')
  })

  // ================= open-delay / close-delay =================

  it('open-delay="100"：mouseenter 后 100ms 才打开', async () => {
    vi.useFakeTimers()
    // skip-delay-duration="0" 隔离全局 skipDelay 状态（模块级 lastCloseAt 跨测试残留）
    const el = mount({
      trigger: 'hover',
      'open-delay': '100',
      'skip-delay-duration': '0',
      content: 'x',
    })
    await Promise.resolve()
    ;(el.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true }),
    )
    vi.advanceTimersByTime(99)
    expect(tip(el).getAttribute('aria-hidden')).toBe('true')
    vi.advanceTimersByTime(2)
    expect(tip(el).getAttribute('aria-hidden')).toBe('false')
    vi.useRealTimers()
  })

  it('close-delay="100"：mouseleave 后 100ms 才关闭', async () => {
    vi.useFakeTimers()
    const el = mount({ trigger: 'hover', 'close-delay': '100', content: 'x' })
    await Promise.resolve()
    el.setAttribute('open', '')
    vi.advanceTimersByTime(0)
    const btn = el.querySelector('button')!
    btn.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    vi.advanceTimersByTime(99)
    expect(tip(el).getAttribute('aria-hidden')).toBe('false')
    vi.advanceTimersByTime(2)
    expect(tip(el).getAttribute('aria-hidden')).toBe('true')
    vi.useRealTimers()
  })

  it('open-delay 期间 mouseleave：取消打开（不残留下一个定时器）', async () => {
    vi.useFakeTimers()
    const el = mount({ trigger: 'hover', 'open-delay': '100', content: 'x' })
    await Promise.resolve()
    const btn = el.querySelector('button')!
    btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    btn.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    vi.advanceTimersByTime(200)
    expect(tip(el).getAttribute('aria-hidden')).toBe('true')
    vi.useRealTimers()
  })

  // ================= 富内容 content 插槽 =================

  it('slot="content" 富内容：优先于 content 属性显示', async () => {
    const el = mount({ open: '', content: '属性文本', placement: 'top' })
    const rich = document.createElement('strong')
    rich.slot = 'content'
    rich.textContent = '富内容'
    el.appendChild(rich)
    await Promise.resolve()
    const t = tip(el)
    // 插槽有内容 → 属性文本容器隐藏，插槽分配到富内容节点
    expect(t.querySelector<HTMLElement>('.tip-content')!.hidden).toBe(true)
    const slot = t.querySelector<HTMLSlotElement>('slot[name="content"]')!
    expect(slot.assignedNodes().length).toBe(1)
    expect(slot.assignedNodes()[0]!.textContent).toBe('富内容')
  })

  it('无 content 插槽：content 属性文本显示', async () => {
    const el = mount({ open: '', content: '纯文本', placement: 'top' })
    await Promise.resolve()
    const t = tip(el)
    expect(t.querySelector<HTMLElement>('.tip-content')!.hidden).toBe(false)
    expect(t.querySelector<HTMLElement>('.tip-content')!.textContent).toContain('纯文本')
  })

  it('插槽富内容移除后回退 content 属性文本', async () => {
    const el = mount({ open: '', content: '属性文本' })
    const rich = document.createElement('em')
    rich.slot = 'content'
    rich.textContent = '富'
    el.appendChild(rich)
    await Promise.resolve()
    expect(tip(el).querySelector<HTMLElement>('.tip-content')!.hidden).toBe(true)
    rich.remove()
    await Promise.resolve()
    const t = tip(el)
    expect(t.querySelector<HTMLElement>('.tip-content')!.hidden).toBe(false)
    expect(t.querySelector<HTMLElement>('.tip-content')!.textContent).toContain('属性文本')
  })

  // ================= Esc 关闭 + aria-describedby =================

  it('Esc 关闭打开中的 tooltip（document keydown）', async () => {
    const el = mount({ open: '', content: 'x' })
    await Promise.resolve()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await Promise.resolve()
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('Esc 关闭后触发元素焦点还原', async () => {
    const el = mount({ open: '', content: 'x' })
    await Promise.resolve()
    const btn = el.querySelector('button')!
    btn.focus = vi.fn()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await Promise.resolve()
    expect(btn.focus).toHaveBeenCalled()
  })

  it('aria-describedby：打开时触发元素关联 tip id（role=tooltip）', async () => {
    const el = mount({ open: '', content: 'x' })
    await Promise.resolve()
    const btn = el.querySelector('button')!
    const tid = btn.getAttribute('aria-describedby')
    expect(tid).toBeTruthy()
    const tipEl = el.shadowRoot!.getElementById(tid!)
    expect(tipEl).not.toBeNull()
    expect(tipEl!.getAttribute('role')).toBe('tooltip')
  })

  it('关闭时移除 aria-describedby', async () => {
    const el = mount({ content: 'x' })
    await Promise.resolve()
    const btn = el.querySelector('button')!
    el.setAttribute('open', '')
    await Promise.resolve()
    expect(btn.getAttribute('aria-describedby')).toBeTruthy()
    el.removeAttribute('open')
    await Promise.resolve()
    expect(btn.getAttribute('aria-describedby')).toBeNull()
  })

  it('virtual 模式：无触发元素，不设 aria-describedby', async () => {
    const el = mountVirtual({
      virtual: '',
      'virtual-x': '100',
      'virtual-y': '100',
      open: '',
      content: 'x',
    })
    await Promise.resolve()
    expect(el.getAttribute('aria-describedby')).toBeNull()
  })

  // ================= max-width =================

  it('max-width 属性：覆盖默认 240px（token 开口）', async () => {
    const el = mount({ open: '', content: 'x', 'max-width': '320' })
    await Promise.resolve()
    expect(tip(el).style.maxWidth).toBe('320px')
  })

  it('max-width 移除后回落（清空内联）', async () => {
    const el = mount({ open: '', content: 'x', 'max-width': '320' })
    await Promise.resolve()
    el.removeAttribute('max-width')
    await Promise.resolve()
    expect(tip(el).style.maxWidth).toBe('')
  })

  // ================= disabled =================

  it('disabled：hover 不触发', async () => {
    const el = mount({ disabled: '', content: 'x' })
    await Promise.resolve()
    ;(el.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true }),
    )
    await Promise.resolve()
    expect(tip(el).getAttribute('aria-hidden')).toBe('true')
  })

  it('disabled：受控 open 也不显示', async () => {
    const el = mount({ disabled: '', open: '', content: 'x' })
    await Promise.resolve()
    expect(tip(el).getAttribute('aria-hidden')).toBe('true')
  })

  it('移除 disabled 后恢复触发', async () => {
    const el = mount({ disabled: '', content: 'x' })
    await Promise.resolve()
    el.removeAttribute('disabled')
    await Promise.resolve()
    ;(el.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true }),
    )
    await Promise.resolve()
    expect(tip(el).getAttribute('aria-hidden')).toBe('false')
  })

  // ================= 动画 =================

  it('打开时 tip 进入显示态（aria-hidden=false + 动画 class）', async () => {
    const el = mount({ open: '', content: 'x' })
    await Promise.resolve()
    const t = tip(el)
    expect(t.getAttribute('aria-hidden')).toBe('false')
    expect(t.classList.contains('tip-enter')).toBe(true)
  })

  it('方向感知动画：transform-origin 随 data-placement 设置（top → bottom center）', async () => {
    const el = mount({ open: '', content: 'x', placement: 'top' })
    const t = tip(el)
    stubRect(t, { left: 0, top: 0, width: 120, height: 36 })
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 200, top: 300, width: 64, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    await Promise.resolve()
    expect(t.getAttribute('data-placement')).toBe('top')
    // 动画机制通过 CSS 规则驱动（transform-origin 由 data-placement 选择器控制），
    // happy-dom 不解析 CSS 规则 → 断言 STYLE 文本包含方向感知规则
    const styleText = el.shadowRoot!.querySelector('style')!.textContent!
    expect(styleText).toContain("[data-placement^='top']")
  })

  // ================= 延迟组 / 全局单例（skipDelay） =================

  it('skip-delay-duration：上次关闭后立即打开另一个 → 跳过 open-delay', async () => {
    vi.useFakeTimers()
    const a = mount({ trigger: 'hover', content: 'a' })
    const btnA = a.querySelector('button')!
    btnA.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    vi.advanceTimersByTime(0)
    btnA.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    vi.advanceTimersByTime(0)
    // 关闭后立刻 hover 下一个（open-delay=200 应被跳过）
    const b = mount({ trigger: 'hover', 'open-delay': '200', content: 'b' })
    ;(b.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true }),
    )
    vi.advanceTimersByTime(0)
    expect(tip(b).getAttribute('aria-hidden')).toBe('false')
    vi.useRealTimers()
  })

  it('超过 skip-delay-duration 后恢复 open-delay', async () => {
    vi.useFakeTimers()
    const a = mount({ trigger: 'hover', content: 'a' })
    const btnA = a.querySelector('button')!
    btnA.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    vi.advanceTimersByTime(0)
    btnA.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    vi.advanceTimersByTime(0)
    // 等待超过 skip-delay（默认 300ms）
    vi.advanceTimersByTime(400)
    const b = mount({ trigger: 'hover', 'open-delay': '200', content: 'b' })
    ;(b.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true }),
    )
    vi.advanceTimersByTime(199)
    expect(tip(b).getAttribute('aria-hidden')).toBe('true')
    vi.advanceTimersByTime(2)
    expect(tip(b).getAttribute('aria-hidden')).toBe('false')
    vi.useRealTimers()
  })

  it('skip-delay-duration="0"：关闭跳过延迟组（每次都要延迟）', async () => {
    vi.useFakeTimers()
    const a = mount({ trigger: 'hover', content: 'a' })
    const btnA = a.querySelector('button')!
    btnA.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    vi.advanceTimersByTime(0)
    btnA.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    vi.advanceTimersByTime(0)
    const b = mount({
      trigger: 'hover',
      'open-delay': '200',
      'skip-delay-duration': '0',
      content: 'b',
    })
    ;(b.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true }),
    )
    vi.advanceTimersByTime(0)
    expect(tip(b).getAttribute('aria-hidden')).toBe('true')
    vi.advanceTimersByTime(200)
    expect(tip(b).getAttribute('aria-hidden')).toBe('false')
    vi.useRealTimers()
  })

  // ================= interactive 可悬停浮层 =================

  it('interactive：tip 自身可悬停（mouseenter 取消关闭，mouseleave 排程关闭）', async () => {
    vi.useFakeTimers()
    const el = mount({ interactive: '', 'close-delay': '100', content: 'x' })
    await Promise.resolve()
    el.setAttribute('open', '')
    vi.advanceTimersByTime(0)
    // 鼠标从触发元素移入浮层
    const t = tip(el)
    t.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    vi.advanceTimersByTime(200) // 超过 close-delay 仍保持打开
    expect(t.getAttribute('aria-hidden')).toBe('false')
    t.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    vi.advanceTimersByTime(100)
    expect(t.getAttribute('aria-hidden')).toBe('true')
    vi.useRealTimers()
  })

  // ================= contextmenu 右键触发 =================

  it('trigger 含 contextmenu：右键打开（不阻止系统菜单）', async () => {
    const el = mount({ trigger: 'contextmenu', content: 'x' })
    await Promise.resolve()
    const btn = el.querySelector('button')!
    btn.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    await Promise.resolve()
    expect(tip(el).getAttribute('aria-hidden')).toBe('false')
  })

  it('trigger 不含 contextmenu：右键不打开', async () => {
    const el = mount({ trigger: 'hover', content: 'x' })
    await Promise.resolve()
    ;(el.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    )
    await Promise.resolve()
    expect(tip(el).getAttribute('aria-hidden')).toBe('true')
  })

  // ================= touch 长按触发 =================

  it('trigger 含 touch：pointerdown 长按后打开（touch-delay 默认 500ms）', async () => {
    vi.useFakeTimers()
    const el = mount({ trigger: 'touch', content: 'x' })
    await Promise.resolve()
    const btn = el.querySelector('button')!
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    vi.advanceTimersByTime(499)
    expect(tip(el).getAttribute('aria-hidden')).toBe('true')
    vi.advanceTimersByTime(2)
    expect(tip(el).getAttribute('aria-hidden')).toBe('false')
    vi.useRealTimers()
  })

  it('touch 长按中途 pointerup 取消打开', async () => {
    vi.useFakeTimers()
    const el = mount({ trigger: 'touch', content: 'x' })
    await Promise.resolve()
    const btn = el.querySelector('button')!
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    vi.advanceTimersByTime(600)
    expect(tip(el).getAttribute('aria-hidden')).toBe('true')
    vi.useRealTimers()
  })

  // ================= append-to 挂载点 =================

  it('append-to="body"：tip 移入 document.body 的 portal host（样式保真）', async () => {
    const el = mount({ open: '', content: 'x', 'append-to': 'body' })
    await Promise.resolve()
    const host = document.body.querySelector<HTMLElement>('[data-oas-tooltip-portal]')
    expect(host).not.toBeNull()
    const t = host!.shadowRoot!.querySelector('[part="tip"]')!
    expect(t).not.toBeNull()
    expect(t.getAttribute('aria-hidden')).toBe('false')
    // 原 shadow 内不再包含 tip（已移出）
    expect(el.shadowRoot!.querySelector('[part="tip"]')).toBeNull()
  })

  it('append-to="#target"：tip 移入指定容器的 portal host', async () => {
    const target = document.createElement('div')
    target.id = 'tt-target'
    document.body.appendChild(target)
    const el = mount({ open: '', content: 'x', 'append-to': '#tt-target' })
    await Promise.resolve()
    const host = target.querySelector<HTMLElement>('[data-oas-tooltip-portal]')
    expect(host).not.toBeNull()
    const t = host!.shadowRoot!.querySelector('[part="tip"]')!
    expect(t).not.toBeNull()
  })

  it('append-to 动态移除：tip 移回原 shadow，portal host 销毁', async () => {
    const el = mount({ open: '', content: 'x', 'append-to': 'body' })
    await Promise.resolve()
    el.removeAttribute('append-to')
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector('[part="tip"]')).not.toBeNull()
    expect(document.body.querySelector('[data-oas-tooltip-portal]')).toBeNull()
  })

  it('无 append-to：tip 留在原 shadow（默认挂载）', async () => {
    const el = mount({ open: '', content: 'x' })
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector('[part="tip"]')).not.toBeNull()
    expect(document.body.querySelector('[data-oas-tooltip-portal]')).toBeNull()
  })

  it('append-to + slot 富内容：slotted 节点桥接到 portal host light DOM（跨 host 分配不断供），拆除移回宿主', async () => {
    // 曾缺陷（与 popover P2 同族）：tip 移入 portal shadow 后，宿主 light DOM 的
    // [slot=content] 节点分配不到（slot 分配只看直接 host）→ 富内容在 portal 下不显示
    const el = mount({ open: '', content: 'x', 'append-to': 'body' })
    const rich = document.createElement('b')
    rich.setAttribute('slot', 'content')
    rich.textContent = '富内容'
    el.appendChild(rich)
    el.setAttribute('content', 'y') // 触发 update → ensurePortal 桥接后加的 slot 节点
    await Promise.resolve()
    const host = document.body.querySelector<HTMLElement>('[data-oas-tooltip-portal]')!
    expect(host.contains(rich)).toBe(true)
    const t = host.shadowRoot!.querySelector('[part="tip"]')!
    const slot = t.querySelector('slot[name="content"]') as HTMLSlotElement
    expect(slot.assignedNodes()).toContain(rich)
    // 拆除（动态移除 append-to）：节点移回宿主
    el.removeAttribute('append-to')
    await Promise.resolve()
    expect(el.contains(rich)).toBe(true)
  })

  // ================= 双轴偏移 offset / skidding =================

  it('offset="16"：主轴距离 16px（默认 8）', async () => {
    const el = mount({ open: '', content: 'x', placement: 'bottom', offset: '16' })
    const t = tip(el)
    stubRect(t, { left: 0, top: 0, width: 120, height: 36 })
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 200, top: 300, width: 64, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    await Promise.resolve()
    expect(t.style.top).toBe('348px') // 332 + 16
  })

  it('skidding="10"：交叉轴偏移 +10px', async () => {
    const el = mount({ open: '', content: 'x', placement: 'bottom', skidding: '10' })
    const t = tip(el)
    stubRect(t, { left: 0, top: 0, width: 120, height: 36 })
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 200, top: 300, width: 64, height: 32 })
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    await Promise.resolve()
    // 底部居中 x = 锚点中心 232 - popup 半宽 60 = 172 → +10 = 182
    expect(t.style.left).toBe('182px')
  })

  // ================= 颜色变体（token） =================

  it('color="primary"：tip 背景走 primary token（含暗色变体）', async () => {
    const el = mount({ open: '', content: 'x', color: 'primary' })
    await Promise.resolve()
    const t = tip(el)
    expect(t.style.getPropertyValue('--oas-tooltip-bg')).toBe('var(--oas-color-primary)')
    expect(t.style.getPropertyValue('--oas-tooltip-color')).toBe('var(--oas-color-text-on-primary)')
  })

  it('color="success"：语义色映射 token', async () => {
    const el = mount({ open: '', content: 'x', color: 'success' })
    await Promise.resolve()
    expect(tip(el).style.getPropertyValue('--oas-tooltip-bg')).toBe('var(--oas-color-success)')
  })

  it('color 移除后回落到默认（清空变量）', async () => {
    const el = mount({ open: '', content: 'x', color: 'primary' })
    await Promise.resolve()
    el.removeAttribute('color')
    await Promise.resolve()
    expect(tip(el).style.getPropertyValue('--oas-tooltip-bg')).toBe('')
  })

  // ================= 禁用触发元素兼容（span 包裹） =================

  it('触发元素为 disabled button：hover 不派发 → 绑定宿主仍然生效', async () => {
    const el = new OAStooltip()
    el.setAttribute('content', 'x')
    el.innerHTML = '<button disabled>不可用</button>'
    document.body.appendChild(el)
    await Promise.resolve()
    // disabled button 不派发 mouse 事件 → 在宿主（oas-tooltip）上派发 pointerenter
    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
    await Promise.resolve()
    expect(tip(el).getAttribute('aria-hidden')).toBe('false')
  })

  it('span 包裹 disabled button：hover span 即触发', async () => {
    const el = new OAStooltip()
    el.setAttribute('content', 'x')
    el.innerHTML = '<span><button disabled>不可用</button></span>'
    document.body.appendChild(el)
    await Promise.resolve()
    ;(el.querySelector('span') as HTMLElement).dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: false }),
    )
    await Promise.resolve()
    expect(tip(el).getAttribute('aria-hidden')).toBe('false')
  })

  // ================= 碰撞细调 collision-padding =================

  it('collision-padding="20"：视口避让边距 20px（默认 4）', async () => {
    const el = mount({
      open: '',
      content: 'x',
      placement: 'bottom',
      'collision-padding': '20',
    })
    const t = tip(el)
    stubRect(t, { left: 0, top: 0, width: 240, height: 36 })
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 0, top: 300, width: 64, height: 32 }) // 锚点贴左缘 → 避让
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    await Promise.resolve()
    expect(t.style.left).toBe('20px')
  })

  // ================= 箭头 merge 模式 =================

  it('arrow-position="merge" + *-start placement：箭头融角 data 属性', async () => {
    const el = mount({
      open: '',
      content: 'x',
      placement: 'bottom-start',
      'arrow-position': 'merge',
    })
    await Promise.resolve()
    const t = tip(el)
    expect(t.getAttribute('data-arrow-position')).toBe('merge')
  })

  // ================= fresh =================

  it('fresh 默认：关闭时内容仍更新（每次属性变化即时同步）', async () => {
    const el = mount({ content: 'a' })
    await Promise.resolve()
    el.setAttribute('content', 'b')
    await Promise.resolve()
    expect(tip(el).textContent).toContain('b')
  })

  // ================= auto-close =================

  it('auto-close="200"：打开后 200ms 自动关闭', async () => {
    vi.useFakeTimers()
    const el = mount({ trigger: 'click', 'auto-close': '200', content: 'x' })
    await Promise.resolve()
    ;(el.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    vi.advanceTimersByTime(0)
    expect(tip(el).getAttribute('aria-hidden')).toBe('false')
    vi.advanceTimersByTime(200)
    expect(tip(el).getAttribute('aria-hidden')).toBe('true')
    vi.useRealTimers()
  })

  // ================= trigger-keys =================

  it('trigger-keys="F1"：焦点在触发元素上按 F1 打开', async () => {
    // trigger="hover" 排除 focus 通道，隔离验证 trigger-keys 独立生效
    const el = mount({ trigger: 'hover', 'trigger-keys': 'F1', content: 'x' })
    await Promise.resolve()
    const btn = el.querySelector('button')!
    btn.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    await Promise.resolve()
    expect(tip(el).getAttribute('aria-hidden')).toBe('true') // hover trigger 下 focus 不打开
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'F1', bubbles: true }))
    await Promise.resolve()
    expect(tip(el).getAttribute('aria-hidden')).toBe('false')
  })

  it('trigger-keys 不匹配的按键不打开', async () => {
    const el = mount({ trigger: 'hover', 'trigger-keys': 'F1', content: 'x' })
    await Promise.resolve()
    const btn = el.querySelector('button')!
    btn.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    await Promise.resolve()
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await Promise.resolve()
    expect(tip(el).getAttribute('aria-hidden')).toBe('true')
  })

  // ================= 延迟 + interactive 组合：关闭后焦点还原 =================

  it('Esc 关闭后 hover 再次打开正常（定时器无孤儿）', async () => {
    const el = mount({ content: 'x' })
    await Promise.resolve()
    el.setAttribute('open', '')
    await Promise.resolve()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await Promise.resolve()
    ;(el.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true }),
    )
    await Promise.resolve()
    expect(tip(el).getAttribute('aria-hidden')).toBe('false')
  })

  // ================= 回归：hover 与 focus 两条触发路径定位一致 =================
  // 缺陷：tip-enter 进场动画 scale(0.9) 污染 getBoundingClientRect，定位按缩小 10% 的
  // 尺寸计算；且 focusin → setOpen(true) 的同值 setAttribute 仍触发 attributeChangedCallback
  // （Chromium 实测），导致 focus 路径多跑一次重定位——两条路径落点分歧。

  /** 模拟进场动画进行中：getBoundingClientRect 被 scale(0.9) 缩小，布局尺寸 offset* 为真值 */
  function stubAnimTip(t: HTMLElement, real: { width: number; height: number }): void {
    stubRect(t, { left: 0, top: 0, width: real.width * 0.9, height: real.height * 0.9 })
    Object.defineProperty(t, 'offsetWidth', { value: real.width, configurable: true })
    Object.defineProperty(t, 'offsetHeight', { value: real.height, configurable: true })
  }

  it('定位测量用布局尺寸：不受进场动画 scale(0.9) 污染（top = 锚点顶 - 真实高 - 8）', async () => {
    const el = mount({ content: '提示在上方', placement: 'top' })
    await Promise.resolve()
    const t = tip(el)
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 400, top: 300, width: 64, height: 32 })
    stubAnimTip(t, { width: 81, height: 32 }) // 动画中 gBCR=72.9x28.8，布局真值 81x32
    setViewport(1280, 800)
    btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    await Promise.resolve()
    // 真实布局尺寸：top = 300 - 32 - 8 = 260；left = (400+32) - 81/2 = 391.5
    expect(t.style.top).toBe('260px')
    expect(t.style.left).toBe('391.5px')
    // 当前缺陷（按 72.9x28.8 计算）会得到 263.2px / 395.55px
  })

  it('focus 通道在已打开时不重复写 open 属性（同值 setAttribute 也触发 update/重定位）', async () => {
    const el = mount({ content: 'x', placement: 'top' })
    await Promise.resolve()
    const btn = el.querySelector('button')!
    btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    await Promise.resolve()
    expect(el.hasAttribute('open')).toBe(true)
    const spy = vi.spyOn(el, 'setAttribute')
    // 已打开状态下焦点到达（click → mousedown → focusin 路径）
    btn.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    await Promise.resolve()
    expect(spy).not.toHaveBeenCalledWith('open', '')
    spy.mockRestore()
  })

  it('hover 打开与 focus 打开落点一致（同一 placement 不因触发方式改变位置）', async () => {
    setViewport(1280, 800)
    // hover 路径（动画进行中测量）
    const a = mount({ content: '提示在上方', placement: 'top' })
    await Promise.resolve()
    const ta = tip(a)
    const btnA = a.querySelector('button')!
    stubRect(btnA, { left: 400, top: 300, width: 64, height: 32 })
    stubAnimTip(ta, { width: 81, height: 32 })
    btnA.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    await Promise.resolve()
    // focus 路径（全新实例：等价几何，动画已结束、gBCR 为真值）
    const b = mount({ content: '提示在上方', placement: 'top' })
    await Promise.resolve()
    const tb = tip(b)
    const btnB = b.querySelector('button')!
    stubRect(btnB, { left: 400, top: 300, width: 64, height: 32 })
    stubAnimTip(tb, { width: 81, height: 32 })
    Object.defineProperty(tb, 'offsetWidth', { value: 81, configurable: true })
    Object.defineProperty(tb, 'offsetHeight', { value: 32, configurable: true })
    stubRect(tb, { left: 0, top: 0, width: 81, height: 32 })
    btnB.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    await Promise.resolve()
    expect(tb.style.top).toBe(ta.style.top)
    expect(tb.style.left).toBe(ta.style.left)
  })

  it('arrow-point-at-center 箭头 clamp 用布局尺寸（视口避让偏移后箭头指向锚点）', async () => {
    // 锚点贴右缘：面板被视口避让左移，箭头 clamp 到面板内时按真实布局尺寸（81 宽）
    const el = mount({ content: 'x', placement: 'top', 'arrow-point-at-center': '' })
    await Promise.resolve()
    const t = tip(el)
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 450, top: 300, width: 60, height: 32 })
    stubAnimTip(t, { width: 81, height: 32 })
    setViewport(500, 800)
    btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    await Promise.resolve()
    // 真实尺寸：left = clamp(480-40.5, 4, 500-81-4=415) = 415 → local=480-415=65 → arrow 65-4=61px
    const arrow = t.querySelector<HTMLElement>('[data-popper-arrow]')!
    expect(arrow.style.left).toBe('61px')
    // 当前缺陷（72.9 宽）会得到 52.9px
  })

  // ================= 回归：箭头形态（merge 8 向直角三角贴角共边 + 窄气泡圆角封顶） =================
  // 曾现缺陷 1：merge 规则用 $='-start'/'-end' 后缀匹配、恒置零「顶」角、恒写水平轴偏移——
  // top 系零错角（该零底角却零了顶角，圆角残留 × 菱形交界出豁口）、left-start 箭头被
  // left:-4px 拉到对侧边、*-end 箭头距角 16px 贴不上。
  // 曾现缺陷 2（用户两轮反馈）：merge 修正后箭头仍是 8×8 方块 rotate(45deg) 旋转菱形，
  // 菱心骑在角点上、尖端沿 45° 斜向凸出——不指向锚点，观感「怪」。改为通用形态：
  // 不旋转方块整悬面板外贴角（主轴边外 -8px、起止侧边线贴齐 0）+ clip-path 裁直角三角，
  // 直角顶点精确落面板角点，两直角边与角两边共线，斜边 45° 朝面板内，尖端正交指向锚点侧。
  // 曾现缺陷 3：窄气泡（交叉轴 < 箭头底宽 8√2≈11.31 + 2×radius）时圆角曲线侵入箭头
  // 底边衔接区，接缝两侧凹口（空内容 16px 气泡实测剖面 14.13→11.1 骤缩）。

  /** shadow 内 STYLE 文本（空白折叠后做规则断言） */
  function styleCss(el: OAStooltip): string {
    return (el.shadowRoot!.querySelector('style')!.textContent ?? '').replace(/\s+/g, ' ')
  }

  it('merge 逐角置零：8 个 -start/--end placement 的角 radius 规则各就各位', () => {
    const css = styleCss(mount())
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
        `[data-arrow-position='merge'][data-placement='${p}'] { ${decl} }`,
      )
    }
    // 旧的后缀匹配规则（恒置零顶角）不得残留
    expect(css).not.toContain("[data-placement$='-start']")
    expect(css).not.toContain("[data-placement$='-end']")
  })

  it('merge 直角三角贴角共边：8 向箭头盒整悬面板外、transform none、clip-path 直角三角', () => {
    const css = styleCss(mount())
    // 盒定位：主轴边外整悬 -8px（盒底贴主轴边）、起止侧边线贴齐 0；不旋转 + clip-path 直角三角
    const rules: Record<string, string> = {
      'bottom-start':
        'top: -8px; left: 0; transform: none; clip-path: polygon(0% 0%, 0% 100%, 100% 100%);',
      'bottom-end':
        'top: -8px; right: 0; transform: none; clip-path: polygon(100% 0%, 0% 100%, 100% 100%);',
      'top-start':
        'bottom: -8px; left: 0; transform: none; clip-path: polygon(0% 0%, 100% 0%, 0% 100%);',
      'top-end':
        'bottom: -8px; right: 0; transform: none; clip-path: polygon(0% 0%, 100% 0%, 100% 100%);',
      'left-start':
        'right: -8px; top: 0; transform: none; clip-path: polygon(0% 0%, 100% 0%, 0% 100%);',
      'left-end':
        'right: -8px; bottom: 0; transform: none; clip-path: polygon(0% 0%, 0% 100%, 100% 100%);',
      'right-start':
        'left: -8px; top: 0; transform: none; clip-path: polygon(0% 0%, 100% 0%, 100% 100%);',
      'right-end':
        'left: -8px; bottom: 0; transform: none; clip-path: polygon(100% 0%, 0% 100%, 100% 100%);',
    }
    for (const [p, decl] of Object.entries(rules)) {
      expect(css, `merge ${p} 箭头应为直角三角贴角共边`).toContain(
        `.tip[data-arrow-position='merge'][data-placement='${p}'] .arrow { ${decl} }`,
      )
    }
    // 旧「菱心骑角」规则（盒半宽 -4px 居中骑角）不得残留
    expect(css).not.toContain(
      "[data-arrow-position='merge'][data-placement='bottom-start'] .arrow,",
    )
    expect(css).not.toContain("[data-arrow-position='merge'][data-placement='left-start'] .arrow,")
  })

  it('merge 8 向三角几何：直角顶点=面板角点、两直角边与角两边共线、尖端正交外探 8px 指向锚点侧', () => {
    const css = styleCss(mount())
    // 每向：clip-path 顶点（盒内 8×8 百分比坐标）→ 面板角点位于盒的哪个角 + 三角朝向
    // corner: 面板角点在箭头盒内的位置；edge: 贴边腿顶点相对角点的位移（沿面板边向内 8px，
    // 该腿与面板真实边段共边）；tip: 尖端相对角点的正交位移 8px（指向锚点侧）
    const geom: Record<
      string,
      { corner: [number, number]; edge: [number, number]; tip: [number, number] }
    > = {
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
          `\\.tip\\[data-arrow-position='merge'\\]\\[data-placement='${p}'\\] \\.arrow \\{ [^}]*clip-path: polygon\\(([^)]+)\\)`,
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
      expect(near(rv[0], corner[0]) && near(rv[1], corner[1]), `${p} 直角顶点应落面板角点`).toBe(
        true,
      )
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

  it('merge + arrow-point-at-center：箭头钉死角点，不写内联偏移（直角三角不脱离角）', async () => {
    const el = mount({
      open: '',
      content: 'x',
      placement: 'bottom-start',
      'arrow-position': 'merge',
      'arrow-point-at-center': '',
    })
    const t = tip(el)
    stubRect(t, { left: 0, top: 0, width: 240, height: 36 })
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 12, top: 300, width: 64, height: 32 }) // 锚点中心≠面板中心（有内联偏移动机）
    setViewport(1280, 800)
    el.setAttribute('content', 'x')
    await Promise.resolve()
    const arrow = t.querySelector<HTMLElement>('[data-popper-arrow]')!
    expect(arrow.style.left).toBe('')
    expect(arrow.style.top).toBe('')
  })

  it('窄气泡圆角封顶公式：radius = max(0, min(token, (交叉轴-11.31)/2))，未写变量时不封顶', () => {
    const css = styleCss(mount())
    expect(css).toContain(
      'border-radius: max(0px, min(var(--oas-radius-sm), calc((var(--oas-tip-cross, 999px) - 11.31px) / 2)));',
    )
  })

  it('position() 写入 --oas-tip-cross：top/bottom 系取 offsetWidth（布局尺寸，不受动画污染）', async () => {
    const el = mount({ content: '提示在上方', placement: 'top' })
    await Promise.resolve()
    const t = tip(el)
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 400, top: 300, width: 64, height: 32 })
    stubAnimTip(t, { width: 81, height: 32 })
    setViewport(1280, 800)
    btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    await Promise.resolve()
    // 布局真值 81（非动画中的 72.9）；81 > 11.31 + 2×radius → CSS 不实际封顶，但变量已挂
    expect(t.style.getPropertyValue('--oas-tip-cross')).toBe('81px')
  })

  it('left/right 系取 offsetHeight 作交叉轴', async () => {
    const el = mount({ content: 'x', placement: 'right' })
    await Promise.resolve()
    const t = tip(el)
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 300, top: 300, width: 64, height: 32 })
    stubAnimTip(t, { width: 60, height: 32 })
    setViewport(1280, 800)
    btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    await Promise.resolve()
    expect(t.style.getPropertyValue('--oas-tip-cross')).toBe('32px')
  })

  it('窄气泡（offsetWidth=16）：--oas-tip-cross=16px，CSS 封顶 (16-11.31)/2=2.34px 消除接缝凹口', async () => {
    const el = mount({ content: '', placement: 'bottom' })
    await Promise.resolve()
    const t = tip(el)
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 400, top: 300, width: 64, height: 32 })
    stubRect(t, { left: 0, top: 0, width: 16, height: 24 })
    Object.defineProperty(t, 'offsetWidth', { value: 16, configurable: true })
    Object.defineProperty(t, 'offsetHeight', { value: 24, configurable: true })
    setViewport(1280, 800)
    btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    await Promise.resolve()
    expect(t.style.getPropertyValue('--oas-tip-cross')).toBe('16px')
  })

  it('无布局尺寸（offsetWidth=0，happy-dom 无引擎）：不写变量，回落不封顶', async () => {
    const el = mount({ content: 'x', placement: 'top' })
    await Promise.resolve()
    const t = tip(el)
    const btn = el.querySelector('button')!
    stubRect(btn, { left: 400, top: 300, width: 64, height: 32 })
    stubRect(t, { left: 0, top: 0, width: 81, height: 32 })
    setViewport(1280, 800)
    btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    await Promise.resolve()
    expect(t.style.getPropertyValue('--oas-tip-cross')).toBe('')
  })
})
