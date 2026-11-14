// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  computeRowModel,
  computeDisplayRoots,
  buildFlat,
  visibleFlat,
  parseFilterValues,
  matchesFilters,
  resolveSorts,
  compareRows,
  normalizeExternalTotal,
  normalizePageSize,
  normalizeCurrent,
  pageCountOf,
} from './index.js'

/**
 * 行模型数据层纯函数单测（headless）。
 *
 * 运行环境 = node（`@vitest-environment node`）：零 DOM 依赖的机制验证——
 * 本模块一旦引用 DOM 全局（document / HTMLElement 等）即在此暴露。
 * 测试不 touch DOM：直接喂数据、断言输出。
 */

type Row = Record<string, unknown>

const PEOPLE: Row[] = [
  { name: '张三', age: 30, dept: '研发' },
  { name: '李四', age: 25, dept: '销售' },
  { name: '王五', age: 35, dept: '研发' },
  { name: '赵六', age: 28, dept: '销售' },
  { name: '钱七', age: 22, dept: '市场' },
]

describe('parseFilterValues（filter-values 解析）', () => {
  it('空串 / 缺省 = 无过滤', () => {
    expect(parseFilterValues('')).toEqual({})
    expect(parseFilterValues({})).toEqual({})
  })

  it('非法 JSON / 非对象 = 无过滤（不抛错）', () => {
    expect(parseFilterValues('{oops')).toEqual({})
    expect(parseFilterValues('null')).toEqual({})
    expect(parseFilterValues('42')).toEqual({})
    expect(parseFilterValues('"str"')).toEqual({})
  })

  it("空值跳过（'' / null / undefined），number 保留形态", () => {
    expect(parseFilterValues('{"a":"","b":null,"c":3,"d":"x"}')).toEqual({ c: 3, d: 'x' })
    expect(parseFilterValues({ a: '', b: 0, c: '1' })).toEqual({ b: 0, c: '1' })
  })

  it('其余值 String() 归一化', () => {
    expect(parseFilterValues('{"a":true,"b":[1,2]}')).toEqual({ a: 'true', b: '1,2' })
  })
})

describe('matchesFilters（行匹配）', () => {
  it('缺省匹配 = 字符串严格相等', () => {
    const cols = [{ key: 'name' }, { key: 'age' }]
    expect(matchesFilters({ name: '张三' }, { name: '张三' }, cols)).toBe(true)
    expect(matchesFilters({ name: '张三' }, { name: '张' }, cols)).toBe(false)
    // cell ?? '' 口径：undefined 命中空串过滤
    expect(matchesFilters({}, { name: '' }, cols)).toBe(true)
  })

  it('filterMatch 自定义匹配器生效', () => {
    const cols = [
      {
        key: 'age',
        filterMatch: (cell: unknown, fv: string | number) => Number(cell) >= Number(fv),
      },
    ]
    expect(matchesFilters({ age: 30 }, { age: 28 }, cols)).toBe(true)
    expect(matchesFilters({ age: 25 }, { age: 28 }, cols)).toBe(false)
  })

  it('未知过滤键（无对应叶子列）跳过；多条件全命中才通过', () => {
    const cols = [{ key: 'name' }]
    expect(matchesFilters({ name: '张三' }, { ghost: 'x', name: '张三' }, cols)).toBe(true)
    expect(matchesFilters({ name: '张三' }, { name: '张三', ghost: 'x' }, cols)).toBe(true)
    expect(matchesFilters({ name: '张三' }, { name: '张三', age: '30' }, [{ key: 'age' }])).toBe(false)
  })

  it('多级表头：过滤只作用于叶子列', () => {
    const cols = [{ key: 'grp', children: [{ key: 'name' }] }]
    expect(matchesFilters({ name: '张三' }, { name: '张三' }, cols)).toBe(true)
  })
})

