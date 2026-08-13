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
    expect(t.textContent).toBe('坐标提示')
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
})
