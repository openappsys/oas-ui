import { describe, expect, it } from 'vitest'
import {
  compileConditionalFormat,
  compileFormula,
  compileQuery,
  evaluateConditionalFormat,
  filterRows,
  formulaColumn,
  parseTsv,
  pivot,
  pivotTable,
  toTsv,
} from './index.js'

const SALES = [
  { region: '华东', product: 'A', amount: 10 },
  { region: '华东', product: 'A', amount: 20 },
  { region: '华东', product: 'B', amount: 5 },
  { region: '华南', product: 'A', amount: 7 },
  { region: '华南', product: 'B', amount: 3 },
]

describe('pivot / pivotTable', () => {
  it('按行/列分组求和并给出行列合计', () => {
    const result = pivot({ rows: SALES, rowField: 'region', columnField: 'product', valueField: 'amount' })
    expect(result.rowKeys).toEqual(['华东', '华南'])
    expect(result.columnKeys).toEqual(['A', 'B'])
    expect(result.cells['华东']).toEqual({ A: 30, B: 5 })
    expect(result.cells['华南']).toEqual({ A: 7, B: 3 })
    expect(result.rowTotals).toEqual({ 华东: 35, 华南: 10 })
    expect(result.columnTotals).toEqual({ A: 37, B: 8 })
    expect(result.total).toBe(45)
  })

  it('支持 avg / count / min / max', () => {
    expect(
      pivot({ rows: SALES, rowField: 'region', columnField: 'product', valueField: 'amount', aggregate: 'avg' }).cells[
        '华东'
      ],
    ).toEqual({ A: 15, B: 5 })
    expect(
      pivot({ rows: SALES, rowField: 'region', columnField: 'product', aggregate: 'count' }).cells['华东'],
    ).toEqual({ A: 2, B: 1 })
    expect(
      pivot({ rows: SALES, rowField: 'region', columnField: 'product', valueField: 'amount', aggregate: 'min' }).cells[
        '华东'
      ],
    ).toEqual({ A: 10, B: 5 })
    expect(
      pivot({ rows: SALES, rowField: 'region', columnField: 'product', valueField: 'amount', aggregate: 'max' }).cells[
        '华东'
      ],
    ).toEqual({ A: 20, B: 5 })
  })

  it('省略 columnField 时输出单列汇总', () => {
    const result = pivot({ rows: SALES, rowField: 'region', valueField: 'amount' })
    expect(result.columnKeys).toEqual(['__value__'])
    expect(result.cells['华东']).toEqual({ __value__: 35 })
  })

  it('pivotTable 生成可直接喂给 oas-table 的列与数据', () => {
    const table = pivotTable({
      rows: SALES,
      rowField: 'region',
      columnField: 'product',
      valueField: 'amount',
      format: (value) => `¥${value}`,
    })
    expect(table.columns.map((column) => column.key)).toEqual(['__row__', 'pivot:A', 'pivot:B', '__total__'])
    expect(table.columns[0]!.title).toBe('region')
    expect(table.columns[1]!.render!({ 'pivot:A': 30 })).toBe('¥30')
    expect(table.rows[0]).toEqual({ __row__: '华东', 'pivot:A': 30, 'pivot:B': 5, __total__: 35 })
  })

  it('空数据返回空矩阵', () => {
    const result = pivot({ rows: [], rowField: 'region', columnField: 'product', valueField: 'amount' })
    expect(result).toMatchObject({ rowKeys: [], columnKeys: [], total: 0, cells: {}, rowTotals: {}, columnTotals: {} })
  })

  it('空值/null/空串不计入聚合与 count', () => {
    const rows = [
      { region: '华东', product: 'A', amount: 10 },
      { region: '华东', product: 'A', amount: null },
      { region: '华东', product: 'A', amount: '' },
      { region: '华东', product: 'A', amount: undefined },
    ]
    const sum = pivot({ rows, rowField: 'region', columnField: 'product', valueField: 'amount' })
    expect(sum.cells['华东']).toEqual({ A: 10 })
    expect(sum.total).toBe(10)
    const count = pivot({ rows, rowField: 'region', columnField: 'product', valueField: 'amount', aggregate: 'count' })
    expect(count.cells['华东']).toEqual({ A: 1 })
  })

  it('pivotTable 省略 columnField 时只有一列汇总，不重复总列', () => {
    const table = pivotTable({ rows: SALES, rowField: 'region', valueField: 'amount', totalLabel: '金额合计' })
    expect(table.columns.map((column) => column.key)).toEqual(['__row__', 'pivot:__value__'])
    expect(table.columns[1]!.title).toBe('金额合计')
    expect(table.rows[0]).toEqual({ __row__: '华东', 'pivot:__value__': 35 })
  })

  it('__proto__ 作为行/列键不污染原型', () => {
    const result = pivot({
      rows: [
        { region: '__proto__', product: '__proto__', amount: 2 },
        { region: 'normal', product: 'A', amount: 3 },
      ],
      rowField: 'region',
      columnField: 'product',
      valueField: 'amount',
    })
    const protoCell = result.cells['__proto__']!
    expect(protoCell['__proto__']).toBe(2)
    expect(protoCell['A']).toBe(0)
    expect(Object.getPrototypeOf(result.cells)).toBeNull()
    expect(Object.getPrototypeOf(protoCell)).toBeNull()
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
  })
})

