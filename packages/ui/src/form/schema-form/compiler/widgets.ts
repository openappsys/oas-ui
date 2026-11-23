/**
 * 默认 widget 映射表（V1 冻结）+ UI 注解覆盖。
 *
 * 映射：`string`→oas-input；`string`+format→oas-input(type) / oas-date-picker / oas-time-picker；
 * `number|integer`→oas-input-number；`boolean`→oas-switch；`enum`→oas-select；
 * `array of enum`→oas-checkbox-group；`object`→分组容器；`array of object`→oas-form-list。
 * 未知 widget / 未知 format 一律 devWarn（不静默失效），回落默认映射。
 */
import type { JsonSchema, WidgetSpec } from './types.js'
import { FORMATS } from './validate.js'
import { getCustomWidget } from './custom-widgets.js'

/** 允许经 uiSchema `widget` 指定的控件（内部必须走 FORM_CONTROLS 才能被值收集） */
export const KNOWN_WIDGETS = new Set([
  'oas-input',
  'oas-input-number',
  'oas-select',
  'oas-switch',
  'oas-checkbox-group',
  'oas-date-picker',
  'oas-time-picker',
  'oas-textarea',
  'oas-radio-group',
  'oas-slider',
  'oas-rate',
  'oas-pin-input',
])

/** 透传给控件的展示态属性白名单（避免把任意键写进 DOM） */
const PROP_ALLOWLIST = new Set([
  'placeholder',
  'disabled',
  'readonly',
  'clearable',
  'rows',
  'step',
  'min',
  'max',
  'precision',
  'format',
  'size',
  'maxlength',
  'direction',
  'searchable',
  'multiple',
])

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function toStringProps(options: unknown, warnings: string[], path: string): Record<string, string> {
  const props: Record<string, string> = {}
  if (!isPlainObject(options)) return props
  for (const [key, value] of Object.entries(options)) {
    if (key === 'options' || key === 'className' || key === 'style') continue
    if (!PROP_ALLOWLIST.has(key)) {
      warnings.push(`uiSchema.options 未知键 "${key}" 已忽略（${path || '(root)'}）`)
      continue
    }
    if (value === undefined || value === null) continue
    props[key] = typeof value === 'string' ? value : String(value)
  }
  return props
}

/** enum / const → oas-select 选项 JSON */
function enumOptions(schema: JsonSchema): string | null {
  const values = Array.isArray(schema.enum) ? schema.enum : schema.const !== undefined ? [schema.const] : null
  if (!values) return null
  const options = values
    .filter((v) => v === null || typeof v !== 'object')
    .map((v) => ({ label: String(v), value: String(v) }))
  return options.length > 0 ? JSON.stringify(options) : null
}

/** 数据类型判定（多类型取第一个非 null） */
export function schemaType(schema: JsonSchema): string | null {
  const raw = schema.type
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) {
    const found = raw.find((t) => typeof t === 'string' && t !== 'null')
    return typeof found === 'string' ? found : null
  }
  if (Array.isArray(schema.enum)) return 'string'
  if (typeof schema.const === 'boolean') return 'boolean'
  if (typeof schema.const === 'number') return 'number'
  return null
}

/** 数组项是否为对象（对象数组走 form-list，其余数组走单控件） */
export function isObjectArray(schema: JsonSchema): boolean {
  if (schemaType(schema) !== 'array') return false
  const items = schema.items
  return isPlainObject(items) && schemaType(items as JsonSchema) === 'object'
}

/**
 * 解析字段控件：返回 widget 规格（tag + 透传属性）；`object` / 对象数组返回 null（由计划层建容器）。
 */
export function resolveWidget(
  schema: JsonSchema,
  ui: { widget?: unknown; options?: unknown },
  path: string,
  warnings: string[],
): WidgetSpec | null {
  const type = schemaType(schema)
  const props = toStringProps(ui.options, warnings, path)

  const custom = ui.widget
  if (typeof custom === 'string' && custom !== '') {
    if (!KNOWN_WIDGETS.has(custom)) {
      const registered = getCustomWidget(custom)
      if (registered) return { tag: registered.tag, props }
      warnings.push(
        `uiSchema.widget "${custom}" 不在内置控件表内，也未通过 registerSchemaWidget 注册，回落到默认映射（${path || '(root)'}）`,
      )
    } else {
      return { tag: custom, props }
    }
  }

  if (type === 'object') return null
  if (type === 'array' && isObjectArray(schema)) return null

  // enum → select / array of enum → checkbox-group
  if (type === 'array') {
    const items = schema.items
    if (isPlainObject(items) && Array.isArray((items as JsonSchema).enum)) {
      const options = enumOptions(items as JsonSchema)
      if (options) props.options = options
      return { tag: 'oas-checkbox-group', props }
    }
    warnings.push(
      `数组形态未覆盖默认映射（仅 array of enum / array of object），按 JSON 文本输入渲染（${path || '(root)'}）`,
    )
    return { tag: 'oas-input', props }
  }
  if (Array.isArray(schema.enum) || schema.const !== undefined) {
    const options = enumOptions(schema)
    if (options) props.options = options
    return { tag: 'oas-select', props }
  }

  if (type === 'number' || type === 'integer') {
    if (type === 'integer' && props.step === undefined) props.step = '1'
    return { tag: 'oas-input-number', props }
  }
  if (type === 'boolean') return { tag: 'oas-switch', props }

  if (type === 'string' && typeof schema.format === 'string') {
    const format = schema.format
    if (!(FORMATS as readonly string[]).includes(format)) {
      warnings.push(
        `schema.format "${format}" 不在 V1 冻结清单（${FORMATS.join(' / ')}），按普通文本渲染（${path || '(root)'}）`,
      )
      return { tag: 'oas-input', props }
    }
    if (format === 'date') return { tag: 'oas-date-picker', props }
    if (format === 'time') return { tag: 'oas-time-picker', props }
    if (format === 'date-time') return { tag: 'oas-date-picker', props: { ...props, type: 'datetime' } }
    if (format === 'email') return { tag: 'oas-input', props: { ...props, type: 'email' } }
    if (format === 'uri') return { tag: 'oas-input', props: { ...props, type: 'url' } }
  }

  return { tag: 'oas-input', props }
}
