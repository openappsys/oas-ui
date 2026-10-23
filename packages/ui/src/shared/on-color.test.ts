import { describe, it, expect } from 'vitest'
import { pickOnColor, resolveRgb } from './on-color.js'

/** sRGB 通道线性化（WCAG 2.x 相对亮度） */
function linear(v: number): number {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** 相对亮度（测试侧独立实现，不复用被测代码） */
function luminance(color: string): number {
  const rgb = resolveRgb(color)!
  return 0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b)
}

/** WCAG 对比度：(亮 + 0.05) / (暗 + 0.05) */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

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

  // ============ WCAG 对比度择色（中间色调不再被亮度阈值一刀切） ============

  const ON = { dark: '#18181b', light: '#ffffff', fallback: '' }
  /** 中间色调样本：旧实现（亮度 > 0.35 才取深字）在 #3b82f6 上误选白字，对比仅 3.68 */
  const SAMPLES = ['#767676', '#f59e0b', '#3b82f6', '#ffffff', '#000000'] as const

  it('pickOnColor：所选前景色对比度不低于另一选择（逐样本）', () => {
    for (const bg of SAMPLES) {
      const on = pickOnColor(bg, ON)
      const other = on === ON.dark ? ON.light : ON.dark
      expect(contrast(bg, on), `${bg} 应选对比度更高的一侧（选 ${on}）`).toBeGreaterThanOrEqual(contrast(bg, other))
    }
  })

  it('pickOnColor：可达标样本的所选前景色对比度 ≥ 4.5（WCAG AA）', () => {
    for (const bg of SAMPLES) {
      expect(contrast(bg, pickOnColor(bg, ON)), `${bg} 所选前景色对比度应 ≥ 4.5`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('pickOnColor：中蓝 #3b82f6 选深字（深 4.82 > 白 3.68，旧阈值误选白）', () => {
    expect(pickOnColor('#3b82f6', ON)).toBe('#18181b')
  })

  it('pickOnColor：中灰 #767676 选白字（白 4.54 > 深 3.90）', () => {
    expect(pickOnColor('#767676', ON)).toBe('#ffffff')
  })

  it('pickOnColor：暗底仍取浅字、亮底仍取深字（暗色底 #000000 不被带偏）', () => {
    expect(pickOnColor('#000000', ON)).toBe('#ffffff')
    expect(pickOnColor('#ffffff', ON)).toBe('#18181b')
    expect(pickOnColor('#f59e0b', ON)).toBe('#18181b')
  })

  it('pickOnColor：dark/light 为不可解析 token 时回落旧亮度启发式（不抛错）', () => {
    const tokenArgs = { dark: 'var(--d)', light: 'var(--l)', fallback: 'var(--f)' }
    expect(pickOnColor('#ffffff', tokenArgs)).toBe('var(--d)')
    expect(pickOnColor('#000000', tokenArgs)).toBe('var(--l)')
    expect(pickOnColor('#3b82f6', tokenArgs)).toBe('var(--l)') // 亮度 0.2355 < 0.35 的旧偏好
    expect(pickOnColor('var(--x)', tokenArgs)).toBe('var(--f)')
  })
})
