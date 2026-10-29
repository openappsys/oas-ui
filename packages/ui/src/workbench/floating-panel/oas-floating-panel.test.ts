import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import zhCN from '@oas-ui/i18n/zh-CN'
import '@oas-ui/i18n'
import { OASFloatingPanel } from './index.js'
import type { FloatingPanelProps } from './index.js'
import { floatingPanelStack } from './panel-stack.js'
import { DEFAULT_RECT } from './geometry.js'
import { pushEscapeLayer } from '../../shared/overlay-stack.js'

/**
 * oas-floating-panel 单元测试。
 *
 * happy-dom 限制：不解析 CSS 类样式与 var()，视觉断言走「内联 style / 属性钩子 / shadow style 文本」；
 * 几何矩阵由 geometry.test.ts 覆盖（纯函数），此处验证属性↔状态、事件 detail、生命周期与交互接线。
 */

type Detail = Record<string, unknown>

interface Recorded {
  type: string
  detail: Detail
}

function mount(attrs: Record<string, string> = {}, html = ''): OASFloatingPanel {
  const el = new OASFloatingPanel()
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  if (html) el.innerHTML = html
  document.body.appendChild(el)
  return el
}

function record(el: Element): Recorded[] {
  const events: Recorded[] = []
  for (const type of ['oas-before-close', 'oas-open-change', 'oas-move', 'oas-resize', 'oas-activate']) {
    el.addEventListener(type, (e) => events.push({ type, detail: (e as CustomEvent<Detail>).detail }))
  }
  return events
}

const frame = (el: OASFloatingPanel): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="frame"]')!
const titleEl = (el: OASFloatingPanel): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="title"]')!
const titleText = (el: OASFloatingPanel): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('.title-text')!
const closeBtn = (el: OASFloatingPanel): HTMLButtonElement =>
  el.shadowRoot!.querySelector<HTMLButtonElement>('[part="close"]')!
const handles = (el: OASFloatingPanel): HTMLElement[] => [
  ...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="handle"]'),
]
const styleText = (el: OASFloatingPanel): string => el.shadowRoot!.querySelector('style')!.textContent ?? ''
const frameStyle = (el: OASFloatingPanel) => ({
  left: frame(el).style.left,
  top: frame(el).style.top,
  width: frame(el).style.width,
  height: frame(el).style.height,
})

function pressEscape(): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
}

/** 穿透 shadow 的当前焦点（happy-dom 会把 shadow 焦点重定向到宿主） */
function activeInner(): Element | null {
  let active: Element | null = document.activeElement
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
  return active
}

beforeEach(() => {
  document.body.innerHTML = ''
  floatingPanelStack.clear()
  setLocale(zhCN)
})

afterEach(() => {
  floatingPanelStack.clear()
  document.body.innerHTML = ''
  delete (window as Window & { __OAS_SSR__?: boolean }).__OAS_SSR__
  vi.restoreAllMocks()
})

// ===== 结构与渲染 =====

describe('OASFloatingPanel 结构', () => {
  it('渲染 dialog 语义骨架、标题/关闭钮、默认与 title 插槽、八个手柄', () => {
    const el = mount({ open: '', rect: '10,20,300,200' })
    const f = frame(el)
    expect(f.getAttribute('role')).toBe('dialog')
    expect(f.getAttribute('aria-modal')).toBe('false')
    expect(f.getAttribute('tabindex')).toBe('0')
    expect(el.shadowRoot!.querySelectorAll('[part="titlebar"]').length).toBe(1)
    expect(el.shadowRoot!.querySelectorAll('[part="content"]').length).toBe(1)
    expect(el.shadowRoot!.querySelectorAll('slot[name="title"]').length).toBe(1)
    expect(el.shadowRoot!.querySelectorAll('[part="content"] slot:not([name])').length).toBe(1)
    expect(closeBtn(el).getAttribute('type')).toBe('button')
    expect(closeBtn(el).querySelectorAll('svg').length).toBe(1)
    expect(handles(el).map((h) => h.dataset.edge)).toEqual(['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'])
    for (const h of handles(el)) expect(h.getAttribute('aria-hidden')).toBe('true')
  })

  it('缺省关闭：宿主无 open、框体无 data-open、样式表含关闭态隐藏规则', () => {
    const el = mount()
    expect(el.hasAttribute('open')).toBe(false)
    expect(frame(el).hasAttribute('data-open')).toBe(false)
    expect(styleText(el)).toContain(':host(:not([open]))')
    expect(styleText(el)).toContain('display: none')
  })

  it('打开态打 data-open；外部写 open 属性静默吸收', () => {
    const el = mount()
    const events = record(el)
    el.setAttribute('open', '')
    expect(frame(el).hasAttribute('data-open')).toBe(true)
    expect(events, '外部写属性不派发 open-change').toEqual([])
    el.removeAttribute('open')
    expect(frame(el).hasAttribute('data-open')).toBe(false)
    expect(events).toEqual([])
  })

  it('rect 属性驱动内联定位；缺省/非法回落缺省 rect', () => {
    const el = mount({ open: '', rect: '10,20,300,200' })
    expect(frameStyle(el)).toEqual({ left: '10px', top: '20px', width: '300px', height: '200px' })
    expect(el.rect).toEqual({ x: 10, y: 20, width: 300, height: 200 })

    el.setAttribute('rect', 'bad')
    expect(frameStyle(el)).toEqual({
      left: `${DEFAULT_RECT.x}px`,
      top: `${DEFAULT_RECT.y}px`,
      width: `${DEFAULT_RECT.width}px`,
      height: `${DEFAULT_RECT.height}px`,
    })
  })

  it('rect property 读写同源（setter 写属性，取整格式化）', () => {
    const el = mount({ open: '' })
    el.rect = { x: 12.4, y: 30.6, width: 260, height: 180 }
    expect(el.getAttribute('rect')).toBe('12,31,260,180')
    expect(el.rect).toEqual({ x: 12, y: 31, width: 260, height: 180 })
    expect(frameStyle(el)).toEqual({ left: '12px', top: '31px', width: '260px', height: '180px' })
  })

  it('FloatingPanelProps.rect 同时接受对象与字符串（与访问器放宽一致）', () => {
    const asObject: FloatingPanelProps = { rect: { x: 0, y: 0, width: 100, height: 80 } }
    const asString: FloatingPanelProps = { rect: '0,0,100,80' }
    expect(asObject.rect).toEqual({ x: 0, y: 0, width: 100, height: 80 })
    expect(asString.rect).toBe('0,0,100,80')
  })

  it('min / max 约束外部 rect；min > max 以 min 为准', () => {
    const el = mount({ open: '', rect: '0,0,10,10', min: '200,100', max: '400,300' })
    expect(frameStyle(el)).toEqual({ left: '0px', top: '0px', width: '200px', height: '100px' })
    el.setAttribute('rect', '0,0,999,999')
    expect(frameStyle(el)).toEqual({ left: '0px', top: '0px', width: '400px', height: '300px' })

    el.setAttribute('min', '500,500')
    el.setAttribute('max', '100,100')
    el.setAttribute('rect', '0,0,300,300')
    expect(frameStyle(el)).toEqual({ left: '0px', top: '0px', width: '500px', height: '500px' })
  })

  it('open property 反射', () => {
    const el = mount()
    expect(el.open).toBe(false)
    el.open = true
    expect(el.hasAttribute('open')).toBe(true)
    el.open = false
    expect(el.hasAttribute('open')).toBe(false)
  })
})

