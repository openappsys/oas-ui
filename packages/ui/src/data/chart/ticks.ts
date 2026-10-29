/**
 * chart 刻度纯函数（内部模块，不进公开 API）。
 *
 * 契约：
 * - nice 步长序列仅 `1 / 2 / 2.5 / 5 / 10 × 10^n`，阈值处向上切换（0.01 量程 → 0.0025 步长）；
 * - `niceTicks(rawMax, segments)` 产出 `{ max, step, values }`，单轴 / 双轴 / radar / stacked 共用；
 * - 标签精度由步长动态推导（`Intl.NumberFormat` 的 maximumFractionDigits），移除显示层 `Math.round`；
 * - 浮点噪声在 values 层做 15 位有效数字收口，标签层再由 Intl 精度收口；
 * - 大步长（≥1e6）与极小小步长（<1e-4）走科学计数，避免长数字撑爆刻度列；0 始终显示 `0`；
 * - 选档后再次校验 `max >= rawMax`，浮点尾差（0.4000000000000001）顺延下一合法档；
 * - 有效有限渲染域内的极值仍返回有限可渲染结果：上溢（≈MAX_VALUE）钳到 MAX_VALUE +
 *   等分 step，下溢（最小次正规）用 MIN_VALUE 作步长；非有限 rawMax 用文档化零哨兵；
 * - 非法 locale（zh_CN / 自定义名 / 空串）回退运行环境默认 locale，不让 Chart.update 抛异常。
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
/** 有限渲染域边界：上溢钳制目标 / 下溢最小正步长 */
const MAX_FINITE = Number.MAX_VALUE
const MIN_FINITE = Number.MIN_VALUE
/** 选档顺延次数上限（一个数量级最多跨 5 档；32 远超正常所需，防异常输入死循环） */
const MAX_STEP_ADVANCE = 32

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

/** 序列中的下一档（1 → 2 → 2.5 → 5 → 10 → 20 …），用于浮点尾差顺延 */
function nextNiceStep(step: number): number {
  const exponent = Math.floor(Math.log10(step))
  const power = 10 ** exponent
  if (!Number.isFinite(power) || power === 0) return Number.POSITIVE_INFINITY
  const fraction = Math.round((step / power) * 1e9) / 1e9
  const index = NICE_MANTISSAS.findIndex((m) => fraction <= m)
  if (index < 0) return Number.POSITIVE_INFINITY
  const next = index + 1 < NICE_MANTISSAS.length ? NICE_MANTISSAS[index + 1]! : 20
  return snap(next * power)
}

/**
 * 上溢降级：有效有限渲染域内已无 nice 档能覆盖 rawMax（step × segments 会溢出）。
 * 钳到 MAX_VALUE 并按段数等分，保证 max 有限且 ≥ rawMax、values 全有限。
 */
function overflowTicks(count: number): ChartTicks {
  const step = MAX_FINITE / count
  const values = Array.from({ length: count + 1 }, (_, i) => (i === count ? MAX_FINITE : snap(i * step)))
  return { max: MAX_FINITE, step, values }
}

/** 以固定段数生成 nice 刻度（segments 为区间数，values 长度 = segments + 1） */
export function niceTicks(rawMax: number, segments = 4): ChartTicks {
  const count = Math.max(1, Math.floor(Number.isFinite(segments) ? segments : 4))
  const limit = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : 0
  if (limit === 0) return { max: 0, step: 0, values: Array.from({ length: count + 1 }, () => 0) }

  // limit / count 可能下溢为 0（最小次正规）；此时用最小正步长作有限降级，
  // max = MIN_FINITE × count 仍然有限且 ≥ rawMax。
  let step = niceStep(limit / count)
  if (!Number.isFinite(step) || step <= 0) step = MIN_FINITE

  let max = snap(step * count)
  let guard = 0
  // 浮点尾差会让 max 略小于 rawMax（如 0.4 < 0.4000000000000001）：
  // 严格校验并顺延下一合法档，绝不返回 max < rawMax 的刻度。
  while ((!Number.isFinite(max) || max < limit) && guard++ <= MAX_STEP_ADVANCE) {
    if (!Number.isFinite(step * count)) return overflowTicks(count)
    const next = nextNiceStep(step)
    if (!Number.isFinite(next) || next <= step) return overflowTicks(count)
    step = next
    max = snap(step * count)
  }
  if (!Number.isFinite(max) || max < limit) return overflowTicks(count)

  const values = Array.from({ length: count + 1 }, (_, i) => (i === count ? max : snap(i * step)))
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

/** Intl.NumberFormat 缓存：locale|notation|精度 键控，每轴每档复用同一构造结果 */
const formatterCache = new Map<string, Intl.NumberFormat>()

/**
 * 构造（或复用）formatter。非法 locale（zh_CN / 自定义名 / 空串）只回退一次到运行环境
 * 默认 locale，绝不把未校验 locale 再交给 Intl 二次抛 RangeError。
 */
function formatterFor(locale: string, scientific: boolean, digits: number): Intl.NumberFormat {
  const key = `${locale}\u0000${scientific ? 'sci' : 'std'}\u0000${digits}`
  const cached = formatterCache.get(key)
  if (cached) return cached
  const options: Intl.NumberFormatOptions = {
    useGrouping: false,
    notation: scientific ? 'scientific' : 'standard',
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }
  let formatter: Intl.NumberFormat
  try {
    formatter = new Intl.NumberFormat(locale, options)
  } catch {
    formatter = new Intl.NumberFormat(undefined, options)
  }
  formatterCache.set(key, formatter)
  return formatter
}

/**
 * 刻度标签格式化：精度随 step 动态化，locale 感知小数分隔符。
 * 科学计数用 maximumFractionDigits=20（Intl 自动裁掉尾零），保留 2.5E8 的 2.5 而不丢精度。
 * 非有限 value 返回显式哨兵 `—`（不再静默显示 0；正式刻度经 niceTicks 保证全有限）。
 */
export function formatTick(value: number, step: number, locale = 'en-US'): string {
  if (!Number.isFinite(value)) return '—'
  // 科学计数下 Intl 会把 0 写成 0E0；轴原点的 0 始终用常规形式。
  if (value === 0) return formatterFor(locale, false, 0).format(0)
  const scientific = usesScientific(step)
  return formatterFor(locale, scientific, scientific ? 20 : tickFractionDigits(step)).format(value)
}
