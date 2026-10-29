/**
 * chart 刻度纯函数（内部模块，不进公开 API）。
 *
 * 契约：
 * - nice 步长序列仅 `1 / 2 / 2.5 / 5 / 10 × 10^n`，阈值处向上切换（0.01 量程 → 0.0025 步长）；
 * - `niceTicks(rawMax, segments)` 产出 `{ max, step, values }`，单轴 / 双轴 / radar / stacked 共用；
 * - 标签精度由步长动态推导（`Intl.NumberFormat` 的 maximumFractionDigits），移除显示层 `Math.round`；
 * - 浮点噪声在 values 层做 15 位有效数字收口，标签层再由 Intl 精度收口；
 * - 大步长（≥1e6）与极小小步长（<1e-4）走科学计数，避免长数字撑爆刻度列；0 始终显示 `0`。
 */

export interface ChartTicks {
  /** 量程顶（= step × segments，≥ rawMax） */
  max: number
  /** nice 步长；全零数据为 0 */
  step: number
  /** 含 0 与量程顶的 segments + 1 个刻度值，已去除浮点噪声 */
  values: number[]
}

/** 允许的步长尾数（10 是跨数量级的收口档） */
const NICE_MANTISSAS = [1, 2, 2.5, 5, 10] as const

/** 科学计数切换阈值：步长 ≥ 1e6 或 < 1e-4 */
const SCIENTIFIC_MAX_STEP = 1e6
const SCIENTIFIC_MIN_STEP = 1e-4

/** 15 位有效数字：覆盖 double 的精度，抹掉 0.1×3 = 0.30000000000000004 一类噪声 */
function snap(value: number): number {
  return Number(value.toPrecision(15))
}

/** 取不小于 rough 的最小 nice 步长；零 / 负 / 非有限值返回 0 */
export function niceStep(rough: number): number {
  if (!Number.isFinite(rough) || rough <= 0) return 0
  const exponent = Math.floor(Math.log10(rough))
  const power = 10 ** exponent
  // 除法可能产生 2.5000000000000004 这样的尾差：先按 1e-9 归一化再比档位，
  // 保证 0.2/4、90/4 这类输入仍落在 5 / 25 档，而不是被抬到下一档。
  const fraction = Math.round((rough / power) * 1e9) / 1e9
  const mantissa = NICE_MANTISSAS.find((m) => fraction <= m) ?? 10
  return snap(mantissa * power)
}

/** 以固定段数生成 nice 刻度（segments 为区间数，values 长度 = segments + 1） */
export function niceTicks(rawMax: number, segments = 4): ChartTicks {
  const count = Math.max(1, Math.floor(Number.isFinite(segments) ? segments : 4))
  const limit = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 0
  if (limit === 0) return { max: 0, step: 0, values: Array.from({ length: count + 1 }, () => 0) }
  const step = niceStep(limit / count)
  const max = snap(step * count)
  const values = Array.from({ length: count + 1 }, (_, i) => snap(i * step))
  values[count] = max
  return { max, step, values }
}

/** 步长需要的最少小数位（25 → 0，2.5 → 1，0.05 → 2，0.0025 → 4） */
export function tickFractionDigits(step: number): number {
  if (!Number.isFinite(step) || step === 0) return 0
  const abs = Math.abs(step)
  for (let digits = 0; digits <= 20; digits++) {
    if (Math.abs(Number(abs.toFixed(digits)) - abs) <= abs * 1e-9) return digits
  }
  return 20
}

function usesScientific(step: number): boolean {
  return Number.isFinite(step) && step > 0 && (step >= SCIENTIFIC_MAX_STEP || step < SCIENTIFIC_MIN_STEP)
}

/**
 * 刻度标签格式化：精度随 step 动态化，locale 感知小数分隔符。
 * 科学计数用 maximumFractionDigits=20（Intl 自动裁掉尾零），保留 2.5E8 的 2.5 而不丢精度。
 */
export function formatTick(value: number, step: number, locale = 'en-US'): string {
  if (!Number.isFinite(value)) return '0'
  // 科学计数下 Intl 会把 0 写成 0E0；轴原点的 0 始终用常规形式。
  if (value === 0) return new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 0 }).format(0)
  const scientific = usesScientific(step)
  const formatter = new Intl.NumberFormat(locale, {
    useGrouping: false,
    notation: scientific ? 'scientific' : 'standard',
    minimumFractionDigits: 0,
    maximumFractionDigits: scientific ? 20 : tickFractionDigits(step),
  })
  return formatter.format(value)
}
