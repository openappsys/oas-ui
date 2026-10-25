import { beforeEach, describe, expect, it } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from '../index.js'
import {
  canRedo,
  canUndo,
  clearHistory,
  disableHistory,
  enableHistory,
  recordHistory,
  redo,
  undo,
  withHistoryBatch,
} from './index.js'

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

function emitRangeWrite(
  el: OASTable,
  detail: {
    kind: 'paste' | 'cut' | 'fill'
    changes: Array<{ key: string; column: string; value: unknown; oldValue?: string; oldRawValue?: unknown }>
  },
): void {
  el.dispatchEvent(new CustomEvent('oas-range-write', { detail }))
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

  it('无 row-key 记录后行被删除：undo 不复活幽灵行/不覆盖无关行', () => {
    const el = new OASTable()
    el.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    el.setAttribute('data', JSON.stringify([{ name: 'A' }, { name: 'B' }]))
    document.body.appendChild(el)
    enableHistory(el)
    // 编辑 A 后宿主删除了该行：数据只剩 B
    el.data = [{ name: 'B' }]
    emitEdit(el, { rowIndex: 0, key: '{"name":"A"}', column: 'name', oldValue: 'A', value: 'A2', oldRawValue: 'A' })
    undo(el)
    expect(el.data).toEqual([{ name: 'B' }])
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

  it('recordHistory：未启用返回 false；启用后显式命令可撤销/重做；重复 enable 不重置既有栈', () => {
    const el = mount()
    expect(recordHistory(el, { undo: () => {}, redo: () => {} })).toBe(false)
    enableHistory(el)
    const log: string[] = []
    expect(recordHistory(el, { label: 'a', undo: () => log.push('undo-a'), redo: () => log.push('redo-a') })).toBe(true)
    el.data = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B2' },
    ]
    emitEdit(el, { rowIndex: 0, key: 'b', column: 'name', oldValue: 'B', value: 'B2' })
    // 重复 enable：返回既有栈，不清空已记录命令
    enableHistory(el)
    expect(undo(el)).toBe(true)
    expect((el.data[1] as { name: string }).name).toBe('B')
    expect(undo(el)).toBe(true)
    expect(log).toEqual(['undo-a'])
    expect(redo(el)).toBe(true)
    expect(log).toEqual(['undo-a', 'redo-a'])
  })

  it('withHistoryBatch：批内子命令合并为一条事务，undo 逆序 / redo 正序', () => {
    const el = mount()
    enableHistory(el)
    const log: string[] = []
    const command = (name: string): void => {
      recordHistory(el, {
        label: name,
        undo: () => log.push(`undo:${name}`),
        redo: () => log.push(`redo:${name}`),
      })
    }
    withHistoryBatch(el, () => {
      command('a')
      command('b')
      command('c')
    })
    expect(canUndo(el)).toBe(true)
    undo(el)
    expect(log).toEqual(['undo:c', 'undo:b', 'undo:a'])
    expect(canUndo(el)).toBe(false)
    expect(canRedo(el)).toBe(true)
    redo(el)
    expect(log).toEqual(['undo:c', 'undo:b', 'undo:a', 'redo:a', 'redo:b', 'redo:c'])
  })

  it('withHistoryBatch：批内 oas-edit 自动记录并入同一事务', () => {
    const el = mount()
    enableHistory(el)
    let extraUndone = false
    withHistoryBatch(el, () => {
      el.data = [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B2' },
      ]
      emitEdit(el, { rowIndex: 1, key: 'b', column: 'name', oldValue: 'B', value: 'B2' })
      recordHistory(el, { undo: () => (extraUndone = true), redo: () => (extraUndone = false) })
    })
    expect(undo(el)).toBe(true)
    // 逆序：后记录的自定义命令先撤销，oas-edit 后撤销回写旧值
    expect(extraUndone).toBe(true)
    expect((el.data[1] as { name: string }).name).toBe('B')
    expect(canUndo(el)).toBe(false)
  })

  it('withHistoryBatch：嵌套批次合并到最外层，undo 逆序 / redo 正序', () => {
    const el = mount()
    enableHistory(el)
    const log: string[] = []
    const command = (name: string): void => {
      recordHistory(el, { undo: () => log.push(`undo:${name}`), redo: () => log.push(`redo:${name}`) })
    }
    withHistoryBatch(el, () => {
      command('a')
      withHistoryBatch(el, () => {
        command('b')
        withHistoryBatch(el, () => command('c'))
      })
      command('d')
    })
    undo(el)
    expect(log).toEqual(['undo:d', 'undo:c', 'undo:b', 'undo:a'])
    redo(el)
    expect(log).toEqual(['undo:d', 'undo:c', 'undo:b', 'undo:a', 'redo:a', 'redo:b', 'redo:c', 'redo:d'])
  })

  it('withHistoryBatch：批内抛错不入栈且异常传播；内层抛错被外层捕获后外层命令仍成批', () => {
    const el = mount()
    enableHistory(el)
    expect(() =>
      withHistoryBatch(el, () => {
        recordHistory(el, { undo: () => {}, redo: () => {} })
        throw new Error('boom')
      }),
    ).toThrow('boom')
    expect(canUndo(el)).toBe(false)

    withHistoryBatch(el, () => {
      recordHistory(el, { label: 'outer-1', undo: () => {}, redo: () => {} })
      try {
        withHistoryBatch(el, () => {
          recordHistory(el, { label: 'inner', undo: () => {}, redo: () => {} })
          throw new Error('inner')
        })
      } catch {
        /* 外层吞掉内层错误 */
      }
      recordHistory(el, { label: 'outer-2', undo: () => {}, redo: () => {} })
    })
    expect(canUndo(el)).toBe(true)
    undo(el)
    // 内层抛错的子命令已被丢弃，只剩外层两条合并事务
    expect(canUndo(el)).toBe(false)
  })

  it('withHistoryBatch：空批次不入栈；未启用时 fn 照常执行', () => {
    const el = mount()
    let called = false
    const result = withHistoryBatch(el, () => {
      called = true
      return 42
    })
    expect(result).toBe(42)
    expect(called).toBe(true)
    enableHistory(el)
    withHistoryBatch(el, () => {})
    expect(canUndo(el)).toBe(false)
  })

  it('oas-range-write 合并为一条事务：undo 按 changes 逆序恢复原类型，redo 正序', () => {
    const el = mount([
      { id: 'a', name: 'A', score: 1 },
      { id: 'b', name: 'B', score: 2 },
    ])
    enableHistory(el)
    el.data = [
      { id: 'a', name: 'A2', score: 10 },
      { id: 'b', name: 'B2', score: 20 },
    ]
    emitRangeWrite(el, {
      kind: 'paste',
      changes: [
        { key: 'a', column: 'name', value: 'A2', oldValue: 'A' },
        { key: 'b', column: 'score', value: 20, oldValue: '2', oldRawValue: 2 },
      ],
    })
    expect(canUndo(el)).toBe(true)
    expect(undo(el)).toBe(true)
    expect(el.data).toEqual([
      { id: 'a', name: 'A', score: 10 },
      { id: 'b', name: 'B2', score: 2 },
    ])
    // 单条事务：一次 undo 全部还原，无剩余可撤销
    expect(canUndo(el)).toBe(false)
    expect(canRedo(el)).toBe(true)
    expect(redo(el)).toBe(true)
    expect(el.data).toEqual([
      { id: 'a', name: 'A2', score: 10 },
      { id: 'b', name: 'B2', score: 20 },
    ])
  })

  it('oas-range-write：rangeWrites:false / edit-controlled / windowed 默认不记录', () => {
    const el = mount()
    enableHistory(el, { rangeWrites: false })
    emitRangeWrite(el, { kind: 'fill', changes: [{ key: 'a', column: 'name', value: 'X', oldValue: 'A' }] })
    expect(canUndo(el)).toBe(false)
    disableHistory(el)

    enableHistory(el)
    el.setAttribute('edit-controlled', '')
    emitRangeWrite(el, { kind: 'paste', changes: [{ key: 'a', column: 'name', value: 'X', oldValue: 'A' }] })
    expect(canUndo(el)).toBe(false)
    el.removeAttribute('edit-controlled')

    el.setAttribute('windowed', '')
    emitRangeWrite(el, { kind: 'cut', changes: [{ key: 'a', column: 'name', value: 'X', oldValue: 'A' }] })
    expect(canUndo(el)).toBe(false)
  })

  it('windowed 选项开启后，windowed 表格的 oas-range-write / oas-edit 都记录', () => {
    const el = mount()
    el.setAttribute('windowed', '')
    enableHistory(el, { windowed: true })
    emitRangeWrite(el, { kind: 'paste', changes: [{ key: 'a', column: 'name', value: 'X', oldValue: 'A' }] })
    expect(canUndo(el)).toBe(true)
    disableHistory(el)

    // 独立启用：oas-edit 同样按 options.windowed 决定是否记录
    enableHistory(el, { windowed: true })
    el.data = [{ id: 'a', name: 'X' }]
    emitEdit(el, { rowIndex: 0, key: 'a', column: 'name', oldValue: 'A', value: 'X' })
    expect(canUndo(el)).toBe(true)
  })

  it('oas-range-write：缺 column/key/旧值的 change 跳过；全部无效则不入栈', () => {
    const el = mount()
    enableHistory(el)
    emitRangeWrite(el, { kind: 'cut', changes: [{ key: 'a', column: '', value: 'X' }] })
    expect(canUndo(el)).toBe(false)
    emitRangeWrite(el, { kind: 'fill', changes: [{ key: 'a', column: 'name', value: 'X' }] })
    expect(canUndo(el)).toBe(false)
    emitRangeWrite(el, { kind: 'paste', changes: [] })
    expect(canUndo(el)).toBe(false)
  })

  it('oas-range-write：oldRawValue 与 value 原类型同值时不入栈', () => {
    const el = mount([{ id: 'a', name: 'A', score: 1, enabled: true }])
    enableHistory(el)
    emitRangeWrite(el, {
      kind: 'paste',
      changes: [
        { key: 'a', column: 'score', value: 1, oldValue: '1', oldRawValue: 1 },
        { key: 'a', column: 'enabled', value: true, oldValue: 'true', oldRawValue: true },
        { key: 'a', column: 'tags', value: ['x', 'y'], oldValue: 'x,y', oldRawValue: ['x', 'y'] },
      ],
    })
    expect(canUndo(el)).toBe(false)
  })
})
