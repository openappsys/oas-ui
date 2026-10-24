import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from '../index.js'
import { createMasterDetail } from './index.js'

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
})
