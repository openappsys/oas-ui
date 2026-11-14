// 结构级渲染能力（structural-render L3）：表头行/表头单元格/正文行/正文单元格四个结构槽的宿主钩子。
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
// 注册型 L3：import 即注册能力（副作用）
import './index.js'
// 公共元素类在 table barrel（带默认文案注册），与既有 table 测试同导入路径
import { OASTable } from '../index.js'
// 编辑能力：isEditing 查询测试需要（import 即注册）
import '../edit/index.js'
import type { TableStructuralApi, TableStructuralPaginationApi, TableStructuralRenderers } from '../oas-table.js'

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
    // 三新槽：常规数据场景不触发（无 loading/空态/分页配置），占位以满足 Required 契约
    empty: () => {},
    loading: () => {},
    pagination: () => {},
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

describe('OASTable structural-render 七槽协议与 ctx api（双形态批 2）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('① empty 槽：空态出口调用，ctx.el = 默认内容已装配的空态 td；清空后全自定义', () => {
    const el = mount({ columns: COLUMNS, data: '[]' })
    const seen: { tag: string; cls: string; text: string }[] = []
    el.structuralRenderers = {
      empty: ({ el: td }) => {
        seen.push({ tag: td.tagName, cls: td.className, text: td.textContent ?? '' })
        td.textContent = ''
        const custom = document.createElement('span')
        custom.className = 'host-empty'
        custom.textContent = '自定义空态'
        td.appendChild(custom)
      },
    }
    expect(seen, '空态出口恰按默认内容契约调用').toEqual([{ tag: 'TD', cls: 'empty', text: '暂无数据' }])
    expect(el.shadowRoot!.querySelectorAll('td.empty span.host-empty')).toHaveLength(1)
    expect(el.shadowRoot!.querySelector('td.empty')?.textContent).toBe('自定义空态')
  })

  it('② empty 槽负面清单：loading 出口与常规出口都不调', () => {
    const loading = mount({ columns: COLUMNS, loading: '' })
    const loadingCalls: string[] = []
    loading.structuralRenderers = { empty: () => loadingCalls.push('x') }
    expect(loadingCalls, 'loading 出口不调 empty 槽').toEqual([])
    expect(loading.shadowRoot!.querySelectorAll('td.empty')).toHaveLength(0)

    const normal = mount({ columns: COLUMNS, data: DATA })
    const normalCalls: string[] = []
    normal.structuralRenderers = { empty: () => normalCalls.push('x') }
    expect(normalCalls, '常规出口不调 empty 槽').toEqual([])
    expect(normal.shadowRoot!.querySelectorAll('td.empty')).toHaveLength(0)
  })

  it('③ empty-text 与 slot="empty" 优先级下 empty 槽拿到的默认内容同步变化', () => {
    const el = mount({ columns: COLUMNS, data: '[]', 'empty-text': '没有行' })
    const texts: string[] = []
    el.structuralRenderers = { empty: ({ el: td }) => texts.push(td.textContent ?? '') }
    expect(texts, 'empty-text 在场时默认内容为该文案').toEqual(['没有行'])
  })

  it('④ loading 槽：loading 出口调用，ctx el/text 契约与默认结构一致', () => {
    const el = mount({ columns: COLUMNS, loading: '' })
    const seen: { tag: string; part: string; text: string; cells: number }[] = []
    el.structuralRenderers = {
      loading: ({ el: tr, text }) => {
        seen.push({
          tag: tr.tagName,
          part: tr.getAttribute('part') ?? '',
          text,
          cells: tr.querySelectorAll('td').length,
        })
      },
    }
    expect(seen, 'loading 行 ctx：默认装配（part=loading-row + 全宽 td + 内置文案）后调用').toEqual([
      { tag: 'TR', part: 'loading-row', text: '加载中…', cells: 1 },
    ])
  })

  it('⑤ loading 槽接管：清空行重建自定义结构后默认 td 不在场', () => {
    const el = mount({ columns: COLUMNS, loading: '' })
    el.structuralRenderers = {
      loading: ({ el: tr, text }) => {
        tr.textContent = ''
        const td = document.createElement('td')
        td.colSpan = 2
        td.className = 'host-loading'
        td.textContent = `宿主加载文案（原文：${text}）`
        tr.appendChild(td)
      },
    }
    expect(el.shadowRoot!.querySelectorAll('td.loading')).toHaveLength(0)
    const host = el.shadowRoot!.querySelector('td.host-loading')
    expect(host?.getAttribute('colspan')).toBe('2')
    expect(host?.textContent).toBe('宿主加载文案（原文：加载中…）')
  })

  it('⑥ loading 槽负面清单：常规与空态出口不调', () => {
    const el = mount({ columns: COLUMNS, data: DATA })
    const calls: string[] = []
    el.structuralRenderers = { loading: () => calls.push('x') }
    expect(calls, '常规出口不调 loading 槽').toEqual([])
    const empty = mount({ columns: COLUMNS, data: '[]' })
    const emptyCalls: string[] = []
    empty.structuralRenderers = { loading: () => emptyCalls.push('x') }
    expect(emptyCalls, '空态出口不调 loading 槽').toEqual([])
  })

  it('⑦ pagination 槽：分页开启才调用，ctx 元数据契约（current/pageCount/total/pageSize）', () => {
    const el = mount({
      columns: COLUMNS,
      data: JSON.stringify([
        { name: '一', status: 'ok' },
        { name: '二', status: 'ok' },
        { name: '三', status: 'ok' },
        { name: '四', status: 'ok' },
        { name: '五', status: 'ok' },
      ]),
      pagination: '',
      'page-size': '2',
    })
    const seen: string[] = []
    el.structuralRenderers = {
      pagination: ({ el: p, current, pageCount, total, pageSize }) => {
        seen.push(JSON.stringify({ tag: p.tagName, current, pageCount, total, pageSize }))
      },
    }
    // 各轮渲染元数据一致且恰为契约值（去重后唯一 = 「有调用且每次同值」的精确表达）
    expect([...new Set(seen)]).toEqual([
      JSON.stringify({ tag: 'OAS-PAGINATION', current: 1, pageCount: 3, total: 5, pageSize: 2 }),
    ])
  })

  it('⑧ pagination 槽负面清单：分页未开启不调', () => {
    const el = mount({ columns: COLUMNS, data: DATA })
    const calls: string[] = []
    el.structuralRenderers = { pagination: () => calls.push('x') }
    expect(calls).toEqual([])
    expect(el.shadowRoot!.querySelectorAll('.pagination oas-pagination')).toHaveLength(0)
  })

  it('⑨ pagination 槽在 loading 出口同样调用（分页器与行数据无关，全量渲染出口统一调）', () => {
    const el = mount({ columns: COLUMNS, data: DATA, loading: '', pagination: '', 'page-size': '1' })
    const slots: string[] = []
    el.structuralRenderers = {
      loading: () => slots.push('loading'),
      pagination: () => slots.push('pagination'),
    }
    expect(new Set(slots), 'loading 与 pagination 两槽同轮在场').toEqual(new Set(['loading', 'pagination']))
    expect(slots.filter((s) => s === 'loading')).toHaveLength(slots.filter((s) => s === 'pagination').length)
  })

  it('⑩ api.isSelected：读 selected 属性实时判定（局部补丁后旧 ctx 仍准确）+ 空串恒 false', () => {
    const el = mount({ columns: COLUMNS, data: DATA, checkable: '', 'row-key': 'name' })
    const apis: TableStructuralApi[] = []
    el.structuralRenderers = { bodyRow: ({ api }) => apis.push(api) }
    const api = apis[apis.length - 1]!
    expect(api.isSelected('甲')).toBe(false)
    expect(api.isSelected('乙')).toBe(false)
    expect(api.isSelected('')).toBe(false)
    // 属性直写（可能走 patchSelection 局部补丁、不重跑钩子）：旧 ctx 的 api 读实时属性仍准确
    el.setAttribute('selected', '甲')
    expect(api.isSelected('甲')).toBe(true)
    expect(api.isSelected('乙')).toBe(false)
    el.setAttribute('selected', '乙,甲')
    expect(api.isSelected('乙')).toBe(true)
    expect(api.isSelected('甲')).toBe(true)
  })

  it('⑪ api.isEditing：行内编辑态查询（限行 / 限行限列 / 退出后回落 false）', () => {
    const el = mount({
      columns: JSON.stringify([
        { key: 'name', title: '名称', editable: true },
        { key: 'status', title: '状态' },
      ]),
      data: DATA,
      'row-key': 'name',
      editable: '',
    })
    const apis: TableStructuralApi[] = []
    el.structuralRenderers = { bodyRow: ({ api }) => apis.push(api) }
    const api = apis[apis.length - 1]!
    expect(api.isEditing('甲')).toBe(false)
    // 双击 name 格进入编辑（沿用既有测试的 dblclick 派发惯例）
    const td = el.shadowRoot!.querySelector<HTMLElement>('tr[data-key="甲"] td[data-col="name"]')!
    td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(api.isEditing('甲')).toBe(true)
    expect(api.isEditing('甲', 'name')).toBe(true)
    expect(api.isEditing('甲', 'status')).toBe(false)
    expect(api.isEditing('乙')).toBe(false)
    // Esc 取消编辑 → 回落 false（data-editing 标记随 exitEdit 清除）
    const input = td.querySelector('input')
    input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(api.isEditing('甲')).toBe(false)
    expect(api.isEditing('甲', 'name')).toBe(false)
  })

  it('⑫ api.toggleExpand：树行展开/折叠写 expanded 属性 + 派 oas-expand + 子行随之渲染/消失', () => {
    const el = mount({
      columns: COLUMNS,
      'row-key': 'name',
      data: JSON.stringify([{ name: '甲', status: 'ok', children: [{ name: '甲子', status: 'ok' }] }]),
    })
    const apis: TableStructuralApi[] = []
    el.structuralRenderers = { bodyRow: ({ api }) => apis.push(api) }
    const api = apis[apis.length - 1]!
    expect(el.shadowRoot!.querySelectorAll('tr[data-key="甲子"]')).toHaveLength(0)
    const events: Array<{ key: unknown; expanded: unknown }> = []
    el.addEventListener('oas-expand', (e) => {
      const d = (e as CustomEvent).detail
      events.push({ key: d.key, expanded: d.expanded })
    })
    api.toggleExpand('甲')
    expect(el.getAttribute('expanded')).toBe('甲')
    expect(events).toEqual([{ key: '甲', expanded: true }])
    expect(el.shadowRoot!.querySelectorAll('tr[data-key="甲子"]'), '展开后子行渲染').toHaveLength(1)
    // 再切一次：折叠
    api.toggleExpand('甲')
    expect(el.getAttribute('expanded')).toBe('')
    expect(events).toEqual([
      { key: '甲', expanded: true },
      { key: '甲', expanded: false },
    ])
    expect(el.shadowRoot!.querySelectorAll('tr[data-key="甲子"]')).toHaveLength(0)
    // 空串 no-op：不写属性不派事件
    api.toggleExpand('')
    expect(el.getAttribute('expanded')).toBe('')
    expect(events).toHaveLength(2)
  })

  it('⑬ api.gotoPage：写 current 属性翻页生效；超页由既有钳制归位；非有限数 no-op', () => {
    const el = mount({
      columns: COLUMNS,
      data: JSON.stringify([
        { name: '一', status: 'ok' },
        { name: '二', status: 'ok' },
        { name: '三', status: 'ok' },
        { name: '四', status: 'ok' },
        { name: '五', status: 'ok' },
      ]),
      pagination: '',
      'page-size': '2',
      'row-key': 'name',
    })
    const holder: { api: TableStructuralPaginationApi | null } = { api: null }
    el.structuralRenderers = {
      pagination: ({ api }) => {
        holder.api = api
      },
    }
    // 第 1 页：current 属性未写（读侧默认 1），DOM 呈现第一行切片
    expect(el.getAttribute('current')).toBeNull()
    expect(el.shadowRoot!.querySelector('tr[data-key="三"]')).toBeNull()
    holder.api!.gotoPage(3)
    expect(el.getAttribute('current')).toBe('3')
    // 第 3 页恰一行（5 行 ÷ 每页 2）
    expect(el.shadowRoot!.querySelectorAll('tbody tr[data-key]')).toHaveLength(1)
    expect(el.shadowRoot!.querySelectorAll('tr[data-key="五"]')).toHaveLength(1)
    // 超页（99 > pageCount 3）：写属性后由既有钳制写回归位到末页
    holder.api!.gotoPage(99)
    expect(el.getAttribute('current')).toBe('3')
    // 非有限数 no-op
    holder.api!.gotoPage(Number.NaN)
    holder.api!.gotoPage(Number.POSITIVE_INFINITY)
    expect(el.getAttribute('current')).toBe('3')
    // < 1 不做本地钳制：读侧归一化（normalizeCurrent）兜底按第 1 页渲染（属性值原样保留）
    holder.api!.gotoPage(0)
    expect(el.shadowRoot!.querySelectorAll('tbody tr[data-key]')).toHaveLength(2)
    expect(el.shadowRoot!.querySelectorAll('tr[data-key="一"]')).toHaveLength(1)
    // 小数按整数截断：gotoPage(2.5) → 第 2 页（写 current="2"，不产生「第 2.5 页」窗口错位）
    holder.api!.gotoPage(2.5)
    expect(el.getAttribute('current')).toBe('2')
    const pageKeys = [...el.shadowRoot!.querySelectorAll<HTMLTableRowElement>('tbody tr[data-key]')].map((tr) =>
      tr.getAttribute('data-key'),
    )
    expect(pageKeys, '第 2 页 = 第 3、4 行（三、四）').toEqual(['三', '四'])
    // 负小数边界：Math.trunc(-0.5) = -0 → String(-0) = "0" → 写 current="0"；
    // 渲染走既有 normalizeCurrent 回落口径（0 不大于 1 → 按第 1 页呈现，属性值保留 "0"）
    holder.api!.gotoPage(-0.5)
    expect(el.getAttribute('current')).toBe('0')
    expect(el.shadowRoot!.querySelectorAll('tr[data-key="一"]')).toHaveLength(1)
    expect(el.shadowRoot!.querySelector('tr[data-key="三"]'), '第 1 页不含第 3 行').toBeNull()
  })

  it('⑭ 零漂移：未注册任何钩子时空态/loading/分页默认 DOM 与批前一致', () => {
    const empty = mount({ columns: COLUMNS, data: '[]' })
    expect(empty.shadowRoot!.querySelector('td.empty')?.textContent).toBe('暂无数据')
    expect(empty.shadowRoot!.querySelectorAll('td.empty')).toHaveLength(1)

    const loading = mount({ columns: COLUMNS, loading: '' })
    expect(loading.shadowRoot!.querySelectorAll('tr[part="loading-row"]')).toHaveLength(1)
    expect(loading.shadowRoot!.querySelectorAll('td.loading span.spin')).toHaveLength(1)
    expect(loading.shadowRoot!.querySelector('td.loading')?.textContent).toBe('加载中…')

    const paged = mount({ columns: COLUMNS, data: DATA, pagination: '', 'page-size': '1' })
    expect(paged.shadowRoot!.querySelectorAll('.pagination oas-pagination')).toHaveLength(1)
  })

  it('⑮ 四槽 ctx 向后兼容：既有注册者拿到的 ctx 增加只增不改的 api 字段', () => {
    const el = mount({ columns: COLUMNS, data: DATA, checkable: '', 'row-key': 'name' })
    const apis: TableStructuralApi[] = []
    el.structuralRenderers = {
      bodyCell: ({ api }) => apis.push(api),
      headerRow: ({ api }) => apis.push(api),
      headerCell: ({ api }) => apis.push(api),
    }
    // 2 行 × 2 列 bodyCell + 1 headerRow + 2 headerCell = 7 次调用，全部携带 api
    expect(apis).toHaveLength(7)
    for (const api of apis) {
      expect(typeof api.isSelected).toBe('function')
      expect(typeof api.isEditing).toBe('function')
      expect(typeof api.toggleExpand).toBe('function')
    }
  })

  it('⑯ 快路径 settleEdit 完整退出编辑：仅 selected 变化 → 编辑器移除、标记清除、api.isEditing 回落 false', () => {
    // 状态撕裂回归（api.isEditing 读 DOM 标记 vs 编辑逻辑态）：快路径（仅 selected 变化）
    // 不重建行 DOM，settleEdit 若只清逻辑态会留下「编辑器在、data-editing 在
    // （isEditing 恒 true）、Enter/Esc 已不响应」的三方撕裂。修复 = 完整退出编辑
    // （移除编辑器 / paintCell 还原 / 清 td+th 标记），与全量重建路径同口径。
    const el = mount({
      columns: JSON.stringify([
        { key: 'name', title: '名称', editable: true },
        { key: 'status', title: '状态' },
      ]),
      data: DATA,
      'row-key': 'name',
      editable: '',
    })
    const apis: TableStructuralApi[] = []
    el.structuralRenderers = { bodyRow: ({ api }) => apis.push(api) }
    const api = apis[apis.length - 1]!
    const td = el.shadowRoot!.querySelector<HTMLElement>('tr[data-key="甲"] td[data-col="name"]')!
    td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    const input = td.querySelector<HTMLInputElement>('input.cell-editor')
    expect(input!.tagName, '双击进入编辑（input 通道）').toBe('INPUT')
    expect(api.isEditing('甲')).toBe(true)
    // 前置自证：进入编辑时表头高亮标记在场（使下方清除断言非恒真）
    expect(
      el.shadowRoot!.querySelector('th[data-key="name"]')!.getAttribute('data-editing-col'),
      '进入编辑：th[data-editing-col] 表头标记在场',
    ).toBe('true')
    input!.value = '改名'
    // 仅选择变化（另一行）：渲染签名一致 → 行级局部补丁快路径，行 DOM 不重建
    el.setAttribute('selected', '乙')
    expect(td.isConnected, '快路径不重建行 DOM').toBe(true)
    expect(el.shadowRoot!.querySelector('input.cell-editor'), '编辑器已移除（完整退出编辑）').toBeNull()
    expect(el.shadowRoot!.querySelector('td[data-editing="true"]'), 'td[data-editing] 标记已清除').toBeNull()
    expect(
      el.shadowRoot!.querySelector('th[data-editing-col="true"]'),
      'th[data-editing-col] 表头标记已清除',
    ).toBeNull()
    expect(td.textContent, '单元格还原为常规展示内容').toContain('甲')
    expect(api.isEditing('甲'), 'api.isEditing 经 DOM 标记读渲染态 → 回落 false').toBe(false)
    expect(api.isEditing('甲', 'name')).toBe(false)
    // 数据未改写：取消是静默的（无 oas-edit / oas-edit-cancel），data 原样
    expect((JSON.parse(el.getAttribute('data')!) as Array<Record<string, unknown>>)[0]!['name']).toBe('甲')
  })
})
