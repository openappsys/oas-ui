import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from '../index.js'
import {
  addRangeSelection,
  applyRangePaste,
  copyRange,
  cutRange,
  enableRangeSelection,
  fillRange,
  getRangeSelection,
  getRangeSelections,
  selectByKey,
  selectColumn,
  selectRow,
  setRangeSelection,
} from './index.js'

function mount(
  rows: Array<Record<string, unknown>> = [
    { name: 'A', age: 1 },
    { name: 'B', age: 2 },
  ],
): OASTable {
  const el = new OASTable()
  el.setAttribute(
    'columns',
    JSON.stringify([
      { key: 'name', title: '名称' },
      { key: 'age', title: '年龄' },
    ]),
  )
  el.setAttribute('data', JSON.stringify(rows))
  document.body.appendChild(el)
  return el
}

function cell(el: OASTable, row: number, col: string): HTMLElement {
  const tr = [...el.shadowRoot!.querySelectorAll('tr.row')][row]!
  return [...tr.querySelectorAll<HTMLElement>('td[data-col]')].find((td) => td.getAttribute('data-col') === col)!
}

function rowAtDataIndex(el: OASTable, row: number): HTMLTableRowElement | undefined {
  return [...el.shadowRoot!.querySelectorAll<HTMLTableRowElement>('tr.row')].find(
    (tr) => Number(tr.getAttribute('data-row-index')) === row,
  )
}

function cellAtDataIndex(el: OASTable, row: number, col: string): HTMLElement {
  const tr = rowAtDataIndex(el, row)
  if (!tr) throw new Error(`未渲染数据行 ${row}`)
  return [...tr.querySelectorAll<HTMLElement>('td[data-col]')].find((td) => td.getAttribute('data-col') === col)!
}

function mountWindowed(start = 50, count = 12): OASTable {
  const el = new OASTable()
  el.setAttribute(
    'columns',
    JSON.stringify([
      { key: 'name', title: '名称' },
      { key: 'age', title: '年龄' },
    ]),
  )
  el.setAttribute('row-key', 'id')
  el.setAttribute('windowed', '')
  el.setAttribute('total', '100')
  el.setAttribute('window-start', String(start))
  const rows = []
  for (let row = start; row < start + count; row++) rows.push({ id: `r${row}`, name: `R${row}`, age: row })
  el.setAttribute('data', JSON.stringify(rows))
  document.body.appendChild(el)
  return el
}

function mountGrouped(count = 60): OASTable {
  const el = new OASTable()
  el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
  el.setAttribute('row-key', 'id')
  el.setAttribute('group-by', 'g')
  el.setAttribute('height', '80')
  el.setAttribute('row-height', '40')
  const rows = []
  for (let row = 0; row < count; row++) rows.push({ id: `r${row}`, name: `R${row}`, g: `g${Math.floor(row / 2)}` })
  el.setAttribute('data', JSON.stringify(rows))
  document.body.appendChild(el)
  return el
}

describe('table/range 剪贴板写回（第三批）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('copyRange 支持表头；cutRange 复制后清空并发出 oas-range-write', async () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 0, col: 'name' }, { row: 1, col: 'age' })
    const withHeader = await copyRange(el, { header: true })
    expect(withHeader).toBe('名称\t年龄\nA\t1\nB\t2')

    const writes: Array<{
      kind: string
      changes: Array<{ key: string; column: string; oldRawValue?: unknown; value: unknown }>
    }> = []
    el.addEventListener('oas-range-write', (event) => writes.push((event as CustomEvent).detail))
    const text = await cutRange(el)
    expect(text).toBe('A\t1\nB\t2')
    expect(el.data).toEqual([
      { id: 'a', name: '', age: '' },
      { id: 'b', name: '', age: '' },
    ])
    expect(writes).toHaveLength(1)
    expect(writes[0]!.kind).toBe('cut')
    expect(writes[0]!.changes).toHaveLength(4)
    expect(writes[0]!.changes[0]).toMatchObject({ key: 'a', column: 'name', oldRawValue: 'A', value: '' })
  })

  it('applyRangePaste 按 startKey 与可见行序写回，支持 skipEmpty', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
      { id: 'c', name: 'C', age: 3 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 1, col: 'name' })
    const writes: Array<{ kind: string; changes: unknown[] }> = []
    el.addEventListener('oas-range-write', (event) => writes.push((event as CustomEvent).detail))
    const changed = applyRangePaste(el, 'X\t9\nY\t8')
    expect(changed).toBe(4)
    expect(el.data).toEqual([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'X', age: 9 },
      { id: 'c', name: 'Y', age: 8 },
    ])
    expect(writes[0]!.kind).toBe('paste')

    const changed2 = applyRangePaste(el, 'Z\t\nQ\t7', { skipEmpty: true })
    expect(changed2).toBe(3)
    expect(el.data).toEqual([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'Z', age: 9 },
      { id: 'c', name: 'Q', age: 7 },
    ])
  })

  it('edit-controlled 只发写回事件，不改数据', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
    ])
    el.setAttribute('row-key', 'id')
    el.setAttribute('edit-controlled', '')
    setRangeSelection(el, { row: 1, col: 'name' })
    applyRangePaste(el, 'X')
    expect(el.data).toEqual([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
    ])
  })
})

