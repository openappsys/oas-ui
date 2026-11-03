import { describe, it, expect } from 'vitest'
import { normalizeChoice } from './choice.js'

describe('shared normalizeChoice（表单枚举清洗共用实现）', () => {
  it('空串回落 fallback', () => {
    expect(normalizeChoice('', 'medium', ['small', 'medium'])).toBe('medium')
  })
  it('命中合法集原样返回', () => {
    expect(normalizeChoice('small', 'medium', ['small', 'medium'])).toBe('small')
  })
  it('非法值回落 fallback（与私有拷贝逐字等价：不告警，告警归调用方）', () => {
    expect(normalizeChoice('huge', 'medium', ['small', 'medium'])).toBe('medium')
  })
  it('合法集为 readonly 数组（元组 as const 直传，无需类型断言）', () => {
    const valid = ['a', 'b'] as const
    expect(normalizeChoice('b', 'a', valid)).toBe('b')
    expect(normalizeChoice('x', 'a', valid)).toBe('a')
  })
})
