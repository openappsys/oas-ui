// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { compileExpression, evaluateExpression, registerExprFunction } from './expr.js'
import { parseDslPath } from './path.js'

function run(source: string, values: Record<string, unknown> = {}, self?: unknown): unknown {
  const compiled = compileExpression(source)
  expect(compiled.error, `编译失败：${source} → ${compiled.error}`).toBeNull()
  return evaluateExpression(compiled.program!, { values, self })
}

function ok(source: string, values: Record<string, unknown> = {}): boolean {
  return run(source, values) === true
}

function compileError(source: string): string {
  const result = compileExpression(source)
  expect(result.program, `应当编译失败：${source}`).toBeNull()
  return result.error ?? ''
}

describe('expr 值形式与路径占位', () => {
  it('字符串 / 数字 / 布尔 / null 字面量', () => {
    expect(run("'a'")).toBe('a')
    expect(run('"a"')).toBe('a')
    expect(run('42')).toBe(42)
    expect(run('4.5')).toBe(4.5)
    expect(run('true')).toBe(true)
    expect(run('null')).toBeNull()
  })

  it('{path} 读取表单根路径（点号 + 下标写法等价）', () => {
    const values = { users: [{ name: 'A' }, { name: 'B' }] }
    expect(run('{users[0].name}', values)).toBe('A')
    expect(run('{users.1.name}', values)).toBe('B')
    expect(run('{missing}', values)).toBeUndefined()
  })

  it('通配路径返回匹配值数组（即便只命中一项）', () => {
    const values = { users: [{ name: 'A' }, { name: 'B' }] }
    expect(run('{users[].name}', values)).toEqual(['A', 'B'])
    expect(run('{users[].name}', { users: [{ name: 'A' }] })).toEqual(['A'])
    expect(run('{users[].name}', { users: [] })).toEqual([])
    expect(run('len({users[].name})', values)).toBe(2)
  })

  it('$self 读取本字段值；无 self 上下文时编译报错', () => {
    expect(compileError('$self == 3')).toContain('$self')
    const compiled = compileExpression('$self == 3', { self: 'age' })
    expect(compiled.error).toBeNull()
    expect(compiled.deps).toEqual(['age'])
    expect(evaluateExpression(compiled.program!, { values: { age: 3 }, self: 3 })).toBe(true)
  })

  it('路径非法 / 保留键段编译报错', () => {
    expect(compileError('{} == 1')).toContain('路径占位')
    expect(compileError('{__proto__.x} == 1')).toContain('路径占位')
    expect(compileError('{ } == 1')).toContain('路径占位')
  })

  it('路径占位校验与编译层 parseDslPath 同判据（语料对照）', () => {
    const corpus = [
      'a',
      'users[0].name',
      'users.0.name',
      'users[].name',
      'users[  ].name',
      'matrix.{index}.x',
      '',
      ' ',
      '$self',
      '__proto__.x',
      'a..b',
      'a[',
      '[0].a',
      'a.b.0',
      'users[00].x',
    ]
    for (const path of corpus) {
      const expected = parseDslPath(path) !== null
      const compiled = compileExpression(`{${path}} == 1`)
      expect(compiled.error === null, `路径 "${path}" 应与 parseDslPath 同判`).toBe(expected)
    }
  })
})

describe('expr 比较 / 逻辑 / 算术', () => {
  it('两侧同为数字按数值比（避开 "9" > "100" 陷阱）', () => {
    expect(ok('9 > 100')).toBe(false)
    expect(ok('{age} >= 18', { age: 20 })).toBe(true)
    expect(ok('{age} == 20', { age: 20 })).toBe(true)
    expect(ok('{age} != 20', { age: 20 })).toBe(false)
  })

  it('非数字按字符串比（字典序，写死）', () => {
    expect(ok("'b' > 'a'")).toBe(true)
    expect(ok("'9' > '100'")).toBe(true)
    expect(ok("{code} <= 'B'", { code: 'A' })).toBe(true)
    // 数字与字符串混用退化为字符串比较（'9' vs '100' 按字典序 → true）
    expect(ok('9 > "100"')).toBe(true)
  })

  it('逻辑短路 + 括号 + 取反优先级', () => {
    expect(ok('true || {missing} == 1')).toBe(true)
    expect(ok('false && {missing} == 1')).toBe(false)
    expect(ok('!false && (1 < 2 || false)')).toBe(true)
    expect(ok('!(1 > 2)')).toBe(true)
    expect(ok('1 + 2 * 3 == 7')).toBe(true)
    expect(ok('(1 + 2) * 3 == 9')).toBe(true)
  })

  it('算术仅数值：字符串参与得 NaN（不隐式拼接）', () => {
    expect(run('1 + 2')).toBe(3)
    expect(run('7 % 4')).toBe(3)
    expect(run('10 / 4')).toBe(2.5)
    expect(Number.isNaN(run("'a' + 1") as number)).toBe(true)
    expect(ok('{name} + 1 == 2', { name: '1' })).toBe(false)
  })

  it('成员：in / contains()', () => {
    expect(ok("'b' in {tags}", { tags: ['a', 'b'] })).toBe(true)
    expect(ok("'z' in {tags}", { tags: ['a', 'b'] })).toBe(false)
    expect(ok("'ell' in {word}", { word: 'hello' })).toBe(true)
    expect(ok('contains({tags}, "b")', { tags: ['a', 'b'] })).toBe(true)
    expect(ok('contains({word}, "he")', { word: 'hello' })).toBe(true)
    expect(ok('contains({map}, "k")', { map: { k: 1 } })).toBe(true)
  })
})

