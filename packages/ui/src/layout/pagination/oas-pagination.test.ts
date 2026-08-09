import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import { OASPagination } from './index.js'

function mount(attrs: Record<string, string> = {}): OASPagination {
  const el = new OASPagination()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.total) el.setAttribute('total', '100')
  if (!attrs['page-size']) el.setAttribute('page-size', '10')
  document.body.appendChild(el)
  return el
}

function pages(el: OASPagination): string[] {
  return [...el.shadowRoot!.querySelectorAll('[part="page"]')].map((p) => p.textContent ?? '')
}

function jumperInput(el: OASPagination): HTMLInputElement {
  return el.shadowRoot!.querySelector('[part="jumper"] input') as HTMLInputElement
}

describe('OASPagination', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染页码与前后按钮，当前页标记', () => {
    const el = mount({ current: '1' })
    expect(el.shadowRoot!.querySelectorAll('[part="page"]').length).toBeGreaterThanOrEqual(3)
    expect(el.shadowRoot!.querySelector('.ellipsis')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="page"][aria-current="true"]')!.textContent).toBe(
      '1',
    )
  })

  it('下一页切换并派发 oas-change', () => {
    const el = mount({ current: '1' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelector('[part="next"]') as HTMLElement).click()
    expect(detail).toEqual({ page: 2 })
    expect(el.getAttribute('current')).toBe('2')
  })

  it('末页后下一页不可用', () => {
    const el = mount({ current: '10' })
    const next = el.shadowRoot!.querySelector('[part="next"]') as HTMLButtonElement
    expect(next.disabled).toBe(true)
  })

  it('show-total：显示「共 N 条」总数文案', () => {
    const el = mount({ 'show-total': '', total: '150' })
    const total = el.shadowRoot!.querySelector('[part="total"]')
    expect(total).not.toBeNull()
    expect(total!.textContent).toBe('共 150 条')
  })

  it('未设置 show-total 时不渲染总数文案', () => {
    const el = mount({ total: '150' })
    expect(el.shadowRoot!.querySelector('[part="total"]')).toBeNull()
  })

  it('page-sizes：渲染下拉选项并选中当前每页条数', () => {
    const el = mount({ 'page-sizes': '[10,20,50]' })
    const select = el.shadowRoot!.querySelector('[part="size"]') as HTMLSelectElement
    expect(select).not.toBeNull()
    expect(select.options.length).toBe(3)
    expect([...select.options].map((o) => o.value)).toEqual(['10', '20', '50'])
    expect(select.value).toBe('10')
    expect(select.getAttribute('aria-label')).toBe('每页条数')
  })

  it('page-sizes：当前每页条数不在选项内时自动补入并选中', () => {
    const el = mount({ 'page-sizes': '[10,20,50]', 'page-size': '30' })
    const select = el.shadowRoot!.querySelector('[part="size"]') as HTMLSelectElement
    expect(select.options.length).toBe(4)
    expect(select.value).toBe('30')
  })

  it('page-sizes：切换派发 { page: 1, pageSize } 并回到第 1 页', () => {
    const el = mount({ 'page-sizes': '[10,20,50]', current: '3' })
    const select = el.shadowRoot!.querySelector('[part="size"]') as HTMLSelectElement
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    select.value = '50'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    expect(detail).toEqual({ page: 1, pageSize: 50 })
    expect(el.getAttribute('current')).toBe('1')
    expect(el.getAttribute('page-size')).toBe('50')
  })

  it('page-sizes：非法 JSON / 空数组不渲染下拉', () => {
    const el = mount({ 'page-sizes': 'not-json' })
    expect(el.shadowRoot!.querySelector('[part="size"]')).toBeNull()
    const el2 = mount({ 'page-sizes': '[]', total: '100' })
    expect(el2.shadowRoot!.querySelector('[part="size"]')).toBeNull()
  })

  it('show-jumper：渲染「跳至 __ 页」输入框', () => {
    const el = mount({ 'show-jumper': '' })
    const input = jumperInput(el)
    expect(input).not.toBeNull()
    const jumper = el.shadowRoot!.querySelector('[part="jumper"]')
    expect(jumper!.textContent).toContain('跳至')
    expect(jumper!.textContent).toContain('页')
  })

  it('show-jumper：回车跳转并派发 { page, pageSize }', () => {
    const el = mount({ 'show-jumper': '', current: '1' })
    const input = jumperInput(el)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    input.value = '3'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(detail).toEqual({ page: 3, pageSize: 10 })
    expect(el.getAttribute('current')).toBe('3')
  })

  it('show-jumper：越界输入夹取到 [1, 最大页]', () => {
    const el = mount({ 'show-jumper': '', current: '1' }) // total 100 / pageSize 10 → 10 页
    let details: unknown[] = []
    el.addEventListener('oas-change', (e: Event) => details.push((e as CustomEvent).detail))
    // 每次回车后组件会重建节点，需重新获取 input
    let input = jumperInput(el)
    input.value = '99'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(details[0]).toEqual({ page: 10, pageSize: 10 })
    input = jumperInput(el)
    input.value = '-5'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(details[1]).toEqual({ page: 1, pageSize: 10 })
    expect(el.getAttribute('current')).toBe('1')
  })

  it('show-jumper：空 / 非法输入不派发', () => {
    const el = mount({ 'show-jumper': '', current: '1' })
    let fired = false
    el.addEventListener('oas-change', () => (fired = true))
    const input = jumperInput(el)
    input.value = 'abc'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    input.value = '   '
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(fired).toBe(false)
  })
})
