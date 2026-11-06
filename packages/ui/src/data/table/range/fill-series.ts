/**
 * 填充柄序列推导（纯函数，无 DOM 依赖）。
 *
 * 拖拽填充柄时每个目标格的值由「源区沿填充方向的值序列」推导，语义对齐主流电子表格：
 * - 源区单值 → 复制（单值无数列可推差，数值/日期同样复制）；
 * - 数值列 → 按首差递增序列（`v[1] - v[0]` 为步长，非等差列取首差外推）；
 * - 日期 → 按整日差步进（首差取整数日；Date 实例在原时刻上加减整日，即保留时刻；
 *   首差含非整日成分时回退循环复制）；
 * - 其余（文本/布尔/混合列）→ 循环复制源区模式（多格源区按行列周期平铺）。
 *
 * 方向语义：`values` 恒为源区**自然显示序**（down/up 为行 top→bottom，left/right 为列
 * 左→右），`step` 为目标格到填充边缘的 1 基距离。down/right 沿序列正向续写（边缘 =
 * 末位）；up/left 逆向续写（边缘 = 首位），循环平铺在两个方向上都按无限周期对齐。
 */

export type FillDirection = 'down' | 'up' | 'left' | 'right'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 86_400_000

/** 数值读取：finite number，或可整体解析为有限数的非空字符串（与 fillRange series 通道同一口径） */
function asNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/** ISO 日期读取：`YYYY-MM-DD` 字符串（按 UTC 午夜解析，避免本地时区漂移）或 Date 实例 */
function asIsoDate(value: unknown): { ms: number; iso: boolean } | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? { ms: value.getTime(), iso: false } : null
  if (typeof value === 'string' && ISO_DATE.test(value)) {
    const ms = Date.parse(`${value}T00:00:00Z`)
    return Number.isNaN(ms) ? null : { ms, iso: true }
  }
  return null
}

/** ISO 日期回格式化（UTC 午夜 → `YYYY-MM-DD`，与解析对称） */
function formatIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * 推导第 `step` 步（1 基距离）目标格的填充值。
 * 返回 `undefined` 表示源区为空（调用方应跳过该目标格，不写空串）。
 */
export function inferFillValue(values: readonly unknown[], step: number, direction: FillDirection): unknown {
  if (values.length === 0) return undefined
  if (values.length === 1) return values[0]
  const forward = direction === 'down' || direction === 'right'
  const offset = forward ? step : -step

  // 数值列：全 number 或全「数值字符串」（混合两类不视为数值列，走循环复制）
  const allNumber = values.every((v) => typeof v === 'number' && Number.isFinite(v))
  const allNumericString = values.every((v) => asNumber(v) !== null && typeof v === 'string')
  if (allNumber || allNumericString) {
    const nums = (values as (number | string)[]).map((v) => asNumber(v)!)
    const diff = nums[1]! - nums[0]!
    const base = forward ? nums[nums.length - 1]! : nums[0]!
    const next = base + diff * offset
    return allNumericString ? String(next) : next
  }

  // 日期列：全 `YYYY-MM-DD` 字符串或全 Date；首差按 Math.round 取整日，且差必须恰好等于
  // 整数日——Date 实例保留原时刻加减整日步进（如 08:00 → 08:00 次日）；差里含非整日成分
  // （小时/分钟偏移）时不做时刻步进，回退循环复制
  const allIsoString = values.every((v) => asIsoDate(v) !== null && typeof v === 'string')
  const allDate = values.every((v) => v instanceof Date)
  if (allIsoString || allDate) {
    const dates = (values as (string | Date)[]).map((v) => asIsoDate(v)!)
    const dayDiff = Math.round((dates[1]!.ms - dates[0]!.ms) / DAY_MS)
    if (dates[1]!.ms !== dates[0]!.ms + dayDiff * DAY_MS) {
      // 非整日差（含时刻部分）：MVP 不做时刻步进，回退循环复制
      return cycleValue(values, step, forward)
    }
    const base = forward ? dates[dates.length - 1]! : dates[0]!
    const next = base.ms + dayDiff * offset * DAY_MS
    return allIsoString ? formatIsoDate(next) : new Date(next)
  }

  return cycleValue(values, step, forward)
}

/** 循环复制：down/right 沿正向平铺，up/left 逆向平铺（无限周期对齐，与序列方向语义一致） */
function cycleValue(values: readonly unknown[], step: number, forward: boolean): unknown {
  const n = values.length
  if (forward) return values[(step - 1) % n]
  return values[(n - (step % n)) % n]
}
