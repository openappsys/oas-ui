import { beforeEach, describe, expect, it } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from '../index.js'
import {
  applyViewState,
  captureViewState,
  loadViewState,
  saveViewState,
  VIEW_STATE_KEY,
  type ViewStateAdapter,
} from './index.js'

function mount(): OASTable {
  const el = new OASTable()
  el.setAttribute(
    'columns',
    JSON.stringify([
      { key: 'name', title: '名称', width: '120px' },
      { key: 'age', title: '年龄' },
    ]),
  )
  el.setAttribute('data', JSON.stringify([{ name: 'A', age: 1 }]))
  el.setAttribute('column-keys', JSON.stringify(['name', 'age']))
  el.setAttribute('sort-key', 'name')
  el.setAttribute('sort-order', 'asc')
  el.setAttribute('page-size', '20')
  document.body.appendChild(el)
  // 属性解析在连接后同步完成；显式设置 property 保证 capture 读到当前视图
  el.columnKeys = ['name', 'age']
  return el
}

describe('tableView 视图状态', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('捕获列显隐/排序/分页/列宽', () => {
    const el = mount()
    const state = captureViewState(el)
    expect(state.columnKeys).toEqual(['name', 'age'])
    expect(state.sortKey).toBe('name')
    expect(state.sortOrder).toBe('asc')
    expect(state.pageSize).toBe('20')
    expect(state.widths).toEqual({ name: '120px' })
  })

  it('应用状态写入属性并恢复列宽', () => {
    const el = mount()
    applyViewState(el, {
      columnKeys: ['age', 'name'],
      sortKey: 'age',
      sortOrder: 'desc',
      pageSize: '50',
      widths: { name: '160px', age: '80px' },
    })
    expect(el.columnKeys).toEqual(['age', 'name'])
    expect(el.getAttribute('sort-key')).toBe('age')
    expect(el.getAttribute('sort-order')).toBe('desc')
    expect(el.getAttribute('page-size')).toBe('50')
    const columns = el.columns
    expect(columns.find((column) => column.key === 'name')?.width).toBe('160px')
    expect(columns.find((column) => column.key === 'age')?.width).toBe('80px')
  })

  it('空字符串表示移除属性；未出现字段按快照清除', () => {
    const el = mount()
    el.setAttribute('group-by', 'name')
    applyViewState(el, { sortOrder: '', pageSize: '30' })
    expect(el.hasAttribute('sort-order')).toBe(false)
    expect(el.getAttribute('page-size')).toBe('30')
    expect(el.hasAttribute('group-by')).toBe(false)
  })

  it('恢复无排序/无列宽快照会清除旧状态', () => {
    const el = mount()
    el.removeAttribute('sort-key')
    el.removeAttribute('sort-order')
    el.columns = el.columns.map((column) => ({ ...column, width: undefined }))
    const adapter = memoryAdapter()
    expect(saveViewState(el, adapter)).toBe(true)

    const other = mount()
    other.setAttribute('sort-key', 'age')
    other.setAttribute('sort-order', 'desc')
    other.columns = other.columns.map((column) => ({ ...column, width: '200px' }))
    expect(loadViewState(other, adapter)).toBe(true)
    expect(other.hasAttribute('sort-key')).toBe(false)
    expect(other.hasAttribute('sort-order')).toBe(false)
    expect(other.columns.every((column) => column.width === undefined)).toBe(true)
  })

  it('sortKey 非字符串/widths 非字符串均拒绝恢复且不改原状态', () => {
    const el = mount()
    const before = captureViewState(el)
    const badState = { version: 1, state: { sortKey: { bad: true } } }
    const adapter = memoryAdapter({ 'oas-table-view:v1': JSON.stringify(badState) })
    expect(loadViewState(el, adapter)).toBe(false)
    expect(captureViewState(el)).toEqual(before)
    const badWidthsState = { version: 1, state: { widths: { name: 120 } } }
    const badWidths = memoryAdapter({ 'oas-table-view:v1': JSON.stringify(badWidthsState) })
    expect(loadViewState(el, badWidths)).toBe(false)
    expect(captureViewState(el)).toEqual(before)
  })

  it('完整快照未包含 columnKeys 时重置为全部列', () => {
    const el = mount()
    el.columnKeys = ['name']
    el.setAttribute('column-keys', JSON.stringify(['name']))
    applyViewState(el, { pageSize: '10' })
    expect(el.columnKeys).toEqual([])
    expect(el.getAttribute('column-keys')).toBe('[]')
  })

  it('完整快照会清除分组列的旧宽度并保留叶子列宽', () => {
    const el = new OASTable()
    el.setAttribute(
      'columns',
      JSON.stringify([
        {
          key: 'group',
          title: '分组',
          width: '200px',
          children: [{ key: 'name', title: '名称', width: '120px' }],
        },
      ]),
    )
    el.setAttribute('data', JSON.stringify([{ name: 'A' }]))
    document.body.appendChild(el)
    applyViewState(el, { widths: { name: '80px' } })
    expect(el.columns[0]!.width).toBeUndefined()
    expect(el.columns[0]!.children?.[0]?.width).toBe('80px')
  })

  it('支持自定义持久化 key；saveViewState 只要求 setItem', () => {
    const el = mount()
    const store: Record<string, string> = {}
    const writeOnly: ViewStateAdapter = {
      setItem: (key, value) => {
        store[key] = value
      },
    }
    expect(saveViewState(el, writeOnly, 'orders-view')).toBe(true)
    expect(JSON.parse(store['orders-view']!).version).toBe(1)
    expect(loadViewState(el, memoryAdapter(store), 'orders-view')).toBe(true)
  })
})

