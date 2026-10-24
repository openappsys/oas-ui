import { beforeEach, describe, expect, it } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from '../index.js'
import { applyViewState, captureViewState } from './index.js'

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

  it('空字符串表示移除属性；未出现字段不变', () => {
    const el = mount()
    el.setAttribute('group-by', 'name')
    applyViewState(el, { sortOrder: '', pageSize: '30' })
    expect(el.hasAttribute('sort-order')).toBe(false)
    expect(el.getAttribute('page-size')).toBe('30')
    expect(el.getAttribute('group-by')).toBe('name')
  })
})
