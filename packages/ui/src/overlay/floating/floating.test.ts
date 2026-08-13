import { describe, it, expect } from 'vitest'
import { computePosition } from './index.js'

const viewport = { width: 800, height: 600 }

function rect(x: number, y: number, w: number, h: number): DOMRect {
  return {
    x,
    y,
    width: w,
    height: h,
    top: y,
    left: x,
    right: x + w,
    bottom: y + h,
    toJSON: () => ({}),
  } as DOMRect
}

describe('computePosition 浮层定位', () => {
  it('top 定位在锚点上方居中', () => {
    const pos = computePosition(rect(100, 100, 200, 40), rect(0, 0, 100, 50), 'top', viewport)
    expect(pos.placement).toBe('top')
    expect(pos.left).toBe(150)
    expect(pos.top).toBe(42)
  })

  it('bottom 定位在锚点下方', () => {
    const pos = computePosition(rect(100, 100, 200, 40), rect(0, 0, 100, 50), 'bottom', viewport)
    expect(pos.placement).toBe('bottom')
    expect(pos.top).toBe(148)
  })

  it('空间不足时翻转 placement', () => {
    const pos = computePosition(rect(100, 550, 200, 40), rect(0, 0, 100, 50), 'bottom', viewport)
    expect(pos.placement).toBe('top')
  })

  it('右侧空间不足时水平翻转', () => {
    const pos = computePosition(rect(750, 100, 40, 40), rect(0, 0, 100, 50), 'right', viewport)
    expect(pos.placement).toBe('left')
  })

  it('超出视口时避让到边缘', () => {
    const pos = computePosition(rect(0, 100, 40, 40), rect(0, 0, 300, 50), 'bottom', viewport)
    expect(pos.left).toBeGreaterThanOrEqual(0)
    expect(pos.left + 300).toBeLessThanOrEqual(800)
  })

  describe('0 尺寸锚点（virtual 坐标点，图表/画布坐标提示）', () => {
    // popover/tooltip 的 virtual-x/virtual-y 模式锚点是 {left:x, top:y, width:0, height:0} 的点位，
    // 锚定语义 = 以该点为「锚点右侧/上方/下方/左侧」放置，垂直/水平居中。
    const point = rect(160, 90, 0, 0)
    const popup = rect(0, 0, 200, 60)

    it('placement=right：面板在点右侧，垂直居中于锚点', () => {
      const pos = computePosition(point, popup, 'right', viewport)
      expect(pos.placement).toBe('right')
      expect(pos.left).toBe(160 + 8)
      expect(pos.top).toBe(90 - 30)
    })

    it('placement=top：面板在点上方，水平居中于锚点', () => {
      const pos = computePosition(point, popup, 'top', viewport)
      expect(pos.placement).toBe('top')
      expect(pos.top).toBe(90 - 60 - 8)
      expect(pos.left).toBe(160 - 100)
    })

    it('placement=bottom：面板在点下方，水平居中于锚点', () => {
      const pos = computePosition(point, popup, 'bottom', viewport)
      expect(pos.placement).toBe('bottom')
      expect(pos.top).toBe(90 + 8)
      expect(pos.left).toBe(160 - 100)
    })

    it('placement=left 但左侧空间不足时翻转到 right（fits 判断不因 0 尺寸锚点失效）', () => {
      const pos = computePosition(point, popup, 'left', viewport)
      expect(pos.placement).toBe('right')
      expect(pos.left).toBe(160 + 8)
    })

    it('点位贴视口顶时 placement=top 自动翻转到 bottom', () => {
      const pos = computePosition(rect(300, 0, 0, 0), popup, 'top', viewport)
      expect(pos.placement).toBe('bottom')
      expect(pos.top).toBe(0 + 8)
    })

    it('点位贴视口右缘时 placement=right 自动翻转到 left 并避让', () => {
      const pos = computePosition(rect(760, 100, 0, 0), popup, 'right', viewport)
      expect(pos.placement).toBe('left')
      expect(pos.left + 200).toBeLessThanOrEqual(viewport.width)
      expect(pos.left).toBeGreaterThanOrEqual(0)
    })
  })

  describe('0 尺寸浮层（popup 尚未布局）', () => {
    // 面板 display:none 或尚未布局时 getBoundingClientRect 返回 0 尺寸；computePosition
    // 必须仍产出不越界的坐标（不得因 popup 尺寸为 0 而把 flip 判断全部判成「放得下」）。
    it('0 尺寸浮层 + placement=top：坐标仍落在视口内', () => {
      const pos = computePosition(rect(400, 300, 0, 0), rect(0, 0, 0, 0), 'top', viewport)
      expect(pos.top).toBeGreaterThanOrEqual(0)
      expect(pos.left).toBeGreaterThanOrEqual(0)
      expect(pos.top).toBeLessThanOrEqual(viewport.height)
      expect(pos.left).toBeLessThanOrEqual(viewport.width)
    })
  })

  describe('auto-adjust-overflow=false（关闭视口自动调整）', () => {
    // `autoAdjustOverflow: false`：flip 与视口避让都关闭，
    // 保持声明 placement（可能溢出视口）。
    it('空间不足不翻转：保持声明 placement', () => {
      const pos = computePosition(
        rect(100, 550, 200, 40),
        rect(0, 0, 100, 50),
        'bottom',
        viewport,
        8,
        false,
      )
      expect(pos.placement).toBe('bottom')
      expect(pos.top).toBe(598) // 550+40+8，无翻转
    })

    it('不避让视口边缘：left 可为负（溢出）', () => {
      const pos = computePosition(
        rect(0, 100, 40, 40),
        rect(0, 0, 300, 50),
        'bottom',
        viewport,
        8,
        false,
      )
      expect(pos.placement).toBe('bottom')
      expect(pos.left).toBe(-130) // 20 - 150，无 clamp
      expect(pos.top).toBe(148)
    })

    it('第 6 参缺省 = true：仍翻转与避让（向后兼容）', () => {
      const pos = computePosition(rect(100, 550, 200, 40), rect(0, 0, 100, 50), 'bottom', viewport)
      expect(pos.placement).toBe('top')
    })
  })
})
