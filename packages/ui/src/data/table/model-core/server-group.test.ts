// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { partitionServerGroupRows, groupAggregateValue } from './server-group.js'
import { visibleFlat } from './index.js'
import type { FlatRow } from './types.js'

/**
 * server 分组协议纯函数单测（批 B：服务端分组/聚合）。
 *
 * 协议：row-model="server" 形态下 group-by 在场 = 宿主分组——宿主返回的行可为两类，
 * 以行内保留字段 kind 标记：
 * - 分组行 `{ kind:'group', groupKey, groupLabel?, groupCount?, depth?, aggregates? }`
 * - 数据行（无 kind 或 kind:'data'）
 * 组件按宿主数组顺序渲染（不在组件内分组/排序）；折叠在已装载行内本地过滤。
 *
 * 运行环境 = node：零 DOM 依赖的机制验证。
 */

type Row = Record<string, unknown>

describe('partitionServerGroupRows（混合行分区）', () => {
  it('混合行按 kind 分离：组行 → FlatRow(kind=group)，数据行 → FlatRow(kind=data)，宿主顺序保持', () => {
    const rows: Row[] = [
      { kind: 'group', groupKey: '研发', groupCount: 2 },
      { kind: 'data', key: 'a', name: '张三' },
      { key: 'b', name: '李四' }, // 无 kind = 数据行
      { kind: 'group', groupKey: '销售', groupCount: 1 },
      { key: 'c', name: '王五' },
    ]
    const r = partitionServerGroupRows(rows)
    expect(r.flat.map((f) => f.kind)).toEqual(['group', 'data', 'data', 'group', 'data'])
    expect(r.flat.map((f) => f.row)).toEqual([
      {},
      { kind: 'data', key: 'a', name: '张三' },
      { key: 'b', name: '李四' },
      {},
      { key: 'c', name: '王五' },
    ])
    expect(r.dataRows).toEqual([
      { kind: 'data', key: 'a', name: '张三' },
      { key: 'b', name: '李四' },
      { key: 'c', name: '王五' },
    ])
    expect(r.invalidGroupRows).toBe(0)
  })

  it('组行字段映射：groupLabel 缺省回落 groupKey，groupCount / aggregates 透传', () => {
    const rows: Row[] = [
      { kind: 'group', groupKey: '研发', groupCount: 3, aggregates: { amount: 120 } },
      { kind: 'group', groupKey: '销售' }, // label/count 缺省
    ]
    const r = partitionServerGroupRows(rows)
    expect(r.flat[0]).toMatchObject({
      kind: 'group',
      groupKey: '研发',
      groupLabel: '研发',
      groupCount: 3,
      aggregates: { amount: 120 },
    })
    expect(r.flat[1]).toMatchObject({ kind: 'group', groupKey: '销售', groupLabel: '销售', groupCount: undefined })
    expect(r.flat[1]!.aggregates).toBeUndefined()
  })

  it('depth：缺省 0；非正数 / 非有限数回落 0；小数向下取整', () => {
    const rows: Row[] = [
      { kind: 'group', groupKey: 'a' },
      { kind: 'group', groupKey: 'b', depth: 2 },
      { kind: 'group', groupKey: 'c', depth: -1 },
      { kind: 'group', groupKey: 'd', depth: Number.NaN },
      { kind: 'group', groupKey: 'e', depth: Number.POSITIVE_INFINITY },
      { kind: 'group', groupKey: 'f', depth: 1.9 },
    ]
    const r = partitionServerGroupRows(rows)
    expect(r.flat.map((f) => f.depth)).toEqual([0, 2, 0, 0, 0, 1])
  })

  it('depth 钳制：病态大值（1e6）钳到上限 20（防超大缩进 padding）', () => {
    const rows: Row[] = [
      { kind: 'group', groupKey: 'a', depth: 1e6 },
      { kind: 'group', groupKey: 'b', depth: 20 },
      { kind: 'group', groupKey: 'c', depth: 21 },
    ]
    const r = partitionServerGroupRows(rows)
    expect(r.flat.map((f) => f.depth)).toEqual([20, 20, 20])
  })

  it('groupCount 归一化：NaN / 负数 / 非数值 → 未提供（组件侧缺省不显示计数）', () => {
    const rows: Row[] = [
      { kind: 'group', groupKey: 'a', groupCount: Number.NaN },
      { kind: 'group', groupKey: 'b', groupCount: -3 },
      { kind: 'group', groupKey: 'c', groupCount: '12' },
      { kind: 'group', groupKey: 'd', groupCount: 0 },
      { kind: 'group', groupKey: 'e', groupCount: 5 },
    ]
    const r = partitionServerGroupRows(rows)
    expect(r.flat.map((f) => f.groupCount)).toEqual([undefined, undefined, undefined, 0, 5])
  })

  it('groupKey 校验：缺失 / 非字符串 / 空串的 kind:"group" 行降级按数据行渲染（数据不丢，不再剔除）+ 计数', () => {
    const rows: Row[] = [
      { kind: 'group', groupCount: 1 }, // 缺 groupKey
      { kind: 'group', groupKey: 42 }, // 非字符串
      { kind: 'group', groupKey: '' }, // 空串
      { key: 'a', name: '张三' },
      { kind: 'group', groupKey: '研发' }, // 有效
    ]
    const r = partitionServerGroupRows(rows)
    expect(r.invalidGroupRows).toBe(3)
    // 契约加固：无效组行降级为数据行渲染（旧行为剔除丢行），kind 为协议保留字段由壳层 devWarn 提示
    expect(r.flat.map((f) => f.kind)).toEqual(['data', 'data', 'data', 'data', 'group'])
    expect(r.dataRows).toEqual([
      { kind: 'group', groupCount: 1 },
      { kind: 'group', groupKey: 42 },
      { kind: 'group', groupKey: '' },
      { key: 'a', name: '张三' },
    ])
  })

  it('aggregates 非对象（数组 / 字符串 / null）→ 视为未提供', () => {
    const rows: Row[] = [
      { kind: 'group', groupKey: 'a', aggregates: [1, 2] },
      { kind: 'group', groupKey: 'b', aggregates: 'nope' },
      { kind: 'group', groupKey: 'c', aggregates: null },
    ]
    const r = partitionServerGroupRows(rows)
    expect(r.flat.every((f) => f.aggregates === undefined)).toBe(true)
  })

  it('空数组 → 空 flat / 空 dataRows / 零 invalid', () => {
    const r = partitionServerGroupRows([])
    expect(r.flat).toEqual([])
    expect(r.dataRows).toEqual([])
    expect(r.invalidGroupRows).toBe(0)
  })

  it('数据行显式 kind:"data" 与 kind:"group" 值之外的 kind（未知值）按数据行处理', () => {
    const rows: Row[] = [
      { kind: 'mystery', key: 'a' },
      { kind: 'data', key: 'b' },
    ]
    const r = partitionServerGroupRows(rows)
    expect(r.flat.every((f) => f.kind === 'data')).toBe(true)
    expect(r.invalidGroupRows).toBe(0)
  })
})

