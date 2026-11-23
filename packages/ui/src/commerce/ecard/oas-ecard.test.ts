import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n/registry'
import { en } from '@oas-ui/i18n/en'
import { OASECard } from './index.js'

function mount(attrs: Record<string, string> = {}): OASECard {
  const el = new OASECard()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function q<T extends Element>(el: OASECard, selector: string): T {
  return el.shadowRoot!.querySelector(selector) as T
}

const CARDS = JSON.stringify([
  { id: 'c100', name: '电子礼品卡', value: 100, faceValue: '100 元', price: '95 元', description: '全场通用' },
  { id: 'c500', name: '储值卡', value: 500, faceValue: '500 元', price: '480 元' },
])

describe('OASECard', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('渲染卡面列表，首张默认选中，自定义面额区隐藏', () => {
    const el = mount({ cards: CARDS })
    const cards = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.cards .card')]
    expect(cards.length).toBe(2)
    expect(cards[0]!.querySelector('.card-name')!.textContent).toBe('电子礼品卡')
    expect(cards[0]!.querySelector('.card-price')!.textContent).toBe('售价 95 元')
    expect(cards[0]!.hasAttribute('data-selected')).toBe(true)
    expect(q<HTMLElement>(el, '.custom-amount').hidden).toBe(true)
  })

  it('选择另一张卡派发 oas-change（custom=false）并同步 selected-id', () => {
    const el = mount({ cards: CARDS })
    let detail: { cardId: string; amount: number; custom: boolean } | null = null
    el.addEventListener('oas-change', (e) => (detail = (e as CustomEvent).detail))
    const radios = [...el.shadowRoot!.querySelectorAll<HTMLInputElement>('.cards input[type="radio"]')]
    radios[1]!.click()
    expect(el.getAttribute('selected-id')).toBe('c500')
    expect(detail).toMatchObject({ cardId: 'c500', amount: 500, custom: false })
  })

  it('选择自定义面额显示输入区，合法金额 + 勾选协议后提交', () => {
    const el = mount({ cards: CARDS })
    q<HTMLInputElement>(el, '.custom-card input').click()
    expect(q<HTMLElement>(el, '.custom-amount').hidden).toBe(false)
    const amount = q<HTMLInputElement>(el, '.amount-input')
    amount.value = '300'
    amount.dispatchEvent(new Event('input'))
    q<HTMLInputElement>(el, '.agreement-row input').click()
    expect(el.hasAttribute('agreed')).toBe(true)

    let detail: { amount: number; custom: boolean; cardId: string } | null = null
    el.addEventListener('oas-submit', (e) => (detail = (e as CustomEvent).detail))
    q<HTMLButtonElement>(el, '.confirm').click()
    expect(detail).toMatchObject({ amount: 300, custom: true, cardId: 'custom' })
  })

  it('自定义金额越界派发 oas-invalid 并显示提示', () => {
    const el = mount({ cards: CARDS, 'selected-id': 'custom', 'min-amount': '10', 'max-amount': '1000' })
    const amount = q<HTMLInputElement>(el, '.amount-input')
    amount.value = '5'
    let fields: string[] = []
    el.addEventListener('oas-invalid', (e) => (fields = (e as CustomEvent).detail.fields))
    q<HTMLButtonElement>(el, '.confirm').click()
    expect(fields).toContain('amount')
    expect(q<HTMLElement>(el, '.custom-amount').getAttribute('data-invalid')).toBe('')
    expect(q<HTMLElement>(el, '.custom-group .error').textContent).toBe('请输入 10–1000 之间的整数面额')
  })

  it('未勾选协议派发 oas-invalid（agreement）', () => {
    const el = mount({ cards: CARDS })
    let fields: string[] = []
    el.addEventListener('oas-invalid', (e) => (fields = (e as CustomEvent).detail.fields))
    q<HTMLButtonElement>(el, '.confirm').click()
    expect(fields).toEqual(['agreement'])
    expect(q<HTMLElement>(el, '.agreement-error').textContent).toBe('请先阅读并同意协议')
    expect(q<HTMLInputElement>(el, '.agreement-row input').getAttribute('aria-invalid')).toBe('true')
  })

  it('协议勾选写入 agreed 属性并派发 change', () => {
    const el = mount({ cards: CARDS })
    let detail: { agreed: boolean } | null = null
    el.addEventListener('oas-change', (e) => (detail = (e as CustomEvent).detail))
    q<HTMLInputElement>(el, '.agreement-row input').click()
    expect(el.hasAttribute('agreed')).toBe(true)
    expect(detail!.agreed).toBe(true)
    q<HTMLInputElement>(el, '.agreement-row input').click()
    expect(el.hasAttribute('agreed')).toBe(false)
  })

  it('空列表显示空态并自动回落到自定义面额', () => {
    const el = mount({ cards: '[]' })
    expect(q<HTMLElement>(el, '.empty').hidden).toBe(false)
    expect(q<HTMLElement>(el, '.empty').textContent).toBe('暂无可用卡种')
    expect(q<HTMLElement>(el, '.custom-amount').hidden).toBe(false)
  })

  it('自定义面额货币符号可配置（currency 属性）', () => {
    const el = mount({ cards: CARDS, 'selected-id': 'custom', currency: '$' })
    expect(q<HTMLElement>(el, '.currency').textContent).toBe('$')
    el.setAttribute('currency', '€')
    expect(q<HTMLElement>(el, '.currency').textContent).toBe('€')
  })

  it('disabled 时确认按钮禁用，提交被拦截', () => {
    const el = mount({ cards: CARDS, disabled: '' })
    expect(q<HTMLButtonElement>(el, '.confirm').disabled).toBe(true)
    let fired = false
    el.addEventListener('oas-submit', () => (fired = true))
    q<HTMLButtonElement>(el, '.confirm').click()
    expect(fired).toBe(false)
  })

  it('locale 切换重建卡面文案（售价 / 面值前缀随语言）', async () => {
    const el = mount({ cards: CARDS })
    expect(q<HTMLElement>(el, '.cards .card-price').textContent).toBe('售价 95 元')
    setLocale(en)
    await Promise.resolve()
    expect(q<HTMLElement>(el, '.cards .card-price').textContent).toBe('Price 95 元')
    setLocale('zh-CN')
    await Promise.resolve()
    expect(q<HTMLElement>(el, '.cards .card-price').textContent).toBe('售价 95 元')
  })

  it('非法 cards JSON 不抛异常，按空列表渲染', () => {
    const el = mount({ cards: '{oops' })
    expect(el.shadowRoot!.querySelectorAll('.cards .card').length).toBe(0)
    expect(q<HTMLElement>(el, '.empty').hidden).toBe(false)
  })

  it('property 通道：cards 收数组与 JSON 字符串，均反射 attribute 并渲染', () => {
    const el = mount()
    el.cards = [{ id: 'p1', name: '探针卡', value: 200, faceValue: '200 元' }]
    expect(el.getAttribute('cards')).toBe('[{"id":"p1","name":"探针卡","value":200,"faceValue":"200 元"}]')
    expect(el.cards).toMatchObject([{ id: 'p1', name: '探针卡', value: 200 }])
    expect(q<HTMLElement>(el, '.cards .card-name').textContent).toBe('探针卡')

    el.cards = JSON.stringify([{ id: 'p2', name: '字符串卡', value: 50, faceValue: '50 元' }])
    expect(el.cards).toMatchObject([{ id: 'p2', name: '字符串卡' }])
    expect(el.shadowRoot!.querySelectorAll('.cards .card').length).toBe(1)
    expect(el.shadowRoot!.querySelector('.cards .card-name')!.textContent).toBe('字符串卡')
  })

  it('撞名回归：宿主写入 selectedId / minAmount / maxAmount property 后 update 与提交不崩', () => {
    const el = mount({ cards: CARDS, 'selected-id': 'custom', 'min-amount': '10', 'max-amount': '1000' })
    const host = el as unknown as Record<string, unknown>
    // 修复前这三个名字是原型方法，被 own property 遮蔽后 update()/submit() 内部调用 TypeError
    host['selectedId'] = 'c500'
    host['minAmount'] = 1
    host['maxAmount'] = 99
    expect(() => el.setAttribute('selected-id', 'custom')).not.toThrow()
    q<HTMLInputElement>(el, '.amount-input').value = '5'
    let fields: string[] = []
    el.addEventListener('oas-invalid', (e) => (fields = (e as CustomEvent).detail.fields))
    expect(() => q<HTMLButtonElement>(el, '.confirm').click()).not.toThrow()
    expect(fields).toContain('amount')
    expect(q<HTMLElement>(el, '.custom-group .error').textContent).toBe('请输入 10–1000 之间的整数面额')
  })

  it('readonly semantics: amount input stays focusable/copyable (native readOnly, not disabled), other controls locked', () => {
    const el = mount({ cards: CARDS, readonly: '', 'selected-id': 'custom' })
    const amount = q<HTMLInputElement>(el, '.amount-input')
    expect(amount.disabled).toBe(false)
    expect(amount.readOnly).toBe(true)
    expect(q<HTMLInputElement>(el, '[part="agreement-input"]').disabled).toBe(true)
    expect(q<HTMLButtonElement>(el, '.confirm').disabled).toBe(true)
    // 移除 readonly 恢复可编辑
    el.removeAttribute('readonly')
    expect(amount.readOnly).toBe(false)
    // disabled 仍真正禁用输入框
    el.setAttribute('disabled', '')
    expect(amount.disabled).toBe(true)
  })
})
