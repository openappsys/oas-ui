import { describe, expect, it, beforeEach } from 'vitest'
import { OASPromptInput } from './index.js'

function mount(attrs: Record<string, string> = {}): OASPromptInput {
  const el = new OASPromptInput()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

describe('oas-prompt-input', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('输入文本后 Enter 提交、清空并派发 oas-submit', () => {
    const el = mount()
    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('[part="textarea"]')!
    const seen: string[] = []
    el.addEventListener('oas-submit', (e) => seen.push((e as CustomEvent).detail.value))
    textarea.value = '  你好  '
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(seen).toEqual(['你好'])
    expect(el.value).toBe('')
  })

  it('Shift+Enter 不提交，submit-on-enter=false 不提交', () => {
    const el = mount()
    const textarea = el.shadowRoot!.querySelector<HTMLTextAreaElement>('[part="textarea"]')!
    let count = 0
    el.addEventListener('oas-submit', () => count++)
    textarea.value = 'x'
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }))
    expect(count).toBe(0)
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(count).toBe(1)
    const noEnter = mount({ 'submit-on-enter': 'false' })
    const area2 = noEnter.shadowRoot!.querySelector<HTMLTextAreaElement>('[part="textarea"]')!
    let count2 = 0
    noEnter.addEventListener('oas-submit', () => count2++)
    area2.value = 'x'
    area2.dispatchEvent(new Event('input', { bubbles: true }))
    area2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(count2).toBe(0)
  })

  it('loading 时发送钮切换为停止并派发 oas-stop', () => {
    const el = mount({ loading: '' })
    const send = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="send"]')!
    expect(send.textContent).toBe('停止')
    let stopped = 0
    el.addEventListener('oas-stop', () => stopped++)
    send.click()
    expect(stopped).toBe(1)
  })

  it('suggestions 点击回填并派发 oas-suggestion-select', () => {
    const el = mount({ suggestions: JSON.stringify(['总结', { label: '继续', value: 'continue' }]) })
    const chips = [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.suggestion')]
    expect(chips.map((c) => c.textContent)).toEqual(['总结', '继续'])
    let selected = ''
    el.addEventListener('oas-suggestion-select', (e) => (selected = (e as CustomEvent).detail.value))
    chips[1]!.click()
    expect(el.value).toBe('continue')
    expect(selected).toBe('continue')
  })

  it('disabled 禁止提交；value property/attribute 双通道', () => {
    const el = mount({ value: '初始', disabled: '' })
    expect(el.value).toBe('初始')
    expect(el.submit()).toBe(false)
    el.removeAttribute('disabled')
    el.value = '新的'
    expect(el.value).toBe('新的')
    expect(el.submit()).toBe(true)
  })

  it('readonly 禁止提交且发送钮禁用', () => {
    const el = mount({ value: '只读内容', readonly: '' })
    const send = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="send"]')!
    expect(send.disabled).toBe(true)
    expect(el.submit()).toBe(false)
  })
})
