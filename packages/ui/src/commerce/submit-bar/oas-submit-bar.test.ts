import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { OASSubmitBar } from './index.js'

function mount(attrs: Record<string, string> = {}, html = ''): OASSubmitBar {
  const el = new OASSubmitBar()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

function part(el: OASSubmitBar, name: string): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)
}

describe('oas-submit-bar', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('合计金额：内嵌价格组件按 currency/locale 格式化', () => {
    const el = mount({ total: '1299', currency: 'CNY', locale: 'zh-CN' })
    const price = el.shadowRoot!.querySelector('oas-price')!
    expect(price.getAttribute('value')).toBe('1299')
    expect(price.shadowRoot!.querySelector('[part="amount"]')!.textContent).toBe('1,299')
    expect(price.shadowRoot!.querySelector('[part="decimal"]')!.textContent).toBe('.00')
  })

  it('label：缺省走 i18n「合计」，属性可覆盖', () => {
    const el = mount({ total: '10' })
    expect(part(el, 'label')!.textContent).toBe('合计')
    el.setAttribute('label', '应付')
    expect(part(el, 'label')!.textContent).toBe('应付')
  })

  it('action-text：渲染主按钮文本；缺省时按钮不出现（纯展示合计）', () => {
    const el = mount({ total: '10', 'action-text': '提交订单' })
    const btn = part(el, 'action')!
    expect(btn.hidden).toBe(false)
    expect(btn.textContent).toContain('提交订单')
    el.removeAttribute('action-text')
    expect(part(el, 'action')!.hidden).toBe(true)
  })

  it('点击主按钮派发 oas-submit（detail 携带 total / currency）', () => {
    const el = mount({ total: '99.5', currency: 'USD', locale: 'en-US', 'action-text': 'Pay' })
    let detail: { total?: number; currency?: string } | null = null
    el.addEventListener('oas-submit', (e) => {
      detail = (e as CustomEvent).detail
    })
    part(el, 'action')!.click()
    expect(detail).toEqual({ total: 99.5, currency: 'USD' })
  })

  it('disabled：按钮禁用且点击不派发事件', () => {
    const el = mount({ total: '10', 'action-text': '结算', disabled: '' })
    let fired = 0
    el.addEventListener('oas-submit', () => {
      fired++
    })
    const btn = part(el, 'action') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    btn.click()
    expect(fired).toBe(0)
  })

  it('loading：按钮禁用、aria-busy、spinner 可见且点击不派发', () => {
    const el = mount({ total: '10', 'action-text': '结算', loading: '' })
    let fired = 0
    el.addEventListener('oas-submit', () => {
      fired++
    })
    const btn = part(el, 'action') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.getAttribute('aria-busy')).toBe('true')
    expect(part(el, 'spinner')!.hidden).toBe(false)
    btn.click()
    expect(fired).toBe(0)
    el.removeAttribute('loading')
    expect(btn.disabled).toBe(false)
    expect(part(el, 'spinner')!.hidden).toBe(true)
  })

  it('danger：主按钮标记危险态', () => {
    const el = mount({ total: '10', 'action-text': '删除', danger: '' })
    expect(part(el, 'action')!.getAttribute('data-danger')).toBe('true')
  })

  it('默认插槽承载扩展内容（如勾选协议 / 备注）', () => {
    const el = mount({ total: '10' }, '<label><input type="checkbox" id="agree"> 同意协议</label>')
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('[part="extra"] slot')!
    expect(slot.assignedElements()).toHaveLength(1)
  })

  it('金额变更随属性实时同步（受控通道）', () => {
    const el = mount({ total: '10', locale: 'zh-CN' })
    el.setAttribute('total', '2500')
    const price = el.shadowRoot!.querySelector('oas-price')!
    expect(price.getAttribute('value')).toBe('2500')
    expect(price.shadowRoot!.querySelector('[part="amount"]')!.textContent).toBe('2,500')
  })

  it('样式只走 token 且布局为逻辑方向（RTL 安全）', () => {
    const el = mount({ total: '10' })
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toContain('var(--oas-color-')
    expect(css).not.toMatch(/margin-(left|right)/)
    expect(css).not.toMatch(/padding-(left|right)/)
  })
})
