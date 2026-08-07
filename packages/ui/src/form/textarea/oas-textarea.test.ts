import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASTextarea } from './index.js'

function mount(attrs: Record<string, string> = {}): OASTextarea {
  const el = new OASTextarea()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function ta(el: OASTextarea): HTMLTextAreaElement {
  return el.shadowRoot!.querySelector('textarea')!
}

describe('OASTextarea', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染原生 textarea，rows 默认 3', async () => {
    const el = mount()
    const t = ta(el)
    await Promise.resolve()
    expect(t.tagName).toBe('TEXTAREA')
    expect(Number(t.rows)).toBe(3)
  })

  it('rows/resize 属性生效', () => {
    const el = mount({ rows: '5', resize: 'both' })
    expect(Number(ta(el).rows)).toBe(5)
    expect(ta(el).style.resize).toBe('both')
  })

  it('value 受控同步 + 外部变更增量更新', () => {
    const el = mount({ value: 'a' })
    const t = ta(el)
    expect(t.value).toBe('a')
    el.setAttribute('value', 'b')
    expect(ta(el)).toBe(t)
    expect(t.value).toBe('b')
  })

  it('输入派发 oas-input，detail 携带 value', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-input', (e: Event) => (detail = (e as CustomEvent).detail))
    ta(el).value = '文本'
    ta(el).dispatchEvent(new Event('input'))
    expect(detail).toEqual({ value: '文本' })
  })

  it('placeholder/disabled 透传', () => {
    const el = mount({ placeholder: '请输入内容', disabled: '' })
    expect(ta(el).placeholder).toBe('请输入内容')
    expect(ta(el).disabled).toBe(true)
  })
})