// ===== 开合与事件 =====

describe('OASFloatingPanel 开合事件', () => {
  it('show()：写属性 + open-change { open:true, reason:show, source:api } 恰好一次', () => {
    const el = mount()
    const events = record(el)
    el.show()
    expect(el.hasAttribute('open')).toBe(true)
    const changes = events.filter((e) => e.type === 'oas-open-change')
    expect(changes).toEqual([{ type: 'oas-open-change', detail: { open: true, reason: 'show', source: 'api' } }])
    el.show()
    expect(events.filter((e) => e.type === 'oas-open-change')).toHaveLength(1)
  })

  it('close()：before-close → open-change { open:false, reason:method, source:api }，返回 true', () => {
    const el = mount({ open: '' })
    const events = record(el)
    const closed = el.close()
    expect(closed).toBe(true)
    expect(el.hasAttribute('open')).toBe(false)
    expect(events).toEqual([
      { type: 'oas-before-close', detail: { reason: 'method', source: 'api' } },
      { type: 'oas-open-change', detail: { open: false, reason: 'method', source: 'api' } },
    ])
  })

  it('before-close preventDefault：不关闭、不写属性、不发 open-change，close() 返回 false', () => {
    const el = mount({ open: '' })
    const events: Recorded[] = []
    el.addEventListener('oas-before-close', (e) => {
      events.push({ type: 'oas-before-close', detail: (e as CustomEvent<Detail>).detail })
      e.preventDefault()
    })
    el.addEventListener('oas-open-change', (e) =>
      events.push({ type: 'oas-open-change', detail: (e as CustomEvent).detail }),
    )
    expect(el.close()).toBe(false)
    expect(el.hasAttribute('open')).toBe(true)
    expect(frame(el).hasAttribute('data-open')).toBe(true)
    expect(events).toEqual([{ type: 'oas-before-close', detail: { reason: 'method', source: 'api' } }])
  })

  it('关闭钮：before-close { reason:close-button, source:user } → open-change；否决则保持打开', () => {
    const el = mount({ open: '' })
    const events = record(el)
    closeBtn(el).click()
    expect(events).toEqual([
      { type: 'oas-before-close', detail: { reason: 'close-button', source: 'user' } },
      { type: 'oas-open-change', detail: { open: false, reason: 'close-button', source: 'user' } },
    ])
    expect(el.hasAttribute('open')).toBe(false)

    // 再次打开 + 否决
    el.show()
    el.addEventListener('oas-before-close', (e) => e.preventDefault())
    closeBtn(el).click()
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('Esc：before-close { reason:esc, source:user } → open-change；关闭后 Esc 无事件', () => {
    const el = mount({ open: '' })
    const events = record(el)
    pressEscape()
    expect(events).toEqual([
      { type: 'oas-before-close', detail: { reason: 'esc', source: 'user' } },
      { type: 'oas-open-change', detail: { open: false, reason: 'esc', source: 'user' } },
    ])
    expect(el.hasAttribute('open')).toBe(false)
    pressEscape()
    expect(events).toHaveLength(2)
  })

  it('Esc 层级：后开的子浮层先消费，面板保持打开；子层释放后 Esc 才关闭面板', () => {
    const el = mount({ open: '' })
    const events = record(el)
    let childOpen = true
    // 模拟子浮层（dropdown 等）压入更晚的 Esc 层
    const release = pushEscapeLayer({ name: 'child', handle: () => childOpen })

    pressEscape()
    expect(el.hasAttribute('open'), '子层消费 Esc，面板不关闭').toBe(true)
    expect(events).toEqual([])

    childOpen = false
    release()
    pressEscape()
    expect(el.hasAttribute('open')).toBe(false)
    expect(events.filter((e) => e.type === 'oas-before-close')).toHaveLength(1)
  })

  it('外部移除 open：静默关闭并释放 Esc 层（之后 Esc 不再触发 before-close）', () => {
    const el = mount({ open: '' })
    const events = record(el)
    el.removeAttribute('open')
    pressEscape()
    expect(events).toEqual([])
  })

  it('多个实例：打开新面板置前，旧面板落回基准档；关闭最前后另一面板接任', () => {
    const a = mount({ open: '', rect: '0,0,200,150' })
    const b = mount({ open: '', rect: '200,100,200,150' })
    // 后打开/后登记的实例在最前，旧实例落回基准档
    expect(frame(b).style.zIndex).toContain('+ 1')
    expect(frame(a).style.zIndex).not.toContain('+ 1')

    // a 置前
    a.bringToFront()
    expect(frame(a).style.zIndex).toContain('+ 1')
    expect(frame(b).style.zIndex).not.toContain('+ 1')

    // b 关闭 → a 仍为最前
    b.close()
    expect(frame(a).style.zIndex).toContain('+ 1')

    // a 关闭 → 无最前
    a.close()
    expect(frame(a).style.zIndex).not.toContain('+ 1')
  })

  it('bringToFront：已是最前不重复派发 activate；置前派发 { rect, source:api }', () => {
    const a = mount({ open: '', rect: '10,10,200,150' })
    const b = mount({ open: '', rect: '20,20,200,150' })
    const events = record(a)
    a.bringToFront()
    expect(events).toEqual([
      { type: 'oas-activate', detail: { rect: { x: 10, y: 10, width: 200, height: 150 }, source: 'api' } },
    ])
    a.bringToFront()
    expect(events).toHaveLength(1)
    // b 关闭后 a 自动接任最前（状态边沿，不派发 activate）
    b.close()
    expect(events).toHaveLength(1)
    expect(frame(a).style.zIndex).toContain('+ 1')
  })

  it('z-index 不随 open 次数增长：只出现基准 / 最前两个值', () => {
    const el = mount({ rect: '0,0,200,150' })
    const seen = new Set<string>()
    for (let i = 0; i < 12; i++) {
      el.show()
      seen.add(frame(el).style.zIndex)
      el.close()
      seen.add(frame(el).style.zIndex)
    }
    expect([...seen]).toHaveLength(2)
    expect([...seen].some((z) => z.includes('+ 1'))).toBe(true)
  })
})

// ===== a11y / 文案 =====

describe('OASFloatingPanel 可访问性', () => {
  it('panel-title → aria-labelledby 指向标题元素；缺省回落 i18n aria-label', () => {
    const el = mount({ open: '', 'panel-title': '图层面板' })
    expect(titleText(el).textContent).toBe('图层面板')
    const id = titleEl(el).id
    expect(id).toMatch(/^oas-floating-panel-/)
    expect(frame(el).getAttribute('aria-labelledby')).toBe(id)
    expect(frame(el).hasAttribute('aria-label')).toBe(false)

    const bare = mount({ open: '' })
    expect(frame(bare).hasAttribute('aria-labelledby')).toBe(false)
    expect(frame(bare).getAttribute('aria-label')).toBe('悬浮面板')
  })

  it('title 插槽有内容时同样走 aria-labelledby（富标题）', () => {
    const el = mount({ open: '' }, '<strong slot="title">富标题</strong>')
    expect(frame(el).getAttribute('aria-labelledby')).toBe(titleEl(el).id)
    expect(frame(el).hasAttribute('aria-label')).toBe(false)
  })

  it('关闭钮 aria-label 与面板兜底名称随 locale 切换', () => {
    const el = mount({ open: '' })
    expect(closeBtn(el).getAttribute('aria-label')).toBe('关闭面板')
    expect(frame(el).getAttribute('aria-label')).toBe('悬浮面板')
    setLocale(en)
    expect(closeBtn(el).getAttribute('aria-label')).toBe('Close panel')
    expect(frame(el).getAttribute('aria-label')).toBe('Floating panel')
  })

  it('RTL：dir 钩子随环境同步', () => {
    const wrap = document.createElement('div')
    wrap.setAttribute('dir', 'rtl')
    document.body.appendChild(wrap)
    const el = new OASFloatingPanel()
    el.setAttribute('open', '')
    wrap.appendChild(el)
    expect(el.hasAttribute('data-rtl')).toBe(true)
    wrap.removeAttribute('dir')
    el.setAttribute('panel-title', '触发 update')
    expect(el.hasAttribute('data-rtl')).toBe(false)
  })
})

// ===== 焦点 =====

describe('OASFloatingPanel 焦点', () => {
  it('打开时聚焦 initial-focus 命中的元素（light DOM 优先），关闭归还打开前焦点', () => {
    const before = document.createElement('button')
    before.textContent = 'before'
    document.body.appendChild(before)
    before.focus()

    const el = mount({ 'initial-focus': '.target' }, '<button class="target">target</button>')
    el.show()
    const target = el.querySelector<HTMLButtonElement>('.target')!
    expect(activeInner()).toBe(target)

    el.close()
    expect(activeInner()).toBe(before)
  })

  it('缺省聚焦面板框体；focus() 后方向键可移动', () => {
    const el = mount({ movable: '', rect: '10,10,200,150' })
    el.show()
    expect(activeInner()).toBe(frame(el))
  })

  it('首帧即打开（SSR/首屏受控态）不抢焦点；关闭后重新 show 才聚焦', () => {
    const before = document.createElement('button')
    document.body.appendChild(before)
    before.focus()
    const el = mount({ open: '', movable: '', rect: '10,10,200,150' })
    expect(activeInner(), '首帧打开不抢焦点').toBe(before)
    el.close()
    el.show()
    expect(activeInner(), '后续打开边沿聚焦面板').toBe(frame(el))
  })
})

// ===== 生命周期 / SSR =====

describe('OASFloatingPanel 生命周期', () => {
  it('断开连接释放 Esc 层；重连恢复（不重建 shadow）', () => {
    const el = mount({ open: '' })
    const styleRef = el.shadowRoot!.querySelector('style')
    const events = record(el)
    el.remove()
    pressEscape()
    expect(events).toEqual([])

    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('style'), 'shadow 不重建').toBe(styleRef)
    pressEscape()
    expect(el.hasAttribute('open')).toBe(false)
    expect(events.filter((e) => e.type === 'oas-before-close')).toHaveLength(1)
  })

  it('重连时打开态重新置前', () => {
    const a = mount({ open: '', rect: '0,0,200,150' })
    const b = mount({ open: '', rect: '10,10,200,150' })
    b.bringToFront()
    const styleRef = b.shadowRoot!.querySelector('style')
    b.remove()
    document.body.appendChild(b)
    expect(b.shadowRoot!.querySelector('style')).toBe(styleRef)
    expect(frame(b).style.zIndex).toContain('+ 1')
    expect(frame(a).style.zIndex).not.toContain('+ 1')
  })

  it('SSR 运行段不登记叠放、不挂 Esc 层、不抢焦点', () => {
    ;(window as Window & { __OAS_SSR__?: boolean }).__OAS_SSR__ = true
    const el = new OASFloatingPanel()
    el.setAttribute('open', '')
    el.setAttribute('rect', '40,24,320,200')
    el.setAttribute('panel-title', 'SSR 面板')
    document.body.appendChild(el)
    expect(floatingPanelStack.size).toBe(0)
    expect(titleText(el).textContent).toBe('SSR 面板')
    expect(frameStyle(el)).toEqual({ left: '40px', top: '24px', width: '320px', height: '200px' })
    pressEscape()
    expect(el.hasAttribute('open'), 'SSR 段无 Esc 监听（测试环境仍无监听）').toBe(true)
  })
})

// ===== 指针：拖动 / 缩放 / 取消 =====

interface PointerInit {
  x?: number
  y?: number
  id?: number
  button?: number
  primary?: boolean
}

function pointerEvent(type: string, init: PointerInit = {}): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: init.x ?? 0,
    clientY: init.y ?? 0,
    pointerId: init.id ?? 1,
    button: init.button ?? 0,
    isPrimary: init.primary ?? true,
    pointerType: 'mouse',
  })
}

