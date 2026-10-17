import { describe, it, expect } from 'vitest'
import { parseJsonArray } from './json-array.js'

describe('parseJsonArray（attribute/property 双通道归一）', () => {
  it('数组原样返回', () => {
    const arr = [{ id: 1 }]
    expect(parseJsonArray(arr)).toBe(arr)
  })

  it('JSON 字符串解析为数组', () => {
    expect(parseJsonArray('[{"id":1},{"id":2}]')).toEqual([{ id: 1 }, { id: 2 }])
    expect(parseJsonArray('["a","b"]')).toEqual(['a', 'b'])
  })

  it('非数组 / 非法 / 空串回落空数组（不抛）', () => {
    expect(parseJsonArray('{"a":1}')).toEqual([])
    expect(parseJsonArray('not json')).toEqual([])
    expect(parseJsonArray('')).toEqual([])
    expect(parseJsonArray('   ')).toEqual([])
    expect(parseJsonArray(null)).toEqual([])
    expect(parseJsonArray(undefined)).toEqual([])
    expect(parseJsonArray(42)).toEqual([])
  })
})
