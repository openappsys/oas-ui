import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from './index.js'

/**
 * server 行模型批（a2：`row-model` 属性注册与生效前提）。
 *
 * 冻结契约（PRD ①）：
 * - `row-model="server"` 且 `total` 属性在场（外部分页形态）才生效；
 *   前提不满足 → 一次性 devWarn + 按 client 行为执行（零行为变化）；
 * - 与 `windowed` 同开 → windowed 优先 + 一次性 devWarn（server 忽略）；
 * - client 模式（缺省）一切现状不变。
 */

const COLUMNS = JSON.stringify([
  { key: 'name', title: '名称', sortable: true },
  { key: 'age', title: '年龄' },
])

function mount(attrs: Record<string, string>): OASTable {
  const el = new OASTable()
  el.setAttribute('columns', COLUMNS)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

const rowsOf = (el: OASTable): HTMLElement[] => [...el.shadowRoot!.querySelectorAll('[part="row"]')] as HTMLElement[]

describe('OASTable server 行模型 a2：row-model 属性', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('row-model="server" 缺 total：devWarn 一次 + 按 client 行为（本地排序照常执行）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({
      'row-model': 'server',
      data: JSON.stringify([
        { name: '乙', age: 2 },
        { name: '甲', age: 1 },
      ]),
    })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('row-model')
    // 同实例再渲染不重复告警（一次）
    el.setAttribute(
      'data',
      JSON.stringify([
        { name: '丙', age: 3 },
        { name: '乙', age: 2 },
      ]),
    )
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    // client 行为：点击表头本地排序照常生效（码点序 丙(0x4E19) < 乙(0x4E59)，asc 首行 = 丙）
    el.shadowRoot!.querySelector<HTMLElement>('th.sortable')!.click()
    const first = rowsOf(el)[0]!.textContent ?? ''
    expect(first).toContain('丙')
  })

  it('row-model="server" + windowed 同开：windowed 优先 + devWarn 一次（server 忽略）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = new OASTable()
    el.setAttribute('columns', COLUMNS)
    el.setAttribute('row-model', 'server')
    el.setAttribute('windowed', '')
    el.setAttribute('total', '100')
    el.setAttribute('window-start', '10')
    // 非虚拟 windowed：全部已装载行即视口内容（windowed 契约——切片行按绝对位渲染）
    el.setAttribute(
      'data',
      JSON.stringify([
        { name: '行10', age: 20 },
        { name: '行11', age: 21 },
      ]),
    )
    document.body.appendChild(el)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('windowed')
    // windowed 行为完整保留：切片行照 windowed 契约渲染（server 判定未接管）
    expect(rowsOf(el).length).toBe(2)
    expect(rowsOf(el)[0]!.textContent).toContain('行10')
    // 同实例再渲染不重复互斥告警（一次）
    el.setAttribute('data', JSON.stringify([{ name: '行10', age: 20 }]))
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('缺省（无 row-model）与 row-model="client"：零告警零行为变化', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const plain = mount({ data: JSON.stringify([{ name: '甲', age: 1 }]), total: '5' })
    expect(warn).not.toHaveBeenCalled()
    expect(rowsOf(plain).length).toBe(1)
    document.body.innerHTML = ''
    const client = mount({ 'row-model': 'client', data: JSON.stringify([{ name: '甲', age: 1 }]), total: '5' })
    expect(warn).not.toHaveBeenCalled()
    expect(rowsOf(client).length).toBe(1)
    warn.mockRestore()
  })
})

describe('OASTable server 行模型 a3：本地过滤/排序整体跳过（缝位）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  const DATA_ABC = JSON.stringify([
    { name: '甲', age: 3 },
    { name: '乙', age: 2 },
    { name: '丙', age: 1 },
  ])

  it('server：filter-values 在场不执行本地过滤（data 原样渲染；client 对照过滤生效）', () => {
    const server = mount({
      'row-model': 'server',
      total: '100',
      data: DATA_ABC,
      'filter-values': JSON.stringify({ name: '甲' }),
    })
    expect(rowsOf(server).length).toBe(3)
    document.body.innerHTML = ''
    const client = mount({ total: '100', data: DATA_ABC, 'filter-values': JSON.stringify({ name: '甲' }) })
    expect(rowsOf(client).length).toBe(1)
    expect(rowsOf(client)[0]!.textContent).toContain('甲')
  })

  it('server：sort-key/sort-order 在场不执行本地排序（data 原样渲染；client 对照排序生效）', () => {
    const server = mount({
      'row-model': 'server',
      total: '100',
      data: DATA_ABC,
      'sort-key': 'age',
      'sort-order': 'asc',
      columns: JSON.stringify([
        { key: 'name', title: '名称' },
        { key: 'age', title: '年龄' },
      ]),
    })
    // data 原样：甲(3) 乙(2) 丙(1)——本地排序会把它变成 丙(1) 乙(2) 甲(3)
    expect(rowsOf(server).length).toBe(3)
    expect(rowsOf(server)[0]!.textContent).toContain('甲')
    expect(rowsOf(server)[2]!.textContent).toContain('丙')
    document.body.innerHTML = ''
    const client = mount({
      total: '100',
      data: DATA_ABC,
      'sort-key': 'age',
      'sort-order': 'asc',
      columns: JSON.stringify([
        { key: 'name', title: '名称' },
        { key: 'age', title: '年龄' },
      ]),
    })
    expect(rowsOf(client)[0]!.textContent).toContain('丙')
    expect(rowsOf(client)[2]!.textContent).toContain('甲')
  })

  it('server：分页器口径保留（current 越界钳制写回 + total 直通分页器）', () => {
    const server = mount({ 'row-model': 'server', total: '10', data: DATA_ABC, pagination: '', current: '99' })
    // 越界钳制仍生效（宿主切片口径的既有行为）：current 99 → 钳到 1
    expect(server.getAttribute('current')).toBe('1')
    expect(rowsOf(server).length).toBe(3)
    const pager = server.shadowRoot!.querySelector('.pagination oas-pagination')
    expect(pager).not.toBeNull()
    expect(pager!.getAttribute('total')).toBe('10')
  })

  it('server：交互排序只派 oas-sort-change，不改行序（服务端排序由宿主回填）', () => {
    const el = mount({
      'row-model': 'server',
      total: '100',
      data: DATA_ABC,
      columns: JSON.stringify([
        { key: 'name', title: '名称', sortable: true },
        { key: 'age', title: '年龄' },
      ]),
    })
    let detail: unknown
    el.addEventListener('oas-sort-change', (e) => (detail = (e as CustomEvent).detail))
    el.shadowRoot!.querySelector<HTMLElement>('th.sortable')!.click()
    expect(detail).toEqual({ key: 'name', order: 'asc' })
    // 行序不变（本地排序已跳过；宿主监听事件服务端排序后回填 data）
    expect(rowsOf(el)[0]!.textContent).toContain('甲')
  })
})