function fire(target: EventTarget, type: string, init: PointerInit = {}): PointerEvent {
  const event = pointerEvent(type, init)
  target.dispatchEvent(event)
  return event
}

const titlebar = (el: OASFloatingPanel): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="titlebar"]')!
const handle = (el: OASFloatingPanel, edge: string): HTMLElement =>
  el.shadowRoot!.querySelector<HTMLElement>(`[part="handle"][data-edge="${edge}"]`)!

/** rAF 合并帧：测试里用可控替身，避免依赖真实计时器 */
let pendingFrames: FrameRequestCallback[] = []
let frameSeq = 0
function installFrameStub(): void {
  pendingFrames = []
  frameSeq = 0
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    pendingFrames.push(cb)
    return ++frameSeq
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number): void => {
    pendingFrames[id - 1] = () => {}
  })
}
function flushFrame(): void {
  const frames = pendingFrames
  pendingFrames = []
  for (const cb of frames) cb(0)
}

beforeEach(() => {
  installFrameStub()
})

describe('OASFloatingPanel 指针移动', () => {
  it('标题栏拖动：视觉跟手，pointerup 提交 rect 属性 + 单次 oas-move（detail 精确）', async () => {
    const el = mount({ open: '', movable: '', rect: '48,48,300,200' })
    const events = record(el)
    const bar = titlebar(el)
    fire(bar, 'pointerdown', { x: 200, y: 200 })
    expect(el.hasAttribute('data-interacting')).toBe(true)
    fire(document, 'pointermove', { x: 260, y: 240 })
    flushFrame()
    expect(frameStyle(el)).toEqual({ left: '108px', top: '88px', width: '300px', height: '200px' })
    expect(el.getAttribute('rect'), '提交前属性不变（视觉先行）').toBe('48,48,300,200')
    fire(document, 'pointerup', { x: 260, y: 240 })
    expect(el.getAttribute('rect')).toBe('108,88,300,200')
    expect(el.hasAttribute('data-interacting')).toBe(false)
    expect(events).toEqual([
      {
        type: 'oas-move',
        detail: { rect: { x: 108, y: 88, width: 300, height: 200 }, source: 'pointer' },
      },
    ])
  })

  it('零位移：不写属性、不派发事件', () => {
    const el = mount({ open: '', movable: '' })
    const events = record(el)
    fire(titlebar(el), 'pointerdown', { x: 10, y: 10 })
    fire(document, 'pointerup', { x: 10, y: 10 })
    expect(el.hasAttribute('rect')).toBe(false)
    expect(events).toEqual([])
  })

  it('第二指针忽略：不覆盖进行中手势，只有主指针提交一次', () => {
    const el = mount({ open: '', movable: '', rect: '0,0,300,200' })
    const events = record(el)
    fire(titlebar(el), 'pointerdown', { x: 10, y: 10, id: 1 })
    fire(titlebar(el), 'pointerdown', { x: 90, y: 90, id: 2 })
    fire(document, 'pointermove', { x: 90, y: 90, id: 2 })
    flushFrame()
    expect(frameStyle(el).left).toBe('0px')
    fire(document, 'pointerup', { x: 90, y: 90, id: 2 })
    expect(el.getAttribute('rect'), '第二指针 pointerup 不提交').toBe('0,0,300,200')
    fire(document, 'pointermove', { x: 30, y: 20, id: 1 })
    flushFrame()
    fire(document, 'pointerup', { x: 30, y: 20, id: 1 })
    expect(el.getAttribute('rect')).toBe('20,10,300,200')
    expect(events.filter((e) => e.type === 'oas-move')).toHaveLength(1)
  })

  it('setPointerCapture 抛错：回退 document 监听，拖动照常提交', () => {
    const el = mount({ open: '', movable: '', rect: '0,0,300,200' })
    const bar = titlebar(el)
    Object.defineProperty(bar, 'setPointerCapture', {
      configurable: true,
      value: () => {
        throw new Error('capture unavailable')
      },
    })
    fire(bar, 'pointerdown', { x: 10, y: 10 })
    fire(document, 'pointermove', { x: 40, y: 30 })
    flushFrame()
    fire(document, 'pointerup', { x: 40, y: 30 })
    expect(el.getAttribute('rect')).toBe('30,20,300,200')
  })

  it('pointercancel：回到起始 rect、零事件（面板保持打开）', () => {
    const el = mount({ open: '', movable: '', rect: '0,0,300,200' })
    const events = record(el)
    fire(titlebar(el), 'pointerdown', { x: 10, y: 10 })
    fire(document, 'pointermove', { x: 80, y: 60 })
    flushFrame()
    expect(frameStyle(el).left).toBe('70px')
    fire(document, 'pointercancel', { x: 80, y: 60 })
    expect(frameStyle(el)).toEqual({ left: '0px', top: '0px', width: '300px', height: '200px' })
    expect(el.getAttribute('rect')).toBe('0,0,300,200')
    expect(el.hasAttribute('data-interacting')).toBe(false)
    expect(events).toEqual([])
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('lostpointercapture：视为结束并提交一次；后续事件忽略', () => {
    const el = mount({ open: '', movable: '', rect: '0,0,300,200' })
    const events = record(el)
    const bar = titlebar(el)
    fire(bar, 'pointerdown', { x: 10, y: 10 })
    fire(document, 'pointermove', { x: 50, y: 40 })
    flushFrame()
    bar.dispatchEvent(pointerEvent('lostpointercapture', { x: 50, y: 40 }))
    expect(el.getAttribute('rect')).toBe('40,30,300,200')
    expect(events.filter((e) => e.type === 'oas-move')).toHaveLength(1)
    fire(document, 'pointermove', { x: 99, y: 99 })
    flushFrame()
    expect(frameStyle(el).left).toBe('40px')
    fire(document, 'pointerup', { x: 99, y: 99 })
    expect(events.filter((e) => e.type === 'oas-move')).toHaveLength(1)
  })

  it('window blur：取消进行中手势（零事件）', () => {
    const el = mount({ open: '', movable: '', rect: '0,0,300,200' })
    const events = record(el)
    fire(titlebar(el), 'pointerdown', { x: 10, y: 10 })
    fire(document, 'pointermove', { x: 50, y: 40 })
    flushFrame()
    window.dispatchEvent(new Event('blur'))
    expect(frameStyle(el).left).toBe('0px')
    expect(el.getAttribute('rect')).toBe('0,0,300,200')
    expect(events).toEqual([])
  })

  it('手势中 Esc：取消手势、零 move 事件、面板不关闭', () => {
    const el = mount({ open: '', movable: '', rect: '0,0,300,200' })
    const events = record(el)
    fire(titlebar(el), 'pointerdown', { x: 10, y: 10 })
    fire(document, 'pointermove', { x: 60, y: 30 })
    flushFrame()
    pressEscape()
    expect(el.hasAttribute('open'), '第一次 Esc 只取消手势').toBe(true)
    expect(frameStyle(el).left).toBe('0px')
    expect(events).toEqual([])
    pressEscape()
    expect(el.hasAttribute('open')).toBe(false)
    expect(events.filter((e) => e.type === 'oas-before-close')).toHaveLength(1)
  })

  it('手势中外部写 rect：取消手势（零事件）并立即采用宿主坐标', () => {
    const el = mount({ open: '', movable: '', rect: '0,0,300,200' })
    const events = record(el)
    fire(titlebar(el), 'pointerdown', { x: 10, y: 10 })
    fire(document, 'pointermove', { x: 60, y: 30 })
    el.setAttribute('rect', '500,400,300,200')
    expect(frameStyle(el)).toEqual({ left: '500px', top: '400px', width: '300px', height: '200px' })
    fire(document, 'pointerup', { x: 60, y: 30 })
    expect(el.getAttribute('rect')).toBe('500,400,300,200')
    expect(events).toEqual([])
  })

  it('movable 缺席时标题栏不启动手势', () => {
    const el = mount({ open: '', rect: '0,0,300,200' })
    fire(titlebar(el), 'pointerdown', { x: 10, y: 10 })
    fire(document, 'pointermove', { x: 60, y: 30 })
    flushFrame()
    fire(document, 'pointerup', { x: 60, y: 30 })
    expect(el.hasAttribute('data-interacting')).toBe(false)
    expect(el.getAttribute('rect')).toBe('0,0,300,200')
  })
})

describe('OASFloatingPanel 指针缩放', () => {
  it('四角/四边缩放（对边固定）并派发 oas-resize detail { rect, source, edge }', () => {
    const el = mount({ open: '', resizable: '', rect: '100,100,200,150', min: '80,60', max: '900,900' })
    const events = record(el)
    fire(handle(el, 'se'), 'pointerdown', { x: 300, y: 250 })
    fire(document, 'pointermove', { x: 350, y: 300 })
    flushFrame()
    fire(document, 'pointerup', { x: 350, y: 300 })
    expect(el.getAttribute('rect')).toBe('100,100,250,200')
    expect(events).toEqual([
      {
        type: 'oas-resize',
        detail: { rect: { x: 100, y: 100, width: 250, height: 200 }, source: 'pointer', edge: 'se' },
      },
    ])

    fire(handle(el, 'w'), 'pointerdown', { x: 100, y: 200 })
    fire(document, 'pointermove', { x: 70, y: 200 })
    flushFrame()
    fire(document, 'pointerup', { x: 70, y: 200 })
    expect(el.getAttribute('rect')).toBe('70,100,280,200')
  })

  it('缩到 min 时拖动边停在 min（对边不动）', () => {
    const el = mount({ open: '', resizable: '', rect: '100,100,200,150', min: '120,100' })
    fire(handle(el, 'e'), 'pointerdown', { x: 300, y: 180 })
    fire(document, 'pointermove', { x: 120, y: 180 })
    flushFrame()
    fire(document, 'pointerup', { x: 120, y: 180 })
    expect(el.getAttribute('rect')).toBe('100,100,120,150')
  })

  it('resizable 缺席时手柄不启动手势', () => {
    const el = mount({ open: '', rect: '100,100,200,150' })
    fire(handle(el, 'se'), 'pointerdown', { x: 300, y: 250 })
    fire(document, 'pointermove', { x: 350, y: 300 })
    flushFrame()
    fire(document, 'pointerup', { x: 350, y: 300 })
    expect(el.getAttribute('rect')).toBe('100,100,200,150')
  })
})

describe('OASFloatingPanel 边界夹取（交互期）', () => {
  function stubRect(el: Element, rect: { x: number; y: number; width: number; height: number }): void {
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      ...rect,
      left: rect.x,
      top: rect.y,
      right: rect.x + rect.width,
      bottom: rect.y + rect.height,
      toJSON: () => rect,
    } as DOMRect)
  }

  it('拖动不越界（boundary 选择器 + boundary-padding）', () => {
    const bounds = document.createElement('div')
    document.body.appendChild(bounds)
    const el = mount({ open: '', movable: '', boundary: '#bounds-probe', 'boundary-padding': '10', min: '40,40' })
    bounds.id = 'bounds-probe'
    el.setAttribute('rect', '10,10,100,80')
    stubRect(el, { x: 0, y: 0, width: 0, height: 0 })
    stubRect(bounds, { x: 0, y: 0, width: 300, height: 200 })
    const events = record(el)
    fire(titlebar(el), 'pointerdown', { x: 10, y: 10 })
    fire(document, 'pointermove', { x: 999, y: 999 })
    flushFrame()
    fire(document, 'pointerup', { x: 999, y: 999 })
    expect(el.getAttribute('rect')).toBe('190,110,100,80')
    expect(events).toHaveLength(1)
  })

  it('缩放不越过边界（拖动边停在边界内）', () => {
    const bounds = document.createElement('div')
    document.body.appendChild(bounds)
    const el = mount({ open: '', resizable: '', boundary: '#bounds-probe2', rect: '10,10,100,80', min: '40,40' })
    bounds.id = 'bounds-probe2'
    stubRect(el, { x: 0, y: 0, width: 0, height: 0 })
    stubRect(bounds, { x: 0, y: 0, width: 200, height: 160 })
    fire(handle(el, 'se'), 'pointerdown', { x: 110, y: 90 })
    fire(document, 'pointermove', { x: 900, y: 900 })
    flushFrame()
    fire(document, 'pointerup', { x: 900, y: 900 })
    expect(el.getAttribute('rect')).toBe('10,10,190,150')
  })

  it('boundary 选择器未命中：不夹取、不崩', () => {
    const el = mount({ open: '', movable: '', boundary: '#not-exists', rect: '10,10,100,80', min: '40,40' })
    stubRect(el, { x: 0, y: 0, width: 0, height: 0 })
    fire(titlebar(el), 'pointerdown', { x: 10, y: 10 })
    fire(document, 'pointermove', { x: 510, y: 410 })
    flushFrame()
    fire(document, 'pointerup', { x: 510, y: 410 })
    expect(el.getAttribute('rect')).toBe('510,410,100,80')
  })
})

