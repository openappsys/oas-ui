import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASSignature } from './index.js'

// oas-signature 签名板：canvas 笔迹捕获（pointer 事件 + DPR 高清 + token 笔色）+
// value 双通道受控（dataURL PNG）+ clear()/toDataURL() + oas-change 幂等 +
// disabled/readonly 拦截 + resize 保留笔迹 + 主题 observer 重绘 + SSR 骨架/真水合。
//
// happy-dom 无 canvas 2d 实现（getContext 返回 null，与 watermark 同口径）：
// 测试经 HTMLCanvasElement.prototype 注入 mock 2d 上下文（记录绘制命令），
// 验证「数据层（归一化笔迹）与绘制层（canvas 命令）分离」——数据层无 canvas 也可测。

/** mock 2d 上下文：记录绘制命令与样式写入（样式与命令在同一对象上） */
interface MockCtx {
  lineWidth: number
  strokeStyle: string
  lineCap: string
  lineJoin: string
  calls: Array<[string, ...number[]]>
  drawImages: number
  setTransform: (...args: number[]) => void
  clearRect: (...args: number[]) => void
  beginPath: () => void
  moveTo: (...args: number[]) => void
  lineTo: (...args: number[]) => void
  stroke: () => void
  drawImage: (...args: unknown[]) => void
}

function mockCtx(): MockCtx {
  const ctx = {
    lineWidth: 1,
    strokeStyle: '#000',
    lineCap: 'butt',
    lineJoin: 'miter',
    calls: [] as Array<[string, ...number[]]>,
    drawImages: 0,
    setTransform(...args: number[]) {
      ctx.calls.push(['setTransform', ...args])
    },
    clearRect(...args: number[]) {
      ctx.calls.push(['clearRect', ...args])
    },
    beginPath() {
      ctx.calls.push(['beginPath'])
    },
    moveTo(...args: number[]) {
      ctx.calls.push(['moveTo', ...args])
    },
    lineTo(...args: number[]) {
      ctx.calls.push(['lineTo', ...args])
    },
    stroke() {
      ctx.calls.push(['stroke'])
    },
    drawImage() {
      ctx.drawImages += 1
    },
  }
  return ctx
}

let lastCtx: MockCtx | null = null

/** 注入 mock canvas（返回记录命令的 2d 上下文；toDataURL 返回恒定 PNG 或按调用序变化的 URL） */
function installCanvasMock(url: string | (() => string) = 'data:image/png;base64,MOCKPNG') {
  const originalGetContext = HTMLCanvasElement.prototype.getContext
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL
  const fakeGetContext = function (this: HTMLCanvasElement, type: string): unknown {
    if (type !== '2d') return null
    const ctx = mockCtx()
    // 只记组件画布（已挂树）的 ctx——canvasAvailable() 的探测 canvas（游离元素）不算
    if (this.isConnected) lastCtx = ctx
    return ctx
  }
  HTMLCanvasElement.prototype.getContext = fakeGetContext as unknown as typeof HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.toDataURL = typeof url === 'function' ? url : () => url
  return () => {
    HTMLCanvasElement.prototype.getContext = originalGetContext
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL
    lastCtx = null
  }
}

const RECT = {
  width: 300,
  height: 160,
  top: 0,
  left: 0,
  right: 300,
  bottom: 160,
  x: 0,
  y: 0,
  toJSON: () => ({}),
} as DOMRect

/** 画布矩形 mock（happy-dom 全 0，无排版） */
function mockCanvasRect(el: OASSignature, rect: DOMRect = RECT) {
  const canvas = canvasOf(el)
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(rect)
}

function mount(attrs: Record<string, string> = {}): OASSignature {
  const el = new OASSignature()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function shadow(el: OASSignature): ShadowRoot {
  return el.shadowRoot!
}

function canvasOf(el: OASSignature): HTMLCanvasElement {
  return shadow(el).querySelector<HTMLCanvasElement>('canvas')!
}

function clearBtnOf(el: OASSignature): HTMLButtonElement {
  return shadow(el).querySelector<HTMLButtonElement>('[part="clear-button"]')!
}

function placeholderOf(el: OASSignature): HTMLElement {
  return shadow(el).querySelector<HTMLElement>('[part="placeholder"]')!
}

function liveOf(el: OASSignature): HTMLElement {
  return shadow(el).querySelector<HTMLElement>('.sr-status')!
}

/** 笔画事件序列：down → move×(n-2) → up（坐标为 CSS px，相对画布左上） */
function drawStroke(el: OASSignature, points: Array<[number, number]>): CustomEvent[] {
  const events: CustomEvent[] = []
  el.addEventListener('oas-change', (e) => events.push(e as CustomEvent))
  const canvas = canvasOf(el)
  const fire = (type: string, [x, y]: [number, number], extra: PointerEventInit = {}) => {
    canvas.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        composed: true,
        pointerId: 1,
        button: 0,
        clientX: x,
        clientY: y,
        ...extra,
      }),
    )
  }
  fire('pointerdown', points[0]!)
  for (const p of points.slice(1, -1)) fire('pointermove', p)
  fire('pointerup', points[points.length - 1]!)
  return events
}

