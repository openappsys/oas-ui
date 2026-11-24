import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

  it('底部安全区：padding-block-end 走 env(safe-area-inset-bottom) 与 max() 兜底', () => {
    const el = mount({ total: '10' })
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    const barRule = css.match(/\.bar\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(barRule).toContain('padding-block-end: max(')
    expect(barRule).toContain('env(safe-area-inset-bottom')
  })

  it('占位配方：placeholder 属性已撤——占位由宿主 padding 承担，min-height token 落在 .bar 上', () => {
    const el = mount({ total: '10', 'action-text': '结算' })
    // 占位块不再存在于 shadow 结构中（fixed 场景占位 = 宿主自加 padding-bottom）
    expect(part(el, 'placeholder')).toBe(null)
    // placeholder 不再是合法属性（observedAttributes 不含，写入无响应）
    el.setAttribute('placeholder', '')
    expect(el.shadowRoot!.querySelector('.placeholder')).toBe(null)
    // min-height 通道：.bar 规则携带 --oas-submit-bar-height token（宿主可覆写对齐占位高度）
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    const barRule = css.match(/\.bar\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(barRule).toContain('min-height: var(--oas-submit-bar-height')
    expect(barRule).toContain('box-sizing: border-box')
    // .row 不再携带 min-height（高度回归修复：整栏最小高度只在 .bar 上生效一次）
    const rowRule = css.match(/\.row\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(rowRule).not.toContain('min-height')
  })

  it('tip：提示行渲染在主行上方，属性移除即隐藏', () => {
    const el = mount({ total: '86', tip: '运费 8 元，满 99 免运费' })
    const tip = part(el, 'tip')!
    expect(tip.hidden).toBe(false)
    expect(part(el, 'tip-text')!.textContent).toBe('运费 8 元，满 99 免运费')
    expect(part(el, 'tip-icon')!.hidden).toBe(true)
    el.removeAttribute('tip')
    expect(part(el, 'tip')!.hidden).toBe(true)
  })

  it('tip-icon：已注册图标渲染 svg；未注册告警一次且不渲染图标（文案保留）', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ total: '86', tip: '提示', 'tip-icon': 'info' })
      expect(part(el, 'tip-icon')!.hidden).toBe(false)
      expect(part(el, 'tip-icon')!.querySelector('svg')?.tagName.toLowerCase()).toBe('svg')
      const el2 = mount({ total: '86', tip: '提示', 'tip-icon': 'no-such-icon' })
      const icon2 = part(el2, 'tip-icon')!
      expect(icon2.hidden).toBe(true)
      // 同实例重复 update 只告警一次
      el2.setAttribute('total', '87')
      el2.setAttribute('total', '88')
      const iconWarns = warnSpy.mock.calls.filter((args) => String(args[0]).includes('no-such-icon'))
      expect(iconWarns.length).toBe(1)
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('tip 与 action 行共存：主行结构完整（extra/total/action 仍在 bar 内）', () => {
    const el = mount({ total: '86', 'action-text': '结算', tip: '提示' })
    const bar = part(el, 'bar')!
    // 结构断言：tip / extra / total / action 都是 bar 容器的后代（结构破坏时 contains=false → 红）
    expect(bar.contains(part(el, 'tip')), 'tip 应在 bar 内').toBe(true)
    expect(bar.contains(part(el, 'extra')), 'extra 应在 bar 内').toBe(true)
    expect(bar.contains(part(el, 'total')), 'total 应在 bar 内').toBe(true)
    expect(bar.contains(part(el, 'action')), 'action 应在 bar 内').toBe(true)
    expect(part(el, 'tip')!.hidden).toBe(false)
    // 值断言：提示行文案与按钮文本都按属性渲染
    expect(part(el, 'tip-text')!.textContent).toBe('提示')
    expect(part(el, 'action-text')!.textContent).toBe('结算')
  })
})
