import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASImageCropper } from './index.js'

function mount(attrs: Record<string, string> = {}): OASImageCropper {
  const el = new OASImageCropper()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function stage(el: OASImageCropper): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="stage"]')!
}

function frame(el: OASImageCropper): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="frame"]')!
}

function image(el: OASImageCropper): HTMLImageElement {
  return el.shadowRoot!.querySelector<HTMLImageElement>('[part="image"]')!
}

function action(el: OASImageCropper, act: string): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>(`[data-act="${act}"]`)!
}

function click(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
}

function frameBox(el: OASImageCropper): { x: number; y: number; w: number; h: number } {
  const f = frame(el)
  return {
    x: Number.parseFloat(f.style.left),
    y: Number.parseFloat(f.style.top),
    w: Number.parseFloat(f.style.width),
    h: Number.parseFloat(f.style.height),
  }
}

/** 让图片进入「已加载」态（happy-dom 不解码图片，naturals 需显式给出） */
function loadImage(el: OASImageCropper, width = 800, height = 600): void {
  const img = image(el)
  Object.defineProperty(img, 'naturalWidth', { value: width, configurable: true })
  Object.defineProperty(img, 'naturalHeight', { value: height, configurable: true })
  img.dispatchEvent(new Event('load'))
}

function pointerEvent(type: string, x: number, y: number, extra: PointerEventInit = {}): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    composed: true,
    cancelable: true,
    pointerId: 1,
    button: 0,
    clientX: x,
    clientY: y,
    ...extra,
  })
}

/** 在舞台上拖拽一段位移（target 为舞台本身 = 图片平移；frame 传入则拖裁剪框） */
function dragOn(el: OASImageCropper, target: HTMLElement, fromX: number, fromY: number, dx: number, dy: number): void {
  target.dispatchEvent(pointerEvent('pointerdown', fromX, fromY))
  target.dispatchEvent(pointerEvent('pointermove', fromX + dx, fromY + dy))
  target.dispatchEvent(pointerEvent('pointerup', fromX + dx, fromY + dy))
}

/** 舞台基准矩形（480×320 + 无偏移），滚轮锚点换算依赖它 */
function stubStageRect(el: OASImageCropper): void {
  stage(el).getBoundingClientRect = (() => ({
    left: 0,
    top: 0,
    right: 480,
    bottom: 320,
    width: 480,
    height: 320,
    x: 0,
    y: 0,
    toJSON: () => undefined,
  })) as Element['getBoundingClientRect']
}

/** 滚轮事件：happy-dom 的 WheelEvent 不接收 clientX/clientY 初始值，显式补上（真实浏览器自带） */
function wheelEvent(x: number, y: number, deltaY: number): WheelEvent {
  const ev = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY })
  Object.defineProperty(ev, 'clientX', { value: x, configurable: true })
  Object.defineProperty(ev, 'clientY', { value: y, configurable: true })
  return ev
}

