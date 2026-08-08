import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
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
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
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

  it('loading：显示加载占位行，不渲染数据行', () => {
    const el = mount({ loading: '' })
    expect(el.shadowRoot!.querySelector('[part="loading-row"]')).not.toBeNull()
    expect(el.shadowRoot!.textContent).toContain('加载中')
    expect(rows(el).length).toBe(0)
    // 表头仍保留
    expect(headers(el).length).toBe(2)
  })

  it('loading 与空数据同时存在时优先显示加载态', () => {
    const el = mount({ loading: '', data: '[]' })
    expect(el.shadowRoot!.querySelector('[part="loading-row"]')).not.toBeNull()
    expect(el.shadowRoot!.textContent).not.toContain('暂无数据')
  })

  it('loading 移除后恢复数据行', () => {
    const el = mount({ loading: '' })
    expect(rows(el).length).toBe(0)
    el.removeAttribute('loading')
    expect(rows(el).length).toBe(3)
    expect(rows(el)[0]!.textContent).toContain('张三')
  })

  it('locale：全选/行选择 aria-label 随 setLocale 切换', () => {
    const el = mount({ checkable: '', 'row-key': 'name' })
    expect(
      el
        .shadowRoot!.querySelector<HTMLInputElement>('.check-cell input[type="checkbox"]')!
        .getAttribute('aria-label'),
    ).toBe('全选')
    expect(
      el
        .shadowRoot!.querySelectorAll<HTMLInputElement>('.check-cell input[type="checkbox"]')[1]!
        .getAttribute('aria-label'),
    ).toBe('选择行 张三')

    setLocale(en)
    expect(
      el
        .shadowRoot!.querySelector<HTMLInputElement>('.check-cell input[type="checkbox"]')!
        .getAttribute('aria-label'),
    ).toBe('Select all')
    expect(
      el
        .shadowRoot!.querySelectorAll<HTMLInputElement>('.check-cell input[type="checkbox"]')[1]!
        .getAttribute('aria-label'),
    ).toBe('Select row 张三')

    setLocale('zh-CN')
    expect(
      el
        .shadowRoot!.querySelector<HTMLInputElement>('.check-cell input[type="checkbox"]')!
        .getAttribute('aria-label'),
    ).toBe('全选')
  })

  it('locale：空态/加载文案随 setLocale 切换，empty-text 属性优先', () => {
    const empty = mount({ data: '[]' })
    expect(empty.shadowRoot!.textContent).toContain('暂无数据')
    const loading = mount({ loading: '' })
    expect(loading.shadowRoot!.textContent).toContain('加载中')
    const custom = mount({ data: '[]', 'empty-text': '没有更多' })
    expect(custom.shadowRoot!.textContent).toContain('没有更多')

    setLocale(en)
    expect(empty.shadowRoot!.textContent).toContain('No data')
    expect(loading.shadowRoot!.textContent).toContain('Loading')
    expect(custom.shadowRoot!.textContent).toContain('没有更多')

    setLocale('zh-CN')
    expect(empty.shadowRoot!.textContent).toContain('暂无数据')
    expect(loading.shadowRoot!.textContent).toContain('加载中')
  })
})
