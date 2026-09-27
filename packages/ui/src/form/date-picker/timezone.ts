/**
 * timezone —— date-picker 的时区锚点纯函数。
 *
 * 语义：`timezone` 属性接受 IANA 时区名（如 `America/New_York`）或 `UTC`；缺省/非法
 * 回落宿主本地时区。它只改变「何时算今天」与由此派生的快捷预设/默认时刻——value 契约
 * （`yyyy-MM-dd` / `yyyy-MM-ddTHH:mm:ss` 墙钟串）不变。
 *
 * 实现：JS `Date` 只表达「绝对时刻 + 宿主本地墙钟」。本模块先用
 * `Intl.DateTimeFormat({ timeZone })` 把绝对时刻折算成目标时区的墙钟分量，再装回一个
 * 本地 `Date`；此后既有本地 Date 逻辑（取年月日/时分秒、网格展开）无需改动即按目标时区思考。
 */

/** 校验时区名；空串/非法返回 null（表示使用宿主本地时区） */
export function resolveTimezone(raw: string): string | null {
  const tz = (raw ?? '').trim()
  if (!tz) return null
  try {
    // 构造一次即校验 IANA 名合法性（非法名抛 RangeError）
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return tz
  } catch {
    return null
  }
}

/**
 * 目标时区下 `base` 时刻的墙钟（装回本地 Date，各字段等于目标时区看到的值）。
 * `timeZone` 为 null 时返回 `base` 的副本（宿主本地语义）。
 */
export function wallClockIn(timeZone: string | null, base: Date = new Date()): Date {
  if (!timeZone) return new Date(base.getTime())
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    // h23 保证午夜为 00（规避个别引擎 h24 的 24 方言）
    hourCycle: 'h23',
  }).formatToParts(base)
  const get = (type: string): number => {
    const v = parts.find((p) => p.type === type)?.value
    return v == null ? 0 : Number(v)
  }
  let hour = get('hour')
  if (hour === 24) hour = 0
  return new Date(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'))
}