describe('resolveSorts（排序状态解析）', () => {
  it('单列：sort-key + 合法 order', () => {
    expect(resolveSorts({ sortKey: 'age', sortOrder: 'asc', multiSort: '' })).toEqual([{ key: 'age', order: 'asc' }])
    expect(resolveSorts({ sortKey: 'age', sortOrder: 'desc', multiSort: '' })).toEqual([{ key: 'age', order: 'desc' }])
  })

  it('单列：order 非法 / key 缺失 = 无排序', () => {
    expect(resolveSorts({ sortKey: 'age', sortOrder: 'sideways', multiSort: '' })).toEqual([])
    expect(resolveSorts({ sortKey: '', sortOrder: 'asc', multiSort: '' })).toEqual([])
  })

  it('multi-sort 在场优先（合法项过滤，数组顺序 = 优先级）', () => {
    expect(
      resolveSorts({
        sortKey: 'age',
        sortOrder: 'asc',
        multiSort: '[{"key":"a","order":"desc"},{"key":"b","order":"asc"}]',
      }),
    ).toEqual([
      { key: 'a', order: 'desc' },
      { key: 'b', order: 'asc' },
    ])
  })

  it('multi-sort 非法项剔除（order 非法 / key 非字符串 / null 项）', () => {
    expect(
      resolveSorts({
        sortKey: 'age',
        sortOrder: 'asc',
        multiSort: '[{"key":"a","order":"x"},{"key":1},{"key":"b","order":"asc"},null]',
      }),
    ).toEqual([{ key: 'b', order: 'asc' }])
  })

  it('multi-sort 合法 JSON 但非数组 → 空排序（组件口径：不回落单列）', () => {
    expect(resolveSorts({ sortKey: 'age', sortOrder: 'desc', multiSort: '{"key":"a"}' })).toEqual([])
    expect(resolveSorts({ sortKey: 'age', sortOrder: 'desc', multiSort: '[1,2]' })).toEqual([])
  })

  it('multi-sort JSON 解析抛错 → 回落单列', () => {
    expect(resolveSorts({ sortKey: 'age', sortOrder: 'desc', multiSort: '{oops' })).toEqual([
      { key: 'age', order: 'desc' },
    ])
  })
})

describe('compareRows（类型感知比较器）', () => {
  const sorts = [{ key: 'v', order: 'asc' as const }]

  it('无类型：数字按数值、混合按码点', () => {
    const tm = new Map()
    expect(compareRows({ v: 2 }, { v: 10 }, sorts, tm)).toBeLessThan(0)
    expect(compareRows({ v: 'a' }, { v: 'b' }, sorts, tm)).toBeLessThan(0)
    expect(compareRows({ v: 'B' }, { v: 'a' }, sorts, tm)).toBeLessThan(0) // 码点序：大写在前
  })

  it('number 类型列：数字字符串按数值序；非数字回落码点', () => {
    const tm = new Map([['v', 'number' as const]])
    expect(compareRows({ v: '9' }, { v: '10' }, sorts, tm)).toBeLessThan(0)
    expect(compareRows({ v: 'x' }, { v: 'y' }, sorts, tm)).toBeLessThan(0)
    expect(compareRows({ v: null }, { v: 1 }, sorts, tm)).toBeLessThan(0) // NaN 回落码点：'' < '1'
  })

  it('date 类型列：ISO 串按时间序', () => {
    const tm = new Map([['v', 'date' as const]])
    expect(compareRows({ v: '2024-01-01' }, { v: '2024-06-01' }, sorts, tm)).toBeLessThan(0)
  })

  it('desc = 反向（与 asc 严格对称：desc(x,y) === -asc(x,y) 且 asc(x,y) < 0）', () => {
    const tm = new Map()
    const asc = compareRows({ v: 2 }, { v: 10 }, [{ key: 'v', order: 'asc' }], tm)
    expect(asc).toBeLessThan(0)
    // 精确对称恒等式（比较器数学契约）：desc 与 asc 幅度严格相等、符号严格相反
    expect(compareRows({ v: 2 }, { v: 10 }, [{ key: 'v', order: 'desc' }], tm)).toBe(-asc)
  })

  it('多键：先比较首个，相等再比较次个', () => {
    const tm = new Map()
    const multi = [
      { key: 'a', order: 'asc' as const },
      { key: 'b', order: 'desc' as const },
    ]
    // b 列 desc 生效：交换两行（a 保持相等）结果严格取反（反交换性精确断言）
    expect(compareRows({ a: 1, b: 2 }, { a: 1, b: 5 }, multi, tm)).toBe(
      -compareRows({ a: 1, b: 5 }, { a: 1, b: 2 }, multi, tm),
    )
    expect(compareRows({ a: 1, b: 2 }, { a: 1, b: 5 }, multi, tm)).not.toBe(0)
    // a 列优先：a 不相等时 b 不参与（a 决定符号）
    expect(compareRows({ a: 1, b: 5 }, { a: 2, b: 1 }, multi, tm)).toBeLessThan(0)
  })
})

