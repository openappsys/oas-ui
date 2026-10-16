import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from './index.js'
// 仅内部诊断计数（非公开 API）：以差值断言缓存复用是否生效
import { tableRenderDiagnostics } from './oas-table.js'

/**
 * oas-table 增量渲染（选择切换零重算）机制测试。
 *
 * 目标：万级数据下「切换 selected」不得重跑 O(总量) 的 buildFlat / computeSummary，
 * 也不得重建整表 DOM（行节点身份保持，只 patch data-selected / 复选态 / 表头全选态）。
 * 数据/排序/过滤/分组/展开变化必须正确失效缓存（计数增长）。
 */

const COLUMNS = JSON.stringify([
  { key: 'name', title: '姓名' },
  { key: 'amount', title: '金额' },
])

/** n 行数据：key=k{i} / name=行{i} / amount=i（sum 可精确断言） */
function bigData(n: number): string {
  return JSON.stringify(Array.from({ length: n }, (_, i) => ({ key: `k${i}`, name: `行${i}`, amount: i })))
}

function mount(attrs: Record<string, string> = {}): OASTable {
  const el = new OASTable()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.columns) el.setAttribute('columns', COLUMNS)
  if (!attrs.data) el.setAttribute('data', bigData(10))
  document.body.appendChild(el)
  return el
}

function dataRows(el: OASTable): HTMLTableRowElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLTableRowElement>('tbody tr[data-key]')]
}

const counters = (): { flat: number; sum: number } => ({
  flat: tableRenderDiagnostics.flatBuilds,
  sum: tableRenderDiagnostics.summaryComputes,
})