describe('groupAggregateValue（按列 aggregate 取值）', () => {
  const col = (over: { key: string; aggregate?: boolean }) => over

  it('aggregate 配置列取值并字符串化（number / string）', () => {
    expect(groupAggregateValue({ amount: 120, dept: '研发' }, col({ key: 'amount', aggregate: true }))).toBe('120')
    expect(groupAggregateValue({ amount: 120, dept: '研发' }, col({ key: 'dept', aggregate: true }))).toBe('研发')
  })

  it('列未配置 aggregate → null（不渲染）', () => {
    expect(groupAggregateValue({ amount: 120 }, col({ key: 'amount' }))).toBeNull()
  })

  it('配置了 aggregate 但组行未提供该键 → null（格子留空）', () => {
    expect(groupAggregateValue({ other: 1 }, col({ key: 'amount', aggregate: true }))).toBeNull()
  })

  it('aggregates 未提供 → null', () => {
    expect(groupAggregateValue(undefined, col({ key: 'amount', aggregate: true }))).toBeNull()
  })

  it('聚合值非数值/字符串（对象/数组/函数/布尔）→ null 降级空（不渲染 [object Object]）', () => {
    const bad = (v: unknown): Record<string, number | string> => ({ a: v }) as Record<string, number | string>
    expect(groupAggregateValue(bad({ total: 1 }), col({ key: 'a', aggregate: true }))).toBeNull()
    expect(groupAggregateValue(bad([1, 2]), col({ key: 'a', aggregate: true }))).toBeNull()
    expect(
      groupAggregateValue(
        bad((): number => 1),
        col({ key: 'a', aggregate: true }),
      ),
    ).toBeNull()
    expect(groupAggregateValue(bad(true), col({ key: 'a', aggregate: true }))).toBeNull()
    // 数值/字符串照常字符串化（含 0 / 空串）
    expect(groupAggregateValue({ a: 0 }, col({ key: 'a', aggregate: true }))).toBe('0')
    expect(groupAggregateValue({ a: '' }, col({ key: 'a', aggregate: true }))).toBe('')
  })
})

