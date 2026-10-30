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
 * - 非法 locale（zh_CN / 自定义名 / 非 ASCII / 空串）固定回退 en-US，不让 Chart.update 抛异常。
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

/**
 * 取当前量级的十进制单位（10^floor(log10(value))）。
 *
 * 次正规区（指数 ≤ -324）`10 ** -324 === 0`：用 `MIN_VALUE` 作为有限近似单位
 * （1×MIN ≈ 1e-324），避免 niceStep / nextNiceStep 因除零退化。
 */
function decimalUnit(value: number): number {
  const exponent = Math.floor(Math.log10(value))
  return exponent <= -324 ? Number.MIN_VALUE : 10 ** exponent
}

/** 取不小于 rough 的最小 nice 步长；零 / 负 / 非有限值返回 0 */
export function niceStep(rough: number): number {
  if (!Number.isFinite(rough) || rough <= 0) return 0
  const unit = decimalUnit(rough)
  // 除法可能产生 2.5000000000000004 这样的尾差：先按 1e-9 归一化再比档位，
  // 保证 0.2/4、90/4 这类输入仍落在 5 / 25 档，而不是被抬到下一档。
  const fraction = Math.round((rough / unit) * 1e9) / 1e9
  const mantissa = NICE_MANTISSAS.find((m) => fraction <= m) ?? 10
  return snap(mantissa * unit)
}

/**
 * 序列中的下一档（1 → 2 → 2.5 → 5 → 10 → 20 …）。
 *
 * 不重建 `10 ** exponent`（次正规区会下溢为 0），而是按当前 step 的 mantissa 档位
 * 乘对应倍率：1→2（×2）、2→2.5（×1.25）、2.5→5 / 5→10 / 10→20（×2）。
 * 返回值在有限域内始终 > step；只有 step 乘 2 真溢出时才返回 Infinity。
 */
function nextNiceStep(step: number): number {
  const unit = decimalUnit(step)
  const fraction = Math.round((step / unit) * 1e9) / 1e9
  const index = Math.max(
    0,
    NICE_MANTISSAS.findIndex((m) => fraction <= m),
  )
  const multiplier = index === 1 ? 1.25 : 2
  const candidate = snap(step * multiplier)
  // 次正规区 2.5×MIN 等档位不可精确表示，×1.25 可能被舍入回原值：
  // 退化为 ×2 保证 next 严格前进（仍有限，除非真正溢出）。
  return candidate > step ? candidate : snap(step * 2)
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

/** 非法 locale 的固定回退 locale：不依赖运行环境默认值，保证 SSR/客户端快照一致 */
const FALLBACK_LOCALE = 'en-US'

/** Intl.NumberFormat 缓存：locale|notation|精度 键控，每轴每档复用同一构造结果。
 *  容量上限（FIFO 淘汰）：宿主持续注入不同非法 locale 时 Map 不无限增长。 */
const FORMATTER_CACHE_MAX = 64
const formatterCache = new Map<string, Intl.NumberFormat>()

/** 只读探针（测试锁上限用）：ticks 是内部模块，不进公共导出面 */
export function formatterCacheSize(): number {
  return formatterCache.size
}

/** 清空探针（测试构造兜底路径用）：清后必 miss，强制走 Intl 构造（含抛错兜底分支） */
export function resetFormatterCacheForTests(): void {
  formatterCache.clear()
}

/**
 * 构造（或复用）formatter。非法 locale（zh_CN / 自定义名 / 非 ASCII / 空串）只回退一次到
 * 固定 en-US（保证 SSR 与客户端一致），绝不把未校验 locale 再交给 Intl 二次抛 RangeError。
 * 最终兜底不依赖 Intl（构造本身不可用时退化为 toFixed 字符串），保证任何环境都不向渲染抛错。
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
    try {
      formatter = new Intl.NumberFormat(FALLBACK_LOCALE, options)
    } catch {
      // 极端环境（Intl 构造整体不可用）：字符串格式化兜底（可读、不抛）；与主路径输出
      // 允许不同（此时已无「双端一致」可谈），只保证刻度可渲染
      formatter = {
        format: (value: number) => value.toFixed(Math.max(0, Math.min(100, digits))),
      } as unknown as Intl.NumberFormat
    }
  }
  // FIFO 淘汰最旧缓存项（正常宿主 locale 集合有限，不会触顶）
  if (formatterCache.size >= FORMATTER_CACHE_MAX) {
    const oldest = formatterCache.keys().next().value
    if (oldest !== undefined) formatterCache.delete(oldest)
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