describe('computeDisplayRoots（过滤 + 排序 + 分页切片）', () => {
  it('未开分页：只过滤，不排序不切片', () => {
    const r = computeDisplayRoots({
      data: PEOPLE,
      columns: [{ key: 'dept' }],
      filterValues: { dept: '研发' },
    })
    expect(r.fullRoots.map((x) => x.name)).toEqual(['张三', '王五'])
    expect(r.pageRows).toEqual(r.fullRoots)
    expect(r.total).toBe(2)
    expect(r.paginationOn).toBe(false)
    expect(r.pageCount).toBe(1)
    expect(r.clamped).toBe(false)
  })

  it('内部切片：全局排序后切片当前页', () => {
    const r = computeDisplayRoots({
      data: PEOPLE,
      columns: [{ key: 'age', type: 'number' }],
      sorts: [{ key: 'age', order: 'desc' }],
      pagination: { current: 2, pageSize: 2 },
    })
    // 排序后全量：35, 30, 28, 25, 22
    expect(r.roots.map((x) => x.age)).toEqual([35, 30, 28, 25, 22])
    expect(r.pageRows.map((x) => x.age)).toEqual([28, 25])
    expect(r.total).toBe(5)
    expect(r.pageCount).toBe(3)
    expect(r.clamped).toBe(false)
  })

  it('过滤在排序之前（分页页数反映过滤后数据）', () => {
    const r = computeDisplayRoots({
      data: PEOPLE,
      columns: [{ key: 'dept' }, { key: 'age', type: 'number' }],
      filterValues: { dept: '销售' },
      sorts: [{ key: 'age', order: 'asc' }],
      pagination: { current: 1, pageSize: 10 },
    })
    expect(r.total).toBe(2)
    expect(r.pageRows.map((x) => x.age)).toEqual([25, 28])
    expect(r.pageCount).toBe(1)
  })

  it('外部分页（total 在场）：只排序不切片，total 直通', () => {
    const slice = [PEOPLE[3]!, PEOPLE[1]!]
    const r = computeDisplayRoots({
      data: slice,
      columns: [{ key: 'age', type: 'number' }],
      sorts: [{ key: 'age', order: 'asc' }],
      pagination: { current: 1, pageSize: 2, total: 100 },
    })
    expect(r.pageRows.map((x) => x.age)).toEqual([25, 28])
    expect(r.total).toBe(100)
    expect(r.pageCount).toBe(50)
    expect(r.roots).toEqual(r.pageRows)
  })

  it('server 行模型：过滤/排序整体跳过（data 原样透传）', () => {
    const r = computeDisplayRoots({
      data: PEOPLE,
      filterValues: { dept: '研发' },
      sorts: [{ key: 'age', order: 'asc' }],
      pagination: { current: 1, pageSize: 2, total: 5 },
      serverModel: true,
    })
    expect(r.pageRows.map((x) => x.name)).toEqual(['张三', '李四', '王五', '赵六', '钱七'])
    expect(r.total).toBe(5)
  })

  it('current 超页：只返回建议值（clamped），不写任何状态', () => {
    const input = {
      data: PEOPLE,
      pagination: { current: 99, pageSize: 2 },
    }
    const r = computeDisplayRoots(input)
    expect(r.clamped).toBe(true)
    expect(r.clampedCurrent).toBe(3)
    // 纯函数零副作用：入参原样
    expect(input.pagination!.current).toBe(99)
  })

  it('边界：空数据 / 单行', () => {
    expect(computeDisplayRoots({ data: [] })).toEqual({
      roots: [],
      fullRoots: [],
      pageRows: [],
      total: 0,
      pageSize: 10,
      pageCount: 1,
      clampedCurrent: 1,
      clamped: false,
      paginationOn: false,
    })
    const single = computeDisplayRoots({ data: [PEOPLE[0]!], pagination: { current: 5, pageSize: 10 } })
    expect(single.clamped).toBe(true)
    expect(single.clampedCurrent).toBe(1)
    expect(single.pageRows).toHaveLength(1)
  })

  it('脏入参归一化：pageSize 非法回落 10、current 非法回落 1', () => {
    const r = computeDisplayRoots({ data: PEOPLE, pagination: { current: NaN, pageSize: 0 } })
    expect(r.clampedCurrent).toBe(1)
    expect(r.pageCount).toBe(1)
    expect(normalizePageSize(undefined)).toBe(10)
    expect(normalizePageSize('abc')).toBe(10)
    expect(normalizeCurrent('3')).toBe(3)
    expect(normalizeCurrent(-2)).toBe(1)
  })
})

