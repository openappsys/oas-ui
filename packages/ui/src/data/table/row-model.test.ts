import { describe, it, expect } from 'vitest'
import {
  infiniteHasMore,
  infiniteNearBottom,
  isDuplicateAppend,
  parseMaxLoadedRows,
  rowsRequestPlan,
  rowsRequestSignature,
  type RowsRequestReason,
} from './row-model.js'

/**
 * row-model.ts 纯函数单测：请求原因推导（含页码重置规则）、同值去重签名与
 * infinite 判定（触底 / append 去重 / 到底 / 批 G 缓冲上界解析）。
 */

const state = (
  over: Partial<{
    current: number
    pageSize: number
    sortModel: Array<{ key: string; order: string }>
    filterValues: Record<string, string | number>
    groupBy: string
  }> = {},
) => ({
  current: 1,
  pageSize: 10,
  sortModel: [],
  filterValues: {},
  groupBy: '',
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

  it('F10：filter-values 键序不同但语义同值 → 不视为变化（键排序后签名）', () => {
    // 宿主以不同键序写 filter-values（框架序列化顺序不定）属语义同值：不重发、页码不重置
    expect(rowsRequestPlan(state({ filterValues: { a: 1, b: 2 } }), state({ filterValues: { b: 2, a: 1 } }))).toEqual({
      reason: null,
      resetPage: false,
    })
    // 三键乱序同样同值
    expect(
      rowsRequestPlan(state({ filterValues: { a: 1, b: 2, c: 3 } }), state({ filterValues: { c: 3, a: 1, b: 2 } }))
        .reason,
    ).toBeNull()
    // 键序不同且值确实不同 → 仍视为 filter 变化
    expect(
      rowsRequestPlan(state({ filterValues: { a: 1, b: 2 } }), state({ filterValues: { b: 9, a: 1 } })).reason,
    ).toBe('filter')
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

  it('分组键变化 → group + 重置页码（新分组口径首页）', () => {
    expect(rowsRequestPlan(state({ groupBy: '' }), state({ groupBy: 'dept' }))).toEqual({
      reason: 'group',
      resetPage: true,
    })
    expect(rowsRequestPlan(state({ groupBy: 'dept' }), state({ groupBy: 'city' })).reason).toBe('group')
    // 取消分组同样是查询条件变更
    expect(rowsRequestPlan(state({ groupBy: 'dept' }), state({ groupBy: '' }))).toEqual({
      reason: 'group',
      resetPage: true,
    })
    // 同值（含双方缺省）→ 不派发
    expect(rowsRequestPlan(state({ groupBy: 'dept' }), state({ groupBy: 'dept' })).reason).toBeNull()
    expect(rowsRequestPlan(state(), state()).reason).toBeNull()
  })

  it('排序与分组同时变化 → 原因取排序（优先级 sort > filter > group）', () => {
    expect(
      rowsRequestPlan(state({ groupBy: 'a' }), state({ groupBy: 'b', sortModel: [{ key: 'x', order: 'asc' }] })).reason,
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
    expect(rowsRequestSignature(state({ groupBy: 'dept' }))).not.toBe(a)
  })
})

describe('RowsRequestReason 枚举扩展（infinite 批）', () => {
  it("'load-more' 属合法 reason（编译期 + 运行时字面量）", () => {
    const reason: RowsRequestReason = 'load-more'
    expect(reason).toBe('load-more')
  })
  it("'group' 属合法 reason（server 分组批：分组键变更的驱动源）", () => {
    const reason: RowsRequestReason = 'group'
    expect(reason).toBe('group')
  })
})

describe('infiniteNearBottom（触底判定）', () => {
  const probe = (over: Partial<{ scrollTop: number; clientHeight: number; scrollHeight: number }> = {}) => ({
    scrollTop: 0,
    clientHeight: 0,
    scrollHeight: 0,
    ...over,
  })

  it('距底 0（已在底部）→ true', () => {
    expect(infiniteNearBottom(probe({ scrollTop: 300, clientHeight: 300, scrollHeight: 600 }))).toBe(true)
  })

  it('距底 < 200px（clientHeight=0 场景退化为绝对阈值）→ true', () => {
    // happy-dom/早期布局 clientHeight 可能为 0：阈值回落 200px 绝对值
    expect(infiniteNearBottom(probe({ scrollTop: 850, clientHeight: 0, scrollHeight: 1000 }))).toBe(true)
    expect(infiniteNearBottom(probe({ scrollTop: 801, clientHeight: 0, scrollHeight: 1000 }))).toBe(true)
  })

  it('距底恰好等于阈值（边界 <=）→ true', () => {
    // 距底 200 = max(200, 0) → true（含边界）
    expect(infiniteNearBottom(probe({ scrollTop: 800, clientHeight: 0, scrollHeight: 1000 }))).toBe(true)
  })

  it('距底 > 阈值 → false', () => {
    expect(infiniteNearBottom(probe({ scrollTop: 500, clientHeight: 0, scrollHeight: 1000 }))).toBe(false)
  })

  it('可视区高度 1.5 倍阈值生效（大于 200px 绝对值时取更宽松者）', () => {
    // clientHeight=1000 → 阈值 1500；距底 1000 → true（1.5 倍提前量比 200px 宽松）
    expect(infiniteNearBottom(probe({ scrollTop: 0, clientHeight: 1000, scrollHeight: 2000 }))).toBe(true)
    // 距底 1500（恰好边界）→ true
    expect(infiniteNearBottom(probe({ scrollTop: 500, clientHeight: 1000, scrollHeight: 3000 }))).toBe(true)
    // 距底 1501 → false
    expect(infiniteNearBottom(probe({ scrollTop: 499, clientHeight: 1000, scrollHeight: 3000 }))).toBe(false)
    // 距底 3000（远超 1.5 倍阈值）→ false
    expect(infiniteNearBottom(probe({ scrollTop: 0, clientHeight: 1000, scrollHeight: 4000 }))).toBe(false)
  })

  it('距底 200px 判据与 1.5 倍判据取 max（两者都满足其一即可）', () => {
    // clientHeight=100，距底 300：> 200 但 < 150 → 不对，max(200, 150)=200，300 > 200 → false
    expect(infiniteNearBottom(probe({ scrollTop: 0, clientHeight: 100, scrollHeight: 400 }))).toBe(false)
    // clientHeight=100，距底 200：<= 200 → true
    expect(infiniteNearBottom(probe({ scrollTop: 100, clientHeight: 100, scrollHeight: 400 }))).toBe(true)
  })
})

describe('isDuplicateAppend（append 去重）', () => {
  it('requestId 已消费且为真实请求（>=1）→ true（双监听重复回填幂等）', () => {
    expect(isDuplicateAppend(2, 2)).toBe(true)
    expect(isDuplicateAppend(1, 1)).toBe(true)
  })

  it('requestId 未消费（新请求的首次回填）→ false', () => {
    expect(isDuplicateAppend(1, 2)).toBe(false)
    expect(isDuplicateAppend(-1, 1)).toBe(false)
  })

  it('requestId=0（从未派发请求的预填/手动通道）→ 恒 false（不误伤连续多批 append）', () => {
    expect(isDuplicateAppend(0, 0)).toBe(false)
    expect(isDuplicateAppend(2, 0)).toBe(false)
  })
})

describe('infiniteHasMore（到底判定）', () => {
  it('宿主空块信号（hostEnded）优先 → false（即使 totalKnown 且未装满）', () => {
    expect(infiniteHasMore({ hostEnded: true, totalKnown: true, total: 100, loaded: 10 })).toBe(false)
    expect(infiniteHasMore({ hostEnded: true, totalKnown: false, total: 0, loaded: 10 })).toBe(false)
  })

  it('totalKnown 且已装载满 total → false（装满即到底）', () => {
    expect(infiniteHasMore({ hostEnded: false, totalKnown: true, total: 30, loaded: 30 })).toBe(false)
    expect(infiniteHasMore({ hostEnded: false, totalKnown: true, total: 30, loaded: 35 })).toBe(false)
  })

  it('totalKnown 且未装满 → true', () => {
    expect(infiniteHasMore({ hostEnded: false, totalKnown: true, total: 30, loaded: 10 })).toBe(true)
  })

  it('total 未知（totalKnown=false）且未收到空块信号 → true（依赖宿主回写到底）', () => {
    expect(infiniteHasMore({ hostEnded: false, totalKnown: false, total: 0, loaded: 10 })).toBe(true)
  })
})

describe('parseMaxLoadedRows（批 G：infinite 缓冲上界解析）', () => {
  it('合法正整数（含前导空白）→ 上界值', () => {
    expect(parseMaxLoadedRows('1')).toBe(1)
    expect(parseMaxLoadedRows('50')).toBe(50)
    expect(parseMaxLoadedRows(' 200 ')).toBe(200)
  })

  it('非法值（非数 / 小数 / 零 / 负数 / 空串 / Infinity）→ null（无上界，现状行为）', () => {
    expect(parseMaxLoadedRows('')).toBeNull()
    expect(parseMaxLoadedRows('abc')).toBeNull()
    expect(parseMaxLoadedRows('1.5')).toBeNull()
    expect(parseMaxLoadedRows('0')).toBeNull()
    expect(parseMaxLoadedRows('-10')).toBeNull()
    expect(parseMaxLoadedRows('Infinity')).toBeNull()
    expect(parseMaxLoadedRows('NaN')).toBeNull()
  })
})
