/**
 * 迷你 JSON Schema 校验器（V1 关键字全集）+ 只读类型投影。
 *
 * 值契约：form 内核叶子恒为字符串（数组出 JSON 串），求值/校验前按 schema `type` 做
 * **只读投影归一**（`"42"` → 42），提交值不变——避免 `"9" > "100"` 的字符串比较陷阱。
 * 文案不硬编码：返回 i18n key + 插值参数，由组件用 `t()` 渲染（16 语言包齐全）。
 */
import type { JsonSchema } from './types.js'

export interface SchemaIssue {
  keyword: string
  /** 出错路径（点号规范键，数组下标为数字段） */
  path: string
  /** i18n 文案 key（schemaForm.*） */
  messageKey: string
  params?: Record<string, string | number>
}

/** V1 冻结 format 清单 */
export const FORMATS = ['email', 'uri', 'date', 'date-time', 'time'] as const
export type SchemaFormat = (typeof FORMATS)[number]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URI_RE = /^[a-z][a-z0-9+.-]*:\S+$/i
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/
const TIME_RE = /^(\d{2}):(\d{2})(?::(\d{2}))?$/

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** 真实日历日期校验（含闰年；月份/日范围） */
function isValidDateParts(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return day <= maxDay
}

function isValidTimeParts(hour: number, minute: number, second: number): boolean {
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59
}

/** format 校验（返回 false 表示格式不合法；未知 format 视为通过，由编译层 devWarn） */
export function checkFormat(format: string, value: string): boolean {
  switch (format) {
    case 'email':
      return EMAIL_RE.test(value)
    case 'uri':
      return URI_RE.test(value) || /^https?:\/\/\S+$/i.test(value)
    case 'date': {
      const m = DATE_RE.exec(value)
      if (!m) return false
      return isValidDateParts(Number(m[1]), Number(m[2]), Number(m[3]))
    }
    case 'date-time': {
      const m = DATETIME_RE.exec(value)
      if (!m) return false
      return (
        isValidDateParts(Number(m[1]), Number(m[2]), Number(m[3])) &&
        isValidTimeParts(Number(m[4]), Number(m[5]), Number(m[6] ?? '0'))
      )
    }
    case 'time': {
      const m = TIME_RE.exec(value)
      if (!m) return false
      return isValidTimeParts(Number(m[1]), Number(m[2]), Number(m[3] ?? '0'))
    }
    default:
      return true
  }
}

/** 主类型（多类型取第一个非 null 项；无 type 时按 enum/const 推断） */
function primaryType(schema: JsonSchema): string | null {
  const raw = schema.type
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) {
    const found = raw.find((t) => typeof t === 'string' && t !== 'null')
    return typeof found === 'string' ? found : null
  }
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    const sample = schema.enum.find((v) => v !== null && typeof v !== 'object')
    if (typeof sample === 'boolean') return 'boolean'
    if (typeof sample === 'number') return 'number'
    return 'string'
  }
  if (typeof schema.const === 'boolean') return 'boolean'
  if (typeof schema.const === 'number') return 'number'
  return null
}

/** 空值判据（原始值层面）：`''` / undefined / null / 空数组 / 空容器 JSON（`[]` / `{}`） */
export function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') {
    const text = value.trim()
    // `'{}'`：matrix 等复合控件清空后的值形态（读值层已归一，schema 直接吃原始值时同判据）
    return text === '' || text === '[]' || text === '{}'
  }
  if (Array.isArray(value)) return value.length === 0
  return false
}

/**
 * 只读投影：把 form 内核的字符串值按 schema 类型归一到参与校验/比较的形态。
 * 不可转换时保留原值（交由 type 关键字报错），不抛异常。
 */
export function projectValue(schema: JsonSchema | undefined, raw: unknown): unknown {
  if (!schema) return raw
  if (raw === undefined || raw === null) return undefined
  const type = primaryType(schema)
  if (typeof raw === 'string') {
    const text = raw.trim()
    if (type === 'number' || type === 'integer') {
      if (text === '') return undefined
      const n = Number(text)
      return Number.isNaN(n) ? raw : n
    }
    if (type === 'boolean') {
      if (text === 'true') return true
      if (text === 'false') return false
      if (text === '') return undefined
      return raw
    }
    if (type === 'array' || type === 'object') {
      if (text === '') return type === 'array' ? [] : undefined
      const first = text[0]
      if (first === '[' || first === '{') {
        try {
          return JSON.parse(text)
        } catch {
          return raw
        }
      }
      return type === 'array' ? [] : raw
    }
    return raw
  }
  // 已是结构化值：数组/对象递归投影（数组项按 items 投影）
  if (Array.isArray(raw) && type === 'array') {
    const items = schema.items as JsonSchema | undefined
    return raw.map((item) => projectValue(items, item))
  }
  return raw
}

/**
 * 整树投影：按 properties / items 递归归一（未声明的额外键原样保留）。
 * 供 whenSchema 条件求值与数组级校验使用。
 */
