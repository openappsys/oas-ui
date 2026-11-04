// 结构级渲染能力（structural-render L3）：表头行/表头单元格/正文行/正文单元格四个结构槽的宿主钩子。
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
// 注册型 L3：import 即注册能力（副作用）
import './index.js'
// 公共元素类在 table barrel（带默认文案注册），与既有 table 测试同导入路径
import { OASTable } from '../index.js'
import type { TableStructuralRenderers } from '../oas-table.js'

function mount(attrs: Record<string, string> = {}): OASTable {
  const el = new OASTable()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

const COLUMNS = JSON.stringify([
  { key: 'name', title: '名称' },
  { key: 'status', title: '状态' },
])
const DATA = JSON.stringify([
  { name: '甲', status: 'ok' },
  { name: '乙', status: 'pending' },
])

function calls() {
  const log: string[] = []
  const renderers: Required<TableStructuralRenderers> = {
    headerRow: (ctx) => log.push(`headerRow:${ctx.el.tagName}`),
    headerCell: (ctx) => log.push(`headerCell:${ctx.column.key}`),
    bodyRow: (ctx) => log.push(`bodyRow:${ctx.rowIndex}:${(ctx.row as { name: string }).name}`),
    bodyCell: (ctx) => log.push(`bodyCell:${ctx.rowIndex}:${ctx.column.key}`),
  }
  return { log, renderers }
}

describe('OASTable structural-render 能力（注册型 L3）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('① 四槽全调：headerRow/headerCell/bodyRow/bodyCell 按结构位置调用，ctx 字段正确', () => {
    const el = mount({ columns: COLUMNS, data: DATA })
    const { log, renderers } = calls()
    el.structuralRenderers = renderers
    // 赋值即触发重渲染（property setter 走 dirty+update）
    const sorted = [...log].sort()
    expect(sorted.filter((x) => x.startsWith('headerRow:'))).toEqual(['headerRow:TR'])
    expect(sorted.filter((x) => x.startsWith('headerCell:'))).toEqual(['headerCell:name', 'headerCell:status'])
    expect(sorted.filter((x) => x.startsWith('bodyRow:'))).toEqual(['bodyRow:0:甲', 'bodyRow:1:乙'])
    expect(log.filter((x) => x.startsWith('bodyCell:'))).toHaveLength(4)
    expect(sorted.filter((x) => x === 'bodyCell:0:name')).toHaveLength(1)
  })

  it('② 钩子可包裹结构：bodyCell 给 td 包 wrapper，正文渲染不受影响', () => {
    const el = mount({ columns: COLUMNS, data: DATA })
    el.structuralRenderers = {
      bodyCell: ({ el: td }) => {
        const wrap = document.createElement('span')
        wrap.className = 'host-wrap'
        wrap.append(...td.childNodes)
        td.append(wrap)
      },
    }
    const td = el.shadowRoot!.querySelector<HTMLElement>('td[data-col="name"]')!
    expect(td.querySelector('span.host-wrap')?.textContent).toContain('甲')
    // 默认内容仍在（包裹非替换）
    expect(td.textContent).toContain('甲')
  })

  it('③ 未设 structuralRenderers：能力已注册也零调用（无 property 零开销）', () => {
    const el = mount({ columns: COLUMNS, data: DATA })
    // 不设置 property：渲染后表格正常、无异常
    expect(el.shadowRoot!.querySelectorAll('tbody tr.row')).toHaveLength(2)
    expect(el.shadowRoot!.querySelectorAll('td').length).toBeGreaterThanOrEqual(4)
  })

  it('④ 运行时改写 property：新钩子在下次渲染生效（无闭包缓存）', () => {
    const el = mount({ columns: COLUMNS, data: DATA })
    const seen: string[] = []
    el.structuralRenderers = { bodyRow: () => seen.push('v1') }
    el.structuralRenderers = { bodyRow: () => seen.push('v2') }
    const v1 = seen.filter((s) => s === 'v1').length
    const v2 = seen.filter((s) => s === 'v2').length
    expect(v2).toBeGreaterThanOrEqual(2)
    // v1 只在第一次赋值后的那轮渲染出现，第二轮起全是 v2（现读 property）
    expect(seen[seen.length - 1]).toBe('v2')
    expect(v1).toBeLessThanOrEqual(v2)
  })

  it('⑤ 非函数槽位静默忽略（防御）：坏槽不炸、好槽照跑', () => {
    const el = mount({ columns: COLUMNS, data: DATA })
    const good: string[] = []
    el.structuralRenderers = {
      bodyRow: () => good.push('ok'),
      // @ts-expect-error 契约外形态防御
      bodyCell: 'not-a-function',
    }
    expect(good.length).toBeGreaterThanOrEqual(2)
    expect(el.shadowRoot!.querySelectorAll('td[data-col]')).toHaveLength(4)
  })

  it('⑥ windowed 口径：rowIndex 与 data-row-index 一致（绝对行号）', () => {
    const el = mount({
      columns: COLUMNS,
      windowed: '',
      total: '10',
      'window-start': '4',
      data: JSON.stringify([
        { name: '戊', status: 'ok' },
        { name: '己', status: 'ok' },
      ]),
    })
    const idx: number[] = []
    el.structuralRenderers = { bodyRow: ({ rowIndex }) => idx.push(rowIndex) }
    expect(idx).toEqual([4, 5])
    expect(el.shadowRoot!.querySelector('tr[data-key]')?.getAttribute('data-row-index')).toBe('4')
  })

  it('⑦ 钩子挂接时序：调用时元素已挂父级（el.parentElement 可用）', () => {
    const el = mount({ columns: COLUMNS, data: DATA })
    const parents: string[] = []
    el.structuralRenderers = {
      bodyRow: ({ el: tr }) => parents.push(tr.parentElement?.tagName ?? 'null'),
      bodyCell: ({ el: td }) => parents.push(td.parentElement?.tagName ?? 'null'),
      headerRow: ({ el: tr }) => parents.push(tr.parentElement?.tagName ?? 'null'),
      headerCell: ({ el: th }) => parents.push(th.parentElement?.tagName ?? 'null'),
    }
    // 四槽共 9 次调用：bodyRow×2（2 行）+ bodyCell×4（2 行 × 2 列）+ headerRow×1 + headerCell×2
    expect(parents).toHaveLength(9)
    expect(new Set(parents), '四槽调用时 parentElement 均已就绪').toEqual(new Set(['TBODY', 'TR', 'THEAD']))
  })

  it('⑧ 钩子抛错防御：单槽抛错表格不白屏、其余槽照常、后续渲染恢复', () => {
    const el = mount({ columns: COLUMNS, data: DATA })
    const errors: string[] = []
    const origWarn = console.warn
    console.warn = (...args: unknown[]) => errors.push(String(args[0]))
    try {
      el.structuralRenderers = {
        bodyCell: () => {
          throw new Error('boom-cell')
        },
        bodyRow: ({ el: tr }) => tr.setAttribute('data-ok', '1'),
      }
      // 表格照常渲染（bodyCell 抛错被跳过，bodyRow 不受影响）
      expect(el.shadowRoot!.querySelectorAll('tbody tr.row')).toHaveLength(2)
      // bodyRow 渲染器对 2 行都打标：被抛错槽不影响
      expect(el.shadowRoot!.querySelectorAll('tr.row[data-ok]')).toHaveLength(2)
      // 同错只告警一次
      el.structuralRenderers = {
        bodyCell: () => {
          throw new Error('boom-cell')
        },
      }
      expect(errors.filter((e) => e.includes('boom-cell')).length, '同错去重').toBe(1)
      // 宿主修复后下一轮渲染自动恢复：2 行 × 2 列的 bodyCell 全部补上 data-fixed
      el.structuralRenderers = { bodyCell: ({ el: td }) => td.setAttribute('data-fixed', '1') }
      expect(el.shadowRoot!.querySelectorAll('td[data-fixed]')).toHaveLength(4)
    } finally {
      console.warn = origWarn
    }
  })

  it('⑨ paintCell 恢复路径重跑 bodyCell：结构装饰在编辑清空后自动回来', () => {
    const el = mount({ columns: COLUMNS, data: DATA })
    el.structuralRenderers = {
      bodyCell: ({ el: td, column }) => {
        if (column.key !== 'status') return
        const dot = document.createElement('i')
        dot.className = 'status-dot'
        td.prepend(dot)
      },
    }
    const td = el.shadowRoot!.querySelector<HTMLElement>('td[data-col="status"]')!
    expect(td.querySelectorAll('i.status-dot')).toHaveLength(1)
    // 模拟编辑进出：清空 td（enterEdit 行为）→ paintCell 恢复（exitEdit/cancel 行为）
    td.textContent = ''
    expect(td.querySelector('i.status-dot'), '编辑清空后结构装饰随内容销毁').toBeNull()
    ;(el as unknown as { paintCell(td: HTMLElement, col: unknown, row: unknown): void }).paintCell(
      td,
      { key: 'status', title: '状态' },
      { name: '甲', status: 'ok' },
    )
    // paintCell 只恢复传入的 td：该 td 内恰好 1 个装饰（另一行 status td 不受影响）
    expect(td.querySelectorAll('i.status-dot'), 'paintCell 恢复默认内容后 bodyCell 重跑，结构装饰回来').toHaveLength(1)
  })

  it('⑩ merge 列同值判定不受宿主结构改写影响（WeakMap 前置快照）', () => {
    const el = mount({
      columns: JSON.stringify([
        { key: 'grp', title: '组', merge: true },
        { key: 'name', title: '名称' },
      ]),
      data: JSON.stringify([
        { grp: 'A', name: '甲' },
        { grp: 'A', name: '乙' },
        { grp: 'B', name: '丙' },
      ]),
    })
    // 宿主把 merge 列全部渲染成无文字图标（textContent 恒空——旧判定会静默错合并成全表一格）
    el.structuralRenderers = {
      bodyCell: ({ el: td, column }) => {
        if (column.key !== 'grp') return
        td.textContent = ''
        const icon = document.createElement('b')
        td.append(icon)
      },
    }
    const grpTds = [...el.shadowRoot!.querySelectorAll<HTMLTableCellElement>('td[data-col="grp"]')]
    expect(grpTds, 'A 组两行合并 → grp 列只剩 2 格').toHaveLength(2)
    expect(grpTds[0]!.rowSpan, 'A 组合并 rowspan=2').toBe(2)
    expect(grpTds[1]!.rowSpan, 'B 组独立格不参与合并').toBe(1)
  })

  it('⑫ windowed × 行内嵌 expand：expand 内容行不进 bodyRow，数据行 rowIndex 序列不受干扰', () => {
    const el = mount({
      columns: COLUMNS,
      windowed: '',
      total: '10',
      'window-start': '2',
      'row-key': 'name',
      expanded: '丙',
      data: JSON.stringify([
        { name: '丙', status: 'ok', expand: '<p>丙的展开详情</p>' },
        { name: '丁', status: 'ok' },
      ]),
    })
    const idx: number[] = []
    el.structuralRenderers = { bodyRow: ({ rowIndex }) => idx.push(rowIndex) }
    // 切片 2 行：丙（含 expand 内容行）+ 丁——bodyRow 只应被数据行触发 2 次
    expect(el.shadowRoot!.querySelectorAll('tr.expand-row').length, 'expand 内容行已渲染').toBe(1)
    expect(idx, 'expand 行不进钩子，数据行绝对行号序列正确').toEqual([2, 3])
  })

  it('⑪ 能力晚注册通知循环隔离：抛错 listener 不中断其余 listener', async () => {
    const { registerTableCapability, onTableCapabilityRegistered } = await import('../oas-table-capability.js')
    const calls: string[] = []
    const un1 = onTableCapabilityRegistered(() => {
      calls.push('first')
      throw new Error('listener-boom')
    })
    const un2 = onTableCapabilityRegistered(() => calls.push('second'))
    try {
      registerTableCapability('review-probe-cap', () => ({}) as never)
      expect(calls, '抛错 listener 之后的 listener 仍被通知').toEqual(['first', 'second'])
    } finally {
      un1()
      un2()
    }
  })
})