describe('normalizeExternalTotal（total 属性归一化）', () => {
  it('合法非负数字生效（截断取整）', () => {
    expect(normalizeExternalTotal('100')).toBe(100)
    expect(normalizeExternalTotal(' 42 ')).toBe(42)
    expect(normalizeExternalTotal('7.9')).toBe(7)
    expect(normalizeExternalTotal('0')).toBe(0)
  })
  it('空串 / 非数字 / 负数 / 无穷 = null（内部切片模式）', () => {
    expect(normalizeExternalTotal('')).toBe(null)
    expect(normalizeExternalTotal('abc')).toBe(null)
    expect(normalizeExternalTotal('-1')).toBe(null)
    expect(normalizeExternalTotal('Infinity')).toBe(null)
  })
})

describe('pageCountOf（总页数）', () => {
  it('至少 1 页', () => {
    expect(pageCountOf(0, 10)).toBe(1)
    expect(pageCountOf(1, 10)).toBe(1)
    expect(pageCountOf(11, 10)).toBe(2)
  })
})

describe('buildFlat（分组 + 展平）', () => {
  const TREE: Row[] = [
    {
      key: 'n1',
      name: 'A',
      children: [
        { key: 'n1-1', name: 'A-1' },
        { key: 'n1-2', name: 'A-2' },
      ],
    },
    { key: 'n2', name: 'B' },
  ]

  it('树形递归：子行随父行、depth/parent 正确', () => {
    const flat = buildFlat(TREE, undefined, { rowKey: 'key' })
    expect(flat.map((f) => f.kind)).toEqual(['data', 'data', 'data', 'data'])
    expect(flat.map((f) => f.row.name)).toEqual(['A', 'A-1', 'A-2', 'B'])
    expect(flat[1]).toMatchObject({ depth: 1, parent: 'n1', kind: 'data' })
    expect(flat[3]).toMatchObject({ depth: 0, kind: 'data' })
  })

  it('各层级兄弟间独立排序，不破坏父子结构', () => {
    const flat = buildFlat(TREE, undefined, {
      rowKey: 'key',
      sorts: [{ key: 'name', order: 'desc' }],
    })
    expect(flat.map((f) => f.row.name)).toEqual(['B', 'A', 'A-2', 'A-1'])
  })

  it('分组：分节头前置于组内行，组间按首次出现序，组内独立排序', () => {
    const flat = buildFlat(PEOPLE, [{ key: 'age', type: 'number' }], {
      rowKey: 'key',
      groupBy: 'dept',
      sorts: [{ key: 'age', order: 'asc' }],
    })
    const groups = flat.filter((f) => f.kind === 'group')
    expect(groups.map((g) => g.groupKey)).toEqual(['研发', '销售', '市场'])
    expect(groups.map((g) => g.groupCount)).toEqual([2, 2, 1])
    // 研发组内按 age 升序：张三(30) → 王五(35)
    const idx研发 = flat.findIndex((f) => f.kind === 'group')
    expect(flat[idx研发 + 1]!.row.name).toBe('张三')
    expect(flat[idx研发 + 2]!.row.name).toBe('王五')
  })

  it('空值归入空值组（groupKey=""，文案注入）', () => {
    const rows: Row[] = [{ v: 'x' }, { v: null }, { v: '  ' }, {}]
    const flat = buildFlat(rows, undefined, { rowKey: 'key', groupBy: 'v', groupEmptyLabel: '（空）' })
    const g = flat.find((f) => f.kind === 'group' && f.groupKey === '')
    expect(g).toMatchObject({ groupKey: '', groupLabel: '（空）', groupCount: 3 })
    // 'x' 组独立存在（首次出现序在前）
    expect(flat[0]).toMatchObject({ kind: 'group', groupKey: 'x', groupCount: 1 })
  })

  it('空数据 / 空组字段', () => {
    expect(buildFlat([], undefined, { rowKey: 'key' })).toEqual([])
    const rows: Row[] = [{}]
    const flat = buildFlat(rows, undefined, { rowKey: 'key', groupBy: 'ghost' })
    expect(flat).toHaveLength(2) // 1 个分节头 + 1 行
    expect(flat[0]).toMatchObject({ kind: 'group', groupKey: '', groupCount: 1 })
  })
})