describe('OASImageCropper', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('无 src 时显示空态，工具栏按钮均存在且带可读名称', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="empty"]')!.hidden).toBe(false)
    expect(action(el, 'rotate').textContent).toBe('旋转')
    expect(action(el, 'reset').textContent).toBe('重置')
    expect(action(el, 'confirm').textContent).toBe('裁剪')
    expect(stage(el).getAttribute('role')).toBe('group')
    expect(stage(el).getAttribute('aria-label')).toBe('图片裁剪')
  })

  it('设置 src 后载入图片并隐藏空态', async () => {
    const el = mount({ src: 'data:image/png;base64,AAAA' })
    expect(image(el).getAttribute('src')).toBe('data:image/png;base64,AAAA')
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="empty"]')!.hidden).toBe(true)
  })

  it('不安全协议 src 被忽略并保持空态', () => {
    const el = mount({ src: 'javascript:alert(1)' })
    expect(image(el).getAttribute('src')).toBeNull()
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="empty"]')!.hidden).toBe(false)
  })

  it('固定比例 1:1 时裁剪框为正方形', () => {
    const el = mount({ 'aspect-ratio': '1' })
    const box = frameBox(el)
    expect(box.w).toBeCloseTo(box.h, 5)
  })

  it('固定比例 16/9 时裁剪框符合比例', () => {
    const el = mount({ 'aspect-ratio': '16/9' })
    const box = frameBox(el)
    expect(box.w / box.h).toBeCloseTo(16 / 9, 3)
  })

  it('自由比例（缺省）下裁剪框铺满可用区域', () => {
    const el = mount()
    const box = frameBox(el)
    expect(box.w).toBeGreaterThan(box.h)
    // 居中：左右留白相等（上下同理），说明裁剪框铺在可用区域中央
    expect(box.x).toBeCloseTo(box.y, 5)
  })

  it('非法 aspect-ratio 回落自由比例并告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount({ 'aspect-ratio': 'abc' })
    expect(warn).toHaveBeenCalled()
  })

  it('缩放默认 100%，setZoom 夹在 1..max-zoom 之间并同步滑块', () => {
    const el = mount({ 'max-zoom': '2' })
    expect(el.zoom).toBe(1)
    el.setZoom(1.5)
    expect(el.zoom).toBe(1.5)
    const slider = el.shadowRoot!.querySelector<HTMLInputElement>('[part="zoom"]')!
    expect(Number(slider.value)).toBe(1.5)
    el.setZoom(9)
    expect(el.zoom).toBe(2)
    el.setZoom(0.1)
    expect(el.zoom).toBe(1)
  })

  it('放大/缩小按钮按步进调整缩放', () => {
    const el = mount({ 'max-zoom': '3' })
    click(action(el, 'zoom-in'))
    expect(el.zoom).toBe(1.25)
    click(action(el, 'zoom-out'))
    expect(el.zoom).toBe(1)
    click(action(el, 'zoom-out'))
    expect(el.zoom).toBe(1)
  })

  it('旋转按 90° 递增并回到 0，图片 transform 同步', () => {
    const el = mount({ src: 'data:image/png;base64,AAAA' })
    click(action(el, 'rotate'))
    expect(el.rotation).toBe(90)
    expect(image(el).style.transform).toContain('rotate(90deg)')
    click(action(el, 'rotate'))
    click(action(el, 'rotate'))
    click(action(el, 'rotate'))
    expect(el.rotation).toBe(0)
  })

  it('调整缩放/旋转派发 oas-change（携带 zoom / rotation / frame）', () => {
    const el = mount()
    const before = frameBox(el)
    const events: unknown[] = []
    el.addEventListener('oas-change', (e) => events.push((e as CustomEvent).detail))
    el.setZoom(2)
    click(action(el, 'rotate'))
    expect(events.length).toBe(2)
    const detail = events[1] as {
      zoom: number
      rotation: number
      frame: { x: number; y: number; width: number; height: number }
    }
    expect(detail.zoom).toBe(2)
    expect(detail.rotation).toBe(90)
    expect(detail.frame).toEqual({ x: before.x, y: before.y, width: before.w, height: before.h })
  })

  it('reset() 恢复缩放与旋转', () => {
    const el = mount()
    el.setZoom(2)
    el.rotate()
    el.reset()
    expect(el.zoom).toBe(1)
    expect(el.rotation).toBe(0)
  })

  it('canvas 不可用时 toBlob 返回 null、toDataURL 返回空串（不抛错）', async () => {
    const el = mount({ src: 'data:image/png;base64,AAAA' })
    await expect(el.toBlob()).resolves.toBeNull()
    expect(el.toDataURL()).toBe('')
  })

  it('确认按钮派发 oas-crop（含裁剪框/缩放/旋转，blob 可为 null）', async () => {
    const el = mount()
    const events: unknown[] = []
    el.addEventListener('oas-crop', (e) => events.push((e as CustomEvent).detail))
    click(action(el, 'confirm'))
    await new Promise((r) => setTimeout(r, 0))
    expect(events.length).toBe(1)
    const detail = events[0] as { blob: Blob | null; zoom: number; rotation: number }
    expect(detail.blob).toBeNull()
    expect(detail.zoom).toBe(1)
    expect(detail.rotation).toBe(0)
  })

  it('disabled 锁定工具栏且确认不派发事件', async () => {
    const el = mount({ disabled: '' })
    let fired = 0
    el.addEventListener('oas-crop', () => fired++)
    expect(action(el, 'rotate').disabled).toBe(true)
    expect(action(el, 'confirm').disabled).toBe(true)
    click(action(el, 'confirm'))
    await new Promise((r) => setTimeout(r, 0))
    expect(fired).toBe(0)
  })

  it('裁剪框可键盘移动（方向键 1px，Shift 10px）', () => {
    const el = mount()
    const before = frameBox(el)
    const stageH = before.y * 2 + before.h
    frame(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))
    expect(frameBox(el).x).toBeCloseTo(before.x + 1, 5)
    frame(el).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true, cancelable: true }),
    )
    // 自由比例裁剪框高度已接近舞台高度：下移被边界钳制
    expect(frameBox(el).y).toBeCloseTo(Math.min(before.y + 10, stageH - before.h), 5)
  })

  it('裁剪框不会被移出舞台边界', () => {
    const el = mount()
    const f = frame(el)
    const start = frameBox(el)
    const stageW = start.x * 2 + start.w
    for (let i = 0; i < 500; i++) {
      f.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))
    }
    expect(frameBox(el).x).toBeCloseTo(stageW - frameBox(el).w, 5)
  })

  it('max-zoom 非法值回落 3', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ 'max-zoom': '0' })
    el.setZoom(99)
    expect(el.zoom).toBe(3)
    expect(warn).toHaveBeenCalled()
  })

  // —— 双向绑定死循环（Critical 回归）：宿主在 oas-change 里回写 zoom 不得递归 ——
  it('宿主在 oas-change 里回写 el.zoom 不会递归爆栈（property 写入静默）', () => {
    const el = mount()
    let calls = 0
    el.addEventListener('oas-change', (e) => {
      calls++
      el.zoom = (e as CustomEvent<{ zoom: number }>).detail.zoom
    })
    expect(() => el.setZoom(2)).not.toThrow()
    expect(calls).toBe(1)
    expect(el.zoom).toBe(2)
  })

  it('property 通道静默：el.zoom 写入不派发 oas-change；setZoom 值未变也不派发', () => {
    const el = mount()
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    el.zoom = 1.5
    expect(el.zoom).toBe(1.5)
    expect(fired).toBe(0)
    el.setZoom(1.5)
    expect(fired).toBe(0)
    el.setZoom(2)
    expect(fired).toBe(1)
    // 已在上限：重复放大不产生噪音事件
    el.setZoom(99)
    expect(el.zoom).toBe(3)
    const atMax = fired
    el.setZoom(99)
    expect(fired).toBe(atMax)
  })

  // —— 输出来源（Minor 回归）：oas-load / oas-error 与错误视觉态 ——
  it('图片加载成功派发 oas-load（含原始尺寸）', () => {
    const el = mount({ src: 'data:image/png;base64,AAAA' })
    const events: unknown[] = []
    el.addEventListener('oas-load', (e) => events.push((e as CustomEvent).detail))
    const img = image(el)
    Object.defineProperty(img, 'naturalWidth', { value: 800, configurable: true })
    Object.defineProperty(img, 'naturalHeight', { value: 600, configurable: true })
    img.dispatchEvent(new Event('load'))
    expect(events).toEqual([{ width: 800, height: 600 }])
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="empty"]')!.hidden).toBe(true)
  })

  it('图片加载失败派发 oas-error 并显示错误态（破图不留在舞台）', () => {
    const el = mount({ src: 'data:image/png;base64,AAAA' })
    const events: unknown[] = []
    el.addEventListener('oas-error', (e) => events.push((e as CustomEvent).detail))
    image(el).dispatchEvent(new Event('error'))
    expect(events).toEqual([{ src: 'data:image/png;base64,AAAA' }])
    const empty = el.shadowRoot!.querySelector<HTMLElement>('[part="empty"]')!
    expect(empty.hidden).toBe(false)
    expect(empty.textContent).toBe('图片加载失败')
    expect(empty.dataset.state).toBe('error')
    expect(image(el).hidden).toBe(true)
    // 换新的 src（加载成功）后错误态清除
    el.setAttribute('src', 'data:image/png;base64,BBBB')
    expect(empty.hidden).toBe(true)
    expect(empty.dataset.state).toBeUndefined()
  })

  it('collision-guard：私有解析方法不与 attribute camelCase 撞名', () => {
    const proto = OASImageCropper.prototype as unknown as Record<string, unknown>
    for (const name of ['maxZoom', 'maxOutputSize', 'outputType']) {
      expect(
        proto[name],
        `${name} 不得作为实例成员存在（撞 max-zoom / max-output-size / output-type 的 camelCase）`,
      ).toBeUndefined()
    }
  })

  // ---------------------------------------------------------------------------
  // 图片平移（offset 激活）：pointer 拖拽 / 光标锚点缩放 / 覆盖约束 / Alt+方向键
  // ---------------------------------------------------------------------------

  it('拖拽舞台（非裁剪框目标）平移图片，裁剪框保持不动', () => {
    const el = mount({ src: 'data:image/png;base64,AAAA' })
    loadImage(el)
    const before = frameBox(el)
    dragOn(el, stage(el), 200, 100, 0, 20)
    // 图片向下 20px（图 800×600 覆盖 480×320 舞台：纵向可行区间 ±28，20 未触界）
    expect(el.offset.y).toBeCloseTo(20, 5)
    expect(image(el).style.transform).toContain('translate(0px, 20px)')
    expect(frameBox(el), '平移图片不得移动裁剪框').toEqual(before)
  })

  it('拖拽裁剪框只移动裁剪框，图片位移不变', () => {
    const el = mount({ src: 'data:image/png;base64,AAAA', 'aspect-ratio': '1' })
    loadImage(el)
    const before = frameBox(el)
    dragOn(el, frame(el), 200, 100, -20, 0)
    expect(frameBox(el).x).toBeCloseTo(before.x - 20, 5)
    expect(el.offset, '裁剪框拖拽不得带动图片').toEqual({ x: 0, y: 0 })
  })

  it('平移越界自动钳回：图片恒覆盖裁剪框（上下边界对称）', () => {
    const el = mount({ src: 'data:image/png;base64,AAAA' })
    loadImage(el)
    // 舞台 480×320，图 800×600 → 绘制 480×360；自由比例裁剪框 464×304 → 纵向可行 ±28
    dragOn(el, stage(el), 200, 100, 0, 5000)
    expect(el.offset.y).toBeCloseTo(28, 5)
    dragOn(el, stage(el), 200, 100, 0, -5000)
    expect(el.offset.y).toBeCloseTo(-28, 5)
    // 手势被浏览器接管（pointercancel）：回到本次平移起点，不留半程位移
    stage(el).dispatchEvent(pointerEvent('pointerdown', 200, 100))
    stage(el).dispatchEvent(pointerEvent('pointermove', 200, 150))
    expect(el.offset.y).toBeCloseTo(22, 5)
    stage(el).dispatchEvent(pointerEvent('pointercancel', 200, 150))
    expect(el.offset.y, 'pointercancel 回退到本次平移起点').toBeCloseTo(-28, 5)
    // 之后仍可正常平移（状态已收尾，不会卡在 cancel 上）
    dragOn(el, stage(el), 200, 100, 0, 10)
    expect(el.offset.y).toBeCloseTo(-18, 5)
  })

  it('滚轮缩放以光标位置为中心：锚点下的图片点保持不动', () => {
    const el = mount({ src: 'data:image/png;base64,AAAA' })
    loadImage(el)
    stubStageRect(el)
    const details: Array<{ zoom: number; offset: { x: number; y: number } }> = []
    el.addEventListener('oas-change', (e) =>
      details.push((e as CustomEvent<{ zoom: number; offset: { x: number; y: number } }>).detail),
    )
    const wheel = wheelEvent(240, 300, -100)
    const notPrevented = stage(el).dispatchEvent(wheel)
    expect(notPrevented, '舞台内滚轮缩放必须阻止页面滚动').toBe(false)
    expect(el.zoom).toBe(1.25)
    // 锚点相对舞台中心 (0, 140)，k = 1.25 → offsetY = 140 - 140×1.25 = -35
    expect(el.offset.x).toBeCloseTo(0, 5)
    expect(el.offset.y).toBeCloseTo(-35, 5)
    // 锚点处的图片局部坐标不变：p - center - offset 随缩放等比例放大
    expect((300 - 160 - el.offset.y) / (300 - 160)).toBeCloseTo(1.25, 5)
    expect(details).toHaveLength(1)
    expect(details[0]!.zoom).toBe(1.25)
    expect(details[0]!.offset.y).toBeCloseTo(-35, 5)
    // Ctrl+滚轮是浏览器页面缩放手势：组件不得接管（否则用户改不了页面缩放）
    const zoomBefore = el.zoom
    const ctrlWheel = wheelEvent(240, 300, -100)
    Object.defineProperty(ctrlWheel, 'ctrlKey', { value: true, configurable: true })
    expect(stage(el).dispatchEvent(ctrlWheel)).toBe(true)
    expect(el.zoom).toBe(zoomBefore)
  })

  it('缩放变小时按覆盖约束重新钳回；旋转后同样重新钳制', () => {
    const el = mount({ src: 'data:image/png;base64,AAAA' })
    loadImage(el)
    el.setZoom(2)
    // 缩放 2 倍：绘制 480×720 → 纵向可行 ±208
    dragOn(el, stage(el), 200, 100, 0, 5000)
    expect(el.offset.y).toBeCloseTo(208, 5)
    el.setZoom(1)
    expect(el.offset.y, '缩小后可行区间收窄，位移必须钳回').toBeCloseTo(28, 5)
    // 旋转 90°：图片占位尺寸交换，可行区间随之重算（不得抛错且仍在覆盖范围内）
    el.rotate()
    expect(Number.isFinite(el.offset.y)).toBe(true)
    expect(Math.abs(el.offset.y)).toBeLessThanOrEqual(28 + 1e-6)
  })

  it('Alt+方向键平移图片（1px / Shift 10px），裁剪框不动；reset() 归位 offset', () => {
    const el = mount({ src: 'data:image/png;base64,AAAA' })
    loadImage(el)
    const before = frameBox(el)
    frame(el).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true, cancelable: true }),
    )
    expect(el.offset).toEqual({ x: 0, y: 1 })
    frame(el).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, shiftKey: true, bubbles: true, cancelable: true }),
    )
    expect(el.offset).toEqual({ x: 0, y: 11 })
    expect(frameBox(el), 'Alt+方向键不得移动裁剪框').toEqual(before)
    el.reset()
    expect(el.offset).toEqual({ x: 0, y: 0 })
    expect(image(el).style.transform).toContain('translate(0px, 0px)')
  })

  it('未加载图片 / 禁用态下不响应平移，滚轮也不缩放', () => {
    const empty = mount()
    dragOn(empty, stage(empty), 200, 100, 0, 40)
    expect(empty.offset).toEqual({ x: 0, y: 0 })

    const disabled = mount({ src: 'data:image/png;base64,AAAA', disabled: '' })
    loadImage(disabled)
    stubStageRect(disabled)
    dragOn(disabled, stage(disabled), 200, 100, 0, 40)
    expect(disabled.offset).toEqual({ x: 0, y: 0 })
    const wheel = wheelEvent(240, 300, -100)
    expect(stage(disabled).dispatchEvent(wheel), '禁用态不接管滚轮').toBe(true)
    expect(disabled.zoom).toBe(1)
  })
})
