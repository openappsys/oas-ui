import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from '../index.js'
import { copyRange, enableRangeSelection, getRangeSelection, setRangeSelection } from './index.js'

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

  it('拖拽跨格后表格外释放能复位，不残留 dragging', () => {
    const el = mount()
    enableRangeSelection(el)
    const first = cell(el, 0, 'name')
    const second = cell(el, 1, 'age')
    first.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }))
    second.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, button: 0, pointerId: 1 }))
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

  it('windowed：行离开窗口后选区解析为 null，装饰清零并派发清空事件', () => {
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
    expect(getRangeSelection(el)).toBeNull()
    expect(el.shadowRoot!.querySelectorAll('td.range-selected')).toHaveLength(0)
    expect(events.at(-1)).toBeNull()
  })
})
