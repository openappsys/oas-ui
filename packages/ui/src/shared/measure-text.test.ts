import { describe, it, expect } from 'vitest'
import { measureMaxTextWidth } from './measure-text.js'

describe('measureMaxTextWidth 文本量测（canvas → 离屏 span → 估算三级降级）', () => {
  it('空数组 / 全空白串返回 0', () => {
    expect(measureMaxTextWidth([])).toBe(0)
    expect(measureMaxTextWidth(['', '  ', ''])).toBe(0)
  })

  it('非空文本返回正数宽度', () => {
    expect(measureMaxTextWidth(['abc'])).toBeGreaterThan(0)
  })

  it('取最宽者：长文本 ≥ 短文本', () => {
    const narrow = measureMaxTextWidth(['ab'])
    const wide = measureMaxTextWidth(['ab', 'abcdef', 'ab'])
    expect(wide).toBeGreaterThanOrEqual(narrow)
  })

  it('CJK 宽字符宽度大于同字符数的 ASCII（同一降级层内可比较）', () => {
    const ascii = measureMaxTextWidth(['aaaaaaaa'])
    const cjk = measureMaxTextWidth(['哈哈哈哈哈哈'])
    expect(cjk).toBeGreaterThan(0)
    expect(ascii).toBeGreaterThan(0)
    // 估算层：CJK 1em > ASCII 0.6em；canvas/span 层同样成立（等字符数下 CJK 更宽）
    expect(cjk).toBeGreaterThan(ascii)
  })
})
