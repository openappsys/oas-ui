import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASMatrix } from './index.js'

const ROWS = JSON.stringify([
  { key: 'speed', label: '响应速度' },
  { key: 'quality', label: '内容质量' },
])
const COLUMNS = JSON.stringify([
  { key: 'bad', label: '差' },
  { key: 'ok', label: '一般' },
  { key: 'good', label: '好' },
])

function mount(attrs: Record<string, string> = {}): OASMatrix {
  const el = new OASMatrix()
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  document.body.appendChild(el)
  return el
}

function rows(el: OASMatrix): HTMLFieldSetElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLFieldSetElement>('fieldset')]
}

function inputs(el: OASMatrix, row: number): HTMLInputElement[] {
  return [...rows(el)[row]!.querySelectorAll<HTMLInputElement>('input')]
}

function cell(el: OASMatrix, row: number, col: number): HTMLLabelElement {
  return inputs(el, row)[col]!.closest<HTMLLabelElement>('.cell')!
}

function pick(el: OASMatrix, row: number, col: number): void {
  inputs(el, row)[col]!.click()
}

function errorText(el: OASMatrix): string {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="error"]')!.textContent ?? ''
}

describe('OASMatrix', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('按 rows / columns 渲染行标题与列头', () => {
    const el = mount({ rows: ROWS, columns: COLUMNS })
    expect(rows(el).map((row) => row.querySelector('legend')!.textContent)).toEqual(['响应速度', '内容质量'])
    const headers = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="column"]')]
    expect(headers.map((header) => header.textContent)).toEqual(['差', '一般', '好'])
    expect(inputs(el, 0)).toHaveLength(3)
    expect(inputs(el, 0)[0]!.type).toBe('radio')
    expect(cell(el, 0, 0).tagName).toBe('LABEL')
  })

  it('radio 模式点击写入 value JSON 并派发 oas-change', () => {
    const el = mount({ rows: ROWS, columns: COLUMNS })
    const events: Array<Record<string, unknown>> = []
    el.addEventListener('oas-change', (event) => events.push((event as CustomEvent).detail))
    pick(el, 0, 2)
    expect(JSON.parse(el.getAttribute('value') ?? '{}')).toEqual({ speed: 'good' })
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ rowKey: 'speed', columnKey: 'good', checked: true })
    expect(inputs(el, 0)[2]!.checked).toBe(true)
    expect(cell(el, 0, 2).hasAttribute('data-checked')).toBe(true)
  })

  it('radio 行内互斥：改选另一列只保留一个选中', () => {
    const el = mount({ rows: ROWS, columns: COLUMNS })
    pick(el, 0, 0)
    pick(el, 0, 2)
    expect(inputs(el, 0).filter((input) => input.checked)).toHaveLength(1)
    expect(inputs(el, 0)[0]!.checked).toBe(false)
    expect(el.value).toEqual({ speed: 'good' })
  })

  it('checkbox 模式按行累加多选，取消最后一项移除该行 key', () => {
    const el = mount({ rows: ROWS, columns: COLUMNS, mode: 'checkbox' })
    expect(inputs(el, 0)[0]!.type).toBe('checkbox')
    pick(el, 0, 0)
    pick(el, 0, 2)
    pick(el, 1, 1)
    expect(el.value).toEqual({ speed: ['bad', 'good'], quality: ['ok'] })
    pick(el, 0, 0)
    expect(el.value).toEqual({ speed: ['good'], quality: ['ok'] })
    pick(el, 0, 2)
    expect(el.value).toEqual({ quality: ['ok'] })
  })

  it('rows / columns property：数组与 JSON 字符串双通道，均反射 attribute', () => {
    const el = mount()
    el.rows = [{ key: 'a', label: 'A' }]
    el.columns = [
      { key: 'x', label: 'X' },
      { key: 'y', label: 'Y' },
    ]
    expect(JSON.parse(el.getAttribute('rows') ?? '[]')).toEqual([{ key: 'a', label: 'A' }])
    expect(el.rows).toEqual([{ key: 'a', label: 'A', disabled: false }])
    el.rows = JSON.stringify([{ key: 'b', label: 'B' }])
    el.columns = JSON.stringify([{ key: 'z', label: 'Z' }])
    expect(rows(el).map((row) => row.querySelector('legend')!.textContent)).toEqual(['B'])
    expect([...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="column"]')].map((h) => h.textContent)).toEqual([
      'Z',
    ])
  })

  it('value property：对象 / JSON 字符串双通道，并同步渲染勾选态', () => {
    const el = mount({ rows: ROWS, columns: COLUMNS })
    el.value = { speed: 'ok' }
    expect(el.getAttribute('value')).toBe('{"speed":"ok"}')
    expect(inputs(el, 0)[1]!.checked).toBe(true)
    el.value = '{"quality":"good"}'
    expect(inputs(el, 1)[2]!.checked).toBe(true)
    expect(inputs(el, 0)[1]!.checked).toBe(false)
  })

  it('value 属性预置时按 mode 归一（radio 数组取首个，checkbox 字符串转数组）', () => {
    const radio = mount({ rows: ROWS, columns: COLUMNS, value: '{"speed":["bad","good"]}' })
    expect(radio.value).toEqual({ speed: 'bad' })
    expect(inputs(radio, 0)[0]!.checked).toBe(true)
    const checkbox = mount({ rows: ROWS, columns: COLUMNS, mode: 'checkbox', value: '{"speed":"ok"}' })
    expect(checkbox.value).toEqual({ speed: ['ok'] })
  })

  it('空态：无 rows / 非法 JSON 显示占位并隐藏矩阵', () => {
    const el = mount({ rows: '[]', columns: COLUMNS })
    const empty = el.shadowRoot!.querySelector<HTMLElement>('[part="empty"]')!
    expect(empty.hidden).toBe(false)
    expect(empty.textContent).not.toBe('')
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="scroll"]')!.hidden).toBe(true)
    document.body.innerHTML = ''
    const bad = mount({ rows: '{oops', columns: COLUMNS })
    expect(bad.shadowRoot!.querySelector<HTMLElement>('[part="empty"]')!.hidden).toBe(false)
    expect(rows(bad)).toHaveLength(0)
  })

  it('required（行级）validate 失败：派发 oas-invalid、可视化错误、aria-invalid', () => {
    const el = mount({ rows: ROWS, columns: COLUMNS, required: '' })
    const details: Array<Record<string, unknown>> = []
    el.addEventListener('oas-invalid', (event) => details.push((event as CustomEvent).detail))
    expect(el.validate()).toBe(false)
    expect(details).toHaveLength(1)
    expect(details[0]).toMatchObject({ reason: 'required', scope: 'row' })
    expect((details[0]!.missingRows as string[]).sort()).toEqual(['quality', 'speed'])
    expect(el.hasAttribute('data-invalid')).toBe(true)
    expect(errorText(el)).not.toBe('')
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="error"]')!.hidden).toBe(false)
    expect(inputs(el, 0)[0]!.getAttribute('aria-invalid')).toBe('true')
    expect(rows(el)[0]!.hasAttribute('data-invalid'), '缺失行需有可见错误标记').toBe(true)
    expect(rows(el)[1]!.hasAttribute('data-invalid')).toBe(true)

    pick(el, 0, 1)
    pick(el, 1, 1)
    expect(el.hasAttribute('data-invalid')).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="error"]')!.hidden).toBe(true)
    expect(inputs(el, 0)[0]!.hasAttribute('aria-invalid')).toBe(false)
    expect(rows(el)[0]!.hasAttribute('data-invalid')).toBe(false)
    expect(el.validate()).toBe(true)
  })

  it('required-scope="table"：任一行作答即通过', () => {
    const el = mount({ rows: ROWS, columns: COLUMNS, required: '', 'required-scope': 'table' })
    expect(el.validate()).toBe(false)
    pick(el, 1, 0)
    expect(el.validate()).toBe(true)
  })

  it('无 required 时 validate 恒通过且不派发 invalid', () => {
    const el = mount({ rows: ROWS, columns: COLUMNS })
    let count = 0
    el.addEventListener('oas-invalid', () => count++)
    expect(el.validate()).toBe(true)
    expect(count).toBe(0)
  })

  it('禁用组：控件 disabled 且点击不改变值', () => {
    const el = mount({ rows: ROWS, columns: COLUMNS, disabled: '' })
    expect(inputs(el, 0).every((input) => input.disabled)).toBe(true)
    pick(el, 0, 0)
    expect(el.getAttribute('value')).toBeNull()
    expect(inputs(el, 0)[0]!.checked).toBe(false)
  })

  it('列级 disabled：该列不可选且方向键跳过', () => {
    const columns = JSON.stringify([
      { key: 'bad', label: '差' },
      { key: 'ok', label: '一般', disabled: true },
      { key: 'good', label: '好' },
    ])
    const el = mount({ rows: ROWS, columns })
    expect(inputs(el, 0)[1]!.disabled).toBe(true)
    const first = inputs(el, 0)[0]!
    first.focus()
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }))
    expect(el.shadowRoot!.activeElement).toBe(inputs(el, 0)[2])
    expect(el.value).toEqual({ speed: 'good' })
  })

  it('只读：点击不改变值，原生变更被回滚为受控值', () => {
    const el = mount({ rows: ROWS, columns: COLUMNS, readonly: '', value: '{"speed":"ok"}' })
    expect(el.hasAttribute('data-readonly')).toBe(true)
    expect(el.shadowRoot!.querySelector<HTMLElement>('.matrix')!.getAttribute('aria-disabled')).toBe('false')
    pick(el, 0, 0)
    expect(el.value).toEqual({ speed: 'ok' })
    // 只读原生控件不可写：绕过点击直接改 checked 并派发 change，必须回滚到 value 属性
    inputs(el, 0)[0]!.checked = true
    inputs(el, 0)[1]!.checked = false
    inputs(el, 0)[0]!.dispatchEvent(new Event('change', { bubbles: true }))
    expect(el.value).toEqual({ speed: 'ok' })
    expect(inputs(el, 0)[1]!.checked).toBe(true)
    expect(inputs(el, 0)[0]!.checked).toBe(false)
  })

  it('键盘：方向键行内移动（radio 同时选中）、Home / End 跳首末', () => {
    const el = mount({ rows: ROWS, columns: COLUMNS })
    const first = inputs(el, 0)[0]!
    first.focus()
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }))
    expect(el.shadowRoot!.activeElement).toBe(inputs(el, 0)[1])
    expect(el.value).toEqual({ speed: 'ok' })
    inputs(el, 0)[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, composed: true }))
    expect(el.shadowRoot!.activeElement).toBe(inputs(el, 0)[2])
    expect(el.value).toEqual({ speed: 'good' })
    inputs(el, 0)[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }))
    expect(el.shadowRoot!.activeElement).toBe(inputs(el, 0)[0])
    inputs(el, 0)[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, composed: true }))
    expect(el.shadowRoot!.activeElement).toBe(inputs(el, 0)[0])
  })

  it('roving tabindex：radio 行内仅一个可 Tab 项（选中项优先）', () => {
    const el = mount({ rows: ROWS, columns: COLUMNS, value: '{"speed":"good"}' })
    const tabs = inputs(el, 0).map((input) => input.tabIndex)
    expect(tabs).toEqual([-1, -1, 0])
    expect(inputs(el, 1).map((input) => input.tabIndex)).toEqual([0, -1, -1])
    document.body.innerHTML = ''
    const checkbox = mount({ rows: ROWS, columns: COLUMNS, mode: 'checkbox' })
    expect(inputs(checkbox, 0).every((input) => input.tabIndex === 0)).toBe(true)
  })

  it('a11y：fieldset + legend 承载行标题，输入以 row/column 标题命名', () => {
    const el = mount({ rows: ROWS, columns: COLUMNS, label: '服务评价' })
    const [firstRow] = rows(el)
    const legend = firstRow!.querySelector('legend')!
    const input = inputs(el, 0)[0]!
    const labelledBy = input.getAttribute('aria-labelledby')!.split(' ')
    expect(labelledBy).toHaveLength(2)
    expect(labelledBy[0]).toBe(legend.id)
    expect(el.shadowRoot!.getElementById(labelledBy[1]!)?.textContent).toBe('差')
    expect(el.shadowRoot!.querySelector<HTMLElement>('.matrix')!.getAttribute('aria-label')).toBe('服务评价')
  })

  it('required 行级：输入带 aria-required 且描述关联必答提示', () => {
    const el = mount({ rows: ROWS, columns: COLUMNS, required: '' })
    const input = inputs(el, 0)[0]!
    expect(input.getAttribute('aria-required')).toBe('true')
    const hintId = input.getAttribute('aria-describedby')!.split(' ')[0]!
    expect(el.shadowRoot!.getElementById(hintId)?.textContent).not.toBe('')
  })

  it('clear()：清空值并派发 oas-change', () => {
    const el = mount({ rows: ROWS, columns: COLUMNS, value: '{"speed":"ok"}' })
    let event: CustomEvent | null = null
    el.addEventListener('oas-change', (e) => (event = e as CustomEvent))
    el.clear()
    expect(el.value).toEqual({})
    expect(inputs(el, 0)[1]!.checked).toBe(false)
    expect(event!.detail).toMatchObject({ value: {} })
  })

  it('未知 value key 不渲染勾选、也不参与必答判定', () => {
    const el = mount({ rows: ROWS, columns: COLUMNS, required: '', value: '{"ghost":"bad"}' })
    expect(inputs(el, 0).every((input) => !input.checked)).toBe(true)
    expect(el.validate()).toBe(false)
  })

  it('mode 非法值回落 radio 并告警一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ rows: ROWS, columns: COLUMNS, mode: 'grid' })
    expect(inputs(el, 0)[0]!.type).toBe('radio')
    el.validate()
    el.value = { speed: 'ok' }
    expect(warn.mock.calls.filter((call) => String(call[0]).includes('非法 mode'))).toHaveLength(1)
  })
})
