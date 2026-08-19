import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASVisuallyHidden } from './index.js'

function mountHidden(slot = '仅屏幕阅读器可见的说明文字'): OASVisuallyHidden {
  const el = new OASVisuallyHidden()
  el.textContent = slot
  document.body.appendChild(el)
  return el
}

describe('OASVisuallyHidden', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('slot 内容原样透出（DOM 可读、可被复制）', () => {
    const el = mountHidden()
    expect(el.textContent).toContain('仅屏幕阅读器可见的说明文字')
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
  })

  it('shadow 仅含样式与 slot，无任何交互元素', () => {
    const el = mountHidden()
    expect(el.shadowRoot!.children.length).toBe(2)
    expect(el.shadowRoot!.querySelector('style')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
    expect(el.shadowRoot!.querySelectorAll('button, input, a, [tabindex]').length).toBe(0)
  })

  it('采用经典 clip 视觉隐藏方案', () => {
    const el = mountHidden()
    const style = el.shadowRoot!.querySelector('style')!.textContent
    expect(style).toMatch(/clip-path/)
    expect(style).toMatch(/clip:\s*rect/)
    expect(style).toMatch(/1px/)
    expect(style).toMatch(/absolute/)
  })

  it('无任何 oas 事件派发', () => {
    const el = mountHidden()
    let fired = false
    el.addEventListener('oas-change', () => (fired = true))
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(fired).toBe(false)
  })

  describe('focusable 焦点显形（skip-link 场景）', () => {
    it('focusable 进入 observedAttributes', () => {
      expect(OASVisuallyHidden.observedAttributes).toContain('focusable')
    })

    it('CSS：focusable 时 :focus-within 显形规则存在（解除 clip 隐藏）', () => {
      const el = mountHidden()
      el.setAttribute('focusable', '')
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/:host\(\[focusable\]:focus-within\)\s*{/)
      expect(css).toMatch(/clip:\s*none/)
      expect(css).toMatch(/position:\s*static/)
    })

    it('非 focusable 时无显形规则路径（保持纯隐藏）', () => {
      const el = mountHidden()
      // 不设 focusable：focus-within 显形规则不应被命中（CSS 里是 [focusable] 条件选择器）
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/:host\(\[focusable\]:focus-within\)/)
      expect(el.hasAttribute('focusable')).toBe(false)
    })
  })
})
