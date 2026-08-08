import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASEditable } from './index.js'

function mount(attrs: Record<string, string> = {}): OASEditable {
  const el = new OASEditable()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function display(el: OASEditable): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="display"]')!
}

function field(el: OASEditable): HTMLInputElement {
  return el.shadowRoot!.querySelector<HTMLInputElement>('input')!
}

function okBtn(el: OASEditable): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>('.ok')!
}

function cancelBtn(el: OASEditable): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>('.cancel')!
}

function pressField(el: OASEditable, keyName: string): void {
  field(el).dispatchEvent(
    new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true }),
  )
}

function pressDisplay(el: OASEditable, keyName: string): void {
  display(el).dispatchEvent(
    new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true }),
  )
}

describe('OASEditable', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('展示态：显示 value，role=button，aria-label=编辑', async () => {
    const el = mount({ value: 'hello' })
    await Promise.resolve()
    expect(display(el).textContent).toBe('hello')
    expect(display(el).getAttribute('role')).toBe('button')
    expect(display(el).getAttribute('aria-label')).toBe('编辑')
  })

  it('空值展示 placeholder', () => {
    const el = mount({ placeholder: '点击编辑' })
    expect(display(el).textContent).toBe('点击编辑')
  })

  it('点击展示态进入编辑，输入框聚焦并带值', () => {
    const el = mount({ value: 'hello' })
    display(el).click()
    expect(display(el).hidden).toBe(true)
    expect(field(el).hidden).toBe(false)
    expect(field(el).value).toBe('hello')
  })

  it('展示态 Enter/空格进入编辑', () => {
    const el = mount({ value: 'x' })
    pressDisplay(el, 'Enter')
    expect(field(el).hidden).toBe(false)
    const el2 = mount({ value: 'x' })
    const d2 = display(el2)
    d2.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }))
    expect(field(el2).hidden).toBe(false)
  })

  it('编辑态 Enter 提交并派发 oas-change', () => {
    const el = mount({ value: 'hello' })
    display(el).click()
    field(el).value = 'world'
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    pressField(el, 'Enter')
    expect(detail).toEqual({ value: 'world' })
    expect(el.getAttribute('value')).toBe('world')
    expect(display(el).textContent).toBe('world')
  })

  it('编辑态 Esc 还原旧值并派发 oas-cancel', () => {
    const el = mount({ value: 'hello' })
    display(el).click()
    field(el).value = 'changed'
    let detail: unknown
    el.addEventListener('oas-cancel', (e: Event) => (detail = (e as CustomEvent).detail))
    pressField(el, 'Escape')
    expect(detail).not.toBeUndefined()
    expect(el.getAttribute('value')).toBe('hello')
    expect(display(el).textContent).toBe('hello')
  })

  it('空值提交：还原旧值并派发 oas-cancel（默认非破坏）', () => {
    const el = mount({ value: 'hello' })
    display(el).click()
    field(el).value = ''
    let cancelled = false
    el.addEventListener('oas-cancel', () => (cancelled = true))
    pressField(el, 'Enter')
    expect(cancelled).toBe(true)
    expect(el.getAttribute('value')).toBe('hello')
    expect(display(el).textContent).toBe('hello')
  })

  it('submit-on-enter=false 时 Enter 不提交', () => {
    const el = mount({ value: 'a', 'submit-on-enter': 'false' })
    display(el).click()
    field(el).value = 'b'
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    pressField(el, 'Enter')
    expect(detail).toBeUndefined()
  })

  it('点击确认按钮提交、取消按钮还原', () => {
    const el = mount({ value: 'a' })
    display(el).click()
    field(el).value = 'b'
    okBtn(el).click()
    expect(el.getAttribute('value')).toBe('b')
    const el2 = mount({ value: 'c' })
    display(el2).click()
    field(el2).value = 'd'
    cancelBtn(el2).click()
    expect(el2.getAttribute('value')).toBe('c')
  })

  it('maxlength 透传到输入框', () => {
    const el = mount({ maxlength: '10' })
    display(el).click()
    expect(field(el).maxLength).toBe(10)
  })

  it('disabled 时不可进入编辑', () => {
    const el = mount({ disabled: '', value: 'x' })
    display(el).click()
    expect(display(el).hidden).toBe(false)
    expect(el.shadowRoot!.querySelector<HTMLElement>('.edit')!.hidden).toBe(true)
  })

  it('编辑态输入框保持 aria-label=编辑', () => {
    const el = mount({ value: 'x' })
    display(el).click()
    expect(field(el).getAttribute('aria-label')).toBe('编辑')
  })

  it('值未变化提交不派发事件', () => {
    const el = mount({ value: 'same' })
    display(el).click()
    field(el).value = 'same'
    let fired = false
    el.addEventListener('oas-change', () => (fired = true))
    el.addEventListener('oas-cancel', () => (fired = true))
    pressField(el, 'Enter')
    expect(fired).toBe(false)
  })
})
