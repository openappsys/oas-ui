import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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
  { code: 'a', amount: 30, threshold: 199 },
  { code: 'b', amount: 10, threshold: 0 },
  { code: 'x', amount: 20, status: 'expired' },
  { code: 'y', amount: 50, status: 'unavailable', reason: '未满门槛' },
])

describe('oas-coupon 分组 / 出口 / 多选', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('分组标题：可用 / 不可用两组各带标题；缺省不显示计数', () => {
    const el = mount({ list: LIST })
    el.openOverlay()
    const heads = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="group-head"]')]
    expect(heads).toHaveLength(2)
    expect(heads[0]!.querySelector<HTMLElement>('.group-title')!.textContent).toBe('可用优惠券')
    expect(heads[1]!.querySelector<HTMLElement>('.group-title')!.textContent).toBe('不可用优惠券')
    expect(heads[0]!.querySelector('.group-count')).toBeNull()
    // 选项按组分桶：可用在前、不可用在后
    const bodies = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="group-body"]')]
    expect(bodies[0]!.querySelectorAll('[part="option"]')).toHaveLength(2)
    expect(bodies[1]!.querySelectorAll('[part="option"]')).toHaveLength(2)
  })

  it('show-count：分组标题带计数胶囊', () => {
    const el = mount({ list: LIST, 'show-count': '' })
    el.openOverlay()
    const heads = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="group-head"]')]
    expect(heads[0]!.querySelector<HTMLElement>('.group-count')!.textContent).toBe('2')
    expect(heads[1]!.querySelector<HTMLElement>('.group-count')!.textContent).toBe('2')
  })

  it('单一分组：全部可用时只渲染可用组标题', () => {
    const el = mount({ list: JSON.stringify([{ code: 'a', amount: 5 }]) })
    el.openOverlay()
    const heads = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="group-head"]')]
    expect(heads).toHaveLength(1)
    expect(heads[0]!.querySelector<HTMLElement>('.group-title')!.textContent).toBe('可用优惠券')
  })

  it('「不使用优惠券」出口：点击派发 oas-clear + oas-select 空选并关闭弹层', () => {
    const el = mount({ list: LIST })
    el.openOverlay()
    const events: string[] = []
    let selectDetail: { code?: string; coupon?: CouponData | null } | null = null
    el.addEventListener('oas-clear', () => events.push('clear'))
    el.addEventListener('oas-select', (e) => {
      events.push('select')
      selectDetail = (e as CustomEvent).detail
    })
    part(el, 'clear-entry')!.click()
    expect(events).toEqual(['clear', 'select'])
    expect(selectDetail!.code).toBe('')
    expect(selectDetail!.coupon).toBeNull()
    expect(el.hasAttribute('open')).toBe(false)
    // 触发按钮回到未选文案
    expect(part(el, 'trigger-text')!.textContent).toBe('选择优惠券')
  })

  it('multiple：选项为 checkbox，切换派发数组 detail 且不自动关闭', () => {
    const el = mount({ list: LIST, multiple: '' })
    el.openOverlay()
    const inputs = [...el.shadowRoot!.querySelectorAll<HTMLInputElement>('[part="option-input"]')]
    expect(inputs.filter((i) => i.type === 'checkbox')).toHaveLength(4)
    const details: Array<{ codes?: string[]; coupons?: CouponData[] }> = []
    el.addEventListener('oas-select', (e) => details.push((e as CustomEvent).detail))
    inputs[0]!.click()
    inputs[1]!.click()
    expect(details).toHaveLength(2)
    expect(details[1]!.codes).toEqual(['a', 'b'])
    expect(details[1]!.coupons!.map((c) => c.code)).toEqual(['a', 'b'])
    // 不自动关闭
    expect(el.hasAttribute('open')).toBe(true)
    // 再点取消勾选
    inputs[0]!.click()
    expect(details[2]!.codes).toEqual(['b'])
    // 触发按钮显示已选数
    expect(part(el, 'trigger-text')!.textContent).toBe('已选 1 张')
    // 关闭再开，勾选保留
    el.closeOverlay()
    el.openOverlay()
    const restored = [...el.shadowRoot!.querySelectorAll<HTMLInputElement>('[part="option-input"]')]
    expect(restored[1]!.checked).toBe(true)
  })

  it('multiple + clear-entry：空选 detail 为空数组', () => {
    const el = mount({ list: LIST, multiple: '' })
    el.openOverlay()
    let selectDetail: { codes?: string[]; coupons?: unknown[] } | null = null
    let clears = 0
    el.addEventListener('oas-clear', () => clears++)
    el.addEventListener('oas-select', (e) => (selectDetail = (e as CustomEvent).detail))
    part(el, 'clear-entry')!.click()
    expect(clears).toBe(1)
    expect(selectDetail!.codes).toEqual([])
    expect(selectDetail!.coupons).toEqual([])
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('clearSelection() 在 multiple 下清空全部勾选（静默）', () => {
    const el = mount({ list: LIST, multiple: '' })
    el.openOverlay()
    const inputs = [...el.shadowRoot!.querySelectorAll<HTMLInputElement>('[part="option-input"]')]
    inputs[0]!.click()
    inputs[1]!.click()
    el.clearSelection()
    expect(part(el, 'trigger-text')!.textContent).toBe('选择优惠券')
    el.openOverlay()
    const restored = [...el.shadowRoot!.querySelectorAll<HTMLInputElement>('[part="option-input"]')]
    expect(restored.every((i) => !i.checked)).toBe(true)
  })

  it('缺省（无 multiple）单选通道不变：radio + 选中即关', () => {
    const el = mount({ list: LIST })
    el.openOverlay()
    const inputs = [...el.shadowRoot!.querySelectorAll<HTMLInputElement>('[part="option-input"]')]
    expect(inputs.every((i) => i.type === 'radio')).toBe(true)
    inputs[0]!.click()
    expect(el.hasAttribute('open')).toBe(false)
    expect(part(el, 'trigger-text')!.textContent).toBe('¥30')
  })
})
