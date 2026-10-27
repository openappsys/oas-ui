import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from '../index.js'
import { createMasterDetail } from './index.js'
import { getRangeSelection, setRangeSelection } from '../range/index.js'

function mount(): { table: OASTable; panel: HTMLElement } {
  const table = new OASTable()
  table.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
  table.setAttribute('row-key', 'id')
  table.setAttribute(
    'data',
    JSON.stringify([
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
    ]),
  )
  const panel = document.createElement('div')
  document.body.append(table, panel)
  return { table, panel }
}

function rowClick(table: OASTable, row: Record<string, unknown>, key: string): void {
  table.dispatchEvent(new CustomEvent('oas-row-click', { detail: { row, key } }))
}

describe('table/detail 主从详情', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('点击行渲染详情、标记行高亮并派发 oas-detail-change', () => {
    const { table, panel } = mount()
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      emptyText: '未选择',
      render: (row) => `${row.row.name}`,
    })
    expect(panel.textContent).toBe('未选择')
    expect(panel.getAttribute('role')).toBe('region')
    expect(panel.getAttribute('aria-label')).toBe('详情')

    const events: unknown[] = []
    table.addEventListener('oas-detail-change', (event) => events.push((event as CustomEvent).detail))
    rowClick(table, { id: 'b', name: 'Beta' }, 'b')
    expect(panel.textContent).toBe('Beta')
    expect(table.shadowRoot!.querySelector('tr[data-key="b"]')!.hasAttribute('data-detail-selected')).toBe(true)
    expect(table.shadowRoot!.querySelector('tr[data-key="a"]')!.hasAttribute('data-detail-selected')).toBe(false)
    expect(events).toHaveLength(1)
    expect(detail.selected).toEqual({ row: { id: 'b', name: 'Beta' }, key: 'b', rowIndex: 1 })
    detail.destroy()
  })

  it('oas-detail-change 可冒泡到父级且 composed', () => {
    const { table, panel } = mount()
    const detail = createMasterDetail(table, { panel, label: '详情', render: (row) => `${row.row.name}` })
    const parent = table.parentElement!
    const events: CustomEvent[] = []
    const listener = (event: Event): void => {
      events.push(event as CustomEvent)
    }
    parent.addEventListener('oas-detail-change', listener)
    try {
      rowClick(table, { id: 'a', name: 'Alpha' }, 'a')
      expect(events).toHaveLength(1)
      expect(events[0]!.bubbles).toBe(true)
      expect(events[0]!.composed).toBe(true)
    } finally {
      parent.removeEventListener('oas-detail-change', listener)
      detail.destroy()
    }
  })

  it('collapsible 再次点击收起；programmatic select 按可见行下标', () => {
    const { table, panel } = mount()
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      emptyText: '未选择',
      collapsible: true,
      render: (row) => `${row.row.name}`,
    })
    rowClick(table, { id: 'a', name: 'Alpha' }, 'a')
    expect(panel.textContent).toBe('Alpha')
    rowClick(table, { id: 'a', name: 'Alpha' }, 'a')
    expect(panel.textContent).toBe('未选择')

    detail.select(1)
    expect(panel.textContent).toBe('Beta')
    detail.select(9)
    expect(panel.textContent).toBe('未选择')
    detail.destroy()
  })

  it('Escape 关闭并回到原行单元格；Node 渲染与 destroy 清理', () => {
    const { table, panel } = mount()
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      render: (row) => {
        const node = document.createElement('strong')
        node.textContent = `${row.row.name}!`
        return node
      },
    })
    rowClick(table, { id: 'a', name: 'Alpha' }, 'a')
    expect(panel.querySelector('strong')?.textContent).toBe('Alpha!')
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(detail.selected).toBeNull()
    expect(table.shadowRoot!.querySelector('tr[data-key="a"]')!.hasAttribute('data-detail-selected')).toBe(false)
    expect(panel.textContent).toBe('')

    detail.destroy()
    rowClick(table, { id: 'b', name: 'Beta' }, 'b')
    expect(panel.textContent).toBe('')
    expect(table.shadowRoot!.querySelector('#oas-table-detail-style')).toBeNull()
  })

  it('重渲染后重新标记选中行（MutationObserver）', async () => {
    const { table, panel } = mount()
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      render: (row) => `${row.row.name}`,
    })
    rowClick(table, { id: 'b', name: 'Beta' }, 'b')
    table.data = [
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta2' },
    ]
    await vi.waitFor(() =>
      expect(table.shadowRoot!.querySelector('tr[data-key="b"]')!.hasAttribute('data-detail-selected')).toBe(true),
    )
    detail.destroy()
  })

  it('checkable 表用 oas-cell-click 补齐主从选择', () => {
    const { table, panel } = mount()
    table.setAttribute('checkable', '')
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      render: (row) => `${row.row.name}`,
    })
    table.dispatchEvent(
      new CustomEvent('oas-cell-click', {
        detail: { row: { id: 'b', name: 'Beta' }, rowIndex: 1, column: 'name', value: 'Beta', columnIndex: 0 },
      }),
    )
    expect(panel.textContent).toBe('Beta')
    detail.destroy()
  })

  it('checkable + windowed：绝对 rowIndex 不越界，按行键定位当前切片', () => {
    const table = new OASTable()
    table.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    table.setAttribute('row-key', 'id')
    table.setAttribute('checkable', '')
    table.setAttribute('windowed', '')
    table.setAttribute('total', '100')
    table.setAttribute('window-start', '50')
    table.setAttribute(
      'data',
      JSON.stringify([
        { id: 'z', name: 'Zulu' },
        { id: 'y', name: 'Yankee' },
      ]),
    )
    const panel = document.createElement('div')
    document.body.append(table, panel)
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      render: (row) => `${row.row.name}`,
    })
    table.dispatchEvent(
      new CustomEvent('oas-cell-click', {
        detail: { row: { id: 'z', name: 'Zulu' }, rowIndex: 50, column: 'name', value: 'Zulu', columnIndex: 0 },
      }),
    )
    expect(panel.textContent).toBe('Zulu')
    expect(detail.selected).toEqual({ row: { id: 'z', name: 'Zulu' }, key: 'z', rowIndex: 0 })
    detail.destroy()
  })

  it('编辑器/输入框内的 Escape 不关闭详情（defaultPrevented / 输入目标让位）', () => {
    const { table, panel } = mount()
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      render: (row) => `${row.row.name}`,
    })
    rowClick(table, { id: 'a', name: 'Alpha' }, 'a')
    const input = document.createElement('input')
    table.shadowRoot!.appendChild(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(detail.selected).not.toBeNull()

    const prevented = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    prevented.preventDefault()
    table.dispatchEvent(prevented)
    expect(detail.selected).not.toBeNull()
    detail.destroy()
  })

  it('同一行重复点击不重复派发；destroy 幂等', () => {
    const { table, panel } = mount()
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      render: (row) => `${row.row.name}`,
    })
    const events: unknown[] = []
    table.addEventListener('oas-detail-change', (event) => events.push((event as CustomEvent).detail))
    rowClick(table, { id: 'a', name: 'Alpha' }, 'a')
    rowClick(table, { id: 'a', name: 'Alpha' }, 'a')
    expect(events).toHaveLength(1)
    detail.destroy()
    expect(() => detail.destroy()).not.toThrow()
    expect(panel.textContent).toBe('')
  })

  it('嵌套自定义组件内的 Escape 不关闭详情（composedPath 穿透 retarget）', () => {
    const { table, panel } = mount()
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      render: (row) => `${row.row.name}`,
    })
    rowClick(table, { id: 'a', name: 'Alpha' }, 'a')
    const nested = document.createElement('div')
    const innerRoot = nested.attachShadow({ mode: 'open' })
    innerRoot.innerHTML = '<input />'
    table.shadowRoot!.appendChild(nested)
    innerRoot
      .querySelector('input')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true }))
    expect(detail.selected).not.toBeNull()
    detail.destroy()
  })

  it('data 变化后详情内容跟随最新行；选中行被移除则清空', async () => {
    const { table, panel } = mount()
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      emptyText: '未选择',
      render: (row) => `${row.row.name}:${row.row.amount ?? '-'}`,
    })
    rowClick(table, { id: 'a', name: 'Alpha' }, 'a')
    expect(panel.textContent).toBe('Alpha:-')
    table.data = [
      { id: 'a', name: 'Alpha2', amount: 9 },
      { id: 'b', name: 'Beta' },
    ]
    await vi.waitFor(() => expect(panel.textContent).toBe('Alpha2:9'))
    expect(detail.selected?.row).toEqual({ id: 'a', name: 'Alpha2', amount: 9 })

    table.data = [{ id: 'b', name: 'Beta' }]
    await vi.waitFor(() => expect(detail.selected).toBeNull())
    expect(panel.textContent).toBe('未选择')
    detail.destroy()
  })

  it('selectByKey：已渲染行按可见下标选中', () => {
    const { table, panel } = mount()
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      render: (row) => `${row.row.name}`,
    })
    const events: unknown[] = []
    table.addEventListener('oas-detail-change', (event) => events.push((event as CustomEvent).detail))
    detail.selectByKey('b')
    expect(panel.textContent).toBe('Beta')
    expect(detail.selected).toEqual({ row: { id: 'b', name: 'Beta' }, key: 'b', rowIndex: 1 })
    expect(table.shadowRoot!.querySelector('tr[data-key="b"]')!.hasAttribute('data-detail-selected')).toBe(true)
    expect(events).toHaveLength(1)
    detail.destroy()
  })

  it('selectByKey：递归子行；未展开未渲染时保留选中（rowIndex=-1），展开后刷新下标并补高亮', async () => {
    const table = new OASTable()
    table.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    table.setAttribute('row-key', 'id')
    table.setAttribute('data', JSON.stringify([{ id: 'p', name: '父', children: [{ id: 'c', name: '子' }] }]))
    const panel = document.createElement('div')
    document.body.append(table, panel)
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      render: (row) => `${row.row.name}`,
    })
    // 子行未展开（未渲染）：按行键仍选中，rowIndex 取 -1
    detail.selectByKey('c')
    expect(detail.selected).toEqual({ row: { id: 'c', name: '子' }, key: 'c', rowIndex: -1 })
    expect(panel.textContent).toBe('子')
    // 展开父行后子行进入渲染窗口：刷新 rowIndex 并重新标记高亮
    table.setAttribute('expanded', 'p')
    await vi.waitFor(() => {
      expect(detail.selected?.rowIndex).toBe(1)
      expect(table.shadowRoot!.querySelector('tr[data-key="c"]')!.hasAttribute('data-detail-selected')).toBe(true)
    })
    detail.destroy()
  })

  it('selectByKey：key 不存在时清空（等价 select(null)）', () => {
    const { table, panel } = mount()
    const closed: unknown[] = []
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      emptyText: '未选择',
      render: (row) => `${row.row.name}`,
      onClose: (d) => closed.push(d),
    })
    detail.selectByKey('b')
    detail.selectByKey('nope')
    expect(detail.selected).toBeNull()
    expect(panel.textContent).toBe('未选择')
    expect(closed).toHaveLength(1)
    // 本就无选中：不触发 onClose
    detail.selectByKey('nope')
    expect(closed).toHaveLength(1)
    detail.destroy()
  })

  it('close()/onClose：程序关闭、Esc、行消失各触发一次；同键点击/换行/重渲染不触发', async () => {
    const { table, panel } = mount()
    const closed: unknown[] = []
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      emptyText: '未选择',
      render: (row) => `${row.row.name}`,
      onClose: (d) => closed.push(d),
    })
    // 同键重复点击（刷新内容）/ 换行选中：保持选中，不触发
    detail.selectByKey('a')
    rowClick(table, { id: 'a', name: 'Alpha' }, 'a')
    rowClick(table, { id: 'b', name: 'Beta' }, 'b')
    expect(closed).toHaveLength(0)
    // 普通重渲染（行对象刷新）：不触发
    table.data = [
      { id: 'a', name: 'Alpha2' },
      { id: 'b', name: 'Beta' },
    ]
    await vi.waitFor(() => expect(panel.textContent).toBe('Beta'))
    expect(closed).toHaveLength(0)

    // 程序关闭：触发一次，参数为被关闭的详情
    detail.close()
    expect(detail.selected).toBeNull()
    expect(closed).toHaveLength(1)
    expect(closed[0]).toMatchObject({ key: 'b' })
    // 无选中时 close/select(null)/selectByKey 不触发
    detail.close()
    detail.select(null)
    detail.selectByKey('nope')
    expect(closed).toHaveLength(1)

    // window 兜底 Esc：触发
    rowClick(table, { id: 'a', name: 'Alpha2' }, 'a')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    expect(closed).toHaveLength(2)

    // 行从数据消失：触发
    rowClick(table, { id: 'a', name: 'Alpha2' }, 'a')
    table.data = [{ id: 'b', name: 'Beta' }]
    await vi.waitFor(() => expect(detail.selected).toBeNull())
    expect(closed).toHaveLength(3)
    detail.destroy()
  })

  it('collapsible 再点收起与 select 越界清空同样触发 onClose', () => {
    const { table, panel } = mount()
    const closed: unknown[] = []
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      emptyText: '未选择',
      collapsible: true,
      render: (row) => `${row.row.name}`,
      onClose: (d) => closed.push(d),
    })
    rowClick(table, { id: 'a', name: 'Alpha' }, 'a')
    rowClick(table, { id: 'a', name: 'Alpha' }, 'a')
    expect(detail.selected).toBeNull()
    expect(closed).toHaveLength(1)

    detail.select(1)
    detail.select(9)
    expect(detail.selected).toBeNull()
    expect(closed).toHaveLength(2)
    detail.destroy()
  })

  it('多实例：window 兜底 Esc 只关最近激活（最近一次成功选中）的实例', () => {
    const a = mount()
    const b = mount()
    const da = createMasterDetail(a.table, { panel: a.panel, label: 'A', render: (row) => `${row.row.name}` })
    const db = createMasterDetail(b.table, { panel: b.panel, label: 'B', render: (row) => `${row.row.name}` })
    const esc = (): void => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    }

    rowClick(a.table, { id: 'a', name: 'Alpha' }, 'a')
    rowClick(b.table, { id: 'b', name: 'Beta' }, 'b')
    esc()
    // 只关最近激活的 B，A 不被牵连
    expect(db.selected).toBeNull()
    expect(da.selected).not.toBeNull()
    // A 重新成功选中后成为最近激活：Esc 关 A
    rowClick(a.table, { id: 'a', name: 'Alpha' }, 'a')
    esc()
    expect(da.selected).toBeNull()
    da.destroy()
    db.destroy()
  })

  it('多实例：destroy 最近激活实例后，Esc 回退到仍选中的上一个实例', () => {
    const a = mount()
    const b = mount()
    const da = createMasterDetail(a.table, { panel: a.panel, label: 'A', render: (row) => `${row.row.name}` })
    const db = createMasterDetail(b.table, { panel: b.panel, label: 'B', render: (row) => `${row.row.name}` })
    rowClick(a.table, { id: 'a', name: 'Alpha' }, 'a')
    rowClick(b.table, { id: 'b', name: 'Beta' }, 'b')
    db.destroy()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    expect(da.selected).toBeNull()
    da.destroy()
  })

  it('closeOnEscape=false：表格/面板/window 兜底均不响应 Esc，程序关闭仍可用', () => {
    const { table, panel } = mount()
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      closeOnEscape: false,
      render: (row) => `${row.row.name}`,
    })
    rowClick(table, { id: 'a', name: 'Alpha' }, 'a')
    table.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    expect(detail.selected).not.toBeNull()
    detail.close()
    expect(detail.selected).toBeNull()
    detail.destroy()
  })

  it('destroy 恢复面板 role/aria-label 为 helper 写入前的值（无值则移除）', () => {
    // 宿主自带属性：helper 覆盖后 destroy 原样还原
    const owned = mount()
    owned.panel.setAttribute('role', 'complementary')
    owned.panel.setAttribute('aria-label', '宿主自带')
    const d1 = createMasterDetail(owned.table, {
      panel: owned.panel,
      label: '详情',
      render: (row) => `${row.row.name}`,
    })
    expect(owned.panel.getAttribute('role')).toBe('complementary')
    expect(owned.panel.getAttribute('aria-label')).toBe('详情')
    d1.destroy()
    expect(owned.panel.getAttribute('role')).toBe('complementary')
    expect(owned.panel.getAttribute('aria-label')).toBe('宿主自带')

    // 无既有属性：helper 写入 region/label，destroy 后移除
    const plain = mount()
    const d2 = createMasterDetail(plain.table, {
      panel: plain.panel,
      label: '详情',
      render: (row) => `${row.row.name}`,
    })
    expect(plain.panel.getAttribute('role')).toBe('region')
    expect(plain.panel.getAttribute('aria-label')).toBe('详情')
    d2.destroy()
    expect(plain.panel.getAttribute('role')).toBeNull()
    expect(plain.panel.getAttribute('aria-label')).toBeNull()
  })

  it('label 为空仍抛错', () => {
    const { table, panel } = mount()
    expect(() => createMasterDetail(table, { panel, label: '  ', render: () => null })).toThrow()
  })
})

