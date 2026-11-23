// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { resolveSchemaRefs } from './refs.js'

describe('$ref 编译期急切展开', () => {
  it('展开 #/$defs 与 #/definitions 两种写法', () => {
    const result = resolveSchemaRefs({
      type: 'object',
      $defs: { name: { type: 'string', title: '姓名' }, age: { type: 'integer' } },
      definitions: { mail: { type: 'string', format: 'email' } },
      properties: {
        a: { $ref: '#/$defs/name' },
        b: { $ref: '#/$defs/age' },
        c: { $ref: '#/definitions/mail' },
      },
    })
    expect(result.errors).toEqual([])
    const props = (result.schema!.properties ?? {}) as Record<string, Record<string, unknown>>
    expect(props.a).toEqual({ type: 'string', title: '姓名' })
    expect(props.b).toEqual({ type: 'integer' })
    expect(props.c).toEqual({ type: 'string', format: 'email' })
  })

  it('支持 JSON Pointer 嵌套键', () => {
    const result = resolveSchemaRefs({
      $defs: { address: { properties: { city: { type: 'string', minLength: 2 } } } },
      type: 'object',
      properties: { city: { $ref: '#/$defs/address/properties/city' } },
    })
    expect(result.errors).toEqual([])
    expect((result.schema!.properties as Record<string, unknown>).city).toEqual({ type: 'string', minLength: 2 })
  })

  it('循环 $ref 编译期报错', () => {
    const result = resolveSchemaRefs({
      $defs: { node: { type: 'object', properties: { child: { $ref: '#/$defs/node' } } } },
      type: 'object',
      properties: { root: { $ref: '#/$defs/node' } },
    })
    expect(result.schema).toBeNull()
    expect(result.errors.join()).toContain('循环 $ref')
  })

  it('$ref 兄弟键仅 title/description/default 允许并存，其余告警且不覆盖目标', () => {
    const result = resolveSchemaRefs({
      $defs: { text: { type: 'string', minLength: 1 } },
      type: 'object',
      properties: {
        a: { $ref: '#/$defs/text', title: '覆盖标题', minLength: 5 },
      },
    })
    expect(result.warnings.join()).toContain('兄弟键 "minLength"')
    expect((result.schema!.properties as Record<string, unknown>).a).toEqual({
      type: 'string',
      minLength: 1,
      title: '覆盖标题',
    })
  })

  it('远程 $ref 与缺失目标报错', () => {
    const remote = resolveSchemaRefs({ type: 'object', properties: { a: { $ref: 'https://x/y.json' } } })
    expect(remote.errors.join()).toContain('不支持远程 $ref')
    const missing = resolveSchemaRefs({ type: 'object', properties: { a: { $ref: '#/$defs/none' } } })
    expect(missing.errors.join()).toContain('$ref 目标不存在')
  })

  it('深度上限只计 $ref 链：普通深层嵌套不误判为循环引用', () => {
    // 100 层普通嵌套（properties 链）：旧实现按「每次递归 +1」计数，会被误判成 $ref 循环
    type Node = { type: string; title?: string; properties?: Record<string, Node> }
    let deep: Node = { type: 'string', title: '叶子' }
    for (let i = 0; i < 100; i++) deep = { type: 'object', properties: { [`l${i}`]: deep } }
    const nested = resolveSchemaRefs({ type: 'object', properties: { root: deep } })
    expect(nested.errors, '普通嵌套不得报 $ref 层级/循环错误').toEqual([])
    expect(nested.schema).not.toBeNull()

    // $ref 链本身仍然受深度约束：链式引用 65 层（无环）必须报层级超限
    const defs: Record<string, unknown> = {}
    for (let i = 0; i < 70; i++) {
      defs[`r${i}`] = i === 69 ? { type: 'string' } : { $ref: `#/$defs/r${i + 1}` }
    }
    const chained = resolveSchemaRefs({ $defs: defs, type: 'object', properties: { a: { $ref: '#/$defs/r0' } } })
    expect(chained.schema).toBeNull()
    expect(chained.errors.join()).toContain('$ref 展开层级超过')
  })
})
