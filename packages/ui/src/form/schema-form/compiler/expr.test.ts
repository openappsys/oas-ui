// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
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

describe('expr 冻结函数库（20 个）', () => {
  it('iif 惰性：未命中的分支不求值（会抛错的宿主函数也不触发）', () => {
    const boom = vi.fn(() => {
      throw new Error('boom')
    })
    const unregister = registerExprFunction('boom', boom)
    try {
      expect(run("iif(true, 'hit', boom())")).toBe('hit')
      expect(run("iif(false, boom(), 'hit')")).toBe('hit')
      expect(run("iif(empty({v}), 'empty', boom())", { v: '' })).toBe('empty')
      expect(boom).not.toHaveBeenCalled()
    } finally {
      unregister()
    }
  })

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
    // 非数组宽容口径（写死固化为测试）：单值按一项累加，非数值项按 0 计
    expect(run('sum(5)')).toBe(5)
    expect(run("sum('abc')")).toBe(0)
    expect(run("sum('5')")).toBe(0)
    expect(run('sum({missing})')).toBe(0)
    expect(run('min(3, 1, 2)')).toBe(1)
    expect(run('max(3, 1, 2)')).toBe(3)
    expect(run('min(2, 5, 1)')).toBe(1)
    expect(run("lower('AbC')")).toBe('abc')
    expect(run("upper('AbC')")).toBe('ABC')
  })

  it('concat：字符串拼接（非字符串参数按字符串宽容转换，null/undefined 为空串）', () => {
    expect(run("concat('a', 'b')")).toBe('ab')
    expect(run("concat('v', 2)")).toBe('v2')
    expect(run("concat('v', true)")).toBe('vtrue')
    expect(run("concat('v', null)")).toBe('v')
    expect(run("concat('v', {n})", { n: 3 })).toBe('v3')
    expect(run("concat('a', 'b', 'c', 'd')")).toBe('abcd')
    expect(compileError('concat()')).toContain('参数个数')
  })

  it('参数个数错误编译报错', () => {
    expect(compileError("iif(true, 'a')")).toContain('参数个数')
    expect(compileError('len()')).toContain('参数个数')
    expect(compileError('min()')).toContain('参数个数')
    expect(compileError("empty('a', 'b')")).toContain('参数个数')
  })

  // ---- V2 扩充的 10 个函数（签名 + 边界）----
  it('join / split：通配数组拼接与按分隔符切分', () => {
    expect(run("join({tags}, ',')", { tags: ['a', 'b'] })).toBe('a,b')
    expect(run("join({nums}, '-')", { nums: [1, 2] })).toBe('1-2')
    // 非数组按单值处理（与 sum 的宽容口径一致）
    expect(run("join('a', ',')")).toBe('a')
    expect(run("join({missing}, ',')")).toBe('')
    expect(run("split('a,b,c', ',')", {})).toEqual(['a', 'b', 'c'])
    // 空串不产生空分段（无分段即空数组）
    expect(run("split('', ',')")).toEqual([])
    expect(run("split('abc', 'b')")).toEqual(['a', 'c'])
    expect(run("len(split('a,b', ','))")).toBe(2)
  })

  it('substring / replace / trim：文本处理边界', () => {
    expect(run("substring('abcdef', 2)")).toBe('cdef')
    expect(run("substring('abcdef', 1, 3)")).toBe('bc')
    expect(run("substring('abc', 5)")).toBe('')
    // 负数按下标 0 截断（substring 语义）
    expect(run("substring('abc', -2, 2)")).toBe('ab')
    expect(run('substring({missing}, 0, 2)')).toBe('')
    // replace 替换全部字面量匹配（非正则）
    expect(run("replace('a-b-c', '-', '/')")).toBe('a/b/c')
    expect(run("replace('abc', '', 'x')")).toBe('abc')
    expect(run("trim('  a b  ')")).toBe('a b')
    expect(run('trim({missing})')).toBe('')
  })

  it('round / abs / floor / ceil：数学边界（非数值得 NaN）', () => {
    expect(run('round(1.4)')).toBe(1)
    expect(run('round(1.5)')).toBe(2)
    expect(run('round(1.2345, 2)')).toBe(1.23)
    expect(run('round(1234, -1)')).toBe(1234) // digits 负值按 0 截断
    expect(run('round(-1.5)')).toBe(-1)
    expect(run('abs(-3)')).toBe(3)
    expect(run('abs(3)')).toBe(3)
    expect(run('floor(1.9)')).toBe(1)
    expect(run('floor(-1.1)')).toBe(-2)
    expect(run('ceil(1.1)')).toBe(2)
    expect(run('ceil(-1.9)')).toBe(-1)
    expect(Number.isNaN(run("abs('a')") as number)).toBe(true)
    expect(Number.isNaN(run('round({missing})') as number)).toBe(true)
  })

  it('formatDate：冻结 token 表 + 本地时区 + 未知 token 原样输出', () => {
    const local = new Date(2026, 10, 24, 9, 5, 7) // 本地时区 2026-11-24 09:05:07
    expect(run('formatDate({ts}, "yyyy-MM-dd")', { ts: local.getTime() })).toBe('2026-11-24')
    expect(run('formatDate({ts}, "HH:mm:ss")', { ts: local.getTime() })).toBe('09:05:07')
    expect(run('formatDate({ts})', { ts: local.getTime() })).toBe('2026-11-24')
    // 未知 token 原样输出（不抛错、不静默吞掉）
    expect(run('formatDate({ts}, "yyyy/MM/dd E")', { ts: local.getTime() })).toBe('2026/11/24 E')
    // 非法输入 → null（与「读不到」同口径，不会得到 Invalid Date 字符串）
    expect(run('formatDate("not-a-date")')).toBeNull()
    expect(run('formatDate({missing})')).toBeNull()
  })

  it('dateAdd：单位冻结 day / hour / minute，未知单位按原值返回', () => {
    const base = new Date(2026, 10, 24, 9, 0, 0).getTime()
    expect(run('dateAdd({ts}, 1, "day")', { ts: base })).toBe(base + 86_400_000)
    expect(run('dateAdd({ts}, -2, "hour")', { ts: base })).toBe(base - 7_200_000)
    expect(run('dateAdd({ts}, 30, "minute")', { ts: base })).toBe(base + 1_800_000)
    expect(run('dateAdd({ts}, 1, "week")', { ts: base })).toBe(base)
    expect(run('dateAdd("not-a-date", 1, "day")')).toBeNull()
  })

  it('dateAdd month：月加减按本地日期数学（保留日期与时分秒）', () => {
    const local = (y: number, m: number, d: number, h = 9, min = 5, s = 7): number =>
      new Date(y, m - 1, d, h, min, s).getTime()
    expect(run('dateAdd({ts}, 1, "month")', { ts: local(2026, 11, 15) })).toBe(local(2026, 12, 15))
    expect(run('dateAdd({ts}, 2, "month")', { ts: local(2026, 11, 15) })).toBe(local(2027, 1, 15))
    expect(run('dateAdd({ts}, -3, "month")', { ts: local(2026, 2, 10) })).toBe(local(2025, 11, 10))
  })

  it('dateAdd month：月末钳制到目标月最后一天（含闰年 2 月）', () => {
    const local = (y: number, m: number, d: number): number => new Date(y, m - 1, d, 12, 0, 0).getTime()
    // 平年：1-31 + 1 月 → 2-28；闰年：1-31 + 1 月 → 2-29
    expect(run('dateAdd({ts}, 1, "month")', { ts: local(2023, 1, 31) })).toBe(local(2023, 2, 28))
    expect(run('dateAdd({ts}, 1, "month")', { ts: local(2024, 1, 31) })).toBe(local(2024, 2, 29))
    // 30 → 31 天长月不钳制；31 → 30 天月钳制；跨年
    expect(run('dateAdd({ts}, 1, "month")', { ts: local(2023, 3, 31) })).toBe(local(2023, 4, 30))
    expect(run('dateAdd({ts}, 1, "month")', { ts: local(2023, 12, 31) })).toBe(local(2024, 1, 31))
    // 负向同样钳制：3-31 减 1 月 → 2-28（平年）/ 2-29（闰年）
    expect(run('dateAdd({ts}, -1, "month")', { ts: local(2023, 3, 31) })).toBe(local(2023, 2, 28))
    expect(run('dateAdd({ts}, -1, "month")', { ts: local(2024, 3, 31) })).toBe(local(2024, 2, 29))
    // month 特有：非整数月按整数截断（day/hour/minute 的加法允许小数乘数，不做截断）
    expect(run('dateAdd({ts}, 1.9, "month")', { ts: local(2023, 1, 15) })).toBe(local(2023, 2, 15))
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
    // now() 是明确不做项（非确定性与 reaction 静态重算模型冲突）
    expect(compileError('now()')).toContain('未知函数')
    expect(compileError('unknownFn("a")')).toContain('未知函数')
    const result = compileExpression('{unknown} == 1', { exists: (path) => path !== 'unknown' })
    expect(result.error).toContain('未知字段')
  })

  it('宿主函数与内置同名：宿主优先（不再被内置静默遮蔽）', () => {
    const restore = registerExprFunction('trim', (...args) => `host:${String(args[0])}`)
    try {
      const result = compileExpression('trim(" x ") == "host: x "')
      expect(result.error).toBeNull()
      expect(result.dynamic, '宿主函数按全量重算').toBe(true)
      expect(evaluateExpression(result.program!, { values: {} })).toBe(true)
    } finally {
      restore()
    }
    // 注销后回落内置实现
    const builtin = compileExpression('trim("  x  ") == "x"')
    expect(evaluateExpression(builtin.program!, { values: {} })).toBe(true)
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
