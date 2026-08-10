import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASCombobox } from './index.js'

const OPTIONS = JSON.stringify([
  { label: '苹果', value: 'apple' },
  { label: '香蕉', value: 'banana' },
  { label: '橙子', value: 'orange' },
])

function mount(attrs: Record<string, string> = {}): OASCombobox {
  const el = new OASCombobox()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.options) el.setAttribute('options', OPTIONS)
  document.body.appendChild(el)
  return el
}

function input(el: OASCombobox): HTMLInputElement {
  return el.shadowRoot!.querySelector('input')!
}

function open(el: OASCombobox): void {
  input(el).dispatchEvent(new FocusEvent('focus'))
}

function optionRows(el: OASCombobox): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[role="option"]')]
}

describe('OASCombobox', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染输入框即控件：role=combobox、aria-expanded=false、aria-controls、显示 placeholder', () => {
    const el = mount({ placeholder: '请选择' })
    const i = input(el)
    expect(i.getAttribute('role')).toBe('combobox')
    expect(i.getAttribute('aria-expanded')).toBe('false')
    expect(i.getAttribute('aria-controls')).toBe('combobox-list')
    expect(i.getAttribute('aria-autocomplete')).toBe('list')
    expect(i.placeholder).toBe('请选择')
    expect(el.shadowRoot!.querySelector('[role="listbox"]')).not.toBeNull()
  })

  it('value 匹配时输入框显示选项 label（而非 value）', () => {
    const el = mount({ value: 'banana' })
    expect(input(el).value).toBe('香蕉')
  })

  it('聚焦展开下拉，选项渲染为 role=option，aria-expanded 同步', () => {
    const el = mount()
    open(el)
    expect(input(el).getAttribute('aria-expanded')).toBe('true')
    expect(el.shadowRoot!.querySelector('.dropdown')!.classList.contains('open')).toBe(true)
    expect(optionRows(el).length).toBe(3)
  })

  it('点击选项：value 置 option.value、输入框显示 label、关闭下拉、派发 oas-change', () => {
    const el = mount()
    open(el)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    optionRows(el)[1]!.click()
    expect(el.getAttribute('value')).toBe('banana')
    expect(input(el).value).toBe('香蕉')
    expect(input(el).getAttribute('aria-expanded')).toBe('false')
    expect(detail).toEqual({ value: 'banana' })
  })

  it('点击禁用选项不选中，且渲染 aria-disabled', () => {
    const el = mount({
      options: JSON.stringify([
        { label: '苹果', value: 'apple' },
        { label: '香蕉', value: 'banana', disabled: true },
      ]),
    })
    open(el)
    expect(el.shadowRoot!.querySelector('[aria-disabled="true"]')).not.toBeNull()
    optionRows(el)[1]!.click()
    expect(el.getAttribute('value')).toBeNull()
  })

  it('输入实时过滤 label，派发 oas-input（detail 为过滤词）', () => {
    const el = mount()
    open(el)
    let detail: unknown
    el.addEventListener('oas-input', (e: Event) => (detail = (e as CustomEvent).detail))
    input(el).value = '香'
    input(el).dispatchEvent(new Event('input', { bubbles: true }))
    expect(optionRows(el).length).toBe(1)
    expect(optionRows(el)[0]!.textContent).toContain('香蕉')
    expect(detail).toEqual({ value: '香' })
  })

  it('filterable=false：输入不过滤，全部选项仍渲染', () => {
    const el = mount({ filterable: 'false' })
    open(el)
    input(el).value = '不存在的'
    input(el).dispatchEvent(new Event('input', { bubbles: true }))
    expect(optionRows(el).length).toBe(3)
  })

  it('过滤无匹配时显示 combobox.noMatch 空态（role=status）', () => {
    const el = mount()
    open(el)
    input(el).value = '不存在的'
    input(el).dispatchEvent(new Event('input', { bubbles: true }))
    const status = el.shadowRoot!.querySelector('[role="status"]')!
    expect(status.textContent).toContain('无匹配选项')
  })

  it('options 为空时显示 combobox.empty 空态（role=status）', () => {
    const el = mount({ options: '[]' })
    open(el)
    const status = el.shadowRoot!.querySelector('[role="status"]')!
    expect(status.textContent).toContain('暂无选项')
  })

  it('回归：options 为空时输入也不切换为 noMatch（保持 empty 文案）', () => {
    const el = mount({ options: '[]' })
    open(el)
    input(el).value = '任意输入'
    input(el).dispatchEvent(new Event('input', { bubbles: true }))
    const status = el.shadowRoot!.querySelector('[role="status"]')!
    expect(status.textContent).toContain('暂无选项')
  })

  it('loading 时下拉显示 combobox.loading 加载占位', () => {
    const el = mount({ loading: '' })
    open(el)
    expect(el.shadowRoot!.textContent).toContain('加载中…')
    expect(el.shadowRoot!.querySelectorAll('[role="option"]').length).toBe(0)
  })

  it('键盘：↑↓ 移动高亮，aria-activedescendant 跟随，Enter 选中高亮项', () => {
    const el = mount()
    open(el)
    const i = input(el)
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    const active = el.shadowRoot!.querySelector('.option.active')!
    expect(active.textContent).toContain('橙子')
    expect(i.getAttribute('aria-activedescendant')).toBe(active.id)
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.getAttribute('value')).toBe('orange')
    expect(i.value).toBe('橙子')
  })

  it('键盘：Enter 落到禁用项时不选中（跳过）', () => {
    const el = mount({
      options: JSON.stringify([
        { label: '苹果', value: 'apple' },
        { label: '香蕉', value: 'banana', disabled: true },
        { label: '橙子', value: 'orange' },
      ]),
    })
    open(el)
    const i = input(el)
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    // 高亮可以移动到禁用项，但 Enter 不选中
    expect(el.shadowRoot!.querySelector('.option.active')!.textContent).toContain('香蕉')
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.getAttribute('value')).toBeNull()
  })

  it('键盘：Esc 关闭并回退为当前选中项 label（默认非破坏）', () => {
    const el = mount({ value: 'banana' })
    open(el)
    input(el).value = '乱输'
    input(el).dispatchEvent(new Event('input', { bubbles: true }))
    input(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(input(el).getAttribute('aria-expanded')).toBe('false')
    expect(input(el).value).toBe('香蕉')
  })

  it('失焦未选中时回退为当前选中项 label 并关闭', () => {
    const el = mount({ value: 'apple' })
    open(el)
    input(el).value = '乱输'
    input(el).dispatchEvent(new Event('input', { bubbles: true }))
    input(el).dispatchEvent(new FocusEvent('blur'))
    expect(input(el).value).toBe('苹果')
    expect(input(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('失焦未选中且无值时回退为空', () => {
    const el = mount()
    open(el)
    input(el).value = '乱输'
    input(el).dispatchEvent(new Event('input', { bubbles: true }))
    input(el).dispatchEvent(new FocusEvent('blur'))
    expect(input(el).value).toBe('')
  })

  it('disabled：不可输入、聚焦不展开', () => {
    const el = mount({ disabled: '', value: 'apple' })
    expect(input(el).disabled).toBe(true)
    input(el).dispatchEvent(new FocusEvent('focus'))
    expect(input(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('clearable：有值时显示清空按钮，点击清空并派发 oas-clear / oas-change', () => {
    const el = mount({ clearable: '', value: 'apple' })
    const clearBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!
    expect(clearBtn.hidden).toBe(false)
    let clearDetail: unknown
    let changeDetail: unknown
    el.addEventListener('oas-clear', (e: Event) => (clearDetail = (e as CustomEvent).detail))
    el.addEventListener('oas-change', (e: Event) => (changeDetail = (e as CustomEvent).detail))
    clearBtn.click()
    expect(el.getAttribute('value')).toBeNull()
    expect(input(el).value).toBe('')
    expect(clearDetail).toEqual({ value: 'apple' })
    expect(changeDetail).toEqual({ value: '' })
    expect(clearBtn.hidden).toBe(true)
  })

  it('clearable：无值 / 禁用时不显示清空按钮', () => {
    const el = mount({ clearable: '' })
    expect(el.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!.hidden).toBe(true)
    const el2 = mount({ clearable: '', disabled: '', value: 'apple' })
    expect(el2.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!.hidden).toBe(true)
  })

  it('受控：外部改 value 属性即时回填 label（增量更新，不重建 shadow DOM）', () => {
    const el = mount()
    const i = input(el)
    el.setAttribute('value', 'orange')
    expect(input(el)).toBe(i)
    expect(i.value).toBe('橙子')
  })

  it('点击组件外部关闭并回退', () => {
    const el = mount({ value: 'banana' })
    open(el)
    input(el).value = '乱输'
    input(el).dispatchEvent(new Event('input', { bubbles: true }))
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(input(el).getAttribute('aria-expanded')).toBe('false')
    expect(input(el).value).toBe('香蕉')
  })

  it('重新打开下拉时下拉仍渲染选项（open/close 可往返）', () => {
    const el = mount()
    open(el)
    input(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(input(el).getAttribute('aria-expanded')).toBe('false')
    open(el)
    expect(optionRows(el).length).toBe(3)
  })
})
