import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASCoupon, type CouponData } from './index.js'

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

  it('受控 open：宿主写属性直接开（不派发事件），closeOverlay() 关闭并派发', () => {
    const el = mount({ list: LIST })
    const events: Array<{ open?: boolean }> = []
    el.addEventListener('oas-open-change', (e) => events.push((e as CustomEvent).detail))
    el.setAttribute('open', '')
    expect(part(el, 'overlay')!.hidden).toBe(false)
    expect(events).toHaveLength(0)
    el.closeOverlay()
    expect(el.hasAttribute('open')).toBe(false)
    expect(part(el, 'overlay')!.hidden).toBe(true)
    expect(events).toEqual([{ open: false }])
    el.openOverlay()
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('property 通道：open 为 get+set 访问器，写布尔即反射属性且静默', () => {
    const el = mount({ list: LIST })
    const events: unknown[] = []
    el.addEventListener('oas-open-change', (e) => events.push((e as CustomEvent).detail))
    el.open = true
    expect(el.hasAttribute('open')).toBe(true)
    expect(el.open).toBe(true)
    expect(part(el, 'overlay')!.hidden).toBe(false)
    el.open = false
    expect(el.hasAttribute('open')).toBe(false)
    expect(el.open).toBe(false)
    // 框架把静态布尔属性写成 property 时到达的是空串——presence 语义必须视为打开
    el.open = ''
    expect(el.hasAttribute('open')).toBe(true)
    expect(events).toHaveLength(0)
  })

  it('property 通道：list 为 get+set 访问器，接受数组与 JSON 字符串', () => {
    const el = mount()
    el.list = JSON.parse(LIST) as CouponData[]
    expect(el.getAttribute('list')).toBe(LIST)
    expect(el.list.map((c) => c.code)).toEqual(['a', 'b', 'c'])
    ;(part(el, 'trigger') as HTMLButtonElement).click()
    expect(el.shadowRoot!.querySelectorAll('input[type="radio"]')).toHaveLength(3)
    el.list = '[]'
    expect(el.list).toEqual([])
    expect(part(el, 'empty')!.hidden).toBe(false)
  })

  it('clearSelection：清空已选券（静默，不派发事件）', () => {
    const el = mount({ list: LIST })
    ;(part(el, 'trigger') as HTMLButtonElement).click()
    let fired = 0
    el.addEventListener('oas-select', () => {
      fired++
    })
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="radio"]')!
    input.checked = true
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(fired).toBe(1)
    expect(part(el, 'trigger')!.textContent).toContain('¥30')
    el.clearSelection()
    expect(part(el, 'trigger')!.textContent).toContain('选择优惠券')
    expect(fired).toBe(1)
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

  it('浮层层级走 token 通道（config-provider 的 --oas-z-index-base 可整体前移）', () => {
    const el = mount({ list: LIST })
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toContain('calc(var(--oas-z-index-base, 0) + var(--oas-z-modal, 1050))')
    expect(css).not.toMatch(/z-index:\s*\d{3,}/)
  })
})

describe('oas-coupon 卡片空态与可读性', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('卡片模式缺少 amount：不渲染券面且只告警一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount()
      expect(part(el, 'coupon')).toBeNull()
      const first = warn.mock.calls.filter((c) => String(c[0]).includes('[oas-coupon]')).length
      expect(first).toBe(1)
      el.setAttribute('amount', '30')
      el.removeAttribute('amount')
      const after = warn.mock.calls.filter((c) => String(c[0]).includes('[oas-coupon]')).length
      expect(after).toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('未达门槛态：面额走加深档 warning-text（浅色可读、暗色由 deep-mix 提亮）', () => {
    const el = mount({ amount: '50', threshold: '299', status: 'unavailable', reason: '未满 299 元可用' })
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toMatch(
      /\.coupon\[data-status='unavailable'\]\s*\{[^}]*--coupon-accent:\s*color-mix\(in srgb,\s*var\(--oas-color-warning-text\)/,
    )
  })

  it('弱化底 / 选中底上的次级文字走 secondary-strong 安全档（secondary 在弱化底仅 4.39）', () => {
    const el = mount({ amount: '10' })
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    // 过期 / 已使用：整卡继承色走安全档（覆盖「无门槛」等继承文字）
    expect(css).toMatch(
      /\.coupon\[data-status='expired'\],\s*\.coupon\[data-status='used'\]\s*\{[^}]*color:\s*var\(--oas-color-text-secondary-strong\)/,
    )
    // 有效期小字可能落在选中态着色面上
    expect(css).toMatch(/\.validity\s*\{[^}]*color:\s*var\(--oas-color-text-secondary-strong\)/)
    // 过期 / 已使用卡右侧状态文字
    expect(css).toMatch(
      /\.coupon\[data-status='expired'\]\s+\.state,\s*\.coupon\[data-status='used'\]\s+\.state\s*\{[^}]*color:\s*var\(--oas-color-text-secondary-strong\)/,
    )
  })
})
