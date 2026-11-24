import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { OASPinInput } from './index.js'

function mount(attrs: Record<string, string> = {}): OASPinInput {
  const el = new OASPinInput()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function message(el: OASPinInput): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="message"]')!
}

describe('oas-pin-input info / error-info 语义说明栏', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('缺省：message 槽隐藏', () => {
    const el = mount({ length: '4' })
    expect(message(el).hidden).toBe(true)
  })

  it('info：中性提示渲染（次级色通道）', () => {
    const el = mount({ length: '4', info: '请输入短信验证码' })
    const msg = message(el)
    expect(msg.hidden).toBe(false)
    expect(msg.textContent).toBe('请输入短信验证码')
    expect(msg.hasAttribute('data-error')).toBe(false)
  })

  it('error-info：错误说明渲染并带错误标记；与 info 同时在场时错误优先', () => {
    const el = mount({ length: '4', info: '请输入短信验证码', 'error-info': '验证码错误，请重试' })
    const msg = message(el)
    expect(msg.textContent).toBe('验证码错误，请重试')
    expect(msg.getAttribute('data-error')).toBe('true')
    el.removeAttribute('error-info')
    expect(message(el).textContent).toBe('请输入短信验证码')
    expect(message(el).hasAttribute('data-error')).toBe(false)
  })

  it('a11y：message 经 aria-describedby 关联到各格（错误在场时）', () => {
    const el = mount({ length: '4', 'error-info': '验证码错误' })
    const msgId = message(el).id
    expect(msgId).not.toBe('')
    for (const cell of el.shadowRoot!.querySelectorAll<HTMLInputElement>('input')) {
      expect(cell.getAttribute('aria-describedby')).toBe(msgId)
    }
    el.removeAttribute('error-info')
    for (const cell of el.shadowRoot!.querySelectorAll<HTMLInputElement>('input')) {
      expect(cell.hasAttribute('aria-describedby')).toBe(false)
    }
  })

  it('message 活区：aria-live=polite（动态替换文案读屏可感知）', () => {
    const el = mount({ length: '4', info: '提示' })
    expect(message(el).getAttribute('aria-live')).toBe('polite')
  })
})
