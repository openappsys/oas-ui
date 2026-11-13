import { describe, it, expect } from 'vitest'
import { rowsRequestPlan, rowsRequestSignature } from './row-model.js'

/**
 * row-model.ts 纯函数单测：请求原因推导（含页码重置规则）与同值去重签名。
 */

const state = (
  over: Partial<{
    current: number
    pageSize: number
    sortModel: Array<{ key: string; order: string }>
    filterValues: Record<string, string | number>
  }> = {},
) => ({
  current: 1,
  pageSize: 10,
  sortModel: [],
  filterValues: {},
  ...over,
})

describe('rowsRequestPlan（请求原因推导）', () => {
  it('无上次请求 → init（不重置页码）', () => {
    expect(rowsRequestPlan(null, state({ current: 3 }))).toEqual({ reason: 'init', resetPage: false })
  })

  it('全同值 → null（不派发）', () => {
    expect(rowsRequestPlan(state(), state())).toEqual({ reason: null, resetPage: false })
  })

  it('排序变化 → sort + 重置页码（即使仅排序变）', () => {
    expect(rowsRequestPlan(state({ sortModel: [] }), state({ sortModel: [{ key: 'a', order: 'asc' }] }))).toEqual({
      reason: 'sort',
      resetPage: true,
    })
    expect(
      rowsRequestPlan(
        state({ sortModel: [{ key: 'a', order: 'asc' }] }),
        state({ sortModel: [{ key: 'a', order: 'desc' }] }),
      ),
    ).toEqual({ reason: 'sort', resetPage: true })
    // multi-sort 数组序敏感：同键同序但换序 → 视为变化
    expect(
      rowsRequestPlan(
        state({
          sortModel: [
            { key: 'a', order: 'asc' },
            { key: 'b', order: 'desc' },
          ],
        }),
        state({
          sortModel: [
            { key: 'b', order: 'desc' },
            { key: 'a', order: 'asc' },
          ],
        }),
      ).reason,
    ).toBe('sort')
  })

  it('过滤变化 → filter + 重置页码', () => {
    expect(rowsRequestPlan(state(), state({ filterValues: { a: '1' } }))).toEqual({ reason: 'filter', resetPage: true })
    expect(rowsRequestPlan(state({ filterValues: { a: '1' } }), state({ filterValues: { a: '2' } })).reason).toBe(
      'filter',
    )
    // 值删除（对象形状变化）同样视为过滤变化
    expect(rowsRequestPlan(state({ filterValues: { a: '1' } }), state()).reason).toBe('filter')
  })

  it('页大小变化 → paginate + 重置页码', () => {
    expect(rowsRequestPlan(state({ current: 3, pageSize: 10 }), state({ current: 3, pageSize: 20 }))).toEqual({
      reason: 'paginate',
      resetPage: true,
    })
  })

  it('仅 current 变化 → 纯翻页 paginate（不重置）', () => {
    expect(rowsRequestPlan(state({ current: 1 }), state({ current: 2 }))).toEqual({
      reason: 'paginate',
      resetPage: false,
    })
  })

  it('排序+页码同时变化（页码重置嵌套触发形态）→ 原因取驱动源 sort', () => {
    expect(
      rowsRequestPlan(state({ current: 2 }), state({ current: 1, sortModel: [{ key: 'a', order: 'asc' }] })).reason,
    ).toBe('sort')
  })
})

describe('rowsRequestSignature（同值去重键）', () => {
  it('全同值签名一致；任一组变化签名不同', () => {
    const a = rowsRequestSignature(state())
    expect(rowsRequestSignature(state())).toBe(a)
    expect(rowsRequestSignature(state({ current: 2 }))).not.toBe(a)
    expect(rowsRequestSignature(state({ pageSize: 20 }))).not.toBe(a)
    expect(rowsRequestSignature(state({ sortModel: [{ key: 'a', order: 'asc' }] }))).not.toBe(a)
    expect(rowsRequestSignature(state({ filterValues: { a: 1 } }))).not.toBe(a)
  })
})
