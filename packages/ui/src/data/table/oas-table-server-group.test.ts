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

  it('空值组（批 H）：groupKey 空串 / null / 缺失的 kind:"group" 行 = 合法空值组——渲染「（空）」组头（无告警）+ 聚合照常', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const cols = JSON.stringify([
      { key: 'name', title: '名称' },
      { key: 'amount', title: '金额', aggregate: true, type: 'number' },
    ])
    const rows = JSON.stringify([
      { kind: 'group', groupKey: '', groupCount: 1, aggregates: { amount: 30 } }, // 空串 = 空值组
      { kind: 'data', key: 'a', name: '张三', amount: 30 },
      { kind: 'group', groupKey: null, groupCount: 1 }, // null = 空值组
      { key: 'b', name: '李四', amount: null },
      { kind: 'group', groupCount: 1 }, // 缺失（undefined）= 空值组
      { key: 'c', name: '王五', amount: 50 },
    ])
    const { el } = mountGroup({ 'row-model': 'server', total: '40', 'group-by': 'dept' }, rows, cols)
    const groups = groupRowsOf(el)
    // 三个空值组行渲染为三个空值组分节头（键均归一 ''——与本地分组一致，同键共享折叠态）
    expect(groups.length).toBe(3)
    for (const g of groups) {
      expect(g.getAttribute('data-group')).toBe('')
      expect(g.textContent).toContain('（空）')
    }
    // 空值组不降级不剔除：数据行全在（张三/李四/王五）
    expect(dataRowsOf(el).length).toBe(3)
    // 聚合照常：空串组的 aggregates 渲染在聚合列
    const tds = [...groups[0]!.querySelectorAll('td')] as HTMLTableCellElement[]
    expect(tds[1]!.getAttribute('data-col')).toBe('amount')
    expect(tds[1]!.textContent).toBe('30')
    // 空值组合法 → 零 devWarn
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('空值组折叠可用：折叠空值组只隐藏其组内行（普通组行与其组内行不受影响），再展开恢复', () => {
    const rows = JSON.stringify([
      { kind: 'group', groupKey: null, groupCount: 1 }, // null = 空值组
      { kind: 'data', key: 'a', name: '张三' },
      { kind: 'group', groupKey: '研发', groupCount: 1 },
      { kind: 'data', key: 'b', name: '李四' },
    ])
    const { el } = mountGroup({ 'row-model': 'server', total: '40', 'group-by': 'dept' }, rows)
    const groups = groupRowsOf(el)
    expect(groups.length).toBe(2)
    expect(groups[0]!.getAttribute('data-group')).toBe('')
    expect(groups[0]!.textContent).toContain('（空）')
    // 折叠空值组：张三隐藏；研发组行与李四不受影响
    ;(groups[0]!.querySelector('button.toggle') as HTMLButtonElement).click()
    expect(dataRowsOf(el).map((r) => r.textContent)).toEqual([expect.stringContaining('李四')])
    expect(groupRowsOf(el).map((g) => g.getAttribute('data-group'))).toEqual(['', '研发'])
    // 再展开恢复
    ;(groupRowsOf(el)[0]!.querySelector('button.toggle') as HTMLButtonElement).click()
    expect(dataRowsOf(el).length).toBe(2)
  })

  it('无效组行（kind:"group" 但 groupKey 数值/布尔等非字符串非空值）契约加固：按数据行渲染（数据不丢）+ devWarn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const rows = JSON.stringify([
      { kind: 'group', groupKey: 42 }, // 数值 = 无效键
      { kind: 'group', groupCount: 1 }, // 缺失 = 空值组（批 H，合法）
      { kind: 'data', key: 'a', name: '张三' },
      { kind: 'group', groupKey: '研发', groupCount: 1 },
      { kind: 'data', key: 'b', name: '李四' },
    ])
    const { el } = mountGroup({ 'row-model': 'server', total: '40', 'group-by': 'dept' }, rows)
    // 数值键组行降级为数据行；缺失键 = 空值组（组行形态保留）
    expect(groupRowsOf(el).length).toBe(2)
    expect(groupRowsOf(el)[0]!.getAttribute('data-group')).toBe('')
    expect(groupRowsOf(el)[0]!.textContent).toContain('（空）')
    expect(groupRowsOf(el)[1]!.getAttribute('data-group')).toBe('研发')
    // 降级渲染：数值键组行按数据行渲染（数据不丢），空值组下数据行不丢
    expect(dataRowsOf(el).length).toBe(3)
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

  // ==== 兼容批：server 分组 × column-virtual 组行参与列窗口（取代原降级方案 F1）+ labelSpan=0 退化（F3） ====

  /** 32 列宽表（name + amount 聚合列 + 30 附加列）：happy-dom 视口下窗口裁剪成立，数据行/组行都走占位归并 */
  const wideGroupCols = (): string =>
    JSON.stringify([
      { key: 'name', title: '名称' },
      { key: 'amount', title: '金额', aggregate: true, type: 'number' },
      ...Array.from({ length: 30 }, (_, i) => ({ key: `c${i}`, title: `列${i}`, width: '80px' })),
    ])

  const wrapOf = (el: OASTable): HTMLElement => el.shadowRoot!.querySelector('.table-scroll')!

  const scrollX = async (el: OASTable, left: number): Promise<void> => {
    const w = wrapOf(el)
    // 轮询至窗口反映新滚动位（scroll 经 rAF 节流，满载 worker 下固定 sleep 不可靠——
    // 以数据行首格 data-col 变化作窗口切换信号）
    const before = dataRowsOf(el)[0]?.querySelector('td')?.getAttribute('data-col')
    w.scrollLeft = left
    w.dispatchEvent(new Event('scroll'))
    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 20))
      const now = dataRowsOf(el)[0]?.querySelector('td')?.getAttribute('data-col')
      if (now !== before) return
    }
  }

  /** 行 ΣcolSpan（格几何闭合口径：组行与数据行同构） */
  const spanSum = (tr: HTMLElement): number =>
    [...tr.querySelectorAll('td')].reduce((n, t) => n + (t as HTMLTableCellElement).colSpan, 0)

  const virtualWarns = (warn: ReturnType<typeof vi.spyOn>): number =>
    warn.mock.calls.filter((c: unknown[]) => String(c[0]).includes('column-virtual')).length

  const wideGroupMount = (rows: string, attrs: Record<string, string> = {}) =>
    mountGroup(
      { 'row-model': 'server', total: '40', 'group-by': 'dept', 'column-virtual': '', ...attrs },
      rows,
      wideGroupCols(),
    )

  it('server 分组 × column-virtual：组行参与列窗口（逐格与数据行同构、ΣcolSpan 闭合、零降级 devWarn）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const rows = JSON.stringify([
        { kind: 'group', groupKey: '研发', groupCount: 2, aggregates: { amount: 120 } },
        { key: 'a', name: '张三', amount: 70 },
        { key: 'b', name: '李四', amount: 50 },
      ])
      const { el } = wideGroupMount(rows)
      // 列虚拟在 server 分组下生效（降级才无占位格）：数据行走占位归并
      const dataTds = [...dataRowsOf(el)[0]!.querySelectorAll('td')] as HTMLTableCellElement[]
      expect(
        dataTds.some((t) => t.classList.contains('col-virtual-placeholder')),
        'server 分组下列虚拟不降级（数据行有窗口外占位格）',
      ).toBe(true)
      // 组行逐格与数据行同构：格数一致、逐格 colSpan 相等（首格 = label 承载 name 列）
      const gTds = [...groupRowsOf(el)[0]!.querySelectorAll('td')] as HTMLTableCellElement[]
      expect(gTds.length, '组行格数与数据行一致（窗口列逐格 + 占位归并）').toBe(dataTds.length)
      gTds.forEach((t, i) => expect(t.colSpan, `组行第 ${i} 格 colSpan 与数据行同位格一致`).toBe(dataTds[i]!.colSpan))
      // 几何闭合：组行/数据行 ΣcolSpan 都 = 全列 32
      expect(spanSum(groupRowsOf(el)[0]!)).toBe(32)
      expect(spanSum(dataRowsOf(el)[0]!)).toBe(32)
      // label 格：初始窗口从 name 起 → label 覆盖首列（colSpan=1），聚合值在其后同位格
      expect(gTds[0]!.textContent).toContain('研发')
      expect(gTds[0]!.querySelector('.group-count')!.textContent).toBe('2')
      expect(gTds[1]!.getAttribute('data-col')).toBe('amount')
      expect(gTds[1]!.textContent).toBe('120')
      // 占位格与数据行同源（class 口径一致、span 一致）
      const gPh = gTds.filter((t) => t.classList.contains('col-virtual-placeholder'))
      const dPh = dataTds.filter((t) => t.classList.contains('col-virtual-placeholder'))
      expect(gPh.length).toBe(dPh.length)
      gPh.forEach((t, i) => expect(t.colSpan, '组行占位格 span 与数据行同源').toBe(dPh[i]!.colSpan))
      // 兼容（非降级）：零 column-virtual 告警 + 同实例重渲染（数据回填）仍零告警
      expect(virtualWarns(warn), 'server 分组与列虚拟兼容，无降级告警').toBe(0)
      el.setAttribute(
        'data',
        JSON.stringify([
          { kind: 'group', groupKey: '销售', groupCount: 1, aggregates: { amount: 5 } },
          { key: 'c', name: '王五', amount: 5 },
        ]),
      )
      expect(virtualWarns(warn), '同实例重渲染不重复告警（兼容路径无告警）').toBe(0)
    } finally {
      warn.mockRestore()
    }
  })

  it('server 分组 × column-virtual：横向滚动窗口切换 → 组行 label 跨度按窗口重算（不跨窗口错位）、ΣcolSpan 恒闭合、折叠钮可用', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const rows = JSON.stringify([
        { kind: 'group', groupKey: '研发', groupCount: 2, aggregates: { amount: 120 } },
        { key: 'a', name: '张三', amount: 70 },
        { key: 'b', name: '李四', amount: 50 },
      ])
      const { el } = wideGroupMount(rows)
      // 滚动窗口：首个聚合列（amount）滚出窗口 → 组行不再渲染其聚合格；数据行窗口首列不再是 name
      await scrollX(el, 2000)
      const dataTds = [...dataRowsOf(el)[0]!.querySelectorAll('td')] as HTMLTableCellElement[]
      const gTds = [...groupRowsOf(el)[0]!.querySelectorAll('td')] as HTMLTableCellElement[]
      expect(dataTds[0]!.getAttribute('data-col'), '数据行窗口首列已前移（首格为占位或窗口列）').not.toBe('name')
      expect(
        gTds.some((t) => t.getAttribute('data-col') === 'amount'),
        '聚合列滚出窗口后组行无其聚合格',
      ).toBe(false)
      // label 退化并入首个真实列格——不并入占位格（label 不覆盖窗口外区域）
      const carrier = gTds.find((t) => (t.textContent ?? '').includes('研发'))!
      expect(carrier.hasAttribute('data-col'), '窗口前移后 label 并入首个可见列格').toBe(true)
      expect(carrier.classList.contains('col-virtual-placeholder')).toBe(false)
      // 逐格同构 + 闭合仍成立（窗口切换后组行几何与数据行同步重算）
      expect(gTds.length).toBe(dataTds.length)
      gTds.forEach((t, i) => expect(t.colSpan).toBe(dataTds[i]!.colSpan))
      expect(spanSum(groupRowsOf(el)[0]!), '窗口切换后组行 ΣcolSpan 恒闭合').toBe(32)
      expect(spanSum(dataRowsOf(el)[0]!)).toBe(32)
      // 折叠钮在窗口化组行可用：点击 → 组内行本地隐藏 + aria-expanded 同步（不重取）
      const toggle = groupRowsOf(el)[0]!.querySelector('button.toggle') as HTMLButtonElement
      expect(toggle.getAttribute('aria-expanded')).toBe('true')
      toggle.click()
      expect(dataRowsOf(el).length, '折叠在窗口化组行照常（组内 2 行隐藏）').toBe(0)
      expect(groupRowsOf(el)[0]!.querySelector('button.toggle')!.getAttribute('aria-expanded')).toBe('false')
      ;(groupRowsOf(el)[0]!.querySelector('button.toggle') as HTMLButtonElement).click()
      expect(dataRowsOf(el).length).toBe(2)
      // 滚回 0：label 恢复独立承载格（重算双向，随窗口 current 可见集走）
      await scrollX(el, 0)
      const gTds0 = [...groupRowsOf(el)[0]!.querySelectorAll('td')] as HTMLTableCellElement[]
      expect(gTds0[0]!.colSpan).toBe(1)
      expect(gTds0[0]!.textContent).toContain('研发')
      expect(gTds0[1]!.getAttribute('data-col')).toBe('amount')
      expect(gTds0[1]!.textContent).toBe('120')
      // 全程零 column-virtual 告警
      expect(virtualWarns(warn)).toBe(0)
    } finally {
      warn.mockRestore()
    }
  })

  it('server 分组 × column-virtual × 勾选列：label 跨度计入前导勾选列，ΣcolSpan 与数据行闭合（= 33）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const rows = JSON.stringify([
        { kind: 'group', groupKey: '研发', groupCount: 1, aggregates: { amount: 120 } },
        { key: 'a', name: '张三', amount: 70 },
      ])
      const { el } = wideGroupMount(rows, { checkable: '' })
      // 数据行：勾选格 + 窗口列 + 占位归并；组行：label 格（勾选 + name = colSpan 2）+ 窗口列 + 占位
      const gTds = [...groupRowsOf(el)[0]!.querySelectorAll('td')] as HTMLTableCellElement[]
      expect(gTds[0]!.colSpan, 'label 跨度 = 前导勾选列 + name 叶子').toBe(2)
      expect(gTds[0]!.textContent).toContain('研发')
      expect(gTds[1]!.getAttribute('data-col')).toBe('amount')
      // 闭合：组行 ΣcolSpan = 勾选(1) + 全列(32) = 数据行同口径
      expect(spanSum(groupRowsOf(el)[0]!)).toBe(33)
      expect(spanSum(dataRowsOf(el)[0]!)).toBe(33)
      expect(virtualWarns(warn)).toBe(0)
    } finally {
      warn.mockRestore()
    }
  })

  it('labelSpan=0 退化 × column-virtual（首个叶子即聚合列）：窗口内外 label 均并入首个真实列格，ΣcolSpan 闭合', async () => {
    const cols = JSON.stringify([
      { key: 'amount', title: '金额', aggregate: true, type: 'number' },
      { key: 'name', title: '名称' },
      ...Array.from({ length: 30 }, (_, i) => ({ key: `c${i}`, title: `列${i}`, width: '80px' })),
    ])
    const rows = JSON.stringify([
      { kind: 'group', groupKey: '研发', groupCount: 2, aggregates: { amount: 120 } },
      { key: 'a', name: '张三', amount: 70 },
    ])
    const { el } = wideGroupMount(rows)
    el.setAttribute('columns', cols)
    // 初始窗口：首列即聚合列 → 无独立 label 格，label 并入 amount 格（与既有退化同口径）
    const gTds = [...groupRowsOf(el)[0]!.querySelectorAll('td')] as HTMLTableCellElement[]
    expect(gTds[0]!.getAttribute('data-col')).toBe('amount')
    expect(gTds[0]!.textContent).toContain('研发')
    expect(gTds[0]!.textContent).toContain('120')
    // 折叠交互与组信息不回退：折叠钮并入首格（aria-expanded 语义在场）
    expect(gTds[0]!.querySelector('button.toggle')!.getAttribute('aria-expanded')).toBe('true')
    expect(spanSum(groupRowsOf(el)[0]!)).toBe(32)
    // 滚动后：label 仍并入首个真实列格（不落入占位格）
    await scrollX(el, 2000)
    const gTds2 = [...groupRowsOf(el)[0]!.querySelectorAll('td')] as HTMLTableCellElement[]
    const carrier = gTds2.find((t) => (t.textContent ?? '').includes('研发'))!
    expect(carrier.hasAttribute('data-col')).toBe(true)
    expect(carrier.classList.contains('col-virtual-placeholder')).toBe(false)
    expect(spanSum(groupRowsOf(el)[0]!)).toBe(32)
  })

  it('对照：非 server 分组（client 本地分组）× column-virtual 行为零漂移——列窗口照常生效，组行恒全宽形态不变', () => {
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