describe('table/range 区域选择 + 剪贴板', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('设置选区后装饰矩形范围并派发 oas-range-change', () => {
    const el = mount()
    enableRangeSelection(el)
    const events: unknown[] = []
    el.addEventListener('oas-range-change', (event) => events.push((event as CustomEvent).detail))
    setRangeSelection(el, { row: 0, col: 'name' }, { row: 1, col: 'age' })
    expect(cell(el, 0, 'name').classList.contains('range-selected')).toBe(true)
    expect(cell(el, 0, 'age').classList.contains('range-selected')).toBe(true)
    expect(cell(el, 1, 'name').classList.contains('range-selected')).toBe(true)
    expect(cell(el, 1, 'age').classList.contains('range-selected')).toBe(true)
    expect(cell(el, 0, 'name').classList.contains('range-anchor')).toBe(true)
    expect(cell(el, 1, 'age').classList.contains('range-focus')).toBe(true)
    expect(events).toHaveLength(1)
    expect(getRangeSelection(el)).toEqual({
      start: { row: 0, col: 'name' },
      end: { row: 1, col: 'age' },
    })
  })

  it('复制选区为 TSV；关闭后清掉装饰但保留锚定', async () => {
    const el = mount()
    setRangeSelection(el, { row: 0, col: 'name' }, { row: 1, col: 'age' })
    const copied: unknown[] = []
    el.addEventListener('oas-range-copy', (event) => copied.push((event as CustomEvent).detail))
    const text = await copyRange(el)
    expect(text).toBe('A\t1\nB\t2')
    expect(copied).toHaveLength(1)
    enableRangeSelection(el, false)
    expect(cell(el, 0, 'name').classList.contains('range-selected')).toBe(false)
    expect(cell(el, 1, 'age').classList.contains('range-selected')).toBe(false)
    enableRangeSelection(el)
    expect(cell(el, 0, 'name').classList.contains('range-selected')).toBe(true)
  })

  it('清空选区', () => {
    const el = mount()
    setRangeSelection(el, { row: 0, col: 'name' })
    setRangeSelection(el, null)
    expect(getRangeSelection(el)).toBeNull()
    expect(cell(el, 0, 'name').classList.contains('range-selected')).toBe(false)
  })

  it('行键锚定：数据重排后选区跟随原行', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 0, col: 'name' })
    el.data = [
      { id: 'b', name: 'B', age: 2 },
      { id: 'a', name: 'A', age: 1 },
    ]
    expect(getRangeSelection(el)).toEqual({ start: { row: 1, col: 'name' }, end: { row: 1, col: 'name' } })
    expect(cell(el, 1, 'name').classList.contains('range-selected')).toBe(true)
    expect(cell(el, 0, 'name').classList.contains('range-selected')).toBe(false)
  })

  it('Shift+方向键扩展选区，普通方向键移动单格；Ctrl+C 复制', async () => {
    const el = mount()
    enableRangeSelection(el)
    const changes: unknown[] = []
    el.addEventListener('oas-range-change', (event) => changes.push((event as CustomEvent).detail))
    const first = cell(el, 0, 'name')
    first.focus()
    first.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true, cancelable: true }),
    )
    expect(getRangeSelection(el)).toEqual({
      start: { row: 0, col: 'name' },
      end: { row: 1, col: 'name' },
    })
    expect(cell(el, 1, 'name').classList.contains('range-focus')).toBe(true)

    const copied: Array<{ text: string }> = []
    el.addEventListener('oas-range-copy', (event) => copied.push((event as CustomEvent).detail))
    cell(el, 1, 'name').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true, cancelable: true }),
    )
    await vi.waitFor(() => expect(copied).toHaveLength(1))
    expect(copied[0]!.text).toBe('A\nB')

    cell(el, 0, 'name').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    )
    expect(getRangeSelection(el)).toEqual({ start: { row: 1, col: 'age' }, end: { row: 1, col: 'age' } })
    expect(changes).toHaveLength(3)
  })

  it('交互宿主内按下不启动选区（composedPath 穿透嵌套组件）', () => {
    const el = mount()
    enableRangeSelection(el)
    const td = cell(el, 0, 'name')
    const nested = document.createElement('div')
    const innerRoot = nested.attachShadow({ mode: 'open' })
    innerRoot.innerHTML = '<input />'
    td.appendChild(nested)
    innerRoot
      .querySelector('input')!
      .dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, composed: true, cancelable: true, button: 0, pointerId: 1 }),
      )
    expect(getRangeSelection(el)).toBeNull()
    expect(el.shadowRoot!.querySelectorAll('td.range-selected')).toHaveLength(0)
  })

  it('拖拽跨格后表格外释放能复位，不残留 dragging', async () => {
    const el = mount()
    enableRangeSelection(el)
    const first = cell(el, 0, 'name')
    const second = cell(el, 1, 'age')
    first.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }))
    second.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, button: 0, pointerId: 1 }))
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(getRangeSelection(el)).toEqual({
      start: { row: 0, col: 'name' },
      end: { row: 1, col: 'age' },
    })
    const selectStart = new Event('selectstart', { bubbles: true, cancelable: true })
    window.dispatchEvent(selectStart)
    expect(selectStart.defaultPrevented, '拖拽中抑制页面文本选择').toBe(true)
    // 表格外释放：window 兜底复位 dragging，之后 focusin 能重新收敛为单格
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
    cell(el, 0, 'name').focus()
    expect(getRangeSelection(el)).toEqual({
      start: { row: 0, col: 'name' },
      end: { row: 0, col: 'name' },
    })
  })

  it('Escape 清空选区；roving tabindex 只有焦点格可 Tab 进入', () => {
    const el = mount()
    setRangeSelection(el, { row: 0, col: 'name' }, { row: 1, col: 'age' })
    const tabbable = [...el.shadowRoot!.querySelectorAll<HTMLElement>('td[data-col]')].filter((td) => td.tabIndex === 0)
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0]).toBe(cell(el, 1, 'age'))
    cell(el, 1, 'age').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(getRangeSelection(el)).toBeNull()
  })

  it('粘贴 TSV 派发 oas-range-paste（从选区左上角开始，含行键）', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 1, col: 'age' })
    const events: Array<{ start: unknown; startKey: string; rows: string[][] }> = []
    el.addEventListener('oas-range-paste', (event) => events.push((event as CustomEvent).detail))
    const paste = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(paste, 'clipboardData', { value: { getData: () => 'x\ty\nz\tw' } })
    cell(el, 1, 'age').dispatchEvent(paste)
    expect(events).toHaveLength(1)
    expect(events[0]!.start).toEqual({ row: 1, col: 'age' })
    expect(events[0]!.startKey).toBe('b')
    expect(events[0]!.rows).toEqual([
      ['x', 'y'],
      ['z', 'w'],
    ])
  })

  it('清空选区也会派发 oas-range-change（detail: null）', () => {
    const el = mount()
    const events: unknown[] = []
    el.addEventListener('oas-range-change', (event) => events.push((event as CustomEvent).detail))
    setRangeSelection(el, { row: 0, col: 'name' })
    setRangeSelection(el, null)
    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ start: { row: 0, col: 'name' }, end: { row: 0, col: 'name' } })
    expect(events[1]).toBeNull()
  })

  it('grid-navigation 下不新增 td 停靠点，并同步 aria-selected / aria-multiselectable', () => {
    const el = mount()
    el.setAttribute('grid-navigation', '')
    enableRangeSelection(el)
    setRangeSelection(el, { row: 0, col: 'name' }, { row: 1, col: 'age' })
    const stops = [...el.shadowRoot!.querySelectorAll<HTMLElement>('td[data-col]')].filter((td) => td.tabIndex === 0)
    expect(stops).toHaveLength(0)
    expect(cell(el, 0, 'name').getAttribute('aria-selected')).toBe('true')
    expect(cell(el, 0, 'name').getAttribute('role')).toBe('gridcell')
    const grid = el.shadowRoot!.querySelector('[role="grid"]')
    expect(grid?.getAttribute('aria-multiselectable')).toBe('true')
    enableRangeSelection(el, false)
    expect(el.shadowRoot!.querySelector('[role="grid"]')?.hasAttribute('aria-multiselectable')).toBe(false)
  })

  it('RTL 下左右方向键翻转（ArrowRight 向左移动）', () => {
    const el = mount()
    el.style.direction = 'rtl'
    enableRangeSelection(el)
    setRangeSelection(el, { row: 0, col: 'age' })
    cell(el, 0, 'age').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    )
    expect(getRangeSelection(el)).toEqual({ start: { row: 0, col: 'name' }, end: { row: 0, col: 'name' } })
  })

  it('外部选区在行尚未渲染时挂起，数据到达后自动落地', () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('row-key', 'id')
    document.body.appendChild(el)
    setRangeSelection(el, { row: 0, col: 'name' })
    expect(getRangeSelection(el)).toBeNull()
    el.data = [{ id: 'a', name: 'A' }]
    expect(getRangeSelection(el)).toEqual({ start: { row: 0, col: 'name' }, end: { row: 0, col: 'name' } })
    expect(cell(el, 0, 'name').classList.contains('range-selected')).toBe(true)
  })

  it('未升级元素调用 enable/set 抛错，不静默失效', () => {
    const div = document.createElement('div')
    expect(() => enableRangeSelection(div)).toThrow(/需要已升级的 oas-table/)
    expect(() => setRangeSelection(div, { row: 0, col: 'name' })).toThrow(/需要已升级的 oas-table/)
  })

  it('aria-live 选区播报（i18n）', async () => {
    const el = mount()
    setRangeSelection(el, { row: 0, col: 'name' }, { row: 1, col: 'age' })
    await new Promise((resolve) => setTimeout(resolve, 320))
    const live = el.shadowRoot!.querySelector('.range-live')!
    expect(live.textContent).toContain('2 行 2 列')
  })

  it('windowed：行离开窗口后保留逻辑选区，装饰清零但不清空', () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('windowed', '')
    el.setAttribute('total', '100')
    el.setAttribute('window-start', '0')
    el.setAttribute(
      'data',
      JSON.stringify([
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ]),
    )
    el.setAttribute('row-key', 'id')
    document.body.appendChild(el)
    const events: unknown[] = []
    el.addEventListener('oas-range-change', (event) => events.push((event as CustomEvent).detail))
    setRangeSelection(el, { row: 0, col: 'name' }, { row: 1, col: 'name' })
    expect(getRangeSelection(el)).not.toBeNull()
    el.setAttribute('window-start', '50')
    el.data = [
      { id: 'z', name: 'Z' },
      { id: 'y', name: 'Y' },
    ]
    expect(getRangeSelection(el)).toEqual({
      start: { row: 0, col: 'name' },
      end: { row: 1, col: 'name' },
    })
    expect(el.shadowRoot!.querySelectorAll('td.range-selected')).toHaveLength(0)
    expect(events.at(-1)).not.toBeNull()
  })
})

