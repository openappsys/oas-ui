import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASPagination } from './index.js'

function mount(attrs: Record<string, string> = {}): OASPagination {
  const el = new OASPagination()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.total) el.setAttribute('total', '100')
  if (!attrs.pageSize) el.setAttribute('page-size', '10')
  document.body.appendChild(el)
  return el
}

function pages(el: OASPagination): string[] {
  return [...el.shadowRoot!.querySelectorAll('[part="page"]')].map((p) => p.textContent ?? '')
}

describe('OASPagination', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染页码与前后按钮，当前页标记', () => {
    const el = mount({ current: '1' })
    expect(el.shadowRoot!.querySelectorAll('[part="page"]').length).toBeGreaterThanOrEqual(3)
    expect(el.shadowRoot!.querySelector('.ellipsis')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="page"][aria-current="true"]')!.textContent).toBe(
      '1',
    )
  })

  it('下一页切换并派发 oas-change', () => {
    const el = mount({ current: '1' })
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelector('[part="next"]') as HTMLElement).click()
    expect(detail).toEqual({ page: 2 })
    expect(el.getAttribute('current')).toBe('2')
  })

  it('末页后下一页不可用', () => {
    const el = mount({ current: '10' })
    const next = el.shadowRoot!.querySelector('[part="next"]') as HTMLButtonElement
    expect(next.disabled).toBe(true)
  })
})
