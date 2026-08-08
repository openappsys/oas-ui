import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASDynamicInput } from './index.js'

function mount(attrs: Record<string, string> = {}): OASDynamicInput {
  const el = new OASDynamicInput()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function rows(el: OASDynamicInput): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.row')]
}

function rowInput(el: OASDynamicInput, idx: number): Element {
  return rows(el)[idx]!.querySelector('oas-input')!
}

function rowValue(el: OASDynamicInput, idx: number): string {
  return rowInput(el, idx).getAttribute('value') ?? ''
}

function addBtn(el: OASDynamicInput): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>('.add')!
}

function removeBtn(el: OASDynamicInput, idx: number): HTMLButtonElement {
  return rows(el)[idx]!.querySelector<HTMLButtonElement>('.remove')!
}

function typeRow(el: OASDynamicInput, idx: number, value: string): void {
  const inner = rowInput(el, idx)
  inner.dispatchEvent(
    new CustomEvent('oas-input', { detail: { value }, bubbles: true, composed: true }),
  )
}

describe('OASDynamicInput', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('model-value 属性（JSON）渲染多行', async () => {
    const el = mount({ 'model-value': '["a","b"]' })
    await Promise.resolve()
    expect(rows(el).length).toBe(2)
    expect(rowValue(el, 0)).toBe('a')
    expect(rowValue(el, 1)).toBe('b')
  })

  it('无 model-value 时渲染 0 行（空态），含添加按钮', () => {
    const el = mount()
    expect(rows(el).length).toBe(0)
    expect(addBtn(el).textContent).toBe('添加')
  })

  it('点击添加追加一行，值为 default-value', () => {
    const el = mount({ 'default-value': '默认' })
    addBtn(el).click()
    expect(rows(el).length).toBe(1)
    expect(rowValue(el, 0)).toBe('默认')
  })

  it('点击删除移除对应行并派发 oas-change', () => {
    const el = mount({ 'model-value': '["a","b","c"]' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    removeBtn(el, 1).click()
    expect(rows(el).length).toBe(2)
    expect(rowValue(el, 0)).toBe('a')
    expect(rowValue(el, 1)).toBe('c')
    expect(detail).toEqual({ value: ['a', 'c'] })
  })

  it('min 下补足行数，且达到 min 时删除按钮禁用', () => {
    const el = mount({ min: '2', 'model-value': '["a"]' })
    expect(rows(el).length).toBe(2)
    expect(rowValue(el, 1)).toBe('')
    expect(removeBtn(el, 0).disabled).toBe(true)
    expect(removeBtn(el, 1).disabled).toBe(true)
  })

  it('min=0 且空列表时最后一行（无行）不报错', () => {
    const el = mount()
    expect(rows(el).length).toBe(0)
  })

  it('max 达到后添加按钮禁用', () => {
    const el = mount({ max: '2', 'model-value': '["a","b"]' })
    expect(addBtn(el).disabled).toBe(true)
  })

  it('max 超限时截断 model-value', () => {
    const el = mount({ max: '2', 'model-value': '["a","b","c"]' })
    expect(rows(el).length).toBe(2)
  })

  it('行内输入更新数组并派发 oas-change', () => {
    const el = mount({ 'model-value': '["a"]' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    typeRow(el, 0, 'abc')
    expect(detail).toEqual({ value: ['abc'] })
    expect(el.modelValue).toEqual(['abc'])
  })

  it('disabled 时行内输入与添加/删除按钮全部禁用', () => {
    const el = mount({ disabled: '', 'model-value': '["a"]' })
    expect(rowInput(el, 0).hasAttribute('disabled')).toBe(true)
    expect(removeBtn(el, 0).disabled).toBe(true)
    expect(addBtn(el).disabled).toBe(true)
  })

  it('受控：外部设置 modelValue 属性即时同步行', () => {
    const el = mount()
    el.modelValue = ['x', 'y']
    expect(rows(el).length).toBe(2)
    expect(rowValue(el, 0)).toBe('x')
    expect(rowValue(el, 1)).toBe('y')
  })

  it('添加/删除后模型写回属性（受控通道）', () => {
    const el = mount()
    addBtn(el).click()
    expect(JSON.parse(el.getAttribute('model-value') ?? '[]')).toEqual([''])
  })

  it('删除按钮有可访问名称', () => {
    const el = mount({ 'model-value': '["a"]' })
    expect(removeBtn(el, 0).getAttribute('aria-label')).toBe('删除')
  })
})
