import { describe, expect, it } from 'vitest'
import { inferFillValue } from './fill-series.js'

describe('table/range fill-series（填充序列推导纯函数）', () => {
  it('源区单值 → 复制（数值/字符串/布尔/日期一致）', () => {
    expect(inferFillValue([7], 1, 'down')).toBe(7)
    expect(inferFillValue([7], 3, 'down')).toBe(7)
    expect(inferFillValue(['A'], 2, 'right')).toBe('A')
    expect(inferFillValue([true], 1, 'up')).toBe(true)
    const date = new Date('2026-01-31T00:00:00Z')
    expect(inferFillValue([date], 1, 'down')).toBe(date)
  })

  it('空源区 → undefined（调用方跳过不写空串）', () => {
    expect(inferFillValue([], 1, 'down')).toBeUndefined()
  })

  it('数值列 down：按首差递增序列', () => {
    expect(inferFillValue([1, 5], 1, 'down')).toBe(9)
    expect(inferFillValue([1, 5], 2, 'down')).toBe(13)
    expect(inferFillValue([10, 8], 1, 'down')).toBe(6)
  })

  it('数值列 up/left：逆向续写（边缘 = 首位）', () => {
    expect(inferFillValue([1, 5], 1, 'up')).toBe(-3)
    expect(inferFillValue([1, 5], 2, 'up')).toBe(-7)
    expect(inferFillValue([1, 5], 1, 'left')).toBe(-3)
  })

  it('多格数值列按首差外推（非等差列取首差）', () => {
    expect(inferFillValue([1, 3, 7], 1, 'down')).toBe(9)
    expect(inferFillValue([1, 3, 7], 2, 'down')).toBe(11)
    expect(inferFillValue([2, 4, 8], 1, 'up')).toBe(0)
  })

  it('数值字符串列保持字符串类型', () => {
    expect(inferFillValue(['1', '9'], 1, 'down')).toBe('17')
    expect(inferFillValue(['1', '9'], 1, 'up')).toBe('-7')
  })

  it('数值与文本混列 → 循环复制（不视为数值列）', () => {
    expect(inferFillValue([1, 'A', 1, 'A'], 1, 'down')).toBe(1)
    expect(inferFillValue([1, 'A'], 1, 'down')).toBe(1)
  })

  it('ISO 日期字符串 down：按日步进并回格式化', () => {
    expect(inferFillValue(['2026-01-01', '2026-01-04'], 1, 'down')).toBe('2026-01-07')
    expect(inferFillValue(['2026-01-01', '2026-01-04'], 2, 'down')).toBe('2026-01-10')
    // 跨月/闰年边界
    expect(inferFillValue(['2024-02-28', '2024-02-29'], 1, 'down')).toBe('2024-03-01')
  })

  it('ISO 日期字符串 up：逆向日步进', () => {
    expect(inferFillValue(['2026-01-10', '2026-01-14'], 1, 'up')).toBe('2026-01-06')
    expect(inferFillValue(['2026-01-10', '2026-01-14'], 2, 'up')).toBe('2026-01-02')
  })

  it('Date 实例日期步进保持 Date 类型（同口径按首差）', () => {
    const a = new Date('2026-01-01T00:00:00Z')
    const b = new Date('2026-01-05T00:00:00Z')
    const next = inferFillValue([a, b], 1, 'down')
    expect(next).toBeInstanceOf(Date)
    expect((next as Date).toISOString()).toBe('2026-01-09T00:00:00.000Z')
  })

  it('带时刻的 Date（非整日差）→ 回退循环复制', () => {
    const a = new Date('2026-01-01T08:00:00Z')
    const b = new Date('2026-01-02T09:30:00Z')
    expect(inferFillValue([a, b], 1, 'down')).toBe(a)
    expect(inferFillValue([a, b], 2, 'down')).toBe(b)
  })

  it('带时刻的 Date（整日差）→ 保留时刻按整日步进（对齐实现，非回退）', () => {
    const a = new Date('2026-01-01T08:00:00Z')
    const b = new Date('2026-01-02T08:00:00Z')
    expect((inferFillValue([a, b], 1, 'down') as Date).toISOString()).toBe('2026-01-03T08:00:00.000Z')
    expect((inferFillValue([a, b], 1, 'up') as Date).toISOString()).toBe('2025-12-31T08:00:00.000Z')
  })

  it('日期与文本混列 → 循环复制', () => {
    expect(inferFillValue(['2026-01-01', '待定'], 1, 'down')).toBe('2026-01-01')
  })

  it('文本多格源区 down/right：正向循环平铺（周期对齐）', () => {
    expect(inferFillValue(['A', 'B', 'C'], 1, 'down')).toBe('A')
    expect(inferFillValue(['A', 'B', 'C'], 2, 'down')).toBe('B')
    expect(inferFillValue(['A', 'B', 'C'], 3, 'down')).toBe('C')
    expect(inferFillValue(['A', 'B', 'C'], 4, 'down')).toBe('A')
    expect(inferFillValue(['A', 'B', 'C'], 1, 'right')).toBe('A')
  })

  it('文本多格源区 up/left：逆向循环平铺（无限周期对齐：d=1 取周期前一项）', () => {
    expect(inferFillValue(['A', 'B', 'C'], 1, 'up')).toBe('C')
    expect(inferFillValue(['A', 'B', 'C'], 2, 'up')).toBe('B')
    expect(inferFillValue(['A', 'B', 'C'], 3, 'up')).toBe('A')
    expect(inferFillValue(['A', 'B', 'C'], 4, 'up')).toBe('C')
    expect(inferFillValue(['A', 'B', 'C'], 1, 'left')).toBe('C')
  })

  it('NaN 数值列 → 循环复制（不外推非有限数）', () => {
    expect(inferFillValue([Number.NaN, Number.NaN], 1, 'down')).toBe(Number.NaN)
    expect(inferFillValue([1, Number.NaN], 1, 'down')).toBe(1)
  })
})
