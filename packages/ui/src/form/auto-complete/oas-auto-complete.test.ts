import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASAutoComplete } from './index.js'

const OPTIONS = JSON.stringify([
  { label: '苹果', value: 'apple' },
  { label: '香蕉', value: 'banana' },
  { label: '橙子', value: 'orange' },
])

function mount(attrs: Record<string, string> = {}): OASAutoComplete {
  const el = new OASAutoComplete()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.options) el.setAttribute('options', OPTIONS)
  document.body.appendChild(el)
  return el
}

function input(el: OASAutoComplete): HTMLInputElement {
  return el.shadowRoot!.querySelector('input')!
}

describe('OASAutoComplete', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染原生 input + combobox 角色，options 完整时展开', async () => {
    const el = mount()
    await Promise.resolve()
    const i = input(el)
    expect(i.getAttribute('role')).toBe('combobox')
    i.value = '苹'
    i.dispatchEvent(new Event('input'))
    const options = el.shadowRoot!.querySelectorAll('[role="option"]')
    expect(options.length).toBe(1)
    expect(options[0]!.textContent).toContain('苹果')
  })

  it('无匹配时显示空态', () => {
    const el = mount()
    const i = input(el)
    i.value = '不存在的'
    i.dispatchEvent(new Event('input'))
    expect(el.shadowRoot!.querySelector('.empty')).not.toBeNull()
  })

  it('输入派发 oas-input，选择派发 oas-change 并填入 input', () => {
    const el = mount()
    let inputDetail: unknown
    let changeDetail: unknown
    el.addEventListener('oas-input', (e: Event) => (inputDetail = (e as CustomEvent).detail))
    el.addEventListener('oas-change', (e: Event) => (changeDetail = (e as CustomEvent).detail))
    const i = input(el)
    i.value = '香'
    i.dispatchEvent(new Event('input'))
    expect(inputDetail).toEqual({ value: '香' })
    ;(el.shadowRoot!.querySelector('[role="option"]') as HTMLElement).click()
    expect(changeDetail).toEqual({ value: 'banana', label: '香蕉' })
    expect(input(el).value).toBe('香蕉')
  })

  it('Esc 关闭下拉', () => {
    const el = mount()
    const i = input(el)
    i.value = '苹'
    i.dispatchEvent(new Event('input'))
    expect(i.getAttribute('aria-expanded')).toBe('true')
    i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(i.getAttribute('aria-expanded')).toBe('false')
  })

  it('disabled 时 input 禁用', () => {
    const el = mount({ disabled: '' })
    expect(input(el).disabled).toBe(true)
  })
})

describe('OASAutoComplete focus 委托', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('host.focus() 委托到 shadow 内主输入', () => {
    const el = new OASAutoComplete()
    el.setAttribute('options', OPTIONS)
    document.body.appendChild(el)
    el.focus()
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('input'))
  })
})