describe('table/detail windowed 与活动实例收尾', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('windowed 换窗不当作删除：保留选中与面板，rowIndex=-1', async () => {
    const table = new OASTable()
    table.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    table.setAttribute('row-key', 'id')
    table.setAttribute('windowed', '')
    table.setAttribute('total', '100')
    table.setAttribute('window-start', '0')
    table.setAttribute(
      'data',
      JSON.stringify([
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ]),
    )
    const panel = document.createElement('div')
    document.body.append(table, panel)
    const detail = createMasterDetail(table, { panel, label: '详情', render: (row) => String(row.row.name) })
    rowClick(table, { id: 'b', name: 'B' }, 'b')
    expect(detail.selected?.key).toBe('b')
    table.setAttribute('window-start', '2')
    table.data = [{ id: 'c', name: 'C' }]
    await vi.waitFor(() => expect(detail.selected?.rowIndex).toBe(-1))
    expect(detail.selected?.key).toBe('b')
    expect(panel.textContent).toBe('B')
    detail.destroy()
  })

  it('close 清活动标记；destroy 后 select/close 为 no-op', () => {
    const a = mount()
    const b = mount()
    const da = createMasterDetail(a.table, { panel: a.panel, label: 'A', render: (row) => String(row.row.name) })
    const db = createMasterDetail(b.table, { panel: b.panel, label: 'B', render: (row) => String(row.row.name) })
    rowClick(a.table, { id: 'a', name: 'Alpha' }, 'a')
    rowClick(b.table, { id: 'b', name: 'Beta' }, 'b')
    da.close()
    expect(da.selected).toBeNull()
    expect(db.selected?.key).toBe('b')
    db.destroy()
    db.select(0)
    db.close()
    expect(b.panel.textContent).toBe('')
  })

  it('最近实例 close 后，window Esc 回退关闭仍选中的上一个实例', () => {
    const a = mount()
    const b = mount()
    const da = createMasterDetail(a.table, { panel: a.panel, label: 'A', render: (row) => String(row.row.name) })
    const db = createMasterDetail(b.table, { panel: b.panel, label: 'B', render: (row) => String(row.row.name) })
    rowClick(b.table, { id: 'b', name: 'Beta' }, 'b')
    rowClick(a.table, { id: 'a', name: 'Alpha' }, 'a')
    da.close()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    expect(db.selected).toBeNull()
    da.destroy()
    db.destroy()
  })

  it('跨表本地 Esc 只关闭当前表，不被另一个活动实例截获', () => {
    const a = mount()
    const b = mount()
    const da = createMasterDetail(a.table, { panel: a.panel, label: 'A', render: (row) => String(row.row.name) })
    const db = createMasterDetail(b.table, { panel: b.panel, label: 'B', render: (row) => String(row.row.name) })
    rowClick(a.table, { id: 'a', name: 'Alpha' }, 'a')
    rowClick(b.table, { id: 'b', name: 'Beta' }, 'b')
    a.table.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(da.selected).toBeNull()
    expect(db.selected?.key).toBe('b')
    da.destroy()
    db.destroy()
  })

  it('非 windowed 虚拟滚动离开渲染窗口后 rowIndex 归一为 -1', async () => {
    const table = new OASTable()
    table.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
    table.setAttribute('row-key', 'id')
    table.setAttribute('height', '80')
    table.setAttribute('row-height', '40')
    const rows = []
    for (let row = 0; row < 100; row++) rows.push({ id: `r${row}`, name: `R${row}` })
    table.setAttribute('data', JSON.stringify(rows))
    const panel = document.createElement('div')
    document.body.append(table, panel)
    const detail = createMasterDetail(table, { panel, label: '详情', render: (row) => String(row.row.name) })
    const wrap = table.shadowRoot!.querySelector('.table-scroll') as HTMLElement
    wrap.scrollTop = 99 * 40
    wrap.dispatchEvent(new Event('scroll'))
    await vi.waitFor(() => expect(table.shadowRoot!.querySelector('tr[data-row-index="99"]')).toBeTruthy())
    detail.selectByKey('r99')
    expect(detail.selected?.rowIndex).toBeGreaterThanOrEqual(0)
    wrap.scrollTop = 0
    wrap.dispatchEvent(new Event('scroll'))
    table.data = rows
    await vi.waitFor(() => expect(detail.selected?.rowIndex).toBe(-1))
    expect(detail.selected?.key).toBe('r99')
    detail.destroy()
  })

  it('Esc 关闭详情并回焦时不会复活 range 单格选区', () => {
    const { table, panel } = mount()
    const detail = createMasterDetail(table, { panel, label: '详情', render: (row) => String(row.row.name) })
    rowClick(table, { id: 'b', name: 'Beta' }, 'b')
    setRangeSelection(table, { row: 0, col: 'name' })
    const td = table.shadowRoot!.querySelector('tr.row td[data-col="name"]') as HTMLElement
    td.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true }))
    expect(getRangeSelection(table)).toBeNull()
    expect(detail.selected).not.toBeNull()
    td.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true }))
    expect(detail.selected).toBeNull()
    expect(getRangeSelection(table)).toBeNull()
    detail.destroy()
  })

  it('同表多实例的 Esc 也只关闭最近激活实例', () => {
    const { table, panel: firstPanel } = mount()
    const secondPanel = document.createElement('div')
    document.body.appendChild(secondPanel)
    const first = createMasterDetail(table, { panel: firstPanel, label: 'A', render: (row) => String(row.row.name) })
    const second = createMasterDetail(table, { panel: secondPanel, label: 'B', render: (row) => String(row.row.name) })
    first.select(0)
    second.select(1)
    table.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(first.selected?.key).toBe('a')
    expect(second.selected).toBeNull()
    first.destroy()
    second.destroy()
  })
})

