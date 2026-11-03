import { describe, expect, it } from 'vitest'
import { pivotMatrix } from './index.js'

const SALES = [
  { region: '华东', product: 'A', amount: 10 },
  { region: '华东', product: 'B', amount: 5 },
  { region: '华北', product: 'A', amount: 7 },
]

describe('table/pivot pivotMatrix', () => {
  it('单行字段 × 单列字段求和：行列头按首次出现顺序', () => {
    const result = pivotMatrix(SALES, {
      rows: ['region'],
      columns: ['product'],
      values: [{ field: 'amount', aggregate: 'sum' }],
    })
    expect(result.rowHeaders).toEqual([['华东'], ['华北']])
    expect(result.columnHeaders).toEqual([
      ['A', 'amount'],
      ['B', 'amount'],
    ])
    expect(result.cells).toEqual([
      [10, 5],
      [7, null],
    ])
    expect(result.valueLabels).toEqual(['amount'])
  })

  it('无数据组合为 null，不写 0', () => {
    const result = pivotMatrix([{ g: 'x', k: 'p', v: 1 }], {
      rows: ['g'],
      columns: ['k'],
      values: [{ field: 'v', aggregate: 'sum' }],
    })
    expect(result.cells).toEqual([[1]])
    const wide = pivotMatrix(
      [
        { g: 'x', k: 'p', v: 1 },
        { g: 'y', k: 'q', v: 2 },
      ],
      { rows: ['g'], columns: ['k'], values: [{ field: 'v', aggregate: 'sum' }] },
    )
    expect(wide.cells).toEqual([
      [1, null],
      [null, 2],
    ])
  })

  it('totals: true 输出合计行 / 合计列 / 全表合计', () => {
    const result = pivotMatrix(SALES, {
      rows: ['region'],
      columns: ['product'],
      values: [{ field: 'amount', aggregate: 'sum' }],
      totals: true,
    })
    expect(result.grandRow).toEqual([17, 5])
    expect(result.grandColumn).toEqual([[15], [7]])
    expect(result.grandTotal).toEqual([22])
  })

  it('第三参 { totals: true } 与 spec.totals 等价；关闭时不返回合计字段', () => {
    const spec = {
      rows: ['region'],
      columns: ['product'],
      values: [{ field: 'amount', aggregate: 'sum' as const }],
    }
    const off = pivotMatrix(SALES, spec)
    expect(off.grandRow).toBeUndefined()
    expect(off.grandColumn).toBeUndefined()
    expect(off.grandTotal).toBeUndefined()

    const on = pivotMatrix(SALES, spec, { totals: true })
    expect(on.grandRow).toEqual([17, 5])
  })

  it('columns 轴为空时退化为单列汇总', () => {
    const result = pivotMatrix(SALES, {
      rows: ['region'],
      values: [{ field: 'amount', aggregate: 'sum' }],
    })
    expect(result.rowHeaders).toEqual([['华东'], ['华北']])
    expect(result.columnHeaders).toEqual([['amount']])
    expect(result.cells).toEqual([[15], [7]])
  })

  it('rows 轴为空时全部数据汇入一个空行头分组', () => {
    const result = pivotMatrix([{ v: 1 }, { v: 2 }], { values: [{ field: 'v', aggregate: 'sum' }] })
    expect(result.rowHeaders).toEqual([[]])
    expect(result.columnHeaders).toEqual([['v']])
    expect(result.cells).toEqual([[3]])
  })

  it('avg 跳过 null / 空串 / 非数值；全无效时为 null', () => {
    const rows = [
      { g: 'a', v: 10 },
      { g: 'a', v: null },
      { g: 'a', v: '' },
      { g: 'a', v: 'oops' },
      { g: 'b', v: null },
      { g: 'b', v: undefined },
    ]
    const result = pivotMatrix(rows, {
      rows: ['g'],
      values: [{ field: 'v', aggregate: 'avg' }],
    })
    expect(result.cells).toEqual([[10], [null]])
  })

  it('count 统计非空值（含非数值字符串），排除 null 与空串', () => {
    const rows = [
      { g: 'a', v: 1 },
      { g: 'a', v: null },
      { g: 'a', v: 'x' },
      { g: 'a', v: '' },
      { g: 'b', v: null },
    ]
    const result = pivotMatrix(rows, {
      rows: ['g'],
      values: [{ field: 'v', aggregate: 'count' }],
    })
    expect(result.cells).toEqual([[2], [null]])
  })

  it('min / max 取有效数值极值', () => {
    const rows = [
      { g: 'a', v: 3 },
      { g: 'a', v: -1 },
      { g: 'a', v: 8 },
      { g: 'b', v: '' },
    ]
    const min = pivotMatrix(rows, { rows: ['g'], values: [{ field: 'v', aggregate: 'min' }] })
    const max = pivotMatrix(rows, { rows: ['g'], values: [{ field: 'v', aggregate: 'max' }] })
    expect(min.cells).toEqual([[-1], [null]])
    expect(max.cells).toEqual([[8], [null]])
  })

  it('多值指标按「列组合 × 指标」展开，列头追加指标层', () => {
    const result = pivotMatrix(SALES, {
      rows: ['region'],
      columns: ['product'],
      values: [
        { field: 'amount', aggregate: 'sum', alias: '合计' },
        { field: 'amount', aggregate: 'count', alias: '笔数' },
      ],
    })
    expect(result.valueLabels).toEqual(['合计', '笔数'])
    expect(result.columnHeaders).toEqual([
      ['A', '合计'],
      ['A', '笔数'],
      ['B', '合计'],
      ['B', '笔数'],
    ])
    expect(result.cells).toEqual([
      [10, 1, 5, 1],
      [7, 1, null, null],
    ])
  })

  it('合计按原始值聚合：avg 的合计不是单元格均值', () => {
    const rows = [
      { g: 'a', v: 10 },
      { g: 'a', v: 20 },
      { g: 'b', v: 30 },
    ]
    const result = pivotMatrix(rows, { rows: ['g'], values: [{ field: 'v', aggregate: 'avg' }], totals: true })
    expect(result.cells).toEqual([[15], [30]])
    expect(result.grandRow).toEqual([20])
  })

  it('count 的合计是计数求和而不是再次计数', () => {
    const rows = [
      { g: 'a', v: 1 },
      { g: 'a', v: 2 },
      { g: 'b', v: 3 },
    ]
    const result = pivotMatrix(rows, {
      rows: ['g'],
      values: [{ field: 'v', aggregate: 'count' }],
      totals: true,
    })
    expect(result.grandRow).toEqual([3])
    expect(result.grandTotal).toEqual([3])
  })

  it('输入不被修改（含冻结行）', () => {
    const rows = [
      Object.freeze({ region: '华东', product: 'A', amount: 3 }),
      Object.freeze({ region: '华北', product: 'B', amount: 4 }),
    ]
    expect(() =>
      pivotMatrix(rows, {
        rows: Object.freeze(['region']) as string[],
        columns: Object.freeze(['product']) as string[],
        values: Object.freeze([Object.freeze({ field: 'amount', aggregate: 'sum' })]) as never,
        totals: true,
      }),
    ).not.toThrow()
    expect(rows).toEqual([
      { region: '华东', product: 'A', amount: 3 },
      { region: '华北', product: 'B', amount: 4 },
    ])
  })

  it('空输入返回空矩阵（仍带指标标签）', () => {
    const result = pivotMatrix([], {
      rows: ['g'],
      columns: ['k'],
      values: [{ field: 'v', aggregate: 'sum' }],
    })
    expect(result.rowHeaders).toEqual([])
    expect(result.columnHeaders).toEqual([])
    expect(result.cells).toEqual([])
    expect(result.valueLabels).toEqual(['v'])
  })

  it('空 values 定义返回空列矩阵', () => {
    const result = pivotMatrix(SALES, { rows: ['region'], columns: ['product'], values: [] })
    expect(result.rowHeaders).toEqual([['华东'], ['华北']])
    expect(result.columnHeaders).toEqual([])
    expect(result.cells).toEqual([[], []])
  })

  it('非法聚合方式 / 空字段名的指标定义被跳过', () => {
    const result = pivotMatrix(SALES, {
      rows: ['region'],
      values: [
        { field: 'amount', aggregate: 'median' as never },
        { field: '', aggregate: 'sum' },
        { field: 'amount', aggregate: 'sum', alias: '有效' },
      ],
    })
    expect(result.valueLabels).toEqual(['有效'])
    expect(result.cells).toEqual([[15], [7]])
  })

  it('支持点号嵌套字段路径', () => {
    const rows = [
      { meta: { region: '华东' }, amount: 2 },
      { meta: { region: '华北' }, amount: 3 },
    ]
    const result = pivotMatrix(rows, {
      rows: ['meta.region'],
      values: [{ field: 'amount', aggregate: 'sum' }],
    })
    expect(result.rowHeaders).toEqual([['华东'], ['华北']])
    expect(result.cells).toEqual([[2], [3]])
  })

  it('缺失字段按空字符串分组', () => {
    const rows = [{ amount: 1 }, { region: null, amount: 2 }]
    const result = pivotMatrix(rows, {
      rows: ['region'],
      values: [{ field: 'amount', aggregate: 'sum' }],
    })
    expect(result.rowHeaders).toEqual([['']])
    expect(result.cells).toEqual([[3]])
  })

  it('多行字段时行头按字段顺序逐层输出', () => {
    const rows = [
      { a: 'x', b: '1', v: 1 },
      { a: 'x', b: '2', v: 2 },
    ]
    const result = pivotMatrix(rows, {
      rows: ['a', 'b'],
      values: [{ field: 'v', aggregate: 'sum' }],
    })
    expect(result.rowHeaders).toEqual([
      ['x', '1'],
      ['x', '2'],
    ])
  })
})
