import { describe, expect, it } from 'vitest'
import { applyQuery, createQueryState } from './index.js'

type Order = {
  id: number
  customer: string
  amount: number
  city?: string | null
  tags?: string[]
  meta?: { level: number }
}

const ORDERS: Order[] = [
  { id: 1, customer: 'Alice', amount: 120, city: 'Beijing', tags: ['vip'], meta: { level: 3 } },
  { id: 2, customer: 'bob', amount: 80, city: 'Shanghai', tags: ['new'], meta: { level: 1 } },
  { id: 3, customer: 'Carol', amount: 200, city: null, tags: [], meta: { level: 2 } },
  { id: 4, customer: 'dave', amount: 80, city: '', meta: { level: 2 } },
  { id: 5, customer: 'Eve', amount: null as unknown as number, city: 'Beijing', meta: { level: 1 } },
]

const ids = (rows: readonly { id: number }[]): number[] => rows.map((row) => row.id)

describe('table/query applyQuery 过滤', () => {
  it('eq 文本默认不区分大小写', () => {
    const result = applyQuery(ORDERS, {
      filter: { combinator: 'and', filters: [{ field: 'customer', op: 'eq', value: 'alice' }] },
    })
    expect(ids(result)).toEqual([1])
  })

  it('eq 可开启 caseSensitive', () => {
    const result = applyQuery(ORDERS, {
      filter: {
        combinator: 'and',
        filters: [{ field: 'customer', op: 'eq', value: 'alice', caseSensitive: true }],
      },
    })
    expect(result).toEqual([])
  })

  it('neq 是 eq 的取反', () => {
    const result = applyQuery(ORDERS, {
      filter: { combinator: 'and', filters: [{ field: 'customer', op: 'neq', value: 'Alice' }] },
    })
    expect(ids(result)).toEqual([2, 3, 4, 5])
  })

  it('contains / startsWith / endsWith 文本匹配', () => {
    const has = (op: 'contains' | 'startsWith' | 'endsWith', value: string): number[] =>
      ids(
        applyQuery(ORDERS, {
          filter: { combinator: 'and', filters: [{ field: 'customer', op, value }] },
        }),
      )
    expect(has('contains', 'ar')).toEqual([3])
    expect(has('startsWith', 'a')).toEqual([1])
    expect(has('endsWith', 'E')).toEqual([1, 4, 5])
  })

  it('gt / gte / lt / lte 按数值比较', () => {
    const pick = (op: 'gt' | 'gte' | 'lt' | 'lte', value: number): number[] =>
      ids(
        applyQuery(ORDERS, {
          filter: { combinator: 'and', filters: [{ field: 'amount', op, value }] },
        }),
      )
    expect(pick('gt', 120)).toEqual([3])
    expect(pick('gte', 120)).toEqual([1, 3])
    expect(pick('lt', 80)).toEqual([])
    expect(pick('lte', 80)).toEqual([2, 4])
  })

  it('in / between / empty / notEmpty', () => {
    const one = (node: Record<string, unknown>): number[] =>
      ids(applyQuery(ORDERS, { filter: { combinator: 'and', filters: [node as never] } }))
    expect(one({ field: 'id', op: 'in', value: [2, 4] })).toEqual([2, 4])
    expect(one({ field: 'amount', op: 'between', value: [80, 120] })).toEqual([1, 2, 4])
    expect(one({ field: 'city', op: 'empty' })).toEqual([3, 4])
    expect(one({ field: 'city', op: 'notEmpty' })).toEqual([1, 2, 5])
  })

  it('in / contains 对数组字段按任一元素命中', () => {
    const result = applyQuery(ORDERS, {
      filter: { combinator: 'and', filters: [{ field: 'tags', op: 'in', value: ['vip'] }] },
    })
    expect(ids(result)).toEqual([1])
  })

  it('and / or 组合与任意嵌套', () => {
    const result = applyQuery(ORDERS, {
      filter: {
        combinator: 'and',
        filters: [
          { field: 'amount', op: 'gte', value: 80 },
          {
            combinator: 'or',
            filters: [
              { field: 'city', op: 'eq', value: 'Beijing' },
              { field: 'customer', op: 'startsWith', value: 'C' },
            ],
          },
        ],
      },
    })
    expect(ids(result)).toEqual([1, 3])
  })

  it('空 group 语义：and → true，or → false', () => {
    expect(ids(applyQuery(ORDERS, { filter: { combinator: 'and', filters: [] } }))).toEqual([1, 2, 3, 4, 5])
    expect(ids(applyQuery(ORDERS, { filter: { combinator: 'or', filters: [] } }))).toEqual([])
  })

  it('未知算子不命中任何行', () => {
    const result = applyQuery(ORDERS, {
      filter: { combinator: 'and', filters: [{ field: 'id', op: 'like' as never, value: '1' }] },
    })
    expect(result).toEqual([])
  })

  it('支持点号嵌套字段', () => {
    const result = applyQuery(ORDERS, {
      filter: { combinator: 'and', filters: [{ field: 'meta.level', op: 'gte', value: 2 }] },
    })
    expect(ids(result)).toEqual([1, 3, 4])
  })
})

