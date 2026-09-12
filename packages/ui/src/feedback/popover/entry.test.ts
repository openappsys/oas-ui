import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASPopover } from './index.js'
import { hasPopoverCapability } from './oas-popover-capability.js'

// 本文件验证「主路径入口语义」（v2.5.0 L3 子路径语义修正）：
// 主路径 index.js 顶部 import contextmenu 能力包（import 即注册），因此经
// `@oas-ui/ui/feedback/popover` 引入时右键族能力默认就位——右键光标定位 / 触屏长按 /
// 断点响应 直接可用，无需再显式引能力包（恢复 2.4.0 语义）。
// 纯核（/core 子路径不含能力）的边界由 ./core-entry.test.ts 单独覆盖。
// vitest 按文件隔离模块图，本文件独享一份「index 即含能力」的注册表起点。

const mounted: OASPopover[] = []

function mount(attrs: Record<string, string> = {}): OASPopover {
  const el = new OASPopover()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<button>触发</button>`
  document.body.appendChild(el)
  mounted.push(el)
  return el
}

function unmountAll(): void {
  while (mounted.length) {
    const el = mounted.pop()
    if (el) el.remove()
  }
}

function panelOf(el: OASPopover): HTMLElement {
  return el.shadowRoot!.querySelector('[part="panel"]')!
}

/** happy-dom 无布局引擎：stub 面板 getBoundingClientRect，让 computePosition 拿到固定尺寸 */
function stubPanelRect(p: HTMLElement, w: number, h: number): void {
  p.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      width: w,
      height: h,
      left: 0,
      top: 0,
      right: w,
      bottom: h,
      toJSON: () => ({}),
    }) as DOMRect
}

/** 通用 stub：任意元素固定矩形（锚点用） */
function stubRect(el: HTMLElement, r: { left: number; top: number; width: number; height: number }): void {
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

/** 固定视口尺寸（定位断言依赖确定性的 viewport） */
function setViewport(w: number, h: number): void {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true })
}

/** 构造带 touches 的 touch 事件（happy-dom 不完整支持 Touch，挂数组兜底） */
function touchEvent(type: string, touches: Array<{ clientX: number; clientY: number }>): Event {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(e, 'touches', { value: touches })
  return e
}

/** 真实计时器等待（长按延时断言） */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('OASPopover 主路径入口（index 内含 contextmenu 能力）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    unmountAll()
    document.body.innerHTML = ''
  })

  it('能力注册表已含 contextmenu（主路径 index import 即注册）', () => {
    expect(hasPopoverCapability('contextmenu')).toBe(true)
  })

  it('触屏长按：仅 import 主路径即可用长按打开并定位到触点', async () => {
    const el = mount({ trigger: 'contextmenu', placement: 'right', 'long-press-delay': '20' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(1280, 800)
    el.querySelector('button')!.dispatchEvent(touchEvent('touchstart', [{ clientX: 300, clientY: 120 }]))
    await sleep(80) // 超过 long-press-delay=20
    expect(el.hasAttribute('open')).toBe(true)
    expect(p.style.left).toBe('308px') // 300 + 8（光标点锚定）
    expect(p.style.top).toBe('90px') // 120 - 30
  })

  it('placement 断点简写：仅 import 主路径即可宽屏响应 "bottom md:right" → right', () => {
    const el = mount({ open: '', placement: 'bottom md:right' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(900, 800) // >= md(768)：断点能力若在应取 right
    el.setAttribute('content', 'x')
    expect(p.getAttribute('data-placement')).toBe('right')
  })
})
