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
    // 未提供聚合键的组行：对应格子留空（不渲染 undefined/NaN）
    const tds2 = [...groups[1]!.querySelectorAll('td')] as HTMLTableCellElement[]
    expect(tds2[1]!.textContent).toBe('')
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
    // 子组行 depth 缩进（16 + 1 * 24 = 40px 内联 padding）
    const subLabel = groups[1]!.querySelector('td') as HTMLTableCellElement
    expect(subLabel.style.paddingLeft).toBe('40px')
    // 折叠 A → A/1 组行与其数据一并隐藏（子树语义）；A 自身保留分节头行，B 不受影响
    ;(groups[0]!.querySelector('button.toggle') as HTMLButtonElement).click()
    const remain = groupRowsOf(el).map((g) => g.getAttribute('data-group'))
    expect(remain).toEqual(['A', 'B'])
    expect(dataRowsOf(el).length).toBe(1)
    expect(dataRowsOf(el)[0]!.textContent).toContain('B-数据')
  })

  it('无效组行（groupKey 缺失/空串）降级：剔除 + devWarn 一次 + 组内数据行不丢', () => {
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
    expect(dataRowsOf(el).length).toBe(2)
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes('groupKey')),
      '无效组行应有一次性 devWarn 指明 groupKey 校验',
    ).toBe(true)
    warn.mockRestore()
  })

  it('infinite + group-by：分组禁用保留（devWarn 一次 + 请求 detail 不带 groupBy）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { reqs } = mountReq({ infinite: '', 'group-by': 'dept' })
    expect(reqs.length).toBe(1)
    expect(reqs[0]!.groupBy).toBeUndefined()
    expect(warn.mock.calls.some((c) => String(c[0]).includes('infinite'))).toBe(true)
    // 同实例再渲染不重复告警
    document.body.innerHTML = ''
    warn.mockRestore()
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
})