describe('formula / formulaColumn', () => {
  it('支持字段、四则运算、括号与幂', () => {
    const evaluate = compileFormula('(price * qty + 5) / 2 - 1')
    expect(evaluate({ price: 10, qty: 3 })).toBe(16.5)
    expect(compileFormula('2 ^ 3 ^ 2')({})).toBe(512)
  })

  it('支持比较、逻辑与 IF', () => {
    const evaluate = compileFormula('IF(amount >= 100 && status == "open", "大单", "普通")')
    expect(evaluate({ amount: 120, status: 'open' })).toBe('大单')
    expect(evaluate({ amount: 20, status: 'open' })).toBe('普通')
  })

  it('支持 ROUND / ABS / MIN / MAX / SUM / CONCAT / COALESCE / LEN', () => {
    expect(compileFormula('ROUND(price * 1.13, 1)')({ price: 10 })).toBe(11.3)
    expect(compileFormula('ABS(0 - 3)')({})).toBe(3)
    expect(compileFormula('MIN(3, 1, 2)')({})).toBe(1)
    expect(compileFormula('MAX(3, 1, 2)')({})).toBe(3)
    expect(compileFormula('SUM(3, 1, 2)')({})).toBe(6)
    expect(compileFormula('CONCAT(name, "-", LEN(name))')({ name: 'abc' })).toBe('abc-3')
    expect(compileFormula('COALESCE(missing, fallback, "x")')({ fallback: 'y' })).toBe('y')
  })

  it('缺字段按空/0 处理，不访问原型链', () => {
    expect(compileFormula('missing + 1')({})).toBe(1)
    expect(compileFormula('constructor')({})).toBeUndefined()
    expect(compileFormula('__proto__')({})).toBeUndefined()
  })

  it('语法错误抛 SyntaxError', () => {
    expect(() => compileFormula('1 +')).toThrow(SyntaxError)
    expect(() => compileFormula('unknown(1)')).toThrow(SyntaxError)
    expect(() => compileFormula('"unclosed')).toThrow(SyntaxError)
    expect(() => compileFormula('a..b')).toThrow(SyntaxError)
    expect(() => compileFormula('a.')).toThrow(SyntaxError)
    expect(() => compileFormula('')).toThrow(SyntaxError)
  })

  it('支持点路径字段', () => {
    expect(compileFormula('user.name')({ user: { name: 'Ann' } })).toBe('Ann')
    expect(compileFormula('user.age + 1')({ user: { age: 20 } })).toBe(21)
  })

  it('formulaColumn 返回格式化后的表格列', () => {
    const column = formulaColumn({
      key: 'total',
      title: '金额',
      expression: 'price * qty',
      format: (value) => `¥${value}`,
    })
    expect(column.render!({ price: 10, qty: 3 })).toBe('¥30')
    expect(column.render!({ price: 0, qty: 0 })).toBe('¥0')
    const nan = formulaColumn({ key: 'nan', title: 'NaN', expression: '(-1) ^ 0.5' })
    expect(nan.render!({})).toBe('')
  })
})

