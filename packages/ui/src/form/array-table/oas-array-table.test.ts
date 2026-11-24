import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASArrayTable } from './index.js'
import { OASForm } from '../form/index.js'
import '../input/index.js'
import '../input-number/index.js'

const COLUMNS = [
  { key: 'nick', label: '昵称' },
  { key: 'age', label: '年龄', width: 80, align: 'right' as const },
  { key: 'note', label: '备注', hidden: true },
]

const TEMPLATE = `
  <oas-form-item label="昵称" data-schema-key="field:users.[].nick">
    <oas-input name="nick"></oas-input>
  </oas-form-item>
  <oas-form-item label="年龄" data-schema-key="field:users.[].age">
    <oas-input-number name="age"></oas-input-number>
  </oas-form-item>
  <oas-form-item label="备注" data-schema-key="field:users.[].note">
    <oas-input name="note"></oas-input>
  </oas-form-item>
`

function makeTable(
  attrs: Record<string, string> = { name: 'users', rows: '2' },
  templateHTML = TEMPLATE,
): { form: OASForm; table: OASArrayTable } {
  const form = new OASForm()
  const table = new OASArrayTable()
  for (const [k, v] of Object.entries(attrs)) table.setAttribute(k, v)
  table.setAttribute('columns', JSON.stringify(COLUMNS))
  if (templateHTML !== '') {
    const tpl = document.createElement('template')
    tpl.innerHTML = templateHTML
    table.appendChild(tpl)
  }
  form.appendChild(table)
  document.body.appendChild(form)
  return { form, table }
}

function rows(table: OASArrayTable): HTMLElement[] {
  return [...table.querySelectorAll<HTMLElement>('[data-oas-form-list-item]')]
}

function actionBtn(table: OASArrayTable, row: number, action: string): HTMLButtonElement {
  return rows(table)[row]!.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!
}

function headCells(table: OASArrayTable): HTMLElement[] {
  return [...table.shadowRoot!.querySelectorAll<HTMLElement>('[role="columnheader"]')]
}

function liveText(table: OASArrayTable): string {
  return table.shadowRoot!.querySelector<HTMLElement>('[part="live"]')!.textContent ?? ''
}

function setRowValues(table: OASArrayTable, index: number, nick: string, age: string): void {
  rows(table)[index]!.querySelector('oas-input')!.setAttribute('value', nick)
  rows(table)[index]!.querySelector('oas-input-number')!.setAttribute('value', age)
}

function paste(table: OASArrayTable, text: string, target: Element): void {
  const event = new Event('paste', { bubbles: true, composed: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', {
    value: { getData: (type: string) => (type === 'text/plain' ? text : '') },
  })
  target.dispatchEvent(event)
}

function pointer(type: string, target: Element, clientX: number): void {
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, composed: true, clientX, clientY: 0, pointerId: 1 }))
}

