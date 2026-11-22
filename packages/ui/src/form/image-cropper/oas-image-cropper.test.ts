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
})
