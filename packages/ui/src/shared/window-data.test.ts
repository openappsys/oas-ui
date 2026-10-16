import { describe, it, expect } from 'vitest'
import {
  ROW_WINDOW_EVENT,
  RANGE_WINDOW_EVENT,
  WINDOW_MARGIN,
  loadedRange,
  expandWindow,
  windowCovered,
  sameWindow,
  readWindowedMode,
  rangeCovered,
  parseIsoDayMs,
} from './window-data.js'

describe('服务端行窗口协议（window-data）', () => {
  it('事件名与默认缓冲', () => {
    expect(ROW_WINDOW_EVENT).toBe('oas-window-request')
    expect(RANGE_WINDOW_EVENT).toBe('oas-range-request')
    expect(WINDOW_MARGIN).toBe(8)
  })

  it('rangeCovered / parseIsoDayMs', () => {
    expect(rangeCovered({ startMs: 10, endMs: 20 }, { startMs: 0, endMs: 30 })).toBe(true)
    expect(rangeCovered({ startMs: -1, endMs: 20 }, { startMs: 0, endMs: 30 })).toBe(false)
    expect(rangeCovered({ startMs: 10, endMs: 31 }, { startMs: 0, endMs: 30 })).toBe(false)
    expect(parseIsoDayMs('2026-03-01')).toBe(new Date(2026, 2, 1).getTime())
    expect(parseIsoDayMs('  2026-03-01 ')).toBe(new Date(2026, 2, 1).getTime())
    expect(parseIsoDayMs('2026-13-01')).toBeNull()
    // 日历不存在的日期（Date 会静默滚转，必须显式拒绝）
    expect(parseIsoDayMs('2026-02-30')).toBeNull()
    expect(parseIsoDayMs('2025-02-29')).toBeNull()
    expect(parseIsoDayMs('2026-04-31')).toBeNull()
    expect(parseIsoDayMs('2024-02-29')).toBe(new Date(2024, 1, 29).getTime()) // 闰年合法
    expect(parseIsoDayMs('bad')).toBeNull()
    expect(parseIsoDayMs('')).toBeNull()
  })

  it('loadedRange：window-start + 数据长度，负值/非法夹到 0', () => {
    expect(loadedRange(100, 30)).toEqual({ start: 100, end: 130 })
    expect(loadedRange(-5, 20)).toEqual({ start: 0, end: 20 })
    expect(loadedRange(10, -3)).toEqual({ start: 10, end: 10 })
    expect(loadedRange(Number.NaN, Number.NaN)).toEqual({ start: 0, end: 0 })
  })

  it('expandWindow：前后扩 margin 并夹到 [0,total)', () => {
    expect(expandWindow(20, 40, 1000)).toEqual({ start: 12, end: 48 })
    // 首尾边界夹取
    expect(expandWindow(0, 10, 1000)).toEqual({ start: 0, end: 18 })
    expect(expandWindow(990, 1000, 1000)).toEqual({ start: 982, end: 1000 })
    // end 小于 start 归一
    expect(expandWindow(30, 10, 100, 4)).toEqual({ start: 26, end: 34 })
    // margin 0 / 非法
    expect(expandWindow(5, 9, 100, 0)).toEqual({ start: 5, end: 9 })
    expect(expandWindow(5, 9, 100, Number.NaN)).toEqual({ start: 5, end: 9 })
  })

  it('windowCovered：期望区间 ⊄ 已装载则 false', () => {
    const loaded = { start: 100, end: 130 }
    expect(windowCovered({ start: 100, end: 130 }, loaded)).toBe(true)
    expect(windowCovered({ start: 105, end: 120 }, loaded)).toBe(true)
    expect(windowCovered({ start: 92, end: 120 }, loaded)).toBe(false)
    expect(windowCovered({ start: 105, end: 140 }, loaded)).toBe(false)
  })

  it('sameWindow：用于去重派发', () => {
    expect(sameWindow({ start: 1, end: 2 }, { start: 1, end: 2 })).toBe(true)
    expect(sameWindow({ start: 1, end: 2 }, { start: 1, end: 3 })).toBe(false)
    expect(sameWindow(null, null)).toBe(true)
    expect(sameWindow(null, { start: 0, end: 0 })).toBe(false)
  })

  it('readWindowedMode：仅 windowed 属性在场且 total>0 才生效', () => {
    expect(readWindowedMode(true, 5000, 1000, 50)).toMatchObject({
      windowed: true,
      total: 5000,
      windowStart: 1000,
      loaded: { start: 1000, end: 1050 },
    })
    expect(readWindowedMode(false, 5000, 1000, 50).windowed).toBe(false)
    expect(readWindowedMode(true, 0, 0, 10).windowed).toBe(false)
    expect(readWindowedMode(true, Number.NaN, -3, 10)).toMatchObject({
      windowed: false,
      total: 0,
      windowStart: 0,
      loaded: { start: 0, end: 10 },
    })
  })
})
