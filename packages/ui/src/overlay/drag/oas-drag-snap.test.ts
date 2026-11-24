import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASDrag } from './index.js'

const VIEWPORT = { width: 400, height: 300 }

function mount(attrs: Record<string, string> = {}, html = '<span>浮块</span>'): OASDrag {
  const el = new OASDrag()
  el.innerHTML = html
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  document.body.appendChild(el)
  return el
}

/** 以「未施加 transform 的基准矩形」+ 当前位移推导宿主矩形（钳制算法依赖它） */
function stubRect(el: OASDrag, left = 100, top = 100, width = 80, height = 40): void {
  el.getBoundingClientRect = (() => {
    const position = el.position
    return {
      left: left + position.x,
      top: top + position.y,
      right: left + position.x + width,
      bottom: top + position.y + height,
      width,
      height,
      x: left + position.x,
      y: top + position.y,
      toJSON: () => undefined,
    } as DOMRect
  }) as Element['getBoundingClientRect']
}

function pointer(type: string, x: number, y: number, pointerId = 1): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    button: 0,
    pointerId,
    clientX: x,
    clientY: y,
  })
}

/** 从 (0,0) 起拖到 (dx,dy) 松手（单次 move 决定最终几何） */
function dragTo(el: OASDrag, dx: number, dy: number): void {
  el.dispatchEvent(pointer('pointerdown', 0, 0))
  el.dispatchEvent(pointer('pointermove', dx, dy))
  el.dispatchEvent(pointer('pointerup', dx, dy))
}

function snapHint(el: OASDrag): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="snap-hint"]')!
}

describe('OASDrag 吸附（网格 / 吸附点）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    window.localStorage.clear()
    Object.defineProperty(window, 'innerWidth', { value: VIEWPORT.width, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: VIEWPORT.height, configurable: true })
  })
  afterEach(() => {
    document.body.innerHTML = ''
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('snap 网格尺寸：松手落点对齐到最近网格点，并补一次吸附后的 oas-drag', () => {
    const el = mount({ snap: '10' })
    stubRect(el)
    const drags: Array<Record<string, unknown>> = []
    el.addEventListener('oas-drag', (e) => drags.push((e as CustomEvent).detail as Record<string, unknown>))
    dragTo(el, 37, 21)
    expect(el.position).toEqual({ x: 40, y: 20 })
    expect(drags[drags.length - 1]).toMatchObject({ x: 40, y: 20, source: 'pointer' })
    expect(el.style.transform).toContain('40px')
  })

  it('snap="grid"：字面量按 8px 默认网格吸附', () => {
    const el = mount({ snap: 'grid' })
    stubRect(el)
    dragTo(el, 11, 13)
    expect(el.position).toEqual({ x: 8, y: 16 })
  })

  it('snap-targets：距离阈值内精确吸附，超出阈值保持原位', () => {
    const el = mount({ 'snap-targets': JSON.stringify([{ x: 120, y: 40 }]) })
    stubRect(el)
    dragTo(el, 114, 36)
    expect(el.position).toEqual({ x: 120, y: 40 })

    document.body.innerHTML = ''
    const el2 = mount({ 'snap-targets': JSON.stringify([{ x: 120, y: 40 }]), 'snap-threshold': '5' })
    stubRect(el2)
    dragTo(el2, 100, 20)
    expect(el2.position).toEqual({ x: 100, y: 20 })
  })

  it('非法 snap / snap-targets：一次性 devWarn 且不吸附（拖拽照常生效）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ snap: 'abc', 'snap-targets': '[{x:' })
    stubRect(el)
    dragTo(el, 33, 17)
    expect(el.position).toEqual({ x: 33, y: 17 })
    const messages = warn.mock.calls.map((call) => String(call[0])).join('\n')
    expect(messages).toContain('非法 snap')
    expect(messages).toContain('snap-targets 不是合法 JSON')
  })

  it('键盘微调与 position 写入不被吸附改写（1px 精确步进保持）', () => {
    const el = mount({ snap: '10' })
    stubRect(el)
    el.focus()
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }))
    expect(el.position).toEqual({ x: 1, y: 0 })
    el.position = { x: 7, y: 3 }
    expect(el.position).toEqual({ x: 7, y: 3 })
  })

  it('拖拽过程中接近吸附点显示提示环，离开后隐藏（视觉提示）', () => {
    const el = mount({ 'snap-targets': JSON.stringify([{ x: 50, y: 50 }]) })
    stubRect(el)
    el.dispatchEvent(pointer('pointerdown', 0, 0))
    el.dispatchEvent(pointer('pointermove', 46, 46))
    const hint = snapHint(el)
    expect(hint.hidden).toBe(false)
    expect(hint.getAttribute('aria-hidden')).toBe('true')

    el.dispatchEvent(pointer('pointermove', 0, 0))
    expect(hint.hidden).toBe(true)
    el.dispatchEvent(pointer('pointerup', 0, 0))
  })

  it('axis="x" 下吸附仍遵守单轴约束（纵向位移保持 0）', () => {
    const el = mount({ snap: '10', axis: 'x' })
    stubRect(el)
    dragTo(el, 37, 21)
    expect(el.position).toEqual({ x: 40, y: 0 })
  })
})