describe('visibleFlat（可见集）', () => {
  const TREE: Row[] = [
    { key: 'n1', name: 'A', expand: '内容A', children: [{ key: 'n1-1', name: 'A-1' }] },
    { key: 'n2', name: 'B', expand: '内容B' },
  ]
  const flat = () => buildFlat(TREE, undefined, { rowKey: 'key' })

  it('全部折叠：只有顶层行', () => {
    expect(visibleFlat(flat(), new Set(), 'key').map((f) => f.row.name)).toEqual(['A', 'B'])
  })

  it('展开父行：子行可见', () => {
    const vis = visibleFlat(flat(), new Set(['n1']), 'key')
    expect(vis.map((f) => f.row.name)).toEqual(['A', 'A-1', 'B'])
  })

  it('有 children 的行展开时优先子树，不叠加 expand 内容行', () => {
    const vis = visibleFlat(flat(), new Set(['n1']), 'key')
    expect(vis.filter((f) => f.kind === 'expand')).toHaveLength(0)
  })

  it('无 children 的行展开时追加 expand 内容行（紧随数据行）', () => {
    // n1 有 children 且已展开 → 子行 A-1 可见；展开 n2 → expand 行紧随 B
    const vis = visibleFlat(flat(), new Set(['n1', 'n2']), 'key')
    expect(vis.map((f) => f.kind)).toEqual(['data', 'data', 'data', 'expand'])
    expect(vis[3]).toMatchObject({ kind: 'expand', expandContent: '内容B', row: TREE[1] })
    // 只展开 n2（n1 折叠：子行 A-1 隐藏）→ A, B, expand(B)
    const vis2 = visibleFlat(flat(), new Set(['n2']), 'key')
    expect(vis2.map((f) => f.kind)).toEqual(['data', 'data', 'expand'])
  })

  it('分组折叠：折叠组只保留分节头行', () => {
    const grouped = buildFlat(PEOPLE, undefined, { rowKey: 'key', groupBy: 'dept' })
    const vis = visibleFlat(grouped, new Set(), 'key', new Set(['销售']))
    const kinds = vis.map((f) => f.kind)
    expect(kinds.filter((k) => k === 'group')).toHaveLength(3)
    const 销售头 = vis.findIndex((f) => f.kind === 'group' && f.groupKey === '销售')
    expect(vis[销售头 + 1]).toMatchObject({ kind: 'group' }) // 折叠组紧随下一个分节头
    expect(vis.some((f) => f.kind === 'data' && f.row.dept === '销售')).toBe(false)
  })
})

