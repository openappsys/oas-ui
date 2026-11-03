/**
 * table 单元格值格式化 helper（Pro 子路径，纯函数、零运行时依赖）：
 * - 按需引入：`import { createFormatter } from '@oas-ui/ui/data/table/value-format'`；
 *   运行闭包只有本模块 + 库内统一 dev 告警通道（无组件运行时 / core / i18n）。
 * - 与 `@oas-ui/ui/data/table/format`（条件格式 capability，注册表装饰通道）不是同一件事：
 *   本 helper 只把值转成展示文本，不触碰 DOM / 不注册任何能力。
 */
import { devWarn } from '../../../shared/dev-warn.js'

/** 数值格式化：precision 小数位（0-20，缺省保留原精度）、group 千分位、percent 乘 100 加 % */
export interface NumberFormatSpec {
  type: 'number'
  precision?: number
  group?: boolean
  percent?: boolean
  prefix?: string
  suffix?: string
}

/**
 * 日期格式化：pattern 支持预设 `YYYY-MM-DD`（缺省）/ `datetime` / `time`，
 * 或自定义 token 模板（`YYYY` `YY` `MM` `DD` `HH` `mm` `ss`，另兼容 date-grid 的小写
 * `yyyy` / `yy` / `dd`）。
 */
export interface DateFormatSpec {
  type: 'date'
  pattern?: string
}

/** 文本格式化：ellipsis 为保留的最大字符数（按码点计数），超出追加 … */
export interface TextFormatSpec {
  type: 'text'
  ellipsis?: number
}

/** 自定义格式化：自行拼文本，可用整行数据 */
export interface CustomFormatSpec {
  type: 'custom'
  format: (value: unknown, row?: Record<string, unknown>) => string
}

/** 格式化配置 */
export type FormatterSpec = NumberFormatSpec | DateFormatSpec | TextFormatSpec | CustomFormatSpec

/** 格式化函数：`(value, row?) => string`，null / undefined 统一输出空串（custom 除外） */
export type Formatter = (value: unknown, row?: Record<string, unknown>) => string

const MAX_PRECISION = 20

const isBlank = (value: unknown): boolean => value === null || value === undefined || value === ''

/** 回落：空值 → 空串，其余 String()（非法 spec / 非法值共用） */
const fallback = (value: unknown): string => (isBlank(value) ? '' : String(value))

const pad2 = (value: number): string => (value < 10 ? `0${value}` : String(value))

/**
 * token 格式化（本地时区）。
 *
 * 说明：库内 `form/calendar/date-grid.ts` 的 `formatToken()` 需要 `@oas-ui/core` +
 * `@oas-ui/i18n/registry`（Intl locale 解析）才能工作，把它拉进本 helper 会让按需链
 * 携带组件运行时依赖，违反「helper 子路径零组件运行时」纪律。这里按 date-grid 的 token
 * 词汇（yyyy/MM/dd/HH/mm/ss）本地实现 ISO 子集，输出口径一致（本地时区、逐段补零）。
 */
function formatDate(date: Date, pattern: string): string {
  const resolved = pattern === 'datetime' ? 'YYYY-MM-DD HH:mm:ss' : pattern === 'time' ? 'HH:mm:ss' : pattern
  const yyyy = String(date.getFullYear()).padStart(4, '0')
  const values: Record<string, string> = {
    YYYY: yyyy,
    yyyy,
    YY: yyyy.slice(-2),
    yy: yyyy.slice(-2),
    MM: pad2(date.getMonth() + 1),
    DD: pad2(date.getDate()),
    dd: pad2(date.getDate()),
    HH: pad2(date.getHours()),
    mm: pad2(date.getMinutes()),
    ss: pad2(date.getSeconds()),
  }
  return resolved.replace(/YYYY|yyyy|YY|yy|MM|DD|dd|HH|mm|ss/g, (token) => values[token] ?? token)
}

/** 'YYYY-MM-DD[ T]HH:mm[:ss]' 本地时区解析（越界字段返回 null，避免 Date 静默回绕） */
const LOCAL_DATE_RE = /^(\d{4})-(\d{2})(?:-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?)?$/

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (text === '') return null
  const match = LOCAL_DATE_RE.exec(text)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2])
    const day = match[3] != null ? Number(match[3]) : 1
    const date = new Date(year, month - 1, day)
    if (match[4] != null) date.setHours(Number(match[4]), Number(match[5] ?? 0), Number(match[6] ?? 0), 0)
    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null
    }
    return date
  }
  // 带时区/完整 ISO 等其余写法交给 Date.parse（不做本地化改写）
  const parsed = Date.parse(text)
  return Number.isNaN(parsed) ? null : new Date(parsed)
}