describe('oas-array-table 结构与布局', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('ARIA 表格语义：role=table / columnheader / row / cell', () => {
    const { table } = makeTable()
    const wrapper = table.shadowRoot!.querySelector<HTMLElement>('[role="table"]')!
    expect(wrapper.getAttribute('aria-label')).toBe('数据表格')
    // 列头 = 3 列 + 行操作列
    expect(headCells(table)).toHaveLength(4)
    expect(headCells(table).map((cell) => cell.textContent)).toEqual(['昵称', '年龄', '备注', '行操作'])
    const first = rows(table)[0]!
    expect(first.getAttribute('role')).toBe('row')
    expect(first.querySelectorAll('[role="cell"]')).toHaveLength(4)
  })

  it('label 属性覆盖表格可访问名', () => {
    const { table } = makeTable({ name: 'users', rows: '1', label: '成员表' })
    expect(table.shadowRoot!.querySelector('[role="table"]')!.getAttribute('aria-label')).toBe('成员表')
  })

  it('列宽 / 对齐 / 隐藏落到轨道串与单元格内联样式', () => {
    const { table } = makeTable({ name: 'users', rows: '1' })
    const wrapper = rows(table)[0]!
    expect(wrapper.style.display).toBe('grid')
    expect(wrapper.style.gridTemplateColumns).toContain('minmax(0, 1fr) 80px')
    const cells = [...wrapper.querySelectorAll<HTMLElement>('[role="cell"]')]
    expect(cells[1]!.style.textAlign).toBe('right')
    // 隐藏列保留单元格与值，只隐藏视觉
    expect(cells[2]!.style.display).toBe('none')
    // 隐藏列的列头同样不占轨道
    expect(headCells(table)[2]!.style.display).toBe('none')
  })

  it('rows 属性驱动初始行数（缺省 0 行 + 空态）', () => {
    const { table } = makeTable({ name: 'users' })
    expect(rows(table)).toHaveLength(0)
    const empty = table.shadowRoot!.querySelector<HTMLElement>('[part="empty"]')!
    expect(empty.hidden).toBe(false)
    const head = table.shadowRoot!.querySelector<HTMLElement>('[part="head"]')!
    expect(head.hidden).toBe(true)
  })

  it('字段 name 按行索引化（list name 前缀）', () => {
    const { table } = makeTable({ name: 'users', rows: '2' })
    expect(rows(table)[0]!.querySelector('oas-input')!.getAttribute('name')).toBe('users.0.nick')
    expect(rows(table)[1]!.querySelector('oas-input-number')!.getAttribute('name')).toBe('users.1.age')
  })
})