describe('OASFloatingPanel 键盘等价路径', () => {
  const key = (el: OASFloatingPanel, k: string, init: KeyboardEventInit = {}): void => {
    frame(el).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }))
  }

  it('框体聚焦：方向键移动、Shift+方向键缩放（detail source=keyboard）', () => {
    const el = mount({ open: '', movable: '', resizable: '', rect: '48,48,300,200' })
    frame(el).focus()
    const events = record(el)
    key(el, 'ArrowRight')
    expect(el.getAttribute('rect')).toBe('56,48,300,200')
    expect(events.at(-1)).toEqual({
      type: 'oas-move',
      detail: { rect: { x: 56, y: 48, width: 300, height: 200 }, source: 'keyboard' },
    })
    key(el, 'ArrowDown', { shiftKey: true })
    expect(el.getAttribute('rect')).toBe('56,48,300,208')
    expect(events.at(-1)).toEqual({
      type: 'oas-resize',
      detail: { rect: { x: 56, y: 48, width: 300, height: 208 }, source: 'keyboard', edge: 's' },
    })
    key(el, 'ArrowUp', { shiftKey: true })
    expect(el.getAttribute('rect'), 'ArrowUp 收北缘（上边下移，底边固定）').toBe('56,56,300,200')
  })

  it('RTL 镜像水平语义', () => {
    const wrap = document.createElement('div')
    wrap.setAttribute('dir', 'rtl')
    document.body.appendChild(wrap)
    const el = new OASFloatingPanel()
    el.setAttribute('open', '')
    el.setAttribute('movable', '')
    el.setAttribute('resizable', '')
    el.setAttribute('rect', '48,48,300,200')
    wrap.appendChild(el)
    frame(el).focus()
    key(el, 'ArrowRight')
    expect(el.getAttribute('rect')).toBe('40,48,300,200')
    key(el, 'ArrowRight', { shiftKey: true })
    expect(el.getAttribute('rect')).toBe('32,48,308,200')
  })

  it('焦点在插槽输入控件内：不拦截方向键', () => {
    const el = mount({ open: '', movable: '', rect: '48,48,300,200' }, '<input class="field" />')
    const input = el.querySelector<HTMLInputElement>('.field')!
    input.focus()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))
    expect(el.getAttribute('rect')).toBe('48,48,300,200')
  })

  it('movable / resizable 缺席时对应键位不生效；不相关键不拦截', () => {
    const el = mount({ open: '', rect: '48,48,300,200' })
    frame(el).focus()
    key(el, 'ArrowRight')
    key(el, 'ArrowRight', { shiftKey: true })
    expect(el.getAttribute('rect')).toBe('48,48,300,200')
    let defaultPrevented = false
    frame(el).addEventListener('keydown', (e) => {
      defaultPrevented = e.defaultPrevented
    })
    key(el, 'Enter')
    expect(defaultPrevented).toBe(false)
  })
})

