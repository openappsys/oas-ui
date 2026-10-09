import { describe, it, expect } from 'vitest'
import { pickOnColor, resolveRgb } from './on-color.js'

describe('shared/on-color', () => {
  it('resolveRgb：#rgb/#rrggbb/rgb(a) 快路径', () => {
    expect(resolveRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 })
    expect(resolveRgb('#000')).toEqual({ r: 0, g: 0, b: 0 })
    expect(resolveRgb('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30 })
    expect(resolveRgb('rgba(10, 20, 30, 0.5)')).toEqual({ r: 10, g: 20, b: 30 })
  })

  it('resolveRgb：var()/空/非法 → null（不回落继承色）', () => {
    expect(resolveRgb('var(--x)')).toBeNull()
    expect(resolveRgb('')).toBeNull()
    expect(resolveRgb('not-a-color')).toBeNull()
  })

  it('pickOnColor：亮底取 dark、暗底取 light、不可解析取 fallback', () => {
    const args = { dark: 'D', light: 'L', fallback: 'F' }
    expect(pickOnColor('#ffffff', args)).toBe('D')
    expect(pickOnColor('#000000', args)).toBe('L')
    expect(pickOnColor('var(--x)', args)).toBe('F')
  })
})