/** 纯内存 adapter（无 DOM/Storage 全局依赖，与 localStorage 同构） */
function memoryAdapter(initial: Record<string, string> = {}): ViewStateAdapter & { store: Record<string, string> } {
  const store = { ...initial }
  return {
    store,
    getItem: (key) => (key in store ? store[key]! : null),
    setItem: (key, value) => {
      store[key] = value
    },
    removeItem: (key) => {
      delete store[key]
    },
  }
}

describe('saveViewState / loadViewState 持久化适配器', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('saveViewState 写入 {version:1,state} 契约格式，键为 oas-table-view:v1', () => {
    const el = mount()
    const adapter = memoryAdapter()
    expect(saveViewState(el, adapter)).toBe(true)
    const saved = JSON.parse(adapter.store[VIEW_STATE_KEY]!)
    expect(saved).toEqual({
      version: 1,
      state: {
        columnKeys: ['name', 'age'],
        widths: { name: '120px' },
        sortKey: 'name',
        sortOrder: 'asc',
        pageSize: '20',
      },
    })
  })

  it('saveViewState / loadViewState 往返恢复视图', () => {
    const el = mount()
    const adapter = memoryAdapter()
    expect(saveViewState(el, adapter)).toBe(true)
    // 模拟用户改视图：列序/排序/分页/列宽全部变化
    el.columnKeys = ['age', 'name']
    el.setAttribute('sort-key', 'age')
    el.setAttribute('sort-order', 'desc')
    el.setAttribute('page-size', '50')
    applyViewState(el, { widths: { name: '320px' } })
    expect(loadViewState(el, adapter)).toBe(true)
    expect(el.columnKeys).toEqual(['name', 'age'])
    expect(el.getAttribute('sort-key')).toBe('name')
    expect(el.getAttribute('sort-order')).toBe('asc')
    expect(el.getAttribute('page-size')).toBe('20')
    expect(el.columns.find((column) => column.key === 'name')?.width).toBe('120px')
  })

  it('loadViewState：键缺失返回 false 且不修改表格', () => {
    const el = mount()
    const before = captureViewState(el)
    expect(loadViewState(el, memoryAdapter())).toBe(false)
    expect(captureViewState(el)).toEqual(before)
  })

  it('loadViewState：坏 JSON / version!=1 / 坏字段 / 数组 state 静默返回 false 且不修改表格', () => {
    const el = mount()
    const before = captureViewState(el)
    expect(loadViewState(el, memoryAdapter({ [VIEW_STATE_KEY]: '{oops' }))).toBe(false)
    expect(loadViewState(el, memoryAdapter({ [VIEW_STATE_KEY]: '"just a string"' }))).toBe(false)
    expect(loadViewState(el, memoryAdapter({ [VIEW_STATE_KEY]: JSON.stringify({ version: 2, state: {} }) }))).toBe(
      false,
    )
    // columnKeys 非数组会让 applyViewState 写入脏数据：预检后拒绝
    expect(
      loadViewState(
        el,
        memoryAdapter({ [VIEW_STATE_KEY]: JSON.stringify({ version: 1, state: { columnKeys: 'name' } }) }),
      ),
    ).toBe(false)
    expect(loadViewState(el, memoryAdapter({ [VIEW_STATE_KEY]: JSON.stringify({ version: 1, state: [] }) }))).toBe(
      false,
    )
    expect(captureViewState(el)).toEqual(before)
    expect(el.columnKeys).toEqual(['name', 'age'])
  })

  it('缺 adapter 方法不抛错返回 false；setItem 抛错（配额满）时 save 静默失败', () => {
    const el = mount()
    expect(saveViewState(el, {} as ViewStateAdapter)).toBe(false)
    expect(loadViewState(el, {} as ViewStateAdapter)).toBe(false)
    const quota: ViewStateAdapter = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded')
      },
    }
    expect(saveViewState(el, quota)).toBe(false)
  })
})
