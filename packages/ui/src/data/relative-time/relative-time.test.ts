// @vitest-environment node
/**
 * 纯格式化层（relative-time.ts）单测：零 DOM 依赖。
 *
 * 本文件刻意跑 Node 环境（无 happy-dom）——SSR 路径只允许使用 `Intl` / `Date` 纯计算，
 * 一旦实现里引用 document/window，这里会直接暴露。
 */
import { describe, it, expect } from 'vitest'
import {
  formatRelativeTime,
  parseTimestamp,
  resolveNumeric,
  resolveRelativeLocale,
  selectRelativeUnit,
} from './relative-time.js'

const NOW = Date.UTC(2026, 9, 29, 12, 0, 0)
const MINUTE = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

describe('parseTimestamp：epoch / ISO / Date 统一为毫秒时间戳', () => {
  it('数字与数字字符串按 epoch 毫秒解析（含 0 与负数）', () => {
    expect(parseTimestamp(0)).toBe(0)
    expect(parseTimestamp('0')).toBe(0)
    expect(parseTimestamp(NOW)).toBe(NOW)
    expect(parseTimestamp(String(NOW))).toBe(NOW)
    expect(parseTimestamp(-1000)).toBe(-1000)
    expect(parseTimestamp(`  ${NOW}  `)).toBe(NOW)
  })

  it('ISO 8601 字符串按 Date.parse 解析', () => {
    expect(parseTimestamp('2026-10-29T12:00:00.000Z')).toBe(NOW)
    expect(parseTimestamp('2026-10-29')).toBe(Date.parse('2026-10-29'))
  })

  it('Date 实例与带 getTime 的对象取时间戳；无效 Date 返回 null', () => {
    expect(parseTimestamp(new Date(NOW))).toBe(NOW)
    expect(parseTimestamp(new Date(Number.NaN))).toBeNull()
    expect(parseTimestamp({ getTime: () => NOW })).toBe(NOW)
    expect(parseTimestamp({ getTime: () => Number.NaN })).toBeNull()
  })

  it('缺失 / 空串 / 非数字串 / NaN / Infinity / 越界时间戳安全返回 null', () => {
    for (const bad of [null, undefined, '', '   ', 'abc', 'NaN', 'Invalid Date', Number.NaN, Infinity]) {
      expect(parseTimestamp(bad), `bad=${String(bad)}`).toBeNull()
    }
    // Date 可表示范围外（±8.64e15 ms）同样视为非法，避免 toISOString 抛 RangeError
    expect(parseTimestamp(1e300)).toBeNull()
    expect(parseTimestamp('1e300')).toBeNull()
  })
})

describe('selectRelativeUnit：单位选择与进位', () => {
  it('秒内与秒边界', () => {
    expect(selectRelativeUnit(0)).toEqual({ unit: 'second', value: 0 })
    expect(selectRelativeUnit(44_000)).toEqual({ unit: 'second', value: 44 })
    expect(selectRelativeUnit(59_000)).toEqual({ unit: 'second', value: 59 })
    expect(selectRelativeUnit(59_500)).toEqual({ unit: 'minute', value: 1 })
    expect(selectRelativeUnit(60_000)).toEqual({ unit: 'minute', value: 1 })
  })

  it('分钟、小时进位（四舍五入后触及下一单位上限即进位）', () => {
    expect(selectRelativeUnit(90_000)).toEqual({ unit: 'minute', value: 2 })
    expect(selectRelativeUnit(59 * MINUTE + 40_000)).toEqual({ unit: 'hour', value: 1 })
    expect(selectRelativeUnit(23.5 * HOUR)).toEqual({ unit: 'day', value: 1 })
    expect(selectRelativeUnit(22 * HOUR)).toEqual({ unit: 'hour', value: 22 })
  })

  it('天、月、年进位（月因子 30.436875 天、年因子 365.2425 天）', () => {
    expect(selectRelativeUnit(29 * DAY)).toEqual({ unit: 'day', value: 29 })
    expect(selectRelativeUnit(30 * DAY)).toEqual({ unit: 'month', value: 1 })
    expect(selectRelativeUnit(46 * DAY)).toEqual({ unit: 'month', value: 2 })
    expect(selectRelativeUnit(364 * DAY)).toEqual({ unit: 'year', value: 1 })
    expect(selectRelativeUnit(365 * DAY)).toEqual({ unit: 'year', value: 1 })
    expect(selectRelativeUnit(730 * DAY)).toEqual({ unit: 'year', value: 2 })
  })

  it('过去为负、未来为正，四舍五入对称', () => {
    expect(selectRelativeUnit(-90_000)).toEqual({ unit: 'minute', value: -2 })
    expect(selectRelativeUnit(-3 * HOUR)).toEqual({ unit: 'hour', value: -3 })
    expect(selectRelativeUnit(3 * HOUR)).toEqual({ unit: 'hour', value: 3 })
    expect(selectRelativeUnit(-1)).toEqual({ unit: 'second', value: 0 })
  })

  it('非有限差分安全兜底为秒 0（不产出 NaN）', () => {
    expect(selectRelativeUnit(Number.NaN)).toEqual({ unit: 'second', value: 0 })
    expect(selectRelativeUnit(Infinity)).toEqual({ unit: 'second', value: 0 })
  })
})

