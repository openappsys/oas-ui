import { describe, it, expect } from 'vitest'
import { computePosition } from './index.js'

const viewport = { width: 800, height: 600 }

function rect(x: number, y: number, w: number, h: number): DOMRect {
  return { x, y, width: w, height: h, top: y, left: x, right: x + w, bottom: y + h, toJSON: () => ({}) } as DOMRect
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
})
