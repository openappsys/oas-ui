/**
 * oas-gantt 任务网格面板（task-columns 多列 + checkable 复选列 + 列头行）。
 * 契约要点：
 * - 缺省（两个属性都没有）单列形态逐节点不变（回归零漂移）；
 * - task-columns：JSON 数组 [{ key, title?, width?, align? }]；非法 JSON devWarn 一次并回落单列；
 * - checkable：网格最左复选列（32px，token --oas-gantt-check-width），列头三态全选，
 *   行复选与 selection property 双向同步（同一契约派 oas-selection-change，不新增事件名）；
 * - template[slot="row"] 优先于 task-columns（devWarn 一次）；show-effort 与 task-columns 同开时
 *   task-columns 优先（effort 列不再单独渲染）；
 * - parts：task-grid / task-grid-cell / task-grid-head / check-cell；
 *   表头 role="row" + 单元格 role="columnheader"；复选 role="checkbox" + aria-checked。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASGantt } from './index.js'
import { parseTaskColumns, taskCellText, checkStateFor } from './gantt-helpers.js'
import type { GanttTask } from './index.js'

function mount(attrs: Record<string, string> = {}, tasks?: GanttTask[]): OASGantt {
  const el = new OASGantt()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (tasks) el.setAttribute('tasks', JSON.stringify(tasks))
  document.body.appendChild(el)
  return el
}

function shadowOf(el: OASGantt): ShadowRoot {
  return el.shadowRoot!
}

/** 纯函数：列声明解析 */
describe('parseTaskColumns（task-columns 列声明解析）', () => {
  it('合法 JSON 字符串：逐列归一（title 缺省用 key、width 保留、align 缺省 left）', () => {
    const r = parseTaskColumns('[{"key":"name","title":"工单"},{"key":"qty","width":80},{"key":"process"}]')
    expect(r.ok).toBe(true)
    expect(r.columns).toEqual([
      { key: 'name', title: '工单', align: 'left' },
      { key: 'qty', title: 'qty', width: 80, align: 'left' },
      { key: 'process', title: 'process', align: 'left' },
    ])
  })

  it('数组输入直通（property 通道容错）；非法 align 回落 left、非法 width 回落 flex', () => {
    const r = parseTaskColumns([
      { key: 'a', align: 'center' },
      { key: 'b', align: 'middle', width: -3 },
    ])
    expect(r.ok).toBe(true)
    expect(r.columns[0]).toEqual({ key: 'a', title: 'a', align: 'center' })
    expect(r.columns[1]).toEqual({ key: 'b', title: 'b', align: 'left' })
    expect(r.columns[1]!.width).toBeUndefined()
  })

  it('空数组：ok=true 且零列（静默回落单列，不告警）', () => {
    const r = parseTaskColumns('[]')
    expect(r.ok).toBe(true)
    expect(r.columns).toEqual([])
  })

  it('非法 JSON 字符串 / 非数组：ok=false（调用方 devWarn 一次并回落单列）', () => {
    expect(parseTaskColumns('not-json').ok).toBe(false)
    expect(parseTaskColumns('{"key":"a"}').ok).toBe(false)
    expect(parseTaskColumns(null).ok).toBe(false)
    expect(parseTaskColumns(undefined).ok).toBe(false)
    expect(parseTaskColumns(42).ok).toBe(false)
  })

  it('条目缺 key / key 非字符串被丢弃；全部无效时 ok=false', () => {
    const partial = parseTaskColumns('[{"title":"无 key"},{"key":"","title":"空 key"},{"key":"ok"}]')
    expect(partial.ok).toBe(true)
    expect(partial.columns.length).toBe(1)
    expect(partial.columns[0]!.key).toBe('ok')
    expect(parseTaskColumns('[{"title":"无 key"}]').ok).toBe(false)
  })
})

/** 纯函数：单元格取值展示 */
describe('taskCellText（网格单元格取值）', () => {
  it('undefined / null → 空串；数字 → 字符串；字符串原样', () => {
    expect(taskCellText(undefined)).toBe('')
    expect(taskCellText(null)).toBe('')
    expect(taskCellText(120)).toBe('120')
    expect(taskCellText('OP-10')).toBe('OP-10')
  })

  it('对象/数组 → JSON.stringify（纯展示）', () => {
    expect(taskCellText({ a: 1 })).toBe('{"a":1}')
    expect(taskCellText([1, 2])).toBe('[1,2]')
  })
})

