import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASTable } from './index.js'

const COLUMNS = JSON.stringify([
  { key: 'name', title: '姓名', sortable: true },
  { key: 'age', title: '年龄' },
])
const DATA = JSON.stringify([
  { name: '张三', age: 30 },
  { name: '李四', age: 25 },
  { name: '王五', age: 35 },
])

function mount(attrs: Record<string, string> = {}): OASTable {
  const el = new OASTable()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.columns) el.setAttribute('columns', COLUMNS)
  if (!attrs.data) el.setAttribute('data', DATA)
  document.body.appendChild(el)
  return el
}

function rows(el: OASTable): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll('[part="row"]')] as HTMLElement[]
}

function headers(el: OASTable): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll('[part="header"]')] as HTMLElement[]
}

describe('OASTable', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染表头与数据行', () => {
    const el = mount()
    expect(headers(el).length).toBe(2)
    expect(headers(el)[0]!.textContent).toContain('姓名')
    expect(rows(el).length).toBe(3)
    expect(rows(el)[0]!.textContent).toContain('张三')
  })

  it('点击可排序列切换排序并派发 oas-sort-change', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-sort-change', (e: Event) => (detail = (e as CustomEvent).detail))
    headers(el)[0]!.click()
    expect(detail).toEqual({ key: 'name', order: 'asc' })
    const firstRow = rows(el)[0]!.textContent ?? ''
    expect(firstRow).toContain('李四')
  })

  it('empty 空态：无数据时显示占位', () => {
    const el = mount({ data: '[]' })
    expect(el.shadowRoot!.textContent).toContain('暂无数据')
  })

  it('点击行派发 oas-row-click', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-row-click', (e: Event) => (detail = (e as CustomEvent).detail))
    rows(el)[1]!.click()
    expect((detail as { row: Record<string, unknown> }).row['name']).toBe('李四')
  })

  it('checkable：渲染行复选框，勾选派发 oas-check', () => {
    const el = mount({ checkable: '', 'row-key': 'name' })
    let detail: unknown
    el.addEventListener('oas-check', (e: Event) => (detail = (e as CustomEvent).detail))
    const boxes = el.shadowRoot!.querySelectorAll('.check-cell input[type="checkbox"]')
    expect(boxes.length).toBe(4)
    ;(boxes[1] as HTMLInputElement).click()
    expect((detail as { keys: string[] }).keys).toEqual(['张三'])
    expect(el.getAttribute('selected')).toBe('张三')
  })
})
