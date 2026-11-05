import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerLocale, setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import { OASTable } from '../index.js'
import { fillRange, getRangeSelection, setRangeSelection } from './index.js'

function mount(
  rows: Array<Record<string, unknown>>,
  columns: Array<Record<string, unknown>> = [
    { key: 'name', title: '名称' },
    { key: 'age', title: '年龄' },
  ],
): OASTable {
  const el = new OASTable()
  el.setAttribute('columns', JSON.stringify(columns))
  el.setAttribute('data', JSON.stringify(rows))
  document.body.appendChild(el)
  return el
}

function cell(el: OASTable, row: number, col: string): HTMLElement {
  const tr = [...el.shadowRoot!.querySelectorAll('tr.row')][row]!
  return [...tr.querySelectorAll<HTMLElement>('td[data-col]')].find((td) => td.getAttribute('data-col') === col)!
}

function handleOf(el: OASTable, row: number, col: string): HTMLElement | null {
  return cell(el, row, col).querySelector<HTMLElement>('.range-fill-handle')
}

/** 拖拽填充柄到目标格（与既有 range.test.ts 同一事件链：down → move → window up） */
function dragHandle(el: OASTable, from: HTMLElement, toRow: number, toCol: string): void {
  from.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }))
  cell(el, toRow, toCol).dispatchEvent(new PointerEvent('pointermove', { bubbles: true, button: 0, pointerId: 1 }))
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
}

describe('table/range 填充柄（渲染条件与 a11y）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('有激活选区默认渲染：role=button + 本地化 aria-label（zh）', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 0, col: 'age' })
    const handle = handleOf(el, 0, 'age')!
    expect(handle.getAttribute('role'), '选区激活后手柄渲染并带可发现角色').toBe('button')
    expect(handle.getAttribute('aria-label')).toBe('填充柄')
    expect(handle.getAttribute('part')).toBe('fill-handle')
    expect(handle.hasAttribute('aria-hidden'), '可发现入口不再 aria-hidden').toBe(false)
  })

  it('aria-label 跟随 locale（en）', () => {
    registerLocale(en)
    setLocale('en')
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
    ])
    setRangeSelection(el, { row: 0, col: 'age' })
    expect(handleOf(el, 0, 'age')?.getAttribute('aria-label'), 'en 包下 aria-label 为英文').toBe('Fill handle')
  })

  it('无选区不渲染；清空选区后移除', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
    ])
    expect(el.shadowRoot!.querySelector('.range-fill-handle')).toBeNull()
    setRangeSelection(el, { row: 0, col: 'age' })
    expect(handleOf(el, 0, 'age')!.getAttribute('role'), '选区激活后手柄渲染').toBe('button')
    setRangeSelection(el, null)
    expect(el.shadowRoot!.querySelector('.range-fill-handle')).toBeNull()
  })

  it('fill-handle="false" 移除手柄且拖拽失效；恢复缺省后回来', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
      { id: 'c', name: 'C', age: 3 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 0, col: 'age' })
    expect(handleOf(el, 0, 'age')!.getAttribute('role')).toBe('button')
    el.setAttribute('fill-handle', 'false')
    expect(el.shadowRoot!.querySelector('.range-fill-handle'), '开关关闭后手柄移除').toBeNull()
    // 关闭态下即使手柄被外部注入也不触发填充（渲染与拖拽共用一个判定）
    const writes: unknown[] = []
    el.addEventListener('oas-range-write', (event) => writes.push((event as CustomEvent).detail))
    const fake = document.createElement('span')
    fake.className = 'range-fill-handle'
    cell(el, 0, 'age').appendChild(fake)
    fake.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }))
    cell(el, 2, 'age').dispatchEvent(new PointerEvent('pointermove', { bubbles: true, button: 0, pointerId: 1 }))
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
    expect(el.data.map((row) => row.age)).toEqual([1, 2, 3])
    expect(writes).toEqual([])
    el.removeAttribute('fill-handle')
    expect(handleOf(el, 0, 'age')!.getAttribute('role'), '恢复缺省后手柄回归').toBe('button')
  })

  it('编辑中（任一格存在 .cell-editor）手柄不渲染；编辑器移除后恢复', async () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 0, col: 'age' })
    expect(handleOf(el, 0, 'age')!.getAttribute('role'), '选区激活后手柄在场（编辑抑制前置态）').toBe('button')
    // 模拟编辑能力挂载编辑器（childList 观察触发同步，手柄实时消失）
    const editor = document.createElement('input')
    editor.className = 'cell-editor'
    cell(el, 1, 'name').appendChild(editor)
    await vi.waitFor(() => expect(el.shadowRoot!.querySelector('.range-fill-handle')).toBeNull())
    editor.remove()
    await vi.waitFor(() => expect(handleOf(el, 0, 'age')?.getAttribute('role'), '编辑器移除后手柄恢复').toBe('button'))
  })

  it('注入样式含填充柄 token 出口与 coarse 44px 命中区（机制层）', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
    ])
    setRangeSelection(el, { row: 0, col: 'age' })
    const style = el.shadowRoot!.querySelector<HTMLStyleElement>('#oas-table-range-style')!.textContent
    expect(style).toContain('--oas-table-fill-handle-color')
    expect(style).toContain('--oas-table-fill-handle-outline')
    expect(style).toContain('@media (pointer: coarse)')
    expect(style).toContain('44px')
  })
})

