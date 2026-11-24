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

function inputs(el: OASCoupon): HTMLInputElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLInputElement>('[part="option-input"]')]
}

/** code → 勾选框（选项按 list 顺序渲染，可用组在前；这里四张券全部可用） */
function inputOf(el: OASCoupon, code: string): HTMLInputElement {
  const found = inputs(el).find((input) => input.value === code)
  if (!found) throw new Error(`找不到券 ${code} 的勾选框`)
  return found
}

const LIST = JSON.stringify([
  { code: 'a', amount: 30, exclusiveGroup: 'store' },
  { code: 'b', amount: 10, exclusiveGroup: 'store' },
  { code: 'c', amount: 20, exclusiveGroup: 'platform' },
  { code: 'd', amount: 5 },
])

describe('oas-coupon 多选叠加规则（max-select / 互斥组 / 组合校验）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('max-select 到达上限后再勾选：选择不生效、勾选态回滚、派发 oas-select-invalid', () => {
    const el = mount({ list: LIST, multiple: '', 'max-select': '2' })
    el.openOverlay()
    const invalid: Array<Record<string, unknown>> = []
    const selects: Array<{ codes?: string[] }> = []
    el.addEventListener('oas-select-invalid', (e) => invalid.push((e as CustomEvent).detail as Record<string, unknown>))
    el.addEventListener('oas-select', (e) => selects.push((e as CustomEvent).detail))

    inputOf(el, 'a').click()
    inputOf(el, 'd').click()
    expect(selects[1]!.codes).toEqual(['a', 'd'])

    inputOf(el, 'c').click()
    expect(invalid).toHaveLength(1)
    expect(invalid[0]).toMatchObject({ reason: 'max-select', limit: 2, code: 'c' })
    expect(invalid[0]!.codes).toEqual(['a', 'd'])
    expect((invalid[0]!.coupons as CouponData[]).map((coupon) => coupon.code)).toEqual(['a', 'd'])
    // 第三张未被选中，且已选集合不变（无第三次 oas-select）
    expect(inputOf(el, 'c').checked).toBe(false)
    expect(selects).toHaveLength(2)
    expect(part(el, 'trigger-text')!.textContent).toBe('已选 2/2 张')
  })

  it('取消勾选释放名额后可再选（上限只约束「已选张数」）', () => {
    const el = mount({ list: LIST, multiple: '', 'max-select': '2' })
    el.openOverlay()
    inputOf(el, 'a').click()
    inputOf(el, 'd').click()
    inputOf(el, 'a').click()
    const invalid: unknown[] = []
    el.addEventListener('oas-select-invalid', (e) => invalid.push(e))
    inputOf(el, 'c').click()
    expect(invalid).toEqual([])
    expect(inputOf(el, 'c').checked).toBe(true)
    expect(part(el, 'trigger-text')!.textContent).toBe('已选 2/2 张')
  })

  it('互斥组：选中同组另一张自动取消前一张，removed 随 oas-select 回传', () => {
    const el = mount({ list: LIST, multiple: '' })
    el.openOverlay()
    const details: Array<{ codes: string[]; removed?: string[] }> = []
    el.addEventListener('oas-select', (e) => details.push((e as CustomEvent).detail))
    inputOf(el, 'a').click()
    expect(details[0]!.removed).toBeUndefined()

    inputOf(el, 'b').click()
    expect(details[1]!.codes).toEqual(['b'])
    expect(details[1]!.removed).toEqual(['a'])
    expect(inputOf(el, 'a').checked).toBe(false)
    expect(inputOf(el, 'b').checked).toBe(true)
  })

  it('互斥组只约束同组：不同组与无组券可并存', () => {
    const el = mount({ list: LIST, multiple: '' })
    el.openOverlay()
    let last: { codes: string[]; removed?: string[] } | null = null
    el.addEventListener('oas-select', (e) => (last = (e as CustomEvent).detail))
    inputOf(el, 'a').click()
    inputOf(el, 'c').click()
    inputOf(el, 'd').click()
    expect(last!.codes).toEqual(['a', 'c', 'd'])
    expect(last!.removed).toBeUndefined()
    expect(part(el, 'trigger-text')!.textContent).toBe('已选 3 张')
  })

  it('互斥与上限叠加：换选不占新名额（先取消后加入），不触发 oas-select-invalid', () => {
    const el = mount({ list: LIST, multiple: '', 'max-select': '2' })
    el.openOverlay()
    const invalid: unknown[] = []
    el.addEventListener('oas-select-invalid', (e) => invalid.push(e))
    inputOf(el, 'a').click()
    inputOf(el, 'c').click()
    // 已满 2 张：换选同组另一张 → 自动取消 a 后加入 b，仍 2 张
    inputOf(el, 'b').click()
    expect(invalid).toEqual([])
    expect(inputOf(el, 'b').checked).toBe(true)
    expect(part(el, 'trigger-text')!.textContent).toBe('已选 2/2 张')
  })

  it('单选模式忽略 max-select：选中即生效并关闭，无 oas-select-invalid', () => {
    const el = mount({ list: LIST, 'max-select': '1' })
    el.openOverlay()
    const invalid: unknown[] = []
    el.addEventListener('oas-select-invalid', (e) => invalid.push(e))
    inputOf(el, 'a').click()
    expect(invalid).toEqual([])
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('非法 max-select（非数值 / 0 / 负值）一次性告警并按不限处理', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const flat = JSON.stringify([
      { code: 'p', amount: 1 },
      { code: 'q', amount: 2 },
      { code: 'r', amount: 3 },
    ])
    const el = mount({ list: flat, multiple: '', 'max-select': 'abc' })
    el.openOverlay()
    const invalid: unknown[] = []
    el.addEventListener('oas-select-invalid', (e) => invalid.push(e))
    for (const code of ['p', 'q', 'r']) inputOf(el, code).click()
    expect(invalid).toEqual([])
    expect(part(el, 'trigger-text')!.textContent).toBe('已选 3 张')
    expect(warn.mock.calls.map((call) => String(call[0])).join('\n')).toContain('max-select')
  })
})
