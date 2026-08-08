import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASInput } from './index.js'

function mount(attrs: Record<string, string> = {}): OASInput {
  const el = new OASInput()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function input(el: OASInput): HTMLInputElement {
  return el.shadowRoot!.querySelector('input')!
}

describe('OASInput', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染原生 input，属性透传', async () => {
    const el = mount({ placeholder: '请输入', disabled: '' })
    const i = input(el)
    await Promise.resolve()
    expect(i.tagName).toBe('INPUT')
    expect(i.placeholder).toBe('请输入')
    expect(i.disabled).toBe(true)
  })

  it('type 属性透传到原生 input', () => {
    const el = mount({ type: 'password' })
    expect(input(el).type).toBe('password')
  })

  it('value 属性同步到 input.value（受控通道）', () => {
    const el = mount({ value: 'hello' })
    expect(input(el).value).toBe('hello')
  })

  it('外部改 value 属性后 input.value 增量同步', () => {
    const el = mount({ value: 'a' })
    const i = input(el)
    el.setAttribute('value', 'b')
    expect(input(el)).toBe(i)
    expect(i.value).toBe('b')
  })

  it('输入派发 oas-input，detail 携带 value', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-input', (e: Event) => (detail = (e as CustomEvent).detail))
    input(el).value = 'x'
    input(el).dispatchEvent(new Event('input'))
    expect(detail).toEqual({ value: 'x' })
  })

  it('clearable + 有值时渲染清除按钮，点击派发 oas-clear 并清空', () => {
    const el = mount({ clearable: '', value: 'abc' })
    const btn = el.shadowRoot!.querySelector('button')!
    expect(btn).not.toBeNull()
    let detail: unknown
    el.addEventListener('oas-clear', (e: Event) => (detail = e))
    btn.click()
    expect(input(el).value).toBe('')
    expect((detail as CustomEvent).bubbles).toBe(true)
  })

  it('无值时 clearable 按钮隐藏', () => {
    const el = mount({ clearable: '' })
    expect(el.shadowRoot!.querySelector('button')!.hidden).toBe(true)
  })

  it('空内容（仅占位符）时清除按钮隐藏', () => {
    const el = mount({ clearable: '', placeholder: '请输入' })
    expect(el.shadowRoot!.querySelector('button')!.hidden).toBe(true)
  })

  it('输入内容后清除按钮显示', () => {
    const el = mount({ clearable: '' })
    const i = input(el)
    i.value = 'abc'
    i.dispatchEvent(new Event('input'))
    expect(el.shadowRoot!.querySelector('button')!.hidden).toBe(false)
  })

  it('清空后清除按钮隐藏', () => {
    const el = mount({ clearable: '', value: 'abc' })
    const btn = el.shadowRoot!.querySelector('button')!
    btn.click()
    expect(btn.hidden).toBe(true)
  })

  it('disabled 时即使有值也隐藏清除按钮', () => {
    const el = mount({ clearable: '', value: 'abc', disabled: '' })
    expect(el.shadowRoot!.querySelector('button')!.hidden).toBe(true)
  })

  it('readonly 时即使有值也隐藏清除按钮', () => {
    const el = mount({ clearable: '', value: 'abc', readonly: '' })
    expect(el.shadowRoot!.querySelector('button')!.hidden).toBe(true)
  })

  it('属性变化增量更新：placeholder 变更不重建引用', () => {
    const el = mount({ placeholder: 'a' })
    const i = input(el)
    el.setAttribute('placeholder', 'b')
    expect(input(el)).toBe(i)
    expect(i.placeholder).toBe('b')
  })
})
