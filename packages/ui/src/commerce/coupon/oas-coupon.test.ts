import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { OASCoupon } from './index.js'

function mount(attrs: Record<string, string> = {}): OASCoupon {
  const el = new OASCoupon()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function part(el: OASCoupon, name: string): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)
}

const LIST = JSON.stringify([
  { code: 'a', amount: 30, threshold: 199, start: '2026-01-01', end: '2026-02-28' },
  { code: 'b', amount: 10, threshold: 0, status: 'expired' },
  { code: 'c', amount: 50, threshold: 299, status: 'unavailable', reason: '未满 299 元可用' },
])

describe('oas-coupon 券面卡片', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('面额 + 使用门槛：按币种格式化面额并渲染「满 X 可用」', () => {
    const el = mount({ amount: '30', threshold: '199', locale: 'zh-CN' })
    expect(part(el, 'amount')!.textContent).toBe('¥30')
    expect(part(el, 'condition')!.textContent).toBe('满 ¥199 可用')
    expect(part(el, 'coupon')!.getAttribute('data-status')).toBe('available')
  })

  it('门槛为 0 或缺省：渲染「无门槛」', () => {
    const el = mount({ amount: '10', threshold: '0' })
    expect(part(el, 'condition')!.textContent).toBe('无门槛')
  })

  it('有效期：start/end 按 locale 格式化并带 ~ 分隔', () => {
    const el = mount({ amount: '10', start: '2026-01-01', end: '2026-02-28', locale: 'zh-CN' })
    const text = part(el, 'validity')!.textContent ?? ''
    expect(text).toContain('2026')
    expect(text).toContain('~')
    // validity 文本属性覆盖日期区间（宿主完全控制的展示）
    el.setAttribute('validity', '长期有效')
    expect(part(el, 'validity')!.textContent).toBe('长期有效')
  })

  it('状态：expired / used 渲染 i18n 文案并带语义标记', () => {
    const el = mount({ amount: '10', status: 'expired' })
    expect(part(el, 'coupon')!.getAttribute('data-status')).toBe('expired')
    expect(part(el, 'state')!.textContent).toBe('已过期')
    el.setAttribute('status', 'used')
    expect(part(el, 'state')!.textContent).toBe('已使用')
  })

  it('不可用态：展示宿主给定的 reason（未达门槛等）', () => {
    const el = mount({ amount: '50', threshold: '299', status: 'unavailable', reason: '未满 299 元可用' })
    expect(part(el, 'coupon')!.getAttribute('data-status')).toBe('unavailable')
    expect(part(el, 'state')!.textContent).toBe('未满 299 元可用')
  })

  it('selected：标记选中态供外层组合使用', () => {
    const el = mount({ amount: '10', selected: '' })
    expect(part(el, 'coupon')!.getAttribute('data-selected')).toBe('true')
  })
})

describe('oas-coupon 选择弹层（list 模式）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('list 模式：渲染触发按钮，aria-haspopup/aria-expanded 同步', () => {
    const el = mount({ list: LIST })
    const trigger = part(el, 'trigger') as HTMLButtonElement
    expect(trigger.hidden).toBe(false)
    expect(trigger.textContent).toContain('选择优惠券')
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('点击触发按钮打开弹层：open 属性、aria-expanded、oas-open-change', () => {
    const el = mount({ list: LIST })
    const events: Array<{ open?: boolean }> = []
    el.addEventListener('oas-open-change', (e) => events.push((e as CustomEvent).detail))
    ;(part(el, 'trigger') as HTMLButtonElement).click()
    expect(el.hasAttribute('open')).toBe(true)
    expect(part(el, 'overlay')!.hidden).toBe(false)
    expect(part(el, 'trigger')!.getAttribute('aria-expanded')).toBe('true')
    expect(events).toEqual([{ open: true }])
  })

  it('受控 open：宿主写属性直接开（不派发事件），close() 关闭并派发', () => {
    const el = mount({ list: LIST })
    const events: Array<{ open?: boolean }> = []
    el.addEventListener('oas-open-change', (e) => events.push((e as CustomEvent).detail))
    el.setAttribute('open', '')
    expect(part(el, 'overlay')!.hidden).toBe(false)
    expect(events).toHaveLength(0)
    el.close()
    expect(el.hasAttribute('open')).toBe(false)
    expect(part(el, 'overlay')!.hidden).toBe(true)
    expect(events).toEqual([{ open: false }])
    el.open()
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('列表项：可用项可选中，过期/未达门槛项禁用', () => {
    const el = mount({ list: LIST })
    ;(part(el, 'trigger') as HTMLButtonElement).click()
    const inputs = [...el.shadowRoot!.querySelectorAll<HTMLInputElement>('input[type="radio"]')]
    expect(inputs).toHaveLength(3)
    expect(inputs[0]!.disabled).toBe(false)
    expect(inputs[1]!.disabled).toBe(true)
    expect(inputs[2]!.disabled).toBe(true)
    const options = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="option"]')]
    expect(options[1]!.getAttribute('data-status')).toBe('expired')
    expect(options[2]!.textContent).toContain('未满 299 元可用')
  })

  it('选择可用券：派发 oas-select（detail 携带 code / coupon）并关闭弹层', () => {
    const el = mount({ list: LIST })
    ;(part(el, 'trigger') as HTMLButtonElement).click()
    let detail: { code?: string; coupon?: { amount?: number } } | null = null
    el.addEventListener('oas-select', (e) => {
      detail = (e as CustomEvent).detail
    })
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="radio"]')!
    input.checked = true
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(detail).toEqual({ code: 'a', coupon: expect.objectContaining({ amount: 30 }) })
    expect(el.hasAttribute('open')).toBe(false)
    expect(part(el, 'trigger')!.textContent).toContain('¥30')
  })

  it('空列表：渲染 i18n 空态文案', () => {
    const el = mount({ list: '[]', open: '' })
    expect(part(el, 'empty')!.hidden).toBe(false)
    expect(part(el, 'empty')!.textContent).toBe('暂无可用优惠券')
  })

  it('Esc 关闭弹层并把焦点还给触发按钮', () => {
    const el = mount({ list: LIST })
    const trigger = part(el, 'trigger') as HTMLButtonElement
    trigger.focus()
    trigger.click()
    expect(el.hasAttribute('open')).toBe(true)
    const panel = part(el, 'panel')!
    expect(part(el, 'panel')!.contains(el.shadowRoot!.activeElement)).toBe(true)
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(el.hasAttribute('open')).toBe(false)
    expect(el.shadowRoot!.activeElement).toBe(trigger)
  })

  it('点击遮罩关闭', () => {
    const el = mount({ list: LIST, open: '' })
    ;(part(el, 'backdrop') as HTMLElement).click()
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('a11y：panel 为模态对话框，关闭按钮有可读名称', () => {
    const el = mount({ list: LIST, open: '' })
    const panel = part(el, 'panel')!
    expect(panel.getAttribute('role')).toBe('dialog')
    expect(panel.getAttribute('aria-modal')).toBe('true')
    expect(panel.getAttribute('aria-labelledby')).toBe(part(el, 'title')!.id)
    expect(part(el, 'close')!.getAttribute('aria-label')).toBe('关闭')
  })

  it('样式只走 token 且布局为逻辑方向（RTL 安全）', () => {
    const el = mount({ list: LIST })
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toContain('var(--oas-color-')
    expect(css).not.toMatch(/margin-(left|right)/)
    expect(css).not.toMatch(/padding-(left|right)/)
  })
})
