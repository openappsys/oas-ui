import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from './index.js'

// D 类能力缺口（oas-table）：
// - D9 `grid-navigation`：role=grid 语义 + 单停靠点 Tab 序 + 方向键漫游（Home/End/PageUp-Down）
//   + 与可编辑单元格 / 行展开 / 勾选控件共存（编辑态让位输入框）
// - D15 `row-draggable`：行拖拽手柄列 + `oas-row-reorder { from, to, row }`（事件驱动，组件不改数据）
//   + 固定列共存 / 虚拟滚动降级告警 / Alt+↑↓ 键盘重排
//
// happy-dom 限制：无排版测量（getBoundingClientRect 全 0）→ dragover 的插前/插后按 clientY 显式给值；
// DragEvent 不带 dataTransfer（实现内部持有拖拽源 key，不依赖 dataTransfer）。

const COLUMNS = JSON.stringify([
  { key: 'name', title: '姓名', sortable: true },
  { key: 'age', title: '年龄' },
  { key: 'city', title: '城市' },
])
const DATA = JSON.stringify([
  { name: '张三', age: 30, city: '北京' },
  { name: '李四', age: 25, city: '上海' },
  { name: '王五', age: 35, city: '深圳' },
  { name: '赵六', age: 28, city: '杭州' },
  { name: '孙七', age: 32, city: '广州' },
  { name: '周八', age: 27, city: '成都' },
])
const EXPAND_DATA = JSON.stringify([
  { key: 'a', name: '张三', city: '北京', expand: '<div>详情 A</div>' },
  { key: 'b', name: '李四', city: '上海', expand: '<div>详情 B</div>' },
])

function mount(attrs: Record<string, string> = {}): OASTable {
  const el = new OASTable()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!('columns' in attrs)) el.setAttribute('columns', COLUMNS)
  if (!('data' in attrs)) el.setAttribute('data', DATA)
  if (!('row-key' in attrs)) el.setAttribute('row-key', 'name')
  document.body.appendChild(el)
  return el
}

function shadow(el: OASTable): ShadowRoot {
  return el.shadowRoot!
}

function rowTrs(el: OASTable): HTMLTableRowElement[] {
  return [...shadow(el).querySelectorAll('tr.row')] as HTMLTableRowElement[]
}

function cell(el: OASTable, row: number, col: number): HTMLTableCellElement {
  return rowTrs(el)[row]!.querySelectorAll('td')[col] as HTMLTableCellElement
}

/** 派发 keydown 到当前聚焦元素（无聚焦时派发到滚动容器） */
function pressActive(el: OASTable, key: string, init: KeyboardEventInit = {}): void {
  const target = (shadow(el).activeElement as HTMLElement | null) ?? shadow(el).querySelector('.table-scroll')!
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true, ...init }))
}

/** 当前聚焦单元格坐标；非单元格聚焦返回 null */
function activePos(el: OASTable): { row: number; col: number } | null {
  const td = shadow(el).activeElement as HTMLElement | null
  if (!td || td.tagName !== 'TD') return null
  const tr = td.closest('tr')!
  const row = rowTrs(el).indexOf(tr as HTMLTableRowElement)
  const col = [...tr.querySelectorAll('td')].indexOf(td as HTMLTableCellElement)
  return row >= 0 && col >= 0 ? { row, col } : null
}

function dragEvent(type: string, init: MouseEventInit = {}): Event {
  // happy-dom 的 DragEvent 是裸 Event（不带 clientY/dataTransfer）：拖拽测试用 MouseEvent 补齐
  // clientY（实现不依赖 dataTransfer——拖拽源 key 由内部状态持有），仍走完整事件路径。
  return new MouseEvent(type, { bubbles: true, composed: true, ...init })
}

