import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASDrag } from './index.js'

// 设计前必答 6 问的测试映射：
// 1. 取消路径：pointerup / pointercancel / 断连都会释放捕获并停止惯性帧；reset() 归位并清记忆
// 2. 默认值：boundary=viewport / axis=both / 惯性关 / 记忆关 / keyboard 开 / announce 关
// 3. 多步失败点：4px 阈值内不接管指针（子元素点击照常）；边界钳制不越界；非法选择器告警回落
// 4. 破坏性：无破坏性操作；disabled 全量关闭
// 5. 键盘 / ARIA：宿主 tabindex 与方向键步进、位置 aria-live 播报
// 6. 双通道：position property 读写、localStorage 记忆的 SSR / 隐私降级

const VIEWPORT = { width: 400, height: 300 }

function mount(attrs: Record<string, string> = {}, html = '<span class="content">客服</span>'): OASDrag {
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

function pointer(type: string, x: number, y: number, pointerId = 1, button = 0): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    button,
    pointerId,
    clientX: x,
    clientY: y,
  })
}

function drag(el: OASDrag, fromX: number, fromY: number, toX: number, toY: number): void {
  el.dispatchEvent(pointer('pointerdown', fromX, fromY))
  el.dispatchEvent(pointer('pointermove', toX, toY))
  el.dispatchEvent(pointer('pointerup', toX, toY))
}

function translate(el: OASDrag): string {
  return el.style.transform
}

