// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { isObjectArray, resolveWidget } from './widgets.js'
import type { JsonSchema } from './types.js'

function resolve(schema: JsonSchema, ui: { widget?: unknown; options?: unknown } = {}, warnings: string[] = []) {
  return resolveWidget(schema, ui, 'field', warnings)
}

describe('默认 widget 映射表（V1 冻结）', () => {
  it('string → oas-input；number/integer → oas-input-number；boolean → oas-switch', () => {
    expect(resolve({ type: 'string' })?.tag).toBe('oas-input')
    expect(resolve({ type: 'number' })?.tag).toBe('oas-input-number')
    const integer = resolve({ type: 'integer' })
    expect(integer?.tag).toBe('oas-input-number')
    expect(integer?.props.step).toBe('1')
    expect(resolve({ type: 'boolean' })?.tag).toBe('oas-switch')
  })

  it('string + format：date→date-picker、time→time-picker、date-time→date-picker(type=datetime)、email→input(type=email)、uri→input(type=url)', () => {
    expect(resolve({ type: 'string', format: 'date' })?.tag).toBe('oas-date-picker')
    expect(resolve({ type: 'string', format: 'time' })?.tag).toBe('oas-time-picker')
    const dateTime = resolve({ type: 'string', format: 'date-time' })
    expect(dateTime?.tag).toBe('oas-date-picker')
    expect(dateTime?.props.type).toBe('datetime')
    expect(resolve({ type: 'string', format: 'email' })?.props.type).toBe('email')
    expect(resolve({ type: 'string', format: 'uri' })?.props.type).toBe('url')
  })

  it('enum → oas-select（选项 JSON 派生）；array of enum → oas-checkbox-group', () => {
    const select = resolve({ type: 'string', enum: ['a', 'b'] })
    expect(select?.tag).toBe('oas-select')
    expect(JSON.parse(select!.props.options!)).toEqual([
      { label: 'a', value: 'a' },
      { label: 'b', value: 'b' },
    ])
    const group = resolve({ type: 'array', items: { enum: ['x', 'y'] } })
    expect(group?.tag).toBe('oas-checkbox-group')
    expect(JSON.parse(group!.props.options!)).toHaveLength(2)
  })

  it('object / array of object 不产字段控件（由计划层建容器）', () => {
    expect(resolve({ type: 'object', properties: {} })).toBeNull()
    expect(resolve({ type: 'array', items: { type: 'object', properties: {} } })).toBeNull()
    expect(isObjectArray({ type: 'array', items: { type: 'object' } })).toBe(true)
    expect(isObjectArray({ type: 'array', items: { type: 'string' } })).toBe(false)
  })

  it('uiSchema.widget 覆盖默认映射；未知 widget 告警并回落', () => {
    const warnings: string[] = []
    expect(resolve({ type: 'string' }, { widget: 'oas-textarea' }, warnings)?.tag).toBe('oas-textarea')
    expect(resolve({ type: 'string' }, { widget: 'el-input' }, warnings)?.tag).toBe('oas-input')
    expect(warnings.join()).toContain('不在内置控件表内')
  })

  it('matrix / rank 纳入已知控件表：数据通道（rows / columns / options 数组）透传为 JSON attribute', () => {
    const warnings: string[] = []
    const matrix = resolve(
      { type: 'string' },
      {
        widget: 'oas-matrix',
        options: {
          rows: [{ key: 'speed', label: '响应速度' }],
          columns: [{ key: 'good', label: '好' }],
          disabled: true,
        },
      },
      warnings,
    )
    expect(matrix?.tag).toBe('oas-matrix')
    expect(JSON.parse(matrix!.props.rows!)).toEqual([{ key: 'speed', label: '响应速度' }])
    expect(JSON.parse(matrix!.props.columns!)).toEqual([{ key: 'good', label: '好' }])
    expect(matrix!.props.disabled).toBe('true')

    const rank = resolve(
      { type: 'string' },
      { widget: 'oas-rank', options: { options: [{ key: 'a', label: 'A' }] } },
      warnings,
    )
    expect(rank?.tag).toBe('oas-rank')
    expect(JSON.parse(rank!.props.options!)).toEqual([{ key: 'a', label: 'A' }])
    expect(warnings).toEqual([])
  })

  it('rows 保留 textarea 行数语义；columns 只对 matrix / 自定义 widget 生效', () => {
    const textarea = resolve({ type: 'string' }, { widget: 'oas-textarea', options: { rows: 6 } })
    expect(textarea?.props.rows).toBe('6')
    expect(resolve({ type: 'string' }, { widget: 'oas-textarea', options: { rows: [{ key: 'x' }] } })?.props.rows).toBe(
      '[{"key":"x"}]',
    )

    const warnings: string[] = []
    const input = resolve({ type: 'string' }, { options: { columns: [{ key: 'a' }] } }, warnings)
    expect(input?.tag).toBe('oas-input')
    expect(input?.props.columns).toBeUndefined()
    expect(warnings.join()).toContain('columns 仅适用于 oas-matrix')
  })

  it('options 数据通道：数组透传 JSON，非数组按原语义跳过（不写 attribute、不告警）', () => {
    const warnings: string[] = []
    const widget = resolve({ type: 'string' }, { options: { options: [{ key: 'a' }] } }, warnings)
    expect(JSON.parse(widget!.props.options!)).toEqual([{ key: 'a' }])
    const skipped = resolve({ type: 'string' }, { options: { options: { key: 'a' } } }, warnings)
    expect(skipped!.props.options).toBeUndefined()
    expect(warnings).toEqual([])
  })

  it('未知 format 告警并按普通文本渲染', () => {
    const warnings: string[] = []
    expect(resolve({ type: 'string', format: 'ipv4' }, {}, warnings)?.tag).toBe('oas-input')
    expect(warnings.join()).toContain('不在 V1 冻结清单')
  })

  it('options 只透传白名单键（未知键告警）', () => {
    const warnings: string[] = []
    const widget = resolve(
      { type: 'string' },
      { options: { placeholder: '请输入', onClick: 'x', disabled: true } },
      warnings,
    )
    expect(widget?.props).toEqual({ placeholder: '请输入', disabled: 'true' })
    expect(warnings.join()).toContain('未知键 "onClick"')
  })
})
