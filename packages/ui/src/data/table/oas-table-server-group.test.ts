import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from './index.js'

/**
 * server 分组协议批（批 B：服务端分组/聚合）。
 *
 * 协议：`row-model="server"` 形态下 `group-by` 在场 = 宿主分组——
 * - 请求 detail 增加 `groupBy`（当前分组键）；分组键变更派 reason='group' 请求 + 页码重置；
 * - 宿主返回混合行（kind='group' 组行 + 数据行），组件按宿主顺序渲染（不在组件内
 *   分组/排序），复用既有分组行视觉 / depth 缩进 / 展开折叠 / 按列 aggregate 显示；
 * - 折叠在已装载行内本地过滤（collapsedGroups），不触发重取；
 * - infinite 同开禁用（devWarn 一次 + 不发送 groupBy）；windowed 既有禁用不变；
 *   client 本地分组零行为漂移；server 无 group-by 时零变化（detail 不携带 groupBy）。
 */

const COLUMNS = JSON.stringify([
  { key: 'name', title: '名称' },
  { key: 'dept', title: '部门' },
])

/** server 分组混合行（宿主按组回填：组行 + 组内数据行，顺序 = 宿主权威） */
const MIXED_ROWS = JSON.stringify([
  { kind: 'group', groupKey: '研发', groupLabel: '研发', groupCount: 2 },
  { kind: 'data', key: 'a', name: '张三', dept: '研发' },
  { key: 'b', name: '李四', dept: '研发' },
  { kind: 'group', groupKey: '销售', groupLabel: '销售', groupCount: 1 },
  { key: 'c', name: '王五', dept: '销售' },
])

interface Req {
  requestId: number
  reason: string
  groupBy?: string
}

/** mount（监听器先于连接挂上，首帧 init 请求也能捕获） */
function mountReq(attrs: Record<string, string>, data = '[]', columns = COLUMNS): { el: OASTable; reqs: Req[] } {
  const el = new OASTable()
  el.setAttribute('columns', columns)
  el.setAttribute('data', data)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  const reqs: Req[] = []
  el.addEventListener('oas-rows-request', (e: Event) => {
    const d = (e as CustomEvent).detail
    reqs.push({ requestId: d.requestId, reason: d.reason, groupBy: d.groupBy })
  })
  document.body.appendChild(el)
  return { el, reqs }
}

const groupRowsOf = (el: OASTable): HTMLElement[] =>
  [...el.shadowRoot!.querySelectorAll('tr.group-header')] as HTMLElement[]

const dataRowsOf = (el: OASTable): HTMLElement[] =>
  [...el.shadowRoot!.querySelectorAll('[part="row"]')] as HTMLElement[]

/** server 挂载后模拟宿主首载回填（server 挂载即在途 → 内建 loading 行；回填清 loading 出数据） */
function mountGroup(attrs: Record<string, string>, data: string, columns = COLUMNS): { el: OASTable; reqs: Req[] } {
  const r = mountReq(attrs, columns === COLUMNS ? '[]' : data, columns)
  r.el.setAttribute('data', data)
  return r
}

