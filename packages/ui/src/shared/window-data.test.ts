import { describe, it, expect } from 'vitest'
import {
  ROW_WINDOW_EVENT,
  RANGE_WINDOW_EVENT,
  WINDOW_MARGIN,
  loadedRange,
  expandWindow,
  windowCovered,
  sameWindow,
  mapVisualWindowToData,
  mapVisualWindowToDataDynamic,
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

  it('sameWindow：同时比较视觉字段——数据 need 相同但视觉字段变化不算同窗口', () => {
    expect(
      sameWindow(
        { start: 1, end: 2, visualStart: 5, visualEnd: 9 },
        { start: 1, end: 2, visualStart: 5, visualEnd: 9 },
      ),
    ).toBe(true)
    expect(
      sameWindow(
        { start: 1, end: 2, visualStart: 5, visualEnd: 9 },
        { start: 1, end: 2, visualStart: 6, visualEnd: 9 },
      ),
    ).toBe(false)
    expect(
      sameWindow(
        { start: 1, end: 2, visualStart: 5, visualEnd: 9 },
        { start: 1, end: 2, visualStart: 5, visualEnd: 10 },
      ),
    ).toBe(false)
    // 旧路径（无视觉字段）互相比较退化为纯数据比较；与带视觉字段的窗口比较必不相等
    expect(sameWindow({ start: 1, end: 2 }, { start: 1, end: 2 })).toBe(true)
    expect(sameWindow({ start: 1, end: 2 }, { start: 1, end: 2, visualStart: 0, visualEnd: 0 })).toBe(false)
  })

  it('mapVisualWindowToData：相交条目按属主数据行投影（data=自身 / expand=回连属主）', () => {
    const ih = 40
    // 可视窗口 [107,120) → flow [4280,4800)；条目与 table 记账同形（expand 条目的 abs = 下一数据行）
    const items = [
      { kind: 'data', abs: 103, flowY: 4240 },
      { kind: 'expand', abs: 104, flowY: 4280 },
      { kind: 'data', abs: 104, flowY: 4320 },
      { kind: 'data', abs: 109, flowY: 4720 },
      { kind: 'expand', abs: 110, flowY: 4760 },
      { kind: 'data', abs: 110, flowY: 4800 }, // 恰在窗口下缘（flowY >= winBottom）不纳入
    ]
    // min start=103（exp103 回连属主）/ max end=110 → ±8 → [95,118)
    expect(mapVisualWindowToData({ start: 107, end: 120 }, items, ih, 1000)).toEqual({ start: 95, end: 118 })
  })

  it('mapVisualWindowToData：夹取到 [0,total) 与无相交回退可视窗口投影', () => {
    const ih = 40
    // 末尾 clamp：hi+margin 超出 total（lo=99 / hi=100 → [91,100)）
    expect(mapVisualWindowToData({ start: 98, end: 100 }, [{ kind: 'data', abs: 99, flowY: 3960 }], ih, 100)).toEqual({
      start: 91,
      end: 100,
    })
    // 无相交条目 → 回退 expandWindow(vis.start, vis.end, total, margin)
    expect(mapVisualWindowToData({ start: 50, end: 60 }, [{ kind: 'data', abs: 0, flowY: 0 }], ih, 100)).toEqual({
      start: 42,
      end: 68,
    })
    // 空条目同样回退
    expect(mapVisualWindowToData({ start: 0, end: 9 }, [], ih, 1000)).toEqual({ start: 0, end: 17 })
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

describe('mapVisualWindowToDataDynamic（row-auto-height 像素相交投影）', () => {
  const items = [
    { kind: 'data', abs: 10, flowY: 0, v: 10 },
    { kind: 'data', abs: 11, flowY: 100, v: 11 },
    { kind: 'expand', abs: 12, flowY: 200, v: 12 },
    { kind: 'data', abs: 12, flowY: 240, v: 13 },
  ]
  // 行高：行 10=100、行 11=100、expand=40、行 12=40（变高拼接）
  const heightOf = (it: { kind: string; abs: number }) => (it.kind === 'expand' ? 40 : it.abs === 12 ? 40 : 100)

  it('定高等价：heightOf 恒 40 + 像素边界=行号×40 时与 mapVisualWindowToData 逐值一致', () => {
    const uniform = items.map((it) => ({ ...it }))
    const fixed = (it: { kind: string }) => (it.kind === 'expand' ? 40 : 40)
    const vis = { start: 1, end: 3 }
    const a = mapVisualWindowToData(vis, uniform, 40, 1000, 8)
    const b = mapVisualWindowToDataDynamic(vis, vis.start * 40, vis.end * 40, uniform, fixed, 1000, 8)
    expect(b).toEqual(a)
  })

  it('变高相交：窗口按像素落在长行中部时投影到该数据行（含 expand 属主回连）', () => {
    // 窗口像素 [150, 260)：命中行 11（100-200）与 expand（200-240）→ 数据区间 [11, 13)
    const need = mapVisualWindowToDataDynamic({ start: 0, end: 0 }, 150, 260, items, heightOf, 1000, 0)
    expect(need).toEqual({ start: 11, end: 13 })
  })

  it('长行使可视行数变少：同像素窗口只覆盖一个数据行时投影收窄（非定高的等比外推）', () => {
    // 窗口像素 [0, 100) 只命中行 10 → expandWindow(10, 11, margin 0)
    const need = mapVisualWindowToDataDynamic({ start: 0, end: 0 }, 0, 100, items, heightOf, 1000, 0)
    expect(need).toEqual({ start: 10, end: 11 })
  })

  it('无相交条目：按行号窗口整体外推（与定高路径回退同语义）', () => {
    const need = mapVisualWindowToDataDynamic({ start: 50, end: 60 }, 5000, 5100, items, heightOf, 1000, 8)
    expect(need).toEqual(expandWindow(50, 60, 1000, 8))
  })
})
