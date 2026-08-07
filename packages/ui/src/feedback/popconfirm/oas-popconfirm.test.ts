import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASPopconfirm } from './index.js'

function mount(attrs: Record<string, string> = {}): OASPopconfirm {
  const el = new OASPopconfirm()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<button>删除</button>`
  document.body.appendChild(el)
  return el
}

describe('OASPopconfirm', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('open 时渲染气泡，含 title 与操作按钮', async () => {
    const el = mount({ open: '', title: '确认删除？' })
    await Promise.resolve()
    const pop = el.shadowRoot!.querySelector('[part="popover"]')!
    expect(pop).not.toBeNull()
    expect(pop.textContent).toContain('确认删除？')
    expect(el.shadowRoot!.querySelector('[part="ok"]')).not.toBeNull()
  })

  it('点击确定派发 oas-ok 并关闭', async () => {
    const el = mount({ open: '', title: '确认' })
    await Promise.resolve()
    let ok = 0
    el.addEventListener('oas-ok', () => ok++)
    ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
    expect(ok).toBe(1)
    expect(el.shadowRoot!.querySelector('[part="popover"]')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('点击取消派发 oas-cancel 并关闭', async () => {
    const el = mount({ open: '' })
    await Promise.resolve()
    let cancel = 0
    el.addEventListener('oas-cancel', () => cancel++)
    ;(el.shadowRoot!.querySelector('[part="cancel"]') as HTMLElement).click()
    expect(cancel).toBe(1)
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('点击 slot 内触发元素切换 open', async () => {
    const el = mount({ title: '确认' })
    await Promise.resolve()
    ;(el.querySelector('button') as HTMLElement).click()
    expect(el.shadowRoot!.querySelector('[part="popover"]')!.getAttribute('aria-hidden')).toBe('false')
  })
})