describe('expr 冻结函数库（8 个）', () => {
  it('iif 惰性分支 / empty / len', () => {
    expect(run("iif(true, 'a', 'b')")).toBe('a')
    expect(run("iif(false, 'a', 'b')")).toBe('b')
    expect(ok('iif({x} == 1, true, {x} == 2)')).toBe(false)
    expect(ok('empty({v})', { v: '' })).toBe(true)
    expect(ok('empty({v})', { v: [] })).toBe(true)
    expect(ok('empty({v})', { v: {} })).toBe(true)
    expect(ok('empty({v})', { v: 'x' })).toBe(false)
    expect(run('len({list})', { list: [1, 2, 3] })).toBe(3)
    expect(run("len('abcd')")).toBe(4)
    expect(run('len({obj})', { obj: { a: 1, b: 2 } })).toBe(2)
  })

  it('sum / min / max / lower / upper', () => {
    expect(run('sum({nums})', { nums: [1, 2, 3] })).toBe(6)
    expect(run('sum({items[].price})', { items: [{ price: 2 }, { price: 3 }] })).toBe(5)
    expect(run('min(3, 1, 2)')).toBe(1)
    expect(run('max(3, 1, 2)')).toBe(3)
    expect(run('min(2, 5, 1)')).toBe(1)
    expect(run("lower('AbC')")).toBe('abc')
    expect(run("upper('AbC')")).toBe('ABC')
  })

  it('参数个数错误编译报错', () => {
    expect(compileError("iif(true, 'a')")).toContain('参数个数')
    expect(compileError('len()')).toContain('参数个数')
    expect(compileError('min()')).toContain('参数个数')
    expect(compileError("empty('a', 'b')")).toContain('参数个数')
  })
})

describe('expr 排除项一律编译期报错', () => {
  it('赋值 / 语句 / 循环 / 箭头 / 模板串 / 正则 / 属性访问链', () => {
    expect(compileError('a = 1')).toContain('赋值')
    expect(compileError('var a = 1')).toContain('赋值')
    expect(compileError('while (true)')).toContain('未知函数')
    expect(compileError('true ? 1 : 2')).toContain('三元')
    expect(compileError('x => x')).toContain('赋值')
    expect(compileError('`a`')).toContain('模板串')
    expect(compileError('/ab/.test(1)')).toContain('属性访问链')
    expect(compileError('{a}.b == 1')).toContain('属性访问链')
    expect(compileError('a.b == 1')).toContain('属性访问链')
    expect(compileError("'a'; 'b'")).toContain('语句分隔符')
  })

  it('未知函数 / 未知字段（提供存在性校验时）报错', () => {
    expect(compileError('now()')).toContain('未知函数')
    expect(compileError('concat("a", "b")')).toContain('未知函数')
    const result = compileExpression('{unknown} == 1', { exists: (path) => path !== 'unknown' })
    expect(result.error).toContain('未知字段')
  })

  it('语法错（未闭合 / 多余内容 / 缺括号）报错', () => {
    expect(compileError("'a' ==")).toContain('不完整')
    expect(compileError('(1 + 2')).toContain('缺少')
    expect(compileError('1 2')).toContain('多余')
    expect(compileError('')).toContain('为空')
    expect(compileError("'abc")).toContain('未闭合')
  })
})

describe('expr 依赖提取与宿主函数', () => {
  it('静态依赖去重且含通配路径', () => {
    const result = compileExpression("({users[].name} == 'A' && {plan} == 'pro') || {users[0].name} == 'X'")
    expect(result.error).toBeNull()
    expect(result.dynamic).toBe(false)
    expect(result.deps.sort()).toEqual(['plan', 'users.0.name', 'users.[].name'])
  })

  it('宿主函数：注册后可编译，按全量重算标记', () => {
    const unregister = registerExprFunction('upperCamel', (value) => {
      const text = String(value ?? '')
      return text.charAt(0).toUpperCase() + text.slice(1)
    })
    try {
      const compiled = compileExpression("upperCamel({name}) == 'Alice'")
      expect(compiled.error).toBeNull()
      expect(compiled.dynamic).toBe(true)
      expect(evaluateExpression(compiled.program!, { values: { name: 'alice' } })).toBe(true)
    } finally {
      unregister()
    }
    expect(compileExpression('upperCamel({name}) == 1').error).toContain('未知函数')
  })
})
