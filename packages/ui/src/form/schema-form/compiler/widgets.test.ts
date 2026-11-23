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

  it('matrix / rank 在已知控件表内（值收集走 FORM_CONTROLS，指定时不告警）', () => {
    const warnings: string[] = []
    expect(resolve({ type: 'string' }, { widget: 'oas-matrix' }, warnings)?.tag).toBe('oas-matrix')
    expect(resolve({ type: 'string' }, { widget: 'oas-rank' }, warnings)?.tag).toBe('oas-rank')
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
