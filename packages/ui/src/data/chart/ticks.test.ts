import { describe, it, expect } from 'vitest'
import { formatTick, niceStep, niceTicks, tickFractionDigits } from './ticks.js'

describe('niceStep', () => {
  it('只使用 1 / 2 / 2.5 / 5 / 10 × 10^n 序列，阈值处向上切换', () => {
    expect(niceStep(1)).toBe(1)
    expect(niceStep(1.0001)).toBe(2)
    expect(niceStep(2)).toBe(2)
    expect(niceStep(2.0001)).toBe(2.5)
    expect(niceStep(2.5)).toBe(2.5)
    expect(niceStep(2.5001)).toBe(5)
    expect(niceStep(5)).toBe(5)
    expect(niceStep(5.0001)).toBe(10)
    expect(niceStep(10)).toBe(10)
    expect(niceStep(10.0001)).toBe(20)
  })

  it('跨数量级保持序列（小数与小数步长）', () => {
    expect(niceStep(0.0025)).toBe(0.0025)
    expect(niceStep(0.0026)).toBe(0.005)
    expect(niceStep(0.05)).toBe(0.05)
    expect(niceStep(250)).toBe(250)
    expect(niceStep(2.5e8)).toBe(2.5e8)
  })

  it('除法产生的浮点噪声不改变档位（0.2 / 4 = 0.05 仍落在 5 档）', () => {
    expect(niceStep(0.2 / 4)).toBe(0.05)
    expect(niceStep(0.3 / 4)).toBe(0.1)
    expect(niceStep(90 / 4)).toBe(25)
  })

  it('零 / 负数 / 非有限值返回 0', () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(niceStep(bad), String(bad)).toBe(0)
    }
  })
})

describe('niceTicks', () => {
  it('0.01：步长 0.0025、顶格 0.01（小数量程不再退化为整步）', () => {
    expect(niceTicks(0.01)).toEqual({
      max: 0.01,
      step: 0.0025,
      values: [0, 0.0025, 0.005, 0.0075, 0.01],
    })
  })

  it('0.2：步长 0.05、顶格 0.2', () => {
    expect(niceTicks(0.2)).toEqual({
      max: 0.2,
      step: 0.05,
      values: [0, 0.05, 0.1, 0.15, 0.2],
    })
  })

  it('90：顶格 100（契约明确接受 90 → 100）', () => {
    expect(niceTicks(90)).toEqual({
      max: 100,
      step: 25,
      values: [0, 25, 50, 75, 100],
    })
  })

  it('10：顶格 10（双轴右轴 10 → 10，不再被抬到 12）', () => {
    expect(niceTicks(10)).toEqual({
      max: 10,
      step: 2.5,
      values: [0, 2.5, 5, 7.5, 10],
    })
  })

  it('浮点噪声：0.3 → 步长 0.1 / 顶格 0.4，values 无 0.30000000000000004', () => {
    const ticks = niceTicks(0.3)
    expect(ticks).toEqual({
      max: 0.4,
      step: 0.1,
      values: [0, 0.1, 0.2, 0.3, 0.4],
    })
    expect(ticks.values.map(String)).toEqual(['0', '0.1', '0.2', '0.3', '0.4'])
  })

  it('大数量程：1e9 → 步长 2.5e8 / 顶格 1e9', () => {
    expect(niceTicks(1e9)).toEqual({
      max: 1e9,
      step: 2.5e8,
      values: [0, 2.5e8, 5e8, 7.5e8, 1e9],
    })
  })

  it('段数可调（双轴以主轴档数为锚共用同一序列）', () => {
    const ticks = niceTicks(10, 5)
    expect(ticks.step).toBe(2)
    expect(ticks.max).toBe(10)
    expect(ticks.values).toHaveLength(6)
  })

  it('零 / 非法 / 负数：0 步长与全零刻度（保持档数，避免除零）', () => {
    for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(niceTicks(bad), String(bad)).toEqual({ max: 0, step: 0, values: [0, 0, 0, 0, 0] })
    }
  })
})

describe('tickFractionDigits', () => {
  it('按步长求得最少小数位（整数步长 0 位）', () => {
    expect(tickFractionDigits(25)).toBe(0)
    expect(tickFractionDigits(250000)).toBe(0)
    expect(tickFractionDigits(2.5)).toBe(1)
    expect(tickFractionDigits(0.05)).toBe(2)
    expect(tickFractionDigits(0.0025)).toBe(4)
    expect(tickFractionDigits(0)).toBe(0)
  })
})

describe('formatTick', () => {
  it('动态精度：整数步长不带小数、小数步长按步长补足', () => {
    expect(formatTick(25, 25, 'zh-CN')).toBe('25')
    expect(formatTick(2.5, 2.5, 'zh-CN')).toBe('2.5')
    expect(formatTick(0.05, 0.05, 'zh-CN')).toBe('0.05')
    expect(formatTick(0.0025, 0.0025, 'zh-CN')).toBe('0.0025')
  })

  it('浮点噪声在标签层被精度收口（不再依赖 Math.round）', () => {
    expect(formatTick(0.30000000000000004, 0.1, 'zh-CN')).toBe('0.3')
    expect(formatTick(0.30000000000000004, 0.05, 'zh-CN')).toBe('0.3')
  })

  it('locale 感知小数分隔符（de-DE 用逗号）', () => {
    expect(formatTick(0.05, 0.05, 'de-DE')).toBe('0,05')
  })

  it('科学计数：大步长（≥1e6）与极小小步长（<1e-4）走紧凑表示', () => {
    expect(formatTick(2.5e8, 2.5e8, 'zh-CN')).toBe('2.5E8')
    expect(formatTick(5e8, 2.5e8, 'zh-CN')).toBe('5E8')
    expect(formatTick(2.5e-5, 2.5e-5, 'zh-CN')).toBe('2.5E-5')
    // 0 不写成 0E0
    expect(formatTick(0, 2.5e-5, 'zh-CN')).toBe('0')
  })

  it('科学计数阈值两侧：step=1e6 / 1e-4 仍用常规小数，1e6 以上/1e-4 以下才切换', () => {
    expect(formatTick(1000000, 1000000, 'zh-CN')).toBe('1E6')
    expect(formatTick(250000, 250000, 'zh-CN')).toBe('250000')
    expect(formatTick(0.0001, 0.0001, 'zh-CN')).toBe('0.0001')
  })
})
