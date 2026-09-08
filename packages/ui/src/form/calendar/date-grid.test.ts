import { describe, it, expect } from 'vitest'
import {
  toISODate,
  parseISODate,
  isSameDay,
  isSameMonth,
  addMonths,
  addMonthsClamped,
  addYearsClamped,
  buildMonthCells,
  isoWeek,
  weekdayLabels,
  formatToken,
  formatLongDate,
  formatYearMonth,
  moveGridDate,
  clampDate,
  getWeekStart,
  normalizeWeekStart,
} from './date-grid.js'

describe('date-grid 共享模块（纯函数）', () => {
  it('toISODate 输出本地时区 yyyy-MM-dd（非 UTC 偏移）', () => {
    // 本地 8 月 9 日 00:30，UTC 可能是 8 月 8 日；必须输出本地日期
    const d = new Date(2026, 7, 9, 0, 30)
    expect(toISODate(d)).toBe('2026-08-09')
  })

  it('parseISODate 往返一致，支持日期与日期时间', () => {
    expect(toISODate(parseISODate('2026-08-09')!)).toBe('2026-08-09')
    const dt = parseISODate('2026-08-09T23:05:09')!
    expect(dt.getFullYear()).toBe(2026)
    expect(dt.getMonth()).toBe(7)
    expect(dt.getDate()).toBe(9)
    expect(dt.getHours()).toBe(23)
    expect(dt.getMinutes()).toBe(5)
    expect(dt.getSeconds()).toBe(9)
  })

  it('parseISODate 支持 yyyy-MM（月选择器 value）', () => {
    const m = parseISODate('2026-08')!
    expect(m.getFullYear()).toBe(2026)
    expect(m.getMonth()).toBe(7)
    expect(m.getDate()).toBe(1)
  })

  it('parseISODate 非法输入返回 null', () => {
    expect(parseISODate('')).toBeNull()
    expect(parseISODate('abc')).toBeNull()
    expect(parseISODate('2026-13-40')).toBeNull()
  })

  it('buildMonthCells：2026-08 中文周一起始，首格 07-27，含 42 格且仅本月格 inMonth', () => {
    const cells = buildMonthCells(new Date(2026, 7, 1), 'zh-CN')
    expect(getWeekStart('zh-CN')).toBe(1)
    expect(getWeekStart('en')).toBe(0)
    expect(toISODate(cells[0]!.date)).toBe('2026-07-27')
    expect(cells.length).toBe(42)
    const inMonth = cells.filter((c) => c.inMonth)
    expect(inMonth.length).toBe(31)
    expect(toISODate(inMonth[0]!.date)).toBe('2026-08-01')
    expect(toISODate(inMonth[inMonth.length - 1]!.date)).toBe('2026-08-31')
  })

  it('isoWeek 输出 ISO 8601 周号', () => {
    expect(isoWeek(new Date(2026, 7, 9))).toBe(32)
    expect(isoWeek(new Date(2026, 6, 27))).toBe(31)
    expect(isoWeek(new Date(2026, 7, 3))).toBe(32)
  })

  it('weekdayLabels：中文周一起始「一…日」，英文周日起始', () => {
    const zh = weekdayLabels('zh-CN', 1)
    expect(zh).toEqual(['一', '二', '三', '四', '五', '六', '日'])
    const en = weekdayLabels('en', 0)
    expect(en).toHaveLength(7)
    expect(en[0]).toBe('S')
  })

  it('formatToken：yyyy-MM-dd / HH:mm:ss 由 Intl 拼装，locale 感知', () => {
    const d = new Date(2026, 7, 9, 23, 5, 9)
    expect(formatToken(d, 'yyyy-MM-dd', 'zh-CN')).toBe('2026-08-09')
    expect(formatToken(d, 'HH:mm:ss', 'zh-CN')).toBe('23:05:09')
    expect(formatToken(d, 'yyyy/MM/dd HH:mm', 'en')).toBe('2026/08/09 23:05')
  })

  it('formatToken：午夜小时为 00（h23），不为 24', () => {
    const d = new Date(2026, 7, 9, 0, 0, 0)
    expect(formatToken(d, 'HH:mm:ss', 'zh-CN')).toBe('00:00:00')
  })

  it('formatLongDate / formatYearMonth：完整日期描述与年月标题', () => {
    const d = new Date(2026, 7, 9)
    expect(formatLongDate(d, 'zh-CN')).toBe('2026年8月9日')
    expect(formatLongDate(d, 'en')).toBe('August 9, 2026')
    expect(formatYearMonth(d, 'zh-CN')).toBe('2026年8月')
  })

  it('moveGridDate：方向键按日/周移动，非法键返回 null', () => {
    const d = new Date(2026, 7, 9)
    expect(toISODate(moveGridDate(d, 'ArrowLeft')!)).toBe('2026-08-08')
    expect(toISODate(moveGridDate(d, 'ArrowRight')!)).toBe('2026-08-10')
    expect(toISODate(moveGridDate(d, 'ArrowUp')!)).toBe('2026-08-02')
    expect(toISODate(moveGridDate(d, 'ArrowDown')!)).toBe('2026-08-16')
    expect(moveGridDate(d, 'Enter')).toBeNull()
  })

  it('moveGridDate 扩展：Home/End 按生效周起始跳周首尾', () => {
    // 2026-08-11 为周二
    const d = new Date(2026, 7, 11)
    expect(moveGridDate(d, 'Home', 1)!.getDay()).toBe(1) // 周一起始 → 周一
    expect(toISODate(moveGridDate(d, 'Home', 1)!)).toBe('2026-08-10')
    expect(toISODate(moveGridDate(d, 'End', 1)!)).toBe('2026-08-16')
    // 周日起始（first-day-of-week=0）
    expect(toISODate(moveGridDate(d, 'Home', 0)!)).toBe('2026-08-09')
    expect(toISODate(moveGridDate(d, 'End', 0)!)).toBe('2026-08-15')
    // 周三起始（first-day-of-week=3）：含 08-11 的周为 08-05（周三）～ 08-11（周二）
    expect(toISODate(moveGridDate(d, 'Home', 3)!)).toBe('2026-08-05')
    expect(toISODate(moveGridDate(d, 'End', 3)!)).toBe('2026-08-11')
  })

  it('moveGridDate 扩展：PageUp/PageDown 换月，Shift 换年（月末日期钳制）', () => {
    const d = new Date(2026, 7, 9)
    expect(toISODate(moveGridDate(d, 'PageUp')!)).toBe('2026-07-09')
    expect(toISODate(moveGridDate(d, 'PageDown')!)).toBe('2026-09-09')
    expect(toISODate(moveGridDate(d, 'PageUp', 0, true)!)).toBe('2025-08-09')
    expect(toISODate(moveGridDate(d, 'PageDown', 0, true)!)).toBe('2027-08-09')
    // 3-31 跨月钳制到 2-28；2024-02-29 跨年钳制到 2025-02-28
    expect(toISODate(moveGridDate(new Date(2026, 2, 31), 'PageUp')!)).toBe('2026-02-28')
    expect(toISODate(moveGridDate(new Date(2024, 1, 29), 'PageDown', 0, true)!)).toBe('2025-02-28')
  })

  it('addMonthsClamped / addYearsClamped：保留日序、月末溢出钳制', () => {
    expect(toISODate(addMonthsClamped(new Date(2026, 7, 31), 1))).toBe('2026-09-30')
    expect(toISODate(addMonthsClamped(new Date(2026, 0, 31), 1))).toBe('2026-02-28')
    expect(toISODate(addYearsClamped(new Date(2024, 1, 29), 1))).toBe('2025-02-28')
  })

  it('normalizeWeekStart：任意 0-6 数字归一化，非法回退 0', () => {
    expect(normalizeWeekStart(0)).toBe(0)
    expect(normalizeWeekStart(3)).toBe(3)
    expect(normalizeWeekStart(6)).toBe(6)
    expect(normalizeWeekStart(-1)).toBe(6)
    expect(normalizeWeekStart(7)).toBe(0)
    expect(normalizeWeekStart(Number.NaN)).toBe(0)
  })

  it('buildMonthCells 支持任意周起始覆写：2026-08 周日起始首格 07-26', () => {
    const cells = buildMonthCells(new Date(2026, 7, 1), 'zh-CN', 0)
    expect(toISODate(cells[0]!.date)).toBe('2026-07-26')
    expect(cells.length).toBe(42)
    const zh3 = buildMonthCells(new Date(2026, 7, 1), 'zh-CN', 3)
    // 8-1 周六，周三起始 offset=(6+7-3)%7=3 → 首格 07-29
    expect(toISODate(zh3[0]!.date)).toBe('2026-07-29')
  })

  it('weekdayLabels 支持任意周起始：中文 ws=3 周三起始', () => {
    expect(weekdayLabels('zh-CN', 3)).toEqual(['三', '四', '五', '六', '日', '一', '二'])
    expect(weekdayLabels('zh-CN', 0)).toEqual(['日', '一', '二', '三', '四', '五', '六'])
  })

  it('clampDate：钳制到 [min, max]', () => {
    const min = parseISODate('2026-08-01')
    const max = parseISODate('2026-08-31')
    expect(toISODate(clampDate(new Date(2026, 6, 1), min, max))).toBe('2026-08-01')
    expect(toISODate(clampDate(new Date(2026, 7, 15), min, max))).toBe('2026-08-15')
    expect(toISODate(clampDate(new Date(2026, 8, 1), min, max))).toBe('2026-08-31')
  })

  it('addMonths 跨年/跨月安全', () => {
    expect(toISODate(addMonths(new Date(2026, 11, 31), 1))).toBe('2027-01-01')
    expect(toISODate(addMonths(new Date(2026, 7, 31), -1))).toBe('2026-07-01')
  })
})
