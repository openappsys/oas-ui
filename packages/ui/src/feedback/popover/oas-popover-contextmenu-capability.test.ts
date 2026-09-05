import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASPopover } from './index.js'
import { hasPopoverCapability } from './oas-popover-capability.js'

// 本文件验证「contextmenu 能力包未 import（core-only）」的边界行为：
// 右键光标定位 / 触屏长按 / 断点响应静默失效 + dev 告警（同值去重），
// trigger=contextmenu 的基础右键打开（core 行为）保留。
// 注意：不得在此文件 import './contextmenu/index.js'——否则能力注册表被填充，core-only 语义失效。
// （vitest 按文件隔离模块图，本文件与 oas-popover.test.ts 的注册表互不影响。）
//
// 告警去重是模块级（同控件惯例：同值告警整页只一次），因此首个带右键族配置的 mount
// 必须发生在「dev 告警」用例内；后续用例再挂右键族配置不会重复触发 console.warn。

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

/** 固定视口尺寸（定位断言依赖确定性的 viewport） */
function setViewport(w: number, h: number): void {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true })
}

/** 构造带 touches 的 touch 事件（happy-dom 不完整支持 Touch，挂数组兜底） */
function touchEvent(
  type: string,
  touches: Array<{ clientX: number; clientY: number }>,
): Event {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(e, 'touches', { value: touches })
  return e
}

/** 真实计时器等待（长按延时断言） */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('OASPopover contextmenu 能力边界（core-only：未 import contextmenu 能力包）', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    document.body.innerHTML = ''
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    unmountAll()
    document.body.innerHTML = ''
    warnSpy.mockRestore()
  })

  it('能力注册表为空：contextmenu 未注册，构造的 OASPopover 无能力注入', () => {
    expect(hasPopoverCapability('contextmenu')).toBe(false)
  })

  it('dev 告警：右键族配置 + 未 import 能力 → 提示按需 import（同值去重：多实例只告警一次）', () => {
    const isCtxHint = (call: unknown[]) => String(call[0]).includes('feedback/popover/contextmenu')
    // 首个带右键族配置的 mount 必须在此（模块级去重后不再告警）
    mount({ trigger: 'click contextmenu' })
    const first = warnSpy.mock.calls.filter(isCtxHint)
    expect(first.length, '首个带右键族配置的实例应告警一次').toBe(1)
    expect(String(first[0]![0])).toContain('@oas-ui/ui/feedback/popover/contextmenu')
    // 更多右键族配置实例（长按/断点简写）：同值去重，不再重复告警
    warnSpy.mockClear()
    mount({ trigger: 'contextmenu', 'long-press-delay': '800' })
    mount({ open: '', placement: 'bottom md:right' })
    expect(warnSpy.mock.calls.filter(isCtxHint).length).toBe(0)
  })

  it('普通 hover/click 浮层不告警、功能正常（无右键族配置不触发 false positive）', () => {
    const el = mount({ trigger: 'click hover', 'hover-delay': '0' })
    ;(el.querySelector('button') as HTMLElement).click()
    expect(el.hasAttribute('open')).toBe(true)
    const ctxWarns = warnSpy.mock.calls.filter((call: unknown[]) =>
      String(call[0]).includes('feedback/popover/contextmenu'),
    )
    expect(ctxWarns.length).toBe(0)
  })

  it('光标定位静默失效：右键仍基础打开（core 行为），但面板按锚点定位而非光标坐标', () => {
    const el = mount({ trigger: 'contextmenu', placement: 'right' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(1280, 800)
    el.querySelector('button')!.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 600,
        clientY: 200,
      }),
    )
    expect(el.hasAttribute('open'), 'trigger=contextmenu 基础右键打开仍可用').toBe(true)
    // 无光标定位：面板锚定触发元素（placement=right → left = 400+80+8 = 488、top = 锚点中心 316-30 = 286）
    expect(p.style.left).toBe('488px')
    expect(p.style.top).toBe('286px')
  })

  it('触屏长按静默失效：长按不打开（core 不绑 touch 监听），触摸事件无副作用', async () => {
    const el = mount({ trigger: 'contextmenu', placement: 'right' })
    const btn = el.querySelector('button')!
    btn.dispatchEvent(touchEvent('touchstart', [{ clientX: 300, clientY: 120 }]))
    await sleep(600) // 超过默认 500ms 长按时长仍不打开
    expect(el.hasAttribute('open')).toBe(false)
    // 滑动 / 抬起路径不抛错（无监听时事件自然空转）
    expect(() => {
      btn.dispatchEvent(touchEvent('touchmove', [{ clientX: 340, clientY: 130 }]))
      btn.dispatchEvent(touchEvent('touchend', []))
    }).not.toThrow()
  })

  it('placement 断点简写静默失效："bottom md:right" 回落基础值 bottom（宽屏不做断点适配）', () => {
    const el = mount({ open: '', placement: 'bottom md:right' })
    const p = panelOf(el)
    stubPanelRect(p, 200, 60)
    stubRect(el.querySelector('button')!, { left: 400, top: 300, width: 80, height: 32 })
    setViewport(900, 800) // >= md(768)：若断点能力在应取 right
    el.setAttribute('content', 'x')
    expect(p.getAttribute('data-placement')).toBe('bottom')
  })

  it('size 断点简写静默失效："small md:large" 回落基础值 small', () => {
    const el = mount({ open: '', size: 'small md:large' })
    setViewport(900, 800)
    el.setAttribute('content', 'x')
    expect(panelOf(el).getAttribute('data-size')).toBe('small')
  })
})