describe('OASFloatingPanel 断开 / 重连 / 激活', () => {
  it('手势中断开：不提交、清监听；重连后拖动恢复', () => {
    const el = mount({ open: '', movable: '', rect: '0,0,300,200' })
    const events = record(el)
    fire(titlebar(el), 'pointerdown', { x: 10, y: 10 })
    fire(document, 'pointermove', { x: 60, y: 40 })
    el.remove()
    expect(el.getAttribute('rect')).toBe('0,0,300,200')
    fire(document, 'pointerup', { x: 60, y: 40 })
    expect(events).toEqual([])

    document.body.appendChild(el)
    fire(titlebar(el), 'pointerdown', { x: 10, y: 10 })
    fire(document, 'pointermove', { x: 30, y: 20 })
    flushFrame()
    fire(document, 'pointerup', { x: 30, y: 20 })
    expect(el.getAttribute('rect')).toBe('20,10,300,200')
    expect(events.filter((e) => e.type === 'oas-move')).toHaveLength(1)
  })

  it('pointerdown 置前并派发 activate（source=pointer）', () => {
    const a = mount({ open: '', rect: '0,0,200,150' })
    const b = mount({ open: '', rect: '10,10,200,150' })
    expect(frame(b).style.zIndex).toContain('+ 1')
    const events = record(a)
    fire(titlebar(a), 'pointerdown', { x: 20, y: 20 })
    expect(frame(a).style.zIndex).toContain('+ 1')
    expect(frame(b).style.zIndex).not.toContain('+ 1')
    expect(events).toEqual([
      {
        type: 'oas-activate',
        detail: { rect: { x: 0, y: 0, width: 200, height: 150 }, source: 'pointer' },
      },
    ])
    fire(document, 'pointerup', { x: 20, y: 20 })
  })

  it('onFramePointerDown 只接受主键主指针（右键 / 第二指针不置前）', () => {
    const a = mount({ open: '', rect: '0,0,200,150' })
    const b = mount({ open: '', rect: '10,10,200,150' })
    const events = record(a)
    fire(frame(a), 'pointerdown', { x: 5, y: 5, button: 2 })
    expect(frame(b).style.zIndex, '右键不置前').toContain('+ 1')
    fire(frame(a), 'pointerdown', { x: 5, y: 5, primary: false })
    expect(frame(b).style.zIndex, '第二指针不置前').toContain('+ 1')
    fire(frame(a), 'pointerdown', { x: 5, y: 5 })
    expect(frame(a).style.zIndex).toContain('+ 1')
    expect(events.filter((e) => e.type === 'oas-activate')).toHaveLength(1)
  })
})