describe('table/range 选区 API 与多选区（第三批）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('selectByKey 按行键选择区域；selectRow/selectColumn/Ctrl+A', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
      { id: 'c', name: 'C', age: 3 },
    ])
    el.setAttribute('row-key', 'id')
    selectByKey(el, { key: 'b', col: 'name' }, { key: 'c', col: 'age' })
    expect(getRangeSelection(el)).toEqual({
      start: { row: 1, col: 'name' },
      end: { row: 2, col: 'age' },
    })

    selectRow(el, 0)
    expect(getRangeSelection(el)).toEqual({
      start: { row: 0, col: 'name' },
      end: { row: 0, col: 'age' },
    })
    selectColumn(el, 'age')
    expect(getRangeSelection(el)).toEqual({
      start: { row: 0, col: 'age' },
      end: { row: 2, col: 'age' },
    })
    cell(el, 0, 'name').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, cancelable: true }),
    )
    expect(getRangeSelection(el)).toEqual({
      start: { row: 0, col: 'name' },
      end: { row: 2, col: 'age' },
    })
  })

  it('Ctrl 追加多选区，getRangeSelections 与复制分块', async () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
      { id: 'c', name: 'C', age: 3 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 0, col: 'name' }, { row: 0, col: 'age' })
    cell(el, 2, 'age').dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1, ctrlKey: true }),
    )
    expect(getRangeSelections(el)).toHaveLength(2)
    expect(getRangeSelection(el)).toEqual({ start: { row: 2, col: 'age' }, end: { row: 2, col: 'age' } })
    const text = await copyRange(el)
    expect(text).toBe('A\t1\n\n3')
    cell(el, 2, 'age').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(getRangeSelections(el)).toHaveLength(0)
  })

  it('addRangeSelection 程序化追加', () => {
    const el = mount()
    addRangeSelection(el, { row: 0, col: 'name' }, { row: 0, col: 'age' })
    addRangeSelection(el, { row: 1, col: 'name' })
    expect(getRangeSelections(el)).toHaveLength(2)
  })
})

