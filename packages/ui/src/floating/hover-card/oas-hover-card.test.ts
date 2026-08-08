import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASHoverCard } from './index.js'

function mount(attrs: Record<string, string> = {}): OASHoverCard {
  const el = new OASHoverCard()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<button>悬停</button>`
  document.body.appendChild(el)
  return el
}

describe('OASHoverCard', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('open 时显示卡片，含标题与内容', async () => {
    const el = mount({ open: '', title: '卡片', content: '内容' })
    await Promise.resolve()
    const card = el.shadowRoot!.querySelector('[part="card"]')!
    expect(card).not.toBeNull()
    expect(el.shadowRoot!.textContent).toContain('卡片')
  })

  it('mouseenter 延迟后显示，mouseleave 延迟后隐藏', async () => {
    const el = mount({ title: 'x', delay: '100' })
    ;(el.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true }),
    )
    expect(el.shadowRoot!.querySelector('[part="card"]')!.getAttribute('aria-hidden')).toBe('true')
    vi.advanceTimersByTime(100)
    expect(el.shadowRoot!.querySelector('[part="card"]')!.getAttribute('aria-hidden')).toBe('false')
    ;(el.querySelector('button') as HTMLElement).dispatchEvent(
      new MouseEvent('mouseleave', { bubbles: true }),
    )
    vi.advanceTimersByTime(100)
    expect(el.shadowRoot!.querySelector('[part="card"]')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('focus 触发显示', () => {
    const el = mount({ title: 'x', delay: '0' })
    ;(el.querySelector('button') as HTMLElement).dispatchEvent(new FocusEvent('focusin'))
    vi.advanceTimersByTime(1)
    expect(el.shadowRoot!.querySelector('[part="card"]')!.getAttribute('aria-hidden')).toBe('false')
  })
})
