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
      ).toBe('-4px')
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
})