describe('table/range 键盘窗口与跨窗口选区（第三批）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('Ctrl+End / Shift+Ctrl+Home 与 PageDown', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
      { id: 'c', name: 'C', age: 3 },
    ])
    el.setAttribute('row-key', 'id')
    el.setAttribute('height', '160')
    el.setAttribute('row-height', '40')
    setRangeSelection(el, { row: 0, col: 'name' })
    cell(el, 0, 'name').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', ctrlKey: true, bubbles: true, cancelable: true }),
    )
    expect(getRangeSelection(el)).toEqual({ start: { row: 2, col: 'age' }, end: { row: 2, col: 'age' } })
    cell(el, 2, 'age').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }),
    )
    expect(getRangeSelection(el)).toEqual({
      start: { row: 0, col: 'name' },
      end: { row: 2, col: 'age' },
    })

    cell(el, 0, 'name').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true, cancelable: true }),
    )
    expect(getRangeSelection(el)?.start.row).toBe(0)
  })

  it('PageDown 按视口行数移动', () => {
    const rows = []
    for (let i = 0; i < 10; i++) rows.push({ id: 'r' + i, name: 'R' + i, age: i })
    const el = mount(rows)
    el.setAttribute('row-key', 'id')
    el.setAttribute('height', '160')
    el.setAttribute('row-height', '40')
    setRangeSelection(el, { row: 0, col: 'name' })
    cell(el, 0, 'name').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true, cancelable: true }),
    )
    expect(getRangeSelection(el)).toEqual({ start: { row: 4, col: 'name' }, end: { row: 4, col: 'name' } })
  })

  it('本地虚拟滚动越界后 pendingFocus 落地', async () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('row-key', 'id')
    el.setAttribute('height', '80')
    el.setAttribute('row-height', '40')
    const many = []
    for (let i = 0; i < 100; i++) many.push({ id: 'r' + i, name: 'R' + i })
    el.setAttribute('data', JSON.stringify(many))
    document.body.appendChild(el)
    enableRangeSelection(el)
    const count = el.shadowRoot!.querySelectorAll('tr.row').length
    expect(count).toBeLessThan(100)
    setRangeSelection(el, { row: count - 1, col: 'name' })
    cell(el, count - 1, 'name').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true, cancelable: true }),
    )
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => setTimeout(resolve, 60))
    const after = getRangeSelection(el)
    expect(after).not.toBeNull()
    expect(cellAtDataIndex(el, after!.end.row, 'name').textContent).toBe('R6')
  })

  it('禁用后重连不会落地旧的 pendingFocus', () => {
    const el = mountWindowed(0, 2)
    enableRangeSelection(el)
    setRangeSelection(el, { row: 1, col: 'name' })
    cellAtDataIndex(el, 1, 'name').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true, cancelable: true }),
    )
    enableRangeSelection(el, false)
    enableRangeSelection(el)
    el.setAttribute('window-start', '2')
    el.data = [{ id: 'c', name: 'C' }]
    expect(getRangeSelection(el)).toEqual({ start: { row: 1, col: 'name' }, end: { row: 1, col: 'name' } })
  })

  it('越界 pending 后 Esc 清空，数据到达不复活', () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('windowed', '')
    el.setAttribute('total', '100')
    el.setAttribute('window-start', '0')
    el.setAttribute('row-key', 'id')
    el.setAttribute(
      'data',
      JSON.stringify([
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ]),
    )
    document.body.appendChild(el)
    enableRangeSelection(el)
    setRangeSelection(el, { row: 1, col: 'name' })
    cell(el, 1, 'name').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true, cancelable: true }),
    )
    cell(el, 1, 'name').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(getRangeSelection(el)).toBeNull()
    el.setAttribute('window-start', '2')
    el.data = [{ id: 'c', name: 'C' }]
    expect(getRangeSelection(el)).toBeNull()
  })

  it('windowed 越界保留逻辑选区，Shift+方向键请求窗口并扩展', () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('windowed', '')
    el.setAttribute('total', '100')
    el.setAttribute('window-start', '0')
    el.setAttribute('row-key', 'id')
    el.setAttribute(
      'data',
      JSON.stringify([
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ]),
    )
    document.body.appendChild(el)
    enableRangeSelection(el)
    setRangeSelection(el, { row: 1, col: 'name' })
    const requests: Array<{ start: number; end: number }> = []
    el.addEventListener('oas-window-request', (event) => requests.push((event as CustomEvent).detail))
    cell(el, 1, 'name').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true, cancelable: true }),
    )
    expect(requests).toEqual([{ start: 0, end: 11, reason: 'scroll' }])
    el.setAttribute('window-start', '2')
    el.data = [{ id: 'c', name: 'C' }]
    expect(getRangeSelection(el)).toEqual({ start: { row: 1, col: 'name' }, end: { row: 2, col: 'name' } })
    expect(cell(el, 0, 'name').classList.contains('range-selected')).toBe(true)
  })
})

describe('table/range 填充（fillRange）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('向下复制边界行并扩展选区', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
      { id: 'c', name: 'C', age: 3 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 0, col: 'name' }, { row: 0, col: 'age' })
    const changed = fillRange(el)
    expect(changed).toBe(2)
    expect(el.data).toEqual([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'A', age: 1 },
      { id: 'c', name: 'C', age: 3 },
    ])
    expect(getRangeSelection(el)).toEqual({
      start: { row: 0, col: 'name' },
      end: { row: 1, col: 'age' },
    })
  })

  it('向下数值序列与向上序列', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 5 },
      { id: 'c', name: 'C', age: 9 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 0, col: 'age' })
    expect(fillRange(el, { mode: 'series', cells: 2 })).toBe(2)
    expect(el.data).toEqual([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
      { id: 'c', name: 'C', age: 3 },
    ])
    setRangeSelection(el, { row: 2, col: 'age' })
    expect(fillRange(el, { mode: 'series', direction: 'up', step: -1 })).toBe(1)
    expect(el.data[1]!.age).toBe(2)
  })

  it('向右复制边界列', () => {
    const el = new OASTable()
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '名称' },
        { key: 'age', title: '年龄' },
        { key: 'city', title: '城市' },
      ]),
    )
    el.setAttribute('row-key', 'id')
    el.setAttribute('data', JSON.stringify([{ id: 'a', name: 'A', age: 1, city: 'X' }]))
    document.body.appendChild(el)
    setRangeSelection(el, { row: 0, col: 'name' }, { row: 0, col: 'age' })
    expect(fillRange(el, { direction: 'right' })).toBe(1)
    expect(el.data[0]).toEqual({ id: 'a', name: 'A', age: 1, city: 1 })
    expect(getRangeSelection(el)).toEqual({ start: { row: 0, col: 'name' }, end: { row: 0, col: 'city' } })
  })
})

describe('table/range 填充柄与可访问性', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('填充柄拖拽复制并扩展选区', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
      { id: 'c', name: 'C', age: 3 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 0, col: 'name' }, { row: 0, col: 'age' })
    const handle = cell(el, 0, 'age').querySelector('.range-fill-handle')!
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }))
    cell(el, 1, 'age').dispatchEvent(new PointerEvent('pointermove', { bubbles: true, button: 0, pointerId: 1 }))
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
    expect(el.data[1]).toEqual({ id: 'b', name: 'A', age: 1 })
    expect(getRangeSelection(el)).toEqual({
      start: { row: 0, col: 'name' },
      end: { row: 1, col: 'age' },
    })
  })
})

