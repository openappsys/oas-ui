import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASModal } from './index.js'

function mount(attrs: Record<string, string> = {}): OASModal {
  const el = new OASModal()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<p>内容</p>`
  document.body.appendChild(el)
  return el
}

describe('OASModal', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('visible 为 true 时渲染对话框，含 role=dialog + aria-modal + slot', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    const dialog = el.shadowRoot!.querySelector('[role="dialog"]')!
    expect(dialog).not.toBeNull()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
    expect(el.textContent).toContain('内容')
  })

  it('visible 缺省时隐藏', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[role="dialog"]')!.getAttribute('aria-hidden')).toBe(
      'true',
    )
  })

  it('点击确定派发 oas-ok', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let ok = 0
    el.addEventListener('oas-ok', () => ok++)
    ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
    expect(ok).toBe(1)
  })

  it('点击遮罩触发 oas-cancel（maskClosable）', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let cancel = 0
    el.addEventListener('oas-cancel', () => cancel++)
    el.shadowRoot!.querySelector('.mask')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(cancel).toBe(1)
  })

  it('Esc 关闭触发 oas-cancel', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let cancel = 0
    el.addEventListener('oas-cancel', () => cancel++)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(cancel).toBe(1)
  })

  it('无 footer 时不渲染按钮', async () => {
    const el = mount({ visible: '', 'no-footer': '' })
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector('[part="ok"]')).toBeNull()
  })

  it('点击 ✕ 移除 visible 并派发 oas-cancel', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let cancel = 0
    el.addEventListener('oas-cancel', () => cancel++)
    ;(el.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click()
    expect(el.hasAttribute('visible')).toBe(false)
    expect(cancel).toBe(1)
  })

  it('Esc 移除 visible', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(el.hasAttribute('visible')).toBe(false)
  })

  it('点击遮罩移除 visible', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    el.shadowRoot!.querySelector('.mask')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(el.hasAttribute('visible')).toBe(false)
  })

  it('点击确定移除 visible 并派发 oas-ok', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let ok = 0
    el.addEventListener('oas-ok', () => ok++)
    ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
    expect(el.hasAttribute('visible')).toBe(false)
    expect(ok).toBe(1)
  })
})