describe('visibleFlat 层级分组折叠（server 分组行 depth 语义）', () => {
  /** server 层级分组 flat 构造（partitionServerGroupRows 的输出形态） */
  const levelFlat = (): FlatRow[] => [
    { row: {}, depth: 0, kind: 'group', groupKey: 'A', groupLabel: 'A' },
    { row: { key: 'a1' }, depth: 0, kind: 'data' },
    { row: {}, depth: 1, kind: 'group', groupKey: 'A/1', groupLabel: 'A/1' },
    { row: { key: 'a11' }, depth: 0, kind: 'data' },
    { row: {}, depth: 0, kind: 'group', groupKey: 'B', groupLabel: 'B' },
    { row: { key: 'b1' }, depth: 0, kind: 'data' },
  ]

  it('全展开（collapsedGroups 空）→ 宿主顺序原样可见', () => {
    expect(visibleFlat(levelFlat(), new Set(), 'key').map((f) => f.row.key ?? f.groupKey)).toEqual([
      'A',
      'a1',
      'A/1',
      'a11',
      'B',
      'b1',
    ])
  })

  it('折叠顶层组 A（depth 0）→ A/1 组行与其组内行一并隐藏（子树语义），B 组不受影响', () => {
    const vis = visibleFlat(levelFlat(), new Set(), 'key', new Set(['A']))
    expect(vis.map((f) => f.row.key ?? f.groupKey)).toEqual(['A', 'B', 'b1'])
  })

  it('折叠子组 A/1（depth 1）→ 仅 A/1 组内行隐藏，A / B 不受影响', () => {
    const vis = visibleFlat(levelFlat(), new Set(), 'key', new Set(['A/1']))
    expect(vis.map((f) => f.row.key ?? f.groupKey)).toEqual(['A', 'a1', 'A/1', 'B', 'b1'])
  })

  it('单层分组（本地分组形态，depth 恒 0）折叠语义与既有行为等价：折叠组只保留分节头行', () => {
    const flat: FlatRow[] = [
      { row: {}, depth: 0, kind: 'group', groupKey: '研发', groupLabel: '研发' },
      { row: { key: 'a' }, depth: 0, kind: 'data' },
      { row: { key: 'b' }, depth: 0, kind: 'data' },
      { row: {}, depth: 0, kind: 'group', groupKey: '销售', groupLabel: '销售' },
      { row: { key: 'c' }, depth: 0, kind: 'data' },
    ]
    const vis = visibleFlat(flat, new Set(), 'key', new Set(['研发']))
    expect(vis.map((f) => f.row.key ?? f.groupKey)).toEqual(['研发', '销售', 'c'])
    // 折叠另一组
    const vis2 = visibleFlat(flat, new Set(), 'key', new Set(['销售']))
    expect(vis2.map((f) => f.row.key ?? f.groupKey)).toEqual(['研发', 'a', 'b', '销售'])
    // 全不折叠
    expect(visibleFlat(flat, new Set(), 'key').length).toBe(5)
  })

  /**
   * 差分固化（交叉审采纳项）：visibleFlat 的层级子树语义在 depth 恒 0 时必须与批前
   * 「折叠组只保留分节头行」参照实现零差异——随机 200 组混合 flat 差分 0 差异
   * （规模缩小避免慢测；固定种子 LCG 保证失败可复现）。
   */
  describe('visibleFlat depth=0 差分固化（层级子树语义 ≡ 批前单层折叠参照实现）', () => {
    /** 参照实现 = 批前本地分组折叠语义内联：数据行属最近的组行，组折叠即隐藏其后续行 */
    const referenceDepth0Collapse = (flat: FlatRow[], collapsed: ReadonlySet<string>): FlatRow[] => {
      const out: FlatRow[] = []
      let groupHidden = false
      for (const f of flat) {
        if (f.kind === 'group') {
          groupHidden = collapsed.has(f.groupKey ?? '')
          out.push(f)
          continue
        }
        if (!groupHidden) out.push(f)
      }
      return out
    }

    it('随机 200 组 depth=0 混合 flat：visibleFlat 与参照实现零差异', () => {
      let seed = 20260915
      const rnd = (): number => {
        seed = (seed * 1664525 + 1013904223) >>> 0
        return seed / 4294967296
      }
      for (let t = 0; t < 200; t++) {
        const flat: FlatRow[] = []
        const keys: string[] = []
        const n = 1 + Math.floor(rnd() * 12)
        for (let i = 0; i < n; i++) {
          if (rnd() < 0.35) {
            const gk = `g${Math.floor(rnd() * 5)}`
            flat.push({ row: {}, depth: 0, kind: 'group', groupKey: gk, groupLabel: gk })
            keys.push(gk)
          } else {
            flat.push({ row: { key: `r${t}-${i}` }, depth: 0, kind: 'data' })
          }
        }
        const collapsed = new Set(keys.filter(() => rnd() < 0.5))
        const actual = visibleFlat(flat, new Set(), 'key', collapsed).map((f) => f.row.key ?? `#${f.groupKey}`)
        const expected = referenceDepth0Collapse(flat, collapsed).map((f) => f.row.key ?? `#${f.groupKey}`)
        expect(actual, `case ${t} 差分（collapsed=${[...collapsed].join(',')}）`).toEqual(expected)
      }
    })
  })
})