describe('computeRowModel（管道入口）', () => {
  it('全管道：过滤 + 排序 + 分页 + 展开可见集一次算齐', () => {
    const data: Row[] = [
      { key: 'a', name: '张三', age: 30, children: [{ key: 'a1', name: '小张' }] },
      { key: 'b', name: '李四', age: 25 },
      { key: 'c', name: '王五', age: 35 },
    ]
    const m = computeRowModel({
      data,
      columns: [{ key: 'age', type: 'number' }],
      sorters: [{ key: 'age', order: 'asc' }],
      filters: { age: '25' },
      pagination: { current: 1, pageSize: 1 },
      rowKey: 'key',
      expanded: new Set(['b']),
    })
    expect(m.total).toBe(1)
    // 过滤 age='25' 后全量只剩 b（过滤先于排序/分页）
    expect(m.roots.map((x) => x.key)).toEqual(['b'])
    expect(m.pageRows.map((x) => x.key)).toEqual(['b'])
    expect(m.pageCount).toBe(1)
    expect(m.flat.map((f) => f.row.name)).toEqual(['李四'])
    // b 无 children 且无 expand 字段：展开不产生内容行
    expect(m.visible.map((f) => f.kind)).toEqual(['data'])
  })

  it('全管道：树形展开 + 分页切片', () => {
    const data: Row[] = [
      { key: 'a', name: '张三', age: 30, expand: '详情A' },
      { key: 'b', name: '李四', age: 25, expand: '详情B' },
      { key: 'c', name: '王五', age: 35 },
    ]
    const m = computeRowModel({
      data,
      columns: [{ key: 'age', type: 'number' }],
      sorters: [{ key: 'age', order: 'asc' }],
      pagination: { current: 1, pageSize: 2 },
      rowKey: 'key',
      expanded: new Set(['a']),
    })
    // 排序后全量：25, 30, 35；切片第 1 页：a(30), b(25)？——asc 升序前 2 = b(25), a(30)
    expect(m.roots.map((x) => x.key)).toEqual(['b', 'a', 'c'])
    expect(m.pageRows.map((x) => x.key)).toEqual(['b', 'a'])
    // a 无 children 且已展开 → expand 行紧随 a（b 在前）
    expect(m.visible.map((f) => f.kind)).toEqual(['data', 'data', 'expand'])
  })

  it('未开分页：pageRows = roots，pageCount = 1', () => {
    const m = computeRowModel({ data: PEOPLE })
    expect(m.pageRows).toEqual(m.roots)
    expect(m.pageCount).toBe(1)
    expect(m.total).toBe(5)
    expect(m.visible.map((f) => f.kind)).toEqual(['data', 'data', 'data', 'data', 'data'])
  })

  it('serverModel：过滤/排序输入作废，data 原样透传', () => {
    const m = computeRowModel({
      data: PEOPLE,
      filters: { dept: '研发' },
      sorters: [{ key: 'age', order: 'asc' }],
      pagination: { current: 1, pageSize: 10, total: 5 },
      serverModel: true,
    })
    expect(m.pageRows.map((x) => x.name)).toEqual(['张三', '李四', '王五', '赵六', '钱七'])
  })

  it('分组 + 折叠建议值不丢（collapsedGroups 透传 visible）', () => {
    const m = computeRowModel({
      data: PEOPLE,
      grouping: { by: 'dept' },
      collapsedGroups: new Set(['市场']),
    })
    expect(m.visible.filter((f) => f.kind === 'group')).toHaveLength(3)
    expect(m.visible.some((f) => f.kind === 'data' && f.row.dept === '市场')).toBe(false)
  })

  it('纯函数：不修改输入 data', () => {
    const data = [...PEOPLE]
    const snapshot = JSON.stringify(data)
    computeRowModel({
      data,
      columns: [{ key: 'age', type: 'number' }],
      sorters: [{ key: 'age', order: 'asc' }],
      pagination: { current: 1, pageSize: 2 },
    })
    expect(JSON.stringify(data)).toBe(snapshot)
  })
})