describe('oas-array-table 行操作', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('末尾追加行：oas-add {index} + 播报 + 焦点进新行首字段', () => {
    const { table } = makeTable({ name: 'users', rows: '1' })
    const events: unknown[] = []
    table.addEventListener('oas-add', (e) => events.push((e as CustomEvent).detail))
    table.shadowRoot!.querySelector<HTMLButtonElement>('[part="add"]')!.click()
    expect(rows(table)).toHaveLength(2)
    expect(events).toEqual([{ index: 1 }])
    expect(liveText(table)).toContain('已添加第 2 行')
  })

  it('删除行：oas-remove {index}，剩余行重编号，焦点按位置回归', () => {
    const { table, form } = makeTable({ name: 'users', rows: '2' })
    setRowValues(table, 0, 'A', '20')
    setRowValues(table, 1, 'B', '30')
    const events: unknown[] = []
    table.addEventListener('oas-remove', (e) => events.push((e as CustomEvent).detail))
    actionBtn(table, 0, 'remove').click()
    expect(rows(table)).toHaveLength(1)
    expect(events).toEqual([{ index: 0 }])
    expect(liveText(table)).toContain('已删除第 1 行')
    // 剩余行值随行保留、name 重编号
    expect(rows(table)[0]!.querySelector('oas-input')!.getAttribute('name')).toBe('users.0.nick')
    // 隐藏列（note）保留单元格与值，只是不占视觉轨道
    expect(form.getValues()).toEqual({ users: [{ nick: 'B', age: '30', note: '' }] })
    expect(document.activeElement).toBe(actionBtn(table, 0, 'remove'))
  })

  it('复制行：oas-duplicate {from,to}，值深拷贝插入下一行，焦点落在新行按钮', () => {
    const { table, form } = makeTable({ name: 'users', rows: '2' })
    setRowValues(table, 0, 'A', '20')
    setRowValues(table, 1, 'B', '30')
    const events: unknown[] = []
    table.addEventListener('oas-duplicate', (e) => events.push((e as CustomEvent).detail))
    actionBtn(table, 0, 'duplicate').click()
    expect(rows(table)).toHaveLength(3)
    expect(events).toEqual([{ from: 0, to: 1 }])
    expect(form.getValues()).toEqual({
      users: [
        { nick: 'A', age: '20', note: '' },
        { nick: 'A', age: '20', note: '' },
        { nick: 'B', age: '30', note: '' },
      ],
    })
    expect(document.activeElement).toBe(actionBtn(table, 1, 'duplicate'))
    expect(liveText(table)).toContain('已复制第 2 行')
  })

  it('上移 / 下移：值交换（DOM 顺序不动）、oas-move {from,to}、焦点跟随行位', () => {
    const { table, form } = makeTable({ name: 'users', rows: '2' })
    setRowValues(table, 0, 'A', '20')
    setRowValues(table, 1, 'B', '30')
    const events: unknown[] = []
    table.addEventListener('oas-move', (e) => events.push((e as CustomEvent).detail))
    actionBtn(table, 1, 'move-up').click()
    expect(events).toEqual([{ from: 1, to: 0 }])
    expect(form.getValues()).toEqual({
      users: [
        { nick: 'B', age: '30', note: '' },
        { nick: 'A', age: '20', note: '' },
      ],
    })
    // 首行的「上移」已禁用 → 焦点退到该行首个可用操作钮（位置语义优先）
    expect(document.activeElement).toBe(actionBtn(table, 0, 'move-down'))
    actionBtn(table, 0, 'move-down').click()
    expect(events).toEqual([
      { from: 1, to: 0 },
      { from: 0, to: 1 },
    ])
    expect(form.getValues()).toEqual({
      users: [
        { nick: 'A', age: '20', note: '' },
        { nick: 'B', age: '30', note: '' },
      ],
    })
  })

  it('上移/下移边界禁用：首行不能上移、末行不能下移', () => {
    const { table } = makeTable({ name: 'users', rows: '2' })
    expect(actionBtn(table, 0, 'move-up').disabled).toBe(true)
    expect(actionBtn(table, 1, 'move-up').disabled).toBe(false)
    expect(actionBtn(table, 1, 'move-down').disabled).toBe(true)
    expect(actionBtn(table, 0, 'move-down').disabled).toBe(false)
  })

  it('min 为删行下界（rows 只决定初始行数）', () => {
    const { table } = makeTable({ name: 'users', rows: '2', min: '1' })
    actionBtn(table, 0, 'remove').click()
    expect(rows(table)).toHaveLength(1)
    expect(actionBtn(table, 0, 'remove').disabled).toBe(true)
  })

  it('max 上限：达到上限后新增与复制禁用', () => {
    const { table } = makeTable({ name: 'users', rows: '2', max: '2' })
    expect(table.shadowRoot!.querySelector<HTMLButtonElement>('[part="add"]')!.disabled).toBe(true)
    expect(actionBtn(table, 0, 'duplicate').disabled).toBe(true)
  })

  it('disabled：行操作与新增全部禁用', () => {
    const { table } = makeTable({ name: 'users', rows: '2', disabled: '' })
    expect(table.shadowRoot!.querySelector<HTMLButtonElement>('[part="add"]')!.disabled).toBe(true)
    for (const action of ['duplicate', 'move-up', 'move-down', 'remove']) {
      expect(actionBtn(table, 1, action).disabled).toBe(true)
    }
  })

  it('按钮可访问名走 i18n 且可被 *-text 覆盖', () => {
    const { table } = makeTable({
      name: 'users',
      rows: '1',
      'duplicate-text': '复制成员',
      'move-up-text': '上移成员',
      'move-down-text': '下移成员',
      'remove-text': '删除成员',
    })
    expect(actionBtn(table, 0, 'duplicate').getAttribute('aria-label')).toBe('复制成员')
    expect(actionBtn(table, 0, 'move-up').getAttribute('aria-label')).toBe('上移成员')
    expect(actionBtn(table, 0, 'move-down').getAttribute('aria-label')).toBe('下移成员')
    expect(actionBtn(table, 0, 'remove').getAttribute('aria-label')).toBe('删除成员')
  })
})

