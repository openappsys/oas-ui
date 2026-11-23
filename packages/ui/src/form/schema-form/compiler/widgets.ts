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
  // 数据驱动的题型控件：`rows` / `columns` / `options` 经 uiSchema 数据通道透传为 JSON attribute
  'oas-matrix',
  'oas-rank',
  // 行内编辑表格：容器级 widget，由计划层建 array 节点（不参与 resolveWidget 的字段映射），
  // 登记在此仅为「已知 widget」口径统一（误用在非对象数组上会告警回落，不静默失效）
  'array-table',
])

/** 透传给控件的展示态属性白名单（避免把任意键写进 DOM） */
const PROP_ALLOWLIST = new Set([
  'placeholder',
  'disabled',
  'readonly',
  'clearable',
  'rows',
  'columns',
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

/**
 * uiSchema.options → 控件 attribute。
 *
 * 同一键在不同控件上语义不同，按值形态而非控件名区分（避免「键名撞车」导致的静默错误）：
 * - `rows`：数组 → JSON（matrix 子问题）；标量 → 原字符串（textarea 行数，既有语义）
 * - `columns`：数组或字符串 → 透传（matrix 列）；仅在目标控件为 matrix / 自定义 widget 时接受
 * - `options`：数组 → JSON（rank 可排序项、自定义 widget 数据）；非数组按原语义跳过（不告警）
 */
function toStringProps(
  options: unknown,
  warnings: string[],
  path: string,
  requestedWidget: string,
): Record<string, string> {
  const props: Record<string, string> = {}
  if (!isPlainObject(options)) return props
  const acceptsColumns = requestedWidget === 'oas-matrix' || getCustomWidget(requestedWidget) !== null
  for (const [key, value] of Object.entries(options)) {
    if (key === 'className' || key === 'style') continue
    if (key === 'options') {
      if (Array.isArray(value)) props.options = JSON.stringify(value)
      continue
    }
    if (!PROP_ALLOWLIST.has(key)) {
      warnings.push(`uiSchema.options 未知键 "${key}" 已忽略（${path || '(root)'}）`)
      continue
    }
    if (value === undefined || value === null) continue
    if (key === 'rows' && Array.isArray(value)) {
      props.rows = JSON.stringify(value)
      continue
    }
    if (key === 'columns') {
      if (!acceptsColumns) {
        warnings.push(`uiSchema.options.columns 仅适用于 oas-matrix 或自定义 widget，已忽略（${path || '(root)'}）`)
        continue
      }
      props.columns = Array.isArray(value) ? JSON.stringify(value) : String(value)
      continue
    }
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
 * `uiSchema.widget` 是否指向可用控件：返回内置控件名或已注册自定义控件的 tag；否则 null。
 *
 * `array-table` 不算覆盖（V2 能力，走默认映射）；计划层用它判断「object 字段是否被
 * widget 覆盖成单控件」——matrix 的值是对象，没有这条通道就只能退化成分组容器。
 */
export function resolveWidgetOverride(widget: unknown): string | null {
  if (typeof widget !== 'string' || widget === '' || widget === 'array-table') return null
  if (KNOWN_WIDGETS.has(widget)) return widget
  return getCustomWidget(widget)?.tag ?? null
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
  const custom = ui.widget
  const requestedWidget = typeof custom === 'string' && custom !== '' ? custom : ''
  const props = toStringProps(ui.options, warnings, path, requestedWidget)

  if (requestedWidget !== '') {
    if (requestedWidget === 'array-table') {
      // 容器级 widget：只有「对象数组」节点能承接（计划层拦截），落到字段上按默认映射渲染
      warnings.push(
        `uiSchema.widget "array-table" 仅适用于对象数组（array of object），已回落默认映射（${path || '(root)'}）`,
      )
    } else if (!KNOWN_WIDGETS.has(requestedWidget)) {
      const registered = getCustomWidget(requestedWidget)
      if (registered) return { tag: registered.tag, props }
      warnings.push(
        `uiSchema.widget "${requestedWidget}" 不在内置控件表内，也未通过 registerSchemaWidget 注册，回落到默认映射（${path || '(root)'}）`,
      )
    } else {
      return { tag: requestedWidget, props }
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