/** 纯函数：列头三态 */
describe('checkStateFor（复选列头三态）', () => {
  it('0/全选/部分 → false / true / mixed；total=0 恒 false', () => {
    expect(checkStateFor(0, 3)).toBe('false')
    expect(checkStateFor(3, 3)).toBe('true')
    expect(checkStateFor(2, 3)).toBe('mixed')
    expect(checkStateFor(0, 0)).toBe('false')
    expect(checkStateFor(1, 0)).toBe('false')
  })
})

const GRID_TASKS: GanttTask[] = [
  { id: 't1', name: '铣平面工序', start: '2026-03-02', end: '2026-03-06', progress: 40, process: 'OP-10', qty: 120 },
  { id: 't2', name: '钻孔工序', start: '2026-03-05', end: '2026-03-09', progress: 20, process: 'OP-20', qty: 80 },
  { id: 'm1', name: '批次交付', start: '2026-03-16', process: 'OP-30' },
]

const COLS = JSON.stringify([
  { key: 'name', title: '工单名称' },
  { key: 'process', title: '工序', width: 72, align: 'center' },
  { key: 'qty', title: '数量' },
])

describe('OASGantt 任务网格（task-columns / checkable）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('缺省零漂移：无 task-columns / checkable 时无网格节点、无 has-grid、无 role=row、名称单列原样', () => {
    const el = mount({ tasks: JSON.stringify(GRID_TASKS) })
    const shadow = shadowOf(el)
    expect(shadow.querySelectorAll('.task-grid').length).toBe(0)
    expect(shadow.querySelectorAll('.task-cell').length).toBe(0)
    expect(shadow.querySelectorAll('.check-cell').length).toBe(0)
    expect(shadow.querySelectorAll('.gantt-check').length).toBe(0)
    const head = shadow.querySelector<HTMLElement>('.side-head')!
    expect(head.classList.contains('has-grid')).toBe(false)
    expect(head.getAttribute('role')).toBeNull()
    // 单列名称通道原样：.row-name > .name 存在
    expect(shadow.querySelectorAll('.row-name .name').length).toBe(3)
  })

  it('列头渲染：has-grid + role=row 容器 + columnheader 单元格（title 缺省用 key）', () => {
    const el = mount({ tasks: JSON.stringify(GRID_TASKS), 'task-columns': COLS })
    const head = shadowOf(el).querySelector<HTMLElement>('.side-head')!
    expect(head.classList.contains('has-grid')).toBe(true)
    const rowEl = head.querySelector<HTMLElement>('[role="row"]')!
    expect(rowEl.getAttribute('part')).toBe('task-grid-head')
    const headers = [...head.querySelectorAll<HTMLElement>('.head-col')]
    expect(headers.length).toBe(3)
    // 行内所有子级必须是 columnheader（复选列也包 columnheader），row 不得直接持有 role=checkbox
    const rowChildren = [...rowEl.children].filter((c) => !c.hasAttribute('aria-hidden'))
    expect(rowChildren.every((c) => c.getAttribute('role') === 'columnheader')).toBe(true)
    expect(headers.map((h) => h.textContent)).toEqual(['工单名称', '工序', '数量'])
  })

  it('行单元格渲染：数量与列一致；取值口径（数字转字符串/缺失空串）；treeitem 语义沿用', () => {
    const el = mount({ tasks: JSON.stringify(GRID_TASKS), 'task-columns': COLS })
    const rows = [...shadowOf(el).querySelectorAll<HTMLElement>('.row-name')]
    expect(rows.length).toBe(3)
    const r1cells = [...rows[0]!.querySelectorAll<HTMLElement>('.task-cell')].map((c) => c.textContent)
    expect(r1cells).toEqual(['铣平面工序', 'OP-10', '120'])
    // 缺失字段显示空串（m1 无 qty）
    const r3cells = [...rows[2]!.querySelectorAll<HTMLElement>('.task-cell')].map((c) => c.textContent)
    expect(r3cells).toEqual(['批次交付', 'OP-30', ''])
    // 行语义沿用 treeitem
    expect(rows[0]!.getAttribute('role')).toBe('treeitem')
    expect(rows[0]!.getAttribute('aria-level')).toBe('1')
  })

  it('宽度分配：width 声明 → 定宽（px 内联，非均分列）；未声明 → flex 均分；表头与行共用同一模板', () => {
    const el = mount({ tasks: JSON.stringify(GRID_TASKS), 'task-columns': COLS })
    const headCols = [...shadowOf(el).querySelectorAll<HTMLElement>('.side-head .head-col')]
    expect(headCols[1]!.style.getPropertyValue('width')).toBe('72px')
    expect(headCols[1]!.classList.contains('col-flex')).toBe(false)
    expect(headCols[0]!.style.getPropertyValue('width')).toBe('')
    expect(headCols[0]!.classList.contains('col-flex')).toBe(true)
    const row0 = shadowOf(el).querySelectorAll<HTMLElement>('.row-name')[0]!
    const cells = [...row0.querySelectorAll<HTMLElement>('.task-cell')]
    expect(cells[1]!.style.getPropertyValue('width')).toBe('72px')
    expect(cells[1]!.classList.contains('col-flex')).toBe(false)
    expect(cells[0]!.classList.contains('col-flex')).toBe(true)
  })

  it('align：声明 center/right → 行与表头单元格 data-align 同步；缺省无 data-align', () => {
    const el = mount({ tasks: JSON.stringify(GRID_TASKS), 'task-columns': COLS })
    const headCols = [...shadowOf(el).querySelectorAll<HTMLElement>('.side-head .head-col')]
    expect(headCols[0]!.getAttribute('data-align')).toBeNull()
    expect(headCols[1]!.getAttribute('data-align')).toBe('center')
    const cells = [...shadowOf(el).querySelectorAll<HTMLElement>('.row-name .task-cell')]
    expect(cells[1]!.getAttribute('data-align')).toBe('center')
    expect(cells[0]!.getAttribute('data-align')).toBeNull()
  })

  it('parts 暴露：task-grid / task-grid-cell / task-grid-head / check-cell', () => {
    const el = mount({ tasks: JSON.stringify(GRID_TASKS), 'task-columns': COLS, checkable: '' })
    const shadow = shadowOf(el)
    expect(shadow.querySelector<HTMLElement>('.row-name .task-grid')!.getAttribute('part')).toContain('task-grid')
    expect(shadow.querySelector<HTMLElement>('.row-name .task-cell')!.getAttribute('part')).toBe('task-grid-cell')
    expect(shadow.querySelector<HTMLElement>('.side-head [role="row"]')!.getAttribute('part')).toBe('task-grid-head')
    expect(shadow.querySelector<HTMLElement>('.row-name .check-cell')!.getAttribute('part')).toBe('check-cell')
    // 复选格语义
    const check = shadow.querySelector<HTMLElement>('.row-name .gantt-check')!
    expect(check.getAttribute('role')).toBe('checkbox')
    expect(check.getAttribute('aria-checked')).toBe('false')
  })

  it('对象值单元格：JSON.stringify 展示（纯展示不劫持）', () => {
    const tasks: GanttTask[] = [{ id: 'o1', name: '对象行', start: '2026-03-02', spec: { a: 1 } }]
    const el = mount({ tasks: JSON.stringify(tasks), 'task-columns': JSON.stringify([{ key: 'spec' }]) })
    const cell = shadowOf(el).querySelector<HTMLElement>('.row-name .task-cell')!
    expect(cell.textContent).toBe('{"a":1}')
  })

  it('非法 task-columns：devWarn 一次并回落单列形态（重渲染不重复告警）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ tasks: JSON.stringify(GRID_TASKS), 'task-columns': '{broken' })
      const shadow = shadowOf(el)
      expect(shadow.querySelectorAll('.task-grid').length).toBe(0)
      expect(shadow.querySelectorAll('.row-name .name').length).toBe(3)
      expect(warn.mock.calls.some((c) => String(c[0]).includes('task-columns'))).toBe(true)
      el.requestUpdate()
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('task-columns')).length).toBe(1)
      // 修复后正常出网格
      el.setAttribute('task-columns', COLS)
      expect(shadowOf(el).querySelectorAll('.task-cell').length).toBe(9)
    } finally {
      warn.mockRestore()
    }
  })

  it('空数组 task-columns：静默回落单列（零告警）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ tasks: JSON.stringify(GRID_TASKS), 'task-columns': '[]' })
      expect(shadowOf(el).querySelectorAll('.task-grid').length).toBe(0)
      expect(warn).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  it('template[slot="row"] 优先：task-columns 被忽略 + devWarn 一次（重渲染不重复）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = new OASGantt()
      const tpl = document.createElement('template')
      tpl.setAttribute('slot', 'row')
      tpl.innerHTML = '<span class="host-tag" data-task-name></span>'
      el.appendChild(tpl)
      el.setAttribute('task-columns', COLS)
      el.setAttribute('tasks', JSON.stringify(GRID_TASKS))
      document.body.appendChild(el)
      const shadow = shadowOf(el)
      expect(shadow.querySelectorAll('.task-grid').length).toBe(0)
      expect(shadow.querySelectorAll('.row-name .host-tag').length).toBe(3)
      // 表头同谓词回落：不得出现网格列头（否则表头网格 + 行模板两套形态打架）
      const head = shadow.querySelector('.side-head')!
      expect(head.classList.contains('has-grid')).toBe(false)
      expect(head.querySelectorAll('[role="columnheader"]').length).toBe(0)
      expect(warn.mock.calls.some((c) => String(c[0]).includes('task-columns'))).toBe(true)
      el.requestUpdate()
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('task-columns')).length).toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('show-effort 与 task-columns 同开：task-columns 优先，effort 列不再单独渲染', () => {
    const tasks: GanttTask[] = GRID_TASKS.map((t, i) => ({ ...t, effort: 8 + i }))
    const el = mount({ tasks: JSON.stringify(tasks), 'task-columns': COLS, 'show-effort': '' })
    const shadow = shadowOf(el)
    expect(shadow.querySelectorAll('.row-name .effort').length).toBe(0)
    expect(shadow.querySelector('.side-head .head-effort')).toBeNull()
    expect(shadow.querySelectorAll('.task-cell').length).toBe(9)
  })

  it('checkable 缺省关：无复选格（checkable="false" 同样关）', () => {
    const el = mount({ tasks: JSON.stringify(GRID_TASKS), 'task-columns': COLS })
    expect(shadowOf(el).querySelectorAll('.check-cell').length).toBe(0)
    const el2 = mount({ tasks: JSON.stringify(GRID_TASKS), 'task-columns': COLS, checkable: 'false' })
    expect(shadowOf(el2).querySelectorAll('.check-cell').length).toBe(0)
  })

  it('checkable 开启：行复选勾选 → selection 更新并派发 oas-selection-change；列头三态随动', () => {
    const el = mount({ tasks: JSON.stringify(GRID_TASKS), 'task-columns': COLS, checkable: '' })
    const shadow = shadowOf(el)
    const events: string[][] = []
    el.addEventListener('oas-selection-change', (e) => events.push((e as CustomEvent).detail.ids))
    const headCheck = shadow.querySelector<HTMLElement>('.side-head .gantt-check')!
    expect(headCheck.getAttribute('aria-checked')).toBe('false')
    expect(headCheck.getAttribute('aria-label')).toBe('全选')
    // 勾一行 → 行 true、列头 mixed、事件含该 id
    const checks = [...shadow.querySelectorAll<HTMLElement>('.row-name .gantt-check')]
    expect(checks.length).toBe(3)
    ;(checks[0] as HTMLButtonElement).click()
    expect(checks[0]!.getAttribute('aria-checked')).toBe('true')
    expect(headCheck.getAttribute('aria-checked')).toBe('mixed')
    expect(el.selection).toEqual(['t1'])
    expect(events.at(-1)).toEqual(['t1'])
    // 再勾一行仍 mixed；勾满 → true
    ;(checks[1] as HTMLButtonElement).click()
    ;(checks[2] as HTMLButtonElement).click()
    expect(headCheck.getAttribute('aria-checked')).toBe('true')
    // 取消一行 → 回落 mixed
    ;(checks[2] as HTMLButtonElement).click()
    expect(headCheck.getAttribute('aria-checked')).toBe('mixed')
  })

  it('列头全选/取消：click 全选所有行 → selection 全量 + true；再点全清', () => {
    const el = mount({ tasks: JSON.stringify(GRID_TASKS), 'task-columns': COLS, checkable: '' })
    const headCheck = shadowOf(el).querySelector<HTMLButtonElement>('.side-head .gantt-check')!
    const events: string[][] = []
    el.addEventListener('oas-selection-change', (e) => events.push((e as CustomEvent).detail.ids))
    headCheck.click()
    expect(el.selection.sort()).toEqual(['m1', 't1', 't2'])
    expect(events.at(-1)!.sort()).toEqual(['m1', 't1', 't2'])
    headCheck.click()
    expect(el.selection).toEqual([])
  })

  it('selection property 写入 → 行复选与列头三态同步（双向）', () => {
    const el = mount({ tasks: JSON.stringify(GRID_TASKS), 'task-columns': COLS, checkable: '' })
    const shadow = shadowOf(el)
    el.selection = ['t2']
    const checks = [...shadow.querySelectorAll<HTMLElement>('.row-name .gantt-check')]
    expect(checks[1]!.getAttribute('aria-checked')).toBe('true')
    expect(checks[0]!.getAttribute('aria-checked')).toBe('false')
    expect(shadow.querySelector<HTMLElement>('.side-head .gantt-check')!.getAttribute('aria-checked')).toBe('mixed')
  })

  it('点行名（非复选格）→ 行复选随 selection 写回（syncSelection 单一漏斗回归）', () => {
    const el = mount({ tasks: JSON.stringify(GRID_TASKS), 'task-columns': COLS, checkable: '' })
    const shadow = shadowOf(el)
    // 行选择走 pointerdown → document pointerup（docRowPendingUp 收口），happy-dom 模拟同一路径
    shadow
      .querySelectorAll('.row-name')[1]!
      .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }))
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, pointerType: 'mouse' }))
    const checks = [...shadow.querySelectorAll<HTMLElement>('.row-name .gantt-check')]
    expect(checks[1]!.getAttribute('aria-checked')).toBe('true')
    expect(checks[0]!.getAttribute('aria-checked')).toBe('false')
    expect(shadow.querySelector<HTMLElement>('.side-head .gantt-check')!.getAttribute('aria-checked')).toBe('mixed')
  })

  it('selection 含已不存在任务 id：三态只按现有行计算（剪枝后重建）', () => {
    const el = mount({ tasks: JSON.stringify(GRID_TASKS), 'task-columns': COLS, checkable: '' })
    const shadow = shadowOf(el)
    el.selection = ['ghost-id']
    expect(shadow.querySelector<HTMLElement>('.side-head .gantt-check')!.getAttribute('aria-checked')).toBe('false')
  })

  it('空 rows：列头全选零变化零事件（守卫回归）', () => {
    const el = mount({ tasks: '[]', 'task-columns': COLS, checkable: '' })
    const events: string[][] = []
    el.addEventListener('oas-selection-change', (e) => events.push((e as CustomEvent).detail.ids))
    const headCheck = shadowOf(el).querySelector<HTMLButtonElement>('.side-head .gantt-check')
    expect(headCheck?.tagName, '空数据仍渲染列头复选格').toBe('BUTTON')
    headCheck!.click()
    expect(el.selection).toEqual([])
    expect(events.length, '零行不派发事件').toBe(0)
  })

  it('表头容器 role=grid（columnheader 的合法父语义），非网格态移除 role', () => {
    const el = mount({ tasks: JSON.stringify(GRID_TASKS), 'task-columns': COLS, checkable: '' })
    const shadow = shadowOf(el)
    expect(shadow.querySelector('.side-head')!.getAttribute('role')).toBe('grid')
    // 非网格态：role 清理，part 复位
    el.removeAttribute('task-columns')
    el.requestUpdate()
    const head = shadow.querySelector('.side-head')!
    expect(head.getAttribute('role')).toBeNull()
    expect(head.classList.contains('has-grid')).toBe(false)
  })

  it('复选列宽 token：--oas-gantt-check-width 缺省 32px（表头与行共用）', () => {
    const el = mount({ tasks: JSON.stringify(GRID_TASKS), 'task-columns': COLS, checkable: '' })
    const css = shadowOf(el).querySelector('style')!.textContent ?? ''
    expect(css).toMatch(/--oas-gantt-check-width, 32px/)
  })

  it('windowed + checkable：devWarn 一次；列头全选只作用于已装载切片', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = new OASGantt()
      el.setAttribute('windowed', '')
      el.setAttribute('total', '10')
      el.setAttribute('window-start', '0')
      el.setAttribute('range-start', '2026-03-01')
      el.setAttribute('range-end', '2026-03-31')
      el.setAttribute('task-columns', COLS)
      el.setAttribute('checkable', '')
      el.setAttribute('tasks', JSON.stringify(GRID_TASKS.slice(0, 2)))
      document.body.appendChild(el)
      expect(warn.mock.calls.some((c) => String(c[0]).includes('windowed'))).toBe(true)
      const windowedWarnCount = () =>
        warn.mock.calls.filter((c) => String(c[0]).includes('windowed') && String(c[0]).includes('checkable')).length
      expect(windowedWarnCount(), 'windowed + checkable 告警只发一次').toBe(1)
      el.requestUpdate()
      expect(windowedWarnCount(), '重复 update 不重复告警（去重标记生效）').toBe(1)
      // 列头全选：只写当前装载的 2 行（total=10），事件 detail 只有切片 id
      const headCheck = shadowOf(el).querySelector<HTMLButtonElement>('.side-head .gantt-check')!
      // 读屏名称与 title 同口径（windowed → 已装载切片说明）
      expect(headCheck.getAttribute('aria-label'), 'windowed 下读屏名随作用域切换').toBe(headCheck.title)
      headCheck.click()
      expect(el.selection.sort()).toEqual(['t1', 't2'])
    } finally {
      warn.mockRestore()
    }
  })
})
