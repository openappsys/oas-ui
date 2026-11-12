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

/** 注入 mock canvas（返回记录命令的 2d 上下文；toDataURL 返回恒定 PNG） */
function installCanvasMock(url = 'data:image/png;base64,MOCKPNG') {
  const originalGetContext = HTMLCanvasElement.prototype.getContext
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL
  const fakeGetContext = function (this: HTMLCanvasElement, type: string): unknown {
    if (type !== '2d') return null
    const ctx = mockCtx()
    lastCtx = ctx
    return ctx
  }
  HTMLCanvasElement.prototype.getContext = fakeGetContext as unknown as typeof HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.toDataURL = () => url
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
      expect(events.length).toBe(1)
      expect(events[0]!.detail).toEqual({ value: 'data:image/png;base64,MOCKPNG' })
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
      expect(events.length).toBe(1)
      expect(events[0]!.detail).toEqual({ value: '' })
      expect(placeholderOf(el).hasAttribute('hidden')).toBe(false)
      el.clear()
      expect(events.length).toBe(1)
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
      expect(events.length).toBe(1)
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
      expect(events.length).toBe(0)
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
      expect(events.length).toBe(0)
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
      expect(events.length).toBe(0)
      expect(placeholderOf(el).hasAttribute('hidden')).toBe(true)
      // 宿主写入外部图像值 → 笔迹清空（转外部图像加载，异步绘制）
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
        expect(after.length).toBeGreaterThan(0)
        expect(after[after.length - 1]![0]).toBeCloseTo(before[before.length - 1]![0]! * 2, 5)
        // value 指纹不变（同笔迹），不重复派发
        const events: CustomEvent[] = []
        el.addEventListener('oas-change', (e) => events.push(e as CustomEvent))
        roCallbacks.forEach((cb) => cb())
        expect(events.length).toBe(0)
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
      expect(strokes).toBeGreaterThan(0)
      expect(lastCtx!.strokeStyle).toBe('rgb(250, 250, 250)')
    } finally {
      vi.stubGlobal('getComputedStyle', originalGC)
      document.documentElement.classList.remove('theme-dark')
      restore()
    }
  })

  it('height 属性：写入画布 CSS 高度；非法值回退 160', () => {
    const el = mount({ height: '200' })
    expect(canvasOf(el).style.height).toBe('200px')
    const bad = mount({ height: '-5' })
    expect(canvasOf(bad).style.height).toBe('160px')
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
    expect(events.length).toBe(0)
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
    expect(el.shadowRoot!.querySelector('canvas')).not.toBeNull()
  })

  it('DSD 结构不符回退 render() 重建', () => {
    const el = new OASSignature()
    el.shadowRoot!.innerHTML = '<meta data-oas-ssr="oas-signature" data-oas-ssr-v="1"><div>garbage</div>'
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="clear-button"]')).not.toBeNull()
    expect(el.shadowRoot!.textContent).not.toContain('garbage')
  })
})