// ===== Esc 层级跟随视觉最前（独立复核 I1） =====

describe('OASFloatingPanel Esc 层级跟随置前', () => {
  it('A 开、B 开、A 置前（api）后 Esc 关闭 A，再 Esc 关闭 B', () => {
    const a = mount({ open: '', rect: '0,0,200,150' })
    const b = mount({ open: '', rect: '10,10,200,150' })
    expect(frame(b).style.zIndex, '后开的 B 在最前').toContain('+ 1')

    a.bringToFront()
    pressEscape()
    expect(a.hasAttribute('open'), 'Esc 关闭视觉最前的 A').toBe(false)
    expect(b.hasAttribute('open')).toBe(true)

    pressEscape()
    expect(b.hasAttribute('open')).toBe(false)
  })

  it('pointerdown 置前后 Esc 同样关闭刚置前的面板', () => {
    const a = mount({ open: '', rect: '0,0,200,150' })
    const b = mount({ open: '', rect: '10,10,200,150' })
    fire(titlebar(a), 'pointerdown', { x: 20, y: 20 })
    fire(document, 'pointerup', { x: 20, y: 20 })
    pressEscape()
    expect(a.hasAttribute('open')).toBe(false)
    expect(b.hasAttribute('open')).toBe(true)
  })

  it('置前不重复压层：反复激活后 Esc 仍只关最前的一个', () => {
    const a = mount({ open: '', rect: '0,0,200,150' })
    const b = mount({ open: '', rect: '10,10,200,150' })
    for (let i = 0; i < 3; i++) a.bringToFront()
    const events = record(b)
    pressEscape()
    expect(a.hasAttribute('open')).toBe(false)
    expect(events, 'B 不因重复激活多出 Esc 层').toEqual([])
    expect(b.hasAttribute('open')).toBe(true)
  })
})

// ===== 首帧层级（独立复核 I4） =====

describe('OASFloatingPanel 首帧层级', () => {
  it('单面板首帧即打开：computed z 为最前档（+1），非基准档', () => {
    const only = mount({ open: '', rect: '0,0,200,150' })
    expect(frame(only).style.zIndex).toContain('+ 1')

    only.close()
    expect(frame(only).style.zIndex).not.toContain('+ 1')
    only.show()
    expect(frame(only).style.zIndex).toContain('+ 1')
  })

  it('首帧打开 + 关闭态邻面板：打开者最前，登记顺序不抢首帧层级', () => {
    const closed = mount({ rect: '0,0,200,150' })
    const opened = mount({ open: '', rect: '10,10,200,150' })
    expect(frame(opened).style.zIndex).toContain('+ 1')
    expect(frame(closed).style.zIndex).not.toContain('+ 1')
  })
})

// ===== property 通道语义（独立复核 I3 / Minor） =====

describe('OASFloatingPanel property 通道', () => {
  it('rect setter 兼容字符串（走 attribute 通道，与宿主 setAttribute 同义）', () => {
    const el = mount({ open: '' })
    // Vue 对自定义元素的 property 通道：`'rect' in el` 为 true → 直接赋值（静态字符串来自模板）
    ;(el as { rect: unknown }).rect = '0,0,380,230'
    expect(el.getAttribute('rect')).toBe('0,0,380,230')
    expect(el.rect).toEqual({ x: 0, y: 0, width: 380, height: 230 })
    expect(frameStyle(el)).toEqual({ left: '0px', top: '0px', width: '380px', height: '230px' })

    // 非法串与 setAttribute 行为一致：属性保留原文、渲染回落缺省
    ;(el as { rect: unknown }).rect = 'bad'
    expect(el.getAttribute('rect')).toBe('bad')
    expect(frameStyle(el).width).toBe(`${DEFAULT_RECT.width}px`)
  })

  it('open setter 对齐族内 presence 约定：空串/非 "false" 为真，false/"false"/null 为假', () => {
    const el = mount()
    ;(el as { open: unknown }).open = ''
    expect(el.hasAttribute('open')).toBe(true)
    ;(el as { open: unknown }).open = 'true'
    expect(el.hasAttribute('open')).toBe(true)
    ;(el as { open: unknown }).open = 'false'
    expect(el.hasAttribute('open')).toBe(false)
    ;(el as { open: unknown }).open = null
    expect(el.hasAttribute('open')).toBe(false)
    ;(el as { open: unknown }).open = true
    expect(el.hasAttribute('open')).toBe(true)
    ;(el as { open: unknown }).open = false
    expect(el.hasAttribute('open')).toBe(false)
    // attribute 通道是 presence 语义：open="false" 仍为打开
    el.setAttribute('open', 'false')
    expect(el.open).toBe(true)
  })
})

// ===== coarse / forced-colors 样式契约（独立复核 C1 / I2） =====

