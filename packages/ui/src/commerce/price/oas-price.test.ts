import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { OASPrice } from './index.js'

function mount(attrs: Record<string, string> = {}): OASPrice {
  const el = new OASPrice()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function part(el: OASPrice, name: string): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)
}

function allParts(el: OASPrice, name: string): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>(`[part="${name}"]`)]
}

describe('oas-price', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('单值：币种符号 + 千分位 + 两位小数（默认 CNY / zh-CN）', () => {
    const el = mount({ value: '1299', locale: 'zh-CN' })
    expect(part(el, 'symbol')!.textContent).toBe('¥')
    expect(part(el, 'amount')!.textContent).toBe('1,299')
    expect(part(el, 'decimal')!.textContent).toBe('.00')
    expect(el.shadowRoot!.querySelector('.root')!.textContent?.trim()).toBe('¥1,299.00')
  })

  it('precision="0"：不渲染小数位', () => {
    const el = mount({ value: '1299.6', locale: 'zh-CN', precision: '0' })
    expect(part(el, 'amount')!.textContent).toBe('1,300')
    expect(part(el, 'decimal')).toBeNull()
  })

  it('币种与 locale 通道：en-US + USD 渲染 $ 符号', () => {
    const el = mount({ value: '1299', currency: 'USD', locale: 'en-US' })
    expect(part(el, 'symbol')!.textContent).toBe('$')
    expect(part(el, 'amount')!.textContent).toBe('1,299')
  })

  it('小数点后符号位（de-DE）按 Intl 部件真实顺序渲染', () => {
    // de-DE：1.299,00 €（符号在数字之后）——渲染顺序必须跟随 Intl parts，不能固定「符号在前」
    const el = mount({ value: '1299', currency: 'EUR', locale: 'de-DE' })
    const root = part(el, 'price')!
    const first = root.firstElementChild
    expect(first?.getAttribute('part')).toBe('amount')
    expect(root.lastElementChild?.getAttribute('part')).toBe('symbol')
  })

  it('划线价：original 渲染为 <s> 并带「原价」可读前缀', () => {
    const el = mount({ value: '99', original: '199', locale: 'zh-CN' })
    const original = part(el, 'original')!
    expect(original.tagName.toLowerCase()).toBe('s')
    expect(original.textContent).toContain('199.00')
    expect(original.textContent).toContain('原价')
  })

  it('区间价：min + max 渲染两段金额与分隔符', () => {
    const el = mount({ min: '19.9', max: '29.9', locale: 'zh-CN' })
    expect(allParts(el, 'amount').map((n) => n.textContent)).toEqual(['19', '29'])
    expect(allParts(el, 'decimal').map((n) => n.textContent)).toEqual(['.90', '.90'])
    expect(el.shadowRoot!.querySelector('.root')!.textContent).toContain('~')
  })

  it('value 优先于区间：同时给 value 与 min/max 时只渲染单值', () => {
    const el = mount({ value: '10', min: '19.9', max: '29.9', locale: 'zh-CN' })
    expect(allParts(el, 'amount')).toHaveLength(1)
  })

  it('趋势：up 渲染上涨箭头 + 正号百分比 + 语义色标记', () => {
    const el = mount({ value: '10', trend: 'up', 'trend-value': '12.5', locale: 'zh-CN' })
    const trend = part(el, 'trend')!
    expect(trend.getAttribute('data-trend')).toBe('up')
    expect(trend.querySelector('svg')!.innerHTML).toContain('<path')
    expect(trend.textContent).toContain('+12.5%')
    expect(trend.textContent).toContain('上涨')
  })

  it('趋势：down 渲染下跌箭头 + 负号百分比', () => {
    const el = mount({ value: '10', trend: 'down', 'trend-value': '3', locale: 'zh-CN' })
    const trend = part(el, 'trend')!
    expect(trend.getAttribute('data-trend')).toBe('down')
    expect(trend.textContent).toContain('-3%')
    expect(trend.textContent).toContain('下跌')
  })

  it('趋势：非数值 trend-value 原样渲染；非法 trend 值不渲染趋势', () => {
    const el = mount({ value: '10', trend: 'up', 'trend-value': 'new', locale: 'zh-CN' })
    expect(part(el, 'trend')!.textContent).toContain('new')
    el.setAttribute('trend', 'sideways')
    expect(part(el, 'trend')).toBeNull()
  })

  it('空值：无 value / min / max 时宿主为空（不渲染残缺内容）', () => {
    const el = mount({ locale: 'zh-CN' })
    expect(part(el, 'price')).toBeNull()
    expect(el.shadowRoot!.querySelector('.root')!.textContent?.trim()).toBe('')
  })

  it('非法数字回落空态，非法货币代码回落默认币种（不抛错）', () => {
    const bad = mount({ value: 'abc', locale: 'zh-CN' })
    expect(part(bad, 'price')).toBeNull()
    const fallback = mount({ value: '10', currency: 'NOT-A-CURRENCY', locale: 'zh-CN' })
    expect(part(fallback, 'symbol')!.textContent).toBe('¥')
  })

  it('暗色与 RTL：颜色只走 token，布局用逻辑属性（无物理左右方向声明）', () => {
    const el = mount({ value: '10', locale: 'zh-CN' })
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toContain('var(--oas-color-')
    expect(css).not.toMatch(/margin-(left|right)/)
    expect(css).not.toMatch(/padding-(left|right)/)
  })

  it('趋势文字色走「-text」深档 token（纯语义色白底对比度不足，仅适合做底/边框）', () => {
    const el = mount({ value: '10', trend: 'up', 'trend-value': '1' })
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toContain('var(--oas-price-up-color, var(--oas-color-danger-text))')
    expect(css).toContain('var(--oas-price-down-color, var(--oas-color-success-text))')
    // 不再回落纯语义色（a11y 对比度基线曾因此破线）
    expect(css).not.toContain('var(--oas-price-up-color, var(--oas-color-danger))')
    expect(css).not.toContain('var(--oas-price-down-color, var(--oas-color-success))')
  })
})
