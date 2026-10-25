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
    const before = getRangeSelection(el)!.end.row
    cell(el, count - 1, 'name').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true, cancelable: true }),
    )
    const wrap = el.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => setTimeout(resolve, 60))
    const after = getRangeSelection(el)
    expect(after).not.toBeNull()
    expect(after!.end.row).toBeGreaterThan(before)
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
    expect(requests).toEqual([{ start: 2, end: 3, reason: 'scroll' }])
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
      { id: 'b', name: 'B', age: 2 },
      { id: 'c', name: 'C', age: 3 },
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
