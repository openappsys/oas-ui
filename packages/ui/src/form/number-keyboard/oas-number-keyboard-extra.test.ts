import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASNumberKeyboard } from './index.js'

function mount(attrs: Record<string, string> = {}): OASNumberKeyboard {
  const el = new OASNumberKeyboard()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function keys(el: OASNumberKeyboard): HTMLButtonElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="key"]')]
}

function pad(el: OASNumberKeyboard): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="pad"]')!
}

describe('oas-number-keyboard extra-key 附加键', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('extra-key="X"：附加键挂数字区右侧（0 键收窄），点击追加并派发 oas-input', () => {
    const el = mount({ 'extra-key': 'X' })
    const extra = keys(el).filter((k) => k.dataset.extra)
    expect(extra).toHaveLength(1)
    expect(extra[0]!.textContent).toBe('X')
    expect(extra[0]!.dataset.key).toBe('X')
    // 0 键收窄（span 2 列），附加键占第 3 列：断言 .key-zero 就是 0 键，且附加键 DOM 排在 0 键之后
    expect(pad(el).getAttribute('data-extra-count')).toBe('1')
    const zero = el.shadowRoot!.querySelector<HTMLButtonElement>('.key-zero')
    expect(zero?.dataset.key).toBe('0')
    const order = [...pad(el).children]
    expect(order.indexOf(extra[0]!)).toBeGreaterThan(order.indexOf(zero!))
    let detail: { value?: string; key?: string } | null = null
    el.addEventListener('oas-input', (e) => (detail = (e as CustomEvent).detail))
    extra[0]!.click()
    expect(detail).toEqual({ value: 'X', key: 'X' })
    expect(el.getAttribute('value')).toBe('X')
  })

  it('extra-key JSON 数组：多个附加键依次排布', () => {
    const el = mount({ 'extra-key': '["X","港"]' })
    const extra = keys(el).filter((k) => k.dataset.extra)
    expect(extra.map((k) => k.textContent)).toEqual(['X', '港'])
    expect(pad(el).getAttribute('data-extra-count')).toBe('2')
  })

  it('extra-key 缺省：布局与现状一致（无附加键、0 键横跨三列）', () => {
    const el = mount()
    expect(keys(el).filter((k) => k.dataset.extra)).toHaveLength(0)
    expect(pad(el).hasAttribute('data-extra-count')).toBe(false)
  })

  it('物理键盘：附加字符可输入（数字布局），未声明的字母仍被拒', () => {
    const el = mount({ 'extra-key': 'X' })
    const emit = vi.fn()
    el.addEventListener('oas-input', emit)
    const kb = el.shadowRoot!.querySelector('[part="keyboard"]')!
    kb.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }))
    expect(emit).toHaveBeenCalledTimes(1)
    kb.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    expect(emit).toHaveBeenCalledTimes(1)
  })

  it('plate 布局：附加键同样生效且字符集并入物理键盘白名单', () => {
    const el = mount({ layout: 'plate', 'extra-key': 'X' })
    const extra = keys(el).filter((k) => k.dataset.extra)
    expect(extra).toHaveLength(1)
    const emit = vi.fn()
    el.addEventListener('oas-input', emit)
    el.shadowRoot!.querySelector('[part="keyboard"]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'x', bubbles: true }),
    )
    expect(emit).toHaveBeenCalledTimes(1)
  })

  it('超过 2 个附加键：截断到 2 个并 devWarn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ 'extra-key': '["A","B","C"]' })
      expect(
        keys(el)
          .filter((k) => k.dataset.extra)
          .map((k) => k.textContent),
      ).toEqual(['A', 'B'])
      expect(warn.mock.calls.some((c) => String(c[0]).includes('extra-key'))).toBe(true)
      // 同值重复 update 不再告警
      el.setAttribute('value', 'A')
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('extra-key'))).toHaveLength(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('非法 JSON：devWarn 并忽略（键盘照常工作）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ 'extra-key': '[bad' })
      expect(keys(el).filter((k) => k.dataset.extra)).toHaveLength(0)
      const digit = keys(el).find((k) => k.dataset.key === '1')!
      let fired = 0
      el.addEventListener('oas-input', () => fired++)
      digit.click()
      expect(fired).toBe(1)
    } finally {
      warn.mockRestore()
    }
  })
})