describe('OASTable D9 grid-navigation', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    warnSpy.mockRestore()
  })

  it('开启后表格为 role=grid，th/行/单元格对齐 columnheader/row/gridcell；关闭时不加角色', () => {
    const on = mount({ 'grid-navigation': '' })
    expect(shadow(on).querySelector('table')!.getAttribute('role')).toBe('grid')
    expect(shadow(on).querySelectorAll('thead th[role="columnheader"]').length).toBe(3)
    expect(shadow(on).querySelectorAll('tr.row[role="row"]').length).toBe(6)
    expect(shadow(on).querySelectorAll('tr.row td[role="gridcell"]').length).toBe(18)

    const off = mount()
    expect(shadow(off).querySelector('table')!.getAttribute('role')).toBeNull()
    expect(shadow(off).querySelector('td[role="gridcell"]')).toBeNull()
  })

  it('单停靠点：滚动容器 tabindex=0，所有单元格与行内控件收归 tabindex=-1', () => {
    const el = mount({ 'grid-navigation': '', checkable: '', stripe: '' })
    expect(shadow(el).querySelector<HTMLElement>('.table-scroll')!.getAttribute('tabindex')).toBe('0')
    for (const td of shadow(el).querySelectorAll<HTMLElement>('tr.row td')) {
      expect(td.getAttribute('tabindex')).toBe('-1')
    }
    for (const c of shadow(el).querySelectorAll<HTMLElement>('tr.row input, tr.row button')) {
      expect(c.getAttribute('tabindex')).toBe('-1')
    }
  })

  it('与可编辑单元格共存：editable 单元格 tabindex 收归 -1，方向键可达、Enter 进编辑、编辑态方向键让位输入框', () => {
    const el = new OASTable()
    el.setAttribute('grid-navigation', '')
    el.setAttribute('editable', '')
    el.setAttribute('row-key', 'name')
    el.setAttribute('data', JSON.stringify([{ name: '张三', age: 30 }]))
    el.columns = [
      { key: 'name', title: '姓名', editable: true },
      { key: 'age', title: '年龄' },
    ]
    document.body.appendChild(el)

    const td = cell(el, 0, 0)
    expect(td.classList.contains('editable-cell')).toBe(true)
    expect(td.getAttribute('tabindex')).toBe('-1')
    td.focus()
    pressActive(el, 'Enter')
    const input = td.querySelector<HTMLInputElement>('input.cell-editor')
    expect(input, 'Enter 应进入编辑态').not.toBeNull()
    expect(shadow(el).activeElement).toBe(input)
    // 编辑态：方向键让位输入框（不被网格导航抢走）
    pressActive(el, 'ArrowRight')
    expect(shadow(el).activeElement).toBe(input)
  })

  it('方向键在单元格间漫游：行内移动 + 跨行换行 + 上下同列', () => {
    const el = mount({ 'grid-navigation': '' })
    cell(el, 0, 0).focus()
    expect(activePos(el)).toEqual({ row: 0, col: 0 })
    pressActive(el, 'ArrowRight')
    expect(activePos(el)).toEqual({ row: 0, col: 1 })
    pressActive(el, 'ArrowRight')
    expect(activePos(el)).toEqual({ row: 0, col: 2 })
    // 行尾右移 → 下一行行首（跨行换行）
    pressActive(el, 'ArrowRight')
    expect(activePos(el)).toEqual({ row: 1, col: 0 })
    // 行首左移 → 上一行行尾
    pressActive(el, 'ArrowLeft')
    expect(activePos(el)).toEqual({ row: 0, col: 2 })
    // 上下同列
    pressActive(el, 'ArrowDown')
    expect(activePos(el)).toEqual({ row: 1, col: 2 })
    pressActive(el, 'ArrowUp')
    expect(activePos(el)).toEqual({ row: 0, col: 2 })
    // 首行上 / 末行下 越界不动
    cell(el, 0, 0).focus()
    pressActive(el, 'ArrowUp')
    expect(activePos(el)).toEqual({ row: 0, col: 0 })
    cell(el, 5, 2).focus()
    pressActive(el, 'ArrowDown')
    expect(activePos(el)).toEqual({ row: 5, col: 2 })
  })

  it('Home / End 至行首末，Ctrl+Home / Ctrl+End 至网格首末格', () => {
    const el = mount({ 'grid-navigation': '' })
    cell(el, 2, 1).focus()
    pressActive(el, 'Home')
    expect(activePos(el)).toEqual({ row: 2, col: 0 })
    pressActive(el, 'End')
    expect(activePos(el)).toEqual({ row: 2, col: 2 })
    pressActive(el, 'Home', { ctrlKey: true })
    expect(activePos(el)).toEqual({ row: 0, col: 0 })
    pressActive(el, 'End', { ctrlKey: true })
    expect(activePos(el)).toEqual({ row: 5, col: 2 })
  })

  it('PageDown / PageUp 按屏翻动（可视区行数）；分页档步进为页大小并夹在页内；容器入口首击落到入口格', () => {
    // 可视区步进：row-height=40，容器 clientHeight=80 → 每屏 2 行
    const el = mount({ 'grid-navigation': '', 'row-height': '40' })
    const wrap = shadow(el).querySelector<HTMLElement>('.table-scroll')!
    Object.defineProperty(wrap, 'clientHeight', { configurable: true, value: 80 })
    cell(el, 0, 0).focus()
    pressActive(el, 'PageDown')
    expect(activePos(el)).toEqual({ row: 2, col: 0 })
    pressActive(el, 'PageDown')
    expect(activePos(el)).toEqual({ row: 4, col: 0 })
    // 越界夹到末行
    pressActive(el, 'PageDown')
    expect(activePos(el)).toEqual({ row: 5, col: 0 })
    pressActive(el, 'PageUp')
    expect(activePos(el)).toEqual({ row: 3, col: 0 })

    // 分页档：步进 = page-size，且页内可见行只有一页
    const paged = mount({ 'grid-navigation': '', pagination: '', 'page-size': '2' })
    expect(rowTrs(paged).length).toBe(2)
    cell(paged, 0, 0).focus()
    pressActive(paged, 'PageDown')
    expect(activePos(paged)).toEqual({ row: 1, col: 0 })

    // 焦点在容器：续用上次记忆坐标（roving tabindex 惯例）；新表首击落到首格
    const container = shadow(paged).querySelector<HTMLElement>('.table-scroll')!
    container.focus()
    expect(activePos(paged)).toBeNull()
    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }))
    expect(activePos(paged)).toEqual({ row: 1, col: 0 })

    const fresh = mount({ 'grid-navigation': '' })
    const freshWrap = shadow(fresh).querySelector<HTMLElement>('.table-scroll')!
    freshWrap.focus()
    freshWrap.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }))
    expect(activePos(fresh)).toEqual({ row: 0, col: 0 })
  })

  it('与行展开按钮共存：聚焦展开格 + Enter 展开（激活后焦点恢复该格）', () => {
    const el = mount({ 'grid-navigation': '', data: EXPAND_DATA, 'row-key': 'key' })
    let detail: unknown
    el.addEventListener('oas-expand', (e: Event) => (detail = (e as CustomEvent).detail))
    const toggleTd = shadow(el).querySelector<HTMLElement>('tr.row td.expand-toggle-cell')!
    toggleTd.focus()
    pressActive(el, 'Enter')
    expect(el.getAttribute('expanded')).toBe('a')
    expect(detail).toEqual({ key: 'a', expanded: true })
    // 展开触发重建：焦点经 pending 恢复到同一坐标（展开格）
    expect(activePos(el)).toEqual({ row: 0, col: 3 })
  })

  it('与勾选列共存：聚焦勾选格 + Space 切换选中', () => {
    const el = mount({ 'grid-navigation': '', checkable: '' })
    let checked: unknown
    el.addEventListener('oas-check', (e: Event) => (checked = (e as CustomEvent).detail))
    const checkTd = shadow(el).querySelector<HTMLElement>('tr.row td.check-cell')!
    checkTd.focus()
    pressActive(el, ' ')
    expect(el.getAttribute('selected')).toBe('张三')
    expect(checked).toEqual({ keys: ['张三'] })
  })

  it('关闭 grid-navigation 时方向键不改焦点（不劫持普通键盘）', () => {
    const el = mount()
    cell(el, 0, 0).focus()
    pressActive(el, 'ArrowRight')
    expect(activePos(el)).toEqual({ row: 0, col: 0 })
  })

  it('运行时切换 grid-navigation：setAttribute/removeAttribute 即时生效（observedAttributes 驱动）', () => {
    const el = mount()
    expect(shadow(el).querySelector('table')!.getAttribute('role')).toBeNull()
    el.setAttribute('grid-navigation', '')
    expect(shadow(el).querySelector('table')!.getAttribute('role')).toBe('grid')
    expect(cell(el, 0, 0).getAttribute('tabindex')).toBe('-1')
    el.removeAttribute('grid-navigation')
    expect(shadow(el).querySelector('table')!.getAttribute('role')).toBeNull()
    expect(cell(el, 0, 0).getAttribute('tabindex')).toBeNull()
  })

  it('与内嵌自定义交互组件共存：聚焦单元格内嵌套控件时方向键不被网格导航劫持', () => {
    const el = new OASTable()
    el.setAttribute('grid-navigation', '')
    el.setAttribute('row-key', 'name')
    el.setAttribute('data', JSON.stringify([{ name: '张三' }]))
    el.columns = [
      {
        key: 'name',
        title: '姓名',
        render: () => {
          const box = document.createElement('div')
          box.tabIndex = 0
          box.textContent = '内嵌控件'
          return box
        },
      },
    ]
    document.body.appendChild(el)
    const embed = shadow(el).querySelector<HTMLElement>('td[data-col="name"] div')!
    embed.focus()
    expect(shadow(el).activeElement).toBe(embed)
    embed.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }))
    expect(shadow(el).activeElement, '控件内方向键不被表格接管').toBe(embed)
    expect(activePos(el)).toBeNull()
  })
})

