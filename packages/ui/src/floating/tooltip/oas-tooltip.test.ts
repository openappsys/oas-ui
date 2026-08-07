import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OAStooltip } from './index.js'

function mount(attrs: Record<string, string> = {}): OAStooltip {
  const el = new OAStooltip()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<button>hover</button>`
  document.body.appendChild(el)
  return el
}

function tip(el: OAStooltip): HTMLElement {
  return el.shadowRoot!.querySelector('[part="tip"]')!
}

describe('OAStooltip', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('open 时显示 tooltip，role=tooltip + 内容', async () => {
    const el = mount({ open: '', content: '这是提示', placement: 'top' })
    await Promise.resolve()
    const t = tip(el)
    expect(t).not.toBeNull()
    expect(t.getAttribute('role')).toBe('tooltip')
    expect(t.textContent).toContain('这是提示')
  })

  it('mouseenter 触发显示，mouseleave 隐藏', async () => {
    const el = mount({ content: '提示' })
    ;(el.querySelector('button') as HTMLElement).dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    await Promise.resolve()
    expect(tip(el).getAttribute('aria-hidden')).toBe('false')
    ;(el.querySelector('button') as HTMLElement).dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    expect(tip(el).getAttribute('aria-hidden')).toBe('true')
  })

  it('placement 传给浮层', async () => {
    const el = mount({ open: '', content: 'x', placement: 'bottom' })
    await Promise.resolve()
    expect(tip(el).getAttribute('data-placement')).toBe('bottom')
  })
})
