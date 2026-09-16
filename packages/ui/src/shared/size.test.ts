import { describe, it, expect } from 'vitest'
import { normalizeSize, normalizeSizeStrict, ALL_SIZES, THREE_SIZES, type OasSize } from './size.js'

describe('shared/size normalizeSize：别名映射 + 档位校验 + 非法回落', () => {
  it('别名 sm/md/lg 自动映射全称，不告警语义（isValid=true）', () => {
    expect(normalizeSize('sm', ALL_SIZES, 'medium')).toBe('small')
    expect(normalizeSize('md', ALL_SIZES, 'medium')).toBe('medium')
    expect(normalizeSize('lg', ALL_SIZES, 'medium')).toBe('large')
    expect(normalizeSizeStrict('sm', THREE_SIZES, 'medium').isValid).toBe(true)
  })

  it('全称直通；输出恒为全称', () => {
    expect(normalizeSize('xs', ALL_SIZES, 'medium')).toBe('xs')
    expect(normalizeSize('small', ALL_SIZES, 'medium')).toBe('small')
    expect(normalizeSize('medium', ALL_SIZES, 'medium')).toBe('medium')
    expect(normalizeSize('large', ALL_SIZES, 'medium')).toBe('large')
    expect(normalizeSize('xl', ALL_SIZES, 'medium')).toBe('xl')
  })

  it('档位子集校验：allowed 之外的合法全称也回落', () => {
    // 三档组件不接受 xs/xl
    expect(normalizeSize('xs', THREE_SIZES, 'medium')).toBe('medium')
    expect(normalizeSize('xl', THREE_SIZES, 'medium')).toBe('medium')
    expect(normalizeSizeStrict('xs', THREE_SIZES, 'medium')).toEqual({ value: 'medium', isValid: false })
  })

  it('真非法值回落 fallback 且 isValid=false', () => {
    expect(normalizeSize('huge', ALL_SIZES, 'medium')).toBe('medium')
    expect(normalizeSize('', ALL_SIZES, 'medium')).toBe('medium')
    expect(normalizeSizeStrict('huge', ALL_SIZES, 'medium')).toEqual({ value: 'medium', isValid: false })
  })

  it('fallback 本身是合法输入（isValid=true，不告警）', () => {
    expect(normalizeSizeStrict('medium', THREE_SIZES, 'medium')).toEqual({ value: 'medium', isValid: true })
  })

  it('返回值恒为 allowed 子集成员（类型层面 T 保持收窄）', () => {
    const sizes: readonly OasSize[] = THREE_SIZES
    for (const s of sizes) {
      const v = normalizeSize(s, THREE_SIZES, 'medium')
      expect(THREE_SIZES).toContain(v)
    }
  })
})