describe('OASTable server 分组协议（批 B）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('server + group-by：请求 detail 携带 groupBy（init 与 group 变更轮），无 group-by 时不携带（零变化）', () => {
    const { el, reqs } = mountReq({ 'row-model': 'server', total: '40', 'group-by': 'dept' })
    expect(reqs.length).toBe(1)
    expect(reqs[0]).toEqual({ requestId: 1, reason: 'init', groupBy: 'dept' })
    // 分组键变更 → reason='group' + detail.groupBy 更新
    el.setAttribute('group-by', 'city')
    expect(reqs.length).toBe(2)
    expect(reqs[1]).toEqual({ requestId: 2, reason: 'group', groupBy: 'city' })
    // 取消分组同样是查询条件变更
    el.removeAttribute('group-by')
    expect(reqs.length).toBe(3)
    expect(reqs[2]).toEqual({ requestId: 3, reason: 'group' })
    expect(reqs[2]!.groupBy).toBeUndefined()
    // 对照：无 group-by 的 server 表 detail 不带 groupBy 键
    const plain = mountReq({ 'row-model': 'server', total: '40' })
    expect(plain.reqs[0]).toEqual({ requestId: 1, reason: 'init' })
    expect('groupBy' in plain.reqs[0]! && plain.reqs[0]!.groupBy !== undefined).toBe(false)
  })

  it('宿主返回混合行：按宿主顺序渲染组行（data-group/label/count）与数据行，组件不本地分组排序', () => {
    const { el } = mountGroup({ 'row-model': 'server', total: '40', 'group-by': 'dept' }, MIXED_ROWS)
    const groups = groupRowsOf(el)
    expect(groups.length).toBe(2)
    expect(groups[0]!.getAttribute('data-group')).toBe('研发')
    expect(groups[0]!.textContent).toContain('研发')
    expect(groups[0]!.textContent).toContain('2')
    expect(groups[1]!.getAttribute('data-group')).toBe('销售')
    // 数据行宿主顺序（组件不重排：张三/李四/王五 依次出现）
    const texts = dataRowsOf(el).map((r) => r.textContent ?? '')
    expect(texts.length).toBe(3)
    expect(texts[0]).toContain('张三')
    expect(texts[1]).toContain('李四')
    expect(texts[2]).toContain('王五')
  })

  it('列 aggregate + 组行 aggregates：组行按列布局，聚合值渲染在对应列（宿主计算，组件不本地聚合）', () => {
    const cols = JSON.stringify([
      { key: 'name', title: '名称' },
      { key: 'amount', title: '金额', aggregate: true, type: 'number' },
    ])
    const rows = JSON.stringify([
      { kind: 'group', groupKey: '研发', groupCount: 2, aggregates: { amount: 120 } },
      { key: 'a', name: '张三', amount: 70 },
      { key: 'b', name: '李四', amount: 50 },
      { kind: 'group', groupKey: '销售', groupCount: 1, aggregates: {} },
      { key: 'c', name: '王五', amount: 30 },
    ])
    const { el } = mountGroup({ 'row-model': 'server', total: '40', 'group-by': 'dept' }, rows, cols)
    const groups = groupRowsOf(el)
    // 组行按列布局：不再整行 colSpan（label 格 colSpan=1）
    const labelTd = groups[0]!.querySelector('td') as HTMLTableCellElement
    expect(labelTd.colSpan).toBe(1)
    expect(labelTd.textContent).toContain('研发')
    // 聚合值在对应列（amount 列）
    const tds = [...groups[0]!.querySelectorAll('td')] as HTMLTableCellElement[]
    expect(tds.length).toBe(2)
    expect(tds[1]!.textContent).toBe('120')
    // 聚合格 data-col + part 与数据行同口径（固定列 sticky / 宿主选择器可命中）
    expect(tds[1]!.getAttribute('data-col')).toBe('amount')
    expect(tds[1]!.getAttribute('part')).toBe('cell')
    // 数值列右对齐（列对齐惯例）
    expect(tds[1]!.className).toContain('align-right')
    // 未提供聚合键的组行：对应格子留空（不渲染 undefined/NaN）
    const tds2 = [...groups[1]!.querySelectorAll('td')] as HTMLTableCellElement[]
    expect(tds2[1]!.textContent).toBe('')
  })

  it('按列聚合 × 可展开行（R1 回归）：label 跨度不计尾部展开列，格子序列与总列数闭合（不右移一列）', () => {
    const cols = JSON.stringify([
      { key: 'name', title: '名称' },
      { key: 'amount', title: '金额', aggregate: true, type: 'number' },
    ])
    const rows = JSON.stringify([
      { kind: 'group', groupKey: '研发', groupCount: 2, aggregates: { amount: 120 } },
      { key: 'a', name: '张三', amount: 70, expand: '<p>明细</p>' },
      { key: 'b', name: '李四', amount: 50 },
    ])
    const { el } = mountGroup({ 'row-model': 'server', total: '40', 'group-by': 'dept' }, rows, cols)
    const group = groupRowsOf(el)[0]!
    const tds = [...group.querySelectorAll('td')] as HTMLTableCellElement[]
    // 格子序列：label 格（无附加列 + name 叶子 → colSpan=1）+ amount 聚合格 + 尾部展开列占位格
    expect(tds.length).toBe(3)
    expect(tds[0]!.colSpan).toBe(1)
    expect(tds[0]!.textContent).toContain('研发')
    expect(tds[1]!.getAttribute('data-col')).toBe('amount')
    expect(tds[1]!.textContent).toBe('120')
    expect(tds[2]!.className).toBe('expand-toggle-cell')
    // colSpan 求和 = 总列数（2 叶子 + 1 尾部展开列）——组行格子几何与数据行同构
    expect(tds.reduce((n, t) => n + t.colSpan, 0)).toBe(3)
    // 对照数据行：同名聚合列 data-col 存在（列位对齐前提）
    const dataAmountTd = dataRowsOf(el)[0]!.querySelector('td[data-col="amount"]')
    expect(dataAmountTd?.getAttribute('data-col')).toBe('amount')
  })

  it('按列聚合 × 勾选列（前导附加列计入 label 跨度）：colSpan 求和仍与总列数闭合', () => {
    const cols = JSON.stringify([
      { key: 'name', title: '名称' },
      { key: 'amount', title: '金额', aggregate: true, type: 'number' },
    ])
    const rows = JSON.stringify([
      { kind: 'group', groupKey: '研发', groupCount: 1, aggregates: { amount: 70 } },
      { key: 'a', name: '张三', amount: 70 },
    ])
    const { el } = mountGroup({ 'row-model': 'server', total: '40', 'group-by': 'dept', checkable: '' }, rows, cols)
    const group = groupRowsOf(el)[0]!
    const tds = [...group.querySelectorAll('td')] as HTMLTableCellElement[]
    // label 格 = 前导勾选列(1) + name 叶子(1) → colSpan=2；其后 amount 聚合格；总列数 = 2 叶子 + 1 勾选 = 3
    expect(tds.length).toBe(2)
    expect(tds[0]!.colSpan).toBe(2)
    expect(tds[1]!.getAttribute('data-col')).toBe('amount')
    expect(tds.reduce((n, t) => n + t.colSpan, 0)).toBe(3)
  })

  it('groupCount 缺省不显示计数（R2 回归）+ 表级按列形态统一（M2：无 aggregates 的组行聚合格留空）', () => {
    const cols = JSON.stringify([
      { key: 'name', title: '名称' },
      { key: 'amount', title: '金额', aggregate: true, type: 'number' },
    ])
    const rows = JSON.stringify([
      { kind: 'group', groupKey: '研发', groupCount: 2, aggregates: { amount: 120 } },
      { key: 'a', name: '张三', amount: 70 },
      { kind: 'group', groupKey: '销售' }, // 无 groupCount / 无 aggregates
      { key: 'b', name: '李四', amount: 50 },
    ])
    const { el } = mountGroup({ 'row-model': 'server', total: '40', 'group-by': 'dept' }, rows, cols)
    const groups = groupRowsOf(el)
    // R2：缺省 groupCount 不创建计数节点（文档承诺「缺省不显示计数」，不渲染 0）
    expect(groups[0]!.querySelector('.group-count')!.textContent).toBe('2')
    expect(groups[1]!.querySelector('.group-count')).toBeNull()
    // M2：表级形态统一——两组行同形（label colSpan 一致，不再全宽/按列并排）
    const l0 = groups[0]!.querySelector('td') as HTMLTableCellElement
    const l1 = groups[1]!.querySelector('td') as HTMLTableCellElement
    expect(l0.colSpan).toBe(1)
    expect(l1.colSpan).toBe(1)
    const tds1 = [...groups[1]!.querySelectorAll('td')] as HTMLTableCellElement[]
    expect(tds1[1]!.getAttribute('data-col')).toBe('amount')
    expect(tds1[1]!.textContent).toBe('')
  })

  it('client 本地分组 + aggregate 列：组行恒全宽形态（表级判定不含 client，零漂移）', () => {
    const cols = JSON.stringify([
      { key: 'name', title: '名称' },
      { key: 'amount', title: '金额', aggregate: true, type: 'number' },
    ])
    const data = JSON.stringify([
      { key: 'a', name: '张三', dept: '研发', amount: 70 },
      { key: 'b', name: '李四', dept: '研发', amount: 50 },
    ])
    const { el } = mountReq({ 'group-by': 'dept' }, data, cols)
    const group = groupRowsOf(el)[0]!
    const tds = [...group.querySelectorAll('td')] as HTMLTableCellElement[]
    expect(tds.length).toBe(1)
    expect(tds[0]!.colSpan).toBe(2)
    expect(group.querySelector('.group-count')!.textContent).toBe('2')
  })

  it('折叠/展开：点组行折叠钮组内行本地隐藏（不重取）；再点恢复', () => {
    const { el, reqs } = mountGroup({ 'row-model': 'server', total: '40', 'group-by': 'dept' }, MIXED_ROWS)
    const before = reqs.length
    const toggle = groupRowsOf(el)[0]!.querySelector('button.toggle') as HTMLButtonElement
    toggle.click()
    // 组内行隐藏（研发组 2 行消失，销售组照常）
    const texts = dataRowsOf(el).map((r) => r.textContent ?? '')
    expect(texts.length).toBe(1)
    expect(texts[0]).toContain('王五')
    // aria-expanded 同步（tbody 重建后重新查询——旧节点已丢弃）
    const toggleAfter = groupRowsOf(el)[0]!.querySelector('button.toggle') as HTMLButtonElement
    expect(toggleAfter.getAttribute('aria-expanded')).toBe('false')
    // 本地过滤不触发重取
    expect(reqs.length).toBe(before)
    // 再点展开恢复
    ;(groupRowsOf(el)[0]!.querySelector('button.toggle') as HTMLButtonElement).click()
    expect(dataRowsOf(el).length).toBe(3)
    expect(reqs.length).toBe(before)
  })

  it('层级分组：折叠顶层组（depth 0）→ 子组行与其组内行一并隐藏；子组行 depth 缩进渲染', () => {
    const rows = JSON.stringify([
      { kind: 'group', groupKey: 'A', groupCount: 1 },
      { kind: 'data', key: 'a1', name: 'A-数据' },
      { kind: 'group', groupKey: 'A/1', groupCount: 1, depth: 1 },
      { kind: 'data', key: 'a11', name: 'A1-数据' },
      { kind: 'group', groupKey: 'B', groupCount: 1 },
      { kind: 'data', key: 'b1', name: 'B-数据' },
    ])
    const { el } = mountGroup({ 'row-model': 'server', total: '40', 'group-by': 'dept' }, rows)
    const groups = groupRowsOf(el)
    expect(groups.length).toBe(3)
    // 子组行 depth 缩进（16 + 1 * 24 = 40px 内联 padding；逻辑属性 padding-inline-start，RTL 正确）
    const subLabel = groups[1]!.querySelector('td') as HTMLTableCellElement
    expect(subLabel.style.paddingInlineStart).toBe('40px')
    // 折叠 A → A/1 组行与其数据一并隐藏（子树语义）；A 自身保留分节头行，B 不受影响
    ;(groups[0]!.querySelector('button.toggle') as HTMLButtonElement).click()
    const remain = groupRowsOf(el).map((g) => g.getAttribute('data-group'))
    expect(remain).toEqual(['A', 'B'])
    expect(dataRowsOf(el).length).toBe(1)
    expect(dataRowsOf(el)[0]!.textContent).toContain('B-数据')
  })

  it('无效组行（kind:"group" 但 groupKey 缺失/空串）契约加固：按数据行渲染（数据不丢）+ devWarn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const rows = JSON.stringify([
      { kind: 'group', groupCount: 1 }, // 缺 groupKey
      { kind: 'group', groupKey: '' }, // 空串
      { kind: 'data', key: 'a', name: '张三' },
      { kind: 'group', groupKey: '研发', groupCount: 1 },
      { kind: 'data', key: 'b', name: '李四' },
    ])
    const { el } = mountGroup({ 'row-model': 'server', total: '40', 'group-by': 'dept' }, rows)
    expect(groupRowsOf(el).length).toBe(1)
    expect(groupRowsOf(el)[0]!.getAttribute('data-group')).toBe('研发')
    // 降级渲染：两条无效组行按数据行渲染（旧行为剔除丢行），组内数据行不丢
    expect(dataRowsOf(el).length).toBe(4)
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes('groupKey') && String(c[0]).includes('保留字段')),
      '应有一次性 devWarn 指明 kind 保留字段契约',
    ).toBe(true)
    warn.mockRestore()
  })

  it('infinite + group-by：分组禁用保留（devWarn 一次 + 请求 detail 不带 groupBy；同实例重渲染不重复告警）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { el, reqs } = mountReq({ infinite: '', 'group-by': 'dept' })
      expect(reqs.length).toBe(1)
      expect(reqs[0]!.groupBy).toBeUndefined()
      const countWarns = (): number => warn.mock.calls.filter((c) => String(c[0]).includes('infinite')).length
      expect(countWarns()).toBeGreaterThanOrEqual(1)
      const afterMount = countWarns()
      // 同实例再渲染（属性写触发 update）不重复告警——实例级去重（M7：把承诺变成真断言）
      el.setAttribute('data', JSON.stringify([{ key: 'a', name: '张三' }]))
      el.setAttribute('data', JSON.stringify([{ key: 'b', name: '李四' }]))
      expect(countWarns()).toBe(afterMount)
    } finally {
      warn.mockRestore()
    }
  })

  it('client 本地分组零漂移：无 row-model 时 group-by 本地分组照常（组行/计数/折叠）', () => {
    const data = JSON.stringify([
      { key: 'a', name: '张三', dept: '研发' },
      { key: 'b', name: '李四', dept: '研发' },
      { key: 'c', name: '王五', dept: '销售' },
    ])
    const { el } = mountReq({ 'group-by': 'dept' }, data)
    const groups = groupRowsOf(el)
    expect(groups.length).toBe(2)
    expect(groups[0]!.getAttribute('data-group')).toBe('研发')
    expect(groups[0]!.textContent).toContain('2')
    // 折叠照常
    ;(groups[0]!.querySelector('button.toggle') as HTMLButtonElement).click()
    expect(dataRowsOf(el).length).toBe(1)
  })

  // ==== 收尾小修：server 分组 × column-virtual 守卫（F1）+ labelSpan=0 退化（F3） ====

  /** 32 列宽表（name + amount 聚合列 + 30 附加列）：happy-dom 视口下窗口裁剪成立，不降级时数据行走占位归并 */
  const wideGroupCols = (): string =>
    JSON.stringify([
      { key: 'name', title: '名称' },
      { key: 'amount', title: '金额', aggregate: true, type: 'number' },
      ...Array.from({ length: 30 }, (_, i) => ({ key: `c${i}`, title: `列${i}`, width: '80px' })),
    ])

  it('server 分组 × column-virtual：列虚拟降级为普通渲染（devWarn 一次 + 重渲染不重复）——组行/数据行格子几何闭合', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const rows = JSON.stringify([
        { kind: 'group', groupKey: '研发', groupCount: 1, aggregates: { amount: 120 } },
        { key: 'a', name: '张三', amount: 70 },
      ])
      const { el } = mountGroup(
        { 'row-model': 'server', total: '40', 'group-by': 'dept', 'column-virtual': '' },
        rows,
        wideGroupCols(),
      )
      // 降级生效：数据行不再走列窗口（无占位归并格）
      const placeholders = el.shadowRoot!.querySelectorAll('td.col-virtual-placeholder')
      expect(placeholders.length, 'server 分组生效时 column-virtual 应降级（无占位格）').toBe(0)
      // 几何闭合：组行格子数与 colSpan 求和都等于数据行 td 数（全列渲染，同构）
      const gtds = [...groupRowsOf(el)[0]!.querySelectorAll('td')] as HTMLTableCellElement[]
      const dataTdCount = dataRowsOf(el)[0]!.querySelectorAll('td').length
      expect(dataTdCount, '数据行全列渲染（32 列）').toBe(32)
      expect(gtds.length, '组行逐格数与数据行一致').toBe(dataTdCount)
      expect(gtds.reduce((n, t) => n + t.colSpan, 0)).toBe(dataTdCount)
      // 聚合值列位正确（amount 在第 2 格，label 格覆盖 name 叶子）
      expect(gtds[0]!.textContent).toContain('研发')
      expect(gtds[1]!.getAttribute('data-col')).toBe('amount')
      expect(gtds[1]!.textContent).toBe('120')
      // devWarn 恰一次 + 同实例重渲染（数据回填触发 update）不重复
      const warns = (): number => warn.mock.calls.filter((c) => String(c[0]).includes('column-virtual')).length
      expect(warns()).toBe(1)
      el.setAttribute(
        'data',
        JSON.stringify([
          { kind: 'group', groupKey: '销售', groupCount: 1, aggregates: { amount: 5 } },
          { key: 'b', name: '李四', amount: 5 },
        ]),
      )
      expect(warns(), '同实例重渲染不重复告警').toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('对照：非 server 分组（client 本地分组）× column-virtual 不降级——列窗口照常生效（守卫条件精确命中 server 分组）', () => {
    const data = JSON.stringify([{ key: 'a', name: '张三', dept: '研发', amount: 70 }])
    const { el } = mountReq({ 'group-by': 'dept', 'column-virtual': '' }, data, wideGroupCols())
    // column-virtual 生效：初始 scrollLeft=0 无左占位，窗口裁剪只留右侧归并格（恰好 1 个）
    const placeholders = el.shadowRoot!.querySelectorAll<HTMLTableCellElement>('td.col-virtual-placeholder')
    expect(placeholders.length, 'client 分组不受 server 守卫影响，列窗口照常（初始仅右侧归并一格）').toBe(1)
    // 几何守恒：窗口列逐格渲染（首格 name）+ 占位归并 = 全列 32
    const rowTds = dataRowsOf(el)[0]!.querySelectorAll('td[data-col]')
    expect(rowTds[0]!.getAttribute('data-col'), '窗口从首列 name 起').toBe('name')
    expect(rowTds.length + placeholders[0]!.colSpan, '窗口列 + 占位归并列数守恒（= 全列 32）').toBe(32)
    // 本地分组组行恒全宽（既有行为零漂移）
    const gtds = [...groupRowsOf(el)[0]!.querySelectorAll('td')] as HTMLTableCellElement[]
    expect(gtds.length).toBe(1)
    expect(gtds[0]!.colSpan).toBe(32)
  })

  it('labelSpan=0 退化（首个叶子即聚合列且无勾选/拖拽）：不渲染 label 格——聚合格从第 0 列起，ΣcolSpan 闭合且折叠交互不回退', () => {
    const cols = JSON.stringify([
      { key: 'amount', title: '金额', aggregate: true, type: 'number' },
      { key: 'name', title: '名称' },
    ])
    const rows = JSON.stringify([
      { kind: 'group', groupKey: '研发', groupCount: 2, aggregates: { amount: 120 } },
      { key: 'a', name: '张三', amount: 70 },
    ])
    const { el } = mountGroup({ 'row-model': 'server', total: '40', 'group-by': 'dept' }, rows, cols)
    const group = groupRowsOf(el)[0]!
    const tds = [...group.querySelectorAll('td')] as HTMLTableCellElement[]
    // 行宽闭合：此前 Math.max(1, 0) 强凑 colSpan=1 会多出 1 列（不闭合）
    expect(tds.reduce((n, t) => n + t.colSpan, 0)).toBe(2)
    // 聚合格从第 0 列起：首格即聚合列（无独立 label 格）
    expect(tds.length).toBe(2)
    expect(tds[0]!.getAttribute('data-col')).toBe('amount')
    expect(tds[0]!.colSpan).toBe(1)
    // 折叠交互与组信息不回退：折叠钮/组标签/计数并入首格（初始展开态类名 + button 语义）
    const toggle = tds[0]!.querySelector<HTMLButtonElement>('button.toggle')
    expect(toggle?.className, '折叠钮初始展开态类名精确（toggle open）').toBe('toggle open')
    expect(toggle?.type).toBe('button')
    expect(tds[0]!.textContent).toContain('研发')
    expect(tds[0]!.querySelector('.group-count')!.textContent).toBe('2')
    // 聚合值同格在场（aria-expanded 折叠语义保留）
    expect(tds[0]!.textContent).toContain('120')
    expect(tds[0]!.querySelector('button.toggle')!.getAttribute('aria-expanded')).toBe('true')
  })
})