describe('OASFloatingPanel 强制色与 coarse 样式契约', () => {
  it('标题栏（含关闭钮）层级高于手柄，顶部手柄从标题栏下沿起算', () => {
    const css = styleText(mount({ open: '', movable: '', resizable: '' }))
    expect(css, '标题栏建立层叠上下文并压过手柄').toMatch(/\.titlebar\s*\{[^}]*position:\s*relative[^}]*z-index:\s*2/)
    expect(css, '手柄保持在标题栏之下').toMatch(/\.handle\s*\{[^}]*z-index:\s*1/)
    for (const edge of ['n', 'ne', 'nw']) {
      expect(css, `${edge} 手柄从标题栏下沿起算`).toMatch(
        new RegExp(`\\.handle\\[data-edge='${edge}'\\]\\s*\\{[^}]*top:\\s*var\\(--oas-floating-panel-titlebar-height`),
      )
    }
    expect(css, 'coarse 下标题栏高度与关闭钮同为触控目标').toMatch(
      /@media \(pointer: coarse\)[\s\S]*--oas-floating-panel-titlebar-height:/,
    )
  })

  it('forced-colors：框体与关闭钮焦点环用 outline 兜底（box-shadow 被禁用）', () => {
    const css = styleText(mount({ open: '' }))
    const start = css.indexOf('@media (forced-colors: active)')
    expect(start, '存在 forced-colors 回退块').toBeGreaterThan(-1)
    const block = css.slice(start)
    expect(block, '框体焦点 outline 兜底').toMatch(/\.frame:focus-visible\s*\{[^}]*outline:\s*2px solid/)
    expect(block, '关闭钮焦点 outline 兜底').toMatch(/\.close:focus-visible\s*\{[^}]*outline:\s*2px solid/)
  })

  it('标题栏分隔线走 CSS 变量 token（可被宿主覆盖）', () => {
    const css = styleText(mount({ open: '' }))
    expect(css).toMatch(
      /border-block-end:\s*1px solid var\(--oas-floating-panel-titlebar-border-color,\s*var\(--oas-color-border\)\)/,
    )
  })
})

// ===== 标题栏实测高度（fix round 2） =====