describe('table/range 展示集坐标回归', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('windowed selectByKey 与 setRangeSelection 往返都使用绝对行号', () => {
    const el = mountWindowed()
    selectByKey(el, { key: 'r50', col: 'name' })
    const selection = getRangeSelection(el)
    expect(selection).toEqual({ start: { row: 50, col: 'name' }, end: { row: 50, col: 'name' } })
    setRangeSelection(el, selection!.start, selection!.end)
    expect(getRangeSelection(el)).toEqual(selection)
    expect(cellAtDataIndex(el, 50, 'name').classList.contains('range-selected')).toBe(true)
  })

  it('windowed 窗口内插入行后选区按行键移动到新绝对行号并派发新坐标', () => {
    const el = mountWindowed()
    const events: unknown[] = []
    el.addEventListener('oas-range-change', (event) => events.push((event as CustomEvent).detail))
    selectByKey(el, { key: 'r50', col: 'name' })
    el.data = [{ id: 'new', name: 'NEW', age: -1 }, ...el.data]
    const expected = { start: { row: 51, col: 'name' }, end: { row: 51, col: 'name' } }
    expect(getRangeSelection(el)).toEqual(expected)
    expect(events.at(-1)).toEqual(expected)
    expect(cellAtDataIndex(el, 51, 'name').classList.contains('range-selected')).toBe(true)
    expect(cellAtDataIndex(el, 50, 'name').classList.contains('range-selected')).toBe(false)
  })

  it('windowed 已渲染的下一行直接扩展，不多发窗口请求', () => {
    const el = mountWindowed()
    enableRangeSelection(el)
    const first = cellAtDataIndex(el, 50, 'name')
    first.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }))
    const requests: unknown[] = []
    el.addEventListener('oas-window-request', (event) => requests.push((event as CustomEvent).detail))
    first.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true, cancelable: true }),
    )
    expect(requests).toEqual([])
    expect(getRangeSelection(el)).toEqual({
      start: { row: 50, col: 'name' },
      end: { row: 51, col: 'name' },
    })
    expect(cellAtDataIndex(el, 51, 'name').classList.contains('range-focus')).toBe(true)
    expect(el.shadowRoot!.activeElement).toBe(cellAtDataIndex(el, 51, 'name'))
  })

  it('windowed cutRange 复制并清空绝对行 50..51', async () => {
    const el = mountWindowed()
    setRangeSelection(el, { row: 50, col: 'name' }, { row: 51, col: 'name' })
    const text = await cutRange(el)
    expect(text).toBe('R50\nR51')
    expect(el.data.slice(0, 2)).toEqual([
      { id: 'r50', name: '', age: 50 },
      { id: 'r51', name: '', age: 51 },
    ])
  })

  it('本地虚拟滚动 Shift+Ctrl+End 保留首行锚点，删除锚行后不错配新行', async () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('row-key', 'id')
    el.setAttribute('height', '80')
    el.setAttribute('row-height', '40')
    const rows = []
    for (let row = 0; row < 100; row++) rows.push({ id: `r${row}`, name: `R${row}` })
    el.setAttribute('data', JSON.stringify(rows))
    document.body.appendChild(el)
    enableRangeSelection(el)
    setRangeSelection(el, { row: 0, col: 'name' })
    cellAtDataIndex(el, 0, 'name').dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'End',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    )
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.dispatchEvent(new Event('scroll'))
    await vi.waitFor(() => {
      expect(cellAtDataIndex(el, 99, 'name').classList.contains('range-focus')).toBe(true)
    })
    expect(getRangeSelection(el)).toEqual({ start: { row: 0, col: 'name' }, end: { row: 99, col: 'name' } })
    expect(cellAtDataIndex(el, 99, 'name').classList.contains('range-selected')).toBe(true)
    // 纯单元格编辑不改变展示集：跨窗选区必须保留
    el.data = el.data.map((row, index) => (index === 0 ? { ...row, name: 'EDITED' } : row))
    expect(getRangeSelection(el)).toEqual({ start: { row: 0, col: 'name' }, end: { row: 99, col: 'name' } })
    // 数据删除改变展示集：不能把旧 abs=0 误配给新的首行
    el.data = el.data.slice(1)
    expect(getRangeSelection(el)).toBeNull()
    expect(el.shadowRoot!.querySelectorAll('td.range-selected')).toHaveLength(0)
  })

  it('本地虚拟 Ctrl+Home 直接跳到第 0 行', async () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('row-key', 'id')
    el.setAttribute('height', '80')
    el.setAttribute('row-height', '40')
    const rows = []
    for (let row = 0; row < 100; row++) rows.push({ id: `r${row}`, name: `R${row}` })
    el.setAttribute('data', JSON.stringify(rows))
    document.body.appendChild(el)
    enableRangeSelection(el)
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 99 * 40
    wrap.dispatchEvent(new Event('scroll'))
    await vi.waitFor(() => expect(rowAtDataIndex(el, 99)).toBeTruthy())
    selectByKey(el, { key: 'r99', col: 'name' })
    cellAtDataIndex(el, 99, 'name').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', ctrlKey: true, bubbles: true, cancelable: true }),
    )
    expect(wrap.scrollTop).toBe(0)
    wrap.dispatchEvent(new Event('scroll'))
    await vi.waitFor(() =>
      expect(getRangeSelection(el)).toEqual({ start: { row: 0, col: 'name' }, end: { row: 0, col: 'name' } }),
    )
    expect(el.shadowRoot!.activeElement).toBe(cellAtDataIndex(el, 0, 'name'))
  })

  it('用户改滚到其它位置后旧 pendingFocus 不再延迟劫持选区', async () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('row-key', 'id')
    el.setAttribute('height', '80')
    el.setAttribute('row-height', '40')
    const rows = []
    for (let row = 0; row < 100; row++) rows.push({ id: `r${row}`, name: `R${row}` })
    el.setAttribute('data', JSON.stringify(rows))
    document.body.appendChild(el)
    enableRangeSelection(el)
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 99 * 40
    wrap.dispatchEvent(new Event('scroll'))
    await vi.waitFor(() => expect(rowAtDataIndex(el, 99)).toBeTruthy())
    selectByKey(el, { key: 'r99', col: 'name' })
    cellAtDataIndex(el, 99, 'name').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }),
    )
    // 用户改滚到中部而不是目标顶部：旧 pending 应失效，不得稍后再改选区
    wrap.scrollTop = 50 * 40
    wrap.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(getRangeSelection(el)?.end.row).toBe(99)
  })

  it('本地虚拟滚动非零窗口越界后落到下一展示行并返回展示集坐标', async () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('row-key', 'id')
    el.setAttribute('height', '80')
    el.setAttribute('row-height', '40')
    const rows = []
    for (let row = 0; row < 100; row++) rows.push({ id: `r${row}`, name: `R${row}` })
    el.setAttribute('data', JSON.stringify(rows))
    document.body.appendChild(el)
    enableRangeSelection(el)
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 200
    wrap.dispatchEvent(new Event('scroll'))
    await vi.waitFor(() => {
      const rendered = [...el.shadowRoot!.querySelectorAll('tr.row')]
      expect(rendered.some((tr) => Number(tr.getAttribute('data-row-index')) === 9)).toBe(true)
    })

    const rendered = [...el.shadowRoot!.querySelectorAll<HTMLTableRowElement>('tr.row')]
    const last = rendered[rendered.length - 1]!
    const lastIndex = Number(last.getAttribute('data-row-index'))
    const lastCell = [...last.querySelectorAll<HTMLElement>('td[data-col]')].find(
      (td) => td.getAttribute('data-col') === 'name',
    )!
    lastCell.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }),
    )
    lastCell.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true, cancelable: true }),
    )
    // happy-dom 的 scrollTop 赋值不触发原生 scroll；浏览器中该事件由滚动本身产生
    wrap.dispatchEvent(new Event('scroll'))
    await vi.waitFor(() => {
      expect(cellAtDataIndex(el, lastIndex + 1, 'name').classList.contains('range-focus')).toBe(true)
    })
    expect(el.shadowRoot!.activeElement).toBe(cellAtDataIndex(el, lastIndex + 1, 'name'))
    expect(getRangeSelection(el)).toEqual({
      start: { row: lastIndex, col: 'name' },
      end: { row: lastIndex + 1, col: 'name' },
    })
  })
})

