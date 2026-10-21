import { describe, expect, it, beforeEach } from 'vitest'
import { OASToolCall } from './index.js'

function mount(attrs: Record<string, string> = {}): OASToolCall {
  const el = new OASToolCall()
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  document.body.appendChild(el)
  return el
}

describe('oas-tool-call', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染名称/摘要/状态与参数结果', () => {
    const el = mount({
      name: 'search_docs',
      summary: '搜索 API 文档',
      status: 'success',
      args: '{"query":"scheduler"}',
      result: '["scheduler"]',
      open: '',
    })
    const root = el.shadowRoot!
    expect(root.querySelector('[part="name"]')!.textContent).toBe('search_docs')
    expect(root.querySelector('[part="summary"]')!.textContent).toBe('搜索 API 文档')
    expect(root.querySelector('[part="status-text"]')!.textContent).toBe('已完成')
    expect(root.querySelector<HTMLElement>('[part="body"]')!.hidden).toBe(false)
    expect(root.querySelector('[part="args"]')!.textContent).toContain('"query": "scheduler"')
    expect(root.querySelector('[part="result"]')!.textContent).toContain('scheduler')
  })

  it('默认折叠，点击切换并派发 oas-toggle', () => {
    const el = mount({ name: 'tool', summary: '执行中', status: 'running' })
    const head = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="head"]')!
    const body = el.shadowRoot!.querySelector<HTMLElement>('[part="body"]')!
    expect(body.hidden).toBe(true)
    expect(head.getAttribute('aria-expanded')).toBe('false')
    const seen: Array<{ open: boolean; name: string }> = []
    el.addEventListener('oas-toggle', (event) => seen.push((event as CustomEvent).detail))
    head.click()
    expect(body.hidden).toBe(false)
    expect(head.getAttribute('aria-expanded')).toBe('true')
    expect(seen).toEqual([{ open: true, name: 'tool' }])
  })

  it('collapsible=false 强制展开且点击不切换', () => {
    const el = mount({ name: 'tool', collapsible: 'false', status: 'error' })
    const head = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="head"]')!
    const body = el.shadowRoot!.querySelector<HTMLElement>('[part="body"]')!
    expect(body.hidden).toBe(false)
    expect(head.disabled).toBe(true)
    head.click()
    expect(body.hidden).toBe(false)
  })

  it('参数/结果按文本渲染，不注入 HTML', () => {
    const el = mount({ name: 'x', args: '<img src=x onerror=alert(1)>', result: '<b>bad</b>', open: '' })
    expect(el.shadowRoot!.querySelector('img')).toBeNull()
    expect(el.shadowRoot!.querySelector('[part="args"]')!.textContent).toBe('<img src=x onerror=alert(1)>')
    expect(el.shadowRoot!.querySelector('[part="result"]')!.textContent).toBe('<b>bad</b>')
  })
})
