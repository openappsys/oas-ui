/**
 * `oas-relative-time` 纯格式化层（零 DOM / 零浏览器全局）。
 *
 * SSR（Node）与浏览器共用同一份实现：单位选择、四舍五入、进位、locale 校验与
 * `Intl.RelativeTimeFormat` 文案全部是纯计算，不在模块顶层或函数内触碰 document/window。
 */

/** Intl 支持的相对时间单位（与 Intl.RelativeTimeFormatUnit 对齐的子集） */
export type RelativeTimeUnit = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second'

/** 只暴露 Intl 两种合法模式；其余输入统一回落 auto */
export type RelativeTimeNumeric = 'auto' | 'always'

export interface RelativeTimeValue {
  unit: RelativeTimeUnit
  value: number
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
/** 平均月长（365.2425 / 12 天），与年因子同源，避免月末长短造成跳档不一致 */
const MONTH = 30.436875 * DAY
/** 平均年长（格里高利历） */
const YEAR = 365.2425 * DAY

/** 单位序列：从细到粗；overflow 为「四舍五入后达到该值即进位到下一单位」 */
const UNITS: ReadonlyArray<{ unit: RelativeTimeUnit; ms: number; overflow: number }> = [
  { unit: 'second', ms: SECOND, overflow: 60 },
  { unit: 'minute', ms: MINUTE, overflow: 60 },
  { unit: 'hour', ms: HOUR, overflow: 24 },
  { unit: 'day', ms: DAY, overflow: 30 },
  { unit: 'month', ms: MONTH, overflow: 12 },
  { unit: 'year', ms: YEAR, overflow: Number.POSITIVE_INFINITY },
]

/** Date 可表示范围校验：越界（|ms| > 8.64e15）时 new Date(ms) 为 Invalid Date */
function toValidTimestamp(ms: number): number | null {
  if (!Number.isFinite(ms)) return null
  return Number.isNaN(new Date(ms).getTime()) ? null : ms
}

/**
 * 统一解析 `value` 输入为 epoch 毫秒。
 *
 * - number：按 epoch 毫秒（`Date` 可表示范围内）
 * - Date / 带 getTime 的对象：取其时间戳
 * - string：全数字（可带符号）按 epoch 毫秒；其余按 `Date.parse`（ISO 8601 等）
 * - 缺失 / 空串 / NaN / Infinity / 非法日期：null（宿主渲染安全空态）
 */
export function parseTimestamp(input: unknown): number | null {
  if (input == null) return null
  if (typeof input === 'number') return toValidTimestamp(input)
  if (typeof input === 'string') {
    const raw = input.trim()
    if (raw === '') return null
    if (/^[+-]?\d+$/.test(raw)) return toValidTimestamp(Number(raw))
    return toValidTimestamp(Date.parse(raw))
  }
  if (typeof input === 'object') {
    const getTime = (input as { getTime?: unknown }).getTime
    if (typeof getTime !== 'function') return null
    try {
      return toValidTimestamp(Number(getTime.call(input)))
    } catch {
      return null
    }
  }
  return null
}

/**
 * 选择展示单位并四舍五入。
 *
 * 进位规则：当前单位四舍五入后值达到下一单位上限（秒/分 60、时 24、天 30、月 12）即进位，
 * 避免出现「24 小时前 / 12 个月前」这类越界文案。过去为负、未来为正，四舍五入对称。
 * 非有限差分（数据异常）兜底为 `{ unit: 'second', value: 0 }`，不产出 NaN。
 */
export function selectRelativeUnit(diffMs: number): RelativeTimeValue {
  if (!Number.isFinite(diffMs)) return { unit: 'second', value: 0 }
  const sign = Math.sign(diffMs)
  for (const candidate of UNITS) {
    const rounded = sign * Math.round(Math.abs(diffMs) / candidate.ms)
    // 归一 -0 → 0（JSON/断言/调试更可预期；Intl 文案两值等价）
    const value = rounded === 0 ? 0 : rounded
    if (Math.abs(value) < candidate.overflow) return { unit: candidate.unit, value }
  }
  return { unit: 'year', value: sign * Math.round(Math.abs(diffMs) / YEAR) }
}

/** 合法且受支持的 locale 规范化；非法/不支持返回 null（不抛错） */
function canonicalLocale(tag: string): string | null {
  try {
    const [canonical] = Intl.getCanonicalLocales(tag)
    if (!canonical) return null
    return Intl.RelativeTimeFormat.supportedLocalesOf([canonical]).length > 0 ? canonical : null
  } catch {
    return null
  }
}

/**
 * 从候选链取第一个合法 locale（规范化）；全部非法/不支持时返回 fallback。
 * 候选链由组件按「显式 locale → config-provider → 全局 i18n → en-US」组织。
 */
export function resolveRelativeLocale(
  candidates: ReadonlyArray<string | null | undefined>,
  fallback = 'en-US',
): string {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue
    const trimmed = candidate.trim()
    if (!trimmed) continue
    const resolved = canonicalLocale(trimmed)
    if (resolved) return resolved
  }
  return fallback
}

/** numeric 安全归一：只认 auto / always（大小写与空白容错），其余回落 auto */
export function resolveNumeric(input: string | null | undefined): RelativeTimeNumeric {
  const value = (input ?? '').trim().toLowerCase()
  return value === 'always' ? 'always' : 'auto'
}

/** formatter 缓存（locale|numeric 键控；上限 32，防动态 locale 无界增长） */
const formatterCache = new Map<string, Intl.RelativeTimeFormat>()

function getFormatter(locale: string, numeric: RelativeTimeNumeric): Intl.RelativeTimeFormat {
  const key = `${locale}|${numeric}`
  const cached = formatterCache.get(key)
  if (cached) return cached
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric })
  if (formatterCache.size >= 32) {
    const oldest = formatterCache.keys().next().value
    if (oldest !== undefined) formatterCache.delete(oldest)
  }
  formatterCache.set(key, formatter)
  return formatter
}

/**
 * 相对时间文案：`diffMs = 目标时刻 - 当前时刻`（过去为负、未来为正）。
 * 非有限差分返回 null；Intl 构造/格式化异常同样返回 null，由宿主渲染空态而不崩。
 */
export function formatRelativeTime(
  diffMs: number,
  locale: string,
  numeric: RelativeTimeNumeric = 'auto',
): string | null {
  if (!Number.isFinite(diffMs)) return null
  const { unit, value } = selectRelativeUnit(diffMs)
  try {
    return getFormatter(locale, numeric).format(value, unit)
  } catch {
    return null
  }
}
