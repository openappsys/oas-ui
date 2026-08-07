import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASAlert } from './index.js'

function mount(attrs: Record<string, string> = {}): OASAlert {
  const el = new OASAlert()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `这是提示内容`
  document.body.appendChild(el)
  return el
}

describe('OASAlert', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染内容，type 默认 info', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
    expect(el.textContent).toContain('这是提示内容')
    expect(el.shadowRoot!.querySelector('[part="box"]')!.getAttribute('data-type')).toBe('info')
  })

  it('error 类型 role=alert', () => {
    const el = mount({ type: 'error' })
    expect(el.shadowRoot!.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('closeable 显示关闭按钮并派发 oas-close', async () => {
    const el = mount({ closeable: '' })
    let close = 0
    el.addEventListener('oas-close', () => close++)
    ;(el.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click()
    expect(close).toBe(1)
    expect(el.hidden).toBe(true)
  })

  it('title 属性渲染标题', () => {
    const el = mount({ title: '警告' })
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('警告')
  })
})
