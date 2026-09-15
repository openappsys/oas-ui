import { describe, it, expect } from 'vitest'
import { aliasSize } from './size.js'

describe('shared/size 词表别名互认（aliasSize）', () => {
  it('toFull=true：缩写 → 全称（全称系组件消费）', () => {
    expect(aliasSize('sm', true)).toBe('small')
    expect(aliasSize('md', true)).toBe('medium')
    expect(aliasSize('lg', true)).toBe('large')
  })

  it('toFull=false：全称 → 缩写（缩写系组件消费）', () => {
    expect(aliasSize('small', false)).toBe('sm')
    expect(aliasSize('medium', false)).toBe('md')
    expect(aliasSize('large', false)).toBe('lg')
  })

  it('xs/xl 无别名词（两词表同形），双向都返回 null 由组件词表直通', () => {
    expect(aliasSize('xs', true)).toBeNull()
    expect(aliasSize('xs', false)).toBeNull()
    expect(aliasSize('xl', true)).toBeNull()
    expect(aliasSize('xl', false)).toBeNull()
  })

  it('非法值返回 null（组件按既定逻辑回落默认并 dev warn）', () => {
    expect(aliasSize('huge', true)).toBeNull()
    expect(aliasSize('huge', false)).toBeNull()
    expect(aliasSize('', true)).toBeNull()
  })

  it('往返映射稳定：toFull 与 toShort 互为逆变换', () => {
    for (const [abbr, full] of [
      ['sm', 'small'],
      ['md', 'medium'],
      ['lg', 'large'],
    ] as const) {
      expect(aliasSize(aliasSize(abbr, true)!, false)).toBe(abbr)
      expect(aliasSize(aliasSize(full, false)!, true)).toBe(full)
    }
  })
})
