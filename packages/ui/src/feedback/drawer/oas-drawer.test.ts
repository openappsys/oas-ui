import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASDrawer } from './index.js'

function mount(attrs: Record<string, string> = {}): OASDrawer {
  const el = new OASDrawer()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<p>抽屉内容</p>`
  document.body.appendChild(el)
  return el
}

describe('OASDrawer', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('visible 时渲染面板，placement 默认 right', async () => {
    const el = mount({ visible: '', title: '筛选' })
    await Promise.resolve()
    const panel = el.shadowRoot!.querySelector('[part="panel"]')!
    expect(panel).not.toBeNull()
    expect(panel.getAttribute('role')).toBe('dialog')
    expect(el.shadowRoot!.querySelector('[part="title"]')!.textContent).toBe('筛选')
  })

  it('placement 属性控制方向', async () => {
    const el = mount({ visible: '', placement: 'left' })
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector('[part="panel"]')!.getAttribute('data-placement')).toBe(
      'left',
    )
  })

  it('关闭按钮触发 oas-close', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let close = 0
    el.addEventListener('oas-close', () => close++)
    ;(el.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click()
    expect(close).toBe(1)
  })

  it('visible 缺省时隐藏', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="panel"]')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('点击 ✕ 移除 visible 并派发 oas-close', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    let close = 0
    el.addEventListener('oas-close', () => close++)
    ;(el.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click()
    expect(el.hasAttribute('visible')).toBe(false)
    expect(close).toBe(1)
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

  it('点击取消移除 visible', async () => {
    const el = mount({ visible: '' })
    await Promise.resolve()
    ;(el.shadowRoot!.querySelector('[part="cancel"]') as HTMLElement).click()
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
