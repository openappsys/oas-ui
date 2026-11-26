import { describe, it, expect } from 'vitest'
import { shouldFlipUp } from './flip-up.js'

/** 构造锚元素矩形（只取判据用到的 top/bottom） */
function anchor(top: number, height = 32): { top: number; bottom: number } {
  return { top, bottom: top + height }
}

describe('shouldFlipUp 视口翻转谓词', () => {
  it('下方空间足够 → 不翻转', () => {
    // 视口 800，锚 top 100（bottom 132），下方 668 ≥ 面板 300
    expect(shouldFlipUp(anchor(100), 300, 800)).toBe(false)
  })

  it('下方放不下且上方更宽裕 → 翻转', () => {
    // 视口 800，锚 top 700（bottom 732），下方 68 < 面板 300，上方 700 > 68
    expect(shouldFlipUp(anchor(700), 300, 800)).toBe(true)
  })

  it('下方放不下但上方更窄 → 不翻转（翻上去同样被裁，保持向下）', () => {
    // 视口 800，锚 top 300（bottom 332），下方 468 < 面板 500，上方 300 < 468
    expect(shouldFlipUp(anchor(300), 500, 800)).toBe(false)
  })

  it('退化守卫：面板高度 0 / 非法、视口 0 / 非法、锚非法 → 保持向下', () => {
    expect(shouldFlipUp(anchor(700), 0, 800)).toBe(false)
    expect(shouldFlipUp(anchor(700), Number.NaN, 800)).toBe(false)
    expect(shouldFlipUp(anchor(700), 300, 0)).toBe(false)
    expect(shouldFlipUp(anchor(700), 300, Number.NaN)).toBe(false)
    expect(shouldFlipUp({ top: Number.NaN, bottom: 0 }, 300, 800)).toBe(false)
    expect(shouldFlipUp({ top: 0, bottom: Number.NaN }, 300, 800)).toBe(false)
  })

  it('边界：下方恰好等于面板高度 → 不翻（放得下）', () => {
    // 视口 600，锚 bottom 300 → 下方 300 = 面板 300
    expect(shouldFlipUp(anchor(268), 300, 600)).toBe(false)
  })

  it('上下等空间 → 不翻（要求上方严格更宽裕）', () => {
    // 零高锚 top=bottom=300：下方 300 = 上方 300，面板 400 放不下但上方不更宽裕
    expect(shouldFlipUp({ top: 300, bottom: 300 }, 400, 600)).toBe(false)
  })
})