export function projectValues(schema: unknown, values: unknown): unknown {
  if (!isPlainObject(schema)) return values
  const s = schema as JsonSchema
  const type = primaryType(s)
  if (type === 'object' && isPlainObject(values)) {
    const props = isPlainObject(s.properties) ? (s.properties as Record<string, JsonSchema>) : {}
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(values)) {
      out[key] = Object.hasOwn(props, key) ? projectValues(props[key], value) : value
    }
    return out
  }
  if (type === 'array') {
    const raw = typeof values === 'string' ? projectValue(s, values) : values
    if (!Array.isArray(raw)) return raw
    const items = s.items as JsonSchema | undefined
    return raw.map((item) => projectValues(items, item))
  }
  return projectValue(s, values)
}

/** 深比较（仅 JSON 值：原始值 / 数组 / 普通对象） */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => deepEqual(item, b[i]))
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const ak = Object.keys(a)
    const bk = Object.keys(b)
    if (ak.length !== bk.length) return false
    return ak.every((k) => Object.hasOwn(b, k) && deepEqual(a[k], b[k]))
  }
  return false
}

function typeMatches(type: string, value: unknown): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string'
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value)
    case 'boolean':
      return typeof value === 'boolean'
    case 'array':
      return Array.isArray(value)
    case 'object':
      return isPlainObject(value)
    case 'null':
      return value === null
    default:
      return true
  }
}

function joinPath(base: string, key: string): string {
  return base === '' ? key : `${base}.${key}`
}

/**
 * 校验单个值（递归覆盖 properties / items / if-then-else）；返回**第一个**问题（null = 通过）。
 * 空值只由 required 报错，其余关键字跳过（与 JSON Schema 语义一致）。
 */
export function validateValue(schema: unknown, value: unknown, basePath = ''): SchemaIssue | null {
  if (!isPlainObject(schema)) return null
  const s = schema as JsonSchema
  const path = basePath

  if (isEmptyValue(value) && value !== false && value !== 0) return null

  const declared = s.type
  if (declared !== undefined) {
    const types = Array.isArray(declared) ? declared : [declared]
    if (!types.some((t) => typeof t === 'string' && typeMatches(t, value))) {
      return { keyword: 'type', path, messageKey: 'schemaForm.type', params: { type: types.join(' | ') } }
    }
  }

  if (typeof value === 'string') {
    if (typeof s.minLength === 'number' && value.length < s.minLength) {
      return { keyword: 'minLength', path, messageKey: 'schemaForm.minLength', params: { min: s.minLength } }
    }
    if (typeof s.maxLength === 'number' && value.length > s.maxLength) {
      return { keyword: 'maxLength', path, messageKey: 'schemaForm.maxLength', params: { max: s.maxLength } }
    }
    if (typeof s.pattern === 'string') {
      try {
        if (!new RegExp(s.pattern).test(value)) {
          return { keyword: 'pattern', path, messageKey: 'schemaForm.pattern', params: { pattern: s.pattern } }
        }
      } catch {
        // 非法正则由编译层 devWarn，这里视为通过
      }
    }
    if (typeof s.format === 'string' && !checkFormat(s.format, value)) {
      return {
        keyword: 'format',
        path,
        messageKey: `schemaForm.format.${s.format === 'date-time' ? 'dateTime' : s.format}`,
        params: { format: s.format },
      }
    }
  }

  if (Array.isArray(s.enum) && !s.enum.some((item) => deepEqual(item, value))) {
    return { keyword: 'enum', path, messageKey: 'schemaForm.enum' }
  }
  if (s.const !== undefined && !deepEqual(s.const, value)) {
    return { keyword: 'const', path, messageKey: 'schemaForm.const' }
  }

  if (Array.isArray(value)) {
    if (typeof s.minItems === 'number' && value.length < s.minItems) {
      return { keyword: 'minItems', path, messageKey: 'schemaForm.minItems', params: { min: s.minItems } }
    }
    if (typeof s.maxItems === 'number' && value.length > s.maxItems) {
      return { keyword: 'maxItems', path, messageKey: 'schemaForm.maxItems', params: { max: s.maxItems } }
    }
    if (s.uniqueItems === true) {
      const seen: unknown[] = []
      for (const item of value) {
        if (seen.some((prev) => deepEqual(prev, item))) {
          return { keyword: 'uniqueItems', path, messageKey: 'schemaForm.uniqueItems' }
        }
        seen.push(item)
      }
    }
    if (s.items !== undefined) {
      for (let i = 0; i < value.length; i++) {
        const issue = validateValue(s.items, value[i], joinPath(path, String(i)))
        if (issue) return issue
      }
    }
  }

  if (isPlainObject(value)) {
    const props = isPlainObject(s.properties) ? (s.properties as Record<string, JsonSchema>) : {}
    if (Array.isArray(s.required)) {
      for (const key of s.required) {
        if (typeof key !== 'string') continue
        if (!Object.hasOwn(value, key) || isEmptyValue(value[key])) {
          return { keyword: 'required', path: joinPath(path, key), messageKey: 'schemaForm.required' }
        }
      }
    }
    for (const [key, child] of Object.entries(props)) {
      if (!Object.hasOwn(value, key)) continue
      const issue = validateValue(child, value[key], joinPath(path, key))
      if (issue) return issue
    }
  }

  if (s.if !== undefined) {
    const conditionFailed = validateValue(s.if, value, path) !== null
    const branch = conditionFailed ? s.else : s.then
    if (branch !== undefined) {
      const issue = validateValue(branch, value, path)
      if (issue) return issue
    }
  }

  return null
}
