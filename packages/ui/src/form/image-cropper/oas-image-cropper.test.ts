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

/**
 * 改舞台测量尺寸并走 ResizeObserver 的共同入口。
 * happy-dom 的 ResizeObserver 不会因尺寸变化回调，因此直接调用组件抽出的 `handleStageResize()`
 * （RO 回调与测试同一入口），保证测的是生产路径本身而不是替身。
 */
function resizeStage(el: OASImageCropper, width: number, height: number): void {
  const s = stage(el)
  Object.defineProperty(s, 'clientWidth', { value: width, configurable: true })
  Object.defineProperty(s, 'clientHeight', { value: height, configurable: true })
  ;(el as unknown as { handleStageResize(): void }).handleStageResize()
}

/** 滚轮事件：happy-dom 的 WheelEvent 不接收 clientX/clientY 初始值，显式补上（真实浏览器自带） */
function wheelEvent(x: number, y: number, deltaY: number): WheelEvent {
  const ev = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY })
  Object.defineProperty(ev, 'clientX', { value: x, configurable: true })
  Object.defineProperty(ev, 'clientY', { value: y, configurable: true })
  return ev
}

/**
 * 覆盖判据（几何真判据，与组件 `offsetBounds` 同一推导）：把舞台坐标点反旋到图片局部坐标
 * （R(-θ)），判断是否落在绘制矩形 ±(drawW/2, drawH/2) 内。旋转后「图片包围盒比舞台大」
 * 并不能推出「图片盖住舞台」——倾斜矩形的四角才是真判据，故断言必须走这一步。
 */
