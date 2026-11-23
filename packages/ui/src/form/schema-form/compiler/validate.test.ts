// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { checkFormat, projectValue, projectValues, validateValue } from './validate.js'
import type { JsonSchema } from './types.js'

describe('只读类型投影（值契约：提交值不变，求值/校验前归一）', () => {
  it('number/integer：数字串 → 数字，避免 "9" > "100" 字符串比较陷阱', () => {
    expect(projectValue({ type: 'number' }, '42')).toBe(42)
    expect(projectValue({ type: 'integer' }, '9')).toBe(9)
    expect(projectValue({ type: 'number' }, '')).toBeUndefined()
    // 不可转换保留原值，交由 type 关键字报错
    expect(projectValue({ type: 'number' }, 'abc')).toBe('abc')
  })

  it('boolean：true/false 串 → 布尔', () => {
    expect(projectValue({ type: 'boolean' }, 'true')).toBe(true)
    expect(projectValue({ type: 'boolean' }, 'false')).toBe(false)
    expect(projectValue({ type: 'boolean' }, '')).toBeUndefined()
  })

  it('array：JSON 串 → 数组，空串 → []；对象数组项递归投影', () => {
    expect(projectValue({ type: 'array' }, '["a","b"]')).toEqual(['a', 'b'])
    expect(projectValue({ type: 'array' }, '')).toEqual([])
    expect(
      projectValues({ type: 'array', items: { type: 'object', properties: { n: { type: 'number' } } } }, [
        { n: '1' },
        { n: '2' },
      ]),
    ).toEqual([{ n: 1 }, { n: 2 }])
  })

  it('按 properties 递归投影整树（未声明键原样保留）', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { age: { type: 'number' }, flag: { type: 'boolean' } },
    }
    expect(projectValues(schema, { age: '30', flag: 'true', extra: 'x' })).toEqual({ age: 30, flag: true, extra: 'x' })
  })
})

describe('format 清单（email / uri / date / date-time / time）', () => {
  it.each([
    ['email', 'a@b.co', true],
    ['email', 'a@b', false],
    ['uri', 'https://oas-ui.dev/x', true],
    ['uri', 'not a uri', false],
    ['date', '2026-11-23', true],
    ['date', '2026-02-30', false],
    ['date', '2026/11/23', false],
    ['date-time', '2026-11-23T10:30', true],
    ['date-time', '2026-11-23T10:30:15Z', true],
    ['date-time', '2026-11-23', false],
    ['time', '10:30', true],
    ['time', '10:30:15', true],
    ['time', '25:00', false],
  ])('checkFormat(%s, %s) → %s', (format, value, expected) => {
    expect(checkFormat(format, value)).toBe(expected)
  })
})

describe('迷你 JSON Schema 校验器（V1 关键字全集）', () => {
  it('type 不匹配', () => {
    expect(validateValue({ type: 'number' }, projectValue({ type: 'number' }, 'abc'))?.keyword).toBe('type')
  })

  it('minLength / maxLength / pattern', () => {
    expect(validateValue({ type: 'string', minLength: 3 }, 'ab')?.keyword).toBe('minLength')
    expect(validateValue({ type: 'string', maxLength: 2 }, 'abc')?.keyword).toBe('maxLength')
    expect(validateValue({ type: 'string', pattern: '^\\d+$' }, 'a1')?.keyword).toBe('pattern')
  })

  it('enum / const 深比较（投影后的数字与枚举同型）', () => {
    expect(validateValue({ type: 'number', enum: [1, 2] }, 3)?.keyword).toBe('enum')
    expect(validateValue({ type: 'number', enum: [1, 2] }, 2)).toBeNull()
    expect(validateValue({ const: 'a' }, 'b')?.keyword).toBe('const')
  })

  it('format 失败返回 i18n key（date-time 映射 dateTime 段）', () => {
    const issue = validateValue({ type: 'string', format: 'date-time' }, '2026-11-23')
    expect(issue?.messageKey).toBe('schemaForm.format.dateTime')
  })

  it('数组级：minItems / maxItems / uniqueItems', () => {
    expect(validateValue({ type: 'array', minItems: 2 }, ['a'])?.keyword).toBe('minItems')
    expect(validateValue({ type: 'array', maxItems: 1 }, ['a', 'b'])?.keyword).toBe('maxItems')
    expect(validateValue({ type: 'array', uniqueItems: true }, ['a', 'a'])?.keyword).toBe('uniqueItems')
    expect(validateValue({ type: 'array', uniqueItems: true }, ['a', 'b'])).toBeNull()
  })

  it('对象 required 与 properties 递归（whenSchema 条件即复用同一校验）', () => {
    const schema: JsonSchema = {
      type: 'object',
      required: ['country'],
      properties: { country: { const: 'US' } },
    }
    expect(validateValue(schema, {})?.keyword).toBe('required')
    expect(validateValue(schema, { country: 'CN' })?.keyword).toBe('const')
    expect(validateValue(schema, { country: 'US' })).toBeNull()
  })

  it('if / then / else', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { type: { type: 'string' }, tax: { type: 'string' } },
      if: { properties: { type: { const: 'company' } }, required: ['type'] },
      then: { required: ['tax'], properties: { tax: { minLength: 1 } } },
    }
    expect(validateValue(schema, { type: 'company' })?.keyword).toBe('required')
    expect(validateValue(schema, { type: 'personal' })).toBeNull()
  })

  it('空值跳过其余关键字（只由 required 语义报错）', () => {
    expect(validateValue({ type: 'string', minLength: 5, format: 'email' }, '')).toBeNull()
    expect(validateValue({ type: 'string', format: 'email' }, undefined)).toBeNull()
  })
})