describe('table/range 填充与取消回归', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('填充柄向下拖两格就写两格', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
      { id: 'c', name: 'C', age: 3 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 0, col: 'age' })
    const handle = cell(el, 0, 'age').querySelector('.range-fill-handle')!
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }))
    cell(el, 2, 'age').dispatchEvent(new PointerEvent('pointermove', { bubbles: true, button: 0, pointerId: 1 }))
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
    expect(el.data.map((row) => row.age)).toEqual([1, 1, 1])
    expect(getRangeSelection(el)).toEqual({ start: { row: 0, col: 'age' }, end: { row: 2, col: 'age' } })
  })

  it('填充柄向上拖两格按向上方向写入', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
      { id: 'c', name: 'C', age: 3 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 2, col: 'age' })
    const handle = cell(el, 2, 'age').querySelector('.range-fill-handle')!
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }))
    cell(el, 0, 'age').dispatchEvent(new PointerEvent('pointermove', { bubbles: true, button: 0, pointerId: 1 }))
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
    expect(el.data.map((row) => row.age)).toEqual([3, 3, 3])
  })

  it('填充柄向左拖一列按向左方向写入并扩展选区', async () => {
    const el = new OASTable()
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '名称' },
        { key: 'age', title: '年龄' },
        { key: 'city', title: '城市' },
      ]),
    )
    el.setAttribute('row-key', 'id')
    el.setAttribute('data', JSON.stringify([{ id: 'a', name: 'A', age: 1, city: 'X' }]))
    document.body.appendChild(el)
    setRangeSelection(el, { row: 0, col: 'age' })
    const handle = cell(el, 0, 'age').querySelector('.range-fill-handle')!
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }))
    cell(el, 0, 'name').dispatchEvent(new PointerEvent('pointermove', { bubbles: true, button: 0, pointerId: 1 }))
    await vi.waitFor(() =>
      expect(getRangeSelection(el)).toEqual({ start: { row: 0, col: 'name' }, end: { row: 0, col: 'age' } }),
    )
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
    expect(el.data[0]).toEqual({ id: 'a', name: 1, age: 1, city: 'X' })
    expect(getRangeSelection(el)).toEqual({ start: { row: 0, col: 'name' }, end: { row: 0, col: 'age' } })
  })

  it('填充柄向右拖拽时预览扩展到目标列', async () => {
    const el = new OASTable()
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '名称' },
        { key: 'age', title: '年龄' },
        { key: 'city', title: '城市' },
      ]),
    )
    el.setAttribute('row-key', 'id')
    el.setAttribute('data', JSON.stringify([{ id: 'a', name: 'A', age: 1, city: 'X' }]))
    document.body.appendChild(el)
    setRangeSelection(el, { row: 0, col: 'age' })
    const handle = cell(el, 0, 'age').querySelector('.range-fill-handle')!
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }))
    cell(el, 0, 'city').dispatchEvent(new PointerEvent('pointermove', { bubbles: true, button: 0, pointerId: 1 }))
    await vi.waitFor(() =>
      expect(getRangeSelection(el)).toEqual({ start: { row: 0, col: 'age' }, end: { row: 0, col: 'city' } }),
    )
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
    expect(el.data[0]).toEqual({ id: 'a', name: 'A', age: 1, city: 1 })
  })

  it('pointercancel 不写入、不发事件并恢复源选区', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
      { id: 'c', name: 'C', age: 3 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 0, col: 'age' })
    const writes: unknown[] = []
    el.addEventListener('oas-range-write', (event) => writes.push((event as CustomEvent).detail))
    const handle = cell(el, 0, 'age').querySelector('.range-fill-handle')!
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }))
    cell(el, 2, 'age').dispatchEvent(new PointerEvent('pointermove', { bubbles: true, button: 0, pointerId: 1 }))
    window.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 }))
    expect(el.data.map((row) => row.age)).toEqual([1, 2, 3])
    expect(writes).toEqual([])
    expect(getRangeSelection(el)).toEqual({ start: { row: 0, col: 'age' }, end: { row: 0, col: 'age' } })
  })

  it('填充拖拽中 Escape 取消后 pointerup 不写入', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
      { id: 'c', name: 'C', age: 3 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 0, col: 'age' })
    const writes: unknown[] = []
    el.addEventListener('oas-range-write', (event) => writes.push((event as CustomEvent).detail))
    const handle = cell(el, 0, 'age').querySelector('.range-fill-handle')!
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }))
    cell(el, 2, 'age').dispatchEvent(new PointerEvent('pointermove', { bubbles: true, button: 0, pointerId: 1 }))
    cell(el, 2, 'age').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
    expect(el.data.map((row) => row.age)).toEqual([1, 2, 3])
    expect(writes).toEqual([])
    expect(getRangeSelection(el)).toBeNull()
  })

  it('填充柄无位移释放不写入', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 0, col: 'age' })
    const handle = cell(el, 0, 'age').querySelector('.range-fill-handle')!
    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }))
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
    expect(el.data.map((row) => row.age)).toEqual([1, 2])
  })

  it('windowed 源行离开切片后 fillRange 不写空串', () => {
    const el = mountWindowed(0, 3)
    setRangeSelection(el, { row: 0, col: 'name' })
    el.setAttribute('window-start', '1')
    el.data = el.data.slice(1)
    const before = el.data
    expect(fillRange(el)).toBe(0)
    expect(el.data).toEqual(before)
  })

  it('cutRange 与 copyRange 一样处理全部多选区', async () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
      { id: 'c', name: 'C', age: 3 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 0, col: 'name' })
    addRangeSelection(el, { row: 2, col: 'age' })
    const text = await cutRange(el)
    expect(text).toBe('A\n\n3')
    expect(el.data).toEqual([
      { id: 'a', name: '', age: 1 },
      { id: 'b', name: 'B', age: 2 },
      { id: 'c', name: 'C', age: '' },
    ])
  })

  it('数值字符串序列填充保持字符串类型', () => {
    const el = mount([
      { id: 'a', name: 'A', age: '1' },
      { id: 'b', name: 'B', age: '9' },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 0, col: 'age' })
    expect(fillRange(el, { mode: 'series' })).toBe(1)
    expect(el.data[1]!.age).toBe('2')
  })

  it('Ctrl 重复追加同一矩形不会产生重复选区', () => {
    const el = mount()
    enableRangeSelection(el)
    const target = cell(el, 0, 'name')
    const down = (): void => {
      target.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          button: 0,
          pointerId: 1,
          ctrlKey: true,
        }),
      )
    }
    down()
    down()
    expect(getRangeSelections(el)).toHaveLength(1)
  })

  it('数组列默认粘贴会去除分隔符两侧空白', () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'tags', title: '标签' }]))
    el.setAttribute('row-key', 'id')
    el.setAttribute('data', JSON.stringify([{ id: 'a', tags: ['old'] }]))
    document.body.appendChild(el)
    setRangeSelection(el, { row: 0, col: 'tags' })
    expect(applyRangePaste(el, 'first, second,third')).toBe(1)
    expect(el.data[0]!.tags).toEqual(['first', 'second', 'third'])
  })

  it('树形展开子行按行键写回，不重写父行或其它子行', () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('row-key', 'id')
    el.setAttribute(
      'data',
      JSON.stringify([
        {
          id: 'p',
          name: '父',
          children: [
            { id: 'c1', name: '子一' },
            { id: 'c2', name: '子二' },
          ],
        },
      ]),
    )
    el.setAttribute('expanded', 'p')
    document.body.appendChild(el)
    setRangeSelection(el, { row: 2, col: 'name' })
    expect(applyRangePaste(el, '子二新')).toBe(1)
    expect(el.data).toEqual([
      {
        id: 'p',
        name: '父',
        children: [
          { id: 'c1', name: '子一' },
          { id: 'c2', name: '子二新' },
        ],
      },
    ])
  })
})