describe('oas-array-table 列宽拖拽与列顺序重排（展示态，不序列化）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function splitter(table: OASArrayTable, index: number): HTMLElement {
    return table.shadowRoot!.querySelectorAll<HTMLElement>('[part="column-resize"]')[index]!
  }

  it('列头分割线可见且可键盘聚焦（role=separator + aria 值）', () => {
    const { table } = makeTable({ name: 'users', rows: '1' })
    const handle = splitter(table, 0)
    expect(handle.getAttribute('role')).toBe('separator')
    expect(handle.getAttribute('aria-orientation')).toBe('vertical')
    expect(handle.tabIndex).toBe(0)
    expect(handle.getAttribute('aria-label')).toContain('调整列宽')
    expect(handle.getAttribute('aria-valuenow')).toBe('120')
    // 隐藏列不提供分割线
    expect(table.shadowRoot!.querySelectorAll('[part="column-resize"]')).toHaveLength(2)
  })

  it('指针拖拽调宽：轨道变为像素宽，列定义（columns 属性）不被改写', () => {
    const { table } = makeTable({ name: 'users', rows: '2' })
    const before = rows(table)[0]!.style.gridTemplateColumns
    pointer('pointerdown', splitter(table, 0), 100)
    pointer('pointermove', splitter(table, 0), 160)
    pointer('pointerup', splitter(table, 0), 160)
    const after = rows(table)[0]!.style.gridTemplateColumns
    expect(after).not.toBe(before)
    expect(after).toContain('180px')
    expect(splitter(table, 0).getAttribute('aria-valuenow')).toBe('180')
    // 内存态：列定义原样（不序列化）
    expect(table.columns[0]!.width).toBeUndefined()
    // 表头与行使用同一份轨道串（严格对齐）
    expect(table.shadowRoot!.querySelector<HTMLElement>('[part="head"]')!.style.gridTemplateColumns).toBe(after)
  })

  it('键盘左右键调宽（±8px，下限截断）', () => {
    const { table } = makeTable({ name: 'users', rows: '1' })
    const handle = splitter(table, 0)
    const start = Number(handle.getAttribute('aria-valuenow'))
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }))
    expect(Number(splitter(table, 0).getAttribute('aria-valuenow'))).toBe(start + 8)
    splitter(table, 0).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(Number(splitter(table, 0).getAttribute('aria-valuenow'))).toBe(start)
    // 下限：连续左移不会低于最小宽度
    for (let i = 0; i < 40; i++) {
      splitter(table, 0).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    }
    expect(Number(splitter(table, 0).getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(48)
  })

  it('列头拖拽重排：表头顺序与单元格网格位置变化，列定义与字段值不变', () => {
    const { table, form } = makeTable({ name: 'users', rows: '1' })
    setRowValues(table, 0, 'A', '20')
    const cells = [...rows(table)[0]!.querySelectorAll<HTMLElement>('[role="cell"]')]
    expect(cells[0]!.querySelector('oas-input')!.getAttribute('name')).toBe('users.0.nick')

    const heads = headCells(table)
    heads[0]!.dispatchEvent(new Event('dragstart', { bubbles: true, composed: true }))
    heads[1]!.dispatchEvent(new Event('dragover', { bubbles: true, composed: true, cancelable: true }))
    heads[1]!.dispatchEvent(new Event('drop', { bubbles: true, composed: true }))

    // 昵称列现在排第 2（网格列位置显式），年龄列第 1
    const nickCell = cells[0]!
    const ageCell = cells[1]!
    expect(nickCell.style.gridColumn).toBe('2')
    expect(ageCell.style.gridColumn).toBe('1')
    const labels = headCells(table).map((cell) => cell.textContent)
    expect(labels[0]).toContain('年龄')
    expect(labels[1]).toContain('昵称')
    // uiSchema 顺序仍权威：columns 属性与行内字段名不变，值不错位
    expect(table.columns.map((column) => column.key)).toEqual(['nick', 'age', 'note'])
    expect(form.getValues()).toEqual({ users: [{ nick: 'A', age: '20', note: '' }] })
  })
})

