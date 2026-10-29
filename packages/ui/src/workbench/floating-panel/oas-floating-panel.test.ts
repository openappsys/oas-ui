import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import zhCN from '@oas-ui/i18n/zh-CN'
import '@oas-ui/i18n'
import { OASFloatingPanel } from './index.js'
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
    expect(el.shadowRoot!.querySelector('[part="content"] slot:not([name])')).not.toBeNull()
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
})