describe('OAS drag 自由拖拽浮块', () => {
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

  it('渲染骨架：surface / handle / content 三区，handle 缺省隐藏，初始位移为 0', () => {
    const el = mount()
    const root = el.shadowRoot!
    expect(root.querySelectorAll('[part="surface"]').length).toBe(1)
    expect(root.querySelector<HTMLElement>('.handle')!.hidden).toBe(true)
    expect(root.querySelectorAll('[part="content"]').length).toBe(1)
    expect(translate(el)).toContain('0px')
    expect(el.position).toEqual({ x: 0, y: 0 })
  })

  it('缺省 boundary=viewport / axis=both / keyboard 开启，宿主可聚焦', () => {
    stubRect(mount())
    const el = document.querySelector('oas-drag') as OASDrag
    expect(el.getAttribute('boundary')).toBeNull()
    expect(el.getAttribute('tabindex')).toBe('0')
    expect(el.getAttribute('aria-label')).toBe('可拖动浮块')
    expect(el.getAttribute('aria-describedby')).toContain('oas-drag-hint')
  })

  it('位移未达 4px 阈值：不接管指针、不派发事件、不改变位移（子元素点击照常）', () => {
    const el = mount()
    stubRect(el)
    const capture = vi.spyOn(el, 'setPointerCapture')
    let starts = 0
    el.addEventListener('oas-drag-start', () => starts++)
    const notPrevented = el.dispatchEvent(pointer('pointerdown', 100, 100))
    const moveNotPrevented = el.dispatchEvent(pointer('pointermove', 102, 101))
    expect(notPrevented).toBe(true)
    expect(moveNotPrevented, '阈值内不应 preventDefault').toBe(true)
    expect(starts).toBe(0)
    expect(capture).not.toHaveBeenCalled()
    expect(el.position).toEqual({ x: 0, y: 0 })
  })

  it('越过阈值：接管指针（setPointerCapture）、置 data-dragging、派发 drag-start 与 drag', () => {
    const el = mount()
    stubRect(el)
    const capture = vi.spyOn(el, 'setPointerCapture')
    const release = vi.spyOn(el, 'releasePointerCapture')
    const events: Array<{ type: string; detail: Record<string, unknown> }> = []
    el.addEventListener('oas-drag-start', (event) =>
      events.push({ type: event.type, detail: (event as CustomEvent).detail }),
    )
    el.addEventListener('oas-drag', (event) => events.push({ type: event.type, detail: (event as CustomEvent).detail }))
    el.addEventListener('oas-drag-end', (event) =>
      events.push({ type: event.type, detail: (event as CustomEvent).detail }),
    )

    el.dispatchEvent(pointer('pointerdown', 100, 100))
    el.dispatchEvent(pointer('pointermove', 130, 120))
    expect(el.hasAttribute('data-dragging')).toBe(true)
    expect(capture).toHaveBeenCalledWith(1)
    expect(el.position).toEqual({ x: 30, y: 20 })
    expect(translate(el)).toBe('translate3d(30px, 20px, 0)')

    el.dispatchEvent(pointer('pointerup', 130, 120))
    expect(el.hasAttribute('data-dragging')).toBe(false)
    expect(release).toHaveBeenCalledWith(1)
    expect(events.map((event) => event.type)).toEqual(['oas-drag-start', 'oas-drag', 'oas-drag-end'])
    expect(events[2]!.detail).toMatchObject({ x: 30, y: 20, source: 'pointer' })
  })

  it('axis="x" 只改横轴、axis="y" 只改纵轴', () => {
    const xAxis = mount({ axis: 'x' })
    stubRect(xAxis)
    drag(xAxis, 100, 100, 140, 160)
    expect(xAxis.position).toEqual({ x: 40, y: 0 })

    document.body.innerHTML = ''
    const yAxis = mount({ axis: 'y' })
    stubRect(yAxis)
    drag(yAxis, 100, 100, 140, 160)
    expect(yAxis.position).toEqual({ x: 0, y: 60 })
  })

  it('axis 非法值回落 both 并告警一次', () => {
    const el = mount({ axis: 'diagonal' })
    stubRect(el)
    drag(el, 100, 100, 110, 110)
    expect(el.position).toEqual({ x: 10, y: 10 })
  })

  it('boundary=viewport：位移被钳制在视口内（右下与左上双向）', () => {
    const el = mount()
    stubRect(el)
    drag(el, 100, 100, 5000, 5000)
    // 视口 400×300，宿主基准 (100,100) 80×40 → 最大位移 220 / 160
    expect(el.position).toEqual({ x: 220, y: 160 })
    drag(el, 100, 100, -5000, -5000)
    expect(el.position).toEqual({ x: -100, y: -100 })
  })

  it('boundary=选择器：按容器矩形钳制；选择器未命中告警并回落视口', () => {
    const container = document.createElement('div')
    container.id = 'stage'
    container.getBoundingClientRect = (() => ({
      left: 50,
      top: 50,
      right: 250,
      bottom: 200,
      width: 200,
      height: 150,
      x: 50,
      y: 50,
      toJSON: () => undefined,
    })) as Element['getBoundingClientRect']
    document.body.appendChild(container)
    const el = mount({ boundary: '#stage' })
    stubRect(el)
    drag(el, 100, 100, 5000, 5000)
    // 容器右 250 - (100 + 80) = 70；下 200 - (100 + 40) = 60
    expect(el.position).toEqual({ x: 70, y: 60 })

    const fallback = mount({ boundary: '#missing-stage' })
    stubRect(fallback)
    drag(fallback, 100, 100, 5000, 5000)
    expect(fallback.position).toEqual({ x: 220, y: 160 })
  })

  it('disabled：指针与键盘都不移动，宿主不再可聚焦', () => {
    const el = mount({ disabled: '' })
    stubRect(el)
    let events = 0
    el.addEventListener('oas-drag', () => events++)
    drag(el, 100, 100, 200, 200)
    expect(el.position).toEqual({ x: 0, y: 0 })
    expect(events).toBe(0)
    expect(el.hasAttribute('tabindex')).toBe(false)
  })

  it('handle 模式：只有手柄区能起拖，其余区域保持原交互', () => {
    const el = mount({}, '<span slot="handle" class="grip">拖动</span><button class="call">联系</button>')
    stubRect(el)
    const handle = el.querySelector('.grip')!
    const button = el.querySelector('.call')!
    expect(el.shadowRoot!.querySelector<HTMLElement>('.handle')!.hidden).toBe(false)
    expect(el.hasAttribute('data-has-handle'), '手柄形态需要标记（样式据此决定光标与焦点策略）').toBe(true)

    button.dispatchEvent(pointer('pointerdown', 100, 100))
    button.dispatchEvent(pointer('pointermove', 160, 100))
    expect(el.position).toEqual({ x: 0, y: 0 })

    handle.dispatchEvent(pointer('pointerdown', 100, 100))
    handle.dispatchEvent(pointer('pointermove', 160, 100))
    expect(el.position).toEqual({ x: 60, y: 0 })
  })

  it('键盘微调：方向键 1px、Shift 10px，派发 source=keyboard 的 drag 事件', () => {
    const el = mount()
    stubRect(el)
    const details: Array<Record<string, unknown>> = []
    el.addEventListener('oas-drag', (event) => details.push((event as CustomEvent).detail))
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(el.position).toEqual({ x: 1, y: 0 })
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true }))
    expect(el.position).toEqual({ x: 1, y: 10 })
    expect(details.at(-1)).toMatchObject({ x: 1, y: 10, source: 'keyboard' })
  })

  it('键盘微调受 axis 约束且被边界钳制；子元素内不接管方向键', () => {
    const el = mount({ axis: 'x' }, '<input class="field" />')
    stubRect(el)
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(el.position).toEqual({ x: 0, y: 0 })
    const field = el.querySelector('.field')!
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(el.position).toEqual({ x: 0, y: 0 })
  })

  it('keyboard="false"：宿主不可聚焦且方向键无效', () => {
    const el = mount({ keyboard: 'false' })
    stubRect(el)
    expect(el.hasAttribute('tabindex')).toBe(false)
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(el.position).toEqual({ x: 0, y: 0 })
  })

  it('announce：开启后位置经 aria-live 播报，关闭时不写播报区', () => {
    const quiet = mount()
    stubRect(quiet)
    quiet.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(quiet.shadowRoot!.querySelector<HTMLElement>('[part="live"]')!.textContent).toBe('')

    document.body.innerHTML = ''
    const loud = mount({ announce: '' })
    stubRect(loud)
    loud.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }))
    const live = loud.shadowRoot!.querySelector<HTMLElement>('[part="live"]')!
    expect(live.hidden).toBe(false)
    expect(live.getAttribute('aria-live')).toBe('polite')
    expect(live.textContent).toContain('10')
  })

  it('remember：拖拽结束写 localStorage，新实例恢复位置；reset() 归位并清除记忆', () => {
    const first = mount({ remember: '', 'storage-key': 'tip-pos' })
    stubRect(first)
    drag(first, 100, 100, 140, 130)
    expect(JSON.parse(window.localStorage.getItem('tip-pos')!)).toEqual({ x: 40, y: 30 })

    first.remove()
    const second = mount({ remember: '', 'storage-key': 'tip-pos' })
    stubRect(second)
    expect(second.position).toEqual({ x: 40, y: 30 })

    second.reset()
    expect(second.position).toEqual({ x: 0, y: 0 })
    expect(window.localStorage.getItem('tip-pos')).toBeNull()
  })

  it('remember 关闭时不读写存储；存储抛错时静默降级', () => {
    const plain = mount()
    stubRect(plain)
    drag(plain, 100, 100, 130, 130)
    expect(window.localStorage.length).toBe(0)

    document.body.innerHTML = ''
    const errorSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const guarded = mount({ remember: '' })
    stubRect(guarded)
    // 存储不可用：不得抛错，拖拽照常生效（位置只是不落盘）
    expect(() => drag(guarded, 100, 100, 130, 130)).not.toThrow()
    expect(guarded.position).toEqual({ x: 30, y: 30 })
    errorSpy.mockRestore()
  })

  it('position property 双通道：赋值立即钳制生效且不派发事件', () => {
    const el = mount()
    stubRect(el)
    let events = 0
    el.addEventListener('oas-drag', () => events++)
    el.position = { x: 20, y: 10 }
    expect(el.position).toEqual({ x: 20, y: 10 })
    expect(translate(el)).toBe('translate3d(20px, 10px, 0)')
    el.position = JSON.stringify({ x: 9999, y: 0 }) as unknown as { x: number; y: number }
    expect(el.position).toEqual({ x: 220, y: 0 })
    expect(events).toBe(0)
  })

  it('惯性：开启时松手按 rAF 继续滑行，reduced-motion 下瞬停', () => {
    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1)
    const el = mount({ inertia: '' })
    stubRect(el)
    el.dispatchEvent(pointer('pointerdown', 100, 100))
    el.dispatchEvent(pointer('pointermove', 160, 100))
    el.dispatchEvent(pointer('pointerup', 160, 100))
    expect(rafSpy).toHaveBeenCalled()

    rafSpy.mockClear()
    document.body.innerHTML = ''
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))
    const reduced = mount({ inertia: '' })
    stubRect(reduced)
    drag(reduced, 100, 100, 160, 100)
    expect(rafSpy).not.toHaveBeenCalled()
    expect(reduced.hasAttribute('data-reduced-motion')).toBe(true)
    vi.unstubAllGlobals()
  })

  it('拖拽中断连：释放指针捕获、状态复位，重新挂载后可继续拖拽', () => {
    const el = mount()
    stubRect(el)
    const release = vi.spyOn(el, 'releasePointerCapture')
    el.dispatchEvent(pointer('pointerdown', 100, 100))
    el.dispatchEvent(pointer('pointermove', 140, 100))
    expect(el.hasAttribute('data-dragging')).toBe(true)
    el.remove()
    expect(release).toHaveBeenCalled()
    document.body.appendChild(el)
    stubRect(el)
    drag(el, 100, 100, 150, 100)
    expect(el.position.x).toBe(90)
  })

  it('非主键指针（右键）不启动拖拽', () => {
    const el = mount()
    stubRect(el)
    el.dispatchEvent(pointer('pointerdown', 100, 100, 1, 2))
    el.dispatchEvent(pointer('pointermove', 160, 100))
    expect(el.position).toEqual({ x: 0, y: 0 })
    expect(el.hasAttribute('data-dragging')).toBe(false)
  })

  // 4px 阈值只管了「点击不吞」的反向：拖完松手落在子按钮上，浏览器仍会补发一次 click，
  // 若不抑制就变成「拖一下顺手点了按钮」的误触（用户视角的真实缺陷）。
  it('越过阈值后松手：紧随的 click 被吞掉，不误触子按钮', () => {
    const el = mount({}, '<button class="call">联系</button>')
    stubRect(el)
    const button = el.querySelector('.call')!
    let clicks = 0
    button.addEventListener('click', () => clicks++)
    drag(el, 100, 100, 160, 120)
    // 真实浏览器在 pointerup 之后补发 click（同一任务内）
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }))
    expect(clicks, '拖拽结束的点击不得落到子元素').toBe(0)
  })

  it('click 抑制只作用于紧随的一次：之后的正常点击照常到达子元素', () => {
    const el = mount({}, '<button class="call">联系</button>')
    stubRect(el)
    const button = el.querySelector('.call')!
    let clicks = 0
    button.addEventListener('click', () => clicks++)
    drag(el, 100, 100, 160, 120)
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }))
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }))
    expect(clicks).toBe(1)
  })

  it('click 抑制在下一任务自动撤销（松手落在无子元素处时不吞掉之后的点击）', () => {
    vi.useFakeTimers()
    try {
      const el = mount({}, '<button class="call">联系</button>')
      stubRect(el)
      const button = el.querySelector('.call')!
      let clicks = 0
      button.addEventListener('click', () => clicks++)
      drag(el, 100, 100, 160, 120)
      vi.advanceTimersByTime(0)
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }))
      expect(clicks).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('pointercancel：收尾拖拽但不写位置记忆、不起惯性（与正常松手分离）', () => {
    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 1)
    const el = mount({ remember: '', inertia: '', 'storage-key': 'cancelled' })
    stubRect(el)
    const ends: Array<Record<string, unknown>> = []
    el.addEventListener('oas-drag-end', (event) => ends.push((event as CustomEvent).detail))
    el.dispatchEvent(pointer('pointerdown', 100, 100))
    el.dispatchEvent(pointer('pointermove', 160, 100))
    expect(el.hasAttribute('data-dragging')).toBe(true)
    el.dispatchEvent(pointer('pointercancel', 160, 100))
    expect(el.hasAttribute('data-dragging')).toBe(false)
    expect(ends).toHaveLength(1)
    expect(window.localStorage.getItem('cancelled'), '取消不落盘').toBeNull()
    expect(rafSpy, '取消不起惯性').not.toHaveBeenCalled()
  })

  it('位置记忆恢复帧禁用过渡（data-restoring，下一帧撤除）', () => {
    window.localStorage.setItem('restore-key', JSON.stringify({ x: 30, y: 20 }))
    const frames: FrameRequestCallback[] = []
    const rafSpy = vi
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => frames.push(cb))
    const el = mount({ remember: '', 'storage-key': 'restore-key' })
    stubRect(el)
    expect(el.position).toEqual({ x: 30, y: 20 })
    expect(el.hasAttribute('data-restoring'), '恢复帧需要禁用过渡（否则可见滑入）').toBe(true)
    frames.forEach((cb) => cb(0))
    expect(el.hasAttribute('data-restoring')).toBe(false)
    rafSpy.mockRestore()
  })
})