describe('OASTable D15 row-draggable', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    warnSpy.mockRestore()
  })

  it('渲染手柄列（表头 + 每数据行），手柄可访问名称走内置文案兜底；未开启时不渲染', () => {
    const el = mount({ 'row-draggable': '' })
    expect(shadow(el).querySelectorAll('tr.row td.row-drag-cell').length).toBe(6)
    const handles = shadow(el).querySelectorAll<HTMLElement>('.row-drag-handle')
    expect(handles.length).toBe(6)
    expect(handles[0]!.getAttribute('aria-label')).toBe('拖拽排序')
    expect(handles[0]!.getAttribute('draggable')).toBe('true')
    expect(shadow(el).querySelector('thead th.row-drag-cell')).not.toBeNull()

    const off = mount()
    expect(shadow(off).querySelector('.row-drag-handle')).toBeNull()
    expect(shadow(off).querySelector('td.row-drag-cell')).toBeNull()
  })

  it('仅手柄发起拖拽：手柄 dragstart 标记源行；普通单元格 dragstart 不标记', () => {
    const el = mount({ 'row-draggable': '' })
    const tr0 = rowTrs(el)[0]!
    shadow(el).querySelector<HTMLElement>('tr.row .row-drag-handle')!.dispatchEvent(dragEvent('dragstart'))
    expect(tr0.classList.contains('drag-source')).toBe(true)

    const el2 = mount({ 'row-draggable': '' })
    const tr = rowTrs(el2)[0]!
    shadow(el2).querySelector<HTMLElement>('td[data-col="name"]')!.dispatchEvent(dragEvent('dragstart'))
    expect(tr.classList.contains('drag-source')).toBe(false)
  })

  it('dragover 期间源行淡化保持（落点标记清除不连带源淡化）', () => {
    const el = mount({ 'row-draggable': '' })
    const tr0 = rowTrs(el)[0]!
    shadow(el).querySelector<HTMLElement>('tr.row .row-drag-handle')!.dispatchEvent(dragEvent('dragstart'))
    rowTrs(el)[1]!.dispatchEvent(dragEvent('dragover', { clientY: 10 }))
    expect(tr0.classList.contains('drag-source')).toBe(true)
    rowTrs(el)[2]?.dispatchEvent(dragEvent('dragover', { clientY: -10 }))
    expect(tr0.classList.contains('drag-source')).toBe(true)
    shadow(el).querySelector<HTMLElement>('tbody')!.dispatchEvent(dragEvent('dragend'))
    expect(tr0.classList.contains('drag-source')).toBe(false)
  })

  it('拖拽到目标行下半区 → 派发 oas-row-reorder { from, to, row }（事件驱动，组件不改数据）', () => {
    const el = mount({ 'row-draggable': '' })
    let detail: { from: number; to: number; row: Record<string, unknown> } | null = null
    el.addEventListener('oas-row-reorder', (e: Event) => (detail = (e as CustomEvent).detail))
    shadow(el).querySelectorAll<HTMLElement>('.row-drag-handle')[0]!.dispatchEvent(dragEvent('dragstart'))
    const tr1 = rowTrs(el)[1]!
    // 下半区（clientY 大于行中点；happy-dom 行矩形全 0，给正值即「插后」）
    tr1.dispatchEvent(dragEvent('dragover', { clientY: 10 }))
    expect(tr1.classList.contains('drop-after')).toBe(true)
    tr1.dispatchEvent(dragEvent('drop'))
    expect(detail).toEqual({ from: 0, to: 1, row: expect.objectContaining({ name: '张三' }) })
    // 组件不改数据（受控/事件驱动，与 tabs sortable / tree 拖拽同惯例）
    expect(JSON.parse(el.getAttribute('data')!)[0].name).toBe('张三')
    expect(tr1.classList.contains('drop-after')).toBe(false)
  })

  it('拖拽到目标行上半区 → 插前（to 为移除后数组的插入位）', () => {
    const el = mount({ 'row-draggable': '' })
    let detail: { from: number; to: number; row: Record<string, unknown> } | null = null
    el.addEventListener('oas-row-reorder', (e: Event) => (detail = (e as CustomEvent).detail))
    shadow(el).querySelectorAll<HTMLElement>('.row-drag-handle')[1]!.dispatchEvent(dragEvent('dragstart'))
    const tr0 = rowTrs(el)[0]!
    tr0.dispatchEvent(dragEvent('dragover', { clientY: -10 }))
    expect(tr0.classList.contains('drop-before')).toBe(true)
    tr0.dispatchEvent(dragEvent('drop'))
    expect(detail).toEqual({ from: 1, to: 0, row: expect.objectContaining({ name: '李四' }) })
  })

  it('固定列共存：手柄列固定在最左，勾选列顺延其宽度', () => {
    const el = mount({
      'row-draggable': '',
      checkable: '',
      columns: JSON.stringify([
        { key: 'name', title: '姓名', fixed: 'left' },
        { key: 'age', title: '年龄' },
      ]),
      data: JSON.stringify([{ name: '张三', age: 30 }]),
    })
    const dragTd = shadow(el).querySelector<HTMLTableCellElement>('tr.row td.row-drag-cell')!
    expect(dragTd.getAttribute('data-fixed')).toBe('left')
    expect(dragTd.style.left).toBe('0px')
    const checkTd = shadow(el).querySelector<HTMLTableCellElement>('tr.row td.check-cell')!
    expect(checkTd.getAttribute('data-fixed')).toBe('left')
    expect(checkTd.style.left).toBe('40px')
    const nameTd = shadow(el).querySelector<HTMLTableCellElement>('tr.row td[data-col="name"]')!
    expect(nameTd.getAttribute('data-fixed')).toBe('left')
    expect(nameTd.style.left).toBe('80px')
    // 表头手柄列同样固定在最左
    expect(shadow(el).querySelector<HTMLTableCellElement>('thead th.row-drag-cell')!.style.left).toBe('0px')
  })

  it('虚拟滚动下降级：不渲染手柄列并 dev 告警一次', () => {
    const el = mount({ 'row-draggable': '', height: '200', 'row-height': '40' })
    expect(shadow(el).querySelector('.row-drag-handle')).toBeNull()
    const warns = warnSpy.mock.calls.filter((c: unknown[]) => String(c[0]).includes('row-draggable'))
    expect(warns.length).toBe(1)
    expect(String(warns[0]![0])).toContain('虚拟滚动')

    // 同页再挂一张虚拟 + row-draggable：同值去重不重复告警
    warnSpy.mockClear()
    mount({ 'row-draggable': '', height: '200' })
    expect(warnSpy.mock.calls.filter((c: unknown[]) => String(c[0]).includes('row-draggable')).length).toBe(0)
  })

  it('键盘重排：grid-navigation 下 Alt+↑/↓ 派发同契约 oas-row-reorder', () => {
    const el = mount({ 'row-draggable': '', 'grid-navigation': '' })
    const details: Array<{ from: number; to: number; row: Record<string, unknown> }> = []
    el.addEventListener('oas-row-reorder', (e: Event) => details.push((e as CustomEvent).detail))
    // 拖拽手柄列是首格 → 聚焦首行首格后 Alt+↓
    cell(el, 0, 0).focus()
    pressActive(el, 'ArrowDown', { altKey: true })
    expect(details).toEqual([{ from: 0, to: 1, row: expect.objectContaining({ name: '张三' }) }])
    // 末行 Alt+↓ 越界不动
    cell(el, 5, 0).focus()
    pressActive(el, 'ArrowDown', { altKey: true })
    expect(details.length).toBe(1)
    // 行 1 Alt+↑
    cell(el, 1, 0).focus()
    pressActive(el, 'ArrowUp', { altKey: true })
    expect(details[1]).toEqual({ from: 1, to: 0, row: expect.objectContaining({ name: '李四' }) })
  })

  it('运行时切换 row-draggable：即时增删手柄列', () => {
    const el = mount()
    expect(shadow(el).querySelector('.row-drag-handle')).toBeNull()
    el.setAttribute('row-draggable', '')
    expect(shadow(el).querySelectorAll('tr.row td.row-drag-cell').length).toBe(6)
    expect(shadow(el).querySelector('thead th.row-drag-cell')).not.toBeNull()
    el.removeAttribute('row-draggable')
    expect(shadow(el).querySelector('.row-drag-handle')).toBeNull()
    expect(shadow(el).querySelector('thead th.row-drag-cell')).toBeNull()
  })

  it('oas-row-reorder 事件冒泡且穿透 Shadow DOM（composed）', () => {
    const el = mount({ 'row-draggable': '' })
    let seen = 0
    const onDoc = () => seen++
    document.addEventListener('oas-row-reorder', onDoc)
    try {
      shadow(el).querySelectorAll<HTMLElement>('.row-drag-handle')[0]!.dispatchEvent(dragEvent('dragstart'))
      const tr1 = rowTrs(el)[1]!
      tr1.dispatchEvent(dragEvent('dragover', { clientY: 10 }))
      tr1.dispatchEvent(dragEvent('drop'))
    } finally {
      document.removeEventListener('oas-row-reorder', onDoc)
    }
    expect(seen).toBe(1)
  })
})