/**
 * 有效 windowed 判定与 selectByKey 未装载键等待。
 * 有效 windowed = `windowed` 属性在场且 total 为有限正数（与表格 readWindowedMode 同口径）。
 */
function mountWindowedDetail(
  attrs: { total?: string; start?: string; rowKey?: string; data?: Array<Record<string, unknown>> } = {},
): { table: OASTable; panel: HTMLElement } {
  const table = new OASTable()
  table.setAttribute('columns', JSON.stringify([{ key: 'name', title: '名称' }]))
  table.setAttribute('row-key', attrs.rowKey ?? 'id')
  table.setAttribute('windowed', '')
  table.setAttribute('total', attrs.total ?? '100')
  table.setAttribute('window-start', attrs.start ?? '0')
  table.setAttribute(
    'data',
    JSON.stringify(
      attrs.data ?? [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
    ),
  )
  const panel = document.createElement('div')
  document.body.append(table, panel)
  return { table, panel }
}

describe('table/detail windowed 未装载键等待', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('total=0 时按普通模式：不存在的键清空并派发关闭', () => {
    const { table, panel } = mountWindowedDetail({ total: '0', start: '5' })
    const closed: unknown[] = []
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      emptyText: '未选择',
      render: (row) => String(row.row.name),
      onClose: (item) => closed.push(item),
    })
    detail.selectByKey('a')
    expect(detail.selected?.key).toBe('a')
    detail.selectByKey('nope')
    expect(detail.selected).toBeNull()
    expect(panel.textContent).toBe('未选择')
    expect(closed).toHaveLength(1)
    detail.destroy()
  })

  it('total 非法时按普通模式：data 删除选中行触发 onClose', async () => {
    const { table, panel } = mountWindowedDetail({ total: 'abc' })
    const closed: unknown[] = []
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      emptyText: '未选择',
      render: (row) => String(row.row.name),
      onClose: (item) => closed.push(item),
    })
    detail.selectByKey('a')
    table.data = [{ id: 'b', name: 'B' }]
    await vi.waitFor(() => expect(detail.selected).toBeNull())
    expect(panel.textContent).toBe('未选择')
    expect(closed).toHaveLength(1)
    detail.destroy()
  })

  it('未装载键挂起无事件并保留旧面板，回填命中后自动选中一次', async () => {
    const { table, panel } = mountWindowedDetail()
    const events: unknown[] = []
    const closed: unknown[] = []
    table.addEventListener('oas-detail-change', (event) => events.push((event as CustomEvent).detail))
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      emptyText: '未选择',
      render: (row) => String(row.row.name),
      onClose: (item) => closed.push(item),
    })
    detail.selectByKey('a')
    expect(events).toHaveLength(1)
    detail.selectByKey('z')
    expect(detail.selected?.key).toBe('a')
    expect(panel.textContent).toBe('A')
    expect(events).toHaveLength(1)
    expect(closed).toHaveLength(0)

    table.setAttribute('window-start', '50')
    table.data = [{ id: 'z', name: 'Zulu' }]
    await vi.waitFor(() => expect(detail.selected).toEqual({ row: { id: 'z', name: 'Zulu' }, key: 'z', rowIndex: 0 }))
    expect(panel.textContent).toBe('Zulu')
    expect(events).toHaveLength(2)
    expect(closed).toHaveLength(0)

    // 回填后同键数据刷新只更新内容，不再重复派发选中变化
    table.data = [{ id: 'z', name: 'Zulu2' }]
    await vi.waitFor(() => expect(panel.textContent).toBe('Zulu2'))
    expect(events).toHaveLength(2)
    detail.destroy()
  })

  it('连续 selectByKey 只落地最后一次；先前键的数据到达不得劫持', async () => {
    const { table, panel } = mountWindowedDetail()
    const events: unknown[] = []
    table.addEventListener('oas-detail-change', (event) => events.push((event as CustomEvent).detail))
    const detail = createMasterDetail(table, { panel, label: '详情', render: (row) => String(row.row.name) })
    detail.selectByKey('a')
    detail.selectByKey('z')
    detail.selectByKey('y')
    table.data = [{ id: 'y', name: 'Yankee' }]
    await vi.waitFor(() => expect(detail.selected?.key).toBe('y'))
    expect(panel.textContent).toBe('Yankee')
    expect(events).toHaveLength(2)

    table.data = [{ id: 'z', name: 'Zulu' }]
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(detail.selected?.key).toBe('y')
    expect(panel.textContent).toBe('Yankee')
    expect(events).toHaveLength(2)
    detail.destroy()
  })

  it('close 取消未装载键等待，后续数据到达不再选中', async () => {
    const { table, panel } = mountWindowedDetail()
    const events: unknown[] = []
    const closed: unknown[] = []
    table.addEventListener('oas-detail-change', (event) => events.push((event as CustomEvent).detail))
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      emptyText: '未选择',
      render: (row) => String(row.row.name),
      onClose: (item) => closed.push(item),
    })
    detail.selectByKey('a')
    detail.selectByKey('z')
    detail.close()
    expect(detail.selected).toBeNull()
    expect(closed).toHaveLength(1)
    const afterClose = events.length
    table.data = [{ id: 'z', name: 'Zulu' }]
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(detail.selected).toBeNull()
    expect(panel.textContent).toBe('未选择')
    expect(events).toHaveLength(afterClose)
    detail.destroy()
  })

  it('select 与行/单元格点击取消未装载键等待', async () => {
    const { table, panel } = mountWindowedDetail()
    const detail = createMasterDetail(table, { panel, label: '详情', render: (row) => String(row.row.name) })
    detail.selectByKey('a')
    detail.selectByKey('z')
    detail.select(1)
    table.data = [{ id: 'z', name: 'Zulu' }]
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(detail.selected?.key).toBe('b')

    // 行点击取消：重新等待 z 后点已选中的 a，pending 被覆盖
    table.data = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]
    detail.selectByKey('z')
    rowClick(table, { id: 'b', name: 'B' }, 'b')
    table.data = [{ id: 'z', name: 'Zulu' }]
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(detail.selected?.key).toBe('b')
    expect(panel.textContent).toBe('B')
    detail.destroy()
  })

  it('destroy 取消未装载键等待，后续数据到达不写回', async () => {
    const { table, panel } = mountWindowedDetail()
    const detail = createMasterDetail(table, { panel, label: '详情', render: (row) => String(row.row.name) })
    detail.selectByKey('a')
    detail.selectByKey('z')
    detail.destroy()
    table.data = [{ id: 'z', name: 'Zulu' }]
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(panel.textContent).toBe('')
  })

  it('模式回落普通后不再等待 pending，并按普通模式清空已删除选中行', async () => {
    const { table, panel } = mountWindowedDetail()
    const closed: unknown[] = []
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      emptyText: '未选择',
      render: (row) => String(row.row.name),
      onClose: (item) => closed.push(item),
    })
    detail.selectByKey('a')
    detail.selectByKey('z')
    table.setAttribute('total', '0')
    // 先让回落后的刷新跑完（此时 data 未含 z → 丢弃 pending），再让 z 数据到达
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(detail.selected?.key).toBe('a')
    table.data = [{ id: 'z', name: 'Zulu' }]
    await vi.waitFor(() => expect(detail.selected).toBeNull())
    expect(panel.textContent).toBe('未选择')
    expect(closed).toHaveLength(1)
    detail.destroy()
  })

  it('模式回落与 data 命中同批到达时，按普通数据命中落地 pending', async () => {
    const { table, panel } = mountWindowedDetail()
    const events: unknown[] = []
    const closed: unknown[] = []
    table.addEventListener('oas-detail-change', (event) => events.push((event as CustomEvent).detail))
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      emptyText: '未选择',
      render: (row) => String(row.row.name),
      onClose: (item) => closed.push(item),
    })
    detail.selectByKey('a')
    detail.selectByKey('z')
    // 同一轮 MutationObserver 批次：total 回落普通，但 data 已含 pending 键
    table.setAttribute('total', '0')
    table.data = [{ id: 'z', name: 'Zulu' }]
    await vi.waitFor(() => expect(detail.selected?.key).toBe('z'))
    expect(detail.selected).toEqual({ row: { id: 'z', name: 'Zulu' }, key: 'z', rowIndex: 0 })
    expect(panel.textContent).toBe('Zulu')
    expect(events).toHaveLength(2)
    expect(closed).toHaveLength(0)
    detail.destroy()
  })

  it('total=0.5 截断后按普通模式：不存在键清空、删除选中行 onClose', async () => {
    const { table, panel } = mountWindowedDetail({ total: '0.5', start: '5' })
    const closed: unknown[] = []
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      emptyText: '未选择',
      render: (row) => String(row.row.name),
      onClose: (item) => closed.push(item),
    })
    detail.selectByKey('a')
    detail.selectByKey('nope')
    expect(detail.selected).toBeNull()
    expect(panel.textContent).toBe('未选择')
    expect(closed).toHaveLength(1)

    detail.selectByKey('a')
    table.data = [{ id: 'b', name: 'B' }]
    await vi.waitFor(() => expect(detail.selected).toBeNull())
    expect(closed).toHaveLength(2)
    detail.destroy()
  })

  it('pending 未命中时仍刷新旧选中内容，离窗时保留不清空', async () => {
    const { table, panel } = mountWindowedDetail()
    const events: unknown[] = []
    table.addEventListener('oas-detail-change', (event) => events.push((event as CustomEvent).detail))
    const detail = createMasterDetail(table, { panel, label: '详情', render: (row) => String(row.row.name) })
    detail.selectByKey('a')
    detail.selectByKey('z')

    table.data = [{ id: 'a', name: 'Alpha2' }]
    await vi.waitFor(() => expect(panel.textContent).toBe('Alpha2'))
    expect(detail.selected).toEqual({ row: { id: 'a', name: 'Alpha2' }, key: 'a', rowIndex: 0 })
    expect(events).toHaveLength(1)

    // 旧选中离窗（windowed 有效）：保留选中与最后一次内容，不清空
    table.data = [{ id: 'c', name: 'C' }]
    await vi.waitFor(() => expect(detail.selected?.rowIndex).toBe(-1))
    expect(detail.selected?.key).toBe('a')
    expect(panel.textContent).toBe('Alpha2')
    expect(events).toHaveLength(1)
    detail.destroy()
  })

  it('无选中时表格/面板内 Esc 取消 pending，回填不落地', async () => {
    const { table, panel } = mountWindowedDetail()
    const events: unknown[] = []
    table.addEventListener('oas-detail-change', (event) => events.push((event as CustomEvent).detail))
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      emptyText: '未选择',
      render: (row) => String(row.row.name),
    })

    detail.selectByKey('z')
    table.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    table.data = [{ id: 'z', name: 'Zulu' }]
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(detail.selected).toBeNull()
    expect(panel.textContent).toBe('未选择')
    expect(events).toHaveLength(0)

    detail.selectByKey('y')
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    table.data = [{ id: 'y', name: 'Yankee' }]
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(detail.selected).toBeNull()
    expect(panel.textContent).toBe('未选择')
    expect(events).toHaveLength(0)
    detail.destroy()
  })

  it('无选中 pending 的 Esc 仍让位 defaultPrevented 与输入控件', async () => {
    const { table, panel } = mountWindowedDetail()
    const detail = createMasterDetail(table, { panel, label: '详情', render: (row) => String(row.row.name) })

    detail.selectByKey('z')
    const prevented = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    prevented.preventDefault()
    table.dispatchEvent(prevented)
    table.data = [{ id: 'z', name: 'Zulu' }]
    await vi.waitFor(() => expect(detail.selected?.key).toBe('z'))

    detail.close()
    table.data = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]
    detail.selectByKey('y')
    const input = document.createElement('input')
    table.shadowRoot!.appendChild(input)
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true }),
    )
    table.data = [{ id: 'y', name: 'Yankee' }]
    await vi.waitFor(() => expect(detail.selected?.key).toBe('y'))
    detail.destroy()
  })

  it('同表其他活动实例优先处理 Esc，不取消本实例 pending', async () => {
    const { table, panel: firstPanel } = mountWindowedDetail()
    const secondPanel = document.createElement('div')
    document.body.appendChild(secondPanel)
    const first = createMasterDetail(table, { panel: firstPanel, label: 'A', render: (row) => String(row.row.name) })
    const second = createMasterDetail(table, { panel: secondPanel, label: 'B', render: (row) => String(row.row.name) })
    second.select(1)
    first.selectByKey('z')
    table.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    table.data = [{ id: 'z', name: 'Zulu' }]
    await vi.waitFor(() => expect(first.selected?.key).toBe('z'))
    // Esc 优先关闭同表最近激活实例；本实例 pending 未被取消，随后数据到达照常落地
    expect(second.selected).toBeNull()
    first.destroy()
    second.destroy()
  })

  it('row-key 改变丢弃 pending，不按新键抢占选中', async () => {
    const { table, panel } = mountWindowedDetail({
      data: [
        { id: 'a', name: 'a' },
        { id: 'zz', name: 'z' },
      ],
    })
    const detail = createMasterDetail(table, { panel, label: '详情', render: (row) => String(row.row.name) })
    detail.selectByKey('a')
    detail.selectByKey('z')
    table.setAttribute('row-key', 'name')
    table.data = [
      { id: 'a', name: 'a2' },
      { id: 'zz', name: 'z' },
    ]
    // 既有 selected 的 windowed 语义不变（旧键在新 row-key 下找不到 → 保留并归一 rowIndex）；
    // 关键是 pending 已被丢弃，不会按新 row-key 命中 z 抢占选中
    await vi.waitFor(() => expect(detail.selected?.rowIndex).toBe(-1))
    expect(detail.selected?.key).toBe('a')
    expect(panel.textContent).toBe('a')
    detail.destroy()
  })

  it('有效 windowed 下再次选择当前未装载键只刷新 rowIndex，不派发事件', async () => {
    const { table, panel } = mountWindowedDetail()
    const events: unknown[] = []
    table.addEventListener('oas-detail-change', (event) => events.push((event as CustomEvent).detail))
    const detail = createMasterDetail(table, { panel, label: '详情', render: (row) => String(row.row.name) })
    detail.selectByKey('a')
    table.setAttribute('window-start', '50')
    table.data = [{ id: 'z', name: 'Zulu' }]
    await vi.waitFor(() => expect(detail.selected?.rowIndex).toBe(-1))
    const afterScroll = events.length
    detail.selectByKey('a')
    expect(detail.selected).toEqual({ row: { id: 'a', name: 'A' }, key: 'a', rowIndex: -1 })
    expect(events).toHaveLength(afterScroll)
    expect(panel.textContent).toBe('A')
    detail.destroy()
  })

  it('range 活动选区并存：单元格内首次 Esc 先清选区保留 pending，回填后仍落地选中', async () => {
    // 组合回归：pending 等待 + range 选区并存时的 Esc 归属——首次 Esc 归 range（清选区），
    // 不消耗 pending；只有 range 选区已清后的后续 Esc 才轮到详情取消等待
    const { table, panel } = mountWindowedDetail()
    const events: unknown[] = []
    table.addEventListener('oas-detail-change', (event) => events.push((event as CustomEvent).detail))
    const detail = createMasterDetail(table, {
      panel,
      label: '详情',
      emptyText: '未选择',
      render: (row) => String(row.row.name),
    })
    detail.selectByKey('z')
    setRangeSelection(table, { row: 0, col: 'name' })
    expect(getRangeSelection(table)).not.toBeNull()
    expect(events).toHaveLength(0)

    const td = table.shadowRoot!.querySelector('tr.row td[data-col="name"]') as HTMLElement
    td.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true }))
    // 首次 Esc 归 range：选区清空，pending 未被取消（面板保持空态、零事件）
    expect(getRangeSelection(table)).toBeNull()
    expect(detail.selected).toBeNull()
    expect(panel.textContent).toBe('未选择')
    expect(events).toHaveLength(0)

    // data 回填 pending 键：等待照常落地选中一次
    table.data = [{ id: 'z', name: 'Zulu' }]
    await vi.waitFor(() => expect(detail.selected).toEqual({ row: { id: 'z', name: 'Zulu' }, key: 'z', rowIndex: 0 }))
    expect(panel.textContent).toBe('Zulu')
    expect(events).toHaveLength(1)
    detail.destroy()
  })
})
