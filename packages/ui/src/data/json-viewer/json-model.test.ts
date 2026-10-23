import { describe, expect, it } from 'vitest'
import {
  buildJsonTree,
  collectAncestorPaths,
  encodeJsonPath,
  flattenVisible,
  parseJsonPath,
  searchJson,
  serializeJson,
  serializeValue,
} from './json-model.js'

describe('json-model 路径', () => {
  it('编码：根、对象键、数组索引统一单引号 JSONPath', () => {
    expect(encodeJsonPath([])).toBe('$')
    expect(encodeJsonPath(['a'])).toBe("$['a']")
    expect(encodeJsonPath(['a', 0, 'b'])).toBe("$['a'][0]['b']")
  })

  it('编码：特殊键转义单引号与反斜杠', () => {
    expect(encodeJsonPath(["a'b"])).toBe("$['a\\'b']")
    expect(encodeJsonPath(['a\\b'])).toBe("$['a\\\\b']")
  })

  it('解析：点号简写、单/双引号、数组索引都接受，并能 roundtrip', () => {
    expect(parseJsonPath('$')).toEqual([])
    expect(parseJsonPath('$.a.b')).toEqual(['a', 'b'])
    expect(parseJsonPath("$['a.b'][0]['c']")).toEqual(['a.b', 0, 'c'])
    expect(parseJsonPath('$["a\\"b"]')).toEqual(['a"b'])
    expect(parseJsonPath("$['a\\'b']")).toEqual(["a'b"])
    const segments = ['x.y', 2, "q'z"]
    expect(parseJsonPath(encodeJsonPath(segments))).toEqual(segments)
  })

  it('解析：非法路径返回 null', () => {
    expect(parseJsonPath('a.b')).toBeNull()
    expect(parseJsonPath("$['unterminated")).toBeNull()
    expect(parseJsonPath('$[x]')).toBeNull()
    expect(parseJsonPath('$..a')).toBeNull()
  })

  it('祖先路径：包含根、不含自身', () => {
    expect(collectAncestorPaths("$['a'][0]['b']")).toEqual(['$', "$['a']", "$['a'][0]"])
    expect(collectAncestorPaths('$')).toEqual([])
  })
})

describe('json-model 树与可见行', () => {
  const value = {
    name: '张三',
    age: 30,
    tags: ['a', 'b'],
    nested: { ok: true, nil: null },
  }

  it('构建树：根对象、对象键、数组索引、类型与层级', () => {
    const root = buildJsonTree(value)!
    expect(root.kind).toBe('object')
    expect(root.path).toBe('$')
    expect(root.key).toBeNull()
    expect(root.childCount).toBe(4)
    const name = root.children!.find((n) => n.key === 'name')!
    expect(name.kind).toBe('string')
    expect(name.value).toBe('张三')
    expect(name.path).toBe("$['name']")
    expect(name.depth).toBe(1)
    const tags = root.children!.find((n) => n.key === 'tags')!
    expect(tags.kind).toBe('array')
    expect(tags.children!.map((n) => n.key)).toEqual([0, 1])
    expect(tags.children![0]!.path).toBe("$['tags'][0]")
    expect(tags.children![0]!.depth).toBe(2)
  })

  it('循环引用安全降级为 null，不抛 RangeError', () => {
    const value: Record<string, unknown> = { ok: 1 }
    value.self = value
    const root = buildJsonTree(value)!
    expect(root.children!.find((node) => node.key === 'self')!.value).toBeNull()
  })

  it('非有限数字按 JSON 语义降级 null', () => {
    const root = buildJsonTree({ n: Number.NaN })!
    expect(root.children![0]!.kind).toBe('null')
    expect(root.children![0]!.value).toBeNull()
  })

  it('原始值根也有一行', () => {
    const root = buildJsonTree('hello')!
    expect(root.kind).toBe('string')
    expect(root.path).toBe('$')
    expect(root.childCount).toBe(0)
  })

  it('可见行：默认只展开根；展开指定 path 后子级可见；数组 setsize/posinset', () => {
    const root = buildJsonTree(value)!
    const collapsed = flattenVisible(root, (p) => p === '$')
    expect(collapsed.map((r) => r.node.path)).toEqual(['$', "$['name']", "$['age']", "$['tags']", "$['nested']"])
    const expanded = flattenVisible(root, (p) => p === '$' || p === "$['tags']" || p === "$['nested']")
    expect(expanded.map((r) => r.node.path)).toEqual([
      '$',
      "$['name']",
      "$['age']",
      "$['tags']",
      "$['tags'][0]",
      "$['tags'][1]",
      "$['nested']",
      "$['nested']['ok']",
      "$['nested']['nil']",
    ])
    const firstTag = expanded.find((r) => r.node.path === "$['tags'][0]")!
    expect(firstTag.level).toBe(3)
    expect(firstTag.posinset).toBe(1)
    expect(firstTag.setsize).toBe(2)
    expect(expanded[0]!.level).toBe(1)
  })
})

describe('json-model 搜索与序列化', () => {
  const value = {
    name: '张三',
    city: '上海',
    tags: ['A', 'b', 'a'],
    nested: { note: 'a.b' },
  }

  it('搜索：key 或原始值大小写不敏感，按文档顺序返回 path', () => {
    const root = buildJsonTree(value)!
    expect(searchJson(root, 'a')).toEqual([
      "$['name']",
      "$['tags']",
      "$['tags'][0]",
      "$['tags'][2]",
      "$['nested']['note']",
    ])
    expect(searchJson(root, '上海')).toEqual(["$['city']"])
    expect(searchJson(root, '')).toEqual([])
  })

  it('搜索：容器 key 命中算 1，不扫描容器 JSON 字符串；数组下标不算命中', () => {
    const root = buildJsonTree(value)!
    expect(searchJson(root, 'nested')).toEqual(["$['nested']"])
    expect(searchJson(buildJsonTree([2, 3])!, '1')).toEqual([])
  })

  it('序列化：原始值原文、容器格式化、copyJson 一律 JSON', () => {
    expect(serializeValue('a')).toBe('a')
    expect(serializeValue(1)).toBe('1')
    expect(serializeValue(Number.NaN as unknown as number)).toBe('null')
    expect(serializeValue(null)).toBe('null')
    expect(serializeValue({ a: 1 })).toBe('{\n  "a": 1\n}')
    expect(serializeJson({ a: 1 }, 2)).toBe('{\n  "a": 1\n}')
    expect(serializeJson('a', 2)).toBe('"a"')
  })
})
