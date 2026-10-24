import { beforeEach, describe, expect, it } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from '../index.js'
import { canRedo, canUndo, clearHistory, disableHistory, enableHistory, redo, undo } from './index.js'

function mount(
  rows: Array<Record<string, unknown>> = [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
  ],
): OASTable {
  const el = new OASTable()
  el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
  el.setAttribute('row-key', 'id')
  el.setAttribute('data', JSON.stringify(rows))
  document.body.appendChild(el)
  return el
}

function emitEdit(
  el: OASTable,
  detail: {
    rowIndex: number
    key: string
    column: string
    oldValue?: string
    oldRawValue?: unknown
    value?: string
  },
): void {
  el.dispatchEvent(new CustomEvent('oas-edit', { detail }))
}

describe('table/history 撤销重做', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('按行键定位数据行（可见 rowIndex 漂移也能正确回写），并可 undo/redo', () => {
    const el = mount()
    enableHistory(el)
    const states: unknown[] = []
    el.addEventListener('oas-history-change', (event) => states.push((event as CustomEvent).detail))
    el.data = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B2' },
    ]
    // 故意给错 rowIndex：验证按 key='b' 定位而不是按显示坐标
    emitEdit(el, { rowIndex: 0, key: 'b', column: 'name', oldValue: 'B', value: 'B2' })
    expect(canUndo(el)).toBe(true)
    expect(states).toEqual([{ canUndo: true, canRedo: false }])

    expect(undo(el)).toBe(true)
    expect(el.data).toEqual([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ])
    expect(canRedo(el)).toBe(true)
    expect(redo(el)).toBe(true)
    expect(el.data).toEqual([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B2' },
    ])
  })

  it('Ctrl/Cmd+Z / Shift+Z 键盘撤销重做，输入框内不拦截', () => {
    const el = mount()
    enableHistory(el)
    el.data = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B2' },
    ]
    emitEdit(el, { rowIndex: 1, key: 'b', column: 'name', oldValue: 'B', value: 'B2' })
    el.shadowRoot!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }),
    )
    expect((el.data[1] as { name: string }).name).toBe('B')
    el.shadowRoot!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }),
    )
    expect((el.data[1] as { name: string }).name).toBe('B2')
  })

  it('编辑框内的 Ctrl+Z 不拦截（交给原生输入撤销）', () => {
    const el = mount()
    enableHistory(el)
    el.data = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B2' },
    ]
    emitEdit(el, { rowIndex: 1, key: 'b', column: 'name', oldValue: 'B', value: 'B2' })
    const input = document.createElement('input')
    el.shadowRoot!.appendChild(input)
    const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true })
    input.dispatchEvent(event)
    expect((el.data[1] as { name: string }).name).toBe('B2')
    expect(event.defaultPrevented).toBe(false)
  })

  it('edit-controlled / windowed 不记录；缺 oldValue 不记录；clearHistory / disableHistory', () => {
    const el = mount()
    enableHistory(el)
    el.setAttribute('edit-controlled', '')
    emitEdit(el, { rowIndex: 0, key: 'a', column: 'name', oldValue: 'A', value: 'X' })
    expect(canUndo(el)).toBe(false)
    el.removeAttribute('edit-controlled')
    el.setAttribute('windowed', '')
    emitEdit(el, { rowIndex: 0, key: 'a', column: 'name', oldValue: 'A', value: 'X' })
    expect(canUndo(el)).toBe(false)
    el.removeAttribute('windowed')
    emitEdit(el, { rowIndex: 0, key: 'a', column: 'name', value: 'X' })
    expect(canUndo(el)).toBe(false)

    emitEdit(el, { rowIndex: 0, key: 'a', column: 'name', oldValue: 'A', value: 'Y' })
    expect(canUndo(el)).toBe(true)
    clearHistory(el)
    expect(canUndo(el)).toBe(false)

    emitEdit(el, { rowIndex: 0, key: 'a', column: 'name', oldValue: 'Y', value: 'Z' })
    disableHistory(el)
    emitEdit(el, { rowIndex: 0, key: 'a', column: 'name', oldValue: 'Z', value: 'W' })
    expect(canUndo(el)).toBe(false)
    expect(undo(el)).toBe(false)
    expect(redo(el)).toBe(false)
  })

  it('编辑行键字段导致键漂移时，按另一侧值唯一定位并可撤销', () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('row-key', 'name')
    el.setAttribute('data', JSON.stringify([{ name: 'A' }, { name: 'B' }]))
    document.body.appendChild(el)
    enableHistory(el)
    el.data = [{ name: 'A2' }, { name: 'B' }]
    emitEdit(el, { rowIndex: 0, key: 'A', column: 'name', oldValue: 'A', value: 'A2' })
    expect(undo(el)).toBe(true)
    expect(el.data).toEqual([{ name: 'A' }, { name: 'B' }])
    expect(redo(el)).toBe(true)
    expect(el.data).toEqual([{ name: 'A2' }, { name: 'B' }])
  })

  it('嵌套自定义组件内的 Ctrl+Z 不触发表格撤销（composedPath 穿透 retarget）', () => {
    const el = mount()
    enableHistory(el)
    el.data = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B2' },
    ]
    emitEdit(el, { rowIndex: 1, key: 'b', column: 'name', oldValue: 'B', value: 'B2' })
    const nested = document.createElement('div')
    const innerRoot = nested.attachShadow({ mode: 'open' })
    innerRoot.innerHTML = '<input />'
    el.shadowRoot!.appendChild(nested)
    innerRoot
      .querySelector('input')!
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, composed: true, cancelable: true }),
      )
    expect((el.data[1] as { name: string }).name).toBe('B2')
    disableHistory(el)
  })

  it('无 row-key 时按 rowIndex 回退（无排序/过滤场景）', () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('data', JSON.stringify([{ name: 'A' }]))
    document.body.appendChild(el)
    enableHistory(el)
    el.data = [{ name: 'X' }]
    emitEdit(el, { rowIndex: 0, key: '{"name":"A"}', column: 'name', oldValue: 'A', value: 'X' })
    expect(undo(el)).toBe(true)
    expect(el.data).toEqual([{ name: 'A' }])
    disableHistory(el)
  })

  it('撤销/重做保留原始数据类型（number / string[]）', () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'score', title: '分数' }]))
    el.setAttribute('row-key', 'id')
    el.setAttribute('data', JSON.stringify([{ id: 'a', score: 1 }]))
    document.body.appendChild(el)
    enableHistory(el)
    el.data = [{ id: 'a', score: 2 }]
    emitEdit(el, { rowIndex: 0, key: 'a', column: 'score', oldValue: '1', value: '2', oldRawValue: 1 })
    expect(undo(el)).toBe(true)
    expect((el.data[0] as { score: unknown }).score).toBe(1)
    expect(redo(el)).toBe(true)
    expect((el.data[0] as { score: unknown }).score).toBe(2)
    disableHistory(el)

    const el2 = new OASTable()
    el2.setAttribute('columns', JSON.stringify([{ key: 'tags', title: '标签' }]))
    el2.setAttribute('row-key', 'id')
    el2.setAttribute('data', JSON.stringify([{ id: 'a', tags: ['x'] }]))
    document.body.appendChild(el2)
    enableHistory(el2)
    el2.data = [{ id: 'a', tags: ['y'] }]
    emitEdit(el2, {
      rowIndex: 0,
      key: 'a',
      column: 'tags',
      oldValue: 'x',
      value: 'y',
      oldRawValue: ['x'],
    })
    expect(undo(el2)).toBe(true)
    expect((el2.data[0] as { tags: unknown }).tags).toEqual(['x'])
    expect(redo(el2)).toBe(true)
    expect((el2.data[0] as { tags: unknown }).tags).toEqual(['y'])
    disableHistory(el2)
  })

  it('树形子行（children）按递归路径撤销/重做', () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('row-key', 'id')
    el.setAttribute('data', JSON.stringify([{ id: 'p', name: 'P', children: [{ id: 'c', name: 'C' }] }]))
    document.body.appendChild(el)
    enableHistory(el)
    el.data = [{ id: 'p', name: 'P', children: [{ id: 'c', name: 'C2' }] }]
    emitEdit(el, { rowIndex: 0, key: 'c', column: 'name', oldValue: 'C', value: 'C2', oldRawValue: 'C' })
    expect(undo(el)).toBe(true)
    expect((el.data[0] as { children: Array<{ name: string }> }).children[0]!.name).toBe('C')
    expect((el.data[0] as { name: string }).name).toBe('P')
    expect(redo(el)).toBe(true)
    expect((el.data[0] as { children: Array<{ name: string }> }).children[0]!.name).toBe('C2')
    disableHistory(el)
  })

  it('未升级/非表格元素调用 enableHistory 抛错，不静默失效', () => {
    expect(() => enableHistory(document.createElement('div'))).toThrow(/需要已升级的 oas-table/)
  })

  it('新编辑清空 redo 栈', () => {
    const el = mount()
    enableHistory(el)
    emitEdit(el, { rowIndex: 0, key: 'a', column: 'name', oldValue: 'A', value: 'A1' })
    undo(el)
    expect(canRedo(el)).toBe(true)
    emitEdit(el, { rowIndex: 0, key: 'a', column: 'name', oldValue: 'A', value: 'A2' })
    expect(canRedo(el)).toBe(false)
  })
})
