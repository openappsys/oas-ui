import { describe, it, expect } from 'vitest'
import { measureMaxTextWidth } from './measure-text.js'

describe('measureMaxTextWidth 文本量测（canvas → 离屏 span → 估算三级降级）', () => {
  it('空数组 / 全空白串返回 0', () => {
    expect(measureMaxTextWidth([])).toBe(0)
    expect(measureMaxTextWidth(['', '  ', ''])).toBe(0)
  })

  it('非空文本返回正数宽度', () => {
    expect(measureMaxTextWidth(['abc']), '估算层 3 × 9.6').toBeCloseTo(28.8, 5)
  })

  it('取最宽者：长文本 ≥ 短文本', () => {
    const narrow = measureMaxTextWidth(['ab'])
    const wide = measureMaxTextWidth(['ab', 'abcdef', 'ab'])
    expect(wide).toBeGreaterThanOrEqual(narrow)
  })

  it('CJK 宽字符宽度大于同字符数的 ASCII（同一降级层内可比较）', () => {
    const ascii = measureMaxTextWidth(['aaaaaaaa'])
    const cjk = measureMaxTextWidth(['哈哈哈哈哈哈'])
    expect(cjk, '估算层 CJK 1em × 8 字').toBe(96)
    expect(ascii, '估算层 ASCII 0.6em × 8 字').toBeCloseTo(76.8, 5)
    // 估算层：CJK 1em > ASCII 0.6em；canvas/span 层同样成立（等字符数下 CJK 更宽）
    expect(cjk).toBeGreaterThan(ascii)
  })
})