describe('table/range 复审边界回归', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('分组折叠后按行键重定位离窗选区，不返回越界坐标', () => {
    const el = mountGrouped()
    selectByKey(el, { key: 'r30', col: 'name', abs: 30 }, { key: 'r59', col: 'name', abs: 59 })
    expect(getRangeSelection(el)).toEqual({ start: { row: 30, col: 'name' }, end: { row: 59, col: 'name' } })
    const toggle = el.shadowRoot!.querySelector<HTMLElement>('.group-header button')!
    toggle.click()
    expect(getRangeSelection(el)).toEqual({ start: { row: 28, col: 'name' }, end: { row: 57, col: 'name' } })
    const count = Number(el.shadowRoot!.querySelector('table')!.getAttribute('aria-rowcount'))
    expect(getRangeSelection(el)!.end.row).toBeLessThan(count)
  })

  it('分组本地虚拟键盘越过组头仍能逐行推进', async () => {
    const el = mountGrouped()
    enableRangeSelection(el)
    selectByKey(el, { key: 'r0', col: 'name' })
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    for (let target = 1; target <= 12; target++) {
      const current = getRangeSelection(el)!.end.row
      cellAtDataIndex(el, current, 'name').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
      )
      wrap.dispatchEvent(new Event('scroll'))
      await vi.waitFor(() => expect(getRangeSelection(el)?.end.row).toBe(target))
    }
    expect(cellAtDataIndex(el, 12, 'name').classList.contains('range-focus')).toBe(true)
  })

  it('pendingSelection 在 window-start 先于 data 时等待新切片，不绑定旧行键', () => {
    const el = mountWindowed(0, 12)
    setRangeSelection(el, { row: 55, col: 'name' })
    expect(getRangeSelection(el)).toBeNull()
    el.setAttribute('window-start', '50')
    el.data = Array.from({ length: 12 }, (_, index) => ({
      id: `r${50 + index}`,
      name: `R${50 + index}`,
      age: 50 + index,
    }))
    expect(getRangeSelection(el)).toEqual({ start: { row: 55, col: 'name' }, end: { row: 55, col: 'name' } })
    expect(cellAtDataIndex(el, 55, 'name').classList.contains('range-selected')).toBe(true)
    expect(rowAtDataIndex(el, 55)!.getAttribute('data-key')).toBe('r55')
  })

  it('windowed total 缩小时丢弃越界 abs 选区', () => {
    const el = mountWindowed(0, 12)
    selectByKey(el, { key: 'r0', col: 'name', abs: 0 }, { key: 'r59', col: 'name', abs: 59 })
    expect(getRangeSelection(el)).toEqual({ start: { row: 0, col: 'name' }, end: { row: 59, col: 'name' } })
    el.setAttribute('total', '5')
    expect(getRangeSelection(el)).toBeNull()
  })

  it('windowed 期望区间已被装载覆盖时不重复派发窗口请求', async () => {
    const el = mountWindowed(0, 10)
    el.setAttribute('height', '80')
    el.setAttribute('row-height', '40')
    el.setAttribute('total', '10')
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 0
    wrap.dispatchEvent(new Event('scroll'))
    await vi.waitFor(() => expect(rowAtDataIndex(el, 5)).toBeTruthy())
    const rendered = [...el.shadowRoot!.querySelectorAll<HTMLTableRowElement>('tr.row')]
    const lastIndex = Math.max(...rendered.map((tr) => Number(tr.getAttribute('data-row-index'))))
    expect(lastIndex).toBeLessThan(9)
    selectByKey(el, { key: `r${lastIndex}`, col: 'name', abs: lastIndex })
    const requests: unknown[] = []
    el.addEventListener('oas-window-request', (event) => requests.push((event as CustomEvent).detail))
    cellAtDataIndex(el, lastIndex, 'name').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true, cancelable: true }),
    )
    expect(requests).toEqual([])
    wrap.dispatchEvent(new Event('scroll'))
    await vi.waitFor(() => expect(getRangeSelection(el)?.end.row).toBe(lastIndex + 1))
  })

  it('多选区 header:true 只给第一个非空块带表头', async () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
      { id: 'c', name: 'C', age: 3 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 0, col: 'name' })
    addRangeSelection(el, { row: 2, col: 'age' })
    expect(await copyRange(el, { header: true })).toBe('名称\nA\n\n3')
  })

  it('对角选区的 paste startKey 取归一化左上角行键', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 1, col: 'age' }, { row: 0, col: 'name' })
    const events: Array<{ startKey: string }> = []
    el.addEventListener('oas-range-paste', (event) => events.push((event as CustomEvent).detail))
    const paste = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(paste, 'clipboardData', { value: { getData: () => 'x' } })
    cell(el, 0, 'name').dispatchEvent(paste)
    expect(events).toHaveLength(1)
    expect(events[0]!.startKey).toBe('a')
  })

  it('离窗选区 copyRange({header:true}) 至少返回表头行', async () => {
    const el = mountWindowed(50, 12)
    selectByKey(el, { key: 'r55', col: 'name', abs: 55 })
    el.setAttribute('window-start', '60')
    el.data = Array.from({ length: 2 }, (_, index) => ({
      id: `r${60 + index}`,
      name: `R${60 + index}`,
      age: 60 + index,
    }))
    expect(await copyRange(el, { header: true })).toBe('名称')
  })

  it('fillRange 源列不存在时返回 0，不写 undefined 键', () => {
    const el = mount()
    const before = el.data
    const changed = fillRange(el, {
      source: { start: { row: 0, col: 'missing' }, end: { row: 0, col: 'missing' } },
    })
    expect(changed).toBe(0)
    expect(el.data).toEqual(before)
  })

  it('getDisplaySnapshot 在 windowed 下也返回绝对行号', () => {
    const el = mountWindowed(50, 12)
    const snapshot = el.getDisplaySnapshot()!
    expect(snapshot.rowIndexByKey.get('r55')).toBe(55)
    expect(snapshot.flatIndexByKey.get('r55')).toBe(55)
  })

  it('getDisplaySnapshot 的 windowed 展开行不占额外绝对槽位', () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('row-key', 'id')
    el.setAttribute('windowed', '')
    el.setAttribute('total', '100')
    el.setAttribute('window-start', '50')
    el.setAttribute('expanded', 'r50')
    el.setAttribute(
      'data',
      JSON.stringify([
        { id: 'r50', name: 'R50', expand: '<p>详情</p>' },
        { id: 'r51', name: 'R51' },
      ]),
    )
    document.body.appendChild(el)
    const snapshot = el.getDisplaySnapshot()!
    expect(snapshot.flatIndexByKey.get('r51')).toBe(51)
  })

  it('setRangeSelection/selectRow 直接解析已装载但未渲染的行', () => {
    const grouped = mountGrouped()
    selectRow(grouped, 30)
    expect(getRangeSelection(grouped)).toEqual({ start: { row: 30, col: 'name' }, end: { row: 30, col: 'name' } })
    setRangeSelection(grouped, { row: 59, col: 'name' })
    expect(getRangeSelection(grouped)).toEqual({ start: { row: 59, col: 'name' }, end: { row: 59, col: 'name' } })

    const windowed = mountWindowed(50, 12)
    windowed.setAttribute('height', '80')
    setRangeSelection(windowed, { row: 55, col: 'name' })
    expect(getRangeSelection(windowed)).toEqual({ start: { row: 55, col: 'name' }, end: { row: 55, col: 'name' } })
    selectByKey(windowed, { key: 'r56', col: 'name' })
    expect(getRangeSelection(windowed)).toEqual({ start: { row: 56, col: 'name' }, end: { row: 56, col: 'name' } })
  })

  it('pendingSelection 支持 data 先于 window-start 的反序回填', () => {
    const el = mountWindowed(0, 12)
    setRangeSelection(el, { row: 55, col: 'name' })
    el.data = Array.from({ length: 17 }, (_, index) => ({
      id: `r${44 + index}`,
      name: `R${44 + index}`,
      age: 44 + index,
    }))
    el.setAttribute('window-start', '44')
    expect(getRangeSelection(el)).toEqual({ start: { row: 55, col: 'name' }, end: { row: 55, col: 'name' } })
    expect(rowAtDataIndex(el, 55)!.getAttribute('data-key')).toBe('r55')
  })

  it('反序长切片在 window-start 未落定时不误绑，落定后选中目标行', () => {
    const el = mountWindowed(0, 12)
    setRangeSelection(el, { row: 55, col: 'name' })
    el.data = Array.from({ length: 200 }, (_, index) => ({
      id: `r${44 + index}`,
      name: `R${44 + index}`,
      age: 44 + index,
    }))
    expect(getRangeSelection(el)).toBeNull()
    el.setAttribute('window-start', '44')
    expect(getRangeSelection(el)).toEqual({ start: { row: 55, col: 'name' }, end: { row: 55, col: 'name' } })
    expect(rowAtDataIndex(el, 55)!.getAttribute('data-key')).toBe('r55')
  })

  it('pendingFocus 反序长切片也在 window-start 落定后聚焦目标行', () => {
    const el = mountWindowed(50, 2)
    setRangeSelection(el, { row: 51, col: 'name' })
    cellAtDataIndex(el, 51, 'name').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true, cancelable: true }),
    )
    el.data = Array.from({ length: 200 }, (_, index) => ({
      id: `r${44 + index}`,
      name: `R${44 + index}`,
      age: 44 + index,
    }))
    el.setAttribute('window-start', '44')
    expect(getRangeSelection(el)).toEqual({ start: { row: 51, col: 'name' }, end: { row: 52, col: 'name' } })
    expect(rowAtDataIndex(el, 52)!.getAttribute('data-key')).toBe('r52')
  })

  it('同首行键的 data 扩窗无需 window-start 变化即可落地', () => {
    const el = mountWindowed(0, 2)
    setRangeSelection(el, { row: 5, col: 'name' })
    el.data = Array.from({ length: 10 }, (_, index) => ({ id: `r${index}`, name: `R${index}`, age: index }))
    expect(getRangeSelection(el)).toEqual({ start: { row: 5, col: 'name' }, end: { row: 5, col: 'name' } })
    expect(rowAtDataIndex(el, 5)!.getAttribute('data-key')).toBe('r5')
  })

  it('windowed 起始行离窗时 paste 仍带原行键 startKey', () => {
    const el = mountWindowed(50, 12)
    selectByKey(el, { key: 'r55', col: 'name', abs: 55 })
    el.setAttribute('window-start', '60')
    el.data = Array.from({ length: 2 }, (_, index) => ({
      id: `r${60 + index}`,
      name: `R${60 + index}`,
      age: 60 + index,
    }))
    const events: Array<{ startKey: string }> = []
    el.addEventListener('oas-range-paste', (event) => events.push((event as CustomEvent).detail))
    const paste = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(paste, 'clipboardData', { value: { getData: () => 'x' } })
    cellAtDataIndex(el, 60, 'name').dispatchEvent(paste)
    expect(events).toHaveLength(1)
    expect(events[0]!.startKey).toBe('r55')
  })
})