describe('query / filterRows', () => {
  const rows = [
    { name: 'alpha', amount: 10, status: 'open', tags: ['a', 'b'] },
    { name: 'beta', amount: 20, status: 'closed', tags: ['b'] },
    { name: 'gamma', amount: 30, status: 'open', tags: [] },
  ]

  it('支持比较/文本/数组/范围/存在性条件', () => {
    expect(filterRows(rows, { field: 'amount', op: 'gte', value: 20 }).map((row) => row.name)).toEqual([
      'beta',
      'gamma',
    ])
    expect(filterRows(rows, { field: 'name', op: 'contains', value: 'TA' }).map((row) => row.name)).toEqual(['beta'])
    expect(filterRows(rows, { field: 'tags', op: 'contains', value: 'b' }).map((row) => row.name)).toEqual([
      'alpha',
      'beta',
    ])
    expect(filterRows(rows, { field: 'amount', op: 'in', value: [10, 30] }).map((row) => row.name)).toEqual([
      'alpha',
      'gamma',
    ])
    expect(filterRows(rows, { field: 'amount', op: 'between', value: [15, 25] }).map((row) => row.name)).toEqual([
      'beta',
    ])
    expect(filterRows(rows, { field: 'missing', op: 'exists' })).toEqual([])
    expect(filterRows(rows, { field: 'tags', op: 'empty' }).map((row) => row.name)).toEqual(['gamma'])
  })

  it('支持 and/or 任意嵌套', () => {
    const query = {
      logic: 'and' as const,
      conditions: [
        { field: 'status', op: 'eq' as const, value: 'open' },
        {
          logic: 'or' as const,
          conditions: [
            { field: 'amount', op: 'gt' as const, value: 25 },
            { field: 'name', op: 'startsWith' as const, value: 'al' },
          ],
        },
      ],
    }
    expect(filterRows(rows, query).map((row) => row.name)).toEqual(['alpha', 'gamma'])
  })

  it('支持点路径字段与空 group 语义', () => {
    expect(filterRows([{ user: { name: 'Ann' } }], { field: 'user.name', op: 'eq', value: 'ann' })).toHaveLength(1)
    expect(compileQuery({ logic: 'and', conditions: [] })({})).toBe(true)
    expect(compileQuery({ logic: 'or', conditions: [] })({})).toBe(false)
  })
})

describe('toTsv / parseTsv', () => {
  it('导出带表头的 TSV，并清理单元格内制表符/换行', () => {
    expect(
      toTsv(
        [{ name: 'a\tb', note: 'x\ny' }],
        [
          { key: 'name', title: '名称' },
          { key: 'note', title: '备注' },
        ],
      ),
    ).toBe('名称\t备注\na b\tx y')
  })

  it('解析 TSV，忽略末尾空行', () => {
    expect(parseTsv('a\tb\r\nc\td\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
    expect(parseTsv('a\t\tb')).toEqual([['a', '', 'b']])
  })
})

describe('conditional format', () => {
  const rules = [
    { field: 'amount', op: 'gte' as const, value: 20, style: { color: '#b91c1c', className: 'danger' } },
    { field: 'name', op: 'contains' as const, value: 'VIP', style: { backgroundColor: '#fef3c7' } },
    { when: 'amount < 0', style: { fontStyle: 'italic' as const } },
  ]

  it('按字段条件命中首个规则并返回样式', () => {
    const match = evaluateConditionalFormat(rules, { amount: 30, name: 'x' }, 'amount', 30)
    expect(match).toEqual({ style: { color: '#b91c1c', className: 'danger' }, applyTo: 'cell' })
  })

  it('缺省字段时按当前单元格值匹配；支持 notEmpty', () => {
    const cellRules = [
      { op: 'gte' as const, value: 10, style: { color: 'red' } },
      { op: 'notEmpty' as const, style: { color: 'blue' } },
    ]
    const evaluate = compileConditionalFormat(cellRules)
    expect(evaluate({}, 'price', 12)?.style.color).toBe('red')
    expect(evaluate({}, 'price', 5)?.style.color).toBe('blue')
    expect(evaluate({}, 'price', '')?.style.color).toBeUndefined()
  })

  it('when 公式优先；语法错误规则跳过不抛错', () => {
    expect(evaluateConditionalFormat(rules, { amount: -1, name: 'x' }, 'amount', -1)?.style.fontStyle).toBe('italic')
    const broken = compileConditionalFormat([{ when: 'amount +', style: { color: 'red' } }])
    expect(broken({ amount: 1 }, 'amount', 1)).toBeNull()
  })

  it('applyTo=row 透传', () => {
    const match = evaluateConditionalFormat(
      [{ field: 'amount', op: 'gt', value: 0, applyTo: 'row', style: { backgroundColor: '#eee' } }],
      { amount: 1 },
      'amount',
      1,
    )
    expect(match?.applyTo).toBe('row')
  })
})