describe('formatRelativeTime：Intl.RelativeTimeFormat 文案', () => {
  it('中文过去 / 未来（numeric=always）', () => {
    expect(formatRelativeTime(-3 * MINUTE, 'zh-CN', 'always')).toBe('3分钟前')
    expect(formatRelativeTime(2 * HOUR, 'zh-CN', 'always')).toBe('2小时后')
  })

  it('numeric=auto 输出语义化文案（现在 / 昨天）', () => {
    expect(formatRelativeTime(0, 'zh-CN', 'auto')).toBe('现在')
    expect(formatRelativeTime(-DAY, 'zh-CN', 'auto')).toBe('昨天')
    expect(formatRelativeTime(DAY, 'en-US', 'auto')).toBe('tomorrow')
  })

  it('英文 / 德文 locale 由 Intl 本地化', () => {
    expect(formatRelativeTime(-3 * MINUTE, 'en-US', 'always')).toBe('3 minutes ago')
    expect(formatRelativeTime(-2 * HOUR, 'de-DE', 'always')).toBe('vor 2 Stunden')
  })

  it('非有限差分返回 null（空态交宿主处理）', () => {
    expect(formatRelativeTime(Number.NaN, 'zh-CN', 'always')).toBeNull()
    expect(formatRelativeTime(Infinity, 'zh-CN', 'always')).toBeNull()
  })
})

describe('resolveRelativeLocale / resolveNumeric：安全回落', () => {
  it('合法 locale 规范化保留', () => {
    expect(resolveRelativeLocale(['de-DE'], 'en-US')).toBe('de-DE')
    expect(resolveRelativeLocale(['en'], 'en-US')).toBe('en')
    expect(resolveRelativeLocale(['zh-hans-cn'], 'en-US')).toBe('zh-Hans-CN')
  })

  it('下划线 / 结构非法 / 不支持标签回落到候选链末项', () => {
    expect(resolveRelativeLocale(['zh_CN', 'not-a-locale', 'xx-YY'], 'en-US')).toBe('en-US')
    expect(resolveRelativeLocale(['zh_CN', 'en'], 'en-US')).toBe('en')
    expect(resolveRelativeLocale([null, '', 'de-DE'], 'en-US')).toBe('de-DE')
    expect(resolveRelativeLocale([], 'en-US')).toBe('en-US')
  })

  it('numeric 只接受 auto / always，其余回落 auto', () => {
    expect(resolveNumeric('always')).toBe('always')
    expect(resolveNumeric('auto')).toBe('auto')
    expect(resolveNumeric(' ALWAYS ')).toBe('always')
    expect(resolveNumeric('bogus')).toBe('auto')
    expect(resolveNumeric(null)).toBe('auto')
  })
})