describe('oas-array-table 跨行粘贴 TSV', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function firstCell(table: OASArrayTable, row = 0, col = 0): HTMLElement {
    return rows(table)[row]!.querySelectorAll<HTMLElement>('[role="cell"]')[col]!
  }

  it('多行多列：从当前单元开始填充，缺行自动补行', () => {
    const { table, form } = makeTable({ name: 'users', rows: '1' })
    const events: Array<Record<string, unknown>> = []
    table.addEventListener('oas-paste', (event) => events.push((event as CustomEvent).detail))
    paste(table, 'A\t20\nB\t30', firstCell(table))
    expect(rows(table)).toHaveLength(2)
    expect(form.getValues()).toEqual({
      users: [
        { nick: 'A', age: '20', note: '' },
        { nick: 'B', age: '30', note: '' },
      ],
    })
    expect(events[0]).toMatchObject({ startRow: 0, startColumn: 0, rows: 2, columns: 2 })
    expect(liveText(table)).toContain('已粘贴 2 行 × 2 列')
  })

  it('从中间单元粘贴：起始行列偏移正确', () => {
    const { table, form } = makeTable({ name: 'users', rows: '2' })
    paste(table, 'X\nY', firstCell(table, 1, 1))
    expect(form.getValues()).toEqual({
      users: [
        { nick: '', age: '', note: '' },
        { nick: '', age: 'X', note: '' },
        { nick: '', age: 'Y', note: '' },
      ],
    })
  })

  it('单值粘贴（无制表符 / 换行）不改写默认输入行为', () => {
    const { table, form } = makeTable({ name: 'users', rows: '1' })
    paste(table, 'plain', firstCell(table))
    expect(form.getValues()).toEqual({ users: [{ nick: '', age: '', note: '' }] })
  })

  it('超过 max：截断到上限 + 一次性告警（不抛错）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { table, form } = makeTable({ name: 'users', rows: '1', max: '2' })
      paste(table, 'A\nB\nC', firstCell(table))
      expect(rows(table)).toHaveLength(2)
      expect(form.getValues()).toEqual({
        users: [
          { nick: 'A', age: '', note: '' },
          { nick: 'B', age: '', note: '' },
        ],
      })
      const warnings = warn.mock.calls.filter((call) => String(call[0]).includes('粘贴'))
      expect(warnings.length).toBe(1)
      // 再粘一次：告警不重复（一次性）
      paste(table, 'D\nE\nF', firstCell(table))
      expect(warn.mock.calls.filter((call) => String(call[0]).includes('粘贴')).length).toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('超出列数的单元格忽略（不写到行操作列 / 不产生多余字段）', () => {
    const { table, form } = makeTable({ name: 'users', rows: '1' })
    table.columns = [
      { key: 'nick', label: '昵称' },
      { key: 'age', label: '年龄' },
      { key: 'note', label: '备注' },
    ]
    paste(table, 'A\tB\tC\tD', firstCell(table))
    expect(form.getValues()).toEqual({ users: [{ nick: 'A', age: 'B', note: 'C' }] })
  })

  it('空单元格写入空串（清值语义）', () => {
    const { table, form } = makeTable({ name: 'users', rows: '1' })
    setRowValues(table, 0, 'A', '20')
    paste(table, 'B\t', firstCell(table))
    expect(form.getValues()).toEqual({ users: [{ nick: 'B', age: '', note: '' }] })
  })
})

describe('oas-array-table 行数收敛与独立使用', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('setRowCount 增补与缩减（程序化，不派发事件）', () => {
    const { table } = makeTable({ name: 'users', rows: '2' })
    const events: unknown[] = []
    table.addEventListener('oas-add', (e) => events.push(e))
    table.addEventListener('oas-remove', (e) => events.push(e))
    table.setRowCount(4)
    expect(rows(table)).toHaveLength(4)
    table.setRowCount(1)
    expect(rows(table)).toHaveLength(1)
    expect(events).toHaveLength(0)
    expect(rows(table)[0]!.querySelector('oas-input')!.getAttribute('name')).toBe('users.0.nick')
  })

  it('断开重连：观察器重挂、行不重复创建、行操作仍可用', async () => {
    const { table } = makeTable({ name: 'users', rows: '1' })
    table.remove()
    document.body.appendChild(table)
    expect(rows(table)).toHaveLength(1)
    table.shadowRoot!.querySelector<HTMLButtonElement>('[part="add"]')!.click()
    expect(rows(table)).toHaveLength(2)
  })
})