describe('OASSignature', () => {
  it('占位 hidden 覆盖块存在于 shadow 样式（2026-11 用户视角门禁实抓：.placeholder{display:flex} 顶掉 UA [hidden] 致签名后占位仍可见）', () => {
    const el = new OASSignature()
    document.body.appendChild(el)
    const styleText = el.shadowRoot?.querySelector('style')?.textContent ?? ''
    expect(styleText).toContain('.placeholder[hidden]')
    el.remove()
  })

  beforeEach(() => {
    document.body.innerHTML = ''
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
    setLocale('zh-CN')
  })

  it('渲染 shadow 骨架：canvas/占位/清空按钮/aria-live 区齐全，SSR 模板确定性', () => {
    const a = mount()
    const b = mount()
    expect(a.shadowRoot!.innerHTML).toBe(b.shadowRoot!.innerHTML)
    expect(canvasOf(a).getAttribute('role')).toBe('img')
    expect(clearBtnOf(a).hasAttribute('hidden')).toBe(true)
    expect(liveOf(a).getAttribute('aria-live')).toBe('polite')
  })

  it('a11y：画布 aria-label 含签名状态（未签名→已签名），aria-live 同步播报', () => {
    const restore = installCanvasMock()
    try {
      const el = mount()
      mockCanvasRect(el)
      expect(canvasOf(el).getAttribute('aria-label')).toContain('未签名')
      expect(liveOf(el).textContent).toContain('未签名')
      drawStroke(el, [
        [10, 10],
        [50, 50],
        [90, 20],
      ])
      expect(canvasOf(el).getAttribute('aria-label')).toContain('已签名')
      expect(liveOf(el).textContent).toContain('已签名')
      el.clear()
      expect(canvasOf(el).getAttribute('aria-label')).toContain('未签名')
    } finally {
      restore()
    }
  })

  it('clearable：清空按钮显隐与文案', () => {
    const el = mount({ clearable: '' })
    const btn = clearBtnOf(el)
    expect(btn.hasAttribute('hidden')).toBe(false)
    expect(btn.textContent).toContain('清空')
    const plain = mount()
    expect(clearBtnOf(plain).hasAttribute('hidden')).toBe(true)
  })

  it('笔画序列 → value 非空 dataURL 且派发 oas-change（bubbles+composed）', () => {
    const restore = installCanvasMock()
    try {
      const el = mount({ clearable: '' })
      mockCanvasRect(el)
      const events = drawStroke(el, [
        [10, 10],
        [80, 80],
        [150, 30],
      ])
      expect(el.getAttribute('value')).toBe('data:image/png;base64,MOCKPNG')
      expect(events.map((e) => e.detail)).toEqual([{ value: 'data:image/png;base64,MOCKPNG' }])
      expect(events[0]!.bubbles).toBe(true)
      expect(events[0]!.composed).toBe(true)
      // 有笔迹后空态占位隐藏
      expect(placeholderOf(el).hasAttribute('hidden')).toBe(true)
      expect(canvasOf(el).getAttribute('aria-label')).toContain('已签名')
    } finally {
      restore()
    }
  })

  it('oas-change 幂等：同值指纹不重复派发（两笔相同笔画只发一次）', () => {
    const restore = installCanvasMock()
    try {
      const el = mount()
      mockCanvasRect(el)
      const p: Array<[number, number]> = [
        [10, 10],
        [50, 50],
        [90, 90],
      ]
      const first = drawStroke(el, p)
      const second = drawStroke(el, p)
      expect(first.length).toBe(1)
      expect(second.length).toBe(0)
    } finally {
      restore()
    }
  })

  it('clear()：清空画布 + 归空 value + 派发 oas-change；重复 clear 不再派发', () => {
    const restore = installCanvasMock()
    try {
      const el = mount()
      mockCanvasRect(el)
      drawStroke(el, [
        [10, 10],
        [90, 90],
      ])
      expect(el.getAttribute('value')).not.toBe('')
      const events: CustomEvent[] = []
      el.addEventListener('oas-change', (e) => events.push(e as CustomEvent))
      el.clear()
      expect(el.getAttribute('value')).toBe('')
      expect(events.map((e) => e.detail)).toEqual([{ value: '' }])
      expect(placeholderOf(el).hasAttribute('hidden')).toBe(false)
      el.clear()
      expect(events.map((e) => e.detail)).toEqual([{ value: '' }])
    } finally {
      restore()
    }
  })

  it('清空按钮点击 = clear()（键盘可达的原生 button）', () => {
    const restore = installCanvasMock()
    try {
      const el = mount({ clearable: '' })
      mockCanvasRect(el)
      drawStroke(el, [
        [10, 10],
        [90, 90],
      ])
      const events: CustomEvent[] = []
      el.addEventListener('oas-change', (e) => events.push(e as CustomEvent))
      clearBtnOf(el).click()
      expect(el.getAttribute('value')).toBe('')
      expect(events.map((e) => e.detail)).toEqual([{ value: '' }])
    } finally {
      restore()
    }
  })

  it('disabled：拦截笔画（无 value、无事件、状态仍为未签名）', () => {
    const restore = installCanvasMock()
    try {
      const el = mount({ disabled: '' })
      mockCanvasRect(el)
      const events = drawStroke(el, [
        [10, 10],
        [90, 90],
      ])
      expect(events).toEqual([])
      expect(el.getAttribute('value') ?? '').toBe('')
      expect(canvasOf(el).getAttribute('aria-label')).toContain('未签名')
    } finally {
      restore()
    }
  })

  it('readonly：拦截新笔画但保留既有笔迹与 value', () => {
    const restore = installCanvasMock()
    try {
      const el = mount()
      mockCanvasRect(el)
      drawStroke(el, [
        [10, 10],
        [90, 90],
      ])
      expect(el.getAttribute('value')).not.toBe('')
      el.setAttribute('readonly', '')
      const events = drawStroke(el, [
        [20, 20],
        [80, 80],
      ])
      expect(events).toEqual([])
      expect(el.getAttribute('value')).toBe('data:image/png;base64,MOCKPNG')
      expect(canvasOf(el).getAttribute('aria-label')).toContain('已签名')
    } finally {
      restore()
    }
  })

  it('受控 value：外部写入不同值清空笔迹；写回自身值不触发清空与事件', () => {
    const restore = installCanvasMock()
    try {
      const el = mount()
      mockCanvasRect(el)
      drawStroke(el, [
        [10, 10],
        [90, 90],
      ])
      // 宿主回写自己收到的值（受控闭环）→ 不重复派发、笔迹保留
      const events: CustomEvent[] = []
      el.addEventListener('oas-change', (e) => events.push(e as CustomEvent))
      el.setAttribute('value', 'data:image/png;base64,MOCKPNG')
      expect(events).toEqual([])
      expect(placeholderOf(el).hasAttribute('hidden')).toBe(true)
      // 宿主写入外部图像值 → 笔迹清空（转外部图像加载，异步绘制）
      // happy-dom 的 Image 对 data: URL 会同步触发 onload，此处 stub 住以断言「加载中」中间态
      class FakeImage {
        static instances: FakeImage[] = []
        width = 100
        height = 50
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        src = ''
        constructor() {
          FakeImage.instances.push(this)
        }
      }
      vi.stubGlobal('Image', FakeImage)
      el.setAttribute('value', 'data:image/png;base64,EXTERNAL')
      expect(placeholderOf(el).hasAttribute('hidden')).toBe(false)
      expect(canvasOf(el).getAttribute('aria-label')).toContain('未签名')
      // 宿主归空 → 画布清空
      el.setAttribute('value', '')
      expect(el.getAttribute('value')).toBe('')
    } finally {
      restore()
    }
  })

  it('pen-size：笔画使用设置线宽，非法值回退默认 2', () => {
    const restore = installCanvasMock()
    try {
      const el = mount({ 'pen-size': '5' })
      mockCanvasRect(el)
      drawStroke(el, [
        [10, 10],
        [90, 90],
      ])
      expect(lastCtx!.lineWidth).toBe(5)
      const bad = mount({ 'pen-size': 'abc' })
      mockCanvasRect(bad)
      drawStroke(bad, [
        [10, 10],
        [90, 90],
      ])
      expect(lastCtx!.lineWidth).toBe(2)
    } finally {
      restore()
    }
  })

  it('pen-color：CSS 色值直接入 canvas；预设名走 --oas-preset-* token 解析通道', () => {
    const restore = installCanvasMock()
    try {
      const el = mount({ 'pen-color': '#123456' })
      mockCanvasRect(el)
      drawStroke(el, [
        [10, 10],
        [90, 90],
      ])
      expect(lastCtx!.strokeStyle).toBe('#123456')
      // 预设名：把 token 挂到画布上走 getComputedStyle 解析（happy-dom 无级联回退实色，
      // 此处断言机制——token 变量名写入画布 style.color）
      const preset = mount({ 'pen-color': 'blue' })
      mockCanvasRect(preset)
      drawStroke(preset, [
        [10, 10],
        [90, 90],
      ])
      expect(canvasOf(preset).style.color).toContain('--oas-preset-blue')
    } finally {
      restore()
    }
  })

  it('resize：保留笔迹重绘——归一化坐标映射到新尺寸', () => {
    const restore = installCanvasMock()
    try {
      // 捕获 ResizeObserver 回调手动触发（happy-dom 无排版不会自发回调）
      const roCallbacks: Array<() => void> = []
      const RO = globalThis.ResizeObserver
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(cb: () => void) {
            roCallbacks.push(cb)
          }
          observe() {}
          unobserve() {}
          disconnect() {}
        },
      )
      try {
        const el = mount()
        mockCanvasRect(el)
        drawStroke(el, [
          [10, 10],
          [90, 90],
        ])
        const lineTos = (ctx: MockCtx) => ctx.calls.filter((c) => c[0] === 'lineTo').map((c) => c.slice(1) as number[])
        const before = lineTos(lastCtx!)
        // 宿主变宽一倍 → 归一化坐标 (0.3, 0.5625) 应映射到两倍 x
        mockCanvasRect(el, { ...RECT, width: 600, right: 600 })
        roCallbacks.forEach((cb) => cb())
        const after = lineTos(lastCtx!)
        expect(after.length, '重放与初次全量绘制产出相同线段数（新 ctx 上的纯重放）').toBe(before.length)
        expect(after[after.length - 1]![0]).toBeCloseTo(before[before.length - 1]![0]! * 2, 5)
        // value 指纹不变（同笔迹），不重复派发
        const events: CustomEvent[] = []
        el.addEventListener('oas-change', (e) => events.push(e as CustomEvent))
        roCallbacks.forEach((cb) => cb())
        expect(events).toEqual([])
      } finally {
        vi.stubGlobal('ResizeObserver', RO)
      }
    } finally {
      restore()
    }
  })

  it('主题切换：documentElement class 变化触发重绘并换解析笔色', async () => {
    const restore = installCanvasMock()
    const originalGC = globalThis.getComputedStyle
    let color = 'rgb(24, 24, 27)'
    vi.stubGlobal('getComputedStyle', () => ({ color }) as CSSStyleDeclaration)
    try {
      const el = mount()
      mockCanvasRect(el)
      drawStroke(el, [
        [10, 10],
        [90, 90],
      ])
      expect(lastCtx!.strokeStyle).toBe('rgb(24, 24, 27)')
      color = 'rgb(250, 250, 250)'
      document.documentElement.classList.add('theme-dark')
      await new Promise((r) => setTimeout(r, 0))
      const strokes = lastCtx!.calls.filter((c) => c[0] === 'stroke').length
      expect(strokes, '主题切换触发重绘，重放唯一一笔').toBe(1)
      expect(lastCtx!.strokeStyle).toBe('rgb(250, 250, 250)')
    } finally {
      vi.stubGlobal('getComputedStyle', originalGC)
      document.documentElement.classList.remove('theme-dark')
      restore()
    }
  })

  it('笔画进行中触发 repaint：已画段不丢，尾笔完整（两段笔迹齐全）', () => {
    // toDataURL 按调用序变化：恒定指纹会让第二笔被幂等抑制，无法断言「第二笔派发」
    let seq = 0
    const restore = installCanvasMock(() => `data:image/png;base64,MOCK${seq++}`)
    try {
      const el = mount()
      mockCanvasRect(el)
      const canvas = canvasOf(el)
      // 第一笔落定（3 点 2 段）
      drawStroke(el, [
        [10, 10],
        [50, 50],
        [90, 90],
      ])
      const events: CustomEvent[] = []
      el.addEventListener('oas-change', (e) => events.push(e as CustomEvent))
      const fire = (type: string, [x, y]: [number, number]) => {
        canvas.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            composed: true,
            pointerId: 1,
            button: 0,
            clientX: x,
            clientY: y,
          }),
        )
      }
      const lineTos = (ctx: MockCtx) => ctx.calls.filter((c) => c[0] === 'lineTo').map((c) => c.slice(1) as number[])
      // 第二笔进行中：down + 2 moves（已画 2 段）
      fire('pointerdown', [20, 20])
      fire('pointermove', [40, 60])
      fire('pointermove', [60, 40])
      // 中途触发 repaint（宿主改 height → update → repaint；repaint 会重置画布像素）
      el.setAttribute('height', '200')
      // 全量重绘必须重放：第一笔 2 段 + 进行中第二笔已画 2 段（旧实现漏 drawing → 这里只有 2 段）
      const replayed = lineTos(lastCtx!)
      expect(replayed.length, '重绘包含落定笔迹与进行中笔画已画段').toBe(4)
      // 收尾最后一段（增量画在重放后的画布上）
      fire('pointermove', [80, 80])
      fire('pointerup', [80, 80])
      expect(events.length, '第二笔落定派发一次').toBe(1)
      expect(events[0]!.detail.value).toMatch(/^data:image\/png;base64,MOCK/)
      expect(el.getAttribute('value')).toBe(events[0]!.detail.value)
      // 再触发一次 repaint：两笔共 2+3=5 段，尾笔三点齐备（归一化坐标按 mock 尺寸 300×160 映射）
      el.setAttribute('height', '240')
      const settled = lineTos(lastCtx!)
      expect(settled.length, '两笔完整重放').toBe(5)
      expect(settled[1]![0]).toBeCloseTo(90, 5)
      expect(settled[1]![1]).toBeCloseTo(90, 5)
      expect(settled[4]![0]).toBeCloseTo(80, 5)
      expect(settled[4]![1]).toBeCloseTo(80, 5)
    } finally {
      restore()
    }
  })

  it('clear() 中断进行中笔画：clear 后 move/up 不复活笔画，value 保持空', () => {
    const restore = installCanvasMock()
    try {
      const el = mount()
      mockCanvasRect(el)
      const canvas = canvasOf(el)
      const events: CustomEvent[] = []
      el.addEventListener('oas-change', (e) => events.push(e as CustomEvent))
      const fire = (type: string, [x, y]: [number, number]) => {
        canvas.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            composed: true,
            pointerId: 1,
            button: 0,
            clientX: x,
            clientY: y,
          }),
        )
      }
      fire('pointerdown', [10, 10])
      fire('pointermove', [50, 50])
      el.clear()
      // clear 后的 move/up 不得复活被中断的笔画
      fire('pointermove', [90, 90])
      fire('pointerup', [90, 90])
      expect(events).toEqual([])
      expect(el.getAttribute('value') ?? '').toBe('')
      expect(canvasOf(el).getAttribute('aria-label')).toContain('未签名')
      expect(placeholderOf(el).hasAttribute('hidden')).toBe(false)
      // 后续正常笔画不受影响
      const later = drawStroke(el, [
        [20, 20],
        [80, 80],
      ])
      expect(later.length).toBe(1)
      expect(el.getAttribute('value')).toBe('data:image/png;base64,MOCKPNG')
    } finally {
      restore()
    }
  })

  it('受控外部值乱序：旧图像加载完成不得覆盖新值（imageSeq 作废路径）', () => {
    const restore = installCanvasMock()
    try {
      class FakeImage {
        static instances: FakeImage[] = []
        width = 100
        height = 50
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        src = ''
        constructor() {
          FakeImage.instances.push(this)
        }
      }
      vi.stubGlobal('Image', FakeImage)
      const el = mount()
      mockCanvasRect(el)
      // 连续两个外部值写入（第二个在第一个图像加载完成之前）
      el.setAttribute('value', 'data:image/png;base64,AAA')
      el.setAttribute('value', 'data:image/png;base64,BBB')
      expect(FakeImage.instances.length).toBe(2)
      const [imgA, imgB] = FakeImage.instances as [FakeImage, FakeImage]
      // 旧图像（A）后到 → 序号作废，不得绘制、不得覆盖新值
      imgA.onload?.()
      expect(lastCtx!.drawImages).toBe(0)
      expect(el.toDataURL()).toBe('')
      // 新图像（B）加载完成 → 正常绘制，进入已签名状态
      imgB.onload?.()
      expect(lastCtx!.drawImages).toBe(1)
      expect(el.toDataURL()).toBe('data:image/png;base64,MOCKPNG')
    } finally {
      restore()
    }
  })

  it('外部图像 onload 成功路径同步派生状态：占位隐藏、aria-label/aria-live 播报已签名', () => {
    const restore = installCanvasMock()
    try {
      class FakeImage {
        static instances: FakeImage[] = []
        width = 100
        height = 50
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        src = ''
        constructor() {
          FakeImage.instances.push(this)
        }
      }
      vi.stubGlobal('Image', FakeImage)
      const el = mount()
      mockCanvasRect(el)
      el.setAttribute('value', 'data:image/png;base64,EXTERNAL')
      // 写入时刻（图像未加载完成）：状态保持未签名、占位可见（loadExternalImage 首段 syncDerived）
      expect(placeholderOf(el).hasAttribute('hidden')).toBe(false)
      expect(canvasOf(el).getAttribute('aria-label')).toContain('未签名')
      expect(liveOf(el).textContent).toContain('未签名')
      // 图像加载完成 → 成功路径必须再 syncDerived：占位隐藏、aria/live 翻转为已签名
      FakeImage.instances[0]!.onload?.()
      expect(placeholderOf(el).hasAttribute('hidden')).toBe(true)
      expect(canvasOf(el).getAttribute('aria-label')).toContain('已签名')
      expect(liveOf(el).textContent).toContain('已签名')
      expect(el.toDataURL()).toBe('data:image/png;base64,MOCKPNG')
    } finally {
      restore()
    }
  })

  it('外部图像展示期间 repaint 不抹图像：drawImage 重放、toDataURL 非空、笔迹叠加在上', () => {
    const restore = installCanvasMock()
    try {
      class FakeImage {
        static instances: FakeImage[] = []
        width = 100
        height = 50
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        src = ''
        constructor() {
          FakeImage.instances.push(this)
        }
      }
      vi.stubGlobal('Image', FakeImage)
      // 捕获 ResizeObserver 回调手动触发 resize（happy-dom 无排版不会自发回调）
      const roCallbacks: Array<() => void> = []
      const RO = globalThis.ResizeObserver
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(cb: () => void) {
            roCallbacks.push(cb)
          }
          observe() {}
          unobserve() {}
          disconnect() {}
        },
      )
      try {
        const el = mount()
        mockCanvasRect(el)
        el.setAttribute('value', 'data:image/png;base64,EXTERNAL')
        FakeImage.instances[0]!.onload?.()
        expect(lastCtx!.drawImages, 'onload 经 repaint 绘制外部图像一次').toBe(1)
        expect(el.toDataURL()).toBe('data:image/png;base64,MOCKPNG')
        // 容器 resize → repaint 重置画布像素 → 外部图像必须随 paintAll 垫底重放（旧实现被抹）
        mockCanvasRect(el, { ...RECT, width: 600, right: 600 })
        roCallbacks.forEach((cb) => cb())
        expect(lastCtx!.drawImages, 'resize 后外部图像重放，不被抹').toBe(1)
        expect(el.toDataURL(), 'value 契约保持非空').toBe('data:image/png;base64,MOCKPNG')
        expect(canvasOf(el).getAttribute('aria-label')).toContain('已签名')
        expect(placeholderOf(el).hasAttribute('hidden')).toBe(true)
        // 笔迹叠加仍画在外部图像之上（增量画段走 paintSegment，坐标映射到新尺寸）
        drawStroke(el, [
          [10, 10],
          [90, 90],
        ])
        const lineTos = lastCtx!.calls.filter((c) => c[0] === 'lineTo')
        expect(lineTos.length).toBe(1)
        expect(lineTos[0]![1]).toBeCloseTo(90, 5)
      } finally {
        vi.stubGlobal('ResizeObserver', RO)
      }
    } finally {
      restore()
    }
  })

  it('height 属性：写入画布 CSS 高度；非法值回退 160', () => {
    const el = mount({ height: '200' })
    expect(canvasOf(el).style.height).toBe('200px')
    const bad = mount({ height: '-5' })
    expect(canvasOf(bad).style.height).toBe('160px')
  })

  it('外部图像未挂树期间加载完成：状态保留，重连后重放绘制（不断开永久失同步 I1 回归）', () => {
    const restore = installCanvasMock()
    try {
      class FakeImage {
        static instances: FakeImage[] = []
        width = 100
        height = 50
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        src = ''
        constructor() {
          FakeImage.instances.push(this)
        }
      }
      vi.stubGlobal('Image', FakeImage)
      // 捕获 ResizeObserver 回调手动触发（重连后 watchResize 重建 observer）
      const roCallbacks: Array<() => void> = []
      const RO = globalThis.ResizeObserver
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(cb: () => void) {
            roCallbacks.push(cb)
          }
          observe() {}
          unobserve() {}
          disconnect() {}
        },
      )
      try {
        const el = mount()
        const canvas = canvasOf(el)
        // 连接感知矩形 mock：挂树返回有效尺寸，断开返回全 0（与真实浏览器一致——
        // 未挂树画布无布局，repaint 自然跳过；断言重连后 RO 重放真正完成绘制）
        const ZERO_RECT = { ...RECT, width: 0, height: 0, right: 0, bottom: 0 } as DOMRect
        vi.spyOn(canvas, 'getBoundingClientRect').mockImplementation(function (this: HTMLCanvasElement) {
          return this.isConnected ? RECT : ZERO_RECT
        })
        el.setAttribute('value', 'data:image/png;base64,EXTERNAL')
        // 断开期间图像加载完成：不得因 !isConnected 丢弃（旧实现丢弃后重连画布恒空白、toDataURL 空串且不自愈）
        el.remove()
        FakeImage.instances[0]!.onload?.()
        // 加载成功路径照常置位派生状态：占位隐藏、aria 已签名（即使未挂树也同步，重连即正确）
        expect(placeholderOf(el).hasAttribute('hidden')).toBe(true)
        expect(canvasOf(el).getAttribute('aria-label')).toContain('已签名')
        // 重连：RO 初始回调重放 → 外部图像绘制、value 契约非空
        document.body.appendChild(el)
        roCallbacks.forEach((cb) => cb())
        expect(lastCtx!.drawImages).toBeGreaterThanOrEqual(1)
        expect(el.toDataURL()).toBe('data:image/png;base64,MOCKPNG')
      } finally {
        vi.stubGlobal('ResizeObserver', RO)
      }
    } finally {
      restore()
    }
  })

  it('笔画热路径：一次笔画 getComputedStyle/getBoundingClientRect 调用有界（不随 move 数增长，M1 回归）', () => {
    const restore = installCanvasMock()
    try {
      const el = mount()
      const canvas = canvasOf(el)
      const rectSpy = vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(RECT)
      const gcsSpy = vi.spyOn(window, 'getComputedStyle')
      const gcsOnCanvas = () => gcsSpy.mock.calls.filter((args) => args[0] === canvas).length
      // 10 点笔画（8 个 move）：move 热路径必须零样式/布局强制重算
      drawStroke(el, [
        [10, 10],
        [20, 20],
        [30, 30],
        [40, 40],
        [50, 50],
        [60, 60],
        [70, 70],
        [80, 80],
        [90, 60],
        [100, 40],
      ])
      // 有界口径：整笔各 ≤4 次（down 缓存解析 / value 回写触发的 update 重绘键计算 / 收尾收敛等
      // 固定站点），旧实现每 move 各 1 次（本例 8 个 move → 16+ 次）——增长只随笔画数、不随 move 数
      expect(rectSpy.mock.calls.length).toBeLessThanOrEqual(4)
      expect(gcsOnCanvas()).toBeLessThanOrEqual(4)
      // 第二笔累计同界（≤8）：若 move 热路径回退为实时查询，累计将随 move 总数超界
      drawStroke(el, [
        [15, 15],
        [25, 25],
        [35, 35],
        [45, 45],
        [55, 55],
        [65, 65],
        [75, 75],
        [85, 85],
      ])
      expect(rectSpy.mock.calls.length).toBeLessThanOrEqual(8)
      expect(gcsOnCanvas()).toBeLessThanOrEqual(8)
    } finally {
      restore()
    }
  })

  it('toDataURL()：空画布返回空串，有笔迹返回 PNG dataURL', () => {
    const restore = installCanvasMock()
    try {
      const el = mount()
      mockCanvasRect(el)
      expect(el.toDataURL()).toBe('')
      drawStroke(el, [
        [10, 10],
        [90, 90],
      ])
      expect(el.toDataURL()).toBe('data:image/png;base64,MOCKPNG')
    } finally {
      restore()
    }
  })

  it('无 canvas 环境（happy-dom 默认）：数据层可用不崩溃——笔迹记录、状态播报、不产生图像值', () => {
    const el = mount()
    mockCanvasRect(el)
    const events = drawStroke(el, [
      [10, 10],
      [90, 90],
    ])
    // 笔画被记录（aria 状态翻转），但无 2d 上下文不产生 dataURL、不派发空值事件
    expect(canvasOf(el).getAttribute('aria-label')).toContain('已签名')
    expect(el.getAttribute('value') ?? '').toBe('')
    expect(events).toEqual([])
  })

  it('多指触控：第二指 down/move/up 不污染首笔（按 pointerId 过滤）', () => {
    const restore = installCanvasMock()
    try {
      const el = mount()
      mockCanvasRect(el)
      const canvas = canvasOf(el)
      const events: CustomEvent[] = []
      el.addEventListener('oas-change', (e) => events.push(e as CustomEvent))
      const fire = (type: string, pointerId: number, [x, y]: [number, number]) => {
        canvas.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            composed: true,
            pointerId,
            button: 0,
            clientX: x,
            clientY: y,
          }),
        )
      }
      // 首指起笔 → 第二指按下被忽略 → 第二指 move 必须被过滤（否则跳变线段进首笔）
      fire('pointerdown', 1, [10, 10])
      fire('pointermove', 1, [50, 50])
      fire('pointerdown', 2, [200, 20])
      fire('pointermove', 2, [280, 140])
      // 第二指的 up 不收尾首笔：仍处进行中，未派发
      fire('pointerup', 2, [290, 150])
      expect(events).toEqual([])
      expect(canvasOf(el).getAttribute('aria-label')).toContain('未签名')
      // 首指正常收尾：只派发一次
      fire('pointermove', 1, [90, 90])
      fire('pointerup', 1, [90, 90])
      expect(events.map((e) => e.detail)).toEqual([{ value: 'data:image/png;base64,MOCKPNG' }])
      expect(el.getAttribute('value')).toBe('data:image/png;base64,MOCKPNG')
      // 画布绘制命令中没有第二指坐标（x≈280/290 的 lineTo 不存在）
      const lineTos = lastCtx!.calls.filter((c) => c[0] === 'lineTo')
      expect(lineTos.length, '重放首指完整笔迹（3 点 2 段），第二指零线段').toBe(2)
      for (const c of lineTos) {
        expect(c[1], '第二指坐标不得进首笔').toBeLessThan(150)
      }
    } finally {
      restore()
    }
  })

  it('单击（无位移单点）不成笔：不入列、不派发、状态保持未签名', () => {
    const restore = installCanvasMock()
    try {
      const el = mount()
      mockCanvasRect(el)
      // down+up 同点
      let events = drawStroke(el, [
        [50, 50],
        [50, 50],
      ])
      expect(events).toEqual([])
      expect(el.getAttribute('value') ?? '').toBe('')
      expect(canvasOf(el).getAttribute('aria-label')).toContain('未签名')
      expect(placeholderOf(el).hasAttribute('hidden')).toBe(false)
      // down+move 同点（重复点被去重）+up → 仍为单点，不成笔
      events = drawStroke(el, [
        [50, 50],
        [50, 50],
        [50, 50],
      ])
      expect(events).toEqual([])
      expect(canvasOf(el).getAttribute('aria-label')).toContain('未签名')
    } finally {
      restore()
    }
  })

  it('断开重连不重复注册监听：重连后 pointerdown 只触发一次 handler', () => {
    const restore = installCanvasMock()
    try {
      const spy = vi.spyOn(
        OASSignature.prototype as unknown as { onPointerDown(e: PointerEvent): void },
        'onPointerDown',
      )
      const el = mount()
      mockCanvasRect(el)
      // 断开重连（路由缓存摘挂场景）：onReconnect → bind 重入
      el.remove()
      document.body.appendChild(el)
      canvasOf(el).dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          composed: true,
          pointerId: 1,
          button: 0,
          clientX: 10,
          clientY: 10,
        }),
      )
      expect(spy, '监听只注册一次，重连不累积').toHaveBeenCalledTimes(1)
    } finally {
      restore()
    }
  })

  it('DSD 真水合：快照结构命中直接接管，跳过 shadow 重建', () => {
    const el = new OASSignature()
    // 模拟服务端 DSD 快照：指纹 meta + 骨架
    const probe = new OASSignature()
    document.body.appendChild(probe)
    const skeleton = probe.shadowRoot!.innerHTML
    probe.remove()
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-signature" data-oas-ssr-v="1">${skeleton}`
    document.body.appendChild(el)
    // 接管成功：shadow 内没有残留指纹 meta（基类移除），骨架未被 render 重建
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(el.shadowRoot!.querySelector('canvas')).toBeInstanceOf(HTMLCanvasElement)
  })

  it('DSD 结构不符回退 render() 重建', () => {
    const el = new OASSignature()
    el.shadowRoot!.innerHTML = '<meta data-oas-ssr="oas-signature" data-oas-ssr-v="1"><div>garbage</div>'
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="clear-button"]')).toBeInstanceOf(HTMLButtonElement)
    expect(el.shadowRoot!.textContent).not.toContain('garbage')
  })
})