describe('OASFloatingPanel 标题栏高度实测', () => {
  class FakeRO implements ResizeObserver {
    static instances: FakeRO[] = []
    readonly targets = new Set<Element>()
    disconnected = false
    constructor(private readonly cb: ResizeObserverCallback) {
      FakeRO.instances.push(this)
    }
    observe(target: Element): void {
      this.disconnected = false
      this.targets.add(target)
    }
    unobserve(target: Element): void {
      this.targets.delete(target)
    }
    disconnect(): void {
      this.targets.clear()
      this.disconnected = true
    }
    trigger(): void {
      this.cb([], this)
    }
  }

  const TOKEN = '--oas-floating-panel-titlebar-height'

  function stubHeight(el: HTMLElement, height: number): void {
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: height })
  }

  beforeEach(() => {
    FakeRO.instances = []
    vi.stubGlobal('ResizeObserver', FakeRO as unknown as typeof ResizeObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('富标题实测高度写回 host token；重复回调不重写；断开释放、重连重挂', () => {
    const el = mount({ open: '' })
    const bar = titlebar(el)
    // happy-dom 无布局：模拟 48px 富标题实测值
    stubHeight(bar, 48)
    const ro = FakeRO.instances[0]!
    expect(ro.targets.has(bar), '观察标题栏本体').toBe(true)

    ro.trigger()
    expect(el.style.getPropertyValue(TOKEN), '写回 px 实测值').toBe('48px')

    const setSpy = vi.spyOn(el.style, 'setProperty')
    ro.trigger()
    expect(setSpy, '同值重复回调不重写（防 RO 循环）').not.toHaveBeenCalled()
    setSpy.mockRestore()

    // 宿主移除内联 token 后再次实测：必须补写（同值判定看实际内联值，不看缓存）
    el.style.removeProperty(TOKEN)
    ro.trigger()
    expect(el.style.getPropertyValue(TOKEN)).toBe('48px')

    el.remove()
    expect(ro.disconnected, '断开释放观察器').toBe(true)
    document.body.appendChild(el)
    const reconnected = FakeRO.instances.at(-1)!
    expect(reconnected).not.toBe(ro)
    expect(reconnected.targets.has(titlebar(el)), '重连重挂').toBe(true)
    expect(el.style.getPropertyValue(TOKEN)).toBe('48px')
  })

  it('实测为 0（关闭态 display:none）不写 token，保留默认 36px', () => {
    const el = mount()
    const bar = titlebar(el)
    stubHeight(bar, 0)
    FakeRO.instances[0]!.trigger()
    expect(el.style.getPropertyValue(TOKEN)).toBe('')
  })

  it('SSR 运行段不建观察器、不写实测 token（快照仍用默认 token）', () => {
    ;(window as Window & { __OAS_SSR__?: boolean }).__OAS_SSR__ = true
    const el = mount({ open: '' })
    expect(FakeRO.instances).toHaveLength(0)
    expect(el.style.getPropertyValue(TOKEN)).toBe('')
  })
})

// ===== 断开期间改 open（独立复核 I5） =====

describe('OASFloatingPanel 断开期间改 open', () => {
  it('断开时打开：不挂幽灵 Esc 层、不抢焦点；重连补齐 Esc 与最前层级', () => {
    const before = document.createElement('button')
    document.body.appendChild(before)
    before.focus()
    const el = mount()
    const events = record(el)

    el.remove()
    el.setAttribute('open', '')
    expect(activeInner(), '断开时打开不抢焦点').toBe(before)
    pressEscape()
    expect(events, '无幽灵 Esc 层').toEqual([])

    document.body.appendChild(el)
    expect(frame(el).style.zIndex, '重连补写最前层级').toContain('+ 1')
    expect(activeInner(), '重连不抢焦点').toBe(before)
    pressEscape()
    expect(events.filter((e) => e.type === 'oas-before-close')).toHaveLength(1)
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('首帧即打开的断开重连不补 previousFocus：关闭不把焦点送回任意旧元素', () => {
    const before = document.createElement('button')
    document.body.appendChild(before)
    before.focus()
    // 首帧即打开：不抢焦点，previousFocus 保持为空
    const el = mount({ open: '' })
    expect(activeInner()).toBe(before)

    el.remove()
    document.body.appendChild(el)
    closeBtn(el).focus()
    el.close()
    expect(activeInner(), '不得归还到重连时抓到的旧焦点').not.toBe(before)
  })

  it('断开时关闭：不触 stack.refresh / 不归还焦点；重连保持关闭且无 Esc 层', () => {
    const before = document.createElement('button')
    document.body.appendChild(before)
    before.focus()
    const el = mount({ open: '' })
    const events = record(el)

    el.remove()
    el.removeAttribute('open')
    expect(activeInner()).toBe(before)
    document.body.appendChild(el)
    expect(el.hasAttribute('open')).toBe(false)
    expect(frame(el).hasAttribute('data-open')).toBe(false)
    expect(frame(el).style.zIndex).not.toContain('+ 1')
    pressEscape()
    expect(events).toEqual([])
  })

  it('断开时开 → 关：重连不残留 Esc 层与焦点副作用', () => {
    const before = document.createElement('button')
    document.body.appendChild(before)
    before.focus()
    const el = mount()
    const events = record(el)

    el.remove()
    el.setAttribute('open', '')
    el.removeAttribute('open')
    document.body.appendChild(el)
    expect(activeInner()).toBe(before)
    pressEscape()
    expect(events).toEqual([])
    expect(el.hasAttribute('open')).toBe(false)
  })
})

// ===== 边界解析（独立复核 Minor） =====

describe('OASFloatingPanel 边界解析', () => {
  function stubRect(el: Element, rect: { x: number; y: number; width: number; height: number }): void {
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      ...rect,
      left: rect.x,
      top: rect.y,
      right: rect.x + rect.width,
      bottom: rect.y + rect.height,
      toJSON: () => rect,
    } as DOMRect)
  }

  it('viewport 用 documentElement.clientWidth/Height（排除滚动条），不放大到 innerWidth', () => {
    const el = mount({ open: '', movable: '', rect: '10,10,100,80', min: '40,40' })
    stubRect(el, { x: 0, y: 0, width: 0, height: 0 })
    const elRoot = document.documentElement
    const originalWidth = Object.getOwnPropertyDescriptor(elRoot, 'clientWidth')
    const originalHeight = Object.getOwnPropertyDescriptor(elRoot, 'clientHeight')
    Object.defineProperty(elRoot, 'clientWidth', { configurable: true, value: 800 })
    Object.defineProperty(elRoot, 'clientHeight', { configurable: true, value: 600 })
    try {
      fire(titlebar(el), 'pointerdown', { x: 10, y: 10 })
      fire(document, 'pointermove', { x: 9999, y: 9999 })
      flushFrame()
      fire(document, 'pointerup', { x: 9999, y: 9999 })
      expect(el.getAttribute('rect')).toBe('700,520,100,80')
    } finally {
      if (originalWidth) Object.defineProperty(elRoot, 'clientWidth', originalWidth)
      else delete (elRoot as unknown as { clientWidth?: number }).clientWidth
      if (originalHeight) Object.defineProperty(elRoot, 'clientHeight', originalHeight)
      else delete (elRoot as unknown as { clientHeight?: number }).clientHeight
    }
  })

  it('boundary 选择器在同根树内解析（shadow 内边界优先于 document 同名元素）', () => {
    const shadowHost = document.createElement('div')
    document.body.appendChild(shadowHost)
    const root = shadowHost.attachShadow({ mode: 'open' })
    const shadowBound = document.createElement('div')
    shadowBound.id = 'fp-scope-bounds'
    root.appendChild(shadowBound)

    const docBound = document.createElement('div')
    docBound.id = 'fp-scope-bounds'
    document.body.appendChild(docBound)

    const el = new OASFloatingPanel()
    el.setAttribute('open', '')
    el.setAttribute('movable', '')
    el.setAttribute('boundary', '#fp-scope-bounds')
    el.setAttribute('rect', '10,10,100,80')
    el.setAttribute('min', '40,40')
    root.appendChild(el)

    stubRect(el, { x: 0, y: 0, width: 0, height: 0 })
    stubRect(shadowBound, { x: 0, y: 0, width: 200, height: 160 })
    stubRect(docBound, { x: 0, y: 0, width: 900, height: 900 })
    fire(titlebar(el), 'pointerdown', { x: 10, y: 10 })
    fire(document, 'pointermove', { x: 9999, y: 9999 })
    flushFrame()
    fire(document, 'pointerup', { x: 9999, y: 9999 })
    expect(el.getAttribute('rect'), '夹在同根树的边界内').toBe('100,80,100,80')
  })

  it('面板在 shadow 根内、边界只在 document：回退 document 查询（同 id 根树优先）', () => {
    const shadowHost = document.createElement('div')
    document.body.appendChild(shadowHost)
    const root = shadowHost.attachShadow({ mode: 'open' })
    const docBound = document.createElement('div')
    docBound.id = 'fp-scope-doc-bounds'
    document.body.appendChild(docBound)

    const el = new OASFloatingPanel()
    el.setAttribute('open', '')
    el.setAttribute('movable', '')
    el.setAttribute('boundary', '#fp-scope-doc-bounds')
    el.setAttribute('rect', '10,10,100,80')
    el.setAttribute('min', '40,40')
    root.appendChild(el)

    stubRect(el, { x: 0, y: 0, width: 0, height: 0 })
    stubRect(docBound, { x: 0, y: 0, width: 200, height: 160 })
    fire(titlebar(el), 'pointerdown', { x: 10, y: 10 })
    fire(document, 'pointermove', { x: 9999, y: 9999 })
    flushFrame()
    fire(document, 'pointerup', { x: 9999, y: 9999 })
    expect(el.getAttribute('rect'), '同根树未命中时回退 document 边界').toBe('100,80,100,80')
  })

  it('未命中 boundary 选择器只告警一次，且告警台账有界', () => {
    const el = mount({ open: '' })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    el.setAttribute('boundary', '#fp-missing-once')
    ;(el as unknown as { resolveBoundary(): unknown }).resolveBoundary()
    ;(el as unknown as { resolveBoundary(): unknown }).resolveBoundary()
    const messages = warn.mock.calls.filter((call) => String(call[0]).includes('#fp-missing-once'))
    expect(messages, '同名选择器只告警一次').toHaveLength(1)

    for (let i = 0; i < 40; i++) {
      el.setAttribute('boundary', `#fp-missing-${i}`)
      ;(el as unknown as { resolveBoundary(): unknown }).resolveBoundary()
    }
    const warned = (OASFloatingPanel as unknown as { warnedBoundaries: Set<string> }).warnedBoundaries
    expect(warned.size, '告警台账有界（不随宿主输入无限增长）').toBeLessThanOrEqual(32)
  })
})

// ===== 水合（独立复核 Minor） =====

describe('OASFloatingPanel 水合', () => {
  const META = '<meta data-oas-ssr="oas-floating-panel" data-oas-ssr-v="1">'

  function captureSnapshot(): string {
    const el = mount({ open: '', rect: '40,24,320,200', 'panel-title': '水合面板', movable: '', resizable: '' })
    const html = el.shadowRoot!.innerHTML
    el.remove()
    return html
  }

  function upgrade(
    snapshot: string,
    attrs: Record<string, string> = { open: '', 'panel-title': '水合面板' },
  ): OASFloatingPanel {
    const el = new OASFloatingPanel()
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
    el.shadowRoot!.innerHTML = `${META}${snapshot}`
    document.body.appendChild(el)
    return el
  }

  it('真水合接管：shadow 不重建、指纹移除、标题 id 与 aria-labelledby 一致', () => {
    const snapshot = captureSnapshot()
    const el = upgrade(snapshot)
    const style = el.shadowRoot!.querySelector('style')
    expect(style?.tagName, 'shadow 未重建（style 节点保留）').toBe('STYLE')
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(frame(el).getAttribute('part')).toBe('frame')
    expect(handles(el)).toHaveLength(8)
    const title = titleEl(el)
    expect(title.id).not.toBe('')
    expect(frame(el).getAttribute('aria-labelledby')).toBe(title.id)
  })

  it('快照标题缺 id：水合时补写新 id，aria-labelledby 不悬空', () => {
    const snapshot = captureSnapshot().replace(/\sid="oas-floating-panel-title-\d+"/, '')
    const el = upgrade(snapshot)
    const title = titleEl(el)
    expect(title.id, '补写标题 id').toMatch(/^oas-floating-panel-title-/)
    expect(frame(el).getAttribute('aria-labelledby')).toBe(title.id)
  })

  it('快照缺 titlebar / 关闭钮：回退 render 全量重建', () => {
    const snapshot = captureSnapshot()
    const noTitlebar = upgrade(snapshot.replace('part="titlebar"', 'part="broken-titlebar"'))
    expect(noTitlebar.shadowRoot!.querySelectorAll('[part="titlebar"]').length).toBe(1)
    expect(noTitlebar.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    noTitlebar.remove()

    const noClose = upgrade(snapshot.replace(/<button class="close"[\s\S]*?<\/button>/, ''))
    expect(noClose.shadowRoot!.querySelectorAll('[part="close"]')).toHaveLength(1)
    expect(noClose.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
  })
})
