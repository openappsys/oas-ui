import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASSelect } from './index.js'

const OPTIONS = JSON.stringify([
  { label: '苹果', value: 'apple' },
  { label: '香蕉', value: 'banana' },
  { label: '橙子', value: 'orange' },
])

function mount(attrs: Record<string, string> = {}): OASSelect {
  const el = new OASSelect()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.options) el.setAttribute('options', OPTIONS)
  document.body.appendChild(el)
  return el
}

function trigger(el: OASSelect): HTMLButtonElement {
  return el.shadowRoot!.querySelector('button[part="trigger"]')!
}

function open(el: OASSelect): void {
  trigger(el).click()
}

describe('OASSelect', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 trigger，未选择显示 placeholder，含 combobox 角色', async () => {
    const el = mount({ placeholder: '请选择' })
    await Promise.resolve()
    expect(trigger(el).getAttribute('role')).toBe('combobox')
    expect(trigger(el).textContent).toContain('请选择')
  })

  it('value 匹配时显示选项 label', () => {
    const el = mount({ value: 'banana' })
    expect(trigger(el).textContent).toContain('香蕉')
  })

  it('点击展开下拉，aria-expanded 同步', () => {
    const el = mount()
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
    open(el)
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
    const listbox = el.shadowRoot!.querySelector('[role="listbox"]')
    expect(listbox).not.toBeNull()
    expect(listbox!.querySelectorAll('[role="option"]').length).toBe(3)
  })

  it('选择选项后更新 value 并关闭下拉，派发 oas-change', () => {
    const el = mount()
    open(el)
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const options = el.shadowRoot!.querySelectorAll('[role="option"]')
    ;(options[1] as HTMLElement).click()
    expect(el.getAttribute('value')).toBe('banana')
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
    expect(detail).toEqual({ value: 'banana' })
  })

  it('Esc 关闭下拉', () => {
    const el = mount()
    open(el)
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('多选：multiple 时选择叠加，chip 显示选中项', () => {
    const el = mount({ multiple: '' })
    open(el)
    const options = el.shadowRoot!.querySelectorAll('[role="option"]')
    ;(options[0] as HTMLElement).click()
    ;(options[1] as HTMLElement).click()
    const value = JSON.parse(el.getAttribute('value') ?? '[]')
    expect(value).toEqual(['apple', 'banana'])
    expect(el.shadowRoot!.querySelectorAll('.chip').length).toBe(2)
  })

  it('disabled 时 trigger 不可交互', () => {
    const el = mount({ disabled: '' })
    expect(trigger(el).disabled).toBe(true)
  })

  it('属性变化增量更新：改 options 或 value 即时反映', () => {
    const el = mount()
    const btn = trigger(el)
    el.setAttribute('value', 'orange')
    expect(trigger(el)).toBe(btn)
    expect(trigger(el).textContent).toContain('橙子')
  })

  it('searchable：显示搜索框，输入过滤选项', () => {
    const el = mount({ searchable: '' })
    open(el)
    const searchInput = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    expect(searchInput.hidden).toBe(false)
    searchInput.value = '香'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))
    const options = [...el.shadowRoot!.querySelectorAll('[role="option"]')]
    expect(options.length).toBe(1)
    expect(options[0]!.textContent).toContain('香蕉')
  })

  it('searchable：无匹配时显示空态', () => {
    const el = mount({ searchable: '' })
    open(el)
    const searchInput = el.shadowRoot!.querySelector<HTMLInputElement>('[part="search-input"]')!
    searchInput.value = '不存在的'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.shadowRoot!.textContent).toContain('无匹配选项')
  })
})