function pointCovered(el: OASImageCropper, px: number, py: number): boolean {
  const img = image(el)
  const drawW = Number.parseFloat(img.style.width)
  const drawH = Number.parseFloat(img.style.height)
  const rad = (el.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const offset = el.offset
  const cx = 480 / 2 + offset.x
  const cy = 320 / 2 + offset.y
  const dx = px - cx
  const dy = py - cy
  const u = dx * cos + dy * sin
  const v = -dx * sin + dy * cos
  return Math.abs(u) <= drawW / 2 + 0.5 && Math.abs(v) <= drawH / 2 + 0.5
}

function stageCorners(): Array<[number, number]> {
  return [
    [0, 0],
    [480, 0],
    [0, 320],
    [480, 320],
  ]
}

function frameCorners(el: OASImageCropper): Array<[number, number]> {
  const f = frameBox(el)
  return [
    [f.x, f.y],
    [f.x + f.w, f.y],
    [f.x, f.y + f.h],
    [f.x + f.w, f.y + f.h],
  ]
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

  it('rotate 45°：适配比按「舞台投影」收敛，裁剪框与舞台四角都落在图片内', () => {
    const el = mount({ src: 'data:image/png;base64,AAAA' })
    loadImage(el, 800, 600)
    el.rotate(45)
    // 推导（覆盖真实判据，不是包围盒「看起来够大」）：图片旋转 θ 后要覆盖轴对齐舞台，
    // 等价于「舞台四角反旋回图片局部坐标后落在绘制矩形 ±(drawW/2, drawH/2) 内」。
    // 舞台在图片局部 u 轴上的半宽投影 = (W·|cosθ| + H·|sinθ|)/2，故
    //   drawW ≥ W|cosθ| + H|sinθ|、drawH ≥ W|sinθ| + H|cosθ|
    // 代入 drawW = nw·s、drawH = nh·s 得
    //   s = max((W|cos| + H|sin|)/nw, (W|sin| + H|cos|)/nh)
    // 45°：s = (480 + 320)·(√2/2) / 600 = 0.942809…
    const expected = ((480 + 320) * Math.SQRT1_2) / 600
    expect(Number.parseFloat(image(el).style.width)).toBeCloseTo(800 * expected, 1)
    expect(Number.parseFloat(image(el).style.height)).toBeCloseTo(600 * expected, 1)
    expect(
      stageCorners().every(([x, y]) => pointCovered(el, x, y)),
      '舞台四角在图片内（恒 cover 舞台）',
    ).toBe(true)
    expect(
      frameCorners(el).every(([x, y]) => pointCovered(el, x, y)),
      '裁剪框四角在图片内（不露舞台底色）',
    ).toBe(true)
  })

  it('rotate 任意角度：0/30/45/60/90/135/210/315 都覆盖裁剪框与舞台', () => {
    for (const deg of [0, 30, 45, 60, 90, 135, 210, 315]) {
      const el = mount({ src: 'data:image/png;base64,AAAA' })
      loadImage(el, 800, 600)
      el.rotate(deg)
      expect(
        frameCorners(el).every(([x, y]) => pointCovered(el, x, y)),
        `${deg}° 裁剪框四角在图片内`,
      ).toBe(true)
      expect(
        stageCorners().every(([x, y]) => pointCovered(el, x, y)),
        `${deg}° 舞台四角在图片内`,
      ).toBe(true)
      el.remove()
    }
  })

  it('rotate 90° 倍数：包围盒公式退化为宽高互换（与既有行为一致）', () => {
    const el = mount({ src: 'data:image/png;base64,AAAA' })
    loadImage(el, 800, 600)
    el.rotate(90)
    // 90°：|cos|=0、|sin|=1 → bw = nh·s、bh = nw·s → s = max(480/600, 320/800) = 0.8
    expect(Number.parseFloat(image(el).style.width)).toBeCloseTo(800 * 0.8, 1)
    expect(Number.parseFloat(image(el).style.height)).toBeCloseTo(600 * 0.8, 1)
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

  it('缩放已到上下限时滚轮不再吞事件（放行页面滚动）', () => {
    const el = mount({ src: 'data:image/png;base64,AAAA' })
    loadImage(el)
    stubStageRect(el)
    // 上限（缺省 max-zoom=3）：再放大不会变化 → 不 preventDefault，页面照常滚
    el.setZoom(3)
    const atMax = wheelEvent(240, 300, -100)
    expect(stage(el).dispatchEvent(atMax), '上限再放大：放行页面滚动').toBe(true)
    expect(el.zoom).toBe(3)
    // 下限（1）：再缩小不会变化 → 同样放行
    el.setZoom(1)
    const atMin = wheelEvent(240, 300, 100)
    expect(stage(el).dispatchEvent(atMin), '下限再缩小：放行页面滚动').toBe(true)
    expect(el.zoom).toBe(1)
    // 中间值仍然吞（缩放语义不变）
    el.setZoom(2)
    const mid = wheelEvent(240, 300, -100)
    expect(stage(el).dispatchEvent(mid), '中间值照常接管').toBe(false)
    expect(el.zoom).toBe(2.25)
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
    // 旋转 90°：占位宽高互换 → 绘制 640×480，可行区间随之变成「纵向 ±168 / 横向 ±8」
    // （旋转前纵向只有 ±28；拿旋转前的界当上界等于恒真，必须按新朝向重算）
    el.rotate()
    expect(el.rotation).toBe(90)
    dragOn(el, stage(el), 200, 100, 0, 5000)
    expect(el.offset.y, '90° 纵向可行区间 (640-304)/2 = 168').toBeCloseTo(168, 5)
    dragOn(el, stage(el), 200, 100, 5000, 0)
    expect(el.offset.x, '90° 横向可行区间 (480-464)/2 = 8').toBeCloseTo(8, 5)
    expect(el.offset.y, '横向拖动不得改动纵向位移').toBeCloseTo(168, 5)
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

  // ---------------------------------------------------------------------------
  // 修复批回归（R1 补审）：舞台尺寸变化钳回 / 加载后光标提示 / 单击噪声 / 非主键 / 多指针
  // ---------------------------------------------------------------------------

  it('舞台尺寸变化（ResizeObserver 路径）后位移按新区间钳回，图片仍覆盖裁剪框', () => {
    const el = mount({ src: 'data:image/png;base64,AAAA' })
    loadImage(el)
    el.setZoom(2)
    // 480×320 舞台 + 2× → 绘制 800×600×(0.6×2)=960×720；帧 464×304 → 纵向可行 (720-304)/2 = 208
    dragOn(el, stage(el), 200, 100, 0, 5000)
    expect(el.offset.y, '前置：已拖到旧区间的纵向边界').toBeCloseTo(208, 5)
    // 舞台变窄（容器 / 视口变化）：fit 由「按宽」变成「按高」，绘制高 720 → 640，可行区间收窄
    resizeStage(el, 400, 320)
    expect(el.offset.y, '尺寸变化后必须钳回新区间 (640-304)/2 = 168').toBeCloseTo(168, 5)
    // 覆盖约束：|offset| + 帧高/2 ≤ 绘制高/2
    expect(Math.abs(el.offset.y) + 304 / 2).toBeLessThanOrEqual(640 / 2 + 1e-6)
    // 钳回后的位移必须落到图片 transform 上（用户可见，不是内部数值自嗨）
    expect(image(el).style.transform).toContain('translate(0px, 168px)')
  })

  it('图片异步加载完成后补上平移光标提示（happy-dom 对 data: URL 同步派发 load，真机是异步的）', () => {
    // 相对路径在 happy-dom 里不会同步取到图 —— 等价真机「update() 已跑完、load 尚未到达」的时刻
    const el = mount({ src: '/not-loaded-yet.png' })
    expect(stage(el).hasAttribute('data-pannable'), '加载完成前舞台不得可抓取').toBe(false)
    // 真机时序：update() 时 loaded=false，随后异步 load 到达；提示必须不依赖 update() 再次执行
    loadImage(el)
    expect(stage(el).hasAttribute('data-pannable'), '加载完成后舞台必须给出 grab 光标提示').toBe(true)
    // 破图回退：错误态不得残留可抓取提示
    image(el).dispatchEvent(new Event('error'))
    expect(stage(el).hasAttribute('data-pannable'), '错误态不得残留 grab 光标').toBe(false)
  })

  it('框外单击（无位移）不派发 oas-change；真拖动仍派发一次', () => {
    const el = mount({ src: 'data:image/png;base64,AAAA' })
    loadImage(el)
    const events: Array<{ zoom: number; rotation: number; offset: { x: number; y: number } }> = []
    el.addEventListener('oas-change', (e) =>
      events.push((e as CustomEvent<{ zoom: number; rotation: number; offset: { x: number; y: number } }>).detail),
    )
    stage(el).dispatchEvent(pointerEvent('pointerdown', 200, 100))
    stage(el).dispatchEvent(pointerEvent('pointerup', 200, 100))
    expect(events, '单击不是一次位移变化').toHaveLength(0)
    dragOn(el, stage(el), 200, 100, 0, 10)
    expect(events, '真拖动仍派发一次').toHaveLength(1)
    // 事件携带的终值与属性一致（不是空壳事件）
    expect(events[0]).toMatchObject({ zoom: 1, rotation: 0, offset: { x: 0, y: 10 } })
  })

  it('非主键（右键 / 中键）按下不平移图片', () => {
    const el = mount({ src: 'data:image/png;base64,AAAA' })
    loadImage(el)
    stage(el).dispatchEvent(pointerEvent('pointerdown', 200, 100, { button: 2 }))
    stage(el).dispatchEvent(pointerEvent('pointermove', 200, 140))
    expect(el.offset, '右键按下不得进入平移').toEqual({ x: 0, y: 0 })
    stage(el).dispatchEvent(pointerEvent('pointerup', 200, 140))
    // 裁剪框拖拽同样只认主键
    const before = frameBox(el)
    frame(el).dispatchEvent(pointerEvent('pointerdown', 200, 100, { button: 2 }))
    frame(el).dispatchEvent(pointerEvent('pointermove', 180, 100))
    expect(frameBox(el), '右键不得拖动裁剪框').toEqual(before)
  })

  it('第二根指针按下不覆盖进行中的平移会话', () => {
    const el = mount({ src: 'data:image/png;base64,AAAA' })
    loadImage(el)
    stage(el).dispatchEvent(pointerEvent('pointerdown', 200, 100))
    stage(el).dispatchEvent(pointerEvent('pointermove', 200, 110))
    expect(el.offset.y).toBeCloseTo(10, 5)
    // 另一根手指（不同 pointerId）落下：不得重置进行中的起点
    stage(el).dispatchEvent(pointerEvent('pointerdown', 200, 50, { pointerId: 2 }))
    stage(el).dispatchEvent(pointerEvent('pointermove', 200, 115, { pointerId: 2 }))
    expect(el.offset.y, '会话起点仍以第一指针为准（100 → 115 = 15）').toBeCloseTo(15, 5)
  })
})

describe('OASImageCropper 触控板像素级缩放（deltaMode，v2.6.9 批 A）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  /** 带显式 deltaMode 的滚轮事件（真实浏览器：deltaMode 0=像素 / 1=行） */
  function wheelWithMode(x: number, y: number, deltaY: number, deltaMode: number): WheelEvent {
    const ev = wheelEvent(x, y, deltaY)
    Object.defineProperty(ev, 'deltaMode', { value: deltaMode, configurable: true })
    return ev
  }

  it('像素模式小增量细粒度缩放：deltaY ±40 → ±0.1（不再整步跳变）', () => {
    const el = mount({ src: 'data:image/png;base64,AAAA' })
    loadImage(el)
    stubStageRect(el)
    stage(el).dispatchEvent(wheelWithMode(240, 300, -40, 0))
    expect(el.zoom).toBeCloseTo(1.1, 5)
    stage(el).dispatchEvent(wheelWithMode(240, 300, 20, 0))
    expect(el.zoom).toBeCloseTo(1.05, 5)
  })

  it('像素模式经典鼠标滚轮（deltaY=100/notch）与旧行为逐值一致：一步 0.25', () => {
    const el = mount({ src: 'data:image/png;base64,AAAA' })
    loadImage(el)
    stubStageRect(el)
    stage(el).dispatchEvent(wheelWithMode(240, 300, -100, 0))
    expect(el.zoom).toBe(1.25)
  })

  it('像素模式动量大批量被钳制：单事件最多 ±0.5（2 步进），不瞬跳', () => {
    const el = mount({ src: 'data:image/png;base64,AAAA' })
    loadImage(el)
    stubStageRect(el)
    stage(el).dispatchEvent(wheelWithMode(240, 300, -1000, 0))
    expect(el.zoom).toBe(1.5)
  })

  it('deltaMode=1（行，Firefox 经典滚轮）保留整步进', () => {
    const el = mount({ src: 'data:image/png;base64,AAAA' })
    loadImage(el)
    stubStageRect(el)
    stage(el).dispatchEvent(wheelWithMode(240, 300, -1, 1))
    expect(el.zoom).toBe(1.25)
    stage(el).dispatchEvent(wheelWithMode(240, 300, 1, 1))
    expect(el.zoom).toBe(1)
  })

  it('细粒度缩放照常派发 oas-change 并阻止页面滚动', () => {
    const el = mount({ src: 'data:image/png;base64,AAAA' })
    loadImage(el)
    stubStageRect(el)
    const details: number[] = []
    el.addEventListener('oas-change', (e) => details.push((e as CustomEvent<{ zoom: number }>).detail.zoom))
    const notPrevented = stage(el).dispatchEvent(wheelWithMode(240, 300, -40, 0))
    expect(notPrevented, '像素模式滚轮同样阻止页面滚动').toBe(false)
    expect(details).toEqual([1.1])
  })

  it('像素模式下 Ctrl/⌘+滚轮依旧不接管（浏览器页面缩放优先）', () => {
    const el = mount({ src: 'data:image/png;base64,AAAA' })
    loadImage(el)
    stubStageRect(el)
    const ctrlWheel = wheelWithMode(240, 300, -40, 0)
    Object.defineProperty(ctrlWheel, 'ctrlKey', { value: true, configurable: true })
    expect(stage(el).dispatchEvent(ctrlWheel)).toBe(true)
    expect(el.zoom).toBe(1)
  })
})
