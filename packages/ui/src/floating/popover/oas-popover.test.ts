import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASPopover } from './index.js'

function mount(attrs: Record<string, string> = {}): OASPopover {
  const el = new OASPopover()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<button>触发</button>`
  document.body.appendChild(el)
  return el
}

describe('OASPopover', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('open 时显示面板，含标题与内容', async () => {
    const el = mount({ open: '', title: '标题', content: '内容区域' })
    await Promise.resolve()
    const panel = el.shadowRoot!.querySelector('[part="panel"]')!
    expect(panel).not.toBeNull()
    expect(panel.getAttribute('role')).toBe('dialog')
    expect(el.shadowRoot!.textContent).toContain('标题')
    expect(el.shadowRoot!.querySelector('[part="content"]')!.textContent).toContain('内容区域')
  })

  it('点击触发元素切换 open', async () => {
    const el = mount({ title: 'x' })
    ;(el.querySelector('button') as HTMLElement).click()
    expect(el.shadowRoot!.querySelector('[part="panel"]')!.getAttribute('aria-hidden')).toBe(
      'false',
    )
  })

  it('外部点击关闭', async () => {
    const el = mount({ open: '', title: 'x' })
    await Promise.resolve()
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.shadowRoot!.querySelector('[part="panel"]')!.getAttribute('aria-hidden')).toBe('true')
  })
})