describe('table/query applyQuery 排序与分页', () => {
  it('按字段升降序排序，空值恒排末尾', () => {
    const asc = applyQuery(ORDERS, { sort: [{ field: 'amount', dir: 'asc' }] })
    expect(ids(asc)).toEqual([2, 4, 1, 3, 5])
    const desc = applyQuery(ORDERS, { sort: [{ field: 'amount', dir: 'desc' }] })
    expect(ids(desc)).toEqual([3, 1, 2, 4, 5])
  })

  it('多键排序与稳定排序（等值保持原顺序）', () => {
    const result = applyQuery(ORDERS, {
      sort: [
        { field: 'amount', dir: 'asc' },
        { field: 'id', dir: 'desc' },
      ],
    })
    expect(ids(result)).toEqual([4, 2, 1, 3, 5])
  })

  it('filter → sort → page 顺序，且 page 越界返回空数组', () => {
    const query = {
      filter: { combinator: 'and' as const, filters: [{ field: 'amount', op: 'gte' as const, value: 80 }] },
      sort: [{ field: 'amount', dir: 'desc' as const }],
      page: { current: 2, pageSize: 2 },
    }
    expect(ids(applyQuery(ORDERS, query))).toEqual([2, 4])
    expect(applyQuery(ORDERS, { ...query, page: { current: 9, pageSize: 2 } })).toEqual([])
  })

  it('page 非法时不分页：current < 1 取 1、pageSize <= 0 忽略', () => {
    expect(ids(applyQuery(ORDERS, { page: { current: 0, pageSize: 2 } }))).toEqual([1, 2])
    expect(ids(applyQuery(ORDERS, { page: { current: 1, pageSize: 0 } }))).toEqual([1, 2, 3, 4, 5])
    expect(ids(applyQuery(ORDERS, { page: { current: 1, pageSize: -3 } }))).toEqual([1, 2, 3, 4, 5])
  })

  it('不修改输入数组与原顺序', () => {
    const before = ORDERS.map((row) => row.id)
    const result = applyQuery(ORDERS, {
      sort: [{ field: 'amount', dir: 'desc' }],
      page: { current: 1, pageSize: 2 },
    })
    expect(result).not.toBe(ORDERS)
    expect(ORDERS.map((row) => row.id)).toEqual(before)
  })

  it('无 query 时返回全部行的新数组', () => {
    const result = applyQuery(ORDERS, {})
    expect(ids(result)).toEqual([1, 2, 3, 4, 5])
    expect(result).not.toBe(ORDERS)
  })
})

describe('table/query createQueryState', () => {
  it('默认值为空过滤、空排序、无分页', () => {
    const state = createQueryState()
    expect(state.filter).toBeNull()
    expect(state.sort).toEqual([])
    expect(state.page).toBeNull()
    expect(state.query).toEqual({ filter: null, sort: [], page: null })
  })

  it('初始化接受初始 query', () => {
    const state = createQueryState({
      filter: { combinator: 'and', filters: [{ field: 'id', op: 'in', value: [1, 2] }] },
      sort: [{ field: 'id', dir: 'desc' }],
      page: { current: 2, pageSize: 1 },
    })
    expect(ids(applyQuery(ORDERS, state.query))).toEqual([1])
  })

  it('setFilter / addSort / setPage 返回新对象且旧状态不变', () => {
    const base = createQueryState()
    const filtered = base.setFilter({ combinator: 'and', filters: [{ field: 'amount', op: 'gte', value: 80 }] })
    expect(filtered).not.toBe(base)
    expect(base.filter).toBeNull()
    expect(ids(applyQuery(ORDERS, filtered.query))).toEqual([1, 2, 3, 4])

    const sorted = filtered.addSort('amount', 'desc')
    expect(sorted).not.toBe(filtered)
    expect(filtered.sort).toEqual([])
    expect(ids(applyQuery(ORDERS, sorted.query))).toEqual([3, 1, 2, 4])

    const paged = sorted.setPage({ current: 2, pageSize: 2 })
    expect(paged).not.toBe(sorted)
    expect(sorted.page).toBeNull()
    expect(ids(applyQuery(ORDERS, paged.query))).toEqual([2, 4])
  })

  it('addSort 维护键序并替换同字段方向', () => {
    const state = createQueryState().addSort('customer', 'asc').addSort('amount', 'desc').addSort('customer', 'desc')
    expect(state.sort).toEqual([
      { field: 'amount', dir: 'desc' },
      { field: 'customer', dir: 'desc' },
    ])
  })

  it('setPage 局部更新与清空', () => {
    const state = createQueryState().setPage({ pageSize: 2 })
    expect(state.page).toEqual({ current: 1, pageSize: 2 })
    expect(state.setPage({ current: 3 }).page).toEqual({ current: 3, pageSize: 2 })
    expect(state.setPage(null).page).toBeNull()
  })

  it('query 是聚合快照，可直接喂给 applyQuery', () => {
    const state = createQueryState({
      sort: [{ field: 'id', dir: 'desc' }],
      page: { current: 1, pageSize: 2 },
    })
    expect(ids(applyQuery(ORDERS, state.query))).toEqual([5, 4])
    state.setPage({ current: 2 })
    expect(ids(applyQuery(ORDERS, state.query))).toEqual([5, 4])
  })
})
