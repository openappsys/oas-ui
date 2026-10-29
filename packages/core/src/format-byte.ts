/**
 * 字节量格式化（全库唯一实现）：把字节数渲染为 `B` / `KiB` / `MiB`… 或 SI `B` / `KB` / `MB`…。
 *
 * 设计取舍：
 * - 默认 IEC（1024 进制，`KiB`/`MiB`）——文件系统与浏览器 `File.size` 的常用口径；
 *   需要十进制标签（`KB`/`MB`）时显式传 `unitSystem: 'si'`，不猜测、不自动切换。
 * - 默认 `locale: 'en-US'`：SSR 快照与客户端渲染必须逐字一致（不随运行环境 locale 漂移）；
 *   需要本地化小数点/数字字形时显式传 `locale`，非法标签回落 `en-US` 且不抛错。
 * - 固定小数位（默认 1 位）而非「最多 N 位」：与上传组件旧的定点显示意图一致
 *   （`2.0 KiB` / `5.0 MiB`），避免同一列表里 `2 KiB` 与 `2.5 KiB` 对齐抖动。
 * - 进位按舍入后的值判定：`1023.96 B` → `1.0 KiB`、`1023.96 KiB` → `1.0 MiB`，不出现
 *   `1024.0 KiB` 这类越档文本；档位封顶 `EiB` / `EB`，极大值不溢出为 `Infinity`。
 * - 本模块零 DOM 引用：Node 可直接导入（`@oas-ui/core/format-byte`）。
 */

/** 单位制：`iec` = 1024 进制（KiB/MiB…），`si` = 1000 进制（KB/MB…） */
export type ByteUnitSystem = 'iec' | 'si'

export interface FormatByteOptions {
  /** BCP 47 locale；缺省 `en-US`（确定性），非法/空值回落 `en-US` */
  locale?: string
  /** 单位制，缺省 `iec`；非法值按 `iec` 处理 */
  unitSystem?: ByteUnitSystem
  /** 非 B 档的小数位数，缺省 1；负数归 0、小数截断、非法/非有限回落默认，上限 20 */
  precision?: number
}

const IEC_UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB'] as const
const SI_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'] as const
const DEFAULT_PRECISION = 1
const MAX_PRECISION = 20
const FALLBACK_LOCALE = 'en-US'

/** formatter 复用：列表渲染逐行调用，避免重复构造 Intl.NumberFormat */
const formatterCache = new Map<string, Intl.NumberFormat>()

function resolvePrecision(raw: number | undefined): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return DEFAULT_PRECISION
  return Math.min(MAX_PRECISION, Math.max(0, Math.trunc(raw)))
}

function getFormatter(locale: string, digits: number): Intl.NumberFormat {
  const key = `${locale}|${digits}`
  const cached = formatterCache.get(key)
  if (cached) return cached
  const options: Intl.NumberFormatOptions = {
    useGrouping: false,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }
  let formatter: Intl.NumberFormat
  try {
    formatter = new Intl.NumberFormat(locale, options)
  } catch {
    // 非法 BCP 47 标签：不向调用方抛错，固定回落 en-US（SSR 与客户端同口径）
    formatter = new Intl.NumberFormat(FALLBACK_LOCALE, options)
  }
  formatterCache.set(key, formatter)
  return formatter
}

/** 按固定小数位舍入；极大值乘 `10^digits` 可能上溢，此时原值已无小数位，直接返回 */
function roundAt(value: number, digits: number): number {
  if (digits <= 0) return Math.round(value)
  const product = value * 10 ** digits
  if (!Number.isFinite(product)) return value
  return Math.round(product) / 10 ** digits
}

/**
 * 字节数 → 人类可读文本。
 *
 * @param bytes 字节数（`File.size` 口径）；非有限数/非 number 返回空串
 * @example formatByte(1536) // '1.5 KiB'
 * @example formatByte(1000, { unitSystem: 'si' }) // '1.0 KB'
 * @example formatByte(1536, { locale: 'de-DE' }) // '1,5 KiB'
 */
export function formatByte(bytes: number, options: FormatByteOptions = {}): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return ''

  const unitSystem: ByteUnitSystem = options.unitSystem === 'si' ? 'si' : 'iec'
  const units = unitSystem === 'si' ? SI_UNITS : IEC_UNITS
  const base = unitSystem === 'si' ? 1000 : 1024
  const precision = resolvePrecision(options.precision)
  const locale = typeof options.locale === 'string' && options.locale !== '' ? options.locale : FALLBACK_LOCALE

  const magnitude = Math.abs(bytes)
  let exponent = 0
  while (exponent < units.length - 1 && magnitude >= base ** (exponent + 1)) exponent += 1

  // B 档取整；非 B 档固定 precision 位。舍入触顶（1024.0 / 1000.0）升一档重算。
  const digitsAt = (exp: number): number => (exp === 0 ? 0 : precision)
  if (exponent < units.length - 1 && roundAt(magnitude / base ** exponent, digitsAt(exponent)) >= base) {
    exponent += 1
  }

  const digits = digitsAt(exponent)
  const scaled = roundAt(magnitude / base ** exponent, digits)
  // 舍入后为 0 时不带负号（避免 -0.4 B 渲染成 `-0 B`）
  const sign = bytes < 0 && scaled !== 0 ? '-' : ''
  return `${sign}${getFormatter(locale, digits).format(scaled)} ${units[exponent]}`
}