describe('table/range 填充柄（auto 语义与事务）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('数值列 [1,5] 向下拖两格：首差序列 9、13；oas-range-write 单事件单事务', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 5 },
      { id: 'c', name: 'C', age: 0 },
      { id: 'd', name: 'D', age: 0 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 0, col: 'age' }, { row: 1, col: 'age' })
    const writes: Array<{ kind: string; changes: unknown[] }> = []
    el.addEventListener('oas-range-write', (event) => {
      const detail = (event as CustomEvent).detail
      writes.push({ kind: detail.kind, changes: [...detail.changes] })
    })
    dragHandle(el, handleOf(el, 1, 'age')!, 3, 'age')
    expect(writes.length, '整次拖拽只派发一条写回事件（history 合并为一条撤销）').toBe(1)
    expect(writes[0]!.kind).toBe('fill')
    expect(writes[0]!.changes).toEqual([
      { key: 'c', column: 'age', value: 9, oldValue: '0', oldRawValue: 0 },
      { key: 'd', column: 'age', value: 13, oldValue: '0', oldRawValue: 0 },
    ])
    expect(el.data.map((row) => row.age)).toEqual([1, 5, 9, 13])
  })

  it('文本多格源区向下拖两格：循环平铺 A、B', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
      { id: 'c', name: 'C', age: 3 },
      { id: 'd', name: 'D', age: 4 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 0, col: 'name' }, { row: 1, col: 'name' })
    dragHandle(el, handleOf(el, 1, 'name')!, 3, 'name')
    expect(el.data.map((row) => row.name)).toEqual(['A', 'B', 'A', 'B'])
  })

  it('ISO 日期列向下拖一格：按日步进', () => {
    const el = mount(
      [
        { id: 'a', name: 'A', day: '2026-01-01' },
        { id: 'b', name: 'B', day: '2026-01-04' },
        { id: 'c', name: 'C', day: '' },
      ],
      [
        { key: 'name', title: '名称' },
        { key: 'day', title: '日期' },
      ],
    )
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 0, col: 'day' }, { row: 1, col: 'day' })
    dragHandle(el, handleOf(el, 1, 'day')!, 2, 'day')
    expect(el.data[2]!.day).toBe('2026-01-07')
  })

  it('拖回原点（无位移释放）不派发写回', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 0, col: 'age' })
    const writes: unknown[] = []
    el.addEventListener('oas-range-write', (event) => writes.push((event as CustomEvent).detail))
    dragHandle(el, handleOf(el, 0, 'age')!, 0, 'age')
    expect(writes).toEqual([])
    expect(el.data.map((row) => row.age)).toEqual([1, 2])
  })

  it('windowed 拖到未装载区外只填已装载行（不静默扩行）', () => {
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
    el.setAttribute('window-start', '50')
    el.setAttribute('data', JSON.stringify([{ id: 'r50', name: 'R50', age: 50 }]))
    document.body.appendChild(el)
    setRangeSelection(el, { row: 50, col: 'age' })
    const before = el.data
    // 目标行 51..54 均未装载：只解析已渲染行 → 全部跳过，不扩行、不写空串
    expect(fillRange(el, { direction: 'down', cells: 4, mode: 'auto' })).toBe(0)
    expect(el.data).toEqual(before)
  })

  it('windowed 部分装载：越界目标跳过、已装载目标照常写入', () => {
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
    el.setAttribute('window-start', '49')
    el.setAttribute(
      'data',
      JSON.stringify([
        { id: 'r49', name: 'R49', age: 1 },
        { id: 'r50', name: 'R50', age: 5 },
        { id: 'r51', name: 'R51', age: 0 },
      ]),
    )
    document.body.appendChild(el)
    setRangeSelection(el, { row: 49, col: 'age' }, { row: 50, col: 'age' })
    // 请求 5 格，目标 51 已装载（9 = 5 + 4），52..55 未装载跳过：只写 1 格
    expect(fillRange(el, { direction: 'down', cells: 5, mode: 'auto' })).toBe(1)
    expect(el.data.map((row) => row.age)).toEqual([1, 5, 9])
    // 后置选区：focus 目标行未渲染时按既有语义回退源末行键（行键可见性优先于 abs 意图位）
    expect(getRangeSelection(el)!.end.row).toBe(50)
  })

  it('指针捕获态（move/up 重定向宿主）拖拽仍提交——真浏览器捕获回归', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 5 },
      { id: 'c', name: 'C', age: 0 },
      { id: 'd', name: 'D', age: 0 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 0, col: 'age' }, { row: 1, col: 'age' })
    const writes: unknown[] = []
    el.addEventListener('oas-range-write', (event) => writes.push((event as CustomEvent).detail))
    // 真浏览器 setPointerCapture 后 move/up 的 target 恒为捕获元素（宿主），事件不再流经
    // shadowRoot——组件按坐标命中真实格。happy-dom 无布局，用 elementFromPoint 桩模拟命中
    const originalFromPoint = document.elementFromPoint
    document.elementFromPoint = () => cell(el, 3, 'age')
    try {
      handleOf(el, 1, 'age')!.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }),
      )
      // 捕获形态：事件直接派发到宿主（target = 宿主，路径不含 shadowRoot）
      el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 24, clientY: 96 }))
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientX: 24, clientY: 96 }))
    } finally {
      document.elementFromPoint = originalFromPoint
    }
    expect(writes.length, '捕获态拖拽松开恰好提交一条写回').toBe(1)
    expect(el.data.map((row) => row.age)).toEqual([1, 5, 9, 13])
  })

  it('捕获态拖出表外（坐标命中不到格）：不预览、不写入', () => {
    const el = mount([
      { id: 'a', name: 'A', age: 1 },
      { id: 'b', name: 'B', age: 2 },
    ])
    el.setAttribute('row-key', 'id')
    setRangeSelection(el, { row: 0, col: 'age' })
    const writes: unknown[] = []
    el.addEventListener('oas-range-write', (event) => writes.push((event as CustomEvent).detail))
    const originalFromPoint = document.elementFromPoint
    document.elementFromPoint = () => null
    try {
      handleOf(el, 0, 'age')!.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }),
      )
      el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 8, clientY: 900 }))
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, clientX: 8, clientY: 900 }))
    } finally {
      document.elementFromPoint = originalFromPoint
    }
    expect(writes, '表外释放无预览无提交').toEqual([])
    expect(el.data.map((row) => row.age)).toEqual([1, 2])
  })
})