describe('OASTable 增量渲染（选择切换零重算）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('① 万级行（10000）连点 10 次不同行：flatBuilds/summaryComputes 不增、行节点身份不变、选中态正确', {
    timeout: 180_000,
  }, () => {
    const el = mount({
      data: bigData(10000),
      summary: JSON.stringify([{ key: 'amount', type: 'sum' }]),
      'summary-scope': 'all',
    })
    // 初始渲染后取基线（初始含主 flat + scope=all 汇总 flat 两次 buildFlat、一次 computeSummary）
    const before = counters()
    const trs = dataRows(el)
    expect(trs.length).toBe(10000)
    // 连点 10 次不同行（行点击 → setAttribute selected → update 快路径补丁）
    for (let i = 0; i < 10; i++) trs[i]!.click()
    const after = counters()
    expect(after.flat, '仅选择变化不得重跑 buildFlat').toBe(before.flat)
    expect(after.sum, '仅选择变化不得重跑 computeSummary').toBe(before.sum)
    // DOM 行节点身份不变（局部 patch 而非整表重建）
    const trsAfter = dataRows(el)
    for (let i = 0; i < 10; i++) {
      expect(trsAfter[i], `第 ${i} 行节点身份应保持`).toBe(trs[i])
      expect(trsAfter[i]!.getAttribute('data-selected')).toBe('true')
    }
    expect(trsAfter[10]!.getAttribute('data-selected')).toBe('false')
    expect(el.getAttribute('selected')).toBe('k0,k1,k2,k3,k4,k5,k6,k7,k8,k9')
    // 合计行仍在场且数值未被补丁破坏（0+1+…+9999 = 49995000）
    const summaryText = el.shadowRoot!.querySelector('tr.summary')!.textContent ?? ''
    expect(summaryText).toContain('49995000')
  })

  it('② 缓存正确失效：data/sort/filter/group-by/expanded 变化计数增长，仅 selected 变化不增长', () => {
    const el = mount({ data: bigData(50) })
    const c = counters()
    // 仅选择变化：缓存复用
    el.setAttribute('selected', 'k1')
    expect(tableRenderDiagnostics.flatBuilds).toBe(c.flat)
    // data 变化：重建
    el.setAttribute('data', bigData(60))
    expect(tableRenderDiagnostics.flatBuilds).toBe(c.flat + 1)
    // 排序变化：重建
    el.setAttribute('sort-key', 'name')
    expect(tableRenderDiagnostics.flatBuilds).toBe(c.flat + 2)
    el.setAttribute('sort-order', 'asc')
    expect(tableRenderDiagnostics.flatBuilds).toBe(c.flat + 3)
    // 过滤变化：重建
    el.setAttribute('filter-values', JSON.stringify({ name: '行1' }))
    expect(tableRenderDiagnostics.flatBuilds).toBe(c.flat + 4)
    // 分组变化：重建
    el.setAttribute('group-by', 'name')
    expect(tableRenderDiagnostics.flatBuilds).toBe(c.flat + 5)
    // 展开状态变化：重建（buildFlat 输入签名含 expanded）
    el.setAttribute('expanded', 'k1')
    expect(tableRenderDiagnostics.flatBuilds).toBe(c.flat + 6)
    // 再次仅选择变化：不增
    el.setAttribute('selected', 'k2')
    expect(tableRenderDiagnostics.flatBuilds).toBe(c.flat + 6)
  })

  it('③ summary-scope=all：切换选择后汇总值仍正确且不重算；数据变化才重算并更新', () => {
    const el = mount({
      data: bigData(10),
      summary: JSON.stringify([{ key: 'amount', type: 'sum' }]),
      'summary-scope': 'all',
      checkable: '',
    })
    const summaryText = (): string => el.shadowRoot!.querySelector('tr.summary')!.textContent ?? ''
    // 0+…+9 = 45
    expect(summaryText()).toContain('45')
    const before = counters()
    // 宿主受控写选择（外部 setAttribute）：走补丁，汇总不重算、值不变
    el.setAttribute('selected', 'k1,k2')
    expect(tableRenderDiagnostics.summaryComputes).toBe(before.sum)
    expect(tableRenderDiagnostics.flatBuilds).toBe(before.flat)
    expect(summaryText()).toContain('45')
    // 行复选框态被补丁同步
    const trs = dataRows(el)
    const boxOf = (tr: HTMLTableRowElement): HTMLInputElement | null =>
      tr.querySelector<HTMLInputElement>('.check-cell input')
    expect(boxOf(trs[1]!)!.checked).toBe(true)
    expect(boxOf(trs[3]!)!.checked).toBe(false)
    // 全选（表头全选态同步 + 全部行勾选态）
    el.setAttribute('selected', 'k0,k1,k2,k3,k4,k5,k6,k7,k8,k9')
    const selectAll = el.shadowRoot!.querySelector<HTMLInputElement>('thead input[type="checkbox"]')!
    expect(selectAll.checked).toBe(true)
    expect(boxOf(dataRows(el)[5]!)!.checked).toBe(true)
    expect(tableRenderDiagnostics.summaryComputes).toBe(before.sum)
    // 数据变化：汇总重算且值更新（amount 全部 +1 → 55）
    const next = JSON.parse(bigData(10)) as Array<Record<string, unknown>>
    for (const r of next) r['amount'] = (r['amount'] as number) + 1
    el.setAttribute('data', JSON.stringify(next))
    expect(tableRenderDiagnostics.summaryComputes).toBe(before.sum + 1)
    expect(summaryText()).toContain('55')
  })

  it('③b summary-scope=page：翻页切片口径的汇总在切换选择后不重算、值正确', () => {
    const el = mount({
      data: bigData(10),
      summary: JSON.stringify([{ key: 'amount', type: 'sum' }]),
      'summary-scope': 'page',
      pagination: '',
      'page-size': '5',
    })
    const summaryText = (): string => el.shadowRoot!.querySelector('tr.summary')!.textContent ?? ''
    // 第一页 0+…+4 = 10
    expect(summaryText()).toContain('10')
    const before = counters()
    el.setAttribute('selected', 'k1')
    expect(tableRenderDiagnostics.summaryComputes).toBe(before.sum)
    expect(tableRenderDiagnostics.flatBuilds).toBe(before.flat)
    expect(summaryText()).toContain('10')
  })

  it('④ windowed 路径：切换选择行节点身份不变、选中态正确（切片渲染不重建）', () => {
    const el = mount({
      windowed: '',
      total: '10000',
      'window-start': '0',
      'row-key': 'key',
      data: bigData(30),
    })
    const before = counters()
    const trs = dataRows(el)
    expect(trs.length).toBe(30)
    for (let i = 0; i < 5; i++) trs[i]!.click()
    const trsAfter = dataRows(el)
    for (let i = 0; i < 5; i++) {
      expect(trsAfter[i], `windowed 第 ${i} 行节点身份应保持`).toBe(trs[i])
      expect(trsAfter[i]!.getAttribute('data-selected')).toBe('true')
    }
    expect(tableRenderDiagnostics.flatBuilds).toBe(before.flat)
    expect(tableRenderDiagnostics.summaryComputes).toBe(before.sum)
    // windowed 本地不执行排序/汇总：无论何时都不应有汇总行
    expect(el.shadowRoot!.querySelector('tr.summary')).toBeNull()
  })

  it('④b 虚拟滚动（height）路径：窗口行切换选择身份不变（窗口外行不参与）', () => {
    const el = mount({ data: bigData(2000), height: '320', 'row-height': '40' })
    const before = counters()
    const trs = dataRows(el)
    // 视口 320/40 = 8 行（窗口化渲染，远小于总量）
    expect(trs.length).toBeLessThan(50)
    for (let i = 0; i < 6; i++) trs[i]!.click()
    const trsAfter = dataRows(el)
    for (let i = 0; i < 6; i++) {
      expect(trsAfter[i], `虚拟窗口第 ${i} 行节点身份应保持`).toBe(trs[i])
      expect(trsAfter[i]!.getAttribute('data-selected')).toBe('true')
    }
    expect(tableRenderDiagnostics.flatBuilds).toBe(before.flat)
    expect(tableRenderDiagnostics.summaryComputes).toBe(before.sum)
  })
})