/** 整数部分千分位分组（保留符号与小数；指数形态等非纯数字整数部分原样返回） */
function groupDigits(text: string): string {
  const dot = text.indexOf('.')
  const integer = dot < 0 ? text : text.slice(0, dot)
  const fraction = dot < 0 ? '' : text.slice(dot)
  const negative = integer.startsWith('-')
  const digits = negative ? integer.slice(1) : integer
  if (!/^\d+$/.test(digits)) return text
  let out = ''
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ','
    out += digits[i]
  }
  return `${negative ? '-' : ''}${out}${fraction}`
}

function formatNumber(value: unknown, spec: NumberFormatSpec): string {
  if (isBlank(value)) return ''
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  const percent = spec.percent === true
  const scaled = percent ? numeric * 100 : numeric
  const precision = typeof spec.precision === 'number' ? Math.min(Math.trunc(spec.precision), MAX_PRECISION) : null
  let body: string
  if (precision == null) {
    body = String(scaled)
  } else {
    const rounded = Number(scaled.toFixed(precision))
    // -0 归一为 0，避免出现 '-0.00'
    body = (Object.is(rounded, -0) ? 0 : rounded).toFixed(precision)
  }
  const grouped = spec.group === true ? groupDigits(body) : body
  const prefix = typeof spec.prefix === 'string' ? spec.prefix : ''
  const suffix = typeof spec.suffix === 'string' ? spec.suffix : percent ? '%' : ''
  return `${prefix}${grouped}${suffix}`
}

const isIntegerInRange = (value: unknown, min: number, max: number): boolean =>
  typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= min && value <= max

function isValidSpec(spec: unknown): spec is FormatterSpec {
  if (spec == null || typeof spec !== 'object') return false
  const candidate = spec as Partial<FormatterSpec> & Record<string, unknown>
  switch (candidate.type) {
    case 'number':
      return (
        (candidate.precision === undefined || isIntegerInRange(candidate.precision, 0, MAX_PRECISION)) &&
        (candidate.group === undefined || typeof candidate.group === 'boolean') &&
        (candidate.percent === undefined || typeof candidate.percent === 'boolean') &&
        (candidate.prefix === undefined || typeof candidate.prefix === 'string') &&
        (candidate.suffix === undefined || typeof candidate.suffix === 'string')
      )
    case 'date':
      return candidate.pattern === undefined || typeof candidate.pattern === 'string'
    case 'text':
      return candidate.ellipsis === undefined || isIntegerInRange(candidate.ellipsis, 1, Number.MAX_SAFE_INTEGER)
    case 'custom':
      return typeof candidate.format === 'function'
    default:
      return false
  }
}

/**
 * 创建值格式化函数 `(value, row?) => string`。
 *
 * - 非法 spec（未知 type / 类型不符的选项 / 缺 custom.format）回落 `String(value)` 并 `devWarn` 一次
 * - 空值（null / undefined）统一输出空串；数值/日期非法值回落 `String(value)`
 * - 不修改 value / row；custom 抛错时回落 `String(value)`，同一实例只告警一次
 */
export function createFormatter(spec: FormatterSpec): Formatter {
  if (!isValidSpec(spec)) {
    devWarn('[oas-ui] createFormatter: 非法 spec，已回落到 String(value)', spec)
    return (value) => fallback(value)
  }

  if (spec.type === 'custom') {
    const custom = spec.format
    let warned = false
    return (value, row) => {
      try {
        const result = custom(value, row)
        return result == null ? '' : String(result)
      } catch (error) {
        if (!warned) {
          warned = true
          devWarn('[oas-ui] createFormatter: custom format 抛错，已回落到 String(value)', error)
        }
        return fallback(value)
      }
    }
  }

  if (spec.type === 'date') {
    const pattern = spec.pattern ?? 'YYYY-MM-DD'
    return (value) => {
      if (isBlank(value)) return ''
      const date = toDate(value)
      return date ? formatDate(date, pattern) : String(value)
    }
  }

  if (spec.type === 'text') {
    const limit = spec.ellipsis
    return (value) => {
      if (isBlank(value)) return ''
      const text = String(value)
      if (limit === undefined) return text
      const chars = Array.from(text)
      return chars.length > limit ? `${chars.slice(0, limit).join('')}…` : text
    }
  }

  return (value) => formatNumber(value, spec)
}
